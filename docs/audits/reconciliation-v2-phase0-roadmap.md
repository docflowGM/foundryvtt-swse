# Reconciliation V2 — Phase 0 Roadmap

**Proposal only. Nothing here is authorized for implementation.** Phase 1 requires explicit owner approval after reviewing `reconciliation-v2-phase0-findings.md`.

Constraints carried from the command and `CLAUDE.md`: strict V2 cutover (no migrations, crosswalks, or permanent legacy adapters); reuse existing engines; fail closed; read-only reconciliation by default; no automatic mutation from ambiguous or unverifiable results; no rules decisions by the implementer.

## 1. Target result model (one vocabulary, replaces five)

Per entitlement/fact the evaluator returns exactly one of:

| Status | Meaning | Player-facing `!`? |
|---|---|---|
| `satisfied` | Explicit evidence ties an owned item/record to the entitlement | no |
| `missing` | History proves the choice is owed and nothing satisfies it | **yes** (launch existing progression recovery) |
| `invalid` | A recorded choice demonstrably violates an established rule | **yes** |
| `ambiguous` | A relevant item exists; provenance cannot be established; a specific classification action exists | **yes**, only if a review action exists |
| `unverifiable` | History insufficient to conclude (e.g. no `abilityIncreaseHistory`, no HP records) | **no** by default (diagnostic detail only) |
| `engine-failure` | The validator itself failed or class authority unresolved | **GM only**, never described as a character error |

Roll-up: sheet indicator = any of `missing | invalid | ambiguous-with-action`. Everything else renders **nothing** (Silent Success Contract).

## 2. Open owner decisions needed before Phase 1 (engineering authority, not rules)

* **D1 — class-level authority on disagreement.** The runtime already uses `classLevels` else class items (`derived-calculator.js:159`). Finalizer level-up writes both; **chargen writes only `system.class` + item [S]**. Options: (a) make chargen also write the ledger, then treat `classLevels` as the sole reader and report item disagreement as a GM-visible `engine-failure/conflict`; (b) read items as authority and demote the ledger. Phase 0 will not pick one (command: "do not resolve conflicts through arbitrary precedence rules").
* **D2 — fate of `patches/progression-ledger-reconciliation-hotfix.js`'s item-level writer** (it embeds D1 in a mutator). Recommend removal once D1 lands; needs owner OK because it modifies stored actors on GM clients.
* **D3 — Phase 0.5 live read-only export** of real actors (class sources, provenance flags, histories) to answer "V2-generated vs pre-refactor", which this audit could not answer.
* Rules questions RECON-001…004 are separate (`swse-rules-decisions-pending.md`); the evaluator must be built so each can be answered by a data/config change at one site, and until answered the affected slots render as `unverifiable`/deferred, not guessed.

## 3. Phases

### Phase 0.5 (optional, read-only) — live export
In-Foundry macro/script (no writes) exporting per-actor: `system.level`, `classLevels`, class items, `system.class/classes`, item provenance flags, histories, current reconciliation verdict. Output feeds fixtures and gives the real false-positive rate. **Risk:** none (read-only). **Gate:** D3.

### Phase 1 — Class authority + result schema (blocks everything else)
* Add one reader (extend/export the logic behind `derived-calculator.js:159`, per D1) returning `{rows, conflicts}`; replace the five readers (inventory §3).
* Resolve classes only through `ClassesRegistry/resolveClassModel`; unresolved ⇒ typed `engine-failure` (kills `|| {}` dead branch, RCN-P0-03).
* Read `ClassModel.baseClass/prestigeClass/hitDie/baseHp/defenses/levelProgression`; Nonheroic via the registry's `isNonheroicClassRef` only; delete name heuristics, hit-die name arrays, `model.system.*` probes, duplicate Nonheroic BAB table (RCN-P0-10).
* Define the §1 status enum once; map existing slot/row/report statuses onto it.
* Separate `totalLevel` and `totalHeroicLevel` computed once (RCN-P0-06).
* **Components:** `progression-reconciler.js` (class helpers), `…entitlement-calculator.js`, `…report-builder.js`, `class-resolution.js` (consume only), possibly `derived-calculator.js` (export only).
* **Exit:** C1–C5, C9, C10, C15 produce the expected statuses; no behavior change to BAB/defense runtime.

