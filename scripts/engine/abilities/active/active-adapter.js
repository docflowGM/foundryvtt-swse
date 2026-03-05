/**
 * ACTIVE Execution Model - Runtime Adapter
 *
 * Scaffolding for ACTIVE ability registration and dispatch.
 * Handles routing of active abilities to their respective subsystems.
 *
 * Integration points (TODO):
 * - handleEffect: action economy validation, frequency, cost, targeting, effect resolution, duration management
 * - handleMode: exclusive group enforcement, state toggle, persistent effect application
 */

import { ACTIVE_SUBTYPES } from "./active-types.js";
import { ActiveContractValidator } from "./active-contract.js";

export class ActiveAdapter {

  /**
   * Register an active ability on an actor.
   * Validates contract, then dispatches to appropriate handler.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "ACTIVE") return;

    ActiveContractValidator.validate(ability);

    switch (ability.system.subType) {

      case ACTIVE_SUBTYPES.EFFECT:
        this.handleEffect(actor, ability);
        break;

      case ACTIVE_SUBTYPES.MODE:
        this.handleMode(actor, ability);
        break;
    }
  }

  /**
   * Handle EFFECT subtype.
   *
   * TODO:
   * - validate action economy (cannot spend more actions than available)
   * - validate frequency usage (check against usage limits)
   * - validate cost (forcePoints, resources)
   * - resolve targeting (dynamic selection, formula evaluation)
   * - apply effect via ActorEngine
   * - register duration tracking
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleEffect(actor, ability) {
    // TODO: implement EFFECT logic
  }

  /**
   * Handle MODE subtype.
   *
   * TODO:
   * - enforce exclusiveGroup constraints (remove prior modes in same group)
   * - toggle state on/off
   * - apply persistent effect to actor
   * - update actor UI state
   *
   * @param {Object} actor
   * @param {Object} ability
   */
  static handleMode(actor, ability) {
    // TODO: implement MODE logic
  }
}
