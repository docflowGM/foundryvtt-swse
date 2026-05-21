# ActorEngine Responsibility Audit — Measure Twice, Cut Once

**Date:** 2026-05-20  
**File audited:** `scripts/governance/actor-engine/actor-engine.js` (4,957 lines)  
**Branch:** `claude/plan-extraction-design-D527w`

---

## 1. Executive Summary

`ActorEngine` is a 4,957-line flat object literal. It correctly serves as the **single public mutation gateway** for the system — imported by 271 files with no rival public facade. The design intent is sound: all actor mutations must route through it.

However, it has accreted far more domain behavior than a gateway should own. It currently contains: inline domain rule logic for Second Wind (feat rules, CON computation, combat flag coordination), Force Point rescue dialog coordination, HP formula computation, inline derived write enforcement, mutation normalization for 5 schema domains, plan-builder helpers, plan-execution helpers, snapshot restoration, and the full MutationPlan sub-system's execution layer. Many of these are good candidates for extraction **behind** the facade.

**Two internal stale modules exist and are correctly labeled unwired:**
- `internal/actor-engine-validation.js` — stale, partially divergent (missing defense normalization). Do not wire.
- `internal/actor-engine-derived.js` — stale, live version is current. Do not wire.

**Architectural target:** ActorEngine owns the doorway. Other modules own the rooms.

---

## 2. Public API Inventory

