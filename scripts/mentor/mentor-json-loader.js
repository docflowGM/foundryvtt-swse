/**
 * Mentor JSON Loader - Loads mentor data from data/dialogue as single source of truth
 * Provides unified mentor interface with personalities, dialogues, and metadata
 */

import { SWSELogger } from '../utils/logger.js';

/**
 * Cache for loaded mentors
 */
let mentorCache = null;
let mentorRegistry = null;

/**
 * Load all mentor data from JSON files
 * @returns {Promise<Object>} Loaded mentor data
 */
export async function loadMentorsFromJSON() {
    if (mentorCache) {
        return mentorCache;
    }

    try {
        // Load mentor registry
        const registryPath = 'systems/foundryvtt-swse/data/dialogue/mentor_registry.json';
        mentorRegistry = await fetch(registryPath).then(r => r.json());

        // Load reasons
        const reasonsPath = 'systems/foundryvtt-swse/data/dialogue/reasons.json';
        const reasonsData = await fetch(reasonsPath).then(r => r.json());

        const mentors = {};

        // For each mentor in registry, load their data
        for (const [mentorKey, registryEntry] of Object.entries(mentorRegistry.mentors)) {
            try {
                const mentorId = registryEntry.mentor_id;
                const displayName = registryEntry.display_name;

                // Determine actual folder name (handle naming variations)
                const folderMap = {
                    'anchorite': 'riquis',
                    'delta_assassin': 'delta',
                    'skindar': 'marl_skindar',
                    'venn': 'vera'
                };
                const folderName = folderMap[mentorKey] || mentorKey;

                // Load metadata file
                const metadataPath = `systems/foundryvtt-swse/data/dialogue/mentors/${folderName}/${folderName}.json`;
                const metadata = await fetch(metadataPath).then(r => r.json()).catch(() => ({}));

                // Load dialogue file (handle naming variations)
                let dialogueData = null;
                const possibleDialoguePaths = [
                    `systems/foundryvtt-swse/data/dialogue/mentors/${folderName}/${folderName}_dialogue.json`,
                    `systems/foundryvtt-swse/data/dialogue/mentors/${folderName}/${folderName}_dialogues.json`,
                    `systems/foundryvtt-swse/data/dialogue/mentors/${folderName}/${folderName.charAt(0).toUpperCase() + folderName.slice(1)}_dialogues.json`
                ];

                for (const path of possibleDialoguePaths) {
                    try {
                        dialogueData = await fetch(path).then(r => r.json());
                        break;
                    } catch (e) {
                        // Try next path
                    }
                }

                if (!dialogueData) {
                    SWSELogger.warn(`[MENTOR-JSON-LOADER] No dialogue file found for mentor: ${mentorKey}`);
                    dialogueData = {};
                }

                // Merge metadata and dialogue data
                const mentorData = {
                    mentor_id: mentorId,
                    mentorId: mentorKey,
                    displayName,
                    ...metadata,
                    ...dialogueData
                };

                mentors[mentorKey] = mentorData;
                mentors[displayName] = mentorData; // Index by display name too

                SWSELogger.log(`[MENTOR-JSON-LOADER] Loaded mentor: ${displayName} (${mentorId})`);
            } catch (err) {
                SWSELogger.error(`[MENTOR-JSON-LOADER] Error loading mentor ${mentorKey}:`, err);
            }
        }

        mentorCache = {
            mentors,
            registry: mentorRegistry,
            reasons: reasonsData
        };

        SWSELogger.log(`[MENTOR-JSON-LOADER] Successfully loaded ${Object.keys(mentors).length} mentor entries`);
        return mentorCache;
    } catch (err) {
        SWSELogger.error(`[MENTOR-JSON-LOADER] Error loading mentors from JSON:`, err);
        return { mentors: {}, registry: {}, reasons: {} };
    }
}

/**
 * Get loaded mentors (with caching)
 * @returns {Promise<Object>} Mentors data
 */
