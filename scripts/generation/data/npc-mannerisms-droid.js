/**
 * PHASE 8D-3B production — droid PRIMARY mannerism catalog.
 *
 * `mannerisms` (`npc-concept.js`'s existing field, populated for
 * organic NPCs by `npc-narrative-generator.js`'s `pickNpcMannerism()`
 * over `data/npc-mannerisms.js`) is the NPC's ONE prominent, recurring
 * behavioral habit -- distinct from `flavorNotes` (miscellaneous small
 * memorable details, plural, independently rerollable). This was
 * previously organic-only: a generated droid NPC got an organic
 * mannerism like "bites their nails," which makes no sense for a
 * droid. This catalog + `npc/npc-characterization.js`'s kind-dispatch
 * fixes that gap -- a droid NPC now rolls from ITS OWN pool.
 *
 * Representative catalog (phase target: 150-250).
 */
export const NPC_DROID_MANNERISMS = Object.freeze([
  { value: 'rotates its photoreceptor slowly while thinking', weight: 2, tags: [] },
  { value: 'runs a brief self-diagnostic during any pause', weight: 1, tags: [] },
  { value: 'repositions its manipulators when uncertain', weight: 1, tags: [] },
  { value: 'tilts its head-unit when processing a question', weight: 2, tags: [] },
  { value: 'taps a manipulator rhythmically while waiting', weight: 1, tags: [] },
  { value: 'straightens nearby objects into precise alignment', weight: 1, tags: ['protocol'] },
  { value: 'announces its own actions before performing them', weight: 1, tags: ['protocol'] },
  { value: 'pauses to recalibrate before answering a direct question', weight: 1, tags: [] },
  { value: 'hums a faint internal-cooling tone when idle', weight: 1, tags: [] },
  { value: 'checks its own chassis for damage compulsively', weight: 0.5, tags: [] },
  { value: 'counts down audibly before starting a task', weight: 0.5, tags: [] },
  { value: 'mirrors the posture of whoever it\'s speaking to', weight: 0.5, tags: ['protocol'] },
  { value: 'idles with a faint repeating servo twitch', weight: 1, tags: ['worn'] },
  { value: 'reboots its display readout compulsively', weight: 0.5, tags: [] },
  { value: 'insists on completing one task fully before starting another', weight: 1, tags: [] },
  { value: 'narrates its own diagnostic results unprompted', weight: 1, tags: [] },
  { value: 'keeps its manipulators folded precisely when not in use', weight: 1, tags: ['protocol'] },
  { value: 'flickers its photoreceptor briefly when startled', weight: 1, tags: [] },
  { value: 'repeats the last instruction back before acting on it', weight: 1, tags: [] },
  { value: 'idles facing the nearest exit or point of interest', weight: 1, tags: ['security'] }
]);
