/**
 * Species grant reconciliation — source-aware, idempotent revocation.
 *
 * The species mutation plan is declarative ("set these keys, create these
 * items"). Several materializers only write a key when the new species has a
 * non-empty value, so switching species or publication variants left the
 * previous grant behind (e.g. Wookiee -> Human kept +4 STR racial). This module
 * turns every apply into a full reconciliation of ONE grant:
 *
 *  - Grant identity = `grantKey` (species id + variant id). A manifest recording
 *    the key, every actor key the grant wrote, and the skills it flipped on is
 *    stored at `flags.swse.speciesGrantManifest`.
 *  - Keys the previous manifest wrote but the new plan does not are reset to
 *    their "no grant" value. Only keys the grant itself wrote are touched, so
 *    shared flags (e.g. a Rage granted by a talent) are not clobbered.
 *  - Species-exclusive keys are always reset when the plan omits them, which
 *    also repairs actors created before manifests existed.
 *  - Items carry `flags.swse.speciesGrantKey`; items from a different grant are
 *    deleted, items from the same grant are never duplicated.
 *
 * Pure module (plain data in / plain data out) so it is testable under Node.
 */

export const MANIFEST_FLAG = 'flags.swse.speciesGrantManifest';
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** "No grant" value per species-exclusive key. Always reset when the plan omits the key. */
export const SPECIES_EXCLUSIVE_RESETS = Object.freeze({
  ...Object.fromEntries(ABILITY_KEYS.map(k => [`system.attributes.${k}.racial`, 0])),
  'system.speciesMovement': {},
  'system.speciesVariant': null,
  'system.speciesCustomName': null,
  'flags.swse.speciesVariant': null,
  'flags.swse.speciesAbilityChoice': null,
  'flags.swse.speciesFeatsRequired': 0,
  'flags.swse.speciesBonusSpeed': 0,
  'flags.swse.speciesTraitIds': [],
  'flags.swse.speciesTraits': {},
  'flags.swse.speciesLanguages': [],
  'flags.swse.speciesSenses': [],
  'flags.swse.speciesEnvironment': [],
  'flags.swse.speciesPassiveBonuses': {},
  'flags.swse.speciesRerolls': [],
  'flags.swse.speciesImmunities': [],
  'flags.swse.speciesResistances': [],
  'flags.swse.speciesBonusClassSkills': [],
  'flags.swse.activeSpeciesAbilities': [],
  'flags.swse.speciesReactionKeys': [],
  'flags.swse.primitiveSpecies': false,
  'flags.swse.suppressedClassProficiencies': [],
  'flags.swse.droidBuilderSpecies': null,
  'flags.swse.speciesUuid': null,
});

/** Keys every apply rewrites unconditionally; never reset them from a manifest. */
const ALWAYS_REWRITTEN = new Set(['system.size', 'system.speed', 'system.species', 'system.race', 'system.speciesRules', 'flags.swse.speciesSource']);

const kindOf = value => (Array.isArray(value) ? 'array' : typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number'
  : value && typeof value === 'object' ? 'object' : 'null');
const RESET_BY_KIND = Object.freeze({ array: [], boolean: false, number: 0, object: {}, null: null });

/** Read a dotted path from an update payload that may use dotted keys, nested objects, or both. */
function readPayloadPath(payload, path) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, path)) return payload[path];
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), payload);
}

/**
 * Independent acquisition. A species manifest owns a skill's training/class-skill
 * flag only while nothing else has claimed it. Any LATER write through the actor
 * mutation authority that sets the same flag true (class choice, feat, progression,
 * sheet edit) makes the skill independently owned, so a species switch must not
 * revoke it. Species payloads (they carry a manifest) never count as independent.
 *
 * @returns {object|null} extra dotted-key updates to merge into the payload, or null
 */
