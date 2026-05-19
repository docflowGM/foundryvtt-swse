/**
 * progression-suite-launcher.js
 *
 * Canonical maintenance launcher for progression-owned suites.
 * Use this instead of legacy force/starship picker dialogs so every selection,
 * reselection, and replacement uses the V2 progression step contracts.
 */

import { launchProgression } from './progression-entry.js';

const STEP_MAP = Object.freeze({
  'force-power': 'force-powers',
  'force-powers': 'force-powers',
  'force': 'force-powers',
  'starship-maneuver': 'starship-maneuvers',
  'starship-maneuvers': 'starship-maneuvers',
  'maneuver': 'starship-maneuvers',
});

function normalizeSuiteStep(stepId) {
  return STEP_MAP[String(stepId || '').trim()] || null;
}

/**
 * Launch a canonical progression suite step in maintenance mode.
 *
 * @param {Actor} actor
 * @param {string} stepId - force-powers or starship-maneuvers alias
 * @param {object} options
 * @returns {Promise<object|null>} Progression shell / inline shell host when available
 */
export async function launchProgressionSuiteStep(actor, stepId, options = {}) {
  if (!actor) {
    ui?.notifications?.error?.('No actor provided for progression suite maintenance.');
    return null;
  }

  const canonicalStep = normalizeSuiteStep(stepId);
  if (!canonicalStep) {
    ui?.notifications?.error?.(`Unknown progression suite step: ${stepId || '(blank)'}`);
    return null;
  }

  return launchProgression(actor, {
    ...options,
    source: options.source || 'suite-maintenance',
    currentStep: canonicalStep,
    targetStep: canonicalStep,
    skipIntro: options.skipIntro ?? true,
    suiteMaintenance: true,
  });
}

export { normalizeSuiteStep };
