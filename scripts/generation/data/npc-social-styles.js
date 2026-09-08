/**
 * PHASE 8D-3B production — NPC social-style catalog: HOW this NPC
 * conducts themselves in interaction (distinct from `temperament`,
 * the emotional baseline underneath it). Representative catalog
 * (phase target: 75-125).
 */
export const NPC_SOCIAL_STYLES = Object.freeze([
  { value: 'formal', weight: 2, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'casual', weight: 2, tags: [] },
  { value: 'blunt', weight: 2, tags: [] },
  { value: 'charming', weight: 2, tags: ['crime-syndicate', 'business-professional'] },
  { value: 'awkward', weight: 1, tags: [] },
  { value: 'deferential', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'commanding', weight: 1, tags: ['military-paramilitary', 'noble-house'] },
  { value: 'evasive', weight: 1, tags: ['crime-syndicate'] },
  { value: 'friendly', weight: 2, tags: [] },
  { value: 'suspicious', weight: 1, tags: ['crime-syndicate'] },
  { value: 'overly familiar', weight: 1, tags: [] },
  { value: 'professional', weight: 2, tags: ['business-professional'] },
  { value: 'patronizing', weight: 1, tags: [] },
  { value: 'quiet', weight: 1, tags: [] },
  { value: 'talkative', weight: 2, tags: [] },
  { value: 'diplomatic', weight: 1, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'sarcastic', weight: 1, tags: [] },
  { value: 'earnest', weight: 1, tags: [] },
  { value: 'brusque', weight: 1, tags: ['military-paramilitary'] },
  { value: 'flirtatious', weight: 0.5, tags: [] },
  { value: 'condescending', weight: 1, tags: ['noble-house', 'business-professional'] },
  { value: 'self-deprecating', weight: 1, tags: [] },
  { value: 'gregarious', weight: 1, tags: [] },
  { value: 'reticent', weight: 1, tags: [] },
  { value: 'businesslike', weight: 2, tags: ['business-professional'] }
]);
