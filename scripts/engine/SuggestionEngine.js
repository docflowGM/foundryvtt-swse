/**
 * SWSE Progression Suggestion Engine
 *
 * A deterministic, explainable system for suggesting feats and talents during level-up.
 * Suggestions are based on a strict tier order of operations:
 *
 * TIER 5 - PRESTIGE_PREREQ: Prerequisite for a prestige class you're building toward
 * TIER 4 - CHAIN_CONTINUATION: Builds on a feat or talent you already have
 * TIER 3 - SKILL_PREREQ_MATCH: Uses a trained skill you possess
 * TIER 2 - ABILITY_PREREQ_MATCH: Scales with your highest ability score
 * TIER 1 - CLASS_SYNERGY: Strong synergy with your class
 * TIER 0 - FALLBACK: Legal option (no specific suggestion)
 *
 * This engine integrates with BuildIntent to provide coherent recommendations
 * aligned with the character's apparent build direction and prestige targets.
 *
 * ARCHITECTURAL BOUNDARY (IMPORTANT):
 * This engine produces deterministic tiers and primary reasons.
 * Tier assignment is NEVER influenced by progression focus or relevance weighting.
 * Relevance annotation is applied ONLY to the explanatory reasons[] array
 * in SuggestionService._filterReasonsByFocus(), for display ranking only.
 * This tier output is immutable and final.
 *
 * This engine is a pure logic layer with no UI coupling.
 * It outputs UI-ready metadata: tier, icon, and human-readable reason.
 */

import { SWSELogger } from '../utils/logger.js';
import { BuildIntent } from './BuildIntent.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';
import { PrerequisiteChecker } from '../data/prerequisite-checker.js';
import { WishlistEngine } from './WishlistEngine.js';

// ──────────────────────────────────────────────────────────────
// TIER DEFINITIONS (ORDER MATTERS - HIGHER = BETTER)
// ──────────────────────────────────────────────────────────────

export const SUGGESTION_TIERS = {
    PRESTIGE_PREREQ: 6,
    WISHLIST_PATH: 5.5,     // Prerequisite for a wishlisted item (player goal)
    MARTIAL_ARTS: 5,        // Martial arts feat with prerequisites met
    META_SYNERGY: 5,        // Community-proven synergy combo
    SPECIES_EARLY: 4.5,     // Species feat at early levels (decays with level)
    CHAIN_CONTINUATION: 4,
    MENTOR_BIAS_MATCH: 3.5, // Matches L1 mentor survey answers
    SKILL_PREREQ_MATCH: 3,
    ABILITY_PREREQ_MATCH: 2,
    CLASS_SYNERGY: 1,
    FALLBACK: 0
};

// MOVED TO UI LAYER: TIER_REASONS, TIER_ICONS, TIER_ICON_CLASSES, TIER_CSS_CLASSES
// The engine now returns semantic reason codes only (no presentation data)

// Machine-readable reason codes for UI icon-tagging and programmatic use
export const TIER_REASON_CODES = {
    6: 'PRESTIGE_PREREQ',
    5.5: 'WISHLIST_PATH',
    5: 'META_SYNERGY',
    4.5: 'SPECIES_EARLY',
    4: 'CHAIN_CONTINUATION',
    3.5: 'MENTOR_BIAS_MATCH',
    3: 'SKILL_PREREQ_MATCH',
    2: 'ABILITY_PREREQ_MATCH',
    1: 'CLASS_SYNERGY',
    0: 'FALLBACK'
};

// Confidence levels based on tier (for mentor tone modulation)
export const TIER_CONFIDENCE = {
    6: 0.95,    // Very high - prestige path
    5.5: 0.90,  // High - player's stated goal
    5: 0.85,    // High - proven synergy
    4.5: 0.80,  // Good - species fit
    4: 0.75,    // Good - chain continuation
    3.5: 0.70,  // Moderate - mentor survey match
    3: 0.60,    // Moderate - skill fit
    2: 0.50,    // Low-moderate - ability fit
    1: 0.40,    // Low - class synergy only
    0: 0.20     // Minimal - just legal
};

// ──────────────────────────────────────────────────────────────
// SUGGESTION ENGINE CLASS
// ──────────────────────────────────────────────────────────────

export class SuggestionEngine {

    /**
     * Generate suggestions for a list of feats
     * @param {Array} feats - Array of feat objects (should already be filtered for qualification)
     * @param {Actor} actor - The actor (character)
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @param {Object} options.buildIntent - Pre-computed BuildIntent (optional, will compute if not provided)
     * @returns {Promise<Array>} Feats with suggestion metadata attached
     */
    static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
        const actorState = this._buildActorState(actor, pendingData);
        const featMetadata = options.featMetadata || {};

