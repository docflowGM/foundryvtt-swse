/**
 * The single condition-track penalty table (Core Rulebook condition track: Normal 0, -1, -2, -5, -10; the bottom step is the Helpless/unconscious
 * STATE, which carries no numeric penalty here -- its action-state effects are handled separately by the condition engines).
 * Leaf module: no imports, so every calculator can use it without joining a dependency cycle.
 */
const CONDITION_TRACK_PENALTIES = Object.freeze([0, -1, -2, -5, -10, 0]);

export function conditionTrackPenaltyForStep(step) {
  const n = Number(step);
  if (!Number.isFinite(n)) return 0;
  return CONDITION_TRACK_PENALTIES[Math.min(5, Math.max(0, Math.trunc(n)))] ?? 0;
}
