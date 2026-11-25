# B-PRG — Progression (chargen, level-up, progression framework)

**Contract level:** B (domain) with embedded C. **Audited commit:** `f734b4d` (census HEAD `2beb7cb`; no `scripts/` change between them). **Mode:** read-only audit. **Machine sidecar:** `data/audits/architecture-census/contracts/domains/progression.json`.
Level-A invariants are referenced by ID (`A-02`, `A-09`, `A-15` …) and are not restated. Nothing here is `FOUNDRY_TESTED`; every runtime claim is offline evidence only (`A-13`).

## 1. Purpose and boundaries

Progression owns the **wizard lifecycle** that turns a player's temporary choices into one committed character change: entry/launch, the step shell (`ProgressionShell` → `ChargenShell` / `LevelupShell` / follower shell), step plugins, draft session state, reconciliation of existing actors, mutation-plan compilation (`ProgressionFinalizer` + domain PlanBuilders), and the single hand-off to `ActorEngine.applyMutationPlan`.

Progression **must not own**: actor mutation (ActorEngine, `A-02`), credit movement (TransactionEngine, `A-10`), derived stats such as BAB/defenses/skill totals (actor-core derived calculators, `A-03`), feat/talent/Force/species rules content (their mechanical domains), suggestion scoring and mentor text (mentor-suggestion), chat (`A-05`). It may *consume* those authorities to show previews and to compile a plan.

Scope: `scripts/apps/progression-framework/**`, `scripts/engine/progression/**`, `scripts/engine/chargen/**`, `scripts/apps/chargen/**`, `scripts/apps/levelup/**`, `scripts/sheets/v2/character-sheet/chargen-onboarding.js`. 367 runtime modules / ~97.7k SLOC; 75 census-unreachable modules.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-PRG-01 | Launch / route a progression (new, existing, follower, minion, NPC) | `scripts/apps/progression-framework/progression-entry.js` · `launchProgression`, `launchNewProgression` | OBSERVED · APPROVED (OSI, A-15) | source-inspected | `scripts/apps/progression-framework/progression-entry.js:243`, `:204` |
| R-PRG-02 | Step shell lifecycle, navigation, rendering | `scripts/apps/progression-framework/shell/progression-shell.js` · `ProgressionShell` (+ `ChargenShell`, `LevelupShell`) | OBSERVED · APPROVED | source-inspected | `scripts/apps/progression-framework/shell/progression-shell.js:97`; `scripts/apps/progression-framework/chargen-shell.js:50`; `scripts/apps/progression-framework/levelup-shell.js:31` |
| R-PRG-03 | Draft (temporary) selections | `scripts/apps/progression-framework/shell/progression-session.js` · `ProgressionSession` | OBSERVED · APPROVED (OSI) | source-inspected | `scripts/apps/progression-framework/shell/progression-session.js:30` |
| R-PRG-04 | Draft durability across reloads | `scripts/apps/progression-framework/shell/session-storage.js` · `SessionStorage`; `scripts/apps/progression-framework/shell/chargen-persistence.js` · `ChargenPersistence` | OBSERVED · CONFLICT (A-02; two stores) | behavior-code-verified | `scripts/apps/progression-framework/shell/session-storage.js:285`; `scripts/apps/progression-framework/shell/chargen-persistence.js:195` |
| R-PRG-05 | Single finalization: compile → validate → re-check prereqs → apply | `scripts/apps/progression-framework/shell/progression-finalizer.js` · `ProgressionFinalizer.finalize` | OBSERVED · APPROVED (A-15) | behavior-code-verified | `scripts/apps/progression-framework/shell/progression-finalizer.js:369`, `:477`, `:4009` |
| R-PRG-06 | Scoped single-step finalization (sheet buttons, Holonet) | `ProgressionFinalizer.finalizeSingleStep` | OBSERVED | behavior-code-verified | `scripts/apps/progression-framework/shell/progression-finalizer.js:582`, `:653` |
| R-PRG-07 | Domain plan fragments (ability, skills/languages, species/background, economy, feat/talent, Force, metadata) | `shell/mutation/*-plan-builder.js` | OBSERVED · APPROVED (progression-architecture) · CONFLICT (base still computed, see F-PRG-007) | source-inspected | `scripts/apps/progression-framework/shell/progression-finalizer.js:76`; `scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js:283` |
| R-PRG-08 | Class domain compilation (inline, ClassPlanBuilder not wired) | `ProgressionFinalizer._compileMutationPlanBase` | OBSERVED · UNIMPLEMENTED (builder) | source-inspected | `scripts/apps/progression-framework/shell/progression-finalizer.js:1356` |
| R-PRG-09 | Reconciliation of existing actors vs entitlements | `scripts/apps/progression-framework/shell/progression-reconciler.js` · `ProgressionReconciler` | OBSERVED (rules-deferred slots honour RECON-001…007) | source-inspected | `scripts/apps/progression-framework/shell/progression-reconciler.js:392` |
| R-PRG-10 | Step plugin contract | `scripts/apps/progression-framework/steps/step-plugin-base.js` · `ProgressionStepPlugin` | OBSERVED | source-inspected | `scripts/apps/progression-framework/steps/step-plugin-base.js:65` |
| R-PRG-11 | Content resolution for steps (class, background, starting credits) | `scripts/engine/progression/content/progression-content-authority.js` · `ProgressionContentAuthority` | OBSERVED | source-inspected | `scripts/engine/progression/content/progression-content-authority.js:43` |
| R-PRG-12 | Rule-setting reads for progression | `scripts/engine/progression/ProgressionRules.js` · `ProgressionRules` | OBSERVED | source-inspected | `scripts/engine/progression/ProgressionRules.js:13` |
| R-PRG-13 | Actor snapshots for rollback/statblock conversion | `scripts/engine/progression/utils/snapshot-manager.js` · `SnapshotManager` | OBSERVED | source-inspected | `scripts/engine/progression/utils/snapshot-manager.js:49` |
| R-PRG-14 | Chargen starting-credit staging for the chargen store | `scripts/apps/progression-framework/steps/summary-step.js` · `_stageStartingCreditsForStore` | OBSERVED · CONFLICT (A-10, A-15) | behavior-code-verified | `scripts/apps/progression-framework/steps/summary-step.js:1768`, `:1786` |
| R-PRG-15 | Legacy static `ProgressionEngine` API | `scripts/engine/progression/engine/progression-engine.js` | OBSERVED (loaded, never invoked) · legacy B | dependency-traced | `scripts/engine/progression/engine/progression-engine.js:23`; `scripts/engine/mentor/mentor-dialogues.js:1` |

