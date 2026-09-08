/**
 * PHASE 8D-3B production — NPC narrative-function catalog: the STORY
 * role this NPC is likely to play for the party, not their occupation.
 * SUGGEST-tier only (matches `combatRole`/`levelBand`'s existing
 * discipline on this same schema) -- a GM-facing hint, never binding.
 * Representative catalog (phase target: 50-75).
 */
export const NPC_NARRATIVE_FUNCTIONS = Object.freeze([
  { value: 'information-source', weight: 3, tags: [] },
  { value: 'client', weight: 2, tags: ['business-professional'] },
  { value: 'witness', weight: 2, tags: [] },
  { value: 'guide', weight: 2, tags: ['frontier'] },
  { value: 'gatekeeper', weight: 2, tags: ['government-bureaucracy', 'security'] },
  { value: 'authority', weight: 1, tags: ['government-bureaucracy', 'enforcement'] },
  { value: 'victim', weight: 1, tags: [] },
  { value: 'suspect', weight: 1, tags: ['crime-syndicate'] },
  { value: 'rival', weight: 1, tags: [] },
  { value: 'ally', weight: 2, tags: [] },
  { value: 'comic-relief', weight: 1, tags: [] },
  { value: 'mentor', weight: 1, tags: [] },
  { value: 'obstacle', weight: 1, tags: [] },
  { value: 'betrayer', weight: 0.5, tags: ['crime-syndicate'] },
  { value: 'rescuer', weight: 0.5, tags: [] },
  { value: 'middleman', weight: 2, tags: ['trade', 'crime-syndicate'] },
  { value: 'quest-contact', weight: 2, tags: [] },
  { value: 'recurring-contact', weight: 2, tags: [] },
  { value: 'red herring', weight: 0.5, tags: ['mysterious'] },
  { value: 'unexpected ally', weight: 0.5, tags: [] },
  { value: 'background color, no larger function', weight: 3, tags: [] },
  { value: 'bureaucratic obstacle', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'wildcard', weight: 0.5, tags: [] },
  { value: 'reluctant helper', weight: 1, tags: [] },
  { value: 'silent observer', weight: 1, tags: ['mysterious'] },
  { value: 'local expert', weight: 1, tags: ['research'] },
  { value: 'gossip/rumor source', weight: 1, tags: ['community-tribe'] },
  { value: 'go-between for two hostile parties', weight: 0.5, tags: [] },
  { value: 'accidental complication', weight: 0.5, tags: [] },
  { value: 'moral compass', weight: 0.5, tags: [] }
]);
