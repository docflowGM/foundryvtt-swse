// ============================================
// FILE: scripts/data/talent-relationship-registry.js
// Authoritative Talent ↔ Tree Relationship Layer
// ============================================
//
// Single Source of Truth for tree ownership.
// No inference. No mutation. Deterministic.
//
// ============================================

import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";
import { normalizeTalentTreeId } from "/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js";

export const TalentRelationshipRegistry = {

    talentToTree: new Map(),
    treeToTalents: new Map(),
    isBuilt: false,

    build(TalentTreeDB, TalentDB) {
        this.talentToTree.clear();
        this.treeToTalents.clear();

        for (const tree of TalentTreeDB.trees.values()) {
            const talentIds = [...(tree.talentIds || []), ...(tree.talentNames || [])];

            for (const talentId of talentIds) {
                const raw = String(talentId || '').trim();
                if (!raw) continue;
                for (const key of [raw, toStableKey(raw), normalizeTalentTreeId(raw)].filter(Boolean)) {
                    this.talentToTree.set(key, tree.id);
                }

                if (!this.treeToTalents.has(tree.id)) {
                    this.treeToTalents.set(tree.id, []);
                }

                this.treeToTalents.get(tree.id).push(raw);
            }
        }

        this.isBuilt = true;
    },

    getTreeForTalent(talentId) {
        const raw = String(talentId || '').trim();
        if (!raw) return null;
        return this.talentToTree.get(raw)
            || this.talentToTree.get(toStableKey(raw))
            || this.talentToTree.get(normalizeTalentTreeId(raw))
            || null;
    },

    getTalentsForTree(treeId) {
        return this.treeToTalents.get(treeId) || [];
    },

    validateIntegrity(TalentDB, Sentinel) {
        const orphaned = [];

        for (const talent of TalentDB.talents) {
            const id = talent.id;
            if (!this.getTreeForTalent(id) && !this.getTreeForTalent(talent.name)) {
                orphaned.push(talent.name);
            }
        }

        if (orphaned.length > 0) {
            Sentinel.report(
                'data',
                Sentinel.SEVERITY.ERROR,
                'Talent missing tree assignment',
                { count: orphaned.length, samples: orphaned.slice(0, 5) }
            );
        }
    }
};
