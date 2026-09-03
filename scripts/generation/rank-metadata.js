/**
 * PHASE 8D-1 addendum — normalized rank / command-tier metadata.
 *
 * HARD RULE (addendum §6, restated everywhere this matters): rank is
 * semantic/organizational metadata, NEVER a character-level or Challenge
 * Level proxy. SWSE rank can reflect social status, professional
 * responsibility, command authority, specialization, or a noncombat
 * position — a superior officer may be mechanically lower level than
 * characters beneath them. `NORMALIZED_COMMAND_TIER` and
 * `RANK_TARGET_IMPORTANCE` below carry no level/CL field of any kind,
 * by design, and nothing in this module computes or suggests one.
 * Mission difficulty (`objective-economy.js`) and party capability
 * (`party-capability.js`) are what determine encounter danger — rank
 * only ever feeds role/profile affinity, command structure, and
 * narrative/reward importance.
 *
 * This module is a normalized VOCABULARY other Factions/organizations
 * can map their own display titles onto — it does not force every
 * organization to use military terminology (addendum §8).
 */

/**
 * Normalized functional command tiers, roughly least to most authority.
 * Deliberately organization-neutral (no "Sergeant"/"Captain" baked in
 * here) — see `MILITARY_RANK_TIER_MAP` and the non-military example maps
 * below for how real display titles resolve onto these tiers.
 */
export const COMMAND_TIER = Object.freeze({
  NONE: 'none',
  RANK_AND_FILE: 'rank-and-file',
  FIRETEAM_LEADERSHIP: 'fireteam-leadership',
  SQUAD_COMMAND: 'squad-command',
  SPECIALIST: 'specialist',
  SENIOR_SPECIALIST: 'senior-specialist',
  JUNIOR_COMMAND: 'junior-command',
  TACTICAL_COMMAND: 'tactical-command',
  OPERATIONAL_COMMAND: 'operational-command',
  STRATEGIC_COMMAND: 'strategic-command'
});

export const COMMAND_TIERS = Object.freeze(Object.values(COMMAND_TIER));

export function isCommandTier(value) {
  return COMMAND_TIERS.includes(value);
}

/**
 * Example military-flavored display rank -> normalized tier map. This is
 * a DEFAULT/EXAMPLE, not a requirement that every Faction use these
 * exact labels — a generator archetype supplies its own map (see the
 * `*_RANK_TIER_MAP` examples below) and any Faction can define a fully
 * custom one; only the normalized tier on the right is what future
 * opposition/profile-affinity logic is expected to consume.
 */
export const MILITARY_RANK_TIER_MAP = Object.freeze({
  Recruit: COMMAND_TIER.RANK_AND_FILE,
  'Private / Trooper': COMMAND_TIER.RANK_AND_FILE,
  Corporal: COMMAND_TIER.FIRETEAM_LEADERSHIP,
  Sergeant: COMMAND_TIER.SQUAD_COMMAND,
  'Warrant Officer': COMMAND_TIER.SPECIALIST,
  'Chief Warrant Officer': COMMAND_TIER.SENIOR_SPECIALIST,
  'Master Warrant Officer': COMMAND_TIER.SENIOR_SPECIALIST,
  'Second Lieutenant': COMMAND_TIER.JUNIOR_COMMAND,
  'First Lieutenant': COMMAND_TIER.JUNIOR_COMMAND,
  Captain: COMMAND_TIER.TACTICAL_COMMAND,
  Commander: COMMAND_TIER.TACTICAL_COMMAND,
  Major: COMMAND_TIER.OPERATIONAL_COMMAND,
  Colonel: COMMAND_TIER.OPERATIONAL_COMMAND,
  'General / Marshal': COMMAND_TIER.STRATEGIC_COMMAND
});

