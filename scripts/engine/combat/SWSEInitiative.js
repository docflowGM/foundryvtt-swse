/**
 * SWSE Initiative Tie Resolution Engine (V2 Consolidated)
 *
 * Implements SWSE rules for initiative ties:
 *   1. Higher initiative modifier wins.
 *   2. If still tied, reroll between tied combatants only.
 *
 * Also provides actor-level methods for:
 *   - Rolling initiative (with optional Force Point bonus)
 *   - Taking 10 on initiative
 *   - Applying results to the Combat Tracker
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import RollCore from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class SWSEInitiative {

  /* ------------------------------------------------------------------ */
  /* TIE RESOLUTION                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Resolve all initiative ties in the given combat.
   * Step 1: Group combatants sharing the same initiative value.
   * Step 2: Within each group, higher modifier breaks the tie.
   * Step 3: If modifiers are also equal, reroll between those combatants.
   * @param {Combat} combat
   */
  static async resolveTies(combat) {
    const tiedGroups = this._findTies(combat);

    for (const group of tiedGroups) {
      if (group.length < 2) continue;

      // Sort descending by initiative modifier
      group.sort((a, b) => {
        const modA = this._getInitMod(a);
        const modB = this._getInitMod(b);
        return modB - modA;
      });

      const highestMod = this._getInitMod(group[0]);
      const stillTied = group.filter(c => this._getInitMod(c) === highestMod);

      if (stillTied.length > 1) {
        await this._rerollBetween(stillTied, combat);
      }
    }
  }

  /**
   * Find groups of combatants that share the same initiative value.
   * @param {Combat} combat
   * @returns {Array<Combatant[]>} Groups with 2+ members sharing initiative.
   */
  static _findTies(combat) {
    const groups = {};

    for (const c of combat.combatants) {
      if (c.initiative == null) continue;
      const key = String(c.initiative);
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }

    return Object.values(groups).filter(g => g.length > 1);
  }

  /**
   * Reroll initiative between a set of still-tied combatants.
   * Each gets a fresh 1d20 + mod; results replace their current initiative.
   * @param {Combatant[]} combatants
   * @param {Combat} combat
   */
  static async _rerollBetween(combatants, combat) {
    for (const c of combatants) {
      const mod = this._getInitMod(c);
      const formula = `1d20 + ${mod}`;
      const roll = new Roll(formula);
      await roll.evaluate({ async: true });
      await combat.setInitiative(c.id, roll.total);
    }
  }

  /**
   * Get the canonical initiative modifier for a combatant's actor.
   * @param {Combatant} combatant
   * @returns {number}
   */
  static _getInitMod(combatant) {
    return combatant.actor?.system?.skills?.initiative?.total ?? 0;
  }

  /* ------------------------------------------------------------------ */
  /* ACTOR-LEVEL INITIATIVE METHODS                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Roll initiative for an actor via RollCore and apply to Combat Tracker.
   * Optionally spend a Force Point for a bonus die.
   *
   * @param {Actor} actor
   * @param {object} [options]
   * @param {boolean} [options.useForce=false]  Spend a Force Point on the roll.
   * @returns {Object} Structured initiative result { roll, total, usedForce, forceBonus, baseMod }
   */
  static async rollInitiative(actor, options = {}) {
    if (!actor) return { success: false, error: 'No actor provided' };

    // === UNIFIED ROLL EXECUTION via RollCore ===
    const rollResult = await RollCore.execute({
      actor,
      domain: 'initiative',
      rollOptions: {
        baseDice: '1d20',
        useForce: options.useForce || false
      }
    });

    if (!rollResult.success) {
      swseLogger.error('[SWSEInitiative] Roll execution failed:', rollResult.error);
      return rollResult;
    }

    let total = rollResult.finalTotal;
    const forceBonus = rollResult.forcePointBonus || 0;
    const usedForce = forceBonus > 0;
    const baseMod = rollResult.modifierTotal;

    // === FORCE POINT SPENDING (if used) ===
    if (usedForce) {
      const fp = actor.system.forcePoints?.value ?? 0;
      if (fp > 0) {
        // Decrement Force Points through ActorEngine
        await ActorEngine.updateActor(actor, {
          'system.forcePoints.value': Math.max(0, fp - 1)
        });

        // Announce FP spend in chat
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<em>${actor.name} spends a Force Point on Initiative (+${forceBonus})</em>`,
          flags: { swse: { initiativeForcePowerSpent: true } }
        });
      }
    }

    // === POST THE ROLL TO CHAT ===
    if (rollResult.roll) {
      await rollResult.roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: forceBonus > 0
          ? `<strong>Initiative Roll</strong><br/>+${forceBonus} (Force Point)`
          : '<strong>Initiative Roll</strong>',
        flags: { 'core.initiativeRoll': true }
      });
    }

    // === APPLY TO COMBAT TRACKER ===
    await this._applyInitiativeToCombat(actor, total);

    return {
      roll: rollResult.roll,
      total,
      usedForce,
      forceBonus,
      baseMod
    };
  }

  /**
   * Take 10 on initiative: result = 10 + modifier via RollCore
   * @param {Actor} actor
   */
  static async take10Initiative(actor) {
    if (!actor) return;

    // === USE RollCore WITH Take X OPTION ===
    const rollResult = await RollCore.execute({
      actor,
      domain: 'initiative',
      rollOptions: {
        baseDice: '1d20',
        isTakeX: true,
        takeXValue: 10
      }
    });

    if (!rollResult.success) {
      swseLogger.error('[SWSEInitiative] Take 10 failed:', rollResult.error);
      return;
    }

    const result = rollResult.finalTotal;

    // === ANNOUNCE IN CHAT ===
    const content = `<div class="swse-initiative-take10">
      <strong>${actor.name}</strong> takes 10 on Initiative: <strong>${result}</strong>
      <span style="opacity:0.7;">(10 + ${rollResult.modifierTotal})</span>
    </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flavor: 'Initiative — Take 10'
    });

    // === APPLY TO COMBAT TRACKER ===
    await this._applyInitiativeToCombat(actor, result);
  }

  /**
   * Apply a computed initiative value to this actor's combatant in the
   * active Combat Tracker, then run tie resolution.
   * @param {Actor} actor
   * @param {number} value
   */
  static async _applyInitiativeToCombat(actor, value) {
    const combat = game.combat;
    if (!combat) return;

    const combatant = combat.combatants.find(c => c.actorId === actor.id);
    if (!combatant) return;

    await combat.setInitiative(combatant.id, value);
    await this.resolveTies(combat);
  }
}
