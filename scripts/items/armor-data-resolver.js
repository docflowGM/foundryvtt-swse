/**
 * Canonical armor/shield data resolver and writer.
 *
 * The repo still contains several same-meaning legacy armor fields from older
 * sheets, store views, and customization tools. This module is the SSOT for new
 * armor consumers: read any supported legacy alias, expose one canonical shape,
 * and write through one compatibility-aware helper without migrating the raw
 * document schema yet.
 */

export const ARMOR_TYPE_OPTIONS = Object.freeze([
  { value: 'light', label: 'Light Armor' },
  { value: 'medium', label: 'Medium Armor' },
  { value: 'heavy', label: 'Heavy Armor' },
  { value: 'shield', label: 'Energy Shield' }
]);

export const ARMOR_SIZE_OPTIONS = Object.freeze([
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'
].map((value) => ({ value, label: value })));

export const ARMOR_AVAILABILITY_OPTIONS = Object.freeze([
  { value: 'common', label: 'Common' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'military', label: 'Military' },
  { value: 'illegal', label: 'Illegal' }
]);

export const ARMOR_STORAGE_CONTRACT = Object.freeze({
  canonical: Object.freeze({
    armorType: 'system.armorType',
    reflexBonus: 'system.defenseBonus',
    fortitudeBonus: 'system.fortitudeBonus',
    maxDexBonus: 'system.maxDexBonus',
    armorCheckPenalty: 'system.armorCheckPenalty',
    speedPenalty: 'system.speedPenalty',
    shieldRating: 'system.shieldRating',
    currentSR: 'system.currentSR',
    chargesCurrent: 'system.charges.current',
    chargesMax: 'system.charges.max'
  }),
  compatibilityAliases: Object.freeze({
    reflexBonus: Object.freeze(['system.reflexBonus', 'system.armorBonus']),
    fortitudeBonus: Object.freeze(['system.fortBonus']),
    maxDexBonus: Object.freeze(['system.maxDex'])
  }),
  deprecatedAmbiguous: Object.freeze({
    equipmentBonus: 'system.equipmentBonus'
  })
});

const BASE_ARMOR_SYSTEM = Object.freeze({
  armorType: 'light',
  defenseBonus: 0,
  reflexBonus: 0,
  armorBonus: 0,
  fortitudeBonus: 0,
  fortBonus: 0,
  equipmentBonus: 0,
  maxDexBonus: null,
  maxDex: 999,
  armorCheckPenalty: 0,
  speedPenalty: 0,
  equipmentPerceptionBonus: 0,
  shieldRating: 0,
  currentSR: 0,
  charges: { current: 0, max: 0 },
  activated: false,
  armorProficiencyRequired: '',
  armorProficiency: false,
  features: '',
  weight: 1,
  cost: 0,
  value: 0,
  equipped: false,
  integrated: false,
  upgradeSlots: 1,
  installedUpgrades: [],
  restriction: 'common',
  size: 'Medium',
  gearTemplate: '',
  gearTemplateSecondary: '',
  templateCost: 0
});

function clonePlain(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function mergePlain(base = {}, overlay = {}) {
  const target = clonePlain(base ?? {});
  const source = clonePlain(overlay ?? {});

  const merge = (into, from) => {
    for (const [key, value] of Object.entries(from ?? {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        into[key] = merge(into[key] && typeof into[key] === 'object' && !Array.isArray(into[key]) ? into[key] : {}, value);
      } else {
        into[key] = value;
      }
    }
    return into;
  };

  return merge(target, source);
}

function unwrapDocument(value) {
  if (!value) return {};
  if (value.system && typeof value.system === 'object') return value.system;
  return value;
}

function sourceName(value) {
  if (!value) return '';
  return String(value.name ?? value.label ?? value.title ?? '').trim();
}

function getPath(object, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let current = object;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function firstValue(object, paths, fallback = undefined) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (hasValue(value)) return value;
  }
  return fallback;
}

function toNumber(value, fallback = 0) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['value', 'current', 'total', 'amount', 'base']) {
      if (hasValue(value[key])) return toNumber(value[key], fallback);
    }
  }
  if (!hasValue(value)) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNullableNumber(value, fallback = null) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['value', 'current', 'total', 'amount', 'base']) {
      if (hasValue(value[key])) return toNullableNumber(value[key], fallback);
    }
  }
  if (!hasValue(value)) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  // Several older blank armor records used 999 as an "uncapped" max dex proxy.
  return number >= 99 ? null : number;
}

function clampNumber(value, fallback = 0, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const number = toNumber(value, fallback);
  return Math.max(min, Math.min(max, number));
}

function getSubmittedOrCurrent(submittedSystem = {}, currentSystem = {}, path, fallback = undefined) {
  const submittedValue = getPath(submittedSystem, path);
  if (hasValue(submittedValue)) return submittedValue;
  const currentValue = getPath(currentSystem, path);
  if (hasValue(currentValue)) return currentValue;
  return fallback;
}

