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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BuildIntent } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";
import { getSynergyForItem, findActiveSynergies } from "/systems/foundryvtt-swse/scripts/engine/suggestion/CommunityMetaSynergies.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { WishlistEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/WishlistEngine.js";
import { UNIFIED_TIERS } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import {
    getPrimaryArchetypeForActor,
    getArchetypeFeats,
    getArchetypeTalents,
    isArchetypeRecommended,
    getRoleBiasForArchetype
} from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry-integration.js";
import { selectReasonAtoms } from "/systems/foundryvtt-swse/scripts/engine/suggestion/selectReasonAtoms.js";
import { REASON_TEXT_MAP } from "/systems/foundryvtt-swse/scripts/mentor/mentor-reason-renderer.js";
import { ReasonSignalBuilder } from "/systems/foundryvtt-swse/scripts/engine/suggestion/reason-signal-builder.js";

// ──────────────────────────────────────────────────────────────
// TIER DEFINITIONS (PHASE 5D: UNIFIED_TIERS Refactor)
// ──────────────────────────────────────────────────────────────
// Now uses UNIFIED_TIERS system for consistent cross-engine tiers.
// Legacy constants preserved for backwards compatibility.

export const SUGGESTION_TIERS = {
    PRESTIGE_PREREQ: UNIFIED_TIERS.PRESTIGE_PREREQUISITE,        // 6
    WISHLIST_PATH: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,         // 5 (mapped from 5.5)
    MARTIAL_ARTS: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,          // 5
    META_SYNERGY: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,          // 5
    SPECIES_EARLY: UNIFIED_TIERS.PATH_CONTINUATION,              // 4 (mapped from 4.5)
    CHAIN_CONTINUATION: UNIFIED_TIERS.PATH_CONTINUATION,         // 4
    ARCHETYPE_RECOMMENDATION: UNIFIED_TIERS.CATEGORY_SYNERGY,    // 3 (Phase 4: Archetype Integration)
    MENTOR_BIAS_MATCH: UNIFIED_TIERS.CATEGORY_SYNERGY,           // 3 (mapped from 3.5)
    SKILL_PREREQ_MATCH: UNIFIED_TIERS.CATEGORY_SYNERGY,          // 3
    ABILITY_PREREQ_MATCH: UNIFIED_TIERS.ABILITY_SYNERGY,         // 2
    CLASS_SYNERGY: UNIFIED_TIERS.THEMATIC_FIT,                   // 1
    FALLBACK: UNIFIED_TIERS.AVAILABLE                            // 0
};

// Machine-readable reason codes for UI icon-tagging and programmatic use
export const TIER_REASON_CODES = {
    6: 'PRESTIGE_PREREQ',
    5: 'META_SYNERGY',
    4: 'CHAIN_CONTINUATION',
    3: 'ARCHETYPE_RECOMMENDATION', // Maps to both ARCHETYPE_RECOMMENDATION, MENTOR_BIAS_MATCH, and SKILL_PREREQ_MATCH
    2: 'ABILITY_PREREQ_MATCH',
    1: 'CLASS_SYNERGY',
    0: 'FALLBACK'
};

// Confidence levels based on tier (for mentor tone modulation)
export const TIER_CONFIDENCE = {
    6: 0.95,    // Very high - prestige path
    5: 0.85,    // High - proven synergy or prestige ready
    4: 0.75,    // Good - chain continuation
    3: 0.60,    // Moderate - skill fit or category synergy
    2: 0.50,    // Low-moderate - ability fit
    1: 0.40,    // Low - thematic fit
    0: 0.20     // Minimal - just legal
};

// ──────────────────────────────────────────────────────────────
// TIER 3 SUBPRIORITY WEIGHTING (Phase 2.5)
// ──────────────────────────────────────────────────────────────
// Replace "first match wins" with structured subpriority scoring
// Tier 3 remains unchanged; internal weighting provides stability

export const TIER3_SUBPRIORITY = {
    ARCHETYPE: 0.15,      // Declared structural intent (highest authority)
    MENTOR: 0.10,         // Survey-derived preference (medium authority)
    SKILL: 0.05,          // Mechanical synergy heuristic (lowest authority)
    PRESTIGE: 0.15        // Prestige survey signal (same as archetype - declared intent)
};

