# Phase 3 — Live Foundry Validation / Benchmark Procedure

Companion to `docs/audits/v2-phase-3-derived-performance.md`. This document is
the executable procedure for the **LIVE FOUNDRY VALIDATION / PHASE 3 CLOSURE
PASS** — it does not contain benchmark results. Results get pasted back and
analyzed in a follow-up pass; sections 2–9 of the requested report format
cannot be completed without them (no fabricated numbers, per the brief).

Branch: `claude/swse-phase-3-derived-performance`. PR: #954.

## 0. What changed to make this procedure possible

Before writing this procedure, I inspected the existing instrumentation
(`scripts/utils/actor-perf-diagnostics.js`, `scripts/sheets/v2/shared/
PanelDiagnostics.js`) rather than adding a new profiler. It already covers
nearly everything the benchmark needs:

- `SWSE.debug.performance.summary()` / `.actor(actor)` / `.reset()` —
  DerivedCalculator cache hits/misses + signature timing, ModifierEngine's 3
  caches (source/aggregate/breakdown) hits/misses + signature timing,
  per-sheet-type context-build timing, async-derived render
  queued/suppressed/skipped-no-change counts. Registered at `index.js:103`,
  gated behind the `performanceDiagnostics` (or `debugMode`) client setting,
  near-zero cost when disabled (confirmed by direct code read).
- `sheet.panelDiagnostics.getSummary()` / `.logDiagnostics()` — per-panel
  build count/avg/min/max for every panel the main
  `alwaysHydratedPanels` loop in `_prepareContext()` builds (including a
  duration of `0` recorded on a per-panel view-model cache hit, so cache-hit
  vs. cache-miss cost is already distinguishable panel-by-panel).
- `sheet._renderCount` — exact render count for a given open sheet instance.

**One real gap found and fixed** (`scripts/sheets/v2/character-sheet.js`,
3 call sites, diagnostic-label-only change, gated behind the same
disabled-by-default setting, zero effect on mechanical output): the
existing `ActorPerfDiagnostics.recordSheetContext(...)` calls used labels
that collided across different builders, making the exact NPC/Droid
questions in this pass unanswerable from the console:

| Builder | Old label | New label |
|---|---|---|
| `DroidSheetContextBuilder.build()` | `'droid'` | `'droid-panel-builder'` |
| `buildConceptSheetViewModel()` (per `actor.type`) | `'character'` / `'npc'` / `'droid'` | `'character-concept-layout'` / `'npc-concept-layout'` / `'droid-concept-layout'` |
| `buildNpcConceptSheetContext()` | `'npc'` | `'npc-context-builder'` |

Before this fix, `sheetContext.droid` silently summed
`DroidSheetContextBuilder` cost with `buildConceptSheetViewModel` cost for
Droid actors, and `sheetContext.npc` silently summed
`buildConceptSheetViewModel` cost with `buildNpcConceptSheetContext` cost
for NPCs — exactly the two costs Steps 5/6 need told apart. No other
instrumentation code was added.

## 1. One-time setup (do this once per Foundry session)

1. Open the world, then open DevTools console (F12).
2. Enable diagnostics — either via **Configure Settings → SWSE → Performance
   Diagnostics**, or directly in console:
   ```js
   await game.settings.set('foundryvtt-swse', 'performanceDiagnostics', true);
   ```
3. Paste this helper (observational only — it never mutates actor documents,
   it only reads the existing `SWSE.debug.performance` / `panelDiagnostics`
   APIs described above):

   ```js
   window.SWSE_PHASE3_BENCH = {
     reset(sheet) {
       SWSE.debug.performance.reset();
       if (sheet?.panelDiagnostics) sheet.panelDiagnostics.clear();
       console.log('[PHASE3 BENCH] counters reset');
     },
     snapshot(sheet, label = '') {
       const perf = SWSE.debug.performance.summary({ quiet: true });
       const panels = sheet?.panelDiagnostics?.getSummary?.() ?? null;
       const out = {
         label,
         renderCount: sheet?._renderCount ?? 'N/A',
         derivedCache: perf.derivedCache,
         modifierCache: perf.modifierCache,
         sheetContext: perf.sheetContext,
         renders: perf.renders,
         panels
       };
       console.log(`[PHASE3 BENCH] snapshot: ${label}`, JSON.parse(JSON.stringify(out)));
       return out;
     },
     sheetFor(actorName) {
       const actor = game.actors.getName(actorName);
       if (!actor) { console.warn('[PHASE3 BENCH] actor not found:', actorName); return null; }
       return actor.sheet;
     }
   };
   console.log('[PHASE3 BENCH] helper installed.');
   ```

4. For each scenario below: get the sheet reference, call
   `SWSE_PHASE3_BENCH.reset(sheet)`, perform the action, then call
   `SWSE_PHASE3_BENCH.snapshot(sheet, 'scenario-name')`. Copy the logged
   object (or the return value) and paste it back along with which scenario
   it's from.

