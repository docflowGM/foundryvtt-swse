/**
 * ArchetypeMetadataEngine
 *
 * Enables metadata-driven suggestion scoring based on feat/talent archetype alignment,
 * playstyle coherence, and tier appropriateness.
 *
 * Tier 1 metadata improvements:
 * - archetype: Which archetype does this feat/talent support?
 * - playstyle: melee, ranged, force, support, control, defense, skill, utility
 * - tier: 0-3, representing complexity level
 *
 * All scoring is additive and non-breaking. Missing metadata is treated as neutral (no boost).
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// Valid playstyle values
export const VALID_PLAYSTYLES = [
    'melee',
    'ranged',
    'force',
    'support',
    'control',
    'defense',
    'skill',
    'utility'
];

export class ArchetypeMetadataEngine {
    /**
     * Calculate metadata-based scoring boost for a feat/talent
     * Applies multiple signals: archetype, playstyle, tier appropriateness
     * @param {Object} item - The feat/talent item
     * @param {Object} character - Character data { level, detectedPlaystyle, primaryArchetype, etc. }
     * @returns {Object} { boost: number (0-0.25), reasons: string[] }
     */
    static calculateMetadataBoost(item, character) {
        if (!item || !item.system) {
            return { boost: 0, reasons: [] };
        }

        let boost = 0.0;
        const reasons = [];

        // 1. Archetype alignment (+0.15 max)
        const archetypeBoost = this._calculateArchetypeBoost(item, character);
        boost += archetypeBoost;
        if (archetypeBoost > 0) {
            reasons.push(`Supports ${item.system.archetype} archetype`);
        }

        // 2. Playstyle coherence (+0.10 max)
        const playstyleBoost = this._calculatePlaystyleBoost(item, character);
        boost += playstyleBoost;
        if (playstyleBoost > 0) {
            reasons.push(`Aligns with ${item.system.playstyle} playstyle`);
        }

        // 3. Tier appropriateness (+0.05 max)
        const tierBoost = this._calculateTierBoost(item, character);
        boost += tierBoost;
        if (tierBoost > 0) {
            reasons.push(`Tier ${item.system.tier} appropriate for level ${character.level || 1}`);
        }

        // Cap total boost at 0.25 to prevent overweighting
        const cappedBoost = Math.min(boost, 0.25);

        return {
            boost: cappedBoost,
            reasons: reasons
        };
    }

    /**
     * Archetype alignment signal
     * +0.15 if item explicitly supports character's primary archetype
     * @private
     */
    static _calculateArchetypeBoost(item, character) {
        const itemArchetype = item.system?.archetype;
        const charArchetype = character.primaryArchetype?.name;

        if (!itemArchetype || !charArchetype) {
            return 0;
        }

        // Support both string and array formats
        const archetypes = Array.isArray(itemArchetype)
            ? itemArchetype
            : [itemArchetype];

        if (archetypes.some(arch => this._normalizeForComparison(arch) === this._normalizeForComparison(charArchetype))) {
            return 0.15;
        }

        return 0;
    }

    /**
     * Playstyle coherence signal
     * +0.10 if item's playstyle matches character's detected/chosen playstyle
     * @private
     */
    static _calculatePlaystyleBoost(item, character) {
        const itemPlaystyle = item.system?.playstyle;
        const charPlaystyle = character.detectedPlaystyle;

        if (!itemPlaystyle || !charPlaystyle) {
            return 0;
        }

        // Validate playstyle is in enum
        if (!VALID_PLAYSTYLES.includes(itemPlaystyle)) {
            SWSELogger.warn(
                `[ArchetypeMetadataEngine] Invalid playstyle "${itemPlaystyle}" on item "${item.name}"`
            );
            return 0;
        }

        if (this._normalizeForComparison(itemPlaystyle) === this._normalizeForComparison(charPlaystyle)) {
            return 0.10;
        }

        return 0;
    }

    /**
     * Tier appropriateness signal
     * +0.05 if item's tier is <= character's progression tier
     * Prevents suggesting expert feats to low-level characters
     * @private
     */
    static _calculateTierBoost(item, character) {
        const itemTier = item.system?.tier;
        const charLevel = character.level || 1;
        const charProgressionTier = this._getProgressionTier(charLevel);

        if (itemTier === undefined || itemTier === null) {
            return 0;
        }

        // Validate tier is in range
        if (typeof itemTier !== 'number' || itemTier < 0 || itemTier > 3) {
            SWSELogger.warn(
                `[ArchetypeMetadataEngine] Invalid tier "${itemTier}" on item "${item.name}"`
            );
            return 0;
        }

        // Only boost if tier is appropriate (not too advanced)
        if (itemTier <= charProgressionTier) {
            return 0.05;
        }

        return 0;
    }

    /**
     * Map character level to progression tier
     * Tier 0: Levels 1-3 (Novice)
     * Tier 1: Levels 4-8 (Intermediate)
     * Tier 2: Levels 9-16 (Advanced)
     * Tier 3: Levels 17+ (Expert)
     * @private
     */
    static _getProgressionTier(level) {
        if (level <= 3) return 0;
        if (level <= 8) return 1;
        if (level <= 16) return 2;
        return 3;
    }

    /**
     * Normalize strings for case-insensitive comparison
     * @private
     */
    static _normalizeForComparison(str) {
        if (!str) return '';
        return String(str).toLowerCase().trim();
    }

    /**
     * Validate feat/talent metadata at load time
     * Logs warnings for invalid data, does not throw
     * @param {Object} item - Item to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateMetadata(item) {
        const errors = [];

        if (!item || !item.system) {
            return { valid: true, errors: [] };
        }

        const arch = item.system.archetype;
        const playstyle = item.system.playstyle;
        const tier = item.system.tier;

        // Archetype: optional, string or empty
        if (arch && typeof arch !== 'string') {
            errors.push(
                `[${item.name}] Invalid archetype type: ${typeof arch} (expected string or empty)`
            );
        }

        // Playstyle: optional, but if present must be valid enum
        if (playstyle && typeof playstyle === 'string' && !VALID_PLAYSTYLES.includes(playstyle)) {
            errors.push(
                `[${item.name}] Invalid playstyle "${playstyle}". Valid values: ${VALID_PLAYSTYLES.join(', ')}`
            );
        }

        // Tier: optional, but if present must be 0-3
        if (tier !== undefined && tier !== null && (typeof tier !== 'number' || tier < 0 || tier > 3)) {
            errors.push(
                `[${item.name}] Invalid tier "${tier}". Must be 0-3`
            );
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Detect character's playstyle from their current feats/talents
     * Returns the dominant playstyle pattern, or null if unclear
     * @param {Actor} actor - Character
     * @returns {string|null} Detected playstyle or null
     */
    static detectCharacterPlaystyle(actor) {
        if (!actor || !actor.items) {
            return null;
        }

        // Count playstyle occurrences in owned feats/talents
        const playstyleCounts = {};

        for (const item of actor.items) {
            if ((item.type === 'feat' || item.type === 'talent') && item.system?.playstyle) {
                const ps = item.system.playstyle;
                playstyleCounts[ps] = (playstyleCounts[ps] || 0) + 1;
            }
        }

        // If no metadata found, return null
        if (Object.keys(playstyleCounts).length === 0) {
            return null;
        }

        // Return the most common playstyle
        return Object.entries(playstyleCounts)
            .sort(([, a], [, b]) => b - a)[0][0];
    }
}
