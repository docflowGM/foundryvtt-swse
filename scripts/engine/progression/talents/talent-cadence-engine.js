/**
 * Talent Cadence Engine
 *
 * SINGLE AUTHORITATIVE SOURCE for the talent progression POLICY.
 * Used by chargen step applicability, the level-up entitlement manifest,
 * reconciliation and the talent step.
 *
 * Two policies, one engine (selected by the `talentWiki` house rule):
 *
 * - CANONICAL (default, `talentWiki` OFF) — Core Rulebook pp. 15, 37-39, 54-55:
 *   ordinary talents come ONLY from the progression table of the class being
 *   advanced (`level_progression[].features[].type === 'talent_choice'` in the
 *   class data, which stays the RAW authority). There is no independent
 *   heroic/general talent lane. A class-granted talent is chosen from the
 *   granting class's talent trees (plus Force talent trees for a Force-sensitive
 *   character, Core p. 100).
 *
 * - TALENT WIKI (`talentWiki` ON) — the progression previously implemented here,
 *   preserved unchanged: class-table talents PLUS a heroic talent at every odd
 *   character level (every level with `talentEveryLevel`), the heroic talent
 *   chosen from any tree unlocked by the actor's classes.
 *
 * `talentEveryLevel` / `talentEveryLevelExtraL1` modify the heroic lane cadence,
 * so they are only effective under Talent Wiki. Their composition with canonical
 * progression is an open rules question (RECON-005); until ruled they fail closed
 * (no award) while Talent Wiki is off.
 */

import { FeatRulesAdapter } from "/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js";

export const TALENT_PROGRESSION_MODES = Object.freeze({
  CANONICAL: 'canonical',
  TALENT_WIKI: 'talentWiki',
});

export class TalentCadenceEngine {
  /**
   * Effective talent progression house rules.
   * CANONICAL: Only place to read talent house rules (routed through FeatRulesAdapter).
   * `talentEveryLevel` is reported as effective (false unless Talent Wiki is on);
   * `talentEveryLevelConfigured` is the raw setting, for diagnostics only.
   * @returns {{talentWiki: boolean, talentEveryLevel: boolean, talentEveryLevelExtraL1: boolean, talentEveryLevelConfigured: boolean}}
   */
  static getHouseRuleSettings() {
    const talentWiki = FeatRulesAdapter.talentWikiEnabled() === true;
    const talentEveryLevelConfigured = FeatRulesAdapter.talentEveryLevelEnabled() === true;
    return {
      talentWiki,
      talentEveryLevel: talentWiki && talentEveryLevelConfigured,
      talentEveryLevelExtraL1: FeatRulesAdapter.talentExtraAtLevel1(),
      talentEveryLevelConfigured,
    };
  }

  /** @returns {'canonical'|'talentWiki'} the active talent progression policy */
  static getProgressionMode() {
    return this.getHouseRuleSettings().talentWiki
      ? TALENT_PROGRESSION_MODES.TALENT_WIKI
      : TALENT_PROGRESSION_MODES.CANONICAL;
  }

  /** True only under Talent Wiki: the heroic (general) talent lane exists. */
  static heroicTalentLaneEnabled() {
    return this.getHouseRuleSettings().talentWiki;
  }

  /**
   * Canonical policy: a class-granted talent may also be spent on a Force talent tree
   * when the character is Force-sensitive (Core p. 100). Under Talent Wiki the class
   * slot keeps its previous pool and Force-sensitive access flows through the heroic lane.
   */
  static classSlotForceTreeAccessForForceSensitive() {
    return !this.getHouseRuleSettings().talentWiki;
  }

  /**
   * Does reaching this absolute character level grant a heroic-lane talent?
   *
   * Canonical: never (no independent heroic talent lane).
   * Talent Wiki: odd levels (1, 3, 5, ...), or every level with `talentEveryLevel`.
   *
   * @param {number} level - Absolute level (must be >= 1)
   * @returns {boolean}
   */
  static grantsHeroicTalent(level) {
    if (!level || level < 1) return false;
    const settings = this.getHouseRuleSettings();
    if (!settings.talentWiki) return false;
    if (settings.talentEveryLevel) return true;
    return level % 2 === 1;
  }

  /**
   * Approximate class talent cadence at a class level, for consumers that do not hold
   * the class model (suggestion milestones). The class data `talent_choice` rows are
   * the authority for actual awards; this mirrors the core-class odd-level table.
   *
   * Odd class levels; every class level with `talentEveryLevel` (Talent Wiki only).
   * Nonheroic classes do not grant talents.
   *
   * @param {number} classLevel - Class level (must be >= 1)
   * @param {boolean} isNonheroic
   * @returns {number} 0 or 1
   */
  static grantsClassTalent(classLevel, isNonheroic = false) {
    if (isNonheroic || !classLevel || classLevel < 1) return 0;
    if (this.getHouseRuleSettings().talentEveryLevel) return 1;
    return (classLevel % 2 === 1) ? 1 : 0;
  }

  /**
   * Total heroic-lane + class-cadence grants at a level (approximation; see grantsClassTalent).
   * @returns {{heroic: 0|1, class: 0|1, total: number}}
   */
  static calculateTalentGrants(heroicLevel, selectedClass = null, classLevel = 0) {
    const heroic = this.grantsHeroicTalent(heroicLevel) ? 1 : 0;
    const classIsNonheroic = selectedClass?.system?.isNonheroic ?? false;
    const classTalent = this.grantsClassTalent((classLevel || 0) + 1, classIsNonheroic);
    return { heroic, class: classTalent, total: heroic + classTalent };
  }

  /**
   * Talent count for L1 chargen slot calculation (TalentSlotCalculator).
   * 1, or 2 under Talent Wiki + `talentEveryLevel` + `talentEveryLevelExtraL1`.
   * @returns {number}
   */
  static calculateL1TalentCount() {
    const settings = this.getHouseRuleSettings();
    if (!settings.talentEveryLevel) return 1;
    return settings.talentEveryLevelExtraL1 ? 2 : 1;
  }

  /** @returns {number} 1 or 2 (L1-only display/validation helper) */
  static calculateChargenTalentsRequired() {
    return this.calculateL1TalentCount();
  }

  /** @returns {string} human-readable description of the active talent progression */
  static getDescription() {
    const settings = this.getHouseRuleSettings();
    if (!settings.talentWiki) {
      return 'Canonical: talents from the advancing class\'s progression table (class levels 1, 3, 5, ... for core classes)';
    }
    let desc = 'Talent Wiki: class talents plus a heroic talent at odd levels (1, 3, 5, 7, ...)';
    if (settings.talentEveryLevel) {
      desc = 'Talent Wiki: class talents plus a heroic talent at every level (1, 2, 3, 4, ...)';
      if (settings.talentEveryLevelExtraL1) desc += ' + extra at level 1';
    }
    return desc;
  }
}

export default TalentCadenceEngine;
