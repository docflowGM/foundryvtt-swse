/**
 * Background Suggestion Engine for Character Generation
 *
 * Suggests backgrounds based on character's current class, species, abilities, and build direction.
 * Used in character generation to help players choose narratively and mechanically appropriate backgrounds.
 */

import { SWSELogger } from '../utils/logger.js';
import { BuildIntent } from './BuildIntent.js';

export const BACKGROUND_SUGGESTION_TIERS = {
  CLASS_SYNERGY: 3,          // Background works well with character's class
  ABILITY_SYNERGY: 2,        // Background's relevant skills match high abilities
  THEME_SYNERGY: 2,          // Background aligns with character's build themes
  SPECIES_SYNERGY: 1.5,      // Background fits the character's species narrative
  LANGUAGE_BONUS: 1,         // Background offers relevant bonus language
  FALLBACK: 0                // Legal option
};

export const BACKGROUND_TIER_REASONS = {
  3: 'Perfect fit for your class',
  2.5: 'Excellent synergy with your abilities and build',
  2: 'Strong thematic alignment with your abilities or build',
  1.5: 'Fits your species and narrative',
  1: 'Offers a relevant bonus language',
  0: 'Valid option'
};

export const BACKGROUND_TIER_ICONS = {
  3: 'fas fa-star suggestion-prestige',
  2.5: 'fas fa-fire suggestion-synergy',
  2: 'fas fa-lightbulb suggestion-theme',
  1.5: 'fas fa-dna suggestion-species',
  1: 'fas fa-language suggestion-language',
  0: ''
};

export class BackgroundSuggestionEngine {
  /**
   * Generate suggestions for available backgrounds
   * @param {Array} backgrounds - Array of background objects
   * @param {Actor} actor - The character actor (or temp actor for chargen)
   * @param {Object} pendingData - Character data being built (from chargen)
   * @returns {Promise<Array>} Backgrounds with suggestion metadata
   */
  static async suggestBackgrounds(backgrounds, actor, pendingData = {}) {
    if (!backgrounds || backgrounds.length === 0) {return [];}

    try {
      // Build character profile from actor + pending data
      const profile = this._buildCharacterProfile(actor, pendingData);

      // Analyze each background
      const suggestedBackgrounds = backgrounds.map(bg => ({
        ...bg,
        suggestion: this._scoringBackground(bg, profile)
      }));

      // Sort by tier (highest first), then by score within tier
      suggestedBackgrounds.sort((a, b) => {
        if (a.suggestion.tier !== b.suggestion.tier) {
          return b.suggestion.tier - a.suggestion.tier;
        }
        return (b.suggestion.score || 0) - (a.suggestion.score || 0);
      });

      SWSELogger.log('BackgroundSuggestionEngine | Suggested backgrounds:', suggestedBackgrounds);
      return suggestedBackgrounds;
    } catch (err) {
      SWSELogger.error('BackgroundSuggestionEngine | Error suggesting backgrounds:', err);
      return backgrounds; // Return unsorted if error
    }
  }

  /**
   * Build a character profile from actor or pending data
   * @private
   */
  static _buildCharacterProfile(actor, pendingData) {
    const profile = {
      class: null,
      species: null,
      highestAbility: null,
      highestAbilityScore: 0,
      trainedSkills: [],
      themes: {},
      mentorBiases: {}
    };

    // Get class
    if (pendingData?.classes?.[0]?.name) {
      profile.class = pendingData.classes[0].name;
      SWSELogger.log(`[BGSuggest] _buildCharacterProfile: Class from pendingData`, {
        className: profile.class,
        pendingDataClasses: pendingData.classes
      });
    } else if (actor?.items) {
      const classItem = actor.items.find(i => i.type === 'class');
      profile.class = classItem?.name || null;
      SWSELogger.log(`[BGSuggest] _buildCharacterProfile: Class from actor items`, {
        className: profile.class,
        classItem: classItem?.name
      });
    } else {
      SWSELogger.log(`[BGSuggest] _buildCharacterProfile: No class found in either pendingData or actor items`);
    }

    // Get species
    profile.species = pendingData?.species || actor?.system?.species || null;

    // Get highest ability and abilities
    const abilities = pendingData?.abilities || actor?.system?.attributes || {};
    for (const [key, ability] of Object.entries(abilities)) {
      const total = ability.total || ability.value || (key === 'int' ? 10 : ability.base || 10);
      if (total > profile.highestAbilityScore) {
        profile.highestAbilityScore = total;
        profile.highestAbility = key.toUpperCase().substring(0, 3); // STR, DEX, etc.
      }
    }

    // Get trained skills
    profile.trainedSkills = (pendingData?.trainedSkills || []).map(s => s.toLowerCase());

    // Get mentor biases
    profile.mentorBiases = pendingData?.mentorBiases || {};

    return profile;
  }

