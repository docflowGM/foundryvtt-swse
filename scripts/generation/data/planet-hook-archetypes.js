/**
 * PHASE 8D-3A production — SUGGEST-tier archetype tag catalogs for
 * `planets/planet-hooks.js`.
 *
 * Neither catalog invents a new vocabulary: `FACTION_ARCHETYPE_TAGS`
 * is exactly `organization-metadata.js`'s existing 20
 * `FACTION_ARCHETYPE_FAMILY` keys (Phase 8D-2's Faction archetypes),
 * each carrying its own canonical `ORGANIZATION_FAMILY` value plus a
 * couple of natural extra free-text tags so preference-matching
 * against a planet's full tag set (world class + economy + government
 * + hazards/traits) has more than one thing to match on.
 * `JOB_ARCHETYPE_TAGS` is exactly `job-archetype-metadata.js`'s
 * existing 14 mission types (itself reused from
 * `objective-template.js`), tagged the same way.
 *
 * These are SUGGEST-tier only -- a planet draft's
 * `suggestedFactionArchetypeTags`/`suggestedJobArchetypeTags` are
 * narrative hints for a GM (or a future Faction/Job generator) to
 * consider, never an actual Faction or Job created here.
 */

import { ORGANIZATION_FAMILY } from '../organization-metadata.js';

export const FACTION_ARCHETYPE_TAGS = Object.freeze([
  { value: 'government', tags: [ORGANIZATION_FAMILY.GOVERNMENT_BUREAUCRACY, 'urban'] },
  { value: 'military', tags: [ORGANIZATION_FAMILY.MILITARY_PARAMILITARY, 'military'] },
  { value: 'law_enforcement', tags: [ORGANIZATION_FAMILY.ENFORCEMENT, 'urban'] },
  { value: 'intelligence', tags: [ORGANIZATION_FAMILY.GOVERNMENT_BUREAUCRACY, 'mysterious'] },
  { value: 'resistance', tags: [ORGANIZATION_FAMILY.MILITARY_PARAMILITARY, 'occupied', 'rebellious'] },
  { value: 'criminal_syndicate', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'black-market'] },
  { value: 'street_gang', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'urban'] },
  { value: 'pirates', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'frontier', 'void'] },
  { value: 'smuggler_network', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'trade', 'black-market'] },
  { value: 'corporation', tags: [ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL, 'trade', 'manufacturing'] },
  { value: 'guild', tags: [ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL, 'trade'] },
  { value: 'mercenary', tags: [ORGANIZATION_FAMILY.MILITARY_PARAMILITARY, 'frontier'] },
  { value: 'bounty_hunters', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'frontier'] },
  { value: 'noble_house', tags: [ORGANIZATION_FAMILY.NOBLE_HOUSE, 'urban'] },
  { value: 'force_order', tags: [ORGANIZATION_FAMILY.FORCE_TRADITION, 'mysterious', 'sacred'] },
  { value: 'research', tags: [ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL, 'research', 'technology'] },
  { value: 'humanitarian', tags: [ORGANIZATION_FAMILY.COMMUNITY_TRIBE, 'rural'] },
  { value: 'clan', tags: [ORGANIZATION_FAMILY.COMMUNITY_TRIBE, 'frontier', 'rural'] },
  { value: 'droid_collective', tags: [ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL, 'technology', 'industrial'] },
  { value: 'secret_society', tags: [ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'mysterious'] }
]);

export const JOB_ARCHETYPE_TAGS = Object.freeze([
  { value: 'rescue', tags: ['military', 'urban', 'frontier'] },
  { value: 'extraction', tags: ['military', 'criminal', 'occupied'] },
  { value: 'delivery', tags: ['trade', 'urban'] },
  { value: 'sabotage', tags: ['military', 'industrial', 'occupied'] },
  { value: 'recovery', tags: ['mysterious', 'ancient', 'research'] },
  { value: 'investigation', tags: ['mysterious', 'government-bureaucracy', 'urban'] },
  { value: 'heist', tags: ['criminal', 'black-market', 'urban'] },
  { value: 'escort', tags: ['trade', 'frontier'] },
  { value: 'bounty', tags: ['criminal', 'enforcement', 'frontier'] },
  { value: 'hunt', tags: ['wildlife', 'frontier', 'hazard'] },
  { value: 'assault', tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'smuggling', tags: ['black-market', 'trade', 'criminal'] },
  { value: 'infiltration', tags: ['criminal', 'mysterious', 'government-bureaucracy'] },
  { value: 'boarding', tags: ['void', 'trade', 'criminal'] }
]);
