/**
 * Droid appendage instance identity (Gate C-1) -- PURE.
 *
 * Core p.190 allows any number of appendages, so a droid may carry several of
 * the same kind (two hands, five tool appendages and a claw). The installation
 * ledger (`system.installedSystems`) was keyed by canonical PART id, which can
 * only describe one of each kind. This module defines the identity vocabulary
 * the equipment layer already uses (OA-8, droid-appendage-projection.js) and
 * supplies the pure helpers the single mutation authority
 * (DroidCustomizationEngine) and the read model (resolver / projection) share:
 *
 *   part      canonical component definition id ("hand")      -- WHAT it is
 *   instance  one physical installed component                -- WHICH one
 *   location  stable physical position token on the droid     -- WHERE
 *
 * Nothing here is a rule. There is no capacity, no maximum, no anatomical
 * naming and no capability inference: an instance id and a location token are
 * opaque bookkeeping so two hands can be told apart. Location tokens are NOT
 * "left-arm"/"right-arm"; the printed rules name no position for a purchased
 * appendage, so none is invented. A model that prints positions can supply
 * them as the `locationId` of its own seeded evidence.
 *
 * Ledger shape for an instance entry (key is opaque; the fields are the
 * identity and nothing may parse the key):
 *
 *   installedSystems["hand--inst-9f3a2b1c"] = {
 *     id: "hand", instanceId: "inst-9f3a2b1c", locationId: "appendage-slot-1",
 *     hostInstanceId?: "<instance this part is fitted to>", ...usual fields
 *   }
 *
 * Entries without `instanceId` are LEGACY evidence and keep their old
 * meaning: one part-id-keyed record that proves no physical instance.
 *
 * Contract: no Foundry imports, no actor access, no I/O. Randomness is
 * injected so every function is deterministic under test.
 */

export const APPENDAGE_INSTANCE_ID_PREFIX = 'inst-';
export const APPENDAGE_LOCATION_ID_PREFIX = 'appendage-slot-';
export const APPENDAGE_LEDGER_KEY_SEPARATOR = '--';

const INSTANCE_ID_PATTERN = /^inst-[a-z0-9]{6,32}$/;
const LOCATION_ID_PATTERN = /^appendage-slot-[1-9][0-9]*$/;

function clean(value) {
  return String(value ?? '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A "physical appendage" is a BASE appendage definition (hand, claw, tool,
 * instrument, probe, mount). Enhancements, mounts-on-appendages, appendage
 * weapons, shields and utilities are fitted TO an appendage and are never
 * appendages themselves. This is the one predicate; the E2A projection
 * applies the same test.
 */
export function isPhysicalAppendageDefinition(definition) {
  return definition?.slot === 'appendage' && definition?.category === 'appendage';
}

/**
 * Which display-mirror list a component with the appendage CATEGORY belongs in.
 * Base appendages are the physical list; every other appendage-category part
 * (enhancements, mounts, weapons, shields, utilities) is fitted TO an
 * appendage and is kept apart so the physical list stays a list of limbs.
 */
export function appendageMirrorBucket(definition) {
  if (definition?.category !== 'appendage') return null;
  return isPhysicalAppendageDefinition(definition) ? 'appendages' : 'appendageEnhancements';
}

export function isValidInstanceId(value) {
  return INSTANCE_ID_PATTERN.test(clean(value));
}

export function isValidLocationId(value) {
  return LOCATION_ID_PATTERN.test(clean(value));
}

/** Opaque ledger key. Never parsed back; readers use the entry's own fields. */
export function ledgerKeyForInstance(partId, instanceId) {
  return `${clean(partId)}${APPENDAGE_LEDGER_KEY_SEPARATOR}${clean(instanceId)}`;
}

/**
 * Every ledger entry that carries a well-formed instance identity.
 * Legacy entries (no instanceId) are deliberately excluded: they prove no
 * physical instance. Malformed identities are reported, not repaired.
 *
 * @param {object} installedSystems  actor.system.installedSystems
 * @returns {{instances: object[], malformed: object[]}}
 */
export function listLedgerInstances(installedSystems) {
  const instances = [];
  const malformed = [];
  if (!isPlainObject(installedSystems)) return { instances, malformed };
  const seen = new Map();
  for (const [key, entry] of Object.entries(installedSystems)) {
    if (!isPlainObject(entry)) continue;
    const hasInstanceField = entry.instanceId !== undefined && entry.instanceId !== null;
    if (!hasInstanceField) continue;
    const instanceId = clean(entry.instanceId);
    const partId = clean(entry.id);
    const locationId = entry.locationId == null ? null : clean(entry.locationId);
    const hostInstanceId = entry.hostInstanceId == null ? null : clean(entry.hostInstanceId);
    const problems = [];
    if (!isValidInstanceId(instanceId)) problems.push('instanceId is not a well-formed instance identity');
    if (!partId) problems.push('part id is missing');
    if (locationId !== null && !isValidLocationId(locationId)) problems.push('locationId is not a well-formed location token');
    if (hostInstanceId !== null && !isValidInstanceId(hostInstanceId)) problems.push('hostInstanceId is not a well-formed instance identity');
    if (seen.has(instanceId)) problems.push(`instanceId duplicates ledger entry "${seen.get(instanceId)}"`);
    else seen.set(instanceId, key);
    const record = { ledgerKey: key, partId, instanceId, locationId, hostInstanceId, entry };
    if (problems.length) malformed.push({ ...record, problems });
    else instances.push(record);
  }
  return { instances, malformed };
}

/** Well-formed instances of ONE part kind (e.g. every "hand"). */
export function instancesOfPart(installedSystems, partId) {
  const wanted = clean(partId);
  return listLedgerInstances(installedSystems).instances.filter(i => i.partId === wanted);
}

/** One instance by id, or null. */
export function findInstance(installedSystems, instanceId) {
  const wanted = clean(instanceId);
  if (!wanted) return null;
  return listLedgerInstances(installedSystems).instances.find(i => i.instanceId === wanted) ?? null;
}

/**
 * Parts fitted to an instance (entries whose `hostInstanceId` names it).
 * Removing a host while any exists would orphan them.
 */
export function dependentsOfInstance(installedSystems, instanceId) {
  const wanted = clean(instanceId);
  if (!wanted || !isPlainObject(installedSystems)) return [];
  return Object.entries(installedSystems)
    .filter(([, entry]) => isPlainObject(entry) && clean(entry.hostInstanceId) === wanted)
    .map(([ledgerKey, entry]) => ({ ledgerKey, partId: clean(entry.id), entry }));
}

/**
 * Mint a fresh instance id not present in `taken`.
 * @param {Iterable<string>} taken
 * @param {() => string} randomSource  returns a lowercase [a-z0-9] string >= 6 chars
 */
export function mintInstanceId(taken = [], randomSource = defaultRandomSource) {
  const used = new Set([...taken].map(clean));
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const raw = clean(randomSource()).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    const candidate = `${APPENDAGE_INSTANCE_ID_PREFIX}${raw}`;
    if (isValidInstanceId(candidate) && !used.has(candidate)) return candidate;
  }
  throw new Error('Unable to mint a unique appendage instance id');
}

