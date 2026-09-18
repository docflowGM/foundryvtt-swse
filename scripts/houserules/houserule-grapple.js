/**
 * Grapple House Rule Mechanics
 * Handles grapple combat actions and checks
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { CombatRules } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatRules.js";

const NS = 'foundryvtt-swse';

export class GrappleMechanics {
  static initialize() {
    SWSELogger.debug('Grapple mechanics initialized');
  }

  /**
   * Get grapple DC for a target
   * @param {Actor} target - The target to grapple
   * @returns {number} - The DC to beat
   */
  static getGrappleDC(target) {
    const grappleVariant = CombatRules.getGrappleVariant();
    const dcBonus = CombatRules.getGrappleDCBonus();

    if (!target) {return 10;}

    let baseDC = 10;
    const targetBAB = target.system?.attributes?.bab?.value || 0;
    baseDC += targetBAB * dcBonus;

    return baseDC;
  }

  /**
   * Check if grapple is available for an actor
   * @param {Actor} actor - The grappling character
   * @returns {boolean}
   */
  static canGrapple(actor) {
    return CombatRules.grappleEnabled() && actor && !actor.isToken;
  }

  /**
   * Perform a grapple check
   * @param {Actor} grappler - The attacker
   * @param {Actor} target - The target
   * @returns {Promise<Object>} - Result object with success/failure
   */
  static async performGrappleCheck(grappler, target) {
    if (!this.canGrapple(grappler)) {
      return { success: false, message: 'Grapple is not enabled' };
    }

    const variant = CombatRules.getGrappleVariant();
    const grappleDC = this.getGrappleDC(target);

    // Canonical authority: system.derived.grappleBonus (BAB + best of STR/DEX
    // + size + species, computed by derived-calculator.js). This previously
    // reimplemented BAB + STR-only, omitting size modifier and species
    // bonus and hardcoding STR even for a DEX-based grappler -- see
    // docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain.
    // The old formula is kept only as a last-resort fallback for an actor
    // whose derived data hasn't been computed yet.
    const derivedGrapple = Number(grappler.system?.derived?.grappleBonus);
    const grappleBonus = Number.isFinite(derivedGrapple)
      ? derivedGrapple
      : (grappler.system?.attributes?.bab?.value || 0) +
        (grappler.system?.attributes?.str?.mod || 0);
    const roll = await RollEngine.safeRoll(`1d20 + ${grappleBonus}`);
    if (!roll) {
      return { success: false, message: 'Grapple check roll failed' };
    }

    const total = roll.total;
    const success = total >= grappleDC;

    return {
      success,
      roll,
      total,
      dc: grappleDC,
      grappler,
      target,
      variant
    };
  }
}
