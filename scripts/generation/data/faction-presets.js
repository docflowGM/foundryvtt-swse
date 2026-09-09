/**
 * PHASE 8D-3B production — named Faction presets for
 * `factions/faction-bundle.js`'s `createProceduralFactionDraft({ presetId })`.
 *
 * Mirrors `data/planet-presets.js` exactly: a preset is NOT a bespoke
 * generator and owns no pick logic of its own — it is only a bundle of
 * SOFT preference tags (`preferTags`, fed into every existing soft-
 * preference pick the Faction bundle already composes: institutional
 * character, leadership structure, goals, internal problems, resource
 * flavors, name descriptor/type-noun, doctrine roles) plus the ONE
 * archetype id it maps to 1:1. `archetype` reuses
 * `organization-metadata.js`'s EXISTING 20
 * `FACTION_ARCHETYPE_FAMILY` keys verbatim — 20 presets means 20 small
 * data entries pointing at the 20 archetypes that already exist, never
 * a second archetype taxonomy.
 *
 * `id` is the STABLE identifier persisted on a generated draft's own
 * `provenance.presetId`, matching `planet-presets.js`'s same discipline.
 * `membershipPolicyDefault` (a `population-profile.js` `MEMBERSHIP_POLICY`
 * value) and `localityBiasOverride` (0-1, or `null` to defer to
 * `recruitment-profile.js`'s own `defaultLocalityBiasForArchetype()`)
 * are both OPTIONAL soft defaults a preset may set — never a hard
 * requirement, and always overridable by an explicit caller argument.
 */

