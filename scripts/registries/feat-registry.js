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
import { FeatPackSeeder, loadFeatCatalogDocuments } from "/systems/foundryvtt-swse/scripts/registries/feat-pack-seeder.js";
import { isTalentOnlyFeatContaminant } from "/systems/foundryvtt-swse/scripts/data/feat-domain-guard.js";

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
    static _bySlug = new Map();             // lowercase slug -> entry
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
            SWSELogger.debug('[FeatRegistry] Registry was initialized with 0 feats; retrying with pack/fallback resolution.');
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

        // P0 fail-safe: if Foundry does not register the feats compendium, do not
        // let chargen/level-up lose the feat catalog. The served JSON catalog is
        // the same sanitized source used by the compendium seeder, so it is a
        // safe read-only enumeration fallback. This avoids the previous hard
        // failure where a manifest/cache/pack-path seam produced 0 feats.
        const fallbackDocs = await this._loadServedCatalogFallback();
        if (fallbackDocs.length) {
            this._sourcePackKey = 'data/feat-catalog.json';
            this._indexDocuments(fallbackDocs, { fallback: true });
            const systemId = game?.system?.id || 'foundryvtt-swse';
            const tried = this._getPackCandidateKeys(systemId).join(', ');
            SWSELogger.log(
                `[FeatRegistry] Feats compendium was not registered by Foundry (tried ${tried}); ` +
                `loaded ${fallbackDocs.length} feats from data/feat-catalog.json fallback instead.`
            );
            return;
        }

        const systemId = game?.system?.id || 'foundryvtt-swse';
        const tried = this._getPackCandidateKeys(systemId).join(', ');
        SWSELogger.warn(
            `[FeatRegistry] Compendium pack not registered by Foundry and data/feat-catalog.json fallback failed. ` +
            `Tried pack keys: ${tried}. Registry will be empty. Run SWSE.debug.featPacks() in the console for diagnostics.\n` +
            this._formatPackDiagnostics()
        );
        await this.diagnosePackRegistration({ reason: 'FeatRegistry._loadFromCompendium missing pack and fallback failed', log: true });
    }

    static async _loadDocumentsFromPack(pack) {
        const packKey = pack?.collection || pack?.metadata?.id || `${pack?.metadata?.packageName}.${pack?.metadata?.name}`;
        try {
            let docs = await pack.getDocuments();

            // v13 pack-repair path: Foundry may register foundryvtt-swse.feats but expose
            // an empty migrated LevelDB store. When that happens on a GM client, seed the
            // pack through Foundry's own document API from the sanitized served catalog,
            // then reload the documents. Non-GM clients fall through to the read-only data
            // catalog fallback below so chargen/level-up is not blocked.
            if (!docs?.length) {
                SWSELogger.warn(`[FeatRegistry] Pack "${packKey}" is registered but contains 0 documents; attempting sanitized catalog recovery.`);
                const seedResult = await FeatPackSeeder.seedIfEmpty({
                    pack,
                    reason: 'FeatRegistry empty registered pack recovery'
                });
                if (seedResult?.ok) {
                    docs = await pack.getDocuments();
                }
            }

            if (docs?.length) {
                const iconRepair = await FeatPackSeeder.repairIconsFromCatalog({
                    pack,
                    docs,
                    reason: 'FeatRegistry registered pack icon sync'
                });
                if (iconRepair?.updated > 0) {
                    docs = await pack.getDocuments();
                }

                this._sourcePackKey = packKey || 'unknown-pack';
                this._indexDocuments(docs, { fallback: false });
                return;
            }

            const fallbackDocs = await this._loadServedCatalogFallback();
            if (fallbackDocs.length) {
                this._sourcePackKey = 'data/feat-catalog.json';
                this._indexDocuments(fallbackDocs, { fallback: true });
                SWSELogger.log(`[FeatRegistry] Loaded ${fallbackDocs.length} feats from data/feat-catalog.json because pack "${packKey}" is empty.`);
            }
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
        this._bySlug.clear();
        this._fallbackDocsById.clear();
        this._sourcePackKey = null;
    }

    static _indexDocuments(docs, { fallback = false } = {}) {
        let skippedTalentContaminants = 0;
        for (const doc of docs || []) {
            if (!doc || !doc.name) continue;
            if (isTalentOnlyFeatContaminant(doc)) {
                skippedTalentContaminants += 1;
                continue;
            }

            const entry = this._normalizeEntry(doc);
            this._entries.push(entry);
            this._byId.set(entry.id, entry);
            this._byName.set(entry.name.toLowerCase(), entry);

            const slug = doc.system?.slug || entry.system?.slug;
            if (slug) {
                this._bySlug.set(String(slug).toLowerCase(), entry);
            }

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

        if (skippedTalentContaminants > 0) {
            SWSELogger.warn(`[FeatRegistry] Skipped ${skippedTalentContaminants} talent-only contaminant rows while indexing feats.`);
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
     * Build a high-signal diagnostic snapshot for the feats compendium registration path.
     * This intentionally does not load feats from raw pack files; it only reports what
     * Foundry declares/serves/registers so install-state failures are visible.
     * @param {Object} [options]
     * @param {string} [options.reason] diagnostic reason
     * @param {boolean} [options.log=true] whether to emit the snapshot to the console
     * @returns {Promise<Object>} diagnostic snapshot
     */
    static async diagnosePackRegistration(options = {}) {
        const reason = options.reason || 'manual diagnostic';
        const shouldLog = options.log !== false;
        const systemId = game?.system?.id || 'foundryvtt-swse';
        const packageName = game?.system?.packageName || game?.system?.id || systemId;
        const candidateKeys = this._getPackCandidateKeys(systemId);
        const registeredKeys = Array.from(game?.packs?.keys?.() || []);
        const swseKeys = registeredKeys.filter((key) => key.startsWith(`${systemId}.`) || key.startsWith('foundryvtt-swse.'));
        const registeredFeatLikeKeys = registeredKeys.filter((key) => /(^|[.])feat(s)?($|[._-])/i.test(key) || /feat/i.test(key));
        const declaredPacks = this._getRuntimeDeclaredPackEntries();
        const declaredFeatPacks = declaredPacks.filter((pack) => this._isFeatLikeManifestEntry(pack));
        const declaredNeighbors = declaredPacks.filter((pack) => /feat|class|talent|species|background|language|force/i.test(`${pack.name || ''} ${pack.label || ''} ${pack.path || ''}`));
        const missingDeclaredKeys = declaredPacks
            .map((pack) => pack?.name ? `${systemId}.${pack.name}` : null)
            .filter(Boolean)
            .filter((key) => !registeredKeys.includes(key));
        const duplicateDeclaredNames = this._findDuplicates(declaredPacks.map((pack) => pack?.name).filter(Boolean));
        const duplicateDeclaredPaths = this._findDuplicates(declaredPacks.map((pack) => pack?.path).filter(Boolean));
        const servedManifest = await this._fetchServedManifest(systemId);
        const servedPacks = Array.isArray(servedManifest?.json?.packs) ? servedManifest.json.packs : [];
        const servedFeatPacks = servedPacks.filter((pack) => this._isFeatLikeManifestEntry(pack));
        const servedNeighborPacks = servedPacks.filter((pack) => /feat|class|talent|species|background|language|force/i.test(`${pack.name || ''} ${pack.label || ''} ${pack.path || ''}`));
        const pathChecks = await this._probeDeclaredPackPaths(systemId, servedFeatPacks.length ? servedFeatPacks : declaredFeatPacks);

        const snapshot = {
            reason,
            system: {
                id: systemId,
                packageName,
                title: game?.system?.title || null,
                version: game?.system?.version || null,
                compatibility: game?.system?.compatibility || null
            },
            candidates: candidateKeys.map((key) => ({ key, registered: Boolean(game?.packs?.get?.(key)) })),
            runtimeManifest: {
                declaredCount: declaredPacks.length,
                declaredFeatPacks,
                declaredNeighbors,
                duplicateDeclaredNames,
                duplicateDeclaredPaths,
                missingDeclaredKeys: missingDeclaredKeys.filter((key) => /feat|class|talent|species|background|language|force/i.test(key))
            },
            servedSystemJson: {
                ok: servedManifest.ok,
                status: servedManifest.status,
                url: servedManifest.url,
                error: servedManifest.error || null,
                id: servedManifest.json?.id || null,
                name: servedManifest.json?.name || null,
                version: servedManifest.json?.version || null,
                packCount: servedPacks.length,
                featPacks: servedFeatPacks,
                neighborPacks: servedNeighborPacks
            },
            registeredPacks: {
                totalCount: registeredKeys.length,
                swseCount: swseKeys.length,
                featLikeKeys: registeredFeatLikeKeys,
                swseKeys
            },
            staticPathProbes: pathChecks,
            interpretation: this._interpretFeatPackDiagnostics({
                candidateKeys,
                registeredKeys,
                declaredFeatPacks,
                servedManifest,
                servedFeatPacks,
                pathChecks
            })
        };

        if (shouldLog) {
            SWSELogger.warn('[FeatRegistry] Feats pack registration diagnostic snapshot:', snapshot);
        }

        return snapshot;
    }

    static _getRuntimeDeclaredPackEntries() {
        const packs = game?.system?.packs;
        if (!packs) return [];
        const raw = Array.isArray(packs)
            ? packs
            : packs instanceof Map
                ? Array.from(packs.values())
                : typeof packs === 'object'
                    ? Object.values(packs)
                    : [];
        return raw.map((pack) => this._packManifestSummary(pack));
    }

    static _packManifestSummary(pack = {}) {
        return {
            name: pack?.name || pack?.metadata?.name || null,
            label: pack?.label || pack?.metadata?.label || null,
            type: pack?.type || pack?.metadata?.type || null,
            system: pack?.system || pack?.metadata?.system || pack?.metadata?.packageName || null,
            packageName: pack?.packageName || pack?.package || pack?.metadata?.packageName || pack?.metadata?.package || null,
            path: pack?.path || pack?.metadata?.path || null,
            ownership: pack?.ownership || pack?.metadata?.ownership || null,
            flags: pack?.flags || pack?.metadata?.flags || null
        };
    }

    static _isFeatLikeManifestEntry(pack = {}) {
        return /(^|[/._-])feat(s)?($|[/._-]|\.db$)/i.test(`${pack.name || ''} ${pack.label || ''} ${pack.path || ''}`);
    }

    static _findDuplicates(values = []) {
        const seen = new Set();
        const dupes = new Set();
        for (const value of values) {
            const key = String(value || '').trim();
            if (!key) continue;
            if (seen.has(key)) dupes.add(key);
            seen.add(key);
        }
        return Array.from(dupes);
    }

    static async _fetchServedManifest(systemId) {
        const url = `/systems/${systemId}/system.json?swseFeatDiag=${Date.now()}`;
        try {
            const response = await fetch(url, { cache: 'no-store' });
            let json = null;
            let parseError = null;
            try {
                json = await response.clone().json();
            } catch (err) {
                parseError = err?.message || String(err);
            }
            return {
                ok: response.ok,
                status: response.status,
                url,
                json,
                error: parseError
            };
        } catch (err) {
            return {
                ok: false,
                status: null,
                url,
                json: null,
                error: err?.message || String(err)
            };
        }
    }

    static async _probeDeclaredPackPaths(systemId, entries = []) {
        const uniquePaths = Array.from(new Set((entries || []).map((entry) => entry?.path).filter(Boolean)));
        const results = [];
        for (const path of uniquePaths) {
            const normalizedPath = String(path).replace(/^\/+/, '');
            const url = `/systems/${systemId}/${normalizedPath}?swseFeatDiag=${Date.now()}`;
            try {
                const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
                results.push({ path, url, method: 'HEAD', ok: response.ok, status: response.status, statusText: response.statusText || '' });
            } catch (err) {
                results.push({ path, url, method: 'HEAD', ok: false, status: null, error: err?.message || String(err) });
            }
        }
        return results;
    }

    static _interpretFeatPackDiagnostics({ candidateKeys, registeredKeys, declaredFeatPacks, servedManifest, servedFeatPacks, pathChecks }) {
        const registeredCandidate = candidateKeys.find((key) => registeredKeys.includes(key));
        if (registeredCandidate) {
            return `A candidate key is registered (${registeredCandidate}); failure is probably in document loading, not pack registration.`;
        }
        if (!declaredFeatPacks.length && !servedFeatPacks.length) {
            return 'The served runtime manifest does not declare a feats pack. Deploy/sync system.json from the current repo.';
        }
        if (servedManifest?.ok === false) {
            return `Could not read served system.json (${servedManifest.status || servedManifest.error}); verify the system id/path that Foundry is serving.`;
        }
        if (servedFeatPacks.length && !declaredFeatPacks.length) {
            return 'Served system.json declares feats, but game.system.packs does not expose it. Foundry may be using transformed/cached system metadata.';
        }
        const missingPath = (pathChecks || []).find((probe) => probe.status === 404);
        if (missingPath) {
            return `The served manifest declares a feats pack at ${missingPath.path}, but that path 404s. Deploy the pack file/folder with the manifest.`;
        }
        const forbiddenPath = (pathChecks || []).find((probe) => probe.status === 403);
        if (forbiddenPath) {
            return `The feats pack path exists but is protected from browser access (${forbiddenPath.status}); that is normal for pack files. Since Foundry still did not register it, inspect server-side pack migration/cache state.`;
        }
        return 'The served manifest appears to declare feats, but Foundry did not register foundryvtt-swse.feats. Suspect server-side pack migration/cache or package install-state; try a version bump/full reinstall or path cache-buster.';
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

    static async _loadServedCatalogFallback() {
        try {
            const rawDocs = await loadFeatCatalogDocuments();
            return rawDocs.map((raw) => this._makeFallbackDocument(raw, 'data/feat-catalog.json'));
        } catch (err) {
            SWSELogger.warn('[FeatRegistry] Failed to load data/feat-catalog.json fallback:', err);
            return [];
        }
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

        const img = doc.img || system.img || system.iconPath || system.assetIcon || 'icons/svg/upgrade.svg';

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
            img,
            iconPath: img,
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

    /**
     * Get feat entry by slug (case-insensitive)
     * @param {string} slug
     * @returns {FeatRegistryEntry|null}
     */
    static getBySlug(slug) {
        if (!slug) return null;
        return this._bySlug.get(String(slug).toLowerCase()) || null;
    }

    /**
     * Deterministic canonical-UUID scheme for feats. This is a synthetic,
     * stable SSOT lookup key (NOT a Foundry document UUID): `swse.feat.<slug>`.
     * It is the primary key the fallback stub pack stores and the drop-hydration
     * interceptor resolves against. Because it is derived from the slug, it
     * stays valid even if the stub compendium is regenerated.
     */
    static CANONICAL_UUID_PREFIX = 'swse.feat.';

    static canonicalUuidForSlug(slug) {
        const normalized = String(slug || '').toLowerCase().trim();
        return normalized ? `${this.CANONICAL_UUID_PREFIX}${normalized}` : null;
    }

    static canonicalUuidForEntry(entry) {
        return this.canonicalUuidForSlug(entry?.system?.slug || entry?.slug);
    }

    /**
     * Resolve an entry from a canonical UUID (`swse.feat.<slug>`).
     * @param {string} uuid
     * @returns {FeatRegistryEntry|null}
     */
    static getByCanonicalUuid(uuid) {
        if (!uuid) return null;
        const s = String(uuid).trim();
        if (s.toLowerCase().startsWith(this.CANONICAL_UUID_PREFIX)) {
            return this.getBySlug(s.slice(this.CANONICAL_UUID_PREFIX.length));
        }
        return null;
    }

    static resolveEntry(ref) {
        if (!ref) return null;
        if (typeof ref === 'string') {
            // Priority: exact id, canonical UUID, slug, then name (diagnostic).
            return this.getById(ref)
                || this.getByCanonicalUuid(ref)
                || this.getBySlug(ref)
                || this.getByName(ref);
        }
        return this.getById(ref.id || ref._id || ref.internalId)
            || this.getByCanonicalUuid(ref.canonicalUuid)
            || this.getBySlug(ref.slug || ref.system?.slug)
            || this.getByName(ref.name || ref.label);
    }

    /**
     * Resolve a canonical, fully-formed feat Item data object from the SSOT.
     * Synchronous (uses the in-memory index + cached fallback docs) so it is
     * safe to call inside non-awaited hooks like preCreateItem.
     *
     * @param {string|object} ref - feat id, slug, name, or a partial record
     * @returns {{name:string,type:string,img:string,system:object,effects:Array,flags:object}|null}
     */
    static getCanonicalItemData(ref) {
        const entry = this.resolveEntry(ref);
        if (!entry) return null;

        const fallbackDoc = this._fallbackDocsById.get(entry.id);
        const base = fallbackDoc?.toObject ? fallbackDoc.toObject() : null;

        return {
            id: entry.id,
            canonicalUuid: this.canonicalUuidForEntry(entry),
            slug: entry.system?.slug || null,
            name: entry.name,
            type: 'feat',
            img: entry.img,
            system: base?.system || entry.system || {},
            effects: Array.isArray(base?.effects) ? base.effects : [],
            flags: base?.flags ? foundry?.utils?.deepClone?.(base.flags) ?? base.flags : {}
        };
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
