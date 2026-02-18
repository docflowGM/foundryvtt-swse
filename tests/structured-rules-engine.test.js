/**
 * StructuredRulesEngine.test.js
 *
 * Tests for the StructuredRuleEvaluator and ModifierEngine integration
 * Verifies:
 * - Rule element evaluation
 * - Activation condition checking
 * - Conversion to Modifier objects
 * - Stacking rules application
 */

import { StructuredRuleEvaluator } from '../scripts/engine/modifiers/StructuredRuleEvaluator.js';
import { ModifierEngine } from '../scripts/engine/modifiers/ModifierEngine.js';

describe('StructuredRuleEvaluator', () => {
  /**
   * Mock actor for testing
   */
  const createMockActor = (overrides = {}) => ({
    name: 'Test Actor',
    type: 'character',
    system: {
      level: 1,
      skills: {
        useTheForce: { trained: false, rank: 0 },
        mechanics: { trained: false, rank: 0 }
      },
      hp: { value: 10, max: 10 },
      ...overrides.system
    },
    items: overrides.items || [],
    ...overrides
  });

  describe('Skill Modifier Rules', () => {
    test('should create flat skill bonus modifier', () => {
      const traits = [
        {
          id: 'force-legacy',
          rules: [
            {
              id: 'force-legacy-mod',
              type: 'skillModifier',
              skillId: 'useTheForce',
              value: 2,
              bonusType: 'species',
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'Qel-Droma');

      expect(modifiers).toHaveLength(1);
      expect(modifiers[0].target).toBe('skill.useTheForce');
      expect(modifiers[0].value).toBe(2);
      expect(modifiers[0].source).toBe('species');
      expect(modifiers[0].sourceName).toContain('Qel-Droma');
    });

    test('should create conditional skill bonus with context', () => {
      const traits = [
        {
          id: 'industrial-expertise',
          rules: [
            {
              id: 'industrial-expertise-mod',
              type: 'skillModifier',
              skillId: 'mechanics',
              value: 5,
              bonusType: 'species',
              context: {
                type: 'machinery',
                description: 'checks involving machinery'
              },
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'Ugnaught');

      expect(modifiers).toHaveLength(1);
      expect(modifiers[0].target).toBe('skill.mechanics');
      expect(modifiers[0].value).toBe(5);
      expect(modifiers[0].context).toBeDefined();
      expect(modifiers[0].context.type).toBe('machinery');
    });
  });

  describe('Defense Modifier Rules', () => {
    test('should create defense bonus modifier', () => {
      const traits = [
        {
          id: 'tough-hide',
          rules: [
            {
              id: 'tough-hide-defense',
              type: 'defenseModifier',
              defense: 'fortitude',
              value: 1,
              bonusType: 'species',
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'Chevin');

      expect(modifiers).toHaveLength(1);
      expect(modifiers[0].target).toBe('defense.fortitude');
      expect(modifiers[0].value).toBe(1);
    });
  });

  describe('Activation Conditions', () => {
    test('should evaluate always condition', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');

      expect(modifiers).toHaveLength(1);
    });

    test('should evaluate skillTrained condition - true', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: {
                type: 'skillTrained',
                skillId: 'mechanics'
              }
            }
          ]
        }
      ];

      const actor = createMockActor({
        system: {
          skills: {
            mechanics: { trained: true, rank: 2 }
          }
        }
      });

      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');

      expect(modifiers).toHaveLength(1);
    });

    test('should evaluate skillTrained condition - false', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: {
                type: 'skillTrained',
                skillId: 'mechanics'
              }
            }
          ]
        }
      ];

      const actor = createMockActor({
        system: {
          skills: {
            mechanics: { trained: false, rank: 0 }
          }
        }
      });

      const modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');

      expect(modifiers).toHaveLength(0);
    });

    test('should evaluate levelReached condition', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: {
                type: 'levelReached',
                minLevel: 5
              }
            }
          ]
        }
      ];

      // Should not apply at level 1
      let actor = createMockActor({ system: { level: 1 } });
      let modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(0);

      // Should apply at level 5
      actor = createMockActor({ system: { level: 5 } });
      modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(1);
    });

    test('should evaluate OR condition', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: {
                type: 'OR',
                conditions: [
                  { type: 'levelReached', minLevel: 10 },
                  { type: 'skillTrained', skillId: 'mechanics' }
                ]
              }
            }
          ]
        }
      ];

      // Should not apply (level < 10 and mechanics untrained)
      let actor = createMockActor({
        system: { level: 1, skills: { mechanics: { trained: false } } }
      });
      let modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(0);

      // Should apply (mechanics trained)
      actor = createMockActor({
        system: { level: 1, skills: { mechanics: { trained: true } } }
      });
      modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(1);
    });

    test('should evaluate AND condition', () => {
      const traits = [
        {
          id: 'trait-1',
          rules: [
            {
              id: 'rule-1',
              type: 'skillModifier',
              skillId: 'perception',
              value: 2,
              bonusType: 'species',
              when: {
                type: 'AND',
                conditions: [
                  { type: 'levelReached', minLevel: 5 },
                  { type: 'skillTrained', skillId: 'mechanics' }
                ]
              }
            }
          ]
        }
      ];

      // Should not apply (level < 5)
      let actor = createMockActor({
        system: { level: 1, skills: { mechanics: { trained: true } } }
      });
      let modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(0);

      // Should apply (both conditions met)
      actor = createMockActor({
        system: { level: 5, skills: { mechanics: { trained: true } } }
      });
      modifiers = StructuredRuleEvaluator.evaluateSpeciesRules(actor, traits, 'TestSpecies');
      expect(modifiers).toHaveLength(1);
    });
  });

  describe('Feat Grant Extraction', () => {
    test('should extract unconditional feat grants', () => {
      const traits = [
        {
          id: 'force-sensitivity',
          rules: [
            {
              id: 'force-sensitivity-grant',
              type: 'featGrant',
              featId: 'force-sensitivity',
              when: { type: 'always' },
              allowMultiple: false
            }
          ]
        }
      ];

      const actor = createMockActor();
      const grants = StructuredRuleEvaluator.extractFeatGrants(traits, actor);

      expect(grants).toHaveLength(1);
      expect(grants[0].featId).toBe('force-sensitivity');
    });

    test('should extract conditional feat grants', () => {
      const traits = [
        {
          id: 'force-training',
          rules: [
            {
              id: 'force-training-grant',
              type: 'featGrant',
              featId: 'force-training',
              when: {
                type: 'skillTrained',
                skillId: 'useTheForce'
              },
              allowMultiple: false
            }
          ]
        }
      ];

      // Should not grant when skill untrained
      let actor = createMockActor({
        system: { skills: { useTheForce: { trained: false } } }
      });
      let grants = StructuredRuleEvaluator.extractFeatGrants(traits, actor);
      expect(grants).toHaveLength(0);

      // Should grant when skill trained
      actor = createMockActor({
        system: { skills: { useTheForce: { trained: true } } }
      });
      grants = StructuredRuleEvaluator.extractFeatGrants(traits, actor);
      expect(grants).toHaveLength(1);
      expect(grants[0].featId).toBe('force-training');
    });
  });

  describe('Natural Weapon Extraction', () => {
    test('should extract natural weapon specs', () => {
      const traits = [
        {
          id: 'natural-claws',
          rules: [
            {
              id: 'claws-weapon',
              type: 'naturalWeapon',
              name: 'Claws',
              weaponCategory: 'melee',
              attackAbility: 'str',
              damage: {
                formula: '1d6',
                damageType: 'slashing'
              },
              critical: {
                range: 20,
                multiplier: 2
              },
              proficiency: {
                type: 'natural',
                isProficient: true
              },
              traits: {
                alwaysArmed: true,
                countsAsWeapon: true,
                finesse: false,
                light: false,
                twoHanded: false
              },
              scaling: {
                bySize: false
              },
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const weapons = StructuredRuleEvaluator.extractNaturalWeapons(traits, actor, 'cathar');

      expect(weapons).toHaveLength(1);
      expect(weapons[0].name).toBe('Claws');
      expect(weapons[0].damage.formula).toBe('1d6');
      expect(weapons[0].damage.damageType).toBe('slashing');
      expect(weapons[0].traits.alwaysArmed).toBe(true);
      expect(weapons[0].speciesId).toBe('cathar');
    });

    test('should not extract natural weapons with unmet conditions', () => {
      const traits = [
        {
          id: 'natural-claws',
          rules: [
            {
              id: 'claws-weapon',
              type: 'naturalWeapon',
              name: 'Claws',
              weaponCategory: 'melee',
              attackAbility: 'str',
              damage: {
                formula: '1d6',
                damageType: 'slashing'
              },
              traits: {
                alwaysArmed: true,
                countsAsWeapon: true
              },
              when: {
                type: 'levelReached',
                minLevel: 10
              }
            }
          ]
        }
      ];

      // Should not extract at level 1
      let actor = createMockActor({ system: { level: 1 } });
      let weapons = StructuredRuleEvaluator.extractNaturalWeapons(traits, actor, 'test');
      expect(weapons).toHaveLength(0);

      // Should extract at level 10
      actor = createMockActor({ system: { level: 10 } });
      weapons = StructuredRuleEvaluator.extractNaturalWeapons(traits, actor, 'test');
      expect(weapons).toHaveLength(1);
    });

    test('should provide defaults for missing fields', () => {
      const traits = [
        {
          id: 'basic-weapon',
          rules: [
            {
              id: 'weapon-1',
              type: 'naturalWeapon',
              name: 'Bite',
              when: { type: 'always' }
            }
          ]
        }
      ];

      const actor = createMockActor();
      const weapons = StructuredRuleEvaluator.extractNaturalWeapons(traits, actor, 'test');

      expect(weapons).toHaveLength(1);
      expect(weapons[0].weaponCategory).toBe('melee');
      expect(weapons[0].attackAbility).toBe('str');
      expect(weapons[0].damage.formula).toBe('1d4');
      expect(weapons[0].damage.damageType).toBe('slashing');
    });
  });
});
