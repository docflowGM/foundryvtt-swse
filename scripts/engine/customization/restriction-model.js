export const RESTRICTION_ORDER = Object.freeze({
  common: 0,
  licensed: 1,
  restricted: 2,
  military: 3,
  illegal: 4
});

// Rare is intentionally tracked separately from legality. It does not participate
// in the common→illegal ownership hierarchy.
export function normalizeRestriction(value) {
  const normalized = String(value ?? 'common').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(RESTRICTION_ORDER, normalized) ? normalized : 'common';
}

export function getMostRestrictive(...restrictions) {
  return restrictions
    .map(normalizeRestriction)
    .reduce((most, current) => RESTRICTION_ORDER[current] > RESTRICTION_ORDER[most] ? current : most, 'common');
}

export function isRestrictionMoreSevere(current, baseline) {
  return RESTRICTION_ORDER[normalizeRestriction(current)] > RESTRICTION_ORDER[normalizeRestriction(baseline)];
}
