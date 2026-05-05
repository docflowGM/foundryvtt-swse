/**
 * SWSE Mentor Suggestion Engine
 *
 * Runtime functions for generating contextual mentor dialogue responses.
 * Consumes static data from mentor-personalities.js and mentor-suggestion-data.js.
 *
 * Exports:
 *   getMentorSuggestionDialogue  - Primary lookup: class + context + phase → dialogue object
 *   getMentorRejectionResponse   - Rejection tone lookup
 *   mentorCanScold               - Check if mentor uses scolding system
 *   getScoldingMentorLists       - Partition all mentors by scold flag
 *   mentorSpeak                  - Async integration API (JSON-first, JS fallback)
 */

import { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
import { getMentorDialogueFromJSON } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import { MENTOR_PERSONALITIES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-personalities.js";
import { MENTOR_SUGGESTION_DIALOGUES } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-data.js";

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Build the dialogue response from templates
 */
function buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, fullDialogues) {
    // Try specific type first, then default
    const dialogue = phaseDialogues[specificType] || phaseDialogues['default'];

    if (!dialogue) {
        return { text: '...', phase: 'unknown' };
    }

    // Handle combined format (mid/late phases often use single string)
    if (dialogue.combined) {
        const text = dialogue.combined;

        return {
            text,
            phase: 'combined'
        };
    }

    // Build three-layer response
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
 * Get generic fallback dialogue
 */
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

// ============================================================================
// EXPORTED RUNTIME FUNCTIONS
// ============================================================================

/**
 * Get mentor suggestion dialogue for a given context and phase
 * @param {Object} params
 * @param {string} params.mentorClass   - Mentor class key (e.g. "Jedi", "Soldier")
 * @param {string} params.context       - Dialogue context ("attribute", "feat", "talent", etc.)
 * @param {string} [params.specificType] - Specific sub-type within context (default: "default")
 * @param {number} [params.level]       - Character level (used to derive phase)
 * @param {number} [params.rejectionCount] - How many times player rejected similar advice
 * @param {Object} [params.recommendation] - Recommendation data
 * @returns {Object} Dialogue response object
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

    // Get context-specific dialogues
    const contextDialogues = dialogues[context];
    if (!contextDialogues) {
        console.warn(`No ${context} dialogues found for mentor: ${mentorClass}`);
        return getGenericDialogue(context, phase);
    }

    // Get phase-specific dialogues
    const phaseDialogues = contextDialogues[phase];
    if (!phaseDialogues) {
        console.warn(`[SSOT] No ${phase} phase dialogues found for context ${context}. Mentor dialogue data is incomplete.`);
        return getGenericDialogue(context, phase);
    }

    return buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, dialogues);
}

/**
 * Get rejection response for a mentor
 * @param {string} mentorClass - The mentor's class key
 * @param {string} intensity   - "gentle", "accepting", or "recovery"
 * @returns {string} The rejection response text
 */
export function getMentorRejectionResponse(mentorClass, intensity = 'gentle') {
    const dialogues = MENTOR_SUGGESTION_DIALOGUES[mentorClass];
    if (!dialogues?.rejection) {
        return "I understand. Let's consider other options.";
    }
    return dialogues.rejection[intensity] || dialogues.rejection.gentle;
}

/**
 * Check if a mentor uses the scolding system
 * @param {string} mentorClass - The mentor class key
 * @returns {boolean}
 */
export function mentorCanScold(mentorClass) {
    return MENTOR_PERSONALITIES[mentorClass]?.scolds ?? false;
}

/**
 * Get the list of mentors who scold vs. who don't
 * @returns {Object} Object with 'scolds' and 'neverScolds' arrays
 */
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

// ============================================================================
// INTEGRATION API
// ============================================================================

/**
 * Main API function for the suggestion engine to call.
 * Tries JSON dialogue files first, falls back to hardcoded JS data.
 *
 * @param {Object} speakParams
 * @param {string} speakParams.context          - "attribute" | "feat" | "talent" | "defense" | "style"
 * @param {Object} [speakParams.recommendation] - Recommendation data
 * @param {Object} [speakParams.reasoning]      - Reasoning data
 * @param {number} [speakParams.confidence]     - Confidence score 0.0–1.0
 * @param {Object} [speakParams.playerHistory]  - Player history data
 * @param {string} [speakParams.phase]          - "early" | "mid" | "late" (or derived from level)
 * @param {string} speakParams.mentorClass      - The mentor class key
 * @param {number} [speakParams.level]          - Character level
 * @returns {Promise<Object>} Complete dialogue response
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
    // Derive phase from level if not provided
    const effectivePhase = phase || getDialoguePhase(level);

    // Calculate rejection count from player history
    const rejectionCount = playerHistory.rejectedSimilarAdvice || 0;

    // Determine specific type from recommendation
    let specificType = 'default';
    if (recommendation.attribute) {
        specificType = recommendation.attribute.toLowerCase();
    } else if (recommendation.name) {
        specificType = recommendation.name.toLowerCase();
    }

    // Try to get dialogue from JSON files first (source of truth)
    let dialogue = await getMentorDialogueFromJSON(mentorClass, context, effectivePhase, specificType);

    // Fall back to hardcoded data if not found in JSON
    if (!dialogue || (!dialogue.suggestion && !dialogue.combined)) {
        dialogue = getMentorSuggestionDialogue({
            mentorClass,
            context,
            specificType,
            level,
            rejectionCount,
            recommendation
        });
    }

    // Add confidence indicator for low-confidence suggestions
    if (confidence < 0.4) {
        dialogue.lowConfidence = true;
        dialogue.confidenceNote = 'This is less certain than usual.';
    }

    // Add metadata
    dialogue.metadata = {
        mentorClass,
        context,
        phase: effectivePhase,
        confidence,
        rejectionCount
    };

    return dialogue;
}

export default {
    getMentorSuggestionDialogue,
    getMentorRejectionResponse,
    mentorCanScold,
    getScoldingMentorLists,
    mentorSpeak
};
