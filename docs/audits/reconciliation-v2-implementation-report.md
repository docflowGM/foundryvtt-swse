# Reconciliation V2 — Implementation Report (Phases 1–5)

Follows `reconciliation-v2-phase0-{inventory,findings,roadmap}.md`. Date 2026-11-12. Authorized by the project owner ("keep going through the phases"). Rules questions remain with the owner: **no SWSE rule was decided** (RECON-001…004 stay `DEFERRED_RULES_REVIEW`; their slots render as non-alerting `unverifiable`).

Evidence: **[T]** executed/automated · **[S]** static · **[F]** needs in-Foundry verification.

## Engineering decisions taken (owner pre-authorized engineering calls)

| ID | Decision | Why |
|---|---|---|
| D1 | The class-level reader reads `system.progression.classLevels` and owned class Items. One source ⇒ used (truthfully labelled). Both ⇒ must agree per class **and** against `system.level`. **Disagreement is reported as a conflict (engine finding, GM-only); no precedence, `max`, or concatenation is applied.** Legacy shapes (`system.classes`, `system.class`, `progression.classes`) are not read. | Phase 0 instruction: no arbitrary precedence. Chargen writes only an item, level-up writes both, so single-source must be valid. |
| D2 | `patches/progression-ledger-reconciliation-hotfix.js` **item-level sync is left in place** (out of reconciliation scope, has its own passing test). Only its duplicate report-builder shim was removed. | Removing a GM-side mutator changes stored actors; not needed for correctness now that disagreements are surfaced. Residual risk below. |
| D3 | Live read-only export **not done** (needs a running Foundry). | Cannot be done in this environment. |

## What changed, by phase

**Phase 1 — class authority / result model** · `reconciliation/class-level-reader.js` (new, one reader). Entitlement calculator rewritten around it: fail closed (class status ≠ `ok` ⇒ no slots, levels 0, `classAuthority` recorded); `totalHeroicLevel` is Σ non-Nonheroic (no `|| totalLevel`); hit die / base HP come only from `ClassModel` (name arrays and `0` defaults removed); `class-progression-missing` finding replaces the dead `|| {}` guard; unaudited `*_choice` feature types are listed. Prestige/Nonheroic come from `ClassModel.prestigeClass` / the registry's Nonheroic check. Removed from the reconciler: `readActorClassLevelLedger`, `buildClassLevelLookup`, `highestClassLevelFor`, `getActorTotalLevel/HeroicLevel`, `isNonheroic/PrestigeClassSummary`, `_buildClassSummaries`, the duplicate Nonheroic BAB table. Report builder no longer re-derives levels/classes. Report now carries `status` ∈ `ok | needs-attention | engine-failure`, `rollup {playerActionable, gmDiagnostic, counts}`, `engineFindings`, `deferredRules`, `coverage`.

**Phase 2 — evidence-based matching** · Pools are provenance-only (`general`, `class` with class identity, `classUntagged`, `unknown`); feats and talents follow identical rules. A class slot is satisfied only by an item whose class id (and class level, when recorded) matches. Unattributed items are *counted* against open slots (slots become `unverifiable`); they never fill, never become "extra", never alert. Single HP evaluator (calculator); the builder no longer rewrites it. HP: below arithmetic minimum ⇒ `issue`; above audited maximum ⇒ `unverifiable` (RECON-004); incomplete history ⇒ `unverifiable`. Ability increases: shortfall proven only by a partial durable record; absent history ⇒ `unverifiable`. Derived rows: only confirmed discrepancies need attention; absent current value is no longer coerced to `0` (`Number(null)` bug that produced "BAB should be +2 but is +0"). `_attachRemediationActions` defined on the builder; both monkeypatch shims retired.

