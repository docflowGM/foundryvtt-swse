/* ============================================================================
   THEME MANAGER — GLOBAL AUTHORITY FOR UI TOKENS
   Single source of truth for all UI theme settings
   Applied to :root for cascade to all components
   ============================================================================ */

export class ThemeManager {
  static #settings = {
    accentHue: 190,
    density: 1,
    scanlines: 0.03,
    glowMultiplier: 1
  };

  static applyTheme(settings = {}) {
    const merged = { ...this.#settings, ...settings };
    const root = document.documentElement;

    root.style.setProperty('--swse-accent-h', merged.accentHue);
    root.style.setProperty('--swse-density', merged.density);
    root.style.setProperty('--swse-scan-strength', merged.scanlines);
    root.style.setProperty('--swse-glow', merged.glowMultiplier);
  }

  static loadFromSettings() {
    const theme = game.settings.get('foundryvtt-swse', 'uiTheme') || {};
    this.applyTheme(theme);
  }

  static getTheme() {
    return { ...this.#settings };
  }
}
