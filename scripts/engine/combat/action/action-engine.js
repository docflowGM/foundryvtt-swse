/**
 * ActionEngine — Turn-Based Action Economy
 *
 * Manages action point allocation and consumption during combat turns.
 * Pure, deterministic rule engine for SWSE action economy.
 *
 * RULES (SWSE Core Rules):
 * - One standard action + one move action per turn (equivalent to Full Round)
 * - Can degrade: Full-round → Standard + Move, Standard → Move, Move → Swift
 * - Swift actions can be taken repeatedly (up to 1 per turn typically)
 * - No upward conversion: Can't assemble Full from partial actions
 * - No carry-over: Unused actions are lost
 *
 * ACTION HIERARCHY (downward only):
 * Full-round (requires all three) → Standard + Move → Move → Swift
 *
 * GOVERNANCE:
 * - Pure: Returns new state, doesn't mutate
 * - Deterministic: Same input = same output
 * - Side-effect-free: No actor updates, no chat posts
 * - Read-only: Only reads actor.system.combat (doesn't modify)
 */

/**
 * Turn State Object
 * Tracks action consumption for a single turn
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
 * Action Engine - Pure turn-based action economy
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

    return {
      actorId: actor.id,
      hasStandardAction: true,
      hasMoveAction: true,
      swiftActionsUsed: 0,
      maxSwiftActions: actor.system?.combatActions?.maxSwiftPerTurn ?? 1,
      actionsUsed: []
    };
  }

  /**
   * Check if requested action can be consumed from turn state.
   * Rules:
   * - Full-round consumes both standard and move
   * - Standard consumes standard action
   * - Move consumes move action
   * - Swift can be consumed if below max (and degrades if needed)
   *
   * @param {TurnState} turnState - Current turn state
   * @param {ActionCost} requestedCost - Cost of requested action
   * @returns {Object} { allowed: boolean, reason: string|null }
   */
  static canConsume(turnState, requestedCost) {
    if (!turnState || !requestedCost) {
      return {
        allowed: false,
        reason: 'Invalid turnState or requestedCost'
      };
    }

    const { standard = 0, move = 0, swift = 0 } = requestedCost;

    // Standard action required but unavailable
    if (standard > 0 && !turnState.hasStandardAction) {
      return {
        allowed: false,
        reason: 'Standard action unavailable'
      };
    }

    // Move action required but unavailable (check if can degrade to swift)
    if (move > 0 && !turnState.hasMoveAction) {
      // Can degrade move → swift if swift available
      const degradedSwiftNeeded = (swift || 0) + 1;
      if (turnState.swiftActionsUsed + degradedSwiftNeeded > turnState.maxSwiftActions) {
        return {
          allowed: false,
          reason: 'Move action unavailable and cannot degrade to swift (out of swift actions)'
        };
      }
      // Degradation possible, allowed
      return { allowed: true, reason: null, degraded: true, newCost: { standard, move: 0, swift: degradedSwiftNeeded } };
    }

    // Swift actions
    if (swift > 0 && turnState.swiftActionsUsed + swift > turnState.maxSwiftActions) {
      return {
        allowed: false,
        reason: `Swift action limit exceeded (${turnState.swiftActionsUsed}/${turnState.maxSwiftActions} used)`
      };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Consume action from turn state.
   * Applies SWSE degradation rules:
   * - Standard unavailable → degrade to Move (if available)
   * - Move unavailable → degrade to Swift (if available)
   * - Swift unavailable → blocked
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

    // Default costs by action type
    const costMap = {
      standard: { standard: 1, move: 0, swift: 0 },
      move: { standard: 0, move: 1, swift: 0 },
      swift: { standard: 0, move: 0, swift: 1 },
      full: { standard: 1, move: 1, swift: 0 }
    };

    const requestedCost = cost || costMap[actionType] || costMap.standard;

    // Check if action can be consumed
    const canCheck = this.canConsume(turnState, requestedCost);

    if (!canCheck.allowed) {
      return {
        allowed: false,
        updatedTurnState: turnState,
        reason: canCheck.reason,
        degradedAction: null
      };
    }

    // Copy turnState to avoid mutation
    const updated = {
      ...turnState,
      actionsUsed: [...turnState.actionsUsed]
    };

    const finalCost = canCheck.degraded ? canCheck.newCost : requestedCost;
    let degradedAction = null;

    // Apply cost to updated state
    if (finalCost.standard > 0) {
      if (updated.hasStandardAction) {
        updated.hasStandardAction = false;
        updated.actionsUsed.push('standard');
      } else {
        // Should have been caught in canConsume, but defensive
        return {
          allowed: false,
          updatedTurnState: turnState,
          reason: 'Standard action unavailable (unexpected)',
          degradedAction: null
        };
      }
    }

    if (finalCost.move > 0) {
      if (updated.hasMoveAction) {
        updated.hasMoveAction = false;
        updated.actionsUsed.push('move');
      } else if (finalCost.swift < requestedCost.swift + 1) {
        // Degrade move to swift
        degradedAction = 'move→swift';
        finalCost.swift = (finalCost.swift || 0) + 1;
      } else {
        return {
          allowed: false,
          updatedTurnState: turnState,
          reason: 'Move action unavailable (unexpected)',
          degradedAction: null
        };
      }
    }

    if (finalCost.swift > 0) {
      if (updated.swiftActionsUsed + finalCost.swift <= updated.maxSwiftActions) {
        updated.swiftActionsUsed += finalCost.swift;
        updated.actionsUsed.push(`swift×${finalCost.swift}`);
      } else {
        return {
          allowed: false,
          updatedTurnState: turnState,
          reason: 'Swift action limit exceeded (unexpected)',
          degradedAction: null
        };
      }
    }

    return {
      allowed: true,
      updatedTurnState: updated,
      reason: null,
      degradedAction: degradedAction,
      consumedCost: finalCost
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
}

export default ActionEngine;
