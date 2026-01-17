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

    if (system.attributes) for (const ab of Object.values(system.attributes)) {
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
    // Find the actual element with data-action (event.currentTarget is the listener's element)
    const actionElement = event.target.closest('[data-action]');
    const action = actionElement?.dataset?.action;

    if (!action) {
      SWSELogger.warn('_onAction called but no action found on element');
      return;
    }

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
    // Find the actual element with the action (event.currentTarget is the listener's element)
    const controlElement = event.target.closest('.item-control');
    const act = controlElement?.dataset?.action;
    const li = controlElement?.closest('[data-item-id]');
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

    if (!type) {
      ui.notifications.error("Cannot create item: No item type specified");
      return;
    }

    const cap = type.charAt(0).toUpperCase() + type.slice(1);

    // Initialize system fields based on item type
    const systemDefaults = this._getSystemDefaults(type);

    const itemData = {
      name: `New ${cap}`,
      type,
      system: systemDefaults
    };

    const [created] = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    return created?.sheet.render(true);
  }

  // -----------------------------
  // Get Default System Fields
  // -----------------------------
  _getSystemDefaults(type) {
    const defaults = {
      weapon: {
        damage: "1d6",
        damageType: "kinetic",
        range: "melee",
        attackAttribute: "str",
        attackBonus: 0,
        weight: 0,
        cost: 0,
        properties: [],
        ammunition: { type: "none", current: 0, max: 0 },
        upgradeSlots: 0,
        installedUpgrades: [],
        description: "",
        equipped: false
      },
      armor: {
        armorType: "light",
        defenseBonus: 0,
        equipmentBonus: 0,
        fortBonus: 0,
        maxDexBonus: null,
        armorCheckPenalty: 0,
        speedPenalty: 0,
        weight: 0,
        cost: 0,
        upgradeSlots: 0,
        installedUpgrades: [],
        description: "",
        equipped: false
      },
      equipment: {
        weight: 0,
        cost: 0,
        upgradeSlots: 0,
        installedUpgrades: [],
        description: ""
      },
      feat: {
        featType: "general",
        prerequisite: "",
        benefit: "",
        special: "",
        normalText: "",
        bonusFeatFor: [],
        uses: { current: 0, max: 0, perDay: false }
      },
      talent: {
        tree: "Custom",
        prerequisite: "",
        benefit: "",
        special: "",
        uses: { current: 0, max: 0, perEncounter: false, perDay: false }
      },
      'force-power': {
        powerLevel: 1,
        discipline: "telekinetic",
        useTheForce: 15,
        time: "Standard Action",
        range: "6 squares",
        target: "One target",
        duration: "Instantaneous",
        effect: "",
        special: "",
        tags: [],
        dcChart: [],
        maintainable: false,
        forcePointCost: 0,
        forcePointEffect: "",
        sourcebook: "",
        page: null,
        uses: { current: 0, max: 0 },
        inSuite: false,
        spent: false
      }
    };

    return defaults[type] || {};
  }

  // -----------------------------
  // Generic Rolls
  // -----------------------------
  async _onRoll(event) {
    event.preventDefault();
    const ds = event.currentTarget.dataset;

    if (!ds.roll) return;

    // safeRoll is async and returns an already-evaluated roll
    const roll = await globalThis.SWSE.RollEngine.safeRoll(ds.roll, this.actor.getRollData());
    if (!roll) {
      ui.notifications.error("Roll failed. Check console for details.");
      return;
    }

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

    // Find the actual element with data-skill (event.currentTarget is the listener's root element)
    const skillElement = event.target.closest('.skill-use-rollable');
    if (!skillElement) return;

    const skillKey = skillElement.dataset.skill;
    const dc = parseInt(skillElement.dataset.dc, 10);

    const skill = this.actor.system.skills?.[skillKey];
    if (!skill) return ui.notifications.error(`Skill ${skillKey} missing on actor.`);

    const formula = `1d20 + ${skill.total}`;
    // safeRoll is async and returns an already-evaluated roll
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);
    if (!roll) {
      ui.notifications.error("Roll failed. Check console for details.");
      return;
    }

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