## 3. Authorities

- **Canonical data (draft):** `ProgressionSession.draftSelections` — OBSERVED · APPROVED (OSI). Durable copy in actor flags `foundryvtt-swse.progression.<mode>.session` and `foundryvtt-swse.chargen.checkpoint` — OBSERVED · CONFLICT (two stores, raw `setFlag`).
- **Rules:** progression does not own rules; it consumes `FeatGrantEntitlementResolver`, talent cadence, `ProgressionReconciler` entitlement slots, prerequisite checkers. Rules-deferred entitlement questions are in the register (RECON-001…007, MSV-RD-*, SWSE-NPC-RD-*) — DEFERRED_RULES_REVIEW where cited.
- **Calculation:** preview-only calculations (BAB/defense/HP previews in the Summary step) — OBSERVED · CONFLICT (duplicate BAB implementations, F-PRG-008).
- **Mutation/persistence:** `ProgressionFinalizer._applyMutationPlan` → `ActorEngine.applyMutationPlan` (`scripts/governance/actor-engine/actor-engine.js:3259`), transactional — OBSERVED · APPROVED. Post-commit bookkeeping writes (ability-increase verification, maneuver suite sync, certification) run as separate `ActorEngine.updateActor` calls — OBSERVED (F-PRG-010).

## 4. Public interfaces

| Symbol | path:line | Consumers (registry) | Contract |
|---|---|---|---|
| `ProgressionFinalizer` (`finalize`, `finalizeSingleStep`, `dryRun`) | `scripts/apps/progression-framework/shell/progression-finalizer.js:296` | 21 | in: `sessionState`, actor; out: `{success, committed, error, rollbackOutcome?, indeterminate?, postApplyIncomplete?}`; no mutation before validation |
| `launchProgression` / `launchNewProgression` / `launchFollowerProgression` / `launchMinionCreation` | `scripts/apps/progression-framework/progression-entry.js:243` | 13 (module) | opens the right shell; NPC statblock guard |
| `ProgressionShell` | `scripts/apps/progression-framework/shell/progression-shell.js:97` | 8 | ApplicationV2 wizard host |
| `ChargenShell` / `LevelupShell` | `scripts/apps/progression-framework/chargen-shell.js:50` / `scripts/apps/progression-framework/levelup-shell.js:31` | 3 / 2 | mode subclasses |
| `ProgressionSession` | `scripts/apps/progression-framework/shell/progression-session.js:30` | 3 | draft state; `commitSelection`, `getSelection` |
| `ProgressionReconciler` | `scripts/apps/progression-framework/shell/progression-reconciler.js:392` | 31 | `reconcileActor(actor,{output})` read-only report |
| `invalidateReconciliationForRuleChange` | `scripts/apps/progression-framework/shell/progression-reconciler.js:163` | (in 31) | cache invalidation on house-rule change |
| `ProgressionStepPlugin` | `scripts/apps/progression-framework/steps/step-plugin-base.js:65` | 26 | step lifecycle (`onStepEnter`, `onDataReady`, `onStepExit`, `handleAction`) |
| `SnapshotManager` | `scripts/engine/progression/utils/snapshot-manager.js:49` | 34 | snapshot/restore |
| `ProgressionContentAuthority` | `scripts/engine/progression/content/progression-content-authority.js:43` | 20 | resolve class/background content |
| `ProgressionRules` | `scripts/engine/progression/ProgressionRules.js:13` | 16 | setting reads via HouseRuleService |

