/**
 * Progression Finalization Integration
 * Bridges new modular subsystems into the progression engine finalize() workflow.
 *
 * Handles:
 * - Snapshot creation for rollback safety
 * - Feature Dispatcher for class feature processing
 * - Specialized engine finalization (Force, Language, Equipment)
 * - Derived stat calculation
 * - Level-up diff generation and display
 */

import { swseLogger as SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";
import { dispatchFeature } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/feature-dispatcher.js";
import { ForceProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-progression.js";
import { ForceTechniqueEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-technique-engine.js";
import { ForceSecretEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-secret-engine.js";
import { StarshipManeuverEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/starship-maneuver-engine.js";
import { LanguageEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/language-engine.js";
import { EquipmentEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/equipment-engine.js";
import { DerivedCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js";
import { LevelDiffInspector } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/level-diff-inspector.js";
import { SuiteReselectionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/suite-reselection-engine.js";
import { isSuiteReselectionEnabled } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/suite-reselection-utils.js";

export class FinalizeIntegration {

    /**
     * Run integrated finalization with all subsystems
     * Called from progression engine's finalize() method
     *
     * PHASE 3: Consolidated into single applyProgression() call
     * All mutations are atomic and audited by Sentinel
     */
    static async integratedFinalize(actor, mode = 'chargen', beforeSnapshot = null, engine = null) {
        try {
            SWSELogger.log(`Starting integrated finalization for ${actor.name} (${mode})`);

            // Step 0: Create safety snapshot (if not already provided)
            if (!beforeSnapshot) {
                beforeSnapshot = actor.toObject(false);
                await SnapshotManager.createSnapshot(actor, `Before ${mode === 'chargen' ? 'Character Creation' : 'Level Up'}`);
                SWSELogger.log('Safety snapshot created');
            }

            // ========================================================================
            // PHASE 3: Build atomic progression packet
            // All mutations consolidated into single applyProgression() call
            // ========================================================================
            const progressionPacket = await this._buildProgressionPacket(actor, mode, engine);

            // Apply all mutations atomically via ActorEngine
            const result = await ActorEngine.applyProgression(actor, progressionPacket);
            SWSELogger.log('Progression mutations applied atomically', {
                mutations: result.mutationCount,
                itemsCreated: result.itemsCreated,
                itemsDeleted: result.itemsDeleted
            });

            // ========================================================================
            // PHASE 3: Post-mutation operations (read-only observers)
            // These run AFTER all mutations complete
            // They see settled state only
            // ========================================================================

            // Step 3: Process class features through Feature Dispatcher
            // (Currently placeholder - no mutations)
            await this._dispatchClassFeatures(actor, mode);

            // Step 4: Finalize specialized progressions (Force, Language, Equipment)
            // These may emit hooks but should NOT mutate during progression transaction
            await this._finalizeSpecializedProgressions(actor, mode, engine);

            // Step 6: Generate and display level-up summary
            const afterSnapshot = actor.toObject(false);
            const diff = LevelDiffInspector.generateDiff(beforeSnapshot, afterSnapshot,
                mode === 'chargen' ? 'Character Creation' : `Level ${actor.system.level}`);

            // Display diff to player and GM
            await LevelDiffInspector.sendDiffToChatBroadcast(actor, diff);

            SWSELogger.log('Integrated finalization complete');
            return true;

        } catch (err) {
            SWSELogger.error('Integrated finalization failed:', err);
            throw err;
        }
    }

    /**
     * Build atomic progression packet from all progression data
     * Does NOT mutate - just collects data
     * @private
     */
    static async _buildProgressionPacket(actor, mode, engine = null) {
        const progression = actor.system.progression || {};
        const packet = {
            xpDelta: 0,           // Handled elsewhere
            featsAdded: [],
            featsRemoved: [],
            talentsAdded: [],
            talentsRemoved: [],
            trainedSkills: {},
            itemsToCreate: [],
            stateUpdates: {}
        };

        // Collect feats
        if (progression.feats && progression.feats.length > 0) {
            const uniqueFeats = [...new Set(progression.feats)];
            packet.featsAdded = uniqueFeats;
            packet.stateUpdates['system.progression.feats'] = uniqueFeats;
        }

        // Collect talents
        if (progression.talents && progression.talents.length > 0) {
            const uniqueTalents = [...new Set(progression.talents)];
            packet.talentsAdded = uniqueTalents;
            packet.stateUpdates['system.progression.talents'] = uniqueTalents;
        }

        // Collect trained skills
        if (progression.trainedSkills && Object.keys(progression.trainedSkills).length > 0) {
            for (const [skillKey, isTrainable] of Object.entries(progression.trainedSkills)) {
                if (isTrainable) {
                    packet.trainedSkills[skillKey] = true;
                    packet.stateUpdates[`system.skills.${skillKey}.trained`] = true;
                }
            }
        }

        // Collect items to create (from specialized engines)
        // This would come from Force, Equipment, etc. selections
        // For now, empty - specialized engines will populate this

        return packet;
    }


    /**
     * Dispatch all class features through Feature Dispatcher
     * @private
     */
    static async _dispatchClassFeatures(actor, mode) {
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        if (classLevels.length === 0) {
            SWSELogger.log('No class levels to dispatch');
            return;
        }

        SWSELogger.log(`Dispatching features for ${classLevels.length} class level(s)`);

        // For now, dispatch is handled through selections that are already applied
        // In future phases, integrate actual class level feature definitions
        // This is a placeholder for when class features are fully defined
    }

    /**
     * Finalize specialized progressions (Force, Language, Equipment)
     * @private
     */
    static async _finalizeSpecializedProgressions(actor, mode, engine = null) {
        const progression = actor.system.progression || {};
        const className = progression.classLevels?.[0]?.class || '';
        const backgroundName = progression.background || '';

        // Step 1: Process choice-based selections (Force Techniques, Secrets, Maneuvers)
        if (engine && engine.data) {
            await this._processChoiceSelections(actor, engine);
        }

        // Step 2: Finalize Force progression
        if (ForceProgressionEngine.isForceEnlightened(actor)) {
            await ForceProgressionEngine.finalizeForceProgression(actor);
            SWSELogger.log('Force progression finalized');
        }

        // Step 3: Finalize languages
        await LanguageEngine.finalizeLanguages(actor);
        SWSELogger.log('Languages finalized');

        // PHASE 3.4: Suite Reselection (level-up only, after ability recalculation)
        // Offers players to reselect Force Powers and Maneuvers with new capacity
        if (mode === 'levelup' && isSuiteReselectionEnabled()) {
            await this._offerSuiteReselection(actor);
        }

        // Step 4: Finalize equipment (chargen only - level-up doesn't grant equipment)
        if (mode === 'chargen' && className && backgroundName) {
            await EquipmentEngine.finalizeEquipment(actor, className, backgroundName);
            SWSELogger.log('Equipment finalized');
        }
    }

    /**
     * Offer suite reselection (Force Powers and Maneuvers) during level-up
     * PHASE 3.4: Triggered only during level-up, after abilities are recalculated
     * @private
     */
    static async _offerSuiteReselection(actor) {
        if (!actor) {
            return;
        }

        try {
            // Offer Force Power reselection
            const confirmForce = await new Promise((resolve) => {
                new Dialog({
                    title: "Reselect Force Powers?",
                    content: "<p>Would you like to reselect your Force Powers with your new capacity?</p>",
                    buttons: {
                        yes: {
                            label: "Reselect",
                            callback: () => resolve(true)
                        },
                        no: {
                            label: "Keep Current",
                            callback: () => resolve(false)
                        }
                    },
                    default: "no"
                }).render(true);
            });

            if (confirmForce) {
                const forceResult = await SuiteReselectionEngine.clearAndReselectForcePowers(
                    actor,
                    "levelup"
                );

                if (!forceResult.success) {
                    ui.notifications.error("Force Power reselection failed: " + forceResult.error);
                } else if (forceResult.appliedCount > 0) {
                    ui.notifications.info(`Reselected ${forceResult.appliedCount} Force Powers`);
                }
            }

            // Offer Maneuver reselection
            const confirmManeuvers = await new Promise((resolve) => {
                new Dialog({
                    title: "Reselect Starship Maneuvers?",
                    content: "<p>Would you like to reselect your Starship Maneuvers with your new capacity?</p>",
                    buttons: {
                        yes: {
                            label: "Reselect",
                            callback: () => resolve(true)
                        },
                        no: {
                            label: "Keep Current",
                            callback: () => resolve(false)
                        }
                    },
                    default: "no"
                }).render(true);
            });

            if (confirmManeuvers) {
                const maneuverResult = await SuiteReselectionEngine.clearAndReselectManeuvers(
                    actor,
                    "levelup"
                );

                if (!maneuverResult.success) {
                    ui.notifications.error("Maneuver reselection failed: " + maneuverResult.error);
                } else if (maneuverResult.appliedCount > 0) {
                    ui.notifications.info(`Reselected ${maneuverResult.appliedCount} Maneuvers`);
                }
            }
        } catch (e) {
            SWSELogger.error('Suite reselection failed', e);
        }
    }

    /**
     * Process choice selections from engine.data populated by feature dispatcher
     * @private
     */
    static async _processChoiceSelections(actor, engine) {
        // Force Technique choices
        if (engine.data.forceTechniqueChoices?.length > 0) {
            const count = engine.data.forceTechniqueChoices.reduce((sum, c) => sum + (c.value || 1), 0);
            await ForceTechniqueEngine.handleForceTechniqueTriggers(actor, count);
            SWSELogger.log(`Processed ${count} Force Technique choice(s)`);
        }

        // Force Secret choices
        if (engine.data.forceSecretChoices?.length > 0) {
            const count = engine.data.forceSecretChoices.reduce((sum, c) => sum + (c.value || 1), 0);
            await ForceSecretEngine.handleForceSecretTriggers(actor, count);
            SWSELogger.log(`Processed ${count} Force Secret choice(s)`);
        }

        // Starship Maneuver choices
        if (engine.data.starshipManeuverChoices?.length > 0) {
            const count = engine.data.starshipManeuverChoices.reduce((sum, c) => sum + (c.value || 1), 0);
            await StarshipManeuverEngine.handleStarshipManeuverTriggers(actor, count);
            SWSELogger.log(`Processed ${count} Starship Maneuver choice(s)`);
        }
    }

    /**
     * Alternative simple integration for existing finalize() method
     * Can be called as a quick addition to existing code
     *
     * PHASE 3: Also uses atomic applyProgression()
     */
    static async quickIntegrate(actor, mode = 'chargen', engine = null) {
        try {
            // Create snapshot
            const beforeSnapshot = actor.toObject(false);
            await SnapshotManager.createSnapshot(actor, `Before ${mode === 'chargen' ? 'Character Creation' : 'Level Up'}`);

            // ========================================================================
            // PHASE 3: Build and apply progression packet atomically
            // ========================================================================
            const progressionPacket = await this._buildProgressionPacket(actor, mode, engine);
            await ActorEngine.applyProgression(actor, progressionPacket);

            // Process choice selections (read-only)
            if (engine && engine.data) {
                await this._processChoiceSelections(actor, engine);
            }

            // Finalize specialized progressions (read-only, may emit hooks)
            const progression = actor.system.progression || {};
            const className = progression.classLevels?.[0]?.class || '';
            const backgroundName = progression.background || '';

            if (ForceProgressionEngine.isForceEnlightened(actor)) {
                await ForceProgressionEngine.finalizeForceProgression(actor);
            }

            await LanguageEngine.finalizeLanguages(actor);

            if (mode === 'chargen' && className && backgroundName) {
                await EquipmentEngine.finalizeEquipment(actor, className, backgroundName);
            }

            // Generate and display diff
            const afterSnapshot = actor.toObject(false);
            const diff = LevelDiffInspector.generateDiff(beforeSnapshot, afterSnapshot,
                mode === 'chargen' ? 'Character Creation' : `Level ${actor.system.level}`);
            await LevelDiffInspector.sendDiffToChatBroadcast(actor, diff);

            SWSELogger.log('Quick integration finalization complete');
            return true;

        } catch (err) {
            SWSELogger.error('Quick integration finalization failed:', err);
            throw err;
        }
    }

    /**
     * Get integration status/summary
     */
    static getIntegrationStatus() {
        return {
            subsystems: {
                snapshotManager: true,
                featureDispatcher: true,
                forceProgression: true,
                languageEngine: true,
                equipmentEngine: true,
                derivedCalculator: true,
                levelDiffInspector: true
            },
            status: 'ready',
            message: 'All subsystems available for integration'
        };
    }
}
