# B-ACT — actor-core (V2 actor model, derived state, ActorEngine mutation gate)

**Level:** B (domain) with embedded Level C. **Audited commit:** `f734b4d` (code unchanged at HEAD `2beb7cb`, which only adds census outputs). **Sidecar:** `data/audits/architecture-census/contracts/domains/actor-core.json`. **Facts:** `domain-facts/actor-core.json` (133 files, 37 runtime modules, 13,592 runtime SLOC).

Status labels and verification levels follow `_contract-template.md`. Level-A rules are referenced by ID (A-01…A-18), not restated. No claim here is `live-foundry-verified` (A-13).

## 1. Purpose and boundaries

actor-core owns (a) the Foundry `Actor` document class used for all actor types (`SWSEV2BaseActor`, registered at `index.js:166`), (b) the derived-state pipeline that fills `actor.system.derived` (V2 per-type compute functions plus the `DerivedCalculator` family), (c) the actor mutation gate `ActorEngine` (`scripts/governance/actor-engine/actor-engine.js:83`) and its plan builders, and (d) HP generation/accounting helpers (`scripts/engine/HP/**`) and `CommandBus` (`scripts/engine/core`).

actor-core must **not** own: combat rules (damage mitigation, threshold, condition-track rules — owned by combat engines that ActorEngine delegates to), Force-point rules (force domain), progression decisions (progression), modifier aggregation (ABL — ModifierEngine), credit movement (A-10, store-economy), chat output (A-05), house-rule storage (HRL), or sheet/UI state (ui-shell).

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-ACT-01 | Actor document class for character/npc/droid/vehicle | `scripts/actors/v2/base-actor.js` · `SWSEV2BaseActor` | OBSERVED | source-inspected | `index.js:166`, `scripts/actors/v2/base-actor.js:32` |
| R-ACT-02 | Synchronous derived pass (per-type mirrors, condition track, XP) in `prepareDerivedData` | `SWSEV2BaseActor._performDerivedCalculation` | OBSERVED | behavior-code-verified | `scripts/actors/v2/base-actor.js:69`, `:87-107`, `:111` |
| R-ACT-03 | Asynchronous derived pass (HP, BAB, defenses, skills, modifiers) | `scripts/actors/derived/derived-calculator.js` · `DerivedCalculator.computeAll` | OBSERVED | behavior-code-verified | `scripts/actors/derived/derived-calculator.js:206`, `scripts/actors/v2/base-actor.js:159` |
| R-ACT-04 | Derived-generation stamp / invalidation key for derived caches (A-16) | `scripts/actors/derived/derived-generation.js` · `stampDerivedGeneration` | OBSERVED | test-verified (`tests/v2-derived-async-applied-signature-coherency.test.mjs`) | `scripts/actors/derived/derived-generation.js:33`, `:69` |
| R-ACT-05 | Actor + owned-document mutation gate (A-02) | `ActorEngine.updateActor` / `updateEmbeddedDocuments` / `createEmbeddedDocuments` / `deleteEmbeddedDocuments` | APPROVED (OSI, A-02) · OBSERVED | behavior-code-verified | `scripts/governance/actor-engine/actor-engine.js:570`, `:859`, `:940`, `:986` |
| R-ACT-06 | Multi-bucket mutation plans with optional verified rollback | `ActorEngine.applyMutationPlan` | APPROVED (A-15) · OBSERVED | test-verified (`tests/ti4c0-g06-rollback-verification.test.mjs`) | `scripts/governance/actor-engine/actor-engine.js:3259`, `:3520` |
| R-ACT-07 | Post-mutation recompute + fold of derived snapshot | `ActorEngine.recalcAll` / `_applyDerivedUpdates` | OBSERVED | behavior-code-verified | `scripts/governance/actor-engine/actor-engine.js:251`, `:150` |
| R-ACT-08 | Orchestrated resource mutations (damage, healing, condition step, Force/Destiny point ledgers, Second Wind) — rules delegated | `ActorEngine.applyDamage`, `setConditionStep`, `spendForcePoints`, `spendDestinyPoints`, `applySecondWind` | OBSERVED · CONFLICT (CR-04) | dependency-traced | `scripts/governance/actor-engine/actor-engine.js:1421`, `:1681`, `:2116`, `:2466`, `:2622` |
| R-ACT-09 | Level split / heroic half-level helpers | `scripts/actors/derived/level-split.js` | OBSERVED | source-inspected | `scripts/actors/derived/level-split.js:68`, `:79` |
| R-ACT-10 | Defense totals for character-like actors | `scripts/actors/derived/defense-calculator.js` · `DefenseCalculator` | OBSERVED | test-verified (`tests/v2-golden-defense-lifecycle.test.mjs`) | `scripts/actors/derived/defense-calculator.js:760` |
| R-ACT-11 | Vehicle derived values | `scripts/actors/v2/vehicle-derived-builder.js` | OBSERVED | source-inspected | `scripts/actors/v2/vehicle-derived-builder.js:26` |
| R-ACT-12 | NPC/droid calculation-mode adapters (statblock vs progression) | `npc-mode-adapter.js`, `droid-mode-adapter.js` | OBSERVED | test-verified (`tests/npc-mode-adapter.test.mjs`, `tests/droid-mode-adapter.test.mjs`) | `scripts/actors/droid/droid-mode-adapter.js:272` |
| R-ACT-13 | HP ledger accounting / recompute planning | `scripts/engine/HP/hp-accounting.js` · `planHpRecompute`; `ActorEngine.recomputeHP` | OBSERVED | test-verified (`tests/hp-preservation-authority.test.mjs`) | `scripts/governance/actor-engine/actor-engine.js:4247` |
| R-ACT-14 | XP derived block (`system.derived.xp`) | `scripts/engine/progression/xp-engine.js` · `computeXpDerived` (called only from R-ACT-02) | OBSERVED · CONFLICT (path, A-03/CR-11) | behavior-code-verified | `scripts/engine/progression/xp-engine.js:103`, `scripts/actors/v2/base-actor.js:111` |
| R-ACT-15 | Vehicle pre-create/pre-update guards | `scripts/actors/vehicle/vehicle-precreate-hooks.js` | OBSERVED | source-inspected | `scripts/actors/vehicle/vehicle-precreate-hooks.js:184-188` |

