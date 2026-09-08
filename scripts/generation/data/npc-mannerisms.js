/**
 * PHASE 8D-2 foundation — NPC behavioral-mannerism pool for
 * `npc/npc-narrative-generator.js`. Representative catalog (25
 * entries). A small, quotable tic a GM can play at the table.
 */

export const NPC_MANNERISMS = Object.freeze([
  { value: 'taps their fingers rhythmically when thinking', weight: 3, tags: [] },
  { value: 'never quite makes eye contact', weight: 2, tags: ['criminal', 'mysterious'] },
  { value: 'constantly checks over their shoulder', weight: 3, tags: ['criminal', 'frontier'] },
  { value: 'hums old, half-remembered songs under their breath', weight: 2, tags: ['civilian'] },
  { value: 'collects a small trinket from every deal they make', weight: 1, tags: ['criminal', 'business'] },
  { value: 'always has a toothpick or cigarra in hand', weight: 2, tags: ['criminal', 'frontier'] },
  { value: 'speaks in short, clipped sentences', weight: 3, tags: ['military'] },
  { value: 'laughs at oddly inappropriate moments', weight: 1, tags: [] },
  { value: 'obsessively cleans or polishes their equipment', weight: 2, tags: ['military', 'criminal'] },
  { value: 'refers to themselves in the third person', weight: 1, tags: [] },
  { value: 'cracks their knuckles before difficult conversations', weight: 2, tags: ['military', 'criminal'] },
  { value: 'always counts their credits twice', weight: 2, tags: ['business', 'criminal'] },
  { value: 'fidgets with a small piece of jewelry', weight: 1, tags: ['noble', 'civilian'] },
  { value: 'speaks about themselves only in vague generalities', weight: 2, tags: ['mysterious'] },
  { value: 'punctuates sentences with an old military saying', weight: 2, tags: ['military'] },
  { value: 'chews on the same piece of food-stick for hours', weight: 1, tags: ['frontier'] },
  { value: 'answers questions with questions', weight: 2, tags: ['criminal', 'mysterious'] },
  { value: 'quotes scripture or old proverbs unprompted', weight: 1, tags: ['religion'] },
  { value: 'always stands slightly too close', weight: 1, tags: [] },
  { value: 'keeps one hand near a weapon at all times', weight: 2, tags: ['military', 'criminal'] },
  { value: 'apologizes reflexively, even when not at fault', weight: 2, tags: ['civilian'] },
  { value: 'name-drops important contacts constantly', weight: 2, tags: ['business', 'criminal'] },
  { value: 'goes quiet and distant when a certain topic comes up', weight: 2, tags: ['mysterious'] },
  { value: 'speaks louder than necessary, as if performing', weight: 1, tags: ['business', 'civilian'] },
  { value: 'no especially notable mannerisms', weight: 3, tags: [] },
  { value: 'taps or drums their fingers when thinking', weight: 2, tags: [] },
  { value: 'always double-checks locks and exits upon entering a room', weight: 1, tags: ['criminal', 'military'] },
  { value: 'compulsively polishes or cleans their gear', weight: 1, tags: ['military', 'technology'] },
  { value: 'answers questions with a question of their own', weight: 1, tags: ['criminal', 'mysterious'] },
  { value: 'laughs a beat too long after their own jokes', weight: 1, tags: ['civilian'] },
  { value: 'never sits with their back to a door', weight: 2, tags: ['military', 'criminal'] },
  { value: 'counts credits or supplies obsessively', weight: 1, tags: ['business', 'criminal'] },
  { value: 'hums an old tune while working', weight: 1, tags: ['civilian'] },
  { value: 'makes direct, unblinking eye contact', weight: 1, tags: ['mysterious', 'business'] },
  { value: 'avoids eye contact almost entirely', weight: 1, tags: ['civilian'] },
  { value: 'punctuates sentences with a nervous chuckle', weight: 1, tags: ['civilian'] },
  { value: 'speaks of themselves in the third person occasionally', weight: 1, tags: ['mysterious'] },
  { value: 'always has a datapad or tool in hand, fidgeting with it', weight: 1, tags: ['technology'] },
  { value: 'insists on shaking hands or a formal greeting every time', weight: 1, tags: ['business', 'noble'] },
  { value: 'mutters quietly to themselves between sentences', weight: 1, tags: ['mysterious'] }
]);
