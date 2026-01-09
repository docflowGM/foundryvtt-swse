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
 * This engine is a pure logic layer with no UI coupling.
 * It outputs UI-ready metadata: tier, icon, and human-readable reason.
 */

import { SWSELogger } from '../utils/logger.js';
import { BuildIntent } from './BuildIntent.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';

// ──────────────────────────────────────────────────────────────
// TIER DEFINITIONS (ORDER MATTERS - HIGHER = BETTER)
// ──────────────────────────────────────────────────────────────

export const SUGGESTION_TIERS = {
    PRESTIGE_PREREQ: 6,
    MARTIAL_ARTS: 5,        // Martial arts feat with prerequisites met
    META_SYNERGY: 5,        // Community-proven synergy combo
    SPECIES_EARLY: 4.5,     // Species feat at early levels (decays with level)
    CHAIN_CONTINUATION: 4,
    SKILL_PREREQ_MATCH: 3,
    ABILITY_PREREQ_MATCH: 2,
    CLASS_SYNERGY: 1,
    FALLBACK: 0
};

export const TIER_REASONS = {
    6: "Prerequisite for a prestige class you're building toward",
    5: "Strong recommendation for your build",
    4.5: "Excellent species feat for your level",
    4: "Builds directly on a feat or talent you already have",
    3: "Uses a trained skill you possess",
    2: "Scales with your highest ability score",
    1: "Strong synergy with your class",
    0: "Legal option"
};

export const TIER_ICONS = {
    6: "fa-crown",          // Crown for prestige prereq
    5: "fa-fire",           // Fire for strong recommendations
    4.5: "fa-dna",          // DNA for species feats
    4: "fa-link",           // Chain link icon for chain continuation
    3: "fa-bullseye",       // Target for skill match
    2: "fa-fist-raised",    // Strength for ability match
    1: "fa-users-cog",      // Class synergy
    0: ""                   // No icon for fallback
};

// FontAwesome classes for rendering
export const TIER_ICON_CLASSES = {
    6: "fas fa-crown suggestion-prestige",
    5: "fas fa-fire suggestion-synergy",
    4.5: "fas fa-dna suggestion-species",
    4: "fas fa-link suggestion-chain",
    3: "fas fa-bullseye suggestion-skill",
    2: "fas fa-fist-raised suggestion-ability",
    1: "fas fa-users-cog suggestion-class",
    0: ""
};

