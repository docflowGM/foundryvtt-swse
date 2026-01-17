/**
 * SWSE Class Suggestion Engine
 *
 * A deterministic, explainable system for suggesting classes during level-up.
 * Suggestions are based on a strict tier order of operations:
 *
 * TIER 5 - PRESTIGE_NOW: Prestige class the character qualifies for now (highest priority)
 * TIER 4 - PATH_CONTINUATION: Continuation of the current class path
 * TIER 3 - PRESTIGE_SOON: Classes that accelerate qualification for a prestige class
 * TIER 2 - MECHANICAL_SYNERGY: Mechanical synergy with feats, talents, skills, abilities
 * TIER 1 - THEMATIC: Thematic or role-based fit
 * TIER 0 - FALLBACK: Legal option (no specific suggestion)
 *
 * This engine integrates with the feat/talent SuggestionEngine to provide
 * coherent build direction advice.
 */

import { SWSELogger } from '../utils/logger.js';
import { BASE_CLASSES, calculateTotalBAB } from '../apps/levelup/levelup-shared.js';

// ──────────────────────────────────────────────────────────────
// TIER DEFINITIONS (ORDER MATTERS - HIGHER = BETTER)
// ──────────────────────────────────────────────────────────────

export const CLASS_SUGGESTION_TIERS = {
    PRESTIGE_NOW: 5,
    PATH_CONTINUATION: 4,
    PRESTIGE_SOON: 3,
    MECHANICAL_SYNERGY: 2,
    THEMATIC: 1,
    FALLBACK: 0
};

export const CLASS_TIER_REASONS = {
    5: "You qualify for this prestige class now",
    4: "Strong continuation of your current class path",
    3: "Helps you qualify for a prestige class soon",
    2: "Strong mechanical synergy with your build",
    1: "Fits your character's theme or role",
    0: "Legal option"
};

export const CLASS_TIER_ICONS = {
    5: "fa-star",           // Star for prestige qualification
    4: "fa-route",          // Path for continuation
    3: "fa-unlock",         // Unlock for near-prestige
    2: "fa-cogs",           // Gears for mechanical synergy
    1: "fa-masks-theater",  // Theater masks for thematic
    0: ""                   // No icon for fallback
};

export const CLASS_TIER_ICON_CLASSES = {
    5: "fas fa-star class-suggestion-prestige",
    4: "fas fa-route class-suggestion-path",
    3: "fas fa-unlock class-suggestion-unlock",
    2: "fas fa-cogs class-suggestion-synergy",
    1: "fas fa-masks-theater class-suggestion-thematic",
    0: ""
};

export const CLASS_TIER_CSS_CLASSES = {
    5: "class-suggestion-tier-prestige",
    4: "class-suggestion-tier-path",
    3: "class-suggestion-tier-unlock",
    2: "class-suggestion-tier-synergy",
    1: "class-suggestion-tier-thematic",
    0: ""
};

// Prestige bias - prestige classes get a bonus when sorting
export const PRESTIGE_BIAS = {
    prestige: 3,
    advanced: 1,
    base: 0
};

// ──────────────────────────────────────────────────────────────
// CLASS SYNERGY DATA
// Maps classes to their synergistic abilities, skills, feats, and talents
// ──────────────────────────────────────────────────────────────