**Phase 3 — Silent Success Contract** · Audit panels removed from Summary, Abilities, Talents (−434 template lines; also the Abilities-tab "Ability Increases x/y resolved" card). Header `!` (`open-validation-report`) renders only when `conceptLayout.validationIndicator.visible`; players see it only for actionable findings, GMs additionally for engine diagnostics. Click opens the existing shell overlay (`character-validation`, registered in `ShellSurfaceRegistry`) which reuses the existing `resolve-progression-slot` handler for recovery. Read-only; nothing mutates automatically. Repair suggestions moved into the overlay as text.

**Phase 4 — performance** · Write-only cache replaced by a memo keyed on actor `_stats.modifiedTime`, progression-relevant item stamps, class-registry state, and house-rule settings; no stamp ⇒ no memo; hits return a `structuredClone`. Sheet and Holopad share one entry. Stale last-known-good fallback deleted (engine failure now fails closed).

**Phase 5 — retirement** · Deleted `reconciliation-remediation-hotfix.js` and its side-effect import; removed the second shim from the ledger hotfix; removed `findLastKnownGoodReport`/`_markReportStale`.

## Findings disposition

| Finding | Status |
|---|---|
| RCN-P0-01 class authority | **Fixed** [T] (reader + conflict). Ledger-hotfix writer remains (D2). |
| RCN-P0-02 queue-order matching / feat-talent asymmetry | **Fixed** [T] |
| RCN-P0-03 dead guard / fabricated heroic talents | **Fixed** [T] |
| RCN-P0-04 HP overwrite / hit-die names | **Fixed** [T]; bounds semantics pending RECON-004 |
| RCN-P0-05 absent history = missing | **Fixed** [T]; counts pending RECON-002/003 |
| RCN-P0-06 heroic = total | **Fixed** [T]; basis pending RECON-003 |
| RCN-P0-07 fail-open / stale cache | **Fixed** [T] |
| RCN-P0-08 false provenance; mutating hotfix | Labels **fixed** [T]; item-sync writer **retained** (D2) |
| RCN-P0-09 monkeypatch shims | **Fixed** [T] (static test) |
| RCN-P0-10 shape-sniffing | **Partly fixed**: class identity, hit die, base HP, Nonheroic BAB table. **Remaining:** BAB/defense/progression-array readers (`_readClassDefenseBonuses`, `_resolveClassLevelProgression`, `_readClassBabAtLevel`) still probe legacy `model.system.*` shapes; existing contract test builds legacy-shaped fixtures. |
| RCN-P0-11 cache write-only | **Fixed** [T]; in-Foundry cost [F] |
| RCN-P0-12 UI duplication / raw diagnostics | **Fixed** [S/T] (templates asserted); rendering [F] |
| RCN-P0-13 unaudited feature types | **Surfaced, not audited**: `share_talent_choice` is listed in `coverage`, not yet entitlement-checked |
| RCN-P0-14 status model | **Fixed** (closed set; `ambiguous` intentionally non-alerting — see below) |

## Behavior notes the owner should know

* `ambiguous` never raises `!`: unattributed items are informational (`unverifiable`). Rationale: your direction that unknown provenance alone must not warn. The cost is that a *genuinely* missing choice is invisible while unattributed items ≥ open slots of that kind.
* Multiclass talent slots, all Nonheroic/mixed slots, and droid ability increases are silent until RECON-001…003 are ruled.
* Items with explicit class provenance beyond entitlements are `overfilled`, informational only (GM grants/talent-granting feats are legitimate).
* The `unverifiable` HP-above-maximum case is a deliberate non-verdict, not "OK".
* Typed auxiliary pools (force secrets/techniques/powers, medical secrets, maneuvers) still match by type count; they can alert if truly short.

## Tests and validation (all run, all pass)

