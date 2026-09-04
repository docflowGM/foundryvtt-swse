/**
 * PHASE 8D-2 foundation — Location current-event generator.
 *
 * Applies to any Location (a real, committed one via its id, a
 * Library-seed draft, or a procedural `planet-draft.js`/
 * `poi-generator.js` draft) -- this module takes no Location reference
 * at all, it only rolls the ambient-event fact itself; a caller
 * attaches it to whichever Location it's describing. See
 * `data/location-events.js`'s header for how this differs from
 * history hooks (past) and hazards (standing risk).
 */

import { LOCATION_EVENTS } from './data/location-events.js';
import { weightedPick, weightedPickWithPreference } from './lib/weighted-random.js';

export const LOCATION_EVENT_SEVERITY = Object.freeze({
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
  CRISIS: 'crisis'
});

const SEVERITY_ENTRIES = Object.freeze([
  { value: LOCATION_EVENT_SEVERITY.MINOR, weight: 4 },
  { value: LOCATION_EVENT_SEVERITY.MODERATE, weight: 4 },
  { value: LOCATION_EVENT_SEVERITY.MAJOR, weight: 2 },
  { value: LOCATION_EVENT_SEVERITY.CRISIS, weight: 1 }
]);

const SEVERITY_VALUES = Object.freeze(Object.values(LOCATION_EVENT_SEVERITY));

export function isLocationEventSeverity(value) {
  return SEVERITY_VALUES.includes(value);
}

/** Pick a single random event entry. */
export function pickLocationEvent({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(LOCATION_EVENTS, { rng, preferTags });
}

/** Pick a random severity entry. */
export function pickLocationEventSeverity({ rng } = {}) {
  return weightedPick(SEVERITY_ENTRIES, { rng });
}

/** Roll a full event: `{ description, severity }`. */
export function generateLocationEvent({ rng, preferTags = [] } = {}) {
  const eventEntry = pickLocationEvent({ rng, preferTags });
  const severityEntry = pickLocationEventSeverity({ rng });
  return { description: eventEntry?.value ?? '', severity: severityEntry?.value ?? LOCATION_EVENT_SEVERITY.MINOR };
}
