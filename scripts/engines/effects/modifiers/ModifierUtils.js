/**
 * ModifierUtils.js — Modifier Manipulation Utilities
 *
 * Pure functions for:
 * - Filtering modifiers
 * - Grouping by target/type/source
 * - Stacking resolution
 * - Summation
 * - Description formatting
 *
 * No side effects. No actor mutations.
 */

import {
  ModifierType,
  STACKING_RULES,
  createModifier,
  compareModifierPriority
} from './ModifierTypes.js';

export class ModifierUtils {
  /**
   * Filter modifiers to specific target, optionally by enabled status
   * @param {Modifier[]} modifiers
   * @param {string} target - Target key or null for all
   * @param {boolean} enabledOnly - Only return enabled modifiers
   * @returns {Modifier[]}
   */
  static filterModifiers(modifiers, target = null, enabledOnly = true) {
    if (!Array.isArray(modifiers)) return [];

    return modifiers.filter(m => {
      if (!m) return false;
      if (enabledOnly && !m.enabled) return false;
      if (target && m.target !== target) return false;
      return true;
    });
  }

  /**
   * Group modifiers by target key
   * @param {Modifier[]} modifiers
   * @returns {Map<string, Modifier[]>}
   */
  static groupByTarget(modifiers) {
    const map = new Map();

    if (!Array.isArray(modifiers)) return map;

    for (const mod of modifiers) {
      if (!mod) continue;

      const target = mod.target || 'unknown';
      if (!map.has(target)) {
        map.set(target, []);
      }
      map.get(target).push(mod);
    }

    return map;
  }

  /**
   * Group modifiers by type (for stacking rules)
   * @param {Modifier[]} modifiers
   * @returns {Map<string, Modifier[]>}
   */
  static groupByType(modifiers) {
    const map = new Map();

    if (!Array.isArray(modifiers)) return map;

    for (const mod of modifiers) {
      if (!mod) continue;

      const type = mod.type || ModifierType.UNTYPED;
      if (!map.has(type)) {
        map.set(type, []);
      }
      map.get(type).push(mod);
    }

    return map;
  }

  /**
   * Group modifiers by source ID
   * @param {Modifier[]} modifiers
   * @returns {Map<string, Modifier[]>}
   */
  static groupBySource(modifiers) {
    const map = new Map();

    if (!Array.isArray(modifiers)) return map;

    for (const mod of modifiers) {
      if (!mod) continue;

      const sourceKey = mod.sourceId || mod.source || 'unknown';
      if (!map.has(sourceKey)) {
        map.set(sourceKey, []);
      }
      map.get(sourceKey).push(mod);
    }

    return map;
  }

  /**
   * Resolve stacking conflicts for modifiers targeting same key
   *
   * Algorithm:
   * 1. Filter enabled modifiers for target
   * 2. Group by type
   * 3. Apply stacking rules per type
   * 4. Return resolved modifiers (post-stacking)
   *
   * @param {Modifier[]} modifiers - All modifiers for single target
   * @returns {Modifier[]} Resolved modifiers after stacking rules applied
   */
  static resolveStacking(modifiers) {
    if (!Array.isArray(modifiers) || modifiers.length === 0) return [];

    // Step 1: Filter to enabled only
    const enabled = modifiers.filter(m => m && m.enabled === true);
    if (enabled.length === 0) return [];

    // Step 2: Group by type
    const byType = this.groupByType(enabled);

    const resolved = [];

    // Step 3: Apply stacking rules per type
    for (const [type, modsOfType] of byType.entries()) {
      if (modsOfType.length === 0) continue;

      const rule = STACKING_RULES[type] || 'stack';

      switch (rule) {
        case 'stack':
          // Untyped and dodge: all stack
          resolved.push(...modsOfType);
          break;

        case 'highestOnly': {
          // Competence, enhancement, morale, insight: only highest applies
          let highest = modsOfType[0];
          for (const mod of modsOfType) {
            if (Math.abs(mod.value) > Math.abs(highest.value)) {
              highest = mod;
            }
          }
          resolved.push(highest);
          break;
        }

        case 'stackUnlessSameSource': {
          // Circumstance, penalty: stack unless same sourceId
          const bySource = this.groupBySource(modsOfType);

          for (const [sourceId, modsFromSource] of bySource.entries()) {
            if (modsFromSource.length === 1) {
              // Single modifier from this source: take it
              resolved.push(modsFromSource[0]);
            } else {
              // Multiple from same source: take highest
              let highest = modsFromSource[0];
              for (const mod of modsFromSource) {
                if (Math.abs(mod.value) > Math.abs(highest.value)) {
                  highest = mod;
                }
              }
              resolved.push(highest);
            }
          }
          break;
        }

        case 'meta':
          // Meta-modifiers (dexterity loss) handled specially
          // For now, include them
          resolved.push(...modsOfType);
          break;

        default:
          // Unknown rule: default to stack
          resolved.push(...modsOfType);
      }
    }

    return resolved;
  }

