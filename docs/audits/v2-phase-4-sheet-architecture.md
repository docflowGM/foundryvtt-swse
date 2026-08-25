# Phase 4 — V2 Actor Sheet Architecture Separation

Status: **PHASE 4 COMPLETE WITH DOCUMENTED RUNTIME FOLLOW-UP**

This document records the audit and implementation of Phase 4: splitting the
universal `SWSEV2CharacterSheet` ApplicationV2 controller — previously
registered for Character, NPC, Droid, and Vehicle actors simultaneously —
into type-aware controllers, based on a full reachability/classification
audit rather than a naive file-per-actor-type split.

Baseline going into this phase: Phase 1 (authority/performance
instrumentation), Phase 2/2B (actor authority normalization, PR #953), Phase
3 (derived-performance improvements, PR #954, closed as "STATICALLY VERIFIED
WITH DOCUMENTED RUNTIME FOLLOW-UP"). The pre-existing, unrelated
`lang/en.json` CI failure (`progression-suggestion-and-render-contracts.test.mjs`)
remains untouched throughout.

---

## 1. Before architecture

A single class, `SWSEV2CharacterSheet` (`scripts/sheets/v2/character-sheet.js`,
11,095 lines), extended
`ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2))`
directly and was registered in `index.js` for all four actor types
(`character`, `npc`, `droid`, `vehicle`), each with `makeDefault: true` and a
distinct label, all pointing at the same class. It had ~125 top-level
imports, ~164 methods, no declarative Foundry `actions: {...}` map (all
click dispatch was manual — `addEventListener` calls plus delegated
`dataset.action` string-comparison blocks), and a single fixed root template
(`static PARTS.body.template`) that itself branched at the Handlebars level
via `{{#if actorSheetMode.useVehicleSheet}}...{{else if
actorSheetMode.useNpcConceptSheet}}...{{else}}...{{/if}}`.

A prior architecture attempt at separate `SWSEV2DroidSheet`/`SWSEV2NpcSheet`/
`SWSEV2VehicleSheet` classes existed at some point in this codebase's history
and was deliberately consolidated back into the single class (evidence:
commented-out registry entries in
`scripts/governance/sentinel/v2-comprehensive-audit.js` explicitly labeling
the three old classes "deprecated/orphaned", plus corroborating comments in
`scripts/sheets/v2/npc/npc-sheet-helpers.js` and
`scripts/sheets/v2/droid-sheet/context-builder.js` referring to the old
classes as "retired"). The specific rationale for that consolidation could
not be recovered — this is a shallow git clone (199 commits reachable,
`git rev-parse --is-shallow-repository` = true) and the deletion commit(s)
are not in history. This was surfaced to the user before implementation
began; the user's direction (below) is evidence-driven rather than a literal
re-creation of the old three-class split, which is the most plausible reason
it will not repeat whatever problem the old split had (see §14).

---

## 2. Import/reachability classification

Full detail lives in the 5-agent Phase 4A audit transcript (imports,
methods, drag/drop, context-building call graph, action-handler
reachability). Summary counts from that audit, on the **original**
11,095-line file:

**Imports** (154 symbols across 125 import statements):

| Classification | Count |
|---|---|
| SHARED (all four types) | 34 |
| Character+NPC+Droid (excl. Vehicle) | 83 |
| Character+Droid+promoted-heroic-NPC only | 1 (`buildConceptSheetViewModel`) |
| NPC only | 7 |
| DROID only | 5 |
| VEHICLE only | 11 |
| DEAD/UNREACHABLE | 13 |

**Methods** (161 definitions):

| Classification | Count |
|---|---|
| SHARED (all 4 types) | 44 |
| Character+NPC+Droid (excl. Vehicle) | 79 |
| VEHICLE only | 5 |
| NPC only | 6 |
| DROID only | 8 |
| DEAD/UNREACHABLE | 12 |
| (borderline/least-confident, folded into the above with caveats) | 7 |

**Key structural fact governing the whole split**: `activateListeners()` /
`_activateListenersInternal()` — the ~130-listener chain covering
combat/inventory/skills/force/abilities UI — was reachable for Character,
NPC, and Droid but **never for Vehicle**, because `_onRender` returned early
for `document.type === 'vehicle'` before ever calling `activateListeners`.
This is the single fact that makes "Vehicle is structurally separate;
Character/NPC/Droid are one family" an evidentiary conclusion rather than an
assumption.

A second structural fact: a "promoted heroic NPC"
(`isPromotedHeroicNpcActor`, `actor-sheet-mode.js`) is `actor.type === 'npc'`
at the document level but renders through the **same** template branch and
code path as Character/Droid, not the NPC-concept branch. Any controller
owning the Character/Droid shared path also transparently owns this case,
since routing is by actor.type at registration time, not by a runtime mode
flag — a promoted-heroic NPC document is still registered to `SWSEV2NpcSheet`
post-split, and `SWSEV2NpcSheet` inherits the full shared implementation
from `SWSEV2CharacterLikeSheet` unchanged, so this case required no special
handling.

---

## 3. Shared base (`SWSEV2ActorSheetBase`) responsibilities

New file: `scripts/sheets/v2/actor-sheet-base.js` (2,406 lines). Extends the
mixin chain directly. Owns genuinely universal behavior, reachable
regardless of actor type:

- Constructor, static `_sanitizeApplicationV2Options`, `static DEFAULT_OPTIONS`/`static PARTS` (single source of truth for every subtype's root template).
- `render()` override, `setPosition()` override, `_onClose()`.
- All shell-surface wiring: `_wireShellEvents`, `_wireHomeSurfaceEvents`, `_wireUpgradeSurfaceEvents`, `_wireUpgradeOverlayEvents`, `_wireSettingsSurfaceEvents`, `_wireMentorSurfaceEvents`, `_wireProgressionSurfaceEvents`, `_wireWorkbenchSurfaceEvents`, `_wireCustomizationSurfaceEvents` (the last three reached via `ShellHostMixin` dynamic dispatch by exact method name — preserved unchanged).
- Tablet/window chrome: `_toggleTabletExpanded`, `_applyTabletSizingVars`, `_minimizeTabletWindow`, `_wireTabletWindowDrag`, `_wireTabletWindowResize`, `_wireTabletScrollFallback`, `_getTabletViewportScale`, `_applyTabletMinimumSize`, `_applyTabletViewportFit`.
- Shell surface state API: `getSurfaceState`/`patchSurfaceState`/`patchSurfaceOptions`/`requestSurfaceRender`/`setSurface`/`returnToSheet`/`openOverlay`/`closeOverlay`/`openDrawer`/`closeDrawer`.
- The action-economy chain: `_resolveActionEconomyModules`, `_normalizeActionEconomyType`, `_labelActionEconomyType`, `_deriveCombatActionEconomyType`, `_actionEconomyCostForType`, `_isActionEconomyPermitted`, `_notifyActionEconomyPolicy`, `_applyActionEconomyPolicy`, `_applyActionEconomy`, `_clearPanelViewModelCache` — confirmed reachable from Vehicle's own wiring (`_runCanonicalAttackWithPreroll`/`_runCanonicalAttack`, also moved here since Vehicle calls them directly for weapon rolls) as well as the Character-like chain.
- `_resetCharacterToBlank` — wired inside the truly-shared `_wireShellEvents`; kept on the base even though it's semantically PC-oriented, since Vehicle simply never renders a button that reaches it (a harmless, pre-existing, undisturbed dead branch for Vehicle — matching the "preserve existing behavior exactly" mandate rather than "fix" something out of scope).
- Two small hooks that subclasses implement: `_onRenderActorSheet(root, signal)` and `_prepareContextForActorSheet({...})`, called from the base's own `_onRender`/`_prepareContext` after their shared preamble (position centering, `HelpModeManager`, `applyActorSheetModeClasses`, diagnostics snapshots — all confirmed universal).
- `canUseActorSheetEditControls`, `applySheetInteractionMode`, `setStoredSheetMode` — small exported helpers used by more than one subclass file.

---

## 4. Character controller (`SWSEV2CharacterSheet`) responsibilities

File: `scripts/sheets/v2/character-sheet.js` — **31 lines**. Contains a
single doc comment and:

```js
export class SWSEV2CharacterSheet extends SWSEV2CharacterLikeSheet {}
```

No Character-exclusive behavior was found anywhere in the reachability
audit. Every method that "looks" Character-specific by content (lightsaber
construction, Jedi/Sith talent-action dispatch, progression/chargen UI) is
in fact reachable regardless of `actor.type`, because dispatch keys off
`actionData`/template content, not `actor.type` — an NPC or Droid actor with
the right items/flags reaches the identical code path. This is the
architecture's intended outcome, not an oversight: per the user's explicit
instruction, "the Character controller may be extremely thin if it
currently has no exclusive behavior. That is acceptable." The class exists
(rather than aliasing `SWSEV2CharacterLikeSheet` directly) specifically so a
real Character-exclusive override has an obvious home the moment Phase 5
UX work needs one, and so the class registered for `character` actors has
an explicit, self-documenting identity rather than borrowing a
generically-named shared class.

`SWSEV2CharacterSheet` keeps its exact name and this exact file path
unchanged from before Phase 4, because at least 8 external files depend on
the literal runtime string `"SWSEV2CharacterSheet"` (see §11).

---

## 5. NPC controller (`SWSEV2NpcSheet`) responsibilities

New file: `scripts/sheets/v2/npc-actor-sheet.js` (391 lines). Extends
`SWSEV2CharacterLikeSheet`. Owns:

- `_wireNpcConceptSheetEvents`, `_wireNpcConceptFieldPersistence`, `_updateNpcConceptStatblockAuthority`, `_parseNpcSheetSignedNumber`, `_normalizeNpcSheetDiceFormula`, `_rollNpcSheetFlatFormula` — all previously guarded `actor?.type !== 'npc'` internally, or reachable only from an `actor.type === 'npc'`-gated call site.
- Exclusive imports: `NpcProfileBuilder`, `buildNpcConceptAbilities`, `isNpcSheetWritablePath`, `isNpcStatblockAuthorityPath`, `isQuietNpcSheetPath` (all from `sheets/v2/npc/npc-sheet-helpers.js` / `actors/npc/npc-profile-builder.js`), plus `coerceSingleFieldValue` (from `character-sheet/form.js`, verified unused elsewhere in the shared file so its import moved rather than being duplicated).
- `_buildNpcConceptAbilitiesContext(context, actor)` — an override of a no-op hook on `SWSEV2CharacterLikeSheet`, holding the exact body of the original inline `if (useNpcConceptSheet) { buildNpcConceptAbilities(...); NpcProfileBuilder.buildContext(...) }` block. This is the one context-building block that was cleanly, mechanically extractable (it only read/wrote `context`/`actor`, nothing else) — see §9 for what was **not** extracted and why.

The call site (`if (this.document?.type === 'npc') { this._wireNpcConceptSheetEvents(...) }`) remains on `SWSEV2CharacterLikeSheet`, unchanged — it resolves correctly via the prototype chain now that NPC actors are always instantiated as `SWSEV2NpcSheet`.

---

## 6. Droid controller (`SWSEV2DroidSheet`) responsibilities

New file: `scripts/sheets/v2/droid-actor-sheet.js` (394 lines). Extends
`SWSEV2CharacterLikeSheet`. Owns:

- `_useDroidPartFromButton`, `_inspectDroidConversion`, `_convertDroidToPlayable`, `_viewOriginalDroidStatblock`, `_rollbackDroidConversion`, `_inspectDroidReconciliation`, `_reconcileDroidSystems`, `_rollbackDroidReconciliation` — all previously guarded `actor.type !== 'droid'` internally, wired from a droid-gated click-delegation block.
- Exclusive imports: `getDroidPartDefinition`, `getSelfDestructBurstSquares`, `getSelfDestructDamage`, `hydrateDroidPart` (`data/droid-part-schema.js`).
- Five module-level helper functions found during implementation to be used *exclusively* by the methods above (`getDroidActorSize`, `createDroidSelfDestructTemplate`, `buildDroidPartVirtualWeapon`, `listToHtml`, `postDroidPartChat`) — moved down with them rather than left behind as dead code in the shared file (leaving them would have been dead code there and a `ReferenceError` in the moved methods).

`DroidSheetContextBuilder` (the Droid-only context-building panel, called from a `if (isDroidActor)` block) was deliberately **not** extracted into an override on this class — see §9.

The click-delegation dispatch that calls these methods remains on `SWSEV2CharacterLikeSheet`, unchanged, resolving correctly via the prototype chain for `SWSEV2DroidSheet` instances.

---

## 7. Vehicle controller (`SWSEV2VehicleSheet`) responsibilities

New file: `scripts/sheets/v2/vehicle-actor-sheet.js` (831 lines). Extends
`SWSEV2ActorSheetBase` **directly** (not via the Character-like layer — the
Phase 4A audit found zero code shared between Vehicle's context/event logic
and the Character/NPC/Droid chain beyond what's already on the base). Owns:

- `_prepareVehicleActorSheetContext` (as `_prepareContextForActorSheet` override) — cargo/rule-context/panel-VM/action-economy/shell-surface/theme assembly, `StarshipManeuversEngine.getManeuversForActor`.
- `_onRenderActorSheet` override — `_wireVehicleActorModeEvents` + `_wireShellEvents`, matching the original vehicle branch of `_onRender` exactly.
- `_requestedVehicleTab`, `_activateVehicleTab`, `_onSubmitVehicleActorForm`.
- All 11 vehicle-only imports (`buildVehicleSheetContext`, `VehicleRulesAdapter`, `bindVehicleCrewAssignmentControls`, the `vehicle-crew-diagnostics.js` side-effect import, `StarshipManeuversEngine`, `SubsystemEngine`, `EnhancedShields`/`EnhancedEngineer`/`EnhancedPilot`/`EnhancedCommander`, `VehicleTurnController`).
- A disclosed, deliberate duplication: two small pure-function groups (`toActionStateLabel`/`buildActionPips`/`buildSheetActionEconomyContext` and `duplicateDataForContext`/`documentToTemplateData`/`sanitizeSheetRenderContext`) exist verbatim in both this file and `character-like-sheet.js`, rather than being imported one-from-the-other, to avoid a backwards Vehicle→Character (or Character→Vehicle) dependency for utility functions that have no actor-type-specific behavior.

Vehicle's drag/drop stack (`_wireVehicleActorModeEvents` → `bindVehicleCrewAssignmentControls` → `VehicleDropEngine`) was already fully independent of the Character/NPC/Droid drop stack (`activateListeners`/`_onDrop`/`DropResolutionEngine`) before this phase — confirmed by the Phase 4A drag/drop audit — so this move required no drop-logic changes, only relocation.

**Pre-existing gap, preserved as-is (not fixed)**: Vehicle has no `PortraitUploadController` binding, since that binding lived in the non-vehicle branch of the old `_onRender` and Vehicle never reached it. This predates Phase 4 and is out of scope to fix here.

---

## 8. Action routing table

Full detail is in the Phase 4A action-handler reachability audit (55 tool
calls tracing the complete `{{> "...hbs"}}` partial-inclusion graph over all
528 template files, BFS'd from the three mutually-exclusive root-template
branches). Summary:

- **Common-Else cluster** (Character + Droid + promoted-heroic-NPC): the largest, most tangled action set — tabs, abilities, skills, combat, force/force-suite, talents, gear, biography. Lands on `SWSEV2CharacterLikeSheet` in full; does not split cleanly three ways because the template branch itself doesn't split cleanly (promoted-heroic NPC shares the branch with Character/Droid).
- **Droid-only cluster**: `customize-droid`, `open-droid-system-item`, `use-droid-part`, `roll-weapon` — the only reachable template is `droid-systems-panel.hbs`, a single self-contained file with zero further includes. Cleanly owned by `SWSEV2DroidSheet`.
- **Vehicle-only cluster**: `customize-vehicle`, `save-vehicle`, crew/station/weapon-mount actions (delegated to `vehicle-crew-assignment-controls.js`), power/shield/subsystem/turn-phase actions. Cleanly owned by `SWSEV2VehicleSheet`.
- **NPC-concept cluster**: `add-npc-weapon`, `roll-npc-statblock-attack`, `roll-npc-statblock-damage`, `open-npc-levelup`, `npc-repair-safe-normalize`, `npc-repair-gm-approve`, plus a statblock-qualified `roll-skill` registration distinct from the generic one. Cleanly owned by `SWSEV2NpcSheet`, but the Force Suite cluster (shared with Common-Else — see below) also reaches force-sensitive NPCs.

**Pre-existing "no handler found" gaps** (verified via exhaustive repo-wide
grep, present before Phase 4 and explicitly preserved, not fixed, per the
"do not silently fix or silently drop" mandate): the entire Force
Suite/Starship Suite action cluster (~25 actions — `set-force-tradition`,
`set-lightsaber-form`, `force-suite-recover-*`, `activate-starship-maneuver`,
etc. — logic exists only in an unimported dead module, `force-ui.js`, an
apparent abandoned prior extraction attempt), `set-skills-filter`,
`force-alchemy`/`sell-item` on gear rows, `create-custom-talent-tree`,
current-conditions-panel actions on the sheet itself (they work on chat
cards via a different code path), `import-vehicle`/`regainManeuver`/
`useManeuver` on Vehicle, and `open-follower-advancement`/
`revert-npc-progression`/`open-related-actor` on NPC.

**Pre-existing dead handlers** (handler code exists but every template that
would render its trigger is itself orphaned — ~14 clusters, e.g.
`roll-npc-weapon`, `open-owned`/`remove-owned`, `build-follower`,
`resolve-feat-choice`, the seven droid-build-status-card handlers,
`toggle-defenses`) — also preserved as-is.

Neither category changed as a result of this phase's controller split:
every button that was reachable before Phase 4 is reachable after it
(verified structurally by the fact that no handler method or its call site
was deleted, only relocated — confirmed by `phase4-sheet-architecture-contract.test.mjs`'s
duplication checks plus the full test-suite pass), and every button that had
no handler before Phase 4 still has none (out of scope to fix).

---

## 9. Context-building paths

`_prepareContext`'s ordered execution (originally lines ~2790-4466 of the
monolith) is now split as: `SWSEV2ActorSheetBase._prepareContext` runs the
universal preamble, then calls `this._prepareContextForActorSheet({...})`,
which `SWSEV2VehicleSheet` overrides with the vehicle-only body and which
`SWSEV2CharacterLikeSheet` implements with the Character/NPC/Droid body
(inherited unchanged by `SWSEV2CharacterSheet`/`SWSEV2NpcSheet`/
`SWSEV2DroidSheet`).

**What was extracted into a per-subtype hook** (step 2 of the approved
plan): the NPC ability/profile augmentation block
(`buildNpcConceptAbilities()` + `NpcProfileBuilder.buildContext()`) — a
clean, mechanically verifiable move because it only touched two local
variables (`context`, `actor`). Now `this._buildNpcConceptAbilitiesContext(context, actor)`,
no-op on `SWSEV2CharacterLikeSheet`, real body on `SWSEV2NpcSheet`.

**What was deliberately left shared, not forced into a hook** (step 3, the
plan's explicitly sanctioned escape hatch): the `DroidSheetContextBuilder`
call (`if (isDroidActor) { ... }`) and the `buildNpcConceptSheetContext(...)`
call (`if (useNpcConceptSheet) { context.npcConcept = ... }`). Both read and
write roughly 25 shared local variables (`isGM`, `combatStatus`, `derived`,
`abilities`, `xpData`, `forceSensitive`, etc.), cross-reference each other
(`conceptLayout` — itself already skipped for plain NPC per Phase 3B — feeds
into `buildNpcConceptSheetContext`; `droidSheetContext` is spread into two
separate downstream objects), and are covered by an existing static-guard
test (`npc-concept-layout-skip.test.mjs`, now updated to read
`character-like-sheet.js`) asserting the exact call shape. Forcing a clean
hook signature here would mean either threading ~25 parameters through a
manufactured extension point or restructuring the shared function's data
flow — exactly what the user's own instruction ruled out ("Do not force a
method into a subtype merely to make the files look more symmetrical").
**This is a documented, intentional limitation, flagged as a candidate for a
future pass** if a cleaner extraction becomes apparent with more context or
live-Foundry verification available (see §14).

Confirmed **not** constructed for the wrong type: Vehicle's
`_prepareContextForActorSheet` never references `DroidSheetContextBuilder`,
`buildNpcConceptSheetContext`, `buildConceptSheetViewModel`, or any
Character/NPC/Droid-only import (verified by the import-boundary contract
test, §"Import-boundary contract" in `phase4-sheet-architecture-contract.test.mjs`).
Character/NPC/Droid's shared context path never references any
Vehicle-only import for the same reason. The already-existing
Phase-3-established skip (`buildConceptSheetViewModel()` skipped for plain
NPC) is unchanged and still verified by its own test.

Two findings from the Phase 4A context call-graph audit remain **open,
unresolved by this phase** (deliberately — fixing them was out of scope for
an architecture-separation pass): (a) `panelContexts.inventoryPanel`/
`.healthPanel`/`.defensePanel` are read at three sites before the
panel-hydration loop populates them, a pre-existing sequencing defect
affecting Character/NPC/Droid identically; (b) follower/minion context and
the Combat Actions Context block are computed unconditionally for NPC with
unconfirmed template consumption — possible future Phase-3-style skip
candidates, not yet verified against templates.

---

## 10. Registration changes

`index.js` now registers each actor type to its own dedicated controller:

```js
Actors.registerSheet("swse", SWSEV2CharacterSheet, { types: ["character"], label: "SWSE Character Sheet v2", makeDefault: true });
Actors.registerSheet("swse", SWSEV2NpcSheet, { types: ["npc"], label: "SWSE NPC Actor Sheet v2 (Actor Shell)", makeDefault: true });
Actors.registerSheet("swse", SWSEV2DroidSheet, { types: ["droid"], label: "SWSE Droid Actor Sheet v2 (Actor Shell)", makeDefault: true });
Actors.registerSheet("swse", SWSEV2VehicleSheet, { types: ["vehicle"], label: "SWSE Vehicle Actor Sheet v2 (Actor Shell)", makeDefault: true });
```

All four labels and `makeDefault: true` are byte-identical to before Phase
4. `CONFIG.Actor.documentClass` was not touched. Verified by the
registration contract in `phase4-sheet-architecture-contract.test.mjs`
(exactly one `registerSheet` call per type, correct class, correct label,
`makeDefault: true`).

---

## 11. Compatibility shims

No new compatibility shim/alias was introduced. Instead, the identity
constraint was satisfied by **not renaming or moving** `SWSEV2CharacterSheet`
— it keeps its exact name and file path (`scripts/sheets/v2/character-sheet.js`)
from before Phase 4, specifically because at least 8 external files depend
on the literal runtime string `"SWSEV2CharacterSheet"` via mechanisms a
static-import search alone would not catch:

| File | Mechanism |
|---|---|
| `scripts/patches/force-suite-render-guard-hotfix.js` | `Hooks.on('renderSWSEV2CharacterSheet', ...)` — already has a `renderApplicationV2` fallback, unaffected |
| `scripts/patches/combat-ui-behavior-hotfix.js` | Same hook, same fallback, unaffected |
| `scripts/engine/force/force-suite-runtime-repairs.js` | Two hooks, same fallback pattern, unaffected |
| `scripts/engine/combat/features/combat-feature-panel-renderer.js` | `Hooks.on('renderSWSEV2CharacterSheet', ...)`, **no fallback** — updated to also register `renderSWSEV2NpcSheet`/`renderSWSEV2DroidSheet` |
| `scripts/apps/force-tradition/force-tradition-picker.js` | Hook + `constructor.name !== 'SWSEV2CharacterSheet'` check, **no fallback for NPC/Droid** — updated to hook all three render events and to check against a `Set` of all three class names |
| `scripts/patches/follower-npc-sheet-parity-hotfix.js` | Direct `import { SWSEV2CharacterSheet }`, reaches into `.prototype` to patch `_prepareContext`/`_wireNpcConceptSheetEvents` — this is NPC-only behavior, so it needed to move to target `SWSEV2NpcSheet` instead (not just add a fallback) |
| `scripts/sheets/v2/character-sheet-diagnostics.js` | `constructor.name === 'SWSEV2CharacterSheet'` console-debug lookup — widened to match all three class names so the debug helper still finds NPC/Droid sheets |
| `scripts/sheets/v2/contract-enforcer.js` | DOM `form[id^="SWSEV2CharacterSheet"]` selector — checked, has an independent DOM-structure fallback, confirmed safe as-is, no change needed |

Four of the eight needed no change (had actor-type-agnostic fallbacks
already); four needed updates to keep NPC/Droid behavior identical to
before the split. This is the single highest-risk area of the whole phase
and was resolved by direct inspection of each dependent file, not by
inference — confirmed via `grep -rn "SWSEV2CharacterSheet" scripts/ index.js`
after the change, checking every remaining reference makes sense.

---

## 12. Dead-code findings

No dead code was removed as part of this phase (removal was explicitly out
of scope — "Phase 4 is not permission to repair the ~25 existing
dead-handler issues"). The Phase 4A audit's VERIFIED DEAD findings are
recorded here for future reference, not acted on:

- 12 dead/unreachable methods in the original monolith (`_logVisibilityDump`, `_wireStoreSurfaceEvents`, `_buildInventoryModel`, `_buildSkillFallbackTotal`, two Force-card-animation handlers, `_labelForProgressionStep`, `_onSubmitForm_OLD` and its three legacy helper methods) — none were moved or deleted; they remain wherever they landed in the split (mechanically, in whichever file the surrounding code moved to — most in `character-like-sheet.js`) exactly as unreachable as before.
- 13 dead/unreachable imports in the original monolith (`SWSEStore`, `MentorNotesApp`, `AnimationEngine`, `ActionEconomyIntegration`, `PANEL_REGISTRY`, `buildHpViewModel`, `buildDefensesViewModel`, `recordHydrationMutation`, `warnConceptDivergence`, `getWarningsSummary`, and the three `mutation-trace.js` symbols only used by the dead `_onSubmitForm_OLD`) — confirmed still present and still unused post-split; left untouched.
- One newly-dead branch introduced by the split, disclosed rather than hidden: `character-like-sheet.js`'s `_onSubmitForm` still contains `if (this.document?.type === 'vehicle') { return this._onSubmitVehicleActorForm(...); }`, but `_onSubmitVehicleActorForm` no longer lives on that class (it moved to `SWSEV2VehicleSheet`) and this branch is unreachable now that Vehicle actors never instantiate `SWSEV2CharacterLikeSheet` at all — harmless (this method itself is only reachable from the non-vehicle chain to begin with), but noted for a future cleanup pass rather than silently left unremarked.

---

## 13. Structural metrics

| File | Before Phase 4 | After Phase 4 |
|---|---|---|
| `character-sheet.js` | 11,095 (all 4 types) | 31 (Character only, empty subclass) |
| `actor-sheet-base.js` | — (new) | 2,406 |
| `character-like-sheet.js` | — (new) | 7,554 |
| `npc-actor-sheet.js` | — (new) | 391 |
| `droid-actor-sheet.js` | — (new) | 394 |
| `vehicle-actor-sheet.js` | — (new) | 831 |
| **Total sheet-controller lines** | **11,095** | **11,607** |

The ~512-line net growth is expected and accounted for: new file-header
doc comments explaining the architecture and the hook-compat constraint on
each of the 6 files (≈150 lines), the disclosed small pure-function
duplication between `vehicle-actor-sheet.js` and `character-like-sheet.js`
(≈120 lines), the new `_buildNpcConceptAbilitiesContext` hook plumbing on
both `character-like-sheet.js` and `npc-actor-sheet.js` (≈20 lines), and
five droid-only module-level helper functions that moved down with their
callers rather than staying behind as unreferenced code (≈130 lines,
counted once each, not duplicated). No method's internal logic was
rewritten; every move was verified against the pre-move line count and
content by the implementing agents and spot-checked directly against the
actual file contents (class declarations, `DEFAULT_OPTIONS`/`PARTS`
placement, constructor, index.js registration, and all four hook-compat
diffs were read in full, not just trusted from the agent reports).

Import-surface reduction per file (vs. the 125-import monolith all four
types used to load regardless of relevance): `vehicle-actor-sheet.js` loads
21 imports, none of which are Character/NPC/Droid-only subsystems (verified
by the import-boundary contract test); `npc-actor-sheet.js` loads 9,
`droid-actor-sheet.js` loads 5, neither importing the other's or Vehicle's
subsystems; `character-sheet.js` loads exactly 1 (the shared base).
`character-like-sheet.js` still loads the full ~83-import Character/NPC/Droid-shared
set, since none of it was proven safe to split further without duplicating
the shared listener chain (see §2's structural-fact discussion).

Redundant-context-build count: unchanged from Phase 3's closing state — the
`DroidSheetContextBuilder` double-panel-build (Phase 3 §9.3, PROBABLY SAFE —
KEEP DEFERRED) and the two Phase-4A-identified new candidates (follower/minion
context, Combat Actions Context for NPC) are unresolved, deliberately, per
§9.

---

## 14. Runtime follow-up requirements

No live Foundry instance was available for this phase, matching Phase 3's
closing precedent. All verification was static: full-file reads of every
new/changed sheet file (not just agent-report trust), two independent
`node tools/run-rolling-syntax-check.mjs` runs (2,241/2,241 files clean),
two independent `node tools/run-rolling-tests.mjs` runs (128/129 passing,
only the pre-existing `lang/en.json` failure), and a new dedicated contract
test (`tests/phase4-sheet-architecture-contract.test.mjs`) proving
registration, inheritance, template/PARTS, import-boundary, and
no-listener-duplication properties directly against the committed source.

Required before this phase can be closed as "SAFE FOR PHASE 5" without the
"DOCUMENTED RUNTIME FOLLOW-UP" qualifier — an actual live-Foundry smoke test
per §18 of the closure report below. Static analysis proves the code is
wired the same way it was before (same call sites, same guards, same
template references); it cannot prove the runtime `Hooks.callAll` dispatch
Foundry performs at render time still resolves `renderSWSEV2NpcSheet`/
`renderSWSEV2DroidSheet` for the newly-distinct classes exactly as
`renderSWSEV2CharacterSheet` did before (this follows directly from Foundry's
documented convention of deriving the hook name from `this.constructor.name`,
but was not observed executing).

Also flagged for a future pass, not required before Phase 5 (documented
limitations, not blockers): the DroidSheetContextBuilder/buildNpcConceptSheetContext
context-building blocks that remain on the shared layer rather than being
hook-extracted (§9); the two new Phase-4A over-computation candidates
(follower/minion context, Combat Actions Context for NPC) that need template
verification before being treated as safe to skip; the pre-existing
`panelContexts`-read-before-populated sequencing defect (§9); and the ~25
"no handler found" / ~14 dead-handler pre-existing gaps (§8), none of which
this phase touched.
