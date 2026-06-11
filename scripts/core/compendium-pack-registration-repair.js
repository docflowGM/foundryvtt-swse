/**
 * Compendium Pack Registration Repair
 *
 * P0 safety net for the packs that must always exist at runtime. The manifest
 * is still the source of truth, but during the v13 migration Foundry can serve
 * an older install-state/cache that omits specific packs even while the data
 * files are present. When that happens, critical systems fall back to JSON data
 * and the sidebar cannot show/open the compendiums.
 *
 * This repair is intentionally narrow: it only attempts to register the known
 * critical SWSE packs when Foundry has not already registered them.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

const VISIBILITY = {
  PLAYER: "OBSERVER",
  ASSISTANT: "OBSERVER",
  TRUSTED: "OBSERVER",
  GAMEMASTER: "OWNER"
};

const CRITICAL_PACKS = [
  {
    name: "feats",
    label: "Feats",
    type: "Item",
    path: "packs/feats.db"
  },
  {
    name: "lightsaberformpowers",
    label: "Lightsaber Form Powers",
    type: "Item",
    path: "packs/lightsaberformpowers.db"
  },
  {
    name: "heroic",
    label: "Heroic NPCs",
    type: "Actor",
    path: "packs/heroic.db"
  },
  {
    name: "nonheroic",
    label: "Nonheroic NPCs",
    type: "Actor",
    path: "packs/nonheroic.db"
  }
];

let registered = false;
let repairRuns = [];

function _systemId() {
  return game?.system?.id || "foundryvtt-swse";
}

function _collectionKey(spec, systemId = _systemId()) {
  return `${systemId}.${spec.name}`;
}

function _getCollectionClass() {
  return foundry?.documents?.collections?.CompendiumCollection
    || globalThis.CompendiumCollection
    || null;
}

function _allPackKeys() {
  try {
    return Array.from(game?.packs?.keys?.() || []);
  } catch (_err) {
    return [];
  }
}

function _findExistingPack(spec, systemId = _systemId()) {
  const key = _collectionKey(spec, systemId);
  const direct = game?.packs?.get?.(key);
  if (direct) return direct;

  const packs = Array.from(game?.packs?.values?.() || []);
  return packs.find((pack) => {
    const meta = pack?.metadata || {};
    const packageName = String(meta.packageName || meta.package || pack?.packageName || pack?.collection?.split(".")?.[0] || "");
    const name = String(meta.name || pack?.collection?.split(".")?.pop?.() || "");
    return name === spec.name && (!packageName || packageName === systemId || packageName === "foundryvtt-swse");
  }) || null;
}

function _hasPack(spec, systemId = _systemId()) {
  return Boolean(_findExistingPack(spec, systemId));
}

function _patchPackMetadata(pack, spec, systemId = _systemId()) {
  if (!pack?.metadata) return false;
  let changed = false;
  const assignments = {
    name: spec.name,
    label: spec.label,
    type: spec.type,
    path: spec.path,
    system: systemId,
    packageName: systemId,
    packageType: "system",
    ownership: VISIBILITY,
    private: false
  };
  for (const [key, value] of Object.entries(assignments)) {
    if (JSON.stringify(pack.metadata[key]) !== JSON.stringify(value)) {
      try {
        pack.metadata[key] = value;
        changed = true;
      } catch (_err) {
        // Some Foundry metadata fields may be sealed; ignore and keep going.
      }
    }
  }
  return changed;
}

function _metadataFor(spec, systemId = _systemId()) {
  return {
    id: _collectionKey(spec, systemId),
    name: spec.name,
    label: spec.label,
    type: spec.type,
    path: spec.path,
    system: systemId,
    package: "system",
    packageName: systemId,
    packageType: "system",
    ownership: VISIBILITY,
    private: false
  };
}

function _ensureRuntimeManifestEntry(spec, systemId = _systemId()) {
  const packs = game?.system?.packs;
  if (!Array.isArray(packs)) return false;
  const existing = packs.find((pack) => pack?.name === spec.name);
  if (existing) {
    existing.path = spec.path;
    existing.ownership = existing.ownership || VISIBILITY;
    existing.private = false;
    return false;
  }

  packs.push(_metadataFor(spec, systemId));
  return true;
}

function _registerPack(spec, phase) {
  const systemId = _systemId();
  const key = _collectionKey(spec, systemId);

  _ensureRuntimeManifestEntry(spec, systemId);

  const existing = _findExistingPack(spec, systemId);
  if (existing) {
    const metadataPatched = _patchPackMetadata(existing, spec, systemId);
    return { key, name: spec.name, status: "already-registered", metadataPatched };
  }

  const CollectionClass = _getCollectionClass();
  if (!CollectionClass) {
    return { key, name: spec.name, status: "missing-constructor" };
  }

  if (typeof game?.packs?.set !== "function") {
    return { key, name: spec.name, status: "game-packs-not-mutable" };
  }

  try {
    const metadata = _metadataFor(spec, systemId);
    const pack = new CollectionClass(metadata);
    const collection = pack?.collection || metadata.id || key;
    game.packs.set(collection, pack);

    // Also guarantee the canonical key resolves even if the constructor chose a
    // slightly different collection identifier from the metadata shape.
    if (collection !== key && !game.packs.get(key)) {
      game.packs.set(key, pack);
    }

    return { key, name: spec.name, status: "registered", collection };
  } catch (err) {
    return {
      key,
      name: spec.name,
      status: "failed",
      error: err?.message || String(err),
      phase
    };
  }
}

export function repairCriticalCompendiumPacks(phase = "manual") {
  const before = _allPackKeys();
  const results = CRITICAL_PACKS.map((spec) => _registerPack(spec, phase));
  const after = _allPackKeys();
  const repaired = results.filter((result) => result.status === "registered");
  const metadataPatched = results.filter((result) => result.metadataPatched);
  const failed = results.filter((result) => result.status === "failed" || result.status === "missing-constructor" || result.status === "game-packs-not-mutable");

  const snapshot = {
    phase,
    repaired: repaired.map((result) => result.key),
    metadataPatched: metadataPatched.map((result) => result.key),
    failed,
    critical: results,
    packCountBefore: before.length,
    packCountAfter: after.length,
    criticalPresent: CRITICAL_PACKS.map((spec) => ({
      key: _collectionKey(spec),
      present: Boolean(game?.packs?.get?.(_collectionKey(spec))) || _hasPack(spec)
    }))
  };

  repairRuns.push(snapshot);

  if (repaired.length || metadataPatched.length) {
    SWSELogger.warn("[CompendiumPackRegistrationRepair] Runtime-repaired critical pack registration/metadata", snapshot);
  } else if (failed.length) {
    SWSELogger.warn("[CompendiumPackRegistrationRepair] Critical pack repair could not register one or more packs", snapshot);
  } else {
    SWSELogger.log("[CompendiumPackRegistrationRepair] Critical packs are registered", snapshot.criticalPresent);
  }

  return snapshot;
}

export function registerCompendiumPackRegistrationRepair() {
  if (registered) return;
  registered = true;

  const run = (phase) => {
    try {
      const snapshot = repairCriticalCompendiumPacks(phase);
      if (phase === "ready" && (snapshot.repaired.length || snapshot.metadataPatched.length) && ui?.compendium?.render) {
        ui.compendium.render(true);
      }
      return snapshot;
    } catch (err) {
      SWSELogger.warn("[CompendiumPackRegistrationRepair] Repair run failed", err);
      return null;
    }
  };

  run("init");
  Hooks.once("setup", () => run("setup"));
  Hooks.once("ready", () => run("ready"));

  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.repairCriticalCompendiumPacks = () => run("manual");
  globalThis.SWSE.debug.criticalCompendiumPackStatus = () => ({
    runs: repairRuns,
    keys: _allPackKeys(),
    critical: CRITICAL_PACKS.map((spec) => ({
      key: _collectionKey(spec),
      registered: Boolean(game?.packs?.get?.(_collectionKey(spec))),
      hasPack: _hasPack(spec),
      metadata: game?.packs?.get?.(_collectionKey(spec))?.metadata || null
    }))
  });
}

export default registerCompendiumPackRegistrationRepair;
