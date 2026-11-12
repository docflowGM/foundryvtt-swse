# Reconciliation V2 — Phase 0 Findings

**Audit only. No runtime behavior changed.** Baseline `main` @ `33ce3f7` (see inventory). Date 2026-11-12.

Evidence legend: **[T]** reproduced by running production code (`docs/audits/reconciliation-v2-phase0-repro/repro.mjs`; case ids `C1…C15` refer to `repro-output.txt`) · **[S]** static inspection · **[F]** needs in-Foundry verification.
Fixtures use real class data (`packs/classes.db` → real `normalizeClass` → real `ClassesDB`) and the real reconciler. Fixture actors are hand-built objects; no world data was read or written.

> Scope boundary (project rules): nothing below decides a SWSE rule. Where the *correct* result depends on a rule, the finding states the engineering defect only and points to a `RECON-00x` entry appended to `docs/audits/swse-rules-decisions-pending.md` (status `DEFERRED_RULES_REVIEW`, no recommended ruling).

## Executive summary — the five causes that most affect player-facing correctness

1. **No single class-level authority (RCN-P0-01).** Five readers combine `classLevels`, class items, and legacy shapes with three different rules (precedence, `Math.max`, concatenation), one of which also *writes* class-item levels. Nothing reports when sources disagree.
2. **Entitlements are matched to owned items by queue order, not provenance (RCN-P0-02).** An item with no class metadata fills the first open slot; an item with `source: 'class'` but no class id in a multiclass actor produces *both* a missing slot and an "extra" item. Feats and talents with identical (empty) metadata are classified *oppositely*.
3. **Unresolvable class authority is silent and fabricates entitlements (RCN-P0-03).** The "missing class progression" diagnostic is dead code (`|| {}` then `!levelEntry`), and when no class slots exist the engine invents heroic-talent slots instead.
4. **Absent history is reported as a missing choice, and an HP verdict is erased (RCN-P0-04, -05).** Actors without `abilityIncreaseHistory` get "N missing ability increases"; the calculator's "HP exceeds maximum" issue is overwritten to OK by the report builder.
5. **Engine failure fails open, and the UI prints raw diagnostics (RCN-P0-07, -12).** A thrown layer produces a `degraded` report with empty slots; the Talents/Abilities tabs render that as "nothing to do", and the Summary tab shows a banner with raw exception text to every viewer (no GM gate).

Fewer than five of the ten hypotheses were *fully* confirmed as written; see §Hypothesis disposition for exactly which and where the evidence was weaker than the suspicion.

---

## Findings

Severity: **Critical** = produces wrong player-facing verdicts on legitimate characters; **High** = wrong in common edge cases or conceals failure; **Medium** = latent/maintainability with a demonstrated path; **Low** = hygiene.

### RCN-P0-01 — Class-level authority is fragmented across five readers · **Critical** · class authority

