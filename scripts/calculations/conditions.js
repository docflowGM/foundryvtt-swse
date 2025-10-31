/**
 * Condition Track Effects
 */

import { CONDITION_PENALTIES } from '../../helpers/constants.js';

export function applyConditionPenalty(actor) {
  const track = actor.system.conditionTrack || 'normal';
  actor.conditionPenalty = CONDITION_PENALTIES[track] || 0;
  
  // Apply additional condition effects
  if (track === 'helpless') {
    actor.isHelpless = true;
    actor.isUnconscious = true;
  } else {
    actor.isHelpless = false;
    actor.isUnconscious = false;
  }
}
