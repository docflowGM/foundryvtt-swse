/**
 * CombatStatRules
 *
 * Small pure helpers for SWSE core combat-stat math. These functions centralize
 * the rules that are shared by derived stats, roll previews, and damage rolls.
 */

import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

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
  if (explicit) {
    if (explicit.includes('dex')) return 'dex';
    if (explicit.includes('str')) return 'str';
    return explicit;
  }
  return isRangedWeapon(weapon) && !isMeleeWeapon(weapon) ? 'dex' : 'str';
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
  const twoHanded = options.forceTwoHanded === true || options.twoHanded === true;

  switch (selector) {
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
  getCriticalMultiplier,
  getDamageAbilityContribution,
  getDamageThresholdSizeBonus,
  getRangePenalty,
  getReflexSizeModifier,
  getWeaponAttackAbility,
  getWeaponFlatAttackBonus,
  getWeaponFlatDamageBonus,
  isAreaAttack,
  isMeleeWeapon,
  isRangedWeapon,
  isThrownMeleeWeapon,
  normalizeCombatSize
});

export default CombatStatRules;
