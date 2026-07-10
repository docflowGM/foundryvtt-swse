# Progression Runtime Integrity Audit

**Date:** 2026-07-10
**Scope repo:** SWSE Foundry VTT v13 / v2 migration (`docflowGM/foundryvtt-swse`)
**Type:** Audit / reporting only. No runtime fixes applied. One report-only tool added
(`tools/check-progression-integrity.mjs`).
**Baseline:** merged `main` at `323c48c` (architecture-hardening phase 0.5 merged; feat/species/class
coverage audit merged).

This audit answers a single question: *now that architecture boundaries and content coverage are
mapped, does the progression engine actually resolve, order, block, grant, dedupe, roll back, and
finalize the promised actor state safely?* It reads the merged code directly and does not rely on
prior reports.

---

## 0. Batch A Follow-up Status (2026-07-10)

Correctness-hardening batch executed against this audit. **Static verification only**
(`node --check` + the report-only scanners below); **no Foundry runtime verification** was
performed — the runtime items in §14 still stand.

| Item | Resolution | What changed |
|---|---|---|
| **R1 — finalization prerequisite re-check** | **fixed** | New `scripts/engine/progression/validation/finalization-prerequisite-validator.js` re-evaluates every player-selected class/feat/talent/Force/medical/maneuver choice against the final canonical `draftSelections` using the same commit-time seam (`AbilityEngine.evaluateAcquisition` + `buildClassGrantLedger` pending). Wired into `ProgressionFinalizer.finalize()` after plan validation and **before** `_applyMutationPlan`. Fail-closed on proven illegality; advisory/unresolved → warnings. |
| **R2 — follower non-schema keys** | **fixed (schema) / partial (routing)** | The 6 follower keys (`followerSkills`, `skillChoices`, `followerLanguages`, `languageChoices`, `followerBackground`, `backgroundChoice`) are now declared in `ProgressionSession._buildSchema()` + initial/reset shape — they are intentional, documented, validate-capable fields. Scanner `non-schema-selection-key` findings: **6 → 0**. Direct whole-list-replacement writes are intentionally **not** routed through `commitSelection` (its singleton-merge semantics differ from list-replace and could not be runtime-verified) — tracked as transitional. |
| **Dead `ProgressionSession`** | **removed** | `scripts/engine/progression/ProgressionSession.js` deleted (confirmed zero importers; the two `ProgressionSession` importers reference the canonical shell session). |
| **CREATE rollback gap (R5)** | **fixed** | `ActorEngine.applyMutationPlan` now deletes CREATE-bucket world actors (`Actor.deleteDocuments`) during transactional rollback, so a failed plan no longer orphans created actors. Best-effort; a failed cleanup sets `partialMutationPossible`. Note: progression finalization never populates the CREATE bucket, so this hardens the general engine contract, not the finalize path specifically. |
| **Mirrored-state drift (R3)** | **documented + tooled** | Authority restated below; scanner now labels each direct `draftSelections` writer `transitional` vs `suspicious`. Stale "mutations may be partially applied" finalizer comment corrected (rollback now runs). No broad mirror removal in this batch. |

**Intended selection authority (canonical):**
`progressionSession.draftSelections` is the single source of truth. `buildIntent` and
`committedSelections` are **projections/caches only** — never authoritative. New code must
prefer `commitSelection()` / `_commitNormalized()`; direct `draftSelections` writes are legacy
and tracked by the scanner's `draft-write-bypass` category (`label=transitional` for known,
documented writers; `label=suspicious` for anything new).

**Runtime verification still needed (Batch A):** smoke #13 (illegal feat after ability respec
now blocks at finalize), #16 (follower choices persist/materialize under the declared schema),
#12 (CREATE-bucket rollback deletes created actors on induced failure). See §14.

**Recommended next batch:** Force progression hardening — techniques/secrets/regimens cadence,
repeatable Force Power Mastery, detail-rail hydration, and class cadence visibility (where both
audits converge).

---

## 1. Scope

Full progression lifecycle inspected: chargen, level-up, multiclassing, prestige entry,
reconciliation, rollback, class/species/background/language grants, feats, talents, Force powers /
regimens / techniques / secrets, medical secrets, starship maneuvers, droid progression, nonheroic
progression, and follower (dependent-participant) progression.

Authorities read in full or in the relevant sections:

