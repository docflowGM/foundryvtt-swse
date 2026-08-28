# Phase 7 — Droid Context Convergence + Editability Authority

Status: **PHASE 7 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**

Baseline: Phase 1 (authority/performance instrumentation), Phase 2/2B (actor
authority normalization), Phase 3 (derived-performance), Phase 4 (sheet
architecture split), Phase 5 (sheet action-integrity + subtype UX), Phase 6
(subtype context ownership + render performance hardening, PR #960,
`main` at `fe5483943af3c63e0dd9612b73c09a97dd4d14f1` verified before this
phase began). Phase 6 §6D/§8 documented, but deliberately did not resolve,
an isEditable-authority divergence between the shared Character-like panel
path and `DroidSheetContextBuilder`'s own internal panel build, and declined
to merge the two health/defense/second-wind panel builds on that basis.

**Headline finding, established before any code moved (§7A/§7D below):** the
Phase 6 blocker was real, but the fix is more direct than "merge two outputs
proven equivalent." Tracing every actual consumer of
`DroidSheetContextBuilder.build()`'s return value proved that
`healthPanel`, `defensePanel`, `secondWindPanel`, `biographyPanel`,
`abilitiesPanel`/`abilities`, `quickGlance`, and `derived`/`conceptLayout`
(the nested copies inside the return object, not the sheet-level ones) were
computed by the builder's internal, second `PanelContextBuilder` but **never
read by anything downstream** — not by `character-like-sheet.js` (which
extracts only `droid`, `droidPanels`, `combatWeapons` from the return
value), and not by any currently live-included Droid template (the
templates that would have read `quickGlance`/`healthPanel`/etc. directly —
`templates/actors/droid/v2/partials/frame/*.hbs`,
`templates/actors/droid/v2/partials/tabs/*.hbs` — are themselves dormant,
never `{{> }}`-included by any live root template; see §5). This is a
stronger, more direct proof than equivalence: the duplicate computation was
dead weight using the wrong authority, not a second legitimate data source.
Phase 7 therefore **eliminates** that dead duplicate work rather than
reconciling it, and separately fixes the small set of Droid-specific
permission fields that were genuinely live and were also using the wrong
authority (`droid.garage.canOpenGarage`/`canEdit`/`canManageSystems`,
`droid.sourceStatus.garageRecommended`).

---

## 1. Phase 7 baseline

- `main` verified at `fe5483943af3c63e0dd9612b73c09a97dd4d14f1` before
  branching `claude/phase-7-droid-context-convergence`.
- Phase 6's own closing baseline: 132 passed, 0 failed (rolling suite), 5
  known-excluded Force-power-track Node/Foundry-shim import-resolution
  failures (unrelated to sheet/context code, unchanged this phase).
- Phase 6 §6D table (re-verified against current `main` before any Phase 7
  edit, not assumed): the shared `panelContexts.healthPanel/defensePanel/
  secondWindPanel` are built once per render by `new PanelContextBuilder(
  this.document, this)` inside `SWSEV2CharacterLikeSheet._prepareContextForActorSheet`
  (real ApplicationV2 `sheet.isEditable`, GM-aware). `DroidSheetContextBuilder`
  built its own second copy via `new PanelContextBuilder(actor, { isEditable:
  actor?.isOwner === true })` (raw ownership only). Phase 6 confirmed these
  two `isEditable` sources are not equivalent (a GM viewing a droid it does
  not personally own is the concrete disagreement case) and declined to
  merge on that basis.

## 2. BEFORE Droid context call graph (7A)

Full trace of `SWSEV2CharacterLikeSheet._prepareContextForActorSheet` for a
Droid actor, in call order, before this phase:

1. Actor-mode flags (`isDroidActor`, etc.) computed.
2. `panelContexts` hydrated once via `const panelBuilder = new
   PanelContextBuilder(this.document, this); ... panelContexts[panelName] =
   panelBuilder[builderMethod]();` for every panel `PanelVisibilityManager`
   says to build this render — `healthPanel`, `defensePanel`,
   `secondWindPanel`, `biographyPanel` are in the always-hydrated set for
   `_shellSurface === 'sheet'` (character.hbs's rendering context, which is
   what Droid actually renders through — see §5).
3. `const droidSheetContext = isDroidActor ? this._buildDroidSheetContext(actor)
   : null;` → `SWSEV2DroidSheet._buildDroidSheetContext(actor)`:
   - `new DroidSheetContextBuilder(actor).build()`, timed under
     `ActorPerfDiagnostics.recordSheetContext('droid-panel-builder', ms)`.
   - Inside `.build()`: `this.panelBuilder = new PanelContextBuilder(actor,
     { isEditable: actor?.isOwner === true })` (constructed in the
     constructor), then `.build()` called:
     - `this.buildBiographyPanel()` → `this.panelBuilder.buildBiographyPanel()`
       + Droid identity augmentation.
     - `this.panelBuilder.buildHealthPanel()` → `healthPanel`.
     - `this.panelBuilder.buildDefensePanel()` → `defensePanel`.
     - `this.buildQuickGlancePanel(healthPanel, defensePanel)` → `quickGlance`.
     - `this.panelBuilder.buildSecondWindPanel()` → `secondWindPanel`.
     - `this.buildAbilitiesPanel()` → `this.panelBuilder.buildAbilitiesPanel()`
       filtered → `abilitiesPanel`/`abilities`.
     - `this.buildDerivedViewModel(abilities)` → a second, Droid-local
       `derived` object (deep-cloned from `actor.system.derived`, augmented
       with `identity.abilities`).
     - `this.buildHeaderViewModel()` → a second call to
       `buildHeaderHpSegments(this.actor)` (the same shared helper the outer
       `_prepareContextForActorSheet` already calls once for the real
       `headerHpSegments`), plus a second independent XP/force/destiny
       computation.
     - Droid-specific: `droidPanels` (via `buildDroidSpecificPanels()`),
       `droid.{degree, resolvedSystems, garage, flags, sourceStatus,
       stockStatblockControls, reconciliationControls}`, `combatWeapons`,
       plus `items`/`equipment`/`armor`/`weapons`/`ownedActorMap`/`feats`/
       `talents`/`racialAbilities`/`sheetTheme*`/`user`.
   - **Invocation count per Droid render, before this phase: 2×
     `PanelContextBuilder` construction** (one shared, one
     Droid-builder-internal), each independently running
     `buildHealthPanel`/`buildDefensePanel`/`buildSecondWindPanel`/
     `buildBiographyPanel`/`buildAbilitiesPanel` — 5 panel methods run
     twice per render, plus a second `buildHeaderHpSegments` call.
