/**
 * ShieldMitigationResolver — Pure SR (Shield Rating) Application
 *
 * Responsibility:
 * - Extract shield rating from actor (via derived layer)
 * - Apply SR to damage pool
 * - Handle SR degradation (if damage > SR, reduce SR by 5)
 * - Return structured result
 *
 * Contract:
 * - Pure: No side effects, no mutations
 * - Stateless: All data passed as parameters
 * - Returns: { damageBefore, damageAfter, srApplied, srDegraded, srRemaining }
 *
 * RAW Rules:
 * - SR reduces total damage
 * - If damage > SR, SR degrades by 5 (not below 0)
 * - SR never stacks (highest only)
 * - Lightsabers DO NOT ignore SR
 */

export class ShieldMitigationResolver {
  /**
   * Apply shield rating mitigation.
   *
   * @param {number} damage - Incoming damage (before SR)
   * @param {Actor} actor - Target actor (read-only, for SR lookup)
   * @param {Object} context - Mitigation context { weapon, damageType, etc. }
   * @returns {{
   *   damageBefore: number,
   *   damageAfter: number,
   *   srApplied: number,
   *   srDegraded: number,
   *   srRemaining: number,
   *   mitigated: boolean
   * }}
   */
  static resolve({ damage, actor, context = {} }) {
    if (!actor || typeof damage !== 'number' || damage < 0) {
      return this._emptyResult(damage);
    }

    const derived = actor.system.derived || {};
    const shield = derived.shield || {};

    // Current SR from derived layer (highest source, already resolved)
    const srCurrent = shield.current ?? 0;

    if (srCurrent <= 0) {
      return this._emptyResult(damage);
    }

    // ========================================
    // APPLY SR TO DAMAGE
    // ========================================

    let damageAfter = Math.max(0, damage - srCurrent);
    const damageAbsorbed = damage - damageAfter;

    // ========================================
    // SR DEGRADATION (if damage > SR)
    // ========================================

    let srDegraded = 0;
    let srRemaining = srCurrent;

    if (damage > srCurrent) {
      srDegraded = 5; // RAW: degradation is 5 SR per hit exceeding SR
      srRemaining = Math.max(0, srCurrent - srDegraded);
    }

    return {
      damageBefore: damage,
      damageAfter: damageAfter,
      srApplied: damageAbsorbed,
      srDegraded: srDegraded,
      srRemaining: srRemaining,
      mitigated: damageAbsorbed > 0
    };
  }

  /**
   * Empty result (no SR available)
   * @private
   */
  static _emptyResult(damage) {
    return {
      damageBefore: damage,
      damageAfter: damage,
      srApplied: 0,
      srDegraded: 0,
      srRemaining: 0,
      mitigated: false
    };
  }

  /**
   * Get actor's current SR (for informational use only)
   * Does not trigger degradation.
   *
   * @param {Actor} actor
   * @returns {number} Current SR (0 if none)
   */
  static getCurrentSR(actor) {
    if (!actor) return 0;
    const derived = actor.system.derived || {};
    const shield = derived.shield || {};
    return shield.current ?? 0;
  }

  /**
   * Get actor's max SR (from item definitions)
   *
   * @param {Actor} actor
   * @returns {number} Max SR (0 if none)
   */
  static getMaxSR(actor) {
    if (!actor) return 0;
    const derived = actor.system.derived || {};
    const shield = derived.shield || {};
    return shield.max ?? 0;
  }

  /**
   * Get SR source (label for UI)
   *
   * @param {Actor} actor
   * @returns {string} e.g., "Energy Shield (Rating 10)"
   */
  static getSRSource(actor) {
    if (!actor) return '';
    const derived = actor.system.derived || {};
    const shield = derived.shield || {};
    return shield.source ?? '';
  }
}