/**
 * Smallest unused location token. Tokens are opaque and carry no anatomy.
 * @param {Iterable<string>} taken
 */
export function mintLocationId(taken = []) {
  const used = new Set([...taken].map(clean));
  for (let n = 1; n <= used.size + 1; n += 1) {
    const candidate = `${APPENDAGE_LOCATION_ID_PREFIX}${n}`;
    if (!used.has(candidate)) return candidate;
  }
  /* c8 ignore next */
  throw new Error('Unable to mint a unique appendage location id');
}

/** Identity facts of every well-formed instance, for collision-free minting. */
export function takenIdentities(installedSystems, droidSystems = null) {
  const instanceIds = new Set();
  const locationIds = new Set();
  const add = (entry) => {
    if (!isPlainObject(entry)) return;
    if (entry.instanceId != null && clean(entry.instanceId)) instanceIds.add(clean(entry.instanceId));
    if (entry.locationId != null && clean(entry.locationId)) locationIds.add(clean(entry.locationId));
  };
  if (isPlainObject(installedSystems)) Object.values(installedSystems).forEach(add);
  const mirror = droidSystems?.appendages;
  if (Array.isArray(mirror)) mirror.forEach(add);
  return { instanceIds, locationIds };
}

function defaultRandomSource() {
  const foundryRandom = globalThis.foundry?.utils?.randomID;
  if (typeof foundryRandom === 'function') return foundryRandom(10);
  const crypto = globalThis.crypto;
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0');
}

/**
 * Check that the `droidSystems.appendages` display mirror agrees with the
 * ledger. The ledger is authoritative; the mirror is a display/draft blob.
 * Returns the disagreements (empty = consistent). Used by tests and by the
 * engine to refuse to mutate an already-inconsistent droid.
 */
export function auditAppendageMirror(installedSystems, droidSystems) {
  const problems = [];
  const { instances, malformed } = listLedgerInstances(installedSystems);
  for (const bad of malformed) problems.push({ code: 'LEDGER_INSTANCE_MALFORMED', instanceId: bad.instanceId, details: bad.problems });
  const physical = instances.filter(i => !i.hostInstanceId);
  const mirror = Array.isArray(droidSystems?.appendages) ? droidSystems.appendages : [];
  const mirrored = new Map();
  for (const entry of mirror) {
    if (!isPlainObject(entry) || entry.instanceId == null) continue;
    const id = clean(entry.instanceId);
    if (mirrored.has(id)) problems.push({ code: 'MIRROR_INSTANCE_DUPLICATED', instanceId: id });
    mirrored.set(id, entry);
  }
  for (const inst of physical) {
    const m = mirrored.get(inst.instanceId);
    if (!m) { problems.push({ code: 'MIRROR_INSTANCE_MISSING', instanceId: inst.instanceId }); continue; }
    if (clean(m.id) !== inst.partId) problems.push({ code: 'MIRROR_PART_DISAGREES', instanceId: inst.instanceId });
    if (inst.locationId !== null && clean(m.locationId) !== inst.locationId) problems.push({ code: 'MIRROR_LOCATION_DISAGREES', instanceId: inst.instanceId });
  }
  const ledgerIds = new Set(physical.map(i => i.instanceId));
  for (const id of mirrored.keys()) if (!ledgerIds.has(id)) problems.push({ code: 'MIRROR_INSTANCE_NOT_IN_LEDGER', instanceId: id });
  return problems;
}
