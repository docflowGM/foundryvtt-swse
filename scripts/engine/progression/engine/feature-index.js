/**
 * FEATURE INDEX
 * Centralized registry of all referenceable game features.
 *
 * Automatically builds index from compendiums at system initialization.
 * Provides fast lookups for feats, talents, force powers, class features, etc.
 *
 * Usage:
 * ```
 * const feat = FeatureIndex.getFeat("Mobility");
 * const talent = FeatureIndex.getTalent("Expertise");
 * const power = FeatureIndex.getPower("Move Object");
 * ```
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { loadFeatCatalogDocuments } from "/systems/foundryvtt-swse/scripts/registries/feat-pack-seeder.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";

export const FeatureIndex = {
    // Lookup maps - keyed by lowercase name for case-insensitive lookup
    feats: new Map(),
    talents: new Map(),
    powers: new Map(),
    techniques: new Map(),
    secrets: new Map(),
    classFeatures: new Map(),

    // Tracking for index state
    isBuilt: false,
    buildTimestamp: null,

    /**
     * Load entire feature index from all compendiums
     * Call this once at system initialization
     */
    /**
     * Resolve a pack by preferred key with fallbacks.
     * Strategy:
     *   1. preferred key as provided (should be `${systemId}.name`)
     *   2. `foundryvtt-swse.{packName}` hardcoded fallback
     *   3. Scan packs owned by this system for metadata.name match
     * @private
     * @param {string} packName  e.g. "feats", "talents"
     * @returns {CompendiumCollection|null}
     */
    _resolvePack(packName) {
        const packs = game?.packs;
        if (!packs) return null;
        const systemId = game?.system?.id || 'foundryvtt-swse';

        // Strategy 1
        const primary = packs.get(`${systemId}.${packName}`);
        if (primary) return primary;

        // Strategy 2
        const fallback = packs.get(`foundryvtt-swse.${packName}`);
        if (fallback) {
            SWSELogger.warn(`FeatureIndex: primary key "${systemId}.${packName}" not found; using fallback "foundryvtt-swse.${packName}"`);
            return fallback;
        }

        // Strategy 3: scan
        const scanned = [...packs.values()].find(p => {
            const owner = p.metadata?.package ?? p.metadata?.id ?? p.collection?.split('.')[0];
            return owner === systemId && p.metadata?.name === packName;
        });
        if (scanned) {
            SWSELogger.warn(`FeatureIndex: resolved "${packName}" via scan → "${scanned.collection}"`);
            return scanned;
        }

        return null;
    },

    async buildIndex() {
        try {
            const startTime = performance.now();
            const systemId = game?.system?.id || 'foundryvtt-swse';

            // Clear existing maps
            this.feats.clear();
            this.talents.clear();
            this.powers.clear();
            this.techniques.clear();
            this.secrets.clear();

            // Load main packs — use defensive resolver so a stale manifest doesn't silently break feats
            await this._loadPack('feats', this.feats);
            await this._loadPack('talents', this.talents);
            await this._loadForceRegistryType('power', this.powers, 'Force powers');

            // Load optional force domains through the same ForceRegistry SSOT so
            // raw compendium counts cannot drift from normalized picker counts.
            await this._loadForceRegistryType('technique', this.techniques, 'Force techniques');
            await this._loadForceRegistryType('secret', this.secrets, 'Force secrets');

            this.isBuilt = true;
            this.buildTimestamp = Date.now();

            const elapsed = (performance.now() - startTime).toFixed(2);

            SWSELogger.log(`SWSE FeatureIndex built (${elapsed}ms):`, {
                feats: this.feats.size,
                talents: this.talents.size,
                powers: this.powers.size,
                techniques: this.techniques.size,
                secrets: this.secrets.size,
                classFeatures: this.classFeatures.size
            });

            // Diagnostic: warn if any critical pack loaded 0 entries
            if (this.feats.size === 0) {
                const available = [...(game?.packs?.keys() ?? [])].filter(k => k.startsWith(systemId));
                SWSELogger.warn(
                    `FeatureIndex: feats loaded 0 entries. Available ${systemId} packs: ${available.join(', ') || '(none)'}`
                );
            }

        } catch (err) {
            SWSELogger.error('Failed to build FeatureIndex:', err);
            this.isBuilt = false;
        }
    },

    /**
     * Load items from a compendium into a Map (required pack — warns if missing)
     * @private
     */
    async _loadPack(packName, map) {
        const pack = this._resolvePack(packName);
        if (!pack) {
            if (packName === 'feats') {
                const docs = await this._loadFeatCatalogFallback();
                for (const doc of docs) {
                    if (doc.name) {
                        map.set(doc.name.toLowerCase(), doc);
                    }
                }
                if (docs.length) {
                    SWSELogger.log(`FeatureIndex: Missing feats pack; loaded ${docs.length} feats from data/feat-catalog.json fallback.`);
                    return;
                }
            }

            const extra = packName === 'feats'
                ? '; data/feat-catalog.json fallback also failed; run SWSE.debug.featPacks() for manifest/registration diagnostics'
                : '';
            SWSELogger.warn(`FeatureIndex: Missing pack "${packName}" (tried ${game?.system?.id ?? 'foundryvtt-swse'}.${packName} and fallbacks)${extra}`);
            return;
        }
        try {
            let docs = await pack.getDocuments();
            if (packName === 'feats' && !docs.length) {
                docs = await this._loadFeatCatalogFallback();
                if (docs.length) {
                    SWSELogger.log(`FeatureIndex: Pack "${pack.collection}" is empty; loaded ${docs.length} feats from data/feat-catalog.json fallback.`);
                }
            }
            for (const doc of docs) {
                if (doc.name) {
                    map.set(doc.name.toLowerCase(), doc);
                }
            }
            SWSELogger.log(`FeatureIndex: Loaded ${docs.length} items from ${pack.collection}${packName === 'feats' && docs.length ? ' / fallback-safe' : ''}`);
        } catch (err) {
            SWSELogger.error(`FeatureIndex: Failed to load pack "${pack.collection}":`, err);
        }
    },

    async _loadFeatCatalogFallback() {
        try {
            return await loadFeatCatalogDocuments();
        } catch (err) {
            SWSELogger.warn('FeatureIndex: Failed to load data/feat-catalog.json fallback:', err);
            return [];
        }
    },

    async _loadForceRegistryType(type, map, label = 'Force content') {
        try {
            await ForceRegistry.initialize?.();
            const entries = (ForceRegistry.byType?.(type) || [])
                .filter(entry => entry?.name);
            for (const entry of entries) {
                map.set(String(entry.name).toLowerCase(), entry);
            }
            SWSELogger.log(`FeatureIndex: Loaded ${entries.length} normalized ${label} from ForceRegistry`);
            return true;
        } catch (err) {
            SWSELogger.warn(`FeatureIndex: ForceRegistry load failed for ${label}; falling back to compendium`, err);
            const packName = type === 'power' ? 'forcepowers' : type === 'technique' ? 'forcetechniques' : 'forcesecrets';
            if (type === 'power') await this._loadPack(packName, map);
            else await this._tryLoadPack(packName, map);
            return false;
        }
    },

    /**
     * Load optional packs without warnings if they don't exist
     * @private
     */
    async _tryLoadPack(packName, map) {
        const pack = this._resolvePack(packName);
        if (!pack) return; // Silent fail for optional packs
        try {
            const docs = await pack.getDocuments();
            for (const doc of docs) {
                if (doc.name) {
                    map.set(doc.name.toLowerCase(), doc);
                }
            }
            SWSELogger.log(`FeatureIndex: Loaded ${docs.length} optional items from ${pack.collection}`);
        } catch (err) {
            SWSELogger.warn(`FeatureIndex: Failed to load optional pack "${pack.collection}":`, err);
        }
    },

    /**
     * Lookup methods
     */
    getFeat(name) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        return this.feats.get(this._normalize(name)) || null;
    },

    getTalent(name) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        return this.talents.get(this._normalize(name)) || null;
    },

    getPower(name) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        return this.powers.get(this._normalize(name)) || null;
    },

    getSecret(name) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        return this.secrets.get(this._normalize(name)) || null;
    },

    getTechnique(name) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        return this.techniques.get(this._normalize(name)) || null;
    },

    /**
     * Get class feature registered for a specific class
     */
    getClassFeature(className, featureName) {
        if (!this.isBuilt) {this._warnNotBuilt();}
        const key = `${className}:${featureName}`.toLowerCase();
        return this.classFeatures.get(key) || null;
    },

    /**
     * Get all features of a type
     */
    getAllFeats() {
        return Array.from(this.feats.values());
    },

    getAllTalents() {
        return Array.from(this.talents.values());
    },

    getAllPowers() {
        return Array.from(this.powers.values());
    },

    getAllSecrets() {
        return Array.from(this.secrets.values());
    },

    getAllTechniques() {
        return Array.from(this.techniques.values());
    },

    /**
     * Register a class feature for lookup
     * Called when classes are loaded
     */
    registerClassFeature(className, featureName, featureData) {
        const key = `${className}:${featureName}`.toLowerCase();
        this.classFeatures.set(key, featureData);
        SWSELogger.log(`Registered class feature: ${key}`);
    },

    /**
     * Register multiple class features at once
     */
    registerClassFeatures(className, features) {
        for (const [featureName, featureData] of Object.entries(features)) {
            this.registerClassFeature(className, featureName, featureData);
        }
    },

    /**
     * Get index status
     */
    getStatus() {
        return {
            isBuilt: this.isBuilt,
            buildTimestamp: this.buildTimestamp,
            counts: {
                feats: this.feats.size,
                talents: this.talents.size,
                powers: this.powers.size,
                techniques: this.techniques.size,
                secrets: this.secrets.size,
                classFeatures: this.classFeatures.size
            }
        };
    },

    /**
     * Rebuild index (useful for when compendiums change)
     */
    async rebuild() {
        SWSELogger.log('Rebuilding FeatureIndex...');
        await this.buildIndex();
    },

    /**
     * Helper: normalize string for lookup
     * @private
     */
    _normalize(name) {
        if (!name || typeof name !== 'string') {return '';}
        return name.trim().toLowerCase();
    },

    /**
     * Helper: warn if index not built
     * @private
     */
    _warnNotBuilt() {
        if (!this.isBuilt) {
            SWSELogger.warn('FeatureIndex not yet built. Call buildIndex() first.');
        }
    }
};

export default FeatureIndex;
