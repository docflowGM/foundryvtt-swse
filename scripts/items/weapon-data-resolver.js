/**
 * WeaponDataResolver
 *
 * Presentation/canonical-read helper for item dialog weapon bodies. This does
 * not migrate the item schema. It gathers the existing weapon fields consumed
 * by attack hydration, range profiles, customization, store display, and combat
 * cards into one stable dialog shape so the template does not guess raw paths.
 */

const ATTRIBUTE_LABELS = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
});

export const WEAPON_BRANCH_OPTIONS = Object.freeze([
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' }
]);

export const MELEE_WEAPON_CATEGORY_OPTIONS = Object.freeze([
  { value: 'advanced', label: 'Advanced' },
  { value: 'lightsaber', label: 'Lightsaber' },
  { value: 'melee-exotic', label: 'Melee Exotic' },
  { value: 'natural', label: 'Natural' },
  { value: 'simple', label: 'Simple' }
]);

export const RANGED_WEAPON_CATEGORY_OPTIONS = Object.freeze([
  { value: 'heavy', label: 'Heavy' },
  { value: 'pistols', label: 'Pistols' },
  { value: 'ranged-exotic', label: 'Ranged Exotic' },
  { value: 'rifles', label: 'Rifles' },
  { value: 'simple', label: 'Simple' }
]);

export const WEAPON_DAMAGE_TYPE_OPTIONS = Object.freeze([
  { value: 'energy', label: 'Energy' },
  { value: 'kinetic', label: 'Kinetic' },
  { value: 'sonic', label: 'Sonic' },
  { value: 'ion', label: 'Ion' },
  { value: 'fire', label: 'Fire' },
  { value: 'cold', label: 'Cold' },
  { value: 'acid', label: 'Acid' },
  { value: 'force', label: 'Force' },
  { value: 'stun', label: 'Stun' }
]);

export const WEAPON_DAMAGE_BONUS_OPTIONS = Object.freeze([
  { value: '', label: '(None)' },
  { value: 'str', label: 'STR' },
  { value: 'str2', label: 'STR x2' },
  { value: 'dex', label: 'DEX' },
  { value: 'dex2', label: 'DEX x2' }
]);

export const WEAPON_SIZE_OPTIONS = Object.freeze([
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'
].map((value) => ({ value, label: value })));

export const AVAILABILITY_OPTIONS = Object.freeze([
  { value: 'common', label: 'Common' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'military', label: 'Military' },
  { value: 'illegal', label: 'Illegal' }
]);

const RANGED_CATEGORIES = new Set(['heavy', 'pistols', 'ranged-exotic', 'rifles']);
const MELEE_CATEGORIES = new Set(['advanced', 'lightsaber', 'melee-exotic', 'natural']);
const RANGED_TEXT_RE = /\b(blaster|rifle|pistol|carbine|bowcaster|repeating|launcher|grenade|missile|ranged)\b/i;

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function toNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeBranch(itemOrSystem = {}) {
  const system = itemOrSystem.system ?? itemOrSystem ?? {};
  const explicit = String(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? '').trim().toLowerCase();
  if (explicit === 'ranged' || explicit.includes('ranged')) return 'ranged';
  if (explicit === 'melee') {
    const category = String(system.weaponCategory ?? system.category ?? system.weaponGroup ?? system.group ?? '').trim().toLowerCase();
    const text = [
      itemOrSystem.name,
      system.name,
      system.weaponType,
      system.weaponGroup,
      system.rangeProfile,
      system.rangeProfileName,
      system.range,
      category
    ].map(value => String(value ?? '')).join(' ');
    if (!MELEE_CATEGORIES.has(category) && (RANGED_CATEGORIES.has(category) || RANGED_TEXT_RE.test(text))) return 'ranged';
    return 'melee';
  }

  const category = String(system.weaponCategory ?? system.category ?? system.weaponGroup ?? system.group ?? '').trim().toLowerCase();
  const text = [
    itemOrSystem.name,
    system.name,
    system.weaponType,
    system.weaponGroup,
    system.rangeProfile,
    system.rangeProfileName,
    system.range,
    category
  ].map(value => String(value ?? '')).join(' ');
  if (RANGED_CATEGORIES.has(category) || RANGED_TEXT_RE.test(text)) return 'ranged';
  return 'melee';
}

