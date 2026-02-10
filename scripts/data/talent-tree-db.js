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
    sourceIndex: new Map(),

    // SSOT inverse index: talentId -> treeId (built from tree.system.talentIds)
    talentToTree: new Map(),

    isBuilt: false,

    /**
     * Build talent tree registry from compendium.
     * Called once during system initialization (before ClassesDB).
     *
     * NOTE: This registry intentionally uses getIndex() instead of getDocuments().
     * TalentTreeDB is a data-only SSOT registry and must NOT instantiate Item documents.
     * Using getDocuments() causes Foundry v12/v13 validation failures for custom Item
     * types ("talenttree") due to CompendiumCollection.set() rejecting partially-
     * constructed documents. The index provides all needed data without lifecycle issues.
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

            // Use getIndex with expanded fields - NOT getDocuments (see note above)
            const index = await pack.getIndex({ fields: ['system', 'name', 'img'] });
            let count = 0;
            let warnings = 0;

            for (const entry of index) {
                try {
                    // Normalize the tree from index entry (has _id, name, system, img)
                    const normalizedTree = normalizeTalentTree(entry);

                    // Validate
                    validateTalentTree(normalizedTree);

                    // Store by ID
                    this.trees.set(normalizedTree.id, normalizedTree);
                    if (normalizedTree.sourceId) {this.sourceIndex.set(normalizedTree.sourceId, normalizedTree);}
                    count++;

                } catch (err) {
                    SWSELogger.error(`[TalentTreeDB] Failed to normalize tree "${entry.name}":`, err);
                    warnings++;
                }
            }

            // Build the talentToTree inverse index (SSOT for tree ownership)
            this.buildTalentIndex();

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
        if (!treeId) {return null;}

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

    /**
     * Lookup a talent tree by its compendium document _id.
     * This prevents drift when display names change.
     *
     * @param {string} sourceId - compendium document id
     * @returns {Object|null}
     */
    bySourceId(sourceId) {
        if (!sourceId) {return null;}
        return this.sourceIndex.get(sourceId) || null;
    },

