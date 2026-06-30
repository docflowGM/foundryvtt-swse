/**
 * EquipmentDataResolver
 *
 * Presentation/canonical-read helper for generic equipment item dialogs. It
 * keeps the existing equipment schema intact while giving the entity shell one
 * stable shape for inventory, store, quantity, and later skill-use hooks.
 */

import { ImplantRules } from '/systems/foundryvtt-swse/scripts/engine/implants/ImplantRules.js';

import {
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_BUCKET_OPTIONS,
  EQUIPMENT_AVAILABILITY_OPTIONS,
  normalizeEquipmentSystem
} from '../engine/equipment/equipment-normalizer.js';

export const SIZE_OPTIONS = Object.freeze([
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'
].map((value) => ({ value, label: value })));

export const EQUIPMENT_SKILL_OPTIONS = Object.freeze([
  { value: '', label: 'None / Passive' },
  { value: 'acrobatics', label: 'Acrobatics' },
  { value: 'climb', label: 'Climb' },
  { value: 'deception', label: 'Deception' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'gatherInformation', label: 'Gather Information' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'jump', label: 'Jump' },
  { value: 'knowledgeLifeSciences', label: 'Knowledge (Life Sciences)' },
  { value: 'knowledgeTechnology', label: 'Knowledge (Technology)' },
  { value: 'mechanics', label: 'Mechanics' },
  { value: 'perception', label: 'Perception' },
  { value: 'persuasion', label: 'Persuasion' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'ride', label: 'Ride' },
  { value: 'stealth', label: 'Stealth' },
  { value: 'survival', label: 'Survival' },
  { value: 'swim', label: 'Swim' },
  { value: 'treatInjury', label: 'Treat Injury' },
  { value: 'useComputer', label: 'Use Computer' },
  { value: 'useTheForce', label: 'Use the Force' }
]);

export const EQUIPMENT_SKILL_HOOK_MODE_OPTIONS = Object.freeze([
  { value: 'modifies', label: 'Modifies' },
  { value: 'enables', label: 'Enables' },
  { value: 'requires', label: 'Requires' }
]);

export const EQUIPMENT_BONUS_TYPE_OPTIONS = Object.freeze([
  { value: '', label: 'None' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'circumstance', label: 'Circumstance' },
  { value: 'untyped', label: 'Untyped / Note Only' }
]);

export const EQUIPMENT_CONSUME_TIMING_OPTIONS = Object.freeze([
  { value: '', label: 'None' },
  { value: 'onAttempt', label: 'On Attempt' },
  { value: 'onSuccess', label: 'On Success' },
  { value: 'manual', label: 'Manual' }
]);

function withCustomOption(options, value) {
  const stringValue = String(value ?? '').trim();
  if (!stringValue || options.some((option) => option.value === stringValue)) return options;
  return [...options, { value: stringValue, label: stringValue }];
}

function toNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function firstSkillHook(skillHooks = []) {
  const hook = Array.isArray(skillHooks) && skillHooks.length ? skillHooks[0] : {};
  const bonus = hook?.bonus && typeof hook.bonus === 'object' ? hook.bonus : {};
  const consumes = hook?.consumes && typeof hook.consumes === 'object' ? hook.consumes : {};
  const bonusAmount = bonus.amount ?? bonus.value ?? bonus.modifier ?? '';
  return {
    skill: hook?.skill ?? '',
    useKey: hook?.useKey ?? '',
    mode: hook?.mode ?? 'modifies',
    required: hook?.required === true || hook?.mode === 'requires',
    requiresEquipped: hook?.requiresEquipped === true || bonus?.requiresEquipped === true,
    bonusType: bonus.type ?? '',
    bonusAmount: bonusAmount === null || bonusAmount === undefined ? '' : bonusAmount,
    bonusAppliesTo: bonus.appliesTo ?? bonus.label ?? '',
    consumeType: consumes.type ?? '',
    consumeAmount: consumes.amount ?? '',
    consumeTiming: consumes.timing ?? consumes.consumeOn ?? '',
    note: hook?.note ?? ''
  };
}

