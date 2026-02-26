/**
 * FeatRegistry
 *
 * Canonical enumeration authority for all feats in the system.
 *
 * Responsibilities:
 * - Load feats from compendium at startup
 * - Normalize feat data into stable schema
 * - Index by id, name, category, tags
 * - Provide clean read-only API
 *
 * Does NOT:
 * - Evaluate prerequisites (AbilityEngine responsibility)
 * - Check legality (AbilityEngine responsibility)
 * - Apply mutations (ActorEngine responsibility)
 * - Filter based on actor state
 *
 * V2 Governance:
 * - Pure enumeration, no rule logic
 * - Registry-only mode safe (no compendium fallback needed)
 * - Acts as SSOT for feat inventory
 * - Compatible with SuggestionEngine, AbilityEngine, UI layers
 */

import { SWSELogger } from '../utils/logger.js';

/**
 * Internal normalized feat entry
 * @typedef {Object} FeatRegistryEntry
 * @property {string} id - Stable identifier (usually _id from compendium)
 * @property {string} uuid - Compendium UUID
 * @property {string} name - Human-readable name
 * @property {string} type - Always "feat"
 * @property {string|null} category - Feat category (combat, general, force, etc.)
 * @property {string[]} tags - Normalized tags array
 * @property {Object} prerequisites - Prerequisite metadata (NOT evaluated)
 * @property {*} prerequisites.raw - Raw prerequisite data from compendium
 * @property {string} [description] - Short description
 * @property {boolean} [requiresTraining] - Whether feat requires skill training
 * @property {boolean} [requiresProficiency] - Whether feat requires proficiency
 * @property {string} [source] - Content source (book, UA, etc.)
 * @property {string} pack - Compendium pack origin
 */

export class FeatRegistry {
    // Static state - all methods are class methods
    static _initialized = false;
    static _entries = [];                    // Flat array of all entries
    static _byId = new Map();               // id -> entry
    static _byName = new Map();             // lowercase name -> entry
    static _byCategory = new Map();         // category -> entry[]
    static _byTag = new Map();              // tag -> entry[]

    /**
     * Initialize FeatRegistry from compendium
     * Call once during system ready hook
     */
    static async initialize() {
        if (this._initialized) {
            SWSELogger.log('[FeatRegistry] Already initialized, skipping');
            return;
        }

        try {
            const startTime = performance.now();
            await this._loadFromCompendium();
            const duration = (performance.now() - startTime).toFixed(2);

            this._initialized = true;
            SWSELogger.log(
                `[FeatRegistry] Initialized: ${this._entries.length} feats loaded (${duration}ms)`
            );
        } catch (err) {
            SWSELogger.error('[FeatRegistry] Initialization failed:', err);
            this._initialized = false;
            throw err;
        }
    }

    /**
     * Load all feats from compendium and normalize
     * @private
     */
    static async _loadFromCompendium() {
        const systemId = game?.system?.id || 'foundryvtt-swse';
        const packKey = `${systemId}.feats`;

        const pack = game?.packs?.get(packKey);
        if (!pack) {
            SWSELogger.warn(
                `[FeatRegistry] Compendium pack "${packKey}" not found. Registry will be empty.`
            );
            return;
        }

        try {
            const docs = await pack.getDocuments();

            for (const doc of docs) {
                if (!doc || !doc.name) {
                    continue;
                }

                const entry = this._normalizeEntry(doc);
                this._entries.push(entry);

                // Index by id
                this._byId.set(entry.id, entry);

                // Index by name (lowercase for case-insensitive lookup)
                this._byName.set(entry.name.toLowerCase(), entry);

                // Index by category
                if (entry.category) {
                    if (!this._byCategory.has(entry.category)) {
                        this._byCategory.set(entry.category, []);
                    }
                    this._byCategory.get(entry.category).push(entry);
                }

                // Index by tags
                for (const tag of entry.tags) {
                    if (!this._byTag.has(tag)) {
                        this._byTag.set(tag, []);
                    }
                    this._byTag.get(tag).push(entry);
                }
            }
        } catch (err) {
            SWSELogger.error(`[FeatRegistry] Failed to load from pack "${packKey}":`, err);
            throw err;
        }
    }

