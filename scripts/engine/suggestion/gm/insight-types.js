/**
 * GM Insight Types and Constants
 *
 * All insight objects that GM modules emit follow these shapes.
 * These are never exposed to players.
 */

export const INSIGHT_TYPES = {
  PRESSURE_WARNING: 'pressure-warning',
  SPOTLIGHT_IMBALANCE: 'spotlight-imbalance',
  PACING_SIGNAL: 'pacing-signal',
  TUNING_ADVICE: 'tuning-advice'
};

export const INSIGHT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const PACING_STATES = {
  STALLED: 'stalled',
  OVERHEATED: 'overheated',
  HEALTHY: 'healthy'
};

/**
 * Validate insight structure before emission
 */
export function validateInsight(insight) {
  if (!insight.type || !Object.values(INSIGHT_TYPES).includes(insight.type)) {
    throw new Error(`[GMInsight] Invalid type: ${insight.type}`);
  }
  if (!insight.summary || typeof insight.summary !== 'string') {
    throw new Error(`[GMInsight] Missing or invalid summary`);
  }
  if (!Array.isArray(insight.evidence)) {
    throw new Error(`[GMInsight] evidence must be an array`);
  }
  return true;
}