* `tests/reconciliation-v2-contract.test.mjs` (new, 22 checks, real `packs/classes.db`): reader, conflict, prestige, Nonheroic, provenance matching, HP, ability history, engine failure, Silent Success, memo, template assertions, shim retirement.
* Updated: `tests/progression-derived-class-stat-audit-contract.test.mjs` (real registry; adds conflict/unresolved), `tests/superior-skills-talent-hydration.test.mjs` (tolerates deleted shim).
* 70 related test files (anything referencing reconciler, builder, concept-context, shell registry/host, hotfix, HomeSurface, header/tab templates) exit 0.
* `node --check` on every changed JS; `tools/validate-partials.mjs` OK; `tools/validate-data.js` passed; `system.json` valid.
* Performance [T, Node, same level-20 triple-class/90-item fixture as Phase 0]: **15.4 ms → 3.75 ms cold**, **1.27 ms memo hit**. Memo-hit rate in Foundry [F].

## Not done / needs Foundry [F]

Rendering of the `!` and overlay; overlay close/resolve flow; hook-driven re-render timing and memo invalidation on live documents; real cost per render; the timeline builder's use of `isPrestige` (unchanged, unaudited); the live read-only actor export (D3) to measure the real false-positive rate before/after; ledger-hotfix interplay with the new conflict finding (a conflict can still be auto-healed by the hotfix before the user sees it).

## Residual follow-ups (recommended order)

1. Owner rulings RECON-001…004, then enable those slots (single-site changes in `RULE_DEFERRALS` / `_applyDeferredRules`).
2. Retire the remaining legacy shape probes (RCN-P0-10) and migrate the contract-test fixtures to `ClassModel` shape.
3. Decide D2 (remove the ledger item-sync writer) after Foundry verification.
4. Audit `share_talent_choice`.
5. Run the live export (D3).

## Addendum — Progression Authority (certified evidence)

Implemented after the owner's addendum; see `reconciliation-v2-progression-authority-audit.md`. Summary: the finalizer now appends a durable per-transaction certification (item-instance ids bound to the manifest's class / class level / character level) only after `applyMutationPlan` and the post-apply audit; reconciliation reads it through a thin read-only contract (`progression-evidence.js`), satisfies slots from certified grants first, never labels a certified grant "extra", and treats missing/failed/forged records as evidence gaps with GM-only diagnostics. New test: `tests/progression-evidence-reconciliation.test.mjs` (12 checks, includes the legit-generated-and-leveled regression). Not done: single-step finalization, non-feat/talent grants, in-Foundry verification of the write path.

## Addendum 2 — Acquisition pathways

See `reconciliation-v2-acquisition-pathways-audit.md`. Live drag-and-drop of feats/talents is now validated before the actor changes (shared `acquisition-authority.js`: existing prerequisite authority + reconciliation entitlement + certified evidence), blocking players only on a proven problem and routing GMs to the existing GM-grant dialog (previously unreachable dead code). GM-authorized exceptions are `external` evidence outside slot accounting. Class drops no longer silently add a level for players. New test: `tests/acquisition-authority.test.mjs` (11 checks). Residuals: add-ability buttons, importers, dead duplicate drop modules, in-Foundry verification.

## Addendum 3 — Independent review corrections

Certification now requires a real labelled, non-vacuous post-commit audit (else `unverified`); grants bind item type / canonical id / transaction stamp so a replaced item keeping an embedded id inherits nothing; certified grants are never credited to a different slot. Details and the explicit unit-vs-integration test scope: `reconciliation-v2-progression-authority-audit.md` §7. PR stays draft pending Foundry runtime verification.

## Addendum 4 — Final certification-integrity corrections

Transaction-specific materialization evidence (older/planned items do not prove a grant), GM-authorization bypass removed (`resolveGmOverride`), canonical identity continuity enforced. See `reconciliation-v2-progression-authority-audit.md` §8. PR remains draft pending Foundry V13 acceptance: chargen → multiclass level-ups → save/close/reopen → delete a certified grant → `!`; live drag-and-drop; GM override dialog; retained class-ledger hotfix.

## Phase 6 - Advisory reconciliation (owner-directed; supersedes strict acquisition gating)

