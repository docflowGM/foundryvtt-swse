import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';

const REGISTERED = Symbol.for('swse.followerSpeciesMaterialization.v2');
const REGISTRY_PATCHED = Symbol.for('swse.followerSpeciesMaterialization.registry.v2');
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function clonePlain(value) {
  try { return structuredClone(value); } catch (_err) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_jsonErr) { return value; }
  }
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAbilityMods(raw = {}) {
  return Object.fromEntries(ABILITY_KEYS.map(key => [key, finite(raw?.[key], 0)]));
}

function patchSpeciesRegistryCanonicalStats() {
  if (SpeciesRegistry[REGISTRY_PATCHED] || typeof SpeciesRegistry._normalizeEntry !== 'function') return;
  const originalNormalize = SpeciesRegistry._normalizeEntry.bind(SpeciesRegistry);

  SpeciesRegistry._normalizeEntry = function normalizeEntryWithCanonicalStats(doc) {
    // Always normalize the real Foundry document first. Creating a pseudo-document
    // with the DataModel prototype breaks Foundry v13 DocumentStatsField shimming
    // because the pseudo-document has no valid _source/flags state.
    const entry = originalNormalize(doc);
    const system = doc?.system || {};
    const canonical = system.canonicalStats && typeof system.canonicalStats === 'object'
      ? system.canonicalStats
      : null;
    if (!canonical) return entry;

    const canonicalMods = normalizeAbilityMods(canonical.abilityMods || canonical.abilityScores || {});
    const hasCanonicalMods = Object.values(canonicalMods).some(value => value !== 0);
    const canonicalMovement = canonical.movement && typeof canonical.movement === 'object'
      ? clonePlain(canonical.movement)
      : null;

    return {
      ...entry,
      abilityScores: hasCanonicalMods ? canonicalMods : entry.abilityScores,
      abilityMods: hasCanonicalMods ? { ...canonicalMods } : entry.abilityMods,
      size: entry.size || canonical.size || null,
      speed: Number.isFinite(Number(entry.speed)) ? Number(entry.speed) : finite(canonical.speed ?? canonicalMovement?.walk, 6),
      movement: entry.movement && Object.keys(entry.movement).length ? entry.movement : (canonicalMovement || entry.movement),
      languages: Array.isArray(entry.languages) && entry.languages.length
        ? entry.languages
        : (Array.isArray(canonical.languages) ? [...canonical.languages] : []),
      abilities: Array.isArray(entry.abilities) && entry.abilities.length
        ? entry.abilities
        : (Array.isArray(canonical.special) ? [...canonical.special] : []),
      canonicalTraits: Array.isArray(entry.canonicalTraits) && entry.canonicalTraits.length
        ? entry.canonicalTraits
        : (Array.isArray(canonical.traits) ? clonePlain(canonical.traits) : []),
      variants: Array.isArray(entry.variants) && entry.variants.length
        ? entry.variants
        : (Array.isArray(canonical.variants) ? clonePlain(canonical.variants) : []),
    };
  };

  Object.defineProperty(SpeciesRegistry, REGISTRY_PATCHED, { value: true });
}

export function registerFollowerSpeciesMaterializationHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  // FollowerCreator materialization is now a direct call (domain/followers/follower-species-materialization.js);
  // only the species-registry canonical-stats normalization remains here (blocked on the baseline-vs-production data question).
  patchSpeciesRegistryCanonicalStats();
}
