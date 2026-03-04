/**
 * Ability Execution Coordinator
 *
 * SINGLE ENTRY POINT for actor ability registration at runtime.
 *
 * Current scope:
 * - PASSIVE execution model registration
 *
 * Future expansion (NOT implemented yet):
 * - ACTIVE
 * - ATTACK_OPTION
 */

import { PassiveAdapter } from "./passive/passive-adapter.js";

export class AbilityExecutionCoordinator {

  /**
   * Register all abilities on an actor at boot time.
   * Currently handles PASSIVE abilities only.
   *
   * @param {Object} actor - The actor document
   */
  static registerActorAbilities(actor) {
    const abilities = actor.items.filter(i =>
      ["talent", "feat"].includes(i.type)
    );

    for (const ability of abilities) {
      if (ability.system.executionModel === "PASSIVE") {
        PassiveAdapter.register(actor, ability);
      }
    }
  }
}