* **Evidence:** inventory §3; builder `_actorClassLevelLedger` `…report-builder.js:123-155` (concatenates `classLevels`, `system.classes`, items at :145-153); reconciler ledger `progression-reconciler.js:258-291` (adds `system.class` object with `level: singleClass.level || actor.system.level` at :280-288); `_buildClassSummaries` `Math.max` (:1464,1472); `getActorTotalLevel` `Math.max` of three sources (:370); calculator precedence (`…calculator.js:37`); actor-derived precedence (`derived-calculator.js:172-176`).
* **Actual:** [T] **C5b** — Soldier 4 / Scout 3 whose `system.class={id:'soldier'}` carries no level: `_buildClassSummaries` reports **Soldier 7** (actor total level copied onto the primary class). The calculator happens to discard it only because owned items exist (precedence); with no items the inflated value is the input. [S] otherwise.
* **Expected:** one reader, same rule the runtime uses for BAB/defenses (`derived-calculator.js:159`); disagreements between ledger and items reported as a *class-authority conflict*, not resolved by `max`/concatenation.
* **Root cause:** each layer was added to compensate for the previous one (the repo's own hotfix says "classLevels is authoritative when it totals the actor's character level", while the reconciler uses `max`).
* **Canonical authority involved:** `system.progression.classLevels` (written by level-up, `progression-finalizer.js:1307`) and owned class items (written by level-up/chargen). **Which is authoritative on disagreement is an engineering-authority decision for the owner — see roadmap §Open decisions; Phase 0 does not pick one.**
* **Hypothesis 1 (double counting):** *partially* confirmed. Concatenation is real, but the builder guards it with `Σ == actorLevel`; when ledger+items are both present (C1, C2) Σ≠level so it falls back to calculator output (correct totals) and **no inflated total was produced**. The practical damage is path divergence and false provenance (RCN-P0-08), not doubled levels. A wrong-total scenario was not reproduced.
* **Proposed correction:** one `readActorClassLevels(actor)` shared by derived calc, reconciliation and the hotfix, returning `{rows, conflicts[]}`.
* **Regression test:** ledger-only, items-only, both agreeing, both disagreeing (must emit `conflict`, not pick), `system.class` without level (must not inflate).
* **Confidence:** High (C5b [T]; readers [S]).

### RCN-P0-02 — Slot filling by queue order; feat/talent pools classified asymmetrically · **Critical** · feats/talents

* **Evidence [S]:** `_fillLinearSlots` assigns pool items to slots by cursor (`progression-reconciler.js:1312-1329`); builder `_markAmbiguousSlots` uses `queue.shift()` (`…report-builder.js:351`); `_fillClassChoiceSlots` takes the first matching pool item (`progression-reconciler.js:1658-1666`). Feat pool: item with `source === ''` → **general** pool (:1368); talent pool: same empty source → **unknown** pool (:1390).
* **Actual [T]:**
  * **C8** (Scoundrel 3; one un-annotated feat, one un-annotated talent): the feat silently *fills* `general-feat-level-1`; the identical-state talent becomes `ambiguous` on `scoundrel-1-class-talent-1` and raises "1 unclassified class talent need classification".
  * **C7** (Soldier 4/Scout 3; feat with `system.source:'class'` but no class id): slots `soldier-2-class-feat-1`, `soldier-4-class-feat-1`, `scout-2-class-feat-1` stay **open** *and* the feat is listed `class-feat-extra-…:overfilled`. One legitimate item generates "3 missing" **and** "1 extra". Cause: `_itemMatchesClassSlot` (:1696-1708) accepts an item without class identity only when `allowUnknownClass` (single-class actors, :1654).
* **Expected:** an item satisfies a slot only with explicit evidence (selectionKey/slotKey, class id+level, receipt). Without it: *Ambiguous*/*Unverifiable*, never *Satisfied* and never both *Missing* and *Overfilled*. Feats and talents must follow the same rule.
* **Canonical authority:** item provenance flags written by the finalizer (`flags.swse.progression.*`, `system.slotType`, `classId`, `classLevel`), plus `levelUpFinalizationReceipt` (latest level only).
* **Hypothesis 4:** **confirmed** (cases above).
* **Regression test:** provenance-tagged items fill exactly their slot; untagged items never produce "missing"; multiclass untagged class feat yields one ambiguous, zero extra; feat/talent symmetry.
* **Confidence:** High [T].

### RCN-P0-03 — Unresolved class authority is silent and fabricates heroic-talent slots · **Critical** · class resolution

* **Evidence [S]:** `const levelEntry = getClassLevelProgressionEntry(classSummary.model, classLevel) || {};` (`progression-reconciler.js:1594`) then `… && !levelEntry` (:1625) — `{}` is truthy, the branch is unreachable. Model falls back to the raw item/seed when `resolveClassModel` fails (`:1451-1456`). Calculator: `heroicTalents = classTalents.length > 0 ? [] : buildHeroicTalentSlots(...)` (`…calculator.js:212`).
* **Actual [T]:** **C10 / C10b** — class "Mystery Class 3" (not in registry): 0 class slots, **0** "Missing class progression entry" warnings, and the report says "2 missing general feats, 2 missing heroic talents, 4 derived class stats need review", status `needs-attention`. The 2 heroic-talent slots exist *only because* class slots came back empty.
* **Expected:** unresolved class → *Unverifiable* with an explicit "class authority unavailable" finding; no slot derivation from a fallback cadence.
* **Root cause:** dead guard + a heroic-talent fallback keyed on "no class talent slots".
* **Hypothesis 6:** **confirmed**.
* **Correction:** fail closed in the class-resolution step; delete the `|| {}`/dead branch in favor of a typed unresolved result.
* **Regression test:** unresolved class, resolved class with missing `levelProgression`, unknown feature type.
* **Confidence:** High [T].

### RCN-P0-04 — HP verdict is overwritten; hit-die from a name list · **High** · derived stats

* **Evidence [S]:** calculator `buildHpAudit` flags `current > upper` (`…calculator.js:147-148`); builder `_normalizeDerivedStatsAudit` sets any `current >= expected` row to OK (`…report-builder.js:245-251`). Hit die falls back to hard-coded class-name arrays (`…calculator.js:100-104`) instead of `getClassHitDie` (`class-resolution.js:414`).
* **Actual [T]:** **C6b** calculator: `status:'issue'`, "Current HP 999 exceeds the supported maximum 42". **C6** final report: same row `status:'ok'`, "Campaign HP mode and rolled/custom HP may legally exceed this value." Whether HP above the max-die total is legal depends on HP-generation settings → **RECON-004** (no ruling made).
* **Expected:** exactly one HP evaluator whose status survives; exact / bounded / minimum / unverifiable are distinct outcomes.
* **Hypothesis 5:** **confirmed for HP**; BAB already guarded (`report-builder.js:270`, test `progression-derived-class-stat-audit-contract`).
* **Regression test:** exact history & current above upper bound; incomplete history range; unresolved hit die → unverifiable.
* **Confidence:** High [T] for the overwrite; rules legality deferred.

### RCN-P0-05 — Missing ability-increase history is reported as a missing choice; count rules disagree · **High** · ability increases

* **Evidence [S]:** slots exist at each 4th level; `filledCount` comes only from `abilityIncreaseHistory` records (`progression-reconciler.js:1523-1566`); no history ⇒ `open`. Count is 1 for droid/Nonheroic else 2, with Nonheroic detected by `system.class.id==='nonheroic'`, `system.class.name==='Nonheroic'` or **any** class item named "nonheroic" (:1581-1588). The level-up manifest hard-codes `enteringLevel % 4 === 0 ? 2 : 0` with no droid/nonheroic branch (`levelup-entitlement-manifest.js:387`).
* **Actual [T]:** **C12** Soldier 8 without history: "ability-increase-level-4:open, …-8:open" → "4 missing ability score increases". **C13** droid L4: reconciler count 1 (manifest would say 2). **C9** Nonheroic 3/Soldier 2: whole actor treated as count 1 because a Nonheroic item exists.
* **Expected:** absent history ⇒ *Unverifiable* (current scores cannot prove either way); the count must come from one authority. The correct count for droids/Nonheroic/mixed is a rules question → **RECON-002, RECON-003**.
* **Confidence:** High [T] for behavior; rules deferred.

### RCN-P0-06 — Heroic level conflated with total level; pure-Nonheroic fallback · **High** · levels

* **Evidence:** builder `totalHeroicLevel: actorLevel` (`…report-builder.js:35`); calculator `totalHeroicLevel = Σ(non-Nonheroic) || totalLevel` (`…calculator.js:205`).
* **Actual [T]:** **C9** Nonheroic 3/Soldier 2: report `totalHeroicLevel: 5`; the calculator's slot cadence used 2. **C15** pure Nonheroic 5: calculator `totalHeroicLevel 5` ⇒ general-feat slots L1,L3 and heroic-talent slots L1,L3,L5, although the canonical Nonheroic model grants `bonus_talents: 0` and no features. Whether a pure Nonheroic actor should owe those is **RECON-003**; the defect is the unsourced `|| totalLevel` default.
* **Hypothesis 2:** **confirmed** — four formulas for total level (builder explicit-first; reconciler `max`; calculator Σ-or-explicit; hotfix explicit-only).
* **Confidence:** High [T].

### RCN-P0-07 — Failure semantics fail open (and a "last known good" report may be shown stale) · **High** · reliability

* **Evidence [S]:** every layer catch substitutes an *empty* plan/ownership (`progression-reconciler.js:557-583,657-702`); `_buildFallbackReport` → status `degraded` with empty slots (:704-752); `_emptySheetAudit` sets `hasOpenProgression:false` (:754-789); `sanitizeReconciliationReport` defaults status to `ok` (:604); `findLastKnownGoodReport` returns the newest cached report whose key *starts with* the actor id (:145-153).
* **Actual [T]:** **C11** forced exception: status `degraded`, `warnings:["Progression audit unavailable. Character sheet opened with safe fallback data."]`, sheet projection `hasOpenProgression:false`, error text only in `diagnostics`. Only the Summary tab reacts (an "Audit Safe Mode" banner keyed on `diagnostics.error`, `summary-tab.hbs:179-183`, shown to every viewer, no GM gate, with raw exception text); the Talents and Abilities tabs render the empty ledgers as "nothing to do" and no template branches on `status`.
* **Expected:** failure ⇒ a distinct engine-failure result visible to GM diagnostics only; never rendered as success; stale-cache fallback must carry a staleness marker the UI honors.
* **Hypothesis 9:** **confirmed**. **Hypothesis 10 (cache reflects changes):** see disposition.
* **Confidence:** High [T] for C11; stale-prefix behavior [S].

### RCN-P0-08 — False provenance labels; a reconciliation-side hotfix mutates class items · **High** · provenance / mutation

* **Evidence:** builder hard-codes `levelSource:'actor.system.progression.classLevels'`, `sourceConfidence:'high'`, `isHeroic:true`, `isNonheroic:false` for every row on its ledger path (`…report-builder.js:161-171`). The ledger hotfix rewrites owned class-item levels when its own `Σ == system.level` rule holds (`patches/progression-ledger-reconciliation-hotfix.js:173-247`) on `ready`, `updateActor`, `createItem`, `updateItem`.
* **Actual [T]:** **C3** (class items only, no ledger) and **C4** (chargen-shape: `system.class` object + item) both report `levelSource: actor.system.progression.classLevels`, confidence `high` — there is no such ledger on those actors. Nonheroic rows would be marked heroic on this path (calculator/slots unaffected, display/timeline impact **[F]**).
* **Expected:** provenance = the source actually read; reconciliation read-only (project constraint). The sync hotfix is an *authority decision embedded in a mutator* and should be replaced by the shared reader + a conflict finding, not silently rewritten.
* **Confidence:** High [T] for labels; hotfix runtime behavior **[F]**.

### RCN-P0-09 — Report building depends on a side-effect monkeypatch; two competing shims · **Medium** · structure

* **Evidence:** builder calls `this._attachRemediationActions(slots)` (`…report-builder.js:27`) but defines only `_attachSlotRemediation` (:368). The method is added by `reconciliation-remediation-hotfix.js:9-20` (imported for side effect by `scripts/talents/squad-actions-init.js:13`) **or** by the ledger hotfix (`patches/progression-ledger-reconciliation-hotfix.js:262-278`); each guards `typeof … !== 'function'`, so **first loader wins** and they emit different action shapes (progression-step routes vs `routeId:'sheet'` classification actions).
* **Actual [T]:** harness without the hotfix import: `TypeError: this._attachRemediationActions is not a function` for every actor ⇒ every report degrades (the first run of the harness, before the import was added). In production the import chain makes this work **[F: load order]**.
* **Expected:** one method defined on the class.
* **Confidence:** High [T] for the throw; production load order [F].

### RCN-P0-10 — Shape-sniffing and name heuristics against a schema that already has fields · **Medium** · legacy fallbacks

* **Evidence [S]:** prestige by name (`…report-builder.js:170`: id contains "prestige" or name contains "imperial knight"); Nonheroic by name key (`progression-reconciler.js:480-481`; `…calculator.js:71`; `:1583-1585`); `isPrestigeClassSummary` reads `model.system.base_class/classType` (:488-496) — `ClassModel` exposes `baseClass`/`prestigeClass` and has **no** `classType`/`isNonheroic`; `_resolveClassLevelProgression` probes 8 shapes (:2069-2090); base HP/defenses probe `model.system.*` then `model.*` (:1995-2006, 2103-2113); Nonheroic BAB table duplicated (`progression-reconciler.js:62` vs `nonheroic-class-model.js`); hit-die name arrays (RCN-P0-04).
* **Actual:** these work today only because the probes also try the flat `ClassModel` keys; they are the mechanism by which a thin item fallback silently passes as a "model". **Hypotheses 3 and 7:** **confirmed** (static); impact on a wrong verdict not separately reproduced except via RCN-P0-03.
* **Correction:** read `ClassModel.baseClass/prestigeClass/hitDie/baseHp/defenses/levelProgression` and the registry's Nonheroic ref check only; unresolved ⇒ unverifiable.
* **Confidence:** High [S].

### RCN-P0-11 — The cache is write-only; the audit runs on every render and for every consumer · **Medium** · performance

* **Evidence [S]:** `RECONCILIATION_CACHE` has `.set` (:139) and a scan for stale fallback (:149) — no `.get`. `safeReconcileActor` recomputes every call. Callers: `concept-context.js:1934` (every sheet context build) and `HomeSurfaceService.js:494`. Cache key mixes item `modifiedTime || system.level` in one slot (:112) and omits class-definition revision and settings (HP mode, house rules).
* **Measured [T]:** `safeReconcileActor(output:'sheet')` mean **15.4 ms** per call in Node for a level-20 triple-class actor with 90 feat/talent items (200 runs, no Foundry document overhead — a lower bound; in-Foundry cost **[F]**). One sheet open ≈ one call; UI-only re-renders (tab switch) that rebuild context repeat it.
* **Hypothesis 10:** stale-after-change on the *success* path is **rejected** (no reads, so no stale hits); **confirmed** on the failure path (stale fallback, RCN-P0-07) and for key design.
* **Confidence:** High [S] + measured lower bound.

### RCN-P0-12 — Audit UI is duplicated across three tabs and leaks diagnostics · **Medium** · presentation

* **Evidence:** inventory §7. `summary-tab.hbs:179-183` renders an "Audit Safe Mode" banner plus `diagnostics.message` (raw exception text) to every viewer with no GM gate; tabs repeat the same ledgers/derived rows (`talents-tab.hbs:27-51,115-124`, `abilities-tab.hbs:125-140`). **Hypothesis 8:** confirmed.
* **Confidence:** High [S].

### RCN-P0-13 — Audit coverage gaps: unknown feature types silently ignored · **Medium** · coverage

* **Evidence:** `share_talent_choice` occurs 5× in `packs/classes.db` (Officer et al., owner-ruled "Share Talent", `tests/class-phase-6d-officer-improviser-unlocks.test.mjs:17-35`) but has no entry in `CHOICE_FEATURE_TYPES` (`progression-reconciler.js:64-72`), so no slot, no pool, no finding. `force_power_choice` is mapped but absent from data; unknown types are `continue`d (:1600).
* **Expected:** every choice-type feature in `levelProgression` is either audited or explicitly listed as "not auditable" (⇒ *Unverifiable*).
* **Confidence:** High [S] (data census [T]).

### RCN-P0-14 — Status model cannot express the required outcomes · **High** · classification

* **Evidence:** slot statuses are `open | filled | ambiguous | overfilled`; report status `ok | needs-attention | degraded | stale | review`; derived rows `ok | issue | warning | unavailable`. No *Invalid*, no *Unverifiable*, no *engine-failure*; `warning` and `unavailable` both count as "issues" in `_refreshDerivedStatsAuditStatus` (`…report-builder.js:309`) and `applyHpAudit` (`…calculator.js:175`), so "history is incomplete" increments the same counter as a real error and the report status becomes `needs-attention`.
* **Actual [T]:** **C4/C8/C10** `warnings` always include "N derived class stats need review" for unavailable data.
* **Expected:** the closed set Satisfied / Missing / Ambiguous / Invalid / Unverifiable / Engine-failure (roadmap §1), with the player-facing indicator keyed to actionable states only.
* **Confidence:** High [S]/[T].

---

## Hypothesis disposition (the ten from the command)

| # | Hypothesis | Verdict | Where |
|---|---|---|---|
| 1 | Class levels double-counted | **Partially confirmed** — additive collection exists; masked by an equality guard; no inflated total reproduced | RCN-P0-01 |
| 2 | Different total/heroic formulas | **Confirmed** | RCN-P0-06 |
| 3 | Prestige by name heuristic | **Confirmed** (static; consumer impact [F]) | RCN-P0-10 |
| 4 | Unknown ownership assigned to slots arbitrarily | **Confirmed** [T] | RCN-P0-02 |
| 5 | Derived audit overwritten by normalization | **Confirmed for HP** [T]; BAB already guarded | RCN-P0-04 |
| 6 | `|| {}` then `!levelEntry` | **Confirmed** [T] | RCN-P0-03 |
| 7 | Legacy field shapes consulted | **Confirmed** [S] | RCN-P0-10 |
| 8 | Overlapping audit UI in tabs | **Confirmed** [S] | RCN-P0-12 |
| 9 | Fallbacks hide validation failures | **Confirmed** [T] | RCN-P0-07 |
| 10 | Cached reports may not reflect changes | **Rejected** on the success path (cache never read); **confirmed** for failure-path stale fallback and for key design | RCN-P0-11/-07 |

## Not established in Phase 0 (stated rather than guessed)

* The wrong-total scenario for hypothesis 1, in-Foundry load order of the two shims (RCN-P0-09), the real cost per render inside Foundry, and the timeline builder's use of `isPrestige`/`isHeroic` — all **[F]** or unaudited.
* Whether legitimate *V2-generated* characters trip any of these on a live world. The harness proves the mechanisms with deterministic fixtures; it does not measure the false-positive rate on real actors. Actors with correct provenance flags and a complete `classLevels` ledger (post-level-up shape) would avoid RCN-P0-02/05 triggers; **chargen-only actors lack `classLevels` [S]** and take the items/`system.class` path (C4), which is why first-level characters show the mislabeled provenance. Confirming against real V2 characters requires an in-Foundry read-only export (roadmap §Phase 0.5).
* The owner's question — whether warnings appear mainly on V2-generated or pre-refactor characters — is the right discriminator and is **unanswered by this audit**.

## Rules questions logged (no rulings made)

`docs/audits/swse-rules-decisions-pending.md` → RECON-001 (class-table talent slots vs heroic cadence, multiclass), RECON-002 (ability-increase count: droid/Nonheroic), RECON-003 (Nonheroic and mixed actors: which level drives feat/talent/ability entitlements), RECON-004 (HP bounds under HP-generation modes).
