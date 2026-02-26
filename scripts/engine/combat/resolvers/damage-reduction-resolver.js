/**
 * DamageReductionResolver — Pure DR (Damage Reduction) Application
 *
 * Responsibility:
 * - Extract DR from actor (ModifierEngine domain: "damageReduction")
 * - Apply highest valid DR only (no stacking)
 * - Handle bypass rules (lightsabers, special weapons)
 * - Return structured result
 *
 * Contract:
 * - Pure: No side effects, no mutations
 * - Stateless: All data passed as parameters
 * - Returns: { damageBefore, damageAfter, drApplied, drSource, bypassed }
 *
 * RAW Rules:
 * - Highest source applies only (no stacking)
 * - Lightsabers ignore DR
 * - Other energy weapons may bypass DR based on source
 * - DR applied after SR, before Temp HP
 */

export class DamageReductionResolver {
  /**
   * Apply damage reduction mitigation.
   *
   * @param {number} damage - Incoming damage (after SR)
   * @param {Actor} actor - Target actor (read-only, for DR lookup)
   * @param {Object} context - Context object
   * @param {Item} context.weapon - Attacking weapon (for bypass checks)
   * @param {string} context.damageType - Damage type (energy, kinetic, etc.)
   * @returns {{
   *   damageBefore: number,
   *   damageAfter: number,
   *   drApplied: number,
   *   drSource: string,
   *   bypassed: boolean,
   *   mitigated: boolean
   * }}
   */
  static resolve({ damage, actor, context = {} }) {
    if (!actor || typeof damage !== 'number' || damage < 0) {
      return this._emptyResult(damage);
    }

    // ========================================
    // CHECK BYPASS RULES
    // ========================================

    const weapon = context.weapon;
    if (this._shouldBypassDR(weapon)) {
      return {
        damageBefore: damage,
        damageAfter: damage,
        drApplied: 0,
        drSource: 'Lightsaber/Bypass',
        bypassed: true,
        mitigated: false
      };
    }

    // ========================================
    // EXTRACT DR (highest source only)
    // ========================================

    let drValue = 0;
    let drSource = '';

    // DR can come from:
    // 1. Actor armor/suit (via ModifierEngine domain "damageReduction")
    // 2. Vehicle hull/plating (system.damageReduction)
    // 3. Talents or effects

    // For now, check actor-level DR field (vehicles)
    const actorDR = actor.system.damageReduction ?? 0;
    if (actorDR > drValue) {
      drValue = actorDR;
      drSource = `Vehicle Armor (${drValue})`;
    }

    // TODO: Integrate ModifierEngine domain "damageReduction" for characters

    if (drValue <= 0) {
      return this._emptyResult(damage);
    }

    // ========================================
    // APPLY DR
    // ========================================

    const damageAfter = Math.max(0, damage - drValue);
    const drApplied = damage - damageAfter;

    return {
      damageBefore: damage,
      damageAfter: damageAfter,
      drApplied: drApplied,
      drSource: drSource,
      bypassed: false,
      mitigated: drApplied > 0
    };
  }

  /**
   * Check if weapon bypasses DR (lightsabers, etc.)
   * @private
   */
  static _shouldBypassDR(weapon) {
    if (!weapon) return false;

    const name = (weapon.name || '').toLowerCase();
    const type = (weapon.system?.weaponType || '').toLowerCase();

    // Lightsabers bypass DR
    if (name.includes('lightsaber') || type.includes('lightsaber')) {
      return true;
    }

    // Check for explicit bypass flag
    if (weapon.system?.bypassDR === true) {
      return true;
    }

    return false;
  }

  /**
   * Empty result (no DR available)
   * @private
   */
  static _emptyResult(damage) {
    return {
      damageBefore: damage,
      damageAfter: damage,
      drApplied: 0,
      drSource: '',
      bypassed: false,
      mitigated: false
    };
  }

  /**
   * Get actor's current DR (for informational use)
   *
   * @param {Actor} actor
   * @returns {number} Current DR (0 if none)
   */
  static getCurrentDR(actor) {
    if (!actor) return 0;
    return actor.system.damageReduction ?? 0;
  }
}
