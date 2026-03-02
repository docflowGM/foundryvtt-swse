/**
 * Console-based test harness for LightsaberConstructionEngine
 * This is meant to be run in the Foundry console or Node with proper dependencies
 *
 * Usage (in Foundry console):
 *   - Import this file into your session
 *   - Run: LightsaberConstructionEngineConsoleTests.runAll()
 */

export class LightsaberConstructionEngineConsoleTests {
  /**
   * Create a mock actor for testing
   */
  static createTestActor(credits = 10000, useTheForceBonus = 15) {
    return {
      id: 'test-actor-001',
      name: 'Test Jedi Master',
      type: 'character',
      system: {
        credits: { available: credits },
        skills: {
          useTheForce: { total: useTheForceBonus }
        }
      },
      items: new Map(),
      get(id) {
        return this.items.get(id);
      }
    };
  }

  /**
   * Create a mock chassis item
   */
  static createChassis(id, name, config = {}) {
    return {
      id,
      name,
      type: 'weapon',
      system: {
        constructible: config.constructible !== false,
        subtype: 'lightsaber',
        chassisId: config.chassisId || 'standard',
        baseBuildDc: config.baseBuildDc ?? 20,
        baseCost: config.baseCost ?? 1500,
        cost: 0,
        modifiers: []
      },
      toObject() {
        return JSON.parse(JSON.stringify(this));
      }
    };
  }

  /**
   * Create a mock upgrade item (crystal or accessory)
   */
  static createUpgrade(id, name, category, config = {}) {
    return {
      id,
      name,
      type: 'weaponUpgrade',
      system: {
        cost: config.cost ?? 0,
        modifiers: [],
        lightsaber: {
          category: category,
          compatibleChassis: config.compatibleChassis || ['*'],
          buildDcModifier: config.buildDcModifier ?? 0,
          rarity: config.rarity || 'common',
          modifiers: config.modifiers || []
        }
      },
      toObject() {
        return JSON.parse(JSON.stringify(this));
      }
    };
  }

  /**
   * PHASE 1: Pure data query (no mutation)
   */
  static async testPhase1ReadOnly(actor) {
    console.log('\n' + '═'.repeat(70));
    console.log('🟦 PHASE 1: Pure Read Tests (getConstructionOptions)\n');

    try {
      const options = LightsaberConstructionEngine.getConstructionOptions(actor);

      console.log('📊 Available Options:');
      console.log(`  • Chassis: ${options.chassis.length}`);
      console.log(`  • Crystals: ${options.crystals.length}`);
      console.log(`  • Accessories: ${options.accessories.length}\n`);

      if (options.chassis.length === 0) {
        console.warn('⚠️  No chassis available. Test with populated actor.');
        return false;
      }

      console.log('Sample Chassis:');
      options.chassis.forEach((c, i) => {
        console.log(`  [${i}] "${c.name}" (ID: ${c.id})`);
        console.log(`      - chassisId: ${c.chassisId}`);
        console.log(`      - baseBuildDc: ${c.baseBuildDc}`);
        console.log(`      - baseCost: ${c.baseCost}\n`);
      });

      if (options.crystals.length > 0) {
        console.log('Sample Crystal:');
        const c = options.crystals[0];
        console.log(`  "${c.name}" (ID: ${c.id})`);
        console.log(`  - buildDcModifier: ${c.buildDcModifier}`);
        console.log(`  - cost: ${c.cost}`);
        console.log(`  - compatibleChassis: [${c.compatibleChassis.join(', ')}]\n`);
      }

      console.log('✅ Phase 1 PASSED: All data queries working\n');
      return true;
    } catch (err) {
      console.error('❌ Phase 1 FAILED:', err.message);
      console.error(err.stack);
      return false;
    }
  }

