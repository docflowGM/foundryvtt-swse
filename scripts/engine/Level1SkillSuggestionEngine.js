/**
 * SWSE Level 1 Skill Suggestion Engine
 *
 * Provides intelligent skill recommendations for newly created characters (Level 1 only).
 * Analyzes class skills, ability scores, and attribute-skill synergies to suggest
 * which skills best fit the character's natural strengths.
 *
 * Skill-Ability Mapping (from skills.json):
 * - STR: Climb, Jump, Swim
 * - DEX: Acrobatics, Initiative, Pilot, Stealth
 * - CON: Endurance
 * - INT: Mechanics, Use Computer
 * - WIS: Perception, Survival, Treat Injury
 * - CHA: Deception, Gather Information, Persuasion, Use the Force
 *
 * Core Recommended Skills (for most builds):
 * - Use the Force (Force users)
 * - Perception (Awareness and scouting)
 * - Mechanics (Technical and problem-solving)
 * - Pilot (Vehicle combat and exploration)
 * - Stealth (Tactical positioning)
 * - Persuasion (Social interactions)
 *
 * Key Principle: Attributes influence PRIORITY, never legality.
 * Skills are suggested ONLY at level 1.
 */

import { SWSELogger } from '../utils/logger.js';

export const LEVEL1_SKILL_TIERS = {
  CORE_SYNERGY: 3,        // Core skill with strong attribute match
  ATTRIBUTE_MATCH: 2,     // Good synergy with character abilities
  CLASS_SKILL: 1,         // Valid class skill
  AVAILABLE: 0            // Can be trained but not specifically recommended
};

export const TIER_REASONS = {
  3: "Core skill with strong attribute synergy",
  2: "Good synergy with your abilities",
  1: "Class skill for your chosen class",
  0: "Available for training"
};

// Attribute-to-Skill Synergy Mapping
// Derived from skills.json for accuracy
export const ATTRIBUTE_SKILL_MAP = {
  str: ['climb', 'jump', 'swim'],
  dex: ['acrobatics', 'initiative', 'pilot', 'stealth'],
  con: ['endurance'],
  int: ['mechanics', 'useComputer'],
  wis: ['perception', 'survival', 'treatInjury'],
  cha: ['deception', 'gatherInfo', 'persuasion', 'useTheForce']
};

// Core skills recommended across most builds
// These are universally strong choices in SWSE
export const CORE_SKILLS = new Set([
  'useTheForce',   // Force users
  'perception',    // Awareness and scouting
  'mechanics',     // Technical and problem-solving
  'pilot',         // Vehicle combat and exploration
  'stealth',       // Tactical positioning
  'persuasion'     // Social interactions
]);

