// Phase 5B-3 -- canonical identity resolution. Never reads name, description, group or category text.
// Order: (1) item.flags.swse.canonicalWeapon.identityKey stamp, (2) compendium source id -> production-id index, (3) none -> legacy.
// A stamp that the registry does not know is an ERROR (fail closed), never a legacy fallback.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';

const lastSegment = (uuid) => (typeof uuid === 'string' && uuid.includes('.') ? uuid.split('.').pop() : null);

function stampOf(item) {
  const viaFlags = item?.flags?.swse?.canonicalWeapon?.identityKey;
  if (viaFlags) return viaFlags;
  try { return item?.getFlag?.('swse', 'canonicalWeapon')?.identityKey ?? null; } catch (_e) { return null; }
}

function sourceIdOf(item) {
  return item?._stats?.compendiumSource ?? item?.flags?.core?.sourceId ?? item?.flags?.swse?.sourceId ?? null;
}

/** @returns {{kind:'canonical'|'legacy', identityKey:string|null, via:string|null}} ; throws for unknown stamps. */
export function resolveCanonicalIdentity(item, registry) {
  const stamp = stampOf(item);
  if (stamp) {
    if (!registry?.hasIdentity?.(stamp)) {
      throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, `canonical identity ${stamp} has no registry entry`, { identityKey: stamp });
    }
    return { kind: 'canonical', identityKey: stamp, via: 'flag-stamp' };
  }
  const sid = lastSegment(sourceIdOf(item));
  const mapped = sid ? registry?.getIdentityKeyByProductionId?.(sid) : null;
  if (mapped) {
    if (!registry.hasIdentity(mapped)) {
      throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, `production id ${sid} maps to ${mapped} which has no registry entry`, { productionId: sid, identityKey: mapped });
    }
    return { kind: 'canonical', identityKey: mapped, via: 'source-id' };
  }
  return { kind: 'legacy', identityKey: null, via: null };
}
