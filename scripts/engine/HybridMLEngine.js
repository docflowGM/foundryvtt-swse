/**
 * SWSE Hybrid ML Engine
 *
 * Combines two complementary approaches:
 * 1. Online Learning - Per-player model that learns from individual choices
 * 2. Archetype Recognition - Pattern matching against proven build archetypes
 *
 * This hybrid approach provides:
 * - Personalized suggestions that adapt to individual play style
 * - Proven archetype guidance for new players or standard builds
 * - Confidence scoring to blend both approaches intelligently
 *
 * The system learns from:
 * - Feat/talent selections
 * - Class choices
 * - Ability score priorities
 * - Skill training patterns
 * - Force power preferences
 */

import { SWSELogger } from '../utils/logger.js';
import { BiasPrecisionEngine } from './BiasPrecisionEngine.js';

export class HybridMLEngine {
  /**
   * Minimum decisions before online learning activates
   * Below this, rely primarily on archetype recognition
   */
  static MIN_LEARNING_THRESHOLD = 10;

  /**
   * Learning rate for online model updates
   * Controls how quickly the model adapts to new data
   */
  static LEARNING_RATE = 0.15;

  /**
   * Known build archetypes with their characteristic patterns
   * These are meta-optimal builds recognized from community play
   */
  static ARCHETYPES = {
    // Force User Archetypes
    'JediGuardian': {
      name: 'Jedi Guardian',
      description: 'Lightsaber-focused Force user with combat prowess',
      classes: ['jedi', 'jedi knight', 'jedi master'],
      primaryAbilities: ['str', 'con'],
      secondaryAbilities: ['wis'],
      keyFeats: ['weapon proficiency (lightsabers)', 'weapon focus (lightsabers)', 'weapon finesse', 'power attack'],
      keyTalents: ['deflect', 'block', 'weapon specialization', 'improved defenses'],
      keySkills: ['initiative', 'perception', 'jump'],
      forcePhilosophy: 'combat',
      confidence: 0
    },

    'JediConsular': {
      name: 'Jedi Consular',
      description: 'Force power specialist with diplomatic abilities',
      classes: ['jedi', 'jedi knight', 'jedi master'],
      primaryAbilities: ['wis', 'cha'],
      secondaryAbilities: ['int'],
      keyFeats: ['force sensitivity', 'skill focus (use the force)', 'force training'],
      keyTalents: ['force persuasion', 'force trance', 'force point recovery'],
      keySkills: ['use the force', 'persuasion', 'perception'],
      forcePhilosophy: 'powers',
      confidence: 0
    },

    'SithMarauder': {
      name: 'Sith Marauder',
      description: 'Aggressive dark side warrior',
      classes: ['sith', 'sith marauder', 'sith lord'],
      primaryAbilities: ['str', 'dex'],
      secondaryAbilities: ['con'],
      keyFeats: ['weapon proficiency (lightsabers)', 'dual weapon mastery', 'power attack'],
      keyTalents: ['rage', 'indomitable', 'dark side scourge'],
      keySkills: ['initiative', 'acrobatics', 'perception'],
      forcePhilosophy: 'dark_aggression',
      confidence: 0
    },

    // Combat Archetypes
    'Soldier': {
      name: 'Combat Specialist',
      description: 'Weapons and tactics expert',
      classes: ['soldier', 'elite trooper', 'officer'],
      primaryAbilities: ['str', 'dex'],
      secondaryAbilities: ['con'],
      keyFeats: ['armor proficiency (heavy)', 'weapon proficiency (rifles)', 'weapon focus', 'point blank shot'],
      keyTalents: ['armored defense', 'devastating attack', 'weapon specialization'],
      keySkills: ['initiative', 'mechanics', 'perception'],
      forcePhilosophy: 'none',
      confidence: 0
    },

    'Scoundrel': {
      name: 'Skill Specialist',
      description: 'Versatile skill-based character with tricks',
      classes: ['scoundrel', 'gunslinger', 'charlatan'],
      primaryAbilities: ['dex', 'int'],
      secondaryAbilities: ['cha'],
      keyFeats: ['point blank shot', 'precise shot', 'skill focus'],
      keyTalents: ['knack', 'fool\'s luck', 'improved dirty fighting'],
      keySkills: ['stealth', 'deception', 'mechanics', 'persuasion'],
      forcePhilosophy: 'none',
      confidence: 0
    },

    'Scout': {
      name: 'Ranger/Explorer',
      description: 'Wilderness and survival expert',
      classes: ['scout', 'infiltrator', 'master privateer'],
      primaryAbilities: ['dex', 'wis'],
      secondaryAbilities: ['con'],
      keyFeats: ['weapon proficiency (rifles)', 'point blank shot', 'skill focus (survival)'],
      keyTalents: ['surefooted', 'extreme effort', 'keen shot'],
      keySkills: ['survival', 'perception', 'stealth', 'initiative'],
      forcePhilosophy: 'none',
      confidence: 0
    },

    // Specialized Archetypes
    'Pilot': {
      name: 'Ace Pilot',
      description: 'Starfighter and vehicle specialist',
      classes: ['scout', 'ace pilot'],
      primaryAbilities: ['dex', 'int'],
      secondaryAbilities: ['con'],
      keyFeats: ['weapon proficiency (rifles)', 'vehicular combat', 'skill focus (pilot)'],
      keyTalents: ['elusive dogfighter', 'spacehound', 'skilled advisor'],
      keySkills: ['pilot', 'mechanics', 'perception', 'initiative'],
      forcePhilosophy: 'none',
      confidence: 0
    },

    'Medic': {
      name: 'Combat Medic',
      description: 'Healer and support specialist',
      classes: ['scout', 'medic', 'officer'],
      primaryAbilities: ['int', 'wis'],
      secondaryAbilities: ['dex'],
      keyFeats: ['weapon proficiency (rifles)', 'skill focus (treat injury)', 'force training'],
      keyTalents: ['surgical expertise', 'curative expertise', 'shake it off'],
      keySkills: ['treat injury', 'perception', 'survival', 'use computer'],
      forcePhilosophy: 'utility',
      confidence: 0
    },

    'TechSpecialist': {
      name: 'Tech Specialist',
      description: 'Mechanics, slicing, and gadgets expert',
      classes: ['scout', 'scoundrel', 'saboteur', 'military engineer'],
      primaryAbilities: ['int', 'dex'],
      secondaryAbilities: ['con'],
      keyFeats: ['skill focus (mechanics)', 'skill focus (use computer)', 'tech specialist'],
      keyTalents: ['jury rigger', 'trick shot', 'draw fire'],
      keySkills: ['mechanics', 'use computer', 'perception', 'stealth'],
      forcePhilosophy: 'none',
      confidence: 0
    }
  };

