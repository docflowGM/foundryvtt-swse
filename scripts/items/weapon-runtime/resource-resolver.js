// Phase 5B-9 -- resource core. Canonical (immutable) resource definition is kept apart from owned mutable state.
// Capacity is null when the authority does not resolve it; Burst/Autofire consumption metadata is preserved verbatim.
// Current ammo is NEVER copied into the registry; it is read from the owned item state only.
export function resolveResource(resolved, profile, _context = {}) {
  const def = profile.definition;
  const res = resolved.canonicalStats.resource ?? {};
  const ammo = resolved.canonicalStats.ammo ?? {};
  const capacity = res.capacityShots ?? ammo.capacityShots ?? null;
  return Object.freeze({
    profileId: profile.id,
    canonical: Object.freeze({
      kind: res.kind ?? null,
      source: res.source ?? null,
      capacity: capacity === undefined ? null : capacity,
      reloadAction: res.reloadAction ?? ammo.reloadAction ?? null,
      replacementCostCredits: res.replacementCostCredits ?? null,
      ammo,
      resource: res,
      resourceProfiles: resolved.canonicalStats.resourceProfiles ?? [],
      consumption: def.resourceConsumption ?? null, // baseUnits / multiplier / autofireUnits / shotsPerAttack / stunUnits preserved
      firingConstraints: def.firingConstraints ?? null,
    }),
    owned: resolved.ownedState,
  });
}
