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
   * Supports optional context for rule types that need additional parameters.
   * For example, TREAT_SKILL_AS_TRAINED requires a skill property.
   *
   * @param {Object} actor - The actor
   * @param {string} ruleType - Rule type to check (from RULE_TYPES)
   * @param {Object} [options] - Optional context for rule evaluation
   * @param {string} [options.skill] - For TREAT_SKILL_AS_TRAINED: the skill key to check
   * @returns {boolean} True if rule is active
   */
  static has(actor, ruleType, options = null) {
    if (!actor) return false;
    const tokens = actor._ruleTokens ?? [];

    // Find matching token
    return tokens.some(token => {
      // Support both string tokens (legacy) and object tokens (Phase 4E+)
      const tokenType = typeof token === 'string' ? token : token?.type;

      if (tokenType !== ruleType) return false;

      // No options filter: match by type alone
      if (!options) return true;

      // Options filter: check rule-specific properties
      if (ruleType === 'TREAT_SKILL_AS_TRAINED') {
        // TREAT_SKILL_AS_TRAINED must match the skill key
        return token?.skill === options.skill;
      }

      // Other rules: no additional context needed
      return true;
    });
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
   * Phase 4E: This now properly delegates to has() with options.
   *
   * @param {Object} actor - The actor
   * @param {string} ruleType - Rule type to check
   * @param {Object} [options] - Optional context object with rule-specific properties
   * @returns {boolean} True if rule applies to context
   *
   * @example
   * RuleRegistry.hasWithContext(actor, RULE_TYPES.TREAT_SKILL_AS_TRAINED, { skill: 'useTheForce' })
   */
  static hasWithContext(actor, ruleType, options) {
    return this.has(actor, ruleType, options);
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
   * Supports both simple string tokens and structured object tokens.
   * String tokens: 'IGNORE_COVER'
   * Object tokens: { type: 'TREAT_SKILL_AS_TRAINED', skill: 'useTheForce' }
   *
   * @param {Object} actor - The actor
   * @param {string | Object} ruleToken - Rule token to add (string or object with type property)
   * @throws {Error} If actor is invalid or token format is invalid
   */
  static addToken(actor, ruleToken) {
    if (!actor) {
      throw new Error("[RuleRegistry] Cannot add token to null actor");
    }

    if (!actor._ruleTokens) {
      actor._ruleTokens = [];
    }

    // Get the type for deduplication
    const tokenType = typeof ruleToken === 'string' ? ruleToken : ruleToken?.type;
    if (!tokenType) {
      throw new Error("[RuleRegistry] Invalid rule token format");
    }

    // Deduplicate based on type and content
    const isDuplicate = actor._ruleTokens.some(existing => {
      const existingType = typeof existing === 'string' ? existing : existing?.type;
      if (existingType !== tokenType) return false;

      // For string tokens, exact match is enough
      if (typeof ruleToken === 'string') return true;

      // For object tokens, check if same type and all properties match
      if (typeof existing === 'object' && typeof ruleToken === 'object') {
        // Check all keys match the same values
        return Object.keys(ruleToken).every(key => existing[key] === ruleToken[key]);
      }

      return false;
    });

    if (!isDuplicate) {
      actor._ruleTokens.push(ruleToken);
      const tokenDisplay = typeof ruleToken === 'string' ? ruleToken : JSON.stringify(ruleToken);
      swseLogger.debug(
        `[RuleRegistry] Added rule token '${tokenDisplay}' to ${actor.name}`
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