**Product decision:** the progression engine is a convenience, not a requirement. Manual building is fully supported; reconciliation is an advisory character repair assistant. Certification remains supporting evidence only.

* **Header `!` -> Character Review overlay with four columns: Error | Explanation | Resolve | Ignore (x, tooltip "Ignore this warning").** Findings (`reconciliation-findings.js`) are specific mechanical discrepancies with stable identities: `slot:<slot id>` (missing selection) and `derived:<stat>:<expected>:<actual>` (e.g. `derived:bab:4:2`). Missing provenance/certification never creates a finding.
* **Resolve (controlled registry, `reconciliation-resolvers.js`):** BAB / defense -> canonical recalculation (`ActorEngine.recalcAll`), never an overwrite of a derived field; HP -> `ActorEngine.recomputeHP` (the sole writer of `system.hp.max`) after confirmation; missing feat / class feat / talent / ability increase -> opens the existing reconcile-mode progression step (no level increment, no mutation by the resolver). Each resolve re-derives the finding from a fresh report first (so a second click is a no-op), is guarded against rapid double clicks, and **verifies by subject** that the discrepancy is actually gone - an unchanged or moved-but-still-wrong value is reported as unchanged. No resolver exists for conflicts or unverifiable data (those stay GM diagnostics).
* **Ignore:** records `{id, code, expected, actual, ignoredBy, ignoredAt}` in `flags.swse.reconciliationIgnored` via ActorEngine; no statistic or item changes. Ignored findings are removed from the ledger/derived/task projections too (Holopad tasks no longer nag). If the discrepancy changes (e.g. expected BAB 4 -> 5) it is a new id and reappears; the old record is reported stale and can be cleared. Ignored warnings are listed with Restore for anyone who can use the sheet (it only un-hides an advisory; no GM-only gate).
* **Manual building restored (default advisory):** `validateAcquisition` always allows; proven problems (unmet prerequisites, no identified open entitlement) come back as non-blocking `advisories` shown as an info notice. Class drops are no longer intercepted or redirected to Level Up: they use the existing class-level writer in `DropResolutionEngine` (no second writer). The previous strict behavior is preserved behind `strict: true` / `getAcquisitionMode() === 'strict'` (reads an optional, **unregistered** world setting `strictAcquisition`; nothing enables it by default).
* **Tests:** `tests/reconciliation-phase6-advisory.test.mjs` (15 checks, unit/mock); strict-mode assertions moved to explicit `strict: true` in `acquisition-authority.test.mjs`.

### Acceptance checklist (Foundry V13, not yet performed)
1. Character built only by dragging a class + feats + talents (no wizard): no `!` while mechanics are consistent.
2. Create a BAB discrepancy: `!` appears; Resolve recalculates and the row disappears; clicking Resolve twice does nothing the second time.
3. Missing talent: Choose opens the matching step; completing it removes the row; character level unchanged.
4. HP below minimum: Resolve asks for confirmation, recomputes via the canonical HP authority, and reports honestly if still below.
5. Ignore a row: it disappears, reopening the sheet keeps it hidden, stats unchanged; level up so expected BAB changes: a new row appears; Restore brings ignored rows back.
6. Header `!` disappears when all findings are resolved or ignored.
7. Drag a class, feat and talent onto a sheet as a player: never blocked; advisory notice only when a proven problem exists.
8. Chargen -> multiclass level-ups -> close/reopen: no false findings; delete a certified grant: `!`.
9. Class-ledger hotfix interplay; GM override dialog under strict mode.

