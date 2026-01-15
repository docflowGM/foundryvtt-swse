// ============================================
// FILE: scripts/data/prestige-prerequisites.js
// Prestige Class Prerequisites - Authoritative Data
// ============================================
//
// This module defines all prerequisites for prestige classes.
// Prerequisites are checked during level-up to determine which
// prestige classes are available to the character.
//
// Prerequisite types:
// - minLevel: Minimum character level
// - minBAB: Minimum Base Attack Bonus
// - skills: Array of required trained skills
// - feats: Array of required feats
// - talents: Talent requirements (count + trees)
// - forcePowers: Required Force powers
// - forceTechniques: Required Force techniques (count)
// - darkSideScore: Dark Side Score requirement
// - species: Required species/race
// - special: Special conditions (text description)
// ============================================

export const PRESTIGE_PREREQUISITES = {
    "Ace Pilot": {
        minLevel: 7,
        skills: ["Pilot"],
        feats: ["Vehicular Combat"]
    },

    "Bounty Hunter": {
        minLevel: 7,
        skills: ["Survival"],
        talents: {
            count: 2,
            trees: ["Awareness"]
        }
    },

    "Crime Lord": {
        minLevel: 7,
        skills: ["Deception", "Persuasion"],
        talents: {
            count: 1,
            trees: ["Fortune", "Lineage", "Misfortune"]
        }
    },

    "Elite Trooper": {
        minBAB: 7,
        feats: ["Armor Proficiency (Medium)", "Martial Arts I"],
        featsAny: ["Point-Blank Shot", "Flurry"],
        talents: {
            count: 1,
            trees: ["Armor Specialist", "Commando", "Mercenary", "Weapon Specialist"]
        }
    },

    "Force Adept": {
        minLevel: 7,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity"],
        talents: {
            count: 3,
            forceTalentsOnly: true
        }
    },

    "Force Disciple": {
        minLevel: 12,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity"],
        talents: {
            count: 2,
            trees: ["Dark Side Devotee", "Force Adept", "Force Item"]
        },
        forcePowers: ["Farseeing"],
        forceTechniques: {
            count: 1
        }
    },

    "Gunslinger": {
        minLevel: 7,
        feats: ["Point-Blank Shot", "Precise Shot", "Quick Draw", "Weapon Proficiency (Pistols)"]
    },

    "Jedi Knight": {
        minBAB: 7,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        special: "Must be a member of The Jedi"
    },

    "Jedi Master": {
        minLevel: 12,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        forceTechniques: {
            count: 1
        },
        special: "Must be a member of The Jedi"
    },

    "Officer": {
        minLevel: 7,
        skills: ["Knowledge (Tactics)"],
        talents: {
            count: 1,
            trees: ["Leadership", "Commando", "Veteran"]
        },
        special: "Must belong to any organization with a military or paramilitary division"
    },

    "Sith Apprentice": {
        minLevel: 7,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        darkSideScore: "wisdom", // Must equal Wisdom score
        special: "Must be a member of The Sith"
    },

    "Sith Lord": {
        minLevel: 12,
        skills: ["Use the Force"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        forceTechniques: {
            count: 1
        },
        darkSideScore: "wisdom",
        special: "Must be a member of The Sith"
    },

    // Knights of the Old Republic Campaign Guide
    "Corporate Agent": {
        minLevel: 7,
        skills: ["Gather Information", "Knowledge (Bureaucracy)"],
        feats: ["Skill Focus (Knowledge (Bureaucracy))"],
        special: "Must be employed by a major interstellar corporation"
    },

    "Gladiator": {
        minLevel: 7,
        minBAB: 7,
        feats: ["Improved Damage Threshold", "Weapon Proficiency (Advanced Melee Weapons)"]
    },

    "Melee Duelist": {
        minLevel: 7,
        minBAB: 7,
        feats: ["Melee Defense", "Rapid Strike", "Weapon Focus (Melee Weapon)"]
    },

    // Force Unleashed Campaign Guide
    "Enforcer": {
        minLevel: 7,
        skills: ["Gather Information", "Perception"],
        talents: {
            count: 1,
            trees: ["Survivor"]
        },
        special: "Must belong to a law enforcement or similar security organization"
    },

    "Independent Droid": {
        minLevel: 3,
        skills: ["Use Computer"],
        droidSystems: ["Heuristic Processor"]
    },

    "Infiltrator": {
        minLevel: 7,
        skills: ["Perception", "Stealth"],
        feats: ["Skill Focus (Stealth)"],
        talents: {
            count: 2,
            trees: ["Camouflage", "Spy"]
        }
    },

    "Master Privateer": {
        minLevel: 7,
        skills: ["Deception", "Pilot"],
        feats: ["Vehicular Combat"],
        talents: {
            count: 2,
            trees: ["Misfortune", "Smuggling", "Spacer"]
        }
    },

    "Medic": {
        minLevel: 7,
        skills: ["Knowledge (Life Sciences)", "Treat Injury"],
        feats: ["Surgical Expertise"]
    },

    "Saboteur": {
        minLevel: 7,
        skills: ["Deception", "Mechanics", "Use Computer"]
    },

    // Scum and Villainy
    "Assassin": {
        minLevel: 7,
        skills: ["Stealth"],
        feats: ["Sniper"],
        talents: {
            specific: ["Dastardly Strike"]
        }
    },

    "Charlatan": {
        minLevel: 7,
        skills: ["Deception", "Persuasion"],
        talents: {
            count: 1,
            trees: ["Disgrace", "Influence", "Lineage"]
        }
    },

    "Outlaw": {
        minLevel: 7,
        skills: ["Stealth", "Survival"],
        talents: {
            count: 1,
            trees: ["Disgrace", "Misfortune"]
        },
        special: "You must be wanted by the authorities in at least one star system"
    },

    // Clone Wars Campaign Guide
    "Droid Commander": {
        minLevel: 7,
        skills: ["Knowledge (Tactics)", "Use Computer"],
        talents: {
            count: 1,
            trees: ["Leadership", "Commando"]
        },
        special: "Must be a Droid"
    },

    "Military Engineer": {
        minBAB: 7,
        skills: ["Mechanics", "Use Computer"]
    },

    "Vanguard": {
        minLevel: 7,
        skills: ["Perception", "Stealth"],
        talents: {
            count: 2,
            trees: ["Camouflage", "Commando"]
        }
    },

    // Legacy Era Campaign Guide
    "Imperial Knight": {
        minBAB: 7,
        skills: ["Use the Force"],
        feats: ["Armor Proficiency (Medium)", "Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        special: "Must be a sworn defender of The Fel Empire"
    },

    "Shaper": {
        minLevel: 7,
        species: ["Yuuzhan Vong"],
        skills: ["Knowledge (Life Sciences)", "Treat Injury"],
        feats: ["Biotech Specialist"]
    },

    // Rebellion Era Campaign Guide
    "Improviser": {
        minLevel: 7,
        skills: ["Mechanics", "Use Computer"],
        feats: ["Skill Focus (Mechanics)"]
    },

    "Pathfinder": {
        minLevel: 7,
        skills: ["Perception", "Survival"],
        talents: {
            count: 2,
            trees: ["Awareness", "Camouflage", "Survivor"]
        }
    },

    // Galaxy at War
    "Martial Arts Master": {
        minBAB: 7,
        feats: ["Martial Arts II", "Melee Defense"],
        featsAny: ["Martial Arts Feat"], // Any one Martial Arts feat
        talents: {
            count: 1,
            trees: ["Brawler", "Survivor"]
        }
    }
};

/**
 * Get prerequisites for a prestige class.
 *
 * @param {string} className - Prestige class name
 * @returns {Object|null} - Prerequisites object or null
 */
export function getPrerequisites(className) {
    return PRESTIGE_PREREQUISITES[className] || null;
}

/**
 * Check if a class has prerequisites (i.e., is a prestige class).
 *
 * @param {string} className - Class name
 * @returns {boolean} - True if class has prerequisites
 */
export function hasPrerequisites(className) {
    return className in PRESTIGE_PREREQUISITES;
}

/**
 * Get all prestige class names.
 *
 * @returns {Array<string>} - Array of prestige class names
 */
export function getAllPrestigeClassNames() {
    return Object.keys(PRESTIGE_PREREQUISITES);
}
