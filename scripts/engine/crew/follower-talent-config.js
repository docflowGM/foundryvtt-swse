/**
 * SWSE Follower Talent Config
 * Pure data module to avoid side-effects and circular imports.
 */

const BEAST_BAB_PROGRESSION = Object.freeze(Array.from({ length: 20 }, (_value, index) => index + 1));

const AKK_DOG_FIXED_PROFILE = Object.freeze({
  id: 'akk-dog-follower',
  speciesName: 'Akk Dog',
  speciesType: 'Beast',
  creatureKind: 'beast',
  followerKind: 'living',
  noSpeciesSelection: true,
  fixedAbilityScores: true,
  noTemplateAbilityBonus: true,
  noStartingCredits: true,
  suppressBaseFollowerFeat: true,
  skipBackground: true,
  skipLanguages: true,
  abilityScores: {
    str: 16,
    dex: 8,
    con: 12,
    wis: 10,
    int: 2,
    cha: 8
  },
  size: 'large',
  speed: 6,
  movement: { walk: 6 },
  babProgression: BEAST_BAB_PROGRESSION,
  naturalArmorBonus: { reflex: 2 },
  sizeDefensePenalty: { reflex: -1 },
  skillPenalties: { stealth: -5 },
  carryCapacityMultiplier: 2,
  naturalWeapons: [
    {
      name: 'Natural Weapons',
      damage: '1d6',
      damageType: 'slashing',
      attackAttribute: 'str',
      range: 'melee',
      weaponCategory: 'natural',
      proficiency: 'natural',
      description: 'Akk Dog natural weapons. When the Akk Dog makes an Unarmed attack, it can deal 1d6 slashing damage plus its Strength modifier instead of normal Unarmed damage.'
    }
  ],
  ruleNotes: [
    'Akk Dogs are Beasts and use Beast base attack progression while remaining followers for ownership/counting purposes.',
    'Large size: -1 Reflex Defense, -5 Stealth, and double lifting/carrying capacity.',
    'Natural Armor: +2 Reflex Defense.',
    'Any Force Power the owner activates that targets the owner can target this Akk Dog Follower instead, at the owner\'s discretion.'
  ]
});

export const FOLLOWER_TALENT_CONFIG = {
  "Reconnaissance Team Leader": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    repeatable: true,
    additionalFeats: ["Skill Training (Perception)", "Skill Training (Stealth)"],
    description: "This talent grants you a follower trained in Perception and Stealth. It may be selected up to three times."
  },
  "Inspire Loyalty": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    repeatable: true,
    additionalSkills: ["Perception"],
    armorProficiencyChoice: true,
    description: "This talent grants you a follower with an Armor Proficiency feat of your choice and trained in Perception. It may be selected up to three times."
  },
  "Commanding Officer": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    repeatable: true,
    additionalFeats: ["Weapon Proficiency (Rifles)"],
    armorProficiencyChoice: true,
    description: "This talent grants you a follower with Weapon Proficiency (Rifles) and one Armor Proficiency feat of your choice. It may be selected up to three times."
  },
  "Akk Dog Master": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 1,
    dependentKind: "follower",
    treeId: "46d03bab0cf74a14",
    fixedFollowerProfile: AKK_DOG_FIXED_PROFILE,
    additionalFeats: ["Power Attack"],
    suppressBaseFollowerFeat: true,
    skipOriginSelection: true,
    skipSpeciesSelection: true,
    skipBackground: true,
    skipLanguages: true,
    noStartingCredits: true,
    description: "This talent grants one Akk Dog Follower. Choose Aggressive, Defensive, or Utility; species, ability scores, beast traits, Power Attack, and no starting credits are fixed by the Akk Dog Follower Template."
  },
  "Attract Minion": {
    templateChoices: ["minion"],
    maxCount: 0,
    repeatable: true,
    dependentKind: "minion",
    minionLevelOffset: -2,
    minionLevelLabel: "owner heroic level - 2 (minimum 1)",
    description: "This talent grants one attracted nonheroic minion. It may be taken multiple times."
  },
  "Attract Privateer": {
    templateChoices: ["privateer"],
    maxCount: 0,
    repeatable: true,
    dependentKind: "privateer",
    minionLevelOffset: -2,
    minionLevelLabel: "owner heroic level - 2 (minimum 1)",
    description: "This talent grants one attracted privateer-style nonheroic minion. It may be taken multiple times."
  },
  "Attract Superior Minion": {
    templateChoices: ["minion"],
    maxCount: 0,
    repeatable: true,
    dependentKind: "minion",
    minionLevelOffset: -2,
    minionLevelLabel: "owner heroic level - 2 (minimum 1)",
    description: "This talent grants one superior attracted nonheroic minion. It may be taken multiple times."
  }
};

function _resolveTreeId(context = null) {
  if (!context) return null;
  if (typeof context === 'string') return context;
  return context.treeId
    || context.talentTreeId
    || context.system?.treeId
    || context.flags?.swse?.treeId
    || null;
}

export function getFollowerTalentConfig(name, context = null) {
  const cfg = FOLLOWER_TALENT_CONFIG[name] ?? null;
  if (!cfg) return null;

  const treeId = _resolveTreeId(context);
  if (cfg.treeId && treeId && cfg.treeId !== treeId) return null;
  return cfg;
}

export function getFollowerFixedProfile(nameOrConfig, context = null) {
  const cfg = typeof nameOrConfig === 'string'
    ? getFollowerTalentConfig(nameOrConfig, context)
    : nameOrConfig;
  return cfg?.fixedFollowerProfile || null;
}
