// ============================================
// FILE: scripts/data/talent-source-identity.js
// Canonical talent source identity (Phase 3G)
// ============================================
//
// THE one place that knows how a canonical compendium talent is identified across its three lives:
//
//   compendium record  --(finalizer clone, NEW embedded _id)-->  embedded actor item
//   compendium record  --(talent step)-->                        pending progression selection
//
// Durable identity = the talent's canonical compendium UUID, stored in the v13 form
//     Compendium.foundryvtt-swse.talents.Item.<_id>
// The older source-link form already present on Phase-3D actor snapshots (`Compendium.foundryvtt-swse.talents.<_id>`)
// names the SAME talent and is accepted wherever a UUID is read. Names and slugs are never part of authoritative equality;
// `flags.swse.id` is compatibility evidence only (not total, not unique).
//
// Nothing outside this module may build or parse these strings.
// ============================================

export const TALENT_PACK = 'foundryvtt-swse.talents';
// Production ids are 16 hex; nine legacy records carry 32-hex ids — both are real compendium _ids.
const PACK_ID = /^(?:[0-9a-f]{16}|[0-9a-f]{32})$/;
const UUID = /^Compendium\.([^.]+\.[^.]+)\.(?:Item\.)?([0-9a-zA-Z]{16}|[0-9a-f]{32})$/;

/** @returns {string|null} the canonical talent `_id` for a bare pack id or either UUID form; null for anything else. */
export function canonicalTalentId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const m = UUID.exec(raw);
  if (m) return m[1] === TALENT_PACK ? m[2] : null;
  return PACK_ID.test(raw) ? raw : null;
}

/** Canonical v13 UUID for a talent `_id`, a record (`_id`), or any recognised UUID form. */
export function canonicalTalentUuid(value) {
  const id = canonicalTalentId(typeof value === 'object' && value !== null ? (value._id ?? value.sourceId ?? value.uuid ?? value.id) : value);
  return id ? `Compendium.${TALENT_PACK}.Item.${id}` : null;
}

/** Both UUID spellings name the same talent. */
export function sameTalentUuid(a, b) {
  const x = canonicalTalentId(a), y = canonicalTalentId(b);
  return !!x && x === y;
}

/** `flags.swse.id` — compatibility evidence only. */
export function swseTalentIdOf(entry) {
  return entry?.flags?.swse?.id || entry?.system?.flags?.swse?.id || null;
}

/**
 * Source identity of an item/selection, with the basis that produced it.
 *   embedded actor item : flags.core.sourceId (either form) | _stats.compendiumSource
 *   pending selection   : sourceUuid | uuid | flags.core.sourceId (threaded by the talent step) | a bare compendium `_id` in `id` (compat)
 * `authoritative` is true for every UUID-bearing basis; a bare `id` is a compatibility identity (still an identity, never a name).
 * @returns {{uuid:string, basis:string, authoritative:boolean}|null}
 */
export function sourceIdentityOf(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const tries = [
    ['flags.core.sourceId', entry.flags?.core?.sourceId, true],
    ['_stats.compendiumSource', entry._stats?.compendiumSource, true],
    ['sourceUuid', entry.sourceUuid, true],
    ['uuid', entry.uuid, true],
    ['sourceId', entry.sourceId, true]
  ];
  for (const [basis, value, authoritative] of tries) { const uuid = canonicalTalentUuid(String(value ?? '')); if (uuid) return { uuid, basis, authoritative }; }
  // Pending selections carry the compendium _id as `id`; an embedded item's id is a fresh Foundry id and is NOT trusted as a compendium id.
  if (!entry._stats && !entry.flags?.core && !entry.parent && PACK_ID.test(String(entry.id ?? ''))) {
    const uuid = canonicalTalentUuid(entry.id); if (uuid) return { uuid, basis: 'compendiumId', authoritative: false };
  }
  return null;
}

/** Canonical UUID for an embedded actor talent (null when it was never source-linked). */
export function sourceUuidOfEmbedded(item) {
  const i = sourceIdentityOf({ flags: item?.flags, _stats: item?._stats, sourceUuid: item?.sourceUuid });
  return i?.uuid ?? null;
}

/** Canonical UUID for a pending progression selection. */
export function sourceUuidOfPending(entry) {
  return sourceIdentityOf(entry)?.uuid ?? null;
}

/**
 * The identity a structured prerequisite leaf TARGETS: a UUID (either form), or — compatibility for unmigrated Phase 3D leaves — a bare compendium `_id`.
 * @returns {{uuid:string, basis:'uuid'|'compendiumId'}|null}
 */
