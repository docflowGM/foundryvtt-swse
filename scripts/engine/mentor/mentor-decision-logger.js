/**
 * MENTOR DECISION LOGGER - Structured Judgment Capture
 *
 * Captures mentor reasoning data for a suggestion in a structured,
 * serializable format. This is an ENGINE-LAYER diagnostic module.
 *
 * RESPONSIBILITY:
 * - Record why a mentor judgment was made
 * - Structure data in a standard format
 * - NO persistence (caller owns storage/display)
 * - NO side-effects
 *
 * This module is HEADLESS-SAFE: functions are pure, deterministic,
 * and can be called from anywhere (engine, UI, tests, etc.)
 */

import { calculateIntensity, getIntensityLevel } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-intensity-atoms.js";

/**
 * Log a mentor decision for a suggestion.
 *
 * Captures structured judgment data without side-effects.
 * The returned record is fully serializable and ready for persistence,
 * display, or analysis.
 *
 * @param {Object} params - Logging parameters
 *   @param {string} params.suggestionId - Unique ID of the suggestion
 *   @param {string} params.suggestionName - Display name (e.g., "Power Attack")
 *   @param {Object} params.factors - Intensity factors (atom → weight)
 *   @param {Object} params.context - Additional context
 *     @param {string} context.characterName - Character being mentored
 *     @param {number} context.characterLevel - Character's current level
 *     @param {string} context.buildFocus - Primary build theme
 *     @param {string} context.mentorId - Mentor being consulted
 *     @param {Array} context.supportingReasons - Text explanations
 *   @param {Object} options - Optional control flags
 *     @param {boolean} options.includeCoreOnly - Only use core intensity factors
 *
 * @returns {MentorDecisionRecord} Structured decision record
 *
 * @example
 * const record = logDecision({
 *   suggestionId: 'feat-power-attack',
 *   suggestionName: 'Power Attack',
 *   factors: { theme_match: 0.9, prestige_signal: 0.7 },
 *   context: {
 *     characterName: 'Anakin',
 *     characterLevel: 6,
 *     buildFocus: 'MELEE',
 *     mentorId: 'Jedi',
 *     supportingReasons: ['Matches melee focus', 'Supports Duelist prestige']
 *   }
 * });
 */
export function logDecision(params = {}, options = {}) {
  const {
    suggestionId = 'unknown',
    suggestionName = 'Unknown',
    factors = {},
    context = {}
  } = params;

  // Validate required fields
  if (!suggestionId || typeof suggestionId !== 'string') {
    return createEmptyRecord('invalid_suggestion_id');
  }

  // Calculate intensity from factors
  const intensity = calculateIntensity(factors, options);

  // Build summary
  const summary = buildDecisionSummary({
    suggestionName,
    characterName: context.characterName,
    buildFocus: context.buildFocus,
    intensity
  });

  // Create the record
  const record = {
    // Identity
    suggestionId,
    suggestionName,
    timestamp: Date.now(),

    // Judgment data
    factors: Object.entries(factors)
      .filter(([, v]) => typeof v === 'number')
      .map(([atom, weight]) => ({
        atom,
        weight: Math.round(weight * 100) / 100
      })),

    // Calculated intensity
    intensity: {
      score: intensity.score,
      level: intensity.level,
      breakdown: intensity.breakdown.map(item => ({
        atom: item.atom,
        contribution: Math.round(item.contribution * 100) / 100
      }))
    },

    // Context
    context: {
      characterName: context.characterName || 'Unknown',
      characterLevel: context.characterLevel ?? null,
      buildFocus: context.buildFocus || null,
      mentorId: context.mentorId || null,
      supportingReasons: Array.isArray(context.supportingReasons)
        ? context.supportingReasons
        : []
    },

    // Summary
    summary
  };

  return record;
}

/**
 * Build human-readable summary of the decision.
 * @private
 */
function buildDecisionSummary(data = {}) {
  const { suggestionName, characterName, buildFocus, intensity } = data;

  const parts = [];

  if (characterName) {
    parts.push(`For ${characterName}`);
  }

  parts.push(`the suggestion of ${suggestionName}`);

  if (intensity.score > 0) {
    parts.push(`scores ${(intensity.score * 100).toFixed(0)}% intensity`);
    parts.push(`(${intensity.level})`);
  }

  if (buildFocus) {
    parts.push(`relative to ${buildFocus} focus`);
  }

  return parts.join(' ');
}

/**
 * Create an empty/error record.
 * @private
 */
function createEmptyRecord(reason) {
  return {
    suggestionId: 'error',
    suggestionName: 'Error',
    timestamp: Date.now(),
    factors: [],
    intensity: {
      score: 0,
      level: 'very_low',
      breakdown: []
    },
    context: {
      characterName: 'Unknown',
      characterLevel: null,
      buildFocus: null,
      mentorId: null,
      supportingReasons: [`Decision logging failed: ${reason}`]
    },
    summary: `Decision logging error: ${reason}`
  };
}

/**
 * Batch log multiple decisions.
 *
 * Useful for logging suggestions for multiple items at once.
 *
 * @param {Array} decisions - Array of decision parameter objects
 * @param {Object} options - Control flags (passed to each logDecision call)
 * @returns {Array} Array of MentorDecisionRecord objects
 */
export function logMultipleDecisions(decisions = [], options = {}) {
  if (!Array.isArray(decisions)) {
    return [];
  }

  return decisions
    .map(decision => logDecision(decision, options))
    .filter(record => record.suggestionId !== 'error');
}

/**
 * Validate a decision record.
 *
 * Returns true if record matches expected structure, false otherwise.
 * Useful for testing and validation.
 *
 * @param {Object} record - Record to validate
 * @returns {Object} Validation result
 *   @returns {boolean} .valid - True if record is valid
 *   @returns {Array} .errors - Array of error messages (empty if valid)
 */
export function validateRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record is not an object'] };
  }

  // Check required fields
  if (typeof record.suggestionId !== 'string') {
    errors.push('suggestionId must be a string');
  }

  if (typeof record.timestamp !== 'number' || record.timestamp <= 0) {
    errors.push('timestamp must be a positive number');
  }

  if (!record.intensity || typeof record.intensity.score !== 'number') {
    errors.push('intensity.score must be a number');
  }

  if (typeof record.intensity.level !== 'string') {
    errors.push('intensity.level must be a string');
  }

  if (!Array.isArray(record.factors)) {
    errors.push('factors must be an array');
  }

  if (!record.context || typeof record.context !== 'object') {
    errors.push('context must be an object');
  }

  if (typeof record.summary !== 'string') {
    errors.push('summary must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Serialize record to JSON string.
 *
 * @param {Object} record - Decision record
 * @returns {string} JSON representation
 */
export function serializeRecord(record) {
  return JSON.stringify(record, null, 2);
}

/**
 * Deserialize record from JSON string.
 *
 * @param {string} json - JSON string
 * @returns {Object|null} Deserialized record, or null if parsing fails
 */
export function deserializeRecord(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
