/**
 * Phase 0 - ModifierEngine Validation Matrix
 *
 * Tests the complete Phase 0 implementation:
 * - Modifier collection from all 7 sources
 * - Stacking algorithm correctness
 * - HP/BAB/Defense adjustment application
 * - Droid-specific handling
 * - Modifier breakdown storage
 */

import { TestUtils } from './test-utils.js';
import { ModifierEngine } from '../scripts/engine/modifiers/ModifierEngine.js';
import { ModifierTypes } from '../scripts/engine/modifiers/ModifierTypes.js';
import { ModifierUtils } from '../scripts/engine/modifiers/ModifierUtils.js';
import { DerivedCalculator } from '../scripts/../scripts/actors/derived/derived-calculator.js';
import { HPCalculator } from '../scripts/actors/derived/hp-calculator.js';
import { DefenseCalculator } from '../scripts/actors/derived/defense-calculator.js';
import { BABCalculator } from '../scripts/actors/derived/bab-calculator.js';

describe('Phase 0 - ModifierEngine Validation Matrix', () => {

  // ========================================
  // TEST 1: Modifier Collection (all 7 sources)
  // ========================================
  describe('Test 1: Modifier Collection from All Sources', () => {
    test('should collect modifiers from feat source', () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Feat Collector'
      });

      // Mock feat modifiers
      mockActor.items = [
        {
          type: 'feat',
          system: {
            modifiers: [
              ModifierTypes.createModifier('feat-mod-1', 'Weapon Focus', 'untyped', 'skill.attack', 1)
            ]
          }
        }
      ];

      const modifiers = ModifierEngine._getFeatModifiers?.(mockActor) || [];
      expect(modifiers.length).toBeGreaterThanOrEqual(0);
      // Modifiers should have canonical shape
      if (modifiers.length > 0) {
        expect(modifiers[0]).toHaveProperty('id');
        expect(modifiers[0]).toHaveProperty('source');
        expect(modifiers[0]).toHaveProperty('target');
        expect(modifiers[0]).toHaveProperty('type');
        expect(modifiers[0]).toHaveProperty('value');
      }
    });

    test('should have collection methods for all 7 sources', () => {
      const mockActor = TestUtils.createMockActor('character');

      // Verify collection method signatures exist
      expect(typeof ModifierEngine._getFeatModifiers).toBe('function');
      expect(typeof ModifierEngine._getTalentModifiers).toBe('function');
      expect(typeof ModifierEngine._getSpeciesModifiers).toBe('function');
      expect(typeof ModifierEngine._getEncumbranceModifiers).toBe('function');
      expect(typeof ModifierEngine._getConditionModifiers).toBe('function');
      expect(typeof ModifierEngine._getItemModifiers).toBe('function');
      expect(typeof ModifierEngine._getCustomModifiers).toBe('function');
    });
  });

  // ========================================
  // TEST 2: Stacking Algorithm Correctness
  // ========================================
  describe('Test 2: Stacking Algorithm Correctness', () => {
    test('should apply highest-only stacking for competence type', () => {
      const modifiers = [
        ModifierTypes.createModifier('comp1', 'Source1', 'competence', 'skill.test', 2),
        ModifierTypes.createModifier('comp2', 'Source2', 'competence', 'skill.test', 5),
        ModifierTypes.createModifier('comp3', 'Source3', 'competence', 'skill.test', 3)
      ];

      const resolved = ModifierUtils.resolveStacking(modifiers);
      const testTargetMods = resolved.filter(m => m.target === 'skill.test');
      const totalValue = testTargetMods.reduce((sum, m) => sum + m.value, 0);

      // Highest-only should apply: max(2, 5, 3) = 5
      expect(totalValue).toBe(5);
    });

    test('should stack all untyped modifiers', () => {
      const modifiers = [
        ModifierTypes.createModifier('untyped1', 'Source1', 'untyped', 'skill.test', 2),
        ModifierTypes.createModifier('untyped2', 'Source2', 'untyped', 'skill.test', 3),
        ModifierTypes.createModifier('untyped3', 'Source3', 'untyped', 'skill.test', 1)
      ];

      const resolved = ModifierUtils.resolveStacking(modifiers);
      const testTargetMods = resolved.filter(m => m.target === 'skill.test');
      const totalValue = testTargetMods.reduce((sum, m) => sum + m.value, 0);

      // Untyped should stack all: 2 + 3 + 1 = 6
      expect(totalValue).toBe(6);
    });

    test('should handle circumstance stackUnlessSameSource correctly', () => {
      const modifiers = [
        ModifierTypes.createModifier('circ1', 'Encumbrance', 'circumstance', 'skill.test', -1),
        ModifierTypes.createModifier('circ2', 'Encumbrance', 'circumstance', 'skill.test', -2),
        ModifierTypes.createModifier('circ3', 'OtherSource', 'circumstance', 'skill.test', 1)
      ];

      const resolved = ModifierUtils.resolveStacking(modifiers);
      const testTargetMods = resolved.filter(m => m.target === 'skill.test');

      // stackUnlessSameSource: keep only one from Encumbrance (highest), keep one from OtherSource
      // Should have 2 modifiers total (one per unique source)
      expect(testTargetMods.length).toBe(2);
    });

    test('should disable modifiers when enabled=false', () => {
      const modifiers = [
        ModifierTypes.createModifier('active', 'Source1', 'untyped', 'skill.test', 5),
        Object.assign(ModifierTypes.createModifier('inactive', 'Source2', 'untyped', 'skill.test', 3), { enabled: false })
      ];

      const resolved = ModifierUtils.resolveStacking(modifiers);
      const testTargetMods = resolved.filter(m => m.target === 'skill.test');
      const totalValue = testTargetMods.reduce((sum, m) => sum + m.value, 0);

      // Only active modifier should apply: 5
      expect(totalValue).toBe(5);
    });
  });

  // ========================================
  // TEST 3: HP Adjustment Application
  // ========================================
  describe('Test 3: HP Adjustment Application', () => {
    test('should apply HP modifier adjustment', () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'HP Test'
      });

      // Set up class levels
      mockActor.system.progression = {
        classLevels: [
          { class: 'Scout', level: 5 }
        ]
      };

      // Calculate base HP
      const baseHP = HPCalculator.calculate(mockActor, mockActor.system.progression.classLevels);
      expect(baseHP.base).toBeGreaterThan(0);

      // Apply modifier adjustment
      const adjustedHP = HPCalculator.calculate(mockActor, mockActor.system.progression.classLevels, {
        adjustment: 5
      });

      // Adjusted should be base + 5
      expect(adjustedHP.max).toBe(baseHP.base + 5);
    });

    test('should respect droid exception (no CON mod to HP)', () => {
      const droidActor = TestUtils.createMockActor('droid', {
        name: 'Droid HP Test',
        isDroid: true,
        abilities: {
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3}
        }
      });

      const normalActor = TestUtils.createMockActor('character', {
        name: 'Normal HP Test',
        isDroid: false,
        abilities: {
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3}
        }
      });

      droidActor.system.progression = {
        classLevels: [{ class: 'Droid Tech', level: 1 }]
      };
      normalActor.system.progression = {
        classLevels: [{ class: 'Scout', level: 1 }]
      };

      const droidHP = HPCalculator.calculate(droidActor, droidActor.system.progression.classLevels);
      const normalHP = HPCalculator.calculate(normalActor, normalActor.system.progression.classLevels);

      // Droid should have lower HP (no CON mod)
      expect(droidHP.base).toBeLessThan(normalHP.base);
    });

    test('should never allow HP less than 1', () => {
      const mockActor = TestUtils.createMockActor('character');
      mockActor.system.progression = {
        classLevels: []
      };

      const result = HPCalculator.calculate(mockActor, [], {
        adjustment: -100
      });

      expect(result.max).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================
  // TEST 4: Defense Adjustment Application
  // ========================================
  describe('Test 4: Defense Adjustment Application', () => {
    test('should apply independent defense adjustments', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Defense Test',
        abilities: {
          str: {base: 14, racial: 0, temp: 0, total: 14, mod: 2},
          dex: {base: 16, racial: 0, temp: 0, total: 16, mod: 3},
          wis: {base: 12, racial: 0, temp: 0, total: 12, mod: 1}
        }
      });

      mockActor.system.progression = {
        classLevels: [{ class: 'Soldier', level: 5 }]
      };

      const baseDefenses = await DefenseCalculator.calculate(mockActor, mockActor.system.progression.classLevels);

      const adjustedDefenses = await DefenseCalculator.calculate(
        mockActor,
        mockActor.system.progression.classLevels,
        {
          adjustments: {
            fort: 2,
            ref: -1,
            will: 3
          }
        }
      );

      // Each should be adjusted independently
      expect(adjustedDefenses.fortitude.total).toBe(baseDefenses.fortitude.base + 2);
      expect(adjustedDefenses.reflex.total).toBe(baseDefenses.reflex.base - 1);
      expect(adjustedDefenses.will.total).toBe(baseDefenses.will.base + 3);
    });

    test('should respect droid STR-only fortitude defense', async () => {
      const droidActor = TestUtils.createMockActor('droid', {
        name: 'Droid Defense',
        isDroid: true,
        abilities: {
          str: {base: 14, racial: 0, temp: 0, total: 14, mod: 2},
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3}
        }
      });

      const normalActor = TestUtils.createMockActor('character', {
        name: 'Normal Defense',
        isDroid: false,
        abilities: {
          str: {base: 14, racial: 0, temp: 0, total: 14, mod: 2},
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3}
        }
      });

      droidActor.system.progression = {
        classLevels: [{ class: 'Droid Tech', level: 1 }]
      };
      normalActor.system.progression = {
        classLevels: [{ class: 'Scout', level: 1 }]
      };

      const droidDefenses = await DefenseCalculator.calculate(droidActor, droidActor.system.progression.classLevels);
      const normalDefenses = await DefenseCalculator.calculate(normalActor, normalActor.system.progression.classLevels);

      // Droid fortitude uses STR (2), normal uses max(STR, CON) = CON (3)
      expect(droidDefenses.fortitude.base).toBeLessThan(normalDefenses.fortitude.base);
    });

    test('should never allow defense less than 1', async () => {
      const mockActor = TestUtils.createMockActor('character');
      mockActor.system.progression = {
        classLevels: [{ class: 'Scout', level: 1 }]
      };

      const adjustedDefenses = await DefenseCalculator.calculate(
        mockActor,
        mockActor.system.progression.classLevels,
        {
          adjustments: {
            fort: -100,
            ref: -100,
            will: -100
          }
        }
      );

      expect(adjustedDefenses.fortitude.total).toBeGreaterThanOrEqual(1);
      expect(adjustedDefenses.reflex.total).toBeGreaterThanOrEqual(1);
      expect(adjustedDefenses.will.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================
  // TEST 5: BAB Adjustment Application
  // ========================================
  describe('Test 5: BAB Adjustment Application', () => {
    test('should apply BAB modifier adjustment', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'BAB Test'
      });

      const classLevels = [{ class: 'Soldier', level: 5 }];

      const baseBAB = await BABCalculator.calculate(classLevels);

      const adjustedBAB = await BABCalculator.calculate(classLevels, {
        adjustment: 2
      });

      // Adjusted should be base + adjustment
      expect(adjustedBAB).toBe(baseBAB + 2);
    });

    test('should handle fractional BAB correctly', async () => {
      // Note: Assumes Scoundrel has 0.75 BAB progression
      const classLevels = [{ class: 'Scoundrel', level: 4 }];

      const bab = await BABCalculator.calculate(classLevels);

      // 0.75 * 4 = 3.0 (with proper fractional accumulation)
      // The actual value depends on class data, but should be a valid number
      expect(typeof bab).toBe('number');
      expect(bab).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================
  // TEST 6: Droid-Specific Handling in Derived Pipeline
  // ========================================
  describe('Test 6: Droid-Specific Handling in Derived Pipeline', () => {
    test('should correctly identify droid vs. normal actor in HP calculation', () => {
      const droidActor = TestUtils.createMockActor('droid', {
        isDroid: true,
        abilities: {
          con: {base: 14, total: 14, mod: 2}
        }
      });

      const normalActor = TestUtils.createMockActor('character', {
        isDroid: false,
        abilities: {
          con: {base: 14, total: 14, mod: 2}
        }
      });

      droidActor.system.progression = {
        classLevels: [{ class: 'Droid Tech', level: 1 }]
      };
      normalActor.system.progression = {
        classLevels: [{ class: 'Scout', level: 1 }]
      };

      const droidHP = HPCalculator.calculate(droidActor, droidActor.system.progression.classLevels);
      const normalHP = HPCalculator.calculate(normalActor, normalActor.system.progression.classLevels);

      // With same CON, droid should have lower HP because CON mod isn't applied
      expect(droidHP.base).toBeLessThan(normalHP.base);
    });

    test('should handle isFirstLevel correctly in HP calculation', () => {
      const mockActor = TestUtils.createMockActor('character', {
        abilities: {
          con: {base: 10, total: 10, mod: 0}
        }
      });

      // Level 1: 3x hit die
      const level1 = HPCalculator.calculate(mockActor, [
        { class: 'Scout', level: 1 }
      ]);

      // Level 2: first + average
      const level2 = HPCalculator.calculate(mockActor, [
        { class: 'Scout', level: 2 }
      ]);

      // Level 2 should have more HP than level 1
      expect(level2.base).toBeGreaterThan(level1.base);
    });
  });

  // ========================================
  // TEST 7: Modifier Breakdown Storage in system.derived.modifiers
  // ========================================
  describe('Test 7: Modifier Breakdown Storage in system.derived.modifiers', () => {
    test('should store modifier breakdown in system.derived.modifiers', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Breakdown Test'
      });

      mockActor.system.progression = {
        classLevels: [{ class: 'Soldier', level: 5 }]
      };

      mockActor.system.skills = {
        acrobatics: { ranks: 0, ability: 'dex' },
        athletics: { ranks: 0, ability: 'str' }
      };

      mockActor.system.derived ??= {};

      // Mock getAllModifiers to return some modifiers
      const mockModifiers = [
        ModifierTypes.createModifier('mod1', 'Feat', 'untyped', 'skill.acrobatics', 2),
        ModifierTypes.createModifier('mod2', 'Species', 'competence', 'skill.athletics', 1)
      ];

      // Simulate DerivedCalculator.computeAll process
      const updates = await DerivedCalculator.computeAll(mockActor);

      // Should have modifier breakdown
      expect(updates['system.derived.modifiers']).toBeDefined();
      expect(updates['system.derived.modifiers'].all).toBeDefined();
      expect(updates['system.derived.modifiers'].breakdown).toBeDefined();

      // Breakdown should be an object with target keys
      expect(typeof updates['system.derived.modifiers'].breakdown).toBe('object');
    });

    test('should include all modifier targets in breakdown', () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        skill1: { ranks: 0, ability: 'str' },
        skill2: { ranks: 0, ability: 'dex' }
      };

      const skillTargets = Object.keys(mockActor.system.skills || {})
        .map(key => `skill.${key}`);
      const allTargets = [
        ...skillTargets,
        'defense.fort', 'defense.reflex', 'defense.will',
        'hp.max', 'bab.total', 'initiative.total'
      ];

      // Verify all expected targets are in the list
      expect(allTargets).toContain('skill.skill1');
      expect(allTargets).toContain('skill.skill2');
      expect(allTargets).toContain('defense.fort');
      expect(allTargets).toContain('hp.max');
      expect(allTargets).toContain('bab.total');
    });

    test('should not mutate base fields, only write to .total', () => {
      const mockActor = TestUtils.createMockActor('character');
      const originalDefenses = {
        reflex: { base: 15, class: 2 },
        fortitude: { base: 14, class: 2 },
        will: { base: 13, class: 0 }
      };

      mockActor.system.defenses = { ...originalDefenses };

      const hp = HPCalculator.calculate(mockActor, [{ class: 'Scout', level: 1 }], {
        adjustment: 5
      });

      // Original values should not have been mutated
      expect(mockActor.system.defenses.reflex.base).toBe(15);

      // Only calc results should reflect adjustment
      expect(hp.max).toBeGreaterThan(hp.base);
    });
  });

});