  /**
   * Score a background based on character profile
   * @private
   */
  static _scoringBackground(background, profile) {
    let tier = BACKGROUND_SUGGESTION_TIERS.FALLBACK;
    let reason = BACKGROUND_TIER_REASONS[0];
    let score = 0;

    // CLASS SYNERGY: Check if background's relevant skills match class
    if (profile.class && background.relevantSkills) {
      const classSkillMatches = this._countClassSkillMatches(profile.class, background.relevantSkills);
      if (classSkillMatches > 0) {
        tier = Math.max(tier, BACKGROUND_SUGGESTION_TIERS.CLASS_SYNERGY);
        reason = BACKGROUND_TIER_REASONS[3];
        score += classSkillMatches * 0.5;
      }
    }

    // ABILITY SYNERGY: Check if relevant skills match character's high abilities
    if (background.relevantSkills) {
      const abilityMatches = this._countAbilityMatches(background.relevantSkills, profile.highestAbility);
      if (abilityMatches > 0) {
        tier = Math.max(tier, BACKGROUND_SUGGESTION_TIERS.ABILITY_SYNERGY);
        if (tier >= BACKGROUND_SUGGESTION_TIERS.ABILITY_SYNERGY) {
          reason = BACKGROUND_TIER_REASONS[2];
        }
        score += abilityMatches * 0.3;
      }
    }

    // THEME SYNERGY: Check if background aligns with mentor biases/themes
    if (profile.mentorBiases && Object.keys(profile.mentorBiases).length > 0) {
      const themeMatch = this._checkThemeAlignment(background, profile.mentorBiases);
      if (themeMatch) {
        tier = Math.max(tier, BACKGROUND_SUGGESTION_TIERS.THEME_SYNERGY);
        if (tier >= BACKGROUND_SUGGESTION_TIERS.THEME_SYNERGY && reason === BACKGROUND_TIER_REASONS[0]) {
          reason = BACKGROUND_TIER_REASONS[2];
        }
        score += 0.4;
      }
    }

    // SPECIES SYNERGY: Check if background fits species narrative
    if (profile.species && this._isSpeciesBackground(background, profile.species)) {
      tier = Math.max(tier, BACKGROUND_SUGGESTION_TIERS.SPECIES_SYNERGY);
      if (tier === BACKGROUND_SUGGESTION_TIERS.SPECIES_SYNERGY) {
        reason = BACKGROUND_TIER_REASONS[1.5];
      }
      score += 0.2;
    }

    // LANGUAGE BONUS: If background offers bonus language
    if (background.bonusLanguage) {
      tier = Math.max(tier, BACKGROUND_SUGGESTION_TIERS.LANGUAGE_BONUS);
      if (tier === BACKGROUND_SUGGESTION_TIERS.LANGUAGE_BONUS) {
        reason = BACKGROUND_TIER_REASONS[1];
      }
      score += 0.1;
    }

    // Apply mentor biases to influence scoring
    if (profile.mentorBiases?.control) {score += 0.2;}
    if (profile.mentorBiases?.pragmatic) {score += 0.15;}
    if (profile.mentorBiases?.riskTolerance) {score += 0.1;}

    return {
      tier,
      reason,
      score,
      icon: BACKGROUND_TIER_ICONS[tier] || ''
    };
  }