4. `character-like-sheet.js` then reads **only** `droidSheetContext.droid`,
   `droidSheetContext.droidPanels`, `droidSheetContext.combatWeapons` out of
   that entire return object (two call sites, one feeding the shared/mostly-
   unused `conceptLayout` merge, one feeding `finalContext` directly) — see
   the grep-verified consumer list in §5.

## 3. Editability authority trace (7B)

Traced the real getter chain, not assumed:

- `sheetEditable` (the value threaded into `_prepareContextForActorSheet`)
  is computed once, per render, in `SWSEV2ActorSheetBase._prepareContext`
  (`scripts/sheets/v2/actor-sheet-base.js:1843`):
  `const sheetEditable = canUseActorSheetEditControls(this, actor);`
- `canUseActorSheetEditControls(sheet, actor)` (same file, exported,
  reusable — already used elsewhere, e.g. `character-sheet.js`'s own
  non-shared sheet-mode toggle):
  ```js
  export function canUseActorSheetEditControls(sheet, actor) {
    return game?.user?.isGM === true
      || actor?.isOwner === true
      || actor?.testUserPermission?.(game?.user, 'OWNER') === true
      || sheet?.isEditable !== false;
  }
  ```
  This is a permissive union: GM, actual ownership, an explicit
  `testUserPermission` check, OR the sheet's own native `isEditable` getter
  not being explicitly `false`. In practice the last clause already implies
  the first three for a normally-configured `ApplicationV2`/`DocumentSheetV2`
  (Foundry's own `isEditable` getter is itself GM-aware and
  ownership-aware), so the earlier clauses mainly guard early-render-cycle
  cases where `sheet.isEditable` might not yet be safely readable.
- The shared `panelContexts.*` builder does **not** use `sheetEditable`
  directly — it uses `this.sheet.isEditable` (`new PanelContextBuilder(
  this.document, this)`, where `this` is the real, live `SWSEV2*Sheet`
  ApplicationV2 instance). This is the real Foundry `ActorSheetV2#isEditable`
  getter, confirmed by code reading to be GM-aware and
  `options.editable`-aware (no local override exists anywhere in
  `scripts/sheets/v2/` — grepped, zero `get isEditable` overrides).
- **`DroidSheetContextBuilder`'s old constructor guessed `actor?.isOwner
  === true` instead of consulting either of the above.** This is the
  concrete authority divergence Phase 6 flagged: for a GM viewing a droid it
  does not personally own, `actor.isOwner` is `false` while
  `sheet.isEditable`/`sheetEditable` are both `true`.

**Authoritative rule established (and now enforced) for this phase:**
*presentation editability for the Droid context path is
`SWSEV2DroidSheet#isEditable` — the real ApplicationV2 getter, the same
value the shared `panelContexts.*` builder already uses.* Not
`actor.isOwner` alone. `_buildDroidSheetContext(actor)` runs as a method on
the live sheet instance (`this` inside it *is* the `SWSEV2DroidSheet`), so
`this.isEditable` is directly available with no threading needed — it is
passed straight into `DroidSheetContextBuilder`'s constructor.

