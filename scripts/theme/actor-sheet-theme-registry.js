/**
 * SWSE Actor Sheet Theme Registry
 * Phase 6: Canonical theme authority for character sheet v2
 *
 * This registry defines all available themes for the actor sheet.
 * Themes are stored per-actor via flags and rendered with OKLCh tokens.
 *
 * Theme sources:
 * - sheet: native actor-sheet themes (vapor, cryo, droid, blood, merc, imperial, rebel, sith)
 * - global: ported from global UI themes (holo, jedi, high-republic, high-contrast, starship, sand-people)
 *
 * Note: Global theme names are reused for identity/palette, but themes are NOT
 * integrated with ThemeLoader at runtime. Each is a self-contained actor-sheet style.
 */

export const ACTOR_SHEET_THEME_REGISTRY = {
  // ════════════════════════════════════════════════════════════════════════════════
  // SHEET-NATIVE THEMES
  // ════════════════════════════════════════════════════════════════════════════════

  vapor: {
    key: 'vapor',
    label: 'Vapor',
    source: 'sheet',
    description: 'Bright cyan-heavy cyberpunk aesthetic',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.18 200)',
      '--vapor-pink': 'oklch(0.72 0.26 350)',
      '--vapor-purple': 'oklch(0.55 0.26 300)',
      '--screen-h': '278',
      '--ink-h': '190'
    }
  },

  cryo: {
    key: 'cryo',
    label: 'Cryo',
    source: 'sheet',
    description: 'Pale cyan, cool and desaturated',
    tokens: {
      '--vapor-cyan': 'oklch(0.92 0.08 200)',
      '--vapor-pink': 'oklch(0.85 0.10 210)',
      '--vapor-purple': 'oklch(0.60 0.10 220)',
      '--screen-h': '215',
      '--ink-h': '205'
    }
  },

  droid: {
    key: 'droid',
    label: 'Droid',
    source: 'sheet',
    description: 'Golden yellow, mechanical and warm',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.17 75)',
      '--vapor-pink': 'oklch(0.78 0.20 55)',
      '--vapor-purple': 'oklch(0.50 0.18 60)',
      '--screen-h': '60',
      '--ink-h': '80'
    }
  },

  blood: {
    key: 'blood',
    label: 'Blood',
    source: 'sheet',
    description: 'Deep crimson, dark and intense',
    tokens: {
      '--vapor-cyan': 'oklch(0.72 0.24 20)',
      '--vapor-pink': 'oklch(0.65 0.26 10)',
      '--vapor-purple': 'oklch(0.40 0.22 350)',
      '--screen-h': '10',
      '--ink-h': '15'
    }
  },

  merc: {
    key: 'merc',
    label: 'Merc',
    source: 'sheet',
    description: 'Gunmetal green, tactical and muted',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.19 145)',
      '--vapor-pink': 'oklch(0.78 0.20 120)',
      '--vapor-purple': 'oklch(0.45 0.18 155)',
      '--screen-h': '140',
      '--ink-h': '150'
    }
  },

  imperial: {
    key: 'imperial',
    label: 'Imperial',
    source: 'sheet',
    description: 'Dark red and black, authoritarian',
    tokens: {
      '--vapor-cyan': 'oklch(0.80 0.18 25)',
      '--vapor-pink': 'oklch(0.72 0.22 15)',
      '--vapor-purple': 'oklch(0.45 0.20 20)',
      '--screen-h': '15',
      '--ink-h': '20'
    }
  },

  rebel: {
    key: 'rebel',
    label: 'Rebel',
    source: 'sheet',
    description: 'Warm earth tones, rustic alliance',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.20 55)',
      '--vapor-pink': 'oklch(0.78 0.22 35)',
      '--vapor-purple': 'oklch(0.55 0.22 40)',
      '--screen-h': '40',
      '--ink-h': '50'
    }
  },

  sith: {
    key: 'sith',
    label: 'Sith',
    source: 'sheet',
    description: 'Dark red and purple, malevolent power',
    tokens: {
      '--vapor-cyan': 'oklch(0.75 0.22 15)',
      '--vapor-pink': 'oklch(0.65 0.26 340)',
      '--vapor-purple': 'oklch(0.40 0.22 350)',
      '--screen-h': '10',
      '--ink-h': '345'
    }
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // PORTED GLOBAL THEMES (as actor-sheet palettes)
  // ════════════════════════════════════════════════════════════════════════════════

  holo: {
    key: 'holo',
    label: 'Holo',
    source: 'global',
    description: 'Bright cyan hologram aesthetic',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.14 220)',
      '--vapor-pink': 'oklch(0.78 0.15 240)',
      '--vapor-purple': 'oklch(0.55 0.18 260)',
      '--screen-h': '220',
      '--ink-h': '220'
    }
  },

  jedi: {
    key: 'jedi',
    label: 'Jedi',
    source: 'global',
    description: 'Cool blue, wisdom and clarity',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.14 175)',
      '--vapor-pink': 'oklch(0.80 0.18 150)',
      '--vapor-purple': 'oklch(0.48 0.15 160)',
      '--screen-h': '165',
      '--ink-h': '170'
    }
  },

  'high-republic': {
    key: 'high-republic',
    label: 'High Republic',
    source: 'global',
    description: 'Golden warm, classic elegance',
    tokens: {
      '--vapor-cyan': 'oklch(0.90 0.10 95)',
      '--vapor-pink': 'oklch(0.82 0.16 70)',
      '--vapor-purple': 'oklch(0.58 0.14 85)',
      '--screen-h': '85',
      '--ink-h': '95'
    }
  },

  'high-contrast': {
    key: 'high-contrast',
    label: 'High Contrast',
    source: 'global',
    description: 'Maximal contrast for accessibility',
    tokens: {
      '--vapor-cyan': 'oklch(1.0 0.40 180)',
      '--vapor-pink': 'oklch(1.0 0.40 60)',
      '--vapor-purple': 'oklch(1.0 0.40 300)',
      '--screen-h': '0',
      '--ink-h': '0'
    }
  },

  starship: {
    key: 'starship',
    label: 'Starship',
    source: 'global',
    description: 'Cool blue tech, starfighter aesthetic',
    tokens: {
      '--vapor-cyan': 'oklch(0.88 0.12 200)',
      '--vapor-pink': 'oklch(0.80 0.14 210)',
      '--vapor-purple': 'oklch(0.52 0.16 240)',
      '--screen-h': '200',
      '--ink-h': '210'
    }
  },

  'sand-people': {
    key: 'sand-people',
    label: 'Sand People',
    source: 'global',
    description: 'Desert earth tones, sandy ochre',
    tokens: {
      '--vapor-cyan': 'oklch(0.72 0.18 85)',
      '--vapor-pink': 'oklch(0.65 0.20 55)',
      '--vapor-purple': 'oklch(0.48 0.16 70)',
      '--screen-h': '70',
      '--ink-h': '60'
    }
  }
};

