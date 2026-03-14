/**
 * ProgressionFinalizer
 *
 * Single authoritative seam for converting progression session state
 * into a clean mutation plan that ActorEngine can apply.
 *
 * CONTRACT:
 * - Input: Shell session state + actor reference
 * - Output: One authoritative mutation plan bundle
 * - No direct actor.update() or document creation
 * - All mutations flow through ActorEngine
 *
 * Architecture:
 * UI (Confirm) → ProgressionFinalizer → ActorEngine → Persistence
 */

import { swseLogger } from '../../../utils/logger.js';

export class ProgressionFinalizer {
  /**
   * Finalize progression and compile mutation plan.
   *
   * @param {Object} sessionState - Shell progression session
   * @param {Actor} actor - Character actor being progressed
   * @param {Object} options - Optional overrides
   * @returns {Promise<{success: boolean, result?: Object, error?: string}>}
   */
  static async finalize(sessionState, actor, options = {}) {
    try {
      swseLogger.log('[ProgressionFinalizer] Finalize requested', {
        mode: sessionState.mode,
        actorId: actor.id,
        actorName: actor.name,
        selectionsCount: sessionState.committedSelections?.size || 0,
        stepCount: sessionState.steps?.length || 0,
      });

      // Gate: Is progression actually complete?
      this._validateReadiness(sessionState);

      // Compile the authoritative mutation plan
      const mutationPlan = this._compileMutationPlan(
        sessionState,
        actor,
        options
      );

      swseLogger.log('[ProgressionFinalizer] Mutation plan compiled', {
        hasCoreData: !!mutationPlan.coreData,
        patchCount: Object.keys(mutationPlan.patches || {}).length,
        itemGrantCount: mutationPlan.itemGrants?.length || 0,
        hasDroidPackage: !!mutationPlan.droidPackage,
      });

      // Hand to governance layer
      swseLogger.log('[ProgressionFinalizer] Sending mutation plan to ActorEngine');

      const result = await this._applyMutationPlan(actor, mutationPlan);

      swseLogger.log('[ProgressionFinalizer] Finalization complete', {
        success: result.success,
        error: result.error,
      });

      return result;
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Finalization failed', error);
      return {
        success: false,
        error: error.message || 'Finalization failed',
      };
    }
  }

  /**
   * Validate that progression is ready to finalize.
   * Throws if not ready.
   *
   * @param {Object} sessionState
   * @throws {Error} if progression incomplete
   */
  static _validateReadiness(sessionState) {
    // Check mode
    if (!sessionState.mode || !['chargen', 'levelup'].includes(sessionState.mode)) {
      throw new Error('Invalid progression mode');
    }

    // Check actor
    if (!sessionState.actor) {
      throw new Error('No actor in progression session');
    }

    // For chargen: must have committed name, species/droid, class, background
    if (sessionState.mode === 'chargen') {
      const required = ['name', 'attribute', 'class', 'background'];
      const missing = required.filter(k => !sessionState.committedSelections?.has(k));
      if (missing.length > 0) {
        throw new Error(`Chargen incomplete: missing ${missing.join(', ')}`);
      }
    }

    // For levelup: must have class selection
    if (sessionState.mode === 'levelup') {
      if (!sessionState.committedSelections?.has('class')) {
        throw new Error('Level-up requires class selection');
      }
    }
  }

  /**
   * Compile all committed progression state into one mutation plan.
   *
   * @param {Object} sessionState
   * @param {Actor} actor
   * @param {Object} options
   * @returns {Object} mutation plan
   */
  static _compileMutationPlan(sessionState, actor, options = {}) {
    const selections = sessionState.committedSelections || new Map();

    const plan = {
      // Core identity data
      coreData: this._compileCoreData(selections, actor, sessionState),

      // System data patches
      patches: this._compilePatches(selections, actor, sessionState),

      // Item grants (feats, talents, force powers, etc.)
      itemGrants: this._compileItemGrants(selections, actor, sessionState),

      // Special case: droid package
      droidPackage: selections.get('droid-builder') || null,

      // Level-up special: HP resolution
      hpResolution: sessionState.mode === 'levelup'
        ? selections.get('hp-resolution') || null
        : null,

      // Store state if applicable
      storeState: selections.get('store-state') || null,

      // Metadata
      metadata: {
        mode: sessionState.mode,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        sourceSession: sessionState.sessionId || 'unknown',
      },
    };

    return plan;
  }

  /**
   * Compile core identity data (name, gender, etc.)
   */
  static _compileCoreData(selections, actor, sessionState) {
    const coreData = {
      name: selections.get('name') || actor.name,
    };

    // If droid, include droid-specific identity
    if (selections.has('droid-builder')) {
      const droidBuild = selections.get('droid-builder');
      coreData.isDroid = true;
      coreData.droidDegree = droidBuild.droidDegree;
      coreData.droidSize = droidBuild.droidSize;
    } else {
      coreData.isDroid = false;
    }

    return coreData;
  }