| # | Method | Line Range | Responsibility Category | Stay as Facade? | Implementation Moveable? | Extraction Risk |
|---|--------|-----------|------------------------|----------------|--------------------------|----------------|
| 1 | `isActorMutationInFlight(actorId)` | 446–448 | In-flight guard (read) | Yes | No — guard state is engine-local | Low |
| 2 | `applyTemplate(actor, templateData)` | 478–488 | Thin orchestrator | Yes | Already thin | Low |
| 3 | `updateActor(actor, data, opts)` | 507–750 | Core mutation gateway | Yes — must stay | No — this IS the gateway | Critical |
| 4 | `updateEmbeddedDocuments(actor, name, updates, opts)` | 763–824 | Embedded mutation gateway | Yes | No | Critical |
| 5 | `updateOwnedItems(actor, updates, opts)` | 832–834 | Convenience alias | Yes | Already thin alias | Low |
| 6 | `createEmbeddedDocuments(actor, name, data, opts)` | 840–866 | Embedded creation gateway | Yes | No | Critical |
| 7 | `deleteEmbeddedDocuments(actor, name, ids, opts)` | 872–895 | Embedded deletion gateway | Yes | No | Critical |
| 8 | `moveEmbeddedDocuments(srcActor, tgtActor, name, ids, opts)` | 918–973 | Cross-actor transfer | Yes — coordination | No | Medium |
| 9 | `applyDelta(actor, delta)` | 989–1091 | Progression delta applier | Facade — routes to primitives | Partially | Medium |
| 10 | `apply(actor, mutationPlan, opts)` | 1163–1280 | Universal mutation acceptor | Yes — orchestrates adoption/standard | No | High |
| 11 | `applyDamage(actor, damagePacket)` | 1307–1399 | Combat domain gateway | Yes — gateway | Implementation could move to combat service | High |
| 12 | `applyHealing(actor, amount, source)` | 1411–1471 | HP restoration | Yes | Implementation moveable | Medium |
| 13 | `setConditionStep(actor, step, source)` | 1483–1525 | Condition mutation | Yes | Could delegate to ConditionEngine | Medium |
| 14 | `setConditionPersistent(actor, persistent, source)` | 1536–1570 | Condition mutation | Yes | Same as above | Medium |
| 15 | `applyConditionShift(actor, dir, source)` | 1582–1629 | Condition mutation | Yes | Same | Medium |
| 16 | `incrementPersistentConditionSteps(actor, amount, source)` | 1635–1652 | Condition mutation | Yes | Same | Medium |
| 17 | `recoverConditionStep(actor, source)` | 1709–1756 | Condition + combat recovery | Yes | Needs ConditionEngine extraction | High |
| 18 | `updateActionEconomy(actor, actionEconomy)` | 1768–1800 | Combat economy | Yes | Extractable to CombatEngine | Low |
| 19 | `gainForcePoints(actor, amount)` | 1808–1843 | Resource domain | Yes | Moveable to ForcePointsService | Medium |
| 20 | `spendForcePoints(actor, amount)` | 1850–1883 | Resource domain | Yes | Moveable to ForcePointsService | Medium |
| 21 | `spendDestinyPoints(actor, amount)` | 1891–1924 | Resource domain | Yes | Moveable to ForcePointsService | Medium |
| 22 | `applySecondWind(actor, opts)` | 1936–2082 | Combat/resource domain | Yes — but too fat | SecondWindEngine | High |
| 23 | `resetSecondWind(actor)` | 2093–2129 | Reset pattern | Yes | Same | Medium |
| 24 | `applySecondWindEdgeOfExhaustion(actor)` | 2147–2220 | Variant rule | Yes | Same | Medium |
| 25 | `applyProgression(actor, packet)` | 2245–2403 | Progression domain | Yes — dangerous | **Frozen** | Very High |
| 26 | `applyTalentEffect(plan, opts)` | 2425–2626 | Talent domain | Yes — orchestrator | Could extract loop to TalentEffectEngine | Medium |
| 27 | `restoreFromSnapshot(actor, snapshot, opts)` | 2641–2725 | Migration/repair | Yes | Extractable to SnapshotService | Medium |
| 28 | `buildEmbeddedCreatePlan(actor, name, docs)` | 2742–2797 | Plan builder (non-mutating) | Yes | Extractable to PlanBuilderUtil | Low |
| 29 | `buildEmbeddedDeletePlan(actor, name, ids)` | 2808–2863 | Plan builder | Yes | Same | Low |
| 30 | `buildEmbeddedReplacePlan(actor, name, ids, docs)` | 2875–2938 | Plan builder | Yes | Same | Low |
| 31 | `buildCloneActorPlan(actor, mods, opts)` | 2952–2990 | Plan builder | Yes | Same | Low |
| 32 | `executeEmbeddedPlan(plan, opts)` | 3000–3067 | Plan execution | Yes | Thin — routes to primitives | Low |
| 33 | `buildDerivedState(actor)` | 3076–3105 | Read-only computed view | **No — should not be here** | Move to sheet context builder | Low |
| 34 | `applyMutationPlan(actor, plan, opts)` | 3130–3211 | Progression plan execution | Yes — critical | **Frozen** | Very High |
| 35 | `updateActorFlags(actor, scope, key, value, opts)` | 3711–3744 | Flag mutation | Yes | Could be thinner | Low |
| 36 | `unsetActorFlag(actor, scope, key, opts)` | 3757–3789 | Flag mutation | Yes | Same | Low |
| 37 | `updateActiveEffects(actor, updates, opts)` | 3800–3826 | Active effects mutation | Yes | Same | Low |
| 38 | `recomputeHP(actor, opts)` | 3843–3950 | HP formula | Yes — but owns too much | HPCalculator | High |
| 39 | `createActiveEffects(actor, data, opts)` | 3962–3988 | Active effects mutation | Yes | Same | Low |
| 40 | `deleteActiveEffects(actor, ids, opts)` | 4000–4026 | Active effects mutation | Yes | Same | Low |
| 41 | `recalcAll(actor)` | 178–291 | Derived pipeline orchestrator | Yes | No — this IS the pipeline | Critical |

---

## 3. Private/Helper Responsibility Table

### Group: In-flight / Reentrancy Guards
- `_markActorMutationInFlight(actorId)` — reference-counted in-flight tracker
- `_clearActorMutationInFlight(actorId)` — decrements ref count
- `_detectUpdateLoop(actor, source)` — cascade detection, 5x/50ms window
- `_markMigrationActive` / `_clearMigrationActive` / `_isMigrationActive` — migration recursion guard

