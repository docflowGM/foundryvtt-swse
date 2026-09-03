/**
 * PHASE 8D-2 foundation — opposition REQUEST contract.
 *
 * HARD RULE: this module NEVER selects, names, or references an actual
 * statblock/Actor. It only describes, in soft vocabulary, what KIND of
 * opposition a Job/encounter phase calls for -- a semantic request a
 * human GM (or a FUTURE, unbuilt resolver) can turn into real
 * opposition. This is the "Suggest canonical mechanics" half of the
 * hard rule restated throughout Phase 8D-2: "Generate narrative facts.
 * Suggest canonical mechanics. Resolve through existing authorities."
 *
 * FUTURE INTERFACE (documented here, NOT implemented in this phase):
 * an eventual `OppositionCatalogService.resolve(request)` would accept
 * exactly the shape `createOppositionRequest()` returns and produce
 * `{ statblockRefs: string[] }` -- UUID-only references into the
 * existing Actor compendium, the same UUID-only discipline
 * `faction-doctrine-draft.js`'s `createFactionPreferredStatblockRoster()`
 * already established for preferred statblocks. Building that resolver
 * is explicitly out of scope here; this module only defines the
 * request shape it would consume.
 */

import { normalizeTags } from '../lib/tag-utils.js';

export const OPPOSITION_THREAT_LEVEL = Object.freeze({
  TRIVIAL: 'trivial',
  STANDARD: 'standard',
  DANGEROUS: 'dangerous',
  DEADLY: 'deadly'
});

export const OPPOSITION_COUNT_BAND = Object.freeze({
  SOLO: 'solo',
  PAIR: 'pair',
  SMALL_GROUP: 'small-group',
  SQUAD: 'squad',
  HORDE: 'horde'
});

const THREAT_LEVELS = Object.freeze(Object.values(OPPOSITION_THREAT_LEVEL));
const COUNT_BANDS = Object.freeze(Object.values(OPPOSITION_COUNT_BAND));

export function isOppositionThreatLevel(value) {
  return THREAT_LEVELS.includes(value);
}

export function isOppositionCountBand(value) {
  return COUNT_BANDS.includes(value);
}

/**
 * Build one opposition request. `archetypeTags` are free-text
 * descriptive tags ("security-guards", "gang-enforcers",
 * "military-patrol", "wild-creature", "rival-crew", ...) -- deliberately
 * NOT a closed enum, matching the same flexible free-text tag
 * discipline `location-library-seeds.js`'s own `tags`/`biomes` already
 * use. Never validated against any catalog here (no catalog exists
 * yet -- see module doc).
 */
export function createOppositionRequest({
  archetypeTags = [],
  threatLevel = OPPOSITION_THREAT_LEVEL.STANDARD,
  countBand = OPPOSITION_COUNT_BAND.SMALL_GROUP,
  notes = ''
} = {}) {
  return {
    archetypeTags: normalizeTags(archetypeTags),
    threatLevel: isOppositionThreatLevel(threatLevel) ? threatLevel : OPPOSITION_THREAT_LEVEL.STANDARD,
    countBand: isOppositionCountBand(countBand) ? countBand : OPPOSITION_COUNT_BAND.SMALL_GROUP,
    notes: String(notes || '').trim()
  };
}
