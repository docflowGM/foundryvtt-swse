// Phase 5D-I-D-B3 -- weapon-side upgrade / payload compatibility. The canonical record states which upgrades a weapon REFUSES (operation.upgradeRestrictions)
// and which payload capabilities it ACCEPTS (operation.surveillanceTaggerCompatible). This module only reads those structured facts and answers for ONE
// upgrade key; the install gate itself stays in UpgradeEligibilityEngine (the path UpgradeService.applyUpgrade and InstallRemoveEngine both go through).
// It never reads a weapon name or text. Three states, following the attack runtime's own convention:
//   legacy      no canonical identity is declared (no stamp, no compendium source): the weapon asserts nothing, so nothing is refused here
//   canonical   the identity resolved: its published restrictions / capabilities / blaster class apply
//   unresolved  an identity IS declared but cannot be resolved (unknown stamp, registry not loaded): installation is REFUSED, never treated as legacy

import { getSharedWeaponAuthorityRegistry, getWeaponAuthorityRegistryLoadFailure } from './weapon-authority-registry.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';
import { hasCanonicalHint } from './attack-consumer.js';

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

/**
 * Is this canonical weapon a "blaster" for the upgrade catalog (appliesTo: ['blaster'])? Production weapons all carry system.category 'weapon', so the catalog
 * class cannot be read from the Item. The canonical record's own weapon-family selectors are the structured authority: a family id is a token string
 * (weapon-family:blaster-pistol, weapon-family:e-web-repeating-blaster, weapon-family:microblaster ...); the weapon is a blaster when any of its family ids
 * has the token blaster / microblaster / longblaster. Display names, descriptions and weapon group are never read, and a ranged weapon is NOT a blaster
 * merely for being ranged (Darter, slugthrowers, ion/sonic/disruptor weapons whose families do not say blaster stay non-blasters).
 */
const BLASTER_FAMILY_TOKENS = new Set(['blaster', 'microblaster', 'longblaster']);
export function isBlasterFamily(record) {
  const families = Array.isArray(record?.selectors?.families) ? record.selectors.families : [];
  return families.some((f) => String(f).split(':').pop().split('-').some((t) => BLASTER_FAMILY_TOKENS.has(t)));
}

/** Structured ranged-energy test (catalog `requires: ['ranged_energy']`): a ranged attack whose damage is energy. Family membership alone never satisfies it. */
export function isRangedEnergy(record) {
  const cs = record?.canonicalStats;
  return cs?.range?.mode === 'ranged' && Array.isArray(cs?.damageType?.types) && cs.damageType.types.includes('energy');
}

/**
 * @returns {{state:'legacy'}|{state:'canonical', identityKey:string, operation:object|null, blaster:boolean, rangedEnergy:boolean}|{state:'unresolved', reason:string}}
 */
export function canonicalWeaponStateOf(item, registry = getSharedWeaponAuthorityRegistry()) {
  if (!item) return { state: 'legacy' };
  if (!registry) {
    // Any canonical hint (stamp OR compendium source id) means the weapon may be canonical and cannot be judged without the registry.
    if (hasCanonicalHint(item)) return { state: 'unresolved', reason: getWeaponAuthorityRegistryLoadFailure() ? 'registry_load_failed' : 'registry_not_loaded' };
    return { state: 'legacy' };
  }
  let id;
  try { id = resolveCanonicalIdentity(item, registry); } catch (_e) { return { state: 'unresolved', reason: 'identity_unresolvable' }; }
  if (id.kind !== 'canonical') return { state: 'legacy' };
  const record = registry.getByIdentityKey(id.identityKey);
  if (!record) return { state: 'unresolved', reason: 'identity_unresolvable' };
  return { state: 'canonical', identityKey: id.identityKey, operation: record.operation ?? null, blaster: isBlasterFamily(record), rangedEnergy: isRangedEnergy(record) };
}
