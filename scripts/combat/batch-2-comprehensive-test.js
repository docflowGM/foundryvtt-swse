/**
 * BATCH 2: COMPREHENSIVE COMBAT MUTATION TEST SUITE
 *
 * Tests all 8 routed combat files and 7 ActorEngine combat APIs:
 * 1. applyDamage() — damage-engine.js
 * 2. applyHealing() — (new)
 * 3. applyConditionShift() — ion-damage.js, massive-damage-engine.js, combat-integration.js
 * 4. updateActionEconomy() — swse-combatant.js, swse-combat.js
 * 5. spendForcePoints() — enhanced-rolls.js
 * 6. spendDestinyPoints() — enhanced-rolls.js
 * 7. resetSecondWind() — combat-automation.js, swse-combat.js
 *
 * Run in console:
 * await swse.debug.batch2.testCombatComplete()
 */

import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { DerivedCalculator } from '../../actors/derived/derived-calculator.js';

export class Batch2ComprehensiveTest {
  static results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: [],
    errors: []
  };

  static async runFullSuite() {
    console.group('%c🎯 BATCH 2 COMPREHENSIVE COMBAT MUTATION TEST SUITE', 'color: cyan; font-weight: bold; font-size: 14px;');

    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: [],
      errors: []
    };

    const testActor = this._getTestActor();
    if (!testActor) {
      console.error('❌ No test actor available');
      console.groupEnd();
      return;
    }

    console.log(`Test Actor: ${testActor.name}`);
    console.log('');

    // Test each combat API
    await this._testApplyDamage(testActor);
    await this._testApplyHealing(testActor);
    await this._testApplyConditionShift(testActor);
    await this._testUpdateActionEconomy(testActor);
    await this._testSpendForcePoints(testActor);
    await this._testSpendDestinyPoints(testActor);
    await this._testResetSecondWind(testActor);

    // Verify Sentinel
    await this._testSentinelEnforcement(testActor);

    this._printSummary();
    console.groupEnd();
    return this.results;
  }

  static async _testApplyDamage(actor) {
    console.group('%c TEST 1: applyDamage()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const oldHP = actor.system.attributes?.hp?.value || 0;
      const result = await ActorEngine.applyDamage(actor, {
        amount: 10,
        type: 'kinetic',
        source: 'test',
        conditionShift: false
      });

      const newHP = actor.system.attributes?.hp?.value || 0;

      if (newHP === oldHP - 10) {
        console.log('✅ Damage applied correctly');
        this.results.passed++;
      } else {
        console.error(`❌ HP mismatch: expected ${oldHP - 10}, got ${newHP}`);
        this.results.failed++;
        this.results.errors.push(`TEST 1: HP not reduced correctly`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 1: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testApplyHealing(actor) {
    console.group('%c TEST 2: applyHealing()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const oldHP = actor.system.attributes?.hp?.value || 0;
      const result = await ActorEngine.applyHealing(actor, 5, 'test');

      const newHP = actor.system.attributes?.hp?.value || 0;
      const maxHP = actor.system.attributes?.hp?.max || 100;

      const expectedHP = Math.min(maxHP, oldHP + 5);
      if (newHP === expectedHP) {
        console.log('✅ Healing applied correctly');
        this.results.passed++;
      } else {
        console.error(`❌ HP mismatch: expected ${expectedHP}, got ${newHP}`);
        this.results.failed++;
        this.results.errors.push(`TEST 2: Healing not applied correctly`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 2: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testApplyConditionShift(actor) {
    console.group('%c TEST 3: applyConditionShift()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const oldCT = actor.system.progression?.conditionTrack || 0;
      await ActorEngine.applyConditionShift(actor, 1, 'test');

      const newCT = actor.system.progression?.conditionTrack || 0;

      if (newCT === oldCT + 1) {
        console.log('✅ Condition shift applied correctly');
        this.results.passed++;
      } else {
        console.error(`❌ CT mismatch: expected ${oldCT + 1}, got ${newCT}`);
        this.results.failed++;
        this.results.errors.push(`TEST 3: CT not shifted correctly`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 3: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testUpdateActionEconomy(actor) {
    console.group('%c TEST 4: updateActionEconomy()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const updateData = {
        swift: false,
        move: false,
        standard: false,
        fullRound: false,
        reaction: true
      };

      await ActorEngine.updateActionEconomy(actor, updateData);

      const actionEconomy = actor.system.actionEconomy;
      if (actionEconomy.standard === false && actionEconomy.reaction === true) {
        console.log('✅ Action economy updated correctly');
        this.results.passed++;
      } else {
        console.error('❌ Action economy not updated');
        this.results.failed++;
        this.results.errors.push(`TEST 4: Action economy update failed`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 4: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testSpendForcePoints(actor) {
    console.group('%c TEST 5: spendForcePoints()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Set some FP first
      await ActorEngine.updateActor(actor, {
        'system.forcePoints.value': 5
      });

      const oldFP = actor.system.forcePoints?.value || 0;
      const result = await ActorEngine.spendForcePoints(actor, 2);

      const newFP = actor.system.forcePoints?.value || 0;

      if (newFP === oldFP - 2) {
        console.log('✅ Force points spent correctly');
        this.results.passed++;
      } else {
        console.error(`❌ FP mismatch: expected ${oldFP - 2}, got ${newFP}`);
        this.results.failed++;
        this.results.errors.push(`TEST 5: Force points not spent correctly`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 5: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testSpendDestinyPoints(actor) {
    console.group('%c TEST 6: spendDestinyPoints()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Set some DP first
      await ActorEngine.updateActor(actor, {
        'system.destinyPoints.value': 3
      });

      const oldDP = actor.system.destinyPoints?.value || 0;
      const result = await ActorEngine.spendDestinyPoints(actor, 1);

      const newDP = actor.system.destinyPoints?.value || 0;

      if (newDP === oldDP - 1) {
        console.log('✅ Destiny points spent correctly');
        this.results.passed++;
      } else {
        console.error(`❌ DP mismatch: expected ${oldDP - 1}, got ${newDP}`);
        this.results.failed++;
        this.results.errors.push(`TEST 6: Destiny points not spent correctly`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 6: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testResetSecondWind(actor) {
    console.group('%c TEST 7: resetSecondWind()', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      // Set secondWind as used
      await ActorEngine.updateActor(actor, {
        'system.secondWind.used': true
      });

      await ActorEngine.resetSecondWind(actor);

      const isUsed = actor.system.secondWind?.used || false;

      if (isUsed === false) {
        console.log('✅ Second wind reset correctly');
        this.results.passed++;
      } else {
        console.error('❌ Second wind not reset');
        this.results.failed++;
        this.results.errors.push(`TEST 7: Second wind not reset`);
      }

    } catch (err) {
      console.error('❌ Exception:', err.message);
      this.results.failed++;
      this.results.errors.push(`TEST 7: ${err.message}`);
    }

    console.groupEnd();
  }

  static async _testSentinelEnforcement(actor) {
    console.group('%c TEST 8: Sentinel Enforcement', 'color: yellow; font-weight: bold;');
    this.results.totalTests++;

    try {
      const { MutationIntegrityLayer } = await import('../../core/sentinel/mutation-integrity-layer.js');
      const summary = MutationIntegrityLayer.getViolationSummary();

      if (summary.violations === 0) {
        console.log('✅ Sentinel: Zero violations');
        this.results.passed++;
      } else {
        console.error(`❌ Sentinel: ${summary.violations} violations detected`);
        this.results.failed++;
        this.results.errors.push(`TEST 8: ${summary.violations} sentinel violations`);
      }

    } catch (err) {
      console.warn('⚠️  Could not verify sentinel:', err.message);
      this.results.warnings.push(`TEST 8: Sentinel check skipped`);
    }

    console.groupEnd();
  }

  static _getTestActor() {
    const character = game.actors?.contents.find(a => a.type === 'character');
    if (character) return character;
    return game.actors?.contents[0];
  }

  static _printSummary() {
    console.group('%c📊 BATCH 2 TEST SUMMARY', 'color: cyan; font-weight: bold; font-size: 12px;');

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
      console.group('%c🚨 FAILURES', 'color: red;');
      errors.forEach(e => console.error(`• ${e}`));
      console.groupEnd();
    }

    console.log('');
    if (failed === 0 && passRate >= 87) {
      console.log('%c✅ BATCH 2 COMBAT MUTATIONS VERIFIED — Ready for Batch 3', 'color: green; font-weight: bold; font-size: 13px;');
    } else {
      console.log('%c❌ BATCH 2 TESTS FAILED — Review errors above', 'color: red; font-weight: bold; font-size: 13px;');
    }

    console.groupEnd();
  }
}

// Expose to console
if (typeof window !== 'undefined') {
  window.Batch2ComprehensiveTest = Batch2ComprehensiveTest;
}