export const TIER3_MAX_BONUS = 0.25;  // Cap total Tier 3 bonus

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

        // Get primary archetype for character (Phase 4: Archetype Integration)
        let primaryArchetype = null;
        let archetypeRecommendedFeatIds = [];
        try {
            primaryArchetype = await getPrimaryArchetypeForActor(actor);
            if (primaryArchetype) {
                archetypeRecommendedFeatIds = await getArchetypeFeats(actor);
                SWSELogger.log(
                    `[SuggestionEngine] ${actor.name} matches archetype: ${primaryArchetype.name}`
                );
            }
        } catch (err) {
            SWSELogger.debug('[SuggestionEngine] Archetype retrieval failed (optional):', err);
            // Graceful fallback - continue without archetype
        }

        return Promise.all(feats.map(feat => {
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

            const suggestion = this._evaluateFeat(
                feat, actorState, featMetadata, buildIntent, actor, pendingData,
                primaryArchetype, archetypeRecommendedFeatIds
            );
            return {
                ...feat,
                suggestion,
                isSuggested: suggestion.tier > 0
            };
        }));
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

        // Get primary archetype for character (Phase 4: Archetype Integration)
        let primaryArchetype = null;
        let archetypeRecommendedTalentIds = [];
        try {
            primaryArchetype = await getPrimaryArchetypeForActor(actor);
            if (primaryArchetype) {
                archetypeRecommendedTalentIds = await getArchetypeTalents(actor);
                SWSELogger.log(
                    `[SuggestionEngine] ${actor.name} matches archetype: ${primaryArchetype.name}`
                );
            }
        } catch (err) {
            SWSELogger.debug('[SuggestionEngine] Archetype retrieval failed (optional):', err);
            // Graceful fallback - continue without archetype
        }

        // ========== PHASE 2.1: TREE AUTHORITY FILTERING ==========
        // Filter candidate pool by derived authority BEFORE scoring
        // Heroic slot is used for suggestions (broadest valid access)
        const heroicSlot = { slotType: 'heroic' };
        const allowedTrees = getAllowedTalentTrees(actor, heroicSlot);

        const accessibleTalents = talents.filter(talent => {
            // Get talent's tree ID (multiple possible field names for compatibility)
            const treeId = talent.system?.talent_tree ||
                           talent.system?.talentTree ||
                           talent.system?.tree;

            // Talents without a tree are always accessible
            if (!treeId) return true;

            // Only include talents whose tree is in allowed list
            const isAccessible = allowedTrees.includes(treeId);

            if (!isAccessible) {
                SWSELogger.log(
                    `[SuggestionEngine.suggestTalents] Filtering out inaccessible talent: ` +
                    `"${talent.name}" (tree: "${treeId}", allowed: ${allowedTrees.join(', ')})`
                );
            }

            return isAccessible;
        });

        SWSELogger.log(
            `[SuggestionEngine.suggestTalents] Authority filtering: ${talents.length} total → ` +
            `${accessibleTalents.length} accessible (allowed trees: ${allowedTrees.join(', ')})`
        );
        // =========================================================

        return Promise.all(accessibleTalents.map(talent => {
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

            const suggestion = this._evaluateTalent(
                talent, actorState, buildIntent, actor, pendingData,
                primaryArchetype, archetypeRecommendedTalentIds
            );
            return {
                ...talent,
                suggestion,
                isSuggested: suggestion.tier > 0
            };
        }));
    }

    /**
     * Sort items by suggestion tier (higher first), confidence, then name
     * Deterministic ordering respects: Tier > Confidence > Item ID
     * @param {Array} items - Array of items with suggestion metadata
     * @returns {Array} Sorted items
     */
    static sortBySuggestion(items) {
        return [...items].sort((a, b) => {
            const tierA = a.suggestion?.tier ?? -1;
            const tierB = b.suggestion?.tier ?? -1;

            // Primary: Higher tier first
            if (tierB !== tierA) {
                return tierB - tierA;
            }

            // Secondary: Higher confidence first (Phase 2.5 - Tier 3 subpriority)
            const confA = a.suggestion?.confidence ?? 0;
            const confB = b.suggestion?.confidence ?? 0;
            if (Math.abs(confB - confA) > 0.01) {  // Account for floating point precision
                return confB - confA;
            }

            // Tertiary: Stable ID ordering for determinism
            const idA = a.id || a._id || '';
            const idB = b.id || b._id || '';
            if (idA !== idB) {
                return idA.localeCompare(idB);
            }

            // Final: Alphabetically by name
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

                // Species feat tier: TIER 4 (PATH_CONTINUATION), decays with level
                // Apply decay: at level 1-2, full strength; level 3, 50%; level 6, 25%; etc.
                const baseSpeciesTier = UNIFIED_TIERS.PATH_CONTINUATION;  // 4
                const adjustedTier = baseSpeciesTier * decayFactor;

                // Check if also uses trained skill for extra boost
                const usesTrainedSkill = this._usesTrainedSkill(feat, actorState);
                const skillBoost = usesTrainedSkill ? 1 : 0;

                const finalTier = Math.min(Math.round(adjustedTier + skillBoost), UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW);

                return { tier: finalTier, sourceId: `species:${actorState.species}` };
            }
        }

        return null;
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: ARCHETYPE ALIGNMENT (Phase 1.5)
    // ──────────────────────────────────────────────────────────────

    /**
     * Calculate archetype alignment bonus for a suggestion
     * Returns confidence boost and matched elements for reason metadata
     * @param {Object} item - The feat/talent being evaluated
     * @param {Object|null} archetype - Archetype object or null
     * @returns {Object} { bonus: 0-0.2, matchedElements: [] }
     */
    static _calculateArchetypeAlignment(item, archetype) {
        if (!archetype || !ArchetypeRegistry.isInitialized()) {
            return { bonus: 0, matchedElements: [] };
        }

        let bonus = 0;
        const matchedElements = [];

        // Check if item is in archetype's recommended feats (+0.1)
        if (ArchetypeRegistry.isRecommendedFeat(item.id, archetype)) {
            bonus += 0.1;
            matchedElements.push('recommendedFeat');
        }

        // Check if item is in archetype's recommended talents (+0.1)
        if (ArchetypeRegistry.isRecommendedTalent(item.id, archetype)) {
            bonus += 0.1;
            matchedElements.push('recommendedTalent');
        }

        // Check if item is recommended skill (+0.05)
        const skillKey = item.system?.skill || item.system?.skillKey;
        if (skillKey && ArchetypeRegistry.isRecommendedSkill(skillKey, archetype)) {
            bonus += 0.05;
            matchedElements.push('recommendedSkill');
        }

        // Cap bonus at 0.2
        const cappedBonus = Math.min(bonus, 0.2);

        return {
            bonus: cappedBonus,
            matchedElements
        };
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: TIER 3 SUBPRIORITY EVALUATION (Phase 2.5)
    // ──────────────────────────────────────────────────────────────

    /**
     * Evaluate all Tier 3 conditions for a feat and return best match with subpriority weighting
     * Replaces "first match wins" with structured scoring
     * @param {Object} feat - The feat being evaluated
     * @param {Object} actorState - Actor state
     * @param {Object} metadata - Feat metadata
     * @param {Object} buildIntent - Build intent with mentor biases
     * @param {Object} actor - The actor
     * @param {Object} primaryArchetype - Primary archetype
     * @param {Array} archetypeRecommendedFeatIds - Recommended feat IDs
     * @returns {Object|null} Best Tier 3 suggestion or null
     */
    static _evaluateTier3Feat(feat, actorState, metadata, buildIntent, actor, primaryArchetype, archetypeRecommendedFeatIds) {
        const matches = [];
        let totalBonus = 0;

        // Check ARCHETYPE RECOMMENDATION (weight: 0.15)
        if (primaryArchetype && archetypeRecommendedFeatIds.includes(feat.id)) {
            matches.push({
                type: 'ARCHETYPE_RECOMMENDATION',
                sourceId: `archetype:${primaryArchetype.id}`,
                weight: TIER3_SUBPRIORITY.ARCHETYPE,
                bonus: TIER3_SUBPRIORITY.ARCHETYPE
            });
            totalBonus += TIER3_SUBPRIORITY.ARCHETYPE;
        }

        // Check MENTOR BIAS MATCH (weight: 0.10, scaled by conviction)
        if (buildIntent && buildIntent.mentorBiases && Object.keys(buildIntent.mentorBiases).length > 0) {
            const mentorMatch = this._checkMentorBiasMatch(feat, buildIntent);
            if (mentorMatch) {
                // Extract bias strength from buildIntent for conviction scaling
                const biasStrength = this._extractBiasStrength(mentorMatch.sourceId, buildIntent);
                const scaledBonus = TIER3_SUBPRIORITY.MENTOR * biasStrength;  // Scale by 0.0-1.0

                matches.push({
                    type: 'MENTOR_BIAS_MATCH',
                    sourceId: mentorMatch.sourceId,
                    weight: TIER3_SUBPRIORITY.MENTOR,
                    bonus: scaledBonus,
                    conviction: biasStrength
                });
                totalBonus += scaledBonus;
            }
        }

        // Check PRESTIGE SURVEY SIGNAL (weight: 0.15, same as archetype)
        if (buildIntent && buildIntent.mentorBiases?.prestigeClassTarget) {
            const prestigeMatch = this._checkFeatForPrestige(feat, buildIntent.mentorBiases.prestigeClassTarget, buildIntent);
            if (prestigeMatch) {
                matches.push({
                    type: 'PRESTIGE_SIGNAL',
                    sourceId: `prestige:${buildIntent.mentorBiases.prestigeClassTarget}`,
                    weight: TIER3_SUBPRIORITY.PRESTIGE,
                    bonus: TIER3_SUBPRIORITY.PRESTIGE
                });
                totalBonus += TIER3_SUBPRIORITY.PRESTIGE;
            }
        }

        // Check SKILL PREREQ MATCH (weight: 0.05)
        if (this._usesTrainedSkill(feat, actorState)) {
            matches.push({
                type: 'SKILL_PREREQ_MATCH',
                sourceId: `skill:${actorState.trainedSkills.values().next().value || 'trained'}`,
                weight: TIER3_SUBPRIORITY.SKILL,
                bonus: TIER3_SUBPRIORITY.SKILL
            });
            totalBonus += TIER3_SUBPRIORITY.SKILL;
        }

        // If any Tier 3 condition matched, build suggestion with weighted confidence
        if (matches.length === 0) {
            return null;
        }

        // Cap total bonus
        const cappedBonus = Math.min(totalBonus, TIER3_MAX_BONUS);

        // Determine primary reason code (use highest authority match)
        let primaryMatch = matches[0];
        for (const match of matches) {
            if (match.weight >= primaryMatch.weight) {
                primaryMatch = match;
            }
        }

        // Build suggestion with subpriority bonus and multiple matched elements
        return this._buildSuggestionWithTier3Weighting(
            SUGGESTION_TIERS.ARCHETYPE_RECOMMENDATION,  // Tier 3
            primaryMatch.type,
            primaryMatch.sourceId,
            feat,
            actor ? ArchetypeRegistry.get(actor.system?.buildIntent?.archetypeId) : null,
            {
                tier3Matches: matches,
                tier3TotalBonus: cappedBonus,
                tier3PrimaryMatch: primaryMatch
            }
        );
    }

    /**
     * Evaluate all Tier 3 conditions for a talent and return best match with subpriority weighting
     * @param {Object} talent - The talent being evaluated
     * @param {Object} actorState - Actor state
     * @param {Object} buildIntent - Build intent with mentor biases
     * @param {Object} actor - The actor
     * @param {Object} primaryArchetype - Primary archetype
     * @param {Array} archetypeRecommendedTalentIds - Recommended talent IDs
     * @returns {Object|null} Best Tier 3 suggestion or null
     */
    static _evaluateTier3Talent(talent, actorState, buildIntent, actor, primaryArchetype, archetypeRecommendedTalentIds) {
        const matches = [];
        let totalBonus = 0;

        // Check ARCHETYPE RECOMMENDATION (weight: 0.15)
        if (primaryArchetype && archetypeRecommendedTalentIds.includes(talent.id)) {
            matches.push({
                type: 'ARCHETYPE_RECOMMENDATION',
                sourceId: `archetype:${primaryArchetype.id}`,
                weight: TIER3_SUBPRIORITY.ARCHETYPE,
                bonus: TIER3_SUBPRIORITY.ARCHETYPE
            });
            totalBonus += TIER3_SUBPRIORITY.ARCHETYPE;
        }

        // Check MENTOR BIAS MATCH (weight: 0.10, scaled by conviction)
        if (buildIntent && buildIntent.mentorBiases && Object.keys(buildIntent.mentorBiases).length > 0) {
            const mentorMatch = this._checkMentorBiasMatch(talent, buildIntent);
            if (mentorMatch) {
                const biasStrength = this._extractBiasStrength(mentorMatch.sourceId, buildIntent);
                const scaledBonus = TIER3_SUBPRIORITY.MENTOR * biasStrength;

                matches.push({
                    type: 'MENTOR_BIAS_MATCH',
                    sourceId: mentorMatch.sourceId,
                    weight: TIER3_SUBPRIORITY.MENTOR,
                    bonus: scaledBonus,
                    conviction: biasStrength
                });
                totalBonus += scaledBonus;
            }
        }

        // Check PRESTIGE SURVEY SIGNAL (weight: 0.15)
        if (buildIntent && buildIntent.mentorBiases?.prestigeClassTarget) {
            const prestigeMatch = this._checkTalentForPrestige(talent, buildIntent.mentorBiases.prestigeClassTarget, buildIntent);
            if (prestigeMatch) {
                matches.push({
                    type: 'PRESTIGE_SIGNAL',
                    sourceId: `prestige:${buildIntent.mentorBiases.prestigeClassTarget}`,
                    weight: TIER3_SUBPRIORITY.PRESTIGE,
                    bonus: TIER3_SUBPRIORITY.PRESTIGE
                });
                totalBonus += TIER3_SUBPRIORITY.PRESTIGE;
            }
        }

        // Check SKILL PREREQ MATCH (weight: 0.05)
        if (this._usesTrainedSkill(talent, actorState)) {
            matches.push({
                type: 'SKILL_PREREQ_MATCH',
                sourceId: `skill:${actorState.trainedSkills.values().next().value || 'trained'}`,
                weight: TIER3_SUBPRIORITY.SKILL,
                bonus: TIER3_SUBPRIORITY.SKILL
            });
            totalBonus += TIER3_SUBPRIORITY.SKILL;
        }

        // If any Tier 3 condition matched, build suggestion with weighted confidence
        if (matches.length === 0) {
            return null;
        }

        const cappedBonus = Math.min(totalBonus, TIER3_MAX_BONUS);

        // Determine primary reason code (use highest authority match)
        let primaryMatch = matches[0];
        for (const match of matches) {
            if (match.weight >= primaryMatch.weight) {
                primaryMatch = match;
            }
        }

        return this._buildSuggestionWithTier3Weighting(
            SUGGESTION_TIERS.ARCHETYPE_RECOMMENDATION,  // Tier 3
            primaryMatch.type,
            primaryMatch.sourceId,
            talent,
            actor ? ArchetypeRegistry.get(actor.system?.buildIntent?.archetypeId) : null,
            {
                tier3Matches: matches,
                tier3TotalBonus: cappedBonus,
                tier3PrimaryMatch: primaryMatch
            }
        );
    }

    /**
     * Extract bias strength from a mentor bias source ID
     * For conviction scaling: determines weight multiplier (0.0-1.0)
     * @param {string} sourceId - Source ID like 'mentor_bias:melee'
     * @param {Object} buildIntent - Build intent with mentorBiases
     * @returns {number} Bias strength (0.0-1.0)
     */
    static _extractBiasStrength(sourceId, buildIntent) {
        if (!sourceId || !buildIntent.mentorBiases) {
            return 1.0;  // Default full weight
        }

        const match = sourceId.match(/mentor_bias:(\w+)/);
        if (!match) {
            return 1.0;
        }

        const biasType = match[1];
        const biasValue = buildIntent.mentorBiases[biasType] || 1.0;

        // Clamp between 0.0 and 1.0
        return Math.max(0.0, Math.min(1.0, biasValue));
    }

    /**
     * Check if feat matches prestige target
     * @param {Object} feat - Feat to check
     * @param {string} prestigeClassTarget - Target prestige class name
     * @param {Object} buildIntent - Build intent (may contain prestige affinities)
     * @returns {boolean} True if feat matches prestige
     */
    static _checkFeatForPrestige(feat, prestigeClassTarget, buildIntent) {
        if (!prestigeClassTarget) return false;

        // Check if feat is a prestige prerequisite for target class
        if (buildIntent?.priorityPrereqs) {
            const prestigePrereq = buildIntent.priorityPrereqs.find(p =>
                p.type === 'feat' && p.name === feat.name && p.forClass === prestigeClassTarget
            );
            if (prestigePrereq) return true;
        }

        // Check if feat name suggests prestige alignment
        const featNameLower = feat.name.toLowerCase();
        const prestigeLower = prestigeClassTarget.toLowerCase();
        if (featNameLower.includes(prestigeLower) || prestigeLower.includes(featNameLower)) {
            return true;
        }

        return false;
    }

    /**
     * Check if talent matches prestige target
     * @param {Object} talent - Talent to check
     * @param {string} prestigeClassTarget - Target prestige class name
     * @param {Object} buildIntent - Build intent (may contain prestige affinities)
     * @returns {boolean} True if talent matches prestige
     */
    static _checkTalentForPrestige(talent, prestigeClassTarget, buildIntent) {
        if (!prestigeClassTarget) return false;

        // Check if talent's tree is a prestige prerequisite tree
        const talentTree = talent.system?.tree || '';
        const treeName = talent.system?.treeName || '';

        // Check build intent alignment
        if (buildIntent?.prestigeAffinities && buildIntent.prestigeAffinities.length > 0) {
            const topPrestige = buildIntent.prestigeAffinities[0];
            if (topPrestige.className === prestigeClassTarget) {
                // Check if talent tree is in prestige's required trees
                if (topPrestige.talentTrees?.some(t =>
                    t.toLowerCase() === talentTree.toLowerCase() ||
                    t.toLowerCase() === treeName.toLowerCase()
                )) {
                    return true;
                }
            }
        }

        // Heuristic: check if talent name/tree mentions prestige
        const prestigeLower = prestigeClassTarget.toLowerCase();
        return talentTree.toLowerCase().includes(prestigeLower) ||
               treeName.toLowerCase().includes(prestigeLower) ||
               talent.name.toLowerCase().includes(prestigeLower);
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE: MENTOR BIAS MATCHING
    // ──────────────────────────────────────────────────────────────

    /**
     * Check if a feat/talent matches mentor survey biases (Phase S1 + Phase 3)
     * Four-tier resolution:
     * 1. Explicit bias via item.system.buildBias (highest priority)
     * 2. Tag-based bias via item.system.tags
     * 3. Keyword matching on item name
     * 4. No match (lowest priority)
     *
     * @param {Object|string} item - Feat or talent object (or legacy: name string)
     * @param {Object} buildIntent - BuildIntent with mentorBiases
     * @returns {Object|null} Match info with sourceId, or null if no match
     */
    static _checkMentorBiasMatch(item, buildIntent) {
        if (!buildIntent || !buildIntent.mentorBiases) {
            return null;
        }

        const biases = buildIntent.mentorBiases;
        const biasTypes = ['melee', 'ranged', 'force', 'stealth', 'social', 'tech', 'leadership', 'support', 'survival'];

        // Extract item name (handle both object and legacy string format)
        const itemName = typeof item === 'string' ? item : (item?.name || '');

        // TIER 1: Explicit bias override (Phase S1)
        if (typeof item === 'object' && item?.system?.buildBias) {
            const declaredBias = item.system.buildBias;
            if (biasTypes.includes(declaredBias) && biases[declaredBias] > 0) {
                return {
                    sourceId: `mentor_bias:${declaredBias}`
                };
            }
        }

        // TIER 2: Tag-based bias (Phase 3 enhancement)
        if (typeof item === 'object' && item?.system?.tags && Array.isArray(item.system.tags)) {
            for (const tag of item.system.tags) {
                const tagLower = tag.toLowerCase();
                for (const biasType of biasTypes) {
                    if (biases[biasType] > 0 && tagLower === biasType) {
                        return {
                            sourceId: `mentor_bias:${biasType}`
                        };
                    }
                }
            }
        }

        // TIER 3: Keyword matching on item name (fallback)
        for (const biasType of biasTypes) {
            if (biases[biasType] > 0 && this._checkBiasKeyword(itemName, biasType)) {
                return {
                    sourceId: `mentor_bias:${biasType}`
                };
            }
        }

        return null;
    }

    // Helper methods for bias matching
    static BIAS_KEYWORDS = {
        melee: ['melee', 'sword', 'blade', 'lightsaber', 'staff', 'club', 'axe', 'hammer', 'martial arts', 'close combat', 'hand-to-hand'],
        ranged: ['blaster', 'rifle', 'pistol', 'bow', 'gun', 'ranged', 'throwing', 'launcher', 'sniper', 'marksman'],
        force: ['force', 'jedi', 'sith', 'darksider', 'lightsaber', 'telekinesis', 'mind trick'],
        stealth: ['stealth', 'hide', 'shadow', 'sneak', 'escape', 'evasion', 'cloak', 'invisible', 'shadow walker'],
        social: ['persuasion', 'deception', 'bluff', 'diplomacy', 'charm', 'inspire', 'charisma', 'gather information', 'social'],
        tech: ['computer', 'mechanics', 'tech', 'droid', 'repair', 'construct', 'protocol', 'hacking', 'engineering'],
        leadership: ['command', 'leadership', 'rally', 'inspire', 'authority', 'control', 'master', 'superior'],
        support: ['defense', 'protect', 'shield', 'guard', 'block', 'deflect', 'barrier', 'ally', 'heal'],
        survival: ['survival', 'endurance', 'track', 'scout', 'wilderness', 'climb', 'swim', 'journey']
    };

    static _checkBiasKeyword(name, biasType) {
        const keywords = this.BIAS_KEYWORDS[biasType];
        if (!keywords) return false;
        return keywords.some(k => name.toLowerCase().includes(k));
    }

    // ──────────────────────────────────────────────────────────────
    // PHASE 3: DATA-DRIVEN STRUCTURAL SIGNALS
    // ──────────────────────────────────────────────────────────────

    /**
     * Static cache for talent tree mutual exclusions loaded from world items
     * Maps talentTreeId → [conflictingTreeIds]
     * @private
     */
    static #talentExclusions = new Map();
    static #initialized = false;

    /**
     * Initialize data-driven structural signals
     * Called once on game ready
     * @returns {Promise<void>}
     */
    static async initialize() {
        if (this.#initialized) {
            SWSELogger.log('[SuggestionEngine] Already initialized, skipping');
            return;
        }

        try {
            await this._loadTalentExclusions();
            this.#initialized = true;
            SWSELogger.log('[SuggestionEngine] Data-driven initialization complete');
        } catch (err) {
            SWSELogger.error('[SuggestionEngine] Initialization failed:', err);
            this.#initialized = false;
        }
    }

    /**
     * Load talent tree mutual exclusions from world items
     * Each talent tree item can define: system.mutuallyExclusive = ["other-tree-id"]
     * @private
     */
    static async _loadTalentExclusions() {
        this.#talentExclusions.clear();

        if (!game?.items) {
            SWSELogger.log('[SuggestionEngine] No game.items available, skipping talent exclusion load');
            return;
        }

        try {
            const talentTrees = game.items.filter(item => item.type === 'talentTree');
            SWSELogger.log(`[SuggestionEngine] Loading mutual exclusions for ${talentTrees.length} talent trees`);

            for (const tree of talentTrees) {
                const treeId = tree.id;
                const exclusions = tree.system?.mutuallyExclusive;

                if (Array.isArray(exclusions) && exclusions.length > 0) {
                    this.#talentExclusions.set(treeId, exclusions);
                    SWSELogger.log(
                        `[SuggestionEngine] Tree "${tree.name}" (${treeId}) excludes: ${exclusions.join(', ')}`
                    );
                }
            }

            SWSELogger.log(`[SuggestionEngine] Loaded ${this.#talentExclusions.size} talent tree exclusion rules`);
        } catch (err) {
            SWSELogger.warn('[SuggestionEngine] Error loading talent exclusions:', err);
        }
    }

    /**
     * Get talent tree exclusions for a given tree
     * Checks data-driven world data, falls back to hardcoded rules if needed
     * @param {string} treeId - Talent tree ID or name
     * @returns {Array} Array of conflicting tree IDs
     */
    static getTalentExclusions(treeId) {
        // First try cached data-driven exclusions (by ID)
        if (this.#talentExclusions.has(treeId)) {
            return this.#talentExclusions.get(treeId);
        }

        // If not found by ID, try finding by tree name (lowercase lookup)
        const treeNameLower = treeId.toLowerCase();
        for (const [id, exclusions] of this.#talentExclusions.entries()) {
            const item = game?.items?.get(id);
            if (item?.name?.toLowerCase() === treeNameLower) {
                return exclusions;
            }
        }

        // Fallback to hardcoded rules (for backward compatibility)
        const hardcodedExclusions = {
            'dark side': ['jedi mind tricks', 'lightsaber combat (jedi)'],
            'jedi mind tricks': ['dark side']
        };
        return hardcodedExclusions[treeNameLower] || [];
    }

    /**
     * Check if initialization is complete
     * @returns {boolean}
     */
    static isInitialized() {
        return this.#initialized;
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
     * @param {Actor|null} actor - The actor (for synergy checks and archetype)
     * @param {Object} pendingData - Pending selections
     * @returns {Object} Suggestion metadata with archetype alignment applied
     */
    static _evaluateFeat(feat, actorState, metadata = {}, buildIntent = null, actor = null, pendingData = {}, primaryArchetype = null, archetypeRecommendedFeatIds = []) {
        // Use provided archetype or try to retrieve from registry (backwards compatibility)
        let archetype = primaryArchetype;
        if (!archetype) {
            const archetypeId = actor?.system?.buildIntent?.archetypeId;
            archetype = archetypeId ? ArchetypeRegistry.get(archetypeId) : null;
        }

        // Check tiers in order of priority (highest first)

        // Tier 6: Check if this feat is a priority prerequisite for a prestige class
        if (buildIntent) {
            const alignment = BuildIntent.checkFeatAlignment(feat.name, buildIntent);
            const prestigePrereq = buildIntent.priorityPrereqs.find(p =>
                p.type === 'feat' && p.name === feat.name
            );
            if (alignment.aligned && prestigePrereq) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    'PRESTIGE_PREREQ',
                    `prestige:${prestigePrereq.forClass}`,
                    feat,
                    archetype
                );
            }
        }

        // Tier 5.5: Check if this feat is a prerequisite for a wishlisted item
        if (actor) {
            const wishlistPrereqCheck = this._checkWishlistPrerequisite(feat, actor);
            if (wishlistPrereqCheck) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.WISHLIST_PATH,
                    'WISHLIST_PATH',
                    `wishlist:${wishlistPrereqCheck.itemId || wishlistPrereqCheck.itemName}`,
                    feat,
                    archetype
                );
            }
        }

        // Tier 5: Martial arts feat (strong recommendation)
        if (this._isMartialArtsFeat(feat)) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.MARTIAL_ARTS,
                'MARTIAL_ARTS',
                null,
                feat,
                archetype
            );
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(feat.name, 'feat', actor, pendingData);
            if (synergy) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.META_SYNERGY,
                    'META_SYNERGY',
                    null,
                    feat,
                    archetype
                );
            }
        }

        // Tier 4.5 (with decay): Species prerequisite match
        const speciesCheck = this._checkSpeciesPrerequisite(feat, actorState);
        if (speciesCheck) {
            return this._buildSuggestionWithArchetype(
                speciesCheck.tier,
                'SPECIES_EARLY',
                speciesCheck.sourceId,
                feat,
                archetype
            );
        }

        // Tier 4: Chain continuation
        const chainPrereq = this._isChainContinuation(feat, actorState, metadata);
        if (chainPrereq) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.CHAIN_CONTINUATION,
                'CHAIN_CONTINUATION',
                `chain:${chainPrereq}`,
                feat,
                archetype
            );
        }

        // TIER 3 SUBPRIORITY EVALUATION (Phase 2.5)
        // Evaluate ALL Tier 3 conditions, return best match with subpriority weighting
        const tier3Match = this._evaluateTier3Feat(
            feat, actorState, metadata, buildIntent, actor, primaryArchetype,
            archetypeRecommendedFeatIds
        );
        if (tier3Match) {
            return tier3Match;
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(feat, actorState)) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.ABILITY_PREREQ_MATCH,
                'ABILITY_PREREQ_MATCH',
                `ability:${actorState.highestAbility}`,
                feat,
                archetype
            );
        }

        // Tier 1: Class synergy
        if (this._matchesClass(feat, actorState)) {
            const className = actorState.classes.values().next().value || 'general';
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.CLASS_SYNERGY,
                'CLASS_SYNERGY',
                `class:${className}`,
                feat,
                archetype
            );
        }

        // Check build intent alignment for non-priority feats (still tier 1)
        if (buildIntent) {
            const alignment = BuildIntent.checkFeatAlignment(feat.name, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    'CLASS_SYNERGY',
                    null,
                    feat,
                    archetype
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestionWithArchetype(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null, feat, archetype);
    }

    /**
     * Evaluate a talent and assign its highest valid tier
     * @param {Object} talent - The talent to evaluate
     * @param {Object} actorState - Actor state
     * @param {Object|null} buildIntent - Build intent analysis
     * @param {Actor|null} actor - The actor (for synergy checks and archetype)
     * @param {Object} pendingData - Pending selections
     * @param {Object|null} primaryArchetype - Primary archetype (Phase 4)
     * @param {Array} archetypeRecommendedTalentIds - Recommended talent IDs (Phase 4)
     * @returns {Object} Suggestion metadata with archetype alignment applied
     */
    static _evaluateTalent(talent, actorState, buildIntent = null, actor = null, pendingData = {}, primaryArchetype = null, archetypeRecommendedTalentIds = []) {
        // Use provided archetype or try to retrieve from registry (backwards compatibility)
        let archetype = primaryArchetype;
        if (!archetype) {
            const archetypeId = actor?.system?.buildIntent?.archetypeId;
            archetype = archetypeId ? ArchetypeRegistry.get(archetypeId) : null;
        }

        // Check tiers in order of priority (highest first)

        // Tier 6: Check if this talent supports a prestige class path
        if (buildIntent) {
            const treeName = talent.system?.tree || '';
            const alignment = BuildIntent.checkTalentAlignment(talent.name, treeName, buildIntent);
            if (alignment.aligned && buildIntent.prestigeAffinities.length > 0 &&
                buildIntent.prestigeAffinities[0].confidence >= 0.4) {
                // Only use tier 6 if strongly aligned with top prestige target
                const prestigeClass = buildIntent.prestigeAffinities[0].className;
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.PRESTIGE_PREREQ,
                    'PRESTIGE_PREREQ',
                    `prestige:${prestigeClass}`,
                    talent,
                    archetype
                );
            }
        }

        // Tier 5.5: Check if this talent is a prerequisite for a wishlisted item
        if (actor) {
            const wishlistPrereqCheck = this._checkWishlistPrerequisite(talent, actor);
            if (wishlistPrereqCheck) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.WISHLIST_PATH,
                    'WISHLIST_PATH',
                    `wishlist:${wishlistPrereqCheck.itemId || wishlistPrereqCheck.itemName}`,
                    talent,
                    archetype
                );
            }
        }

        // Tier 5: Community meta synergy
        if (actor) {
            const synergy = getSynergyForItem(talent.name, 'talent', actor, pendingData);
            if (synergy) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.META_SYNERGY,
                    'META_SYNERGY',
                    null,
                    talent,
                    archetype
                );
            }
        }

        // Tier 4: Chain continuation
        const chainPrereq = this._isChainContinuation(talent, actorState);
        if (chainPrereq) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.CHAIN_CONTINUATION,
                'CHAIN_CONTINUATION',
                `chain:${chainPrereq}`,
                talent,
                archetype
            );
        }

        // TIER 3 SUBPRIORITY EVALUATION (Phase 2.5)
        // Evaluate ALL Tier 3 conditions, return best match with subpriority weighting
        const tier3Match = this._evaluateTier3Talent(
            talent, actorState, buildIntent, actor, primaryArchetype,
            archetypeRecommendedTalentIds
        );
        if (tier3Match) {
            return tier3Match;
        }

        // Tier 2: Uses highest ability
        if (this._usesHighestAbility(talent, actorState)) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.ABILITY_PREREQ_MATCH,
                'ABILITY_PREREQ_MATCH',
                `ability:${actorState.highestAbility}`,
                talent,
                archetype
            );
        }

        // Tier 1: Class synergy
        if (this._matchesClass(talent, actorState)) {
            const className = actorState.classes.values().next().value || 'general';
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.CLASS_SYNERGY,
                'CLASS_SYNERGY',
                `class:${className}`,
                talent,
                archetype
            );
        }

        // Check build intent alignment for non-priority talents (still tier 1)
        if (buildIntent) {
            const treeName = talent.system?.tree || '';
            const alignment = BuildIntent.checkTalentAlignment(talent.name, treeName, buildIntent);
            if (alignment.aligned) {
                return this._buildSuggestionWithArchetype(
                    SUGGESTION_TIERS.CLASS_SYNERGY,
                    'CLASS_SYNERGY',
                    null,
                    talent,
                    archetype
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestionWithArchetype(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null, talent, archetype);
    }

    /**
     * Build a suggestion metadata object with semantic signals (Phase 2.6 - Mentor Integration)
     *
     * SCHEMA:
     * - tier: numeric tier (0-6)
     * - confidence: 0.0-1.0
     * - reasonCode: semantic code (PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc.)
     * - sourceId: what triggered this (prestige:Jedi, chain:Force Training, etc.)
     * - reasonSignals: semantic facts (alignment, prestigeSupport, mechanicalSynergy, etc.)
     * - reason: atoms and matching rules (no explanation text - that's mentor layer responsibility)
     *
     * @param {number} tier - The suggestion tier (numeric)
     * @param {string} reasonCode - Semantic reason code (e.g., 'PRESTIGE_PREREQ')
     * @param {string|null} sourceId - What caused this suggestion (e.g., 'prestige:Jedi')
     * @param {Object} options - Additional options
     * @param {string[]} options.matchingRules - Array of matched rule identifiers
     * @param {number} options.archetypeAlignmentBonus - Confidence boost (0-0.2)
     * @param {Object} options.archetypeAlignment - Archetype alignment details
     * @param {Object} options.reasonSignals - Pre-built semantic signals (optional, will build if not provided)
     * @param {Object} options.signalContext - Context for signal building
     * @returns {Object} Engine suggestion metadata with reasonSignals
     */
    static _buildSuggestion(tier, reasonCode = null, sourceId = null, options = {}) {
        // Find the closest tier key for lookups (handles decimal tiers like 4.5)
        const tierKey = Object.keys(TIER_REASON_CODES)
            .map(Number)
            .sort((a, b) => Math.abs(a - tier) - Math.abs(b - tier))[0];

        const finalReasonCode = reasonCode || TIER_REASON_CODES[tierKey] || 'FALLBACK';
        const matchingRules = options.matchingRules || [];

        // Get base confidence
        let baseConfidence = TIER_CONFIDENCE[tierKey] || 0.2;

        // Apply archetype alignment bonus (capped at +0.2, never exceed 0.95)
        const archetypeBonus = options.archetypeAlignmentBonus || 0;
        const cappedBonus = Math.min(archetypeBonus, 0.2);
        const finalConfidence = Math.min(baseConfidence + cappedBonus, 0.95);

        // Build or use provided reasonSignals
        const reasonSignals = options.reasonSignals ||
                              ReasonSignalBuilder.build(finalReasonCode, options.signalContext || {});

        // Select mentor reason atoms for this code
        const atoms = selectReasonAtoms(finalReasonCode);

        // Build reason object (atoms only, no explanation text)
        const reason = {
            tierAssignedBy: finalReasonCode,
            matchingRules,
            atoms
        };

        // Add archetype alignment details if present
        if (options.archetypeAlignment && archetypeBonus > 0) {
            reason.archetypeAlignment = {
                bonus: cappedBonus,
                matchedElements: options.archetypeAlignment.matchedElements || []
            };
        }

        return {
            tier,
            reasonCode: finalReasonCode,
            sourceId,
            confidence: finalConfidence,
            reasonSignals,
            reason
        };
    }

    /**
     * Wrapper for _buildSuggestion that applies archetype alignment bonus
     * Used by _evaluateFeat and _evaluateTalent (Phase 1.5)
     * @param {number} tier - The suggestion tier
     * @param {string} reasonCode - Reason code
     * @param {string|null} sourceId - Source ID
     * @param {Object|null} item - The feat/talent being evaluated
     * @param {Object|null} archetype - Archetype object or null
     * @param {Object} options - Additional options
     * @returns {Object} Suggestion with archetype alignment applied
     */
    static _buildSuggestionWithArchetype(tier, reasonCode, sourceId, item, archetype, options = {}) {
        // Calculate archetype alignment if item and archetype exist
        let archetypeAlignment = null;
        let bonus = 0;

        if (item && archetype) {
            const alignment = this._calculateArchetypeAlignment(item, archetype);
            if (alignment.bonus > 0) {
                archetypeAlignment = alignment;
                bonus = alignment.bonus;
            }
        }

        // Build suggestion with alignment bonus
        return this._buildSuggestion(
            tier,
            reasonCode,
            sourceId,
            {
                ...options,
                archetypeAlignmentBonus: bonus,
                archetypeAlignment
            }
        );
    }

    /**
     * Build suggestion with Tier 3 subpriority weighting (Phase 2.5)
     * Applies structured bonus for multiple Tier 3 matches
     * @param {number} tier - The tier (should be ARCHETYPE_RECOMMENDATION = 3)
     * @param {string} reasonCode - Primary reason code
     * @param {string} sourceId - Primary source ID
     * @param {Object} item - The feat/talent
     * @param {Object} archetype - Archetype for alignment bonus
     * @param {Object} options - Options including tier3 weighting data
     * @returns {Object} Suggestion with tier 3 bonus applied
     */
    static _buildSuggestionWithTier3Weighting(tier, reasonCode, sourceId, item, archetype, options = {}) {
        // Calculate base archetype alignment bonus (separate from tier 3 subpriority)
        let archetypeAlignment = null;
        let archetypeBonus = 0;

        if (item && archetype) {
            const alignment = this._calculateArchetypeAlignment(item, archetype);
            if (alignment.bonus > 0) {
                archetypeAlignment = alignment;
                archetypeBonus = alignment.bonus;
            }
        }

        // Get tier 3 subpriority bonus (from multiple tier 3 matches)
        const tier3Bonus = options.tier3TotalBonus || 0;

        // Combine bonuses (archetype alignment + tier 3 subpriority)
        // Cap total at TIER3_MAX_BONUS + archetype bonus
        const totalBonus = Math.min(archetypeBonus + tier3Bonus, 0.40);  // 0.2 arch + 0.2 tier3

        // Build suggestion with combined bonuses
        return this._buildSuggestion(
            tier,
            reasonCode,
            sourceId,
            {
                ...options,
                archetypeAlignmentBonus: totalBonus,
                archetypeAlignment: archetypeAlignment || (tier3Bonus > 0 ? { bonus: tier3Bonus, matchedElements: [] } : null),
                tier3Weighting: {
                    matches: options.tier3Matches || [],
                    totalBonus: tier3Bonus,
                    primaryMatch: options.tier3PrimaryMatch || null
                }
            }
        );
    }

    /**
     * DEPRECATED: Explanation generation moved to mentor layer
     *
     * This method is kept for backwards compatibility but should NOT be used.
     * Explanation text generation is now the responsibility of:
     * - MentorReasonSelector (converts signals to atoms)
     * - MentorJudgmentEngine (builds final explanation from atoms)
     *
     * The reason is: SuggestionEngine should only emit facts (reasonSignals),
     * not presentation logic. Mentor layer handles all explanation/tone/personality.
     *
     * @deprecated Use MentorJudgmentEngine instead
     * @param {string} reasonCode - The reason code
     * @param {string|null} sourceId - The source identifier
     * @returns {string} Human-readable explanation (DEPRECATED)
     */
    static _generateReasonExplanation(reasonCode, sourceId) {
        SWSELogger.warn(
            '[SuggestionEngine] _generateReasonExplanation is deprecated. ' +
            'Explanation generation is now in mentor layer (MentorJudgmentEngine).'
        );

        // Map SuggestionEngine reason codes to canonical reasons.json keys
        const reasonCodeToJsonKeys = {
            'PRESTIGE_PREREQ': 'prestige_prerequisites_met',
            'WISHLIST_PATH': 'goal_advancement',
            'MARTIAL_ARTS': 'feat_reinforces_core_strength',
            'META_SYNERGY': 'feat_synergy_present',
            'SPECIES_EARLY': 'attribute_matches_feature_focus',
            'CHAIN_CONTINUATION': 'feat_chain_continuation',
            'ARCHETYPE_RECOMMENDATION': 'feat_supports_existing_role',
            'PRESTIGE_SIGNAL': 'prestige_path_consistency',
            'MENTOR_BIAS_MATCH': 'pattern_alignment',
            'SKILL_PREREQ_MATCH': 'skill_prerequisite_met',
            'ABILITY_PREREQ_MATCH': 'attribute_matches_feature_focus',
            'CLASS_SYNERGY': 'class_synergy',
            'FALLBACK': 'available_for_selection'
        };

        // Try to get explanation from reasons.json (for backwards compatibility)
        const jsonKey = reasonCodeToJsonKeys[reasonCode];
        if (jsonKey && REASON_TEXT_MAP && REASON_TEXT_MAP[jsonKey]) {
            return REASON_TEXT_MAP[jsonKey];
        }

        // Fallback to hardcoded explanations (for backwards compatibility)
        const explanations = {
            'PRESTIGE_PREREQ': () => `Required for your prestige class path.`,
            'WISHLIST_PATH': () => `Required for an item on your wishlist.`,
            'MARTIAL_ARTS': () => `Strong martial arts foundation.`,
            'META_SYNERGY': () => `Synergy with your current build.`,
            'SPECIES_EARLY': () => `Matches your species heritage.`,
            'CHAIN_CONTINUATION': () => `Builds on existing choices.`,
            'ARCHETYPE_RECOMMENDATION': () => `Recommended by your archetype.`,
            'PRESTIGE_SIGNAL': () => `Aligns with your prestige path.`,
            'MENTOR_BIAS_MATCH': () => `Aligns with your mentor guidance.`,
            'SKILL_PREREQ_MATCH': () => `Uses your trained skills.`,
            'ABILITY_PREREQ_MATCH': () => `Matches your highest ability.`,
            'CLASS_SYNERGY': () => `Strong thematic fit with your class.`,
            'FALLBACK': () => `General compatibility with your build.`
        };

        const explainerFn = explanations[reasonCode];
        return explainerFn ? explainerFn() : 'Available for selection.';
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
     * @returns {Object|null} Suggestion metadata or null if too fa-regular away
     */
    static _scoreFutureAvailability(item, actor, actorState, buildIntent, pendingData) {
        // Analyze what prerequisites are not met
        const unmetReqs = AbilityEngine.getUnmetRequirements(actor, item);

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
     * @returns {Object|null} Tier score object or null if too fa-regular away
     */
    static _calcFutureAvailabilityTier(pathway, item, actorState) {
        if (pathway.levelsToQualify === 0) {return null;}  // Already qualified

        // NEW TIER LEVELS FOR FUTURE AVAILABILITY
        // For future-available items, use TIER 0 (AVAILABLE) since not actionable now
        // Items not yet qualified are not suggested (tier 0 = available but no synergy)
        let tier = UNIFIED_TIERS.AVAILABLE;

        // If item matches class, keep at AVAILABLE tier but mark as "soon available"
        // The UI can show different messaging for "future available" vs "available now"
        if (this._matchesClass(item, actorState)) {
            // Still TIER 0, but could be displayed with "coming soon" indicator
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
                const unmetReqs = AbilityEngine.getUnmetRequirements(actor, { ...wishedItem });
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
