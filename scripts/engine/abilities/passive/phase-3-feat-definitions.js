/**
 * PHASE 3: Derived Override Support - Test Abilities
 *
 * Four test abilities to validate PHASE 3 DERIVED_OVERRIDE implementation:
 *
 * Test 1: Charisma Reflex
 *   Add Charisma modifier to Reflex Defense
 *   Independent of modifiers or conditions
 *
 * Test 2: Half-Level Fortitude
 *   Add half level to Fortitude Defense
 *   Uses HALF_LEVEL computed value
 *
 * Test 3: Conditional Override (Lightsaber Stance)
 *   Add +1 to Reflex only while wielding lightsaber
 *   Tests condition integration with overrides
 *
 * Test 4: Multiple Override Targets
 *   Add Dexterity to Initiative
 *   Add static +2 to Speed
 *   Tests multi-target overrides on same ability
 */

export const PHASE_3_TEST_FEATS = {
  "Charisma Reflex": {
    executionModel: "PASSIVE",
    subType: "DERIVED_OVERRIDE",
    abilityMeta: {
      overrides: [
        {
          target: "defense.reflex",
          operation: "ADD",
          value: {
            type: "ABILITY_MOD",
            ability: "cha"
          },
          description: "Add Charisma modifier to Reflex Defense"
        }
      ]
    }
  },

  "Half-Level Fortitude": {
    executionModel: "PASSIVE",
    subType: "DERIVED_OVERRIDE",
    abilityMeta: {
      overrides: [
        {
          target: "defense.fortitude",
          operation: "ADD",
          value: {
            type: "HALF_LEVEL"
          },
          description: "Add half level to Fortitude Defense"
        }
      ]
    }
  },

  "Lightsaber Stance": {
    executionModel: "PASSIVE",
    subType: "DERIVED_OVERRIDE",
    abilityMeta: {
      overrides: [
        {
          target: "defense.reflex",
          operation: "ADD",
          value: {
            type: "STATIC",
            amount: 1
          },
          description: "Add +1 Reflex while wielding lightsaber",
          // PHASE 2: Conditions on derived overrides
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

  "Acrobatic Finesse": {
    executionModel: "PASSIVE",
    subType: "DERIVED_OVERRIDE",
    abilityMeta: {
      overrides: [
        {
          target: "initiative.total",
          operation: "ADD",
          value: {
            type: "ABILITY_MOD",
            ability: "dex"
          },
          description: "Add Dexterity modifier to Initiative"
        },
        {
          target: "speed",
          operation: "ADD",
          value: {
            type: "STATIC",
            amount: 2
          },
          description: "Add +2 squares to Speed"
        }
      ]
    }
  }
};
