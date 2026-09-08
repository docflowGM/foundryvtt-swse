/**
 * PHASE 8D-1 addendum — Faction doctrine / opposition-readiness draft.
 *
 * "What kind of personnel/resources does this Faction plausibly use?" —
 * a draft-only, NONMECHANICAL description a future opposition/NPC-
 * selection phase can read. HARD RULE (addendum §10/§16): this module
 * contains NO generated combat statistics, no HP/BAB/defenses/attacks,
 * and does not select or build actual NPC statblocks. It only answers
 * what the Faction generator CAN answer (organization shape, personnel
 * variety, doctrine tags); building/selecting real opposition from real
 * NPC compendium content is explicitly deferred to a future "NPC
 * Opposition Catalog + Rank/Role Affinity" phase, which the addendum's
 * own closing note says must inventory the actual heroic/nonheroic NPC
 * library BEFORE any classification taxonomy is invented — nothing here
 * pre-empts that inventory.
 *
 * Faction Scale (`organization-metadata.js`) informs BREADTH/RESOURCES
 * here (how many distinct roles, whether elites/droids/vehicles are
 * plausible, how strong reinforcement capacity is) — it never implies
 * an NPC level or Challenge Level (addendum §11, same hard rule as
 * `rank-metadata.js`).
 */

/** Coarse plausibility bands used for droid/vehicle usage and elite/reinforcement capability. Ordinal, not numeric — never a probability or a stat. */
export const DOCTRINE_USAGE_LEVEL = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high'
});

const DOCTRINE_USAGE_LEVELS = Object.freeze(Object.values(DOCTRINE_USAGE_LEVEL));

function isDoctrineUsageLevel(value) {
  return DOCTRINE_USAGE_LEVELS.includes(value);
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : [];
}

/**
 * Build a Faction's nonmechanical doctrine profile. Every field is a
 * ROLE/TAG description, never a stat block or a stat-block reference —
 * `preferredProfileTags` exists so a future opposition resolver has
 * something to match against, but this module performs no matching
 * itself and knows nothing about any actual NPC compendium entry.
 */
export function createFactionDoctrineDraft({
  commonRoles = [],
  specialistRoles = [],
  leadershipRoles = [],
  droidUsage = DOCTRINE_USAGE_LEVEL.LOW,
  vehicleUsage = DOCTRINE_USAGE_LEVEL.LOW,
  eliteAvailability = DOCTRINE_USAGE_LEVEL.LOW,
  reinforcementCapability = DOCTRINE_USAGE_LEVEL.LOW,
  preferredProfileTags = [],
  environmentAffinities = [],
  doctrineTags = []
} = {}) {
  return {
    commonRoles: cleanStringArray(commonRoles),
    specialistRoles: cleanStringArray(specialistRoles),
    leadershipRoles: cleanStringArray(leadershipRoles),
    droidUsage: isDoctrineUsageLevel(droidUsage) ? droidUsage : DOCTRINE_USAGE_LEVEL.LOW,
    vehicleUsage: isDoctrineUsageLevel(vehicleUsage) ? vehicleUsage : DOCTRINE_USAGE_LEVEL.LOW,
    eliteAvailability: isDoctrineUsageLevel(eliteAvailability) ? eliteAvailability : DOCTRINE_USAGE_LEVEL.LOW,
    reinforcementCapability: isDoctrineUsageLevel(reinforcementCapability) ? reinforcementCapability : DOCTRINE_USAGE_LEVEL.LOW,
    preferredProfileTags: cleanStringArray(preferredProfileTags),
    environmentAffinities: cleanStringArray(environmentAffinities),
    doctrineTags: cleanStringArray(doctrineTags)
  };
}

/**
 * Scale-informed DEFAULT doctrine usage suggestion (addendum §11's
 * low/medium/high scale guidance) — a starting point a generator may
 * use and a GM may freely override, never an enforced derivation. Scale
 * controls what the Faction plausibly HAS; it never sets an NPC's level.
 */
