export const PROVIDER_NAME_REGEX = /^[a-z0-9-]+$/;

export function validateProviderName(name: string): void {
  if (!name || !PROVIDER_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid provider name "${name}". Must match pattern: ^[a-z0-9-]+$`,
    );
  }
}

export function validateModelName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Model name must not be empty");
  }
  if (name.includes("/")) {
    throw new Error(
      `Invalid model name "${name}". Must not contain "/"`,
    );
  }
}

export function validateMaxTokens(tokens: unknown): void {
  if (typeof tokens !== "number" || !Number.isInteger(tokens) || tokens < 0) {
    throw new Error(
      `Invalid maxTokens value. Must be an integer >= 0, got: ${tokens}`,
    );
  }
}
