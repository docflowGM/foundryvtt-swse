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


const JOB_STEP_MAP = Object.freeze({
  'choose-feat': 'general-feat',
  feat: 'general-feat',
  feats: 'general-feat',
  'class-feat': 'class-feat',
  'choose-talent': 'general-talent',
  talent: 'general-talent',
  talents: 'general-talent',
  'class-talent': 'class-talent',
  'ability-increase': 'attribute',
  attribute: 'attribute',
  attributes: 'attribute',
  background: 'background',
  skills: 'skills',
  languages: 'languages',
  'force-power': 'force-powers',
  'force-powers': 'force-powers',
  'force-regimen': 'force-regimens',
  'force-regimens': 'force-regimens',
  'force-secret': 'force-secrets',
  'force-secrets': 'force-secrets',
  'force-technique': 'force-techniques',
  'force-techniques': 'force-techniques',
  'medical-secret': 'medical-secrets',
  'medical-secrets': 'medical-secrets',
  'starship-maneuver': 'starship-maneuvers',
  'starship-maneuvers': 'starship-maneuvers',
});

function normalizeProgressionJobStep(jobOrStep) {
  const key = String(jobOrStep || '').trim();
  return JOB_STEP_MAP[key] || STEP_MAP[key] || key || null;
}

function domainForStep(stepId) {
  if (/feat/i.test(stepId)) return 'feats';
  if (/talent/i.test(stepId)) return 'talents';
  if (stepId === 'attribute') return 'attributes';
  if (stepId === 'background') return 'background';
  if (stepId === 'skills') return 'skills';
  if (stepId === 'languages') return 'languages';
  if (stepId === 'force-powers') return 'forcePowers';
  if (stepId === 'force-regimens') return 'forceRegimens';
  if (stepId === 'force-secrets') return 'forceSecrets';
  if (stepId === 'force-techniques') return 'forceTechniques';
  if (stepId === 'medical-secrets') return 'medicalSecrets';
  if (stepId === 'starship-maneuvers') return 'starshipManeuvers';
  return null;
}

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

export async function launchProgressionJob(actor, job, options = {}) {
  if (!actor) {
    ui?.notifications?.error?.('No actor provided for progression job.');
    return null;
  }

  const canonicalStep = normalizeProgressionJobStep(options.stepId || options.targetStep || options.currentStep || job);
  if (!canonicalStep) {
    ui?.notifications?.error?.(`Unknown progression job: ${job || '(blank)'}`);
    return null;
  }

  return launchProgression(actor, {
    ...options,
    source: options.source || 'single-progression-job',
    currentStep: canonicalStep,
    targetStep: canonicalStep,
    stepId: canonicalStep,
    skipIntro: options.skipIntro ?? true,
    singleStep: true,
    singleStepJob: job || canonicalStep,
    singleStepDomain: options.singleStepDomain || domainForStep(canonicalStep),
    closeOnCommit: options.closeOnCommit ?? true,
    returnTo: options.returnTo || 'character-sheet',
  });
}

export { normalizeSuiteStep, normalizeProgressionJobStep };
