# Requirement → code → test traceability (generated)

Level A invariants trace to probes (see `A-global-invariants.md`). Domain requirements trace to the owning module and its tests. **No requirement is live-Foundry-verified.** Generated at `f734b4d`.

- Domain requirements: 308; with a named test or a direct test of the owner module: 197; **test gaps: 111**.

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
| R-CHT-01 | `chat` | `scripts/chat/swse-chat.js :: SWSEChat` | reachable-static | 1 | 50 | 353 |
| R-CHT-02 ⚠ | `chat` | `scripts/chat/store-receipt-chat.js :: registerStoreReceiptChatCards` | reachable-static | 0 | 0 | 0 |
| R-CHT-03 ⚠ | `chat` | `scripts/chat/holonet-chat-card.js :: registerHolonetChatCards` | reachable-static | 0 | 0 | 0 |
| R-CHT-04 | `chat` | `scripts/engine/rolls/swse-roll-engine.js :: SWSERollEngine` | reachable-static | 0 | 1 | 353 |
| R-CHT-05 ⚠ | `chat` | `scripts/core/document-api-v13.js :: createChatMessage` | reachable-static | 0 | 0 | 353 |
| R-CLS-01 | `classes` | `scripts/data/classes-db.js :: ClassesDB` | reachable-static | 1 | 13 | 370 |
| R-CLS-02 | `classes` | `scripts/engine/registries/classes-registry.js :: ClassesRegistry` | reachable-static | 0 | 1 | 368 |
| R-CLS-03 | `classes` | `scripts/data/class-normalizer.js :: normalizeClass` | reachable-static | 0 | 10 | 370 |
| R-CLS-04 | `classes` | `scripts/engine/progression/utils/class-data-loader.js :: getClassData` | reachable-static | 1 | 0 | 365 |
| R-CLS-05 | `classes` | `scripts/engine/progression/utils/class-resolution.js :: resolveClassModel` | reachable-static | 0 | 1 | 365 |
| R-CLS-06 | `classes` | `scripts/engine/progression/utils/nonheroic-class-model.js :: NONHEROIC_CLASS_MODEL` | reachable-static | 0 | 2 | 371 |
| R-CLS-07 ⚠ | `classes` | `scripts/data/prestige-prerequisites.js :: PRESTIGE_PREREQUISITES` | reachable-static | 0 | 0 | 364 |
| R-CLS-08 ⚠ | `classes` | `scripts/data/class-tag-metadata.js :: CLASS_TAG_METADATA` | reachable-static | 0 | 0 | 371 |
| R-CLS-09 | `classes` | `scripts/engine/prestige/identity-engine.js :: IdentityEngine` | reachable-static | 0 | 3 | 55 |
| R-CMB-01 | `combat` | `scripts/combat/rolls/attacks.js :: rollAttack` | reachable-static | 1 | 52 | 353 |
| R-CMB-02 | `combat` | `scripts/engine/combat/combat-roll-math.js :: resolveAttackBonus` | reachable-static | 0 | 42 | 353 |
| R-CMB-03 | `combat` | `scripts/engine/combat/combat-roll-math.js :: resolveDamageBonus/resolveCriticalMultiplier` | reachable-static | 0 | 42 | 353 |
| R-CMB-04 | `combat` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.applyDamage` | reachable-static | 0 | 91 | 353 |
| R-CMB-05 | `combat` | `scripts/engine/combat/threshold-engine.js :: ThresholdEngine` | reachable-static | 1 | 5 | 353 |
| R-CMB-06 ⚠ | `combat` | `scripts/engine/combat/ConditionTrackRules.js :: ConditionTrackRules` | reachable-static | 0 | 0 | 353 |
| R-CMB-07 | `combat` | `scripts/engine/combat/action/action-economy-consumption.js :: ActionEconomyConsumption` | reachable-static | 1 | 35 | 353 |
| R-CMB-08 | `combat` | `scripts/engine/combat/combat-option-resolver.js :: CombatOptionResolver` | reachable-static | 0 | 24 | 360 |
| R-CMB-09 | `combat` | `scripts/engine/combat/grapple-state-engine.js :: GrappleStateEngine` | reachable-static | 0 | 5 | 353 |
| R-CMB-10 | `combat` | `scripts/engine/combat/SWSEInitiative.js :: SWSEInitiative` | reachable-static | 0 | 1 | 15 |
| R-CMB-11 | `combat` | `scripts/engine/actions/action-registry.js :: ActionRegistry` | test-only-import | 1 | 2 | 3 |
| R-PAT-01 ⚠ | `compat-patches` | `scripts/patches/runtime-bugfix-hotfixes-init.js :: (module body)` | reachable-static | 0 | 0 | 0 |
| R-PAT-02 ⚠ | `compat-patches` | `scripts/patches/progression-choice-language-hotfix.js :: registerProgressionChoiceLanguageHotfix` | reachable-static | 0 | 0 | 0 |
| R-PAT-03 | `compat-patches` | `scripts/patches/attack-dialog-combat-corrections-hotfix.js :: registerAttackDialogCombatCorrectionsHotfix` | reachable-static | 0 | 1 | 1 |
| R-PAT-04 | `compat-patches` | `scripts/patches/follower-orphan-transfer-hotfix.js :: registerFollowerOrphanTransferHotfix` | reachable-static | 0 | 1 | 1 |
| R-PAT-05 | `compat-patches` | `scripts/patches/armor-hydration-defense-hotfix.js :: registerArmorHydrationDefenseHotfix` | reachable-static | 0 | 2 | 2 |
| R-PAT-06 | `compat-patches` | `scripts/patches/weapon-branch-coherence-hotfix.js :: registerWeaponBranchCoherenceHotfix` | reachable-static | 0 | 1 | 1 |
| R-CUS-01 | `customization` | `scripts/apps/customization/item-customization-workbench.js :: ItemCustomizationWorkbench` | reachable-static | 1 | 1 | 52 |
| R-CUS-02 | `customization` | `scripts/apps/customization/item-customization-workbench.js :: _applyCurrentItem` | reachable-static | 1 | 1 | 52 |
| R-CUS-03 | `customization` | `scripts/engine/upgrades/UpgradeService.js :: UpgradeService.applyUpgrade/removeUpgrade` | reachable-static | 1 | 6 | 29 |
| R-CUS-04 | `customization` | `scripts/engine/customization/customization-workflow.js :: CustomizationWorkflow` | reachable-static | 1 | 1 | 29 |
| R-CUS-05 | `customization` | `scripts/engine/customization/droid-customization-engine.js :: DroidCustomizationEngine` | reachable-static | 0 | 9 | 39 |
| R-CUS-06 | `customization` | `scripts/engine/crafting/lightsaber-construction-engine.js :: LightsaberConstructionEngine.attemptConstruction` | reachable-static | 0 | 2 | 54 |
| R-CUS-07 ⚠ | `customization` | `scripts/engine/customization/tech-specialist-modification-service.js :: TechSpecialistModificationService` | reachable-static | 0 | 0 | 57 |
| R-CUS-08 | `customization` | `scripts/engine/customization/modification-v2-runtime/modification-install-service.js :: modification-install-service` | reachable-static | 1 | 4 | 54 |
| R-CUS-09 ⚠ | `customization` | `scripts/utils/lightsaber-light-sync.js :: LightsaberLightSync` | reachable-static | 0 | 0 | 353 |
| R-DAT-01 | `data-registries` | `scripts/data/prerequisite-checker.js :: PrerequisiteChecker` | reachable-static | 1 | 4 | 363 |
| R-DAT-02 ⚠ | `data-registries` | `scripts/data/authority/prerequisite-text-helpers.js :: getCanonicalPrerequisiteText` | reachable-static | 0 | 0 | 372 |
| R-DAT-03 ⚠ | `data-registries` | `scripts/data/authority/authority-key-normalizer.js :: normalizeAuthorityKey` | reachable-static | 0 | 0 | 372 |
| R-DAT-04 ⚠ | `data-registries` | `scripts/registries/language-registry.js :: LanguageRegistry` | reachable-static | 0 | 0 | 60 |
| R-DAT-05 ⚠ | `data-registries` | `scripts/data/adapters/ClassModelAdapters.js :: adaptClassForProgression` | reachable-static | 0 | 0 | 365 |
| R-DAT-06 ⚠ | `data-registries` | `schemas/archetype.schema.json :: (schema)` | unreferenced | 0 | 0 | 0 |
| R-DRD-01 | `droids` | `scripts/data/droid-systems.js :: DROID_SYSTEMS` | reachable-static | 0 | 6 | 385 |
| R-DRD-02 | `droids` | `scripts/data/droid-part-schema.js :: getDroidPartDefinition` | reachable-static | 0 | 18 | 372 |
| R-DRD-03 | `droids` | `scripts/domain/droids/droid-part-schema.js :: resolveDroidSystemIdentity` | reachable-static | 0 | 1 | 364 |
| R-DRD-04 | `droids` | `scripts/domain/droids/droid-component-quote-authority.js :: resolveDroidComponentQuote` | reachable-static | 0 | 4 | 375 |
| R-DRD-05 | `droids` | `scripts/domain/droids/droid-installed-component-resolver.js :: resolveInstalledDroidComponents` | reachable-static | 0 | 7 | 383 |
| R-DRD-06 | `droids` | `scripts/domain/droids/droid-component-operation-gate.js :: authorizeDroidComponentOperation` | reachable-static | 1 | 1 | 8 |
| R-DRD-07 | `droids` | `scripts/domain/droids/droid-rules-profile.js :: resolveDroidRulesProfile` | reachable-static | 0 | 2 | 356 |
| R-DRD-08 | `droids` | `scripts/engine/droid-validation-engine.js :: DroidValidationEngine` | reachable-static | 0 | 1 | 3 |
| R-DRD-09 | `droids` | `scripts/engine/droids/droid-factory.js :: DroidFactory` | reachable-static | 0 | 2 | 353 |
| R-DRD-10 | `droids` | `scripts/domain/droids/droid-statblock-conversion-service.js :: (service)` | reachable-dynamic | 0 | 2 | 3 |
| R-DRD-11 | `droids` | `scripts/sheets/v2/droid-actor-sheet.js :: SWSEV2DroidSheet` | reachable-static | 0 | 1 | 1 |
| R-DRD-12 | `droids` | `scripts/holonet/subsystems/gm-healing-trigger.js :: isEligibleForHealing` | reachable-static | 0 | 1 | 10 |
| R-EQP-01 | `equipment` | `scripts/engine/equipment/equipment-state-coordinator.js :: executeEquipmentIntent` | reachable-static | 2 | 4 | 353 |
| R-EQP-02 | `equipment` | `scripts/engine/inventory/InventoryEngine.js :: InventoryEngine.toggleEquip` | reachable-static | 0 | 13 | 353 |
| R-EQP-03 | `equipment` | `scripts/items/weapon-runtime/index.js :: weapon-runtime` | reachable-static | 0 | 61 | 360 |
| R-EQP-04 | `equipment` | `scripts/items/armor-data-resolver.js :: resolveArmorData` | reachable-static | 0 | 2 | 355 |
| R-EQP-05 | `equipment` | `scripts/engine/encumbrance/EncumbranceEngine.js :: EncumbranceEngine.calculateEncumbrance` | reachable-static | 0 | 3 | 353 |
| R-EQP-06 | `equipment` | `scripts/engine/inventory/ammo-system.js :: AmmoSystem` | reachable-static | 0 | 28 | 353 |
| R-EQP-07 ⚠ | `equipment` | `scripts/items/swse-item-sheet.js :: SWSEItemSheet` | reachable-static | 0 | 0 | 0 |
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
| R-FRC-01 | `force` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.spendForcePoints` | reachable-static | 1 | 91 | 353 |
| R-FRC-02 | `force` | `scripts/engine/force/force-points-service.js :: ForcePointsService.authorizeSpend` | reachable-static | 1 | 7 | 353 |
| R-FRC-03 | `force` | `scripts/governance/actor-engine/actor-engine.js :: finalizeForcePointSpend/rollbackForcePointSpend` | reachable-static | 1 | 91 | 353 |
| R-FRC-04 | `force` | `scripts/governance/actor-engine/actor-engine.js :: ActorEngine.gainForcePoints` | reachable-static | 0 | 91 | 353 |
| R-FRC-05 ⚠ | `force` | `scripts/data/force-points.js :: calculateMaxForcePointsForBuildPlan (+ ForcePointsService.getMax, no callers)` | reachable-static | 0 | 0 | 79 |
| R-FRC-06 ⚠ | `force` | `(none) :: (six builders)` | — | 0 | 0 | 0 |
| R-FRC-07 | `force` | `scripts/engine/darkside/dsp-engine.js :: DSPEngine` | reachable-static | 1 | 2 | 372 |
| R-FRC-08 ⚠ | `force` | `(none) :: (7 live writer modules)` | — | 0 | 0 | 0 |
| R-FRC-09 | `force` | `scripts/engine/force/force-executor.js :: ForceExecutor.executeForcePower` | reachable-static | 1 | 4 | 353 |
| R-FRC-10 ⚠ | `force` | `scripts/infrastructure/hooks/force-power-hooks.js :: (module)` | reachable-static | 0 | 0 | 0 |
| R-FRC-11 ⚠ | `force` | `scripts/engine/registries/force-registry.js :: ForceRegistry` | reachable-static | 0 | 0 | 364 |
| R-FRC-12 | `force` | `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js :: applyResourceCosts` | reachable-static | 1 | 2 | 8 |
| R-FRC-13 ⚠ | `force` | `scripts/apps/force-tradition/force-tradition-picker.js :: registerForceTraditionPickerHooks` | reachable-static | 0 | 0 | 0 |
| R-FRC-14 | `force` | `scripts/engine/force/force-power-resolution-schema.js :: getForcePowerResolution` | test-only-import | 1 | 1 | 1 |
| R-FRC-15 ⚠ | `force` | `scripts/engine/force/force-suite-runtime-repairs.js :: registerForceSuiteRuntimeRepairs` | reachable-static | 0 | 0 | 0 |
| R-GAL-01 | `galactic-profiles` | `scripts/generation/ :: generator library` | — | 2 | 0 | 0 |
| R-GAL-02 | `galactic-profiles` | `tests/gm-generation-phase8d1-foundation.test.mjs :: forbiddenCallPatterns source guard` | test-file | 1 | 0 | 0 |
| R-GAL-03 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: LocationRegistryService` | reachable-static | 1 | 9 | 38 |
| R-GAL-04 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: upsertLocation / _uniqueLocationSlug` | reachable-static | 1 | 9 | 38 |
| R-GAL-05 | `galactic-profiles` | `scripts/locations/location-registry-service.js :: setActorAtlasState / patchActorLocationState / revealFactToActor / recordAtlasLeadDiscovery / resolveAtlasLeadDiscovery` | reachable-static | 1 | 9 | 38 |
| R-GAL-06 | `galactic-profiles` | `scripts/locations/location-library-seeds.js :: LOCATION_LIBRARY_SEEDS` | reachable-static | 1 | 3 | 38 |
| R-GAL-07 | `galactic-profiles` | `scripts/ui/shell/gm/LocationSceneBridgeService.js :: LocationSceneBridgeService` | reachable-static | 1 | 0 | 8 |
| R-GAL-08 | `galactic-profiles` | `scripts/ui/shell/gm/FactionJobBridgeService.js :: FactionJobBridgeService (+LocationJob, FactionIntel, LocationIntel)` | reachable-static | 1 | 1 | 23 |
| R-GAL-09 ⚠ | `galactic-profiles` | — | — | 0 | 0 | 0 |
| R-GAM-01 | `games` | `scripts/games/game-session-store.js :: GameSessionStore` | reachable-static | 1 | 1 | 354 |
| R-GAM-02 ⚠ | `games` | `scripts/games/games/ :: PazaakEngine / SabaccEngine / HintaroEngine / DejarikEngine` | — | 0 | 0 | 0 |
| R-GAM-03 | `games` | `scripts/games/wagers/game-credit-escrow-service.js :: GameCreditEscrowService` | reachable-static | 1 | 1 | 353 |
| R-GAM-04 ⚠ | `games` | `scripts/games/wagers/game-economy-policy-service.js :: GameEconomyPolicyService` | reachable-static | 0 | 0 | 353 |
| R-GAM-05 ⚠ | `games` | `scripts/games/game-settings.js :: registerGameSettings / getGameSettingsSnapshot` | reachable-static | 0 | 0 | 353 |
| R-GAM-06 ⚠ | `games` | `scripts/games/game-session-materializer.js :: GameSessionMaterializer` | reachable-static | 0 | 0 | 353 |
| R-GAM-07 | `games` | `scripts/holonet/subsystems/holonet-messenger-service.js :: HolonetMessengerService._gmCreateGameInvite` | reachable-static | 0 | 3 | 353 |
| R-GAM-08 | `games` | `scripts/ui/shell/gm/GMApprovalOperationsService.js :: -> GameCreditEscrowService.approvePendingSettlement` | reachable-static | 0 | 2 | 4 |
| R-GOV-01 ⚠ | `governance` | `scripts/governance/mutation/MutationInterceptor.js :: MutationInterceptor` | reachable-static | 0 | 0 | 353 |
| R-GOV-02 | `governance` | `scripts/governance/mutation/mutation-normalization-service.js :: MutationNormalizationService` | reachable-static | 0 | 1 | 353 |
| R-GOV-03 ⚠ | `governance` | `scripts/governance/mutation/mutation-boundary-service.js :: MutationBoundaryService` | reachable-static | 0 | 0 | 353 |
| R-GOV-04 ⚠ | `governance` | `scripts/governance/integrity/prerequisite-integrity-checker.js :: PrerequisiteIntegrityChecker.evaluate` | reachable-static | 0 | 0 | 353 |
| R-GOV-05 ⚠ | `governance` | `scripts/governance/enforcement/preflight-validator.js :: PreflightValidator.validateBeforeMutation` | reachable-static | 0 | 0 | 353 |
| R-GOV-06 | `governance` | `scripts/governance/snapshot/snapshot-service.js :: SnapshotService` | reachable-dynamic | 2 | 3 | 353 |
| R-GOV-07 ⚠ | `governance` | `scripts/governance/sentinel/sentinel-core.js :: SentinelEngine` | reachable-static | 0 | 0 | 370 |
| R-GOV-08 ⚠ | `governance` | `scripts/governance/sentinel/sentinel-init.js :: initializeSentinelGovernance` | reachable-static | 0 | 0 | 0 |
| R-GOV-09 | `governance` | `scripts/governance/sentinel/sentinel-compendium-forensics.js :: registerCompendiumInteractionDiagnostic` | reachable-static | 1 | 0 | 0 |
| R-HOL-01 | `holonet` | `scripts/holonet/subsystems/holonet-storage.js :: HolonetStorage` | reachable-static | 1 | 6 | 353 |
| R-HOL-02 | `holonet` | `scripts/holonet/holonet-engine.js :: HolonetEngine.publish` | reachable-static | 1 | 2 | 353 |
| R-HOL-03 | `holonet` | `scripts/holonet/contracts/enums.js :: RECORD_TYPE, INTENT_TYPE, ...` | reachable-static | 0 | 1 | 353 |
| R-HOL-04 ⚠ | `holonet` | `scripts/holonet/subsystems/holonet-emission-service.js :: HolonetEmissionService.emit + emitters/*` | reachable-static | 0 | 0 | 10 |
| R-HOL-05 | `holonet` | `scripts/holonet/subsystems/holonet-intel-service.js :: HolonetIntelService` | reachable-static | 1 | 6 | 353 |
| R-HOL-06 | `holonet` | `scripts/holonet/subsystems/holonet-messenger-service.js :: HolonetMessengerService` | reachable-static | 1 | 3 | 353 |
| R-HOL-07 | `holonet` | `scripts/engine/store/transaction-engine.js :: TransactionEngine.executeCreditAdjustment / executeCreditTransfer (called by messenger)` | reachable-static | 1 | 14 | 353 |
| R-HOL-08 | `holonet` | `scripts/holonet/subsystems/holonet-messenger-service.js :: _executeAtomicTradeSettlement / _executeAtomicJobRewardSettlement / _restoreTradeSnapshot` | reachable-static | 1 | 3 | 353 |
| R-HOL-09 | `holonet` | `scripts/holonet/subsystems/holonet-messenger-service.js :: setPartyFundBalance / appendPartyFundLedger / PartyFundAccess` | reachable-static | 1 | 3 | 353 |
| R-HOL-10 | `holonet` | `scripts/holonet/subsystems/gm-combat-recovery-service.js :: GMCombatRecoveryService` | reachable-static | 0 | 2 | 10 |
| R-HOL-11 | `holonet` | `scripts/holonet/subsystems/holonet-socket-service.js :: HolonetSocketService; HolonetMessengerService._isRequesterGm` | reachable-static | 0 | 1 | 353 |
| R-HOL-12 ⚠ | `holonet` | `scripts/holonet/holonet-preferences.js :: HolonetPreferences; HolonetStateService` | reachable-static | 0 | 0 | 353 |
| R-HRL-01 | `houserules` | `scripts/engine/system/HouseRuleService.js :: HouseRuleService` | reachable-static | 0 | 4 | 376 |
| R-HRL-02 ⚠ | `houserules` | `scripts/utils/settings-defaults.js :: SETTINGS_DEFAULTS` | reachable-static | 0 | 0 | 376 |
| R-HRL-03 ⚠ | `houserules` | `scripts/houserules/houserule-settings.js :: registerHouseruleSettings` | reachable-static | 0 | 0 | 0 |
| R-HRL-04 ⚠ | `houserules` | `scripts/houserules/houserules-manifest.js :: HOUSERULE_MANIFEST` | reachable-dynamic | 0 | 0 | 1 |
| R-HRL-05 | `houserules` | `scripts/houserules/houserule-feat-grants.js :: HouseRuleFeatGrants` | reachable-static | 0 | 1 | 6 |
| R-HRL-06 ⚠ | `houserules` | `scripts/houserules/houserule-recovery.js :: RecoveryMechanics.performRecovery` | reachable-dynamic | 0 | 0 | 10 |
| R-HRL-07 ⚠ | `houserules` | `scripts/settings/house-rules.js :: registerHouseRuleSettings` | reachable-static | 0 | 0 | 0 |
| R-INF-01 ⚠ | `infrastructure` | `index.js :: init/ready hooks` | reachable-static | 0 | 0 | 0 |
| R-INF-02 ⚠ | `infrastructure` | `scripts/core/settings.js :: registerSystemSettings` | reachable-static | 0 | 0 | 0 |
| R-INF-03 | `infrastructure` | `scripts/infrastructure/hooks/hooks-registry.js :: HooksRegistry` | reachable-static | 0 | 1 | 1 |
| R-INF-04 ⚠ | `infrastructure` | `scripts/infrastructure/hooks/actor-hooks.js :: registerActorHooks` | reachable-static | 0 | 0 | 0 |
| R-INF-05 ⚠ | `infrastructure` | `scripts/core/document-api-v13.js :: patchDocument/createActor/createChatMessage` | reachable-static | 0 | 0 | 353 |
| R-INF-06 | `infrastructure` | `scripts/utils/logger.js :: SWSELogger` | reachable-static | 0 | 15 | 426 |
| R-INF-07 | `infrastructure` | `scripts/utils/schema-adapters.js :: SchemaAdapters` | reachable-static | 1 | 6 | 385 |
| R-INF-08 ⚠ | `infrastructure` | `scripts/utils/flags/swse-flags.js :: installSwseFlagScopeCompatibility` | reachable-static | 0 | 0 | 354 |
| R-INF-09 ⚠ | `infrastructure` | `scripts/load-templates.js :: preloadHandlebarsTemplates` | reachable-static | 0 | 0 | 0 |
| R-INF-10 ⚠ | `infrastructure` | `scripts/core/world-data-loader.js :: WorldDataLoader` | reachable-static | 0 | 0 | 0 |
| R-INF-11 ⚠ | `infrastructure` | `scripts/core/cache-manager.js :: CacheManager` | reachable-dynamic | 0 | 0 | 51 |
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
| R-MIG-01 | `migration` | `scripts/migration/dark-side-points-migration.js :: migrateDarkSidePoints` | reachable-static | 2 | 2 | 2 |
| R-MIG-02 ⚠ | `migration` | `index.js :: ready hook` | reachable-static | 0 | 0 | 0 |
| R-MIG-03 | `migration` | `scripts/migration/dark-side-points-migration.js :: HouseRuleService.set(SETTING_KEY)` | reachable-static | 0 | 2 | 2 |
| R-NPC-01 | `npc-followers` | `scripts/engine/crew/follower-slot-service.js :: FollowerSlotService` | reachable-static | 1 | 4 | 12 |
| R-NPC-02 | `npc-followers` | `scripts/engine/crew/follower-talent-config.js :: getFollowerTalentConfig` | reachable-static | 0 | 1 | 69 |
| R-NPC-03 | `npc-followers` | `scripts/infrastructure/hooks/follower-hooks.js :: initializeFollowerHooks` | reachable-static | 1 | 0 | 57 |
| R-NPC-04 | `npc-followers` | `scripts/apps/follower-creator.js :: FollowerCreator` | reachable-static | 0 | 2 | 57 |
| R-NPC-05 ⚠ | `npc-followers` | `scripts/apps/follower-manager.js :: FollowerManager` | reachable-static | 0 | 0 | 57 |
| R-NPC-06 ⚠ | `npc-followers` | `scripts/apps/minion-manager.js :: MinionManager` | reachable-static | 0 | 0 | 57 |
| R-NPC-07 | `npc-followers` | `scripts/engine/crew/ally-assignment-service.js :: AllyAssignmentService` | reachable-static | 1 | 5 | 10 |
| R-NPC-08 ⚠ | `npc-followers` | `scripts/patches/follower-npc-sheet-parity-hotfix.js :: patchFollowerDefenses` | reachable-static | 0 | 0 | 0 |
| R-NPC-09 | `npc-followers` | `scripts/engine/import/npc-template-importer-engine.js :: (engine)` | reachable-static | 0 | 1 | 1 |
| R-NPC-10 ⚠ | `npc-followers` | `scripts/engine/import/npc-damage-hydration-hooks.js :: registerNpcDamageHydrationHooks` | reachable-static | 0 | 0 | 0 |
| R-NPC-11 | `npc-followers` | `scripts/allies/faction-registry-service.js :: FactionRegistryService` | reachable-static | 0 | 3 | 354 |
| R-NPC-12 | `npc-followers` | `scripts/sheets/v2/npc-actor-sheet.js :: SWSEV2NpcSheet` | reachable-static | 1 | 0 | 0 |
| R-NPC-13 | `npc-followers` | `scripts/apps/progression-framework/steps/class-step.js :: (class step)` | reachable-dynamic | 1 | 0 | 51 |
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
| R-ROL-01 | `rolls` | `scripts/engine/roll/roll-core.js :: RollCore.execute` | reachable-static | 0 | 9 | 353 |
| R-ROL-02 | `rolls` | `scripts/engine/roll-engine.js :: RollEngine.safeRoll` | reachable-static | 0 | 48 | 353 |
| R-ROL-03 | `rolls` | `scripts/engine/roll/expression/roll-transform-resolver.js :: resolveRollTransforms` | reachable-static | 1 | 1 | 354 |
| R-ROL-04 | `rolls` | `scripts/rolls/roll-config.js :: showRollModifiersDialog/getSkillTotal` | reachable-static | 0 | 14 | 353 |
| R-ROL-05 | `rolls` | `scripts/rolls/skills.js :: rollSkill` | reachable-static | 1 | 2 | 353 |
| R-ROL-06 ⚠ | `rolls` | `scripts/rolls/custom-skill-roller.js :: rollCustomSkill` | reachable-static | 0 | 0 | 4 |
| R-ROL-07 | `rolls` | `scripts/engine/rolls/swse-roll-engine.js :: SWSERollEngine` | reachable-static | 0 | 1 | 353 |
| R-ROL-08 | `rolls` | `scripts/engine/roll/roll-core.js :: RollCore.applyForcePointLogic` | reachable-static | 0 | 9 | 353 |
| R-SET-01 ⚠ | `settings-config` | `scripts/settings/custom-content-approval.js :: registerCustomContentApprovalSettings` | reachable-static | 0 | 0 | 5 |
| R-SET-02 ⚠ | `settings-config` | `scripts/settings/epic-override.js :: isEpicOverrideEnabled` | reachable-static | 0 | 0 | 51 |
| R-SET-03 ⚠ | `settings-config` | `scripts/constants/capability-slugs.js :: CAPABILITY_SLUGS` | reachable-static | 0 | 0 | 353 |
| R-SET-04 ⚠ | `settings-config` | `scripts/constants/beam-styles.js :: BEAM_STYLES` | reachable-static | 0 | 0 | 353 |
| R-SKL-01 ⚠ | `skills` | `scripts/utils/skill-normalization.js :: canonicalizeSkillKey` | reachable-static | 0 | 0 | 364 |
| R-SKL-02 ⚠ | `skills` | `scripts/engine/progression/skills/skill-registry.js :: SkillRegistry` | reachable-static | 0 | 0 | 366 |
| R-SKL-03 ⚠ | `skills` | `scripts/engine/skills/SkillRules.js :: SkillRules` | reachable-static | 0 | 0 | 353 |
| R-SKL-04 | `skills` | `scripts/engine/skills/skill-feat-resolver.js :: SkillFeatResolver` | reachable-static | 0 | 1 | 353 |
| R-SKL-05 | `skills` | `scripts/utils/skill-use-filter.js :: SkillUseFilter` | reachable-static | 1 | 2 | 53 |
| R-SKL-06 ⚠ | `skills` | `scripts/engine/skills/extra-skill-use-registry.js :: ExtraSkillUseRegistry` | reachable-static | 0 | 0 | 353 |
| R-SKL-07 ⚠ | `skills` | `scripts/engine/skills/skill-attempt-registry.js :: SkillAttemptRegistry` | reachable-static | 0 | 0 | 353 |
| R-SKL-08 ⚠ | `skills` | `scripts/engine/skills/ranked-skills-engine.js :: calculateSkillPointGrant` | reachable-static | 0 | 0 | 353 |
| R-SKL-09 ⚠ | `skills` | `scripts/engine/skill-challenges/SkillChallengeEngine.js :: SkillChallengeEngine` | reachable-static | 0 | 0 | 353 |
| R-SKL-10 ⚠ | `skills` | `scripts/skills/skill-uses.js :: JumpUses..GatherInformationUses` | orphan-unreferenced | 0 | 0 | 0 |
| R-SPC-01 | `species` | `scripts/engine/registries/species-registry.js :: SpeciesRegistry` | reachable-static | 0 | 14 | 375 |
| R-SPC-02 | `species` | `scripts/species/species-publication-selection.js :: getPublicationStatus` | reachable-static | 1 | 2 | 353 |
| R-SPC-03 | `species` | `scripts/species/species-variant-profile.js :: applySpeciesVariantProfile` | reachable-static | 0 | 14 | 364 |
| R-SPC-04 ⚠ | `species` | `scripts/species/species-grant-ledger-builder.js :: SpeciesGrantLedgerBuilder` | reachable-static | 0 | 0 | 72 |
| R-SPC-05 | `species` | `scripts/species/species-grant-reconciliation.js :: computeSpeciesGrantKey` | reachable-static | 0 | 3 | 353 |
| R-SPC-06 | `species` | `scripts/engine/progression/helpers/apply-canonical-species-to-actor.js :: applyCanonicalSpeciesToActor` | reachable-static | 0 | 4 | 78 |
| R-SPC-07 | `species` | `scripts/species/species-plan-transaction.js :: buildSpeciesReplacementPlan` | test-only-import | 1 | 3 | 3 |
| R-SPC-08 | `species` | `scripts/engine/species/SpeciesConditionalGrantResolver.js :: SpeciesConditionalGrantResolver` | reachable-static | 0 | 2 | 2 |
| R-SPC-09 ⚠ | `species` | `scripts/species/species-reroll-handler.js :: SpeciesRerollHandler` | reachable-static | 0 | 0 | 353 |
| R-SPC-10 ⚠ | `species` | `scripts/engine/species/species-activated-ability-engine.js :: SpeciesActivatedAbilityEngine` | reachable-static | 0 | 0 | 14 |
| R-SPC-11 | `species` | `scripts/species/species-anatomy-schema-v1.js :: SPECIES_ANATOMY_SCHEMA_VERSION` | reachable-static | 0 | 3 | 378 |
| R-SPC-12 ⚠ | `species` | `scripts/engine/systems/species/species-trait-engine.js :: SpeciesTraitEngine` | orphan-unreferenced | 0 | 0 | 0 |
| R-STO-01 | `store-economy` | `scripts/engine/store/transaction-engine.js :: TransactionEngine` | reachable-static | 2 | 14 | 353 |
| R-STO-02 | `store-economy` | `scripts/engine/store/transaction-engine.js :: TransactionEngine.getActorTransactions` | reachable-static | 1 | 14 | 353 |
| R-STO-03 | `store-economy` | `scripts/engine/store/ledger-service.js :: LedgerService` | reachable-static | 1 | 2 | 353 |
| R-STO-04 | `store-economy` | `scripts/engine/store/store-engine.js :: StoreEngine.purchase` | reachable-static | 2 | 2 | 54 |
| R-STO-05 | `store-economy` | `scripts/engine/store/cost-registry.js :: resolveStoreCost` | reachable-static | 1 | 1 | 355 |
| R-STO-06 | `store-economy` | `scripts/engine/store/resale-service.js :: ResaleService` | reachable-static | 1 | 1 | 353 |
| R-STO-07 | `store-economy` | `scripts/engine/store/acquisition-service.js :: StoreAcquisitionService` | reachable-static | 0 | 1 | 353 |
| R-STO-08 | `store-economy` | `scripts/apps/store/store-main.js :: SWSEStore` | reachable-static | 1 | 0 | 51 |
| R-TAL-01 ⚠ | `talents` | `data/canonical/talents.json :: (data)` | runtime-referenced | 0 | 0 | 0 |
| R-TAL-02 | `talents` | `scripts/data/talent-tree-db.js :: TalentTreeDB` | reachable-static | 2 | 5 | 370 |
| R-TAL-03 | `talents` | `scripts/engine/progression/talents/talent-tree-membership-authority.js :: getTalentMembership` | reachable-static | 1 | 4 | 55 |
| R-TAL-04 | `talents` | `scripts/registries/talent-registry.js :: TalentRegistry` | reachable-static | 1 | 4 | 371 |
| R-TAL-05 | `talents` | `scripts/data/talent-source-identity.js :: canonicalTalentId` | reachable-static | 0 | 4 | 368 |
| R-TAL-06 ⚠ | `talents` | `scripts/data/authority/talent-prerequisite-authority.js :: (authority table)` | reachable-static | 0 | 0 | 372 |
| R-TAL-07 | `talents` | `scripts/engine/talent/*-talent-actions.js :: SithTalentActions, ConsularTalentActions, ...` | — | 1 | 0 | 0 |
| R-TAL-08 | `talents` | `scripts/engine/talent/lightsaber-form-engine.js :: LightsaberFormEngine` | reachable-static | 0 | 1 | 11 |
| R-TAL-09 ⚠ | `talents` | `scripts/engine/talent/guardian-spirit-actions.js :: GuardianSpiritActions` | reachable-static | 0 | 0 | 5 |
| R-TAL-10 | `talents` | `scripts/engine/talent/sith-talent-actions.js :: SithTalentActions.registerHooks` | reachable-static | 0 | 1 | 5 |
| R-TAL-11 ⚠ | `talents` | `scripts/apps/talent-tree-workbench/custom-talent-tree-progression-overlay.js :: registerCustomTalentTreeProgressionOverlay` | reachable-static | 0 | 0 | 0 |
| R-TAL-12 ⚠ | `talents` | `scripts/apps/talent-tree-workbench/custom-content-approval-service.js :: CustomContentApprovalService` | reachable-static | 0 | 0 | 0 |
| R-TAL-13 ⚠ | `talents` | `scripts/engine/talent/minion-actions-mechanics.js :: (module)` | reachable-static | 0 | 0 | 0 |
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
