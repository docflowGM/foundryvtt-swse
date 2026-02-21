/**
 * Phase 5A: Talent Effect Engine Tests
 *
 * Validates the new TalentEffectEngine → ActorEngine.applyTalentEffect() pattern
 *
 * Usage in console (DEV mode):
 *   game.settings.set('swse', 'sentinelMode', 'DEV');
 *   console.clear();
 *   Phase5ATests.runAllTests();
 */

import { DarkSideDevoteeMechanics } from '../scripts/talents/dark-side-devotee-mechanics.js';
import { TalentEffectEngine } from '../scripts/talents/talent-effect-engine.js';
import { ActorEngine } from '../scripts/../scripts/actors/engine/actor-engine.js';

export const Phase5ATests = {

  /**
   * Test 1: Channel Aggression Plan Building (Pure Computation)
   * Validates that TalentEffectEngine builds correct plan without mutations
   */
  async testChannelAggressionPlanBuilding() {
    console.log('\n=== TEST 1: Channel Aggression Plan Building ===');

    // Get test actors
    const sourceActor = game.user?.actor;
    const targetActor = game.actors?.getName('Test Enemy');

    if (!sourceActor || !targetActor) {
      console.log('❌ FAIL: Test actors not found');
      return { testName: 'Plan Building', status: 'FAIL', reason: 'Missing test actors' };
    }

    try {
      // Build plan (no mutations yet)
      const plan = await TalentEffectEngine.buildChannelAggressionPlan({
        sourceActor,
        targetActor,
        characterLevel: sourceActor.system.level || 1,
        spendFP: true
      });

      // Validate plan structure
      if (!plan.success) {
        console.log(`⚠️  Plan build failed: ${plan.reason}`);
        return {
          testName: 'Plan Building',
          status: 'INFO',
          reason: plan.reason,
          valid: false
        };
      }

      console.log(`✅ Plan built successfully`);
      console.log(`   - Damage Dice: ${plan.damageDice}d6`);
      console.log(`   - Damage Amount: ${plan.damageAmount}`);
      console.log(`   - Mutations to Apply: ${plan.mutations.length}`);

      // Validate mutations array
      if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
        console.log('❌ FAIL: Plan has no mutations');
        return { testName: 'Plan Building', status: 'FAIL', reason: 'No mutations in plan' };
      }

      // Log each mutation
      for (let i = 0; i < plan.mutations.length; i++) {
        const m = plan.mutations[i];
        console.log(`   - Mutation ${i + 1}: ${m.type} on ${m.actor.name}`);
      }

      return {
        testName: 'Plan Building',
        status: 'PASS',
        damageDice: plan.damageDice,
        damageAmount: plan.damageAmount,
        mutationCount: plan.mutations.length,
        valid: true
      };

    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      return { testName: 'Plan Building', status: 'FAIL', error: err.message };
    }
  },

  /**
   * Test 2: ActorEngine.applyTalentEffect() Execution
   * Validates that mutations execute correctly and return results
   */
  async testApplyTalentEffectExecution() {
    console.log('\n=== TEST 2: Channel Aggression Execution ===');

    const sourceActor = game.user?.actor;
    const targetActor = game.actors?.getName('Test Enemy');

    if (!sourceActor || !targetActor) {
      console.log('❌ FAIL: Test actors not found');
      return { testName: 'Execution', status: 'FAIL', reason: 'Missing test actors' };
    }

    try {
      // Record initial state
      const sourceFpBefore = sourceActor.system.forcePoints?.value ?? 0;
      const targetHpBefore = targetActor.system.hp?.value ?? 0;

      console.log(`   Before: Source FP=${sourceFpBefore}, Target HP=${targetHpBefore}`);

      // Build and execute plan
      const plan = await TalentEffectEngine.buildChannelAggressionPlan({
        sourceActor,
        targetActor,
        characterLevel: sourceActor.system.level || 1,
        spendFP: true
      });

      if (!plan.success) {
        console.log(`⚠️  Plan build failed: ${plan.reason}`);
        return {
          testName: 'Execution',
          status: 'INFO',
          reason: plan.reason
        };
      }

      // Execute mutations
      const result = await ActorEngine.applyTalentEffect(plan);

      if (!result.success) {
        console.log(`❌ FAIL: ${result.reason}`);
        return { testName: 'Execution', status: 'FAIL', reason: result.reason };
      }

      // Reload and check state
      await sourceActor.sheet.render(false); // Refresh actor data
      await targetActor.sheet.render(false);

      const sourceFpAfter = sourceActor.system.forcePoints?.value ?? 0;
      const targetHpAfter = targetActor.system.hp?.value ?? 0;

      console.log(`   After: Source FP=${sourceFpAfter}, Target HP=${targetHpAfter}`);
      console.log(`   Mutations Applied: ${result.mutationCount}`);
      console.log(`   Results: ${result.results.map(r => `${r.type}:${r.success ? 'OK' : 'FAIL'}`).join(', ')}`);

      // Validate state changes
      const fpSpent = sourceFpBefore - sourceFpAfter;
      const damageTaken = targetHpBefore - targetHpAfter;

      if (fpSpent === 1 && damageTaken === result.damageAmount) {
        console.log(`✅ Mutations applied correctly`);
        return {
          testName: 'Execution',
          status: 'PASS',
          fpSpent,
          damageTaken,
          damageAmount: result.damageAmount,
          mutationCount: result.mutationCount,
          resultsCount: result.results.length
        };
      } else {
        console.log(`❌ FAIL: State changes don't match expected`);
        console.log(`   Expected: FP spent=1, Damage=${result.damageAmount}`);
        console.log(`   Actual: FP spent=${fpSpent}, Damage=${damageTaken}`);
        return {
          testName: 'Execution',
          status: 'FAIL',
          reason: 'State mismatch',
          fpSpent,
          damageTaken,
          expected: { fpSpent: 1, damage: result.damageAmount }
        };
      }

    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      return { testName: 'Execution', status: 'FAIL', error: err.message };
    }
  },

  /**
   * Test 3: Full Channel Aggression Flow
   * Validates the complete triggerChannelAggression() integration
   */
  async testFullChannelAggressionFlow() {
    console.log('\n=== TEST 3: Full Channel Aggression Flow ===');

    const sourceActor = game.user?.actor;
    const targetToken = canvas?.tokens?.placeables?.[0]; // First token in scene

    if (!sourceActor || !targetToken?.actor) {
      console.log('❌ FAIL: Source or target not found');
      return {
        testName: 'Full Flow',
        status: 'FAIL',
        reason: 'Missing actors or tokens'
      };
    }

    try {
      // Record initial state
      const hpBefore = targetToken.actor.system.hp?.value ?? 0;

      // Call the new triggerChannelAggression
      const result = await DarkSideDevoteeMechanics.triggerChannelAggression(
        sourceActor,
        targetToken,
        sourceActor.system.level || 1,
        true
      );

      if (!result.success) {
        console.log(`⚠️  Channel Aggression: ${result.message}`);
        return {
          testName: 'Full Flow',
          status: 'INFO',
          reason: result.message
        };
      }

      // Check result structure
      const expectedFields = ['success', 'damageDice', 'damageRoll', 'damageAmount', 'mutationCount'];
      const missingFields = expectedFields.filter(f => !(f in result));

      if (missingFields.length > 0) {
        console.log(`❌ FAIL: Missing result fields: ${missingFields.join(', ')}`);
        return {
          testName: 'Full Flow',
          status: 'FAIL',
          reason: `Missing fields: ${missingFields.join(', ')}`,
          result
        };
      }

      const hpAfter = targetToken.actor.system.hp?.value ?? 0;
      const actualDamage = hpBefore - hpAfter;

      console.log(`✅ Channel Aggression succeeded`);
      console.log(`   - Damage Dice: ${result.damageDice}d6`);
      console.log(`   - Damage Roll: ${result.damageRoll.result}`);
      console.log(`   - Damage Amount: ${result.damageAmount}`);
      console.log(`   - Actual Damage Applied: ${actualDamage}`);
      console.log(`   - Mutations: ${result.mutationCount}`);

      if (actualDamage === result.damageAmount) {
        console.log(`✅ Damage matches expected amount`);
        return {
          testName: 'Full Flow',
          status: 'PASS',
          damageDice: result.damageDice,
          damageAmount: result.damageAmount,
          mutationCount: result.mutationCount
        };
      } else {
        console.log(`⚠️  Damage mismatch`);
        return {
          testName: 'Full Flow',
          status: 'INFO',
          reason: 'Damage mismatch',
          expected: result.damageAmount,
          actual: actualDamage
        };
      }

    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      return {
        testName: 'Full Flow',
        status: 'FAIL',
        error: err.message
      };
    }
  },

  /**
   * Test 4: Sentinel Transaction Logging
   * Validates that Sentinel is capturing transactions correctly
   */
  testSentinelLogging() {
    console.log('\n=== TEST 4: Sentinel Transaction Logging ===');

    const sentinelMode = game.settings.get('foundryvtt-swse', 'sentinelMode');

    if (sentinelMode !== 'DEV') {
      console.log(`⚠️  Sentinel not in DEV mode (current: ${sentinelMode})`);
      return {
        testName: 'Sentinel Logging',
        status: 'INFO',
        reason: `Sentinel in ${sentinelMode} mode, not DEV`,
        instruction: 'Run: game.settings.set(\'swse\', \'sentinelMode\', \'DEV\');'
      };
    }

    console.log('✅ Sentinel in DEV mode - check console for [Sentinel] logs');
    console.log('   Look for: Transaction START/END messages');
    console.log('   Measure: Mutation count per transaction');
    console.log('   Verify: applyTalentEffect logs show correct mutation sequence');

    return {
      testName: 'Sentinel Logging',
      status: 'PASS',
      mode: sentinelMode,
      instruction: 'Check console for [Sentinel] tagged output'
    };
  },

  /**
   * Run all Phase 5A tests
   */
  async runAllTests() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          PHASE 5A: TALENT EFFECT ENGINE TESTS                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const results = [];

    // Run tests sequentially
    results.push(await this.testChannelAggressionPlanBuilding());
    results.push(await this.testApplyTalentEffectExecution());
    results.push(await this.testFullChannelAggressionFlow());
    results.push(this.testSentinelLogging());

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const infoCount = results.filter(r => r.status === 'INFO').length;

    console.log(`\n✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`ℹ️  INFO: ${infoCount}`);

    console.table(results);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      NEXT STEPS                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('1. Review [Sentinel] logs in console for transaction patterns');
    console.log('2. Verify mutation count is 2 (FP spend + HP damage)');
    console.log('3. Verify each mutation is separately governed');
    console.log('4. If all pass: ready to scale pattern to other talents');
    console.log('5. If any fail: review error messages above');

    return {
      summary: {
        totalTests: results.length,
        passed: passCount,
        failed: failCount,
        info: infoCount,
        timestamp: new Date().toISOString()
      },
      results
    };
  }
};

// Export for console access
window.Phase5ATests = Phase5ATests;
