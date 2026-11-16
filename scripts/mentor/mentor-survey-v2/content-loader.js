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

/** Companion packs attached to a survey's pack under the given key (kept separate on disk to keep each file reviewable). */
const COMPANIONS = { multiclass: [['multiclass-q6', 'q6Content'], ['multiclass-q2', 'q2Content']], prestige: [['prestige-q1q3', 'q1q3'], ['prestige-q2', 'q2Content']] };

export async function loadSurveyContent(kind) {
  if (!packs.has(kind)) {
    const main = fetch(`${DATA}/${kind}.json`).then((r) => r.json());
    const extra = (COMPANIONS[kind] || []).map(([file, key]) => fetch(`${DATA}/${file}.json`).then((r) => r.json()).then((j) => [key, j]));
    packs.set(kind, Promise.all([main, ...extra]).then(([pack, ...pairs]) => ({ ...pack, ...Object.fromEntries(pairs) })).catch((err) => { packs.delete(kind); throw err; }));
  }
  const [pack, m] = await Promise.all([packs.get(kind), primeManifest()]);
  return { pack, manifest: m };
}