### Group: Validation / Semantic Diagnostics
- `_validateDerivedWriteAuthority(changes, actor, opts)` — blocks derived writes outside calc cycle
- `_validateCanonicalMutationPlan(data, actor)` — coherence conflict detection (warning-only)
- `_validateMutationPlan(plan)` — applyMutationPlan structural validation
- `_auditSemanticBoundaries(updateData, flatData, actor, cat, opts)` — Phase 1/2 evidence collector
- `_auditEmbeddedItemBoundaries(updates, actor, opts)` — embedded item diagnostic
- `_classifyOperationIntent(data, opts, actor)` — source-based mutation classifier

### Group: Canonical Shape Normalization
- `_normalizeMutationForContract(data, actor)` — master normalizer (5 domain sub-calls)
- `_normalizeAbilityPathsForContract(flat)` — `.value`→`.base` in abilities
- `_normalizeClassPathsForContract(flat)` — legacy class scalar warnings
- `_normalizeSkillStructureForContract(flat, actor)` — coerce leaf properties only
- `_normalizeDefensePathsForContract(flat)` — fort/ref aliases, miscMod→misc.user.extra
- `_normalizeXpPathsForContract(flat)` — experience→xp.total
- `_normalizeAbilityPaths(data)` — older standalone version (superseded by ForContract version)
- `_normalizeXpPaths(data)` — older standalone version (superseded)

### Group: Canonical Shape Initialization
- `_initializeCanonicalShapesForTouchedDomains(data, actor)` — dispatches to ensure-* helpers
- `_ensureCanonicalAbilityShapes(actor)` — seeds system.abilities object shapes
- `_ensureCanonicalSkillShapes(actor, flat)` — creates missing skill containers
- `_ensureCanonicalDefenseShapes(actor)` — seeds defense containers (fort/ref/will)
- `_ensureCanonicalXpShape(actor)` — creates system.xp if missing
- `_ensureCanonicalHpShape(actor)` — creates system.hp if missing

### Group: Phase 3 Guardrails
- `_applyPhase3Guardrails(flatData, cat, actor, opts)` — router to specific guardrails
- `_guardrailAbilitiesMirrorWrites(flat, cat, actor, opts)` — system.abilities.*.base → system.attributes.*.base

### Group: Canonical Ability Read Helpers
- `_getCanonicalAbilityBase(actor, key, fallback)` — attributes → abilities fallback read
- `_getCanonicalAbilityMod(actor, key)` — derived mod → computed fallback

### Group: Actor Update / Render
- `_applyDerivedUpdates(actor, updates)` — merge DerivedCalculator snapshot into actor.system.derived
- `_refreshOpenActorApps(actor, opts)` — queueMicrotask render for open sheets
- `_instrumentActorItemsForSSSTOT(actor)` — WeakMap-guarded SSOT violation reporter

### Group: MutationPlan Sub-system (applyMutationPlan helpers)
- `_applyCreateOps(specs, tempIdMap, source)` — create world actors, build tempId map
- `_rewriteTemporaryIds(addBucket, tempIdMap)` — rewrite temp→real IDs
- `_applyDeleteOps(actor, deleteOps, source)` — route delete bucket
- `_applySetOps(actor, setOps, source)` — route set bucket
- `_applyUpdateOps(actor, updateOps, source)` — route update bucket
- `_applyAddOps(actor, addOps, source)` — route add bucket

### Group: Force/Rescue
- `_maybeResolveForcePointRescue(actor, resolution, packet)` — async dialog + FP spend + mutates resolution packet

### Group: Adoption Preflight
- `_preflightAdoptionPayloads(mutationPlan)` — validates replacement payloads before destructive adoption

---

## 4. Existing Infrastructure Map

