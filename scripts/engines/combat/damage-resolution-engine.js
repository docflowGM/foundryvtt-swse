import { ModifierEngine } from "../effects/modifiers/ModifierEngine.js";
import { ThresholdEngine } from "./threshold-engine.js";

export class DamageResolutionEngine {

  /**
   * Unified damage resolution orchestration.
   *
   * Handles:
   * - Bonus HP application (highest source only)
   * - HP reduction
   * - Damage Threshold evaluation
   * - Condition track shifts
   * - Zero HP and death/destroy logic
   * - Force Point rescue eligibility
   *
   * @param {Object} params
   * @param {Actor} params.actor - Target actor
   * @param {number} params.damage - Damage amount
   * @param {string} params.damageType - Damage type (normal, fire, etc.)
   * @param {Actor} params.source - Attacking actor (optional)
   * @param {Object} params.options - Additional context
   * @returns {Promise<Object>} Complete resolution result
   */
  static async resolveDamage({ actor, damage, damageType = "normal", source = null, options = {} }) {

    const result = {
      hpBefore: actor.system.hp.value,
      bonusHpBefore: 0,
      hpAfter: 0,
      bonusHpAfter: 0,
      thresholdExceeded: false,
      conditionDelta: 0,
      unconscious: false,
      dead: false,
      destroyed: false,
      forcePointEligible: false
    };

    /* ===============================================
       BONUS HIT POINTS (ModifierEngine Domain)
       =============================================== */

    const bonusMods = await ModifierEngine.collectModifiers(actor, {
      domain: "bonusHitPoints",
      context: options
    });

    const highestBonus = bonusMods.length
      ? Math.max(...bonusMods.map(m => m.value))
      : 0;

    result.bonusHpBefore = highestBonus;

    let remainingDamage = damage;

    if (highestBonus > 0) {
      const bonusAfter = Math.max(0, highestBonus - damage);
      result.bonusHpAfter = bonusAfter;

      remainingDamage = Math.max(0, damage - highestBonus);
    }

    /* ===============================================
       APPLY DAMAGE TO HP
       =============================================== */

    const hpAfter = result.hpBefore - remainingDamage;
    result.hpAfter = Math.max(0, hpAfter);

    /* ===============================================
       DAMAGE THRESHOLD CHECK
       =============================================== */

    const thresholdData = await ThresholdEngine.getDamageThreshold(actor, {
      damageType,
      source
    });

    if (damage >= thresholdData.total) {
      result.thresholdExceeded = true;
    }

    /* ===============================================
       CONDITION TRACK IMPACT
       =============================================== */

    if (result.thresholdExceeded && result.hpAfter > 0) {
      result.conditionDelta = -1;
    }

    /* ===============================================
       ZERO HP LOGIC
       =============================================== */

    if (result.hpAfter <= 0) {

      result.conditionDelta = -5;
      result.unconscious = true;

      if (result.thresholdExceeded) {

        if (actor.type === "character") {
          result.dead = true;
          result.forcePointEligible = true;
        }

        if (actor.type === "droid" || actor.type === "vehicle") {
          result.destroyed = true;
          result.forcePointEligible = true;
        }
      }
    }

    return result;
  }
}
