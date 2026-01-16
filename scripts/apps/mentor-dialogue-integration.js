/**
 * SWSE Mentor Dialogue Integration
 *
 * Bridges the new contextual suggestion dialogue system with the existing
 * mentor voice and guidance systems. This provides a unified API for
 * getting mentor-voiced suggestions with full context awareness.
 */

import {
    mentorSpeak,
    getMentorRejectionResponse,
    getDialoguePhase,
    MENTOR_PERSONALITIES,
    SUGGESTION_CONTEXTS
} from "./mentor-suggestion-dialogues.js";

import { MentorSuggestionVoice } from "./mentor-suggestion-voice.js";
import { MENTORS, getMentorForClass, getLevel1Class, getActiveMentor } from "./mentor-dialogues.js";

/**
 * Player suggestion history tracking
 * Tracks rejections to enable scolding system
 */
const playerSuggestionHistory = new Map();

/**
 * Get or initialize player suggestion history
 * @param {string} actorId - The actor's ID
 * @returns {Object} Player history object
 */
function getPlayerHistory(actorId) {
    if (!playerSuggestionHistory.has(actorId)) {
        playerSuggestionHistory.set(actorId, {
            rejectedSimilarAdvice: 0,
            lastRejectedContext: null,
            lastRejectedType: null,
            acceptedCount: 0,
            totalSuggestions: 0
        });
    }
    return playerSuggestionHistory.get(actorId);
}

/**
 * Record a suggestion rejection
 * @param {string} actorId - The actor's ID
 * @param {string} context - The suggestion context
 * @param {string} specificType - The specific type within context
 */
export function recordRejection(actorId, context, specificType) {
    const history = getPlayerHistory(actorId);

    // Increment rejection count if same type of advice
    if (history.lastRejectedContext === context) {
        history.rejectedSimilarAdvice++;
    } else {
        history.rejectedSimilarAdvice = 1;
        history.lastRejectedContext = context;
    }

    history.lastRejectedType = specificType;
    history.totalSuggestions++;
}

/**
 * Record a suggestion acceptance
 * @param {string} actorId - The actor's ID
 * @param {string} context - The suggestion context
 */
export function recordAcceptance(actorId, context) {
    const history = getPlayerHistory(actorId);

    // Reset rejection count on acceptance
    history.rejectedSimilarAdvice = Math.max(0, history.rejectedSimilarAdvice - 2);
    history.acceptedCount++;
    history.totalSuggestions++;
}

/**
 * Clear rejection history for an actor (e.g., when changing mentors)
 * @param {string} actorId - The actor's ID
 */
export function clearRejectionHistory(actorId) {
    const history = getPlayerHistory(actorId);
    history.rejectedSimilarAdvice = 0;
    history.lastRejectedContext = null;
    history.lastRejectedType = null;
}

/**
 * Map internal context names to suggestion engine contexts
 */
const CONTEXT_MAP = {
    "feat_selection": SUGGESTION_CONTEXTS.FEAT,
    "talent_selection": SUGGESTION_CONTEXTS.TALENT,
    "class_selection": SUGGESTION_CONTEXTS.STYLE,
    "ability_increase": SUGGESTION_CONTEXTS.ATTRIBUTE,
    "skill_training": SUGGESTION_CONTEXTS.SKILL,
    "force_option": SUGGESTION_CONTEXTS.TALENT,
    "defense_selection": SUGGESTION_CONTEXTS.DEFENSE,
    "multiclass": SUGGESTION_CONTEXTS.MULTICLASS,
    "hp": SUGGESTION_CONTEXTS.HP
};

/**
 * Generate a fully contextualized mentor suggestion
 *
 * This is the main integration function that combines:
 * - New phase-based dialogue system
 * - Existing mentor voice system (as fallback)
 * - Scolding/rejection tracking
 *
 * @param {Object} params - Suggestion parameters
 * @param {Actor} params.actor - The actor receiving the suggestion
 * @param {string} params.context - Context key (feat_selection, talent_selection, etc.)
 * @param {Object} params.suggestion - The suggestion object { name, tier, ... }
 * @param {Object} params.recommendation - Full recommendation data from engine
 * @param {Object} params.reasoning - Reasoning data from engine
 * @param {number} params.confidence - Confidence score 0-1
 * @returns {Object} Complete voiced suggestion with all metadata
 */
export function generateContextualSuggestion({
    actor,
    context,
    suggestion = {},
    recommendation = {},
    reasoning = {},
    confidence = 0.7
}) {
    // Get mentor info
    const mentorClass = getActiveMentor(actor)?.key || getLevel1Class(actor) || "Scoundrel";
    const mentor = MENTORS[mentorClass];

    if (!mentor) {
        console.warn(`Mentor not found for class: ${mentorClass}`);
        return generateFallbackSuggestion(suggestion, context);
    }

    // Get actor level
    const level = actor?.system?.level || 1;

    // Get player history for scolding system
    const history = getPlayerHistory(actor?.id || "unknown");

    // Map context to internal format
    const mappedContext = CONTEXT_MAP[context] || context;

    // Determine specific type from suggestion
    let specificType = "default";
    if (recommendation.attribute) {
        specificType = recommendation.attribute.toLowerCase();
    } else if (suggestion.name) {
        // Try to extract type from suggestion name
        specificType = extractSpecificType(suggestion.name, mappedContext);
    }

    // Generate dialogue using new system
    const dialogue = mentorSpeak({
        context: mappedContext,
        recommendation,
        reasoning,
        confidence,
        playerHistory: history,
        mentorClass,
        level
    });

    // Get phase for appropriate formatting
    const phase = getDialoguePhase(level);

    // Build the complete response
    return {
        // Mentor info
        mentorName: mentor.name,
        mentorClass,
        mentorTitle: mentor.title,
        mentorPortrait: mentor.portrait,

        // Dialogue content
        introduction: buildIntroduction(mentor, phase, context),
        mainText: dialogue.text,
        explanation: buildExplanation(mentor, suggestion, context, phase),

        // Suggestion info
        suggestionName: suggestion.name || "Unknown",
        tier: suggestion.tier || 0,
        icon: suggestion.icon || null,

        // Metadata
        phase,
        confidence,
        usedScolding: dialogue.usedScolding || false,
        lowConfidence: dialogue.lowConfidence || false,

        // Raw dialogue data for advanced use
        dialogueData: dialogue
    };
}

