/**
 * Ability Execution Coordinator
 *
 * SINGLE ENTRY POINT for actor ability registration at runtime.
 *
 * Current scope:
 * - PASSIVE execution model registration
 * - ACTIVE execution model registration
 * - ATTACK_OPTION execution model registration
 * - UNLOCK execution model registration
 * - PROGRESSION execution model registration
 * - FORCE_POWER execution model registration
 */

import { PassiveAdapter } from "./passive/passive-adapter.js";
import { ActiveAdapter } from "./active/active-adapter.js";
import { AttackOptionAdapter } from "./attack-option/attack-option-adapter.js";
import { UnlockAdapter } from "./unlock/unlock-adapter.js";
import { ProgressionAdapter } from "./progression/progression-adapter.js";
import { ForceAdapter } from "./force-power/force-power-adapter.js";
import { RuleCollector } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-collector.js";
import { SpeciesTraitPassiveAdapter } from "./passive/species-trait-passive-adapter.js";

export class AbilityExecutionCoordinator {

  /**
   * Register all abilities on an actor at boot time.
   * Handles PASSIVE, ACTIVE, ATTACK_OPTION, UNLOCK, PROGRESSION, and FORCE_POWER execution models.
   *
   * CRITICAL LIFECYCLE SAFETY:
   * This method is called repeatedly (on updateActor, createItem, deleteItem, sheet open, etc.).
   * We MUST reset collections before rebuilding, not accumulate across cycles.
   *
   * If we don't reset:
   * - Open sheet: +1 modifier
   * - Close sheet: still +1
   * - Open again: +2 (WRONG - should still be +1)
   * - This cascades: every prepare cycle adds a layer
   *
   * Solution: Clear collections at start of each registration cycle.
   * This ensures deterministic state - we rebuild from scratch every time.
   *
   * @param {Object} actor - The actor document
   */
  static registerActorAbilities(actor) {
    // ========================================
    // CRITICAL: Reset all ability collections
    // Ensures we rebuild from scratch, not accumulate
    // ========================================
    actor._passiveModifiers = {};
    actor._ruleTokens = [];
    actor._unlockGrants = { systemAccess: new Set(), proficiencies: { weapon: new Set(), armor: new Set(), exotic: new Set(), shield: new Set() }, skills: { training: new Set(), classSkills: new Set() } };
    // (Other execution models will add their resets here in future phases)

    // PHASE 4E: Create RuleCollector for this prepare cycle
    // Will aggregate all RULE entries and finalize into frozen snapshot
    const ruleCollector = new RuleCollector();

    const abilities = actor.items.filter(i =>
      ["talent", "feat", "species", "force-power"].includes(i.type)
    );

    for (const ability of abilities) {
      if (ability.system.executionModel === "PASSIVE") {
        PassiveAdapter.register(actor, ability, ruleCollector);
      } else if (ability.system.executionModel === "ACTIVE") {
        ActiveAdapter.register(actor, ability);
      } else if (ability.system.executionModel === "ATTACK_OPTION") {
        AttackOptionAdapter.register(actor, ability);
      } else if (ability.system.executionModel === "UNLOCK") {
        UnlockAdapter.register(actor, ability);
      } else if (ability.system.executionModel === "PROGRESSION") {
        ProgressionAdapter.register(actor, ability);
      } else if (ability.system.executionModel === "FORCE_POWER") {
        ForceAdapter.register(actor, ability);
      }
    }

    // Also register PASSIVE abilities derived from the Species Ability Registry (data/species-traits.json).
    // This allows racial abilities to participate in the PASSIVE engine even when the actor stores race as a string
    // (system.race) rather than embedding a species item.
    SpeciesTraitPassiveAdapter.registerFromActor(actor, ruleCollector);

    // PHASE 4E: Finalize rule collection into frozen snapshots
    ruleCollector.finalize(actor);
  }
}
