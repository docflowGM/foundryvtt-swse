/**
 * Range of a vehicle weapon (Core Rulebook, Vehicles, Vehicle Combat: "Range Modifier" and Table 10-2: Vehicle Weapon Ranges).
 *
 *   "A vehicle weapon can attack a target at point blank, short, medium, or long range. If you make a ranged attack against a
 *    target within a weapon's point blank range, you take no penalty on the attack roll. Your penalty on attack rolls increases
 *    to -2 at short range, -5 at medium range, and -10 at long range."
 *
 * The distance is a property of the TOKENS of the attacking vehicle and the target, counted in grid squares; the table used is the
 * ENCOUNTER's scale (character scale: vehicles with characters on foot; starship scale: vehicles only) and the ROW is the weapon's
 * type (data/vehicle-weapon-ranges.json). A target beyond the long band cannot be attacked. Anything unresolved (no token, no grid,
 * an unsupported grid, an unidentified weapon type, an undetermined scale) is REFUSED -- never treated as point blank.
 *
 * PROJECT_INTERPRETATION (V-P6C-12, measurement convention): distance is counted the way squares are counted in this system -- from
 * the attacker's nearest square to the target's nearest square, a diagonal step counting as one square (Chebyshev), adjacent
 * squares being 1 and the same square 0 -- using each token's own footprint (width x height in squares). The Core does not
 * define the measurement for large fighting spaces.
 *
 * Pure of Foundry globals: tokens, grid and range profiles are passed in.
 */
export const RANGE_REASONS = Object.freeze({
  DISTANCE_UNRESOLVED: 'RANGE_DISTANCE_UNRESOLVED',
  GRID_UNRESOLVED: 'RANGE_GRID_UNRESOLVED',
  GRID_UNSUPPORTED: 'RANGE_GRID_TYPE_UNSUPPORTED',
  TABLE_NOT_IDENTIFIED: 'RANGE_TABLE_NOT_IDENTIFIED',
  TABLE_MISSING: 'RANGE_TABLE_MISSING',
  SCALE_UNDETERMINED: 'RANGE_ENCOUNTER_SCALE_UNDETERMINED',
  OUT_OF_RANGE: 'RANGE_TARGET_OUT_OF_RANGE'
});

/**
 * The four bands of Table 10-2, in order. The attack-roll penalty of a band (0 / -2 / -5 / -10) is NOT repeated here: it has one
 * authority, getRangePenalty() in combat-stat-rules.js, which the attack math calls with the band resolved here.
 */
export const RANGE_BANDS = Object.freeze([
  { key: 'pb', band: 'pointBlank', label: 'point blank' },
  { key: 'short', band: 'short', label: 'short' },
  { key: 'medium', band: 'medium', label: 'medium' },
  { key: 'long', band: 'long', label: 'long' }
]);

const finite = v => typeof v === 'number' && Number.isFinite(v);

/**
 * The Table 10-2 row of a vehicle weapon, from its PRINTED designation. Exact word recognition of the table's own weapon types
 * (blaster cannon, ion cannon, laser cannon, missile or torpedo, point-defense, tractor beam, turbolaser, plus the shieldbuster
 * torpedo and gravity well projector rows the Starships of the Galaxy table adds); a designation that names none or several is
 * UNIDENTIFIED (null). An autoblaster is a blaster cannon (Starships of the Galaxy: "Blaster cannons can be designed with a
 * higher cyclic firing rate"). This is a lookup of the weapon's type, never a source of any other mechanic.
 */
export function rangeSlugFromPrintedDesignation(label) {
  const t = String(label ?? '').toLowerCase();
  const found = new Set();
  if (/\bshield-?\s?buster/.test(t)) found.add('shieldbuster-torpedoes');
  else if (/\b(torpedo|torpedoes|missile|missiles)\b/.test(t)) found.add('missiles-torpedoes');
  if (/\blaser cannons?\b/.test(t)) found.add('laser-cannons');
  if (/\b(blaster cannons?|autoblasters?)\b/.test(t)) found.add('blaster-cannons');
  if (/\bion cannons?\b/.test(t)) found.add('ion-cannons');
  if (/\bturbolasers?\b/.test(t)) found.add('turbolasers');
  if (/\btractor beams?\b/.test(t)) found.add('tractor-beams');
  if (/\bgravity wells?\b/.test(t)) found.add('gravity-well-projectors');
  if (/\bpoint-?\s?defen[cs]e\b/.test(t)) found.add('point-defense');
  return found.size === 1 ? [...found][0] : null;
}

