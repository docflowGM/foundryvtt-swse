/**
 * ProjectionEngine — Phase 3
 *
 * Derives a projected character from:
 * - Actor snapshot (immutable baseline)
 * - Normalized draft selections (what the player chose)
 * - Derived entitlements (what they earned)
 * - Active node state (what's available)
 *
 * The projected character is:
 * - DERIVED (not editable directly)
 * - REBUILDABLE (recomputes after any commit)
 * - AUTHORITATIVE for review/summary
 * - STABLE (same between summary and apply)
 *
 * Usage:
 *   const projection = ProjectionEngine.buildProjection(progressionSession, actor);
 *   // → {identity, attributes, skills, abilities, languages, droid, derived, ...}
 *
 * This replaces:
 * - Summary's manual aggregation
 * - Finalizer's ad hoc reconstruction
 * - Any other place inferring draft character state
 */

import { swseLogger } from '../../../utils/logger.js';
import { SpeciesRegistry } from '../../../engine/registries/species-registry.js';

export class ProjectionEngine {
  /**
   * Build a projected character from progression session state.
   * ASYNC: Awaits subtype adapter contributions for beast/droid/nonheroic paths.
   *
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Actor} actor - Original actor (for immutable snapshot reference)
   * @returns {Promise<Object>} Projected character object
   */
  static async buildProjection(progressionSession, actor) {
    try {
      if (!progressionSession || !progressionSession.draftSelections) {
        swseLogger.warn('[ProjectionEngine] No draft selections available');
        return this._buildEmptyProjection();
      }

      const draftSelections = progressionSession.draftSelections;

      // Start with identity
      const projection = {
        identity: this._projectIdentity(draftSelections),
        attributes: this._projectAttributes(draftSelections),
        skills: this._projectSkills(draftSelections),
        abilities: this._projectAbilities(draftSelections),
        languages: this._projectLanguages(draftSelections),
        droid: this._projectDroid(draftSelections),
        beast: this._projectBeast(draftSelections),
        nonheroic: this._projectNonheroic(draftSelections),
        derived: this._projectDerived(draftSelections, progressionSession),
      };

      // Add metadata
      projection.metadata = {
        projectedAt: Date.now(),
        fromSession: !!progressionSession,
        actorId: actor?.id || null,
        mode: progressionSession.mode || 'chargen',
      };

      // Route through adapter seam for subtype-specific projection contribution
      // FIXED: Now properly awaits async adapter contributions
      const adapter = progressionSession.subtypeAdapter;
      let finalProjection = projection;
      if (adapter) {
        finalProjection = await adapter.contributeProjection(projection, progressionSession, actor);
      }

      swseLogger.debug('[ProjectionEngine] Projection built:', {
        identity: finalProjection.identity,
        skillsCount: finalProjection.skills?.trained?.length || 0,
        featsCount: finalProjection.abilities?.feats?.length || 0,
        adapterContributed: !!adapter,
      });

      return finalProjection;
    } catch (err) {
      swseLogger.error('[ProjectionEngine] Error building projection:', err);
      return this._buildEmptyProjection();
    }
  }

  /**
   * Project identity (species, class, background).
   *
   * @private
   */
  static _projectIdentity(draftSelections) {
    return {
      species: draftSelections.species?.id || draftSelections.species?.name || null,
      class: draftSelections.class?.id || draftSelections.class?.name || null,
      background: draftSelections.background?.id || draftSelections.background?.name || null,
    };
  }

  /**
   * Project attributes (str, dex, con, int, wis, cha) with modifiers.
   * Returns normalized format: { str: { score, modifier }, dex: { score, modifier }, ... }
   * Modifier computed as (score - 10) / 2, rounded down.
   *
   * FIXED: Now applies species modifiers from SpeciesRegistry to staged attribute scores.
   * This ensures the summary rail shows species-adjusted values, not base values.
   *
   * @private
   */
  static _projectAttributes(draftSelections) {
    const attrSelection = draftSelections.attributes;

    // Get staged attribute scores (or base 10 if not set)
    const scores = {
      str: attrSelection?.values?.str || 10,
      dex: attrSelection?.values?.dex || 10,
      con: attrSelection?.values?.con || 10,
      int: attrSelection?.values?.int || 10,
      wis: attrSelection?.values?.wis || 10,
      cha: attrSelection?.values?.cha || 10,
    };

    // Apply species modifiers if a species is selected
    if (draftSelections.species?.id) {
      try {
        const species = SpeciesRegistry.getById(draftSelections.species.id);
        if (species?.abilityScores) {
          // Apply species modifiers to the staged scores
          const mods = species.abilityScores;
          Object.keys(scores).forEach(ability => {
            scores[ability] += (mods[ability] || 0);
          });
        }
      } catch (err) {
        swseLogger.warn('[ProjectionEngine] Error applying species modifiers:', err);
        // Fall back to unmodified scores if species lookup fails
      }
    }

    // Compute normalized format with scores and modifiers
    const normalized = {};
    Object.entries(scores).forEach(([key, score]) => {
      normalized[key] = {
        score,
        modifier: Math.floor((score - 10) / 2),
      };
    });

    return normalized;
  }

  /**
   * Project skills (trained from selection + granted from class/background/feats).
   *
   * @private
   */
  static _projectSkills(draftSelections) {
    const skillsSelection = draftSelections.skills;
    const trained = Array.isArray(skillsSelection?.trained) ? skillsSelection.trained : [];

    // TODO (Phase 3): Compute granted skills from class/background/feats
    const granted = [];

    return {
      trained,
      granted,
      total: {}, // Preview-only; leave empty for Phase 3
    };
  }