## 5. Dependencies

- **Allowed (PROPOSED, per A-P1):** infrastructure, data-registries, governance (ActorEngine), mechanical domains (classes, species, feats, talents, force, skills, droids, abilities-effects, houserules) as read-only rule providers; mentor-suggestion as an advisory provider consumed by steps only.
- **Prohibited:** engine-layer files importing progression UI (`A-07`); any module reassigning progression class methods (`A-09`); credit writes outside TransactionEngine (`A-10`); mid-wizard actor mutation (`A-15`).
- **Observed violations:** 15 engine→UI edges (probe `P-A07-engine-imports-ui`), e.g. `scripts/engine/progression/engine/telekinetic-prodigy-runtime-patches.js:10` → `force-power-step.js`; `scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js:1` → `feat-step.js`; `scripts/engine/progression/profile/galactic-profile-service.js` → `scripts/apps/progression-framework/shell/progression-session.js`. 11-file static cycle closed by an unused import at `scripts/engine/mentor/mentor-dialogues.js:1` (F-PRG-006). Talent domain init file supplies a finalizer method by side-effect import (`scripts/talents/squad-actions-init.js:7`, F-PRG-002).

## 6. Integration points and lifecycle

1. `index.js:242` `registerFeatHousekeepingRuntimePatches()` and `index.js:252` `registerCustomTalentTreeProgressionOverlay()` (init-time prototype patches); `scripts/engine/feats/register-feat-runtime.js:97` `registerTelekineticProdigyRuntimePatches()`.
2. `index.js:91` imports `scripts/talents/squad-actions-init.js`, whose side-effect imports install `ProgressionFinalizer` static methods (`progression-finalizer-force-knowledge-patch.js:112`, `choice-resolution-finalization-patch.js:90`).
3. Hooks: `ready` (house-rule grant materialization, `feat-housekeeping-runtime-patches.js:462`); `swse:houserule-changed` / `updateSetting` (`:482-483`, invalidation); `createActor`/`updateActor`/`canvasReady` (`scripts/sheets/v2/character-sheet/chargen-onboarding.js:267-275`); emitted `swse:level-up-complete` (`progression-finalizer.js:543`). `SWSELanguageModule` registers `updateActor` and `swse:progression:completed` listeners (`scripts/engine/progression/modules/language-module.js:18`, `:35`) but `SWSELanguageModule.init()` has no caller → dormant.
4. Wizard order: enter step → draft `commitSelection` → debounced `SessionStorage.saveSession` (`progression-shell.js:1702`) / `ChargenPersistence.saveCheckpoint` on step exit (`progression-shell.js:3982`) → Summary → `finalize` → `_applyMutationPlan` → post-commit sync/certification → `swse:level-up-complete`.

## 7. Failure behavior and domain invariants

- Finalize fails closed before mutation on transient actor, NPC statblock authority, readiness, plan validation, and prerequisite re-check (`progression-finalizer.js:380-458`) — OBSERVED. Transactional apply with rollback evidence; unverified rollback → `indeterminate`/`partialMutationPossible` (`:4021-4031`) — OBSERVED (A-02/A-15).
- Post-apply audit failure returns `committed: true, success: false` (`:497-503`) — OBSERVED; post-apply sync failure returns `postApplyIncomplete` with a repair payload (`:4033-4043`).
- Domain invariants (PROPOSED): **I-PRG-1** no actor/world write between shell open and finalize except draft persistence through one store; **I-PRG-2** no method reassignment of progression classes (A-09); **I-PRG-3** every finalizer method is defined in the finalizer module or an explicitly imported builder; **I-PRG-4** previews call the canonical derived calculators (A-03).

## 8. Level C subsystem contracts

