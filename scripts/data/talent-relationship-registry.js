// ============================================
// FILE: scripts/data/talent-relationship-registry.js
// Authoritative Talent ↔ Tree Relationship Layer
// ============================================
//
// Single Source of Truth for tree ownership.
// No inference. No mutation. Deterministic.
//
// ============================================

export const TalentRelationshipRegistry = {

    talentToTree: new Map(),
    treeToTalents: new Map(),
    isBuilt: false,

    build(TalentTreeDB, TalentDB) {
        this.talentToTree.clear();
        this.treeToTalents.clear();

        for (const tree of TalentTreeDB.trees.values()) {
            const talentIds = tree.talentIds || [];

            for (const talentId of talentIds) {
                this.talentToTree.set(talentId, tree.id);

                if (!this.treeToTalents.has(tree.id)) {
                    this.treeToTalents.set(tree.id, []);
                }

                this.treeToTalents.get(tree.id).push(talentId);
            }
        }

        this.isBuilt = true;
    },

    getTreeForTalent(talentId) {
        return this.talentToTree.get(talentId) || null;
    },

    getTalentsForTree(treeId) {
        return this.treeToTalents.get(treeId) || [];
    },

    validateIntegrity(TalentDB, Sentinel) {
        const orphaned = [];

        for (const talent of TalentDB.talents) {
            const id = talent.id;
            if (!this.talentToTree.has(id)) {
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