export function normalizeArmorType(value, fallback = 'light') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw.includes('shield')) return 'shield';
  if (raw.includes('heavy')) return 'heavy';
  if (raw.includes('medium')) return 'medium';
  if (raw.includes('light')) return 'light';
  return fallback;
}

export function isEnergyShieldItem(itemOrSystem = {}) {
  const system = unwrapDocument(itemOrSystem);
  const name = sourceName(itemOrSystem);
  const armorType = normalizeArmorType(firstValue(system, ['armorType', 'armor.type', 'type', 'category', 'subtype'], ''), '');
  if (armorType === 'shield') return true;

  const shieldRating = firstValue(system, ['shieldRating', 'sr', 'shield.rating'], undefined);
  const tokens = [
    name,
    system?.armorType,
    system?.category,
    system?.subtype,
    system?.equipmentType,
    Array.isArray(system?.traits) ? system.traits.join(' ') : ''
  ].filter(Boolean).join(' ').toLowerCase();

  return /energy[\s_-]*shield/.test(tokens) || (tokens.includes('shield') && hasValue(shieldRating));
}

export function resolveArmorData(itemOrSystem = {}) {
  const system = unwrapDocument(itemOrSystem);
  const name = sourceName(itemOrSystem);
  const isShield = isEnergyShieldItem(itemOrSystem);
  const armorType = isShield
    ? 'shield'
    : normalizeArmorType(firstValue(system, ['armorType', 'armor.type', 'type', 'category', 'subtype'], 'light'));

  const reflexBonus = toNumber(firstValue(system, [
    // Canonical storage target for armor Reflex contribution.
    'defenseBonus',
    // Legacy aliases still found in sheets, imports, and customization code.
    'reflexBonus',
    'armorBonus',
    'armor.reflexBonus',
    'armor.defenseBonus'
  ], 0), 0);

  const fortitudeBonus = toNumber(firstValue(system, [
    // Canonical storage target exposed by the entity dialog.
    'fortitudeBonus',
    // Legacy aliases.
    'fortBonus',
    'armor.fortitudeBonus',
    'armor.fortBonus',
    // Ambiguous old model field. Read last as a compatibility fallback only.
    'equipmentBonus'
  ], 0), 0);

  const maxDexBonus = toNullableNumber(firstValue(system, [
    // Canonical storage target for max dex cap.
    'maxDexBonus',
    // Legacy aliases.
    'maxDex',
    'limits.maxDex',
    'armor.maxDexBonus',
    'armor.maxDex'
  ], null), null);

  const armorCheckPenalty = toNumber(firstValue(system, ['armorCheckPenalty', 'checkPenalty', 'armor.checkPenalty'], 0), 0);
  const speedPenalty = toNumber(firstValue(system, ['speedPenalty', 'armor.speedPenalty'], 0), 0);
  const perceptionBonus = toNumber(firstValue(system, ['equipmentPerceptionBonus', 'perceptionBonus'], 0), 0);
  const shieldRating = clampNumber(firstValue(system, ['shieldRating', 'sr', 'shield.rating'], 0), 0, { min: 0 });
  const currentSR = clampNumber(firstValue(system, ['currentSR', 'currentSr', 'shield.current'], 0), 0, { min: 0, max: shieldRating || Number.MAX_SAFE_INTEGER });
  const chargesCurrent = clampNumber(firstValue(system, ['charges.current', 'charge.current'], 0), 0, { min: 0 });
  const chargesMax = clampNumber(firstValue(system, ['charges.max', 'charge.max'], 0), 0, { min: 0 });

  return {
    name,
    armorType,
    armorTypeLabel: armorType === 'shield' ? 'Energy Shield' : `${armorType.charAt(0).toUpperCase()}${armorType.slice(1)} Armor`,
    isEnergyShield: isShield,
    reflexBonus: isShield ? 0 : reflexBonus,
    fortitudeBonus: isShield ? 0 : fortitudeBonus,
    maxDexBonus,
    maxDexInput: maxDexBonus === null ? '' : maxDexBonus,
    maxDexLabel: maxDexBonus === null ? 'Uncapped' : `+${maxDexBonus}`,
    armorCheckPenalty,
    speedPenalty,
    perceptionBonus,
    shieldRating,
    currentSR,
    chargesCurrent,
    chargesMax,
    activated: !!(system?.activated || system?.active || currentSR > 0),
    proficiencyRequired: String(system?.armorProficiencyRequired || (armorType === 'shield' ? '' : armorType) || '').toLowerCase(),
    hasRequiredProficiency: system?.armorProficiency === true,
    features: system?.features ?? '',
    cost: toNumber(system?.cost ?? system?.value, 0),
    value: toNumber(system?.value ?? system?.cost, 0),
    weight: toNumber(system?.weight, 0),
    size: system?.size ?? 'Medium',
    restriction: system?.restriction ?? 'common',
    equipped: !!system?.equipped,
    integrated: !!system?.integrated,
    upgradeSlots: toNumber(system?.upgradeSlots, 0),
    templateCost: toNumber(system?.templateCost, 0),
    gearTemplate: system?.gearTemplate ?? '',
    gearTemplateSecondary: system?.gearTemplateSecondary ?? '',
    sizeIncreaseApplied: !!system?.sizeIncreaseApplied,
    isPoweredArmor: !!system?.isPoweredArmor,
    legacyEquipmentBonus: toNumber(system?.equipmentBonus, 0),
    armorTypeOptions: ARMOR_TYPE_OPTIONS,
    sizeOptions: ARMOR_SIZE_OPTIONS,
    availabilityOptions: ARMOR_AVAILABILITY_OPTIONS
  };
}