- `scripts/apps/progression-framework/shell/progression-session.js` (canonical session)
- `scripts/apps/progression-framework/shell/progression-finalizer.js` (finalizer, ~3.2k lines)
- `scripts/apps/progression-framework/shell/progression-shell.js` (orchestration; confirm/finalize path)
- `scripts/apps/progression-framework/shell/progression-reconciler.js` (reconciliation)
- `scripts/apps/progression-framework/steps/step-plugin-base.js` (step contract)
- `scripts/governance/actor-engine/actor-engine.js` (mutation authority; `applyMutationPlan`, rollback)
- `scripts/engine/progression/utils/levelup-entitlement-manifest.js` (entitlement authority)
- `scripts/engine/progression/utils/class-grant-ledger-builder.js`, `talents/talent-cadence-engine.js`
- `scripts/engine/progression/droids/droid-progression-guards.js`
- step plugins (matrix scan across all 40+ step files)

---

## 2. Method

- **Static structural read** of the authorities above, plus targeted `grep` sweeps for method
  presence, commit paths, mutation calls, dedupe logic, and prerequisite enforcement points.
- **A new report-only scanner** (`tools/check-progression-integrity.mjs`) that mechanically confirms
  the boundary findings (direct mutation, draft-write bypass, non-schema keys, registry bypass,
  step contract gaps). Its output is cited inline.
- **Separation of certainty:** every claim is tagged where relevant as **[static-proof]** (provable
  from source) or **[runtime-verify]** (needs a Foundry smoke test to confirm behavior). Anything
  touching live document ordering, async mentor timing, or actor recompute is treated as
  runtime-verify.

Checks run (all report-only, exit 0):

| Check | Result |
|---|---|
| `node --check tools/check-progression-integrity.mjs` | syntax OK |
| `node tools/check-progression-integrity.mjs` | 48 findings (19 registry-bypass, 23 draft-write, 6 non-schema) |
| `node tools/check-architecture-boundaries.mjs` | 34 (6 direct-actor-mutation, 28 registry-bypass) |
| `node tools/check-combat-math-ssot.mjs` | parity notes only (combat scope, not progression) |
| `node tools/check-feature-implementation-coverage.mjs --no-write` | coverage gaps: `class_skills`, `starting_features`, `starting_credits` = 5/37 classes populated |

No `package.json` / CI runner exists in the repo; tools are run directly with `node`, matching repo
convention.

---

## 3. Authority Map

| Authority | Owns | Notes |
|---|---|---|
| `ProgressionSession` (shell) | Canonical normalized draft state (`draftSelections`), schema validation, coercion, dedupe, watchers, persistence hooks | **Single source of truth.** `commitSelection()` is the only validating write path. |
| `ProgressionStepPlugin` (base) | Per-step selection, validation display, mentor context, `_commitNormalized()` helper | Commits fan out to session **+ buildIntent + committedSelections** (legacy mirrors). |
| `ProgressionFinalizer` | Compiles session → one mutation plan; validates before applying; hands to ActorEngine | Static class. `finalize()`, `finalizeSingleStep()`, `dryRun()`. |
| `ActorEngine` | The only legal actor mutation surface; `applyMutationPlan()` with transactional rollback; recompute | Derived writes gated to `DerivedCalculator`. |
| `buildLevelUpEntitlementManifest` | Read-only "receiving dock" — what a level *should* grant (feats, talents, ability increases, class features, choices) | Pure/read-only; materializes nothing. |
| `buildClassGrantLedger` / `TalentCadenceEngine` | Class auto-grants and heroic/class talent cadence | Feeds finalizer + reconciler. |
| `ProgressionContentAuthority` | Canonical content read seam (feats/talents/backgrounds/languages/Force docs) | Intended single import seam; **bypassed by several steps** (see §5, §11). |
| `ProgressionReconciler` | Post-commit re-derivation of active steps; timeline/entitlement reports | **No direct actor mutation** — pure planning. Good. |
| `ProgressionSubtypeAdapterRegistry` + adapters | Subtype-specific readiness + mutation-plan contribution (actor/npc/droid/follower/nonheroic) | The fail-closed seam for special tracks. |

### Legacy / deprecated paths still present

- **`scripts/engine/progression/ProgressionSession.js`** — a second `ProgressionSession` class.
  **[static-proof]** No importer found anywhere in `scripts/`. It is dead/superseded by the shell
  session. Recommend deletion (separate cleanup batch) to remove the dual-authority hazard.
- **`buildIntent` + `committedSelections` mirrors** — every `_commitNormalized()` writes the same
  value to `progressionSession.draftSelections`, `shell.buildIntent`, and
  `shell.committedSelections` (`step-plugin-base.js:489-498`). Documented as "backward compatibility
  during migration." Three copies of the same truth is the classic drift surface; the finalizer
  already ignores the mirrors, so they are removable once no reader remains.
