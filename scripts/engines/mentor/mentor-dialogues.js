import { ProgressionEngine } from '../../progression/engine/progression-engine.js';
import { SWSELogger } from '../../utils/logger.js';

/**
 * SWSE Mentor Dialogue System
 * Provides personalized level-up narration based on character's level 1 class
 * Each starting class has a unique mentor who guides them through all 20 levels
 */

export { MENTORS } from './mentor-dialogues.data.js';

/**
 * Get mentor for a given class
 * @param {string} className - The class name (base or prestige)
 * @returns {Object} The mentor data
 */
export function getMentorForClass(className) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorForClass: Looking up mentor for class "${className}"`);

    // Direct match
    if (MENTORS[className]) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getMentorForClass: Found mentor "${MENTORS[className].name}" for class "${className}"`);
        return MENTORS[className];
    }

    // Default to Scoundrel's Ol' Salty for unknown classes (he's the general narrator)
    SWSELogger.warn(`[MENTOR-DIALOGUES] getMentorForClass: Class "${className}" not found, defaulting to Scoundrel mentor`);
    return MENTORS.Scoundrel;
}

/**
 * Get mentor greeting for specific level
 * @param {Object} mentor - The mentor object
 * @param {number} level - The level being achieved
 * @param {Actor} actor - The actor (optional, needed for conditional greetings)
 * @returns {string} The greeting message
 */
export function getMentorGreeting(mentor, level, actor = null) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGreeting: Getting greeting from "${mentor.name}" for level ${level}`);

    let greeting = mentor.levelGreetings[level] || mentor.levelGreetings[20];
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGreeting: Greeting available:`, greeting ? 'YES' : 'NO');

    // If greeting is a function, call it with the actor
    if (typeof greeting === 'function' && actor) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGreeting: Greeting is dynamic function, evaluating for actor "${actor.name}"`);
        greeting = greeting(actor);
    }

    return greeting;
}

/**
 * Get mentor guidance for a specific choice type
 * @param {Object} mentor - The mentor object
 * @param {string} choiceType - Type of choice (class, talent, ability, skill, multiclass, hp)
 * @returns {string} The guidance message
 */
export function getMentorGuidance(mentor, choiceType) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGuidance: Getting guidance from "${mentor.name}" for choice type "${choiceType}"`);

    const guidanceMap = {
        'class': mentor.classGuidance,
        'talent': mentor.talentGuidance,
        'ability': mentor.abilityGuidance,
        'skill': mentor.skillGuidance,
        'multiclass': mentor.multiclassGuidance,
        'force_power': mentor.forcePowerGuidance,
        'hp': mentor.hpGuidance
    };

    const guidance = guidanceMap[choiceType] || 'Make your choice wisely.';
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGuidance: Found guidance:`, guidance.substring(0, 50) + (guidance.length > 50 ? '...' : ''));
    return guidance;
}

/**
 * Get the character's level 1 class (their starting class)
 * @param {Actor} actor - The actor to check
 * @returns {string} The level 1 class name
 */
export function getLevel1Class(actor) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getLevel1Class: Determining starting class for actor "${actor.name}" (Level ${actor.system.level})`);

    // Look through the actor's class items
    const classItems = actor.items.filter(i => i.type === 'class');
    SWSELogger.log(`[MENTOR-DIALOGUES] getLevel1Class: Found ${classItems.length} class items:`, classItems.map(c => c.name));

    // If actor is level 1, any class they have is their starting class
    if (actor.system.level === 1 && classItems.length > 0) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getLevel1Class: Actor is level 1, using first class: "${classItems[0].name}"`);
        return classItems[0].name;
    }

    // For higher levels, try to find their first/starting class
    // This could be stored in a flag or we use the first class item
    const storedStartClass = actor.getFlag('foundryvtt-swse', 'startingClass');
    if (storedStartClass) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getLevel1Class: Using stored starting class flag: "${storedStartClass}"`);
        return storedStartClass;
    }

    // Fallback to first class item if available
    if (classItems.length > 0) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getLevel1Class: No stored flag, using first class item: "${classItems[0].name}"`);
        return classItems[0].name;
    }

    // Default fallback
    SWSELogger.warn(`[MENTOR-DIALOGUES] getLevel1Class: No classes found, defaulting to "Scoundrel"`);
    return 'Scoundrel';
}

/**
 * Set the character's starting class
 * @param {Actor} actor - The actor
 * @param {string} className - The starting class name
 */
export async function setLevel1Class(actor, className) {
    SWSELogger.log(`[MENTOR-DIALOGUES] setLevel1Class: Setting starting class for actor "${actor.name}" to "${className}"`);
    try {
        await actor.setFlag('foundryvtt-swse', 'startingClass', className);
        SWSELogger.log(`[MENTOR-DIALOGUES] setLevel1Class: Successfully set starting class flag`);
    } catch (err) {
        SWSELogger.error(`[MENTOR-DIALOGUES] setLevel1Class: ERROR setting starting class:`, err);
        throw err;
    }
}

/**
 * Set a manual mentor override for the character
 * Allows players to change their mentor regardless of class
 * @param {Actor} actor - The actor
 * @param {string} mentorKey - The mentor key to use (must exist in MENTORS)
 */
export async function setMentorOverride(actor, mentorKey) {
    SWSELogger.log(`[MENTOR-DIALOGUES] setMentorOverride: Setting mentor override for actor "${actor.name}" to "${mentorKey}"`);

    if (!MENTORS[mentorKey]) {
        SWSELogger.error(`[MENTOR-DIALOGUES] setMentorOverride: ERROR - Invalid mentor key: "${mentorKey}". Available mentors:`, Object.keys(MENTORS));
        throw new Error(`Invalid mentor key: ${mentorKey}`);
    }
    SWSELogger.log(`[MENTOR-DIALOGUES] setMentorOverride: Mentor key validated - "${MENTORS[mentorKey].name}"`);

    try {
        await actor.setFlag('foundryvtt-swse', 'mentorOverride', mentorKey);
        SWSELogger.log(`[MENTOR-DIALOGUES] setMentorOverride: Successfully set mentor override flag`);

        // Emit hook for other systems to react to mentor change
        Hooks.callAll('swse:mentor:changed', {
            actor: actor,
            newMentor: mentorKey,
            source: 'manual-override'
        });
        SWSELogger.log(`[MENTOR-DIALOGUES] setMentorOverride: Emitted swse:mentor:changed hook`);
    } catch (err) {
        SWSELogger.error(`[MENTOR-DIALOGUES] setMentorOverride: ERROR setting mentor override:`, err);
        throw err;
    }
}

/**
 * Get the currently active mentor for a character
 * Respects manual overrides, prestige class transitions, and starting class mentors
 * Priority: override > prestige class mentor > starting class mentor > Scoundrel (fallback)
 * @param {Actor} actor - The actor
 * @returns {Object} The active mentor object
 */
export function getActiveMentor(actor) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Determining active mentor for actor "${actor.name}"`);

    // Check for manual override first
    const override = actor.getFlag('foundryvtt-swse', 'mentorOverride');
    if (override && MENTORS[override]) {
        SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Using mentor override: "${MENTORS[override].name}"`);
        return MENTORS[override];
    }
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: No mentor override found`);

    // Fall back to starting class mentor
    const startClass = getLevel1Class(actor);
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Starting class is "${startClass}"`);
    const mentor = getMentorForClass(startClass);
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Active mentor is "${mentor?.name}"`);

    return mentor || MENTORS['Scoundrel']; // Ultimate fallback
}

