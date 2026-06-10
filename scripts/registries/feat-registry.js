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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getCanonicalBenefitText, getCanonicalDescriptionText, getCanonicalPrerequisiteText } from "/systems/foundryvtt-swse/scripts/data/prerequisite-authority.js";

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
    static _fallbackDocsById = new Map();   // id -> JSONL-backed doc-like object
    static _sourcePackKey = null;           // resolved pack key or fallback source

    /**
     * Initialize FeatRegistry from compendium
     * Call once during system ready hook
     */
    static async initialize() {
        if (this._initialized && this._entries.length > 0) {
            SWSELogger.log('[FeatRegistry] Already initialized, skipping');
            return;
        }

        if (this._initialized && this._entries.length === 0) {
            SWSELogger.warn('[FeatRegistry] Registry was initialized with 0 feats; retrying with pack/fallback resolution.');
        }

        try {
            const startTime = performance.now();
            this._resetIndexes();
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
        const pack = this._resolveFeatsPack();

        if (pack) {
            await this._loadDocumentsFromPack(pack);
            return;
        }

        // No client-side fallback: Foundry forbids fetching pack DB files from
        // browser JS (HTTP 403), so the only supported source is the registered
        // LevelDB compendium resolved above. If we reach here the pack store is
        // missing/empty and must be repaired on disk (rebuild packs/feats), not
        // worked around at runtime.
        const systemId = game?.system?.id || 'foundryvtt-swse';
        const tried = this._getPackCandidateKeys(systemId).join(', ');
        SWSELogger.warn(
            `[FeatRegistry] Compendium pack not registered by Foundry. Tried pack keys: ${tried}. ` +
            `Registry will be empty. This is a pack-store/install issue (the LevelDB pack at packs/feats is missing or empty); ` +
            `rebuild the compendium on disk rather than expecting a client-side recovery path.\n` +
            this._formatPackDiagnostics()
        );
    }

    static async _loadDocumentsFromPack(pack) {
        const packKey = pack?.collection || pack?.metadata?.id || `${pack?.metadata?.packageName}.${pack?.metadata?.name}`;
        try {
            const docs = await pack.getDocuments();
            this._sourcePackKey = packKey || 'unknown-pack';
            this._indexDocuments(docs, { fallback: false });
        } catch (err) {
            SWSELogger.error(`[FeatRegistry] Failed to load from pack "${packKey}":`, err);
            throw err;
        }
    }

    static _resetIndexes() {
        this._entries = [];
        this._byId.clear();
        this._byName.clear();
        this._byCategory.clear();
        this._byTag.clear();
        this._fallbackDocsById.clear();
        this._sourcePackKey = null;
    }

    static _indexDocuments(docs, { fallback = false } = {}) {
        for (const doc of docs || []) {
            if (!doc || !doc.name) continue;

            const entry = this._normalizeEntry(doc);
            this._entries.push(entry);
            this._byId.set(entry.id, entry);
            this._byName.set(entry.name.toLowerCase(), entry);

            if (fallback) {
                this._fallbackDocsById.set(entry.id, doc);
            }

            if (entry.category) {
                if (!this._byCategory.has(entry.category)) {
                    this._byCategory.set(entry.category, []);
                }
                this._byCategory.get(entry.category).push(entry);
            }

            for (const tag of entry.tags) {
                if (!this._byTag.has(tag)) {
                    this._byTag.set(tag, []);
                }
                this._byTag.get(tag).push(entry);
            }
        }
    }

    static _resolveFeatsPack() {
        const systemId = game?.system?.id || 'foundryvtt-swse';
        const candidates = this._getPackCandidateKeys(systemId);

        for (const key of candidates) {
            const pack = game?.packs?.get?.(key);
            if (pack) return pack;
        }

        const packs = Array.from(game?.packs?.values?.() || []);
        return packs.find((pack) => {
            const meta = pack?.metadata || {};
            const packageName = String(meta.packageName || pack?.packageName || '');
            const name = String(meta.name || pack?.collection?.split('.')?.pop?.() || '');
            const label = String(meta.label || '');
            const path = String(meta.path || '');
            const collection = String(pack?.collection || meta.id || '');

            if (packageName && packageName !== systemId && packageName !== 'foundryvtt-swse') return false;
            return [name, label, path, collection].some((value) => /(^|[/._-])feats($|[._-]|\.db$)/i.test(value));
        }) || null;
    }

    static _getPackCandidateKeys(systemId = game?.system?.id || 'foundryvtt-swse') {
        return Array.from(new Set([
            `${systemId}.feats`,
            'foundryvtt-swse.feats',
            `${systemId}.feat`,
            'foundryvtt-swse.feat'
        ].filter(Boolean)));
    }

    static _getFallbackPath() {
        const systemId = game?.system?.id || 'foundryvtt-swse';
        return `/systems/${systemId}/packs/feats.db`;
    }

    /**
     * DISABLED. Foundry intentionally forbids direct browser fetches of pack DB
     * files (packs/feats.db returns HTTP 403), so this was never a viable
     * recovery path and only produced misleading 403 errors in the console.
     * Feats must be loaded through the registered LevelDB compendium
     * (game.packs.get("<system>.feats")). Retained as an inert no-op so any
     * external callers keep working without re-introducing the forbidden fetch.
     * @returns {Promise<Array>} always empty
     */
    static async _loadJsonlFallback() {
        return [];
    }

    static _parseJsonlPack(text, path = 'packs/feats.db') {
        const docs = [];
        const lines = String(text || '').split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i]?.trim();
            if (!line) continue;
            try {
                const raw = JSON.parse(line);
                if (!raw || !raw.name) continue;
                docs.push(this._makeFallbackDocument(raw, path));
            } catch (err) {
                SWSELogger.warn(`[FeatRegistry] Skipped invalid feats fallback row ${i + 1} in ${path}:`, err);
            }
        }
        return docs;
    }

    static _makeFallbackDocument(raw, path = 'packs/feats.db') {
        const id = raw._id || raw.id || foundry?.utils?.randomID?.() || crypto?.randomUUID?.() || raw.name;
        const data = foundry?.utils?.deepClone ? foundry.utils.deepClone(raw) : JSON.parse(JSON.stringify(raw));
        data._id = id;
        data.id = id;
        data.type = data.type || 'feat';
        data.system = data.system || {};
        data.effects = Array.isArray(data.effects) ? data.effects : [];
        data.flags = data.flags || {};

        return {
            ...data,
            _id: id,
            id,
            name: data.name,
            type: data.type,
            system: data.system,
            effects: data.effects,
            flags: data.flags,
            img: data.img,
            pack: 'foundryvtt-swse.feats',
            uuid: `Compendium.foundryvtt-swse.feats.${id}`,
            _source: data,
            toObject() {
                return foundry?.utils?.deepClone ? foundry.utils.deepClone(data) : JSON.parse(JSON.stringify(data));
            }
        };
    }

    static _formatPackDiagnostics() {
        const allKeys = Array.from(game?.packs?.keys?.() || []);
        const swseKeys = allKeys.filter((key) => key.startsWith(`${game?.system?.id || 'foundryvtt-swse'}.`) || key.startsWith('foundryvtt-swse.'));
        return `Available SWSE pack keys (${swseKeys.length}): ${swseKeys.join(', ') || '(none)'}`;
    }

    /**
     * Normalize a compendium feat document into registry entry
     * @private
     * @param {*} doc - Compendium document
     * @returns {FeatRegistryEntry}
     */
    static _normalizeEntry(doc) {
        const system = doc.system || {};
        const canonicalPrerequisite = getCanonicalPrerequisiteText('feat', doc.name);
        const canonicalDescription = getCanonicalDescriptionText('feat', doc.name);
        const canonicalBenefit = getCanonicalBenefitText('feat', doc.name);

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
            raw: canonicalPrerequisite || system.prerequisite || system.prerequisites || null
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
            description: canonicalDescription || system.description?.value || system.description || canonicalBenefit || '',
            requiresTraining: Boolean(system.requiresTraining),
            requiresProficiency: Boolean(system.requiresProficiency),
            source: system.source || null,
            pack: doc.pack || 'unknown',
            system
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


    static async _getDocument(id) {
        if (!id) return null;
        const pack = this._resolveFeatsPack();
        const entry = this.getById(id);

        if (pack) {
            const packKey = pack?.collection || pack?.metadata?.id || 'foundryvtt-swse.feats';
            try {
                return await pack.getDocument(id);
            } catch (err) {
                SWSELogger.warn(`[FeatRegistry] Failed to fetch document ${id} from ${packKey}; checking fallback cache.`, err);
            }
        }

        return this._fallbackDocsById.get(id) || (entry ? this._makeFallbackDocument({
            _id: entry.id,
            name: entry.name,
            type: 'feat',
            img: entry.img,
            system: entry.system || {},
            effects: entry.effects || [],
            flags: entry.flags || {}
        }) : null);
    }

    static resolveEntry(ref) {
        if (!ref) return null;
        if (typeof ref === 'string') {
            return this.getById(ref) || this.getByName(ref);
        }
        return this.getById(ref.id || ref._id || ref.internalId) || this.getByName(ref.name || ref.label);
    }

    static async getDocumentById(id) {
        return this._getDocument(id);
    }

    static async getDocumentByName(name) {
        const entry = this.getByName(name);
        return entry ? this._getDocument(entry.id) : null;
    }

    /**
     * Check if registry is initialized
     * @returns {boolean}
     */
    static isInitialized() {
        return this._initialized;
    }
}
