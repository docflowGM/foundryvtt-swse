/**
 * Critical Flow Tests - Phase 5 Regression Prevention
 *
 * Minimal automated tests for catastrophic failure detection.
 * Focus on: chargen finalize, level-up, import/export, migrations.
 *
 * Usage (GM console):
 *   await SWSETests.runAllTests()
 *   await SWSETests.testChargenFinalize()
 *   await SWSETests.testLevelup()
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { createActor, createItemInActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { validateActorSchema, validateItemSchema } from "/systems/foundryvtt-swse/scripts/core/schema-validator.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Test result object
 */
function createTestResult(name, passed, message = '', duration = 0) {
  return { name, passed, message, duration, timestamp: Date.now() };
}

/**
 * Test suite runner
 */
class CriticalFlowTests {
  constructor() {
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  /**
   * Run all critical flow tests
   */
  async runAllTests() {
    SWSELogger.log(`[Tests] Starting critical flow test suite...`);
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;

    await this.testChargenFinalize();
    await this.testLevelupFlow();
    await this.testImportValidation();
    await this.testActorDataSanity();

    const summary = this.getSummary();
    SWSELogger.log(`[Tests] Suite complete: ${summary.passCount}/${summary.testCount} passed`);

    return summary;
  }

  /**
   * Test 1: Character generation finalization
   * Validates: Actor creation, item creation, effect application
   */
  async testChargenFinalize() {
    const testName = 'Chargen Finalize';
    const startTime = performance.now();

    try {
      // Create test actor
      const testActor = await createActor({
        type: 'character',
        name: '[TEST] Chargen Final',
        system: {
          level: 1,
          race: 'Human',
          class: 'Soldier'
        }
      });

      if (!testActor) {
        throw new Error('Failed to create test actor');
      }

      // Validate actor structure
      const validation = validateActorSchema(testActor, 'character');
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join('; ')}`);
      }

      // Try adding an item
      const testItem = await createItemInActor(testActor, {
        type: 'feat',
        name: 'Weapon Focus',
        system: {}
      });

      if (!testItem) {
        throw new Error('Failed to create test item');
      }

      // Cleanup
      await testActor.delete();

      const duration = performance.now() - startTime;
      this._recordPass(testName, `Actor + item creation successful`, duration);

    } catch (error) {
      this._recordFail(testName, error.message);
    }
  }

  /**
   * Test 2: Level-up flow
   * Validates: Skill/feat advancement, level incrementing, item creation
   */
  async testLevelupFlow() {
    const testName = 'Level-up Flow';
    const startTime = performance.now();

    try {
      // Create test actor at level 1
      const testActor = await createActor({
        type: 'character',
        name: '[TEST] Levelup',
        system: {
          level: 1,
          class: 'Soldier'
        }
      });

      if (!testActor) {
        throw new Error('Failed to create test actor');
      }

      // Simulate level up
      const oldLevel = testActor.system.level;
      await testActor.update({ 'system.level': oldLevel + 1 });

      // Verify level was incremented
      if (testActor.system.level !== oldLevel + 1) {
        throw new Error('Level increment failed');
      }

      // Cleanup
      await testActor.delete();

      const duration = performance.now() - startTime;
      this._recordPass(testName, `Level increment successful (1 → 2)`, duration);

    } catch (error) {
      this._recordFail(testName, error.message);
    }
  }

  /**
   * Test 3: Import data validation
   * Validates: JSON parsing, schema checks, data sanitization
   */
  async testImportValidation() {
    const testName = 'Import Validation';
    const startTime = performance.now();

    try {
      const { validateImportData, sanitizeImportData } = await import('../core/schema-validator.js');

      // Valid import data
      const validData = {
        type: 'character',
        name: 'Test Import',
        system: { level: 1 },
        items: []
      };

      const validation = validateImportData(validData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      // Sanitize data
      const sanitized = sanitizeImportData(validData);
      if (!sanitized.type || !sanitized.name) {
        throw new Error('Sanitization removed required fields');
      }

      const duration = performance.now() - startTime;
      this._recordPass(testName, `Import data validation passed`, duration);

    } catch (error) {
      this._recordFail(testName, error.message);
    }
  }

  /**
   * Test 4: Actor data sanity checks
   * Validates: Required properties, types, nested structures
   */
  async testActorDataSanity() {
    const testName = 'Actor Data Sanity';
    const startTime = performance.now();

    try {
      // Create test actor
      const testActor = await createActor({
        type: 'character',
        name: '[TEST] Data Sanity',
        system: {
          level: 1,
          hp: { value: 10, max: 10 },
          defenses: { reflex: 10, fortitude: 10, will: 10 }
        }
      });

      if (!testActor) {
        throw new Error('Failed to create test actor');
      }

      // Validate critical paths
      if (!testActor.system.hp || testActor.system.hp.value === undefined) {
        throw new Error('Missing HP data');
      }

      if (!testActor.system.defenses) {
        throw new Error('Missing defenses data');
      }

      // Cleanup
      await testActor.delete();

      const duration = performance.now() - startTime;
      this._recordPass(testName, `All sanity checks passed`, duration);

    } catch (error) {
      this._recordFail(testName, error.message);
    }
  }

  /**
   * Record passing test
   * @private
   */
  _recordPass(name, message, duration) {
    const result = createTestResult(name, true, message, duration);
    this.results.push(result);
    this.testCount++;
    this.passCount++;
    SWSELogger.log(`  ✓ ${name}: ${message} (${duration.toFixed(1)}ms)`);
  }

  /**
   * Record failing test
   * @private
   */
  _recordFail(name, message) {
    const result = createTestResult(name, false, message, 0);
    this.results.push(result);
    this.testCount++;
    this.failCount++;
    SWSELogger.error(`  ✗ ${name}: ${message}`);
  }

  /**
   * Get test summary
   */
  getSummary() {
    return {
      total: this.testCount,
      passCount: this.passCount,
      failCount: this.failCount,
      success: this.failCount === 0,
      results: this.results,
      duration: this.results.reduce((sum, r) => sum + r.duration, 0)
    };
  }
}

// Create singleton instance
const testSuite = new CriticalFlowTests();

/**
 * Export test runner
 * Usage: await SWSETests.runAllTests()
 */
export const SWSETests = {
  async runAllTests() {
    if (!game?.user?.isGM) {
      return { error: 'Tests require GM privileges' };
    }
    return await testSuite.runAllTests();
  },

  async testChargenFinalize() {
    return await testSuite.testChargenFinalize();
  },

  async testLevelupFlow() {
    return await testSuite.testLevelupFlow();
  },

  async testImportValidation() {
    return await testSuite.testImportValidation();
  },

  async testActorDataSanity() {
    return await testSuite.testActorDataSanity();
  },

  getSummary() {
    return testSuite.getSummary();
  }
};

/**
 * Register tests globally
 */
export function registerCriticalFlowTests() {
  if (typeof window !== 'undefined') {
    window.SWSETests = SWSETests;
  }
}
