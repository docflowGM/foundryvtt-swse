/**
 * PROGRESSION Execution Model - Event Processor
 *
 * Routes lifecycle events to PROGRESSION abilities.
 * Validates contracts and scaffolds effect application.
 *
 * PHASE 3: Event routing infrastructure
 *
 * IMPORTANT: This is INFRASTRUCTURE ONLY.
 * - No currency mutation
 * - No formula evaluation
 * - No actual granting
 * - Effects are logged but not processed
 */

import { PROGRESSION_EXECUTION_MODEL } from "./progression-types.js";
import { ProgressionContractValidator } from "./progression-contract.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ProgressionEventProcessor {

  /**
   * Process a lifecycle event on an actor.
   * Routes event to all matching PROGRESSION abilities.
   *
   * INFRASTRUCTURE ONLY - No actual mutations yet.
   *
   * @param {Object} actor - The actor document
   * @param {string} eventType - Event type (e.g., "LEVEL_UP")
   * @param {Object} context - Event context (e.g., { classLevel: 5 })
   */
  static handle(actor, eventType, context = {}) {
    if (!actor?.items) return;

    // Find all PROGRESSION abilities
    const progressionAbilities = actor.items.filter(i =>
      i.system?.executionModel === PROGRESSION_EXECUTION_MODEL
    );

    if (progressionAbilities.length === 0) return;

    swseLogger.debug(
      `[ProgressionEventProcessor] Processing event "${eventType}" ` +
      `with ${progressionAbilities.length} PROGRESSION abilities ` +
      `on actor ${actor.name}`
    );

    // Process each ability
    for (const ability of progressionAbilities) {
      try {
        this._processAbility(actor, ability, eventType, context);
      } catch (err) {
        swseLogger.error(
          `[ProgressionEventProcessor] Error processing PROGRESSION ability ` +
          `${ability.name} on actor ${actor.name}: ${err.message}`
        );
        throw err;
      }
    }
  }

  /**
   * Process a single PROGRESSION ability for an event
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {string} eventType - Event type
   * @param {Object} context - Event context
   */
  static _processAbility(actor, ability, eventType, context) {
    // Validate contract
    try {
      ProgressionContractValidator.validate(ability);
    } catch (err) {
      throw new Error(
        `PROGRESSION ability ${ability.name} contract violation: ${err.message}`
      );
    }

    const meta = ability.system.abilityMeta;

    // Check if this ability triggers on this event
    if (meta.trigger !== eventType) {
      // Not triggered by this event
      return;
    }

    swseLogger.debug(
      `[ProgressionEventProcessor] PROGRESSION ability ${ability.name} ` +
      `triggered by event ${eventType}`
    );

    // PHASE 4: Process effect
    const effect = meta.effect;
    try {
      this._processEffect(actor, ability, effect, context);
    } catch (err) {
      swseLogger.error(
        `[ProgressionEventProcessor] Error processing effect for ` +
        `${ability.name}: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Compute the total Lineage-eligible level for an actor.
   * Sums levels from all classes that provide Lineage talent tree access.
   *
   * @private
   * @param {Object} actor - The actor document
   * @returns {number} Total Lineage-eligible levels
   */
  static _computeLineageEligibleLevel(actor) {
    // Lazy-load talent tree class map (supports both Foundry and test environments)
    const talentTreeClassMap = this._getTalentTreeClassMap();
    const lineageClasses = talentTreeClassMap["Lineage"] ?? [];

    if (!Array.isArray(actor.system.classes)) {
      return 0;
    }

    return actor.system.classes
      .filter(c => lineageClasses.includes(c.classId))
      .reduce((sum, c) => sum + (c.level || 0), 0);
  }

  /**
   * Get talent tree class map with fallback for test injection.
   * @private
   */
  static _getTalentTreeClassMap() {
    // Allow tests to inject the map
    if (this._injectedTalentTreeClassMap) {
      return this._injectedTalentTreeClassMap;
    }

    // Try to get from global if already loaded by system
    if (globalThis.talentTreeClassMap) {
      return globalThis.talentTreeClassMap;
    }

    // Default: return empty map (will be initialized by system startup)
    return {};
  }

  /**
   * Process effect application (PHASE 4 IMPLEMENTATION)
   *
   * Routes effect processing based on type.
   * Currently implements GRANT_CREDITS with idempotency.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect definition
   * @param {Object} context - Event context
   */
  static async _processEffect(actor, ability, effect, context) {
    if (!effect || !effect.type) return;

    switch (effect.type) {
      case "GRANT_CREDITS":
        await this._grantCredits(actor, ability, effect, context);
        break;

      case "GRANT_XP":
        // planned: Phase 5 - Implement XP granting
        break;

      case "GRANT_ITEM":
        // planned: Phase 5 - Implement item cloning and granting
        break;

      case "CUSTOM":
        // planned: Phase 5 - Custom effect handlers
        break;

      default:
        swseLogger.warn(
          `[ProgressionEventProcessor] Unknown effect type: ${effect.type}`
        );
    }
  }

  /**
   * Grant credits based on effect amount type.
   * Currently supports LINEAGE_LEVEL_MULTIPLIER.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect definition (has amount field)
   * @param {Object} context - Event context
   */
  static async _grantCredits(actor, ability, effect, context) {
    // Import ActorEngine for mutation
    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");

    if (!effect.amount) {
      // Legacy fallback: formula or value
      if (typeof effect.value === 'number') {
        await this._applyCreditsUpdate(actor, effect.value, ability.name, ActorEngine);
      }
      return;
    }

    // PHASE 4: Handle LINEAGE_LEVEL_MULTIPLIER
    if (effect.amount.type === "LINEAGE_LEVEL_MULTIPLIER") {
      // Initialize progressionHistory flags if needed
      if (!actor.flags?.swse) {
        actor.flags = actor.flags || {};
        actor.flags.swse = {};
      }
      if (!actor.flags.swse.progressionHistory) {
        actor.flags.swse.progressionHistory = {};
      }

      const abilityId = ability.id;
      const progressionHistory = actor.flags.swse.progressionHistory;
      const historyEntry = progressionHistory[abilityId] || { levelsGranted: [] };
      const levelsGranted = historyEntry.levelsGranted || [];

      // Compute current Lineage-eligible level
      const currentLineageLevel = this._computeLineageEligibleLevel(actor);
      let creditsToGrant = 0;
      const newLevelsGranted = [...levelsGranted];

      // Grant for each level that hasn't been granted yet
      for (let level = 1; level <= currentLineageLevel; level++) {
        if (!levelsGranted.includes(level)) {
          creditsToGrant += effect.amount.multiplier;
          newLevelsGranted.push(level);
        }
      }

      // Apply mutation only if there are credits to grant
      if (creditsToGrant > 0) {
        swseLogger.debug(
          `[ProgressionEventProcessor] GRANT_CREDITS: Ability ${ability.name} ` +
          `granting ${creditsToGrant} credits ` +
          `(${newLevelsGranted.length} Lineage levels, multiplier: ${effect.amount.multiplier})`
        );

        // Update credits
        await this._applyCreditsUpdate(
          actor,
          creditsToGrant,
          ability.name,
          ActorEngine
        );

        // Update progression history with new levels granted
        progressionHistory[abilityId] = {
          levelsGranted: newLevelsGranted
        };

        // Persist history to flags
        await ActorEngine.updateActor(actor, {
          "flags.swse.progressionHistory": progressionHistory
        });

        swseLogger.log(
          `[ProgressionEventProcessor] GRANT_CREDITS: ${ability.name} ` +
          `granted ${creditsToGrant} credits. ` +
          `Lineage levels granted: ${newLevelsGranted.join(', ')}`
        );
      } else {
        swseLogger.debug(
          `[ProgressionEventProcessor] GRANT_CREDITS: ${ability.name} ` +
          `no new Lineage levels to grant (already have: ${levelsGranted.join(', ')})`
        );
      }
    }
  }

  /**
   * Apply credits update through ActorEngine.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {number} creditsToAdd - Amount of credits to add
   * @param {string} abilityName - Name of the ability for logging
   * @param {Object} ActorEngine - ActorEngine class
   */
  static async _applyCreditsUpdate(actor, creditsToAdd, abilityName, ActorEngine) {
    const newCredits = (actor.system.credits || 0) + creditsToAdd;
    await ActorEngine.updateActor(actor, {
      "system.credits": newCredits
    });
  }
}
