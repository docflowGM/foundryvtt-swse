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

  // Faction
  FACTION_RESOURCE_MISMATCH: 'faction-resource-mismatch',
  FACTION_POPULATION_MISMATCH: 'faction-population-mismatch',
  RANK_PROFILE_MISMATCH: 'rank-profile-mismatch',

  // Reward (reward-estimator.js already emits this one under the same code)
  ISSUER_RESOURCE_MISMATCH: 'issuer-resource-mismatch',
  REWARD_BUDGET_MISMATCH: 'reward-budget-mismatch',

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
