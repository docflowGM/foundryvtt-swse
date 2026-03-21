/**
 * Condition Track Effects — canonical numeric adapter
 */

export function applyConditionPenalty(actor) {
  const step = Number(actor?.system?.conditionTrack?.current ?? 0);
  const penalties = { 0: 0, 1: -1, 2: -2, 3: -5, 4: -10, 5: 0 };
  actor.conditionPenalty = penalties[step] ?? 0;

  actor.isHelpless = step >= 5;
  actor.isUnconscious = step >= 5 && ['character', 'npc', 'beast'].includes(actor?.type);
  actor.isDisabled = step >= 5 && ['droid', 'object', 'device', 'vehicle'].includes(actor?.type);
}
