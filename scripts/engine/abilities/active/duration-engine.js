/**
 * DurationEngine — Active Effect Duration Tracking
 *
 * Pure in-memory registry for tracking active ability effects and their duration.
 * No mutations, no actor updates—just state inspection and tracking.
 *
 * Entry point: DurationEngine.trackEffect() after activation
 * Lifecycle: DurationEngine.expireRound() called at round end
 */

export class DurationEngine {
  // Map: `${actor.id}:${abilityId}` → { abilityId, actor, endRound, endTurn }
  static #activeEffects = new Map();

  /**
   * Track an active effect duration.
   * @param {Actor} actor
   * @param {string} abilityId
   * @param {number} durationRounds - 0 = instant, 1 = 1 round, etc.
   * @param {number} currentRound - Current round (from combat)
   * @param {number} currentTurn - Current turn in round (0-based)
   */
  static trackEffect(actor, abilityId, durationRounds = 1, currentRound = 0, currentTurn = 0) {
    if (!actor || !abilityId) return;

    const key = `${actor.id}:${abilityId}`;
    const endRound = currentRound + durationRounds;

    this.#activeEffects.set(key, {
      abilityId,
      actorId: actor.id,
      startRound: currentRound,
      endRound,
      durationRounds
    });
  }

  /**
   * Check if ability effect is currently active.
   * @param {Actor} actor
   * @param {string} abilityId
   * @returns {boolean}
   */
  static isEffectActive(actor, abilityId) {
    const key = `${actor.id}:${abilityId}`;
    return this.#activeEffects.has(key);
  }

  /**
   * Get remaining rounds for active effect.
   * @param {Actor} actor
   * @param {string} abilityId
   * @param {number} currentRound
   * @returns {number} Remaining rounds (0+ = active, -1 = expired)
   */
  static getRemainingRounds(actor, abilityId, currentRound = 0) {
    const key = `${actor.id}:${abilityId}`;
    const effect = this.#activeEffects.get(key);
    if (!effect) return -1;
    return Math.max(0, effect.endRound - currentRound);
  }

  /**
   * Get all active effects for actor.
   * @param {Actor} actor
   * @returns {Array} Active effect records
   */
  static getActiveEffects(actor) {
    const prefix = `${actor.id}:`;
    return Array.from(this.#activeEffects.values()).filter(e => e.actorId === actor.id);
  }

  /**
   * Remove expired effects at end of round.
   * Called by combat system at round advancement.
   * @param {number} currentRound
   */
  static expireRound(currentRound) {
    const expired = [];
    for (const [key, effect] of this.#activeEffects.entries()) {
      if (currentRound >= effect.endRound) {
        expired.push(key);
      }
    }
    expired.forEach(key => this.#activeEffects.delete(key));
  }

  /**
   * Clear all effects (combat end or reset).
   */
  static clear() {
    this.#activeEffects.clear();
  }

  /**
   * Remove specific effect.
   * @param {Actor} actor
   * @param {string} abilityId
   */
  static expireEffect(actor, abilityId) {
    const key = `${actor.id}:${abilityId}`;
    this.#activeEffects.delete(key);
  }
}
