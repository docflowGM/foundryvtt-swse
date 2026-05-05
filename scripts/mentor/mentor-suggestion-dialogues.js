/**
 * Compatibility wrapper retained for legacy imports/macros.
 * Static dialogue text should prefer data/dialogue/mentors JSON where covered.
 *
 * This file re-exports all original named exports from the split modules:
 *   - MENTOR_PERSONALITIES        → scripts/mentor/mentor-personalities.js
 *   - MENTOR_SUGGESTION_DIALOGUES → scripts/mentor/mentor-suggestion-data.js
 *   - Runtime functions           → scripts/mentor/mentor-suggestion-engine.js
 *
 * DO NOT add new logic here. Extend the split modules directly.
 */

// Phase/context helpers (re-exported for any legacy consumers that imported them from here)
export { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

// Static data
export { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
export { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";

// Runtime engine
export {
    getMentorSuggestionDialogue,
    getMentorRejectionResponse,
    mentorCanScold,
    getScoldingMentorLists,
    mentorSpeak
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-engine.js";

// Default export mirrors original
import { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
import { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";
import {
    getMentorSuggestionDialogue,
    getMentorRejectionResponse,
    mentorCanScold,
    getScoldingMentorLists,
    mentorSpeak
} from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-engine.js";

export default {
    MENTOR_PERSONALITIES,
    MENTOR_SUGGESTION_DIALOGUES,
    getMentorSuggestionDialogue,
    getMentorRejectionResponse,
    mentorCanScold,
    getScoldingMentorLists,
    mentorSpeak
};
