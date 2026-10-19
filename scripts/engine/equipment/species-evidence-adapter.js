/**
 * Species evidence adapter (E4-C1 WP3-A) -- READ ONLY, asynchronous evidence loading.
 *
 * Resolves the SELECTED effective species publication profile of an Actor from the existing authorities only: the actor's recorded species and
 * variant, the SpeciesRegistry entry, the publication-selection rules and applySpeciesVariantProfile(). It never synthesizes a profile from a
 * name or description and never guesses a variant: when the registry, the recorded identity or the publication selection cannot establish the
 * profile, the result is `unavailable` with a reason and callers fail closed (no anatomy is certified without evidence).
 *
 * Result: { status: 'resolved'|'unavailable', profile: object|null, reason: string|null, evidence: { speciesName, variantId, publication } }.
 * The returned profile is a fresh object owned by the caller of the registry authority's own output; this adapter writes nothing.
 */
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { applySpeciesVariantProfile } from '/systems/foundryvtt-swse/scripts/species/species-variant-profile.js';
import { checkPublicationSelection, getSoleSnapshotVersion, getPublicationStatus, PUBLICATION_STATUS } from '/systems/foundryvtt-swse/scripts/species/species-publication-selection.js';

const norm = (id) => (id == null || id === '' || id === 'default' ? null : String(id));

function recordedSpeciesName(actor) {
  const s = actor?.system?.species;
  const name = typeof s === 'string' ? s : s?.name ?? actor?.system?.race;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}
const recordedVariantId = (actor) => norm(actor?.system?.speciesVariant?.id ?? actor?.flags?.swse?.speciesVariant?.id ?? null);

function resolveWith(actor, registry, apply) {
  const speciesName = recordedSpeciesName(actor);
  const variantId = recordedVariantId(actor);
  const evidence = { speciesName, variantId, publication: null };
  const unavailable = (reason) => Object.freeze({ status: 'unavailable', profile: null, reason, evidence: Object.freeze({ ...evidence }) });
  try {
    if (!speciesName) return unavailable('actor-species-not-recorded');
    if (typeof registry.isInitialized === 'function' && !registry.isInitialized()) return unavailable('species-registry-unavailable');
    const entry = registry.getByName(speciesName);
    if (!entry) return unavailable('species-not-in-registry');
    evidence.publication = getPublicationStatus(entry);
    let version = null;
    if (variantId) {
      version = (Array.isArray(entry.variants) ? entry.variants : []).find((v) => String(v?.id) === variantId) ?? null;
      if (!version) return unavailable('recorded-variant-not-found');
      if (evidence.publication !== PUBLICATION_STATUS.SINGLE_PROFILE) {
        const check = checkPublicationSelection(entry, variantId);
        if (!check.ok) return unavailable(`publication-selection-${check.code}`);
      }
    } else {
      const check = checkPublicationSelection(entry, null);
      if (!check.ok) return unavailable(`publication-selection-${check.code}`);
      version = getSoleSnapshotVersion(entry);
    }
    const profile = version ? apply(entry, version) : entry;
    if (!profile || typeof profile !== 'object') return unavailable('profile-not-produced');
    return Object.freeze({ status: 'resolved', profile, reason: null, evidence: Object.freeze({ ...evidence }) });
  } catch (err) {
    return unavailable(`profile-resolution-failed:${err?.code ?? err?.name ?? 'error'}`);
  }
}

/**
 * SYNCHRONOUS resolution straight from the live registry authority. Nothing is cached here: every call re-reads the registry and the actor's
 * recorded species/variant. When the registry is not initialized the result is `unavailable` (fail closed); it is never guessed.
 * @param {object} actor Actor-like (read only)
 * @param {{registry?:object, applyVariant?:Function}} [deps] test seams
 */
export function resolveActorSpeciesProfile(actor, deps = {}) {
  return resolveWith(actor, deps.registry ?? SpeciesRegistry, deps.applyVariant ?? applySpeciesVariantProfile);
}

/**
 * Asynchronous form: initializes the registry once if needed (the only asynchronous step), then resolves exactly as the synchronous form.
 * @param {object} actor Actor-like (read only)
 * @param {{registry?:object, applyVariant?:Function}} [deps] test seams
 */
export async function loadActorSpeciesProfile(actor, deps = {}) {
  const registry = deps.registry ?? SpeciesRegistry;
  try {
    if (typeof registry.isInitialized === 'function' && !registry.isInitialized() && typeof registry.initialize === 'function') await registry.initialize();
  } catch {
    // resolveWith reports the registry as unavailable
  }
  return resolveActorSpeciesProfile(actor, deps);
}

export default { loadActorSpeciesProfile, resolveActorSpeciesProfile };
