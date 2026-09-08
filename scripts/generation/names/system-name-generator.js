/**
 * PHASE 8D-2 foundation — procedural system-name generator.
 *
 * Confirmed by reconnaissance: `location-library-seeds.js` names every
 * known system after its primary planet (`"system": "Dantooine system"`).
 * This generator reuses that exact convention as the DEFAULT — a system
 * is not a separate namespace from its primary planet's name unless a
 * caller deliberately asks for an independent one (via
 * `independent: true`), which draws from the small
 * `SYSTEM_NAME_DESIGNATIONS` pool instead. This is a GENERATE-tier fact
 * only, never a canonical Location id.
 */

import { SYSTEM_NAME_DESIGNATIONS } from '../data/system-name-designations.js';
import { PLANET_NAME_PREFIXES } from '../data/planet-name-syllables.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random independent-system designation entry (see module doc). */
export function pickSystemNameDesignation({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SYSTEM_NAME_DESIGNATIONS, { rng, preferTags });
}

/**
 * Generate a system-name draft.
 *
 * - Default (`independent` false/omitted): derives the name from
 *   `planetName` — `"${planetName} system"`, matching the Location
 *   Library convention. Requires `planetName`.
 * - `independent: true`: generates a name independent of any one
 *   planet — `"${prefix} Designation}"` (e.g. "Kal Reach") — for
 *   multi-world systems not named after a single dominant planet.
 *
 * @param {object} [options]
 * @param {string} [options.planetName] - required unless `independent`.
 * @param {boolean} [options.independent]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags] - only used when `independent`.
 */
export function getRandomSystemName({ planetName = '', independent = false, rng, preferTags = [] } = {}) {
  if (!independent && planetName) {
    return { name: `${planetName} system`, planetName, independent: false, designation: null };
  }
  const prefix = weightedPickWithPreference(PLANET_NAME_PREFIXES, { rng, preferTags });
  const designation = pickSystemNameDesignation({ rng, preferTags });
  return {
    name: `${prefix?.value ?? 'Kal'} ${designation?.value ?? 'Reach'}`,
    planetName: '',
    independent: true,
    designation
  };
}
