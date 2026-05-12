import { renderHook, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, test, vi, type Mock } from "vitest";

vi.mock("../../src/web/error-log/bus", () => ({
  subscribeToErrorLog: vi.fn(),
  getErrorLogEntries: vi.fn(),
}));

vi.mock("../../src/web/api/client", () => ({
  getErrorLogs: vi.fn(),
}));

import { subscribeToErrorLog, getErrorLogEntries } from "../../src/web/error-log/bus";
import { getErrorLogs } from "../../src/web/api/client";
import { useUnifiedErrorLog } from "../../src/web/hooks/useUnifiedErrorLog";
import type { ErrorLogEntry } from "../../src/web/error-log/types";
import type { BackendErrorLogEntry } from "../../src/web/api/types";

const mockSubscribeToErrorLog = vi.mocked(subscribeToErrorLog);
const mockGetErrorLogEntries = vi.mocked(getErrorLogEntries);
const mockGetErrorLogs = vi.mocked(getErrorLogs);
const TEST_RELATIVE_BASE_MS = 10_000;

function createFrontendEntry(
  id: string,
  timestamp: number,
  message: string = "Frontend error",
): ErrorLogEntry {
  const normalizedTimestamp = timestamp < 1_000_000_000_000
    ? Date.now() - (TEST_RELATIVE_BASE_MS - timestamp)
    : timestamp;

  return {
    id,
    source: "frontend-runtime",
    message,
    detail: null,
    timestamp: normalizedTimestamp,
    module: null,
    occurrences: 1,
  };
}

function createBackendLogsResponse(
  entries: Array<string | BackendErrorLogEntry>,
): { entries: Array<string | BackendErrorLogEntry>; sourceFile: string; truncated: boolean; readError?: string } {
  return {
    entries,
    sourceFile: "omo-switch.error.log",
    truncated: entries.length === 20,
    readError: undefined,
  };
}