byName(name) {
        if (!name) {return null;}

        return findTalentTreeByName(name, this.trees);
    },

    /**
     * Check if a talent tree exists.
     *
     * @param {string} treeId - Normalized tree ID
     * @returns {boolean} - True if tree exists
     */
    has(treeId) {
        if (!treeId) {return false;}
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
        if (!role) {return [];}
        return this.all().filter(tree => tree.role === role);
    },

    /**
     * Get talent trees by category.
     *
     * @param {string} category - Category: "jedi", "sith", "droid", "universal", etc.
     * @returns {Array<Object>} - Trees matching category
     */
    byCategory(category) {
        if (!category) {return [];}
        return this.all().filter(tree => tree.category === category);
    },

    /**
     * Get talent trees by access tag (flag-based eligibility).
     *
     * @param {string} tag - Tag: "force", "droid", etc.
     * @returns {Array<Object>} - Trees with this tag
     */
    byTag(tag) {
        if (!tag) {return [];}
        return this.all().filter(tree => (tree.tags || []).includes(tag));
    },

    /**
     * Get talent trees by multiple tags (OR logic).
     *
     * @param {Array<string>} tags - Tags to search for
     * @returns {Array<Object>} - Trees matching any of these tags
     */
    byTags(tags) {
        if (!tags || tags.length === 0) {return [];}
        const tagSet = new Set(tags);
        return this.all().filter(tree =>
            (tree.tags || []).some(tag => tagSet.has(tag))
        );
    },

    /**
     * Get talent trees for a class (by class ID).
     * Requires ClassesDB to be built.
     *
     * Uses the new SSOT system: classes reference trees by stable IDs.
     * PHASE 3: talentTreeIds is now the authoritative source.
     *
     * @param {string} classId - Class ID
     * @param {Object} classesDB - ClassesDB instance
     * @returns {Array<Object>} - Trees for this class
     */
    forClass(classId, classesDB) {
        if (!classId || !classesDB) {return [];}

        const classDef = classesDB.get(classId);
        if (!classDef) {return [];}

        // Use new ID-based talentTreeIds (PHASE 3)
        const treeIds = classDef.talentTreeIds || [];

        return treeIds
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
     * Build the talentToTree inverse index (SSOT for tree ownership).
     * Called after all trees are loaded.
     *
     * This enables O(1) lookup: given a talentId, find which tree owns it.
     */
    buildTalentIndex() {
        this.talentToTree.clear();

        for (const tree of this.trees.values()) {
            const talentIds = tree.talentIds || [];

            for (const talentId of talentIds) {
                this.talentToTree.set(talentId, tree.id);
            }
        }

        SWSELogger.log(`[TalentTreeDB] Built talent index: ${this.talentToTree.size} talents indexed`);
    },

    /**
     * Get the tree ID that owns a talent (SSOT query).
     *
     * @param {string} talentId - Talent ID
     * @returns {string|null} - Tree ID or null if talent is unowned
     */
    getTreeForTalent(talentId) {
        if (!talentId) {return null;}
        return this.talentToTree.get(talentId) ?? null;
    },

    /**
     * Get all talents for a tree (inverse query).
     *
     * @param {string} treeId - Tree ID
     * @returns {Array<string>} - Talent IDs in this tree
     */
    getTalentsForTree(treeId) {
        if (!treeId) {return [];}

        const tree = this.get(treeId);
        return tree?.talentIds ?? [];
    },

    /**
     * Get all talents for multiple trees.
     *
     * @param {Array<string>} treeIds - Tree IDs
     * @returns {Array<string>} - Talent IDs from all trees (deduplicated)
     */
    getTalentsForTrees(treeIds) {
        if (!treeIds || treeIds.length === 0) {return [];}

        const talents = new Set();

        for (const treeId of treeIds) {
            const treetalents = this.getTalentsForTree(treeId);
            for (const tid of treetalents) {
                talents.add(tid);
            }
        }

        return Array.from(talents);
    },

    /**
     * Get all available talent trees for a character (PHASE 3 runtime integration).
     *
     * Combines:
     * 1. Class-specific trees (from class.system.talentTreeIds)
     * 2. Flag-based trees (Force-sensitive → force trees, Droid → droid trees)
     *
     * @param {Object} actor - Actor document with class and flags
     * @returns {Array<Object>} - Available talent trees for this character
     */
    getTalentTreesForCharacter(actor) {
        if (!actor) {return [];}

        const trees = new Set();

        // Get class trees (if class exists)
        if (actor.class) {
            const classTrees = actor.class.system?.talentTreeIds || [];
            for (const treeId of classTrees) {
                const tree = this.get(treeId);
                if (tree) {trees.add(tree);}
            }
        }

        // Add flag-based trees
        const flags = actor.system?.flags || {};

        // Force-sensitive grants access to all force trees
        if (flags.forceSensitive) {
            const forceTrees = this.byTag('force');
            for (const tree of forceTrees) {
                trees.add(tree);
            }
        }

        // Droid grants access to all droid trees
        if (flags.droid) {
            const droidTrees = this.byTag('droid');
            for (const tree of droidTrees) {
                trees.add(tree);
            }
        }

        return Array.from(trees);
    },

    /**
     * Get all available talents for a character (convenience method).
     * Combines getTalentTreesForCharacter + getTalentsForTrees.
     *
     * @param {Object} actor - Actor document
     * @returns {Array<string>} - All talent IDs available to this character
     */
    getTalentsForCharacter(actor) {
        if (!actor) {return [];}

        const trees = this.getTalentTreesForCharacter(actor);
        const treeIds = trees.map(t => t.id);

        return this.getTalentsForTrees(treeIds);
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
