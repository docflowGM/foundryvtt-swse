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
  node[parts[parts.length - 1]] = value;
}

export const fakeActorEngineCallLog = [];

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
