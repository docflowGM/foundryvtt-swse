/**
 * ActivationLimitEngine
 *
 * In-memory per-round / per-encounter activation tracking.
 * Uses module-level Maps keyed by actorId — ZERO actor mutations.
 *
 * Responsibilities:
 * - Track how many times an ability has been used this round / this encounter
 * - Expose canActivate() for limit gating
 * - Expose reset hooks for round-end and encounter-end events
 *
 * ARCHITECTURAL POSITION:
 * Called exclusively by AbilityExecutionRouter before any ability fires.
 * No consumer other than AbilityExecutionRouter should call recordActivation().
 * Reset is driven by Foundry combat hooks (round-change, encounter-end).
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Limit type constants — use these instead of raw strings.
 * @enum {string}
 */
export const LimitType = Object.freeze({
  ENCOUNTER: 'encounter',
  ROUND: 'round',
  DAY: 'day',
  UNLIMITED: 'unlimited'
});

// ─── In-memory storage ──────────────────────────────────────────────────────
// Keyed by actorId → Map<abilityId, usageCount>
/** @type {Map<string, Map<string, number>>} */
const _encounterUsage = new Map();

/** @type {Map<string, Map<string, number>>} */
const _roundUsage = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the usage count for a given actor + ability in a specific scope.
 * @param {Map<string, Map<string, number>>} store
 * @param {string} actorId
 * @param {string} abilityId
 * @returns {number}
 */
function _getCount(store, actorId, abilityId) {
  return store.get(actorId)?.get(abilityId) ?? 0;
}

/**
 * Increment the usage count for a given actor + ability in a specific scope.
 * @param {Map<string, Map<string, number>>} store
 * @param {string} actorId
 * @param {string} abilityId
 */
function _increment(store, actorId, abilityId) {
  if (!store.has(actorId)) store.set(actorId, new Map());
  const actorMap = store.get(actorId);
  actorMap.set(abilityId, (actorMap.get(abilityId) ?? 0) + 1);
}

/**
 * Clear all entries for a given actor in a specific scope.
 * @param {Map<string, Map<string, number>>} store
 * @param {string} actorId
 */
function _clearActor(store, actorId) {
  store.delete(actorId);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class ActivationLimitEngine {
  /**
   * Check whether an actor may activate an ability, given a limit type.
   *
   * @param {Object} actor - Actor document (must have .id)
   * @param {string} abilityId - Canonical ability identifier
   * @param {string} limitType - One of LimitType.*
   * @param {number} [maxUses=1] - Maximum activations allowed in this scope
   * @returns {{ allowed: boolean, reason: string }}
   */
  static canActivate(actor, abilityId, limitType, maxUses = 1) {
    if (!actor?.id) {
      return { allowed: false, reason: 'Invalid actor provided to ActivationLimitEngine' };
    }
    if (!abilityId) {
      return { allowed: false, reason: 'Invalid abilityId provided to ActivationLimitEngine' };
    }

    if (limitType === LimitType.UNLIMITED) {
      return { allowed: true, reason: 'Unlimited usage' };
    }

    const actorId = actor.id;
    let currentCount;

    if (limitType === LimitType.ENCOUNTER) {
      currentCount = _getCount(_encounterUsage, actorId, abilityId);
    } else if (limitType === LimitType.ROUND) {
      currentCount = _getCount(_roundUsage, actorId, abilityId);
    } else if (limitType === LimitType.DAY) {
      // Day-level tracking not yet plumbed to a persistence store — treat as
      // encounter for now so the gate still fires rather than silently allowing.
      currentCount = _getCount(_encounterUsage, actorId, abilityId);
      SWSELogger.warn(
        `[ActivationLimitEngine] DAY limit type used for "${abilityId}"; ` +
        `falling back to encounter scope (persistence not yet implemented)`
      );
    } else {
      SWSELogger.warn(`[ActivationLimitEngine] Unknown limitType "${limitType}" — denying activation`);
      return { allowed: false, reason: `Unknown limit type: ${limitType}` };
    }

    if (currentCount >= maxUses) {
      SWSELogger.log(
        `[ActivationLimitEngine] DENY "${abilityId}" for actor ${actorId}: ` +
        `used ${currentCount}/${maxUses} times this ${limitType}`
      );
      return {
        allowed: false,
        reason: `Ability "${abilityId}" has already been used ${currentCount}/${maxUses} times this ${limitType}`
      };
    }

    return { allowed: true, reason: 'Within usage limits' };
  }

  /**
   * Record a successful activation. Call this AFTER ability resolution.
   *
   * @param {Object} actor - Actor document (must have .id)
   * @param {string} abilityId - Canonical ability identifier
   * @param {string} limitType - One of LimitType.*
   */
  static recordActivation(actor, abilityId, limitType) {
    if (!actor?.id || !abilityId) return;

    const actorId = actor.id;

    if (limitType === LimitType.ENCOUNTER || limitType === LimitType.DAY) {
      _increment(_encounterUsage, actorId, abilityId);
    }
    if (limitType === LimitType.ROUND) {
      _increment(_roundUsage, actorId, abilityId);
    }
    // UNLIMITED — no tracking needed

    SWSELogger.log(
      `[ActivationLimitEngine] Recorded activation of "${abilityId}" ` +
      `for actor ${actorId} (scope: ${limitType})`
    );
  }

  /**
   * Reset all per-round usage counters for an actor.
   * Call this at the start/end of each combat round for the relevant actor.
   *
   * @param {Object} actor - Actor document (must have .id)
   */
  static resetRoundLimits(actor) {
    if (!actor?.id) return;
    _clearActor(_roundUsage, actor.id);
    SWSELogger.log(`[ActivationLimitEngine] Round limits reset for actor ${actor.id}`);
  }

  /**
   * Reset all per-encounter usage counters for an actor.
   * Call this when combat ends or when a new encounter begins.
   *
   * @param {Object} actor - Actor document (must have .id)
   */
  static resetEncounterLimits(actor) {
    if (!actor?.id) return;
    _clearActor(_encounterUsage, actor.id);
    SWSELogger.log(`[ActivationLimitEngine] Encounter limits reset for actor ${actor.id}`);
  }

  /**
   * Reset round and encounter limits for all actors.
   * Utility for encounter-end (mass reset).
   */
  static resetAllEncounterLimits() {
    _encounterUsage.clear();
    _roundUsage.clear();
    SWSELogger.log('[ActivationLimitEngine] All encounter and round limits reset');
  }

  /**
   * Read current usage count for an actor + ability (for UI display / tests).
   *
   * @param {Object} actor
   * @param {string} abilityId
   * @param {string} limitType
   * @returns {number}
   */
  static getUsageCount(actor, abilityId, limitType) {
    if (!actor?.id) return 0;
    const actorId = actor.id;
    if (limitType === LimitType.ROUND) return _getCount(_roundUsage, actorId, abilityId);
    if (limitType === LimitType.ENCOUNTER || limitType === LimitType.DAY) {
      return _getCount(_encounterUsage, actorId, abilityId);
    }
    return 0;
  }
}

export default ActivationLimitEngine;
