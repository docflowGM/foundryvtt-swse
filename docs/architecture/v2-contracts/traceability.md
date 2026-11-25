# Requirement → code → test traceability (generated)

Level A invariants trace to probes (see `A-global-invariants.md`). Domain requirements trace to the owning module and its tests. **No requirement is live-Foundry-verified.** Generated at `f734b4d`.

- Domain requirements: 127; with a named test or a direct test of the owner module: 90; **test gaps: 37**.

| Requirement | Domain | Code | Reachability | Named tests | Owner direct tests | Owner CI tests (transitive) |
|---|---|---|---|---:|---:|---:|
| R-ABL-01 | `abilities-effects` | `scripts/engine/effects/modifiers/ModifierEngine.js :: ModifierEngine.getAllModifiers/collectModifiers` | reachable-static | 1 | 15 | 353 |
| R-ABL-02 | `abilities-effects` | `scripts/engine/effects/modifiers/ModifierEngine.js :: ModifierEngine.aggregateAll/resolveTarget` | reachable-static | 1 | 15 | 353 |
| R-ABL-03 | `abilities-effects` | `scripts/engine/effects/modifiers/modifier-breakdown-builder.js :: buildModifierLedger` | reachable-static | 1 | 1 | 354 |
| R-ABL-04 | `abilities-effects` | `scripts/engine/effects/modifiers/ModifierEngine.js :: ModifierEngine.clearCaches` | reachable-static | 0 | 15 | 353 |
| R-ABL-05 | `abilities-effects` | `scripts/engine/abilities/AbilityEngine.js :: AbilityEngine.evaluateAcquisition` | reachable-static | 2 | 8 | 358 |
| R-ABL-06 | `abilities-effects` | `scripts/engine/abilities/ability-execution-coordinator.js :: AbilityExecutionCoordinator.registerActorAbilities` | reachable-static | 0 | 2 | 29 |
| R-ABL-07 | `abilities-effects` | `scripts/engine/abilities/passive/derived-override-engine.js :: DerivedOverrideEngine` | reachable-static | 0 | 1 | 353 |
| R-ABL-08 | `abilities-effects` | `scripts/dialogs/entity-dialog/effect-intent-engine.js :: EffectIntentEngine` | reachable-static | 0 | 3 | 353 |
| R-ABL-09 ⚠ | `abilities-effects` | `scripts/engine/execution/rules/rule-enum.js :: RULES` | reachable-static | 0 | 0 | 353 |
| R-ABL-10 ⚠ | `abilities-effects` | `scripts/engine/abilities/progression/progression-event-processor.js :: ProgressionEventProcessor` | reachable-static | 0 | 0 | 51 |
| R-ABL-11 ⚠ | `abilities-effects` | `scripts/utils/active-effect-change-utils.js :: normalizeActiveEffectDataForRuntime` | reachable-static | 0 | 0 | 353 |
| R-ABL-12 ⚠ | `abilities-effects` | `scripts/engine/abilities/active/duration-engine.js :: DurationEngine` | reachable-static | 0 | 0 | 30 |
| R-ACT-01 | `actor-core` | `scripts/actors/v2/base-actor.js :: SWSEV2BaseActor` | reachable-static | 0 | 4 | 4 |
| R-ACT-02 | `actor-core` | `scripts/actors/v2/base-actor.js :: SWSEV2BaseActor._performDerivedCalculation` | reachable-static | 0 | 4 | 4 |
| R-ACT-03 | `actor-core` | `scripts/actors/derived/derived-calculator.js :: DerivedCalculator.computeAll` | reachable-static | 1 | 13 | 353 |
| R-ACT-04 | `actor-core` | `scripts/actors/derived/derived-generation.js :: stampDerivedGeneration` | reachable-static | 1 | 4 | 358 |
| R-ACT-05 | `actor-core` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.updateActor/updateEmbeddedDocuments/createEmbeddedDocuments/deleteEmbeddedDocuments` | reachable-static | 0 | 91 | 353 |
| R-ACT-06 | `actor-core` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.applyMutationPlan` | reachable-static | 2 | 91 | 353 |
| R-ACT-07 | `actor-core` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.recalcAll/_applyDerivedUpdates` | reachable-static | 0 | 91 | 353 |
| R-ACT-08 | `actor-core` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.applyDamage/setConditionStep/spendForcePoints/spendDestinyPoints/applySecondWind` | reachable-static | 0 | 91 | 353 |
| R-ACT-09 ⚠ | `actor-core` | `scripts/actors/derived/level-split.js :: getHeroicHalfLevel/getEffectiveHalfLevel` | reachable-static | 0 | 0 | 353 |
| R-ACT-10 | `actor-core` | `scripts/actors/derived/defense-calculator.js :: DefenseCalculator` | reachable-static | 1 | 10 | 353 |
| R-ACT-11 | `actor-core` | `scripts/actors/v2/vehicle-derived-builder.js :: buildVehicleDerived` | reachable-static | 1 | 3 | 7 |
| R-ACT-12 | `actor-core` | `scripts/actors/npc/npc-mode-adapter.js :: getNpcMode / resolveDroidCalculationMode` | reachable-static | 2 | 2 | 355 |
| R-ACT-13 | `actor-core` | `scripts/engine/HP/hp-accounting.js :: planHpRecompute; ActorEngine.recomputeHP` | reachable-static | 1 | 2 | 353 |
| R-ACT-14 ⚠ | `actor-core` | `scripts/engine/progression/xp-engine.js :: computeXpDerived` | reachable-static | 0 | 0 | 353 |
| R-ACT-15 | `actor-core` | `scripts/actors/vehicle/vehicle-precreate-hooks.js :: registerVehiclePreCreateHooks` | reachable-static | 0 | 17 | 17 |
| R-CLS-01 | `classes` | `scripts/data/classes-db.js :: ClassesDB` | reachable-static | 1 | 13 | 370 |
| R-CLS-02 | `classes` | `scripts/engine/registries/classes-registry.js :: ClassesRegistry` | reachable-static | 0 | 1 | 368 |
| R-CLS-03 | `classes` | `scripts/data/class-normalizer.js :: normalizeClass` | reachable-static | 0 | 10 | 370 |
| R-CLS-04 | `classes` | `scripts/engine/progression/utils/class-data-loader.js :: getClassData` | reachable-static | 1 | 0 | 365 |
| R-CLS-05 | `classes` | `scripts/engine/progression/utils/class-resolution.js :: resolveClassModel` | reachable-static | 0 | 1 | 365 |
| R-CLS-06 | `classes` | `scripts/engine/progression/utils/nonheroic-class-model.js :: NONHEROIC_CLASS_MODEL` | reachable-static | 0 | 2 | 371 |
| R-CLS-07 ⚠ | `classes` | `scripts/data/prestige-prerequisites.js :: PRESTIGE_PREREQUISITES` | reachable-static | 0 | 0 | 364 |
| R-CLS-08 ⚠ | `classes` | `scripts/data/class-tag-metadata.js :: CLASS_TAG_METADATA` | reachable-static | 0 | 0 | 371 |
| R-CLS-09 | `classes` | `scripts/engine/prestige/identity-engine.js :: IdentityEngine` | reachable-static | 0 | 3 | 55 |
| R-FEA-01 | `feats` | `data/canonical/feats.json :: (data)` | runtime-referenced | 1 | 0 | 0 |
| R-FEA-02 | `feats` | `scripts/registries/feat-registry.js :: FeatRegistry` | reachable-static | 1 | 6 | 369 |
| R-FEA-03 ⚠ | `feats` | `scripts/registries/feat-pack-seeder.js :: FeatPackSeeder` | reachable-static | 0 | 0 | 369 |
| R-FEA-04 ⚠ | `feats` | `scripts/data/authority/feat-prerequisite-authority.js :: FEAT_PREREQUISITE_AUTHORITY` | reachable-static | 0 | 0 | 372 |
| R-FEA-05 ⚠ | `feats` | `scripts/data/feat-domain-guard.js :: filterFeatDomainDocuments` | reachable-static | 0 | 0 | 369 |
| R-FEA-06 | `feats` | `scripts/apps/choices/feat-choice-dialog.js :: FeatChoiceDialog.promptAndApply` | reachable-static | 1 | 0 | 51 |
| R-FEA-07 ⚠ | `feats` | `scripts/engine/feats/register-feat-runtime.js :: registerFeatRuntime` | reachable-static | 0 | 0 | 0 |
| R-FEA-08 ⚠ | `feats` | `scripts/engine/feats/*-runtime-patches.js :: register*RuntimePatches` | — | 0 | 0 | 0 |
| R-FEA-09 | `feats` | `scripts/engine/feats/meta-resource-feat-resolver.js :: MetaResourceFeatResolver` | reachable-static | 1 | 2 | 353 |
| R-FEA-10 | `feats` | `scripts/engine/feat/scoped-combat-feat-resolver.js :: ScopedCombatFeatResolver` | reachable-static | 1 | 1 | 354 |
| R-FEA-11 ⚠ | `feats` | `scripts/engine/features/feat-effect-applier.js :: FeatEffectApplier` | reachable-static | 0 | 0 | 0 |
| R-FEA-12 ⚠ | `feats` | `scripts/engine/feats/encounter-use-tracker.js :: EncounterUseTracker` | reachable-static | 0 | 0 | 353 |
| R-FEA-13 | `feats` | `scripts/engine/feats/core-attack-option-action-economy.js :: getCoreAttackOptionEconomy` | reachable-static | 0 | 1 | 353 |
| R-FEA-14 ⚠ | `feats` | `scripts/engine/feats/condition-track-feat-actions.js :: ConditionTrackFeatActions` | reachable-static | 0 | 0 | 0 |
| R-FEA-15 ⚠ | `feats` | `scripts/engine/feats/force-point-feat-rules.js :: ForcePointFeatRules` | reachable-static | 0 | 0 | 353 |
| R-GAL-01 | `galactic-profiles` | `scripts/generation/ :: generator library` | — | 2 | 0 | 0 |
| R-GAL-02 | `galactic-profiles` | `tests/gm-generation-phase8d1-foundation.test.mjs :: forbiddenCallPatterns source guard` | test-file | 1 | 0 | 0 |
| R-GAL-03 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: LocationRegistryService` | reachable-static | 1 | 9 | 38 |
| R-GAL-04 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: upsertLocation / _uniqueLocationSlug` | reachable-static | 1 | 9 | 38 |
| R-GAL-05 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: setActorAtlasState / patchActorLocationState / revealFactToActor / recordAtlasLeadDiscovery / resolveAtlasLeadDiscovery` | reachable-static | 1 | 9 | 38 |
| R-GAL-06 | `galactic-profiles` | `scripts/locations/location-library-seeds.js :: LOCATION_LIBRARY_SEEDS` | reachable-static | 1 | 3 | 38 |
| R-GAL-07 | `galactic-profiles` | `scripts/ui/shell/gm/LocationSceneBridgeService.js :: LocationSceneBridgeService` | reachable-static | 1 | 0 | 8 |
| R-GAL-08 | `galactic-profiles` | `scripts/ui/shell/gm/FactionJobBridgeService.js :: FactionJobBridgeService (+LocationJob, FactionIntel, LocationIntel)` | reachable-static | 1 | 1 | 23 |
| R-GAL-09 ⚠ | `galactic-profiles` | — | — | 0 | 0 | 0 |
| R-MEN-01 | `mentor-suggestion` | `scripts/engine/suggestion/SuggestionService.js :: SuggestionService` | reachable-static | 1 | 4 | 51 |
| R-MEN-02 ⚠ | `mentor-suggestion` | `scripts/engine/suggestion/SuggestionEngineCoordinator.js :: SuggestionEngineCoordinator` | reachable-static | 0 | 0 | 51 |
| R-MEN-03 | `mentor-suggestion` | `scripts/engine/suggestion/SuggestionEngine.js :: SuggestionEngine (+ClassSuggestionEngine, SuggestionScorer, attribute-planner)` | reachable-static | 1 | 0 | 51 |
| R-MEN-04 | `mentor-suggestion` | `scripts/engine/suggestion/ReasonFactory.js :: ReasonFactory.create` | reachable-static | 1 | 0 | 52 |
| R-MEN-05 ⚠ | `mentor-suggestion` | `scripts/engine/suggestion/SuggestionStateService.js :: SuggestionStateService (intended); actually split across SelectionRecorder, AnchorRepository, SuggestionService._setSuggestionState` | reachable-static | 0 | 0 | 51 |
| R-MEN-06 | `mentor-suggestion` | `scripts/engine/mentor/mentor-dialogues.js :: getMentorForClass / getActiveMentor / MENTORS` | reachable-static | 2 | 0 | 51 |
| R-MEN-07 ⚠ | `mentor-suggestion` | `scripts/engine/mentor/mentor-memory.js :: setMentorMemory / decayAllMentorCommitments` | reachable-static | 0 | 0 | 51 |
| R-MEN-08 | `mentor-suggestion` | `scripts/mentor/mentor-survey-v2/contract.js :: SURVEY_KINDS, LEDGER_SET_PATH, ...` | reachable-static | 1 | 1 | 62 |
| R-MEN-09 | `mentor-suggestion` | `scripts/mentor/mentor-survey-v2/survey-session.js :: survey session + survey-controller + MentorSurveyStep` | reachable-dynamic | 2 | 0 | 51 |
| R-MEN-10 | `mentor-suggestion` | `scripts/mentor/mentor-survey-v2/finalization.js :: buildSurveyLedgerPatch (+ intent-ledger.buildLedgerSetPatch)` | reachable-static | 2 | 1 | 57 |
| R-MEN-11 | `mentor-suggestion` | `scripts/mentor/mentor-survey-v2/survey-influence.js :: computeSurveyInfluence; tag-boundary.mapResponseToIntent` | reachable-static | 2 | 1 | 55 |
| R-MEN-12 | `mentor-suggestion` | `scripts/mentor/mentor-survey-v2/actor-evidence.js :: projectActorEvidence` | reachable-static | 1 | 0 | 61 |
| R-MEN-13 | `mentor-suggestion` | `scripts/engine/archetype/archetype-registry.js :: ArchetypeRegistry` | reachable-static | 2 | 0 | 55 |
| R-MEN-14 | `mentor-suggestion` | `scripts/engine/suggestion/equipment-loadout-profile.js :: buildEquipmentLoadoutProfile` | reachable-static | 1 | 0 | 56 |
| R-MEN-15 | `mentor-suggestion` | `scripts/mentor/mentor-translation-integration.js :: MentorTranslationIntegration` | reachable-static | 1 | 1 | 57 |
| R-PRG-01 ⚠ | `progression` | `scripts/apps/progression-framework/progression-entry.js :: launchProgression` | reachable-static | 0 | 0 | 51 |
| R-PRG-02 | `progression` | `scripts/apps/progression-framework/shell/progression-shell.js :: ProgressionShell` | reachable-static | 0 | 4 | 51 |
| R-PRG-03 | `progression` | `scripts/apps/progression-framework/shell/progression-session.js :: ProgressionSession` | reachable-static | 0 | 1 | 51 |
| R-PRG-04 | `progression` | `scripts/apps/progression-framework/shell/session-storage.js :: SessionStorage + ChargenPersistence` | reachable-static | 1 | 2 | 51 |
| R-PRG-05 | `progression` | `scripts/apps/progression-framework/shell/progression-finalizer.js :: ProgressionFinalizer.finalize` | reachable-static | 1 | 15 | 57 |
| R-PRG-06 | `progression` | `scripts/apps/progression-framework/shell/progression-finalizer.js :: ProgressionFinalizer.finalizeSingleStep` | reachable-static | 0 | 15 | 57 |
| R-PRG-07 ⚠ | `progression` | `scripts/apps/progression-framework/shell/mutation/ :: *PlanBuilder` | — | 0 | 0 | 0 |
| R-PRG-08 | `progression` | `scripts/apps/progression-framework/shell/progression-finalizer.js :: _compileMutationPlanBase` | reachable-static | 0 | 15 | 57 |
| R-PRG-09 | `progression` | `scripts/apps/progression-framework/shell/progression-reconciler.js :: ProgressionReconciler` | reachable-static | 1 | 19 | 78 |
| R-PRG-10 ⚠ | `progression` | `scripts/apps/progression-framework/steps/step-plugin-base.js :: ProgressionStepPlugin` | reachable-static | 0 | 0 | 51 |
| R-PRG-11 | `progression` | `scripts/engine/progression/content/progression-content-authority.js :: ProgressionContentAuthority` | reachable-static | 0 | 4 | 60 |
| R-PRG-12 | `progression` | `scripts/engine/progression/ProgressionRules.js :: ProgressionRules` | reachable-static | 0 | 1 | 79 |
| R-PRG-13 | `progression` | `scripts/engine/progression/utils/snapshot-manager.js :: SnapshotManager` | reachable-static | 0 | 21 | 353 |
| R-PRG-14 | `progression` | `scripts/apps/progression-framework/steps/summary-step.js :: SummaryStep._stageStartingCreditsForStore` | reachable-dynamic | 0 | 1 | 51 |
| R-PRG-15 ⚠ | `progression` | `scripts/engine/progression/engine/progression-engine.js :: ProgressionEngine` | reachable-static | 0 | 0 | 51 |
| R-STO-01 | `store-economy` | `scripts/engine/store/transaction-engine.js :: TransactionEngine` | reachable-static | 2 | 14 | 353 |
| R-STO-02 | `store-economy` | `scripts/engine/store/transaction-engine.js :: TransactionEngine.getActorTransactions` | reachable-static | 1 | 14 | 353 |
| R-STO-03 | `store-economy` | `scripts/engine/store/ledger-service.js :: LedgerService` | reachable-static | 1 | 2 | 353 |
| R-STO-04 | `store-economy` | `scripts/engine/store/store-engine.js :: StoreEngine.purchase` | reachable-static | 2 | 2 | 54 |
| R-STO-05 | `store-economy` | `scripts/engine/store/cost-registry.js :: resolveStoreCost` | reachable-static | 1 | 1 | 355 |
| R-STO-06 | `store-economy` | `scripts/engine/store/resale-service.js :: ResaleService` | reachable-static | 1 | 1 | 353 |
| R-STO-07 | `store-economy` | `scripts/engine/store/acquisition-service.js :: StoreAcquisitionService` | reachable-static | 0 | 1 | 353 |
| R-STO-08 | `store-economy` | `scripts/apps/store/store-main.js :: SWSEStore` | reachable-static | 1 | 0 | 51 |
| R-UIS-01 ⚠ | `ui-shell` | `index.js :: Actors.registerSheet` | reachable-static | 0 | 0 | 0 |
| R-UIS-02 | `ui-shell` | `scripts/sheets/v2/actor-sheet-base.js :: SWSEV2ActorSheetBase` | reachable-static | 1 | 0 | 4 |
| R-UIS-03 | `ui-shell` | `scripts/sheets/v2/character-like-sheet.js :: SWSEV2CharacterLikeSheet` | reachable-static | 0 | 3 | 4 |
| R-UIS-04 ⚠ | `ui-shell` | `templates/actors/character/v2-concept/character-sheet.hbs :: (template)` | runtime-referenced | 0 | 0 | 0 |
| R-UIS-05 ⚠ | `ui-shell` | `scripts/ui/shell/ShellHost.js :: ShellHostMixin` | reachable-static | 0 | 0 | 4 |
| R-UIS-06 ⚠ | `ui-shell` | `scripts/ui/shell/mutate-and-repaint.js :: mutateAndRepaint` | reachable-static | 0 | 0 | 11 |
| R-UIS-07 | `ui-shell` | `scripts/apps/gm-datapad.js :: GMDatapad` | reachable-static | 1 | 0 | 0 |
| R-UIS-08 | `ui-shell` | `scripts/apps/dialogs/swse-dialog-v2.js :: SWSEDialogV2` | reachable-static | 0 | 9 | 354 |
| R-UIS-09 | `ui-shell` | `scripts/sheets/v2/context/PanelContextBuilder.js :: PanelContextBuilder` | reachable-static | 1 | 10 | 23 |
| R-UIS-10 ⚠ | `ui-shell` | `scripts/ui/discovery/index.js :: onDiscoveryReady` | reachable-static | 0 | 0 | 0 |
| R-UIS-11 ⚠ | `ui-shell` | `scripts/sheets/v2/actor-sheet-base.js :: setStoredSheetMode` | reachable-static | 0 | 0 | 4 |
| R-UIS-12 ⚠ | `ui-shell` | `scripts/ui/shell/SettingsSurfaceController.js :: SettingsSurfaceController` | reachable-static | 0 | 0 | 4 |
| R-UIS-13 ⚠ | `ui-shell` | `scripts/load-templates.js :: SWSE_TEMPLATES` | reachable-static | 0 | 0 | 0 |
| R-VEH-01 | `vehicles` | `tools/build-universal-vehicle-pack-sources.mjs :: buildUniversalVehiclePackSources` | node-tool | 1 | 53 | 68 |
| R-VEH-02 ⚠ | `vehicles` | `scripts/core/vehicle-pack-data-loader.js :: VehiclePackDataLoader` | reachable-dynamic | 0 | 0 | 356 |
| R-VEH-03 | `vehicles` | `scripts/domain/vehicles/vehicle-runtime-contract.js :: classifyVehicleActorRuntime` | reachable-static | 0 | 13 | 381 |
| R-VEH-04 | `vehicles` | `scripts/domain/vehicles/vehicle-installation-ledger.js :: planVehicleInstallation` | reachable-static | 0 | 25 | 381 |
| R-VEH-05 | `vehicles` | `scripts/engine/vehicles/vehicle-installation-service.js :: VehicleInstallationService` | reachable-static | 0 | 18 | 100 |
| R-VEH-06 | `vehicles` | `scripts/domain/vehicles/vehicle-modification-effects.js :: EFFECTS` | reachable-static | 0 | 14 | 381 |
| R-VEH-07 | `vehicles` | `scripts/domain/vehicles/vehicle-weapon-damage.js :: resolveVehicleWeaponDamage` | reachable-static | 1 | 18 | 366 |
| R-VEH-08 | `vehicles` | `scripts/domain/vehicles/vehicle-weapon-battery.js :: resolveBatteryAttackTotal` | reachable-static | 0 | 2 | 383 |
| R-VEH-09 | `vehicles` | `scripts/engine/vehicles/vehicle-ammunition-purchase-service.js :: VehicleAmmunitionPurchaseService` | reachable-static | 0 | 4 | 53 |
| R-VEH-10 | `vehicles` | `scripts/engine/vehicles/vehicle-logistics-service.js :: VehicleLogisticsService` | reachable-static | 0 | 1 | 81 |
| R-VEH-11 | `vehicles` | `scripts/engine/vehicles/vehicle-scene-state.js :: putSceneRecord` | reachable-static | 0 | 1 | 353 |
| R-VEH-12 ⚠ | `vehicles` | `scripts/engine/crew/vehicle-crew-assignment-service.js :: VehicleCrewAssignmentService` | reachable-static | 0 | 0 | 0 |
| R-VEH-13 ⚠ | `vehicles` | `scripts/engine/StarshipManeuversEngine.js :: StarshipManeuversEngine` | reachable-static | 0 | 0 | 0 |
| R-VEH-14 ⚠ | `vehicles` | `scripts/infrastructure/hooks/starship-maneuver-hooks.js :: initializeStarshipManeuverHooks` | reachable-static | 0 | 0 | 0 |
| R-VEH-15 | `vehicles` | `scripts/sheets/v2/vehicle-actor-sheet.js :: SWSEV2VehicleSheet` | reachable-static | 1 | 0 | 0 |
| R-VEH-16 | `vehicles` | `scripts/engine/import/vehicle-import-engine.js :: VehicleImportEngine` | reachable-dynamic | 1 | 0 | 1 |
