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
    async buildIndex() {
        try {
            const startTime = performance.now();

            // Clear existing maps
            this.feats.clear();
            this.talents.clear();
            this.powers.clear();
            this.techniques.clear();
            this.secrets.clear();

            // Load main packs
            await this._loadPack('foundryvtt-swse.feats', this.feats);
            await this._loadPack('foundryvtt-swse.talents', this.talents);
            await this._loadPack('foundryvtt-swse.forcepowers', this.powers);

            // Load optional packs (may not exist in all installations)
            await this._tryLoadPack('foundryvtt-swse.forcetechniques', this.techniques);
            await this._tryLoadPack('foundryvtt-swse.forcesecrets', this.secrets);

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

        } catch (err) {
            SWSELogger.error('Failed to build FeatureIndex:', err);
            this.isBuilt = false;
        }
    },

    /**
     * Load items from a compendium into a Map
     * @private
     */
    async _loadPack(packId, map) {
        try {
            const pack = game.packs.get(packId);
            if (!pack) {
                SWSELogger.warn(`FeatureIndex: Missing pack ${packId}`);
                return;
            }

            const docs = await pack.getDocuments();
            for (const doc of docs) {
                if (doc.name) {
                    map.set(doc.name.toLowerCase(), doc);
                }
            }

            SWSELogger.log(`Loaded ${docs.length} items from ${packId}`);

        } catch (err) {
            SWSELogger.error(`Failed to load pack ${packId}:`, err);
        }
    },

    /**
     * Load optional packs without warnings if they don't exist
     * @private
     */
    async _tryLoadPack(packId, map) {
        try {
            const pack = game.packs.get(packId);
            if (!pack) {return;} // Silent fail for optional packs

            const docs = await pack.getDocuments();
            for (const doc of docs) {
                if (doc.name) {
                    map.set(doc.name.toLowerCase(), doc);
                }
            }

            SWSELogger.log(`Loaded ${docs.length} optional items from ${packId}`);

        } catch (err) {
            SWSELogger.warn(`Failed to load optional pack ${packId}:`, err);
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
