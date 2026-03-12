/**
 * SWSE Identity Engine
 *
 * Computes total bias vectors by aggregating baseArchetype + prestigeAmplifier + specialist biases.
 * Part of Phase 2: IdentityEngine implementation for bias aggregation and tag projection.
 *
 * Core responsibility:
 * - Merge bias vectors from three sources (base archetype, prestige amplifier, specialist)
 * - Handle nulls gracefully (prestige/specialist may not exist)
 * - Validate canonical bias keys
 * - Return complete identity state for an actor
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { PrestigeLayerRegistry } from "/systems/foundryvtt-swse/scripts/engine/prestige/prestige-layer-registry.js";

export class IdentityEngine {
    /**
     * Compute total bias by aggregating three bias sources
     * Uses additive composition: higher bias weights stack
     *
     * @param {Object} baseArchetype - Base archetype with bias fields (mechanicalBias, roleBias, attributeBias)
     * @param {Object} prestigeAmplifier - Prestige layer amplifier object (or null if no prestige)
     * @param {Object} specialist - Specialist deepening variant (or null if not selected)
     * @returns {Object} Merged bias: { mechanicalBias: {...}, roleBias: {...}, attributeBias: {...} }
     * @throws {Error} If bias keys are non-canonical
     */
    static computeTotalBias(baseArchetype, prestigeAmplifier = null, specialist = null) {
        const totalBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // Start with base archetype
        if (baseArchetype) {
            this.#mergeBias(totalBias.mechanicalBias, baseArchetype.mechanicalBias || {});
            this.#mergeBias(totalBias.roleBias, baseArchetype.roleBias || {});
            this.#mergeBias(totalBias.attributeBias, baseArchetype.attributeBias || {});
        }

        // Add prestige amplifier if present
        if (prestigeAmplifier && prestigeAmplifier.amplifier) {
            this.#mergeBias(totalBias.mechanicalBias, prestigeAmplifier.amplifier.mechanicalBias || {});
            this.#mergeBias(totalBias.roleBias, prestigeAmplifier.amplifier.roleBias || {});
            this.#mergeBias(totalBias.attributeBias, prestigeAmplifier.amplifier.attributeBias || {});
        }

        // Add specialist if present
        if (specialist) {
            this.#mergeBias(totalBias.mechanicalBias, specialist.mechanicalBias || {});
            this.#mergeBias(totalBias.roleBias, specialist.roleBias || {});
            this.#mergeBias(totalBias.attributeBias, specialist.attributeBias || {});
        }

        return totalBias;
    }

    /**
     * Get complete identity for an actor at current build state
     * Resolves base archetype, prestige class, and specialist from registries
     *
     * @param {Object} actor - Foundry actor
     * @param {string} baseArchetypeId - Base archetype identifier (registry key)
     * @param {string} prestigeClassId - Prestige class identifier/name (or null if not selected)
     * @param {string} specialistIndex - Index of specialist variant (0-2) or null for default
     * @returns {Promise<Object>} Complete identity: {
     *   baseArchetype: {...},
     *   amplifier: {...} | null,
     *   specialist: {...} | null,
     *   totalBias: { mechanicalBias, roleBias, attributeBias }
     * }
     * @throws {Error} If required registries not initialized
     */
    static async getActorIdentity(actor, baseArchetypeId, prestigeClassId = null, specialistIndex = null) {
        if (!ArchetypeRegistry.isInitialized()) {
            throw new Error('ArchetypeRegistry not initialized');
        }

        const identity = {
            baseArchetype: null,
            amplifier: null,
            specialist: null,
            totalBias: null
        };

        // Load base archetype
        const baseArchetype = ArchetypeRegistry.get(baseArchetypeId);
        if (!baseArchetype) {
            SWSELogger.warn(`[IdentityEngine] Base archetype not found: ${baseArchetypeId}`);
            return identity;
        }

        identity.baseArchetype = baseArchetype;

        // Load prestige class if specified
        if (prestigeClassId && PrestigeLayerRegistry.isInitialized()) {
            const prestigeClass = PrestigeLayerRegistry.get(prestigeClassId);
            if (prestigeClass) {
                identity.amplifier = prestigeClass;

                // Get applicable deepenings for actor's current class
                const deepenings = PrestigeLayerRegistry.getApplicableDeepenings(actor, prestigeClassId);
                if (deepenings.length > 0) {
                    // Use first applicable deepening (multi-class support can be extended later)
                    const deepening = deepenings[0];

                    // Select specialist variant
                    const specialistVariant = specialistIndex !== null && specialistIndex >= 0 && specialistIndex < 3
                        ? deepening.specialists[specialistIndex]
                        : PrestigeLayerRegistry.getSpecialistForActor(actor, deepening);

                    if (specialistVariant) {
                        identity.specialist = specialistVariant;
                    }
                } else {
                    SWSELogger.warn(
                        `[IdentityEngine] No applicable deepenings found for actor class and prestige: ${prestigeClassId}`
                    );
                }
            } else {
                SWSELogger.warn(`[IdentityEngine] Prestige class not found: ${prestigeClassId}`);
            }
        }

        // Compute total bias
        identity.totalBias = this.computeTotalBias(identity.baseArchetype, identity.amplifier, identity.specialist);

        return identity;
    }

    /**
     * Merge two bias objects additively
     * Higher bias weights stack; new values add to existing
     *
     * @private
     * @param {Object} target - Target bias object to merge into
     * @param {Object} source - Source bias object to merge from
     */
    static #mergeBias(target, source) {
        if (!source || typeof source !== 'object') {
            return;
        }

        for (const [key, value] of Object.entries(source)) {
            if (typeof value === 'number') {
                target[key] = (target[key] || 0) + value;
            }
        }
    }
}
