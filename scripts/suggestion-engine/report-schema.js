/**
 * SuggestionReport Schema — Single source of truth for all suggestion evaluation
 *
 * Immutable structure emitted by the core Suggestion Engine.
 * All GM modules consume this. Never modified after emission.
 *
 * Design:
 * - One engine → one report per cycle
 * - Player consumers: see only their own suggestions
 * - GM consumers: see partyAggregate + diagnostics (hidden from players)
 */

/**
 * Create a new SuggestionReport
 * @param {Object} data - Raw report data
 * @returns {Object} Frozen, immutable report
 */
export function createSuggestionReport(data) {
  validateSuggestionReport(data);

  return Object.freeze({
    meta: Object.freeze({ ...data.meta }),
    perActor: Object.freeze({ ...data.perActor }),
    partyAggregate: Object.freeze({ ...data.partyAggregate }),
    diagnostics: Object.freeze({ ...data.diagnostics })
  });
}

/**
 * Validate report structure
 * @param {Object} report
 * @throws Error if structure is invalid
 */
export function validateSuggestionReport(report) {
  if (!report.meta) {
    throw new Error('[SuggestionReport] Missing: meta');
  }
  if (typeof report.meta.reportId !== 'string') {
    throw new Error('[SuggestionReport] Invalid: meta.reportId must be string');
  }
  if (typeof report.meta.timestamp !== 'number') {
    throw new Error('[SuggestionReport] Invalid: meta.timestamp must be number');
  }
  if (!['combat', 'narrative'].includes(report.meta.phase)) {
    throw new Error('[SuggestionReport] Invalid: meta.phase must be "combat" or "narrative"');
  }

  if (typeof report.perActor !== 'object' || report.perActor === null) {
    throw new Error('[SuggestionReport] Missing: perActor');
  }

  if (typeof report.partyAggregate !== 'object' || report.partyAggregate === null) {
    throw new Error('[SuggestionReport] Missing: partyAggregate');
  }

  if (typeof report.diagnostics !== 'object' || report.diagnostics === null) {
    throw new Error('[SuggestionReport] Missing: diagnostics');
  }

  return true;
}

/**
 * Extract player-safe view (only their suggestions + phase)
 * @param {Object} report
 * @param {string} actorId
 * @returns {Object} Player-visible data only
 */
export function getPlayerSafeView(report, actorId) {
  return Object.freeze({
    meta: {
      phase: report.meta.phase,
      timestamp: report.meta.timestamp,
      evaluationReason: report.meta.evaluationReason
    },
    mySuggestions: report.perActor[actorId] || null
  });
}

/**
 * Extract GM-only view (everything except player suggestions)
 * @param {Object} report
 * @returns {Object} GM-visible data
 */
export function getGMOnlyView(report) {
  return Object.freeze({
    meta: report.meta,
    partyAggregate: report.partyAggregate,
    diagnostics: report.diagnostics,
    perActorSummary: Object.keys(report.perActor).reduce((acc, actorId) => {
      const actor = report.perActor[actorId];
      acc[actorId] = {
        confidenceBand: actor.confidenceBand,
        roleTags: actor.roleTags,
        intentVector: actor.intentVector,
        suppressionFlags: actor.suppressionFlags
      };
      return acc;
    }, {})
  });
}

/**
 * Generate a unique report ID
 * @returns {string} UUID-style report ID
 */
export function generateReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
