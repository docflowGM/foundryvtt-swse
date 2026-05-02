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
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";
import { IdentityEngine } from "/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js";
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
import { ArchetypeMetadataEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ArchetypeMetadataEngine.js";
import { buildMentorBiasAliases } from "/systems/foundryvtt-swse/scripts/engine/suggestion/tag-signal-engine.js";
// PHASE 1: SuggestionV2 Retrofit
import { scoreSuggestion } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionScorer.js";
// Phase 2D: Force Techniques
import { ForceTechniqueSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-technique-suggestion-engine.js";
// Phase 2E: Attribute Increases
import { scoreAttributeAllocations } from "/systems/foundryvtt-swse/scripts/engine/suggestion/AttributeIncreaseScorer.js";
// Phase 2A: Slot context detection
import { getActiveSlotContext } from "/systems/foundryvtt-swse/scripts/engine/suggestion/slot-context-detector.js";
import { enrichBuildIntentWithPrestigeDelays } from "/systems/foundryvtt-swse/scripts/engine/suggestion/prestige-delay-calculator.js";
import { ReasonType } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionV2Contract.js";
import { mapReasonCodeToReasonType } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonCodeToReasonTypeMapping.js";

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
    SPECIES: 0.08,        // Species profile / heritage alignment (moderate authority)
    SKILL: 0.05,          // Mechanical synergy heuristic (lowest authority)
    PRESTIGE: 0.15        // Prestige survey signal (same as archetype - declared intent)
};

export const TIER3_MAX_BONUS = 0.25;  // Cap total Tier 3 bonus

// ──────────────────────────────────────────────────────────────
// SUGGESTION ENGINE CLASS
// ──────────────────────────────────────────────────────────────


const normalizeBiasTag = (tag) => String(tag || '').toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_').replace(/[^a-z0-9_()]+/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

const normalizeSpeciesKey = (value) => String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildSpeciesIdentityTagsForName = (name) => {
    const normalized = normalizeSpeciesKey(name);
    if (!normalized) return [];
    const compact = normalized.replace(/_/g, '');
    return Array.from(new Set([
        'species',
        'heritage',
        `species_${normalized}`,
        compact && compact !== normalized ? `species_${compact}` : null
    ].filter(Boolean)));
};

const collectTextSnippets = (value, out = []) => {
    if (!value) return out;
    if (typeof value === 'string') {
        out.push(value);
        return out;
    }
    if (Array.isArray(value)) {
        value.forEach((entry) => collectTextSnippets(entry, out));
        return out;
    }
    if (typeof value === 'object') {
        for (const candidate of Object.values(value)) {
            collectTextSnippets(candidate, out);
        }
    }
    return out;
};

const BIAS_TAG_ALIASES = {
    melee: ['melee', 'offense_melee', 'lightsaber', 'unarmed', 'power_attack', 'martial_arts'],
    ranged: ['ranged', 'offense_ranged', 'pistol', 'rifle', 'sniper', 'thrown', 'heavy_weapon'],
    force: ['force', 'force_training', 'force_capacity', 'force_execution', 'use_the_force', 'force_power'],
    stealth: ['stealth', 'skill_stealth', 'camouflage', 'infiltration', 'skirmisher'],
    social: ['social', 'persuasion', 'deception', 'gather_information', 'leadership'],
    tech: ['tech', 'mechanics', 'use_computer', 'skill_mechanics', 'skill_use_computer', 'droid'],
    leadership: ['leadership', 'ally_support', 'command', 'buff'],
    support: ['support', 'healing', 'defense', 'protective', 'ally_support']
};

export class SuggestionEngine {

    /**
     * Generate suggestions for a list of feats
     * PHASE 2: Now accepts identityBias directly from IdentityEngine
     *
     * @param {Array} feats - Array of feat objects (should already be filtered for qualification)
     * @param {Actor} actor - The actor (character)
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @param {Object} options.buildIntent - Pre-computed BuildIntent (optional, will compute if not provided)
     * @param {Object} options.identityBias - Pre-computed identity bias from IdentityEngine (optional, will compute if not provided)
     * @returns {Promise<Array>} Feats with suggestion metadata attached
     */
    static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
        const actorState = this._buildActorState(actor, pendingData);
        const featMetadata = options.featMetadata || {};

        // PHASE 2: Get or compute identity bias directly from IdentityEngine
        let identityBias = options.identityBias;
        if (!identityBias) {
            try {
                identityBias = IdentityEngine.computeTotalBias(actor);
                SWSELogger.log('[SuggestionEngine.suggestFeats] Computed identity bias directly from IdentityEngine');
            } catch (err) {
                SWSELogger.warn('[SuggestionEngine.suggestFeats] Failed to compute identity bias:', err);
                identityBias = null;
            }
        }

        // Get or compute build intent
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
                // Create minimal fallback buildIntent with mentor biases to preserve mentor-based suggestions
                const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
                buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                    ? { mentorBiases }
                    : null;
            }
        }

        // Enrich buildIntent with prestige delay calculations (for class suggestions)
        if (buildIntent) {
            try {
                buildIntent = await enrichBuildIntentWithPrestigeDelays(buildIntent, actor);
            } catch (err) {
                SWSELogger.debug('[SuggestionEngine.suggestFeats] Prestige delay enrichment failed (optional):', err);
                // Graceful fallback - continue with buildIntent without prestige delays
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
     * PHASE 2: Now accepts identityBias directly from IdentityEngine
     *
     * @param {Array} talents - Array of talent objects (should already be filtered for qualification)
     * @param {Actor} actor - The actor (character)
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @param {Object} options.buildIntent - Pre-computed BuildIntent (optional, will compute if not provided)
     * @param {Object} options.identityBias - Pre-computed identity bias from IdentityEngine (optional, will compute if not provided)
     * @returns {Promise<Array>} Talents with suggestion metadata attached
     */
    static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
        const actorState = this._buildActorState(actor, pendingData);

        // PHASE 2: Get or compute identity bias directly from IdentityEngine
        let identityBias = options.identityBias;
        if (!identityBias) {
            try {
                identityBias = IdentityEngine.computeTotalBias(actor);
                SWSELogger.log('[SuggestionEngine.suggestTalents] Computed identity bias directly from IdentityEngine');
            } catch (err) {
                SWSELogger.warn('[SuggestionEngine.suggestTalents] Failed to compute identity bias:', err);
                identityBias = null;
            }
        }

        // Get or compute build intent
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
                // Create minimal fallback buildIntent with mentor biases to preserve mentor-based suggestions
                const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
                buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                    ? { mentorBiases }
                    : null;
            }
        }

        // Enrich buildIntent with prestige delay calculations (for class suggestions)
        if (buildIntent) {
            try {
                buildIntent = await enrichBuildIntentWithPrestigeDelays(buildIntent, actor);
            } catch (err) {
                SWSELogger.debug('[SuggestionEngine.suggestTalents] Prestige delay enrichment failed (optional):', err);
                // Graceful fallback - continue with buildIntent without prestige delays
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
    static _extractSuggestionScalar(item) {
        const candidates = [
            item?.suggestion?.score,
            item?.suggestion?.finalScore,
            item?.suggestion?.scoring?.final,
            item?.suggestion?.scoring?.finalScore,
            item?.scoring?.finalScore,
            item?.suggestion?.confidence,
            0
        ];

        for (const value of candidates) {
            if (Number.isFinite(value)) {
                return Number(value);
            }
        }
        return 0;
    }

    static sortBySuggestion(items) {
        return [...items].sort((a, b) => {
            const tierA = a.suggestion?.tier ?? -1;
            const tierB = b.suggestion?.tier ?? -1;

            // Primary: Higher tier first
            if (tierB !== tierA) {
                return tierB - tierA;
            }

            // Secondary: higher scalar score first when available
            const scoreA = this._extractSuggestionScalar(a);
            const scoreB = this._extractSuggestionScalar(b);
            if (Math.abs(scoreB - scoreA) > 0.0001) {
                return scoreB - scoreA;
            }

            // Tertiary: Higher confidence first (Phase 2.5 - Tier 3 subpriority)
            const confA = a.suggestion?.confidence ?? 0;
            const confB = b.suggestion?.confidence ?? 0;
            if (Math.abs(confB - confA) > 0.01) {  // Account for floating point precision
                return confB - confA;
            }

            // Quaternary: Stable ID ordering for determinism
            const idA = a.id || a._id || '';
            const idB = b.id || b._id || '';
            if (idA !== idB) {
                return idA.localeCompare(idB);
            }

            // Final: Alphabetically by name
            return (a.name || '').localeCompare(b.name || '');
        });
    }

    /**
     * Generate suggestions for Force Techniques (Phase 2D)
     * @param {Array} techniques - Array of force technique objects
     * @param {Actor} actor - The actor
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @returns {Promise<Array>} Techniques with suggestion metadata
     */
    static async suggestForceTechniques(techniques, actor, pendingData = {}, options = {}) {
        if (!techniques || techniques.length === 0) {
            return [];
        }

        SWSELogger.log('[SuggestionEngine.suggestForceTechniques] Suggesting force techniques');

        // Get or compute identity bias
        let identityBias = options.identityBias;
        if (!identityBias) {
            try {
                identityBias = IdentityEngine.computeTotalBias(actor);
            } catch (err) {
                SWSELogger.warn('[SuggestionEngine.suggestForceTechniques] Failed to compute identity bias:', err);
                identityBias = null;
            }
        }

        // Get or compute build intent
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('[SuggestionEngine.suggestForceTechniques] Failed to analyze build intent:', err);
                buildIntent = null;
            }
        }

        // Use ForceTechniqueSuggestionEngine which already scores them
        try {
            const scored = await ForceTechniqueSuggestionEngine.suggestForceOptions(techniques, actor, { ...options, pendingData });
            return scored.map(suggestion => ({
                ...suggestion,
                isSuggested: true
            }));
        } catch (err) {
            SWSELogger.warn('[SuggestionEngine.suggestForceTechniques] Failed to suggest force techniques:', err);
            return techniques.map(t => ({
                ...t,
                isSuggested: false
            }));
        }
    }

    /**
     * Generate suggestions for Attribute Increases (Phase 2E)
     * @param {Actor} actor - The actor
     * @param {Object} pendingData - Pending selections from level-up
     * @param {Object} options - Additional options
     * @returns {Promise<Array>} Attribute allocations with scores and reasons
     */
    static async suggestAttributeIncreases(actor, pendingData = {}, options = {}) {
        SWSELogger.log('[SuggestionEngine.suggestAttributeIncreases] Suggesting attribute increases');

        // Get or compute build intent (for identity alignment)
        let buildIntent = options.buildIntent;
        if (!buildIntent) {
            try {
                buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
            } catch (err) {
                SWSELogger.warn('[SuggestionEngine.suggestAttributeIncreases] Failed to analyze build intent:', err);
                buildIntent = {};
            }
        }

        // Score attribute allocations
        try {
            const scored = await scoreAttributeAllocations(actor, buildIntent);
            return scored.map(allocation => ({
                ...allocation,
                isSuggested: true
            }));
        } catch (err) {
            SWSELogger.warn('[SuggestionEngine.suggestAttributeIncreases] Failed to score allocations:', err);
            return [];
        }
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

        const speciesNames = new Set();
        const speciesTags = new Set();
        const addSpeciesName = (value) => {
            const raw = String(value || '').trim().toLowerCase();
            if (raw) speciesNames.add(raw);
            const normalized = normalizeSpeciesKey(value).replace(/_/g, ' ');
            if (normalized) speciesNames.add(normalized);
        };
        const addSpeciesTags = (tags) => {
            for (const tag of tags || []) {
                const normalized = normalizeBiasTag(tag);
                if (normalized) speciesTags.add(normalized);
            }
        };
        const addSpeciesIdentity = (name) => {
            for (const tag of buildSpeciesIdentityTagsForName(name)) {
                speciesTags.add(normalizeBiasTag(tag));
            }
        };
        const addSpeciesSource = (source) => {
            if (!source) return;
            if (typeof source === 'string') {
                addSpeciesName(source);
                addSpeciesIdentity(source);
                return;
            }
            if (typeof source === 'object') {
                const candidateName = source.name || source.label || source.value || source.speciesName || source.id;
                if (candidateName) {
                    addSpeciesName(candidateName);
                    addSpeciesIdentity(candidateName);
                }
                addSpeciesTags(source.tags);
            }
        };

        const speciesItem = actor.items.find(i => i.type === 'species');
        addSpeciesSource(speciesItem?.name || null);
        addSpeciesSource(actor.system?.species);
        addSpeciesSource(actor.system?.species?.name);
        addSpeciesSource(actor.system?.details?.species);
        addSpeciesSource(actor.system?.race);
        addSpeciesSource(pendingData.selectedSpecies);
        addSpeciesSource(pendingData.selectedSpeciesName);
        addSpeciesSource(pendingData.species);
        addSpeciesTags(pendingData.selectedSpeciesTags);

        const species = speciesNames.values().next().value || null;

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
            speciesNames,
            speciesTags,
            speciesIdentityTags: new Set([...speciesTags].filter((tag) => tag === 'species' || tag === 'heritage' || tag.startsWith('species_'))),
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
    static _checkSpeciesPrerequisite(candidate, actorState) {
        if (!actorState?.speciesNames?.size && !actorState?.speciesIdentityTags?.size) {
            return null;
        }

        const candidateTags = this._extractCandidateTagSet(candidate);
        const actorIdentityTags = [...(actorState.speciesIdentityTags || [])];
        const explicitSpeciesTag = actorIdentityTags.find((tag) => candidateTags.has(tag));
        if (explicitSpeciesTag) {
            return {
                tier: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,
                sourceId: `species:${actorState.species || explicitSpeciesTag.replace(/^species_/, '')}`,
                mode: 'explicit_species_tag'
            };
        }

        const prereqText = collectTextSnippets([
            candidate?.system?.prerequisite,
            candidate?.system?.prerequisites,
            candidate?.system?.requirements,
            candidate?.system?.special,
            candidate?.system?.species,
            candidate?.prerequisite,
            candidate?.requirements
        ]).join(' | ').toLowerCase();
        const normalizedPrereqText = normalizeSpeciesKey(prereqText).replace(/_/g, ' ');

        if (!prereqText) {
            return null;
        }

        const matchedSpecies = [...(actorState.speciesNames || [])].find((name) => {
            const spaced = String(name || '').toLowerCase();
            const compact = normalizeSpeciesKey(name).replace(/_/g, ' ');
            return (spaced && prereqText.includes(spaced))
                || (compact && normalizedPrereqText.includes(compact));
        });

        if (!matchedSpecies) {
            return null;
        }

        return {
            tier: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,
            sourceId: `species:${matchedSpecies}`,
            mode: 'text_prerequisite'
        };
    }

    static _extractCandidateTagSet(candidate) {
        const tagSet = new Set();
        const addTags = (tags) => {
            if (!tags) return;
            const list = Array.isArray(tags) ? tags : [tags];
            for (const tag of list) {
                const normalized = normalizeBiasTag(tag);
                if (normalized) tagSet.add(normalized);
            }
        };

        addTags(candidate?.tags);
        addTags(candidate?.system?.tags);
        addTags(candidate?.metadata?.tags);

        return tagSet;
    }

    static _checkSpeciesTagAlignment(candidate, actorState) {
        if (!actorState?.speciesTags?.size) {
            return null;
        }

        const candidateTags = this._extractCandidateTagSet(candidate);
        if (!candidateTags.size) {
            return null;
        }

        const blocked = new Set(['species', 'heritage', 'species_locked']);
        const overlaps = [...actorState.speciesTags].filter((tag) => !blocked.has(tag) && candidateTags.has(tag));
        if (!overlaps.length) {
            return null;
        }

        return {
            overlapTags: overlaps,
            sourceId: `species:${overlaps[0]}`,
            bonus: Math.min(TIER3_SUBPRIORITY.SPECIES * Math.max(overlaps.length, 1), 0.16)
        };
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
        for (const prestigeTarget of this._getPrestigeTargets(buildIntent)) {
            const prestigeMatch = this._checkFeatForPrestige(feat, prestigeTarget, buildIntent);
            if (prestigeMatch) {
                const scaled = TIER3_SUBPRIORITY.PRESTIGE * this._extractPrestigeBiasStrength(prestigeTarget, buildIntent);
                matches.push({
                    type: 'PRESTIGE_SIGNAL',
                    sourceId: `prestige:${prestigeTarget}`,
                    weight: TIER3_SUBPRIORITY.PRESTIGE,
                    bonus: scaled
                });
                totalBonus += scaled;
            }
        }

        const speciesTagMatch = this._checkSpeciesTagAlignment(feat, actorState);
        if (speciesTagMatch) {
            matches.push({
                type: 'SPECIES_EARLY',
                sourceId: speciesTagMatch.sourceId,
                weight: TIER3_SUBPRIORITY.SPECIES,
                bonus: speciesTagMatch.bonus
            });
            totalBonus += speciesTagMatch.bonus;
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
        for (const prestigeTarget of this._getPrestigeTargets(buildIntent)) {
            const prestigeMatch = this._checkTalentForPrestige(talent, prestigeTarget, buildIntent);
            if (prestigeMatch) {
                const scaled = TIER3_SUBPRIORITY.PRESTIGE * this._extractPrestigeBiasStrength(prestigeTarget, buildIntent);
                matches.push({
                    type: 'PRESTIGE_SIGNAL',
                    sourceId: `prestige:${prestigeTarget}`,
                    weight: TIER3_SUBPRIORITY.PRESTIGE,
                    bonus: scaled
                });
                totalBonus += scaled;
            }
        }

        const speciesTagMatch = this._checkSpeciesTagAlignment(talent, actorState);
        if (speciesTagMatch) {
            matches.push({
                type: 'SPECIES_EARLY',
                sourceId: speciesTagMatch.sourceId,
                weight: TIER3_SUBPRIORITY.SPECIES,
                bonus: speciesTagMatch.bonus
            });
            totalBonus += speciesTagMatch.bonus;
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


    static _getPrestigeTargets(buildIntent) {
        const biases = buildIntent?.mentorBiases || {};
        const multi = Array.isArray(biases.prestigeClassTargets) ? biases.prestigeClassTargets.filter(Boolean) : [];
        if (multi.length) {
            return multi;
        }
        return biases.prestigeClassTarget ? [biases.prestigeClassTarget] : [];
    }

    static _extractPrestigeBiasStrength(prestigeClassTarget, buildIntent) {
        const weights = buildIntent?.mentorBiases?.prestigeClassWeights || buildIntent?.mentorBiases?.prestigePrereqWeights || {};
        const raw = Number(weights?.[prestigeClassTarget] || 1);
        return Math.max(0.25, Math.min(1.0, raw / 3));
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
        const biasAliases = buildMentorBiasAliases();

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
            const normalizedTags = new Set(item.system.tags.map(tag => normalizeBiasTag(tag)));
            for (const biasType of biasTypes) {
                if (biases[biasType] <= 0) continue;
                const aliases = BIAS_TAG_ALIASES[biasType] || [biasType];
                if (aliases.some(alias => normalizedTags.has(normalizeBiasTag(alias)))) {
                    return {
                        sourceId: `mentor_bias:${biasType}`
                    };
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

        // PHASE 1: Build options object with context for SuggestionV2 retrofit
        // This is threaded through all _buildSuggestionWithArchetype calls
        const buildSuggestionOptions = {
            actor,
            candidate: feat,
            buildIntent,
            identityBias: null  // Could compute if needed, but SuggestionScorer will compute if not provided
        };

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
                    archetype,
                    buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestionWithArchetype(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null, feat, archetype, buildSuggestionOptions);
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

        // PHASE 1: Build options object with context for SuggestionV2 retrofit
        const buildSuggestionOptions = {
            actor,
            candidate: talent,
            buildIntent,
            identityBias: null
        };

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
                    archetype,
                    buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
                );
            }
        }

        const speciesCheck = this._checkSpeciesPrerequisite(talent, actorState);
        if (speciesCheck) {
            return this._buildSuggestionWithArchetype(
                speciesCheck.tier,
                'SPECIES_EARLY',
                speciesCheck.sourceId,
                talent,
                archetype,
                buildSuggestionOptions
            );
        }

        // Tier 4: Chain continuation
        const chainPrereq = this._isChainContinuation(talent, actorState);
        if (chainPrereq) {
            return this._buildSuggestionWithArchetype(
                SUGGESTION_TIERS.CHAIN_CONTINUATION,
                'CHAIN_CONTINUATION',
                `chain:${chainPrereq}`,
                talent,
                archetype,
                buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                archetype,
                buildSuggestionOptions
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
                    archetype,
                    buildSuggestionOptions
                );
            }
        }

        // Fallback - still a legal option
        return this._buildSuggestionWithArchetype(SUGGESTION_TIERS.FALLBACK, 'FALLBACK', null, talent, archetype, buildSuggestionOptions);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // PHASE 1: SuggestionV2 Retrofit Helper Functions
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * Determine the dominant horizon (which of immediate/shortTerm/identity is largest).
     * @private
     */
    static _determineDominantHorizon(immediate, shortTerm, identity) {
        if (immediate >= shortTerm && immediate >= identity) return 'immediate';
        if (shortTerm >= identity) return 'shortTerm';
        return 'identity';
    }

    /**
     * Compute confidence from SuggestionScorer breakdown.
     * Higher final score + better separation between horizons = higher confidence.
     * @private
     */
    static _computeConfidenceFromScorer(scorerResult) {
        // Base confidence from final score
        const baseConfidence = Math.min(scorerResult.finalScore, 1.0);

        // Separation bonus: how clearly one horizon dominates
        const scores = [
            scorerResult.breakdown.immediate,
            scorerResult.breakdown.shortTerm,
            scorerResult.breakdown.identity
        ].sort((a, b) => b - a);
        const separation = scores[0] - scores[1];

        // Higher separation = higher confidence (up to +0.2 lift)
        const confidenceLift = Math.min(separation * 0.4, 0.2);

        return Math.min(baseConfidence + confidenceLift, 0.95);
    }

    /**
     * Build signals array from SuggestionScorer result and reason code.
     * CRITICAL: Emits multi-horizon signals reflecting actual breakdown.
     * This preserves the three-horizon structure computed by SuggestionScorer.
     *
     * Emits one signal per horizon that exceeds threshold, using actual horizon
     * scores as weights. Falls back to primary reason code if all horizons weak.
     * @private
     */
    static _buildSignalsFromScorer(reasonCode, scorerResult, candidate) {
        const signals = [];
        const { immediate, shortTerm, identity } = scorerResult.breakdown;

        // Threshold: only emit signals with meaningful contribution
        const SIGNAL_THRESHOLD = 0.05;

        // Map each horizon to appropriate ReasonType
        // These represent what each horizon actually measures
        const horizonTypeMap = {
            immediate: ReasonType.ATTRIBUTE_SYNERGY,      // Current state synergy
            shortTerm: ReasonType.PRESTIGE_PROXIMITY,     // Proximity + breakpoints
            identity: ReasonType.IDENTITY_ALIGNMENT       // Archetype alignment
        };

        // Build base metadata from candidate
        const baseMetadata = {};
        if (candidate?.system?.prestigious) {
            baseMetadata.prestigeClass = candidate.name;
        }
        if (candidate?.talentTree) {
            baseMetadata.talentTree = candidate.talentTree;
        }

        // Emit immediate signal if above threshold
        if (immediate > SIGNAL_THRESHOLD) {
            signals.push({
                type: horizonTypeMap.immediate,
                weight: immediate,
                horizon: 'immediate',
                metadata: {
                    ...baseMetadata,
                    reasonCode,
                    source: 'immediate_synergy'
                }
            });
        }

        // Emit shortTerm signal if above threshold
        if (shortTerm > SIGNAL_THRESHOLD) {
            signals.push({
                type: horizonTypeMap.shortTerm,
                weight: shortTerm,
                horizon: 'shortTerm',
                metadata: {
                    ...baseMetadata,
                    reasonCode,
                    source: 'prestige_proximity'
                }
            });
        }

        // Emit identity signal if above threshold
        if (identity > SIGNAL_THRESHOLD) {
            signals.push({
                type: horizonTypeMap.identity,
                weight: identity,
                horizon: 'identity',
                metadata: {
                    ...baseMetadata,
                    reasonCode,
                    source: 'identity_alignment'
                }
            });
        }

        // Fallback: if no signals emitted (all horizons weak), use primary reason code mapping
        // This ensures we always have at least one signal for the tier/reason link
        if (signals.length === 0) {
            const mapping = mapReasonCodeToReasonType(reasonCode);
            if (mapping && mapping.type) {
                signals.push({
                    type: mapping.type,
                    weight: mapping.weight,
                    horizon: mapping.horizon,
                    metadata: {
                        ...baseMetadata,
                        reasonCode,
                        source: 'primary_reason_fallback'
                    }
                });
            }
        }

        return signals;
    }

    /**
     * Build scoring object for SuggestionV2 compatibility.
     * @private
     */
    static _buildScoringObject(scorerResult) {
        const immediate = scorerResult.breakdown.immediate;
        const shortTerm = scorerResult.breakdown.shortTerm;
        const identity = scorerResult.breakdown.identity;
        const dominantHorizon = this._determineDominantHorizon(immediate, shortTerm, identity);
        const confidence = this._computeConfidenceFromScorer(scorerResult);

        return {
            immediate,
            shortTerm,
            identity,
            final: scorerResult.finalScore,
            confidence,
            dominantHorizon
        };
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
        const cappedArchBonus = Math.min(archetypeBonus, 0.2);

        // Apply metadata bonus (capped at +0.25, additive with archetype bonus)
        const metadataBonus = options.metadataBonus || 0;
        const cappedMetaBonus = Math.min(metadataBonus, 0.25);

        // Combine bonuses (capped at 0.95 total)
        const finalConfidence = Math.min(baseConfidence + cappedArchBonus + cappedMetaBonus, 0.95);

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
                bonus: cappedArchBonus,
                matchedElements: options.archetypeAlignment.matchedElements || []
            };
        }

        // Add metadata boost details if present
        if (options.metadataBoost && cappedMetaBonus > 0) {
            reason.metadataBoost = {
                bonus: cappedMetaBonus,
                reasons: options.metadataBoost.reasons || []
            };
        }

        // ──────────────────────────────────────────────────────────────────────────
        // PHASE 1: Emit SuggestionV2 format (signals + scoring)
        // ──────────────────────────────────────────────────────────────────────────

        // Build signals and scoring if candidate and actor provided (for mentor system)
        let signals = [];
        let scoring = null;

        if (options.candidate && options.actor && options.buildIntent) {
            try {
                // Call SuggestionScorer to get three-horizon breakdown
                const scorerResult = scoreSuggestion(
                    options.candidate,
                    options.actor,
                    options.buildIntent,
                    { identityBias: options.identityBias }
                );

                // Build SuggestionV2-compatible signals array
                signals = this._buildSignalsFromScorer(finalReasonCode, scorerResult, options.candidate);

                // Build SuggestionV2-compatible scoring object
                scoring = this._buildScoringObject(scorerResult);

                // PHASE 1 VALIDATION: Log all emission details
                // CRITICAL: Type verification for Phase 2 weight-sorting
                console.log(`[SuggestionEngine.Phase1Validation] ${options.candidate.name}:`, {
                    metadata: {
                        name: options.candidate.name,
                        tier: tier,
                        reasonCode: finalReasonCode
                    },
                    signals: signals.map(s => ({
                        type: s.type,
                        weight: s.weight,
                        weight_type: typeof s.weight,  // CRITICAL: Should be "number"
                        horizon: s.horizon
                    })),
                    scoring: {
                        immediate: scoring.immediate,
                        shortTerm: scoring.shortTerm,
                        identity: scoring.identity,
                        final: scoring.final,
                        confidence: scoring.confidence,
                        dominantHorizon: scoring.dominantHorizon,
                        // Type verification
                        types: {
                            immediate: typeof scoring.immediate,  // Should be "number"
                            shortTerm: typeof scoring.shortTerm,
                            identity: typeof scoring.identity,
                            final: typeof scoring.final,
                            confidence: typeof scoring.confidence
                        }
                    },
                    // Weight sorting test
                    signals_by_weight: signals
                        .map((s, idx) => ({ idx, weight: s.weight, type: s.type }))
                        .sort((a, b) => b.weight - a.weight)
                        .map(s => `[${s.weight.toFixed(3)}] ${s.type}`)
                });
            } catch (err) {
                // Graceful fallback: if SuggestionScorer fails, continue with old format
                SWSELogger.warn('[SuggestionEngine] SuggestionScorer failed, continuing with v1 format:', err);
                // signals and scoring remain empty
            }
        }

        return {
            tier,
            reasonCode: finalReasonCode,
            sourceId,
            confidence: finalConfidence,
            reasonSignals,
            reason,
            // PHASE 1: New fields for SuggestionV2
            signals,    // Array of { type, weight, horizon, metadata }
            scoring     // Object with { immediate, shortTerm, identity, final, confidence, dominantHorizon }
        };
    }

    /**
     * Build suggestion with metadata-driven boost (Tier 1 improvements)
     * Applies archetype, playstyle, and tier appropriateness signals
     * @param {number} tier - The suggestion tier
     * @param {string} reasonCode - Reason code
     * @param {string|null} sourceId - Source ID
     * @param {Object|null} item - The feat/talent being evaluated
     * @param {Object|null} archetype - Archetype object or null
     * @param {Object|null} actor - Actor for playstyle detection
     * @param {Object} options - Additional options
     * @returns {Object} Suggestion with metadata boost applied
     */
    static _buildSuggestionWithMetadata(tier, reasonCode, sourceId, item, archetype, actor, options = {}) {
        // Calculate metadata boost if item and actor exist
        let metadataBoost = null;
        let metadataBoostAmount = 0;

        if (item && actor) {
            const characterData = {
                level: actor.system?.level || 1,
                detectedPlaystyle: ArchetypeMetadataEngine.detectCharacterPlaystyle(actor),
                primaryArchetype: archetype
            };

            const boost = ArchetypeMetadataEngine.calculateMetadataBoost(item, characterData);
            if (boost.boost > 0) {
                metadataBoost = boost;
                metadataBoostAmount = boost.boost;
            }
        }

        // Build suggestion with metadata boost
        return this._buildSuggestionWithArchetype(
            tier,
            reasonCode,
            sourceId,
            item,
            archetype,
            {
                ...options,
                metadataBonus: metadataBoostAmount,
                metadataBoost: metadataBoost
            }
        );
    }

    /**
     * Wrapper for _buildSuggestion that applies archetype alignment bonus
     * Used by _evaluateFeat and _evaluateTalent (Phase 1.5)
     * Now also applies metadata boost (Tier 1 improvements)
     * @param {number} tier - The suggestion tier
     * @param {string} reasonCode - Reason code
     * @param {string|null} sourceId - Source ID
     * @param {Object|null} item - The feat/talent being evaluated
     * @param {Object|null} archetype - Archetype object or null
     * @param {Object} options - Additional options
     * @param {Object} options.actor - Actor (for metadata boost calculation)
     * @returns {Object} Suggestion with archetype alignment and metadata boost applied
     */
    static _buildSuggestionWithArchetype(tier, reasonCode, sourceId, item, archetype, options = {}) {
        // Calculate archetype alignment if item and archetype exist
        let archetypeAlignment = null;
        let archetypeBonus = 0;

        if (item && archetype) {
            const alignment = this._calculateArchetypeAlignment(item, archetype);
            if (alignment.bonus > 0) {
                archetypeAlignment = alignment;
                archetypeBonus = alignment.bonus;
            }
        }

        // Calculate metadata boost if item and actor exist (Tier 1: archetype, playstyle, tier)
        let metadataBoost = null;
        let metadataBoostAmount = 0;

        if (item && options.actor) {
            const characterData = {
                level: options.actor.system?.level || 1,
                detectedPlaystyle: ArchetypeMetadataEngine.detectCharacterPlaystyle(options.actor),
                primaryArchetype: archetype
            };

            const boost = ArchetypeMetadataEngine.calculateMetadataBoost(item, characterData);
            if (boost.boost > 0) {
                metadataBoost = boost;
                metadataBoostAmount = boost.boost;
            }
        }

        // Build suggestion with both bonuses
        return this._buildSuggestion(
            tier,
            reasonCode,
            sourceId,
            {
                ...options,
                archetypeAlignmentBonus: archetypeBonus,
                archetypeAlignment,
                metadataBonus: metadataBoostAmount,
                metadataBoost
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
                // Matching against the canonical wishlist metadata is sufficient here;
                // no direct compendium read is needed.

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
