import { ProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.data.js";
import { localizeMentorData, localizeMentorDialogueValue } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-localization.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

/**
 * SWSE Mentor Dialogue System
 * Provides personalized level-up narration based on character's level 1 class
 * Each starting class has a unique mentor who guides them through all 20 levels
 */

export { MENTORS };

const SYSTEM_MENTOR_BASE = 'systems/foundryvtt-swse/assets/mentors/';

const CANONICAL_MENTOR_PORTRAIT_BASENAMES = Object.freeze({
    axiom: 'Axiom.webp',
    breach: 'breach.webp',
    captain: 'captain.webp',
    darth_malbada: 'darth_malbada.webp',
    malbada: 'darth_malbada.webp',
    delta: 'delta.webp',
    dezmin: 'dezmin.webp',
    j0n1: 'j0n1.webp',
    j0_n1: 'j0n1.webp',
    jack: 'Jack.webp',
    kex: 'Kex.webp',
    kex_varon: 'Kex.webp',
    kharjo: 'kharjo.webp',
    kael: 'kharjo.webp',
    korr: 'Korr.webp',
    krag: 'krag.webp',
    kyber: 'Kyber.webp',
    lead: 'lead.webp',
    marl_skindar: 'Marl_Skindar.webp',
    skindar: 'Marl_Skindar.webp',
    mayu: 'mayu.webp',
    miedo: 'miedo.webp',
    miraj: 'miraj.webp',
    ol_salty: 'salty.webp',
    salty: 'salty.webp',
    pegar: 'pegar.webp',
    rajma: 'rajma.webp',
    rax: 'Rax.webp',
    rendarr: 'Rendarr.webp',
    riquis: 'riquis.webp',
    anchorite: 'riquis.webp',
    rogue: 'Rogue.webp',
    sela: 'Sela.webp',
    seraphim: 'Seraphim.webp',
    spark: 'Spark.webp',
    theron: 'theron.webp',
    tideborn: 'captain.webp',
    tio_the_hutt: 'Tio_the_hutt.webp',
    broker: 'Tio_the_hutt.webp',
    urza: 'urza.webp',
    vel: 'urza.webp',
    vera: 'vera.webp',
    venn: 'vera.webp',
    zhen: 'zhen.webp'
});

function _canonicalMentorPortraitPath(resolved) {
    const match = String(resolved || '').match(/assets\/mentors\/([^/?#]+)(?:[?#].*)?$/i);
    if (!match) return resolved;

    const base = match[1].replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const canonicalBase = CANONICAL_MENTOR_PORTRAIT_BASENAMES[base];
    if (!canonicalBase) return resolved;

    return `${SYSTEM_MENTOR_BASE}${canonicalBase}`;
}


function _normalizeMentorLookup(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/["'`.]/g, '')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Resolve mentor portrait path for Foundry templates.
 *
 * Mentor portraits are standardized on WebP assets. Older data and cached UI
 * state can still point at `.png`; normalize those references to the WebP path
 * so portrait rails do not break after the asset conversion pass.
 *
 * @param {string} portraitPath - The portrait path to resolve
 * @returns {string} The resolved system-relative WebP portrait path
 */
export function resolveMentorPortraitPath(portraitPath) {
    if (!portraitPath) {
        return 'systems/foundryvtt-swse/assets/mentors/salty.webp';
    }

    let resolved = String(portraitPath).trim();
    if (!resolved) return 'systems/foundryvtt-swse/assets/mentors/salty.webp';

    // Dialogue data and some older apps use repository-relative asset paths.
    // Foundry templates need system-relative URLs, so normalize once here.
    if (resolved.startsWith('/systems/')) resolved = resolved.slice(1);
    if (resolved.startsWith('/foundryvtt-swse/')) resolved = resolved.slice(1);
    if (resolved.startsWith('foundryvtt-swse/')) {
        resolved = `systems/${resolved}`;
    }
    if (!/^https?:/i.test(resolved) && !resolved.startsWith('data:') && !resolved.startsWith('systems/')) {
        if (resolved.startsWith('/assets/')) resolved = resolved.slice(1);
        if (resolved.startsWith('assets/')) resolved = `systems/foundryvtt-swse/${resolved}`;
        else resolved = `systems/foundryvtt-swse/${resolved.replace(/^\/+/, '')}`;
    }

    // Guard against old cached paths like systems/foundryvtt-swse/foundryvtt-swse/assets/mentors/miraj.webp.
    resolved = resolved.replace(
        /^systems\/foundryvtt-swse\/foundryvtt-swse\/assets\/mentors\//i,
        'systems/foundryvtt-swse/assets/mentors/'
    );

    // Canonical mentor portraits are WebP. Normalize stale PNG references too.
    resolved = _canonicalMentorPortraitPath(resolved);
    if (/assets\/mentors\//i.test(resolved) && resolved.toLowerCase().endsWith('.png')) {
        resolved = `${resolved.slice(0, -4)}.webp`;
    }

    return resolved;
}

export function resolveMentorData(ref) {
    let mentor;
    let mentorKey = 'Scoundrel';

    if (!ref) {
        mentor = MENTORS.Scoundrel;
    } else if (typeof ref === 'object' && ref.name && ref.title) {
        mentor = ref;
        mentorKey = getMentorKey(ref);
    } else if (MENTORS[ref]) {
        mentor = MENTORS[ref];
        mentorKey = ref;
    } else {
        const normalized = _normalizeMentorLookup(ref);
        for (const [key, value] of Object.entries(MENTORS)) {
            const candidates = [
                key,
                value?.id,
                value?.mentorId,
                value?.mentor_id,
                value?.name,
                value?.displayName,
            ];
            if (candidates.some(candidate => _normalizeMentorLookup(candidate) == normalized)) {
                mentor = value;
                mentorKey = key;
                break;
            }
        }
        if (!mentor) {
            mentor = MENTORS.Scoundrel;
            mentorKey = 'Scoundrel';
        }
    }

    if (!mentor) return null;

    const localized = localizeMentorData(mentor, mentorKey) || mentor;

    // Return a copy so consumers do not mutate generated mentor data.
    return {
        ...localized,
        mentorKey,
        portrait: resolveMentorPortraitPath(mentor.portrait),
    };
}

export function getMentorKey(ref) {
    if (!ref) return 'Scoundrel';
    if (MENTORS[ref]) return ref;

    const normalizedRef = _normalizeMentorLookup(ref?.mentorKey || ref?.mentorId || ref?.mentor_id || ref?.id || ref?.name || ref?.displayName || ref);
    const normalizedTitle = typeof ref === 'object' ? _normalizeMentorLookup(ref?.title) : '';

    return Object.entries(MENTORS).find(([key, value]) => {
        const candidates = [key, value?.id, value?.mentorId, value?.mentor_id, value?.name, value?.displayName];
        if (candidates.some(candidate => _normalizeMentorLookup(candidate) === normalizedRef)) return true;
        return normalizedTitle && _normalizeMentorLookup(value?.name) === normalizedRef && _normalizeMentorLookup(value?.title) === normalizedTitle;
    })?.[0] || 'Scoundrel';
}

export function getMentorIntroText(ref, fallbackClassName = '') {
    const mentor = resolveMentorData(ref);
    if (!mentor) {
        return fallbackClassName
            ? (globalThis.game?.i18n?.format?.('SWSE.MentorDialogues.Fallback.WelcomeClass', { className: fallbackClassName }) || `Welcome, ${fallbackClassName}.`)
            : (globalThis.game?.i18n?.localize?.('SWSE.MentorDialogues.Fallback.Welcome') || 'Welcome.');
    }

    const greeting = mentor.levelGreetings?.[1] || mentor.levelGreetings?.['1'] || mentor.summaryGuidance || mentor.classGuidance || '';
    return greeting || (fallbackClassName
        ? (globalThis.game?.i18n?.format?.('SWSE.MentorDialogues.Fallback.WelcomeClass', { className: fallbackClassName }) || `Welcome, ${fallbackClassName}.`)
        : (globalThis.game?.i18n?.localize?.('SWSE.MentorDialogues.Fallback.Welcome') || 'Welcome.'));
}

/**
 * Get mentor for a given class
 * @param {string} className - The class name (base or prestige)
 * @returns {Object} The mentor data
 */
export function getMentorForClass(className) {
    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorForClass: Looking up mentor for class "${className}"`);

    // Direct match
    if (MENTORS[className]) {
        const mentor = resolveMentorData(className);
        SWSELogger.log(`[MENTOR-DIALOGUES] getMentorForClass: Found mentor "${mentor?.name}" for class "${className}"`);
        return mentor;
    }

    // Default to Scoundrel's Ol' Salty for unknown classes (he's the general narrator)
    SWSELogger.warn(`[MENTOR-DIALOGUES] getMentorForClass: Class "${className}" not found, defaulting to Scoundrel mentor`);
    return resolveMentorData('Scoundrel');
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

    const mentorKey = getMentorKey(mentor);
    const levelKey = String(level || 20);
    return localizeMentorDialogueValue(mentorKey, ['levelGreetings', levelKey], greeting);
}

/**
 * Get mentor guidance for a specific choice type
 * @param {Object} mentor - The mentor object
 * @param {string} choiceType - Type of choice (class, talent, ability, skill, multiclass, hp)
 * @returns {string} The guidance message
 */
export function getMentorGuidance(mentor, choiceType) {
    if (!mentor || !mentor.name) return '';

    const normalizedType = String(choiceType || '')
        .trim()
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const aliasMap = {
        attributes: 'ability',
        attribute: 'ability',
        ability_scores: 'ability',
        ability_score: 'ability',
        skills: 'skill',
        languages: 'language',
        language_guidance: 'language',
        feats: 'feat',
        feat_guidance: 'feat',
        talents: 'talent',
        talent_guidance: 'talent',
        force: 'force_power',
        force_powers: 'force_power',
        force_power_guidance: 'force_power',
        starship: 'starship_maneuver',
        starship_maneuvers: 'starship_maneuver',
        starship_maneuver_guidance: 'starship_maneuver',
        background_guidance: 'background',
        summary_guidance: 'summary',
        confirm: 'summary',
        confirmation: 'summary',
        l1_survey: 'survey',
        survey_guidance: 'survey',
    };
    const key = aliasMap[normalizedType] || normalizedType;

    SWSELogger.log(`[MENTOR-DIALOGUES] getMentorGuidance: Getting guidance from "${mentor.name}" for choice type "${key}"`);

    const guidancePathMap = {
        species: 'speciesGuidance',
        class: 'classGuidance',
        background: 'backgroundGuidance',
        feat: 'featGuidance',
        talent: 'talentGuidance',
        ability: 'abilityGuidance',
        skill: 'skillGuidance',
        language: 'languageGuidance',
        multiclass: 'multiclassGuidance',
        force_power: 'forcePowerGuidance',
        starship_maneuver: 'starshipManeuverGuidance',
        hp: 'hpGuidance',
        summary: 'summaryGuidance',
        survey: mentor.surveyGuidance ? 'surveyGuidance' : 'classGuidance',
    };

    const guidancePath = guidancePathMap[key] || (mentor.summaryGuidance ? 'summaryGuidance' : 'classGuidance');
    const fallback = mentor[guidancePath] || localizeMentorDialogueValue('Fallback', ['MakeChoiceWisely'], 'Make your choice wisely.');
    const mentorKey = getMentorKey(mentor);
    const guidance = localizeMentorDialogueValue(mentorKey, [guidancePath], fallback);
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
    const classItems = ActorAbilityBridge.getClasses(actor);
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
        // @mutation-exception: metadata
        // Store starting class for UI mentor selection (not progression engine)
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
        // @mutation-exception: metadata
        // Store manual mentor override (UI state, not progression engine)
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
        return resolveMentorData(override);
    }
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: No mentor override found`);

    // Fall back to starting class mentor
    const startClass = getLevel1Class(actor);
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Starting class is "${startClass}"`);
    const mentor = getMentorForClass(startClass);
    SWSELogger.log(`[MENTOR-DIALOGUES] getActiveMentor: Active mentor is "${mentor?.name}"`);

    return mentor || resolveMentorData('Scoundrel'); // Ultimate fallback
}

/**
 * Clear any manual mentor override
 * Reverts to automatic mentor selection based on class
 * @param {Actor} actor - The actor
 */
export async function clearMentorOverride(actor) {
    SWSELogger.log(`[MENTOR-DIALOGUES] clearMentorOverride: Clearing mentor override for actor "${actor.name}"`);

    try {
        // @mutation-exception: metadata
        // Clear mentor override to restore automatic selection (UI state)
        await actor.unsetFlag('foundryvtt-swse', 'mentorOverride');
        SWSELogger.log(`[MENTOR-DIALOGUES] clearMentorOverride: Successfully cleared mentor override`);

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