  /**
   * Sum resolved modifier values
   * @param {Modifier[]} modifiers - Resolved modifiers (post-stacking)
   * @returns {number} Sum of all modifier values
   */
  static sumModifiers(modifiers) {
    if (!Array.isArray(modifiers)) return 0;

    return modifiers.reduce((sum, mod) => {
      if (!mod || typeof mod.value !== 'number') return sum;
      return sum + mod.value;
    }, 0);
  }

  /**
   * Build human-readable description list for UI display
   * @param {Modifier[]} modifiers - Resolved modifiers for target
   * @returns {Array<Object>} Array of {value, source, type, description}
   */
  static describeModifiers(modifiers) {
    if (!Array.isArray(modifiers)) return [];

    return modifiers
      .filter(m => m)
      .map(m => ({
        value: m.value,
        source: m.source,
        sourceName: m.sourceName,
        type: m.type,
        description: m.description || m.sourceName
      }));
  }

  /**
   * Calculate total modifier value for a specific target
   *
   * Convenience method that:
   * 1. Filters to target
   * 2. Resolves stacking
   * 3. Sums values
   *
   * @param {Modifier[]} allModifiers
   * @param {string} target
   * @returns {number}
   */
  static calculateModifierTotal(allModifiers, target) {
    const filtered = this.filterModifiers(allModifiers, target, true);
    const resolved = this.resolveStacking(filtered);
    return this.sumModifiers(resolved);
  }

  /**
   * Get resolved modifiers for a specific target (with details)
   *
   * Returns:
   * {
   *   total: number,
   *   applied: Modifier[],
   *   breakdown: [{value, source, type, description}]
   * }
   *
   * @param {Modifier[]} allModifiers
   * @param {string} target
   * @returns {Object}
   */
  static getModifierDetail(allModifiers, target) {
    const filtered = this.filterModifiers(allModifiers, target, true);
    const applied = this.resolveStacking(filtered);
    const total = this.sumModifiers(applied);
    const breakdown = this.describeModifiers(applied);

    return {
      total,
      applied,
      breakdown
    };
  }

  /**
   * Sort modifiers by priority (for deterministic ordering)
   * @param {Modifier[]} modifiers
   * @returns {Modifier[]}
   */
  static sortByPriority(modifiers) {
    if (!Array.isArray(modifiers)) return [];
    return [...modifiers].sort(compareModifierPriority);
  }

  /**
   * Verify modifier integrity
   * Useful for debugging modifier pipelines
   * @param {Modifier[]} modifiers
   * @returns {Array<{valid: boolean, modifier: Modifier, errors: string[]}>}
   */
  static verifyModifiers(modifiers) {
    if (!Array.isArray(modifiers)) return [];

    return modifiers.map(mod => {
      const errors = [];

      if (!mod) {
        errors.push('Modifier is null/undefined');
        return { valid: false, modifier: null, errors };
      }

      if (!mod.id) errors.push('Missing id');
      if (!mod.source) errors.push('Missing source');
      if (!mod.sourceName) errors.push('Missing sourceName');
      if (!mod.target) errors.push('Missing target');
      if (!mod.type) errors.push('Missing type');
      if (mod.value === undefined || mod.value === null) errors.push('Missing value');
      if (typeof mod.value !== 'number') errors.push(`Value not number: ${typeof mod.value}`);
      if (typeof mod.enabled !== 'boolean') errors.push(`Enabled not boolean: ${typeof mod.enabled}`);

      return {
        valid: errors.length === 0,
        modifier: mod,
        errors
      };
    });
  }

  /**
   * Create a modifier breakdown object for storage in derived data
   *
   * Structure:
   * {
   *   "skill.acrobatics": {
   *     total: 2,
   *     applied: [modifier1, modifier2],
   *     breakdown: [{description, value, source}]
   *   }
   * }
   *
   * @param {Modifier[]} allModifiers
   * @param {string[]} targets - Target keys to include
   * @returns {Object}
   */
  static buildModifierBreakdown(allModifiers, targets = []) {
    const breakdown = {};

    if (!Array.isArray(targets) || targets.length === 0) {
      return breakdown;
    }

    for (const target of targets) {
      const detail = this.getModifierDetail(allModifiers, target);
      if (detail.total !== 0 || detail.applied.length > 0) {
        breakdown[target] = detail;
      }
    }

    return breakdown;
  }
}

export default ModifierUtils;
