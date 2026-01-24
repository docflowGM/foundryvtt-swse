/**
 * PROGRESSION_RULES - Data-driven character progression rules for SWSE
 * CORE_CLASSES is enforced at chargen by default; free-build can be enabled via settings.
 */

export const CORE_CLASSES = [
  "Soldier",
  "Jedi",
  "Noble",
  "Scout",
  "Scoundrel"
];

export const REQUIRED_PRESTIGE_LEVEL = 7;

export const PROGRESSION_RULES = {
  species: {
    Human: {
      name: "Human",
      size: "medium",
      speed: 6,
      languages: ["Basic"],
      abilityChoice: true, // +2 to any one ability
      bonusFeat: true,
      bonusTrainedSkill: true
    },
    Droid: {
      name: "Droid",
      size: "medium",
      speed: 6,
      languages: ["Binary"],
      tags: ["construct"],
      immunities: ["poison", "disease"],
      abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
    },
    Wookiee: {
      name: "Wookiee",
      size: "medium",
      speed: 6,
      languages: ["Shyriiwook"],
      abilityMods: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      bonusFeat: false
    },
    "Twi'lek": {
      name: "Twi'lek",
      size: "medium",
      speed: 6,
      languages: ["Ryl", "Basic"],
      abilityMods: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: -2 },
      bonusFeat: false
    },
    Bothan: {
      name: "Bothan",
      size: "medium",
      speed: 6,
      languages: ["Bothese", "Basic"],
      abilityMods: { str: 0, dex: 0, con: -2, int: 0, wis: 0, cha: 2 },
      bonusFeat: false
    }
  },

  backgrounds: {
    Spacer: {
      name: "Spacer",
      trainedSkills: ["Pilot", "Use Computer"]
    },
    "Outer Rim Colonist": {
      name: "Outer Rim Colonist",
      trainedSkills: ["Survival", "Knowledge (Galactic Lore)"]
    },
    "Military Brat": {
      name: "Military Brat",
      trainedSkills: ["Knowledge (Tactics)", "Pilot"]
    },
    "Street Rat": {
      name: "Street Rat",
      trainedSkills: ["Stealth", "Deception"]
    }
  },

  classes: {
    Soldier: {
      name: "Soldier",
      hitDie: 10,
      skillPoints: 3,
      baseAttackBonus: "high",
      classSkills: [
        "Climb", "Endurance", "Initiative", "Jump", "Knowledge (Tactics)",
        "Mechanics", "Perception", "Pilot", "Ride", "Survival", "Swim"
      ],
      startingFeats: [
        "Armor Proficiency (Light)",
        "Armor Proficiency (Medium)",
        "Weapon Proficiency (Pistols)",
        "Weapon Proficiency (Rifles)",
        "Weapon Proficiency (Simple)"
      ],
      talentTrees: ["Armored Defense", "Melee Smash", "Sharpshooter", "Weapon Specialization"],
      defenses: {
        fortitude: 2,
        reflex: 1,
        will: 0
      }
    },

    Jedi: {
      name: "Jedi",
      hitDie: 10,
      skillPoints: 2,
      baseAttackBonus: "high",
      classSkills: [
        "Acrobatics", "Climb", "Endurance", "Initiative", "Jump",
        "Knowledge (Galactic Lore)", "Perception", "Persuasion", "Pilot",
        "Stealth", "Swim", "Use the Force"
      ],
      startingFeats: [
        "Force Sensitivity",
        "Weapon Proficiency (Lightsabers)",
        "Weapon Proficiency (Simple)"
      ],
      talentTrees: ["Jedi Mind Tricks", "Lightsaber Combat", "Telekinetic Savant"],
      defenses: {
        fortitude: 1,
        reflex: 1,
        will: 1
      },
      forceSensitive: true
    },

    Noble: {
      name: "Noble",
      hitDie: 6,
      skillPoints: 6,
      baseAttackBonus: "low",
      classSkills: [
        "Deception", "Gather Information", "Initiative",
        "Knowledge (Bureaucracy)", "Knowledge (Galactic Lore)",
        "Perception", "Persuasion", "Pilot", "Ride"
      ],
      startingFeats: [
        "Linguist",
        "Weapon Proficiency (Pistols)",
        "Weapon Proficiency (Simple)"
      ],
      talentTrees: ["Born Leader", "Inspire Confidence", "Presence", "Wealth"],
      defenses: {
        fortitude: 0,
        reflex: 1,
        will: 2
      }
    },

    Scout: {
      name: "Scout",
      hitDie: 8,
      skillPoints: 4,
      baseAttackBonus: "medium",
      classSkills: [
        "Acrobatics", "Climb", "Endurance", "Initiative", "Jump",
        "Knowledge (Galactic Lore)", "Knowledge (Life Sciences)", "Knowledge (Physical Sciences)",
        "Mechanics", "Perception", "Pilot", "Stealth", "Survival", "Swim", "Treat Injury"
      ],
      startingFeats: [
        "Armor Proficiency (Light)",
        "Weapon Proficiency (Pistols)",
        "Weapon Proficiency (Rifles)",
        "Weapon Proficiency (Simple)"
      ],
      talentTrees: ["Camouflage", "Expert Tracker", "Reconnaissance", "Snipers"],
      defenses: {
        fortitude: 1,
        reflex: 2,
        will: 0
      }
    },

    Scoundrel: {
      name: "Scoundrel",
      hitDie: 6,
      skillPoints: 5,
      baseAttackBonus: "medium",
      classSkills: [
        "Acrobatics", "Climb", "Deception", "Gather Information", "Initiative",
        "Jump", "Knowledge (Galactic Lore)", "Mechanics", "Perception",
        "Persuasion", "Pilot", "Stealth", "Swim", "Use Computer"
      ],
      startingFeats: [
        "Point Blank Shot",
        "Weapon Proficiency (Pistols)",
        "Weapon Proficiency (Simple)"
      ],
      talentTrees: ["Fortune", "Gunslinger", "Misfortune", "Skulduggery"],
      defenses: {
        fortitude: 0,
        reflex: 2,
        will: 1
      }
    }
  },

  templates: {
    gunslinger_outlaw: {
      name: "Gunslinger (Outlaw)",
      species: null,
      background: "Spacer",
      class: "Scoundrel",
      level: 1,
      abilities: { dex: 14, str: 10, con: 12, int: 10, wis: 10, cha: 12 },
      feats: ["Point Blank Shot"],
      talents: ["Quick Draw"],
      skills: ["Pilot", "Stealth"]
    }
  }
};

