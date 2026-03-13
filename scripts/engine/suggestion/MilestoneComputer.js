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
   * General talents are tied to specific class cadences
   * For now, returns unknown (TODO: implement general talent cadence if it exists)
   * @private
   */
  static _getNextLevelGrantsGeneralTalent(actor, nextTotalLevel) {
    // Currently unknown - general talent cadence is class-based
    // Would need additional system rule to determine system-wide cadence
    return false; // Conservative: assume no general talent at next level
  }

  /**
   * Check if a class grants a talent at a specific class level
   * Uses ProgressionEngineV2.talentCadenceByClass lookup
   * @private
   */
  static _getClassGrantsTalentAtLevel(classDoc, classLevel) {
    if (!classDoc) return false;

    const className = classDoc.name || classDoc.system?.classId || "";

    // Try to look up in ProgressionEngineV2 talent cadence
    try {
      const talentCadenceByClass = ProgressionEngineV2.talentCadenceByClass || {};
      const cadence = talentCadenceByClass[className];

      if (Array.isArray(cadence)) {
        return cadence.includes(classLevel);
      }
    } catch (err) {
      SWSELogger.debug(
        `[MilestoneComputer] Could not determine talent cadence for ${className}`,
        err
      );
    }

    return false;
  }
}

export default MilestoneComputer;
