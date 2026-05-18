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
import { buildSkillDisplay } from '../utils/skill-display.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

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
      startingCredits: 0,
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
      mutationPreview: null,
    };
  }

  async onStepEnter(shell) {
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
          this._characterName = String(e.target.value || '').trim();
          this._summary.name = this._characterName;
          this._commitBusinessItems(shell);
        }, { signal });
        nameInput.addEventListener('change', () => {
          this._commitBusinessItems(shell);
          shell.render();
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
          const randomName = await this._generateRandomName(shell.actor);
          if (randomName) {
            this._characterName = randomName;
            this._summary.name = randomName;
            this._commitBusinessItems(shell);
            shell.render();
          }
        }, { signal });
      }

      const randomDroidNameBtn = shell.element.querySelector('.summary-step-random-droid-name-btn');
      if (randomDroidNameBtn) {
        randomDroidNameBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const randomName = await this._generateRandomDroidName(shell.actor);
          if (randomName) {
            this._characterName = randomName;
            this._summary.name = randomName;
            this._commitBusinessItems(shell);
            shell.render();
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
    const mode = context?.mode || context?.shell?.mode || 'chargen';

    if (mode === 'levelup') {
      const validation = this.validate();
      return {
        mode,
        levelupSummary: this._levelupSummary,
        hpGainState: { ...this._hpGainState },
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
    const validation = this.validate();
    const issuesSummary = {
      hasErrors: validation.errors.length > 0,
      errorCount: validation.errors.length,
      errors: validation.errors,
      hasCaution: validation.warnings.caution.length > 0,
      cautionCount: validation.warnings.caution.length,
      cautions: validation.warnings.caution,
      isReadyToFinalize: validation.isValid && this._isReviewComplete && !!this._characterName,
      finalizationStatus: validation.isValid && this._isReviewComplete && !!this._characterName
        ? 'Ready to create character'
        : validation.errors.length > 0
          ? `${validation.errors.length} error${validation.errors.length === 1 ? '' : 's'} to fix`
          : 'Incomplete',
    };

    return {
      mode,
      summary: this._summary,
      characterName: this._characterName,
      startingLevel: this._startingLevel,
      isReviewComplete: this._isReviewComplete,
      orderedFeats,
      orderedTalents,
      issuesSummary,
    };
  }

  validate() {
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

    if (!this._characterName || this._characterName.trim() === '') {
      errors.push('Character name is required (enter or generate a name above)');
    }
    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
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
    if (this._activeMode !== 'levelup') {
      this._commitBusinessItems(shell);
    }
  }

  getSelection() {
    const mode = this._activeMode || 'chargen';
    if (mode === 'levelup') {
      const complete = !(this._hpGainState.needsResolution && !this._hpGainState.resolved);
      return { selected: complete ? ['levelup-summary'] : [], count: complete ? 1 : 0, isComplete: complete };
    }
    return {
      selected: this._characterName ? [this._characterName] : [],
      count: this._characterName ? 1 : 0,
      isComplete: this._isReviewComplete && !!this._characterName && this._startingLevel >= 1 && this._startingLevel <= 20,
    };
  }

  getBlockingIssues() {
    return this.validate().errors;
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/summary-work-surface.hbs',
      data: stepData,
    };
  }

  renderSummaryPanel(context = {}) {
    if ((this._activeMode || 'chargen') === 'levelup') return null;
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/summary-panel/summary-metadata-rail.hbs',
      data: {
        actorIdentity: {
          name: this._characterName || this._getExistingCharacterName(context?.shell?.actor) || 'Unnamed',
          portrait: this._summary.portrait || null,
        },
        summary: this._summary,
      },
    };
  }

  renderDetailsPanel(focusedItem, shell = null) {
    if ((this._activeMode || 'chargen') === 'levelup') return this.renderDetailsPanelEmptyState();
    const validation = this.validate();
    const issuesSummary = {
      hasErrors: validation.errors.length > 0,
      errorCount: validation.errors.length,
      errors: validation.errors,
      isReadyToFinalize: validation.isValid && this._isReviewComplete && !!this._characterName,
    };
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/summary-business-details.hbs',
      data: {
        summary: this._summary,
        characterName: this._characterName,
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

    const projection = shell.progressionSession.currentProjection || await ProjectionEngine.buildProjection(shell.progressionSession, shell.actor);
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
    this._summary.skillRows = this._buildSkillRows(projection?.skills?.total || this._summary.skills, this._summary.attributes, this._summary.level);
    this._summary.languages = (projection?.languages || []).map(lang => this._displayName(lang)).filter(Boolean);
    this._summary.featSelections = projection?.abilities?.feats || ProgressionContentAuthority.normalizeSelectionList('feat', selections.feats);
    this._summary.feats = this._summary.featSelections.map(feat => this._displayName(feat)).filter(Boolean);
    this._summary.talentSelections = projection?.abilities?.talents || ProgressionContentAuthority.normalizeSelectionList('talent', selections.talents);
    this._summary.talents = this._summary.talentSelections.map(talent => this._displayName(talent)).filter(Boolean);
    this._summary.forcePowers = (projection?.abilities?.forcePowers || []).map(power => this._displayName(power)).filter(Boolean);
    this._summary.startingCredits = this._computeStartingCredits(selections.class, selections.background, projection, selections);
    this._summary.hpCalculation = this._computeStartingHP(selections.class, this._summary.attributes, shell.actor, selections.droid);
    this._summary.combatStats = this._buildCombatStats(selections.class, this._summary.attributes, this._summary.level, this._summary.hpCalculation.total);
    this._summary.portrait = this._resolveSpeciesPortraitFromSummary(shell);
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
    pushStat('BaB', beforeBAB, afterBAB);
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
    const addedForceTechniques = this._getSelectionNames(selections.forceTechniques);
    const addedForceSecrets = this._getSelectionNames(selections.forceSecrets);
    const addedMedicalSecrets = this._getSelectionNames(selections.medicalSecrets);
    const addedStarshipManeuvers = this._getSelectionNames(selections.starshipManeuvers);
    const addedLanguages = this._getSelectionNames(selections.languages);
    const addedSkills = this._getAddedSkills(actor, projection?.skills?.trained || this._extractSkillSelectionKeys(selections.skills));
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
      mutationPreview: this._buildLevelupMutationPreview(dryRun),
    };
  }

  _getCurrentLevel(actor) {
    return Number(actor?.system?.details?.level ?? actor?.system?.level ?? 1);
  }

  _getCurrentHPMax(actor) {
    return Number(actor?.system?.hp?.max ?? actor?.system?.derived?.hp?.max ?? 0);
  }

  _getCurrentBAB(actor) {
    return Number(actor?.system?.derived?.bab ?? actor?.system?.bab?.total ?? actor?.system?.baseAttackBonus ?? 0);
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
    const synthetic = {
      items: actor.items.map(i => ({ type: i.type, name: i.name, system: foundry.utils.deepClone(i.system || {}) }))
    };
    const className = selectedClass?.name || selectedClass?.id;
    if (className) {
      const existing = synthetic.items.find(i => i.type === 'class' && i.name === className);
      if (existing) {
        existing.system.level = Number(existing.system.level || 1) + 1;
      } else {
        synthetic.items.push({ type: 'class', name: className, system: foundry.utils.deepClone(selectedClass?.system || {}) });
      }
    }
    return Number(calculateTotalBAB(synthetic) || this._getCurrentBAB(actor));
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

      const { calculateHPGain } = await import('/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js');
      const hpGeneration = ProgressionRules.getHPGeneration();
      const maxHPLevels = ProgressionRules.getMaxHPLevels();
      const newLevel = this._getCurrentLevel(actor) + 1;
      const hitDie = this._extractHitDie(classData);
      const hpGain = Number(calculateHPGain(classData, actor, newLevel) || 0);
      const needsResolution = newLevel > maxHPLevels && hpGeneration === 'roll';
      this._hpGainState = {
        resolved: !needsResolution,
        gain: hpGain,
        method: needsResolution ? null : hpGeneration,
        formula: `d${hitDie} ${Number(actor?.system?.abilities?.con?.mod ?? actor?.system?.attributes?.con?.mod ?? 0) >= 0 ? '+' : ''}${Number(actor?.system?.abilities?.con?.mod ?? actor?.system?.attributes?.con?.mod ?? 0)}`,
        needsResolution,
        hitDie,
      };
    } catch (e) {
      swseLogger.error('[SummaryStep._checkHPGainResolution]', e);
      this._hpGainState.resolved = true;
    }
  }

  async rollHPGain(actor) {
    await this._checkHPGainResolution({ actor, mode: 'levelup', progressionSession: game?.swse?.currentProgressionShell?.progressionSession });
    this._hpGainState.resolved = true;
    this._hpGainState.method = 'rolled';
    return { success: true, gain: this._hpGainState.gain };
  }

  async useMaximumHPGain(actor) {
    const selectedClass = game?.swse?.currentProgressionShell?.progressionSession?.draftSelections?.class || ActorAbilityBridge.getClasses(actor)[0] || null;
    const hitDie = this._extractHitDie(selectedClass);
    const conMod = Number(actor?.system?.abilities?.con?.mod ?? actor?.system?.attributes?.con?.mod ?? 0);
    const maxHPGain = Math.max(1, hitDie + conMod);
    this._hpGainState.resolved = true;
    this._hpGainState.gain = maxHPGain;
    this._hpGainState.method = 'maximum';
    return { success: true, gain: maxHPGain };
  }

  _extractHitDie(classData) {
    if (!classData) return 6;
    const hitDieString = classData?.system?.hitDie || classData?.hitDie || '1d6';
    const match = String(hitDieString).match(/d(\d+)/i);
    if (match) return Number(match[1]);
    const classHitDice = {
      'Elite Trooper': 12, 'Independent Droid': 12,
      'Assassin': 10, 'Bounty Hunter': 10, 'Droid Commander': 10, 'Gladiator': 10,
      'Imperial Knight': 10, 'Jedi': 10, 'Jedi Knight': 10, 'Jedi Master': 10,
      'Master Privateer': 10, 'Martial Arts Master': 10, 'Pathfinder': 10,
      'Sith Apprentice': 10, 'Sith Lord': 10, 'Soldier': 10, 'Vanguard': 10,
      'Ace Pilot': 8, 'Beast Rider': 8, 'Charlatan': 8, 'Corporate Agent': 8,
      'Crime Lord': 8, 'Enforcer': 8, 'Force Adept': 8, 'Force Disciple': 8,
      'Gunslinger': 8, 'Improviser': 8, 'Infiltrator': 8, 'Medic': 8,
      'Melee Duelist': 8, 'Military Engineer': 8, 'Officer': 8, 'Outlaw': 8,
      'Saboteur': 8, 'Scout': 8, 'Shaper': 8,
      'Noble': 6, 'Scoundrel': 6, 'Slicer': 6
    };
    return classHitDice[classData?.name] || 6;
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
      const trained = skill?.trained !== false;
      const focused = !!skill?.focused;
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
      { label: 'BaB', value: `+${bab}`, toneClass: bab > 0 ? 'prog-number-positive' : 'prog-number-zero' },
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
    const projected = Number(projection?.derived?.credits || 0) || 0;
    let base = projected > 0 ? projected : 0;
    if (base <= 0) {
      const authority = Number(ProgressionContentAuthority.getStartingCredits({ classSelection, backgroundSelection }) || 0) || 0;
      if (authority > 0) base = authority;
    }

    const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
    if (base <= 0) {
      const classCredits = this._parseMaxCredits(
        classModel?.startingCredits
          ?? classModel?.system?.startingCredits
          ?? classModel?.system?.starting_credits
          ?? classSelection?.startingCredits
          ?? classSelection?.system?.starting_credits
      );
      const backgroundCredits = Number(backgroundSelection?.credits ?? backgroundSelection?.system?.credits ?? 0) || 0;
      if (classCredits + backgroundCredits > 0) base = classCredits + backgroundCredits;
    }

    if (base <= 0) {
      const name = String(classModel?.name || classModel?.id || classSelection?.name || classSelection?.id || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
      const fallback = { soldier: 1200, scout: 1200, scoundrel: 3000, jedi: 1200, noble: 4800, force_adept: 1200 };
      base = fallback[name] || 0;
    }

    return base + this._computeWealthCreditGrant(classModel, selections);
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

  _commitBusinessItems(shell) {
    if (!shell?.progressionSession?.commitSelection) return false;
    const currentSurvey = shell.progressionSession.getSelection?.('survey') || shell.progressionSession.draftSelections?.survey || {};
    return shell.progressionSession.commitSelection('summary', 'survey', {
      ...(currentSurvey && typeof currentSurvey === 'object' ? currentSurvey : {}),
      characterName: this._characterName || '',
      startingLevel: this._startingLevel || 1,
      startingCredits: this._summary.startingCredits || 0,
      startingHp: this._summary.hpCalculation?.total || 0,
    });
  }

  async _generateRandomName(actor) {
    try {
      const module = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
      const CharacterGenerator = module?.CharacterGenerator || module?.default;
      const names = CharacterGenerator?.RANDOM_NAMES || [];
      if (names.length > 0) return names[Math.floor(Math.random() * names.length)];
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to load legacy random names; using local fallback:', err);
    }
    const fallback = ['Tessa', 'Kai Vorn', 'Lira Voss', 'Jax Rendar', 'Mira Sol', 'Dain Korr', 'Vexa Tal'];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  async _generateRandomDroidName(actor) {
    try {
      const module = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
      const CharacterGenerator = module?.CharacterGenerator || module?.default;
      const names = CharacterGenerator?.RANDOM_DROID_NAMES || [];
      if (names.length > 0) return names[Math.floor(Math.random() * names.length)];
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to load legacy droid names; using local fallback:', err);
    }
    const prefix = ['R', 'T', 'K', 'J0', 'D', 'C'];
    const suffix = Math.floor(10 + Math.random() * 90);
    return `${prefix[Math.floor(Math.random() * prefix.length)]}-${suffix}`;
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
    if (action !== 'generate-name' && action !== 'generate-droid-name') return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const randomName = action === 'generate-droid-name'
      ? await this._generateRandomDroidName(shell?.actor)
      : await this._generateRandomName(shell?.actor);
    if (!randomName) return true;
    this._characterName = randomName;
    this._summary.name = randomName;
    this._commitBusinessItems(shell);
    shell?.requestRender?.({ preserveScroll: true, reason: action }) ?? shell?.render?.();
    return true;
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'confirm', shell) || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }
}