| Module | Path | Active/Imported? | Owns What | Duplicates AE? | Can Absorb? | Stale? | Parity Work |
|--------|------|-----------------|-----------|---------------|------------|--------|------------|
| `actor-engine-validation.js` | `governance/actor-engine/internal/` | **No — unwired** | Validation/normalization snapshot | Yes, divergent (missing defense normalization) | **Do not wire** | Stale/divergent | Full method diff before deletion |
| `actor-engine-derived.js` | `governance/actor-engine/internal/` | **No — unwired** | recalcAll snapshot | Yes, live is current | **Do not wire** | Stale | PrerequisiteIntegrityChecker audit before deletion |
| `MutationInterceptor` | `governance/mutation/` | Yes | Enforcement level, context set/clear | None | Could absorb context lifecycle | Current | None |
| `PreflightValidator` | `governance/enforcement/preflight-validator.js` | Yes (applyRepair only) | Structural validation + EnforcementPolicy | None | Could absorb pre-mutation structural check | Current | Needs AE integration for more methods |
| `DerivedCalculator` | `actors/derived/derived-calculator.js` | Yes | Pure derived computation, ALL derived values | None — it is the target | Already absorbs derived math | Current | None |
| `HPCalculator` | `actors/derived/hp-calculator.js` | Yes (via DerivedCalculator) | HP formula math | None | Could absorb recomputeHP formula body | Current | Full formula parity audit needed |
| `BABCalculator` | `actors/derived/bab-calculator.js` | Yes | BAB computation | None | Correctly used | Current | None |
| `DefenseCalculator` | `actors/derived/defense-calculator.js` | Yes | Defense totals | None | Correctly used | Current | None |
| `ModifierEngine` | `engine/effects/modifiers/ModifierEngine.js` | Yes | Modifier aggregation/bundle | Known impurity: writes directly to system.derived.* | Phase 2C target | Current/impure | Refactor to return bundle only |
| `DamageResolutionEngine` | `engine/combat/damage-resolution-engine.js` | Yes (dynamic import in applyDamage) | Pure damage resolution | None — clean contract | Already the domain owner | Current | None |
| `ConditionEngine` | `engine/combat/ConditionEngine.js` | Yes | Condition step logic, read-only | None — delegates mutations to AE | Could absorb condition setter body | Current | Parity check needed |
| `ConditionTrackRules` | `engine/combat/ConditionTrackRules.js` | Yes | House rule reads for condition track | None | Can supply rules to condition methods | Current | None |
| `SecondWindEngine` | `engine/combat/SecondWindEngine.js` | Yes | Second wind logic | Possibly — AE owns full inline implementation | Could absorb applySecondWind body | Current | Full coverage audit needed |
| `ForcePointsService` | `engine/force/force-points-service.js` | Yes (dynamic import in _maybeResolveForcePointRescue) | Force point eligibility | None | Could absorb gain/spendForcePoints body | Current | Integration needed |
| `StoreTransactionEngine` | `engine/store/store-transaction-engine.js` | Yes (imports AE) | Store-level multi-actor coordination | None — uses AE correctly | Already the domain owner | Current | None |
| `MutationCoordinator` | `apps/progression-framework/shell/mutation-coordinator.js` | Yes | Chargen validation+compile flow | None — delegates to AE | Already the domain owner | Current | None |
| `MutationPlan` | `apps/progression-framework/shell/mutation-plan.js` | Yes | Plan compilation from projection | None | Already the domain owner | Current | None |
| `ProgressionFinalizer` | `apps/progression-framework/shell/progression-finalizer.js` | Yes | Progression session → mutation plan | None — calls AE.applyMutationPlan | Already the domain owner | Current | None |
| `HPRecomputeHooks` | `governance/actor-engine/hp-recompute-hooks.js` | Yes (Hooks.on) | Hook registry for HP trigger events | None | Already the domain owner | Current | None |

---

## 5. Responsibility-to-Owner Map

