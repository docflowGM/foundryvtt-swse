/* ============================================================================
   SWSE THEME RESOLUTION SERVICE
   ============================================================================

   Single adapter for player-selected theme and motion authority.

   Source of truth:
   - ACTOR_SHEET_THEME_REGISTRY owns palettes and font tokens.
   - ACTOR_SHEET_MOTION_REGISTRY owns motion tokens.
   - Client settings sheetTheme/sheetMotionStyle own the player default.
   - Actor flags sheetTheme/sheetMotionStyle may override for actor-scoped sheets.

   This service exists so sheets, apps, chat, dialogs, dropdowns, tooltips, and
   other secondary surfaces consume the same resolved datapad tokens without
   creating parallel theme maps.
*/

import {
  ACTOR_SHEET_THEME_REGISTRY,
  getActorSheetTheme,
  getActorSheetThemeEntry,
  getActorSheetThemeOptions,
  buildActorSheetThemeStyle
} from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import {
  getActorSheetMotionStyle,
  getActorSheetMotionStyleOptions,
  buildActorSheetMotionStyle
} from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";

const NS = 'foundryvtt-swse';
const DEFAULT_THEME = 'holo';
const DEFAULT_MOTION_STYLE = 'standard';

const THEME_ALIASES = Object.freeze({
  imp: 'imperial',
  empire: 'imperial',
  imperial: 'imperial',
  reb: 'rebel',
  alliance: 'rebel',
  rebel: 'rebel',
  default: DEFAULT_THEME,
  none: DEFAULT_THEME
});

const STYLE_COMMENT_RE = /\/\*[\s\S]*?\*\//g;

function safeGetSetting(key, fallback = null) {
  try {
    if (!globalThis.game?.settings) return fallback;
    const fullKey = `${NS}.${key}`;
    if (game.settings.settings?.has?.(fullKey)) {
      const value = game.settings.get(NS, key);
      return value ?? fallback;
    }
  } catch (err) {
    // Settings are not guaranteed during early module evaluation.
  }
  return fallback;
}

function safeSetStyleProperty(element, key, value) {
  if (!element?.style || !key) return;
  element.style.setProperty(key.trim(), String(value ?? '').trim());
}

function parseStyleText(styleText) {
  const text = String(styleText ?? '').replace(STYLE_COMMENT_RE, '');
  const entries = [];
  for (const part of text.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const splitIndex = trimmed.indexOf(':');
    if (splitIndex <= 0) continue;
    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    if (!key.startsWith('--') || !value) continue;
    entries.push([key, value]);
  }
  return entries;
}

function normalizeThemeInput(value) {
  const raw = typeof value === 'object' && value !== null ? value.theme : value;
  const key = String(raw ?? '').trim();
  if (!key) return null;
  return THEME_ALIASES[key] ?? key;
}

function normalizeMotionInput(value) {
  const raw = typeof value === 'object' && value !== null
    ? (value.motionStyle ?? (value.reducedMotion ? 'off' : null))
    : value;
  const key = String(raw ?? '').trim();
  return key || null;
}

function getActorFlag(actor, flagKey) {
  try {
    return actor?.getFlag?.(NS, flagKey) ?? null;
  } catch {
    return null;
  }
}

function getLegacyThemeObject() {
  const legacy = safeGetSetting('uiTheme', null);
  return legacy && typeof legacy === 'object' ? legacy : null;
}

function coerceNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampNumber(value, min, max, fallback) {
  const numeric = coerceNumber(value, fallback);
  return Math.min(max, Math.max(min, numeric));
}

function buildDisplayControls(settings = {}) {
  const scanStrength = clampNumber(settings.scanStrength, 0, 0.18, 0.03);
  const glow = clampNumber(settings.glow, 0, 3, 1);
  const animSpeed = settings.reducedMotion ? 0.01 : clampNumber(settings.animSpeed, 0.01, 4, 1);
  const sweepOpacity = Math.min(0.42, scanStrength * 4.5);
  const overlayOpacity = Math.min(0.9, scanStrength * 12);
  const lineOpacity = Math.min(0.22, Math.max(0, scanStrength));
  const shimmerOpacity = Math.min(0.18, scanStrength * 2.2);

  return {
    scanStrength,
    glow,
    animSpeed,
    sweepOpacity,
    overlayOpacity,
    lineOpacity,
    shimmerOpacity
  };
}

