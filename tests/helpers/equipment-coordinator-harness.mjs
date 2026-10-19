// Shared offline harness for tests that drive InventoryEngine -> equipment-state coordinator (E4-C1 WP4).
// Persistence is an in-memory fake: dotted-path Item updates (including `-=` deletions) and actor-flag journal writes.
export function setPath(obj, path, value) {
  const parts = path.split('.'); let node = obj;
  for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
  const last = parts.at(-1);
  if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value));
}

/** Installs a GM user, an in-memory ActorEngine.updateOwnedItems/updateActor and returns coordinator deps. */
export function installCoordinatorHarness(ActorEngine, { isGm = true } = {}) {
  globalThis.game ??= {};
  globalThis.game.user = { ...(globalThis.game.user ?? {}), isGM: isGm };
  const log = { itemWrites: [], actorWrites: [] };
  ActorEngine.updateOwnedItems = async (actor, updates) => {
    log.itemWrites.push(JSON.parse(JSON.stringify(updates)));
    for (const patch of updates) {
      const item = actor.items.get(patch._id);
      for (const [k, v] of Object.entries(patch)) if (k !== '_id') setPath(item, k, v);
    }
    return updates.map((u) => actor.items.get(u._id));
  };
  ActorEngine.updateActor = async (actor, data) => {
    log.actorWrites.push(JSON.parse(JSON.stringify(data)));
    for (const [k, v] of Object.entries(data)) setPath(actor, k, v);
  };
  const human = { status: 'resolved', profile: { name: 'Human' }, reason: null, evidence: { speciesName: 'Human', variantId: null } };
  const deps = {
    resolveSpecies: () => human,
    loadSpecies: async () => ({ status: 'resolved', profile: { name: 'Human' }, reason: null, evidence: { speciesName: 'Human', variantId: null } }),
  };
  return { log, deps, setGm: (v) => { globalThis.game.user.isGM = v; } };
}

export const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });
