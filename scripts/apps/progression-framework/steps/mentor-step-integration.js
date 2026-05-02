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

import { getMentorGuidance, getMentorForClass, MENTORS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { MentorAdvisoryCoordinator } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-advisory-coordinator.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { MentorSuggestionPickerDialog } from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-suggestion-picker-dialog.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

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
  'general-talent': 'talentGuidance',
  'class-talent': 'talentGuidance',
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
export function getStepMentorObject(actor, shell = null) {
  const committedClass = shell?.committedSelections?.get?.('class');
  const focusedClass = shell?.focusedItem;
  const className = committedClass?.name || committedClass?.className || focusedClass?.name || actor?.system?.class?.primary?.name || actor?.system?.class?.primary || null;

  if (className) {
    const mentor = getMentorForClass(className);
    if (mentor) return mentor;
  }

  return MENTORS.Scoundrel || Object.values(MENTORS)[0];
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

    // Get mentor ID from the mentor object (handle both name and id)
    let mentorId = mentor.id || (mentor.name || '').toLowerCase().replace(/\s+/g, '_');

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

    let mentorId = mentor.id || (mentor.name || '').toLowerCase().replace(/\s+/g, '_');
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