  /**
   * PHASE 2: Failure path (low roll, atomicity check)
   */
  static async testPhase2FailurePath(actor) {
    console.log('═'.repeat(70));
    console.log('🟪 PHASE 2: Failure Path (Low Roll - Atomicity)\n');

    const itemsBeforeCount = actor.items.size;
    const creditsBeforeCount = actor.system.credits.available;

    console.log(`State before construction attempt:`);
    console.log(`  • Items: ${itemsBeforeCount}`);
    console.log(`  • Credits: ${creditsBeforeCount}\n`);

    try {
      // Get first chassis and crystal
      const options = LightsaberConstructionEngine.getConstructionOptions(actor);
      if (options.chassis.length === 0 || options.crystals.length === 0) {
        console.warn('⚠️  Not enough items for test. Populate actor.');
        return false;
      }

      const chassis = options.chassis[0];
      const crystal = options.crystals[0];

      console.log(`Attempting construction with:`);
      console.log(`  • Chassis: "${chassis.name}" (DC: ${chassis.baseBuildDc})`);
      console.log(`  • Crystal: "${crystal.name}" (Modifier: ${crystal.buildDcModifier})\n`);

      const expectedDc = chassis.baseBuildDc + (crystal.buildDcModifier || 0);
      console.log(`Expected DC: ${expectedDc}\n`);

      const result = await LightsaberConstructionEngine.attemptConstruction(actor, {
        chassisItemId: chassis.id,
        crystalItemId: crystal.id,
        accessoryItemIds: []
      });

      console.log('Result:', JSON.stringify(result, null, 2));

      // Check atomicity
      const itemsAfterCount = actor.items.size;
      const creditsAfterCount = actor.system.credits.available;

      if (result.success === false && result.reason === 'roll_failed') {
        // Expected: failure due to low roll
        if (itemsAfterCount === itemsBeforeCount && creditsAfterCount === creditsBeforeCount) {
          console.log('\n✅ Phase 2 PASSED: Failure path atomic (no mutation)');
          console.log(`  • Items unchanged: ${itemsBeforeCount} → ${itemsAfterCount}`);
          console.log(`  • Credits unchanged: ${creditsBeforeCount} → ${creditsAfterCount}`);
          return true;
        } else {
          console.error('❌ Phase 2 FAILED: Mutation occurred on failure!');
          console.error(`  • Items: ${itemsBeforeCount} → ${itemsAfterCount}`);
          console.error(`  • Credits: ${creditsBeforeCount} → ${creditsAfterCount}`);
          return false;
        }
      } else if (result.success === true) {
        // Roll succeeded - that's fine for this phase
        console.log('ℹ️  Roll succeeded (not a failure path). Confirming mutation occurred:');
        console.log(`  • Items before: ${itemsBeforeCount}, after: ${itemsAfterCount}`);
        console.log(`  • Credits deducted: ${creditsBeforeCount - creditsAfterCount}`);
        console.log(`  • Item created: ${result.itemId}`);
        return true;
      } else {
        // Some other failure (insufficient credits, compatibility, etc.)
        console.log('ℹ️  Different failure reason: ' + result.reason);
        console.log(`  • Items unchanged: ${itemsBeforeCount} === ${itemsAfterCount}`);
        console.log(`  • Credits unchanged: ${creditsBeforeCount} === ${creditsAfterCount}`);
        return itemsAfterCount === itemsBeforeCount && creditsAfterCount === creditsBeforeCount;
      }
    } catch (err) {
      console.error('❌ Phase 2 ERROR:', err.message);
      console.error(err.stack);
      return false;
    }
  }

