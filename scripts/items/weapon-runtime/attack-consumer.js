// Phase 5D-A -- live attack consumption of the canonical weapon runtime.
// owned weapon Item -> canonical identity -> WeaponRuntimeResolver -> ResolvedWeapon -> selected ResolvedAttackProfile
//   -> resolveProficiency() (dynamic, profile-specific) -> combat-roll-math.js#resolveAttackBonus().
// Pure and actor-independent until proficiency: nothing here mutates actors/items or spends resources, so callers can
// (and rollAttack does) resolve BEFORE any ammo/action-option cost. Fail-closed: a canonical weapon never falls back to
// name/category/description heuristics; legacy/custom items (no canonical identity) are passed through untouched.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';
import { getSharedWeaponAuthorityRegistry, getWeaponAuthorityRegistryLoadFailure } from './weapon-authority-registry.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';
import { WeaponRuntimeResolver, getProfile } from './weapon-runtime-resolver.js';
import { resolveProficiency } from './proficiency-resolver.js';

const LEGACY = Object.freeze({ source: 'legacy' });
const SELECTION_KEYS = ['profileId', 'configurationId', 'modeId', 'payloadId', 'damageMode'];

// The resolver is stateless (registry is immutable); one instance per registry object.
let resolverCache = { registry: null, resolver: null };
function resolverFor(registry) {
  if (resolverCache.registry !== registry) resolverCache = { registry, resolver: new WeaponRuntimeResolver(registry) };
  return resolverCache.resolver;
}

const requestedSelection = (weapon, context) => {
  const req = { weaponId: weapon?.id ?? weapon?._id ?? null };
  for (const k of SELECTION_KEYS) req[k] = context?.[k] ?? null;
  return req;
};
const sameRequest = (a, b) => !!a && !!b && a.weaponId === b.weaponId && SELECTION_KEYS.every((k) => a[k] === b[k]);

const hasCanonicalHint = (weapon) => !!(weapon?.flags?.swse?.canonicalWeapon?.identityKey
  || weapon?._stats?.compendiumSource || weapon?.flags?.core?.sourceId || weapon?.flags?.swse?.sourceId);

/**
 * Resolve the selected canonical weapon/profile for an attack.
 * - legacy/custom item (or no weapon)      -> { source: 'legacy' }
 * - canonical item                         -> { source: 'canonical', resolved, profile, branch, identityKey, requested }
 * - canonical item, bad identity/selection -> throws WeaponRuntimeError (never legacy)
 * - registry failed to load                -> throws for any item that carries a canonical hint
 * A previously resolved context.weaponRuntime is reused only when it was resolved for the same weapon + selection.
 */
export function resolveAttackWeaponRuntime(weapon, context = {}) {
  if (!weapon) return LEGACY;
  const requested = requestedSelection(weapon, context);
  const prior = context?.weaponRuntime;
  if (prior && prior.source && sameRequest(prior.requested, requested)) return prior;

  const registry = getSharedWeaponAuthorityRegistry();
  if (!registry) {
    const failure = getWeaponAuthorityRegistryLoadFailure();
    if (failure && hasCanonicalHint(weapon)) {
      throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_UNAVAILABLE, `canonical weapon registry failed to load (${failure.message}); refusing to treat ${weapon?.name ?? 'weapon'} as legacy`, { cause: failure.code });
    }
    // Never attempted (e.g. headless harness): only an explicit canonical stamp can be recognized, and it cannot be honored.
    if (weapon?.flags?.swse?.canonicalWeapon?.identityKey) {
      throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_UNAVAILABLE, 'canonical weapon registry is not loaded', { identityKey: weapon.flags.swse.canonicalWeapon.identityKey });
    }
    return LEGACY;
  }

  const id = resolveCanonicalIdentity(weapon, registry);
  if (id.kind === 'legacy') return LEGACY;
  const ctx = {};
  for (const k of SELECTION_KEYS) if (context?.[k] != null) ctx[k] = context[k];
  const resolved = resolverFor(registry).resolveIdentity(id.identityKey, weapon, ctx, id.via);
  const profile = getProfile(resolved);
  return Object.freeze({ source: 'canonical', resolved, profile, branch: profile.branch ?? null, identityKey: id.identityKey, requested: Object.freeze(requested) });
}

/** Dynamic, profile-specific proficiency for a canonical runtime (delegates entirely to resolveProficiency). */
export function resolveCanonicalAttackProficiency(runtime, actor, integrations = {}) {
  if (runtime?.source !== 'canonical') throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, 'canonical proficiency requires a canonical weapon runtime');
  return resolveProficiency(runtime.resolved, runtime.profile, actor, { proficiencyIntegrations: integrations });
}

/** Small, serializable diagnostics for resolveAttackBonus() results (never the frozen ResolvedWeapon itself). */
export function summarizeAttackRuntime(runtime, proficiency = null) {
  if (runtime?.source !== 'canonical') return { source: runtime?.source ?? 'legacy' };
  return {
    source: 'canonical', identityKey: runtime.identityKey, profileId: runtime.profile.id, branch: runtime.branch,
    proficiency: proficiency ? { proficient: proficiency.proficient, penalty: proficiency.penalty, route: proficiency.route, requiredGroup: proficiency.requiredGroup, exoticIdentity: proficiency.exoticIdentity } : null,
  };
}
