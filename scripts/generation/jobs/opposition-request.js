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
 * CORRECTED (Phase 8D-2 independent review, round 1): the original
 * version of this request carried only `archetypeTags`/`threatLevel`/
 * `countBand`/`notes` -- too lossy for the intelligent resolver the
 * wider design already anticipates. The request now also carries
 * `environmentTags`/`organizationTags` (context), `requiredRoles`/
 * `optionalRoles`/`leaderRequirement`/`specialistRequirements`
 * (composition), `reinforcementLevel`/`vehicleSupport`/`droidSupport`
 * (scale), and `difficulty`/`rankContext`/`speciesContext` (the last
 * three REUSING existing authorities verbatim --
 * `objective-economy.js`'s `OBJECTIVE_DIFFICULTY`, `rank-metadata.js`'s
 * `COMMAND_TIER`, and the same caller-supplies-species-ids discipline
 * `population-profile.js` already established -- rather than inventing
 * three more vocabularies). `threatLevel`/`countBand` are NOT replaced
 * by `difficulty` -- all three stay, deliberately overlapping facets
 * (a `deadly`/`horde` fight can still be `routine` difficulty for a
 * high-tier party) a future resolver can weigh independently.
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
import { isObjectiveDifficulty, OBJECTIVE_DIFFICULTY } from '../objective-economy.js';
import { isCommandTier, COMMAND_TIER } from '../rank-metadata.js';

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

export const OPPOSITION_LEADER_REQUIREMENT = Object.freeze({ NONE: 'none', OPTIONAL: 'optional', REQUIRED: 'required' });
export const OPPOSITION_SUPPORT_LEVEL = Object.freeze({ NONE: 'none', LIGHT: 'light', MODERATE: 'moderate', HEAVY: 'heavy' });

const THREAT_LEVELS = Object.freeze(Object.values(OPPOSITION_THREAT_LEVEL));
const COUNT_BANDS = Object.freeze(Object.values(OPPOSITION_COUNT_BAND));
const LEADER_REQUIREMENTS = Object.freeze(Object.values(OPPOSITION_LEADER_REQUIREMENT));
const SUPPORT_LEVELS = Object.freeze(Object.values(OPPOSITION_SUPPORT_LEVEL));

export function isOppositionThreatLevel(value) {
  return THREAT_LEVELS.includes(value);
}

export function isOppositionCountBand(value) {
  return COUNT_BANDS.includes(value);
}

export function isOppositionLeaderRequirement(value) {
  return LEADER_REQUIREMENTS.includes(value);
}

export function isOppositionSupportLevel(value) {
  return SUPPORT_LEVELS.includes(value);
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [];
}

/**
 * Build one opposition request. `archetypeTags`/`environmentTags`/
 * `organizationTags` are free-text descriptive tags (deliberately NOT
 * a closed enum, matching the same flexible free-text tag discipline
 * `location-library-seeds.js`'s own `tags`/`biomes` already use) --
 * never validated against any catalog here (no catalog exists yet --
 * see module doc). `requiredRoles`/`optionalRoles`/
 * `specialistRequirements` are similarly free text; `specialistRequirements`
 * is informed by (but not hard-validated against)
 * `rank-metadata.js`'s existing `SPECIALIST_ROLES` vocabulary.
 * `speciesContext` is a plain array of caller-supplied species ids/
 * hints -- never resolved or validated here, matching
 * `population-profile.js`'s "species ids are always caller-supplied"
 * discipline.
 */
export function createOppositionRequest({
  archetypeTags = [],
  environmentTags = [],
  organizationTags = [],
  requiredRoles = [],
  optionalRoles = [],
  leaderRequirement = OPPOSITION_LEADER_REQUIREMENT.NONE,
  specialistRequirements = [],
  reinforcementLevel = OPPOSITION_SUPPORT_LEVEL.NONE,
  vehicleSupport = OPPOSITION_SUPPORT_LEVEL.NONE,
  droidSupport = OPPOSITION_SUPPORT_LEVEL.NONE,
  difficulty = OBJECTIVE_DIFFICULTY.STANDARD,
  rankContext = COMMAND_TIER.NONE,
  speciesContext = [],
  threatLevel = OPPOSITION_THREAT_LEVEL.STANDARD,
  countBand = OPPOSITION_COUNT_BAND.SMALL_GROUP,
  notes = ''
} = {}) {
  return {
    archetypeTags: normalizeTags(archetypeTags),
    environmentTags: normalizeTags(environmentTags),
    organizationTags: normalizeTags(organizationTags),
    requiredRoles: cleanStringArray(requiredRoles),
    optionalRoles: cleanStringArray(optionalRoles),
    leaderRequirement: isOppositionLeaderRequirement(leaderRequirement) ? leaderRequirement : OPPOSITION_LEADER_REQUIREMENT.NONE,
    specialistRequirements: cleanStringArray(specialistRequirements),
    reinforcementLevel: isOppositionSupportLevel(reinforcementLevel) ? reinforcementLevel : OPPOSITION_SUPPORT_LEVEL.NONE,
    vehicleSupport: isOppositionSupportLevel(vehicleSupport) ? vehicleSupport : OPPOSITION_SUPPORT_LEVEL.NONE,
    droidSupport: isOppositionSupportLevel(droidSupport) ? droidSupport : OPPOSITION_SUPPORT_LEVEL.NONE,
    difficulty: isObjectiveDifficulty(difficulty) ? difficulty : OBJECTIVE_DIFFICULTY.STANDARD,
    rankContext: isCommandTier(rankContext) ? rankContext : COMMAND_TIER.NONE,
    speciesContext: cleanStringArray(speciesContext),
    threatLevel: isOppositionThreatLevel(threatLevel) ? threatLevel : OPPOSITION_THREAT_LEVEL.STANDARD,
    countBand: isOppositionCountBand(countBand) ? countBand : OPPOSITION_COUNT_BAND.SMALL_GROUP,
    notes: String(notes || '').trim()
  };
}
