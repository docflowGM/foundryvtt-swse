/**
 * Trusted stock weapon-group authority is intentionally EMPTY in CP6.
 * 318 publication claims were source-reviewed, but their actual installed
 * weapon identities have NOT been hydrated and mapped to Foundry items.
 * Actor names, user-set source keys and printed names cannot prove this link.
 * Never turn arbitrary Actor.system.arc, bonuses or a caller-provided claim
 * into source authority. The mapping must come from a future audited registry.
 */
export const TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0;

/** @returns {null} No runtime stock weapon group has a verified immutable binding. */
export function resolveTrustedStockAttackGroup(_vehicle, _weapon) {
  return null;
}