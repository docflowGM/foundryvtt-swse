/**
 * PHASE 8D-2 foundation — centralized generator diagnostic codes.
 *
 * A single registry of stable, machine-readable diagnostic identifiers
 * any generator can attach to a draft's `provenance.warnings` (the
 * array `provenance.js` already defines and `reward-estimator.js`'s
 * `ISSUER_RESOURCE_MISMATCH` already uses this same pattern for).
 * Diagnostics WARN about an unusual combination; they never
 * automatically "fix" or discard an interesting result — a Scale-3
 * organization commissioning a 300,000-credit starship theft
 * (`reward-estimator.js`) is flagged, not blocked.
 */

export const DIAGNOSTIC_CODE = Object.freeze({
  // Species / population
  SPECIES_UNAVAILABLE: 'species-unavailable',
  SPECIES_PROFILE_EMPTY: 'species-profile-empty',
  SPECIES_STATBLOCK_MISMATCH: 'species-statblock-mismatch',
  NO_SPECIES_COMPATIBLE_PROFILE: 'no-species-compatible-profile',

  // Environment / population coherence
  ENVIRONMENT_MISMATCH: 'environment-mismatch',
  POPULATION_ENVIRONMENT_MISMATCH: 'population-environment-mismatch',
  ECONOMY_ENVIRONMENT_MISMATCH: 'economy-environment-mismatch',
  POI_CONTEXT_MISMATCH: 'poi-context-mismatch',
  UNINHABITED_WORLD_HAS_SETTLEMENT: 'uninhabited-world-has-settlement',

  // PHASE 8D-3A: planet civilization/economy coherence (planet-draft.js)
  // R2 fix 8: the "rolled economy sector(s) share no tag with the
  // world's own environment" check now reuses `ECONOMY_ENVIRONMENT_MISMATCH`
  // above (which already existed for exactly this concept but had no
  // computer anywhere yet) instead of the redundant `TRADE_CONTEXT_MISMATCH`
  // this phase had separately introduced for the same case.
  GOVERNMENT_POPULATION_MISMATCH: 'government-population-mismatch',
  TECHNOLOGY_POPULATION_MISMATCH: 'technology-population-mismatch',

  // Faction
  FACTION_RESOURCE_MISMATCH: 'faction-resource-mismatch',
  FACTION_POPULATION_MISMATCH: 'faction-population-mismatch',
  RANK_PROFILE_MISMATCH: 'rank-profile-mismatch',

  // PHASE 8D-3B: NPC concept coherence (npc/npc-bundle.js) — warn only,
  // never auto-"corrected"; an Ithorian bartender on a Human-dominated
  // mining colony is unusual, not invalid.
  NPC_ROLE_CONTEXT_MISMATCH: 'npc-role-context-mismatch',
  NPC_FACTION_MEMBERSHIP_MISMATCH: 'npc-faction-membership-mismatch',
  NPC_SPECIES_CONTEXT_MISMATCH: 'npc-species-context-mismatch',
  NPC_DROID_CONTEXT_MISMATCH: 'npc-droid-context-mismatch',
  // PHASE 8D-3B correction pass round 5: an explicit linkedLocationId/
  // locationDraftId conflicts with locationContext's own declared
  // identity (npc/npc-bundle.js's resolveNpcLocationGenerationContext())
  // -- the explicit target wins and locationContext's bias/tags are
  // dropped entirely rather than silently biasing generation toward a
  // Location the NPC isn't actually linked to.
  NPC_LOCATION_CONTEXT_MISMATCH: 'npc-location-context-mismatch',

  // Reward (reward-estimator.js already emits this one under the same code)
  ISSUER_RESOURCE_MISMATCH: 'issuer-resource-mismatch',
  REWARD_BUDGET_MISMATCH: 'reward-budget-mismatch',

  // PHASE 8D-3C: Job generation context coherence (jobs/job-bundle.js) --
  // warn only, never auto-"corrected"; an explicit issuer/location target
  // that conflicts with a supplied jobContext is unusual, not invalid.
  JOB_CONTEXT_MISMATCH: 'job-context-mismatch',

  // Reference integrity
  MISSING_CANONICAL_REFERENCE: 'missing-canonical-reference',
  UNRESOLVED_DRAFT_DEPENDENCY: 'unresolved-draft-dependency',

  // Relationship
  HOSTILE_RELATIONSHIP_NO_NORMAL_JOB: 'hostile-relationship-no-normal-job'
});

const DIAGNOSTIC_CODES = Object.freeze(Object.values(DIAGNOSTIC_CODE));

export function isDiagnosticCode(value) {
  return DIAGNOSTIC_CODES.includes(value);
}

/**
 * Build one diagnostic entry: `{code, note}`. `note` is an optional
 * human-readable elaboration (e.g. actual numbers) — the `code` alone
 * is what other code should ever branch on.
 */
export function createDiagnostic(code, note = '') {
  return { code: isDiagnosticCode(code) ? code : String(code || ''), note: String(note || '') };
}
