/**
 * Mentor Step Integration
 *
 * ARCHITECTURE: Mentor Dialogue vs Suggestion Authority
 *
 * This module maintains a clean separation between two distinct mentor systems:
 *
 * 1. MENTOR DIALOGUE AUTHORITY (dialogue JSON files)
 *    - Source: data/dialogue/mentors/{mentor_id}/{mentor_id}_dialogue*.json
 *    - Contains: voice, instructions, contextual guidance, character philosophy
 *    - Used for: step guidance, mentorContext (in-character instructions)
 *    - Examples:
 *      * classGuidance - "Choose the path that aligns..."
 *      * speciesGuidance - "Yer bloodline shapes what ye can do..."
 *      * talentGuidance - "Every talent is a tool..."
 *      * levelGreetings - Achievement commentary
 *
 * 2. SUGGESTION ENGINE + ADVISORY STUB (engine + advisory JSON)
 *    - Engine: Logic that analyzes build and produces recommendations
 *    - Advisory Stub: data/dialogue/mentors/{mentor_id}/{mentor_id}_advisory_stub.json
 *    - Advisory stub contains: templates to wrap recommendations in mentor voice
 *    - Used for: "Ask Mentor" recommendations, build analysis feedback
 *    - Flow: Engine → recommendation → advisory stub template → mentor voice
 *
 * CRITICAL RULE: Do not mix these systems.
 *    ✓ Instructions come from dialogue files
 *    ✗ Do not hardcode instructions when dialogue authority exists
 *    ✓ Recommendations come from suggestion engine + advisory stub
 *    ✗ Do not author recommendations directly in dialogue files
 *
 * This allows mentor dialogue to remain consistent voice/character while
 * letting the suggestion engine be the authoritative recommendation logic.
 *
 * Common helper for step plugins to integrate with the mentor system.
 * Provides Ask Mentor functionality and guidance context.
 */

import { getMentorGuidance, getMentorForClass, MENTORS, getMentorKey, resolveMentorData } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { MentorAdvisoryCoordinator } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-advisory-coordinator.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { MentorSuggestionPickerDialog } from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-suggestion-picker-dialog.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Extract mentor ID from mentor object.
 * Uses multiple fallbacks to ensure we always have a valid ID.
 * @param {Object} mentor - The mentor object
 * @returns {string} The mentor ID (e.g., "ol_salty", "miraj")
 */
function getMentorIdFromObject(mentor) {
  if (!mentor) return 'scoundrel'; // Safe default

  // First try: direct id fields from loaded mentor data
  if (mentor.id) return mentor.id;
  if (mentor.mentorId) return mentor.mentorId;
  if (mentor.mentor_id) return mentor.mentor_id;

  // Second try: look up by name in MENTORS
  if (mentor.name) {
    const key = getMentorKey(mentor.name);
    if (key) return key.toLowerCase().replace(/\s+/g, '_');
  }

  // Third try: normalize the name directly
  if (mentor.name) {
    return mentor.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // Fallback to safe default
  return 'scoundrel';
}

/**
 * Maps step choice types to mentor guidance keys.
 * Used by step plugins to request appropriate guidance.
 */
export const STEP_TO_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'attribute': 'ability',
  'ability': 'ability',
  'ability-scores': 'ability',
  'l1-survey': 'survey',
  'base-class-survey': 'survey',
  'background': 'background',
  'skills': 'skill',
  'languages': 'language',
  'general-feat': 'feat',
  'class-feat': 'feat',
  'general-talent': 'talent',
  'class-talent': 'talent',
  'force-powers': 'force_power',
  'force-secrets': 'force_secret',
  'force-techniques': 'force_technique',
  'medical-secrets': 'skill',
  'starship-maneuver': 'starship_maneuver',
  'starship-maneuvers': 'starship_maneuver',
  'summary': 'summary',
  'confirm': 'summary',
};

/**
 * Get the mentor object for the current actor/class.
 * Falls back to Scoundrel's Ol' Salty if class unknown.
 *
 * @param {Actor} actor - The actor being created
 * @returns {Object|null} The mentor data object
 */
export function getStepMentorObject(actor, shell = null) {
  const sessionClass = shell?.progressionSession?.getSelection?.('class');
  const draftClass = shell?.progressionSession?.draftSelections?.class;
  const committedClass = shell?.committedSelections?.get?.('class');

  // focusedItem is used by many non-class steps for details rail hydration. Do
  // not treat a focused Force power/talent/skill as the actor's mentor class.
  // Only class-step focus is a safe mentor-class hint before the class is
  // committed.
  const currentStepId = shell?.currentDescriptor?.stepId || shell?.steps?.[shell?.currentStepIndex]?.stepId || null;
  const focusedClass = currentStepId === 'class' ? shell?.focusedItem : null;

  const className = sessionClass?.name
    || sessionClass?.className
    || sessionClass?.id
    || draftClass?.name
    || draftClass?.className
    || draftClass?.id
    || committedClass?.name
    || committedClass?.className
    || committedClass?.id
    || focusedClass?.name
    || focusedClass?.className
    || actor?.system?.class?.primary?.name
    || actor?.system?.class?.primary
    || null;

  if (className) {
    const mentor = resolveMentorData(className) || getMentorForClass(className);
    if (mentor) return mentor;
  }

  return resolveMentorData('Scoundrel') || MENTORS.Scoundrel || Object.values(MENTORS)[0];
}

