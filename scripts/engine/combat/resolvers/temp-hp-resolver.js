/**
 * TempHPResolver — Pure Temporary HP Application
 *
 * Responsibility:
 * - Extract Temp HP from actor
 * - Apply damage to Temp HP pool
 * - Return remaining damage + Temp HP delta
 * - Handle Temp HP degradation rules
 *
 * Contract:
 * - Pure: No side effects, no mutations
 * - Stateless: All data passed as parameters
 * - Returns: { damageBefore, damageAfter, tempAbsorbed, tempRemaining }
 *
 * RAW Rules:
 * - Temp HP applied after SR and DR
 * - Temp HP absorbs damage but doesn't prevent threshold checks
 * - Damage calculation: min(tempHP, remainingDamage)
 */

export class TempHPResolver {
  /**
   * Apply temporary HP mitigation.
   *
   * @param {number} damage - Incoming damage (after SR, DR, bonus HP)
   * @param {Actor} actor - Target actor (read-only)
   * @returns {{
   *   damageBefore: number,
   *   damageAfter: number,
   *   tempAbsorbed: number,
   *   tempBefore: number,
   *   tempAfter: number
   * }}
   */
  static resolve({ damage, actor }) {
    if (!actor || typeof damage !== 'number' || damage < 0) {
      return this._emptyResult(damage);
    }

    const hp = actor.system.hp || {};
    const tempBefore = hp.temp ?? 0;

    if (tempBefore <= 0) {
      return this._emptyResult(damage);
    }

    // ========================================
    // APPLY TEMP HP
    // ========================================

    const tempAbsorbed = Math.min(tempBefore, damage);
    const damageAfter = Math.max(0, damage - tempAbsorbed);
    const tempAfter = Math.max(0, tempBefore - tempAbsorbed);

    return {
      damageBefore: damage,
      damageAfter: damageAfter,
      tempAbsorbed: tempAbsorbed,
      tempBefore: tempBefore,
      tempAfter: tempAfter
    };
  }

  /**
   * Empty result (no Temp HP)
   * @private
   */
  static _emptyResult(damage) {
    return {
      damageBefore: damage,
      damageAfter: damage,
      tempAbsorbed: 0,
      tempBefore: 0,
      tempAfter: 0
    };
  }

  /**
   * Get actor's current Temp HP
   *
   * @param {Actor} actor
   * @returns {number}
   */
  static getCurrentTempHP(actor) {
    if (!actor) return 0;
    const hp = actor.system.hp || {};
    return hp.temp ?? 0;
  }
}
