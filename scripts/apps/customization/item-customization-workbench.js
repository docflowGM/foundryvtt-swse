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
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";
import { ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/item-profile-resolver.js";
import { CustomizationCostEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/customization-cost-engine.js";
import { UpgradeSlotEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/upgrade-slot-engine.js";
import { SafetyEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js";
import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { getMentor } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import { MentorTranslationIntegration } from "/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js";

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

const STRUCTURAL_DETAILS = {
  size_increase: {
    effect: '+1 upgrade slot',
    description: 'Physically expands or reinforces the item, adding one upgrade slot at the cost of increased size, bulk, or profile.'
  },
  damage: {
    effect: '+1 upgrade slot',
    description: "Removes or weakens the item's damage-bearing assembly to free internal space for other workbench modifications."
  },
  range: {
    effect: '+1 upgrade slot',
    description: 'Trades range hardware, focusing arrays, or delivery systems for another upgrade slot.'
  },
  design: {
    effect: '+1 upgrade slot',
    description: "Simplifies the item's specialized design package, making room for customization at the expense of stock refinements."
  },
  stun_setting: {
    effect: '+1 upgrade slot',
    description: 'Removes the stun-setting assembly and routes that space and power budget into upgrade capacity.'
  },
  autofire: {
    effect: '+1 upgrade slot',
    description: 'Removes autofire cycling components to reclaim space for another upgrade.'
  },
  defensive_material: {
    effect: '+1 upgrade slot',
    description: 'Strips protective material or reinforcement from armor to recover upgrade space.'
  },
  joint_protection: {
    effect: '+1 upgrade slot',
    description: 'Removes joint guards or coverage elements, improving modification capacity while reducing stock protection.'
  }
};
const ACCENT_SWATCHES = ['#a0a0a0', '#d4af37', '#b87333', '#c0c0c0', '#1a1a1a', '#dc143c', '#1e90ff', '#00ff66'];
const TINT_SWATCHES = ['#1a1a2e','#3a2a4a','#5a3a4a','#7a3a4a','#8a5a3a','#3a5a4a','#3a4a6a','#5a5a6a','#aa8a4a','#2a2a2a','#9a9a9a','#0a0a0a'];

const WORKBENCH_CATEGORY_ALIASES = {
  weapons: new Set(['blaster', 'weapon', 'weapons', 'rangedweapon', 'meleeweapon', 'ranged_weapon', 'melee_weapon', 'pistol', 'rifle', 'carbine', 'heavyweapon', 'heavy_weapon', 'simpleweapon', 'advancedweapon', 'exoticweapon']),
  armor: new Set(['armor', 'armour', 'bodysuit', 'shield', 'shields', 'poweredarmor', 'powered_armor']),
  gear: new Set(['gear', 'equipment', 'equip', 'tool', 'tools', 'kit', 'kits', 'medical', 'medpac', 'computer', 'slicer', 'sensor', 'sensors', 'survival', 'comlink', 'communications', 'comm'])
};

const WORKBENCH_DIRECT_TYPE_CATEGORY = new Map([
  ['blaster', 'weapons'],
  ['weapon', 'weapons'],
  ['meleeweapon', 'weapons'],
  ['rangedweapon', 'weapons'],
  ['armor', 'armor'],
  ['armour', 'armor'],
  ['bodysuit', 'armor'],
  ['equipment', 'gear'],
  ['gear', 'gear'],
  ['tool', 'gear'],
  ['tech', 'gear'],
  ['consumable', 'gear']
]);

const WORKBENCH_BLOCKED_ITEM_TYPES = new Set([
  'ability',
  'attribute',
  'background',
  'class',
  'class_feature',
  'classfeature',
  'combat_action',
  'combataction',
  'effect',
  'extra_skill_use',
  'extraskilluse',
  'feat',
  'force_power',
  'force_secret',
  'force_technique',
  'forcepower',
  'forcesecret',
  'forcetechnique',
  'language',
  'species',
  'skill',
  'talent',
  'talent_choice',
  'talent_tree',
  'talentchoice',
  'talenttree'
]);

function normalizeWorkbenchToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function compactWorkbenchToken(value) {
  return normalizeWorkbenchToken(value).replace(/_/g, '');
}

function isEnergyShieldItem(item) {
  if (!item || item.type !== 'armor') return false;
  const system = getWorkbenchItemSystem(item);
  const tokens = [
    item.name,
    system?.armorType,
    system?.subtype,
    system?.category,
    system?.equipmentType,
    system?.family,
    system?.traits?.join?.(' ')
  ].filter(Boolean).join(' ');
  return /energy[_\s-]*shield|shield/i.test(tokens) && (system?.shieldRating !== undefined || /energy[_\s-]*shield/i.test(tokens));
}

const ENERGY_SHIELD_RULES = [
  { sr: 5, type: 'Light Armor', proficiency: 'Light', maxDex: 4, armorCheckPenalty: -2, cost: 500 },
  { sr: 10, type: 'Light Armor', proficiency: 'Light', maxDex: 4, armorCheckPenalty: -2, cost: 2000 },
  { sr: 15, type: 'Medium Armor', proficiency: 'Medium', maxDex: 3, armorCheckPenalty: -5, cost: 4500 },
  { sr: 20, type: 'Medium Armor', proficiency: 'Medium', maxDex: 3, armorCheckPenalty: -5, cost: 8000 },
  { sr: 25, type: 'Heavy Armor', proficiency: 'Heavy', maxDex: 2, armorCheckPenalty: -10, cost: 12500 },
  { sr: 30, type: 'Heavy Armor', proficiency: 'Heavy', maxDex: 2, armorCheckPenalty: -10, cost: 18000 }
];

function getEnergyShieldRules(item) {
  const system = getWorkbenchItemSystem(item);
  const sr = Number(system?.shieldRating ?? system?.sr ?? system?.currentSR ?? String(item?.name || '').match(/SR\s*(\d+)/i)?.[1] ?? 0) || 0;
  const table = ENERGY_SHIELD_RULES.find(row => row.sr === sr) || null;
  const armorType = String(system?.armorProficiencyRequired || table?.proficiency || system?.armorType || 'Light').toLowerCase();
  const typeLabel = table?.type || (armorType.includes('heavy') ? 'Heavy Armor' : armorType.includes('medium') ? 'Medium Armor' : 'Light Armor');
  const proficiency = table?.proficiency || (typeLabel.split(' ')[0] || 'Light');
  const maxDex = Number(system?.maxDexBonus ?? system?.maxDex ?? system?.limits?.maxDex ?? table?.maxDex);
  const armorCheckPenalty = Number(system?.armorCheckPenalty ?? system?.limits?.checkPenalty ?? table?.armorCheckPenalty ?? 0) || 0;
  const chargesMax = Number(system?.charges?.max ?? system?.maxCharges ?? 5) || 5;
  const chargesCurrent = Number(system?.charges?.current ?? system?.charges?.value ?? chargesMax) || chargesMax;
  return {
    sr,
    typeLabel,
    proficiency,
    maxDex: Number.isFinite(maxDex) ? maxDex : null,
    armorCheckPenalty,
    cost: Number(system?.cost ?? system?.costNumeric ?? system?.economics?.cost ?? table?.cost ?? 0) || 0,
    chargesCurrent,
    chargesMax,
    activated: !!(system?.activated || system?.active || system?.currentSR > 0),
    currentSR: Number(system?.currentSR ?? 0) || 0
  };
}

function getWorkbenchItemId(item) {
  return item?.id ?? item?._id ?? item?.uuid ?? item?.name ?? null;
}

function getWorkbenchItemSystem(item) {
  return item?.system ?? item?._source?.system ?? {};
}

function itemHasWorkbenchAlias(item, category) {
  const system = getWorkbenchItemSystem(item);
  const aliases = WORKBENCH_CATEGORY_ALIASES[category];
  if (!aliases) return false;
  const tokens = [
    system?.category,
    system?.itemCategory,
    system?.equipmentCategory,
    system?.equipmentType,
    system?.weaponCategory,
    system?.weaponType,
    system?.weaponSubtype,
    system?.armorType,
    system?.subtype,
    system?.group,
    system?.family
  ];
  return tokens.some(token => {
    const normalized = normalizeWorkbenchToken(token);
    const compact = compactWorkbenchToken(token);
    if (!normalized && !compact) return false;
    return aliases.has(normalized) || aliases.has(compact);
  });
}

function hasInventoryEconomics(item) {
  const system = getWorkbenchItemSystem(item);
  const cost = system?.cost ?? system?.costNumeric ?? system?.economics?.cost;
  const weight = system?.weight ?? system?.economics?.weight;
  return cost !== undefined || weight !== undefined || !!system?.equippable || !!system?.quantity;
}

function classifyPhysicalWorkbenchItem(item) {
  if (!item) return null;
  const system = getWorkbenchItemSystem(item);
  const itemType = compactWorkbenchToken(item?.type);
  const systemType = compactWorkbenchToken(system?.type);

  // Actor feature items often contain words like "weapon" or "armor" in
  // their category text. They are not physical inventory and must not inflate
  // the workbench lanes.
  if (WORKBENCH_BLOCKED_ITEM_TYPES.has(itemType) || WORKBENCH_BLOCKED_ITEM_TYPES.has(systemType)) return null;

  const direct = WORKBENCH_DIRECT_TYPE_CATEGORY.get(itemType);
  if (direct) return direct;

  // Only use loose system aliases for physical/economic item documents. This
  // keeps feats such as Weapon Focus or Armor Proficiency out of the armory.
  if (!hasInventoryEconomics(item)) return null;

  if (itemHasWorkbenchAlias(item, 'weapons')) return 'weapons';
  if (itemHasWorkbenchAlias(item, 'armor')) return 'armor';
  if (itemHasWorkbenchAlias(item, 'gear')) return 'gear';
  return null;
}

function classifyWorkbenchItem(item) {
  if (!item) return null;
  try {
    if (LightsaberConstructionEngine.isLightsaberItem(item)) return 'lightsaber';
  } catch (_error) {
    // Classification diagnostics below will expose the item shape; do not block inventory display.
  }
  return classifyPhysicalWorkbenchItem(item);
}

function getWorkbenchItemDebugShape(item) {
  const system = getWorkbenchItemSystem(item);
  return {
    id: getWorkbenchItemId(item),
    name: item?.name ?? '(unnamed)',
    type: item?.type ?? null,
    systemType: system?.type ?? null,
    category: system?.category ?? system?.itemCategory ?? system?.equipmentCategory ?? null,
    equipmentType: system?.equipmentType ?? null,
    weaponSubtype: system?.weaponSubtype ?? null,
    armorType: system?.armorType ?? null,
    subtype: system?.subtype ?? null,
    equipped: system?.equipped ?? system?.isEquipped ?? item?.flags?.swse?.equipped ?? null
  };
}

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
    this._workbenchDialogueCache = new Map();
    this._lightsaber = {
      selectedChassisId: null,
      selectedCrystalId: null,
      selectedAccessoryIds: [],
      selectedBladeColor: DEFAULT_BLADE_COLOR,
      selectedCheckMode: 'roll',
      selectedOwnedSaberId: itemId || null,
      activeTab: 'crystal',
      inspectedComponent: null
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
    return !!classifyWorkbenchItem(item);
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
    if (item.type === 'weapon') {
      const subtypeKey = this._getItemSubtypeKey(item);
      const isRangedWeapon = ['blaster', 'pistol', 'rifle', 'carbine', 'heavy', 'grenade'].includes(subtypeKey);
      if (isRangedWeapon) return Array.isArray(item.flags?.swse?.blasterUpgrades) ? item.flags.swse.blasterUpgrades : [];
      return Array.isArray(item.flags?.swse?.meleeUpgrades) ? item.flags.swse.meleeUpgrades : [];
    }
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
    return classifyWorkbenchItem(item);
  }

  _getActorItems() {
    const collection = this.actor?.items;
    if (!collection) return [];
    if (Array.isArray(collection)) return collection.filter(Boolean);
    if (Array.isArray(collection.contents)) return collection.contents.filter(Boolean);
    if (typeof collection.values === 'function') return Array.from(collection.values()).filter(Boolean);
    if (typeof collection.filter === 'function') {
      try { return collection.filter(() => true).filter(Boolean); }
      catch (_error) { return []; }
    }
    return [];
  }

  _getActorItemById(itemId) {
    if (!itemId) return null;
    const collection = this.actor?.items;
    if (collection?.get) return collection.get(itemId) ?? null;
    return this._getActorItems().find(item => getWorkbenchItemId(item) === itemId) ?? null;
  }

  _logInventoryScan({ items, byCategory, rejected, sourceCategory = null } = {}) {
    const counts = Object.fromEntries(Object.entries(byCategory || {}).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));
    const summary = {
      actor: this.actor?.name ?? this.actor?.id ?? '(no actor)',
      actorId: this.actor?.id ?? null,
      selectedCategory: this.selectedCategory ?? null,
      sourceCategory,
      mode: this.mode,
      applyMode: this.applyMode,
      totalActorItems: Array.isArray(items) ? items.length : 0,
      counts,
      rejectedCount: Array.isArray(rejected) ? rejected.length : 0,
      accepted: Object.fromEntries(Object.entries(byCategory || {}).map(([key, value]) => [key, (value || []).map(getWorkbenchItemDebugShape)])),
      rejected: (rejected || []).slice(0, 40)
    };
    console.info('SWSE [WorkbenchInventory] inventory scan', summary);
    if ((counts.weapons || 0) + (counts.armor || 0) + (counts.gear || 0) + (counts.lightsaber || 0) === 0) {
      console.warn('SWSE [WorkbenchInventory] no supported workbench items found; inspect rejected item shapes above', summary);
    }
  }

  _getSearchForCategory(category = this.selectedCategory) {
    const key = String(category || '').trim();
    if (!key) return String(this.search || '');
    return this._searchByCategory.has(key) ? String(this._searchByCategory.get(key) || '') : '';
  }

  _setSearchForCategory(category = this.selectedCategory, value = '') {
    const key = String(category || this.selectedCategory || '').trim();
    const search = String(value ?? '');
    if (key) this._searchByCategory.set(key, search);
    if (!key || key === this.selectedCategory) this.search = search;
    return search;
  }

  _rememberSelectedItem(category = this.selectedCategory, itemId = null) {
    const key = String(category || '').trim();
    if (!key) return null;
    const rememberedId = itemId || (key === 'lightsaber'
      ? this._lightsaber?.selectedOwnedSaberId
      : this.selectedItemId);
    if (rememberedId) this._selectedByCategory.set(key, rememberedId);
    else this._selectedByCategory.delete(key);
    return rememberedId || null;
  }

  _getVisibleCategories() {
    const items = this._getActorItems();
    const byCategory = {
      weapons: [],
      armor: [],
      gear: [],
      lightsaber: []
    };
    const rejected = [];

    for (const item of items) {
      const category = this._getCategoryForItem(item);
      if (category && byCategory[category]) byCategory[category].push(item);
      else rejected.push({ ...getWorkbenchItemDebugShape(item), reason: 'unsupported_item_category' });
    }

    try {
      const ownedSabers = LightsaberConstructionEngine.getOwnedLightsabers(this.actor) || [];
      for (const saber of ownedSabers) {
        const saberId = getWorkbenchItemId(saber);
        if (saberId && !byCategory.lightsaber.some(item => getWorkbenchItemId(item) === saberId)) byCategory.lightsaber.push(saber);
      }
    } catch (error) {
      console.warn('SWSE [WorkbenchInventory] lightsaber inventory scan failed', { actor: this.actor?.name, error });
    }

    let sourceCategory = null;
    if (this.sourceItem && this._isStoreStageMode()) {
      sourceCategory = this._getCategoryForItem(this.sourceItem);
      for (const key of Object.keys(byCategory)) byCategory[key] = [];
      if (sourceCategory && byCategory[sourceCategory]) byCategory[sourceCategory] = [this.sourceItem];
      else rejected.push({ ...getWorkbenchItemDebugShape(this.sourceItem), reason: 'store_stage_source_unsupported' });
    }

    this._logInventoryScan({ items, byCategory, rejected, sourceCategory });

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
    this.search = this._getSearchForCategory(this.selectedCategory);

    if (this.selectedCategory === 'lightsaber') {
      const rememberedSaber = this._selectedByCategory.get('lightsaber');
      if (!this._lightsaber.selectedOwnedSaberId && rememberedSaber) this._lightsaber.selectedOwnedSaberId = rememberedSaber;
      if (this._lightsaber.selectedOwnedSaberId && !currentCategory.items.find(item => getWorkbenchItemId(item) === this._lightsaber.selectedOwnedSaberId)) {
        this._lightsaber.selectedOwnedSaberId = null;
      }
      return { categories, item: this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null };
    }

    const remembered = this._selectedByCategory.get(this.selectedCategory);
    if (!this.selectedItemId && remembered) this.selectedItemId = remembered;
    if (!this.selectedItemId || !currentCategory.items.find(item => getWorkbenchItemId(item) === this.selectedItemId)) {
      this.selectedItemId = getWorkbenchItemId(currentCategory.items[0]) ?? null;
    }
    this._rememberSelectedItem(this.selectedCategory, this.selectedItemId);

    const item = currentCategory.items.find(candidate => getWorkbenchItemId(candidate) === this.selectedItemId) || currentCategory.items[0] || null;
    return { categories, item };
  }

  _getCurrentItem() {
    if (this.selectedCategory === 'lightsaber') {
      return this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
    }
    if (this.sourceItem && this.mode === 'store-stage' && this.selectedItemId === getWorkbenchItemId(this.sourceItem)) return this.sourceItem;
    return this.selectedItemId ? this._getActorItemById(this.selectedItemId) : null;
  }

  _isStoreStageMode() {
    return this.applyMode === 'stage-to-cart' || this.mode === 'store-stage';
  }

  _getInitialDraft(item) {
    const canonicalState = this._getCustomizationState(item);
    const templateKeys = this._getCanonicalTemplateKeys(item);
    const structural = item.flags?.swse?.customizationStructural || canonicalState.structural || { sizeIncreaseApplied: false, strippedAreas: [] };

    if (WeaponVisualProfileResolver.isBlaster(item)) {
      const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor: this.actor });
      return {
        boltColor: visualProfile.boltColor,
        fxType: visualProfile.fxType,
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
    const draftKey = getWorkbenchItemId(item);
    if (!draftKey) return null;
    if (!this._drafts.has(draftKey)) {
      this._drafts.set(draftKey, this._getInitialDraft(item));
    }
    return this._drafts.get(draftKey);
  }

  _getUpgradeCatalog(item, draft) {
    if (!item || !draft) return [];
    let source = {};
    const subtypeKey = this._getItemSubtypeKey(item);
    const isRangedWeapon = ['blaster', 'pistol', 'rifle', 'carbine', 'heavy', 'grenade'].includes(subtypeKey);
    if (item.type === 'blaster' || (item.type === 'weapon' && isRangedWeapon)) source = BLASTER_UPGRADES;
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
    if (['armor', 'bodysuit'].includes(item.type) && !isEnergyShieldItem(item)) {
      areas.push('defensive_material', 'joint_protection');
    }

    const current = new Set(item.flags?.swse?.customizationStructural?.strippedAreas || []);
    const draftAreas = new Set(draft.structural?.strippedAreas || []);
    return areas.map(key => ({
      key,
      label: STRUCTURAL_LABELS[key] || key,
      description: STRUCTURAL_DETAILS[key]?.description || 'Trade a stock capability for one additional upgrade slot.',
      effect: STRUCTURAL_DETAILS[key]?.effect || '+1 upgrade slot',
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
    if (isEnergyShieldItem(item)) {
      const shield = getEnergyShieldRules(item);
      return [
        { key: 'SR', value: shield.sr || '—' },
        { key: 'Type', value: shield.typeLabel },
        { key: 'Max Dex', value: shield.maxDex === null ? '—' : `+${shield.maxDex}` },
        { key: 'ACP', value: shield.armorCheckPenalty || 0 },
        { key: 'Charges', value: `${shield.chargesCurrent}/${shield.chargesMax}` },
        { key: 'Cost', value: `${shield.cost} cr` },
        { key: 'Slots', value: `${preview.slotState.usedSlots}/${preview.slotState.totalAvailable}` },
        { key: 'Reflex', value: 'No Override' }
      ];
    }

    const stats = [];
    stats.push({ key: 'Cost', value: `${Number(item.system?.cost ?? 0) || 0} cr` });
    stats.push({ key: 'Slots', value: `${preview.slotState.usedSlots}/${preview.slotState.totalAvailable}` });
    const restriction = String(item.system?.restriction || 'common');
    stats.push({ key: 'Restriction', value: restriction.toUpperCase() });
    const templateCount = (this._getDraft(item)?.selectedTemplates || []).length;
    stats.push({ key: 'Templates', value: `${templateCount}/${GearTemplatesEngine.getTemplateLimit()}` });
    return stats;
  }


  async _getWorkbenchDialogue(mentorKey, path, fallback = '') {
    const cacheKey = `${mentorKey}:${path.join('.')}`;
    if (this._workbenchDialogueCache.has(cacheKey)) return this._workbenchDialogueCache.get(cacheKey);
    let value = fallback;
    try {
      const mentor = await getMentor(mentorKey);
      value = path.reduce((node, key) => node?.[key], mentor?.[mentorKey]?.dialogues || mentor?.dialogues) || fallback;
      if (Array.isArray(value)) value = value[Math.floor(Math.random() * value.length)] || fallback;
      if (value && typeof value === 'object') {
        const defaultValue = value.default;
        value = Array.isArray(defaultValue) ? defaultValue[Math.floor(Math.random() * defaultValue.length)] : defaultValue;
      }
    } catch (error) {
      console.warn('[ItemCustomizationWorkbench] Failed to load workshop mentor dialogue', { mentorKey, path, error });
    }
    this._workbenchDialogueCache.set(cacheKey, value || fallback);
    return value || fallback;
  }

  _getItemSubtypeKey(item) {
    const raw = [
      item?.system?.weaponSubtype,
      item?.system?.weaponType,
      item?.system?.group,
      item?.system?.armorType,
      item?.system?.subtype,
      item?.system?.category,
      item?.type
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (/blaster/.test(raw)) return 'blaster';
    if (/pistol/.test(raw)) return 'pistol';
    if (/rifle/.test(raw)) return 'rifle';
    if (/carbine/.test(raw)) return 'carbine';
    if (/heavy|cannon|launcher/.test(raw)) return 'heavy';
    if (/vibro/.test(raw)) return 'vibro';
    if (/grenade|explosive|thrown/.test(raw)) return 'grenade';
    if (/melee|simple|advanced/.test(raw)) return 'melee';
    if (/energy[_\s-]*shield|shield/.test(raw)) return 'shield';
    if (/powered/.test(raw)) return 'powered';
    if (/heavy/.test(raw)) return 'heavy';
    if (/medium/.test(raw)) return 'medium';
    if (/light/.test(raw)) return 'light';
    if (/body|suit/.test(raw)) return 'bodysuit';
    if (/medical|medpac|medkit|surgery/.test(raw)) return 'medical';
    if (/stealth|cloak|conceal|shadow/.test(raw)) return 'stealth';
    if (/comm|comlink|communication/.test(raw)) return 'communications';
    if (/sensor|scanner|detector/.test(raw)) return 'sensor';
    if (/survival|field|ration|environment/.test(raw)) return 'survival';
    if (/computer|datapad|slicer|security/.test(raw)) return 'computer';
    if (/tool|kit/.test(raw)) return 'tool';
    return 'default';
  }

  async _getWorkshopMentorContext(item) {
    const category = this._getCategoryForItem(item);
    const subtype = this._getItemSubtypeKey(item);
    const categoryPath = category === 'weapons' ? 'weapons' : (category === 'armor' ? 'armor' : 'gear');
    const fallback = isEnergyShieldItem(item)
      ? `Energy shield on the bench. It does not make you harder to hit; it eats energy damage while it is active. Tune the generator, preserve the charges, and don't confuse SR with armor.`
      : category === 'weapons'
        ? `Weapon on the bench. Good. We tune the frame, keep the slots honest, and make sure it does what you need when the room gets ugly.`
        : category === 'armor'
          ? `Armor is a platform. Plate, flex, seals, weight — every change makes a trade, so we make the trade on purpose.`
          : `Utility gear is where clever people become problems. Pick the mod that solves the job, not the one that only looks fancy.`;
    const mentorText = await this._getWorkbenchDialogue('delta', ['workshop', categoryPath, subtype], fallback)
      || await this._getWorkbenchDialogue('delta', ['workshop', categoryPath, 'default'], fallback)
      || await this._getWorkbenchDialogue('delta', ['workshop', 'default'], fallback);
    return {
      mentorKey: 'delta',
      mentorName: 'Delta',
      mentorTitle: 'FIELD MOD SPECIALIST',
      mentorHead: 'DELTA · FIELD MOD SPECIALIST',
      mentorPortrait: 'systems/foundryvtt-swse/assets/mentors/delta.png',
      mentorText
    };
  }

  async _getLightsaberMentorContext(editItem) {
    const path = editItem ? ['workshop', 'lightsaber', 'customize'] : ['workshop', 'lightsaber', 'bench'];
    const fallback = editItem
      ? 'This blade is already yours. We are not remaking it; we are listening for what no longer fits, then correcting with care.'
      : 'This is the saber bench, not a ceremony. Study the hilt, crystal, and fittings as separate choices before you commit to the whole.';
    const mentorText = await this._getWorkbenchDialogue('miraj', path, fallback)
      || await this._getWorkbenchDialogue('miraj', ['workshop', 'lightsaber', 'default'], fallback);
    return {
      mentorKey: 'miraj',
      mentorName: 'Miraj',
      mentorTitle: 'SABER WORKBENCH GUIDE',
      mentorHead: 'MIRAJ · SABER WORKBENCH GUIDE',
      mentorPortrait: 'systems/foundryvtt-swse/assets/mentors/miraj.png',
      mentorText
    };
  }

  async _renderMentorTranslation() {
    const container = this.element?.querySelector?.('[data-workbench-mentor-text]');
    if (!container) return;
    const text = container.dataset.rawText || container.textContent || '';
    const mentor = container.dataset.mentor || 'delta';
    try {
      await MentorTranslationIntegration.render({
        text,
        container,
        mentor,
        topic: 'workshop',
        force: false
      });
    } catch (error) {
      console.warn('[ItemCustomizationWorkbench] Mentor translation failed', error);
      container.textContent = text;
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    await this._renderMentorTranslation();
  }

  _buildModificationDetailRail({ item, upgrades = [], templates = [], structuralActions = null, preview = null } = {}) {
    const upgradeRows = upgrades.map(card => ({
      kind: 'Modification',
      action: 'toggle-upgrade',
      key: card.key,
      selectable: !card.installed && !card.disabled,
      buttonLabel: card.selected ? 'Remove Modification' : 'Select Modification',
      name: card.name,
      description: card.description || 'No description is recorded for this modification yet.',
      effect: card.effect || '',
      cost: Number(card.costCredits ?? 0),
      slotCost: Number(card.slotCost ?? 0),
      selected: !!card.selected,
      installed: !!card.installed,
      disabled: !!card.disabled
    }));

    const templateRows = templates.map(card => ({
      kind: 'Template',
      action: 'toggle-template',
      key: card.key,
      selectable: !card.installed && !card.disabled,
      buttonLabel: card.selected ? 'Remove Template' : 'Select Template',
      name: card.name,
      description: card.description || card.rulesText || 'No template notes are recorded for this entry yet.',
      effect: card.rulesText || card.restriction || '',
      cost: Number(card.costPreview ?? 0),
      slotCost: null,
      selected: !!card.selected,
      installed: !!card.installed,
      disabled: !!card.disabled
    }));

    const structuralRows = [];
    if (structuralActions?.sizeIncrease) {
      structuralRows.push({
        kind: 'Structural',
        action: 'toggle-size-increase',
        key: null,
        selectable: !structuralActions.sizeIncrease.disabled,
        buttonLabel: structuralActions.sizeIncrease.selected ? 'Remove Structural Change' : 'Select Structural Change',
        name: structuralActions.sizeIncrease.label,
        description: structuralActions.sizeIncrease.description || STRUCTURAL_DETAILS.size_increase.description,
        effect: STRUCTURAL_DETAILS.size_increase.effect,
        cost: this._costEngine.getSizeIncreaseOperationCost?.(item) ?? 0,
        slotCost: null,
        selected: !!structuralActions.sizeIncrease.selected,
        installed: preview?.slotState?.sizeIncreaseAlreadyApplied ?? false,
        disabled: !!structuralActions.sizeIncrease.disabled
      });
    }
    for (const strip of structuralActions?.strips || []) {
      structuralRows.push({
        kind: 'Structural',
        action: 'toggle-strip',
        key: strip.key,
        selectable: !strip.disabled && !strip.installed,
        buttonLabel: strip.selected ? 'Remove Structural Change' : 'Select Structural Change',
        name: strip.label,
        description: strip.description || STRUCTURAL_DETAILS[strip.key]?.description || 'Trade a stock capability for one additional upgrade slot.',
        effect: strip.effect || STRUCTURAL_DETAILS[strip.key]?.effect || '+1 upgrade slot',
        cost: this._costEngine.getStripOperationCost?.(item) ?? 0,
        slotCost: null,
        selected: !!strip.selected,
        installed: !!strip.installed,
        disabled: !!strip.disabled
      });
    }

    const allRows = [...upgradeRows, ...templateRows, ...structuralRows];
    const stagedRows = allRows.filter(row => row.selected && !row.installed);
    const installedRows = allRows.filter(row => row.installed);

    return {
      hasRows: allRows.length > 0,
      stagedRows,
      installedRows,
      upgradeRows,
      templateRows,
      structuralRows,
      slotSummary: preview?.slotState
        ? `${preview.slotState.usedSlots}/${preview.slotState.totalAvailable} slots used`
        : '',
      costSummary: preview ? `${preview.totalCost} cr staged` : ''
    };
  }

  _getItemSummary(item, draft, preview) {
    const category = this._getCategoryForItem(item);
    const subtitle = item.system?.weaponSubtype || item.system?.armorType || item.system?.subtype || item.type;
    const appearance = [];
    const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor: this.actor, draft });
    if (visualProfile.isBlaster) {
      appearance.push({
        key: 'Bolt Color',
        kind: 'bolt-color',
        action: 'set-bolt-color',
        value: visualProfile.boltColor,
        selectedLabel: visualProfile.boltColor,
        selectedHex: visualProfile.boltHex,
        visualProfile,
        options: Object.entries(BLASTER_BOLT_COLORS).map(([key, hex]) => ({
          key,
          label: key,
          hex,
          selected: visualProfile.boltColor === key
        }))
      });
      appearance.push({ key: 'FX Profile', action: 'set-fx-type', value: visualProfile.fxType, variantOptions: Object.entries(BLASTER_FX_TYPES).map(([key, fx]) => ({ key, name: fx.name, description: fx.description, selected: visualProfile.fxType === key })) });
    } else if (item.type === 'weapon') {
      appearance.push({ key: 'Accent', action: 'set-accent', value: draft.accentColor, options: ACCENT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.accentColor === hex })) });
    } else if (['armor', 'bodysuit'].includes(item.type)) {
      appearance.push({ key: 'Tint', action: 'set-tint', value: draft.tintColor, options: TINT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.tintColor === hex })) });
    } else {
      appearance.push({ key: 'Variant', action: 'set-variant', value: draft.variant, variantOptions: Object.entries(GEAR_VARIANTS).map(([key, variant]) => ({ key, name: variant.name, description: variant.description, selected: draft.variant === key })) });
      appearance.push({ key: 'Accent', action: 'set-accent', value: draft.accentColor, options: ACCENT_SWATCHES.map(hex => ({ key: hex, hex, label: hex, selected: draft.accentColor === hex })) });
    }

    const energyShield = isEnergyShieldItem(item) ? getEnergyShieldRules(item) : null;
    return {
      id: getWorkbenchItemId(item),
      name: item.name,
      category,
      subtitle: energyShield ? `${energyShield.typeLabel} · Energy Shield` : subtitle,
      img: item.img,
      description: this._stripHtml(item.system?.description || item.system?.details || item.system?.shortDescription || ''),
      stats: this._getHeroStats(item, preview),
      appearance,
      isEnergyShield: !!energyShield,
      energyShield
    };
  }

  async _prepareContext(options) {
    this._catalogs = await LightsaberConstructionEngine.getCatalogOptions();
    this._hydrateLightsaberDefaults();
    const themeKey = getActorSheetTheme(this.actor?.getFlag?.('foundryvtt-swse', 'sheetTheme'));
    const motionStyle = getActorSheetMotionStyle(this.actor?.getFlag?.('foundryvtt-swse', 'sheetMotionStyle'));
    const themeStyleInline = buildActorSheetThemeStyle(themeKey);
    const motionStyleInline = buildActorSheetMotionStyle(motionStyle);
    const shellContext = { themeKey, motionStyle, themeStyleInline, motionStyleInline };
    const { categories, item } = this._ensureSelection();
    const visibleCategories = categories.map(category => ({ ...category, active: category.key === this.selectedCategory, count: category.items.length, special: category.special }));
    if (this.selectedCategory === 'lightsaber') {
      return { ...shellContext, ...(await this._prepareLightsaberContext(visibleCategories)) };
    }
    if (!item) {
      const mentorText = await this._getWorkbenchDialogue('delta', ['workshop', 'empty'], `Can't tune air, genius. Get a weapon, armor plate, or a piece of gear in your inventory, then we'll make somethin' useful outta it.`);
      return {
        ...shellContext,
        actor: this.actor,
        categories: visibleCategories,
        hasItems: false,
        isStoreStageMode: this._isStoreStageMode(),
        mentorKey: 'delta',
        mentorName: 'Delta',
        mentorTitle: 'FIELD MOD SPECIALIST',
        mentorHead: 'DELTA · FIELD MOD SPECIALIST',
        mentorPortrait: 'systems/foundryvtt-swse/assets/mentors/delta.png',
        mentorText
      };
    }

    const draft = this._getDraft(item);
    const energyShieldItem = isEnergyShieldItem(item);
    if (energyShieldItem) draft.selectedUpgrades = [];
    const preview = this._getPreview(item, draft);
    const currentCategory = categories.find(entry => entry.key === this.selectedCategory);
    const currentSearch = this._getSearchForCategory(this.selectedCategory);
    const inventoryItems = (currentCategory?.items || [])
      .filter(candidate => !currentSearch || candidate.name.toLowerCase().includes(currentSearch.toLowerCase()))
      .map(candidate => {
        const candidateDraft = this._getDraft(candidate);
        const templates = this._getCanonicalTemplateKeys(candidate);
        return {
          id: getWorkbenchItemId(candidate),
          name: candidate.name,
          img: candidate.img,
          subtitle: candidate.system?.weaponSubtype || candidate.system?.armorType || candidate.type,
          active: getWorkbenchItemId(candidate) === getWorkbenchItemId(item),
          modCount: candidateDraft.selectedUpgrades.length,
          templateCount: new Set([...(candidateDraft.selectedTemplates || []), ...templates]).size,
          equipped: !!candidate.system?.equipped
        };
      });

    const upgrades = energyShieldItem ? [] : this._getUpgradeCatalog(item, draft);
    const templates = this._getTemplateCards(item, draft);
    const structuralActions = {
      sizeIncrease: {
        selected: !!draft.structural?.sizeIncreaseApplied,
        disabled: ['lightsaber', 'droid'].includes(item.type) || energyShieldItem,
        label: 'Increase Size / Bulk',
        description: energyShieldItem
          ? 'Energy shields are forearm/upper-arm generators; their Shield Rating is changed by shield model, not by armor bulk stripping.'
          : (['armor', 'bodysuit'].includes(item.type)
            ? 'Increase this armor one weight class heavier for +1 upgrade slot.'
            : 'Increase the item one size step for +1 upgrade slot.'),
        effect: energyShieldItem ? 'Not available for energy shields' : STRUCTURAL_DETAILS.size_increase.effect
      },
      strips: this._getStrippableAreas(item, draft)
    };
    const detailRail = this._buildModificationDetailRail({ item, upgrades, templates, structuralActions, preview });

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
      ...(await this._getWorkshopMentorContext(item)),
      isEnergyShield: energyShieldItem,
      energyShield: energyShieldItem ? getEnergyShieldRules(item) : null,
      upgrades,
      templates,
      structuralActions,
      detailRail,
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

  async handleSurfaceAction(action, target) {
    switch (action) {
      case 'select-category': {
        this._rememberSelectedItem();
        this.selectedCategory = target?.dataset?.category || this.selectedCategory;
        this.search = this._getSearchForCategory(this.selectedCategory);
        if (this.selectedCategory !== 'lightsaber') this.selectedItemId = this._selectedByCategory.get(this.selectedCategory) || null;
        await this._renderPreservingUi();
        return;
      }

      case 'select-item': {
        const itemId = target?.dataset?.itemId;
        if (!itemId) return;
        if (this.selectedCategory === 'lightsaber') {
          this._lightsaber.selectedOwnedSaberId = itemId;
          this._lightsaber.activeTab = 'crystal';
          this._lightsaber.inspectedComponent = null;
          this._rememberSelectedItem('lightsaber', itemId);
        } else {
          this.selectedItemId = itemId;
          this._rememberSelectedItem(this.selectedCategory, itemId);
        }
        await this._renderPreservingUi();
        return;
      }

      case 'search-items': {
        this._setSearchForCategory(this.selectedCategory, target?.value || '');
        window.clearTimeout(this._searchRenderTimer);
        this._searchRenderTimer = window.setTimeout(() => this._renderPreservingUi(), 140);
        return;
      }

      case 'reset-filter': {
        this._setSearchForCategory(this.selectedCategory, '');
        await this._renderPreservingUi();
        return;
      }

      case 'toggle-upgrade': {
        if (target?.disabled || target?.classList?.contains?.('disabled')) return;
        const item = this._getCurrentItem();
        const draft = this._getDraft(item);
        if (!item || !draft) return;
        const key = target?.dataset?.key || target?.dataset?.upgradeKey;
        if (!key) return;
        const currentInstalled = this._getCurrentAppliedUpgradeKeys(item);
        if (currentInstalled.includes(key)) return;
        const idx = draft.selectedUpgrades.indexOf(key);
        if (idx >= 0) draft.selectedUpgrades.splice(idx, 1);
        else draft.selectedUpgrades.push(key);
        await this._renderPreservingUi();
        return;
      }

      case 'toggle-template': {
        if (target?.disabled || target?.classList?.contains?.('disabled')) return;
        const item = this._getCurrentItem();
        const draft = this._getDraft(item);
        if (!item || !draft) return;
        const key = target?.dataset?.key || target?.dataset?.templateKey;
        if (!key) return;
        const currentlyApplied = Array.isArray(item.flags?.swse?.appliedTemplates)
          ? item.flags.swse.appliedTemplates.map(entry => entry?.templateKey)
          : [];
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
        return;
      }

      case 'toggle-size-increase': {
        const button = target?.closest?.('button') || target;
        if (button?.disabled || button?.classList?.contains?.('disabled')) return;
        const item = this._getCurrentItem();
        const draft = this._getDraft(item);
        if (!item || !draft) return;
        const currentState = this._getCustomizationState(item);
        if (currentState.structural?.sizeIncreaseApplied) return;
        draft.structural.sizeIncreaseApplied = !draft.structural.sizeIncreaseApplied;
        await this._renderPreservingUi();
        return;
      }

      case 'toggle-strip': {
        if (target?.disabled || target?.classList?.contains?.('disabled')) return;
        const item = this._getCurrentItem();
        const draft = this._getDraft(item);
        const key = target?.dataset?.key;
        if (!item || !draft || !key) return;
        const current = new Set(item.flags?.swse?.customizationStructural?.strippedAreas || []);
        if (current.has(key)) return;
        const idx = draft.structural.strippedAreas.indexOf(key);
        if (idx >= 0) draft.structural.strippedAreas.splice(idx, 1);
        else draft.structural.strippedAreas.push(key);
        await this._renderPreservingUi();
        return;
      }

      case 'set-bolt-color': {
        const draft = this._getDraft(this._getCurrentItem());
        if (!draft) return;
        draft.boltColor = target?.dataset?.key;
        await this._renderPreservingUi();
        return;
      }

      case 'set-fx-type': {
        const draft = this._getDraft(this._getCurrentItem());
        if (!draft) return;
        draft.fxType = target?.dataset?.key;
        await this._renderPreservingUi();
        return;
      }

      case 'set-accent': {
        const draft = this._getDraft(this._getCurrentItem());
        if (!draft) return;
        draft.accentColor = target?.dataset?.key;
        await this._renderPreservingUi();
        return;
      }

      case 'set-tint': {
        const draft = this._getDraft(this._getCurrentItem());
        if (!draft) return;
        draft.tintColor = target?.dataset?.key;
        await this._renderPreservingUi();
        return;
      }

      case 'set-variant': {
        const draft = this._getDraft(this._getCurrentItem());
        if (!draft) return;
        draft.variant = target?.dataset?.key;
        draft.selectedUpgrades = draft.selectedUpgrades.filter(key => {
          const mod = GEAR_MODS[key];
          return mod?.compatible?.includes(draft.variant);
        });
        await this._renderPreservingUi();
        return;
      }

      case 'set-lightsaber-tab': {
        const tab = target?.dataset?.tab || 'crystal';
        if (tab === 'chassis' && !this._canChangeLightsaberChassis()) return;
        this._lightsaber.activeTab = tab;
        this._lightsaber.inspectedComponent = null;
        await this._renderPreservingUi();
        return;
      }

      case 'inspect-lightsaber-component': {
        const type = target?.dataset?.componentType;
        const key = target?.dataset?.key;
        if (!type || !key) return;
        this._lightsaber.inspectedComponent = { type, key };
        await this._renderPreservingUi();
        return;
      }

      case 'select-lightsaber-chassis': {
        if (!this._canChangeLightsaberChassis()) {
          ui.notifications.info('This saber is in tuning mode; its chassis is fixed until full construction is unlocked.');
          return;
        }
        this._lightsaber.selectedChassisId = target?.dataset?.key;
        this._lightsaber.selectedAccessoryIds = this._lightsaber.selectedAccessoryIds.filter(id => this._isLightsaberAccessoryCompatible(id));
        if (!this._isLightsaberCrystalCompatible(this._lightsaber.selectedCrystalId)) {
          const firstCompatible = this._catalogs.crystals.find(option => this._isLightsaberCrystalCompatible(option.id));
          this._lightsaber.selectedCrystalId = firstCompatible?.id || this._catalogs.crystals[0]?.id || null;
        }
        await this._renderPreservingUi();
        return;
      }

      case 'select-lightsaber-crystal': {
        const key = target?.dataset?.key;
        if (!key) return;
        const isTuning = this._isLightsaberTuningMode();
        if (!isTuning && (target?.classList?.contains?.('disabled') || !this._isLightsaberCrystalCompatible(key))) {
          ui.notifications.warn('That crystal is not compatible with the selected chassis.');
          return;
        }
        this._lightsaber.selectedCrystalId = key;
        this._lightsaber.activeTab = 'crystal';
        this._lightsaber.inspectedComponent = { type: 'crystal', key };
        const crystal = this._catalogs.crystals.find(option => option.id === key || option._id === key);
        const preferred = this._resolveBladeColorOptions(crystal)[0];
        if (preferred) this._lightsaber.selectedBladeColor = preferred;
        await this._renderPreservingUi();
        return;
      }

      case 'toggle-lightsaber-accessory': {
        const id = target?.dataset?.key;
        if (!id) return;
        const isTuning = this._isLightsaberTuningMode();
        if (!isTuning && (target?.classList?.contains?.('disabled') || !this._isLightsaberAccessoryCompatible(id))) {
          ui.notifications.warn('That accessory is not compatible with the selected chassis.');
          return;
        }
        this._lightsaber.activeTab = 'hilt';
        this._lightsaber.inspectedComponent = { type: 'accessory', key: id };
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
        return;
      }

      case 'set-lightsaber-color': {
        const key = target?.dataset?.key;
        if (!key) return;
        this._lightsaber.selectedBladeColor = key;
        this._lightsaber.activeTab = 'color';
        this._lightsaber.inspectedComponent = { type: 'color', key };
        this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.remove?.('open');
        await this._renderPreservingUi();
        return;
      }

      case 'open-lightsaber-color-modal': {
        this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.add?.('open');
        return;
      }

      case 'close-lightsaber-color-modal': {
        this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.remove?.('open');
        return;
      }

      case 'set-lightsaber-check-mode': {
        if (target?.disabled || target?.classList?.contains?.('disabled')) return;
        const mode = target?.dataset?.key;
        if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
        await this._renderPreservingUi();
        return;
      }

      case 'reset-item': {
        if (this.selectedCategory === 'lightsaber') {
          const editItem = this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
          this._lightsaber.selectedChassisId = null;
          this._lightsaber.selectedCrystalId = null;
          this._lightsaber.selectedAccessoryIds = [];
          this._lightsaber.selectedBladeColor = DEFAULT_BLADE_COLOR;
          this._lightsaber.selectedCheckMode = 'roll';
          if (editItem) this._lightsaber.selectedOwnedSaberId = getWorkbenchItemId(editItem);
          this._hydrateLightsaberDefaults();
        } else {
          const item = this._getCurrentItem();
          if (item) this._drafts.set(item.id, this._getInitialDraft(item));
        }
        await this._renderPreservingUi();
        return;
      }

      case 'close-workbench': {
        await this.close();
        return;
      }

      case 'apply-item': {
        if (this._pendingApply) return;
        await this.#applyCurrentItem();
        return;
      }

      default:
        return;
    }
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
        this._lightsaber.activeTab = 'crystal';
        this._lightsaber.inspectedComponent = null;
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



    this.onRoot('click', '[data-action="set-lightsaber-tab"]', async (event, target) => {
      event.preventDefault();
      const tab = target.dataset.tab || 'crystal';
      if (tab === 'chassis' && !this._canChangeLightsaberChassis()) return;
      this._lightsaber.activeTab = tab;
      this._lightsaber.inspectedComponent = null;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="inspect-lightsaber-component"]', async (event, target) => {
      event.preventDefault();
      const type = target.dataset.componentType;
      const key = target.dataset.key;
      if (!type || !key) return;
      this._lightsaber.inspectedComponent = { type, key };
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="select-lightsaber-chassis"]', async (event, target) => {
      event.preventDefault();
      if (!this._canChangeLightsaberChassis()) {
        ui.notifications.info('This saber is in tuning mode; its chassis is fixed until full construction is unlocked.');
        return;
      }
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
      if (!id) return;
      const isTuning = this._isLightsaberTuningMode();
      if (!isTuning && (target.classList.contains('disabled') || !this._isLightsaberAccessoryCompatible(id))) {
        ui.notifications.warn('That accessory is not compatible with the selected chassis.');
        return;
      }
      this._lightsaber.activeTab = 'hilt';
      this._lightsaber.inspectedComponent = { type: 'accessory', key: id };
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
      const key = target.dataset.key;
      if (!key) return;
      this._lightsaber.selectedBladeColor = key;
      this._lightsaber.activeTab = 'color';
      this._lightsaber.inspectedComponent = { type: 'color', key };
      this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.remove?.('open');
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="open-lightsaber-color-modal"]', (event) => {
      event.preventDefault();
      this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.add?.('open');
    });

    this.onRoot('click', '[data-action="close-lightsaber-color-modal"]', (event) => {
      event.preventDefault();
      this.element?.querySelector?.('[data-lightsaber-color-modal]')?.classList?.remove?.('open');
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
        const editItem = this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
        this._lightsaber.selectedChassisId = null;
        this._lightsaber.selectedCrystalId = null;
        this._lightsaber.selectedAccessoryIds = [];
        this._lightsaber.selectedBladeColor = DEFAULT_BLADE_COLOR;
        this._lightsaber.selectedCheckMode = 'roll';
        if (editItem) this._lightsaber.selectedOwnedSaberId = getWorkbenchItemId(editItem);
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



  /**
   * Public bridge for shell-hosted inline workbench surfaces.
   * Keeps apply behavior in the canonical workbench class while avoiding
   * direct access to the private #applyCurrentItem method from adapters.
   */
  async applyCurrentItemFromSurface() {
    if (this._pendingApply) return;
    await this.#applyCurrentItem();
  }

  _getStandardLightsaberChassis() {
    const candidates = this._catalogs.chassis || [];
    return candidates.find(ch => {
      const id = String(ch?.system?.chassisId || ch?.id || ch?._id || '').toLowerCase();
      const name = String(ch?.name || '').toLowerCase();
      return id === 'standard' || id === 'lightsaber-chassis-standard' || id === 'standard_lightsaber' || name === 'lightsaber (standard)' || name === 'standard lightsaber' || (/standard/.test(name) && /lightsaber/.test(name));
    }) || candidates.find(ch => {
      const id = String(ch?.system?.chassisId || ch?.id || ch?._id || '').toLowerCase();
      const name = String(ch?.name || '').toLowerCase();
      const joined = `${id} ${name}`;
      return /lightsaber/.test(joined) && !/foil|lightfoil|short|shoto|double|cross|pike|whip|curved|great|archaic|modern/.test(joined);
    }) || candidates[0] || null;
  }

  _isGenericStarterLightsaber(item) {
    if (!item) return false;
    const name = String(item.name || '').trim().toLowerCase();
    if (!/lightsaber/.test(name)) return false;
    return !/lightfoil|shoto|short|double|crossguard|curved|pike|whip|great/.test(name);
  }

  _isLightsaberTuningMode() {
    const editItem = this._lightsaber?.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
    return !!editItem;
  }

  _hydrateLightsaberDefaults() {
    const ls = this._lightsaber;
    const editItem = ls.selectedOwnedSaberId ? this._getActorItemById(ls.selectedOwnedSaberId) : null;
    if (editItem && LightsaberConstructionEngine.isLightsaberItem(editItem)) {
      const editState = LightsaberConstructionEngine.getEditState(editItem);
      const standardChassis = this._getStandardLightsaberChassis();
      if (this._isGenericStarterLightsaber(editItem)) {
        ls.selectedChassisId = standardChassis?.id || standardChassis?._id || standardChassis?.system?.chassisId || null;
      } else {
        ls.selectedChassisId ||= editState.chassisId || editItem.system?.chassisId || standardChassis?.id || this._catalogs.chassis[0]?.id || null;
      }
      if (!this._findLightsaberCatalogOption('chassis', ls.selectedChassisId)) {
        ls.selectedChassisId = standardChassis?.id || standardChassis?._id || standardChassis?.system?.chassisId || this._catalogs.chassis[0]?.id || null;
      }
      ls.selectedCrystalId ||= editState.crystalId || this._catalogs.crystals.find(cr => /kyber|ilum/i.test(cr.name || ''))?.id || this._catalogs.crystals[0]?.id || null;
      if (!this._findLightsaberCatalogOption('crystals', ls.selectedCrystalId)) {
        ls.selectedCrystalId = this._catalogs.crystals.find(cr => /kyber|ilum/i.test(cr.name || ''))?.id || this._catalogs.crystals[0]?.id || null;
      }
      if (!ls.selectedAccessoryIds.length && Array.isArray(editState.accessoryIds)) ls.selectedAccessoryIds = [...editState.accessoryIds];
      ls.selectedBladeColor ||= editState.bladeColor || DEFAULT_BLADE_COLOR;
      return;
    }
    const standardChassis = this._getStandardLightsaberChassis();
    ls.selectedChassisId ||= standardChassis?.id || standardChassis?._id || standardChassis?.system?.chassisId || this._catalogs.chassis[0]?.id || null;
    ls.selectedCrystalId ||= this._catalogs.crystals.find(cr => /kyber|ilum/i.test(cr.name || ''))?.id || this._catalogs.crystals[0]?.id || null;
    ls.selectedBladeColor ||= DEFAULT_BLADE_COLOR;
  }

  _findLightsaberCatalogOption(type, id) {
    const list = this._catalogs[type] || [];
    return list.find(option => option.id === id || option._id === id || option.system?.chassisId === id) || null;
  }

  _resolveBladeColorOptions(crystal) {
    const identity = `${crystal?.id || ''} ${crystal?._id || ''} ${crystal?.name || ''}`.toLowerCase();
    if (identity.includes('kyber') || identity.includes('ilum') || identity.includes('standard')) return VARIES_COLOR_LIST;
    const raw = String(crystal?.system?.lightsaber?.bladeColor || crystal?.bladeColor || 'varies').toLowerCase();
    if (!raw || raw === 'varies' || raw.includes('varies')) return VARIES_COLOR_LIST;
    const options = raw.split(/\s+or\s+|\//i).map(part => part.trim()).filter(Boolean);
    return options.length ? options : VARIES_COLOR_LIST;
  }

  _isActorEligibleForLightsaberConstruction() {
    const level = Number(this.actor?.system?.level ?? this.actor?.system?.details?.level ?? 1) || 1;
    if (level < 7) return false;
    const items = Array.from(this.actor?.items ?? []);
    const hasForceSensitivity = items.some(item => item?.type === 'feat' && /force\s+sensitiv(e|ity)/i.test(item?.name || ''));
    const hasJediClass = items.some(item => item?.type === 'class' && /jedi/i.test(item?.name || '') && (Number(item?.system?.level ?? 1) || 1) > 0);
    const classEntries = Object.values(this.actor?.system?.classes ?? {});
    const systemHasJedi = classEntries.some(cls => /jedi/i.test(String(cls?.name || cls?.label || cls?.id || '')) && (Number(cls?.level ?? 1) || 1) > 0);
    return hasForceSensitivity || hasJediClass || systemHasJedi;
  }

  _canChangeLightsaberChassis(editItem = null) {
    const target = editItem ?? (this._lightsaber?.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null);
    if (target) return false;
    return this._isActorEligibleForLightsaberConstruction();
  }

  _buildLightsaberEditPreview({ chassis, crystal, accessories = [] } = {}) {
    const crystalCost = Number(crystal?.system?.cost ?? crystal?.cost ?? 0) || 0;
    const accessoryCost = accessories.reduce((sum, accessory) => sum + (Number(accessory?.system?.cost ?? accessory?.cost ?? 0) || 0), 0);
    const crystalDcMod = Number(crystal?.system?.lightsaber?.buildDcModifier ?? crystal?.buildDcModifier ?? 0) || 0;
    const accessoryDcMod = accessories.reduce((sum, accessory) => sum + (Number(accessory?.system?.lightsaber?.buildDcModifier ?? accessory?.buildDcModifier ?? 0) || 0), 0);
    const modifier = Number(this.actor?.system?.skills?.useTheForce?.total ?? 0) || 0;
    const finalDc = Math.max(0, crystalDcMod + accessoryDcMod);
    return {
      success: !!(chassis && crystal),
      chassis,
      crystal,
      accessories,
      finalDc,
      totalCost: crystalCost + accessoryCost,
      modifier,
      take10Total: modifier + 10,
      canTake10: true,
      timeHours: 0,
      mode: 'tune'
    };
  }


  _getSelectedLightsaberChassisId() {
    const chassis = this._findLightsaberCatalogOption('chassis', this._lightsaber.selectedChassisId);
    return chassis?.system?.chassisId || chassis?.id || this._lightsaber.selectedChassisId;
  }

  _isLightsaberCrystalCompatible(id) {
    const crystal = this._findLightsaberCatalogOption('crystals', id);
    if (!crystal) return false;
    if (this._isLightsaberTuningMode()) return true;
    const compatible = crystal.system?.lightsaber?.compatibleChassis || crystal.compatibleChassis || [];
    if (!Array.isArray(compatible) || !compatible.length || compatible.includes('*')) return true;
    return compatible.includes(this._getSelectedLightsaberChassisId());
  }

  _isLightsaberAccessoryCompatible(id) {
    const accessory = this._findLightsaberCatalogOption('accessories', id);
    if (!accessory) return false;
    if (this._isLightsaberTuningMode()) return true;
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


  _getLightsaberHeroStats({ editItem, chassis, preview, slotState, totalCost } = {}) {
    const system = editItem?.system || {};
    const chassisSystem = chassis?.system || {};
    const name = String(editItem?.name || chassis?.name || '').toLowerCase();
    const damage = system.damage || system.damageDice || chassisSystem.damage || chassisSystem.damageDice || (name.includes('shoto') || name.includes('short') ? '2d6' : '2d8');
    const critical = system.critical || system.crit || system.threatRange || chassisSystem.critical || chassisSystem.crit || (name.includes('lightsaber') ? '19-20' : '20');
    const damageType = system.damageType || chassisSystem.damageType || 'Energy';
    const range = system.range || chassisSystem.range || 'Melee';
    return [
      { key: 'Damage', value: damage },
      { key: 'Critical', value: critical },
      { key: 'Damage Type', value: damageType },
      { key: 'Range', value: range },
      { key: 'Build DC', value: preview?.finalDc ?? 0 },
      { key: 'Cost', value: `${Number(totalCost ?? 0) || 0} cr` },
      { key: 'UTF +10', value: preview?.take10Total ?? '—' },
      { key: 'Slots', value: `${slotState?.usedSlots ?? 0}/${slotState?.totalAvailable ?? 0}` }
    ];
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


  _getLightsaberActiveTab(canChangeChassis = false) {
    const allowed = new Set(['crystal', 'hilt', 'color']);
    if (canChangeChassis) allowed.add('chassis');
    const tab = this._lightsaber.activeTab || 'crystal';
    return allowed.has(tab) ? tab : 'crystal';
  }

  _buildLightsaberComponentIntel({ activeTab, chassis, crystal, accessories = [], colorOptions = [] } = {}) {
    const inspected = this._lightsaber.inspectedComponent;
    const selectedColor = colorOptions.find(option => option.selected) || colorOptions[0] || null;
    let component = null;
    if (inspected?.type === 'crystal') component = this._findLightsaberCatalogOption('crystals', inspected.key);
    if (inspected?.type === 'accessory') component = this._findLightsaberCatalogOption('accessories', inspected.key);
    if (inspected?.type === 'chassis') component = this._findLightsaberCatalogOption('chassis', inspected.key);
    if (inspected?.type === 'color') component = selectedColor;

    let kind = 'Crystal';
    if (!component) {
      if (activeTab === 'hilt') {
        component = accessories[accessories.length - 1] || this._catalogs.accessories?.[0] || null;
        kind = 'Hilt Accessory';
      } else if (activeTab === 'color') {
        component = selectedColor;
        kind = 'Blade Color';
      } else if (activeTab === 'chassis') {
        component = chassis;
        kind = 'Chassis';
      } else {
        component = crystal;
        kind = 'Kyber Crystal';
      }
    } else if (inspected?.type === 'accessory') kind = 'Hilt Accessory';
    else if (inspected?.type === 'chassis') kind = 'Chassis';
    else if (inspected?.type === 'color') kind = 'Blade Color';
    else kind = 'Kyber Crystal';

    if (!component) {
      return {
        kind: 'Selection Intel',
        name: 'No component selected',
        description: 'Choose a crystal, hilt accessory, or blade color to inspect its effect here.',
        fields: []
      };
    }

    if (kind === 'Blade Color') {
      return {
        kind,
        name: component.label || component.key || this._lightsaber.selectedBladeColor || 'Blade Color',
        description: 'Blade color is a visual resonance pass. The available palette is governed by the selected crystal.',
        colorHex: component.hex,
        fields: [
          { key: 'Color', value: component.label || component.key || '—' },
          { key: 'Source', value: 'Selected crystal' },
          { key: 'Cost', value: '0 cr' }
        ]
      };
    }

    const system = component.system || {};
    const description = this._stripHtml(system.description || component.description || 'No rules text is recorded for this component yet.');
    const cost = Number(system.cost ?? system.baseCost ?? component.cost ?? 0) || 0;
    const dc = Number(system.lightsaber?.buildDcModifier ?? system.baseBuildDc ?? component.buildDcModifier ?? 0) || 0;
    const slotCost = Number(system.lightsaber?.upgradeSlots ?? system.upgradeSlots ?? component.slotCost ?? 0) || 0;
    const bladeColor = system.lightsaber?.bladeColor || component.bladeColor || null;
    const selected = (kind === 'Kyber Crystal' && (component.id === this._lightsaber.selectedCrystalId || component._id === this._lightsaber.selectedCrystalId))
      || (kind === 'Hilt Accessory' && this._lightsaber.selectedAccessoryIds.includes(component.id))
      || (kind === 'Chassis' && (component.id === this._lightsaber.selectedChassisId || component.system?.chassisId === this._lightsaber.selectedChassisId));
    const fields = [
      { key: 'Cost', value: `${cost} cr` }
    ];
    if (kind === 'Kyber Crystal') {
      fields.push({ key: 'Blade Color', value: bladeColor || 'Varies' });
      fields.push({ key: 'Build DC', value: dc >= 0 ? `+${dc}` : String(dc) });
    } else if (kind === 'Hilt Accessory') {
      fields.push({ key: 'Slots', value: slotCost || 1 });
      fields.push({ key: 'Build DC', value: dc >= 0 ? `+${dc}` : String(dc) });
    } else if (kind === 'Chassis') {
      fields.push({ key: 'Damage', value: system.damage || system.damageDice || '—' });
      fields.push({ key: 'Slots', value: system.upgradeSlots ?? '—' });
    }
    fields.push({ key: 'Status', value: selected ? 'Selected' : 'Available' });
    return {
      kind,
      name: component.name || component.label || component.id || 'Component',
      description,
      selected,
      fields
    };
  }

  async _prepareLightsaberContext(visibleCategories) {
    const ownedSabers = LightsaberConstructionEngine.getOwnedLightsabers(this.actor);
    const editItem = this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
    const chassis = this._findLightsaberCatalogOption('chassis', this._lightsaber.selectedChassisId);
    const crystal = this._findLightsaberCatalogOption('crystals', this._lightsaber.selectedCrystalId);
    const slotState = this._getLightsaberAccessorySlotState();
    const selectedAccessories = this._lightsaber.selectedAccessoryIds
      .map(id => this._findLightsaberCatalogOption('accessories', id))
      .filter(Boolean);
    const canChangeChassis = this._canChangeLightsaberChassis(editItem);
    const activeTab = this._getLightsaberActiveTab(canChangeChassis);
    this._lightsaber.activeTab = activeTab;
    const lightsaberVisualProfile = WeaponVisualProfileResolver.resolve(editItem, {
      actor: this.actor,
      lightsaberState: this._lightsaber,
      draft: { bladeColor: this._lightsaber.selectedBladeColor }
    });
    const colorOptions = this._resolveBladeColorOptions(crystal).map(key => ({
      key,
      label: key,
      hex: BLADE_COLOR_MAP[key] || '#00ffff',
      selected: key === lightsaberVisualProfile.bladeColor
    }));
    const componentIntel = this._buildLightsaberComponentIntel({ activeTab, chassis, crystal, accessories: selectedAccessories, colorOptions });
    const config = this._getLightsaberConfig();
    const preview = editItem
      ? this._buildLightsaberEditPreview({ chassis, crystal, accessories: selectedAccessories })
      : (chassis && crystal ? await LightsaberConstructionEngine.getBuildPreview(this.actor, config) : null);
    const credits = Number(this.actor.system?.credits ?? 0) || 0;
    const totalCost = Number(preview?.totalCost ?? 0) || 0;
    const canBuild = editItem
      ? !!(chassis && crystal && preview?.success && !slotState.isOverflowing)
      : !!(chassis && crystal && preview?.success && !slotState.isOverflowing && (this._lightsaber.selectedCheckMode !== 'take10' || preview?.canTake10));
    const bladeHex = lightsaberVisualProfile.bladeHex;
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
        id: getWorkbenchItemId(item),
        name: item.name,
        img: item.img,
        subtitle: item.system?.chassisId || 'lightsaber',
        active: getWorkbenchItemId(item) === getWorkbenchItemId(editItem),
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
        stats: this._getLightsaberHeroStats({ editItem, chassis, preview, slotState, totalCost })
      },
      ...(await this._getLightsaberMentorContext(editItem)),
      lightsaber: {
        mode: editItem ? 'tuning existing blade' : (canChangeChassis ? 'construct' : 'construction locked'),
        activeTab,
        tabCrystal: activeTab === 'crystal',
        tabHilt: activeTab === 'hilt',
        tabColor: activeTab === 'color',
        tabChassis: activeTab === 'chassis',
        tabs: [
          { key: 'crystal', label: 'Crystal', active: activeTab === 'crystal' },
          { key: 'hilt', label: 'Hilt', active: activeTab === 'hilt' },
          ...(canChangeChassis ? [{ key: 'chassis', label: 'Chassis', active: activeTab === 'chassis' }] : []),
          { key: 'color', label: 'Blade Color', active: activeTab === 'color' }
        ],
        componentIntel,
        showChassis: canChangeChassis,
        chassisLocked: !canChangeChassis,
        selectedChassisName: chassis?.name || 'Fixed Chassis',
        chassisLockReason: editItem
          ? 'This is an existing/free lightsaber. Chassis construction is locked; tune the crystal, blade color, and hilt accessories instead.'
          : 'Full chassis construction unlocks at level 7 for Jedi or Force-sensitive characters.',
        bladeHex,
        visualProfile: lightsaberVisualProfile,
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
          incompatible: !this._isLightsaberTuningMode() && !this._isLightsaberCrystalCompatible(option.id)
        })),
        accessories: this._catalogs.accessories.map(option => ({
          ...option,
          description: this._stripHtml(option.system?.description || option.description),
          cost: Number(option.system?.cost ?? option.cost ?? 0) || 0,
          buildDcModifier: Number(option.system?.lightsaber?.buildDcModifier ?? option.buildDcModifier ?? 0) || 0,
          selected: this._lightsaber.selectedAccessoryIds.includes(option.id),
          incompatible: !this._isLightsaberTuningMode() && !this._isLightsaberAccessoryCompatible(option.id),
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
        blockedReason: canBuild ? null : (slotState.isOverflowing ? 'Accessory slot budget exceeded.' : (editItem ? 'Select a compatible crystal and hilt configuration.' : (this._lightsaber.selectedCheckMode === 'take10' && preview && !preview.canTake10 ? 'Take 10 does not meet the build DC.' : 'Full lightsaber construction requires level 7 and Force sensitivity.'))),
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
      id: getWorkbenchItemId(item),
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
    const editItem = this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
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
      _id: getWorkbenchItemId(item),
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

    if (WeaponVisualProfileResolver.isBlaster(item)) {
      const visualProfile = WeaponVisualProfileResolver.resolve(item, { actor: this.actor, draft });
      itemUpdate['flags.foundryvtt-swse.boltColor'] = visualProfile.boltColor;
      itemUpdate['flags.foundryvtt-swse.fxType'] = visualProfile.fxType;
      itemUpdate['flags.swse.boltColor'] = visualProfile.boltColor;
      itemUpdate['flags.swse.fxType'] = visualProfile.fxType;
      itemUpdate['flags.swse.blasterUpgrades'] = [...draft.selectedUpgrades];
    } else if (item.type === 'weapon') {
      const subtypeKey = this._getItemSubtypeKey(item);
      const isRangedWeapon = ['blaster', 'pistol', 'rifle', 'carbine', 'heavy', 'grenade'].includes(subtypeKey);
      if (isRangedWeapon) {
        itemUpdate['flags.swse.blasterUpgrades'] = [...draft.selectedUpgrades];
      } else {
        itemUpdate['flags.swse.meleeUpgrades'] = [...draft.selectedUpgrades];
        itemUpdate['flags.swse.accentColor'] = draft.accentColor;
      }
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
    SafetyEngine.markOperationInFlight(getWorkbenchItemId(item), operationKey);
    if (this._isStoreStageMode()) {
      try {
        await this._stageCurrentItemToCart(item, draft, preview, itemUpdate);
      } finally {
        this._pendingApply = false;
        SafetyEngine.clearOperationInFlight(getWorkbenchItemId(item), operationKey);
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
          itemId: getWorkbenchItemId(item),
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
      this._drafts.set(item.id, this._getInitialDraft(this._getActorItemById(getWorkbenchItemId(item)) || item));
      await this._renderPreservingUi();
    } catch (error) {
      console.error('[ItemCustomizationWorkbench] Apply failed', error);
      ui.notifications.error(`Failed to apply customization: ${error.message}`);
    } finally {
      this._pendingApply = false;
      SafetyEngine.clearOperationInFlight(getWorkbenchItemId(item), operationKey);
    }
  }
}
