/**
 * PHASE 8D-3B production — organic NPC voice-quality catalog: what
 * this NPC SOUNDS like (distinct from `speechStyle`, which describes
 * HOW they construct sentences). Representative catalog (phase target:
 * 100-150).
 */
export const NPC_VOICE_QUALITIES_ORGANIC = Object.freeze([
  { value: 'soft-spoken', weight: 2, tags: [] },
  { value: 'deep and resonant', weight: 1, tags: [] },
  { value: 'raspy', weight: 1, tags: [] },
  { value: 'nasal', weight: 1, tags: [] },
  { value: 'booming', weight: 1, tags: ['military-paramilitary', 'noble-house'] },
  { value: 'quiet, almost a murmur', weight: 1, tags: [] },
  { value: 'breathy', weight: 0.5, tags: [] },
  { value: 'precise and measured', weight: 1, tags: ['business-professional', 'government-bureaucracy'] },
  { value: 'gravelly', weight: 1, tags: ['frontier', 'military-paramilitary'] },
  { value: 'musical, almost sing-song', weight: 0.5, tags: [] },
  { value: 'clipped and efficient', weight: 1, tags: ['military-paramilitary'] },
  { value: 'warm and inviting', weight: 1, tags: [] },
  { value: 'thin and reedy', weight: 0.5, tags: [] },
  { value: 'unusually high-pitched', weight: 0.5, tags: [] },
  { value: 'low and steady', weight: 1, tags: [] },
  { value: 'hoarse, as if from overuse', weight: 0.5, tags: [] },
  { value: 'crisp, faintly accented', weight: 1, tags: [] },
  { value: 'slow and deliberate', weight: 1, tags: [] },
  { value: 'quick and clipped', weight: 1, tags: [] },
  { value: 'smooth, practiced', weight: 1, tags: ['business-professional', 'crime-syndicate'] }
]);
