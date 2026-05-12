import { deduplicateAndCap } from "./dedup";
import type { ErrorLogEntry, ErrorLogSource } from "./types";

type ErrorLogListener = (entries: ErrorLogEntry[]) => void;

let entries: ErrorLogEntry[] = [];
const listeners = new Set<ErrorLogListener>();

function emitEntries() {
  const snapshot = [...entries];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function createEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `error-log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addErrorLogEntry(
  source: ErrorLogSource,
  message: string,
  detail: string | null = null,
  module: string | null = null,
): ErrorLogEntry {
  const now = Date.now();
  const nextEntry: ErrorLogEntry = {
    id: createEntryId(),
    source,
    message,
    detail,
    timestamp: now,
    module,
    occurrences: 1,
  };

  entries = deduplicateAndCap(entries, nextEntry, now);
  emitEntries();

  return nextEntry;
}

export function getErrorLogEntries(): ErrorLogEntry[] {
  return [...entries];
}

export function clearErrorLogEntries() {
  entries = [];
  emitEntries();
}

export function subscribeToErrorLog(listener: ErrorLogListener): () => void {
  listeners.add(listener);
  listener([...entries]);

  return () => {
    listeners.delete(listener);
  };
}
