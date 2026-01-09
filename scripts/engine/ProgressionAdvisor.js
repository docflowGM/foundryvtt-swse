/**
 * SWSE Progression Advisor
 *
 * Applies attribute-aware weighting to suggestions across the entire system.
 * This advisory layer enhances suggestion prioritization based on ability scores.
 *
 * Key Principle: Attributes influence PRIORITY, never legality.
 * All options remain legal - attributes only adjust suggestion tier/priority.
 *
 * Skill-Ability Associations (from skills.json):
 * - STR: Climb, Jump, Swim
 * - DEX: Acrobatics, Initiative, Pilot, Stealth
 * - CON: Endurance
 * - INT: Mechanics, Use Computer
 * - WIS: Perception, Survival, Treat Injury
 * - CHA: Deception, Gather Information, Persuasion, Use the Force
 *
 * Integrates with:
 * - Level 1 Skill Suggestions (skill training at character creation)
 * - BuildIntent (derives primary/secondary abilities)
 * - Attribute-aware weighting for feats, talents, classes, force options
 */

import { SWSELogger } from '../utils/logger.js';
import { Level1SkillSuggestionEngine } from './Level1SkillSuggestionEngine.js';

export class ProgressionAdvisor {
  /**
   * Derive build intent from character attributes
   * Identifies primary/secondary abilities and combat/force focus
   * @param {Actor} actor - The character
   * @returns {Object} Attribute-aware build profile
   */
  static deriveAttributeBuildIntent(actor) {
    try {
      const abilities = actor.system?.attributes || {};

      // Get ability scores
      const scores = {
        str: abilities.str?.base || 10,
        dex: abilities.dex?.base || 10,
        con: abilities.con?.base || 10,
        int: abilities.int?.base || 10,
        wis: abilities.wis?.base || 10,
        cha: abilities.cha?.base || 10
      };

      // Find primary and secondary abilities
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const primaryAbility = sorted[0]?.[0];
      const primaryScore = sorted[0]?.[1] || 10;
      const secondaryAbility = sorted[1]?.[0];
      const secondaryScore = sorted[1]?.[1] || 10;

      // Determine focus areas
      const forceFocus = (scores.wis >= 16 || scores.cha >= 16);
      const rangedBias = scores.dex >= 16;
      const meleeBias = scores.str >= 16;

      // Determine combat style
      let combatStyle = 'mixed';
      if (forceFocus) combatStyle = 'force-caster';
      else if (meleeBias) combatStyle = 'melee';
      else if (rangedBias) combatStyle = 'ranged';

      // Confidence score (how optimized the build is)
      const maxScore = Math.max(...Object.values(scores));
      const confidence = Math.min(maxScore / 20, 1.0);

      return {
        primaryAbility,
        primaryScore,
        secondaryAbility,
        secondaryScore,
        forceFocus,
        combatStyle,
        confidence,
        meleeBias,
        rangedBias,
        allScores: scores
      };
    } catch (err) {
      SWSELogger.error('Failed to derive attribute build intent:', err);
      return {
        primaryAbility: 'str',
        primaryScore: 10,
        secondaryAbility: 'dex',
        secondaryScore: 10,
        forceFocus: false,
        combatStyle: 'mixed',
        confidence: 0,
        allScores: {}
      };
    }
  }

