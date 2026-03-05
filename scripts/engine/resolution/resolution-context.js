/**
 * PASSIVE Phase 4E - ResolutionContext
 *
 * Abstraction layer for resolution logic to query rule state.
 * Decouples resolution utilities from actor internals and RuleRegistry.
 * Provides single interface for all rule checks during combat/skill resolution.
 *
 * CRITICAL: ResolutionContext is stateless.
 * It only holds a reference to the actor and delegates to RuleRegistry.
 * No caching. No mutation.
 */

import { RuleRegistry } from "../abilities/passive/rule-registry.js";
import { RULE_TYPES } from "../abilities/passive/rule-types.js";

export class ResolutionContext {
  /**
   * Create a new resolution context for an actor.
   *
   * @param {Object} actor - The actor making the attack or check
   */
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Check if actor has a specific rule.
   * Delegates to RuleRegistry — no local state.
   *
   * @param {string} ruleType - Rule type to check (from RULE_TYPES)
   * @param {Object} [options] - Optional context for rule evaluation
   * @returns {boolean} True if rule is active
   *
   * @example
   * if (context.hasRule(RULE_TYPES.IGNORE_COVER)) { ... }
   * if (context.hasRule(RULE_TYPES.TREAT_SKILL_AS_TRAINED, { skill: 'useTheForce' })) { ... }
   */
  hasRule(ruleType, options = null) {
    return RuleRegistry.has(this.actor, ruleType, options);
  }
}

export default ResolutionContext;