### Phase 2 — Evidence-based entitlement vs ownership
* Replace `_fillLinearSlots`, `_markAmbiguousSlots` (`queue.shift`), `_fillClassChoiceSlots` flexible matching with provenance matching on existing item flags (`selectionKey`, `slotType`, `classId`, `classLevel`; `levelUpFinalizationReceipt` for the latest level). Unmatched ⇒ `ambiguous`/`unverifiable`, never `satisfied`, never both `missing` and `overfilled` (RCN-P0-02).
* Feat and talent pools use identical rules (C8).
* Per-level entitlement numbers come from the same functions the level-up manifest uses (`levelup-entitlement-manifest.js`) refactored into pure per-level functions, so reconciliation and level-up cannot disagree (RCN-P0-05). Rules-dependent branches stay deferred (RECON-001…003).
* One HP evaluator; its status is never rewritten downstream; exact/bounded/minimum/unverifiable separated; hit die via `getClassHitDie` (RCN-P0-04).
* Ability increases: no history ⇒ `unverifiable` (RCN-P0-05). `share_talent_choice` and other unknown choice types explicitly listed as audited or `unverifiable` (RCN-P0-13).
* Remove the report-builder's re-derivation of classes/levels; define `_attachRemediationActions` on the class and delete both monkeypatch shims (RCN-P0-09).
* **Components:** reconciler pools/slot builders, builder, calculator; `reconciliation-remediation-hotfix.js` + the shim in the ledger hotfix (retire).
* **Exit:** C6–C8, C12–C14 as expected; regression matrix §4 green.

### Phase 3 — Character-sheet UI (Silent Success Contract)
* Remove audit panels from `summary-tab.hbs`, `talents-tab.hbs`, `abilities-tab.hbs`; stop printing `diagnostics.message` to players.
* Add one `!` button after Settings in `header-block.hbs:84`, rendered **only** when the roll-up in §1 is actionable; GM diagnostic affordance only when `engine-failure`.
* Click ⇒ `openOverlay('character-validation', …)` (`actor-sheet-base.js:452`); register the VM in `ShellSurfaceRegistry.buildOverlayVm` (`:79`, next to `upgrade-single-item`). Report data = the same report object (no second status calculation).
* Remediation: reuse `LevelupShell` reconcile mode (`levelup-shell.js:187-258`) for `missing`; classification action for `ambiguous`; no auto-mutation.
* **Minimum new code:** one template + one VM builder + one header conditional; no new engine.
* **Exit:** UI acceptance §6.

### Phase 4 — Performance
* One memoized report per actor, keyed by actor revision + class-item revisions + class-registry version + relevant settings (HP mode, house-rule cadence flags); invalidated by `updateActor/Item` on progression-relevant paths; both `concept-context` and `HomeSurfaceService` read the memo. Cache display projections; never cache permissions.
* Header consumes only the roll-up flag.
* **Exit:** §5.

### Phase 5 — Retirement
Delete only after the conditions in §7.

## 4. Regression test matrix (Phase 1–2; automated, non-mutating, real `packs/classes.db`)

