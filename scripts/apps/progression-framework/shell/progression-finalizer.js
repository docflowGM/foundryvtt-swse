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
   * PHASE 1: REQUIRES canonical progressionSession. No fallback to legacy.
   *
   * @param {Object} sessionState
   * @throws {Error} if progression incomplete or canonical session missing
   */
  static _validateReadiness(sessionState) {
    if (!sessionState.mode || !['chargen', 'levelup'].includes(sessionState.mode)) {
      throw new Error('Invalid progression mode');
    }
    if (!sessionState.actor) {
      throw new Error('No actor in progression session');
    }

    // PHASE 1: REQUIRE canonical progressionSession. Fail loudly if missing.
    if (!sessionState.progressionSession) {
      throw new Error(
        'Finalization requires canonical progressionSession. ' +
        'Legacy fallback to committedSelections is no longer supported.'
      );
    }

    const session = sessionState.progressionSession;
    const selections = session.draftSelections || {};
    const summarySelection = selections.survey || {};

    // PHASE 1: Check droid build from canonical session only
    const droidBuild = selections.droid;
    if (droidBuild) {
      // If droid build was deferred but not yet finalized, block completion
      if (droidBuild.buildState?.isDeferred && !droidBuild.buildState?.isFinalized) {
        throw new Error(
          'Chargen incomplete: droid build is pending. Complete the final droid configuration before finishing.'
        );
      }

      // If droid build was marked for finalization but not confirmed, also block
      if (droidBuild.buildState?.mode === 'finalized' && !droidBuild.buildState?.isFinalized) {
        throw new Error(
          'Chargen incomplete: droid build requires confirmation. Please complete the final droid configuration step.'
        );
      }

      // PHASE 1: Enforce allowDroidOverflow setting (from canonical session)
      const allowOverflow = droidBuild.droidCredits?.allowOverflow ?? false;
      if (!allowOverflow) {
        const creditsRemaining = droidBuild.droidCredits?.remaining ?? 0;
        if (creditsRemaining < 0) {
          throw new Error(
            `Chargen incomplete: droid build exceeds budget by ${Math.abs(creditsRemaining)} credits. ` +
            `Remove systems or enable "Allow Droid Budget Overflow" in house rules to proceed.`
          );
        }
      }
    }

    if (sessionState.mode === 'chargen') {
      const hasName = !!(summarySelection.characterName || sessionState.actor?.name);
      const hasClass = !!selections.class;
      const hasAttributes = !!selections.attributes;
      if (!hasName || !hasClass || !hasAttributes) {
        throw new Error('Chargen incomplete: missing required name, class, or attributes in canonical session');
      }
    }
  }

  /**
   * Compile all committed progression state into one mutation plan.
   * PHASE 1: Reads ONLY from canonical progressionSession.draftSelections.
   * No fallback to legacy committedSelections or stepData.
   *
   * @param {Object} sessionState
   * @param {Actor} actor
   * @param {Object} options
   * @returns {Object} mutation plan
   */
  static _compileMutationPlan(sessionState, actor, options = {}) {
    // PHASE 1: REQUIRE canonical progressionSession. Fail loudly if missing.
    if (!sessionState.progressionSession) {
      throw new Error('compileMutationPlan requires canonical progressionSession');
    }

    const selections = sessionState.progressionSession.draftSelections || {};

    // Read all data from canonical session ONLY. No fallback chains.
    const summary = selections.survey || {};
    const attr = selections.attributes || {};
    const species = selections.species || null;
    const clazz = selections.class || null;
    const background = selections.background || null;
    const languages = selections.languages || [];
    const skills = selections.skills || [];

    const set = {};
    const add = { items: [] };

    const name = summary.characterName || selections.get('name') || actor.name;
    if (name) {
      set.name = name;
    }
    if (summary.startingLevel) set['system.level'] = Number(summary.startingLevel);
    if (species) {
      set['system.species'] = species;
      set['system.race'] = species;
    }
    if (background) {
      set['system.background'] = background;
      // Write back background selections to sheet-facing identity fields
      // Background category determines which field to populate
      if (background.category === 'occupation' && background.name) {
        set['system.profession'] = background.name;
      } else if (background.category === 'planet' && background.name) {
        set['system.planetOfOrigin'] = background.name;
      } else if (background.category === 'event' && background.name) {
        set['system.event'] = background.name;
      }
    }
    if (clazz) {
      set['system.class'] = clazz;
      set['system.className'] = clazz.name || clazz.label || clazz;
      set['system.classes'] = [clazz];
      add.items.push({ name: clazz.name || clazz.label || String(clazz), type: 'class', system: clazz.system || {} });
    }
    const attrMap = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha', str: 'str', dex:'dex', con:'con', int:'int', wis:'wis', cha:'cha' };
    for (const [k,v] of Object.entries(attr || {})) {
      const key = attrMap[k];
      const val = typeof v === 'object' ? v?.value : v;
      if (key && Number.isFinite(Number(val))) set[`system.abilities.${key}.value`] = Number(val);
    }
    if (Array.isArray(languages)) set['system.languages'] = languages;
    if (Array.isArray(skills)) {
      for (const s of skills) {
        const key = s?.key || s?.id || s?.skill;
        if (!key) continue;
        if (s.trained !== undefined) set[`system.skills.${key}.trained`] = !!s.trained;
      }
    }
    const appendItem = (entry, fallbackType) => {
      if (!entry) return;
      if (Array.isArray(entry)) return entry.forEach(e => appendItem(e, fallbackType));
      add.items.push({
        name: entry.name || String(entry),
        type: entry.type || fallbackType,
        system: entry.system || {},
        img: entry.img || undefined
      });
    };
    // PHASE 1: Read feats, talents, force powers from canonical session ONLY
    appendItem(selections.feats, 'feat');
    appendItem(selections.talents, 'talent');
    appendItem(selections.forcePowers, 'forcepower');
    appendItem(selections.forceTechniques, 'forcetechnique');
    appendItem(selections.forceSecrets, 'forcesecret');
    appendItem(selections.starshipManeuvers, 'maneuver');

    return {
      create: {},
      set,
      add,
      delete: {},
      metadata: {
        mode: sessionState.mode,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        sourceSession: sessionState.sessionId || 'unknown'
      }
    };
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
   * PHASE 1: Convert progressionSession.draftSelections to committenSelections-compatible Map.
   * This is a temporary adapter for backward compatibility during migration.
   *
   * @param {ProgressionSession} session
   * @returns {Map<string, *>} Map with same interface as committedSelections
   * @private
   */
  static _buildSelectionsFromSession(session) {
    const result = new Map();
    if (!session || !session.draftSelections) return result;

    const { draftSelections } = session;

    // Copy each canonical selection to the map
    for (const [key, value] of Object.entries(draftSelections)) {
      if (value !== null && value !== undefined) {
        result.set(key, value);
      }
    }

    return result;
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
      const engine = globalThis.SWSE?.ActorEngine || globalThis.game?.swse?.ActorEngine;
      if (!engine?.applyMutationPlan) {
        throw new Error('ActorEngine.applyMutationPlan unavailable');
      }
      await engine.applyMutationPlan(actor, mutationPlan);
      return { success: true, result: { actorId: actor.id } };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Mutation plan application failed', error);
      return { success: false, error: error.message };
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
