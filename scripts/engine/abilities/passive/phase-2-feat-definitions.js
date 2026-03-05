/**
 * PHASE 2: Conditional MODIFIER Support - Test Abilities
 *
 * Four test abilities to validate PHASE 2 conditional modifier implementation:
 *
 * Test 1: Conditional Reflex
 *   +1 reflex while wielding lightsaber
 *   Equip lightsaber → bonus applies
 *   Unequip lightsaber → bonus disappears
 *
 * Test 2: Armor Condition
 *   +1 fortitude while wearing armor
 *   Equip armor → bonus applies
 *   Unequip armor → bonus disappears
 *
 * Test 3: Multiple Conditions (AND logic)
 *   +1 reflex while wielding lightsaber AND wearing light armor
 *   Both true → apply
 *   One false → no apply
 *
 * Test 4: Condition Toggle Stability
 *   Repeated equip/unequip cycles must:
 *   - Not accumulate
 *   - Not leave ghost modifiers
 */

export const PHASE_2_TEST_FEATS = {
  "Lightsaber Focus": {
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
          description: "Lightsaber Focus: +1 reflex while wielding lightsaber",
          // PHASE 2: Condition on wielding lightsaber
          conditions: [
            {
              type: "WEAPON_CATEGORY",
              value: "LIGHTSABER"
            }
          ]
        }
      ]
    }
  },

  "Armored Defense": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.fortitude",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Armored Defense: +1 fortitude while wearing armor",
          // PHASE 2: Condition on wearing armor
          conditions: [
            {
              type: "EQUIPPED_ITEM_TYPE",
              value: "armor"
            }
          ]
        }
      ]
    }
  },

  "Balanced Warrior": {
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
          description: "Balanced Warrior: +1 reflex while wielding lightsaber AND wearing light armor",
          // PHASE 2: Multiple conditions with AND logic
          // Both must be true for bonus to apply
          conditions: [
            {
              type: "WEAPON_CATEGORY",
              value: "LIGHTSABER"
            },
            {
              type: "EQUIPPED_ITEM_TYPE",
              value: "armor"
            }
          ]
        }
      ]
    }
  },

  "Conditional Stability Test": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "skill.acrobatics",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Conditional Stability Test: +1 acrobatics while wielding lightsaber",
          // PHASE 2: Test that repeated equip/unequip doesn't accumulate
          conditions: [
            {
              type: "WEAPON_CATEGORY",
              value: "LIGHTSABER"
            }
          ]
        }
      ]
    }
  }
};
