// ============================================
// FILE: scripts/data/prerequisite-checker.js
// Prestige Class Prerequisite Checker
// ============================================
//
// This module provides functions to check if an actor meets
// the prerequisites for a prestige class.
//
// It validates all prerequisite types:
// - Character level
// - Base Attack Bonus (BAB)
// - Trained skills
// - Feats
// - Talents (including tree counting)
// - Force Powers
// - Force Techniques
// - Dark Side Score
// - Species
// - Special conditions
// ============================================

import { PRESTIGE_PREREQUISITES } from './prestige-prerequisites.js';
import { TalentTreeDB } from './talent-tree-db.js';
import { normalizeTalentTreeId } from './talent-tree-normalizer.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Check if an actor meets all prerequisites for a prestige class.
 *
 * @param {Object} actor - Actor document
 * @param {string} className - Prestige class name
 * @returns {Object} - { met: boolean, missing: Array<string>, details: Object }
 */
export function checkPrerequisites(actor, className) {
    const prereqs = PRESTIGE_PREREQUISITES[className];

    if (!prereqs) {
        // Not a prestige class or no prerequisites
        return { met: true, missing: [], details: {} };
    }

    const missing = [];
    const details = {};

    // Check minimum level
    if (prereqs.minLevel) {
        const level = getTotalLevel(actor);
        details.level = { required: prereqs.minLevel, actual: level };
        if (level < prereqs.minLevel) {
            missing.push(`Minimum level ${prereqs.minLevel} (you are level ${level})`);
        }
    }

    // Check minimum BAB
    if (prereqs.minBAB) {
        const bab = getBaseAttackBonus(actor);
        details.bab = { required: prereqs.minBAB, actual: bab };
        if (bab < prereqs.minBAB) {
            missing.push(`Base Attack Bonus +${prereqs.minBAB} (you have +${bab})`);
        }
    }

    // Check trained skills
    if (prereqs.skills) {
        const skillCheck = checkSkills(actor, prereqs.skills);
        details.skills = skillCheck;
        if (!skillCheck.met) {
            missing.push(`Trained in: ${skillCheck.missing.join(', ')}`);
        }
    }

    // Check feats (all required)
    if (prereqs.feats) {
        const featCheck = checkFeats(actor, prereqs.feats);
        details.feats = featCheck;
        if (!featCheck.met) {
            missing.push(`Feats: ${featCheck.missing.join(', ')}`);
        }
    }

    // Check feats (any one of)
    if (prereqs.featsAny) {
        const featAnyCheck = checkFeatsAny(actor, prereqs.featsAny);
        details.featsAny = featAnyCheck;
        if (!featAnyCheck.met) {
            missing.push(`At least one feat from: ${prereqs.featsAny.join(', ')}`);
        }
    }

    // Check talents
    if (prereqs.talents) {
        const talentCheck = checkTalents(actor, prereqs.talents);
        details.talents = talentCheck;
        if (!talentCheck.met) {
            missing.push(talentCheck.message);
        }
    }

    // Check Force Powers
    if (prereqs.forcePowers) {
        const powerCheck = checkForcePowers(actor, prereqs.forcePowers);
        details.forcePowers = powerCheck;
        if (!powerCheck.met) {
            missing.push(`Force Powers: ${powerCheck.missing.join(', ')}`);
        }
    }

    // Check Force Techniques
    if (prereqs.forceTechniques) {
        const techniqueCheck = checkForceTechniques(actor, prereqs.forceTechniques);
        details.forceTechniques = techniqueCheck;
        if (!techniqueCheck.met) {
            missing.push(`${prereqs.forceTechniques.count} Force Technique(s) (you have ${techniqueCheck.actual})`);
        }
    }

    // Check Dark Side Score
    if (prereqs.darkSideScore) {
        const darkSideCheck = checkDarkSideScore(actor, prereqs.darkSideScore);
        details.darkSideScore = darkSideCheck;
        if (!darkSideCheck.met) {
            missing.push(`Dark Side Score must equal Wisdom score (${darkSideCheck.required} needed, you have ${darkSideCheck.actual})`);
        }
    }

    // Check Species
    if (prereqs.species) {
        const speciesCheck = checkSpecies(actor, prereqs.species);
        details.species = speciesCheck;
        if (!speciesCheck.met) {
            missing.push(`Must be: ${prereqs.species.join(' or ')}`);
        }
    }

    // Check Droid Systems
    if (prereqs.droidSystems) {
        const droidCheck = checkDroidSystems(actor, prereqs.droidSystems);
        details.droidSystems = droidCheck;
        if (!droidCheck.met) {
            missing.push(`Droid Systems: ${droidCheck.missing.join(', ')}`);
        }
    }

    // Special conditions (cannot be automatically checked)
    if (prereqs.special) {
        details.special = prereqs.special;
        // Note: Special conditions must be manually verified by GM
    }

    return {
        met: missing.length === 0,
        missing,
        details,
        special: prereqs.special || null
    };
}