export function suggestDoctrineUsageForScale(scale) {
  const value = Number(scale) || 1;
  if (value <= 4) {
    return { droidUsage: DOCTRINE_USAGE_LEVEL.LOW, vehicleUsage: DOCTRINE_USAGE_LEVEL.NONE, eliteAvailability: DOCTRINE_USAGE_LEVEL.NONE, reinforcementCapability: DOCTRINE_USAGE_LEVEL.LOW };
  }
  if (value <= 12) {
    return { droidUsage: DOCTRINE_USAGE_LEVEL.MODERATE, vehicleUsage: DOCTRINE_USAGE_LEVEL.MODERATE, eliteAvailability: DOCTRINE_USAGE_LEVEL.LOW, reinforcementCapability: DOCTRINE_USAGE_LEVEL.MODERATE };
  }
  return { droidUsage: DOCTRINE_USAGE_LEVEL.HIGH, vehicleUsage: DOCTRINE_USAGE_LEVEL.HIGH, eliteAvailability: DOCTRINE_USAGE_LEVEL.HIGH, reinforcementCapability: DOCTRINE_USAGE_LEVEL.HIGH };
}

/**
 * Preferred-statblock-roster contract (addendum §12): REFERENCES ONLY
 * to future canonical NPC-catalog entries by stable uuid, grouped by
 * role category. No stat-block mechanics are copied into this
 * structure — each entry is `{ uuid, roleTags, rankAffinity }` (see
 * addendum §13's `rankAffinity`-over-`rankRequired` preference, also
 * used by `npc-concept.js`'s `profileAffinity`). Empty by default; a
 * future NPC Opposition Catalog phase populates it after inventorying
 * real compendium content — nothing here invents that inventory.
 */
export function createFactionPreferredStatblockRoster() {
  return {
    standardProfiles: [],
    specialistProfiles: [],
    leaderProfiles: [],
    eliteProfiles: [],
    droidProfiles: [],
    vehicleProfiles: []
  };
}

/**
 * Add one profile reference to a roster category, returning a NEW
 * roster (no mutation). `entry` must carry a `uuid` — a roster entry
 * with no uuid is a contradiction (there is nothing to reference yet)
 * and is rejected rather than silently accepted.
 */
export function addFactionPreferredStatblockProfile(roster, category, entry) {
  const base = roster && typeof roster === 'object' ? roster : createFactionPreferredStatblockRoster();
  const key = `${category}Profiles`;
  if (!Object.prototype.hasOwnProperty.call(base, key)) return base;
  const uuid = String(entry?.uuid ?? '').trim();
  if (!uuid) return base;
  const normalizedEntry = { uuid, roleTags: cleanStringArray(entry.roleTags), rankAffinity: cleanStringArray(entry.rankAffinity) };
  return { ...base, [key]: [...base[key], normalizedEntry] };
}

/**
 * Structural safety check used by tests: confirms a doctrine draft (or
 * a preferred-statblock roster) carries no key that looks like
 * mechanical Actor data. Mirrors `npc-concept.js`'s
 * `hasForbiddenMechanicalFields()` guard.
 */
const FORBIDDEN_MECHANICAL_KEYS = Object.freeze([
  'hp', 'hitPoints', 'bab', 'baseAttackBonus', 'defenses', 'abilityScores',
  'skills', 'feats', 'talents', 'attacks', 'conditionTrack', 'level', 'class', 'classes'
]);

export function hasForbiddenMechanicalFields(value) {
  if (!value || typeof value !== 'object') return false;
  if (FORBIDDEN_MECHANICAL_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))) return true;
  return Object.values(value).some((child) => {
    if (Array.isArray(child)) return child.some((entry) => hasForbiddenMechanicalFields(entry));
    if (child && typeof child === 'object') return hasForbiddenMechanicalFields(child);
    return false;
  });
}