    /**
     * Normalize a compendium feat document into registry entry
     * @private
     * @param {*} doc - Compendium document
     * @returns {FeatRegistryEntry}
     */
    static _normalizeEntry(doc) {
        const system = doc.system || {};

        // Extract and normalize category
        let category = system.featType || system.category || null;
        if (category) {
            category = String(category).toLowerCase().trim() || null;
        }

        // Extract and normalize tags (ensure always array)
        let tags = system.tags || [];
        if (!Array.isArray(tags)) {
            tags = [];
        }
        tags = tags.map(t => String(t).toLowerCase().trim()).filter(t => t);

        // Normalize prerequisite block
        const prerequisites = {
            raw: system.prerequisites || null
        };

        // Create normalized entry
        return {
            id: doc._id,
            uuid: doc.uuid || null,
            name: doc.name,
            type: 'feat',
            category: category,
            tags: tags,
            prerequisites: prerequisites,
            description: system.description?.value || system.description || '',
            requiresTraining: Boolean(system.requiresTraining),
            requiresProficiency: Boolean(system.requiresProficiency),
            source: system.source || null,
            pack: doc.pack || 'unknown'
        };
    }

    /**
     * Get all feat entries
     * @returns {FeatRegistryEntry[]}
     */
    static getAll() {
        return [...this._entries];
    }

    /**
     * Get feat entry by ID
     * @param {string} id - Feat ID (usually compendium _id)
     * @returns {FeatRegistryEntry|null}
     */
    static getById(id) {
        if (!id) {
            return null;
        }
        return this._byId.get(id) || null;
    }

    /**
     * Get feat entry by name (case-insensitive)
     * @param {string} name - Feat name
     * @returns {FeatRegistryEntry|null}
     */
    static getByName(name) {
        if (!name) {
            return null;
        }
        return this._byName.get(String(name).toLowerCase()) || null;
    }

    /**
     * Get all feats in a category
     * @param {string} category - Category (e.g., "combat", "general", "force")
     * @returns {FeatRegistryEntry[]}
     */
    static getByCategory(category) {
        if (!category) {
            return [];
        }
        const normalized = String(category).toLowerCase().trim();
        return [...(this._byCategory.get(normalized) || [])];
    }

    /**
     * Get all feats with a specific tag
     * @param {string} tag - Tag name
     * @returns {FeatRegistryEntry[]}
     */
    static getByTag(tag) {
        if (!tag) {
            return [];
        }
        const normalized = String(tag).toLowerCase().trim();
        return [...(this._byTag.get(normalized) || [])];
    }

    /**
     * Search feats by custom predicate
     * @param {Function} predicate - Test function (entry) => boolean
     * @returns {FeatRegistryEntry[]}
     */
    static search(predicate) {
        if (typeof predicate !== 'function') {
            return [];
        }
        return this._entries.filter(predicate);
    }

    /**
     * Check if a feat exists by ID
     * @param {string} id - Feat ID
     * @returns {boolean}
     */
    static hasId(id) {
        return this._byId.has(id);
    }

    /**
     * Check if a feat exists by name
     * @param {string} name - Feat name
     * @returns {boolean}
     */
    static hasName(name) {
        if (!name) {
            return false;
        }
        return this._byName.has(String(name).toLowerCase());
    }

    /**
     * Get count of registered feats
     * @returns {number}
     */
    static count() {
        return this._entries.length;
    }

    /**
     * Get all unique categories
     * @returns {string[]}
     */
    static getCategories() {
        return Array.from(this._byCategory.keys()).sort();
    }

    /**
     * Get all unique tags
     * @returns {string[]}
     */
    static getTags() {
        return Array.from(this._byTag.keys()).sort();
    }

    /**
     * Check if registry is initialized
     * @returns {boolean}
     */
    static isInitialized() {
        return this._initialized;
    }
}
