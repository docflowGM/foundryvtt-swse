/**
 * Combat Core & Threshold Rules Adapter
 *
 * Canonical access point for Combat Core / Threshold / Death-system family rules.
 * All combat family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3H MIGRATION: Combat Core / Threshold family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class CombatRules {
  /**
   * Core Combat Rules
   */

  static getCriticalHitVariant() {
    return HouseRuleService.getString('criticalHitVariant', 'standard');
  }

  static getDiagonalMovement() {
    return HouseRuleService.getString('diagonalMovement', 'swse');
  }

  static getWeaponRangeMultiplier() {
    return HouseRuleService.getNumber('weaponRangeMultiplier', 1);
  }

  static getWeaponRangeReduction() {
    return HouseRuleService.getNumber('weaponRangeReduction', 0);
  }

  /**
   * Second Wind Rules
   */

  static secondWindImprovedEnabled() {
    return HouseRuleService.getBoolean('secondWindImproved', false);
  }

  static getSecondWindRecovery() {
    return HouseRuleService.getNumber('secondWindRecovery', 0);
  }

  static secondWindWebEnhancementEnabled() {
    return HouseRuleService.getBoolean('secondWindWebEnhancement', false);
  }

  /**
   * Grapple Rules
   */

  static grappleEnabled() {
    return HouseRuleService.getBoolean('grappleEnabled', false);
  }

  static getGrappleVariant() {
    return HouseRuleService.getString('grappleVariant', 'standard');
  }

  static getGrappleDCBonus() {
    return HouseRuleService.getNumber('grappleDCBonus', 0);
  }

  /**
   * Flanking Rules
   */

  static flankingEnabled() {
    return HouseRuleService.getBoolean('flankingEnabled', false);
  }

  static getFlankingBonus() {
    return HouseRuleService.getNumber('flankingBonus', 2);
  }

  static flankingRequiresConsciousnessEnabled() {
    return HouseRuleService.getBoolean('flankingRequiresConsciousness', true);
  }

  static flankingLargeCreaturesEnabled() {
    return HouseRuleService.getBoolean('flankingLargeCreatures', false);
  }

  static flankingDiagonalCountsEnabled() {
    return HouseRuleService.getBoolean('flankingDiagonalCounts', true);
  }

  /**
   * Death / Threshold / Massive Damage Rules
   */

  static getDeathSystem() {
    return HouseRuleService.getString('deathSystem', 'standard');
  }

  static getDeathSaveDC() {
    return HouseRuleService.getNumber('deathSaveDC', 10);
  }

  static enhancedMassiveDamageEnabled() {
    return HouseRuleService.getBoolean('enableEnhancedMassiveDamage', false);
  }

  static persistentDTPenaltyEnabled() {
    return HouseRuleService.getBoolean('persistentDTPenalty', false);
  }

  static getPersistentDTPenaltyCap() {
    return HouseRuleService.getNumber('persistentDTPenaltyCap', 0);
  }

  static doubleThresholdPenaltyEnabled() {
    return HouseRuleService.getBoolean('doubleThresholdPenalty', false);
  }

  static stunThresholdRuleEnabled() {
    return HouseRuleService.getBoolean('stunThresholdRule', false);
  }

  static eliminateInstantDeathEnabled() {
    return HouseRuleService.getBoolean('eliminateInstantDeath', false);
  }

  static modifyDamageThresholdFormulaEnabled() {
    return HouseRuleService.getBoolean('modifyDamageThresholdFormula', false);
  }

  static getDamageThresholdFormulaType() {
    return HouseRuleService.getString('damageThresholdFormulaType', 'standard');
  }

  /**
   * Combat Automation Rules
   */

  static getSpaceInitiativeSystem() {
    return HouseRuleService.getString('spaceInitiativeSystem', 'standard');
  }

  static resetResourcesOnCombatEnabled() {
    return HouseRuleService.getBoolean('resetResourcesOnCombat', false);
  }

  /**
   * Glancing Hit Rules
   */

  static glancingHitEnabled() {
    return HouseRuleService.getBoolean('enableGlancingHit', false);
  }
}