  /**
   * Compile system data patches (species, class, attributes, etc.)
   */
  static _compilePatches(selections, actor, sessionState) {
    const patches = {};

    // Species/type (biological or droid identity)
    if (selections.has('species') && !selections.has('droid-builder')) {
      patches.species = selections.get('species');
    }

    // Class selection
    if (selections.has('class')) {
      patches.class = selections.get('class');
    }

    // Attributes (may be partial in level-up)
    if (selections.has('attribute')) {
      patches.attributes = selections.get('attribute');
    }

    // Background
    if (selections.has('background')) {
      patches.background = selections.get('background');
    }

    // Languages (array of language ids)
    if (selections.has('languages')) {
      patches.languages = selections.get('languages');
    }

    // Survey answers (background flavor)
    if (selections.has('l1-survey')) {
      patches.survey = selections.get('l1-survey');
    }

    // Droid systems and credits (droid-specific)
    if (selections.has('droid-builder')) {
      const droidBuild = selections.get('droid-builder');
      patches.droidSystems = droidBuild.droidSystems;
      patches.droidCredits = droidBuild.droidCredits;
      patches.droidDegree = droidBuild.droidDegree;
      patches.droidSize = droidBuild.droidSize;
    }

    return patches;
  }

  /**
   * Compile item grants (feats, talents, force powers, etc.)
   */
  static _compileItemGrants(selections, actor, sessionState) {
    const grants = [];

    // General feats
    if (selections.has('general-feat')) {
      const feat = selections.get('general-feat');
      grants.push({
        type: 'feat',
        name: feat.name || feat,
        source: 'heroic-feat',
        grantedAt: 'chargen',
      });
    }

    // Class feats
    if (selections.has('class-feat')) {
      const feat = selections.get('class-feat');
      grants.push({
        type: 'feat',
        name: feat.name || feat,
        source: 'class-feat',
        grantedAt: 'chargen',
      });
    }

    // General talents
    if (selections.has('general-talent')) {
      const talent = selections.get('general-talent');
      grants.push({
        type: 'talent',
        name: talent.name || talent,
        source: 'heroic-talent',
        grantedAt: 'chargen',
      });
    }

    // Class talents
    if (selections.has('class-talent')) {
      const talent = selections.get('class-talent');
      grants.push({
        type: 'talent',
        name: talent.name || talent,
        source: 'class-talent',
        grantedAt: 'chargen',
      });
    }

    // Force powers (conditional)
    if (selections.has('force-powers')) {
      const powers = selections.get('force-powers');
      if (Array.isArray(powers)) {
        powers.forEach(p => {
          grants.push({
            type: 'force-power',
            name: p.name || p,
            source: 'force-power-selection',
            grantedAt: sessionState.mode,
          });
        });
      }
    }

    return grants;
  }

  /**
   * Apply the compiled mutation plan through ActorEngine.
   *
   * This is the single handoff point to the governance layer.
   * No UI code directly mutates actor after this point.
   *
   * @param {Actor} actor
   * @param {Object} mutationPlan
   * @returns {Promise<{success: boolean, result?: Object, error?: string}>}
   */
  static async _applyMutationPlan(actor, mutationPlan) {
    try {
      // Try to use ActorEngine if available
      if (globalThis.game?.swse?.ActorEngine) {
        swseLogger.log('[ProgressionFinalizer] Using ActorEngine for mutation');

        const result = await globalThis.game.swse.ActorEngine.applyMutationPlan(
          actor,
          mutationPlan
        );

        return {
          success: result.success !== false,
          result,
        };
      }

      // Fallback: Direct actor update (temporary - should be replaced by ActorEngine)
      swseLogger.warn('[ProgressionFinalizer] ActorEngine not available, using fallback mutation');

      await this._applyMutationPlanDirect(actor, mutationPlan);

      return {
        success: true,
        result: {
          actorId: actor.id,
          patched: Object.keys(mutationPlan.patches || {}).length,
          itemsGranted: mutationPlan.itemGrants?.length || 0,
        },
      };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Mutation plan application failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * TEMPORARY: Direct actor mutation fallback.
   * This is a placeholder until ActorEngine is fully integrated.
   * Should be removed once ActorEngine is the single mutation authority.
   */
  static async _applyMutationPlanDirect(actor, mutationPlan) {
    const updateData = {};

    // Apply all patches to actor.system
    if (mutationPlan.patches && Object.keys(mutationPlan.patches).length > 0) {
      Object.entries(mutationPlan.patches).forEach(([key, value]) => {
        updateData[`system.${key}`] = value;
      });
    }

    // Apply core data
    if (mutationPlan.coreData) {
      if (mutationPlan.coreData.name) {
        updateData.name = mutationPlan.coreData.name;
      }
      if (mutationPlan.coreData.isDroid !== undefined) {
        updateData['system.isDroid'] = mutationPlan.coreData.isDroid;
      }
      if (mutationPlan.coreData.droidDegree) {
        updateData['system.droidDegree'] = mutationPlan.coreData.droidDegree;
      }
      if (mutationPlan.coreData.droidSize) {
        updateData['system.droidSize'] = mutationPlan.coreData.droidSize;
      }
    }

    // Apply actor update
    if (Object.keys(updateData).length > 0) {
      await actor.update(updateData);
    }

    // Create item grants
    if (mutationPlan.itemGrants && mutationPlan.itemGrants.length > 0) {
      const itemsToCreate = mutationPlan.itemGrants.map(grant => ({
        name: grant.name,
        type: grant.type,
        system: {
          source: grant.source,
          grantedAt: grant.grantedAt,
        },
      }));

      if (itemsToCreate.length > 0) {
        await actor.createEmbeddedDocuments('Item', itemsToCreate);
      }
    }
  }
}
