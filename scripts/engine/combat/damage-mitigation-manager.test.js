/**
 * DamageMitigationManager — Unit Tests
 *
 * Validates the damage mitigation resolver pipeline in isolation.
 * These tests do NOT require a full actor instance.
 */

import { DamageMitigationManager } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-mitigation-manager.js";
import { ShieldMitigationResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/shield-mitigation-resolver.js";
import { DamageReductionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/damage-reduction-resolver.js";
import { TempHPResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/resolvers/temp-hp-resolver.js";

/**
 * Mock actor for testing
 */
function mockActor(overrides = {}) {
  return {
    name: 'Test Actor',
    type: 'character',
    system: {
      hp: {
        value: 50,
        max: 100,
        temp: 0,
        ...overrides.hp
      },
      defenses: {
        fortitude: { total: 15 },
        ...overrides.defenses
      },
      derived: {
        shield: {
          current: 0,
          max: 0,
          source: '',
          ...overrides.shield
        },
        ...overrides.derived
      },
      damageReduction: overrides.damageReduction ?? 0,
      ...overrides
    }
  };
}

/**
 * TEST SUITE: ShieldMitigationResolver
 */
export const testShieldResolver = () => {
  console.log('🔍 Testing ShieldMitigationResolver...');

  // TEST 1: No SR
  let result = ShieldMitigationResolver.resolve({
    damage: 20,
    actor: mockActor(),
    context: {}
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 20 && result.srApplied === 0,
    '✅ TEST 1: No SR passes through unchanged');

  // TEST 2: SR absorbs partial damage
  result = ShieldMitigationResolver.resolve({
    damage: 20,
    actor: mockActor({ shield: { current: 8 } }),
    context: {}
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 12 && result.srApplied === 8,
    '✅ TEST 2: SR absorbs 8 damage, 12 remains');

  // TEST 3: SR absorbs all damage
  result = ShieldMitigationResolver.resolve({
    damage: 5,
    actor: mockActor({ shield: { current: 10 } }),
    context: {}
  });
  console.assert(result.damageBefore === 5 && result.damageAfter === 0 && result.srApplied === 5 && result.srDegraded === 0,
    '✅ TEST 3: SR absorbs all damage, no degradation');

  // TEST 4: SR degrades when damage > SR
  result = ShieldMitigationResolver.resolve({
    damage: 15,
    actor: mockActor({ shield: { current: 10 } }),
    context: {}
  });
  console.assert(result.damageBefore === 15 && result.damageAfter === 5 && result.srApplied === 10 && result.srDegraded === 5,
    '✅ TEST 4: SR degrades by 5 when exceeded');

  console.log('✅ ShieldMitigationResolver tests passed\n');
};

/**
 * TEST SUITE: DamageReductionResolver
 */
export const testDRResolver = () => {
  console.log('🔍 Testing DamageReductionResolver...');

  // TEST 1: No DR
  let result = DamageReductionResolver.resolve({
    damage: 20,
    actor: mockActor(),
    context: {}
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 20 && result.drApplied === 0,
    '✅ TEST 1: No DR passes through unchanged');

  // TEST 2: DR reduces damage
  result = DamageReductionResolver.resolve({
    damage: 20,
    actor: mockActor({ damageReduction: 5 }),
    context: {}
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 15 && result.drApplied === 5,
    '✅ TEST 2: DR reduces by 5');

  // TEST 3: DR absorbs all damage
  result = DamageReductionResolver.resolve({
    damage: 5,
    actor: mockActor({ damageReduction: 10 }),
    context: {}
  });
  console.assert(result.damageBefore === 5 && result.damageAfter === 0 && result.drApplied === 5,
    '✅ TEST 3: DR absorbs all damage');

  console.log('✅ DamageReductionResolver tests passed\n');
};

/**
 * TEST SUITE: TempHPResolver
 */
export const testTempHPResolver = () => {
  console.log('🔍 Testing TempHPResolver...');

  // TEST 1: No Temp HP
  let result = TempHPResolver.resolve({
    damage: 20,
    actor: mockActor()
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 20 && result.tempAbsorbed === 0,
    '✅ TEST 1: No Temp HP passes through unchanged');

  // TEST 2: Temp HP absorbs partial damage
  result = TempHPResolver.resolve({
    damage: 20,
    actor: mockActor({ hp: { temp: 8 } })
  });
  console.assert(result.damageBefore === 20 && result.damageAfter === 12 && result.tempAbsorbed === 8 && result.tempAfter === 0,
    '✅ TEST 2: Temp HP absorbs 8, 12 remains');

  // TEST 3: Temp HP absorbs all damage
  result = TempHPResolver.resolve({
    damage: 5,
    actor: mockActor({ hp: { temp: 10 } })
  });
  console.assert(result.damageBefore === 5 && result.damageAfter === 0 && result.tempAbsorbed === 5 && result.tempAfter === 5,
    '✅ TEST 3: Temp HP absorbs all damage');

  console.log('✅ TempHPResolver tests passed\n');
};

/**
 * TEST SUITE: DamageMitigationManager (Full Pipeline)
 */
export const testDamageMitigationManager = () => {
  console.log('🔍 Testing DamageMitigationManager...');

  // TEST 1: No mitigation
  let result = DamageMitigationManager.resolve({
    damage: 20,
    actor: mockActor(),
    damageType: 'normal'
  });
  console.assert(result.originalDamage === 20 && result.hpDamage === 20 && result.totalMitigation === 0,
    '✅ TEST 1: No mitigation, full damage to HP');

  // TEST 2: SR only
  result = DamageMitigationManager.resolve({
    damage: 20,
    actor: mockActor({ shield: { current: 8 } }),
    damageType: 'normal'
  });
  console.assert(result.originalDamage === 20 && result.afterShield === 12 && result.hpDamage === 12 && result.shield.applied === 8,
    '✅ TEST 2: SR mitigation works');

  // TEST 3: SR + DR
  result = DamageMitigationManager.resolve({
    damage: 20,
    actor: mockActor({
      shield: { current: 5 },
      damageReduction: 3
    }),
    damageType: 'normal'
  });
  console.assert(result.originalDamage === 20 && result.afterShield === 15 && result.afterDR === 12 && result.hpDamage === 12,
    '✅ TEST 3: SR + DR stacking works');

  // TEST 4: SR + DR + Temp HP
  result = DamageMitigationManager.resolve({
    damage: 20,
    actor: mockActor({
      shield: { current: 5 },
      damageReduction: 3,
      hp: { temp: 4 }
    }),
    damageType: 'normal'
  });
  console.assert(result.originalDamage === 20 && result.hpDamage === 8 && result.totalMitigation === 12,
    '✅ TEST 4: Full pipeline (SR + DR + Temp) works');

  // TEST 5: Monotonic damage reduction (never increases)
  result = DamageMitigationManager.resolve({
    damage: 100,
    actor: mockActor({
      shield: { current: 50 },
      damageReduction: 20,
      hp: { temp: 15 }
    }),
    damageType: 'normal'
  });
  const issues = DamageMitigationManager.validate(result);
  console.assert(issues.length === 0,
    '✅ TEST 5: Validation passes for valid result');

  // TEST 6: Summary generation
  const summary = DamageMitigationManager.getSummary(result);
  console.assert(typeof summary === 'string' && summary.length > 0,
    '✅ TEST 6: Summary generation works');

  console.log('✅ DamageMitigationManager tests passed\n');
};

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('\n🧪 DAMAGE MITIGATION MANAGER TEST SUITE\n');
  console.log('='.repeat(60) + '\n');

  try {
    testShieldResolver();
    testDRResolver();
    testTempHPResolver();
    testDamageMitigationManager();

    console.log('='.repeat(60));
    console.log('\n✅ ALL TESTS PASSED\n');
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    console.error(err.stack);
  }
}

// Export for use in console or test runner
if (typeof globalThis !== 'undefined') {
  globalThis.runDamageTests = runAllTests;
}