| Responsibility | Current AE Methods | True Gateway? | Domain Logic? | Existing Candidate Owner | Recommended Future Owner | Extraction Readiness | Risk if Moved | Risk if Left |
|---------------|-------------------|--------------|--------------|--------------------------|--------------------------|---------------------|--------------|-------------|
| Mutation context + in-flight guard | `isActorMutationInFlight`, `_mark*`, `_detect*` | Yes | No | MutationInterceptor | Keep in AE / expose via MutationInterceptor | Do not move yet | High — lifecycle coupled | Low |
| Derived calc pipeline | `recalcAll`, `_applyDerivedUpdates` | Yes — orchestrates | No — delegates | DerivedCalculator | Keep orchestration in AE; DC owns math | Do not move yet | Critical — sequencing | Low |
| Canonical normalization (5 domains) | `_normalizeMutationForContract` + 5 sub-helpers | Partial | Yes | None (stale internal is not safe) | New `MutationNormalizationService` | Needs design | Medium | Medium — growing |
| Canonical shape initialization | `_initializeCanonicalShapesForTouchedDomains` + 5 `_ensure*` | No — data hydration | Yes | None | New `SchemaHydrationService` | Needs design | Low–Medium | Low |
| Phase 1/2 semantic audit | `_auditSemanticBoundaries`, `_classifyOperationIntent` | Diagnostic only | No | GovernanceDiagnostics | Move to GovernanceDiagnostics over time | Needs design | Low | Low |
| Phase 3 guardrails | `_applyPhase3Guardrails`, `_guardrailAbilitiesMirrorWrites` | Enforcement | Partial | None | Keep in AE until abilities SSOT is settled | Do not move yet | High | Medium |
| Embedded doc CRUD | `createEmbeddedDocuments`, `updateEmbeddedDocuments`, `deleteEmbeddedDocuments` | Yes | No | — | Stay in AE (gateway contract) | Stay | N/A | N/A |
| HP formula | `recomputeHP` | Thin wrapper | Yes | HPCalculator | HPCalculator owns formula; AE routes | Ready (after parity audit) | Medium | Medium — formula drift |
| HP damage/healing | `applyDamage`, `applyHealing` | Yes | Partial | DamageResolutionEngine | AE stays facade; DRE owns resolution | Already partially done | Medium | Low |
| Condition mutations | `setConditionStep`, `applyConditionShift`, etc. | Yes | Partial | ConditionEngine | ConditionEngine owns logic; AE gateway | Needs parity check | Medium | Low |
| Second Wind rules | `applySecondWind`, `resetSecondWind`, `applySecondWindEdgeOfExhaustion` | Partial — owns rules inline | Yes | SecondWindEngine | SecondWindEngine | Needs parity | High — feat integration | Medium |
| Force/Destiny point resource | `gainForcePoints`, `spendForcePoints`, `spendDestinyPoints` | Yes | Partial | ForcePointsService | ForcePointsService | Ready | Low | Low |
| Force rescue coordination | `_maybeResolveForcePointRescue` | Orchestration | Yes | None (partial in FPS) | ForcePointsService + ForceRescueService | Needs design | High — dialog + mutation | Medium |
| Action economy | `updateActionEconomy` | Yes — thin | No | CombatEngine | CombatEngine wrapper | Ready | Low | Low |
| Progression application | `applyProgression`, `applyMutationPlan` + sub-ops | Yes — orchestration | Partial | ProgressionFinalizer | Stay — too entangled | Do not move | Very High | Low |
| Plan builders | `buildEmbedded*Plan`, `buildCloneActorPlan` | No — utility | No | None | New `PlanBuilderUtil` | Ready | Low | Low |
| Snapshot restoration | `restoreFromSnapshot` | Partial | No | None | New `SnapshotService` | Needs design | Low | Low |
| Derived state build | `buildDerivedState` | No — read-only view | No | Sheet context builders | Sheet context builder | Ready | Low | Low |
| Talent effect orchestration | `applyTalentEffect` | Yes | Partial | None | TalentEffectEngine owns; AE routes | Needs parity | Medium | Low |
| Flag mutations | `updateActorFlags`, `unsetActorFlag` | Yes — thin | No | — | Stay in AE (already thin) | Stay | Low | Low |
| Active effect CRUD | `createActiveEffects`, `updateActiveEffects`, `deleteActiveEffects` | Yes — thin wrappers | No | EffectSanitizer | Stay in AE with possible delegation | Ready | Low | Low |
| Repair application | `applyRepair` | Yes | Partial | None | New `RepairService` | Needs design | Low | Low |
| Adoption | `apply` (adoption path), `_preflightAdoptionPayloads` | Yes | Partial | — | Stay in AE — identity mutation is core | Do not move | High | Low |

---

## 6. Extraction Readiness Ranking

### Group A — Extractable Now (low blast radius, clear owner)

