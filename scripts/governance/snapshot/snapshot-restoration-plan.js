/**
 * Snapshot Restoration Plan Builders
 *
 * PHASE 10 ADDENDUM (P1-7) — Exact, Failure-Aware Snapshot Restoration.
 *
 * Pure, dependency-free helpers that turn "a snapshot" and "the actor's
 * current state" into concrete, deletion-aware restoration plans —
 * separate from scripts/governance/snapshot/snapshot-service.js's actual
 * ActorEngine orchestration, so the decision logic itself is directly
 * unit-testable under plain Node.
 */

import { buildDeletionAwarePatch } from "/systems/foundryvtt-swse/scripts/governance/snapshot/deletion-aware-patch.js";

export const SNAPSHOT_RESTORATION_SCOPE = Object.freeze({
  FULL_ACTOR: 'full-actor',
  TRANSACTION_ROLLBACK: 'transaction-rollback',
  SYSTEM_AND_FLAGS: 'system-and-flags',
  EMBEDDED_ITEMS: 'embedded-items'
});

// Never let a restore touch the snapshot history ledger itself, regardless
// of what a (possibly stale) snapshot's own flags happen to contain.
const PROTECTED_FLAG_PATHS = Object.freeze(['foundryvtt-swse.snapshots', 'swse.snapshots']);

function includesRootFields(scope) {
  return scope === SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR || scope === SNAPSHOT_RESTORATION_SCOPE.TRANSACTION_ROLLBACK;
}

function includesSystemAndFlags(scope) {
  return includesRootFields(scope) || scope === SNAPSHOT_RESTORATION_SCOPE.SYSTEM_AND_FLAGS;
}

/**
 * Build a single flat, deletion-aware dot-path patch that restores an
 * Actor's root document fields to a snapshot's values — never a plain
 * merge. Fields outside the requested `scope` are left entirely
 * untouched (not even read). `_id`/`type` are never referenced and can
 * never appear in the returned patch, since this function only ever
 * builds paths rooted at `system`/`flags`/`ownership`/`prototypeToken`
 * or the literal `name`/`img` keys.
 *
 * @param {object} params
 * @param {object} params.snapshotActor - the snapshot's actor-root data
 *   (expects any of `name`, `img`, `system`, `flags`, `ownership`,
 *   `prototypeToken` — fields absent from BOTH the snapshot and the
 *   requested scope are simply not patched).
 * @param {object} params.currentActor - the actor's current root data in
 *   the same shape, used only to detect fields introduced since the
 *   snapshot was taken.
 * @param {string} params.scope - one of SNAPSHOT_RESTORATION_SCOPE.
 * @returns {Record<string, unknown>}
 */
export function buildActorRootRestorationPatch({ snapshotActor = {}, currentActor = {}, scope = SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR } = {}) {
  const patch = {};

  if (includesRootFields(scope)) {
    if (snapshotActor.name !== undefined) patch.name = snapshotActor.name;
    if (snapshotActor.img !== undefined) patch.img = snapshotActor.img;
  }

  if (includesSystemAndFlags(scope) && snapshotActor.system !== undefined) {
    Object.assign(patch, buildDeletionAwarePatch({
      previous: snapshotActor.system ?? {},
      current: currentActor.system ?? {},
      rootPath: 'system'
    }));
  }

  if (includesSystemAndFlags(scope) && snapshotActor.flags !== undefined) {
    Object.assign(patch, buildDeletionAwarePatch({
      previous: snapshotActor.flags ?? {},
      current: currentActor.flags ?? {},
      rootPath: 'flags',
      excludePaths: PROTECTED_FLAG_PATHS
    }));
  }

  if (includesRootFields(scope) && snapshotActor.ownership !== undefined) {
    Object.assign(patch, buildDeletionAwarePatch({
      previous: snapshotActor.ownership ?? {},
      current: currentActor.ownership ?? {},
      rootPath: 'ownership'
    }));
  }

  if (includesRootFields(scope) && snapshotActor.prototypeToken !== undefined) {
    Object.assign(patch, buildDeletionAwarePatch({
      previous: snapshotActor.prototypeToken ?? {},
      current: currentActor.prototypeToken ?? {},
      rootPath: 'prototypeToken'
    }));
  }

  return patch;
}

function documentId(doc) {
  return doc?._id ?? doc?.id ?? null;
}

function deepEqualPlain(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Build a deterministic embedded-document (Item/ActiveEffect) restoration
 * plan by diffing snapshot documents against the actor's current
 * documents BY ID — never an unconditional "delete all, recreate
 * without ids" sweep.
 *
 * @param {object} params
 * @param {object[]} params.snapshotDocuments - full source objects from
 *   the snapshot, each carrying its original `_id`.
 * @param {object[]} params.currentDocuments - the actor's current
 *   embedded documents (or their `.toObject()`/source equivalents).
 * @returns {{create: object[], update: object[], deleteIds: string[], expectedIds: string[]}}
 *   `create` entries retain their original `_id` (for `keepId: true`
 *   creation); `update` entries are full-source-replace patches
 *   (`{_id, ...everyLeafField}`) built via the same deletion-aware patch
 *   mechanism as the root restore, so a field added to an Item/Effect
 *   after the snapshot is deleted, not merely left unmerged.
 */
export function buildEmbeddedDocumentRestorePlan({ snapshotDocuments = [], currentDocuments = [] } = {}) {
  const snapshotById = new Map();
  for (const doc of snapshotDocuments) {
    const id = documentId(doc);
    if (id) snapshotById.set(id, doc);
  }
  const currentById = new Map();
  for (const doc of currentDocuments) {
    const id = documentId(doc);
    if (id) currentById.set(id, doc);
  }

  const create = [];
  const update = [];
  const deleteIds = [];

  for (const [id, snapshotDoc] of snapshotById) {
    const currentDoc = currentById.get(id);
    if (!currentDoc) {
      create.push({ ...snapshotDoc, _id: id });
      continue;
    }
    if (!deepEqualPlain(snapshotDoc, currentDoc)) {
      const patch = buildDeletionAwarePatch({ previous: snapshotDoc, current: currentDoc, rootPath: '' });
      delete patch['-=_id'];
      update.push({ ...patch, _id: id });
    }
  }

  for (const id of currentById.keys()) {
    if (!snapshotById.has(id)) deleteIds.push(id);
  }

  return { create, update, deleteIds, expectedIds: [...snapshotById.keys()] };
}
