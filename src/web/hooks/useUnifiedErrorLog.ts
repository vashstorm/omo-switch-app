import { useState, useCallback, useEffect, useRef } from "react";
import {
  subscribeToErrorLog,
  getErrorLogEntries,
} from "../error-log/bus";
import type { ErrorLogEntry } from "../error-log/types";
import type { BackendErrorLogEntry } from "../api/types";
import * as apiClient from "../api/client";

const POLL_INTERVAL_MS = 10_000;
const MAX_ENTRIES = 20;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const BACKEND_LOG_LINE_PATTERN = /^(\S+)\s+([A-Z]+)\s+\[([^\]]+)\]\s(.*)$/;

type BackendLogEntry = string | BackendErrorLogEntry;

function timestampFromIso(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function isRecentEntry(entry: ErrorLogEntry, now: number): boolean {
  return entry.timestamp >= now - RECENT_WINDOW_MS;
}

function parseBackendLogLine(entry: string, fallbackTimestamp: number) {
  const match = BACKEND_LOG_LINE_PATTERN.exec(entry);

  if (!match) {
    return {
      message: entry,
      detail: null,
      timestamp: fallbackTimestamp,
      module: "backend",
    };
  }

  const [, timestamp, , module, message] = match;
  return {
    message,
    detail: null,
    timestamp: timestampFromIso(timestamp, fallbackTimestamp),
    module,
  };
}

function mapBackendEntryToFrontend(
  entry: BackendLogEntry,
  index: number,
  now: number,
): ErrorLogEntry {
  const normalized = typeof entry === "string"
    ? parseBackendLogLine(entry, now)
    : {
        message: entry.message ?? "",
        detail: entry.detail ?? null,
        timestamp: timestampFromIso(entry.timestamp, now),
        module: entry.module ?? "backend",
      };

  return {
    id: `backend-${index}-${normalized.timestamp}-${normalized.message}`,
    source: "backend-log",
    message: normalized.message,
    detail: normalized.detail,
    timestamp: normalized.timestamp,
    module: normalized.module,
    occurrences: 1,
  };
}

function mergeAndCapEntries(
  frontendEntries: ErrorLogEntry[],
  backendEntries: ErrorLogEntry[],
  now: number = Date.now(),
): ErrorLogEntry[] {
  const merged = [...frontendEntries, ...backendEntries].filter((entry) =>
    isRecentEntry(entry, now),
  );
  merged.sort((a, b) => b.timestamp - a.timestamp);
  return merged.slice(0, MAX_ENTRIES);
}

export interface UseUnifiedErrorLogResult {
  entries: ErrorLogEntry[];
  loading: boolean;
  readError: string | null;
  refresh: () => Promise<void>;
  hasUnread: boolean;
  markSeen: () => void;
}

export function useUnifiedErrorLog(): UseUnifiedErrorLogResult {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  const lastSeenTimestampRef = useRef<number>(0);
  const backendEntriesRef = useRef<ErrorLogEntry[]>([]);

  const fetchBackendLogs = useCallback(async () => {
    try {
      setReadError(null);
      const data = await apiClient.getErrorLogs();

      if (data.readError) {
        setReadError(data.readError);
      }

      const now = Date.now();
      const mappedBackend = (data.entries as BackendLogEntry[]).map((entry, index) =>
        mapBackendEntryToFrontend(entry, index, now),
      );
      backendEntriesRef.current = mappedBackend;
      const frontendEntries = getErrorLogEntries();
      const merged = mergeAndCapEntries(frontendEntries, mappedBackend, now);
      setEntries(merged);

      if (merged.length === 0) {
        setHasUnread(false);
      } else if (merged[0].timestamp > lastSeenTimestampRef.current) {
        setHasUnread(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error fetching backend logs";
      setReadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBackendLogs();
  }, [fetchBackendLogs]);

  const markSeen = useCallback(() => {
    if (entries.length > 0) {
      lastSeenTimestampRef.current = entries[0].timestamp;
    }
    setHasUnread(false);
  }, [entries]);

  useEffect(() => {
    const unsubscribe = subscribeToErrorLog((frontendEntries) => {
      const merged = mergeAndCapEntries(frontendEntries, backendEntriesRef.current);
      setEntries(merged);

      if (merged.length === 0) {
        setHasUnread(false);
      } else if (merged[0].timestamp > lastSeenTimestampRef.current) {
        setHasUnread(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchBackendLogs();

    const intervalId = setInterval(() => {
      fetchBackendLogs();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchBackendLogs]);

  return {
    entries,
    loading,
    readError,
    refresh,
    hasUnread,
    markSeen,
  };
}
