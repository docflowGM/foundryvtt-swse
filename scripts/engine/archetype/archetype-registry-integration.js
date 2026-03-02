/**
 * ArchetypeRegistry Integration with SuggestionEngine
 *
 * Bridges the ArchetypeRegistry with the suggestion system.
 * Provides methods to:
 * - Get archetype recommendations for a character
 * - Match character state to archetypes
 * - Apply archetype biases to suggestions
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";

/**
 * Get archetype recommendations for a character
 * @param {Actor} actor - The character
 * @returns {Promise<Array>} Archetypes with resolved recommendations
 */
export async function getArchetypeRecommendationsForActor(actor) {
    try {
        if (!actor || !actor.system?.details?.class) {
            return [];
        }

        const classId = actor.system.details.class;
        const archetypes = await ArchetypeRegistry.getByClassResolved(classId);

        SWSELogger.log(
            `[ArchetypeRegistryIntegration] Got ${archetypes.length} archetypes ` +
            `for ${actor.name} (class: ${classId})`
        );

        return archetypes;
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting archetype recommendations:', err);
        return [];
    }
}

/**
 * Get primary archetype recommendation for a character
 * Based on attribute distribution and current items
 * @param {Actor} actor - The character
 * @returns {Promise<Object|null>} Primary archetype or null
 */
export async function getPrimaryArchetypeForActor(actor) {
    try {
        const archetypes = await getArchetypeRecommendationsForActor(actor);
        if (archetypes.length === 0) {
            return null;
        }

        // Score archetypes based on character state
        const scores = archetypes.map(arch => ({
            archetype: arch,
            score: _scoreArchetypeMatch(arch, actor)
        }));

        // Return highest scoring
        const best = scores.reduce((max, curr) =>
            curr.score > max.score ? curr : max
        );

        if (best.score <= 0) {
            return null;
        }

        return {
            ...best.archetype,
            matchScore: Math.round(best.score * 100)
        };
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting primary archetype:', err);
        return null;
    }
}

/**
 * Get feat recommendations based on archetype
 * @param {Actor} actor - The character
 * @returns {Promise<Array>} Recommended feat item IDs
 */
export async function getArchetypeFeats(actor) {
    try {
        const archetype = await getPrimaryArchetypeForActor(actor);
        if (!archetype) {
            return [];
        }

        return archetype.recommendedIds?.feats || [];
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting archetype feats:', err);
        return [];
    }
}

/**
 * Get talent recommendations based on archetype
 * @param {Actor} actor - The character
 * @returns {Promise<Array>} Recommended talent item IDs
 */
export async function getArchetypeTalents(actor) {
    try {
        const archetype = await getPrimaryArchetypeForActor(actor);
        if (!archetype) {
            return [];
        }

        return archetype.recommendedIds?.talents || [];
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting archetype talents:', err);
        return [];
    }
}

/**
 * Check if a feat/talent is recommended by the archetype
 * @param {string} itemId - Item ID to check
 * @param {Actor} actor - The character
 * @returns {Promise<boolean>}
 */
export async function isArchetypeRecommended(itemId, actor) {
    try {
        const archetype = await getPrimaryArchetypeForActor(actor);
        if (!archetype) {
            return false;
        }

        const feats = archetype.recommendedIds?.feats || [];
        const talents = archetype.recommendedIds?.talents || [];
        return feats.includes(itemId) || talents.includes(itemId);
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error checking archetype recommendation:', err);
        return false;
    }
}

/**
 * Get attribute bias for archetype
 * Returns sorted attributes by weight
 * @param {string} archetypeId - Archetype ID
 * @returns {Array} Attributes sorted by importance
 */
export function getAttributePriorityForArchetype(archetypeId) {
    try {
        const archetype = ArchetypeRegistry.get(archetypeId);
        if (!archetype) {
            return [];
        }

        return archetype.attributePriority || [];
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting attribute priority:', err);
        return [];
    }
}

/**
 * Get role bias for archetype
 * @param {string} archetypeId - Archetype ID
 * @returns {Object} Role weights { offense, defense, support, utility }
 */
export function getRoleBiasForArchetype(archetypeId) {
    try {
        const archetype = ArchetypeRegistry.get(archetypeId);
        if (!archetype) {
            return {};
        }

        return archetype.roleBias || {};
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting role bias:', err);
        return {};
    }
}

/**
 * Score how well an archetype matches a character
 * Based on attribute distribution
 * @private
 * @param {Object} archetype - Archetype with recommended items
 * @param {Actor} actor - The character
 * @returns {number} Score 0-1
 */
function _scoreArchetypeMatch(archetype, actor) {
    try {
        if (!archetype.attributeBias) {
            return 0.5; // Neutral score
        }

        const actorAbilities = actor.system?.abilities || {};
        const attributeBias = archetype.attributeBias;

        let totalScore = 0;
        let totalWeight = 0;

        // Score based on attribute matches
        for (const [attr, weight] of Object.entries(attributeBias)) {
            const ability = actor.system.attributes?.[attr] || { value: 0 };
            const value = ability.value || 0;

            // Normalize to 0-1 scale (assuming 8-18 is normal range for D&D-like systems)
            const normalized = Math.max(0, Math.min(1, (value - 8) / 10));
            totalScore += normalized * weight;
            totalWeight += weight;
        }

        if (totalWeight === 0) {
            return 0.5;
        }

        return totalScore / totalWeight;
    } catch (err) {
        SWSELogger.debug('[ArchetypeRegistryIntegration] Error scoring archetype match:', err);
        return 0.5;
    }
}

/**
 * Get archetype info for display
 * @param {string} archetypeId - Archetype ID
 * @returns {Object} { name, notes, status, roles }
 */
export function getArchetypeInfo(archetypeId) {
    try {
        const archetype = ArchetypeRegistry.get(archetypeId);
        if (!archetype) {
            return null;
        }

        return {
            name: archetype.name,
            notes: archetype.notes || '',
            status: archetype.status || 'active',
            roles: archetype.roles || [],
            id: archetype.id
        };
    } catch (err) {
        SWSELogger.error('[ArchetypeRegistryIntegration] Error getting archetype info:', err);
        return null;
    }
}