  /**
   * Analyze character's build and suggest best archetype matches
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @returns {Array} Archetype matches sorted by confidence (best first)
   */
  static analyzeArchetypes(actor, pendingData = {}) {
    const archetypeScores = {};

    for (const [archetypeId, archetype] of Object.entries(this.ARCHETYPES)) {
      archetypeScores[archetypeId] = this._scoreArchetypeMatch(actor, pendingData, archetype);
    }

    // Sort by confidence score (highest first)
    return Object.entries(archetypeScores)
      .map(([id, score]) => ({
        id,
        archetype: this.ARCHETYPES[id],
        confidence: score,
        name: this.ARCHETYPES[id].name,
        description: this.ARCHETYPES[id].description
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Score how well a character matches an archetype
   * Returns confidence score 0-1
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} archetype - Archetype definition
   * @returns {number} Confidence score (0-1)
   * @private
   */
  static _scoreArchetypeMatch(actor, pendingData, archetype) {
    let totalScore = 0;
    let totalWeight = 0;

    // Get character data
    const characterClasses = this._getCharacterClasses(actor, pendingData);
    const characterAbilities = this._getAbilityPriorities(actor);
    const characterFeats = this._getCharacterFeats(actor, pendingData);
    const characterTalents = this._getCharacterTalents(actor, pendingData);
    const characterSkills = this._getTrainedSkills(actor, pendingData);

    // Score class match (weight: 3.0)
    const classMatch = this._calculateOverlapScore(
      characterClasses,
      archetype.classes
    );
    totalScore += classMatch * 3.0;
    totalWeight += 3.0;

    // Score ability priority match (weight: 2.0)
    const abilityMatch = this._calculateAbilityAlignmentScore(
      characterAbilities,
      archetype.primaryAbilities,
      archetype.secondaryAbilities
    );
    totalScore += abilityMatch * 2.0;
    totalWeight += 2.0;

    // Score feat match (weight: 2.5)
    const featMatch = this._calculateOverlapScore(
      characterFeats,
      archetype.keyFeats
    );
    totalScore += featMatch * 2.5;
    totalWeight += 2.5;

    // Score talent match (weight: 2.5)
    const talentMatch = this._calculateOverlapScore(
      characterTalents,
      archetype.keyTalents
    );
    totalScore += talentMatch * 2.5;
    totalWeight += 2.5;

    // Score skill match (weight: 1.5)
    const skillMatch = this._calculateOverlapScore(
      characterSkills,
      archetype.keySkills
    );
    totalScore += skillMatch * 1.5;
    totalWeight += 1.5;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Get hybrid suggestion weight combining online learning + archetype matching
   * @param {Actor} actor - The character
   * @param {string} itemName - Item being evaluated
   * @param {string} itemType - Type (feat, talent, class, etc)
   * @param {number} baseTier - Base suggestion tier
   * @param {Object} pendingData - Pending selections
   * @returns {Object} {weight: number, reason: string, sources: Object}
   */
  static getHybridWeight(actor, itemName, itemType, baseTier, pendingData = {}) {
    // Get online learning component (personalized to this player)
    const onlineComponent = this._getOnlineLearningWeight(actor, itemType, baseTier);

    // Get archetype recognition component (proven builds)
    const archetypeComponent = this._getArchetypeWeight(actor, itemName, itemType, pendingData);

    // Blend based on online learning confidence
    // More player decisions = trust online learning more
    // Fewer player decisions = trust archetype recognition more
    const profile = BiasPrecisionEngine._getOrCreateProfile(actor);
    const totalDecisions = this._countTotalDecisions(profile, itemType);
    const onlineConfidence = Math.min(1.0, totalDecisions / this.MIN_LEARNING_THRESHOLD);
    const archetypeConfidence = 1.0 - onlineConfidence;

    const blendedWeight =
      (onlineComponent.weight * onlineConfidence) +
      (archetypeComponent.weight * archetypeConfidence);

    return {
      weight: blendedWeight,
      reason: this._buildHybridReason(onlineComponent, archetypeComponent, onlineConfidence),
      sources: {
        online: {
          weight: onlineComponent.weight,
          confidence: onlineConfidence,
          reason: onlineComponent.reason
        },
        archetype: {
          weight: archetypeComponent.weight,
          confidence: archetypeConfidence,
          reason: archetypeComponent.reason
        }
      }
    };
  }

  /**
   * Get online learning weight for an item
   * @param {Actor} actor - The character
   * @param {string} itemType - Type of item
   * @param {number} baseTier - Base tier
   * @returns {Object} {weight, reason}
   * @private
   */
  static _getOnlineLearningWeight(actor, itemType, baseTier) {
    const tierWeights = BiasPrecisionEngine.getTierWeights(actor, itemType);
    const weight = tierWeights[baseTier] || 1.0;

    return {
      weight,
      reason: weight > 1.1
        ? 'You often select this type of suggestion'
        : weight < 0.9
        ? 'You rarely select this type of suggestion'
        : 'No strong player preference'
    };
  }

  /**
   * Get archetype-based weight for an item
   * @param {Actor} actor - The character
   * @param {string} itemName - Item name
   * @param {string} itemType - Item type
   * @param {Object} pendingData - Pending selections
   * @returns {Object} {weight, reason}
   * @private
   */
  static _getArchetypeWeight(actor, itemName, itemType, pendingData) {
    const archetypeMatches = this.analyzeArchetypes(actor, pendingData);
    const topArchetype = archetypeMatches[0];

    if (!topArchetype || topArchetype.confidence < 0.3) {
      return { weight: 1.0, reason: 'No clear archetype match yet' };
    }

    // Check if item appears in archetype's key items
    const archetype = topArchetype.archetype;
    let isKeyItem = false;
    let itemList = [];

    switch (itemType) {
      case 'feat':
        itemList = archetype.keyFeats;
        break;
      case 'talent':
        itemList = archetype.keyTalents;
        break;
      case 'skill':
        itemList = archetype.keySkills;
        break;
      case 'class':
        itemList = archetype.classes;
        break;
    }

    isKeyItem = itemList.some(key =>
      itemName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(itemName.toLowerCase())
    );

    if (isKeyItem) {
      const weight = 1.0 + (topArchetype.confidence * 0.5); // Max +50% boost
      return {
        weight,
        reason: `Core to ${topArchetype.name} archetype`
      };
    }

    return { weight: 1.0, reason: 'Not a key archetype item' };
  }

  /**
   * Build combined reason explaining hybrid recommendation
   * @param {Object} onlineComponent - Online learning data
   * @param {Object} archetypeComponent - Archetype data
   * @param {number} onlineConfidence - Trust in online component
   * @returns {string} Human-readable reason
   * @private
   */
  static _buildHybridReason(onlineComponent, archetypeComponent, onlineConfidence) {
    if (onlineConfidence > 0.7) {
      // Primarily online learning
      return onlineComponent.reason;
    } else if (onlineConfidence < 0.3) {
      // Primarily archetype
      return archetypeComponent.reason;
    } else {
      // Blend
      const reasons = [];
      if (onlineComponent.weight > 1.1) {
        reasons.push('matches your play style');
      }
      if (archetypeComponent.weight > 1.1) {
        reasons.push(archetypeComponent.reason.toLowerCase());
      }
      return reasons.length > 0 ? reasons.join('; ') : 'Reasonable choice';
    }
  }

  /**
   * Count total decisions for an item type
   * @param {Object} profile - Bias profile
   * @param {string} itemType - Item type
   * @returns {number} Total decisions
   * @private
   */
  static _countTotalDecisions(profile, itemType) {
    const typeDecisions = profile.decisions[itemType] || {};
    let total = 0;
    for (const tierData of Object.values(typeDecisions)) {
      total += tierData.totalAccepted + tierData.totalRejected;
    }
    return total;
  }

  // ────────────────────────────────────────────────────────────
  // CHARACTER DATA EXTRACTION
  // ────────────────────────────────────────────────────────────

  static _getCharacterClasses(actor, pendingData) {
    const classes = actor.items
      .filter(i => i.type === 'class')
      .map(c => c.name.toLowerCase());

    if (pendingData.selectedClass?.name) {
      classes.push(pendingData.selectedClass.name.toLowerCase());
    }

    return classes;
  }

  static _getAbilityPriorities(actor) {
    const abilities = actor.system?.abilities || {};
    return Object.entries(abilities)
      .map(([key, data]) => ({
        key: key.toLowerCase(),
        value: data.total || data.value || 10
      }))
      .sort((a, b) => b.value - a.value)
      .map(a => a.key);
  }

  static _getCharacterFeats(actor, pendingData) {
    const feats = actor.items
      .filter(i => i.type === 'feat')
      .map(f => f.name.toLowerCase());

    (pendingData.selectedFeats || []).forEach(f => {
      feats.push((f.name || f).toLowerCase());
    });

    return feats;
  }

  static _getCharacterTalents(actor, pendingData) {
    const talents = actor.items
      .filter(i => i.type === 'talent')
      .map(t => t.name.toLowerCase());

    (pendingData.selectedTalents || []).forEach(t => {
      talents.push((t.name || t).toLowerCase());
    });

    return talents;
  }

  static _getTrainedSkills(actor, pendingData) {
    const skills = [];
    const skillData = actor.system?.skills || {};

    for (const [key, data] of Object.entries(skillData)) {
      if (data?.trained) {
        skills.push(key.toLowerCase());
      }
    }

    (pendingData.selectedSkills || []).forEach(s => {
      skills.push((s.key || s).toLowerCase());
    });

    return skills;
  }

  /**
   * Calculate overlap score between two arrays
   * Returns ratio of matches (0-1)
   * @param {Array} characterItems - Items the character has
   * @param {Array} archetypeItems - Items the archetype expects
   * @returns {number} Overlap ratio
   * @private
   */
  static _calculateOverlapScore(characterItems, archetypeItems) {
    if (!archetypeItems || archetypeItems.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const archetypeItem of archetypeItems) {
      const archetypeKey = archetypeItem.toLowerCase();
      if (characterItems.some(charItem =>
        charItem.includes(archetypeKey) || archetypeKey.includes(charItem)
      )) {
        matches++;
      }
    }

    return matches / archetypeItems.length;
  }

  /**
   * Calculate ability alignment score
   * Higher score if character's top abilities match archetype priorities
   * @param {Array} characterAbilities - Character abilities sorted by value
   * @param {Array} primaryAbilities - Archetype primary abilities
   * @param {Array} secondaryAbilities - Archetype secondary abilities
   * @returns {number} Alignment score (0-1)
   * @private
   */
  static _calculateAbilityAlignmentScore(characterAbilities, primaryAbilities, secondaryAbilities) {
    if (!characterAbilities || characterAbilities.length === 0) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    // Check if character's top 2 abilities match archetype primary
    for (let i = 0; i < Math.min(2, characterAbilities.length); i++) {
      const charAbility = characterAbilities[i];
      maxScore += 1.0;

      if (primaryAbilities.includes(charAbility)) {
        score += 1.0;
      } else if (secondaryAbilities && secondaryAbilities.includes(charAbility)) {
        score += 0.5;
      }
    }

    // Check if character's next 2 abilities match archetype secondary
    for (let i = 2; i < Math.min(4, characterAbilities.length); i++) {
      const charAbility = characterAbilities[i];
      maxScore += 0.5;

      if (primaryAbilities.includes(charAbility)) {
        score += 0.5;
      } else if (secondaryAbilities && secondaryAbilities.includes(charAbility)) {
        score += 0.25;
      }
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get archetype recommendations for next selection
   * @param {Actor} actor - The character
   * @param {string} itemType - Type of item being selected
   * @param {Object} pendingData - Pending selections
   * @returns {Array} Recommended items from archetype
   */
  static getArchetypeRecommendations(actor, itemType, pendingData = {}) {
    const archetypeMatches = this.analyzeArchetypes(actor, pendingData);
    const recommendations = [];

    // Get recommendations from top 2 archetypes
    for (let i = 0; i < Math.min(2, archetypeMatches.length); i++) {
      const match = archetypeMatches[i];
      if (match.confidence < 0.2) continue;

      const archetype = match.archetype;
      let itemList = [];

      switch (itemType) {
        case 'feat':
          itemList = archetype.keyFeats;
          break;
        case 'talent':
          itemList = archetype.keyTalents;
          break;
        case 'skill':
          itemList = archetype.keySkills;
          break;
        case 'class':
          itemList = archetype.classes;
          break;
      }

      for (const item of itemList) {
        recommendations.push({
          name: item,
          archetype: archetype.name,
          confidence: match.confidence,
          reason: `Recommended for ${archetype.name}`
        });
      }
    }

    return recommendations;
  }
}
