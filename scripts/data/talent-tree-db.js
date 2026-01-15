// ============================================
// FILE: scripts/data/talent-tree-db.js
// Talent Tree Database - Normalized Access
// ============================================
//
// This module provides authorized access to talent tree data.
//
// Purpose:
// - Loads talent trees from compendium
// - Applies normalization (stable IDs, roles, categories)
// - Provides O(1) lookup by ID
// - Prevents string matching failures
//
// This is the bridge between classes and talents.
// Classes reference talent tree IDs.
// Talents reference talent tree IDs.
//
// ALL engines MUST use this DB instead of string matching on names.
// ============================================

import {
    normalizeTalentTree,
    normalizeTalentTreeId,
    findTalentTreeByName,
    validateTalentTree
} from './talent-tree-normalizer.js';
import { SWSELogger } from '../utils/logger.js';

export const TalentTreeDB = {

    // In-memory map for O(1) lookups: treeId -> normalized tree
    trees: new Map(),
    isBuilt: false,

    /**
     * Build talent tree registry from compendium.
     * Called once during system initialization (before ClassesDB).
     *
     * @returns {Promise<boolean>} - True if successful
     */
    async build() {
        try {
            const pack = game.packs.get('foundryvtt-swse.talent_trees');
            if (!pack) {
                SWSELogger.warn('[TalentTreeDB] Talent trees compendium not found');
                return false;
            }

            const docs = await pack.getDocuments();
            let count = 0;
            let warnings = 0;

            for (const rawTree of docs) {
                try {
                    // Normalize the tree
                    const normalizedTree = normalizeTalentTree(rawTree);

                    // Validate
                    validateTalentTree(normalizedTree);

                    // Store by ID
                    this.trees.set(normalizedTree.id, normalizedTree);
                    count++;

                } catch (err) {
                    SWSELogger.error(`[TalentTreeDB] Failed to normalize tree "${rawTree.name}":`, err);
                    warnings++;
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`[TalentTreeDB] Built: ${count} trees loaded${warnings > 0 ? ` (${warnings} warnings)` : ''}`);
            return true;

        } catch (err) {
            SWSELogger.error('[TalentTreeDB] Failed to build:', err);
            return false;
        }
    },

    /**
     * Get a talent tree by ID (normalized).
     * This is the PRIMARY way to access talent tree data.
     *
     * @param {string} treeId - Normalized tree ID
     * @returns {Object|null} - Normalized tree or null
     */
    get(treeId) {
        if (!treeId) return null;

        // Ensure ID is normalized
        const normalizedId = normalizeTalentTreeId(treeId);
        return this.trees.get(normalizedId) ?? null;
    },

    /**
     * Get a talent tree by name (case-insensitive, handles encoding issues).
     * Less efficient than get() - prefer ID lookup when possible.
     *
     * @param {string} name - Tree name
     * @returns {Object|null} - Normalized tree or null
     */
    byName(name) {
        if (!name) return null;

        return findTalentTreeByName(name, this.trees);
    },

    /**
     * Check if a talent tree exists.
     *
     * @param {string} treeId - Normalized tree ID
     * @returns {boolean} - True if tree exists
     */
    has(treeId) {
        if (!treeId) return false;
        const normalizedId = normalizeTalentTreeId(treeId);
        return this.trees.has(normalizedId);
    },

    /**
     * Get all talent trees as an array.
     *
     * @returns {Array<Object>} - All normalized trees
     */
    all() {
        return Array.from(this.trees.values());
    },

    /**
     * Get talent trees by role.
     *
     * @param {string} role - Role: "force", "combat", "tech", "leader", "general"
     * @returns {Array<Object>} - Trees matching role
     */
    byRole(role) {
        if (!role) return [];
        return this.all().filter(tree => tree.role === role);
    },

    /**
     * Get talent trees by category.
     *
     * @param {string} category - Category: "jedi", "sith", "droid", "universal", etc.
     * @returns {Array<Object>} - Trees matching category
     */
    byCategory(category) {
        if (!category) return [];
        return this.all().filter(tree => tree.category === category);
    },

    /**
     * Get talent trees for a class (by class ID).
     * Requires ClassesDB to be built.
     *
     * @param {string} classId - Class ID
     * @param {Object} classesDB - ClassesDB instance
     * @returns {Array<Object>} - Trees for this class
     */
    forClass(classId, classesDB) {
        if (!classId || !classesDB) return [];

        const classDef = classesDB.get(classId);
        if (!classDef) return [];

        return classDef.talentTreeIds
            .map(treeId => this.get(treeId))
            .filter(Boolean);
    },

    /**
     * Get count of loaded talent trees.
     *
     * @returns {number} - Number of trees
     */
    count() {
        return this.trees.size;
    },

    /**
     * Validate that TalentTreeDB is ready for use.
     * Throws if not built.
     */
    ensureBuilt() {
        if (!this.isBuilt) {
            throw new Error('[TalentTreeDB] Database not built. Call TalentTreeDB.build() first.');
        }
    }
};

/**
 * CRITICAL: This is the bridge between classes and talents.
 *
 * ❌ DO NOT USE:
 * - String matching on talent tree names
 * - Storing talent tree names in class items
 * - Reading talent_tree.db directly
 *
 * ✅ ALWAYS USE:
 * - TalentTreeDB.get(treeId)
 * - TalentTreeDB.byName(name) for migration/legacy code
 * - Store tree IDs, not names
 */
