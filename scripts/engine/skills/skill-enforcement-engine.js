/**
 * SkillEnforcementEngine
 *
 * Pure rules authority for skill legality.
 * Determines whether a skill use is allowed under current game rules.
 *
 * ✅ What it does:
 * - Validates training requirements
 * - Checks substitution legality
 * - Enforces retry restrictions
 * - Applies environment penalties
 * - Reports rule violations
 *
 * ❌ What it does NOT do:
 * - Roll dice
 * - Mutate actor
 * - Post chat
 * - Touch DOM
 * - Calculate derived data
 *
 * Output: Pure decision object for RollEngine to consume
 */

import { runRulePipeline } from "./rules/index.js";
import { SkillAttemptRegistry } from "./skill-attempt-registry.js";

export class SkillEnforcementEngine {
  /**
   * PRIMARY ENTRY POINT
   *
   * Evaluates whether a skill use is legal under current rules.
   *
   * @param {Object} options
   * @param {Actor} options.actor - Actor attempting skill
   * @param {string} options.skillKey - Skill identifier
   * @param {string} options.actionType - "check" | "retry" | "passive"
   * @param {Object} options.context - Environmental/situational context
   * @param {boolean} options.telemetry - Include diagnostics (optional)
   *
   * @returns {Object} Decision object:
   * {
   *   allowed: boolean,
   *   warnings: string[],
   *   reason: string | null,
   *   penalties: [{ source: string, value: number }],
   *   substitutions: [{ from: string, to: string, reason: string }],
   *   overrides: {
   *     treatedAsTrained: boolean,
   *     autoSuccess: boolean,
   *     autoFail: boolean,
   *     forcedDC: number | null
   *   },
   *   diagnostics: {
   *     rulesTriggered: string[],
   *     blockedBy: string | null
   *   }
   * }
   */
  static evaluate({ actor, skillKey, actionType = "check", context = {}, telemetry = false }) {
    const baseResult = this._createBaseResult();

    const result = runRulePipeline({
      actor,
      skillKey,
      actionType,
      context,
      registry: SkillAttemptRegistry,
      result: baseResult
    });

    // Ensure reason is set if blocked
    if (!result.allowed) {
      result.reason ??= "Blocked by rules";
    }

    // Telemetry is optional
    if (!telemetry) {
      delete result.diagnostics;
    }

    return result;
  }

  /**
   * LIGHTWEIGHT CHECK: Can roll?
   *
   * @param {Actor} actor
   * @param {string} skillKey
   * @param {Object} context
   * @returns {boolean}
   */
  static canRoll(actor, skillKey, context = {}) {
    return this.evaluate({ actor, skillKey, context }).allowed;
  }

  /**
   * GET MODIFIERS ONLY
   *
   * Useful for UI tooltip previews.
   *
   * @param {Actor} actor
   * @param {string} skillKey
   * @param {Object} context
   * @returns {Array} Penalties array
   */
  static getModifiers(actor, skillKey, context = {}) {
    const result = this.evaluate({ actor, skillKey, context });
    return result.penalties;
  }

  /**
   * DEBUG TRACE MODE
   *
   * Returns full rule-by-rule trace for debugging.
   *
   * @param {Actor} actor
   * @param {string} skillKey
   * @param {Object} context
   * @returns {Object} Full decision with diagnostics
   */
  static trace(actor, skillKey, context = {}) {
    return this.evaluate({ actor, skillKey, context, telemetry: true });
  }

  /**
   * CREATE BASE RESULT
   *
   * @private
   * @returns {Object}
   */
  static _createBaseResult() {
    return {
      allowed: true,
      warnings: [],
      penalties: [],
      substitutions: [],
      overrides: {
        treatedAsTrained: false,
        autoSuccess: false,
        autoFail: false,
        forcedDC: null
      },
      diagnostics: {
        rulesTriggered: [],
        blockedBy: null
      }
    };
  }
}
