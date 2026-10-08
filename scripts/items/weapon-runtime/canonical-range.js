// Phase 5D-D -- canonical range facet consumption. The runtime says WHICH range definition applies to the selected attack
// form (profile range block via resolveRange); the existing band-penalty arithmetic (combat-stat-rules.js#getRangePenalty)
// still turns a band into a number. Pure; never reads names or Item-level range fields.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';
import { resolveRange } from './range-resolver.js';

const TREATED_AS_FAMILY = Object.freeze({ pistol: 'pistols', rifle: 'rifles', 'heavy weapon': 'heavy-weapons', 'simple weapon': 'simple-weapons' });
export const RANGE_BANDS = Object.freeze(['pointBlank', 'short', 'medium', 'long']);
const BAND_ALIASES = new Map([['pointblank', 'pointBlank'], ['point-blank', 'pointBlank'], ['pb', 'pointBlank'], ['short', 'short'], ['medium', 'medium'], ['long', 'long']]);
export const normalizeRangeBand = (v) => BAND_ALIASES.get(String(v ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-')) ?? BAND_ALIASES.get(String(v ?? '').trim().toLowerCase()) ?? null;

/**
 * Canonical range facet of a resolved selected profile.
 *   status 'melee'   -> no range bands apply
 *   status 'banded'  -> ranged with a band table (basePenalties, optional short override, allowed bands, squares)
 *   status 'pending' -> ranged/other with no structured band table (unresolved / conditional / fixed-area / fixed-maximum /
 *                       range inherited from a host): the existing generic band arithmetic still applies, nothing is invented
 * Throws RANGE_BRANCH_MISMATCH when the profile's branch contradicts its own range mode (never guessed).
 */
export function resolveCanonicalRange(resolved, profile) {
  const r = resolveRange(resolved, profile);
  const id = resolved.identity?.identityKey ?? null;
  if ((r.mode === 'melee' && profile.branch !== 'melee') || (r.mode === 'ranged' && profile.branch !== 'ranged')) {
    throw new WeaponRuntimeError(ERROR_CODES.RANGE_BRANCH_MISMATCH, `${id}/${profile.id}: profile branch ${profile.branch} contradicts canonical range mode ${r.mode}`, { identityKey: id, profileId: profile.id, branch: profile.branch, rangeMode: r.mode });
  }
  // Phase 5D-G: operation.rangeTreatedAs ("treated as a Pistol for range") names the global band-table family the weapon uses. It must
  // agree with the selected profile's own range family; when the profile states none, it supplies the family. Structure, never a name.
  const treatedAs = TREATED_AS_FAMILY[String(resolved.operation?.rangeTreatedAs ?? '').trim().toLowerCase()] ?? null;
  if (treatedAs && r.family && r.family !== treatedAs) {
    throw new WeaponRuntimeError(ERROR_CODES.RANGE_FAMILY_MISMATCH, `${id}/${profile.id}: operation.rangeTreatedAs=${resolved.operation.rangeTreatedAs} contradicts the profile range family ${r.family}`, { identityKey: id, profileId: profile.id, treatedAs, family: r.family });
  }
  const qe = r.qualityEffects ?? {};
  const flagAllows = { pointBlank: qe.pointBlankAllowed !== false, short: true, medium: qe.mediumAllowed !== false, long: qe.longAllowed !== false };
  const listed = Array.isArray(r.allowedBands) ? new Set(r.allowedBands) : null;
  const allowedBands = RANGE_BANDS.filter((b) => flagAllows[b] && (!listed || listed.has(b)));
  const banded = r.mode === 'ranged' && !!r.basePenalties;
  return Object.freeze({
    status: r.mode === 'melee' ? 'melee' : banded ? 'banded' : 'pending',
    mode: r.mode, family: r.family ?? treatedAs, treatedAs, branch: profile.branch,
    allowedBands: Object.freeze(banded ? allowedBands : [...RANGE_BANDS]),
    basePenalties: banded ? r.basePenalties : null,
    shortPenaltyOverride: banded && Number.isFinite(qe.shortPenaltyOverride) ? qe.shortPenaltyOverride : null,
    bandSquares: r.bands ?? null, hardMaxSquares: r.hardMaxSquares ?? null,
  });
}

/** Attack-time check that the chosen band exists for the selected form (melee forms ignore the band). */
export function assertRangeSelectionResolvable(range, rangeBand) {
  if (!range || range.status !== 'banded') return;
  const band = normalizeRangeBand(rangeBand);
  if (band && !range.allowedBands.includes(band)) {
    throw new WeaponRuntimeError(ERROR_CODES.RANGE_BAND_NOT_ALLOWED, `range band ${band} is not available for the selected attack form`, { rangeBand: band, allowedBands: [...range.allowedBands] });
  }
}

/** Penalty for a band under a canonical banded facet, or null when the facet supplies none (caller keeps the existing arithmetic). */
export function canonicalRangePenalty(range, rangeBand) {
  if (!range) return null;
  if (range.status === 'melee') return 0;
  if (range.status !== 'banded') return null;
  const band = normalizeRangeBand(rangeBand);
  if (!band) return null;
  if (band === 'short' && range.shortPenaltyOverride !== null) return range.shortPenaltyOverride;
  const v = range.basePenalties?.[band];
  return Number.isFinite(v) ? v : null;
}
