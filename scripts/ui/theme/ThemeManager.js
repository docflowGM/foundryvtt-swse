/* ============================================================================
   THEME MANAGER — BACKWARD-COMPATIBLE ADAPTER
   ============================================================================

   DEPRECATED AS PALETTE AUTHORITY.

   The actor-sheet theme registry and ThemeResolutionService are now the single
   source of truth for palettes, fonts, motion, and global datapad tokens.
   This class remains as a compatibility facade for older settings surfaces and
   controls that still call ThemeManager.setTheme()/getTheme().
*/

import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

const NS = 'foundryvtt-swse';

function settingExists(key) {
  try {
    return !!game?.settings?.settings?.has?.(`${NS}.${key}`);
  } catch {
    return false;
  }
}

function safeGet(key, fallback) {
  try {
    if (!settingExists(key)) return fallback;
    return game.settings.get(NS, key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    if (!settingExists(key)) return Promise.resolve(value);
    return game.settings.set(NS, key, value);
  } catch {
    return Promise.resolve(value);
  }
}

export class ThemeManager {
  static defaults = ThemeResolutionService.legacyDefaults;

  static get themeMap() {
    return ThemeResolutionService.getLegacyThemeMap();
  }

  static get shellColorMap() {
    return ThemeResolutionService.shellColorMap;
  }

  static applyTheme(settings = {}) {
    const merged = { ...this.defaults, ...(this.getTheme() || {}), ...settings };
    return ThemeResolutionService.applyToRoot({
      themeKey: merged.theme,
      motionStyle: merged.motionStyle,
      settings: merged
    });
  }

  static async setTheme(settings = {}) {
    const merged = { ...this.defaults, ...(this.getTheme() || {}), ...settings };
    merged.theme = ThemeResolutionService.resolveThemeKey(merged.theme, { preferActor: false });
    merged.motionStyle = ThemeResolutionService.resolveMotionStyle(merged.motionStyle, { preferActor: false });

    await safeSet('uiTheme', merged);

    // Keep the player-facing sheet settings as the authority for other consumers.
    if (settings.theme !== undefined) await safeSet('sheetTheme', merged.theme);
    if (settings.motionStyle !== undefined) await safeSet('sheetMotionStyle', merged.motionStyle);
    if (settings.reducedMotion === true) await safeSet('sheetMotionStyle', 'off');
    if (settings.reducedMotion === false && safeGet('sheetMotionStyle', merged.motionStyle) === 'off') {
      await safeSet('sheetMotionStyle', merged.motionStyle === 'off' ? 'standard' : merged.motionStyle);
    }

    return this.applyTheme(merged);
  }

  static loadFromSettings() {
    return this.applyTheme(this.getTheme());
  }

  static getTheme() {
    const legacy = safeGet('uiTheme', this.defaults);
    const sheetTheme = safeGet('sheetTheme', legacy?.theme ?? this.defaults.theme);
    const motionStyle = safeGet('sheetMotionStyle', legacy?.motionStyle ?? this.defaults.motionStyle);
    return {
      ...this.defaults,
      ...(legacy && typeof legacy === 'object' ? legacy : {}),
      theme: ThemeResolutionService.resolveThemeKey(sheetTheme, { preferActor: false }),
      motionStyle: ThemeResolutionService.resolveMotionStyle(motionStyle, { preferActor: false })
    };
  }
}
