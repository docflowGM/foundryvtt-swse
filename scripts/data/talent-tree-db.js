// ============================================
// FILE: scripts/data/talent-tree-db.js
// Talent Tree Database (SSOT OWNER)
// ============================================
//
// Contract:
// - TalentTreeDB is the SINGLE source of truth for talent ownership
// - TalentTreeDB NEVER imports TalentDB
// - TalentTreeDB builds FIRST
// - TalentTreeDB assigns talentId → treeId
// - TalentTreeDB stores SNAPSHOTS, never live Documents
// ============================================

import { SWSELogger } from '../utils/logger.js';

const TalentTreeDB = {

    // -----------------------------
    // Internal State (SNAPSHOTS)
    // -----------------------------
    _trees: new Map(),        // treeId -> { id, name, talentIds[] }
    _talentToTree: new Map(), // talentId -> treeId
    _isBuilt: false,

    // -----------------------------
    // Build Lifecycle
    // -----------------------------
    async build() {

        if (this._isBuilt === true) {
            SWSELogger.warn('[TalentTreeDB] build() called more than once — skipping');
            return true;
        }

        this._trees.clear();
        this._talentToTree.clear();

        const pack = game.packs.get('foundryvtt-swse.talent_trees');
        if (!pack) {
            throw new Error('[TalentTreeDB] Talent Trees compendium not found');
        }

        const docs = await pack.getDocuments();
        let loaded = 0;

        for (const treeDoc of docs) {
            const treeId = treeDoc.id;

            // 🔒 SNAPSHOT ONLY — NEVER STORE LIVE DOCUMENTS
            const treeData = {
                id: treeId,
                name: treeDoc.name,
                talentIds: Array.from(treeDoc.system?.talentIds ?? [])
            };

            this._trees.set(treeId, treeData);

            for (const talentId of treeData.talentIds) {
                if (!talentId) continue;

                if (this._talentToTree.has(talentId)) {
                    SWSELogger.warn(
                        `[TalentTreeDB] Talent ${talentId} claimed by multiple trees`
                    );
                }

                this._talentToTree.set(talentId, treeId);
            }

            loaded++;
        }

        this._isBuilt = true;

        SWSELogger.log(
            `[TalentTreeDB] Build complete: ${loaded} trees, ${this._talentToTree.size} talent links`
        );

        return true;
    },

    // -----------------------------
    // Query API (READ ONLY)
    // -----------------------------
    getTreeForTalent(talentId) {
        this._ensureBuilt();
        return this._talentToTree.get(talentId) ?? null;
    },

    get(treeId) {
        this._ensureBuilt();
        return this._trees.get(treeId) ?? null;
    },

    all() {
        this._ensureBuilt();
        return Array.from(this._trees.values());
    },

    count() {
        this._ensureBuilt();
        return this._trees.size;
    },

    // -----------------------------
    // Safety
    // -----------------------------
    _ensureBuilt() {
        if (this._isBuilt !== true) {
            throw new Error('[TalentTreeDB] Database not built');
        }
    },

    get isBuilt() {
        return this._isBuilt === true;
    }
};

export default TalentTreeDB;