1. **`buildDerivedState`** → Sheet context builder or `BreakdownIntegration.js`. Pure read, no mutations, no AE-internal state. Zero risk.
2. **Plan builder methods** (`buildEmbeddedCreatePlan`, `buildEmbeddedDeletePlan`, `buildEmbeddedReplacePlan`, `buildCloneActorPlan`) → `PlanBuilderUtil` or attached to `MutationPlan`. Non-mutating, no AE internal access.
3. **`gainForcePoints`, `spendForcePoints`, `spendDestinyPoints`** → Logic body moves to `ForcePointsService`. AE public surface stays; implementation delegates.
4. **`updateActionEconomy`** → Already essentially a one-liner; AE method becomes a one-line delegate to CombatEngine.

### Group B — Extractable with Parity Work (medium blast radius, domain owner exists)

5. **`recomputeHP` body → `HPCalculator`** — Formula math moves; write authority stays in AE. Needs: full formula parity audit.
6. **Condition methods** (`setConditionStep`, `setConditionPersistent`, `applyConditionShift`, `incrementPersistentConditionSteps`) → ConditionEngine already exists. These become thin delegates. Needs: parity check of persistent-steps logic.
7. **`restoreFromSnapshot`** → Extract to `SnapshotService`. Self-contained, needs clear service interface.
8. **`applyRepair`** → `RepairService` wrapping PreflightValidator.

### Group C — Needs Design Before Extraction

9. **Normalization pipeline** (`_normalizeMutationForContract` + 5 sub-helpers + 5 `_ensure*` helpers) → `MutationNormalizationService`. Hot path in every `updateActor` call. The `_initializeCanonicalShapesForTouchedDomains` call mutates the live actor object in-place before Foundry update — moving this out requires preserving that side effect carefully. The two stale internal modules must be formally closed before a new service is created.
10. **Second Wind group** → `SecondWindEngine`. `applySecondWind` does 4 discrete things: reads feat rules, computes healing, applies condition, grants actions. Full SecondWindEngine coverage audit + MetaResourceFeatResolver integration required.
11. **`_maybeResolveForcePointRescue`** → Shows a dialog (side effect), mutates in-memory resolution packet, calls spendForcePoints. Needs dedicated async dialog coordinator.

---

## 7. Recommended Phased Extraction Plan

### Phase E1: Zero-risk reads
**Goal:** Remove pure-read / non-mutating methods from AE.  
**Methods:** `buildDerivedState`, `buildEmbeddedCreatePlan`, `buildEmbeddedDeletePlan`, `buildEmbeddedReplacePlan`, `buildCloneActorPlan`  
**Destination:** `scripts/utils/plan-builders.js`, sheet context builders  
**Preconditions:** Audit callers; confirm none rely on `this` context or AE state.  
**Validation:** Static grep confirms zero callers broken.  
**Rollback risk:** Very low — methods can remain as deprecated re-exports in AE.

### Phase E2: Resource point delegation
**Goal:** ForcePointsService owns gain/spend logic; AE delegates.  
**Methods:** `gainForcePoints`, `spendForcePoints`, `spendDestinyPoints`  
**Destination:** `scripts/engine/force/force-points-service.js`  
**Preconditions:** Confirm ForcePointsService active. Confirm all callers route through AE.  
**Validation:** AE public signature unchanged. Runtime smoke test on sheet FP clicks.  
**Rollback risk:** Low.

### Phase E3: HP formula delegation
**Goal:** `recomputeHP` delegates formula math to HPCalculator; write authority stays in AE.  
**Methods:** `recomputeHP` (formula body only)  
**Destination:** `scripts/actors/derived/hp-calculator.js`  
**Preconditions:** Full parity audit of HPCalculator.computeMaxHP() vs AE.recomputeHP() formula. Verify `system.attributes` vs `system.abilities` fallback chain is identical.  
**Validation:** Level-up and CON-change scenarios produce same HP values before/after.  
**Rollback risk:** Medium — HP is gameplay-critical. Keep old formula commented in AE for one release.