### Known limits
Class-level conflicts, unverifiable data and engine failures are GM diagnostics with no one-click choose-the-record repair (not in this phase's scope). The HP "Recompute" uses the canonical HP formula, which can differ from the reconciler's history-based minimum; the resolver reports that honestly rather than forcing a value (two HP formulas are a pre-existing duplication worth a rules/engineering decision).

## Phase 6 addendum - House-rule coverage

Full matrix and defects: `reconciliation-v2-house-rule-coverage.md`. Implemented: a single canonical grant table (`house-rule-grant-table.js`); the duplicate live materializer removed so `HouseRuleFeatGrants` is the only creator (and offers replacements only on rule switch-on, once); durable provenance on new grants and replacements (existing items untouched); reconciliation recognizes house-rule grants outside slot accounting (explicit marker, or inferred only for unstamped canonical items of currently enabled rules), reports a missing enabled grant as its own finding with an **Add** resolve through `HouseRuleFeatGrants.grantMissing`, represents the extra level-1 talent as its own entitlement, and replaces the per-feature cadence key in the memo with one complete feat/talent-rules signature plus sheet refresh on rule change. Not decided: talent cadence under `talentEveryLevel` (RECON-005); `talentDoubleLevels` and `multiclassBonusChoice` have no consumer and are informational. Tests: `tests/reconciliation-house-rules.test.mjs` (18 checks; unit + stub-integration, no Foundry runtime).

## Phase 6 independent review (b9356c0) - follow-up

**1. HP repair authority (blocker) - Resolve disabled; the recomputeHP crash is intentionally NOT fixed.**
* *Finding confirmed:* `ActorEngine.recomputeHP()` declares `conBase/conRacial/conEnhancement/conTemp` inside `if (!isDroid) {...}` and its changed-HP log reads them outside that block, so any call that would CHANGE the maximum throws a `ReferenceError` first.
* *Why I did not fix it:* the repository already pins this as "Defect B" in `tests/hp-preservation-authority.test.mjs` and states, with executed evidence, that it must NOT be fixed alone. The crash is currently the only thing preventing `recomputeHP()` ("Defect A": a stateless reconstruction from the first class item and an average hit die) from overwriting a certified, history-accumulated maximum (that test's character: certified 108, reconstruction 88) whenever a CON change, HP-affecting item or level change triggers a recompute. Hoisting the variable alone would turn a crash into silent HP corruption on every affected actor. I made the one-line fix, found the pinned test failing, and reverted it. **The review's request to fix and test this path conflicts with that standing project constraint; defect A has to be fixed first (or together).** This needs an owner decision on the HP authority (below).
* *Authority audit:* two HP formulas exist and disagree.

| | `ActorEngine.recomputeHP` | reconciliation HP audit |
|---|---|---|
| Starting HP | first class item: `progression.hpAtFirstLevel` or `hitDie x 3` (item fields, default d6) | first heroic class `ClassModel.baseHp` + CON (min 1) |
| Later levels | `(level-1) x (progression.hpPerLevel or floor(hitDie/2)+1)` using the FIRST class item for every level | the player's recorded `hpGainHistory` amounts |
| CON | `conMod x level` | included in recorded gains / once at start |
| Multiclass | uses the first class's die for every level | per-record |
| Rolled / custom HP | overwritten | allowed (bounds) |
| Bonuses | `hp.bonus` + feat bonus | not modelled |

* *What Phase 6 does:* the HP finding is review + ignore only (`resolve.kind = 'none'`, `reviewOnly`); the `recompute-hp` resolver and its sheet wiring were removed; a forced Resolve returns `unsupported`. A one-click correction is offered only where the system can prove the result.
* *Open engineering decision for the owner (not a rules ruling):* fix Defect A first - make HP recomputation history-aware (the finalizer's additive, per-level-locked records are the working authority) - and only then fix the scope bug and consider a proven HP repair. Until then HP stays review/ignore.

**2. Targeted progression repair - implemented.** The existing reconcile-mode framework already produces one resolution step per outstanding slot (`ProgressionTimelineBuilder._toResolutionStep`, `reconciliationContext` with class, class level, character level, slot id) but the sheet always opened the whole briefing. Now: the sheet passes the exact `slotId` and omits the briefing target; `LevelupShell._getReconciliationCanonicalDescriptors` calls `focusResolutionSteps(timeline, slotId)` (new, in the timeline builder) and returns ONLY that step; if the slot is no longer in the timeline it falls back to the briefing. Reconcile mode has no class-selection step and the finalizer builds no level-up manifest for reconciliation sessions, so no level can be added; the step plugin keeps its historical prerequisite evaluation. Tests #5-7 use the real timeline builder.

**3. House-rule addendum.** Already delivered after this review's target commit (`71483df`); see `reconciliation-v2-house-rule-coverage.md`.

**Still requires Foundry V13:** the focused step actually opening and committing only its choice; `recalcAll` for BAB/defense; everything in the acceptance checklist above.

## House-rule addendum - independent review follow-up (HR-F1..F3)

Details in `reconciliation-v2-house-rule-coverage.md` section 7. HR-F1: inferred (unstamped) house-rule items are now uncertain - they satisfy the grant expectation but also count as unattributed, so an ordinary selection is never reported definitely missing because of them. HR-F2: automatic grant paths use the `activeGM` election; every creation uses a deterministic document id with `keepId` so a concurrent duplicate is rejected by Foundry's primary key; same-client re-entry shares one operation. HR-F3: Armored Defense already works through the owned talent in the real DefenseCalculator (no competing evaluator added; character-only scope and the proficiency requirement noted for the owner). The HP-logging and targeted-routing items from the Phase 6 review were handled in `50a6800` (HP Resolve disabled and the recomputeHP crash intentionally left pinned; focused step routing implemented) - the review of 71483df predates that commit. RECON-005 remains unresolved.

## HP authority (owner decisions: preserve historical HP; house-rule-aware generation)

**Model.** Maximum HP is additive history. `ActorEngine.recomputeHP` no longer reconstructs a maximum; it applies verified deltas
(CON modifier x recorded levels, HP-feat contribution, `hp.bonus`) against `system.progression.hpLedger`
(`scripts/engine/HP/hp-accounting.js`). No ledger / no class history / unreadable input => the stored maximum is preserved.
Recompute never touches current HP; the level-up recovery policy is applied only when a gain is earned.

**Live write path (correction).** Level-up and chargen HP are written by `ProgressionEconomyPlanBuilder`
(the finalizer's inline HP keys are stripped and replaced by it). The previous commit (`ac6c35b`) wrote the ledger in the
finalizer's inline block, which the economy builder discards; the ledger is now written by the economy builder.

**Generation.** One precedence rule, `HPGeneratorEngine.resolveMethod`: levels <= `maxHPLevels` are automatic maximum and
override `hpGeneration`. `SummaryStep._checkHPGainResolution` previously let the average branch win at those levels (verified,
now fixed and covered by a test that runs the real step). Player-chosen Maximum under Roll / Roll-with-minimum is an existing
supported UI choice and is preserved and recorded (`playerChoice`).

**History.** Each new grant records level, class/class level, hit die, method used, rolled result, CON modifier, final gain,
session id, timestamp and the effective `hpGeneration` / `maxHPLevels` / `levelUpHpRecoveryMode` captured when it was earned.
Missing evidence stays `null`; nothing is migrated or fabricated. Settings changed later never rewrite earlier results.

**Reconciliation.** The HP audit reads the ledger's CON modifier, reports a definite issue only with complete history, and never
compares a recorded gain with today's settings. HP Resolve remains disabled.

**Observations, not changed.** `ConfirmStep` (steps/confirm-step.js) has no importers and carries a divergent HP check (dead;
deletion candidate). Chargen starting HP uses `computeStartingHP` (class base HP + CON) and does not consult `maxHPLevels`.
The finalizer's inline level-up/chargen HP block duplicates the economy builder's (also dead while the builder is applied).
Rules question HP-001 (level-up + CON change in one transaction) is in the decision register.
