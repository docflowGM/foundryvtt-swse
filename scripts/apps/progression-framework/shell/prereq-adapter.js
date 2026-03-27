/**
 * PrereqAdapter — Phase 3
 *
 * Converts projected character state into a mock actor context that
 * PrerequisiteChecker can use for legality evaluation.
 *
 * This allows legality checks to see the draft selections instead of just
 * the immutable actor snapshot.
 *
 * Usage:
 *   const mockActor = PrereqAdapter.buildEvaluationContext(
 *     projection,
 *     progressionSession,
 *     actorSnapshot
 *   );
 *   const assessment = AbilityEngine.evaluateAcquisition(mockActor, candidateFeat);
 *
 * The mock actor is a shallow copy of the snapshot with projected selections
 * reflected in actor.items and actor.system.
 */

import { swseLogger } from '../../../utils/logger.js';

export class PrereqAdapter {
  /**
   * Build a mock actor context for prerequisite evaluation.
   *
   * @param {Object} projection - Projected character from ProjectionEngine
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Actor} actorSnapshot - Immutable actor from start of progression
   * @returns {Object} Mock actor object safe for PrerequisiteChecker
   */
  static buildEvaluationContext(projection, progressionSession, actorSnapshot) {
    try {
      // Start with a shallow copy of the snapshot to preserve its baseline
      const mockActor = this._cloneActorForEvaluation(actorSnapshot);

      // Apply projected selections to the mock
      this._applyProjectedIdentity(mockActor, projection);
      this._applyProjectedAttributes(mockActor, projection);
      this._applyProjectedAbilities(mockActor, projection);
      this._applyProjectedSkills(mockActor, projection);

      swseLogger.debug('[PrereqAdapter] Evaluation context built:', {
        level: mockActor.system?.level,
        featsCount: mockActor.items?.filter(i => i.type === 'feat').length || 0,
        talentsCount: mockActor.items?.filter(i => i.type === 'talent').length || 0,
      });

      return mockActor;
    } catch (err) {
      swseLogger.error('[PrereqAdapter] Error building evaluation context:', err);
      // Return snapshot as fallback (safe degradation)
      return actorSnapshot;
    }
  }

  /**
   * Create a shallow copy of actor suitable for evaluation.
   * @private
   */
  static _cloneActorForEvaluation(actor) {
    if (!actor) {
      return { items: [], system: {} };
    }

    // Shallow copy the actor and its system
    const mockActor = {
      id: actor.id || null,
      name: actor.name || 'Draft Character',
      type: actor.type || 'character',
      system: {
        ...(actor.system || {}),
        // These will be overwritten by projected state
        level: actor.system?.level || 1,
        bab: actor.system?.bab || 0,
        skills: { ...(actor.system?.skills || {}) },
        progression: {
          ...(actor.system?.progression || {}),
          trainedSkills: [],
          feats: [],
          talents: [],
        },
      },
      items: Array.isArray(actor.items) ? [...actor.items] : [],
    };

    return mockActor;
  }

  /**
   * Apply projected identity (species, class, background) to mock actor.
   * @private
   */
  static _applyProjectedIdentity(mockActor, projection) {
    if (!projection?.identity) return;

    // Update actor name to reflect class selection if chargen
    if (projection.identity.class) {
      const className = this._extractName(projection.identity.class);
      // Don't overwrite name; just track it in system
      mockActor.system.projectedClass = className;
    }
  }

  /**
   * Apply projected attributes (level, BAB) to mock actor.
   * @private
   */
  static _applyProjectedAttributes(mockActor, projection) {
    if (!projection?.attributes) return;

    // For now, in chargen, we haven't changed class yet so level/BAB are 1/0.
    // In levelup, these would be computed from the selected class.
    // This is a placeholder for future work when we compute level/BAB from projection.

    // Projected attributes (str, dex, con, etc.) would affect ability checks
    // but PrerequisiteChecker doesn't directly check ability scores yet.
    // Store them for future use.
    mockActor.system.projectedAttributes = { ...projection.attributes };
  }