function buildDisplayControlStyle(settings = {}) {
  const display = buildDisplayControls(settings);
  return [
    ['--swse-scan-strength', display.scanStrength],
    ['--swse-scan-line-opacity', display.lineOpacity],
    ['--swse-scan-overlay-opacity', display.overlayOpacity],
    ['--swse-scan-sweep-opacity', display.sweepOpacity],
    ['--swse-scan-shimmer-opacity', display.shimmerOpacity],
    ['--swse-glow', display.glow],
    ['--scan-strength', display.scanStrength],
    ['--swse-anim-speed', display.animSpeed],
    ['--anim-speed', display.animSpeed],
    ['--glow-mult', display.glow]
  ].map(([k, v]) => `${k}: ${v}`).join('; ');
}

function resolveDisplaySettings() {
  return { ...ThemeResolutionService.legacyDefaults, ...(getLegacyThemeObject() ?? {}) };
}

export class ThemeResolutionService {
  static namespace = NS;
  static defaultTheme = DEFAULT_THEME;
  static defaultMotionStyle = DEFAULT_MOTION_STYLE;

  static normalizeThemeKey(value) {
    return getActorSheetTheme(normalizeThemeInput(value) ?? DEFAULT_THEME);
  }

  static normalizeMotionStyle(value) {
    return getActorSheetMotionStyle(normalizeMotionInput(value) ?? DEFAULT_MOTION_STYLE);
  }

  static resolveThemeKey(value = null, { actor = null, fallback = DEFAULT_THEME, preferActor = true } = {}) {
    const explicit = normalizeThemeInput(value);
    if (explicit) return getActorSheetTheme(explicit);

    if (preferActor) {
      const actorTheme = normalizeThemeInput(getActorFlag(actor, 'sheetTheme'));
      if (actorTheme) return getActorSheetTheme(actorTheme);
    }

    const settingTheme = normalizeThemeInput(safeGetSetting('sheetTheme', null));
    if (settingTheme) return getActorSheetTheme(settingTheme);

    const legacyTheme = normalizeThemeInput(getLegacyThemeObject());
    if (legacyTheme) return getActorSheetTheme(legacyTheme);

    return getActorSheetTheme(fallback);
  }

  static resolveMotionStyle(value = null, { actor = null, fallback = DEFAULT_MOTION_STYLE, preferActor = true } = {}) {
    const explicit = normalizeMotionInput(value);
    if (explicit) return getActorSheetMotionStyle(explicit);

    if (preferActor) {
      const actorMotion = normalizeMotionInput(getActorFlag(actor, 'sheetMotionStyle'));
      if (actorMotion) return getActorSheetMotionStyle(actorMotion);
    }

    const settingMotion = normalizeMotionInput(safeGetSetting('sheetMotionStyle', null));
    if (settingMotion) return getActorSheetMotionStyle(settingMotion);

    const legacy = getLegacyThemeObject();
    if (legacy?.reducedMotion) return getActorSheetMotionStyle('off');

    return getActorSheetMotionStyle(fallback);
  }

  static getThemeOptions() {
    return getActorSheetThemeOptions();
  }

  static getMotionOptions() {
    return getActorSheetMotionStyleOptions();
  }

  static buildThemeStyle(themeKey) {
    return buildActorSheetThemeStyle(this.resolveThemeKey(themeKey));
  }

  static buildMotionStyle(motionStyle) {
    return buildActorSheetMotionStyle(this.resolveMotionStyle(motionStyle));
  }

  static buildDisplayControlsStyle(settings = null) {
    return buildDisplayControlStyle(settings ?? resolveDisplaySettings());
  }

  static buildSurfaceContext({ actor = null, themeKey = null, motionStyle = null, preferActor = true } = {}) {
    const resolvedTheme = this.resolveThemeKey(themeKey, { actor, preferActor });
    const resolvedMotion = this.resolveMotionStyle(motionStyle, { actor, preferActor });
    const themeStyleInline = this.buildThemeStyle(resolvedTheme);
    const motionStyleInline = this.buildMotionStyle(resolvedMotion);
    const displayStyleInline = this.buildDisplayControlsStyle();
    const surfaceStyleInline = [themeStyleInline, motionStyleInline, displayStyleInline].filter(Boolean).join('; ');
    return {
      themeKey: resolvedTheme,
      motionStyle: resolvedMotion,
      themeStyleInline,
      motionStyleInline,
      displayStyleInline,
      surfaceStyleInline
    };
  }

  static applyStyleText(element, styleText) {
    if (!element?.style || !styleText) return;
    for (const [key, value] of parseStyleText(styleText)) {
      safeSetStyleProperty(element, key, value);
    }
  }

