/**
 * PHASE 4: RULE Subtype Support - Test Abilities
 *
 * Three test abilities to validate PHASE 4 RULE implementation:
 *
 * Test 1: Ignore Cover
 *   Toggle: Attacker ignores cover defense bonuses
 *   Resolution: CoverResolver queries IGNORE_COVER token
 *
 * Test 2: Cannot Be Flanked
 *   Toggle: Defender cannot be flanked (no flanking bonus to attacks)
 *   Resolution: FlankResolver queries CANNOT_BE_FLANKED token
 *
 * Test 3: Treat Skill As Trained
 *   Toggle: Actor treats a specific skill as trained (even if untrained)
 *   Resolution: SkillResolver queries TREAT_SKILL_AS_TRAINED token
 */

export const PHASE_4_TEST_FEATS = {
  "True Sight": {
    executionModel: "PASSIVE",
    subType: "RULE",
    abilityMeta: {
      rules: [
        {
          type: "IGNORE_COVER",
          description: "Can see through cover and obstacles"
        }
      ]
    }
  },

  "Heightened Awareness": {
    executionModel: "PASSIVE",
    subType: "RULE",
    abilityMeta: {
      rules: [
        {
          type: "CANNOT_BE_FLANKED",
          description: "Enemies cannot flank you"
        }
      ]
    }
  },

  "Instinctive Pilot": {
    executionModel: "PASSIVE",
    subType: "RULE",
    abilityMeta: {
      rules: [
        {
          type: "TREAT_SKILL_AS_TRAINED",
          skill: "pilot",
          description: "Can use Pilot even if untrained"
        }
      ]
    }
  },

  "Lightsaber Mastery": {
    executionModel: "PASSIVE",
    subType: "RULE",
    abilityMeta: {
      rules: [
        {
          type: "IGNORE_COVER",
          conditions: [
            {
              type: "WEAPON_CATEGORY",
              value: "LIGHTSABER"
            }
          ],
          description: "When wielding a lightsaber, ignore cover"
        }
      ]
    }
  }
};
