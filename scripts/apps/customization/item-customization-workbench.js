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
import { MirajAttunementApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/miraj-attunement-app.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { BLADE_COLOR_MAP, VARIES_COLOR_LIST, DEFAULT_BLADE_COLOR } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";
import { ItemProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/customization/item-profile-resolver.js";
import { CustomizationCostEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/customization-cost-engine.js";
import { UpgradeSlotEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/upgrade-slot-engine.js";
import { SafetyEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js";
import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { getMentor } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import { TechSpecialistModificationService } from "/systems/foundryvtt-swse/scripts/engine/customization/tech-specialist-modification-service.js";
import { MentorTranslationIntegration } from "/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js";
import { isEnergyShieldItem as isCanonicalEnergyShieldItem, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { buildStoreSuggestionContext } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";
import { applyWorkbenchModificationSuggestions } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/workbench-modification-suggestions.js";

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


function escapeWorkbenchHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCaseWorkbenchToken(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function coerceWorkbenchNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value ?? '').match(/[-+]?\d+/);
  return match ? Number(match[0]) : fallback;
}

function formatSignedWorkbenchNumber(value) {
  const number = Number(value) || 0;
  if (!number) return '0';
  return number > 0 ? `+${number}` : String(number);
}

function titleCaseDamageType(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Energy';
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function addDamageFormulaBonus(formula, bonus) {
  const amount = Number(bonus) || 0;
  const text = String(formula ?? '').trim() || '2d8';
  if (!amount) return text;

  const normalized = text.replace(/\s+/g, '');
  const match = normalized.match(/^(\d+d\d+)([+-]\d+)?$/i);
  if (match) {
    const base = match[1];
    const current = Number(match[2] || 0) || 0;
    const total = current + amount;
    return total ? `${base}${formatSignedWorkbenchNumber(total)}` : base;
  }

  return `${text}${amount > 0 ? '+' : ''}${amount}`;
}

function adjustDamageFormulaDieStep(formula, stepDelta) {
  const delta = Number(stepDelta) || 0;
  const text = String(formula ?? '').trim() || '2d8';
  if (!delta) return text;

  const normalized = text.replace(/\s+/g, '');
  const match = normalized.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return text;

  const dieSteps = [2, 3, 4, 6, 8, 10, 12];
  const count = match[1];
  const sides = Number(match[2]);
  const suffix = match[3] || '';
  const index = dieSteps.indexOf(sides);
  if (index < 0) return text;
  const nextIndex = Math.min(dieSteps.length - 1, Math.max(0, index + delta));
  return `${count}d${dieSteps[nextIndex]}${suffix}`;
}

function extendCriticalRangeText(critical, amount = 0) {
  const by = Number(amount) || 0;
  const text = String(critical ?? '').trim() || '20';
  if (!by) return text;

  const range = text.match(/^(\d+)\s*-\s*20$/);
  if (range) {
    const start = Math.max(2, Number(range[1]) - by);
    return start >= 20 ? '20' : `${start}-20`;
  }
  if (/^20$/.test(text)) {
    const start = Math.max(2, 20 - by);
    return start >= 20 ? '20' : `${start}-20`;
  }
  return `${text} (${by > 0 ? '+' : ''}${by} range)`;
}

function appendCriticalNote(critical, note) {
  const text = String(critical ?? '').trim() || '20';
  const cleanNote = String(note ?? '').trim();
  if (!cleanNote) return text;
  return text.includes(cleanNote) ? text : `${text} (${cleanNote})`;
}

function normalizeCriticalMultiplierText(value) {
  const text = String(value ?? 'x2').trim();
  if (!text) return 'x2';
  const numeric = text.match(/^(?:x|×)?\s*(\d+)$/i);
  if (numeric) return `x${numeric[1]}`;
  return text.replace(/×/g, 'x');
}

function formatCriticalRangeAndMultiplier(critical, multiplier = 'x2') {
  const raw = String(critical ?? '').trim() || '20';
  const normalized = raw.replace(/×/g, 'x').replace(/\s+/g, ' ');
  const embedded = normalized.match(/^(.+?)\s*x\s*(\d+)(.*)$/i);
  if (embedded) {
    const range = embedded[1].trim() || '20';
    const suffix = embedded[3]?.trim();
    return `${range} x${embedded[2]}${suffix ? ` ${suffix}` : ''}`;
  }
  return `${normalized} ${normalizeCriticalMultiplierText(multiplier)}`;
}

function isEnergyShieldItem(item) {
  return isCanonicalEnergyShieldItem(item);
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
  const armor = resolveArmorData(item);
  const sr = Number(armor.shieldRating || String(item?.name || '').match(/SR\s*(\d+)/i)?.[1] || 0) || 0;
  const table = ENERGY_SHIELD_RULES.find(row => row.sr === sr) || null;
  const armorType = String(armor.proficiencyRequired || table?.proficiency || 'Light').toLowerCase();
  const typeLabel = table?.type || (armorType.includes('heavy') ? 'Heavy Armor' : armorType.includes('medium') ? 'Medium Armor' : 'Light Armor');
  const proficiency = table?.proficiency || (typeLabel.split(' ')[0] || 'Light');
  const chargesMax = Number(armor.chargesMax || system?.maxCharges || 5) || 5;
  const chargesCurrent = Number(armor.chargesCurrent || chargesMax) || chargesMax;
  return {
    sr,
    typeLabel,
    proficiency,
    maxDex: armor.maxDexBonus,
    armorCheckPenalty: armor.armorCheckPenalty,
    cost: Number(armor.cost ?? table?.cost ?? 0) || 0,
    chargesCurrent,
    chargesMax,
    activated: armor.activated,
    currentSR: armor.currentSR
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
  constructor(actor, { itemId = null, category = null, initialCategory = null, mode = 'owned', sourceItem = null, applyMode = null, onStage = null, routeIntent = null, entryPoint = null } = {}) {
    super({});
    this.actor = actor;
    this.mode = mode;
    this.initialCategory = initialCategory || category || null;
    this.routeIntent = routeIntent || null;
    this.entryPoint = entryPoint || null;
    this.applyMode = applyMode || (mode === 'store-stage' ? 'stage-to-cart' : 'apply-owned');
    this.sourceItem = sourceItem || null;
    this.onStage = typeof onStage === 'function' ? onStage : null;
    this.selectedCategory = category || initialCategory || null;
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
    this._workbenchSuggestionContext = null;
    this._workbenchSuggestionActorId = null;
    this._customizationInspector = null;
    this._workbenchTab = 'modifications';
    this._lightsaber = {
      selectedChassisId: null,
      selectedCrystalId: null,
      selectedAccessoryIds: [],
      selectedBladeColor: DEFAULT_BLADE_COLOR,
      selectedCheckMode: 'roll',
      constructionResult: null,
      selectedOwnedSaberId: (this.selectedCategory === 'lightsaber' && mode === 'construct') ? null : (itemId || null),
      activeTab: (this.selectedCategory === 'lightsaber' && mode === 'construct') ? 'chassis' : 'crystal',
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
    const priorUpgradesByKey = new Map();
    for (const entry of prior.installedUpgrades || []) {
      if (entry?.upgradeKey) priorUpgradesByKey.set(entry.upgradeKey, foundry.utils.deepClone(entry));
    }
    const selectedUpgradeCards = this._getSelectedUpgradeInstances(item, draft);
    const upgradeCardsByKey = new Map(selectedUpgradeCards.map(card => [card.key, card]));
    const installedByKey = new Map();
    for (const key of draft.selectedUpgrades || []) {
      const card = upgradeCardsByKey.get(key);
      const priorEntry = priorUpgradesByKey.get(key);
      installedByKey.set(key, {
        ...(priorEntry || {}),
        instanceId: priorEntry?.instanceId || foundry.utils.randomID(),
        upgradeKey: key,
        name: card?.name || priorEntry?.name || key,
        slotCost: Number(card?.slotCost ?? priorEntry?.slotCost ?? 1) || 1,
        operationCost: Number(card?.costCredits ?? priorEntry?.operationCost ?? 0) || 0,
        source: 'item-customization-workbench'
      });
    }

    const priorTemplatesByKey = new Map();
    for (const entry of prior.appliedTemplates || []) {
      if (entry?.templateKey) priorTemplatesByKey.set(entry.templateKey, foundry.utils.deepClone(entry));
    }
    const templatesByKey = new Map();
    for (const templateKey of draft.selectedTemplates || []) {
      const priorEntry = priorTemplatesByKey.get(templateKey);
      templatesByKey.set(templateKey, {
        ...(priorEntry || {}),
        instanceId: priorEntry?.instanceId || foundry.utils.randomID(),
        templateKey,
        operationCost: Number(priorEntry?.operationCost ?? GearTemplatesEngine.getTemplateCost(templateKey, item)) || 0,
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
    const currentTemplateKeys = this._getCanonicalTemplateKeys(item);
    for (const key of draft.selectedTemplates || []) {
      const installed = currentTemplateKeys.includes(key);
      const validation = installed ? { valid: true } : GearTemplatesEngine.canApplyTemplate(item, key);
      if (!validation.valid) return { ok: false, reason: validation.reason || `template_blocked:${key}` };
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

  _getLightsaberConstructionSummary() {
    try {
      const eligibility = LightsaberConstructionEngine.getEligibility(this.actor) || {};
      const hasSelfBuilt = LightsaberConstructionEngine.hasSelfBuiltLightsaber(this.actor);
      const deferred = this.actor?.getFlag?.('foundryvtt-swse', 'lightsaberConstructionDeferred') === true;
      const available = !!eligibility.eligible && !hasSelfBuilt;
      return {
        visible: available || deferred || this.routeIntent === 'lightsaber-construction' || this.mode === 'construct',
        available,
        eligible: !!eligibility.eligible,
        deferred,
        hasSelfBuilt,
        reason: eligibility.reason || (hasSelfBuilt ? 'This actor has already completed a self-built lightsaber milestone.' : null),
        route: {
          surface: 'workbench',
          category: 'lightsaber',
          initialCategory: 'lightsaber',
          mode: 'construct',
          routeIntent: 'lightsaber-construction',
          entryPoint: this.entryPoint || 'workbench'
        }
      };
    } catch (error) {
      console.warn('SWSE [Workbench] lightsaber construction summary failed', { actor: this.actor?.name, error });
      return { visible: false, available: false, eligible: false, deferred: false, hasSelfBuilt: false, reason: 'Eligibility could not be evaluated.', route: null };
    }
  }

  _isLightsaberConstructionRoute() {
    const summary = this._getLightsaberConstructionSummary();
    return this.selectedCategory === 'lightsaber'
      && (this.mode === 'construct' || this.routeIntent === 'lightsaber-construction')
      && !summary.hasSelfBuilt
      && !this._lightsaber?.selectedOwnedSaberId;
  }

  _enterLightsaberConstructionMode(entryPoint = 'workbench') {
    this.selectedCategory = 'lightsaber';
    this.initialCategory = 'lightsaber';
    this.mode = 'construct';
    this.routeIntent = 'lightsaber-construction';
    this.entryPoint = entryPoint || this.entryPoint || 'workbench';
    this.selectedItemId = null;
    this._lightsaber.selectedOwnedSaberId = null;
    this._lightsaber.activeTab = 'chassis';
    this._lightsaber.inspectedComponent = null;
    this._lightsaber.constructionResult = null;
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

    const constructionSummary = this._getLightsaberConstructionSummary();
    const forceLightsaberForge = constructionSummary.available
      || this.routeIntent === 'lightsaber-construction'
      || this.mode === 'construct'
      || this.selectedCategory === 'lightsaber';

    return CATEGORY_ORDER
      .map(entry => ({ ...entry, items: byCategory[entry.key] || [], forceVisible: entry.key === 'lightsaber' && forceLightsaberForge }))
      .filter(entry => entry.items.length > 0 || entry.forceVisible);
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
      if (this._isLightsaberConstructionRoute()) {
        this._lightsaber.selectedOwnedSaberId = null;
        this._lightsaber.activeTab ||= 'chassis';
        return { categories, item: null };
      }
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
        removing: installed && !selected,
        inspected: this._getCustomizationInspectorKey('upgrade', key) === this._getCustomizationInspectorKey(this._customizationInspector?.type, this._customizationInspector?.key),
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
      removing: currentApplied.includes(template.key) && !draft.selectedTemplates.includes(template.key),
      inspected: this._getCustomizationInspectorKey('template', template.key) === this._getCustomizationInspectorKey(this._customizationInspector?.type, this._customizationInspector?.key),
      disabled: template.incompatible && !draft.selectedTemplates.includes(template.key) && !currentApplied.includes(template.key),
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
      removing: current.has(key) && !draftAreas.has(key),
      inspected: this._getCustomizationInspectorKey('structural', key) === this._getCustomizationInspectorKey(this._customizationInspector?.type, this._customizationInspector?.key),
      disabled: false
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

  async _getWorkbenchSuggestionContext() {
    const actorId = this.actor?.id || this.actor?.uuid || null;
    if (this._workbenchSuggestionContext && this._workbenchSuggestionActorId === actorId) return this._workbenchSuggestionContext;
    try {
      this._workbenchSuggestionContext = await buildStoreSuggestionContext(this.actor, { pendingData: {} });
      this._workbenchSuggestionActorId = actorId;
    } catch (error) {
      console.warn('[ItemCustomizationWorkbench] Modification suggestion context failed', { actor: this.actor?.name, error });
      this._workbenchSuggestionContext = { actorId, credits: Number(this.actor?.system?.credits ?? 0) || 0 };
      this._workbenchSuggestionActorId = actorId;
    }
    return this._workbenchSuggestionContext;
  }

  _attachModificationSuggestions({ item, upgrades = [], templates = [], storeContext = null } = {}) {
    if (!item || !storeContext) return { upgrades, templates };
    const baseOptions = {
      workbenchMode: this.mode,
      applyMode: this.applyMode,
      assumeTargetUsed: true,
      isStoreStageMode: this._isStoreStageMode()
    };
    const suggestedUpgrades = applyWorkbenchModificationSuggestions({
      actor: this.actor,
      targetItem: item,
      cards: upgrades,
      storeContext,
      options: baseOptions
    });
    const suggestedTemplates = applyWorkbenchModificationSuggestions({
      actor: this.actor,
      targetItem: item,
      cards: templates.map(card => ({
        ...card,
        costCredits: card.costPreview,
        slotCost: 0,
        effect: card.rulesText || card.restriction || card.description
      })),
      storeContext,
      options: { ...baseOptions, template: true }
    }).map((card, index) => ({
      ...templates[index],
      suggestion: card.suggestion
    }));
    return { upgrades: suggestedUpgrades, templates: suggestedTemplates };
  }


  _getCustomizationInspectorKey(type, key = null) {
    const kind = String(type || '').trim().toLowerCase();
    if (!kind) return '';
    return `${kind}:${key === null || key === undefined || key === '' ? '__default__' : String(key)}`;
  }

  _setCustomizationInspector(type, key = null) {
    const kind = String(type || '').trim().toLowerCase();
    if (!kind) return null;
    this._customizationInspector = {
      type: kind,
      key: key === null || key === undefined || key === '' ? null : String(key)
    };
    return this._customizationInspector;
  }

  _getCustomizationButtonLabel(row, baseName = 'Modification') {
    if (!row) return `Select ${baseName}`;
    if (row.installed && row.selected) return `Uninstall ${baseName}`;
    if (row.installed && !row.selected) return `Restore ${baseName}`;
    if (row.selected) return `Remove ${baseName}`;
    return `Select ${baseName}`;
  }

  _makeCustomizationDetailRow({ type, card, action, kind, baseName, nameKey = 'name', costKey = 'costCredits', descriptionFallback = '', slotCost = undefined } = {}) {
    const key = card?.key ?? null;
    const selected = !!card?.selected;
    const installed = !!card?.installed;
    const removing = installed && !selected;
    const disabled = !!card?.disabled;
    const row = {
      type,
      inspectorKey: this._getCustomizationInspectorKey(type, key),
      kind,
      action,
      key,
      selectable: !disabled,
      name: card?.[nameKey] || card?.label || key || kind,
      description: card?.description || card?.rulesText || descriptionFallback,
      effect: card?.effect || card?.rulesText || card?.restriction || '',
      cost: Number(card?.[costKey] ?? card?.cost ?? 0),
      slotCost: slotCost === undefined ? Number(card?.slotCost ?? 0) : slotCost,
      selected,
      installed,
      removing,
      disabled,
      suggestion: card?.suggestion || null,
      suggestionTier: card?.suggestion?.tier || '',
      suggestionLabel: card?.suggestion?.tierLabel || '',
      suggestionReasons: card?.suggestion?.explanations || []
    };
    row.buttonLabel = this._getCustomizationButtonLabel(row, baseName);
    return row;
  }

  _buildModificationDetailRail({ item, upgrades = [], templates = [], structuralActions = null, preview = null } = {}) {
    const upgradeRows = upgrades.map(card => this._makeCustomizationDetailRow({
      type: 'upgrade',
      card,
      action: 'toggle-upgrade',
      kind: 'Modification',
      baseName: 'Modification',
      descriptionFallback: 'No description is recorded for this modification yet.',
      costKey: 'costCredits'
    }));

    const templateRows = templates.map(card => this._makeCustomizationDetailRow({
      type: 'template',
      card: {
        ...card,
        effect: card.rulesText || card.restriction || '',
        cost: Number(card.costPreview ?? 0),
        slotCost: null
      },
      action: 'toggle-template',
      kind: 'Template',
      baseName: 'Template',
      descriptionFallback: 'No template notes are recorded for this entry yet.',
      costKey: 'cost',
      slotCost: null
    }));

    const structuralRows = [];
    if (structuralActions?.sizeIncrease) {
      const sizeRow = this._makeCustomizationDetailRow({
        type: 'structural',
        card: {
          key: 'size_increase',
          label: structuralActions.sizeIncrease.label,
          description: structuralActions.sizeIncrease.description || STRUCTURAL_DETAILS.size_increase.description,
          effect: structuralActions.sizeIncrease.effect || STRUCTURAL_DETAILS.size_increase.effect,
          cost: this._costEngine.getSizeIncreaseOperationCost?.(item) ?? 0,
          selected: !!structuralActions.sizeIncrease.selected,
          installed: !!structuralActions.sizeIncrease.installed,
          disabled: !!structuralActions.sizeIncrease.disabled
        },
        action: 'toggle-size-increase',
        kind: 'Structural',
        baseName: 'Structural Change',
        costKey: 'cost',
        slotCost: null
      });
      structuralRows.push(sizeRow);
    }
    for (const strip of structuralActions?.strips || []) {
      structuralRows.push(this._makeCustomizationDetailRow({
        type: 'structural',
        card: {
          ...strip,
          name: strip.label,
          effect: strip.effect || STRUCTURAL_DETAILS[strip.key]?.effect || '+1 upgrade slot',
          cost: this._costEngine.getStripOperationCost?.(item) ?? 0
        },
        action: 'toggle-strip',
        kind: 'Structural',
        baseName: 'Structural Change',
        descriptionFallback: STRUCTURAL_DETAILS[strip.key]?.description || 'Trade a stock capability for one additional upgrade slot.',
        costKey: 'cost',
        slotCost: null
      }));
    }

    const allRows = [...upgradeRows, ...templateRows, ...structuralRows];
    const inspectedKey = this._getCustomizationInspectorKey(this._customizationInspector?.type, this._customizationInspector?.key);
    let inspectedRow = inspectedKey ? allRows.find(row => row.inspectorKey === inspectedKey) : null;
    if (!inspectedRow && inspectedKey) this._customizationInspector = null;
    const stagedRows = allRows.filter(row => (row.selected && !row.installed) || row.removing);
    const installedRows = allRows.filter(row => row.installed && row.selected);
    const primaryRow = inspectedRow || stagedRows[0] || installedRows[0] || allRows[0] || null;
    for (const row of allRows) row.inspected = !!primaryRow && row.inspectorKey === primaryRow.inspectorKey;

    return {
      hasRows: allRows.length > 0,
      primaryRow,
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
    const lightsaberConstruction = this._getLightsaberConstructionSummary();
    const visibleCategories = categories.map(category => ({
      ...category,
      active: category.key === this.selectedCategory,
      count: category.key === 'lightsaber' && lightsaberConstruction.available && category.items.length === 0 ? 'READY' : category.items.length,
      special: category.special
    }));
    if (this.selectedCategory === 'lightsaber') {
      return { ...shellContext, ...(await this._prepareLightsaberContext(visibleCategories)) };
    }
    if (!item) {
      const mentorText = await this._getWorkbenchDialogue('delta', ['workshop', 'empty'], `Can't tune air, genius. Get a weapon, armor plate, or a piece of gear in your inventory, then we'll make somethin' useful outta it.`);
      return {
        ...shellContext,
        actor: this.actor,
        categories: visibleCategories,
        lightsaberConstruction,
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

    let upgrades = energyShieldItem ? [] : this._getUpgradeCatalog(item, draft);
    let templates = this._getTemplateCards(item, draft);
    const workbenchSuggestionContext = await this._getWorkbenchSuggestionContext();
    ({ upgrades, templates } = this._attachModificationSuggestions({ item, upgrades, templates, storeContext: workbenchSuggestionContext }));
    const currentStructuralState = item.flags?.swse?.customizationStructural || this._getCustomizationState(item).structural || { sizeIncreaseApplied: false, strippedAreas: [] };
    const structuralActions = {
      sizeIncrease: {
        selected: !!draft.structural?.sizeIncreaseApplied,
        installed: !!currentStructuralState.sizeIncreaseApplied,
        removing: !!currentStructuralState.sizeIncreaseApplied && !draft.structural?.sizeIncreaseApplied,
        inspected: this._getCustomizationInspectorKey('structural', 'size_increase') === this._getCustomizationInspectorKey(this._customizationInspector?.type, this._customizationInspector?.key),
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

    const availableTabs = [];
    if (energyShieldItem) {
      availableTabs.push({ key: 'modifications', label: 'Maintenance', hint: '' });
    } else {
      availableTabs.push({ key: 'modifications', label: 'Modifications', hint: `${upgrades.length} avail` });
      availableTabs.push({ key: 'structural', label: 'Structural', hint: '' });
    }
    if (templates.length) availableTabs.push({ key: 'templates', label: 'Templates', hint: `${templates.length} avail` });
    availableTabs.push({ key: 'appearance', label: 'Appearance', hint: '' });
    if (!availableTabs.find(t => t.key === this._workbenchTab)) this._workbenchTab = availableTabs[0].key;
    for (const t of availableTabs) t.active = t.key === this._workbenchTab;
    const workbenchTab = this._workbenchTab;

    return {
      ...shellContext,
      actor: this.actor,
      categories: visibleCategories,
      lightsaberConstruction,
      hasItems: true,
      search: currentSearch,
      hasSearch: !!currentSearch,
      hasInventoryResults: inventoryItems.length > 0,
      inventoryItems,
      currentItem: this._getItemSummary(item, draft, preview),
      techSpecialist: TechSpecialistModificationService.getUiContext(this.actor, item, { subjectKind: 'item' }),
      ...(await this._getWorkshopMentorContext(item)),
      isEnergyShield: energyShieldItem,
      energyShield: energyShieldItem ? getEnergyShieldRules(item) : null,
      upgrades,
      templates,
      structuralActions,
      detailRail,
      workbenchSuggestionContext,
      availableTabs,
      workbenchTabModifications: workbenchTab === 'modifications',
      workbenchTabStructural: workbenchTab === 'structural',
      workbenchTabTemplates: workbenchTab === 'templates',
      workbenchTabAppearance: workbenchTab === 'appearance',
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

      case 'start-lightsaber-construction': {
        this._enterLightsaberConstructionMode(target?.dataset?.entryPoint || 'workbench');
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
        this._setCustomizationInspector('upgrade', key);
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
        this._setCustomizationInspector('template', key);
        const idx = draft.selectedTemplates.indexOf(key);
        if (idx >= 0) draft.selectedTemplates.splice(idx, 1);
        else {
          const installed = this._getCanonicalTemplateKeys(item).includes(key);
          const validation = installed ? { valid: true } : GearTemplatesEngine.canApplyTemplate(item, key);
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
        this._setCustomizationInspector('structural', 'size_increase');
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
        this._setCustomizationInspector('structural', key);
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

      case 'open-color-picker': {
        const colorAction = target?.dataset?.colorAction;
        if (!colorAction) return;
        await this._openColorPickerDialog(colorAction);
        return;
      }

      case 'set-workbench-tab': {
        const tab = target?.dataset?.tab;
        if (!tab) return;
        this._workbenchTab = tab;
        await this._renderPreservingUi();
        return;
      }

      case 'inspect-upgrade': {
        const item = this._getCurrentItem();
        const key = target?.dataset?.key;
        if (!item || !key) return;
        this._setCustomizationInspector('upgrade', key);
        await this._renderPreservingUi();
        return;
      }

      case 'inspect-template': {
        const item = this._getCurrentItem();
        const key = target?.dataset?.key;
        if (!item || !key) return;
        this._setCustomizationInspector('template', key);
        await this._renderPreservingUi();
        return;
      }

      case 'inspect-structural': {
        const item = this._getCurrentItem();
        const key = target?.dataset?.key;
        if (!item || !key) return;
        this._setCustomizationInspector('structural', key);
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
        const canChangeChassis = this._canChangeLightsaberChassis();
        const allowedTabs = new Set(this._getLightsaberStepState({ canChangeChassis }).map(step => step.key));
        if (!allowedTabs.has(tab)) return;
        this._lightsaber.activeTab = tab;
        this._lightsaber.inspectedComponent = null;
        await this._renderPreservingUi();
        return;
      }

      case 'inspect-lightsaber-component': {
        const type = target?.dataset?.componentType || target?.dataset?.lightsaberInspectType;
        const key = target?.dataset?.key || target?.dataset?.lightsaberInspectKey;
        if (!this._inspectLightsaberComponent(type, key, { syncTab: true, forceRender: true })) return;
        await this._renderPreservingUi();
        return;
      }

      case 'select-lightsaber-chassis': {
        if (!this._canChangeLightsaberChassis()) {
          ui.notifications.info('This saber is in tuning mode; its chassis is fixed until full construction is unlocked.');
          return;
        }
        this._lightsaber.selectedChassisId = target?.dataset?.key;
        this._lightsaber.inspectedComponent = { type: 'chassis', key: this._lightsaber.selectedChassisId };
        this._lightsaber.constructionResult = null;
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
        const crystalOption = this._findLightsaberCatalogOption('crystals', key);
        const crystalKey = this._getLightsaberComponentKey(crystalOption) || key;
        this._lightsaber.selectedCrystalId = crystalKey;
        this._lightsaber.constructionResult = null;
        this._inspectLightsaberComponent('crystal', crystalKey, { syncTab: true });
        const crystal = crystalOption || this._catalogs.crystals.find(option => option.id === key || option._id === key);
        const preferred = this._resolveBladeColorOptions(crystal)[0];
        if (preferred) this._lightsaber.selectedBladeColor = preferred;
        await this._renderPreservingUi();
        return;
      }

      case 'open-lightsaber-blade-color-editor': {
        await this._openLightsaberBladeColorEditor(target);
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
        const accessoryOption = this._findLightsaberCatalogOption('accessories', id);
        const accessoryKey = this._getLightsaberComponentKey(accessoryOption) || id;
        this._lightsaber.constructionResult = null;
        this._inspectLightsaberComponent('accessory', accessoryKey, { syncTab: true });
        const ids = this._lightsaber.selectedAccessoryIds;
        const idx = ids.indexOf(accessoryKey);
        if (idx >= 0) ids.splice(idx, 1);
        else {
          const accessory = accessoryOption || this._findLightsaberCatalogOption('accessories', accessoryKey);
          const slotCost = Number(accessory?.system?.lightsaber?.upgradeSlots ?? accessory?.system?.upgradeSlots ?? 1) || 1;
          const current = this._getLightsaberAccessorySlotState();
          if ((current.usedSlots + slotCost) > current.totalAvailable) {
            ui.notifications.warn('That accessory exceeds this hilt slot budget.');
            return;
          }
          ids.push(accessoryKey);
        }
        await this._renderPreservingUi();
        return;
      }

      case 'set-lightsaber-check-mode': {
        if (target?.disabled || target?.classList?.contains?.('disabled')) return;
        const mode = target?.dataset?.key;
        if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
        this._lightsaber.constructionResult = null;
        await this._renderPreservingUi();
        return;
      }

      case 'lightsaber-step-next':
      case 'lightsaber-step-prev': {
        const tab = target?.dataset?.tab;
        if (tab) {
          const canChangeChassis = this._canChangeLightsaberChassis();
          const allowedTabs = new Set(this._getLightsaberStepState({ canChangeChassis }).map(step => step.key));
          if (!allowedTabs.has(tab)) return;
          this._lightsaber.activeTab = tab;
          this._lightsaber.inspectedComponent = null;
          await this._renderPreservingUi();
        }
        return;
      }

      case 'attempt-lightsaber-construction': {
        const mode = target?.dataset?.mode;
        if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
        await this._applyCurrentItem();
        return;
      }

      case 'begin-lightsaber-attunement': {
        await this._openMirajAttunementFromResult();
        return;
      }

      case 'dismiss-lightsaber-success': {
        await this.close();
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
          this._lightsaber.constructionResult = null;
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
        await this._applyCurrentItem();
        return;
      }

      case 'open-tech-specialist': {
        const subject = this._getCurrentItem();
        if (!subject) return;
        await TechSpecialistModificationService.openModificationDialog({ actor: this.actor, subject, subjectKind: 'item' });
        await this._renderPreservingUi();
        return;
      }

      case 'designate-signature-device': {
        const subject = this._getCurrentItem();
        if (!subject) return;
        await TechSpecialistModificationService.designateSignatureDevice(this.actor, subject);
        await this._renderPreservingUi();
        return;
      }

      case 'toggle-tech-signature-trait': {
        const subject = this._getCurrentItem();
        const traitId = target?.dataset?.traitId;
        if (!subject || !traitId) return;
        await TechSpecialistModificationService.toggleActiveSignatureTrait(this.actor, subject, traitId);
        await this._renderPreservingUi();
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
      if (!item || !draft || !key) return;
      this._setCustomizationInspector('upgrade', key);
      const idx = draft.selectedUpgrades.indexOf(key);
      if (idx >= 0) draft.selectedUpgrades.splice(idx, 1);
      else draft.selectedUpgrades.push(key);
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-template"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      if (!item || !draft || !key) return;
      this._setCustomizationInspector('template', key);
      const idx = draft.selectedTemplates.indexOf(key);
      if (idx >= 0) draft.selectedTemplates.splice(idx, 1);
      else {
        const installed = this._getCanonicalTemplateKeys(item).includes(key);
        const validation = installed ? { valid: true } : GearTemplatesEngine.canApplyTemplate(item, key);
        if (!validation.valid) {
          ui.notifications.warn(validation.reason);
          return;
        }
        draft.selectedTemplates = [key, ...draft.selectedTemplates.filter(Boolean)].slice(0, GearTemplatesEngine.getTemplateLimit());
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-size-increase"]', async (event, target) => {
      event.preventDefault();
      const button = target?.closest?.('button') || event.target?.closest?.('button');
      if (button?.disabled || button?.classList?.contains?.('disabled')) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      if (!item || !draft) return;
      this._setCustomizationInspector('structural', 'size_increase');
      draft.structural.sizeIncreaseApplied = !draft.structural.sizeIncreaseApplied;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-strip"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const item = this._getCurrentItem();
      const draft = this._getDraft(item);
      const key = target.dataset.key;
      if (!item || !draft || !key) return;
      this._setCustomizationInspector('structural', key);
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

    this.onRoot('click', '[data-action="open-color-picker"]', async (event, target) => {
      event.preventDefault();
      const colorAction = target.dataset.colorAction;
      if (!colorAction) return;
      await this._openColorPickerDialog(colorAction);
    });

    this.onRoot('click', '[data-action="set-workbench-tab"]', async (event, target) => {
      event.preventDefault();
      const tab = target.dataset.tab;
      if (!tab) return;
      this._workbenchTab = tab;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="inspect-upgrade"]', async (event, target) => {
      event.preventDefault();
      const key = target.dataset.key;
      if (!key) return;
      this._setCustomizationInspector('upgrade', key);
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="inspect-template"]', async (event, target) => {
      event.preventDefault();
      const key = target.dataset.key;
      if (!key) return;
      this._setCustomizationInspector('template', key);
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="inspect-structural"]', async (event, target) => {
      event.preventDefault();
      const key = target.dataset.key;
      if (!key) return;
      this._setCustomizationInspector('structural', key);
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



    this.onRoot('click', '[data-action="start-lightsaber-construction"]', async (event, target) => {
      event.preventDefault();
      this._enterLightsaberConstructionMode(target.dataset.entryPoint || 'workbench');
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-lightsaber-tab"]', async (event, target) => {
      event.preventDefault();
      const tab = target.dataset.tab || 'crystal';
      const canChangeChassis = this._canChangeLightsaberChassis();
      const allowedTabs = new Set(this._getLightsaberStepState({ canChangeChassis }).map(step => step.key));
      if (!allowedTabs.has(tab)) return;
      this._lightsaber.activeTab = tab;
      this._lightsaber.inspectedComponent = null;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="inspect-lightsaber-component"]', async (event, target) => {
      event.preventDefault();
      const type = target.dataset.componentType || target.dataset.lightsaberInspectType;
      const key = target.dataset.key || target.dataset.lightsaberInspectKey;
      if (!this._inspectLightsaberComponent(type, key, { syncTab: true, forceRender: true })) return;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="select-lightsaber-chassis"]', async (event, target) => {
      event.preventDefault();
      if (!this._canChangeLightsaberChassis()) {
        ui.notifications.info('This saber is in tuning mode; its chassis is fixed until full construction is unlocked.');
        return;
      }
      this._lightsaber.selectedChassisId = target.dataset.key;
      this._lightsaber.inspectedComponent = { type: 'chassis', key: this._lightsaber.selectedChassisId };
      this._lightsaber.constructionResult = null;
      this._lightsaber.selectedAccessoryIds = this._lightsaber.selectedAccessoryIds.filter(id => this._isLightsaberAccessoryCompatible(id));
      if (!this._isLightsaberCrystalCompatible(this._lightsaber.selectedCrystalId)) {
        const firstCompatible = this._catalogs.crystals.find(option => this._isLightsaberCrystalCompatible(option.id));
        this._lightsaber.selectedCrystalId = firstCompatible?.id || this._catalogs.crystals[0]?.id || null;
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="select-lightsaber-crystal"]', async (event, target) => {
      event.preventDefault();
      const isTuning = this._isLightsaberTuningMode();
      if (!isTuning && target.classList.contains('disabled')) return;
      if (!isTuning && !this._isLightsaberCrystalCompatible(target.dataset.key)) {
        ui.notifications.warn('That crystal is not compatible with the selected chassis.');
        return;
      }
      const crystalOption = this._findLightsaberCatalogOption('crystals', target.dataset.key);
      const crystalKey = this._getLightsaberComponentKey(crystalOption) || target.dataset.key;
      this._lightsaber.selectedCrystalId = crystalKey;
      this._lightsaber.constructionResult = null;
      this._inspectLightsaberComponent('crystal', crystalKey, { syncTab: true });
      const crystal = crystalOption || this._catalogs.crystals.find(option => option.id === target.dataset.key || option._id === target.dataset.key);
      const preferred = this._resolveBladeColorOptions(crystal)[0];
      if (preferred) this._lightsaber.selectedBladeColor = preferred;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="open-lightsaber-blade-color-editor"]', async (event, target) => {
      event.preventDefault();
      await this._openLightsaberBladeColorEditor(target);
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
      const accessoryOption = this._findLightsaberCatalogOption('accessories', id);
      const accessoryKey = this._getLightsaberComponentKey(accessoryOption) || id;
      this._lightsaber.constructionResult = null;
      this._inspectLightsaberComponent('accessory', accessoryKey, { syncTab: true });
      const ids = this._lightsaber.selectedAccessoryIds;
      const idx = ids.indexOf(accessoryKey);
      if (idx >= 0) ids.splice(idx, 1);
      else {
        const accessory = accessoryOption || this._findLightsaberCatalogOption('accessories', accessoryKey);
        const slotCost = Number(accessory?.system?.lightsaber?.upgradeSlots ?? accessory?.system?.upgradeSlots ?? 1) || 1;
        const current = this._getLightsaberAccessorySlotState();
        if ((current.usedSlots + slotCost) > current.totalAvailable) {
          ui.notifications.warn('That accessory exceeds this hilt slot budget.');
          return;
        }
        ids.push(accessoryKey);
      }
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="set-lightsaber-check-mode"]', async (event, target) => {
      event.preventDefault();
      if (target.disabled || target.classList.contains('disabled')) return;
      const mode = target.dataset.key;
      if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
      this._lightsaber.constructionResult = null;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="lightsaber-step-next"], [data-action="lightsaber-step-prev"]', async (event, target) => {
      event.preventDefault();
      const tab = target.dataset.tab;
      if (!tab) return;
      const canChangeChassis = this._canChangeLightsaberChassis();
      const allowedTabs = new Set(this._getLightsaberStepState({ canChangeChassis }).map(step => step.key));
      if (!allowedTabs.has(tab)) return;
      this._lightsaber.activeTab = tab;
      this._lightsaber.inspectedComponent = null;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="attempt-lightsaber-construction"]', async (event, target) => {
      event.preventDefault();
      const mode = target.dataset.mode;
      if (mode === 'roll' || mode === 'take10') this._lightsaber.selectedCheckMode = mode;
      await this._applyCurrentItem();
    });

    this.onRoot('click', '[data-action="begin-lightsaber-attunement"]', async (event) => {
      event.preventDefault();
      await this._openMirajAttunementFromResult();
    });

    this.onRoot('click', '[data-action="dismiss-lightsaber-success"]', async (event) => {
      event.preventDefault();
      await this.close();
    });

    this.onRoot('pointerover', '[data-lightsaber-inspect-type][data-lightsaber-inspect-key]', async (_event, target) => {
      const type = target.dataset.lightsaberInspectType;
      const key = target.dataset.lightsaberInspectKey;
      if (!this._inspectLightsaberComponent(type, key, { syncTab: false })) return;
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="open-tech-specialist"]', async (event) => {
      event.preventDefault();
      const subject = this._getCurrentItem();
      if (!subject) return;
      await TechSpecialistModificationService.openModificationDialog({ actor: this.actor, subject, subjectKind: 'item' });
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="designate-signature-device"]', async (event) => {
      event.preventDefault();
      const subject = this._getCurrentItem();
      if (!subject) return;
      await TechSpecialistModificationService.designateSignatureDevice(this.actor, subject);
      await this._renderPreservingUi();
    });

    this.onRoot('click', '[data-action="toggle-tech-signature-trait"]', async (event, target) => {
      event.preventDefault();
      const subject = this._getCurrentItem();
      const traitId = target.dataset.traitId;
      if (!subject || !traitId) return;
      await TechSpecialistModificationService.toggleActiveSignatureTrait(this.actor, subject, traitId);
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
      await this._applyCurrentItem();
    });
  }



  /**
   * Public bridge for shell-hosted inline workbench surfaces.
   * Keeps apply behavior in the canonical workbench class while avoiding
   * direct access to the private _applyCurrentItem method from adapters.
   */
  async applyCurrentItemFromSurface() {
    if (this._pendingApply) return;
    await this._applyCurrentItem();
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

  _getLightsaberComponentKey(component) {
    if (!component) return null;
    return component.id
      || component._id
      || component.key
      || component.uuid
      || component.system?.chassisId
      || component.system?.lightsaber?.componentId
      || component.system?.lightsaber?.crystalType
      || component.system?.lightsaber?.family
      || component.name
      || null;
  }

  _findLightsaberCatalogOption(type, id) {
    const list = this._catalogs[type] || [];
    const needle = String(id ?? '').trim();
    if (!needle) return null;
    const normalizedNeedle = normalizeWorkbenchToken(needle);
    const compactNeedle = compactWorkbenchToken(needle);
    return list.find(option => {
      const candidates = [
        option.id,
        option._id,
        option.key,
        option.uuid,
        option.system?.chassisId,
        option.system?.lightsaber?.componentId,
        option.system?.lightsaber?.crystalType,
        option.system?.lightsaber?.family,
        option.name
      ].filter(value => value !== undefined && value !== null)
        .map(value => String(value).trim())
        .filter(Boolean);
      return candidates.some(candidate => candidate === needle
        || normalizeWorkbenchToken(candidate) === normalizedNeedle
        || compactWorkbenchToken(candidate) === compactNeedle);
    }) || null;
  }

  _inspectLightsaberComponent(type, key, { syncTab = false, forceRender = false } = {}) {
    const normalizedType = String(type || '').toLowerCase();
    const bucket = normalizedType === 'crystal'
      ? 'crystals'
      : (normalizedType === 'accessory' || normalizedType === 'hilt' || normalizedType === 'mod' ? 'accessories' : (normalizedType === 'chassis' ? 'chassis' : null));
    if (!bucket || !key) return false;
    const component = this._findLightsaberCatalogOption(bucket, key);
    if (!component) return false;
    const componentKey = this._getLightsaberComponentKey(component) || key;
    const typeKey = bucket === 'accessories' ? 'accessory' : (bucket === 'crystals' ? 'crystal' : 'chassis');
    const current = this._lightsaber.inspectedComponent;
    const unchanged = current?.type === typeKey && current?.key === componentKey;
    this._lightsaber.inspectedComponent = { type: typeKey, key: componentKey };
    if (syncTab) {
      if (typeKey === 'accessory') this._lightsaber.activeTab = 'hilt';
      else if (typeKey === 'crystal') this._lightsaber.activeTab = 'crystal';
      else if (typeKey === 'chassis') this._lightsaber.activeTab = 'chassis';
    }
    return forceRender || !unchanged;
  }

  _resolveBladeColorOptions(crystal) {
    const raw = String(crystal?.system?.lightsaber?.bladeColor || crystal?.bladeColor || 'varies').toLowerCase();
    if (!raw || raw === 'varies' || raw.includes('varies')) return VARIES_COLOR_LIST;

    const seen = new Set();
    const options = raw
      .split(/\s+or\s+|[,;/|&]+/i)
      .map(part => part.trim().replace(/[^a-z0-9_-]+/g, ''))
      .filter(key => key && BLADE_COLOR_MAP[key])
      .filter(key => {
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
    const summary = this._getLightsaberConstructionSummary();
    return !!summary.available;
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
    const baseAvailable = Number(chassis?.system?.upgradeSlots ?? chassis?.system?.lightsaber?.upgradeSlots ?? 3) || 3;
    const techSpecialistBonus = (TechSpecialistModificationService.hasFeat(this.actor, 'Tech Specialist') && !this._isLightsaberTuningMode()) ? 1 : 0;
    const totalAvailable = baseAvailable + techSpecialistBonus;
    return { usedSlots, totalAvailable, baseAvailable, techSpecialistBonus, freeSlots: totalAvailable - usedSlots, isOverflowing: usedSlots > totalAvailable };
  }


  _getLightsaberComponentModifiers({ editItem = null, crystal = null, accessories = [] } = {}) {
    const modifiers = [];
    const pushModifiers = source => {
      const list = Array.isArray(source?.system?.modifiers) ? source.system.modifiers : (Array.isArray(source?.modifiers) ? source.modifiers : []);
      for (const modifier of list) {
        if (modifier && typeof modifier === 'object') modifiers.push(modifier);
      }
    };

    if (crystal) pushModifiers(crystal);
    for (const accessory of accessories || []) pushModifiers(accessory);

    // Existing tuned blades can already carry the merged modifier payload. Use it
    // only when the workbench does not currently have explicit selected parts.
    if (!modifiers.length && editItem) pushModifiers(editItem);
    return modifiers;
  }

  _getLightsaberEffectiveStats({ editItem = null, chassis = null, crystal = null, accessories = [] } = {}) {
    const system = editItem?.system || {};
    const chassisSystem = chassis?.system || {};
    const combatDamage = system?.combat?.damage || chassisSystem?.combat?.damage || {};
    const combatAttack = system?.combat?.attack || chassisSystem?.combat?.attack || {};
    const name = String(editItem?.name || chassis?.name || '').toLowerCase();
    const fallbackDamage = name.includes('shoto') || name.includes('short') ? '2d6' : '2d8';
    const modifiers = this._getLightsaberComponentModifiers({ editItem, crystal, accessories });
    const result = {
      damage: system.damage || system.damageDice || combatDamage.dice || chassisSystem.damage || chassisSystem.damageDice || fallbackDamage,
      critical: system.critical || system.crit || system.threatRange || system.criticalRange || chassisSystem.critical || chassisSystem.crit || chassisSystem.threatRange || chassisSystem.criticalRange || (name.includes('lightsaber') ? '19-20' : '20'),
      criticalMultiplier: system.critMult || system.criticalMultiplier || system.weapon?.critMult || system.weapon?.criticalMultiplier || system.combat?.critical?.multiplier || chassisSystem.critMult || chassisSystem.criticalMultiplier || chassisSystem.weapon?.critMult || chassisSystem.weapon?.criticalMultiplier || chassisSystem.combat?.critical?.multiplier || 'x2',
      damageType: system.damageType || combatDamage.type || chassisSystem.damageType || chassisSystem?.combat?.damage?.type || 'Energy',
      range: system.range || system.rangeProfile || chassisSystem.range || chassisSystem.rangeProfile || 'Melee',
      attackBonus: coerceWorkbenchNumber(system.attackBonus ?? combatAttack.bonus ?? chassisSystem.attackBonus ?? chassisSystem?.combat?.attack?.bonus, 0),
      notes: []
    };

    for (const modifier of modifiers) {
      const type = normalizeWorkbenchToken(modifier.type);
      const target = normalizeWorkbenchToken(modifier.target ?? modifier.domain ?? '');
      const value = modifier.value;

      if (type === 'damage_bonus' || (target.includes('damage') && Number.isFinite(Number(value)))) {
        result.damage = addDamageFormulaBonus(result.damage, Number(value) || 0);
        continue;
      }

      if (type === 'damage_reduction') {
        const text = String(value ?? modifier.description ?? '').toLowerCase();
        const steps = text.match(/-\s*(\d+)d/) ? -Number(text.match(/-\s*(\d+)d/)[1] || 1) : -1;
        result.damage = adjustDamageFormulaDieStep(result.damage, steps);
        continue;
      }

      if (type === 'damage_die_bonus' || type === 'damage_dice_bonus') {
        const steps = Math.max(1, coerceWorkbenchNumber(value, 1));
        result.damage = adjustDamageFormulaDieStep(result.damage, steps);
        continue;
      }

      if (type === 'damage_type_change' || type === 'damage_type_override') {
        result.damageType = titleCaseDamageType(value || modifier.damageType || modifier.typeValue);
        continue;
      }

      if (type === 'attack_bonus' || (target.includes('attack') && Number.isFinite(Number(value)))) {
        result.attackBonus += Number(value) || 0;
        continue;
      }

      if (type === 'critical_range' || type === 'crit_range' || type === 'threat_range' || type === 'threat_range_bonus') {
        result.critical = extendCriticalRangeText(result.critical, coerceWorkbenchNumber(value, 1));
        continue;
      }

      if (type === 'critical_bonus' || type === 'critical_damage_bonus' || type === 'crit_bonus') {
        const note = String(value ?? modifier.description ?? '').replace(/-/g, ' ').trim();
        result.critical = appendCriticalNote(result.critical, note ? `${note} crit` : 'crit bonus');
        continue;
      }

      if (type === 'conditional_damage') {
        const note = [String(value ?? '').replace(/-/g, ' '), String(modifier.condition ?? '').replace(/-/g, ' ')]
          .filter(Boolean)
          .join(' ');
        if (note) result.notes.push(`Damage ${note}`);
        continue;
      }
    }

    result.damageType = titleCaseDamageType(result.damageType);
    result.range = titleCaseDamageType(result.range);
    return result;
  }

  _getLightsaberHeroStats({ editItem, chassis, crystal, accessories = [], preview, slotState, totalCost } = {}) {
    const stats = this._getLightsaberEffectiveStats({ editItem, chassis, crystal, accessories });
    const bladeColor = this._lightsaber.selectedBladeColor || DEFAULT_BLADE_COLOR;
    const compact = [
      { key: 'Damage', value: stats.damage, className: 'damage' },
      { key: 'Critical', value: formatCriticalRangeAndMultiplier(stats.critical, stats.criticalMultiplier), className: 'critical' },
      { key: 'Slots', value: `${slotState?.usedSlots ?? 0}/${slotState?.totalAvailable ?? 0}`, className: 'slots' },
      { key: 'Color', value: bladeColor, isColor: true, className: 'color', bladeColorParts: this._buildBladeColorTextParts(bladeColor) }
    ];

    const expanded = [
      { key: 'Damage Type', value: stats.damageType },
      { key: 'Range', value: stats.range },
      { key: 'Build DC', value: preview?.finalDc ?? 0 },
      { key: 'Cost', value: `${Number(totalCost ?? 0) || 0} cr` },
      { key: 'UTF +10', value: preview?.take10Total ?? '—' }
    ];
    if (stats.attackBonus) expanded.unshift({ key: 'Attack Bonus', value: formatSignedWorkbenchNumber(stats.attackBonus) });
    return { compact, expanded };
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
    const allowed = new Set(['crystal', 'hilt']);
    if (canChangeChassis) {
      allowed.add('chassis');
      allowed.add('review');
    }
    const fallback = canChangeChassis ? 'chassis' : 'crystal';
    const tab = this._lightsaber.activeTab || fallback;
    return allowed.has(tab) ? tab : fallback;
  }

  _formatLightsaberEligibilityReason(reason = '') {
    const labels = {
      no_actor: 'No actor is available for lightsaber construction.',
      insufficient_heroic_level: 'Requires heroic level 7 or higher.',
      insufficient_jedi_level: 'The selected construction mode requires Jedi class levels.',
      missing_force_sensitivity: 'Requires Force Sensitivity.',
      missing_lightsaber_proficiency: 'Requires Weapon Proficiency (Lightsabers).',
      insufficient_funds: 'Insufficient credits for the selected construction package.',
      invalid_config: 'Select a valid chassis, crystal, and hilt configuration.',
      incompatible_component: 'One or more selected components are incompatible.',
      roll_failed: 'The Use the Force check did not meet the construction DC.',
      construction_error: 'The construction engine could not complete the attempt.',
      eligibility_check_error: 'Eligibility could not be evaluated.',
      already_built: 'This actor has already completed a self-built lightsaber milestone.'
    };
    return labels[reason] || String(reason || 'Lightsaber construction is not currently available.');
  }

  _getLightsaberConstructionModeSetting() {
    try {
      return game?.settings?.get?.(game.system.id, 'lightsaberConstructionMode') || 'raw';
    } catch (_error) {
      return 'raw';
    }
  }

  _getLightsaberConstructionRequirements() {
    const mode = this._getLightsaberConstructionModeSetting();
    if (mode === 'jediOnly') return 'Jedi 7 + Force Sensitive + Weapon Proficiency (Lightsabers)';
    if (mode === 'heroicAndJedi') return 'Heroic 7 + Jedi 1 + Force Sensitive + Weapon Proficiency (Lightsabers)';
    return 'Heroic 7 + Force Sensitive + Weapon Proficiency (Lightsabers)';
  }

  _getLightsaberStepState({ canChangeChassis = false, activeTab = 'crystal' } = {}) {
    const steps = canChangeChassis
      ? [
        { key: 'chassis', label: 'Chassis', number: 1, selected: !!this._lightsaber.selectedChassisId },
        { key: 'crystal', label: 'Crystal', number: 2, selected: !!this._lightsaber.selectedCrystalId },
        { key: 'hilt', label: 'Hilt', number: 3, selected: true },
        { key: 'review', label: 'Review', number: 4, selected: false }
      ]
      : [
        { key: 'crystal', label: 'Crystal', number: 1, selected: !!this._lightsaber.selectedCrystalId },
        { key: 'hilt', label: 'Hilt', number: 2, selected: true }
      ];
    const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeTab));
    return steps.map((step, index) => ({
      ...step,
      active: step.key === activeTab,
      done: index < activeIndex && step.selected
    }));
  }

  _getLightsaberStepNavigation(steps = [], activeTab = 'crystal') {
    const index = Math.max(0, steps.findIndex(step => step.key === activeTab));
    return {
      previous: index > 0 ? steps[index - 1]?.key : null,
      next: index < steps.length - 1 ? steps[index + 1]?.key : null,
      isReview: activeTab === 'review'
    };
  }

  _buildLightsaberBuildSummary({ chassis, crystal, accessories = [], preview = null, credits = 0, totalCost = 0 } = {}) {
    const baseDc = Number(chassis?.system?.baseBuildDc ?? preview?.baseDc ?? (chassis ? 20 : 0)) || 0;
    const crystalDcMod = Number(crystal?.system?.lightsaber?.buildDcModifier ?? crystal?.buildDcModifier ?? 0) || 0;
    const accessoryDcMod = accessories.reduce((sum, accessory) => sum + (Number(accessory?.system?.lightsaber?.buildDcModifier ?? accessory?.buildDcModifier ?? 0) || 0), 0);
    const finalDc = Number(preview?.finalDc ?? preview?.dc ?? (baseDc ? baseDc + crystalDcMod + accessoryDcMod : 0)) || 0;
    const modifier = Number(preview?.modifier ?? this.actor?.system?.skills?.useTheForce?.total ?? 0) || 0;
    const take10Total = Number(preview?.take10Total ?? (modifier + 10)) || 0;
    const canTake10 = !!preview?.canTake10 || (!!finalDc && take10Total >= finalDc);
    return {
      baseDc,
      crystalDcMod,
      accessoryDcMod,
      crystalDcText: crystalDcMod >= 0 ? `+ ${crystalDcMod}` : `− ${Math.abs(crystalDcMod)}`,
      accessoryDcText: accessoryDcMod >= 0 ? `+ ${accessoryDcMod}` : `− ${Math.abs(accessoryDcMod)}`,
      finalDc: finalDc || '—',
      modifier,
      take10Total,
      canTake10,
      take10Text: finalDc ? `Take 10 = ${take10Total} ${take10Total >= finalDc ? 'passes' : 'fails'} DC ${finalDc}` : 'Take 10 pending',
      totalCost,
      credits,
      affordable: credits >= totalCost,
      after: credits - totalCost
    };
  }

  _getLightsaberResultView(result = null) {
    if (!result) return null;
    const success = !!result.success;
    const finalDc = result.finalDc ?? result.dc ?? '—';
    const rollTotal = result.rollTotal ?? result.total ?? null;
    const modifier = result.modifier ?? 0;
    const rollRaw = result.rollRaw ?? (Number.isFinite(Number(rollTotal)) ? Number(rollTotal) - Number(modifier || 0) : null);
    const mode = result.checkMode === 'take10' ? 'take10' : 'roll';
    return {
      success,
      fail: !success,
      finalDc,
      rollTotal: rollTotal ?? '—',
      modifier,
      rollRaw: mode === 'roll' ? rollRaw : null,
      checkMode: mode,
      title: success ? 'Lightsaber Forged' : 'Construction Failed',
      message: success
        ? `Success — DC ${finalDc} met. Credits were deducted and the lightsaber was created through the construction engine.`
        : `${this._formatLightsaberEligibilityReason(result.reason || 'roll_failed')} No item was created and credits were not deducted.`,
      itemId: result.itemId ?? null,
      cost: result.cost ?? null
    };
  }

  _getCreatedLightsaberFromResult(result = null) {
    const itemId = result?.itemId || this._lightsaber?.constructionResult?.itemId;
    if (!itemId) return null;
    return this._getActorItemById(itemId);
  }

  async _openMirajAttunementFromResult() {
    const weapon = this._getCreatedLightsaberFromResult();
    if (!weapon) {
      ui.notifications?.warn?.('The forged lightsaber could not be found for attunement. You can attune later from the sheet.');
      return;
    }
    new MirajAttunementApp(this.actor, weapon).render(true);
    await this.close();
  }

  _buildBladeColorTextParts(rawColor = '') {
    const text = String(rawColor || 'Varies');
    const tokens = text.match(/[A-Za-z]+|[^A-Za-z]+/g) || [text];
    return tokens.map((token) => {
      const key = token.trim().toLowerCase();
      const hex = key ? BLADE_COLOR_MAP[key] : null;
      if (!hex) {
        return {
          label: token,
          className: key === 'varies' ? 'ls-color-word ls-color-word--varies' : 'ls-color-word-separator',
          style: ''
        };
      }
      const safeKey = key.replace(/[^a-z0-9_-]/g, '');
      return {
        label: token,
        className: `ls-color-word ls-color-word--${safeKey}`,
        style: `--ls-word-color: ${hex};`
      };
    });
  }

  _buildLightsaberComponentIntel({ activeTab, chassis, crystal, accessories = [] } = {}) {
    const inspected = this._lightsaber.inspectedComponent;
    let component = null;
    if (inspected?.type === 'crystal') component = this._findLightsaberCatalogOption('crystals', inspected.key);
    if (inspected?.type === 'accessory') component = this._findLightsaberCatalogOption('accessories', inspected.key);
    if (inspected?.type === 'chassis') component = this._findLightsaberCatalogOption('chassis', inspected.key);

    let kind = 'Crystal';
    if (!component) {
      if (activeTab === 'hilt') {
        component = accessories[accessories.length - 1] || this._catalogs.accessories?.[0] || null;
        kind = 'Hilt Accessory';
      } else if (activeTab === 'chassis') {
        component = chassis;
        kind = 'Chassis';
      } else {
        component = crystal;
        kind = 'Kyber Crystal';
      }
    } else if (inspected?.type === 'accessory') kind = 'Hilt Accessory';
    else if (inspected?.type === 'chassis') kind = 'Chassis';
    else kind = 'Kyber Crystal';

    if (!component) {
      return {
        kind: 'Selection Intel',
        name: 'No component selected',
        description: 'Choose a crystal or hilt accessory to inspect its effect here.',
        fields: [],
        action: null,
        key: null,
        buttonLabel: '',
        disabled: true
      };
    }

    const system = component.system || {};
    const componentKey = this._getLightsaberComponentKey(component);
    const description = this._stripHtml(system.description || component.description || 'No rules text is recorded for this component yet.');
    const cost = Number(system.cost ?? system.baseCost ?? component.cost ?? 0) || 0;
    const dc = Number(system.lightsaber?.buildDcModifier ?? system.baseBuildDc ?? component.buildDcModifier ?? 0) || 0;
    const slotCost = Number(system.lightsaber?.upgradeSlots ?? system.upgradeSlots ?? component.slotCost ?? 0) || 0;
    const bladeColor = system.lightsaber?.bladeColor || component.bladeColor || null;
    const bladeColorParts = this._buildBladeColorTextParts(bladeColor || 'Varies');
    const selected = (kind === 'Kyber Crystal' && (componentKey === this._lightsaber.selectedCrystalId || component.id === this._lightsaber.selectedCrystalId || component._id === this._lightsaber.selectedCrystalId))
      || (kind === 'Hilt Accessory' && this._lightsaber.selectedAccessoryIds.includes(componentKey))
      || (kind === 'Chassis' && (componentKey === this._lightsaber.selectedChassisId || component.id === this._lightsaber.selectedChassisId || component._id === this._lightsaber.selectedChassisId || component.system?.chassisId === this._lightsaber.selectedChassisId));
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

    let action = null;
    let buttonLabel = '';
    let disabled = false;
    if (kind === 'Kyber Crystal') {
      action = 'select-lightsaber-crystal';
      buttonLabel = selected ? 'Selected Crystal' : 'Select Crystal';
      disabled = selected || (!this._isLightsaberTuningMode() && !this._isLightsaberCrystalCompatible(componentKey));
      if (!selected && disabled) buttonLabel = 'Incompatible Crystal';
    } else if (kind === 'Hilt Accessory') {
      action = 'toggle-lightsaber-accessory';
      buttonLabel = selected ? 'Remove Hilt Mod' : 'Install Hilt Mod';
      disabled = !this._isLightsaberTuningMode() && !this._isLightsaberAccessoryCompatible(componentKey);
      if (disabled) buttonLabel = 'Incompatible Mod';
    } else if (kind === 'Chassis') {
      action = 'select-lightsaber-chassis';
      buttonLabel = selected ? 'Selected Chassis' : 'Select Chassis';
      disabled = selected || !this._canChangeLightsaberChassis();
      if (!selected && disabled) buttonLabel = 'Chassis Locked';
    }

    return {
      kind,
      name: component.name || component.label || component.id || 'Component',
      description,
      selected,
      key: componentKey,
      action,
      buttonLabel,
      disabled,
      bladeColorParts: kind === 'Kyber Crystal' ? bladeColorParts : null,
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
    const constructionSummary = this._getLightsaberConstructionSummary();
    const constructionMode = !editItem && (this.mode === 'construct' || this.routeIntent === 'lightsaber-construction' || constructionSummary.available);
    const canChangeChassis = this._canChangeLightsaberChassis(editItem);
    if (constructionMode && !canChangeChassis) this._lightsaber.activeTab = this._lightsaber.activeTab === 'chassis' ? 'crystal' : this._lightsaber.activeTab;
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
    const canRoll = !!(chassis && crystal && preview?.success && !slotState.isOverflowing);
    const canTake10Build = !!(canRoll && preview?.canTake10);
    const canBuild = editItem
      ? canRoll
      : !!(canRoll && (this._lightsaber.selectedCheckMode !== 'take10' || canTake10Build));
    const lightsaberBlockedReason = canBuild
      ? null
      : (slotState.isOverflowing
        ? 'Accessory slot budget exceeded.'
        : (editItem
          ? 'Select a compatible crystal and hilt configuration.'
          : (this._lightsaber.selectedCheckMode === 'take10' && preview && !preview.canTake10
            ? 'Take 10 does not meet the build DC.'
            : this._formatLightsaberEligibilityReason(constructionSummary.reason))));
    const bladeHex = lightsaberVisualProfile.bladeHex;
    const hiltKind = this._normalizeLightsaberHiltKind(chassis);
    const steps = this._getLightsaberStepState({ canChangeChassis, activeTab });
    const navigation = this._getLightsaberStepNavigation(steps, activeTab);
    const buildSummary = this._buildLightsaberBuildSummary({ chassis, crystal, accessories: selectedAccessories, preview, credits, totalCost });
    const effectiveStats = this._getLightsaberEffectiveStats({ editItem, chassis, crystal, accessories: selectedAccessories });
    const heroStats = this._getLightsaberHeroStats({ editItem, chassis, crystal, accessories: selectedAccessories, preview, slotState, totalCost });
    const resultView = this._getLightsaberResultView(this._lightsaber.constructionResult);
    const alreadyBuiltNotice = constructionSummary.hasSelfBuilt && !constructionSummary.available;
    const ineligibleNotice = !editItem && !constructionSummary.available && !constructionSummary.hasSelfBuilt;
    return {
      actor: this.actor,
      categories: visibleCategories,
      lightsaberConstruction: constructionSummary,
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
        description: this._stripHtml(chassis?.system?.description || chassis?.description) || 'Select a chassis, kyber crystal, hilt accessories, and blade color from this workbench.',
        stats: heroStats.compact,
        expandedStats: heroStats.expanded
      },
      ...(await this._getLightsaberMentorContext(editItem)),
      techSpecialist: editItem ? TechSpecialistModificationService.getUiContext(this.actor, editItem, { subjectKind: 'item', subjectType: 'weapon' }) : TechSpecialistModificationService.getUiContext(this.actor, { name: 'Lightsaber Construction', type: 'weapon', system: { cost: totalCost || 0 }, flags: {} }, { subjectKind: 'item', subjectType: 'weapon' }),
      lightsaber: {
        mode: editItem ? 'tuning existing blade' : (canChangeChassis ? 'construct' : 'construction locked'),
        editItemId: editItem?.id || (editItem ? getWorkbenchItemId(editItem) : null),
        constructionMode,
        route: constructionSummary.route,
        activeTab,
        tabCrystal: activeTab === 'crystal',
        tabHilt: activeTab === 'hilt',
        tabColor: false,
        tabChassis: activeTab === 'chassis',
        tabReview: activeTab === 'review',
        tabs: steps,
        navigation,
        buildSummary,
        result: resultView,
        showSuccessOverlay: !!resultView?.success && !editItem,
        createdWeaponName: this._lightsaber.constructionResult?.weaponName || resultView?.itemId || 'Self-built lightsaber',
        ineligibleNotice,
        alreadyBuiltNotice,
        eligibilityReasonLabel: this._formatLightsaberEligibilityReason(constructionSummary.reason || (constructionSummary.hasSelfBuilt ? 'already_built' : '')),
        constructionModeSetting: this._getLightsaberConstructionModeSetting(),
        constructionRequirements: this._getLightsaberConstructionRequirements(),
        componentIntel,
        showChassis: canChangeChassis,
        chassisLocked: !canChangeChassis,
        selectedChassisName: chassis?.name || 'Fixed Chassis',
        chassisLockReason: editItem
          ? 'This is an existing/free lightsaber. Chassis construction is locked; tune the crystal, hilt accessories, and blade color here.'
          : this._formatLightsaberEligibilityReason(constructionSummary.reason),
        bladeHex,
        visualProfile: lightsaberVisualProfile,
        hiltKind,
        chassis: this._catalogs.chassis.map(option => ({
          ...option,
          description: this._stripHtml(option.system?.description || option.description),
          cost: Number(option.system?.baseCost ?? option.system?.cost ?? option.cost ?? 0) || 0,
          selected: option.id === this._lightsaber.selectedChassisId || option.system?.chassisId === this._lightsaber.selectedChassisId
        })),
        crystals: this._catalogs.crystals.map(option => {
          const optionKey = this._getLightsaberComponentKey(option) || option.id || option._id;
          const bladeColor = option.system?.lightsaber?.bladeColor || option.bladeColor || 'Varies';
          return {
            ...option,
            optionKey,
            description: this._stripHtml(option.system?.description || option.description),
            cost: Number(option.system?.cost ?? option.cost ?? 0) || 0,
            rarity: option.system?.rarity || option.rarity || 'common',
            bladeColor,
            bladeColorParts: this._buildBladeColorTextParts(bladeColor),
            selected: optionKey === this._lightsaber.selectedCrystalId || option.id === this._lightsaber.selectedCrystalId || option._id === this._lightsaber.selectedCrystalId,
            incompatible: !this._isLightsaberTuningMode() && !this._isLightsaberCrystalCompatible(optionKey)
          };
        }),
        accessories: this._catalogs.accessories.map(option => {
          const optionKey = this._getLightsaberComponentKey(option) || option.id || option._id;
          return {
            ...option,
            optionKey,
            description: this._stripHtml(option.system?.description || option.description),
            cost: Number(option.system?.cost ?? option.cost ?? 0) || 0,
            buildDcModifier: Number(option.system?.lightsaber?.buildDcModifier ?? option.buildDcModifier ?? 0) || 0,
            selected: this._lightsaber.selectedAccessoryIds.includes(optionKey) || this._lightsaber.selectedAccessoryIds.includes(option.id) || this._lightsaber.selectedAccessoryIds.includes(option._id),
            incompatible: !this._isLightsaberTuningMode() && !this._isLightsaberAccessoryCompatible(optionKey),
            slotCost: Number(option.system?.lightsaber?.upgradeSlots ?? option.system?.upgradeSlots ?? 1) || 1
          };
        }),
        colorOptions,
        canPickBladeColor: !!crystal && colorOptions.length > 0,
        checkMode: this._lightsaber.selectedCheckMode,
        canRoll,
        canTake10Build,
        rollSelected: this._lightsaber.selectedCheckMode === 'roll',
        take10Selected: this._lightsaber.selectedCheckMode === 'take10',
        preview,
        slotState,
        review: {
          chassisName: chassis?.name || 'No chassis selected',
          crystalName: crystal?.name || 'No crystal selected',
          accessoryNames: selectedAccessories.map(accessory => accessory.name).join(', ') || 'None',
          bladeColor: this._lightsaber.selectedBladeColor || DEFAULT_BLADE_COLOR,
          bladeColorParts: this._buildBladeColorTextParts(this._lightsaber.selectedBladeColor || DEFAULT_BLADE_COLOR),
          buildDc: preview?.finalDc ?? preview?.dc ?? '—',
          useTheForce: preview?.modifier ?? '—',
          take10: preview?.take10Total ?? '—',
          totalCost,
          affordable: credits >= totalCost,
          after: credits - totalCost,
          damage: effectiveStats.damage,
          critical: formatCriticalRangeAndMultiplier(effectiveStats.critical, effectiveStats.criticalMultiplier),
          damageType: effectiveStats.damageType,
          range: effectiveStats.range,
          timeHours: preview?.timeHours ?? 24
        }
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
        blockedReason: lightsaberBlockedReason,
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


  async _openColorPickerDialog(colorAction) {
    const item = this._getCurrentItem();
    if (!item) return;
    const draft = this._getDraft(item);
    if (!draft) return;
    const preview = this._getPreview(item, draft);
    const summary = this._getItemSummary(item, draft, preview);
    const block = (summary.appearance || []).find(b => b.action === colorAction);
    if (!block?.options?.length) return;

    const isBolt = colorAction === 'set-bolt-color';

    const content = `
      <form class="swse-color-picker-dialog">
        <div class="swse-color-grid${isBolt ? ' swse-color-grid--bolt' : ''}">
          ${block.options.map(option => `
            <label class="swse-color-option${option.selected ? ' selected' : ''}" style="--swatch: ${escapeWorkbenchHtml(option.hex)}; --weapon-color: ${escapeWorkbenchHtml(option.hex)};">
              <input type="radio" name="swse-color-pick" value="${escapeWorkbenchHtml(option.key)}" ${option.selected ? 'checked' : ''}>
              ${isBolt
                ? `<span class="swse-bolt-preview"><span class="swse-bolt-beam"></span></span><span class="swse-color-label">${escapeWorkbenchHtml(option.label)}</span>`
                : `<span class="swse-color-swatch"></span>`
              }
            </label>
          `).join('')}
        </div>
      </form>
    `;

    const chosen = await SWSEDialogV2.prompt({
      title: `Choose ${block.key}`,
      content,
      label: `Set ${block.key}`,
      options: {
        classes: ['swse', 'swse-dialog', 'swse-dialog-v2', 'swse-color-picker-dialog'],
        position: { width: isBolt ? 520 : 380, height: 'auto' }
      },
      callback: (html) => html.find('input[name="swse-color-pick"]:checked').val()
    });

    if (!chosen) return;
    const updatedDraft = this._getDraft(item);
    if (!updatedDraft) return;
    if (colorAction === 'set-accent') updatedDraft.accentColor = chosen;
    else if (colorAction === 'set-tint') updatedDraft.tintColor = chosen;
    else if (colorAction === 'set-bolt-color') updatedDraft.boltColor = chosen;
    await this._renderPreservingUi();
  }

  async _openLightsaberBladeColorEditor(_target = null) {
    const crystal = this._findLightsaberCatalogOption('crystals', this._lightsaber?.selectedCrystalId);
    if (!crystal) {
      ui?.notifications?.warn?.('Select a lightsaber crystal before choosing a blade color.');
      return;
    }

    const colorOptions = this._resolveBladeColorOptions(crystal)
      .map(key => ({
        key,
        label: titleCaseWorkbenchToken(key),
        hex: BLADE_COLOR_MAP[key] || '#00ffff',
        selected: key === (this._lightsaber?.selectedBladeColor || DEFAULT_BLADE_COLOR)
      }));

    if (!colorOptions.length) {
      ui?.notifications?.warn?.('This crystal does not list any selectable blade colors.');
      return;
    }

    const selectedKey = colorOptions.some(option => option.selected)
      ? this._lightsaber.selectedBladeColor
      : colorOptions[0].key;

    const crystalName = escapeWorkbenchHtml(crystal.name || 'Selected crystal');
    const content = `
      <form class="swse-lightsaber-color-dialog">
        <p class="swse-ls-color-dialog-intro">Choose the blade color this <strong>${crystalName}</strong> can produce.</p>
        <div class="swse-ls-color-grid">
          ${colorOptions.map(option => `
            <label class="swse-ls-color-option${option.key === selectedKey ? ' selected' : ''}" style="--blade-color: ${escapeWorkbenchHtml(option.hex)};">
              <input type="radio" name="swse-ls-blade-color" value="${escapeWorkbenchHtml(option.key)}" ${option.key === selectedKey ? 'checked' : ''}>
              <span class="swse-ls-color-swatch"></span>
              <span class="swse-ls-color-label">${escapeWorkbenchHtml(option.label)}</span>
            </label>
          `).join('')}
        </div>
      </form>
    `;

    const chosen = await SWSEDialogV2.prompt({
      title: 'Choose Lightsaber Blade Color',
      content,
      label: 'Set Blade Color',
      options: {
        classes: ['swse', 'swse-dialog', 'swse-dialog-v2', 'swse-lightsaber-color-picker-dialog'],
        position: { width: 560, height: 'auto' }
      },
      callback: (html) => html.find('input[name="swse-ls-blade-color"]:checked').val()
    });

    if (!chosen || !BLADE_COLOR_MAP[chosen]) return;
    this._lightsaber.selectedBladeColor = chosen;
    this._lightsaber.constructionResult = null;
    await this._renderPreservingUi();
  }

  async _emitLightsaberConstructionComplete(result = {}) {
    try {
      const [engineMod, notificationMod, recipientMod, senderMod, audienceMod, projectionMod, enumsMod] = await Promise.all([
        import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-notification.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-recipient.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-sender.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-audience.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-projection-surface.js'),
        import('/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js')
      ]);
      const { HolonetEngine } = engineMod;
      const { HolonetNotification } = notificationMod;
      const { HolonetRecipient } = recipientMod;
      const { HolonetSender } = senderMod;
      const { HolonetAudience } = audienceMod;
      const { HolonetProjectionSurface } = projectionMod;
      const { INTENT_TYPE, SOURCE_FAMILY, SURFACE_TYPE } = enumsMod;
      const recipients = [];
      for (const user of Array.from(game.users ?? [])) {
        if (!user || user.isGM) continue;
        if (user.character?.id === this.actor?.id) recipients.push(`player:${user.id}`);
        const level = Number(this.actor?.ownership?.[user.id] ?? this.actor?._source?.ownership?.[user.id] ?? 0);
        if (level >= 2) recipients.push(`player:${user.id}`);
      }
      if (game.user?.isGM) recipients.push(`gm:${game.user.id}`);
      else if (game.user?.id) recipients.push(`player:${game.user.id}`);
      const recipientIds = [...new Set(recipients.filter(Boolean))];
      if (!recipientIds.length) return;
      const recipientObjects = recipientIds.map(id => HolonetRecipient.fromStableId?.(id) || { id, label: id });
      const record = new HolonetNotification({
        intent: INTENT_TYPE.WORKBENCH_AVAILABLE,
        sender: HolonetSender.system('Miraj · Crystal-Singer'),
        audience: HolonetAudience.selectedPlayers(recipientIds),
        recipients: recipientObjects,
        title: 'Lightsaber Constructed',
        body: `${this.actor?.name || 'The Force user'} has completed a self-built lightsaber. The weapon has been added to the gear ledger.`,
        sourceFamily: SOURCE_FAMILY.WORKBENCH,
        sourceId: this.actor?.id ?? null,
        level: 'info',
        icon: '✦',
        metadata: {
          actorId: this.actor?.id ?? null,
          actorName: this.actor?.name ?? null,
          itemId: result?.itemId ?? null,
          category: 'MILESTONE',
          priority: 'normal',
          routeId: 'sheet',
          tab: 'gear',
          generatedBy: 'LightsaberConstructionWorkbench'
        },
        projections: []
      });
      record.projections = [new HolonetProjectionSurface({ surfaceType: SURFACE_TYPE.HOME_FEED, recordId: record.id })];
      await HolonetEngine.publish(record, { skipSocket: false, suppressLocalHook: true });
    } catch (error) {
      console.warn('SWSE [Workbench] failed to publish lightsaber completion Holonet notice', error);
    }
  }

  async _applyLightsaber() {
    const editItem = this._lightsaber.selectedOwnedSaberId ? this._getActorItemById(this._lightsaber.selectedOwnedSaberId) : null;
    const config = this._getLightsaberConfig();
    const slotState = this._getLightsaberAccessorySlotState();
    if (slotState.isOverflowing) {
      ui.notifications.warn('This lightsaber configuration exceeds available accessory slots.');
      return;
    }

    this._pendingApply = true;
    this._lightsaber.constructionResult = null;
    await this._renderPreservingUi();

    try {
      const result = editItem
        ? await LightsaberConstructionEngine.applyEdits(this.actor, editItem, config)
        : await LightsaberConstructionEngine.attemptConstruction(this.actor, config);

      if (!result?.success) {
        this._lightsaber.constructionResult = {
          ...result,
          success: false,
          checkMode: config.checkMode
        };
        ui.notifications.warn(`Lightsaber workbench failed: ${result?.reason || 'unknown_error'}`);
        await this._renderPreservingUi();
        return;
      }

      if (editItem) {
        ui.notifications.info('Lightsaber tuning applied.');
        await this.close();
        this.actor?.sheet?.render?.(true);
        return;
      }

      const forged = this._getActorItemById(result.itemId);
      this._lightsaber.constructionResult = {
        ...result,
        success: true,
        checkMode: config.checkMode,
        bladeColor: config.bladeColor,
        weaponName: forged?.name || 'Self-built lightsaber'
      };
      ui.notifications.info('Lightsaber forged.');
      await this._emitLightsaberConstructionComplete(result);
      this.actor?.sheet?.render?.(true);
      await this._renderPreservingUi();
    } finally {
      this._pendingApply = false;
    }
  }

  async _applyCurrentItem() {
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
