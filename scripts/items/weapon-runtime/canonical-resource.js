// Phase 5D-D -- canonical resource facet consumption. The runtime says HOW MANY units of WHICH resource the selected attack
// form costs; AmmoSystem (existing mutation + rollback infrastructure) still performs the spending. Pure; no mutation.
// The live ammunition model is one counter per weapon (weapon.system.ammunition); a form whose cost targets a different
// resource of a multi-resource weapon is reported 'untracked' (nothing is spent) rather than debited from the wrong pool.
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * @returns {{status:'cost'|'free'|'untracked'|'pending', units:number|null, resourceId:string|null, kind:string|null,
 *            ammoType:string|null, reason:string, source:string}}
 *  cost      -> spend `units` from the weapon's pool (may differ from the default 1: modeMultipliers, shotsPerAttack, stun units)
 *  free      -> the selected form spends nothing (melee/self-contained form, e.g. a bayonet profile of a ranged weapon)
 *  untracked -> cost targets a resource the single-counter pool cannot represent (documented gap); spend nothing
 *  pending   -> canonical cost is not numeric (autofire rule, null); the existing AmmoSystem rules apply unchanged
 */
export function resolveCanonicalResourceCost(runtime, { damageMode = null } = {}) {
  const resolved = runtime.resolved, profile = runtime.profile, def = profile.definition;
  const res = resolved.canonicalStats.resource ?? {};
  const ammo = resolved.canonicalStats.ammo ?? {};
  const rc = def.resourceConsumption ?? null;
  const base = { resourceId: rc?.resource ?? null, kind: res.kind ?? null, ammoType: ammo.type ?? null };
  const out = (status, units, reason, source) => Object.freeze({ ...base, status, units, reason, source });

  if (rc) {
    // multi-resource weapon: only the first listed resource is the pool the Item counter represents
    const pools = (ammo.profiles ?? []).map((p) => p.id);
    if (pools.length > 1 && rc.resource && rc.resource !== pools[0]) return out('untracked', 0, `secondary-resource:${rc.resource}`, 'profile.resourceConsumption');
    const baseUnits = num(rc.baseUnits), mult = num(rc.multiplier);
    if (baseUnits === null || mult === null) return out('pending', null, 'non-numeric-consumption', 'profile.resourceConsumption');
    const stun = damageMode === 'stun' && num(rc.stunUnits) !== null;
    return out('cost', (stun ? rc.stunUnits : baseUnits) * mult, stun ? 'stun-units' : 'base-units', 'profile.resourceConsumption');
  }
  // a melee form never spends the ammunition of its (ranged) host weapon
  if (def.range?.mode === 'melee') return out('free', 0, 'melee-form', 'profile.range');
  const dflt = num(res.consumption?.defaultUnitsPerAttack);
  if (dflt !== null) return out('cost', dflt, 'default-units-per-attack', 'resource.consumption');
  if (res.kind === 'none' || ammo.required === false || ammo.mode === 'self-contained') return out('free', 0, 'resource-free', 'resource.kind');
  // canonical single-shot mode: one unit per attack is the structured statement (ammo.mode 'single'), not an assumption
  if (ammo.mode === 'single') return out('cost', 1, 'single-shot-mode', 'ammo.mode');
  return out('pending', null, 'no-structured-cost', 'resource');
}
