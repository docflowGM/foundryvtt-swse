/**
 * SWSE Follower Talent Config
 * Pure data module to avoid side-effects and circular imports.
 */

export const FOLLOWER_TALENT_CONFIG = {
  "Reconnaissance Team Leader": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    additionalFeats: ["Skill Training (Perception)", "Skill Training (Stealth)"],
    description: "This talent grants you a follower trained in Perception and Stealth."
  },
  "Inspire Loyalty": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    additionalSkills: ["Perception"],
    armorProficiencyChoice: true,
    description: "This talent grants you a follower with an Armor Proficiency feat of your choice and trained in Perception."
  },
  "Commanding Officer": {
    templateChoices: ["aggressive", "defensive", "utility"],
    maxCount: 3,
    additionalFeats: ["Weapon Proficiency (Rifles)"],
    armorProficiencyChoice: true,
    description: "This talent grants you a follower with Weapon Proficiency (Rifles) and one Armor Proficiency feat of your choice."
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

export function getFollowerTalentConfig(name) {
  return FOLLOWER_TALENT_CONFIG[name] ?? null;
}