- **`progression-finalizer-force-knowledge-patch.js`, `choice-resolution-finalization-patch.js`,
  `reconciliation-and-superior-skills-hotfix.js`** — named as patches/hotfixes layered onto the
  shell. Functioning, but flagged as consolidation candidates.

---

## 4. Progression Lifecycle Diagram

```
                 chargen / levelup / template / single-step
                                  │
                    ┌─────────────▼──────────────┐
                    │      ProgressionShell        │  isProcessing guard (re-entrancy)
                    │  steps[] + stepPlugins Map   │
                    └─────────────┬──────────────┘
       onItemFocused (no commit)  │  onItemCommitted (only commit path)
                                  ▼
                 ProgressionStepPlugin._commitNormalized()
                                  │  (writes 3 places)
        ┌───────────────┬─────────┴───────────┬────────────────┐
        ▼               ▼                     ▼                ▼
  session.commit   buildIntent          committedSelections   post-commit:
  Selection()      (legacy mirror)      Map (legacy mirror)   Reconciler +
   │  schema val,                                             ProjectionEngine
   │  coerce, dedupe,
   │  watchers, persist hooks
   ▼
  draftSelections  ◀── canonical single source of truth
        │
        │  Confirm  →  ProgressionShell._onFinalizeProgression()  [isProcessing lock]
        ▼
  ProgressionFinalizer.finalize(sessionState, actor)
        1. _validateReadiness            (droid-forbidden, required selections)
        2. adapter.validateReadiness     (subtype fail-closed seam)
        3. _validateDocumentType
        4. _compileMutationPlan          (coreData + patches + itemGrants + manifest)
        5. adapter.contributeMutationPlan
        6. _validateMutationPlan         (structure + droid acquisition block)  ── abort if invalid
        7. _applyMutationPlan  ──►  ActorEngine.applyMutationPlan(transactional:true)
                                         DELETE → SET → UPDATE → ADD → recalcAll
                                         on error → restoreFromSnapshot(pre-plan)
        8. (levelup) _auditLevelUpFinalization  ── post-apply receipt
        9. Hooks.callAll('swse:level-up-complete')
```

---

## 5. Step State Matrix

Scan across all step plugins for the base-contract methods and the commit path used. `cn` =
`_commitNormalized` (session), `cs` = direct `commitSelection`, `bi` = `getBlockingIssues`.

| Step | validate | getBlockingIssues | getSelection | commit path | Draft key | Risk |
|---|:--:|:--:|:--:|---|---|---|
| class-step | ✅ | ✅ | ✅ | `_commitNormalized` | `class` (+ direct `droid.*`) | **Med** – direct `droid.classConversionSurcharge/totalCost` writes |
| species-step | ✅ | ✅ | ✅ | `_commitNormalized` | `species`, `pendingSpeciesContext` | Low |
| attribute-step | ✅ | ✅ | ✅ | `_commitNormalized` | `attributes` | Low |
| skills-step | ✅ | ✅ | ✅ | `_commitNormalized` | `skills` | Low |
| feat-step | ✅ | ✅ | ✅ | `_commitNormalized` | `feats` | Low – commit gated on `isAvailable` |
| talent-step | ✅ | ✅ | ✅ | `_commitNormalized` | `talents` | Low – per-talent prereq gate + tree access |
| force-power-step | ✅ | ✅ | ✅ | `commitSelection` | `forcePowers` | Low |
| force-technique-step | ✅ | ✅ | ✅ | `commitSelection` | `forceTechniques` | Low |
| force-secret-step | ✅ | ✅ | ✅ | `commitSelection` | `forceSecrets` | Low |
| force-regimen-step | ✅ | ✅ | ✅ | `commitSelection` | `forceRegimens` | Low |
| medical-secret-step | ✅ | ✅ | ✅ | `commitSelection` | `medicalSecrets` | Low |
| language-step | ✅ | ✅ | ✅ | `commitSelection` | `languages` | Low – reconciliation deliberately skipped for languages |
| background-step | ✅ | ✅ | ✅ | `_commitNormalized` | `background`, `pendingBackgroundContext`, `backgroundLedger` | Low |
| starship-maneuver-step | ✅ | ✅ | ✅ | `commitSelection` | `starshipManeuvers` | Low |
| nonheroic-starting-feats-step | ✅ | ✅ | ✅ | `_commitNormalized` | `feats` | Low |
| droid-builder-step | ✅ | ✅ | ✅ | `_commitNormalized` | `droid` | Med (see §9) |
| prestige-survey-step | ✅ | ✅ | ✅ | (survey → session) | `prestigeSurvey` | Low |
| base-class-survey-step | inherit | inherit | inherit | **direct write** | `classSurveyDrafts`, `classSurveys` | Med – bypasses `commitSelection()` |
| l1-survey-step / galactic-profile-step | ✅ | ✅ | ✅ | **direct `survey` write** | `survey` | Low-Med |
| confirm-step / summary-step / levelup-review-step | ✅ | ✅ | n/a | finalizes (no commit) | — | Low |
| **follower-\* steps** | inherit | inherit | inherit | **direct write, non-schema keys** | `followerSkills`, `skillChoices`, `followerLanguages`, `languageChoices`, `followerBackground`, `backgroundChoice` | **High** (see §6/§9) |

