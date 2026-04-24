/**
 * SWSE Actor Sheet Motion Style Registry
 * Phase 10: Animation control system for actor sheet motion presets
 *
 * This registry defines all available motion style presets for the actor sheet.
 * Motion styles are stored per-actor via flags and applied through CSS custom properties.
 *
 * Motion styles control:
 * - Animation speed/duration
 * - Glow intensity and opacity
 * - Flicker frequency and amplitude
 * - Overall "aliveness" of the presentation
 */

export const ACTOR_SHEET_MOTION_REGISTRY = {
  off: {
    key: 'off',
    label: 'Off',
    description: 'Static presentation with minimal decorative motion.',
    tokens: {
      '--motion-enabled': '0',
      '--motion-breathe-speed': '0s',
      '--motion-shimmer-speed': '0s',
      '--motion-scan-speed': '0s',
      '--motion-sweep-speed': '0s',
      '--motion-pulse-speed': '0s',
      '--motion-flicker-speed': '0s',
      '--motion-diagnostic-speed': '0s',
      '--motion-micro-speed': '0s',
      '--motion-chip-swatch-speed': '0s',
      '--motion-tick-speed': '0s',
      '--motion-glow-alpha': '0.00',
      '--motion-glow-alpha-strong': '0.00',
      '--motion-glow-alpha-subtle': '0.00'
    }
  },

  quiet: {
    key: 'quiet',
    label: 'Quiet',
    description: 'Subtle holographic motion with reduced intensity.',
    tokens: {
      '--motion-enabled': '1',
      '--motion-breathe-speed': '6.2s',
      '--motion-shimmer-speed': '4.2s',
      '--motion-scan-speed': '5.2s',
      '--motion-sweep-speed': '5.0s',
      '--motion-pulse-speed': '4.8s',
      '--motion-flicker-speed': '10.0s',
      '--motion-diagnostic-speed': '10.8s',
      '--motion-micro-speed': '8.4s',
      '--motion-chip-swatch-speed': '6.2s',
      '--motion-tick-speed': '3.2s',
      '--motion-glow-alpha': '0.12',
      '--motion-glow-alpha-strong': '0.20',
      '--motion-glow-alpha-subtle': '0.08'
    }
  },

  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Balanced powered-display motion (default).',
    tokens: {
      '--motion-enabled': '1',
      '--motion-breathe-speed': '4.8s',
      '--motion-shimmer-speed': '2.8s',
      '--motion-scan-speed': '3.6s',
      '--motion-sweep-speed': '3.2s',
      '--motion-pulse-speed': '2.4s',
      '--motion-flicker-speed': '1.8s',
      '--motion-diagnostic-speed': '8.2s',
      '--motion-micro-speed': '6.8s',
      '--motion-chip-swatch-speed': '4.6s',
      '--motion-tick-speed': '2.2s',
      '--motion-glow-alpha': '0.24',
      '--motion-glow-alpha-strong': '0.42',
      '--motion-glow-alpha-subtle': '0.15'
    }
  },

  cinematic: {
    key: 'cinematic',
    label: 'Cinematic',
    description: 'Richer breathing and sheen with stronger display life.',
    tokens: {
      '--motion-enabled': '1',
      '--motion-breathe-speed': '4.0s',
      '--motion-shimmer-speed': '2.2s',
      '--motion-scan-speed': '3.0s',
      '--motion-sweep-speed': '2.8s',
      '--motion-pulse-speed': '2.0s',
      '--motion-flicker-speed': '1.4s',
      '--motion-diagnostic-speed': '6.8s',
      '--motion-micro-speed': '5.6s',
      '--motion-chip-swatch-speed': '3.8s',
      '--motion-tick-speed': '1.8s',
      '--motion-glow-alpha': '0.36',
      '--motion-glow-alpha-strong': '0.60',
      '--motion-glow-alpha-subtle': '0.22'
    }
  },

  diagnostic: {
    key: 'diagnostic',
    label: 'Diagnostic',
    description: 'Console-like powered behavior with stronger micro-flicker.',
    tokens: {
      '--motion-enabled': '1',
      '--motion-breathe-speed': '4.4s',
      '--motion-shimmer-speed': '2.6s',
      '--motion-scan-speed': '3.1s',
      '--motion-sweep-speed': '3.0s',
      '--motion-pulse-speed': '2.2s',
      '--motion-flicker-speed': '1.5s',
      '--motion-diagnostic-speed': '5.4s',
      '--motion-micro-speed': '5.8s',
      '--motion-chip-swatch-speed': '4.2s',
      '--motion-tick-speed': '2.0s',
      '--motion-glow-alpha': '0.32',
      '--motion-glow-alpha-strong': '0.54',
      '--motion-glow-alpha-subtle': '0.18'
    }
  }
};

/**
 * Get all valid motion style keys
 */
export function getActorSheetMotionStyleKeys() {
  return Object.keys(ACTOR_SHEET_MOTION_REGISTRY);
}

/**
 * Check if a motion style key is valid
 */
export function isValidActorSheetMotionStyle(value) {
  return Object.prototype.hasOwnProperty.call(ACTOR_SHEET_MOTION_REGISTRY, value);
}

/**
 * Get a motion style entry by key
 */
export function getActorSheetMotionStyleEntry(styleKey) {
  return ACTOR_SHEET_MOTION_REGISTRY[styleKey] || null;
}

/**
 * Resolve a motion style key, falling back to default if invalid
 */
export function getActorSheetMotionStyle(value) {
  const DEFAULT_MOTION_STYLE = 'standard';
  return isValidActorSheetMotionStyle(value) ? value : DEFAULT_MOTION_STYLE;
}

/**
 * Get all motion style options for UI selectors
 */
export function getActorSheetMotionStyleOptions() {
  return Object.values(ACTOR_SHEET_MOTION_REGISTRY).map((entry) => ({
    value: entry.key,
    label: entry.label,
    description: entry.description
  }));
}

/**
 * Build inline style string from motion style tokens
 * Returns CSS custom property declarations for the shell element
 */
export function buildActorSheetMotionStyle(styleKey) {
  const entry = getActorSheetMotionStyleEntry(getActorSheetMotionStyle(styleKey));
  if (!entry || !entry.tokens) return '';

  return Object.entries(entry.tokens)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/**
 * Get motion style metadata by key
 */
export function getActorSheetMotionStyleLabel(styleKey) {
  const entry = getActorSheetMotionStyleEntry(getActorSheetMotionStyle(styleKey));
  return entry ? entry.label : 'Unknown';
}

export function getActorSheetMotionStyleDescription(styleKey) {
  const entry = getActorSheetMotionStyleEntry(getActorSheetMotionStyle(styleKey));
  return entry ? entry.description : '';
}
