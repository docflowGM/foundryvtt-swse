// ============================================
// FILE: scripts/data/talent-db.js
// Talent Database (SSOT Registry)
// ============================================

import { normalizeTalent, validateTalent } from './talent-normalizer.js';
import { SWSELogger } from '../utils/logger.js';

export const TalentDB = {

    // ----------------------------
    // Internal State
    // ----------------------------
    talents: [],
    talentsById: new Map(),
    talentsByTree: new Map(),
    isBuilt: false,

    // ----------------------------
    // Build Registry
    // ----------------------------
    async build(talentTreeDB = null) {
        if (this.isBuilt) {
            SWSELogger.warn('[TalentDB] build() called more than once');
            return true;
        }

        const pack = game.packs.get('foundryvtt-swse.talents');
        if (!pack) {
            throw new Error('[TalentDB] Talents compendium not found');
        }

        const docs = await pack.getDocuments();

        // Reset state (build is authoritative)
        this.talents = [];
        this.talentsById = new Map();
        this.talentsByTree = new Map();
        let loaded = 0;
        let rejected = 0;

        for (const rawTalent of docs) {
            try {
                const talent = normalizeTalent(rawTalent, talentTreeDB);

                // HARD VALIDATION (fail-loud but non-fatal)
                if (!validateTalent(talent)) {
                    rejected++;
                    continue;
                }

                // Enforce invariants explicitly
                if (!talent.id) {
                    throw new Error(`[TalentDB] Normalized talent "${talent.name}" has no id`);
                }

                if (!talent.treeId) {
                    throw new Error(
                        `[TalentDB] Normalized talent "${talent.name}" (${talent.id}) has no treeId`
                    );
                }

                // Store
                this.talents.push(talent);
                this.talentsById.set(talent.id, talent);

                if (!this.talentsByTree.has(talent.treeId)) {
                    this.talentsByTree.set(talent.treeId, []);
                }
                this.talentsByTree.get(talent.treeId).push(talent);

                loaded++;

            } catch (err) {
                rejected++;
                SWSELogger.error(
                    `[TalentDB] Failed to register talent "${rawTalent?.name ?? 'UNKNOWN'}"`,
                    err
                );
            }
        }

        this.isBuilt = true;

        SWSELogger.log(
            `[TalentDB] Build complete: ${loaded} loaded, ${rejected} rejected`
        );

        return true;
    },

    // ----------------------------
    // Queries (READ ONLY)
    // ----------------------------
    byTree(treeId) {
        if (!this.isBuilt) {
            throw new Error('[TalentDB] byTree() called before build()');
        }
        return this.talentsByTree.get(treeId) || [];
    },

    get(talentId) {
        if (!this.isBuilt) {
            throw new Error('[TalentDB] get() called before build()');
        }
        return this.talentsById.get(talentId) ?? null;
    },

    all() {
        if (!this.isBuilt) {
            throw new Error('[TalentDB] all() called before build()');
        }
        return this.talents;
    },

    count() {
    if (!this.isBuilt) {
        throw new Error('[TalentDB] count() called before build()');
    }
    return this.talents.length;
},

    // ----------------------------
    // Safety
    // ----------------------------
    ensureBuilt() {
        if (!this.isBuilt) {
            throw new Error('[TalentDB] Database not built');
        }
    }
};

export default TalentDB;
