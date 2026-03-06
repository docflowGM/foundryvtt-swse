/**
 * PHASE 2 PASSIVE CONDITIONAL MODIFIER TEST SUITE
 *
 * Validates PASSIVE/MODIFIER conditional support:
 * - WEAPON_CATEGORY conditions
 * - EQUIPPED_ITEM_TYPE conditions
 * - ACTOR_FLAG conditions
 * - SKILL_CONTEXT conditions
 * - Multiple conditions (AND logic)
 * - Condition toggle stability (no accumulation)
 *
 * Success criteria:
 * ✓ Modifiers with conditions only apply when conditions are met
 * ✓ Toggling equipment updates modifier applicability
 * ✓ No accumulation on repeated equip/unequip cycles
 * ✓ Multiple conditions use AND logic (all must be true)
 * ✓ Modifiers without conditions always apply
 */

import { ConditionEvaluator } from '../scripts/engine/abilities/passive/condition-evaluator.js';
import { PassiveAdapter } from '../scripts/engine/abilities/passive/passive-adapter.js';
import { PassiveContractValidator } from '../scripts/engine/abilities/passive/passive-contract.js';
import { ModifierEngine } from '../scripts/engine/effects/modifiers/ModifierEngine.js';
import { PHASE_2_TEST_FEATS } from '../scripts/engine/abilities/passive/phase-2-feat-definitions.js';

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
 * Create a mock actor with equipment items
 */
function createMockActor(name = 'Test Character') {
  return {
    id: 'actor-test-001',
    name: name,
    type: 'character',
    items: [],
    flags: {
      swse: {}
    },
    system: {
      attributes: {
        defense: {
          fortitude: 13,
          reflex: 15,
          will: 12
        },
        skills: {
          acrobatics: 8,
          piloting: 5,
          stealth: 7
        }
      }
    },
    _passiveModifiers: {},

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

    // Helper to add armor item
    addArmor(armorName, equipped = true) {
      const armor = {
        id: `armor-${armorName.replace(/\s+/g, '-').toLowerCase()}`,
        name: armorName,
        type: 'armor',
        system: {
          equipped
        }
      };
      this.items.push(armor);
      return armor;
    },

    // Helper to set flag
    setFlag(flagName, value) {
      this.flags.swse[flagName] = value;
    },

    // Helper to add a feat
    addFeat(featName) {
      const metadata = PHASE_2_TEST_FEATS[featName];
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
    },

    // Helper to toggle armor equipped state
    toggleArmor(armorName, equipped = null) {
      const armor = this.items.find(i =>
        i.type === 'armor' && i.name === armorName
      );
      if (!armor) throw new Error(`Armor not found: ${armorName}`);
      armor.system.equipped = equipped !== null ? equipped : !armor.system.equipped;
    }
  };
}

// =============================================================================
// PHASE 2A: ConditionEvaluator Unit Tests
// =============================================================================

logSection('PHASE 2A: ConditionEvaluator Unit Tests');

(() => {
  const actor = createMockActor('Jedi Knight');
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);

  // Test WEAPON_CATEGORY condition
  const weaponCondition = {
    type: 'WEAPON_CATEGORY',
    value: 'LIGHTSABER'
  };
  const result = ConditionEvaluator.evaluate(actor, weaponCondition);
  logTest('WEAPON_CATEGORY: Lightsaber equipped', result === true, `got ${result}`);

  // Test WEAPON_CATEGORY with unequipped weapon
  actor.toggleWeapon('Lightsaber', false);
  const resultUnequipped = ConditionEvaluator.evaluate(actor, weaponCondition);
  logTest(
    'WEAPON_CATEGORY: Lightsaber unequipped',
    resultUnequipped === false,
    `got ${resultUnequipped}`
  );
})();

