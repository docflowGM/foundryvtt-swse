/**
 * LightsaberConstructionEngine Test Harness
 * Phase-based testing: reads → dry run failures → success path → edge cases
 */

import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";

/**
 * Mock Actor Factory
 */
function createMockActor(credits = 10000) {
  return {
    id: 'test-actor-001',
    name: 'Test Jedi',
    type: 'character',
    system: {
      credits: {
        available: credits
      },
      skills: {
        useTheForce: {
          total: 15 // +15 modifier to Use the Force
        }
      }
    },
    items: new Map(),
    // Add helper method
    get(id) {
      return this.items.get(id);
    }
  };
}

/**
 * Mock Item Factory
 */
function createMockItem(id, type, name, config = {}) {
  const base = {
    id,
    name,
    type,
    toObject() {
      return JSON.parse(JSON.stringify(this));
    }
  };

  if (type === 'weapon') {
    return {
      ...base,
      system: {
        constructible: config.constructible ?? true,
        subtype: config.subtype ?? 'lightsaber',
        chassisId: config.chassisId ?? 'standard',
        baseBuildDc: config.baseBuildDc ?? 20,
        baseCost: config.baseCost ?? 1500,
        modifiers: []
      }
    };
  }

  if (type === 'weaponUpgrade') {
    return {
      ...base,
      system: {
        lightsaber: {
          category: config.category ?? 'crystal',
          compatibleChassis: config.compatibleChassis ?? ['*'],
          buildDcModifier: config.buildDcModifier ?? 0,
          rarity: config.rarity ?? 'common',
          modifiers: config.modifiers ?? []
        },
        cost: config.cost ?? 0,
        modifiers: []
      }
    };
  }

  return base;
}

/**
 * Test Suite
 */
export class LightsaberConstructionEngineTests {
  static run() {
    console.log('🧪 LIGHTSABER CONSTRUCTION ENGINE - PHASE-BASED TESTING\n');
    console.log('═'.repeat(70) + '\n');

    this._setupTestData();
    this._testPhase1ReadOnly();
    this._testPhase2DryRunFailure();
    this._testPhase3SuccessPath();
    this._testPhase4CompatibilityEdgeCases();
    this._testPhase5CreditEdgeCase();

    console.log('\n' + '═'.repeat(70));
    console.log('✅ All tests completed.\n');
  }

  static _setupTestData() {
    console.log('📋 SETUP: Creating mock data\n');

    // Create mock actor
    this.actor = createMockActor(10000);

    // Create chassis
    const standardChassis = createMockItem('chassis-standard', 'weapon', 'Standard Hilt', {
      constructible: true,
      subtype: 'lightsaber',
      chassisId: 'standard',
      baseBuildDc: 20,
      baseCost: 1500
    });
    this.actor.items.set('chassis-standard', standardChassis);

    const advancedChassis = createMockItem('chassis-advanced', 'weapon', 'Advanced Hilt', {
      constructible: true,
      subtype: 'lightsaber',
      chassisId: 'advanced',
      baseBuildDc: 25,
      baseCost: 2500
    });
    this.actor.items.set('chassis-advanced', advancedChassis);

    // Create crystals
    const ilumCrystal = createMockItem('crystal-ilum', 'weaponUpgrade', 'Ilum Crystal', {
      category: 'crystal',
      compatibleChassis: ['*'],
      buildDcModifier: 0,
      cost: 0
    });
    this.actor.items.set('crystal-ilum', ilumCrystal);

    const rareCrystal = createMockItem('crystal-rare', 'weaponUpgrade', 'Rare Crystal', {
      category: 'crystal',
      compatibleChassis: ['standard'],
      buildDcModifier: 5,
      cost: 1000
    });
    this.actor.items.set('crystal-rare', rareCrystal);

    const incompatibleCrystal = createMockItem('crystal-incomp', 'weaponUpgrade', 'Incompatible Crystal', {
      category: 'crystal',
      compatibleChassis: ['advanced'], // Only compatible with advanced
      buildDcModifier: 0,
      cost: 0
    });
    this.actor.items.set('crystal-incomp', incompatibleCrystal);

    // Create accessories
    const pommelAccessory = createMockItem('acc-pommel', 'weaponUpgrade', 'Energy Pommel', {
      category: 'accessory',
      compatibleChassis: ['*'],
      buildDcModifier: 2,
      cost: 500
    });
    this.actor.items.set('acc-pommel', pommelAccessory);

    // Create non-constructible weapon (should fail)
    const blaster = createMockItem('blaster-001', 'weapon', 'Blaster Pistol', {
      constructible: false,
      subtype: 'blaster'
    });
    this.actor.items.set('blaster-001', blaster);

    console.log('✓ Actor created: ' + this.actor.name);
    console.log('  - Credits: ' + this.actor.system.credits.available);
    console.log('  - Use the Force: +' + this.actor.system.skills.useTheForce.total);
    console.log('✓ 2 constructible chassis');
    console.log('✓ 3 crystals (2 compatible, 1 restricted)');
    console.log('✓ 1 accessory');
    console.log('✓ 1 non-constructible weapon (for edge case testing)');
    console.log('\n');
  }

