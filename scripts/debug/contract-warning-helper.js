/**
 * Contract Warning Helper
 *
 * Provides structured, grep-friendly contract violation warnings
 * used throughout Phase 8 instrumentation.
 *
 * All warnings follow pattern:
 * [ContractWarning][Domain] message
 * [DerivedWarning][Domain] message
 * [SheetFallback][Domain] message
 * [SheetConsistencyWarning][Domain] message
 */

const LOG_LEVELS = {
  WARNING: 'warn',
  ERROR: 'error',
  DEBUG: 'log'
};

/**
 * Emit structured contract warning
 * @param {string} category - Warning category (ContractWarning, DerivedWarning, SheetFallback, etc)
 * @param {string} domain - Affected domain (Abilities, Skills, HP, Defenses, etc)
 * @param {string} message - Human-readable message
 * @param {Object} context - Additional context object
 * @param {string} level - Log level (warn, error, debug)
 */
export function emitContractWarning(category, domain, message, context = {}, level = 'warn') {
  const prefix = `[${category}][${domain}]`;
  const fullMessage = `${prefix} ${message}`;

  // Always log the warning with structured format
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    domain,
    message,
    context
  };

  console[level](fullMessage, logEntry);

  // In dev/test mode, could emit to telemetry or collect for reports
  if (CONFIG?.SWSE?.debug?.collectContractWarnings) {
    window.SWSE_CONTRACT_WARNINGS ||= [];
    window.SWSE_CONTRACT_WARNINGS.push(logEntry);
  }
}

/**
 * Warn about legacy path normalization
 * @param {string} domain - Domain name
 * @param {string} legacyPath - Path that was normalized
 * @param {string} canonicalPath - Canonical path it was mapped to
 * @param {string} source - Where the normalization came from
 * @param {string} actor - Actor name or ID
 */
export function warnLegacyPathNormalization(domain, legacyPath, canonicalPath, source, actor) {
  emitContractWarning(
    'ContractWarning',
    domain,
    `legacy path normalized: ${legacyPath} -> ${canonicalPath}`,
    { source, actor },
    'warn'
  );
}

/**
 * Warn about conflicting canonical and legacy values
 * @param {string} domain - Domain name
 * @param {string} field - Field name
 * @param {*} canonicalValue - Canonical path value
 * @param {*} legacyValue - Legacy path value
 * @param {string} actor - Actor name or ID
 */
export function warnConflictingValues(domain, field, canonicalValue, legacyValue, actor) {
  emitContractWarning(
    'ContractWarning',
    domain,
    `conflicting values detected for ${field}`,
    { canonical: canonicalValue, legacy: legacyValue, actor },
    'warn'
  );
}

/**
 * Warn about missing canonical shape
 * @param {string} domain - Domain name
 * @param {string} reason - Why it was missing
 * @param {string} actor - Actor name or ID
 */
export function warnMissingCanonicalShape(domain, reason, actor) {
  emitContractWarning(
    'ContractWarning',
    domain,
    `missing canonical shape during apply: ${reason}`,
    { actor },
    'warn'
  );
}

/**
 * Warn about missing derived output
 * @param {string} domain - Domain name
 * @param {string} bundlePath - Expected derived bundle path
 * @param {string} actor - Actor name or ID
 */
export function warnMissingDerivedOutput(domain, bundlePath, actor) {
  emitContractWarning(
    'DerivedWarning',
    domain,
    `missing expected canonical derived output: ${bundlePath}`,
    { actor },
    'warn'
  );
}

/**
 * Warn about incomplete derived shape
 * @param {string} domain - Domain name
 * @param {string} problem - Description of incompleteness
 * @param {number} count - Number of affected entries
 * @param {string} actor - Actor name or ID
 */
export function warnIncompleteDerivedShape(domain, problem, count, actor) {
  emitContractWarning(
    'DerivedWarning',
    domain,
    `incomplete derived output: ${problem} (${count} entries)`,
    { actor },
    'warn'
  );
}

/**
 * Warn about sheet fallback usage
 * @param {string} domain - Domain name
 * @param {string} reason - Why fallback was needed
 * @param {string} context - Additional context
 * @param {string} actor - Actor name or ID
 */
export function warnSheetFallback(domain, reason, context, actor) {
  emitContractWarning(
    'SheetFallback',
    domain,
    `fallback rescue path used: ${reason}`,
    { context, actor },
    'warn'
  );
}

/**
 * Warn about repeated concept divergence
 * @param {string} domain - Domain name
 * @param {Array<string>} sources - Multiple sources detected
 * @param {string} expectedSource - What the canonical source should be
 * @param {string} actor - Actor name or ID
 */
export function warnConceptDivergence(domain, sources, expectedSource, actor) {
  emitContractWarning(
    'SheetConsistencyWarning',
    domain,
    `multiple active read paths detected for same concept`,
    { sources, expectedSource, actor },
    'warn'
  );
}

/**
 * Get summary of all warnings collected
 * @returns {Object} Summary of warning counts by category
 */
export function getWarningsSummary() {
  if (!window.SWSE_CONTRACT_WARNINGS) {
    return { total: 0, byCategory: {}, byDomain: {} };
  }

  const warnings = window.SWSE_CONTRACT_WARNINGS;
  const byCategory = {};
  const byDomain = {};

  for (const warning of warnings) {
    byCategory[warning.category] = (byCategory[warning.category] || 0) + 1;
    byDomain[warning.domain] = (byDomain[warning.domain] || 0) + 1;
  }

  return {
    total: warnings.length,
    byCategory,
    byDomain,
    warnings
  };
}

/**
 * Clear all collected warnings
 */
export function clearWarnings() {
  delete window.SWSE_CONTRACT_WARNINGS;
}