  static applyToElement(element, options = {}) {
    if (!element) return this.buildSurfaceContext(options);
    const context = options?.themeStyleInline || options?.motionStyleInline || options?.surfaceStyleInline
      ? {
          themeKey: this.resolveThemeKey(options.themeKey),
          motionStyle: this.resolveMotionStyle(options.motionStyle),
          themeStyleInline: options.themeStyleInline ?? this.buildThemeStyle(options.themeKey),
          motionStyleInline: options.motionStyleInline ?? this.buildMotionStyle(options.motionStyle),
          displayStyleInline: options.displayStyleInline ?? this.buildDisplayControlsStyle(options.settings),
          surfaceStyleInline: options.surfaceStyleInline ?? [
            options.themeStyleInline,
            options.motionStyleInline,
            options.displayStyleInline ?? this.buildDisplayControlsStyle(options.settings)
          ].filter(Boolean).join('; ')
        }
      : this.buildSurfaceContext(options);

    element.dataset.theme = context.themeKey;
    element.dataset.motionStyle = context.motionStyle;
    element.dataset.swseTheme = context.themeKey;
    element.dataset.swseMotionStyle = context.motionStyle;
    this.applyStyleText(element, context.surfaceStyleInline);
    return context;
  }

  static applyToRoot(options = {}) {
    const root = globalThis.document?.documentElement;
    const context = this.applyToElement(root, { ...options, preferActor: false });
    this.applyLegacyDisplayControls(root, options.settings ?? getLegacyThemeObject() ?? {});
    return context;
  }

  static applyLegacyDisplayControls(root, settings = {}) {
    if (!root?.style) return;
    const display = buildDisplayControls(settings);
    const breathing = settings.breathing !== false;
    const language = settings.language ?? 'basic';
    const shellColor = settings.shellColor ?? 'cyan';

    root.style.setProperty('--swse-scan-strength', String(display.scanStrength));
    root.style.setProperty('--swse-scan-line-opacity', String(display.lineOpacity));
    root.style.setProperty('--swse-scan-overlay-opacity', String(display.overlayOpacity));
    root.style.setProperty('--swse-scan-sweep-opacity', String(display.sweepOpacity));
    root.style.setProperty('--swse-scan-shimmer-opacity', String(display.shimmerOpacity));
    root.style.setProperty('--swse-glow', String(display.glow));
    root.style.setProperty('--scan-strength', String(display.scanStrength));
    root.style.setProperty('--swse-anim-speed', String(display.animSpeed));
    root.style.setProperty('--anim-speed', String(display.animSpeed));
    root.style.setProperty('--glow-mult', String(display.glow));
    root.style.setProperty('--swse-shell-color', this.shellColorMap[shellColor] ?? this.shellColorMap.cyan);

    root.classList.toggle('swse-reduced-motion', !!settings.reducedMotion);
    root.classList.toggle('swse-scanlines-disabled', display.scanStrength <= 0);
    root.classList.toggle('swse-no-breathing', !breathing);
    root.classList.toggle('swse-language-aurabesh', language === 'aurabesh');
    root.dataset.swseShellColor = shellColor;
    root.dataset.swseLanguage = language;
  }

  static getCurrentSettings() {
    const legacy = getLegacyThemeObject() ?? {};
    return {
      ...this.legacyDefaults,
      ...legacy,
      theme: this.resolveThemeKey(legacy.theme, { preferActor: false }),
      motionStyle: this.resolveMotionStyle(legacy.motionStyle, { preferActor: false })
    };
  }

  static getLegacyThemeMap() {
    const map = {};
    for (const [key, entry] of Object.entries(ACTOR_SHEET_THEME_REGISTRY)) {
      const tokens = entry.tokens ?? {};
      const cyan = tokens['--vapor-cyan'];
      const pink = tokens['--vapor-pink'];
      const purple = tokens['--vapor-purple'];
      const screenH = coerceNumber(tokens['--screen-h'], 220);
      const inkH = coerceNumber(tokens['--ink-h'], screenH);
      map[key] = {
        cyan,
        pink,
        purple,
        screenH,
        inkH,
        accentHue: inkH,
        label: entry.label,
        description: entry.description
      };
    }

    return map;
  }

  static getThemeEntry(themeKey) {
    return getActorSheetThemeEntry(this.resolveThemeKey(themeKey));
  }

  static get shellColorMap() {
    return {
      cyan: 'oklch(0.82 0.14 220)',
      pink: 'oklch(0.72 0.20 340)',
      green: 'oklch(0.78 0.16 150)',
      amber: 'oklch(0.82 0.16 80)',
      red: 'oklch(0.70 0.20 25)'
    };
  }

  static get legacyDefaults() {
    return {
      theme: DEFAULT_THEME,
      motionStyle: DEFAULT_MOTION_STYLE,
      shellColor: 'cyan',
      scanStrength: 0.03,
      animSpeed: 1,
      glow: 1,
      breathing: true,
      reducedMotion: false,
      language: 'basic'
    };
  }
}

export default ThemeResolutionService;