**Findings:**

1. **[static-proof] Every real selection step implements `validate` + `getBlockingIssues` +
   `getSelection`.** `LevelupReviewStep extends SummaryStep` and `BaseClassSurveyStep extends
   L1SurveyStep`, so the two apparent gaps inherit their contract. No step can report "complete"
   without an implemented validator. The only `extends ProgressionStepPlugin` file lacking both is a
   UX mixin, not a step (excluded by the tool).
2. **[static-proof] Two commit conventions coexist** — `_commitNormalized(session)` and direct
   `commitSelection`. Both land in canonical `draftSelections`, so this is stylistic, not a drift.
3. **[static-proof] Direct `draftSelections` writes bypass `commitSelection()`** in 8 files (23
   sites; `check-progression-integrity.mjs → draft-write-bypass`). These skip schema validation,
   coercion, array-merge dedupe, watchers, **and persistence hooks (auto-save)**. Highest-risk are
   the **follower steps writing 6 non-schema keys** (`followerSkills`, `skillChoices`,
   `followerLanguages`, `languageChoices`, `followerBackground`, `backgroundChoice`) — these keys are
   not in `_buildSchema()`, so they never validate and any consumer must special-case them. The
   `template-adapter.js` bulk writes are lower risk (single hydration pass) but should still route
   through `commitSelection`.

---

## 6. Entitlement & Ordering Matrix

### Level-up ordering (per level event)

```
buildLevelUpEventContext(actor, session)         ── enteringLevel, selectedClass, isNewBaseClass/Prestige
        │
buildLevelUpEntitlementManifest(...)             ── READ-ONLY receiving dock
   ├─ generalFeat        : enteringLevel % 3 === 0 → 1        (levels 3,6,9,…)   ✅ RAW-correct
   ├─ abilityIncreases   : enteringLevel % 4 === 0 → 2 distinct (4,8,12,16,20)   ✅ RAW-correct
   ├─ heroicTalent       : TalentCadenceEngine.grantsHeroicTalent(level)          [runtime-verify cadence]
   ├─ multiclassStartingFeat : isNewBaseClass && options && !houseRuleExtra       ✅
   ├─ automaticClassFeatures : level features filtered by isMaterializedAutomaticFeature
   ├─ choices            : countChoices(features)  (feat/talent/forcePower/forceSecret/
   │                        forceTechnique/medicalSecret/starshipManeuver choices)
   └─ classSkills        : owned + selected class skill union
```

### Grant → consumption matrix

| Entitlement | Generated by | Consumed / materialized by | Status |
|---|---|---|---|
| general feat | manifest.generalFeat | feat-step slot → `feats` → finalizer `_compileProgressionAbilityItems` | ✅ displayed + finalized |
| ability increase | manifest.abilityIncreases | attribute-step → `attributes` patch | ✅ |
| heroic talent | TalentCadenceEngine | talent-step → `talents` → item grant | ✅ |
| class auto-features | manifest.automaticClassFeatures + `buildClassGrantLedger` | `_compileAutomaticClassFeatureItems` (type `feat`, `locked`, `choiceEditable:false`) | ✅ locked |
| multiclass starting feat | manifest.multiclassStartingFeat.options | `_compileClassAutoGrantItems` | ✅ |
| class skills | manifest.classSkills | core-data/patches | ✅ |
| force technique/secret/medical/maneuver choices | manifest.choices + class-features.json `choice.pool` | dedicated steps → item grants | ✅ (see §8) |
| **entitlement manifest snapshot** | finalizer | `set['flags.swse.levelUpEntitlementManifest']` | ⚠️ overwrite-only |

**Findings:**

4. **[static-proof] Entitlements are generated once (read-only manifest) and consumed once**
   per level event. The item-grant compiler dedupes by **session marker**
   (`sessionId::domain::selectionId::countIndex`) *and* by **type::name**, so re-running finalize
   within one session cannot double-grant (`progression-finalizer.js:2930-2974`). This is the
   strongest structural guarantee in the pipeline.
