/**
 * CLASSES REGISTRY
 * Central enumeration for all classes in the system.
 *
 * Pure enumeration layer — no legality checks, no actor filtering.
 * Authority: ClassesRegistry (enumeration)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const ClassesRegistry = {
    _cache: new Map(),      // id -> classDoc
    _byName: new Map(),     // name (lowercase) -> classDoc
    _byKey: new Map(),      // key -> classDoc
    isBuilt: false,

    /**
     * Build registry from compendium
     * Call once during system initialization
     */
    async build() {
        try {
            const pack = game.packs.get('foundryvtt-swse.classes');
            if (!pack) {
                SWSELogger.warn('Classes compendium not found');
                return false;
            }

            const docs = await pack.getDocuments();
            let count = 0;

            for (const classDoc of docs) {
                if (classDoc.id) {
                    // Index by UUID
                    this._cache.set(classDoc.id, classDoc);
                    count++;

                    // Index by name (case-insensitive)
                    if (classDoc.name) {
                        this._byName.set(classDoc.name.toLowerCase(), classDoc);
                    }

                    // Index by system.key if available
                    if (classDoc.system?.key) {
                        this._byKey.set(classDoc.system.key, classDoc);
                    }
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`ClassesRegistry built: ${count} classes loaded`);
            return true;

        } catch (err) {
            SWSELogger.error('Failed to build ClassesRegistry:', err);
            return false;
        }
    },

    /**
     * Get class by ID (UUID)
     */
    getById(id) {
        if (!id) return null;
        return this._cache.get(id) ?? null;
    },

    /**
     * Get class by name (case-insensitive)
     */
    getByName(name) {
        if (!name) return null;
        return this._byName.get(String(name).toLowerCase()) ?? null;
    },

    /**
     * Get class by system.key
     */
    getByKey(key) {
        if (!key) return null;
        return this._byKey.get(String(key)) ?? null;
    },

    /**
     * Get all classes
     */
    getAll() {
        return Array.from(this._cache.values());
    },

    /**
     * Check if class exists by ID
     */
    has(id) {
        if (!id) return false;
        return this._cache.has(id);
    },

    /**
     * Get count of classes
     */
    count() {
        return this._cache.size;
    },

    /**
     * Search classes by partial name match
     */
    search(query) {
        if (!query) return [];
        const q = String(query).toLowerCase();
        return this.getAll().filter(cls =>
            cls.name && cls.name.toLowerCase().includes(q)
        );
    },

    /**
     * Get classes by category (if system supports it)
     */
    getByCategory(category) {
        if (!category) return [];
        const cat = String(category).toLowerCase();
        return this.getAll().filter(cls =>
            cls.system?.category && String(cls.system.category).toLowerCase() === cat
        );
    },

    /**
     * Get all class names
     */
    getAllNames() {
        return this.getAll().map(cls => cls.name);
    },

    /**
     * Rebuild registry (for content updates)
     */
    async rebuild() {
        this._cache.clear();
        this._byName.clear();
        this._byKey.clear();
        this.isBuilt = false;
        return await this.build();
    },

    /**
     * Get registry status
     */
    getStatus() {
        return {
            isBuilt: this.isBuilt,
            count: this._cache.size,
            classNames: this.getAllNames()
        };
    }
};

export default ClassesRegistry;
