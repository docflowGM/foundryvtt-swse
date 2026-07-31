/**
 * Fake ActorEngine — PHASE 4 Foundry-shim test harness.
 *
 * Implements the exact subset of ActorEngine's public interface that
 * scripts/domain/droids/droid-statblock-conversion-service.js,
 * scripts/domain/droids/droid-converted-system-reconciliation-service.js,
 * and scripts/engine/progression/utils/snapshot-manager.js actually call:
 * `applyMutationPlan(actor, plan, options)`, `updateActor(actor, data,
 * options)`, and `restoreFromSnapshot(actor, snapshot, options)`. Per
 * docs/audits/droid-converted-system-reconciliation-phase-4.md's
 * "Foundry-shim harness" section: the real ActorEngine transitively
 * imports most of the engine layer and is too heavy for a narrow test
 * harness, so this stubs its approved public interface (mutating a plain
 * fake actor object directly, synchronously) rather than bypassing it or
 * making production code depend on a test-only seam.
 *
 * `restoreFromSnapshot` is a faithful reimplementation of
 * scripts/governance/snapshot/snapshot-service.js#restoreFromSnapshot,
 * verified line-by-line against that file during Phase 4: it replaces
 * `system`/`name`/`img`/`prototypeToken`, deletes-then-recreates `items`
 * and `effects` from the snapshot — and deliberately does NOT touch
 * `actor.flags`, matching the real implementation's confirmed limitation
 * (see droid-statblock-conversion-service.js#rollbackConversion's own doc
 * comment for why that matters and how it's compensated for).
 */

function deepCloneJSON(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function setPath(target, dotPath, value) {
  const parts = String(dotPath).split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  }
  const lastKey = parts[parts.length - 1];
  // Mirror real Foundry Document#update()'s deletion-key convention: a
  // final path segment prefixed with '-=' deletes that property instead of
  // setting a literal '-=name' key (see e.g.
  // scripts/migrations/phase5-compendium-heal.js for an existing,
  // production use of this exact convention).
  if (lastKey.startsWith('-=')) {
    delete node[lastKey.slice(2)];
    return;
  }
  node[lastKey] = value;
}

export const fakeActorEngineCallLog = [];

let fakeIdCounter = 0;
function nextFakeId() {
  fakeIdCounter += 1;
  return `fake-id-${fakeIdCounter}`;
}

function embeddedCollectionKey(embeddedName) {
  return embeddedName === 'ActiveEffect' ? 'effects' : 'items';
}

