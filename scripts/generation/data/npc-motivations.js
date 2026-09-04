/**
 * PHASE 8D-2 foundation — NPC motivation ("why") pool for
 * `npc/npc-narrative-generator.js`. Representative catalog (25
 * entries). Distinct from `npc-agendas.js` ("what they're actively
 * doing") -- see `npc-concept.js`'s field-header comment for the exact
 * distinction.
 */

export const NPC_MOTIVATIONS = Object.freeze([
  { value: 'seeking revenge for a past betrayal', weight: 2, tags: ['criminal', 'military'] },
  { value: 'trying to pay off a crushing debt', weight: 3, tags: ['criminal', 'business'] },
  { value: 'protecting a family kept hidden from enemies', weight: 2, tags: ['community'] },
  { value: 'chasing personal glory and recognition', weight: 2, tags: ['military', 'business'] },
  { value: 'believes deeply in a cause, whatever the cost', weight: 2, tags: ['military', 'religion'] },
  { value: 'just trying to survive one more day', weight: 3, tags: ['frontier', 'criminal'] },
  { value: 'seeking redemption for a past mistake', weight: 2, tags: [] },
  { value: 'driven by simple, uncomplicated greed', weight: 3, tags: ['criminal', 'business'] },
  { value: 'loyal to the memory of a mentor or lost commander', weight: 2, tags: ['military'] },
  { value: 'desperate to prove themselves to someone who doubts them', weight: 2, tags: [] },
  { value: 'trying to build a better life for their children', weight: 2, tags: ['community', 'civilian'] },
  { value: 'obsessed with uncovering a specific truth', weight: 1, tags: ['mysterious'] },
  { value: 'motivated by fear of what happens if they fail', weight: 2, tags: ['criminal', 'military'] },
  { value: 'wants out of this life entirely, one last job away', weight: 2, tags: ['criminal'] },
  { value: 'trying to restore their family\'s lost standing', weight: 1, tags: ['noble'] },
  { value: 'genuinely believes they are doing the right thing', weight: 2, tags: [] },
  { value: 'seeking approval from a demanding superior', weight: 2, tags: ['military', 'business'] },
  { value: 'haunted by guilt over something they can\'t undo', weight: 1, tags: ['mysterious'] },
  { value: 'wants to protect their community from outside threats', weight: 3, tags: ['community', 'frontier'] },
  { value: 'chasing the next big score, always one step from broke', weight: 2, tags: ['criminal'] },
  { value: 'trying to hold their organization together against collapse', weight: 2, tags: ['business', 'military'] },
  { value: 'motivated by an old, unresolved grudge', weight: 2, tags: [] },
  { value: 'devoted to a faith or tradition few others share', weight: 1, tags: ['religion'] },
  { value: 'simply doing a job, nothing personal', weight: 3, tags: ['military', 'business'] },
  { value: 'unclear even to themselves -- acting on instinct', weight: 1, tags: [] }
]);