## 3. Authorities

- **Canonical data:** persisted `actor.system.*` shape is `template.json` (repo-config). actor-core owns the *runtime* `system.derived` namespace only. OBSERVED.
- **Rules:** none originate here by contract. Condition-track penalty table, ability-mod and half-level arithmetic are *implemented* here (R-ACT-09/10) — see F-ACT-006. UNVERIFIED as authority (no owner decision names actor-core a rules owner; CR-03).
- **Calculation:** `DerivedCalculator.computeAll` is the derived calculator, but at runtime it is wrapped by `scripts/engine/force/force-suite-runtime-repairs.js:271` (CONFLICT, A-09; F-ACT-015); `SWSEV2BaseActor` per-type compute functions are the sync mirror. OBSERVED. Two writers of `system.derived` exist (base-actor async merge at `base-actor.js:173`, ActorEngine deep merge at `actor-engine.js:165`), sharing one generation stamp. OBSERVED; intended per code comments (`actor-engine.js:150`).
- **Mutation/persistence:** `ActorEngine` — APPROVED (OSI, A-02). The only raw `actor.update` call on its path is `applyActorUpdateAtomic` (`scripts/utils/actor-utils.js:281`), documented "used internally by ActorEngine" (`scripts/utils/actor-utils.js:137`). OBSERVED.

## 4. Public interfaces

Consumer counts = number of non-engine files calling `ActorEngine.<m>(` (git grep at HEAD); `ActorEngine` itself has 399 importers (registry).

