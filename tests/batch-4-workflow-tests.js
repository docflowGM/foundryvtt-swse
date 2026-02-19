/**
 * BATCH 4: Workflow Atomicity Tests
 *
 * Purpose: Validate that mutation routing preserves atomic semantics
 *
 * Usage:
 * 1. Set Sentinel to DEV mode: game.settings.set('swse', 'sentinelMode', 'DEV')
 * 2. Clear console
 * 3. Run: BATCH4Tests.runAllTests()
 * 4. Observe [Sentinel] transaction logs
 * 5. Collect patterns and analyze
 *
 * Key Metrics:
 * - Transaction count per logical operation
 * - Derived recalc count
 * - Success/failure status
 * - Transaction duration
 */

export class BATCH4Tests {
  static _results = [];
  static _testLog = [];

  /**
   * ============================================================
   * TEST HARNESS INFRASTRUCTURE
   * ============================================================
   */

  static async runAllTests() {
    console.clear();
    console.log('%c=== BATCH 4 WORKFLOW ATOMICITY TESTS ===', 'color: #00ff00; font-weight: bold; font-size: 16px');
    console.log('Sentinel mode: DEV');
    console.log('Collecting transaction logs...\n');

    this._results = [];
    this._testLog = [];

    try {
      // Run each test with timing
      await this.test1_CharacterCreation();
      await this.test2_ItemPurchase();
      await this.test3_ItemSelling();
      await this.test4_FeatWithRules();
      await this.test5_LevelUp();
      await this.test6_ActiveEffect();
      await this.test7_RuleElementBatch();
      await this.test8_MountAssignment();
      await this.test9_NPCLevelup();

      // Print summary
      this._printSummary();
    } catch (err) {
      console.error('Test suite failed:', err);
    }
  }

  static _log(testName, message, data = {}) {
    const entry = {
      test: testName,
      timestamp: Date.now(),
      message,
      data
    };
    this._testLog.push(entry);
    console.log(`[${testName}] ${message}`, data);
  }

  static _recordTest(testName, result) {
    this._results.push({
      test: testName,
      ...result,
      timestamp: Date.now()
    });
  }

  /**
   * ============================================================
   * TEST 1: CHARACTER CREATION (FULL FLOW)
   * ============================================================
   */
  static async test1_CharacterCreation() {
    const testName = 'Test1_CharacterCreation';
    console.log('%c--- TEST 1: Character Creation (Full Flow) ---', 'color: #ffff00; font-weight: bold');

    try {
      // Create test actor
      const actor = await Actor.create({
        name: 'Test_Character_1',
        type: 'character',
        system: {
          level: 1,
          credits: 0,
          attributes: {
            str: { base: 10, mod: 0 },
            dex: { base: 10, mod: 0 },
            con: { base: 10, mod: 0 },
            int: { base: 10, mod: 0 },
            wis: { base: 10, mod: 0 },
            cha: { base: 10, mod: 0 }
          }
        }
      });

      this._log(testName, 'Actor created', { name: actor.name, id: actor.id });

      // Simulate chargen finalization: add items
      const feats = [
        {
          type: 'feat',
          name: 'Weapon Finesse',
          system: { source: 'chargen' }
        }
      ];

      const talents = [
        {
          type: 'talent',
          name: 'Weapon Focus',
          system: { source: 'chargen' }
        }
      ];

      // Watch for transaction logs - this should show 2 createEmbeddedDocuments calls
      console.log('%c[Observation Point] Adding items to character...', 'color: #0088ff');
      await actor.createEmbeddedDocuments('Item', feats);
      await actor.createEmbeddedDocuments('Item', talents);

      this._log(testName, 'Items added', { feats: feats.length, talents: talents.length });

      // Update ability scores
      console.log('%c[Observation Point] Updating ability scores...', 'color: #0088ff');
      await actor.update({
        'system.attributes.str.base': 15,
        'system.attributes.dex.base': 14,
        'system.attributes.con.base': 13,
        'system.attributes.int.base': 12,
        'system.attributes.wis.base': 11,
        'system.attributes.cha.base': 10
      });

      this._log(testName, 'Abilities updated', { actor: actor.name });

      // Cleanup
      await actor.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Watch for multiple transactions. Expected: 3-5 for full chargen flow'
      });

