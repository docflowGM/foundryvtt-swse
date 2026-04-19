/**
 * Skill & Training Rules Adapter
 *
 * Canonical access point for skill and training house rules.
 * All skills/training family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3C MIGRATION: Third family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class SkillRules {
  /**
   * Skill Training System Rules
   */

  static skillTrainingEnabled() {
    return HouseRuleService.getBoolean('skillTrainingEnabled', false);
  }

  static getTrainingPointsPerLevel() {
    return HouseRuleService.getString('trainingPointsPerLevel', 'standard');
  }

  static getTrainingPointsPerRest() {
    return HouseRuleService.getNumber('trainingPointsPerRest', 0);
  }

  static getSkillTrainingCap() {
    return HouseRuleService.getString('skillTrainingCap', 'none');
  }

  static getTrainingCostScale() {
    return HouseRuleService.getString('trainingCostScale', 'linear');
  }

  static trainingRequiresTrainer() {
    return HouseRuleService.getBoolean('trainingRequiresTrainer', false);
  }

  /**
   * Cross-Class Training Rule
   */

  static crossClassSkillTrainingEnabled() {
    return HouseRuleService.getBoolean('crossClassSkillTraining', true);
  }

  /**
   * Skill Focus Rules — How skill focus bonus is calculated and applied
   */

  static getSkillFocusVariant() {
    return HouseRuleService.getString('skillFocusVariant', 'normal');
  }

  static getSkillFocusActivationLevel() {
    return HouseRuleService.getNumber('skillFocusActivationLevel', 1);
  }

  static getSkillFocusRestriction() {
    return HouseRuleService.getString('skillFocusRestriction', 'none');
  }

  /**
   * Skill Usage Rules
   */

  static getFeintSkill() {
    return HouseRuleService.getString('feintSkill', 'deception');
  }

  /**
   * Dead-Candidate Rules — Included for completeness, may have no current readers
   */

  static getKnowledgeSkillMode() {
    return HouseRuleService.getString('knowledgeSkillMode', 'standard');
  }

  static athleticsConsolidationEnabled() {
    return HouseRuleService.getBoolean('athleticsConsolidation', false);
  }
}