- **C-PRG-1 Shell ↔ Step plugin:** `ProgressionStepPlugin` lifecycle; plugins write only to `ProgressionSession` and request renders. OBSERVED, except `SummaryStep.enterStore` (actor write, F-PRG-003).
- **C-PRG-2 Finalizer ↔ PlanBuilders:** builders are pure, return `set/add/delete/postApply` fragments; finalizer merges. APPROVED (progression-architecture) · CONFLICT (base inline duplicate; class builder not wired).
- **C-PRG-3 Finalizer ↔ ActorEngine:** one `applyMutationPlan(actor, plan, {transactional:true, validate:true, rederive:true})` per finalize plus post-commit `updateActor` bookkeeping. OBSERVED.
- **C-PRG-4 Session ↔ durable draft store:** PROPOSED single store (today two).

## 9. Tests and certification

Offline (CI) evidence, run read-only in this audit: `tests/progression-session-persistence-writebehind.test.mjs` (pass 1/1), `tests/galactic-profile-mutation-plan.test.mjs` (pass 10/10, installs the force-knowledge finalizer patch explicitly), `tests/follower-mutation-transaction.test.mjs` (pass 1/1). 103 tests touch the domain (domain-facts), including the reconciliation series `tests/reconciliation-*.test.mjs`. Static gate: `tools/check-architecture-phase4.mjs`. No test asserts the absence of prototype patches on step classes or that `ProgressionFinalizer` works without `squad-actions-init.js`. Foundry acceptance: **FOUNDRY_ACCEPTANCE_REQUIRED** for chargen, level-up, single-step and store-during-chargen flows (progression-architecture "Verification status").

## 10. Reconciliation with existing contracts

Agreements: `docs/architecture/progression-architecture.md` layering (shell → finalizer → builders → ActorEngine) matches code; ActorEngine is the only plan applier; ClassPlanBuilder not wired (documented).

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-PRG-01 | progression-architecture.md §ProgressionFinalizer ("There is no runtime patching") | No runtime patching | Two live files reassign `ProgressionFinalizer` statics (`choice-resolution-finalization-patch.js:90,100`; `progression-finalizer-force-knowledge-patch.js:101,112`); three live files reassign `TalentStep`/`ForcePowerStep`/`FeatStep` prototype methods and `PrerequisiteChecker`/`AbilityEngine` statics |
| CR-PRG-02 | progression-architecture.md §Enforcement ("squad-actions-init.js no longer imports any finalizer patch file") | No finalizer patch imports | `scripts/talents/squad-actions-init.js:7` and `:12` import two finalizer patch files; `_applyForceKnowledgePostApply` exists only via that import |
| CR-PRG-03 | progression-architecture.md §ProgressionFinalizer ("performs no direct document writes"), A-15 "commits once" | One commit | One transactional plan + up to three post-commit `updateActor` writes (`progression-finalizer.js:3976`, `:3770`, certification at `:519`) |
| CR-PRG-04 | OSI / A-15 (temporary choices in draft state) | No mid-wizard actor writes | `summary-step.js:1786` stages `system.credits` + flag; session drafts written to actor flags per navigation |
| CR-PRG-05 | `scripts/engine/progression/engine/progression-engine.js:1-12` header ("delegating to the new SWSEProgressionEngine") | Legacy API delegates to a live engine | Neither the legacy API nor `SWSEProgressionEngine` is invoked by any runtime path |

## 11. Phase 2 conformance summary

Full detail in the sidecar. High: F-PRG-001 (step/checker prototype patches), F-PRG-002 (finalizer method supplied by side-effect import), F-PRG-003 (mid-wizard credit staging). Medium: F-PRG-004 (draft persistence via raw setFlag, two stores, UI state on actor), F-PRG-005 (legacy ProgressionEngine closure, ~2.6k lines loaded and unused), F-PRG-006 (11-file cycle), F-PRG-007 (finalizer base-then-clobber duplication; 4,057-line module), F-PRG-008 (three BAB implementations), F-PRG-009 (Telekinetic runtime text/mechanic override, rules-deferred), F-PRG-018 (unreachable clusters). Low/info: F-PRG-010…017, F-PRG-019…023.

## 12. Unimplemented, deferred and acceptance-required items

- U-PRG-01 ClassPlanBuilder not wired (progression-architecture §Intentionally inline). U-PRG-02 Single durable draft store (PROPOSED). U-PRG-03 `SWSELanguageModule.init()` never called (dormant hooks).
- DEFERRED_RULES_REVIEW: Telekinetic Prodigy text and retroactive-slot suppression (F-PRG-009; related RECON-006; new register entry needed — not created here). Hard-coded fallback starting credits by class (`progression-economy-plan-builder.js:252`, F-PRG-019). Entitlement cadence questions RECON-001…007 (already registered).
- FOUNDRY_ACCEPTANCE_REQUIRED: full chargen and level-up finalize; chargen store purchase then abandon/resume; single-step finalize; rollback `indeterminate` path; load order without `squad-actions-init.js`.
