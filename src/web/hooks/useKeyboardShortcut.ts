import { useEffect, useCallback } from "react";

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

export interface UseKeyboardShortcutOptions {
  onTrigger: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut(options: UseKeyboardShortcutOptions): void {
  const { onTrigger, enabled = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = isMacPlatform();
      const isSaveShortcut = isMac
        ? e.metaKey && e.key === "s"
        : e.ctrlKey && e.key === "s";

      if (isSaveShortcut) {
        e.preventDefault();
        onTrigger();
      }
    },
    [enabled, onTrigger]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