### Phase E4: Condition method delegation
**Goal:** Condition setters delegate to ConditionEngine for decision logic.  
**Methods:** `setConditionStep`, `setConditionPersistent`, `applyConditionShift`, `incrementPersistentConditionSteps`  
**Destination:** `scripts/engine/combat/ConditionEngine.js`  
**Preconditions:** ConditionEngine parity audit. `recoverConditionStep` needs 3-swift-action counter that reads combat state — keep AE as orchestrator, CE as rule logic.  
**Validation:** Manual combat condition track cycle.  
**Rollback risk:** Medium.

### Phase E5: Second Wind delegation
**Goal:** Second Wind methods delegate to SecondWindEngine.  
**Methods:** `applySecondWind`, `resetSecondWind`, `applySecondWindEdgeOfExhaustion`  
**Destination:** `scripts/engine/combat/SecondWindEngine.js`  
**Preconditions:** Full SecondWindEngine API audit. MetaResourceFeatResolver integration preserved. `hasToughAsNails` check portable.  
**Validation:** Second Wind combat cycle, houserule toggle, Edge of Exhaustion.  
**Rollback risk:** High — second wind has 7 distinct rules paths. Keep AE implementation until test coverage confirms parity.

### Phase E6: Normalization service extraction
**Goal:** `_normalizeMutationForContract` and all sub-helpers move to a `MutationNormalizationService`.  
**Methods:** `_normalizeMutationForContract`, 5 `_normalize*ForContract` helpers, `_initializeCanonicalShapesForTouchedDomains`, 5 `_ensure*` helpers, older `_normalizeAbilityPaths`/`_normalizeXpPaths`  
**Destination:** `scripts/governance/mutation/mutation-normalization-service.js`  
**Preconditions:** Stale internal modules formally closed (deleted or archived) before the new service is created. Defense normalization gap documented as resolved.  
**Validation:** Full payload round-trip test for each normalized domain.  
**Rollback risk:** Medium — hot path in every `updateActor` call.

---

## 8. What Not to Touch Yet

### `applyProgression` (lines 2245–2403)
Contains 7 distinct phases with nested mutation context override (`blockNestedMutations: true`), explicit DerivedCalculator+ModifierEngine inline calls bypassing `recalcAll`, XP level computation, item create/delete batching, and hooks. The suppression of `recalcAll` and direct calculator invocation is intentional to prevent double-recompute during level-up. Do not touch.

### `applyMutationPlan` (lines 3130–3211) + sub-ops
Final commit handler for ProgressionFinalizer. Supports temporary actor IDs, cross-session ID rewriting, and a non-standard `create.actors` bucket for world actor creation. ProgressionFinalizer's `_resolveActorEngine()` uses 4 fallback candidates. The sub-ops are tightly coupled to the plan schema. Do not touch until ProgressionFinalizer's schema stabilizes.

### `apply` (adoption path, lines 1179–1213)
The adoption path does destructive delete-all-embedded before create-replacement. The preflight runs before any deletion. Moving this logic decouples the preflight from the destructive delete, which is the primary safety property. Do not touch.

### `_maybeResolveForcePointRescue` (lines 1659–1700)
Shows a dialog mid-mutation, mutates the in-memory resolution packet, and calls `spendForcePoints`. The dialog return value directly controls whether damage resolution proceeds to death/destruction. The in-memory mutation prevents a second Foundry persistence call. Do not touch until a proper async coordination pattern is designed.

### `recalcAll` (lines 178–291)
The sequencing of: `_isDerivedCalcCycle` flag → DerivedCalculator → ModifierEngine (impure) → integrity check is sensitive. ModifierEngine is documented as impure (Phase 2C). The `_isDerivedCalcCycle` guard prevents the integrity check from running inside a derived cycle. Do not touch until ModifierEngine impurity is resolved.

### Phase 3 guardrail pipeline inside `updateActor`
The sequence: normalize → initializeShapes → validate → classify → audit → guardrails → atomic update is a carefully ordered hot path. Each step produces data consumed by the next. Do not split before architecture is validated at runtime.

### `_validateDerivedWriteAuthority`
Must stay inline in `updateActor` because it must see `_isDerivedCalcCycle` and `options.isDerivedCalculatorCall` together. Moving to an external validator weakens enforcement.

---

