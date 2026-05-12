import type { ErrorLogSource } from "./types";

type AddErrorLogEntry = (
  source: ErrorLogSource,
  message: string,
  detail?: string | null,
  module?: string | null,
) => unknown;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function getErrorDetail(error: unknown): string | null {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error == null) {
    return null;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function setupWindowErrorListeners(addErrorLogEntry: AddErrorLogEntry): () => void {
  const handleWindowError = (event: ErrorEvent) => {
    addErrorLogEntry(
      "frontend-runtime",
      getErrorMessage(event.error, event.message || "Unhandled window error"),
      getErrorDetail(event.error),
      event.filename || null,
    );
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    addErrorLogEntry(
      "frontend-runtime",
      getErrorMessage(event.reason, "Unhandled promise rejection"),
      getErrorDetail(event.reason),
      null,
    );
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
