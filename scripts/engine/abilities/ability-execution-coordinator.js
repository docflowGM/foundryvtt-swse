/**
 * Ability Execution Coordinator
 *
 * SINGLE ENTRY POINT for actor ability registration at runtime.
 *
 * Current scope:
 * - PASSIVE execution model registration
 * - ACTIVE execution model registration
 *
 * Future expansion (NOT implemented yet):
 * - ATTACK_OPTION
 */

import { PassiveAdapter } from "./passive/passive-adapter.js";
import { ActiveAdapter } from "./active/active-adapter.js";

export class AbilityExecutionCoordinator {

  /**
   * Register all abilities on an actor at boot time.
   * Handles PASSIVE and ACTIVE execution models.
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
      } else if (ability.system.executionModel === "ACTIVE") {
        ActiveAdapter.register(actor, ability);
      }
    }
  }
}
