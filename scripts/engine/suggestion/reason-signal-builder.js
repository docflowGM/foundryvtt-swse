/**
 * REASON SIGNAL BUILDER
 *
 * Constructs semantic reasonSignals objects from evaluation context.
 * reasonSignals capture WHY a tier was assigned without text/presentation.
 *
 * Called by evaluation methods to produce clean semantic output.
 */

export class ReasonSignalBuilder {
  /**
   * Build reasonSignals for a PRESTIGE_PREREQ suggestion
   * @param {Object} context - Evaluation context
   * @returns {Object} reasonSignals object
   */
  static prestigePrerequisite(context = {}) {
    return {
      alignment: 'prestige',
      prestigeSupport: true,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['prestige', 'prerequisite']
    };
  }

  /**
   * Build reasonSignals for CHAIN_CONTINUATION
   */
  static chainContinuation(context = {}) {
    return {
      alignment: 'none',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: true,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['chain', 'continuation']
    };
  }

  /**
   * Build reasonSignals for SKILL_PREREQ_MATCH
   */
  static skillPrerequisiteMatch(context = {}) {
    return {
      alignment: 'none',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['skill', 'prerequisite']
    };
  }

  /**
   * Build reasonSignals for ABILITY_PREREQ_MATCH
   */
  static abilityPrerequisiteMatch(context = {}) {
    return {
      alignment: 'none',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: context.matchedAttributes || [],
      matchedSkills: [],
      matchedTags: ['ability', 'prerequisite']
    };
  }

  /**
   * Build reasonSignals for CLASS_SYNERGY
   */
  static classSynergy(context = {}) {
    return {
      alignment: 'archetype',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: [],
      matchedTags: ['class', 'synergy']
    };
  }

  /**
   * Build reasonSignals for ARCHETYPE_RECOMMENDATION
   */
  static archetypeRecommendation(context = {}) {
    return {
      alignment: 'archetype',
      prestigeSupport: false,
      mechanicalSynergy: context.hasMechanicalSynergy || false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: context.mentorBiasType || null,
      conviction: context.conviction || 0,
      matchedAttributes: context.matchedAttributes || [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['archetype', 'recommendation']
    };
  }

  /**
   * Build reasonSignals for MENTOR_BIAS_MATCH (Tier 3)
   */
  static mentorBiasMatch(context = {}) {
    return {
      alignment: 'mentor',
      prestigeSupport: false,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: context.biasType || null,
      conviction: context.conviction || 0.5,
      matchedAttributes: [],
      matchedSkills: [],
      matchedTags: ['mentor', 'bias', context.biasType || 'unknown'].filter(Boolean)
    };
  }

  /**
   * Build reasonSignals for PRESTIGE_SIGNAL (Tier 3)
   */
  static prestigeSignal(context = {}) {
    return {
      alignment: 'prestige',
      prestigeSupport: true,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: context.conviction || 0.5,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['prestige', 'signal']
    };
  }

  /**
   * Build reasonSignals for META_SYNERGY
   */
  static metaSynergy(context = {}) {
    return {
      alignment: 'none',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['synergy', 'meta']
    };
  }

  /**
   * Build reasonSignals for MARTIAL_ARTS
   */
  static martialArts(context = {}) {
    return {
      alignment: 'archetype',
      prestigeSupport: false,
      mechanicalSynergy: true,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: 'melee',
      conviction: 0.8,
      matchedAttributes: context.matchedAttributes || ['str', 'dex'],
      matchedSkills: [],
      matchedTags: ['martial', 'arts', 'melee']
    };
  }

  /**
   * Build reasonSignals for SPECIES_EARLY
   */
  static speciesEarly(context = {}) {
    return {
      alignment: 'archetype',
      prestigeSupport: false,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: context.matchedSkills || [],
      matchedTags: ['species', 'heritage']
    };
  }

  /**
   * Build reasonSignals for WISHLIST_PATH
   */
  static wishlistPath(context = {}) {
    return {
      alignment: 'prestige',
      prestigeSupport: false,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: [],
      matchedTags: ['wishlist', 'goal']
    };
  }

  /**
   * Build reasonSignals for FALLBACK
   */
  static fallback(context = {}) {
    return {
      alignment: null,
      prestigeSupport: false,
      mechanicalSynergy: false,
      chainContinuation: false,
      deviation: false,
      mentorBiasType: null,
      conviction: 0,
      matchedAttributes: [],
      matchedSkills: [],
      matchedTags: []
    };
  }

  /**
   * Factory: Build reasonSignals based on reason code
   *
   * @param {string} reasonCode - The reason code (e.g., 'PRESTIGE_PREREQ')
   * @param {Object} context - Evaluation context with optional matched attributes, skills, etc.
   * @returns {Object} reasonSignals object
   */
  static build(reasonCode, context = {}) {
    const builders = {
      'PRESTIGE_PREREQ': this.prestigePrerequisite,
      'CHAIN_CONTINUATION': this.chainContinuation,
      'SKILL_PREREQ_MATCH': this.skillPrerequisiteMatch,
      'ABILITY_PREREQ_MATCH': this.abilityPrerequisiteMatch,
      'CLASS_SYNERGY': this.classSynergy,
      'ARCHETYPE_RECOMMENDATION': this.archetypeRecommendation,
      'MENTOR_BIAS_MATCH': this.mentorBiasMatch,
      'PRESTIGE_SIGNAL': this.prestigeSignal,
      'META_SYNERGY': this.metaSynergy,
      'MARTIAL_ARTS': this.martialArts,
      'SPECIES_EARLY': this.speciesEarly,
      'WISHLIST_PATH': this.wishlistPath,
      'FALLBACK': this.fallback
    };

    const builder = builders[reasonCode];
    if (!builder) {
      console.warn(`[ReasonSignalBuilder] Unknown reason code: ${reasonCode}`);
      return this.fallback();
    }

    return builder.call(this, context);
  }
}
