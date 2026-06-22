/**
 * EquipmentDataResolver
 *
 * Presentation/canonical-read helper for generic equipment item dialogs. It
 * keeps the existing equipment schema intact while giving the entity shell one
 * stable shape for inventory, store, quantity, and later skill-use hooks.
 */

import {
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_BUCKET_OPTIONS,
  EQUIPMENT_AVAILABILITY_OPTIONS,
  normalizeEquipmentSystem
} from '../engine/equipment/equipment-normalizer.js';

export const SIZE_OPTIONS = Object.freeze([
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'
].map((value) => ({ value, label: value })));

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
  const quantity = Math.max(1, toNumber(system.quantity ?? system.equippedQty, 1));
  const weight = toNumber(system.weight, 0);
  const cost = Math.max(0, Math.round(toNumber(system.cost ?? system.costNumeric, 0)));
  const value = Math.max(0, Math.round(toNumber(system.value, cost)));
  const totalWeight = Number((weight * quantity).toFixed(2));

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
    hasSkillHooks: skillHooks.length > 0,
    skillHookCount: skillHooks.length,
    normalizationStatus: system.normalizationStatus ?? ''
  };
}

export default resolveEquipmentData;
