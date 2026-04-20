/**
 * MutationPlan — Phase 3
 *
 * Defines the authoritative schema and compilation pipeline for character mutations.
 * Separates validation (can we apply this?) from application (apply it).
 *
 * A MutationPlan is compiled from a projection and contains:
 * - Explicit list of mutations to apply (add/update/remove items)
 * - Validation status before applying
 * - Metadata about sources and intent
 *
 * This replaces ad-hoc mutation application in progression-finalizer
 * with an explicit, inspectable, and testable contract.
 *
 * Usage:
 *   const plan = MutationPlan.compileFromProjection(projection, actor);
 *   const validation = plan.validate();
 *   if (validation.isValid) {
 *     await plan.apply(actor);
 *   }
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * MutationPlan schema:
 *   {
 *     // Source of truth
 *     projection: Object,
 *     actor: Actor,
 *     compiledAt: timestamp,
 *
 *     // Mutations to apply (structured contract)
 *     mutations: {
 *       identity: { species, class, background },
 *       attributes: { str, dex, con, int, wis, cha },
 *       items: [
 *         { action: 'add'|'update'|'remove', type, data }
 *       ],
 *       system: {
 *         level, bab, skills, languages, etc.
 *       }
 *     },
 *
 *     // Validation state
 *     validated: boolean,
 *     validationErrors: string[],
 *     validationWarnings: string[],
 *
 *     // Metadata
 *     source: 'chargen'|'levelup',
 *     mode: 'chargen'|'levelup',
 *     metadata: { ... }
 *   }
 */

export class MutationPlan {
  /**
   * Compile a mutation plan from a projection.
   * This is the main entry point for creating mutation plans.
   *
   * @param {Object} projection - Projected character from ProjectionEngine
   * @param {Actor} actor - Live actor to apply mutations to
   * @param {Object} options - Compilation options
   * @returns {MutationPlan} Unvalidated mutation plan
   */
  static compileFromProjection(projection, actor, options = {}) {
    try {
      const plan = {
        projection,
        actor,
        compiledAt: Date.now(),

        // Mutations to apply
        mutations: {
          identity: this._compileIdentityMutations(projection),
          attributes: this._compileAttributeMutations(projection),
          items: this._compileItemMutations(projection, actor),
          system: this._compileSystemMutations(projection, actor),
        },

        // Validation state (not yet validated)
        validated: false,
        validationErrors: [],
        validationWarnings: [],

        // Metadata
        source: projection?.metadata?.mode || 'chargen',
        mode: options.mode || projection?.metadata?.mode || 'chargen',
        metadata: {
          compiledAt: Date.now(),
          fromProjection: !!projection,
          actorId: actor?.id || null,
        },
      };

      swseLogger.debug('[MutationPlan] Compiled from projection:', {
        identityMutations: plan.mutations.identity,
        itemCount: plan.mutations.items?.length || 0,
        systemKeys: Object.keys(plan.mutations.system),
      });

      return plan;
    } catch (err) {
      swseLogger.error('[MutationPlan] Error compiling from projection:', err);
      // Return empty plan on error
      return this._buildEmptyPlan(actor);
    }
  }

  /**
   * Validate the mutation plan before applying.
   * Returns validation result without modifying the plan.
   *
   * @param {Object} plan - MutationPlan to validate
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(plan) {
    if (!plan) {
      return { isValid: false, errors: ['No plan provided'], warnings: [] };
    }

    const errors = [];
    const warnings = [];

    // Check required mutations
    if (!plan.mutations?.identity?.class) {
      errors.push('Class selection is required');
    }

    if (!plan.mutations?.attributes || Object.keys(plan.mutations.attributes).length === 0) {
      errors.push('Attributes must be assigned');
    }

    // Check item mutations are well-formed
    if (Array.isArray(plan.mutations?.items)) {
      for (const mutation of plan.mutations.items) {
        if (!mutation.action || !mutation.type) {
          errors.push(`Malformed item mutation: missing action or type`);
        }
        if (!['add', 'update', 'remove'].includes(mutation.action)) {
          errors.push(`Invalid item mutation action: ${mutation.action}`);
        }
      }
    }

    // Warnings (non-blocking)
    if (!plan.mutations?.identity?.species && !plan.actor?.system?.species) {
      warnings.push('No species selected; droid build may be pending');
    }

    // Store validation result in plan
    plan.validated = true;
    plan.validationErrors = errors;
    plan.validationWarnings = warnings;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Apply the mutation plan to the actor.
   * Must call validate() first and check isValid.
   *
   * @param {Object} plan - MutationPlan to apply (must be validated)
   * @param {Actor} actor - Actor to mutate
   * @returns {Promise<{success: boolean, appliedMutations: number, errors: string[]}>}
   */
  static async apply(plan, actor) {
    if (!plan) {
      return { success: false, appliedMutations: 0, errors: ['No plan provided'] };
    }

    if (!plan.validated) {
      const validation = this.validate(plan);
      if (!validation.isValid) {
        return { success: false, appliedMutations: 0, errors: validation.errors };
      }
    }

    try {
      let appliedMutations = 0;

      // Apply identity mutations
      if (plan.mutations?.identity) {
        await this._applyIdentityMutations(actor, plan.mutations.identity);
        appliedMutations++;
      }

      // Apply attribute mutations
      if (plan.mutations?.attributes && Object.keys(plan.mutations.attributes).length > 0) {
        await this._applyAttributeMutations(actor, plan.mutations.attributes);
        appliedMutations++;
      }

      // Apply item mutations (add/update/remove)
      if (Array.isArray(plan.mutations?.items)) {
        for (const mutation of plan.mutations.items) {
          await this._applyItemMutation(actor, mutation);
          appliedMutations++;
        }
      }

      // Apply system mutations
      if (plan.mutations?.system && Object.keys(plan.mutations.system).length > 0) {
        await this._applySystemMutations(actor, plan.mutations.system);
        appliedMutations++;
      }

      swseLogger.log('[MutationPlan] Applied successfully:', {
        actor: actor.name,
        mutations: appliedMutations,
      });

      return { success: true, appliedMutations, errors: [] };
    } catch (err) {
      swseLogger.error('[MutationPlan] Error applying plan:', err);
      return { success: false, appliedMutations: 0, errors: [err.message] };
    }
  }

