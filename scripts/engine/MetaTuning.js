/**
 * SWSE MetaTuning Engine (V2)
 *
 * Centralized configuration for:
 * - Community synergy weighting
 * - Archetype emphasis tuning
 * - Feature toggles
 *
 * Sovereignty Rules:
 * - Pure configuration service
 * - No actor mutation
 * - No derived writes
 * - No side effects outside Foundry settings registration
 */

const MODULE_ID = 'foundryvtt-swse';

export class MetaTuning {

  /* -------------------------------------------------------------------------- */
  /* DEFAULT CONFIGURATION                                                      */
  /* -------------------------------------------------------------------------- */

  static DEFAULT_CONFIG = {
    enabled: true,

    // Adjust weighting per build archetype
    themeEmphasis: {
      ranged: 1.0,
      melee: 1.0,
      force: 1.0,
      leadership: 1.0,
      stealth: 1.0,
      tech: 1.0,
      defense: 1.0,
      vehicle: 1.0
    },

    // Future-proofing for expansion
    debugLogging: false
  };

  /* -------------------------------------------------------------------------- */
  /* CONFIG ACCESS                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Get current MetaTuning configuration
   */
  static getConfig() {
    const stored = game.settings.get(MODULE_ID, 'metaTuningConfig');
    return stored ?? this.DEFAULT_CONFIG;
  }

  /**
   * Update MetaTuning configuration safely
   */
  static async updateConfig(partial) {
    const current = this.getConfig();
    const merged = foundry.utils.mergeObject(
      foundry.utils.deepClone(current),
      partial
    );

    await game.settings.set(MODULE_ID, 'metaTuningConfig', merged);
    return merged;
  }

  /**
   * Reset configuration to defaults
   */
  static async resetConfig() {
    await game.settings.set(MODULE_ID, 'metaTuningConfig', this.DEFAULT_CONFIG);
    return this.DEFAULT_CONFIG;
  }

  /**
   * Get emphasis multiplier for a specific archetype
   */
  static getThemeWeight(archetype) {
    const config = this.getConfig();
    if (!config.enabled) return 1.0;
    return config.themeEmphasis?.[archetype] ?? 1.0;
  }

  /**
   * Check if meta tuning system is enabled
   */
  static isEnabled() {
    return this.getConfig().enabled === true;
  }

  /**
   * Debug logging helper
   */
  static debug(...args) {
    if (this.getConfig().debugLogging) {
      console.log('SWSE MetaTuning |', ...args);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* SETTINGS REGISTRATION                                                      */
/* -------------------------------------------------------------------------- */

export function registerMetaTuningSettings() {

  game.settings.register(MODULE_ID, 'metaTuningConfig', {
    name: 'Meta Tuning Configuration',
    hint: 'Adjust community synergy weighting and meta build influence.',
    scope: 'world',
    config: false, // hidden (advanced system setting)
    type: Object,
    default: MetaTuning.DEFAULT_CONFIG
  });

}