export class Level1SkillSuggestionEngine {
  /**
   * Suggest skills for a level 1 character
   * @param {Array} availableSkills - Array of skill objects available to train
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections (class, abilities, etc)
   * @returns {Promise<Array>} Skills with suggestion metadata
   */
  static async suggestLevel1Skills(availableSkills, actor, pendingData = {}) {
    try {
      // Only suggest for level 1 characters
      const level = actor.system?.level || 0;
      if (level !== 0 && level !== 1) {
        return availableSkills.map(skill => ({
          ...skill,
          suggestion: {
            tier: LEVEL1_SKILL_TIERS.AVAILABLE,
            reason: "Level 1 suggestions only",
            icon: ""
          },
          isSuggested: false
        }));
      }

      // Get ability scores
      const abilities = actor.system?.abilities || {};
      const classSkills = pendingData?.classSkills || [];

      // Find ability modifiers
      const abilityScores = {
        str: abilities.str?.base || 10,
        dex: abilities.dex?.base || 10,
        con: abilities.con?.base || 10,
        int: abilities.int?.base || 10,
        wis: abilities.wis?.base || 10,
        cha: abilities.cha?.base || 10
      };

      const suggestedSkills = availableSkills.map(skill => {
        let tier = LEVEL1_SKILL_TIERS.AVAILABLE;
        const reasons = [];
        const skillKey = skill.key || skill.name?.toLowerCase().replace(/\s+/g, '');

        // Normalize skill names for matching
        const normalizedSkill = this._normalizeSkillName(skillKey || skill.name);

        // Tier 3: Core skills with strong attribute match
        if (CORE_SKILLS.has(normalizedSkill)) {
          const matchingAttr = this._getAttributeForSkill(normalizedSkill);
          if (matchingAttr && abilityScores[matchingAttr] >= 16) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CORE_SYNERGY);
            reasons.push(`Core skill with strong ${matchingAttr.toUpperCase()} synergy`);
          }
        }

        // Tier 2: Attribute synergy (any ability >= 14 with matching skill)
        const matchingAttr = this._getAttributeForSkill(normalizedSkill);
        if (matchingAttr) {
          const abilityScore = abilityScores[matchingAttr];
          if (abilityScore >= 16) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CORE_SYNERGY);
            reasons.push(`Strong synergy with high ${matchingAttr.toUpperCase()}`);
          } else if (abilityScore >= 14) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.ATTRIBUTE_MATCH);
            reasons.push(`Good synergy with ${matchingAttr.toUpperCase()}`);
          } else if (abilityScore >= 12) {
            tier = Math.max(tier, LEVEL1_SKILL_TIERS.CLASS_SKILL);
            reasons.push(`Synergy with ${matchingAttr.toUpperCase()}`);
          }
        }

        // Tier 1: Class skill
        if (classSkills.includes(normalizedSkill) || classSkills.includes(skillKey)) {
          tier = Math.max(tier, LEVEL1_SKILL_TIERS.CLASS_SKILL);
          if (!reasons.length) {
            reasons.push("Class skill for your chosen class");
          }
        }

        const reason = reasons.length > 0 ? reasons.join("; ") : TIER_REASONS[tier];

        return {
          ...skill,
          suggestion: {
            tier,
            reason,
            icon: this._getTierIcon(tier)
          },
          isSuggested: tier >= LEVEL1_SKILL_TIERS.ATTRIBUTE_MATCH
        };
      });

      // Sort by tier (descending) then by name
      return suggestedSkills.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) return tierDiff;
        return (a.name || "").localeCompare(b.name || "");
      });
    } catch (err) {
      SWSELogger.error('Level 1 skill suggestion failed:', err);
      return availableSkills.map(skill => ({
        ...skill,
        suggestion: {
          tier: LEVEL1_SKILL_TIERS.AVAILABLE,
          reason: "Available",
          icon: ""
        },
        isSuggested: false
      }));
    }
  }

  /**
   * Normalize skill name for matching against catalog
   * @private
   */
  static _normalizeSkillName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/['-]/g, '');
  }

  /**
   * Get the primary attribute that synergizes with a skill
   * @private
   */
  static _getAttributeForSkill(skillName) {
    const normalized = this._normalizeSkillName(skillName);

    for (const [attr, skills] of Object.entries(ATTRIBUTE_SKILL_MAP)) {
      for (const skill of skills) {
        if (this._normalizeSkillName(skill) === normalized) {
          return attr;
        }
      }
    }

    return null;
  }

  /**
   * Get icon for tier
   * @private
   */
  static _getTierIcon(tier) {
    const icons = {
      3: 'fas fa-star',
      2: 'fas fa-plus-circle',
      1: 'fas fa-check-circle',
      0: ''
    };
    return icons[tier] || '';
  }

  /**
   * Count suggestions by tier
   */
  static countByTier(suggestedSkills) {
    const counts = {};
    Object.values(LEVEL1_SKILL_TIERS).forEach(tier => {
      counts[tier] = 0;
    });

    suggestedSkills.forEach(skill => {
      const tier = skill.suggestion?.tier ?? 0;
      counts[tier] = (counts[tier] || 0) + 1;
    });

    return counts;
  }
}

export default Level1SkillSuggestionEngine;
