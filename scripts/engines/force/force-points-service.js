/**
 * ForcePointsService - Authoritative Force Point rules engine
 *
 * Stateless service responsible for:
 * - Force Point max calculation
 * - Heroic level scaling
 * - Death rescue eligibility
 * - Spend validation
 *
 * Does NOT perform:
 * - Mutations (that's ActorEngine)
 * - Dice rolling (that's RollCore)
 * - Chat messages (that's renderers)
 */

export class ForcePointsService {

  /**
   * Calculate maximum Force Points for an actor
   * Authoritative formula, replaces legacy band-based calculation
   *
   * @param {Actor} actor - The actor to calculate for
   * @returns {number} Max Force Points
   */
  static getMax(actor) {
    const heroicLevel = actor.system?.level?.heroic ?? 0;

    // No heroic levels = no Force Points
    if (heroicLevel === 0) {
      return 0;
    }

    // Check for daily Force Points setting override
    const useDailyForcePoints = game.settings?.get('foundryvtt-swse', 'dailyForcePoints') || false;

    if (useDailyForcePoints) {
      // Daily FP mode: band-based (1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP)
      if (heroicLevel >= 16) return 4;
      if (heroicLevel >= 11) return 3;
      if (heroicLevel >= 6) return 2;
      return 1;
    } else {
      // Standard mode: progressive (5 + floor(level/2))
      return 5 + Math.floor(heroicLevel / 2);
    }
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
   * Based on heroic level: 1d6 (default), 2d6 (level 8+), 3d6 (level 15+)
   * Returns highest die only
   *
   * @param {Actor} actor - The actor
   * @returns {Object} { diceCount: number, dieSize: string }
   */
  static getScalingDice(actor) {
    const heroicLevel = actor.system?.level?.heroic ?? 0;

    let diceCount = 1;
    if (heroicLevel >= 15) {
      diceCount = 3;
    } else if (heroicLevel >= 8) {
      diceCount = 2;
    }

    return {
      diceCount,
      dieSize: this.getDieSize(actor)
    };
  }

  /**
   * Get die size for Force Point rolls (d6 or d8)
   * d6 is default, d8 granted by certain prestige classes/features
   *
   * @param {Actor} actor - The actor
   * @returns {string} Die size ('d6' or 'd8')
   */
  static getDieSize(actor) {
    // Check if actor has Force Point die upgrade (via prestige class or feature)
    // For now, default to d6; d8 upgrades would be stored in actor.system.forcePoints.dieSize
    return actor.system?.forcePoints?.dieSize || 'd6';
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
   * @param {boolean} damageContext.alreadyRescued - Whether already rescued this resolution
   * @returns {boolean} Whether rescue is available
   */
  static canRescue(actor, damageContext = {}) {
    const { damage = 0, hp = actor.system?.hp?.value, threshold = 15, alreadyRescued = false } = damageContext;

    // Already rescued once this resolution
    if (alreadyRescued) {
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
   * @param {Actor} actor - The actor
   * @returns {string} Display formula
   */
  static getFormulaDisplay(actor) {
    const { diceCount, dieSize } = this.getScalingDice(actor);
    if (diceCount === 1) {
      return `1${dieSize}`;
    }
    return `${diceCount}${dieSize} (take highest)`;
  }

}
