/**
 * ActionPolicyController — Enforcement Strategy Layer
 *
 * Decides what to do with ActionEngine results based on GM policy.
 * Does NOT calculate action economy (that's ActionEngine).
 * Does NOT mutate state (that's ActorEngine).
 * Does NOT render UI (that's sheets).
 *
 * Three modes:
 * - STRICT: Block illegal actions, grey buttons
 * - LOOSE: Allow action but warn GM (recommended)
 * - NONE: Track only, no enforcement
 *
 * All violations reported to Sentinel for oversight.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/sentinel/sentinel-engine.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ActionPolicyController {
  // Enforcement mode enum
  static MODE = {
    STRICT: "strict",
    LOOSE: "loose",
    NONE: "none"
  };

  /**
   * Handle action economy result based on GM policy
   *
   * @param {Object} options
   * @param {Actor} options.actor - Actor performing action
   * @param {Object} options.result - Result from ActionEngine.consume()
   * @param {string} options.actionName - Display name ("attack", "recover", etc.)
   * @param {Object} [options.context] - Optional extra context
   * @param {boolean} [options.gmOverride] - Force allow (from Shift+Click). GM-only.
   * @returns {Object} {
   *   permitted: boolean,
   *   uiState: {
   *     disable: boolean,
   *     tooltip: string | null
   *   }
   * }
   */
  static handle({ actor, result, actionName, context = {}, gmOverride = false }) {
    if (!actor || !result) {
      console.error("[SWSE] ActionPolicyController.handle missing required args");
      return {
        permitted: true,
        uiState: { disable: false, tooltip: null }
      };
    }

    const mode = HouseRuleService.getString('actionEconomyMode', this.MODE.LOOSE);

    // GM OVERRIDE: Shift+Click (STRICT mode only, GM-only)
    if (gmOverride && game.user.isGM && mode === this.MODE.STRICT) {
      this._reportViolation(actor, result, actionName, "GM_OVERRIDE");
      return {
        permitted: true,
        uiState: {
          disable: false,
          tooltip: "GM override applied (Shift+Click)."
        }
      };
    }

    // NONE mode: No enforcement
    if (mode === this.MODE.NONE) {
      return {
        permitted: true,
        uiState: { disable: false, tooltip: null }
      };
    }

    // Action allowed: No violation
    if (result.allowed) {
      return {
        permitted: true,
        uiState: { disable: false, tooltip: null }
      };
    }

    // Action blocked: Build violation message
    const message = this._buildMessage(result, actionName);

    // LOOSE mode: Allow but warn
    if (mode === this.MODE.LOOSE) {
      this._reportViolation(actor, result, actionName, "WARN");
      return {
        permitted: true,
        uiState: {
          disable: false,
          tooltip: message
        }
      };
    }

    // STRICT mode: Block action
    if (mode === this.MODE.STRICT) {
      this._reportViolation(actor, result, actionName, "ERROR");
      return {
        permitted: false,
        uiState: {
          disable: true,
          tooltip: message
        }
      };
    }

    // Unknown mode: Fail safe to allow
    return {
      permitted: true,
      uiState: { disable: false, tooltip: null }
    };
  }

  /**
   * Build human-readable violation message
   * @private
   */
  static _buildMessage(result, actionName) {
    if (!result.violations?.length) {
      return null;
    }

    const codes = result.violations.map((v) => this._violationLabel(v));
    return `Cannot perform ${actionName}: ${codes.join(", ")}`;
  }

  /**
   * Convert violation code to human label
   * @private
   */
  static _violationLabel(code) {
    const labels = {
      FULL_ROUND_NOT_AVAILABLE: "full-round not available",
      INSUFFICIENT_STANDARD: "no standard action",
      INSUFFICIENT_MOVE: "no move action",
      INSUFFICIENT_SWIFT: "no swift actions"
    };
    return labels[code] ?? code;
  }

  /**
   * Report violation to Sentinel for oversight
   * @private
   */
  static _reportViolation(actor, result, actionName, severity) {
    // Only GMs see violations
    if (!game.user.isGM) {
      return;
    }

    // Build report
    const combatId = game.combat?.id || "no-combat";
    const report = {
      category: "ACTION_ECONOMY",
      severity: severity,
      source: {
        actorId: actor.id,
        actorName: actor.name,
        action: actionName,
        combatId: combatId
      },
      message: `Action economy violation: ${actionName}`,
      details: {
        violations: result.violations,
        consumed: result.consumed
      },
      aggregateKey: `action-economy-${actor.id}-${combatId}`
    };

    // Send to Sentinel
    if (SentinelEngine && SentinelEngine.report) {
      SentinelEngine.report(report);
    }
  }

  /**
   * Would this result be permitted under current policy?
   * Used for preview (check without side effects).
   *
   * @param {Object} result - Result from ActionEngine
   * @returns {boolean}
   */
  static wouldPermit(result) {
    const mode = HouseRuleService.getString('actionEconomyMode', this.MODE.LOOSE);

    if (mode === this.MODE.NONE) {
      return true;
    }

    if (result.allowed) {
      return true;
    }

    if (mode === this.MODE.LOOSE) {
      return true; // LOOSE allows even violations
    }

    return false; // STRICT blocks
  }
}

export default ActionPolicyController;
