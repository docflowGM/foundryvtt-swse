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
     * Validate all registered prestige layers for referential integrity
     * Checks that referenced archetypes exist and bias keys are canonical
     * Called after initialization to ensure data quality
     * @returns {Promise<Object>} Validation report {valid: boolean, errors: [], warnings: []}
     */
    static async validatePrestigeReferences() {
        const report = {
            valid: true,
            errors: [],
            warnings: []
        };

        if (!this.#initialized) {
            report.errors.push('Registry not initialized');
            report.valid = false;
            return report;
        }

        try {
            // Load canonical bias keys
            const response = await fetch('/systems/foundryvtt-swse/data/bias-keys-canonical.json');
            if (!response.ok) {
                report.warnings.push('Could not load canonical bias keys for validation');
                return report;
            }

            const canonical = await response.json();
            const canonicalMech = new Set(Object.keys(canonical.mechanicalBias || {}));
            const canonicalRole = new Set(Object.keys(canonical.roleBias || {}));
            const canonicalAttr = new Set(Object.keys(canonical.attributeBias || {}));

            // Load all archetypes to validate deepening references
            const archetypeResponse = await fetch('/systems/foundryvtt-swse/data/class-archetypes.json');
            const archetypeData = archetypeResponse.ok ? await archetypeResponse.json() : {};
            const baseArchetypeNames = new Set();

            for (const classData of Object.values(archetypeData.classes || {})) {
                for (const archData of Object.values(classData.archetypes || {})) {
                    if (archData.name) {
                        baseArchetypeNames.add(archData.name);
                    }
                }
            }

            // Validate each prestige layer
            for (const [name, prestige] of this.#prestigeLayers) {
                // Validate amplifier bias keys
                if (prestige.amplifier) {
                    if (prestige.amplifier.mechanicalBias) {
                        for (const biasKey of Object.keys(prestige.amplifier.mechanicalBias)) {
                            if (!canonicalMech.has(biasKey)) {
                                report.warnings.push(
                                    `Prestige layer "${name}" amplifier has non-canonical mechanicalBias key: "${biasKey}"`
                                );
                            }
                        }
                    }

                    if (prestige.amplifier.roleBias) {
                        for (const biasKey of Object.keys(prestige.amplifier.roleBias)) {
                            if (!canonicalRole.has(biasKey)) {
                                report.warnings.push(
                                    `Prestige layer "${name}" amplifier has non-canonical roleBias key: "${biasKey}"`
                                );
                            }
                        }
                    }

                    if (prestige.amplifier.attributeBias) {
                        for (const biasKey of Object.keys(prestige.amplifier.attributeBias)) {
                            if (!canonicalAttr.has(biasKey)) {
                                report.warnings.push(
                                    `Prestige layer "${name}" amplifier has non-canonical attributeBias key: "${biasKey}"`
                                );
                            }
                        }
                    }
                }

                // Validate deepenings reference existing archetypes
                if (Array.isArray(prestige.archetypeDeepenings)) {
                    if (prestige.archetypeDeepenings.length !== 5) {
                        report.warnings.push(
                            `Prestige layer "${name}" has ${prestige.archetypeDeepenings.length} deepenings (expected 5)`
                        );
                    }

                    for (const deepening of prestige.archetypeDeepenings) {
                        if (!baseArchetypeNames.has(deepening.baseArchetype)) {
                            report.warnings.push(
                                `Prestige layer "${name}" references unknown baseArchetype: "${deepening.baseArchetype}"`
                            );
                        }

                        // Validate specialist bias keys
                        if (Array.isArray(deepening.specialists)) {
                            if (deepening.specialists.length !== 3) {
                                report.warnings.push(
                                    `Prestige layer "${name}" deepening for "${deepening.baseArchetype}" has ${deepening.specialists.length} specialists (expected 3)`
                                );
                            }

                            for (const specialist of deepening.specialists) {
                                if (specialist.mechanicalBias) {
                                    for (const biasKey of Object.keys(specialist.mechanicalBias)) {
                                        if (!canonicalMech.has(biasKey)) {
                                            report.warnings.push(
                                                `Prestige layer "${name}" specialist "${specialist.name}" has non-canonical mechanicalBias key: "${biasKey}"`
                                            );
                                        }
                                    }
                                }

                                if (specialist.roleBias) {
                                    for (const biasKey of Object.keys(specialist.roleBias)) {
                                        if (!canonicalRole.has(biasKey)) {
                                            report.warnings.push(
                                                `Prestige layer "${name}" specialist "${specialist.name}" has non-canonical roleBias key: "${biasKey}"`
                                            );
                                        }
                                    }
                                }

                                if (specialist.attributeBias) {
                                    for (const biasKey of Object.keys(specialist.attributeBias)) {
                                        if (!canonicalAttr.has(biasKey)) {
                                            report.warnings.push(
                                                `Prestige layer "${name}" specialist "${specialist.name}" has non-canonical attributeBias key: "${biasKey}"`
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Validate required fields
                if (!prestige.name) {
                    report.errors.push(`Prestige layer missing name`);
                    report.valid = false;
                }

                if (!['active', 'experimental', 'disabled'].includes(prestige.status)) {
                    report.errors.push(`Prestige layer "${name}" invalid status: "${prestige.status}"`);
                    report.valid = false;
                }
            }

            if (report.errors.length > 0) {
                SWSELogger.error('[PrestigeLayerRegistry] Validation failed with errors:', report.errors);
            }

            if (report.warnings.length > 0) {
                SWSELogger.warn('[PrestigeLayerRegistry] Validation warnings:', report.warnings);
            }

            if (report.errors.length === 0 && report.warnings.length === 0) {
                SWSELogger.log('[PrestigeLayerRegistry] Validation passed with no errors or warnings');
            }

        } catch (err) {
            report.warnings.push(`Validation error: ${err.message}`);
            SWSELogger.error('[PrestigeLayerRegistry] Validation error:', err);
        }

        return report;
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
     * Get applicable deepenings for an actor based on their current classes
     * Handles multi-class by returning deepenings for all current classes
     * @param {Object} actor - Foundry actor
     * @param {string} prestigeName - Name of prestige layer
     * @returns {Array<Object>} Array of applicable deepenings for actor's classes
     */
    static getApplicableDeepenings(actor, prestigeName) {
        if (!actor || !prestigeName) {
            return [];
        }

        const prestige = this.get(prestigeName);
        if (!prestige || !Array.isArray(prestige.archetypeDeepenings)) {
            return [];
        }

        // Get actor's current class(es) from items
        const actorClasses = new Set();
        for (const item of actor.items) {
            if (item.type === 'class' && item.system?.classId) {
                actorClasses.add(item.system.classId);
            }
        }

        // Find deepenings matching actor's classes
        const applicableDeepenings = [];
        for (const deepening of prestige.archetypeDeepenings) {
            // Prestige data uses baseArchetype names, which we need to match against class
            // This is a simplified match - may need refinement if base archetype names differ from class IDs
            for (const classId of actorClasses) {
                if (deepening.baseArchetype && deepening.baseArchetype.toLowerCase().includes(classId.toLowerCase())) {
                    applicableDeepenings.push(deepening);
                    break;
                }
            }
        }

        return applicableDeepenings.length > 0 ? applicableDeepenings : [];
    }

    /**
     * Get specialist variant for an actor within a deepening
     * Selects specialist based on actor's ability scores and build intent
     * For now, returns first specialist as default; can be extended with scoring logic
     * @param {Object} actor - Foundry actor
     * @param {Object} deepening - Deepening object from prestige layer
     * @returns {Object|null} Selected specialist or null if not found
     */
    static getSpecialistForActor(actor, deepening) {
        if (!deepening || !Array.isArray(deepening.specialists) || deepening.specialists.length === 0) {
            return null;
        }

        // For Phase 2, default to first specialist
        // Future Phase 3 enhancement: select based on actor's ability scores and build intent
        return deepening.specialists[0] || null;
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