  // ============================================================================
  // Mutation Compilation Helpers
  // ============================================================================

  /**
   * Compile identity mutations (species, class, background).
   * @private
   */
  static _compileIdentityMutations(projection) {
    if (!projection?.identity) return {};

    return {
      species: projection.identity.species || null,
      class: projection.identity.class || null,
      background: projection.identity.background || null,
    };
  }

  /**
   * Compile attribute mutations (str, dex, con, int, wis, cha).
   * @private
   */
  static _compileAttributeMutations(projection) {
    if (!projection?.attributes) return {};

    return { ...projection.attributes };
  }

  /**
   * Compile item mutations (feats, talents, powers, etc.).
   * @private
   */
  static _compileItemMutations(projection, actor) {
    const mutations = [];

    if (!projection?.abilities) return mutations;

    // Get current items on actor
    const currentFeats = (actor?.items || []).filter(i => i.type === 'feat').map(i => i.name);
    const currentTalents = (actor?.items || []).filter(i => i.type === 'talent').map(i => i.name);
    const currentPowers = (actor?.items || []).filter(i => i.type === 'power').map(i => i.name);

    // Add mutations for projected feats (only if not already on actor)
    if (Array.isArray(projection.abilities.feats)) {
      for (const feat of projection.abilities.feats) {
        const featName = feat.name || feat.id || feat;
        if (!currentFeats.includes(featName)) {
          mutations.push({
            action: 'add',
            type: 'feat',
            data: { name: featName, source: feat.source || 'selected' },
          });
        }
      }
    }

    // Add mutations for projected talents
    if (Array.isArray(projection.abilities.talents)) {
      for (const talent of projection.abilities.talents) {
        const talentName = talent.name || talent.id || talent;
        if (!currentTalents.includes(talentName)) {
          mutations.push({
            action: 'add',
            type: 'talent',
            data: { name: talentName, source: talent.source || 'selected' },
          });
        }
      }
    }

    // Add mutations for projected force powers
    if (Array.isArray(projection.abilities.forcePowers)) {
      for (const power of projection.abilities.forcePowers) {
        const powerName = power.name || power.id || power;
        if (!currentPowers.includes(powerName)) {
          mutations.push({
            action: 'add',
            type: 'power',
            data: { name: powerName, source: power.source || 'selected' },
          });
        }
      }
    }

    return mutations;
  }

  /**
   * Compile system mutations (level, BAB, skills, etc.).
   * @private
   */
  static _compileSystemMutations(projection, actor) {
    const mutations = {};

    // Add level/BAB mutations (computed from class selection in future phases)
    // For now, just placeholder
    if (projection?.derived?.grants) {
      mutations.grants = projection.derived.grants;
    }

    // Add skill mutations
    if (projection?.skills?.trained && Array.isArray(projection.skills.trained)) {
      mutations.trainedSkills = projection.skills.trained;
    }

    // Add language mutations
    if (projection?.languages && Array.isArray(projection.languages)) {
      mutations.languages = projection.languages.map(lang => lang.id || lang);
    }

    return mutations;
  }

  // ============================================================================
  // Mutation Application Helpers
  // ============================================================================

  /**
   * Apply identity mutations to actor.
   * @private
   */
  static async _applyIdentityMutations(actor, identity) {
    // Store projected identity for reference
    // Actual mutations depend on ActorEngine implementation
    if (!actor.system) actor.system = {};
    actor.system.projectedIdentity = {
      species: identity.species,
      class: identity.class,
      background: identity.background,
    };
  }

  /**
   * Apply attribute mutations to actor.
   * @private
   */
  static async _applyAttributeMutations(actor, attributes) {
    // Update actor ability scores
    if (actor.system && typeof attributes === 'object') {
      if (attributes.str) actor.system.abilities = actor.system.abilities || {};
      // Details depend on actor system schema
      actor.system.projectedAttributes = { ...attributes };
    }
  }

  /**
   * Apply a single item mutation to actor.
   * @private
   */
  static async _applyItemMutation(actor, mutation) {
    // planned: Wire into ActorEngine for actual item creation/removal
    // For now, just log the intent
    swseLogger.debug('[MutationPlan] Item mutation:', {
      action: mutation.action,
      type: mutation.type,
      name: mutation.data?.name,
    });
  }

  /**
   * Apply system mutations to actor.
   * @private
   */
  static async _applySystemMutations(actor, systemMutations) {
    // Update actor system fields
    if (actor.system && typeof systemMutations === 'object') {
      for (const [key, value] of Object.entries(systemMutations)) {
        if (value !== undefined && value !== null) {
          actor.system[key] = value;
        }
      }
    }
  }

  /**
   * Build an empty/default mutation plan.
   * @private
   */
  static _buildEmptyPlan(actor) {
    return {
      projection: null,
      actor,
      compiledAt: Date.now(),
      mutations: {
        identity: {},
        attributes: {},
        items: [],
        system: {},
      },
      validated: false,
      validationErrors: ['Empty plan'],
      validationWarnings: [],
      source: 'chargen',
      mode: 'chargen',
      metadata: {
        compiledAt: Date.now(),
        fromProjection: false,
        actorId: actor?.id || null,
      },
    };
  }
}
