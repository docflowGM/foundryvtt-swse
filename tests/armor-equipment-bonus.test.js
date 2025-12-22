/**
 * Armor Equipment Bonus Tests
 * Test that equipment bonuses are correctly applied to Reflex and Fortitude Defense
 * based on armor proficiency
 */

import { calculateDefenses } from './utils/calc-defenses.js';
import { TestUtils } from './test-utils.js';

describe('Armor Equipment Bonus', () => {

  describe('Reflex Defense with Equipment Bonus', () => {
    test('should apply equipment bonus when proficient with light armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add light armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Blast Vest',
        type: 'armor',
        system: {
          armorType: 'light',
          defenseBonus: 2,
          equipmentBonus: 1,
          maxDexBonus: 4,
          armorCheckPenalty: -2,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Light Armor Proficiency feat
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Light Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // 10 + 2 (armor) + 2 (dex mod) + 1 (equipment bonus) = 15
      expect(mockActor.system.defenses.reflex.total).toBe(15);
    });

    test('should not apply equipment bonus when NOT proficient with light armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add light armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Blast Vest',
        type: 'armor',
        system: {
          armorType: 'light',
          defenseBonus: 2,
          equipmentBonus: 1,
          maxDexBonus: 4,
          armorCheckPenalty: -2,
          equipped: true
        }
      });
      mockActor.items = [armor];
      // No proficiency feat added

      calculateDefenses(mockActor);

      // 10 + 2 (armor) + 2 (dex mod) + 0 (no equipment bonus - not proficient) = 14
      expect(mockActor.system.defenses.reflex.total).toBe(14);
    });

    test('should apply equipment bonus with Armored Defense talent', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add medium armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Combat Armor',
        type: 'armor',
        system: {
          armorType: 'medium',
          defenseBonus: 5,
          equipmentBonus: 2,
          maxDexBonus: 3,
          armorCheckPenalty: -5,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Medium Armor Proficiency
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Medium Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      // Add Armored Defense talent
      const talent = TestUtils.createMockItem('talent', {
        name: 'Armored Defense',
        type: 'talent'
      });
      mockActor.items.push(talent);

      calculateDefenses(mockActor);

      // With Armored Defense: 10 + max(5, 5) + 2 (dex capped) + 2 (equipment bonus) = 19
      expect(mockActor.system.defenses.reflex.total).toBe(19);
    });

    test('should apply equipment bonus with Improved Armored Defense talent', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add heavy armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Combat Armor',
        type: 'armor',
        system: {
          armorType: 'heavy',
          defenseBonus: 10,
          equipmentBonus: 3,
          maxDexBonus: 1,
          armorCheckPenalty: -10,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Heavy Armor Proficiency
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Heavy Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      // Add Improved Armored Defense talent
      const talent = TestUtils.createMockItem('talent', {
        name: 'Improved Armored Defense',
        type: 'talent'
      });
      mockActor.items.push(talent);

      calculateDefenses(mockActor);

      // With Improved Armored Defense: 10 + max(5 + floor(10/2), 10) + 1 (dex capped) + 3 (equipment bonus) = 24
      // Formula: base + sourceValue + dexMod + equipmentBonus = 10 + 10 + 1 + 3 = 24
      expect(mockActor.system.defenses.reflex.total).toBe(24);
    });
  });

  describe('Fortitude Defense with Equipment Bonus', () => {
    test('should apply equipment bonus when proficient with armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3},
          str: {base: 10, racial: 0, temp: 0, total: 10, mod: 0}
        }
      });

      // Add light armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Blast Vest',
        type: 'armor',
        system: {
          armorType: 'light',
          equipmentBonus: 1,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Light Armor Proficiency
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Light Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // 10 + 5 (level) + 3 (con mod) + 1 (equipment bonus) = 19
      expect(mockActor.system.defenses.fortitude.total).toBe(19);
    });

    test('should not apply equipment bonus when NOT proficient with armor', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3},
          str: {base: 10, racial: 0, temp: 0, total: 10, mod: 0}
        }
      });

      // Add light armor with equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Blast Vest',
        type: 'armor',
        system: {
          armorType: 'light',
          equipmentBonus: 1,
          equipped: true
        }
      });
      mockActor.items = [armor];
      // No proficiency added

      calculateDefenses(mockActor);

      // 10 + 5 (level) + 3 (con mod) + 0 (no equipment bonus - not proficient) = 18
      expect(mockActor.system.defenses.fortitude.total).toBe(18);
    });

    test('should apply higher equipment bonus from heavy armor when proficient', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          con: {base: 16, racial: 0, temp: 0, total: 16, mod: 3},
          str: {base: 10, radical: 0, temp: 0, total: 10, mod: 0}
        }
      });

      // Add heavy armor with higher equipment bonus
      const armor = TestUtils.createMockItem('armor', {
        name: 'Heavy Armor',
        type: 'armor',
        system: {
          armorType: 'heavy',
          equipmentBonus: 5,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Heavy Armor Proficiency
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Heavy Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // 10 + 5 (level) + 3 (con mod) + 5 (equipment bonus) = 23
      expect(mockActor.system.defenses.fortitude.total).toBe(23);
    });
  });

  describe('Armor Proficiency Requirements', () => {
    test('medium proficiency should NOT grant light armor proficiency', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add light armor
      const armor = TestUtils.createMockItem('armor', {
        name: 'Light Armor',
        type: 'armor',
        system: {
          armorType: 'light',
          defenseBonus: 2,
          equipmentBonus: 1,
          maxDexBonus: 4,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add only Medium Armor Proficiency (should NOT cover light)
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Medium Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // NOT proficient - no equipment bonus
      // 10 + 2 (armor) + 2 (dex) + 0 (no equipment bonus) = 14
      expect(mockActor.system.defenses.reflex.total).toBe(14);
    });

    test('heavy proficiency should NOT grant medium armor proficiency', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add medium armor
      const armor = TestUtils.createMockItem('armor', {
        name: 'Medium Armor',
        type: 'armor',
        system: {
          armorType: 'medium',
          defenseBonus: 5,
          equipmentBonus: 2,
          maxDexBonus: 3,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add only Heavy Armor Proficiency (should NOT cover medium)
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Heavy Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // NOT proficient - no equipment bonus
      // 10 + 5 (armor) + 2 (dex capped to 3) + 0 (no equipment bonus) = 17
      expect(mockActor.system.defenses.reflex.total).toBe(17);
    });

    test('each proficiency only covers its own armor type', () => {
      const mockActor = TestUtils.createMockActor('character', {
        level: 5,
        abilities: {
          dex: {base: 14, racial: 0, temp: 0, total: 14, mod: 2}
        }
      });

      // Add medium armor
      const armor = TestUtils.createMockItem('armor', {
        name: 'Medium Armor',
        type: 'armor',
        system: {
          armorType: 'medium',
          defenseBonus: 5,
          equipmentBonus: 2,
          maxDexBonus: 3,
          equipped: true
        }
      });
      mockActor.items = [armor];

      // Add Medium Armor Proficiency (correct proficiency)
      const proficiency = TestUtils.createMockItem('feat', {
        name: 'Medium Armor Proficiency',
        type: 'feat'
      });
      mockActor.items.push(proficiency);

      calculateDefenses(mockActor);

      // Proficient with medium armor - equipment bonus applies
      // 10 + 5 (armor) + 2 (dex capped to 3) + 2 (equipment bonus) = 19
      expect(mockActor.system.defenses.reflex.total).toBe(19);
    });
  });
});
