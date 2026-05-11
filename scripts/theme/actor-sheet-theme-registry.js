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
    label: 'Vaporwave',
    source: 'sheet',
    description: 'Bright cyan-heavy cyberpunk aesthetic',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.18 200)',
      '--vapor-pink': 'oklch(0.72 0.26 350)',
      '--vapor-purple': 'oklch(0.55 0.26 300)',
      '--screen-h': '278',
      '--ink-h': '190'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  cryo: {
    key: 'cryo',
    label: 'Cryo Ice',
    source: 'sheet',
    description: 'Pale cyan, cool and desaturated',
    tokens: {
      '--vapor-cyan': 'oklch(0.92 0.08 200)',
      '--vapor-pink': 'oklch(0.85 0.10 210)',
      '--vapor-purple': 'oklch(0.60 0.10 220)',
      '--screen-h': '215',
      '--ink-h': '205'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  droid: {
    key: 'droid',
    label: 'Droid Amber',
    source: 'sheet',
    description: 'Golden yellow, mechanical and warm',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.17 75)',
      '--vapor-pink': 'oklch(0.78 0.20 55)',
      '--vapor-purple': 'oklch(0.50 0.18 60)',
      '--screen-h': '60',
      '--ink-h': '80'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-mono': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  blood: {
    key: 'blood',
    label: 'Blood Moon',
    source: 'sheet',
    description: 'Deep crimson, dark and intense',
    tokens: {
      '--vapor-cyan': 'oklch(0.72 0.24 20)',
      '--vapor-pink': 'oklch(0.65 0.26 10)',
      '--vapor-purple': 'oklch(0.38 0.20 10)',
      '--screen-h': '12',
      '--ink-h': '20'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  merc: {
    key: 'merc',
    label: 'Merc Green',
    source: 'sheet',
    description: 'Gunmetal green, tactical and muted',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.19 145)',
      '--vapor-pink': 'oklch(0.78 0.20 120)',
      '--vapor-purple': 'oklch(0.45 0.18 155)',
      '--screen-h': '150',
      '--ink-h': '145'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-mono': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
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
      '--screen-h': '18',
      '--ink-h': '25'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  rebel: {
    key: 'rebel',
    label: 'Rebel Alert',
    source: 'sheet',
    description: 'Warm earth tones, rustic alliance',
    tokens: {
      '--vapor-cyan': 'oklch(0.82 0.20 55)',
      '--vapor-pink': 'oklch(0.78 0.22 35)',
      '--vapor-purple': 'oklch(0.55 0.22 40)',
      '--screen-h': '40',
      '--ink-h': '60'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Syne", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  sith: {
    key: 'sith',
    label: 'Sith Holocron',
    source: 'sheet',
    description: 'Dark red and purple, malevolent power',
    tokens: {
      '--vapor-cyan': 'oklch(0.75 0.22 15)',
      '--vapor-pink': 'oklch(0.65 0.26 340)',
      '--vapor-purple': 'oklch(0.40 0.22 350)',
      '--screen-h': '350',
      '--ink-h': '15'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // PORTED GLOBAL THEMES (as actor-sheet palettes)
  // ════════════════════════════════════════════════════════════════════════════════

  holo: {
    key: 'holo',
    label: 'Holo Blue',
    source: 'global',
    description: 'Bright cyan hologram aesthetic',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.14 220)',
      '--vapor-pink': 'oklch(0.78 0.15 240)',
      '--vapor-purple': 'oklch(0.55 0.18 260)',
      '--screen-h': '235',
      '--ink-h': '220'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Space Grotesk", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  jedi: {
    key: 'jedi',
    label: 'Jedi Archive',
    source: 'global',
    description: 'Cool blue, wisdom and clarity',
    tokens: {
      '--vapor-cyan': 'oklch(0.85 0.14 175)',
      '--vapor-pink': 'oklch(0.80 0.18 150)',
      '--vapor-purple': 'oklch(0.48 0.15 160)',
      '--screen-h': '165',
      '--ink-h': '170'
    },
    fonts: {
      '--swse-font-display': '"SWSE Major Mono Display", monospace',
      '--swse-font-body': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-mono': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
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
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Syne", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  'high-contrast': {
    key: 'high-contrast',
    label: 'High Contrast',
    source: 'global',
    description: 'High contrast for accessibility',
    tokens: {
      '--vapor-cyan': 'oklch(0.95 0.35 180)',
      '--vapor-pink': 'oklch(0.95 0.35 60)',
      '--vapor-purple': 'oklch(0.95 0.35 300)',
      '--screen-h': '0',
      '--ink-h': '0'
    },
    fonts: {
      '--swse-font-display': '"SWSE Major Mono Display", monospace',
      '--swse-font-body': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-mono': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
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
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-mono': '"SWSE IBM Plex Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
    }
  },

  'sand-people': {
    key: 'sand-people',
    label: 'Sand People',
    source: 'global',
    description: 'Desert earth tones, sandy ochre',
    tokens: {
      '--vapor-cyan': 'oklch(0.80 0.16 80)',
      '--vapor-pink': 'oklch(0.72 0.18 50)',
      '--vapor-purple': 'oklch(0.55 0.15 70)',
      '--screen-h': '70',
      '--ink-h': '65'
    },
    fonts: {
      '--swse-font-display': '"SWSE VT323", monospace',
      '--swse-font-body': '"SWSE Syne", system-ui, sans-serif',
      '--swse-font-mono': '"SWSE JetBrains Mono", ui-monospace, monospace',
      '--swse-font-orbit': '"SWSE Orbitron", system-ui, sans-serif'
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
 * Includes both color tokens and font tokens
 */
export function buildActorSheetThemeStyle(themeKey) {
  const entry = getActorSheetThemeEntry(getActorSheetTheme(themeKey));
  if (!entry) return '';

  const styles = [];

  // Add canonical shell tokens
  if (entry.tokens) {
    Object.entries(entry.tokens).forEach(([k, v]) => {
      styles.push(`${k}: ${v}`);
    });
  }

  // Add font tokens
  if (entry.fonts) {
    Object.entries(entry.fonts).forEach(([k, v]) => {
      styles.push(`${k}: ${v}`);
    });

    // Direct aliases consumed by the original concept CSS. The v2 token sheet
    // defines these too, but emitting them inline lets a chosen preset override
    // the shell defaults immediately and on every render.
    if (entry.fonts['--swse-font-body']) styles.push(`--font-body: ${entry.fonts['--swse-font-body']}`);
    if (entry.fonts['--swse-font-mono']) styles.push(`--font-mono: ${entry.fonts['--swse-font-mono']}`);
    if (entry.fonts['--swse-font-display']) styles.push(`--font-display: ${entry.fonts['--swse-font-display']}`);
    if (entry.fonts['--swse-font-orbit']) styles.push(`--font-orbit: ${entry.fonts['--swse-font-orbit']}`);
  }

  // Add canonical derived shell tokens so the same theme can be applied to
  // document-root secondary surfaces that are not descendants of .swse-sheet-v2-shell.
  styles.push(
    '--screen-c-base: var(--screen-c-base, 0.055)',
    '--screen-c-alt: var(--screen-c-alt, 0.070)',
    '--accent-h: var(--ink-h)',
    '--accent-c: 0.17',
    '--accent-l: 0.82',
    '--accent: oklch(var(--accent-l) var(--accent-c) var(--accent-h))',
    '--holo-blue: oklch(0.82 0.15 220)',
    '--screen: oklch(0.13 var(--screen-c-base) var(--screen-h))',
    '--screen-2: oklch(0.18 var(--screen-c-alt) var(--screen-h))',
    '--ink: oklch(0.94 0.04 var(--accent-h))',
    '--ink-dim: oklch(0.72 0.06 var(--accent-h))',
    '--ink-faint: oklch(0.50 0.05 var(--accent-h))',
    '--pos: oklch(0.82 0.19 145)',
    '--neg: oklch(0.70 0.22 25)',
    '--zero: oklch(0.88 0.17 95)'
  );

  // Add compatibility aliases used by the concept sheet and shared UI surfaces.
  // This keeps the theme registry as the single authority while allowing newer
  // concept surfaces to consume the same palette without hard-coding per-theme CSS.
  styles.push(
    '--swse-primary: var(--vapor-cyan)',
    '--swse-secondary: var(--vapor-pink)',
    '--swse-accent: var(--vapor-cyan)',
    '--swse-accent-2: var(--vapor-pink)',
    '--swse-accent-soft: color-mix(in oklch, var(--vapor-cyan) 24%, transparent)',
    '--swse-bg-dark: var(--screen)',
    '--swse-bg-mid: var(--screen-2)',
    '--swse-bg-light: color-mix(in oklch, var(--screen-2) 78%, white 6%)',
    '--swse-surface-1: var(--screen)',
    '--swse-surface-2: var(--screen-2)',
    '--swse-surface-3: color-mix(in oklch, var(--screen-2) 86%, white 8%)',
    '--swse-text: var(--ink-dim)',
    '--swse-text-strong: var(--ink)',
    '--swse-text-primary: var(--ink)',
    '--swse-text-secondary: var(--ink-dim)',
    '--swse-text-light: var(--ink)',
    '--swse-text-muted: color-mix(in oklch, var(--ink-dim) 64%, transparent)',
    '--swse-border-default: color-mix(in oklch, var(--vapor-cyan) 28%, transparent)',
    '--swse-border-active: color-mix(in oklch, var(--vapor-cyan) 54%, transparent)',
    '--swse-border-hover: color-mix(in oklch, var(--vapor-pink) 46%, transparent)',
    '--swse-border-subtle: color-mix(in oklch, var(--ink-dim) 24%, transparent)',
    '--swse-shadow-glow-cyan: 0 0 14px color-mix(in oklch, var(--vapor-cyan) 42%, transparent)',
    '--swse-shadow-glow-blue: 0 0 22px color-mix(in oklch, var(--vapor-pink) 30%, transparent)'
  );

  return styles.join('; ');
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

/**
 * Phase 7: Get grouped themes for organized picker display
 * Returns themes organized by family for better usability with 14 themes
 */
export function getActorSheetThemeGroups(activeTheme) {
  const activeEntry = getActorSheetThemeEntry(activeTheme);

  const groups = [
    {
      key: 'core',
      label: 'Core',
      options: ['vapor', 'cryo', 'droid', 'holo'].map(key => {
        const entry = ACTOR_SHEET_THEME_REGISTRY[key];
        return {
          value: entry.key,
          label: entry.label,
          description: entry.description,
          selected: entry.key === activeTheme
        };
      })
    },
    {
      key: 'extended',
      label: 'Extended',
      options: ['jedi', 'high-republic', 'imperial', 'rebel', 'sith', 'merc', 'blood', 'starship', 'high-contrast', 'sand-people'].map(key => {
        const entry = ACTOR_SHEET_THEME_REGISTRY[key];
        return {
          value: entry.key,
          label: entry.label,
          description: entry.description,
          selected: entry.key === activeTheme
        };
      })
    }
  ];

  return groups;
}