**Permission matrix tested (7J, `tests/phase7-droid-editability-authority-contract.test.mjs`)**,
by extracting and executing the real `canUseActorSheetEditControls` function
body (not a reimplementation — see that test's header comment for why full
`ApplicationV2` import isn't attempted under Node here) against constructed
inputs:

| Case | isGM | actor.isOwner | testUserPermission | sheet.isEditable | Result |
|---|---|---|---|---|---|
| OWNER + normal editable sheet | false | true | — | true | **true** |
| NONOWNER PLAYER | false | false | false | false | **false** |
| GM (not raw owner), sheet reports non-editable | true | false | — | false | **true** |
| READ-ONLY SHEET (`editable: false`), non-owner, non-GM | false | false | false | false | **false** |

The GM row is the exact case this phase's fix targets: a GM must get edit
affordances regardless of raw ownership, matching every other control on
the sheet.

**Classifying every isOwner/isEditable/isGM usage found in Droid V2 sheet
code (7G):**

| Site | Old check | Classification | Action |
|---|---|---|---|
| `DroidSheetContextBuilder` constructor's internal `PanelContextBuilder` | `actor?.isOwner === true` | SHEET_EDITABILITY (misused) | **Removed** — the whole internal `PanelContextBuilder` and its 5 dead panel outputs eliminated (§6). |
| `buildGarageContext()` — `canEdit`/`canCustomize`/`canConvert`/`canOpenGarage`/`canManageSystems` | `actor?.isOwner === true` | SHEET_EDITABILITY (misused, and **live-consumed** — gates the real "Open Garage" button in `droid-systems-panel.hbs`) | **Normalized** to `this.isEditable`. |
| `buildSourceStatus()` — `garageRecommended` | `actor?.isOwner === true` | SHEET_EDITABILITY (misused, live-consumed CTA) | **Normalized** to `this.isEditable`. |
| `buildDroidSummaryPanel()` — `canEdit` | `actor?.isOwner === true` | SHEET_EDITABILITY (misused; dead in current template wiring — see §5) | **Normalized** to `this.isEditable` (correct now even though currently unread, in case a future template reads it). |
| `buildStockStatblockControlsPanel()` — `canAct` (feeds `canConvert`/`canRollback`) | `(actor?.isOwner === true) || Boolean(game.user?.isGM)` reconstructed locally | SHEET_EDITABILITY (already owner-or-GM, so not incorrect, but reconstructed policy inside the builder by reading `game.user` directly — the thing 7C says not to do) | **Normalized** to `this.isEditable`; `isOwner` kept as its own separate, still-literal-ownership display field. |
| `buildReconciliationControlsPanel()` — `canAct` | same pattern as above | same as above | **Normalized** to `this.isEditable`. |
| `droid-actor-sheet.js` catch-path fallback — `garage.canOpenGarage` | `actor?.isOwner === true` | SHEET_EDITABILITY (fallback-consistency gap, 7H) | **Normalized** to `this.isEditable === true` (same value the success path now uses). |
| `buildStockStatblockControlsPanel()` — `isOwner` field itself | `actor?.isOwner === true` | ACTOR_OWNERSHIP (genuine — a literal ownership fact some callers may still want to display, not a gate) | **Left unchanged** — the one remaining `actor?.isOwner === true` read in the file, verified by `tests/phase7-droid-editability-authority-contract.test.mjs`'s exact-count assertion. |
| `_useDroidPartFromButton`/`_convertDroidToPlayable`/`_reconcileDroidSystems`/etc. (droid-actor-sheet.js action handlers) | `this.actor.type !== 'droid'` guards only; underlying mutation services enforce their own permission | MECHANICAL_PERMISSION / not a context-building concern | **Left unchanged** — out of scope (action routing, not context authority; Phase 5 territory, no regression found). |
| `game.user.isGM` reads inside `buildStockStatblockControlsPanel`/`buildReconciliationControlsPanel` (before this phase) | — | GM_PERMISSION reconstructed ad hoc | **Removed** — replaced by consuming `this.isEditable`, so the builder no longer inspects `game.user` to reconstruct sheet policy (matches 7C's explicit instruction). |

**Classification counts:** SHEET_EDITABILITY (fixed): 6 sites. ACTOR_OWNERSHIP
(left, genuinely ownership): 1 site. GM_PERMISSION (removed, folded into
SHEET_EDITABILITY): 2 sites (subsumed into the count above, not double
counted). MECHANICAL_PERMISSION (left, out of scope): action-handler guards,
unchanged. LEFT UNCHANGED — UNCLEAR: none found requiring judgment calls
beyond the above.

## 4. Panel equivalence table (7D)

| Panel | Shared build (`panelContexts.*`, `sheet.isEditable`) | Old Droid-internal build (`actor?.isOwner === true`) | Live template consumer | Classification |
|---|---|---|---|---|
| `healthPanel` | Built once, always-hydrated for `_shellSurface === 'sheet'` | Built a second time inside `DroidSheetContextBuilder`, **never extracted** by `character-like-sheet.js` | `templates/actors/character/v2-concept/partials/frame/resource-strip.hbs` (`{{healthPanel.hp.value}}` etc — the *shared* one; Droid renders through this same root template) | **DIFFERENT AUTHORITY, but the Droid-internal copy was UNCONSUMED (dead)** — not "equivalent," simply never read. |
| `defensePanel` | Same as above | Same as above, never extracted | Consumed indirectly via `combatStatus`/`effectiveDefenses` built from the shared `panelContexts.defensePanel` | **UNCONSUMED (dead)**, same reasoning. |
| `secondWindPanel` | Same as above | Same as above, never extracted | No droid template reads it directly (verified by grep — zero references outside the shared concept-sheet path) | **UNCONSUMED (dead)**. |
| `biographyPanel` | Built once, shared | `DroidSheetContextBuilder.buildBiographyPanel()` — Droid identity override on top of `this.panelBuilder.buildBiographyPanel()`, never extracted | None (dormant `droid/v2/partials/frame/*` templates only) | **UNCONSUMED (dead)** — Droid identity fields (`droidType`/`droidModel`/`manufacturer`) are surfaced elsewhere via `droidPanels.droidSummary`, not through this panel. |
| `abilitiesPanel`/`abilities` | Built once, shared, feeds `conceptLayout.abilitiesTab` | Droid-filtered copy (drops CON), never extracted | None live | **UNCONSUMED (dead)**. |
| `quickGlance` | No shared equivalent | Droid-only, derived from the two dead panels above | Only `templates/actors/droid/v2/partials/frame/resource-strip.hbs`, which is **not included by any live root template** (confirmed by grep across `templates/` and `scripts/load-templates.js` — no `{{> ...frame/resource-strip.hbs}}` reference exists for the Droid path; Droid renders through the Character `v2-concept` root template instead) | **UNCONSUMED (dead)** — genuinely orphaned, not merely duplicated. |
| `droid.garage.*` / `droid.sourceStatus.*` / `droid.degree.*` / `droid.resolvedSystems.*` | No shared equivalent (Droid-exclusive) | Droid-only | `templates/actors/droid/v2/partials/droid-systems-panel.hbs` — **confirmed live**, included from `templates/actors/character/v2-concept/character-sheet.hbs` under `{{#if isDroidActor}}` | **IDENTICAL + DROID AUGMENTATION** is the wrong frame here — these are pure Droid-exclusive presentation, no shared equivalent exists at all. Kept, only their `isOwner`→`isEditable` authority corrected (§3). |
| `combatWeapons` | No shared equivalent | Droid-only | Same template, "Combat Bridge" rail | **DROID-EXCLUSIVE**, unchanged. |

No panel in this table required "merging two proven-identical outputs." The
resolution for the five duplicated panels was **elimination of dead work**,
which is a stronger and simpler outcome than reuse-by-merge.

## 5. Live template consumer verification (7M)

Traced every panel/context key this phase touches into its actual template
consumer, confirming inclusion reachability (not just key names):

| Key | Old source | New source | Same shape? | Same null/fallback semantics? | Same editable semantics? |
|---|---|---|---|---|---|
| `healthPanel`/`defensePanel`/`secondWindPanel`/`biographyPanel`/`abilitiesPanel`/`quickGlance` (finalContext) | Always the shared `panelContexts.*` (droidSheetContext's copies were never spread into finalContext even before this phase) | Unchanged — still exclusively the shared `panelContexts.*` | Yes — no change, these keys were never sourced from `droidSheetContext` | Yes | Yes (shared `sheet.isEditable`, unaffected by this phase) |
| `droid.garage.canOpenGarage`/`canEdit`/`canManageSystems` | `actor.isOwner` | `this.isEditable` | Same shape (`boolean`) | Same (`false`-safe defaults preserved in both success and catch paths) | **Changed, intentionally** — see §9 |
| `droid.sourceStatus.garageRecommended` | `actor.isOwner`-gated | `this.isEditable`-gated | Same shape | Same | **Changed, intentionally** |
| `droid.stockStatblockControls.canAct`/`canConvert`/`canRollback` | `isOwner || isGM` reconstructed | `this.isEditable` | Same shape | Same | Behaviorally equivalent for the common owner/non-owner/GM cases; only differs for the theoretical `sheet.isEditable === false` explicit-read-only case, where it now correctly also becomes `false` (previously a GM could still act even on an explicitly read-only-opened sheet, which was arguably itself a bug — see §9). |
| `droid.reconciliationControls.canAct`/`canReconcile`/`canRollback` | same as above | same as above | Same shape | Same | Same reasoning as above. |
| `droidPanels.droidSummary.canEdit` | `actor.isOwner` | `this.isEditable` | Same shape | Same | Currently unread by any live template (confirmed — `droid-systems-panel.hbs`'s fallback branch reads `droidPanels.droidSummary.degree`/`.size`/etc. but never `.canEdit`); corrected anyway for consistency. |
| `droid-systems-panel.hbs`'s consumption of `droid.resolvedSystems`/`droid.degree`/`combatWeapons` | Unchanged | Unchanged | Unchanged | Unchanged | Unchanged — this phase did not touch `DroidSystemsResolver`, degree normalization, or combat-weapon splitting. |

**Template reachability, verified by grep (not assumed):**
- `templates/actors/droid/v2/partials/droid-systems-panel.hbs` is included
  from `templates/actors/character/v2-concept/character-sheet.hbs` line 60,
  under `{{#if isDroidActor}}` — **live**.
- `templates/actors/droid/v2/partials/frame/*.hbs` (header-block,
  resource-strip, sidebar, tabs-bar, title-strip) and
  `templates/actors/droid/v2/partials/tabs/*.hbs` (abilities-tab,
  biography-tab, combat-tab, gear-tab, overview-tab, skills-tab,
  systems-tab, talents-tab) are **not referenced by any `{{> }}` include
  anywhere in the template tree** — confirmed by exhaustive grep. They are
  the dormant "legacy Droid sheet" scaffold Phase 4/5 already documented as
  orphaned (same family as the 4 orphaned templates Phase 5 flagged; not
  re-litigated or cleaned up here — see §15, Deferred).
- `templates/actors/droid/v2/partials/{weapons,armor,equipment,owned-actors}-panel.hbs`
  are preloaded into the Handlebars cache
  (`scripts/load-templates.js`, explicitly commented "Dormant legacy droid
  panels kept for compatibility during V2 migration") but likewise never
  `{{> }}`-included anywhere. `DroidSheetContextBuilder.build()`'s
  `items`/`equipment`/`armor`/`weapons`/`ownedActorMap` fields feed only
  these dormant templates. This phase left those fields alone (out of the
  named scope of health/defense/second-wind/biography/quick-glance/
  abilities) — flagged as a Phase 8 candidate in §15.
- `templates/actors/droid/v2/partials/droid-build-status-card.hbs` (which
  reads `droid.stockStatblockControls`/`droid.reconciliationControls`) is
  only reachable through `droid/v2/partials/tabs/{overview,systems}-tab.hbs`
  — both dormant per above. So the Stock-Statblock-Authority/Reconciliation
  controls this phase also normalized (§3) are **not currently
  live-rendered either**, though their computation is correct now
  regardless.

## 6. Duplicate-build elimination (7E)

**Before:** 2× `PanelContextBuilder` construction per Droid render (1 shared
+ 1 Droid-internal), with the Droid-internal instance running
`buildHealthPanel`, `buildDefensePanel`, `buildSecondWindPanel`,
`buildBiographyPanel`, `buildAbilitiesPanel` — 5 panel-builder method calls
that produced entirely discarded output — plus one extra
`buildHeaderHpSegments(this.actor)` call (also discarded) inside the now-
removed `buildHeaderViewModel()`.

**After:** 1× `PanelContextBuilder` construction per Droid render (shared
only). `DroidSheetContextBuilder` no longer imports `PanelContextBuilder`
at all, no longer imports `isXPEnabled`/`XP_LEVEL_THRESHOLDS`/
`buildHeaderHpSegments` (all now-unused after removing the dead header/XP
duplication), and its constructor takes an explicit `{ isEditable = false }`
contract instead of guessing from `actor.isOwner`.

**Methods removed** (dead, unreachable output — verified by tracing every
consumer, not assumed): `buildBiographyPanel()`, `buildAbilitiesPanel()`,
`buildDerivedViewModel()`, `buildQuickGlancePanel()`, `buildHeaderViewModel()`.

**Per-panel proof and resolution:**

| Panel | Old builder | New source | Old invocation count (per Droid render) | New invocation count | Elimination proof |
|---|---|---|---|---|---|
| `healthPanel` | `DroidSheetContextBuilder`'s internal `PanelContextBuilder` | Shared `panelContexts.healthPanel` only | 2 (1 shared + 1 dead Droid copy) | 1 (shared only) | Zero consumers read `droidSheetContext.healthPanel` (grep across `character-like-sheet.js` and every live template — §5). |
| `defensePanel` | same | same | 2 | 1 | Same proof. |
| `secondWindPanel` | same | same | 2 | 1 | Same proof. |
| `biographyPanel` | same | Not rebuilt; Droid identity fields already surfaced separately via `droidPanels.droidSummary` | 2 | 1 (shared build only; Droid's copy simply deleted, nothing replaces it because nothing consumed it) | Same proof. |
| `abilitiesPanel`/`abilities` | same | Shared `panelContexts.abilitiesPanel` / `conceptLayout.abilitiesTab` (Droid's CON-filtering was already duplicated by the shared path's own Droid handling — `sheetAbilityKeys = isDroidActor ? ABILITY_KEYS.filter(...)` in `character-like-sheet.js`) | 2 | 1 | Same proof. |
| `quickGlance` | Droid-only (no shared equivalent existed) | Removed entirely — no replacement, because its only consumer template is dormant (§5) | 1 (dead) | 0 | Orphaned-template proof (§5), not an equivalence proof. |
| header HP/XP segments (`buildHeaderViewModel`'s `headerHpSegments` etc.) | `buildHeaderHpSegments(this.actor)` called a second time inside the Droid builder | Shared `headerHpSegments` (computed once, elsewhere in `_prepareContextForActorSheet`) | 2 calls to `buildHeaderHpSegments` | 1 call | Same proof — `droidSheetContext.headerHpSegments` was never extracted. |

Every panel this phase names in its deliverables (health/defense/second-wind/
biography/quick-glance/abilities) went from a 2×-build/0-read state to a
1×-build/1-read state (health/defense/second-wind/abilities, now correctly
served only by the shared builder) or a 1×-build/0-read → 0×-build state
(biography's Droid-only augmentation and quickGlance, which had no live
consumer to preserve).

## 7. Droid-specific panels retained (7F)

Unchanged, still exclusively Droid's own responsibility (verified live and
consumed — §5): Droid identity/degree normalization
(`buildDegreeNormalization`), manufacturer/model/processor/locomotion/
appendages/sensors (`buildDroidSpecificPanels`'s sub-panels), integrated
systems/weapons, programming/protocols, customizations, modification
points, build history, budget breakdown, configuration metrics, validation
messages, `DroidSystemsResolver`-driven `resolvedSystems`, `garage`/
`sourceStatus`/`flags` (now correctly authority-normalized, §3),
Stock-Statblock-Authority and Converted-System-Reconciliation controls
(same normalization), and `combatWeapons`' integrated-vs-handheld weapon
split. None of these have a shared Character-like equivalent — they remain
on `DroidSheetContextBuilder` because they are genuinely Droid-exclusive,
not because equivalence couldn't be proven.

## 8. Permission/fallback consistency (7H)

The catch-path fallback object in `SWSEV2DroidSheet._buildDroidSheetContext`
(returned when `DroidSheetContextBuilder` throws) previously hardcoded
`garage: { canOpenGarage: actor?.isOwner === true, systemsLocked: false }`
— a different authority than the success path even used to use, and now
also different from what the corrected success path uses. Normalized to
`garage: { canOpenGarage: this.isEditable === true, systemsLocked: false }`
so a GM who hits this (rare, error-only) fallback path sees the same
control availability the success path would have given them, rather than a
second, independent ownership guess. `systemsLocked: false` is left as a
conservative, ownership-independent safe default (matches original intent —
"we don't know the lock state, so don't claim it's locked").

## 9. Mechanical-authority verification (7N)

**No SWSE formula, Droid mechanic, schema, or garage/build rule changed.**
Verified by diff review: `DerivedCalculator`, `ModifierEngine`,
`ActorEngine`, `DroidSystemsResolver`, `DroidValidationEngine`,
`droid-statblock-conversion-service.js`,
`droid-converted-system-reconciliation-service.js`, and every Droid data
schema file were not touched.

**Presentation-permission corrections made (explicitly not mechanical):**

1. `droid.garage.canOpenGarage`/`canEdit`/`canManageSystems`/`canCustomize`/
   `canConvert` now follow `this.isEditable` instead of `actor.isOwner`. A
   GM viewing a droid it does not personally own will now see the "Open
   Garage" button and the Garage-management affordances it previously could
   not see through this code path — while the actual Garage
   install/remove/finalize mutation logic (unchanged, in
   `droid-statblock-conversion-service.js` and the Garage application
   itself) already performs its own permission checks independent of this
   sheet-context flag. This is squarely the "UI was using the wrong
   permission proxy for an already-authoritative rule" case 7N
   anticipates: `canUseActorSheetEditControls`/`sheet.isEditable` already
   establish, system-wide, that GMs get edit affordances; the Droid Garage
   button was the one place still gating on raw ownership instead.
2. `droid.sourceStatus.garageRecommended` (a CTA, not a mutation gate) —
   same reasoning.
3. `droid.stockStatblockControls.canAct`/`canConvert`/`canRollback` and
   `droid.reconciliationControls.canAct`/`canReconcile`/`canRollback` — was
   already `isOwner || isGM` (functionally close to correct), now reads
   `this.isEditable` directly instead of reconstructing that OR chain by
   reading `game.user` inside the builder. The one behavior difference:
   previously a GM could act even if the sheet had been explicitly opened
   `editable: false`; now they cannot, matching the sheet-wide rule exactly.
   This is a narrower, arguably-also-correct behavior change, not a
   mechanical one — these are still presentation gates in front of service
   functions that do their own checks.
4. **None of the above enables or disables an actual mutation that wasn't
   already reachable through some UI path** — they only change whether the
   *button* is visible/enabled for a GM who does not literally own the
   actor. No HP/defense/DT/DR/attack math, no slot/cost calculation, no
   programming or modification-point rule changed.

## 10. Performance structural result (7I)

No live Foundry client is available in this environment (same limitation as
Phases 3-6). No timings are fabricated. Structural comparison, verified by
code reading:

- **`PanelContextBuilder` construction count per Droid render context-prep
  pass: 2 → 1.**
- **Panel-builder method calls eliminated per Droid render: 5**
  (`buildHealthPanel`, `buildDefensePanel`, `buildSecondWindPanel`,
  `buildBiographyPanel`, `buildAbilitiesPanel` — each previously ran twice
  per render with the second run's output entirely discarded, now runs
  once).
- **Redundant `buildHeaderHpSegments` call eliminated: 1** (was 2 per
  render, now 1).
- **`'droid-panel-builder'` diagnostic label preserved exactly** — still
  wraps `new DroidSheetContextBuilder(actor, { isEditable: ... }).build()`
  via `ActorPerfDiagnostics.time(...)` /
  `ActorPerfDiagnostics.recordSheetContext('droid-panel-builder', ms)`,
  unchanged string, unchanged call shape (`tests/
  phase7-droid-editability-authority-contract.test.mjs` and the retained
  Phase 6 contract-test assertion both cover this). No Phase 1/3
  diagnostics regression of the kind the Phase 6 correction pass had to fix
  for NPC.
- **No new performance subsystem created** — this phase reused
  `ActorPerfDiagnostics`, exactly as it existed.
- **Vehicle's 15-panel eager build: untouched** (§13, explicitly deferred
  per the task brief — no Vehicle file was edited).

## 11. Phase 5 action-integrity result (7L)

`node tests/phase5-sheet-action-integrity-contract.test.mjs` — PASS, zero
assertion changes. `node tests/phase5-subtype-context-integrity.test.mjs` —
PASS, zero assertion changes. `node tests/
phase6-subtype-context-ownership-contract.test.mjs` — PASS, zero assertion
changes (the call-site signature `this._buildDroidSheetContext(actor)` and
the no-op default `_buildDroidSheetContext(_actor) { return null; }` were
both left syntactically unchanged — only the *implementation* on
`SWSEV2DroidSheet` and the constructor contract of `DroidSheetContextBuilder`
changed, so no existing contract-test regex needed updating).
**0 unresolved rendered Droid actions** — no action handler
(`_useDroidPartFromButton`, `_convertDroidToPlayable`,
`_inspectDroidConversion`, `_rollbackDroidConversion`,
`_inspectDroidReconciliation`, `_reconcileDroidSystems`,
`_rollbackDroidReconciliation`) was touched; all still route through the
same click-delegation wiring Phase 4/5 established.

## 12. Tests (7J/7K)

New this phase:

- `tests/phase7-droid-editability-authority-contract.test.mjs` —
  1. Extracts and *executes* the real `canUseActorSheetEditControls`
     function body (via `new Function`, not a reimplementation) against the
     full required permission matrix (owner+normal, non-owner player, GM,
     read-only sheet) — PASS.
  2. Source-contract assertions locking in: `DroidSheetContextBuilder`'s
     `{ isEditable = false }` constructor contract; exactly one remaining
     literal-ownership read (`buildStockStatblockControlsPanel`'s display
     field); no `PanelContextBuilder` import/construction anywhere in the
     file; the one call site passing `isEditable: this.isEditable === true`;
     fallback-path consistency — PASS.
- `tests/phase7-droid-panel-reuse-contract.test.mjs` — actually imports and
  constructs `DroidSheetContextBuilder` under the existing narrow
  Foundry-shim harness (its trimmed import graph, after removing
  `PanelContextBuilder`, loads cleanly under Node — verified directly, unlike
  the full `ApplicationV2` sheet classes):
  1. Asserts `.build()`'s return object contains none of
     `healthPanel`/`defensePanel`/`secondWindPanel`/`biographyPanel`/
     `abilitiesPanel`/`quickGlance` — the regression guard 7K asks for
     (catches a future re-introduction of a duplicate panel build).
  2. Asserts the genuinely Droid-specific keys (`droid`, `droidPanels`,
     `combatWeapons`, `droid.degree`, `droid.resolvedSystems`,
     `droid.sourceStatus`) are still populated.
  3. Exercises the exact GM-viewing-unowned-droid matrix against the real
     `.build()` output: `isEditable: true` + `actor.isOwner: false` →
     `canOpenGarage: true`; `isEditable: false` + `actor.isOwner: false` →
     `false`; owner + editable → `true`; omitted options object → safe
     `false` default (no throw).

Re-run, unchanged assertions, all PASS: `tests/
phase4-sheet-architecture-contract.test.mjs`, `tests/
phase5-sheet-action-integrity-contract.test.mjs`, `tests/
phase5-subtype-context-integrity.test.mjs`, `tests/
phase6-subtype-context-ownership-contract.test.mjs`, `tests/
npc-concept-layout-skip.test.mjs`.

**Full suite:**
- `node tools/run-rolling-syntax-check.mjs` — 2,245/2,245 files clean (two
  new test files added this phase, up from Phase 6's 2,243).
- `node tools/run-rolling-tests.mjs` — **134 passed, 0 failed** (of 134 run;
  5 excluded as documented pre-existing Force-power-track failures,
  independently re-verified present and unrelated, same as Phase 6). This
  is Phase 6's 132 baseline plus the 2 new Phase 7 tests, zero regressions.

## 13. Live Foundry checklist

No live Foundry client was available in this environment (same limitation
as Phases 3-6). Required live-verification matrix:

| Scenario | Tab/Action | Expected editable | Expected read-only | Check |
|---|---|---|---|---|
| DROID / OWNER PLAYER | Systems tab | "Open Garage" button visible; garage-recommended CTA visible if config incomplete | — | `droid.garage.canOpenGarage` true; `SWSE.debug.performance.summary()` shows `'droid-panel-builder'` |
| DROID / NONOWNER PLAYER | Systems tab | — | "Open Garage" button hidden; no garage CTA | `droid.garage.canOpenGarage` false |
| DROID / GM WHO IS NOT RAW OWNER | Systems tab | "Open Garage" button **visible** (this is the corrected case) | — | Confirms the Phase 6/7 divergence fix — before this phase, a GM without explicit ownership would not have seen this button through this code path |
| DROID / READ-ONLY SHEET OPTION (`editable: false`) | Systems tab (owner or GM opening in read-only mode, if the app supports it) | — | "Open Garage" hidden even for GM/owner | Confirms `this.isEditable` (not raw GM/owner) is genuinely the authority consulted |
| Any Droid actor | Overview/Skills/Combat tabs (rendered through the shared concept-sheet path) | HP/defense/second-wind display unchanged | — | `healthPanel`/`defensePanel` values match what they were before this phase (sourced from the same shared builder both before and after) |
| Any Droid actor | Open sheet | — | — | `SWSE.debug.performance.reset()` → open sheet → `SWSE.debug.performance.summary()` confirms `'droid-panel-builder'` entry still present, no new render loop, no new Sentinel listener warnings |
| Any Droid actor | `use-droid-part` action on an integrated weapon | Works identically to before | — | Confirms action routing (Phase 4/5) undisturbed |

## 14. Exact files changed

- `scripts/sheets/v2/droid-sheet/context-builder.js` — removed the internal
  `PanelContextBuilder` construction and its 5 dead panel builds plus the
  redundant header/XP computation; removed now-unused imports
  (`PanelContextBuilder`, `isXPEnabled`, `XP_LEVEL_THRESHOLDS`,
  `buildHeaderHpSegments`); constructor now takes `{ isEditable = false }`;
  `buildGarageContext`, `buildSourceStatus`, `buildDroidSummaryPanel`,
  `buildStockStatblockControlsPanel`, `buildReconciliationControlsPanel`
  normalized to consume `this.isEditable` instead of reconstructing
  ownership/GM checks locally.
- `scripts/sheets/v2/droid-actor-sheet.js` — `_buildDroidSheetContext` now
  passes `{ isEditable: this.isEditable === true }` into
  `DroidSheetContextBuilder`; catch-path fallback's `garage.canOpenGarage`
  normalized to the same authoritative value; updated doc comment (no
  behavior change in the comment update itself).
- `scripts/sheets/v2/character-like-sheet.js` — updated the stale Phase 6
  doc comment on the no-op `_buildDroidSheetContext` default (no code
  change — call site and default body both left byte-identical, which is
  why no existing contract test needed updating).
- New: `tests/phase7-droid-editability-authority-contract.test.mjs`.
- New: `tests/phase7-droid-panel-reuse-contract.test.mjs`.
- New: this document.

**No other production files were changed.** `DerivedCalculator`,
`ModifierEngine`, `ActorEngine`, `DroidSystemsResolver`,
`DroidValidationEngine`, any Droid domain/service file, SWSE formulas,
Actor/Item schemas, Vehicle code, NPC code, and Phase 5's action-routing/
listener wiring were not touched.

## 15. Deferred items

- **Vehicle eager 15-panel build** (Phase 6 §6E/§6F) — explicitly not
  reopened per this phase's 7O instruction. Still pending live-Foundry
  render-timing evidence before any `PanelVisibilityManager`-style
  mechanism is considered for Vehicle.
- **Dormant Droid legacy template scaffold** — `templates/actors/droid/v2/
  partials/frame/*.hbs`, `templates/actors/droid/v2/partials/tabs/*.hbs`,
  and the 4 "dormant legacy" panels explicitly commented as such in
  `scripts/load-templates.js` (`weapons-panel.hbs`, `armor-panel.hbs`,
  `equipment-panel.hbs`, `owned-actors-panel.hbs`) remain orphaned, matching
  Phase 5's existing orphaned-template finding. Not cleaned up here per 7P
  (general template cleanup is out of scope for this phase) — recommended
  for a dedicated Phase 8 cleanup pass, alongside Phase 5's other named
  cleanup candidate (`inventory-ui.js`).
- **Broader dead-field cleanup inside `DroidSheetContextBuilder.build()`'s
  return object** — `items`, `equipment`, `armor`, `weapons`,
  `ownedActorMap`, `feats`, `talents`, `racialAbilities`, `sheetTheme*`,
  `user` are still computed and returned but, per §5, feed only the dormant
  templates above. This phase left them alone deliberately — they are not
  "duplicate panel builds" (nothing else computes an equivalent value), just
  generally-unused output tied to the same dormant legacy scaffold. Bundling
  their removal with this phase's isEditable-authority work would have
  broadened the diff well past "Droid presentation-context authority +
  duplicate panel work." Recommended as part of the same Phase 8 cleanup
  pass above, once/if the dormant templates are formally retired (removing
  the context fields first, independent of the templates, risks a silent
  behavior change if some future work re-wires one of those templates back
  in before the field is restored).

## 16. Recommended next phase (not begun)

Phase 8 — general Droid-track cleanup: retire the confirmed-dormant
`droid/v2/partials/frame/*` and `droid/v2/partials/tabs/*` template
scaffold (and the four "dormant legacy" panels in `load-templates.js`) once
confirmed genuinely unreachable in a live Foundry session, then remove the
now-provably-dead `items`/`equipment`/`armor`/`weapons`/`ownedActorMap`/
`feats`/`talents`/`racialAbilities`/`sheetTheme*`/`user` fields from
`DroidSheetContextBuilder.build()`'s return object in the same pass;
alongside Phase 5's other named cleanup item (`inventory-ui.js`). Vehicle's
eager 15-panel build remains a separate, larger candidate pending live
render-timing evidence (unchanged from Phase 6's recommendation).

---

## Deliverables summary

1. **PHASE 7 VERDICT: PHASE 7 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**
   (no live Foundry client available in this environment — §13 is the
   concrete follow-up checklist).
2. **Editability authority**: `SWSEV2DroidSheet#isEditable` (the real,
   native ApplicationV2 `isEditable` getter — GM-aware, `options.editable`-
   aware) is now the sole authority for Droid presentation editability,
   threaded explicitly into `DroidSheetContextBuilder`'s constructor as
   `{ isEditable }`. This is the same authority the shared
   `panelContexts.*` builder already used (`new PanelContextBuilder(
   this.document, this)` → `this.sheet.isEditable`). Raw `actor.isOwner` is
   no longer used as an editability proxy anywhere in this file except one
   explicitly-labeled, genuinely-ownership display field. §3/§9.
3. **Before call graph**: §2.
4. **After call graph**: identical actor-mode/panel-hydration preamble;
   `_buildDroidSheetContext(actor)` now calls `new DroidSheetContextBuilder(
   actor, { isEditable: this.isEditable === true }).build()`; that `.build()`
   no longer constructs a second `PanelContextBuilder` or duplicates any of
   the five named panels; `character-like-sheet.js`'s two extraction sites
   (`droid`/`droidPanels`/`combatWeapons`) are unchanged.
5. **isOwner classification counts**: SHEET_EDITABILITY (fixed): 6 sites.
   ACTOR_OWNERSHIP (left, genuine): 1 site. GM_PERMISSION (folded into the
   SHEET_EDITABILITY fix, no longer separately reconstructed): 2 sites.
   MECHANICAL_PERMISSION (left, out of scope — action-handler type guards):
   unchanged. LEFT UNCHANGED — UNCLEAR: 0.
6. **Panel equivalence results**: health/defense/second-wind/biography/
   abilities/quick-glance — all five were **UNCONSUMED (dead)** in the
   Droid-internal builder's output, not merely "equivalent to" the shared
   copy; the shared copy was always the one actually rendered. §4/§6.
7. **Duplicate builds removed**: see the table in §6 —
   healthPanel/defensePanel/secondWindPanel/biographyPanel/abilitiesPanel:
   old builder `DroidSheetContextBuilder`'s internal `PanelContextBuilder`,
   new source is exclusively the shared `panelContexts.*`, old invocation
   count 2×, new invocation count 1×, proof = zero downstream consumers of
   the Droid-internal copy (verified by tracing `character-like-sheet.js`'s
   two extraction sites and every live-included Droid template).
8. **Droid-specific builds retained**: §7 — degree/manufacturer/model/
   processor/locomotion/appendages/sensors/integrated systems/weapons/
   programming/protocols/customizations/modification points/build history/
   budget/validation/`resolvedSystems`/garage/source-status/Stock-Statblock-
   Authority/Reconciliation controls/`combatWeapons` — none have a shared
   equivalent, all remain Droid-exclusive by design, not by default.
9. **Permission behavior changes**: presentation-only — `droid.garage.*`
   and `droid.sourceStatus.garageRecommended` now correctly grant a GM
   viewing an unowned droid the same edit affordances the rest of the sheet
   already grants it (§9). No mutation authority, mechanical rule, or
   formula changed; underlying Garage/conversion/reconciliation service
   functions retain their own independent permission checks.
10. **Exact files changed**: §14.
11. **Exact mechanical behavior changes**: **none**. Only UI-control
    visibility/enablement for a GM viewing an unowned droid changed (§9) —
    a presentation correction, not a mechanical one, per 7N's own
    distinction.
12. **Performance structural result**: `PanelContextBuilder` construction
    per Droid render: 2× → 1×. Panel-builder method calls eliminated per
    render: 5 (health/defense/second-wind/biography/abilities). Redundant
    `buildHeaderHpSegments` call eliminated: 1. `'droid-panel-builder'`
    diagnostic label preserved exactly. No timings fabricated — no live
    Foundry client available (§10/§13).
13. **Phase 5 action-integrity result**: **0 unresolved actions**,
    re-verified via `phase5-sheet-action-integrity-contract.test.mjs` and
    `phase5-subtype-context-integrity.test.mjs`, both PASS, zero assertion
    changes (§11).
14. **Test results**: `node tools/run-rolling-syntax-check.mjs` —
    2,245/2,245 clean. `node tools/run-rolling-tests.mjs` — **134 passed, 0
    failed** (132 Phase 6 baseline + 2 new Phase 7 tests), 5 excluded
    pre-existing unrelated failures, independently re-verified (§12).
15. **Live Foundry checklist**: §13.
16. **Deferred items**: Vehicle eager-panel optimization (pending live
    timing evidence, per 7O — untouched); dormant Droid legacy template
    scaffold cleanup; broader dead-field cleanup in
    `DroidSheetContextBuilder.build()`'s return object beyond the five named
    panels (§15).
17. **Recommended next phase** (not begun): Phase 8 — general Droid-track
    template/dead-field cleanup (§16).
