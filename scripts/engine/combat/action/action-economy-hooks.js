/**
 * Action Economy Hooks — Combat Lifecycle Management
 *
 * Registers Foundry hooks to manage turn-state lifecycle:
 * - Reset on combatTurn (new turn starts)
 * - Clear on deleteCombat (combat ends)
 *
 * This is the glue between ActionEngine and Foundry's combat system.
 *
 * NOTE: "combatant.turn" / "combat.delete" are NOT real Foundry hooks, so the
 * previous registration never fired. Foundry emits "combatTurn" (with the combat
 * document) and "deleteCombat"; we derive the active combatant from the combat.
 */

import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";

export function registerActionEconomyHooks() {
  /**
   * When the active combatant's turn starts, reset their action economy.
   * The combatTurn hook passes the combat document; the current combatant is
   * combat.combatant.
   */
  Hooks.on("combatTurn", async (combat, updateData = {}, updateOptions = {}) => {
    const combatant = combat?.combatant;
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
  Hooks.on("deleteCombat", async (combat, options = {}) => {
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
