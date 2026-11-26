/**
 * NPC competence level identifiers (leaf, no imports). Moved out of npc-competence.js so npc-concept.js can validate a level without importing a module that
 * imports npc-concept (F-NPC cycle fix). npc-competence.js re-exports both names unchanged.
 */
export const NPC_COMPETENCE_LEVEL = Object.freeze({
  UNTRAINED: 'untrained',
  CAPABLE: 'capable',
  SKILLED: 'skilled',
  EXPERT: 'expert',
  ELITE: 'elite'
});

const COMPETENCE_LEVELS = Object.freeze(Object.values(NPC_COMPETENCE_LEVEL));

export function isNpcCompetenceLevel(value) {
  return COMPETENCE_LEVELS.includes(value);
}
