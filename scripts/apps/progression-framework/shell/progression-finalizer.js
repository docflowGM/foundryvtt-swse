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
// PHASE 3: Background materialization
import { applyCanonicalBackgroundsToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-backgrounds-to-actor.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { buildClassGrantLedger } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { buildLevelUpEventContext } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';
import { MedicalSecretRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/medical/medical-secret-registry.js';
import { ActorEngine as CanonicalActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { ProgressionRules } from '/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js';
import { calculateMaxForcePointsForBuildPlan } from '/systems/foundryvtt-swse/scripts/data/force-points.js';
import { buildLevelUpEntitlementManifest } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-entitlement-manifest.js';
import { ChargenRules } from '/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js';
import {
  auditLevelUpActorAfterFinalization,
  buildLevelUpFinalizationReceipt,
  validateLevelUpRequiredSelections,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-finalization-audit.js';
import {
  filterDroidForbiddenItemSpecs,
  getDroidAcquisitionBlockReason,
  isDroidProgressionActor,
} from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js';
import { collectKnownForceSecrets, collectKnownForceTechniques, forceKnowledgeToLedgerEntries } from '/systems/foundryvtt-swse/scripts/utils/force-knowledge.js';
import { validateFinalProgressionPrerequisites } from '/systems/foundryvtt-swse/scripts/engine/progression/validation/finalization-prerequisite-validator.js';

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

      // R1 (Batch A): Re-validate selected choices against the FINAL canonical
      // session state before any mutation. Step-time `isAvailable` gating is not
      // trusted here — a post-commit backtrack/respec could have invalidated a
      // dependent pick. Fail closed on proven-illegal selections; advisory/
      // unresolved cases are surfaced as warnings, never as blockers.
      const prereqRecheck = await validateFinalProgressionPrerequisites({
        actor,
        progressionSession: sessionState.progressionSession,
        mode: sessionState.mode,
        selections: this._buildSelectionsFromSession(sessionState.progressionSession),
        manifest: finalMutationPlan?.set?.['flags.swse.levelUpEntitlementManifest'] || null,
      });
      if (!prereqRecheck.ok) {
        swseLogger.error('[ProgressionFinalizer] Finalization prerequisite re-check failed — ABORTING before mutation', {
          errors: prereqRecheck.errors,
          warnings: prereqRecheck.warnings,
        });
        throw new Error(prereqRecheck.errors.join(' '));
      }
      if (prereqRecheck.warnings.length) {
        swseLogger.warn('[ProgressionFinalizer] Finalization prerequisite re-check warnings', {
          warnings: prereqRecheck.warnings,
        });
      }

      swseLogger.log('[ProgressionFinalizer] All validations passed — proceeding to mutation', {
        hasCoreData: !!finalMutationPlan.coreData,
        patchCount: Object.keys(finalMutationPlan.patches || {}).length,
        itemGrantCount: finalMutationPlan.itemGrants?.length || 0,
        warningCount: validation.warnings.length,
      });

      // ONLY NOW: Apply mutations through ActorEngine.
      // ActorEngine.applyMutationPlan runs transactionally (see _applyMutationPlan):
      // on failure it rolls the actor back to its pre-plan snapshot and deletes any
      // CREATE-bucket actors, so a failed finalize should leave the actor unchanged.
      // Only if that rollback itself fails is error.partialMutationPossible set.
      const result = await this._applyMutationPlan(actor, finalMutationPlan);

      if (!result.success) {
        // ActorEngine failed and (best-effort) rolled back — surface the error.
        swseLogger.error('[ProgressionFinalizer] ActorEngine failed during finalization', {
          error: result.error,
          actorId: actor.id,
        });
        return result;
      }

      if (sessionState.mode === 'levelup' && !this._isReconciliationSession(sessionState)) {
        const postAudit = this._auditLevelUpFinalization(actor, finalMutationPlan, sessionState);
        if (!postAudit.ok) {
          swseLogger.error('[ProgressionFinalizer] Level-up finalization audit failed', {
            actorId: actor.id,
            actorName: actor.name,
            errors: postAudit.errors,
            warnings: postAudit.warnings,
          });
          return {
            success: false,
            error: `Level-up finalization audit failed: ${postAudit.errors.join('; ')}`,
            audit: postAudit,
          };
        }
        if (postAudit.warnings.length) {
          swseLogger.warn('[ProgressionFinalizer] Level-up finalization audit warnings', {
            actorId: actor.id,
            actorName: actor.name,
            warnings: postAudit.warnings,
          });
        }
      }

      swseLogger.log('[ProgressionFinalizer] Finalization successful', {
        actorId: actor.id,
        actorName: actor.name,
      });

      this._emitLevelUpComplete(actor, sessionState, options);

      return { success: true, result: { actorId: actor.id } };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Finalization aborted (no mutations applied)', error);
      return {
        success: false,
        error: error.message || 'Finalization failed',
      };
    }
  }

  static _emitLevelUpComplete(actor, sessionState, options = {}) {
    try {
      const mode = String(sessionState?.mode || options?.mode || '').toLowerCase();
      if (!mode.includes('level')) return;
      if (typeof Hooks === 'undefined') return;
      Hooks.callAll('swse:level-up-complete', actor, actor?.system?.level || null, {
        mode: sessionState?.mode || options?.mode || null,
        sessionState,
      });
    } catch (err) {
      swseLogger.debug('[ProgressionFinalizer] level-up-complete hook skipped', err);
    }
  }

  /**
   * Finalize one scoped progression vertebra without validating or committing the
   * entire level-up/chargen spine. This is the shared single-step seam used by
   * sheet buttons, Holonet task actions, and standalone maintenance launches.
   *
   * @param {Object} sessionState
   * @param {Actor} actor
   * @param {Object} options
   * @returns {Promise<{success:boolean,result?:object,error?:string,message?:string,sheetAnchor?:string}>}
   */
  static async finalizeSingleStep(sessionState, actor, options = {}) {
    try {
      if (!actor) throw new Error('No actor provided for single-step progression.');
      if (!sessionState?.progressionSession) throw new Error('Single-step finalization requires canonical progressionSession.');

      const stepId = options.stepId || sessionState.steps?.[0]?.stepId || sessionState.progressionSession?.currentStepId || null;
      const domain = options.domain || this.singleStepDomainForStep(stepId);
      if (!domain) throw new Error(`Unsupported single-step progression job: ${stepId || options.job || '(unknown)'}`);

      const mutationPlan = await this._compileSingleStepMutationPlan(sessionState, actor, { ...options, domain, stepId });
      const itemDomains = new Set(['feats', 'talents', 'forcePowers', 'forceRegimens', 'forceTechniques', 'forceSecrets', 'medicalSecrets', 'starshipManeuvers']);
      if (itemDomains.has(domain)) {
        const itemCount = Number(mutationPlan?.add?.items?.length || 0);
        const deleteCount = Number(mutationPlan?.delete?.items?.length || 0);
        if (itemCount <= 0 && deleteCount <= 0) throw new Error('Choose a new progression item before confirming.');
      }
      const validation = this._validateMutationPlan(mutationPlan, actor);
      if (!validation.isValid) {
        throw new Error(`Mutation plan invalid: ${validation.errors.join('; ')}`);
      }

      // R1 parity (Batch B / B9): single-step finalization (sheet buttons, Holonet
      // tasks) must fail closed on illegal picks exactly like the full finalizer.
      // Scope the re-check to the domain being finalized so unrelated stale draft
      // entries can never block a scoped job.
      if (itemDomains.has(domain)) {
        const draft = sessionState.progressionSession?.draftSelections || {};
        const scopedSelections = {};
        for (const key of itemDomains) {
          scopedSelections[key] = (key === domain && Array.isArray(draft[key])) ? draft[key] : [];
        }
        const singleStepRecheck = await validateFinalProgressionPrerequisites({
          actor,
          progressionSession: sessionState.progressionSession,
          mode: sessionState.mode || 'levelup',
          selections: scopedSelections,
        });
        if (!singleStepRecheck.ok) {
          swseLogger.error('[ProgressionFinalizer] Single-step prerequisite re-check failed — ABORTING before mutation', {
            domain,
            errors: singleStepRecheck.errors,
          });
          throw new Error(singleStepRecheck.errors.join(' '));
        }
        if (singleStepRecheck.warnings.length) {
          swseLogger.warn('[ProgressionFinalizer] Single-step prerequisite re-check warnings', {
            domain,
            warnings: singleStepRecheck.warnings,
          });
        }
      }

      const result = await this._applyMutationPlan(actor, mutationPlan);
      if (!result.success) return result;

      this._emitLevelUpComplete(actor, sessionState, options);

      return {
        success: true,
        result: { actorId: actor.id, domain, stepId },
        message: this._singleStepSuccessMessage(domain, mutationPlan),
        sheetAnchor: this.singleStepSheetAnchorForDomain(domain),
      };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Single-step finalization failed', error);
      return { success: false, error: error.message || 'Single-step finalization failed' };
    }
  }

  static singleStepDomainForStep(stepId) {
    const key = String(stepId || '').trim();
    if (!key) return null;
    if (/feat/i.test(key)) return 'feats';
    if (/talent/i.test(key)) return 'talents';
    if (key === 'attribute' || key === 'attributes') return 'attributes';
    if (key === 'background') return 'background';
    if (key === 'skills') return 'skills';
    if (key === 'languages') return 'languages';
    if (key === 'force-powers') return 'forcePowers';
    if (key === 'force-regimens') return 'forceRegimens';
    if (key === 'force-techniques') return 'forceTechniques';
    if (key === 'force-secrets') return 'forceSecrets';
    if (key === 'medical-secrets') return 'medicalSecrets';
    if (key === 'starship-maneuvers' || key === 'starship-maneuver') return 'starshipManeuvers';
    return null;
  }

  static singleStepSheetAnchorForDomain(domain) {
    const map = {
      attributes: 'ability-increases',
      feats: 'feat-ledger',
      talents: 'talent-ledger',
      forcePowers: 'force-powers',
      forceRegimens: 'force-regimens',
      forceTechniques: 'force-powers',
      forceSecrets: 'force-powers',
      medicalSecrets: 'talent-ledger',
      starshipManeuvers: 'starship-maneuvers',
      background: 'identity',
      skills: 'skills',
      languages: 'languages',
    };
    return map[domain] || null;
  }

  static _singleStepSuccessMessage(domain, mutationPlan = {}) {
    const itemCount = Number(mutationPlan?.add?.items?.length || 0);
    const labels = {
      attributes: 'Ability score increase recorded.',
      feats: itemCount ? `Added ${itemCount} feat${itemCount === 1 ? '' : 's'}.` : 'Feat selection recorded.',
      talents: itemCount ? `Added ${itemCount} talent${itemCount === 1 ? '' : 's'}.` : 'Talent selection recorded.',
      forcePowers: itemCount ? `Updated force powers.` : 'Force power selection recorded.',
      forceRegimens: itemCount ? `Updated force regimens.` : 'Force regimen selection recorded.',
      forceTechniques: itemCount ? `Updated Force techniques.` : 'Force technique selection recorded.',
      forceSecrets: itemCount ? `Updated Force secrets.` : 'Force secret selection recorded.',
      medicalSecrets: itemCount ? `Updated medical secrets.` : 'Medical secret selection recorded.',
      starshipManeuvers: itemCount ? `Updated starship maneuvers.` : 'Starship maneuver selection recorded.',
      background: 'Background selection recorded.',
      skills: 'Skill selections recorded.',
      languages: 'Language selections recorded.',
    };
    return labels[domain] || 'Progression choice resolved.';
  }

  static async _compileSingleStepMutationPlan(sessionState, actor, options = {}) {
    const domain = options.domain;
    const selections = sessionState.progressionSession?.draftSelections || {};
    await ProgressionContentAuthority.initialize?.();

    const set = {};
    const add = { items: [] };
    const update = { items: [] };
    const deletePlan = {};
    let postApply = {};

    const abilityDomains = new Set(['feats', 'talents', 'forcePowers', 'forceRegimens', 'forceTechniques', 'forceSecrets', 'medicalSecrets', 'starshipManeuvers']);
    if (abilityDomains.has(domain)) {
      const scopedSelections = {
        feats: domain === 'feats' ? (Array.isArray(selections.feats) ? selections.feats : []) : [],
        talents: domain === 'talents' ? (Array.isArray(selections.talents) ? selections.talents : []) : [],
        forcePowers: domain === 'forcePowers' ? (Array.isArray(selections.forcePowers) ? selections.forcePowers : []) : [],
        forceRegimens: domain === 'forceRegimens' ? (Array.isArray(selections.forceRegimens) ? selections.forceRegimens : []) : [],
        forceTechniques: domain === 'forceTechniques' ? (Array.isArray(selections.forceTechniques) ? selections.forceTechniques : []) : [],
        forceSecrets: domain === 'forceSecrets' ? (Array.isArray(selections.forceSecrets) ? selections.forceSecrets : []) : [],
        medicalSecrets: domain === 'medicalSecrets' ? (Array.isArray(selections.medicalSecrets) ? selections.medicalSecrets : []) : [],
        starshipManeuvers: domain === 'starshipManeuvers' ? (Array.isArray(selections.starshipManeuvers) ? selections.starshipManeuvers : []) : [],
      };
      const compiled = await this._compileProgressionAbilityItems(actor, scopedSelections, {
        ...sessionState,
        mode: 'levelup',
        sessionId: sessionState.sessionId || `single-step-${domain}-${Date.now()}`,
      });
      add.items.push(...filterDroidForbiddenItemSpecs(compiled.items || [], actor, {
        subtype: sessionState.progressionSession?.subtype,
        droidContext: sessionState.progressionSession?.droidContext,
      }));
      if (Array.isArray(compiled.deleteItems) && compiled.deleteItems.length) deletePlan.items = compiled.deleteItems;
      postApply = compiled.postApply || {};
    } else if (domain === 'attributes') {
      Object.assign(set, this._compileSingleStepAttributeSet(actor, selections.attributes || {}, options));
    } else if (domain === 'skills') {
      Object.assign(set, this._compileSingleStepSkillSet(selections.skills || []));
    } else if (domain === 'languages') {
      Object.assign(set, this._compileSingleStepLanguageSet(actor, selections.languages || []));
    } else if (domain === 'background') {
      Object.assign(set, await this._compileSingleStepBackgroundSet(actor, selections));
    } else {
      throw new Error(`Unsupported single-step progression domain: ${domain}`);
    }

    return {
      create: {},
      set,
      update,
      add,
      delete: deletePlan,
      metadata: {
        mode: 'single-step',
        domain,
        stepId: options.stepId || null,
        job: options.job || null,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        sourceSession: sessionState.sessionId || 'single-step',
        postApply,
      },
    };
  }

  static _compileSingleStepAttributeSet(actor, attr = {}, _options = {}) {
    const set = {};
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const isIncreaseMode = attr?.mode === 'levelup-ability-increase' || !!attr?.increases;

    if (!isIncreaseMode) {
      const values = attr?.finalValues || attr?.values || attr || {};
      let wrote = 0;
      for (const key of abilityKeys) {
        const value = Number(values?.[key]?.base ?? values?.[key]?.score ?? values?.[key]?.value ?? values?.[key]);
        if (!Number.isFinite(value) || value <= 0) continue;
        set[`system.attributes.${key}.base`] = Math.floor(value);
        wrote += 1;
      }
      if (!wrote) throw new Error('Choose ability scores before confirming.');
      return set;
    }

    const increases = attr?.increases || {};
    const maxPerAbility = ProgressionRules.getAbilityIncreaseAllocationMode?.() === 'allow_stacked_two' ? 2 : 1;
    const normalized = {};
    for (const key of abilityKeys) {
      const delta = Math.max(0, Math.min(maxPerAbility, Number(increases?.[key] || 0) || 0));
      if (delta <= 0) continue;
      const currentBase = Number(actor?.system?.attributes?.[key]?.base ?? actor?.system?.abilities?.[key]?.base ?? actor?.system?.abilities?.[key]?.value ?? 10) || 10;
      set[`system.attributes.${key}.base`] = currentBase + delta;
      normalized[key] = delta;
    }
    if (!Object.keys(normalized).length) throw new Error('Choose at least one ability score increase before confirming.');

    const level = Number(attr?.abilityIncreaseLevel || attr?.characterLevel || attr?.level || actor?.system?.level || actor?.system?.details?.level || 0) || null;
    const record = {
      level,
      characterLevel: level,
      increases: normalized,
      timestamp: new Date().toISOString(),
      source: 'single-step-progression',
    };
    const history = Array.isArray(actor?.system?.progression?.abilityIncreaseHistory)
      ? actor.system.progression.abilityIncreaseHistory
      : [];
    const filtered = level
      ? history.filter(entry => Number(entry?.level ?? entry?.characterLevel ?? 0) !== level)
      : history;
    set['system.progression.lastAbilityIncrease'] = record;
    set['system.progression.abilityIncreaseHistory'] = [...filtered, record]
      .sort((a, b) => Number(a?.level ?? a?.characterLevel ?? 0) - Number(b?.level ?? b?.characterLevel ?? 0));
    return set;
  }

  static _compileSingleStepSkillSet(skills = []) {
    const set = {};
    const skillEntries = this._normalizeSkillSelectionEntries(skills);
    if (!skillEntries.length) throw new Error('Choose at least one skill before confirming.');
    for (const s of skillEntries) {
      const key = this._canonicalSkillKey(s?.key || s?.id || s?.skill);
      if (!key) continue;
      set[`system.skills.${key}.trained`] = s.trained !== undefined ? !!s.trained : true;
      if (s.miscMod !== undefined) set[`system.skills.${key}.miscMod`] = s.miscMod || 0;
      if (s.focused !== undefined) set[`system.skills.${key}.focused`] = !!s.focused;
      if (s.selectedAbility !== undefined) set[`system.skills.${key}.selectedAbility`] = s.selectedAbility || '';
    }
    return set;
  }

  static _compileSingleStepLanguageSet(actor, languages = []) {
    const entries = Array.isArray(languages) ? languages : [];
    if (!entries.length) throw new Error('Choose at least one language before confirming.');
    const languageNames = entries.map(l => typeof l === 'string' ? l : l?.name || l?.label || l?.language || l?.value || l?.id || l?._id || l?.internalId || l?.slug).filter(Boolean);
    const languageIds = entries.map(l => typeof l === 'string' ? l : l?.internalId || l?._id || l?.id || l?.slug || l?.name).filter(Boolean);
    const existingLanguageNames = this._extractActorLanguageNames(actor);
    const existingLanguageIds = this._extractActorLanguageIds(actor);
    return {
      'system.languages': Array.from(new Set([...existingLanguageNames, ...languageNames])),
      'system.languageIds': Array.from(new Set([...existingLanguageIds, ...languageIds])),
    };
  }

  static async _compileSingleStepBackgroundSet(_actor, selections = {}) {
    const background = selections.background || null;
    const pendingBackgroundContext = selections.pendingBackgroundContext || background?.pendingContext || null;
    const set = {};
    if (pendingBackgroundContext) {
      const materialization = await applyCanonicalBackgroundsToActor(_actor, pendingBackgroundContext);
      if (!materialization.success) throw new Error(materialization.error || 'Background materialization failed.');
      for (const [key, value] of Object.entries(materialization.mutations || {})) {
        if (key.startsWith('system.') || key.startsWith('flags.')) set[key] = value;
      }
      return set;
    }
    if (!background) throw new Error('Choose a background before confirming.');
    if (typeof background === 'string') {
      set['system.background'] = background;
      return set;
    }
    set['system.background'] = background.name || background.label || background.id || '';
    if (background.category === 'occupation' && background.name) set['system.profession'] = background.name;
    if (background.category === 'planet' && background.name) set['system.planetOfOrigin'] = background.name;
    if (background.category === 'event' && background.name) set['system.event'] = background.name;
    return set;
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
        const droidBlockReason = getDroidAcquisitionBlockReason(actor, item, { droid: mutationPlan.set?.['system.isDroid'] ? { isDroid: true } : null });
        if (droidBlockReason) {
          errors.push(`Droid-forbidden item grant "${item.name || item.id || 'Unknown'}": ${droidBlockReason}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static _isReconciliationSession(sessionState = {}) {
    return sessionState?.progressionSession?.reconciliation?.mode === 'reconcile'
      || sessionState?.progressionSession?.mode === 'reconcile'
      || sessionState?.mode === 'reconcile';
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

    this._validateDroidForbiddenSelections(sessionState.actor, session, selections);

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
      const hasClass = !!selections.class;
      const hasAttributes = !!selections.attributes;
      if (!hasClass || !hasAttributes) {
        throw new Error('Chargen incomplete: missing required class or attributes in canonical session');
      }
      const creditMode = ProgressionRules.getStartingCreditMode?.() || 'roll';
      const autoCredits = ProgressionRules.getMaxStartingCreditsEnabled?.() === true || creditMode === 'max' || creditMode === 'maximum' || creditMode === 'average';
      const hasResolvedCredits = summarySelection.startingCreditsResolved === true || Number(summarySelection.startingCredits || 0) > 0;
      if (!autoCredits && !hasResolvedCredits) {
        throw new Error('Chargen incomplete: starting credits must be rolled or otherwise resolved before finalization');
      }
    }

    if (sessionState.mode === 'levelup' && !this._isReconciliationSession(sessionState)) {
      const hpNeedsResolution = summarySelection.hpGainResolved === false || (summarySelection.hpGainRequired === true && !summarySelection.hpGainResolved);
      if (hpNeedsResolution) {
        throw new Error('Level-up incomplete: HP gain must be resolved before finalization');
      }

      const manifest = buildLevelUpEntitlementManifest(sessionState.actor, sessionState.progressionSession);
      if (manifest.abilityIncreases.required) {
        const increases = sessionState.progressionSession?.draftSelections?.attributes?.increases || {};
        const totalAllocated = Object.values(increases).reduce((sum, value) => sum + Math.max(0, Number(value || 0) || 0), 0);
        const allowStacked = ProgressionRules.getAbilityIncreaseAllocationMode?.() === 'allow_stacked_two';
        const hasInvalidStack = !allowStacked && Object.values(increases).some((value) => Number(value || 0) > 1);
        const hasTooMuchStack = allowStacked && Object.values(increases).some((value) => Number(value || 0) > manifest.abilityIncreases.count);
        if (totalAllocated !== manifest.abilityIncreases.count || hasInvalidStack || hasTooMuchStack) {
          throw new Error(allowStacked
            ? `Level-up incomplete: allocate exactly ${manifest.abilityIncreases.count} ability increase points`
            : `Level-up incomplete: choose exactly ${manifest.abilityIncreases.count} different ability increases`);
        }
      }
      if (manifest.multiclassStartingFeat.required) {
        const feats = Array.isArray(sessionState.progressionSession?.draftSelections?.feats)
          ? sessionState.progressionSession.draftSelections.feats
          : [];
        const hasStartingFeat = feats.some((feat) => feat?.levelupGrantKind === 'multiclassStartingFeat' || feat?.system?.multiclassStartingFeat === true || feat?.source === 'multiclass-starting-feat');
        if (!hasStartingFeat) {
          throw new Error('Level-up incomplete: choose one starting feat from the new class');
        }
      }

      const levelUpChoiceErrors = validateLevelUpRequiredSelections(manifest, sessionState.progressionSession);
      if (levelUpChoiceErrors.length) {
        throw new Error(`Level-up incomplete: ${levelUpChoiceErrors.join('; ')}`);
      }
    }
  }

  static _validateDroidForbiddenSelections(actor, session, selections = {}) {
    if (!isDroidProgressionActor(actor, {
      subtype: session?.subtype,
      droidContext: session?.droidContext,
      droid: selections?.droid,
    })) {
      return;
    }

    const entries = [
      ...(Array.isArray(selections.feats) ? selections.feats : []),
      ...(Array.isArray(selections.talents) ? selections.talents : []),
      ...(Array.isArray(selections.forcePowers) ? selections.forcePowers : []),
      ...(Array.isArray(selections.forceTechniques) ? selections.forceTechniques : []),
      ...(Array.isArray(selections.forceSecrets) ? selections.forceSecrets : []),
    ];

    for (const entry of entries) {
      const reason = getDroidAcquisitionBlockReason(actor, entry, {
        subtype: session?.subtype,
        droidContext: session?.droidContext,
        droid: selections?.droid,
      });
      if (reason) {
        const name = entry?.name || entry?.label || entry?.id || String(entry || 'Unknown');
        throw new Error(`Droid progression invalid: "${name}" is not legal for droids. ${reason}`);
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
    await ProgressionContentAuthority.initialize?.();
    const levelUpManifest = sessionState.mode === 'levelup' && !this._isReconciliationSession(sessionState)
      ? buildLevelUpEntitlementManifest(actor, sessionState.progressionSession, { selectedClass: selections.class })
      : null;

    // Read all data from canonical session ONLY. No fallback chains.
    const summary = selections.survey || {};
    const attr = selections.attributes || {};
    const hasAttributeSelection = !!(selections.attributes && Object.keys(selections.attributes || {}).length);
    const attrValues = hasAttributeSelection || sessionState.mode === 'chargen' ? this._normalizeAttributeValues(attr, actor) : {};
    const species = selections.species || null;
    const pendingSpeciesContext = selections.pendingSpeciesContext || species?.pendingContext || null;
    const clazz = selections.class || null;
    const backgroundsEnabled = sessionState.mode !== 'chargen' || ChargenRules.backgroundsEnabled();
    const background = backgroundsEnabled ? (selections.background || null) : null;
    const pendingBackgroundContext = backgroundsEnabled ? (selections.pendingBackgroundContext || background?.pendingContext || null) : null;
    const languages = selections.languages || [];
    const skills = selections.skills || [];
    const isDroidProgression = isDroidProgressionActor(actor, {
      subtype: sessionState.progressionSession?.subtype,
      droidContext: sessionState.progressionSession?.droidContext,
      droid: selections.droid,
    });

    const set = {};
    const add = { items: [] };
    const update = { items: [] };
    const itemsToCreate = [];
    const itemsToDelete = [];

    if (sessionState.mode === 'chargen') {
      const name = summary.characterName || this._getUsableActorName(actor) || actor.name;
      if (name) {
        set.name = name;
      }
      if (summary.startingLevel) set['system.level'] = Number(summary.startingLevel);
    }

    // PHASE 3: Canonical species materialization
    // Use pending context from Phase 2 to materialize species durably
    if (sessionState.mode === 'chargen' && isDroidProgression) {
      // Droid Builder/Garage Construction Mode is the species-equivalent identity
      // authority for droids. Never materialize biological Species data onto a
      // droid actor, even if stale sessions contain species selections.
      set['system.species'] = '';
      set['system.race'] = '';
      set['flags.swse.progression.speciesSkippedForDroid'] = true;
    } else if (sessionState.mode === 'chargen' && pendingSpeciesContext) {
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
    } else if (sessionState.mode === 'chargen' && species) {
      // Fallback: if no pending context, apply species as string (legacy compat)
      set['system.species'] = species;
      set['system.race'] = species;
    }

    // PHASE 3: Canonical background materialization
    // Use pending context from Phase 2 to materialize backgrounds durably
    if (sessionState.mode === 'chargen' && pendingBackgroundContext) {
      const materialization = await applyCanonicalBackgroundsToActor(actor, pendingBackgroundContext);
      if (materialization.success) {
        const mutations = materialization.mutations;

        // Merge mutations into set (all background mutations are system or flags fields)
        for (const [key, value] of Object.entries(mutations)) {
          if (key.startsWith('system.') || key.startsWith('flags.')) {
            set[key] = value;
          }
        }

        swseLogger.log('[ProgressionFinalizer] Backgrounds materialized from pending context', {
          backgroundCount: pendingBackgroundContext.selectedIds?.length,
          multiMode: pendingBackgroundContext.multiMode,
          mutations: Object.keys(mutations).length,
        });
      } else {
        swseLogger.warn('[ProgressionFinalizer] Background materialization failed:', materialization.error);
      }
    } else if (sessionState.mode === 'chargen' && background) {
      // Fallback: if no pending context, apply background as string (legacy compat)
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
      const classSystemForActor = this._sanitizeClassSystemForDroid(clazz.system || {}, isDroidProgression);
      const classSelectionForActor = isDroidProgression && clazz && typeof clazz === 'object'
        ? { ...clazz, system: classSystemForActor, forceSensitive: false }
        : clazz;

      // Phase 3B: Canonical class storage is system.class (object). During
      // level-up, preserve existing identity fields and update class item/history
      // instead of replacing the actor's primary class field.
      if (sessionState.mode === 'chargen') {
        set['system.class'] = classSelectionForActor;
      }

      if (sessionState.mode === 'levelup') {
        const levelContext = buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass: clazz });
        set['system.level'] = levelContext.enteringLevel;
        set['system.progression.classLevels'] = this._buildClassLevelsAfterLevelUp(actor, clazz, levelContext);
        set['system.progression.lastLeveledClass'] = {
          characterLevel: levelContext.enteringLevel,
          classId: levelContext.selectedClassId,
          className: levelContext.selectedClassName,
          classLevel: levelContext.selectedClassNextLevel,
          timestamp: new Date().toISOString(),
        };
        set['system.progression.classLevelHistory'] = this._buildClassLevelHistoryAfterLevelUp(actor, clazz, levelContext);

        if (levelContext.existingClassItemId) {
          const classUpdate = {
            _id: levelContext.existingClassItemId,
            'system.level': levelContext.selectedClassNextLevel,
            'system.classId': clazz.id || clazz.classId || clazz.sourceId || levelContext.selectedClassId,
            'flags.swse.progression.lastLeveledAt': new Date().toISOString(),
            'flags.swse.progression.lastSourceSession': sessionState.sessionId || 'unknown',
          };
          if (isDroidProgression) classUpdate['system.forceSensitive'] = false;
          update.items.push(classUpdate);
        } else {
          add.items.push({
            name: clazz.name || clazz.label || String(clazz),
            type: 'class',
            system: {
              ...classSystemForActor,
              level: levelContext.selectedClassNextLevel || 1,
              classId: clazz.id || clazz.classId || clazz.sourceId || levelContext.selectedClassId,
            },
            flags: {
              swse: {
                progression: {
                  sourceSession: sessionState.sessionId || 'unknown',
                  selectionKey: 'class',
                  selectionId: clazz.id || clazz.sourceId || clazz.name || null,
                },
              },
            },
          });
        }
      } else {
        add.items.push({
          name: clazz.name || clazz.label || String(clazz),
          type: 'class',
          system: classSystemForActor,
          flags: {
            swse: {
              progression: {
                sourceSession: sessionState.sessionId || 'unknown',
                selectionKey: 'class',
                selectionId: clazz.id || clazz.sourceId || clazz.name || null,
              },
            },
          },
        });
      }
    }


    // Base-class surveys are completed-only recommendation signals. Draft answers
    // are intentionally not materialized so incomplete surveys cannot steer builds.
    if (selections.classSurveys && Object.keys(selections.classSurveys).length) {
      const existingSurveys = actor?.system?.swse?.classSurveyResponses || {};
      const completedSurveys = Object.fromEntries(
        Object.entries(selections.classSurveys || {}).filter(([, survey]) => survey?.completed === true)
      );
      const mergedSurveys = { ...existingSurveys, ...completedSurveys };
      const aggregateClassSurveyBias = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
      const aggregateClassSurveyIntent = {
        skillBias: [], featBias: [], talentBias: [], backgroundBias: [], prestigeClassTargets: [], detailTags: [],
        skillBiasWeights: {}, featBiasWeights: {}, talentBiasWeights: {}, backgroundBiasWeights: {}, prestigeClassWeights: {}, attributeBiasWeights: {},
      };
      const addIntentArray = (key, values = []) => {
        for (const value of values || []) if (value && !aggregateClassSurveyIntent[key].includes(value)) aggregateClassSurveyIntent[key].push(value);
      };
      const addIntentWeights = (key, values = {}) => {
        for (const [name, value] of Object.entries(values || {})) aggregateClassSurveyIntent[key][name] = (aggregateClassSurveyIntent[key][name] || 0) + Number(value || 0);
      };
      for (const survey of Object.values(mergedSurveys)) {
        if (survey?.completed !== true) continue;
        for (const layer of ['mechanicalBias', 'roleBias', 'attributeBias']) {
          for (const [key, value] of Object.entries(survey?.biasLayers?.[layer] || {})) {
            aggregateClassSurveyBias[layer][key] = (aggregateClassSurveyBias[layer][key] || 0) + Number(value || 0);
          }
        }
        const tags = survey.intentTags || {};
        addIntentArray('skillBias', tags.skillBias);
        addIntentArray('featBias', tags.featBias);
        addIntentArray('talentBias', tags.talentBias);
        addIntentArray('backgroundBias', tags.backgroundBias);
        addIntentArray('prestigeClassTargets', tags.prestigeClassTargets);
        addIntentArray('detailTags', tags.detailTags);
        addIntentWeights('skillBiasWeights', tags.skillBiasWeights);
        addIntentWeights('featBiasWeights', tags.featBiasWeights);
        addIntentWeights('talentBiasWeights', tags.talentBiasWeights);
        addIntentWeights('backgroundBiasWeights', tags.backgroundBiasWeights);
        addIntentWeights('prestigeClassWeights', tags.prestigeClassWeights);
        addIntentWeights('attributeBiasWeights', tags.attributeBiasWeights);
      }
      aggregateClassSurveyIntent.prestigeClassTarget = aggregateClassSurveyIntent.prestigeClassTargets[0] || null;
      set['system.swse.classSurveyResponses'] = mergedSurveys;
      set['system.swse.classSurveyBias'] = aggregateClassSurveyBias;
      set['system.swse.classSurveyIntentBiases'] = aggregateClassSurveyIntent;
      set['flags.foundryvtt-swse.progression.classSurveys'] = mergedSurveys;
    }

    // Prestige surveys are completed-only recommendation signals. Drafts may be
    // checkpointed in the session, but only completed payloads are materialized.
    if (selections.prestigeSurvey?.completed === true && selections.prestigeSurvey?.classId) {
      const existingPrestigeSurveys = actor?.system?.swse?.prestigeSurveyResponses || {};
      const classId = selections.prestigeSurvey.classId;
      const completedPrestigeSurvey = {
        ...selections.prestigeSurvey,
        completed: true,
        completedAt: selections.prestigeSurvey.completedAt || new Date().toISOString(),
      };
      const mergedPrestigeSurveys = {
        ...existingPrestigeSurveys,
        [classId]: completedPrestigeSurvey,
      };
      set['system.swse.prestigeSurveyResponses'] = mergedPrestigeSurveys;
      set['flags.foundryvtt-swse.progression.prestigeSurveys'] = mergedPrestigeSurveys;
      if (selections.prestigeSurvey.mergedBias) {
        set['system.swse.mentorBuildIntentBiases'] = selections.prestigeSurvey.mergedBias;
      }
    }

    // Canonical stored ability path is system.abilities.<key>.base.
    // Chargen writes final assigned scores. Level-up applies +1 deltas under
    // the configured allocation rule and never overwrites the entire ability map.
    const attrMap = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha', str: 'str', dex:'dex', con:'con', int:'int', wis:'wis', cha:'cha' };
    if (sessionState.mode === 'levelup' && attr?.mode === 'levelup-ability-increase') {
      const increases = attr.increases || {};
      for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        const maxPerAbility = ProgressionRules.getAbilityIncreaseAllocationMode?.() === 'allow_stacked_two' ? 2 : 1;
        const delta = Math.max(0, Math.min(maxPerAbility, Number(increases?.[key] || 0) || 0));
        if (delta <= 0) continue;
        const currentBase = Number(actor?.system?.attributes?.[key]?.base ?? actor?.system?.abilities?.[key]?.base ?? actor?.system?.abilities?.[key]?.value ?? 10) || 10;
        const currentRacial = Number(actor?.system?.attributes?.[key]?.racial ?? actor?.system?.abilities?.[key]?.racial ?? actor?.system?.abilities?.[key]?.species ?? 0) || 0;
        const currentTemp = Number(actor?.system?.attributes?.[key]?.temp ?? actor?.system?.abilities?.[key]?.temp ?? 0) || 0;
        const nextBase = currentBase + delta;
        const finalScore = nextBase + currentRacial + currentTemp;
        const mod = this._abilityMod(finalScore);
        // Write to canonical system.attributes; system.abilities is a read-only compatibility mirror
        set[`system.attributes.${key}.base`] = nextBase;
      }
      const abilityIncreaseRecord = {
        level: levelUpManifest?.characterLevel || null,
        characterLevel: levelUpManifest?.characterLevel || null,
        increases,
        timestamp: new Date().toISOString(),
        source: 'progression-finalizer',
      };
      const existingAbilityIncreaseHistory = Array.isArray(actor?.system?.progression?.abilityIncreaseHistory)
        ? actor.system.progression.abilityIncreaseHistory
        : [];
      const filteredAbilityIncreaseHistory = existingAbilityIncreaseHistory.filter((entry) => {
        const entryLevel = Number(entry?.level ?? entry?.characterLevel ?? 0) || 0;
        return entryLevel !== Number(abilityIncreaseRecord.level || 0);
      });
      set['system.progression.lastAbilityIncrease'] = abilityIncreaseRecord;
      set['system.progression.abilityIncreaseHistory'] = [
        ...filteredAbilityIncreaseHistory,
        abilityIncreaseRecord,
      ].sort((a, b) => Number(a?.level ?? a?.characterLevel ?? 0) - Number(b?.level ?? b?.characterLevel ?? 0));
    } else {
      const finalAttrValues = this._normalizeFinalAttributeValues(attr, attrValues, pendingSpeciesContext, actor);
      for (const [k, v] of Object.entries(attrValues || {})) {
        const key = attrMap[k];
        const val = typeof v === 'object' ? (v?.score ?? v?.base ?? v?.value ?? v?.total) : v;
        if (!key || !Number.isFinite(Number(val))) continue;
        const baseScore = Number(val);
        const finalScore = Number(finalAttrValues?.[key] ?? baseScore);
        const mod = this._abilityMod(finalScore);
        // Write to canonical system.attributes; system.abilities is a read-only compatibility mirror
        set[`system.attributes.${key}.base`] = baseScore;
      }
    }

    if (sessionState.mode === 'chargen') {
      const computedStartingHp = this._computeStartingHP(clazz, attrValues, actor, selections.droid).total;
      const startingHp = isDroidProgression
        ? computedStartingHp
        : (Number(summary.startingHp || 0) || computedStartingHp);
      if (Number.isFinite(startingHp) && startingHp > 0) {
        set['system.hp.value'] = startingHp;
        set['system.hp.max'] = startingHp;
      }

      const baseStartingCredits = this._computeStartingCredits(clazz, background);
      const explicitStartingCredits = Number(summary.startingCredits || 0) || 0;
      const wealthBonus = this._computeWealthCreditGrant(selections, actor, sessionState);
      const explicitSources = Array.isArray(summary.startingCreditsBreakdown) ? summary.startingCreditsBreakdown : [];
      const explicitIncludesWealth = explicitSources.some(source => this._normalizeNameKey(source?.label || source?.source || '') === 'wealthtalent');
      const startingCredits = explicitStartingCredits > 0
        ? explicitStartingCredits + (wealthBonus > 0 && !explicitIncludesWealth ? wealthBonus : 0)
        : baseStartingCredits + wealthBonus;
      if (Number.isFinite(startingCredits) && startingCredits > 0) {
        set['system.credits'] = this._resolveFinalStartingCredits(actor, startingCredits);
      }
      if (wealthBonus > 0) {
        set['flags.swse.progressionHistory'] = this._withWealthProgressionHistory(actor, selections, sessionState);
      }

      const startingLevel = Number(summary.startingLevel || set['system.level'] || 1) || 1;
      const startingForcePointMax = calculateMaxForcePointsForBuildPlan({
        actor,
        totalLevel: startingLevel,
        selectedClass: clazz,
        classLevels: [{
          class: clazz?.name || clazz?.label || String(clazz || 'Class'),
          classId: clazz?.id || clazz?.classId || clazz?.sourceId || this._normalizeClassKey(clazz),
          level: startingLevel,
        }],
      });
      set['system.forcePoints.max'] = startingForcePointMax;
      set['system.forcePoints.value'] = startingForcePointMax;
      set['system.progression.lastForcePointRefresh'] = {
        reason: 'chargen-finalization',
        previousValue: Number(actor?.system?.forcePoints?.value ?? 0) || 0,
        previousMax: Number(actor?.system?.forcePoints?.max ?? 0) || 0,
        newValue: startingForcePointMax,
        newMax: startingForcePointMax,
        timestamp: new Date().toISOString(),
      };

      const speciesPortrait = this._resolveSpeciesPortrait(species, pendingSpeciesContext);
      if (this._actorNeedsPortrait(actor) && speciesPortrait) {
        set.img = speciesPortrait;
      }
    }

    if (sessionState.mode === 'levelup') {
      let hpGain = Number(summary.hpGain || 0) || 0;
      if (isDroidProgression && hpGain > 0) {
        // Defense-in-depth: droids never receive Constitution bonus HP. The HP
        // generator already uses CON 0 for droids; clamp stale/manual summaries
        // to the selected class hit die maximum so a CON bonus cannot leak in.
        const hitDieOnlyMax = this._extractClassHitDie(clazz);
        if (Number.isFinite(hitDieOnlyMax) && hitDieOnlyMax > 0) {
          hpGain = Math.min(hpGain, hitDieOnlyMax);
        }
      }
      const currentHpMax = Number(actor?.system?.hp?.max ?? actor?.system?.derived?.hp?.max ?? 0) || 0;
      const currentHpValue = Number(actor?.system?.hp?.value ?? currentHpMax) || 0;
      if (hpGain > 0) {
        const nextHpMax = Math.max(1, currentHpMax + hpGain);
        const hpRecoveryMode = ProgressionRules.getLevelUpHpRecoveryMode();
        const nextHpValue = this._resolveLevelUpCurrentHp({
          currentHpValue,
          hpGain,
          nextHpMax,
          mode: hpRecoveryMode,
        });
        set['system.hp.max'] = nextHpMax;
        set['system.hp.value'] = nextHpValue;
        set['system.progression.lastHpGain'] = {
          amount: hpGain,
          method: summary.hpGainMethod || null,
          formula: summary.hpGainFormula || null,
          recoveryMode: hpRecoveryMode,
          previousValue: currentHpValue,
          previousMax: currentHpMax,
          newValue: nextHpValue,
          newMax: nextHpMax,
          timestamp: new Date().toISOString(),
        };
      }

      const targetLevel = Number(set['system.level'] || sessionState.targetLevel || sessionState.progressionSession?.targetLevel || (Number(actor?.system?.level || 1) + 1)) || 1;
      const classLevelsAfter = set['system.progression.classLevels'] || actor?.system?.progression?.classLevels || null;
      const nextForcePointMax = calculateMaxForcePointsForBuildPlan({
        actor,
        totalLevel: targetLevel,
        selectedClass: clazz,
        classLevels: classLevelsAfter,
      });
      set['system.forcePoints.max'] = nextForcePointMax;
      set['system.forcePoints.value'] = nextForcePointMax;
      set['system.progression.lastForcePointRefresh'] = {
        reason: 'level-up',
        previousValue: Number(actor?.system?.forcePoints?.value ?? 0) || 0,
        previousMax: Number(actor?.system?.forcePoints?.max ?? 0) || 0,
        newValue: nextForcePointMax,
        newMax: nextForcePointMax,
        timestamp: new Date().toISOString(),
      };

      const explicitCreditDelta = Number(summary.creditDelta || 0) || 0;
      const canonicalWealthDelta = this._computeLevelupWealthCreditGrant(actor, selections, sessionState);
      const includesWealth = this._levelupCreditDeltaIncludesWealth(summary, selections, actor) || canonicalWealthDelta > 0;
      const inferredCreditDelta = includesWealth
        ? Math.max(explicitCreditDelta, canonicalWealthDelta)
        : (explicitCreditDelta || canonicalWealthDelta);
      if (inferredCreditDelta !== 0) {
        const currentCredits = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);
        set['system.credits'] = Math.max(0, currentCredits + inferredCreditDelta);
        const rawCreditSources = Array.isArray(summary.creditDeltaSources) ? summary.creditDeltaSources : [];
        const nonWealthSources = rawCreditSources.filter(source => this._normalizeNameKey(source?.label || source?.source || '') !== 'wealthtalent');
        const creditSources = includesWealth
          ? [...nonWealthSources, { label: 'Wealth Talent', amount: inferredCreditDelta, tone: 'wealth' }]
          : (rawCreditSources.length ? rawCreditSources : [{ label: 'Progression Credits', amount: inferredCreditDelta, tone: 'credits' }]);
        set['system.progression.lastCreditDelta'] = {
          amount: inferredCreditDelta,
          sources: creditSources,
          timestamp: new Date().toISOString(),
        };
        if (includesWealth) {
          set['flags.swse.progressionHistory'] = this._withLevelupWealthProgressionHistory(actor, selections, sessionState, inferredCreditDelta);
        }
      }
    }
    // Extract language IDs from normalized format for canonical storage.
    // Chargen must materialize automatic species/background languages as well
    // as player-selected bonus languages. The language step only stores bonus
    // picks so it can count remaining selectable slots correctly.
    const selectedLanguageEntries = Array.isArray(languages) ? languages : [];
    let grantedLanguageEntries = [];
    if (sessionState.mode === 'chargen') {
      try {
        grantedLanguageEntries = await ProgressionContentAuthority.getGrantedLanguageEntries({
          speciesSelection: species,
          backgroundSelection: background,
        }) || [];
      } catch (err) {
        swseLogger.warn('[ProgressionFinalizer] Failed to resolve granted languages; continuing with selected languages only', err);
      }
    }
    const allLanguageEntries = [...grantedLanguageEntries, ...selectedLanguageEntries];
    if (sessionState.mode === 'chargen' || selectedLanguageEntries.length > 0) {
      const languageNames = allLanguageEntries.map(l =>
        typeof l === 'string' ? l : l?.name || l?.label || l?.language || l?.value || l?.id || l?._id || l?.internalId || l?.slug
      ).filter(Boolean);
      const languageIds = allLanguageEntries.map(l =>
        typeof l === 'string' ? l : l?.internalId || l?._id || l?.id || l?.slug || l?.name
      ).filter(Boolean);
      const existingLanguageNames = sessionState.mode === 'levelup'
        ? this._extractActorLanguageNames(actor)
        : [];
      const existingLanguageIds = sessionState.mode === 'levelup'
        ? this._extractActorLanguageIds(actor)
        : [];
      set['system.languages'] = Array.from(new Set([...existingLanguageNames, ...languageNames]));
      set['system.languageIds'] = Array.from(new Set([...existingLanguageIds, ...languageIds]));
    }

    if (!isDroidProgression && this._hasForceSensitivityGrant(actor, selections)) {
      const existingDomains = actor?.system?.progression?.unlockedDomains || [];
      const nextDomains = Array.from(new Set([...(Array.isArray(existingDomains) ? existingDomains : []), 'force']));
      set['system.progression.unlockedDomains'] = nextDomains;
      set['system.progression.forceSensitive'] = true;
      set['system.forceSensitive'] = true;
      set['system.skills.useTheForce.classSkill'] = true;
      set['system.skills.useTheForce.selectedAbility'] = set['system.skills.useTheForce.selectedAbility'] || 'cha';
    }

    const skillEntries = this._normalizeSkillSelectionEntries(skills);
    if (skillEntries.length) {
      for (const s of skillEntries) {
        const key = this._canonicalSkillKey(s?.key || s?.id || s?.skill);
        if (!key) continue;
        // Phase 3C: Initialize complete skill object with canonical schema.
        // Level-up Skill Training commits normalized { trained: [...] }; preserve
        // existing actor skill data unless the selection explicitly overrides it.
        set[`system.skills.${key}.trained`] = s.trained !== undefined ? !!s.trained : true;
        if (s.miscMod !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.miscMod`] = s.miscMod || 0;
        if (s.focused !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.focused`] = s.focused !== undefined ? !!s.focused : false;
        if (s.selectedAbility !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.selectedAbility`] = s.selectedAbility || '';
      }
    }


    const skillFocusKeys = this._extractSkillFocusKeysFromSelections(selections);
    for (const key of skillFocusKeys) {
      if (!key) continue;
      set[`system.skills.${key}.focused`] = true;
    }

    if (sessionState.mode === 'levelup' && levelUpManifest?.classSkills?.length) {
      const classSkillSources = Array.isArray(actor?.system?.progression?.classSkillSources)
        ? [...actor.system.progression.classSkillSources]
        : [];
      const seenClassSkillSources = new Set(classSkillSources.map(entry => `${entry?.id || entry?.key || entry?.name}::${entry?.classId || ''}`));
      for (const entry of levelUpManifest.classSkills) {
        const rawKey = entry.key || entry.id || entry.name;
        const skillKey = this._canonicalSkillKey(rawKey);
        if (skillKey) set[`system.skills.${skillKey}.classSkill`] = true;
        const sourceKey = `${entry.id || entry.key || entry.name}::${entry.classId || ''}`;
        if (!seenClassSkillSources.has(sourceKey)) {
          classSkillSources.push(entry);
          seenClassSkillSources.add(sourceKey);
        }
      }
      set['system.progression.classSkillSources'] = classSkillSources;
    }

    // PHASE 3: Add natural weapons from species materialization
    for (const nw of (sessionState.mode === 'chargen' ? itemsToCreate : [])) {
      add.items.push({
        name: nw.name,
        type: nw.type,
        system: nw.system,
        flags: nw.flags,
        img: nw.img
      });
    }

    await ProgressionContentAuthority.initialize?.();

    const classAutoGrantItems = await this._compileClassAutoGrantItems(actor, selections, sessionState, levelUpManifest);
    add.items.push(...filterDroidForbiddenItemSpecs(classAutoGrantItems.items, actor, {
      subtype: sessionState.progressionSession?.subtype,
      droidContext: sessionState.progressionSession?.droidContext,
      droid: selections.droid,
    }));
    add.items.push(...await this._compileClassStarterEquipmentItems(actor, selections, sessionState));
    if (sessionState.mode === 'levelup') {
      const automaticClassFeatures = await this._compileAutomaticClassFeatureItems(actor, levelUpManifest, sessionState);
      add.items.push(...filterDroidForbiddenItemSpecs(automaticClassFeatures, actor, {
        subtype: sessionState.progressionSession?.subtype,
        droidContext: sessionState.progressionSession?.droidContext,
        droid: selections.droid,
      }));
    }
    if (classAutoGrantItems.suppressed?.length) {
      set['flags.swse.suppressedClassAutoGrants'] = classAutoGrantItems.suppressed;
    }

    if (sessionState.mode === 'chargen') {
      const speciesBonusFeatResult = await this._compileSpeciesBonusFeatItems(actor, pendingSpeciesContext, sessionState, selections);
      add.items.push(...speciesBonusFeatResult.items);
      if (speciesBonusFeatResult.deferred?.length) {
        set['flags.swse.deferredSpeciesBonusFeats'] = speciesBonusFeatResult.deferred;
      }
    }

    const compiledAbilityItems = await this._compileProgressionAbilityItems(actor, selections, sessionState);
    add.items.push(...filterDroidForbiddenItemSpecs(compiledAbilityItems.items, actor, {
      subtype: sessionState.progressionSession?.subtype,
      droidContext: sessionState.progressionSession?.droidContext,
      droid: selections.droid,
    }));
    if (Array.isArray(compiledAbilityItems.deleteItems) && compiledAbilityItems.deleteItems.length) {
      itemsToDelete.push(...compiledAbilityItems.deleteItems);
    }

    if (compiledAbilityItems.postApply?.starshipManeuverRemoveItemIds?.length) {
      const removeIds = new Set(compiledAbilityItems.postApply.starshipManeuverRemoveItemIds.map((id) => String(id)));
      const currentSuite = actor.system?.starshipManeuverSuite || {};
      const currentManeuvers = Array.isArray(currentSuite.maneuvers) ? currentSuite.maneuvers : [];
      set['system.starshipManeuverSuite.maneuvers'] = currentManeuvers.filter((id) => !removeIds.has(String(id)));
    }

    if (compiledAbilityItems.postApply?.starshipManeuverNames?.length) {
      const currentSuite = actor.system?.starshipManeuverSuite || {};
      set['system.starshipManeuverSuite.max'] = Math.max(
        Number(currentSuite.max || 0),
        Number((currentSuite.maneuvers || []).length || 0) + compiledAbilityItems.postApply.starshipManeuverNames.length
      );
    }

    this._applyForceKnowledgePostApply(set, actor, compiledAbilityItems.postApply);

    if (sessionState.mode === 'levelup' && levelUpManifest) {
      set['flags.swse.levelUpEntitlementManifest'] = levelUpManifest;
      set['flags.swse.levelUpFinalizationReceipt'] = buildLevelUpFinalizationReceipt(levelUpManifest, sessionState.progressionSession);
    }

    const selectedForcePowerCount = this._countSelectionEntries(selections.forcePowers);
    const expectedForcePowerSlots = this._countForcePowerSlotsFromSelections(actor, selections, sessionState, attrValues);
    if (!isDroidProgression && (selectedForcePowerCount > 0 || expectedForcePowerSlots > 0 || set['system.progression.forceSensitive'] === true)) {
      const currentMax = Number(actor?.system?.freeForcePowers?.max || 0) || 0;
      const nextMax = Math.max(currentMax, expectedForcePowerSlots);
      set['system.freeForcePowers.max'] = nextMax;
      set['system.freeForcePowers.current'] = nextMax;
      set['system.progression.forcePowerSlots'] = {
        expected: nextMax,
        selected: selectedForcePowerCount,
        overage: Math.max(0, selectedForcePowerCount - nextMax),
        source: 'progression-finalizer',
        lastReconciledAt: new Date().toISOString(),
      };
      set['system.forceGrantLedger.lastReconciled'] = new Date().toISOString();
      set['system.forceGrantLedger.lastReconciliationContext'] = 'progression-finalizer';
      set['system.forceGrantLedger.legacy'] = {
        ...(actor?.system?.forceGrantLedger?.legacy || {}),
        unknownPowers: Math.max(0, selectedForcePowerCount - nextMax),
        issues: selectedForcePowerCount > nextMax
          ? [`Actor has ${selectedForcePowerCount} selected Force Power${selectedForcePowerCount === 1 ? '' : 's'} against ${nextMax} expected Force Training slot${nextMax === 1 ? '' : 's'}. This is allowed but should be reviewed.`]
          : [],
      };
    }

    const completedSessionId = sessionState.sessionId || sessionState.progressionSession?.sessionId || 'unknown';
    const completedAt = new Date().toISOString();
    set[`flags.foundryvtt-swse.progression.${sessionState.mode}.completed`] = {
      completed: true,
      mode: sessionState.mode,
      sessionId: completedSessionId,
      currentStepId: sessionState.progressionSession?.currentStepId || null,
      completedAt,
      source: 'progression-finalizer',
    };
    set['system.progression.lastCompletedMode'] = sessionState.mode;
    set['system.progression.completedSessionId'] = completedSessionId;
    set['system.progression.completedAt'] = completedAt;
    if (sessionState.mode === 'chargen') {
      set['system.progression.chargenComplete'] = true;
      set['flags.foundryvtt-swse.progression.chargen.completedAt'] = completedAt;
    }

    return {
      create: {},
      set,
      update,
      add,
      delete: itemsToDelete.length > 0 ? { items: itemsToDelete } : {},
      metadata: {
        mode: sessionState.mode,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        sourceSession: sessionState.sessionId || 'unknown',
        postApply: compiledAbilityItems.postApply || {}
      }
    };
  }




  static _normalizeNameKey(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '');
  }

  static _selectionListHasName(values = [], acceptedNames = []) {
    const accepted = new Set(acceptedNames.map(name => this._normalizeNameKey(name)).filter(Boolean));
    for (const value of Array.isArray(values) ? values : []) {
      const candidates = [
        value?.name,
        value?.label,
        value?.id,
        value?._id,
        value?.slug,
        value?.system?.name,
        value?.system?.canonicalName,
        typeof value === 'string' ? value : null,
      ];
      if (candidates.some(candidate => accepted.has(this._normalizeNameKey(candidate)))) return true;
    }
    return false;
  }

  static _collectSelectionEntries(selections = {}, domainHints = []) {
    const hints = domainHints.map(hint => String(hint || '').toLowerCase());
    const out = [];
    const visit = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value === 'object') {
        out.push(value);
        for (const key of ['selected', 'selection', 'value', 'item', 'entry', 'choice', 'candidate', 'talent', 'feat']) {
          if (value[key] && value[key] !== value) visit(value[key]);
        }
        return;
      }
      out.push(value);
    };

    for (const [key, value] of Object.entries(selections || {})) {
      const normalizedKey = String(key || '').toLowerCase();
      if (!hints.length || hints.some(hint => normalizedKey.includes(hint))) visit(value);
    }
    return out;
  }

  static _hasForceSensitivityGrant(actor, selections = {}) {
    if (isDroidProgressionActor(actor, { droid: selections?.droid })) return false;

    const featSelections = [
      ...(Array.isArray(selections.feats) ? selections.feats : []),
      ...this._collectSelectionEntries(selections, ['feat']),
    ];
    if (this._selectionListHasName(featSelections, ['Force Sensitivity', 'Force Sensitive'])) return true;
    if (actor?.items?.some?.(item => item?.type === 'feat' && this._selectionListHasName([item], ['Force Sensitivity', 'Force Sensitive']))) return true;

    const selectedClass = selections.class || null;
    if (!selectedClass || !actor) return false;
    try {
      const pendingState = {
        selectedClass,
        selectedFeats: selections.feats || [],
        selectedTalents: selections.talents || [],
        selectedSkills: selections.skills || [],
        pendingSpeciesContext: selections.pendingSpeciesContext || selections.species?.pendingContext || null,
      };
      const ledger = buildClassGrantLedger(actor, selectedClass, pendingState);
      if (ledger?.forceSensitive) return true;
      const granted = [
        ...(Array.isArray(ledger?.grantedFeats) ? ledger.grantedFeats : []),
        ...(Array.isArray(ledger?.grantedProficiencies) ? ledger.grantedProficiencies : []),
      ];
      return this._selectionListHasName(granted, ['Force Sensitivity', 'Force Sensitive']);
    } catch (err) {
      swseLogger.debug('[ProgressionFinalizer] Force Sensitivity grant probe failed; continuing without class grant inference', {
        error: err?.message || String(err),
      });
      return false;
    }
  }

  static _hasWealthTalentSelection(selections = {}) {
    const talentSelections = [
      ...(Array.isArray(selections.talents) ? selections.talents : []),
      ...this._collectSelectionEntries(selections, ['talent']),
    ];
    return this._selectionListHasName(talentSelections, ['Wealth']);
  }

  static _isLineageEligibleClass(classSelection = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const treeIds = [
      ...(Array.isArray(classModel?.system?.talentTreeIds) ? classModel.system.talentTreeIds : []),
      ...(Array.isArray(classModel?.system?.talentTrees) ? classModel.system.talentTrees : []),
      ...(Array.isArray(classModel?.talentTreeIds) ? classModel.talentTreeIds : []),
      ...(Array.isArray(classModel?.talentTrees) ? classModel.talentTrees : []),
      ...(Array.isArray(classSelection?.system?.talentTreeIds) ? classSelection.system.talentTreeIds : []),
      ...(Array.isArray(classSelection?.system?.talentTrees) ? classSelection.system.talentTrees : []),
    ].map(tree => this._normalizeNameKey(tree?.id || tree?.key || tree?.name || tree));
    if (treeIds.includes('lineage')) return true;

    const key = this._normalizeNameKey(classModel?.name || classModel?.label || classModel?.id || classSelection?.name || classSelection);
    return key === 'noble' || key === 'corporateagent';
  }

  static _computePendingLineageEligibleLevel(selections = {}, sessionState = {}) {
    if (!this._isLineageEligibleClass(selections.class)) return 0;
    const rawLevel = Number(
      selections?.survey?.startingLevel
      ?? sessionState?.targetLevel
      ?? sessionState?.progressionSession?.targetLevel
      ?? 1
    ) || 1;
    return Math.max(1, Math.floor(rawLevel));
  }

  static _computeWealthCreditGrant(selections = {}, actor = null, sessionState = {}) {
    if (!this._hasWealthTalentSelection(selections)) return 0;
    const lineageLevel = this._computePendingLineageEligibleLevel(selections, sessionState);
    return Math.max(0, lineageLevel * 5000);
  }

  static _withWealthProgressionHistory(actor, selections = {}, sessionState = {}) {
    const raw = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
    const history = foundry?.utils?.deepClone ? foundry.utils.deepClone(raw) : JSON.parse(JSON.stringify(raw || {}));
    const key = 'swse.talent.wealth';
    const lineageLevel = this._computePendingLineageEligibleLevel(selections, sessionState);
    const existing = history[key] || { levelsGranted: [] };
    const levels = new Set((Array.isArray(existing.levelsGranted) ? existing.levelsGranted : []).map(Number).filter(Number.isFinite));
    for (let level = 1; level <= lineageLevel; level += 1) levels.add(level);
    history[key] = {
      ...existing,
      levelsGranted: Array.from(levels).sort((a, b) => a - b),
      lastGrantedAt: existing.lastGrantedAt || new Date().toISOString(),
      lastGrantedCredits: existing.lastGrantedCredits || lineageLevel * 5000,
      source: existing.source || 'chargen-finalizer',
    };
    return history;
  }


  static _actorHasWealthTalent(actor) {
    return actor?.items?.some?.(item => item?.type === 'talent' && this._selectionListHasName([item], ['Wealth'])) === true;
  }

  static _levelupCreditDeltaIncludesWealth(summary = {}, selections = {}, actor = null) {
    if (this._hasWealthTalentSelection(selections) || this._actorHasWealthTalent(actor)) return true;
    return (summary.creditDeltaSources || []).some(source => this._normalizeNameKey(source?.label || source?.source || '') === 'wealthtalent');
  }

  static _readClassLevelValue(classEntry = null) {
    return Math.max(0, Number(
      classEntry?.system?.level
      ?? classEntry?.system?.levels
      ?? classEntry?.system?.rank
      ?? classEntry?.level
      ?? classEntry?.classLevel
      ?? 0
    ) || 0);
  }

  static _classAggregationKey(classEntry = null) {
    return this._normalizeNameKey(
      classEntry?.system?.classId
      || classEntry?.system?.sourceId
      || classEntry?.system?.className
      || classEntry?.classId
      || classEntry?.sourceId
      || classEntry?.id
      || classEntry?.name
      || classEntry?.className
      || classEntry
    );
  }

  static _resolveLevelupSelectedClass(selections = {}, sessionState = {}) {
    return selections?.class
      || sessionState?.progressionSession?.getSelection?.('class')
      || sessionState?.progressionSession?.draftSelections?.class
      || sessionState?.draftSelections?.class
      || sessionState?.class
      || null;
  }

  static _getLineageEligibleClassLevelCountAfterLevelup(actor, selections = {}, sessionState = {}) {
    const lineageLevelsByClass = new Map();
    const addClassLevel = (classEntry) => {
      if (!classEntry || !this._isLineageEligibleClass(classEntry)) return;
      const key = this._classAggregationKey(classEntry);
      if (!key) return;
      const level = this._readClassLevelValue(classEntry);
      lineageLevelsByClass.set(key, Math.max(lineageLevelsByClass.get(key) || 0, level));
    };

    for (const classItem of actor?.items || []) {
      if (classItem?.type === 'class') addClassLevel(classItem);
    }
    for (const classEntry of Array.isArray(actor?.system?.classes) ? actor.system.classes : []) {
      addClassLevel(classEntry);
    }
    for (const classEntry of Array.isArray(actor?.system?.progression?.classLevels) ? actor.system.progression.classLevels : []) {
      addClassLevel(classEntry);
    }

    let lineageLevelCount = Array.from(lineageLevelsByClass.values()).reduce((sum, level) => sum + level, 0);
    const selectedClass = this._resolveLevelupSelectedClass(selections, sessionState);
    if (this._isLineageEligibleClass(selectedClass)) {
      // The actor still contains the pre-level-up class state at finalization time.
      // Add this event's selected class level once so Noble 1 grants 5000, Noble 2
      // grants 10000, and non-Lineage classes after Noble keep paying based on the
      // existing Noble/Lineage levels.
      lineageLevelCount += 1;
    }
    return lineageLevelCount;
  }

  static _getLevelupCharacterLevelKey(actor, selections = {}, sessionState = {}) {
    try {
      const levelContext = buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass: selections.class });
      const enteringLevel = Number(levelContext?.enteringLevel);
      if (Number.isFinite(enteringLevel) && enteringLevel > 0) return Math.floor(enteringLevel);
    } catch (_err) {}
    const fallback = Number(sessionState?.targetLevel ?? actor?.system?.level ?? 1);
    return Number.isFinite(fallback) ? Math.max(1, Math.floor(fallback)) : 1;
  }

  static _computeLevelupWealthCreditGrant(actor, selections = {}, sessionState = {}) {
    if (!this._hasWealthTalentSelection(selections) && !this._actorHasWealthTalent(actor)) return 0;

    const history = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
    const characterLevel = this._getLevelupCharacterLevelKey(actor, selections, sessionState);
    const grantedCharLevels = history?.['swse.talent.wealth']?.characterLevelsGranted || [];
    if (grantedCharLevels.map(Number).includes(characterLevel)) return 0;

    const lineageLevelCount = this._getLineageEligibleClassLevelCountAfterLevelup(actor, selections, sessionState);
    return Math.max(0, lineageLevelCount * 5000);
  }

  static _withLevelupWealthProgressionHistory(actor, selections = {}, sessionState = {}, creditDelta = 0) {
    const raw = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
    const history = foundry?.utils?.deepClone ? foundry.utils.deepClone(raw) : JSON.parse(JSON.stringify(raw || {}));
    const key = 'swse.talent.wealth';
    const lineageLevelCount = this._getLineageEligibleClassLevelCountAfterLevelup(actor, selections, sessionState);
    const characterLevel = this._getLevelupCharacterLevelKey(actor, selections, sessionState);
    const existing = history[key] || { levelsGranted: [], characterLevelsGranted: [] };
    const levels = new Set((Array.isArray(existing.levelsGranted) ? existing.levelsGranted : []).map(Number).filter(Number.isFinite));
    for (let level = 1; level <= lineageLevelCount; level += 1) levels.add(level);
    const characterLevels = new Set((Array.isArray(existing.characterLevelsGranted) ? existing.characterLevelsGranted : []).map(Number).filter(Number.isFinite));
    characterLevels.add(characterLevel);
    history[key] = {
      ...existing,
      levelsGranted: Array.from(levels).sort((a, b) => a - b),
      characterLevelsGranted: Array.from(characterLevels).sort((a, b) => a - b),
      lastLineageLevelCount: lineageLevelCount,
      lastGrantedAt: new Date().toISOString(),
      lastGrantedCredits: creditDelta,
      source: 'levelup-finalizer',
    };
    return history;
  }

  static _resolveLevelUpCurrentHp({ currentHpValue = 0, hpGain = 0, nextHpMax = 1, mode = 'none' } = {}) {
    const current = Number(currentHpValue);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const gain = Math.max(0, Number(hpGain || 0) || 0);
    const max = Math.max(1, Number(nextHpMax || 1) || 1);

    switch (mode) {
      case 'refillToMax':
        return max;
      case 'increaseCurrentByMaxGain':
        return Math.min(max, safeCurrent + gain);
      case 'none':
      default:
        return Math.min(max, safeCurrent);
    }
  }

  static _canonicalSkillKey(value) {
    const firstScalar = (input) => {
      if (input === null || input === undefined) return '';
      if (typeof input === 'object') {
        return firstScalar(
          input.key ?? input.slug ?? input.system?.key ?? input.skillKey ?? input.skillId ?? input.skill
          ?? input.value?.key ?? input.value?.slug ?? input.value?.skillKey ?? input.value?.skillId
          ?? input.name ?? input.label ?? input.displayName ?? input.value?.name ?? input.value?.label
          ?? input.id ?? input._id ?? input.internalId
        );
      }
      const text = String(input).trim();
      return text && text !== '[object Object]' ? text : '';
    };

    const raw = firstScalar(value);
    if (!raw) return '';
    const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const idMap = {
      '2b9e43f710664b31': 'useTheForce',
      '34a9c3f170eb9f40': 'climb',
      '35df8faa4878f2c5': 'endurance',
      '426945d1fc765a5d': 'survival',
      '43c5941072ec78af': 'perception',
      '633a13c5fa6101d7': 'treatInjury',
      '6d2ac22d9fcf402f': 'stealth',
      '745a5686d6f21e8c': 'mechanics',
      '8f5e21f92d6d976b': 'useComputer',
      '9410ce2dfb6cefcb': 'deception',
      '97f68d85ad68b921': 'jump',
      'a3855d8f08016487': 'knowledge',
      'a6c5e98148aad9a9': 'acrobatics',
      'b554f3e5a55ad53f': 'persuasion',
      'b8dad0c963f046c6': 'pilot',
      'c9bf381579013b18': 'gatherInformation',
      'cb5493f65f0bdb62': 'initiative',
      'd0b0f5e45327b476': 'ride',
      'f77c3576d22552fe': 'swim',
    };
    const map = {
      acrobatics: 'acrobatics',
      climb: 'climb',
      deception: 'deception',
      endurance: 'endurance',
      gatherinformation: 'gatherInformation',
      gatherinfo: 'gatherInformation',
      initiative: 'initiative',
      jump: 'jump',
      knowledge: 'knowledge',
      knowledgebureaucracy: 'knowledgeBureaucracy',
      knowledgegalacticlore: 'knowledgeGalacticLore',
      knowledgelifesciences: 'knowledgeLifeSciences',
      knowledgephysicalsciences: 'knowledgePhysicalSciences',
      knowledgesocialsciences: 'knowledgeSocialSciences',
      knowledgetactics: 'knowledgeTactics',
      knowledgetechnology: 'knowledgeTechnology',
      mechanics: 'mechanics',
      perception: 'perception',
      persuasion: 'persuasion',
      pilot: 'pilot',
      ride: 'ride',
      stealth: 'stealth',
      survival: 'survival',
      swim: 'swim',
      treatinjury: 'treatInjury',
      usecomputer: 'useComputer',
      usetheforce: 'useTheForce',
      useforce: 'useTheForce',
      utf: 'useTheForce',
    };

    let resolved = idMap[normalized] || map[normalized] || '';

    if (!resolved) {
      try {
        const packIndex = globalThis.game?.packs?.get?.('foundryvtt-swse.skills')?.index;
        const contents = packIndex?.contents || (typeof packIndex?.values === 'function' ? Array.from(packIndex.values()) : []);
        const hit = contents.find(entry => [entry?.id, entry?._id, entry?.name]
          .some(candidate => String(candidate || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === normalized));
        if (hit?.name) resolved = map[String(hit.name).toLowerCase().replace(/[^a-z0-9]+/g, '')] || idMap[String(hit.id || hit._id || '').toLowerCase()] || '';
      } catch (_err) {
        // Registry lookup is best-effort only; fall through to validation below.
      }
    }

    // Do not create arbitrary system.skills.<randomId> or system.skills.null
    // paths. Unknown values are unsafe and should be ignored until the picker
    // can provide a real canonical skill key.
    if (!resolved) {
      swseLogger.warn('[ProgressionFinalizer] Ignoring unknown skill key during finalization', { raw });
      return '';
    }

    // Athletics consolidation: redirect component keys → 'athletics' when house rule is on.
    const athleticsComponents = new Set(['acrobatics', 'climb', 'jump', 'swim']);
    if (athleticsComponents.has(resolved)) {
      try { if (game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true) return 'athletics'; } catch { /* off */ }
    }
    return resolved;
  }

  /**
   * Extract canonical skill keys for any Skill Focus feats in the current selections.
   * E.g. "Skill Focus (Perception)" → ['perception']
   *
   * @param {Object} selections - Draft selections from the progression session
   * @returns {string[]} Canonical skill keys to mark as focused
   */
  static _extractSkillFocusKeysFromSelections(selections = {}) {
    const feats = [
      ...(Array.isArray(selections.feats) ? selections.feats : []),
      ...(Array.isArray(selections.selectedFeats) ? selections.selectedFeats : []),
    ];
    const keys = [];
    for (const feat of feats) {
      const name = String(feat?.name || feat?.label || feat || '').trim();
      const match = name.match(/^Skill\s+Focus\s*\(([^)]+)\)/i);
      if (match) {
        const key = this._canonicalSkillKey(match[1].trim());
        if (key) keys.push(key);
      }

      const selectedChoice = feat?.system?.selectedChoice || feat?.selectedChoice || feat?.choice || feat?.choiceValue || null;
      const choiceKey = this._canonicalSkillKey(selectedChoice);
      if (choiceKey) keys.push(choiceKey);
    }
    return Array.from(new Set(keys));
  }

  static _countSelectionEntries(entries = []) {
    if (!Array.isArray(entries)) return 0;
    return entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.count ?? 1) || 0), 0);
  }

  static _configuredForceTrainingAbilityKey() {
    const getSetting = (moduleId, key) => {
      try { return globalThis.game?.settings?.get?.(moduleId, key); } catch (_err) { return null; }
    };
    const configured = String(
      getSetting(globalThis.game?.system?.id || 'foundryvtt-swse', 'forceTrainingAttribute')
      ?? getSetting('foundryvtt-swse', 'forceTrainingAttribute')
      ?? getSetting('swse', 'forceTrainingAttribute')
      ?? 'wisdom'
    ).toLowerCase();
    return configured === 'cha' || configured === 'charisma' ? 'cha' : 'wis';
  }

  static _abilityModifierFromProgression(actor, abilityKey, attrValues = {}) {
    const key = abilityKey === 'cha' ? 'cha' : 'wis';
    const pendingValue = attrValues?.[key];
    const pendingScore = typeof pendingValue === 'object'
      ? Number(pendingValue.score ?? pendingValue.total ?? pendingValue.value ?? pendingValue.base)
      : Number(pendingValue);
    if (Number.isFinite(pendingScore) && pendingScore > 0) return Math.floor((pendingScore - 10) / 2);

    const system = actor?.system || {};
    for (const block of [system.attributes?.[key], system.abilities?.[key], system.stats?.[key]]) {
      if (!block || typeof block !== 'object') continue;
      for (const modKey of ['mod', 'modifier']) {
        const mod = Number(block[modKey]);
        if (Number.isFinite(mod)) return mod;
      }
      let total = null;
      for (const scoreKey of ['score', 'total', 'value']) {
        const score = Number(block[scoreKey]);
        if (Number.isFinite(score)) { total = score; break; }
      }
      if (total === null) {
        const base = Number(block.base ?? 10) || 10;
        const racial = Number(block.racial ?? block.species ?? 0) || 0;
        const enhancement = Number(block.enhancement ?? 0) || 0;
        const temp = Number(block.temp ?? 0) || 0;
        total = base + racial + enhancement + temp;
      }
      if (Number.isFinite(total)) return Math.floor((total - 10) / 2);
    }
    return 0;
  }

  static _selectionNameMatches(entry, wantedName) {
    const normalizedWanted = this._normalizeNameKey(wantedName);
    return [entry?.name, entry?.label, entry?.title, entry?.id, entry?._id, entry]
      .some(candidate => this._normalizeNameKey(candidate) === normalizedWanted);
  }

  static _countForceTrainingInstancesFromSelections(selections = {}) {
    const feats = Array.isArray(selections.feats) ? selections.feats : [];
    const pending = Array.isArray(selections.pendingEntitlements) ? selections.pendingEntitlements : [];
    const featCount = feats.reduce((sum, feat) => this._selectionNameMatches(feat, 'Force Training')
      ? sum + (Number(feat?.count || 1) || 1)
      : sum, 0);
    const pendingSeen = new Set();
    const pendingCount = pending.reduce((sum, entry) => {
      const sourceName = entry?.source?.featName || entry?.sourceName || entry?.name || '';
      const type = String(entry?.type || entry?.grantType || '').toLowerCase();
      if (this._normalizeNameKey(sourceName) !== 'forcetraining' && !/force[_ -]?power/.test(type)) return sum;
      const sourceKey = entry?.source?.featId || entry?.sourceItemId || entry?.sourceId || entry?.id || sourceName || type;
      const dedupeKey = `${this._normalizeNameKey(sourceName)}::${sourceKey}`;
      if (pendingSeen.has(dedupeKey)) return sum;
      pendingSeen.add(dedupeKey);
      return sum + (Number(entry?.source?.count || 1) || 1);
    }, 0);
    return featCount > 0 ? featCount : pendingCount;
  }

  static _countForcePowerSlotsFromSelections(actor, selections = {}, sessionState = {}, attrValues = {}) {
    const instances = this._countForceTrainingInstancesFromSelections(selections);
    if (instances <= 0) return 0;
    const abilityKey = this._configuredForceTrainingAbilityKey();
    const modifier = this._abilityModifierFromProgression(actor, abilityKey, attrValues);
    return instances * Math.max(1, 1 + modifier);
  }

  static _extractActorLanguageNames(actor) {
    const languages = actor?.system?.languages || [];
    if (Array.isArray(languages)) {
      return languages.map(lang => typeof lang === 'string' ? lang : lang?.name || lang?.label || lang?.id).filter(Boolean);
    }
    if (typeof languages === 'object') {
      return Object.entries(languages)
        .filter(([, value]) => value === true || value?.known === true || value?.selected === true)
        .map(([key, value]) => value?.name || value?.label || value?.id || key)
        .filter(Boolean);
    }
    return [];
  }

  static _extractActorLanguageIds(actor) {
    const explicit = actor?.system?.languageIds || actor?.system?.language_ids || [];
    if (Array.isArray(explicit) && explicit.length) {
      return explicit.map(lang => typeof lang === 'string' ? lang : lang?.id || lang?.name).filter(Boolean);
    }
    const languages = actor?.system?.languages || [];
    if (Array.isArray(languages)) {
      return languages.map(lang => typeof lang === 'string' ? lang : lang?.id || lang?.name).filter(Boolean);
    }
    if (typeof languages === 'object') {
      return Object.entries(languages)
        .filter(([, value]) => value === true || value?.known === true || value?.selected === true)
        .map(([key, value]) => value?.id || value?.name || key)
        .filter(Boolean);
    }
    return [];
  }

  static _normalizeSkillSelectionEntries(skills) {
    if (!skills) return [];

    if (Array.isArray(skills)) {
      return skills
        .map((entry) => {
          if (typeof entry === 'string') return { key: this._canonicalSkillKey(entry), trained: true };
          const key = this._canonicalSkillKey(entry?.key || entry?.id || entry?.skill || entry?.name || null);
          return key ? { ...entry, key, trained: entry?.trained !== undefined ? !!entry.trained : true } : null;
        })
        .filter(Boolean);
    }

    if (Array.isArray(skills?.trained)) {
      return skills.trained
        .map((entry) => {
          if (typeof entry === 'string') return { key: this._canonicalSkillKey(entry), trained: true };
          const key = this._canonicalSkillKey(entry?.key || entry?.id || entry?.skill || entry?.name || null);
          return key ? { ...entry, key, trained: true } : null;
        })
        .filter(Boolean);
    }

    if (typeof skills === 'object') {
      return Object.entries(skills)
        .map(([key, entry]) => {
          if (entry === true) {
            const canonical = this._canonicalSkillKey(key);
            return canonical ? { key: canonical, trained: true } : null;
          }
          if (entry?.trained === true) {
            const canonical = this._canonicalSkillKey(entry?.key || entry?.id || key);
            return canonical ? { ...entry, key: canonical, trained: true } : null;
          }
          return null;
        })
        .filter(Boolean);
    }

    return [];
  }

  static _normalizeClassKey(value) {
    return String(value?.id || value?.classId || value?.sourceId || value?.name || value?.className || value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  static _readClassItemLevel(item) {
    return Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? 0) || 0;
  }

  static _buildClassLevelsAfterLevelUp(actor, clazz, levelContext) {
    const selectedKey = levelContext.selectedClassId || this._normalizeClassKey(clazz);
    const byKey = new Map();
    for (const item of actor?.items?.filter?.((entry) => entry?.type === 'class') || []) {
      const key = this._normalizeClassKey(item?.system?.classId || item?.system?.sourceId || item?.name || item?.id);
      if (!key) continue;
      byKey.set(key, {
        class: item.name || key,
        classId: item.system?.classId || key,
        level: this._readClassItemLevel(item),
      });
    }

    const existing = byKey.get(selectedKey);
    byKey.set(selectedKey, {
      class: levelContext.selectedClassName || clazz?.name || clazz?.className || selectedKey,
      classId: clazz?.id || clazz?.classId || clazz?.sourceId || selectedKey,
      level: levelContext.selectedClassNextLevel || (existing?.level || 0) + 1,
    });

    return Array.from(byKey.values()).filter((entry) => entry.level > 0);
  }

  static _buildClassLevelHistoryAfterLevelUp(actor, clazz, levelContext) {
    const existing = Array.isArray(actor?.system?.progression?.classLevelHistory)
      ? actor.system.progression.classLevelHistory
      : [];
    const entry = {
      characterLevel: levelContext.enteringLevel,
      classId: levelContext.selectedClassId || this._normalizeClassKey(clazz),
      className: levelContext.selectedClassName || clazz?.name || clazz?.className || null,
      classLevel: levelContext.selectedClassNextLevel || 1,
      classType: levelContext.selectedClassType || null,
      transitionKind: levelContext.prestigeTransition?.transitionKind
        || (levelContext.isNewBaseClass ? 'newBaseClass' : levelContext.isReturningClass ? 'returningClass' : 'newClass'),
      timestamp: new Date().toISOString(),
    };

    const withoutDuplicateLevel = existing.filter((item) => Number(item?.characterLevel) !== Number(entry.characterLevel));
    return [...withoutDuplicateLevel, entry].sort((a, b) => Number(a.characterLevel || 0) - Number(b.characterLevel || 0));
  }

  static _normalizeAttributeValues(attr = {}, actor = null) {
    const raw = attr?.values && typeof attr.values === 'object' ? attr.values : attr;
    const out = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const value = raw?.[key] ?? raw?.[{ str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }[key]];
      const fallback = actor?.system?.abilities?.[key]?.base ?? actor?.system?.abilities?.[key]?.value ?? 10;
      const score = Number(value?.score ?? value?.base ?? value?.value ?? value?.total ?? value ?? fallback);
      if (Number.isFinite(score)) out[key] = score;
    }
    return out;
  }

  static _normalizeFinalAttributeValues(attr = {}, attrValues = {}, pendingSpeciesContext = null, actor = null) {
    const explicit = attr?.finalValues || attr?.totals || attr?.totalValues || null;
    const speciesMods = attr?.speciesMods
      || attr?.speciesModifiers
      || pendingSpeciesContext?.attributeModifiers
      || pendingSpeciesContext?.abilityScores
      || pendingSpeciesContext?.canonicalStats?.abilityScores
      || {};
    const out = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const explicitValue = explicit?.[key]?.score ?? explicit?.[key]?.total ?? explicit?.[key]?.value ?? explicit?.[key];
      if (Number.isFinite(Number(explicitValue))) {
        out[key] = Number(explicitValue);
        continue;
      }
      const base = Number(attrValues?.[key] ?? actor?.system?.abilities?.[key]?.base ?? 10) || 10;
      const mod = Number(speciesMods?.[key] ?? speciesMods?.[key?.toUpperCase?.()] ?? 0) || 0;
      out[key] = base + mod;
    }
    return out;
  }

  static _abilityMod(score) {
    return Math.floor(((Number(score) || 10) - 10) / 2);
  }

  static _classKey(classSelection = null) {
    return String(classSelection?.name || classSelection?.label || classSelection?.id || classSelection || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  static _sanitizeClassSystemForDroid(system = {}, isDroidProgression = false) {
    const clone = foundry.utils.deepClone(system || {});
    if (isDroidProgression) {
      clone.forceSensitive = false;
      clone.force_sensitivity = false;
      clone.forceSensitiveClassFeature = false;
    }
    return clone;
  }

  static _extractClassHitDie(classSelection = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const explicit = classModel?.system?.hitDie ?? classModel?.system?.hit_die ?? classModel?.hitDie ?? classModel?.hit_die ?? null;
    if (Number.isFinite(Number(explicit))) return Number(explicit);
    const match = String(explicit || '').match(/d(\d+)/i);
    if (match) return Number(match[1]);
    const hitDice = {
      elite_trooper: 12, independent_droid: 12,
      assassin: 10, bounty_hunter: 10, droid_commander: 10, gladiator: 10, imperial_knight: 10, jedi: 10, jedi_knight: 10, jedi_master: 10, master_privateer: 10, martial_arts_master: 10, pathfinder: 10, sith_apprentice: 10, sith_lord: 10, soldier: 10, vanguard: 10,
      ace_pilot: 8, beast_rider: 8, charlatan: 8, corporate_agent: 8, crime_lord: 8, enforcer: 8, force_adept: 8, force_disciple: 8, gunslinger: 8, improviser: 8, infiltrator: 8, medic: 8, melee_duelist: 8, military_engineer: 8, officer: 8, outlaw: 8, saboteur: 8, scout: 8, shaper: 8,
      noble: 6, scoundrel: 6, slicer: 6,
    };
    return hitDice[this._classKey(classModel)] || 6;
  }

  static _computeStartingHP(classSelection, attrValues = {}, actor = null, droidBuild = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const key = this._classKey(classModel);
    const baseMap = { jedi: 30, soldier: 30, scout: 24, noble: 18, scoundrel: 18, force_adept: 24 };
    const base = Number(classModel?.system?.base_hp ?? classModel?.system?.baseHp ?? classModel?.baseHp ?? baseMap[key] ?? 18) || 18;
    const isDroid = !!droidBuild || actor?.type === 'droid' || actor?.system?.isDroid;
    const conMod = isDroid ? 0 : this._abilityMod(attrValues?.con ?? actor?.system?.abilities?.con?.base ?? actor?.system?.abilities?.con?.value ?? 10);
    return { base, modifiers: conMod, total: Math.max(1, base + conMod) };
  }

  static _parseMaxCredits(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    const match = String(value || '').match(/(\d+)d(\d+)\s*(?:x|×|\*)\s*(\d+)/i);
    if (!match) return 0;
    return Number(match[1]) * Number(match[2]) * Number(match[3]);
  }

  static _computeStartingCredits(classSelection = null, backgroundSelection = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const authority = Number(ProgressionContentAuthority.getStartingCredits({ classSelection, backgroundSelection }) || 0) || 0;
    if (authority > 0) return authority;

    const classCredits = this._parseMaxCredits(
      classModel?.startingCredits
        ?? classModel?.system?.startingCredits
        ?? classModel?.system?.starting_credits
        ?? classSelection?.startingCredits
        ?? classSelection?.system?.starting_credits
    );
    const backgroundCredits = Number(backgroundSelection?.credits ?? backgroundSelection?.system?.credits ?? 0) || 0;
    if (classCredits + backgroundCredits > 0) return classCredits + backgroundCredits;

    const fallback = { soldier: 3000, scout: 3000, scoundrel: 3000, jedi: 1200, noble: 4800, force_adept: 1200 };
    return fallback[this._classKey(classModel)] || 0;
  }

  static _getUsableActorName(actor) {
    const name = String(actor?.name || '').trim();
    return this._isDefaultActorName(name) ? '' : name;
  }

  static _isDefaultActorName(name) {
    const normalized = String(name || '').trim().toLowerCase();
    return !normalized || normalized === 'actor' || normalized === 'new actor' || normalized === 'new character' || normalized === 'unnamed';
  }

  static _resolveSpeciesPortrait(speciesSelection, pendingSpeciesContext = null) {
    const species = ProgressionContentAuthority.resolveSpecies(speciesSelection)
      || pendingSpeciesContext?.identity
      || speciesSelection
      || {};
    return species.img
      || species.image
      || species.portrait
      || species.system?.img
      || species.system?.image
      || null;
  }

  static _actorNeedsPortrait(actor) {
    const img = String(actor?.img || '').toLowerCase();
    return !img || img.includes('mystery-man') || img.includes('icons/svg') || img.endsWith('/token.svg');
  }

  static _getChargenStoreState(actor) {
    try {
      return actor?.getFlag?.('swse', 'chargenStore') || actor?.flags?.swse?.chargenStore || null;
    } catch (_err) {
      return actor?.flags?.swse?.chargenStore || null;
    }
  }

  static _resolveFinalStartingCredits(actor, computedStartingCredits) {
    const computed = Math.max(0, Number(computedStartingCredits || 0));
    const storeState = this._getChargenStoreState(actor);
    if (!storeState?.initialized) return computed;

    const previousBudget = Math.max(0, Number(storeState.startingCredits || 0));
    const actorCredits = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);

    // The chargen store is allowed to spend from the draft starting-credit pool
    // before finalization. Do not overwrite those purchases at confirm time.
    // If late build choices raise the budget (for example Wealth), only add the
    // budget delta instead of resetting the cart-spent balance.
    if (previousBudget > 0 && computed > previousBudget) {
      return actorCredits + (computed - previousBudget);
    }
    return actorCredits;
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
      for (const talentGrant of this._expandCombinedTalentGrantEntries(talent)) {
        grants.push({
          type: 'talent',
          name: talentGrant.name || talentGrant,
          source: 'heroic-talent',
          grantedAt: 'chargen',
        });
      }
    }

    // Class talents
    if (selections.has('class-talent')) {
      const talent = selections.get('class-talent');
      for (const talentGrant of this._expandCombinedTalentGrantEntries(talent)) {
        grants.push({
          type: 'talent',
          name: talentGrant.name || talentGrant,
          source: 'class-talent',
          grantedAt: 'chargen',
        });
      }
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

    const legacyAliases = {
      feats: ['general-feat'],
      talents: ['general-talent'],
      forcePowers: ['force-powers'],
      forceRegimens: ['force-regimens'],
      starshipManeuvers: ['starship-maneuvers', 'starship-maneuver'],
    };
    for (const [canonical, aliases] of Object.entries(legacyAliases)) {
      if (!result.has(canonical)) continue;
      for (const alias of aliases) {
        if (!result.has(alias)) result.set(alias, result.get(canonical));
      }
    }

    return result;
  }


  static async _compileClassAutoGrantItems(actor, selections, sessionState, levelUpManifest = null) {
    const sessionId = sessionState.sessionId || 'unknown';
    const clazz = selections.class || null;
    if (!clazz || !actor) return { items: [], suppressed: [] };
    if (sessionState.mode === 'levelup') {
      const levelContext = levelUpManifest?.context || buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass: clazz });
      if (!levelContext.isNewClass) {
        return { items: [], suppressed: [] };
      }
      // RAW multiclassing: when taking the first level in a new base class,
      // the player chooses ONE starting feat. Do not auto-grant the whole
      // starting proficiency package unless the explicit house rule is enabled.
      if (levelContext.isNewBaseClass && ProgressionRules.multiclassExtraStartingFeatsEnabled?.() !== true) {
        return { items: [], suppressed: [] };
      }
    }

    const pendingState = {
      selectedClass: clazz,
      selectedFeats: selections.feats || [],
      selectedTalents: selections.talents || [],
      selectedSkills: selections.skills || [],
      pendingSpeciesContext: selections.pendingSpeciesContext || selections.species?.pendingContext || null,
    };
    const ledger = buildClassGrantLedger(actor, clazz, pendingState);
    const grantEntries = [
      ...(Array.isArray(ledger.grantedFeats) ? ledger.grantedFeats.map(grant => ({ ...grant, grantKind: 'feat' })) : []),
      ...(Array.isArray(ledger.grantedProficiencies) ? ledger.grantedProficiencies.map(grant => ({ ...grant, grantKind: 'proficiency' })) : []),
    ];

    const existingByTypeAndName = new Set(
      actor.items.map((item) => `${String(item.type || '').toLowerCase()}::${String(item.name || '').toLowerCase()}`)
    );
    const seen = new Set();
    const items = [];

    for (const grant of grantEntries) {
      const name = grant.name || grant.target || null;
      if (!name) continue;
      const dedupeKey = `feat::${String(name).toLowerCase()}`;
      if (existingByTypeAndName.has(dedupeKey) || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const resolvedDoc = await ProgressionContentAuthority.getFeatDocument({ name, id: grant.id || name });
      const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
      const baseItem = resolvedData || { name, type: 'feat', system: {} };
      baseItem.name = baseItem.name || name;
      baseItem.type = baseItem.type || 'feat';
      baseItem.system = foundry.utils.mergeObject(baseItem.system || {}, {
        sourceType: 'class',
        locked: true,
        choiceEditable: false,
        grantedByClass: true,
        autoGranted: true,
      }, { inplace: false, recursive: true, overwrite: false });
      baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
        swse: {
          progression: {
            sourceSession: sessionId,
            selectionKey: 'class-auto-grants',
            selectionId: name,
            countIndex: 0,
          },
          classGranted: true,
          sourceClass: ledger.className || clazz.name || null,
        },
      }, { inplace: false, recursive: true });
      items.push(baseItem);
    }

    return { items, suppressed: ledger.suppressedGrants || [] };
  }


  /**
   * Evaluate structured species bonus feat requirements against chargen selections.
   * Returns { met: bool } — false if any requirement is unmet or the type is unknown.
   * Only supports requirement types implemented in this phase; unknown types → not met.
   */
  static _evaluateSpeciesBonusFeatRequirements(requirements, selections) {
    if (!requirements || requirements.length === 0) return { met: true };
    const skillEntries = this._normalizeSkillSelectionEntries(selections?.skills || []);
    const trainedKeys = new Set(skillEntries.map((e) => e.key));
    for (const req of requirements) {
      if (req.type === 'skillTrained') {
        if (!trainedKeys.has(this._canonicalSkillKey(req.skill))) return { met: false };
      } else if (req.type === 'attributeMin' || req.type === 'baseAttackMin') {
        // Attribute totals and BAB are not reliable at chargen finalization time —
        // the actor holds pre-commit state. Defer these to post-commit reconciliation
        // where recalcAll has run and derived values are current.
        return { met: false };
      } else {
        // Unknown requirement type — do not auto-grant.
        return { met: false };
      }
    }
    return { met: true };
  }

  /**
   * Compile feat items from species-level bonus feat grants.
   * Grants with no condition and no requirements are always created.
   * Grants with structured requirements are evaluated against chargen selections.
   * Grants with only freeform condition text (no structured requirements) are deferred.
   * Duplicate protection: skips any feat already on the actor by name.
   */
  static async _compileSpeciesBonusFeatItems(actor, pendingSpeciesContext, sessionState, selections = {}) {
    const items = [];
    const deferred = [];
    if (!pendingSpeciesContext || !actor) return { items, deferred };

    const sessionId = sessionState?.sessionId || 'unknown';
    const speciesName = pendingSpeciesContext.identity?.name || 'Unknown';

    const existingByTypeAndName = new Set(
      (actor.items || []).map((item) => `${String(item.type || '').toLowerCase()}::${String(item.name || '').toLowerCase()}`)
    );
    const seen = new Set();

    const bonusFeatGrants = (pendingSpeciesContext.traits || [])
      .filter((t) => t.classification === 'grant' && t.source === 'bonusFeat')
      .flatMap((t) => t.grants || [])
      .filter((g) => g.grantType === 'feat' && g.target);

    for (const grant of bonusFeatGrants) {
      const name = grant.target;
      const dedupeKey = `feat::${String(name).toLowerCase()}`;
      const hasStructuredRequirements = Array.isArray(grant.requirements) && grant.requirements.length > 0;
      const hasFreeformOnly = grant.condition && !hasStructuredRequirements;

      if (hasFreeformOnly) {
        // Freeform condition text with no structured requirements — defer, do not auto-grant.
        deferred.push({ name, condition: grant.condition, requirements: grant.requirements || [], frequency: grant.frequency, species: speciesName });
        continue;
      }

      if (hasStructuredRequirements) {
        const { met } = this._evaluateSpeciesBonusFeatRequirements(grant.requirements, selections);
        if (!met) {
          deferred.push({ name, condition: grant.condition, requirements: grant.requirements, frequency: grant.frequency, species: speciesName });
          continue;
        }
        // Requirements met — fall through to grant.
      }

      if (existingByTypeAndName.has(dedupeKey) || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const resolvedDoc = await ProgressionContentAuthority.getFeatDocument({ name, id: name });
      const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
      const baseItem = resolvedData || { name, type: 'feat', system: {} };
      baseItem.name = baseItem.name || name;
      baseItem.type = baseItem.type || 'feat';
      baseItem.system = foundry.utils.mergeObject(baseItem.system || {}, {
        sourceType: 'species',
        locked: true,
        autoGranted: true,
      }, { inplace: false, recursive: true, overwrite: false });
      baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
        swse: {
          progression: {
            sourceSession: sessionId,
            selectionKey: 'species-auto-grants',
            selectionId: name,
          },
          speciesGranted: true,
          sourceSpecies: speciesName,
        },
      }, { inplace: false, recursive: true });
      items.push(baseItem);
    }

    return { items, deferred };
  }


  static async _compileClassStarterEquipmentItems(actor, selections, sessionState) {
    if (sessionState?.mode !== 'chargen') return [];
    if (!this._isJediClassSelection(selections?.class)) return [];
    if (this._actorHasLightsaber(actor)) return [];

    const sessionId = sessionState.sessionId || 'unknown';
    const baseItem = await this._loadStarterLightsaberItemData();
    const itemData = baseItem || this._buildFallbackStarterLightsaberItemData();

    delete itemData._id;
    itemData.name = itemData.name || 'Lightsaber';
    itemData.type = itemData.type || 'weapon';
    itemData.system = foundry.utils.mergeObject(itemData.system || {}, {
      equipped: true,
      carried: true,
      category: 'lightsaber',
      subcategory: 'lightsaber',
      subtype: 'lightsaber',
      itemType: 'lightsaber',
      itemCategory: 'lightsaber',
      workbenchCategory: 'lightsaber',
      weaponCategory: itemData.system?.weaponCategory || 'melee',
      weaponType: itemData.system?.weaponType || 'melee',
      rangeProfile: 'melee',
      equippable: {
        equipped: true,
        slot: 'hand',
      },
      traits: [...new Set([...(Array.isArray(itemData.system?.traits) ? itemData.system.traits : []), 'Lightsaber'])],
      properties: [...new Set([...(Array.isArray(itemData.system?.properties) ? itemData.system.properties : []), 'Lightsaber'])],
    }, { inplace: false, recursive: true, overwrite: true });
    itemData.flags = foundry.utils.mergeObject(itemData.flags || {}, {
      swse: {
        progression: {
          sourceSession: sessionId,
          selectionKey: 'class-starter-equipment',
          selectionId: 'weapon-lightsaber',
          countIndex: 0,
        },
        classStarterEquipment: true,
        autoEquipped: true,
        sourceClass: 'Jedi',
        isLightsaber: true,
      },
      'foundryvtt-swse': {
        isLightsaber: true,
        classStarterEquipment: true,
        autoEquipped: true,
        sourceClass: 'Jedi',
      },
    }, { inplace: false, recursive: true });

    return [itemData];
  }

  static _isJediClassSelection(classSelection = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const candidates = [
      classModel?.name,
      classModel?.className,
      classModel?.id,
      classModel?.classId,
      classSelection?.name,
      classSelection?.className,
      classSelection?.id,
      classSelection?.classId,
      typeof classSelection === 'string' ? classSelection : null,
    ];
    return candidates.some((candidate) => this._normalizeNameKey(candidate) === 'jedi');
  }

  static _actorHasLightsaber(actor) {
    return Array.from(actor?.items || []).some((item) => {
      if (String(item?.type || '').toLowerCase() !== 'weapon') return false;
      const name = this._normalizeNameKey(item?.name);
      const subtype = this._normalizeNameKey(item?.system?.subtype || item?.system?.subcategory || item?.system?.category || item?.system?.weaponCategory);
      const traits = [
        ...(Array.isArray(item?.system?.properties) ? item.system.properties : []),
        ...(Array.isArray(item?.system?.traits) ? item.system.traits : []),
      ].map((value) => this._normalizeNameKey(value));
      return name.includes('lightsaber') || subtype.includes('lightsaber') || traits.includes('lightsaber');
    });
  }

  static async _loadStarterLightsaberItemData() {
    const packCandidates = [
      { pack: 'foundryvtt-swse.weapons', ids: ['weapon-lightsaber'], names: ['Lightsaber'] },
      { pack: 'foundryvtt-swse.weapons-simple', ids: ['weapon-lightsaber'], names: ['Lightsaber'] },
      { pack: 'foundryvtt-swse.weapons-lightsabers', ids: ['lightsaber-chassis-standard'], names: ['Lightsaber (Standard)'] },
    ];

    for (const candidate of packCandidates) {
      const pack = globalThis.game?.packs?.get?.(candidate.pack);
      if (!pack) continue;

      for (const id of candidate.ids) {
        const doc = typeof pack.getDocument === 'function'
          ? await pack.getDocument(id).catch(() => null)
          : null;
        if (doc) return doc.toObject ? doc.toObject() : foundry.utils.deepClone(doc);
      }

      const index = typeof pack.getIndex === 'function'
        ? await pack.getIndex().catch(() => null)
        : null;
      for (const name of candidate.names) {
        const entry = Array.from(index || pack.index || []).find((idx) => String(idx?.name || '').toLowerCase() === String(name || '').toLowerCase());
        if (!entry?._id) continue;
        const doc = typeof pack.getDocument === 'function'
          ? await pack.getDocument(entry._id).catch(() => null)
          : null;
        if (doc) return doc.toObject ? doc.toObject() : foundry.utils.deepClone(doc);
      }
    }

    return null;
  }

  static _buildFallbackStarterLightsaberItemData() {
    return {
      name: 'Lightsaber',
      type: 'weapon',
      img: 'icons/svg/sword.svg',
      system: {
        damage: '2d8',
        damageType: 'energy',
        attackBonus: 0,
        attackAttribute: 'str',
        range: 'Melee',
        weight: 1,
        cost: 12000,
        equipped: true,
        description: '<p>The elegant weapon of the Jedi and Sith. A blade of pure energy capable of cutting through nearly anything.</p>',
        properties: ['Lightsaber', 'Critical 19-20', 'Exotic', 'Armor-Piercing'],
        ammunition: { type: 'none', current: 0, max: 0 },
        weaponCategory: 'melee',
        proficiency: 'exotic',
        subtype: 'lightsaber',
        subcategory: 'lightsaber',
        category: 'lightsaber',
        itemType: 'lightsaber',
        itemCategory: 'lightsaber',
        workbenchCategory: 'lightsaber',
        combat: {
          attack: { ability: 'str', bonus: 0 },
          damage: { dice: '2d8', bonus: 0, type: 'energy', ability: 'str' },
        },
        equippable: { equipped: true, slot: 'hand' },
        rangeProfile: 'melee',
        weaponType: 'melee',
        traits: ['Lightsaber', 'Critical 19-20', 'Exotic', 'Armor-Piercing'],
      },
      effects: [],
      flags: {
        swse: { isLightsaber: true },
        'foundryvtt-swse': { isLightsaber: true },
      },
    };
  }

  static async _compileAutomaticClassFeatureItems(actor, levelUpManifest, sessionState) {
    if (!levelUpManifest?.automaticClassFeatures?.length) return [];
    const existing = new Set((actor?.items || []).map(item => `${String(item.type || '').toLowerCase()}::${String(item.name || '').toLowerCase()}`));
    const out = [];
    for (const feature of levelUpManifest.automaticClassFeatures) {
      const name = feature.name || feature.id;
      if (!name) continue;
      const dedupeKey = `feat::${String(name).toLowerCase()}`;
      if (existing.has(dedupeKey)) continue;
      existing.add(dedupeKey);
      out.push({
        name,
        type: 'feat',
        system: {
          ...(feature.system || {}),
          source: feature.className || 'Class Feature',
          sourceType: 'class-feature',
          classFeature: true,
          autoGranted: true,
          grantedByClass: true,
          locked: true,
          choiceEditable: false,
        },
        flags: {
          swse: {
            progression: {
              sourceSession: sessionState.sessionId || 'unknown',
              selectionKey: 'class-automatic-feature',
              selectionId: feature.id || name,
              countIndex: 0,
            },
            classGranted: true,
            classFeature: true,
            sourceClass: feature.className || null,
          },
        },
      });
    }
    return out;
  }

  static _isRepeatableTalentEntry(entry = {}, resolvedData = null) {
    const system = entry?.system || resolvedData?.system || {};
    if (entry?.repeatable === true || resolvedData?.repeatable === true || system.repeatable === true || system.canRepeat === true || system.allowDuplicates === true) return true;
    const text = [
      entry?.name, entry?.description, entry?.benefit, entry?.special,
      resolvedData?.name, resolvedData?.description, resolvedData?.benefit, resolvedData?.special,
      system.description, system.benefit, system.special, system.details, system.summary,
    ].map(value => {
      if (value == null) return '';
      if (typeof value === 'object') return value.value || value.text || value.raw || value.label || value.name || '';
      return String(value);
    }).join(' ').toLowerCase();
    return /(?:can|may)\s+(?:select|take|choose)\s+this\s+talent\s+multiple\s+times/.test(text)
      || /may\s+be\s+taken\s+multiple\s+times/.test(text)
      || /can\s+be\s+taken\s+multiple\s+times/.test(text)
      || /may\s+be\s+selected\s+multiple\s+times/.test(text)
      || /taken\s+multiple\s+times/.test(text);
  }



  static _normalizeForcePowerMasterySlug(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static _isForcePowerMasteryName(name) {
    return this._normalizeForcePowerMasterySlug(name) === 'force-power-mastery';
  }

  static _getForcePowerMasteryChoice(entry = {}) {
    const candidates = [
      entry?.forcePowerMasteryChoice,
      entry?.system?.forcePowerMastery,
      entry?.system?.choice,
      entry?.system?.selectedChoice,
      entry?.flags?.swse?.forcePowerMastery,
      entry?.flags?.swse?.progression?.forcePowerMastery,
      entry?.flags?.['foundryvtt-swse']?.forcePowerMastery,
    ].filter(Boolean);
    for (const candidate of candidates) {
      const slug = this._normalizeForcePowerMasterySlug(candidate?.slug || candidate?.powerSlug || candidate?.targetSlug || candidate?.id || candidate?.name || candidate?.label || candidate?.value);
      if (!slug) continue;
      return {
        slug,
        label: String(candidate?.label || candidate?.name || candidate?.powerName || candidate?.targetName || slug).trim() || slug,
        powerId: candidate?.powerId || candidate?.id || candidate?.targetId || null,
        powerName: candidate?.powerName || candidate?.name || candidate?.targetName || candidate?.label || slug,
        isLightsaberFormPower: candidate?.isLightsaberFormPower === true,
      };
    }
    const name = String(entry?.name || '').trim();
    const match = name.match(/Force\s+Power\s+Mastery\s*\(([^)]+)\)/i);
    if (match?.[1]) {
      const slug = this._normalizeForcePowerMasterySlug(match[1]);
      if (slug) return { slug, label: match[1].trim(), powerId: null, powerName: match[1].trim(), isLightsaberFormPower: false };
    }
    return null;
  }

  static _getForcePowerMasteryDisplayName(baseName, choice) {
    const rootName = String(baseName || 'Force Power Mastery').replace(/\s*\([^)]*\)\s*$/g, '').trim() || 'Force Power Mastery';
    return choice?.slug ? `${rootName} (${choice.slug})` : rootName;
  }

  static _getBlockDeflectGrantNames(entry = {}) {
    const names = [];
    const add = (value) => {
      const text = String(value ?? '').trim();
      if (text && !names.some(name => this._normalizeNameKey(name) === this._normalizeNameKey(text))) names.push(text);
    };
    const sources = [
      entry?._data?.actualTalentsToGrant,
      entry?._data?.grants,
      entry?.system?.actualTalentsToGrant,
      entry?.system?.grantsTalents,
      entry?.system?.equivalentTalents,
      entry?.flags?.swse?.actualTalentsToGrant,
      entry?.flags?.swse?.grantsTalents,
    ];
    for (const source of sources) {
      for (const value of Array.isArray(source) ? source : []) add(value);
    }
    const normalizedName = this._normalizeNameKey(entry?.name || entry?.label || entry);
    const normalizedGrants = names.map(name => this._normalizeNameKey(name));
    const isCombined = normalizedName === this._normalizeNameKey('Block & Deflect')
      || entry?.system?.isBlockDeflectCombined === true
      || entry?.system?.flags?.isBlockDeflectCombined === true
      || entry?._data?.isBlockDeflectCombined === true
      || entry?.flags?.swse?.isBlockDeflectCombined === true
      || (normalizedGrants.includes(this._normalizeNameKey('Block')) && normalizedGrants.includes(this._normalizeNameKey('Deflect')));
    return isCombined ? ['Block', 'Deflect'] : [];
  }

  static _clonePlainObject(value) {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    return JSON.parse(JSON.stringify(value ?? {}));
  }

  static _expandCombinedTalentGrantEntries(entry) {
    const grantNames = this._getBlockDeflectGrantNames(entry);
    if (!grantNames.length) return [entry];
    return grantNames.map((name) => {
      const cloneSource = entry && typeof entry === 'object' ? entry : { name: String(entry || 'Block & Deflect'), type: 'talent' };
      const clone = this._clonePlainObject(cloneSource);
      clone.id = name;
      clone._id = null;
      clone.name = name;
      clone.label = name;
      clone.type = clone.type || 'talent';
      clone.system = {
        ...(clone.system || {}),
        isBlockDeflectCombined: false,
        combinedHouseRuleSource: 'Block & Deflect',
      };
      delete clone.system.actualTalentsToGrant;
      delete clone.system.grantsTalents;
      delete clone.system.equivalentTalents;
      if (clone.system.flags) clone.system.flags.isBlockDeflectCombined = false;
      clone.flags = foundry.utils.mergeObject(clone.flags || {}, {
        swse: {
          combinedHouseRuleSource: 'Block & Deflect',
          combinedHouseRuleComponent: name,
        },
      }, { inplace: false, recursive: true });
      return clone;
    });
  }

  static async _compileProgressionAbilityItems(actor, selections, sessionState) {
    const sessionId = sessionState.sessionId || 'unknown';
    const itemSpecs = [];
    const deleteItems = [];
    const postApply = { starshipManeuverNames: [], starshipManeuverRemoveItemIds: [], forceTechniqueEntries: [], forceSecretEntries: [] };
    const domainConfig = [
      { key: 'feats', type: 'feat', docGetter: (entry) => ProgressionContentAuthority.getFeatDocument(entry), allowDuplicates: false },
      { key: 'talents', type: 'talent', docGetter: (entry) => ProgressionContentAuthority.getTalentDocument(entry), allowDuplicates: false },
      { key: 'forcePowers', type: 'force-power', docGetter: (entry) => ProgressionContentAuthority.getForceDocument(entry, 'power'), allowDuplicates: true },
      { key: 'forceRegimens', type: 'force-regimen', docGetter: (entry) => ProgressionContentAuthority.getForceDocument(entry, 'regimen'), allowDuplicates: false },
      { key: 'forceTechniques', type: 'force-technique', docGetter: (entry) => ProgressionContentAuthority.getForceDocument(entry, 'technique'), allowDuplicates: false },
      { key: 'forceSecrets', type: 'force-secret', docGetter: (entry) => ProgressionContentAuthority.getForceDocument(entry, 'secret'), allowDuplicates: false },
      { key: 'medicalSecrets', type: 'feat', docGetter: async (entry) => { await MedicalSecretRegistry.ensureInitialized(); return MedicalSecretRegistry.getDocumentByRef(entry); }, allowDuplicates: false },
    ];

    const existingByTypeAndName = new Set(
      actor.items.map((item) => `${String(item.type || '').toLowerCase()}::${String(item.name || '').toLowerCase()}`)
    );
    const existingBySessionMarker = new Set(
      actor.items.map((item) => {
        const meta = item.flags?.swse?.progression;
        if (!meta?.sourceSession || !meta?.selectionKey || !meta?.selectionId) return null;
        return `${meta.sourceSession}::${meta.selectionKey}::${meta.selectionId}::${meta.countIndex || 0}`;
      }).filter(Boolean)
    );

    for (const domain of domainConfig) {
      const rawValues = Array.isArray(selections[domain.key]) ? selections[domain.key] : [];
      const valuesToProcess = domain.key === 'talents'
        ? rawValues.flatMap((entry) => this._expandCombinedTalentGrantEntries(entry))
        : rawValues;
      for (const rawEntry of valuesToProcess) {
        const removeCount = Math.max(0, Number(rawEntry?.removeCount || 0) || 0);
        if (domain.key === 'forcePowers' && removeCount > 0) {
          deleteItems.push(...this._collectOwnedForcePowerItemIds(actor, rawEntry, removeCount));
        }

        const count = Math.max(0, Number(rawEntry?.count ?? 1) || 0);
        if (count <= 0) continue;
        const resolvedDoc = await domain.docGetter(rawEntry);
        const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
        const resolvedName = resolvedData?.name || rawEntry?.name || rawEntry?.id || String(rawEntry);
        const forcePowerMasteryChoice = domain.key === 'forceTechniques'
          ? this._getForcePowerMasteryChoice(rawEntry)
          : null;
        const isForcePowerMasteryEntry = Boolean(forcePowerMasteryChoice)
          || (domain.key === 'forceTechniques' && this._isForcePowerMasteryName(resolvedName));
        const storedName = forcePowerMasteryChoice
          ? this._getForcePowerMasteryDisplayName(resolvedName, forcePowerMasteryChoice)
          : resolvedName;
        const selectionIdentity = rawEntry?.selectionId || (forcePowerMasteryChoice?.slug ? `${rawEntry?.id || rawEntry?.techniqueId || rawEntry?.baseTechniqueId || resolvedName}::${forcePowerMasteryChoice.slug}` : (rawEntry?.id || storedName));

        for (let idx = 0; idx < count; idx += 1) {
          const sessionMarker = `${sessionId}::${domain.key}::${selectionIdentity}::${idx}`;
          const dedupeKey = `${domain.type}::${String(storedName || '').toLowerCase()}`;
          const allowDuplicateForEntry = domain.allowDuplicates
            || (domain.key === 'talents' && this._isRepeatableTalentEntry(rawEntry, resolvedData))
            || (domain.key === 'forceTechniques' && isForcePowerMasteryEntry && Boolean(forcePowerMasteryChoice));
          if (existingBySessionMarker.has(sessionMarker)) continue;
          if (!allowDuplicateForEntry && existingByTypeAndName.has(dedupeKey)) continue;

          const baseItem = resolvedData || {
            name: storedName,
            type: domain.type,
            system: rawEntry?.system || {},
            img: rawEntry?.img || undefined,
          };

          baseItem.name = storedName || baseItem.name || resolvedName;
          baseItem.type = ['forcePowers', 'forceRegimens', 'forceTechniques', 'forceSecrets'].includes(domain.key) ? domain.type : (baseItem.type || domain.type);
          baseItem.system = foundry.utils.mergeObject(baseItem.system || {}, rawEntry?.system || {}, {
            inplace: false,
            recursive: true,
            overwrite: true
          });

          const rawSlotType = String(rawEntry?.slotType || rawEntry?.source || '').trim().toLowerCase();
          const acquisitionMeta = {
            source: rawEntry?.source || rawEntry?.slotType || domain.key,
            slotType: rawEntry?.slotType || rawEntry?.source || null,
            slotKey: rawEntry?.slotKey || null,
            stepId: rawEntry?.stepId || null,
            classId: rawEntry?.classId || rawEntry?.sourceClassId || null,
            className: rawEntry?.className || rawEntry?.sourceClass || null,
            classLevel: rawEntry?.classLevel || rawEntry?.sourceClassLevel || rawEntry?.grantedClassLevel || null,
            characterLevel: rawEntry?.characterLevel || rawEntry?.sourceCharacterLevel || null,
            sourceSession: sessionId,
            selectionKey: domain.key,
            selectionId: selectionIdentity,
          };
          baseItem.system.acquisition = foundry.utils.mergeObject(baseItem.system.acquisition || {}, acquisitionMeta, {
            inplace: false,
            recursive: true,
            overwrite: false
          });
          if (rawSlotType) baseItem.system.slotType = baseItem.system.slotType || rawSlotType;

          if ((domain.key === 'feats' || domain.key === 'talents') && rawSlotType.includes('class')) {
            baseItem.system.sourceType = baseItem.system.sourceType || 'class';
            baseItem.system.grantedByClass = true;
            if (domain.key === 'feats') {
              baseItem.system.locked = true;
              baseItem.system.choiceEditable = false;
            }
          }
          if (domain.key === 'forcePowers') {
            baseItem.system.inSuite = true;
            baseItem.system.executionModel = baseItem.system.executionModel || 'FORCE_POWER';
            baseItem.system.provenance = {
              ...(baseItem.system.provenance || {}),
              grantSourceType: baseItem.system.provenance?.grantSourceType || 'force-training',
              grantSourceId: baseItem.system.provenance?.grantSourceId || rawEntry?.source?.featId || null,
              grantSubtype: baseItem.system.provenance?.grantSubtype || 'progression',
            };
          }
          if (domain.key === 'forceTechniques') {
            baseItem.system.forceDomain = 'technique';
            baseItem.system.tags = Array.from(new Set([...(Array.isArray(baseItem.system.tags) ? baseItem.system.tags : []), 'force_technique']));
          }
          if (domain.key === 'forceSecrets') {
            baseItem.system.forceDomain = 'secret';
            baseItem.system.tags = Array.from(new Set([...(Array.isArray(baseItem.system.tags) ? baseItem.system.tags : []), 'force_secret']));
          }
          if (domain.key === 'forceTechniques' && forcePowerMasteryChoice) {
            baseItem.system.repeatable = true;
            baseItem.system.choice = foundry.utils.mergeObject(baseItem.system.choice || {}, forcePowerMasteryChoice, { inplace: false, recursive: true, overwrite: true });
            baseItem.system.forcePowerMastery = foundry.utils.mergeObject(baseItem.system.forcePowerMastery || {}, forcePowerMasteryChoice, { inplace: false, recursive: true, overwrite: true });
            baseItem.system.selectionSlug = forcePowerMasteryChoice.slug;
            baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
              swse: {
                forcePowerMastery: forcePowerMasteryChoice,
                progression: { forcePowerMastery: forcePowerMasteryChoice },
              },
            }, { inplace: false, recursive: true, overwrite: true });
          }
          if (domain.key === 'medicalSecrets') {
            baseItem.system.medicalSecret = true;
            baseItem.system.sourceType = baseItem.system.sourceType || 'class';
            baseItem.system.locked = true;
            baseItem.system.choiceEditable = false;
            baseItem.system.grantedByClass = true;
            baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
              swse: {
                medicalSecret: true,
                treatInjuryHook: baseItem.system.treatInjuryHook || rawEntry?.system?.treatInjuryHook || null,
              },
            }, { inplace: false, recursive: true });
          }
          baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
            swse: {
              acquisition: acquisitionMeta,
              progression: {
                sourceSession: sessionId,
                selectionKey: domain.key,
                selectionId: selectionIdentity,
                countIndex: idx,
                slotType: rawEntry?.slotType || rawEntry?.source || null,
                source: rawEntry?.source || rawEntry?.slotType || null,
                slotKey: rawEntry?.slotKey || null,
                stepId: rawEntry?.stepId || null,
              },
            },
          }, { inplace: false, recursive: true });

          itemSpecs.push(baseItem);
          if (domain.key === 'forceTechniques') {
            postApply.forceTechniqueEntries.push(this._buildForceKnowledgePostApplyEntry(baseItem, rawEntry, selectionIdentity, sessionId));
          }
          if (domain.key === 'forceSecrets') {
            postApply.forceSecretEntries.push(this._buildForceKnowledgePostApplyEntry(baseItem, rawEntry, selectionIdentity, sessionId));
          }
          existingBySessionMarker.add(sessionMarker);
          if (!allowDuplicateForEntry) existingByTypeAndName.add(dedupeKey);
        }
      }
    }

    const starshipSelections = Array.isArray(selections.starshipManeuvers) ? selections.starshipManeuvers : [];
    for (const rawEntry of starshipSelections) {
      const removeCount = Math.max(0, Number(rawEntry?.removeCount || 0) || 0);
      if (removeCount > 0) {
        const removeIds = this._collectOwnedStarshipManeuverItemIds(actor, rawEntry, removeCount);
        deleteItems.push(...removeIds);
        postApply.starshipManeuverRemoveItemIds.push(...removeIds);
      }

      const count = Math.max(0, Number(rawEntry?.count ?? 1) || 0);
      if (count <= 0) continue;
      const maneuverName = rawEntry?.name || rawEntry?.id || String(rawEntry);
      const existingCount = actor.items.filter((item) => item.type === 'maneuver' && String(item.name || '').toLowerCase() === String(maneuverName).toLowerCase()).length;

      for (let idx = 0; idx < count; idx += 1) {
        const sessionMarker = `${sessionId}::starshipManeuvers::${rawEntry?.id || maneuverName}::${idx}`;
        if (existingBySessionMarker.has(sessionMarker)) continue;

        const maneuverItem = {
          name: maneuverName,
          type: 'maneuver',
          system: {
            ...(rawEntry?.system || {}),
            description: rawEntry?.description || rawEntry?.system?.description || '',
            uses: rawEntry?.system?.uses || { current: 1, max: 1 },
            spent: rawEntry?.system?.spent || false,
            inSuite: true,
          },
          img: rawEntry?.img || undefined,
          flags: {
            swse: {
              progression: {
                sourceSession: sessionId,
                selectionKey: 'starshipManeuvers',
                selectionId: rawEntry?.id || maneuverName,
                countIndex: idx,
              },
            },
          },
        };

        itemSpecs.push(maneuverItem);
        existingBySessionMarker.add(sessionMarker);
        postApply.starshipManeuverNames.push(maneuverName);
        existingByTypeAndName.add(`maneuver::${String(maneuverName || '').toLowerCase()}::${existingCount + idx}`);
      }
    }

    return { items: itemSpecs, deleteItems: Array.from(new Set(deleteItems)), postApply };
  }

  static _collectOwnedForcePowerItemIds(actor, rawEntry, count = 0) {
    const targetId = this._normalizeNameKey(rawEntry?.id || rawEntry?._id || rawEntry?.slug || rawEntry?.name || rawEntry);
    const targetName = this._normalizeNameKey(rawEntry?.name || rawEntry?.label || rawEntry?.id || rawEntry);
    const matches = actor.items.filter((item) => {
      const type = String(item?.type || '').toLowerCase();
      const executionModel = String(item?.system?.executionModel || item?.system?.abilityType || '').toLowerCase();
      if (!(type === 'force-power' || type === 'power' || executionModel === 'force_power')) return false;
      const candidates = [
        item.id,
        item._id,
        item.name,
        item.system?.slug,
        item.system?.abilities?.id,
        item.flags?.swse?.progression?.selectionId,
      ].map((value) => this._normalizeNameKey(value)).filter(Boolean);
      return candidates.includes(targetId) || candidates.includes(targetName);
    });
    return matches.slice(0, Math.max(0, Number(count) || 0)).map((item) => item.id).filter(Boolean);
  }

  static _collectOwnedStarshipManeuverItemIds(actor, rawEntry, count = 0) {
    const targetId = this._normalizeNameKey(rawEntry?.id || rawEntry?._id || rawEntry?.slug || rawEntry?.name || rawEntry);
    const targetName = this._normalizeNameKey(rawEntry?.name || rawEntry?.label || rawEntry?.id || rawEntry);
    const suiteIds = new Set(Array.isArray(actor?.system?.starshipManeuverSuite?.maneuvers)
      ? actor.system.starshipManeuverSuite.maneuvers.map((value) => String(value))
      : []);
    const matches = actor.items.filter((item) => {
      if (String(item?.type || '').toLowerCase() !== 'maneuver') return false;
      if (suiteIds.size && !suiteIds.has(String(item.id || item._id)) && !suiteIds.has(String(item.name || ''))) return false;
      const candidates = [
        item.id,
        item._id,
        item.name,
        item.system?.slug,
        item.flags?.swse?.progression?.selectionId,
      ].map((value) => this._normalizeNameKey(value)).filter(Boolean);
      return candidates.includes(targetId) || candidates.includes(targetName);
    });
    return matches.slice(0, Math.max(0, Number(count) || 0)).map((item) => item.id).filter(Boolean);
  }

  static async _syncPostApplyState(actor, mutationPlan) {
    const engine = this._resolveActorEngine();
    const starshipManeuverNames = mutationPlan?.metadata?.postApply?.starshipManeuverNames || [];
    const removeIds = new Set((mutationPlan?.metadata?.postApply?.starshipManeuverRemoveItemIds || []).map((id) => String(id)));
    if (!engine?.updateActor || (!starshipManeuverNames.length && !removeIds.size)) return;

    const suite = actor.system?.starshipManeuverSuite || { maneuvers: [] };
    const existing = new Set(Array.isArray(suite.maneuvers) ? suite.maneuvers.filter((id) => !removeIds.has(String(id))) : []);
    const matchingIds = actor.items
      .filter((item) => item.type === 'maneuver' && starshipManeuverNames.includes(item.name))
      .map((item) => item.id)
      .filter(Boolean);

    let changed = removeIds.size > 0;
    for (const id of matchingIds) {
      if (existing.has(id)) continue;
      existing.add(id);
      changed = true;
    }

    if (changed) {
      await engine.updateActor(actor, {
        'system.starshipManeuverSuite.maneuvers': Array.from(existing),
        'system.starshipManeuverSuite.max': Math.max(Number(suite.max || 0), existing.size),
      }, { source: 'ProgressionFinalizer._syncPostApplyState' });
    }
  }

  static _auditLevelUpFinalization(actor, mutationPlan, sessionState) {
    const manifest = mutationPlan?.set?.['flags.swse.levelUpEntitlementManifest']
      || sessionState?.progressionSession?.levelUpEntitlementManifest
      || null;
    if (!manifest) return { ok: true, errors: [], warnings: [] };
    return auditLevelUpActorAfterFinalization(actor, manifest, sessionState?.progressionSession || null);
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
  static _resolveActorEngine() {
    const candidates = [
      globalThis.SWSE?.ActorEngine,
      globalThis.game?.swse?.ActorEngine,
      globalThis.ActorEngine,
      CanonicalActorEngine,
    ].filter(Boolean);

    // Some boot paths expose an older global ActorEngine facade before the
    // canonical module is loaded. Prefer an engine that can actually apply the
    // mutation plan; otherwise fall back to the richest mutation surface.
    return candidates.find(engine => typeof engine?.applyMutationPlan === 'function')
      || candidates.find(engine => typeof engine?.applyProgression === 'function')
      || candidates.find(engine => typeof engine?.updateActor === 'function')
      || CanonicalActorEngine;
  }

  static async _applyMutationPlan(actor, mutationPlan) {
    try {
      const engine = this._resolveActorEngine();
      if (!engine?.applyMutationPlan) {
        throw new Error('ActorEngine.applyMutationPlan unavailable');
      }
      await engine.applyMutationPlan(actor, mutationPlan, {
        source: 'ProgressionFinalizer.finalize',
        validate: true,
        rederive: true,
        // Progression finalization is actor-local; roll the actor back to its
        // pre-plan state if any operation in the plan fails, so a level-up can
        // never leave a half-applied character.
        transactional: true,
      });
      await this._syncPostApplyState(actor, mutationPlan);
      return { success: true, result: { actorId: actor.id } };
    } catch (error) {
      swseLogger.error('[ProgressionFinalizer] Mutation plan application failed', error);
      return { success: false, error: error.message };
    }
  }

}
