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

function weaponBranchText(weapon) {
  const system = weapon?.system ?? {};
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const traits = Array.isArray(system.traits) ? system.traits : [];
  return [
    weapon?.name,
    system.name,
    system.meleeOrRanged,
    system.weaponRangeType,
    system.rangeType,
    system.range,
    system.rangeProfile,
    system.rangeProfileName,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    system.proficiency,
    system.proficiencyGroup,
    ...properties,
    ...traits
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
}

function explicitBranch(weapon) {
  const system = weapon?.system ?? {};
  const explicit = String(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? '').toLowerCase().trim();
  if (explicit.includes('ranged')) return 'ranged';
  if (explicit.includes('melee')) return 'melee';
  return '';
}

export function isRangedWeapon(weapon) {
  const system = weapon?.system ?? {};
  const branch = explicitBranch(weapon);
  if (branch === 'ranged') return true;
  if (branch === 'melee') return false;
  if (system.ranged === true || system.isRanged === true) return true;
  if (system.melee === true || system.isMelee === true) return false;

  const range = String(system.range ?? '').toLowerCase().trim();
  if (range && range !== 'melee' && !range.includes('melee')) return true;

  return /\b(ranged|pistol|pistols|rifle|rifles|carbine|blaster|bowcaster|bow|launcher|grenade|thrown|slugthrower|missile|rocket)\b/.test(weaponBranchText(weapon));
}

export function isMeleeWeapon(weapon) {
  const system = weapon?.system ?? {};
  const branch = explicitBranch(weapon);
  if (branch === 'melee') return true;
  if (branch === 'ranged') return false;
  if (system.melee === true || system.isMelee === true) return true;
  if (system.ranged === true || system.isRanged === true) return false;
  if (system.isUnarmed === true || system.properties?.includes?.('unarmed')) return true;

  const range = String(system.range ?? '').toLowerCase().trim();
  if (range === 'melee') return true;
  if (range && range !== 'melee') return false;

  return /\b(melee|unarmed|lightsaber|vibro|staff|pike|sword|knife|blade|club|claw|bite)\b/.test(weaponBranchText(weapon));
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

function normalizeCriticalMultiplier(value, fallback = 2) {
  if (value === null || value === undefined || value === '') return fallback;
  const match = String(value).trim().match(/\d+/);
  const parsed = match ? Number(match[0]) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCriticalMultiplier(weapon, fallback = 2) {
  const system = weapon?.system ?? {};
  return normalizeCriticalMultiplier(
    system.criticalMultiplier
      ?? system.critMultiplier
      ?? system.combat?.critical?.multiplier
      ?? system.critical?.multiplier
      ?? system.multiplier,
    fallback
  );
}

export function isAreaAttack(weaponOrContext = {}, context = {}) {
  const weapon = weaponOrContext?.system ? weaponOrContext : null;
  const options = weapon ? context : weaponOrContext;
  const system = weapon?.system ?? {};
  const text = [
    system.attackShape,
    system.attackType,
    system.area,
    system.blastRadius,
    system.burstRadius,
    system.properties?.join?.(' '),
    options?.attackShape,
    options?.attackType,
    options?.area,
    options?.workflowContext?.attackShape,
    options?.workflowContext?.attackType
  ].map(value => String(value ?? '').toLowerCase()).join(' ');

  return options?.areaAttack === true
    || options?.isAreaAttack === true
    || options?.workflowContext?.areaAttack === true
    || options?.workflowContext?.isAreaAttack === true
    || system.areaAttack === true
    || system.isAreaAttack === true
    || /\b(area|blast|burst|cone|line|splash)\b/.test(text);
}

const HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY = 'forcePowerDamageAddsHalfLevel';
const ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS = new Set([
  'acid',
  'cold',
  'cryo',
  'electric',
  'electrical',
  'energy',
  'fire',
  'ion',
  'radiation',
  'sonic'
]);

function damageTypesFromContext(context = {}) {
  return [
    context.damageType,
    context.damage?.type,
    context.weapon?.system?.damageType,
    context.item?.system?.damageType,
    ...(Array.isArray(context.damageTypes) ? context.damageTypes : []),
    ...(Array.isArray(context.tags) ? context.tags : [])
  ].map(value => String(value ?? '').trim().toLowerCase()).filter(Boolean);
}

function isExcludedElementalDamage(context = {}) {
  return damageTypesFromContext(context).some(type => ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS.has(type));
}

function forcePowerDamageAddsHalfLevel() {
  try {
    return game?.settings?.get?.('swse', HALF_LEVEL_DAMAGE_HOUSE_RULE_KEY) === true;
  } catch (_err) {
    return false;
  }
}

function isForcePowerDamageContext(context = {}) {
  const type = String(context.type ?? context.rollType ?? context.sourceType ?? '').toLowerCase();
  if (type.includes('force')) return true;
  if (context.forcePower === true || context.isForcePower === true) return true;
  const itemType = String(context.item?.type ?? context.power?.type ?? '').toLowerCase();
  return itemType === 'force-power' || itemType === 'forcepower';
}

function isWeaponDamageContext(context = {}) {
  if (context.isWeaponDamage === true) return true;
  const itemType = String(context.item?.type ?? context.weapon?.type ?? '').toLowerCase();
  return itemType === 'weapon';
}

/**
 * Half level damage rule.
 *
 * Saga weapon damage normally adds one-half heroic level. Force power damage does
 * not add half level by default in this system because many powers already encode
 * full dice progressions; a world setting can enable it for tables that use that
 * house rule. Elemental/energy style packets stay excluded unless explicitly
 * weapon-backed to avoid double-scaling state/effect damage.
 */
export function getHalfLevelDamageBonus(actor, item = null, context = {}) {
  const level = getEffectiveHalfLevel(actor);
  if (!level) return 0;
  const enriched = { ...context, item: context.item ?? item, weapon: context.weapon ?? item };
  if (isForcePowerDamageContext(enriched) && !forcePowerDamageAddsHalfLevel()) return 0;
  if (isExcludedElementalDamage(enriched) && !isWeaponDamageContext(enriched)) return 0;
  return level;
}

export function getDamageAbilityContribution(actor, weapon) {
  const system = weapon?.system ?? {};
  const explicit = String(system.damageBonus ?? system.damageAbility ?? system.combat?.damage?.ability ?? '').toLowerCase();

  if (explicit === 'none' || explicit === '0' || explicit === 'false') return 0;

  if (actorHasTalentNamed(actor, 'Ataru') && isLightsaberWeapon(weapon)) return SchemaAdapters.getAbilityMod(actor, 'dex');

  if (explicit.includes('str2')) return SchemaAdapters.getAbilityMod(actor, 'str') * 2;
  if (explicit.includes('dex2')) return SchemaAdapters.getAbilityMod(actor, 'dex') * 2;
  if (explicit.includes('str')) return SchemaAdapters.getAbilityMod(actor, 'str');
  if (explicit.includes('dex')) return SchemaAdapters.getAbilityMod(actor, 'dex');

  if (isRangedWeapon(weapon) && !isThrownMeleeWeapon(weapon)) return 0;
  const strMod = SchemaAdapters.getAbilityMod(actor, 'str');
  if (system.twoHanded === true || system.wieldedTwoHanded === true) return Math.floor(strMod * 1.5);
  return strMod;
}
