import { ThemeManager } from "/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

const LABELS = {
  vapor: 'Vaporwave',
  holo: 'Holo Blue',
  imperial: 'Imperial',
  rebel: 'Rebel Alert',
  jedi: 'Jedi Archive',
  sith: 'Sith Holocron',
  droid: 'Droid Amber',
  merc: 'Merc Green',
  cryo: 'Cryo Ice',
  blood: 'Blood Moon',
  'high-republic': 'High Republic',
  'high-contrast': 'High Contrast',
  starship: 'Starship',
  'sand-people': 'Sand People'
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
    ].map(c => ({
      ...c,
      start: c.color,
      mid: c.color,
      end: c.color
    }));
  }

  static getMotionOptions() {
    return ThemeResolutionService.getMotionOptions();
  }

  static async buildViewModel(actor, options = {}) {
    const isGMHost = !!options.gm;
    const preferActor = options.preferActor ?? !isGMHost;
    const pendingControls = options.pendingControls && typeof options.pendingControls === 'object' ? options.pendingControls : {};
    const current = { ...(ThemeManager.getTheme() || ThemeManager.defaults), ...pendingControls };
    const actorTheme = ThemeResolutionService.resolveThemeKey(null, { actor, preferActor });
    const actorMotionStyle = ThemeResolutionService.resolveMotionStyle(null, { actor, preferActor });
    const warning = 'Warning, changing native language to Aurabesh may result in a more difficult play.';

    return {
      id: 'settings',
      title: isGMHost ? 'GM Holopad Settings' : 'Holopad Settings',
      subtitle: isGMHost ? 'Command Interface Tuning' : 'Device Interface Tuning',
      introTitle: isGMHost ? 'COMMAND INTERFACE TUNING' : 'DEVICE INTERFACE TUNING',
      introSubtitle: isGMHost
        ? 'The GM console uses the same shared Holopad settings surface as actor datapads.'
        : 'The holopad reads from one shared configuration surface.',
      backLabel: isGMHost ? 'GM Home' : 'Character Sheet',
      backAction: isGMHost ? 'return-to-home' : 'return-to-sheet',
      isGMHost,
      warning,
      aurabeshWarning: warning,
      presets: this.getThemePresets().map(p => ({ ...p, selected: p.id === actorTheme })),
      shellColors: this.getShellColors().map(c => ({ ...c, selected: c.id === current.shellColor })),
      motionOptions: this.getMotionOptions().map(option => ({
        id: option.value,
        label: option.label,
        description: option.description,
        selected: option.value === actorMotionStyle
      })),
      controls: {
        theme: actorTheme,
        motionStyle: actorMotionStyle,
        shellColor: current.shellColor,
        scanStrength: current.scanStrength,
        animSpeed: current.animSpeed,
        glow: current.glow,
        breathing: !!current.breathing,
        reducedMotion: !!current.reducedMotion,
        language: current.language || 'basic',
        languageMode: current.language || 'basic'
      }
    };
  }
}
