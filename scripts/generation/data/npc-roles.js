/**
 * PHASE 8D-3B production — NPC occupation/role catalog (living NPCs).
 *
 * HARD RULE (restated from `npc-concept.js`'s own header, and the phase
 * spec's "NPC ROLE VS MECHANICS" section): a role here is a NARRATIVE
 * occupation/social-function label ("security officer", "slicer",
 * "dockmaster") — it never implies a SWSE class, level, or any
 * mechanical trait. `createGeneratedNpcConceptDraft()`/`npc-bundle.js`
 * write a picked role straight into `npc-concept.js`'s free-text `role`
 * field; nothing here or downstream ever maps a role to
 * `Class: Soldier 4` or similar.
 *
 * `tier` mirrors `faction-doctrine-draft.js`'s three role buckets
 * (`commonRoles`/`specialistRoles`/`leadershipRoles`) so the SAME pool
 * backs both a Faction's doctrine roll and a standalone/Faction-contact
 * NPC's own role roll — one role vocabulary, not two. `tier` values:
 * `'common'` (day-to-day/rank-and-file work), `'specialist'` (a
 * distinct trained profession — also cross-referenced against
 * `rank-metadata.js`'s existing `SPECIALIST_ROLES` short list, which
 * this catalog is a superset of, never a competing vocabulary),
 * `'leadership'` (a role that implies real authority/command, narrative
 * only — never a Challenge Level proxy, same hard rule as
 * `rank-metadata.js`).
 *
 * `tags` reuse the SAME two vocabularies already established elsewhere
 * in this generation ecosystem rather than inventing a third: every
 * `ORGANIZATION_FAMILY` value (`organization-metadata.js`) for
 * institutional context, plus the economy-sector-style descriptive tags
 * `data/technology-specialties.js`/`data/planet-economies.js` already
 * use (`mining`, `trade`, `urban`, `frontier`, `industrial`,
 * `criminal`, `security`, `medical`, `research`, ...). A role can (and
 * usually does) carry both an organization-family tag and one or more
 * flavor tags — this lets `weightedPickWithPreference()` softly bias a
 * role roll by EITHER a Faction's own organizationFamily OR a Location's
 * economy/environment context, using the exact same preference
 * mechanism every other Phase 8D-2/8D-3 pool already uses.
 */