export function targetIdentityOfLeaf(leaf) {
  if (!leaf || typeof leaf !== 'object') return null;
  const byUuid = canonicalTalentUuid(String(leaf.uuid ?? ''));
  if (byUuid) return { uuid: byUuid, basis: 'uuid' };
  if (leaf.uuid) return { uuid: null, basis: 'uuid-unrecognised' };
  const byId = PACK_ID.test(String(leaf.id ?? '')) ? canonicalTalentUuid(leaf.id) : null;
  return byId ? { uuid: byId, basis: 'compendiumId' } : null;
}

/**
 * Compare a leaf's target against ONE candidate (embedded item or pending entry).
 *   match: true | false | null   (null = the candidate carries no canonical identity, so identity cannot decide)
 *   authoritative: the decision rests on a UUID-bearing basis
 * A candidate WITH a different canonical identity is a definite non-match (match:false) — it must never be downgraded to a name match.
 */
export function compareToTarget(target, candidate) {
  if (!target?.uuid) return { match: null, authoritative: false, basis: null };
  const id = sourceIdentityOf(candidate);
  if (!id) return { match: null, authoritative: false, basis: null };
  return { match: sameTalentUuid(target.uuid, id.uuid), authoritative: id.authoritative, basis: id.basis };
}

/** Runtime tree id of a canonical talent via a TalentTreeDB-like index (null when the DB is not built or does not know it). */
export function treeRuntimeIdOfCanonical(db, uuid) {
  try { return db?.isBuilt ? (db.talentToTree?.get(canonicalTalentId(uuid)) ?? null) : null; } catch { return null; }
}

/** Runtime tree id of an actor/pending talent (its `system.treeId` is the persistent tree _id since Phase 3F). */
export function treeRuntimeIdOfItem(db, item) {
  try {
    const raw = item?.system?.treeId ?? item?.treeId;
    return raw && db?.isBuilt ? (db.bySourceId?.(raw)?.id ?? db.byId?.(raw)?.id ?? null) : null;
  } catch { return null; }
}

/**
 * The ONE decision rule for "does this candidate satisfy this target?" (used by the checker and the snapshot evaluator).
 *   1. a UUID-bearing candidate: identity decides (match true/false) - a different canonical identity is NEVER downgraded to a name match;
 *   2. a candidate with no canonical identity (legacy / unlinked): name fallback ONLY when the leaf carries a name, and never across a known tree mismatch;
 *   `fallback:true` marks every non-identity decision so callers can report it.
 */
export function decideCandidate(target, candidate, { name = null, db = null } = {}) {
  const cmp = compareToTarget(target, candidate);
  if (cmp.match === true) return { match: true, via: cmp.authoritative ? 'uuid' : 'compendiumId', fallback: false, authoritative: cmp.authoritative, basis: cmp.basis };
  if (cmp.match === false) return { match: false, via: null, fallback: false, authoritative: true, basis: cmp.basis };
  if (name && String(candidate?.name ?? '').toLowerCase() === String(name).toLowerCase()) {
    const t = target?.uuid ? treeRuntimeIdOfCanonical(db, target.uuid) : null, c = treeRuntimeIdOfItem(db, candidate);
    if (t && c && t !== c) return { match: false, via: null, fallback: false, authoritative: false, basis: 'tree-mismatch' };
    return { match: true, via: 'name', fallback: true, authoritative: false, basis: 'legacy-unlinked-name' };
  }
  return { match: false, via: null, fallback: false, authoritative: false, basis: null };
}

/** Stamp the canonical source link on embedded-item creation data (preserves unrelated flags; never touches `_id`). */
export function stampSourceLink(itemData, source) {
  const uuid = canonicalTalentUuid(source);
  if (!itemData || !uuid) return itemData;
  itemData.flags = { ...(itemData.flags ?? {}), core: { ...(itemData.flags?.core ?? {}), sourceId: uuid } };
  return itemData;
}

/** Fields to merge into a pending selection built from a canonical talent record so its identity survives every later transformation. */
export function pendingSourceFields(record) {
  const uuid = canonicalTalentUuid(record);
  return uuid ? { sourceUuid: uuid, uuid, flags: { core: { sourceId: uuid } } } : {};
}

export default {
  TALENT_PACK, canonicalTalentId, canonicalTalentUuid, sameTalentUuid, swseTalentIdOf, sourceIdentityOf, sourceUuidOfEmbedded,
  sourceUuidOfPending, targetIdentityOfLeaf, compareToTarget, decideCandidate, treeRuntimeIdOfCanonical, treeRuntimeIdOfItem, stampSourceLink, pendingSourceFields
};
