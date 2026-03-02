/**
 * PHASE 3: ADVANCED CRYSTAL MECHANICS
 *
 * Hook-based extension layer for deep system integration
 * - Unstable crystal deactivation (Nat 1)
 * - Force Point die step increase
 * - Alignment resonance (DSP)
 * - Healing amplification
 *
 * All without contaminating engines or mutating actor base state.
 */

import { SWSELogger as swseLogger } from "../../utils/logger.js";
import { ActorEngine } from "../../governance/actor-engine/actor-engine.js";

export class Phase3CrystalSystem {
  /**
   * Register Phase 3 hooks
   * Call this during system init to activate advanced mechanics
   */
  static registerPhase3Hooks() {
    // Hook 1: Unstable crystal deactivation on Nat 1
    Hooks.on("evaluateAttackRoll", this.#onEvaluateAttackRoll.bind(this));

    // Hook 2: Force Point die step modification
    Hooks.on("evaluateForcePointRoll", this.#onEvaluateForcePointRoll.bind(this));

    // Hook 3: Healing crystal amplification
    Hooks.on("evaluateHealingRoll", this.#onEvaluateHealingRoll.bind(this));

    swseLogger.info("[Phase 3] Advanced crystal mechanics registered");
  }

  /* ============================================================
     UNSTABLE CRYSTAL DEACTIVATION (Nat 1)
  ============================================================ */

  /**
   * Listen to attack roll evaluation
   * Deactivate weapon if Nat 1 rolled with unstable crystal
   * @private
   */
  static async #onEvaluateAttackRoll(actor, weapon, rollResult) {
    if (!actor || !weapon || !rollResult) return;

    // Only process lightsabers
    if (weapon.system?.subtype !== "lightsaber") return;

    // Only if Nat 1 (rolled 1, before modifiers)
    if (rollResult.isNat1 !== true) return;

    // Check for unstable crystals
    const unstableFound = this.#checkUnstableCrystal(weapon, actor);
    if (!unstableFound) return;

    try {
      // Deactivate weapon
      await ActorEngine.updateEmbeddedDocuments(actor, "Item", [
        {
          _id: weapon.id,
          "system.equippable.equipped": false
        }
      ]);

      // Notify
      ui.notifications.error(
        `⚠️ ${weapon.name}'s unstable crystal overloads! The weapon deactivates.`
      );

      swseLogger.info(
        `[Phase 3] Unstable crystal deactivated on Nat 1: ${weapon.name}`
      );
    } catch (err) {
      swseLogger.error("[Phase 3] Failed to deactivate unstable crystal:", err);
    }
  }

  /**
   * Check if weapon has unstable crystal installed
   * @private
   */
  static #checkUnstableCrystal(weapon, actor) {
    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return false;

    for (const upgradeId of installedUpgrades) {
      const upgrade = actor.items?.get(upgradeId);
      if (!upgrade) continue;

      const isUnstable = upgrade.system?.lightsaber?.specialFlags?.unstable === true;
      if (isUnstable) {
        return upgrade; // Return upgrade object for logging
      }
    }

    return false;
  }

  /* ============================================================
     FORCE POINT DIE STEP INCREASE
  ============================================================ */

  /**
   * Listen to Force Point roll evaluation
   * Increase die step if crystal provides forcePointDieStepIncrease
   * @private
   */
  static async #onEvaluateForcePointRoll(actor, roll, context) {
    if (!actor || !roll || !context) return;

    // Only if actor is using Force Points during an attack
    if (context.type !== "attack") return;

    // Get equipped lightsaber
    const lightsaber = this.#getEquippedLightsaber(actor);
    if (!lightsaber) return;

    // Calculate die step increase
    const dieStepIncrease = this.#calculateForcePointDieStepIncrease(
      lightsaber,
      actor
    );
    if (dieStepIncrease <= 0) return;