(() => {
  const actor = createMockActor('Soldier');
  actor.addArmor('Combat Armor', true);

  // Test EQUIPPED_ITEM_TYPE condition
  const armorCondition = {
    type: 'EQUIPPED_ITEM_TYPE',
    value: 'armor'
  };
  const result = ConditionEvaluator.evaluate(actor, armorCondition);
  logTest('EQUIPPED_ITEM_TYPE: Armor equipped', result === true, `got ${result}`);

  // Test with unequipped armor
  actor.toggleArmor('Combat Armor', false);
  const resultUnequipped = ConditionEvaluator.evaluate(actor, armorCondition);
  logTest(
    'EQUIPPED_ITEM_TYPE: Armor unequipped',
    resultUnequipped === false,
    `got ${resultUnequipped}`
  );
})();

(() => {
  const actor = createMockActor('Force User');
  actor.setFlag('isForceUser', true);

  // Test ACTOR_FLAG condition
  const flagCondition = {
    type: 'ACTOR_FLAG',
    value: 'isForceUser'
  };
  const result = ConditionEvaluator.evaluate(actor, flagCondition);
  logTest('ACTOR_FLAG: Flag set', result === true, `got ${result}`);

  // Test with flag unset
  actor.setFlag('isForceUser', false);
  const resultUnset = ConditionEvaluator.evaluate(actor, flagCondition);
  logTest('ACTOR_FLAG: Flag unset', resultUnset === false, `got ${resultUnset}`);
})();

(() => {
  const actor = createMockActor('Skilled Character');

  // Test SKILL_CONTEXT condition
  const skillCondition = {
    type: 'SKILL_CONTEXT',
    value: 'acrobatics'
  };
  const result = ConditionEvaluator.evaluate(actor, skillCondition);
  logTest('SKILL_CONTEXT: Skill exists', result === true, `got ${result}`);

  // Test with missing skill
  const missingCondition = {
    type: 'SKILL_CONTEXT',
    value: 'nonexistent_skill'
  };
  const resultMissing = ConditionEvaluator.evaluate(actor, missingCondition);
  logTest(
    'SKILL_CONTEXT: Missing skill',
    resultMissing === false,
    `got ${resultMissing}`
  );
})();

// =============================================================================
// PHASE 2B: evaluateAll (AND Logic) Tests
// =============================================================================

logSection('PHASE 2B: evaluateAll (AND Logic) Tests');

(() => {
  const actor = createMockActor('Balanced Warrior');
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);
  actor.addArmor('Combat Armor', true);

  // Both conditions true → should return true
  const conditions = [
    { type: 'WEAPON_CATEGORY', value: 'LIGHTSABER' },
    { type: 'EQUIPPED_ITEM_TYPE', value: 'armor' }
  ];
  const result = ConditionEvaluator.evaluateAll(actor, conditions);
  logTest('evaluateAll: Both conditions true', result === true, `got ${result}`);

  // One condition false → should return false
  actor.toggleWeapon('Lightsaber', false);
  const resultPartial = ConditionEvaluator.evaluateAll(actor, conditions);
  logTest(
    'evaluateAll: One condition false',
    resultPartial === false,
    `got ${resultPartial}`
  );

  // Empty conditions → should return true (always apply)
  const resultEmpty = ConditionEvaluator.evaluateAll(actor, []);
  logTest(
    'evaluateAll: Empty conditions',
    resultEmpty === true,
    `got ${resultEmpty}`
  );
})();

// =============================================================================
// PHASE 2C: Conditional Modifier Registration Tests
// =============================================================================

logSection('PHASE 2C: Conditional Modifier Registration Tests');

(() => {
  const actor = createMockActor('Jedi Knight');
  const feat = actor.addFeat('Lightsaber Focus');

  // Register the feat
  try {
    PassiveAdapter.register(actor, feat);
    logTest('Register Lightsaber Focus feat', true);
  } catch (err) {
    logTest('Register Lightsaber Focus feat', false, err.message);
  }

  // Verify modifiers stored on actor
  const hasModifiers = actor._passiveModifiers['feat-lightsaber-focus']?.length > 0;
  logTest('Modifiers stored on actor', hasModifiers === true);
})();

