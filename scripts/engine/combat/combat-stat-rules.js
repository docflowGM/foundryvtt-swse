/**
 * CombatStatRules
 *
 * Small pure helpers for SWSE core combat-stat math. These functions centralize
 * the rules that are shared by derived stats, roll previews, and damage rolls.
 */

import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

export const SIZE_ORDER = Object.freeze([
  'fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'
]);

export const REFLEX_SIZE_MODIFIERS = Object.freeze({
  fine: 10,
  diminutive: 5,
  tiny: 2,
  small: 1,
  medium: 0,
  large: -1,
  huge: -2,
  gargantuan: -5,
  colossal: -10
});

export const DAMAGE_THRESHOLD_SIZE_BONUSES = Object.freeze({
  fine: 0,
  diminutive: 0,
  tiny: 0,
  small: 0,
  medium: 0,
  large: 5,
  huge: 10,
  gargantuan: 20,
  colossal: 50
});

export function normalizeCombatSize(size) {
  const raw = String(size ?? 'medium').toLowerCase().trim();
  if (raw.includes('colossal')) return 'colossal';
  if (raw.includes('gargantuan')) return 'gargantuan';
  if (raw.includes('diminutive')) return 'diminutive';
  if (raw.includes('tiny')) return 'tiny';
  if (raw.includes('small')) return 'small';
  if (raw.includes('large')) return 'large';
  if (raw.includes('huge')) return 'huge';
  if (raw.includes('fine')) return 'fine';
  return SIZE_ORDER.includes(raw) ? raw : 'medium';
}

export function getActorCombatSize(actor) {
  return normalizeCombatSize(actor?.system?.size ?? actor?.size ?? actor?.system?.traits?.size ?? 'medium');
}

export function getReflexSizeModifier(actorOrSize) {
  const size = typeof actorOrSize === 'string' ? normalizeCombatSize(actorOrSize) : getActorCombatSize(actorOrSize);
  return REFLEX_SIZE_MODIFIERS[size] ?? 0;
}

export function getDamageThresholdSizeBonus(actorOrSize) {
  const size = typeof actorOrSize === 'string' ? normalizeCombatSize(actorOrSize) : getActorCombatSize(actorOrSize);
  return DAMAGE_THRESHOLD_SIZE_BONUSES[size] ?? 0;
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSelector(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isRangedWeapon(weapon) {
  const system = weapon?.system ?? {};
  const range = String(system.range ?? system.rangeType ?? '').toLowerCase();
  const category = String(system.category ?? system.subcategory ?? system.weaponType ?? system.type ?? '').toLowerCase();
  if (system.ranged === true) return true;
  if (range && range !== 'melee' && !range.includes('melee')) return true;
  return /ranged|pistol|rifle|carbine|blaster|bow|launcher|thrown/.test(category);
}

export function isMeleeWeapon(weapon) {
  const system = weapon?.system ?? {};
  const range = String(system.range ?? system.rangeType ?? '').toLowerCase();
  const category = String(system.category ?? system.subcategory ?? system.weaponType ?? system.type ?? '').toLowerCase();
  if (system.melee === true) return true;
  if (system.isUnarmed === true || system.properties?.includes?.('unarmed')) return true;
  if (range === 'melee' || range === '') return true;
  return /melee|unarmed|lightsaber|vibro|staff|pike|sword|knife|claw/.test(category);
}


export function isLightMeleeWeapon(weapon) {
  if (!isMeleeWeapon(weapon)) return false;
  const system = weapon?.system ?? {};
  if (system.light === true || system.isLight === true || system.properties?.includes?.('light')) return true;
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /light\s+melee|knife|dagger|short\s+sword|vibroblade/.test(text);
}

export function isAdvancedMeleeWeapon(weapon) {
  if (!isMeleeWeapon(weapon)) return false;
  const system = weapon?.system ?? {};
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /advanced\s+melee/.test(text) || text.includes('advanced melee weapons');
}

export function isPistolWeapon(weapon) {
  const system = weapon?.system ?? {};
  const text = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /\bpistol\b|\bpistols\b/.test(text);
}

export function isVehicleWeapon(weapon) {
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const traits = Array.isArray(system.traits) ? system.traits : [];
  const candidates = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    system.itemType,
    system.sourceType,
    ...properties,
    ...traits
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return /vehicle\s+weapon|vehicle-weapon|starship\s+weapon|starship-weapon|weapon\s+system|weapon-system|turbolaser|laser\s+cannon|ion\s+cannon|proton\s+torpedo|concussion\s+missile/.test(candidates);
}

function isEquippedWeapon(item) {
  const system = item?.system ?? {};
  return item?.type === 'weapon'
    && (system.equipped === true || system.equippable?.equipped === true || String(system.status || '').toLowerCase() === 'equipped');
}

function actorHasEquippedPistol(actor) {
  try {
    return Array.from(actor?.items ?? []).some(item => isEquippedWeapon(item) && isPistolWeapon(item));
  } catch (_err) {
    return false;
  }
}

function actorIsProficientWithWeapon(weapon) {
  return weapon?.system?.proficient !== false;
}


function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names]).map(normalizeSelector).filter(Boolean));
  if (!wanted.size) return false;
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!item || item.type !== 'talent') continue;
      if (wanted.has(normalizeSelector(item.name))) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isLightsaberWeapon(weapon) {
  const system = weapon?.system ?? {};
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const candidates = [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    ...properties
  ].map(normalizeSelector);
  return candidates.some(value => value.includes('lightsaber'));
}