export function claimIndependentSkills(manifest, updateData) {
  if (!manifest || typeof manifest !== 'object' || !updateData) return null;
  if (readPayloadPath(updateData, MANIFEST_FLAG) !== undefined) return null; // the species grant itself
  const claim = (list, field) => {
    const owned = Array.isArray(list) ? list : [];
    return owned.filter(skill => readPayloadPath(updateData, `system.skills.${skill}.${field}`) === true);
  };
  const trained = claim(manifest.trainedSkills, 'trained');
  const classSkills = claim(manifest.classSkills, 'classSkill');
  if (!trained.length && !classSkills.length) return null;
  const extra = {};
  if (trained.length) extra[`${MANIFEST_FLAG}.trainedSkills`] = manifest.trainedSkills.filter(skill => !trained.includes(skill));
  if (classSkills.length) extra[`${MANIFEST_FLAG}.classSkills`] = manifest.classSkills.filter(skill => !classSkills.includes(skill));
  return extra;
}

export function computeSpeciesGrantKey(identity) {
  const species = identity?.id || identity?.name;
  if (!species) return null;
  return `${species}|${identity?.variant?.id || 'base'}`;
}

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Foundry deep-MERGES object values on update, so writing a smaller object leaves
 * the previous object's keys behind. Return `next` with `-=key: null` entries for
 * every key the actor currently has that `next` omits (recursively).
 */
export function withStaleDeletions(current, next) {
  if (!isPlainObject(next) || !isPlainObject(current)) return next;
  const out = {};
  for (const [key, value] of Object.entries(next)) out[key] = withStaleDeletions(current[key], value);
  for (const key of Object.keys(current)) if (!(key in next) && !key.startsWith('-=')) out[`-=${key}`] = null;
  return out;
}

