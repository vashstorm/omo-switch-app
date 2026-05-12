export type ErrorLogSource =
  | "frontend-request"
  | "frontend-runtime"
  | "frontend-startup"
  | "backend-log";

export interface ErrorLogEntry {
  id: string;
  source: ErrorLogSource;
  message: string;
  detail: string | null;
  timestamp: number;
  module: string | null;
  occurrences: number;
}
