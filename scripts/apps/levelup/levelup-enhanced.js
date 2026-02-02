/**
 * ENHANCED LEVEL UP UI — ENGINE-DRIVEN
 */

import { ProgressionEngine } from "../../progression/engine/progression-engine-instance.js";
import { SWSELogger } from "../../utils/logger.js";
import { SkillRegistry } from "../../progression/skills/skill-registry-ui.js";
import { FeatRegistry } from "../../progression/feats/feat-registry-ui.js";
import { TalentRegistry } from "../../progression/talents/talent-registry-ui.js";
import { ForceRegistry } from "../../progression/force/force-registry-ui.js";

// V2 API base class
import SWSEFormApplicationV2 from '../base/swse-form-application-v2.js';

export class SWSELevelUpEnhanced extends SWSEFormApplicationV2 {

  constructor(actor, opts = {}) {
    super(actor, opts);

    this.actor = actor;
    this.engine = new ProgressionEngine(actor, "levelup");

    this.currentStep = "class";
    this.available = {
      classes: [],
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceSecrets: [],
      forceTechniques: []
    };
  }

  /** UI template */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "levelup-engine-ui"],
      template: "systems/foundryvtt-swse/templates/apps/levelup-engine-ui.hbs",
      width: 760,
      height: 680,
      resizable: true
    });
  }

  /** UI title */
  get title() {
    let lvl = this.actor.system.level;
    return `Level Up — ${this.actor.name} (Level ${lvl} → ${lvl + 1})`;
  }

  async _prepareContext() {
    const data = await super._prepareContext();
    data.actor = this.actor;
    data.step = this.currentStep;

    data.available = this.available;
    data.pending = this.engine.pending;

    return data;
  }

  async _onRender(html, options) {
    await super._onRender(html, options);

    html.find(".select-class").on("click", this._onSelectClass.bind(this));
    html.find(".select-skill").on("click", this._onSelectSkill.bind(this));
    html.find(".select-feat").on("click", this._onSelectFeat.bind(this));
    html.find(".select-talent").on("click", this._onSelectTalent.bind(this));

    html.find(".select-force-power").on("click", this._onSelectForcePower.bind(this));
    html.find(".select-force-secret").on("click", this._onSelectForceSecret.bind(this));
    html.find(".select-force-technique").on("click", this._onSelectForceTechnique.bind(this));

    html.find(".next-step").on("click", this._next.bind(this));
    html.find(".prev-step").on("click", this._prev.bind(this));

    html.find(".finalize-levelup").on("click", this._onFinalize.bind(this));
    html.find(".rollback-levelup").on("click", this._rollback.bind(this));
  }

  /* ------------------------
   * STEP: CLASS SELECTION
   * ----------------------*/
  async _onSelectClass(ev) {
    let cname = ev.currentTarget.dataset.class;

    await this.engine.confirmClass(cname);
    await this._loadAvailable();     // refresh UI allowed options

    this.currentStep = "skills";
    this.render();
  }

  /* ------------------------
   * STEP: SKILL CHOICE
   * ----------------------*/
  async _onSelectSkill(ev) {
    let name = ev.currentTarget.dataset.skill;
    await this.engine.confirmSkills([name]);
    await this._loadAvailable();

    this.render();
  }

  /* ------------------------
   * STEP: FEAT SELECTION
   * ----------------------*/
  async _onSelectFeat(ev) {
    let name = ev.currentTarget.dataset.feat;
    await this.engine.confirmFeats([name]);
    await this._loadAvailable();

    this.render();
  }

  /* ------------------------
   * STEP: TALENT SELECTION
   * ----------------------*/
  async _onSelectTalent(ev) {
    let name = ev.currentTarget.dataset.talent;
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
      "class",
      "skills",
      "feats",
      "talents",
      "forcePowers",
      "forceSecrets",
      "forceTechniques",
      "summary"
    ];

    let idx = order.indexOf(this.currentStep);
    if (idx >= 0 && idx < order.length - 1) this.currentStep = order[idx + 1];

    await this._loadAvailable();
    this.render();
  }

  async _prev() {
    const order = [
      "class",
      "skills",
      "feats",
      "talents",
      "forcePowers",
      "forceSecrets",
      "forceTechniques",
      "summary"
    ];

    let idx = order.indexOf(this.currentStep);
    if (idx > 0) this.currentStep = order[idx - 1];

    await this._loadAvailable();
    this.render();
  }

  /* ------------------------
   * FINALIZE + ROLLBACK
   * ----------------------*/
  async _onFinalize() {
    try {
      let ok = await this.engine.finalize();
      if (ok) {
        ui.notifications.info("Level-up complete!");
        this.close();
        this.actor.sheet.render(true);
      }
    } catch (err) {
      SWSELogger.error("Finalization failed:", err);
      ui.notifications.error(`Level-up failed: ${err.message}`);
    }
  }

  async _rollback() {
    try {
      let ok = await this.engine.rollback();
      if (ok) {
        ui.notifications.warn("Rollback successful.");
        this.close();
        this.actor.sheet.render(true);
      }
    } catch (err) {
      SWSELogger.error("Rollback failed:", err);
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
      SWSELogger.error("Failed to load available options:", err);
    }
  }

  /**
   * Get available classes for the actor
   * @private
   */
  async _getAvailableClasses() {
    try {
      const pack = game.packs.get("foundryvtt-swse.classes");
      if (!pack) {
        SWSELogger.warn("Classes compendium not found");
        return [];
      }

      const docs = await pack.getDocuments();
      return docs.map(c => ({
        name: c.name,
        img: c.img || null,
        isQualified: true
      }));
    } catch (err) {
      SWSELogger.error("Failed to get available classes:", err);
      return [];
    }
  }
}

SWSELogger.log("SWSELevelUpEnhanced module loaded");