## 2. The ten required scenarios

For every scenario, "paste back" means: the full object
`SWSE_PHASE3_BENCH.snapshot(...)` printed/returned, plus a one-line note of
anything visibly wrong on screen (template error, missing panel, wrong
number).

### Scenario 1 — Character: initial sheet open
1. Pick (or create) a PC with 10+ items and 2+ active effects.
2. `const sheet = SWSE_PHASE3_BENCH.sheetFor('<name>'); SWSE_PHASE3_BENCH.reset(sheet);`
3. `sheet.render(true);` — wait for it to fully paint.
4. `SWSE_PHASE3_BENCH.snapshot(sheet, 'char-initial-open')`.
5. Paste back the object.

**What to look for**: `derivedCache.signature.count` should be low (Fix #1
targets this — expect on the order of 1 per async derived pass, not 2).
`modifierCache.signature.count` should likewise be low relative to how many
of `getAllModifiers`/`aggregateAll`/`buildModifierBreakdown` would have run
before Fix #2 (previously up to 5 per `computeAll()` cycle; expect ~1).

### Scenario 2 — Character: second render, no mechanical change
1. With the same sheet still open and *no* actor/item/effect edits, force a
   redraw: `sheet.render(true);` again (or just switch tabs on the sheet).
2. `SWSE_PHASE3_BENCH.snapshot(sheet, 'char-rerender-nochange')`.

**What to look for**: compare `renders.skippedNoChange` and
`derivedCache.hits` against scenario 1 — a no-op rerender should mostly hit
cache, not miss. This is the primary signal for "is unnecessary
recomputation happening."

### Scenario 3 — Character: add/remove an owned Item
1. Reset counters again.
2. Drag a new weapon onto the actor (or delete an existing equipped item).
3. Wait for the sheet to repaint.
4. Snapshot as `'char-item-change'`.

**What to look for**: `derivedCache.misses` should increase (invalidation
occurred), the sheet should visibly reflect the new/removed item, and
`sheetContext` timings for whichever panels touch inventory should show a
fresh (non-zero) build.

### Scenario 4 — Character: add/remove an Active Effect
Same shape as Scenario 3 but toggle/apply/remove an Active Effect instead.
Snapshot as `'char-effect-change'`.

### Scenario 5 — Character: HP-only update
1. Reset counters.
2. Change HP directly on the sheet (damage or heal), nothing else.
3. Snapshot as `'char-hp-only'`.

**What to look for**: record what derived work occurs for this single-field
change, even if it looks like "more than you'd expect" — do not change
architecture based on this scenario alone; just record it.

### Scenario 6 — Character: ability score update
1. Reset counters.
2. Change one ability score (e.g. Strength) via the sheet.
3. Snapshot as `'char-ability-change'`.

**What to look for**: defenses/skills/other dependent outputs must visibly
update (confirms cache invalidation, not stale `ModifierEngine` output).

### Scenario 7 — NPC: progression-mode actor
1. Pick an NPC actor using `calculationMode: 'progression'`.
2. Reset counters, open the sheet, snapshot as `'npc-progression-open'`.
3. Perform one safe edit (e.g. HP change), snapshot as
   `'npc-progression-edit'`.

**Also record** (this is the NPC deferred-optimization signal —
`sheetContext['npc-concept-layout']` vs. `sheetContext['npc-context-builder']`):
- `sheetContext['npc-concept-layout'].count` and `.avgMs` —
  `buildConceptSheetViewModel()`'s own cost for this NPC.
- `sheetContext['npc-context-builder'].count` and `.avgMs` —
  `buildNpcConceptSheetContext()`'s own cost (the one that actually feeds
  `context.npcConcept`, consumed by templates).
- `sheet.panelDiagnostics.getSummary()` — the full 16-panel loop's per-panel
  timings for this NPC render (confirms whether the loop really runs its
  full Character-shaped panel list for an NPC).

### Scenario 8 — NPC: statblock-mode actor
1. Pick an NPC actor using `calculationMode: 'statblock'`.
2. Reset counters, open the sheet only (no edits — do not risk statblock
   values). Snapshot as `'npc-statblock-open'`.
3. Record the same `sheetContext['npc-concept-layout']` /
   `['npc-context-builder']` / `panelDiagnostics` fields as Scenario 7.

### Scenario 9 — Droid: sheet open
1. Pick a representative Droid actor. Do **not** edit armor, processor,
   credits, or degree fields.
2. Reset counters, open the sheet, snapshot as `'droid-open'`.

**Also record** (this is the Droid deferred-optimization signal):
- `sheetContext['droid-panel-builder'].count` and `.avgMs` —
  `DroidSheetContextBuilder.build()`'s own cost (rebuilds its own internal
  `PanelContextBuilder` for `healthPanel`/`defensePanel`/`biographyPanel`/
  `secondWindPanel`/`abilitiesPanel`).
