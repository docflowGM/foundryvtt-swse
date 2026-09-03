/**
 * PHASE 8D-1 — SWSE Organization/Faction generation metadata.
 *
 * Canonical Faction data remains owned by `FactionRegistryService`
 * (`scripts/allies/faction-registry-service.js`) — confirmed by
 * reconnaissance: `Faction.scale` (clamped 1-20) already exists as the
 * canonical resources/influence input, and `Faction.jobDefaults` already
 * has the exact tone/rewardStyle/objective/briefing/instructions/
 * credits/successDelta/failureDelta/legality/payStyle/rival-delta fields
 * a generator should populate. This module adds GENERATOR-ONLY metadata
 * (organization family taxonomy, Scale descriptive bands, a Scale
 * resource-multiplier curve for `reward-estimator.js`) without touching
 * or replacing any canonical Faction field.
 *
 * Also confirmed: the canonical Faction record has no `allies`/`enemies`
 * array — only per-actor relationship rows carry a `relationshipType`
 * (`known/member/enemy/patron/founder/ally/neutral/other`). Ally/enemy
 * generation therefore lives in `faction-relationship-draft.js` as an
 * explicit draft concept, never invented here.
 */

// --- canonical SWSE organization families -------------------------------
// Every generator Faction archetype (Phase 8D-2's ~20 archetypes) maps
// into exactly one of these. This taxonomy is generator metadata; it
// does NOT replace or constrain FactionRegistryService's own free-text
// `type` field, which stays whatever the GM/generator writes to it.
export const ORGANIZATION_FAMILY = Object.freeze({
  BUSINESS_PROFESSIONAL: 'business-professional',
  COMMUNITY_TRIBE: 'community-tribe',
  CRIME_SYNDICATE: 'crime-syndicate',
  ENFORCEMENT: 'enforcement',
  FORCE_TRADITION: 'force-tradition',
  GOVERNMENT_BUREAUCRACY: 'government-bureaucracy',
  MILITARY_PARAMILITARY: 'military-paramilitary',
  NOBLE_HOUSE: 'noble-house',
  RELIGION: 'religion'
});

/**
 * Generator-flavor archetype id -> canonical SWSE family. Phase 8D-2
 * will use this to bias jobDefaults/favored-job-type sensibly; kept as
 * one shared mapping table rather than duplicated per archetype.
 */
export const FACTION_ARCHETYPE_FAMILY = Object.freeze({
  government: ORGANIZATION_FAMILY.GOVERNMENT_BUREAUCRACY,
  military: ORGANIZATION_FAMILY.MILITARY_PARAMILITARY,
  law_enforcement: ORGANIZATION_FAMILY.ENFORCEMENT,
  intelligence: ORGANIZATION_FAMILY.GOVERNMENT_BUREAUCRACY,
  resistance: ORGANIZATION_FAMILY.MILITARY_PARAMILITARY,
  criminal_syndicate: ORGANIZATION_FAMILY.CRIME_SYNDICATE,
  street_gang: ORGANIZATION_FAMILY.CRIME_SYNDICATE,
  pirates: ORGANIZATION_FAMILY.CRIME_SYNDICATE,
  smuggler_network: ORGANIZATION_FAMILY.CRIME_SYNDICATE,
  corporation: ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL,
  guild: ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL,
  mercenary: ORGANIZATION_FAMILY.MILITARY_PARAMILITARY,
  bounty_hunters: ORGANIZATION_FAMILY.CRIME_SYNDICATE,
  noble_house: ORGANIZATION_FAMILY.NOBLE_HOUSE,
  force_order: ORGANIZATION_FAMILY.FORCE_TRADITION,
  research: ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL,
  humanitarian: ORGANIZATION_FAMILY.COMMUNITY_TRIBE,
  clan: ORGANIZATION_FAMILY.COMMUNITY_TRIBE,
  droid_collective: ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL,
  secret_society: ORGANIZATION_FAMILY.CRIME_SYNDICATE
});

function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
}

