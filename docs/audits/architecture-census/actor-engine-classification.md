# 3N-AE.0 — ActorEngine method classification (assigned 2026-11-26, after AE.1 tranche 1–2)

Source: `actor-engine-method-inventory.md` (generated) at the current HEAD; line numbers are of `actor-engine.js` now. Classes are the roadmap's: KEEP_IN_FACADE, EXTRACT_PURE_HELPER, EXTRACT_INTERNAL_IMPLEMENTATION, DELEGATE_TO_EXISTING_DOMAIN_ENGINE, CONSOLIDATE_DUPLICATE, RETAIN_PENDING_PARITY, RETAIN_PENDING_OWNER_DECISION, VERIFIED_OBSOLETE. "EXTRACTED" marks work already done (delegate retained). This is a plan, not an approval of any rules change: extractions are verbatim, behavior-preserving, parity-tested first, and no extracted module persists on its own. No method is classified VERIFIED_OBSOLETE yet (needs caller/test evidence at the time).

Counts: DELEGATE_TO_EXISTING_DOMAIN_ENGINE 15; EXTRACT_INTERNAL_IMPLEMENTATION 38; KEEP_IN_FACADE 32; RETAIN_PENDING_PARITY 5; EXTRACTED (AE.1, delegate retained) 15; EXTRACT_PURE_HELPER 2.

