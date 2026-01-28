/**
 * SYSTEM INITIALIZATION HOOKS
 *
 * Single authoritative startup coordinator for:
 * - SSOT registry construction
 * - Compendium indexing
 * - Data normalization
 * - Progression engine readiness
 *
 * This file is intentionally procedural and phase-driven.
 */

import { SWSELogger } from '../../utils/logger.js';

// Engine / Normalizers
import { FeatureIndex } from '../engine/feature-index.js';
import { ClassNormalizer } from '../engine/class-normalizer.js';
import { TalentTreeNormalizer } from '../engine/talent-tree-normalizer.js';
import { ForceNormalizer } from '../engine/force-normalizer.js';
import { StartingFeatureRegistrar } from '../engine/starting-feature-registrar.js';
import { ProgressionStateNormalizer } from '../engine/progression-state-normalizer.js';

// Registries
import { SkillRegistry } from '../skills/skill-registry.js';
import { SkillNormalizer } from '../skills/skill-normalizer.js';
import { FeatRegistry } from '../feats/feat-registry.js';
import { FeatNormalizer } from '../feats/feat-normalizer.js';

// SSOT OWNERS
import TalentTreeDB from '../../data/talent-tree-db.js';
import ClassesDB from '../../data/classes-db.js';
import TalentDB from '../../data/talent-db.js';