/**
 * Get guidance text for a step.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @returns {string} The guidance text
 */
export function getStepGuidance(actor, stepId, shell = null) {
  const mentor = getStepMentorObject(actor, shell);
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
  const mentor = getStepMentorObject(actor, shell);
  const guidance = getStepGuidance(actor, stepId, shell);

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
export function getStepMentorContext(actor, stepId, fallback = '', shell = null) {
  const guidance = getStepGuidance(actor, stepId, shell);
  return guidance || fallback || 'Make your choice wisely.';
}

/**
 * Phase 8: Handle Ask Mentor with suggestion advisory.
 * Gets suggestions from a step, formats them as mentor dialogue, and speaks them.
 *
 * This is the preferred Ask Mentor handler for steps with suggestions.
 * Steps call this instead of handleAskMentor when they have _suggestedXXX data.
 *
 * Flow: suggestions → MentorAdvisoryCoordinator.generateSuggestionAdvisory()
 *       → mentor advisory object → mentorRail.speak()
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID (for context/fallback)
 * @param {Array} suggestions - Suggestion objects from SuggestionService
 * @param {import('./shell/progression-shell.js').ProgressionShell} shell - The progression shell
 * @param {Object} context - Additional context (domain, archetype, relatedGrowth, etc.)
 * @returns {Promise<void>}
 */
export async function handleAskMentorWithSuggestions(actor, stepId, suggestions, shell, context = {}) {
  try {
    if (!shell?.mentorRail) return;

    // Get mentor ID from actor/class
    const mentor = getStepMentorObject(actor, shell);
    if (!mentor) return;

    // Get mentor ID from the mentor object with robust fallback chain
    let mentorId = getMentorIdFromObject(mentor);

    // Generate suggestion advisory
    const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
      actor,
      mentorId,
      suggestions || [],
      {
        stepId,
        domain: context.domain || stepId,
        archetype: context.archetype || 'your path',
        relatedGrowth: context.relatedGrowth || 'further growth',
        ...context
      }
    );

    if (advisory) {
      // Speak the advisory through mentor rail with mood based on confidence
      const advisoryText = `${advisory.observation} ${advisory.impact} ${advisory.guidance}`;
      const mood = advisory.mood || 'encouraging'; // Use confidence-based mood from advisor
      await shell.mentorRail.speak(advisoryText, mood);

      swseLogger.log(
        `[MentorStepIntegration] Spoke suggestion advisory for ${stepId} (${suggestions.length} suggestions, mood: ${mood})`
      );
    } else {
      // Fallback to standard guidance if no advisory generated
      const guidance = getStepGuidance(actor, stepId, shell);
      if (guidance) {
        await shell.mentorRail.speak(guidance, 'encouraging');
      }
    }
  } catch (err) {
    swseLogger.warn('[MentorStepIntegration] Error in handleAskMentorWithSuggestions:', err);
    // Fallback to standard guidance on error
    const guidance = getStepGuidance(actor, stepId, shell);
    if (guidance && shell?.mentorRail) {
      await shell.mentorRail.speak(guidance, 'encouraging');
    }
  }
}


function sortSuggestionsForPicker(suggestions = []) {
  return SuggestionService.sortBySuggestion(suggestions || []).filter(entry => {
    const tier = entry?.suggestion?.tier ?? entry?.tier ?? 0;
    return tier > 0;
  });
}

function humanizeStepLabel(stepId) {
  return String(stepId || 'this step').replace(/[-_]+/g, ' ');
}

export async function handleAskMentorWithPicker(actor, stepId, suggestions, shell, context = {}, applySuggestion = null) {
  try {
    const rankedSuggestions = sortSuggestionsForPicker(suggestions).slice(0, context.limit ?? 5);
    if (!rankedSuggestions.length) {
      await handleAskMentor(actor, stepId, shell);
      return null;
    }

    const mentor = getStepMentorObject(actor, shell);
    if (!mentor) {
      await handleAskMentor(actor, stepId, shell);
      return null;
    }

    let mentorId = getMentorIdFromObject(mentor);
    const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
      actor,
      mentorId,
      rankedSuggestions,
      {
        stepId,
        domain: context.domain || stepId,
        archetype: context.archetype || 'your path',
        relatedGrowth: context.relatedGrowth || 'future growth',
        ...context,
      }
    );

    const selected = await MentorSuggestionPickerDialog.show({
      mentor,
      advisory,
      suggestions: rankedSuggestions,
      stepLabel: context.stepLabel || humanizeStepLabel(stepId),
      title: `${mentor.name || 'Mentor'}'s Top Picks`,
    });

    if (selected && typeof applySuggestion === 'function') {
      await applySuggestion(selected);
    }

    return selected;
  } catch (err) {
    swseLogger.warn('[MentorStepIntegration] Error in handleAskMentorWithPicker:', err);
    await handleAskMentor(actor, stepId, shell);
    return null;
  }
}