const centerOf = (token, gridSize) => {
  const c = token?.center;
  if (finite(c?.x) && finite(c?.y)) return { x: c.x, y: c.y };
  const d = token?.document ?? token;
  const w = Number(d?.width ?? 1), h = Number(d?.height ?? 1);
  if (finite(d?.x) && finite(d?.y)) return { x: d.x + (w * gridSize) / 2, y: d.y + (h * gridSize) / 2 };
  return null;
};
const footprintOf = token => {
  const d = token?.document ?? token;
  const w = Number(d?.width ?? 1), h = Number(d?.height ?? 1);
  return { w: finite(w) && w > 0 ? w : 1, h: finite(h) && h > 0 ? h : 1 };
};
/** Squares from the nearest square of one footprint to the nearest square of the other along one axis (0 = overlapping, 1 = adjacent). */
const axisSquares = (distance, half) => (distance < half ? 0 : Math.round(distance - half) + 1);

/**
 * Distance in squares between two tokens, counting their footprints.
 * @param {{size:number, type?:number}} grid  px per square and Foundry's grid type (1 square, 0 gridless; hexes are unsupported)
 * @returns {{ok:true, squares:number}|{ok:false, reason:string}}
 */
export function measureSquaresBetweenTokens(attackerToken, targetToken, grid) {
  const size = Number(grid?.size);
  if (!finite(size) || size <= 0) return { ok: false, reason: RANGE_REASONS.GRID_UNRESOLVED };
  if (grid?.type !== undefined && grid.type !== null && ![0, 1].includes(Number(grid.type))) return { ok: false, reason: RANGE_REASONS.GRID_UNSUPPORTED };
  const a = centerOf(attackerToken, size), b = centerOf(targetToken, size);
  if (!a || !b) return { ok: false, reason: RANGE_REASONS.DISTANCE_UNRESOLVED };
  const fa = footprintOf(attackerToken), fb = footprintOf(targetToken);
  const dx = Math.abs(a.x - b.x) / size, dy = Math.abs(a.y - b.y) / size;
  return { ok: true, squares: Math.max(axisSquares(dx, (fa.w + fb.w) / 2), axisSquares(dy, (fa.h + fb.h) / 2)) };
}

/**
 * Which band of a Table 10-2 profile holds a distance. @returns {{ok:true, band:object}|{ok:false, reason, longestBand:number|null}}
 */
export function bandForDistance(profile, scale, squares) {
  const bands = profile?.[scale];
  if (!bands || !finite(squares) || squares < 0) return { ok: false, reason: RANGE_REASONS.TABLE_MISSING, longestBand: null };
  let longest = null;
  for (const b of RANGE_BANDS) {
    const r = bands[b.key];
    if (!r) continue;
    longest = r.max;
    if (squares >= r.min && squares <= r.max) return { ok: true, band: { ...b, min: r.min, max: r.max } };
  }
  return { ok: false, reason: RANGE_REASONS.OUT_OF_RANGE, longestBand: longest };
}

/**
 * The complete range resolution of one attack.
 * @param {{slug:string|null, scale:string, attackerToken:object, targetToken:object, grid:object, profile:object|null}} p
 * @returns {{ok:true, slug, scale, squares, band, bandLabel, bandMin, bandMax}|{ok:false, reason:string, squares?:number, longestBand?:number|null}}
 */
export function resolveVehicleRange({ slug, scale, attackerToken, targetToken, grid, profile }) {
  if (!slug) return { ok: false, reason: RANGE_REASONS.TABLE_NOT_IDENTIFIED };
  if (scale !== 'character' && scale !== 'starship') return { ok: false, reason: RANGE_REASONS.SCALE_UNDETERMINED };
  if (!profile) return { ok: false, reason: RANGE_REASONS.TABLE_MISSING };
  if (!attackerToken || !targetToken) return { ok: false, reason: RANGE_REASONS.DISTANCE_UNRESOLVED };
  const m = measureSquaresBetweenTokens(attackerToken, targetToken, grid);
  if (!m.ok) return m;
  const b = bandForDistance(profile, scale, m.squares);
  if (!b.ok) return { ok: false, reason: b.reason, squares: m.squares, longestBand: b.longestBand };
  return { ok: true, slug, scale, squares: m.squares, band: b.band.band, bandLabel: b.band.label, bandMin: b.band.min, bandMax: b.band.max };
}
