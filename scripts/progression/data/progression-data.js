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
      skillPoints: 5,
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
      fortSave: "high",
      refSave: "low",
      willSave: "low"
    },
    Jedi: {
      name: "Jedi",
      hitDie: 10,
      skillPoints: 4,
      baseAttackBonus: "medium", // +3/4 per level
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
      fortSave: "low",
      refSave: "high",
      willSave: "high",
      forceSensitive: true
    },
    Noble: {
      name: "Noble",
      hitDie: 6,
      skillPoints: 6,
      baseAttackBonus: "medium",
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
      fortSave: "low",
      refSave: "low",
      willSave: "high"
    },
    Scout: {
      name: "Scout",
      hitDie: 8,
      skillPoints: 8,
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
      fortSave: "high",
      refSave: "high",
      willSave: "low"
    },
    Scoundrel: {
      name: "Scoundrel",
      hitDie: 6,
      skillPoints: 8,
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
      fortSave: "low",
      refSave: "high",
      willSave: "low"
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
 * Now supports loading from compendium for prestige classes
 */
export async function calculateBAB(classLevels) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let bab = 0;
  for (const classLevel of classLevels) {
    // Try hardcoded data first (faster for core classes)
    let classData = PROGRESSION_RULES.classes[classLevel.class];

    // If not found, try loading from compendium (prestige classes)
    if (!classData) {
      classData = await getClassData(classLevel.class);
    }

    if (!classData) {
      console.warn(`BAB calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const levels = classLevel.level || 1;
    if (classData.baseAttackBonus === "high") {
      bab += levels;
    } else if (classData.baseAttackBonus === "medium") {
      bab += Math.floor(levels * 0.75);
    } else {
      bab += Math.floor(levels * 0.5);
    }
  }
  return bab;
}

/**
 * Helper function to calculate save bonus
 * Now supports loading from compendium for prestige classes
 */
export async function calculateSaveBonus(classLevels, saveType) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let bonus = 0;
  for (const classLevel of classLevels) {
    // Try hardcoded data first (faster for core classes)
    let classData = PROGRESSION_RULES.classes[classLevel.class];

    // If not found, try loading from compendium (prestige classes)
    if (!classData) {
      classData = await getClassData(classLevel.class);
    }

    if (!classData) {
      console.warn(`Save calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const levels = classLevel.level || 1;
    const saveProgression = classData[`${saveType}Save`];

    if (saveProgression === "high") {
      bonus += Math.floor(levels / 2) + 2;
    } else {
      bonus += Math.floor(levels / 3);
    }
  }
  return bonus;
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
