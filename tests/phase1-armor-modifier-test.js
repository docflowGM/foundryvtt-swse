/**
 * PHASE 1 ARMOR MODIFIER REGISTRATION TEST
 * Validates that armor systems are correctly registered as ModifierEngine domains
 *
 * Test Scenarios:
 * 1. Light armor (proficient) - should register bonuses, no ACP
 * 2. Heavy armor (not proficient) - should register bonuses, ACP penalties
 * 3. With Armored Defense talent - should apply talent logic
 * 4. With Armor Mastery talent - should increase max dex by +1
 * 5. No armor - should return no modifiers
 */

import { ModifierEngine } from '../scripts/engine/effects/modifiers/ModifierEngine.js';
import { ModifierType, ModifierSource } from '../scripts/engine/effects/modifiers/ModifierTypes.js';

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}${details ? ` (${details})` : ''}`);
  TEST_RESULTS.tests.push({ name, passed, details });
  if (passed) TEST_RESULTS.passed++;
  else TEST_RESULTS.failed++;
}

function logWarning(name, message) {
  console.warn(`⚠ WARNING: ${name} - ${message}`);
  TEST_RESULTS.warnings++;
}

// ============================================
// TEST SCENARIO 1: Light Armor (Proficient)
// ============================================
async function testLightArmorProficient() {
  console.log('\n=== TEST 1: Light Armor (Proficient) ===');

  // Mock actor with light armor (proficient)
  const mockActor = {
    name: 'Test Character',
    type: 'character',
    items: [
      // Armor: Light Armor (+3 defense bonus, +1 equipment bonus)
      {
        id: 'armor-light-1',
        type: 'armor',
        name: 'Combat Suit (Light)',
        system: {
          equipped: true,
          armorType: 'light',
          defenseBonus: 3,
          equipmentBonus: 1,
          fortBonus: 0,
          maxDexBonus: null,
          armorCheckPenalty: 0,
          speedPenalty: 0
        }
      },
      // Talent: Armor Proficiency (Light)
      {
        id: 'talent-armor-light',
        type: 'talent',
        name: 'Armor Proficiency (Light)',
        system: {}
      }
    ],
    system: {
      speed: 6,
      derivedSpeed: { base: 6 }
    }
  };

  const modifiers = ModifierEngine._getItemModifiers(mockActor);

  // Verify modifier count
  logTest('Light/Proficient: Has modifiers',
    modifiers && modifiers.length > 0,
    `Found ${modifiers.length} modifiers`);

  // Verify reflex defense bonus
  const reflexBonus = modifiers.find(m => m.target === 'defense.reflex' && m.type === ModifierType.ARMOR);
  logTest('Light/Proficient: Reflex armor bonus registered',
    reflexBonus && reflexBonus.value === 3,
    reflexBonus ? `+${reflexBonus.value}` : 'Not found');

  // Verify equipment bonus for reflex
  const reflexEquip = modifiers.find(m => m.target === 'defense.reflex' && m.type === ModifierType.EQUIPMENT);
  logTest('Light/Proficient: Reflex equipment bonus registered',
    reflexEquip && reflexEquip.value === 1,
    reflexEquip ? `+${reflexEquip.value}` : 'Not found');

  // Verify NO armor check penalty to skills
  const acpModifiers = modifiers.filter(m => m.target && m.target.startsWith('skill.'));
  logTest('Light/Proficient: No ACP penalties to skills',
    acpModifiers.length === 0,
    acpModifiers.length > 0 ? `Found ${acpModifiers.length} unexpected ACP modifiers` : 'Correct');

  // Verify NO speed penalty
  const speedMod = modifiers.find(m => m.target === 'speed.base');
  logTest('Light/Proficient: No speed penalty',
    !speedMod,
    speedMod ? `Unexpected speed penalty: ${speedMod.value}` : 'Correct');
}

// ============================================
// TEST SCENARIO 2: Heavy Armor (Not Proficient)
// ============================================
async function testHeavyArmorNotProficient() {
  console.log('\n=== TEST 2: Heavy Armor (Not Proficient) ===');

  const mockActor = {
    name: 'Test Character',
    type: 'character',
    items: [
      // Armor: Heavy Armor (+6 defense bonus, +2 equipment bonus)
      {
        id: 'armor-heavy-1',
        type: 'armor',
        name: 'Battle Armor (Heavy)',
        system: {
          equipped: true,
          armorType: 'heavy',
          defenseBonus: 6,
          equipmentBonus: 2,
          fortBonus: 0,
          maxDexBonus: 2, // Heavy armor limits DEX
          armorCheckPenalty: 0,
          speedPenalty: 0 // Will default to -4 for heavy
        }
      },
      // No armor proficiency talents
    ],
    system: {
      speed: 6,
      derivedSpeed: { base: 6 }
    }
  };

  const modifiers = ModifierEngine._getItemModifiers(mockActor);

  // Verify modifier count
  logTest('Heavy/NotProf: Has modifiers',
    modifiers && modifiers.length > 0,
    `Found ${modifiers.length} modifiers`);

  // Verify reflex defense bonus (still applies)
  const reflexBonus = modifiers.find(m => m.target === 'defense.reflex' && m.type === ModifierType.ARMOR);
  logTest('Heavy/NotProf: Reflex armor bonus registered',
    reflexBonus && reflexBonus.value === 6,
    reflexBonus ? `+${reflexBonus.value}` : 'Not found');

  // Verify NO equipment bonus (not proficient)
  const equipModifiers = modifiers.filter(m => m.type === ModifierType.EQUIPMENT);
  logTest('Heavy/NotProf: No equipment bonuses (not proficient)',
    equipModifiers.length === 0,
    equipModifiers.length > 0 ? `Found ${equipModifiers.length} equipment bonuses` : 'Correct');

  // Verify armor check penalty to skills
  const acpModifiers = modifiers.filter(m => m.target && m.target.startsWith('skill.'));
  logTest('Heavy/NotProf: ACP penalties registered to skills',
    acpModifiers.length > 0,
    `Found ${acpModifiers.length} ACP modifiers`);

  // Verify ACP is -10 (heavy proficiency penalty: -10)
  if (acpModifiers.length > 0) {
    const acpValue = acpModifiers[0].value;
    logTest('Heavy/NotProf: ACP value is -10',
      acpValue === -10,
      `ACP value: ${acpValue}`);
  }

  // Verify speed penalty
  const speedMod = modifiers.find(m => m.target === 'speed.base');
  logTest('Heavy/NotProf: Speed penalty registered',
    speedMod && speedMod.value === -4,
    speedMod ? `Speed penalty: ${speedMod.value}` : 'Not found');

  // Verify max dex limitation
  const maxDexMod = modifiers.find(m => m.target === 'defense.dexLimit');
  logTest('Heavy/NotProf: Max dex limitation registered',
    maxDexMod && maxDexMod.value === 2,
    maxDexMod ? `Max dex: +${maxDexMod.value}` : 'Not found');
}

// ============================================
// TEST SCENARIO 3: With Armored Defense Talent
// ============================================
async function testWithArmoredDefenseTalent() {
  console.log('\n=== TEST 3: With Armored Defense Talent ===');

  const mockActor = {
    name: 'Test Character',
    type: 'character',
    items: [
      {
        id: 'armor-medium-1',
        type: 'armor',
        name: 'Powered Combat Armor (Medium)',
        system: {
          equipped: true,
          armorType: 'medium',
          defenseBonus: 4,
          equipmentBonus: 1,
          fortBonus: 0,
          maxDexBonus: null,
          armorCheckPenalty: -1,
          speedPenalty: 0
        }
      },
      {
        id: 'talent-armor-medium',
        type: 'talent',
        name: 'Armor Proficiency (Medium)',
        system: {}
      },
      {
        id: 'talent-armored-def',
        type: 'talent',
        name: 'Armored Defense',
        system: {}
      }
    ],
    system: {
      speed: 6,
      derivedSpeed: { base: 6 }
    }
  };

  const modifiers = ModifierEngine._getItemModifiers(mockActor);

  // Verify armor bonus
  const reflexBonus = modifiers.find(m => m.target === 'defense.reflex' && m.type === ModifierType.ARMOR);
  logTest('Armored Defense: Armor bonus registered',
    reflexBonus && reflexBonus.value === 4,
    reflexBonus ? `+${reflexBonus.value}` : 'Not found');

  // Verify equipment bonus present (proficient)
  const equipModifiers = modifiers.filter(m => m.type === ModifierType.EQUIPMENT);
  logTest('Armored Defense: Equipment bonuses present',
    equipModifiers.length > 0,
    `Found ${equipModifiers.length} equipment bonuses`);

  // Verify armor check penalty (proficient, so only armor's base -1)
  const acpModifiers = modifiers.filter(m => m.target && m.target.startsWith('skill.'));
  if (acpModifiers.length > 0) {
    const acpValue = acpModifiers[0].value;
    logTest('Armored Defense: Correct ACP (proficient)',
      acpValue === -1,
      `ACP value: ${acpValue}`);
  } else {
    logTest('Armored Defense: Correct ACP (proficient)',
      false,
      'No ACP modifiers found');
  }
}

// ============================================
// TEST SCENARIO 4: With Armor Mastery Talent
// ============================================
async function testWithArmorMasteryTalent() {
  console.log('\n=== TEST 4: With Armor Mastery Talent ===');

  const mockActor = {
    name: 'Test Character',
    type: 'character',
    items: [
      {
        id: 'armor-heavy-1',
        type: 'armor',
        name: 'Combat Field Armor (Heavy)',
        system: {
          equipped: true,
          armorType: 'heavy',
          defenseBonus: 6,
          equipmentBonus: 2,
          fortBonus: 1,
          maxDexBonus: 2, // Will become +3 with Armor Mastery
          armorCheckPenalty: -1,
          speedPenalty: 0
        }
      },
      {
        id: 'talent-armor-heavy',
        type: 'talent',
        name: 'Armor Proficiency (Heavy)',
        system: {}
      },
      {
        id: 'talent-armor-mastery',
        type: 'talent',
        name: 'Armor Mastery',
        system: {}
      }
    ],
    system: {
      speed: 6,
      derivedSpeed: { base: 6 }
    }
  };

  const modifiers = ModifierEngine._getItemModifiers(mockActor);

  // Verify max dex increased by +1
  const maxDexMod = modifiers.find(m => m.target === 'defense.dexLimit');
  logTest('Armor Mastery: Max dex increased to +3',
    maxDexMod && maxDexMod.value === 3,
    maxDexMod ? `Max dex: +${maxDexMod.value}` : 'Not found');

  // Verify armor bonus still present
  const reflexBonus = modifiers.find(m => m.target === 'defense.reflex' && m.type === ModifierType.ARMOR);
  logTest('Armor Mastery: Armor bonus still registered',
    reflexBonus && reflexBonus.value === 6,
    reflexBonus ? `+${reflexBonus.value}` : 'Not found');
}

// ============================================
// TEST SCENARIO 5: No Armor
// ============================================
async function testNoArmor() {
  console.log('\n=== TEST 5: No Armor Equipped ===');

  const mockActor = {
    name: 'Test Character',
    type: 'character',
    items: [
      {
        id: 'feat-dodge',
        type: 'feat',
        name: 'Dodge',
        system: {}
      }
    ],
    system: {
      speed: 6,
      derivedSpeed: { base: 6 }
    }
  };

  const modifiers = ModifierEngine._getItemModifiers(mockActor);

  logTest('No Armor: Returns empty array',
    modifiers.length === 0,
    `Found ${modifiers.length} unexpected modifiers`);
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1 ARMOR MODIFIER REGISTRATION TEST SUITE');
  console.log('='.repeat(60));

  await testLightArmorProficient();
  await testHeavyArmorNotProficient();
  await testWithArmoredDefenseTalent();
  await testWithArmorMasteryTalent();
  await testNoArmor();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed:  ${TEST_RESULTS.passed}`);
  console.log(`Failed:  ${TEST_RESULTS.failed}`);
  console.log(`Warnings: ${TEST_RESULTS.warnings}`);
  console.log(`Total:   ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);

  if (TEST_RESULTS.failed === 0) {
    console.log('\n✓ ALL TESTS PASSED - Phase 1 Implementation Valid');
  } else {
    console.log(`\n✗ ${TEST_RESULTS.failed} TESTS FAILED - Review needed`);
  }
  console.log('='.repeat(60));

  return {
    passed: TEST_RESULTS.passed,
    failed: TEST_RESULTS.failed,
    total: TEST_RESULTS.passed + TEST_RESULTS.failed,
    warnings: TEST_RESULTS.warnings
  };
}

export { runAllTests };
