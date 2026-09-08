/**
 * PHASE 8D-3B production — NPC desire catalog: what this NPC CURRENTLY
 * wants (immediately actionable), distinct from `motivation` (WHY they
 * generally act, `data/npc-motivations.js`) and `agenda` (what they're
 * ACTIVELY pursuing, `data/npc-agendas.js`) -- a desire is closer to a
 * concrete near-term want a Job/scene hook could resolve. Representative
 * catalog (phase target: 150-250).
 */
export const NPC_DESIRES = Object.freeze([
  { value: 'a promotion off-world', weight: 2, tags: ['business-professional'] },
  { value: 'enough credits to finally leave', weight: 2, tags: [] },
  { value: "someone's forgiveness", weight: 1, tags: [] },
  { value: 'a missing shipment recovered', weight: 2, tags: ['trade', 'crime-syndicate'] },
  { value: 'their reputation restored', weight: 1, tags: [] },
  { value: 'a transfer to a safer posting', weight: 1, tags: ['military-paramilitary'] },
  { value: 'access to restricted records', weight: 1, tags: ['government-bureaucracy'] },
  { value: "a rival publicly embarrassed", weight: 1, tags: [] },
  { value: 'a debt finally paid off', weight: 2, tags: ['criminal'] },
  { value: 'recognition for work no one has noticed', weight: 1, tags: ['business-professional'] },
  { value: 'a family member brought somewhere safe', weight: 1, tags: [] },
  { value: 'a second chance after a public failure', weight: 1, tags: [] },
  { value: 'a rare part for a personal project', weight: 1, tags: ['technology'] },
  { value: 'a quiet, uneventful retirement', weight: 1, tags: [] },
  { value: 'an old grudge finally settled', weight: 1, tags: [] },
  { value: 'a way out of an unwanted obligation', weight: 1, tags: [] },
  { value: 'a specific piece of information', weight: 2, tags: ['mysterious'] },
  { value: 'someone reliable to trust with a secret', weight: 1, tags: [] },
  { value: 'a fair hearing from someone in authority', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'their work finally taken seriously', weight: 1, tags: ['research'] },
  { value: 'safe passage for someone they care about', weight: 1, tags: [] },
  { value: 'a rival organization to fail publicly', weight: 1, tags: ['crime-syndicate'] },
  { value: 'enough proof to clear their name', weight: 1, tags: [] },
  { value: 'a permanent posting instead of a temporary one', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'to be let in on a secret everyone else seems to know', weight: 1, tags: [] },
  { value: 'a working relationship repaired', weight: 1, tags: [] },
  { value: 'their old mentor found and thanked', weight: 0.5, tags: [] },
  { value: 'one last big score before quitting', weight: 1, tags: ['crime-syndicate'] },
  { value: 'a fair price for honest work', weight: 1, tags: ['trade'] },
  { value: 'someone to finally listen to their concerns', weight: 1, tags: [] }
]);