5. **[static-proof] The manifest flag is an overwrite, not an append.** Each level-up replaces
   `flags.swse.levelUpEntitlementManifest` with the latest level's snapshot; the post-finalization
   audit reads it back the same run. Correct for single-event auditing, but historical manifests are
   not retained — if a future feature needs per-level provenance it will not find it here.
6. **[static-proof] "Displayed but not finalized" risk — follower entitlements.** Follower selections
   live under non-schema keys (§5.3); whether the follower adapter's `contributeMutationPlan`
   consumes exactly those keys is **[runtime-verify]** and is the most likely place for a displayed
   choice to silently not materialize.
7. **[static-proof] No orphaned finalizer keys detected** for the core actor track: every domain in
   `_compileProgressionAbilityItems.domainConfig` maps to a producing step, and every producing
   step's key is a schema key. The tool found **0** finalizer-key-without-producer mismatches on the
   canonical keys.

---

## 7. Prerequisite Enforcement Matrix

Three layers examined: **display/filter**, **commit**, **finalization**.

| Prerequisite type | Display/filter | Commit | Finalization | Verdict |
|---|:--:|:--:|:--:|---|
| Feat prereqs | ✅ `isAvailable` via PrereqAdapter | ✅ blocks if `isAvailable === false` | ❌ not re-checked | **fail-closed at commit**, advisory at finalize |
| Feat *choice* legality (e.g. Skill Focus target) | ✅ | ✅ `FeatChoiceResolver.validateSelectedChoice` re-validates | ❌ | fail-closed at commit |
| Talent prereqs + tree access | ✅ filter | ✅ per-talent prereq gate after tree opens | ❌ | fail-closed at commit |
| Class / multiclass prereqs | ✅ | ✅ (class-step legality) | ❌ | fail-closed at commit |
| Prestige class prereqs | ✅ (locked browser) | ✅ | ❌ | fail-closed at commit |
| Force technique/secret prereqs | ✅ | ✅ | ❌ | fail-closed at commit |
| Droid restrictions (Force Sensitivity, CON prereqs) | ✅ | ✅ | ✅ `getDroidAcquisitionBlockReason` in `_validateMutationPlan` + `_validateReadiness` | **fail-closed at finalize too** |
| Required level-up selection counts | — | — | ✅ `validateLevelUpRequiredSelections` aborts finalize | fail-closed at finalize |
| Nonheroic restrictions (no talents) | ✅ TalentCadenceEngine → 0 | ✅ | ✅ | fail-closed |

**Findings:**

8. **[static-proof] Prerequisites are fail-closed at commit, but NOT re-verified at finalization**
   for feats/talents/classes/Force items. The finalizer's `_validateMutationPlan` checks plan
   structure, droid-forbidden acquisition, and required *counts* — it does not re-run
   feat/talent/class prerequisite evaluation. **Consequence [runtime-verify]:** if a selection's
   prerequisite is invalidated *after* commit but *before* confirm — e.g. lower an ability the
   feat depended on, remove a prerequisite feat via backtracking, or a script edits session state —
   the finalizer will still materialize the now-illegal item. The commit-time gate assumes the
   selection set is monotonic; backtracking + re-editing can break that assumption. This is the
   single most important correctness gap to validate at runtime.
9. **[static-proof] Droid restrictions are the exception and are correctly fail-closed at both
   readiness and mutation-plan validation.** Force Sensitivity and Constitution-dependent
   prerequisites are blocked for droid actors right before mutation.

---

## 8. Finalizer / Mutation Map

### Finalization sequence (see diagram §4, steps 4–9)

`_compileMutationPlan` → `{ coreData, patches, itemGrants, set, add, delete, metadata }`, validated,
then `ActorEngine.applyMutationPlan(actor, plan, { transactional:true, validate:true, rederive:true })`.

### ActorEngine mutation boundary

- **[static-proof] All finalizer mutations flow through `ActorEngine`.** `check-progression-integrity.mjs`
  found **0 `progression-direct-mutation`** findings — no `actor.update` / embedded-doc calls in the
  progression tree bypass the engine. (The 6 `direct-actor-mutation` hits from
  `check-architecture-boundaries.mjs` are outside progression.) The reconciler performs **no** actor
  mutation.
- Order inside `applyMutationPlan`: **CREATE → (rewrite temp IDs) → DELETE → SET → UPDATE → ADD →
  recalcAll**. Deterministic and single-recompute.
- Derived writes are gated: `system.derived.*` may only be written inside a `DerivedCalculator`
  cycle; `system.hp.max` only via `recomputeHP`. Progression cannot corrupt derived math directly.

