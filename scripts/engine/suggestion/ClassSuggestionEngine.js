/**
 * SWSE Class Suggestion Engine (PHASE 5D: UNIFIED_TIERS Refactor)
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * A deterministic, explainable system for suggesting classes during level-up.
 * Uses UNIFIED_TIERS system for consistent cross-engine tier definitions.
 *
 * Tier Hierarchy (high→low priority):
 * - TIER 5: Prestige qualification NOW (character currently qualifies)
 * - TIER 4: Chain/path continuation (builds on character's existing choices)
 * - TIER 3: Category synergy (matches class, build intent, or theme)
 * - TIER 2: Ability/theme synergy (secondary synergy with build goals)
 * - TIER 1: Thematic fit (should work with character type)
 * - TIER 0: Fallback/available (anything goes)
 *
 * This engine integrates with the feat/talent SuggestionEngine to provide
 * coherent build direction advice.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BASE_CLASSES, calculateTotalBAB } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-suggestion-utilities.js";
import { isEpicActor, getPlannedHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/suggestion/shared-suggestion-utilities.js";
import { UNIFIED_TIERS, getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";
import { getActorSpeciesNames, namesMatchLoosely, resolveCanonicalSpeciesName } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/legacy-prereq-registry.js";
import { IdentityEngine } from "/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js";
import { calculatePrestigeDelay } from "/systems/foundryvtt-swse/scripts/engine/suggestion/prestige-delay-calculator.js";

// ──────────────────────────────────────────────────────────────
// DEPRECATED: Legacy tier definitions (kept for backwards compatibility)
// Use UNIFIED_TIERS from suggestion-unified-tiers.js instead
// ──────────────────────────────────────────────────────────────

export const CLASS_SUGGESTION_TIERS = {
    PRESTIGE_NOW: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,      // 5
    PATH_CONTINUATION: UNIFIED_TIERS.PATH_CONTINUATION,      // 4
    PRESTIGE_SOON: UNIFIED_TIERS.PATH_CONTINUATION,          // 4 (mapped from 3)
    MECHANICAL_SYNERGY: UNIFIED_TIERS.ABILITY_SYNERGY,       // 2
    THEMATIC: UNIFIED_TIERS.THEMATIC_FIT,                    // 1
    FALLBACK: UNIFIED_TIERS.AVAILABLE                        // 0
};

// Prestige bias - prestige classes get a bonus when sorting
export const PRESTIGE_BIAS = {
    prestige: 3,
    advanced: 1,
    base: 0
};

// ──────────────────────────────────────────────────────────────
// CLASS SYNERGY DATA (PHASE F PART 2: Consolidated)
// Now imported from shared-suggestion-utilities.js
// Re-exported here for backwards compatibility
// ──────────────────────────────────────────────────────────────

export { CLASS_SYNERGY_DATA };

const SPECIES_CLASS_AFFINITY = {
    miraluka: ['Jedi', 'Force Adept', 'Force Disciple', 'Jedi Knight', 'Jedi Master', 'Sith Apprentice', 'Sith Lord'],
    twilek: ['Noble', 'Scoundrel', 'Crime Lord'],
    rodian: ['Scout', 'Scoundrel', 'Bounty Hunter', 'Gunslinger'],
    wookiee: ['Soldier', 'Jedi', 'Elite Trooper', 'Melee Duelist'],
    yarkora: ['Scoundrel', 'Noble', 'Scout', 'Crime Lord', 'Officer'],
    cerean: ['Jedi', 'Noble', 'Officer'],
    moncalamari: ['Scout', 'Noble', 'Ace Pilot', 'Officer'],
    sullustan: ['Scout', 'Scoundrel', 'Ace Pilot'],
    zabrak: ['Soldier', 'Jedi', 'Elite Trooper'],
    bothan: ['Scoundrel', 'Noble', 'Scout', 'Crime Lord'],
    human: ['Jedi', 'Noble', 'Scout', 'Scoundrel', 'Soldier']
};
const SPECIES_TAPER_END_LEVEL = 8;
const STARTING_CLASS_DECAY_END_LEVEL = 5;

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
        const planned = getPlannedHeroicLevel(actor, pendingData);
        if (pendingData?.epicAdvisory || isEpicActor(actor, planned)) {
            const tierMetadata = getTierMetadata(UNIFIED_TIERS.AVAILABLE);
            return classes.map(cls => ({
                ...cls,
                suggestion: {
                    tier: UNIFIED_TIERS.AVAILABLE,
                    reason: 'Epic advisory mode (no ranking)',
                    icon: tierMetadata.icon,
                    label: tierMetadata.label
                },
                isSuggested: false,
                advisory: true
            }));
        }

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
            classes: Object.keys(actorState.classes),
            baseClassLevel: actorState.baseClassLevel,
            startingClass: actorState.startingClass
        });

        // Check for prestige class target from L1 survey
        const prestigeClassTarget = pendingData?.prestigeClassTarget || actor.system?.swse?.mentorBuildIntentBiases?.prestigeClassTarget || null;
        if (prestigeClassTarget) {
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Prestige class target detected: "${prestigeClassTarget}"`);
        }

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Loading prestige prerequisites...`);
        const prestigePrereqs = await this._loadPrestigePrerequisites();
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Prestige prerequisites loaded:`, Object.keys(prestigePrereqs).length, 'classes');

        const suggestions = [];

        for (const cls of classes) {
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Evaluating class "${cls.name}"...`);
            const suggestion = await this._evaluateClass(cls, actorState, prestigePrereqs, { ...options, prestigeClassTarget, actor });

            // Calculate bias for sorting
            const classType = (cls.isPrestige === true || cls.prestigeClass === true || cls.baseClass === false) ? 'prestige' : 'base';
            let bias = PRESTIGE_BIAS[classType] || 0;
            const prereqData = cls.isPrestige ? prestigePrereqs[cls.name] : null;

            if (cls.isPrestige && this._matchesRequiredSpecies(prereqData?.species, actorState)) {
                bias += 2;
            }

            // Boost prestige classes that match the player's target
            if (cls.isPrestige && cls.name === prestigeClassTarget) {
                bias += 5; // Significant boost for target class
                SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Prestige class target match - boosting "${cls.name}" bias`);
            }

            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] suggestClasses: Class "${cls.name}" - tier: ${suggestion.tier}, bias: ${bias}, isSuggested: ${suggestion.tier >= UNIFIED_TIERS.ABILITY_SYNERGY}`);

            suggestions.push({
                ...cls,
                suggestion,
                isSuggested: suggestion.tier >= UNIFIED_TIERS.ABILITY_SYNERGY,  // TIER 2+
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
            const aPrestige = a.isPrestige === true || a.prestigeClass === true || a.baseClass === false;
            const bPrestige = b.isPrestige === true || b.prestigeClass === true || b.baseClass === false;
            if (aPrestige !== bPrestige) {
                return aPrestige ? -1 : 1;
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
        const pendingSkillsRaw = pendingData.selectedSkills;
        const pendingSkills = Array.isArray(pendingSkillsRaw)
            ? pendingSkillsRaw
            : (pendingSkillsRaw && typeof pendingSkillsRaw === 'object')
                ? Object.keys(pendingSkillsRaw).filter(key => pendingSkillsRaw[key])
                : [];
        pendingSkills.forEach(s => {
            const key = (s?.key || s);
            if (typeof key === 'string' && key.length > 0) {
                trainedSkills.add(key.toLowerCase());
            }
        });
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _buildActorState: After pending skills (${trainedSkills.size}):`, Array.from(trainedSkills));

        // Get ability scores and find highest. Chargen uses pending attribute state
        // before the actor is finalized, so do not rely only on actor.system here.
        let highestAbility = null;
        let highestScore = 0;
        const abilityScores = {};

        for (const abilityKey of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            const score = this._getPendingOrActorAbilityScore(actor, pendingData, abilityKey);
            abilityScores[abilityKey] = score;
            if (score > highestScore) {
                highestScore = score;
                highestAbility = abilityKey;
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

        const speciesNames = getActorSpeciesNames(actor, pendingData);
        const startingClass = pendingData?.startingClass || actor.getFlag?.('foundryvtt-swse', 'startingClass') || actor.getFlag?.('swse', 'startingClass') || null;
        const baseClassLevel = Object.entries(actor.system?.classes || {})
            .filter(([className]) => BASE_CLASSES.includes(className))
            .reduce((sum, [, classData]) => sum + (classData?.level || 0), 0);

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
            baseClassLevel,
            startingClass,
            speciesNames,
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
     * Load prestige class prerequisites from canonical authority
     * @returns {Promise<Object>} Prerequisites object in suggestion-engine format
     */
    static async _loadPrestigePrerequisites() {
        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Loading from canonical authority...`);
        if (this._prestigePrereqCache) {
            SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Using cached prerequisites (${Object.keys(this._prestigePrereqCache).length} classes)`);
            return this._prestigePrereqCache;
        }

        SWSELogger.log(`[CLASS-SUGGESTION-ENGINE] _loadPrestigePrerequisites: Loading from PRESTIGE_PREREQUISITES...`);
        try {
            // Convert canonical PRESTIGE_PREREQUISITES to suggestion-engine format
            this._prestigePrereqCache = this._convertPrestigePrerequisites(PRESTIGE_PREREQUISITES);
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

    /**
     * Convert PRESTIGE_PREREQUISITES to suggestion-engine format
     * @private
     */
    static _convertPrestigePrerequisites(prestige) {
        const converted = {};

        for (const [className, prereqs] of Object.entries(prestige)) {
            converted[className] = {
                level: prereqs.minLevel,
                bab: prereqs.minBAB,
                skills: prereqs.skills,
                feats: prereqs.feats,
                featsOr: prereqs.featsAny,
                talents: prereqs.talents?.specific,
                talentTrees: prereqs.talents?.trees,
                techniques: prereqs.forceTechniques?.count,
                powers: prereqs.forcePowers,
                species: prereqs.species,
                other: prereqs.special ? [prereqs.special] : []
            };
        }

        return converted;
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

    static _matchesRequiredSpecies(requiredSpecies, actorState) {
        if (!Array.isArray(requiredSpecies) || requiredSpecies.length === 0) {
            return false;
        }

        const actorSpecies = actorState?.speciesNames || [];
        if (!actorSpecies.length) {
            return false;
        }

        const canonicalRequired = requiredSpecies
            .map((entry) => resolveCanonicalSpeciesName(entry))
            .filter(Boolean);

        return canonicalRequired.some((required) => actorSpecies.some((owned) => namesMatchLoosely(owned, required)));
    }

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

        if (prereqData.species && prereqData.species.length > 0) {
            const requiredSpecies = prereqData.species.map((entry) => resolveCanonicalSpeciesName(entry)).filter(Boolean);
            const actorSpecies = actorState.speciesNames || [];
            const hasRequiredSpecies = requiredSpecies.some((required) => actorSpecies.some((owned) => namesMatchLoosely(owned, required)));
            if (!hasRequiredSpecies) {
                missing.push({
                    type: 'species',
                    options: requiredSpecies,
                    display: `Species: ${requiredSpecies.join(' or ')}`,
                    shortDisplay: requiredSpecies.join('/')
                });
            }
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
        const isPrestige = cls.isPrestige === true || cls.prestigeClass === true || cls.baseClass === false;
        const prereqData = isPrestige ? prestigePrereqs[cls.name] : null;
        const prestigeClassTarget = options.prestigeClassTarget || null;

        // Check prerequisites
        const prereqCheck = this._checkPrerequisites(cls.name, prereqData, actorState);
        const verifiableMissing = this._countVerifiableMissing(prereqCheck.missing);

        // TIER 5: Prestige class that character qualifies for NOW
        if (isPrestige && prereqCheck.met) {
            return this._buildSuggestion(
                UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,
                cls.name,
                prereqCheck.missing,
                'You meet all prerequisites for this prestige class!'
            );
        }

        // TIER 5 (PLAYER INTENT): Prestige class that matches player's L1 survey target
        // This gives high priority to classes the player explicitly expressed interest in
        if (isPrestige && cls.name === prestigeClassTarget) {
            const tier = prereqCheck.met
                ? UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW
                : UNIFIED_TIERS.PATH_CONTINUATION;  // PRESTIGE_SOON mapped to PATH_CONTINUATION (4)
            const reason = prereqCheck.met
                ? 'This matches your character goal and you qualify now!'
                : `This matches your character goal - you're almost there! Missing: ${prereqCheck.missing.filter(m => !m.unverifiable).map(m => m.shortDisplay).join(', ')}`;
            return this._buildSuggestion(
                tier,
                cls.name,
                prereqCheck.missing,
                reason
            );
        }

        // TIER 4: Continuation of current class path
        if (actorState.classes[cls.name]) {
            return this._buildSuggestion(
                UNIFIED_TIERS.PATH_CONTINUATION,
                cls.name,
                prereqCheck.missing,
                `Continue your ${cls.name} progression`
            );
        }

        // SPECIAL: Check if this base class unlocks needed talent trees, skills, or feats for prestige target
        if (!isPrestige && prestigeClassTarget && prestigePrereqs[prestigeClassTarget]) {
            const targetPrereqs = prestigePrereqs[prestigeClassTarget];
            const unlockedTrees = this._getUnlockedTalentTrees(cls.name);
            const classSkills = CLASS_SYNERGY_DATA[cls.name]?.skills || [];
            const classFeats = CLASS_SYNERGY_DATA[cls.name]?.feats || [];

            const neededTrees = targetPrereqs.talentTrees || [];
            const neededSkills = targetPrereqs.skills || [];
            const neededFeats = targetPrereqs.feats || [];

            // Check which prerequisites this class helps unlock
            const providesNeededTrees = neededTrees.some(neededTree =>
                unlockedTrees.some(provided => provided.toLowerCase() === neededTree.toLowerCase())
            );

            const providesNeededSkills = neededSkills.some(neededSkill =>
                classSkills.some(classSkill =>
                    this._normalizeSkillName(classSkill).includes(
                        this._normalizeSkillName(neededSkill)
                    )
                )
            );

            const providesNeededFeats = neededFeats.some(neededFeat =>
                classFeats.some(classFeat => classFeat.toLowerCase() === neededFeat.toLowerCase())
            );

            if (providesNeededTrees || providesNeededSkills || providesNeededFeats) {
                const benefits = [];

                if (providesNeededTrees) {
                    const providedTreeNames = unlockedTrees.filter(t =>
                        neededTrees.some(n => n.toLowerCase() === t.toLowerCase())
                    ).join(', ');
                    benefits.push(`unlocks ${providedTreeNames} talents`);
                }

                if (providesNeededSkills) {
                    benefits.push('trains skills that target path needs');
                }

                if (providesNeededFeats) {
                    benefits.push('supports prerequisite feat progress');
                }

                let reason = `${cls.name} helps set up ${prestigeClassTarget}`;
                try {
                    const delay = await calculatePrestigeDelay(options.actor || {}, prestigeClassTarget, cls.name);
                    if (Number.isFinite(delay?.earliestLevel)) {
                        const levelsUntil = Math.max(0, delay.earliestLevel - ((options.actor?.system?.level || actorState.characterLevel) || 1));
                        const timingText = levelsUntil <= 1
                            ? `and can open ${prestigeClassTarget} on your next level`
                            : `and can open ${prestigeClassTarget} in ${levelsUntil} levels`;
                        reason = `${cls.name} ${timingText}`;
                    }
                } catch (_err) {
                    // Keep setup reason if the forecast helper cannot project this path cleanly.
                }

                if (benefits.length > 0) {
                    reason += ` by ${benefits.join(', ')}`;
                }

                return this._buildSuggestion(
                    UNIFIED_TIERS.PATH_CONTINUATION,
                    cls.name,
                    [],
                    reason
                );
            }
        }

        // TIER 4/3: Prestige class almost legal (missing <= 2 verifiable prerequisites)
        if (isPrestige && verifiableMissing > 0 && verifiableMissing <= 2) {
            const missingText = prereqCheck.missing
                .filter(m => !m.unverifiable)
                .map(m => m.shortDisplay)
                .join(', ');
            return this._buildSuggestion(
                UNIFIED_TIERS.CATEGORY_SYNERGY,  // PRESTIGE_SOON mapped to CATEGORY_SYNERGY (3)
                cls.name,
                prereqCheck.missing,
                `Missing only: ${missingText}`
            );
        }

        // TIER 2: Ability/mechanical synergy check
        const fit = this._getClassFitReasons(cls, actorState);
        const synergyScore = this._calculateSynergyScore(cls, actorState) + fit.bonus;
        if (synergyScore >= 3) {
            const synergyReason = fit.reasons[0] || this._getSynergyReason(cls, actorState);
            return this._buildSuggestion(
                UNIFIED_TIERS.ABILITY_SYNERGY,
                cls.name,
                prereqCheck.missing,
                synergyReason,
                { reasons: fit.reasons, cautions: fit.cautions }
            );
        }

        // TIER 1: Thematic fit (lower synergy but still relevant)
        if (synergyScore >= 1) {
            const reason = fit.reasons[0] || `${cls.name} gives this build a workable starting lane.`;
            return this._buildSuggestion(
                UNIFIED_TIERS.THEMATIC_FIT,
                cls.name,
                prereqCheck.missing,
                reason,
                { reasons: fit.reasons.length ? fit.reasons : [reason], cautions: fit.cautions }
            );
        }

        // TIER 0: Fallback
        return this._buildSuggestion(
            UNIFIED_TIERS.AVAILABLE,
            cls.name,
            prereqCheck.missing
        );
    }

    static _getPendingOrActorAbilityScore(actor, pendingData = {}, abilityKey) {
        const key = String(abilityKey || '').toLowerCase();
        const abilityState = pendingData?.abilityIncreases || pendingData?.attributes || {};
        const candidates = [
            abilityState?.finalValues?.[key],
            abilityState?.values?.[key]?.score,
            abilityState?.values?.[key]?.value,
            abilityState?.values?.[key],
            abilityState?.baseValues?.[key],
            pendingData?.abilityScores?.[key],
            actor?.system?.attributes?.[key]?.total,
            actor?.system?.attributes?.[key]?.value,
            actor?.system?.abilities?.[key]?.value,
            actor?.system?.abilities?.[key]?.base,
        ];
        for (const candidate of candidates) {
            const score = Number(candidate);
            if (Number.isFinite(score) && score > 0) return score;
        }
        return 10;
    }

    static _abilityName(key) {
        return ({ str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' })[String(key || '').toLowerCase()] || String(key || '').toUpperCase();
    }

    static _getClassFitReasons(cls, actorState) {
        const synergy = CLASS_SYNERGY_DATA[cls.name] || {};
        const reasons = [];
        const cautions = [];
        let bonus = 0;

        for (const ability of synergy.abilities || []) {
            const key = String(ability || '').toLowerCase();
            const score = Number(actorState.abilityScores?.[key] || 10);
            const name = this._abilityName(key);
            if (score >= 16) {
                reasons.push(`Your character has high ${name} (${score}), which is excellent for ${cls.name}.`);
                bonus += 2;
            } else if (score >= 14) {
                reasons.push(`Your character has above average ${name} (${score}), which benefits ${cls.name}.`);
                bonus += 1.25;
            } else if (score >= 12) {
                reasons.push(`Your ${name} (${score}) is solid enough to support ${cls.name}.`);
                bonus += 0.5;
            } else if (score <= 8) {
                cautions.push(`Your low ${name} (${score}) may make some ${cls.name} options harder to use well.`);
                bonus -= 0.75;
            }
        }

        const speciesBonus = this._getSpeciesAffinityBias(actorState, cls.name);
        if (speciesBonus > 0) {
            const speciesName = actorState.speciesNames?.[0] || 'species';
            reasons.push(`${speciesName} characters often pair cleanly with ${cls.name}.`);
            bonus += speciesBonus;
        }

        if ((synergy.skills || []).length) {
            reasons.push(`${cls.name} opens useful class-skill lanes like ${(synergy.skills || []).slice(0, 3).join(', ')}.`);
        }

        return {
            reasons: Array.from(new Set(reasons)).slice(0, 4),
            cautions: Array.from(new Set(cautions)).slice(0, 2),
            bonus,
        };
    }

    /**
     * Calculate synergy score between a class and actor state
     * @param {Object} cls - The class
     * @param {Object} actorState - Actor state
     * @returns {number} Synergy score
     */
    static _calculateSynergyScore(cls, actorState) {
        const synergy = CLASS_SYNERGY_DATA[cls.name];
        if (!synergy) {return 0;}

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
        if (!synergy) {return 'General synergy with your build';}

        const reasons = [];

        // Check highest ability
        if (synergy.abilities && synergy.abilities.includes(actorState.highestAbility)) {
            const abilityNames = {
                str: 'Strength', dex: 'Dexterity', con: 'Constitution',
                int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
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
            : 'Strong mechanical synergy with your build';
    }

    /**
     * Build a suggestion metadata object
     * Uses UNIFIED_TIERS system for consistent tier metadata
     * @param {number} tier - The suggestion tier (0-6 from UNIFIED_TIERS)
     * @param {string} className - Name of the class
     * @param {Array} missingPrereqs - Missing prerequisites
     * @param {string} customReason - Optional custom reason
     * @returns {Object} Suggestion metadata
     */
    static _buildSuggestion(tier, className, missingPrereqs = [], customReason = null, extras = {}) {
        const tierMetadata = getTierMetadata(tier);
        const reasons = Array.isArray(extras.reasons) && extras.reasons.length
            ? extras.reasons
            : (customReason ? [customReason] : []);
        return {
            tier,
            icon: tierMetadata.icon,
            color: tierMetadata.color,
            label: tierMetadata.label,
            reason: customReason || tierMetadata.description,
            reasons,
            cautions: extras.cautions || extras.cautionReasons || [],
            cautionReasons: extras.cautions || extras.cautionReasons || [],
            missingPrereqs,
            hasMissingPrereqs: missingPrereqs.length > 0,
            isSuggested: tier >= UNIFIED_TIERS.ABILITY_SYNERGY  // TIER 2+
        };
    }

    /**
     * Get talent trees unlocked by a class
     * @param {string} className - Name of the class
     * @returns {Array} Talent tree names provided by this class
     */
    static _getUnlockedTalentTrees(className) {
        const synergy = CLASS_SYNERGY_DATA[className];
        return synergy?.talentTrees || [];
    }

    static _getClassPatternBiasScore(actor, className) {
        try {
            const classBias = IdentityEngine.computeClassBias(actor);
            const normalized = String(className || '').toLowerCase();
            const exact = classBias?.mechanicalBias?.[normalized] ?? classBias?.roleBias?.[normalized] ?? classBias?.attributeBias?.[normalized] ?? 0;
            return Number.isFinite(exact) ? exact * 2 : 0;
        } catch (_err) {
            return 0;
        }
    }

    static _getStartingClassDecayBonus(actorState, className) {
        const startingClass = String(actorState?.startingClass || '').toLowerCase();
        const candidate = String(className || '').toLowerCase();
        if (!startingClass || !candidate || startingClass !== candidate) {
            return 0;
        }

        const baseLevel = Number(actorState?.baseClassLevel || actorState?.characterLevel || 1);
        if (baseLevel >= STARTING_CLASS_DECAY_END_LEVEL) {
            return 0;
        }

        const progress = Math.max(0, (baseLevel - 1) / Math.max(1, STARTING_CLASS_DECAY_END_LEVEL - 1));
        return Math.max(0, 1.5 * (1 - progress));
    }

    static _getSpeciesAffinityBias(actorState, className) {
        const speciesNames = Array.isArray(actorState?.speciesNames) ? actorState.speciesNames : [];
        if (!speciesNames.length) {
            return 0;
        }

        const baseLevel = Number(actorState?.baseClassLevel || actorState?.characterLevel || 1);
        const taper = Math.max(0, 1 - ((Math.max(1, baseLevel) - 1) / Math.max(1, SPECIES_TAPER_END_LEVEL - 1)));
        if (taper <= 0) {
            return 0;
        }

        const candidate = String(className || '').toLowerCase();
        for (const speciesName of speciesNames) {
            const key = String(speciesName || '').toLowerCase().replace(/[^a-z]/g, '');
            const affinities = SPECIES_CLASS_AFFINITY[key] || [];
            if (affinities.some(name => String(name).toLowerCase() === candidate)) {
                return 1.25 * taper;
            }
        }

        return 0;
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
     * Now uses UNIFIED_TIERS system
     * @returns {Object} Tier definitions
     */
    static getTierDefinitions() {
        return UNIFIED_TIERS;
    }

    /**
     * Filter classes to only suggested ones
     * @param {Array} classes - Classes with suggestion metadata
     * @returns {Array} Only classes with tier >= ABILITY_SYNERGY (2)
     */
    static filterSuggested(classes) {
        return classes.filter(cls => cls.suggestion?.tier >= UNIFIED_TIERS.ABILITY_SYNERGY);
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
            if (cls.suggestion?.tier >= UNIFIED_TIERS.ABILITY_SYNERGY) {  // TIER 2+
                suggested.push(cls);
            } else {
                other.push(cls);
            }
        }

        return { suggested, other };
    }

    /**
     * Generate HTML for a class suggestion badge
     * Uses UNIFIED_TIERS system for styling
     * @param {Object} suggestion - Suggestion metadata object
     * @returns {string} HTML string for the badge, or empty string if not suggested
     */
    static generateBadgeHtml(suggestion) {
        if (!suggestion || suggestion.tier <= 0) {
            return '';
        }

        const tierMetadata = getTierMetadata(suggestion.tier);
        const reason = suggestion.reason || tierMetadata.description;
        const color = tierMetadata.color;
        const icon = tierMetadata.icon;

        return `<span class="suggestion-tier-badge tier-${suggestion.tier}" style="background-color: ${color};" title="${reason}">${icon} ${tierMetadata.label}</span>`;
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
                    <span class="legend-icon"><i class="fa-solid fa-star"></i></span>
                    <span>Qualified Prestige</span>
                </div>
                <div class="class-suggestion-legend-item tier-path">
                    <span class="legend-icon"><i class="fa-solid fa-route"></i></span>
                    <span>Continue Path</span>
                </div>
                <div class="class-suggestion-legend-item tier-unlock">
                    <span class="legend-icon"><i class="fa-solid fa-unlock"></i></span>
                    <span>Near Prestige</span>
                </div>
                <div class="class-suggestion-legend-item tier-synergy">
                    <span class="legend-icon"><i class="fa-solid fa-gears"></i></span>
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

        if (cls.suggestion?.tier >= UNIFIED_TIERS.ABILITY_SYNERGY) {  // TIER 2+
            classes.push('is-suggested');
            classes.push(`suggestion-tier-${cls.suggestion.tier}`);
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
