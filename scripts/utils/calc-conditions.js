/**
 * Condition Track Effects — canonical numeric adapter
 */
import { conditionTrackPenaltyForStep } from '/systems/foundryvtt-swse/scripts/utils/condition-track-penalty.js';

export function applyConditionPenalty(actor) {
  const step = Number(actor?.system?.conditionTrack?.current ?? 0);
  actor.conditionPenalty = conditionTrackPenaltyForStep(step);

  actor.isHelpless = step >= 5;
  actor.isUnconscious = step >= 5 && ['character', 'npc', 'beast'].includes(actor?.type);
  actor.isDisabled = step >= 5 && ['droid', 'object', 'device', 'vehicle'].includes(actor?.type);
}