  static _testPhase1ReadOnly() {
    console.log('═'.repeat(70));
    console.log('🟦 PHASE 1: Pure Read Tests (No Mutation)\n');

    console.log('TEST 1.1: getConstructionOptions() returns all available items\n');
    const options = LightsaberConstructionEngine.getConstructionOptions(this.actor);

    console.log('Result:');
    console.log(JSON.stringify(options, null, 2));

    // Assertions
    console.assert(options.chassis.length === 2, '❌ FAILED: Should return 2 chassis');
    console.assert(options.crystals.length === 3, '❌ FAILED: Should return 3 crystals');
    console.assert(options.accessories.length === 1, '❌ FAILED: Should return 1 accessory');

    console.log('\n✓ Correct counts returned\n');

    // Verify structure
    console.log('TEST 1.2: Verify data structure (no undefined fields)\n');

    const chassis = options.chassis[0];
    console.assert(chassis.id !== undefined, '❌ FAILED: chassis.id undefined');
    console.assert(chassis.name !== undefined, '❌ FAILED: chassis.name undefined');
    console.assert(chassis.chassisId !== undefined, '❌ FAILED: chassis.chassisId undefined');
    console.assert(chassis.baseBuildDc !== undefined, '❌ FAILED: chassis.baseBuildDc undefined');
    console.assert(chassis.baseCost !== undefined, '❌ FAILED: chassis.baseCost undefined');

    const crystal = options.crystals[0];
    console.assert(crystal.id !== undefined, '❌ FAILED: crystal.id undefined');
    console.assert(crystal.buildDcModifier !== undefined, '❌ FAILED: crystal.buildDcModifier undefined');
    console.assert(Array.isArray(crystal.compatibleChassis), '❌ FAILED: compatibleChassis not array');

    console.log('✓ All structure fields present and valid');
    console.log('\n');
  }

