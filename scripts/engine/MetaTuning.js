/**
 * SWSE MetaTuning Engine (V2)
 *
 * Centralized configuration for:
 * - Community synergy weighting
 * - Archetype emphasis tuning
 * - Feature toggles
 *
 * Governance:
 * - Reads/writes flow through HouseRuleService so system settings retain one SSOT.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

const MODULE_ID = 'foundryvtt-swse';

export class MetaTuning {
  static DEFAULT_CONFIG = {
    enabled: true,
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
    debugLogging: false
  };

  static getConfig() {
    return HouseRuleService.getObject('metaTuningConfig', this.DEFAULT_CONFIG);
  }

  static async updateConfig(partial) {
    const current = this.getConfig();
    const merged = foundry.utils.mergeObject(
      foundry.utils.deepClone(current),
      partial
    );
    await HouseRuleService.set('metaTuningConfig', merged);
    return merged;
  }

  static async resetConfig() {
    await HouseRuleService.set('metaTuningConfig', this.DEFAULT_CONFIG);
    return this.DEFAULT_CONFIG;
  }

  static getThemeWeight(archetype) {
    const config = this.getConfig();
    if (!config.enabled) return 1.0;
    return config.themeEmphasis?.[archetype] ?? 1.0;
  }

  static isEnabled() {
    return this.getConfig().enabled === true;
  }

  static debug(...args) {
    if (this.getConfig().debugLogging) {
      console.log('SWSE MetaTuning |', ...args);
    }
  }
}

export function registerMetaTuningSettings() {
  game.settings.register(MODULE_ID, 'metaTuningConfig', {
    name: 'Meta Tuning Configuration',
    hint: 'Adjust community synergy weighting and meta build influence.',
    scope: 'world',
    config: false,
    type: Object,
    default: MetaTuning.DEFAULT_CONFIG
  });
}
