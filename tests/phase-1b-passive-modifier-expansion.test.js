/**
 * PHASE 1B PASSIVE MODIFIER EXPANSION TEST SUITE
 *
 * Validates expanded PASSIVE/MODIFIER coverage with:
 * - 6 clean feats with real numeric bonuses
 * - Multiple skill targets
 * - HP/Defense targets
 * - Different stacking types
 * - Multi-modifier injection
 * - Stacking interaction testing
 * - Lifecycle stability
 *
 * Success criteria:
 * ✓ All 6 feats register without error
 * ✓ Modifiers inject correctly to target paths
 * ✓ Stacking logic respects type constraints
 * ✓ No accumulation across prepare cycles
 * ✓ Lifecycle handles add/remove/recompute
 */

import { ModifierEngine } from '../scripts/engine/effects/modifiers/ModifierEngine.js';
import { ModifierSource, ModifierType } from '../scripts/engine/effects/modifiers/ModifierTypes.js';
import { AbilityExecutionCoordinator } from '../scripts/engine/abilities/ability-execution-coordinator.js';
import { PassiveAdapter } from '../scripts/engine/abilities/passive/passive-adapter.js';
import { PHASE_1B_FEATS, applyPhase1BMetadata } from '../scripts/engine/abilities/passive/phase-1b-feat-definitions.js';

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
 * Create a mock actor with base defenses and skills
 */
function createMockActor(name = 'Test Character') {
  return {
    id: 'actor-test-001',
    name: name,
    type: 'character',
    items: [],
    system: {
      attributes: {
        defense: {
          fortitude: 13,
          reflex: 15,
          will: 12
        },
        skills: {
          acrobatics: 8,
          knowledge_core_worlds: 5,
          knowledge_life_sciences: 7
        }
      }
    },
    _passiveModifiers: {},

    // Helper to add a feat
    addFeat(featName) {
      const metadata = PHASE_1B_FEATS[featName];
      if (!metadata) throw new Error(`Unknown feat: ${featName}`);

      const feat = {
        id: `feat-${featName.replace(/\s+/g, '-').toLowerCase()}`,
        name: featName,
        type: 'feat',
        system: {
          ...metadata
        }
      };

      this.items.push(feat);
      return feat;
    },

    // Simulate modifier engine behavior
    getAllModifiers() {
      const allMods = {};
      for (const mods of Object.values(this._passiveModifiers)) {
        if (Array.isArray(mods)) {
          for (const mod of mods) {
            if (!allMods[mod.target]) allMods[mod.target] = [];
            allMods[mod.target].push(mod);
          }
        }
      }
      return allMods;
    },

    // Prepare phase - registration + modifier application
    prepare() {
      AbilityExecutionCoordinator.registerActorAbilities(this);
    }
  };
}

/**
 * TEST 1: Skill Focus Registration
 * Validates single skill modifier injection
 */
async function test1_SkillFocusRegistration() {
  logSection('TEST 1: Skill Focus Registration');

  const actor = createMockActor('Skill Focus Tester');
  actor.addFeat('Skill Focus');
  actor.prepare();

  const mods = actor.getAllModifiers();
  const acroMods = mods['skill.acrobatics'] || [];

  const passed = acroMods.length === 1 &&
    acroMods[0].value === 5 &&
    acroMods[0].type === 'competence';

  logTest(
    'Skill Focus injects +5 competence to acrobatics',
    passed,
    acroMods.length ? `${acroMods[0].value} ${acroMods[0].type}` : 'no modifiers'
  );

  return passed;
}

/**
 * TEST 2: Educated Multi-Skill Registration
 * Validates multiple skill targets from single feat
 */
async function test2_EducatedMultiSkill() {
  logSection('TEST 2: Educated (Multiple Skills)');

  const actor = createMockActor('Educated Tester');
  actor.addFeat('Educated');
  actor.prepare();

  const mods = actor.getAllModifiers();
  const coreMods = mods['skill.knowledge_core_worlds'] || [];
  const lifeMods = mods['skill.knowledge_life_sciences'] || [];

  const corePass = coreMods.length === 1 &&
    coreMods[0].value === 5 &&
    coreMods[0].type === 'competence';

  const lifePass = lifeMods.length === 1 &&
    lifeMods[0].value === 5 &&
    lifeMods[0].type === 'competence';

  logTest(
    'Educated injects +5 competence to Knowledge: Core Worlds',
    corePass,
    corePass ? 'OK' : `${coreMods.length} modifiers`
  );

  logTest(
    'Educated injects +5 competence to Knowledge: Life Sciences',
    lifePass,
    lifePass ? 'OK' : `${lifeMods.length} modifiers`
  );

  return corePass && lifePass;
}

/**
 * TEST 3: Defense Bonuses (Untyped)
 * Validates single defense injection with untyped type
 */