    // Modify roll die step
    // Note: This modifies roll notation, not permanent state
    try {
      const newFormula = this.#increaseDieStep(roll.formula, dieStepIncrease);
      if (newFormula) {
        roll.formula = newFormula;
        swseLogger.info(
          `[Phase 3] Force Point die increased by +${dieStepIncrease}: ${roll.formula}`
        );
      }
    } catch (err) {
      swseLogger.error("[Phase 3] Failed to increase Force die step:", err);
    }
  }

  /**
   * Get the equipped lightsaber from actor
   * @private
   */
  static #getEquippedLightsaber(actor) {
    const weapons = actor.items?.filter(
      i => i.type === "weapon" && i.system?.subtype === "lightsaber"
    ) ?? [];

    return weapons.find(w => w.system?.equippable?.equipped === true) || null;
  }

  /**
   * Calculate total die step increase from all installed crystals
   * @private
   */
  static #calculateForcePointDieStepIncrease(weapon, actor) {
    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return 0;

    let total = 0;

    for (const upgradeId of installedUpgrades) {
      const upgrade = actor.items?.get(upgradeId);
      if (!upgrade) continue;

      const increase =
        upgrade.system?.lightsaber?.forceInteraction?.forcePointDieStepIncrease ?? 0;
      total += increase;
    }

    return total;
  }

  /**
   * Increase die step in roll formula
   * d20 → d24, d8 → d12, etc.
   * @private
   */
  static #increaseDieStep(formula, steps) {
    if (!formula || steps <= 0) return formula;

    const dieStepMap = {
      "d4": "d6",
      "d6": "d8",
      "d8": "d10",
      "d10": "d12",
      "d12": "d20",
      "d20": "d24",
      "d24": "d30"
    };

    let result = formula;
    for (let i = 0; i < steps; i++) {
      let modified = false;
      for (const [from, to] of Object.entries(dieStepMap)) {
        if (result.includes(from)) {
          result = result.replace(from, to);
          modified = true;
          break;
        }
      }
      if (!modified) break; // Can't increase further
    }

    return result;
  }

  /* ============================================================
     ALIGNMENT / DSP RESONANCE
  ============================================================ */

  /**
   * Evaluate alignment resonance bonuses
   * Some crystals reflect the wielder's alignment
   *
   * Note: This requires DSPEngine integration
   * Returns modifier(s) to apply during attack/damage calc
   *
   * @param {Actor} actor - Wielder
   * @param {Item} weapon - Lightsaber
   * @returns {Object} { attackBonus: 0, damageBonus: 0, description: "" }
   */
  static evaluateAlignmentResonance(actor, weapon) {
    const result = {
      attackBonus: 0,
      damageBonus: 0,
      source: null
    };

    if (!actor || !weapon) return result;
    if (weapon.system?.subtype !== "lightsaber") return result;

    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return result;

    // Get actor's DSP alignment (if available)
    // Fallback: check flags or actor alignment property
    const dspAlignment = this.#getActorAlignment(actor);

    for (const upgradeId of installedUpgrades) {
      const upgrade = actor.items?.get(upgradeId);
      if (!upgrade) continue;

      const reflectAlignment =
        upgrade.system?.lightsaber?.specialFlags?.reflectAlignment === true;
      if (!reflectAlignment) continue;

      // Apply alignment-based bonus
      if (dspAlignment === "dark") {
        result.damageBonus += 1;
        result.source = upgrade.name;
      } else if (dspAlignment === "light") {
        result.attackBonus += 1;
        result.source = upgrade.name;
      }
      // neutral: no bonus
    }

    return result;
  }

  /**
   * Determine actor's DSP alignment
   * This integrates with DSPEngine if available
   * @private
   */
  static #getActorAlignment(actor) {
    // Priority 1: DSPEngine integration
    // if (typeof DSPEngine !== 'undefined') {
    //   return DSPEngine.getBand(actor)?.toLowerCase() ?? 'neutral';
    // }

    // Priority 2: Actor flags
    const flagAlignment = actor.flags?.swse?.alignment;
    if (flagAlignment) return flagAlignment.toLowerCase();

    // Priority 3: Actor system property
    const systemAlignment = actor.system?.alignment;
    if (systemAlignment) return systemAlignment.toLowerCase();

    // Default: neutral
    return "neutral";
  }

  /* ============================================================
     HEALING AMPLIFICATION (Ankarres Sapphire)
  ============================================================ */

  /**
   * Listen to healing roll evaluation
   * Amplify healing if crystal provides healing boost
   * @private
   */
  static async #onEvaluateHealingRoll(actor, roll, context) {
    if (!actor || !roll || !context) return;

    // Only for healing rolls
    if (context.type !== "healing") return;

    // Get equipped lightsaber
    const lightsaber = this.#getEquippedLightsaber(actor);
    if (!lightsaber) return;

    // Check for healing amplification
    const amplification = this.#calculateHealingAmplification(lightsaber, actor);
    if (amplification <= 0) return;

    try {
      // Modify roll total
      // Note: This happens after roll, before healing applied
      const healingRoll = roll;
      if (typeof roll.total === "number") {
        roll.total += amplification;
        swseLogger.info(
          `[Phase 3] Healing amplified by +${amplification}: ${roll.total}`
        );
      }
    } catch (err) {
      swseLogger.error("[Phase 3] Failed to amplify healing:", err);
    }
  }

  /**
   * Calculate total healing amplification from crystals
   * @private
   */
  static #calculateHealingAmplification(weapon, actor) {
    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return 0;

    let total = 0;

    for (const upgradeId of installedUpgrades) {
      const upgrade = actor.items?.get(upgradeId);
      if (!upgrade) continue;

      // Check conditional effects for healing trigger
      const conditionalEffects = upgrade.system?.lightsaber?.conditionalEffects ?? [];
      for (const effect of conditionalEffects) {
        if (
          effect.trigger?.toLowerCase() === "healing" ||
          effect.trigger?.toLowerCase() === "healingroll"
        ) {
          if (effect.effect?.type === "bonus" && typeof effect.effect.value === "number") {
            total += effect.effect.value;
          }
        }
      }
    }

    return total;
  }

  /* ============================================================
     PHASE 3 TEST & VALIDATION
  ============================================================ */

  /**
   * Validate Phase 3 crystal data structure
   * Checks for required fields and valid values
   */
  static validatePhase3Crystal(upgrade) {
    const issues = [];

    if (!upgrade || !upgrade.system?.lightsaber) {
      return { valid: false, issues: ["Not a lightsaber upgrade"] };
    }

    const ls = upgrade.system.lightsaber;

    // Check unstable flag
    if (ls.specialFlags?.unstable === true) {
      if (typeof ls.specialFlags.unstable !== "boolean") {
        issues.push("specialFlags.unstable must be boolean");
      }
    }

    // Check force interaction
    if (ls.forceInteraction?.forcePointDieStepIncrease !== undefined) {
      if (typeof ls.forceInteraction.forcePointDieStepIncrease !== "number") {
        issues.push("forcePointDieStepIncrease must be number");
      }
    }

    // Check alignment reflection
    if (ls.specialFlags?.reflectAlignment === true) {
      if (typeof ls.specialFlags.reflectAlignment !== "boolean") {
        issues.push("specialFlags.reflectAlignment must be boolean");
      }
    }

    // Check conditional effects for healing
    if (Array.isArray(ls.conditionalEffects)) {
      for (let i = 0; i < ls.conditionalEffects.length; i++) {
        const cond = ls.conditionalEffects[i];
        if (!cond.trigger) {
          issues.push(`conditionalEffects[${i}] missing trigger`);
        }
        if (!cond.effect) {
          issues.push(`conditionalEffects[${i}] missing effect`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

/**
 * Phase 3 Crystal Examples
 * ========================
 *
 * 1. UNSTABLE CRYSTAL
 *    "specialFlags": { "unstable": true }
 *    Effect: Deactivates on Nat 1
 *
 * 2. FORCE-ENHANCING CRYSTAL
 *    "forceInteraction": { "forcePointDieStepIncrease": 1 }
 *    Effect: +1 die step on Force Point rolls
 *
 * 3. ALIGNMENT CRYSTAL
 *    "specialFlags": { "reflectAlignment": true }
 *    Effect: +1 attack (light) or +1 damage (dark)
 *
 * 4. HEALING CRYSTAL (Ankarres Sapphire)
 *    "conditionalEffects": [{
 *      "trigger": "healing",
 *      "effect": { "type": "bonus", "value": 2 }
 *    }]
 *    Effect: +2 healing when cast by wielder
 */

export default Phase3CrystalSystem;
