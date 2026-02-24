import { ModifierEngine } from "../effects/modifiers/ModifierEngine.js";
import { ThresholdEngine } from "./threshold-engine.js";
import { DamageMitigationManager } from "./damage-mitigation-manager.js";

/**
 * DamageResolutionEngine — Unified damage orchestration
 *
 * Responsibility:
 * - Pure damage calculation (no mutation)
 * - Bonus HP resolution (derived-only via ModifierEngine)
 * - HP reduction (RAW order: Bonus → HP → DT check)
 * - Damage Threshold evaluation
 * - Condition track impact
 * - Death/Destroy/Force rescue determination
 *
 * Contract:
 * - Returns calculation result only
 * - Does NOT mutate actor
 * - Does NOT write to system
 * - All mutations delegated to ActorEngine
 * - Does NOT create Active Effects (caller does)
 *
 * Data Model (V2 Canonical):
 * - HP: system.hp.value (current), system.hp.max (max)
 * - Condition: system.conditionTrack.current (0-5 numeric)
 * - Defenses: system.defenses.fortitude.total
 * - Size: system.size (string) → mapped to bonus
 */
export class DamageResolutionEngine {

  /**
   * Size threshold bonus mapping (RAW + house rules)
   * Maps size string to DT bonus value
   * @private
   */
  static #sizeThresholdMap = {
    fine: -10,
    diminutive: -5,
    tiny: 0,
    small: 0,
    medium: 0,
    large: 5,
    huge: 10,
    gargantuan: 20,
    colossal: 50
  };

  /**
   * Resolve damage application.
   *
   * Pure calculation pipeline (V2 Locked Order):
   * 1. Collect Bonus HP (ModifierEngine domain, highest only)
   * 2. Apply DamageMitigationManager: SR → DR → Temp HP → HP
   * 3. Check Damage Threshold (uses mitigated damage)
   * 4. Calculate condition track impact
   * 5. Determine death/destroy eligibility
   * 6. Return complete resolution state with mitigation breakdown
   *
   * @param {Object} params
   * @param {Actor} params.actor - Target actor (read-only)
   * @param {number} params.damage - Total damage amount
   * @param {string} [params.damageType="normal"] - Damage type (normal, fire, etc.)
   * @param {Actor} [params.source=null] - Attacking actor (for context)
   * @param {Object} [params.options={}] - Additional context
   * @returns {Promise<Object>} Resolution result
   *
   * Result structure:
   * {
   *   // Before state
   *   hpBefore: number,
   *   bonusHpBefore: number,
   *   conditionBefore: number,
   *   thresholdTotal: number,
   *
   *   // After state
   *   hpAfter: number,
   *   bonusHpAfter: number,
   *   damageToHP: number,
   *
   *   // Threshold check
   *   thresholdExceeded: boolean,
   *   thresholdBreakdown: Array,
   *
   *   // State changes
   *   conditionDelta: number,
   *   conditionAfter: number,
   *
   *   // Special states
   *   unconscious: boolean,
   *   dead: boolean,
   *   destroyed: boolean,
   *   forceRescueEligible: boolean
   * }
   */
  static async resolveDamage({ actor, damage, damageType = "normal", source = null, options = {} }) {

    if (!actor) {
      throw new Error('DamageResolutionEngine.resolveDamage: actor required');
    }

    // Clear rescue flag at start of each damage resolution
    // This allows each resolution to have its own rescue attempt
    await actor.unsetFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution');

    if (typeof damage !== 'number' || damage < 0) {
      throw new Error(`DamageResolutionEngine.resolveDamage: invalid damage amount: ${damage}`);
    }

    const system = actor.system;
    const result = {
      // Before state
      hpBefore: system.hp?.value ?? 0,
      bonusHpBefore: 0,
      conditionBefore: system.conditionTrack?.current ?? 0,
      thresholdTotal: 0,

      // After state
      hpAfter: 0,
      bonusHpAfter: 0,
      damageToHP: 0,

      // Threshold check
      thresholdExceeded: false,
      thresholdBreakdown: [],

      // State changes
      conditionDelta: 0,
      conditionAfter: 0,

      // Special states
      unconscious: false,
      dead: false,
      destroyed: false,
      forceRescueEligible: false
    };

    /* ===================================================================
       PHASE 1: BONUS HP (ModifierEngine domain, derived-only)
       ================================================================= */

    let remainingDamage = damage;

    try {
      const bonusMods = await ModifierEngine.collectModifiers(actor, {
        domain: "bonusHitPoints",
        context: options
      });

      // RAW: Only highest source applies
      if (bonusMods.length > 0) {
        result.bonusHpBefore = Math.max(...bonusMods.map(m => m.value));

        if (result.bonusHpBefore > 0) {
          const bonusAfter = Math.max(0, result.bonusHpBefore - damage);
          result.bonusHpAfter = bonusAfter;
          remainingDamage = Math.max(0, damage - result.bonusHpBefore);
        }
      }
    } catch (err) {
      // ModifierEngine error; continue with no bonus HP
      console.warn('DamageResolutionEngine: bonus HP collection failed', err);
    }

    /* ===================================================================
       PHASE 2: DAMAGE MITIGATION (V2 Locked Order)
       SR → DR → Temp HP → HP
       ================================================================= */

    let mitigationResult = {};
    try {
      mitigationResult = DamageMitigationManager.resolve({
        damage: remainingDamage,
        actor,
        damageType,
        weapon: options.weapon || null
      });

      // Validation (debug only)
      const issues = DamageMitigationManager.validate(mitigationResult);
      if (issues.length > 0) {
        console.warn('DamageResolutionEngine: Mitigation validation issues:', issues);
      }
    } catch (err) {
      console.warn('DamageResolutionEngine: DamageMitigationManager failed:', err);
      // Fallback: use raw damage (no mitigation)
      mitigationResult = {
        originalDamage: remainingDamage,
        afterShield: remainingDamage,
        afterDR: remainingDamage,
        afterTempHP: remainingDamage,
        hpDamage: remainingDamage,
        shield: { applied: 0, degraded: 0, remaining: 0, source: 'Error' },
        damageReduction: { applied: 0, source: '', bypassed: false },
        tempHP: { absorbed: 0, before: 0, after: 0 },
        breakdown: []
      };
    }

    // Apply mitigated damage to HP
    const maxHP = system.hp?.max ?? 100;
    result.damageToHP = mitigationResult.hpDamage;
    result.hpAfter = Math.max(0, result.hpBefore - mitigationResult.hpDamage);

    // Store mitigation details in result
    result.mitigation = {
      originalDamage: mitigationResult.originalDamage,
      shield: mitigationResult.shield,
      damageReduction: mitigationResult.damageReduction,
      tempHP: mitigationResult.tempHP,
      breakdown: mitigationResult.breakdown
    };

    /* ===================================================================
       PHASE 3: DAMAGE THRESHOLD CHECK
       ================================================================= */

    try {
      const thresholdData = await ThresholdEngine.getDamageThreshold(actor, {
        damageType,
        source
      });

      result.thresholdTotal = thresholdData.total;
      result.thresholdBreakdown = thresholdData.breakdown;

      // Threshold exceeded if raw damage >= total threshold
      if (damage >= thresholdData.total) {
        result.thresholdExceeded = true;
      }
    } catch (err) {
      console.warn('DamageResolutionEngine: threshold calculation failed', err);
    }

    /* ===================================================================
       PHASE 4: CONDITION TRACK IMPACT
       ================================================================= */

    result.conditionAfter = result.conditionBefore;

    // Threshold exceeded with HP remaining: -1 step
    if (result.thresholdExceeded && result.hpAfter > 0) {
      result.conditionDelta = -1;
      result.conditionAfter = Math.min(5, result.conditionBefore - 1);
    }

    /* ===================================================================
       PHASE 5: ZERO HP LOGIC
       ================================================================= */

    if (result.hpAfter <= 0) {
      result.unconscious = true;
      result.conditionDelta = -5;
      result.conditionAfter = 5; // Helpless

      // Death or Destroy depends on threshold and actor type
      if (result.thresholdExceeded) {
        result.forceRescueEligible = true;

        if (actor.type === "character") {
          result.dead = true;
        }

        if (actor.type === "droid" || actor.type === "vehicle") {
          result.destroyed = true;
        }
      }
    }

    return result;
  }
}
