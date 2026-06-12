/**
 * SummaryStep plugin
 *
 * Chargen: final review/registration surface.
 * Level-up: delta review surface showing only what changed.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ProjectionEngine } from '../shell/projection-engine.js';
import { getStepGuidance } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ProgressionRules } from '/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { ActorAbilityBridge } from '/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { ProgressionFinalizer } from '../shell/progression-finalizer.js';
import { buildLevelUpEventContext } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';
import { buildClassSkillKeySet, buildSkillDisplay, normalizeSkillKey } from '../utils/skill-display.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { RollEngine } from '/systems/foundryvtt-swse/scripts/engine/roll-engine.js';
import { resolveLevelUpHitDie } from '/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js';

export class SummaryStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._summary = {
      name: '',
      level: 1,
      species: '',
      class: '',
      attributes: {},
      skills: [],
      feats: [],
      featSelections: [],
      talents: [],
      talentSelections: [],
      languages: [],
      money: { total: 0, sources: [] },
      background: '',
      attributeSummary: [],
      skillRows: [],
      combatStats: [],
      forcePowers: [],
      forceRegimens: [],
      startingCredits: 0,
      creditsState: null,
      creditLedger: { current: 0, pending: 0, final: 0, sources: [] },
      portrait: null,
      hpCalculation: { base: 0, modifiers: 0, total: 0, formula: '' },
    };
    this._characterName = '';
    this._startingLevel = 1;
    this._isReviewComplete = false;
    this._renderAbort = null;
    this._activeMode = 'chargen';
    this._hpGainState = {
      resolved: false,
      gain: 0,
      method: null,
      formula: '',
      needsResolution: false,
      hitDie: 0,
      dieFormula: '',
      conMod: 0,
      ruleLabel: '',
    };
    this._creditsState = {
      resolved: false,
      amount: 0,
      method: null,
      formula: '',
      diceFormula: '',
      multiplier: 1,
      rollTotal: null,
      needsResolution: false,
      base: 0,
      maximum: 0,
      average: 0,
      backgroundCredits: 0,
      wealthBonus: 0,
      final: 0,
      ruleLabel: '',
      sources: [],
    };
    this._levelupSummary = {
      levelInfo: null,
      metadataChanges: [],
      statChanges: [],
      attributeChanges: [],
      addedFeats: [],
      addedTalents: [],
      addedForcePowers: [],
      addedForceTechniques: [],
      addedForceSecrets: [],
      addedMedicalSecrets: [],
      addedStarshipManeuvers: [],
      addedLanguages: [],
      addedSkills: [],
      creditPreview: null,
      mutationPreview: null,
    };
  }

  async onStepEnter(shell) {
    this._lastShell = shell || this._lastShell || null;
    const mode = shell?.mode || 'chargen';
    this._activeMode = mode;

    if (mode === 'levelup') {
      await this._buildLevelupSummary(shell);
    } else {
      await this._aggregateSummary(shell);
      this._characterName = this._characterName || this._getExistingCharacterName(shell.actor) || this._summary.name || '';
      this._summary.name = this._characterName;
      if (shell.targetLevel) this._startingLevel = shell.targetLevel;
      this._summary.level = this._startingLevel;
      this._commitBusinessItems(shell);
    }

    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    this._lastShell = shell || this._lastShell || null;
    if (!shell.element) return;

    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;
    const mode = shell?.mode || 'chargen';

    if (mode !== 'levelup') {
      const nameInput = shell.element.querySelector('.summary-step-name-input');
      if (nameInput) {
        nameInput.value = this._characterName || '';
        nameInput.addEventListener('input', (e) => {
          this._setCharacterName(e.target.value, shell, { commit: false });
        }, { signal });
        nameInput.addEventListener('change', () => {
          this._syncBusinessItemsFromDom(shell, { commit: true });
          shell?.requestRender?.({ preserveScroll: true, reason: 'summary-name-change' }) ?? shell.render();
        }, { signal });
      }

      const levelInput = shell.element.querySelector('.summary-step-level-input');
      if (levelInput) {
        levelInput.value = this._startingLevel;
        levelInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (!Number.isNaN(val) && val >= 1 && val <= 20) {
            this._startingLevel = val;
            this._summary.level = val;
            this._commitBusinessItems(shell);
          }
        }, { signal });
        levelInput.addEventListener('change', () => {
          this._commitBusinessItems(shell);
          shell.render();
        }, { signal });
      }

      const randomNameBtn = shell.element.querySelector('.summary-step-random-name-btn');
      if (randomNameBtn) {
        randomNameBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
          const randomName = await this._generateRandomName(shell.actor);
          if (randomName) {
            this._setCharacterName(randomName, shell, { commit: true });
            shell?.requestRender?.({ preserveScroll: true, reason: 'generate-name' }) ?? shell.render();
          }
        }, { signal });
      }

      const randomDroidNameBtn = shell.element.querySelector('.summary-step-random-droid-name-btn');
      if (randomDroidNameBtn) {
        randomDroidNameBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
          const randomName = await this._generateRandomDroidName(shell.actor);
          if (randomName) {
            this._setCharacterName(randomName, shell, { commit: true });
            shell?.requestRender?.({ preserveScroll: true, reason: 'generate-droid-name' }) ?? shell.render();
          }
        }, { signal });
      }
    }

    const editButtons = shell.element.querySelectorAll('.summary-step-edit-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const stepId = btn.dataset.step;
        if (!stepId) return;
        const stepIndex = shell.steps.findIndex(s => s.stepId === stepId);
        if (stepIndex >= 0) shell.navigateToStep(stepIndex, { source: 'summary-edit' });
      }, { signal });
    });

    this._isReviewComplete = true;
  }

  async getStepData(context) {
    if (context?.shell) this._lastShell = context.shell;
    const mode = context?.mode || context?.shell?.mode || 'chargen';

    if (mode === 'levelup') {
      const validation = this.validate(context?.shell);
      return {
        mode,
        levelupSummary: this._levelupSummary,
        hpGainState: { ...this._hpGainState },
        creditsState: { ...this._creditsState },
        issuesSummary: {
          hasErrors: validation.errors.length > 0,
          errorCount: validation.errors.length,
          errors: validation.errors,
          isReadyToFinalize: validation.isValid,
        },
      };
    }

    const orderedFeats = canonicallyOrderSelections(this._summary.featSelections);
    const orderedTalents = canonicallyOrderSelections(this._summary.talentSelections);
    const validation = this.validate(context?.shell);
    const issuesSummary = {
      hasErrors: validation.errors.length > 0,
      errorCount: validation.errors.length,
      errors: validation.errors,
      hasCaution: validation.warnings.caution.length > 0,
      cautionCount: validation.warnings.caution.length,
      cautions: validation.warnings.caution,
      isReadyToFinalize: validation.isValid && this._isReviewComplete,
      finalizationStatus: validation.isValid && this._isReviewComplete
        ? 'Ready to create character'
        : validation.errors.length > 0
          ? `${validation.errors.length} error${validation.errors.length === 1 ? '' : 's'} to fix`
          : 'Incomplete',
    };

    return {
      mode,
      summary: this._summary,
      characterName: this._getResolvedCharacterName(context?.shell),
      startingLevel: this._startingLevel,
      isReviewComplete: this._isReviewComplete,
      orderedFeats,
      orderedTalents,
      issuesSummary,
    };
  }

  validate(shell = null) {
    const mode = this._activeMode || 'chargen';
    const errors = [];
    const warnings = { blocking: [], caution: [], info: [] };

    if (mode === 'levelup') {
      if (this._hpGainState.needsResolution && !this._hpGainState.resolved) {
        errors.push('Resolve hit point gain before finalizing level-up');
      }
      const mutationPreview = this._levelupSummary?.mutationPreview;
      if (mutationPreview?.success === false) {
        errors.push(mutationPreview.error || 'Level-up mutation plan could not be compiled');
      }
      for (const err of mutationPreview?.validationErrors || []) {
        errors.push(err);
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        blockingCount: warnings.blocking.length,
        cautionCount: warnings.caution.length,
        infoCount: warnings.info.length,
      };
    }

    // Character name is intentionally non-blocking. If left blank, finalization keeps the actor's current name.
    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
    }
    if (this._creditsState.needsResolution && !this._creditsState.resolved) {
      errors.push('Roll starting credits before finalizing character creation');
    }
    const hasDroidBuild = this._summary.species === 'Droid' || !!this._summary.droid;
    if (!this._summary.class) errors.push('Class selection is required');
    if (!this._summary.species && !hasDroidBuild) errors.push('Species selection is required');
    if (!this._summary.attributes || Object.keys(this._summary.attributes).length === 0) {
      errors.push('Attributes must be assigned');
    }

    const requiredFeats = this._calculateRequiredFeats();
    if (this._summary.feats.length < requiredFeats) {
      warnings.caution.push({
        message: `Character should have ${requiredFeats} feat(s), currently has ${this._summary.feats.length}`,
        actionable: 'Add feats in the Feats step if desired',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      blockingCount: warnings.blocking.length,
      cautionCount: warnings.caution.length,
      infoCount: warnings.info.length,
    };
  }

  async onStepExit(shell) {
    this._syncBusinessItemsFromDom(shell || this._lastShell, { commit: true });
  }

  syncFromDom(shell = null) {
    return this._syncBusinessItemsFromDom(shell || this._lastShell, { commit: true });
  }

  getSelection() {
    const mode = this._activeMode || 'chargen';
    if (mode === 'levelup') {
      const complete = !(this._hpGainState.needsResolution && !this._hpGainState.resolved);
      return { selected: complete ? ['levelup-summary'] : [], count: complete ? 1 : 0, isComplete: complete };
    }
    const hasName = this._hasCharacterName(this._lastShell);
    const name = this._getResolvedCharacterName(this._lastShell);
    return {
      selected: hasName ? [name] : [],
      count: hasName ? 1 : 0,
      isComplete: this._isReviewComplete && hasName && this._startingLevel >= 1 && this._startingLevel <= 20 && !(this._creditsState.needsResolution && !this._creditsState.resolved),
    };
  }

  getBlockingIssues(shell = null) {
    return this.validate(shell || this._lastShell).errors;
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/summary-work-surface.hbs',
      data: stepData,
    };
  }

  renderSummaryPanel(context = {}) {
    if (context?.shell) this._lastShell = context.shell;
    if ((this._activeMode || 'chargen') === 'levelup') return null;
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/summary-panel/summary-metadata-rail.hbs',
      data: {
        actorIdentity: {
          name: this._getResolvedCharacterName(context?.shell) || this._getExistingCharacterName(context?.shell?.actor) || 'Unnamed',
          portrait: this._summary.portrait || null,
        },
        summary: this._summary,
      },
    };
  }

  renderDetailsPanel(focusedItem, shell = null) {
    if (shell) this._lastShell = shell;
    if ((this._activeMode || 'chargen') === 'levelup') return this.renderDetailsPanelEmptyState();
    const validation = this.validate(shell || this._lastShell);
    const issuesSummary = {
      hasErrors: validation.errors.length > 0,
      errorCount: validation.errors.length,
      errors: validation.errors,
      isReadyToFinalize: validation.isValid && this._isReviewComplete,
    };
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/summary-business-details.hbs',
      data: {
        summary: this._summary,
        characterName: this._getResolvedCharacterName(shell || this._lastShell),
        startingLevel: this._startingLevel,
        hasSpeciesPortrait: !!(this._summary.portrait),
        issuesSummary,
      },
    };
  }

  async _aggregateSummary(shell) {
    const character = shell.actor?.system || {};
    if (!shell.progressionSession) throw new Error('SummaryStep requires progressionSession');

    await ProgressionContentAuthority.initialize?.();

    // Always rebuild Summary from the latest canonical draft. A cached
    // projection can be stale after rapid language/name/business-item commits,
    // and older builds could even store an unresolved Promise here.
    const projection = await ProjectionEngine.buildProjection(shell.progressionSession, shell.actor);
    shell.progressionSession.currentProjection = projection;
    const selections = shell.progressionSession.draftSelections || {};

    this._summary.name = this._characterName || this._getExistingCharacterName(shell.actor) || '';
    this._summary.level = this._startingLevel || shell.targetLevel || 1;
    this._summary.species = projection?.identity?.species || selections.species?.name || selections.species?.id || (selections.droid ? 'Droid' : '');
    this._summary.class = projection?.identity?.class || selections.class?.name || selections.class?.id || '';
    this._summary.background = projection?.identity?.background || selections.background?.name || selections.background?.id || '';
    this._summary.attributes = projection?.attributes || this._normalizeAttributeObject(selections.attributes?.values || selections.attributes || character.abilities || character.attributes || {});
    this._summary.attributeSummary = this._buildAttributeSummary(this._summary.attributes, !!selections.droid);
    this._summary.skills = projection?.skills?.trained || ProgressionContentAuthority.normalizeSkillSelection(selections.skills);
    // Summary should display the skills the player actually trained. Projection
    // also exposes class/background skills as grants for validation/finalization,
    // but those are trainable options, not trained selections. Showing the
    // projection total made every class skill look trained at the finish line.
    this._summary.skillRows = this._buildSkillRows(this._summary.skills, this._summary.attributes, this._summary.level);
    this._summary.languages = (projection?.languages || []).map(lang => this._displayName(lang)).filter(Boolean);
    this._summary.featSelections = projection?.abilities?.feats || ProgressionContentAuthority.normalizeSelectionList('feat', selections.feats);
    this._summary.feats = this._summary.featSelections.map(feat => this._displayName(feat)).filter(Boolean);
    this._summary.talentSelections = projection?.abilities?.talents || ProgressionContentAuthority.normalizeSelectionList('talent', selections.talents);
    this._summary.talents = this._summary.talentSelections.map(talent => this._displayName(talent)).filter(Boolean);
    this._summary.forcePowers = (projection?.abilities?.forcePowers || []).map(power => this._displayName(power)).filter(Boolean);
    this._summary.forceRegimens = (projection?.abilities?.forceRegimens || []).map(regimen => this._displayName(regimen)).filter(Boolean);
    this._refreshChargenCreditsState(shell, projection, selections);
    this._summary.startingCredits = Number(this._creditsState.amount || 0);
    this._summary.creditsState = { ...this._creditsState };
    this._summary.creditLedger = this._buildChargenCreditLedger(shell.actor);
    this._summary.hpCalculation = this._computeStartingHP(selections.class, this._summary.attributes, shell.actor, selections.droid);
    this._summary.combatStats = this._buildCombatStats(selections.class, this._summary.attributes, this._summary.level, this._summary.hpCalculation.total);
    this._summary.classSkillLedger = this._buildClassSkillLedger(selections, projection);
    this._summary.portrait = this._resolveSpeciesPortraitFromSummary(shell);
  }


  _buildClassSkillLedger(selections = {}, projection = null) {
    const classSkillValues = [];
    const addAll = (values) => {
      if (!Array.isArray(values)) return;
      values.forEach(value => value && classSkillValues.push(value));
    };

    addAll(ProgressionContentAuthority.getClassSkillNames(selections.class));
    addAll(selections.pendingBackgroundContext?.classSkills);
    addAll(selections.pendingBackgroundContext?.ledger?.classSkills?.granted);
    addAll(selections.pendingSpeciesContext?.classSkills);
    addAll(selections.pendingSpeciesContext?.ledger?.classSkills?.granted);
    addAll(selections.species?.classSkills);
    addAll(selections.species?.system?.classSkills);
    if (this._hasForceSensitivityForLedger(selections, projection)) classSkillValues.push('Use the Force');

    const classSkillKeys = buildClassSkillKeySet(classSkillValues);
    const trainedKeys = this._collectTrainedSkillKeysForLedger(selections, projection);
    const focusedKeys = this._collectFocusedSkillKeysForLedger(selections, projection);

    return Array.from(classSkillKeys)
      .map((key) => {
        const display = buildSkillDisplay(key);
        if (!display.label) return null;
        const isFocused = focusedKeys.has(display.key);
        const isTrained = trainedKeys.has(display.key) || isFocused;
        return {
          label: display.label,
          ability: display.ability,
          abilityClass: display.abilityClass,
          marker: isFocused ? 'F' : isTrained ? 'T' : '',
          title: isFocused ? `${display.label}: focused` : isTrained ? `${display.label}: trained` : `${display.label}: class skill`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  _collectTrainedSkillKeysForLedger(selections = {}, projection = null) {
    const keys = new Set();
    const add = (entry) => {
      const key = normalizeSkillKey(entry);
      if (key) keys.add(key);
    };
    (projection?.skills?.trained || []).forEach(add);
    const skills = selections.skills;
    if (Array.isArray(skills)) skills.forEach(add);
    if (Array.isArray(skills?.trained)) skills.trained.forEach(add);
    if (skills && typeof skills === 'object' && !Array.isArray(skills)) {
      for (const [key, value] of Object.entries(skills)) {
        if (value?.trained === true) add(value.key || value.name || key);
      }
    }
    return keys;
  }

  _collectFocusedSkillKeysForLedger(selections = {}, projection = null) {
    const focused = new Set();
    const inspect = (entry) => {
      if (!entry || typeof entry !== 'object') return;
      const name = String(entry.name || entry.label || entry.featName || '').toLowerCase();
      const isSkillFocus = name.includes('skill focus');
      if (isSkillFocus) {
        [entry.skill, entry.skillKey, entry.targetSkill, entry.selectedSkill, entry.choice, entry.selectedChoice, entry.choiceValue, entry.selection, entry.system?.selectedSkill, entry.system?.choice, entry.system?.selectedChoice]
          .map(candidate => normalizeSkillKey(candidate))
          .filter(Boolean)
          .forEach(key => focused.add(key));
      }
      for (const value of Object.values(entry)) {
        if (value && typeof value === 'object') inspect(value);
      }
    };
    [selections.feats, selections.generalFeat, selections.classFeat, projection?.abilities?.feats].forEach((value) => {
      if (Array.isArray(value)) value.forEach(inspect);
      else inspect(value);
    });
    return focused;
  }

  _hasForceSensitivityForLedger(selections = {}, projection = null) {
    const text = [];
    const collect = (value) => {
      if (!value) return;
      if (typeof value === 'string') text.push(value);
      else if (typeof value === 'object') {
        text.push(value.name, value.label, value.id, value.featName);
        Object.values(value).forEach(collect);
      }
    };
    [selections.feats, selections.class, selections.generalFeat, projection?.abilities?.feats].forEach(collect);
    return text.some(value => String(value || '').toLowerCase().includes('force sensitivity'));
  }

  async _buildLevelupSummary(shell) {
    const actor = shell.actor;
    const session = shell.progressionSession;
    if (!actor || !session) throw new Error('Level-up summary requires actor and progressionSession');

    const selections = session.draftSelections || {};
    const projection = session.currentProjection || await ProjectionEngine.buildProjection(session, actor);
    session.currentProjection = projection;

    await this._checkHPGainResolution(shell);

    const currentLevel = this._getCurrentLevel(actor);
    const newLevel = currentLevel + 1;
    const selectedClass = selections.class || null;
    const selectedClassName = selectedClass?.name || selectedClass?.id || '';

    // SSOT ENFORCEMENT: Get classes from registry
    const currentClasses = ActorAbilityBridge.getClasses(actor).map(i => ({
      name: i.name,
      level: Number(i.level || 1),
      system: i.system || {},
      type: 'class'
    }));

    const metadataChanges = [];
    if (selectedClassName) {
      const existing = currentClasses.find(c => c.name === selectedClassName);
      metadataChanges.push(existing
        ? { label: selectedClassName, before: `${selectedClassName} ${existing.level}`, after: `${selectedClassName} ${existing.level + 1}`, isNew: false }
        : { label: selectedClassName, before: null, after: `${selectedClassName} 1`, isNew: true }
      );
    }

    const beforeAttributes = this._getCurrentAttributeScores(actor);
    const afterAttributes = this._getProjectedAttributeScores(projection, beforeAttributes);
    const beforeBAB = this._getCurrentBAB(actor);
    const afterBAB = await this._computeProjectedBAB(actor, selectedClass);
    const currentStrMod = this._abilityMod(beforeAttributes.str);
    const afterStrMod = this._abilityMod(afterAttributes.str);
    const currentDexMod = this._abilityMod(beforeAttributes.dex);
    const afterDexMod = this._abilityMod(afterAttributes.dex);
    const currentWisMod = this._abilityMod(beforeAttributes.wis);
    const afterWisMod = this._abilityMod(afterAttributes.wis);

    const currentClassBonuses = await this._getMaxDefenseBonuses(currentClasses);
    const afterClassBonuses = await this._getProjectedDefenseBonuses(currentClasses, selectedClass);

    const beforeReflex = this._getDefenseTotal(actor, 'reflex');
    const beforeFort = this._getDefenseTotal(actor, 'fortitude');
    const beforeWill = this._getDefenseTotal(actor, 'will');
    const afterReflex = beforeReflex - currentDexMod - (currentClassBonuses.reflex || 0) + afterDexMod + (afterClassBonuses.reflex || 0);
    const afterFort = beforeFort - currentStrMod - (currentClassBonuses.fortitude || 0) + afterStrMod + (afterClassBonuses.fortitude || 0);
    const afterWill = beforeWill - currentWisMod - (currentClassBonuses.will || 0) + afterWisMod + (afterClassBonuses.will || 0);

    const beforeHP = this._getCurrentHPMax(actor);
    const afterHP = beforeHP + (Number(this._hpGainState.gain) || 0);
    const beforeGrapple = this._getCurrentGrapple(actor);
    const afterGrapple = beforeGrapple - beforeBAB - currentStrMod + afterBAB + afterStrMod;
    const beforeSecondWind = Number(actor.system?.secondWind?.healing || (5 + Math.floor(currentLevel / 4) * 5));
    const afterSecondWind = Number(actor.system?.secondWind?.misc || 0) + (5 + Math.floor(newLevel / 4) * 5);
    const beforeDT = this._getCurrentDamageThreshold(actor, beforeFort);
    const afterDT = afterFort;

    const statChanges = [];
    const pushStat = (label, before, after, opts = {}) => {
      if (before === after && !opts.force) return;
      statChanges.push({ label, before, after, pending: !!opts.pending });
    };

    pushStat('HP', beforeHP, afterHP, { pending: this._hpGainState.needsResolution && !this._hpGainState.resolved });
    pushStat('BAB', beforeBAB, afterBAB);
    pushStat('Reflex Total', beforeReflex, afterReflex);
    pushStat('Fortitude Total', beforeFort, afterFort);
    pushStat('Will Total', beforeWill, afterWill);
    pushStat('Damage Threshold', beforeDT, afterDT);
    pushStat('Grapple Bonus', beforeGrapple, afterGrapple);
    pushStat('Second Wind Recovery HP', beforeSecondWind, afterSecondWind);

    const attributeChanges = Object.keys(beforeAttributes).reduce((acc, key) => {
      if (beforeAttributes[key] !== afterAttributes[key]) {
        acc.push({ label: key.toUpperCase(), before: beforeAttributes[key], after: afterAttributes[key] });
      }
      return acc;
    }, []);

    const addedFeats = this._getAddedNames(actor, projection?.abilities?.feats, 'feat');
    const addedTalents = this._getAddedNames(actor, projection?.abilities?.talents, 'talent');
    const addedForcePowers = this._getAddedNames(actor, projection?.abilities?.forcePowers, 'force-power');
    const addedForceRegimens = this._getAddedNames(actor, projection?.abilities?.forceRegimens, 'force-regimen');
    const addedForceTechniques = this._getSelectionNames(selections.forceTechniques);
    const addedForceSecrets = this._getSelectionNames(selections.forceSecrets);
    const addedMedicalSecrets = this._getSelectionNames(selections.medicalSecrets);
    const addedStarshipManeuvers = this._getSelectionNames(selections.starshipManeuvers);
    const addedLanguages = this._getSelectionNames(selections.languages);
    const addedSkills = this._getAddedSkills(actor, projection?.skills?.trained || this._extractSkillSelectionKeys(selections.skills));
    const creditPreview = this._buildLevelupCreditPreview(actor, selections, selectedClass, session);
    this._creditsState = {
      ...this._creditsState,
      resolved: true,
      amount: creditPreview.pendingDelta,
      method: creditPreview.pendingDelta > 0 ? 'progression-grant' : 'none',
      needsResolution: false,
      final: creditPreview.finalCredits,
      sources: creditPreview.sources,
      ruleLabel: creditPreview.pendingDelta > 0 ? 'Progression credit grant' : 'No credit change',
    };
    this._commitBusinessItems(shell);
    const levelContext = buildLevelUpEventContext(actor, session, { selectedClass });
    const dryRun = await ProgressionFinalizer.dryRun({
      mode: 'levelup',
      actor,
      progressionSession: session,
      steps: shell.steps || [],
      stepData: shell.stepData || {},
      mentor: shell.mentor || {},
      sessionId: shell.element?.dataset?.sessionId || 'levelup-review',
    }, actor);

    this._levelupSummary = {
      levelInfo: {
        currentLevel,
        newLevel,
        className: levelContext?.selectedClassName || selectedClassName || 'Unselected class',
        classLevel: levelContext?.selectedClassNextLevel || null,
        transitionKind: levelContext?.prestigeTransition?.transitionKind
          || (levelContext?.isNewBaseClass ? 'newBaseClass' : levelContext?.isNewPrestigeClass ? 'newPrestigeClass' : levelContext?.isReturningClass ? 'returningClass' : 'levelup'),
      },
      metadataChanges,
      statChanges,
      attributeChanges,
      addedFeats,
      addedTalents,
      addedForcePowers,
      addedForceTechniques,
      addedForceSecrets,
      addedMedicalSecrets,
      addedStarshipManeuvers,
      addedLanguages,
      addedSkills,
      creditPreview,
      mutationPreview: this._buildLevelupMutationPreview(dryRun),
    };
  }

  /**
   * Build a display-only preview object from a ProgressionFinalizer dry-run result.
   *
   * CONTRACT:
   * - Pure method — no actor mutations, no draft-state writes, no side effects.
   * - Accepts any shape that dryRun() may return, including failure objects and
   *   partial/empty plans; always returns a fully-formed object.
   * - Consumed by: _buildLevelupSummary (stored as levelupSummary.mutationPreview),
   *   validate() (reads .success / .error / .validationErrors), and the review HBS.
   *
   * @param {Object|null|undefined} dryRun - Result from ProgressionFinalizer.dryRun()
   * @returns {{
   *   success: boolean,
   *   error: string|null,
   *   validationErrors: string[],
   *   warnings: string[],
   *   planValid: boolean,
   *   actorUpdateCount: number,
   *   itemGrantCount: number,
   *   itemUpdateCount: number,
   *   itemDeleteCount: number,
   *   patchRows: {path:string, label:string, value:string}[],
   *   itemGrantRows: {name:string, type:string}[],
   *   itemUpdateRows: {id:string, changes:number}[],
   * }}
   * @private
   */
  _buildLevelupMutationPreview(dryRun) {
    const EMPTY_RESULT = {
      success: false,
      error: null,
      validationErrors: [],
      warnings: [],
      planValid: false,
      actorUpdateCount: 0,
      itemGrantCount: 0,
      itemUpdateCount: 0,
      itemDeleteCount: 0,
      patchRows: [],
      itemGrantRows: [],
      itemUpdateRows: [],
    };

    // Guard: no dry-run result at all
    if (dryRun == null) {
      return { ...EMPTY_RESULT, error: 'Dry-run produced no result' };
    }

    // Guard: dry-run itself failed (compilation or validation error)
    if (!dryRun.success) {
      return {
        ...EMPTY_RESULT,
        error: typeof dryRun.error === 'string' && dryRun.error
          ? dryRun.error
          : 'Level-up mutation plan could not be compiled',
      };
    }

    // --- Extract plan sections defensively ---
    const plan = (dryRun.plan && typeof dryRun.plan === 'object') ? dryRun.plan : {};
    const validation = (dryRun.validation && typeof dryRun.validation === 'object') ? dryRun.validation : {};

    const setPatches = (plan.set && typeof plan.set === 'object') ? plan.set : {};
    const addItems = Array.isArray(plan.add?.items) ? plan.add.items : [];
    const updateItems = Array.isArray(plan.update?.items) ? plan.update.items : [];
    const deleteItems = Array.isArray(plan.delete?.items) ? plan.delete.items : [];
    const warnings = Array.isArray(validation.warnings) ? validation.warnings.map(String) : [];
    const validationErrors = Array.isArray(validation.errors) ? validation.errors.map(String) : [];

    // --- Friendly labels for the most meaningful actor patch paths ---
    const FRIENDLY_PATHS = {
      'system.level': 'Character Level',
      'system.hp.max': 'HP Max',
      'system.hp.value': 'HP Current',
      'system.credits': 'Credits',
      'system.progression.lastLeveledClass.className': 'Class',
      'system.progression.lastLeveledClass.classLevel': 'Class Level',
      'system.progression.lastLeveledClass.characterLevel': 'Character Level',
      'system.progression.lastHpGain.amount': 'HP Gained',
      'system.progression.lastCreditDelta.amount': 'Credits Gained',
    };

    const patchRows = [];
    for (const [path, value] of Object.entries(setPatches)) {
      const label = FRIENDLY_PATHS[path];
      if (label) {
        patchRows.push({ path, label, value: String(value ?? '') });
      }
    }

    // --- Readable item grant rows (feats, talents, force powers, maneuvers …) ---
    const itemGrantRows = addItems
      .filter(item => item != null)
      .map(item => ({
        name: String(item.name || item.type || '(unnamed item)'),
        type: String(item.type || 'item'),
      }));

    // --- Item update rows (e.g. class item level bump) ---
    const itemUpdateRows = updateItems
      .filter(item => item != null)
      .map(item => ({
        id: String(item._id || '?'),
        // Count meaningful data fields (exclude the _id key itself)
        changes: Math.max(0, Object.keys(item).filter(k => k !== '_id').length),
      }));

    return {
      success: true,
      error: null,
      validationErrors,
      warnings,
      validationWarnings: warnings,
      planValid: validation.isValid !== false,
      actorUpdateCount: Object.keys(setPatches).length,
      itemGrantCount: addItems.length,
      itemUpdateCount: updateItems.length,
      itemDeleteCount: deleteItems.length,
      patchRows,
      setFields: patchRows,
      itemGrantRows,
      addedItems: itemGrantRows,
      itemUpdateRows,
      updatedItems: itemUpdateRows.map(row => ({
        ...row,
        label: `${row.id} (${row.changes} change${row.changes === 1 ? '' : 's'})`,
      })),
    };
  }

  _getCurrentLevel(actor) {
    return Number(actor?.system?.details?.level ?? actor?.system?.level ?? 1);
  }

  _getCurrentHPMax(actor) {
    return Number(actor?.system?.hp?.max ?? actor?.system?.derived?.hp?.max ?? 0);
  }

  _getCurrentBAB(actor) {
    return Number(actor?.system?.derived?.bab ?? actor?.system?.bab?.total ?? actor?.system?.bab ?? actor?.system?.baseAttackBonus ?? 0);
  }

  _getCurrentGrapple(actor) {
    return Number(actor?.system?.derived?.grappleBonus ?? actor?.system?.grappleModifier ?? 0);
  }

  _getCurrentDamageThreshold(actor, fallbackFort) {
    return Number(actor?.system?.damageThreshold ?? actor?.system?.derived?.damageThreshold ?? fallbackFort ?? 10);
  }

  _getDefenseTotal(actor, key) {
    return Number(
      actor?.system?.derived?.defenses?.[key]?.total ??
      actor?.system?.defenses?.[key]?.total ??
      actor?.system?.defenses?.[key] ??
      10
    );
  }

  _getCurrentAttributeScores(actor) {
    const system = actor?.system || {};
    return {
      str: Number(system?.abilities?.str?.base ?? system?.attributes?.str?.value ?? 10),
      dex: Number(system?.abilities?.dex?.base ?? system?.attributes?.dex?.value ?? 10),
      con: Number(system?.abilities?.con?.base ?? system?.attributes?.con?.value ?? 10),
      int: Number(system?.abilities?.int?.base ?? system?.attributes?.int?.value ?? 10),
      wis: Number(system?.abilities?.wis?.base ?? system?.attributes?.wis?.value ?? 10),
      cha: Number(system?.abilities?.cha?.base ?? system?.attributes?.cha?.value ?? 10),
    };
  }

  _getProjectedAttributeScores(projection, fallback) {
    const attrs = projection?.attributes || {};
    return {
      str: Number(attrs?.str?.score ?? fallback.str),
      dex: Number(attrs?.dex?.score ?? fallback.dex),
      con: Number(attrs?.con?.score ?? fallback.con),
      int: Number(attrs?.int?.score ?? fallback.int),
      wis: Number(attrs?.wis?.score ?? fallback.wis),
      cha: Number(attrs?.cha?.score ?? fallback.cha),
    };
  }

  _abilityMod(score) {
    return Math.floor((Number(score || 10) - 10) / 2);
  }

  async _computeProjectedBAB(actor, selectedClass) {
    const { calculateTotalBAB } = await import('/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js');
    const clone = globalThis.foundry?.utils?.deepClone || ((value) => JSON.parse(JSON.stringify(value || {})));
    const synthetic = {
      system: clone(actor?.system || {}),
      items: Array.from(actor?.items || []).map(i => ({ type: i.type, name: i.name, id: i.id, system: clone(i.system || {}) }))
    };
    const className = selectedClass?.name || selectedClass?.className || selectedClass?.id;
    if (className) {
      const selectedKey = this._normalizeSummaryKey(className);
      const existing = synthetic.items.find(i => i.type === 'class' && (this._normalizeSummaryKey(i.name) === selectedKey || this._normalizeSummaryKey(i.system?.classId) === selectedKey));
      if (existing) {
        existing.system.level = Number(existing.system.level || existing.system.levels || existing.system.rank || 0) + 1;
      } else {
        synthetic.items.push({
          type: 'class',
          name: className,
          system: {
            ...clone(selectedClass?.system || {}),
            level: 1,
            classId: selectedClass?.id || selectedClass?.classId || selectedClass?.sourceId || className,
          }
        });
      }
    }
    const projected = Number(calculateTotalBAB(synthetic));
    return Number.isFinite(projected) ? projected : this._getCurrentBAB(actor);
  }

  _normalizeSummaryKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async _getMaxDefenseBonuses(classEntries) {
    const { getClassDefenseBonuses } = await import('/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js');
    const maxes = { fortitude: 0, reflex: 0, will: 0 };
    for (const entry of classEntries || []) {
      let defenses = entry?.system?.defenses;
      if (!defenses || (defenses.fortitude == null && defenses.reflex == null && defenses.will == null)) {
        try {
          defenses = await getClassDefenseBonuses(entry.name);
        } catch (err) {
          defenses = { fortitude: 0, reflex: 0, will: 0 };
        }
      }
      maxes.fortitude = Math.max(maxes.fortitude, Number(defenses?.fortitude || 0));
      maxes.reflex = Math.max(maxes.reflex, Number(defenses?.reflex || 0));
      maxes.will = Math.max(maxes.will, Number(defenses?.will || 0));
    }
    return maxes;
  }

  async _getProjectedDefenseBonuses(currentClasses, selectedClass) {
    const current = await this._getMaxDefenseBonuses(currentClasses);
    const className = selectedClass?.name || selectedClass?.id;
    if (!className) return current;
    const existing = (currentClasses || []).find(c => c.name === className);
    if (existing) return current;
    const { getClassDefenseBonuses } = await import('/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js');
    let defenses = selectedClass?.system?.defenses;
    if (!defenses || (defenses.fortitude == null && defenses.reflex == null && defenses.will == null)) {
      defenses = await getClassDefenseBonuses(className);
    }
    return {
      fortitude: Math.max(current.fortitude, Number(defenses?.fortitude || 0)),
      reflex: Math.max(current.reflex, Number(defenses?.reflex || 0)),
      will: Math.max(current.will, Number(defenses?.will || 0)),
    };
  }

  _getAddedNames(actor, projectedList, itemType) {
    const current = new Set(actor.items.filter(i => i.type === itemType).map(i => String(i.name || '').toLowerCase()));
    return (projectedList || [])
      .map(entry => entry?.name || entry?.id || entry)
      .filter(Boolean)
      .filter(name => !current.has(String(name).toLowerCase()));
  }

  _getAddedSkills(actor, projectedTrained) {
    const current = new Set(
      Object.entries(actor?.system?.skills || {})
        .filter(([, data]) => data?.trained === true)
        .map(([key]) => key)
    );
    return (projectedTrained || []).filter(skill => !current.has(skill));
  }

  async _checkHPGainResolution(shell) {
    try {
      const mode = shell?.mode || 'chargen';
      if (mode !== 'levelup') return;
      const actor = shell.actor;
      const selectedClass = shell.progressionSession?.draftSelections?.class || null;
      const classData = selectedClass || ActorAbilityBridge.getClasses(actor)[0] || null;
      if (!classData) return;

      const hpGeneration = ProgressionRules.getHPGeneration();
      const maxHPLevels = ProgressionRules.getMaxHPLevels();
      const newLevel = this._getCurrentLevel(actor) + 1;
      const hitDie = this._extractHitDie(classData);
      const conMod = this._getConModifier(actor);
      const maximumGain = Math.max(1, hitDie + conMod);
      const averageDie = Math.floor(hitDie / 2) + 1;
      const averageGain = Math.max(1, averageDie + conMod);
      const needsResolution = newLevel > maxHPLevels && (hpGeneration === 'roll' || hpGeneration === 'average_minimum');

      if (needsResolution && this._hpGainState.resolved && Number(this._hpGainState.gain) > 0) {
        this._hpGainState = {
          ...this._hpGainState,
          needsResolution: true,
          hitDie,
          dieFormula: `1d${hitDie}`,
          conMod,
          formula: `1d${hitDie} ${conMod >= 0 ? '+' : ''}${conMod}`,
          ruleLabel: hpGeneration === 'average_minimum' ? 'Roll HP; minimum average applies' : 'Roll HP or take maximum',
          maximumGain,
          averageGain,
        };
        return;
      }

      let resolved = true;
      let gain = maximumGain;
      let method = 'maximum';
      let ruleLabel = newLevel <= maxHPLevels ? `GM rule: levels 1-${maxHPLevels} receive maximum HP` : 'GM rule: maximum HP';

      if (needsResolution) {
        resolved = false;
        gain = 0;
        method = null;
        ruleLabel = hpGeneration === 'average_minimum' ? 'Roll HP; minimum average applies' : 'Roll HP or take maximum';
      } else if (hpGeneration === 'average') {
        gain = averageGain;
        method = 'average';
        ruleLabel = 'GM rule: average HP';
      } else if (hpGeneration === 'maximum' || newLevel <= maxHPLevels) {
        gain = maximumGain;
        method = 'maximum';
      } else {
        gain = averageGain;
        method = 'average';
        ruleLabel = `GM rule: ${hpGeneration || 'average'} HP`; 
      }

      this._hpGainState = {
        resolved,
        gain,
        method,
        formula: `1d${hitDie} ${conMod >= 0 ? '+' : ''}${conMod}`,
        needsResolution,
        hitDie,
        dieFormula: `1d${hitDie}`,
        conMod,
        ruleLabel,
        maximumGain,
        averageGain,
      };
    } catch (e) {
      swseLogger.error('[SummaryStep._checkHPGainResolution]', e);
      this._hpGainState.resolved = true;
    }
  }

  async rollHPGain(actor, shell = null) {
    const activeShell = shell || globalThis.game?.swse?.currentProgressionShell || null;
    await this._checkHPGainResolution({ actor, mode: 'levelup', progressionSession: activeShell?.progressionSession });
    const hitDie = Number(this._hpGainState.hitDie || 6);
    const conMod = Number(this._hpGainState.conMod || 0);
    try {
      const roll = await RollEngine.safeRoll(`1d${hitDie}`, actor?.getRollData?.() ?? {}, {
        actor,
        domain: 'levelup.hit-points',
        context: { source: 'summary-step', hitDie },
      });
      const hpGeneration = ProgressionRules.getHPGeneration();
      const averageDie = Number(this._hpGainState.averageGain || 0) - conMod;
      const dieResult = hpGeneration === 'average_minimum'
        ? Math.max(Number(roll?.total || 0), Math.max(1, averageDie))
        : Number(roll?.total || 0);
      const hpGain = Math.max(1, dieResult + conMod);
      this._hpGainState = {
        ...this._hpGainState,
        resolved: true,
        gain: hpGain,
        method: hpGeneration === 'average_minimum' ? 'rolled-average-minimum' : 'rolled',
        rollTotal: Number(roll?.total || 0),
        ruleLabel: hpGeneration === 'average_minimum'
          ? `Rolled ${roll?.total}; minimum average die result is ${Math.max(1, averageDie)}`
          : `Rolled ${roll?.total} on d${hitDie}`,
      };
      this._commitBusinessItems(activeShell);
      if (activeShell) await this._buildLevelupSummary(activeShell);
      return { success: true, gain: hpGain };
    } catch (e) {
      swseLogger.error('[SummaryStep.rollHPGain]', e);
      globalThis.ui?.notifications?.error?.('HP roll failed.');
      return { success: false, error: e.message };
    }
  }

  async useMaximumHPGain(actor, shell = null) {
    const activeShell = shell || globalThis.game?.swse?.currentProgressionShell || null;
    await this._checkHPGainResolution({ actor, mode: 'levelup', progressionSession: activeShell?.progressionSession });
    const hitDie = Number(this._hpGainState.hitDie || 6);
    const conMod = Number(this._hpGainState.conMod || 0);
    const maxHPGain = Math.max(1, hitDie + conMod);
    this._hpGainState = {
      ...this._hpGainState,
      resolved: true,
      gain: maxHPGain,
      method: 'maximum',
      ruleLabel: 'Player chose maximum HP',
    };
    this._commitBusinessItems(activeShell);
    if (activeShell) await this._buildLevelupSummary(activeShell);
    return { success: true, gain: maxHPGain };
  }

  _getConModifier(actor) {
    const isDroid = actor?.type === 'droid' || actor?.system?.isDroid;
    if (isDroid) return 0;
    return Number(
      actor?.system?.derived?.attributes?.con?.mod
      ?? actor?.system?.abilities?.con?.mod
      ?? actor?.system?.attributes?.con?.mod
      ?? 0
    ) || 0;
  }

  _extractHitDie(classData) {
    return resolveLevelUpHitDie(classData);
  }

  _calculateRequiredFeats() { return 1; }

  _displayName(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return String(value.name || value.label || value.id || value.key || value.slug || '').trim();
  }

  _normalizeAttributeObject(raw = {}) {
    const out = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const value = raw?.[key];
      const score = Number(value?.score ?? value?.base ?? value?.value ?? value?.total ?? value ?? 10) || 10;
      out[key] = { score, modifier: Math.floor((score - 10) / 2) };
    }
    return out;
  }

  _buildAttributeSummary(attributes = {}, isDroid = false) {
    const labels = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
    return Object.entries(labels)
      .filter(([key]) => !(isDroid && key === 'con'))
      .map(([key, label]) => {
        const raw = attributes?.[key];
        const score = Number(raw?.score ?? raw?.base ?? raw?.value ?? raw ?? 10) || 10;
        const modifier = Number.isFinite(Number(raw?.modifier)) ? Number(raw.modifier) : Math.floor((score - 10) / 2);
        return {
          key,
          label,
          score,
          modifier,
          modifierDisplay: `${modifier >= 0 ? '+' : ''}${modifier}`,
          toneClass: modifier > 0 ? 'positive' : modifier < 0 ? 'negative' : 'zero',
        };
      });
  }

  _buildSkillRows(skillSource, attributes = {}, level = 1) {
    const values = Array.isArray(skillSource)
      ? skillSource
      : Object.values(skillSource || {});
    const halfLevel = Math.floor((Number(level) || 1) / 2);
    return values.map((skill) => {
      const name = this._displayName(skill);
      const ability = String(skill?.ability || skill?.system?.ability || skill?.selectedAbility || '').toLowerCase();
      const abilityKey = ['str','dex','con','int','wis','cha'].includes(ability) ? ability : null;
      const abilityMod = abilityKey ? Number(attributes?.[abilityKey]?.modifier || 0) : 0;
      const focused = !!skill?.focused;
      const trained = focused || skill?.trained === true || skill?.isTrained === true || skill?.selected === true || skill?.source === 'selection';
      const misc = Number(skill?.miscMod || skill?.misc || 0) || 0;
      const total = halfLevel + abilityMod + (trained ? 5 : 0) + (focused ? 5 : 0) + misc;
      return {
        key: skill?.key || skill?.id || name,
        label: name,
        ability: abilityKey ? abilityKey.toUpperCase() : '',
        trained,
        focused,
        total,
        totalDisplay: `${total >= 0 ? '+' : ''}${total}`,
        toneClass: total > 0 ? 'positive' : total < 0 ? 'negative' : 'zero',
      };
    }).filter(row => row.label);
  }

  _buildCombatStats(classSelection, attributes = {}, level = 1, hp = 0) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const defenses = classModel.defenses || classModel.system?.defenses || {};
    const bab = this._computeStartingBAB(classModel);
    const strMod = Number(attributes?.str?.modifier || 0);
    const dexMod = Number(attributes?.dex?.modifier || 0);
    const conMod = Number(attributes?.con?.modifier || 0);
    const wisMod = Number(attributes?.wis?.modifier || 0);
    const lvl = Number(level) || 1;
    const reflex = 10 + lvl + dexMod + Number(defenses.reflex || 0);
    const fortitude = 10 + lvl + conMod + Number(defenses.fortitude || 0);
    const will = 10 + lvl + wisMod + Number(defenses.will || 0);
    const grapple = bab + strMod;
    return [
      { label: 'HP', value: hp, toneClass: hp > 0 ? 'prog-number-positive' : 'prog-number-zero' },
      { label: 'BAB', value: `+${bab}`, toneClass: bab > 0 ? 'prog-number-positive' : 'prog-number-zero' },
      { label: 'Reflex', value: reflex, toneClass: 'prog-number-positive' },
      { label: 'Fortitude', value: fortitude, toneClass: 'prog-number-positive' },
      { label: 'Will', value: will, toneClass: 'prog-number-positive' },
      { label: 'Grapple', value: `${grapple >= 0 ? '+' : ''}${grapple}`, toneClass: grapple > 0 ? 'prog-number-positive' : grapple < 0 ? 'prog-number-negative' : 'prog-number-zero' },
      { label: 'Damage Threshold', value: fortitude, toneClass: 'prog-number-positive' },
    ];
  }

  _computeStartingBAB(classModel = {}) {
    const name = String(classModel?.name || classModel?.id || '').toLowerCase();
    const progression = String(classModel?.babProgression || classModel?.system?.babProgression || '').toLowerCase();
    if (progression === 'fast' || ['jedi', 'soldier'].includes(name)) return 1;
    return 0;
  }

  _computeStartingCredits(classSelection, backgroundSelection, projection = null, selections = {}) {
    const state = this._buildCreditsResolutionState({ classSelection, backgroundSelection, projection, selections });
    return Number(state.amount || 0);
  }

  _refreshChargenCreditsState(shell, projection = null, selections = {}) {
    const previous = this._creditsState || {};
    const next = this._buildCreditsResolutionState({
      classSelection: selections.class,
      backgroundSelection: selections.background,
      projection,
      selections,
      actor: shell?.actor,
      previousState: previous,
    });
    this._creditsState = next;
  }

  _buildCreditsResolutionState({ classSelection = null, backgroundSelection = null, projection = null, selections = {}, actor = null, previousState = null } = {}) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const formulaInfo = this._resolveStartingCreditFormula(classModel, classSelection, projection);
    const backgroundCredits = Number(backgroundSelection?.credits ?? backgroundSelection?.system?.credits ?? 0) || 0;
    const wealthBonus = this._computeWealthCreditGrant(classModel, selections);
    const creditMode = ProgressionRules.getStartingCreditMode?.() || 'roll';
    const maxCreditsEnabled = ProgressionRules.getMaxStartingCreditsEnabled?.() === true;
    const forceMaximum = maxCreditsEnabled || creditMode === 'max' || creditMode === 'maximum';
    const baseMaximum = Number(formulaInfo.maximum || formulaInfo.fixed || 0) || 0;
    const baseAverage = Number(formulaInfo.average || formulaInfo.fixed || baseMaximum || 0) || 0;
    const baseFixed = formulaInfo.fixed !== null && formulaInfo.fixed !== undefined ? Number(formulaInfo.fixed || 0) : null;

    const buildSources = (baseAmount, methodLabel) => {
      const sources = [];
      if (baseAmount > 0) sources.push({ label: methodLabel || 'Starting Credits', amount: baseAmount, tone: 'base' });
      if (backgroundCredits > 0) sources.push({ label: 'Background Credits', amount: backgroundCredits, tone: 'background' });
      if (wealthBonus > 0) sources.push({ label: 'Wealth Talent', amount: wealthBonus, tone: 'wealth' });
      return sources;
    };

    const preserveRoll = previousState?.resolved
      && ['rolled', 'maximum', 'average', 'fixed'].includes(previousState?.method)
      && String(previousState?.formula || '') === String(formulaInfo.formula || '')
      && Number(previousState?.wealthBonus || 0) === wealthBonus
      && Number(previousState?.backgroundCredits || 0) === backgroundCredits;

    if (preserveRoll && !forceMaximum) {
      return {
        ...previousState,
        final: Number(previousState.amount || 0),
        sources: buildSources(Math.max(0, Number(previousState.amount || 0) - backgroundCredits - wealthBonus), previousState.method === 'rolled' ? 'Rolled Starting Credits' : previousState.ruleLabel),
      };
    }

    if (forceMaximum) {
      const amount = baseMaximum + backgroundCredits + wealthBonus;
      return {
        resolved: true,
        amount,
        method: 'maximum',
        formula: formulaInfo.formula,
        diceFormula: formulaInfo.diceFormula,
        multiplier: formulaInfo.multiplier || 1,
        rollTotal: null,
        needsResolution: false,
        base: baseMaximum,
        maximum: baseMaximum,
        average: baseAverage,
        backgroundCredits,
        wealthBonus,
        final: amount,
        ruleLabel: maxCreditsEnabled ? 'GM rule: maximum starting credits' : 'Starting credit mode: maximum',
        sources: buildSources(baseMaximum, 'Maximum Starting Credits'),
      };
    }

    if (baseFixed !== null && !formulaInfo.diceFormula) {
      const amount = baseFixed + backgroundCredits + wealthBonus;
      return {
        resolved: true,
        amount,
        method: 'fixed',
        formula: formulaInfo.formula || String(baseFixed),
        diceFormula: '',
        multiplier: 1,
        rollTotal: null,
        needsResolution: false,
        base: baseFixed,
        maximum: baseFixed,
        average: baseFixed,
        backgroundCredits,
        wealthBonus,
        final: amount,
        ruleLabel: 'Fixed starting credits',
        sources: buildSources(baseFixed, 'Fixed Starting Credits'),
      };
    }

    if (creditMode === 'average') {
      const amount = baseAverage + backgroundCredits + wealthBonus;
      return {
        resolved: true,
        amount,
        method: 'average',
        formula: formulaInfo.formula,
        diceFormula: formulaInfo.diceFormula,
        multiplier: formulaInfo.multiplier || 1,
        rollTotal: null,
        needsResolution: false,
        base: baseAverage,
        maximum: baseMaximum,
        average: baseAverage,
        backgroundCredits,
        wealthBonus,
        final: amount,
        ruleLabel: 'Starting credit mode: average',
        sources: buildSources(baseAverage, 'Average Starting Credits'),
      };
    }

    return {
      resolved: false,
      amount: 0,
      method: null,
      formula: formulaInfo.formula,
      diceFormula: formulaInfo.diceFormula,
      multiplier: formulaInfo.multiplier || 1,
      rollTotal: null,
      needsResolution: true,
      base: 0,
      maximum: baseMaximum,
      average: baseAverage,
      backgroundCredits,
      wealthBonus,
      final: backgroundCredits + wealthBonus,
      ruleLabel: creditMode === 'playerChoice' ? 'Choose roll or maximum starting credits' : 'Roll starting credits',
      sources: buildSources(0, ''),
    };
  }

  _resolveStartingCreditFormula(classModel = {}, classSelection = {}, projection = null) {
    const raw = classModel?.startingCredits
      ?? classModel?.system?.startingCredits
      ?? classModel?.system?.starting_credits
      ?? classSelection?.startingCredits
      ?? classSelection?.system?.startingCredits
      ?? classSelection?.system?.starting_credits
      ?? null;
    const parsedRaw = this._parseCreditFormula(raw);
    if (parsedRaw) return parsedRaw;

    const projected = Number(projection?.derived?.credits || 0) || 0;
    if (projected > 0) {
      return { formula: String(projected), diceFormula: '', multiplier: 1, fixed: projected, maximum: projected, average: projected };
    }

    const name = String(classModel?.name || classModel?.id || classSelection?.name || classSelection?.id || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
    const fallback = {
      soldier: '3d4 x 250',
      scout: '3d4 x 250',
      scoundrel: '3d4 x 250',
      jedi: '3d4 x 100',
      noble: '3d4 x 400',
      force_adept: '3d4 x 100',
    };
    return this._parseCreditFormula(fallback[name]) || { formula: '', diceFormula: '', multiplier: 1, fixed: 0, maximum: 0, average: 0 };
  }

  _parseCreditFormula(value) {
    if (value === undefined || value === null || value === '') return null;
    if (Number.isFinite(Number(value))) {
      const fixed = Number(value);
      return { formula: String(fixed), diceFormula: '', multiplier: 1, fixed, maximum: fixed, average: fixed };
    }
    const text = String(value || '').trim();
    const match = text.match(/(\d+)\s*d\s*(\d+)\s*(?:x|×|\*)\s*(\d+)/i);
    if (!match) return null;
    const numDice = Number(match[1]);
    const dieSize = Number(match[2]);
    const multiplier = Number(match[3]);
    const maximum = numDice * dieSize * multiplier;
    const averageDieTotal = numDice * ((dieSize + 1) / 2);
    const average = Math.floor(averageDieTotal * multiplier);
    return {
      formula: `${numDice}d${dieSize} x ${multiplier}`,
      diceFormula: `${numDice}d${dieSize}`,
      multiplier,
      numDice,
      dieSize,
      fixed: null,
      maximum,
      average,
    };
  }

  _buildChargenCreditLedger(actor = null) {
    const current = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);
    const pending = Number(this._creditsState?.amount || 0) || 0;
    return {
      current,
      pending,
      final: pending || current,
      sources: this._creditsState?.sources || [],
    };
  }

  async rollCredits(actor, shell = null) {
    const activeShell = shell || globalThis.game?.swse?.currentProgressionShell || null;
    const selections = activeShell?.progressionSession?.draftSelections || {};
    const projection = activeShell?.progressionSession?.currentProjection || null;
    this._refreshChargenCreditsState(activeShell, projection, selections);
    if (!this._creditsState?.diceFormula) {
      await this.useMaximumCredits(actor, activeShell);
      return { success: true, amount: this._creditsState.amount };
    }
    try {
      const roll = await RollEngine.safeRoll(this._creditsState.diceFormula, actor?.getRollData?.() ?? {}, {
        actor,
        domain: 'chargen.starting-credits',
        context: { source: 'summary-step', multiplier: this._creditsState.multiplier },
      });
      const base = Number(roll?.total || 0) * Number(this._creditsState.multiplier || 1);
      const amount = base + Number(this._creditsState.backgroundCredits || 0) + Number(this._creditsState.wealthBonus || 0);
      this._creditsState = {
        ...this._creditsState,
        resolved: true,
        amount,
        method: 'rolled',
        rollTotal: Number(roll?.total || 0),
        base,
        final: amount,
        needsResolution: false,
        ruleLabel: `Rolled ${roll?.total} × ${Number(this._creditsState.multiplier || 1).toLocaleString()} credits`,
        sources: [
          { label: 'Rolled Starting Credits', amount: base, tone: 'base' },
          ...(Number(this._creditsState.backgroundCredits || 0) > 0 ? [{ label: 'Background Credits', amount: Number(this._creditsState.backgroundCredits), tone: 'background' }] : []),
          ...(Number(this._creditsState.wealthBonus || 0) > 0 ? [{ label: 'Wealth Talent', amount: Number(this._creditsState.wealthBonus), tone: 'wealth' }] : []),
        ],
      };
      this._summary.startingCredits = amount;
      this._summary.creditsState = { ...this._creditsState };
      this._summary.creditLedger = this._buildChargenCreditLedger(actor);
      this._commitBusinessItems(activeShell);
      if (activeShell) await this._aggregateSummary(activeShell);
      return { success: true, amount };
    } catch (e) {
      swseLogger.error('[SummaryStep.rollCredits]', e);
      globalThis.ui?.notifications?.error?.('Starting credits roll failed.');
      return { success: false, error: e.message };
    }
  }

  async useMaximumCredits(actor, shell = null) {
    const activeShell = shell || globalThis.game?.swse?.currentProgressionShell || null;
    const selections = activeShell?.progressionSession?.draftSelections || {};
    const projection = activeShell?.progressionSession?.currentProjection || null;
    const baseState = this._buildCreditsResolutionState({ classSelection: selections.class, backgroundSelection: selections.background, projection, selections, actor });
    const base = Number(baseState.maximum || 0);
    const amount = base + Number(baseState.backgroundCredits || 0) + Number(baseState.wealthBonus || 0);
    this._creditsState = {
      ...baseState,
      resolved: true,
      amount,
      method: 'maximum',
      base,
      final: amount,
      needsResolution: false,
      ruleLabel: 'Player chose maximum starting credits',
      sources: [
        ...(base > 0 ? [{ label: 'Maximum Starting Credits', amount: base, tone: 'base' }] : []),
        ...(Number(baseState.backgroundCredits || 0) > 0 ? [{ label: 'Background Credits', amount: Number(baseState.backgroundCredits), tone: 'background' }] : []),
        ...(Number(baseState.wealthBonus || 0) > 0 ? [{ label: 'Wealth Talent', amount: Number(baseState.wealthBonus), tone: 'wealth' }] : []),
      ],
    };
    this._summary.startingCredits = amount;
    this._summary.creditsState = { ...this._creditsState };
    this._summary.creditLedger = this._buildChargenCreditLedger(actor);
    this._commitBusinessItems(activeShell);
    if (activeShell) await this._aggregateSummary(activeShell);
    return { success: true, amount };
  }

  async useAverageCredits(actor, shell = null) {
    const activeShell = shell || globalThis.game?.swse?.currentProgressionShell || null;
    const selections = activeShell?.progressionSession?.draftSelections || {};
    const projection = activeShell?.progressionSession?.currentProjection || null;
    const baseState = this._buildCreditsResolutionState({ classSelection: selections.class, backgroundSelection: selections.background, projection, selections, actor });
    const base = Number(baseState.average || 0);
    const amount = base + Number(baseState.backgroundCredits || 0) + Number(baseState.wealthBonus || 0);
    this._creditsState = {
      ...baseState,
      resolved: true,
      amount,
      method: 'average',
      base,
      final: amount,
      needsResolution: false,
      ruleLabel: 'Player chose average starting credits',
      sources: [
        ...(base > 0 ? [{ label: 'Average Starting Credits', amount: base, tone: 'base' }] : []),
        ...(Number(baseState.backgroundCredits || 0) > 0 ? [{ label: 'Background Credits', amount: Number(baseState.backgroundCredits), tone: 'background' }] : []),
        ...(Number(baseState.wealthBonus || 0) > 0 ? [{ label: 'Wealth Talent', amount: Number(baseState.wealthBonus), tone: 'wealth' }] : []),
      ],
    };
    this._summary.startingCredits = amount;
    this._summary.creditsState = { ...this._creditsState };
    this._summary.creditLedger = this._buildChargenCreditLedger(actor);
    this._commitBusinessItems(activeShell);
    if (activeShell) await this._aggregateSummary(activeShell);
    return { success: true, amount };
  }

  _buildLevelupCreditPreview(actor, selections = {}, selectedClass = null, session = null) {
    const currentCredits = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);
    const wealthGrant = this._computeLevelupWealthCreditGrant(actor, selections, selectedClass, session);
    const sources = [];
    if (wealthGrant > 0) sources.push({ label: 'Wealth Talent', amount: wealthGrant, tone: 'wealth' });
    const pendingDelta = sources.reduce((sum, source) => sum + Number(source.amount || 0), 0);
    return {
      currentCredits,
      pendingDelta,
      finalCredits: currentCredits + pendingDelta,
      sources,
      hasChanges: pendingDelta !== 0,
    };
  }

  _computeLevelupWealthCreditGrant(actor, selections = {}, selectedClass = null, session = null) {
    const effectiveSelections = {
      ...(selections || {}),
      class: selectedClass || selections?.class || session?.getSelection?.('class') || session?.draftSelections?.class || null,
    };
    return ProgressionFinalizer._computeLevelupWealthCreditGrant(actor, effectiveSelections, {
      mode: 'levelup',
      progressionSession: session || globalThis.game?.swse?.currentProgressionShell?.progressionSession || null,
      targetLevel: session?.targetLevel,
    });
  }

  _hasWealthTalent(actor, selections = {}) {
    const talents = [
      ...(Array.isArray(selections?.talents) ? selections.talents : []),
      ...this._collectSelectionEntries(selections, ['talent']),
      ...(actor?.items?.filter?.(item => item?.type === 'talent') || []),
    ];
    return talents.some(talent => String(talent?.name || talent?.label || talent?.id || talent || '').toLowerCase().replace(/[^a-z0-9]+/g, '') === 'wealth');
  }

  _collectSelectionEntries(selections = {}, domainHints = []) {
    const hints = domainHints.map(hint => String(hint || '').toLowerCase());
    const out = [];
    const visit = (value) => {
      if (!value) return;
      if (Array.isArray(value)) return value.forEach(visit);
      if (typeof value === 'object') {
        out.push(value);
        for (const key of ['selected', 'selection', 'value', 'item', 'entry', 'choice', 'candidate', 'talent']) {
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

  _computeWealthCreditGrant(classModel, selections = {}) {
    const talents = [
      ...(Array.isArray(selections?.talents) ? selections.talents : []),
      ...this._collectSelectionEntries(selections, ['talent']),
    ];
    const hasWealth = talents.some(talent => String(talent?.name || talent?.label || talent?.id || talent || '').toLowerCase().replace(/[^a-z0-9]+/g, '') === 'wealth');
    if (!hasWealth) return 0;
    const classKey = String(classModel?.name || classModel?.label || classModel?.id || selections?.class?.name || selections?.class || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    if (classKey !== 'noble' && classKey !== 'corporateagent') return 0;
    const level = Math.max(1, Number(selections?.survey?.startingLevel ?? this._startingLevel ?? 1) || 1);
    return level * 5000;
  }

  _parseMaxCredits(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    const match = String(value || '').match(/(\d+)d(\d+)\s*(?:x|×|\*)\s*(\d+)/i);
    if (!match) return 0;
    return Number(match[1]) * Number(match[2]) * Number(match[3]);
  }

  _computeStartingHP(classSelection, attributes = {}, actor = null, droidBuild = null) {
    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    const name = String(classModel?.name || classModel?.id || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
    const baseMap = { jedi: 30, soldier: 30, scout: 24, noble: 18, scoundrel: 18, force_adept: 24 };
    const base = Number(classModel?.baseHp || classModel?.system?.baseHp || classModel?.system?.base_hp || baseMap[name] || 18) || 18;
    const isDroid = !!droidBuild || actor?.type === 'droid' || actor?.system?.isDroid;
    const conMod = isDroid ? 0 : Number(attributes?.con?.modifier ?? actor?.system?.abilities?.con?.mod ?? actor?.system?.attributes?.con?.mod ?? 0) || 0;
    const total = Math.max(1, base + conMod);
    return {
      base,
      modifiers: conMod,
      total,
      formula: `${base} ${conMod >= 0 ? '+' : '-'} ${Math.abs(conMod)} CON`,
    };
  }

  _getExistingCharacterName(actor) {
    const candidates = [
      actor?.system?.identity?.name,
      actor?.system?.details?.name,
      actor?.name,
    ];
    for (const candidate of candidates) {
      const name = String(candidate || '').trim();
      if (name && !this._isDefaultActorName(name)) return name;
    }
    return '';
  }

  _isDefaultActorName(name) {
    const normalized = String(name || '').trim().toLowerCase();
    return !normalized || normalized === 'actor' || normalized === 'new actor' || normalized === 'new character' || normalized === 'unnamed';
  }

  _resolveSpeciesPortraitFromSummary(shell) {
    const actorImg = String(shell?.actor?.img || '').trim();
    const hasCustomActorImg = actorImg && !actorImg.includes('mystery-man') && !actorImg.includes('icons/svg');
    if (hasCustomActorImg) return actorImg;

    const speciesSelection = shell?.progressionSession?.draftSelections?.species;
    const species = ProgressionContentAuthority.resolveSpecies(speciesSelection) || speciesSelection || {};
    return species.img || species.image || species.portrait || species.system?.img || species.system?.image || null;
  }

  _getDraftCharacterName(shell = null) {
    const survey = shell?.progressionSession?.getSelection?.('survey')
      || shell?.progressionSession?.draftSelections?.survey
      || null;
    return String(survey?.characterName || '').trim();
  }

  _readCharacterNameFromDom(shell = null) {
    const root = shell?.element || this._lastShell?.element || null;
    const input = root?.querySelector?.('.summary-step-name-input');
    return input ? String(input.value || '').trim() : '';
  }

  _getResolvedCharacterName(shell = null) {
    const domName = this._readCharacterNameFromDom(shell);
    const draftName = this._getDraftCharacterName(shell);
    return String(domName || this._characterName || draftName || '').trim();
  }

  _hasCharacterName(shell = null) {
    return this._getResolvedCharacterName(shell).length > 0;
  }

  _setCharacterName(value, shell = null, options = {}) {
    const name = String(value || '').trim();
    this._characterName = name;
    this._summary.name = name;
    const root = shell?.element || this._lastShell?.element || null;
    const input = root?.querySelector?.('.summary-step-name-input');
    if (input && input.value !== value) input.value = value || '';
    if (options.commit === true) this._commitBusinessItems(shell || this._lastShell);
    return name;
  }

  _syncBusinessItemsFromDom(shell = null, options = {}) {
    const root = shell?.element || this._lastShell?.element || null;
    const input = root?.querySelector?.('.summary-step-name-input') || null;
    if (input) {
      this._setCharacterName(input.value, shell, { commit: false });
    } else if (!this._characterName) {
      const resolved = this._getDraftCharacterName(shell) || '';
      if (resolved) this._setCharacterName(resolved, shell, { commit: false });
    }
    if (options.commit === true) this._commitBusinessItems(shell || this._lastShell);
    return this._characterName;
  }

  _stableStringify(value) {
    const normalize = (input) => {
      if (Array.isArray(input)) return input.map(normalize);
      if (!input || typeof input !== 'object') return input;
      return Object.keys(input).sort().reduce((out, key) => {
        if (typeof input[key] === 'function') return out;
        out[key] = normalize(input[key]);
        return out;
      }, {});
    };
    try {
      return JSON.stringify(normalize(value));
    } catch (_err) {
      return String(value);
    }
  }

  _commitBusinessItems(shell) {
    if (!shell?.progressionSession?.commitSelection) return false;
    const currentSurvey = shell.progressionSession.getSelection?.('survey') || shell.progressionSession.draftSelections?.survey || {};
    const resolvedName = this._getResolvedCharacterName(shell);
    if (resolvedName !== this._characterName) this._setCharacterName(resolvedName, shell, { commit: false });
    const payload = {
      ...(currentSurvey && typeof currentSurvey === 'object' ? currentSurvey : {}),
      characterName: resolvedName || '',
      startingLevel: this._startingLevel || 1,
      startingCredits: this._creditsState?.resolved ? Number(this._creditsState.amount || 0) : 0,
      startingCreditsResolved: !!this._creditsState?.resolved,
      startingCreditsMethod: this._creditsState?.method || null,
      startingCreditsFormula: this._creditsState?.formula || '',
      startingCreditsBreakdown: this._creditsState?.sources || [],
      startingHp: this._summary.hpCalculation?.total || 0,
      hpGain: this._hpGainState?.resolved ? Number(this._hpGainState.gain || 0) : 0,
      hpGainResolved: !!this._hpGainState?.resolved,
      hpGainMethod: this._hpGainState?.method || null,
      hpGainFormula: this._hpGainState?.formula || '',
      creditDelta: this._activeMode === 'levelup' ? Number(this._creditsState?.amount || 0) : 0,
      creditDeltaSources: this._activeMode === 'levelup' ? (this._creditsState?.sources || []) : [],
      finalCredits: this._activeMode === 'levelup' ? Number(this._creditsState?.final || 0) : Number(this._creditsState?.amount || 0),
    };
    if (this._stableStringify(currentSurvey || {}) === this._stableStringify(payload)) {
      return true;
    }
    return shell.progressionSession.commitSelection('summary', 'survey', payload);
  }

  async _applyGeneratedName(shell = null, kind = 'character') {
    const randomName = kind === 'droid'
      ? await this._generateRandomDroidName(shell?.actor)
      : await this._generateRandomName(shell?.actor);
    if (!randomName) return '';
    this._setCharacterName(randomName, shell, { commit: true });
    shell?.requestRender?.({ preserveScroll: true, reason: kind === 'droid' ? 'generate-droid-name' : 'generate-name' }) ?? shell?.render?.();
    return randomName;
  }

  async _generateRandomName(actor) {
    try {
      const { getRandomName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomName === 'function') return await getRandomName(actor);
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to load shared random name generator:', err);
    }
    return 'Unnamed Spacer';
  }

  async _generateRandomDroidName(actor) {
    try {
      const { getRandomDroidName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomDroidName === 'function') return await getRandomDroidName(actor);
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to load shared random droid-name generator:', err);
    }
    return 'RX-44';
  }

  async _stageStartingCreditsForStore(actor, shell = null) {
    const expectedBudget = Math.max(0, Number(this._summary?.startingCredits || 0));
    if (!actor || expectedBudget <= 0) return;

    const existingState = actor.getFlag?.('swse', 'chargenStore') || actor.flags?.swse?.chargenStore || {};
    const previousBudget = Math.max(0, Number(existingState.startingCredits || 0));
    const currentCredits = Math.max(0, Number(actor.system?.credits ?? 0) || 0);

    let nextCredits = currentCredits;
    if (!existingState.initialized) {
      nextCredits = Math.max(currentCredits, expectedBudget);
    } else if (expectedBudget > previousBudget) {
      nextCredits = currentCredits + (expectedBudget - previousBudget);
    }

    if (nextCredits === currentCredits && existingState.initialized && previousBudget === expectedBudget) return;

    await ActorEngine.updateActor(actor, {
      'system.credits': nextCredits,
      'flags.swse.chargenStore': {
        initialized: true,
        startingCredits: expectedBudget,
        lastStagedCredits: nextCredits,
        sessionId: shell?.sessionId || shell?.progressionSession?.sessionId || null,
        updatedAt: new Date().toISOString(),
      },
    }, {
      source: 'SummaryStep.enterStore.stageStartingCredits',
      meta: { guardKey: 'chargen-store-starting-credits' },
    });
  }

  async enterStore(actor, shell = null) {
    const { SWSEStore } = await import('../../../apps/store/store-main.js');
    await this._stageStartingCreditsForStore(actor, shell);
    return SWSEStore.open(actor, {
      closeAfterCheckout: true,
      entryOrigin: 'chargen-summary',
      onCheckoutComplete: async () => {
        await this._aggregateSummary(shell);
        shell?.requestRender?.({ preserveScroll: true, reason: 'chargen-store-checkout' }) ?? shell?.render?.();
      },
      onClose: async () => {
        await this._aggregateSummary(shell);
        shell?.requestRender?.({ preserveScroll: true, reason: 'chargen-store-close' }) ?? shell?.render?.();
      },
    }).catch(err => {
      swseLogger.error('[SummaryStep.enterStore] Failed to open store', err);
    });
  }

  async handleAction(action, event, target, shell) {
    // Handle name generation actions
    if (action === 'generate-name' || action === 'generate-droid-name') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._applyGeneratedName(shell, action === 'generate-droid-name' ? 'droid' : 'character');
      return true;
    }

    // Handle credit resolution actions
    if (action === 'roll-credits' || action === 'reroll-credits') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.rollCredits(shell?.actor, shell);
      shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
      return true;
    }

    if (action === 'use-max-credits') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.useMaximumCredits(shell?.actor, shell);
      shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
      return true;
    }

    if (action === 'use-average-credits') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.useAverageCredits(shell?.actor, shell);
      shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
      return true;
    }

    // Handle HP resolution actions (for level-up)
    if (action === 'roll-hp') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.rollHP?.(shell?.actor, shell);
      shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
      return true;
    }

    if (action === 'use-max-hp') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.useMaxHP?.(shell?.actor, shell);
      shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
      return true;
    }

    return false;
  }

  /**
   * Extract display names from a selection object.
   * Handles arrays, Sets, Maps, objects with name fields, and other data shapes.
   * @param {*} selection - Selection data
   * @returns {string[]} - Array of clean display names
   * @private
   */
  _getSelectionNames(selection) {
    if (!selection) return [];

    // Handle arrays
    if (Array.isArray(selection)) {
      return selection
        .map(entry => {
          if (typeof entry === 'string') return entry;
          return entry?.name || entry?.label || entry?.title || entry?.displayName || entry?.id || '';
        })
        .filter(Boolean);
    }

    // Handle Set
    if (selection instanceof Set) {
      return Array.from(selection).map(entry => {
        if (typeof entry === 'string') return entry;
        return entry?.name || entry?.label || entry?.title || entry?.displayName || entry?.id || '';
      }).filter(Boolean);
    }

    // Handle Map
    if (selection instanceof Map) {
      return Array.from(selection.values()).map(entry => {
        if (typeof entry === 'string') return entry;
        return entry?.name || entry?.label || entry?.title || entry?.displayName || entry?.id || '';
      }).filter(Boolean);
    }

    // Handle plain object dictionary
    if (typeof selection === 'object') {
      return Object.values(selection)
        .map(entry => {
          if (typeof entry === 'string') return entry;
          return entry?.name || entry?.label || entry?.title || entry?.displayName || entry?.id || '';
        })
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Extract skill selection keys from various skill selection formats.
   * @param {*} skillSelections - Skill selection data
   * @returns {string[]} - Array of skill keys
   * @private
   */
  _extractSkillSelectionKeys(skillSelections) {
    if (!skillSelections) return [];

    // Handle arrays of strings (skill keys)
    if (Array.isArray(skillSelections)) {
      return skillSelections.filter(key => typeof key === 'string');
    }

    // Handle object dictionary where keys are skill IDs and values are truthy
    if (typeof skillSelections === 'object') {
      return Object.entries(skillSelections)
        .filter(([, value]) => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'object' && value) return value.trained || value.selected || value.value;
          return Boolean(value);
        })
        .map(([key]) => key)
        .filter(Boolean);
    }

    return [];
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'confirm', shell) || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }
}
