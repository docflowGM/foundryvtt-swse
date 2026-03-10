/**
 * ActionEngine — Legacy Compatibility Wrapper
 *
 * DEPRECATED: This module is now a compatibility adapter for legacy code.
 * The canonical ActionEngine is in action-engine-v2.js (pure, state-based).
 *
 * This wrapper translates the old interface (TurnState + canConsume/consumeAction)
 * into V2's modern interface (state objects + consume).
 *
 * All new code should import from action-engine-v2.js directly.
 * This wrapper exists only to avoid breaking enhanced-rolls.js and other
 * legacy consumers.
 *
 * RULES (SWSE Core Rules):
 * - One standard action + one move action per turn (equivalent to Full Round)
 * - Can degrade: Standard → Move → Swift (DOWNWARD ONLY, no upward conversion)
 * - Swift actions can be taken repeatedly (up to 1 per turn typically)
 * - No upward conversion: Can't assemble Full from partial actions
 * - No carry-over: Unused actions are lost
 */

import ActionEngineV2 from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";

/**
 * Turn State Object (Legacy format)
 *
 * @typedef {Object} TurnState
 * @property {string} actorId - Actor identifier
 * @property {boolean} hasStandardAction - Standard action available
 * @property {boolean} hasMoveAction - Move action available
 * @property {number} swiftActionsUsed - Swift actions used this turn
 * @property {number} maxSwiftActions - Max swift actions allowed (usually 1)
 * @property {string[]} actionsUsed - Log of consumed actions this turn
 */

/**
 * Action Consumption Cost
 *
 * @typedef {Object} ActionCost
 * @property {0|1} standard - Costs 0 or 1 standard action
 * @property {0|1} move - Costs 0 or 1 move action
 * @property {0|1|number} swift - Costs N swift actions
 */

/**
 * Convert legacy TurnState to V2 format
 * @private
 */
function _legacyToV2(legacyState, maxSwift = 1) {
  return {
    remaining: {
      standard: legacyState.hasStandardAction ? 1 : 0,
      move: legacyState.hasMoveAction ? 1 : 0,
      swift: Math.max(0, legacyState.maxSwiftActions - legacyState.swiftActionsUsed)
    },
    degraded: { standard: 0, move: 0, swift: 0 },
    fullRoundUsed: false
  };
}

/**
 * Convert V2 state back to legacy TurnState
 * @private
 */
function _v2ToLegacy(v2State, actorId = 'unknown', maxSwift = 1) {
  return {
    actorId,
    hasStandardAction: v2State.remaining.standard > 0,
    hasMoveAction: v2State.remaining.move > 0,
    swiftActionsUsed: Math.max(0, maxSwift - v2State.remaining.swift),
    maxSwiftActions: maxSwift,
    actionsUsed: []
  };
}

/**
 * ActionEngine - Pure turn-based action economy (Legacy wrapper)
 *
 * @class ActionEngine
 */
export class ActionEngine {
  /**
   * Initialize turn for an actor.
   * Resets action economy to fresh state (one standard + one move).
   *
   * @param {Actor} actor - Foundry actor object
   * @returns {TurnState} Fresh turn state
   */
  static startTurn(actor) {
    if (!actor) {
      throw new Error('ActionEngine.startTurn requires actor');
    }

    const maxSwift = actor.system?.combatActions?.maxSwiftPerTurn ?? 1;

    return {
      actorId: actor.id,
      hasStandardAction: true,
      hasMoveAction: true,
      swiftActionsUsed: 0,
      maxSwiftActions: maxSwift,
      actionsUsed: []
    };
  }

  /**
   * Check if requested action can be consumed from turn state.
   *
   * DEGRADATION RULES (SWSE Core):
   * - Standard action: Can degrade to Move → Swift (downward only)
   * - Move action: Can degrade to Swift (downward only)
   * - Swift action: Cannot degrade (terminal action)
   *
   * @param {TurnState} turnState - Current turn state
   * @param {ActionCost} requestedCost - Cost of requested action
   * @returns {Object} { allowed: boolean, reason: string|null, degraded?: boolean, newCost?: ActionCost }
   */
  static canConsume(turnState, requestedCost) {
    if (!turnState || !requestedCost) {
      return {
        allowed: false,
        reason: 'Invalid turnState or requestedCost'
      };
    }

    // Convert to V2 format for calculation
    const v2State = _legacyToV2(turnState, turnState.maxSwiftActions);

    // Convert cost format
    const v2Cost = {
      standard: requestedCost.standard || 0,
      move: requestedCost.move || 0,
      swift: requestedCost.swift || 0
    };

    // Use V2 preview to check if this is allowed
    const previewResult = ActionEngineV2.previewConsume(v2State, v2Cost);

    if (!previewResult.allowed) {
      return {
        allowed: false,
        reason: previewResult.violations.join(', ')
      };
    }

    return {
      allowed: true,
      reason: null,
      degraded: false  // Legacy format doesn't track degradation type
    };
  }

