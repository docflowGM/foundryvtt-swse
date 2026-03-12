/**
 * SWSE Bias Tag Projection
 *
 * Converts bias vectors to synthetic tags for SuggestionScorer consumption.
 * Part of Phase 2: BiasTagProjection implementation for dynamic tag synthesis.
 *
 * Core responsibility:
 * - Project bias vectors into tag space
 * - Map role bias → role tags
 * - Map mechanical bias → semantic tags
 * - Map attribute bias → ability tags
 * - CRITICAL: Only generate avoidTags from explicit negative bias (never infer from absence)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class BiasTagProjection {
    // Static mappings for bias key → tag projection
    // These define how canonical bias keys map to semantic tags

    static #ROLE_BIAS_MAPPING = {
        // Direct mapping: role bias keys → role tags
        striker: 'striker',
        defender: 'defender',
        controller: 'controller',
        support: 'support',
        scout: 'scout',
        utility: 'utility',
        leader: 'leader',
        flex: 'flex',
        skirmisher: 'skirmisher',
        bruiser: 'bruiser',
        offense: 'offense',
        defense: 'defense'
    };

    static #MECHANICAL_BIAS_CATEGORIES = {
        // Mechanical bias key → semantic tag category mapping
        // Damage category
        burstDamage: 'damage',
        singleTargetDamage: 'damage',
        areaOfEffect: 'damage',
        meleeBonus: 'damage',
        rangedBonus: 'damage',
        critRange: 'damage',
        critMultiplier: 'damage',

        // Control category
        crowdControl: 'control',
        stunResistance: 'control',
        incapacitation: 'control',

        // Force category
        lightSideAffinity: 'force',
        darkSideAffinity: 'force',
        forceSecret: 'force',
        forceDC: 'force',
        forceRecovery: 'force',
        formMastery: 'force',

        // Survival/Defense category
        stealth: 'survival',
        infiltration: 'survival',
        evasion: 'survival',
        defensive: 'survival',
        shieldDefense: 'survival',
        armor: 'survival',

        // Tech/Hacking category
        hackingSkills: 'tech',
        techSkills: 'tech',
        droidControl: 'tech',
        vehicleControl: 'tech',

        // Support/Utility category
        allySupport: 'utility',
        healing: 'utility',
        buffing: 'utility',
        debuffing: 'utility',

        // Skill category
        skillBonus: 'skills'
    };

    static #ATTRIBUTE_BIAS_MAPPING = {
        // Attribute bias keys → ability tags
        str: 'strength',
        dex: 'dexterity',
        con: 'constitution',
        int: 'intelligence',
        wis: 'wisdom',
        cha: 'charisma'
    };

    /**
     * Project bias vectors into tag space
     * Weight thresholds:
     * - bias > 0.6 → preferredTags
     * - 0.2 ≤ bias ≤ 0.6 → secondaryTags
     * - bias < 0.2 → omitted (never infer avoid from low bias)
     * - bias < -0.3 → avoidTags (explicit negative bias only)
     *
     * @param {Object} totalBias - { mechanicalBias: {...}, roleBias: {...}, attributeBias: {...} }
     * @returns {Object} Projected tags: { preferredTags: [], secondaryTags: [], avoidTags: [] }
     */
    static project(totalBias) {
        const projected = {
            preferredTags: [],
            secondaryTags: [],
            avoidTags: []
        };

        if (!totalBias) {
            return projected;
        }

        // Project role bias
        if (totalBias.roleBias && typeof totalBias.roleBias === 'object') {
            this.#projectBiasField(totalBias.roleBias, 'role', projected);
        }

        // Project mechanical bias
        if (totalBias.mechanicalBias && typeof totalBias.mechanicalBias === 'object') {
            this.#projectBiasField(totalBias.mechanicalBias, 'mechanical', projected);
        }

        // Project attribute bias
        if (totalBias.attributeBias && typeof totalBias.attributeBias === 'object') {
            this.#projectBiasField(totalBias.attributeBias, 'attribute', projected);
        }

        // Deduplicate tags
        projected.preferredTags = [...new Set(projected.preferredTags)];
        projected.secondaryTags = [...new Set(projected.secondaryTags)];
        projected.avoidTags = [...new Set(projected.avoidTags)];

        return projected;
    }

    /**
     * Project a single bias field into tag space
     * @private
     */
    static #projectBiasField(biasField, category, projected) {
        const mapping = this.#getMappingForCategory(category);
        if (!mapping) {
            return;
        }

        for (const [biasKey, biasValue] of Object.entries(biasField)) {
            if (typeof biasValue !== 'number') {
                continue;
            }

            const tag = mapping[biasKey];
            if (!tag) {
                continue;
            }

            // Categorize based on weight threshold
            if (biasValue > 0.6) {
                projected.preferredTags.push(tag);
            } else if (biasValue >= 0.2) {
                projected.secondaryTags.push(tag);
            } else if (biasValue < -0.3) {
                // CRITICAL: Only generate avoidTags for explicit negative bias
                projected.avoidTags.push(tag);
            }
            // Note: 0 < biasValue < 0.2 is omitted (low bias ≠ negative intent)
        }
    }

    /**
     * Get mapping for a category
     * @private
     */
    static #getMappingForCategory(category) {
        switch (category) {
            case 'role':
                return this.#ROLE_BIAS_MAPPING;
            case 'mechanical':
                return this.#MECHANICAL_BIAS_CATEGORIES;
            case 'attribute':
                return this.#ATTRIBUTE_BIAS_MAPPING;
            default:
                return null;
        }
    }

    /**
     * Debug: Print computed identity bias and projected tags
     * Useful for troubleshooting bias aggregation
     * @param {Object} totalBias - Total bias object
     * @param {Object} projected - Projected tags object
     */
    static debugPrint(totalBias, projected) {
        if (!game?.user?.isGM) {
            return;
        }

        const output = {
            mechanical: totalBias.mechanicalBias || {},
            role: totalBias.roleBias || {},
            attribute: totalBias.attributeBias || {},
            projected: projected
        };

        SWSELogger.log('[BiasTagProjection] Identity bias and projection:', output);
    }
}
