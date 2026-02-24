/**
 * ForcePointsService - Authoritative Force Point rules engine
 *
 * UNIFIED ARCHITECTURE LOCK-IN:
 * - Die size authority: ModifierEngine (domain: "force.dieSize")
 * - Dice count authority: Heroic level scaling (1/2/3 dice)
 * - Max FP authority: Base (5/6/7) + floor(totalLevel / 2)
 * - Death rescue authority: DamageResolutionEngine
 * - Mutation authority: ActorEngine (sole)
 *
 * Stateless service responsible for:
 * - Force Point max calculation (prestige-aware)
 * - Heroic level scaling (dice count)
 * - Death rescue eligibility (with alreadyRescued guard)
 * - Spend validation
 *
 * Does NOT perform:
 * - Mutations (that's ActorEngine)
 * - Dice rolling (that's RollCore)
 * - Chat messages (that's renderers)
 */

import { getTotalLevel } from '../../actors/derived/level-split.js';
import { ModifierEngine } from '../effects/modifiers/ModifierEngine.js';

export class ForcePointsService {

  /**
   * Calculate maximum Force Points for an actor
   * AUTHORITATIVE FORMULA: base + floor(totalLevel / 2)
   *
   * Base determination:
   * - Base 5: No prestige classes
   * - Base 6: Any prestige class (except Shaper)
   * - Base 7: Force Disciple, Jedi Master, or Sith Lord
   *
   * @param {Actor} actor - The actor to calculate for
   * @returns {number} Max Force Points
   */
  static getMax(actor) {
    if (!actor) return 0;

    // Get total character level (heroic + nonheroic)
    const totalLevel = getTotalLevel(actor);

    // No levels = no Force Points
    if (totalLevel === 0) {
      return 0;
    }

    // Determine Force Point base (5, 6, or 7)
    const base = this._getForcePointBase(actor);

    // Check for daily Force Points setting override
    const useDailyForcePoints = game.settings?.get('foundryvtt-swse', 'dailyForcePoints') || false;

    if (useDailyForcePoints) {
      // Daily FP mode: band-based (1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP)
      // Note: Uses total level even in daily mode
      if (totalLevel >= 16) return 4;
      if (totalLevel >= 11) return 3;
      if (totalLevel >= 6) return 2;
      return 1;
    } else {
      // Standard mode: base + floor(totalLevel / 2)
      return base + Math.floor(totalLevel / 2);
    }
  }

  /**
   * Determine Force Point base (5, 6, or 7)
   *
   * Rules:
   * - Base 5: Standard heroic characters
   * - Base 6: Characters with prestige classes (except Shaper)
   * - Base 7: Force Disciple, Jedi Master, or Sith Lord
   * - Once unlocked, never downgrades (persistent via flags)
   *
   * @private
   * @param {Actor} actor - The actor
   * @returns {number} Base (5, 6, or 7)
   */
  static _getForcePointBase(actor) {
    if (!actor) return 5;

    // Check persistent flags (once unlocked, never downgrades)
    const hasBase7 = actor.getFlag?.('swse', 'hasBase7FP');
    if (hasBase7) return 7;

    const hasBase6 = actor.getFlag?.('swse', 'hasPrestigeFPBonus');
    if (hasBase6) return 6;

    // Check current classes for prestige markers
    const classItems = actor.items?.filter?.(i => i.type === 'class') || [];
    if (!Array.isArray(classItems) || classItems.length === 0) return 5;

    let highestBase = 5;

    for (const classItem of classItems) {
      if (!classItem) continue;

      // Try ClassesDB first
      try {
        const ClassesDB = globalThis.SWSE?.ClassesDB;
        if (ClassesDB?.fromItem) {
          const classDef = ClassesDB.fromItem(classItem);
          if (classDef) {
            if (classDef.forcePointBase === 7) {
              highestBase = 7;
            } else if (!classDef.baseClass && classDef.grantsForcePoints !== false) {
              highestBase = Math.max(highestBase, 6);
            }
            continue;
          }
        }
      } catch (err) {
        // Fall through to item data check
      }

      // Fallback to item system data
      const isPrestige = classItem.system?.base_class === false;
      const grantsForcePoints = classItem.system?.grants_force_points !== false;
      const forcePointBase = classItem.system?.force_point_base;

      if (forcePointBase === 7) {
        highestBase = 7;
      } else if (isPrestige && grantsForcePoints) {
        highestBase = Math.max(highestBase, 6);
      }
    }

    return highestBase;
  }

  /**
   * Get remaining Force Points for an actor
   *
   * @param {Actor} actor - The actor
   * @returns {number} Current Force Points remaining
   */
  static getRemaining(actor) {
    return actor.system?.forcePoints?.value ?? 0;
  }

  /**
   * Check if actor has Force Points available to spend
   *
   * @param {Actor} actor - The actor to check
   * @param {number} pointsToSpend - How many to spend (default 1)
   * @returns {boolean} Whether actor can spend
   */
  static canSpend(actor, pointsToSpend = 1) {
    return this.getRemaining(actor) >= pointsToSpend;
  }

