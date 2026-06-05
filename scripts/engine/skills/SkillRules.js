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

  // -------------------------------------------------------------------------
  // Athletics Consolidation Helpers
  // When athleticsConsolidation is on, Acrobatics + Climb + Jump + Swim
  // are merged into a single "Athletics" skill.
  // -------------------------------------------------------------------------

  /** Keys of the four skills that collapse into Athletics. */
  static get ATHLETICS_COMPONENT_KEYS() {
    return ['acrobatics', 'climb', 'jump', 'swim'];
  }

  /** Display names of the component skills. */
  static get ATHLETICS_COMPONENT_NAMES() {
    return ['Acrobatics', 'Climb', 'Jump', 'Swim'];
  }

  /** Canonical key for the consolidated skill. */
  static get ATHLETICS_KEY() { return 'athletics'; }

  /** Display name for the consolidated skill. */
  static get ATHLETICS_NAME() { return 'Athletics'; }

  /**
   * Return true if a skill key or name is one of the 4 component skills.
   */
  static isAthleticsComponent(keyOrName) {
    const norm = String(keyOrName ?? '').toLowerCase().replace(/\s+/g, '');
    return this.ATHLETICS_COMPONENT_KEYS.includes(norm)
      || this.ATHLETICS_COMPONENT_NAMES.map(n => n.toLowerCase()).includes(norm);
  }

  /**
   * Normalize a skill key: maps any component key to 'athletics' when enabled.
   */
  static normalizeSkillKey(key) {
    if (!this.athleticsConsolidationEnabled()) return key;
    return this.ATHLETICS_COMPONENT_KEYS.includes(String(key ?? '').toLowerCase())
      ? this.ATHLETICS_KEY : key;
  }

  /**
   * Normalize a skill name: maps component names to 'Athletics' when enabled.
   */
  static normalizeSkillName(name) {
    if (!this.athleticsConsolidationEnabled()) return name;
    const norm = String(name ?? '').toLowerCase().trim();
    return this.ATHLETICS_COMPONENT_NAMES.map(n => n.toLowerCase()).includes(norm)
      ? this.ATHLETICS_NAME : name;
  }

  /**
   * Filter a skill-list array: remove the 4 components and insert Athletics when enabled.
   * Accepts arrays of { key, name, ability, ... } objects.
   */
  static filterSkillList(skills) {
    if (!this.athleticsConsolidationEnabled()) return skills;
    const filtered = (skills || []).filter(s => !this.ATHLETICS_COMPONENT_KEYS.includes(String(s?.key ?? '').toLowerCase()));
    if (!filtered.some(s => s?.key === this.ATHLETICS_KEY)) {
      filtered.push({ key: this.ATHLETICS_KEY, name: this.ATHLETICS_NAME, ability: 'dex', trained: false });
    }
    return filtered;
  }

  /**
   * Compute the consolidated Athletics total from an actor's skill data.
   * Returns the highest total among the 4 component skills.
   */
  static computeAthleticsTotal(actor) {
    const skills = actor?.system?.skills ?? {};
    const vals = this.ATHLETICS_COMPONENT_KEYS.map(k => Number(skills[k]?.total ?? skills[k]?.value ?? 0));
    return Math.max(...vals, 0);
  }

  /** Athletics is trained if any component is trained. */
  static computeAthleticsTraining(actor) {
    const skills = actor?.system?.skills ?? {};
    return this.ATHLETICS_COMPONENT_KEYS.some(k => skills[k]?.trained === true);
  }

  /** Athletics is a class skill if any component is a class skill. */
  static computeAthleticsClassSkill(actor) {
    const skills = actor?.system?.skills ?? {};
    return this.ATHLETICS_COMPONENT_KEYS.some(k => skills[k]?.classSkill === true);
  }

  /** Sum misc mods across components for the consolidated display. */
  static computeAthleticsMiscMod(actor) {
    const skills = actor?.system?.skills ?? {};
    return this.ATHLETICS_COMPONENT_KEYS.reduce((sum, k) => sum + (Number(skills[k]?.miscMod) || 0), 0);
  }

  /**
   * Ranked Skills System Rules (NEW - Groundwork)
   */

  static getSkillProgressionMode() {
    return HouseRuleService.getString('skillProgressionMode', 'swse_standard');
  }

  static getSkillRankClassSkillPolicy() {
    return HouseRuleService.getString('skillRankClassSkillPolicy', 'current_class_plus_backgrounds');
  }

  static getPrestigeClassSkillPolicy() {
    return HouseRuleService.getString('prestigeClassSkillPolicy', 'inherit_entry_tree_class');
  }

  static isHalfLevelSkillBonusEnabled() {
    return !HouseRuleService.getBoolean('disableHalfLevelSkillBonus', false);
  }
}
