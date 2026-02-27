/**
 * AbilityExecutionRouter
 *
 * SINGLE ENTRY POINT for all runtime ability activation.
 *
 * Responsibilities:
 * - Gate every activation through ActivationLimitEngine before execution
 * - Route to the correct downstream engine (ForceEngine, ConditionEngine, ActorEngine)
 * - Return a structured ExecutionResult to callers
 * - Never mutate actor directly — all mutations via ActorEngine
 *
 * ARCHITECTURAL POSITION:
 * All talent / force-power / reaction ability activations MUST flow:
 *   AbilityExecutionRouter → ActivationLimitEngine → downstream engine → ActorEngine
 *
 * Nothing should write to actor.system except ActorEngine.
 * Nothing should call downstream engines (ForceEngine, ConditionEngine) directly for
 * activation purposes — they should only be called through this router.
 *
 * EXECUTION TYPES (ExecutionType enum):
 * - FORCE_POWER: activate a known force power on a target
 * - TALENT: activate a talent ability
 * - REACTION: fire a once-per-round reactive ability
 * - GENERAL: generic ability activation (catch-all)
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActivationLimitEngine, LimitType } from './ActivationLimitEngine.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

/**
 * Execution type constants.
 * @enum {string}
 */
export const ExecutionType = Object.freeze({
  FORCE_POWER: 'force_power',
  TALENT: 'talent',
  REACTION: 'reaction',
  GENERAL: 'general'
});

/**
 * @typedef {Object} AbilityExecutionRequest
 * @property {string} abilityId          - Canonical ability identifier
 * @property {string} executionType      - One of ExecutionType.*
 * @property {Object} actor              - Activating actor
 * @property {Object} [target]           - Target actor (optional)
 * @property {Object} [item]             - Associated item document (optional)
 * @property {string} [limitType]        - Override limit type (default: UNLIMITED)
 * @property {number} [maxUses]          - Override max uses for this limit
 * @property {Object} [payload]          - Extra data passed to downstream handler
 */

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success           - Whether the ability fired
 * @property {string} reason             - Human-readable status
 * @property {boolean} limitBlocked      - True if blocked by usage limit
 * @property {Object|null} outcome       - Result from downstream handler (if any)
 */

export class AbilityExecutionRouter {
  /**
   * Execute an ability activation request.
   *
   * Flow:
   * 1. Validate request shape
   * 2. Gate through ActivationLimitEngine
   * 3. Dispatch to execution handler
   * 4. Record activation on success
   * 5. Return ExecutionResult
   *
   * @param {AbilityExecutionRequest} request
   * @returns {Promise<ExecutionResult>}
   */
  static async execute(request) {
    // ── 1. Validate ──────────────────────────────────────────────────────────
    const validationError = AbilityExecutionRouter._validateRequest(request);
    if (validationError) {
      SWSELogger.warn(`[AbilityExecutionRouter] Invalid request: ${validationError}`);
      return { success: false, reason: validationError, limitBlocked: false, outcome: null };
    }

    const { abilityId, executionType, actor, target, item, payload } = request;
    const limitType = request.limitType ?? LimitType.UNLIMITED;
    const maxUses = request.maxUses ?? 1;

    SWSELogger.log(
      `[AbilityExecutionRouter] execute: "${abilityId}" ` +
      `type=${executionType} actor=${actor.id} limitType=${limitType}`
    );

    // ── 2. Limit gate ─────────────────────────────────────────────────────────
    const limitCheck = ActivationLimitEngine.canActivate(actor, abilityId, limitType, maxUses);
    if (!limitCheck.allowed) {
      SWSELogger.log(
        `[AbilityExecutionRouter] BLOCKED "${abilityId}" for actor ${actor.id}: ${limitCheck.reason}`
      );
      return {
        success: false,
        reason: limitCheck.reason,
        limitBlocked: true,
        outcome: null
      };
    }

    // ── 3. Dispatch ──────────────────────────────────────────────────────────
    let outcome = null;
    try {
      switch (executionType) {
        case ExecutionType.FORCE_POWER:
          outcome = await AbilityExecutionRouter._executeForcePower(actor, target, item, payload);
          break;
        case ExecutionType.TALENT:
          outcome = await AbilityExecutionRouter._executeTalent(actor, target, item, payload);
          break;
        case ExecutionType.REACTION:
          outcome = await AbilityExecutionRouter._executeReaction(actor, target, item, payload);
          break;
        case ExecutionType.GENERAL:
        default:
          outcome = await AbilityExecutionRouter._executeGeneral(actor, target, item, payload);
          break;
      }
    } catch (err) {
      SWSELogger.error(`[AbilityExecutionRouter] Execution error for "${abilityId}":`, err);
      return {
        success: false,
        reason: `Execution error: ${err.message ?? err}`,
        limitBlocked: false,
        outcome: null
      };
    }

    // ── 4. Record activation ─────────────────────────────────────────────────
    ActivationLimitEngine.recordActivation(actor, abilityId, limitType);

    // ── 5. Return result ─────────────────────────────────────────────────────
    SWSELogger.log(
      `[AbilityExecutionRouter] SUCCESS "${abilityId}" for actor ${actor.id}`
    );
    return { success: true, reason: 'Ability activated', limitBlocked: false, outcome };
  }