describe("useUnifiedErrorLog", () => {
  beforeEach(() => {
    mockSubscribeToErrorLog.mockReset();
    mockGetErrorLogEntries.mockReset();
    mockGetErrorLogs.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("merges frontend and backend entries in reverse chronological order", async () => {
    const frontendEntries = [
      createFrontendEntry("fe-1", 2000, "New frontend"),
      createFrontendEntry("fe-2", 1000, "Old frontend"),
    ];

    const backendResponse = createBackendLogsResponse([
      "Backend error 1",
      "Backend error 2",
    ]);

    mockGetErrorLogEntries.mockReturnValue(frontendEntries);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener(frontendEntries);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(backendResponse);

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.entries.length).toBeGreaterThan(0);

    const timestamps = result.current.entries.map(e => e.timestamp);
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }

    expect(result.current.entries.some(e => e.source === "frontend-runtime")).toBe(true);
    expect(result.current.entries.some(e => e.source === "backend-log")).toBe(true);
  });

  test("caps entries to 20", async () => {
    const manyFrontendEntries = Array.from({ length: 25 }, (_, i) =>
      createFrontendEntry(`fe-${i}`, 3000 - i * 10),
    );

    const manyBackendLogs = Array.from({ length: 25 }, (_, i) =>
      `Backend log ${i}`,
    );

    mockGetErrorLogEntries.mockReturnValue(manyFrontendEntries);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener(manyFrontendEntries);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse(manyBackendLogs));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.entries.length).toBeLessThanOrEqual(20);
  });

  test("polling failure sets readError", async () => {
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue({
      entries: [],
      sourceFile: "omo-switch.error.log",
      truncated: false,
      readError: "Permission denied",
    });

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.readError).toBe("Permission denied");
    expect(result.current.entries).toEqual([]);
  });

  test("hasUnread flips to true when new entry arrives", async () => {
    const initialEntries = [createFrontendEntry("fe-1", 1000)];
    let busListener: ((entries: ErrorLogEntry[]) => void) | null = null;

    mockGetErrorLogEntries.mockReturnValue(initialEntries);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      busListener = listener;
      listener(initialEntries);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse([]));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasUnread).toBe(true);

    act(() => {
      result.current.markSeen();
    });
    expect(result.current.hasUnread).toBe(false);

    const newEntries = [createFrontendEntry("fe-2", 2000), createFrontendEntry("fe-1", 1000)];
    mockGetErrorLogEntries.mockReturnValue(newEntries);

    act(() => {
      if (busListener) {
        busListener(newEntries);
      }
    });

    expect(result.current.hasUnread).toBe(true);
  });

  test("markSeen() clears hasUnread", async () => {
    const initialEntries = [createFrontendEntry("fe-1", 1000)];
    let busListener: ((entries: ErrorLogEntry[]) => void) | null = null;

    mockGetErrorLogEntries.mockReturnValue(initialEntries);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      busListener = listener;
      listener(initialEntries);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse([]));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const newEntries = [createFrontendEntry("fe-2", 2000)];
    mockGetErrorLogEntries.mockReturnValue(newEntries);

    act(() => {
      if (busListener) {
        busListener(newEntries);
      }
    });

    expect(result.current.hasUnread).toBe(true);

    act(() => {
      result.current.markSeen();
    });

    expect(result.current.hasUnread).toBe(false);
  });

  test("cleanup on unmount clears interval and unsubscribes from bus", async () => {
    const unsubscribeMock = vi.fn();
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return unsubscribeMock;
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse([]));

    const { unmount } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  test("refresh() triggers manual fetch", async () => {
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse([]));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockGetErrorLogs).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetErrorLogs).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
  });

  test("maps backend log string to frontend entry", async () => {
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return vi.fn();
    });

    const backendResponse = createBackendLogsResponse([
      "Test backend error message",
    ]);

    mockGetErrorLogs.mockResolvedValue(backendResponse);

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const backendEntry = result.current.entries.find(e => e.source === "backend-log");
    expect(backendEntry).toBeDefined();
    expect(backendEntry!.message).toBe("Test backend error message");
    expect(backendEntry!.module).toBe("backend");
    expect(backendEntry!.detail).toBeNull();
  });

  test("filters entries older than 24 hours", async () => {
    const recentTimestamp = Date.now() - 60 * 60 * 1000;
    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    const frontendEntries = [
      createFrontendEntry("fe-recent", recentTimestamp, "Recent frontend"),
      createFrontendEntry("fe-old", oldTimestamp, "Old frontend"),
    ];

    mockGetErrorLogEntries.mockReturnValue(frontendEntries);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener(frontendEntries);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValue(createBackendLogsResponse([
      {
        timestamp: new Date(recentTimestamp).toISOString(),
        level: "ERROR",
        module: "server.app",
        message: "Recent backend",
        detail: null,
      },
      {
        timestamp: new Date(oldTimestamp).toISOString(),
        level: "ERROR",
        module: "server.app",
        message: "Old backend",
        detail: null,
      },
    ]));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const messages = result.current.entries.map((entry) => entry.message);
    expect(messages).toContain("Recent frontend");
    expect(messages).toContain("Recent backend");
    expect(messages).not.toContain("Old frontend");
    expect(messages).not.toContain("Old backend");
  });

  test("marks hasUnread when backend polling returns new entries", async () => {
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return vi.fn();
    });

    mockGetErrorLogs.mockResolvedValueOnce(createBackendLogsResponse([]));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasUnread).toBe(false);

    act(() => {
      result.current.markSeen();
    });
    expect(result.current.hasUnread).toBe(false);

    mockGetErrorLogs.mockResolvedValueOnce(createBackendLogsResponse([
      "New backend error",
    ]));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.hasUnread).toBe(true);
  });

  test("handles API error gracefully", async () => {
    mockGetErrorLogEntries.mockReturnValue([]);
    mockSubscribeToErrorLog.mockImplementation((listener: (entries: ErrorLogEntry[]) => void) => {
      listener([]);
      return vi.fn();
    });

    mockGetErrorLogs.mockRejectedValue(new Error("API Failed"));

    const { result } = renderHook(() => useUnifiedErrorLog());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.readError).toBe("API Failed");
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toEqual([]);
  });
});
