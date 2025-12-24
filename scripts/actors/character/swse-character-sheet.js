//
// ============================================================
// SWSE Character Sheet (Modernized v13 Edition)
// Clean Rewrite (C1) — Structured, Maintains Spirit of Original
// ============================================================
//
// TABLE OF CONTENTS
//   A. Header & Init
//   B. Rendering & Scroll State
//   C. Data Preparation Engine
//   D. DOM Event Routing Engine (v13)
//   E. Dialog Engine (Species, Feat, Talent, Class, Human Bonus)
//   F. Roll Engine (Skills, Attacks, Damage, Force)
//   G. Combat Actions Engine
//   H. Feat Actions Engine
//   I. Talent Tree Engine
//   J. Force Suite & Power Engine
//   K. Drag & Drop / Compendium Import Engine
//   L. Utility Functions
// ============================================================

import { SWSEActorSheetBase } from "../../sheets/base-sheet.js";
import { SWSELogger } from '../../utils/logger.js';
import { CombatActionsMapper } from '../../combat/utils/combat-actions-mapper.js';
import { FeatActionsMapper } from '../../utils/feat-actions-mapper.js';
import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';
import { FeatSystem } from "../../engine/FeatSystem.js";
import { SkillSystem } from "../../engine/SkillSystem.js";

export class SWSECharacterSheet extends SWSEActorSheetBase {

