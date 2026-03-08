/**
 * Action Economy Hooks — Combat Lifecycle Management
 *
 * Registers Foundry hooks to manage turn-state lifecycle:
 * - Reset on combatant.turn (new turn starts)
 * - Clear on combat.delete (combat ends)
 *
 * This is the glue between ActionEngine and Foundry's combat system.
 */

import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";

export function registerActionEconomyHooks() {
  /**
   * When a combatant's turn starts, reset their action economy
   */
  Hooks.on("combatant.turn", async (combatant, options = {}) => {
    if (!combatant?.actor) return;

    try {
      await ActionEconomyPersistence.onCombatantTurn(combatant);
    } catch (error) {
      console.error(
        "[SWSE] Error resetting turn state for combatant:",
        error
      );
    }
  });

  /**
   * When a combat is deleted, clear all turn-state flags
   */
  Hooks.on("combat.delete", async (combat, options = {}) => {
    if (!combat) return;

    try {
      await ActionEconomyPersistence.clearCombatTurnStates(combat);
      console.log("[SWSE] Action economy flags cleared for combat", combat.id);
    } catch (error) {
      console.error(
        "[SWSE] Error clearing turn states for deleted combat:",
        error
      );
    }
  });
}

export default registerActionEconomyHooks;
