/**
 * SWSE Prestige Layer Registry
 *
 * Immutable, in-memory registry of prestige layer metadata.
 * Prestige layers define vertical advancement paths that deepen existing archetypes.
 *
 * This is a data-only layer — no scoring logic.
 * All prestige layers are loaded on game ready and cached.
 *
 * Part of: Identity & Prestige Integration Blueprint
 * Phase 1: Registry + Schema
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PrestigeLayerRegistry {
    // Immutable cache
    static #prestigeLayers = new Map();
    static #initialized = false;
    static #schema = null;

    /**
     * Initialize the registry by loading all prestige layer files
     * Called once on game ready
     * @returns {Promise<void>}
     */
    static async initialize() {
        if (this.#initialized) {
            SWSELogger.log('[PrestigeLayerRegistry] Already initialized, skipping');
            return;
        }

        try {
            // Load schema first
            await this._loadSchema();

            // Load prestige layers from JSON files
            await this._loadFromJSON();

            this.#initialized = true;
            SWSELogger.log(
                `[PrestigeLayerRegistry] Initialization complete. ` +
                `Total: ${this.#prestigeLayers.size} prestige layers`
            );
        } catch (err) {
            SWSELogger.error('[PrestigeLayerRegistry] Initialization failed:', err);
            this.#initialized = false;
            throw err;
        }
    }

    /**
     * Load and cache schema for validation
     * @private
     * @returns {Promise<void>}
     */
    static async _loadSchema() {
        try {
            const response = await fetch('/systems/foundryvtt-swse/schemas/prestige-layer.schema.json');
            if (!response.ok) {
                throw new Error(`Schema fetch failed: ${response.status}`);
            }
            this.#schema = await response.json();
            SWSELogger.log('[PrestigeLayerRegistry] Loaded prestige-layer schema');
        } catch (err) {
            SWSELogger.error('[PrestigeLayerRegistry] Failed to load schema:', err);
            throw err;
        }
    }

    /**
     * Load prestige layers from /data/prestige-layers/*.json
     * @private
     * @returns {Promise<void>}
     */
    static async _loadFromJSON() {
        try {
            SWSELogger.log('[PrestigeLayerRegistry] Loading prestige layers from /data/prestige-layers/');

            const prestigeNames = [
                'ace-pilot',
                'assassin',
                'bounty-hunter',
                'charlatan',
                'corporate-agent',
                'crime-lord',
                'droid-commander',
                'elite-trooper',
                'enforcer',
                'force-adept',
                'force-disciple',
                'gladiator',
                'gunslinger',
                'imperial-knight',
                'improviser',
                'independent-droid',
                'infiltrator',
                'jedi-knight',
                'jedi-master',
                'martial-arts-master',
                'master-privateer',
                'medic',
                'melee-duelist',
                'military-engineer',
                'officer',
                'outlaw',
                'pathfinder',
                'saboteur',
                'shaper',
                'sith-apprentice',
                'sith-lord',
                'vanguard'
            ];

            let loaded = 0;
            let failed = 0;

            for (const name of prestigeNames) {
                try {
                    const response = await fetch(`/systems/foundryvtt-swse/data/prestige-layers/${name}.json`);
                    if (!response.ok) {
                        SWSELogger.warn(`[PrestigeLayerRegistry] Failed to fetch ${name}.json: ${response.status}`);
                        failed++;
                        continue;
                    }

                    const data = await response.json();
                    const prestige = this._parsePrestigeLayer(data);

                    if (prestige) {
                        this.#prestigeLayers.set(prestige.name, prestige);
                        SWSELogger.log(`[PrestigeLayerRegistry] Loaded: "${prestige.name}"`);
                        loaded++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    SWSELogger.warn(`[PrestigeLayerRegistry] Error loading ${name}.json:`, err);
                    failed++;
                }
            }

            SWSELogger.log(
                `[PrestigeLayerRegistry] Load complete: ${loaded} loaded, ${failed} failed`
            );

            if (loaded === 0) {
                throw new Error('No prestige layers loaded successfully');
            }
        } catch (err) {
            SWSELogger.error('[PrestigeLayerRegistry] Failed to load prestige layers:', err);
            throw err;
        }
    }

    /**
     * Parse and validate prestige layer data
     * @private
     * @param {Object} data - Raw prestige layer JSON
     * @returns {Object|null} Parsed prestige layer or null if invalid
     */
    static _parsePrestigeLayer(data) {
        try {
            // Validate against schema
            if (!this._validateAgainstSchema(data)) {
                SWSELogger.warn(
                    `[PrestigeLayerRegistry] Validation failed for prestige layer`
                );
                return null;
            }

            // Validate bias keys are canonical
            if (!this._validateBiasKeys(data)) {
                SWSELogger.warn(
                    `[PrestigeLayerRegistry] Non-canonical bias keys in: ${data.name}`
                );
                return null;
            }

            return {
                name: data.name,
                status: data.status,
                amplifier: data.amplifier,
                archetypeDeepenings: data.archetypeDeepenings
            };
        } catch (err) {
            SWSELogger.warn('[PrestigeLayerRegistry] Parse error:', err);
            return null;
        }
    }

    /**
     * Validate data against prestige layer schema
     * @private
     * @param {Object} data - Prestige layer data to validate
     * @returns {boolean} True if valid
     */
    static _validateAgainstSchema(data) {
        if (!this.#schema) {
            SWSELogger.warn('[PrestigeLayerRegistry] Schema not loaded, skipping validation');
            return true;
        }

        // Basic JSON schema validation (simplified)
        try {
            if (!data.name || typeof data.name !== 'string') {
                return false;
            }
            if (!['active', 'experimental', 'disabled'].includes(data.status)) {
                return false;
            }
            if (!data.amplifier || typeof data.amplifier !== 'object') {
                return false;
            }
            if (!Array.isArray(data.archetypeDeepenings)) {
                return false;
            }
            if (data.archetypeDeepenings.length !== 5) {
                return false;
            }

            // Validate each deepening has 3 specialists
            for (const deepening of data.archetypeDeepenings) {
                if (!Array.isArray(deepening.specialists) || deepening.specialists.length !== 3) {
                    return false;
                }
            }

            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Validate that all bias keys used are canonical
     * @private
     * @param {Object} data - Prestige layer data
     * @returns {boolean} True if all keys are canonical
     */
    static async _validateBiasKeys(data) {
        try {
            const response = await fetch('/systems/foundryvtt-swse/data/bias-keys-canonical.json');
            const canonical = await response.json();

            const canonicalMech = Object.keys(canonical.mechanicalBias);
            const canonicalRole = Object.keys(canonical.roleBias);
            const canonicalAttr = Object.keys(canonical.attributeBias);

            // Check amplifier
            for (const key of Object.keys(data.amplifier.mechanicalBias || {})) {
                if (!canonicalMech.includes(key)) {
                    SWSELogger.warn(`[PrestigeLayerRegistry] Non-canonical mechanical key: ${key}`);
                    return false;
                }
            }

            for (const key of Object.keys(data.amplifier.roleBias || {})) {
                if (!canonicalRole.includes(key)) {
                    SWSELogger.warn(`[PrestigeLayerRegistry] Non-canonical role key: ${key}`);
                    return false;
                }
            }

            for (const key of Object.keys(data.amplifier.attributeBias || {})) {
                if (!canonicalAttr.includes(key)) {
                    SWSELogger.warn(`[PrestigeLayerRegistry] Non-canonical attribute key: ${key}`);
                    return false;
                }
            }

            // Check specialists in deepenings
            for (const deepening of data.archetypeDeepenings) {
                for (const specialist of deepening.specialists) {
                    for (const key of Object.keys(specialist.mechanicalBias || {})) {
                        if (!canonicalMech.includes(key)) {
                            return false;
                        }
                    }
                    for (const key of Object.keys(specialist.roleBias || {})) {
                        if (!canonicalRole.includes(key)) {
                            return false;
                        }
                    }
                    for (const key of Object.keys(specialist.attributeBias || {})) {
                        if (!canonicalAttr.includes(key)) {
                            return false;
                        }
                    }
                }
            }

            return true;
        } catch (err) {
            SWSELogger.warn('[PrestigeLayerRegistry] Could not validate bias keys:', err);
            // Don't fail on validation error, just warn
            return true;
        }
    }

    /**
     * Get a prestige layer by name
     * @param {string} name - Prestige layer name (e.g., 'Jedi Master Prestige')
     * @returns {Object|null} Prestige layer object or null if not found
     */
    static get(name) {
        return this.#prestigeLayers.get(name) || null;
    }

    /**
     * Get all prestige layers
     * @returns {Array<Object>} Array of prestige layer objects
     */
    static getAll() {
        return Array.from(this.#prestigeLayers.values());
    }

    /**
     * Check if a prestige layer exists
     * @param {string} name - Prestige layer name
     * @returns {boolean} True if prestige layer exists
     */
    static exists(name) {
        return this.#prestigeLayers.has(name);
    }

    /**
     * Get all active prestige layers
     * @returns {Array<Object>} Array of active prestige layers
     */
    static getAllActive() {
        return Array.from(this.#prestigeLayers.values())
            .filter(p => p.status === 'active');
    }

    /**
     * Get prestige layers by base archetype
     * @param {string} baseArchetypeName - Base archetype name
     * @returns {Array<Object>} Prestige layers that deepen this archetype
     */
    static getByArchetype(baseArchetypeName) {
        return this.getAllActive().filter(prestige =>
            prestige.archetypeDeepenings.some(d => d.baseArchetype === baseArchetypeName)
        );
    }

    /**
     * Check if registry is initialized
     * @returns {boolean}
     */
    static isInitialized() {
        return this.#initialized;
    }

    /**
     * Get registry statistics
     * @returns {Object} {initialized, count, statuses}
     */
    static getStats() {
        const statuses = {};
        for (const prestige of this.#prestigeLayers.values()) {
            statuses[prestige.status] = (statuses[prestige.status] || 0) + 1;
        }

        return {
            initialized: this.#initialized,
            count: this.#prestigeLayers.size,
            statuses
        };
    }
}