  /**
   * Project abilities (feats, talents, force powers, etc.).
   *
   * @private
   */
  static _projectAbilities(draftSelections) {
    return {
      feats: this._normalizeAbilityList(draftSelections.feats),
      talents: this._normalizeAbilityList(draftSelections.talents),
      forcePowers: this._normalizeAbilityList(draftSelections.forcePowers),
      forceTechniques: this._normalizeAbilityList(draftSelections.forceTechniques),
      forceSecrets: this._normalizeAbilityList(draftSelections.forceSecrets),
      starshipManeuvers: this._normalizeAbilityList(draftSelections.starshipManeuvers),
    };
  }

  /**
   * Helper: normalize ability list to {id, name, source} format.
   *
   * @private
   */
  static _normalizeAbilityList(abilityList) {
    if (!Array.isArray(abilityList)) {
      return [];
    }

    return abilityList.map(ability => {
      if (typeof ability === 'string') {
        return { id: ability, name: ability, source: 'selected' };
      }
      return {
        id: ability.id || ability,
        name: ability.name || ability.id || ability,
        source: ability.source || 'selected',
      };
    });
  }

  /**
   * Project languages (from selection + granted).
   *
   * @private
   */
  static _projectLanguages(draftSelections) {
    const languagesSelection = draftSelections.languages;
    if (!Array.isArray(languagesSelection)) {
      return [];
    }

    return languagesSelection.map(lang => {
      if (typeof lang === 'string') {
        return { id: lang, name: lang };
      }
      return {
        id: lang.id || lang,
        name: lang.name || lang.id || lang,
      };
    });
  }

  /**
   * Project droid configuration (if applicable).
   *
   * @private
   */
  static _projectDroid(draftSelections) {
    const droidSelection = draftSelections.droid;
    if (!droidSelection) {
      return null;
    }

    return {
      credits: droidSelection.droidCredits?.total || 0,
      remaining: droidSelection.droidCredits?.remaining || 0,
      systems: droidSelection.systems || [],
      buildState: droidSelection.buildState || {},
    };
  }

  /**
   * Project beast configuration (if applicable).
   * ADAPTER CONTRIBUTION: Adapter can override/enhance this with actual beast data.
   *
   * @private
   */
  static _projectBeast(draftSelections) {
    const beastSelection = draftSelections.beast;
    if (!beastSelection) {
      return null;
    }

    return {
      type: beastSelection.type || null,
      buildState: beastSelection.buildState || {},
    };
  }

  /**
   * Project nonheroic configuration (if applicable).
   * ADAPTER CONTRIBUTION: Adapter can override/enhance this with actual profession data.
   *
   * @private
   */
  static _projectNonheroic(draftSelections) {
    const nonheroicSelection = draftSelections.nonheroic;
    if (!nonheroicSelection) {
      return null;
    }

    return {
      profession: nonheroicSelection.profession || null,
      buildState: nonheroicSelection.buildState || {},
    };
  }

  /**
   * Project derived state (warnings, grants, credits, etc.).
   *
   * @private
   */
  static _projectDerived(draftSelections, session) {
    return {
      warnings: this._computeProjectionWarnings(draftSelections, session),
      grants: {}, // TODO: Compute what identity/class/feats grant
      credits: this._computeCredits(draftSelections),
      projectStatus: 'complete',
    };
  }

  /**
   * Compute available credits from class and background selections.
   * Returns the total credits available for equipment purchase.
   * TODO: Link to actual item definitions to look up credit values by class/background.
   *
   * @private
   */
  static _computeCredits(draftSelections) {
    // PLACEHOLDER: Return default credits or 0 if class not selected
    // In a complete implementation, would look up class.credits and background.credits values
    const classCredits = draftSelections.class?.credits || 0;
    const backgroundCredits = draftSelections.background?.credits || 0;
    return classCredits + backgroundCredits;
  }

  /**
   * Compute warnings/issues with the current projection.
   *
   * @private
   */
  static _computeProjectionWarnings(draftSelections, session) {
    const warnings = [];

    // Check for missing critical selections in chargen
    if (session.mode === 'chargen') {
      if (!draftSelections.species && !draftSelections.droid) {
        warnings.push('Missing species selection');
      }
      if (!draftSelections.class) {
        warnings.push('Missing class selection');
      }
      if (!draftSelections.attributes) {
        warnings.push('Missing attribute assignment');
      }
    }

    // Check for dirty/invalidated nodes
    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      warnings.push(`${session.dirtyNodes.size} node(s) require re-validation`);
    }

    return warnings;
  }

  /**
   * Build an empty projection (fallback when no selections).
   *
   * @private
   */
  static _buildEmptyProjection() {
    return {
      identity: { species: null, class: null, background: null },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      skills: { trained: [], granted: [], total: {} },
      abilities: {
        feats: [],
        talents: [],
        forcePowers: [],
        forceTechniques: [],
        forceSecrets: [],
        starshipManeuvers: [],
      },
      languages: [],
      droid: null,
      derived: {
        warnings: ['No selections yet'],
        grants: {},
        projectStatus: 'incomplete',
      },
      metadata: {
        projectedAt: Date.now(),
        fromSession: false,
        actorId: null,
        mode: 'chargen',
      },
    };
  }
}
