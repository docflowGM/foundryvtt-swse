/**
 * Standalone Test Runner for LightsaberConstructionEngine
 * Runs without Foundry VTT dependencies
 * Node.js compatible for quick feedback
 */

// Mock globals
globalThis.game = {
  time: {
    worldTime: 1000
  }
};

globalThis.ui = {
  notifications: {
    error: (msg) => console.error('[UI] ' + msg),
    warn: (msg) => console.warn('[UI] ' + msg),
    info: (msg) => console.log('[UI] ' + msg)
  }
};

// Mock SWSELogger
const mockLogger = {
  debug: (...args) => console.log('[DEBUG]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

/**
 * Mock implementations of dependencies
 */

// RollEngine
globalThis.RollEngine = {
  async safeRoll(formula) {
    // Default: successful roll
    const match = formula.match(/1d20\s*\+\s*(\d+)/);
    const modifier = match ? parseInt(match[1]) : 0;
    const d20 = Math.floor(Math.random() * 20) + 1;
    return {
      total: d20 + modifier,
      dice: [{ results: [{ result: d20 }] }],
      formula,
      evaluate: async function() { return this; }
    };
  }
};

// LedgerService
globalThis.LedgerService = {
  validateFunds(actor, cost) {
    const available = actor.system.credits.available;
    const hasFunds = available >= cost;
    return {
      ok: hasFunds,
      reason: hasFunds ? null : 'insufficient_credits'
    };
  },
  buildCreditDelta(actor, cost) {
    return {
      set: {
        'system.credits.available': actor.system.credits.available - cost
      }
    };
  }
};

// ActorEngine
globalThis.ActorEngine = {
  async applyMutationPlan(actor, plan) {
    if (plan.set) {
      Object.entries(plan.set).forEach(([key, value]) => {
        const parts = key.split('.');
        let obj = actor;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]]) obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
      });
    }
  },
  async createEmbeddedDocuments(actor, type, items) {
    return items.map((item, idx) => ({
      ...item,
      id: `created-item-${idx}`,
      embedded: true
    }));
  }
};

/**
 * Lightweight test runner
 */
class LightsaberConstructionEngineTestsStandalone {
  static log(text) {
    console.log(text);
  }

  static assert(condition, message) {
    if (!condition) {
      console.error('❌ ' + message);
      throw new Error(message);
    }
  }

  static async run() {
    this.log('🧪 LIGHTSABER CONSTRUCTION ENGINE - STANDALONE TEST RUNNER\n');
    this.log('═'.repeat(70) + '\n');

    try {
      this._testPhase1DataStructure();
      this.log('✅ Phase 1: Data structure tests passed\n');

      await this._testPhase2CompatibilityChecks();
      this.log('✅ Phase 2: Compatibility checks passed\n');

      await this._testPhase3DCCalculation();
      this.log('✅ Phase 3: DC calculation passed\n');

      await this._testPhase4CostCalculation();
      this.log('✅ Phase 4: Cost calculation passed\n');

      await this._testPhase5FailurePath();
      this.log('✅ Phase 5: Failure path (atomicity) passed\n');

      await this._testPhase6SuccessPath();
      this.log('✅ Phase 6: Success path (mutation) passed\n');

      this.log('═'.repeat(70));
      this.log('✅ ALL TESTS PASSED - Engine is ready\n');
      this.log('Next steps:');
      this.log('1. Test in Foundry console with real actor');
      this.log('2. Verify roll system integration');
      this.log('3. Test attunement integration');
      return true;
    } catch (err) {
      this.log('\n' + '═'.repeat(70));
      this.log('❌ TEST FAILED\n');
      this.log('Error: ' + err.message);
      this.log(err.stack);
      return false;
    }
  }