async function test3_DefenseBonus() {
  logSection('TEST 3: Defense Bonuses (Untyped)');

  const actor = createMockActor('Defense Tester');
  actor.addFeat('Great Fortitude');
  actor.addFeat('Lightning Reflexes');
  actor.prepare();

  const mods = actor.getAllModifiers();
  const fortMods = mods['defense.fortitude'] || [];
  const reflexMods = mods['defense.reflex'] || [];

  const fortPass = fortMods.length === 1 &&
    fortMods[0].value === 2 &&
    fortMods[0].type === 'untyped';

  const reflexPass = reflexMods.length === 1 &&
    reflexMods[0].value === 2 &&
    reflexMods[0].type === 'untyped';

  logTest(
    'Great Fortitude injects +2 untyped to Fortitude',
    fortPass,
    fortPass ? 'OK' : `${fortMods.length} mods, type=${fortMods[0]?.type}`
  );

  logTest(
    'Lightning Reflexes injects +2 untyped to Reflex',
    reflexPass,
    reflexPass ? 'OK' : `${reflexMods.length} mods, type=${reflexMods[0]?.type}`
  );

  return fortPass && reflexPass;
}

/**
 * TEST 4: Stacking Type Differentiation (Species vs Untyped)
 * Validates that species and untyped modifiers can coexist
 */
async function test4_MixedStackingTypes() {
  logSection('TEST 4: Mixed Stacking Types (Species + Untyped)');

  const actor = createMockActor('Stacking Type Tester');
  actor.addFeat('Great Fortitude');  // +2 untyped
  actor.addFeat('Thick Skin');       // +2 species
  actor.prepare();

  const mods = actor.getAllModifiers();
  const fortMods = mods['defense.fortitude'] || [];

  const hasUntypedPass = fortMods.some(m => m.type === 'untyped' && m.value === 2);
  const hasSpeciesPass = fortMods.some(m => m.type === 'species' && m.value === 2);
  const countPass = fortMods.length === 2;

  logTest(
    'Fortitude has +2 untyped modifier',
    hasUntypedPass,
    hasUntypedPass ? 'OK' : `types: ${fortMods.map(m => m.type).join(', ')}`
  );

  logTest(
    'Fortitude has +2 species modifier',
    hasSpeciesPass,
    hasSpeciesPass ? 'OK' : `types: ${fortMods.map(m => m.type).join(', ')}`
  );

  logTest(
    'Fortitude has exactly 2 modifiers',
    countPass,
    countPass ? 'OK' : `${fortMods.length} modifiers found`
  );

  return hasUntypedPass && hasSpeciesPass && countPass;
}

/**
 * TEST 5: Multi-Stat Injection (Improved Defenses)
 * Validates that single feat can target multiple stats
 */
async function test5_MultiStatInjection() {
  logSection('TEST 5: Multi-Stat Injection (Improved Defenses)');

  const actor = createMockActor('Multi-Stat Tester');
  actor.addFeat('Improved Defenses');
  actor.prepare();

  const mods = actor.getAllModifiers();
  const reflexMods = mods['defense.reflex'] || [];
  const fortMods = mods['defense.fortitude'] || [];
  const willMods = mods['defense.will'] || [];

  const reflexPass = reflexMods.length === 1 && reflexMods[0].value === 1;
  const fortPass = fortMods.length === 1 && fortMods[0].value === 1;
  const willPass = willMods.length === 1 && willMods[0].value === 1;

  logTest(
    'Improved Defenses injects +1 to Reflex',
    reflexPass,
    reflexPass ? 'OK' : `${reflexMods.length} mods`
  );

  logTest(
    'Improved Defenses injects +1 to Fortitude',
    fortPass,
    fortPass ? 'OK' : `${fortMods.length} mods`
  );

  logTest(
    'Improved Defenses injects +1 to Will',
    willPass,
    willPass ? 'OK' : `${willMods.length} mods`
  );

  return reflexPass && fortPass && willPass;
}

/**
 * TEST 6: No Accumulation on Recompute
 * Validates that repeated prepare() doesn't accumulate modifiers
 */
async function test6_NoAccumulation() {
  logSection('TEST 6: No Accumulation on Recompute');

  const actor = createMockActor('Accumulation Tester');
  actor.addFeat('Great Fortitude');

  // First prepare
  actor.prepare();
  const mods1 = actor.getAllModifiers();
  const fortMods1 = mods1['defense.fortitude'] || [];
  const count1 = fortMods1.length;

  // Prepare again (simulate sheet reopen, etc)
  actor.prepare();
  const mods2 = actor.getAllModifiers();
  const fortMods2 = mods2['defense.fortitude'] || [];
  const count2 = fortMods2.length;

  // Prepare a third time
  actor.prepare();
  const mods3 = actor.getAllModifiers();
  const fortMods3 = mods3['defense.fortitude'] || [];
  const count3 = fortMods3.length;

  const passed = count1 === 1 && count2 === 1 && count3 === 1;

  logTest(
    'Modifiers do not accumulate on repeated prepare',
    passed,
    passed ? `consistent: ${count1}` : `counts: ${count1}, ${count2}, ${count3}`
  );

  return passed;
}

/**
 * TEST 7: Feat Removal Cleanup
 * Validates that removing a feat clears its modifiers
 */