/** Example non-military display-rank maps (addendum §8). Not exhaustive. */
export const CRIME_SYNDICATE_RANK_TIER_MAP = Object.freeze({
  Associate: COMMAND_TIER.RANK_AND_FILE,
  Enforcer: COMMAND_TIER.FIRETEAM_LEADERSHIP,
  Lieutenant: COMMAND_TIER.SQUAD_COMMAND,
  Captain: COMMAND_TIER.JUNIOR_COMMAND,
  Underboss: COMMAND_TIER.OPERATIONAL_COMMAND,
  Boss: COMMAND_TIER.STRATEGIC_COMMAND
});

export const PIRATE_RANK_TIER_MAP = Object.freeze({
  Crew: COMMAND_TIER.RANK_AND_FILE,
  Veteran: COMMAND_TIER.FIRETEAM_LEADERSHIP,
  Mate: COMMAND_TIER.SQUAD_COMMAND,
  Boatswain: COMMAND_TIER.JUNIOR_COMMAND,
  Captain: COMMAND_TIER.TACTICAL_COMMAND,
  Commodore: COMMAND_TIER.STRATEGIC_COMMAND
});

export const NOBLE_SECURITY_RANK_TIER_MAP = Object.freeze({
  Guardsman: COMMAND_TIER.RANK_AND_FILE,
  Sergeant: COMMAND_TIER.SQUAD_COMMAND,
  'Captain of the Guard': COMMAND_TIER.TACTICAL_COMMAND,
  Marshal: COMMAND_TIER.STRATEGIC_COMMAND
});

export const CLAN_RANK_TIER_MAP = Object.freeze({
  Member: COMMAND_TIER.RANK_AND_FILE,
  Warrior: COMMAND_TIER.FIRETEAM_LEADERSHIP,
  Veteran: COMMAND_TIER.SQUAD_COMMAND,
  Champion: COMMAND_TIER.SENIOR_SPECIALIST,
  'Lieutenant-equivalent': COMMAND_TIER.JUNIOR_COMMAND,
  'Clan Leader': COMMAND_TIER.STRATEGIC_COMMAND
});

/** Phase 8D-2 addition: corporate/guild-flavored rank ladder (`corporation`/`guild` archetypes). */
export const CORPORATE_RANK_TIER_MAP = Object.freeze({
  Associate: COMMAND_TIER.RANK_AND_FILE,
  'Senior Associate': COMMAND_TIER.FIRETEAM_LEADERSHIP,
  'Team Lead': COMMAND_TIER.SQUAD_COMMAND,
  Manager: COMMAND_TIER.JUNIOR_COMMAND,
  Director: COMMAND_TIER.TACTICAL_COMMAND,
  'Vice President': COMMAND_TIER.OPERATIONAL_COMMAND,
  'Chief Executive': COMMAND_TIER.STRATEGIC_COMMAND
});

/** Phase 8D-2 addition: Force-tradition rank ladder (`force_order` archetype). Titles are deliberately generic, never a real canonical Order's own titles. */
export const FORCE_TRADITION_RANK_TIER_MAP = Object.freeze({
  Initiate: COMMAND_TIER.RANK_AND_FILE,
  Adept: COMMAND_TIER.FIRETEAM_LEADERSHIP,
  'Knight-equivalent': COMMAND_TIER.SQUAD_COMMAND,
  'Master-equivalent': COMMAND_TIER.SENIOR_SPECIALIST,
  'Council Member': COMMAND_TIER.OPERATIONAL_COMMAND,
  'Grandmaster-equivalent': COMMAND_TIER.STRATEGIC_COMMAND
});

/**
 * Generator archetype id -> its example rank-tier map, for archetypes
 * the addendum names explicitly. An archetype not listed here has no
 * default map; callers supply one or fall back to
 * `MILITARY_RANK_TIER_MAP`.
 */
