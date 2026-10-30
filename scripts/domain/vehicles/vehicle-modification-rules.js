/**
 * Phase 4E P2: the published starship modification procedure, as pure functions.
 *
 * Source: Starships of the Galaxy, Chapter III "Starship Modifications" (printed pp. 38-40;
 * evidence in data/audits/vehicles/swse-p2-sotg-modification-evidence.json and
 * docs/audits/vehicles/universal-vehicle-p2-p5-rules-certification.md).
 * This module encodes ONLY what that text states. Anything the book leaves to the Gamemaster, or
 * that the project owner has not ruled on, is returned as an explicit "needs decision" value and
 * never defaulted. No Foundry globals: Node-testable.
 */
const finite = v => typeof v === 'number' && Number.isFinite(v);

/** Table 3-1 Cost Modifiers (SotG p. 38). Sizes below Huge are not listed by the book. */
export const SIZE_COST_MODIFIER = Object.freeze({
  'huge': 1, 'gargantuan': 2, 'colossal': 5,
  'colossal (frigate)': 50, 'colossal (cruiser)': 500, 'colossal (station)': 5000
});

/** Installation Work Force (SotG p. 39): gargantuan or smaller = 1; maximum is 10x the minimum. */
export const MIN_WORK_FORCE = Object.freeze({
  'huge': 1, 'gargantuan': 1, 'colossal': 5,
  'colossal (frigate)': 10, 'colossal (cruiser)': 20, 'colossal (station)': 50
});

/** Penalties per missing emplacement point (SotG p. 38). */
export const SHORTFALL_PER_POINT = Object.freeze({ days: 2, dc: 5, costFraction: 0.2 });

/** Base Mechanics DC 20, +1 per emplacement point (SotG p. 40). */
export const BASE_INSTALL_DC = 20;

const sizeKey = size => String(size ?? '').trim().toLowerCase();

export function costModifierForSize(size) {
  const m = SIZE_COST_MODIFIER[sizeKey(size)];
  return m === undefined ? null : m;
}

export function minimumWorkForce(size) {
  const m = MIN_WORK_FORCE[sizeKey(size)];
  return m === undefined ? null : m;
}

/** A "base" cost is multiplied by the hull's cost modifier; a plain credit cost is the same for every size. */
export function systemCost(entry, size) {
  if (!entry || !finite(entry.cost) || entry.cost < 0) return { ok: false, reason: 'PRICE_UNKNOWN' };
  if (entry.costType === 'flat') return { ok: true, credits: entry.cost };
  if (entry.costType === 'base') {
    const mod = costModifierForSize(size);
    if (mod === null) return { ok: false, reason: 'HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER' };
    return { ok: true, credits: entry.cost * mod, costModifier: mod };
  }
  // multiplier / modifier cost types (e.g. "x3", "+4,000") depend on the weapon they modify
  return { ok: false, reason: 'COST_TYPE_NOT_RESOLVED_BY_PUBLISHED_RULES' };
}

/**
 * Nonstandard modification (SotG p. 39): doubles the EP required and multiplies cost by 5. A
 * modification is nonstandard when the hull's stock version has no similar system; the GM is the
 * final arbiter. Only objectively determinable cases are decided here; the rest return null.
 * The Starship Designer feat means work is never treated as nonstandard.
 */
export function nonstandardAssessment(entry, record, { starshipDesigner = false } = {}) {
  if (starshipDesigner) return { nonstandard: false, basis: 'STARSHIP_DESIGNER' };
  const name = String(entry?.name ?? '').toLowerCase();
  if (/hyperdrive/.test(name) && !/sled|ring/.test(name)) {
    const cap = record?.hyperspace?.capability;
    if (cap === 'equipped') return { nonstandard: false, basis: 'STOCK_HAS_HYPERDRIVE' };
    if (cap === 'unavailable') return { nonstandard: true, basis: 'STOCK_LACKS_HYPERDRIVE' };
    return { nonstandard: null, basis: 'STOCK_HYPERDRIVE_STATE_NOT_PUBLISHED' };
  }
  if (/shields/.test(name) && /sr\s*\d+/.test(name) || /^starship shields/.test(name)) {
    const sr = record?.defenses?.shieldRating;
    if (finite(sr) && sr > 0) return { nonstandard: false, basis: 'STOCK_HAS_SHIELDS' };
    if (sr === 0) return { nonstandard: true, basis: 'STOCK_LACKS_SHIELDS' };
    return { nonstandard: null, basis: 'STOCK_SHIELD_STATE_NOT_PUBLISHED' };
  }
  return { nonstandard: null, basis: 'GM_DETERMINES' };
}