function normalizeProperties(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function formatCrit(system = {}) {
  const range = String(system.criticalRange ?? '20').trim() || '20';
  const multiplier = String(system.criticalMultiplier ?? 'x2').trim() || 'x2';
  return `${range} / ${multiplier}`;
}

function normalizeRangeBand(band = {}) {
  if (!band || typeof band !== 'object') return { min: 0, max: 0, attackMod: 0 };
  return {
    min: toNumber(band.min, 0),
    max: toNumber(band.max, 0),
    attackMod: toNumber(band.attackMod, 0)
  };
}

function normalizeRanges(system = {}) {
  const ranges = system.ranges ?? {};
  return {
    pb: normalizeRangeBand(ranges.pb ?? ranges.pointBlank),
    short: normalizeRangeBand(ranges.short),
    medium: normalizeRangeBand(ranges.medium),
    long: normalizeRangeBand(ranges.long)
  };
}

function formatRangeSummary(ranges = {}) {
  const labels = { pb: 'PB', short: 'Short', medium: 'Medium', long: 'Long' };
  return Object.entries(ranges)
    .filter(([, band]) => band && (Number(band.max) || Number(band.min)))
    .map(([key, band]) => `${labels[key] ?? key} ${band.min}-${band.max}`)
    .join(' / ');
}

function withCustomOption(options, value) {
  const stringValue = String(value ?? '').trim();
  if (!stringValue || options.some((option) => option.value === stringValue)) return options;
  return [...options, { value: stringValue, label: stringValue }];
}

export function resolveWeaponData(itemOrSystem = {}) {
  const system = itemOrSystem.system ?? itemOrSystem ?? {};
  const branch = normalizeBranch(itemOrSystem);
  const category = String(system.weaponCategory ?? system.category ?? 'simple').trim() || 'simple';
  const ranges = normalizeRanges(system);
  const rangeSummary = String(system.range ?? '').trim() || formatRangeSummary(ranges) || (branch === 'melee' ? 'Melee' : 'Unspecified');
  const properties = normalizeProperties(system.properties);
  const ammunition = clone(system.ammunition ?? {}) ?? {};

  const categoryOptions = withCustomOption(
    branch === 'ranged' ? RANGED_WEAPON_CATEGORY_OPTIONS : MELEE_WEAPON_CATEGORY_OPTIONS,
    category
  );

  return {
    branch,
    branchLabel: branch === 'ranged' ? 'Ranged' : 'Melee',
    branchOptions: WEAPON_BRANCH_OPTIONS,
    category,
    categoryLabel: categoryOptions.find((option) => option.value === category)?.label ?? category,
    categoryOptions,
    attackAttribute: String(system.attackAttribute ?? (branch === 'ranged' ? 'dex' : 'str')).toLowerCase(),
    attackAttributeLabel: ATTRIBUTE_LABELS[String(system.attackAttribute ?? '').toLowerCase()] ?? ATTRIBUTE_LABELS[branch === 'ranged' ? 'dex' : 'str'],
    attackBonus: toNumber(system.attackBonus, 0),
    damage: String(system.damage ?? '').trim() || '1d8',
    damageType: String(system.damageType ?? 'energy').trim() || 'energy',
    damageBonus: String(system.damageBonus ?? '').trim(),
    criticalRange: String(system.criticalRange ?? '20').trim() || '20',
    criticalMultiplier: String(system.criticalMultiplier ?? 'x2').trim() || 'x2',
    critText: formatCrit(system),
    range: rangeSummary,
    rangeProfile: system.rangeProfile ?? '',
    rangeProfileName: system.rangeProfileName ?? '',
    ranges,
    properties,
    propertiesText: properties.join(', '),
    ammunition: {
      type: ammunition.type ?? 'none',
      current: toNumber(ammunition.current, 0),
      max: toNumber(ammunition.max, 0)
    },
    weight: toNumber(system.weight, 0),
    cost: toNumber(system.cost, 0),
    value: toNumber(system.value, system.cost ?? 0),
    upgradeSlots: toNumber(system.upgradeSlots, 0),
    templateCost: toNumber(system.templateCost, 0),
    size: system.size ?? 'Medium',
    restriction: system.restriction ?? 'common',
    gearTemplate: system.gearTemplate ?? '',
    gearTemplateSecondary: system.gearTemplateSecondary ?? '',
    equipped: !!system.equipped,
    integrated: !!system.integrated,
    activated: !!system.activated,
    autofire: !!system.autofire,
    dualWielded: !!system.dualWielded,
    wieldedTwoHanded: !!system.wieldedTwoHanded,
    isRanged: branch === 'ranged',
    isMelee: branch !== 'ranged',
    isLightsaber: category === 'lightsaber',
    bladeColorHex: String(itemOrSystem.flags?.swse?.bladeColor ?? '#4499ff').trim() || '#4499ff',
    boltColorHex: String(itemOrSystem.flags?.swse?.boltColor ?? '#ff6600').trim() || '#ff6600',
    damageTypeOptions: WEAPON_DAMAGE_TYPE_OPTIONS,
    damageBonusOptions: WEAPON_DAMAGE_BONUS_OPTIONS,
    sizeOptions: WEAPON_SIZE_OPTIONS,
    availabilityOptions: AVAILABILITY_OPTIONS
  };
}

export default resolveWeaponData;