/**
 * Calculate total Base Attack Bonus from class levels.
 */
export async function calculateBAB(classLevels) {
  const { getClassData } = await import("../utils/class-data-loader.js");

  let totalBAB = 0;

  for (const classLevel of classLevels) {
    const classData = await getClassData(classLevel.class);

    if (!classData) {
      console.warn(`BAB calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const rawData = classData._raw;
    const levelProgression = rawData?.level_progression || [];
    const levelsInClass = classLevel.level || 1;

    if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
      const finalLevelData = levelProgression[levelsInClass - 1];
      totalBAB += finalLevelData.bab || 0;
    }
  }

  return totalBAB;
}

/**
 * Calculate the highest save bonus a character gets from their classes.
 */
export async function calculateSaveBonus(classLevels, saveType) {
  const { getClassData } = await import("../utils/class-data-loader.js");

  let maxBonus = 0;
  const uniqueClasses = new Set(classLevels.map(cl => cl.class));

  for (const className of uniqueClasses) {
    const classData = await getClassData(className);

    if (!classData) {
      console.warn(`Save calculation: Unknown class "${className}", skipping`);
      continue;
    }

    const saveKey =
      saveType === "fort" ? "fortitude" :
      saveType === "ref" ? "reflex" :
      "will";

    const classBonus = classData.defenses?.[saveKey] || 0;
    maxBonus = Math.max(maxBonus, classBonus);
  }

  return maxBonus;
}

/* --- Force Power Data --- */
export const FORCE_POWER_DATA = {
  feats: {
    "Force Sensitivity": { grants: 1 },
    "Force Training": { grants: "ability_mod", training: true }
  },
  templates: {
    // Add template-specific power grants here
  }
};
