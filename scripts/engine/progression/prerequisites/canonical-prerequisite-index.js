/**
 * Canonical prerequisite index (PRQ.1D): runtime reader of the GENERATED, UUID-keyed index
 * (`data/generated/canonical-prerequisite-index.json`, built by tools/build-canonical-prerequisite-index.mjs).
 *
 * Contract (docs/architecture/v2-contracts/PRQ-canonical-prerequisite-registry.md):
 *  - The index is derivative; it has no editing workflow and is never an authority apart from its sources.
 *  - Only a COMPILED entry is evaluated from its structure (never by re-parsing prose). Every other state, a missing index, or an item with no canonical
 *    UUID returns null here, and the caller keeps its previous behavior. Nothing in this module makes anything eligible.
 *  - Identity is the canonical compendium UUID of the item (embedded source link or compendium document); a display name is never a key.
 */
import { sourceIdentityOf } from '/systems/foundryvtt-swse/scripts/data/talent-source-identity.js';

const FEAT_PACK = 'foundryvtt-swse.feats';
const FEAT_UUID = /^Compendium\.foundryvtt-swse\.feats\.(?:Item\.)?([0-9a-zA-Z]{16}|[0-9a-f]{32})$/;
const INDEX_SCHEMA = 'swse.canonical-prerequisite-index.v1';

let INDEX = null;

/** Install an already-parsed index (system init, tests). A document with another schema is refused. */
export function installCanonicalPrerequisiteIndex(json) {
  INDEX = json && json.schema === INDEX_SCHEMA && json.entries && typeof json.entries === 'object' ? json : null;
  return INDEX !== null;
}

export function clearCanonicalPrerequisiteIndex() { INDEX = null; }
export function isCanonicalPrerequisiteIndexLoaded() { return INDEX !== null; }

/** Load the generated index through `fetchFn` (default: global fetch). Never throws; a failure leaves the previous behavior in force. */
export async function loadCanonicalPrerequisiteIndex(fetchFn = globalThis.fetch, url = 'systems/foundryvtt-swse/data/generated/canonical-prerequisite-index.json') {
  try {
    const response = await fetchFn(url);
    if (!response?.ok) return false;
    return installCanonicalPrerequisiteIndex(await response.json());
  } catch (_err) {
    return false;
  }
}

/** Canonical feat UUID of an item/pending entry, from a UUID-bearing basis only (null when it was never source-linked). */
export function canonicalFeatUuidOf(entry) {
  if (!entry || typeof entry !== 'object') return null;
  for (const value of [entry.flags?.core?.sourceId, entry._stats?.compendiumSource, entry.sourceUuid, entry.uuid, entry.sourceId]) {
    const m = FEAT_UUID.exec(String(value ?? '').trim());
    if (m) return `Compendium.${FEAT_PACK}.Item.${m[1]}`;
  }
  return null;
}

/** The COMPILED index entry for a feat or talent item, or null (no index, no canonical UUID, not in the index, or any state other than COMPILED). */
export function compiledPrerequisiteEntryFor(domain, item) {
  if (!INDEX) return null;
  const uuid = domain === 'feat' ? canonicalFeatUuidOf(item) : domain === 'talent' ? (sourceIdentityOf(item)?.uuid ?? null) : null;
  if (!uuid) return null;
  const entry = INDEX.entries[uuid];
  if (!entry || entry.domain !== domain || entry.state !== 'COMPILED') return null;
  if (!entry.structure || !Array.isArray(entry.structure.conditions) || entry.structure.conditions.length === 0) return null;
  return { uuid, ...entry };
}

/**
 * Map one COMPILED index leaf to a PrerequisiteEvaluator requirement (PRQ: the evaluator is the interpreter; the index says WHAT is required). `skillKeyOf`
 * resolves the index's skill id to the runtime skill key. Returns null for a leaf type the grammar does not define (the caller then fails closed).
 */
export function compiledLeafToRequirement(leaf, skillKeyOf = (id) => id) {
  switch (leaf?.type) {
    case 'skillTrained': { const key = skillKeyOf(leaf.skill); return key ? { type: 'skill', key, name: key, trained: true } : null; }
    case 'attribute': return { type: 'ability', ability: leaf.ability, min: leaf.min };
    case 'bab': return { type: 'bab', min: leaf.min };
    case 'species': {
      const names = Array.isArray(leaf.species) ? leaf.species : [leaf.species];
      return names.length === 1 ? { type: 'species', name: names[0] } : { type: 'or', conditions: names.map((name) => ({ type: 'species', name })) };
    }
    case 'feat': return { type: 'feat', name: leaf.name, uuid: leaf.uuid };
    case 'talent': return { type: 'talent', name: leaf.name, uuid: leaf.uuid };
    default: return null;
  }
}
