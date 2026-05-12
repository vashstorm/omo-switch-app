import { z } from "zod";

export const VariantSchema = z.enum(["low", "medium", "high"]);

export const TemperatureSchema = z.number().min(0).max(1);

export const UltraworkConfigSchema = z.object({
  model: z.string().min(1).optional(),
  variant: VariantSchema.optional(),
  prompt_append: z.string().optional(),
});

export const AgentConfigSchema = z.object({
  model: z.string().min(1).optional(),
  variant: VariantSchema.optional(),
  temperature: TemperatureSchema.optional(),
  prompt_append: z.string().optional(),
  fallback_models: z.array(z.string()).optional(),
  ultrawork: UltraworkConfigSchema.optional(),
  maxTokens: z.number().int().positive().optional(),
  category: z.string().optional(),
});

export const CategoryConfigSchema = z.object({
  model: z.string().min(1).optional(),
  variant: VariantSchema.optional(),
  temperature: TemperatureSchema.optional(),
  description: z.string().optional(),
  prompt_append: z.string().optional(),
  fallback_models: z.array(z.string()).optional(),
});

export const TmuxConfigSchema = z.object({
  enabled: z.boolean().optional(),
});

export const GitMasterConfigSchema = z.object({
  enabled: z.boolean().optional(),
  commit_footer: z.boolean().optional(),
  include_co_authored_by: z.boolean().optional(),
  git_env_prefix: z.string().optional(),
});

export const MiscConfigSchema = z.object({
  tmux: TmuxConfigSchema.optional(),
  git_master: GitMasterConfigSchema.optional(),
}).passthrough();

export const ProfileEntrySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

export const ProfileManifestSchema = z.object({
  profiles: z.array(ProfileEntrySchema),
});

export const EditableAgentPayloadSchema = z.object({
  model: z.string().min(1).optional(),
  variant: VariantSchema.optional(),
  temperature: TemperatureSchema.optional(),
  prompt_append: z.string().optional(),
  fallback_models: z.array(z.string()).optional(),
  maxTokens: z.number().int().positive().optional(),
  category: z.string().optional(),
});

export const EditableCategoryPayloadSchema = z.object({
  model: z.string().min(1).optional(),
  variant: VariantSchema.optional(),
  temperature: TemperatureSchema.optional(),
  description: z.string().optional(),
  prompt_append: z.string().optional(),
  fallback_models: z.array(z.string()).optional(),
});

export const EditableMiscPayloadSchema = z.object({
  tmux: TmuxConfigSchema.optional(),
  git_master: GitMasterConfigSchema.optional(),
});

export const EditablePayloadSchema = z.object({
  agents: z.record(z.string(), EditableAgentPayloadSchema),
  categories: z.record(z.string(), EditableCategoryPayloadSchema),
  misc: EditableMiscPayloadSchema,
});

export type Variant = z.infer<typeof VariantSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;
export type TmuxConfig = z.infer<typeof TmuxConfigSchema>;
export type GitMasterConfig = z.infer<typeof GitMasterConfigSchema>;
export type MiscConfig = z.infer<typeof MiscConfigSchema>;
export type EditableAgentPayload = z.infer<typeof EditableAgentPayloadSchema>;
export type EditableCategoryPayload = z.infer<typeof EditableCategoryPayloadSchema>;
export type EditableMiscPayload = z.infer<typeof EditableMiscPayloadSchema>;
export type EditablePayload = z.infer<typeof EditablePayloadSchema>;
