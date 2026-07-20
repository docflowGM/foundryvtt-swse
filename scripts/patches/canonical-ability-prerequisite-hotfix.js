import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.canonicalAbilityPrerequisite.registered.v1');
const PATCHED = Symbol.for('swse.canonicalAbilityPrerequisite.patched.v1');

const ABILITY_ALIASES = Object.freeze({
  str: 'str',
  strength: 'str',
  dex: 'dex',
  dexterity: 'dex',
  con: 'con',
  constitution: 'con',
  int: 'int',
  intelligence: 'int',
  wis: 'wis',
  wisdom: 'wis',
  cha: 'cha',
  charisma: 'cha',
});

const ABILITY_LABELS = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveAbilityKey(prerequisite = {}) {
  const raw = prerequisite?.ability
    ?? prerequisite?.attribute
    ?? prerequisite?.abilityKey
    ?? prerequisite?.attributeKey
    ?? prerequisite?.key
    ?? prerequisite?.name
    ?? '';
  return ABILITY_ALIASES[String(raw).trim().toLowerCase()] || null;
}

function resolveRequiredScore(prerequisite = {}, fallback = 10) {
  for (const value of [
    prerequisite?.minimum,
    prerequisite?.min,
    prerequisite?.value,
    prerequisite?.score,
    prerequisite?.required,
    fallback,
  ]) {
    const numeric = finiteNumber(value);
    if (numeric !== null) return numeric;
  }
  return 10;
}

function scoreFromCanonicalAttribute(actor, key) {
  const attribute = actor?.system?.attributes?.[key];
  if (!attribute || typeof attribute !== 'object') return null;

  const direct = finiteNumber(attribute.total ?? attribute.score);
  if (direct !== null) return direct;

  const base = finiteNumber(attribute.base ?? attribute.value);
  if (base === null) return null;

  return base + [
    attribute.racial,
    attribute.species,
    attribute.enhancement,
    attribute.misc,
    attribute.untyped,
    attribute.temp,
    attribute.temporary,
  ].reduce((sum, value) => sum + (finiteNumber(value) ?? 0), 0);
}

function scoreFromLegacyAbility(actor, key) {
  const ability = actor?.system?.abilities?.[key];
  if (ability === null || ability === undefined) return null;
  if (typeof ability !== 'object') return finiteNumber(ability);

  const direct = finiteNumber(ability.total ?? ability.score ?? ability.value);
  if (direct !== null) return direct;

  const base = finiteNumber(ability.base);
  if (base === null) return null;
  return base + [
    ability.racial,
    ability.species,
    ability.enhancement,
    ability.misc,
    ability.temp,
    ability.temporary,
  ].reduce((sum, value) => sum + (finiteNumber(value) ?? 0), 0);
}

function pendingAbilityIncrease(pending = {}, key) {
  const candidates = [
    pending?.attributes?.increases?.[key],
    pending?.abilityIncreases?.[key],
    pending?.selectedAttributes?.increases?.[key],
    pending?.pendingAttributes?.increases?.[key],
  ];
  for (const candidate of candidates) {
    const numeric = finiteNumber(candidate);
    if (numeric !== null) return numeric;
  }
  return 0;
}

function resolveCanonicalAbilityScore(actor, pending = {}, key) {
  if (!key) return null;
  const canonical = scoreFromCanonicalAttribute(actor, key);
  const legacy = scoreFromLegacyAbility(actor, key);

  // V2 character sheets and progression write system.attributes as the actor's
  // canonical ability ledger. system.abilities remains on many migrated actors
  // as a compatibility mirror and can be stale. Prefer the canonical ledger.
  const score = canonical ?? legacy;
  if (score === null) return null;
  return score + pendingAbilityIncrease(pending, key);
}

function patchAbilityPrerequisiteAuthority() {
  if (PrerequisiteChecker[PATCHED]) return;
  const original = PrerequisiteChecker._checkAbilityRequirement;
  if (typeof original !== 'function') {
    swseLogger.warn('[CanonicalAbilityPrerequisite] PrerequisiteChecker._checkAbilityRequirement is unavailable');
    return;
  }

  PrerequisiteChecker._checkAbilityRequirement = function canonicalAbilityRequirement(
    prerequisite,
    actor,
    fallbackMinimum = 10,
    pending = {},
  ) {
    const originalResult = original.call(this, prerequisite, actor, fallbackMinimum, pending);
    const key = resolveAbilityKey(prerequisite);
    const actual = resolveCanonicalAbilityScore(actor, pending, key);
    if (!key || actual === null) return originalResult;

    const required = resolveRequiredScore(prerequisite, fallbackMinimum);
    const met = actual >= required;
    const label = ABILITY_LABELS[key] || key.toUpperCase();

    return {
      ...(originalResult || {}),
      met,
      actual,
      required,
      ability: key,
      canonicalAbilitySource: actor?.system?.attributes?.[key] ? 'system.attributes' : 'system.abilities',
      message: met
        ? ''
        : `Requires ${label} ${required} (you have ${actual})`,
    };
  };

  Object.defineProperty(PrerequisiteChecker, PATCHED, { value: true });
}

export function registerCanonicalAbilityPrerequisiteHotfix() {
  if (globalThis[REGISTERED]) return;
  patchAbilityPrerequisiteAuthority();
  AbilityEngine.clearAcquisitionCache?.();
  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[CanonicalAbilityPrerequisite] Registered canonical system.attributes prerequisite authority');
}