/**
 * Get total character level.
 */
function getTotalLevel(actor) {
    if (!actor) return 0;

    if (actor.system?.level) return actor.system.level;
    if (actor.system?.heroicLevel) return actor.system.heroicLevel;

    const classItems = actor.items?.filter(i => i.type === 'class') || [];
    return classItems.reduce((sum, cls) => sum + (cls.system?.level || 0), 0);
}

/**
 * Get Base Attack Bonus.
 */
function getBaseAttackBonus(actor) {
    if (!actor) return 0;

    // Try to read directly from actor
    if (actor.system?.bab !== undefined) return actor.system.bab;
    if (actor.system?.baseAttackBonus !== undefined) return actor.system.baseAttackBonus;

    // Calculate from classes (fallback)
    const classItems = actor.items?.filter(i => i.type === 'class') || [];
    let totalBAB = 0;

    for (const classItem of classItems) {
        const level = classItem.system?.level || 0;
        const progression = classItem.system?.babProgression || 'medium';

        const multipliers = { 'fast': 1.0, 'high': 1.0, 'medium': 0.75, 'slow': 0.5, 'low': 0.5 };
        const multiplier = multipliers[progression] || 0.75;

        totalBAB += Math.floor(level * multiplier);
    }

    return totalBAB;
}

/**
 * Check if actor has all required trained skills.
 */
