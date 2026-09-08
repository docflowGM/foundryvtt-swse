/**
 * PHASE 8D-3B production — droid NPC vocabulator/audio quality
 * catalog. STRUCTURALLY SEPARATE from the organic voice pool (same
 * kind-locked-pool discipline as `npc-flavor-qualities-droid.js` --
 * see that module's header). Representative catalog (phase target:
 * 100-150).
 */
export const NPC_VOICE_QUALITIES_DROID = Object.freeze([
  { value: 'tinny vocabulator', weight: 1, tags: [] },
  { value: 'overly crisp synthetic voice', weight: 1, tags: ['advanced'] },
  { value: 'occasional bursts of static', weight: 1, tags: ['frontier'] },
  { value: 'very low output volume by default', weight: 1, tags: [] },
  { value: 'unnecessary startup chime before speaking', weight: 0.5, tags: [] },
  { value: 'rapid binary chirps under its speech', weight: 0.5, tags: [] },
  { value: 'odd harmonic undertone', weight: 0.5, tags: [] },
  { value: 'warm, almost organic-sounding modulation', weight: 1, tags: ['wealthy'] },
  { value: 'flat, deliberately unmodulated tone', weight: 1, tags: [] },
  { value: 'slightly delayed response timing', weight: 1, tags: ['frontier'] },
  { value: 'crackling undertone from a worn speaker', weight: 1, tags: ['frontier'] },
  { value: 'unusually resonant chassis-amplified voice', weight: 0.5, tags: [] },
  { value: 'precise, clipped diction', weight: 1, tags: ['protocol'] },
  { value: 'faint mechanical whir under its speech', weight: 0.5, tags: [] },
  { value: 'oddly cheerful vocal inflection', weight: 0.5, tags: [] },
  { value: 'monotone, rarely varies pitch', weight: 1, tags: [] },
  { value: 'customized voice pack, unusually expressive', weight: 0.5, tags: ['wealthy'] },
  { value: 'stock factory vocabulator, unremarkable', weight: 2, tags: [] }
]);
