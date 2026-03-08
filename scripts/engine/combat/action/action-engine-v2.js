/**
 * ActionEngine — Turn-State Calculator (Pure, Deterministic)
 *
 * Represents SWSE turn economy as explicit state:
 * - remaining: How many of each action type are left
 * - degraded: How many were obtained via degradation
 * - fullRoundUsed: Whether full-round was consumed
 *
 * CRITICAL: This engine NEVER mutates. It NEVER calls actor.update.
 * It calculates. That's it.
 *
 * Policy layer (ActionPolicyController) decides enforcement.
 * UI layer decides presentation.
 * This layer does pure math.
 */

export class ActionEngine {
  /**
   * Initialize fresh turn state
   * @returns {Object} New turn state
   */
  static startTurn() {
    return {
      remaining: { standard: 1, move: 1, swift: 1 },
      degraded: { standard: 0, move: 0, swift: 0 },
      fullRoundUsed: false
    };
  }

  /**
   * Preview consumption without modifying state.
   * Used for UI button greying (hover preview).
   *
   * @param {Object} turnState - Current turn state
   * @param {Object} cost - Action cost { standard, move, swift, fullRound }
   * @returns {Object} Result object (see consume())
   */
  static previewConsume(turnState, cost) {
    const clone = this._clone(turnState);
    return this._consumeInternal(clone, cost);
  }

  /**
   * Consume action from turn state.
   * Returns new state, but caller must decide whether to use it.
   *
   * @param {Object} turnState - Current turn state
   * @param {Object} cost - Action cost
   * @returns {Object} {
   *   allowed: boolean,
   *   turnState: {...},
   *   violations: string[],
   *   consumed: { standard, move, swift }
   * }
   */
  static consume(turnState, cost) {
    return this._consumeInternal(this._clone(turnState), cost);
  }

  /**
   * Core consumption logic (private)
   * @private
   */
  static _consumeInternal(state, cost) {
    const violations = [];
    const consumed = { standard: 0, move: 0, swift: 0 };

    // FULL-ROUND: Requires all actions fresh
    if (cost.fullRound) {
      if (
        state.remaining.standard === 1 &&
        state.remaining.move === 1 &&
        state.remaining.swift === 1
      ) {
        state.remaining.standard = 0;
        state.remaining.move = 0;
        state.remaining.swift = 0;
        state.fullRoundUsed = true;
        consumed.standard = 1;
        consumed.move = 1;
        return { allowed: true, turnState: state, violations, consumed };
      } else {
        violations.push("FULL_ROUND_NOT_AVAILABLE");
        return { allowed: false, turnState: state, violations, consumed };
      }
    }

    // Helper: Try to consume from pool
    const attempt = (type) => {
      if (state.remaining[type] > 0) {
        state.remaining[type]--;
        consumed[type]++;
        return true;
      }
      return false;
    };

    // Helper: Degrade one type into another
    // Example: degrade("move", "standard") = consume move, produce degraded standard
    const degrade = (from, to) => {
      if (state.remaining[from] > 0) {
        state.remaining[from]--;      // Lose source action
        state.remaining[to]++;        // Gain target action
        state.degraded[to]++;         // Mark target as degraded
        consumed[to]++;
        return true;
      }
      return false;
    };

    // STANDARD: Try Standard → Move → Swift
    const payStandard = () => {
      if (attempt("standard")) return true;
      if (degrade("move", "standard")) return true;
      if (degrade("swift", "standard")) return true;
      return false;
    };

    // MOVE: Try Move → Swift
    const payMove = () => {
      if (attempt("move")) return true;
      if (degrade("swift", "move")) return true;
      return false;
    };

    // SWIFT: No degradation (terminal)
    const paySwift = () => {
      return attempt("swift");
    };

    // PAY COSTS IN ORDER
    if (cost.standard) {
      if (!payStandard()) {
        violations.push("INSUFFICIENT_STANDARD");
      }
    }

    if (cost.move) {
      if (!payMove()) {
        violations.push("INSUFFICIENT_MOVE");
      }
    }

    if (cost.swift) {
      for (let i = 0; i < cost.swift; i++) {
        if (!paySwift()) {
          violations.push("INSUFFICIENT_SWIFT");
          break;
        }
      }
    }

    return {
      allowed: violations.length === 0,
      turnState: state,
      violations,
      consumed
    };
  }

  /**
   * Map turn state to visual display states
   * @param {Object} turnState - Turn state
   * @returns {Object} { standard, move, swift, full }
   *   - "available": unused action
   *   - "degraded": obtained via degradation (show orange)
   *   - "used": consumed completely
   */
  static getVisualState(turnState) {
    const stateMap = {};

    ["standard", "move", "swift"].forEach((type) => {
      if (turnState.remaining[type] > 0) {
        stateMap[type] = "available";
      } else if (turnState.degraded[type] > 0) {
        stateMap[type] = "degraded";
      } else {
        stateMap[type] = "used";
      }
    });

    stateMap.full = turnState.fullRoundUsed ? "used" : "available";

    return stateMap;
  }

  /**
   * Get human-readable breakdown for tooltips
   * @param {Object} turnState - Turn state
   * @returns {string[]} Lines explaining state
   */
  static getTooltipBreakdown(turnState) {
    const lines = [];

    if (turnState.fullRoundUsed) {
      lines.push("Full-round action used.");
    } else {
      if (turnState.remaining.standard > 0) {
        lines.push("Standard action available.");
      } else {
        lines.push("Standard action used.");
      }

      if (turnState.remaining.move > 0) {
        lines.push("Move action available.");
      } else if (turnState.degraded.move > 0) {
        lines.push("Move action degraded to Standard.");
      } else {
        lines.push("Move action used.");
      }
    }

    if (turnState.remaining.swift > 0) {
      lines.push(`Swift actions: ${turnState.remaining.swift} remaining.`);
    } else if (turnState.degraded.swift > 0) {
      lines.push("Swift actions used (via degradation).");
    }

    return lines.length > 0 ? lines : ["No actions remaining."];
  }

  /**
   * Deep clone state (safe for modification)
   * @private
   */
  static _clone(state) {
    return JSON.parse(JSON.stringify(state));
  }
}

export default ActionEngine;
