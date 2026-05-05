/**
 * Mentor Decision Logging
 *
 * Dev-only instrumentation that traces the complete flow of mentor response determination.
 * Shows: facts → rule match → judgment + intensity → rendering
 *
 * Logs are written to console and optionally to a trace object for inspection.
 * Enable with: MENTOR_LOGGING_ENABLED = true
 */

// Global flag: set to true to enable logging
export let MENTOR_LOGGING_ENABLED = false;

// Trace history for inspection (dev tools)
export const MENTOR_TRACE_HISTORY = [];

/**
 * Log a mentor decision trace
 * Called during selectMentorResponse() execution
 *
 * @param {Object} trace - Complete decision information
 */
export function logMentorDecision(trace) {
  if (!MENTOR_LOGGING_ENABLED) {
    return;
  }

  // Format timestamp
  const timestamp = new Date().toLocaleTimeString();

  // Build console output
  const output = {
    timestamp,
    character: trace.characterName || 'Unknown',
    mentor: trace.mentorId,
    facts: trace.reasons || [],
    matchedRule: trace.ruleLabel || 'fallback',
    judgment: trace.judgment,
    intensity: trace.intensity,
    phrases: trace.renderedPhrase ? [trace.renderedPhrase] : []
  };

  // Store in history
  MENTOR_TRACE_HISTORY.push(output);

  // Console output
  console.group(`[Mentor Decision] ${output.character} → ${output.mentor}`);
  console.log('Facts:', output.facts);
  console.log('Matched Rule:', output.matchedRule);
  console.log('Decision:', `${output.judgment} @ ${output.intensity}`);
  if (output.phrases.length > 0) {
    console.log('Rendered:', output.phrases[0]);
  }
  console.groupEnd();
}

/**
 * Clear trace history
 */
export function clearMentorTraces() {
  MENTOR_TRACE_HISTORY.length = 0;
}

/**
 * Get recent traces (last N)
 * @param {number} count - Number of recent traces to return
 * @returns {Object[]} Array of recent traces
 */
export function getRecentTraces(count = 10) {
  return MENTOR_TRACE_HISTORY.slice(-count);
}

/**
 * Format traces for human inspection
 * @param {Object[]} traces - Array of traces
 * @returns {string} Formatted trace report
 */
export function formatTracesReport(traces) {
  let report = '=== Mentor Decision Trace Report ===\n\n';

  for (const trace of traces) {
    report += `[${trace.timestamp}] ${trace.character} asked ${trace.mentor}\n`;
    report += `  Facts: ${trace.facts.join(', ') || '(none)'}\n`;
    report += `  Rule: ${trace.matchedRule}\n`;
    report += `  Judgment: ${trace.judgment} (${trace.intensity})\n`;
    if (trace.phrases.length > 0) {
      report += `  Response: "${trace.phrases[0]}"\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Enable/disable logging globally
 * @param {boolean} enabled - Whether to enable logging
 */
export function setMentorLoggingEnabled(enabled) {
  MENTOR_LOGGING_ENABLED = enabled;
  if (enabled) {
    console.log('[MentorLogger] Logging ENABLED');
  } else {
    console.log('[MentorLogger] Logging DISABLED');
  }
}

/**
 * Get logging status
 * @returns {boolean} True if logging is enabled
 */
export function isMentorLoggingEnabled() {
  return MENTOR_LOGGING_ENABLED;
}
