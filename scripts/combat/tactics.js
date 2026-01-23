/**
 * Anticipate Enemy Strategy (SWSE Clone Wars Campaign Guide)
 *
 * A good tactician can anticipate their enemy's movements and strategies.
 * As a Move Action, characters Trained in Knowledge (Tactics) can designate
 * a target and make an opposed check to anticipate their next move.
 */

import { SWSELogger } from "../utils/logger.js";

export class TacticsAnticipation {
  /**
   * Anticipate an enemy's strategy
   * @param {Actor} tacticianActor - The character using tactics (must be trained in Knowledge Tactics)
   * @param {Actor} targetActor - The target to anticipate
   * @returns {Promise<Object>} - { success: boolean, anticipation: string, roll: Roll }
   */
  static async anticipateStrategy(tacticianActor, targetActor) {
    try {
      if (!tacticianActor || !targetActor) {
        throw new Error("Missing tactician or target actor");
      }

      // Check if tactician is trained in Knowledge (Tactics)
      const tacticsSkill = tacticianActor.system?.skills?.knowledge_tactics;
      if (!tacticsSkill?.trained) {
        return {
          success: false,
          anticipation: null,
          message: `${tacticianActor.name} must be trained in Knowledge (Tactics) to use this action`,
          error: true
        };
      }

      // Get DC: target's Will Defense or 10 + target's Character Level
      const targetWillDefense = targetActor.system?.defenses?.will?.total;
      const targetLevel = targetActor.system?.level || 1;
      const dc = targetWillDefense || (10 + targetLevel);

      // Roll Knowledge (Tactics)
      const tacticsBonus = tacticsSkill.total || 0;
      const rollFormula = `1d20 + ${tacticsBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const success = roll.total >= dc;

      if (!success) {
        return {
          success: false,
          anticipation: null,
          roll,
          dc,
          tacticianName: tacticianActor.name,
          targetName: targetActor.name,
          message: `${tacticianActor.name} fails to anticipate ${targetActor.name}'s strategy (rolled ${roll.total} vs DC ${dc})`
        };
      }

      // Success: Determine what type of information is gained
      const anticipation = this._generateAnticipation(targetActor, tacticianActor);

      return {
        success: true,
        anticipation,
        roll,
        dc,
        tacticianName: tacticianActor.name,
        targetName: targetActor.name,
        targetType: this._getTargetType(targetActor),
        message: `${tacticianActor.name} successfully anticipates ${targetActor.name}'s strategy!`
      };
    } catch (err) {
      SWSELogger.error("Anticipate strategy check failed", err);
      throw err;
    }
  }

  /**
   * Generate anticipation information about the target
   * @private
   */
  static _generateAnticipation(targetActor, tacticianActor) {
    const anticipation = {
      willAttack: true,
      primaryTargets: [],
      likelyActions: [],
      estimatedMovement: "",
      specialStrategies: []
    };

    // Analyze target's likely actions based on current HP, position, weapons
    const targetHP = targetActor.system?.hp?.value || 0;
    const targetMaxHP = targetActor.system?.hp?.max || 1;
    const hpPercent = (targetHP / targetMaxHP) * 100;

    // Determine likely actions based on health
    if (hpPercent <= 25) {
      anticipation.likelyActions.push("Likely to flee or use defensive tactics");
      anticipation.specialStrategies.push("May attempt withdrawal or defend");
    } else if (hpPercent <= 50) {
      anticipation.likelyActions.push("Likely to fight defensively or focus fire");
    } else {
      anticipation.likelyActions.push("Likely to continue aggressive tactics");
    }

    // Check for weapons - melee vs ranged
    const weapons = targetActor.items?.filter(i => i.type === "weapon") || [];
    const hasMelee = weapons.some(w => !w.system?.range || w.system?.range.toLowerCase().includes("melee"));
    const hasRanged = weapons.some(w => w.system?.range && w.system?.range.toLowerCase().includes("ranged"));

    if (hasMelee && hasRanged) {
      anticipation.likelyActions.push("Will choose weapon based on distance");
    } else if (hasMelee) {
      anticipation.likelyActions.push("Likely to move toward melee range");
      anticipation.estimatedMovement = "Will advance";
    } else if (hasRanged) {
      anticipation.likelyActions.push("Will maintain ranged distance");
      anticipation.estimatedMovement = "Will hold position or retreat";
    }

    // Check if target has allies nearby - might coordinate
    if (targetActor.system?.allies) {
      anticipation.specialStrategies.push("May coordinate with allies");
    }

    return anticipation;
  }

  /**
   * Determine target type (NPC, Vehicle, etc.)
   * @private
   */
  static _getTargetType(actor) {
    if (!actor) return "unknown";
    if (actor.type === "vehicle") return "vehicle";
    if (actor.type === "droid") return "droid";
    if (actor.type === "npc") return "npc";
    return "character";
  }

  /**
   * Store anticipation information on the tactician for reference
   * @param {Actor} tacticianActor - The tactician
   * @param {Actor} targetActor - The anticipated target
   * @param {Object} anticipation - The anticipation data
   */
  static async storeAnticipation(tacticianActor, targetActor, anticipation) {
    if (!tacticianActor) return;

    try {
      const anticipations = tacticianActor.getFlag("foundryvtt-swse", "anticipatedStrategies") || {};
      anticipations[targetActor.id] = {
        targetName: targetActor.name,
        data: anticipation,
        timestamp: new Date().toISOString()
      };
      await tacticianActor.setFlag("foundryvtt-swse", "anticipatedStrategies", anticipations);
    } catch (err) {
      SWSELogger.error("Failed to store anticipation", err);
    }
  }

  /**
   * Get stored anticipation for a target
   * @param {Actor} tacticianActor - The tactician
   * @param {string} targetId - The ID of the anticipated target
   * @returns {Object|null} - The stored anticipation or null
   */
  static getStoredAnticipation(tacticianActor, targetId) {
    if (!tacticianActor) return null;

    const anticipations = tacticianActor.getFlag("foundryvtt-swse", "anticipatedStrategies") || {};
    return anticipations[targetId] || null;
  }

  /**
   * Clear anticipations (useful when combat ends)
   * @param {Actor} tacticianActor - The tactician
   */
  static async clearAnticipations(tacticianActor) {
    if (!tacticianActor) return;

    try {
      await tacticianActor.unsetFlag("foundryvtt-swse", "anticipatedStrategies");
    } catch (err) {
      SWSELogger.error("Failed to clear anticipations", err);
    }
  }
}
