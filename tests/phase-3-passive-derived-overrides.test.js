/**
 * PHASE 3 PASSIVE DERIVED_OVERRIDE TEST SUITE
 *
 * Validates PASSIVE/DERIVED_OVERRIDE (ADD-only) support:
 * - ABILITY_MOD value type
 * - HALF_LEVEL value type
 * - STATIC value type
 * - Conditions integration
 * - Multi-target overrides
 * - Post-calculation application
 * - No accumulation
 * - Phase 1 & 2 compatibility
 *
 * Success criteria:
 * ✓ Overrides apply correctly to derived values
 * ✓ Conditions on overrides work properly
 * ✓ Multiple overrides stack without conflict
 * ✓ No double-application across prepare cycles
 * ✓ MODIFIER and DERIVED_OVERRIDE coexist
 * ✓ Phase 1 & 2 tests still pass
 */

import { PassiveAdapter } from '../scripts/engine/abilities/passive/passive-adapter.js';
import { PassiveContractValidator } from '../scripts/engine/abilities/passive/passive-contract.js';
import { DerivedOverrideEngine } from '../scripts/engine/abilities/passive/derived-override-engine.js';
import { PHASE_3_TEST_FEATS } from '../scripts/engine/abilities/passive/phase-3-feat-definitions.js';

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(msg) {
  console.log(msg);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const status = passed ? 'PASS' : 'FAIL';
  log(`${icon} ${status}: ${name}${details ? ` (${details})` : ''}`);
  TEST_RESULTS.tests.push({ name, passed, details });
  if (passed) TEST_RESULTS.passed++;
  else TEST_RESULTS.failed++;
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`);
  log(`${title}`);
  log(`${'='.repeat(60)}\n`);
}

/**
 * Create a mock actor with base defenses, abilities, and derived values
 */
function createMockActor(name = 'Test Character', level = 5) {
  return {
    id: 'actor-test-001',
    name: name,
    type: 'character',
    items: [],
    flags: {
      swse: {}
    },
    system: {
      level: level,
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 12, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 13, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 15, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 11, racial: 0, enhancement: 0, temp: 0 }
      },
      derived: {
        attributes: {
          str: { base: 10, total: 10, mod: 0 },
          dex: { base: 14, total: 14, mod: 2 },
          con: { base: 12, total: 12, mod: 1 },
          int: { base: 13, total: 13, mod: 1 },
          wis: { base: 15, total: 15, mod: 2 },
          cha: { base: 11, total: 11, mod: 0 }
        },
        defenses: {
          fortitude: { base: 12, total: 12 },
          reflex: { base: 14, total: 14 },
          will: { base: 13, total: 13 }
        },
        hp: { base: 30, total: 30 },
        initiative: { dexModifier: 2, adjustment: 0, total: 2 },
        speed: { base: 6, total: 6 }
      }
    },
    _passiveModifiers: {},
    _derivedOverrides: {},

    // Helper to add weapon item
    addWeapon(weaponName, category = 'LIGHTSABER', equipped = true) {
      const weapon = {
        id: `weapon-${weaponName.replace(/\s+/g, '-').toLowerCase()}`,
        name: weaponName,
        type: 'weapon',
        system: {
          equipped,
          weaponCategory: category
        }
      };
      this.items.push(weapon);
      return weapon;
    },

    // Helper to add a feat
    addFeat(featName, subType = 'DERIVED_OVERRIDE') {
      const metadata = PHASE_3_TEST_FEATS[featName];
      if (!metadata) throw new Error(`Unknown feat: ${featName}`);

      const feat = {
        id: `feat-${featName.replace(/\s+/g, '-').toLowerCase()}`,
        name: featName,
        type: 'feat',
        system: {
          executionModel: metadata.executionModel,
          subType: metadata.subType,
          abilityMeta: metadata.abilityMeta
        }
      };

      this.items.push(feat);
      return feat;
    },

    // Helper to toggle weapon equipped state
    toggleWeapon(weaponName, equipped = null) {
      const weapon = this.items.find(i =>
        i.type === 'weapon' && i.name === weaponName
      );
      if (!weapon) throw new Error(`Weapon not found: ${weaponName}`);
      weapon.system.equipped = equipped !== null ? equipped : !weapon.system.equipped;
    }
  };
}

// =============================================================================
// PHASE 3A: Contract Validation Tests
// =============================================================================

logSection('PHASE 3A: Contract Validation Tests');

(() => {
  // Valid DERIVED_OVERRIDE feat with ABILITY_MOD
  const validFeat = {
    name: 'Test Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'DERIVED_OVERRIDE',
      abilityMeta: {
        overrides: [
          {
            target: 'defense.reflex',
            operation: 'ADD',
            value: { type: 'ABILITY_MOD', ability: 'dex' }
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(validFeat);
    logTest('Validate DERIVED_OVERRIDE with ABILITY_MOD', true);
  } catch (err) {
    logTest('Validate DERIVED_OVERRIDE with ABILITY_MOD', false, err.message);
  }
})();

(() => {
  // Invalid: REPLACE operation (Phase 3 only supports ADD)
  const invalidFeat = {
    name: 'Invalid Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'DERIVED_OVERRIDE',
      abilityMeta: {
        overrides: [
          {
            target: 'defense.reflex',
            operation: 'REPLACE',
            value: { type: 'STATIC', amount: 15 }
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(invalidFeat);
    logTest('Reject REPLACE operation', false, 'should have thrown');
  } catch (err) {
    logTest('Reject REPLACE operation', true);
  }
})();

(() => {
  // Invalid: Missing operation
  const invalidFeat = {
    name: 'Invalid Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'DERIVED_OVERRIDE',
      abilityMeta: {
        overrides: [
          {
            target: 'defense.reflex',
            value: { type: 'STATIC', amount: 1 }
            // Missing operation field
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(invalidFeat);
    logTest('Reject missing operation', false, 'should have thrown');
  } catch (err) {
    logTest('Reject missing operation', true);
  }
})();

// =============================================================================
// PHASE 3B: Value Computation Tests
// =============================================================================

logSection('PHASE 3B: Value Computation Tests');

(() => {
  const actor = createMockActor('Test Character', 10);

  // Test ABILITY_MOD (Dex = 14, mod = +2)
  const dexMod = DerivedOverrideEngine._getAbilityMod(actor, 'dex');
  logTest('ABILITY_MOD: Dexterity mod = +2', dexMod === 2, `got ${dexMod}`);

  // Test ABILITY_MOD (Cha = 11, mod = 0)
  const chaMod = DerivedOverrideEngine._getAbilityMod(actor, 'cha');
  logTest('ABILITY_MOD: Charisma mod = 0', chaMod === 0, `got ${chaMod}`);
})();

(() => {
  const actor = createMockActor('Test Character', 10);

  // Test HALF_LEVEL (level 10 / 2 = 5)
  const halfLevel = DerivedOverrideEngine._getHalfLevel(actor);
  logTest('HALF_LEVEL: Level 10 → 5', halfLevel === 5, `got ${halfLevel}`);

  const actor5 = createMockActor('Test Character', 5);
  const halfLevel5 = DerivedOverrideEngine._getHalfLevel(actor5);
  logTest('HALF_LEVEL: Level 5 → 2', halfLevel5 === 2, `got ${halfLevel5}`);
})();

(() => {
  const actor = createMockActor('Test Character', 10);

  // Test STATIC value
  const valueSpec = { type: 'STATIC', amount: 7 };
  const value = DerivedOverrideEngine._computeValue(actor, valueSpec);
  logTest('STATIC: Amount 7 → 7', value === 7, `got ${value}`);
})();

// =============================================================================
// PHASE 3C: DerivedOverrideEngine Application Tests
// =============================================================================

logSection('PHASE 3C: DerivedOverrideEngine Application Tests');

(() => {
  const actor = createMockActor('Test Character', 10);
  const updates = {
    'system.derived.defenses.reflex.total': 14,
    'system.derived.defenses.fortitude.total': 12
  };

  // Apply single override: Add Dex mod (+2) to Reflex
  const override = {
    target: 'defense.reflex',
    operation: 'ADD',
    value: { type: 'ABILITY_MOD', ability: 'dex' }
  };

  DerivedOverrideEngine.apply(actor, [override], updates);

  const newReflex = updates['system.derived.defenses.reflex.total'];
  logTest(
    'Apply override: Reflex 14 + Dex(+2) = 16',
    newReflex === 16,
    `got ${newReflex}`
  );
})();

(() => {
  const actor = createMockActor('Test Character', 10);
  const updates = {
    'system.derived.defenses.fortitude.total': 12
  };

  // Apply override: Add half-level (+5) to Fortitude
  const override = {
    target: 'defense.fortitude',
    operation: 'ADD',
    value: { type: 'HALF_LEVEL' }
  };

  DerivedOverrideEngine.apply(actor, [override], updates);

  const newFort = updates['system.derived.defenses.fortitude.total'];
  logTest(
    'Apply override: Fortitude 12 + Half-level(+5) = 17',
    newFort === 17,
    `got ${newFort}`
  );
})();

(() => {
  const actor = createMockActor('Test Character', 10);
  const updates = {
    'system.derived.initiative.total': 2
  };

  // Apply override: Add static +3 to Initiative
  const override = {
    target: 'initiative.total',
    operation: 'ADD',
    value: { type: 'STATIC', amount: 3 }
  };

  DerivedOverrideEngine.apply(actor, [override], updates);

  const newInit = updates['system.derived.initiative.total'];
  logTest(
    'Apply override: Initiative 2 + 3 = 5',
    newInit === 5,
    `got ${newInit}`
  );
})();

// =============================================================================
// PHASE 3D: Condition Integration Tests
// =============================================================================

logSection('PHASE 3D: Condition Integration Tests');

(() => {
  const actor = createMockActor('Lightsaber Wielder', 10);
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);

  const updates = {
    'system.derived.defenses.reflex.total': 14
  };

  // Override with condition: Add +1 Reflex while wielding lightsaber
  const override = {
    target: 'defense.reflex',
    operation: 'ADD',
    value: { type: 'STATIC', amount: 1 },
    conditions: [
      { type: 'WEAPON_CATEGORY', value: 'LIGHTSABER' }
    ]
  };

  DerivedOverrideEngine.apply(actor, [override], updates);

  const newReflex = updates['system.derived.defenses.reflex.total'];
  logTest(
    'Conditional override: Lightsaber equipped → Reflex 14 + 1 = 15',
    newReflex === 15,
    `got ${newReflex}`
  );

  // Now unequip lightsaber
  actor.toggleWeapon('Lightsaber', false);
  const updates2 = {
    'system.derived.defenses.reflex.total': 14
  };

  DerivedOverrideEngine.apply(actor, [override], updates2);

  const reflexNoWeapon = updates2['system.derived.defenses.reflex.total'];
  logTest(
    'Conditional override: Lightsaber unequipped → Reflex stays 14',
    reflexNoWeapon === 14,
    `got ${reflexNoWeapon}`
  );
})();

// =============================================================================
// PHASE 3E: Registration & Persistence Tests
// =============================================================================

logSection('PHASE 3E: Registration & Persistence Tests');

(() => {
  const actor = createMockActor('Charismatic Rogue', 5);
  const feat = actor.addFeat('Charisma Reflex');

  try {
    PassiveAdapter.register(actor, feat);
    logTest('Register Charisma Reflex feat', true);
  } catch (err) {
    logTest('Register Charisma Reflex feat', false, err.message);
  }

  // Verify overrides stored on actor
  const hasOverrides = actor._derivedOverrides['feat-charisma-reflex']?.length > 0;
  logTest('Overrides stored on actor', hasOverrides === true);
})();

(() => {
  const actor = createMockActor('Acrobatic Soldier', 10);
  const feat = actor.addFeat('Acrobatic Finesse');

  try {
    PassiveAdapter.register(actor, feat);
    logTest('Register Acrobatic Finesse (multi-target) feat', true);
  } catch (err) {
    logTest('Register Acrobatic Finesse', false, err.message);
  }

  // Verify both overrides are stored
  const overrides = actor._derivedOverrides['feat-acrobatic-finesse'];
  logTest('Multi-target feat: 2 overrides stored', overrides?.length === 2);
})();

// =============================================================================
// PHASE 3F: Multi-Target & Accumulation Tests
// =============================================================================

logSection('PHASE 3F: Multi-Target & Accumulation Tests');

(() => {
  const actor = createMockActor('Swift Character', 8);
  const updates = {
    'system.derived.initiative.total': 3,
    'system.derived.speed.total': 6
  };

  // Apply multi-target override
  const overrides = [
    {
      target: 'initiative.total',
      operation: 'ADD',
      value: { type: 'ABILITY_MOD', ability: 'dex' } // +2
    },
    {
      target: 'speed',
      operation: 'ADD',
      value: { type: 'STATIC', amount: 2 }
    }
  ];

  DerivedOverrideEngine.apply(actor, overrides, updates);

  const newInit = updates['system.derived.initiative.total'];
  const newSpeed = updates['system.derived.speed.total'];

  logTest(
    'Multi-target: Initiative 3 + Dex(+2) = 5',
    newInit === 5,
    `got ${newInit}`
  );

  logTest(
    'Multi-target: Speed 6 + 2 = 8',
    newSpeed === 8,
    `got ${newSpeed}`
  );
})();

(() => {
  // Test: Applying same overrides twice should not accumulate
  const actor = createMockActor('Repeated Test', 5);
  const updates = {
    'system.derived.defenses.reflex.total': 14
  };

  const override = {
    target: 'defense.reflex',
    operation: 'ADD',
    value: { type: 'STATIC', amount: 1 }
  };

  // First application
  DerivedOverrideEngine.apply(actor, [override], updates);
  const first = updates['system.derived.defenses.reflex.total'];

  // Second application (simulating re-prepare)
  // Reset and apply again
  const updates2 = {
    'system.derived.defenses.reflex.total': 14
  };
  DerivedOverrideEngine.apply(actor, [override], updates2);
  const second = updates2['system.derived.defenses.reflex.total'];

  logTest(
    'No accumulation: Both applications yield same result',
    first === second && first === 15,
    `first=${first}, second=${second}`
  );
})();

// =============================================================================
// PHASE 3G: Safety Rules Tests
// =============================================================================

logSection('PHASE 3G: Safety Rules Tests');

(() => {
  const actor = createMockActor('Dangerous Override Test');

  // Test: Cannot modify base ability scores
  const dangerousFeat = {
    id: 'feat-test',
    name: 'Dangerous Override',
    system: {
      executionModel: 'PASSIVE',
      subType: 'DERIVED_OVERRIDE',
      abilityMeta: {
        overrides: [
          {
            target: 'attributes.str.base', // Dangerous!
            operation: 'ADD',
            value: { type: 'STATIC', amount: 5 }
          }
        ]
      }
    }
  };

  try {
    PassiveAdapter.register(actor, dangerousFeat);
    logTest('Reject override of base ability scores', false, 'should have thrown');
  } catch (err) {
    logTest('Reject override of base ability scores', true);
  }
})();

(() => {
  const actor = createMockActor('Dangerous Override Test');

  // Test: Cannot modify level
  const dangerousFeat = {
    id: 'feat-test',
    name: 'Dangerous Override',
    system: {
      executionModel: 'PASSIVE',
      subType: 'DERIVED_OVERRIDE',
      abilityMeta: {
        overrides: [
          {
            target: 'level', // Dangerous!
            operation: 'ADD',
            value: { type: 'STATIC', amount: 1 }
          }
        ]
      }
    }
  };

  try {
    PassiveAdapter.register(actor, dangerousFeat);
    logTest('Reject override of level', false, 'should have thrown');
  } catch (err) {
    logTest('Reject override of level', true);
  }
})();

// =============================================================================
// SUMMARY
// =============================================================================

logSection('TEST SUMMARY');
log(`Passed: ${TEST_RESULTS.passed}`);
log(`Failed: ${TEST_RESULTS.failed}`);
log(`Total: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);

if (TEST_RESULTS.failed === 0) {
  log('\n✓ ALL TESTS PASSED');
} else {
  log(`\n✗ ${TEST_RESULTS.failed} TEST(S) FAILED`);
}

export default TEST_RESULTS;
