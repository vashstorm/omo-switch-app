import { describe, expect, it, beforeEach } from "vitest";
import { deduplicateAndCap } from "../../src/web/error-log/dedup";
import {
  addErrorLogEntry,
  clearErrorLogEntries,
  getErrorLogEntries,
  subscribeToErrorLog,
} from "../../src/web/error-log/bus";
import type { ErrorLogEntry } from "../../src/web/error-log/types";

function makeEntry(
  id: string,
  ts: number,
  opts: Partial<ErrorLogEntry> = {},
): ErrorLogEntry {
  return {
    id,
    source: "frontend-runtime",
    message: `error-${id}`,
    detail: null,
    timestamp: ts,
    module: null,
    occurrences: 1,
    ...opts,
  };
}

describe("deduplicateAndCap", () => {
  it("prepends a new entry when no match exists", () => {
    const existing = [makeEntry("old", 1000)];
    const newEntry = makeEntry("new", 2000);
    const result = deduplicateAndCap(existing, newEntry, 2000);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "new", occurrences: 1 });
    expect(result[1]).toMatchObject({ id: "old", occurrences: 1 });
  });

  it("increments occurrences when same signature within 2s window", () => {
    const existing = [makeEntry("a", 1000)];
    const duplicate = makeEntry("dup", 1500, { message: existing[0].message });
    const result = deduplicateAndCap(existing, duplicate, 1500);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "a",
      occurrences: 2,
      timestamp: 1500,
    });
  });

  it("ignores duplicates outside 2s window, prepends instead", () => {
    const existing = [makeEntry("a", 1000)];
    const late = makeEntry("b", 4000);
    const result = deduplicateAndCap(existing, late, 4000);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "b", occurrences: 1 });
    expect(result[1]).toMatchObject({ id: "a", occurrences: 1 });
  });

  it("matches on source + message + detail combination", () => {
    const existing = [makeEntry("a", 1000, { detail: "detail-1" })];
    const differentDetail = makeEntry("b", 1500, { detail: "detail-2" });
    const result = deduplicateAndCap(existing, differentDetail, 1500);

    expect(result).toHaveLength(2);
  });

  it("caps at 20 entries newest-first", () => {
    const entries: ErrorLogEntry[] = [];
    for (let i = 0; i < 20; i++) {
      entries.push(makeEntry(`e-${i}`, i * 100));
    }
    const newEntry = makeEntry("newer", 9999);
    const result = deduplicateAndCap(entries, newEntry, 9999);

    expect(result).toHaveLength(20);
    expect(result[0]).toMatchObject({ id: "newer" });
    expect(result[19]).toMatchObject({ id: "e-18" });
    expect(result.find((e) => e.id === "e-19")).toBeUndefined();
  });

  it("maintains reverse chronological order", () => {
    const entries = [
      makeEntry("new", 3000),
      makeEntry("mid", 2000),
      makeEntry("old", 1000),
    ];
    const newEntry = makeEntry("newest", 4000);
    const result = deduplicateAndCap(entries, newEntry, 4000);

    expect(result[0].timestamp).toBeGreaterThanOrEqual(result[1].timestamp);
    expect(result[1].timestamp).toBeGreaterThanOrEqual(result[2].timestamp);
    expect(result[2].timestamp).toBeGreaterThanOrEqual(result[3].timestamp);
  });
});

describe("bus", () => {
  beforeEach(() => {
    clearErrorLogEntries();
  });

  it("addErrorLogEntry adds to snapshot", () => {
    addErrorLogEntry("frontend-request", "fetch failed", "network error");
    const snapshot = getErrorLogEntries();

    expect(snapshot.length).toBeGreaterThanOrEqual(1);
    expect(snapshot[0]).toMatchObject({
      source: "frontend-request",
      message: "fetch failed",
      detail: "network error",
      occurrences: 1,
    });
  });

  it("subscribeToErrorLog returns unsubscribe function", () => {
    const calls: number[] = [];
    const unsubscribe = subscribeToErrorLog((snapshot) => {
      calls.push(snapshot.length);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(getErrorLogEntries().length);

    unsubscribe();
    addErrorLogEntry("frontend-runtime", "after unsub");
    expect(calls).toHaveLength(1);
  });

  it("deduplicates rapid same-source+message via bus", () => {
    addErrorLogEntry("frontend-runtime", "duplicate err");
    addErrorLogEntry("frontend-runtime", "duplicate err");
    const snapshot = getErrorLogEntries();

    expect(snapshot[0]).toMatchObject({
      source: "frontend-runtime",
      message: "duplicate err",
      occurrences: 2,
    });
  });
});
