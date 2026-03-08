/**
 * ActionPolicyController — Enforcement Mode Layer
 *
 * Separates calculation (ActionEngine) from policy enforcement (ActionPolicyController).
 * Allows flexible enforcement modes without polluting the pure calculation layer.
 *
 * ARCHITECTURE PRINCIPLE:
 * - ActionEngine: Pure calculation, returns violations list
 * - ActionPolicyController: Decides enforcement based on policy mode
 * - UI Layer: Uses policy decision to enable/disable UI
 * - Sentinel: Observes policy violations, never called by engine
 *
 * MODES:
 * - STRICT: Prevents illegal actions (organized play, competitive)
 * - LOOSE: Warns GM only, action still executes (recommended default)
 * - NONE: Tracks only, no enforcement (pure tabletop feel)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Enforcement Mode Enumeration
 * @readonly
 * @enum {string}
 */
export const ENFORCEMENT_MODE = Object.freeze({
  STRICT: "strict",   // Block illegal actions
  LOOSE: "loose",     // Warn GM, allow execution
  NONE: "none"        // Track only, no enforcement
});

/**
 * Policy Decision Result
 *
 * @typedef {Object} PolicyResult
 * @property {boolean} permitted - Whether action is permitted under current policy
 * @property {string} mode - The enforcement mode used
 * @property {Array} violations - Rule violations detected
 * @property {boolean} shouldNotify - Whether GM should be notified
 * @property {string} notificationLevel - "info" | "warn" | "error"
 */

/**
 * ActionPolicyController — Enforcement Strategy Layer
 *
 * @class ActionPolicyController
 */
export class ActionPolicyController {
  /**
   * Current enforcement mode
   * @type {string}
   * @static
   */
  static #mode = ENFORCEMENT_MODE.LOOSE;

  /**
   * Set enforcement mode
   * Called during system ready hook based on GM setting
   *
   * @param {string} mode - STRICT | LOOSE | NONE
   */
  static setMode(mode) {
    if (!Object.values(ENFORCEMENT_MODE).includes(mode)) {
      console.error(`[ActionPolicyController] Invalid mode: ${mode}`);
      return;
    }
    this.#mode = mode;
    SWSELogger.info(`Action economy enforcement mode: ${mode}`);
  }

  /**
   * Get current enforcement mode
   * @returns {string}
   */
  static getMode() {
    return this.#mode;
  }

  /**
   * Get all available modes
   * @returns {Object}
   */
  static getModes() {
    return ENFORCEMENT_MODE;
  }

  /**
   * Process ActionEngine result and apply policy enforcement.
   *
   * @param {Object} engineResult - Result from ActionEngine.consumeAction()
   * @param {Object} context - Context information
   * @param {Actor} context.actor - The actor taking the action
   * @param {string} context.actionType - What action is being taken (e.g., "attack")
   * @returns {PolicyResult} Policy decision
   */
  static handle(engineResult, context = {}) {
    if (!engineResult) {
      return {
        permitted: false,
        mode: this.#mode,
        violations: [{ type: "INVALID_RESULT", message: "Invalid engine result" }],
        shouldNotify: true,
        notificationLevel: "error"
      };
    }

    const violations = engineResult.violations || [];
    const isAllowed = engineResult.allowed ?? true;

    // Determine policy decision based on mode
    switch (this.#mode) {
      case ENFORCEMENT_MODE.STRICT:
        return this._handleStrict(isAllowed, violations, context);

      case ENFORCEMENT_MODE.LOOSE:
        return this._handleLoose(isAllowed, violations, context);

      case ENFORCEMENT_MODE.NONE:
        return this._handleNone(isAllowed, violations, context);

      default:
        return {
          permitted: true,
          mode: this.#mode,
          violations,
          shouldNotify: false,
          notificationLevel: "info"
        };
    }
  }

  /**
   * STRICT Mode: Block illegal actions, show UI feedback
   *
   * @private
   */
  static _handleStrict(isAllowed, violations, context) {
    if (!isAllowed) {
      SWSELogger.warn(
        `[Strict] Action blocked: ${violations[0]?.message || "Unknown violation"}`,
        { actor: context.actor?.name, action: context.actionType }
      );

      return {
        permitted: false,
        mode: ENFORCEMENT_MODE.STRICT,
        violations,
        shouldNotify: true,
        notificationLevel: "warn",
        uiState: {
          disabled: true,
          greyOut: true,
          tooltip: violations[0]?.message || "Action not permitted"
        }
      };
    }

    return {
      permitted: true,
      mode: ENFORCEMENT_MODE.STRICT,
      violations: [],
      shouldNotify: false,
      notificationLevel: "info",
      uiState: { disabled: false, greyOut: false }
    };
  }

  /**
   * LOOSE Mode: Allow action, warn GM
   * (Recommended default for home games)
   *
   * @private
   */
  static _handleLoose(isAllowed, violations, context) {
    if (!isAllowed) {
      SWSELogger.warn(
        `[Loose] Action executed with violations: ${violations.map(v => v.message).join(", ")}`,
        { actor: context.actor?.name, action: context.actionType }
      );

      return {
        permitted: true,  // Still permitted
        mode: ENFORCEMENT_MODE.LOOSE,
        violations,
        shouldNotify: true,
        notificationLevel: "warn",
        uiState: {
          disabled: false,
          greyOut: false,
          tooltip: violations[0]?.message || "Action economy violation"
        }
      };
    }

    return {
      permitted: true,
      mode: ENFORCEMENT_MODE.LOOSE,
      violations: [],
      shouldNotify: false,
      notificationLevel: "info",
      uiState: { disabled: false, greyOut: false }
    };
  }

  /**
   * NONE Mode: Track only, no enforcement
   *
   * @private
   */
  static _handleNone(isAllowed, violations, context) {
    // Still track violations internally, but don't enforce
    if (violations.length > 0) {
      SWSELogger.debug(
        `[None] Action tracking (no enforcement): ${violations.map(v => v.message).join(", ")}`,
        { actor: context.actor?.name, action: context.actionType }
      );
    }

    return {
      permitted: true,
      mode: ENFORCEMENT_MODE.NONE,
      violations,
      shouldNotify: false,
      notificationLevel: "info",
      uiState: {
        disabled: false,
        greyOut: false,
        tooltip: violations.length > 0
          ? violations[0].message
          : "Action tracked"
      }
    };
  }

  /**
   * Get GM override prompt message
   * (Used in STRICT mode if GM wants to force action)
   *
   * @param {Array} violations - List of violations
   * @returns {string}
   */
  static getOverrideMessage(violations) {
    return `This action violates action economy rules:\n\n${violations.map(v => `• ${v.message}`).join("\n")}\n\nDo you want to allow it anyway?`;
  }

  /**
   * Check if action would be permitted under current policy
   * (For UI preview, no side effects)
   *
   * @param {boolean} engineAllowed - Whether engine allows it
   * @returns {boolean}
   */
  static wouldPermit(engineAllowed) {
    // STRICT mode blocks, LOOSE and NONE permit
    if (this.#mode === ENFORCEMENT_MODE.STRICT) {
      return engineAllowed;
    }
    return true;
  }
}

export default ActionPolicyController;