/**
 * Get all valid theme keys
 */
export function getActorSheetThemeKeys() {
  return Object.keys(ACTOR_SHEET_THEME_REGISTRY);
}

/**
 * Check if a theme key is valid
 */
export function isValidActorSheetTheme(value) {
  return Object.prototype.hasOwnProperty.call(ACTOR_SHEET_THEME_REGISTRY, value);
}

/**
 * Get a theme entry by key
 */
export function getActorSheetThemeEntry(themeKey) {
  return ACTOR_SHEET_THEME_REGISTRY[themeKey] || null;
}

/**
 * Resolve a theme key, falling back to default if invalid
 */
export function getActorSheetTheme(value) {
  const DEFAULT_THEME = 'cryo';
  return isValidActorSheetTheme(value) ? value : DEFAULT_THEME;
}

/**
 * Get all theme options for UI selectors
 */
export function getActorSheetThemeOptions() {
  return Object.values(ACTOR_SHEET_THEME_REGISTRY).map((entry) => ({
    value: entry.key,
    label: entry.label
  }));
}

/**
 * Build inline style string from theme tokens
 * Returns CSS custom property declarations for the shell element
 */
export function buildActorSheetThemeStyle(themeKey) {
  const entry = getActorSheetThemeEntry(getActorSheetTheme(themeKey));
  if (!entry || !entry.tokens) return '';

  return Object.entries(entry.tokens)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/**
 * Get theme metadata by key
 */
export function getActorSheetThemeLabel(themeKey) {
  const entry = getActorSheetThemeEntry(getActorSheetTheme(themeKey));
  return entry ? entry.label : 'Unknown';
}

export function getActorSheetThemeDescription(themeKey) {
  const entry = getActorSheetThemeEntry(getActorSheetTheme(themeKey));
  return entry ? entry.description : '';
}

/**
 * Get all themes from a specific source
 */
export function getActorSheetThemesBySource(source) {
  return Object.values(ACTOR_SHEET_THEME_REGISTRY)
    .filter(entry => entry.source === source)
    .map(entry => entry.key);
}