        // Get or compute build intent
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await BuildIntent.analyze(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
                // Create minimal fallback buildIntent with mentor biases to preserve mentor-based suggestions
                const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
                buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                    ? { mentorBiases }
                    : null;
            }
        }

        return feats.map(feat => {
            // Only suggest for qualified feats
            if (feat.isQualified === false) {
                // NEW: If includeFutureAvailability option enabled, score future availability
                if (options.includeFutureAvailability) {
                    const futureScore = this._scoreFutureAvailability(
                        feat, actor, actorState, buildIntent, pendingData
                    );
                    return {
                        ...feat,
                        suggestion: futureScore,
                        isSuggested: futureScore && futureScore.tier > 0,
                        currentlyUnavailable: true,
                        futureAvailable: !!futureScore
                    };
                }
                // Fall back to existing behavior (null suggestion)
                return {
                    ...feat,
                    suggestion: null,
                    isSuggested: false
                };
            }

            const suggestion = this._evaluateFeat(feat, actorState, featMetadata, buildIntent, actor, pendingData);
            return {
                ...feat,
                suggestion,
                isSuggested: suggestion.tier > 0
            };
        });
    }

    /**
     * Generate suggestions for a list of talents
     * @param {Array} talents - Array of talent objects (should already be filtered for qualification)
     * @param {Actor} actor - The actor (character)
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @param {Object} options.buildIntent - Pre-computed BuildIntent (optional, will compute if not provided)
     * @returns {Promise<Array>} Talents with suggestion metadata attached
     */
    static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
        const actorState = this._buildActorState(actor, pendingData);

        // Get or compute build intent
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await BuildIntent.analyze(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
                // Create minimal fallback buildIntent with mentor biases to preserve mentor-based suggestions
                const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
                buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                    ? { mentorBiases }
                    : null;
            }
        }

        return talents.map(talent => {
            // Only suggest for qualified talents
            if (talent.isQualified === false) {
                // NEW: If includeFutureAvailability option enabled, score future availability
                if (options.includeFutureAvailability) {
                    const futureScore = this._scoreFutureAvailability(
                        talent, actor, actorState, buildIntent, pendingData
                    );
                    return {
                        ...talent,
                        suggestion: futureScore,
                        isSuggested: futureScore && futureScore.tier > 0,
                        currentlyUnavailable: true,
                        futureAvailable: !!futureScore
                    };
                }
                // Fall back to existing behavior (null suggestion)
                return {
                    ...talent,
                    suggestion: null,
                    isSuggested: false
                };
            }

            const suggestion = this._evaluateTalent(talent, actorState, buildIntent, actor, pendingData);
            return {
                ...talent,
                suggestion,
                isSuggested: suggestion.tier > 0
            };
        });
    }

    /**
     * Sort items by suggestion tier (higher first), then by name
     * @param {Array} items - Array of items with suggestion metadata
     * @returns {Array} Sorted items
     */
    static sortBySuggestion(items) {
        return [...items].sort((a, b) => {
            const tierA = a.suggestion?.tier ?? -1;
            const tierB = b.suggestion?.tier ?? -1;

            // Higher tier first
            if (tierB !== tierA) {
                return tierB - tierA;
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
     * @returns {Object} Normalized actor state
     */
    static _buildActorState(actor, pendingData = {}) {
        // Get owned feats (names, lowercased for comparison)
        const ownedFeats = new Set(
            actor.items
                .filter(i => i.type === 'feat')
                .map(f => f.name.toLowerCase())
        );

        // Add pending feats
        (pendingData.selectedFeats || []).forEach(f => {
            ownedFeats.add((f.name || f).toLowerCase());
        });

        // Get owned talents (names, lowercased)
        const ownedTalents = new Set(
            actor.items
                .filter(i => i.type === 'talent')
                .map(t => t.name.toLowerCase())
        );

        // Add pending talents
        (pendingData.selectedTalents || []).forEach(t => {
            ownedTalents.add((t.name || t).toLowerCase());
        });

        // Get trained skills (skill keys)
        const trainedSkills = new Set();
        const skills = actor.system?.skills || {};
        for (const [skillKey, skillData] of Object.entries(skills)) {
            if (skillData?.trained) {
                trainedSkills.add(skillKey.toLowerCase());
            }
        }

        // Add pending skill training
        (pendingData.selectedSkills || []).forEach(s => {
            trainedSkills.add((s.key || s).toLowerCase());
        });

        // Get ability scores and find highest
        const abilities = actor.system?.attributes || {};
        let highestAbility = null;
        let highestScore = 0;

        for (const [abilityKey, abilityData] of Object.entries(abilities)) {
            const score = abilityData?.total ?? 10;
            if (score > highestScore) {
                highestScore = score;
                highestAbility = abilityKey.toLowerCase();
            }
        }

        // Get character classes (names)
        const classes = new Set(
            actor.items
                .filter(i => i.type === 'class')
                .map(c => c.name.toLowerCase())
        );

        // Add pending class
        if (pendingData.selectedClass?.name) {
            classes.add(pendingData.selectedClass.name.toLowerCase());
        }

        // Get character's species
        const speciesItem = actor.items.find(i => i.type === 'species');
        const species = speciesItem?.name?.toLowerCase() || null;

        // Get character level
        const level = actor.system?.level || 1;

        return {
            ownedFeats,
            ownedTalents,
            trainedSkills,
            highestAbility,
            highestScore,
            classes,
            species,
            level,
            // Combined set for chain checking (feats + talents)
            ownedPrereqs: new Set([...ownedFeats, ...ownedTalents])
        };
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: TIER CHECK FUNCTIONS
    // ──────────────────────────────────────────────────────────────

    /**
     * Check if option is a chain continuation and return the matching prerequisite
     * An option is a chain continuation if an owned feat or talent
     * is a direct prerequisite for this option.
     * @param {Object} option - The feat/talent being evaluated
     * @param {Object} actorState - Actor state
     * @param {Object} metadata - Optional feat metadata with chain info
     * @returns {string|null} Name of matching prerequisite or null if none
     */
    static _isChainContinuation(option, actorState, metadata = {}) {
        // Check feat metadata for prerequisiteFeat
        const featMeta = metadata[option.name];
        if (featMeta?.prerequisiteFeat) {
            const prereqName = featMeta.prerequisiteFeat.toLowerCase();
            if (actorState.ownedPrereqs.has(prereqName)) {
                return featMeta.prerequisiteFeat;
            }
        }

        // Parse prerequisites from the option's system data
        const prereqString = option.system?.prerequisite ||
                            option.system?.prerequisites ||
                            option.system?.prereqassets || '';

        if (!prereqString || prereqString === 'null') {
            return null;
        }

        // Extract feat/talent names from prerequisites
        const prereqNames = this._extractPrerequisiteNames(prereqString);

        // Check if any prerequisite is owned
        for (const prereqName of prereqNames) {
            if (actorState.ownedPrereqs.has(prereqName.toLowerCase())) {
                return prereqName;
            }
        }

        return null;
    }

    /**
     * Check if option uses a trained skill (Tier 3)
     * @param {Object} option - The feat/talent being evaluated
     * @param {Object} actorState - Actor state
     * @returns {boolean}
     */
    static _usesTrainedSkill(option, actorState) {
        const prereqString = option.system?.prerequisite ||
                            option.system?.prerequisites || '';

        if (!prereqString || prereqString === 'null') {
            return false;
        }

        // Check for "Trained in X" patterns
        const skillPattern = /trained\s+in\s+([^,;]+)/gi;
        let match;
        while ((match = skillPattern.exec(prereqString)) !== null) {
            const skillName = match[1].trim().toLowerCase();
            const skillKey = this._normalizeSkillName(skillName);
            if (actorState.trainedSkills.has(skillKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if option uses highest ability score (Tier 2)
     * @param {Object} option - The feat/talent being evaluated
     * @param {Object} actorState - Actor state
     * @returns {boolean}
     */
    static _usesHighestAbility(option, actorState) {
        if (!actorState.highestAbility) {
            return false;
        }

        const prereqString = option.system?.prerequisite ||
                            option.system?.prerequisites || '';

        if (!prereqString || prereqString === 'null') {
            return false;
        }

        // Check for ability score patterns: "Dex 13", "Strength 15", etc.
        const abilityPattern = /\b(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+\d+/gi;
        let match;
        while ((match = abilityPattern.exec(prereqString)) !== null) {
            const abilityName = match[1].toLowerCase();
            const normalizedAbility = this._normalizeAbilityName(abilityName);
            if (normalizedAbility === actorState.highestAbility) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if option has class synergy (Tier 1)
     * Checks bonus_feat_for field and class-specific tags
     * @param {Object} option - The feat/talent being evaluated
     * @param {Object} actorState - Actor state
     * @returns {boolean}
     */
    static _matchesClass(option, actorState) {
        // Check bonus_feat_for field
        const bonusFeatFor = option.system?.bonus_feat_for || [];
        for (const className of bonusFeatFor) {
            if (className === 'all' || actorState.classes.has(className.toLowerCase())) {
                return true;
            }
        }

        // Check talent tree association (talents often belong to class trees)
        const talentTree = option.system?.tree || '';
        if (talentTree) {
            for (const className of actorState.classes) {
                if (talentTree.toLowerCase().includes(className)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if feat is a martial arts feat (Tier 5)
     * @param {Object} feat - The feat being evaluated
     * @returns {boolean}
     */
    static _isMartialArtsFeat(feat) {
        return feat.system?.featType === 'martial_arts';
    }

    /**
     * Check if feat has species prerequisite matching actor's species
     * Returns a weighted tier based on character level (decays with level)
     * @param {Object} feat - The feat being evaluated
     * @param {Object} actorState - Actor state
     * @returns {Object|null} { tier, sourceId } or null if no match
     */
    static _checkSpeciesPrerequisite(feat, actorState) {
        if (!actorState.species) {
            return null;
        }

        // Check if feat has species as featType
        if (feat.system?.featType === 'species') {
            // Check if prerequisite matches species
            const prereqString = feat.system?.prerequisite || '';
            if (prereqString.toLowerCase().includes(actorState.species)) {
                // Calculate level-based decay (3-level half-life)
                const level = actorState.level || 1;
                const halfLife = 3;
                const decayFactor = Math.pow(0.5, level / halfLife);

                // Base tier is 4.5 (between chain continuation and meta synergy)
                // Apply decay: at level 1-2, full strength; level 3, 50%; level 6, 25%; etc.
                const adjustedTier = SUGGESTION_TIERS.FALLBACK +
                    (SUGGESTION_TIERS.SPECIES_EARLY - SUGGESTION_TIERS.FALLBACK) * decayFactor;

                // Check if also uses trained skill for extra boost
                const usesTrainedSkill = this._usesTrainedSkill(feat, actorState);
                const skillBoost = usesTrainedSkill ? 0.5 : 0;

                const finalTier = Math.min(adjustedTier + skillBoost, SUGGESTION_TIERS.META_SYNERGY);

                return { tier: finalTier, sourceId: `species:${actorState.species}` };
            }
        }

        return null;
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: MENTOR BIAS MATCHING
    // ──────────────────────────────────────────────────────────────

    /**
     * Check if a feat/talent matches mentor survey biases
     * Maps mentor biases to feat/talent characteristics and returns match info
     * @param {string} itemName - Name of feat or talent to check
     * @param {Object} buildIntent - BuildIntent with mentorBiases
     * @returns {Object|null} Match info with sourceId, or null if no match
     */
    static _checkMentorBiasMatch(itemName, buildIntent) {
        if (!buildIntent || !buildIntent.mentorBiases) {
            return null;
        }

        const biases = buildIntent.mentorBiases;

        // Combat style matches
        if (biases.melee > 0 && this._isMeleeItem(itemName)) {
            return {
                sourceId: 'mentor_bias:melee'
            };
        }
        if (biases.ranged > 0 && this._isRangedItem(itemName)) {
            return {
                sourceId: 'mentor_bias:ranged'
            };
        }

        // Force focus
        if (biases.forceFocus > 0 && this._isForceItem(itemName)) {
            return {
                sourceId: 'mentor_bias:force'
            };
        }

        // Stealth/sneaky
        if (biases.stealth > 0 && this._isStealthItem(itemName)) {
            return {
                sourceId: 'mentor_bias:stealth'
            };
        }

        // Social/charisma
        if (biases.social > 0 && this._isSocialItem(itemName)) {
            return {
                sourceId: 'mentor_bias:social'
            };
        }

        // Tech/mechanical
        if (biases.tech > 0 && this._isTechItem(itemName)) {
            return {
                sourceId: 'mentor_bias:tech'
            };
        }

        // Leadership
        if (biases.leadership > 0 && this._isLeadershipItem(itemName)) {
            return {
                sourceId: 'mentor_bias:leadership'
            };
        }

        // Support/defensive
        if (biases.support > 0 && this._isSupportItem(itemName)) {
            return {
                sourceId: 'mentor_bias:support'
            };
        }

        // Survival/exploration
        if (biases.survival > 0 && this._isSurvivalItem(itemName)) {
            return {
                sourceId: 'mentor_bias:survival'
            };
        }

        return null;
    }

    // Helper methods for bias matching
    static _isMeleeItem(name) {
        const meleeKeywords = ['melee', 'sword', 'blade', 'lightsaber', 'staff', 'club', 'axe', 'hammer', 'martial arts', 'close combat', 'hand-to-hand'];
        return meleeKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isRangedItem(name) {
        const rangedKeywords = ['blaster', 'rifle', 'pistol', 'bow', 'gun', 'ranged', 'throwing', 'launcher', 'sniper', 'marksman'];
        return rangedKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isForceItem(name) {
        const forceKeywords = ['force', 'jedi', 'sith', 'darksider', 'lightsaber', 'telekinesis', 'mind trick'];
        return forceKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isStealthItem(name) {
        const stealthKeywords = ['stealth', 'hide', 'shadow', 'sneak', 'escape', 'evasion', 'cloak', 'invisible', 'shadow walker'];
        return stealthKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isSocialItem(name) {
        const socialKeywords = ['persuasion', 'deception', 'bluff', 'diplomacy', 'charm', 'inspire', 'charisma', 'gather information', 'social'];
        return socialKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isTechItem(name) {
        const techKeywords = ['computer', 'mechanics', 'tech', 'droid', 'repair', 'construct', 'protocol', 'hacking', 'engineering'];
        return techKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isLeadershipItem(name) {
        const leadershipKeywords = ['command', 'leadership', 'rally', 'inspire', 'authority', 'control', 'master', 'superior'];
        return leadershipKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isSupportItem(name) {
        const supportKeywords = ['defense', 'protect', 'shield', 'guard', 'block', 'deflect', 'barrier', 'ally', 'heal'];
        return supportKeywords.some(k => name.toLowerCase().includes(k));
    }

    static _isSurvivalItem(name) {
        const survivalKeywords = ['survival', 'endurance', 'track', 'scout', 'wilderness', 'climb', 'swim', 'journey'];
        return survivalKeywords.some(k => name.toLowerCase().includes(k));
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: EVALUATE FEAT/TALENT
    // ──────────────────────────────────────────────────────────────

    /**
     * Evaluate a feat and assign its highest valid tier
     * @param {Object} feat - The feat to evaluate
     * @param {Object} actorState - Actor state
     * @param {Object} metadata - Feat metadata with chain info
     * @param {Object|null} buildIntent - Build intent analysis
     * @param {Actor|null} actor - The actor (for synergy checks)
     * @param {Object} pendingData - Pending selections
     * @returns {Object} Suggestion metadata
     */
    static _evaluateFeat(feat, actorState, metadata = {}, buildIntent = null, actor = null, pendingData = {}) {
        // Check tiers in order of priority (highest first)

        // Tier 6: Check if this feat is a priority prerequisite for a prestige class
        if (buildIntent) {
            const alignment = BuildIntent.checkFeatAlignment(feat.name, buildIntent);
            const prestigePrereq = buildIntent.priorityPrereqs.find(p =>
                p.type === 'feat' && p.name === feat.name
            );
            if (alignment.aligned && prestigePrereq) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    'PRESTIGE_PREREQ',
                    `prestige:${prestigePrereq.forClass}`
                );
            }
        }

        // Tier 5.5: Check if this feat is a prerequisite for a wishlisted item
        if (actor) {
            const wishlistPrereqCheck = this._checkWishlistPrerequisite(feat, actor);
            if (wishlistPrereqCheck) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.WISHLIST_PATH,
                    'WISHLIST_PATH',
                    `wishlist:${wishlistPrereqCheck.itemId || wishlistPrereqCheck.itemName}`
                );
            }
        }

        // Tier 5: Martial arts feat (strong recommendation)
        if (this._isMartialArtsFeat(feat)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.MARTIAL_ARTS,
                'MARTIAL_ARTS',
                null
            );
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(feat.name, 'feat', actor, pendingData);
            if (synergy) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.META_SYNERGY,
                    'META_SYNERGY',
                    null
                );
            }
        }

        // Tier 4.5 (with decay): Species prerequisite match
        const speciesCheck = this._checkSpeciesPrerequisite(feat, actorState);
        if (speciesCheck) {
            return this._buildSuggestion(
                speciesCheck.tier,
                'SPECIES_EARLY',
                speciesCheck.sourceId
            );
        }

        // Tier 4: Chain continuation
        const chainPrereq = this._isChainContinuation(feat, actorState, metadata);
        if (chainPrereq) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.CHAIN_CONTINUATION,
                'CHAIN_CONTINUATION',
                `chain:${chainPrereq}`
            );
        }

        // Tier 3.5: MENTOR BIAS - Feat matches L1 survey answer themes
        if (buildIntent && buildIntent.mentorBiases && Object.keys(buildIntent.mentorBiases).length > 0) {
            const mentorMatch = this._checkMentorBiasMatch(feat.name, buildIntent);
            if (mentorMatch) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.MENTOR_BIAS_MATCH,
                    'MENTOR_BIAS_MATCH',
                    mentorMatch.sourceId
                );
            }
        }

        // Tier 3: Uses trained skill
        if (this._usesTrainedSkill(feat, actorState)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.SKILL_PREREQ_MATCH,
                'SKILL_PREREQ_MATCH',
                `skill:${actorState.trainedSkills.values().next().value || 'trained'}`
            );
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(feat, actorState)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.ABILITY_PREREQ_MATCH,
                'ABILITY_PREREQ_MATCH',
                `ability:${actorState.highestAbility}`
            );
        }

        // Tier 1: Class synergy
        if (this._matchesClass(feat, actorState)) {
            const className = actorState.classes.values().next().value || 'general';
            return this._buildSuggestion(
                SUGGESTION_TIERS.CLASS_SYNERGY,
                'CLASS_SYNERGY',
                `class:${className}`
            );
        }

        // Check build intent alignment for non-priority feats (still tier 1)
        if (buildIntent) {
            const alignment = BuildIntent.checkFeatAlignment(feat.name, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    'CLASS_SYNERGY',
                    null
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestion(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null);
    }

    /**
     * Evaluate a talent and assign its highest valid tier
     * @param {Object} talent - The talent to evaluate
     * @param {Object} actorState - Actor state
     * @param {Object|null} buildIntent - Build intent analysis
     * @param {Actor|null} actor - The actor (for synergy checks)
     * @param {Object} pendingData - Pending selections
     * @returns {Object} Suggestion metadata
     */
    static _evaluateTalent(talent, actorState, buildIntent = null, actor = null, pendingData = {}) {
        // Check tiers in order of priority (highest first)

        // Tier 6: Check if this talent supports a prestige class path
        if (buildIntent) {
            const treeName = talent.system?.tree || '';
            const alignment = BuildIntent.checkTalentAlignment(talent.name, treeName, buildIntent);
            if (alignment.aligned && buildIntent.prestigeAffinities.length > 0 &&
                buildIntent.prestigeAffinities[0].confidence >= 0.4) {
                // Only use tier 6 if strongly aligned with top prestige target
                const prestigeClass = buildIntent.prestigeAffinities[0].className;
                return this._buildSuggestion(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    'PRESTIGE_PREREQ',
                    `prestige:${prestigeClass}`
                );
            }
        }

        // Tier 5.5: Check if this talent is a prerequisite for a wishlisted item
        if (actor) {
            const wishlistPrereqCheck = this._checkWishlistPrerequisite(talent, actor);
            if (wishlistPrereqCheck) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.WISHLIST_PATH,
                    'WISHLIST_PATH',
                    `wishlist:${wishlistPrereqCheck.itemId || wishlistPrereqCheck.itemName}`
                );
            }
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(talent.name, 'talent', actor, pendingData);
            if (synergy) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.META_SYNERGY,
                    'META_SYNERGY',
                    null
                );
            }
        }

        // Tier 4: Chain continuation
        const chainPrereq = this._isChainContinuation(talent, actorState);
        if (chainPrereq) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.CHAIN_CONTINUATION,
                'CHAIN_CONTINUATION',
                `chain:${chainPrereq}`
            );
        }

        // Tier 3.5: MENTOR BIAS - Talent matches L1 survey answer themes
        if (buildIntent && buildIntent.mentorBiases && Object.keys(buildIntent.mentorBiases).length > 0) {
            const mentorMatch = this._checkMentorBiasMatch(talent.name, buildIntent);
            if (mentorMatch) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.MENTOR_BIAS_MATCH,
                    'MENTOR_BIAS_MATCH',
                    mentorMatch.sourceId
                );
            }
        }

        // Tier 3: Uses trained skill
        if (this._usesTrainedSkill(talent, actorState)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.SKILL_PREREQ_MATCH,
                'SKILL_PREREQ_MATCH',
                `skill:${actorState.trainedSkills.values().next().value || 'trained'}`
            );
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(talent, actorState)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.ABILITY_PREREQ_MATCH,
                'ABILITY_PREREQ_MATCH',
                `ability:${actorState.highestAbility}`
            );
        }

        // Tier 1: Class synergy
        if (this._matchesClass(talent, actorState)) {
            const className = actorState.classes.values().next().value || 'general';
            return this._buildSuggestion(
                SUGGESTION_TIERS.CLASS_SYNERGY,
                'CLASS_SYNERGY',
                `class:${className}`
            );
        }

        // Check build intent alignment for non-priority talents (still tier 1)
        if (buildIntent) {
            const treeName = talent.system?.tree || '';
            const alignment = BuildIntent.checkTalentAlignment(talent.name, treeName, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    'CLASS_SYNERGY',
                    null
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestion(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null);
    }

    /**
     * Build a suggestion metadata object (engine output only - no presentation data)
     * @param {number} tier - The suggestion tier (numeric)
     * @param {string} itemName - Name of the item (for logging/tracing)
     * @param {string|null} reasonCode - Semantic reason code (e.g., 'PRESTIGE_PREREQ')
     * @param {string|null} sourceId - What caused this suggestion (e.g., 'prestige:Jedi', 'skill:stealth')
     * @returns {Object} Engine-only suggestion metadata
     */
    static _buildSuggestion(tier, itemName, reasonCode = null, sourceId = null) {
        // Find the closest tier key for lookups (handles decimal tiers like 4.5)
        const tierKey = Object.keys(TIER_REASON_CODES)
            .map(Number)
            .sort((a, b) => Math.abs(a - tier) - Math.abs(b - tier))[0];

        return {
            tier,
            reasonCode: reasonCode || TIER_REASON_CODES[tierKey] || 'FALLBACK',
            sourceId,
            confidence: TIER_CONFIDENCE[tierKey] || 0.2
        };
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: UTILITY FUNCTIONS
    // ──────────────────────────────────────────────────────────────

    /**
     * Extract prerequisite names from a prerequisite string
     * Identifies feat and talent names from prereq text
     * @param {string} prereqString - Raw prerequisite string
     * @returns {Array} Array of prerequisite names
     */
    static _extractPrerequisiteNames(prereqString) {
        const names = [];

        // Handle array format
        if (Array.isArray(prereqString)) {
            return prereqString.map(p => String(p).trim()).filter(p => p);
        }

        if (typeof prereqString !== 'string') {
            return names;
        }

        // Split by common delimiters
        const parts = prereqString.split(/[,;]|(?:\s+and\s+)/i);

        for (let part of parts) {
            part = part.trim();
            if (!part || part === 'null') {continue;}

            // Skip ability score requirements (e.g., "Dex 13")
            if (/^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+\d+/i.test(part)) {
                continue;
            }

            // Skip BAB requirements
            if (/bab|base attack bonus/i.test(part)) {
                continue;
            }

            // Skip skill training requirements (handled separately)
            if (/trained\s+in/i.test(part)) {
                continue;
            }

            // Skip character level requirements
            if (/^\d+(?:st|nd|rd|th)?\s+level|level\s+\d+/i.test(part)) {
                continue;
            }

            // Skip Force Sensitivity (it's a special case, not a typical prereq)
            if (/force\s*sensitive|force\s*sensitivity/i.test(part)) {
                continue;
            }

            // What remains should be feat or talent names
            names.push(part);
        }

        return names;
    }

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
            'gather information': 'gatherInformation',
            'gatherinformation': 'gatherInformation',
            'initiative': 'initiative',
            'jump': 'jump',
            'knowledge': 'knowledge',
            'mechanics': 'mechanics',
            'perception': 'perception',
            'persuasion': 'persuasion',
            'pilot': 'pilot',
            'ride': 'ride',
            'stealth': 'stealth',
            'survival': 'survival',
            'swim': 'swim',
            'treat injury': 'treatInjury',
            'treatinjury': 'treatInjury',
            'use computer': 'useComputer',
            'usecomputer': 'useComputer',
            'use the force': 'useTheForce',
            'usetheforce': 'useTheForce'
        };

        const normalized = skillName.toLowerCase().replace(/\s+/g, ' ').trim();
        return skillMap[normalized] || normalized;
    }

    /**
     * Normalize ability names to system keys
     * @param {string} abilityName - Display ability name
     * @returns {string} Normalized ability key
     */
    static _normalizeAbilityName(abilityName) {
        const abilityMap = {
            'str': 'str', 'strength': 'str',
            'dex': 'dex', 'dexterity': 'dex',
            'con': 'con', 'constitution': 'con',
            'int': 'int', 'intelligence': 'int',
            'wis': 'wis', 'wisdom': 'wis',
            'cha': 'cha', 'charisma': 'cha'
        };

        return abilityMap[abilityName.toLowerCase()] || abilityName.toLowerCase();
    }

    // ──────────────────────────────────────────────────────────────
    // PUBLIC: UTILITY METHODS FOR UI
    // ──────────────────────────────────────────────────────────────

    /**
     * DEPRECATED: Moved to UI layer
     * Get all tier definitions for UI display
     * @returns {Object} Tier definitions (semantic codes only, no presentation data)
     */
    static getTierDefinitions() {
        return {
            tiers: SUGGESTION_TIERS,
            reasonCodes: TIER_REASON_CODES,
            confidence: TIER_CONFIDENCE
            // Presentation mapping now lives in UI layer
        };
    }

    /**
     * Filter items to only suggested ones
     * @param {Array} items - Items with suggestion metadata
     * @returns {Array} Only items with tier > 0
     */
    static filterSuggested(items) {
        return items.filter(item => item.suggestion?.tier > 0);
    }

    /**
     * Count suggestions by tier
     * @param {Array} items - Items with suggestion metadata
     * @returns {Object} Count of items at each tier
     */
    static countByTier(items) {
        const counts = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
        for (const item of items) {
            const tier = item.suggestion?.tier ?? 0;
            counts[tier]++;
        }
        return counts;
    }

    // ──────────────────────────────────────────────────────────────
    // PUBLIC: HTML GENERATION FOR UI
    // ──────────────────────────────────────────────────────────────

    /**
     * DEPRECATED: Moved to UI layer
     * Generate HTML for a suggestion badge
     * Engine no longer provides presentation data
     * @param {Object} suggestion - Suggestion metadata object (engine output)
     * @returns {string} Empty string; UI layer should implement this
     */
    static generateBadgeHtml(suggestion) {
        // Moved to UI layer - engine provides semantic reasonCode, not presentation
        return '';
    }

    /**
     * DEPRECATED: Moved to UI layer
     * Generate HTML for suggestion legend
     * @returns {string} Empty string; UI layer should implement this
     */
    static generateLegendHtml() {
        // Moved to UI layer - engine no longer provides HTML
        return '';
    }

    /**
     * Score future availability of an unqualified feat/talent
     * Analyzes when this item will become available based on prerequisites
     * @param {Object} item - The feat or talent to evaluate
     * @param {Object} actor - The actor
     * @param {Object} actorState - Pre-computed actor state
     * @param {Object} buildIntent - Build intent analysis
     * @param {Object} pendingData - Pending selections
     * @returns {Object|null} Suggestion metadata or null if too far away
     */
    static _scoreFutureAvailability(item, actor, actorState, buildIntent, pendingData) {
        // Analyze what prerequisites are not met
        const unmetReqs = PrerequisiteChecker.getUnmetRequirements(actor, item);

        if (!unmetReqs || unmetReqs.length === 0) {
            // No unmet requirements (shouldn't happen, but handle it)
            return null;
        }

        // Analyze the pathway to qualification
        const pathway = this._analyzeQualificationPathway(
            item, actor, unmetReqs, actorState, pendingData
        );

        // Convert pathway to suggestion tier
        const futureScore = this._calcFutureAvailabilityTier(pathway, item, actorState);

        if (!futureScore) {
            return null;
        }

        // Engine output: data only, no presentation
        return {
            tier: futureScore.tier,
            reasonCode: 'FUTURE_AVAILABLE',
            sourceId: `future_availability:${pathway.levelsToQualify}`,
            confidence: 0.5,
            // Metadata for UI/pathway analysis (not presentation)
            futureAvailable: true,
            levelsToQualify: pathway.levelsToQualify,
            recommendations: pathway.recommendations,
            unmetRequirements: unmetReqs,
            pathway: pathway
        };
    }

    /**
     * Analyze the qualification pathway for unqualified items
     * @param {Object} item - The feat or talent
     * @param {Object} actor - The actor
     * @param {Array} unmetReqs - Array of unmet requirement descriptions
     * @param {Object} actorState - Pre-computed actor state
     * @param {Object} pendingData - Pending selections
     * @returns {Object} Pathway analysis object
     */
    static _analyzeQualificationPathway(item, actor, unmetReqs, actorState, pendingData) {
        const pathway = {
            levelsToQualify: 0,
            obtainableFeatReqs: [],
            obtainableSkillReqs: [],
            obtainableTalentReqs: [],
            babGainPerLevel: 0.75,
            recommendations: []
        };

        // Analyze each unmet requirement
        for (const req of unmetReqs) {
            // BAB requirements
            if (req.includes('BAB') && req.includes('you have')) {
                const match = req.match(/(\+\d+).*you have.*(\+\d+)/);
                if (match) {
                    const needed = parseInt(match[1]);
                    const current = parseInt(match[2]);
                    const babNeeded = needed - current;
                    const levelsForBab = Math.ceil(babNeeded / pathway.babGainPerLevel);
                    pathway.levelsToQualify = Math.max(pathway.levelsToQualify, levelsForBab);
                    pathway.recommendations.push(`Gain BAB through level progression (${levelsForBab} levels)`);
                }
            }

            // Character level requirements
            if (req.includes('Character Level') && req.includes('you are')) {
                const match = req.match(/(\d+).*you are level (\d+)/);
                if (match) {
                    const needed = parseInt(match[1]);
                    const current = parseInt(match[2]);
                    const levelNeeded = needed - current;
                    pathway.levelsToQualify = Math.max(pathway.levelsToQualify, levelNeeded);
                    pathway.recommendations.push(`Reach level ${needed}`);
                }
            }

            // Attribute requirements
            if (req.includes('Requires') && req.includes('you have') &&
                (req.includes('STR') || req.includes('DEX') || req.includes('CON') ||
                 req.includes('INT') || req.includes('WIS') || req.includes('CHA'))) {
                const match = req.match(/(\d+).*you have (\d+)/);
                if (match) {
                    const needed = parseInt(match[1]);
                    const current = parseInt(match[2]);
                    const abilityNeeded = needed - current;
                    // Typically 1 ability point per 4 levels of stat gain
                    const levelsForAbility = abilityNeeded * 4;
                    pathway.levelsToQualify = Math.max(pathway.levelsToQualify, levelsForAbility);
                    pathway.recommendations.push(`Increase ability score by ${abilityNeeded} (${levelsForAbility} levels)`);
                }
            }

            // Feat prerequisites
            if (req.includes('feat') && !req.includes('martial arts')) {
                const featName = req.replace(/.*requires.*feat\s+/i, '').trim();
                if (featName) {
                    pathway.obtainableFeatReqs.push(featName);
                    pathway.recommendations.push(`Select feat: ${featName}`);
                }
            }

            // Talent prerequisites
            if (req.includes('talent')) {
                const talentName = req.replace(/.*requires.*talent\s+/i, '').trim();
                if (talentName) {
                    pathway.obtainableTalentReqs.push(talentName);
                    pathway.recommendations.push(`Select talent: ${talentName}`);
                }
            }

            // Skill training requirements
            if (req.includes('trained in')) {
                const skillName = req.replace(/.*trained in\s+/i, '').trim();
                if (skillName) {
                    pathway.obtainableSkillReqs.push(skillName);
                    pathway.recommendations.push(`Train skill: ${skillName}`);
                }
            }
        }

        // Minimum 1 level if has obtainable prerequisites (feats/talents/skills)
        if ((pathway.obtainableFeatReqs.length > 0 ||
             pathway.obtainableSkillReqs.length > 0 ||
             pathway.obtainableTalentReqs.length > 0) &&
            pathway.levelsToQualify === 0) {
            pathway.levelsToQualify = 1;
        }

        return pathway;
    }

    /**
     * Calculate future availability tier based on pathway
     * @param {Object} pathway - Qualification pathway analysis
     * @param {Object} item - The feat/talent
     * @param {Object} actorState - Pre-computed actor state
     * @returns {Object|null} Tier score object or null if too far away
     */
    static _calcFutureAvailabilityTier(pathway, item, actorState) {
        if (pathway.levelsToQualify === 0) {return null;}  // Already qualified

        // NEW TIER LEVELS FOR FUTURE AVAILABILITY
        let tier;
        if (pathway.levelsToQualify <= 1) {
            tier = 0.6;  // "Very Soon"
        } else if (pathway.levelsToQualify <= 2) {
            tier = 0.4;  // "Soon"
        } else if (pathway.levelsToQualify <= 5) {
            tier = 0.2;  // "Medium Term"
        } else {
            tier = 0.05;  // "Long Term"
        }

        // If item matches class, boost slightly
        if (this._matchesClass(item, actorState)) {
            tier *= 1.2;
        }

        return { tier };
    }

    /**
     * Check if feat/talent is a prerequisite for a wishlisted item
     * @param {Object} item - The feat or talent to check
     * @param {Object} actor - The character actor
     * @returns {Object|null} Suggestion metadata or null if not a wishlist prerequisite
     */
    static _checkWishlistPrerequisite(item, actor) {
        try {
            const wishlist = WishlistEngine.getWishlist(actor);
            const wishlistedItems = [...wishlist.feats, ...wishlist.talents];

            // Check each wishlisted item to see if this feat/talent is a prerequisite
            for (const wishedItem of wishlistedItems) {
                // Try to find the actual item document
                const itemPack = item.type === 'feat'
                    ? game.packs.get('foundryvtt-swse.feats')
                    : game.packs.get('foundryvtt-swse.talents');

                if (!itemPack) {continue;}

                // For now, match by name - could be improved with proper lookups
                if (wishedItem.name.toLowerCase().includes(item.name.toLowerCase()) ||
                    item.name.toLowerCase().includes(wishedItem.name.toLowerCase())) {
                    // Skip if this item is itself wishlisted
                    if (item._id === wishedItem.id || item.id === wishedItem.id) {continue;}
                }

                // Check if this item's unmet prerequisites include the wished-for item
                const unmetReqs = PrerequisiteChecker.getUnmetRequirements(actor, { ...wishedItem });
                const prereqMentionsThisItem = unmetReqs.some(req =>
                    req.toLowerCase().includes(item.name.toLowerCase())
                );

                if (prereqMentionsThisItem) {
                    return {
                        itemId: wishedItem.id,
                        itemName: wishedItem.name,
                        wishlistedItem: wishedItem
                    };
                }
            }

            return null;
        } catch (err) {
            SWSELogger.warn('[SUGGESTION-ENGINE] Error checking wishlist prerequisites:', err);
            return null;
        }
    }

    /**
     * DEPRECATED: Moved to UI layer
     * Get CSS classes for an item row based on suggestion
     * Engine no longer provides presentation data (cssClass)
     * UI layer should map reasonCode → CSS class
     */
    static getItemCssClasses(item) {
        // Placeholder: UI layer should implement this
        return item.suggestion?.tier > 0 ? 'is-suggested' : '';
    }
}
