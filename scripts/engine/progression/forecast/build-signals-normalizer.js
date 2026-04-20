/**
 * Build Signals Normalizer — Phase 4 Work Package D
 *
 * Normalizes build signals into a canonical domain structure.
 * Distinguishes explicit (declared) from inferred (computed) signals.
 *
 * Signal Sources:
 * - L1 Survey answers (explicit archetype/role/goal)
 * - Class/species/background choice (explicit identity)
 * - Prior feat/talent selections (inferred style)
 * - Attribute distribution (inferred role)
 * - Mentor tags (inferred preference)
 *
 * Output Schema:
 * {
 *   explicit: {
 *     archetypeTags: [string],     // Player declared: 'Warrior', 'Mage', etc.
 *     roleTags: [string],           // Player declared: 'Melee', 'Ranged', 'Support'
 *     targetTags: [string],         // Player declared: 'Jedi Knight', 'Sith Lord'
 *     mentorTags: [string],         // Survey selected mentor: 'Obi-Wan', 'Yoda'
 *     surveyAnswers: {}             // Raw survey data
 *   },
 *   inferred: {
 *     archetypeTags: [string],      // Computed from class/choices
 *     roleTags: [string],           // Computed from attributes
 *     combatStyleTags: [string],    // Computed from feats/talents
 *     forceTags: [string],          // Computed from force selections
 *     shipTags: [string],           // Computed from starship selections
 *     droidTags: [string],          // Computed from droid selections
 *     socialTags: [string]          // Computed from social choices
 *   },
 *   targets: {
 *     prestige: [string],           // Prestige classes player is working toward
 *     talentTrees: [string],        // Primary talent trees
 *     forceDomains: [string],       // Force domains
 *     shipSpecialties: [string]     // Starship specializations
 *   }
 * }
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class BuildSignalsNormalizer {
  /**
   * Normalize build signals from progression context.
   *
   * @param {Object} context - { progressionSession, projectedCharacter, actor }
   * @returns {Object} Normalized signals
   */
  static normalizeSignals(context = {}) {
    const signals = {
      explicit: {
        archetypeTags: [],
        roleTags: [],
        targetTags: [],
        mentorTags: [],
        surveyAnswers: {},
      },
      inferred: {
        archetypeTags: [],
        roleTags: [],
        combatStyleTags: [],
        forceTags: [],
        shipTags: [],
        droidTags: [],
        socialTags: [],
      },
      targets: {
        prestige: [],
        talentTrees: [],
        forceDomains: [],
        shipSpecialties: [],
      },
    };

    try {
      // Extract explicit signals from survey/session
      if (context.progressionSession?.draftSelections?.survey) {
        this._extractExplicitFromSurvey(
          context.progressionSession.draftSelections.survey,
          signals.explicit
        );
      }

      // Extract inferred signals from projection
      if (context.projectedCharacter) {
        this._extractInferredFromProjection(
          context.projectedCharacter,
          signals.inferred
        );
      }

      // Extract target signals
      if (context.progressionSession || context.projectedCharacter) {
        this._extractTargets(
          context.progressionSession,
          context.projectedCharacter,
          signals.targets
        );
      }

      swseLogger.debug('[BuildSignalsNormalizer] Signals normalized:', {
        explicitCount: Object.values(signals.explicit).filter(v => Array.isArray(v) && v.length > 0).length,
        inferredCount: Object.values(signals.inferred).filter(v => Array.isArray(v) && v.length > 0).length,
      });
    } catch (err) {
      swseLogger.error('[BuildSignalsNormalizer] Error normalizing signals:', err);
    }

    return signals;
  }

  /**
   * Extract explicit signals from survey answers.
   * @private
   */
  static _extractExplicitFromSurvey(survey, explicit) {
    if (!survey || typeof survey !== 'object') return;

    explicit.surveyAnswers = { ...survey };

    // Map survey fields to signal tags
    if (survey.archetypeChoice) {
      explicit.archetypeTags.push(survey.archetypeChoice);
    }

    if (survey.roleChoice) {
      explicit.roleTags.push(survey.roleChoice);
    }

    if (survey.prestigeTarget) {
      explicit.targetTags.push(survey.prestigeTarget);
    }

    if (survey.mentorChoice) {
      explicit.mentorTags.push(survey.mentorChoice);
    }

    // Extract multiple-choice answers
    if (Array.isArray(survey.favoredStats)) {
      explicit.roleTags.push(...survey.favoredStats);
    }

    if (Array.isArray(survey.combatStyles)) {
      explicit.roleTags.push(...survey.combatStyles);
    }
  }

  /**
   * Extract inferred signals from projected character.
   * @private
   */
  static _extractInferredFromProjection(projection, inferred) {
    if (!projection) return;

    // Infer archetype from class
    if (projection.identity?.class) {
      const archetype = this._inferArchetypeFromClass(projection.identity.class);
      if (archetype) inferred.archetypeTags.push(archetype);
    }

    // Infer role from attributes
    if (projection.attributes) {
      const role = this._inferRoleFromAttributes(projection.attributes);
      if (role) inferred.roleTags.push(role);
    }

    // Infer combat style from feats
    if (projection.abilities?.feats) {
      const combatStyles = this._inferCombatStylesFromFeats(projection.abilities.feats);
      inferred.combatStyleTags.push(...combatStyles);
    }

    // Infer force specialization
    if (projection.abilities?.forcePowers || projection.abilities?.forceTechniques) {
      const forceTags = this._inferForceSpecialization(
        projection.abilities.forcePowers,
        projection.abilities.forceTechniques
      );
      inferred.forceTags.push(...forceTags);
    }

    // Infer social tags from skills
    if (projection.skills?.trained) {
      const socialTags = this._inferSocialTags(projection.skills.trained);
      inferred.socialTags.push(...socialTags);
    }
  }

  /**
   * Extract long-term targets from session/projection.
   * @private
   */
  static _extractTargets(session, projection, targets) {
    if (!session && !projection) return;

    // planned: Prestige class targets from survey or inferred path
    // Would integrate with prestige-delay-calculator and target registry

    // planned: Talent tree targets from survey or projected selections

    // planned: Force domain targets if Force user

    // planned: Starship targets if starship selected
  }

  /**
   * Infer archetype from class name.
   * @private
   */
  static _inferArchetypeFromClass(className) {
    const map = {
      'Soldier': 'Warrior',
      'Scout': 'Rogue',
      'Scoundrel': 'Rogue',
      'Jedi': 'Force User',
      'Force Adept': 'Force User',
      'Smuggler': 'Rogue',
      'Diplomat': 'Diplomat',
      'Gunslinger': 'Gunslinger',
    };

    return map[className] || null;
  }

  /**
   * Infer primary role from attribute distribution.
   * @private
   */
  static _inferRoleFromAttributes(attributes) {
    if (!attributes || typeof attributes !== 'object') return null;

    const str = attributes.str || 10;
    const dex = attributes.dex || 10;
    const int = attributes.int || 10;
    const wis = attributes.wis || 10;
    const cha = attributes.cha || 10;

    // Find highest attribute
    const highest = Math.max(str, dex, int, wis, cha);

    if (str === highest) return 'Melee';
    if (dex === highest) return 'Ranged';
    if (int === highest) return 'Technical';
    if (wis === highest) return 'Perception';
    if (cha === highest) return 'Social';

    return null;
  }

  /**
   * Infer combat style from feat selections.
   * @private
   */
  static _inferCombatStylesFromFeats(feats) {
    const styles = [];

    if (!Array.isArray(feats)) return styles;

    const featNames = feats.map(f => (typeof f === 'string' ? f : f.name || f.id || '').toLowerCase());

    // Look for combat style indicators
    const meleeIndicators = ['power attack', 'weapon focus', 'cleave', 'great cleave'];
    const rangedIndicators = ['point blank shot', 'far shot', 'improved aim', 'weapon focus (ranged)'];
    const defensiveIndicators = ['armor proficiency', 'defensive stance', 'shield'];

    if (meleeIndicators.some(ind => featNames.some(f => f.includes(ind)))) {
      styles.push('Melee-focused');
    }
    if (rangedIndicators.some(ind => featNames.some(f => f.includes(ind)))) {
      styles.push('Ranged-focused');
    }
    if (defensiveIndicators.some(ind => featNames.some(f => f.includes(ind)))) {
      styles.push('Defensive');
    }

    return styles;
  }

  /**
   * Infer force specialization from power/technique selections.
   * @private
   */
  static _inferForceSpecialization(powers, techniques) {
    const tags = [];

    // planned: Map powers and techniques to domains (Control, Sense, Alter)
    // and specializations (Lightsaber, Enhancement, etc.)

    return tags;
  }

  /**
   * Infer social tags from skill training.
   * @private
   */
  static _inferSocialTags(trainedSkills) {
    const tags = [];

    if (!Array.isArray(trainedSkills)) return tags;

    const skillNames = trainedSkills.map(s => (typeof s === 'string' ? s : s.name || s.id || '').toLowerCase());

    if (skillNames.some(s => s.includes('persuade') || s.includes('charm'))) {
      tags.push('Charismatic');
    }
    if (skillNames.some(s => s.includes('deception'))) {
      tags.push('Deceptive');
    }
    if (skillNames.some(s => s.includes('knowledge'))) {
      tags.push('Scholarly');
    }
    if (skillNames.some(s => s.includes('stealth'))) {
      tags.push('Sneaky');
    }

    return tags;
  }

  /**
   * Check if signals match a target/goal.
   *
   * @param {Object} signals - Normalized signals
   * @param {string} targetId - Target identifier
   * @returns {number} Match score (0-10)
   */
  static scoreSignalMatchForTarget(signals, targetId) {
    if (!signals || !targetId) return 0;

    let score = 0;

    // Check explicit target match (highest weight)
    if (signals.explicit?.targetTags?.includes(targetId)) {
      score += 10;
    }

    // Check archetype match (medium weight)
    const allArchetypes = [...(signals.explicit?.archetypeTags || []), ...(signals.inferred?.archetypeTags || [])];
    if (this._targetMatchesArchetype(targetId, allArchetypes)) {
      score += 5;
    }

    // Check role match (lower weight)
    const allRoles = [...(signals.explicit?.roleTags || []), ...(signals.inferred?.roleTags || [])];
    if (this._targetMatchesRole(targetId, allRoles)) {
      score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * Check if target matches any archetype.
   * @private
   */
  static _targetMatchesArchetype(targetId, archetypes) {
    // planned: Wire to target registry for proper matching
    // Simple placeholder for now
    return false;
  }

  /**
   * Check if target matches any role.
   * @private
   */
  static _targetMatchesRole(targetId, roles) {
    // planned: Wire to target registry for proper matching
    return false;
  }
}