// --- Organization Scale (1-20): resources/influence, NOT membership -----
// Descriptive metadata only, sourced from the SWSE organization-scale
// reference the design phase reviewed. Must never be read as "number of
// members" — it expresses sphere of influence/resources.
export const SCALE_BANDS = Object.freeze([
  { min: 1, max: 1, label: 'Small Localized Group' },
  { min: 2, max: 2, label: 'Larger Localized Group' },
  { min: 3, max: 3, label: 'City Area' },
  { min: 4, max: 4, label: 'Small City Faction' },
  { min: 5, max: 5, label: 'Larger City Faction' },
  { min: 6, max: 6, label: 'Citywide' },
  { min: 7, max: 7, label: 'Citywide (Larger)' },
  { min: 8, max: 8, label: 'Regional / National' },
  { min: 9, max: 9, label: 'Planetary' },
  { min: 10, max: 10, label: 'Multiple Planets' },
  { min: 11, max: 11, label: 'Systemwide' },
  { min: 12, max: 12, label: 'Multiple Systems' },
  { min: 13, max: 13, label: 'Sector' },
  { min: 14, max: 14, label: 'Multiple Sectors' },
  { min: 15, max: 15, label: 'Galactic Region' },
  { min: 16, max: 16, label: 'Multiple Galactic Regions' },
  { min: 17, max: 17, label: 'Partial Galactic' },
  { min: 18, max: 18, label: 'Galactic' },
  { min: 19, max: 19, label: 'Intergalactic' },
  { min: 20, max: 20, label: 'Entire Galaxy' }
]);

/** Descriptive label for a Faction Scale value (clamped to 1-20). */
export function describeScale(scale) {
  const value = clampScale(scale);
  return SCALE_BANDS.find((band) => value >= band.min && value <= band.max)?.label || 'Unknown Scale';
}

// --- Scale -> resource multiplier curve (reward-estimator.js input) -----
// Centralized, configurable economy tuning constants — NOT an official
// SWSE combat/economy rule, only this generator's payout curve. Per the
// phase spec: 1-4 sharply reduced, 13+ a meaningful positive breakpoint,
// 17+ exceptional. Kept in one place so later balancing never requires
// rewriting business logic elsewhere.
export const SCALE_RESOURCE_MULTIPLIER_BANDS = Object.freeze([
  { min: 1, max: 4, multiplier: 0.50 },
  { min: 5, max: 7, multiplier: 0.70 },
  { min: 8, max: 10, multiplier: 0.90 },
  { min: 11, max: 12, multiplier: 1.00 },
  { min: 13, max: 14, multiplier: 1.35 },
  { min: 15, max: 16, multiplier: 1.60 },
  { min: 17, max: 18, multiplier: 1.90 },
  { min: 19, max: 20, multiplier: 2.20 }
]);

/** Resource multiplier for a Faction of the given Scale (clamped 1-20). */
export function scaleResourceMultiplier(scale) {
  const value = clampScale(scale);
  const band = SCALE_RESOURCE_MULTIPLIER_BANDS.find((entry) => value >= entry.min && value <= entry.max);
  return band ? band.multiplier : 1.0;
}

// --- non-Faction issuer resource categories ------------------------------
// An ordinary individual/organization issuing a Job is NOT a canonical
// Faction and is never assigned a Scale — these are separate, smaller
// resource categories `reward-estimator.js` reads instead of Scale.
export const ISSUER_TYPE = Object.freeze({
  ORDINARY_INDIVIDUAL: 'ordinary-individual',
  WEALTHY_INDIVIDUAL: 'wealthy-individual',
  SMALL_ORGANIZATION: 'small-organization',
  FACTION: 'faction'
});

/**
 * Fixed resource multipliers for the non-Faction issuer types.
 * `ISSUER_TYPE.FACTION` deliberately has NO entry here — a Faction
 * issuer's multiplier always comes from `scaleResourceMultiplier(scale)`
 * instead, never a flat constant.
 */
export const ISSUER_TYPE_RESOURCE_MULTIPLIER = Object.freeze({
  [ISSUER_TYPE.ORDINARY_INDIVIDUAL]: 0.40,
  [ISSUER_TYPE.WEALTHY_INDIVIDUAL]: 0.70,
  [ISSUER_TYPE.SMALL_ORGANIZATION]: 0.75
});

// --- relationship/standing: a SMALL generosity adjustment ----------------
// Organization Score (standing) is conceptually distinct from Scale
// (resources) — see reward-estimator.js's own header comment. This
// bounded adjustment is intentionally small so a disliked Scale-18
// government never reads as poor, and a beloved Scale-2 gang never reads
// as wealthy. `hostile` resolves to `null`, meaning "the caller should
// not generate a normal Job at all for this relationship," not a
// multiplier.
export const RELATIONSHIP_REWARD_ADJUSTMENT = Object.freeze({
  hostile: null,
  poor: 0.90,
  neutral: 1.00,
  good: 1.05,
  excellent: 1.10
});
