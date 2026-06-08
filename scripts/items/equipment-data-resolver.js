/**
 * EquipmentDataResolver
 *
 * Presentation/canonical-read helper for generic equipment item dialogs. It
 * keeps the existing equipment schema intact while giving the entity shell one
 * stable shape for inventory, store, quantity, and workbench fields.
 */

export const EQUIPMENT_CATEGORY_OPTIONS = Object.freeze([
  { value: 'gear', label: 'Gear' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'medical', label: 'Medical' },
  { value: 'security', label: 'Security' },
  { value: 'survival', label: 'Survival' },
  { value: 'tech', label: 'Tech' },
  { value: 'tool', label: 'Tool' },
  { value: 'container', label: 'Container' }
]);

export const SIZE_OPTIONS = Object.freeze([
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'
].map((value) => ({ value, label: value })));

export const AVAILABILITY_OPTIONS = Object.freeze([
  { value: 'common', label: 'Common' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'military', label: 'Military' },
  { value: 'illegal', label: 'Illegal' }
]);

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

function withCustomOption(options, value) {
  const stringValue = String(value ?? '').trim();
  if (!stringValue || options.some((option) => option.value === stringValue)) return options;
  return [...options, { value: stringValue, label: stringValue }];
}

export function resolveEquipmentData(itemOrSystem = {}) {
  const system = itemOrSystem.system ?? itemOrSystem ?? {};
  const category = String(system.category ?? 'gear').trim() || 'gear';
  const categoryOptions = withCustomOption(EQUIPMENT_CATEGORY_OPTIONS, category);
  const tags = normalizeList(system.tags);
  const properties = normalizeList(system.properties);
  const quantity = Math.max(1, toNumber(system.quantity ?? system.equippedQty, 1));
  const weight = toNumber(system.weight, 0);
  const cost = toNumber(system.cost, 0);
  const value = toNumber(system.value, cost);

  return {
    category,
    categoryLabel: categoryOptions.find((option) => option.value === category)?.label ?? category,
    categoryOptions,
    size: system.size ?? 'Medium',
    sizeOptions: SIZE_OPTIONS,
    restriction: system.restriction ?? 'common',
    availabilityOptions: AVAILABILITY_OPTIONS,
    quantity,
    weight,
    totalWeight: weight * quantity,
    cost,
    value,
    totalValue: value * quantity,
    upgradeSlots: toNumber(system.upgradeSlots, 0),
    templateCost: toNumber(system.templateCost, 0),
    gearTemplate: system.gearTemplate ?? '',
    gearTemplateSecondary: system.gearTemplateSecondary ?? '',
    equipped: !!system.equipped,
    integrated: !!system.integrated,
    sizeIncreaseApplied: !!system.sizeIncreaseApplied,
    tags,
    tagsText: tags.join(', '),
    properties,
    propertiesText: properties.join(', '),
    hasQuantity: quantity > 1,
    hasWorkbenchHooks: !!(system.gearTemplate || system.gearTemplateSecondary || Number(system.upgradeSlots ?? 0) > 0),
    isConsumable: category === 'consumable' || tags.includes('consumable'),
    isContainer: category === 'container' || !!system.container
  };
}

export default resolveEquipmentData;
