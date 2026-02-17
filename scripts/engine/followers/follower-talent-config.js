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
  }
};

export function getFollowerTalentConfig(name) {
  return FOLLOWER_TALENT_CONFIG[name] ?? null;
}