| Method | Lines | Class | Step | Note |
|---|---|---|---|---|
| `_instrumentActorItemsForSSSTOT` | 97–137 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.7 | dev diagnostics wrapper around actor.items; belongs with SentinelEngine |
| `_applyDerivedUpdates` | 153–188 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | derived write + generation stamp; keep recalc:false semantics |
| `_refreshOpenActorApps` | 200–242 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | render refresh request; check engine->UI coupling (shell render request) |
| `recalcAll` | 254–357 | KEEP_IN_FACADE | AE.7 | public; orchestration stays, derived math is DerivedCalculator (3N-DC) |
| `_validateDerivedWriteAuthority` | 373–411 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | derived-write guard |
| `_checkIntegrity` | 418–428 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.7 | delegates to integrity checker (see F-GOV-004 cost) |
| `_detectUpdateLoop` | 442–475 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | loop guard |
| `_markActorMutationInFlight` | 483–487 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | in-flight set |
| `_clearActorMutationInFlight` | 495–504 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | in-flight set |
| `isActorMutationInFlight` | 512–514 | KEEP_IN_FACADE | AE.7 | public read |
| `_markMigrationActive` | 520–522 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | migration flag |
| `_clearMigrationActive` | 528–530 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | migration flag |
| `_isMigrationActive` | 536–538 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.7 | migration flag |
| `applyTemplate` | 544–554 | RETAIN_PENDING_PARITY | AE.7 | one caller family; verify before moving |
| `updateActor` | 573–849 | KEEP_IN_FACADE | AE.2/AE.7 | public gateway; normalization/guardrail/derived stages are extracted behind it step by step, never the entry point |
| `updateEmbeddedDocuments` | 862–927 | KEEP_IN_FACADE | - | public |
| `updateOwnedItems` | 935–937 | KEEP_IN_FACADE | - | public (thin) |
| `createEmbeddedDocuments` | 943–983 | KEEP_IN_FACADE | - | public |
| `deleteEmbeddedDocuments` | 989–1012 | KEEP_IN_FACADE | - | public |
| `moveEmbeddedDocuments` | 1035–1090 | KEEP_IN_FACADE | - | public (1 caller) |
| `applyDelta` | 1106–1208 | RETAIN_PENDING_PARITY | AE.6 | 2 callers, 0 tests: needs characterization first |
| `_preflightAdoptionPayloads` | 1257–1278 | EXTRACTED (AE.5, delegate retained) | AE.5 | apply-plan.js;  adoption payload preflight |
| `apply` | 1280–1397 | EXTRACTED (AE.5, delegate retained) | AE.5 | apply-plan.js;  public (136 callers) |
| `applyDamage` | 1424–1554 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  public; orchestration extracted to a damage coordinator behind it |
| `rechargeShields` | 1574–1599 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  shield domain |
| `applyHealing` | 1611–1672 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  public; 0 tests: characterize first |
| `setConditionStep` | 1684–1727 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  public |
| `setConditionPersistent` | 1738–1772 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  condition internals |
| `applyConditionShift` | 1784–1831 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  public (0 tests) |
| `incrementPersistentConditionSteps` | 1837–1854 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  condition internals |
| `_settleForcePointRescue` | 1863–1878 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  FP rescue |
| `_maybeResolveForcePointRescue` | 1900–1972 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  FP rescue; uses FP ledger |
| `recoverConditionStep` | 1981–2028 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  0 callers/tests: confirm obsolete (VERIFIED_OBSOLETE?) before moving |
| `updateActionEconomy` | 2040–2072 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  turn-economy write (runtime-risk area) |
| `gainForcePoints` | 2080–2112 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public |
| `spendForcePoints` | 2119–2194 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public; ledger stays single (no second ledger) |
| `listUnsettledForcePointReceipts` | 2202–2212 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  receipt reads |
| `reconcileForcePointReceipt` | 2219–2233 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  receipts |
| `rollbackForcePointSpend` | 2239–2291 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public (15 callers) |
| `finalizeForcePointSpend` | 2297–2325 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public |
| `dispatchForcePointTriggers` | 2331–2359 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  trigger dispatch |
| `ackForcePointTrigger` | 2362–2373 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  trigger ack |
| `recordOutgoingAttackEvent` | 2385–2393 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | attack-event record |
| `setOutgoingAttackEventState` | 2395–2405 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | attack-event record |
| `grantRegimenEntitlement` | 2412–2431 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | regimen |
| `recordRegimenFailure` | 2433–2438 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | regimen |
| `releaseAttackEventAsDefender` | 2441–2450 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | attack-event record |
| `consumeAttackEventAsDefender` | 2452–2461 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.4 | attack-event record |
| `spendDestinyPoints` | 2469–2523 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public |
| `rollbackDestinyPointSpend` | 2526–2542 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public |
| `finalizeDestinyPointSpend` | 2548–2569 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  public |
| `dispatchDestinyPointTriggers` | 2572–2599 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  trigger dispatch |
| `ackDestinyPointTrigger` | 2602–2613 | EXTRACTED (AE.4, delegate retained) | AE.4 | point-ledgers.js;  trigger ack |
| `applySecondWind` | 2625–2746 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  public; SecondWindEngine rules stay in the domain engine |
| `resetSecondWind` | 2757–2790 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  second wind |
| `applySecondWindEdgeOfExhaustion` | 2808–2849 | EXTRACTED (AE.6, delegate retained) | AE.6 | damage-condition-orchestration.js;  second wind (0 tests) |
| `applyProgression` | 2874–3031 | RETAIN_PENDING_PARITY | AE.5 | 158 lines, 4 callers, 0 tests: characterize against ProgressionFinalizer before moving |
| `restoreFromSnapshot` | 3046–3050 | KEEP_IN_FACADE | AE.5 | public (thin) |
| `buildEmbeddedCreatePlan` | 3067–3070 | EXTRACTED (AE.1, delegate retained) | AE.1 | plan-builders.js |
| `buildEmbeddedDeletePlan` | 3081–3084 | EXTRACTED (AE.1, delegate retained) | AE.1 | plan-builders.js |
| `buildEmbeddedReplacePlan` | 3096–3099 | EXTRACTED (AE.1, delegate retained) | AE.1 | plan-builders.js |
| `buildCloneActorPlan` | 3113–3116 | EXTRACTED (AE.1, delegate retained) | AE.1 | plan-builders.js |
| `executeEmbeddedPlan` | 3126–3193 | KEEP_IN_FACADE | AE.5 | public executor of plans (1 caller) |
| `buildDerivedState` | 3202–3204 | EXTRACTED (AE.1, delegate retained) | AE.1 | mutation-plan-helpers.js |
| `applyMutationPlan` | 3235–3371 | KEEP_IN_FACADE | AE.5 | public; bucket stage functions extracted behind it (tests: 50) |
| `_validateRecoverySnapshot` | 3382–3384 | EXTRACTED (AE.1, delegate retained) | AE.1 | mutation-plan-helpers.js |
| `restoreSnapshotVerified` | 3399–3444 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  public; verified-restore certification stays here |
| `captureRecoverySnapshot` | 3453–3461 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  public |
| `_rollbackTransactionalPlan` | 3484–3558 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  rollback; TE depends on its semantics (F-ACT-003) |
| `_validateMutationPlan` | 3564–3566 | EXTRACTED (AE.1, delegate retained) | AE.1 | mutation-plan-helpers.js |
| `_applyCreateOps` | 3573–3616 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  bucket stage |
| `_rewriteTemporaryIds` | 3623–3625 | EXTRACTED (AE.1, delegate retained) | AE.1 | mutation-plan-helpers.js |
| `_applyDeleteOps` | 3631–3668 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  bucket stage |
| `_applySetOps` | 3674–3704 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  bucket stage |
| `_applyUpdateOps` | 3710–3757 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  bucket stage |
| `_applyAddOps` | 3763–3802 | EXTRACTED (AE.5, delegate retained) | AE.5 | plan-stages.js;  bucket stage |
| `applyRepair` | 3816–3921 | RETAIN_PENDING_PARITY | AE.6 | 106 lines, 1 caller, 0 tests: characterize first (vehicle repair rules = domain) |
| `updateActorFlags` | 3941–3976 | KEEP_IN_FACADE | AE.3 | public; recalc:false semantics must be preserved |
| `unsetActorFlag` | 3989–4021 | KEEP_IN_FACADE | AE.3 | public |
| `updateActiveEffects` | 4032–4059 | KEEP_IN_FACADE | AE.3 | public |
| `updateOwnedItemEffects` | 4065–4082 | KEEP_IN_FACADE | AE.3 | public (added 3D) |
| `recomputeHP` | 4099–4124 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.6 | HP accounting authority (hp-accounting) — delegate |
| `createActiveEffects` | 4136–4172 | KEEP_IN_FACADE | AE.3 | public |
| `deleteActiveEffects` | 4184–4210 | KEEP_IN_FACADE | AE.3 | public |
| `_normalizeMutationForContract` | 4226–4228 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates to MutationNormalizationService |
| `_initializeCanonicalShapesForTouchedDomains` | 4240–4274 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.2 | uses extracted shape helpers |
| `_validateCanonicalMutationPlan` | 4287–4320 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.2 | contract validation (MutationBoundaryService candidate) |
| `_classifyOperationIntent` | 4335–4337 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_auditSemanticBoundaries` | 4340–4342 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_auditEmbeddedItemBoundaries` | 4345–4347 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_enforceStrictSemanticBoundaries` | 4378–4395 | EXTRACT_INTERNAL_IMPLEMENTATION | AE.2 | strict-mode enforcement |
| `_applyPhase3Guardrails` | 4402–4404 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_guardrailAbilitiesMirrorWrites` | 4407–4409 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_normalizeAbilityPathsForContract` | 4420–4422 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_normalizeClassPathsForContract` | 4425–4427 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_normalizeSkillStructureForContract` | 4430–4432 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_normalizeDefensePathsForContract` | 4435–4437 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_normalizeXpPathsForContract` | 4440–4442 | DELEGATE_TO_EXISTING_DOMAIN_ENGINE | AE.2 | already delegates |
| `_getCanonicalAbilityBase` | 4458–4460 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_getCanonicalAbilityMod` | 4471–4473 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_ensureCanonicalAbilityShapes` | 4493–4495 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_ensureCanonicalSkillShapes` | 4508–4510 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_ensureCanonicalDefenseShapes` | 4517–4519 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_ensureCanonicalXpShape` | 4525–4527 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_ensureCanonicalHpShape` | 4533–4535 | EXTRACTED (AE.1, delegate retained) | AE.1 | canonical-actor-shapes.js |
| `_normalizeAbilityPaths` | removed | VERIFIED_OBSOLETE (removed AE.2) | AE.2 | no callers; duplicate of MutationNormalizationService._normalizeAbilityPaths |
| `_normalizeXpPaths` | removed | VERIFIED_OBSOLETE (removed AE.2) | AE.2 | no callers; duplicate of MutationNormalizationService._normalizeXpPaths |