/**
 * Build the canonical armor system payload used by sheets/factories.
 *
 * This is the write-side companion to resolveArmorData(). It preserves the
 * current schema, writes canonical fields once, and mirrors only the legacy
 * aliases that are safe aliases. The ambiguous old equipmentBonus field is
 * preserved instead of being treated as a same-meaning alias for Reflex or Fort.
 */
export function buildArmorSystemUpdateData(currentSystem = {}, submittedSystem = {}, options = {}) {
  const preserveUnknown = options.preserveUnknown !== false;
  const merged = mergePlain(currentSystem ?? {}, submittedSystem ?? {});
  const armor = resolveArmorData(merged);
  const next = preserveUnknown ? clonePlain(merged) : {};
  const isShield = armor.isEnergyShield || armor.armorType === 'shield';

  const legacyEquipmentBonus = toNumber(
    getSubmittedOrCurrent(submittedSystem, currentSystem, 'equipmentBonus', next.equipmentBonus ?? 0),
    0
  );

  next.armorType = isShield ? 'shield' : armor.armorType;

  // Canonical + safe aliases for Reflex armor contribution.
  next.defenseBonus = isShield ? 0 : armor.reflexBonus;
  next.reflexBonus = next.defenseBonus;
  next.armorBonus = next.defenseBonus;

  // Canonical + safe alias for Fortitude equipment contribution.
  next.fortitudeBonus = isShield ? 0 : armor.fortitudeBonus;
  next.fortBonus = next.fortitudeBonus;

  // Ambiguous legacy field. Keep it stable until every old consumer has moved
  // to resolveArmorData(); do not mirror Fort/Ref into it and create new drift.
  next.equipmentBonus = legacyEquipmentBonus;

  next.maxDexBonus = armor.maxDexBonus;
  next.maxDex = armor.maxDexBonus === null ? 999 : armor.maxDexBonus;

  next.armorCheckPenalty = armor.armorCheckPenalty;
  next.speedPenalty = armor.speedPenalty;
  next.equipmentPerceptionBonus = armor.perceptionBonus;

  next.shieldRating = isShield ? armor.shieldRating : 0;
  next.currentSR = isShield ? Math.min(armor.currentSR, next.shieldRating || Number.MAX_SAFE_INTEGER) : 0;
  next.charges = {
    ...(next.charges ?? {}),
    current: isShield ? Math.min(armor.chargesCurrent, armor.chargesMax || Number.MAX_SAFE_INTEGER) : armor.chargesCurrent,
    max: isShield ? armor.chargesMax : armor.chargesMax
  };
  next.activated = isShield ? !!armor.activated && next.currentSR > 0 : false;

  if (!isShield && !['light', 'medium', 'heavy'].includes(next.armorType)) next.armorType = 'light';
  if (isShield) next.armorProficiencyRequired = String(next.armorProficiencyRequired || '').toLowerCase();

  return next;
}

export function buildArmorSystemData(overrides = {}, options = {}) {
  const base = mergePlain(BASE_ARMOR_SYSTEM, options.shieldMode ? {
    armorType: 'shield',
    shieldRating: 0,
    currentSR: 0,
    charges: { current: 0, max: 0 },
    maxDexBonus: null,
    maxDex: 999,
    armorCheckPenalty: 0
  } : {});
  return buildArmorSystemUpdateData(base, overrides, { preserveUnknown: true });
}

/**
 * Normalize same-meaning armor aliases after form submission.
 *
 * Kept as the existing public function name for older callers, but now delegates
 * to the canonical write helper above.
 */
export function normalizeArmorSystemAliases(system = {}) {
  return buildArmorSystemUpdateData(system, {}, { preserveUnknown: true });
}

export default {
  ARMOR_STORAGE_CONTRACT,
  normalizeArmorType,
  isEnergyShieldItem,
  resolveArmorData,
  buildArmorSystemUpdateData,
  buildArmorSystemData,
  normalizeArmorSystemAliases
};
