/**
 * SynergyEvaluator
 *
 * Scores how well a feat/talent synergizes with the actor's build.
 * Checks for feat chains, talent synergy, and class alignment.
 * Keeps ConfidenceCalculator from bloating.
 *
 * Phase 1C: Full implementation with 5 weighted signals.
 */

import { SWSELogger } from '../utils/logger.js';
import { CLASS_SYNERGY_DATA } from './ClassSuggestionEngine.js';

// Weights for the 5 signals
const SYNERGY_WEIGHTS = {
  chain: 0.30,
  classMatch: 0.20,
  talentMatch: 0.20,
  attrMatch: 0.15,
  skillMatch: 0.15
};

// Neutral threshold: scores below this map to 0.5
const NEUTRAL_THRESHOLD = 0.35;

export class SynergyEvaluator {

  /**
   * Score how well a feat/talent synergizes with actor's build
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {number} 0-1 synergy score
   */
  static evaluateSynergy(item, actor) {
    try {
      // Phase 1: Exclude powers
      if (item.type === 'power') {
        return 0.5;
      }

      // Phase 1: Only handle feats and talents
      if (item.type !== 'feat' && item.type !== 'talent') {
        return 0.5;
      }

      // Calculate all 5 signals
      const chainScore = this._evaluateFeatChains(item, actor);
      const classMatchScore = this._evaluateClassMatch(item, actor);
      const talentMatchScore = this._evaluateTalentMatch(item, actor);
      const attrMatchScore = this._evaluateAttributeScaling(item, actor);
      const skillMatchScore = this._evaluateSkillAlignment(item, actor);

      // Weighted combination
      const synergy =
        (chainScore * SYNERGY_WEIGHTS.chain) +
        (classMatchScore * SYNERGY_WEIGHTS.classMatch) +
        (talentMatchScore * SYNERGY_WEIGHTS.talentMatch) +
        (attrMatchScore * SYNERGY_WEIGHTS.attrMatch) +
        (skillMatchScore * SYNERGY_WEIGHTS.skillMatch);

      // Apply neutral threshold
      if (synergy < NEUTRAL_THRESHOLD) {
        return 0.5;
      }

      return Math.min(1, Math.max(0, synergy));
    } catch (err) {
      SWSELogger.error('[SynergyEvaluator] Error evaluating synergy:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate feat chain synergy
   * Checks if the feat builds on existing prerequisites the actor has
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 chain score
   */
  static _evaluateFeatChains(item, actor) {
    try {
      // Check if item has prerequisites
      const prerequisites = item.system?.requirements || item._raw?.prerequisites || [];
      if (!prerequisites || prerequisites.length === 0) {
        return 0.5; // No chain requirement, neutral
      }

      const ownedFeats = new Set(
        actor.items
          .filter(i => i.type === 'feat')
          .map(f => f.name)
      );

      // Count how many prerequisites actor has
      let metCount = 0;
      let totalCount = 0;

      if (Array.isArray(prerequisites)) {
        for (const prereq of prerequisites) {
          if (typeof prereq === 'string') {
            totalCount++;
            if (ownedFeats.has(prereq)) {
              metCount++;
            }
          } else if (typeof prereq === 'object' && prereq.name) {
            totalCount++;
            if (ownedFeats.has(prereq.name)) {
              metCount++;
            }
          }
        }
      }

      // If no prerequisites, return neutral
      if (totalCount === 0) {
        return 0.5;
      }

      // Score based on how many prerequisites are met
      // Full chain met: 0.9, half met: 0.7, no chain: 0.5
      return 0.5 + (metCount / totalCount) * 0.4;
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error evaluating feat chains:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate class synergy match
   * Checks if item aligns with actor's class progression
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 class match score
   */
  static _evaluateClassMatch(item, actor) {
    try {
      const itemName = item.name;

      // Get actor's classes
      const ownedClasses = actor.items
        .filter(i => i.type === 'class')
        .map(c => c.name);

      if (ownedClasses.length === 0) {
        return 0.5;
      }

      // Check if item is mentioned in any CLASS_SYNERGY_DATA
      let matches = 0;
      for (const className of ownedClasses) {
        const classData = CLASS_SYNERGY_DATA[className];
        if (!classData) continue;

        // Check feats
        if (classData.feats?.includes(itemName)) {
          matches++;
        }
        // Check talents
        if (classData.talents?.includes(itemName)) {
          matches++;
        }
      }

      // Return score based on matches (multiple matches possible)
      // No match: 0.5, one match: 0.75, multiple: 1.0
      if (matches === 0) {
        return 0.5;
      } else if (matches === 1) {
        return 0.75;
      } else {
        return 1.0;
      }
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error evaluating class match:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate talent match
   * Checks if item synergizes with trained talents (actor-only)
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 talent match score
   */
  static _evaluateTalentMatch(item, actor) {
    try {
      // Get actor's talents
      const ownedTalents = new Set(
        actor.items
          .filter(i => i.type === 'talent')
          .map(t => t.name.toLowerCase())
      );

      if (ownedTalents.size === 0) {
        return 0.5;
      }

      const itemNameLower = item.name.toLowerCase();

      // Check for synergy keywords in talent names
      // E.g., if item is "Point-Blank Shot" and actor has "Gunslinger" talent
      const syncKeywords = {
        'point-blank': ['gunslinger', 'sniper'],
        'rapid strike': ['melee smash', 'brawler'],
        'force': ['alter', 'control', 'sense', 'lightsaber combat'],
        'martial arts': ['brawler', 'melee smash'],
        'armor': ['armor specialist'],
        'weapon': ['weapon specialist', 'lightsaber combat']
      };

      let synergy = false;
      for (const [keyword, talentList] of Object.entries(syncKeywords)) {
        if (itemNameLower.includes(keyword)) {
          for (const talent of talentList) {
            if (ownedTalents.has(talent)) {
              synergy = true;
              break;
            }
          }
          if (synergy) break;
        }
      }

      // If item has matching talent tree, high score
      const itemTalentTree = item.system?.tree?.toLowerCase();
      if (itemTalentTree && ownedTalents.has(itemTalentTree)) {
        return 0.9;
      }

      // If synergy found, good score
      if (synergy) {
        return 0.75;
      }

      // Otherwise, check if any talent suggests readiness (low bar)
      // E.g., any combat talent + any combat feat
      const combatTalents = ['brawler', 'melee smash', 'weapon specialist', 'gunslinger', 'sniper'];
      const combatKeywords = ['attack', 'combat', 'shot', 'strike', 'damage', 'melee', 'ranged'];

      const hasCombatTalent = Array.from(ownedTalents).some(t =>
        combatTalents.some(ct => t.includes(ct))
      );
      const isCombatItem = combatKeywords.some(k => itemNameLower.includes(k));

      if (hasCombatTalent && isCombatItem) {
        return 0.6;
      }

      // No match: return neutral
      return 0.5;
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error evaluating talent match:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate attribute scaling
   * Checks if actor's top 2-3 abilities match item scaling requirements
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 attribute match score
   */
  static _evaluateAttributeScaling(item, actor) {
    try {
      // Get item's attribute requirements (if any)
      const itemRequiredAttrs = item.system?.requirements?.attributes || [];

      // If item has no attribute requirements, neutral
      if (!itemRequiredAttrs || itemRequiredAttrs.length === 0) {
        return 0.5;
      }

      // Get actor's top 2-3 abilities
      const abilities = actor.system?.attributes || {};
      const abilityScores = [];

      for (const [key, abilityData] of Object.entries(abilities)) {
        const score = abilityData?.total || abilityData?.value || 10;
        abilityScores.push({
          ability: key.toLowerCase(),
          score: score
        });
      }

      // Sort by score (descending) and take top 3
      abilityScores.sort((a, b) => b.score - a.score);
      const topAbilities = abilityScores.slice(0, 3).map(a => a.ability);

      // Check how many item requirements match actor's top abilities
      let matches = 0;
      for (const attr of itemRequiredAttrs) {
        if (topAbilities.includes(attr.toLowerCase())) {
          matches++;
        }
      }

      // Score based on matches
      if (matches === 0) {
        return 0.4; // Item requires different abilities
      } else if (matches === itemRequiredAttrs.length) {
        return 1.0; // All requirements match
      } else {
        return 0.5 + (matches / itemRequiredAttrs.length) * 0.4;
      }
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error evaluating attribute scaling:', err);
      return 0.5;
    }
  }

  /**
   * Evaluate skill alignment
   * Checks if actor's trained skills match item skill requirements
   * @private
   * @param {Object} item
   * @param {Actor} actor
   * @returns {number} 0-1 skill match score
   */
  static _evaluateSkillAlignment(item, actor) {
    try {
      // Get item's skill requirements (if any)
      const itemRequiredSkills = item.system?.requirements?.skills || [];

      // If item has no skill requirements, neutral
      if (!itemRequiredSkills || itemRequiredSkills.length === 0) {
        return 0.5;
      }

      // Get actor's trained skills
      const skills = actor.system?.skills || {};
      const trainedSkills = new Set();

      for (const [skillKey, skillData] of Object.entries(skills)) {
        if (skillData?.trained) {
          trainedSkills.add(skillKey.toLowerCase());
        }
      }

      if (trainedSkills.size === 0) {
        return 0.4; // No trained skills
      }

      // Check how many item skill requirements are met
      let matches = 0;
      for (const skill of itemRequiredSkills) {
        const skillKey = typeof skill === 'string'
          ? skill.toLowerCase().replace(/\s+/g, '')
          : skill.key?.toLowerCase();

        if (trainedSkills.has(skillKey)) {
          matches++;
        }
      }

      // Score based on matches
      if (matches === 0) {
        return 0.4; // No matching trained skills
      } else if (matches === itemRequiredSkills.length) {
        return 1.0; // All requirements met
      } else {
        return 0.5 + (matches / itemRequiredSkills.length) * 0.4;
      }
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error evaluating skill alignment:', err);
      return 0.5;
    }
  }

  /**
   * Check if suggestion builds on existing feat/talent
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object|null} { baseItem, chainScore: 0-1 } or null
   */
  static findChainBase(item, actor) {
    try {
      const prerequisites = item.system?.requirements || item._raw?.prerequisites || [];
      if (!prerequisites || prerequisites.length === 0) {
        return null;
      }

      const ownedFeats = actor.items.filter(i => i.type === 'feat');
      const ownedFeatNames = new Set(ownedFeats.map(f => f.name));

      // Find which prerequisites the actor owns
      for (const prereq of prerequisites) {
        const prereqName = typeof prereq === 'string' ? prereq : prereq.name;
        if (ownedFeatNames.has(prereqName)) {
          const baseItem = ownedFeats.find(f => f.name === prereqName);
          const chainScore = this._evaluateFeatChains(item, actor);
          return {
            baseItem,
            chainScore
          };
        }
      }

      return null;
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error finding chain base:', err);
      return null;
    }
  }

  /**
   * Check if suggestion synergizes with talents
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Object} { synergizes: boolean, talentNames: [], score: 0-1 }
   */
  static checkTalentSynergy(item, actor) {
    try {
      const talentMatchScore = this._evaluateTalentMatch(item, actor);
      const ownedTalents = actor.items
        .filter(i => i.type === 'talent')
        .map(t => t.name);

      return {
        synergizes: talentMatchScore > 0.5,
        talentNames: ownedTalents,
        score: talentMatchScore
      };
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error checking talent synergy:', err);
      return {
        synergizes: false,
        talentNames: [],
        score: 0.5
      };
    }
  }

  /**
   * Check class-specific synergy
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {number} 0-1 class synergy score
   */
  static evaluateClassSynergy(item, actor) {
    return this._evaluateClassMatch(item, actor);
  }

  /**
   * Get all synergies for a suggestion
   * @param {Object} item - { id, name, type, system }
   * @param {Actor} actor
   * @returns {Array} Array of { type, target, score }
   */
  static getAllSynergies(item, actor) {
    try {
      const synergies = [];

      // Chain synergy
      const chainBase = this.findChainBase(item, actor);
      if (chainBase) {
        synergies.push({
          type: 'chain',
          target: chainBase.baseItem.name,
          score: chainBase.chainScore
        });
      }

      // Class synergy
      const classScore = this._evaluateClassMatch(item, actor);
      const ownedClasses = actor.items
        .filter(i => i.type === 'class')
        .map(c => c.name);

      if (classScore > 0.5 && ownedClasses.length > 0) {
        synergies.push({
          type: 'class',
          target: ownedClasses[0],
          score: classScore
        });
      }

      // Talent synergy
      const talentCheck = this.checkTalentSynergy(item, actor);
      if (talentCheck.synergizes) {
        synergies.push({
          type: 'talent',
          target: talentCheck.talentNames[0] || 'talent',
          score: talentCheck.score
        });
      }

      // Attribute synergy
      const attrScore = this._evaluateAttributeScaling(item, actor);
      if (attrScore > 0.5) {
        synergies.push({
          type: 'attribute',
          target: 'ability scaling',
          score: attrScore
        });
      }

      // Skill synergy
      const skillScore = this._evaluateSkillAlignment(item, actor);
      if (skillScore > 0.5) {
        synergies.push({
          type: 'skill',
          target: 'trained skills',
          score: skillScore
        });
      }

      return synergies;
    } catch (err) {
      SWSELogger.warn('[SynergyEvaluator] Error getting all synergies:', err);
      return [];
    }
  }
}

export default SynergyEvaluator;