  /**
   * Apply attribute weighting to a suggestion tier
   * Soft modifier that enhances prioritization without invalidating options
   * @param {number} baseTier - Base suggestion tier
   * @param {Object} buildIntent - Attribute build profile
   * @param {string} relevantAttribute - Ability that synergizes with this option
   * @param {Object} options - Modifier options
   * @returns {number} Weighted tier
   */
  static applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options = {}) {
    if (!buildIntent || !relevantAttribute) {
      return baseTier;
    }

    let weightBonus = 0;

    // Primary ability match: +2 weight
    if (buildIntent.primaryAbility === relevantAttribute) {
      weightBonus += 2;
    }
    // Secondary ability match: +1 weight
    else if (buildIntent.secondaryAbility === relevantAttribute) {
      weightBonus += 1;
    }

    // Apply secondary weighting modifiers
    if (options.isCoreOption) weightBonus += 1;
    if (options.isPrestigeAligned) weightBonus += 1;
    if (options.confidence && buildIntent.confidence >= 0.75) weightBonus += 1;

    // Return weighted tier (clamped to reasonable range)
    return Math.min(baseTier + weightBonus, 6);
  }

  /**
   * Suggest level 1 skills with attribute awareness
   * @param {Array} availableSkills - Skills available for training
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @returns {Promise<Array>} Skills with suggestions
   */
  static async suggestLevel1Skills(availableSkills, actor, pendingData = {}) {
    try {
      // Get attribute-aware build intent
      const buildIntent = this.deriveAttributeBuildIntent(actor);

      // Get base suggestions from skill engine
      const baseSkills = await Level1SkillSuggestionEngine.suggestLevel1Skills(
        availableSkills,
        actor,
        pendingData
      );

      // Apply attribute weighting
      const weightedSkills = baseSkills.map(skill => {
        const matchingAttr = this._getAttributeForSkill(skill.key || skill.name);

        if (matchingAttr) {
          const weightedTier = this.applyAttributeWeight(
            skill.suggestion?.tier || 0,
            buildIntent,
            matchingAttr,
            { isCoreOption: true }
          );

          return {
            ...skill,
            suggestion: {
              ...skill.suggestion,
              tier: weightedTier,
              attributeBonus: buildIntent.primaryAbility === matchingAttr ? 2 :
                            buildIntent.secondaryAbility === matchingAttr ? 1 : 0
            },
            isSuggested: weightedTier >= 2
          };
        }

        return skill;
      });

      return weightedSkills;
    } catch (err) {
      SWSELogger.error('Level 1 skill suggestion with attributes failed:', err);
      return availableSkills;
    }
  }

  /**
   * Get attribute for a skill
   * Maps skill to its primary ability from skills.json
   * @private
   */
  static _getAttributeForSkill(skillName) {
    // Import the mapping from Level1SkillSuggestionEngine
    const { ATTRIBUTE_SKILL_MAP } = Level1SkillSuggestionEngine;
    if (!ATTRIBUTE_SKILL_MAP) return null;

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
   * Normalize skill name
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
   * Get ability score abbreviation
   * @param {string} ability - Full ability name or abbrev
   * @returns {string} Abbreviated form (str, dex, con, int, wis, cha)
   */
  static getAbilityAbbrev(ability) {
    const abbrevs = {
      'strength': 'str', 'str': 'str',
      'dexterity': 'dex', 'dex': 'dex',
      'constitution': 'con', 'con': 'con',
      'intelligence': 'int', 'int': 'int',
      'wisdom': 'wis', 'wis': 'wis',
      'charisma': 'cha', 'cha': 'cha'
    };

    const key = (ability || '').toLowerCase();
    return abbrevs[key] || key;
  }

  /**
   * Get full ability name
   * @param {string} abbrev - Abbreviated form
   * @returns {string} Full name
   */
  static getAbilityName(abbrev) {
    const names = {
      'str': 'Strength',
      'dex': 'Dexterity',
      'con': 'Constitution',
      'int': 'Intelligence',
      'wis': 'Wisdom',
      'cha': 'Charisma'
    };

    const key = (abbrev || '').toLowerCase();
    return names[key] || abbrev;
  }

  /**
   * Get ability emoji/icon for UI
   * @param {string} ability - Ability abbrev or name
   * @returns {string} FontAwesome class
   */
  static getAbilityIcon(ability) {
    const abbrev = this.getAbilityAbbrev(ability);
    const icons = {
      'str': 'fas fa-hammer',        // Strength
      'dex': 'fas fa-feather',       // Dexterity
      'con': 'fas fa-heart',         // Constitution
      'int': 'fas fa-brain',         // Intelligence
      'wis': 'fas fa-eye',           // Wisdom
      'cha': 'fas fa-users'          // Charisma
    };

    return icons[abbrev] || 'fas fa-cube';
  }
}

export default ProgressionAdvisor;