export function isThrownMeleeWeapon(weapon) {
  const system = weapon?.system ?? {};
  const text = [system.range, system.rangeType, system.category, system.subcategory, system.properties?.join?.(' '), weapon?.name]
    .map(v => String(v ?? '').toLowerCase())
    .join(' ');
  return system.thrown === true || /thrown|grenade/.test(text);
}

export function getWeaponAttackAbility(actor, weapon) {
  const system = weapon?.system ?? {};
  const explicit = String(system.attackAttribute ?? system.combat?.attack?.ability ?? '').toLowerCase();
  const defaultAbility = isRangedWeapon(weapon) && !isMeleeWeapon(weapon) ? 'dex' : 'str';
  let resolved = defaultAbility;

  if (explicit) {
    if (explicit.includes('dex')) resolved = 'dex';
    else if (explicit.includes('str')) resolved = 'str';
    else resolved = explicit;
  }

  const usesNobleFencingStyle = actorHasTalentNamed(actor, 'Noble Fencing Style')
    && resolved === 'str'
    && actorIsProficientWithWeapon(weapon)
    && (isLightsaberWeapon(weapon) || isLightMeleeWeapon(weapon));

  return usesNobleFencingStyle ? 'cha' : resolved;
}


export function getRangePenalty(weapon, context = {}) {
  const explicit = Number(context.rangePenalty ?? context.modifiers?.rangePenalty ?? weapon?.system?.rangePenalty ?? weapon?.system?.currentRangePenalty);
  if (Number.isFinite(explicit)) return explicit;

  const band = String(context.rangeBand ?? context.range ?? weapon?.system?.rangeBand ?? '').toLowerCase();
  if (band === 'short') return -2;
  if (band === 'medium') return -5;
  if (band === 'long') return -10;
  return 0;
}

export function getWeaponFlatAttackBonus(weapon) {
  const system = weapon?.system ?? {};
  return numeric(system.attackBonus ?? system.combat?.attack?.bonus ?? 0, 0);
}

export function getWeaponFlatDamageBonus(weapon) {
  const system = weapon?.system ?? {};
  return numeric(system.flatDamageBonus ?? system.damageFlatBonus ?? system.combat?.damage?.bonus ?? 0, 0);
}


const HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY = 'forcePowerDamageAddsHalfLevel';
const ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS = new Set([
  'acid',
  'cold',
  'cryo',
  'electric',
  'electrical',
  'electricity',
  'elemental',
  'fire',
  'flame',
  'heat',
  'sonic'
]);
const POISON_HALF_LEVEL_EXCLUSION_KEYS = new Set(['poison', 'toxin', 'venom']);

function settingEnabled(key, fallback = false) {
  try {
    return game?.settings?.get?.('foundryvtt-swse', key) === true;
  } catch (_err) {
    return fallback;
  }
}

export function forcePowerDamageAddsHalfLevel() {
  return settingEnabled(HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY, false);
}