### Rollback safety

10. **[static-proof] Transactional rollback exists and is used by the finalizer.**
    `applyMutationPlan` snapshots `actor.toObject(true)` before applying and calls
    `restoreFromSnapshot` on any failure; a failed restore sets `error.partialMutationPossible = true`
    (`actor-engine.js:2922-3041`). The finalizer requests `transactional:true`.
    **Caveats:**
    - The snapshot restores the **target actor only**. The `CREATE` bucket (world actors — relevant
      to follower/companion/store-asset creation) is **not** rolled back. For actor-local progression
      this is safe; for follower creation flows a mid-plan failure could orphan a created actor.
      **[runtime-verify]**
    - The finalizer's `_applyMutationPlan` swallows the thrown error into `{ success:false }` and
      `finalize()` returns it without re-throwing; the stale comment at `progression-finalizer.js:174`
      ("mutations may be partially applied") predates the rollback and is now misleading — rollback
      *does* run inside the engine. Doc-only correction candidate.

### Duplicate-grant / dedupe

11. **[static-proof] Dedupe is robust.** Two independent guards (session marker + type::name),
    with explicit `allowDuplicates` for `forcePowers`, repeatable talents, and Force Power Mastery
    techniques. Class-granted feats/talents are stamped `locked:true, choiceEditable:false`
    (answers "class-granted items locked where appropriate" — **yes**).

### Broad payloads

12. **[static-proof] No broad `system` replacement emitted by progression** except the intentional,
    source-tagged adoption path (`ActorEngine.apply:adoption`), which is not on the finalize path.
    Progression emits scalar SETs and embedded ADD/DELETE only.

---

## 9. Force / Droid / Nonheroic / Follower Findings

### Force progression

- **Grant sources [static-proof]:** `data/class-features.json` encodes Force technique/secret grants
  as `choice.pool` entries — techniques `when: "evenLevels"`, secrets `when: "level>=2EachLevel"` —
  for the Force-using classes (Jedi Knight/Master, Sith, Force-tradition prestige lines). The manifest's
  `countChoices()` converts level features into per-domain choice counts.
- **Step surfacing [static-proof]:** technique/secret/regimen/medical/maneuver steps are registered
  in `progression-node-definitions.js` with invalidation behaviors (`PURGE`/`DIRTY`), so they appear
  as conditional steps when the class grants the choice. Whether the detail rail hydrates the correct
  selection on entry is **[runtime-verify]**.
- **Item types [static-proof]:** finalizer creates the correct dedicated types — `force-power`,
  `force-regimen`, `force-technique`, `force-secret`; medical secrets are created as `feat` (by
  design, flagged `system.medicalSecret:true`, locked).
- **Repeatable Force features [static-proof]:** Force Power Mastery entries bypass type::name dedupe
  via the `forcePowerMasteryChoice` branch and are stamped `repeatable:true` with a `selectionSlug` —
  so the same technique can be taken multiple times with distinct choices. `forcePowers`
  `allowDuplicates:true` lets a power be added to a suite more than once.
- **Force Sensitivity / Training [runtime-verify]:** finalizer derives Force power slot counts and
  Force-point unlocks from selections; correctness of slot math per class/level is a smoke-test item.

### Droid

- Fail-closed guards (`droid-progression-guards.js`): Force Sensitivity blocked, Constitution
  prerequisites blocked, at both `_validateReadiness` and `_validateMutationPlan`. Droid-forbidden
  item specs filtered from grants. **[static-proof] fail-closed.**
- Standard-model droid heroic-class conversion surcharge is tracked via **direct** `draftSelections.droid.classConversionSurcharge/totalCost` writes in `class-step.js:491-494` — bypasses
  `commitSelection` (§5). Surcharge *calculation* correctness is **[runtime-verify]**.
- No droid "rest restriction" logic lives in the progression path (it is a combat/runtime concern) —
  out of scope, noted for completeness.

### Nonheroic

- `TalentCadenceEngine` returns 0 talents for nonheroic classes (**[static-proof] fail-closed** — no
  talent leakage). Dedicated `nonheroic-starting-feats-step` implements the full contract. Nonheroic
  feat-each-level cadence itself is **[runtime-verify]**.

### Follower (dependent participant)

- **Highest structural risk in this audit.** Follower steps write **non-canonical keys** directly to
  `draftSelections` (`followerSkills`, `skillChoices`, `followerLanguages`, `languageChoices`,
  `followerBackground`, `backgroundChoice`) bypassing schema validation and persistence hooks. The
  follower subtype adapter must consume exactly these ad-hoc keys; any mismatch means a **displayed
  follower choice that never materializes**, with no schema/validator to catch it. **[runtime-verify]
  — priority.**
