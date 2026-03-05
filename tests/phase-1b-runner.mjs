#!/usr/bin/env node
/**
 * Phase 1B Test Runner
 *
 * Standalone test executor for Phase 1B PASSIVE/MODIFIER expansion.
 * No Jest/Mocha dependencies - pure Node.js.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Mock implementations for Foundry systems
// ============================================

const ModifierType = {
  UNTYPED: 'untyped',
  COMPETENCE: 'competence',
  ENHANCEMENT: 'enhancement',
  MORALE: 'morale',
  INSIGHT: 'insight',
  CIRCUMSTANCE: 'circumstance',
  PENALTY: 'penalty',
  DODGE: 'dodge',
  SPECIES: 'species'
};

const ModifierSource = {
  CUSTOM: 'CUSTOM',
  ARMOR: 'ARMOR',
  ABILITY: 'ABILITY'
};

class MockModifierEngine {
  static getAllModifiers(actor) {
    if (!actor._passiveModifiers) return {};
    const all = {};
    for (const mods of Object.values(actor._passiveModifiers)) {
      if (Array.isArray(mods)) {
        for (const mod of mods) {
          if (!all[mod.target]) all[mod.target] = [];
          all[all.target].push(mod);
        }
      }
    }
    return all;
  }
}

// ============================================
// PHASE 1B Feat Definitions
// ============================================

const PHASE_1B_FEATS = {
  "Skill Focus": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "skill.acrobatics",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Skill Focus bonus"
        }
      ]
    }
  },

  "Educated": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "skill.knowledge_core_worlds",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Educated bonus (Knowledge: Core Worlds)"
        },
        {
          target: "skill.knowledge_life_sciences",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Educated bonus (Knowledge: Life Sciences)"
        }
      ]
    }
  },

  "Great Fortitude": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.fortitude",
          type: "untyped",
          value: 2,
          enabled: true,
          priority: 500,
          description: "Great Fortitude bonus"
        }
      ]
    }
  },

  "Lightning Reflexes": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.reflex",
          type: "untyped",
          value: 2,
          enabled: true,
          priority: 500,
          description: "Lightning Reflexes bonus"
        }
      ]
    }
  },

  "Thick Skin": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.fortitude",
          type: "species",
          value: 2,
          enabled: true,
          priority: 500,
          description: "Thick Skin bonus"
        }
      ]
    }
  },

  "Improved Defenses": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.reflex",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Reflex"
        },
        {
          target: "defense.fortitude",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Fortitude"
        },
        {
          target: "defense.will",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Will"
        }
      ]
    }
  }
};

// ============================================
// Passive Adapter Logic (simplified)
// ============================================

class SimplePassiveAdapter {
  static register(actor, ability) {
    if (ability.system.executionModel !== "PASSIVE") return;
    if (ability.system.subType !== "MODIFIER") {
      throw new Error(`Only MODIFIER subtype supported in Phase 1B`);
    }

    if (ability.system.grants) {
      throw new Error(`PASSIVE MODIFIER cannot have 'grants' field`);
    }

    const meta = ability.system.abilityMeta;
    if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
      throw new Error(`PASSIVE MODIFIER missing modifiers array`);
    }

    const canonical = [];
    for (const mod of meta.modifiers) {
      if (!mod.target) throw new Error("Modifier missing target");
      if (typeof mod.value !== 'number') throw new Error("Modifier value not numeric");

      canonical.push({
        id: `${ability.id}_${mod.target}`,
        source: ModifierSource.CUSTOM,
        sourceId: ability.id,
        sourceName: ability.name,
        target: mod.target,
        type: mod.type || 'untyped',
        value: mod.value,
        enabled: mod.enabled !== false,
        priority: mod.priority || 500,
        conditions: mod.conditions || [],
        description: mod.description || `${ability.name} modifier`
      });
    }

    if (!actor._passiveModifiers) {
      actor._passiveModifiers = {};
    }
    actor._passiveModifiers[ability.id] = canonical;
  }
}

// ============================================
// Test Framework
// ============================================

let testsPassed = 0;
let testsFailed = 0;

function log(msg) {
  console.log(msg);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const status = passed ? 'PASS' : 'FAIL';
  log(`${icon} ${status}: ${name}${details ? ` (${details})` : ''}`);
  if (passed) testsPassed++;
  else testsFailed++;
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`);
  log(`${title}`);
  log(`${'='.repeat(60)}\n`);
}

// ============================================
// Mock Actor Implementation
// ============================================

function createMockActor(name = 'Test Character') {
  const actor = {
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

    prepare() {
      // Reset collection
      this._passiveModifiers = {};
      // Register abilities
      for (const item of this.items) {
        if (item.type === 'feat' && item.system.executionModel === 'PASSIVE') {
          SimplePassiveAdapter.register(this, item);
        }
      }
    }
  };

  return actor;
}

// ============================================
// Test Suite
// ============================================

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

async function test6_NoAccumulation() {
  logSection('TEST 6: No Accumulation on Recompute');

  const actor = createMockActor('Accumulation Tester');
  actor.addFeat('Great Fortitude');

  actor.prepare();
  const mods1 = actor.getAllModifiers();
  const count1 = (mods1['defense.fortitude'] || []).length;

  actor.prepare();
  const mods2 = actor.getAllModifiers();
  const count2 = (mods2['defense.fortitude'] || []).length;

  actor.prepare();
  const mods3 = actor.getAllModifiers();
  const count3 = (mods3['defense.fortitude'] || []).length;

  const passed = count1 === 1 && count2 === 1 && count3 === 1;

  logTest(
    'Modifiers do not accumulate on repeated prepare',
    passed,
    passed ? `consistent: ${count1}` : `counts: ${count1}, ${count2}, ${count3}`
  );

  return passed;
}

async function test7_FeatRemovalCleanup() {
  logSection('TEST 7: Feat Removal Cleanup');

  const actor = createMockActor('Removal Tester');
  actor.addFeat('Great Fortitude');
  actor.prepare();

  const modsBefore = actor.getAllModifiers();
  const countBefore = (modsBefore['defense.fortitude'] || []).length;

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

  const skillMods = (mods['skill.acrobatics'] || []).length;
  const knowledgeMods = ((mods['skill.knowledge_core_worlds'] || []).length +
                         (mods['skill.knowledge_life_sciences'] || []).length);
  const fortMods = (mods['defense.fortitude'] || []).length;
  const reflexMods = (mods['defense.reflex'] || []).length;
  const willMods = (mods['defense.will'] || []).length;

  const allPass = errors.length === 0 &&
    skillMods === 1 &&
    knowledgeMods === 2 &&
    fortMods === 3 &&  // Great Fortitude (untyped) + Improved Defenses (untyped) + Thick Skin (species)
    reflexMods === 2 &&  // Lightning Reflexes (untyped) + Improved Defenses (untyped)
    willMods === 1;   // Improved Defenses only

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
    fortMods === 3 && reflexMods === 2 && willMods === 1,
    `fort: ${fortMods}, ref: ${reflexMods}, will: ${willMods}`
  );

  return allPass;
}

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
      SimplePassiveAdapter.register(actor, feat);
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

// ============================================
// Run All Tests
// ============================================

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

  logSection('TEST SUMMARY');
  log(`Passed: ${testsPassed}`);
  log(`Failed: ${testsFailed}`);
  log(`Total:  ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    log('\n✓ ALL TESTS PASSED - Phase 1B Ready\n');
    process.exit(0);
  } else {
    log('\n✗ SOME TESTS FAILED - Review needed\n');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
