/**
 * ActionEconomyPersistence — Turn-State Storage & Lifecycle
 *
 * Manages where turn state lives and when it resets.
 *
 * Storage: actor.flags.swse.actionEconomy
 * Scope: Per actor per combat (survives rerenders, syncs across clients)
 * Reset: On combatant.turn hook (automatic, deterministic)
 *
 * This layer bridges ActionEngine (pure math) and Foundry persistence.
 */

import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";

export class ActionEconomyPersistence {
  // Flag storage key
  static FLAG_KEY = "actionEconomy";
  static SCOPE = "swse";

  /**
   * Get current turn state for an actor in a combat
   * @param {Actor} actor - The actor
   * @param {string} combatId - The combat ID (or null if no active combat)
   * @returns {Object} Turn state { remaining, degraded, fullRoundUsed }
   */
  static getTurnState(actor, combatId) {
    if (!actor) return ActionEngine.startTurn();

    const flag = actor.getFlag(this.SCOPE, this.FLAG_KEY);

    // If flag exists and matches current combat, return it
    if (flag && flag.combatId === combatId) {
      return flag.turnState;
    }

    // Otherwise, return fresh turn state
    return ActionEngine.startTurn();
  }

  /**
   * Save turn state for an actor in a combat
   * @param {Actor} actor
   * @param {string} combatId
   * @param {Object} turnState
   */
  static async setTurnState(actor, combatId, turnState) {
    if (!actor) return;

    await actor.setFlag(this.SCOPE, this.FLAG_KEY, {
      combatId: combatId,
      turnState: turnState,
      timestamp: Date.now()
    });
  }

  /**
   * Reset turn state to fresh (new turn)
   * @param {Actor} actor
   * @param {string} combatId
   */
  static async resetTurnState(actor, combatId) {
    await this.setTurnState(actor, combatId, ActionEngine.startTurn());
  }

  /**
   * Clear all turn-state flags for a combat (on delete)
   * @param {Combat} combat
   */
  static async clearCombatTurnStates(combat) {
    if (!combat?.combatants?.size) return;

    const updates = [];
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (actor) {
        updates.push(
          actor.unsetFlag(this.SCOPE, this.FLAG_KEY)
        );
      }
    }

    await Promise.all(updates);
  }

  /**
   * Called when a new combatant's turn starts
   * Resets their economy and announces fresh turn
   * @param {Combatant} combatant
   */
  static async onCombatantTurn(combatant) {
    if (!combatant?.actor) return;

    const combat = combatant.combat;
    await this.resetTurnState(combatant.actor, combat.id);

    // Log for diagnostics
    console.log(
      `[SWSE] ${combatant.actor.name} begins turn — action economy reset.`
    );
  }

  /**
   * Called when a turn state is consumed
   * Updates the persistent flag
   * @param {Actor} actor
   * @param {string} combatId
   * @param {Object} consumeResult - From ActionEngine.consume()
   */
  static async commitConsumption(actor, combatId, consumeResult) {
    if (!consumeResult.allowed) {
      console.warn(
        `[SWSE] Attempted to commit invalid consumption for ${actor.name}`
      );
      return;
    }

    await this.setTurnState(actor, combatId, consumeResult.turnState);
  }
}

export default ActionEconomyPersistence;
