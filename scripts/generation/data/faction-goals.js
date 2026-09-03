/**
 * PHASE 8D-2 foundation — Faction goal pools for `factions/faction-goals.js`.
 * Two separate pools: `FACTION_LONG_TERM_GOALS` (rolled independently
 * for BOTH the public-facing goal and the actual goal -- rolling twice
 * from the same pool means they sometimes coincide and often differ,
 * which is the interesting narrative case: a Faction whose real aim
 * doesn't match what it claims) and `FACTION_CURRENT_OBJECTIVES` (a
 * short-term, active-right-now aim, Faction-scale analog of
 * `npc-agendas.js`). Representative catalogs (24 + 22 entries).
 */

export const FACTION_LONG_TERM_GOALS = Object.freeze([
  { value: 'expand its territory and influence', weight: 4, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'accumulate as much wealth as possible', weight: 3, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'protect and preserve its own people', weight: 3, tags: ['community-tribe', 'noble-house'] },
  { value: 'overthrow a rival power', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'maintain the status quo at all costs', weight: 3, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'gain formal legitimacy/recognition', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'restore a lost golden age', weight: 1, tags: ['noble-house', 'religion'] },
  { value: 'spread its ideology or faith', weight: 2, tags: ['religion', 'force-tradition'] },
  { value: 'achieve independence from an outside power', weight: 2, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'secure a monopoly over a key resource or trade route', weight: 3, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'eliminate a specific rival organization entirely', weight: 2, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'build a lasting legacy for its founder/leader', weight: 1, tags: ['noble-house', 'business-professional'] },
  { value: 'stay hidden and avoid outside attention', weight: 2, tags: ['crime-syndicate', 'force-tradition'] },
  { value: 'reform a corrupt system from within', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'reclaim ancestral territory or holdings', weight: 1, tags: ['noble-house', 'community-tribe'] },
  { value: 'seek revenge for a past wrong done to them', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'advance scientific or technological progress', weight: 1, tags: ['business-professional'] },
  { value: 'establish peace between warring factions', weight: 1, tags: ['government-bureaucracy', 'religion'] },
  { value: 'gain a powerful patron\'s favor', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'survive -- nothing more ambitious than that', weight: 3, tags: ['community-tribe', 'crime-syndicate'] },
  { value: 'become the dominant power in their region', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'uphold an ancient oath or duty', weight: 1, tags: ['noble-house', 'force-tradition'] },
  { value: 'exploit chaos and conflict for personal gain', weight: 2, tags: ['crime-syndicate'] },
  { value: 'no grand goal, just day-to-day operation', weight: 2, tags: [] }
]);

export const FACTION_CURRENT_OBJECTIVES = Object.freeze([
  { value: 'securing a new supply line before a rival claims it', weight: 3, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'recovering from a recent, costly setback', weight: 2, tags: [] },
  { value: 'negotiating a fragile truce with a rival', weight: 2, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'rooting out an informant in their ranks', weight: 2, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'preparing for an expected attack or raid', weight: 2, tags: ['military-paramilitary'] },
  { value: 'consolidating recently seized territory', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'recruiting heavily to replace recent losses', weight: 2, tags: ['military-paramilitary'] },
  { value: 'covering up an embarrassing recent failure', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'courting a powerful potential ally', weight: 2, tags: ['government-bureaucracy', 'business-professional'] },
  { value: 'quietly investigating a threat to leadership', weight: 1, tags: [] },
  { value: 'expanding into a new, unclaimed territory', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'stalling for time while gathering resources', weight: 2, tags: [] },
  { value: 'attempting to broker a lucrative new deal', weight: 2, tags: ['business-professional', 'crime-syndicate'] },
  { value: 'dealing with unexpected internal dissent', weight: 2, tags: [] },
  { value: 'searching for a defector who took something valuable', weight: 1, tags: ['crime-syndicate'] },
  { value: 'repairing relations with a wronged local community', weight: 1, tags: ['community-tribe', 'government-bureaucracy'] },
  { value: 'racing a rival to a valuable discovery', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'weathering a sudden funding shortfall', weight: 2, tags: ['business-professional'] },
  { value: 'planning a symbolic show of strength', weight: 1, tags: ['military-paramilitary'] },
  { value: 'quietly relocating operations to a safer base', weight: 1, tags: ['crime-syndicate'] },
  { value: 'training a new generation of members', weight: 1, tags: [] },
  { value: 'business as usual -- nothing unusual in motion right now', weight: 3, tags: [] }
]);
