/**
 * House Rule Service — SINGLE SOURCE OF TRUTH
 *
 * All system setting access flows through this service.
 * No engine, sheet, calculator, or UI module may call game.settings.get()/set()
 * directly for the foundryvtt-swse namespace.
 */

import { SETTINGS_DEFAULTS } from "/systems/foundryvtt-swse/scripts/utils/settings-defaults.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class HouseRuleService {
  static NS = "foundryvtt-swse";
  static DEFAULTS = SETTINGS_DEFAULTS;

  static _warnedMissingKeys = new Set();
  static _warnedBootUnavailable = false;

  static _syncDebugFlag(value) {
    try {
      globalThis.SWSE_DEBUG_LOGGING = value === true;
    } catch (_err) {
      // Ignore global sync failures in early boot contexts.
    }
    return value === true;
  }

  static _getSettingsApi() {
    return globalThis.game?.settings ?? null;
  }

  static _isSettingsReady() {
    const settings = this._getSettingsApi();
    return !!settings && typeof settings.get === "function" && typeof settings.set === "function";
  }

  static _hasRegisteredSetting(key) {
    const settings = this._getSettingsApi();
    if (!settings) return false;

    const fullKey = `${this.NS}.${key}`;

    try {
      if (settings.settings && typeof settings.settings.has === "function") {
        return settings.settings.has(fullKey);
      }
    } catch (_err) {
      // Ignore registry probing failures.
    }

    return false;
  }

  static _read(key) {
    const settings = this._getSettingsApi();

    if (!settings || typeof settings.get !== "function") {
      throw new Error("Settings not ready");
    }

    if (!this._hasRegisteredSetting(key)) {
      throw new Error(`Setting not registered: ${this.NS}.${key}`);
    }

    return settings.get(this.NS, key);
  }

  static getDefault(key, fallback = undefined) {
    return Object.prototype.hasOwnProperty.call(this.DEFAULTS, key)
      ? this.DEFAULTS[key]
      : fallback;
  }

  static getSafe(key, fallback = undefined) {
    const defaultValue = fallback !== undefined ? fallback : this.getDefault(key, null);

    // Early boot: settings API not available yet. Silent fallback.
    if (!this._isSettingsReady()) {
      if (key === "debugMode") this._syncDebugFlag(defaultValue === true);
      return defaultValue;
    }

    // Registered settings only. Silent fallback for missing keys to avoid boot spam.
    if (!this._hasRegisteredSetting(key)) {
      if (key === "debugMode") this._syncDebugFlag(defaultValue === true);
      return defaultValue;
    }

    try {
      const value = this._read(key);
      const resolved = value !== undefined && value !== null ? value : defaultValue;
      if (key === "debugMode") this._syncDebugFlag(resolved === true);
      return resolved;
    } catch (err) {
      // Silent fallback during runtime-safe reads; logger calls frequently and
      // should not recursively produce warning storms.
      if (key === "debugMode") this._syncDebugFlag(defaultValue === true);
      return defaultValue;
    }
  }

  static get(key) {
    const fallback = this.getDefault(key, undefined);
    if (fallback === undefined) {
      return this.getSafe(key, undefined);
    }
    if (typeof fallback === "boolean") return this.getBoolean(key, fallback);
    if (typeof fallback === "string") return this.getString(key, fallback);
    if (typeof fallback === "number") return this.getNumber(key, fallback);
    if (Array.isArray(fallback)) return this.getArray(key, fallback);
    if (typeof fallback === "object" && fallback !== null) return this.getObject(key, fallback);
    return this.getSafe(key, fallback);
  }

  static isEnabled(key) {
    return this.getBoolean(key, false);
  }

  static getString(key, fallback = "") {
    const value = this.getSafe(key, fallback);
    return value === undefined || value === null ? fallback : String(value);
  }

  static getArray(key, fallback = []) {
    const value = this.getSafe(key, fallback);
    return Array.isArray(value) ? value : fallback;
  }

  static getObject(key, fallback = {}) {
    const value = this.getSafe(key, fallback);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : fallback;
  }

  static getNumber(key, fallback = 0) {
    const value = this.getSafe(key, fallback);
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  static getBoolean(key, fallback = false) {
    const value = this.getSafe(key, fallback);
    const result = typeof value === "boolean" ? value : Boolean(value);
    if (key === "debugMode") this._syncDebugFlag(result);
    return result;
  }

  static async set(key, value, { emitHook = true } = {}) {
    const settings = this._getSettingsApi();

    if (!settings || typeof settings.set !== "function") {
      const err = new Error("Settings not ready");
      SWSELogger.error(`[HouseRuleService] Failed to set ${key}:`, err);
      throw err;
    }

    if (!this._hasRegisteredSetting(key)) {
      const err = new Error(`Setting not registered: ${this.NS}.${key}`);
      SWSELogger.error(`[HouseRuleService] Failed to set ${key}:`, err);
      throw err;
    }

    try {
      await settings.set(this.NS, key, value);
      if (key === "debugMode") this._syncDebugFlag(value === true);

      if (emitHook) {
        Hooks.callAll("swse:setting-changed", key, value);
        if (Object.prototype.hasOwnProperty.call(this.DEFAULTS, key)) {
          Hooks.callAll("swse:houserule-changed", key, value);
        }
      }

      return true;
    } catch (err) {
      SWSELogger.error(`[HouseRuleService] Failed to set ${key}:`, err);
      throw err;
    }
  }

  static getAll() {
    const rules = {};
    for (const key of Object.keys(this.DEFAULTS)) {
      rules[key] = this.get(key);
    }
    return rules;
  }

  static validate() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRules: 0,
      validRules: 0,
      errors: [],
      warnings: []
    };

    report.totalRules = Object.keys(this.DEFAULTS).length;

    for (const key of Object.keys(this.DEFAULTS)) {
      try {
        const value = this.get(key);
        if (value !== undefined) report.validRules++;
        else report.errors.push(`Rule "${key}" returned undefined`);
      } catch (err) {
        report.errors.push(`Rule "${key}" threw error: ${err.message}`);
      }
    }

    return report;
  }

  static _hookDirectAccess() {
    const settings = this._getSettingsApi();
    if (!settings || typeof settings.get !== "function" || typeof settings.set !== "function") {
      return;
    }

    const originalGet = settings.get;
    const originalSet = settings.set;

    settings.get = function(namespace, key) {
      if (namespace === "foundryvtt-swse") {
        const stack = new Error().stack || "";
        if (!stack.includes("HouseRuleService.")) {
          SWSELogger.warn(
            `[GOVERNANCE] Direct game.settings.get("foundryvtt-swse", "${key}") detected outside HouseRuleService.`,
            stack
          );
        }
      }
      return originalGet.call(this, namespace, key);
    };

    settings.set = async function(namespace, key, value) {
      if (namespace === "foundryvtt-swse") {
        const stack = new Error().stack || "";
        if (!stack.includes("HouseRuleService.")) {
          SWSELogger.warn(
            `[GOVERNANCE] Direct game.settings.set("foundryvtt-swse", "${key}") detected outside HouseRuleService.`,
            stack
          );
        }
      }
      return originalSet.call(this, namespace, key, value);
    };
  }
}

try {
  globalThis.HouseRuleService = HouseRuleService;
} catch (_err) {
  // Ignore global export failures in restricted contexts.
}