| Symbol | path:line | Consumers | Contract |
|---|---|---:|---|
| `ActorEngine.updateActor(actor, updateData, options)` | `scripts/governance/actor-engine/actor-engine.js:570` | 162 | Validates, blocks derived writes (`:370`), loop-guards, calls `applyActorUpdateAtomic`, then `recalcAll` |
| `updateEmbeddedDocuments(actor, name, updates, opts)` | `…/actor-engine.js:859` | 83 | Owned-doc update under mutation context |
| `updateOwnedItems(actor, updates, opts)` | `…/actor-engine.js:932` | 18 | Alias of `updateEmbeddedDocuments(actor,'Item',…)` |
| `createEmbeddedDocuments` / `deleteEmbeddedDocuments` | `…/actor-engine.js:940` / `:986` | 53 / 31 | Owned create/delete |
| `applyMutationPlan(actor, plan, {validate, rederive, transactional, source})` | `…/actor-engine.js:3259` | 20 | Buckets create→delete→set→update→add; non-atomic unless `transactional` |
| `apply(actor, plan)` (adoption/legacy plan shape) | `…/actor-engine.js:1277` | 11 (3 live call sites) | Different plan shape (`createEmbedded/updateEmbedded/replaceSystem`) |
| `applyDelta(actor, delta)` | `…/actor-engine.js:1103` | 0 runtime | "ONLY legal way" for ProgressionCompiler output (comment); no live caller |
| `applyProgression(actor, packet)` | `…/actor-engine.js:2871` | 2 | Progression packet path (`finalize-integration.js:56`) |
| `applyDamage(actor, packet)` / `applyHealing` | `…/actor-engine.js:1421` / `:1608` | 12 / 4 | Delegates to `DamageResolutionEngine` (dynamic import) |
| `setConditionStep` / `applyConditionShift` | `…/actor-engine.js:1681` / `:1781` | 9 / 12 | Uses `ConditionTrackRules` |
| `spendForcePoints` / `finalizeForcePointSpend` / `rollbackForcePointSpend` | `…/actor-engine.js:2116` / `:2294` / `:2236` | 19 | Per-actor queued ledger (`:45`) |
| `spendDestinyPoints` | `…/actor-engine.js:2466` | 2 | Separate ledger (`:63`) |
| `applySecondWind` | `…/actor-engine.js:2622` | 4 | Uses `SecondWindRules` |
| `updateActorFlags` / `unsetActorFlag` | `…/actor-engine.js:4114` / `:4160` | 7 / 4 | `actor.setFlag` + `recalcAll` |
| `create/update/deleteActiveEffects` | `…/actor-engine.js:4284` / `:4203` / `:4332` | 14 / 1 / 8 | Owned AE mutations |
| `recomputeHP` / `recalcAll` | `…/actor-engine.js:4247` / `:251` | 7 / 5 | |
| `moveEmbeddedDocuments(src, tgt, …)` | `…/actor-engine.js:1032` | 1 (orphan caller) | Cross-actor move — see F-ACT-002 |
| `DerivedCalculator.computeAll` / `getActorComputeSignature` | `scripts/actors/derived/derived-calculator.js:206` / `:99` | 22 importers | Signature-keyed cached compute |
| `level-split.js` helpers | `scripts/actors/derived/level-split.js:68` | 37 importers | Pure level arithmetic |

## 5. Dependencies

- **Allowed (PROPOSED, A-P1):** infrastructure (logger, utils), data-registries, ABL ModifierEngine (read), combat/force *rule* modules called by ActorEngine for orchestration (`ConditionTrackRules`, `SecondWindRules`, `DamageResolutionEngine`, `ForcePointsService`).
- **Prohibited:** actor-core → UI imports (A-07); derived calculators → mutation modules (makes prepare-phase code depend on the write path, A-08).
- **Observed violations:** the 18-file static cycle (F-ACT-001); `base-actor.js:228` dynamically imports `ui/shell/request-shell-render.js` (engine→UI, render request only — exception candidate); `scripts/utils/hardening.js:16` (imported by `level-split.js:1`) statically imports ActorEngine.

## 6. Integration points and lifecycle

