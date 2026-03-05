/**
 * PASSIVE Phase 4 - RuleRegistry
 *
 * Registry of boolean rule tokens collected from PASSIVE/RULE abilities.
 * Provides query interface for resolution logic to check if rules apply.
 *
 * CRITICAL: RuleRegistry is stateless per prepare cycle.
 * Rules are collected fresh during prepareDerivedData.
 * Resolution logic queries via RuleRegistry.has() during combat/checks.
 *
 * Rule tokens are stored on actor._ruleTokens during registration.
 * This prevents resolution logic from scanning abilities directly.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class RuleRegistry {
  /**
   * Check if an actor has a specific rule token.
   * Stateless query - checks actor._ruleTokens populated during registration.
   *
   * @param {Object} actor - The actor
   * @param {string} ruleType - Rule type to check (from RULE_TYPES)
   * @returns {boolean} True if rule is active
   */
  static has(actor, ruleType) {
    if (!actor) return false;
    const tokens = actor._ruleTokens ?? [];
    return tokens.includes(ruleType);
  }

  /**
   * Collect all rule tokens from an actor.
   * Returns the current set of active rule tokens.
   *
   * @param {Object} actor - The actor
   * @returns {Array<string>} Array of rule type tokens
   */
  static collect(actor) {
    if (!actor) return [];
    return actor._ruleTokens ?? [];
  }

  /**
   * Query if actor has a rule with specific context.
   * Some rules may have additional context (e.g., TREAT_SKILL_AS_TRAINED needs skill name).
   *
   * This is a placeholder for future expansion.
   * Phase 4 scope: Simple token checks only.
   *
   * @param {Object} actor - The actor
   * @param {string} ruleType - Rule type to check
   * @param {Object} context - Optional context object
   * @returns {boolean} True if rule applies to context
   */
  static hasWithContext(actor, ruleType, context) {
    // Phase 4: Just delegate to simple has() check
    // Future phases: Add context-aware evaluation
    return this.has(actor, ruleType);
  }

  /**
   * Initialize rule tokens on actor (called during registration).
   * Resets tokens per prepare cycle.
   *
   * @param {Object} actor - The actor
   */
  static initializeTokens(actor) {
    if (!actor) return;
    actor._ruleTokens = [];
  }

  /**
   * Add a rule token to actor.
   * Called during PassiveAdapter.handleRule() for each active rule.
   *
   * @param {Object} actor - The actor
   * @param {string} ruleType - Rule type token to add
   * @throws {Error} If actor is invalid
   */
  static addToken(actor, ruleType) {
    if (!actor) {
      throw new Error("[RuleRegistry] Cannot add token to null actor");
    }

    if (!actor._ruleTokens) {
      actor._ruleTokens = [];
    }

    // Add token (no duplicates)
    if (!actor._ruleTokens.includes(ruleType)) {
      actor._ruleTokens.push(ruleType);
      swseLogger.debug(
        `[RuleRegistry] Added rule token '${ruleType}' to ${actor.name}`
      );
    }
  }

  /**
   * Get debug snapshot of all active rules.
   * Useful for logging and debugging.
   *
   * @param {Object} actor - The actor
   * @returns {string} Debug representation of active rules
   */
  static debugSnapshot(actor) {
    if (!actor) return "No actor";
    const tokens = this.collect(actor);
    if (tokens.length === 0) {
      return `${actor.name}: (no active rules)`;
    }
    return `${actor.name}: [${tokens.join(', ')}]`;
  }
}

export default RuleRegistry;