  /**
   * Get Force Point scaling dice configuration for an actor
   *
   * AUTHORITY: Heroic level scaling only
   * - Dice count: 1d (level 1-7), 2d (level 8-14), 3d (level 15+)
   * - Die size: From ModifierEngine (force.dieSize)
   *
   * Usage: player rolls N dice, takes highest result
   *
   * @async
   * @param {Actor} actor - The actor
   * @returns {Promise<Object>} { diceCount: number, dieSize: string }
   */
  static async getScalingDice(actor) {
    if (!actor) return { diceCount: 1, dieSize: 'd6' };

    // Get heroic level for dice count scaling
    const heroicLevel = actor.system?.level?.heroic ?? 0;

    let diceCount = 1;
    if (heroicLevel >= 15) {
      diceCount = 3;
    } else if (heroicLevel >= 8) {
      diceCount = 2;
    }

    // Get die size from ModifierEngine
    const dieSize = await this.getDieSize(actor);

    return { diceCount, dieSize };
  }

  /**
   * Get die size for Force Point rolls (d6 or d8)
   *
   * AUTHORITY: ModifierEngine (domain: "force.dieSize")
   * - Default: d6 (value 6)
   * - Upgraded by: Strong in the Force feat or other sources
   *
   * @async
   * @param {Actor} actor - The actor
   * @returns {Promise<string>} Die size ('d6' or 'd8')
   */
  static async getDieSize(actor) {
    if (!actor) return 'd6';

    try {
      // Query ModifierEngine for die size upgrades
      const dieSizeModifier = await ModifierEngine.aggregateTarget(actor, 'force.dieSize');

      // dieSizeModifier represents the die value (6 or 8)
      // Default is 6, upgraded to 8 by feats/talents
      if (dieSizeModifier >= 8) {
        return 'd8';
      }
    } catch (err) {
      // Fall through to default
    }

    return 'd6';
  }

  /**
   * Check if actor is eligible for death rescue via Force Point
   *
   * Death rescue eligibility requires:
   * - HP at or below 0
   * - Damage >= damage threshold
   * - Actor has Force Points remaining
   * - Not already rescued in this damage resolution
   *
   * @param {Actor} actor - The actor to check
   * @param {Object} damageContext - Context about the damage event
   * @param {number} damageContext.damage - Total damage taken
   * @param {number} damageContext.hp - Current HP after damage
   * @param {number} damageContext.threshold - Damage threshold for death
   * @param {boolean} damageContext.alreadyRescued - Whether already rescued this resolution (deprecated, use flag)
   * @returns {boolean} Whether rescue is available
   */
  static canRescue(actor, damageContext = {}) {
    if (!actor) return false;

    const { damage = 0, hp = actor.system?.hp?.value, threshold = 15 } = damageContext;

    // Check if already rescued this resolution (via flag)
    const alreadyRescuedFlag = actor.getFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution') || false;
    if (alreadyRescuedFlag) {
      return false;
    }

    // Must be at death threshold (HP <= 0 AND damage >= threshold)
    if (hp > 0 || damage < threshold) {
      return false;
    }

    // Must have Force Points
    if (!this.canSpend(actor, 1)) {
      return false;
    }

    return true;
  }

  /**
   * Validate Force Point spend attempt
   * Returns detailed validation result
   *
   * @param {Actor} actor - The actor attempting to spend
   * @param {Object} context - Spend context
   * @param {string} context.reason - Reason for spend (skill, attack, rescue, etc.)
   * @param {number} context.amount - Amount to spend (default 1)
   * @returns {Object} { valid: boolean, message: string, allowance: number }
   */
  static validateSpend(actor, context = {}) {
    const { reason = 'unknown', amount = 1 } = context;

    // Check actor exists
    if (!actor) {
      return {
        valid: false,
        message: 'No actor provided',
        allowance: 0
      };
    }

    // Check sufficient Force Points
    const remaining = this.getRemaining(actor);
    if (remaining < amount) {
      return {
        valid: false,
        message: `Insufficient Force Points: have ${remaining}, need ${amount}`,
        allowance: remaining
      };
    }

    // Check not prevented from spending (e.g., by condition or effect)
    if (this._isSpendingPrevented(actor)) {
      return {
        valid: false,
        message: 'Force Point spending is prevented',
        allowance: 0
      };
    }

    return {
      valid: true,
      message: `Can spend ${amount} FP for ${reason}`,
      allowance: amount
    };
  }

  /**
   * Check if actor is prevented from spending Force Points
   * E.g., by stun, freeze, or other disabling condition
   *
   * @private
   * @param {Actor} actor - The actor to check
   * @returns {boolean} Whether spending is prevented
   */
  static _isSpendingPrevented(actor) {
    // Check condition track: if stunned, staggered, or helpless, cannot spend
    const conditionCurrent = actor.system?.conditionTrack?.current ?? 0;
    if (conditionCurrent >= 3) { // 3=helpless, 4+=worse
      return true;
    }

    // Check active effects that prevent spending
    // (placeholder for future effect system integration)
    return false;
  }

  /**
   * Get Force Point bonus formula for display/logging
   * E.g., "1d6", "2d6 (highest)", "3d8 (highest)"
   *
   * @async
   * @param {Actor} actor - The actor
   * @returns {Promise<string>} Display formula
   */
  static async getFormulaDisplay(actor) {
    if (!actor) return '1d6';

    const { diceCount, dieSize } = await this.getScalingDice(actor);
    if (diceCount === 1) {
      return `1${dieSize}`;
    }
    return `${diceCount}${dieSize} (take highest)`;
  }

}