| # | Fixture | Required result |
|---|---|---|
| 1 | Newly generated L1 (chargen shape: `system.class` + item, no ledger) | provenance reported truthfully; no phantom ledger label; no false missing |
| 2 | Single-class heroic with full receipts | all `satisfied` |
| 3 | Multiclass heroic (Soldier 4/Scout 3), ledger+items agree | levels exact; class slots per `levelProgression` |
| 4 | Ledger and items disagree | `engine-failure/conflict`, no precedence guess |
| 5 | Prestige class | classification from `ClassModel.prestigeClass`, not name |
| 6 | Nonheroic + mixed | `totalHeroicLevel` ≠ `totalLevel`; deferred rules render `unverifiable` |
| 7 | Species-granted feat | not counted against general slots |
| 8 | Manual feat/talent, no metadata | `ambiguous` or `unverifiable` — never `satisfied`/`missing`; feat/talent symmetric |
| 9 | Multiclass untagged class feat | one `ambiguous`, zero `overfilled`, zero phantom `missing` |
| 10 | Fully recorded history | exact HP; overwritten statuses impossible |
| 11 | Intentionally missing entitlement with proof | `missing` + recovery action |
| 12 | Unresolvable class | `engine-failure`, no fabricated slots, GM-only |
| 13 | Droid | per deferred rule; `unverifiable` until RECON-002 resolved |
| 14 | No `abilityIncreaseHistory` | `unverifiable`, no "missing" |
| 15 | Forced layer exception | `engine-failure`, never `ok`/empty |
| 16 | Unknown / `share_talent_choice` feature | audited or explicit `unverifiable` |

## 5. Performance acceptance criteria

* UI-only re-render (tab switch, panel expand) performs **0** reconciliation runs.
* Item/actor mutation unrelated to progression performs **0** runs.
* A progression-relevant mutation triggers **≤ 1** run per actor per render cycle, shared by sheet and Holopad.
* Cold run for the Phase 0 heavy fixture (L20, 3 classes, 90 items) ≤ the measured 15.4 ms Node baseline (the baseline is a floor; in-Foundry figure to be captured in Phase 0.5).
* Cache has a stated invalidation key; stale entries are never served as current.

## 6. UI acceptance criteria — Silent Success Contract

* Zero reconciliation DOM (no panel, check, banner, toast) when no actionable finding exists; verified for fixtures 2, 3, 7, 10.
* `!` appears iff roll-up is actionable; disappears after the report refreshes with no actionable findings.
* No notification on open. `unverifiable` alone never shows `!`.
* `engine-failure` is visible to GMs only and worded as a tooling problem.
* No audit content remains in Summary/Abilities/Talents tabs.

## 7. Conditions to remove legacy logic

| Legacy item | Remove when |
|---|---|
| Report-builder class/level reconstruction (`_actorClassLevelLedger`, `_normalizedClassSummaries`, `_actorTotalLevel`) | Phase 1 reader is the only consumer path; fixtures 1–6 pass |
| Both `_attachRemediationActions` shims | Method defined on the class; grep shows no importers of `reconciliation-remediation-hotfix.js`; remove the side-effect import in `squad-actions-init.js` |
| `progression-ledger-reconciliation-hotfix.js` item-level writer | D1/D2 decided; chargen/ledger writer gap closed |
| Sheet audit panels | Phase 3 overlay in place and HomeSurface migrated |
| `_buildFallbackReport` / `_emptySheetAudit` empty-success shape | `engine-failure` status implemented and rendered GM-only |
| `RECONCILIATION_CACHE` stale-prefix fallback | Phase 4 memo replaces it |

**Keep:** `ProgressionReconciler.reconcileAfterCommit` and its dirty-node helpers (`step-plugin-base.js:569-611`) — unrelated responsibility.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Hidden consumer of the removed report fields (`classification`, `timeline`, `repairSuggestions`, `tasks`) | Phase 1 grep + keep a versioned report shape until Phase 3; timeline builder not yet audited |
| Behavior change on live worlds (fewer warnings) | Phase 0.5 export before/after diff |
| D1 chosen wrongly | Conflict surfaced, not resolved; reversible |
| Rules-dependent slots (RECON-001…004) left deferred | Render as non-alerting `unverifiable`; owner rulings land as single-site changes |
| In-Foundry-only behavior (hook order, shim load order, render cost) | Foundry validation checklist in Phase 4 exit |

## 9. Recommended Phase 1 scope (for review)

D1/D2 decided → Phase 1 only (class authority, status enum, level split, dead-branch removal, name-heuristic removal) with fixtures 1–6, 10, 12, 15. **No UI, no cache, no slot-matching changes in Phase 1.** Phase 0.5 can run in parallel.
