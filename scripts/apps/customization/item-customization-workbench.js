import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { GearTemplatesEngine } from "/systems/foundryvtt-swse/scripts/apps/gear-templates-engine.js";
import { BLASTER_BOLT_COLORS, BLASTER_FX_TYPES, DEFAULT_BOLT_COLOR, DEFAULT_FX_TYPE } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";
import { BLASTER_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/blaster-upgrades.js";
import { MELEE_UPGRADES, MELEE_ACCENT_COLORS, DEFAULT_MELEE_ACCENT } from "/systems/foundryvtt-swse/scripts/data/melee-upgrades.js";
import { ARMOR_UPGRADES } from "/systems/foundryvtt-swse/scripts/data/armor-upgrades.js";
import { GEAR_MODS, GEAR_VARIANTS, DEFAULT_GEAR_VARIANT, DEFAULT_GEAR_ACCENT } from "/systems/foundryvtt-swse/scripts/data/gear-mods.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";
import { BLADE_COLOR_MAP, VARIES_COLOR_LIST, DEFAULT_BLADE_COLOR } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/item-profile-resolver.js";
import { CustomizationCostEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/customization-cost-engine.js";
import { UpgradeSlotEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/upgrade-slot-engine.js";
import { SafetyEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js";

const APP_ID = 'swse-item-customization-workbench';
const CATEGORY_ORDER = [
  { key: 'weapons', label: 'Weapons', icon: '⚔' },
  { key: 'armor', label: 'Armor', icon: '⛨' },
  { key: 'gear', label: 'Gear', icon: '◇' },
  { key: 'lightsaber', label: 'Lightsaber', icon: '✦', special: true }
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
  constructor(actor, { itemId = null, category = null, mode = 'owned', sourceItem = null, applyMode = null, onStage = null } = {}) {
    super({});
    this.actor = actor;
    this.mode = mode;
    this.applyMode = applyMode || (mode === 'store-stage' ? 'stage-to-cart' : 'apply-owned');
    this.sourceItem = sourceItem || null;
    this.onStage = typeof onStage === 'function' ? onStage : null;
    this.selectedCategory = category;
    this.selectedItemId = itemId;
    this._selectedByCategory = new Map();
    if (category && itemId) this._selectedByCategory.set(category, itemId);
    this._searchByCategory = new Map();
    this.search = '';
    this._searchRenderTimer = null;
    this._pendingApply = false;
    this._uiRestoreState = null;
    this._profileResolver = new ItemProfileResolver();
    this._costEngine = new CustomizationCostEngine(this._profileResolver);
    this._slotEngine = new UpgradeSlotEngine(this._profileResolver);
    this._drafts = new Map();
    this._catalogs = { chassis: [], crystals: [], accessories: [] };
    this._lightsaber = {
      selectedChassisId: null,
      selectedCrystalId: null,
      selectedAccessoryIds: [],
      selectedBladeColor: DEFAULT_BLADE_COLOR,
      selectedCheckMode: 'roll',
      selectedOwnedSaberId: itemId || null
    };
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
    return ['blaster', 'weapon', 'armor', 'bodysuit', 'gear', 'equipment', 'lightsaber'].includes(item.type) || LightsaberConstructionEngine.isLightsaberItem(item);
  }


  _stripHtml(value) {
    const text = String(value ?? '');
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  _getItemBaseCost(item) {
    const finalCost = Number(item?.finalCost);
    if (this._isStoreStageMode() && Number.isFinite(finalCost) && finalCost >= 0) return finalCost;
    try { return this._costEngine.getBaseCost(item); }
    catch { return Number(item?.system?.cost ?? 0) || 0; }
  }

  _getCustomizationState(item) {
    try { return this._slotEngine.getCustomizationState(item); }
    catch { return SafetyEngine.normalizeCustomizationState(item).normalizedState; }
  }

  _getCanonicalInstalledUpgradeKeys(item) {
    const state = this._getCustomizationState(item);
    const canonical = Array.isArray(state.installedUpgrades)
      ? state.installedUpgrades.map(entry => entry?.upgradeKey).filter(Boolean)
      : [];
    const legacy = this._getLegacyAppliedUpgradeKeys(item);
    return [...new Set([...canonical, ...legacy])];
  }

  _getLegacyAppliedUpgradeKeys(item) {
    if (!item) return [];
    if (item.type === 'blaster') return Array.isArray(item.flags?.swse?.blasterUpgrades) ? item.flags.swse.blasterUpgrades : [];
    if (item.type === 'weapon') return Array.isArray(item.flags?.swse?.meleeUpgrades) ? item.flags.swse.meleeUpgrades : [];
    if (['armor', 'bodysuit'].includes(item.type)) return Array.isArray(item.flags?.swse?.armorUpgrades) ? item.flags.swse.armorUpgrades : [];
    return Array.isArray(item.flags?.swse?.gearMods) ? item.flags.swse.gearMods : [];
  }

  _getCanonicalTemplateKeys(item) {
    const state = this._getCustomizationState(item);
    const canonical = Array.isArray(state.appliedTemplates)
      ? state.appliedTemplates.map(entry => entry?.templateKey).filter(Boolean)
      : [];
    const legacy = Array.isArray(item?.flags?.swse?.appliedTemplates)
      ? item.flags.swse.appliedTemplates.map(entry => entry?.templateKey).filter(Boolean)
      : [];
    return [...new Set([...canonical, ...legacy])];
  }

  _getSelectedUpgradeInstances(item, draft) {
    const catalog = this._getUpgradeCatalog(item, draft);
    return (draft?.selectedUpgrades || [])
      .map(key => catalog.find(card => card.key === key))
      .filter(Boolean);
  }

  _getDraftCustomizationState(item, draft, preview = null) {
    const prior = this._getCustomizationState(item);
    const installedByKey = new Map();
    for (const entry of prior.installedUpgrades || []) {
      if (entry?.upgradeKey) installedByKey.set(entry.upgradeKey, foundry.utils.deepClone(entry));
    }
    for (const card of this._getSelectedUpgradeInstances(item, draft)) {
      installedByKey.set(card.key, {
        instanceId: installedByKey.get(card.key)?.instanceId || foundry.utils.randomID(),
        upgradeKey: card.key,
        name: card.name,
        slotCost: Number(card.slotCost ?? 1) || 1,
        operationCost: Number(card.costCredits ?? 0) || 0,
        source: 'item-customization-workbench'
      });
    }

    const templatesByKey = new Map();
    for (const entry of prior.appliedTemplates || []) {
      if (entry?.templateKey) templatesByKey.set(entry.templateKey, foundry.utils.deepClone(entry));
    }
    for (const templateKey of draft.selectedTemplates || []) {
      templatesByKey.set(templateKey, {
        instanceId: templatesByKey.get(templateKey)?.instanceId || foundry.utils.randomID(),
        templateKey,
        operationCost: GearTemplatesEngine.getTemplateCost(templateKey, item),
        stackOrder: templatesByKey.size,
        source: 'item-customization-workbench'
      });
    }

    return {
      structural: {
        sizeIncreaseApplied: !!draft.structural?.sizeIncreaseApplied,
        strippedAreas: [...new Set(draft.structural?.strippedAreas || [])]
      },
      installedUpgrades: [...installedByKey.values()],
      appliedTemplates: [...templatesByKey.values()].map((entry, index) => ({ ...entry, stackOrder: index })),
      operationLog: [
        ...(Array.isArray(prior.operationLog) ? prior.operationLog : []),
        {
          id: foundry.utils.randomID(),
          type: this._isStoreStageMode() ? 'stage_customization' : 'apply_customization',
          timestamp: Date.now(),
          appliedBy: this.actor?.id,
          details: {
            itemId: item?.id,
            cost: Number(preview?.totalCost ?? 0) || 0,
            mode: this.mode
          }
        }
      ]
    };
  }

  _validateDraft(item, draft, preview) {
    if (!item || !draft || !preview) return { ok: false, reason: 'missing_item_or_draft' };
    if (preview.slotState.isOverflowing) return { ok: false, reason: 'slot_overflow' };
    if (!LedgerService.validateFunds(this.actor, preview.totalCost).ok) return { ok: false, reason: 'insufficient_credits' };
    const category = this._getCategoryForItem(item);
    if (!['weapons', 'armor', 'gear'].includes(category)) return { ok: false, reason: 'unsupported_category' };
    if ((draft.selectedUpgrades || []).length !== new Set(draft.selectedUpgrades || []).size) return { ok: false, reason: 'duplicate_upgrade' };
    if ((draft.selectedTemplates || []).length !== new Set(draft.selectedTemplates || []).size) return { ok: false, reason: 'duplicate_template' };
    if ((draft.selectedTemplates || []).length > GearTemplatesEngine.getTemplateLimit()) return { ok: false, reason: 'template_limit' };
    for (const key of draft.selectedTemplates || []) {
      const validation = GearTemplatesEngine.canApplyTemplate(item, key);
      const installed = this._getCanonicalTemplateKeys(item).includes(key);
      if (!installed && !validation.valid) return { ok: false, reason: validation.reason || `template_blocked:${key}` };
    }
    const safety = SafetyEngine.normalizeCustomizationState(item);
    if (!safety.success) return { ok: false, reason: 'state_normalization_failed' };
    return { ok: true };
  }

  _getCategoryForItem(item) {
    if (!item) return null;
    if (LightsaberConstructionEngine.isLightsaberItem(item)) return 'lightsaber';
    if (item.type === 'blaster' || item.type === 'weapon') return 'weapons';
    if (item.type === 'armor' || item.type === 'bodysuit') return 'armor';
    if (item.type === 'gear' || item.type === 'equipment') return 'gear';
    return null;
  }

  _getVisibleCategories() {
    const byCategory = {
      weapons: this.actor.items.filter(item => ['blaster', 'weapon'].includes(item.type) && !LightsaberConstructionEngine.isLightsaberItem(item)),
      armor: this.actor.items.filter(item => ['armor', 'bodysuit'].includes(item.type)),
      gear: this.actor.items.filter(item => ['gear', 'equipment'].includes(item.type)),
      lightsaber: LightsaberConstructionEngine.getOwnedLightsabers(this.actor)
    };

    if (this.sourceItem && this._isStoreStageMode()) {
      const sourceCategory = this._getCategoryForItem(this.sourceItem);
      for (const key of Object.keys(byCategory)) byCategory[key] = [];
      if (sourceCategory && byCategory[sourceCategory]) byCategory[sourceCategory] = [this.sourceItem];
    }

    return CATEGORY_ORDER
      .map(entry => ({ ...entry, items: byCategory[entry.key] || [] }))
      .filter(entry => entry.items.length > 0 || entry.key === 'lightsaber');
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
    this.search = this._getSearchForCategory(this.selectedCategory);

    if (this.selectedCategory === 'lightsaber') {
      const rememberedSaber = this._selectedByCategory.get('lightsaber');
      if (!this._lightsaber.selectedOwnedSaberId && rememberedSaber) this._lightsaber.selectedOwnedSaberId = rememberedSaber;
      if (this._lightsaber.selectedOwnedSaberId && !currentCategory.items.find(item => item.id === this._lightsaber.selectedOwnedSaberId)) {
        this._lightsaber.selectedOwnedSaberId = null;
      }
      return { categories, item: this._lightsaber.selectedOwnedSaberId ? this.actor.items.get(this._lightsaber.selectedOwnedSaberId) : null };
    }

    const remembered = this._selectedByCategory.get(this.selectedCategory);
    if (!this.selectedItemId && remembered) this.selectedItemId = remembered;
    if (!this.selectedItemId || !currentCategory.items.find(item => item.id === this.selectedItemId)) {
      this.selectedItemId = currentCategory.items[0]?.id ?? null;
    }
    this._rememberSelectedItem(this.selectedCategory, this.selectedItemId);

    const item = currentCategory.items.find(candidate => candidate.id === this.selectedItemId) || currentCategory.items[0] || null;
    return { categories, item };
  }

  _getCurrentItem() {
    if (this.selectedCategory === 'lightsaber') {
      return this._lightsaber.selectedOwnedSaberId ? this.actor.items.get(this._lightsaber.selectedOwnedSaberId) : null;
    }
    if (this.sourceItem && this.mode === 'store-stage' && this.selectedItemId === this.sourceItem.id) return this.sourceItem;
    return this.selectedItemId ? this.actor.items.get(this.selectedItemId) : null;
  }

  _isStoreStageMode() {
    return this.applyMode === 'stage-to-cart' || this.mode === 'store-stage';
  }

  _getInitialDraft(item) {
    const canonicalState = this._getCustomizationState(item);
    const templateKeys = this._getCanonicalTemplateKeys(item);
    const structural = item.flags?.swse?.customizationStructural || canonicalState.structural || { sizeIncreaseApplied: false, strippedAreas: [] };

    if (item.type === 'blaster') {
      return {
        boltColor: item.flags?.swse?.boltColor || DEFAULT_BOLT_COLOR,
        fxType: item.flags?.swse?.fxType || DEFAULT_FX_TYPE,
        selectedUpgrades: this._getCanonicalInstalledUpgradeKeys(item),
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
        selectedUpgrades: this._getCanonicalInstalledUpgradeKeys(item),
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
        selectedUpgrades: this._getCanonicalInstalledUpgradeKeys(item),
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
      selectedUpgrades: this._getCanonicalInstalledUpgradeKeys(item),
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

    const currentKeys = this._getCanonicalInstalledUpgradeKeys(item);
    const stockSlotState = this._slotEngine.getFullSlotState(item);
    const baseSlots = Math.max(1, Number(item.system?.upgradeSlots ?? stockSlotState?.slots?.stockBase ?? this._getLegacyBaseSlots(item)) || 1)
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
    return this._getCanonicalInstalledUpgradeKeys(item);
  }

  _getTemplateCards(item, draft) {
    const templates = GearTemplatesEngine.getAvailableTemplates(item);
    const currentApplied = this._getCanonicalTemplateKeys(item);
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
    const stockSlotState = this._slotEngine.getFullSlotState(item);
    const baseSlots = Math.max(1, Number(item.system?.upgradeSlots ?? stockSlotState?.slots?.stockBase ?? this._getLegacyBaseSlots(item)) || 1);
    const currentUpgrades = this._getCanonicalInstalledUpgradeKeys(item);
    const currentStructural = item.flags?.swse?.customizationStructural || this._getCustomizationState(item).structural || { sizeIncreaseApplied: false, strippedAreas: [] };
    const currentTemplateCount = this._getCanonicalTemplateKeys(item).length;
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
    const currentUpgradeKeys = new Set(this._getCanonicalInstalledUpgradeKeys(item));
    const currentTemplateKeys = new Set(this._getCanonicalTemplateKeys(item));
    const currentState = this._getCustomizationState(item);
    const baseCost = this._getItemBaseCost(item);
    const sizeIncreaseCost = draft.structural?.sizeIncreaseApplied && !currentState.structural?.sizeIncreaseApplied ? this._costEngine.getSizeIncreaseOperationCost(item) : 0;
    const stripCount = (draft.structural?.strippedAreas || []).filter(area => !(currentState.structural?.strippedAreas || []).includes(area)).length;
    const stripCost = stripCount * this._costEngine.getStripOperationCost(item);
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
      description: this._stripHtml(item.system?.description || item.system?.details || item.system?.shortDescription || ''),
      stats: this._getHeroStats(item, preview),
      appearance
    };
  }

  async _prepareContext(options) {
    this._catalogs = await LightsaberConstructionEngine.getCatalogOptions();
    this._hydrateLightsaberDefaults();
    const shellContext = ThemeResolutionService.buildSurfaceContext({ actor: this.actor });
    const { categories, item } = this._ensureSelection();
    const visibleCategories = categories.map(category => ({ ...category, active: category.key === this.selectedCategory, count: category.items.length, special: category.special }));
    if (this.selectedCategory === 'lightsaber') {
      return { ...shellContext, ...(await this._prepareLightsaberContext(visibleCategories)) };
    }
    if (!item) {
      return { ...shellContext, actor: this.actor, categories: visibleCategories, hasItems: false, isStoreStageMode: this._isStoreStageMode() };
    }

    const draft = this._getDraft(item);
    const preview = this._getPreview(item, draft);
    const currentCategory = categories.find(entry => entry.key === this.selectedCategory);
    const currentSearch = this._getSearchForCategory(this.selectedCategory);
    const inventoryItems = (currentCategory?.items || [])
      .filter(candidate => !currentSearch || candidate.name.toLowerCase().includes(currentSearch.toLowerCase()))
      .map(candidate => {
        const candidateDraft = this._getDraft(candidate);
        const templates = this._getCanonicalTemplateKeys(candidate);
        return {
          id: candidate.id,
          name: candidate.name,
          img: candidate.img,
          subtitle: candidate.system?.weaponSubtype || candidate.system?.armorType || candidate.type,
          active: candidate.id === item.id,
          modCount: candidateDraft.selectedUpgrades.length,
          templateCount: new Set([...(candidateDraft.selectedTemplates || []), ...templates]).size,
          equipped: !!candidate.system?.equipped
        };
      });

    return {
      ...shellContext,
      actor: this.actor,
      categories: visibleCategories,
      hasItems: true,
      search: currentSearch,
      hasSearch: !!currentSearch,
      hasInventoryResults: inventoryItems.length > 0,
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
      isStoreStageMode: this._isStoreStageMode(),
      footer: {
        credits: Number(this.actor.system?.credits ?? 0) || 0,
        cost: preview.totalCost,
        after: (Number(this.actor.system?.credits ?? 0) || 0) - preview.totalCost,
        slots: preview.slotState,
        slotPercent: preview.slotState.totalAvailable > 0 ? Math.min(100, Math.max(0, Math.round((preview.slotState.usedSlots / preview.slotState.totalAvailable) * 100))) : 0,
        maxTemplatesPerItem: preview.maxTemplates,
        canApply: preview.canApply,
        blockedReason: preview.canApply ? null : (preview.slotState.isOverflowing ? 'Available upgrade slots exceeded.' : 'Insufficient credits for this staged work.'),
        applyLabel: preview.canApply
          ? (this._isStoreStageMode() ? (preview.totalCost > 0 ? `Stage to Cart (+${preview.totalCost} cr)` : 'Stage to Cart') : (preview.totalCost > 0 ? `Apply (${preview.totalCost} cr)` : 'Apply'))
          : (preview.slotState.isOverflowing ? 'Slot Overflow' : 'Insufficient Credits')
      }
    };
  }

  wireEvents() {
    this.onRoot('click', '[data-action="select-category"]', async (event, target) => {
      event.preventDefault();
      this._rememberSelectedItem();
      this.selectedCategory = target.dataset.category;
      this.search = this._getSearchForCategory(this.selectedCategory);
      if (this.selectedCategory !== 'lightsaber') this.selectedItemId = this._selectedByCategory.get(this.selectedCategory) || null;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="select-item"]', async (event, target) => {
      event.preventDefault();
      if (this.selectedCategory === 'lightsaber') {
        this._lightsaber.selectedOwnedSaberId = target.dataset.itemId;
        this._rememberSelectedItem('lightsaber', target.dataset.itemId);
      } else {
        this.selectedItemId = target.dataset.itemId;
        this._rememberSelectedItem(this.selectedCategory, target.dataset.itemId);
      }
      await this._renderPreservingUi();
    });

    this.onRoot('input', '[data-action="search-items"]', (event, target) => {
      this._setSearchForCategory(this.selectedCategory, target.value || '');
      window.clearTimeout(this._searchRenderTimer);
      this._searchRenderTimer = window.setTimeout(() => this._renderPreservingUi(), 140);
    });

    this.onRoot('click', '[data-action="reset-filter"]', async (event) => {
      event.preventDefault();
      this._setSearchForCategory(this.selectedCategory, '');
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-upgrade"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      const currentInstalled = this._getCurrentAppliedUpgradeKeys(item);
      if (currentInstalled.includes(key)) return;
      const idx = draft.selectedUpgrades.indexOf(key);
      if (idx >= 0) draft.selectedUpgrades.splice(idx, 1);
      else draft.selectedUpgrades.push(key);
      await this._renderPreservingUi();
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
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-size-increase"]', async (event) => {
      event.preventDefault();
      if (event.currentTarget?.disabled || event.target?.closest?.('button')?.disabled) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const currentState = this._getCustomizationState(item);
      if (currentState.structural?.sizeIncreaseApplied) return;
      draft.structural.sizeIncreaseApplied = !draft.structural.sizeIncreaseApplied;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-strip"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      const current = new Set(item.flags?.swse?.customizationStructural?.strippedAreas || []);
      if (current.has(key)) return;
      const idx = draft.structural.strippedAreas.indexOf(key);
      if (idx >= 0) draft.structural.strippedAreas.splice(idx, 1);
      else draft.structural.strippedAreas.push(key);
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-bolt-color"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.boltColor = target.dataset.key;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-fx-type"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.fxType = target.dataset.key;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-accent"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.accentColor = target.dataset.key;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-tint"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.tintColor = target.dataset.key;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-variant"]', async (event, target) => {
      event.preventDefault();
      const draft = this._getDraft(this._getCurrentItem());
      draft.variant = target.dataset.key;
      draft.selectedUpgrades = draft.selectedUpgrades.filter(key => {
        const mod = GEAR_MODS[key];
        return mod?.compatible?.includes(draft.variant);
      });
      await this._renderPreservingUi();
    });



    this.onRoot('click', '[data-action="select-lightsaber-chassis"]', async (event, target) => {
      event.preventDefault();
      this._lightsaber.selectedChassisId = target.dataset.key;
      this._lightsaber.selectedAccessoryIds = this._lightsaber.selectedAccessoryIds.filter(id => this._isLightsaberAccessoryCompatible(id));
      if (!this._isLightsaberCrystalCompatible(this._lightsaber.selectedCrystalId)) {
        const firstCompatible = this._catalogs.crystals.find(option => this._isLightsaberCrystalCompatible(option.id));
        this._lightsaber.selectedCrystalId = firstCompatible?.id || this._catalogs.crystals[0]?.id || null;
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="select-lightsaber-crystal"]', async (event, target) => {
      event.preventDefault();
      if (target.classList.contains('disabled')) return;
      if (!this._isLightsaberCrystalCompatible(target.dataset.key)) {
        ui.notifications.warn('That crystal is not compatible with the selected chassis.');
        return;
      }
      this._lightsaber.selectedCrystalId = target.dataset.key;
      const crystal = this._catalogs.crystals.find(option => option.id === target.dataset.key || option._id === target.dataset.key);
      const preferred = this._resolveBladeColorOptions(crystal)[0];
      if (preferred) this._lightsaber.selectedBladeColor = preferred;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-lightsaber-accessory"]', async (event, target) => {
      event.preventDefault();
      const id = target.dataset.key;
      if (target.classList.contains('disabled') || !this._isLightsaberAccessoryCompatible(id)) {
        ui.notifications.warn('That accessory is not compatible with the selected chassis.');
        return;
      }
      const ids = this._lightsaber.selectedAccessoryIds;
      const idx = ids.indexOf(id);
      if (idx >= 0) ids.splice(idx, 1);
      else {
        const accessory = this._findLightsaberCatalogOption('accessories', id);
        const slotCost = Number(accessory?.system?.lightsaber?.upgradeSlots ?? accessory?.system?.upgradeSlots ?? 1) || 1;
        const current = this._getLightsaberAccessorySlotState();
        if ((current.usedSlots + slotCost) > current.totalAvailable) {
          ui.notifications.warn('That accessory exceeds this hilt slot budget.');
          return;
        }
        ids.push(id);
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-lightsaber-color"]', async (event, target) => {
      event.preventDefault();
      this._lightsaber.selectedBladeColor = target.dataset.key;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-lightsaber-check-mode"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const mode = target.dataset.key;
      if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="reset-item"]', async (event) => {
      event.preventDefault();
      if (this.selectedCategory === 'lightsaber') {
        const editItem = this._lightsaber.selectedOwnedSaberId ? this.actor.items.get(this._lightsaber.selectedOwnedSaberId) : null;
        this._lightsaber.selectedChassisId = null;
        this._lightsaber.selectedCrystalId = null;
        this._lightsaber.selectedAccessoryIds = [];
        this._lightsaber.selectedBladeColor = DEFAULT_BLADE_COLOR;
        this._lightsaber.selectedCheckMode = 'roll';
        if (editItem) this._lightsaber.selectedOwnedSaberId = editItem.id;
        this._hydrateLightsaberDefaults();
      } else {
        const item = this._getCurrentItem();
        if (item) this._drafts.set(item.id, this._getInitialDraft(item));
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="close-workbench"]', (event) => {
      event.preventDefault();
      this.close();
    });

    this.onRoot('click', '[data-action="apply-item"]', async (event) => {
      event.preventDefault();
      if (this._pendingApply) return;
      await this.#applyCurrentItem();
    });
  }



  _hydrateLightsaberDefaults() {
    const ls = this._lightsaber;
    const editItem = ls.selectedOwnedSaberId ? this.actor.items.get(ls.selectedOwnedSaberId) : null;
    if (editItem && LightsaberConstructionEngine.isLightsaberItem(editItem)) {
      const editState = LightsaberConstructionEngine.getEditState(editItem);
      ls.selectedChassisId ||= editState.chassisId || editItem.system?.chassisId || this._catalogs.chassis[0]?.id || null;
      ls.selectedCrystalId ||= editState.crystalId || this._catalogs.crystals.find(cr => /ilum/i.test(cr.name))?.id || this._catalogs.crystals[0]?.id || null;
      if (!ls.selectedAccessoryIds.length && Array.isArray(editState.accessoryIds)) ls.selectedAccessoryIds = [...editState.accessoryIds];
      ls.selectedBladeColor ||= editState.bladeColor || DEFAULT_BLADE_COLOR;
      return;
    }
    ls.selectedChassisId ||= this._catalogs.chassis.find(ch => ch.system?.chassisId === 'standard')?.id || this._catalogs.chassis[0]?.id || null;
    ls.selectedCrystalId ||= this._catalogs.crystals.find(cr => /ilum/i.test(cr.name))?.id || this._catalogs.crystals[0]?.id || null;
    ls.selectedBladeColor ||= DEFAULT_BLADE_COLOR;
  }

  _findLightsaberCatalogOption(type, id) {
    const list = this._catalogs[type] || [];
    return list.find(option => option.id === id || option._id === id || option.system?.chassisId === id) || null;
  }

  _resolveBladeColorOptions(crystal) {
    const raw = String(crystal?.system?.lightsaber?.bladeColor || crystal?.bladeColor || 'varies').toLowerCase();
    if (!raw || raw === 'varies' || raw.includes('varies')) return VARIES_COLOR_LIST;
    const options = raw.split(/\s+or\s+|\//i).map(part => part.trim()).filter(Boolean);
    return options.length ? options : VARIES_COLOR_LIST;
  }


  _getSelectedLightsaberChassisId() {
    const chassis = this._findLightsaberCatalogOption('chassis', this._lightsaber.selectedChassisId);
    return chassis?.system?.chassisId || chassis?.id || this._lightsaber.selectedChassisId;
  }

  _isLightsaberCrystalCompatible(id) {
    const crystal = this._findLightsaberCatalogOption('crystals', id);
    if (!crystal) return false;
    const compatible = crystal.system?.lightsaber?.compatibleChassis || crystal.compatibleChassis || [];
    if (!Array.isArray(compatible) || !compatible.length || compatible.includes('*')) return true;
    return compatible.includes(this._getSelectedLightsaberChassisId());
  }

  _isLightsaberAccessoryCompatible(id) {
    const accessory = this._findLightsaberCatalogOption('accessories', id);
    if (!accessory) return false;
    const compatible = accessory.system?.lightsaber?.compatibleChassis || accessory.compatibleChassis || [];
    if (!Array.isArray(compatible) || !compatible.length || compatible.includes('*')) return true;
    return compatible.includes(this._getSelectedLightsaberChassisId());
  }

  _getLightsaberConfig() {
    return {
      chassisItemId: this._lightsaber.selectedChassisId,
      crystalItemId: this._lightsaber.selectedCrystalId,
      accessoryItemIds: [...this._lightsaber.selectedAccessoryIds],
      bladeColor: this._lightsaber.selectedBladeColor,
      checkMode: this._lightsaber.selectedCheckMode
    };
  }

  _getLightsaberAccessorySlotState() {
    const selected = this._lightsaber.selectedAccessoryIds
      .map(id => this._findLightsaberCatalogOption('accessories', id))
      .filter(Boolean);
    const usedSlots = selected.reduce((sum, accessory) => sum + Number(accessory.system?.lightsaber?.upgradeSlots ?? accessory.system?.upgradeSlots ?? 1), 0);
    const chassis = this._findLightsaberCatalogOption('chassis', this._lightsaber.selectedChassisId);
    const totalAvailable = Number(chassis?.system?.upgradeSlots ?? chassis?.system?.lightsaber?.upgradeSlots ?? 3) || 3;
    return { usedSlots, totalAvailable, freeSlots: totalAvailable - usedSlots, isOverflowing: usedSlots > totalAvailable };
  }


  _normalizeLightsaberHiltKind(chassis) {
    const raw = String(chassis?.system?.chassisId || chassis?.id || '').toLowerCase();
    if (raw.includes('double')) return 'double';
    if (raw.includes('crossguard')) return 'crossguard';
    if (raw.includes('short') || raw.includes('shoto')) return 'short';
    if (raw.includes('pike') || raw.includes('longhandle')) return 'pike';
    if (raw.includes('lightwhip')) return 'lightwhip';
    if (raw.includes('curved') || raw.includes('dueling') || raw.includes('lightfoil')) return 'curved';
    if (raw.includes('tech')) return 'tech';
    return 'standard';
  }

  async _prepareLightsaberContext(visibleCategories) {
    const ownedSabers = LightsaberConstructionEngine.getOwnedLightsabers(this.actor);
    const editItem = this._lightsaber.selectedOwnedSaberId ? this.actor.items.get(this._lightsaber.selectedOwnedSaberId) : null;
    const chassis = this._findLightsaberCatalogOption('chassis', this._lightsaber.selectedChassisId);
    const crystal = this._findLightsaberCatalogOption('crystals', this._lightsaber.selectedCrystalId);
    const slotState = this._getLightsaberAccessorySlotState();
    const colorOptions = this._resolveBladeColorOptions(crystal).map(key => ({ key, label: key, hex: BLADE_COLOR_MAP[key] || '#00ffff', selected: key === this._lightsaber.selectedBladeColor }));
    const config = this._getLightsaberConfig();
    const preview = chassis && crystal ? await LightsaberConstructionEngine.getBuildPreview(this.actor, config) : null;
    const credits = Number(this.actor.system?.credits ?? 0) || 0;
    const totalCost = Number(preview?.totalCost ?? 0) || 0;
    const canBuild = !!(chassis && crystal && preview?.success && !slotState.isOverflowing && (this._lightsaber.selectedCheckMode !== 'take10' || preview?.canTake10));
    const bladeHex = BLADE_COLOR_MAP[this._lightsaber.selectedBladeColor] || '#00ffff';
    const hiltKind = this._normalizeLightsaberHiltKind(chassis);
    return {
      actor: this.actor,
      categories: visibleCategories,
      hasItems: true,
      isLightsaber: true,
      isStoreStageMode: false,
      search: this._getSearchForCategory('lightsaber'),
      hasSearch: !!this._getSearchForCategory('lightsaber'),
      hasInventoryResults: ownedSabers.length > 0,
      inventoryItems: ownedSabers.map(item => ({
        id: item.id,
        name: item.name,
        img: item.img,
        subtitle: item.system?.chassisId || 'lightsaber',
        active: item.id === editItem?.id,
        modCount: (item.flags?.swse?.lightsaberConfig?.accessoryIds || []).length,
        templateCount: item.flags?.swse?.lightsaberConfig?.crystalId ? 1 : 0,
        equipped: !!item.system?.equipped
      })),
      currentItem: {
        id: editItem?.id || 'lightsaber-forge',
        name: editItem?.name || chassis?.name || 'Lightsaber Forge',
        category: 'lightsaber',
        subtitle: editItem ? 'tuning existing blade' : 'construct new blade',
        img: editItem?.img || chassis?.img,
        description: this._stripHtml(chassis?.system?.description || chassis?.description) || 'Select a chassis, kyber crystal, blade color, and hilt accessories. The construction engine remains the authority for DC, cost, and final mutation.',
        stats: [
          { key: 'Build DC', value: preview?.finalDc ?? '—' },
          { key: 'Cost', value: `${totalCost} cr` },
          { key: 'UTF +10', value: preview?.take10Total ?? '—' },
          { key: 'Slots', value: `${slotState.usedSlots}/${slotState.totalAvailable}` }
        ]
      },
      mentorText: editItem
        ? 'Miraj runs a hand over the emitter and listens. Existing blades can be tuned, not reborn — crystal, color, and fittings only.'
        : 'Miraj opens the forge. Chassis first, crystal second, accessories last. The blade in the center tells you when the kyber starts singing.',
      lightsaber: {
        mode: editItem ? 'edit' : 'construct',
        bladeHex,
        hiltKind,
        chassis: this._catalogs.chassis.map(option => ({
          ...option,
          description: this._stripHtml(option.system?.description || option.description),
          cost: Number(option.system?.baseCost ?? option.system?.cost ?? option.cost ?? 0) || 0,
          selected: option.id === this._lightsaber.selectedChassisId || option.system?.chassisId === this._lightsaber.selectedChassisId
        })),
        crystals: this._catalogs.crystals.map(option => ({
          ...option,
          description: this._stripHtml(option.system?.description || option.description),
          cost: Number(option.system?.cost ?? option.cost ?? 0) || 0,
          rarity: option.system?.rarity || option.rarity || 'common',
          bladeColor: option.system?.lightsaber?.bladeColor || option.bladeColor || 'Varies',
          selected: option.id === this._lightsaber.selectedCrystalId,
          incompatible: !this._isLightsaberCrystalCompatible(option.id)
        })),
        accessories: this._catalogs.accessories.map(option => ({
          ...option,
          description: this._stripHtml(option.system?.description || option.description),
          cost: Number(option.system?.cost ?? option.cost ?? 0) || 0,
          buildDcModifier: Number(option.system?.lightsaber?.buildDcModifier ?? option.buildDcModifier ?? 0) || 0,
          selected: this._lightsaber.selectedAccessoryIds.includes(option.id),
          incompatible: !this._isLightsaberAccessoryCompatible(option.id),
          slotCost: Number(option.system?.lightsaber?.upgradeSlots ?? option.system?.upgradeSlots ?? 1) || 1
        })),
        colorOptions,
        checkMode: this._lightsaber.selectedCheckMode,
        rollSelected: this._lightsaber.selectedCheckMode === 'roll',
        take10Selected: this._lightsaber.selectedCheckMode === 'take10',
        preview,
        slotState
      },
      upgrades: [],
      templates: [],
      structuralActions: null,
      footer: {
        credits,
        cost: totalCost,
        after: credits - totalCost,
        slots: slotState,
        slotPercent: slotState.totalAvailable > 0 ? Math.min(100, Math.max(0, Math.round((slotState.usedSlots / slotState.totalAvailable) * 100))) : 0,
        maxTemplatesPerItem: 0,
        canApply: canBuild,
        blockedReason: canBuild ? null : (slotState.isOverflowing ? 'Accessory slot budget exceeded.' : (this._lightsaber.selectedCheckMode === 'take10' && preview && !preview.canTake10 ? 'Take 10 does not meet the build DC.' : 'Select a valid chassis and crystal configuration.')),
        applyLabel: editItem ? 'Tune Lightsaber' : (canBuild ? `Forge Lightsaber (${totalCost} cr)` : (slotState.isOverflowing ? 'Accessory Slot Overflow' : 'Forge Blocked'))
      }
    };
  }

  async _stageCurrentItemToCart(item, draft, preview, itemUpdate) {
    const base = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
    const stagedData = foundry.utils.mergeObject(base, { flags: { swse: {} } }, { inplace: false, recursive: true });
    stagedData.flags = stagedData.flags || {};
    stagedData.flags.swse = stagedData.flags.swse || {};
    for (const [path, value] of Object.entries(itemUpdate)) {
      if (path === '_id') continue;
      foundry.utils.setProperty(stagedData, path, value);
    }
    const baseCost = this._getItemBaseCost(item);
    const finalCost = baseCost + Number(preview.totalCost ?? 0);
    stagedData.name = `${item.name} (Customized)`;
    stagedData.system = stagedData.system || {};
    stagedData.system.cost = finalCost;
    const cartEntry = {
      id: item.id,
      name: stagedData.name,
      img: stagedData.img || item.img,
      cost: finalCost,
      item,
      stagedCustomization: {
        itemData: stagedData,
        baseCost,
        customizationCost: preview.totalCost,
        finalCost,
        summary: {
          upgrades: [...(draft.selectedUpgrades || [])],
          templates: [...(draft.selectedTemplates || [])],
          structural: foundry.utils.deepClone(draft.structural || {})
        }
      }
    };
    if (this.onStage) await this.onStage({ cartEntry, itemName: stagedData.name, itemData: stagedData });
    ui.notifications.info(`${stagedData.name} staged for cart.`);
    this.close();
  }

  async _applyLightsaber() {
    const editItem = this._lightsaber.selectedOwnedSaberId ? this.actor.items.get(this._lightsaber.selectedOwnedSaberId) : null;
    const config = this._getLightsaberConfig();
    const slotState = this._getLightsaberAccessorySlotState();
    if (slotState.isOverflowing) {
      ui.notifications.warn('This lightsaber configuration exceeds available accessory slots.');
      return;
    }
    const result = editItem
      ? await LightsaberConstructionEngine.applyEdits(this.actor, editItem, config)
      : await LightsaberConstructionEngine.attemptConstruction(this.actor, config);
    if (!result?.success) {
      ui.notifications.error(`Lightsaber workbench failed: ${result?.reason || 'unknown_error'}`);
      return;
    }
    ui.notifications.info(editItem ? 'Lightsaber tuning applied.' : 'Lightsaber forged.');
    this.close();
    this.actor?.sheet?.render?.(true);
  }

  async #applyCurrentItem() {
    if (this.selectedCategory === 'lightsaber') {
      await this._applyLightsaber();
      return;
    }
    const item = this._getCurrentItem();
    const draft = this._getDraft(item);
    const preview = this._getPreview(item, draft);
    if (!preview.canApply) {
      ui.notifications.warn(preview.slotState.isOverflowing ? 'This configuration exceeds available upgrade slots.' : 'Insufficient credits.');
      return;
    }
    if (!this._isStoreStageMode() && preview.totalCost > 0) {
      const confirmed = await Dialog.confirm({
        title: 'Apply Customization',
        content: `<p>Apply staged changes to <strong>${item.name}</strong> for <strong>${preview.totalCost.toLocaleString()} credits</strong>?</p>`,
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      if (!confirmed) return;
    }
    const validation = this._validateDraft(item, draft, preview);
    if (!validation.ok) {
      ui.notifications.warn(`Customization blocked: ${validation.reason}`);
      return;
    }
    const guard = SafetyEngine.guardAgainstDuplicateApply(item.id, this._isStoreStageMode() ? 'stage_workbench' : 'apply_workbench');
    if (!guard.allowed) {
      ui.notifications.warn(guard.reason || 'Customization operation already in progress.');
      return;
    }

    const canonicalCustomization = this._getDraftCustomizationState(item, draft, preview);
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
      },
      'flags.foundryvtt-swse.customization': canonicalCustomization
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

    const operationKey = this._isStoreStageMode() ? 'stage_workbench' : 'apply_workbench';
    this._pendingApply = true;
    SafetyEngine.markOperationInFlight(item.id, operationKey);
    if (this._isStoreStageMode()) {
      try {
        await this._stageCurrentItemToCart(item, draft, preview, itemUpdate);
      } finally {
        this._pendingApply = false;
        SafetyEngine.clearOperationInFlight(item.id, operationKey);
      }
      return;
    }

    try {
      const result = await TransactionEngine.executeMutationTransaction({
        actor: this.actor,
        mutationPlan: {
          update: {
            items: [itemUpdate]
          }
        },
        cost: preview.totalCost,
        transactionContext: 'owned-customization',
        audit: {
          itemId: item.id,
          itemName: item.name,
          category: this._getCategoryForItem(item),
          selectedUpgrades: [...(draft.selectedUpgrades || [])],
          selectedTemplates: [...(draft.selectedTemplates || [])],
          structural: foundry.utils.deepClone(draft.structural || {})
        }
      }, {
        source: 'ItemCustomizationWorkbench.apply',
        validate: true,
        rederive: true
      });

      if (!result.success) {
        throw new Error(result.error || 'Customization transaction failed');
      }

      ui.notifications.info(`${item.name} customization applied.`);
      this._drafts.set(item.id, this._getInitialDraft(this.actor.items.get(item.id) || item));
      await this._renderPreservingUi();
    } catch (error) {
      console.error('[ItemCustomizationWorkbench] Apply failed', error);
      ui.notifications.error(`Failed to apply customization: ${error.message}`);
    } finally {
      this._pendingApply = false;
      SafetyEngine.clearOperationInFlight(item.id, operationKey);
    }
  }
}