  /**
   * Count how many of a background's skills match the class's trained skills
   * @private
   */
  static _countClassSkillMatches(className, backgroundSkills) {
    // Map of class → commonly trained skills (simplified)
    const classSkillMap = {
      'Jedi': ['lightsaber', 'force', 'awareness', 'perception', 'acrobatics'],
      'Soldier': ['weapons', 'armor', 'tactics', 'climb', 'swim'],
      'Scout': ['stealth', 'survival', 'perception', 'acrobatics', 'knowledge'],
      'Scoundrel': ['deception', 'stealth', 'sleight of hand', 'perception', 'persuasion'],
      'Tech Specialist': ['mechanics', 'computers', 'knowledge', 'perception', 'technology'],
      'Noble': ['persuasion', 'deception', 'knowledge', 'gather information', 'gatherinformation']
    };

    const classSkills = classSkillMap[className] || [];
    if (!classSkills.length) {
      SWSELogger.warn(`[BGSuggest] _countClassSkillMatches: No match for className "${className}"`, {
        availableClasses: Object.keys(classSkillMap),
        classNameType: typeof className
      });
    }
    const matches = backgroundSkills.filter(s =>
      classSkills.some(cs => s.toLowerCase().includes(cs.toLowerCase()) || cs.toLowerCase().includes(s.toLowerCase()))
    ).length;
    if (matches > 0) {
      SWSELogger.log(`[BGSuggest] _countClassSkillMatches: Found ${matches} skill matches for class "${className}"`);
    }
    return matches;
  }

  /**
   * Count how many background skills match character's highest ability
   * @private
   */
  static _countAbilityMatches(backgroundSkills, highestAbility) {
    // Map of ability → skills that use that ability
    const abilitySkillMap = {
      'STR': ['climb', 'swim', 'jump', 'break'],
      'DEX': ['acrobatics', 'stealth', 'sleight of hand', 'initiative'],
      'CON': ['endurance', 'stamina'],
      'INT': ['knowledge', 'mechanics', 'computers', 'science'],
      'WIS': ['perception', 'survival', 'sense motive', 'insight'],
      'CHA': ['persuasion', 'deception', 'gather information', 'gatherinformation', 'bluff']
    };

    const abilitySkills = abilitySkillMap[highestAbility] || [];
    return backgroundSkills.filter(s =>
      abilitySkills.some(as => s.toLowerCase().includes(as.toLowerCase()) || as.toLowerCase().includes(s.toLowerCase()))
    ).length;
  }

  /**
   * Check if background theme aligns with mentor biases
   * @private
   */
  static _checkThemeAlignment(background, mentorBiases) {
    // Simple check: does background have relevant skills for mentor's emphasized areas
    if (!background.relevantSkills) {return false;}

    const hasSocialBias = mentorBiases.social || mentorBiases.persuasion;
    const hasStealthBias = mentorBiases.stealth;
    const hasTechBias = mentorBiases.tech;

    const skillSet = background.relevantSkills.map(s => s.toLowerCase()).join(' ');

    if (hasSocialBias && (skillSet.includes('persuasion') || skillSet.includes('deception'))) {return true;}
    if (hasStealthBias && skillSet.includes('stealth')) {return true;}
    if (hasTechBias && (skillSet.includes('mechanics') || skillSet.includes('computer'))) {return true;}

    return Object.keys(mentorBiases).some(bias => skillSet.includes(bias.toLowerCase()));
  }

  /**
   * Check if background fits the character's species
   * @private
   */
  static _isSpeciesBackground(background, species) {
    // Check if background narrative mentions or suits the species
    const narrative = (background.narrativeDescription || '').toLowerCase();
    const bgName = (background.name || '').toLowerCase();
    const combined = `${bgName} ${narrative}`;

    // Species-specific background indicators (simplified)
    const speciesIndicators = {
      'Human': ['military', 'politics', 'bureaucracy', 'urban'],
      'Cerean': ['knowledge', 'science', 'philosophy'],
      'Droid': ['technology', 'mechanics', 'service', 'slave', 'free'],
      'Kel Dor': ['warrior', 'pilot', 'merchant'],
      'Miraluka': ['force', 'sensitive', 'blind'],
      'Mirialan': ['spiritual', 'mystic', 'tattoo'],
      'Rodian': ['bounty', 'hunter', 'merchant'],
      'Trandoshan': ['bounty', 'hunter', 'warrior'],
      'Twi\'lek': ['dancer', 'slave', 'free'],
      'Wookiee': ['warrior', 'honor', 'tribe']
    };

    const indicators = speciesIndicators[species] || [];
    return indicators.some(indicator => combined.includes(indicator));
  }

  /**
   * Sort backgrounds by suggestion tier
   * @static
   */
  static sortBySuggestion(backgrounds) {
    return backgrounds.sort((a, b) => {
      const tierDiff = (b.suggestion?.tier || 0) - (a.suggestion?.tier || 0);
      if (tierDiff !== 0) {return tierDiff;}
      return (b.suggestion?.score || 0) - (a.suggestion?.score || 0);
    });
  }
}

export default BackgroundSuggestionEngine;
