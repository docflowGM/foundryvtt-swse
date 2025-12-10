import { ProgressionEngine } from "../progression/engine/progression-engine.js";

/**
 * Custom Combatant Document for SWSE
 * Extends Foundry's Combatant class to implement SWSE-specific features
 */
export class SWSECombatant extends Combatant {

  /**
   * Get the initiative bonus for this combatant
   * @type {number}
   */
  get initiativeBonus() {
    const actor = this.actor;
    if (!actor) return 0;
    return actor.system.initiative || 0;
  }

  /**
   * Check if this combatant can act this turn
   * Considers condition track and other status effects
   * @type {boolean}
   */
  get canAct() {
    const actor = this.actor;
    if (!actor) return false;

    // Check condition track
    const condition = actor.system.conditionTrack?.current;
    if (condition === "helpless" || condition === "unconscious" || condition === "dead") {
      return false;
    }

    // Other debilitating effects could be added here
    return true;
  }

  /**
   * Get current action economy
   * @type {object}
   */
  get actionEconomy() {
    const actor = this.actor;
    if (!actor) return {};

    return actor.system.actionEconomy || {
      swift: true,
      move: true,
      standard: true,
      fullRound: true,
      reaction: true
    };
  }

  /**
   * Check if the combatant has a specific action available
   * @param {string} actionType
   * @returns {boolean}
   */
  hasAction(actionType) {
    return this.actionEconomy[actionType] === true;
  }

  /**
   * Mark an action as used
   * @param {string} actionType
   * @returns {Promise<void>}
   */
  async useAction(actionType) {
    const actor = this.actor;
    if (!actor) return;

    const updates = {};

    // Full-round action consumes everything except reactions
    if (actionType === "fullRound") {
      updates["system.actionEconomy"] = {
        swift: false,
        move: false,
        standard: false,
        fullRound: false,
        reaction: this.actionEconomy.reaction
      };
    }
    // Standard consumes move + standard + disables full-round
    else if (actionType === "standard") {
      updates[`system.actionEconomy.${actionType}`] = false;
      updates["system.actionEconomy.move"] = false;
      updates["system.actionEconomy.fullRound"] = false;
    }
    // Move or swift? They remove full-round too
    else {
      updates[`system.actionEconomy.${actionType}`] = false;
      if (actionType === "move" || actionType === "swift") {
        updates["system.actionEconomy.fullRound"] = false;
      }
    }

    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
  }

  /**
   * Reset action economy for a new turn
   * @returns {Promise<void>}
   */
  async resetActions() {
    const actor = this.actor;
    if (!actor) return;

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.actionEconomy": {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    });
  }

  /**
   * Prepare derived combatant data
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    const actor = this.actor;
    if (actor) {
      this._initiativeBonus = actor.system.initiative || 0;
    }
  }

  /**
   * Get resource data displayed in the combat tracker
   */
  getResourceData() {
    const data = super.getResourceData();
    const actor = this.actor;

    if (actor) {
      // Show condition track state
      const condition = actor.system.conditionTrack?.current;
      if (condition && condition !== "normal") {
        data.condition = condition;
      }

      // Show action economy indicators
      data.actions = this.actionEconomy;
    }

    return data;
  }
}