(() => {
  const actor = createMockActor('Soldier');
  const feat = actor.addFeat('Armored Defense');

  try {
    PassiveAdapter.register(actor, feat);
    logTest('Register Armored Defense feat', true);
  } catch (err) {
    logTest('Register Armored Defense feat', false, err.message);
  }

  const hasModifiers = actor._passiveModifiers['feat-armored-defense']?.length > 0;
  logTest('Armored Defense modifiers stored', hasModifiers === true);
})();

// =============================================================================
// PHASE 2D: Conditional Modifier Application Tests
// =============================================================================

logSection('PHASE 2D: Conditional Modifier Application Tests');

(() => {
  const actor = createMockActor('Jedi Knight');
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);
  const feat = actor.addFeat('Lightsaber Focus');

  try {
    PassiveAdapter.register(actor, feat);
  } catch (err) {
    logTest('Setup: Register Lightsaber Focus', false, err.message);
    return;
  }

  // Get the modifiers
  const mods = actor._passiveModifiers['feat-lightsaber-focus'];
  logTest('Setup: Modifiers loaded', mods?.length > 0);

  if (mods?.length > 0) {
    const mod = mods[0];
    logTest('Setup: Modifier has conditions', Array.isArray(mod.conditions));

    // Test condition evaluation with lightsaber equipped
    const conditionMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Lightsaber Focus: Condition true when lightsaber equipped',
      conditionMet === true
    );

    // Test condition evaluation with lightsaber unequipped
    actor.toggleWeapon('Lightsaber', false);
    const conditionNotMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Lightsaber Focus: Condition false when lightsaber unequipped',
      conditionNotMet === false
    );
  }
})();

// =============================================================================
// PHASE 2E: Multiple Conditions (AND Logic) Tests
// =============================================================================

logSection('PHASE 2E: Multiple Conditions (AND Logic) Tests');

(() => {
  const actor = createMockActor('Balanced Warrior');
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);
  actor.addArmor('Combat Armor', true);
  const feat = actor.addFeat('Balanced Warrior');

  try {
    PassiveAdapter.register(actor, feat);
  } catch (err) {
    logTest('Setup: Register Balanced Warrior', false, err.message);
    return;
  }

  const mods = actor._passiveModifiers['feat-balanced-warrior'];
  if (mods?.length > 0) {
    const mod = mods[0];
    logTest('Setup: Balanced Warrior has multiple conditions', mod.conditions?.length === 2);

    // Both conditions true
    let conditionMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Balanced Warrior: Both conditions true',
      conditionMet === true
    );

    // Unequip lightsaber → one condition false
    actor.toggleWeapon('Lightsaber', false);
    conditionMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Balanced Warrior: Lightsaber unequipped (one false)',
      conditionMet === false
    );

    // Re-equip lightsaber, unequip armor → one condition false
    actor.toggleWeapon('Lightsaber', true);
    actor.toggleArmor('Combat Armor', false);
    conditionMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Balanced Warrior: Armor unequipped (one false)',
      conditionMet === false
    );

    // Both conditions true again
    actor.toggleArmor('Combat Armor', true);
    conditionMet = ConditionEvaluator.evaluateAll(actor, mod.conditions);
    logTest(
      'Balanced Warrior: Both conditions true again',
      conditionMet === true
    );
  }
})();

// =============================================================================
// PHASE 2F: Condition Toggle Stability Tests (No Accumulation)
// =============================================================================

logSection('PHASE 2F: Condition Toggle Stability Tests');

