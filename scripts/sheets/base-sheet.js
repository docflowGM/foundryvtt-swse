// ==========================
// SWSEActorSheetBase (v13 compliant)
// Rewritten for Foundry VTT v13
// ==========================

import { SWSELogger } from '../utils/logger.js';
import { ProgressionEngine } from "../progression/engine/progression-engine.js";
import { CombatActionsMapper } from '../combat/utils/combat-actions-mapper.js';
import { CustomItemDialog } from '../apps/custom-item-dialog.js';

// Use namespaced ActorSheet for v13 compatibility
const BaseSheet = foundry.appv1?.sheets?.ActorSheet ?? ActorSheet;

export class SWSEActorSheetBase extends BaseSheet {

  // -----------------------------
  // Default Options
  // -----------------------------
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'swse-app'],
      width: 720,
      height: 680,
      resizable: true,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
      scrollY: ['.sheet-body']
    });
  }

  // -----------------------------
  // Data Preparation
  // -----------------------------
  async getData() {
    const context = await super.getData();
    const actor = this.actor;
    const system = actor.system;

    context.actor = actor;
    context.system = system;

    this._prepareItems(context);
    await this._enrichBiography(context);
    this._ensureNumericTypes(system);

    context.halfLevel = Math.floor((system.level || 1) / 2);
    context.conditionPenalty = actor.conditionPenalty || 0;
    context.skillActions = typeof CombatActionsMapper?.getAllActionsBySkill === 'function'
      ? CombatActionsMapper.getAllActionsBySkill()
      : {};

    return context;
  }

  // -----------------------------
  // Biography enrichment (v13 safe)
  // -----------------------------
  async _enrichBiography(context) {
    const TextEditorImpl = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    context.enrichedBiography = await TextEditorImpl.enrichHTML(context.system.biography || '', {
      async: true,
      secrets: this.actor.isOwner,
      relativeTo: this.actor
    });
  }

  // -----------------------------
  // Normalize Numbers
  // -----------------------------
  _ensureNumericTypes(system) {
    const toNum = (v, d = 0) => isNaN(Number(v)) ? d : Number(v);

    const topFields = ['level', 'experience', 'credits', 'currentHP', 'maxHP', 'temporaryHP', 'darkSideScore', 'forcePoints', 'destinyPoints'];
    topFields.forEach(f => system[f] = toNum(system[f]));

    if (system.abilities) for (const ab of Object.values(system.abilities)) {
      ab.base = toNum(ab.base, 10);
      ab.racial = toNum(ab.racial, 0);
      ab.misc = toNum(ab.misc, 0);
      ab.enhancement = toNum(ab.enhancement, 0);
      ab.temp = toNum(ab.temp, 0);
      ab.mod = toNum(ab.mod, 0);
    }

    if (system.skills) for (const sk of Object.values(system.skills)) {
      sk.value = toNum(sk.value);
      sk.mod = toNum(sk.mod);
      sk.bonus = toNum(sk.bonus);
    }

    if (system.defenses) for (const df of Object.values(system.defenses)) {
      df.total = toNum(df.total);
      df.base = toNum(df.base);
      df.armor = toNum(df.armor);
      df.ability = toNum(df.ability);
      df.classBonus = toNum(df.classBonus);
      df.misc = toNum(df.misc);
    }
  }

  // -----------------------------
  // Item Preparation
  // -----------------------------
  _prepareItems(context) {
    const items = { weapons: [], armor: [], equipment: [], feats: [], talents: [], classes: [], species: null, forcePowers: [] };

    for (const item of context.items) {
      const t = item.type;
      if (t === 'species') items.species = item;
      else if (t === 'forcepower') items.forcePowers.push(item);
      else if (items[t + 's']) items[t + 's'].push(item);
      else if (items[t]) items[t].push(item);
    }

    ['weapons', 'armor', 'feats', 'talents', 'classes', 'forcePowers']
      .forEach(c => items[c].sort((a, b) => a.name.localeCompare(b.name)));

    Object.assign(context, items);
  }

  // -----------------------------
  // Safe Roll Normalizer (v13)
  // -----------------------------
  async _safeEvaluateRoll(raw) {
    if (typeof raw === "string") raw = new Roll(raw);
    if (raw?.formula && !(raw instanceof Roll)) raw = new Roll(raw.formula);
    if (!(raw instanceof Roll)) raw = new Roll(String(raw));
    await raw.evaluate({ async: true });
    return raw;
  }

  // -----------------------------
  // Activate Listeners
  // -----------------------------
  activateListeners(html) {
    super.activateListeners(html);

    html[0].addEventListener('click', e => {
      const a = e.target.closest('[data-action]');
      if (a) this._onAction(e);
    });

    html[0].addEventListener('click', e => {
      const c = e.target.closest('.item-control');
      if (c) this._onItemControl(e);
    });

    html[0].addEventListener('click', e => {
      const r = e.target.closest('.rollable');
      if (r) this._onRoll(e);
    });

    html[0].addEventListener('click', e => {
      const s = e.target.closest('.skill-use-rollable');
      if (s) this._onRollSkillUse(e);
    });
  }

  // -----------------------------
  // Action Dispatcher
  // -----------------------------
  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const fn = this[`_on${action.charAt(0).toUpperCase() + action.slice(1)}`];

    if (typeof fn === 'function') return fn.call(this, event);
    if (action === "create" || action === "createItem") return this._onItemCreate(event);

    SWSELogger.warn(`No handler found for action: ${action}`);
  }

  // -----------------------------
  // Item Controls
  // -----------------------------
  async _onItemControl(event) {
    event.preventDefault();
    const act = event.currentTarget.dataset.action;
    const li = event.currentTarget.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);

    if (!item) return;

    switch (act) {
      case 'edit': return item.sheet.render(true);
      case 'delete': return item.delete();
      case 'toggle': return item.update({ 'system.equipped': !item.system.equipped });
    }
  }

  // -----------------------------
  // Create Item
  // -----------------------------
  async _onItemCreate(event) {
    const type = event.currentTarget.dataset.type;
    const cap = type.charAt(0).toUpperCase() + type.slice(1);

    const itemData = {
      name: `New ${cap}`,
      type,
      system: {}
    };

    const [created] = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    return created?.sheet.render(true);
  }

  // -----------------------------
  // Generic Rolls
  // -----------------------------
  async _onRoll(event) {
    event.preventDefault();
    const ds = event.currentTarget.dataset;

    if (!ds.roll) return;

    const r = globalThis.SWSE.RollEngine.safeRoll(ds.roll, this.actor.getRollData());
    const roll = await this._safeEvaluateRoll(r);

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: ds.label ?? 'Roll'
    });
  }

  // -----------------------------
  // Skill Use Rolls (Fixed)
  // -----------------------------
  async _onRollSkillUse(event) {
    event.preventDefault();
    event.stopPropagation();

    const skillKey = event.currentTarget.dataset.skill;
    const dc = parseInt(event.currentTarget.dataset.dc, 10);

    const skill = this.actor.system.skills?.[skillKey];
    if (!skill) return ui.notifications.error(`Skill ${skillKey} missing on actor.`);

    const formula = `1d20 + ${skill.total}`;
    const roll = await this._safeEvaluateRoll(globalThis.SWSE.RollEngine.safeRoll(formula));

    const success = !isNaN(dc) && roll.total >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${skillKey} check vs DC ${dc}`
    });
  }

  // -----------------------------
  // Spend Destiny Point
  // -----------------------------
  async _onSpendDestiny(event) {
    event.preventDefault();
    return this.actor.spendDestinyPoint("a heroic action");
  }

  // -----------------------------
  // Drag & Drop Upgrade (v13)
  // -----------------------------
  async _onDrop(event) {
    const data = await TextEditor.getDragEventData(event);

    if (data.type === 'Item') return this._onDropItem(event, data);
    return super._onDrop(event);
  }

  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    return await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }
}
