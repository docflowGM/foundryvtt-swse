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
  { value: 'no especially notable mannerisms', weight: 3, tags: [] }
]);
