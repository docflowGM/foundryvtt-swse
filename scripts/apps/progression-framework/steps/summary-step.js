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
      hpCalculation: { base: 0, modifiers: 0, total: 0 },
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
      metadataChanges: [],
      statChanges: [],
      attributeChanges: [],
      addedFeats: [],
      addedTalents: [],
      addedForcePowers: [],
      addedSkills: [],
    };
  }

  async onStepEnter(shell) {
    const mode = shell?.mode || 'chargen';
    this._activeMode = mode;

    if (mode === 'levelup') {
      await this._buildLevelupSummary(shell);
    } else {
      await this._aggregateSummary(shell);
      const progressionSnapshot = shell.progressionSession?.actorSnapshot?.system || {};
      const liveCharacter = shell.actor?.system || {};
      const character = progressionSnapshot.identity?.name ? progressionSnapshot : liveCharacter;
      if (character.identity?.name) this._characterName = character.identity.name;
      if (shell.targetLevel) this._startingLevel = shell.targetLevel;
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
        nameInput.value = this._characterName;
        nameInput.addEventListener('input', (e) => {
          this._characterName = e.target.value;
          this._summary.name = e.target.value;
        }, { signal });
        nameInput.addEventListener('change', () => shell.render(), { signal });
      }

      const levelInput = shell.element.querySelector('.summary-step-level-input');
      if (levelInput) {
        levelInput.value = this._startingLevel;
        levelInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (!Number.isNaN(val) && val >= 1 && val <= 20) {
            this._startingLevel = val;
            this._summary.level = val;
          }
        }, { signal });
        levelInput.addEventListener('change', () => shell.render(), { signal });
      }

      const randomNameBtn = shell.element.querySelector('.summary-step-random-name-btn');
      if (randomNameBtn) {
        randomNameBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const randomName = await this._generateRandomName(shell.actor);
          if (randomName) {
            this._characterName = randomName;
            this._summary.name = randomName;
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
    const hasDroidBuild = !!this.descriptor?._shell?.progressionSession?.draftSelections?.droid;
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

  async _aggregateSummary(shell) {
    const character = shell.actor?.system || {};
    if (!shell.progressionSession) throw new Error('SummaryStep requires progressionSession');

    const projection = shell.progressionSession.currentProjection || await ProjectionEngine.buildProjection(shell.progressionSession, shell.actor);
    shell.progressionSession.currentProjection = projection;

    if (projection) {
      this._summary.name = this._characterName || character.identity?.name || '';
      this._summary.level = this._startingLevel || shell.targetLevel || 1;
      this._summary.species = projection.identity?.species || (shell.progressionSession?.draftSelections?.droid ? 'Droid' : '');
      this._summary.class = projection.identity?.class || '';
      this._summary.attributes = projection.attributes || {};
      this._summary.skills = projection.skills?.trained || [];
      this._summary.languages = (projection.languages || []).map(lang => lang.id || lang.name || lang);
      this._summary.featSelections = projection.abilities?.feats || [];
      this._summary.feats = (projection.abilities?.feats || []).map(feat => feat.name || feat.id || feat);
      this._summary.talentSelections = projection.abilities?.talents || [];
      this._summary.talents = (projection.abilities?.talents || []).map(talent => talent.name || talent.id || talent);
      return;
    }

    const selections = shell.progressionSession.draftSelections || {};
    this._summary.name = this._characterName || character.identity?.name || '';
    this._summary.level = this._startingLevel || shell.targetLevel || 1;
    this._summary.species = selections.species?.name || selections.species?.id || (selections.droid ? 'Droid' : '');
    this._summary.class = selections.class?.name || selections.class?.id || '';
    this._summary.attributes = selections.attributes?.values ? { ...selections.attributes.values } : {};
    this._summary.skills = Array.isArray(selections.skills?.trained) ? selections.skills.trained : [];
    this._summary.languages = Array.isArray(selections.languages) ? selections.languages.map(lang => lang.id || lang) : [];
    this._summary.featSelections = Array.isArray(selections.feats) ? [...selections.feats] : [];
    this._summary.feats = Array.isArray(selections.feats) ? selections.feats.map(feat => feat.name || feat.id || feat) : [];
    this._summary.talentSelections = Array.isArray(selections.talents) ? [...selections.talents] : [];
    this._summary.talents = Array.isArray(selections.talents) ? selections.talents.map(talent => talent.name || talent.id || talent) : [];
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
    const addedForcePowers = this._getAddedNames(actor, projection?.abilities?.forcePowers, 'forcepower');
    const addedSkills = this._getAddedSkills(actor, projection?.skills?.trained || []);

    this._levelupSummary = {
      metadataChanges,
      statChanges,
      attributeChanges,
      addedFeats,
      addedTalents,
      addedForcePowers,
      addedSkills,
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

  async _generateRandomName(actor) {
    try {
      const { getRandomName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomName === 'function') return await getRandomName(actor);
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random name:', err);
    }
    return null;
  }

  async _generateRandomDroidName(actor) {
    try {
      const { getRandomDroidName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomDroidName === 'function') return await getRandomDroidName(actor);
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random droid name:', err);
    }
    return null;
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'confirm') || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }
}
