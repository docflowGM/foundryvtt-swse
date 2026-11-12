# Reconciliation V2 — Phase 0 Inventory

**Audit only. No runtime behavior was changed.** Date: 2026-11-11.

## 0. Audited revision (preflight)

| Item | Value |
|---|---|
| Repository | `docflowGM/foundryvtt-swse` |
| Baseline | `main` @ `33ce3f7622ca5ac458a36d13d0fd941e782cda07` (Merge PR #1143, Store V2) |
| Working tree | clean at start; `origin/main` == `HEAD` |
| Branch used | `claude/clever-shannon-pwf22k` (the session's designated branch — see note) |
| Open PRs inspected | 20 open, all draft. None touches reconciliation, class schema, or the V2 character-sheet audit panels (they are Store V2 #1144, Class/Force 6J–6U #1120–#1134, Droid/Vehicle/Modification/Equipment slices). The reconciliation files' last change is PR #1023. `main` therefore **is** the correct integration baseline for this subsystem. |
| Branch note | The command suggested `audit/character-reconciliation-v2-phase0`. This session is restricted to pushing to `claude/clever-shannon-pwf22k`, so the Phase 0 artifacts were committed there. They are docs + a read-only script and can be cherry-picked to the suggested name unchanged. |

Evidence legend used across all three documents:

* **[T]** reproduced by executing the real production code (`docs/audits/reconciliation-v2-phase0-repro/repro.mjs`, output in `repro-output.txt`).
* **[S]** static inspection only (file:line cited).
* **[F]** requires in-Foundry runtime verification.

## 1. Dependency map

```
packs/classes.db (raw, snake_case: base_class, base_hp, level_progression[].features[].type)
   │  normalizeClass()  — scripts/data/class-normalizer.js:153
   ▼
ClassModel (flat, camelCase: baseClass/prestigeClass/hitDie/baseHp/levelProgression/defenses)
   │  ClassesDB.classes (Map)  →  ClassesRegistry.getById/getByName   (+ synthetic Nonheroic model)
   │  resolveClassModel()  — engine/progression/utils/class-resolution.js:29
   ▼
Actor facts  (three DIFFERENT families, never reconciled with each other):
   (a) class ledger   system.progression.classLevels / system.progression.classLevelHistory
   (b) class items     owned `class` Items  (system.level, system.classId)
   (c) legacy shapes   system.classes, system.class (object), system.progression.classes
   (d) history         hpGainHistory, abilityIncreaseHistory, lastLeveledClass, flags.swse.levelUpFinalizationReceipt (latest level only)
   (e) item provenance flags.swse.progression.{selectionKey,slotType,source,classId…} / system.{source,slotType,acquisition}
   │
   ▼  ProgressionReconciler.reconcileActor()           shell/progression-reconciler.js:551
   │    helpers: _buildClassSummaries, _build*Slots, _build*Pools, _buildDerivedStatsAudit
   ▼
ProgressionEntitlementCalculator.calculate()           reconciliation/progression-entitlement-calculator.js:199
   │    (re-derives class summaries; builds slots via reconciler helpers; HP audit)
   ▼
ProgressionOwnershipClassifier.classify()              reconciliation/progression-ownership-classifier.js:17
   │    (thin wrapper over reconciler._buildFeatPools/_buildTalentPools)
   ▼
ProgressionReconciliationReportBuilder.build()         reconciliation/progression-reconciliation-report-builder.js:11
   │    (re-derives class summaries AGAIN; re-derives total level; fills "ambiguous"; rewrites HP/BAB rows)
   │    + ProgressionTimelineBuilder.build()
   ▼
reconciler.sanitizeReconciliationReport()  →  toSheetAudit()   (presentation projection, 955+)
   ▼
UI:  concept-context.js:641 buildSheetProgressionAudit  →  summary-tab.hbs / talents-tab.hbs / abilities-tab.hbs
     HomeSurfaceService._getProgressionAudit (:490)       →  Holopad home tasks
     LevelupShell reconcile mode (:187-258)               →  reconciliation-overview-step.js  →  remediation
```

## 2. Component classification

Categories: **A** canonical authority · **B** legitimate consumer · **C** duplicate calculation · **D** legacy implementation · **E** compat shim/fallback · **F** dead/unreachable · **G** unverified.

| Component | File | Class | Evidence |
|---|---|---|---|
| `ClassModel` contract | `scripts/data/models/ClassModel.js` | **A** | Flat schema; `isClassModel` requires `baseClass,prestigeClass,hitDie,baseHp,levelProgression,defenses` (:80-96). |
| `normalizeClass` | `scripts/data/class-normalizer.js:153` | **A** | `baseClass = sys.base_class !== false` (:160) — defaults **true** when absent. |
| `ClassesDB`/`ClassesRegistry` | `scripts/data/classes-db.js`, `scripts/engine/registries/classes-registry.js` | **A** | Registry returns synthetic Nonheroic model for any `isNonheroicClassRef` (:111,124,144,167). |
| `resolveClassModel`, `getClassHitDie`, `getClassBaseHp`, `getClassDefenses` | `engine/progression/utils/class-resolution.js:29,414,441,454` | **A** (unused by reconciliation for HP/hit die/defenses) | Reconciler re-reads the same fields via shape-sniffing (see below). |
| `getClassLevelProgressionEntry`, `normalizeClassKey` | `engine/progression/utils/levelup-event-context.js:19,215` | **A** | Used by the reconciler (`progression-reconciler.js:34-37`). |
| `buildLevelUpEntitlementManifest` | `engine/progression/utils/levelup-entitlement-manifest.js:358` | **A for level-up time** (not consulted by reconciliation) | Per-level feat/talent/ability entitlement used by finalizer/steps. Own cadence: ability `%4`→2, feat `%3`, talent via `TalentCadenceEngine` (:387-389). |
| `GENERAL_FEAT_LEVELS`, `TalentCadenceEngine` | `progression-data.js:28`, `talents/talent-cadence-engine.js:43` | **A** (cadence tables) | Consumed by reconciler `_buildGeneralFeatSlots` (:1226), `_buildHeroicTalentSlots` (:1289). |
| Actor derived calc `_resolveClassLevels` | `scripts/actors/derived/derived-calculator.js:159` | **A (de-facto runtime class-level authority for BAB/defenses)** | `classLevels` else class items; **never additive**. |
| Finalizer writers | `progression-finalizer.js:1307,1315,1330-1350`; `ability-score-plan-builder.js:131`; `progression-metadata-plan-builder.js:121-160` | **A** (writers) | Level-up writes `classLevels`, `classLevelHistory`, class item level, `abilityIncreaseHistory`, `hpGainHistory`. **Chargen writes `system.class` + class item and does *not* write `classLevels` [S]** (`classLevels` is only `set` at :1307 inside `mode === 'levelup'`). |
| `ProgressionReconciler.reconcileActor` + helpers | `shell/progression-reconciler.js:551…2135` | **C/G** | Re-derives class levels, cadences, pools; 2,377 lines mixing two unrelated jobs (see §6). |
| `…EntitlementCalculator` | `reconciliation/progression-entitlement-calculator.js` | **C** | Third class-summary builder (`canonicalClassSummaries` :33), own HP audit, hard-coded hit-die names (:100-104). |
| `…OwnershipClassifier` | `reconciliation/progression-ownership-classifier.js` | **B/E** | Pure pass-through to reconciler pools; no classification of its own. |
| `…ReportBuilder` | `reconciliation/progression-reconciliation-report-builder.js` | **C** | Fourth class-level reader (:123), re-derives total level (:114), overwrites HP/BAB rows (:235-305), queue-fills (:341). |
| `ProgressionTimelineBuilder` | `reconciliation/progression-timeline-builder.js` | **B/G** | Consumes builder output; not audited line-by-line in Phase 0. |
| `reconciliation-remediation-hotfix.js` | `reconciliation/` | **E** | Monkeypatches `ReportBuilder.prototype._attachRemediationActions` (:9-20); only imported as a side effect by `scripts/talents/squad-actions-init.js:13`. |
| `progression-ledger-reconciliation-hotfix.js` | `scripts/patches/` | **E + mutator** | Second `_attachRemediationActions` shim (:262-278); **also writes class-item levels** from its own ledger rule via ActorEngine on `ready`/`updateActor`/`createItem`/`updateItem` (:173-247). |
| `buildSheetProgressionAudit` | `sheets/v2/character-sheet/concept-context.js:640` | **B** | Calls `safeReconcileActor(actor,{output:'sheet'})` on every context build (:1934). |
| `HomeSurfaceService._getProgressionAudit` | `ui/shell/HomeSurfaceService.js:490` | **B** | Second independent caller (Holopad). |
| `LevelupShell` reconcile mode | `levelup-shell.js:187-258` | **B** | Consumes full report + timeline; remediation route target. |
| `ReconciliationOverviewStep` | `steps/reconciliation-overview-step.js` | **B** | 117 lines; renders timeline. |
| `recovery-coordinator.js` | `ux/recovery-coordinator.js` | **B/G** | Imports reconciler; remediation routing not traced in Phase 0. |
| Summary / Talents / Abilities audit panels | `templates/actors/character/v2-concept/partials/tabs/*.hbs` | **B (presentational) + D (duplicated)** | Summary 18 refs, Talents 7, Abilities 4 to `progressionAudit`. |
| `step-plugin-base.js` post-commit | `steps/step-plugin-base.js:569-611` | **B** | Uses `ProgressionReconciler.reconcileAfterCommit` (the **other** responsibility). |
| `_buildFallbackReport` / `_emptySheetAudit` | `progression-reconciler.js:704,754` | **E** | Fail-open empty reports (see findings). |
| `RECONCILIATION_CACHE` | `progression-reconciler.js:75,137-154` | **F for reads** | `.set` and a stale-fallback scan only; **no `.get` anywhere** [S]. |

## 3. Class-level authority — who reads what

| Reader | File:line | Sources, in order | Combination rule |
|---|---|---|---|
| Actor derived calc (BAB/defense) | `derived-calculator.js:159-196` | `progression.classLevels` → else owned class items | **Precedence** (first non-empty wins) |
| Entitlement calculator | `…entitlement-calculator.js:33-60` | `classLevels` → else items → else `system.classes` → else reconciler summaries | **Precedence**, then per-class **max** |
| Reconciler `_buildClassSummaries` | `progression-reconciler.js:1447-1491` | class items **+** ledger (`classLevels`, `system.classes`, **`system.class` object**) | **Per-class `Math.max`** over item, ledger, and lookup (:1464,1472); `system.class` level defaults to **`actor.system.level`** (:285) |
| Reconciler total level | `progression-reconciler.js:363-371` | `system.level`, Σ items, Σ ledger | **`Math.max` of the three** |
| Report builder | `…report-builder.js:123-181` | `classLevels` + `system.classes` + items | **Concatenate** (additive), trusted only if Σ == actor level, else falls back to calculator output with `remaining || level` capping |
| Class-item sync hotfix | `patches/progression-ledger-reconciliation-hotfix.js:105-143` | `classLevels`, `progression.classes`, `system.classes` | merge; "authoritative" only if Σ == `system.level`; **writes** item levels |
| Finalizer (level-up writer) | `progression-finalizer.js:1307-1330` | writes `classLevels` + class item + history together | — |

Five readers, three combination rules, one mutating reader. [S]; behavioral consequences in findings RCN-P0-01/08.

## 4. Class schema: field population in production data (`packs/classes.db`, 37 records) [T]

| Field | Finding |
|---|---|
| Identity | `normalizeClassId(name)` → `soldier`, `jedi_master`, … All 37 resolve in the harness. |
| `base_class` | `true` only for Jedi, Noble, Scout, Scoundrel, Soldier (5 records); `false` for 32 prestige classes. `normalizeClass` defaults a **missing** `base_class` to base (`!== false`). |
| `prestigeClass` | Derived as `!baseClass`. The reconciler never reads it. |
| Nonheroic | **Not in the compendium.** Synthetic model (`nonheroic-class-model.js`): `features: []`, `bonus_talents: 0`, `bonus_feats: 1 at level 1 and every 3rd level`, own BAB table. `ClassModel` has no `isNonheroic` field. |
| `level_progression` | Present (≥1 entry) on all 37; Soldier has 20 rows. Feature `type` histogram across all classes: `class_feature 62`, `talent_choice 209`, `scaling_feature 102`, `feat_choice 50`, `force_technique_choice 20`, `force_secret_choice 12`, `medical_secret_choice 5`, `feat_grant 5`, **`share_talent_choice 5`**. |
| Choice types reconciled | `CHOICE_FEATURE_TYPES` (:64-72) covers feat/talent/force-secret/technique/power/medical/maneuver. **`share_talent_choice` has no slot and no pool** — it is silently unaudited (`progression-reconciler.js:1599`). |
| `defenses`, `hitDie`, `base_hp`, `babProgression` | Populated for the sampled class (Soldier: `hitDie 10`, `base_hp 30`, `fast`, `{fort 2, ref 1, will 0}`). |

## 5. Existing automated tests (coverage)

| Test | Covers | Does **not** cover |
|---|---|---|
| `tests/progression-derived-class-stat-audit-contract.test.mjs` | BAB/defense "unavailable" discipline using **hand-built legacy-shaped** model fixtures (`model.system.defenses`, `system.level_progression`) | Real `ClassModel` shape, class levels, slots, pools, HP, UI |
| `tests/ti4c0-g34-progression-ledger-sync-authority.test.mjs` | Ledger-sync hotfix GM gating | Whether the sync rule agrees with the other four readers |
| `tests/progression-entitlement-budget.test.mjs` | Force-choice step budgets (unrelated to the audit) | — |
| `tests/class-phase-6d-officer-improviser-unlocks.test.mjs` etc. | Class **data** shape | Reconciliation |

No test exercises: class-level reconstruction, slot filling, ownership pools, HP verdict, `totalHeroicLevel`, ability-increase slots, fallback/degraded semantics, or any sheet projection. The Phase 0 harness is the first end-to-end fixture of the pipeline.

## 6. Notes on structure

* `ProgressionReconciler` hosts **two unrelated responsibilities**: (1) progression-session dirty-node invalidation (`reconcileAfterCommit`, `_getAffectedNodes`, `_markNodeDirty`, `isNodeClearOfDirtyFlag`; lines ~2135-2377) and (2) the actor-wide audit (lines 551-2135). They share only the class name and a file. (1) is a legitimate consumer used by `step-plugin-base.js`; it is **out of scope** for the overhaul and must not be deleted with (2).
* `REPORT_SCHEMA_VERSION = 9` (:77) while the builder stamps `version: 8` (builder :31) and layer `phase: 9`; `sanitizeReconciliationReport` takes the max. Version fields are not a reliable contract.

## 7. UI surfaces showing reconciliation data

| Surface | Reference | Business logic? |
|---|---|---|
| Summary tab: level chip, error block, repair suggestions, training ledgers, derived-stat rows, by-class table | `summary-tab.hbs:176,179-183,187-197,222-245,336-364,391-400` | Presentational. **Prints an "Audit Safe Mode" banner and `diagnostics.message` (raw exception text) to every viewer, no GM gate** (:179-183). |
| Talents tab: training ledgers, open-progression actions, by-class table | `talents-tab.hbs:27-51,115-124` | Presentational (duplicates Summary). |
| Abilities tab: derived-stat audit rows | `abilities-tab.hbs:125-140` | Presentational (duplicates Summary); also `buildAbilityTab(abilities, progressionAudit)` reads `progressionAudit.abilityIncreases` (`concept-context.js:698`). |
| Holopad home tasks | `HomeSurfaceService.js:490` | Consumes `sheet` projection. |
| Level-up reconcile shell | `levelup-shell.js:187-258` | Consumes full report. |

Header action row (`partials/frame/header-block.hbs:71-87`) already hosts Level Up / Store / Refresh / Settings; the Refresh handler is `character-like-sheet.js:3523`. Overlay seam: `actor-sheet-base.js:452-459` (`openOverlay`), `ShellRouter.openOverlay` (`ShellRouter.js:128`), and the overlay-VM registration point `ShellSurfaceRegistry.buildOverlayVm` (`ShellSurfaceRegistry.js:79`, existing ids `upgrade-single-item`, `game-session-composer`, `confirm-*`, `warning-*`).
