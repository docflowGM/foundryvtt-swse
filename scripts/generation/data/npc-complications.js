/**
 * PHASE 8D-3B production — NPC complication catalog. A complication is
 * something that makes DEALING WITH this NPC harder or more
 * interesting right now -- distinct from `secret` (something they're
 * hiding). Representative catalog (phase target: 250-400).
 */
export const NPC_COMPLICATIONS = Object.freeze([
  { value: 'is being watched by local security', weight: 1, tags: ['crime-syndicate'] },
  { value: 'is deeply in debt', weight: 2, tags: [] },
  { value: 'is late for an important meeting', weight: 2, tags: [] },
  { value: 'cannot legally leave the planet right now', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'has a family member who is missing', weight: 1, tags: [] },
  { value: 'mistakenly believes the party works for someone else', weight: 1, tags: [] },
  { value: 'is injured but hiding it', weight: 1, tags: [] },
  { value: 'is under investigation by a superior', weight: 1, tags: ['business-professional', 'government-bureaucracy'] },
  { value: 'has just been demoted and is bitter about it', weight: 1, tags: [] },
  { value: 'is being pressured by a rival organization', weight: 1, tags: ['crime-syndicate'] },
  { value: 'is caring for a sick relative and stretched thin', weight: 1, tags: [] },
  { value: 'has an unreliable superior making their job harder', weight: 1, tags: ['business-professional'] },
  { value: 'is out of favor with their organization right now', weight: 1, tags: [] },
  { value: 'owes a favor they\'d rather not repay', weight: 1, tags: [] },
  { value: 'is being blackmailed over something minor', weight: 0.5, tags: [] },
  { value: 'has just lost a valuable piece of equipment', weight: 1, tags: [] },
  { value: 'is caught between two people they both need to please', weight: 1, tags: [] },
  { value: 'is new to the job and visibly overwhelmed', weight: 1, tags: [] },
  { value: 'is nursing a grudge that colors everything they say', weight: 1, tags: [] },
  { value: 'has conflicting orders from two different superiors', weight: 1, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'is quietly job-hunting and distracted', weight: 1, tags: [] },
  { value: 'has just had a public falling-out with a colleague', weight: 1, tags: [] },
  { value: 'is stretched across too many responsibilities at once', weight: 1, tags: [] },
  { value: 'is dealing with faulty, unreliable equipment', weight: 1, tags: ['technology'] },
  { value: 'is short-staffed and covering someone else\'s work', weight: 1, tags: [] },
  { value: 'is being audited or inspected soon', weight: 1, tags: ['financial-services', 'government-bureaucracy'] },
  { value: 'has a personal deadline bearing down on them', weight: 1, tags: [] },
  { value: 'is trying to keep a secret from a close colleague', weight: 1, tags: [] },
  { value: 'is recovering from a recent scare and jumpy', weight: 1, tags: [] },
  { value: 'has no complications right now, business as usual', weight: 2, tags: [] }
]);
