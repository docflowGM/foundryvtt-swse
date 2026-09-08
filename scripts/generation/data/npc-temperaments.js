/**
 * PHASE 8D-3B production — NPC temperament catalog: the broad
 * emotional BASELINE (distinct from `personality` traits, which are
 * more specific characterization facts). Representative catalog
 * (phase target: 50-75).
 */
export const NPC_TEMPERAMENTS = Object.freeze([
  { value: 'calm', weight: 3, tags: [] },
  { value: 'volatile', weight: 1, tags: [] },
  { value: 'reserved', weight: 2, tags: [] },
  { value: 'energetic', weight: 2, tags: [] },
  { value: 'nervous', weight: 1, tags: [] },
  { value: 'stoic', weight: 1, tags: ['military-paramilitary', 'force-tradition'] },
  { value: 'cheerful', weight: 2, tags: [] },
  { value: 'melancholic', weight: 1, tags: [] },
  { value: 'intense', weight: 1, tags: [] },
  { value: 'relaxed', weight: 2, tags: [] },
  { value: 'restless', weight: 1, tags: [] },
  { value: 'patient', weight: 2, tags: [] },
  { value: 'irritable', weight: 1, tags: [] },
  { value: 'warm', weight: 2, tags: [] },
  { value: 'cool and detached', weight: 1, tags: ['business-professional'] },
  { value: 'easily excitable', weight: 1, tags: [] },
  { value: 'even-keeled', weight: 2, tags: [] },
  { value: 'brooding', weight: 1, tags: [] },
  { value: 'lighthearted', weight: 2, tags: [] },
  { value: 'guarded', weight: 1, tags: ['crime-syndicate', 'government-bureaucracy'] }
]);