export function normalizeDamageTypeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addDamageTypeToken(tokens, value) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const entry of value) addDamageTypeToken(tokens, entry);
    return;
  }
  if (typeof value === 'object') {
    addDamageTypeToken(tokens, value.type);
    addDamageTypeToken(tokens, value.damageType);
    addDamageTypeToken(tokens, value.damage_type);
    addDamageTypeToken(tokens, value.element);
    addDamageTypeToken(tokens, value.energyType);
    addDamageTypeToken(tokens, value.descriptor);
    addDamageTypeToken(tokens, value.descriptors);
    addDamageTypeToken(tokens, value.tags);
    addDamageTypeToken(tokens, value.keywords);
    addDamageTypeToken(tokens, value.category);
    return;
  }
  const normalized = normalizeDamageTypeKey(value);
  if (!normalized) return;
  tokens.add(normalized);
  for (const part of normalized.split('-')) {
    if (part) tokens.add(part);
  }
}

export function collectDamageTypeKeys(source = null, context = {}) {
  const system = source?.system ?? {};
  const tokens = new Set();
  addDamageTypeToken(tokens, context.damageType);
  addDamageTypeToken(tokens, context.damageTypes);
  addDamageTypeToken(tokens, context.damageElement);
  addDamageTypeToken(tokens, context.element);
  addDamageTypeToken(tokens, context.tags);
  addDamageTypeToken(tokens, context.descriptors);
  addDamageTypeToken(tokens, context.damageComponents);
  addDamageTypeToken(tokens, context.combatContext?.damage?.damageComponents);
  addDamageTypeToken(tokens, context.workflowContext?.damage?.damageComponents);
  addDamageTypeToken(tokens, system.damageType);
  addDamageTypeToken(tokens, system.damageTypes);
  addDamageTypeToken(tokens, system.damage?.type);
  addDamageTypeToken(tokens, system.damage?.damageType);
  addDamageTypeToken(tokens, system.combat?.damage?.type);
  addDamageTypeToken(tokens, system.combat?.damage?.damageType);
  addDamageTypeToken(tokens, system.element);
  addDamageTypeToken(tokens, system.energyType);
  addDamageTypeToken(tokens, system.descriptor);
  addDamageTypeToken(tokens, system.descriptors);
  addDamageTypeToken(tokens, system.tags);
  addDamageTypeToken(tokens, system.keywords);
  return tokens;
}

export function isPoisonDamageContext(source = null, context = {}) {
  const tokens = collectDamageTypeKeys(source, context);
  return Array.from(tokens).some(key => POISON_HALF_LEVEL_EXCLUSION_KEYS.has(key));
}

export function isElementalDamageContext(source = null, context = {}) {
  const tokens = collectDamageTypeKeys(source, context);
  return Array.from(tokens).some(key => ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS.has(key));
}

export function isForcePowerDamageContext(source = null, context = {}) {
  const sourceType = normalizeDamageTypeKey(source?.type ?? source?.documentName ?? '');
  if (sourceType === 'force-power' || sourceType === 'forcepower') return true;
  const keys = [
    context.type,
    context.rollType,
    context.rollCategory,
    context.category,
    context.domain,
    context.itemType,
    context.sourceType,
    context.workflowContext?.type,
    context.workflowContext?.rollType,
    context.workflowContext?.category,
    context.combatContext?.type,
    context.combatContext?.rollType,
    context.combatContext?.category
  ].map(normalizeDamageTypeKey).filter(Boolean);
  return context.forcePower === true
    || context.isForcePower === true
    || keys.some(key => key === 'force-power' || key === 'forcepower' || key.startsWith('force-power'));
}

export function shouldApplyHalfLevelDamageBonus(actor, source = null, context = {}) {
  if (!actor || !source) return false;
  if (context.noHalfLevelDamage === true || context.suppressHalfLevelDamage === true) return false;
  if (isPoisonDamageContext(source, context) || isElementalDamageContext(source, context)) return false;

  if (isForcePowerDamageContext(source, context)) {
    return forcePowerDamageAddsHalfLevel();
  }

  const sourceType = normalizeDamageTypeKey(source?.type ?? '');
  if (sourceType === 'weapon' || sourceType === 'natural-weapon' || sourceType === 'naturalweapon') return true;
  if (context.weapon === source || context.isWeaponDamage === true || context.weaponDamage === true) return true;
  return isMeleeWeapon(source) || isRangedWeapon(source) || isThrownMeleeWeapon(source);
}

export function getHalfLevelDamageBonus(actor, source = null, context = {}) {
  return shouldApplyHalfLevelDamageBonus(actor, source, context) ? getEffectiveHalfLevel(actor) : 0;
}