/**
 * Full published quote for installing one system on one hull.
 * @param {{entry:object, size:string, unusedEmplacementPoints:number, workers?:number, nonstandard:boolean}} p
 */
export function quoteInstallation({ entry, size, unusedEmplacementPoints, workers = null, nonstandard = false }) {
  const mod = costModifierForSize(size);
  const minWorkers = minimumWorkForce(size);
  if (mod === null || minWorkers === null) return { ok: false, reasons: ['HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER'] };
  if (!finite(entry?.emplacementPoints) || entry.emplacementPoints < 0) return { ok: false, reasons: ['EP_COST_UNKNOWN'] };
  if (!finite(unusedEmplacementPoints) || unusedEmplacementPoints < 0) return { ok: false, reasons: ['EP_BUDGET_UNKNOWN'] };

  const baseCost = systemCost(entry, size);
  if (!baseCost.ok) return { ok: false, reasons: [baseCost.reason] };

  const ep = entry.emplacementPoints * (nonstandard ? 2 : 1);
  const credits0 = baseCost.credits * (nonstandard ? 5 : 1);
  const shortfall = Math.max(0, ep - unusedEmplacementPoints);

  const crew = workers ?? minWorkers;
  if (!Number.isInteger(crew) || crew < minWorkers || crew > minWorkers * 10)
    return { ok: false, reasons: ['WORK_FORCE_OUT_OF_RANGE'], workForce: { minimum: minWorkers, maximum: minWorkers * 10 } };

  // time = (EP x cost modifier) / workers  (+2 days per missing EP)
  const baseDays = (ep * mod) / crew;
  return {
    ok: true, reasons: [],
    nonstandard, emplacementPoints: ep, shortfall,
    credits: Math.round(credits0 * (1 + SHORTFALL_PER_POINT.costFraction * shortfall)),
    days: baseDays + SHORTFALL_PER_POINT.days * shortfall,
    mechanicsDC: BASE_INSTALL_DC + ep + SHORTFALL_PER_POINT.dc * shortfall,
    workForce: { used: crew, minimum: minWorkers, maximum: minWorkers * 10 },
    consequences: shortfall > 0 ? ['VEHICLE_BECOMES_USED', 'SYSTEM_DAMAGED_BEYOND_REPAIR_IF_VEHICLE_DISABLED'] : [],
    // Zero-EP systems: the formula yields 0 days; whether a minimum applies is not stated.
    zeroDaysUnspecified: baseDays === 0
  };
}

/** Result of the Mechanics check at the end of installation (SotG p. 40). */
export function installationCheckOutcome({ dc, total }) {
  if (!finite(dc) || !finite(total)) return { outcome: 'UNRESOLVED' };
  if (total >= dc) return { outcome: 'SUCCESS' };
  return total > dc - 10
    ? { outcome: 'PARTIAL_FAILURE', retry: { timeFraction: 0.5, costFraction: 0.5, mechanicsBonus: 5 } }
    : { outcome: 'TOTAL_FAILURE', retry: null, note: 'all time and money spent is wasted; start over' };
}

/** Removing a system takes half as long as installing it and costs nothing (SotG p. 38). */
export function quoteRemoval({ installDays, originalCredits }) {
  return {
    days: finite(installDays) ? installDays / 2 : null, credits: 0,
    // "can normally be sold for 1/4 of its original value (assuming good working condition and a buyer)"
    maximumResaleCredits: finite(originalCredits) ? Math.floor(originalCredits / 4) : null,
    resaleIsAutomatic: false
  };
}

/**
 * Gaining emplacement points by giving up cargo (SotG p. 38): tons of cargo equal to the hull's cost
 * modifier buy 1 point (e.g. 4 points on a Colossal (frigate) = 4 x 50 = 200 tons).
 */
export function cargoTonsForEmplacementPoints(size, points) {
  const mod = costModifierForSize(size);
  if (mod === null || !Number.isInteger(points) || points < 0) return null;
  return mod * points;
}
