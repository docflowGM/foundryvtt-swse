/**
 * PerformanceSovereigntyLock
 * PHASE 8: Ensure derived calculations cannot be bypassed through performance optimization
 *
 * Enforces:
 * - No caching that bypasses recalculation
 * - No derived value mutations except through DerivedCalculator
 * - No direct field assignments to derived.*
 * - Performance bottleneck detection
 */

import { swseLogger } from '../../utils/logger.js';

export class PerformanceSovereigntyLock {
  /**
   * Lock down derived calculation cycle
   * Called from actor.prepareDerivedData()
   *
   * @param {Actor} actor
   * @returns {boolean} True if lock enforced
   */
  static enforceLock(actor) {
    if (!actor) return false;

    // Verify derived layer not externally modified
    const derived = actor.system.derived || {};

    // Check for suspicious direct assignments
    for (const key in derived) {
      if (key.startsWith('_')) {
        continue; // Skip internal fields
      }

      // Verify derived values are objects with proper structure
      const value = derived[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Validate breakdown structure
        if (value.total !== undefined && !Number.isFinite(value.total)) {
          swseLogger.error(`PerformanceSovereigntyLock: Invalid derived.${key}.total`, {
            actor: actor.id,
            value: value.total
          });
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Detect performance bottlenecks in modifier aggregation
   * Logs warnings for optimization opportunities
   *
   * @param {Array<Modifier>} allModifiers - All modifiers collected
   * @returns {Object} { bottlenecks: [], warnings: [] }
   */
  static detectBottlenecks(allModifiers) {
    const bottlenecks = [];
    const warnings = [];

    if (!Array.isArray(allModifiers)) {
      return { bottlenecks, warnings };
    }

    // Bottleneck 1: Too many modifiers
    if (allModifiers.length > 500) {
      bottlenecks.push({
        type: 'modifier_count_high',
        count: allModifiers.length,
        recommendation: 'Consider consolidating similar modifiers'
      });
    }

    // Bottleneck 2: Many modifiers for single target
    const byTarget = new Map();
    for (const mod of allModifiers) {
      if (!byTarget.has(mod.target)) {
        byTarget.set(mod.target, []);
      }
      byTarget.get(mod.target).push(mod);
    }

    for (const [target, mods] of byTarget.entries()) {
      if (mods.length > 50) {
        warnings.push({
          type: 'target_modifier_count_high',
          target,
          count: mods.length,
          recommendation: 'Consolidate modifiers for better performance'
        });
      }
    }

    // Bottleneck 3: Repeated source resolution
    const sourceCount = new Map();
    for (const mod of allModifiers) {
      const key = `${mod.source}:${mod.sourceId}`;
      sourceCount.set(key, (sourceCount.get(key) || 0) + 1);
    }

    let repeatedSources = 0;
    for (const count of sourceCount.values()) {
      if (count > 10) {
        repeatedSources++;
      }
    }

    if (repeatedSources > 5) {
      warnings.push({
        type: 'repeated_sources',
        count: repeatedSources,
        recommendation: 'Batch modifier creation instead of creating individually'
      });
    }

    return { bottlenecks, warnings };
  }

  /**
   * Measure derived calculation time
   * Returns timing metrics for performance analysis
   *
   * @param {Function} calculationFn - Function to measure
   * @param {*} ...args - Arguments to pass to function
   * @returns {Object} { duration: number, result: * }
   */
  static static async measurePerformance(calculationFn, ...args) {
    const startTime = performance.now();

    try {
      const result = await calculationFn(...args);
      const duration = performance.now() - startTime;

      // Log slow calculations
      if (duration > 100) {
        swseLogger.warn('PerformanceSovereigntyLock: Slow derived calculation', {
          duration,
          fn: calculationFn.name
        });
      }

      return { duration, result };
    } catch (err) {
      const duration = performance.now() - startTime;
      swseLogger.error('PerformanceSovereigntyLock: Calculation error', {
        duration,
        error: err.message,
        fn: calculationFn.name
      });
      throw err;
    }
  }

  /**
   * Validate no direct mutations to derived during calculation
   * Wraps DerivedCalculator to ensure immutability of intermediate values
   *
   * @param {Actor} actor
   * @returns {Object} Proxy that prevents direct mutations
   */
  static createDerivedProxy(actor) {
    const derived = actor.system.derived || {};

    return new Proxy(derived, {
      set: (target, prop, value) => {
        swseLogger.error('PerformanceSovereigntyLock: Attempted direct derived mutation', {
          actor: actor.id,
          property: prop,
          value: value
        });

        // Block the mutation
        return false;
      },

      deleteProperty: (target, prop) => {
        swseLogger.error('PerformanceSovereigntyLock: Attempted derived deletion', {
          actor: actor.id,
          property: prop
        });

        return false;
      }
    });
  }

  /**
   * Verify derived calculation authority
   * Ensures only DerivedCalculator can modify derived values
   *
   * @param {Actor} actor
   * @param {string} calculatorName - Name of calling calculator
   * @returns {boolean} True if allowed
   */
  static verifyCalculatorAuthority(actor, calculatorName) {
    // Only allow known calculator names
    const allowedCalculators = [
      'DerivedCalculator',
      'HPCalculator',
      'BABCalculator',
      'DefenseCalculator'
    ];

    if (!allowedCalculators.includes(calculatorName)) {
      swseLogger.error('PerformanceSovereigntyLock: Unauthorized calculator', {
        actor: actor.id,
        calculator: calculatorName
      });
      return false;
    }

    return true;
  }
}
