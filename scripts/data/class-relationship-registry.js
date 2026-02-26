// ============================================
// FILE: scripts/data/class-relationship-registry.js
// Authoritative Class ↔ Tree Access Layer
// ============================================
//
// Single Source of Truth for class → tree access.
// Three layers: canonical + house rules + GM overrides
// No inference. No mutation. Deterministic.
//
// ============================================

export const ClassRelationshipRegistry = {

    classToTrees: new Map(),
    treeToClasses: new Map(),
    isBuilt: false,

    build(ClassesDB, TalentTreeDB) {
        this.classToTrees.clear();
        this.treeToClasses.clear();

        // Canonical mapping from ClassesDB
        for (const cls of ClassesDB.classes.values()) {
            const treeIds = cls.talentTreeIds || [];
            this.classToTrees.set(cls.id, [...treeIds]);

            for (const treeId of treeIds) {
                if (!this.treeToClasses.has(treeId)) {
                    this.treeToClasses.set(treeId, []);
                }
                this.treeToClasses.get(treeId).push(cls.id);
            }
        }

        this.isBuilt = true;
    },

    /**
     * Get canonical trees for a class (from compendium).
     */
    getCanonicalTrees(classId) {
        return this.classToTrees.get(classId) || [];
    },

    /**
     * Get effective trees for a class (canonical + rules + overrides).
     */
    getEffectiveTrees(classId) {
        const canonical = new Set(this.getCanonicalTrees(classId));

        // Layer 1: Automatic Dark Side prestige rule
        if (game.settings.get("foundryvtt-swse", "enableDarkSideTreeAccess")) {
            if (classId === "sith_apprentice" || classId === "sith_lord") {
                canonical.add("lightsaber_combat");
                canonical.add("lightsaber_forms");
            }
        }

        // Layer 2: GM overrides
        const overrides = game.settings.get("foundryvtt-swse", "classTreeOverrides") || {};
        const extra = overrides[classId] || [];

        for (const treeId of extra) {
            canonical.add(treeId);
        }

        return Array.from(canonical);
    }
};