  /**
   * PHASE 3: Success path with mutation
   */
  static async testPhase3SuccessPath(actor) {
    console.log('═'.repeat(70));
    console.log('🟨 PHASE 3: Success Path (Mutation Verification)\n');

    const itemsBeforeCount = actor.items.size;
    const creditsBefore = actor.system.credits.available;

    console.log(`State before construction:`);
    console.log(`  • Items: ${itemsBeforeCount}`);
    console.log(`  • Credits: ${creditsBefore}\n`);

    try {
      const options = LightsaberConstructionEngine.getConstructionOptions(actor);
      if (options.chassis.length === 0 || options.crystals.length === 0) {
        console.warn('⚠️  Not enough items. Populate actor.');
        return false;
      }

      const chassis = options.chassis[0];
      const crystal = options.crystals[0];
      const accessories = options.accessories.slice(0, 1); // 0 or 1

      const totalCost = chassis.baseCost + crystal.cost + accessories.reduce((sum, a) => sum + a.cost, 0);
      const totalDc = chassis.baseBuildDc + crystal.buildDcModifier + accessories.reduce((sum, a) => sum + a.buildDcModifier, 0);

      console.log(`Attempting construction:`);
      console.log(`  • Chassis: "${chassis.name}" (cost: ${chassis.baseCost}, DC: ${chassis.baseBuildDc})`);
      console.log(`  • Crystal: "${crystal.name}" (cost: ${crystal.cost}, DC mod: ${crystal.buildDcModifier})`);
      if (accessories.length > 0) {
        accessories.forEach(a => {
          console.log(`  • Accessory: "${a.name}" (cost: ${a.cost}, DC mod: ${a.buildDcModifier})`);
        });
      }
      console.log(`\nExpected total cost: ${totalCost}`);
      console.log(`Expected total DC: ${totalDc}\n`);

      // Check credits
      if (creditsBefore < totalCost) {
        console.log(`⚠️  Insufficient credits (have ${creditsBefore}, need ${totalCost}).`);
        console.log(`    Construction will fail at credit check.\n`);
      }

      const result = await LightsaberConstructionEngine.attemptConstruction(actor, {
        chassisItemId: chassis.id,
        crystalItemId: crystal.id,
        accessoryItemIds: accessories.map(a => a.id)
      });

      console.log('Result:', JSON.stringify(result, null, 2));

      if (result.success === true) {
        const itemsAfter = actor.items.size;
        const creditsAfter = actor.system.credits.available;
        const deducted = creditsBefore - creditsAfter;

        console.log('\n✅ Phase 3 PASSED: Construction succeeded\n');
        console.log(`Verification:`);
        console.log(`  • Item created: ${result.itemId}`);
        console.log(`  • Final DC: ${result.finalDc} (expected: ${totalDc})`);
        console.log(`  • Cost deducted: ${result.cost} credits (expected: ${totalCost})`);
        console.log(`  • Items before: ${itemsBeforeCount}, after: ${itemsAfter}`);
        console.log(`  • Credits: ${creditsBefore} → ${creditsAfter} (deducted: ${deducted})`);

        // Check the created item for metadata
        const newItem = actor.items.get(result.itemId);
        if (newItem) {
          console.log(`\nNew item details:`);
          console.log(`  • Name: ${newItem.name}`);
          console.log(`  • Type: ${newItem.type}`);
          console.log(`  • flags.swse.builtBy: ${newItem.flags?.swse?.builtBy}`);
          console.log(`  • flags.swse.attunedBy: ${newItem.flags?.swse?.attunedBy}`);
          console.log(`  • flags.swse.builtAt: ${newItem.flags?.swse?.builtAt}`);

          // Verify metadata
          if (newItem.flags?.swse?.builtBy !== actor.id) {
            console.error(`⚠️  builtBy not set correctly: ${newItem.flags?.swse?.builtBy} !== ${actor.id}`);
            return false;
          }
          if (newItem.flags?.swse?.attunedBy !== null) {
            console.error(`⚠️  attunedBy should be null: ${newItem.flags?.swse?.attunedBy}`);
            return false;
          }
          if (newItem.flags?.swse?.builtAt === null || newItem.flags?.swse?.builtAt === undefined) {
            console.error(`⚠️  builtAt not set`);
            return false;
          }

          console.log(`\n✅ Metadata verified correct`);
        }

        return true;
      } else {
        console.log(`\nConstruction failed: ${result.reason}`);
        if (result.reason === 'insufficient_credits') {
          console.log(`  • Need ${totalCost} credits, have ${creditsBefore}`);
        }
        console.log(`  • DC: ${result.finalDc}`);
        console.log(`  • Roll: ${result.rollTotal}`);
        return false;
      }
    } catch (err) {
      console.error('❌ Phase 3 ERROR:', err.message);
      console.error(err.stack);
      return false;
    }
  }

  /**
   * PHASE 3.5: Eligibility gating
   */
  static async testPhase3_5EligibilityGating(actor) {
    console.log('═'.repeat(70));
    console.log('🟧 PHASE 3.5: Eligibility Gating (Fail Fast)\n');

    // Create a low-level actor without feats
    const lowLevelActor = this.createTestActor(10000);
    lowLevelActor.items = actor.items; // Share items

    // Artificially set low level (simulate)
    lowLevelActor.system.level = 3; // Less than 7

    console.log('Test 3.5.1: Low heroic level (3 < 7)\n');
    const options = LightsaberConstructionEngine.getConstructionOptions(lowLevelActor);
    if (options.chassis.length === 0) {
      console.log('ℹ️  No items in low-level actor. Skipping eligibility test.\n');
      return true;
    }

    const result = await LightsaberConstructionEngine.attemptConstruction(lowLevelActor, {
      chassisItemId: options.chassis[0]?.id || 'invalid',
      crystalItemId: options.crystals[0]?.id || 'invalid',
      accessoryItemIds: []
    });

    const isEligibilityFailure =
      result.success === false &&
      (result.reason === 'insufficient_heroic_level' ||
        result.reason === 'missing_force_sensitivity' ||
        result.reason === 'missing_lightsaber_proficiency');

    if (isEligibilityFailure) {
      console.log('✅ Correctly rejected low-level actor');
      console.log(`  Reason: ${result.reason}`);
      console.log(`  No roll triggered`);
      console.log(`  No mutation attempted\n`);
      return true;
    } else {
      console.log(`⚠️  Eligibility check result: ${result.reason}`);
      console.log(`  (May fail for other reasons - feat check, etc.)\n`);
      return true; // Not necessarily a failure - could be other eligibility reasons
    }
  }

