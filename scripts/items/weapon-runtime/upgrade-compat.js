// Phase 5D-I-D-B3 -- weapon-side upgrade / payload compatibility. The canonical record states which upgrades a weapon REFUSES (operation.upgradeRestrictions)
// and which payload capabilities it ACCEPTS (operation.surveillanceTaggerCompatible). This module only reads those structured facts and answers for ONE
// upgrade key; the install gate itself stays in UpgradeEligibilityEngine (the path UpgradeService.applyUpgrade and InstallRemoveEngine both go through).
// It never reads a weapon name or text. A weapon that cannot be resolved canonically (legacy / custom) declares nothing: unknown is not a refusal.

import { getSharedWeaponAuthorityRegistry } from './weapon-authority-registry.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';

/** "rapid-recycler", "Rapid Recycler" and the catalog key "rapid_recycler" are the same upgrade key. */
export function normalizeUpgradeKey(key) {
  return String(key ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Upgrade keys the weapon refuses (normalized Set; empty when it declares none). */
export function upgradeRestrictionsOf(operation) {
  const list = operation?.upgradeRestrictions;
  return new Set((Array.isArray(list) ? list : []).map(normalizeUpgradeKey).filter(Boolean));
}

/** Payload capabilities the weapon accepts, as a Set of capability ids. `surveillanceTaggerCompatibility` is the prose carrier of the same fact. */
export function acceptedUpgradeCapabilitiesOf(operation) {
  const caps = new Set();
  if (operation?.surveillanceTaggerCompatible === true) caps.add('surveillance-tagger');
  return caps;
}

/**
 * May `upgradeDef` be installed on a weapon with this operation? `upgradeDef.requiresWeaponCapability` (a capability id) is the upgrade-side declaration;
 * a weapon accepts it only when its record says so.
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function weaponUpgradeAllowance(operation, upgradeKey, upgradeDef = null) {
  if (upgradeRestrictionsOf(operation).has(normalizeUpgradeKey(upgradeKey))) return { ok: false, reason: `weapon_restriction:${normalizeUpgradeKey(upgradeKey)}` };
  const need = upgradeDef?.requiresWeaponCapability ?? null;
  if (need && !acceptedUpgradeCapabilitiesOf(operation).has(need)) return { ok: false, reason: `weapon_incompatible:${need}` };
  return { ok: true };
}

/** The canonical operation of an owned/world weapon Item, or null when it is not a canonical weapon. */
export function canonicalOperationOfItem(item, registry = getSharedWeaponAuthorityRegistry()) {
  if (!item || !registry) return null;
  try {
    const id = resolveCanonicalIdentity(item, registry);
    return id.kind === 'canonical' ? (registry.getByIdentityKey(id.identityKey)?.operation ?? null) : null;
  } catch { return null; }
}