export async function getMentors() {
    if (!mentorCache) {
        await loadMentorsFromJSON();
    }
    return mentorCache.mentors;
}

/**
 * Get a specific mentor by key or name
 * @param {string} key - Mentor key or display name
 * @returns {Promise<Object>} Mentor data
 */
export async function getMentor(key) {
    const mentors = await getMentors();
    return mentors[key] || null;
}

/**
 * Get all reasons
 * @returns {Promise<Object>} Reasons mapping
 */
export async function getReasons() {
    if (!mentorCache) {
        await loadMentorsFromJSON();
    }
    return mentorCache.reasons;
}

/**
 * Get reason text by code from reasons.json
 * @param {string} reasonCode - The reason code
 * @returns {Promise<string>} The reason text (e.g., "because your wisdom...")
 */
export async function getReasonText(reasonCode) {
    if (!reasonCode) {return '';}

    const reasons = await getReasons();
    return reasons[reasonCode] || '';
}

/**
 * Select best reason from available reasons based on context
 * @param {Array<string>} reasonCodes - Array of reason codes to choose from
 * @param {Object} context - Context for selection (attributes, skills, etc.)
 * @returns {Promise<string>} Selected reason text
 */
export async function selectBestReason(reasonCodes, context = {}) {
    if (!reasonCodes || reasonCodes.length === 0) {
        return 'because this aligns with your path';
    }

    const reasons = await getReasons();

    // Score each reason based on context
    let bestReason = null;
    let bestScore = -Infinity;

    for (const code of reasonCodes) {
        const reasonText = reasons[code];
        if (!reasonText) {continue;}

        let score = 0;

        // Boost score based on context matching
        if (context.attributes) {
            for (const attr of Object.keys(context.attributes)) {
                if (reasonText.includes(attr.toLowerCase())) {
                    score += 2;
                }
            }
        }

        if (context.skills) {
            for (const skill of Object.keys(context.skills)) {
                if (reasonText.includes(skill.toLowerCase())) {
                    score += 1.5;
                }
            }
        }

        if (context.talentTree && reasonText.includes('talent')) {
            score += 1;
        }

        if (context.feats && reasonText.includes('feat')) {
            score += 1;
        }

        // Add small randomness to avoid always picking first
        score += Math.random() * 0.1;

        if (score > bestScore) {
            bestScore = score;
            bestReason = reasonText;
        }
    }

    return bestReason || reasons[reasonCodes[0]] || 'because this suits your development';
}

/**
 * Get mentor suggestion dialogue from JSON data
 * @param {string} mentorKey - Mentor identifier
 * @param {string} context - Suggestion context (attribute, feat, talent, etc.)
 * @param {string} phase - Dialogue phase (early, mid, late)
 * @param {string} specificType - Specific attribute/feat/etc. type
 * @returns {Promise<Object>} Dialogue structure
 */
export async function getMentorDialogueFromJSON(mentorKey, context, phase, specificType) {
    const mentor = await getMentor(mentorKey);
    if (!mentor) {
        return { observation: '', suggestion: '', respectClause: '' };
    }

    // Navigate the dialogue structure
    // This would follow the structure in the JSON files
    try {
        // Try to find in dialogues object
        if (mentor.dialogues && mentor.dialogues[context]) {
            const contextDialogues = mentor.dialogues[context];
            if (contextDialogues[phase]) {
                const phaseDialogues = contextDialogues[phase];
                if (phaseDialogues[specificType]) {
                    return phaseDialogues[specificType];
                }
                // Try default
                if (phaseDialogues.default) {
                    return phaseDialogues.default;
                }
            }
        }
    } catch (err) {
        SWSELogger.warn(`[MENTOR-JSON-LOADER] Error retrieving dialogue for ${mentorKey}:`, err);
    }

    return { observation: '', suggestion: '', respectClause: '' };
}

export default {
    loadMentorsFromJSON,
    getMentors,
    getMentor,
    getReasons,
    getReasonText,
    selectBestReason,
    getMentorDialogueFromJSON
};