  static _createMockActor(credits = 10000, useTheForceBonus = 15) {
    return {
      id: 'actor-test-001',
      name: 'Test Character',
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

  static _createMockWeapon(id, name, config = {}) {
    return {
      id,
      name,
      type: 'weapon',
      system: {
        constructible: config.constructible !== false,
        subtype: config.subtype || 'lightsaber',
        chassisId: config.chassisId || 'standard',
        baseBuildDc: config.baseBuildDc ?? 20,
        baseCost: config.baseCost ?? 1500,
        cost: config.cost ?? 0,
        modifiers: []
      },
      toObject() {
        return JSON.parse(JSON.stringify(this));
      }
    };
  }

  static _createMockUpgrade(id, name, config = {}) {
    return {
      id,
      name,
      type: 'weaponUpgrade',
      system: {
        cost: config.cost ?? 0,
        modifiers: [],
        lightsaber: {
          category: config.category || 'crystal',
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

  static _testPhase1DataStructure() {
    this.log('🟦 PHASE 1: Data Structure Validation\n');

    const actor = this._createMockActor();

    // Setup items
    actor.items.set('hilt-1', this._createMockWeapon('hilt-1', 'Standard Hilt'));
    actor.items.set('crystal-1', this._createMockUpgrade('crystal-1', 'Ilum', {
      category: 'crystal',
      compatibleChassis: ['*'],
      buildDcModifier: 0,
      cost: 0
    }));
    actor.items.set('acc-1', this._createMockUpgrade('acc-1', 'Pommel', {
      category: 'accessory',
      compatibleChassis: ['*'],
      buildDcModifier: 2,
      cost: 500
    }));

    this.log('✓ Mock actor created with items');
    this.log('✓ Chassis, crystal, accessory in inventory');
  }

  static async _testPhase2CompatibilityChecks() {
    this.log('🟪 PHASE 2: Compatibility Validation\n');

    const actor = this._createMockActor();

    // Add standard chassis
    actor.items.set('hilt-std', this._createMockWeapon('hilt-std', 'Standard', {
      chassisId: 'standard'
    }));

    // Add advanced-only crystal
    actor.items.set('crystal-adv', this._createMockUpgrade('crystal-adv', 'Advanced Only', {
      category: 'crystal',
      compatibleChassis: ['advanced'], // Only compatible with advanced
      buildDcModifier: 5,
      cost: 1000
    }));

    // Import engine
    const { LightsaberConstructionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js").catch(err => {
      mockLogger.error('Failed to import engine:', err);
      throw err;
    });

    // Try to use incompatible crystal with standard chassis
    const result = LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'hilt-std',
      crystalItemId: 'crystal-adv',
      accessoryItemIds: []
    });

    const final = await Promise.resolve(result);
    this.assert(final.success === false, 'Should reject incompatible crystal');
    this.assert(final.reason === 'crystal_incompatible_chassis', 'Should give correct reason');

    this.log('✓ Correctly rejected incompatible crystal with standard chassis');
  }

  static async _testPhase3DCCalculation() {
    this.log('🟨 PHASE 3: DC Calculation\n');

    const actor = this._createMockActor();

    // Add items
    actor.items.set('hilt', this._createMockWeapon('hilt', 'Hilt', {
      baseBuildDc: 20
    }));

    actor.items.set('crystal', this._createMockUpgrade('crystal', 'Crystal', {
      category: 'crystal',
      compatibleChassis: ['*'],
      buildDcModifier: 5,
      cost: 0
    }));

    actor.items.set('acc', this._createMockUpgrade('acc', 'Accessory', {
      category: 'accessory',
      compatibleChassis: ['*'],
      buildDcModifier: 3,
      cost: 500
    }));

    // Mock roll to succeed
    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 50,
      dice: [{ results: [{ result: 50 }] }],
      formula,
      evaluate: async function() { return this; }
    });

    const { LightsaberConstructionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js").catch(err => {
      mockLogger.error('Failed to import engine:', err);
      throw err;
    });

    const result = LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'hilt',
      crystalItemId: 'crystal',
      accessoryItemIds: ['acc']
    });

    const final = await Promise.resolve(result);

    // Expected DC: 20 + 5 + 3 = 28
    this.assert(final.finalDc === 28, `DC should be 28, got ${final.finalDc}`);
    this.log('✓ DC calculation correct: 20 (base) + 5 (crystal) + 3 (accessory) = 28');
  }

  static async _testPhase4CostCalculation() {
    this.log('🟩 PHASE 4: Cost Calculation\n');

    const actor = this._createMockActor();

    // Add items with specific costs
    actor.items.set('hilt', this._createMockWeapon('hilt', 'Hilt', {
      baseCost: 1500,
      baseBuildDc: 20
    }));

    actor.items.set('crystal', this._createMockUpgrade('crystal', 'Crystal', {
      category: 'crystal',
      compatibleChassis: ['*'],
      cost: 1000
    }));

    actor.items.set('acc', this._createMockUpgrade('acc', 'Accessory', {
      category: 'accessory',
      compatibleChassis: ['*'],
      cost: 500
    }));

    // Mock roll to succeed
    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 50,
      dice: [{ results: [{ result: 50 }] }],
      formula,
      evaluate: async function() { return this; }
    });

    const { LightsaberConstructionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js").catch(err => {
      mockLogger.error('Failed to import engine:', err);
      throw err;
    });

    const result = LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'hilt',
      crystalItemId: 'crystal',
      accessoryItemIds: ['acc']
    });

    const final = await Promise.resolve(result);

    // Expected cost: 1500 + 1000 + 500 = 3000
    this.assert(final.cost === 3000, `Cost should be 3000, got ${final.cost}`);
    this.log('✓ Cost calculation correct: 1500 (hilt) + 1000 (crystal) + 500 (acc) = 3000');
  }

  static async _testPhase5FailurePath() {
    this.log('🟧 PHASE 5: Failure Path (Atomicity)\n');

    const actor = this._createMockActor(10000);
    const creditsBefore = actor.system.credits.available;

    actor.items.set('hilt', this._createMockWeapon('hilt', 'Hilt', {
      baseCost: 1500,
      baseBuildDc: 20
    }));

    actor.items.set('crystal', this._createMockUpgrade('crystal', 'Crystal', {
      category: 'crystal',
      compatibleChassis: ['*'],
      cost: 1000
    }));

    // Mock roll to FAIL
    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 10, // Low roll
      dice: [{ results: [{ result: 10 }] }],
      formula,
      evaluate: async function() { return this; }
    });

    const { LightsaberConstructionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js").catch(err => {
      mockLogger.error('Failed to import engine:', err);
      throw err;
    });

    const result = LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'hilt',
      crystalItemId: 'crystal',
      accessoryItemIds: []
    });

    const final = await Promise.resolve(result);

    this.assert(final.success === false, 'Should fail with low roll');
    this.assert(final.reason === 'roll_failed', 'Should indicate roll failure');

    const creditsAfter = actor.system.credits.available;
    this.assert(creditsAfter === creditsBefore, `Credits should not change on failure: before=${creditsBefore}, after=${creditsAfter}`);

    this.log('✓ Construction failed on low roll (10 < 20)');
    this.log('✓ Credits unchanged (atomic: no mutation on failure)');
  }

  static async _testPhase6SuccessPath() {
    this.log('🟨 PHASE 6: Success Path (Mutation)\n');

    const actor = this._createMockActor(5000);
    const creditsBefore = actor.system.credits.available;

    actor.items.set('hilt', this._createMockWeapon('hilt', 'Hilt', {
      baseCost: 1500,
      baseBuildDc: 20
    }));

    actor.items.set('crystal', this._createMockUpgrade('crystal', 'Crystal', {
      category: 'crystal',
      compatibleChassis: ['*'],
      cost: 2000
    }));

    // Mock roll to SUCCEED
    globalThis.RollEngine.safeRoll = async (formula) => ({
      total: 25, // High roll
      dice: [{ results: [{ result: 25 }] }],
      formula,
      evaluate: async function() { return this; }
    });

    const { LightsaberConstructionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js").catch(err => {
      mockLogger.error('Failed to import engine:', err);
      throw err;
    });

    const result = LightsaberConstructionEngine.attemptConstruction(actor, {
      chassisItemId: 'hilt',
      crystalItemId: 'crystal',
      accessoryItemIds: []
    });

    const final = await Promise.resolve(result);

    this.assert(final.success === true, `Should succeed, got: ${JSON.stringify(final)}`);
    this.assert(final.itemId !== undefined, 'Should return itemId');
    this.assert(final.finalDc === 20, `finalDc should be 20, got ${final.finalDc}`);
    this.assert(final.cost === 3500, `cost should be 3500, got ${final.cost}`);

    const creditsAfter = actor.system.credits.available;
    const deducted = creditsBefore - creditsAfter;
    this.assert(deducted === 3500, `Should deduct 3500 credits, deducted ${deducted}`);

    this.log('✓ Construction succeeded with roll 25 >= DC 20');
    this.log('✓ Item created: ' + final.itemId);
    this.log('✓ Credits deducted: ' + deducted + ' (total cost)');
    this.log('✓ Mutation executed (atomic)');
  }
}

// Run tests
(async () => {
  const success = await LightsaberConstructionEngineTestsStandalone.run();
  process.exit(success ? 0 : 1);
})();
