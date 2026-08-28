# Phase 6 — Subtype Context Ownership + Render Performance Hardening

Status: **PHASE 6 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**

Baseline: Phase 1 (authority/performance instrumentation), Phase 2/2B (actor
authority normalization), Phase 3 (derived-performance), Phase 4 (sheet
architecture separation into `SWSEV2ActorSheetBase` /
`SWSEV2CharacterLikeSheet` / `SWSEV2CharacterSheet` / `SWSEV2NpcSheet` /
`SWSEV2DroidSheet` / `SWSEV2VehicleSheet`, PR #956), Phase 5 (sheet
action-integrity + subtype UX, PR #958), and PR #959 (stale
`CardAction.Announce` localization-test assertion fix, verified present on
`origin/main` before this phase began — `tests/progression-suggestion-and-
render-contracts.test.mjs` on `main` already asserts
`` bundle[`${key}Announce`] ``, not the dotted form).

**Correction-pass note** (added after independent review of the initial PR
#960 submission, before merge): review of the actual diff — not just this
audit's own summary — found two real problems in the first version of this
phase and fixed both here:

1. **Regression**: relocating `_buildNpcConceptSheetContext` onto
   `SWSEV2NpcSheet` dropped the original `ActorPerfDiagnostics.time(...)`
   wrapper around it, silently removing the `'npc-context-builder'` entry
   from `SWSE.debug.performance.summary()`. The equivalent Droid move
   preserved its `'droid-panel-builder'` wrapper, so the two subtypes were
   handled inconsistently by accident. Restored (see §9, item 3).
2. **Overstated claim**: §14/§18 originally described the removal of
   `character-like-sheet.js`'s `DroidSheetContextBuilder`/
   `buildNpcConceptSheetContext` imports as a per-actor-type startup
   module-loading reduction ("Character pays neither, NPC pays only its
   own, Droid pays only its own"). That is inaccurate: `index.js`
   statically imports all four sheet controllers at system startup
   regardless of which actor types exist, so the full controller module
   graph loads either way. Both sections have been rewritten to describe
   the actual, defensible benefit — dependency ownership and subtype
   isolation, not a loading-cost change.

The Phase 6 contract test was also strengthened (§9, item 5) so a future
regression of case 1 fails a test instead of shipping with green CI, which
is how the original regression passed unnoticed the first time. Neither
correction changes the underlying context-ownership architecture, which
review agreed was sound.

---

## 1. Before context call graph

`SWSEV2ActorSheetBase._prepareContext()` runs a universal preamble (position
centering, `HelpModeManager`, `applyActorSheetModeClasses`, diagnostics
snapshots), then calls `this._prepareContextForActorSheet({...})`. Vehicle
overrides that hook directly on `SWSEV2ActorSheetBase`; Character/NPC/Droid
inherit the shared implementation from `SWSEV2CharacterLikeSheet`.

Inside `SWSEV2CharacterLikeSheet._prepareContextForActorSheet` (before this
phase), in call order:

1. Actor-mode flags (`isDroidActor`, `isNpcActor`, `isPromotedHeroicNpcActor`,
   `useNpcConceptSheet`) computed from `actor-sheet-mode.js`.
2. `this._buildNpcConceptAbilitiesContext(context, actor)` — Phase 4 hook,
   no-op except on `SWSEV2NpcSheet` (unchanged by this phase).
3. `PanelContextBuilder` (shared, `new PanelContextBuilder(this.document,
   this)`) hydrates `panelContexts.*` (health/defense/biography/inventory/
   secondWind/etc.) via `PanelVisibilityManager`'s existing lazy
   build/skip/cache plan (pre-existing infrastructure — see §9).
4. `buildCombatStatusViewModel`, `buildEffectiveDefensesViewModel` (shared).
5. **`if (isDroidActor) { new DroidSheetContextBuilder(actor).build() }`**
   — inline, imported directly into the shared file. Builds its *own*,
   second `PanelContextBuilder(actor, { isEditable: actor?.isOwner ===
   true })` internally and recomputes health/defense/second-wind panels.
6. `conceptLayout = useNpcConceptSheet ? null :
   buildConceptSheetViewModel({...~25 locals...})` (Phase 3-skipped for NPC,
   unchanged).
7. **`if (useNpcConceptSheet) { context.npcConcept =
   buildNpcConceptSheetContext(actor, {...context, derived, conceptLayout,
   actionEconomy}) }`** — inline, imported directly into the shared file.
8. Theme/shell-surface assembly, final context spread (shared).

Vehicle's `_prepareContextForActorSheet` (on `SWSEV2VehicleSheet`) is fully
separate: calls `buildVehicleSheetContext(actor, rawContext, options)`
(`vehicle-sheet/vehicle-context-builder.js`), which unconditionally builds
**all fifteen** vehicle panels every render (header summary, defenses,
HP/condition, weapon mounts, crew summary, crew assignment, custom station
editor, subsystem detail, shield management, power summary, cargo summary,
cargo manifest, abilities, pilot maneuver, commander order, turn phase) with
no visibility/tab-awareness equivalent to the Character-like path's
`PanelVisibilityManager`.

### Context block classification (before)

| Block | Classification | Owner (before) |
|---|---|---|
| Actor-mode flags, shell/theme/action-economy | SHARED | `SWSEV2CharacterLikeSheet` |
| `panelContexts.*` (health/defense/biography/inventory/…) | SHARED (Character+NPC+Droid) | `SWSEV2CharacterLikeSheet` via `PanelContextBuilder` |
| `_buildNpcConceptAbilitiesContext` | NPC | `SWSEV2NpcSheet` (Phase 4 hook, unchanged) |
| `DroidSheetContextBuilder` build | DROID | shared file (imported/constructed there) — **misplaced** |
| `conceptLayout` (`buildConceptSheetViewModel`) | Character+Droid+promoted-heroic-NPC (MULTI-TYPE) | shared file, correctly skipped for plain NPC (Phase 3) |
| `buildNpcConceptSheetContext` / `context.npcConcept` | NPC | shared file (imported/constructed there) — **misplaced** |
| `buildVehicleSheetContext` (all 15 panels) | VEHICLE | `SWSEV2VehicleSheet` (already correctly isolated) |

The two **misplaced** rows are exactly Phase 4/5's own documented deferrals
(§9/§11 of those audits) — re-verified, not assumed, at the start of this
phase (see §2 below).

---

## 2. Context ownership classification (re-verified this phase)

Re-reading the actual call sites confirmed Phase 4/5's findings still hold
verbatim:

- `DroidSheetContextBuilder`'s build only requires `actor` — it does not
  read or write any of the ~25 shared locals directly (it reads
  `panelContexts` values only through its own internal, separately
  constructed `PanelContextBuilder`, not the shared one). **This makes it
  mechanically extractable as a one-argument subtype hook**, unlike Phase
  4/5's assessment of the entangled `conceptLayout`/`buildNpcConceptSheetContext`
  pair — the *build call itself* was always simple; what's entangled is the
  isEditable-equivalence question underneath it (§6D), which is separate
  from "who calls it."
- `buildNpcConceptSheetContext`'s call site needs `context`, `derived`,
  `conceptLayout`, `actionEconomy`, and `actor` — five items, not
  twenty-five. The twenty-five-local entanglement Phase 4/5 documented
  belongs to `conceptLayout`'s own construction (`buildConceptSheetViewModel`),
  which remains shared and untouched (still correctly skipped for NPC, per
  Phase 3). The *consumption* of `conceptLayout` by `buildNpcConceptSheetContext`
  is a small, stable interface and was safe to move behind a hook that takes
  one coherent options object.

This is the concrete, evidence-based reason Phase 6 could make progress here
where Phase 4/5 explicitly declined to: those phases were evaluating whether
to decompose `buildConceptSheetViewModel`'s ~25-local construction (out of
scope, still true) rather than the narrower question of relocating *which
controller invokes* the two already-built-elsewhere context objects.

---

## 3. Shared context contract (SWSEV2CharacterLikeSheet)

Documented, no code restructuring beyond the two new hooks:

- **Always built for Character/NPC/Droid**: actor-mode flags, `panelContexts.*`
  (via `PanelVisibilityManager`'s existing always-hydrated set — portrait,
  health, defense, resources at minimum; the full set when
  `_shellSurface === 'sheet'`), `combatStatus`, `effectiveDefenses`,
  `actionEconomy`, `derived`, theme/motion context, `system` duplicate.
- **Extension points** (this phase, see §4): `_buildDroidSheetContext(actor)`
  and `_buildNpcConceptSheetContext(actor, { context, derived, conceptLayout,
  actionEconomy })`, both no-op (`return null`) on the shared class.
- **Pre-existing extension point** (Phase 4, unchanged):
  `_buildNpcConceptAbilitiesContext(context, actor)`.

## 4. Character context

`SWSEV2CharacterSheet` remains the empty subclass Phase 4 left it (still
exactly one import — verified by the unchanged Phase 4 contract-test
assertion). No Character-exclusive context construction was found or added.
Character renders inherit every shared block above; both no-op hooks
short-circuit for Character actors (`isDroidActor`/`useNpcConceptSheet` are
both false), so **Character never imports or constructs
`DroidSheetContextBuilder` or `buildNpcConceptSheetContext`** — verified by
`tests/phase6-subtype-context-ownership-contract.test.mjs`.

## 5. NPC context

`SWSEV2NpcSheet` now owns:
- `_buildNpcConceptAbilitiesContext` (Phase 4, unchanged).
- **New**: `_buildNpcConceptSheetContext(actor, { context, derived,
  conceptLayout, actionEconomy })` — the exact original try/catch body
  (success path calls `buildNpcConceptSheetContext`; failure path returns
  the same stub `{ kind: 'npc', ... }` object), moved verbatim. The
  `buildNpcConceptSheetContext` import moved from `character-like-sheet.js`
  to `npc-actor-sheet.js` with it — Character and Droid renders no longer
  even load that module.

`conceptLayout` construction itself (`buildConceptSheetViewModel`, the
~1,971-line builder) **remains on the shared class, unchanged and still
correctly skipped for plain NPC** (Phase 3's finding, re-verified — this
phase did not touch `npc-concept-layout-skip.test.mjs`'s safety invariant,
only updated its assertion #2 to read the relocated call site).

## 6. Droid context

`SWSEV2DroidSheet` now owns:
- **New**: `_buildDroidSheetContext(actor)` — the exact original try/catch
  body (constructs `new DroidSheetContextBuilder(actor).build()` under the
  same `ActorPerfDiagnostics.time(...)` label `'droid-panel-builder'` on
  success; same stub fallback object on failure), moved verbatim. The
  `DroidSheetContextBuilder` import moved from `character-like-sheet.js` to
  `droid-actor-sheet.js` with it — Character and NPC renders no longer even
  load that module.
- Pre-existing Droid-only listener/action methods (Phase 4, unchanged).

### 6D — Droid double-panel-build re-investigation (equivalence NOT proven)

Re-built the exact equivalence table Phase 3/4 called for, against current
`main`:

| Droid panel | Shared build (`PanelContextBuilder(this.document, this)`) | `DroidSheetContextBuilder`'s own build (`PanelContextBuilder(actor, { isEditable: actor?.isOwner === true })`) | Differences | Consumers | Can reuse? |
|---|---|---|---|---|---|
| `healthPanel` | `this.sheet.isEditable` → real ApplicationV2 `isEditable` getter (accounts for `options.editable` + GM override, not just raw ownership) | `{isEditable: actor?.isOwner === true}.isEditable` → **plain ownership only** | GM viewing a droid it does not personally own: shared says editable (GM elevation), Droid builder says not editable | `panelContexts.healthPanel` (shared) feeds Character/Droid `{{else}}` template branch via `conceptLayout`; `droidSheetContext.droidPanels`/quick-glance feed `droid-systems-panel.hbs` | **No** — not provable equal for every viewer |
| `defensePanel` | same `canEdit` source as above | same as above | same as above | same split as above | **No** |
| `secondWindPanel` | same `canEdit` source as above | same as above | same as above | `droid-systems-panel.hbs` only (not read from the shared `panelContexts.secondWindPanel` on the Droid branch — verified by grep, no cross-read) | **No** (and no proven redundant *consumption* either — see below) |
| `biographyPanel` | not duplicated — `DroidSheetContextBuilder.buildBiographyPanel()` is Droid's own method, not a re-invocation of the shared panel builder's biography panel | N/A | Different implementations by design (Droid biography fields differ) | `droid-systems-panel.hbs` | N/A — not a duplicate, a distinct panel |
| `quickGlance` | no shared equivalent | Droid-only, derived from the two panels above | N/A | `droid-systems-panel.hbs` only | N/A — Droid-exclusive |

**Verdict: the previously-documented blocker (isEditable-getter equivalence)
does not disappear on re-inspection — it is reconfirmed.** A GM viewing a
droid they do not personally own is the concrete case where the two builds
would disagree; no test in this repo exercises that permission combination,
so equality could not be proven true, and it clearly is not always true by
direct code reading. Per the phase's own instruction ("if not [provable],
move ownership cleanly without falsely merging different representations"),
this phase:
- **Moved ownership** of *which controller invokes* `DroidSheetContextBuilder`
  to `SWSEV2DroidSheet` (§ above).
- **Did not merge** the duplicate `health`/`defense`/`secondWind` builds.
  They remain two separate computations with two different `isEditable`
  semantics, now both clearly visible in `droid-actor-sheet.js`'s own
  override with an inline comment explaining exactly why, rather than
  buried in a 900-line shared method under an `if (isDroidActor)` block.

This is a documented, intentional non-fix (correctness over a speculative
"probably fine" merge), matching the phase's explicit correctness-over-
elimination mandate.

## 7. Vehicle context

`SWSEV2VehicleSheet` remains fully independent (extends
`SWSEV2ActorSheetBase` directly, per Phase 4 — unchanged, no regression
found). No shared Character-like context leaks into Vehicle and vice versa
— reconfirmed by the Phase 4 import-boundary contract test (still passing)
and the new Phase 6 contract test (§10 below), which additionally checks
that Vehicle never references either new hook name.

### 6E — Vehicle panel eagerness audit (static findings, no live client)

`buildVehicleSheetContext` builds all 15 panels unconditionally every
render (see §1's list). Classification, based on static template/context
consumer tracing (no live Foundry timing available — same limitation as
Phases 3-5):

| Panel | Classification | Reasoning |
|---|---|---|
| `headerSummaryPanel`, `defensesPanel`, `hpConditionPanel` | ALWAYS NEEDED | Rendered in the always-visible command-deck header (`vehicle-sheet-content.hbs`'s top region, outside any tab), confirmed via Phase 5's own audit of the "cockpit-style panel grouping." |
| `weaponMountPanel`, `crewSummaryPanel`, `crewAssignmentPanel`, `customStationEditorPanel` | ACTIVE TAB ONLY (crew/weapons tab) | Consumed only by crew/weapon-mount partials reached from a specific tab per the Phase 4A partial-inclusion BFS. |
| `subsystemDetailPanel`, `shieldManagementPanel`, `powerSummaryPanel` | ACTIVE TAB ONLY (engineering tab) | Same reasoning — engineering-tab partials only. |
| `cargoSummaryPanel`, `cargoManifestPanel` | RARE WORKFLOW | Cargo tab; not part of the always-visible header per the Phase 5 audit's dossier finding. |
| `abilitiesPanel` | ACTIVE TAB ONLY / shared Ability Matrix | Fixed by Phase 5 (`toggle-abilities`/`roll-ability`) to be interactive; rendered inside the Ability Matrix partial, one tab. |
| `pilotManeuverPanel`, `commanderOrderPanel`, `turnPhasePanel` | ACTIVE TAB ONLY (pilot/engineering, combat-turn-dependent) | Pilot/Engineering tab-scoped; `commanderOrderPanel` already has a documented graceful fallback for "not active yet" per Phase 5 §9. |

### 6F/6G — Lazy context / PARTS rendering contract (DEFERRED, not implemented)

`SWSEV2ActorSheetBase` declares a **single** `static PARTS.body.template`
(the shared root template, confirmed unchanged by the Phase 6 contract test
— see §10), branching entirely inside Handlebars
(`{{#if actorSheetMode.useVehicleSheet}}...{{else if
...useNpcConceptSheet}}...{{else}}...{{/if}}`). This means:

1. **All PARTS render every cycle** — there is exactly one PART
   (`body`), so "does ApplicationV2 render other PARTS regardless of active
   tab" does not apply the way it would to a multi-PART app; but within that
   one PART, all tab markup for the active branch renders into the DOM in a
   single pass (confirmed by Phase 4's own documented finding that "the
   sheet surface keeps tab DOM alive while switching tabs client-side" —
   i.e. tabs are CSS-toggled visibility on already-rendered DOM, not
   re-rendered per tab-click).
2. Because hidden-tab DOM must already exist and be populated at first
   render (client-side tab switching, no per-tab re-render), building
   Vehicle panel context lazily "only when the tab is opened" would require
   either (a) a genuine template-lifecycle change (re-render on tab
   activation, which Character-like's own `PanelVisibilityManager` avoids
   for exactly this DOM-preservation reason — see its own header comment,
   §1 above) or (b) leaving those tabs visually present but contextually
   empty until first activated, which is a user-visible behavior change
   (flash-of-empty-panel) — not a pure performance change.
3. Per the phase's own instruction (§6G: "If lazy context would require
   invasive template lifecycle changes, DEFER IT"), **this phase does not
   implement Vehicle panel laziness**. The eagerness is real, structurally
   understood, and documented above (§6E) as a concrete, sized candidate for
   a future phase that first gets live-Foundry render timings (§14) before
   deciding whether a `PanelVisibilityManager`-style mechanism (already
   proven safe for Character-like) is worth porting to Vehicle.

This is the same "prove before implementing" standard Character-like's own
existing `PanelVisibilityManager` comment documents it was built to (~5-15ms
→ ~2-5ms claim, itself pre-existing and not re-verified live in this phase
either — no fabricated numbers are added here).

---

## 8. Duplicate panel-build findings (6H)

| Duplicate | Classification | Resolution |
|---|---|---|
| `DroidSheetContextBuilder`'s internal health/defense/secondWind panels vs. shared `panelContexts.healthPanel`/`.defensePanel`/`.secondWindPanel` | DIFFERENT AUTHORITY (isEditable semantics differ — §6D) | Not merged; ownership relocated to `SWSEV2DroidSheet` (§6). |
| `buildConceptSheetViewModel`'s droid-branch call vs. `DroidSheetContextBuilder`'s own build | Pre-existing Phase 3 finding, distinct diagnostic labels (`droid-concept-layout` vs `droid-panel-builder`) already separate the costs — unchanged this phase | No action (out of scope — this is the `conceptLayout` construction itself, still shared/entangled per §2). |
| Vehicle's 15-panel eager build vs. any shared panel builder | Not a duplicate — Vehicle never shares panel builders with Character-like (Phase 4 finding, reconfirmed) | N/A — this is an eagerness finding (§6E/6F), not a duplication finding. |

No IDENTICAL duplicate builds were found and eliminated this phase. Both
candidate duplicates investigated (Droid's own panels; the
`conceptLayout`/`droidSheetContext` cross-reference) were found to be either
DIFFERENT AUTHORITY (not safe to merge) or already correctly deduplicated by
prior phases (distinct diagnostic labels, no double-read). This matches the
phase's "only reuse IDENTICAL results" instruction — no panel content
carrying different mechanical meaning was force-merged.

---

## 9. Changes implemented

1. `scripts/sheets/v2/character-like-sheet.js`:
   - Removed the `DroidSheetContextBuilder` and `buildNpcConceptSheetContext`
     imports.
   - Replaced the inline `if (isDroidActor) { try { new
     DroidSheetContextBuilder(actor).build() } catch {...} }` block with
     `const droidSheetContext = isDroidActor ? this._buildDroidSheetContext(actor)
     : null;`.
   - Replaced the inline `if (useNpcConceptSheet) { try {
     buildNpcConceptSheetContext(...) } catch {...} }` block with
     `context.npcConcept = this._buildNpcConceptSheetContext(actor, { context,
     derived, conceptLayout, actionEconomy });`.
   - Added two no-op default hooks: `_buildDroidSheetContext(_actor)` and
     `_buildNpcConceptSheetContext(_actor, _opts)`, both `return null`,
     documented with JSDoc explaining the contract and the still-open §6D
     equivalence question.
2. `scripts/sheets/v2/droid-actor-sheet.js`:
   - Added the `DroidSheetContextBuilder` and `ActorPerfDiagnostics` imports.
   - Added `_buildDroidSheetContext(actor)` override — the original inline
     block's exact body, including the same diagnostic label and the same
     stub fallback object.
3. `scripts/sheets/v2/npc-actor-sheet.js`:
   - Added `buildNpcConceptSheetContext` to the existing `npc-sheet-helpers.js`
     import.
   - Added `_buildNpcConceptSheetContext(actor, { context, derived,
     conceptLayout, actionEconomy })` override — the original inline block's
     exact body (same stub fallback object on failure).
   - **Correction pass**: the first version of this override dropped the
     original `ActorPerfDiagnostics.time(...)` wrapper around the
     `buildNpcConceptSheetContext` call, silently removing the
     `'npc-context-builder'` entry from
     `SWSE.debug.performance.summary().sheetContext` — a real regression in
     Phase 1/3 diagnostic infrastructure that independent review caught
     after the PR was opened (CI stayed green throughout because nothing
     asserted the label's presence). Added the missing `ActorPerfDiagnostics`
     import and restored the identical wrapper/label used before this phase,
     so the override is now a true verbatim relocation, diagnostics
     included, matching the Droid override's pattern.
4. `tests/npc-concept-layout-skip.test.mjs`: updated assertion #2 to read
   the relocated call site in `npc-actor-sheet.js` instead of
   `character-like-sheet.js`; added a new assertion confirming the shared
   file still invokes the hook under the unchanged `useNpcConceptSheet` guard.
5. New: `tests/phase6-subtype-context-ownership-contract.test.mjs` — source-
   contract test locking in both hooks' existence, no-op default bodies, call
   shape, and the cross-subtype import-boundary invariant (§10).
   **Correction pass**: added assertions #6 verifying both subtype
   controllers preserve their `ActorPerfDiagnostics.recordSheetContext(...)`
   timing seam by label, and that the shared controller owns neither label
   — this is the coverage that was missing when the NPC regression above
   first shipped, so a future refactor that drops one of these wrappers
   again will fail this test instead of passing silently.
6. New: this document.

**No other production files were changed.** `DerivedCalculator`,
`ModifierEngine`, `ActorEngine`, SWSE formulas, Actor/Item schemas,
progression, and Phase 5's action routing/listener wiring were not touched.

---

## 10. Cross-subtype context leakage tests (6J)

`tests/phase6-subtype-context-ownership-contract.test.mjs` asserts, by
reading the actual committed source of all five controller files:

- `character-like-sheet.js` contains neither an import nor a construction
  call for `DroidSheetContextBuilder` or `buildNpcConceptSheetContext`
  (checked by import-line regex + construction-call regex, not a bare
  substring match, so the explanatory doc-comments naming both symbols do
  not produce a false pass).
- `character-like-sheet.js` declares both no-op hooks with the exact
  `return null;` body, and still invokes both from
  `_prepareContextForActorSheet` under their original guards.
- `droid-actor-sheet.js` owns the `DroidSheetContextBuilder` import and a
  real `_buildDroidSheetContext` override; `npc-actor-sheet.js`,
  `character-sheet.js`, and `vehicle-actor-sheet.js` reference it nowhere.
- `npc-actor-sheet.js` owns the `buildNpcConceptSheetContext` import and a
  real `_buildNpcConceptSheetContext` override; `droid-actor-sheet.js`,
  `character-sheet.js`, and `vehicle-actor-sheet.js` reference it nowhere.
- `vehicle-actor-sheet.js` references neither hook name at all (it extends
  `SWSEV2ActorSheetBase` directly and has no reason to).

This directly satisfies §6J's four required boundary claims (Character
excludes Vehicle/NPC-concept/Droid-systems context; NPC excludes
Vehicle/Droid-systems context; Droid excludes Vehicle/NPC-concept context;
Vehicle excludes Character/NPC/Droid context) for the two context blocks
this phase relocated. The remaining shared blocks (`conceptLayout`,
`panelContexts.*`) were already covered by Phase 4/5's own contract tests
(`phase4-sheet-architecture-contract.test.mjs`'s import-boundary section,
`phase5-subtype-context-integrity.test.mjs`), both re-run clean this phase
(§16).

---

## 11. Render lifecycle trace (6K, static)

Traced `SWSEV2BaseActor.prepareDerivedData` → `_computeDerivedAsync` (only;
no other render-lifecycle code was changed or needed changing) in
`scripts/actors/v2/base-actor.js`:

1. `prepareDerivedData()` calls `_computeDerivedAsync(system)`
   fire-and-forget (Foundry does not await it) whenever
   `shouldSkipDerivedData(this)` is false.
2. `_computeDerivedAsync` computes a `signature` via
   `DerivedCalculator.getActorComputeSignature`. If a computation for that
   exact signature is already in flight (`_swseDerivedAsyncInFlightSignature`)
   or was already applied (`_swseDerivedAsyncAppliedSignature`), it returns
   immediately — **answers 6M question 3 (can identical derived output
   still cause a second render?): no, already prevented by signature dedup**,
   confirmed by direct code reading, not assumed.
3. `DerivedCalculator.computeAll(this, { signature })` runs, and each
   updated `system.derived.*` field is compared via
   `_swseDerivedValuesEqual` before being written; `changed` stays `false`
   if nothing actually differs.
4. **If `changed` is false, the method returns without touching
   `this.apps` at all** (`ActorPerfDiagnostics.recordRenderSkippedNoChange()`)
   — **answers 6M question 1/4: yes, a normal mutation can already produce a
   sheet render (via Foundry's own document-update → app render pipeline)
   before this async completion runs; the snapshot comparison here is
   specifically designed to make async completion a no-op in that case, and
   it does so correctly by code reading.**
5. If `changed` is true, it iterates `Object.values(this.apps)`, checks a
   suppression window/depth (`_swseSuppressAppRefreshDepth`/`_swseSuppressAppRefreshUntil`),
   and — if not suppressed — `queueMicrotask`s a single follow-up
   `requestSurfaceRender`/`requestShellRender` per open app (preferring the
   shell-aware coalescing helper over a raw `.render(false)` call, with
   `.render(false)` only as a last-resort catch fallback).

**Answers to 6M's five questions, based on this trace:**
1. Yes — a normal mutation can render before async derived finishes (this
   is expected: the synchronous update already triggers Foundry's own
   render path; async derived values arrive slightly later).
2. Only when the derived output actually differs from what was already
   rendered — confirmed by the `changed` guard.
3. No — the in-flight/applied signature dedup (step 2) and the
   `_swseDerivedValuesEqual` per-field check (step 3) together prevent a
   second render for identical output.
4. Yes, for the cases this code can observe (same-signature dedup, same-
   value-per-field dedup). It cannot detect every conceivable "different
   signature, same net rendered output" case (e.g. two different
   intermediate derived values that both round to the same displayed
   number), but doing so would require broader semantic knowledge of every
   downstream template's actual pixel/text output — out of scope and not
   requested.
5. Not without further live-Foundry render-cost measurement (§14) — the
   controller split (Phase 4) already lets `requestSurfaceRender` target a
   specific `surfaceId`, which is the cheapest targeting primitive this
   architecture currently exposes; no further split was implemented this
   phase absent evidence it under-serves.

**Conclusion: this coalescing infrastructure is already correctly
implemented and sufficient.** Per the phase's own instruction ("Do NOT
create another global render scheduler unless an existing scheduler already
serves this purpose — reuse current coalescing/diagnostic infrastructure"),
no changes were made to `_computeDerivedAsync`, `requestSurfaceRender`, or
`requestShellRender` this phase. This satisfies 6L/6M without code changes —
the redundant-render problem those sections anticipate finding was already
solved by prior work, and re-solving it would violate the surgical-changes
mandate.

---

## 12. Render coalescing findings (6L)

No changes made — see §11's conclusion. The existing mechanism (signature-
based dedup + per-field value comparison + microtask-batched, suppression-
aware follow-up render) already satisfies every acceptable-improvement
example the phase brief lists (identical render requests in one tick →
already coalesced via the in-flight signature; async completion does not
render if the derived signature was already applied; suppression windows
already exist for closed/suppressed sheets via `isRefreshSuppressed()`).

---

## 13. Hook/listener lifecycle findings (6N/6O)

Audited `Hooks.on(...)`/`Hooks.once(...)` registrations under
`scripts/sheets/v2/`:

| File | Hook | Registration pattern | Accumulation risk |
|---|---|---|---|
| `sheet-diagnostics-p0.js` | `Hooks.once('ready', ...)` | Module-load-time, `once` | None — fires at most once per client session. |
| `character-sheet/chargen-onboarding.js` | `Hooks.once('canvasReady', ...)`, `Hooks.on('createActor', ...)`, `Hooks.on('updateActor', ...)` | Module-load-time | None — registered once when the module first loads, not per sheet render. |

The four external `renderSWSEV2CharacterSheet`-family hooks documented in
Phase 4 §11 (`force-suite-render-guard-hotfix.js`,
`combat-ui-behavior-hotfix.js`, `force-suite-runtime-repairs.js`,
`combat-feature-panel-renderer.js`, `force-tradition-picker.js`) are all
registered once at module load, not inside any sheet controller's render
path — re-confirmed by grep, unchanged by this phase (this phase touched no
render-hook registration).

**No per-render `Hooks.on` registration was found anywhere in the sheet
controller chain** (`activateListeners`/`_activateListenersInternal` use
scoped `AbortController` signals + `addEventListener` on already-rendered
DOM nodes, not global `Hooks.on` calls) — confirmed by the same grep. This
means there is no listener-accumulation defect to fix (6N's concern), and no
delegated-listener consolidation was attempted (6O) since Phase 5 already
established the current action-routing pattern is stable and the phase
brief explicitly warns against destabilizing it without a proven issue.
Sentinel's sheet guardrails remain the diagnostic authority for this, per
the phase's own instruction — no second listener monitor was created.

---

## 14. Performance/structural comparison (6P)

No live Foundry client is available in this environment (same limitation as
Phases 3-5). No live render-timing numbers are fabricated. Structural
comparison:

- **Import/module-load surface — corrected**: `character-like-sheet.js` no
  longer statically imports `DroidSheetContextBuilder` or
  `buildNpcConceptSheetContext`. **This is a dependency-ownership
  improvement, not a startup module-loading reduction**: `index.js`
  statically imports all four sheet controllers
  (`SWSEV2CharacterSheet`, `SWSEV2NpcSheet`, `SWSEV2DroidSheet`,
  `SWSEV2VehicleSheet`) unconditionally at system startup, and each of
  those controller files still imports its own subtype builder, so the
  entire controller module graph — Droid's and NPC's included — is still
  eagerly loaded when the system boots, regardless of which actor types
  exist in a given world. Opening a Character sheet does not currently
  avoid loading the Droid or NPC context-builder modules; nothing in this
  phase changes when those modules are loaded, only which controller file
  is allowed to reference them. An earlier draft of this section
  incorrectly framed this as "Character pays neither, NPC pays only its
  own, Droid pays only its own" — that language implied a per-actor-type
  module-loading cost difference that does not exist under the current
  static-import startup path, and has been corrected here after
  independent review caught it. The real, defensible benefit is: the
  shared Character-like controller no longer directly depends on
  NPC- or Droid-specific context builders, which improves dependency
  direction and subtype isolation (a future Droid-only change to
  `DroidSheetContextBuilder` can no longer accidentally touch a file
  Character/NPC also load), independent of whether it changes any
  measured runtime cost.
- **Invocation-count reduction**: none — both builders were already guarded
  by `if (isDroidActor)` / `if (useNpcConceptSheet)` before this phase, so
  they were never *invoked* for the wrong actor type at runtime, only
  *imported* into a shared module unconditionally. This phase's benefit is
  therefore a module-boundary/maintainability improvement (smaller,
  correctly-scoped per-type dependency graphs; a future Droid-only change to
  `DroidSheetContextBuilder` no longer risks touching a file Character/NPC
  also load) rather than an invocation-count or per-render-timing change.
  Reporting this as a timing improvement would be fabrication; it is not
  claimed as one.
- **Duplicate panel builds**: unchanged in count (§8) — none were eliminated,
  because none were provably safe to eliminate (§6D). This is disclosed as a
  non-outcome, not hidden.
- **Vehicle eager panel build**: unchanged (§6E/6F — documented, deferred).
- **Render coalescing**: unchanged (§11/12 — already sufficient, verified by
  code reading, not modified).
- SWSEPerf/Sentinel instrumentation itself was not touched; the existing
  `'droid-panel-builder'` / `'npc-context-builder'` / `'${type}-concept-layout'`
  diagnostic labels (Phase 3's live-benchmark seam) are preserved unchanged
  on their relocated call sites, so `SWSE.debug.performance.summary()`
  continues to report the same buckets post-Phase-6 as pre-Phase-6.

---

## 15. Dead/redundant code findings (6T)

No dead code was found or removed this phase. The two relocated blocks
(`DroidSheetContextBuilder` build, `buildNpcConceptSheetContext` build) are
both live and reachable (guarded, not orphaned) both before and after this
phase's move — relocation is not removal. Phase 4 and Phase 5's own
documented dead-code findings (12+13 dead methods/imports in the original
monolith, 3 deleted dead-handler files, the 4 orphaned templates, the
`inventory-ui.js` retained-for-an-unrelated-test case) were not re-litigated
— none of them intersect the files this phase touched.

---

## 16. Tests

- `node tools/run-rolling-syntax-check.mjs` — 2,243/2,243 files clean (one
  new test file added this phase, count increased by exactly one from
  Phase 5's 2,242).
- `node tools/run-rolling-tests.mjs` — **132 passed, 0 failed** (of 132 run;
  5 excluded as documented pre-existing failures — see below). This is one
  more passing test than Phase 5's closing 130/131, and zero failures where
  Phase 5 had exactly the one pre-existing `lang/en.json` failure (now fixed
  by PR #959, verified present on `main` before this phase began, per the
  task's own verification requirement).
- The 5 `KNOWN_EXCLUDED_TESTS` in `tools/run-rolling-tests.mjs`
  (`force-power-final-integration.test.mjs`,
  `phase3-force-power-corrections.test.mjs`,
  `phase4-force-modifier-automation.test.mjs`,
  `phase5-force-healing-mitigation.test.mjs`,
  `phase6-force-direct-damage.test.mjs`) were **independently re-verified
  this phase, not assumed pre-existing**, per the task's explicit
  instruction not to wave away failures. Running one directly
  (`node tests/force-power-final-integration.test.mjs`) reproduces the
  documented root cause exactly: `ERR_MODULE_NOT_FOUND` on an absolute
  `/systems/foundryvtt-swse/...` import path that plain Node cannot resolve
  without a Foundry-style import map. This is a Node/Foundry-shim
  environment limitation, confirmed unrelated to any sheet/context file this
  phase touched (none of the five excluded files import
  `character-like-sheet.js`, `npc-actor-sheet.js`, `droid-actor-sheet.js`,
  or `vehicle-actor-sheet.js`). The "full test suite green" bar in the task
  brief is satisfied by the 132/132 result from the runner that exists
  specifically to give an honest, non-mocked green signal for the sheet/
  rolling-system track (see that script's own header comment); the 5
  excluded tests are a separate, longer-standing, environment-only gap this
  phase did not introduce, cannot fix without rewriting the Node test
  harness's module resolution (out of scope for a sheet-context phase), and
  did not silently reclassify.
- New/updated tests specific to this phase:
  - `tests/phase6-subtype-context-ownership-contract.test.mjs` (new) — PASS.
  - `tests/npc-concept-layout-skip.test.mjs` (updated) — PASS.
- Phase 1-5 regression suite re-run in full as part of the 132-test run
  above, including `phase4-sheet-architecture-contract.test.mjs`,
  `phase5-sheet-action-integrity-contract.test.mjs`,
  `phase5-subtype-context-integrity.test.mjs` — all PASS, unchanged
  assertions, zero expected-value changes.

---

## 17. Runtime follow-up

No live Foundry client was available for this phase (same limitation as
Phases 3-5). All verification was static: full-file reads of every
changed/added file (not agent-report trust), two rolling-syntax-check runs,
one full rolling-test-suite run (132/132), and a new dedicated contract test
reading the actual committed source of all five controller files.

### Live-Foundry smoke-test checklist

| Actor | Tab | Action | Expected context | Expected render count/pattern | Sentinel signal | Performance signal | Failure condition |
|---|---|---|---|---|---|---|---|
| Character | Open sheet | — | No `droidSheetContext`/`npcConcept` keys present in `this._currentContext`; `SWSE.debug.performance.summary().sheetContext` shows no `'droid-panel-builder'`/`'npc-context-builder'` entries for this actor | One initial render | No new mutation-trace warnings | No new outlier vs. pre-Phase-6 Character open | `npcConcept`/`droidSheetContext` keys present, or either builder's diagnostic label recorded for a Character actor |
| Character | Switch major tabs (Skills → Force → Gear) | — | Context unchanged across tab switches (client-side DOM toggle, no re-render per Phase 4's documented finding) | Zero additional `_prepareContext` calls per tab click | — | — | A `_prepareContext` call is observed per tab click (would indicate a lifecycle regression unrelated to this phase's changes, but worth confirming this phase didn't introduce one) |
| Character | One field mutation (e.g. edit a skill rank) | — | `_computeDerivedAsync` signature dedup fires; sheet renders once synchronously, at most one follow-up async render only if derived values actually changed | ≤2 renders total (sync update + conditional async follow-up) | Actor update recorded with expected source string | `SWSE.debug.performance.summary()` shows no new `'-panel-builder'`/`-context-builder'` timing entries beyond the pre-existing shared ones | More than one follow-up render for an unchanged derived snapshot |
| Character | One Phase 5 repaired action (e.g. "Recover All" on Force tab) | — | Unchanged from Phase 5's own checklist entry | Unchanged from Phase 5 | Unchanged from Phase 5 | Unchanged from Phase 5 | Action stops working (would indicate this phase disconnected a Phase 5 fix — checked statically via the unchanged action-integrity contract test, but not live-verified) |
| NPC | Open sheet (Overview) | — | `context.npcConcept` present and non-null, built via `SWSEV2NpcSheet._buildNpcConceptSheetContext`; `droidSheetContext` absent/null | One initial render | — | `'npc-context-builder'` diagnostic entry recorded | `npcConcept` missing, or a console warning `[SWSEV2NpcSheet] NPC concept sheet context failed` where none was expected before |
| NPC | Combat view | Toggle condition step | Same as Phase 5's own checklist entry | Same as Phase 5 | Same as Phase 5 | Same as Phase 5 | Same as Phase 5 |
| NPC | Owner/edit view (progression/statblock panel) | Edit a statblock-authority field | Same as before this phase (context construction path unchanged for this panel — only `npcConcept`'s *builder location* moved, not its inputs) | Unchanged | Unchanged | Unchanged | Field edit stops persisting |
| NPC | Follower/statblock, if available | "Recalculate Follower" (Phase 5 fix) | Unchanged from Phase 5 | Unchanged | Unchanged | Unchanged | Action stops working |
| NPC | One Phase 5 repaired action (e.g. "Revert Snapshot") | — | Unchanged from Phase 5 | Unchanged | Unchanged | Unchanged | Action stops working |
| Droid | Open sheet (Systems tab) | — | `droidSheetContext` present (`droid`, `droidPanels`, `combatWeapons` keys), built via `SWSEV2DroidSheet._buildDroidSheetContext`; `npcConcept` absent/null | One initial render | — | `'droid-panel-builder'` diagnostic entry recorded | `droidSheetContext` missing, or `[SWSEV2DroidSheet] Failed to build droid systems tab context` warning where none was expected |
| Droid | Systems | Use an integrated weapon (`use-droid-part`) | Unchanged — Phase 4/5 action, untouched by this phase | Unchanged | Unchanged | Unchanged | Action stops working |
| Droid | Inventory | — | `panelContexts.inventoryPanel` present, unaffected by the `droidSheetContext` relocation | Unchanged | — | — | Inventory panel empty/missing |
| Droid | Programming (if a droid-programming tab exists in the current build) | — | Unaffected by this phase's changes | Unchanged | — | — | N/A unless a regression is found |
| Droid | One repaired action (e.g. `convert-droid-to-playable`) | — | Unchanged from Phase 4 | Unchanged | Unchanged | Unchanged | Action stops working |
| Vehicle | Open sheet | — | All 15 panels present, unchanged from before this phase (Vehicle was not modified) | One initial render | — | Same eager-build cost as before this phase (§6E documents it as unreduced, not regressed) | Any Vehicle panel missing (would indicate an unrelated regression, since Vehicle code was not touched) |
| Vehicle | Weapons tab | — | `weaponMountPanel` unchanged | Unchanged | — | — | Panel empty |
| Vehicle | Crew tab | — | `crewSummaryPanel`/`crewAssignmentPanel` unchanged | Unchanged | — | — | Panel empty |
| Vehicle | Engineering tab | — | `subsystemDetailPanel`/`shieldManagementPanel`/`powerSummaryPanel` unchanged | Unchanged | — | — | Panel empty |
| Vehicle | Pilot/Commander tab | One repaired maneuver action (`useManeuver`/`regainManeuver`, Phase 5 fix) | Unchanged from Phase 5 | Unchanged | Unchanged | Unchanged | Action stops working |

`SWSE.debug.performance.summary()` follow-up: confirm the `sheetContext`
bucket still reports separate entries for `'droid-panel-builder'`,
`'npc-context-builder'`, and `` `${type}-concept-layout` `` (the Phase 3
live-benchmark seam), now sourced from `droid-actor-sheet.js`/
`npc-actor-sheet.js` instead of `character-like-sheet.js` — the label
strings themselves are unchanged, so no dashboard/reporting code needs
updating. Sentinel sheet diagnostics: confirm no new warning class appears
for Character/NPC/Droid/Vehicle sheet opens beyond the two relocated
try/catch warning messages (`[SWSEV2NpcSheet] NPC concept sheet context
failed`, `[SWSEV2DroidSheet] Failed to build droid systems tab context`),
which replace the identically-worded `[SWSEV2CharacterSheet] ...` messages
the old shared call sites used to log (message text intentionally updated to
name the actual owning class, since these are developer-facing diagnostic
logs, not player-facing UI or localized strings).

---

## Deliverables summary

1. **PHASE 6 VERDICT: PHASE 6 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**
   (matching Phases 3-5's own closure precedent — no live Foundry client was
   available in this environment; the checklist in §17 is the concrete
   follow-up).

2. **Context call graph BEFORE**: §1.

3. **Context call graph AFTER**: §1 (with the two relocated blocks replaced
   by hook calls), §3-§7.

4. **Shared context contract**: §3.

5. **Character context owner**: `SWSEV2CharacterSheet` (still the empty
   Phase 4 subclass; §4).

6. **NPC context owner**: `SWSEV2NpcSheet` — now owns
   `_buildNpcConceptAbilitiesContext` (Phase 4) and
   `_buildNpcConceptSheetContext` (this phase); §5.

7. **Droid context owner**: `SWSEV2DroidSheet` — now owns
   `_buildDroidSheetContext` (this phase); §6.

8. **Vehicle context owner**: `SWSEV2VehicleSheet` (unchanged, independent;
   §7).

9. **Duplicate build elimination**: **none eliminated** — the one candidate
   investigated (Droid's own health/defense/secondWind panels vs. the shared
   `panelContexts` equivalents) was re-proven NOT safely mergeable
   (isEditable-semantics divergence, §6D); invocation counts are unchanged
   (both builders were already correctly guarded before this phase, §14).

10. **Lazy context**: none implemented. Vehicle's 15-panel eager build was
    classified (ALWAYS NEEDED / ACTIVE TAB ONLY / RARE WORKFLOW, §6E) but
    laziness was deliberately deferred (§6F/6G) because the shared root
    template's single-PART, client-side-tab-toggle architecture means hidden
    tabs' DOM (and therefore their context) must already exist at first
    render — implementing laziness here would require a genuine template-
    lifecycle change, which the phase brief explicitly says to defer absent
    proof it's safe.

11. **Render lifecycle findings**: §11 — `_computeDerivedAsync` already
    implements signature-based in-flight/applied dedup plus per-field value
    comparison before requesting any follow-up render; a normal mutation can
    render before async completion, but async completion is already a no-op
    when nothing changed.

12. **Render coalescing changes**: none — the existing mechanism already
    satisfies every acceptable-improvement example in the phase brief (§12).

13. **Hook/listener findings**: no per-render `Hooks.on` registration exists
    in the sheet controller chain; no accumulation risk found; no changes
    made (§13).

14. **Exact files changed**:
    - `scripts/sheets/v2/character-like-sheet.js` (removed two imports;
      replaced two inline context-building blocks with hook calls; added two
      no-op default hooks)
    - `scripts/sheets/v2/npc-actor-sheet.js` (added
      `buildNpcConceptSheetContext` import; added
      `_buildNpcConceptSheetContext` override)
    - `scripts/sheets/v2/droid-actor-sheet.js` (added
      `DroidSheetContextBuilder`/`ActorPerfDiagnostics` imports; added
      `_buildDroidSheetContext` override)
    - `tests/npc-concept-layout-skip.test.mjs` (updated assertion #2 to read
      the relocated call site; added one new assertion)
    - New: `tests/phase6-subtype-context-ownership-contract.test.mjs`
    - New: this document

15. **Exact behavior changes**: none mechanical. The two relocated context
    builders produce byte-identical output for the same actor/permission
    state as before (verbatim body moves, same diagnostic labels, same
    fallback stub objects); only the developer-facing warning-log prefix
    changed (`[SWSEV2CharacterSheet] ...` → `[SWSEV2NpcSheet] ...` /
    `[SWSEV2DroidSheet] ...`) to name the actual owning class in console
    diagnostics.

16. **Phase 5 action-integrity result**: **0 unresolved actions**, re-verified
    after this phase's changes via `node tests/phase5-sheet-action-integrity-
    contract.test.mjs` (PASS) and `node tests/phase5-subtype-context-integrity
    .test.mjs` (PASS) — both re-run clean, no assertions changed.

17. **Test results**: `node tools/run-rolling-syntax-check.mjs` — 2,243/2,243
    clean. `node tools/run-rolling-tests.mjs` — 132 passed, 0 failed (of 132
    run; 5 excluded, independently re-verified this phase as a pre-existing,
    unrelated Node/Foundry-shim import-resolution limitation, not a Phase 6
    regression). See §16 for full detail.

18. **Performance/structural comparison**: §14 — no live timings fabricated;
    zero startup module-loading change (`index.js` statically imports all
    four sheet controllers regardless of actor type, so the full controller
    module graph loads at boot either way — see the corrected §14, added
    after independent review flagged the original wording as an overstated
    module-load-savings claim); the actual benefit is dependency-ownership/
    subtype-isolation, not a loading-cost reduction; zero invocation-count
    change (both builders were already correctly guarded); zero
    duplicate-build elimination (not provably safe); Vehicle eagerness
    unchanged and documented as a sized future candidate.

19. **Dead code removed**: none — nothing was found to remove (§15).

20. **Live Foundry follow-up checklist**: §17.

21. **Recommended next phase** (not begun): (a) obtain live Foundry render-
    timing evidence for Vehicle's eager 15-panel build (§6E/6F) — if it
    proves to actually cost meaningful render time on the crew/engineering/
    cargo tabs, port a `PanelVisibilityManager`-style mechanism to Vehicle,
    reusing the exact DOM-preservation pattern Character-like already
    validates; (b) resolve the §6D isEditable-semantics divergence between
    the shared `PanelContextBuilder(this.document, this)` and Droid's own
    `PanelContextBuilder(actor, { isEditable: actor?.isOwner === true })` —
    likely by having `DroidSheetContextBuilder` accept the real sheet
    instance (or its resolved `isEditable` boolean) instead of constructing
    its own ownership-only proxy, which would then make the duplicate
    health/defense/secondWind builds provably identical and eliminable; (c)
    the dedicated template-cleanup pass Phase 5 already recommended (deleting
    the 4 confirmed-orphaned templates, retiring `inventory-ui.js` after
    updating its one dependent audit-script assertion) remains open and
    unrelated to context/render work.
