import type { Hono } from "hono";
import { z } from "zod";

import {
  scanProfiles,
  writeProfileConfig,
} from "../../shared";
import { copyProfile } from "../../shared/profiles/copier";
import { readProfileConfig, readProfileConfigWithSources } from "../../shared/config";
import {
  readGlobalConfig,
  extractGlobalModels,
  extractGlobalModelSources,
  resolveGlobalConfigPath,
  getDisabledProviders,
} from "../../shared/config/global-config";
import { writeDisabledProviders } from "../../shared/config-writer";
import { TemperatureSchema, VariantSchema } from "../../shared/schemas";
import type { EditableConfig } from "../../shared/config/types";
import type { ResolvedProfile } from "../../shared/profiles/types";
import { loggers } from "../../shared/logger";

const CopyPayloadSchema = z
  .object({
    targetId: z.string().min(1),
  })
  .strict();

const UltraworkPatchSchema = z
  .object({
    model: z.string().optional(),
    variant: VariantSchema.optional(),
    temperature: TemperatureSchema.optional(),
    prompt_append: z.string().optional(),
  })
  .strict();

const AgentPatchSchema = z
  .object({
    model: z.string().optional(),
    variant: VariantSchema.optional(),
    temperature: TemperatureSchema.optional(),
    prompt_append: z.string().optional(),
    fallback_models: z.array(z.string()).optional(),
    ultrawork: z.union([UltraworkPatchSchema, z.null()]).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .strict();

const CategoryPatchSchema = z
  .object({
    model: z.string().optional(),
    variant: VariantSchema.optional(),
    temperature: TemperatureSchema.optional(),
    description: z.string().optional(),
    prompt_append: z.string().optional(),
    fallback_models: z.array(z.string()).optional(),
  })
  .strict();

const MiscPatchSchema = z
  .object({
    tmux: z
      .union([
        z
          .object({
            enabled: z.boolean().optional(),
          })
          .strict(),
        z.null(),
      ])
      .optional(),
    git_master: z
      .union([
        z
          .object({
            enabled: z.boolean().optional(),
            commit_footer: z.boolean().optional(),
            include_co_authored_by: z.boolean().optional(),
            git_env_prefix: z.string().optional(),
          })
          .strict(),
        z.null(),
      ])
      .optional(),
  })
  .strict();

const EditableConfigSchema = z
  .object({
    agents: z.record(z.string(), z.union([AgentPatchSchema, z.null()])),
    categories: z.record(z.string(), z.union([CategoryPatchSchema, z.null()])),
    misc: MiscPatchSchema,
  })
  .strict();

const SavePayloadSchema = z
  .object({
    payload: EditableConfigSchema,
    expectedMtime: z.number(),
  })
  .strict();

const DisabledProvidersPayloadSchema = z
  .object({
    disabledProviders: z.array(z.string()),
  })
  .strict();

function pickIssue(issue: z.ZodIssue): z.ZodIssue {
  if (
    issue.code === "invalid_union" &&
    issue.unionErrors.length > 0 &&
    issue.unionErrors[0].issues.length > 0
  ) {
    return pickIssue(issue.unionErrors[0].issues[0]);
  }

  return issue;
}

interface RegisterProfileRoutesOptions {
  profilesRoot: string;
  configPath?: string;
}

function jsonError(code: string, message: string) {
  return { error: code, message };
}

async function getResolvedProfiles(
  profilesRoot: string,
): Promise<ResolvedProfile[] | { message: string }> {
  try {
    return await scanProfiles(profilesRoot);
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Failed to scan profiles" };
  }
}

function findProfile(profiles: ResolvedProfile[], id: string): ResolvedProfile | null {
  return profiles.find((profile) => profile.id === id) ?? null;
}

export function registerProfileRoutes(
  app: Hono,
  options: RegisterProfileRoutesOptions,
): void {
  app.get("/api/profiles", async (c) => {
    const resolved = await getResolvedProfiles(options.profilesRoot);

    if (!Array.isArray(resolved)) {
      loggers.serverRoutesProfiles.error(
        { operation: "profiles.scan_failed", profilesRoot: options.profilesRoot, error: resolved.message },
        "Failed to scan profiles"
      );
      return c.json(jsonError("SCAN_ERROR", resolved.message), 500);
    }

    loggers.serverRoutesProfiles.debug(
      { operation: "profiles.list", profileCount: resolved.length },
      "Profiles listed successfully"
    );

    return c.json({
      profiles: resolved.map((profile) => ({
        id: profile.id,
        label: profile.label,
      })),
    });
  });

  app.get("/api/profiles/:id", async (c) => {
    const resolved = await getResolvedProfiles(options.profilesRoot);

    if (!Array.isArray(resolved)) {
      loggers.serverRoutesProfiles.error(
        { operation: "profiles.scan_failed", profilesRoot: options.profilesRoot, error: resolved.message },
        "Failed to scan profiles"
      );
      return c.json(jsonError("SCAN_ERROR", resolved.message), 500);
    }

    const profileId = c.req.param("id");
    const profile = findProfile(resolved, profileId);
    if (!profile) {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.detail_not_found", profileId, status: 404 },
        "Profile not found"
      );
      return c.json(
        jsonError("NOT_FOUND", `Profile '${profileId}' does not exist.`),
        404,
      );
    }

    // Read global config and extract global model sources
    const globalConfig = await readGlobalConfig(options.configPath);
    const globalSources = extractGlobalModelSources(
      globalConfig,
      resolveGlobalConfigPath(options.configPath),
    );

    // Get disabled providers for this profile
    const disabledProviders = getDisabledProviders(globalConfig, profileId);

    // Read profile config with model sources and disabled providers
    const result = await readProfileConfigWithSources(profile, globalSources, disabledProviders);

    // Log each model source entry
    for (const source of result.modelSources) {
      loggers.serverRoutesProfiles.info(
        {
          operation: "profiles.model_source_loaded",
          profileId: source.profileId || "global",
          model: source.model,
          sourceType: source.sourceType,
          sourceLabel: source.sourceLabel,
          configPath: source.configPath,
        },
        "Profile model source loaded"
      );
    }

    // Log summary
    const uniqueModels = new Set(result.modelSources.map((s) => s.model));
    loggers.serverRoutesProfiles.info(
      {
        operation: "profiles.model_source_summary",
        profileId,
        uniqueModelCount: uniqueModels.size,
        sourceEntryCount: result.modelSources.length,
      },
      "Profile model sources initialized"
    );

    return c.json(result);
  });

  app.put("/api/profiles/:id", async (c) => {
    const resolved = await getResolvedProfiles(options.profilesRoot);

    if (!Array.isArray(resolved)) {
      loggers.serverRoutesProfiles.error(
        { operation: "profiles.scan_failed", profilesRoot: options.profilesRoot, error: resolved.message },
        "Failed to scan profiles"
      );
      return c.json(jsonError("SCAN_ERROR", resolved.message), 500);
    }

    const profileId = c.req.param("id");
    const profile = findProfile(resolved, profileId);
    if (!profile) {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.detail_not_found", profileId, status: 404 },
        "Profile not found"
      );
      return c.json(
        jsonError("NOT_FOUND", `Profile '${profileId}' does not exist.`),
        404,
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.request_invalid_json", method: "PUT", path: "/api/profiles/:id", profileId },
        "Invalid JSON in request body"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", "Request body must be valid JSON."),
        400,
      );
    }

    const parsed = SavePayloadSchema.safeParse(requestBody);
    if (!parsed.success) {
      const issue = pickIssue(parsed.error.issues[0]);
      const location = issue?.path.join(".") || "request";
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.request_invalid_payload", profileId, location, issue: issue?.message },
        "Invalid payload in request"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", `${location}: ${issue?.message || "Invalid payload."}`),
        400,
      );
    }

    const writeResult = await writeProfileConfig(
      profile,
      parsed.data.payload as EditableConfig,
      parsed.data.expectedMtime,
    );

    if (writeResult.success) {
      loggers.serverRoutesProfiles.info(
        { operation: "profiles.save", profileId, mtime: writeResult.mtime },
        "Profile saved successfully"
      );
      return c.json(writeResult);
    }

    if (writeResult.conflict) {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.save_conflict", profileId, expectedMtime: parsed.data.expectedMtime },
        "Save conflict detected"
      );
      return c.json(jsonError("CONFLICT", writeResult.message), 409);
    }

    return c.json(jsonError("VALIDATION_ERROR", writeResult.message), 400);
  });

  app.put("/api/profiles/:id/disabled-providers", async (c) => {
    const resolved = await getResolvedProfiles(options.profilesRoot);

    if (!Array.isArray(resolved)) {
      loggers.serverRoutesProfiles.error(
        { operation: "profiles.scan_failed", profilesRoot: options.profilesRoot, error: resolved.message },
        "Failed to scan profiles"
      );
      return c.json(jsonError("SCAN_ERROR", resolved.message), 500);
    }

    const profileId = c.req.param("id");
    const profile = findProfile(resolved, profileId);
    if (!profile) {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.disabled_providers_not_found", profileId, status: 404 },
        "Profile not found for disabled providers update"
      );
      return c.json(
        jsonError("NOT_FOUND", `Profile '${profileId}' does not exist.`),
        404,
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.request_invalid_json", method: "PUT", path: "/api/profiles/:id/disabled-providers", profileId },
        "Invalid JSON in request body"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", "Request body must be valid JSON."),
        400,
      );
    }

    const parsed = DisabledProvidersPayloadSchema.safeParse(requestBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const location = issue?.path.join(".") || "request";
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.disabled_providers_invalid_payload", profileId, location, issue: issue?.message },
        "Invalid disabled providers payload"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", `${location}: ${issue?.message || "Invalid payload."}`),
        400,
      );
    }

    try {
      await writeDisabledProviders(options.configPath, profileId, parsed.data.disabledProviders);
      loggers.serverRoutesProfiles.info(
        { operation: "profiles.disabled_providers_updated", profileId, disabledCount: parsed.data.disabledProviders.length },
        "Disabled providers updated successfully"
      );
    } catch (error) {
      loggers.serverRoutesProfiles.error(
        { operation: "profiles.disabled_providers_write_failed", profileId, error: error instanceof Error ? error.message : String(error) },
        "Failed to write disabled providers"
      );
      return c.json(
        jsonError("WRITE_ERROR", "Failed to write disabled providers configuration."),
        500,
      );
    }

    const globalConfig = await readGlobalConfig(options.configPath);
    const globalSources = extractGlobalModelSources(
      globalConfig,
      resolveGlobalConfigPath(options.configPath),
    );
    const disabledProviders = getDisabledProviders(globalConfig, profileId);
    const updatedProfile = await readProfileConfigWithSources(profile, globalSources, disabledProviders);

    return c.json(updatedProfile);
  });

  app.post("/api/profiles/:id/copy", async (c) => {
    const sourceId = c.req.param("id");

    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.request_invalid_json", method: "POST", path: "/api/profiles/:id/copy", profileId: sourceId },
        "Invalid JSON in request body"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", "Request body must be valid JSON."),
        400,
      );
    }

    const parsed = CopyPayloadSchema.safeParse(requestBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const location = issue?.path.join(".") || "request";
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.request_invalid_payload", profileId: sourceId, location, issue: issue?.message },
        "Invalid payload in request"
      );
      return c.json(
        jsonError("VALIDATION_ERROR", `${location}: ${issue?.message || "Invalid payload."}`),
        400,
      );
    }

    const outcome = await copyProfile(options.profilesRoot, sourceId, parsed.data.targetId);

    if (outcome.success) {
      loggers.serverRoutesProfiles.info(
        { operation: "profiles.copy", sourceId, targetId: parsed.data.targetId },
        "Profile copied successfully"
      );
      return c.json({ profile: { id: outcome.profile.id, label: outcome.profile.label } });
    }

    if (outcome.code === "TARGET_EXISTS") {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.copy_failed", sourceId, targetId: parsed.data.targetId, code: outcome.code },
        "Copy failed: target exists"
      );
      return c.json(jsonError("CONFLICT", outcome.message), 409);
    }

    if (outcome.code === "INVALID_TARGET_ID") {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.copy_failed", sourceId, targetId: parsed.data.targetId, code: outcome.code },
        "Copy failed: invalid target ID"
      );
      return c.json(jsonError("VALIDATION_ERROR", outcome.message), 400);
    }

    if (outcome.code === "SOURCE_NOT_FOUND") {
      loggers.serverRoutesProfiles.warn(
        { operation: "profiles.copy_failed", sourceId, targetId: parsed.data.targetId, code: outcome.code },
        "Copy failed: source not found"
      );
      return c.json(jsonError("NOT_FOUND", outcome.message), 404);
    }

    loggers.serverRoutesProfiles.error(
      { operation: "profiles.copy_failed", sourceId, targetId: parsed.data.targetId, code: outcome.code, error: outcome.message },
      "Copy failed: unexpected error"
    );
    return c.json(jsonError("COPY_ERROR", outcome.message), 500);
  });
}
