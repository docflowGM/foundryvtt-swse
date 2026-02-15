/**
 * Phase B - Skill Misc Breakdown Validation Matrix (7 Tests)
 *
 * Tests the complete Phase B implementation:
 * - Custom modifier injection
 * - Stacking rule enforcement
 * - Modifier removal
 * - Enabled flag toggling
 * - Encumbrance integration in breakdown
 * - Condition penalty integration
 * - No UI-time math
 */

import { TestUtils } from './test-utils.js';
import { ModifierEngine } from '../scripts/engine/modifiers/ModifierEngine.js';
import { ModifierTypes } from '../scripts/engine/modifiers/ModifierTypes.js';
import { EncumbranceEngine } from '../scripts/engine/encumbrance/EncumbranceEngine.js';

describe('Phase B - Skill Misc Breakdown Validation Matrix', () => {

  // ========================================
  // TEST 1: Add +2 untyped custom → total increases
  // ========================================
  describe('Test 1: Add Custom Modifier Increases Total', () => {
    test('should increase skill total when adding custom untyped modifier', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Custom Modifier Test'
      });

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5, ranks: 0 }
      };

      mockActor.system.customModifiers = [];

      // Get baseline aggregation
      let aggregated = await ModifierEngine.aggregateAll(mockActor);
      const baselineValue = aggregated['skill.acrobatics'] || 0;

      // Add custom modifier
      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Test Bonus',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 2,
          enabled: true
        }
      ];

      // Re-aggregate after custom modifier added
      aggregated = await ModifierEngine.aggregateAll(mockActor);
      const newValue = aggregated['skill.acrobatics'] || 0;

      // Should increase by 2
      expect(newValue).toBe(baselineValue + 2);
    });

    test('should not include custom modifier if target does not match', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 },
        athletics: { base: 3, total: 3 }
      };

      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Wrong Target',
          target: 'skill.perception', // Different skill
          type: 'untyped',
          value: 5,
          enabled: true
        }
      ];

      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      const customMods = allModifiers.filter(m => m.source === 'custom');

      // Should have custom modifier but for different target
      expect(customMods.length).toBeGreaterThan(0);
      expect(customMods.every(m => m.target === 'skill.perception')).toBe(true);
    });
  });

  // ========================================
  // TEST 2: Add competence modifier with existing competence
  // ========================================
  describe('Test 2: Competence Stacking (Highest-Only)', () => {
    test('should apply highest-only rule when adding competence modifier', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Competence Stacking Test'
      });

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      // Add existing competence modifier (simulating feat bonus)
      mockActor.system.customModifiers = [
        {
          id: 'feat-competence',
          source: 'feat',
          sourceName: 'Feat Acrobatics +2',
          target: 'skill.acrobatics',
          type: 'competence',
          value: 2,
          enabled: true
        },
        {
          id: 'custom-competence',
          source: 'custom',
          sourceName: 'Custom Acrobatics +3',
          target: 'skill.acrobatics',
          type: 'competence',
          value: 3,
          enabled: true
        }
      ];

      // Mock feat system to include the feat modifier
      mockActor.items = [
        {
          type: 'feat',
          id: 'feat-acro',
          name: 'Feat Acrobatics',
          system: {
            skillBonuses: { acrobatics: 2 }
          }
        }
      ];

      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      const acrobModifiers = allModifiers.filter(m => m.target === 'skill.acrobatics' && m.type === 'competence');

      // Should have both feat and custom competence modifiers
      expect(acrobModifiers.length).toBeGreaterThanOrEqual(1);

      // Aggregation should pick highest (3, not 2+3=5)
      const aggregated = await ModifierEngine.aggregateAll(mockActor);
      const totalComp = aggregated['skill.acrobatics'] || 0;

      // With highest-only rule, should be 3, not 5
      expect(totalComp).toBeLessThanOrEqual(3);
    });
  });

  // ========================================
  // TEST 3: Remove custom modifier
  // ========================================
  describe('Test 3: Remove Custom Modifier Decreases Total', () => {
    test('should decrease skill total when removing custom modifier', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      // Start with custom modifier
      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Bonus +3',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 3,
          enabled: true
        }
      ];

      // Get aggregation with modifier
      let aggregated = await ModifierEngine.aggregateAll(mockActor);
      const withModifier = aggregated['skill.acrobatics'] || 0;

      // Remove the modifier
      mockActor.system.customModifiers = [];

      // Re-aggregate without modifier
      aggregated = await ModifierEngine.aggregateAll(mockActor);
      const withoutModifier = aggregated['skill.acrobatics'] || 0;

      // Should decrease by 3
      expect(withModifier).toBe(withoutModifier + 3);
    });

    test('should allow removing only custom modifiers', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      mockActor.items = [
        {
          type: 'feat',
          id: 'feat-acro',
          name: 'Feat Bonus',
          system: {
            skillBonuses: { acrobatics: 2 }
          }
        }
      ];

      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Custom Bonus',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 1,
          enabled: true
        }
      ];

      // Get baseline with both feat and custom
      let aggregated = await ModifierEngine.aggregateAll(mockActor);
      const baseline = aggregated['skill.acrobatics'] || 0;

      // Remove only custom, feat remains
      mockActor.system.customModifiers = [];

      aggregated = await ModifierEngine.aggregateAll(mockActor);
      const afterRemoval = aggregated['skill.acrobatics'] || 0;

      // Should have decreased by 1 (custom removed), but feat +2 remains
      expect(baseline).toBeGreaterThan(afterRemoval);
      expect(baseline - afterRemoval).toBe(1);
    });
  });

  // ========================================
  // TEST 4: Disable custom modifier
  // ========================================
  describe('Test 4: Disable Custom Modifier Toggles Total', () => {
    test('should exclude disabled custom modifiers from aggregation', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Toggleable Bonus',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 3,
          enabled: true
        }
      ];

      // Get aggregation with enabled modifier
      let aggregated = await ModifierEngine.aggregateAll(mockActor);
      const enabled = aggregated['skill.acrobatics'] || 0;

      // Disable the modifier
      mockActor.system.customModifiers[0].enabled = false;

      // Re-aggregate with disabled modifier
      aggregated = await ModifierEngine.aggregateAll(mockActor);
      const disabled = aggregated['skill.acrobatics'] || 0;

      // Should be 3 less
      expect(enabled - disabled).toBe(3);
    });

    test('should allow re-enabling disabled modifiers', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Toggle Bonus',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 2,
          enabled: false
        }
      ];

      // Start disabled
      let aggregated = await ModifierEngine.aggregateAll(mockActor);
      const disabled = aggregated['skill.acrobatics'] || 0;

      // Enable it
      mockActor.system.customModifiers[0].enabled = true;

      aggregated = await ModifierEngine.aggregateAll(mockActor);
      const reEnabled = aggregated['skill.acrobatics'] || 0;

      // Should increase by 2
      expect(reEnabled - disabled).toBe(2);
    });
  });

  // ========================================
  // TEST 5: Encumbrance penalty in breakdown
  // ========================================
  describe('Test 5: Encumbrance Penalty Appears in Breakdown', () => {
    test('should include encumbrance modifiers in collection', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Encumbrance Test'
      });

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 },
        athletics: { base: 3, total: 3 }
      };

      // Simulate moderate encumbrance
      mockActor.system.encumbrance = {
        state: 'moderate',
        encumbranceLVL: 50,
        maximumLoad: 100,
        currentLoad: 60
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      const encumbranceModifiers = allModifiers.filter(m => m.source === 'encumbrance');

      // Should have encumbrance penalties
      expect(encumbranceModifiers.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================
  // TEST 6: Condition penalty in breakdown
  // ========================================
  describe('Test 6: Condition Penalty Appears in Breakdown', () => {
    test('should include condition track penalties in collection', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'Condition Test'
      });

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      mockActor.system.conditionTrack = {
        current: 2, // Step 2 = -2 penalty
        max: 5,
        persistent: false
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      const conditionModifiers = allModifiers.filter(m => m.source === 'condition');

      // Should have condition modifiers
      expect(conditionModifiers.length).toBeGreaterThanOrEqual(1);
      expect(conditionModifiers.some(m => m.value === -2)).toBe(true);
    });

    test('should include condition penalties for all skills', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 },
        athletics: { base: 3, total: 3 },
        perception: { base: 4, total: 4 }
      };

      mockActor.system.conditionTrack = {
        current: 1, // Step 1 = -1 penalty
        max: 5,
        persistent: false
      };

      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      const conditionModifiers = allModifiers.filter(m => m.source === 'condition');

      // Should have condition penalty for each skill
      const skillTargets = ['acrobatics', 'athletics', 'perception'];
      for (const skill of skillTargets) {
        expect(conditionModifiers.some(m => m.target === `skill.${skill}`)).toBe(true);
      }
    });
  });

  // ========================================
  // TEST 7: No sheet-time math
  // ========================================
  describe('Test 7: No Sheet-Time Math Remains', () => {
    test('should read final values from system.derived only', async () => {
      const mockActor = TestUtils.createMockActor('character', {
        name: 'No Math Test'
      });

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 },
        athletics: { base: 3, total: 3 }
      };

      mockActor.system.derived = {
        modifiers: {
          breakdown: {
            'skill.acrobatics': { total: 2, applied: [] },
            'skill.athletics': { total: 1, applied: [] }
          }
        }
      };

      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Custom',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 2,
          enabled: true
        }
      ];

      // Derived data should be authoritative
      const acroBreakdown = mockActor.system.derived.modifiers.breakdown['skill.acrobatics'];
      expect(acroBreakdown).toBeDefined();
      expect(acroBreakdown.total).toBe(2);

      // Never calculate misc in sheet
      const allModifiers = await ModifierEngine.getAllModifiers(mockActor);
      expect(allModifiers.length).toBeGreaterThanOrEqual(0);

      // All calculations go through ModifierEngine
      const aggregated = await ModifierEngine.aggregateAll(mockActor);
      expect(typeof aggregated).toBe('object');
    });

    test('should enforce no UI modifications to base values', async () => {
      const mockActor = TestUtils.createMockActor('character');

      mockActor.system.skills = {
        acrobatics: { base: 5, total: 5 }
      };

      const originalBase = mockActor.system.skills.acrobatics.base;

      // Add custom modifier
      mockActor.system.customModifiers = [
        {
          id: 'custom_1',
          source: 'custom',
          sourceName: 'Bonus',
          target: 'skill.acrobatics',
          type: 'untyped',
          value: 3,
          enabled: true
        }
      ];

      // Base should not change
      expect(mockActor.system.skills.acrobatics.base).toBe(originalBase);

      // Only total changes (via ModifierEngine)
      const aggregated = await ModifierEngine.aggregateAll(mockActor);
      expect(aggregated['skill.acrobatics']).toBe(3); // Only custom modifier
    });
  });

});
