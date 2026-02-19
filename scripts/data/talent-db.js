// ============================================
// FILE: scripts/data/talent-db.js
// Talent Database - Normalized Access
// ============================================
//
// This module provides authorized access to talent data.
//
// Purpose:
// - Loads talents from compendium
// - Links talents to talent trees via IDs
// - Groups talents by tree for efficient queries
// - Removes class-level eligibility (derived from trees)
//
// IMPORTANT ARCHITECTURAL RULE:
// Talents do NOT define class eligibility directly.
// Class eligibility is resolved via the talent tree they belong to.
//
// This prevents circular dependencies and ensures SSOT.
// ============================================

import {
    normalizeTalent,
    getTalentsByTree,
    validateTalent,
    filterTalentsByRole
} from './talent-normalizer.js';
import { SWSELogger } from '../utils/logger.js';
import { toStableKey } from '../utils/stable-key.js';

export const TalentDB = {

    // In-memory storage
    talents: [],  // All normalized talents
    talentsByTree: new Map(),  // treeId -> Array<Talent>
    talentsByTreeKey: new Map(),  // treeKey -> Array<Talent> (Phase 5)
    talentsById: new Map(),  // talentId -> Talent
    _byKey: new Map(),  // stableKey -> Talent (Phase 5)
    isBuilt: false,

    /**
     * Build talent registry from compendium.
     * Called once during system initialization (after TalentTreeDB is built).
     *
     * @param {Object} talentTreeDB - TalentTreeDB instance (for linking)
     * @returns {Promise<boolean>} - True if successful
     */
    async build(talentTreeDB = null) {
        try {
            const pack = game.packs.get('foundryvtt-swse.talents');
            if (!pack) {
                SWSELogger.warn('[TalentDB] Talents compendium not found');
                return false;
            }

            // NOTE: TalentDB is SSOT and must remain data-only.
            // Never call getDocuments() here — Foundry v12/v13 cannot safely
            // instantiate custom Item documents during system initialization.
            // Use getIndex() with expanded fields instead.
            const index = await pack.getIndex({ fields: ['system', 'name', 'img'] });

            let count = 0;
            let orphaned = 0;
            let warnings = 0;

            for (const rawTalent of index) {
                try {
                    // Skip invalid documents
                    if (!rawTalent || typeof rawTalent !== 'object' || !rawTalent._id) {
                        warnings++;
                        continue;
                    }

                    // Normalize the talent (with tree linkage)
                    const normalizedTalent = normalizeTalent(rawTalent, talentTreeDB?.trees);

                    // Validate
                    if (!validateTalent(normalizedTalent)) {
                        warnings++;
                        continue;
                    }

                    // Store in main array
                    this.talents.push(normalizedTalent);

                    // Store by ID
                    this.talentsById.set(normalizedTalent.id, normalizedTalent);

                    // Store by stable key (generate if not in compendium)
                    const key = rawTalent.system?.key ?? toStableKey(rawTalent.name);
                    if (key) {
                        this._byKey.set(key, normalizedTalent);
                    }

                    // Group by tree
                    if (normalizedTalent.treeId) {
                        if (!this.talentsByTree.has(normalizedTalent.treeId)) {
                            this.talentsByTree.set(normalizedTalent.treeId, []);
                        }
                        this.talentsByTree.get(normalizedTalent.treeId).push(normalizedTalent);
                    }

                    // Group by tree key (generate if not in compendium)
                    const treeKey = rawTalent.system?.treeKey ?? (normalizedTalent.treeId ? toStableKey(normalizedTalent.treeName) : null);
                    if (treeKey) {
                        if (!this.talentsByTreeKey.has(treeKey)) {
                            this.talentsByTreeKey.set(treeKey, []);
                        }
                        this.talentsByTreeKey.get(treeKey).push(normalizedTalent);
                    }

                    if (!normalizedTalent.treeId) {
                        orphaned++;
                    }

                    count++;

                } catch (err) {
                    SWSELogger.error(`[TalentDB] Failed to normalize talent "${rawTalent?.name || 'unknown'}":`, err);
                    warnings++;
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`[TalentDB] Built: ${count} talents loaded${orphaned > 0 ? ` (${orphaned} orphaned)` : ''}${warnings > 0 ? ` (${warnings} warnings)` : ''}`);
            return true;

        } catch (err) {
            SWSELogger.error('[TalentDB] Failed to build:', err);
            return false;
        }
    },

    /**
     * Get talents for a talent tree.
     * This is the PRIMARY way to query talents.
     *
     * @param {string} treeId - Talent tree ID
     * @returns {Array<Object>} - Talents in this tree
     */
    byTree(treeId) {
        if (!treeId) {return [];}
        return this.talentsByTree.get(treeId) || [];
    },

    /**
     * Get talents for a talent tree by stable key (Phase 5).
     *
     * @param {string} treeKey - Talent tree stable key
     * @returns {Array<Object>} - Talents in this tree
     */
    byTreeKey(treeKey) {
        if (!treeKey) {return [];}
        return this.talentsByTreeKey.get(treeKey) || [];
    },

    /**
     * Get a talent by ID.
     *
     * @param {string} talentId - Talent ID
     * @returns {Object|null} - Normalized talent or null
     */
    get(talentId) {
        if (!talentId) {return null;}
        return this.talentsById.get(talentId) ?? null;
    },

    /**
     * Get a talent by stable key (Phase 5).
     *
     * @param {string} key - Talent stable key
     * @returns {Object|null} - Normalized talent or null
     */
    byKey(key) {
        if (!key) {return null;}
        return this._byKey.get(key) ?? null;
    },

    /**
     * Get talents for a class (via its talent trees).
     * Requires ClassesDB to be built.
     *
     * @param {string} classId - Class ID
     * @param {Object} classesDB - ClassesDB instance
     * @returns {Array<Object>} - All talents available to this class
     */
    forClass(classId, classesDB) {
        if (!classId || !classesDB) {return [];}

        const classDef = classesDB.get(classId);
        if (!classDef) {return [];}

        // Get all talents from all trees this class has access to
        const talents = [];
        for (const treeId of classDef.talentTreeIds) {
            talents.push(...this.byTree(treeId));
        }

        return talents;
    },

    /**
     * Get talents by role (via their tree).
     * Used by Suggestion Engine.
     *
     * @param {string} role - Role: "force", "combat", "tech", "leader", "general"
     * @param {Object} talentTreeDB - TalentTreeDB instance
     * @returns {Array<Object>} - Talents matching role
     */
    byRole(role, talentTreeDB) {
        if (!role || !talentTreeDB) {return [];}
        return filterTalentsByRole(this.talents, role, talentTreeDB.trees);
    },

    /**
     * Get talents available to an actor (considering class and level).
     * This respects class eligibility via talent trees.
     *
     * @param {Object} actor - Actor document
     * @param {Object} classesDB - ClassesDB instance
     * @returns {Array<Object>} - Available talents
     */
    forActor(actor, classesDB) {
        if (!actor || !classesDB) {return [];}

        // Get all class items
        const classItems = actor.items.filter(i => i.type === 'class');
        if (classItems.length === 0) {return [];}

        // Collect all available talents from all classes
        const availableTalents = new Set();

        for (const classItem of classItems) {
            const classDef = classesDB.fromItem(classItem);
            if (!classDef) {continue;}

            // Get talents for this class
            const talents = this.forClass(classDef.id, classesDB);
            talents.forEach(t => availableTalents.add(t));
        }

        return Array.from(availableTalents);
    },

    /**
     * Get talents already selected by an actor.
     *
     * @param {Object} actor - Actor document
     * @returns {Array<Object>} - Selected talent items
     */
    selectedByActor(actor) {
        if (!actor) {return [];}

        return actor.items.filter(i => i.type === 'talent');
    },

    /**
     * Get unselected talents available to an actor.
     * This is what should be shown in talent selection dialogs.
     *
     * @param {Object} actor - Actor document
     * @param {Object} classesDB - ClassesDB instance
     * @returns {Array<Object>} - Available unselected talents
     */
    unselectedForActor(actor, classesDB) {
        const available = this.forActor(actor, classesDB);
        const selected = this.selectedByActor(actor);
        const selectedIds = new Set(selected.map(t => t.id || t._id));

        return available.filter(t => !selectedIds.has(t.id));
    },

    /**
     * Get all talents as an array.
     *
     * @returns {Array<Object>} - All normalized talents
     */
    all() {
        return this.talents;
    },

    /**
     * Get count of loaded talents.
     *
     * @returns {number} - Number of talents
     */
    count() {
        return this.talents.length;
    },

    /**
     * Backward compatibility: Get talents by tree, supporting both treeId and treeKey (Phase 8).
     * Tries key first, then falls back to ID.
     *
     * @param {string} treeIdOrKey - Tree ID or stable key
     * @returns {Array<Object>} - Talents in this tree
     */
    byTreeCompat(treeIdOrKey) {
        if (!treeIdOrKey) {return [];}

        // Try key first
        let talents = this.byTreeKey(treeIdOrKey);
        if (talents.length > 0) {return talents;}

        // Fall back to ID
        return this.byTree(treeIdOrKey);
    },

    /**
     * Validate that TalentDB is ready for use.
     * Throws if not built.
     */
    ensureBuilt() {
        if (!this.isBuilt) {
            throw new Error('[TalentDB] Database not built. Call TalentDB.build() first.');
        }
    }
};

/**
 * CRITICAL: Talent eligibility is determined by talent trees, NOT by class.
 *
 * ❌ DO NOT USE:
 * - talent.system.class for eligibility
 * - String matching on talent tree names
 * - Direct compendium queries
 *
 * ✅ ALWAYS USE:
 * - TalentDB.forClass(classId, classesDB)
 * - TalentDB.forActor(actor, classesDB)
 * - TalentDB.byTree(treeId)
 *
 * This ensures:
 * - Multiclass characters get correct talents
 * - Prestige classes work correctly
 * - No circular dependencies
 * - SSOT is enforced
 */
