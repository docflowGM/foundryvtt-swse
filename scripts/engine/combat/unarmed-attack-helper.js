/**
 * UnarmedAttackHelper
 *
 * Pure helper for SWSE unarmed attacks. It does not create embedded Items and
 * does not mutate actor data. Sheets can expose the returned virtual weapon as
 * an always-available combat option, while the existing roll pipeline can still
 * consume the familiar { id, name, type, img, system } shape.
 */

import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";

const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
const DIE_STEPS = ['1', '1d2', '1d3', '1d4', '1d6', '1d8', '1d10', '1d12', '2d6', '2d8', '2d10', '2d12'];
const LIVING_UNARMED_BY_SIZE = Object.freeze({
  fine: '1',
  diminutive: '1',
  tiny: '1',
  small: '1d3',
  medium: '1d4',
  large: '1d6',
  huge: '1d8',
  gargantuan: '2d6',
  colossal: '2d8'
});

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSize(actor) {
  const raw = String(
    actor?.system?.size
    ?? actor?.system?.traits?.size
    ?? actor?.system?.droidSystems?.size
    ?? actor?.system?.droidSize
    ?? 'medium'
  ).toLowerCase();
  const normalized = raw.includes('gargantuan') ? 'gargantuan'
    : raw.includes('colossal') ? 'colossal'
    : raw.includes('diminutive') ? 'diminutive'
    : raw.includes('tiny') ? 'tiny'
    : raw.includes('small') ? 'small'
    : raw.includes('large') ? 'large'
    : raw.includes('huge') ? 'huge'
    : raw.includes('fine') ? 'fine'
    : 'medium';
  return SIZE_ORDER.includes(normalized) ? normalized : 'medium';
}

function actorHasFeat(actor, featName) {
  const target = slug(featName);
  return Array.from(actor?.items ?? []).some(item =>
    item?.type === 'feat' && (slug(item.name) === target || slug(item.system?.slug) === target)
  );
}

function getFeatRules(actor) {
  const rules = [];
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'feat') continue;
    const abilityRules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(abilityRules)) continue;
    for (const rule of abilityRules) {
      if (!rule?.type) continue;
      rules.push({ ...rule, sourceItemId: item.id, sourceName: item.name });
    }
  }
  return rules;
}

