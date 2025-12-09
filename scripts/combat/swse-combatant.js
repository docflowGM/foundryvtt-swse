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
    if (condition === 'helpless' || condition === 'unconscious' || condition === 'dead') {
      return false;
    }

    // Check for other debilitating effects
    // This can be expanded with Active Effects integration
    return true;
  }

  /**
   * Get the current action economy state
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
   * Check if combatant has a specific action available
   * @param {string} actionType - Type of action (swift, move, standard, fullRound, reaction)
   * @returns {boolean}
   */
  hasAction(actionType) {
    return this.actionEconomy[actionType] === true;
  }

  /**
   * Use an action (mark it as consumed)
   * @param {string} actionType - Type of action to consume
   * @returns {Promise<void>}
   */
  async useAction(actionType) {
    const actor = this.actor;
    if (!actor) return;

    const updates = {};

    // Full round action consumes all actions except reactions
    if (actionType === 'fullRound') {
      updates['system.actionEconomy'] = {
        swift: false,
        move: false,
        standard: false,
        fullRound: false,
        reaction: this.actionEconomy.reaction
      };
    }
    // Standard action also consumes move action
    else if (actionType === 'standard') {
      updates[`system.actionEconomy.${actionType}`] = false;
      updates['system.actionEconomy.move'] = false;
      updates['system.actionEconomy.fullRound'] = false;
    }
    // Other actions
    else {
      updates[`system.actionEconomy.${actionType}`] = false;
      if (actionType === 'move' || actionType === 'swift') {
        updates['system.actionEconomy.fullRound'] = false;
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

    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
      'system.actionEconomy': {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    });
globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.actionEconomy': {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.actionEconomy': {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    }); */

  }

  /**
   * Prepare derived data for the combatant
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Add any SWSE-specific derived data here
    const actor = this.actor;
    if (actor) {
      // Store initiative bonus for easy access
      this._initiativeBonus = actor.system.initiative || 0;
    }
  }

  /**
   * Get resource value for the combat tracker display
   * This is used for displaying additional info in the combat tracker
   * @override
   */
  getResourceData() {
    const data = super.getResourceData();
    const actor = this.actor;

    if (actor) {
      // Add condition track to the display
      const condition = actor.system.conditionTrack?.current;
      if (condition && condition !== 'normal') {
        data.condition = condition;
      }

      // Add action economy indicators
      data.actions = this.actionEconomy;
    }

    return data;
  }
}
