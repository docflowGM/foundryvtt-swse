/**
 * Mentor Step Integration
 *
 * Common helper for step plugins to integrate with the mentor system.
 * Provides Ask Mentor functionality and guidance context.
 */

import { getMentorGuidance, getMentorForClass, MENTORS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';

/**
 * Maps step choice types to mentor guidance keys.
 * Used by step plugins to request appropriate guidance.
 */
export const STEP_TO_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'attribute': 'ability',
  'l1-survey': 'skill',          // Survey focuses on build implications
  'background': 'background',
  'languages': 'languageGuidance',
  'general-feat': 'feat',
  'class-feat': 'feat',
  'general-talent': 'talent',
  'class-talent': 'talent',
  'force-powers': 'force_power',
  'confirm': 'summaryGuidance',
};

/**
 * Get the mentor object for the current actor/class.
 * Falls back to Scoundrel's Ol' Salty if class unknown.
 *
 * @param {Actor} actor - The actor being created
 * @returns {Object|null} The mentor data object
 */
export function getStepMentorObject(actor) {
  if (!actor) return MENTORS.Scoundrel || Object.values(MENTORS)[0];

  // Try to get class from actor if already selected
  const classData = actor.system?.class?.primary;
  const className = classData?.name || classData;

  if (className && MENTORS[className]) {
    return MENTORS[className];
  }

  // Default to Scoundrel
  return MENTORS.Scoundrel || Object.values(MENTORS)[0];
}

/**
 * Get guidance text for a step.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @returns {string} The guidance text
 */
export function getStepGuidance(actor, stepId) {
  const mentor = getStepMentorObject(actor);
  const choiceType = STEP_TO_CHOICE_TYPE[stepId];

  if (!mentor) return 'Make your choice wisely.';
  if (!choiceType) return mentor.classGuidance || 'Continue with purpose.';

  return getMentorGuidance(mentor, choiceType) || 'Trust your instincts.';
}

/**
 * Prepare Ask Mentor handler for a step plugin.
 * Call this in onStepEnter() to set up mentor integration.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @param {import('./shell/progression-shell.js').ProgressionShell} shell - The progression shell
 * @returns {Promise<void>}
 */
export async function handleAskMentor(actor, stepId, shell) {
  const mentor = getStepMentorObject(actor);
  const guidance = getStepGuidance(actor, stepId);

  if (guidance && shell?.mentorRail) {
    await shell.mentorRail.speak(guidance, 'encouraging');
  }
}

/**
 * Get step context message that uses mentor guidance.
 * Suitable for getMentorContext() implementation.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @param {string} fallback - Fallback message if no guidance found
 * @returns {string} The context message
 */
export function getStepMentorContext(actor, stepId, fallback = '') {
  const guidance = getStepGuidance(actor, stepId);
  return guidance || fallback || 'Make your choice wisely.';
}