1. `init`: `CONFIG.Actor.documentClass = SWSEV2BaseActor` (`index.js:166`).
2. Foundry `prepareData` → `SWSEV2BaseActor.prepareDerivedData` (`base-actor.js:33`): registers passive abilities (`:80`), fires `_computeDerivedAsync` without await (`:87`), runs per-type sync compute (`:89-104`), condition-track derived, `computeXpDerived` (`:111`).
3. `_computeDerivedAsync` (`base-actor.js:128`): signature coalescing (`:150-153`), `DerivedCalculator.computeAll`, shallow field merge, generation stamp, microtask re-render of open apps (`:217`).
4. Mutation: caller → `ActorEngine.<method>` → `MutationInterceptor.setContext` → Foundry write → `recalcAll` (deep merge via `_applyDerivedUpdates`) → `_refreshOpenActorApps` (`:197`).
5. Hooks registered for this domain (wired by INF): `scripts/infrastructure/hooks/actor-hooks.js:64,70,85,122,146,179`; vehicle guards `vehicle-precreate-hooks.js:184-191`.

## 7. Failure behavior and domain invariants

- A-02: `updateActor` throws on invalid input (`actor-engine.js:574-578`); re-entrancy is reference-counted (`:480-515`); derived-path writes warn or throw in strict mode (`:370`).
- A-03: derived writes occur only in R-ACT-02/03/07 and `xp-engine.js:106,123` (in-memory, prepare-phase; F-ACT-004).
- A-08: `prepareDerivedData` guards nested recursion (`base-actor.js:53`) but async derived work may outlive the prepare call (fire-and-forget, `:87`); errors are logged, not thrown (`:240`).
- `applyMutationPlan` is **not atomic by default**; `transactional:true` reports `FAILED_COMPENSATED` only when restore is verified, otherwise `partialMutationPossible` (`actor-engine.js:3389`). FOUNDRY_ACCEPTANCE_REQUIRED (multi-client).
- Force/Destiny point queues serialise per actor in one client only (`actor-engine.js:41-43` comment). FOUNDRY_ACCEPTANCE_REQUIRED.

## 8. Level C subsystem contracts

- **C-ACT-1 Derived pipeline** — boundary: `SWSEV2BaseActor` ↔ `DerivedCalculator`. Interface: `DerivedCalculator.computeAll(actor,{signature}) → flat {'system.derived.*': value}`; result is cached by signature (`derived-calculator.js:45`) and stamped through `derived-generation.js`. Status: OBSERVED.
- **C-ACT-2 Mutation primitive** — boundary: `ActorEngine` ↔ `applyActorUpdateAtomic` (`actor-utils.js:159`). Only ActorEngine may call it (comment `actor-utils.js:137`). Status: OBSERVED; PROPOSED to move into `scripts/governance/actor-engine/` (F-ACT-008).
- **C-ACT-3 Plan application** — boundary: callers ↔ `applyMutationPlan` plan schema `{create,set,update,add,delete}` validated by `_validateMutationPlan` (`actor-engine.js:3600`). Status: OBSERVED · CONFLICT with parallel `apply`/`applyDelta`/`applyProgression` shapes (F-ACT-003).

## 9. Tests and certification

Offline (CI, A-13): `tests/ti4c0-g06-rollback-verification.test.mjs`, `tests/ti4c0-g06s1-exact-snapshot.test.mjs`, `tests/ti4c0-g11-follower-rollback.test.mjs` (transactional plans); `tests/v2-derived-async-applied-signature-coherency.test.mjs`, `tests/derived-calculator-signature-reuse.test.mjs` (C-ACT-1 caching); `tests/v2-golden-defense-lifecycle.test.mjs`, `tests/flat-footed-dodge-bonus-authority.test.mjs` (defenses); `tests/hp-preservation-authority.test.mjs`; `tests/npc-mode-adapter.test.mjs`, `tests/droid-mode-adapter.test.mjs`. No test covers `moveEmbeddedDocuments` atomicity or the import cycle. Foundry acceptance: none executed (FOUNDRY_ACCEPTANCE_REQUIRED for derived async re-render, multi-client FP ledger, transactional rollback).

## 10. Reconciliation with existing contracts

