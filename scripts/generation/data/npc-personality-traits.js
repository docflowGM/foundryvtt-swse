/**
 * PHASE 8D-2 foundation — NPC personality trait pool for
 * `npc/npc-narrative-generator.js`. Representative catalog (30
 * entries).
 */

export const NPC_PERSONALITY_TRAITS = Object.freeze([
  { value: 'gruff but ultimately fair', weight: 3, tags: ['military', 'business'] },
  { value: 'nervously talkative, fills every silence', weight: 2, tags: ['civilian'] },
  { value: 'coldly calculating', weight: 2, tags: ['criminal', 'business'] },
  { value: 'warm and genuinely welcoming', weight: 3, tags: ['civilian', 'community'] },
  { value: 'paranoid, always watching the exits', weight: 2, tags: ['criminal', 'military'] },
  { value: 'arrogant and quick to remind others of their status', weight: 2, tags: ['noble', 'business'] },
  { value: 'self-deprecating, deflects with humor', weight: 2, tags: ['civilian'] },
  { value: 'fiercely loyal to their own people', weight: 3, tags: ['military', 'community'] },
  { value: 'quick to anger, slow to forgive', weight: 2, tags: ['criminal', 'military'] },
  { value: 'endlessly curious about everything', weight: 2, tags: ['civilian', 'business'] },
  { value: 'stoic, gives almost nothing away', weight: 2, tags: ['military', 'mysterious'] },
  { value: 'manipulative, always working an angle', weight: 2, tags: ['criminal', 'business'] },
  { value: 'naively optimistic despite everything', weight: 2, tags: ['civilian'] },
  { value: 'world-weary and cynical', weight: 3, tags: ['frontier', 'criminal'] },
  { value: 'meticulous and detail-obsessed', weight: 2, tags: ['business', 'military'] },
  { value: 'reckless, thrives on risk', weight: 2, tags: ['criminal', 'military'] },
  { value: 'soft-spoken but quietly intense', weight: 2, tags: ['mysterious', 'force'] },
  { value: 'flamboyant and loves an audience', weight: 2, tags: ['civilian', 'business'] },
  { value: 'deeply superstitious', weight: 1, tags: ['community', 'religion'] },
  { value: 'brutally, sometimes tactlessly honest', weight: 2, tags: ['military', 'civilian'] },
  { value: 'polite to a fault, even under pressure', weight: 2, tags: ['noble', 'civilian'] },
  { value: 'suspicious of outsiders until proven otherwise', weight: 3, tags: ['frontier', 'community'] },
  { value: 'ambitious, always angling for the next step up', weight: 2, tags: ['business', 'military'] },
  { value: 'easily distracted, hard to keep on topic', weight: 1, tags: ['civilian'] },
  { value: 'protective, especially of those weaker than them', weight: 2, tags: ['community', 'military'] },
  { value: 'greedy, but not stupid about it', weight: 2, tags: ['criminal', 'business'] },
  { value: 'dry, deadpan sense of humor', weight: 2, tags: ['civilian', 'military'] },
  { value: 'quietly grieving something they won’t discuss', weight: 1, tags: ['mysterious'] },
  { value: 'idealistic, still believes in a cause', weight: 2, tags: ['military', 'religion'] },
  { value: 'unremarkable, easy to underestimate', weight: 2, tags: [] }
]);