export function getDamageAbilitySelector(weapon) {
  const system = weapon?.system ?? {};
  const explicit = normalizeSelector(system.damageBonus ?? system.combat?.damage?.ability ?? '');
  if (explicit) return explicit;

  const attackAttr = normalizeSelector(system.attackAttribute ?? system.combat?.attack?.ability ?? '');
  if (attackAttr === '2str' || attackAttr === 'str2' || attackAttr === '2dex' || attackAttr === 'dex2') return attackAttr;

  if (isMeleeWeapon(weapon) || isThrownMeleeWeapon(weapon)) return 'str';
  return '';
}

export function getDamageAbilityContribution(actor, weapon, options = {}) {
  const selector = getDamageAbilitySelector(weapon);
  if (!selector) return 0;

  const strMod = SchemaAdapters.getAbilityMod(actor, 'str');
  const dexMod = SchemaAdapters.getAbilityMod(actor, 'dex');
  const isLight = options.isLight === true;
  const strengthDamageSelector = selector === 'str' || selector === 'str2' || selector === '2str';
  const usesBlasterAndBladeTwoHanded = actorHasTalentNamed(actor, 'Blaster and Blade II')
    && isAdvancedMeleeWeapon(weapon)
    && actorHasEquippedPistol(actor)
    && strengthDamageSelector;
  const twoHanded = options.forceTwoHanded === true || options.twoHanded === true || usesBlasterAndBladeTwoHanded;
  const usesAtaruLightsaberDamage = actorHasTalentNamed(actor, 'Ataru')
    && isLightsaberWeapon(weapon)
    && strengthDamageSelector;
  const usesMasterOfEleganceDamage = actorHasTalentNamed(actor, 'Master of Elegance')
    && isLightMeleeWeapon(weapon)
    && strengthDamageSelector;

  if (usesMasterOfEleganceDamage) {
    return (twoHanded || selector === 'str2' || selector === '2str') ? dexMod * 2 : dexMod;
  }

  const effectiveSelector = usesAtaruLightsaberDamage
    ? (selector === 'str2' || selector === '2str' ? '2dex' : 'dex')
    : selector;

  switch (effectiveSelector) {
    case 'str':
      return (twoHanded && !isLight) ? strMod * 2 : strMod;
    case 'str2':
    case '2str':
      return strMod * 2;
    case 'dex':
      return (twoHanded && !isLight) ? dexMod * 2 : dexMod;
    case 'dex2':
    case '2dex':
      return dexMod * 2;
    default:
      return 0;
  }
}

export function getCriticalMultiplier(weapon, fallback = 2) {
  const raw = Number(weapon?.system?.critMultiplier ?? weapon?.system?.criticalMultiplier ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function isAreaAttack(weapon, context = {}) {
  const system = weapon?.system ?? {};
  if (context?.isAreaAttack === true || context?.areaAttack === true) return true;
  if (system.areaAttack === true || system.isAreaAttack === true) return true;
  const text = [system.attackType, system.area, system.burst, system.splash, system.properties?.join?.(' ')]
    .map(v => String(v ?? '').toLowerCase())
    .join(' ');
  return /area|burst|splash|cone|line|radius/.test(text);
}

export const CombatStatRules = Object.freeze({
  DAMAGE_THRESHOLD_SIZE_BONUSES,
  REFLEX_SIZE_MODIFIERS,
  SIZE_ORDER,
  getActorCombatSize,
  collectDamageTypeKeys,
  forcePowerDamageAddsHalfLevel,
  getCriticalMultiplier,
  getDamageAbilityContribution,
  getDamageThresholdSizeBonus,
  getHalfLevelDamageBonus,
  getRangePenalty,
  getReflexSizeModifier,
  getWeaponAttackAbility,
  getWeaponFlatAttackBonus,
  getWeaponFlatDamageBonus,
  isAreaAttack,
  isElementalDamageContext,
  isForcePowerDamageContext,
  isPoisonDamageContext,
  isLightsaberWeapon,
  isLightMeleeWeapon,
  isMeleeWeapon,
  isRangedWeapon,
  isVehicleWeapon,
  isThrownMeleeWeapon,
  normalizeCombatSize,
  normalizeDamageTypeKey,
  shouldApplyHalfLevelDamageBonus
});

export default CombatStatRules;
