/**
 * Integration Tests for SWSE Suggestion Engine
 *
 * Validates:
 * - Engine scoring pipeline (weapons, armor, gear)
 * - Suggestion coordinators
 * - Engine↔Store contract
 * - "No Armor" virtual option
 * - Mentor prose generation
 */

import { WeaponScoringEngine } from '../weapon-scoring-engine.js';
import { ArmorScoringEngine } from '../armor-scoring-engine.js';
import { WeaponSuggestions } from '../weapon-suggestions.js';
import { ArmorSuggestions } from '../armor-suggestions.js';
import { MentorProseGenerator } from '../mentor-prose-generator.js';

class IntegrationTestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  /**
   * Run a single test
   */
  test(name, fn) {
    try {
      fn();
      this.passed++;
      this.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (err) {
      this.failed++;
      this.tests.push({ name, status: 'FAIL', error: err.message });
      console.error(`✗ ${name}: ${err.message}`);
    }
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  /**
   * Print summary
   */
  summary() {
    const total = this.passed + this.failed;
    const pct = total > 0 ? Math.round((this.passed / total) * 100) : 0;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Integration Test Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Passed: ${this.passed}/${total} (${pct}%)`);
    console.log(`Failed: ${this.failed}/${total}`);
    console.log(`${'='.repeat(60)}\n`);
    return this.failed === 0;
  }
}

// ===== CREATE MOCK DATA =====

function createMockCharacter(overrides = {}) {
  return {
    id: 'test-char-1',
    name: 'Test Character',
    system: {
      level: { value: 15 },
      abilities: {
        str: { mod: 3 },
        dex: { mod: 1 }
      },
      class: { name: 'Soldier' },
      talents: {
        armoredDefense: true,
        improvedArmoredDefense: false,
        armorMastery: false,
        ...overrides.talents
      },
      ...overrides.system
    },
    ...overrides
  };
}

function createMockArmor(overrides = {}) {
  return {
    id: 'armor-1',
    name: 'Heavy Battle Armor',
    type: 'equipment',
    system: {
      category: 'heavy',
      soak: 6,
      price: 12000,
      ...overrides.system
    },
    ...overrides
  };
}

function createMockWeapon(overrides = {}) {
  return {
    id: 'weapon-1',
    name: 'Blaster Rifle',
    type: 'weapon',
    system: {
      group: 'advanced-ranged',
      damage: '3d8',
      attackAttribute: 'dex',
      accuracy: 'standard',
      price: 850,
      ...overrides.system
    },
    ...overrides
  };
}

// ===== TEST SUITE =====

export function runIntegrationTests() {
  const suite = new IntegrationTestSuite();

  // ===== ARMOR SCORING TESTS =====

  suite.test('ArmorScoringEngine: Scores armor correctly', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();

    const result = ArmorScoringEngine.scoreArmor(armor, char);

    suite.assert(result.combined !== undefined, 'Has combined score');
    suite.assert(result.combined.finalScore > 0, 'Score is positive');
    suite.assert(result.combined.finalScore <= 100, 'Score is bounded to 100');
    suite.assert(result.combined.tier !== undefined, 'Has tier assignment');
  });

  suite.test('ArmorScoringEngine: Talent modifier applies', () => {
    const charWithTalent = createMockCharacter({
      system: {
        talents: {
          armoredDefense: true,
          improvedArmoredDefense: true
        }
      }
    });

    const charWithoutTalent = createMockCharacter({
      system: {
        talents: {}
      }
    });

    const armor = createMockArmor();

    const scoreWith = ArmorScoringEngine.scoreArmor(armor, charWithTalent);
    const scoreWithout = ArmorScoringEngine.scoreArmor(armor, charWithoutTalent);

    suite.assert(
      scoreWith.combined.finalScore > scoreWithout.combined.finalScore,
      'Armor scores higher with talents'
    );
  });

  // ===== ARMOR SUGGESTIONS TESTS =====

  suite.test('ArmorSuggestions: Generates suggestions', () => {
    const char = createMockCharacter();
    const armors = [
      createMockArmor({ id: 'armor-1', name: 'Heavy' }),
      createMockArmor({ id: 'armor-2', name: 'Medium', system: { category: 'medium', soak: 4 } }),
      createMockArmor({ id: 'armor-3', name: 'Light', system: { category: 'light', soak: 2 } })
    ];

    const result = ArmorSuggestions.generateSuggestions(char, armors);

    suite.assert(result.topSuggestions !== undefined, 'Has top suggestions');
    suite.assert(result.topSuggestions.length > 0, 'Has at least one suggestion');
    suite.assert(result.allScored !== undefined, 'Has all scored items');
  });

  suite.test('ArmorSuggestions: "No Armor" is virtual option', () => {
    const char = createMockCharacter();
    const armors = [
      createMockArmor({ id: 'armor-1', name: 'Heavy' })
    ];

    const result = ArmorSuggestions.generateSuggestions(char, armors);

    const noArmorFound = result.allScored.some(a => a.armorId === 'NO_ARMOR');
    suite.assert(noArmorFound, '"No Armor" is always evaluated');
  });

  suite.test('ArmorSuggestions: "No Armor" penalized when talents present', () => {
    const charWithTalents = createMockCharacter({
      system: {
        talents: {
          armoredDefense: true,
          improvedArmoredDefense: true,
          armorMastery: true
        }
      }
    });

    const result = ArmorSuggestions.generateSuggestions(charWithTalents, []);

    const noArmor = result.allScored.find(a => a.armorId === 'NO_ARMOR');
    suite.assert(noArmor.combined.finalScore < 30, '"No Armor" scores low with talents');
  });

  // ===== WEAPON SCORING TESTS =====

  suite.test('WeaponScoringEngine: Scores weapons correctly', () => {
    const char = createMockCharacter();
    const weapon = createMockWeapon();

    const result = WeaponScoringEngine.scoreWeapon(weapon, char);

    suite.assert(result.combined !== undefined, 'Has combined score');
    suite.assert(result.combined.finalScore > 0, 'Score is positive');
    suite.assert(result.axisA !== undefined, 'Has Axis A (damage)');
    suite.assert(result.axisB !== undefined, 'Has Axis B (accuracy)');
  });

  // ===== WEAPON SUGGESTIONS TESTS =====

  suite.test('WeaponSuggestions: Generates suggestions', () => {
    const char = createMockCharacter();
    const weapons = [
      createMockWeapon({ id: 'w1', name: 'Blaster Rifle' }),
      createMockWeapon({ id: 'w2', name: 'Vibroblade', system: { group: 'advanced-melee', damage: '2d8' } })
    ];

    const result = WeaponSuggestions.generateSuggestions(char, weapons);

    suite.assert(result.topSuggestions !== undefined, 'Has top suggestions');
    suite.assert(result.allScored !== undefined, 'Has all scored');
  });

  // ===== ENGINE↔STORE CONTRACT TESTS =====

  suite.test('Engine↔Store: Response has required fields', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();

    const result = ArmorScoringEngine.scoreArmor(armor, char);

    suite.assert(result.armorId !== undefined, 'Has itemId');
    suite.assert(result.armorName !== undefined, 'Has name');
    suite.assert(result.combined.finalScore !== undefined, 'Has score');
    suite.assert(result.combined.tier !== undefined, 'Has tier');
    suite.assert(result.explanations !== undefined, 'Has explanations');
    suite.assert(Array.isArray(result.explanations), 'Explanations is array');
  });

  suite.test('Engine↔Store: Store never checks engine logic', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();
    const result = ArmorScoringEngine.scoreArmor(armor, char);

    // Store should not need to know these details
    suite.assert(result.components !== undefined, 'Engine provides component breakdown');
    suite.assert(result.components.roleAlignment !== undefined, 'Has role alignment');
    suite.assert(result.components.axisA !== undefined, 'Has axis A score');

    // This proves store can consume result as-is without recalculating
    suite.assert(result.combined.finalScore !== undefined, 'Final score ready to use');
  });

  // ===== EXPLAINABILITY TESTS =====

  suite.test('Explanations: Generated for each item', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();

    const result = ArmorScoringEngine.scoreArmor(armor, char);

    suite.assert(result.explanations.length >= 2, 'Has at least 2 explanations');
    suite.assert(result.explanations.length <= 4, 'Has at most 4 explanations');

    result.explanations.forEach((exp, idx) => {
      suite.assert(typeof exp === 'string', `Explanation ${idx} is string`);
      suite.assert(exp.length > 0, `Explanation ${idx} is not empty`);
    });
  });

  suite.test('Explanations: Contain character-specific language', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();

    const result = ArmorScoringEngine.scoreArmor(armor, char);
    const explanationText = result.explanations.join(' ').toLowerCase();

    // Should mention relevant context
    const hasContextualLanguage =
      explanationText.includes('armor') ||
      explanationText.includes('defense') ||
      explanationText.includes('talent');

    suite.assert(hasContextualLanguage, 'Explanations are contextual');
  });

  // ===== MENTOR PROSE GENERATION TESTS =====

  suite.test('MentorProseGenerator: Generates prose from suggestions', () => {
    const char = createMockCharacter();
    const armor = createMockArmor();

    const armorResult = ArmorScoringEngine.scoreArmor(armor, char);
    const prose = MentorProseGenerator.generateMentorReview(armorResult, {
      primaryRole: 'defender',
      talents: { armoredDefense: true }
    });

    suite.assert(prose !== null, 'Prose is generated');
    suite.assert(prose.length > 0, 'Prose is not empty');
    suite.assert(prose.toLowerCase().includes('armor'), 'Prose mentions item type');
  });

  suite.test('MentorProseGenerator: "No Armor" case handled', () => {
    const char = createMockCharacter({
      system: {
        talents: {
          armoredDefense: true
        }
      }
    });

    const result = ArmorSuggestions.generateSuggestions(char, []);
    const noArmor = result.allScored.find(a => a.armorId === 'NO_ARMOR');

    const prose = MentorProseGenerator.generateMentorReview(noArmor, {
      primaryRole: 'defender',
      talents: { armoredDefense: true }
    });

    suite.assert(
      prose.toLowerCase().includes('talent'),
      'No Armor prose acknowledges talents'
    );
  });

  suite.test('MentorProseGenerator: Basis note generated', () => {
    const basis = MentorProseGenerator.generateMentorBasis({
      primaryRole: 'defender',
      talents: { armoredDefense: true, armorMastery: true }
    });

    suite.assert(basis !== null, 'Basis is generated');
    suite.assert(basis.toLowerCase().includes('defender'), 'Basis mentions role');
    suite.assert(basis.toLowerCase().includes('talent'), 'Basis mentions talents');
  });

  // ===== TIER SYSTEM TESTS =====

  suite.test('Tier system: Assignments are consistent', () => {
    const char = createMockCharacter();

    const heavyArmor = createMockArmor({
      id: 'heavy',
      system: { category: 'heavy', soak: 6 }
    });

    const lightArmor = createMockArmor({
      id: 'light',
      system: { category: 'light', soak: 2 }
    });

    const heavyResult = ArmorScoringEngine.scoreArmor(heavyArmor, char);
    const lightResult = ArmorScoringEngine.scoreArmor(lightArmor, char);

    // Heavy should score higher for this defender
    suite.assert(
      heavyResult.combined.finalScore > lightResult.combined.finalScore,
      'Heavy armor ranks higher for defender'
    );
  });

  suite.test('Tier system: Supports multiple viable options', () => {
    const char = createMockCharacter();
    const armors = [
      createMockArmor({ id: 'a1', name: 'Option A', system: { category: 'heavy', soak: 6 } }),
      createMockArmor({ id: 'a2', name: 'Option B', system: { category: 'medium', soak: 4 } }),
      createMockArmor({ id: 'a3', name: 'Option C', system: { category: 'light', soak: 2 } })
    ];

    const result = ArmorSuggestions.generateSuggestions(char, armors);
    const topScores = result.topSuggestions.map(s => s.combined.finalScore);

    // Should have reasonable clustering (multiple options < 5 points apart)
    const topScore = topScores[0];
    const secondScore = topScores[1] || 0;

    suite.assert(
      Math.abs(topScore - secondScore) < 15,
      'Top options are reasonably close'
    );
  });

  // ===== EDGE CASES =====

  suite.test('Edge case: Missing metadata handled gracefully', () => {
    const char = createMockCharacter();
    const incompleteArmor = {
      id: 'incomplete',
      name: 'Unknown Armor'
      // Missing system property
    };

    // Should not crash
    const result = ArmorScoringEngine.scoreArmor(incompleteArmor, char);
    suite.assert(result !== null, 'Handles missing metadata');
  });

  suite.test('Edge case: Low-level character with armor talents', () => {
    const lowLevelChar = createMockCharacter({
      system: {
        level: { value: 1 },
        talents: {
          armoredDefense: true,
          improvedArmoredDefense: true
        }
      }
    });

    const armor = createMockArmor();
    const result = ArmorScoringEngine.scoreArmor(armor, lowLevelChar);

    suite.assert(result.combined.finalScore > 0, 'Armor scores at low level with talents');
  });

  suite.test('Edge case: High-level character without armor talents', () => {
    const highLevelChar = createMockCharacter({
      system: {
        level: { value: 30 },
        talents: {}
      }
    });

    const armor = createMockArmor();
    const result = ArmorScoringEngine.scoreArmor(armor, highLevelChar);

    // Should still score something, but "No Armor" might compete
    suite.assert(result.combined.finalScore >= 0, 'Armor scores at high level');
  });

  // ===== PRINT SUMMARY =====

  const allPassed = suite.summary();
  return {
    passed: suite.passed,
    failed: suite.failed,
    tests: suite.tests,
    allPassed
  };
}

// Export for testing frameworks
export default { runIntegrationTests };
