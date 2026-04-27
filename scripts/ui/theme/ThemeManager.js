/* ============================================================================
   THEME MANAGER — GLOBAL AUTHORITY FOR UI TOKENS
   Single source of truth for all UI theme settings
   Applied to :root for cascade to all components
   ============================================================================ */

export class ThemeManager {
  static defaults = {
    accentHue: 190,
    density: 1,
    scanlines: 0.03,
    glow: 1
  };

  static applyTheme(settings = {}) {
    const merged = { ...this.defaults, ...settings };
    const root = document.documentElement;

    // Set new unified token names
    root.style.setProperty('--swse-accent-h', merged.accentHue);
    root.style.setProperty('--swse-density', merged.density);
    root.style.setProperty('--swse-scan-strength', merged.scanlines);
    root.style.setProperty('--swse-glow', merged.glow);

    // Set legacy variable names for backwards compatibility
    root.style.setProperty('--accent-h', merged.accentHue);
    root.style.setProperty('--ink-h', merged.accentHue);
    root.style.setProperty('--density', merged.density);
    root.style.setProperty('--scan-strength', merged.scanlines);
    root.style.setProperty('--glow-mult', merged.glow);
  }

  static setTheme(settings) {
    if (game && game.settings) {
      game.settings.set('foundryvtt-swse', 'uiTheme', settings);
    }
    this.applyTheme(settings);
  }

  static loadFromSettings() {
    if (!game || !game.settings) return;
    const theme = game.settings.get('foundryvtt-swse', 'uiTheme') || this.defaults;
    this.applyTheme(theme);
  }

  static getTheme() {
    if (game && game.settings) {
      return game.settings.get('foundryvtt-swse', 'uiTheme') || this.defaults;
    }
    return this.defaults;
  }
}