// CSS classes for styling suggestion badges
export const TIER_CSS_CLASSES = {
    6: "suggestion-tier-prestige",
    5: "suggestion-tier-synergy",
    4.5: "suggestion-tier-species",
    4: "suggestion-tier-chain",
    3: "suggestion-tier-skill",
    2: "suggestion-tier-ability",
    1: "suggestion-tier-class",
    0: ""
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
                buildIntent = null;
            }
        }

        return feats.map(feat => {
            // Only suggest for qualified feats
            if (feat.isQualified === false) {
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
                buildIntent = null;
            }
        }

        return talents.map(talent => {
            // Only suggest for qualified talents
            if (talent.isQualified === false) {
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
     * Check if option is a chain continuation (Tier 4)
     * An option is a chain continuation if an owned feat or talent
     * is a direct prerequisite for this option.
     * @param {Object} option - The feat/talent being evaluated
     * @param {Object} actorState - Actor state
     * @param {Object} metadata - Optional feat metadata with chain info
     * @returns {boolean}
     */
    static _isChainContinuation(option, actorState, metadata = {}) {
        // Check feat metadata for prerequisiteFeat
        const featMeta = metadata[option.name];
        if (featMeta?.prerequisiteFeat) {
            const prereqName = featMeta.prerequisiteFeat.toLowerCase();
            if (actorState.ownedPrereqs.has(prereqName)) {
                return true;
            }
        }

        // Parse prerequisites from the option's system data
        const prereqString = option.system?.prerequisite ||
                            option.system?.prerequisites ||
                            option.system?.prereqassets || '';

        if (!prereqString || prereqString === 'null') {
            return false;
        }

        // Extract feat/talent names from prerequisites
        const prereqNames = this._extractPrerequisiteNames(prereqString);

        // Check if any prerequisite is owned
        for (const prereqName of prereqNames) {
            if (actorState.ownedPrereqs.has(prereqName.toLowerCase())) {
                return true;
            }
        }

        return false;
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
     * @returns {Object|null} { tier, reason } or null if no match
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

                let reason = `Excellent ${actorState.species} feat for your level`;
                if (usesTrainedSkill) {
                    reason += ' (uses your trained skill)';
                }

                return { tier: finalTier, reason };
            }
        }

        return null;
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
            if (alignment.aligned && buildIntent.priorityPrereqs.some(p =>
                p.type === 'feat' && p.name === feat.name
            )) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    feat.name,
                    alignment.reason
                );
            }
        }

        // Tier 5: Martial arts feat (strong recommendation)
        if (this._isMartialArtsFeat(feat)) {
            return this._buildSuggestion(
                SUGGESTION_TIERS.MARTIAL_ARTS,
                feat.name,
                "Martial arts feat - highly recommended when prerequisites are met"
            );
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(feat.name, 'feat', actor, pendingData);
            if (synergy) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.META_SYNERGY,
                    feat.name,
                    synergy.reason
                );
            }
        }

        // Tier 4.5 (with decay): Species prerequisite match
        const speciesCheck = this._checkSpeciesPrerequisite(feat, actorState);
        if (speciesCheck) {
            return this._buildSuggestion(
                speciesCheck.tier,
                feat.name,
                speciesCheck.reason
            );
        }

        // Tier 4: Chain continuation
        if (this._isChainContinuation(feat, actorState, metadata)) {
            return this._buildSuggestion(SUGGESTION_TIERS.CHAIN_CONTINUATION, feat.name);
        }

        // Tier 3: Uses trained skill
        if (this._usesTrainedSkill(feat, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.SKILL_PREREQ_MATCH, feat.name);
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(feat, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.ABILITY_PREREQ_MATCH, feat.name);
        }

        // Tier 1: Class synergy
        if (this._matchesClass(feat, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.CLASS_SYNERGY, feat.name);
        }

        // Check build intent alignment for non-priority feats (still tier 1)
        if (buildIntent) {
            const alignment = BuildIntent.checkFeatAlignment(feat.name, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    feat.name,
                    alignment.reason
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestion(SUGGESTION_TIERS.FALLBACK, feat.name);
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
                return this._buildSuggestion(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    talent.name,
                    alignment.reason
                );
            }
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(talent.name, 'talent', actor, pendingData);
            if (synergy) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.META_SYNERGY,
                    talent.name,
                    synergy.reason
                );
            }
        }

        // Tier 4: Chain continuation
        if (this._isChainContinuation(talent, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.CHAIN_CONTINUATION, talent.name);
        }

        // Tier 3: Uses trained skill
        if (this._usesTrainedSkill(talent, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.SKILL_PREREQ_MATCH, talent.name);
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(talent, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.ABILITY_PREREQ_MATCH, talent.name);
        }

        // Tier 1: Class synergy
        if (this._matchesClass(talent, actorState)) {
            return this._buildSuggestion(SUGGESTION_TIERS.CLASS_SYNERGY, talent.name);
        }

        // Check build intent alignment for non-priority talents (still tier 1)
        if (buildIntent) {
            const treeName = talent.system?.tree || '';
            const alignment = BuildIntent.checkTalentAlignment(talent.name, treeName, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestion(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    talent.name,
                    alignment.reason
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestion(SUGGESTION_TIERS.FALLBACK, talent.name);
    }

    /**
     * Build a suggestion metadata object
     * @param {number} tier - The suggestion tier
     * @param {string} itemName - Name of the item for logging
     * @param {string|null} customReason - Optional custom reason (overrides default)
     * @returns {Object} Suggestion metadata
     */
    static _buildSuggestion(tier, itemName, customReason = null) {
        return {
            tier,
            icon: TIER_ICONS[tier],
            iconClass: TIER_ICON_CLASSES[tier],
            cssClass: TIER_CSS_CLASSES[tier],
            reason: customReason || TIER_REASONS[tier],
            isSuggested: tier > 0
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
            if (!part || part === 'null') continue;

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
     * Get all tier definitions for UI display
     * @returns {Object} Tier definitions
     */
    static getTierDefinitions() {
        return {
            tiers: SUGGESTION_TIERS,
            reasons: TIER_REASONS,
            icons: TIER_ICONS,
            iconClasses: TIER_ICON_CLASSES,
            cssClasses: TIER_CSS_CLASSES
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
     * Generate HTML for a suggestion badge
     * @param {Object} suggestion - Suggestion metadata object
     * @returns {string} HTML string for the badge, or empty string if not suggested
     */
    static generateBadgeHtml(suggestion) {
        if (!suggestion || suggestion.tier <= 0) {
            return '';
        }

        const iconClass = suggestion.iconClass || TIER_ICON_CLASSES[suggestion.tier];
        const cssClass = suggestion.cssClass || TIER_CSS_CLASSES[suggestion.tier];
        const reason = suggestion.reason || TIER_REASONS[suggestion.tier];

        return `<span class="suggestion-badge ${cssClass}" title="${reason}"><i class="${iconClass}"></i></span>`;
    }

    /**
     * Generate HTML for suggestion legend
     * @returns {string} HTML string for the legend
     */
    static generateLegendHtml() {
        return `
            <div class="suggestion-legend">
                <div class="suggestion-legend-item tier-prestige">
                    <span class="legend-icon"><i class="fas fa-crown"></i></span>
                    <span>Prestige Path</span>
                </div>
                <div class="suggestion-legend-item tier-chain">
                    <span class="legend-icon"><i class="fas fa-link"></i></span>
                    <span>Chain Continuation</span>
                </div>
                <div class="suggestion-legend-item tier-skill">
                    <span class="legend-icon"><i class="fas fa-bullseye"></i></span>
                    <span>Uses Trained Skill</span>
                </div>
                <div class="suggestion-legend-item tier-ability">
                    <span class="legend-icon"><i class="fas fa-fist-raised"></i></span>
                    <span>Matches Highest Ability</span>
                </div>
                <div class="suggestion-legend-item tier-class">
                    <span class="legend-icon"><i class="fas fa-users-cog"></i></span>
                    <span>Class Synergy</span>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS classes for an item row based on suggestion
     * @param {Object} item - Item with suggestion metadata
     * @returns {string} Space-separated CSS class string
     */
    static getItemCssClasses(item) {
        const classes = [];

        if (item.suggestion?.tier > 0) {
            classes.push('is-suggested');
            if (item.suggestion.cssClass) {
                classes.push(item.suggestion.cssClass);
            }
        }

        return classes.join(' ');
    }
}
