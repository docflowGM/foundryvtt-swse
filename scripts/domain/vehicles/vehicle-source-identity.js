/**
 * Phase 4E stabilization: the ONE implementation of the canonical identity /
 * provenance invariants for source-backed vehicles. The runtime contract
 * (creation, sheet, Store), derived calculations and combat all use it, so none
 * of them accepts a weaker definition of "this Actor is the published vehicle".
 *
 * A matching digest is tamper evidence over self-contained flags, not a
 * signature or proof of origin. No Foundry globals: Node-testable.
 */
import { getUniversalVehiclePackForCategory } from './universal-vehicle-pack-registry.js';
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';

export const SOURCE_SCHEMA = 'swse.vehicle.universal.actor-source.v1';

// Digest verification is recomputed on every call (about 0.1-0.3 ms for the largest record).
// It is deliberately NOT cached by object identity: an in-place mutation of an already
// verified record must never be accepted.
function digestMatches(record, expected) {
  if (!record || typeof record !== 'object') return false;
  return digestUniversalVehicleSource(record) === expected;
}

/** Does this vehicle make ANY publication claim (flags or identity mirrors)? */
export function claimsPublishedSource(vehicle) {
  const swse = vehicle?.flags?.swse;
  return Boolean(swse?.universalVehicleSource || swse?.canonicalPublication ||
    vehicle?.system?.vehicleSourceEntryKey || vehicle?.system?.vehicleSourcePrimaryCategory);
}

/**
 * @param {{sys:object, canonical:object, universal:object}} p
 * @returns {string[]} error codes (empty = identity verified)
 */
export function collectSourceIdentityErrors({ sys = {}, canonical, universal }) {
  const errors = [];
  const add = code => { if (!errors.includes(code)) errors.push(code); };
  const original = universal?.source;
  const key = original?.identity?.sourceEntryKey;
  const category = original?.classification?.primaryCategory;
  const book = original?.publication?.book, page = original?.publication?.page;
  const owner = getUniversalVehiclePackForCategory(category);

  if (universal?.schema !== SOURCE_SCHEMA || original?.recordType !== 'vehicle-source-entry' ||
      !/^[0-9a-f]{64}$/.test(String(universal?.recordDigest ?? '')))
    add('SOURCE_EVIDENCE_MISSING');
  else if (!digestMatches(original, universal.recordDigest)) add('SOURCE_RECORD_DIGEST_DRIFT');
  if (typeof key !== 'string' || !key.trim() ||
      sys.vehicleSourceEntryKey !== key || canonical?.sourceEntryKey !== key)
    add('SOURCE_IDENTITY_DRIFT');
  if (!book || page === undefined || page === null ||
      sys.vehicleSourceBook !== book || sys.vehicleSourcePage !== page ||
      canonical?.sourceBook !== book || canonical?.printedPage !== page)
    add('SOURCE_PUBLICATION_DRIFT');
  if (!owner || sys.vehiclePackName !== owner.name ||
      sys.vehicleSourcePrimaryCategory !== category || sys.category !== category)
    add('SOURCE_CATEGORY_DRIFT');
  if (typeof original?.identity?.name !== 'string' || sys.model !== original.identity.name)
    add('SOURCE_MODEL_DRIFT');
  if (canonical?.sourceCertification !== 'SOURCE_ONLY' ||
      canonical?.foundryStockAttackTrusted !== false ||
      canonical?.physicalMountCertification !== false)
    add('SOURCE_ONLY_TRUST_REQUIRED');
  return errors;
}

/** The verified publication record of a vehicle, or null (claims never fall back to legacy). */
export function getVerifiedPublishedRecord(vehicle) {
  const flags = vehicle?.flags?.swse;
  if (!flags?.universalVehicleSource) return null;
  const errors = collectSourceIdentityErrors({
    sys: vehicle.system ?? {}, canonical: flags.canonicalPublication, universal: flags.universalVehicleSource
  });
  return errors.length ? null : flags.universalVehicleSource.source;
}

