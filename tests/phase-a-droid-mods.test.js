/**
 * Phase A - Droid Modifications Validation Matrix (7 Tests)
 *
 * Tests the complete Phase A implementation:
 * - Hardpoint allocation validation
 * - Credit budget validation
 * - Modifier structure validation
 * - Prerequisite checks
 * - Conflict detection
 * - Modifier injection into pipeline
 * - Enabled flag respect
 */

import { TestUtils } from './test-utils.js';
import { DroidModValidator } from '../scripts/engine/droid-mod-validator.js';
import { ModifierEngine } from '../scripts/engines/effects/modifiers/ModifierEngine.js';
import { ModifierTypes } from '../scripts/engines/effects/modifiers/ModifierTypes.js';
import {
  DROID_MODIFICATION_EXAMPLES,
  DROID_HARDPOINT_ALLOCATION,
  createDroidModification,
  validateModificationInstall
} from '../scripts/data/droid-modifications.js';

describe('Phase A - Droid Modifications Validation Matrix', () => {

  // ========================================
  // TEST 1: Hardpoint Allocation Validation
  // ========================================
  describe('Test 1: Hardpoint Allocation Validation', () => {
    test('should respect hardpoint allocation by degree and size', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          createDroidModification('mod1', 'Mod 1', [], 1, 500),
          createDroidModification('mod2', 'Mod 2', [], 1, 500),
          createDroidModification('mod3', 'Mod 3', [], 1, 500)
        ],
        credits: { total: 5000, spent: 1500, remaining: 3500 }
      };

      const allocation = DROID_HARDPOINT_ALLOCATION['Third-Degree']['medium'];
      expect(allocation).toBe(3); // Third-Degree medium has 3 hardpoints

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(true);
    });

    test('should detect hardpoint overallocation', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          createDroidModification('mod1', 'Mod 1', [], 2, 500),
          createDroidModification('mod2', 'Mod 2', [], 2, 500)
        ],
        credits: { total: 5000, spent: 1000, remaining: 4000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Hardpoint'))).toBe(true);
    });

    test('should respect disabled modifications in hardpoint count', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          createDroidModification('mod1', 'Mod 1', [], 2, 500),
          Object.assign(createDroidModification('mod2', 'Mod 2', [], 2, 500), { enabled: false })
        ],
        credits: { total: 5000, spent: 500, remaining: 4500 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(true); // Only mod1 (2 hardpoints) counts
    });

    test('should provide correct allocation for all degrees and sizes', () => {
      const expectations = {
        'Third-Degree': { small: 2, medium: 3, large: 4 },
        'Second-Degree': { small: 3, medium: 4, large: 5 },
        'First-Degree': { small: 4, medium: 5, large: 6 }
      };

      for (const [degree, sizes] of Object.entries(expectations)) {
        for (const [size, expected] of Object.entries(sizes)) {
          const allocation = DROID_HARDPOINT_ALLOCATION[degree][size];
          expect(allocation).toBe(expected);
        }
      }
    });
  });

  // ========================================
  // TEST 2: Credit Budget Validation
  // ========================================
  describe('Test 2: Credit Budget Validation', () => {
    test('should enforce credit budget limits', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'medium',
        mods: [
          createDroidModification('mod1', 'Expensive Mod', [], 1, 3000)
        ],
        credits: { total: 2000, spent: 0, remaining: 2000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('budget'))).toBe(true);
    });

    test('should allow installation within budget', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'medium',
        mods: [
          createDroidModification('mod1', 'Affordable Mod', [], 1, 500)
        ],
        credits: { total: 2000, spent: 0, remaining: 2000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(true);
    });

    test('should detect negative credit remaining', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'medium',
        mods: [],
        credits: { total: 2000, spent: 2500, remaining: -500 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeded'))).toBe(true);
    });
  });

  // ========================================
  // TEST 3: Modifier Structure Validation
  // ========================================
  describe('Test 3: Modifier Structure Validation', () => {
    test('should validate modifier objects have required fields', () => {
      const mod = createDroidModification(
        'test-mod',
        'Test Modification',
        [
          { target: 'skill.attack', type: 'enhancement', value: 2 },
          { target: 'defense.reflex', type: 'competence', value: 1 }
        ],
        1,
        500
      );

      expect(mod.modifiers.length).toBe(2);
      for (const modifier of mod.modifiers) {
        expect(modifier).toHaveProperty('target');
        expect(modifier).toHaveProperty('type');
        expect(modifier).toHaveProperty('value');
      }
    });

    test('should accept valid modifier types', () => {
      const validTypes = ['untyped', 'competence', 'enhancement', 'circumstance', 'dodge', 'morale', 'insight', 'penalty'];

      for (const type of validTypes) {
        const mod = createDroidModification(
          `mod-${type}`,
          `Mod with ${type}`,
          [{ target: 'skill.test', type: type, value: 1 }],
          1,
          500
        );

        const result = DroidModValidator.validateDroidModifications({
          degree: 'Third-Degree',
          size: 'medium',
          mods: [mod],
          credits: { total: 5000, spent: 0, remaining: 5000 }
        });

        // Should not have errors about invalid type
        expect(result.errors.some(e => e.includes('unknown type'))).toBe(false);
      }
    });

    test('should detect invalid modifier values', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          createDroidModification(
            'bad-mod',
            'Bad Mod',
            [{ target: 'skill.test', type: 'untyped' }], // Missing value
            1,
            500
          )
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TEST 4: Prerequisite Validation
  // ========================================
  describe('Test 4: Prerequisite Validation', () => {
    test('should enforce minimum level prerequisite', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        level: 1,
        mods: [
          {
            id: 'high-level-mod',
            name: 'High Level Mod',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true,
            prerequisites: { minLevel: 5 }
          }
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.warnings.some(w => w.includes('Requires droid level'))).toBe(true);
    });

    test('should enforce degree prerequisite', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          {
            id: 'first-degree-mod',
            name: 'First Degree Only',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true,
            prerequisites: { minDegree: 'First-Degree' }
          }
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.warnings.some(w => w.includes('minimum degree'))).toBe(true);
    });

    test('should enforce size restriction', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'large',
        mods: [
          {
            id: 'small-only-mod',
            name: 'Small Droid Only',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true,
            prerequisites: { sizeRestriction: 'small' }
          }
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.errors.some(e => e.includes('Requires size'))).toBe(true);
    });
  });

  // ========================================
  // TEST 5: Conflict Detection
  // ========================================
  describe('Test 5: Conflict Detection', () => {
    test('should detect conflicting modifications', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'medium',
        mods: [
          {
            id: 'mod-a',
            name: 'Modification A',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true,
            prerequisites: { conflictsWith: ['mod-b'] }
          },
          {
            id: 'mod-b',
            name: 'Modification B',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true
          }
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.errors.some(e => e.includes('Conflicts'))).toBe(true);
    });

    test('should not detect conflicts if one modification is disabled', () => {
      const droidSystems = {
        degree: 'Second-Degree',
        size: 'medium',
        mods: [
          {
            id: 'mod-a',
            name: 'Modification A',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: true,
            prerequisites: { conflictsWith: ['mod-b'] }
          },
          {
            id: 'mod-b',
            name: 'Modification B',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 500,
            enabled: false
          }
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      expect(result.errors.some(e => e.includes('Conflicts'))).toBe(false);
    });
  });

  // ========================================
  // TEST 6: Modifier Injection into Pipeline
  // ========================================
  describe('Test 6: Modifier Injection into Pipeline', () => {
    test('should collect droid mod modifiers in getAllModifiers', async () => {
      const mockDroid = TestUtils.createMockActor('droid', {
        name: 'Test Droid',
        isDroid: true
      });

      mockDroid.system.droidSystems = {
        mods: [
          createDroidModification(
            'test-mod',
            'Test Droid Mod',
            [
              { target: 'skill.attack', type: 'enhancement', value: 2 },
              { target: 'hp.max', type: 'enhancement', value: 5 }
            ],
            1,
            500
          )
        ]
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockDroid);
      const droidModModifiers = allModifiers.filter(m => m.source === 'droidMod');

      expect(droidModModifiers.length).toBeGreaterThanOrEqual(2);
      expect(droidModModifiers.some(m => m.target === 'skill.attack')).toBe(true);
      expect(droidModModifiers.some(m => m.target === 'hp.max')).toBe(true);
    });

    test('should not collect droid mods for non-droid actors', async () => {
      const mockCharacter = TestUtils.createMockActor('character', {
        name: 'Test Character'
      });

      mockCharacter.system.droidSystems = {
        mods: [
          createDroidModification(
            'test-mod',
            'Test Mod',
            [{ target: 'skill.attack', type: 'enhancement', value: 2 }],
            1,
            500
          )
        ]
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockCharacter);
      const droidModModifiers = allModifiers.filter(m => m.source === 'droidMod');

      expect(droidModModifiers.length).toBe(0);
    });

    test('should skip disabled droid modifications', async () => {
      const mockDroid = TestUtils.createMockActor('droid');
      mockDroid.system.droidSystems = {
        mods: [
          Object.assign(
            createDroidModification(
              'enabled-mod',
              'Enabled Mod',
              [{ target: 'skill.attack', type: 'enhancement', value: 2 }],
              1,
              500
            ),
            { enabled: true }
          ),
          Object.assign(
            createDroidModification(
              'disabled-mod',
              'Disabled Mod',
              [{ target: 'skill.defense', type: 'enhancement', value: 3 }],
              1,
              500
            ),
            { enabled: false }
          )
        ]
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockDroid);
      const attackMods = allModifiers.filter(m => m.target === 'skill.attack');
      const defenseMods = allModifiers.filter(m => m.target === 'skill.defense');

      expect(attackMods.length).toBeGreaterThanOrEqual(1); // Enabled mod
      expect(defenseMods.length).toBe(0); // Disabled mod not collected
    });
  });

  // ========================================
  // TEST 7: Enabled Flag Respect
  // ========================================
  describe('Test 7: Enabled Flag Respect', () => {
    test('should respect enabled/disabled flag in aggregation', async () => {
      const mockDroid = TestUtils.createMockActor('droid');
      mockDroid.system.droidSystems = {
        mods: [
          Object.assign(
            createDroidModification(
              'mod1',
              'Strong Mod',
              [{ target: 'hp.max', type: 'enhancement', value: 10 }],
              1,
              500
            ),
            { enabled: true }
          ),
          Object.assign(
            createDroidModification(
              'mod2',
              'Weak Mod',
              [{ target: 'hp.max', type: 'enhancement', value: 20 }],
              1,
              500
            ),
            { enabled: false }
          )
        ]
      };

      const aggregated = await ModifierEngine.aggregateAll(mockDroid);
      const hpMod = aggregated['hp.max'] || 0;

      // Only enabled mod (10) should apply, not disabled mod (20)
      expect(hpMod).toBe(10);
    });

    test('should allow toggling enabled flag without validation errors', () => {
      const droidSystems = {
        degree: 'Third-Degree',
        size: 'medium',
        mods: [
          Object.assign(
            createDroidModification(
              'toggle-test-mod',
              'Toggle Test',
              [{ target: 'skill.test', type: 'enhancement', value: 2 }],
              1,
              500
            ),
            { enabled: false }
          )
        ],
        credits: { total: 5000, spent: 0, remaining: 5000 }
      };

      const result = DroidModValidator.validateDroidModifications(droidSystems);
      // Should be valid even with disabled mod
      expect(result.valid).toBe(true);

      // Toggle enabled
      droidSystems.mods[0].enabled = true;
      const resultAfter = DroidModValidator.validateDroidModifications(droidSystems);
      expect(resultAfter.valid).toBe(true);
    });
  });

});