/**
 * Build an introduction line based on phase
 */
function buildIntroduction(mentor, phase, context) {
    // Try to get from existing voice system first
    const voiceIntro = MentorSuggestionVoice.getRandomIntroduction(mentor.name, context);

    // Modify based on phase
    if (phase === "late") {
        // Late phase - shorter, more peer-like
        const lateIntros = {
            "Miraj": "A thought, if you'll hear it.",
            "Lead": "Quick assessment.",
            "Ol' Salty": "Here's a notion, matey!",
            "J0-N1": "Master, a brief observation.",
            "Breach": "Listen."
        };
        return lateIntros[mentor.name] || voiceIntro;
    }

    return voiceIntro;
}

/**
 * Build explanation text
 */
function buildExplanation(mentor, suggestion, context, phase) {
    // Get base explanation from voice system
    const baseExplanation = MentorSuggestionVoice.getRandomExplanation(mentor.name, context);

    // For late phase, we might want shorter explanations
    if (phase === "late") {
        // Truncate or use shorter version
        const sentences = baseExplanation.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 1) {
            return sentences[0] + ".";
        }
    }

    return baseExplanation;
}

/**
 * Extract specific type from suggestion name
 */
function extractSpecificType(name, context) {
    const nameLower = name.toLowerCase();

    // For attributes
    if (context === "attribute") {
        const attributes = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
        for (const attr of attributes) {
            if (nameLower.includes(attr)) return attr;
        }
    }

    return "default";
}

/**
 * Generate fallback suggestion when mentor not found
 */
function generateFallbackSuggestion(suggestion, context) {
    return {
        mentorName: "Unknown Mentor",
        mentorClass: "unknown",
        mentorTitle: "",
        mentorPortrait: "",
        introduction: "Here's a suggestion for you.",
        mainText: "This choice would serve you well.",
        explanation: "Consider this option carefully.",
        suggestionName: suggestion.name || "Unknown",
        tier: suggestion.tier || 0,
        icon: suggestion.icon || null,
        phase: "mid",
        confidence: 0.5,
        usedScolding: false,
        lowConfidence: false
    };
}

/**
 * Get a rejection response from the mentor
 *
 * @param {Actor} actor - The actor
 * @param {string} intensity - "gentle", "accepting", or "recovery"
 * @returns {string} The rejection response
 */
export function getMentorRejection(actor, intensity = "gentle") {
    const mentorClass = getActiveMentor(actor)?.key || getLevel1Class(actor) || "Scoundrel";
    return getMentorRejectionResponse(mentorClass, intensity);
}

/**
 * Handle suggestion result (accepted or rejected)
 *
 * @param {Actor} actor - The actor
 * @param {boolean} accepted - Whether the suggestion was accepted
 * @param {string} context - The suggestion context
 * @param {string} specificType - The specific type
 * @returns {Object} Response data including any mentor reaction
 */
export function handleSuggestionResult(actor, accepted, context, specificType = null) {
    const actorId = actor?.id || "unknown";
    const mentorClass = getActiveMentor(actor)?.key || getLevel1Class(actor) || "Scoundrel";

    if (accepted) {
        recordAcceptance(actorId, context);
        return {
            accepted: true,
            reaction: null
        };
    } else {
        recordRejection(actorId, context, specificType);
        const history = getPlayerHistory(actorId);

        // Determine rejection response intensity based on history
        let intensity = "gentle";
        if (history.rejectedSimilarAdvice >= 3) {
            intensity = "accepting"; // After multiple rejections, mentor accepts it
        }
        if (history.rejectedSimilarAdvice >= 5) {
            intensity = "recovery"; // Mentor adapts their approach
        }

        return {
            accepted: false,
            reaction: getMentorRejectionResponse(mentorClass, intensity),
            rejectionCount: history.rejectedSimilarAdvice
        };
    }
}

/**
 * Get mentor personality info for UI customization
 *
 * @param {string} mentorClass - The mentor class key
 * @returns {Object} Personality configuration
 */
export function getMentorPersonality(mentorClass) {
    return MENTOR_PERSONALITIES[mentorClass] || {
        scolds: false,
        usesAllLayers: true,
        verbosity: "moderate"
    };
}

/**
 * Check if current suggestion should include scolding tone
 *
 * @param {Actor} actor - The actor
 * @returns {boolean} Whether scolding is active
 */
export function isScoldingActive(actor) {
    const mentorClass = getActiveMentor(actor)?.key || getLevel1Class(actor);
    const personality = MENTOR_PERSONALITIES[mentorClass];

    if (!personality?.scolds) return false;

    const history = getPlayerHistory(actor?.id || "unknown");
    return history.rejectedSimilarAdvice >= 1;
}

// Hook into mentor change to clear rejection history
Hooks.on("swse:mentor:changed", (data) => {
    if (data.actor?.id) {
        clearRejectionHistory(data.actor.id);
    }
});

export default {
    generateContextualSuggestion,
    getMentorRejection,
    handleSuggestionResult,
    getMentorPersonality,
    isScoldingActive,
    recordRejection,
    recordAcceptance,
    clearRejectionHistory
};