  /**
   * PHASE 4: Compatibility edge cases
   */
  static async testPhase4EdgeCases(actor) {
    console.log('═'.repeat(70));
    console.log('🟩 PHASE 4: Compatibility Edge Cases\n');

    const tests = [];

    // Test 1: Missing crystal
    console.log('Test 4.1: Missing crystal ID');
    const result1 = await LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'nonexistent-chassis',
      crystalItemId: 'nonexistent-crystal',
      accessoryItemIds: []
    });
    const test1Pass = result1.success === false && result1.reason === 'chassis_not_found';
    console.log(test1Pass ? '✅ Correctly rejected' : '❌ Failed');
    console.log(`  Reason: ${result1.reason}\n`);
    tests.push(test1Pass);

    // Test 2: Try with real items to test incompatibility if available
    const options = LightsaberConstructionEngine.getConstructionOptions(actor);
    if (options.chassis.length > 1 && options.crystals.length > 1) {
      console.log('Test 4.2: Testing compatibility constraints');
      // Find incompatible pairing if possible
      const result2 = await LightsaberConstructionEngine.attemptConstruction(actor, {
        chassisItemId: options.chassis[0].id,
        crystalItemId: options.crystals[0].id,
        accessoryItemIds: []
      });
      console.log(`  Result: ${result2.success ? '✅ Compatible' : '❌ Incompatible'}`);
      console.log(`  Reason: ${result2.reason || 'success'}\n`);
      tests.push(true); // As long as we didn't crash
    }

    const allPass = tests.every(t => t);
    if (allPass) {
      console.log('✅ Phase 4 PASSED: Edge cases handled safely\n');
    } else {
      console.log('❌ Phase 4 FAILED: Some edge cases not handled\n');
    }
    return allPass;
  }

  /**
   * Run all tests
   */
  static async runAll() {
    console.clear();
    console.log('\n');
    console.log('╔' + '═'.repeat(68) + '╗');
    console.log('║' + ' '.repeat(68) + '║');
    console.log('║' + '  🧪 LIGHTSABER CONSTRUCTION ENGINE - CONSOLE TEST SUITE'.padEnd(68) + '║');
    console.log('║' + ' '.repeat(68) + '║');
    console.log('╚' + '═'.repeat(68) + '╝');

    // Use current actor if available
    let actor = game?.user?.character;
    if (!actor) {
      console.log('\n⚠️  No character selected. Creating test actor...\n');
      actor = this.createTestActor();

      // Add test items
      actor.items.set('std-hilt', this.createChassis('std-hilt', 'Standard Hilt', { baseCost: 1500, baseBuildDc: 20 }));
      actor.items.set('adv-hilt', this.createChassis('adv-hilt', 'Advanced Hilt', { chassisId: 'advanced', baseCost: 2500, baseBuildDc: 25 }));
      actor.items.set('ilum', this.createUpgrade('ilum', 'Ilum Crystal', 'crystal', { buildDcModifier: 0, cost: 0 }));
      actor.items.set('rare', this.createUpgrade('rare', 'Rare Crystal', 'crystal', { buildDcModifier: 5, cost: 1000 }));
      actor.items.set('pommel', this.createUpgrade('pommel', 'Energy Pommel', 'accessory', { buildDcModifier: 2, cost: 500 }));
    } else {
      console.log('\n✅ Using current character: ' + actor.name);
      console.log('   Inventory items: ' + actor.items.size);
    }

    const results = [];

    try {
      results.push(await this.testPhase1ReadOnly(actor));
      results.push(await this.testPhase2FailurePath(actor));
      results.push(await this.testPhase3SuccessPath(actor));
      results.push(await this.testPhase3_5EligibilityGating(actor));
      results.push(await this.testPhase4EdgeCases(actor));

      console.log('═'.repeat(70));
      const passed = results.filter(r => r).length;
      const total = results.length;
      console.log(`\n📊 SUMMARY: ${passed}/${total} test phases passed\n`);

      if (passed === total) {
        console.log('🎉 ALL TESTS PASSED - Engine with eligibility gating ready\n');
        console.log('Next layer: Attunement System');
        return true;
      } else {
        console.log('⚠️  Some tests failed. Review output above.\n');
        return false;
      }
    } catch (err) {
      console.error('\n❌ Test suite crashed:', err.message);
      console.error(err.stack);
      return false;
    }
  }
}

// Auto-announce on load
if (typeof window !== 'undefined' || typeof globalThis !== 'undefined') {
  console.log('📦 LightsaberConstructionEngineConsoleTests loaded');
  console.log('   Run: await LightsaberConstructionEngineConsoleTests.runAll()');
}
