/**
 * suite-reselection-utils.js
 * Suite Reselection Guard Utilities (Phase 3.4)
 *
 * Pure guard logic for determining whether suite reselection is allowed.
 * No side effects. No mutations. Callable from anywhere.
 */

/**
 * Check if suite reselection is enabled via world setting
 * @returns {boolean} True if setting is enabled
 */
export function isSuiteReselectionEnabled() {
  try {
    return game.settings.get("foundryvtt-swse", "allowSuiteReselection") === true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if suite reselection is allowed in this context
 * Context must be "levelup" and setting must be enabled.
 *
 * CRITICAL RULE: Only level-up context is allowed.
 * All other contexts (character sheet, mid-session, etc) are blocked.
 *
 * @param {string} context - Current operation context ("levelup", "sheet", etc)
 * @returns {boolean} True if reselection is allowed
 */
export function canReselectSuite(context) {
  // CRITICAL: Only level-up context allowed
  if (context !== "levelup") {
    return false;
  }

  // Check if setting enabled
  return isSuiteReselectionEnabled();
}