export const NPC_ROLES = Object.freeze([
  // --- common / rank-and-file -------------------------------------------
  { value: 'civilian resident', weight: 3, tags: ['community-tribe', 'urban', 'rural'], tier: 'common' },
  { value: 'laborer', weight: 3, tags: ['industrial', 'mining', 'rural', 'business-professional'], tier: 'common' },
  { value: 'dockhand', weight: 2, tags: ['trade', 'urban', 'business-professional'], tier: 'common' },
  { value: 'cargo loader', weight: 2, tags: ['trade', 'industrial', 'business-professional'], tier: 'common' },
  { value: 'street vendor', weight: 2, tags: ['trade', 'urban', 'community-tribe'], tier: 'common' },
  { value: 'shopkeeper', weight: 3, tags: ['trade', 'business-professional', 'urban'], tier: 'common' },
  { value: 'merchant', weight: 3, tags: ['trade', 'business-professional'], tier: 'common' },
  { value: 'trader', weight: 2, tags: ['trade', 'business-professional', 'frontier'], tier: 'common' },
  { value: 'farmer', weight: 2, tags: ['agriculture', 'rural', 'community-tribe'], tier: 'common' },
  { value: 'rancher', weight: 2, tags: ['agriculture', 'rural', 'frontier'], tier: 'common' },
  { value: 'fisher', weight: 1, tags: ['agriculture', 'rural'], tier: 'common' },
  { value: 'miner', weight: 3, tags: ['mining', 'industrial', 'frontier'], tier: 'common' },
  { value: 'prospector', weight: 2, tags: ['mining', 'frontier'], tier: 'common' },
  { value: 'factory worker', weight: 2, tags: ['industrial', 'urban', 'business-professional'], tier: 'common' },
  { value: 'settler', weight: 2, tags: ['frontier', 'rural', 'community-tribe'], tier: 'common' },
  { value: 'homesteader', weight: 1, tags: ['frontier', 'rural'], tier: 'common' },
  { value: 'clerk', weight: 2, tags: ['government-bureaucracy', 'business-professional', 'urban'], tier: 'common' },
  { value: 'bureaucratic functionary', weight: 2, tags: ['government-bureaucracy', 'urban'], tier: 'common' },
  { value: 'customs officer', weight: 1, tags: ['government-bureaucracy', 'enforcement', 'trade'], tier: 'common' },
  { value: 'clerk of records', weight: 1, tags: ['government-bureaucracy'], tier: 'common' },
  { value: 'street tough', weight: 2, tags: ['crime-syndicate', 'urban'], tier: 'common' },
  { value: 'gang member', weight: 2, tags: ['crime-syndicate', 'urban'], tier: 'common' },
  { value: 'smuggler crew hand', weight: 2, tags: ['crime-syndicate', 'trade', 'frontier'], tier: 'common' },
  { value: 'pickpocket', weight: 1, tags: ['crime-syndicate', 'urban'], tier: 'common' },
  { value: 'fence (stolen goods)', weight: 1, tags: ['crime-syndicate', 'trade'], tier: 'common' },
  { value: 'informant', weight: 1, tags: ['crime-syndicate', 'enforcement'], tier: 'common' },
  { value: 'private soldier', weight: 3, tags: ['military-paramilitary', 'enforcement'], tier: 'common' },
  { value: 'militia volunteer', weight: 2, tags: ['military-paramilitary', 'community-tribe'], tier: 'common' },
  { value: 'trooper', weight: 2, tags: ['military-paramilitary', 'enforcement'], tier: 'common' },
  { value: 'sentry', weight: 2, tags: ['military-paramilitary', 'security', 'enforcement'], tier: 'common' },
  { value: 'security guard', weight: 3, tags: ['security', 'enforcement', 'urban'], tier: 'common' },
  { value: 'beat officer', weight: 2, tags: ['enforcement', 'urban'], tier: 'common' },
  { value: 'patrol officer', weight: 2, tags: ['enforcement', 'security'], tier: 'common' },
  { value: 'temple attendant', weight: 1, tags: ['religion', 'community-tribe'], tier: 'common' },
  { value: 'novice acolyte', weight: 1, tags: ['religion', 'force-tradition'], tier: 'common' },
  { value: 'stagehand', weight: 1, tags: ['entertainment', 'urban'], tier: 'common' },
  { value: 'performer', weight: 1, tags: ['entertainment', 'urban'], tier: 'common' },
  { value: 'server / waitstaff', weight: 1, tags: ['entertainment', 'urban', 'trade'], tier: 'common' },
  { value: 'cantina regular', weight: 1, tags: ['entertainment', 'frontier', 'urban'], tier: 'common' },
  { value: 'groundskeeper', weight: 1, tags: ['rural', 'noble-house'], tier: 'common' },
  { value: 'household staff', weight: 1, tags: ['noble-house', 'business-professional'], tier: 'common' },
  { value: 'stable hand', weight: 1, tags: ['rural', 'noble-house'], tier: 'common' },
  { value: 'junior crew member', weight: 2, tags: ['business-professional', 'trade'], tier: 'common' },
  { value: 'apprentice', weight: 1, tags: ['business-professional', 'community-tribe'], tier: 'common' },

  // --- specialist / trained profession ----------------------------------
  { value: 'technician', weight: 3, tags: ['technology', 'industrial', 'business-professional'], tier: 'specialist' },
  { value: 'mechanic', weight: 3, tags: ['technology', 'industrial', 'frontier'], tier: 'specialist' },
  { value: 'starship mechanic', weight: 2, tags: ['technology', 'trade', 'frontier'], tier: 'specialist' },
  { value: 'droid technician', weight: 2, tags: ['droids', 'technology'], tier: 'specialist' },
  { value: 'engineer', weight: 3, tags: ['technology', 'industrial', 'research'], tier: 'specialist' },
  { value: 'systems engineer', weight: 1, tags: ['technology', 'research'], tier: 'specialist' },
  { value: 'pilot', weight: 3, tags: ['trade', 'military-paramilitary', 'frontier'], tier: 'specialist' },
  { value: 'shuttle pilot', weight: 1, tags: ['trade', 'urban'], tier: 'specialist' },
  { value: 'freighter captain', weight: 2, tags: ['trade', 'business-professional', 'frontier'], tier: 'specialist' },
  { value: 'navigator', weight: 1, tags: ['trade', 'technology'], tier: 'specialist' },
  { value: 'slicer', weight: 2, tags: ['technology', 'crime-syndicate', 'urban'], tier: 'specialist' },
  { value: 'computer systems specialist', weight: 1, tags: ['technology', 'government-bureaucracy'], tier: 'specialist' },
  { value: 'communications specialist', weight: 1, tags: ['technology', 'military-paramilitary'], tier: 'specialist' },
  { value: 'sensor operator', weight: 1, tags: ['technology', 'military-paramilitary'], tier: 'specialist' },
  { value: 'medic', weight: 3, tags: ['medical', 'community-tribe'], tier: 'specialist' },
  { value: 'field medic', weight: 1, tags: ['medical', 'military-paramilitary'], tier: 'specialist' },
  { value: 'doctor', weight: 2, tags: ['medical', 'business-professional'], tier: 'specialist' },
  { value: 'surgeon', weight: 1, tags: ['medical', 'business-professional'], tier: 'specialist' },
  { value: 'bacta clinic attendant', weight: 1, tags: ['medical', 'urban'], tier: 'specialist' },
  { value: 'scientist', weight: 2, tags: ['research', 'business-professional'], tier: 'specialist' },
  { value: 'researcher', weight: 2, tags: ['research', 'education'], tier: 'specialist' },
  { value: 'xenobiologist', weight: 1, tags: ['research', 'frontier'], tier: 'specialist' },
  { value: 'archaeologist', weight: 1, tags: ['research', 'cultural'], tier: 'specialist' },
  { value: 'academic', weight: 2, tags: ['education', 'research'], tier: 'specialist' },
  { value: 'professor', weight: 1, tags: ['education', 'business-professional'], tier: 'specialist' },
  { value: 'archivist', weight: 1, tags: ['education', 'government-bureaucracy'], tier: 'specialist' },
  { value: 'investigator', weight: 2, tags: ['enforcement', 'crime-syndicate'], tier: 'specialist' },
  { value: 'detective', weight: 1, tags: ['enforcement', 'urban'], tier: 'specialist' },
  { value: 'intelligence analyst', weight: 1, tags: ['government-bureaucracy', 'military-paramilitary'], tier: 'specialist' },
  { value: 'quartermaster', weight: 1, tags: ['military-paramilitary', 'business-professional'], tier: 'specialist' },
  { value: 'ordnance specialist', weight: 1, tags: ['military-paramilitary', 'technology'], tier: 'specialist' },
  { value: 'demolitions expert', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'], tier: 'specialist' },
  { value: 'bounty hunter', weight: 2, tags: ['crime-syndicate', 'frontier'], tier: 'specialist' },
  { value: 'smuggler', weight: 2, tags: ['crime-syndicate', 'trade', 'frontier'], tier: 'specialist' },
  { value: 'spy', weight: 1, tags: ['government-bureaucracy', 'crime-syndicate'], tier: 'specialist' },
  { value: 'enforcer', weight: 2, tags: ['crime-syndicate', 'security'], tier: 'specialist' },
  { value: 'assassin', weight: 1, tags: ['crime-syndicate', 'force-tradition'], tier: 'specialist' },
  { value: 'explorer', weight: 1, tags: ['frontier', 'research'], tier: 'specialist' },
  { value: 'surveyor', weight: 1, tags: ['frontier', 'mining'], tier: 'specialist' },
  { value: 'guide', weight: 1, tags: ['frontier', 'rural'], tier: 'specialist' },
  { value: 'diplomat', weight: 2, tags: ['government-bureaucracy', 'noble-house'], tier: 'specialist' },
  { value: 'attache', weight: 1, tags: ['government-bureaucracy', 'noble-house'], tier: 'specialist' },
  { value: 'negotiator', weight: 1, tags: ['government-bureaucracy', 'business-professional'], tier: 'specialist' },
  { value: 'legal counselor', weight: 1, tags: ['government-bureaucracy', 'business-professional'], tier: 'specialist' },
  { value: 'financial analyst', weight: 1, tags: ['financial-services', 'business-professional'], tier: 'specialist' },
  { value: 'accountant', weight: 1, tags: ['financial-services', 'business-professional'], tier: 'specialist' },
  { value: 'broker', weight: 1, tags: ['financial-services', 'trade'], tier: 'specialist' },
  { value: 'appraiser', weight: 1, tags: ['financial-services', 'trade'], tier: 'specialist' },
  { value: 'shipwright', weight: 1, tags: ['shipbuilding', 'industrial'], tier: 'specialist' },
  { value: 'weapons dealer', weight: 1, tags: ['military-industrial', 'crime-syndicate'], tier: 'specialist' },
  { value: 'armorer', weight: 1, tags: ['military-industrial', 'business-professional'], tier: 'specialist' },
  { value: 'religious functionary', weight: 1, tags: ['religion'], tier: 'specialist' },
  { value: 'priest', weight: 1, tags: ['religion'], tier: 'specialist' },
  { value: 'oracle / seer', weight: 1, tags: ['religion', 'force-tradition', 'mysterious'], tier: 'specialist' },
  { value: 'force adept', weight: 1, tags: ['force-tradition', 'mysterious'], tier: 'specialist' },
  { value: 'chronicler', weight: 1, tags: ['education', 'cultural'], tier: 'specialist' },
  { value: 'artisan / crafter', weight: 1, tags: ['cultural', 'business-professional'], tier: 'specialist' },
  { value: 'terraforming specialist', weight: 1, tags: ['agriculture', 'technology'], tier: 'specialist' },
  { value: 'agricultural specialist', weight: 1, tags: ['agriculture', 'research'], tier: 'specialist' },
  { value: 'entertainer / holo-performer', weight: 1, tags: ['entertainment', 'urban'], tier: 'specialist' },
  { value: 'journalist / newsnet stringer', weight: 1, tags: ['entertainment', 'government-bureaucracy'], tier: 'specialist' },

  // --- leadership / authority --------------------------------------------
  { value: 'administrator', weight: 2, tags: ['government-bureaucracy', 'business-professional'], tier: 'leadership' },
  { value: 'department head', weight: 1, tags: ['government-bureaucracy', 'business-professional'], tier: 'leadership' },
  { value: 'district magistrate', weight: 1, tags: ['government-bureaucracy'], tier: 'leadership' },
  { value: 'governor', weight: 1, tags: ['government-bureaucracy'], tier: 'leadership' },
  { value: 'senator', weight: 1, tags: ['government-bureaucracy'], tier: 'leadership' },
  { value: 'politician', weight: 2, tags: ['government-bureaucracy'], tier: 'leadership' },
  { value: 'political operative', weight: 1, tags: ['government-bureaucracy'], tier: 'leadership' },
  { value: 'guild master', weight: 1, tags: ['business-professional'], tier: 'leadership' },
  { value: 'corporate executive', weight: 2, tags: ['business-professional'], tier: 'leadership' },
  { value: 'department director', weight: 1, tags: ['business-professional'], tier: 'leadership' },
  { value: 'company foreman', weight: 1, tags: ['business-professional', 'industrial'], tier: 'leadership' },
  { value: 'dockmaster', weight: 1, tags: ['trade', 'business-professional'], tier: 'leadership' },
  { value: 'trade envoy', weight: 1, tags: ['trade', 'government-bureaucracy'], tier: 'leadership' },
  { value: 'noble scion', weight: 1, tags: ['noble-house'], tier: 'leadership' },
  { value: 'house steward', weight: 1, tags: ['noble-house'], tier: 'leadership' },
  { value: 'clan elder', weight: 1, tags: ['community-tribe'], tier: 'leadership' },
  { value: 'tribal chief', weight: 1, tags: ['community-tribe'], tier: 'leadership' },
  { value: 'village headman', weight: 1, tags: ['community-tribe', 'rural'], tier: 'leadership' },
  { value: 'commanding officer', weight: 2, tags: ['military-paramilitary'], tier: 'leadership' },
  { value: 'squad leader', weight: 1, tags: ['military-paramilitary'], tier: 'leadership' },
  { value: 'garrison commander', weight: 1, tags: ['military-paramilitary'], tier: 'leadership' },
  { value: 'security chief', weight: 2, tags: ['security', 'enforcement'], tier: 'leadership' },
  { value: 'police captain', weight: 1, tags: ['enforcement'], tier: 'leadership' },
  { value: 'warden', weight: 1, tags: ['enforcement', 'government-bureaucracy'], tier: 'leadership' },
  { value: 'crime boss', weight: 1, tags: ['crime-syndicate'], tier: 'leadership' },
  { value: 'syndicate lieutenant', weight: 1, tags: ['crime-syndicate'], tier: 'leadership' },
  { value: 'gang leader', weight: 1, tags: ['crime-syndicate'], tier: 'leadership' },
  { value: 'smuggling ring coordinator', weight: 1, tags: ['crime-syndicate', 'trade'], tier: 'leadership' },
  { value: 'mercenary company commander', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'], tier: 'leadership' },
  { value: 'chief scientist', weight: 1, tags: ['research'], tier: 'leadership' },
  { value: 'lead researcher', weight: 1, tags: ['research'], tier: 'leadership' },
  { value: 'high priest', weight: 1, tags: ['religion'], tier: 'leadership' },
  { value: 'order elder', weight: 1, tags: ['force-tradition'], tier: 'leadership' },
  { value: 'council member', weight: 1, tags: ['government-bureaucracy', 'force-tradition'], tier: 'leadership' },
  { value: 'intelligence handler', weight: 1, tags: ['government-bureaucracy', 'military-paramilitary'], tier: 'leadership' }
]);

export const NPC_ROLE_TIER = Object.freeze({
  COMMON: 'common',
  SPECIALIST: 'specialist',
  LEADERSHIP: 'leadership'
});