  /**
   * Apply projected abilities (feats, talents, force powers) to mock actor.
   * @private
   */
  static _applyProjectedAbilities(mockActor, projection) {
    if (!projection?.abilities) return;

    // Get current items of each type
    const currentFeats = mockActor.items?.filter(i => i.type === 'feat') || [];
    const currentTalents = mockActor.items?.filter(i => i.type === 'talent') || [];
    const currentPowers = mockActor.items?.filter(i => i.type === 'power') || [];

    // Convert projected feats to item-like objects and append
    if (projection.abilities.feats && Array.isArray(projection.abilities.feats)) {
      const projectedFeatItems = projection.abilities.feats
        .filter(f => !currentFeats.some(cf => cf.name === f.name || cf.id === f.id))
        .map(f => this._normalizeAbilityToItem('feat', f));
      mockActor.items.push(...projectedFeatItems);
    }

    // Convert projected talents to item-like objects and append
    if (projection.abilities.talents && Array.isArray(projection.abilities.talents)) {
      const projectedTalentItems = projection.abilities.talents
        .filter(t => !currentTalents.some(ct => ct.name === t.name || ct.id === t.id))
        .map(t => this._normalizeAbilityToItem('talent', t));
      mockActor.items.push(...projectedTalentItems);
    }

    // Convert projected force powers to item-like objects and append
    if (projection.abilities.forcePowers && Array.isArray(projection.abilities.forcePowers)) {
      const projectedPowerItems = projection.abilities.forcePowers
        .filter(p => !currentPowers.some(cp => cp.name === p.name || cp.id === p.id))
        .map(p => this._normalizeAbilityToItem('power', p));
      mockActor.items.push(...projectedPowerItems);
    }

    // Also add to progression arrays for pending legality checks
    if (projection.abilities.feats) {
      mockActor.system.progression.feats = projection.abilities.feats
        .map(f => f.name || f.id || f)
        .filter(f => typeof f === 'string');
    }

    if (projection.abilities.talents) {
      mockActor.system.progression.talents = projection.abilities.talents
        .map(t => t.name || t.id || t)
        .filter(t => typeof t === 'string');
    }
  }

  /**
   * Apply projected skills to mock actor.
   * @private
   */
  static _applyProjectedSkills(mockActor, projection) {
    if (!projection?.skills) return;

    // Add trained skills from projection to the progression.trainedSkills array
    const trained = projection.skills.trained || [];
    if (Array.isArray(trained)) {
      mockActor.system.progression.trainedSkills = trained
        .map(s => s.name || s.id || s)
        .filter(s => typeof s === 'string');
    }

    // Also add to actor.system.skills as trained for compatibility
    // (some prereq checks read from actor.system.skills)
    if (mockActor.system.skills && typeof mockActor.system.skills === 'object') {
      for (const skillKey of trained) {
        if (typeof skillKey === 'string') {
          // Normalize skill key to format used in actor.system.skills
          const normalizedKey = skillKey.toLowerCase().replace(/\s+/g, '');
          mockActor.system.skills[normalizedKey] = mockActor.system.skills[normalizedKey] || {};
          mockActor.system.skills[normalizedKey].trained = true;
        }
      }
    }
  }

  /**
   * Convert a projected ability (from projection) to an item-like object.
   * @private
   */
  static _normalizeAbilityToItem(type, ability) {
    return {
      type,
      id: ability.id || ability.name || 'unknown',
      name: ability.name || ability.id || 'Unknown',
      system: {
        slug: this._slugify(ability.name || ability.id),
        ...((typeof ability === 'object' && ability.system) ? ability.system : {}),
      },
    };
  }

  /**
   * Extract name from identity object (which can be {id, name} or just string).
   * @private
   */
  static _extractName(identity) {
    if (!identity) return null;
    if (typeof identity === 'string') return identity;
    if (typeof identity === 'object') return identity.name || identity.id || null;
    return null;
  }

  /**
   * Convert a string to slug format.
   * @private
   */
  static _slugify(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
