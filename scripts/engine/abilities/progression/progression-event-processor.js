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

    // INFRASTRUCTURE ONLY: Log effect but don't apply
    // In future phases: this._processEffect(actor, ability, meta.effect, context)
    const effect = meta.effect;
    swseLogger.debug(
      `[ProgressionEventProcessor] Effect pending: type=${effect.type}, ` +
      `formula=${effect.formula || 'none'}, ` +
      `value=${effect.value || 'none'}, ` +
      `oncePerLevel=${effect.oncePerLevel || false}`
    );
  }

  /**
   * Process effect application (FUTURE - NOT IMPLEMENTED)
   *
   * In Phase 4+ this will:
   * - Check idempotency (_progressionHistory)
   * - Evaluate formulas
   * - Mutate actor currency/items
   *
   * CURRENTLY: Infrastructure scaffolding only
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect definition
   * @param {Object} context - Event context
   */
  static _processEffect(actor, ability, effect, context) {
    // NOT IMPLEMENTED
    // This will be Phase 4+
    // - Do not mutate actor
    // - Do not grant currency
    // - Do not evaluate formulas
  }
}