  // ─── Execution Handlers ───────────────────────────────────────────────────

  /**
   * Handle force power activation.
   * Delegates to ForceEngine when available, otherwise queues for application.
   * @private
   */
  static async _executeForcePower(actor, target, item, payload = {}) {
    // Lazy-import ForceEngine to avoid circular deps at module load time
    let ForceEngine;
    try {
      ({ ForceEngine } = await import('../force/force-engine.js'));
    } catch (_) {
      SWSELogger.warn('[AbilityExecutionRouter] ForceEngine unavailable — activation queued without spend');
      return { queued: true };
    }

    if (typeof ForceEngine?.spendForcePoint === 'function' && payload.spendForcePoint) {
      await ForceEngine.spendForcePoint(actor);
    }

    return {
      type: 'force_power',
      actorId: actor.id,
      itemId: item?.id ?? null,
      targetId: target?.id ?? null
    };
  }

  /**
   * Handle talent activation.
   * Talent execution currently logs and defers UI display to the caller.
   * @private
   */
  static async _executeTalent(actor, target, item, payload = {}) {
    // Talent runtime execution (e.g., Block, Deflect) is caller-driven:
    // the router ensures limit gating and records usage.
    // Effect application (e.g., condition track changes) flows through ConditionEngine.
    if (payload.conditionStep !== undefined) {
      const { ConditionEngine } = await import('../combat/ConditionEngine.js');
      if (typeof ConditionEngine?.applyConditionStep === 'function') {
        await ConditionEngine.applyConditionStep(target ?? actor, payload.conditionStep, payload.conditionOptions ?? {});
      }
    }

    return {
      type: 'talent',
      actorId: actor.id,
      itemId: item?.id ?? null,
      targetId: target?.id ?? null
    };
  }

  /**
   * Handle reaction ability activation (Block, Deflect, Redirect Shot, etc.).
   * Reactions are gated as per-round limits by the caller setting limitType = ROUND.
   * @private
   */
  static async _executeReaction(actor, target, item, payload = {}) {
    return {
      type: 'reaction',
      actorId: actor.id,
      itemId: item?.id ?? null,
      targetId: target?.id ?? null
    };
  }

  /**
   * Handle general ability activation (catch-all).
   * @private
   */
  static async _executeGeneral(actor, target, item, payload = {}) {
    return {
      type: 'general',
      actorId: actor.id,
      itemId: item?.id ?? null,
      targetId: target?.id ?? null
    };
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  /**
   * Validate an AbilityExecutionRequest. Returns error string or null.
   * @param {AbilityExecutionRequest} req
   * @returns {string|null}
   * @private
   */
  static _validateRequest(req) {
    if (!req || typeof req !== 'object') return 'Request must be an object';
    if (!req.abilityId || typeof req.abilityId !== 'string') return 'abilityId must be a non-empty string';
    if (!req.executionType) return 'executionType is required';
    if (!Object.values(ExecutionType).includes(req.executionType)) {
      return `Unknown executionType: "${req.executionType}"`;
    }
    if (!req.actor?.id) return 'actor with a valid id is required';
    return null;
  }

  // ─── Convenience Factory Methods ─────────────────────────────────────────

  /**
   * Convenience: fire a once-per-encounter talent ability.
   *
   * @param {Object} actor
   * @param {string} abilityId
   * @param {Object} [options]
   * @returns {Promise<ExecutionResult>}
   */
  static executeEncounterTalent(actor, abilityId, options = {}) {
    return AbilityExecutionRouter.execute({
      abilityId,
      executionType: ExecutionType.TALENT,
      actor,
      limitType: LimitType.ENCOUNTER,
      maxUses: 1,
      ...options
    });
  }

  /**
   * Convenience: fire a once-per-round reaction.
   *
   * @param {Object} actor
   * @param {string} abilityId
   * @param {Object} [options]
   * @returns {Promise<ExecutionResult>}
   */
  static executeReaction(actor, abilityId, options = {}) {
    return AbilityExecutionRouter.execute({
      abilityId,
      executionType: ExecutionType.REACTION,
      actor,
      limitType: LimitType.ROUND,
      maxUses: 1,
      ...options
    });
  }

  /**
   * Convenience: fire an unlimited force power.
   *
   * @param {Object} actor
   * @param {string} abilityId
   * @param {Object} [options]
   * @returns {Promise<ExecutionResult>}
   */
  static executeForcePower(actor, abilityId, options = {}) {
    return AbilityExecutionRouter.execute({
      abilityId,
      executionType: ExecutionType.FORCE_POWER,
      actor,
      limitType: LimitType.UNLIMITED,
      ...options
    });
  }
}

export default AbilityExecutionRouter;
