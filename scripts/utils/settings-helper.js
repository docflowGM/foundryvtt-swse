/**
 * Centralized settings helper facade.
 * Delegates all runtime reads/writes to HouseRuleService so the service remains
 * the only system-settings SSOT surface.
 */
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SETTINGS_DEFAULTS } from "/systems/foundryvtt-swse/scripts/utils/settings-defaults.js";

export class SettingsHelper {
  static NS = 'foundryvtt-swse';
  static DEFAULTS = SETTINGS_DEFAULTS;

  static getSafe(key, defaultValue = null) {
    return HouseRuleService.getSafe(key, defaultValue);
  }

  static getBoolean(key, defaultValue = false) {
    return HouseRuleService.getBoolean(key, defaultValue);
  }

  static getString(key, defaultValue = '') {
    return HouseRuleService.getString(key, defaultValue);
  }

  static getNumber(key, defaultValue = 0) {
    return HouseRuleService.getNumber(key, defaultValue);
  }

  static getArray(key, defaultValue = []) {
    return HouseRuleService.getArray(key, defaultValue);
  }

  static getObject(key, defaultValue = {}) {
    return HouseRuleService.getObject(key, defaultValue);
  }

  static async set(key, value) {
    return HouseRuleService.set(key, value);
  }

  static get(key) {
    return HouseRuleService.get(key);
  }
}
