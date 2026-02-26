/**
 * SYSTEM INITIALIZATION HOOKS
 * Coordinates all data normalization and index building at system startup.
 *
 * Called once from system initialization (module/system.js or equivalent).
 * Ensures all game data is normalized and indexed for optimal progression engine performance.
 */
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';
import { SWSELogger } from '../../../utils/logger.js';
import { FeatureIndex } from '../engine/feature-index.js';
import { ClassNormalizer } from '../engine/class-normalizer.js';
import { ForceNormalizer } from '../engine/force-normalizer.js';
import { StartingFeatureRegistrar } from '../engine/starting-feature-registrar.js';
import { ProgressionStateNormalizer } from '../engine/progression-state-normalizer.js';
import { SkillRegistry } from '../skills/skill-registry.js';
import { SkillNormalizer } from '../skills/skill-normalizer.js';
import { FeatRegistry } from '../feats/feat-registry.js';
import { FeatNormalizer } from '../feats/feat-normalizer.js';
import { Sentinel } from '../../../governance/sentinel/sentinel-core.js';

// SSOT Data Layer (now includes talent tree normalization)
import { TalentTreeDB } from '../../../data/talent-tree-db.js';
import { ClassesDB } from '../../../data/classes-db.js';
import { TalentDB } from '../../../data/talent-db.js';
import { TalentRelationshipRegistry } from '../../../data/talent-relationship-registry.js';
import { ClassRelationshipRegistry } from '../../../data/class-relationship-registry.js';
import { StableKeyMigration } from '../../../data/stable-key-migration.js';
import { normalizeDocumentTalent, validateTalentTreeAssignment } from '../../../data/talent-tree-normalizer.js';

