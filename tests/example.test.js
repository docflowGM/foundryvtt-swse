/**
 * Example Tests
 * Run these tests to verify core functionality
 */

import { calculateAbilities } from './utils/calc-abilities.js';
import { calculateAllDefenses } from '../scripts/rolls/defenses.js';
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
  });
  
  describe('Defense Calculations', () => {
    test('should calculate Reflex defense without armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });
      
      calculateAllDefenses(mockActor);

      // 10 + 5 (level) + 2 (dex mod) = 17
      expect(mockActor.system.defenses.reflex.total).toBe(17);
    });
  });
  
  describe('Damage Application', () => {
    test('should apply damage to temp HP first', async () => {
      const actor = await Actor.create(TestUtils.createMockActor('character', {
        hp: {value: 50, max: 50, temp: 10}
      }));
      
      await actor.applyDamage(5);
      
      expect(actor.system.hp.temp).toBe(5);
      expect(actor.system.hp.value).toBe(50);
      
      await actor.delete();
    });
  });
});