async function test7_FeatRemovalCleanup() {
  logSection('TEST 7: Feat Removal Cleanup');

  const actor = createMockActor('Removal Tester');
  actor.addFeat('Great Fortitude');
  actor.prepare();

  const modsBefore = actor.getAllModifiers();
  const countBefore = (modsBefore['defense.fortitude'] || []).length;

  // Remove the feat
  actor.items = [];
  actor.prepare();

  const modsAfter = actor.getAllModifiers();
  const countAfter = (modsAfter['defense.fortitude'] || []).length;

  const passed = countBefore === 1 && countAfter === 0;

  logTest(
    'Removing feat clears its modifiers',
    passed,
    passed ? 'OK' : `before: ${countBefore}, after: ${countAfter}`
  );

  return passed;
}

/**
 * TEST 8: All 6 Feats Together
 * Validates that all 6 feats can coexist without conflict
 */
async function test8_AllSixFeats() {
  logSection('TEST 8: All 6 Feats Together');

  const actor = createMockActor('All Six Feats Tester');
  actor.addFeat('Skill Focus');
  actor.addFeat('Educated');
  actor.addFeat('Great Fortitude');
  actor.addFeat('Lightning Reflexes');
  actor.addFeat('Thick Skin');
  actor.addFeat('Improved Defenses');

  let errors = [];
  try {
    actor.prepare();
  } catch (err) {
    errors.push(`Prepare error: ${err.message}`);
  }

  const mods = actor.getAllModifiers();

  // Validate expected modifier counts
  const skillMods = (mods['skill.acrobatics'] || []).length;
  const knowledgeMods = ((mods['skill.knowledge_core_worlds'] || []).length +
                         (mods['skill.knowledge_life_sciences'] || []).length);
  const fortMods = (mods['defense.fortitude'] || []).length;
  const reflexMods = (mods['defense.reflex'] || []).length;
  const willMods = (mods['defense.will'] || []).length;

  const allPass = errors.length === 0 &&
    skillMods === 1 &&
    knowledgeMods === 2 &&
    fortMods === 2 &&  // Great Fortitude (untyped) + Thick Skin (species)
    reflexMods === 2 &&  // Lightning Reflexes (untyped) + Improved Defenses (untyped)
    willMods === 1;    // Improved Defenses only

  logTest(
    'All 6 feats coexist without errors',
    errors.length === 0,
    errors.length ? errors[0] : 'OK'
  );

  logTest(
    'Skill modifiers injected correctly',
    skillMods === 1 && knowledgeMods === 2,
    `skills: ${skillMods}, knowledge: ${knowledgeMods}`
  );

  logTest(
    'Defense modifiers injected correctly',
    fortMods === 2 && reflexMods === 2 && willMods === 1,
    `fort: ${fortMods}, ref: ${reflexMods}, will: ${willMods}`
  );

  return allPass;
}

/**
 * TEST 9: Contract Validation
 * Validates that all 6 feats pass PassiveContractValidator
 */
async function test9_ContractValidation() {
  logSection('TEST 9: Contract Validation');

  const actor = createMockActor('Contract Validation Tester');
  const feats = [
    'Skill Focus',
    'Educated',
    'Great Fortitude',
    'Lightning Reflexes',
    'Thick Skin',
    'Improved Defenses'
  ];

  const results = {};
  for (const featName of feats) {
    const feat = actor.addFeat(featName);
    try {
      // This will fail if contract is violated
      PassiveAdapter.register(actor, feat);
      results[featName] = { passed: true, error: null };
    } catch (err) {
      results[featName] = { passed: false, error: err.message };
    }
  }

  const allPassed = Object.values(results).every(r => r.passed);

  for (const [featName, result] of Object.entries(results)) {
    logTest(
      `${featName} passes contract validation`,
      result.passed,
      result.passed ? 'OK' : result.error
    );
  }

  return allPassed;
}

/**
 * Run all tests
 */
async function runAllTests() {
  logSection('PHASE 1B: PASSIVE MODIFIER EXPANSION TEST SUITE');

  const results = [];
  results.push(await test1_SkillFocusRegistration());
  results.push(await test2_EducatedMultiSkill());
  results.push(await test3_DefenseBonus());
  results.push(await test4_MixedStackingTypes());
  results.push(await test5_MultiStatInjection());
  results.push(await test6_NoAccumulation());
  results.push(await test7_FeatRemovalCleanup());
  results.push(await test8_AllSixFeats());
  results.push(await test9_ContractValidation());

  // Summary
  logSection('TEST SUMMARY');
  log(`Passed: ${TEST_RESULTS.passed}`);
  log(`Failed: ${TEST_RESULTS.failed}`);
  log(`Total:  ${TEST_RESULTS.tests.length}`);

  if (TEST_RESULTS.failed === 0) {
    log('\n✓ ALL TESTS PASSED - Phase 1B Ready');
  } else {
    log('\n✗ SOME TESTS FAILED - Review needed');
  }

  return TEST_RESULTS.failed === 0;
}

// Export for test runner
export { runAllTests, TEST_RESULTS };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
