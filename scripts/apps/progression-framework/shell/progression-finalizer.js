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
import { ProgressionDocumentTargetPolicy } from '../policies/progression-document-target-policy.js';
// PHASE 3: Species materialization
import { applyCanonicalSpeciesToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js';

export class ProgressionFinalizer {
  /**
   * Perform a dry-run: compile and validate mutation plan without applying.
   * Used for summary preview, testing, and debugging.
   *
   * @param {Object} sessionState - Shell progression session
   * @param {Actor} actor - Character actor
   * @returns {Promise<{success: boolean, plan?: Object, validation?: Object, error?: string}>}
   */
  static async dryRun(sessionState, actor) {
    try {
      swseLogger.log('[ProgressionFinalizer] Dry-run initiated', {
        mode: sessionState.mode,
        actorId: actor.id,
      });

      // Validation step 1: readiness
      this._validateReadiness(sessionState);

      // Validation step 2: subtype adapter
      const adapter = sessionState.progressionSession?.subtypeAdapter;
      if (adapter) {
        await adapter.validateReadiness(sessionState.progressionSession, actor);
      }

      // Validation step 3: document type
      this._validateDocumentType(actor, sessionState.progressionSession);

      // Compilation
      const mutationPlan = await this._compileMutationPlan(sessionState, actor);

      // Validation step 4: adapter mutation plan
      let finalPlan = mutationPlan;
      if (adapter) {
        finalPlan = await adapter.contributeMutationPlan(
          mutationPlan,
          sessionState.progressionSession,
          actor
        );
      }

      // Validation step 5: validate compiled plan
      const validation = this._validateMutationPlan(finalPlan, actor);

      swseLogger.log('[ProgressionFinalizer] Dry-run successful', {
        planValid: validation.isValid,
        warnings: validation.warnings.length,
      });

      return {
        success: true,
        plan: finalPlan,
        validation,
      };
    } catch (error) {
      swseLogger.warn('[ProgressionFinalizer] Dry-run failed', error);
      return {
        success: false,
        error: error.message || 'Dry-run validation failed',
      };
    }
  }

  /**
   * Finalize progression with transaction safety.
   * Validates completely BEFORE applying ANY mutations.
   * If validation fails at ANY point → returns error without mutation.
   *
   * @param {Object} sessionState - Shell progression session
   * @param {Actor} actor - Character actor being progressed
   * @param {Object} options - Optional overrides
   * @returns {Promise<{success: boolean, result?: Object, error?: string}>}
   */
  static async finalize(sessionState, actor, options = {}) {
    try {
      swseLogger.log('[ProgressionFinalizer] Finalization initiated (transaction-safe)', {
        mode: sessionState.mode,
        actorId: actor.id,
        actorName: actor.name,
      });

      // PHASE 1: Validate readiness
      this._validateReadiness(sessionState);

      // PHASE 2: Route subtype-specific readiness checks through adapter
      const adapter = sessionState.progressionSession?.subtypeAdapter;
      if (adapter) {
        await adapter.validateReadiness(sessionState.progressionSession, actor);
      }

      // PHASE 3: Validate actor document type matches progression subtype
      this._validateDocumentType(actor, sessionState.progressionSession);

      // PHASE 4: Compile the authoritative mutation plan (WITHOUT applying yet)
      const mutationPlan = await this._compileMutationPlan(sessionState, actor, options);

      // PHASE 5: Route through adapter seam for subtype-specific mutation plan contribution
      let finalMutationPlan = mutationPlan;
      if (adapter) {
        finalMutationPlan = await adapter.contributeMutationPlan(
          mutationPlan,
          sessionState.progressionSession,
          actor
        );
      }

      // CRITICAL: Validate the complete mutation plan BEFORE applying anything
      const validation = this._validateMutationPlan(finalMutationPlan, actor);
      if (!validation.isValid) {
        // Validation failed — ABORT without mutation
        const errors = validation.errors.join('; ');
        swseLogger.error('[ProgressionFinalizer] Mutation plan validation failed — ABORTING finalization', {
          errors: validation.errors,
          warnings: validation.warnings,
        });
        throw new Error(`Mutation plan invalid: ${errors}`);
      }

      swseLogger.log('[ProgressionFinalizer] All validations passed — proceeding to mutation', {
        hasCoreData: !!finalMutationPlan.coreData,
        patchCount: Object.keys(finalMutationPlan.patches || {}).length,
        itemGrantCount: finalMutationPlan.itemGrants?.length || 0,
        warningCount: validation.warnings.length,
      });

      // ONLY NOW: Apply mutations through ActorEngine (no turning back)
      const result = await this._applyMutationPlan(actor, finalMutationPlan);

      if (!result.success) {
        // ActorEngine failed — log but don't throw (mutations may be partially applied)
        swseLogger.error('[ProgressionFinalizer] ActorEngine failed during finalization', {
          error: result.error,
          actorId: actor.id,
        });
        return result;
      }

      swseLogger.log('[ProgressionFinalizer] Finalization successful', {
        actorId: actor.id,
        actorName: actor.name,
      });

      return { success: true, result: { actorId: actor.id } };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Finalization aborted (no mutations applied)', error);
      return {
        success: false,
        error: error.message || 'Finalization failed',
      };
    }
  }

  /**
   * Validate a compiled mutation plan.
   * Checks for:
   * - required fields present
   * - no conflicting mutations
   * - ActorEngine can handle it
   *
   * @param {Object} mutationPlan
   * @param {Actor} actor
   * @returns {Object} {isValid: boolean, errors: [], warnings: []}
   * @private
   */
  static _validateMutationPlan(mutationPlan, actor) {
    const errors = [];
    const warnings = [];

    if (!mutationPlan) {
      errors.push('Mutation plan is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Check for critical fields
    if (!mutationPlan.set && !mutationPlan.add && !mutationPlan.create && !mutationPlan.delete) {
      warnings.push('Mutation plan has no operations (empty set/add/create/delete)');
    }

    // Validate set operations
    if (mutationPlan.set) {
      for (const [key, value] of Object.entries(mutationPlan.set)) {
        if (key.startsWith('system.') && typeof value === 'object' && value !== null) {
          // System fields should be primitives, not objects (usually)
          if (!Array.isArray(value) && !(value instanceof Date)) {
            warnings.push(`Mutation sets system field '${key}' to object — may cause issues`);
          }
        }
      }
    }

    // Validate items
    if (mutationPlan.add && mutationPlan.add.items) {
      for (const item of mutationPlan.add.items) {
        if (!item.name) {
          errors.push('Item in mutation plan missing name');
        }
        if (!item.type) {
          errors.push('Item in mutation plan missing type');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
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
    if (!sessionState.mode || !['chargen', 'levelup', 'follower'].includes(sessionState.mode)) {
      throw new Error('Invalid progression mode');
    }
    // Allow null actor for follower mode (actor is created during progression)
    if (!sessionState.actor && sessionState.mode !== 'follower') {
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
   * PHASE 2.X (Document Targeting): Validate actor document type matches progression subtype.
   * Ensures actors are finalized with the correct document/sheet type from the start.
   *
   * @param {Actor} actor - Actor being finalized
   * @param {Object} progressionSession - Canonical progression session
   * @throws {Error} If actor document type does not match progression subtype
   * @private
   */
  static _validateDocumentType(actor, progressionSession) {
    if (!actor || !progressionSession) {
      return; // Skip validation if missing context
    }

    // Detect progression subtype from session
    const subtype = progressionSession.subtype || 'actor';

    // Get expected document type from canonical policy
    const expectedDocType = ProgressionDocumentTargetPolicy.resolveActorDocumentType(subtype);

    // Validate actor is correct type
    if (actor.type !== expectedDocType) {
      const msg = (
        `[ProgressionFinalizer] Document type mismatch: actor "${actor.name}" is type "${actor.type}" ` +
        `but progression subtype "${subtype}" requires type "${expectedDocType}". ` +
        `Finalization cannot proceed with incorrect document type. ` +
        `Actor must be created with the correct type (${expectedDocType}) from the start.`
      );
      swseLogger.error('[ProgressionFinalizer._validateDocumentType]', msg);
      throw new Error(msg);
    }

    swseLogger.debug('[ProgressionFinalizer._validateDocumentType] Document type validated', {
      actor: actor.name,
      type: actor.type,
      subtype,
      expectedDocType,
    });
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
  static async _compileMutationPlan(sessionState, actor, options = {}) {
    // PHASE 1: REQUIRE canonical progressionSession. Fail loudly if missing.
    if (!sessionState.progressionSession) {
      throw new Error('compileMutationPlan requires canonical progressionSession');
    }

    const selections = sessionState.progressionSession.draftSelections || {};

    // Read all data from canonical session ONLY. No fallback chains.
    const summary = selections.survey || {};
    const attr = selections.attributes || {};
    const species = selections.species || null;
    const pendingSpeciesContext = selections.pendingSpeciesContext || null;
    const clazz = selections.class || null;
    const background = selections.background || null;
    const languages = selections.languages || [];
    const skills = selections.skills || [];

    const set = {};
    const add = { items: [] };
    const itemsToCreate = [];
    const itemsToDelete = [];

    const name = summary.characterName || actor.name;
    if (name) {
      set.name = name;
    }
    if (summary.startingLevel) set['system.level'] = Number(summary.startingLevel);

    // PHASE 3: Canonical species materialization
    // Use pending context from Phase 2 to materialize species durably
    if (pendingSpeciesContext) {
      const materialization = await applyCanonicalSpeciesToActor(actor, pendingSpeciesContext);
      if (materialization.success) {
        const mutations = materialization.mutations;

        // Merge system mutations
        for (const [key, value] of Object.entries(mutations)) {
          if (key.startsWith('system.') || key.startsWith('flags.')) {
            set[key] = value;
          }
        }

        // Collect natural weapons to create
        if (mutations.itemsToCreate?.length > 0) {
          itemsToCreate.push(...mutations.itemsToCreate);
        }

        // Collect items to delete (old species items)
        if (mutations.itemsToDelete?.length > 0) {
          itemsToDelete.push(...mutations.itemsToDelete);
        }

        swseLogger.log('[ProgressionFinalizer] Species materialized from pending context', {
          species: pendingSpeciesContext.identity.name,
          mutations: Object.keys(mutations).length,
          naturalWeapons: itemsToCreate.length,
        });
      } else {
        swseLogger.warn('[ProgressionFinalizer] Species materialization failed:', materialization.error);
      }
    } else if (species) {
      // Fallback: if no pending context, apply species as string (legacy compat)
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
      // Phase 3B: Canonical class storage is system.class (object)
      // Derived computes display string (system.derived.identity.className)
      // Legacy scalar paths (system.className, system.classes) remain for compatibility only
      set['system.class'] = clazz;
      // DO NOT write system.className or system.classes - these are derived/legacy
      add.items.push({ name: clazz.name || clazz.label || String(clazz), type: 'class', system: clazz.system || {} });
    }
    // Canonical stored ability path is system.abilities.<key>.base
    // Progression writes base values here; derived computes modifiers and totals
    const attrMap = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha', str: 'str', dex:'dex', con:'con', int:'int', wis:'wis', cha:'cha' };
    for (const [k,v] of Object.entries(attr || {})) {
      const key = attrMap[k];
      const val = typeof v === 'object' ? v?.value : v;
      // Write to canonical .base path (not deprecated .value)
      if (key && Number.isFinite(Number(val))) set[`system.abilities.${key}.base`] = Number(val);
    }
    // FIX 6: Extract language IDs from normalized format for canonical storage
    // normalizeLanguages() returns [{id, source}, ...] but system.languages expects [id, id, ...]
    if (Array.isArray(languages)) {
      const languageIds = languages.map(l =>
        typeof l === 'string' ? l : l?.id || l?.name
      ).filter(Boolean);
      set['system.languages'] = languageIds;
    }
    if (Array.isArray(skills)) {
      for (const s of skills) {
        const key = s?.key || s?.id || s?.skill;
        if (!key) continue;
        // Phase 3C: Initialize complete skill object with canonical schema
        // Ensures fresh characters have stable, predictable skill structure
        set[`system.skills.${key}.trained`] = s.trained !== undefined ? !!s.trained : false;
        set[`system.skills.${key}.miscMod`] = s.miscMod || 0;
        set[`system.skills.${key}.focused`] = s.focused !== undefined ? !!s.focused : false;
        set[`system.skills.${key}.selectedAbility`] = s.selectedAbility || '';
      }
    }

    // PHASE 3: Add natural weapons from species materialization
    for (const nw of itemsToCreate) {
      add.items.push({
        name: nw.name,
        type: nw.type,
        system: nw.system,
        flags: nw.flags,
        img: nw.img
      });
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
      delete: itemsToDelete.length > 0 ? { items: itemsToDelete } : {},
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

}