export const CLASS_SYNERGY_DATA = {
    // Base Classes
    "Jedi": {
        abilities: ["wis", "cha"],
        skills: ["useTheForce", "perception"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        talents: [],
        talentTrees: ["Lightsaber Combat", "Jedi Mind Tricks", "Telekinetic Savant"],
        theme: "force"
    },
    "Noble": {
        abilities: ["cha", "int"],
        skills: ["persuasion", "deception", "gatherInformation"],
        feats: ["Linguist", "Skill Focus"],
        talents: [],
        talentTrees: ["Inspiration", "Influence", "Leadership"],
        theme: "social"
    },
    "Scoundrel": {
        abilities: ["dex", "cha"],
        skills: ["deception", "stealth", "mechanics"],
        feats: ["Point-Blank Shot", "Precise Shot"],
        talents: [],
        talentTrees: ["Fortune", "Misfortune", "Slicer"],
        theme: "ranged"
    },
    "Scout": {
        abilities: ["dex", "wis"],
        skills: ["survival", "perception", "stealth"],
        feats: ["Armor Proficiency (Light)"],
        talents: [],
        talentTrees: ["Awareness", "Camouflage", "Fringer"],
        theme: "exploration"
    },
    "Soldier": {
        abilities: ["str", "con"],
        skills: ["endurance", "mechanics", "initiative"],
        feats: ["Armor Proficiency (Medium)", "Armor Proficiency (Heavy)", "Weapon Focus"],
        talents: [],
        talentTrees: ["Armor Specialist", "Commando", "Weapon Specialist"],
        theme: "combat"
    },

    // Prestige Classes
    "Ace Pilot": {
        abilities: ["dex", "int"],
        skills: ["pilot"],
        feats: ["Vehicular Combat", "Skill Focus (Pilot)"],
        talents: [],
        talentTrees: ["Spacer"],
        theme: "vehicle"
    },
    "Assassin": {
        abilities: ["dex", "int"],
        skills: ["stealth"],
        feats: ["Sniper", "Point-Blank Shot"],
        talents: ["Dastardly Strike"],
        talentTrees: ["Misfortune"],
        theme: "stealth"
    },
    "Bounty Hunter": {
        abilities: ["wis", "dex"],
        skills: ["survival", "perception"],
        feats: [],
        talents: [],
        talentTrees: ["Awareness"],
        theme: "tracking"
    },
    "Crime Lord": {
        abilities: ["cha", "int"],
        skills: ["deception", "persuasion"],
        feats: [],
        talents: [],
        talentTrees: ["Fortune", "Lineage", "Misfortune"],
        theme: "social"
    },
    "Elite Trooper": {
        abilities: ["str", "con"],
        skills: ["endurance"],
        feats: ["Armor Proficiency (Medium)", "Martial Arts I", "Point-Blank Shot"],
        talents: [],
        talentTrees: ["Armor Specialist", "Commando", "Weapon Specialist"],
        theme: "combat"
    },
    "Force Adept": {
        abilities: ["wis", "cha"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity"],
        talents: [],
        talentTrees: ["Alter", "Control", "Sense"],
        theme: "force"
    },
    "Force Disciple": {
        abilities: ["wis", "cha"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity"],
        talents: [],
        talentTrees: ["Dark Side Devotee", "Force Adept", "Force Item"],
        theme: "force"
    },
    "Gladiator": {
        abilities: ["str", "con"],
        skills: [],
        feats: ["Improved Damage Threshold", "Weapon Proficiency (Advanced Melee Weapons)"],
        talents: [],
        talentTrees: [],
        theme: "melee"
    },
    "Gunslinger": {
        abilities: ["dex"],
        skills: [],
        feats: ["Point-Blank Shot", "Precise Shot", "Quick Draw", "Weapon Proficiency (Pistols)"],
        talents: [],
        talentTrees: ["Fortune"],
        theme: "ranged"
    },
    "Imperial Knight": {
        abilities: ["str", "wis"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)", "Armor Proficiency (Medium)"],
        talents: [],
        talentTrees: ["Lightsaber Combat"],
        theme: "force"
    },
    "Infiltrator": {
        abilities: ["dex", "int"],
        skills: ["perception", "stealth"],
        feats: ["Skill Focus (Stealth)"],
        talents: [],
        talentTrees: ["Camouflage", "Spy"],
        theme: "stealth"
    },
    "Jedi Knight": {
        abilities: ["wis", "cha"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        talents: [],
        talentTrees: ["Lightsaber Combat", "Jedi Mind Tricks"],
        theme: "force"
    },
    "Jedi Master": {
        abilities: ["wis", "cha"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        talents: [],
        talentTrees: ["Lightsaber Combat", "Jedi Mind Tricks"],
        theme: "force"
    },
    "Martial Arts Master": {
        abilities: ["str", "dex"],
        skills: [],
        feats: ["Martial Arts II", "Melee Defense"],
        talents: [],
        talentTrees: ["Brawler", "Survivor"],
        theme: "melee"
    },
    "Medic": {
        abilities: ["int", "wis"],
        skills: ["treatInjury", "knowledge"],
        feats: ["Surgical Expertise"],
        talents: [],
        talentTrees: [],
        theme: "support"
    },
    "Melee Duelist": {
        abilities: ["str", "dex"],
        skills: [],
        feats: ["Melee Defense", "Rapid Strike", "Weapon Focus"],
        talents: [],
        talentTrees: [],
        theme: "melee"
    },
    "Military Engineer": {
        abilities: ["int"],
        skills: ["mechanics", "useComputer"],
        feats: [],
        talents: [],
        talentTrees: [],
        theme: "tech"
    },
    "Officer": {
        abilities: ["cha", "int"],
        skills: ["knowledge"],
        feats: [],
        talents: [],
        talentTrees: ["Leadership", "Commando", "Veteran"],
        theme: "leadership"
    },
    "Pathfinder": {
        abilities: ["wis", "con"],
        skills: ["perception", "survival"],
        feats: [],
        talents: [],
        talentTrees: ["Awareness", "Camouflage", "Survivor"],
        theme: "exploration"
    },
    "Saboteur": {
        abilities: ["int", "dex"],
        skills: ["deception", "mechanics", "useComputer"],
        feats: [],
        talents: [],
        talentTrees: [],
        theme: "tech"
    },
    "Sith Apprentice": {
        abilities: ["cha", "str"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        talents: [],
        talentTrees: ["Dark Side", "Lightsaber Combat"],
        theme: "force"
    },
    "Sith Lord": {
        abilities: ["cha", "str"],
        skills: ["useTheForce"],
        feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
        talents: [],
        talentTrees: ["Dark Side", "Lightsaber Combat"],
        theme: "force"
    },
    "Vanguard": {
        abilities: ["dex", "con"],
        skills: ["perception", "stealth"],
        feats: [],
        talents: [],
        talentTrees: ["Camouflage", "Commando"],
        theme: "combat"
    }
};

// ──────────────────────────────────────────────────────────────
// CLASS SUGGESTION ENGINE CLASS
// ──────────────────────────────────────────────────────────────

export class ClassSuggestionEngine {

    // Cache for prestige prerequisites
    static _prestigePrereqCache = null;

    /**
     * Generate suggestions for a list of classes
     * @param {Array} classes - Array of class objects with isBase/isPrestige flags
     * @param {Actor} actor - The actor (character)
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @returns {Promise<Array>} Classes with suggestion metadata attached
     */
    static async suggestClasses(classes, actor, pendingData = {}, options = {}) {
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: START - Actor: ${actor.id} (${actor.name}), classes: ${classes.length}`);
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Class names:`, classes.map(c => c.name));

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Building actor state...`);
        const actorState = await this._buildActorState(actor, pendingData);
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Actor state built:`, {
            level: actorState.characterLevel,
            bab: actorState.bab,
            feats: actorState.ownedFeats.size,
            talents: actorState.ownedTalents.size,
            skills: actorState.trainedSkills.size,
            classes: Object.keys(actorState.classes)
        });

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Loading prestige prerequisites...`);
        const prestigePrereqs = await this._loadPrestigePrerequisites();
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Prestige prerequisites loaded:`, Object.keys(prestigePrereqs).length, 'classes');

        const suggestions = [];

        for (const cls of classes) {
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Evaluating class "${cls.name}"...`);
            const suggestion = await this._evaluateClass(cls, actorState, prestigePrereqs, options);

            // Calculate bias for sorting
            const classType = cls.isPrestige ? 'prestige' : 'base';
            const bias = PRESTIGE_BIAS[classType] || 0;

            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Class "${cls.name}" - tier: ${suggestion.tier}, bias: ${bias}, isSuggested: ${suggestion.tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY}`);

            suggestions.push({
                ...cls,
                suggestion,
                isSuggested: suggestion.tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY,
                tierWithBias: suggestion.tier + bias
            });
        }

        const suggestedCount = suggestions.filter(s => s.isSuggested).length;
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: COMPLETE - ${suggestedCount}/${suggestions.length} classes suggested`);
        return suggestions;
    }

    /**
     * Sort classes by suggestion tier (higher first), with prestige bias, then by name
     * @param {Array} classes - Array of classes with suggestion metadata
     * @returns {Array} Sorted classes
     */
    static sortBySuggestion(classes) {
        return [...classes].sort((a, b) => {
            const tierA = a.tierWithBias ?? a.suggestion?.tier ?? -1;
            const tierB = b.tierWithBias ?? b.suggestion?.tier ?? -1;

            // Higher tier first
            if (tierB !== tierA) {
                return tierB - tierA;
            }

            // Prestige classes before base classes
            if (a.isPrestige !== b.isPrestige) {
                return a.isPrestige ? -1 : 1;
            }

            // Then alphabetically by name
            return (a.name || '').localeCompare(b.name || '');
        });
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: BUILD ACTOR STATE
    // ──────────────────────────────────────────────────────────────

    /**
     * Build a normalized actor state for tier evaluation
     * @param {Actor} actor - The actor
     * @param {Object} pendingData - Pending selections
     * @returns {Promise<Object>} Normalized actor state
     */
    static async _buildActorState(actor, pendingData = {}) {
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Building state for actor ${actor.id} (${actor.name})`);

        // Get owned feats (names, lowercased for comparison)
        const ownedFeats = new Set(
            actor.items
                .filter(i => i.type === 'feat')
                .map(f => f.name.toLowerCase())
        );
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Owned feats (${ownedFeats.size}):`, Array.from(ownedFeats));

        // Add pending feats
        (pendingData.selectedFeats || []).forEach(f => {
            ownedFeats.add((f.name || f).toLowerCase());
        });
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: After pending feats (${ownedFeats.size}):`, Array.from(ownedFeats));

        // Get owned talents (names, lowercased)
        const ownedTalents = new Set(
            actor.items
                .filter(i => i.type === 'talent')
                .map(t => t.name.toLowerCase())
        );
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Owned talents (${ownedTalents.size}):`, Array.from(ownedTalents));

        // Add pending talents
        (pendingData.selectedTalents || []).forEach(t => {
            ownedTalents.add((t.name || t).toLowerCase());
        });
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: After pending talents (${ownedTalents.size}):`, Array.from(ownedTalents));

        // Get talent trees the character has talents from
        const talentTrees = new Set(
            actor.items
                .filter(i => i.type === 'talent' && i.system?.tree)
                .map(t => t.system.tree.toLowerCase())
        );
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Talent trees (${talentTrees.size}):`, Array.from(talentTrees));

        // Get trained skills (skill keys)
        const trainedSkills = new Set();
        const skills = actor.system?.skills || {};
        for (const [skillKey, skillData] of Object.entries(skills)) {
            if (skillData?.trained) {
                trainedSkills.add(skillKey.toLowerCase());
            }
        }
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Trained skills (${trainedSkills.size}):`, Array.from(trainedSkills));

        // Add pending skill training
        (pendingData.selectedSkills || []).forEach(s => {
            trainedSkills.add((s.key || s).toLowerCase());
        });
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: After pending skills (${trainedSkills.size}):`, Array.from(trainedSkills));

        // Get ability scores and find highest
        const abilities = actor.system?.attributes || {};
        let highestAbility = null;
        let highestScore = 0;
        const abilityScores = {};

        for (const [abilityKey, abilityData] of Object.entries(abilities)) {
            const score = abilityData?.total ?? 10;
            abilityScores[abilityKey.toLowerCase()] = score;
            if (score > highestScore) {
                highestScore = score;
                highestAbility = abilityKey.toLowerCase();
            }
        }
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Ability scores:`, abilityScores, `- highest: ${highestAbility} (${highestScore})`);

        // Get character classes (names -> levels)
        const classes = {};
        actor.items
            .filter(i => i.type === 'class')
            .forEach(c => {
                classes[c.name] = c.system?.level || 1;
            });
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Character classes:`, classes);

        // Calculate current BAB
        const bab = calculateTotalBAB(actor);
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Current BAB: ${bab}`);

        // Get character level
        const characterLevel = actor.system?.level ||
            Object.values(classes).reduce((sum, level) => sum + level, 0);
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Character level: ${characterLevel}`);

        const actorState = {
            ownedFeats,
            ownedTalents,
            talentTrees,
            trainedSkills,
            highestAbility,
            highestScore,
            abilityScores,
            classes,
            bab,
            characterLevel,
            // Combined set for prereq checking
            ownedPrereqs: new Set([...ownedFeats, ...ownedTalents])
        };

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: Actor state complete`);
        return actorState;
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: LOAD PRESTIGE PREREQUISITES
    // ──────────────────────────────────────────────────────────────

    /**
     * Load prestige class prerequisites from JSON
     * @returns {Promise<Object>} Prerequisites object
     */
    static async _loadPrestigePrerequisites() {
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Checking cache...`);
        if (this._prestigePrereqCache) {
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Using cached prerequisites (${Object.keys(this._prestigePrereqCache).length} classes)`);
            return this._prestigePrereqCache;
        }

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Cache miss, fetching from JSON...`);
        try {
            const response = await fetch('systems/foundryvtt-swse/data/prestige-class-prerequisites.json');
            if (!response.ok) {
                throw new Error(`Failed to load: ${response.status}`);
            }
            this._prestigePrereqCache = await response.json();
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Successfully loaded ${Object.keys(this._prestigePrereqCache).length} prestige class prerequisites`);
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Classes with prerequisites:`, Object.keys(this._prestigePrereqCache));
            return this._prestigePrereqCache;
        } catch (err) {
            SWSELogger.error(`[CLASS-SUGGESTION-ENGINE] ERROR: Failed to load prestige prerequisites:`, err);
            SWSELogger.error(`[CLASS-SUGGESTION-ENGINE] Error details:`, err.message, err.stack);
            this._prestigePrereqCache = {};
            return this._prestigePrereqCache;
        }
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: PREREQUISITE CHECKING
    // ──────────────────────────────────────────────────────────────

    /**
     * Check prerequisites for a prestige class and return missing ones
     * @param {string} className - Name of the class
     * @param {Object} prereqData - Prerequisites data from JSON
     * @param {Object} actorState - Actor state
     * @returns {{met: boolean, missing: Array<Object>}}
     */
    static _checkPrerequisites(className, prereqData, actorState) {
        const missing = [];

        if (!prereqData) {
            return { met: true, missing: [] };
        }

        // Check character level
        if (prereqData.level && actorState.characterLevel < prereqData.level) {
            missing.push({
                type: 'level',
                required: prereqData.level,
                current: actorState.characterLevel,
                display: `Character Level ${prereqData.level}`,
                shortDisplay: `Lvl ${prereqData.level}`
            });
        }

        // Check BAB
        if (prereqData.bab && actorState.bab < prereqData.bab) {
            missing.push({
                type: 'bab',
                required: prereqData.bab,
                current: actorState.bab,
                display: `BAB +${prereqData.bab}`,
                shortDisplay: `BAB +${prereqData.bab}`
            });
        }

        // Check skills (training)
        if (prereqData.skills) {
            for (const skillName of prereqData.skills) {
                const skillKey = this._normalizeSkillName(skillName);
                if (!actorState.trainedSkills.has(skillKey)) {
                    missing.push({
                        type: 'skill',
                        name: skillName,
                        display: `Trained in ${skillName}`,
                        shortDisplay: skillName
                    });
                }
            }
        }

        // Check feats
        if (prereqData.feats) {
            for (const featName of prereqData.feats) {
                if (!actorState.ownedFeats.has(featName.toLowerCase())) {
                    missing.push({
                        type: 'feat',
                        name: featName,
                        display: `Feat: ${featName}`,
                        shortDisplay: featName
                    });
                }
            }
        }

        // Check featsOr (alternative feats)
        if (prereqData.featsOr && prereqData.featsOr.length > 0) {
            const hasAny = prereqData.featsOr.some(f =>
                actorState.ownedFeats.has(f.toLowerCase())
            );
            if (!hasAny) {
                missing.push({
                    type: 'feat_or',
                    options: prereqData.featsOr,
                    display: `One of: ${prereqData.featsOr.join(' or ')}`,
                    shortDisplay: prereqData.featsOr.join('/')
                });
            }
        }

        // Check talents (specific named talents)
        if (prereqData.talents && Array.isArray(prereqData.talents)) {
            for (const talentName of prereqData.talents) {
                if (!actorState.ownedTalents.has(talentName.toLowerCase())) {
                    missing.push({
                        type: 'talent',
                        name: talentName,
                        display: `Talent: ${talentName}`,
                        shortDisplay: talentName
                    });
                }
            }
        }

        // Check talent count from specific trees
        if (prereqData.talents && typeof prereqData.talents === 'number' && prereqData.talentTrees) {
            const requiredCount = prereqData.talents;
            const validTrees = prereqData.talentTrees.map(t => t.toLowerCase());

            // Count talents from valid trees
            let count = 0;
            for (const tree of actorState.talentTrees) {
                if (validTrees.some(vt => tree.includes(vt.toLowerCase()))) {
                    count++;
                }
            }

            if (count < requiredCount) {
                missing.push({
                    type: 'talent_count',
                    required: requiredCount,
                    current: count,
                    trees: prereqData.talentTrees,
                    display: `${requiredCount} ${prereqData.talentTrees.join('/')} Talent(s)`,
                    shortDisplay: `${requiredCount} Talent(s)`
                });
            }
        }

        // Check Force techniques
        if (prereqData.techniques && prereqData.techniques > 0) {
            // This would need to be checked against actor's Force techniques
            // For now, we'll mark as missing if the prereq exists
            missing.push({
                type: 'technique',
                required: prereqData.techniques,
                display: `${prereqData.techniques} Force Technique(s)`,
                shortDisplay: `${prereqData.techniques} Technique(s)`
            });
        }

        // Check Force powers
        if (prereqData.powers && prereqData.powers.length > 0) {
            for (const power of prereqData.powers) {
                // Check if actor has this force power
                const hasPower = actorState.ownedFeats.has(power.toLowerCase()) ||
                                 actorState.ownedTalents.has(power.toLowerCase());
                if (!hasPower) {
                    missing.push({
                        type: 'power',
                        name: power,
                        display: `Force Power: ${power}`,
                        shortDisplay: power
                    });
                }
            }
        }

        // Check "other" requirements (organization membership, etc.)
        // These typically can't be auto-validated
        if (prereqData.other && prereqData.other.length > 0) {
            for (const otherReq of prereqData.other) {
                missing.push({
                    type: 'other',
                    description: otherReq,
                    display: otherReq,
                    shortDisplay: otherReq,
                    unverifiable: true
                });
            }
        }

        return {
            met: missing.length === 0,
            missing
        };
    }

    /**
     * Count how many prerequisites are missing (excluding unverifiable ones)
     * @param {Array} missing - Array of missing prerequisites
     * @returns {number}
     */
    static _countVerifiableMissing(missing) {
        return missing.filter(m => !m.unverifiable).length;
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: TIER EVALUATION
    // ──────────────────────────────────────────────────────────────

    /**
     * Evaluate a class and assign its tier
     * @param {Object} cls - The class being evaluated
     * @param {Object} actorState - Actor state
     * @param {Object} prestigePrereqs - Prestige prerequisites data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Suggestion metadata
     */
    static async _evaluateClass(cls, actorState, prestigePrereqs, options = {}) {
        const isPrestige = cls.isPrestige;
        const prereqData = isPrestige ? prestigePrereqs[cls.name] : null;

        // Check prerequisites
        const prereqCheck = this._checkPrerequisites(cls.name, prereqData, actorState);
        const verifiableMissing = this._countVerifiableMissing(prereqCheck.missing);

        // TIER 5: Prestige class that character qualifies for NOW
        if (isPrestige && prereqCheck.met) {
            return this._buildSuggestion(
                CLASS_SUGGESTION_TIERS.PRESTIGE_NOW,
                cls.name,
                prereqCheck.missing,
                "You meet all prerequisites for this prestige class!"
            );
        }

        // TIER 4: Continuation of current class path
        if (actorState.classes[cls.name]) {
            return this._buildSuggestion(
                CLASS_SUGGESTION_TIERS.PATH_CONTINUATION,
                cls.name,
                prereqCheck.missing,
                `Continue your ${cls.name} progression`
            );
        }

        // TIER 3: Prestige class almost legal (missing <= 2 verifiable prerequisites)
        if (isPrestige && verifiableMissing > 0 && verifiableMissing <= 2) {
            const missingText = prereqCheck.missing
                .filter(m => !m.unverifiable)
                .map(m => m.shortDisplay)
                .join(', ');
            return this._buildSuggestion(
                CLASS_SUGGESTION_TIERS.PRESTIGE_SOON,
                cls.name,
                prereqCheck.missing,
                `Missing only: ${missingText}`
            );
        }

        // TIER 2: Mechanical synergy check
        const synergyScore = this._calculateSynergyScore(cls, actorState);
        if (synergyScore >= 3) {
            const synergyReason = this._getSynergyReason(cls, actorState);
            return this._buildSuggestion(
                CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY,
                cls.name,
                prereqCheck.missing,
                synergyReason
            );
        }

        // TIER 1: Thematic fit (lower synergy but still relevant)
        if (synergyScore >= 1) {
            return this._buildSuggestion(
                CLASS_SUGGESTION_TIERS.THEMATIC,
                cls.name,
                prereqCheck.missing,
                "Fits your character's theme"
            );
        }

        // TIER 0: Fallback
        return this._buildSuggestion(
            CLASS_SUGGESTION_TIERS.FALLBACK,
            cls.name,
            prereqCheck.missing
        );
    }

    /**
     * Calculate synergy score between a class and actor state
     * @param {Object} cls - The class
     * @param {Object} actorState - Actor state
     * @returns {number} Synergy score
     */
    static _calculateSynergyScore(cls, actorState) {
        const synergy = CLASS_SYNERGY_DATA[cls.name];
        if (!synergy) return 0;

        let score = 0;

        // Check ability score synergy
        if (synergy.abilities) {
            for (const ability of synergy.abilities) {
                if (ability === actorState.highestAbility) {
                    score += 2; // Highest ability match is strong
                } else if (actorState.abilityScores[ability] >= 14) {
                    score += 1; // Good ability score
                }
            }
        }

        // Check skill synergy
        if (synergy.skills) {
            for (const skill of synergy.skills) {
                if (actorState.trainedSkills.has(skill.toLowerCase())) {
                    score += 1;
                }
            }
        }

        // Check feat synergy
        if (synergy.feats) {
            for (const feat of synergy.feats) {
                if (actorState.ownedFeats.has(feat.toLowerCase())) {
                    score += 1;
                }
            }
        }

        // Check talent tree synergy
        if (synergy.talentTrees) {
            for (const tree of synergy.talentTrees) {
                if (actorState.talentTrees.has(tree.toLowerCase())) {
                    score += 1;
                }
            }
        }

        // Check talent synergy
        if (synergy.talents) {
            for (const talent of synergy.talents) {
                if (actorState.ownedTalents.has(talent.toLowerCase())) {
                    score += 2; // Specific talent match is strong
                }
            }
        }

        return score;
    }

    /**
     * Get a human-readable synergy reason
     * @param {Object} cls - The class
     * @param {Object} actorState - Actor state
     * @returns {string} Synergy reason
     */
    static _getSynergyReason(cls, actorState) {
        const synergy = CLASS_SYNERGY_DATA[cls.name];
        if (!synergy) return "General synergy with your build";

        const reasons = [];

        // Check highest ability
        if (synergy.abilities && synergy.abilities.includes(actorState.highestAbility)) {
            const abilityNames = {
                str: "Strength", dex: "Dexterity", con: "Constitution",
                int: "Intelligence", wis: "Wisdom", cha: "Charisma"
            };
            reasons.push(`Uses your high ${abilityNames[actorState.highestAbility]}`);
        }

        // Check skills
        if (synergy.skills) {
            const matchingSkills = synergy.skills.filter(s =>
                actorState.trainedSkills.has(s.toLowerCase())
            );
            if (matchingSkills.length > 0) {
                reasons.push(`Uses trained skills`);
            }
        }

        // Check feats
        if (synergy.feats) {
            const matchingFeats = synergy.feats.filter(f =>
                actorState.ownedFeats.has(f.toLowerCase())
            );
            if (matchingFeats.length > 0) {
                reasons.push(`Builds on your feats`);
            }
        }

        // Check talent trees
        if (synergy.talentTrees) {
            const matchingTrees = synergy.talentTrees.filter(t =>
                actorState.talentTrees.has(t.toLowerCase())
            );
            if (matchingTrees.length > 0) {
                reasons.push(`Expands your talent options`);
            }
        }

        return reasons.length > 0
            ? reasons.join('; ')
            : "Strong mechanical synergy with your build";
    }

    /**
     * Build a suggestion metadata object
     * @param {number} tier - The suggestion tier
     * @param {string} className - Name of the class
     * @param {Array} missingPrereqs - Missing prerequisites
     * @param {string} customReason - Optional custom reason
     * @returns {Object} Suggestion metadata
     */
    static _buildSuggestion(tier, className, missingPrereqs = [], customReason = null) {
        return {
            tier,
            icon: CLASS_TIER_ICONS[tier],
            iconClass: CLASS_TIER_ICON_CLASSES[tier],
            cssClass: CLASS_TIER_CSS_CLASSES[tier],
            reason: customReason || CLASS_TIER_REASONS[tier],
            missingPrereqs,
            hasMissingPrereqs: missingPrereqs.length > 0,
            isSuggested: tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY
        };
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: UTILITY FUNCTIONS
    // ──────────────────────────────────────────────────────────────

    /**
     * Normalize skill names to system keys
     * @param {string} skillName - Display skill name
     * @returns {string} Normalized skill key
     */
    static _normalizeSkillName(skillName) {
        const skillMap = {
            'acrobatics': 'acrobatics',
            'climb': 'climb',
            'deception': 'deception',
            'endurance': 'endurance',
            'gather information': 'gatherinformation',
            'gatherinformation': 'gatherinformation',
            'initiative': 'initiative',
            'jump': 'jump',
            'knowledge': 'knowledge',
            'knowledge (bureaucracy)': 'knowledge',
            'knowledge (galactic lore)': 'knowledge',
            'knowledge (life sciences)': 'knowledge',
            'knowledge (physical sciences)': 'knowledge',
            'knowledge (social sciences)': 'knowledge',
            'knowledge (tactics)': 'knowledge',
            'knowledge (technology)': 'knowledge',
            'mechanics': 'mechanics',
            'perception': 'perception',
            'persuasion': 'persuasion',
            'pilot': 'pilot',
            'ride': 'ride',
            'stealth': 'stealth',
            'survival': 'survival',
            'swim': 'swim',
            'treat injury': 'treatinjury',
            'treatinjury': 'treatinjury',
            'use computer': 'usecomputer',
            'usecomputer': 'usecomputer',
            'use the force': 'usetheforce',
            'usetheforce': 'usetheforce'
        };

        const normalized = skillName.toLowerCase().replace(/\s+/g, ' ').trim();
        return skillMap[normalized] || normalized.replace(/\s+/g, '');
    }

    // ──────────────────────────────────────────────────────────────
    // PUBLIC: UTILITY METHODS FOR UI
    // ──────────────────────────────────────────────────────────────

    /**
     * Get all tier definitions for UI display
     * @returns {Object} Tier definitions
     */
    static getTierDefinitions() {
        return {
            tiers: CLASS_SUGGESTION_TIERS,
            reasons: CLASS_TIER_REASONS,
            icons: CLASS_TIER_ICONS,
            iconClasses: CLASS_TIER_ICON_CLASSES,
            cssClasses: CLASS_TIER_CSS_CLASSES
        };
    }

    /**
     * Filter classes to only suggested ones
     * @param {Array} classes - Classes with suggestion metadata
     * @returns {Array} Only classes with tier >= MECHANICAL_SYNERGY
     */
    static filterSuggested(classes) {
        return classes.filter(cls => cls.suggestion?.tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY);
    }

    /**
     * Separate classes into suggested and other categories
     * @param {Array} classes - Classes with suggestion metadata
     * @returns {{suggested: Array, other: Array}}
     */
    static categorizeClasses(classes) {
        const suggested = [];
        const other = [];

        for (const cls of classes) {
            if (cls.suggestion?.tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY) {
                suggested.push(cls);
            } else {
                other.push(cls);
            }
        }

        return { suggested, other };
    }

    /**
     * Generate HTML for a class suggestion badge
     * @param {Object} suggestion - Suggestion metadata object
     * @returns {string} HTML string for the badge, or empty string if not suggested
     */
    static generateBadgeHtml(suggestion) {
        if (!suggestion || suggestion.tier <= 0) {
            return '';
        }

        const iconClass = suggestion.iconClass || CLASS_TIER_ICON_CLASSES[suggestion.tier];
        const cssClass = suggestion.cssClass || CLASS_TIER_CSS_CLASSES[suggestion.tier];
        const reason = suggestion.reason || CLASS_TIER_REASONS[suggestion.tier];

        return `<span class="class-suggestion-badge ${cssClass}" title="${reason}"><i class="${iconClass}"></i></span>`;
    }

    /**
     * Generate HTML for missing prerequisites tooltip
     * @param {Array} missingPrereqs - Array of missing prerequisite objects
     * @returns {string} HTML string for the tooltip content
     */
    static generateMissingPrereqsHtml(missingPrereqs) {
        if (!missingPrereqs || missingPrereqs.length === 0) {
            return '';
        }

        const items = missingPrereqs
            .map(prereq => `<li>${prereq.display}</li>`)
            .join('');

        return `<div class="missing-prereqs-tooltip"><strong>Missing Prerequisites:</strong><ul>${items}</ul></div>`;
    }

    /**
     * Generate suggestion legend HTML for class selection
     * @returns {string} HTML string for the legend
     */
    static generateLegendHtml() {
        return `
            <div class="class-suggestion-legend">
                <div class="class-suggestion-legend-item tier-prestige">
                    <span class="legend-icon"><i class="fas fa-star"></i></span>
                    <span>Qualified Prestige</span>
                </div>
                <div class="class-suggestion-legend-item tier-path">
                    <span class="legend-icon"><i class="fas fa-route"></i></span>
                    <span>Continue Path</span>
                </div>
                <div class="class-suggestion-legend-item tier-unlock">
                    <span class="legend-icon"><i class="fas fa-unlock"></i></span>
                    <span>Near Prestige</span>
                </div>
                <div class="class-suggestion-legend-item tier-synergy">
                    <span class="legend-icon"><i class="fas fa-cogs"></i></span>
                    <span>Build Synergy</span>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS classes for a class card based on suggestion
     * @param {Object} cls - Class with suggestion metadata
     * @returns {string} Space-separated CSS class string
     */
    static getClassCssClasses(cls) {
        const classes = [];

        if (cls.suggestion?.tier >= CLASS_SUGGESTION_TIERS.MECHANICAL_SYNERGY) {
            classes.push('is-suggested');
            if (cls.suggestion.cssClass) {
                classes.push(cls.suggestion.cssClass);
            }
        }

        if (cls.isPrestige) {
            classes.push('prestige');
        }

        return classes.join(' ');
    }
}

