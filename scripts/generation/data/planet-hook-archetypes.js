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

import { ORGANIZATION_FAMILY, FACTION_ARCHETYPE_FAMILY } from '../organization-metadata.js';
import { JOB_ARCHETYPE_METADATA } from '../jobs/job-archetype-metadata.js';

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

// PHASE 8D-3A R2 fix 9: self-check at module load, the same discipline
// `data/planet-region-bias.js` established -- these two manifests claim
// (in this file's own header doc) to be "exactly" their canonical
// authorities' key sets (`organization-metadata.js`'s
// `FACTION_ARCHETYPE_FAMILY`, `job-archetype-metadata.js`'s
// `JOB_ARCHETYPE_METADATA`), but nothing previously verified that claim
// -- the two manifests could silently drift apart (an archetype added to
// one, forgotten in the other) with no error, only a quietly-incomplete
// suggestion pool. Throws immediately on a mismatch in EITHER direction
// (missing here, or extra/stale here) so drift is caught at load time,
// not discovered later as "why does this archetype never get suggested."
{
  const factionValues = new Set(FACTION_ARCHETYPE_TAGS.map((e) => e.value));
  const factionAuthorityKeys = new Set(Object.keys(FACTION_ARCHETYPE_FAMILY));
  for (const key of factionAuthorityKeys) {
    if (!factionValues.has(key)) throw new Error(`planet-hook-archetypes.js: FACTION_ARCHETYPE_TAGS is missing an entry for FACTION_ARCHETYPE_FAMILY key "${key}"`);
  }
  for (const value of factionValues) {
    if (!factionAuthorityKeys.has(value)) throw new Error(`planet-hook-archetypes.js: FACTION_ARCHETYPE_TAGS has a stale/unrecognized entry "${value}" not present in FACTION_ARCHETYPE_FAMILY`);
  }
  for (const entry of FACTION_ARCHETYPE_TAGS) {
    const expectedFamily = FACTION_ARCHETYPE_FAMILY[entry.value];
    if (expectedFamily && !entry.tags.includes(expectedFamily)) {
      throw new Error(`planet-hook-archetypes.js: FACTION_ARCHETYPE_TAGS entry "${entry.value}" must carry its canonical ORGANIZATION_FAMILY tag "${expectedFamily}"`);
    }
  }

  const jobValues = new Set(JOB_ARCHETYPE_TAGS.map((e) => e.value));
  const jobAuthorityKeys = new Set(Object.keys(JOB_ARCHETYPE_METADATA));
  for (const key of jobAuthorityKeys) {
    if (!jobValues.has(key)) throw new Error(`planet-hook-archetypes.js: JOB_ARCHETYPE_TAGS is missing an entry for JOB_ARCHETYPE_METADATA key "${key}"`);
  }
  for (const value of jobValues) {
    if (!jobAuthorityKeys.has(value)) throw new Error(`planet-hook-archetypes.js: JOB_ARCHETYPE_TAGS has a stale/unrecognized entry "${value}" not present in JOB_ARCHETYPE_METADATA`);
  }
}
