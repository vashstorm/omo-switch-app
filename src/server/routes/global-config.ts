import type { Hono } from "hono";
import { z } from "zod";
import {
  APP_ZOOM_STEP_PERCENT,
  MAX_APP_ZOOM_PERCENT,
  MIN_APP_ZOOM_PERCENT,
  getAppZoomPercent,
  getDefaultProfile,
  getSyncReplaceEnabled,
  readGlobalConfig,
} from "../../shared/config/global-config";
import {
  writeAppZoomPercent,
  writeDefaultProfile,
  writeSyncReplaceEnabled,
  writeProvider,
  deleteProvider,
  writeModel,
  deleteModel,
  updateModelConfig,
} from "../../shared/config-writer/global-config-writer";
import { scanProfiles } from "../../shared/profiles/scanner";
import { loggers } from "../../shared/logger";

const GlobalConfigPatchSchema = z
  .object({
    syncReplaceEnabled: z.boolean().optional(),
    appZoomPercent: z
      .number()
      .int()
      .min(MIN_APP_ZOOM_PERCENT)
      .max(MAX_APP_ZOOM_PERCENT)
      .refine((value) => value % APP_ZOOM_STEP_PERCENT === 0, {
        message: `appZoomPercent must use ${APP_ZOOM_STEP_PERCENT}% increments`,
      })
      .optional(),
    defaultProfile: z.string().nullable().optional(),
  })
  .strict()
  .refine((data) => (
    data.syncReplaceEnabled !== undefined ||
    data.appZoomPercent !== undefined ||
    data.defaultProfile !== undefined
  ), {
    message: "At least one field must be provided",
  });

interface RegisterGlobalConfigRouteOptions {
  configPath?: string;
  profilesRoot?: string;
}

function jsonError(code: string, message: string) {
  return { error: code, message };
}

const CreateProviderSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, "Provider name must match ^[a-z0-9-]+$"),
});

const UpdateProviderSchema = z.object({
  models: z.record(z.string(), z.any()),
});

const CreateModelSchema = z.object({
  name: z.string().min(1, "Model name must not be empty").refine((v) => !v.includes("/"), "Model name must not contain '/'"),
  maxTokens: z.number().int().min(0).optional(),
  type: z.string().optional(),
}).catchall(z.any());

const UpdateModelConfigSchema = z.object({
  maxTokens: z.number().int().min(0).optional(),
}).catchall(z.any());