## 9. Script Strategy for Future Extraction

**Pre-extraction snapshot:** Before each phase, capture a machine-readable inventory of: every public method name + parameter count in AE, every file importing AE, and every method-call reference. Diff against post-extraction to detect unintended API changes.

**Method move approach:** For each extracted method, keep an AE delegate stub that calls the new service owner. The stub logs a deprecation trace (not a warning) in non-strict mode. The stub is the compatibility shim for the two-release transition period. Never delete the stub in the same PR as the extraction.

**Import/export changes:** For domain logic extractions (ConditionEngine, SecondWindEngine, ForcePointsService), the import in AE becomes a lazy dynamic import — matching the existing pattern used for DamageResolutionEngine and ForcePointsService — to avoid circular dependencies. For utility extractions (PlanBuilderUtil, NormalizationService), static imports are appropriate.

**Call-site compatibility:** All 271 importing files call `ActorEngine.methodName`. Since methods are delegates, no call sites change. The only change is internal.

**Static search validation:** After each extraction, confirm no external caller directly reached the new service bypassing AE. Also confirm the old AE body is no longer present by grepping for a distinctive internal string from the extracted logic.

**Representative runtime tests for each phase:**
- Condition: apply damage until CT shifts, confirm condition track steps correctly
- Second Wind: use in combat, confirm uses decrement and HP restores
- HP formula: level up a character, confirm HP recalculates
- Force Points: gain/spend, confirm FP value persists

---

## 10. Open Questions / Runtime Validation Needed

1. **`actor-engine-validation.js` deletion safety:** Run method-by-method diff confirming `_normalizeDefensePathsForContract` and `_ensureCanonicalDefenseShapes` have no equivalents in the stale file and no code path can accidentally call it. Currently safe (unwired).

2. **`actor-engine-derived.js` deletion safety:** Verify `recalcAll` already calls `this._checkIntegrity(actor)` → `PrerequisiteIntegrityChecker.evaluate(actor)` in production (not skipped by flag or silent error). Once confirmed, the stale file is purely redundant.

3. **ModifierEngine impurity (Phase 2C):** `ModifierEngine.applyComputedBundle()` writes directly to `system.derived.*` and is non-idempotent. Must answer: does calling `recalcAll` twice in succession produce stable or accumulating derived values? Measure before any recalc pipeline changes.

4. **`applyProgression` context leak:** Verify the nested `MutationInterceptor.setContext('ActorEngine.updateActor')` call inside `applyProgression`'s outer `blockNestedMutations: true` context does not override the outer flag. Current code suggests the string context object lacks `.blockNestedMutations`, so the nested block check would not trigger — but this should be confirmed at runtime.

5. **271 AE importers — anti-bypass check:** Static search for `_normalize`, `_ensure`, `_audit`, `_apply*Ops` in non-AE files. Confirms AE internals are not reached directly.

6. **`buildDerivedState` caller audit:** Confirm no caller depends on it being an AE method (e.g., passes `this` or relies on AE closure). If all callers use `ActorEngine.buildDerivedState(actor)`, extraction is a rename-only change.

---

## Key File Paths

| File | Status |
|------|--------|
| `scripts/governance/actor-engine/actor-engine.js` | Active — 4,957 lines |
| `scripts/governance/actor-engine/internal/actor-engine-validation.js` | Stale — unwired — do not wire |
| `scripts/governance/actor-engine/internal/actor-engine-derived.js` | Stale — unwired — do not wire |
| `scripts/governance/actor-engine/hp-recompute-hooks.js` | Active — wired via Hooks |
| `scripts/governance/mutation/MutationInterceptor.js` | Active — enforcement layer |
| `scripts/actors/derived/derived-calculator.js` | Active — canonical derived math |
| `scripts/engine/combat/damage-resolution-engine.js` | Active — pure damage resolution |
| `scripts/engine/combat/ConditionEngine.js` | Active — condition delegation candidate |
| `scripts/engine/combat/SecondWindEngine.js` | Active — second wind delegation candidate |
| `scripts/engine/force/force-points-service.js` | Active — FP resource delegation candidate |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | Active — calls applyMutationPlan |