export const ARCHETYPE_RANK_TIER_MAP = Object.freeze({
  military: MILITARY_RANK_TIER_MAP,
  'law-enforcement': MILITARY_RANK_TIER_MAP,
  'criminal-syndicate': CRIME_SYNDICATE_RANK_TIER_MAP,
  pirates: PIRATE_RANK_TIER_MAP,
  'noble-house': NOBLE_SECURITY_RANK_TIER_MAP,
  clan: CLAN_RANK_TIER_MAP,
  corporation: CORPORATE_RANK_TIER_MAP,
  guild: CORPORATE_RANK_TIER_MAP,
  force_order: FORCE_TRADITION_RANK_TIER_MAP
});

/**
 * Resolve a display rank string to a normalized command tier using the
 * given map (defaults to the military example map). Returns
 * `COMMAND_TIER.NONE` for an unrecognized/blank display rank — never
 * guesses.
 */
export function resolveCommandTier(displayRank, tierMap = MILITARY_RANK_TIER_MAP) {
  return tierMap?.[displayRank] ?? COMMAND_TIER.NONE;
}

/**
 * Specialist roles (addendum §9) — a Warrant-Officer-equivalent NPC
 * concept should favor these, not be assumed a combat leader.
 */
export const SPECIALIST_ROLES = Object.freeze([
  'technician', 'slicer', 'engineer', 'medic', 'pilot', 'sensor-operator',
  'intelligence-specialist', 'communications-specialist', 'quartermaster',
  'ordnance-specialist', 'droid-specialist', 'investigator'
]);

/**
 * Semantic target-importance vocabulary (addendum §14) — how significant
 * a named NPC concept is to its organization/story, independent of
 * mechanical level. May later influence rescue rewards, bounty values,
 * how much opposition guards the target, Faction consequence magnitude,
 * and briefing language — never used to imply a level/CL.
 */
export const RANK_TARGET_IMPORTANCE = Object.freeze({
  ORDINARY: 'ordinary',
  LOCAL: 'local',
  SIGNIFICANT: 'significant',
  MAJOR: 'major',
  STRATEGIC: 'strategic'
});

export const RANK_TARGET_IMPORTANCES = Object.freeze(Object.values(RANK_TARGET_IMPORTANCE));

/**
 * Example command-tier -> target-importance guidance (addendum §14's
 * Private/Sergeant/Captain/Colonel/General progression). A caller may
 * override per-NPC (e.g. "a low-CL General can still be strategically
 * important" cuts both ways — a captured elder Sergeant with unique
 * intel can outrank this table too) — this is a DEFAULT suggestion, not
 * an enforced derivation.
 */
export const COMMAND_TIER_DEFAULT_IMPORTANCE = Object.freeze({
  [COMMAND_TIER.NONE]: RANK_TARGET_IMPORTANCE.ORDINARY,
  [COMMAND_TIER.RANK_AND_FILE]: RANK_TARGET_IMPORTANCE.ORDINARY,
  [COMMAND_TIER.FIRETEAM_LEADERSHIP]: RANK_TARGET_IMPORTANCE.LOCAL,
  [COMMAND_TIER.SQUAD_COMMAND]: RANK_TARGET_IMPORTANCE.LOCAL,
  [COMMAND_TIER.SPECIALIST]: RANK_TARGET_IMPORTANCE.LOCAL,
  [COMMAND_TIER.SENIOR_SPECIALIST]: RANK_TARGET_IMPORTANCE.SIGNIFICANT,
  [COMMAND_TIER.JUNIOR_COMMAND]: RANK_TARGET_IMPORTANCE.SIGNIFICANT,
  [COMMAND_TIER.TACTICAL_COMMAND]: RANK_TARGET_IMPORTANCE.SIGNIFICANT,
  [COMMAND_TIER.OPERATIONAL_COMMAND]: RANK_TARGET_IMPORTANCE.MAJOR,
  [COMMAND_TIER.STRATEGIC_COMMAND]: RANK_TARGET_IMPORTANCE.STRATEGIC
});
