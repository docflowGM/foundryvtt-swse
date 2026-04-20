/**
 * ENHANCED LEVEL UP UI — ENGINE-DRIVEN
 */

import { ProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-engine-instance.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SkillRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry-ui.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry-ui.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-registry-ui.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/force/force-registry-ui.js";
import { isEpicOverrideEnabled } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { qs, qsa } from "/systems/foundryvtt-swse/scripts/utils/dom-utils.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";

// V2 API base class
import SWSEFormApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-form-application-v2.js";

export class SWSELevelUpEnhanced extends SWSEFormApplicationV2 {

  constructor(actor, opts = {}) {
    super(opts);

    this.actor = actor;
    this.engine = new ProgressionEngine(actor, 'levelup');

    const { heroicLevel, totalLevel } = getLevelSplit(this.actor);
    const level = Number(heroicLevel) || Number(this.actor?.system?.level) || 1;
    this._heroicLevel = level;
    this._totalLevel = Number(totalLevel) || Number(this.actor?.system?.level) || level;
    // Advisory metadata for downstream suggestion engines (if used)
    try {
      this.engine.pending = this.engine.pending || {};
      this.engine.pending.newLevel = level + 1;
      this.engine.pending.newHeroicLevel = level + 1;
      this.engine.pending.plannedHeroicLevel = level + 1;
      this.engine.pending.epicAdvisory = (level + 1) > 20 && isEpicOverrideEnabled();
    } catch (err) {
      // Non-fatal
    }

    this._epicBlocked = level >= 20 && !isEpicOverrideEnabled();

    this.currentStep = 'class';
    this.available = {
      classes: [],
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceSecrets: [],
      forceTechniques: []
    };
    // Phase 3 FIX: Track listeners to prevent accumulation on rerender
    this._eventListeners = [];
  }

  render(force, options) {
    return super.render(force, options);
  }

  /** UI template */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ['swse', 'levelup-engine-ui'],
      template: 'systems/foundryvtt-swse/templates/apps/levelup-engine-ui.hbs',
      width: 760,
      height: 680,
      resizable: true
    });

  /** UI title */
  get title() {
    const heroic = Number(this._heroicLevel) || Number(this.actor?.system?.level) || 1;
    const total = Number(this._totalLevel) || heroic;
    const totalLabel = total !== heroic ? ` • Total ${total}` : '';
    return `Level Up — ${this.actor.name} (Heroic ${heroic} → ${heroic + 1}${totalLabel})`;
  }

  async _prepareContext() {
    const data = await super._prepareContext();
    data.actor = this.actor;
    data.step = this.currentStep;

    data.available = this.available;
    data.pending = this.engine.pending;

    data.epicOverrideEnabled = isEpicOverrideEnabled();
    data.epicBlocked = this._epicBlocked;
    data.heroicLevel = Number(this._heroicLevel) || Number(this.actor?.system?.level) || 1;
    data.totalLevel = Number(this._totalLevel) || data.heroicLevel;
    data.epicAdvisory = !this._epicBlocked && (Number(data.heroicLevel) || 0) >= 20 && data.epicOverrideEnabled;

    return data;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;

    // Phase 3 FIX: Remove previous listeners before binding new ones
    // This prevents listener accumulation on rerender and listener storms
    this._eventListeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
    this._eventListeners = [];

    if (this._epicBlocked) {
      qsa(root, '.swse-levelup-wrapper button').forEach(b => { b.disabled = true; });
      qsa(root, '.rollback-levelup').forEach(b => { b.disabled = false; });
      return;
    }

    // Phase 3 FIX: Helper to track listeners as they're bound
    const addListener = (selector, eventName, handler) => {
      qsa(root, selector).forEach(el => {
        const boundHandler = handler.bind(this);
        el.addEventListener(eventName, boundHandler);
        this._eventListeners.push({ el, event: eventName, handler: boundHandler });
      });
    };

    addListener('.select-class', 'click', this._onSelectClass);
    addListener('.select-skill', 'click', this._onSelectSkill);
    addListener('.select-feat', 'click', this._onSelectFeat);
    addListener('.select-talent', 'click', this._onSelectTalent);

    addListener('.select-force-power', 'click', this._onSelectForcePower);
    addListener('.select-force-secret', 'click', this._onSelectForceSecret);
    addListener('.select-force-technique', 'click', this._onSelectForceTechnique);

    addListener('.next-step', 'click', this._next);
    addListener('.prev-step', 'click', this._prev);

    addListener('.finalize-levelup', 'click', this._onFinalize);
    addListener('.rollback-levelup', 'click', this._rollback);
  }

  /* ------------------------
   * STEP: CLASS SELECTION
   * ----------------------*/
  async _onSelectClass(ev) {
    const cname = ev.currentTarget.dataset.class;

    await this.engine.confirmClass(cname);
    await this._loadAvailable();     // refresh UI allowed options

    this.currentStep = 'skills';
    this.render();
  }

  /* ------------------------
   * STEP: SKILL CHOICE
   * ----------------------*/
  async _onSelectSkill(ev) {
    const name = ev.currentTarget.dataset.skill;
    await this.engine.confirmSkills([name]);
    await this._loadAvailable();

    this.render();
  }

  /* ------------------------
   * STEP: FEAT SELECTION
   * ----------------------*/
  async _onSelectFeat(ev) {
    const name = ev.currentTarget.dataset.feat;
    await this.engine.confirmFeats([name]);
    await this._loadAvailable();

    this.render();
  }

  /* ------------------------
   * STEP: TALENT SELECTION
   * ----------------------*/
  async _onSelectTalent(ev) {
    const name = ev.currentTarget.dataset.talent;
    await this.engine.confirmTalents([name]);
    await this._loadAvailable();

    this.render();
  }

  /* ------------------------
   * FORCE POWERS
   * ----------------------*/
  async _onSelectForcePower(ev) {
    await this.engine.confirmForcePowers([ev.currentTarget.dataset.power]);
    this.render();
  }

  async _onSelectForceSecret(ev) {
    await this.engine.confirmForceSecrets([ev.currentTarget.dataset.secret]);
    this.render();
  }

  async _onSelectForceTechnique(ev) {
    await this.engine.confirmForceTechniques([ev.currentTarget.dataset.technique]);
    this.render();
  }

  /* ------------------------
   * NAVIGATION
   * ----------------------*/
  async _next() {
    const order = [
      'class',
      'skills',
      'feats',
      'talents',
      'forcePowers',
      'forceSecrets',
      'forceTechniques',
      'summary'
    ];

    const idx = order.indexOf(this.currentStep);
    if (idx >= 0 && idx < order.length - 1) {this.currentStep = order[idx + 1];}

    await this._loadAvailable();
    this.render();
  }

  async _prev() {
    const order = [
      'class',
      'skills',
      'feats',
      'talents',
      'forcePowers',
      'forceSecrets',
      'forceTechniques',
      'summary'
    ];

    const idx = order.indexOf(this.currentStep);
    if (idx > 0) {this.currentStep = order[idx - 1];}

    await this._loadAvailable();
    this.render();
  }

  /* ------------------------
   * FINALIZE + ROLLBACK
   * ----------------------*/
  async _onFinalize() {
    try {
      const ok = await this.engine.finalize();
      if (ok) {
        ui.notifications.info('Level-up complete!');
        this.close();
        this.actor.sheet.render(true);
      }
    } catch (err) {
      SWSELogger.error('Finalization failed:', err);
      ui.notifications.error(`Level-up failed: ${err.message}`);
    }
  }

  async _rollback() {
    try {
      const ok = await this.engine.rollback();
      if (ok) {
        ui.notifications.warn('Rollback successful.');
        this.close();
        this.actor.sheet.render(true);
      }
    } catch (err) {
      SWSELogger.error('Rollback failed:', err);
      ui.notifications.error(`Rollback failed: ${err.message}`);
    }
  }

  /* ------------------------
   * LOAD AVAILABLE OPTIONS
   * ----------------------*/
  async _loadAvailable() {
    try {
      this.available.classes = await this._getAvailableClasses();
      this.available.skills = await SkillRegistry.list();
      this.available.feats = await FeatRegistry.listAvailable(this.actor, this.engine.pending);
      this.available.talents = await TalentRegistry.listTreesForActor(this.actor, this.engine.pending);
      this.available.forcePowers = await ForceRegistry.listPowersForActor(this.actor);
      this.available.forceSecrets = await ForceRegistry.listSecretsForActor(this.actor);
      this.available.forceTechniques = await ForceRegistry.listTechniquesForActor(this.actor);
    } catch (err) {
      SWSELogger.error('Failed to load available options:', err);
    }
  }

  /**
   * Get available classes for the actor
   * @private
   */
  async _getAvailableClasses() {
    try {
      return ClassesRegistry.getAll().map(c => ({
        name: c.name,
        img: c.img || null,
        isQualified: true,
        id: c.id,
        sourceId: c.sourceId
      }));
    } catch (err) {
      SWSELogger.error('Failed to get available classes:', err);
      return [];
    }
  }
}

SWSELogger.log('SWSELevelUpEnhanced module loaded');