function checkSkills(actor, requiredSkills) {
    if (!actor || !requiredSkills || requiredSkills.length === 0) {
        return { met: true, missing: [] };
    }

    const trainedSkills = getTrainedSkills(actor);
    const missing = [];

    for (const skill of requiredSkills) {
        const normalizedSkill = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = trainedSkills.some(s =>
            s.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSkill
        );

        if (!found) {
            missing.push(skill);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Get list of trained skills from actor.
 */
function getTrainedSkills(actor) {
    if (!actor) return [];

    const skills = [];

    // Check actor.system.skills
    if (actor.system?.skills) {
        for (const [skillKey, skillData] of Object.entries(actor.system.skills)) {
            if (skillData?.trained || skillData?.rank > 0) {
                skills.push(skillKey);
            }
        }
    }

    // Check skill items
    const skillItems = actor.items?.filter(i => i.type === 'skill') || [];
    for (const skill of skillItems) {
        if (skill.system?.trained || skill.system?.rank > 0) {
            skills.push(skill.name);
        }
    }

    return skills;
}

/**
 * Check if actor has all required feats.
 */
function checkFeats(actor, requiredFeats) {
    if (!actor || !requiredFeats || requiredFeats.length === 0) {
        return { met: true, missing: [] };
    }

    const actorFeats = getActorFeats(actor);
    const missing = [];

    for (const feat of requiredFeats) {
        const normalized = feat.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorFeats.some(f =>
            f.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (!found) {
            missing.push(feat);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Check if actor has any one of the required feats.
 */
function checkFeatsAny(actor, requiredFeats) {
    if (!actor || !requiredFeats || requiredFeats.length === 0) {
        return { met: true };
    }

    const actorFeats = getActorFeats(actor);

    for (const feat of requiredFeats) {
        const normalized = feat.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorFeats.some(f =>
            f.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (found) {
            return { met: true, found: feat };
        }
    }

    return { met: false };
}

/**
 * Get list of feats from actor.
 */
function getActorFeats(actor) {
    if (!actor) return [];

    const featItems = actor.items?.filter(i => i.type === 'feat') || [];
    return featItems.map(f => f.name);
}

/**
 * Check talent requirements.
 */
function checkTalents(actor, talentReq) {
    if (!actor || !talentReq) {
        return { met: true };
    }

    const actorTalents = actor.items?.filter(i => i.type === 'talent') || [];

    // Check for specific named talents
    if (talentReq.specific) {
        const missing = [];
        for (const talentName of talentReq.specific) {
            const found = actorTalents.some(t =>
                t.name.toLowerCase() === talentName.toLowerCase()
            );
            if (!found) {
                missing.push(talentName);
            }
        }

        if (missing.length > 0) {
            return {
                met: false,
                message: `Talents: ${missing.join(', ')}`
            };
        }
        return { met: true };
    }

    // Check for Force talents only
    if (talentReq.forceTalentsOnly) {
        const forceTalents = actorTalents.filter(t =>
            t.system?.isForce || t.system?.tags?.includes('force')
        );

        const actual = forceTalents.length;
        const required = talentReq.count || 0;

        if (actual < required) {
            return {
                met: false,
                message: `${required} Force Talent(s) (you have ${actual})`
            };
        }
        return { met: true, actual, required };
    }

    // Check for talents from specific trees
    if (talentReq.trees) {
        const matchingTalents = [];

        for (const talent of actorTalents) {
            const treeName = talent.system?.talentTree || talent.system?.talent_tree;
            if (!treeName) continue;

            const normalizedTreeId = normalizeTalentTreeId(treeName);

            for (const requiredTree of talentReq.trees) {
                const requiredTreeId = normalizeTalentTreeId(requiredTree);
                if (normalizedTreeId === requiredTreeId) {
                    matchingTalents.push(talent);
                    break;
                }
            }
        }

        const actual = matchingTalents.length;
        const required = talentReq.count || 1;

        if (actual < required) {
            return {
                met: false,
                message: `${required} talent(s) from: ${talentReq.trees.join(', ')} (you have ${actual})`
            };
        }

        return { met: true, actual, required };
    }

    return { met: true };
}

/**
 * Check Force Power requirements.
 */
function checkForcePowers(actor, requiredPowers) {
    if (!actor || !requiredPowers || requiredPowers.length === 0) {
        return { met: true, missing: [] };
    }

    const actorPowers = actor.items?.filter(i =>
        i.type === 'forcepower' || i.type === 'force-power'
    ) || [];

    const missing = [];

    for (const power of requiredPowers) {
        const normalized = power.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorPowers.some(p =>
            p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (!found) {
            missing.push(power);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Check Force Technique count.
 */
function checkForceTechniques(actor, techniqueReq) {
    if (!actor || !techniqueReq) {
        return { met: true };
    }

    const actorTechniques = actor.items?.filter(i =>
        i.type === 'forcetechnique' || i.type === 'force-technique' ||
        i.system?.tags?.includes('force_technique')
    ) || [];

    const actual = actorTechniques.length;
    const required = techniqueReq.count || 1;

    return {
        met: actual >= required,
        actual,
        required
    };
}

/**
 * Check Dark Side Score requirement.
 */
function checkDarkSideScore(actor, requirement) {
    if (!actor) return { met: true };

    const darkSideScore = actor.system?.darkSideScore || actor.system?.darksideScore || 0;
    const wisScore = actor.system?.abilities?.wis?.score || 10;

    // Requirement: Dark Side Score must equal Wisdom score
    return {
        met: darkSideScore >= wisScore,
        actual: darkSideScore,
        required: wisScore
    };
}

/**
 * Check species requirement.
 */
function checkSpecies(actor, allowedSpecies) {
    if (!actor || !allowedSpecies || allowedSpecies.length === 0) {
        return { met: true };
    }

    const actorSpecies = actor.system?.species || actor.system?.race || '';

    const normalized = actorSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
    const met = allowedSpecies.some(s =>
        s.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
    );

    return {
        met,
        actual: actorSpecies,
        required: allowedSpecies
    };
}

/**
 * Check droid systems requirement.
 */
function checkDroidSystems(actor, requiredSystems) {
    if (!actor || !requiredSystems || requiredSystems.length === 0) {
        return { met: true, missing: [] };
    }

    const actorSystems = actor.system?.droidSystems || [];
    const missing = [];

    for (const system of requiredSystems) {
        const normalized = system.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorSystems.some(s =>
            (typeof s === 'string' ? s : s.name).toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (!found) {
            missing.push(system);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Get all prestige classes available to an actor.
 *
 * @param {Object} actor - Actor document
 * @returns {Array<Object>} - Array of { className, met, missing, details, special }
 */
export function getAvailablePrestigeClasses(actor) {
    const results = [];

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        const check = checkPrerequisites(actor, className);
        results.push({
            className,
            ...check
        });
    }

    return results;
}

/**
 * Get only prestige classes that the actor qualifies for.
 *
 * @param {Object} actor - Actor document
 * @returns {Array<string>} - Array of qualified prestige class names
 */
export function getQualifiedPrestigeClasses(actor) {
    return getAvailablePrestigeClasses(actor)
        .filter(result => result.met)
        .map(result => result.className);
}