- The CREATE-bucket rollback gap (§8.10) is most likely to bite the follower/companion creation flow.

---

## 10. Core Question Answers

1. **Selection stored in one canonical place?** Mostly — `draftSelections`. Undermined by 3-way
   legacy mirrors and by direct-write bypasses (esp. follower non-schema keys). *Qualified yes.*
2. **Every step validates completion before finalization?** Yes for canonical steps; finalizer also
   runs `validateLevelUpRequiredSelections`. *Yes.*
3. **Prereqs checked before commit/finalization, not merely displayed?** Checked at **commit** (fail-
   closed via `isAvailable`/choice validation). **Not re-checked at finalization** except droid +
   required counts. *Partial — see §7.8.*
4. **Entitlements generated once, consumed once?** Yes — read-only manifest + double dedupe. *Yes.*
5. **Grants deduped correctly?** Yes — session marker + type::name, with correct repeatable
   exceptions. *Yes.*
6. **Repeatable choices handled?** Yes — Force Power Mastery, repeatable talents, forcePowers. *Yes.*
7. **Class-granted items locked?** Yes — `locked:true, choiceEditable:false`. *Yes.*
8. **Rollback complete/safe after partial failure?** Yes for the target actor (transactional
   snapshot). CREATE-bucket world actors not rolled back. *Yes, with a follower-flow caveat.*
9. **Progression mutates actor outside ActorEngine?** No — 0 direct mutations in the progression
   tree. *No (good).*
10. **Derived recalculated only after canonical mutation?** Yes — `recalcAll` runs once post-apply
    inside the engine; derived writes gated to DerivedCalculator. *Yes.*
11. **Hidden/deferred grants surfaced, not dropped?** Core track yes (steps + manifest). Follower
    track is the risk. *Qualified.*
12. **Rapid click-through corrupt state?** `isProcessing` re-entrancy lock + session-marker dedupe
    protect double-confirm. Mentor dialogue is async/non-blocking (diagnostics-only). *Guarded;
    confirm under load = [runtime-verify].*
13. **Backtrack without duplicating/losing choices?** Dedupe prevents duplicates; the post-commit
    reconciler recomputes active steps. Risk is a **stale commit-time prereq surviving a backtrack**
    (§7.8). *Qualified — verify.*
14. **Droid/nonheroic/prestige fail-closed?** Droid + nonheroic yes. Prestige gated at commit, not
    finalize. *Mostly yes.*
15. **Final actor state matches what the UI said?** Provable for core track; follower non-schema keys
    and prereq-drift are the two places it could diverge. *[runtime-verify].*

---

## 11. Top Systemic Risks

| # | Risk | Evidence | Severity |
|---|---|---|---|
| R1 | **Prereqs not re-verified at finalization** — commit-time gate assumes monotonic selections; backtrack/respec can materialize an illegal feat/talent/class. | §7.8 | **High** |
| R2 | **Follower selections use non-schema draft keys**, bypassing validation + persistence; adapter must special-case them or choices silently drop. | §5.3, §9 | **High** |
| R3 | **Triple-mirrored selection state** (session + buildIntent + committedSelections) is a live drift surface. | §3, `step-plugin-base.js:489` | Med |
| R4 | **Dead second `ProgressionSession`** class invites accidental import of the wrong authority. | §3 | Med |
| R5 | **CREATE-bucket not rolled back** — follower/companion creation can orphan a world actor on mid-plan failure. | §8.10 | Med |
| R6 | **Steps import registries/DBs directly** (background/class/language/talent steps) instead of `ProgressionContentAuthority`, weakening the content read seam. | tool: 19 registry-bypass | Low-Med |
| R7 | **Class data coverage gap** — `class_skills`, `starting_features`, `starting_credits` populated for only 5/37 classes; 32 classes rely on finalizer fallbacks (e.g. `RAW_CORE_CLASS_STARTING_FEATS`). | coverage check | Med (data, not engine) |
| R8 | **Direct `draftSelections` writes** in survey/droid/template paths skip auto-save; a crash mid-survey loses unsaved intent. | tool: 23 draft-write | Low-Med |

---

## 12. Fastest Wins (low-risk, high-signal)

- **W1 [doc-only, safe now]** Correct the stale comment at `progression-finalizer.js:174` — rollback
  *does* run; "may be partially applied" is misleading. *(Not applied here to keep this audit
  reporting-only; trivial follow-up.)*
