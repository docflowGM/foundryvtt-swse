/**
 * Phase detection module - determines if game is in combat or narrative phase
 */

export const SWSE_PHASES = {
  COMBAT: 'combat',
  NARRATIVE: 'narrative'
};

/**
 * Get current phase based on active combat
 * @returns {string} 'combat' or 'narrative'
 */
export function getCurrentPhase() {
  return game.combat && game.combat.started ? SWSE_PHASES.COMBAT : SWSE_PHASES.NARRATIVE;
}
