/**
 * Milestone Computer - Phase 2B
 *
 * Computes next-level milestones for forecasting.
 * Used by BuildIntent to provide visibility into upcoming grants.
 *
 * Computes:
 * - nextLevelMilestones (system-wide)
 * - nextLevelMilestonesByClass[classId] (per-class)
 */

import {
  GENERAL_FEAT_LEVELS,
  CLASS_BONUS_FEAT_LEVELS,
  isGeneralFeatLevel,
  doesClassGrantBonusFeatAtLevel
} from "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js";
import { ProgressionEngineV2 } from "/systems/foundryvtt-swse/scripts/engine/progression/ProgressionEngineV2.js";
import { TalentCadenceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-cadence-engine.js";
import { AttributeIncreaseHandler } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/attribute-increase-handler.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MilestoneComputer {
  /**
   * Compute next-level milestones for an actor
   * @param {Object} actor - Actor document
   * @returns {Object} { nextLevelMilestones, nextLevelMilestonesByClass }
   */
  static computeNextLevelMilestones(actor) {
    if (!actor) {
      return { nextLevelMilestones: {}, nextLevelMilestonesByClass: new Map() };
    }

    const currentLevel = actor.system?.level || 0;
    const nextTotalLevel = currentLevel + 1;

    // Compute heroic level (sum of non-nonheroic classes)
    const currentHeroicLevel = AttributeIncreaseHandler._getHeroicLevel(actor);
    const nextHeroicLevel = currentHeroicLevel + 1;

    // ─────────────────────────────────────────────────────────────────
    // SYSTEM-WIDE MILESTONES (based on total level)
    // ─────────────────────────────────────────────────────────────────

    const nextLevelMilestones = {
      nextHeroicLevel,
      nextTotalLevel,
      nextLevelGrantsGeneralFeat: isGeneralFeatLevel(nextTotalLevel),
      nextLevelGrantsGeneralTalent: this._getNextLevelGrantsGeneralTalent(actor, nextTotalLevel),
      nextAttributeIncreaseLevel: null,
      nextAttributePoints: null,
      nextAttributeIncreaseImminent: false,
      talentTreesAtNextLevel: [] // Will compute below
    };

    // Check if next level qualifies for attribute increase
    if (AttributeIncreaseHandler.qualifiesForIncrease(nextTotalLevel)) {
      const pointsForNextHeroicLevel = nextHeroicLevel > currentHeroicLevel ? 2 : 1;
      nextLevelMilestones.nextAttributeIncreaseLevel = nextTotalLevel;
      nextLevelMilestones.nextAttributePoints = pointsForNextHeroicLevel;
      nextLevelMilestones.nextAttributeIncreaseImminent = true;
    }

    // Compute talent trees at next level (if applicable)
    if (nextLevelMilestones.nextLevelGrantsGeneralTalent) {
      try {
        const talentAcquisitions = ProgressionEngineV2.getTalentAcquisition?.(
          actor,
          currentLevel,
          nextTotalLevel
        ) || [];
        nextLevelMilestones.talentTreesAtNextLevel = talentAcquisitions
          .map(ta => ta.id)
          .filter(id => !!id);
      } catch (err) {
        SWSELogger.warn(
          "[MilestoneComputer] Failed to compute talent trees at next level:",
          err
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // PER-CLASS MILESTONES (based on individual class levels)
    // ─────────────────────────────────────────────────────────────────

    const nextLevelMilestonesByClass = new Map();
    const classes = actor.system?.classes || [];

    for (const classDoc of classes) {
      const classId = classDoc._id || classDoc.id;
      if (!classId) continue;

      const className = classDoc.name || classDoc.system?.classId || "";
      const currentClassLevel = classDoc.levels || 0;
      const nextClassLevel = currentClassLevel + 1;

      // Check if class is prestige (prestige classes don't grant bonus feats)
      const isPrestigeClass = classDoc.system?.prestige || false;

      const classMilestones = {
        classId,
        className,
        currentClassLevel,
        nextClassLevel,
        candidateClassGrantsBonusFeatNextLevel: doesClassGrantBonusFeatAtLevel(
          nextClassLevel,
          isPrestigeClass
        ),
        candidateClassBonusFeatDomain: classId, // Feats are scoped to class
        candidateClassGrantsTalentNextLevel: this._getClassGrantsTalentAtLevel(
          classDoc,
          nextClassLevel
        ),
        candidateClassGrantsTalentDomain: classDoc.system?.talent_trees || [],
        classPrestigeLevelPath: [] // Optional: for prestige tracking
      };

      nextLevelMilestonesByClass.set(classId, classMilestones);
    }

    SWSELogger.log(
      `[MilestoneComputer] Computed milestones for ${actor.name}: ` +
        `level ${currentLevel}→${nextTotalLevel}, ` +
        `heroic ${currentHeroicLevel}→${nextHeroicLevel}`
    );

    return { nextLevelMilestones, nextLevelMilestonesByClass };
  }

  /**
   * Check if next total level grants general talent
   * PHASE 10+: General talents granted at 1st level and every odd heroic level (3, 5, 7, ...)
   * Per SWSE RAW: Talents acquired based on heroic-level cadence, not total level
   * @private
   */
  static _getNextLevelGrantsGeneralTalent(actor, nextTotalLevel) {
    // Calculate next heroic level to determine talent cadence
    const currentHeroicLevel = AttributeIncreaseHandler._getHeroicLevel(actor);
    const nextHeroicLevel = currentHeroicLevel + 1;

    // Talents at 1st level and every odd heroic level (3, 5, 7, 9, 11, 13, 15, 17, 19)
    return (nextHeroicLevel === 1) || (nextHeroicLevel >= 3 && nextHeroicLevel % 2 === 1);
  }

  /**
   * Check if a class grants a talent at a specific class level
   * PHASE 2 FIX: Now uses TalentCadenceEngine as canonical source
   * @private
   */
  static _getClassGrantsTalentAtLevel(classDoc, classLevel) {
    if (!classDoc) return false;

    const className = classDoc.name || classDoc.system?.classId || "";
    const isNonheroic = classDoc.system?.isNonheroic ?? false;

    // PHASE 2 FIX: Use TalentCadenceEngine instead of ProgressionEngineV2
    // This respects house rules like talentEveryLevel
    const grantsClassTalent = TalentCadenceEngine.grantsClassTalent(classLevel, isNonheroic);

    SWSELogger.debug(
      `[MilestoneComputer] Checking class talent grant for ${className} at level ${classLevel}: ${grantsClassTalent}`
    );

    return grantsClassTalent;
  }
}

export default MilestoneComputer;
