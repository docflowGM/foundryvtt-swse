/**
 * EncumbranceFinalizer — Phase G
 * Speed adjustment, initiative integration, Reflex Dex removal, run multiplier
 */

export class EncumbranceFinalizer {
  /**
   * Apply encumbrance speed adjustment
   */
  static applySpeedAdjustment(actor) {
    const enc = actor.system.encumbrance || {};
    const derived = actor.system.derived || {};
    const baseSpeed = actor.system.movement?.base || 6;

    let speedMultiplier = 1.0;
    if (enc.state === 'light') speedMultiplier = 0.75;
    if (enc.state === 'moderate') speedMultiplier = 0.5;
    if (enc.state === 'heavy') speedMultiplier = 0.25;

    const adjustedSpeed = Math.floor(baseSpeed * speedMultiplier);

    // Store in derived for combat reference
    derived.movement = derived.movement || {};
    derived.movement.adjustedSpeed = adjustedSpeed;
    derived.movement.speedMultiplier = speedMultiplier;
    derived.movement.encumbranceState = enc.state;

    return {
      baseSpeed,
      encumbranceState: enc.state,
      multiplier: speedMultiplier,
      adjustedSpeed
    };
  }

  /**
   * Calculate run distance (SWSE: Run = Speed × 4)
   * With encumbrance multiplier applied
   */
  static calculateRunDistance(actor) {
    const adjustment = this.applySpeedAdjustment(actor);
    return adjustment.adjustedSpeed * 4;
  }

  /**
   * Check if Reflex loses DEX bonus (encumbrance >= moderate)
   */
  static losesRefflexDEX(actor) {
    const enc = actor.system.encumbrance || {};
    return enc.state === 'moderate' || enc.state === 'heavy';
  }

  /**
   * Get encumbrance penalty for initiative
   */
  static getInitiativePenalty(actor) {
    const enc = actor.system.encumbrance || {};
    if (enc.state === 'light') return -1;
    if (enc.state === 'moderate') return -3;
    if (enc.state === 'heavy') return -5;
    return 0;
  }

  /**
   * Full encumbrance profile (for derived data)
   */
  static computeFullEncumbranceProfile(actor) {
    const speed = this.applySpeedAdjustment(actor);
    const refflexDEXLoss = this.losesRefflexDEX(actor);
    const initiativePenalty = this.getInitiativePenalty(actor);
    const runDistance = this.calculateRunDistance(actor);

    return {
      speed,
      refflexDEXLoss,
      initiativePenalty,
      runDistance
    };
  }
}
