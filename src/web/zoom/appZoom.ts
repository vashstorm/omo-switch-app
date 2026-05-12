import {
  APP_ZOOM_STEP_PERCENT,
  DEFAULT_APP_ZOOM_PERCENT,
  MAX_APP_ZOOM_PERCENT,
  MIN_APP_ZOOM_PERCENT,
  normalizeAppZoomPercent,
} from "../../shared/config/app-zoom";

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export {
  APP_ZOOM_STEP_PERCENT,
  DEFAULT_APP_ZOOM_PERCENT,
  MAX_APP_ZOOM_PERCENT,
  MIN_APP_ZOOM_PERCENT,
  normalizeAppZoomPercent,
};

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

function applyCssZoomFallback(percent: number) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  root.style.setProperty("zoom", `${percent / 100}`);
}

function clearCssZoomFallback() {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById("root")?.style.removeProperty("zoom");
}

export async function applyAppZoomPercent(percent: number): Promise<void> {
  const normalizedPercent = normalizeAppZoomPercent(percent);

  if (!isTauriRuntime()) {
    applyCssZoomFallback(normalizedPercent);
    return;
  }

  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    await getCurrentWebview().setZoom(normalizedPercent / 100);
    clearCssZoomFallback();
  } catch {
    applyCssZoomFallback(normalizedPercent);
  }
}