export function registerGlobalConfigRoute(
  app: Hono,
  options: RegisterGlobalConfigRouteOptions = {},
): void {
  app.get("/api/config/global", async (c) => {
    try {
      const config = await readGlobalConfig(options.configPath);
      return c.json({
        syncReplaceEnabled: getSyncReplaceEnabled(config),
        appZoomPercent: getAppZoomPercent(config),
        defaultProfile: getDefaultProfile(config),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read global config";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "global_config.read_failed", error: message },
        "Failed to read global config"
      );
      return c.json(jsonError("READ_ERROR", message), 500);
    }
  });

  app.put("/api/config/global", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "global_config.invalid_json" },
        "Invalid JSON in request body"
      );
      return c.json(jsonError("INVALID_JSON", "Request body must be valid JSON"), 400);
    }

    const parsed = GlobalConfigPatchSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "global_config.validation_error", issue: issue?.message },
        "Validation error in request body"
      );
      return c.json(jsonError("VALIDATION_ERROR", issue?.message ?? "Invalid payload"), 400);
    }

    const result: { syncReplaceEnabled?: boolean; appZoomPercent?: number; defaultProfile?: string | null } = {};

    if (parsed.data.syncReplaceEnabled !== undefined) {
      try {
        await writeSyncReplaceEnabled(options.configPath, parsed.data.syncReplaceEnabled);
        result.syncReplaceEnabled = parsed.data.syncReplaceEnabled;
        loggers.serverRoutesGlobalConfig.info(
          { operation: "global_config.updated", syncReplaceEnabled: parsed.data.syncReplaceEnabled },
          "Global config sync_replace_enabled updated successfully"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write sync_replace_enabled";
        loggers.serverRoutesGlobalConfig.error(
          { operation: "global_config.write_failed", error: message },
          "Failed to write sync_replace_enabled"
        );
        return c.json(jsonError("WRITE_ERROR", message), 500);
      }
    }

    if (parsed.data.appZoomPercent !== undefined) {
      try {
        await writeAppZoomPercent(options.configPath, parsed.data.appZoomPercent);
        result.appZoomPercent = parsed.data.appZoomPercent;
        loggers.serverRoutesGlobalConfig.info(
          { operation: "global_config.updated", appZoomPercent: parsed.data.appZoomPercent },
          "Global config zoom_percent updated successfully"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write zoom_percent";
        loggers.serverRoutesGlobalConfig.error(
          { operation: "global_config.write_failed", error: message },
          "Failed to write zoom_percent"
        );
        return c.json(jsonError("WRITE_ERROR", message), 500);
      }
    }

    if (parsed.data.defaultProfile !== undefined) {
      if (parsed.data.defaultProfile !== null && options.profilesRoot) {
        try {
          const profiles = await scanProfiles(options.profilesRoot);
          const profileExists = profiles.some((p) => p.id === parsed.data.defaultProfile);
          if (!profileExists) {
            loggers.serverRoutesGlobalConfig.warn(
              { operation: "global_config.invalid_profile", profileId: parsed.data.defaultProfile },
              "Attempted to set default_profile to non-existent profile"
            );
            return c.json(
              jsonError("PROFILE_NOT_FOUND", `Profile "${parsed.data.defaultProfile}" does not exist`),
              404
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to scan profiles";
          loggers.serverRoutesGlobalConfig.error(
            { operation: "global_config.scan_profiles_failed", error: message },
            "Failed to scan profiles for validation"
          );
          return c.json(jsonError("SCAN_ERROR", message), 500);
        }
      }

      try {
        await writeDefaultProfile(options.configPath, parsed.data.defaultProfile);
        result.defaultProfile = parsed.data.defaultProfile;
        loggers.serverRoutesGlobalConfig.info(
          { operation: "global_config.updated", defaultProfile: parsed.data.defaultProfile },
          "Global config default_profile updated successfully"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write default_profile";
        loggers.serverRoutesGlobalConfig.error(
          { operation: "global_config.write_failed", error: message },
          "Failed to write default_profile"
        );
        return c.json(jsonError("WRITE_ERROR", message), 500);
      }
    }

    return c.json(result);
  });

  // GET /api/config/providers
  app.get("/api/config/providers", async (c) => {
    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = config.providers ?? {};
      return c.json({ providers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read providers";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "providers.read_failed", error: message },
        "Failed to read providers"
      );
      return c.json(jsonError("READ_ERROR", message), 500);
    }
  });

  // POST /api/config/providers
  app.post("/api/config/providers", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "provider.invalid_json" },
        "Invalid JSON in request body"
      );
      return c.json(jsonError("INVALID_JSON", "Request body must be valid JSON"), 400);
    }

    const parsed = CreateProviderSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "provider.validation_error", issue: issue?.message },
        "Validation error for provider creation"
      );
      return c.json(jsonError("VALIDATION_ERROR", issue?.message ?? "Invalid payload"), 400);
    }

    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = config.providers ?? {};
      if (providers[parsed.data.name] !== undefined) {
        return c.json(jsonError("DUPLICATE", `Provider "${parsed.data.name}" already exists`), 409);
      }

      await writeProvider(options.configPath, parsed.data.name, {});
      loggers.serverRoutesGlobalConfig.info(
        { operation: "provider.created", name: parsed.data.name },
        `Provider "${parsed.data.name}" created successfully`
      );
      return c.json({ name: parsed.data.name, models: {} }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create provider";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "provider.write_failed", error: message },
        "Failed to create provider"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });

  // PUT /api/config/providers/:provider
  app.put("/api/config/providers/:provider", async (c) => {
    const providerName = c.req.param("provider");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "provider.invalid_json" },
        "Invalid JSON in request body"
      );
      return c.json(jsonError("INVALID_JSON", "Request body must be valid JSON"), 400);
    }

    const parsed = UpdateProviderSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "provider.validation_error", issue: issue?.message },
        "Validation error for provider update"
      );
      return c.json(jsonError("VALIDATION_ERROR", issue?.message ?? "Invalid payload"), 400);
    }

    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = config.providers ?? {};
      if (providers[providerName] === undefined) {
        return c.json(jsonError("NOT_FOUND", `Provider "${providerName}" not found`), 404);
      }

      await writeProvider(options.configPath, providerName, parsed.data.models);
      loggers.serverRoutesGlobalConfig.info(
        { operation: "provider.updated", name: providerName },
        `Provider "${providerName}" models updated successfully`
      );
      return c.json({ name: providerName, models: parsed.data.models });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update provider";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "provider.write_failed", error: message },
        "Failed to update provider"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });

  // DELETE /api/config/providers/:provider
  app.delete("/api/config/providers/:provider", async (c) => {
    const providerName = c.req.param("provider");

    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = config.providers ?? {};
      if (providers[providerName] === undefined) {
        return c.json(jsonError("NOT_FOUND", `Provider "${providerName}" not found`), 404);
      }

      await deleteProvider(options.configPath, providerName);
      loggers.serverRoutesGlobalConfig.info(
        { operation: "provider.deleted", name: providerName },
        `Provider "${providerName}" deleted successfully`
      );
      return c.json({ deleted: providerName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete provider";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "provider.delete_failed", error: message },
        "Failed to delete provider"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });

  // POST /api/config/providers/:provider/models
  app.post("/api/config/providers/:provider/models", async (c) => {
    const providerName = c.req.param("provider");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "model.invalid_json" },
        "Invalid JSON in request body"
      );
      return c.json(jsonError("INVALID_JSON", "Request body must be valid JSON"), 400);
    }

    const parsed = CreateModelSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "model.validation_error", issue: issue?.message },
        "Validation error for model creation"
      );
      return c.json(jsonError("VALIDATION_ERROR", issue?.message ?? "Invalid payload"), 400);
    }

    try {
      const { name, maxTokens, ...rest } = parsed.data;
      const config: Record<string, unknown> = { ...rest };
      if (maxTokens !== undefined) {
        config.maxTokens = maxTokens;
      }

      await writeModel(options.configPath, providerName, name, config, { overwrite: false });
      loggers.serverRoutesGlobalConfig.info(
        { operation: "model.created", provider: providerName, name },
        `Model "${name}" created under provider "${providerName}"`
      );
      return c.json({ name, ...config }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create model";
      if (message.includes("already exists")) {
        return c.json(jsonError("DUPLICATE", message), 409);
      }
      loggers.serverRoutesGlobalConfig.error(
        { operation: "model.write_failed", error: message },
        "Failed to create model"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });

  // PUT /api/config/providers/:provider/models/:model
  app.put("/api/config/providers/:provider/models/:model", async (c) => {
    const providerName = c.req.param("provider");
    const modelName = c.req.param("model");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "model.invalid_json" },
        "Invalid JSON in request body"
      );
      return c.json(jsonError("INVALID_JSON", "Request body must be valid JSON"), 400);
    }

    const parsed = UpdateModelConfigSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      loggers.serverRoutesGlobalConfig.warn(
        { operation: "model.validation_error", issue: issue?.message },
        "Validation error for model update"
      );
      return c.json(jsonError("VALIDATION_ERROR", issue?.message ?? "Invalid payload"), 400);
    }

    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = (config.providers as Record<string, Record<string, unknown>> | undefined) ?? {};
      const provider = providers[providerName];
      if (provider === undefined) {
        return c.json(jsonError("NOT_FOUND", `Provider "${providerName}" not found`), 404);
      }
      if (provider[modelName] === undefined) {
        return c.json(jsonError("NOT_FOUND", `Model "${modelName}" not found under provider "${providerName}"`), 404);
      }

      await updateModelConfig(options.configPath, providerName, modelName, parsed.data);
      loggers.serverRoutesGlobalConfig.info(
        { operation: "model.updated", provider: providerName, name: modelName },
        `Model "${modelName}" under provider "${providerName}" updated successfully`
      );

      const updatedConfig = await readGlobalConfig(options.configPath);
      const updatedProviders = (updatedConfig.providers as Record<string, Record<string, unknown>> | undefined) ?? {};
      const updatedProvider = updatedProviders[providerName];
      return c.json({ name: modelName, ...(updatedProvider?.[modelName] as Record<string, unknown> ?? {}) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update model";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "model.write_failed", error: message },
        "Failed to update model"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });

  // DELETE /api/config/providers/:provider/models/:model
  app.delete("/api/config/providers/:provider/models/:model", async (c) => {
    const providerName = c.req.param("provider");
    const modelName = c.req.param("model");

    try {
      const config = await readGlobalConfig(options.configPath);
      const providers = config.providers ?? {};
      const provider = providers[providerName] as Record<string, unknown> | undefined;
      if (provider === undefined) {
        return c.json(jsonError("NOT_FOUND", `Provider "${providerName}" not found`), 404);
      }
      if (provider[modelName] === undefined) {
        return c.json(jsonError("NOT_FOUND", `Model "${modelName}" not found under provider "${providerName}"`), 404);
      }

      await deleteModel(options.configPath, providerName, modelName);
      loggers.serverRoutesGlobalConfig.info(
        { operation: "model.deleted", provider: providerName, name: modelName },
        `Model "${modelName}" deleted from provider "${providerName}"`
      );
      return c.json({ deleted: modelName, provider: providerName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete model";
      loggers.serverRoutesGlobalConfig.error(
        { operation: "model.delete_failed", error: message },
        "Failed to delete model"
      );
      return c.json(jsonError("WRITE_ERROR", message), 500);
    }
  });
}
