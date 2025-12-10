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
      abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } // Determined by chassis
    },
    Wookiee: {
      name: "Wookiee",
      size: "medium",
      speed: 6,
      languages: ["Shyriiwook"],
      abilityMods: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      bonusFeat: false
    },
    Twi'lek: {
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
    "Spacer": {
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
      baseAttackBonus: "high", // +1 per level
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
      baseAttackBonus: "high", // +1 per level (fast progression)
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
      baseAttackBonus: "low", // +0.5 per level (slow progression)
      classSkills: [
        "Deception", "Gather Information", "Initiative", "Knowledge (Bureaucracy)",
        "Knowledge (Galactic Lore)", "Perception", "Persuasion", "Pilot", "Ride"
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
      baseAttackBonus: "medium", // +0.75 per level
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
      baseAttackBonus: "medium", // +0.75 per level
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
    "gunslinger_outlaw": {
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
 * Helper function to calculate base attack bonus
 * ALWAYS loads from compendium to get actual BAB values from level_progression.
 * Sums the BAB values from each class level.
 * E.g., 6 levels Jedi (BAB 1+1+1+1+1+1=6) + 2 levels Jedi Knight (BAB 1+1=2) = 8 total
 */
export async function calculateBAB(classLevels) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let totalBAB = 0;

  for (const classLevel of classLevels) {
    // Always load from compendium (source of truth)
    const classData = await getClassData(classLevel.class);

    if (!classData) {
      console.warn(`BAB calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    // Get BAB from level progression
    const rawData = classData._raw;
    const levelProgression = rawData?.level_progression || [];
    const levelsInClass = classLevel.level || 1;

    // Sum BAB from each level taken in this class
    for (let i = 0; i < levelsInClass && i < levelProgression.length; i++) {
      const levelData = levelProgression[i];
      totalBAB += levelData.bab || 0;
    }
  }

  return totalBAB;
}

/**
 * Helper function to calculate save bonus
 * ALWAYS loads from compendium (source of truth).
 * Returns the HIGHEST flat defense bonus from all classes taken.
 * Defense bonuses are constant per class and don't scale with level.
 * E.g., Jedi always gives Fort +1, Ref +1, Will +1 regardless of levels.
 */
export async function calculateSaveBonus(classLevels, saveType) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let maxBonus = 0;

  // Get unique class names
  const uniqueClasses = new Set(classLevels.map(cl => cl.class));

  for (const className of uniqueClasses) {
    // Always load from compendium (source of truth)
    const classData = await getClassData(className);

    if (!classData) {
      console.warn(`Save calculation: Unknown class "${className}", skipping`);
      continue;
    }

    // Map saveType to defense key
    const saveKey = saveType === 'fort' ? 'fortitude' : saveType === 'ref' ? 'reflex' : 'will';

    // Get flat defense bonus from class
    const classBonus = classData.defenses?.[saveKey] || 0;

    // Take the highest bonus across all classes
    maxBonus = Math.max(maxBonus, classBonus);
  }

  return maxBonus;
}


/* --- Force power data (added by install_force_power_unified.py) --- */
export const FORCE_POWER_DATA = {
  feats: {
    "Force Training": { grants: 1 }
  },
  classes: {
    "Jedi": {
      "1": { "powers": 0 },
      "3": { "powers": 1 },
      "7": { "powers": 1 },
      "11": { "powers": 1 }
    }
  },
  templates: {
    // Add template-specific power grants here, e.g. "jedi_padawan": { powers: 2 }
  }
};
