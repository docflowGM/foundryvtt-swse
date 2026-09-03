/**
 * PHASE 8D-2 foundation — faction-name component pools for
 * `names/faction-name-generator.js`.
 *
 * Confirmed by reconnaissance: `organization-metadata.js`'s
 * `ORGANIZATION_FAMILY` (9 canonical families) already exists and is
 * reused here verbatim — this module does NOT invent a second family
 * taxonomy. `FACTION_TYPE_NOUNS_BY_FAMILY` maps each family to a small
 * pool of organization-type nouns that read naturally for that family
 * ("Syndicate" for crime, "Directorate" for government, ...); combined
 * with a shared `FACTION_NAME_ROOTS` pool and an optional
 * `FACTION_NAME_DESCRIPTORS` adjective, this gives genuine per-family
 * variety from a small, reviewable set rather than hundreds of
 * hand-written full faction names.
 */

import { ORGANIZATION_FAMILY } from '../organization-metadata.js';

export const FACTION_NAME_ROOTS = Object.freeze([
  { value: 'Kestral', weight: 3, tags: [] },
  { value: 'Vantor', weight: 3, tags: [] },
  { value: 'Dresh', weight: 2, tags: [] },
  { value: 'Halcyon', weight: 3, tags: [] },
  { value: 'Ossik', weight: 2, tags: [] },
  { value: 'Merrivale', weight: 2, tags: [] },
  { value: 'Talon', weight: 3, tags: [] },
  { value: 'Corvane', weight: 3, tags: [] },
  { value: 'Brael', weight: 2, tags: [] },
  { value: 'Ashworth', weight: 2, tags: [] },
  { value: 'Nyrath', weight: 2, tags: [] },
  { value: 'Solvane', weight: 2, tags: [] },
  { value: 'Draxis', weight: 3, tags: [] },
  { value: 'Farrow', weight: 2, tags: [] },
  { value: 'Kessik', weight: 2, tags: [] },
  { value: 'Voss', weight: 3, tags: [] },
  { value: 'Renwick', weight: 2, tags: [] },
  { value: 'Marrow', weight: 2, tags: [] },
  { value: 'Ithoria', weight: 2, tags: [] },
  { value: 'Blackreef', weight: 2, tags: [] }
]);

/** Optional adjective prefixed before the type noun (e.g. "Iron Syndicate"). Rolled ~40% of the time — see generator. */
export const FACTION_NAME_DESCRIPTORS = Object.freeze([
  { value: 'Iron', weight: 3, tags: ['military', 'aggressive'] },
  { value: 'Crimson', weight: 3, tags: ['aggressive', 'criminal'] },
  { value: 'Shadow', weight: 3, tags: ['mysterious', 'criminal'] },
  { value: 'Golden', weight: 2, tags: ['noble', 'business'] },
  { value: 'Silver', weight: 2, tags: ['business', 'noble'] },
  { value: 'Obsidian', weight: 2, tags: ['mysterious', 'military'] },
  { value: 'Free', weight: 3, tags: ['community', 'military'] },
  { value: 'United', weight: 2, tags: ['government', 'community'] },
  { value: 'True', weight: 2, tags: ['religion', 'force'] },
  { value: 'Ashen', weight: 2, tags: ['mysterious', 'military'] },
  { value: 'Hidden', weight: 2, tags: ['criminal', 'mysterious'] },
  { value: 'Twin', weight: 2, tags: ['business', 'noble'] }
]);

export const FACTION_TYPE_NOUNS_BY_FAMILY = Object.freeze({
  [ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL]: Object.freeze([
    { value: 'Consortium', weight: 3 }, { value: 'Combine', weight: 3 },
    { value: 'Trust', weight: 2 }, { value: 'Holdings', weight: 3 },
    { value: 'Guild', weight: 3 }, { value: 'Exchange', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.COMMUNITY_TRIBE]: Object.freeze([
    { value: 'Clan', weight: 4 }, { value: 'Tribe', weight: 3 },
    { value: 'Kinship', weight: 2 }, { value: 'Circle', weight: 2 },
    { value: 'Gathering', weight: 2 }, { value: 'Kindred', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.CRIME_SYNDICATE]: Object.freeze([
    { value: 'Syndicate', weight: 4 }, { value: 'Cartel', weight: 3 },
    { value: 'Ring', weight: 2 }, { value: 'Network', weight: 3 },
    { value: 'Brotherhood', weight: 2 }, { value: 'Underworld', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.ENFORCEMENT]: Object.freeze([
    { value: 'Watch', weight: 3 }, { value: 'Constabulary', weight: 2 },
    { value: 'Marshals', weight: 3 }, { value: 'Enforcers', weight: 2 },
    { value: 'Peacekeepers', weight: 2 }, { value: 'Guard', weight: 3 }
  ]),
  [ORGANIZATION_FAMILY.FORCE_TRADITION]: Object.freeze([
    { value: 'Order', weight: 4 }, { value: 'Circle', weight: 2 },
    { value: 'Covenant', weight: 2 }, { value: 'Enclave', weight: 3 },
    { value: 'Path', weight: 2 }, { value: 'Conclave', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.GOVERNMENT_BUREAUCRACY]: Object.freeze([
    { value: 'Directorate', weight: 3 }, { value: 'Ministry', weight: 3 },
    { value: 'Bureau', weight: 2 }, { value: 'Council', weight: 3 },
    { value: 'Authority', weight: 2 }, { value: 'Commission', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.MILITARY_PARAMILITARY]: Object.freeze([
    { value: 'Legion', weight: 3 }, { value: 'Battalion', weight: 2 },
    { value: 'Vanguard', weight: 3 }, { value: 'Brigade', weight: 2 },
    { value: 'Militia', weight: 3 }, { value: 'Regiment', weight: 2 }
  ]),
  [ORGANIZATION_FAMILY.NOBLE_HOUSE]: Object.freeze([
    { value: 'House', weight: 5 }, { value: 'Line', weight: 2 },
    { value: 'Dynasty', weight: 2 }, { value: 'Lineage', weight: 1 }
  ]),
  [ORGANIZATION_FAMILY.RELIGION]: Object.freeze([
    { value: 'Faith', weight: 3 }, { value: 'Congregation', weight: 2 },
    { value: 'Covenant', weight: 2 }, { value: 'Sanctum', weight: 2 },
    { value: 'Communion', weight: 2 }, { value: 'Devout', weight: 1 }
  ])
});
