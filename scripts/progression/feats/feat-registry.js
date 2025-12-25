/**
 * FEAT REGISTRY
 * Central lookup for all feats in the system.
 *
 * Loads all feats from compendium and builds an in-memory index
 * for fast O(1) lookups by name.
 */

import { SWSELogger } from '../../utils/logger.js';

export const FeatRegistry = {

    // In-memory map for O(1) lookups
    feats: new Map(),
    isBuilt: false,

    /**
     * Build feat registry from compendium
     * Call once during system initialization
     */
    async build() {
        try {
            const pack = game.packs.get('foundryvtt-swse.feats');
            if (!pack) {
                SWSELogger.warn('Feats compendium not found');
                return false;
            }

            const docs = await pack.getDocuments();
            let count = 0;

            for (const featDoc of docs) {
                if (featDoc.name) {
                    this.feats.set(featDoc.name.toLowerCase(), featDoc);
                    count++;
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`FeatRegistry built: ${count} feats loaded`);
            return true;

        } catch (err) {
            SWSELogger.error('Failed to build FeatRegistry:', err);
            return false;
        }
    },

    /**
     * Get a feat by name (case-insensitive)
     */
    get(name) {
        if (!name) return null;
        return this.feats.get(name.toLowerCase()) ?? null;
    },

    /**
     * Check if a feat exists
     */
    has(name) {
        if (!name) return false;
        return this.feats.has(name.toLowerCase());
    },

    /**
     * Get all feats as an array
     */
    list() {
        return Array.from(this.feats.values());
    },

    /**
     * Get count of loaded feats
     */
    count() {
        return this.feats.size;
    },

    /**
     * Get feats of a specific type
     */
    getByType(featType) {
        const normalized = String(featType).toLowerCase();
        return this.list().filter(feat => {
            const fType = String(feat.system?.featType || 'general').toLowerCase();
            return fType === normalized;
        });
    },

    /**
     * Get all feat names
     */
    getNames() {
        return Array.from(this.feats.keys()).map(name => {
            const doc = this.feats.get(name);
            return doc.name;
        });
    },

    /**
     * Get bonus feats (feats that can be selected as bonus feats)
     */
    getBonusFeats() {
        return this.list().filter(feat => {
            const bonusFor = feat.system?.bonus_feat_for || [];
            return Array.isArray(bonusFor) && bonusFor.length > 0;
        });
    },

    /**
     * Check if feat can be bonus feat for a class
     */
    canBeBonusFeatFor(featDoc, className) {
        const bonusFor = featDoc.system?.bonus_feat_for || [];
        return Array.isArray(bonusFor) && bonusFor.includes(className);
    },

    /**
     * Rebuild feat registry (for when content changes)
     */
    async rebuild() {
        this.feats.clear();
        this.isBuilt = false;
        return await this.build();
    },

    /**
     * Get registry status
     */
    getStatus() {
        return {
            isBuilt: this.isBuilt,
            count: this.feats.size,
            feats: this.getNames()
        };
    }
};

export default FeatRegistry;
