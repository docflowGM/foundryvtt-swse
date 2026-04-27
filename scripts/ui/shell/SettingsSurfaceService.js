import { ThemeManager } from "/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js";

const LABELS = {
  vapor: 'Vaporwave',
  holo: 'Holo Blue',
  imp: 'Imperial',
  reb: 'Rebel Alert',
  jedi: 'Jedi Archive',
  sith: 'Sith Holocron',
  droid: 'Droid Amber',
  merc: 'Merc Green',
  cryo: 'Cryo Ice',
  blood: 'Blood Moon'
};

export class SettingsSurfaceService {
  static getThemePresets() {
    return Object.entries(ThemeManager.themeMap).map(([id, preset]) => ({
      id,
      label: LABELS[id] || id,
      cyan: preset.cyan,
      pink: preset.pink,
      purple: preset.purple
    }));
  }

  static getShellColors() {
    return [
      { id: 'cyan', label: 'Cyan', color: ThemeManager.shellColorMap.cyan },
      { id: 'pink', label: 'Pink', color: ThemeManager.shellColorMap.pink },
      { id: 'green', label: 'Green', color: ThemeManager.shellColorMap.green },
      { id: 'amber', label: 'Amber', color: ThemeManager.shellColorMap.amber },
      { id: 'red', label: 'Red', color: ThemeManager.shellColorMap.red }
    ];
  }

  static async buildViewModel(actor, options = {}) {
    const current = ThemeManager.getTheme() || ThemeManager.defaults;
    return {
      id: 'settings',
      title: 'Holopad Settings',
      subtitle: 'Device Interface Tuning',
      warning: 'Warning, changing native language to Aurabesh may result in a more difficult play.',
      presets: this.getThemePresets().map(p => ({ ...p, selected: p.id === current.theme })),
      shellColors: this.getShellColors().map(c => ({ ...c, selected: c.id === current.shellColor })),
      controls: {
        theme: current.theme,
        shellColor: current.shellColor,
        scanStrength: current.scanStrength,
        animSpeed: current.animSpeed,
        glow: current.glow,
        breathing: !!current.breathing,
        reducedMotion: !!current.reducedMotion,
        language: current.language || 'basic'
      }
    };
  }
}