// ──────────────────────────────────────────────────────────────
// BUILD DIRECTION INTEGRATION
// Shared signals for feat/talent suggestion engine
// ──────────────────────────────────────────────────────────────

/**
 * Analyze character build to determine suggested direction
 * This is used by both class and feat/talent suggestion engines
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Object} Build direction analysis
 */
export async function analyzeBuildDirection(actor, pendingData = {}) {
    const actorState = await ClassSuggestionEngine._buildActorState(actor, pendingData);
    const prestigePrereqs = await ClassSuggestionEngine._loadPrestigePrerequisites();

    const direction = {
        // Primary focus areas
        themes: new Set(),
        // Target prestige classes (that character is close to qualifying for)
        prestigeTargets: [],
        // Missing prerequisites that should be prioritized
        priorityPrereqs: [],
        // Synergy signals
        signals: {
            highestAbility: actorState.highestAbility,
            trainedSkills: Array.from(actorState.trainedSkills),
            keyFeats: [],
            keyTalents: []
        }
    };

    // Analyze current classes for theme
    for (const className of Object.keys(actorState.classes)) {
        const synergy = CLASS_SYNERGY_DATA[className];
        if (synergy?.theme) {
            direction.themes.add(synergy.theme);
        }
    }

    // Find near-qualifying prestige classes
    for (const [className, prereqData] of Object.entries(prestigePrereqs)) {
        const prereqCheck = ClassSuggestionEngine._checkPrerequisites(
            className, prereqData, actorState
        );
        const verifiableMissing = ClassSuggestionEngine._countVerifiableMissing(prereqCheck.missing);

        if (verifiableMissing > 0 && verifiableMissing <= 3) {
            direction.prestigeTargets.push({
                className,
                missing: prereqCheck.missing.filter(m => !m.unverifiable),
                missingCount: verifiableMissing
            });

            // Add missing prereqs to priority list
            for (const prereq of prereqCheck.missing) {
                if (!prereq.unverifiable && prereq.type === 'feat') {
                    direction.priorityPrereqs.push({
                        type: 'feat',
                        name: prereq.name,
                        forClass: className
                    });
                } else if (!prereq.unverifiable && prereq.type === 'skill') {
                    direction.priorityPrereqs.push({
                        type: 'skill',
                        name: prereq.name,
                        forClass: className
                    });
                }
            }
        }
    }

    // Sort prestige targets by how close they are
    direction.prestigeTargets.sort((a, b) => a.missingCount - b.missingCount);

    // Identify key feats based on synergy
    for (const className of Object.keys(actorState.classes)) {
        const synergy = CLASS_SYNERGY_DATA[className];
        if (synergy?.feats) {
            direction.signals.keyFeats.push(...synergy.feats);
        }
    }

    return direction;
}
