/* ============================================================================
   THEME MANAGER — GLOBAL AUTHORITY FOR UI TOKENS
   ============================================================================ */

export class ThemeManager {
  static defaults = {
    theme: 'cryo',
    shellColor: 'cyan',
    scanStrength: 0.03,
    animSpeed: 1,
    glow: 1,
    breathing: true,
    reducedMotion: false,
    language: 'basic'
  };

  static themeMap = {
    vapor: { cyan: 'oklch(0.85 0.18 200)', pink: 'oklch(0.72 0.26 350)', purple: 'oklch(0.55 0.26 300)', screenH: 278, inkH: 190, accentHue: 190 },
    holo:  { cyan: 'oklch(0.85 0.14 220)', pink: 'oklch(0.78 0.15 240)', purple: 'oklch(0.55 0.18 260)', screenH: 235, inkH: 220, accentHue: 220 },
    imp:   { cyan: 'oklch(0.80 0.18 25)',  pink: 'oklch(0.72 0.22 15)',  purple: 'oklch(0.45 0.20 20)',  screenH: 18,  inkH: 25,  accentHue: 25 },
    reb:   { cyan: 'oklch(0.82 0.20 55)',  pink: 'oklch(0.78 0.22 35)',  purple: 'oklch(0.55 0.22 40)',  screenH: 40,  inkH: 60,  accentHue: 60 },
    jedi:  { cyan: 'oklch(0.85 0.14 175)', pink: 'oklch(0.80 0.18 150)', purple: 'oklch(0.48 0.15 160)', screenH: 165, inkH: 170, accentHue: 170 },
    sith:  { cyan: 'oklch(0.75 0.22 15)',  pink: 'oklch(0.65 0.26 340)', purple: 'oklch(0.40 0.22 350)', screenH: 350, inkH: 15,  accentHue: 15 },
    droid: { cyan: 'oklch(0.82 0.17 75)',  pink: 'oklch(0.78 0.20 55)',  purple: 'oklch(0.50 0.18 60)',  screenH: 60,  inkH: 80,  accentHue: 80 },
    merc:  { cyan: 'oklch(0.82 0.19 145)', pink: 'oklch(0.78 0.20 120)', purple: 'oklch(0.45 0.18 155)', screenH: 150, inkH: 145, accentHue: 145 },
    cryo:  { cyan: 'oklch(0.92 0.08 200)', pink: 'oklch(0.85 0.10 210)', purple: 'oklch(0.60 0.10 220)', screenH: 215, inkH: 205, accentHue: 205 },
    blood: { cyan: 'oklch(0.72 0.24 20)',  pink: 'oklch(0.65 0.26 10)',  purple: 'oklch(0.38 0.20 10)',  screenH: 12,  inkH: 20,  accentHue: 20 }
  };

  static shellColorMap = {
    cyan: 'oklch(0.82 0.14 220)',
    pink: 'oklch(0.72 0.20 340)',
    green: 'oklch(0.78 0.16 150)',
    amber: 'oklch(0.82 0.16 80)',
    red: 'oklch(0.70 0.20 25)'
  };

  static applyTheme(settings = {}) {
    const merged = { ...this.defaults, ...settings };
    const theme = this.themeMap[merged.theme] || this.themeMap.cryo;
    const root = document.documentElement;

    root.style.setProperty('--swse-accent-h', String(theme.accentHue));
    root.style.setProperty('--swse-scan-strength', String(merged.scanStrength));
    root.style.setProperty('--swse-glow', String(merged.glow));
    root.style.setProperty('--swse-shell-color', this.shellColorMap[merged.shellColor] || this.shellColorMap.cyan);

    root.style.setProperty('--vapor-cyan', theme.cyan);
    root.style.setProperty('--vapor-pink', theme.pink);
    root.style.setProperty('--vapor-purple', theme.purple);
    root.style.setProperty('--screen-h', String(theme.screenH));
    root.style.setProperty('--ink-h', String(theme.inkH));
    root.style.setProperty('--accent-h', String(theme.accentHue));
    root.style.setProperty('--scan-strength', String(merged.scanStrength));
    root.style.setProperty('--anim-speed', String(merged.reducedMotion ? 0.01 : merged.animSpeed));
    root.style.setProperty('--glow-mult', String(merged.glow));

    root.classList.toggle('swse-reduced-motion', !!merged.reducedMotion);
    root.classList.toggle('swse-no-breathing', !merged.breathing);
    root.classList.toggle('swse-language-aurabesh', merged.language === 'aurabesh');
    root.dataset.swseTheme = merged.theme;
    root.dataset.swseShellColor = merged.shellColor;
    root.dataset.swseLanguage = merged.language;
  }

  static async setTheme(settings) {
    const merged = { ...this.defaults, ...(this.getTheme() || {}), ...settings };
    if (game?.settings) {
      await game.settings.set('foundryvtt-swse', 'uiTheme', merged);
    }
    this.applyTheme(merged);
  }

  static loadFromSettings() {
    if (!game?.settings) return;
    const theme = game.settings.get('foundryvtt-swse', 'uiTheme') || this.defaults;
    this.applyTheme(theme);
  }

  static getTheme() {
    if (game?.settings) {
      return game.settings.get('foundryvtt-swse', 'uiTheme') || this.defaults;
    }
    return this.defaults;
  }
}
