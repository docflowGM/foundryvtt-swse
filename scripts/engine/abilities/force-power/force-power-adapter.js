/**
 * FORCE_POWER Execution Model — Adapter
 *
 * Bridges the AbilityExecutionCoordinator to the existing ForceEngine/ForceExecutor.
 *
 * Responsibilities:
 * - Register Force Powers in the ability execution system
 * - Validate Force Power schema on registration (via contract)
 * - Execute Force Powers through the AbilityExecutionRouter
 * - Enforce frequency limits via ActivationLimitEngine
 * - Delegate core Force mechanics to ForceEngine/ForceExecutor
 *
 * ARCHITECTURAL NOTE:
 * This adapter is lightweight because ForceEngine/ForceExecutor already handle:
 * - Force Point spending
 * - Dark Side tracking
 * - Natural 20 effects
 * - Power activation/recovery state
 * - Chat message generation
 *
 * This adapter adds:
 * - Schema validation
 * - Integration with AbilityExecutionCoordinator
 * - Frequency limit enforcement (via ActivationLimitEngine)
 * - Metadata tracking for execution
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ForcePowerContractValidator } from "./force-power-contract.js";
import { ForcePowerFrequencyType } from "./force-power-types.js";
import { ensureForcePowerAbilityMeta } from "./force-power-ability-meta.js";

/**
 * Registers and manages FORCE_POWER execution model
 */
export class ForceAdapter {
  /**
   * Register a Force Power ability on an actor
   * Called during AbilityExecutionCoordinator.registerActorAbilities()
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The force power ability item
   */
  static register(actor, ability) {
    try {
      // ── Normalize legacy actor-owned powers before validating ──────────
      // Existing actors can own pre-contract Force power items that lack
      // system.abilityMeta. This creates a non-mutating runtime view for
      // registration while the ready-hook backfill persists the same repair.
      const normalizedAbility = ensureForcePowerAbilityMeta(ability, { source: 'runtime-registration' }) || ability;

      // ── Validate contract ──────────────────────────────────────────────
      ForcePowerContractValidator.assert(normalizedAbility);

      // ── Initialize runtime metadata (idempotent) ──────────────────────
      const meta = normalizedAbility.system?.abilityMeta || {};
      const frequencyType = meta.frequency || ForcePowerFrequencyType.UNLIMITED;

      // Store metadata for execution phase
      // (This can be used by AbilityExecutionRouter/ActivationLimitEngine)
      if (!actor._forcePowerMetadata) {
        actor._forcePowerMetadata = {};
      }

      actor._forcePowerMetadata[ability.id] = {
        name: ability.name,
        frequency: frequencyType,
        maxUses: meta.maxUses || 1,
        actionType: meta.actionType,
        forcePointCost: meta.forcePointCost || 0,
        descriptor: meta.descriptor,
        darkSideOption: meta.darkSideOption || false,
        baseDC: meta.baseDC || 15
      };

      swseLogger.log(
        `[ForceAdapter] Registered Force Power "${ability.name}" on ${actor.name} ` +
        `(frequency: ${frequencyType}, cost: ${meta.forcePointCost || 0} FP)`
      );
    } catch (err) {
      actor._forcePowerRegistrationFailures ??= new Set();
      const failureKey = `${ability.id || ability.name}::${err?.message || err}`;
      if (!actor._forcePowerRegistrationFailures.has(failureKey)) {
        actor._forcePowerRegistrationFailures.add(failureKey);
        swseLogger.error(
          `[ForceAdapter] Registration failed for "${ability.name}":`,
          err.message
        );
      }
      // Non-fatal: log once and don't crash actor registration.
    }
  }

  /**
   * Check if a Force Power can be used
   * Used by UI/sheets to determine if power button should be enabled
   *
   * @param {Object} actor - The actor
   * @param {string} abilityId - The ability ID
   * @param {Object} options - Additional options
   * @returns {{ canUse: boolean, reason?: string }}
   */
  static canUsePower(actor, abilityId, options = {}) {
    const ability = actor.items?.get(abilityId);
    if (!ability) {
      return { canUse: false, reason: 'Ability not found' };
    }

    if (ability.system?.executionModel !== 'FORCE_POWER') {
      return { canUse: false, reason: 'Not a Force Power' };
    }

    // Check Force Points
    const meta = ability.system?.abilityMeta || {};
    const fpCost = meta.forcePointCost || 0;
    const fpCurrent = SchemaAdapters.getForcePoints(actor);

    if (fpCurrent < fpCost) {
      return {
        canUse: false,
        reason: `Need ${fpCost} Force Points (have ${fpCurrent})`
      };
    }

    // Check power discarded state (from ForceExecutor)
    if (ability.system?.discarded) {
      return { canUse: false, reason: 'Power is discarded' };
    }

    return { canUse: true };
  }

  /**
   * Get metadata for a Force Power (for UI display, frequency tracking, etc.)
   * @param {Object} actor
   * @param {string} abilityId
   * @returns {Object|null}
   */
  static getMetadata(actor, abilityId) {
    return actor._forcePowerMetadata?.[abilityId] ?? null;
  }
}
