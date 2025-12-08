/**
 * PROGRESSION_RULES - initial skeleton of data-driven rules
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
    Human: { name: "Human", abilityMods: {} },
    Droid: { name: "Droid", tags: ["construct"] }
  },
  backgrounds: {
    "Outer Rim Colonist": { trainedSkills: ["Piloting","Survival"] },
    "Spacer": { trainedSkills: ["Piloting","Engineering"] }
  },
  classes: {
    Soldier: {
      name: "Soldier",
      levels: {
        1: { hp: 10, feats: ["Weapon Proficiency (Simple)"], talents: ["Soldier Talent 1"] }
      }
    },
    Jedi: { name: "Jedi", levels: { 1: { hp: 6, feats: [], talents: [] } } },
    Noble: { name: "Noble", levels: { 1: { hp: 6, feats: [], talents: [] } } },
    Scout: { name: "Scout", levels: { 1: { hp: 8, feats: [], talents: [] } } },
    Scoundrel: { name: "Scoundrel", levels: { 1: { hp: 8, feats: [], talents: [] } } }
  },
  templates: {
    "gunslinger_outlaw": {
      name: "Gunslinger (Outlaw)",
      species: null,
      background: "Spacer",
      class: "Scoundrel",
      level: 1,
      abilities: { dex: 14, str: 10, con: 12, int: 10, wis: 10, cha: 12 },
      feats: ["PointBlankShot"],
      talents: ["QuickDraw"],
      skills: ["Piloting","Stealth"]
    }
  }
};


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