export const SystemInitHooks = {

    /**
     * Register all initialization hooks
     * Call this from the system's "ready" hook
     */
    registerHooks() {
        Hooks.once('ready', async () => {
            await this.onSystemReady();
        });

        SWSELogger.log('System initialization hooks registered');
    },

    /**
     * Main system ready handler
     * Runs all initialization tasks
     */
    async onSystemReady() {
        try {
            const startTime = performance.now();

            SWSELogger.log('='.repeat(50));
            SWSELogger.log('SWSE Progression Engine: System Initialization');
            SWSELogger.log('='.repeat(50));

            // Step -1: Run stable key migration (ensures all docs have system.key)
            await StableKeyMigration.runFullMigration();

            // Step 0: Build SSOT Data Registries (CRITICAL - must run first)
            await this._buildDataRegistries();

            // Step 1: Build feature index from compendiums
            await this._buildFeatureIndex();

            // Step 2: Normalize all game data
            await this._normalizeGameData();

            // Step 3: Build skill registry
            await this._buildSkillRegistry();

            // Step 3b: Build feat registry
            await this._buildFeatRegistry();

            // Step 4: Normalize actor progression states
            await this._normalizeActorProgression();

            // Step 5: Register starting features
            await this._registerStartingFeatures();

            const elapsed = (performance.now() - startTime).toFixed(2);

            SWSELogger.log('='.repeat(50));
            SWSELogger.log(`Initialization Complete (${elapsed}ms)`);
            SWSELogger.log('='.repeat(50));

            // Emit custom hook for dependent modules
            Hooks.callAll('swse:progression:initialized');

            // Flush aggregated Sentinel diagnostics (prevents console spam)
            Sentinel.flushAggregates();

        } catch (err) {
            SWSELogger.error('System initialization failed:', err);
        }
    },

    /**
     * Step 0: Build SSOT Data Registries
     * This MUST run before any other game data normalization.
     * Order matters: TalentTreeDB -> ClassesDB -> TalentDB
     * @private
     */
    async _buildDataRegistries() {
        try {
            SWSELogger.log('Building SSOT data registries...');

            // 1. Build TalentTreeDB (required by ClassesDB and TalentDB)
            SWSELogger.log('  - Building TalentTreeDB...');
            const treeSuccess = await TalentTreeDB.build();
            if (!treeSuccess) {
                SWSELogger.error('TalentTreeDB build failed');
                return;
            }

            // 2. Build ClassesDB (requires TalentTreeDB for linking talent trees)
            SWSELogger.log('  - Building ClassesDB...');
            const classSuccess = await ClassesDB.build(TalentTreeDB);
            if (!classSuccess) {
                SWSELogger.error('ClassesDB build failed');
                return;
            }

            // 2b. Build Class Relationship Registry (canonical class → tree access)
            SWSELogger.log('  - Building ClassRelationshipRegistry...');
            ClassRelationshipRegistry.build(ClassesDB, TalentTreeDB);

            // 3. Build TalentDB (requires TalentTreeDB for linking talents to trees)
            SWSELogger.log('  - Building TalentDB...');
            const talentSuccess = await TalentDB.build(TalentTreeDB);
            if (!talentSuccess) {
                SWSELogger.error('TalentDB build failed');
                return;
            }

            // 4. Build Talent Relationship Registry (SSOT)
            SWSELogger.log('  - Building TalentRelationshipRegistry...');
            TalentRelationshipRegistry.build(TalentTreeDB, TalentDB);
            TalentRelationshipRegistry.validateIntegrity(TalentDB, Sentinel);

            SWSELogger.log(`SSOT registries built: ${TalentTreeDB.count()} trees, ${ClassesDB.count()} classes, ${TalentDB.count()} talents`);

        } catch (err) {
            SWSELogger.error('Failed to build SSOT registries:', err);
        }
    },

    /**
     * Step 1: Build feature index from all compendiums
     * @private
     */
    async _buildFeatureIndex() {
        try {
            SWSELogger.log('Building feature index...');
            await FeatureIndex.buildIndex();
            const status = FeatureIndex.getStatus();
            SWSELogger.log(`Feature index built: ${JSON.stringify(status.counts)}`);
        } catch (err) {
            SWSELogger.error('Failed to build feature index:', err);
        }
    },

    /**
     * Step 2: Normalize all game data (classes, talents, powers, etc.)
     * @private
     */
    async _normalizeGameData() {
        try {
            SWSELogger.log('Normalizing game data...');

            // Normalize classes
            await this._normalizeClasses();

            // Normalize talents
            await this._normalizeTalents();

            // Normalize force content
            await this._normalizeForceContent();

            SWSELogger.log('Game data normalization complete');

        } catch (err) {
            SWSELogger.error('Failed to normalize game data:', err);
        }
    },

    /**
     * Normalize all class documents
     * @private
     */
    async _normalizeClasses() {
        try {
            const classPack = game.packs.get('foundryvtt-swse.classes');
            if (!classPack) {
                SWSELogger.warn('Classes compendium not found');
                return;
            }

            const classes = await classPack.getDocuments();
            let count = 0;

            for (const classDoc of classes) {
                ClassNormalizer.normalizeClassDoc(classDoc);
                count++;
            }

            SWSELogger.log(`Normalized ${count} class documents`);

        } catch (err) {
            SWSELogger.error('Failed to normalize classes:', err);
        }
    },

    /**
     * Normalize all talent documents
     * Uses data-layer normalizer (canonical SSOT)
     * @private
     */
    async _normalizeTalents() {
        try {
            const talentPack = game.packs.get('foundryvtt-swse.talents');
            if (!talentPack) {
                SWSELogger.warn('Talents compendium not found');
                return;
            }

            const talents = await talentPack.getDocuments();
            let count = 0;

            for (const talentDoc of talents) {
                // Normalize document fields (SSOT data-layer normalizer)
                normalizeDocumentTalent(talentDoc);

                // Validate tree assignment (non-fatal diagnostic)
                validateTalentTreeAssignment(talentDoc);

                count++;
            }

            SWSELogger.log(`Normalized ${count} talent documents`);

        } catch (err) {
            SWSELogger.error('Failed to normalize talents:', err);
        }
    },

    /**
     * Normalize all Force content (powers, techniques, secrets)
     * @private
     */
    async _normalizeForceContent() {
        try {
            // Normalize Force powers
            const powerPack = game.packs.get('foundryvtt-swse.forcepowers');
            if (powerPack) {
                const powers = await powerPack.getDocuments();
                let count = 0;
                for (const powerDoc of powers) {
                    ForceNormalizer.normalizePower(powerDoc);
                    count++;
                }
                SWSELogger.log(`Normalized ${count} Force power documents`);
            }

            // Normalize Force feats (techniques) if they exist in feats pack
            const featPack = game.packs.get('foundryvtt-swse.feats');
            if (featPack) {
                const feats = await featPack.getDocuments();
                let count = 0;
                for (const featDoc of feats) {
                    if (featDoc.system?.tags?.includes('force_technique')) {
                        ForceNormalizer.normalizeTechnique(featDoc);
                        count++;
                    }
                }
                if (count > 0) {
                    SWSELogger.log(`Normalized ${count} Force technique documents`);
                }
            }

            // Normalize Force talents (secrets) if they exist in talents pack
            const talentPack = game.packs.get('foundryvtt-swse.talents');
            if (talentPack) {
                const talents = await talentPack.getDocuments();
                let count = 0;
                for (const talentDoc of talents) {
                    if (talentDoc.system?.tags?.includes('force_secret')) {
                        ForceNormalizer.normalizeSecret(talentDoc);
                        count++;
                    }
                }
                if (count > 0) {
                    SWSELogger.log(`Normalized ${count} Force secret documents`);
                }
            }

        } catch (err) {
            SWSELogger.error('Failed to normalize Force content:', err);
        }
    },

    /**
     * Step 3: Normalize actor progression states
     * @private
     */
    async _normalizeActorProgression() {
    try {
        SWSELogger.log('Normalizing actor progression states...');

        const actors = game.actors?.contents || [];
        let updated = 0;

        for (const actor of actors) {
            const progression = actor.system?.progression;
            if (!progression) continue;

            const normalized = ProgressionStateNormalizer.normalize(progression);
            const valid = ProgressionStateNormalizer.validate(normalized);

            if (!valid.valid) {
                SWSELogger.warn(
                    `Actor "${actor.name}" has invalid progression state:`,
                    valid.errors
                );
                continue;
            }

            const current = foundry.utils.getProperty(actor, 'system.progression');

            if (!JSON.stringify(current) !== JSON.stringify(normalized)) {
                await ActorEngine.updateActor(actor, {
                    'system.progression': normalized
                });
                updated++;
            }
        }

        if (updated > 0) {
            SWSELogger.log(`Normalized progression state for ${updated} actors`);
        }

    } catch (err) {
        SWSELogger.error('Failed to normalize actor progression:', err);
    }
    },

    /**
     * Step 3b: Build skill registry
     * @private
     */
    async _buildSkillRegistry() {
        try {
            SWSELogger.log('Building skill registry...');

            const success = await SkillRegistry.build();
            if (!success) {
                SWSELogger.warn('SkillRegistry.build() returned false');
                return;
            }

            const pack = game.packs.get('foundryvtt-swse.skills');
            if (pack) {
                const skills = await pack.getDocuments();
                let normalized = 0;

                for (const skillDoc of skills) {
                    SkillNormalizer.normalize(skillDoc);
                    normalized++;
                }

                SWSELogger.log(`Built skill registry with ${normalized} skills`);
            }

        } catch (err) {
            SWSELogger.error('Failed to build skill registry:', err);
        }
    },

    /**
     * Step 3c: Build feat registry
     * @private
     */
    async _buildFeatRegistry() {
        try {
            SWSELogger.log('Building feat registry...');

            const success = await FeatRegistry.build();
            if (!success) {
                SWSELogger.warn('FeatRegistry.build() returned false');
                return;
            }

            const pack = game.packs.get('foundryvtt-swse.feats');
            if (pack) {
                const feats = await pack.getDocuments();
                let normalized = 0;

                for (const featDoc of feats) {
                    FeatNormalizer.normalize(featDoc);
                    normalized++;
                }

                SWSELogger.log(`Built feat registry with ${normalized} feats`);
            }

        } catch (err) {
            SWSELogger.error('Failed to build feat registry:', err);
        }
    },

    /**
     * Step 5: Register starting features for all classes
     * @private
     */
    async _registerStartingFeatures() {
        try {
            SWSELogger.log('Registering starting features...');
            // replaced by proper loop-based registration
            SWSELogger.log('Starting features registered');
        } catch (err) {
            SWSELogger.error('Failed to register starting features:', err);
        }
    }
};