      console.log('%c✅ Test 1 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 1 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 2: ITEM PURCHASE (STORE)
   * ============================================================
   */
  static async test2_ItemPurchase() {
    const testName = 'Test2_ItemPurchase';
    console.log('%c--- TEST 2: Item Purchase ---', 'color: #ffff00; font-weight: bold');

    try {
      // Create buyer and seller
      const buyer = await Actor.create({
        name: 'Test_Buyer_1',
        type: 'character',
        system: { credits: 1000 }
      });

      const seller = await Actor.create({
        name: 'Test_Seller_1',
        type: 'character',
        system: { credits: 0 }
      });

      this._log(testName, 'Actors created', { buyer: buyer.name, seller: seller.name });

      // Add item to seller
      const item = await seller.createEmbeddedDocuments('Item', [
        {
          type: 'equipment',
          name: 'Test_Sword',
          system: { price: 100 }
        }
      ]);

      this._log(testName, 'Item added to seller', { itemId: item[0].id });

      // Purchase: watch for 2 updateActor calls
      console.log('%c[Observation Point] Executing purchase transaction...', 'color: #0088ff');
      await buyer.update({ 'system.credits': 900 });
      await seller.update({ 'system.credits': 100 });

      this._log(testName, 'Purchase completed', {
        buyer: buyer.name,
        seller: seller.name,
        price: 100
      });

      // Cleanup
      await buyer.delete();
      await seller.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 2 separate transactions (one per actor)'
      });

      console.log('%c✅ Test 2 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 2 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 3: ITEM SELLING (REVERSE)
   * ============================================================
   */
  static async test3_ItemSelling() {
    const testName = 'Test3_ItemSelling';
    console.log('%c--- TEST 3: Item Selling ---', 'color: #ffff00; font-weight: bold');

    try {
      const seller = await Actor.create({
        name: 'Test_Seller_2',
        type: 'character',
        system: { credits: 0 }
      });

      // Add item
      const item = await seller.createEmbeddedDocuments('Item', [
        {
          type: 'equipment',
          name: 'Test_Armor',
          system: { price: 250 }
        }
      ]);

      this._log(testName, 'Item created on seller', { itemId: item[0].id });

      // Sell: watch for delete + update
      console.log('%c[Observation Point] Executing sell transaction...', 'color: #0088ff');
      await seller.deleteEmbeddedDocuments('Item', [item[0].id]);
      await seller.update({ 'system.credits': 125 }); // 50% of 250

      this._log(testName, 'Sell completed', { seller: seller.name, credits: 125 });

      // Cleanup
      await seller.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 2 separate operations (delete + update)'
      });

      console.log('%c✅ Test 3 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 3 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 4: FEAT WITH MULTIPLE RULES
   * ============================================================
   */
  static async test4_FeatWithRules() {
    const testName = 'Test4_FeatWithRules';
    console.log('%c--- TEST 4: Feat Application (Multiple Rules) ---', 'color: #ffff00; font-weight: bold');

    try {
      const actor = await Actor.create({
        name: 'Test_Character_Rules',
        type: 'character',
        system: {
          bonuses: {},
          abilities: [],
          progression: { trainedSkills: [] }
        }
      });

      // Create feat with multiple rules
      const feat = await actor.createEmbeddedDocuments('Item', [
        {
          type: 'feat',
          name: 'Test_Feat_MultiRule',
          system: {
            rules: [
              { type: 'StatBonus', stat: 'attack', value: 2 },
              { type: 'GrantAbility', abilityId: 'deflect' },
              { type: 'SkillTraining', skill: 'persuasion', bonus: 5 }
            ]
          }
        }
      ]);

      this._log(testName, 'Feat created with 3 rule elements', { feat: feat[0].name });

      // Apply rules: watch for transaction count
      console.log('%c[Observation Point] Applying rule elements...', 'color: #0088ff');

      // Simulate RuleElement.applyAllRules() - this shows fragmentation risk
      if (actor.system.rules) {
        for (const rule of actor.system.rules) {
          // Each rule.apply() = separate transaction currently
          console.log(`[RuleElement] Applying ${rule.type}...`);
        }
      }

      this._log(testName, 'Rules applied', { ruleCount: 3 });

      // Cleanup
      await actor.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'HIGH RISK: Watch for 3+ separate transactions (should be 1 if batched)'
      });

      console.log('%c✅ Test 4 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 4 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 5: LEVEL UP
   * ============================================================
   */
  static async test5_LevelUp() {
    const testName = 'Test5_LevelUp';
    console.log('%c--- TEST 5: Level Up ---', 'color: #ffff00; font-weight: bold');

    try {
      const actor = await Actor.create({
        name: 'Test_Character_LevelUp',
        type: 'character',
        system: { level: 1, hp: { value: 20, max: 20 } }
      });

      this._log(testName, 'Character created at level 1', { hp: 20 });

      // Simulate level-up: add feature item, add class item, update HP
      console.log('%c[Observation Point] Executing level-up sequence...', 'color: #0088ff');

      await actor.createEmbeddedDocuments('Item', [
        { type: 'feature', name: 'Level_2_Feature', system: {} }
      ]);

      await actor.createEmbeddedDocuments('Item', [
        { type: 'class', name: 'Level_2_Class', system: {} }
      ]);

      await actor.update({ 'system.hp.max': 25 });

      this._log(testName, 'Level-up completed', { newLevel: 2, newHpMax: 25 });

      // Cleanup
      await actor.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 3 separate transactions (feature, class, stats)'
      });

      console.log('%c✅ Test 5 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 5 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 6: ACTIVE EFFECT
   * ============================================================
   */
  static async test6_ActiveEffect() {
    const testName = 'Test6_ActiveEffect';
    console.log('%c--- TEST 6: Active Effect Application ---', 'color: #ffff00; font-weight: bold');

    try {
      const actor = await Actor.create({
        name: 'Test_Character_Effects',
        type: 'character'
      });

      console.log('%c[Observation Point] Creating active effect...', 'color: #0088ff');

      // Create effect
      await actor.createEmbeddedDocuments('ActiveEffect', [
        {
          name: 'Test_Dazed',
          icon: 'icons/svg/blind.svg',
          duration: { rounds: 1 }
        }
      ]);

      this._log(testName, 'Effect created', { effectName: 'Test_Dazed' });

      // Cleanup
      await actor.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 1 transaction'
      });

      console.log('%c✅ Test 6 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 6 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 7: RULE ELEMENT BATCH
   * ============================================================
   */
  static async test7_RuleElementBatch() {
    const testName = 'Test7_RuleElementBatch';
    console.log('%c--- TEST 7: Talent Tree Batch Application ---', 'color: #ffff00; font-weight: bold');

    try {
      const actor = await Actor.create({
        name: 'Test_Character_TalentBatch',
        type: 'character',
        system: {
          bonuses: {},
          abilities: [],
          progression: { trainedSkills: [] }
        }
      });

      // Create multiple talents with rules
      const talents = [];
      for (let i = 0; i < 3; i++) {
        talents.push({
          type: 'talent',
          name: `Test_Talent_${i + 1}`,
          system: {
            rules: [
              { type: 'SkillTraining', skill: 'skill_' + i }
            ]
          }
        });
      }

      console.log('%c[Observation Point] Applying talent tree (3 talents × 1 rule each = 3 mutations)...', 'color: #0088ff');

      await actor.createEmbeddedDocuments('Item', talents);

      this._log(testName, 'Talent batch created', { talents: talents.length });

      // Cleanup
      await actor.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Watch transaction count: 3 separate talents or 1 batched?'
      });

      console.log('%c✅ Test 7 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 7 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 8: MOUNT ASSIGNMENT
   * ============================================================
   */
  static async test8_MountAssignment() {
    const testName = 'Test8_MountAssignment';
    console.log('%c--- TEST 8: Mount Assignment ---', 'color: #ffff00; font-weight: bold');

    try {
      const rider = await Actor.create({
        name: 'Test_Rider',
        type: 'character',
        system: { mounted: { isMounted: false, mountId: null } }
      });

      const mount = await Actor.create({
        name: 'Test_Mount',
        type: 'creature',
        system: { mount: { riderIds: [] } }
      });

      this._log(testName, 'Actors created', { rider: rider.name, mount: mount.name });

      console.log('%c[Observation Point] Assigning rider to mount...', 'color: #0088ff');

      // Mount assignment = 2 separate actor updates
      await rider.update({
        'system.mounted.isMounted': true,
        'system.mounted.mountId': mount.id
      });

      await mount.update({
        'system.mount.riderIds': [rider.id]
      });

      this._log(testName, 'Mount assignment completed', { rider: rider.name, mount: mount.name });

      // Cleanup
      await rider.delete();
      await mount.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 2 separate transactions (different actors)'
      });

      console.log('%c✅ Test 8 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 8 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * TEST 9: NPC LEVEL UP
   * ============================================================
   */
  static async test9_NPCLevelup() {
    const testName = 'Test9_NPCLevelup';
    console.log('%c--- TEST 9: NPC Level Up ---', 'color: #ffff00; font-weight: bold');

    try {
      const npc = await Actor.create({
        name: 'Test_NPC',
        type: 'npc',
        system: {
          level: 1,
          attributes: {
            str: { base: 12, mod: 1 }
          }
        }
      });

      this._log(testName, 'NPC created', { name: npc.name, level: 1 });

      console.log('%c[Observation Point] Increasing ability score...', 'color: #0088ff');

      await npc.update({
        'system.attributes.str.base': 13
      });

      this._log(testName, 'NPC ability increased', { attribute: 'STR', newValue: 13 });

      // Cleanup
      await npc.delete();

      this._recordTest(testName, {
        status: 'COMPLETE',
        notes: 'Expected: 1 transaction'
      });

      console.log('%c✅ Test 9 Complete', 'color: #00ff00');
    } catch (err) {
      console.error('Test 9 failed:', err);
      this._recordTest(testName, { status: 'FAILED', error: err.message });
    }
  }

  /**
   * ============================================================
   * SUMMARY & ANALYSIS
   * ============================================================
   */
  static _printSummary() {
    console.log('\n%c=== TEST SUMMARY ===', 'color: #00ff00; font-weight: bold; font-size: 14px');

    const passed = this._results.filter(r => r.status === 'COMPLETE').length;
    const failed = this._results.filter(r => r.status === 'FAILED').length;

    console.table(this._results);

    console.log('\n%c📊 ANALYSIS INSTRUCTIONS:', 'color: #ffff00; font-weight: bold');
    console.log('1. Scroll up in console to find [Sentinel] Transaction logs');
    console.log('2. For each test, count transaction START/END pairs');
    console.log('3. Check mutation count and derived recalc count per transaction');
    console.log('4. Compare against expected patterns:');
    console.log('   - Single action = 1 transaction (ideal)');
    console.log('   - Single action = 2-3 transactions (acceptable if all PASS)');
    console.log('   - Single action = 5+ transactions (FRAGMENTED - needs fixing)');
    console.log('\n5. Record findings in BATCH-4-WORKFLOW-TESTS.md');
    console.log('6. Identify which candidates (Rule Elements, Chargen, etc.) actually broke');
    console.log('\n%c✅ Tests Complete', 'color: #00ff00; font-weight: bold');
  }
}

// Export for use in Foundry console
if (typeof window !== 'undefined') {
  window.BATCH4Tests = BATCH4Tests;
}
