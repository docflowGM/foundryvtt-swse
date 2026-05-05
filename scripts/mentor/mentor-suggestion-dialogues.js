/**
 * Compatibility wrapper retained for legacy imports/macros.
 * Static suggestion dialogue text should prefer JSON under
 * data/dialogue/mentor-suggestions/ where covered.
 *
 * Runtime helpers live in scripts/mentor/mentor-suggestion-engine.js.
 */

export { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
export { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
export { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";
export {
  loadMentorSuggestionJson,
  getCachedMentorSuggestionJson,
  clearMentorSuggestionJsonCache,
  getMentorSuggestionPersonalityFromJson,
  getMentorSuggestionPhaseDialoguesFromJson,
  getMentorSuggestionRejectionFromJson
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-json-loader.js";
export {
  getMentorSuggestionDialogue,
  getMentorSuggestionDialogueFromJson,
  getMentorRejectionResponse,
  getMentorRejectionResponseFromJson,
  mentorCanScold,
  getScoldingMentorLists,
  mentorSpeak
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-engine.js";

import { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
import { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";
import {
  getMentorSuggestionDialogue,
  getMentorSuggestionDialogueFromJson,
  getMentorRejectionResponse,
  getMentorRejectionResponseFromJson,
  mentorCanScold,
  getScoldingMentorLists,
  mentorSpeak
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-engine.js";

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
