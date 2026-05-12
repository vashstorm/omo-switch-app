export const DEFAULT_APP_ZOOM_PERCENT = 100;
export const MIN_APP_ZOOM_PERCENT = 50;
export const MAX_APP_ZOOM_PERCENT = 200;
export const APP_ZOOM_STEP_PERCENT = 5;

export function normalizeAppZoomPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_APP_ZOOM_PERCENT;
  }

  const stepped = Math.round(value / APP_ZOOM_STEP_PERCENT) * APP_ZOOM_STEP_PERCENT;
  return Math.min(MAX_APP_ZOOM_PERCENT, Math.max(MIN_APP_ZOOM_PERCENT, stepped));
}