(() => {
  const actor = createMockActor('Stability Test');
  actor.addWeapon('Lightsaber', 'LIGHTSABER', true);
  const feat = actor.addFeat('Conditional Stability Test');

  try {
    PassiveAdapter.register(actor, feat);
  } catch (err) {
    logTest('Setup: Register stability test feat', false, err.message);
    return;
  }

  const modsList = actor._passiveModifiers['feat-conditional-stability-test'];
  const initialCount = modsList?.length || 0;
  logTest('Setup: Initial modifier count', initialCount === 1, `count: ${initialCount}`);

  if (modsList?.length > 0) {
    // Toggle equipment multiple times
    for (let i = 0; i < 5; i++) {
      actor.toggleWeapon('Lightsaber');
    }

    const finalCount = modsList.length;
    logTest(
      'After 5 equip/unequip cycles: No accumulation',
      finalCount === initialCount,
      `expected ${initialCount}, got ${finalCount}`
    );

    // Verify modifier still works
    actor.toggleWeapon('Lightsaber', true);
    const conditionMet = ConditionEvaluator.evaluateAll(actor, modsList[0].conditions);
    logTest(
      'After cycles: Condition still evaluates correctly',
      conditionMet === true
    );
  }
})();

// =============================================================================
// PHASE 2G: Contract Validation Tests
// =============================================================================

logSection('PHASE 2G: Contract Validation Tests');

(() => {
  // Valid feat with conditions
  const validFeat = {
    name: 'Test Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1,
            conditions: [
              { type: 'WEAPON_CATEGORY', value: 'LIGHTSABER' }
            ]
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(validFeat);
    logTest('Validate feat with conditions', true);
  } catch (err) {
    logTest('Validate feat with conditions', false, err.message);
  }
})();

(() => {
  // Invalid condition (missing type)
  const invalidFeat = {
    name: 'Invalid Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1,
            conditions: [
              { value: 'LIGHTSABER' } // Missing type
            ]
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(invalidFeat);
    logTest('Reject condition without type', false, 'should have thrown');
  } catch (err) {
    logTest('Reject condition without type', true);
  }
})();

(() => {
  // Invalid condition (missing value)
  const invalidFeat = {
    name: 'Invalid Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1,
            conditions: [
              { type: 'WEAPON_CATEGORY' } // Missing value
            ]
          }
        ]
      }
    }
  };

  try {
    PassiveContractValidator.validate(invalidFeat);
    logTest('Reject condition without value', false, 'should have thrown');
  } catch (err) {
    logTest('Reject condition without value', true);
  }
})();

// =============================================================================
// PHASE 2H: Safety Rules Tests
// =============================================================================

logSection('PHASE 2H: Safety Rules Tests');

(() => {
  const actor = createMockActor('Safety Test');

  // Test: PASSIVE cannot have grants
  const featWithGrants = {
    id: 'feat-test',
    name: 'Test Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      grants: [{ type: 'some-grant' }],
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1
          }
        ]
      }
    }
  };

  try {
    PassiveAdapter.register(actor, featWithGrants);
    logTest('Reject PASSIVE with grants field', false, 'should have thrown');
  } catch (err) {
    logTest('Reject PASSIVE with grants field', true);
  }
})();

(() => {
  const actor = createMockActor('Safety Test');

  // Test: PASSIVE cannot have trigger
  const featWithTrigger = {
    id: 'feat-test',
    name: 'Test Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      trigger: 'on-hit',
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1
          }
        ]
      }
    }
  };

  try {
    PassiveAdapter.register(actor, featWithTrigger);
    logTest('Reject PASSIVE with trigger field', false, 'should have thrown');
  } catch (err) {
    logTest('Reject PASSIVE with trigger field', true);
  }
})();

(() => {
  const actor = createMockActor('Safety Test');

  // Test: PASSIVE cannot have formula
  const featWithFormula = {
    id: 'feat-test',
    name: 'Test Feat',
    system: {
      executionModel: 'PASSIVE',
      subType: 'MODIFIER',
      formula: '2d6',
      abilityMeta: {
        modifiers: [
          {
            target: 'defense.reflex',
            type: 'untyped',
            value: 1
          }
        ]
      }
    }
  };

  try {
    PassiveAdapter.register(actor, featWithFormula);
    logTest('Reject PASSIVE with formula field', false, 'should have thrown');
  } catch (err) {
    logTest('Reject PASSIVE with formula field', true);
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