  /**
   * Consume action from turn state.
   * Applies SWSE degradation rules.
   *
   * Returns new turn state without mutating input.
   *
   * @param {TurnState} turnState - Current turn state
   * @param {Object} options - Action to consume
   * @param {string} options.actionType - "standard" | "move" | "swift" | "full"
   * @param {ActionCost} options.cost - Explicit cost override (optional)
   * @returns {Object} { allowed, updatedTurnState, reason, degradedAction }
   */
  static consumeAction(turnState, options = {}) {
    if (!turnState) {
      return {
        allowed: false,
        updatedTurnState: turnState,
        reason: 'Invalid turnState'
      };
    }

    const { actionType = 'standard', cost = null } = options;

    // Convert to V2 format
    const v2State = _legacyToV2(turnState, turnState.maxSwiftActions);

    // Determine cost
    let v2Cost = { standard: 0, move: 0, swift: 0 };
    if (cost) {
      v2Cost = cost;
    } else {
      const costMap = {
        standard: { standard: 1, move: 0, swift: 0 },
        move: { standard: 0, move: 1, swift: 0 },
        swift: { standard: 0, move: 0, swift: 1 },
        full: { fullRound: true, standard: 0, move: 0, swift: 0 }
      };
      v2Cost = costMap[actionType] || costMap.standard;
    }

    // Consume using V2 engine
    const v2Result = ActionEngineV2.consume(v2State, v2Cost);

    // Convert result back to legacy format
    const updatedTurnState = _v2ToLegacy(v2Result.turnState, turnState.actorId, turnState.maxSwiftActions);

    return {
      allowed: v2Result.allowed,
      updatedTurnState,
      reason: v2Result.violations.length > 0 ? v2Result.violations.join(', ') : null,
      degradedAction: null,  // Legacy format doesn't track this detail
      consumedCost: v2Cost
    };
  }

  /**
   * Get human-readable action state summary.
   * For UI display and diagnostics.
   *
   * @param {TurnState} turnState - Turn state to summarize
   * @returns {Object} { standard, move, swift, summary }
   */
  static summarizeState(turnState) {
    return {
      standard: turnState.hasStandardAction ? 'available' : 'consumed',
      move: turnState.hasMoveAction ? 'available' : 'consumed',
      swift: `${turnState.swiftActionsUsed}/${turnState.maxSwiftActions} used`,
      summary: [
        turnState.hasStandardAction ? 'Standard' : null,
        turnState.hasMoveAction ? 'Move' : null,
        turnState.swiftActionsUsed < turnState.maxSwiftActions ? `Swift (${turnState.maxSwiftActions - turnState.swiftActionsUsed} left)` : null
      ].filter(Boolean).join(', ') || 'No actions remaining'
    };
  }

  /**
   * Get visual state for UI indicator.
   * Maps turn state to visual representations (available/used/degraded).
   *
   * @param {TurnState} turnState - Turn state to visualize
   * @returns {Object} { full, standard, move, swift }
   */
  static getVisualState(turnState) {
    const full = (!turnState.hasStandardAction && !turnState.hasMoveAction) ? 'used' : 'available';
    const standard = turnState.hasStandardAction ? 'available' : 'used';
    const move = turnState.hasMoveAction ? 'available' : (turnState.swiftActionsUsed > 0 ? 'degraded' : 'used');
    const swift = turnState.swiftActionsUsed >= turnState.maxSwiftActions ? 'used' : 'available';

    return { full, standard, move, swift };
  }

  /**
   * Get detailed breakdown for tooltip.
   * Shows what actions were used and how they degraded.
   *
   * @param {TurnState} turnState - Turn state to explain
   * @returns {Array<string>} Tooltip lines explaining the state
   */
  static getTooltipBreakdown(turnState) {
    const lines = [];

    if (!turnState.hasStandardAction) {
      lines.push('Standard action used.');
    }
    if (!turnState.hasMoveAction) {
      lines.push('Move action used or degraded.');
    }
    if (turnState.swiftActionsUsed > 0) {
      lines.push(`Swift actions: ${turnState.swiftActionsUsed}/${turnState.maxSwiftActions} used.`);
      if (turnState.swiftActionsUsed < turnState.maxSwiftActions) {
        lines.push(`${turnState.maxSwiftActions - turnState.swiftActionsUsed} swift actions remaining.`);
      }
    } else if (turnState.maxSwiftActions > 0) {
      lines.push(`Swift actions: ${turnState.maxSwiftActions} remaining.`);
    }

    return lines.length > 0 ? lines : ['No actions used this turn.'];
  }
}

export default ActionEngine;
