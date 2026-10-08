// Phase 5B -- weapon runtime authority adapter (public surface). Phase 5D-A: the live attack pipeline consumes it via attack-consumer.js.
export * from './errors.js';
export { deepFreeze } from './deep-freeze.js';
export { reconcileProfiles } from './profile-reconciliation.js';
export { WeaponAuthorityRegistry, loadWeaponAuthorityRegistry, setSharedWeaponAuthorityRegistry, getSharedWeaponAuthorityRegistry, getWeaponAuthorityRegistryLoadFailure, resetSharedWeaponAuthorityRegistry } from './weapon-authority-registry.js';
export { resolveCanonicalIdentity } from './canonical-identity.js';
export { WeaponRuntimeResolver, getProfile, resolveSelected } from './weapon-runtime-resolver.js';
export { resolveProficiency, extractActorEntitlements, normalizeGroup } from './proficiency-resolver.js';
export { resolveDamageProfile } from './damage-profile-resolver.js';
export { resolveRange } from './range-resolver.js';
export { resolveResource } from './resource-resolver.js';
export { adaptLegacyWeapon } from './legacy-adapter.js';
export { resolveHostAugmentations } from './host-augmentation.js';
export { evaluateCondition, policyFor } from './condition-policy.js';
export { resolveAttackWeaponRuntime, resolveCanonicalAttackProficiency, summarizeAttackRuntime } from './attack-consumer.js';
export { buildAttackForms, findAttackForm, attackFormSelection, attackFormValue } from './attack-form-options.js';