export function resolveEquipmentData(itemOrSystem = {}) {
  const rawSystem = itemOrSystem.system ?? itemOrSystem ?? {};
  const system = normalizeEquipmentSystem(rawSystem, {
    id: itemOrSystem._id ?? itemOrSystem.id ?? itemOrSystem.rawId ?? '',
    sourcePack: itemOrSystem.pack ?? itemOrSystem.sourcePack ?? ''
  });
  const category = String(system.category ?? 'gear').trim() || 'gear';
  const categoryOptions = withCustomOption(EQUIPMENT_CATEGORY_OPTIONS, category);
  const availabilityOptions = withCustomOption(EQUIPMENT_AVAILABILITY_OPTIONS, system.restriction);
  const tags = normalizeList(system.tags);
  const traits = normalizeList(system.traits);
  const properties = normalizeList(system.properties);
  const skillHooks = Array.isArray(system.skillHooks) ? system.skillHooks : [];
  const implantRules = system.implantRules && typeof system.implantRules === 'object' ? system.implantRules : {};
  const implantItem = { ...(itemOrSystem ?? {}), type: itemOrSystem.type ?? 'equipment', system };
  const isImplant = ImplantRules.isImplantItem(implantItem);
  const isActiveImplant = ImplantRules.isActiveImplantItem(implantItem);
  const implantActiveByOwnership = ImplantRules._truthy?.(implantRules.activeByOwnership) === true;
  const quantity = Math.max(1, toNumber(system.quantity ?? system.equippedQty, 1));
  const weight = toNumber(system.weight, 0);
  const cost = Math.max(0, Math.round(toNumber(system.cost ?? system.costNumeric, 0)));
  const value = Math.max(0, Math.round(toNumber(system.value, cost)));
  const totalWeight = Number((weight * quantity).toFixed(2));
  const primarySkillHook = firstSkillHook(skillHooks);

  return {
    category,
    categoryLabel: categoryOptions.find((option) => option.value === category)?.label ?? category,
    categoryOptions,
    equipmentBucket: system.equipmentBucket,
    equipmentBucketLabel: system.equipmentBucketLabel,
    equipmentBucketOptions: EQUIPMENT_BUCKET_OPTIONS,
    equipmentType: system.equipmentType,
    equipmentTypeLabel: system.equipmentTypeLabel,
    itemRole: system.itemRole,
    itemRoleLabel: system.itemRoleLabel,
    size: system.size ?? 'Small',
    sizeOptions: SIZE_OPTIONS,
    restriction: system.restriction ?? 'common',
    availability: system.availability ?? 'Standard',
    availabilityKey: system.restriction === 'common' ? 'standard' : (system.restriction ?? 'standard'),
    availabilityOptions,
    quantity,
    weight,
    weightLabel: system.weightLabel ?? `${weight} kg`,
    totalWeight,
    cost,
    costNumeric: cost,
    value,
    totalValue: value * quantity,
    sourcebook: system.sourcebook ?? system.source ?? '',
    page: system.page ?? null,
    notes: system.notes ?? '',
    upgradeSlots: toNumber(system.upgradeSlots, 0),
    templateCost: toNumber(system.templateCost, 0),
    gearTemplate: system.gearTemplate ?? '',
    gearTemplateSecondary: system.gearTemplateSecondary ?? '',
    equipped: !!system.equipped || !!system.equippable?.equipped,
    integrated: !!system.integrated,
    installed: !!system.installed || !!system.usage?.installed,
    active: !!system.active || !!system.activated || !!system.usage?.active,
    implantRules: {
      countAsImplant: isImplant,
      activeByOwnership: implantActiveByOwnership,
      notes: implantRules.notes ?? ''
    },
    isImplant,
    isActiveImplant,
    implantStatusLabel: isActiveImplant ? 'Active Implant' : isImplant ? 'Tagged Implant' : 'Not Implant',
    implantPenaltyNote: isActiveImplant
      ? 'If the actor lacks Implant Training, this active implant applies -2 Will Defense and +1 extra Condition Track step when worsened.'
      : isImplant
        ? 'Tagged as an implant. Mark it equipped, installed, integrated, active, or active-by-ownership for implant drawbacks to apply.'
        : '',
    sizeIncreaseApplied: !!system.sizeIncreaseApplied,
    tags,
    tagsText: tags.join(', '),
    traits,
    traitsText: traits.join(', '),
    properties,
    propertiesText: properties.join(', '),
    usage: system.usage ?? {},
    usageMode: system.usage?.mode ?? 'passive',
    consumeOn: system.usage?.consumeOn ?? '',
    chargesCurrent: system.usage?.charges?.current ?? null,
    chargesMax: system.usage?.charges?.max ?? null,
    hasQuantity: quantity > 1,
    hasWorkbenchHooks: !!(system.gearTemplate || system.gearTemplateSecondary || Number(system.upgradeSlots ?? 0) > 0),
    isConsumable: system.usage?.consumable === true || system.itemRole === 'consumable' || tags.includes('consumable'),
    isContainer: system.itemRole === 'container' || category === 'container' || !!system.capabilities?.container,
    skillHooks,
    skillOptions: withCustomOption(EQUIPMENT_SKILL_OPTIONS, primarySkillHook.skill),
    skillHookModeOptions: withCustomOption(EQUIPMENT_SKILL_HOOK_MODE_OPTIONS, primarySkillHook.mode),
    bonusTypeOptions: withCustomOption(EQUIPMENT_BONUS_TYPE_OPTIONS, primarySkillHook.bonusType),
    consumeTimingOptions: withCustomOption(EQUIPMENT_CONSUME_TIMING_OPTIONS, primarySkillHook.consumeTiming),
    primarySkillHook,
    hasSkillHooks: skillHooks.length > 0,
    skillHookCount: skillHooks.length,
    normalizationStatus: system.normalizationStatus ?? ''
  };
}

export default resolveEquipmentData;
