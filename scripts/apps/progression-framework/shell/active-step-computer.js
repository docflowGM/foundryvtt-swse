/**
 * Active-Step Computer — Phase 2
 *
 * Derives the list of active steps from:
 * 1. Candidate-node registry
 * 2. Mode and subtype
 * 3. Session state (normalized selections)
 * 4. Prerequisite/entitlement evaluation
 * 5. Invalidation/dirty state
 *
 * This replaces:
 * - Hard-coded step arrays in chargen-shell and levelup-shell
 * - Ad-hoc conditional resolver logic
 * - Manual step filtering scattered across shell code
 *
 * Usage:
 *   const computer = new ActiveStepComputer();
 *   const activeSteps = await computer.computeActiveSteps(
 *     actor,
 *     mode,
 *     progressionSession,
 *     { subtype: 'actor' }
 *   );
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  PROGRESSION_NODE_REGISTRY,
  ActivationPolicy,
  getNodesForModeAndSubtype,
  getDownstreamDependents,
} from '../../../engine/progression/registries/progression-node-registry.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';
import { resolveClassModel } from '../../../engine/progression/utils/class-resolution.js';
import { ClassFeatRegistry } from '../../../engine/progression/feats/class-feat-registry.js';
import { LanguageEngine } from '../../../engine/progression/engine/language-engine.js';
import { buildLevelUpEventContext, countClassFeatureChoicesAtLevel } from '../../../engine/progression/utils/levelup-event-context.js';
import { buildLevelUpEntitlementManifest } from '../../../engine/progression/utils/levelup-entitlement-manifest.js';
import { PendingEntitlementService } from '../services/pending-entitlement-service.js';

function isDroidActorForProgression(actor, progressionSession = null) {
  return actor?.type === 'droid'
    || actor?.system?.isDroid === true
    || progressionSession?.subtype === 'droid'
    || progressionSession?.droidContext?.isDroid === true;
}

export class ActiveStepComputer {
  /**
   * Compute the active step list for an actor in a given mode.
   *
   * @param {Actor} actor - The actor being progressed
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Object} options
   * @param {string} options.subtype - Character subtype (actor, npc, droid, etc.)
   * @param {Array<string>} options.invalidatedNodes - Nodes marked dirty/purged
   * @returns {Promise<Array<string>>} Ordered list of active nodeIds
   */
  async computeActiveSteps(actor, mode, progressionSession, options = {}) {
    const { subtype = 'actor', invalidatedNodes = [] } = options;

    try {
      // Step 1: Get candidate nodes for this mode + subtype
      const candidateNodes = getNodesForModeAndSubtype(mode, subtype);

      if (candidateNodes.length === 0) {
        swseLogger.warn(
          '[ActiveStepComputer] No candidate nodes found',
          { mode, subtype }
        );
        return [];
      }

      // Step 2: Evaluate activation policy for each candidate
      const activeNodeIds = [];

      for (const node of candidateNodes) {
        const isActive = await this._evaluateNodeActivation(
          node,
          actor,
          mode,
          progressionSession
        );

        if (isActive) {
          activeNodeIds.push(node.nodeId);
        }
      }

      // Step 3: Sort into correct sequence
      // (Registry order is canonical; we preserve it)
      const sortedActive = candidateNodes
        .filter(node => activeNodeIds.includes(node.nodeId))
        .map(node => node.nodeId);

      // Step 4: Evaluate applicability — filter out steps with no actionable work
      const applicableActive = [];
      for (const nodeId of sortedActive) {
        const node = PROGRESSION_NODE_REGISTRY[nodeId];
        const isApplicable = await this._evaluateStepApplicability(
          node,
          actor,
          mode,
          progressionSession
        );
        if (isApplicable) {
          applicableActive.push(nodeId);
        }
      }

      // Step 5: Route through adapter seam for subtype-specific contribution
      // Phase 1: Adapter can suppress/modify active steps based on subtype rules
      const adapter = progressionSession.subtypeAdapter;
      let finalActive = this._dedupeNodeIds(applicableActive);
      if (adapter) {
        // Phase 2.8: Ensure session has mode for adapter logic (e.g., Beast level-up feat filtering)
        const sessionWithMode = { ...progressionSession, mode };
        finalActive = this._dedupeNodeIds(await adapter.contributeActiveSteps(finalActive, sessionWithMode, actor));
      }

      // Confirm/review nodes must always be terminal. Conditional follow-up steps
      // such as Force Powers unlocked by Force Training are still work surfaces and
      // must never be appended after Summary/Level-Up Review.
      finalActive = this._orderFinalNodesLast(finalActive);

      swseLogger.debug('[ActiveStepComputer] Computed active steps', {
        mode,
        subtype,
        count: finalActive.length,
        steps: finalActive,
        adapterContributed: !!adapter,
      });

      return finalActive;
    } catch (err) {
      swseLogger.error('[ActiveStepComputer] Error computing active steps:', err);
      return [];
    }
  }



  _dedupeNodeIds(nodeIds = []) {
    const seen = new Set();
    const result = [];
    for (const nodeId of nodeIds || []) {
      if (!nodeId || seen.has(nodeId)) continue;
      seen.add(nodeId);
      result.push(nodeId);
    }
    return result;
  }

  _orderFinalNodesLast(nodeIds = []) {
    const nonFinal = [];
    const finalNodes = [];
    for (const nodeId of nodeIds || []) {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      if (node?.isFinal === true) finalNodes.push(nodeId);
      else nonFinal.push(nodeId);
    }
    return [...nonFinal, ...finalNodes];
  }

  /**
   * Evaluate whether a step has actionable work for current session state.
   * A step is "applicable" if the player has something to do in it.
   * Non-applicable steps are hidden and auto-skipped in navigation.
   *
   * @param {Object} node - Node definition from registry
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _evaluateStepApplicability(node, actor, mode, progressionSession) {
    try {
      switch (node.nodeId) {
        // Droid construction owns droid identity. Biological Species is never
        // actionable for droid actors, even if an old session accidentally
        // labels them with the generic actor subtype.
        case 'species':
          return !isDroidActorForProgression(actor, progressionSession);

        // Ability increases are level-event work in level-up, not an every-level chargen carryover.
        case 'attribute':
          return this._hasAttributeIncreaseWork(actor, progressionSession, mode);

        // Skills are chargen work unless a level-up entitlement explicitly grants skill choices.
        case 'skills':
          return this._hasSkillChoices(actor, progressionSession, mode);

        // Languages: applicable only if unallocated language slots exist
        case 'languages':
          return this._hasUnallocatedLanguageSlots(actor, progressionSession, mode);

        // New base-class survey: only after selecting a new base class after level 1
        case 'base-class-survey':
          return this._hasBaseClassSurveyWork(actor, progressionSession);

        // Prestige survey: only after selecting a new prestige class
        case 'prestige-survey':
          return this._hasPrestigeSurveyWork(actor, progressionSession);

        // Feat steps: applicable if legal choices exist
        case 'general-feat':
        case 'class-feat':
          return this._hasFeatChoices(node.nodeId, actor, progressionSession, mode);

        // Talent steps: applicable if legal choices exist
        case 'general-talent':
        case 'class-talent':
          return this._hasTalentChoices(node.nodeId, actor, progressionSession, mode);

        // Force powers: applicable if entitlements > used count
        case 'force-powers':
          return await this._hasForcePowerChoices(actor, progressionSession);

        // Force secrets/techniques: applicable if entitlements exist
        case 'force-secrets':
          return this._hasForceSecretChoices(actor, progressionSession);

        case 'force-techniques':
          return this._hasForceTechniqueChoices(actor, progressionSession);

        case 'medical-secrets':
          return this._hasMedicalSecretChoices(actor, progressionSession);

        // Starship maneuvers: applicable if entitlements exist
        case 'starship-maneuvers':
          return this._hasStarshipChoices(actor, progressionSession);

        // Droid builder: normal droid subtype always needs it; organic actors only
        // need it when their selected species requires a constrained droid shell.
        case 'droid-builder':
          return this._hasDroidBuilderWork(actor, progressionSession);

        // Droid-only configuration: applicable if deferred droid build exists
        case 'final-droid-configuration':
          return this._hasDroidBuildPending(progressionSession);

        // Canonical steps are always applicable (they're always needed)
        default:
          return true;
      }
    } catch (err) {
      swseLogger.warn(
        `[ActiveStepComputer] Error evaluating applicability for ${node.nodeId}:`,
        err
      );
      // Default to applicable on error (fail-safe: don't hide steps)
      return true;
    }
  }



  _hasAttributeIncreaseWork(actor, progressionSession, mode = 'chargen') {
    if (mode !== 'levelup') return true;
    const manifest = buildLevelUpEntitlementManifest(actor, progressionSession);
    const hasPendingSelection = !!progressionSession?.draftSelections?.attributes;
    return hasPendingSelection || manifest.abilityIncreases.required === true;
  }

  _hasSkillChoices(actor, progressionSession, mode = 'chargen') {
    if (mode !== 'levelup') return true;

    const slots = this._countPendingSkillTrainingSlots(actor, progressionSession);
    if (slots <= 0) return false;

    const selectedNewSkills = this._countNewlySelectedTrainedSkills(actor, progressionSession);
    return selectedNewSkills < slots || !!progressionSession?.draftSelections?.skills;
  }

  _countPendingSkillTrainingSlots(actor, progressionSession) {
    const draft = progressionSession?.draftSelections || {};
    const entitlements = Array.isArray(draft.pendingEntitlements) ? draft.pendingEntitlements : [];
    const entitlementSlots = PendingEntitlementService.countUnspentByType(entitlements, 'skill_training_slot', {
      exclude: (entry) => {
        const combined = `${JSON.stringify(entry?.source || {}).toLowerCase()} ${String(entry?.sourceName || entry?.label || entry?.reason || entry?.id || '').toLowerCase()}`;
        if (combined.includes('intelligence') || combined.includes('int increase') || combined.includes('ability increase')) return true;
        if (combined.includes('chargen') || combined.includes('character creation') || combined.includes('starting') || combined.includes('initial')) return true;
        if (combined.includes('class skill') || combined.includes('trained skills + int') || combined.includes('base skill')) return true;
        const isExplicitIncremental = combined.includes('feat')
          || combined.includes('talent')
          || combined.includes('bonus')
          || combined.includes('levelup')
          || combined.includes('level up')
          || combined.includes('skill training');
        return !isExplicitIncremental;
      },
    });

    const pendingFeats = Array.isArray(draft.feats) ? draft.feats : [];
    const featSlots = pendingFeats.reduce((sum, feat) => {
      const name = String(feat?.name || feat?.label || feat?.id || feat || '').toLowerCase();
      if (name !== 'skill training' && !name.includes('skill training')) return sum;
      return sum + Math.max(1, Number(feat?.count || 1));
    }, 0);

    const intDeltaSlots = this._getPendingIntModifierDelta(actor, progressionSession);
    return Math.max(entitlementSlots, featSlots) + intDeltaSlots;
  }

  _getActorAbilityScore(actor, abilityKey = 'int') {
    const ability = actor?.system?.abilities?.[abilityKey] || actor?.system?.attributes?.[abilityKey] || {};
    const explicit = Number(ability.total ?? ability.score ?? ability.value);
    if (Number.isFinite(explicit)) return explicit;
    const base = Number(ability.base ?? 10);
    const racial = Number(ability.racial ?? ability.species ?? 0);
    const enhancement = Number(ability.enhancement ?? 0);
    const temp = Number(ability.temp ?? 0);
    const total = (Number.isFinite(base) ? base : 10)
      + (Number.isFinite(racial) ? racial : 0)
      + (Number.isFinite(enhancement) ? enhancement : 0)
      + (Number.isFinite(temp) ? temp : 0);
    return Number.isFinite(total) ? total : 10;
  }

  _abilityModifier(score) {
    const safe = Number(score);
    return Math.floor(((Number.isFinite(safe) ? safe : 10) - 10) / 2);
  }

  _getPendingAbilityScore(actor, progressionSession, abilityKey = 'int') {
    const current = this._getActorAbilityScore(actor, abilityKey);
    const attributes = progressionSession?.draftSelections?.attributes || null;
    if (!attributes) return current;

    const direct = Number(
      attributes?.finalValues?.[abilityKey]
        ?? attributes?.values?.[abilityKey]
        ?? attributes?.[abilityKey]?.score
        ?? attributes?.[abilityKey]?.value
        ?? attributes?.[abilityKey]
    );
    if (Number.isFinite(direct)) return direct;

    const increase = Number(attributes?.increases?.[abilityKey] ?? 0);
    if (Number.isFinite(increase) && increase > 0) return current + increase;
    return current;
  }

  _getPendingIntModifierDelta(actor, progressionSession) {
    const currentMod = this._abilityModifier(this._getActorAbilityScore(actor, 'int'));
    const attributes = progressionSession?.draftSelections?.attributes || null;
    const explicitPendingMod = Number(attributes?.modifiers?.int);
    const pendingMod = Number.isFinite(explicitPendingMod)
      ? explicitPendingMod
      : this._abilityModifier(this._getPendingAbilityScore(actor, progressionSession, 'int'));
    return Math.max(0, pendingMod - currentMod);
  }

  _countOwnedLinguistInstances(actor) {
    return (actor?.items || []).filter(item => {
      const name = String(item?.name || item?.system?.name || '').toLowerCase();
      return item?.type === 'feat' && (name === 'linguist' || name.includes('linguist'));
    }).length;
  }

  _countPendingLinguistInstances(progressionSession) {
    const pendingFeats = Array.isArray(progressionSession?.draftSelections?.feats) ? progressionSession.draftSelections.feats : [];
    return pendingFeats.reduce((total, feat) => {
      const name = String(feat?.name || feat?.label || feat?.id || feat || '').toLowerCase();
      if (name !== 'linguist' && !name.includes('linguist')) return total;
      return total + Math.max(1, Number(feat?.count || 1));
    }, 0);
  }

  _countPendingLanguageEntitlementSlots(progressionSession) {
    const entitlements = Array.isArray(progressionSession?.draftSelections?.pendingEntitlements)
      ? progressionSession.draftSelections.pendingEntitlements
      : [];
    return PendingEntitlementService.countUnspentByType(entitlements, 'language_pick', {
      exclude: (entry) => {
        const featName = String(entry?.source?.featName || entry?.sourceName || '').toLowerCase();
        const combined = `${JSON.stringify(entry?.source || {}).toLowerCase()} ${String(entry?.sourceName || entry?.label || entry?.reason || entry?.id || '').toLowerCase()}`;
        // Linguist is counted from pending feats/FeatGrantEntitlementResolver so
        // a generated language_pick record must not double count it here.
        if (featName === 'linguist' || featName.includes('linguist')) return true;
        if (combined.includes('intelligence') || combined.includes('int increase') || combined.includes('ability increase')) return true;
        if (combined.includes('chargen') || combined.includes('character creation') || combined.includes('starting') || combined.includes('initial')) return true;
        if (combined.includes('base language') || combined.includes('species language') || combined.includes('starting language')) return true;
        const isExplicitIncremental = combined.includes('feat')
          || combined.includes('talent')
          || combined.includes('bonus')
          || combined.includes('levelup')
          || combined.includes('level up')
          || combined.includes('language');
        return !isExplicitIncremental;
      },
    });
  }

  _countLevelupLanguageSlots(actor, progressionSession) {
    const intDelta = this._getPendingIntModifierDelta(actor, progressionSession);
    const pendingScore = this._getPendingAbilityScore(actor, progressionSession, 'int');
    const pendingIntMod = Math.max(0, this._abilityModifier(pendingScore));
    const ownedLinguistSlotsFromIntDelta = this._countOwnedLinguistInstances(actor) * intDelta;
    const pendingLinguistSlots = this._countPendingLinguistInstances(progressionSession) * Math.max(1, 1 + pendingIntMod);
    return intDelta + ownedLinguistSlotsFromIntDelta + pendingLinguistSlots + this._countPendingLanguageEntitlementSlots(progressionSession);
  }

  _countNewlySelectedTrainedSkills(actor, progressionSession) {
    const selected = this._extractTrainedSkillKeys(progressionSession?.draftSelections?.skills);
    if (!selected.length) return 0;

    const actorTrained = new Set(
      Object.entries(actor?.system?.skills || {})
        .filter(([, data]) => data?.trained === true)
        .map(([key]) => this._normalizeSkillKey(key))
    );

    return selected
      .map(key => this._normalizeSkillKey(key))
      .filter(Boolean)
      .filter(key => !actorTrained.has(key))
      .length;
  }

  _extractTrainedSkillKeys(rawSelection) {
    if (!rawSelection) return [];
    const raw = rawSelection?.trained ?? rawSelection;
    const entries = Array.isArray(raw) ? raw : Object.entries(raw || {}).map(([key, value]) => {
      if (value === true) return key;
      if (value?.trained === true) return value?.key || value?.id || key;
      return null;
    });

    const keys = [];
    for (const entry of entries || []) {
      const key = typeof entry === 'string'
        ? entry
        : entry?.key || entry?.id || entry?.skill || entry?.name || null;
      if (key) keys.push(key);
    }
    return Array.from(new Set(keys));
  }

  _normalizeSkillKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }


  _normalizeLanguageKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  _extractLanguageKeys(rawSelection) {
    const keys = [];
    const pushEntry = (entry, fallbackKey = null) => {
      if (!entry) return;
      if (typeof entry === 'string') {
        keys.push(entry);
        return;
      }
      if (entry === true && fallbackKey) {
        keys.push(fallbackKey);
        return;
      }
      if (typeof entry !== 'object') return;
      if (entry.known === false || entry.selected === false || entry.enabled === false) return;
      const key = entry.key || entry.id || entry.slug || entry.name || entry.label || entry.language || fallbackKey;
      if (key) keys.push(key);
    };

    const visit = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(entry => pushEntry(entry));
        return;
      }
      if (typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
          if (entry === true) pushEntry(key);
          else pushEntry(entry, key);
        }
      }
    };

    visit(rawSelection?.known ?? rawSelection?.selected ?? rawSelection?.languages ?? rawSelection);
    return Array.from(new Set(keys.map(key => this._normalizeLanguageKey(key)).filter(Boolean)));
  }

  _getActorKnownLanguageKeys(actor) {
    const system = actor?.system || {};
    const keys = [];
    const collect = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(entry => keys.push(...this._extractLanguageKeys([entry])));
        return;
      }
      if (typeof value === 'object') {
        keys.push(...this._extractLanguageKeys(value));
      }
    };

    collect(system.languages);
    collect(system.languages?.known);
    collect(system.details?.languages);
    collect(system.details?.languages?.known);
    collect(system.traits?.languages);
    collect(system.traits?.languages?.value);
    collect(system.progression?.languages);
    collect(system.progression?.languages?.known);

    return new Set(keys.map(key => this._normalizeLanguageKey(key)).filter(Boolean));
  }

  _hasBaseClassSurveyWork(actor, progressionSession) {
    const context = buildLevelUpEventContext(actor, progressionSession);
    if (!context?.isNewBaseClass) return false;

    const classKey = context.selectedClassId;
    if (!classKey) return false;

    const completed = actor?.system?.swse?.classSurveyResponses?.[classKey]?.completed === true
      || progressionSession?.draftSelections?.classSurveys?.[classKey]?.completed === true;
    return !completed;
  }

  _hasPrestigeSurveyWork(actor, progressionSession) {
    const context = buildLevelUpEventContext(actor, progressionSession);
    if (!context?.isNewPrestigeClass) return false;

    const classKey = context.selectedClassId;
    if (!classKey) return false;

    const completed = actor?.system?.swse?.prestigeSurveyResponses?.[classKey]?.completed === true;
    if (completed) return false;

    const sessionSurvey = progressionSession?.draftSelections?.prestigeSurvey;
    if (sessionSurvey?.completed === true && (sessionSurvey?.classId === classKey || sessionSurvey?.classId === context.selectedClassName)) {
      return false;
    }

    return true;
  }


  _hasDroidBuilderWork(actor, progressionSession) {
    if (isDroidActorForProgression(actor, progressionSession)) {
      return true;
    }
    const context = progressionSession?.draftSelections?.pendingSpeciesContext || null;
    const droidBuilder = context?.metadata?.droidBuilder || context?.ledger?.rules?.droidBuilder || null;
    return !!droidBuilder?.required;
  }

  /**
   * Check if actor has unallocated language slots.
   * PHASE 6: Reads from pending progression state instead of committed actor
   * PHASE 7: Dynamic Linguist compatibility instead of hardcoded bonus
   * @private
   */
  _hasUnallocatedLanguageSlots(actor, progressionSession, mode = 'chargen') {
    // Never remove Languages while it is the current live step. The final bonus
    // language click may spend the last slot; removing the current step during
    // that same commit causes an unsolicited jump to Summary and can discard
    // transient UI state.
    if (progressionSession?.currentStepId === 'languages') return true;

    let bonusSlots;
    if (mode === 'levelup') {
      // Level-up owes only newly-created language picks this event: INT modifier
      // increases, existing Linguist scaling from that INT increase, newly-taken
      // Linguist, and explicit pending language entitlements. Do not compare the
      // draft against the actor's lifetime language entitlement.
      bonusSlots = this._countLevelupLanguageSlots(actor, progressionSession);
    } else {
      // Chargen still compares against the total bonus-language entitlement.
      bonusSlots = Math.max(0, Number(
        LanguageEngine.calculateBonusLanguagesAvailable(actor, {
          shell: { actor, progressionSession },
          progressionSession,
          includePending: true,
        }) || 0
      ));
    }

    const selectedKeys = this._extractLanguageKeys(progressionSession?.draftSelections?.languages);
    const selectedLanguages = mode === 'levelup'
      ? selectedKeys.filter(key => !this._getActorKnownLanguageKeys(actor).has(key)).length
      : selectedKeys.length;

    return selectedLanguages < bonusSlots;
  }

  /**
   * Check if legal feat choices exist for this feat type.
   * @private
   */
  async _hasFeatChoices(stepNodeId, actor, progressionSession, mode = 'chargen') {
    const manifest = mode === 'levelup' ? buildLevelUpEntitlementManifest(actor, progressionSession) : null;

    if (stepNodeId !== 'class-feat') {
      if (mode !== 'levelup') return true;
      return manifest?.generalFeat?.required === true;
    }

    try {
      if (mode === 'levelup' && manifest?.multiclassStartingFeat?.required === true) {
        return (manifest.multiclassStartingFeat.options || []).length > 0;
      }

      const classSelection = progressionSession?.getSelection?.('class') || progressionSession?.draftSelections?.class || null;
      const classModel = resolveClassModel(classSelection);
      if (!classModel) {
        return false;
      }

      const classFeatChoices = mode === 'levelup'
        ? Number(manifest?.choices?.classFeatChoices || 0)
        : (() => {
          const levelContext = buildLevelUpEventContext(actor, progressionSession);
          const classLevel = levelContext?.selectedClassNextLevel || 1;
          const levelEntry = Array.isArray(classModel.levelProgression)
            ? classModel.levelProgression.find(entry => Number(entry.level) === classLevel)
            : null;
          const features = levelEntry?.features || [];
          return features.some(feature => {
            const type = String(feature?.type || '').toLowerCase();
            const name = String(feature?.name || feature || '').toLowerCase();
            return type === 'feat_choice' || name.includes('bonus feat');
          }) ? 1 : 0;
        })();

      if (classFeatChoices <= 0) {
        return false;
      }

      const lookupKeys = [classModel.sourceId, classModel.id, classModel.name].filter(Boolean);
      const allowed = await ClassFeatRegistry.getClassBonusFeats(lookupKeys);
      return allowed.length > 0;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error evaluating class-feat applicability:', err);
      return false;
    }
  }

  /**
   * Check if legal talent choices exist for this talent type.
   * @private
   */
  _hasTalentChoices(stepNodeId, actor, progressionSession, mode = 'chargen') {
    const classSelection = progressionSession?.getSelection?.('class') || progressionSession?.draftSelections?.class || null;
    const classModel = resolveClassModel(classSelection);
    if (!classModel) return false;

    if (mode === 'levelup') {
      const manifest = buildLevelUpEntitlementManifest(actor, progressionSession);
      if (stepNodeId === 'general-talent') {
        return Number(manifest?.heroicTalent?.count || 0) > 0;
      }
      if (stepNodeId === 'class-talent') {
        return Number(manifest?.choices?.talentChoices || 0) > 0;
      }
    }

    const owedTalents = countClassFeatureChoicesAtLevel(
      classModel,
      buildLevelUpEventContext(actor, progressionSession)?.selectedClassNextLevel || 1,
      'talent_choice'
    );

    return owedTalents > 0;
  }

  /**
   * Check if force power entitlements exist and have unfilled slots.
   * @private
   */
  async _hasForcePowerChoices(actor, progressionSession) {
    try {
      const { resolveForcePowerEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );
      const entitlements = await resolveForcePowerEntitlements(progressionSession, actor);
      if (!(entitlements.remaining > 0)) return false;
      const isLevelUpLike = progressionSession?.mode === 'levelup';
      if (!isLevelUpLike) return true;

      // Level-up should not open the Force Power surface solely because the
      // actor/class has Force access metadata. The entitlement resolver must
      // identify a concrete current-event source: explicit class force power
      // grants or pending Force Training slot grants.
      const manifest = buildLevelUpEntitlementManifest(actor, progressionSession);
      const classGrantCount = Number(manifest?.choices?.forcePowerChoices || 0) || 0;
      const hasConcreteReason = (entitlements.reasons || []).some(reason =>
        /force training|force_power_grants|force power entitlement|class level/i.test(String(reason || ''))
      );
      return classGrantCount > 0 || hasConcreteReason;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking force power grants:', err);
      return false;
    }
  }

  /**
   * Check if force secret entitlements exist.
   * PHASE 3: Uses real class grant budget instead of proxy signals.
   * @private
   */
  async _hasForceSecretChoices(actor, progressionSession) {
    try {
      // Import the entitlement resolver
      const { resolveForceSecretEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );

      // Check the real class progression grant budget
      const entitlements = resolveForceSecretEntitlements(progressionSession, null, actor);
      const hasGrants = entitlements.remaining > 0;

      if (!hasGrants) {
        swseLogger.debug('[ActiveStepComputer] Force Secrets: no class grants resolved');
      }

      return hasGrants;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking force secret grants:', err);
      return false; // Fail closed
    }
  }

  /**
   * Check if force technique entitlements exist.
   * PHASE 3: Uses real class grant budget instead of proxy signals.
   * @private
   */
  async _hasForceTechniqueChoices(actor, progressionSession) {
    try {
      // Import the entitlement resolver
      const { resolveForceTechniqueEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );

      // Check the real class progression grant budget
      const entitlements = resolveForceTechniqueEntitlements(progressionSession, null, actor);
      const hasGrants = entitlements.remaining > 0;

      if (!hasGrants) {
        swseLogger.debug('[ActiveStepComputer] Force Techniques: no class grants resolved');
      }

      return hasGrants;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking force technique grants:', err);
      return false; // Fail closed
    }
  }

  /**
   * Check if Medic Medical Secret entitlements exist.
   * Uses real class grant budget instead of proxy signals.
   * @private
   */
  async _hasMedicalSecretChoices(actor, progressionSession) {
    try {
      const { resolveMedicalSecretEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/medical-secret-resolution.js'
      );

      const entitlements = resolveMedicalSecretEntitlements(progressionSession, null, actor);
      const hasGrants = entitlements.total > 0 && entitlements.remaining > 0;

      if (!hasGrants) {
        swseLogger.debug('[ActiveStepComputer] Medical Secrets: no unfilled class grants resolved');
      }

      return hasGrants;
    } catch (err) {
      swseLogger.warn('[ActiveStepComputer] Error checking medical secret grants:', err);
      return false;
    }
  }


  _buildProgressionAuthorityOptions(actor, progressionSession) {
    return {
      actor,
      includePending: true,
      progressionSession,
      shell: {
        actor,
        mode: progressionSession?.mode || 'levelup',
        progressionSession,
        draftSelections: progressionSession?.draftSelections || {},
        buildIntent: progressionSession?.buildIntent || null,
        committedSelections: progressionSession?.committedSelections || null,
      },
    };
  }

  /**
   * Check if starship maneuver entitlements exist.
   * PHASE 3: Uses real ManeuverAuthorityEngine validation instead of placeholder.
   * @private
   */
  async _hasStarshipChoices(actor, progressionSession) {
    const actorName = actor?.name || 'unknown';
    const diagnostics = {
      actorName,
      engineImport: null,
      accessValidation: null,
    };

    try {
      // Import the authority engine
      let ManeuverAuthorityEngine;
      try {
        const imported = await import(
          '/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js'
        );
        ManeuverAuthorityEngine = imported.ManeuverAuthorityEngine;
        diagnostics.engineImport = {
          success: !!ManeuverAuthorityEngine,
          message: 'ManeuverAuthorityEngine imported',
        };
      } catch (importErr) {
        diagnostics.engineImport = {
          success: false,
          error: importErr.message,
          message: 'ManeuverAuthorityEngine import failed',
        };
        swseLogger.error('[ActiveStepComputer] ManeuverAuthorityEngine import failed for starship access check', {
          actorName,
          error: importErr.message,
          diagnostics,
        });
        return false; // Fail closed
      }

      // Check real access validation: Starship Tactics feat + domain unlock
      try {
        const authorityOptions = this._buildProgressionAuthorityOptions(actor, progressionSession);
        const accessValidation = await ManeuverAuthorityEngine.validateManeuverAccess(actor, authorityOptions);
        const hasAccess = accessValidation.valid;

        diagnostics.accessValidation = {
          success: true,
          valid: hasAccess,
          reason: accessValidation.reason || 'not specified',
        };

        if (!hasAccess) {
          swseLogger.debug('[ActiveStepComputer] Starship Maneuvers: access denied for ' + actorName, {
            reason: accessValidation.reason,
            diagnostics,
          });
        } else {
          swseLogger.debug('[ActiveStepComputer] Starship Maneuvers: access granted for ' + actorName, { diagnostics });
        }

        if (!hasAccess) return false;

        const capacity = await ManeuverAuthorityEngine.getManeuverCapacity(actor, authorityOptions);
        const pendingManeuvers = progressionSession?.draftSelections?.starshipManeuvers || [];
        const pendingCount = Array.isArray(pendingManeuvers)
          ? pendingManeuvers.reduce((sum, entry) => sum + Math.max(1, Number(entry?.count || 1)), 0)
          : 0;
        const ownedCount = Number(actor?.items?.filter?.((item) => item.type === 'maneuver')?.length || 0);
        return Number(capacity || 0) > ownedCount + pendingCount;
      } catch (validationErr) {
        diagnostics.accessValidation = {
          success: false,
          error: validationErr.message,
          message: 'validateManeuverAccess threw exception',
        };
        swseLogger.error('[ActiveStepComputer] Starship maneuver access validation exception for ' + actorName, {
          error: validationErr.message,
          diagnostics,
        });
        return false; // Fail closed
      }
    } catch (err) {
      swseLogger.error('[ActiveStepComputer] Unhandled error checking starship maneuver access for ' + actorName, {
        error: err.message,
        diagnostics,
      });
      return false; // Fail closed
    }
  }

  /**
   * Check if deferred droid build is pending finalization.
   * @private
   */
  _hasDroidBuildPending(progressionSession) {
    const droidBuild = progressionSession?.draftSelections?.droid;
    return droidBuild?.buildState?.isDeferred === true &&
           droidBuild?.buildState?.isFinalized !== true;
  }

  /**
   * Evaluate whether a single node should be active.
   *
   * @param {Object} node - Node definition from registry
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _evaluateNodeActivation(node, actor, mode, progressionSession) {
    try {
      switch (node.activationPolicy) {
        case ActivationPolicy.CANONICAL:
          // Canonical nodes are always active if they pass mode/subtype filters
          // (which they already do — they're in candidateNodes)
          return true;

        case ActivationPolicy.PREREQUISITE:
          // Conditional nodes require entitlement/legality check
          return await this._checkPrerequisiteActivation(
            node,
            actor,
            progressionSession
          );

        case ActivationPolicy.CONDITIONAL:
          // Nodes that appear only if specific state exists
          return this._checkConditionalActivation(node, actor, progressionSession);

        case ActivationPolicy.LEVEL_EVENT:
          // Level-up only: appears on specific level boundaries
          return this._checkLevelEventActivation(node, actor, mode);

        default:
          swseLogger.warn(
            `[ActiveStepComputer] Unknown activation policy: ${node.activationPolicy}`
          );
          return false;
      }
    } catch (err) {
      swseLogger.error(
        `[ActiveStepComputer] Error evaluating node ${node.nodeId}:`,
        err
      );
      return false;
    }
  }

  /**
   * Check if a prerequisite-gated node should activate.
   * (Used for force-powers, force-secrets, starship-maneuvers)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {Promise<boolean>}
   * @private
   */
  async _checkPrerequisiteActivation(node, actor, progressionSession) {
    // Force powers: use the same shell-aware entitlement resolver used by
    // applicability. This sees pending class auto-grants such as Jedi's Force
    // Sensitivity during chargen, not just already-created actor feat items.
    if (node.nodeId === 'force-powers') {
      return await this._hasForcePowerChoices(actor, progressionSession);
    }

    // Force secrets: PHASE 3 - check real class grant budget (not proxy signals)
    if (node.nodeId === 'force-secrets') {
      return await this._hasForceSecretChoices(actor, progressionSession);
    }

    // Force techniques: PHASE 3 - check real class grant budget (not proxy signals)
    if (node.nodeId === 'force-techniques') {
      return await this._hasForceTechniqueChoices(actor, progressionSession);
    }

    // Medical secrets: check real class grant budget
    if (node.nodeId === 'medical-secrets') {
      return await this._hasMedicalSecretChoices(actor, progressionSession);
    }

    // Starship maneuvers: PHASE 3 - check real access validation (not proxy signals)
    if (node.nodeId === 'starship-maneuvers') {
      return await this._hasStarshipChoices(actor, progressionSession);
    }

    // Generic: if no specific rules, assume active
    return true;
  }

  /**
   * Check if a conditional node should activate.
   * (Used for final-droid-configuration, etc.)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @returns {boolean}
   * @private
   */
  _checkConditionalActivation(node, actor, progressionSession) {
    if (node.nodeId === 'base-class-survey') {
      return this._hasBaseClassSurveyWork(actor, progressionSession);
    }

    if (node.nodeId === 'prestige-survey') {
      return this._hasPrestigeSurveyWork(actor, progressionSession);
    }

    // Final droid configuration: appears only if droid build is deferred
    if (node.nodeId === 'final-droid-configuration') {
      const droidBuild = progressionSession?.draftSelections?.droid;
      return droidBuild?.buildState?.isDeferred === true &&
             droidBuild?.buildState?.isFinalized !== true;
    }

    // Generic: no other conditional nodes yet
    return false;
  }

  /**
   * Check if a level-event node should activate.
   * (Used for level-up-specific step gating)
   *
   * @param {Object} node - Node definition
   * @param {Actor} actor - The actor
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @returns {boolean}
   * @private
   */
  _checkLevelEventActivation(node, actor, mode) {
    // This is for future level-up gating (e.g., attributes only on even levels)
    // For now, if we're in levelup mode and the node specifies LEVEL_EVENT,
    // we'd check the specific level boundaries here.
    // Currently no nodes use LEVEL_EVENT policy.
    return mode === 'levelup';
  }

  /**
   * Determine which nodes are invalidated when an upstream node changes.
   * Returns list of nodeIds that should be marked dirty/purged.
   *
   * @param {string} changedNodeId - The node that changed
   * @returns {Array<{nodeId: string, behavior: string}>}
   */
  getInvalidatedNodes(changedNodeId) {
    const node = PROGRESSION_NODE_REGISTRY[changedNodeId];
    if (!node || !node.invalidates) return [];

    return node.invalidates.map(downstreamId => ({
      nodeId: downstreamId,
      behavior: node.invalidationBehavior?.[downstreamId] || 'dirty',
    }));
  }

  /**
   * Check if a node is currently dirty/invalidated.
   * Dirty nodes should still render but prompt user to validate.
   *
   * @param {string} nodeId
   * @param {Object} invalidationState - Map of nodeId → behavior
   * @returns {boolean}
   */
  isNodeDirty(nodeId, invalidationState) {
    return invalidationState?.[nodeId] === 'dirty';
  }

  /**
   * Check if a node's selections should be purged.
   *
   * @param {string} nodeId
   * @param {Object} invalidationState - Map of nodeId → behavior
   * @returns {boolean}
   */
  shouldPurgeNode(nodeId, invalidationState) {
    return invalidationState?.[nodeId] === 'purge';
  }
}
