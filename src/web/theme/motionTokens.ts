// Duration tokens in milliseconds for consistent motion timing
export const DURATIONS = {
  INSTANT: 0,
  FAST: 120,
  NORMAL: 180,
  DIALOG: 240,
  SLOW: 220,
  SLOWER: 320,
} as const;

export type DurationKey = keyof typeof DURATIONS;

// Easing curves for natural, professional motion
export const EASING = {
  EASE_OUT: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  EASE_IN: "cubic-bezier(0.4, 0, 1, 1)",
  LINEAR: "cubic-bezier(0, 0, 1, 1)",
} as const;

export type EasingKey = keyof typeof EASING;

// Pre-built transition strings for common UI patterns
export const TRANSITIONS = {
  hover: `opacity ${DURATIONS.FAST}ms ${EASING.EASE_OUT}, transform ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
  control: `background-color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}, border-color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}, color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}, box-shadow ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
  collapse: `max-height ${DURATIONS.SLOW}ms ${EASING.EASE_OUT}, opacity ${DURATIONS.SLOW}ms ${EASING.EASE_OUT}`,
  dialog: `opacity ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}, transform ${DURATIONS.DIALOG}ms ${EASING.EASE_OUT}`,
} as const;

export type TransitionKey = keyof typeof TRANSITIONS;

// Reduced motion variant: replaces all durations with 0.01ms
export function createReducedMotionTransitions(): Record<TransitionKey, string> {
  const ms = "0.01ms";
  return {
    hover: `opacity ${ms} ${EASING.EASE_OUT}, transform ${ms} ${EASING.EASE_OUT}`,
    control: `background-color ${ms} ${EASING.EASE_OUT}, border-color ${ms} ${EASING.EASE_OUT}, color ${ms} ${EASING.EASE_OUT}, box-shadow ${ms} ${EASING.EASE_OUT}`,
    collapse: `max-height ${ms} ${EASING.EASE_OUT}, opacity ${ms} ${EASING.EASE_OUT}`,
    dialog: `opacity ${ms} ${EASING.EASE_OUT}, transform ${ms} ${EASING.EASE_OUT}`,
  };
}

// Returns normal or reduced transitions based on user preference
export function getMotionTransitions(
  respectsMotion: boolean
): Record<TransitionKey, string> {
  return respectsMotion
    ? { ...TRANSITIONS }
    : createReducedMotionTransitions();
}

// Generates a CSS stylesheets for global reduced-motion support
const REDUCED_MOTION_CSS = `
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;

export function createMotionStylesheets(): string {
  return REDUCED_MOTION_CSS;
}