- `sheetContext['droid-concept-layout'].count` and `.avgMs` —
  `buildConceptSheetViewModel()`'s own cost for this Droid.
- `sheet.panelDiagnostics.getSummary()` — specifically the entries for
  `healthPanel`, `defensePanel`, `biographyPanel`, `secondWindPanel`,
  `abilitiesPanel` from the **main** loop, to compare against what
  `droid-panel-builder` just paid for a second time.

### Scenario 10 — Vehicle: HP damage update
1. Pick a Vehicle actor with at least one equipped weapon item.
2. Reset counters, open the sheet, snapshot as `'vehicle-open'`.
3. Apply an HP/hull damage update via the sheet.
4. Snapshot as `'vehicle-hp-update'`.

**What to look for** (Fix #5 verification): confirm no `attacks`/`actions`
panel or console error appears — the vehicle sheet's own early-return means
it was never reading `system.derived.attacks`/`actions` even before Phase
3, so this should look identical to pre-Phase-3 behavior. Confirm HP/hull
display updates correctly and weapon/station UI is still present and
functional (that UI is driven by the vehicle-specific context builder, not
by the skipped `mirrorAttacks`/`mirrorActions`).

## 3. Five-fix targeted verification

Use the scenario snapshots above plus these specific checks:

- **Fix #1 (DerivedCalculator signature reuse)**: compare
  `derivedCache.signature.count` growth across Scenario 1 to how many async
  derived passes actually occurred (`renders.queued` +
  `renders.suppressed` + `renders.skippedNoChange`, or watch
  `sheet.actor` async-derived console timing if `debugMode` verbose logging
  is on). Expect roughly 1 signature build per async pass, not 2.
- **Fix #2 (ModifierEngine signature threading)**: compare
  `modifierCache.signature.count` growth per async derived pass. Expect
  roughly 1, not up to 5. This was already proven at the unit level with a
  call-count spy (`tests/modifier-engine-signature-reuse.test.mjs`) — this
  step confirms the same ratio holds under real Foundry object shapes.
- **Fix #3 (species defense filter hoist)**: no dedicated counter exists for
  this (a single `Array.filter` call is not worth instrumenting). Verify
  behaviorally only: for a species-item-bearing actor, defenses shown on the
  sheet must be unchanged from expected values. Do not microbenchmark this
  one.
- **Fix #4 (inventory itemIndex reuse)**: on a Character with mixed item
  types (weapon/armor/equipment/consumable/ammo/misc, with ammo and misc
  items interleaved in creation order), confirm the Inventory panel's
  grouping and order match expectations — specifically that the merged
  ammo+misc group preserves the actor's item order rather than grouping all
  ammo before all misc. Add/remove an item and confirm the panel updates
  immediately.
- **Fix #5 (Vehicle attack/action mirror skip)**: covered by Scenario 10.
  Additionally open DevTools console and confirm no `[PANEL BUILD ERROR]`
  or template-missing-property warnings appear for the vehicle sheet.

## 4. Output-equivalence capture

Record these values once per actor type on the Phase 3 branch. If practical,
also `git checkout 88523d6 -- <touched files>` (the Phase 2B tip, Phase 3's
base) temporarily, reload the world, and re-capture the same values for a
true before/after diff — otherwise treat this as a sanity/consistency pass,
since all 5 fixes are additive/optional-parameter changes already proven
behaviorally identical at the unit level (`tests/derived-calculator-
signature-reuse.test.mjs`, `tests/modifier-engine-signature-reuse.test.mjs`,
`tests/defense-calculator-species-bonus-hoist.test.mjs`,
`tests/character-actor-inventory-index-and-vehicle-skip.test.mjs`).

- **Character**: HP, defenses (fort/ref/will/flat-footed), DT, BAB, 2–3
  representative skill totals, inventory group contents.
- **NPC**: HP, defenses, DT, and which `calculationMode` is active.
- **Droid**: HP, defenses, DT, displayed droid systems (armor/processor/
  credits/degree — record as-is, do not evaluate correctness of these,
  they're Phase 2 exclusions).
- **Vehicle**: HP, defenses, DT, DR, SR display, speed, crew/stations,
  weapons list.

## 5. What I need back

For each of the 10 scenarios: the pasted `SWSE_PHASE3_BENCH.snapshot(...)`
object, plus any visible anomaly. For Scenarios 7–9: the additional
`sheetContext`/`panelDiagnostics` fields called out above. For section 4:
the captured value lists. Once I have these, I'll complete the full report
(benchmark matrix, five-fix verification table, NPC/Droid runtime findings
with a `SAFE PHASE 3B OPTIMIZATION` / `KEEP DEFERRED` classification for
each, mechanical regression check, and the final gate:
`GATE: PHASE 4 MAY BEGIN` / `GATE: RUN PHASE 3B FIRST` /
`GATE: PHASE 3 REMAINS BLOCKED`) — not before, since none of that can be
filled in honestly without real numbers from a live client.
