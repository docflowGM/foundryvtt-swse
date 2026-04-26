import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { BlasterCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/blaster-customization-engine.js";
import { GearTemplatesEngine } from "/systems/foundryvtt-swse/scripts/apps/gear-templates-engine.js";
import { BLASTER_BOLT_COLORS, BLASTER_FX_TYPES, DEFAULT_BOLT_COLOR, DEFAULT_FX_TYPE } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";
import { BLASTER_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/blaster-upgrades.js";
import { MELEE_UPGRADES, MELEE_ACCENT_COLORS, DEFAULT_MELEE_ACCENT } from "/systems/foundryvtt-swse/scripts/data/melee-upgrades.js";
import { ARMOR_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/armor-upgrades.js";
import { GEAR_MODS, GEAR_VARIANTS, DEFAULT_GEAR_VARIANT, DEFAULT_GEAR_ACCENT } from "/systems/foundryvtt-swse/scripts/data/gear-mods.js";

const APP_ID = 'swse-item-customization-workbench';
const CATEGORY_ORDER = [
  { key: 'weapons', label: 'Weapons', icon: '⚔' },
  { key: 'armor', label: 'Armor', icon: '⛨' },
  { key: 'gear', label: 'Gear', icon: '◇' }
];
const STRUCTURAL_LABELS = {
  size_increase: 'Increase Size / Bulk',
  damage: 'Strip Damage',
  range: 'Strip Range',
  design: 'Strip Design',
  stun_setting: 'Strip Stun Setting',
  autofire: 'Strip Autofire',
  defensive_material: 'Strip Defensive Material',
  joint_protection: 'Strip Joint Protection'
};
const ACCENT_SWATCHES = ['#a0a0a0', '#d4af37', '#b87333', '#c0c0c0', '#1a1a1a', '#dc143c', '#1e90ff', '#00ff66'];
const TINT_SWATCHES = ['#1a1a2e','#3a2a4a','#5a3a4a','#7a3a4a','#8a5a3a','#3a5a4a','#3a4a6a','#5a5a6a','#aa8a4a','#2a2a2a','#9a9a9a','#0a0a0a'];

export class ItemCustomizationWorkbench extends BaseSWSEAppV2 {
  constructor(actor, { itemId = null, category = null } = {}) {
    super({});
    this.actor = actor;
    this.selectedCategory = category;
    this.selectedItemId = itemId;
    this.search = '';
    this._drafts = new Map();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: APP_ID,
    classes: ['swse', 'swse-item-customization-workbench', 'swse-theme-holo'],
    position: { width: 1240, height: 920 },
    window: {
      title: 'Armory // Customization',
      resizable: true,
      icon: 'fas fa-screwdriver-wrench'
    }
  });

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/customization/item-customization-workbench.hbs'
    }
  };

  static supportsItem(item) {
    if (!item) return false;
    return ['blaster', 'weapon', 'armor', 'bodysuit', 'gear', 'equipment'].includes(item.type);
  }

  _getCategoryForItem(item) {
    if (!item) return null;
    if (item.type === 'blaster' || item.type === 'weapon') return 'weapons';
    if (item.type === 'armor' || item.type === 'bodysuit') return 'armor';
    if (item.type === 'gear' || item.type === 'equipment') return 'gear';
    return null;
  }

  _getVisibleCategories() {
    const byCategory = {
      weapons: this.actor.items.filter(item => ['blaster', 'weapon'].includes(item.type) && item.type !== 'lightsaber'),
      armor: this.actor.items.filter(item => ['armor', 'bodysuit'].includes(item.type)),
      gear: this.actor.items.filter(item => ['gear', 'equipment'].includes(item.type))
    };

    return CATEGORY_ORDER
      .map(entry => ({ ...entry, items: byCategory[entry.key] || [] }))
      .filter(entry => entry.items.length > 0);
  }

  _ensureSelection() {
    const categories = this._getVisibleCategories();
    if (!categories.length) {
      this.selectedCategory = null;
      this.selectedItemId = null;
      return { categories, item: null };
    }

    if (!this.selectedCategory || !categories.find(cat => cat.key === this.selectedCategory)) {
      this.selectedCategory = categories[0].key;
    }

    const currentCategory = categories.find(cat => cat.key === this.selectedCategory) || categories[0];
    if (!this.selectedItemId || !currentCategory.items.find(item => item.id === this.selectedItemId)) {
      this.selectedItemId = currentCategory.items[0]?.id ?? null;
    }

    const item = currentCategory.items.find(candidate => candidate.id === this.selectedItemId) || currentCategory.items[0] || null;
    return { categories, item };
  }

  _getCurrentItem() {
    return this.selectedItemId ? this.actor.items.get(this.selectedItemId) : null;
  }

  _getInitialDraft(item) {
    const appliedTemplates = Array.isArray(item.flags?.swse?.appliedTemplates) ? item.flags.swse.appliedTemplates : [];
    const templateKeys = appliedTemplates.map(entry => entry?.templateKey).filter(Boolean);
    const structural = item.flags?.swse?.customizationStructural || { sizeIncreaseApplied: false, strippedAreas: [] };

    if (item.type === 'blaster') {
      return {
        boltColor: item.flags?.swse?.boltColor || DEFAULT_BOLT_COLOR,
        fxType: item.flags?.swse?.fxType || DEFAULT_FX_TYPE,
        selectedUpgrades: Array.isArray(item.flags?.swse?.blasterUpgrades) ? [...item.flags.swse.blasterUpgrades] : [],
        selectedTemplates: [...templateKeys],
        structural: {
          sizeIncreaseApplied: !!structural.sizeIncreaseApplied,
          strippedAreas: Array.isArray(structural.strippedAreas) ? [...structural.strippedAreas] : []
        }
      };
    }

    if (item.type === 'weapon') {
      return {
        accentColor: item.flags?.swse?.accentColor || DEFAULT_MELEE_ACCENT,
        selectedUpgrades: Array.isArray(item.flags?.swse?.meleeUpgrades) ? [...item.flags.swse.meleeUpgrades] : [],
        selectedTemplates: [...templateKeys],
        structural: {
          sizeIncreaseApplied: !!structural.sizeIncreaseApplied,
          strippedAreas: Array.isArray(structural.strippedAreas) ? [...structural.strippedAreas] : []
        }
      };
    }

    if (['armor', 'bodysuit'].includes(item.type)) {
      return {
        tintColor: item.flags?.swse?.tintColor || '#7a3a4a',
        selectedUpgrades: Array.isArray(item.flags?.swse?.armorUpgrades) ? [...item.flags.swse.armorUpgrades] : [],
        selectedTemplates: [...templateKeys],
        structural: {
          sizeIncreaseApplied: !!structural.sizeIncreaseApplied,
          strippedAreas: Array.isArray(structural.strippedAreas) ? [...structural.strippedAreas] : []
        }
      };
    }

    return {
      variant: item.flags?.swse?.variant || DEFAULT_GEAR_VARIANT,
      accentColor: item.flags?.swse?.accentColor || DEFAULT_GEAR_ACCENT,
      selectedUpgrades: Array.isArray(item.flags?.swse?.gearMods) ? [...item.flags.swse.gearMods] : [],
      selectedTemplates: [...templateKeys],
      structural: {
        sizeIncreaseApplied: !!structural.sizeIncreaseApplied,
        strippedAreas: Array.isArray(structural.strippedAreas) ? [...structural.strippedAreas] : []
      }
    };
  }

  _getDraft(item) {
    if (!item) return null;
    if (!this._drafts.has(item.id)) {
      this._drafts.set(item.id, this._getInitialDraft(item));
    }
    return this._drafts.get(item.id);
  }

  _getUpgradeCatalog(item, draft) {
    if (!item || !draft) return [];
    let source = {};
    if (item.type === 'blaster') source = BLASTER_UPGRADES;
    else if (item.type === 'weapon') source = MELEE_UPGRADES;
    else if (['armor', 'bodysuit'].includes(item.type)) source = ARMOR_UPGRADES;
    else source = Object.fromEntries(Object.entries(GEAR_MODS).filter(([, mod]) => mod.compatible.includes(draft.variant || DEFAULT_GEAR_VARIANT)));

    const currentKeys = this._getCurrentAppliedUpgradeKeys(item);
    const baseSlots = Math.max(1, Number(item.system?.upgradeSlots ?? this._getLegacyBaseSlots(item)) || 1)
      + (draft.structural?.sizeIncreaseApplied ? 1 : 0)
      + ((draft.structural?.strippedAreas || []).length);
    const selectedCost = draft.selectedUpgrades.reduce((sum, selectedKey) => {
      const selectedData = source[selectedKey];
      return sum + Number(selectedData?.slotCost ?? 1);
    }, 0);

    return Object.entries(source).map(([key, data]) => {
      const installed = currentKeys.includes(key);
      const selected = draft.selectedUpgrades.includes(key);
      const slotCost = Number(data.slotCost ?? 1);
      const freeSlotsIfAdded = baseSlots - (selected ? selectedCost : selectedCost + slotCost);
      const disabled = (!installed && !selected && freeSlotsIfAdded < 0);
      return {
        key,
        name: data.name,
        description: data.description || '',
        effect: data.effect || '',
        costCredits: Number(data.costCredits ?? 0),
        slotCost,
        installed,
        selected,
        disabled,
        tags: [data.effect].filter(Boolean)
      };
    });
  }

  _getCurrentAppliedUpgradeKeys(item) {
    if (item.type === 'blaster') return Array.isArray(item.flags?.swse?.blasterUpgrades) ? item.flags.swse.blasterUpgrades : [];
    if (item.type === 'weapon') return Array.isArray(item.flags?.swse?.meleeUpgrades) ? item.flags.swse.meleeUpgrades : [];
    if (['armor', 'bodysuit'].includes(item.type)) return Array.isArray(item.flags?.swse?.armorUpgrades) ? item.flags.swse.armorUpgrades : [];
    return Array.isArray(item.flags?.swse?.gearMods) ? item.flags.swse.gearMods : [];
  }

  _getTemplateCards(item, draft) {
    const templates = GearTemplatesEngine.getAvailableTemplates(item);
    const currentApplied = Array.isArray(item.flags?.swse?.appliedTemplates) ? item.flags.swse.appliedTemplates.map(entry => entry?.templateKey).filter(Boolean) : [];
    return templates.map(template => ({
      key: template.key,
      name: template.name,
      description: template.description || '',
      rulesText: Object.values(template.rulesText || {}).join(' '),
      costPreview: Number(template.costPreview ?? 0),
      restriction: template.restriction || 'common',
      rarity: !!template.rarity,
      selected: draft.selectedTemplates.includes(template.key),
      installed: currentApplied.includes(template.key),
      disabled: template.incompatible && !draft.selectedTemplates.includes(template.key),
      disabledReason: template.incompatibilityReason || ''
    }));
  }

  _getStrippableAreas(item, draft) {
    const areas = [];
    const system = item.system || {};
    if (['blaster', 'weapon'].includes(item.type)) {
      areas.push('damage');
      if (item.type === 'blaster' || String(system.weaponSubtype || '').toLowerCase().includes('ranged')) {
        areas.push('range');
      }
      if (!system.isExotic) areas.push('design');
      if (system.stun || system.hasStunSetting) areas.push('stun_setting');
      if (system.autofire || system.hasAutofire) areas.push('autofire');
    }
    if (['armor', 'bodysuit'].includes(item.type)) {
      areas.push('defensive_material', 'joint_protection');
    }

    const current = new Set(item.flags?.swse?.customizationStructural?.strippedAreas || []);
    const draftAreas = new Set(draft.structural?.strippedAreas || []);
    return areas.map(key => ({
      key,
      label: STRUCTURAL_LABELS[key] || key,
      selected: draftAreas.has(key),
      installed: current.has(key),
      disabled: current.has(key)
    }));
  }

  _getSlotState(item, draft) {
    const baseSlots = Math.max(1, Number(item.system?.upgradeSlots ?? this._getLegacyBaseSlots(item)) || 1);
    const currentUpgrades = this._getCurrentAppliedUpgradeKeys(item);
    const currentStructural = item.flags?.swse?.customizationStructural || { sizeIncreaseApplied: false, strippedAreas: [] };
    const currentTemplateCount = (item.flags?.swse?.appliedTemplates || []).length;
    const upgradeCatalog = this._getUpgradeCatalog(item, draft);
    const selectedUpgradeInstances = upgradeCatalog.filter(card => draft.selectedUpgrades.includes(card.key));
    const usedSlots = selectedUpgradeInstances.reduce((sum, card) => sum + (card.slotCost ?? 1), 0);
    const sizeBonus = draft.structural?.sizeIncreaseApplied ? 1 : 0;
    const strippingBonus = Array.isArray(draft.structural?.strippedAreas) ? draft.structural.strippedAreas.length : 0;
    const totalAvailable = baseSlots + sizeBonus + strippingBonus;
    const freeSlots = totalAvailable - usedSlots;
    return {
      baseSlots,
      usedSlots,
      totalAvailable,
      freeSlots,
      isOverflowing: freeSlots < 0,
      currentTemplateCount,
      currentUpgradeCount: currentUpgrades.length,
      sizeIncreaseAlreadyApplied: !!currentStructural.sizeIncreaseApplied
    };
  }

  _getLegacyBaseSlots(item) {
    if (item.type === 'weapon') return 2;
    if (['armor', 'bodysuit'].includes(item.type)) return 3;
    return 1;
  }

  _getPreview(item, draft) {
    const templates = this._getTemplateCards(item, draft);
    const selectedTemplates = templates.filter(card => card.selected);
    const upgrades = this._getUpgradeCatalog(item, draft);
    const selectedUpgrades = upgrades.filter(card => card.selected);
    const currentUpgradeKeys = new Set(this._getCurrentAppliedUpgradeKeys(item));
    const currentTemplateKeys = new Set((item.flags?.swse?.appliedTemplates || []).map(entry => entry?.templateKey).filter(Boolean));
    const baseCost = Number(item.system?.cost ?? 0) || 0;
    const sizeIncreaseCost = draft.structural?.sizeIncreaseApplied && !item.flags?.swse?.customizationStructural?.sizeIncreaseApplied ? baseCost : 0;
    const stripCount = (draft.structural?.strippedAreas || []).filter(area => !(item.flags?.swse?.customizationStructural?.strippedAreas || []).includes(area)).length;
    const stripCost = stripCount * Math.ceil(baseCost * 0.5);
    const newUpgradeCost = selectedUpgrades
      .filter(card => !currentUpgradeKeys.has(card.key))
      .reduce((sum, card) => sum + card.costCredits, 0);
    const newTemplateCost = selectedTemplates
      .filter(card => !currentTemplateKeys.has(card.key))
      .reduce((sum, card) => sum + card.costPreview, 0);
    const totalCost = newUpgradeCost + newTemplateCost + sizeIncreaseCost + stripCost;
    const slotState = this._getSlotState(item, draft);
    return {
      totalCost,
      afterCredits: Math.max(0, (Number(this.actor.system?.credits ?? 0) || 0) - totalCost),
      slotState,
      selectedUpgrades,
      selectedTemplates,
      stripCount,
      sizeIncreaseCost,
      stripCost,
      canApply: !slotState.isOverflowing && LedgerService.validateFunds(this.actor, totalCost).ok,
      maxTemplates: GearTemplatesEngine.getTemplateLimit()
    };
  }

  _getHeroStats(item, preview) {
    const stats = [];
    stats.push({ key: 'Cost', value: `${Number(item.system?.cost ?? 0) || 0} cr` });
    stats.push({ key: 'Slots', value: `${preview.slotState.usedSlots}/${preview.slotState.totalAvailable}` });
    const restriction = String(item.system?.restriction || 'common');
    stats.push({ key: 'Restriction', value: restriction.toUpperCase() });
    const templateCount = (this._getDraft(item)?.selectedTemplates || []).length;
    stats.push({ key: 'Templates', value: `${templateCount}/${GearTemplatesEngine.getTemplateLimit()}` });
    return stats;
  }

  _getMentorText(item) {
    const category = this._getCategoryForItem(item);
    if (category === 'weapons' && item.type === 'blaster') {
      return `Blaster frame on the slab. Tune the bolt package, fit the right internals, and keep an eye on your slot budget before you start bolting on extras.`;
    }
    if (category === 'weapons') {
      return `Close-combat weapons reward restraint. Balance, edge work, and grip discipline matter more than piling on every trick in the catalog.`;
    }
    if (category === 'armor') {
      return `Armor is a platform. Every plate and joint you change trades comfort, protection, or utility somewhere else — check the slot bar before you lock it in.`;
    }
    return `Utility gear is where over-engineering starts. Pick the upgrades that match the job, not the ones that just look clever on the bench.`;
  }

  _getItemSummary(item, draft, preview) {
    const category = this._getCategoryForItem(item);
    const subtitle = item.system?.weaponSubtype || item.system?.armorType || item.system?.subtype || item.type;
    const appearance = [];
    if (item.type === 'blaster') {
      appearance.push({ key: 'Bolt Color', action: 'set-bolt-color', value: draft.boltColor, options: Object.entries(BLASTER_BOLT_COLORS).map(([key, hex]) => ({ key, label: key, hex, selected: draft.boltColor === key })) });
      appearance.push({ key: 'FX Profile', action: 'set-fx-type', value: draft.fxType, variantOptions: Object.entries(BLASTER_FX_TYPES).map(([key, fx]) => ({ key, name: fx.name, description: fx.description, selected: draft.fxType === key })) });
    } else if (item.type === 'weapon') {
      appearance.push({ key: 'Accent', action: 'set-accent', value: draft.accentColor, options: ACCENT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.accentColor === hex })) });
    } else if (['armor', 'bodysuit'].includes(item.type)) {
      appearance.push({ key: 'Tint', action: 'set-tint', value: draft.tintColor, options: TINT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.tintColor === hex })) });
    } else {
      appearance.push({ key: 'Variant', action: 'set-variant', value: draft.variant, variantOptions: Object.entries(GEAR_VARIANTS).map(([key, variant]) => ({ key, name: variant.name, description: variant.description, selected: draft.variant === key })) });
      appearance.push({ key: 'Accent', action: 'set-accent', value: draft.accentColor, options: ACCENT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.accentColor === hex })) });
    }

    return {
      id: item.id,
      name: item.name,
      category,
      subtitle,
      img: item.img,
      description: item.system?.description || item.system?.details || item.system?.shortDescription || '',
      stats: this._getHeroStats(item, preview),
      appearance
    };
  }

  async _prepareContext(options) {
    const { categories, item } = this._ensureSelection();
    const visibleCategories = categories.map(category => ({ ...category, active: category.key === this.selectedCategory, count: category.items.length }));
    if (!item) {
      return { categories: visibleCategories, hasItems: false };
    }

    const draft = this._getDraft(item);
    const preview = this._getPreview(item, draft);
    const currentCategory = categories.find(entry => entry.key === this.selectedCategory);
    const inventoryItems = (currentCategory?.items || [])
      .filter(candidate => !this.search || candidate.name.toLowerCase().includes(this.search.toLowerCase()))
      .map(candidate => {
        const candidateDraft = this._getDraft(candidate);
        const templates = Array.isArray(candidate.flags?.swse?.appliedTemplates) ? candidate.flags.swse.appliedTemplates : [];
        return {
          id: candidate.id,
          name: candidate.name,
          img: candidate.img,
          subtitle: candidate.system?.weaponSubtype || candidate.system?.armorType || candidate.type,
          active: candidate.id === item.id,
          modCount: candidateDraft.selectedUpgrades.length,
          templateCount: candidateDraft.selectedTemplates.length + templates.length,
          equipped: !!candidate.system?.equipped
        };
      });

    return {
      actor: this.actor,
      categories: visibleCategories,
      hasItems: true,
      search: this.search,
      inventoryItems,
      currentItem: this._getItemSummary(item, draft, preview),
      mentorText: this._getMentorText(item),
      upgrades: this._getUpgradeCatalog(item, draft),
      templates: this._getTemplateCards(item, draft),
      structuralActions: {
        sizeIncrease: {
          selected: !!draft.structural?.sizeIncreaseApplied,
          disabled: ['lightsaber', 'droid'].includes(item.type),
          label: 'Increase Size / Bulk',
          description: ['armor', 'bodysuit'].includes(item.type)
            ? 'Increase this armor one weight class heavier for +1 upgrade slot.'
            : 'Increase the item one size step for +1 upgrade slot.'
        },
        strips: this._getStrippableAreas(item, draft)
      },
      footer: {
        credits: Number(this.actor.system?.credits ?? 0) || 0,
        cost: preview.totalCost,
        after: (Number(this.actor.system?.credits ?? 0) || 0) - preview.totalCost,
        slots: preview.slotState,
        slotPercent: preview.slotState.totalAvailable > 0 ? Math.min(100, Math.max(0, Math.round((preview.slotState.usedSlots / preview.slotState.totalAvailable) * 100))) : 0,
        maxTemplatesPerItem: preview.maxTemplates,
        canApply: preview.canApply,
        applyLabel: preview.canApply
          ? (preview.totalCost > 0 ? `Apply (${preview.totalCost} cr)` : 'Apply')
          : (preview.slotState.isOverflowing ? 'Slot Overflow' : 'Insufficient Credits')
      }
    };
  }

  wireEvents() {
    this.onRoot('click', '[data-action="select-category"]', async (event, target) => {
      event.preventDefault();
      this.selectedCategory = target.dataset.category;
      this.selectedItemId = null;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="select-item"]', async (event, target) => {
      event.preventDefault();
      this.selectedItemId = target.dataset.itemId;
      await this.render({ force: true });
    });

    this.onRoot('input', '[data-action="search-items"]', async (event, target) => {
      this.search = target.value || '';
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="toggle-upgrade"]', async (event, target) => {
      event.preventDefault();
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      const currentInstalled = this._getCurrentAppliedUpgradeKeys(item);
      if (currentInstalled.includes(key)) return;
      const idx = draft.selectedUpgrades.indexOf(key);
      if (idx >= 0) draft.selectedUpgrades.splice(idx, 1);
      else draft.selectedUpgrades.push(key);
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="toggle-template"]', async (event, target) => {
      event.preventDefault();
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      const currentlyApplied = Array.isArray(item.flags?.swse?.appliedTemplates) ? item.flags.swse.appliedTemplates.map(entry => entry?.templateKey) : [];
      if (currentlyApplied.includes(key)) return;
      const idx = draft.selectedTemplates.indexOf(key);
      if (idx >= 0) draft.selectedTemplates.splice(idx, 1);
      else {
        const validation = GearTemplatesEngine.canApplyTemplate(item, key);
        if (!validation.valid) {
          ui.notifications.warn(validation.reason);
          return;
        }
        draft.selectedTemplates = [key, ...draft.selectedTemplates.filter(Boolean)].slice(0, GearTemplatesEngine.getTemplateLimit());
      }
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="toggle-size-increase"]', async (event) => {
      event.preventDefault();
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      draft.structural.sizeIncreaseApplied = !draft.structural.sizeIncreaseApplied;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="toggle-strip"]', async (event, target) => {
      event.preventDefault();
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      const current = new Set(item.flags?.swse?.customizationStructural?.strippedAreas || []);
      if (current.has(key)) return;
      const idx = draft.structural.strippedAreas.indexOf(key);
      if (idx >= 0) draft.structural.strippedAreas.splice(idx, 1);
      else draft.structural.strippedAreas.push(key);
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="set-bolt-color"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.boltColor = target.dataset.key;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="set-fx-type"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.fxType = target.dataset.key;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="set-accent"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.accentColor = target.dataset.key;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="set-tint"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.tintColor = target.dataset.key;
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="set-variant"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.variant = target.dataset.key;
      draft.selectedUpgrades = draft.selectedUpgrades.filter(key => {
        const mod = GEAR_MODS[key];
        return mod?.compatible?.includes(draft.variant);
      });
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="reset-item"]', async (event) => {
      event.preventDefault();
      const item = this._getCurrentItem();
      this._drafts.set(item.id, this._getInitialDraft(item));
      await this.render({ force: true });
    });

    this.onRoot('click', '[data-action="close-workbench"]', (event) => {
      event.preventDefault();
      this.close();
    });

    this.onRoot('click', '[data-action="apply-item"]', async (event) => {
      event.preventDefault();
      await this.#applyCurrentItem();
    });
  }

  async #applyCurrentItem() {
    const item = this._getCurrentItem();
    const draft = this._getDraft(item);
    const preview = this._getPreview(item, draft);
    if (!preview.canApply) {
      ui.notifications.warn(preview.slotState.isOverflowing ? 'This configuration exceeds available upgrade slots.' : 'Insufficient credits.');
      return;
    }

    const itemUpdate = {
      _id: item.id,
      'flags.swse.modifiedAt': game.time?.worldTime ?? Date.now(),
      'flags.swse.modifiedBy': this.actor.id,
      'flags.swse.appliedTemplates': draft.selectedTemplates.map((templateKey, index) => ({
        templateKey,
        appliedAt: game.time?.worldTime ?? Date.now(),
        costPaid: GearTemplatesEngine.getTemplateCost(templateKey, item),
        stackOrder: index
      })),
      'flags.swse.customizationStructural': {
        sizeIncreaseApplied: !!draft.structural.sizeIncreaseApplied,
        strippedAreas: [...(draft.structural.strippedAreas || [])]
      }
    };

    if (item.type === 'blaster') {
      itemUpdate['flags.swse.boltColor'] = draft.boltColor;
      itemUpdate['flags.swse.fxType'] = draft.fxType;
      itemUpdate['flags.swse.blasterUpgrades'] = [...draft.selectedUpgrades];
    } else if (item.type === 'weapon') {
      itemUpdate['flags.swse.meleeUpgrades'] = [...draft.selectedUpgrades];
      itemUpdate['flags.swse.accentColor'] = draft.accentColor;
    } else if (['armor', 'bodysuit'].includes(item.type)) {
      itemUpdate['flags.swse.armorUpgrades'] = [...draft.selectedUpgrades];
      itemUpdate['flags.swse.tintColor'] = draft.tintColor;
    } else {
      itemUpdate['flags.swse.gearMods'] = [...draft.selectedUpgrades];
      itemUpdate['flags.swse.variant'] = draft.variant;
      itemUpdate['flags.swse.accentColor'] = draft.accentColor;
    }

    try {
      await ActorEngine.updateOwnedItems(this.actor, [itemUpdate]);
      if (preview.totalCost > 0) {
        const creditPlan = LedgerService.buildCreditDelta(this.actor, preview.totalCost);
        await ActorEngine.applyMutationPlan(this.actor, creditPlan, { source: 'ItemCustomizationWorkbench.apply' });
      }
      if (item.type === 'blaster') {
        await BlasterCustomizationEngine.apply(this.actor, this.actor.items.get(item.id) || item, {
          boltColor: draft.boltColor,
          fxType: draft.fxType
        });
      }
      ui.notifications.info(`${item.name} customization applied.`);
      this._drafts.set(item.id, this._getInitialDraft(this.actor.items.get(item.id) || item));
      await this.render({ force: true });
    } catch (error) {
      console.error('[ItemCustomizationWorkbench] Apply failed', error);
      ui.notifications.error(`Failed to apply customization: ${error.message}`);
    }
  }
}