- **W2** Delete the unused `scripts/engine/progression/ProgressionSession.js` (no importers).
- **W3** Route the 6 follower non-schema keys through `commitSelection` by adding
  `followerSkills`/`followerLanguages`/`followerBackground` (or generic `follower`) to
  `_buildSchema()`, and drop the ad-hoc `*Choices` aliases.
- **W4** Add a finalization-time prerequisite re-check pass (see R1 → Batch A) — the single highest-
  value correctness fix.
- **W5** Wire `tools/check-progression-integrity.mjs` into whatever check-runner emerges, `--strict`
  once draft-write/non-schema findings are burned down.

---

## 13. Recommended Implementation Batches (follow-up, not this PR)

- **Batch A — Finalization prerequisite hardening (R1).** Add a `_validateSelectionPrerequisites`
  pass in `_validateMutationPlan` that re-evaluates feat/talent/class/Force prereqs against the
  *projected* post-plan actor and aborts finalize on violation. Fail-closed, transactional-safe.
- **Batch B — Follower canonicalization (R2, R5).** Add follower keys to the session schema; make the
  follower adapter consume canonical keys; extend transactional rollback (or a compensating delete)
  to CREATE-bucket world actors for follower creation.
- **Batch C — Legacy-mirror retirement (R3, R4).** Remove `buildIntent`/`committedSelections` readers,
  then the mirrors; delete the dead `ProgressionSession`.
- **Batch D — Content-seam tightening (R6) + data backfill (R7).** Move step registry imports behind
  `ProgressionContentAuthority`; backfill `class_skills`/`starting_features`/`starting_credits` for
  the 32 classes now relying on fallbacks.
- **Batch E — Draft-write cleanup (R8).** Convert survey/droid/template direct writes to
  `commitSelection`.

---

## 14. Runtime Smoke Checklist (Foundry manual)

Each item is **[runtime-verify]**; ✎ marks a step exercising a specific audit risk.

1. Level-1 chargen for **each base class** (Jedi, Noble, Scoundrel, Scout, Soldier) → confirm
   starting feats/skills/credits materialize (✎ R7 fallback path for classes lacking data).
2. Multiclass into a second base class → multiclass starting feat offered once, granted once.
3. Attempt an **illegal prestige class** → blocked at browser/commit.
4. Enter a **legal prestige class** → prestige survey + grants materialize.
5. **Jedi Knight** gains a Force **Technique** at an even level → step appears, item type
   `force-technique`.
6. **Jedi Master / Sith Lord / Force Disciple** gains a Force **Secret** → step appears, type
   `force-secret`.
7. **Force Training** selecting powers → correct suite count; powers type `force-power`,
   `inSuite:true`.
8. **Human** species bonus feat → single extra feat, deduped.
9. Species with **natural weapon** → weapon materializes, no duplicate on re-open.
10. **Standard-model droid** heroic class → conversion surcharge applied; Force Sensitivity blocked
    (✎ R2/droid).
11. **Nonheroic** level-up → feat granted, **no talent** offered (✎ fail-closed).
12. **Rollback after a partially completed level-up** → actor returns to pre-plan state; no orphaned
    items (✎ R5; check follower creation separately).
13. **Backtrack through steps after selections**, then lower an ability a chosen feat required, then
    Confirm → **does the illegal feat still get granted?** (✎ R1 — the key test).
14. **Rapid-click** through mentor dialogue + Confirm → no double-grant, no corrupted state (✎ R-12).
15. Roll attack/damage/skill **after finalization** → derived values reflect the new grants
    (recompute ran).
16. **Follower** build: pick follower skills/languages/background, finalize → confirm every displayed
    follower choice actually lands on the follower actor (✎ R2 — the follower key test).

---

## 15. Limitations

- **Static audit.** All behavioral claims about live document ordering, async mentor timing, actor
  recompute, follower-adapter key consumption, and prerequisite drift are marked **[runtime-verify]**
  and require the §14 smoke tests to confirm. Static proof establishes *structure and reachability*,
  not *runtime outcome*.
- The finalizer (~3.2k lines) and shell (~4.1k lines) were mapped by structure + targeted reads, not
  line-by-line in full; conclusions rest on the authoritative seams (commit, compile, apply, dedupe,
  rollback) which were read directly.
- The new tool is regex/line-based and deliberately conservative; it can miss dynamically-computed
  mutation paths and can over-report legitimate seam files (allowlisted where proven). Treat its
  counts as a floor, not a census.
- Content correctness (whether `class-features.json` matches RAW for every class/level) was spot-
  checked, not exhaustively verified; the coverage check surfaces the population gaps but not
  semantic errors.
