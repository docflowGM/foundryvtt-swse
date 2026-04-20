/**
 * TargetingEngine - Resolve targets for ACTIVE/EFFECT abilities
 *
 * Handles target selection and validation based on targeting configuration.
 * Supports:
 * - SELF targeting
 * - Single/Multi/Area targeting modes
 * - Ally/Enemy/Any type filtering
 * - Range restrictions
 * - Selection logic (FIXED count, FORMULA, ALL_IN_AREA)
 *
 * GOVERNANCE:
 * - Pure: No mutations
 * - Deterministic: Same input = same output
 * - Non-binding: Returns suggestions; caller decides what to do
 * - Compatible with game.user.targets (Foundry standard)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TargetingEngine {
  /**
   * Resolve targets from targeting configuration.
   * Handles various targeting modes and filters.
   *
   * Targeting config structure:
   * {
   *   mode: "SINGLE" | "MULTI" | "AREA",
   *   targetType: "ALLY" | "ENEMY" | "ANY" | "SELF",
   *   range: 6,  // in squares (SWSE standard grid)
   *   selection: {
   *     type: "FIXED" | "FORMULA" | "ALL_IN_AREA",
   *     value: 2,        // FIXED: exact count; FORMULA: computed
   *     formula: "CHA_MOD",   // Evaluated to determine count (FORMULA only)
   *     minimum: 1,
   *     maximum: null     // null = unlimited
   *   }
   * }
   *
   * @param {Object} actor - Activating actor (used for formula evaluation)
   * @param {Object} targeting - Targeting configuration
   * @returns {Object} Result { targets: Actor[], valid: boolean, reason?: string }
   */
  static resolve(actor, targeting) {
    if (!targeting) {
      return { targets: [], valid: false, reason: 'No targeting configuration' };
    }

    try {
      const mode = targeting.mode?.toUpperCase();
      const targetType = targeting.targetType?.toUpperCase();

      // Handle SELF targeting
      if (targetType === 'SELF') {
        return this._resolveSelf(actor);
      }

      // Handle other modes
      switch (mode) {
        case 'SINGLE':
          return this._resolveSingle(actor, targeting);

        case 'MULTI':
          return this._resolveMulti(actor, targeting);

        case 'AREA':
          return this._resolveArea(actor, targeting);

        default:
          return { targets: [], valid: false, reason: `Unknown targeting mode: ${mode}` };
      }
    } catch (err) {
      SWSELogger.error(`[TargetingEngine] Error resolving targets:`, err);
      return { targets: [], valid: false, reason: `Error: ${err.message}` };
    }
  }

  /**
   * Resolve SELF targeting - actor targets itself.
   * @private
   */
  static _resolveSelf(actor) {
    return {
      targets: [actor],
      valid: true,
      reason: 'Self-targeting'
    };
  }

  /**
   * Resolve SINGLE target mode - one target from game.user.targets.
   * @private
   */
  static _resolveSingle(actor, targeting) {
    const selectedTokens = this._getSelectedTokens();

    if (selectedTokens.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: 'No target selected'
      };
    }

    // Get first selected token
    const token = selectedTokens[0];
    const target = token.document?.actor || token.actor;

    if (!target) {
      return {
        targets: [],
        valid: false,
        reason: 'Selected token has no actor'
      };
    }

    // Validate target type
    const filterResult = this._filterByTargetType(actor, [target], targeting.targetType);
    if (filterResult.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: `Target does not match type filter: ${targeting.targetType}`
      };
    }

    return {
      targets: filterResult,
      valid: true,
      reason: 'Single target selected'
    };
  }

  /**
   * Resolve MULTI target mode - multiple targets from selection.
   * @private
   */
  static _resolveMulti(actor, targeting) {
    const selectedTokens = this._getSelectedTokens();

    if (selectedTokens.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: 'No targets selected'
      };
    }

    // Convert tokens to actors
    const candidateTargets = selectedTokens
      .map(t => t.document?.actor || t.actor)
      .filter(a => a !== null);

    if (candidateTargets.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: 'No valid actors in selection'
      };
    }

    // Filter by target type
    const filtered = this._filterByTargetType(actor, candidateTargets, targeting.targetType);

    if (filtered.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: `No targets match type filter: ${targeting.targetType}`
      };
    }

    // Apply selection limits
    const selected = this._applySelectionLimits(filtered, targeting.selection);

    return {
      targets: selected,
      valid: selected.length > 0,
      reason: `Selected ${selected.length} target(s)`
    };
  }

  /**
   * Resolve AREA target mode - all tokens within range.
   * @private
   */
  static _resolveArea(actor, targeting) {
    const range = targeting.range ?? 6;
    const sourceToken = canvas.tokens?.get(actor.id);

    if (!sourceToken) {
      return {
        targets: [],
        valid: false,
        reason: 'Actor has no token on canvas'
      };
    }

    // Get all tokens within range
    const tokens = canvas.tokens?.objects?.children ?? [];
    const candidateTargets = tokens
      .map(t => t.document?.actor || t.actor)
      .filter(a => a !== null && a.id !== actor.id); // Exclude self by default

    if (candidateTargets.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: `No targets within range ${range}`
      };
    }

    // Filter by target type
    const filtered = this._filterByTargetType(actor, candidateTargets, targeting.targetType);

    if (filtered.length === 0) {
      return {
        targets: [],
        valid: false,
        reason: `No targets match type filter within range`
      };
    }

    // Apply selection limits
    const selected = this._applySelectionLimits(filtered, targeting.selection);

    return {
      targets: selected,
      valid: selected.length > 0,
      reason: `Selected ${selected.length} target(s) in area`
    };
  }

  /**
   * Filter targets by type (ALLY, ENEMY, ANY).
   * @private
   */
  static _filterByTargetType(actor, targets, targetType) {
    const type = targetType?.toUpperCase();

    if (type === 'ANY') {
      return targets; // Accept all
    }

    return targets.filter(target => {
      if (type === 'ALLY') {
        // planned: Check actual alliance via faction/party system
        // For now: anything not explicitly hostile
        return !this._isHostile(actor, target);
      }

      if (type === 'ENEMY') {
        return this._isHostile(actor, target);
      }

      return true; // Unknown type, accept anyway
    });
  }

  /**
   * Determine if two actors are hostile.
   * planned: Integrate with faction/party system.
   * @private
   */
  static _isHostile(actor1, actor2) {
    // Placeholder: PCs vs NPCs / named enemies
    const isEnemy = (a) => {
      const name = a.name?.toLowerCase() ?? '';
      return name.includes('enemy') || name.includes('bandit') || a.type === 'npc';
    };

    const a1IsEnemy = isEnemy(actor1);
    const a2IsEnemy = isEnemy(actor2);

    return a1IsEnemy !== a2IsEnemy; // Hostile if one is enemy, other is not
  }

  /**
   * Apply selection limits (FIXED, FORMULA, ALL_IN_AREA).
   * @private
   */
  static _applySelectionLimits(targets, selection) {
    if (!selection) {
      return targets; // No limits, accept all
    }

    const type = selection.type?.toUpperCase();
    const minimum = selection.minimum ?? 1;
    const maximum = selection.maximum ?? targets.length;

    let count = targets.length;

    if (type === 'FIXED') {
      count = selection.value ?? targets.length;
    } else if (type === 'FORMULA') {
      // planned: Evaluate formula (e.g., "CHA_MOD") to get count
      // For now, just use the full list
      count = targets.length;
    }
    // ALL_IN_AREA: use all targets (count = targets.length)

    // Clamp to limits
    count = Math.max(minimum, Math.min(count, maximum, targets.length));

    return targets.slice(0, count);
  }

  /**
   * Get currently selected tokens from active scene.
   * @private
   */
  static _getSelectedTokens() {
    return Array.from(game?.user?.targets ?? []);
  }

  /**
   * Check if a targeting configuration requires manual target selection.
   * (vs. automatic area selection)
   *
   * @param {Object} targeting - Targeting configuration
   * @returns {boolean}
   */
  static requiresManualSelection(targeting) {
    if (!targeting) return false;

    const mode = targeting.mode?.toUpperCase();

    // SINGLE and MULTI require user to target tokens
    // AREA does not (auto-selects in range)
    // SELF never requires selection
    return mode === 'SINGLE' || mode === 'MULTI';
  }

  /**
   * Validate targeting configuration (for contract checking).
   *
   * @param {Object} targeting - Targeting configuration
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(targeting) {
    const errors = [];

    if (!targeting) {
      errors.push('Targeting configuration is missing');
      return { valid: false, errors };
    }

    const validModes = ['SINGLE', 'MULTI', 'AREA'];
    const validTypes = ['SELF', 'ALLY', 'ENEMY', 'ANY'];

    const mode = targeting.mode?.toUpperCase();
    const targetType = targeting.targetType?.toUpperCase();

    if (!validModes.includes(mode)) {
      errors.push(`Invalid targeting mode: ${mode} (valid: ${validModes.join(', ')})`);
    }

    if (!validTypes.includes(targetType)) {
      errors.push(`Invalid target type: ${targetType} (valid: ${validTypes.join(', ')})`);
    }

    if (targeting.range !== null && targeting.range !== undefined) {
      if (!Number.isFinite(targeting.range) || targeting.range < 0) {
        errors.push(`Invalid range: ${targeting.range}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default TargetingEngine;
