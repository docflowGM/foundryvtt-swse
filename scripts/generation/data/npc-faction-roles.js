/**
 * PHASE 8D-3B production — Faction-specific role catalog.
 *
 * REUSE NOTE (phase completion report §"reuse-mapping decisions"): the
 * handoff's proposed schema asked for a standalone `factionRole` field.
 * `npc-concept.js` already has a field for exactly this concept --
 * `specialistRole` (Phase 8D-1 addendum, "a Warrant-Officer-equivalent
 * NPC concept should favor these") -- so this catalog populates THAT
 * existing field for generated Faction Contacts rather than adding a
 * second, redundant field. `role`/`factionRankTitle`/`commandTier`
 * remain the general-occupation/display-rank/normalized-tier fields;
 * `specialistRole` is specifically "what this person DOES for the
 * Faction," which is what "factionRole" meant.
 *
 * Representative catalog (phase target: 100-150).
 */
export const NPC_FACTION_ROLES = Object.freeze([
  { value: 'field agent', weight: 2, tags: ['government-bureaucracy', 'crime-syndicate'] },
  { value: 'recruiter', weight: 2, tags: [] },
  { value: 'accountant', weight: 1, tags: ['financial-services', 'business-professional'] },
  { value: 'legal counsel', weight: 1, tags: ['government-bureaucracy', 'business-professional'] },
  { value: 'intelligence handler', weight: 1, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'quartermaster', weight: 1, tags: ['military-paramilitary'] },
  { value: 'logistics officer', weight: 2, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'political liaison', weight: 1, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'enforcer', weight: 2, tags: ['crime-syndicate'] },
  { value: 'researcher', weight: 1, tags: ['research'] },
  { value: 'propagandist', weight: 1, tags: ['government-bureaucracy', 'religion'] },
  { value: 'public representative', weight: 1, tags: ['government-bureaucracy', 'business-professional'] },
  { value: 'local cell leader', weight: 1, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'training instructor', weight: 1, tags: ['military-paramilitary'] },
  { value: 'internal security officer', weight: 1, tags: ['security', 'crime-syndicate'] },
  { value: 'archivist / records keeper', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'supply chain coordinator', weight: 1, tags: ['business-professional', 'trade'] },
  { value: 'negotiator', weight: 1, tags: ['business-professional', 'government-bureaucracy'] },
  { value: 'fixer', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'communications officer', weight: 1, tags: ['military-paramilitary', 'technology'] },
  { value: 'membership coordinator', weight: 1, tags: ['community-tribe'] },
  { value: 'treasury officer', weight: 1, tags: ['financial-services'] },
  { value: 'chief engineer', weight: 1, tags: ['technology', 'industrial'] },
  { value: 'medical officer', weight: 1, tags: ['medical'] },
  { value: 'chaplain / spiritual advisor', weight: 0.5, tags: ['religion'] },
  { value: 'internal auditor', weight: 0.5, tags: ['financial-services', 'government-bureaucracy'] },
  { value: 'courier network coordinator', weight: 1, tags: ['trade', 'crime-syndicate'] },
  { value: 'personal bodyguard', weight: 1, tags: ['security', 'military-paramilitary'] },
  { value: 'talent scout', weight: 0.5, tags: ['business-professional'] },
  { value: 'informant handler', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] },
  { value: 'droid operations coordinator', weight: 0.5, tags: ['droids', 'technology'] },
  { value: 'territory overseer', weight: 1, tags: ['crime-syndicate', 'noble-house'] },
  { value: 'diplomatic envoy', weight: 0.5, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'rank-and-file member, no special portfolio', weight: 3, tags: [] }
]);