/** True only for items the species materializers themselves create (natural weapons, activated abilities). */
export function hasMaterializerSignature(item) {
  const swse = item?.flags?.swse;
  if (!swse?.speciesGranted) return false;
  const naturalWeapon = item.type === 'weapon' && swse.isNaturalWeapon === true && item.system?.source === 'species-natural-weapon';
  const speciesAbility = item.type === 'combat-action' && swse.isSpeciesAbility === true && !!swse.speciesAbilityId
    && item.system?.executionModel === 'species-activated-ability';
  return naturalWeapon || speciesAbility;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * @param {object} args
 * @param {string} args.grantKey            new grant identity
 * @param {object} args.plan                mutation plan so far: dotted system./flags. keys (+ itemsToCreate)
 * @param {object|null} args.manifest       previous manifest from the actor, if any
 * @param {object} args.actorState          { skills: {key:{trained,classSkill}}, conBase }
 * @param {Array}  args.items               actor items: [{id,type,name,flags:{swse:{...}}}]
 * @param {string} args.speciesName         new species name (legacy item reconciliation)
 * @param {Function} [args.readCurrent]   (dottedKey) => current actor value, used for stale-key deletion in object writes
 * @returns {{ resets: object, rewrites: object, ambiguousItemIds: string[], itemsToDelete: string[], itemsToCreate: Array, manifest: object }}
 */
export function reconcileSpeciesGrant({ grantKey, plan, manifest, actorState = {}, items = [], speciesName, readCurrent = () => undefined }) {
  const previous = manifest && typeof manifest === 'object' ? manifest : null;
  const sameGrant = !!previous && previous.grantKey === grantKey;
  const resets = {};

  // 1. Species-exclusive keys the plan does not write.
  for (const [key, value] of Object.entries(SPECIES_EXCLUSIVE_RESETS)) {
    if (!(key in plan)) resets[key] = structuredClone(value);
  }

  // 2. Keys a different previous grant wrote that this plan does not.
  if (previous && !sameGrant) {
    for (const [key, kind] of Object.entries(previous.written || {})) {
      if (key in plan || key in resets) continue;
      resets[key] = structuredClone(RESET_BY_KIND[kind] ?? null);
    }
  }

  // 3. Skills: revoke only what the previous (different) grant flipped on.
  const newTrained = new Set();
  const newClass = new Set();
  for (const key of Object.keys(plan)) {
    const m = /^system\.skills\.([^.]+)\.(trained|classSkill)$/.exec(key);
    if (m && plan[key] === true) (m[2] === 'trained' ? newTrained : newClass).add(m[1]);
  }
  if (previous && !sameGrant) {
    for (const skill of previous.trainedSkills || []) {
      if (!newTrained.has(skill)) resets[`system.skills.${skill}.trained`] = false;
    }
    for (const skill of previous.classSkills || []) {
      if (!newClass.has(skill)) resets[`system.skills.${skill}.classSkill`] = false;
    }
  }
  const flipped = (set, field) => [...set].filter(skill => getPath(actorState.skills, `${skill}.${field}`) !== true);
  // A skill the previous grant flipped on and the new grant also grants stays owned by the grant chain.
  const carry = (list) => (Array.isArray(previous?.[list]) ? previous[list] : []);
  const trainedSkills = [...new Set([...carry('trainedSkills'), ...flipped(newTrained, 'trained')])]
    .filter(skill => newTrained.has(skill));
  const classSkills = [...new Set([...carry('classSkills'), ...flipped(newClass, 'classSkill')])]
    .filter(skill => newClass.has(skill));

  // 4. Constitution base: noConstitution species zero it; remember the prior value so a later switch can restore it.
  let conBaseBefore = null;
  if (plan['system.attributes.con.base'] === 0) {
    const current = actorState.conBase;
    conBaseBefore = previous?.conBaseBefore ?? (Number.isFinite(current) && current !== 0 ? current : null);
  } else if (previous?.conBaseBefore != null && !('system.attributes.con.base' in plan)) {
    resets['system.attributes.con.base'] = previous.conBaseBefore;
  }

  // 5. Items: delete other grants' items, never duplicate this grant's.
  //    Keyed items (created after manifests existed) are compared by grant key. Legacy items have
  //    no key; they are only ever deleted when they carry the unmistakable signature of a species
  //    materializer AND the new grant has no matching item. A speciesGranted flag without such a
  //    signature is ambiguous: it is kept and reported, never auto-deleted.
  const itemIdentity = item => `${item.type}:${item.flags?.swse?.speciesAbilityId || item.flags?.swse?.sourceTrait || item.name}`;
  const plannedIdentities = new Set((plan.itemsToCreate || []).map(itemIdentity));
  const itemsToDelete = [];
  const ambiguousItemIds = [];
  const keep = new Set();
  for (const item of items) {
    const swse = item?.flags?.swse;
    if (!swse?.speciesGranted) continue;
    const identity = itemIdentity(item);
    if (swse.speciesGrantKey) {
      if (swse.speciesGrantKey !== grantKey) itemsToDelete.push(item.id);
      else keep.add(identity);
      continue;
    }
    // Legacy (unkeyed) item.
    if (swse.sourceSpecies && swse.sourceSpecies !== speciesName) {
      if (hasMaterializerSignature(item)) itemsToDelete.push(item.id);
      else ambiguousItemIds.push(item.id);
    } else if (plannedIdentities.has(identity)) {
      keep.add(identity);                                     // belongs to the new grant by identity
    } else if (hasMaterializerSignature(item)) {
      itemsToDelete.push(item.id);                            // same species, absent from the new profile
    } else {
      ambiguousItemIds.push(item.id);
    }
  }
  const itemsToCreate = [];
  const seen = new Set();
  for (const item of plan.itemsToCreate || []) {
    const id = itemIdentity(item);
    if (keep.has(id) || seen.has(id)) continue;
    seen.add(id);
    itemsToCreate.push({
      ...item,
      flags: { ...item.flags, swse: { ...item.flags?.swse, speciesGranted: true, speciesGrantKey: grantKey } },
    });
  }

  // 6. Manifest for the next reconciliation.
  const written = {};
  for (const key of Object.keys(plan).sort()) {
    if ((key.startsWith('system.') || key.startsWith('flags.')) && key !== MANIFEST_FLAG && !ALWAYS_REWRITTEN.has(key)
        && !/^system\.skills\./.test(key)) written[key] = kindOf(plan[key]);
  }
  const nextManifest = { grantKey, written, trainedSkills, classSkills, conBaseBefore };

  // 7. Object-valued writes must also delete the previous object's stale keys (Foundry merges objects).
  const rewrites = {};
  for (const [key, value] of Object.entries({ ...plan, ...resets })) {
    if (!isPlainObject(value)) continue;
    const fixed = withStaleDeletions(readCurrent(key), value);
    if (fixed !== value) rewrites[key] = fixed;
  }
  const manifestFixed = withStaleDeletions(readCurrent(MANIFEST_FLAG), nextManifest);

  return { resets, rewrites, itemsToDelete, itemsToCreate, ambiguousItemIds, manifest: manifestFixed };
}
