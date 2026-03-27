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

export class ProjectionEngine {
  /**
   * Build a projected character from progression session state.
   *
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Actor} actor - Original actor (for immutable snapshot reference)
   * @returns {Object} Projected character object
   */
  static buildProjection(progressionSession, actor) {
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
        derived: this._projectDerived(draftSelections, progressionSession),
      };

      // Add metadata
      projection.metadata = {
        projectedAt: Date.now(),
        fromSession: !!progressionSession,
        actorId: actor?.id || null,
        mode: progressionSession.mode || 'chargen',
      };

      swseLogger.debug('[ProjectionEngine] Projection built:', {
        identity: projection.identity,
        skillsCount: projection.skills.trained?.length || 0,
        featsCount: projection.abilities.feats?.length || 0,
      });

      return projection;
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
   * Project attributes (str, dex, con, int, wis, cha).
   *
   * @private
   */
  static _projectAttributes(draftSelections) {
    const attrSelection = draftSelections.attributes;
    if (!attrSelection || !attrSelection.values) {
      return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    }

    return {
      str: attrSelection.values.str || 10,
      dex: attrSelection.values.dex || 10,
      con: attrSelection.values.con || 10,
      int: attrSelection.values.int || 10,
      wis: attrSelection.values.wis || 10,
      cha: attrSelection.values.cha || 10,
    };
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
   * Project derived state (warnings, grants, etc.).
   *
   * @private
   */
  static _projectDerived(draftSelections, session) {
    return {
      warnings: this._computeProjectionWarnings(draftSelections, session),
      grants: {}, // TODO: Compute what identity/class/feats grant
      projectStatus: 'complete',
    };
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
