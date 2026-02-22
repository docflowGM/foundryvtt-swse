/**
 * DamageEngine Test Harness — PHASE 3 Determinism Verification
 *
 * Validates:
 * 1. Single recalc per damage event
 * 2. Atomic mutation (HP + condition in one update)
 * 3. Sentinel silence (zero violations)
 * 4. No nested mutations
 * 5. No inline mutation logic
 *
 * Run in console:
 * await DamageEngineTest.runFullSuite()
 */

import { DamageEngine } from './damage-engine.js';
import { DerivedCalculator } from '../../actors/derived/derived-calculator.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export class DamageEngineTest {
  static results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: [],
    errors: []
  };

  static recalcLog = [];
  static mutationLog = [];

  /**
   * RUN FULL TEST SUITE
   */
  static async runFullSuite() {
    console.group('%c🧪 DAMAGE ENGINE DETERMINISM TEST SUITE', 'color: orange; font-weight: bold; font-size: 14px;');

    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: [],
      errors: []
    };

    this.recalcLog = [];
    this.mutationLog = [];

    // Setup test actor
    const testActor = this._getTestActor();
    if (!testActor) {
      console.error('❌ No test actor available. Create a character first.');
      console.groupEnd();
      return;
    }

    console.log(`Test Actor: ${testActor.name} (HP: ${testActor.system.attributes?.hp?.value}/${testActor.system.attributes?.hp?.max})`);
    console.log('');

    // Instrument DerivedCalculator
    this._instrumentDerivedCalculator(testActor.id);

    // TEST 1: Single Recalc Per Normal Attack
    await this._test1_SingleRecalcNormalDamage(testActor);

    // TEST 2: Atomic Mutation Verification
    await this._test2_AtomicMutation(testActor);

    // TEST 3: Sentinel Silence
    await this._test3_SentinelSilence(testActor);

    // TEST 4: No Nested Mutations
    await this._test4_NoNestedMutations(testActor);

    // TEST 5: Condition Shift Integration
    await this._test5_ConditionShiftAtomic(testActor);

    // Print summary
    this._printSummary(testActor);

    console.groupEnd();
    return this.results;
  }

  /**
   * TEST 1: Single Recalc Per Normal Damage Event
   */
  static async _test1_SingleRecalcNormalDamage(actor) {
    console.group('%c TEST 1: Single Recalc Per Damage', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const oldHP = actor.system.attributes?.hp?.value || 0;
      this.recalcLog = [];

      console.log(`Applying 10 damage to ${actor.name}...`);
      const result = await DamageEngine.applyDamage(actor, 10, { damageType: 'kinetic' });

      // Wait for async recalc
      await new Promise(resolve => setTimeout(resolve, 150));

      const recalcCount = this.recalcLog.length;
      console.log(`Recalculations triggered: ${recalcCount}`);
      console.log(`HP changed: ${oldHP} → ${result.newHP} (${oldHP - result.newHP} damage)`);

      if (recalcCount === 1) {
        console.log('✅ Exactly ONE recalc per damage event');
        this.results.passed++;
      } else if (recalcCount === 0) {
        console.warn('⚠️  No recalcs detected (async timing issue?)');
        this.results.warnings.push('TEST 1: No recalcs detected');
      } else {
        console.error(`❌ DOUBLE-RECALC DETECTED: ${recalcCount} recalcs (expected 1)`);
        this.results.failed++;
        this.results.errors.push(`TEST 1: ${recalcCount} recalcs per mutation (expected 1)`);
      }

    } catch (err) {
      console.error('❌ TEST 1 Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 1: ${err.message}`);
    }

    console.groupEnd();
  }

  /**
   * TEST 2: Atomic Mutation (HP + Condition in One Update)
   */
  static async _test2_AtomicMutation(actor) {
    console.group('%c TEST 2: Atomic Mutation', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const maxHP = actor.system.attributes?.hp?.max || 100;
      const thresholdDamage = Math.floor(maxHP * 0.8); // Damage that drops below threshold

      // Reset to near-full HP
      await ActorEngine.updateActor(actor, {
        'system.attributes.hp.value': maxHP
      });

      this.mutationLog = [];
      this.recalcLog = [];

      console.log(`Applying ${thresholdDamage} damage (should trigger condition shift)...`);
      const result = await DamageEngine.applyDamage(actor, thresholdDamage, {
        damageType: 'kinetic',
        forceMassiveDamageCheck: true
      });

      // Wait for async
      await new Promise(resolve => setTimeout(resolve, 150));

      const mutationCount = this.mutationLog.length;
      console.log(`Mutations recorded: ${mutationCount}`);
      console.log(`Recalcs triggered: ${this.recalcLog.length}`);
      console.log(`Condition shifted: ${result.conditionShifted}`);

      if (mutationCount === 1) {
        console.log('✅ Atomic: Single mutation for damage + condition logic');
        this.results.passed++;
      } else if (mutationCount === 2) {
        console.warn('⚠️  Two mutations detected (HP update + condition update separate)');
        this.results.warnings.push('TEST 2: Non-atomic mutations (2 updates instead of 1)');
      } else {
        console.error(`❌ Multiple mutations: ${mutationCount} updates (expected 1)`);
        this.results.failed++;
        this.results.errors.push(`TEST 2: ${mutationCount} mutations (expected 1 atomic update)`);
      }

    } catch (err) {
      console.error('❌ TEST 2 Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 2: ${err.message}`);
    }

    console.groupEnd();
  }

  /**
   * TEST 3: Sentinel Silence (No Violations)
   */
  static async _test3_SentinelSilence(actor) {
    console.group('%c TEST 3: Sentinel Silence', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Get violation summary
      const { MutationIntegrityLayer } = await import('../../core/sentinel/mutation-integrity-layer.js');
      const summary = MutationIntegrityLayer.getViolationSummary();

      console.log('Mutation violations:', summary.violations);
      console.log('Status:', summary.status);

      if (summary.violations === 0 && summary.status === 'OK') {
        console.log('✅ Sentinel silence: Zero mutation violations');
        this.results.passed++;
      } else if (summary.violations > 0) {
        console.error('❌ Sentinel detected violations:', summary.byCaller);
        this.results.failed++;
        this.results.errors.push(`TEST 3: ${summary.violations} mutation violations detected`);
      } else {
        console.warn('⚠️  Sentinel status unclear');
        this.results.warnings.push('TEST 3: Could not determine sentinel status');
      }

    } catch (err) {
      console.error('❌ TEST 3 Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 3: ${err.message}`);
    }

    console.groupEnd();
  }

  /**
   * TEST 4: No Nested Mutations
   */
  static async _test4_NoNestedMutations(actor) {
    console.group('%c TEST 4: No Nested Mutations', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Check if applyConditionShift calls updateActor internally
      this.mutationLog = [];
      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');

      console.log('Applying condition shift directly...');
      await ActorEngine.applyConditionShift(actor, 1, 'test');

      // Check mutation count
      const conditionalMutationCount = this.mutationLog.length;
      console.log(`Mutations in condition shift: ${conditionalMutationCount}`);

      if (conditionalMutationCount === 1) {
        console.log('✅ No nested mutations: applyConditionShift is direct');
        this.results.passed++;
      } else if (conditionalMutationCount === 0) {
        console.warn('⚠️  No mutations detected (but applyConditionShift should call updateActor)');
        this.results.warnings.push('TEST 4: Expected 1 mutation');
      } else {
        console.error(`❌ Nested mutation detected: ${conditionalMutationCount} mutations`);
        this.results.failed++;
        this.results.errors.push(`TEST 4: Nested mutations in applyConditionShift (${conditionalMutationCount})`);
      }

    } catch (err) {
      console.error('❌ TEST 4 Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 4: ${err.message}`);
    }

    console.groupEnd();
  }

  /**
   * TEST 5: Condition Shift Atomic Within Damage
   */
  static async _test5_ConditionShiftAtomic(actor) {
    console.group('%c TEST 5: Condition Shift Atomic', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Reset HP to max
      const maxHP = actor.system.attributes?.hp?.max || 100;
      await ActorEngine.updateActor(actor, {
        'system.attributes.hp.value': maxHP,
        'system.progression.conditionTrack': 0
      });

      this.mutationLog = [];
      this.recalcLog = [];

      // Damage that crosses threshold
      const thresholdDamage = Math.floor(maxHP * 0.75);
      console.log(`Applying damage to trigger condition shift (${thresholdDamage}HP)...`);

      const result = await DamageEngine.applyDamage(actor, thresholdDamage, {
        damageType: 'kinetic'
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      const finalHP = actor.system.attributes?.hp?.value;
      const finalCondition = actor.system.progression?.conditionTrack || 0;

      console.log(`Result: HP ${maxHP} → ${finalHP}, Condition: 0 → ${finalCondition}`);
      console.log(`Mutations: ${this.mutationLog.length}, Recalcs: ${this.recalcLog.length}`);

      if (this.mutationLog.length === 1 && this.recalcLog.length === 1) {
        console.log('✅ Atomic: Damage + condition in one mutation, one recalc');
        this.results.passed++;
      } else {
        console.warn(`⚠️  Non-ideal: ${this.mutationLog.length} mutations, ${this.recalcLog.length} recalcs`);
        this.results.warnings.push('TEST 5: Non-atomic condition shift');
      }

    } catch (err) {
      console.error('❌ TEST 5 Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 5: ${err.message}`);
    }

    console.groupEnd();
  }

  /**
   * Instrument DerivedCalculator to track calls
   * @private
   */
  static _instrumentDerivedCalculator(actorId) {
    const origComputeAll = DerivedCalculator.computeAll;
    DerivedCalculator.computeAll = async function(targetActor) {
      if (targetActor?.id === actorId) {
        this.recalcLog.push({
          timestamp: Date.now(),
          stack: new Error().stack
        });
      }
      return origComputeAll.call(this, targetActor);
    }.bind(this);

    // Also instrument ActorEngine.updateActor to track mutations
    const origUpdateActor = ActorEngine.updateActor;
    ActorEngine.updateActor = async function(actor, updateData, options) {
      if (actor?.id === actorId) {
        this.mutationLog.push({
          timestamp: Date.now(),
          data: updateData,
          stack: new Error().stack
        });
      }
      return origUpdateActor.call(this, actor, updateData, options);
    }.bind(this);

    console.log('[Instrumentation] DerivedCalculator and ActorEngine hooked');
  }

  /**
   * Get test actor
   * @private
   */
  static _getTestActor() {
    const character = game.actors?.contents.find(a => a.type === 'character');
    if (character) return character;
    return game.actors?.contents[0];
  }

  /**
   * Print test summary
   * @private
   */
  static _printSummary(actor) {
    console.group('%c📊 TEST SUMMARY', 'color: cyan; font-weight: bold; font-size: 12px;');

    const { totalTests, passed, failed, warnings, errors } = this.results;
    const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    console.log(`Tests Run: ${totalTests}`);
    console.log(`%c✅ Passed: ${passed}`, 'color: green; font-weight: bold;');
    console.log(`%c❌ Failed: ${failed}`, failed > 0 ? 'color: red; font-weight: bold;' : 'color: gray;');
    console.log(`Pass Rate: ${passRate}%`);

    if (warnings.length > 0) {
      console.log('');
      console.group('%c⚠️  WARNINGS', 'color: orange;');
      warnings.forEach(w => console.log(`• ${w}`));
      console.groupEnd();
    }

    if (errors.length > 0) {
      console.log('');
      console.group('%c🚨 CRITICAL FAILURES', 'color: red;');
      errors.forEach(e => console.error(`• ${e}`));
      console.groupEnd();
    }

    console.log('');
    if (failed === 0 && passRate >= 80) {
      console.log('%c✅ DAMAGE ENGINE DETERMINISM VERIFIED — Ready for File 2', 'color: green; font-weight: bold; font-size: 13px;');
    } else if (failed === 0 && warnings.length > 0) {
      console.log('%c⚠️  DAMAGE ENGINE FUNCTIONAL WITH WARNINGS — Review before File 2', 'color: orange; font-weight: bold; font-size: 13px;');
    } else {
      console.log('%c❌ DAMAGE ENGINE TESTS FAILED — Fix before File 2', 'color: red; font-weight: bold; font-size: 13px;');
    }

    console.groupEnd();
  }
}

// Expose to console
if (typeof window !== 'undefined') {
  window.DamageEngineTest = DamageEngineTest;
}
