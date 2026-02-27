// ============================================
// FILE: scripts/data/classes-db.js
// Classes Database - Single Source of Truth
// ============================================
//
// This module provides THE ONLY authorized access point for class data.
//
// Purpose:
// - Loads classes from compendium
// - Applies normalization
// - Provides O(1) lookup by ID
// - Links to talent trees
// - Enforces SSOT contract
//
// ALL engines MUST use ClassesDB instead of:
// - Reading compendiums directly
// - Reading class Item data
// - String matching on names
//
// Class Items on actors should contain ONLY:
// - classId (string)
// - level (number)
//
// All other class data is derived from this DB.
// ============================================

import { normalizeClass, normalizeClassId, validateClass } from "/systems/foundryvtt-swse/scripts/data/class-normalizer.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const ClassesDB = {

    // In-memory map for O(1) lookups: classId -> normalized class
    classes: new Map(),
    isBuilt: false,

    /**
     * Build classes registry from compendium.
     * Called once during system initialization (after TalentTreeDB is built).
     *
     * @param {Object} talentTreeDB - TalentTreeDB instance (for linking talent trees)
     * @returns {Promise<boolean>} - True if successful
     */
    async build(talentTreeDB = null) {
        try {
            const pack = game.packs.get('foundryvtt-swse.classes');
            if (!pack) {
                SWSELogger.warn('[ClassesDB] Classes compendium not found');
                return false;
            }

            // NOTE: ClassesDB is SSOT and must remain data-only.
            // Never call getDocuments() here — Foundry v12/v13 cannot safely
            // instantiate custom Item documents during system initialization.
            // Use getIndex() with expanded fields instead.
            const index = await pack.getIndex({ fields: ['system', 'name', 'img'] });
            let count = 0;
            let warnings = 0;

            for (const rawClass of index) {
                try {
                    // Normalize the class
                    const normalizedClass = normalizeClass(rawClass);

                    // Validate
                    validateClass(normalizedClass);

                    // Link talent trees (if TalentTreeDB is available)
                    if (talentTreeDB && talentTreeDB.isBuilt) {
                        // Prefer compendium IDs (drift-safe). Fallback to names.
                        const sourceIds = Array.isArray(normalizedClass.talentTreeSourceIds) ? normalizedClass.talentTreeSourceIds : [];
                        if (sourceIds.length) {
                            normalizedClass.talentTreeIds = sourceIds
                                .map(sourceId => {
                                    const tree = talentTreeDB.bySourceId(sourceId);
                                    if (!tree) {
                                        SWSELogger.warn(`[ClassesDB] Class "${normalizedClass.name}" references unknown talent tree sourceId: "${sourceId}"`);
                                        warnings++;
                                        return null;
                                    }
                                    return tree.id;
                                })
                                .filter(Boolean);
                        } else {
                            normalizedClass.talentTreeIds = normalizedClass.talentTreeNames
                                .map(name => {
                                    const tree = talentTreeDB.byName(name);
                                    if (!tree) {
                                        SWSELogger.warn(`[ClassesDB] Class "${normalizedClass.name}" references unknown talent tree: "${name}"`);
                                        warnings++;
                                        return null;
                                    }
                                    return tree.id;
                                })
                                .filter(Boolean);
                        }
                    }

                    // Store by ID
                    this.classes.set(normalizedClass.id, normalizedClass);
                    count++;

                } catch (err) {
                    SWSELogger.error(`[ClassesDB] Failed to normalize class "${rawClass.name}":`, err);
                    warnings++;
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`[ClassesDB] Built: ${count} classes loaded${warnings > 0 ? ` (${warnings} warnings)` : ''}`);
            return true;

        } catch (err) {
            SWSELogger.error('[ClassesDB] Failed to build:', err);
            return false;
        }
    },

    /**
     * Get a class by ID (normalized).
     * This is the PRIMARY way to access class data.
     *
     * @param {string} classId - Normalized class ID
     * @returns {Object|null} - Normalized class or null
     */
    get(classId) {
        if (!classId) {return null;}

        // Ensure ID is normalized
        const normalizedId = normalizeClassId(classId);
        return this.classes.get(normalizedId) ?? null;
    },

    /**
     * Get a class by name (case-insensitive).
     * Less efficient than get() - prefer ID lookup when possible.
     *
     * @param {string} name - Class name
     * @returns {Object|null} - Normalized class or null
     */
    byName(name) {
        if (!name) {return null;}

        const normalizedId = normalizeClassId(name);
        return this.get(normalizedId);
    },

    /**
     * Check if a class exists.
     *
     * @param {string} classId - Normalized class ID
     * @returns {boolean} - True if class exists
     */
    has(classId) {
        if (!classId) {return false;}
        const normalizedId = normalizeClassId(classId);
        return this.classes.has(normalizedId);
    },

    /**
     * Get all classes as an array.
     *
     * @returns {Array<Object>} - All normalized classes
     */
    all() {
        return Array.from(this.classes.values());
    },

    /**
     * Get base classes only.
     *
     * @returns {Array<Object>} - Base classes
     */
    baseClasses() {
        return this.all().filter(cls => cls.baseClass);
    },

    /**
     * Get prestige classes only.
     *
     * @returns {Array<Object>} - Prestige classes
     */
    prestigeClasses() {
        return this.all().filter(cls => !cls.baseClass);
    },

    /**
     * Get classes by role.
     *
     * @param {string} role - Role: "force", "combat", "tech", "leader", "general"
     * @returns {Array<Object>} - Classes matching role
     */
    byRole(role) {
        if (!role) {return [];}
        return this.all().filter(cls => cls.role === role);
    },

    /**
     * Get class definition from a class Item on an actor.
     * This is how engines should read class data from actors.
     *
     * @param {Object} classItem - Class item from actor.items
     * @returns {Object|null} - Normalized class or null
     */
    fromItem(classItem) {
        if (!classItem || classItem.type !== 'class') {
            SWSELogger.warn('[ClassesDB] fromItem called with invalid item:', classItem);
            return null;
        }

        const classId = classItem.system?.classId || normalizeClassId(classItem.name);
        const classDef = this.get(classId);

        if (!classDef) {
            SWSELogger.error(`[ClassesDB] Class item references unknown class: "${classId}"`);
        }

        return classDef;
    },

    /**
     * Get count of loaded classes.
     *
     * @returns {number} - Number of classes
     */
    count() {
        return this.classes.size;
    },

    /**
     * Validate that ClassesDB is ready for use.
     * Throws if not built.
     */
    ensureBuilt() {
        if (!this.isBuilt) {
            throw new Error('[ClassesDB] Database not built. Call ClassesDB.build() first.');
        }
    }
};

/**
 * CRITICAL: This is the ONLY way progression/CharGen/suggestion engines
 * should access class data.
 *
 * ❌ DO NOT USE:
 * - game.packs.get('classes')
 * - actor.items.filter(i => i.type === 'class')[0].system.hitDie
 * - String matching on class names
 *
 * ✅ ALWAYS USE:
 * - ClassesDB.get(classId)
 * - ClassesDB.fromItem(classItem)
 */
