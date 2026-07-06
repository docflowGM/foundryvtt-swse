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
} from "/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";

function createTalentTreeBuildAudit() {
    return {
        attempted: 0,
        loaded: 0,
        normalizationFailures: [],
        missingSourceIds: [],
        duplicateIds: [],
        duplicateSourceIds: [],
        duplicateStableKeys: [],
        emptyTrees: [],
    };
}

function describeTreeForAudit(treeOrEntry = {}) {
    return {
        id: treeOrEntry.id || null,
        sourceId: treeOrEntry.sourceId || treeOrEntry._id || null,
        name: treeOrEntry.name || treeOrEntry.system?.talent_tree || '(unnamed talent tree)',
    };
}

function emitTalentTreeBuildAudit(audit) {
    const hasFailures = audit.normalizationFailures.length
        || audit.missingSourceIds.length
        || audit.duplicateIds.length
        || audit.duplicateSourceIds.length
        || audit.duplicateStableKeys.length;

    const payload = {
        attempted: audit.attempted,
        loaded: audit.loaded,
        failed: audit.normalizationFailures.length,
        missingSourceIds: audit.missingSourceIds.length,
        duplicateIds: audit.duplicateIds.length,
        duplicateSourceIds: audit.duplicateSourceIds.length,
        duplicateStableKeys: audit.duplicateStableKeys.length,
        emptyTrees: audit.emptyTrees.length,
    };

    if (hasFailures) {
        SWSELogger.error('[TalentTreeDB] Talent tree load audit FAILED', {
            ...payload,
            normalizationFailures: audit.normalizationFailures,
            missingSourceIds: audit.missingSourceIds,
            duplicateIds: audit.duplicateIds,
            duplicateSourceIds: audit.duplicateSourceIds,
            duplicateStableKeys: audit.duplicateStableKeys,
            emptyTrees: audit.emptyTrees,
        });
        return;
    }

    if (audit.emptyTrees.length) {
        SWSELogger.warn('[TalentTreeDB] Talent tree load audit completed with empty trees', {
            ...payload,
            emptyTrees: audit.emptyTrees,
        });
        return;
    }

    SWSELogger.log(`[TalentTreeDB] Talent tree load audit PASS: ${audit.loaded}/${audit.attempted} trees loaded`);
}

