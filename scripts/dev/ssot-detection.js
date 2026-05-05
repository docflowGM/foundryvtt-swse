/**
 * SWSE SSOT Detection Layer
 *
 * Lightweight, opt-in detection of direct actor.items access bypassing ActorAbilityBridge.
 * Routes violations through Sentinel Engine for centralized reporting.
 *
 * Enable via console:
 * globalThis.SWSE_DEV_MODE = true;
 *
 * Then play normally. Violations are reported to Sentinel Engine.
 */

globalThis.SWSE_DEV_MODE = globalThis.SWSE_DEV_MODE ?? false;

/**
 * Format a detected SSOT violation for Sentinel reporting.
 * @param {Actor} actor
 * @param {string} methodName - 'filter', 'some', 'map', 'find'
 * @param {string} stack - Error stack trace
 * @returns {Object} Formatted violation payload
 */
export function formatSSOTViolation(actor, methodName, stack) {
  return {
    actor: actor?.name,
    method: methodName,
    stack: stack.split('\n').slice(2, 8)
  };
}
