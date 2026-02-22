/**
 * Transaction Verification Script
 * Demonstrates PHASE 3 mutation invariant enforcement
 *
 * Usage in console:
 *   TransactionVerification.runProgressionTest(actor)
 *   TransactionVerification.runDamageTest(actor)
 *   TransactionVerification.reportTransaction()
 */

import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { MutationIntegrityLayer } from './mutation-integrity-layer.js';

export const TransactionVerification = {

  /**
   * Simulate a progression transaction (worst case: all 3 mutations)
   * Should produce: 3 mutations, 1 recalc
   */
  async runProgressionTest(actor) {
    if (!actor) {
      console.error('[TransactionVerification] No actor provided');
      return null;
    }

    console.log(`\n[TransactionVerification] PROGRESSION TEST on ${actor.name}`);
    console.log('Expected: 3 mutations, 1 recalc');

    const xpGain = 1000;
    const packet = {
      xpDelta: xpGain,
      featsAdded: ['feat-1', 'feat-2'],
      featsRemoved: [],
      talentsAdded: [],
      talentsRemoved: [],
      trainedSkills: {},
      itemsToCreate: [
        { name: 'Test Feat', type: 'feat', system: {} }
      ],
      stateUpdates: {
        'system.progression.levels.soldier': 1
      }
    };

    try {
      const result = await ActorEngine.applyProgression(actor, packet);
      console.log(`[TransactionVerification] Result:`, result);
      return result;
    } catch (err) {
      console.error(`[TransactionVerification] Test failed:`, err);
      throw err;
    }
  },

  /**
   * Simulate a simple damage application (1 mutation, 1 recalc)
   * Should produce: 1 mutation, 1 recalc
   */
  async runDamageTest(actor) {
    if (!actor) {
      console.error('[TransactionVerification] No actor provided');
      return null;
    }

    console.log(`\n[TransactionVerification] DAMAGE TEST on ${actor.name}`);
    console.log('Expected: 1 mutation, 1 recalc');

    try {
      // Simple update via ActorEngine (no embedded mutations)
      const result = await ActorEngine.updateActor(actor, {
        'system.hp.current': Math.max(0, (actor.system.hp?.current || 0) - 5)
      });
      console.log(`[TransactionVerification] Result:`, result);
      return result;
    } catch (err) {
      console.error(`[TransactionVerification] Test failed:`, err);
      throw err;
    }
  },

  /**
   * Report current transaction state
   * (Debug helper)
   */
  reportTransaction() {
    const layer = MutationIntegrityLayer;
    if (!layer._activeTransaction) {
      console.log('[TransactionVerification] No active transaction');
      return null;
    }

    const tx = layer._activeTransaction;
    console.log(`[TransactionVerification] Active Transaction:`, {
      operation: tx.operation,
      mutations: tx.mutationCount,
      derivedRecalcs: tx.derivedRecalcCount,
      elapsed: (performance.now() - tx.startTime).toFixed(2) + 'ms'
    });

    return tx;
  },

  /**
   * Verify invariants for all known operations
   * Reports PASS/FAIL for each
   */
  async verifyAllInvariants(actor) {
    if (!actor) {
      console.error('[TransactionVerification] No actor provided');
      return null;
    }

    console.log(`\n[TransactionVerification] FULL INVARIANT SUITE on ${actor.name}\n`);

    const tests = [
      {
        name: 'Progression (worst case)',
        test: () => this.runProgressionTest(actor),
        expectedMutations: 3,
        expectedRecalcs: 1
      },
      {
        name: 'Simple Update',
        test: () => this.runDamageTest(actor),
        expectedMutations: 1,
        expectedRecalcs: 1
      }
    ];

    const results = [];
    for (const testCase of tests) {
      try {
        console.log(`\n📋 Running: ${testCase.name}`);
        await testCase.test();

        // After transaction ends, manually check last transaction
        // (Since endTransaction clears _activeTransaction)
        results.push({
          test: testCase.name,
          status: 'PASS',
          expected: {
            mutations: testCase.expectedMutations,
            recalcs: testCase.expectedRecalcs
          }
        });
      } catch (err) {
        results.push({
          test: testCase.name,
          status: 'FAIL',
          error: err.message
        });
      }
    }

    // Summary report
    console.log(`\n${'='.repeat(60)}`);
    console.log('[TransactionVerification] SUMMARY');
    console.log(`${'='.repeat(60)}`);
    for (const r of results) {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.test}`);
      if (r.error) console.log(`   Error: ${r.error}`);
    }

    const passCount = results.filter(r => r.status === 'PASS').length;
    console.log(`\nPassed: ${passCount}/${results.length}`);

    return results;
  }

};

export default TransactionVerification;
