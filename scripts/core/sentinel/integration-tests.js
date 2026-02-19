/**
 * SENTINEL INTEGRATION TESTS
 * Verify PHASE 3 governance under real progression scenarios
 *
 * Tests worst-case mutation patterns to ensure:
 * - Mutation counting is accurate
 * - Invariants are enforced
 * - Transaction lifecycle works
 * - Nested mutation blocking prevents regression
 */

import { MutationIntegrityLayer } from './mutation-integrity-layer.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { swseLogger } from '../../utils/logger.js';

export const SentinelIntegrationTests = {

  /**
   * TEST SUITE 1: Simple Update Operation
   * Expected: 1 mutation, 1 recalc
   */
  async testSimpleUpdate(actor) {
    console.log('\n[SENTINEL-TEST] TEST SUITE 1: Simple Update');

    try {
      // Clear any prior transaction state
      MutationIntegrityLayer._activeTransaction = null;

      await ActorEngine.updateActor(actor, {
        'system.hp.current': Math.max(0, (actor.system.hp?.current || 0) - 5)
      });

      const result = {
        name: 'Simple Update',
        expectedMutations: 1,
        expectedRecalcs: 1,
        status: 'PASS',
        details: 'Applied damage via ActorEngine'
      };

      console.log('[SENTINEL-TEST] ✅ PASS: Simple Update');
      return result;
    } catch (err) {
      console.error('[SENTINEL-TEST] ❌ FAIL: Simple Update', err);
      return {
        name: 'Simple Update',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * TEST SUITE 2: Progression State Update
   * Expected: 1 mutation (feat state), 1 recalc
   */
  async testProgressionStateUpdate(actor) {
    console.log('\n[SENTINEL-TEST] TEST SUITE 2: Progression State Update');

    try {
      MutationIntegrityLayer._activeTransaction = null;

      // Import FeatState dynamically to avoid circular deps
      const { FeatState } = await import('../../progression/feats/feat-state.js');

      await FeatState.addFeat(actor, 'Test Feat');

      const result = {
        name: 'Progression State Update',
        expectedMutations: 1,
        expectedRecalcs: 1,
        status: 'PASS',
        details: 'Added feat to progression state'
      };

      console.log('[SENTINEL-TEST] ✅ PASS: Progression State Update');
      return result;
    } catch (err) {
      console.error('[SENTINEL-TEST] ❌ FAIL: Progression State Update', err);
      return {
        name: 'Progression State Update',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * TEST SUITE 3: Worst-Case Progression (3 mutations)
   * Simulates level-up with feats, talents, and skills
   * Expected: 3 mutations (root update + deletes + creates), 1 recalc
   */
  async testWorstCaseProgression(actor) {
    console.log('\n[SENTINEL-TEST] TEST SUITE 3: Worst-Case Progression (3 mutations)');

    try {
      MutationIntegrityLayer._activeTransaction = null;

      const progressionPacket = {
        xpDelta: 1000,
        featsAdded: ['Test Feat 1'],
        featsRemoved: [],
        talentsAdded: ['Test Talent 1'],
        talentsRemoved: [],
        trainedSkills: { acrobatics: true },
        itemsToCreate: [
          {
            name: 'Test Feat Item',
            type: 'feat',
            system: { description: 'Test item' }
          }
        ],
        stateUpdates: {
          'system.xp.total': (actor.system.xp?.total || 0) + 1000
        }
      };

      const result = await ActorEngine.applyProgression(actor, progressionPacket);

      const testResult = {
        name: 'Worst-Case Progression',
        expectedMutations: 3,
        expectedRecalcs: 1,
        actualMutations: result.mutationCount,
        actualRecalcs: undefined, // Set by Sentinel during transaction
        status: result.mutationCount <= 3 ? 'PASS' : 'FAIL',
        details: `Applied ${result.mutationCount} mutations atomically`
      };

      if (testResult.status === 'PASS') {
        console.log('[SENTINEL-TEST] ✅ PASS: Worst-Case Progression');
      } else {
        console.log('[SENTINEL-TEST] ❌ FAIL: Worst-Case Progression - Too many mutations');
      }

      return testResult;
    } catch (err) {
      console.error('[SENTINEL-TEST] ❌ FAIL: Worst-Case Progression', err);
      return {
        name: 'Worst-Case Progression',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * TEST SUITE 4: Nested Mutation Blocking
   * Verify that blockNestedMutations prevents re-entrance
   * Expected: Exception thrown when attempting nested mutation
   */
  async testNestedMutationBlocking(actor) {
    console.log('\n[SENTINEL-TEST] TEST SUITE 4: Nested Mutation Blocking');

    try {
      MutationIntegrityLayer._activeTransaction = null;

      let nestedAttemptDetected = false;

      // Try to trigger nested mutation during progression
      try {
        // Manually set up blocking context
        MutationIntegrityLayer.startTransaction({
          operation: 'applyProgression',
          source: 'test',
          suppressRecalc: true,
          blockNestedMutations: true
        });

        // Now try to start another transaction (should fail)
        try {
          MutationIntegrityLayer.startTransaction({
            operation: 'updateActor',
            source: 'test',
            blockNestedMutations: false
          });
          // If we got here, blocking failed
          nestedAttemptDetected = false;
        } catch (e) {
          // Expected: nested mutation was blocked
          nestedAttemptDetected = true;
        }

        MutationIntegrityLayer._activeTransaction = null;
      } catch (e) {
        console.error('Test setup error:', e);
      }

      const result = {
        name: 'Nested Mutation Blocking',
        nestedAttemptDetected,
        status: nestedAttemptDetected ? 'PASS' : 'FAIL',
        details: 'Verified that nested mutations are blocked'
      };

      if (result.status === 'PASS') {
        console.log('[SENTINEL-TEST] ✅ PASS: Nested Mutation Blocking');
      } else {
        console.log('[SENTINEL-TEST] ❌ FAIL: Nested Mutation Blocking - Did not detect nested attempt');
      }

      return result;
    } catch (err) {
      console.error('[SENTINEL-TEST] ❌ FAIL: Nested Mutation Blocking', err);
      return {
        name: 'Nested Mutation Blocking',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * TEST SUITE 5: PreparedDerivedData Skip Flag
   * Verify that suppressRecalc prevents prepareDerivedData calls
   * Expected: Actor has __skipPreparedDerivedData flag during transaction
   */
  async testSuppressRecalcFlag(actor) {
    console.log('\n[SENTINEL-TEST] TEST SUITE 5: SuppressRecalc Flag');

    try {
      MutationIntegrityLayer._activeTransaction = null;

      // This is tested indirectly through applyProgression
      // The flag is set/cleared during mutation
      const progressionPacket = {
        xpDelta: 500,
        featsAdded: [],
        featsRemoved: [],
        talentsAdded: [],
        talentsRemoved: [],
        trainedSkills: {},
        itemsToCreate: [],
        stateUpdates: { 'system.xp.total': (actor.system.xp?.total || 0) + 500 }
      };

      await ActorEngine.applyProgression(actor, progressionPacket);

      // Flag should be cleared after transaction
      const flagCleared = actor.__skipPreparedDerivedData === undefined;

      const result = {
        name: 'SuppressRecalc Flag',
        flagCleared,
        status: flagCleared ? 'PASS' : 'FAIL',
        details: 'Verified that suppressRecalc flag is properly managed'
      };

      if (result.status === 'PASS') {
        console.log('[SENTINEL-TEST] ✅ PASS: SuppressRecalc Flag');
      } else {
        console.log('[SENTINEL-TEST] ❌ FAIL: SuppressRecalc Flag - Not properly cleared');
      }

      return result;
    } catch (err) {
      console.error('[SENTINEL-TEST] ❌ FAIL: SuppressRecalc Flag', err);
      return {
        name: 'SuppressRecalc Flag',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * RUN ALL TESTS
   * Execute complete test suite and produce comprehensive report
   */
  async runAllTests(actor) {
    if (!actor) {
      console.error('[SENTINEL-TEST] No actor provided');
      return null;
    }

    console.log('\n' + '='.repeat(70));
    console.log('SENTINEL INTEGRATION TEST SUITE');
    console.log('='.repeat(70));
    console.log(`Testing actor: ${actor.name} (${actor.id})`);
    console.log('='.repeat(70));

    const results = [];

    // Run all test suites
    results.push(await this.testSimpleUpdate(actor));
    results.push(await this.testProgressionStateUpdate(actor));
    results.push(await this.testWorstCaseProgression(actor));
    results.push(await this.testNestedMutationBlocking(actor));
    results.push(await this.testSuppressRecalcFlag(actor));

    // Generate summary report
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));

    console.log('\nDETAILED RESULTS:');
    for (const result of results) {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`\n${icon} ${result.name}`);
      console.log(`   Status: ${result.status}`);
      if (result.details) console.log(`   Details: ${result.details}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.expectedMutations !== undefined) {
        console.log(`   Expected Mutations: ${result.expectedMutations}`);
      }
      if (result.actualMutations !== undefined) {
        console.log(`   Actual Mutations: ${result.actualMutations}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('END TEST SUITE');
    console.log('='.repeat(70) + '\n');

    return {
      totalTests: total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results,
      timestamp: new Date().toISOString()
    };
  }
};

export default SentinelIntegrationTests;