  static _testPhase2DryRunFailure() {
    console.log('═'.repeat(70));
    console.log('🟪 PHASE 2: Dry Run - Forced Failure (Low Roll)\n');

    console.log('TEST 2.1: Simulate low roll result\n');

    // Temporarily mock RollEngine to return a low roll
    const originalSafeRoll = globalThis.RollEngine?.safeRoll;

    if (!globalThis.RollEngine) {
      globalThis.RollEngine = {};
    }

    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 10,
      dice: [{ results: [{ result: 10 }] }],
      formula: formula
    });

    const config = {
      chassisItemId: 'chassis-standard',
      crystalItemId: 'crystal-ilum',
      accessoryItemIds: []
    };

    // This should fail: roll 10 < dc 20
    const result = LightsaberConstructionEngine.attemptConstruction(this.actor, config)
      .then(r => {
        console.log('Construction result:');
        console.log(JSON.stringify(r, null, 2));

        // Assertions for failure
        console.assert(r.success === false, '❌ FAILED: Expected success=false');
        console.assert(r.reason === 'roll_failed', '❌ FAILED: Expected reason="roll_failed"');
        console.assert(r.finalDc === 20, '❌ FAILED: Expected finalDc=20');
        console.assert(r.rollTotal === 10, '❌ FAILED: Expected rollTotal=10');

        console.log('\n✓ Failure path executed correctly');
        console.log('✓ No mutation should have occurred');

        const creditsAfter = this.actor.system.credits.available;
        console.assert(creditsAfter === 10000, '❌ FAILED: Credits were deducted! Mutation happened before roll!');
        console.log('✓ Credits unchanged: ' + creditsAfter);

        // Restore original RollEngine
        if (originalSafeRoll) {
          globalThis.RollEngine.safeRoll = originalSafeRoll;
        }

        return r;
      })
      .catch(err => {
        console.error('❌ FAILED with error:', err);
        // Restore original RollEngine
        if (originalSafeRoll) {
          globalThis.RollEngine.safeRoll = originalSafeRoll;
        }
        throw err;
      });

    return result;
  }

  static async _testPhase3SuccessPath() {
    console.log('═'.repeat(70));
    console.log('🟨 PHASE 3: Success Path (High Roll)\n');

    console.log('TEST 3.1: Force successful roll and execute mutation\n');

    // Mock successful roll
    const originalSafeRoll = globalThis.RollEngine?.safeRoll;

    if (!globalThis.RollEngine) {
      globalThis.RollEngine = {};
    }

    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 25,
      dice: [{ results: [{ result: 10 }] }],
      formula: formula
    });

    // Mock LedgerService for credit deduction
    const originalBuildCreditDelta = globalThis.LedgerService?.buildCreditDelta;
    const originalValidateFunds = globalThis.LedgerService?.validateFunds;

    if (!globalThis.LedgerService) {
      globalThis.LedgerService = {};
    }

    globalThis.LedgerService.validateFunds = (actor, cost) => ({
      ok: true,
      reason: null
    });

    globalThis.LedgerService.buildCreditDelta = (actor, cost) => ({
      set: {
        'system.credits.available': actor.system.credits.available - cost
      }
    });

    // Mock ActorEngine
    const originalApplyMutationPlan = globalThis.ActorEngine?.applyMutationPlan;
    const originalCreateEmbeddedDocuments = globalThis.ActorEngine?.createEmbeddedDocuments;

    if (!globalThis.ActorEngine) {
      globalThis.ActorEngine = {};
    }

    globalThis.ActorEngine.applyMutationPlan = async (actor, plan) => {
      if (plan.set) {
        Object.entries(plan.set).forEach(([key, value]) => {
          const parts = key.split('.');
          let obj = actor;
          for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
          }
          obj[parts[parts.length - 1]] = value;
        });
      }
    };

    globalThis.ActorEngine.createEmbeddedDocuments = async (actor, type, items) => {
      return items.map((item, idx) => ({
        ...item,
        id: `created-item-${idx}`
      }));
    };

    const creditsBefore = this.actor.system.credits.available;
    console.log('Credits before: ' + creditsBefore);

    const config = {
      chassisItemId: 'chassis-standard',
      crystalItemId: 'crystal-rare', // Cost: 1000
      accessoryItemIds: ['acc-pommel'] // Cost: 500
    };

    try {
      const result = await LightsaberConstructionEngine.attemptConstruction(this.actor, config);

      console.log('Construction result:');
      console.log(JSON.stringify(result, null, 2));

      // Assertions
      console.assert(result.success === true, '❌ FAILED: Expected success=true');
      console.assert(result.itemId !== undefined, '❌ FAILED: Expected itemId in result');
      console.assert(result.finalDc === 25, '❌ FAILED: Expected finalDc=25 (20+5 from crystal)');
      console.assert(result.rollTotal === 25, '❌ FAILED: Expected rollTotal=25');
      console.assert(result.cost === 3000, '❌ FAILED: Expected cost=3000 (1500+1000+500)');

      console.log('\n✓ Success path executed correctly');
      console.log('✓ Item created with ID: ' + result.itemId);
      console.log('✓ Final DC: ' + result.finalDc + ' (base 20 + crystal 5)');
      console.log('✓ Total cost: ' + result.cost + ' credits');

      const creditsAfter = this.actor.system.credits.available;
      console.log('✓ Credits after: ' + creditsAfter);
      console.assert(creditsAfter === creditsBefore - 3000, '❌ FAILED: Credits not deducted correctly');
      console.log('✓ Credits deducted correctly: ' + (creditsBefore - creditsAfter) + ' credits');

      console.log('\n');
    } finally {
      // Restore originals
      if (originalSafeRoll) {
        globalThis.RollEngine.safeRoll = originalSafeRoll;
      }
      if (originalBuildCreditDelta) {
        globalThis.LedgerService.buildCreditDelta = originalBuildCreditDelta;
      }
      if (originalValidateFunds) {
        globalThis.LedgerService.validateFunds = originalValidateFunds;
      }
      if (originalApplyMutationPlan) {
        globalThis.ActorEngine.applyMutationPlan = originalApplyMutationPlan;
      }
      if (originalCreateEmbeddedDocuments) {
        globalThis.ActorEngine.createEmbeddedDocuments = originalCreateEmbeddedDocuments;
      }
    }
  }

  static _testPhase4CompatibilityEdgeCases() {
    console.log('═'.repeat(70));
    console.log('🟩 PHASE 4: Compatibility Edge Cases\n');

    console.log('TEST 4.1: Standard chassis + incompatible crystal\n');

    const config = {
      chassisItemId: 'chassis-standard',
      crystalItemId: 'crystal-incomp', // Only compatible with 'advanced'
      accessoryItemIds: []
    };

    const result = LightsaberConstructionEngine.attemptConstruction(this.actor, config);

    if (result instanceof Promise) {
      result.then(r => {
        console.log('Result:');
        console.log(JSON.stringify(r, null, 2));
        console.assert(r.success === false, '❌ FAILED: Should reject incompatible crystal');
        console.assert(r.reason === 'crystal_incompatible_chassis', '❌ FAILED: Wrong reason code');
        console.log('✓ Correctly rejected incompatible crystal\n');
      });
    } else {
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
      console.assert(result.success === false, '❌ FAILED: Should reject incompatible crystal');
      console.assert(result.reason === 'crystal_incompatible_chassis', '❌ FAILED: Wrong reason code');
      console.log('✓ Correctly rejected incompatible crystal\n');
    }

    console.log('TEST 4.2: Non-constructible weapon as chassis\n');

    const config2 = {
      chassisItemId: 'blaster-001',
      crystalItemId: 'crystal-ilum',
      accessoryItemIds: []
    };

    const result2 = LightsaberConstructionEngine.attemptConstruction(this.actor, config2);

    if (result2 instanceof Promise) {
      result2.then(r => {
        console.log('Result:');
        console.log(JSON.stringify(r, null, 2));
        console.assert(r.success === false, '❌ FAILED: Should reject non-constructible weapon');
        console.assert(r.reason === 'invalid_chassis', '❌ FAILED: Wrong reason code');
        console.log('✓ Correctly rejected non-constructible weapon\n');
      });
    } else {
      console.log('Result:');
      console.log(JSON.stringify(result2, null, 2));
      console.assert(result2.success === false, '❌ FAILED: Should reject non-constructible weapon');
      console.assert(result2.reason === 'invalid_chassis', '❌ FAILED: Wrong reason code');
      console.log('✓ Correctly rejected non-constructible weapon\n');
    }

    console.log('TEST 4.3: Missing crystal ID\n');

    const config3 = {
      chassisItemId: 'chassis-standard',
      crystalItemId: 'nonexistent-crystal-xyz',
      accessoryItemIds: []
    };

    const result3 = LightsaberConstructionEngine.attemptConstruction(this.actor, config3);

    if (result3 instanceof Promise) {
      result3.then(r => {
        console.log('Result:');
        console.log(JSON.stringify(r, null, 2));
        console.assert(r.success === false, '❌ FAILED: Should fail safe on missing crystal');
        console.assert(r.reason === 'crystal_not_found', '❌ FAILED: Wrong reason code');
        console.log('✓ Correctly handled missing crystal (fail-safe)\n');
      });
    } else {
      console.log('Result:');
      console.log(JSON.stringify(result3, null, 2));
      console.assert(result3.success === false, '❌ FAILED: Should fail safe on missing crystal');
      console.assert(result3.reason === 'crystal_not_found', '❌ FAILED: Wrong reason code');
      console.log('✓ Correctly handled missing crystal (fail-safe)\n');
    }
  }

  static _testPhase5CreditEdgeCase() {
    console.log('═'.repeat(70));
    console.log('🟧 PHASE 5: Credit Edge Case\n');

    console.log('TEST 5.1: Actor with insufficient credits\n');

    // Create poor actor with only 100 credits
    const poorActor = createMockActor(100);
    poorActor.items = this.actor.items; // Share items

    // Mock LedgerService
    const originalValidateFunds = globalThis.LedgerService?.validateFunds;

    if (!globalThis.LedgerService) {
      globalThis.LedgerService = {};
    }

    globalThis.LedgerService.validateFunds = (actor, cost) => {
      const hasFunds = actor.system.credits.available >= cost;
      return {
        ok: hasFunds,
        reason: hasFunds ? null : 'insufficient_credits'
      };
    };

    const config = {
      chassisItemId: 'chassis-standard', // 1500 credits
      crystalItemId: 'crystal-rare',      // 1000 credits
      accessoryItemIds: ['acc-pommel']    // 500 credits = 3000 total
    };

    const result = LightsaberConstructionEngine.attemptConstruction(poorActor, config);

    if (result instanceof Promise) {
      result.then(r => {
        console.log('Result:');
        console.log(JSON.stringify(r, null, 2));
        console.assert(r.success === false, '❌ FAILED: Should reject due to insufficient credits');
        console.assert(r.reason === 'insufficient_credits', '❌ FAILED: Wrong reason code');
        console.log('✓ Correctly rejected: insufficient credits');
        console.log('✓ No roll should occur (early fail)');
        console.log('✓ No mutation attempted\n');
      });
    } else {
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
      console.assert(result.success === false, '❌ FAILED: Should reject due to insufficient credits');
      console.assert(result.reason === 'insufficient_credits', '❌ FAILED: Wrong reason code');
      console.log('✓ Correctly rejected: insufficient credits');
      console.log('✓ No roll should occur (early fail)');
      console.log('✓ No mutation attempted\n');
    }

    // Restore
    if (originalValidateFunds) {
      globalThis.LedgerService.validateFunds = originalValidateFunds;
    }
  }
}

// Auto-run on import in console
if (typeof console !== 'undefined') {
  console.log('\n📊 LightsaberConstructionEngine Test Suite Loaded');
  console.log('Run: LightsaberConstructionEngineTests.run()\n');
}