/**
 * Clear any manual mentor override
 * Reverts to automatic mentor selection based on class
 * @param {Actor} actor - The actor
 */
export async function clearMentorOverride(actor) {
    SWSELogger.log(`[MENTOR-DIALOGUES] clearMentorOverride: Clearing mentor override for actor "${actor.name}"`);

    try {
        await actor.unsetFlag('foundryvtt-swse', 'mentorOverride');
        SWSELogger.log(`[MENTOR-DIALOGUES] clearMentorOverride: Successfully cleared mentor override flag`);

        Hooks.callAll('swse:mentor:changed', {
            actor: actor,
            source: 'override-cleared'
        });
        SWSELogger.log(`[MENTOR-DIALOGUES] clearMentorOverride: Emitted swse:mentor:changed hook`);
    } catch (err) {
        SWSELogger.error(`[MENTOR-DIALOGUES] clearMentorOverride: ERROR clearing mentor override:`, err);
        throw err;
    }
}

// ============================================================================
// V2 INTEGRATION: DIALOGUE PHASES & SUGGESTION CONTEXTS
// ============================================================================
// These are merged from mentor-suggestion-dialogues.js for unified system
// They provide phase-based and context-aware dialogue support

/**
 * Dialogue phases based on character level
 * Used for contextual mentor responses
 */
export const DIALOGUE_PHASES = {
    EARLY: { min: 1, max: 5, name: 'early', style: 'instructional' },
    MID: { min: 6, max: 12, name: 'mid', style: 'advisory' },
    LATE: { min: 13, max: 20, name: 'late', style: 'peer' }
};

/**
 * Determine the dialogue phase based on character level
 * @param {number} level - Character level (1-20)
 * @returns {string} Phase name: "early", "mid", or "late"
 */
export function getDialoguePhase(level) {
    if (level <= DIALOGUE_PHASES.EARLY.max) {return 'early';}
    if (level <= DIALOGUE_PHASES.MID.max) {return 'mid';}
    return 'late';
}

/**
 * Suggestion context types for mentor dialogue
 * Categorizes the type of guidance being sought
 */
export const SUGGESTION_CONTEXTS = {
    ATTRIBUTE: 'attribute',      // Ability score increases
    FEAT: 'feat',                // Feat selection
    TALENT: 'talent',            // Talent selection
    DEFENSE: 'defense',          // Defensive choices
    STYLE: 'style',              // Combat/playstyle choices
    SKILL: 'skill',              // Skill selection
    MULTICLASS: 'multiclass',    // Multiclass decisions
    HP: 'hp'                     // Health/survivability
};