  // ----------------------------------------------------------
  // B. Rendering & Scroll State
  // ----------------------------------------------------------

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'character'],
      template: 'systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs',
      width: 800,
      height: 900,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      scrollY: ['.sheet-body', '.tab']
    });
  }

  async _render(force, options) {
    this._saveScrollPositions();
    await super._render(force, options);
    this._restoreScrollPositions();
  }

  _saveScrollPositions() {
    this._scrollPositions = {};
    const root = this.element?.[0];
    if (!root) return;

    root.querySelectorAll('.sheet-body, .tab').forEach(el => {
      const key = el.dataset.scrollKey || el.className;
      this._scrollPositions[key] = el.scrollTop;
    });
  }

  _restoreScrollPositions() {
    const root = this.element?.[0];
    if (!root || !this._scrollPositions) return;

    root.querySelectorAll('.sheet-body, .tab').forEach(el => {
      const key = el.dataset.scrollKey || el.className;
      if (this._scrollPositions[key] !== undefined) {
        el.scrollTop = this._scrollPositions[key];
      }
    });
  }

  
  // ----------------------------------------------------------
  // C. Data Preparation Engine (Optimized)
  // ----------------------------------------------------------
  async getData() {
    const context = await super.getData();
    const actor = this.actor;
    const system = actor.system;

    // Add GM flag for template rendering
    context.isGM = game.user.isGM;

    // Inject skill actions
    context.skillActions = await SkillSystem.buildSkillActions(this.actor);

    // --------------------------------------
    // 1. FEATS: Force Secrets / Techniques
    // --------------------------------------
    const feats = actor.items.filter(i => i.type === "feat");
    context.forceSecrets = feats.filter(f => f.name.toLowerCase().includes("force secret"));
    context.forceTechniques = feats.filter(f => f.name.toLowerCase().includes("force technique"));

    // --------------------------------------
    // 1b. TALENTS: Lightsaber Forms
    // --------------------------------------
    const talents = actor.items.filter(i => i.type === "talent");
    context.lightsaberForms = talents.filter(t =>
      t.system?.talent_tree?.toLowerCase() === "lightsaber forms"
    );

    // --------------------------------------
    // 2. FORCE POWERS: Known vs Suite
    // --------------------------------------
    const allPowers = actor.items.filter(i => ["forcepower", "force-power"].includes(i.type));
    const suite = system.forceSuite || { powers: [], max: 6 };

    context.activeSuite = allPowers.filter(p => suite.powers.includes(p.id));
    context.knownPowers = allPowers.filter(p => !suite.powers.includes(p.id));

    // --------------------------------------
    // 3. FORCE REROLL DICE
    // --------------------------------------
    const lvl = system.level || 1;
    const die = system.forcePoints?.diceType || "d6";
    context.forceRerollDice =
      lvl >= 15 ? `3${die} (take highest)` :
      lvl >= 8  ? `2${die} (take highest)` :
                  `1${die}`;

    // --------------------------------------
    // 4. DARK SIDE SCORE VISUALIZATION
    // --------------------------------------
    const wis = system.abilities?.wis?.total ?? 10;
    const mult = game.settings.get("foundryvtt-swse", "darkSideMaxMultiplier") || 1;
    const maxDS = Math.max(wis * mult, 1);
    const cur = system.darkSideScore || 0;

    context.darkSideSegments = [];
    for (let i = 1; i <= maxDS; i++) {
      const t = (i - 1) / (maxDS - 1 || 1);
      const r = Math.round(t * 255);
      const b = Math.round((1 - t) * 255);
      context.darkSideSegments.push({
        index: i,
        color: `rgb(${r}, 0, ${b})`,
        active: i <= cur
      });
    }

    // --------------------------------------
    // 5. COMBAT ACTIONS
    // --------------------------------------
    const bySkill = CombatActionsMapper.getAllActionsBySkill();
    const flat = [];

    for (const [skill, data] of Object.entries(bySkill)) {
      if (!data.combatActions) continue;
      data.combatActions.forEach(a => flat.push({ ...a, skill }));
    }

    flat.sort((a, b) => {
      const order = { swift: 0, move: 1, standard: 2, "full-round": 3 };
      const A = order[a.actionType?.toLowerCase()] ?? 99;
      const B = order[b.actionType?.toLowerCase()] ?? 99;
      return A - B || a.name.localeCompare(b.name);
    });

    context.combatActions = CombatActionsMapper.addEnhancementsToActions(flat, actor);

    // --------------------------------------
    // 6. FEAT ACTION STATES
    // --------------------------------------
    const rawFeatActions = FeatActionsMapper.getActionsByType(actor);
    const fx = actor.effects.filter(e => e.flags?.swse?.type === "feat-action");

    context.featActions = {};
    for (const cat of ["toggleable", "variable", "standard", "passive"]) {
      if (!rawFeatActions[cat]) continue;
      context.featActions[cat] = rawFeatActions[cat].map(action => {
        const eff = fx.find(e => e.flags?.swse?.actionKey === action.key);
        return {
          ...action,
          toggled: !!eff,
          variableValue: eff?.flags?.swse?.variableValue || action.variableOptions?.min || 0
        };
      });
    }

    // --------------------------------------
    // 7. CLASS DISPLAY
    // --------------------------------------
    const classes = actor.items.filter(i => i.type === "class");
    context.chargenComplete = classes.length > 0;
    context.classDisplay = classes.length > 0
      ? classes.map(c => `${c.name} ${c.system.level || 1}`).join(" / ")
      : "No classes";

    return context;
  }
