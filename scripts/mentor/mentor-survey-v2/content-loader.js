/**
 * Loads the survey content packs and the release manifest (static data, fetched once per page load).
 * Packs are not game state, so the cache has no invalidation. The manifest is also primed at world ready so the
 * (synchronous) step-activation check can consult it; if it is not loaded, activation fails closed.
 */
const DATA = 'systems/foundryvtt-swse/data/mentor-survey';
const packs = new Map();
let manifest = null;
let manifestPromise = null;

export function primeManifest() {
  manifestPromise ||= fetch(`${DATA}/release-manifest.json`).then((r) => r.json()).then((m) => { manifest = m; return m; })
    .catch((err) => { manifestPromise = null; throw err; });
  return manifestPromise;
}

/** Synchronous view of the manifest, or null if it has not loaded (callers must treat null as "not released"). */
export function getManifestSync() { return manifest; }

export async function loadSurveyContent(kind) {
  if (!packs.has(kind)) {
    packs.set(kind, fetch(`${DATA}/${kind}.json`).then((r) => r.json()).catch((err) => { packs.delete(kind); throw err; }));
  }
  const [pack, m] = await Promise.all([packs.get(kind), primeManifest()]);
  return { pack, manifest: m };
}
