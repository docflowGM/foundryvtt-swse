/**
 * PHASE 8D-2 foundation — Faction institutional-character generator.
 * Thin wrapper over `data/faction-institutional-characters.js`.
 */

import { FACTION_INSTITUTIONAL_CHARACTERS } from '../data/faction-institutional-characters.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random institutional-character entry, optionally biased by organization-family tags. */
export function pickFactionInstitutionalCharacter({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(FACTION_INSTITUTIONAL_CHARACTERS, { rng, preferTags });
}
