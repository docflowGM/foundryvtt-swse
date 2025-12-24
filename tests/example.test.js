/**
 * Example Tests
 * Run these tests to verify core functionality
 */

import { calculateAbilities } from './utils/calc-abilities.js';
import { calculateDefenses } from './utils/calc-defenses.js';
import { TestUtils } from './test-utils.js';

describe('SWSE Core Systems', () => {

  describe('Ability Calculations', () => {
    test('should calculate ability modifier correctly', () => {
      const mockActor = TestUtils.createMockActor('character', {
        abilities: {
          str: {base: 16, racial: 2, temp: 0}
        }
      });

      calculateAbilities(mockActor);

      expect(mockActor.system.abilities.str.total).toBe(18);
      expect(mockActor.system.abilities.str.mod).toBe(4);
    });

    test('should calculate negative ability modifier', () => {
      const mockActor = TestUtils.createMockActor('character', {
        abilities: {
          str: {base: 8, racial: 0, temp: 0}
        }
      });

      calculateAbilities(mockActor);

      expect(mockActor.system.abilities.str.total).toBe(8);
      expect(mockActor.system.abilities.str.mod).toBe(-1);
    });
  });

  describe('Defense Calculations', () => {
    test('should calculate Reflex defense without armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      calculateDefenses(mockActor);

      // 10 + 5 (level) + 2 (dex mod) = 17
      expect(mockActor.system.defenses.reflex.total).toBe(17);
    });

    test('should calculate Fortitude defense for droid with STR', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 3,
        isDroid: true,
        abilities: {
          str: {base: 14, racial: 0, temp: 0, total: 14, mod: 2},
          con: {base: 10, racial: 0, temp: 0, total: 10, mod: 0}
        }
      });

      calculateDefenses(mockActor);

      // 10 + 3 (level) + 2 (str mod for droid) = 15
      expect(mockActor.system.defenses.fortitude.total).toBe(15);
    });

    test('should calculate Will defense correctly', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 4,
        abilities: {
          wis: {base: 16, racial: 0, temp: 0, total: 16, mod: 3}
        }
      });

      calculateDefenses(mockActor);

      // 10 + 4 (level) + 3 (wis mod) = 17
      expect(mockActor.system.defenses.will.total).toBe(17);
    });
  });
});
