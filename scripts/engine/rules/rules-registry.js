/**
 * CombatRulesRegistry — Shared Rule Substrate
 *
 * Central registry for modular combat rules.
 * Prevents rule duplication, enables modularity, decouples engines.
 *
 * Rules are registered, not hardcoded into engines.
 * Engines query registry and execute rules in priority order.
 *
 * PRINCIPLES:
 * - Rules are stateless functions
 * - Registry is the source of truth
 * - Engines are thin and pure
 * - Rules can be toggled, added, removed dynamically
 * - Sentinel can introspect active rules
 *
 * RULE DEFINITION CONTRACT:
 * {
 *   id: string,                      // Unique identifier
 *   type: string,                    // Category: "attack", "skill", "damage", etc.
 *   priority: number,                // Execution order (lower = first)
 *   applies: (payload) => boolean,   // Should this rule execute?
 *   apply: (payload, result) => {}   // Execute rule, modify result
 * }
 */

export const RuleCategories = {
  // Combat rules
  ATTACK: "attack",
  DAMAGE: "damage",
  CRITICAL: "critical",
  DEFENSE: "defense",

  // Skill rules
  SKILL: "skill",
  SKILL_TRAINING: "skill-training",

  // Status rules
  CONDITION: "condition",
  ARMOR: "armor",

  // Environmental rules
  ENVIRONMENT: "environment",

  // Action economy rules
  ACTION: "action"
};

/**
 * Central registry for all combat-adjacent rules.
 * Thin, stateless, acts as a law book for engines.
 */
export class CombatRulesRegistry {
  static _rules = new Map();  // Map<category, RuleDefinition[]>
  static _active = new Map(); // Map<id, boolean> for toggling

  /**
   * Register a rule into the system.
   * @param {Object} rule - Rule definition
   * @param {string} rule.id - Unique identifier
   * @param {string} rule.type - Category
   * @param {number} [rule.priority=100] - Execution order
   * @param {Function} rule.applies - Predicate
   * @param {Function} rule.apply - Executor
   */
  static register(rule) {
    if (!rule.id || !rule.type || !rule.apply) {
      throw new Error(`Invalid rule: missing required fields (id, type, apply)`);
    }

    const category = rule.type;
    if (!this._rules.has(category)) {
      this._rules.set(category, []);
    }

    // Add rule
    this._rules.get(category).push(rule);

    // Sort by priority (lower = earlier)
    this._rules.get(category).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    // Mark as active by default
    this._active.set(rule.id, true);

    console.log(`[CombatRulesRegistry] Registered rule: ${rule.id} (${category})`);
  }

  /**
   * Register multiple rules at once.
   * @param {Object[]} rules - Array of rule definitions
   */
  static registerBatch(rules) {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  /**
   * Get all active rules for a category.
   * @param {string} category - Rule category
   * @returns {Object[]} Rules in priority order
   */
  static getRules(category) {
    if (!this._rules.has(category)) {
      return [];
    }

    return this._rules.get(category).filter(rule => this._active.get(rule.id) ?? true);
  }

  /**
   * Execute all applicable rules for a category.
   * Returns final result after all rules have applied.
   *
   * @param {string} category - Rule category
   * @param {Object} payload - Input data for rules
   * @param {Object} result - Initial result object (rules modify in place)
   * @returns {Object} Final result after all rules executed
   */
  static executeRules(category, payload, result) {
    const rules = this.getRules(category);

    for (const rule of rules) {
      // Check if rule applies to this payload
      if (typeof rule.applies === 'function' && !rule.applies(payload)) {
        continue;
      }

      // Execute rule (modifies result in place)
      try {
        result = rule.apply(payload, result) || result;
      } catch (err) {
        console.error(`[CombatRulesRegistry] Error in rule ${rule.id}:`, err);
        // Continue with next rule rather than failing entirely
      }
    }

    return result;
  }

  /**
   * Enable/disable a rule.
   * @param {string} ruleId - Rule ID
   * @param {boolean} active - Enable or disable
   */
  static setRuleActive(ruleId, active) {
    this._active.set(ruleId, active);
  }

  /**
   * Check if a rule is active.
   * @param {string} ruleId - Rule ID
   * @returns {boolean}
   */
  static isRuleActive(ruleId) {
    return this._active.get(ruleId) ?? true;
  }

  /**
   * Get all active rule IDs for a category (for Sentinel).
   * @param {string} category - Rule category
   * @returns {string[]} Active rule IDs
   */
  static getActiveRuleIds(category) {
    return this.getRules(category).map(r => r.id);
  }

  /**
   * Get diagnostic summary of active rules.
   * @returns {Object} Summary by category
   */
  static getDiagnostics() {
    const diag = {};
    for (const [category, rules] of this._rules.entries()) {
      diag[category] = rules
        .filter(r => this._active.get(r.id) ?? true)
        .map(r => ({ id: r.id, priority: r.priority ?? 100 }));
    }
    return diag;
  }

  /**
   * Clear all registered rules (mainly for testing).
   */
  static reset() {
    this._rules.clear();
    this._active.clear();
  }
}

export default CombatRulesRegistry;
