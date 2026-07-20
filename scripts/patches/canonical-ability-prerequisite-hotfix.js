import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.canonicalAbilityPrerequisite.registered.v2');
const PATCHED = Symbol.for('swse.canonicalAbilityPrerequisite.patched.v2');

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

const ABILITY_LONG_KEYS = Object.freeze({
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
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

function keyedValue(container, key) {
  if (!container || typeof container !== 'object' || !key) return null;
  for (const candidateKey of [key, ABILITY_LONG_KEYS[key]]) {
    if (!candidateKey) continue;
    const value = finiteNumber(container[candidateKey]);
    if (value !== null) return value;
  }
  return null;
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

function scoreFromDraftAttributes(attributes = {}, key) {
  if (!attributes || typeof attributes !== 'object' || !key) return null;

  // Chargen's attribute step writes an absolute post-species score here. This
  // must outrank the not-yet-finalized Actor document, which legitimately still
  // contains its template default of 10 while level-1 feats are being selected.
  for (const source of [
    attributes.finalValues,
    attributes.finalScores,
    attributes.totals,
    attributes.scores,
    attributes.resolvedValues,
  ]) {
    const value = keyedValue(source, key);
    if (value !== null) return value;
  }

  const base = keyedValue(attributes.values, key)
    ?? keyedValue(attributes.baseValues, key)
    ?? keyedValue(attributes.base, key);
  if (base !== null) {
    const species = keyedValue(attributes.speciesMods, key)
      ?? keyedValue(attributes.speciesModifiers, key)
      ?? keyedValue(attributes.racialMods, key)
      ?? keyedValue(attributes.racialModifiers, key)
      ?? 0;
    const misc = keyedValue(attributes.miscMods, key)
      ?? keyedValue(attributes.modifiers, key)
      ?? 0;
    return base + species + misc;
  }

  const direct = keyedValue(attributes, key);
  if (direct !== null) return direct;

  const nested = attributes[key] ?? attributes[ABILITY_LONG_KEYS[key]];
  if (nested && typeof nested === 'object') {
    const total = finiteNumber(nested.total ?? nested.score ?? nested.final ?? nested.value);
    if (total !== null) return total;
  }

  return null;
}

function activeProgressionDraft(actor) {
  const shell = globalThis.game?.__swseActiveProgressionShell;
  if (!shell) return null;

  const shellActorId = shell?.actor?.id
    ?? shell?.document?.id
    ?? shell?.progressionSession?.actorId
    ?? shell?.session?.actorId
    ?? null;
  if (actor?.id && shellActorId && shellActorId !== actor.id) return null;

  return shell?.progressionSession?.draftSelections
    ?? shell?.session?.draftSelections
    ?? shell?.draftSelections
    ?? shell?.state?.draftSelections
    ?? shell?._state?.draftSelections
    ?? null;
}

function resolveDraftAbilityScore(actor, pending = {}, key) {
  const activeDraft = activeProgressionDraft(actor);
  const candidates = [
    pending?.attributes,
    pending?.selectedAttributes,
    pending?.pendingAttributes,
    pending?.draftSelections?.attributes,
    pending?.progressionSession?.draftSelections?.attributes,
    activeDraft?.attributes,
    activeDraft?.selectedAttributes,
    activeDraft?.pendingAttributes,
  ];

  for (const candidate of candidates) {
    const score = scoreFromDraftAttributes(candidate, key);
    if (score !== null) return { score, source: 'progression-draft' };
  }
  return null;
}

function pendingAbilityIncrease(pending = {}, key) {
  const activeDraft = activeProgressionDraft(null);
  const candidates = [
    pending?.attributes?.increases?.[key],
    pending?.abilityIncreases?.[key],
    pending?.selectedAttributes?.increases?.[key],
    pending?.pendingAttributes?.increases?.[key],
    pending?.draftSelections?.attributes?.increases?.[key],
    activeDraft?.attributes?.increases?.[key],
  ];
  for (const candidate of candidates) {
    const numeric = finiteNumber(candidate);
    if (numeric !== null) return numeric;
  }
  return 0;
}

function resolveCanonicalAbilityScore(actor, pending = {}, key) {
  if (!key) return null;

  const draft = resolveDraftAbilityScore(actor, pending, key);
  if (draft) return draft;

  const canonical = scoreFromCanonicalAttribute(actor, key);
  const legacy = scoreFromLegacyAbility(actor, key);

  // V2 character sheets and finalized progression write system.attributes as
  // the canonical ability ledger. system.abilities remains on many migrated
  // actors as a compatibility mirror and can be stale.
  const score = canonical ?? legacy;
  if (score === null) return null;
  return {
    score: score + pendingAbilityIncrease(pending, key),
    source: canonical !== null ? 'system.attributes' : 'system.abilities',
  };
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
    const resolved = resolveCanonicalAbilityScore(actor, pending, key);
    if (!key || !resolved) return originalResult;

    const actual = resolved.score;
    const required = resolveRequiredScore(prerequisite, fallbackMinimum);
    const met = actual >= required;
    const label = ABILITY_LABELS[key] || key.toUpperCase();

    return {
      ...(originalResult || {}),
      met,
      actual,
      required,
      ability: key,
      canonicalAbilitySource: resolved.source,
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
  swseLogger.log('[CanonicalAbilityPrerequisite] Registered chargen-draft-first ability prerequisite authority');
}
