// Phase 5D-G -- canonical attack area shape (pure).
// The selected form's `area` block (profile, or the selected payload's own area) and `attackResolution` say whether the attack is
// single-target or an area/splash/burst/blast/cone/rectangle/square attack, its geometry and what a miss does. The EXISTING area
// rules (workflow `attack.isArea`, ruleData.halfDamageOnMiss, no-critical-doubling, Reflex comparison, Evasion) execute it; this
// module only states the selected form's shape. Never reads a name, description or Item projection.
const KIND_BY_SHAPE = Object.freeze({
  burst: 'burst', splash: 'splash', blast: 'blast', cone: 'cone', square: 'square', rectangle: 'rectangle',
  'primary-target-plus-adjacent': 'adjacent', 'autofire-square': 'autofire-area', 'single-square-cloud': 'cloud',
});
const num = (v) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);

/**
 * @param {object|null} area         selected payload area ?? profile area
 * @param {object|null} resolution   profile attackResolution
 * @returns {Readonly<{isArea:boolean, kind:string, geometry:object, onMiss:string|null, halfDamageOnMiss:boolean|undefined, noDamageOnMiss:boolean, resolutionMode:string|null, completeness:string|null}>}
 */
export function resolveAreaShape(area, resolution = null, { rateOfFire = null } = {}) {
  const enabled = area?.enabled === true;
  const mode = resolution?.mode ?? null;
  const onMiss = resolution?.onMiss ?? null;
  const geometry = Object.freeze({
    shape: area?.shape ?? null, radiusSquares: num(area?.radiusSquares), lengthSquares: num(area?.lengthSquares), widthSquares: num(area?.widthSquares),
    widthAtEndSquares: num(area?.widthAtEndSquares), heightSquares: num(area?.heightSquares),
  });
  if (!enabled) {
    return Object.freeze({ isArea: false, kind: 'single', geometry, onMiss, halfDamageOnMiss: undefined, noDamageOnMiss: false, resolutionMode: mode, completeness: null });
  }
  // an area-enabled form with NO intrinsic geometry is either fire-mode derived (autofire-only weapon: the generic 2x2 autofire area
  // rule, owned by the autofire path -- no geometry is invented here) or one whose source publishes no geometry at all
  const rof = Array.isArray(rateOfFire) ? rateOfFire.map(String) : [];
  const fireModeDerived = !area.shape && rof.includes('A') && !rof.includes('S');
  const kind = area.shape ? (KIND_BY_SHAPE[area.shape] ?? 'other') : fireModeDerived ? 'autofire-area' : 'area-unspecified';
  return Object.freeze({
    isArea: true, kind, geometry, derivedFrom: fireModeDerived ? 'fire-mode' : null, onMiss, resolutionMode: mode,
    // 'half-damage' -> the existing halfDamageOnMiss rule; 'none' -> a miss deals nothing; every other value is source-unspecified or
    // target-dependent and stays GM-adjudicated (nothing is invented)
    halfDamageOnMiss: onMiss === 'half-damage' ? true : undefined,
    noDamageOnMiss: onMiss === 'none',
    completeness: area.shape || fireModeDerived ? null : 'source-silent-geometry',
  });
}

/** Compact, JSON-safe record for the workflow context. */
export function summarizeAreaShape(a) {
  if (!a?.isArea) return undefined;
  const out = { kind: a.kind };
  for (const [k, v] of Object.entries(a.geometry ?? {})) if (v !== null && v !== undefined) out[k] = v;
  if (a.onMiss) out.onMiss = a.onMiss;
  return out;
}