Agreements: ENGINE-ARCHITECTURE §2 public mutation API (`updateActor`, `updateOwnedItems`, `actor.updateOwnedItem` routing via ActorEngine — `swse-actor-base.js:139-158`) matches code. `combat-authority-map.md` naming `ActorEngine.applyDamage` matches code.

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-ACT-01 | `docs/architecture/ARCHITECTURE.md:113` (§II) | Gatekeeper is `scripts/actors/engine/actor-engine.js` | File does not exist; gate is `scripts/governance/actor-engine/actor-engine.js` (= global CR-01) |
| CR-ACT-02 | ARCHITECTURE.md §II "Only v2 Actor classes may write" derived | Derived written by ActorEngine (`actor-engine.js:165`) and xp-engine (`xp-engine.js:123`) (= CR-11) |
| CR-ACT-03 | ENGINE-ARCHITECTURE.md:21 ActorEngine "Delegates To: None", "Never Owns any calculation" | ActorEngine orchestrates damage/condition/FP/Second Wind and contains canonical-shape normalizers and ability-mod helper (`actor-engine.js:4623`) (= CR-04) |
| CR-ACT-04 | ARCHITECTURE.md §IV pipeline step 5 "Ability and modifier systems re-register" after derived | Passive abilities register *before* derived (`base-actor.js:79`) and again in `updateActor`/`createItem`/`deleteItem` hooks (`actor-hooks.js:70,122,146`) |
| CR-ACT-05 | `actor-engine.js:1092` comment: `applyDelta` is "the ONLY legal way to apply ProgressionCompiler output" | No live caller; progression finalization uses `applyMutationPlan`/`applyProgression` |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-ACT-001 | medium | confirmed | 18-file static import cycle: derived calculators ⇄ combat-roll-math/ModifierEngine ⇄ ActorEngine |
| F-ACT-002 | medium | confirmed | `moveEmbeddedDocuments` deletes on source before creating on target, no rollback (only caller orphaned) |
| F-ACT-003 | medium | confirmed | Five parallel plan-application entry points with different plan shapes |
| F-ACT-004 | low | confirmed | A-03 hits: `xp-engine.js` and `actor-engine.js` derived writes are in-memory sanctioned paths (path conflict only) |
| F-ACT-005 | low | confirmed | A-02/A-10 hits: legitimate or false positive, except character-reset `system.credits: 0` (`actor-sheet-base.js:1958`) — owner exception decision |
| F-ACT-006 | low | confirmed | Condition-track penalty table duplicated in 4 modules |
| F-ACT-007 | medium | confirmed | `_instrumentActorItemsForSSSTOT` monkey-patches `actor.items` on every update, unconditionally |
| F-ACT-008 | low | confirmed | Deprecated write wrappers in `actor-utils.js` and a second `safeActorUpdate` |
| F-ACT-009 | medium | suspected | Dual flag scope: `setFlag('swse')` remapped to `foundryvtt-swse` while 1,535 reads use `flags.swse` |
| F-ACT-010 | low | confirmed | `regainForcePoints` writes untyped `system.forcePoints.value` bypassing the typed FP ledger |
| F-ACT-011 | medium | suspected (hypothesis) | Passive ability re-registration runs 2–3× per mutation |
| F-ACT-012 | low | confirmed | Unreachable actor-core modules (5) |
| F-ACT-013 | medium | confirmed | `actor-engine.js` is 4,890 lines mixing gate, resource ledgers, normalizers |
| F-ACT-014 | info | confirmed | Documentation consolidation candidates |
| F-ACT-015 | high | confirmed | `DerivedCalculator.computeAll` is replaced at init by `force-suite-runtime-repairs.js:271` (Skill Focus non-stacking post-filter) — live monkey-patch over the core derived pipeline |

## 12. Unimplemented, deferred and acceptance-required items

- U-ACT-01: `hp-recompute-hooks.js` (automatic HP recompute on class/CON/feat change) is wired only from orphan `governance-integration.js` — UNIMPLEMENTED integration or retired; owner to decide.
- DEFERRED_RULES_REVIEW: none raised by this domain. The condition-track table (F-ACT-006) is consolidated as-is; no rule value is changed.
- FOUNDRY_ACCEPTANCE_REQUIRED: async derived re-render; multi-client Force/Destiny ledgers; transactional rollback with world actors; flag-scope behavior of `setFlag('swse',…)` under Foundry v13.