// ----------------------------------------------------------
  // D. DOM Event Routing Engine (v13)
  // ----------------------------------------------------------

  activateListeners(html) {

        // Feat Actions handlers
        html.find('.feat-roll').click(ev => this._onFeatRoll(ev));
        html.find('.feat-attack').click(ev => this._onFeatAttack(ev));
        html.find('.feat-ct').click(ev => this._onFeatCT(ev));
        html.find('.feat-force').click(ev => this._onFeatForce(ev));
        html.find('.feat-card-header').click(ev => this._toggleFeatCard(ev));
    

        super.activateListeners(html);
        html.find(".defense-input-sm, .defense-select-sm").change(ev => {
            this.actor.prepareData();
            this.render();
        });
    super.activateListeners(html);
    const root = html[0];

    const on = (event, selector, handler) => {
      root.addEventListener(event, evt => {
        const el = evt.target.closest(selector);
        if (el && root.contains(el)) handler.call(this, evt, el);
      });
    };

    // Skill System Event Listeners
    html.find(".roll-skill").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      this._onSkillRoll(skill);
    });

    html.find(".skill-action-roll").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      const action = ev.currentTarget.dataset.action;
      this._onSkillActionRoll(skill, action);
    });

    html.find(".skill-expand-btn").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      this._toggleSkillPanel(skill);
    });

    html.find(".skill-action-card .card-header").click(ev => {
      ev.preventDefault();
      const card = $(ev.currentTarget).closest(".skill-action-card");
      this._toggleSkillActionCard(card);
    });

    // Destiny System Event Listeners
    html.find(".fulfill-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onFulfillDestiny();
    });

    html.find(".reset-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onResetDestiny();
    });

    html.find(".enable-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onEnableDestiny();
    });

    html.find(".spend-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onSpendDestinyPoint();
    });

    SWSELogger.log("SWSE | Character sheet listeners activated (full v13 routing)");
  }

  
  // ----------------------------------------------------------
  // E. Dialog Engine (Streamlined v13 Model)
  // ----------------------------------------------------------

  /**
   * Universal helper to show a list-selection dialog.
   */
  async _showSelectionDialog(title, items, formatter, onSelect) {
    const rows = items.map((itm, idx) => `
      <div class="swse-option" data-key="${idx}">
        ${formatter(itm)}
      </div>`).join("");

    new Dialog({
      title,
      content: `<div class="swse-dialog-list">${rows}</div>`,
      buttons: {
        cancel: { label: "Cancel" }
      },
      render: html => {
        html[0].querySelectorAll(".swse-option").forEach(row => {
          row.addEventListener("click", evt => {
            const key = Number(row.dataset.key);
            onSelect(items[key]);
            const dlg = row.closest(".dialog");
            if (dlg) dlg.querySelector("button[data-button='cancel']").click();
          });
        });
      }
    }).render(true);
  }

  // ----------------------------------------------------------
  // E.1 Feat Picker
  // ----------------------------------------------------------
  async _showFeatPicker() {
    const pack = game.packs.get('foundryvtt-foundryvtt-swse.feats');
    if (!pack) return ui.notifications.error("Feat pack not found.");
    const docs = await pack.getDocuments();

    return this._showSelectionDialog(
      "Select Feat",
      docs,
      feat => `<strong>${feat.name}</strong><br><small>${feat.system.description ?? ""}</small>`,
      async feat => {
        await this.actor.createEmbeddedDocuments("Item", [feat.toObject()]);
        ui.notifications.info(`Added feat: ${feat.name}`);
      }
    );
  }

  // ----------------------------------------------------------
  // E.2 Talent Picker
  // ----------------------------------------------------------
  async _showTalentPicker() {
    const pack = game.packs.get('foundryvtt-foundryvtt-swse.talents');
    if (!pack) return ui.notifications.error("Talents pack not found.");
    const docs = await pack.getDocuments();

    return this._showSelectionDialog(
      "Select Talent",
      docs,
      tal => `<strong>${tal.name}</strong><br><small>${tal.system.description ?? ""}</small>`,
      async tal => {
        await this.actor.createEmbeddedDocuments("Item", [tal.toObject()]);
        ui.notifications.info(`Added talent: ${tal.name}`);
      }
    );
  }

  // ----------------------------------------------------------
  // E.3 Species Picker
  // ----------------------------------------------------------
  async _showSpeciesPicker() {
    const pack = game.packs.get('foundryvtt-foundryvtt-swse.species');
    if (!pack) return ui.notifications.error("Species pack not found.");

    const index = await pack.getIndex();
    const list = index.map(x => ({
      id: x._id,
      name: x.name,
      img: x.img
    }));

    return this._showSelectionDialog(
      "Select Species",
      list,
      sp => `<strong>${sp.name}</strong>`,
      async sp => {
        const doc = await pack.getDocument(sp.id);
        const { DropHandler } = await import('../../drag-drop/drop-handler.js');
        await DropHandler.handleSpeciesDrop(this.actor, doc);
        ui.notifications.info(`Species set to ${doc.name}`);
      }
    );
  }

  // ----------------------------------------------------------
  // E.4 Class Picker (uses levelup API)
  // ----------------------------------------------------------
  async _showClassPicker() {
    const { getAvailableClasses } = await import('../../apps/levelup/levelup-class.js');
    const classes = await getAvailableClasses(this.actor, {});
    if (!classes?.length) return ui.notifications.warn("No classes available.");

    return this._showSelectionDialog(
      "Select Class",
      classes,
      cls => `<strong>${cls.name}</strong> — ${cls.description ?? ""}`,
      async cls => {
        await this._addClassToActor(cls.id, cls.name, 1);
      }
    );
  }

  // ----------------------------------------------------------
  // E.5 Human Bonus Feat & Skill
  // ----------------------------------------------------------
  async _showHumanBonusDialogs() {
    const { loadFeats } = await import('../apps/levelup/levelup-feats.js');
    const feats = await loadFeats(this.actor);

    await this._showSelectionDialog(
      "Human Bonus Feat",
      feats,
      f => `<strong>${f.name}</strong>`,
      async f => await this.actor.createEmbeddedDocuments("Item", [f])
    );

    const skills = Object.keys(this.actor.system.skills);
    await this._showSelectionDialog(
      "Human Bonus Skill",
      skills,
      sk => `<strong>${sk}</strong>`,
      async sk => {
        await this.actor.update({ [`system.skills.${sk}.trained`]: true });
        ui.notifications.info(`Trained in ${sk}`);
      }
    );
  }


  // ----------------------------------------------------------
  // E.6 Destiny Management
  // ----------------------------------------------------------

  async _onEnableDestiny() {
    await this.actor.update({ "system.destiny.hasDestiny": true });
    ui.notifications.info("Destiny enabled for this character.");
  }

  async _onFulfillDestiny() {
    await this.actor.update({ "system.destiny.fulfilled": true });
    ui.notifications.info("Destiny fulfilled!");
  }

  async _onResetDestiny() {
    await this.actor.update({ "system.destiny.fulfilled": false });
    ui.notifications.info("Destiny reset to active.");
  }

  async _onSpendDestinyPoint() {
    const { DestinySpendingDialog } = await import('../../apps/destiny-spending-dialog.js');
    DestinySpendingDialog.open(this.actor);
  }


  // ----------------------------------------------------------
  // F. Roll Engine (v13 Modernized)
  // ----------------------------------------------------------

  async _safeEvaluate(formula) {
    let roll = formula;
    if (typeof roll === "string") roll = new Roll(roll);
    await roll.evaluate({ async: true });
    return roll;
  }

  // Skill Roll
  async _rollSkill(skillKey, label="Skill Check") {
    const sk = this.actor.system.skills?.[skillKey];
    if (!sk) return ui.notifications.error(`Skill not found: ${skillKey}`);

    const roll = await this._safeEvaluate(`1d20 + ${sk.total}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label
    });
  }

  // Attack Roll
  async _onRollAttack(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return ui.notifications.error("Weapon not found.");

    const atk = item.system.attackBonus ?? 0;
    const roll = await this._safeEvaluate(`1d20 + ${atk}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Attack: ${item.name}`
    });
  }

  // Damage Roll
  async _onRollDamage(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return ui.notifications.error("Weapon not found.");

    const dmg = item.system.damage || "1d6";
    const roll = await this._safeEvaluate(dmg);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Damage: ${item.name}`
    });
  }

  // Use the Force Roll
  async _onUsePower(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const p = this.actor.items.get(id);
    if (!p) return ui.notifications.error("Power not found.");

    const sk = this.actor.system.skills?.useTheForce;
    if (!sk) return ui.notifications.error("Use the Force skill missing.");

    const roll = await this._safeEvaluate(`1d20 + ${sk.total}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Use the Force: ${p.name}`
    });
  }

  // Force Point Roll
  async _onRollForcePoint(evt) {
    const fp = this.actor.system.forcePoints?.value || 0;
    if (fp <= 0) return ui.notifications.warn("No Force Points left.");

    const dieType = this.actor.system.forcePoints?.diceType || "d6";
    const lvl = this.actor.system.level || 1;
    const qty = lvl >= 15 ? 3 : lvl >= 8 ? 2 : 1;

    const roll = await this._safeEvaluate(`${qty}${dieType}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Force Point Roll"
    });

    await this.actor.update({ "system.forcePoints.value": fp - 1 });
  }


  
  // ----------------------------------------------------------
  // G. Combat Action Engine (Simplified)
  // ----------------------------------------------------------

  async _onPostCombatAction(evt) {
    evt.preventDefault();
    const el = evt.currentTarget;
    const name = el.dataset.actionName;

    const data = await SWSECharacterSheet.loadCombatActionsData();
    const action = data.find(a => a.name === name);
    if (!action) return ui.notifications.warn(`Action not found: ${name}`);

    const rollable = action.relatedSkills?.filter(r => r.dc?.type === "flat") || [];
    if (!rollable.length)
      return this._postCombatActionDescription(name, action);

    if (rollable.length === 1) {
      const rs = rollable[0];
      const key = this._getSkillKey(rs.skill);
      return SWSERoll.rollCombatActionCheck(this.actor, key, {
        name,
        actionType: action.action?.type,
        dc: rs.dc,
        outcome: rs.outcome
      });
    }

    return this._showSelectionDialog(
      `${name}: Choose Skill`,
      rollable,
      rs => `<strong>${rs.skill}</strong> — DC ${rs.dc.value}`,
      async rs => {
        const key = this._getSkillKey(rs.skill);
        return SWSERoll.rollCombatActionCheck(this.actor, key, {
          name,
          actionType: action.action?.type,
          dc: rs.dc,
          outcome: rs.outcome
        });
      }
    );
  }

  async _postCombatActionDescription(name, action) {
    const msg = `
      <div class="swse-combat-action">
        <h3>${name}</h3>
        <p>${action.notes ?? ""}</p>
      </div>
    `;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: msg });
  }


  
  // ----------------------------------------------------------
  // H. Feat Actions Engine
  // ----------------------------------------------------------

  async _onToggleFeatAction(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.actionKey;

    const updated = await FeatActionsMapper.toggleAction(this.actor, key);
    ui.notifications.info(updated ? "Feat Action Enabled" : "Feat Action Disabled");
  }

  async _onUpdateVariableAction(event) {
    event.preventDefault();

    const key = event.currentTarget.dataset.actionKey;
    const value = Number(event.currentTarget.value);

    const wrapper = event.currentTarget.closest(".feat-action-slider");
    if (wrapper) {
      const out = wrapper.querySelector(".slider-value");
      if (out) out.textContent = value;
    }

    await FeatActionsMapper.updateVariableAction(this.actor, key, value);
  }

  async _onUseFeatAction(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.actionKey;

    const feats = FeatActionsMapper.getAllFeatActions();
    const f = feats[key];
    if (!f) return ui.notifications.error("Feat action missing.");

    const msg = `
      <div class="swse-feat-action">
        <h3><i class="fas fa-star"></i> ${f.name}</h3>
        <p><strong>Type:</strong> ${f.actionType}</p>
        ${f.trigger ? `<p><strong>Trigger:</strong> ${f.trigger}</p>` : ""}
        <p>${f.description || ""}</p>
        <p>${f.notes || ""}</p>
      </div>
    `;

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: msg
    });
  }


  
  // ----------------------------------------------------------
  // I. Talent Tree Engine
  // ----------------------------------------------------------

  async _onToggleTree(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const el = btn.closest(".talent-tree");
    const content = el.querySelector(".tree-content");
    const icon = btn.querySelector("i");

    const open = content.style.display !== "none";
    content.style.display = open ? "none" : "block";

    if (icon) {
      icon.classList.toggle("fa-chevron-down", !open);
      icon.classList.toggle("fa-chevron-right", open);
    }
  }

  async _onSelectTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentId;
    const item = this.actor.items.get(id);

    if (!item) return ui.notifications.warn("Talent not found.");

    const isLocked = event.currentTarget.classList.contains("locked");
    if (isLocked) {
      return ui.notifications.warn("Talent is locked. Prerequisites unmet.");
    }

    const acquired = event.currentTarget.classList.contains("acquired");
    if (acquired) {
      const ok = await Dialog.confirm({
        title: `Remove Talent: ${item.name}`,
        content: `<p>This may break dependent choices. Remove?</p>`
      });
      if (ok) await item.delete();
      return;
    }

    return item.sheet?.render(true);
  }

  async _onViewTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentId;
    const t = this.actor.items.get(id);
    if (t) t.sheet.render(true);
  }

  async _onFilterTalents(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.filter;
    const html = this.element[0];

    html.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");

    if (id === "all") {
      html.querySelectorAll(".talent-tree").forEach(t => t.style.display = "");
      return;
    }

    html.querySelectorAll(".talent-tree").forEach(t => {
      const match = t.dataset.treeId === id;
      t.style.display = match ? "" : "none";
    });
  }


  
  // ----------------------------------------------------------
  // J. Force Suite Engine
  // ----------------------------------------------------------

  async _onAddToSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.powerId;
    const p = this.actor.items.get(id);
    if (!p) return;

    const suite = this.actor.items.filter(i =>
      ["forcepower", "force-power"].includes(i.type) &&
      i.system.inSuite
    );

    const max = this.actor.system.forceSuite?.maxPowers || 6;
    if (suite.length >= max) {
      return ui.notifications.warn(`Suite full (${max} powers).`);
    }

    await p.update({ "system.inSuite": true });
    ui.notifications.info(`Added ${p.name} to Suite`);
  }

  async _onRemoveFromSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.powerId;
    const p = this.actor.items.get(id);
    if (!p) return;

    await p.update({ "system.inSuite": false });
    ui.notifications.info(`Removed ${p.name} from Suite`);
  }

  async _onRestForce(event) {
    event.preventDefault();
    const spent = this.actor.items.filter(i =>
      ["forcepower", "force-power"].includes(i.type) &&
      i.system.spent
    );

    if (!spent.length) {
      return ui.notifications.info("All powers already refreshed.");
    }

    const ok = await Dialog.confirm({
      title: "Regain Force Powers",
      content: `<p>Regain all spent powers?</p><p>${spent.length} will be restored.</p>`
    });

    if (!ok) return;

    for (const p of spent) {
      await p.update({ "system.spent": false });
    }

    ui.notifications.info("Force powers restored.");
  }


  
  // ----------------------------------------------------------
  // K. Drag & Drop / Compendium Import Engine
  // ----------------------------------------------------------

  async _onDrop(event) {

    // ----------------------------------------------------------
    // PATCH: Asset auto-add for Droids & Vehicles on drag/drop
    // ----------------------------------------------------------
    // If dropped item is a Droid
    if (itemData.type === "droid") {
      const prev = this.actor.system.droids || [];
      const entry = {
        _id: itemData._id || foundry.utils.randomID(),
        name: itemData.name,
        model: itemData.system?.model || "Unknown",
        sourceItemId: created?.id ?? created?._id
      };

      await this.actor.update({ "system.droids": [...prev, entry] });
      ui.notifications.info(`Added droid asset: ${entry.name}`);
      return;
    }

    // If dropped item is a Vehicle
    if (itemData.type === "vehicle") {
      const prev = this.actor.system.vehicles || [];
      const entry = {
        _id: itemData._id || foundry.utils.randomID(),
        name: itemData.name,
        vehicleClass: itemData.system?.vehicleClass || "Unknown",
        sourceItemId: created?.id ?? created?._id
      };

      await this.actor.update({ "system.vehicles": [...prev, entry] });
      ui.notifications.info(`Added vehicle asset: ${entry.name}`);
      return;
    }

    event.preventDefault();

    const dt = event.dataTransfer;
    let raw = dt?.getData("text/plain");
    if (!raw) return super._onDrop(event);

    let data;
    try { data = JSON.parse(raw); }
    catch { return super._onDrop(event); }

    if (data.type !== "Item" || !data.pack || !data.id)
      return super._onDrop(event);

    const pack = game.packs.get(data.pack);
    if (!pack) return ui.notifications.error(`Missing pack ${data.pack}`);

    const doc = await pack.getDocument(data.id);
    if (!doc) return ui.notifications.error("Document not found in compendium.");

    const itemData = doc.toObject();
    const existing = this.actor.items.find(i => i.name === itemData.name && i.type === itemData.type);

    if (existing) {
      ui.notifications.info(`${itemData.name} already owned.`);
      return;
    }

    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);

    const applyEffects = game.settings.get("swse", "applyItemsAsEffects");
    if (applyEffects && created) {
      const changes = [];
      if (itemData.system?.hp?.max) {
        changes.push({ key: "system.hp.max", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: itemData.system.hp.max });
      }
      if (itemData.system?.armor?.value) {
        changes.push({ key: "system.armor.value", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: itemData.system.armor.value });
      }

      if (changes.length) {
        await this.actor.createEmbeddedDocuments("ActiveEffect", [{
          label: `From ${itemData.name}`,
          icon: itemData.img,
          changes,
          origin: `Actor.${this.actor.id}.Item.${created.id}`,
          flags: { swse: { fromItem: true } }
        }]);
      }
    }
  }


  // ----------------------------------------------------------
  // L. Utility Functions
  // ----------------------------------------------------------

  /* ======================================================================
     SKILL SYSTEM — SHEET HANDLERS
     ====================================================================== */

  /**
   * Roll a basic skill check
   */
  async _onSkillRoll(skillKey) {
    try {
      const actor = this.actor;
      const roll = await game.swse.RollEngine.skillRoll({
        actor,
        skill: skillKey,
        flavor: `Skill Check — ${skillKey}`
      });
      roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }) });
    } catch (err) {
      console.error("Skill Roll Error:", err);
      ui.notifications.error(`Failed to roll skill: ${skillKey}`);
    }
  }

  /**
   * Roll a specific action for a skill (skill-action-card)
   */
  async _onSkillActionRoll(skillKey, actionName) {
    const actor = this.actor;

    try {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<strong>${actionName}</strong><br>Performing skill action for <em>${skillKey}</em>.`
      });

      // Trigger a standard roll message for now
      // (Your RollEngine can later be extended for action-specific logic)
      const roll = await game.swse.RollEngine.skillRoll({
        actor,
        skill: skillKey,
        flavor: `Skill Action — ${actionName}`
      });
      roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }) });

    } catch (err) {
      console.error("Skill Action Roll Error:", err);
      ui.notifications.error(`Failed to perform action: ${actionName}`);
    }
  }

  /**
   * Show/hide full skill actions panel
   */
  _toggleSkillPanel(skillKey) {
    const panel = $(`.swse-skill-actions-panel[data-skill="${skillKey}"]`);
    const icon = $(`.skill-expand-btn[data-skill="${skillKey}"] i`);

    const isVisible = panel.is(":visible");

    if (isVisible) {
      panel.slideUp(180);
      icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
      panel.slideDown(200);
      icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
  }

  /**
   * Expand/collapse the body of a skill action card
   */
  _toggleSkillActionCard(cardElem) {
    const body = cardElem.find(".card-body");
    const icon = cardElem.find(".action-expand i");

    const isVisible = body.is(":visible");

    if (isVisible) {
      body.slideUp(180);
      icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
      body.slideDown(200);
      icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
  }
}
