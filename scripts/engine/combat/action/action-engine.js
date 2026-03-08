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
   *
   * DEGRADATION RULES (SWSE Core):
   * - Standard action: Can degrade to Move → Swift (downward only)
   * - Move action: Can degrade to Swift (downward only)
   * - Swift action: Cannot degrade (terminal action)
   * - Full-round: Requires all actions (Standard + Move + Swift)
   *
   * Actions use resources in this order (attempting):
   * 1. Use the primary action type
   * 2. If unavailable, degrade to next lower type
   * 3. Continue down chain until resource found or chain exhausted
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

    const { standard = 0, move = 0, swift = 0 } = requestedCost;
    const swiftRemaining = turnState.maxSwiftActions - turnState.swiftActionsUsed;

    // STANDARD ACTION: Standard → Move → Swift degradation chain
    if (standard > 0) {
      if (turnState.hasStandardAction) {
        // Primary: Use Standard
        // Continue to check Move and Swift below...
      } else if (turnState.hasMoveAction) {
        // Degrade to Move
        return {
          allowed: true,
          reason: null,
          degraded: true,
          degradedFrom: 'standard→move',
          newCost: { standard: 0, move: standard, swift }
        };
      } else if (swiftRemaining >= standard) {
        // Degrade to Swift (last resort)
        return {
          allowed: true,
          reason: null,
          degraded: true,
          degradedFrom: 'standard→move→swift',
          newCost: { standard: 0, move: 0, swift: swift + standard }
        };
      } else {
        return {
          allowed: false,
          reason: 'Standard action unavailable (no degradation path available)'
        };
      }
    }

    // MOVE ACTION: Move → Swift degradation chain
    if (move > 0) {
      if (turnState.hasMoveAction) {
        // Primary: Use Move
        // Continue to check Swift below...
      } else if (swiftRemaining >= move) {
        // Degrade to Swift
        return {
          allowed: true,
          reason: null,
          degraded: true,
          degradedFrom: 'move→swift',
          newCost: { standard: 0, move: 0, swift: swift + move }
        };
      } else {
        return {
          allowed: false,
          reason: 'Move action unavailable and insufficient swift actions for degradation'
        };
      }
    }

    // SWIFT ACTION: No degradation possible
    if (swift > 0) {
      if (turnState.swiftActionsUsed + swift > turnState.maxSwiftActions) {
        return {
          allowed: false,
          reason: `Insufficient swift actions (${turnState.swiftActionsUsed}/${turnState.maxSwiftActions} used, need ${swift} more)`
        };
      }
      // Swift available
    }

    // All checks passed
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
      full: { standard: 1, move: 1, swift: 0 }  // Full-round uses Standard + Move (Swift still available)
    };

    const requestedCost = cost || costMap[actionType] || costMap.standard;

    // Check if action can be consumed (includes degradation check)
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

    // Use the cost (either original or degraded)
    const finalCost = canCheck.degraded ? canCheck.newCost : requestedCost;
    const degradedAction = canCheck.degradedFrom || null;

    // Apply Standard action cost
    if (finalCost.standard > 0) {
      if (updated.hasStandardAction) {
        updated.hasStandardAction = false;
        updated.actionsUsed.push('standard');
      } else {
        // Should have been caught by canConsume, defensive check
        return {
          allowed: false,
          updatedTurnState: turnState,
          reason: 'Standard action unavailable (unexpected)',
          degradedAction: null
        };
      }
    }

    // Apply Move action cost
    if (finalCost.move > 0) {
      if (updated.hasMoveAction) {
        updated.hasMoveAction = false;
        updated.actionsUsed.push('move');
      } else {
        // Should have been caught by canConsume, defensive check
        return {
          allowed: false,
          updatedTurnState: turnState,
          reason: 'Move action unavailable (unexpected)',
          degradedAction: null
        };
      }
    }

    // Apply Swift action cost
    if (finalCost.swift > 0) {
      if (updated.swiftActionsUsed + finalCost.swift <= updated.maxSwiftActions) {
        updated.swiftActionsUsed += finalCost.swift;
        updated.actionsUsed.push(`swift×${finalCost.swift}`);
      } else {
        // Should have been caught by canConsume, defensive check
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
      degradedAction: degradedAction,  // Now includes degradedFrom path
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
