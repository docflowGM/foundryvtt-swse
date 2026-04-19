/**
 * Character Generation Rules Adapter
 *
 * Canonical access point for character-generation-owned house rules.
 * All chargen family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * Handles:
 * - Ability score pool settings (droid vs living)
 * - Species restrictions
 * - Background feature availability
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ChargenRules {
  /**
   * Get droid point buy pool
   * @returns {number} Point buy pool for droid characters
   */
  static getDroidPointBuyPool() {
    return HouseRuleService.getNumber('droidPointBuyPool', 20);
  }

  /**
   * Get living point buy pool
   * @returns {number} Point buy pool for living characters
   */
  static getLivingPointBuyPool() {
    return HouseRuleService.getNumber('livingPointBuyPool', 25);
  }

  /**
   * Get banned species string
   * @returns {string} Comma-separated list of banned species keys
   */
  static getBannedSpecies() {
    return HouseRuleService.getString('bannedSpecies', '');
  }

  /**
   * Check if backgrounds are enabled in chargen
   * @returns {boolean} True if backgrounds feature is enabled
   */
  static backgroundsEnabled() {
    return HouseRuleService.getBoolean('enableBackgrounds', true);
  }
}
