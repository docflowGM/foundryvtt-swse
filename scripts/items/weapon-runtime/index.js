// Phase 5B -- weapon runtime authority adapter (public surface). No consumer imports this yet (5C+).
export * from './errors.js';
export { deepFreeze } from './deep-freeze.js';
export { reconcileProfiles } from './profile-reconciliation.js';
export { WeaponAuthorityRegistry, loadWeaponAuthorityRegistry, setSharedWeaponAuthorityRegistry, getSharedWeaponAuthorityRegistry } from './weapon-authority-registry.js';
export { resolveCanonicalIdentity } from './canonical-identity.js';
export { WeaponRuntimeResolver, getProfile, resolveSelected } from './weapon-runtime-resolver.js';
export { resolveProficiency, extractActorEntitlements, normalizeGroup } from './proficiency-resolver.js';
export { resolveDamageProfile } from './damage-profile-resolver.js';
export { resolveRange } from './range-resolver.js';
export { resolveResource } from './resource-resolver.js';
export { adaptLegacyWeapon } from './legacy-adapter.js';
export { resolveHostAugmentations } from './host-augmentation.js';
export { evaluateCondition, policyFor } from './condition-policy.js';
