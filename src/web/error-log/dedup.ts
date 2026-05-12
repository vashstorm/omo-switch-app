import type { ErrorLogEntry } from "./types";

const DEDUP_WINDOW_MS = 2_000;
const MAX_ENTRIES = 20;

function sameSignature(a: ErrorLogEntry, b: ErrorLogEntry): boolean {
  return (
    a.source === b.source &&
    a.message === b.message &&
    a.detail === b.detail
  );
}

export function deduplicateAndCap(
  entries: ErrorLogEntry[],
  newEntry: ErrorLogEntry,
  nowMs: number,
): ErrorLogEntry[] {
  const existingIndex = entries.findIndex((entry) => {
    if (!sameSignature(entry, newEntry)) return false;
    return nowMs - entry.timestamp <= DEDUP_WINDOW_MS;
  });

  const next: ErrorLogEntry[] = existingIndex >= 0
    ? entries.map((entry, i) =>
        i === existingIndex
          ? { ...entry, occurrences: entry.occurrences + 1, timestamp: nowMs }
          : entry,
      )
    : [newEntry, ...entries];

  return next.slice(0, MAX_ENTRIES);
}