export const ActorEngine = {
  async applyMutationPlan(actor, plan = {}, options = {}) {
    fakeActorEngineCallLog.push({ method: 'applyMutationPlan', actorId: actor?.id, plan: deepCloneJSON(plan), options: { ...options } });

    if (plan.set) {
      for (const [dotPath, value] of Object.entries(plan.set)) setPath(actor, dotPath, value);
    }
    if (plan.update?.items) {
      for (const patch of plan.update.items) {
        const item = (actor.items ?? []).find(i => i._id === patch._id || i.id === patch._id);
        if (!item) continue;
        for (const [dotPath, value] of Object.entries(patch)) {
          if (dotPath === '_id') continue;
          setPath(item, dotPath, value);
        }
      }
    }
    if (plan.delete?.items) {
      const ids = new Set(plan.delete.items);
      actor.items = (actor.items ?? []).filter(i => !ids.has(i._id) && !ids.has(i.id));
    }
    return { success: true };
  },

  async updateActor(actor, data = {}, options = {}) {
    fakeActorEngineCallLog.push({ method: 'updateActor', actorId: actor?.id, data: deepCloneJSON(data), options: { ...options } });
    for (const [dotPath, value] of Object.entries(data)) setPath(actor, dotPath, value);
    return actor;
  },

  /**
   * P1-7 — faithful-enough reimplementation of the real
   * ActorEngine.createEmbeddedDocuments()'s id-preservation behavior for
   * testing SnapshotService's real production restoration logic (which
   * calls these granular methods directly, NOT restoreFromSnapshot()
   * above — that pre-existing fake is left untouched for the tests that
   * already depend on its documented, deliberately-simplified behavior).
   * `options.keepId` preserves the source's own `_id` unless an item with
   * that id already exists on the actor (simulating Foundry refusing a
   * conflicting id) or the source carries a `_forceIdConflict` test-only
   * marker, in which case a fresh fake id is assigned instead — exactly
   * the "Foundry refuses the original id" case P1-7 must detect and
   * report as `exact: false`, not silently accept.
   */
  async createEmbeddedDocuments(actor, embeddedName, data = [], options = {}) {
    fakeActorEngineCallLog.push({ method: 'createEmbeddedDocuments', actorId: actor?.id, embeddedName, data: deepCloneJSON(data), options: { ...options } });
    const key = embeddedCollectionKey(embeddedName);
    actor[key] = actor[key] ?? [];
    const existingIds = new Set(actor[key].map(d => d._id ?? d.id));
    const created = data.map(source => {
      const copy = deepCloneJSON(source);
      const wantsKeepId = options.keepId === true && (copy._id || copy.id) && !copy._forceIdConflict;
      const requestedId = copy._id ?? copy.id ?? null;
      delete copy._forceIdConflict;
      const finalId = (wantsKeepId && !existingIds.has(requestedId)) ? requestedId : nextFakeId();
      copy._id = finalId;
      copy.id = finalId;
      existingIds.add(finalId);
      return copy;
    });
    actor[key].push(...created);
    return created;
  },

  async updateEmbeddedDocuments(actor, embeddedName, updates = [], options = {}) {
    fakeActorEngineCallLog.push({ method: 'updateEmbeddedDocuments', actorId: actor?.id, embeddedName, updates: deepCloneJSON(updates), options: { ...options } });
    const key = embeddedCollectionKey(embeddedName);
    actor[key] = actor[key] ?? [];
    for (const patch of updates) {
      const targetId = patch._id ?? patch.id;
      const doc = actor[key].find(d => (d._id ?? d.id) === targetId);
      if (!doc) continue;
      for (const [dotPath, value] of Object.entries(patch)) {
        if (dotPath === '_id' || dotPath === 'id') continue;
        setPath(doc, dotPath, value);
      }
    }
    return actor[key];
  },

  async deleteEmbeddedDocuments(actor, embeddedName, ids = [], options = {}) {
    fakeActorEngineCallLog.push({ method: 'deleteEmbeddedDocuments', actorId: actor?.id, embeddedName, ids: [...ids], options: { ...options } });
    const key = embeddedCollectionKey(embeddedName);
    const idSet = new Set(ids);
    const removed = (actor[key] ?? []).filter(d => idSet.has(d._id) || idSet.has(d.id));
    actor[key] = (actor[key] ?? []).filter(d => !idSet.has(d._id) && !idSet.has(d.id));
    return removed;
  },

  async restoreFromSnapshot(actor, snapshot = {}, options = {}) {
    fakeActorEngineCallLog.push({ method: 'restoreFromSnapshot', actorId: actor?.id, options: { ...options } });
    actor.system = deepCloneJSON(snapshot.system ?? {});
    if (snapshot.name !== undefined) actor.name = snapshot.name;
    if (snapshot.img !== undefined) actor.img = snapshot.img;
    if (snapshot.prototypeToken !== undefined) actor.prototypeToken = deepCloneJSON(snapshot.prototypeToken);
    actor.items = (snapshot.items ?? []).map(deepCloneJSON);
    actor.effects = (snapshot.effects ?? []).map(deepCloneJSON);
    return { success: true, actor, itemsCreated: actor.items.length, effectsCreated: actor.effects.length };
  }
};

export function resetFakeActorEngine() {
  fakeActorEngineCallLog.length = 0;
}
