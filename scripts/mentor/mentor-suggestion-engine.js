/**
 * SWSE Mentor Suggestion Engine
 *
 * Runtime functions for generating contextual mentor dialogue responses.
 * Consumes JSON suggestion data first, with JS compatibility data as fallback.
 */

import { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
import { getMentorDialogueFromJSON } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import {
  getMentorSuggestionPersonalityFromJson,
  getMentorSuggestionPhaseDialoguesFromJson,
  getMentorSuggestionRejectionFromJson
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-json-loader.js";
import { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
import { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";

/**
 * Build the dialogue response from templates.
 */
function buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, fullDialogues) {
  const dialogue = phaseDialogues?.[specificType] || phaseDialogues?.default;

  if (!dialogue) {
    return { text: '...', phase: 'unknown' };
  }

  if (dialogue.combined) {
    return {
      text: dialogue.combined,
      phase: 'combined'
    };
  }

  const parts = [];

  if (dialogue.observation && (!personality || personality.usesAllLayers)) {
    parts.push(dialogue.observation);
  }

  if (dialogue.suggestion) {
    parts.push(dialogue.suggestion);
  }

  if (dialogue.respectClause && (!personality || personality.usesAllLayers)) {
    parts.push(dialogue.respectClause);
  }

  return {
    text: parts.join('\n'),
    phase: 'layered',
    layers: {
      observation: dialogue.observation,
      suggestion: dialogue.suggestion,
      respectClause: dialogue.respectClause
    }
  };
}

/**
 * Main function to generate mentor dialogue for a suggestion.
 * Synchronous compatibility API backed by JS fallback data.
 */
export function getMentorSuggestionDialogue({
  mentorClass,
  context,
  specificType = 'default',
  level,
  rejectionCount = 0,
  recommendation = {}
}) {
  const phase = getDialoguePhase(level);
  const personality = MENTOR_PERSONALITIES[mentorClass];
  const dialogues = MENTOR_SUGGESTION_DIALOGUES[mentorClass];

  if (!dialogues) {
    console.warn(`No suggestion dialogues found for mentor class: ${mentorClass}`);
    return getGenericDialogue(context, phase);
  }

  const contextDialogues = dialogues[context];
  if (!contextDialogues) {
    console.warn(`No ${context} dialogues found for mentor: ${mentorClass}`);
    return getGenericDialogue(context, phase);
  }

  const phaseDialogues = contextDialogues[phase];
  if (!phaseDialogues) {
    console.warn(`[SSOT] No ${phase} phase dialogues found for context ${context}. Mentor dialogue data is incomplete.`);
    return getGenericDialogue(context, phase);
  }

  return buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, dialogues);
}

/**
 * Async JSON-preferred suggestion lookup. Falls back to JS data when JSON is
 * missing or incomplete.
 */
export async function getMentorSuggestionDialogueFromJson({
  mentorClass,
  context,
  specificType = 'default',
  level,
  phase,
  rejectionCount = 0,
  recommendation = {}
}) {
  const effectivePhase = phase || getDialoguePhase(level);
  const [personality, phaseDialogues] = await Promise.all([
    getMentorSuggestionPersonalityFromJson(mentorClass),
    getMentorSuggestionPhaseDialoguesFromJson({ mentorClass, context, phase: effectivePhase })
  ]);

  if (phaseDialogues) {
    const response = buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, null);
    if (response && response.phase !== 'unknown') {
      response.source = 'mentor-suggestion-json';
      return response;
    }
  }

  const fallback = getMentorSuggestionDialogue({
    mentorClass,
    context,
    specificType,
    level,
    rejectionCount,
    recommendation
  });
  fallback.source = fallback.source || 'mentor-suggestion-js-fallback';
  return fallback;
}

/**
 * Get rejection response for a mentor.
 */
export function getMentorRejectionResponse(mentorClass, intensity = 'gentle') {
  const dialogues = MENTOR_SUGGESTION_DIALOGUES[mentorClass];
  if (!dialogues?.rejection) {
    return "I understand. Let's consider other options.";
  }
  return dialogues.rejection[intensity] || dialogues.rejection.gentle;
}

/**
 * Async JSON-preferred rejection response.
 */
export async function getMentorRejectionResponseFromJson(mentorClass, intensity = 'gentle') {
  return await getMentorSuggestionRejectionFromJson(mentorClass, intensity)
    || getMentorRejectionResponse(mentorClass, intensity);
}

function getGenericDialogue(context, phase) {
  const genericResponses = {
    early: {
      attribute: 'This attribute would strengthen your capabilities.',
      feat: 'This feat adds useful abilities to your repertoire.',
      talent: 'This talent enhances your specialization.',
      default: 'This choice would serve you well.'
    },
    mid: {
      attribute: 'This builds on your established strengths.',
      feat: 'A solid choice that complements your style.',
      talent: 'This talent deepens your expertise.',
      default: 'A practical choice.'
    },
    late: {
      attribute: 'You know your path. This aligns with it.',
      feat: 'Veteran selection.',
      talent: 'Master-level choice.',
      default: 'Your experience guides you well.'
    }
  };

  const phaseResponses = genericResponses[phase] || genericResponses.mid;
  return {
    text: phaseResponses[context] || phaseResponses.default,
    phase,
    generic: true
  };
}

export function mentorCanScold(mentorClass) {
  return MENTOR_PERSONALITIES[mentorClass]?.scolds ?? false;
}

export function getScoldingMentorLists() {
  const scolds = [];
  const neverScolds = [];

  for (const [mentorClass, personality] of Object.entries(MENTOR_PERSONALITIES)) {
    if (personality.scolds) {
      scolds.push(mentorClass);
    } else {
      neverScolds.push(mentorClass);
    }
  }

  return { scolds, neverScolds };
}

/**
 * Main async API used by suggestion integrations.
 */
export async function mentorSpeak({
  context,
  recommendation = {},
  reasoning = {},
  confidence = 0.5,
  playerHistory = {},
  phase,
  mentorClass,
  level
}) {
  const effectivePhase = phase || getDialoguePhase(level);
  const rejectionCount = playerHistory.rejectedSimilarAdvice || 0;

  let specificType = 'default';
  if (recommendation.attribute) {
    specificType = recommendation.attribute.toLowerCase();
  } else if (recommendation.name) {
    specificType = recommendation.name.toLowerCase();
  }

  let dialogue = await getMentorSuggestionDialogueFromJson({
    mentorClass,
    context,
    specificType,
    level,
    phase: effectivePhase,
    rejectionCount,
    recommendation
  });

  // Structured mentor JSON uses a different schema, but it can still provide a
  // final fallback for future content that opts into the canonical dialogue tree.
  if (!dialogue || (!dialogue.suggestion && !dialogue.combined && !dialogue.text)) {
    dialogue = await getMentorDialogueFromJSON(mentorClass, context, effectivePhase, specificType);
  }

  if (!dialogue || (!dialogue.suggestion && !dialogue.combined && !dialogue.text)) {
    dialogue = getMentorSuggestionDialogue({
      mentorClass,
      context,
      specificType,
      level,
      rejectionCount,
      recommendation
    });
  }

  if (confidence < 0.4) {
    dialogue.lowConfidence = true;
    dialogue.confidenceNote = 'This is less certain than usual.';
  }

  dialogue.metadata = {
    mentorClass,
    context,
    phase: effectivePhase,
    confidence,
    rejectionCount
  };

  return dialogue;
}

export { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES };

export default {
  MENTOR_PERSONALITIES,
  MENTOR_SUGGESTION_DIALOGUES,
  getMentorSuggestionDialogue,
  getMentorSuggestionDialogueFromJson,
  getMentorRejectionResponse,
  getMentorRejectionResponseFromJson,
  mentorCanScold,
  getScoldingMentorLists,
  mentorSpeak
};
