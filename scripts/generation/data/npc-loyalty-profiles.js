/**
 * PHASE 8D-3B production — NPC loyalty-profile catalog: who or what
 * this NPC is fundamentally committed to. Distinct from `disposition`
 * (how they treat the PCs right now, `npc-concept.js`'s existing
 * `NPC_DISPOSITION`) -- loyalty is about their deeper allegiance,
 * disposition is the surface read. Narrative only; no later reputation/
 * standing system is assumed or required to read this field.
 * Representative catalog (phase target: 50-100).
 */
export const NPC_LOYALTY_PROFILES = Object.freeze([
  { value: 'loyal to their Faction, without question', weight: 2, tags: [] },
  { value: 'loyal to a specific leader, not the organization itself', weight: 2, tags: [] },
  { value: 'loyal to their family above all else', weight: 2, tags: [] },
  { value: 'loyal to their homeworld or people', weight: 1, tags: ['community-tribe'] },
  { value: 'loyal to an ideology or cause', weight: 1, tags: ['religion', 'force-tradition'] },
  { value: 'loyal to whoever pays best', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'loyal only to themselves', weight: 2, tags: [] },
  { value: 'professionally loyal, nothing personal', weight: 2, tags: ['business-professional'] },
  { value: 'begrudgingly loyal, resents the obligation', weight: 1, tags: [] },
  { value: 'questioning their loyalty lately', weight: 1, tags: [] },
  { value: 'secretly disloyal, playing a longer game', weight: 0.5, tags: ['crime-syndicate'] },
  { value: 'opportunistic, loyalty shifts with circumstance', weight: 1, tags: ['crime-syndicate'] },
  { value: 'loyal to an old mentor, wherever they are now', weight: 1, tags: [] },
  { value: 'loyal to a promise made long ago', weight: 1, tags: [] },
  { value: 'loyal to a small circle of close friends', weight: 2, tags: [] },
  { value: 'loyal to the job itself, not any employer', weight: 1, tags: [] },
  { value: 'loyal to a memory of someone now gone', weight: 1, tags: [] },
  { value: 'fiercely loyal, has proven it before', weight: 1, tags: [] },
  { value: 'loyalty is untested, unclear even to them', weight: 1, tags: [] },
  { value: 'loyal to the credits, plain and simple', weight: 1, tags: ['crime-syndicate'] },
  { value: 'loyal to their crew, above the organization they serve', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'loyal to a code or personal ethic', weight: 1, tags: ['force-tradition'] }
]);