export const TalentTreeDB = {

    // In-memory map for O(1) lookups: treeId -> normalized tree
    trees: new Map(),
    sourceIndex: new Map(),
    _byId: new Map(),  // ID -> tree (compatibility API)
    _byKey: new Map(),  // NEW: stableKey -> tree (Phase 6)
    _legacyIdMap: new Map(),  // NEW: legacy treeId -> tree (legacy alias resolution)

    // SSOT inverse index: talentId -> treeId (built from tree.system.talentIds)
    talentToTree: new Map(),

    isBuilt: false,
    lastBuildAudit: null,

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
        const audit = createTalentTreeBuildAudit();
        this.lastBuildAudit = audit;

        try {
            const pack = game.packs.get('foundryvtt-swse.talent_trees');
            if (!pack) {
                SWSELogger.error('[TalentTreeDB] Talent trees compendium not found; no talent trees can load');
                return false;
            }

            // Reset indexes so rebuilds do not hide duplicate or stale entries.
            this.trees.clear();
            this.sourceIndex.clear();
            this._byId.clear();
            this._byKey.clear();
            this._legacyIdMap.clear();
            this.talentToTree.clear();
            this.isBuilt = false;

            // Use getIndex with expanded fields - NOT getDocuments (see note above)
            const index = await pack.getIndex({ fields: ['system', 'name', 'img'] });
            const membershipRegistry = await this._loadTalentTreeMembershipRegistry();
            let warnings = 0;

            audit.attempted = index.size ?? index.length ?? 0;

            for (const entry of index) {
                try {
                    // Normalize the tree from index entry (has _id, name, system, img)
                    const normalizedTree = normalizeTalentTree(entry);
                    this._applyMembershipRegistryHints(normalizedTree, membershipRegistry);

                    // Validate
                    validateTalentTree(normalizedTree);

                    if (!normalizedTree.sourceId) {
                        audit.missingSourceIds.push(describeTreeForAudit(normalizedTree));
                        warnings++;
                    }
                    if (this.trees.has(normalizedTree.id)) {
                        audit.duplicateIds.push({
                            duplicateId: normalizedTree.id,
                            existing: describeTreeForAudit(this.trees.get(normalizedTree.id)),
                            incoming: describeTreeForAudit(normalizedTree),
                        });
                        warnings++;
                    }
                    if (normalizedTree.sourceId && this.sourceIndex.has(normalizedTree.sourceId)) {
                        audit.duplicateSourceIds.push({
                            duplicateSourceId: normalizedTree.sourceId,
                            existing: describeTreeForAudit(this.sourceIndex.get(normalizedTree.sourceId)),
                            incoming: describeTreeForAudit(normalizedTree),
                        });
                        warnings++;
                    }
                    if (!Array.isArray(normalizedTree.talentIds) || normalizedTree.talentIds.length === 0) {
                        if (!Array.isArray(normalizedTree.talentNames) || normalizedTree.talentNames.length === 0) {
                            audit.emptyTrees.push(describeTreeForAudit(normalizedTree));
                        }
                    }

                    // Store by ID
                    this.trees.set(normalizedTree.id, normalizedTree);
                    this._byId.set(normalizedTree.id, normalizedTree);
                    if (normalizedTree.sourceId) {this.sourceIndex.set(normalizedTree.sourceId, normalizedTree);}

                    // Store by stable key (generate if not in compendium)
                    const key = entry.system?.key ?? toStableKey(entry.name);
                    if (key) {
                        if (this._byKey.has(key)) {
                            audit.duplicateStableKeys.push({
                                duplicateStableKey: key,
                                existing: describeTreeForAudit(this._byKey.get(key)),
                                incoming: describeTreeForAudit(normalizedTree),
                            });
                            warnings++;
                        }
                        this._byKey.set(key, normalizedTree);
                    }
                    audit.loaded++;

                } catch (err) {
                    audit.normalizationFailures.push({
                        ...describeTreeForAudit(entry),
                        error: err?.message || String(err),
                    });
                    SWSELogger.error(`[TalentTreeDB] Failed to normalize tree "${entry.name}":`, err);
                    warnings++;
                }
            }

            // Build the talentToTree inverse index (SSOT for tree ownership)
            this.buildTalentIndex();

            // Build legacy ID alias layer for backwards compatibility
            this._buildLegacyIdMap();

            this.isBuilt = true;
            emitTalentTreeBuildAudit(audit);
            SWSELogger.log(`[TalentTreeDB] Built: ${audit.loaded} trees loaded${warnings > 0 ? ` (${warnings} warnings)` : ''}`);
            return true;

        } catch (err) {
            SWSELogger.error('[TalentTreeDB] Failed to build:', err);
            emitTalentTreeBuildAudit(audit);
            return false;
        }
    },

    /**
     * Load generated/fixed talent-tree membership hints without instantiating documents.
     * The compendium tree index may contain stale or partial talentIds, while the
     * generated registry is the audited membership source used by the graph resolver.
     *
     * @returns {Promise<Map<string,Object>>}
     * @private
     */
    async _loadTalentTreeMembershipRegistry() {
        const registry = new Map();
        const paths = [
            '/systems/foundryvtt-swse/data/generated/talent-trees.registry.json',
            '/systems/foundryvtt-swse/data/fixes/talent-trees.registry.json',
        ];

        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (!response?.ok) {continue;}
                const data = await response.json();
                if (!Array.isArray(data)) {continue;}

                for (const entry of data) {
                    const displayName = entry.displayName || entry.name || entry.id;
                    const keys = [entry.id, displayName, toStableKey(displayName), normalizeTalentTreeId(displayName)]
                        .map(key => String(key || '').trim())
                        .filter(Boolean);
                    for (const key of keys) {
                        registry.set(key, entry);
                    }
                }

                if (registry.size) {
                    SWSELogger.debug(`[TalentTreeDB] Loaded ${registry.size} talent-tree membership hints from ${path}`);
                    break;
                }
            } catch (err) {
                SWSELogger.warn(`[TalentTreeDB] Failed to load talent-tree membership hints from ${path}:`, err);
            }
        }

        return registry;
    },

    /**
     * Add audited membership hints to normalized trees. Keep legacy talentIds intact
     * for ID-based consumers, but expose talentNames/talentCount for UI and graph
     * membership resolution when compendium IDs are stale or incomplete.
     *
     * @private
     */
    _applyMembershipRegistryHints(tree, registry) {
        if (!tree || !registry?.size) {return tree;}

        const keys = [tree.id, tree.name, toStableKey(tree.name), normalizeTalentTreeId(tree.name), tree.sourceId]
            .map(key => String(key || '').trim())
            .filter(Boolean);
        const entry = keys.map(key => registry.get(key)).find(Boolean);
        if (!entry || !Array.isArray(entry.talents)) {return tree;}

        tree.talentNames = entry.talents.map(name => String(name || '').trim()).filter(Boolean);
        tree.talentCount = Number(entry.talentCount || tree.talentNames.length || tree.talentIds?.length || 0);

        return tree;
    },

    /**
     * Get a talent tree by ID (normalized).
     * This is the PRIMARY way to access talent tree data.
     * Supports legacy _id resolution for backwards compatibility.
     *
     * @param {string} treeId - Normalized tree ID or legacy _id
     * @returns {Object|null} - Normalized tree or null
     */
    get(treeId) {
        if (!treeId) {return null;}

        // Ensure ID is normalized
        const normalizedId = normalizeTalentTreeId(treeId);

        // Try normalized trees first
        if (this.trees.has(normalizedId)) {
            return this.trees.get(normalizedId);
        }

        // Check legacy alias map
        if (this._legacyIdMap.has(treeId)) {
            return this._legacyIdMap.get(treeId);
        }

        // Try sourceId lookup (legacy _id resolution)
        for (const tree of this.trees.values()) {
            if (tree.sourceId === treeId) {
                // Cache for future lookups
                this._legacyIdMap.set(treeId, tree);
                return tree;
            }
        }

        return null;
    },

    /**
     * Get a talent tree by stable key (Phase 6).
     * New primary lookup method for stable identity.
     *
     * @param {string} key - Stable key
     * @returns {Object|null} - Normalized tree or null
     */
    byKey(key) {
        if (!key) {return null;}
        return this._byKey.get(key) ?? null;
    },

    /**
     * Get a talent tree by ID (compatibility API).
     * Direct O(1) lookup for normalized tree IDs.
     *
     * @param {string} id - Tree ID
     * @returns {Object|null} - Normalized tree or null
     */
    byId(id) {
        if (!id) {return null;}
        // Direct ID lookup
        if (this._byId?.has(id)) {
            return this._byId.get(id);
        }
        // Legacy alias fallback
        if (this._legacyIdMap?.has(id)) {
            return this._legacyIdMap.get(id);
        }
        return null;
    },

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
    byAccessTag(tag) {
        if (!tag) {return [];}
        return this.all().filter(tree => (tree.tags || []).includes(tag));
    },

    /**
     * Build inverse index from talent ID to tree ID.
     */
    buildTalentIndex() {
        this.talentToTree.clear();
        const addTalentKey = (key, treeId) => {
            const raw = String(key || '').trim();
            if (!raw || !treeId) {return;}

            const aliases = [raw, raw.toLowerCase(), toStableKey(raw)]
                .map(alias => String(alias || '').trim())
                .filter(Boolean);

            for (const alias of aliases) {
                if (!this.talentToTree.has(alias)) {
                    this.talentToTree.set(alias, treeId);
                }
            }
        };

        for (const tree of this.trees.values()) {
            for (const talentId of tree.talentIds || []) {
                addTalentKey(talentId, tree.id);
            }
            for (const talentName of tree.talentNames || []) {
                addTalentKey(talentName, tree.id);
            }
        }
    },

    /**
     * Resolve tree ID for a talent ID.
     *
     * @param {string} talentId
     * @returns {string|null}
     */
    getTreeIdForTalent(talentId) {
        const raw = String(talentId || '').trim();
        if (!raw) {return null;}
        return this.talentToTree.get(raw)
            || this.talentToTree.get(raw.toLowerCase())
            || this.talentToTree.get(toStableKey(raw))
            || null;
    },

    /**
     * Compatibility alias for older startup/audit paths.
     * Returns the owning tree ID, not the tree object.
     *
     * @param {string} talentIdOrName
     * @returns {string|null}
     */
    getTreeForTalent(talentIdOrName) {
        return this.getTreeIdForTalent(talentIdOrName);
    },

    /**
     * Build backwards compatibility aliases for legacy ids and source ids.
     *
     * @private
     */
    _buildLegacyIdMap() {
        this._legacyIdMap.clear();
        for (const tree of this.trees.values()) {
            if (tree.sourceId) {this._legacyIdMap.set(tree.sourceId, tree);}
            if (tree.id) {this._legacyIdMap.set(tree.id, tree);}
            if (tree.name) {this._legacyIdMap.set(tree.name, tree);}
        }
    },

    /**
     * Get count of loaded trees.
     *
     * @returns {number}
     */
    count() {
        return this.trees.size;
    },

    /**
     * Validate that TalentTreeDB is ready for use.
     */
    ensureBuilt() {
        if (!this.isBuilt) {
            throw new Error('[TalentTreeDB] Database not built. Call TalentTreeDB.build() first.');
        }
    }
};