function ruleNumber(rule, keys, fallback = 0) {
  for (const key of keys) {
    const value = rule?.[key] ?? rule?.params?.[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

export function getMartialArtsStep(actor) {
  const rules = getFeatRules(actor).filter(rule => String(rule.type) === 'UNARMED_DAMAGE_STEP');
  const explicitSteps = rules.reduce((total, rule) => total + Math.max(0, ruleNumber(rule, ['value', 'steps'], 1)), 0);

  let fallbackSteps = 0;
  if (actorHasFeat(actor, 'Martial Arts I')) fallbackSteps = Math.max(fallbackSteps, 1);
  if (actorHasFeat(actor, 'Martial Arts II')) fallbackSteps = Math.max(fallbackSteps, 2);
  if (actorHasFeat(actor, 'Martial Arts III')) fallbackSteps = Math.max(fallbackSteps, 3);

  return Math.max(explicitSteps, fallbackSteps);
}

export function unarmedAttackDoesNotProvoke(actor) {
  const hasExplicitRule = getFeatRules(actor).some(rule => String(rule.type) === 'UNARMED_DOES_NOT_PROVOKE_AOO');
  return hasExplicitRule || actorHasFeat(actor, 'Martial Arts I');
}

export function increaseDamageDie(baseDamage, steps = 0) {
  const base = String(baseDamage || '1').trim();
  let index = DIE_STEPS.indexOf(base);
  if (index < 0) index = DIE_STEPS.indexOf('1d4');
  // Special rule requested for flat 1: first Martial Arts step becomes 1d4.
  if (base === '1' && steps > 0) {
    index = DIE_STEPS.indexOf('1d4');
    steps -= 1;
  }
  return DIE_STEPS[Math.min(DIE_STEPS.length - 1, index + Math.max(0, steps))] ?? base;
}

function normalizeAppendageType(entry) {
  const raw = slug(entry?.damageType ?? entry?.appendageType ?? entry?.type ?? entry?.id ?? entry?.name);
  if (raw.includes('claw')) return 'claw';
  if (raw.includes('hand') || raw.includes('arm')) return 'hand';
  if (raw.includes('tool') || raw.includes('mount')) return 'tool';
  if (raw.includes('instrument')) return 'instrument';
  if (raw.includes('probe')) return 'probe';
  return '';
}

function getInstalledDroidAppendageTypes(actor) {
  const droidSystems = actor?.system?.droidSystems ?? {};
  const builderAppendages = Array.isArray(droidSystems.appendages) ? droidSystems.appendages : [];
  const itemAppendages = Array.from(actor?.items ?? []).filter(item => {
    const partType = slug(item?.system?.droidSystemType ?? item?.system?.droidPartType ?? item?.flags?.swse?.droidPartType ?? item?.type);
    return partType.includes('appendage') || partType === 'droid-appendage';
  });
  const types = [...builderAppendages, ...itemAppendages].map(normalizeAppendageType).filter(Boolean);
  return types.length ? types : ['hand'];
}

function compareDamageFormula(a, b) {
  return DIE_STEPS.indexOf(a) - DIE_STEPS.indexOf(b);
}

export function getBaseUnarmedDamage(actor, options = {}) {
  const size = normalizeSize(actor);
  const isDroid = actor?.type === 'droid' || actor?.system?.isDroid === true;
  if (!isDroid) return LIVING_UNARMED_BY_SIZE[size] ?? '1d4';

  const table = DROID_SYSTEMS?.unarmedDamageTable ?? {};
  const requestedType = normalizeAppendageType(options.appendage ?? {});
  const appendageTypes = requestedType ? [requestedType] : getInstalledDroidAppendageTypes(actor);
  let best = null;
  for (const type of appendageTypes) {
    const damage = table?.[type]?.[size] ?? null;
    if (!damage) continue;
    if (!best || compareDamageFormula(String(damage), best) > 0) best = String(damage);
  }
  return best || '1';
}

export function getUnarmedDamage(actor, options = {}) {
  return increaseDamageDie(getBaseUnarmedDamage(actor, options), getMartialArtsStep(actor));
}

export function buildVirtualUnarmedWeapon(actor, options = {}) {
  const damage = getUnarmedDamage(actor, options);
  const martialArtsStep = getMartialArtsStep(actor);
  const appendageLabel = options.appendage?.name ? ` (${options.appendage.name})` : '';
  const noProvokeOpportunity = unarmedAttackDoesNotProvoke(actor);
  return {
    id: options.id ?? 'swse-virtual-unarmed',
    name: options.name ?? `Unarmed Attack${appendageLabel}`,
    type: 'weapon',
    img: options.img ?? actor?.img ?? 'icons/svg/fist.svg',
    flags: {
      swse: {
        virtual: true,
        unarmed: true,
        droidAppendage: actor?.type === 'droid' || actor?.system?.isDroid === true,
        martialArtsStep,
        noProvokeOpportunity
      }
    },
    system: {
      damage,
      damageType: 'bludgeoning',
      attackAttribute: 'str',
      meleeOrRanged: 'melee',
      weaponType: 'simple',
      weaponGroup: 'simple',
      proficiency: 'simple',
      equipped: true,
      isUnarmed: true,
      properties: ['unarmed', 'simple', 'melee'],
      provokesOpportunityAttack: !noProvokeOpportunity,
      noProvokeOpportunity,
      attackOptions: {
        noProvokeOpportunity
      },
      description: `Always-available unarmed strike. Damage includes size, droid appendage type when applicable, Strength modifier via the damage pipeline, and Martial Arts feat die-step increases.${noProvokeOpportunity ? ' Martial Arts I prevents this unarmed attack from provoking attacks of opportunity.' : ''}`
    }
  };
}

export function buildUnarmedAttackContext(actor, options = {}) {
  const weapon = buildVirtualUnarmedWeapon(actor, options);
  return {
    id: weapon.id,
    name: weapon.name,
    img: weapon.img,
    isVirtual: true,
    isUnarmed: true,
    isDroidAppendage: weapon.flags.swse.droidAppendage,
    martialArtsStep: weapon.flags.swse.martialArtsStep,
    noProvokeOpportunity: weapon.flags.swse.noProvokeOpportunity === true,
    provokesOpportunityAttack: weapon.system.provokesOpportunityAttack !== false,
    damage: weapon.system.damage,
    damageType: weapon.system.damageType,
    range: 'Melee',
    weapon
  };
}

export const UnarmedAttackHelper = Object.freeze({
  buildUnarmedAttackContext,
  buildVirtualUnarmedWeapon,
  getBaseUnarmedDamage,
  getMartialArtsStep,
  getUnarmedDamage,
  unarmedAttackDoesNotProvoke,
  increaseDamageDie
});

export default UnarmedAttackHelper;
