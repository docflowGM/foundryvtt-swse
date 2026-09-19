/**
 * Grapple House Rule Mechanics
 * Handles grapple combat actions and checks
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { CombatRules } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatRules.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { resolveGrappleBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";

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
    // BAB authority is system.derived.bab (SchemaAdapters.getBAB()), not
    // system.attributes.bab -- the latter isn't a field this schema
    // populates, so this always read 0. See
    // docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain.
    const targetBAB = SchemaAdapters.getBAB(target);
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
    // fell back to BAB + STR-only when derived data was unavailable --
    // omitting size modifier and species bonus and hardcoding STR even for
    // a DEX-based grappler -- which the Math Integrity Freeze charter
    // explicitly forbids maintaining as a second, known-wrong formula (see
    // docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain).
    // The fallback now calls combat-stat-rules.js#resolveGrappleBonus(),
    // the SAME formula derived-calculator.js uses, packaged as an
    // independently-callable resolver, instead of a second reimplementation.
    const derivedGrapple = Number(grappler.system?.derived?.grappleBonus);
    const grappleBonus = Number.isFinite(derivedGrapple)
      ? derivedGrapple
      : resolveGrappleBonus(grappler);
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