export const SystemInitHooks = {

    /* -------------------------------------------- */
    /* Hook Registration                            */
    /* -------------------------------------------- */

    registerHooks() {
        // Always call the PUBLIC entry point
        Hooks.once('ready', () => this.onSystemReady());
        SWSELogger.log('System initialization hooks registered');
    },

    /* -------------------------------------------- */
    /* Public Entry Point (Stable API)              */
    /* -------------------------------------------- */

    /**
     * This method is the ONLY supported external entry point.
     * index.js, tests, recovery code, and hooks may call this.
     */
    async onSystemReady() {
        return this._runInitialization();
    },

    /* -------------------------------------------- */
    /* Internal Orchestrator                        */
    /* -------------------------------------------- */

    async _runInitialization() {
        const start = performance.now();

        SWSELogger.log('='.repeat(60));
        SWSELogger.log('SWSE SYSTEM INITIALIZATION — START');
        SWSELogger.log('='.repeat(60));

        try {
            // Phase 0 — SSOT (hard gate)
            const ssotReady = await this._buildSSOT();
            if (!ssotReady) {
                SWSELogger.error('SSOT build failed — aborting initialization');
                return;
            }

            // Phase 1 — Feature Index
            await this._buildFeatureIndex();

            // Phase 2 — Compendium Normalization
            await this._normalizeCompendiums();

            // Phase 3 — Registries
            await this._buildSkillRegistry();
            await this._buildFeatRegistry();

            // Phase 4 — Actors
            await this._normalizeActorProgression();

            // Phase 5 — Derived / Class Features
            await this._registerStartingFeatures();

            const elapsed = (performance.now() - start).toFixed(2);

            SWSELogger.log('='.repeat(60));
            SWSELogger.log(`SYSTEM INITIALIZATION COMPLETE (${elapsed}ms)`);
            SWSELogger.log('='.repeat(60));

            Hooks.callAll('swse:progression:initialized');

        } catch (err) {
            SWSELogger.error('Fatal error during system initialization:', err);
        }
    },

    /* -------------------------------------------- */
    /* Phase 0 — SSOT                               */
    /* -------------------------------------------- */

    async _buildSSOT() {
        SWSELogger.log('[INIT:SSOT] Building Single Source of Truth registries');

        try {
            // 0a — Talent Trees (root owner)
            SWSELogger.log('  → TalentTreeDB');
            await TalentTreeDB.build();

            // 0b — Classes (consume trees)
            SWSELogger.log('  → ClassesDB');
            await ClassesDB.build(TalentTreeDB);

            // 0c — Talents (consume trees)
            SWSELogger.log('  → TalentDB');
            await TalentDB.build(TalentTreeDB);

            // Expose for legacy / migrations / UI (read-only intent)
            globalThis.SWSE = globalThis.SWSE || {};
            globalThis.SWSE.TalentTreeDB = TalentTreeDB;
            globalThis.SWSE.TalentDB = TalentDB;
            globalThis.SWSE.ClassesDB = ClassesDB;

            SWSELogger.log(
                `[INIT:SSOT] Ready — ${TalentTreeDB.count()} trees, ${ClassesDB.count()} classes, ${TalentDB.count()} talents`
            );

            return true;

        } catch (err) {
            SWSELogger.error('[INIT:SSOT] Failed', err);
            return false;
        }
    },

    /* -------------------------------------------- */
    /* Phase 1 — Feature Index                      */
    /* -------------------------------------------- */

    async _buildFeatureIndex() {
        SWSELogger.log('[INIT:INDEX] Building FeatureIndex');
        await FeatureIndex.buildIndex();
        SWSELogger.log('[INIT:INDEX] Complete', FeatureIndex.getStatus()?.counts);
    },

    /* -------------------------------------------- */
    /* Phase 2 — Normalization                      */
    /* -------------------------------------------- */

    async _normalizeCompendiums() {
        SWSELogger.log('[INIT:NORMALIZE] Starting compendium normalization');

        await this._normalizeClasses();
        await this._normalizeTalents();
        await this._normalizeForceContent();

        SWSELogger.log('[INIT:NORMALIZE] Complete');
    },

    async _normalizeClasses() {
        const pack = game.packs.get('foundryvtt-swse.classes');
        if (!pack) return;

        let count = 0;
        for (const doc of await pack.getDocuments()) {
            ClassNormalizer.normalizeClassDoc(doc);
            count++;
        }

        SWSELogger.log(`[INIT:NORMALIZE] Classes: ${count}`);
    },

    async _normalizeTalents() {
        const pack = game.packs.get('foundryvtt-swse.talents');
        if (!pack) return;

        let count = 0;
        for (const doc of await pack.getDocuments()) {
            TalentTreeNormalizer.normalize(doc);

            if (!TalentTreeNormalizer.checkTalentAgainstTree(doc)) {
                SWSELogger.warn(`Talent "${doc.name}" has invalid tree assignment`);
            }

            count++;
        }

        SWSELogger.log(`[INIT:NORMALIZE] Talents: ${count}`);
    },

    async _normalizeForceContent() {
        const powerPack = game.packs.get('foundryvtt-swse.forcepowers');
        if (powerPack) {
            for (const doc of await powerPack.getDocuments()) {
                ForceNormalizer.normalizePower(doc);
            }
        }

        const featPack = game.packs.get('foundryvtt-swse.feats');
        if (featPack) {
            for (const doc of await featPack.getDocuments()) {
                if (doc.system?.tags?.includes('force_technique')) {
                    ForceNormalizer.normalizeTechnique(doc);
                }
            }
        }

        const talentPack = game.packs.get('foundryvtt-swse.talents');
        if (talentPack) {
            for (const doc of await talentPack.getDocuments()) {
                if (doc.system?.tags?.includes('force_secret')) {
                    ForceNormalizer.normalizeSecret(doc);
                }
            }
        }
    },

    /* -------------------------------------------- */
    /* Phase 3 — Registries                         */
    /* -------------------------------------------- */

    async _buildSkillRegistry() {
        SWSELogger.log('[INIT:REGISTRY] SkillRegistry');
        await SkillRegistry.build();

        const pack = game.packs.get('foundryvtt-swse.skills');
        if (!pack) return;

        for (const doc of await pack.getDocuments()) {
            SkillNormalizer.normalize(doc);
        }
    },

    async _buildFeatRegistry() {
        SWSELogger.log('[INIT:REGISTRY] FeatRegistry');
        await FeatRegistry.build();

        const pack = game.packs.get('foundryvtt-swse.feats');
        if (!pack) return;

        for (const doc of await pack.getDocuments()) {
            FeatNormalizer.normalize(doc);
        }
    },

    /* -------------------------------------------- */
    /* Phase 4 — Actors                             */
    /* -------------------------------------------- */

    async _normalizeActorProgression() {
        SWSELogger.log('[INIT:ACTORS] Progression normalization');

        for (const actor of game.actors?.contents || []) {
            const prog = actor.system?.progression;
            if (!prog) continue;

            const normalized = ProgressionStateNormalizer.normalize(prog);
            const result = ProgressionStateNormalizer.validate(normalized);

            if (!result.valid) {
                SWSELogger.warn(
                    `Actor "${actor.name}" has invalid progression`,
                    result.errors
                );
                continue;
            }

            await actor.update({ 'system.progression': normalized });
        }
    },

    /* -------------------------------------------- */
    /* Phase 5 — Derived Features                   */
    /* -------------------------------------------- */

    async _registerStartingFeatures() {
        SWSELogger.log('[INIT:FEATURES] Registering starting features');

        const pack = game.packs.get('foundryvtt-swse.classes');
        if (!pack) return;

        for (const doc of await pack.getDocuments()) {
            StartingFeatureRegistrar.register(doc);
        }
    },

    /* -------------------------------------------- */
    /* Manual Trigger                               */
    /* -------------------------------------------- */

    async initialize() {
        return this.onSystemReady();
    }
};

export default SystemInitHooks;