export const FACTION_PRESETS = Object.freeze([
  {
    id: 'government-agency',
    label: 'Government Agency',
    description: 'A formal arm of planetary or regional government -- ministries, civil administration, or a governing council\'s own bureaucracy.',
    archetype: 'government',
    preferTags: ['government-bureaucracy', 'urban'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'military-command',
    label: 'Military Command',
    description: 'A standing military force -- a planetary defense force, garrison command, or a fleet element with its own chain of command.',
    archetype: 'military',
    preferTags: ['military-paramilitary', 'enforcement'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'local-enforcement-bureau',
    label: 'Local Enforcement Bureau',
    description: 'Police, customs, or planetary security -- the visible face of law and order in a city or region.',
    archetype: 'law_enforcement',
    preferTags: ['enforcement', 'security', 'urban'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'intelligence-network',
    label: 'Intelligence Network',
    description: 'A covert intelligence service or agency -- espionage, counterintelligence, and information brokering behind a legitimate front.',
    archetype: 'intelligence',
    preferTags: ['government-bureaucracy', 'mysterious'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'resistance-cell',
    label: 'Resistance Cell',
    description: 'An underground movement opposing an occupying force or an oppressive local regime.',
    archetype: 'resistance',
    preferTags: ['military-paramilitary', 'community-tribe'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'crime-syndicate',
    label: 'Crime Syndicate',
    description: 'An organized criminal enterprise -- protection rackets, smuggling, black-market trade, and territorial control.',
    archetype: 'criminal_syndicate',
    preferTags: ['crime-syndicate', 'black-market'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'street-gang',
    label: 'Street Gang',
    description: 'A small, territorial urban gang -- turf, petty rackets, and fierce local loyalty.',
    archetype: 'street_gang',
    preferTags: ['crime-syndicate', 'urban'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'pirate-crew',
    label: 'Pirate Crew',
    description: 'A raiding crew operating out of a hidden base or a single well-armed ship, preying on shipping lanes.',
    archetype: 'pirates',
    preferTags: ['crime-syndicate', 'frontier'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'smuggler-network',
    label: 'Smuggler Network',
    description: 'A loose network of runners and fixers moving contraband, refugees, or embargoed goods across a region.',
    archetype: 'smuggler_network',
    preferTags: ['crime-syndicate', 'trade', 'frontier'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'corporation',
    label: 'Corporation',
    description: 'A commercial enterprise -- manufacturing, trade, or resource extraction organized as a corporate hierarchy.',
    archetype: 'corporation',
    preferTags: ['business-professional', 'trade'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'merchant-guild',
    label: 'Merchant / Professional Guild',
    description: 'A trade or professional guild -- shared standards, mutual protection, and collective bargaining for its members.',
    archetype: 'guild',
    preferTags: ['business-professional', 'trade'],
    membershipPolicyDefault: 'preferred',
    localityBiasOverride: null
  },
  {
    id: 'mercenary-company',
    label: 'Mercenary Company',
    description: 'A professional company-for-hire -- contracts, campaigns, and a command structure built around getting paid.',
    archetype: 'mercenary',
    preferTags: ['military-paramilitary', 'business-professional'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'bounty-hunter-consortium',
    label: 'Bounty Hunter Consortium',
    description: 'A loose guild or clearinghouse of independent bounty hunters sharing contracts, contacts, and reputation.',
    archetype: 'bounty_hunters',
    preferTags: ['crime-syndicate', 'frontier'],
    membershipPolicyDefault: 'preferred',
    localityBiasOverride: null
  },
  {
    id: 'noble-house',
    label: 'Noble House',
    description: 'An aristocratic house -- inherited title, household staff and guards, and a web of social/political obligations.',
    archetype: 'noble_house',
    preferTags: ['noble-house'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'force-tradition',
    label: 'Force Tradition / Order',
    description: 'An organized Force tradition -- a school, order, or lineage passing down its own teachings and internal hierarchy.',
    archetype: 'force_order',
    preferTags: ['force-tradition', 'mysterious'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'research-organization',
    label: 'Research Organization',
    description: 'An institute, laboratory, or university department pursuing a specific field of inquiry.',
    archetype: 'research',
    preferTags: ['research', 'education'],
    membershipPolicyDefault: 'preferred',
    localityBiasOverride: null
  },
  {
    id: 'humanitarian-relief',
    label: 'Humanitarian Relief Organization',
    description: 'A relief, aid, or charitable organization operating in a region that needs it -- refugees, disaster response, or public health.',
    archetype: 'humanitarian',
    preferTags: ['community-tribe', 'medical'],
    membershipPolicyDefault: 'open',
    localityBiasOverride: null
  },
  {
    id: 'frontier-clan',
    label: 'Frontier Clan / Coalition',
    description: 'A kinship-based clan or settler coalition bound by tradition, shared ancestry, or shared hardship on a frontier world.',
    archetype: 'clan',
    preferTags: ['community-tribe', 'frontier'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  },
  {
    id: 'droid-collective',
    label: 'Droid Collective',
    description: 'A collective of droids operating with unusual autonomy -- shared purpose, salvaged resources, and a droid-only membership.',
    archetype: 'droid_collective',
    preferTags: ['droids', 'technology'],
    membershipPolicyDefault: 'droid-only',
    localityBiasOverride: 0
  },
  {
    id: 'secret-society',
    label: 'Secret Society',
    description: 'A hidden society operating behind a mundane public front -- initiation, secrecy, and a hidden agenda few outsiders suspect.',
    archetype: 'secret_society',
    preferTags: ['crime-syndicate', 'mysterious'],
    membershipPolicyDefault: 'restricted',
    localityBiasOverride: null
  }
]);

const FACTION_PRESET_IDS = Object.freeze(FACTION_PRESETS.map((preset) => preset.id));

/** True if `value` is a known Faction preset id (matches `planet-presets.js`'s `isPlanetPresetId()` naming convention). */
export function isFactionPresetId(value) {
  return FACTION_PRESET_IDS.includes(value);
}

/** Look up one preset by id, or `null` for an unknown/omitted id -- never throws (graceful unknown-preset handling, matching `planet-presets.js`'s own `getPlanetPreset()` contract). */
export function getFactionPreset(id) {
  const clean = String(id || '').trim();
  if (!clean) return null;
  return FACTION_PRESETS.find((preset) => preset.id === clean) || null;
}

/**
 * Look up the ONE preset mapped to a given archetype id (the mapping is
 * 1:1 by construction -- every one of the 20 `FACTION_ARCHETYPE_FAMILY`
 * archetypes has exactly one preset above). Used by
 * `factions/faction-bundle.js` to apply a sensible preset's
 * `preferTags`/`membershipPolicyDefault`/`localityBiasOverride` even
 * when a caller picked an archetype directly rather than an explicit
 * `presetId` -- never a second archetype->default table.
 */
export function getFactionPresetForArchetype(archetype) {
  const clean = String(archetype || '').trim();
  if (!clean) return null;
  return FACTION_PRESETS.find((preset) => preset.archetype === clean) || null;
}
