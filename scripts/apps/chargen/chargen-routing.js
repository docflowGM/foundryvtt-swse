/**
 * Routing and Navigation for Character Generator
 * Handles step sequencing, navigation, and progression rules
 */

import { ChargenRules } from "/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js";

/**
 * Get the list of steps for character progression
 * @param {Object} characterData - The character data
 * @param {boolean} isDroid - Whether character is a droid
 * @param {string} actorType - 'character' or 'npc'
 * @param {boolean} hasActor - Whether editing existing actor
 * @param {Function} getForcePowersNeeded - Function to determine force powers needed
 * @param {Function} getStarshipManeuversNeeded - Function to determine maneuvers needed
 * @returns {Array<string>} Array of step keys
 */
export function getSteps(
  characterData,
  isDroid,
  actorType,
  hasActor,
  getForcePowersNeeded,
  getStarshipManeuversNeeded
) {
  if (hasActor) {
    return ['abilities', 'class', 'background', 'feats', 'talents', 'skills', 'languages', 'summary'];
  }

  const steps = ['name', 'type'];

  if (isDroid) {
    steps.push('degree', 'size', 'droid-builder');
  } else {
    steps.push('species');
  }

  if (actorType === 'npc') {
    steps.push('abilities', 'skills', 'languages', 'feats', 'summary');
  } else {
    steps.push('abilities', 'class');

    const backgroundsEnabled = ChargenRules.backgroundsEnabled();
    if (backgroundsEnabled) {
      steps.push('background');
    }

    steps.push('skills', 'languages', 'feats', 'talents');

    if (!isDroid && getForcePowersNeeded() > 0) {
      steps.push('force-powers');
    }

    if (getStarshipManeuversNeeded() > 0) {
      steps.push('starship-maneuvers');
    }

    if (isDroid) {
      steps.push('droid-final');
    }

    steps.push('summary', 'shop');
  }

  return steps;
}

/**
 * Get the index of a step in the steps array
 * @param {string} stepKey - The step to find
 * @param {Array<string>} steps - The array of steps
 * @returns {number} Index of the step, or -1 if not found
 */
export function getStepIndex(stepKey, steps) {
  return steps.indexOf(stepKey);
}

/**
 * Get the next step in sequence
 * @param {string} currentStep - Current step key
 * @param {Array<string>} steps - Array of available steps
 * @returns {string|null} Next step key, or null if at end
 */
export function getNextStep(currentStep, steps) {
  const idx = getStepIndex(currentStep, steps);
  if (idx >= 0 && idx < steps.length - 1) {
    return steps[idx + 1];
  }
  return null;
}

/**
 * Get the previous step in sequence
 * @param {string} currentStep - Current step key
 * @param {Array<string>} steps - Array of available steps
 * @returns {string|null} Previous step key, or null if at start
 */
export function getPrevStep(currentStep, steps) {
  const idx = getStepIndex(currentStep, steps);
  if (idx > 0) {
    return steps[idx - 1];
  }
  return null;
}

/**
 * Find the next valid step after the current position
 * Handles cases where current step is not in the steps array
 * @param {string} currentStep - Current step key
 * @param {Array<string>} steps - Array of available steps
 * @returns {string|null} Next valid step, or null if none found
 */
export function findNextValidStep(currentStep, steps) {
  const allPossibleSteps = [
    'name', 'type', 'degree', 'size', 'droid-builder', 'species',
    'abilities', 'class', 'background', 'skills', 'languages', 'feats', 'talents',
    'force-powers', 'starship-maneuvers', 'droid-final', 'summary', 'shop'
  ];

  const currentIdx = allPossibleSteps.indexOf(currentStep);

  for (let i = currentIdx + 1; i < allPossibleSteps.length; i++) {
    if (steps.includes(allPossibleSteps[i])) {
      return allPossibleSteps[i];
    }
  }

  return null;
}

/**
 * Determine if a step can be jumped to from current position
 * @param {string} fromStep - Current step
 * @param {string} toStep - Target step
 * @param {Array<string>} steps - Array of available steps
 * @returns {boolean} True if jump is allowed
 */
export function canJumpToStep(fromStep, toStep, steps) {
  const fromIdx = getStepIndex(fromStep, steps);
  const toIdx = getStepIndex(toStep, steps);

  if (fromIdx < 0 || toIdx < 0) {
    return false;
  }

  // Allow jumping forward or backward to any available step
  return true;
}

/**
 * Check if a step should be auto-skipped
 * @param {string} stepKey - The step to check
 * @param {Object} characterData - The character data
 * @returns {boolean} True if should be skipped
 */
export function shouldAutoSkipStep(stepKey, characterData) {
  if (stepKey === 'languages') {
    const languageData = characterData.languageData;
    return languageData && languageData.additional <= 0;
  }

  return false;
}
