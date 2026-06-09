/**
 * ActionEngine — Turn-State Calculator (Pure, Deterministic)
 *
 * Represents SWSE turn economy as explicit state:
 * - remaining: How many of each action type are left
 * - degraded: Which lower-cost actions were paid for by sacrificing a higher-cost action
 * - fullRoundUsed: Whether a full-round action was consumed
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
   * Initialize fresh turn state.
   * SWSE baseline: one standard, one move, and one swift action.
   *
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
   * Normalize an action-economy type string.
   *
   * @param {string|Object} value
   * @returns {string}
   */
  static normalizeActionType(value) {
    if (value && typeof value === 'object') {
      return this.normalizeActionType(value.type ?? value.actionType ?? value.key ?? value.value);
    }
    const raw = String(value ?? 'standard')
      .trim()
      .toLowerCase()
      .replace(/[_]+/g, '-')
      .replace(/\s+/g, ' ');
    if (!raw) return 'standard';
    if (raw.includes('full')) return 'full-round';
    if (raw.includes('reaction') || raw.includes('immediate')) return 'reaction';
    if (raw.includes('free')) return 'free';
    if (raw.includes('swift')) return 'swift';
    if (raw.includes('move')) return 'move';
    if (raw.includes('standard')) return 'standard';
    if (raw.includes('passive')) return 'passive';
    return raw;
  }

  /**
   * Convert a normalized action type into the pure-engine cost object.
   * Free, passive, and reaction costs are not consumed by this engine; reaction
   * accounting lives in ActionEconomyPersistence because reactions have their
   * own per-trigger/per-round lifecycle.
   *
   * @param {string|Object} actionType
   * @returns {Object}
   */
  static costForActionType(actionType) {
    const type = this.normalizeActionType(actionType);
    if (type === 'full-round') return { fullRound: true, standard: 1, move: 1, swift: 1 };
    if (type === 'standard') return { standard: 1 };
    if (type === 'move') return { move: 1 };
    if (type === 'swift') return { swift: 1 };
    return {};
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
    const clone = this._clone(this._normalizeState(turnState));
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
    return this._consumeInternal(this._clone(this._normalizeState(turnState)), cost);
  }

  /**
   * Core consumption logic (private).
   *
   * RAW direction matters:
   * - Standard may be sacrificed for Move or Swift.
   * - Move may be sacrificed for Swift.
   * - Move/Swift cannot be upgraded into Standard.
   * - Full-Round consumes the actor's standard, move, and swift economy.
   *
   * @private
   */
  static _consumeInternal(state, rawCost = {}) {
    const original = this._clone(state);
    const cost = this._normalizeCost(rawCost);
    const violations = [];
    const consumed = { standard: 0, move: 0, swift: 0 };

    const fail = (code) => {
      if (code) violations.push(code);
      return {
        allowed: false,
        turnState: original,
        violations,
        consumed: { standard: 0, move: 0, swift: 0 }
      };
    };

    if (state.fullRoundUsed) {
      return fail('FULL_ROUND_ALREADY_USED');
    }

    // FULL-ROUND: consumes the round's Standard + Move + Swift economy.
    // Do not allow partially assembled full-round actions after any of those
    // core actions have already been spent.
    if (cost.fullRound) {
      if ((state.remaining.standard ?? 0) < 1) return fail('INSUFFICIENT_STANDARD');
      if ((state.remaining.move ?? 0) < 1) return fail('INSUFFICIENT_MOVE');
      if ((state.remaining.swift ?? 0) < 1) return fail('INSUFFICIENT_SWIFT');

      consumed.standard = state.remaining.standard;
      consumed.move = state.remaining.move;
      consumed.swift = state.remaining.swift;
      state.remaining.standard = 0;
      state.remaining.move = 0;
      state.remaining.swift = 0;
      state.fullRoundUsed = true;

      return { allowed: true, turnState: state, violations, consumed };
    }

    const spendSource = (source, target) => {
      if ((state.remaining[source] ?? 0) <= 0) return false;
      state.remaining[source]--;
      consumed[source]++;
      if (source !== target) state.degraded[target] = (state.degraded[target] ?? 0) + 1;
      return true;
    };

    const payStandard = () => spendSource('standard', 'standard');

    const payMove = () => {
      if (spendSource('move', 'move')) return true;
      return spendSource('standard', 'move');
    };

    const paySwift = () => {
      if (spendSource('swift', 'swift')) return true;
      if (spendSource('move', 'swift')) return true;
      return spendSource('standard', 'swift');
    };

    for (let i = 0; i < cost.standard; i++) {
      if (!payStandard()) return fail('INSUFFICIENT_STANDARD');
    }

    for (let i = 0; i < cost.move; i++) {
      if (!payMove()) return fail('INSUFFICIENT_MOVE');
    }

    for (let i = 0; i < cost.swift; i++) {
      if (!paySwift()) return fail('INSUFFICIENT_SWIFT');
    }

    return {
      allowed: violations.length === 0,
      turnState: state,
      violations,
      consumed
    };
  }

  /**
   * Map turn state to visual display states.
   *
   * @param {Object} turnState - Turn state
   * @returns {Object} { standard, move, swift, full }
   *   - "available": unused action
   *   - "degraded": a higher action was sacrificed into this action type
   *   - "used": consumed completely
   */
  static getVisualState(turnState) {
    const normalized = this._normalizeState(turnState);
    const stateMap = {};

    ['standard', 'move', 'swift'].forEach((type) => {
      if ((normalized.remaining[type] ?? 0) > 0) {
        stateMap[type] = 'available';
      } else if ((normalized.degraded[type] ?? 0) > 0) {
        stateMap[type] = 'degraded';
      } else {
        stateMap[type] = 'used';
      }
    });

    stateMap.full = normalized.fullRoundUsed
      ? 'used'
      : ((normalized.remaining.standard ?? 0) > 0 && (normalized.remaining.move ?? 0) > 0 && (normalized.remaining.swift ?? 0) > 0 ? 'available' : 'used');

    return stateMap;
  }

  /**
   * Get human-readable breakdown for tooltips.
   *
   * @param {Object} turnState - Turn state
   * @returns {string[]} Lines explaining state
   */
  static getTooltipBreakdown(turnState) {
    const state = this._normalizeState(turnState);
    const lines = [];

    if (state.fullRoundUsed) {
      lines.push('Full-round action used.');
    } else if ((state.remaining.standard ?? 0) > 0 && (state.remaining.move ?? 0) > 0 && (state.remaining.swift ?? 0) > 0) {
      lines.push('Full-round action available.');
    } else {
      lines.push('Full-round action unavailable after spending Standard, Move, or Swift.');
    }

    if ((state.remaining.standard ?? 0) > 0) {
      lines.push('Standard action available.');
    } else {
      lines.push('Standard action used.');
    }

    if ((state.remaining.move ?? 0) > 0) {
      lines.push('Move action available.');
    } else {
      lines.push('Move action used.');
    }

    if ((state.remaining.swift ?? 0) > 0) {
      lines.push(`Swift actions: ${state.remaining.swift} remaining.`);
    } else {
      lines.push('Swift actions: none remaining.');
    }

    if ((state.degraded.move ?? 0) > 0) {
      lines.push('Standard action sacrificed for a Move action.');
    }
    if ((state.degraded.swift ?? 0) > 0) {
      lines.push('Standard/Move action sacrificed for a Swift action.');
    }

    return lines.length > 0 ? lines : ['No actions remaining.'];
  }

  static _normalizeState(state = {}) {
    const base = this.startTurn();
    const remaining = { ...base.remaining, ...(state?.remaining ?? {}) };
    const degraded = { ...base.degraded, ...(state?.degraded ?? {}) };
    for (const type of ['standard', 'move', 'swift']) {
      remaining[type] = Math.max(0, Number(remaining[type]) || 0);
      degraded[type] = Math.max(0, Number(degraded[type]) || 0);
    }
    return {
      ...base,
      ...(state ?? {}),
      remaining,
      degraded,
      fullRoundUsed: state?.fullRoundUsed === true
    };
  }

  static _normalizeCost(cost = {}) {
    if (typeof cost === 'string') return this.costForActionType(cost);
    return {
      fullRound: Boolean(cost?.fullRound ?? cost?.fullround ?? cost?.['full-round']),
      standard: Math.max(0, Number(cost?.standard ?? 0) || 0),
      move: Math.max(0, Number(cost?.move ?? 0) || 0),
      swift: Math.max(0, Number(cost?.swift ?? 0) || 0)
    };
  }

  /**
   * Deep clone state (safe for modification).
   * @private
   */
  static _clone(state) {
    return JSON.parse(JSON.stringify(state ?? {}));
  }
}

export default ActionEngine;
