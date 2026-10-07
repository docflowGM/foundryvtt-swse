// Phase 5B-8 -- range core. Structural only: reads the selected profile's frozen range block and qualities.
// Global band tables (data/actor-weapon-ranges.json) stay global and are keyed by range.profileId; this module never
// consults weapon names. Consumers apply penalties; this returns the canonical descriptors.
export function resolveRange(resolved, profile, _context = {}) {
  const def = profile.definition;
  const r = def.range ?? {};
  const q = def.qualities ?? {};
  return Object.freeze({
    profileId: profile.id,
    family: r.profileId ?? null,            // key into the global band table (pistols/rifles/heavy-weapons/simple-weapons/thrown-weapons)
    mode: r.mode ?? null,                   // melee | ranged | fixed-maximum | fixed-area | conditional | unresolved
    branch: profile.branch,
    bands: r.bands ?? null,
    basePenalties: r.basePenalties ?? null,
    allowedBands: r.allowedBands ?? null,
    hardMaxSquares: r.hardMaxSquares ?? null,
    penaltyApplication: r.penaltyApplication ?? null,
    qualityEffects: r.qualityEffects ?? null,
    sourceStatus: r.sourceStatus ?? null,
    accurate: q.accurate === true,
    inaccurate: q.inaccurate === true,
    thrown: q.thrown === true,
    reach: q.reach === true,
    pistolForRange: r.profileId === 'pistols',
    rifleForRange: r.profileId === 'rifles',
    conditionalRangeRules: def.conditionalRangeRules ?? [],
    resolved: r.mode !== 'unresolved' && !(r.mode === 'ranged' && !r.profileId && !r.bands),
  });
}
