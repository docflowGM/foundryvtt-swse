/**
 * House Rule Service — SINGLE SOURCE OF TRUTH
 *
 * All house rule access flows through this service.
 * No engine, sheet, or calculator may call game.settings.get() directly.
 * This ensures:
 * - Single entry point for auditing
 * - Consistent fallbacks
 * - Type safety
 * - Governance enforcement
 */

import { SettingsHelper } from '../../utils/settings-helper.js';
import { SWSELogger } from '../../utils/logger.js';

export class HouseRuleService {
  static NS = 'foundryvtt-swse';

  /**
   * Get a house rule value.
   * CANONICAL ACCESS POINT — All engines must use this.
   *
   * @param {string} key - Rule key (e.g., 'secondWindRecovery')
   * @returns {*} Rule value with safe default
   */
  static get(key) {
    return SettingsHelper.get(key);
  }

  /**
   * Check if a boolean rule is enabled.
   * @param {string} key - Rule key
   * @returns {boolean}
   */
  static isEnabled(key) {
    return SettingsHelper.getBoolean(key, false);
  }

  /**
   * Get a string rule value.
   * @param {string} key - Rule key
   * @param {string} fallback - Default if not set
   * @returns {string}
   */
  static getString(key, fallback = '') {
    return SettingsHelper.getString(key, fallback);
  }

  /**
   * Get a numeric rule value.
   * @param {string} key - Rule key
   * @param {number} fallback - Default if not set
   * @returns {number}
   */
  static getNumber(key, fallback = 0) {
    return SettingsHelper.getNumber(key, fallback);
  }

  /**
   * Set a house rule value (admin only).
   * @param {string} key - Rule key
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    if (!game.user.isGM) {
      SWSELogger.warn(
        `[HouseRuleService] Non-GM ${game.user.name} attempted to set house rule "${key}"`
      );
      return;
    }

    try {
      await game.settings.set(this.NS, key, value);
      SWSELogger.info(`[HouseRuleService] Updated ${key} = ${value}`);
      Hooks.callAll('swse:houserule-changed', key, value);
    } catch (err) {
      SWSELogger.error(`[HouseRuleService] Failed to set ${key}:`, err);
      throw err;
    }
  }

  /**
   * Get all house rule values (snapshot).
   * @returns {object} Complete rules object
   */
  static getAll() {
    const rules = {};
    const defaults = SettingsHelper.DEFAULTS;

    for (const key in defaults) {
      rules[key] = HouseRuleService.get(key);
    }

    return rules;
  }

  /**
   * Validate all house rules are correctly registered.
   * Called at system startup.
   *
   * @returns {object} Validation report
   */
  static validate() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRules: 0,
      validRules: 0,
      errors: [],
      warnings: []
    };

    const defaults = SettingsHelper.DEFAULTS;
    report.totalRules = Object.keys(defaults).length;

    for (const key in defaults) {
      try {
        const value = HouseRuleService.get(key);
        if (value !== undefined) {
          report.validRules++;
        } else {
          report.errors.push(`Rule "${key}" returned undefined`);
        }
      } catch (err) {
        report.errors.push(`Rule "${key}" threw error: ${err.message}`);
      }
    }

    if (report.errors.length === 0) {
      SWSELogger.info(
        `[HouseRuleService] ✓ All ${report.validRules}/${report.totalRules} rules validated`
      );
    } else {
      SWSELogger.error(
        `[HouseRuleService] ✗ Validation failed with ${report.errors.length} errors`
      );
    }

    return report;
  }

  /**
   * GOVERNANCE ENFORCEMENT
   * Hook to detect any direct game.settings.get("foundryvtt-swse", ...) calls
   * This should only be called from HouseRuleService
   */
  static _hookDirectAccess() {
    const originalGet = game.settings.get;
    game.settings.get = function (namespace, key) {
      if (namespace === 'foundryvtt-swse') {
        const stack = new Error().stack;
        if (!stack.includes('HouseRuleService.get')) {
          SWSELogger.warn(
            `[GOVERNANCE] Direct game.settings.get("foundryvtt-swse", "${key}") detected outside HouseRuleService. This violates SSOT governance.`,
            stack
          );
        }
      }
      return originalGet.call(this, namespace, key);
    };
  }
}

/**
 * ARCHITECTURAL RULES (enforced by this service):
 *
 * 1. SSOT: All house rule reads go through HouseRuleService.get()
 * 2. No direct game.settings.get() in engines, sheets, or calculators
 * 3. Each rule belongs to ONE domain engine
 * 4. Domain engine owns all behavior for that rule
 * 5. ModifierEngine respects house rule decisions
 * 6. ActorEngine applies house rule changes safely
 * 7. UI (datapad) only reads + sets, never implements logic
 * 8. No dual calculation paths
 * 9. No sheet-side logic branches
 * 10. All mutations go through ActorEngine
 */