/* ------------------------------------------------------------------ */
/* Update protection                                                   */
/* ------------------------------------------------------------------ */

const PROTECTED_FLAG_ROOTS = ['flags.swse.universalVehicleSource', 'flags.swse.canonicalPublication'];
// Legacy published-field mirrors (validated against the record at creation) are published
// facts too: price, crew, passengers, cargo, consumables, hyperdrive, size, movement.
const PROTECTED_SYSTEM = [
  /^system\.cost$/, /^system\.costNumeric$/, /^system\.crew$/, /^system\.passengers$/,
  /^system\.cargo$/, /^system\.consumables$/, /^system\.size$/, /^system\.vehicleCrew/,
  /^system\.vehiclePassengers$/,
  /^system\.vehicleSource/, /^system\.vehiclePackName$/, /^system\.vehiclePublished/,
  /^system\.model$/, /^system\.category$/, /^system\.sourceAttackGroups/,
  /^system\.vehicleMovementModes/, /^system\.initiative$/, /^system\.hp\.max$/,
  /^system\.reflexDefense$/, /^system\.fortitudeDefense$/, /^system\.shieldRating$/,
  /^system\.shields\.max$/
];

function leaves(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && !/^(-=|==)/.test(k)) leaves(v, path, out);
    else out.push([path, v]);
  }
  return out;
}
function byPath(obj, path) {
  return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}
const protectedPath = path => PROTECTED_FLAG_ROOTS.some(r => path === r || path.startsWith(r + '.')) ||
  PROTECTED_SYSTEM.some(rx => rx.test(path));
const isPrefixOfProtected = path => PROTECTED_FLAG_ROOTS.some(r => r === path || r.startsWith(path + '.')) ||
  path === 'system' || path === 'flags';

/**
 * Only a change that actually alters a published identity/source/printed field is refused;
 * a write that re-submits the current value is a no-op and allowed. Deleting or force-
 * replacing a parent key that contains protected data is refused.
 * @returns {{ok:boolean, paths:string[]}}
 */
/**
 * One-shot write authorization for a GM-authorized published-errata migration (vehicle-errata-migration-service):
 * the exact leaf values it is about to write. Any other change to a protected path is still denied, and the
 * provenance guard still re-validates the post-update Actor.
 */
const pendingProvenanceWrites = new Map();
export function authorizeProvenanceMigration(actorId, update) { pendingProvenanceWrites.set(actorId, new Map(leaves(expandDotted(update)).map(([p, v]) => [p, JSON.stringify(v)]))); }
export function clearProvenanceMigration(actorId) { pendingProvenanceWrites.delete(actorId); }
function expandDotted(update) {
  const out = {};
  for (const [path, value] of Object.entries(update ?? {})) {
    const keys = path.split('.'); let node = out;
    for (const k of keys.slice(0, -1)) node = node[k] ??= {};
    node[keys.at(-1)] = value;
  }
  return out;
}

export function checkProvenanceUpdate(actor, changes) {
  if (actor?.type !== 'vehicle' || !claimsPublishedSource(actor)) return { ok: true, paths: [] };
  const current = actor._source ?? actor;
  const denied = [];
  const authorized = pendingProvenanceWrites.get(actor.id);
  for (const [path, value] of leaves(changes)) {
    const marker = path.match(/^(.*?)(?:^|\.)(-=|==)([^.]+)$/);
    if (marker) {
      const stripped = path.replace(/(^|\.)(-=|==)/, '$1');
      if (protectedPath(stripped) || isPrefixOfProtected(stripped)) denied.push(path);
      continue;
    }
    if (!protectedPath(path)) continue;
    if (authorized && authorized.get(path) === JSON.stringify(value)) continue;
    if (JSON.stringify(byPath(current, path)) !== JSON.stringify(value)) denied.push(path);
  }
  return { ok: denied.length === 0, paths: denied };
}
