# V2 Actor Authority + Performance Baseline — Phase 1

**Status:** Phase 1 complete (authority documentation + UI-math cleanup + opt-in
performance instrumentation). No schema migration, no sheet split, no vehicle/
droid derived rewrite — those are explicitly out of scope for this phase.

**Scope discipline:** every finding below was verified against the actual code
on this branch (file:line citations throughout) before anything was changed.
Where the pre-work audit's assumptions didn't match what the code actually
does, this document says so and explains the discrepancy.

---

## 1. Verified architectural findings

| # | Audit assumption | Verified? | Notes |
|---|---|---|---|
| A | `system.attributes` canonical, `system.abilities` compatibility mirror | **Confirmed** | `derived-calculator.js:252-256` states this explicitly in a code comment and the code reads `actor.system.attributes \|\| actor.system.abilities` (attributes preferred). |
| B | Sync mirror → async `computeAll()` → possible second render | **Confirmed** | `base-actor.js` — sync phase in `_performDerivedCalculation` (was L66-106, now instrumented), async phase fire-and-forget from `_computeDerivedAsync` (L115+), coalesced via signature + suppressible via `queueMicrotask`. See §3. |
| C | `DerivedCalculator` cache signature scans/sorts items+effects | **Confirmed** | `derived-calculator.js`, `getActorComputeSignature` (now `_getActorComputeSignatureImpl`) — maps+sorts+joins over `actor.items` and `actor.effects`. |
| D | `ModifierEngine` builds a second, separate cache signature (JSON.stringify + item/effect scan) | **Confirmed** | `scripts/engine/effects/modifiers/ModifierEngine.js`, `_actorModifierSourceSignature` (now `_actorModifierSourceSignatureImpl`) — independent signature, broader field set than DerivedCalculator's, own JSON.stringify of `sourceState`. **Correction to the pre-work audit**: the "ModifierEngine" referenced in the original audit is not part of `scripts/governance/actor-engine/actor-engine.js` — it is a separate class at `scripts/engine/effects/modifiers/ModifierEngine.js`. `ActorEngine` (the mutation authority) does not implement modifier aggregation itself. |
| E | `computeCharacterDerived()` builds presentation data and rescans items repeatedly | **Confirmed** | `scripts/actors/v2/character-actor.js` — 8 distinct item-scanning passes (attacks, feats, talents, Force techniques, Force secrets, maneuvers, actions, inventory) plus identity/skills UI-facing data. See §5. |
| F | `computeVehicleDerived()` calls character-derived then overwrites | **Confirmed, unchanged in Phase 1** | `scripts/actors/v2/vehicle-actor.js:17-24` — calls `computeCharacterDerived(actor, system)` then `buildVehicleDerived(actor, system)` to overwrite defenses/damage/hp/identity. Comment at L18-21 explicitly frames this as intentional: "Build the shared v2 contract first, then stamp vehicle statblock authority over it." Not touched this phase per instructions. |
| G | Droid derived preparation (`ensureDroidSystemsDefaults`) writes primary state during derived calc | **Confirmed** | `scripts/actors/v2/droid-actor.js:18-46`, called from `computeDroidDerived` (L92) before `computeCharacterDerived`. See §6. |
| H | Legacy Handlebars helpers duplicate SWSE rules math | **Confirmed, and larger than the seed list** | `index.js`'s `calculateDamageThreshold`/`getSkillMod`, plus `helpers/handlebars/swse-helpers.js`'s `conditionPenalty`/`isHelpless`/`defenseCalculation`/`skillTotal` — all six were unused (zero template call sites) and have been removed. `forceRerollDice` is used and duplicates math with a documented gap (no synchronous authoritative source to swap onto yet). See §4. |
| I | `SWSEV2CharacterSheet` (~11k lines) registered for all four actor types | **Confirmed** | `index.js:127-138` — one loop registers `SWSEV2CharacterSheet` as `makeDefault: true` for `character`, `droid`, `npc`, `vehicle`. No other `Actors.registerSheet` call exists anywhere in the repo. Not split this phase per instructions — see §8 for the per-type context-build instrumentation added instead. |
| J | `NPCPanelContextBuilder.js` and neighbors are older/possibly-dead code | **Confirmed dead (4 of 5 files); 1 is live** | See §7. |

---

## 2. Actor field authority map

Legend: **SOURCE** (persisted input), **DERIVED** (computed into `system.derived.*`, authority = DerivedCalculator unless noted), **RUNTIME STATE** (in-memory/session, not persisted as a rules input), **UI VIEW MODEL** (sheet-only presentation shape), **LEGACY/COMPAT** (kept for backward reads only), **UNCLEAR** (conflicting evidence, needs Phase 2 follow-up).

### Abilities / attributes
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.attributes.<key>.{base,racial,enhancement,temp}` | SOURCE | chargen/level-up/ActorEngine mutations | `DerivedCalculator.computeAll` | Canonical per explicit code comment, `derived-calculator.js:252-256`. |
| `system.abilities` | LEGACY/COMPAT | historical writers (pre-V2) | `DerivedCalculator.computeAll` as `attributes ?? abilities` fallback; `ModifierEngine._actorModifierSourceSignatureImpl` same fallback | Read-only compatibility mirror. **Recommendation**: stop writing this on newly-created actors (Phase 2); keep the read-fallback until existing actors are migrated. |
| `system.derived.attributes.<key>.{base,racial,enhancement,temp,total,mod}` | DERIVED | `DerivedCalculator.computeAll`, `derived-calculator.js:255-276` | sheets, roll engines | Authoritative totals/mods. |

### HP
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.hp.max` | SOURCE (governed) | **`ActorEngine.recomputeHP()` only** — `actor-engine.js:3780` | everything else | Explicit SSOT comment at `derived-calculator.js:227-228` and `actor-engine.js:617`: "system.hp.max may only be written by ActorEngine.recomputeHP()." |
| `system.hp.value` | SOURCE (governed) | `ActorEngine.applyDamage`/`applyHealing` (`actor-engine.js:1347`, `1519`) | sheets | Player-visible current HP. |
| `system.derived.hp.{base,max,total,value,adjustment}` | DERIVED (mirror-only) | `DerivedCalculator.computeAll`, `derived-calculator.js:304-313` | sheets | Explicitly documented as mirror-only — does not compute, just echoes `system.hp.*`. |
| `system.hull` (vehicle) | SOURCE | vehicle statblock authority | `buildVehicleDerived` | Vehicle-only; see Vehicle section below. |

### Defenses
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.derived.defenses.{fortitude,reflex,will,flatFooted}` | DERIVED | `DerivedCalculator.computeAll` via `DefenseCalculator.calculate()`, `derived-calculator.js:334-409` | sheets | Rich breakdown object (base/adjustment/stateBonus/classBonus/speciesBonus/armorBonus/abilityMod/conditionPenalty etc). |
| Vehicle statblock defense fields (`system.defenses.*` on vehicle actors, if any stored) | UNCLEAR | vehicle statblock import | `buildVehicleDerived` (`vehicle-derived-builder.js:132-137`) overwrites `system.derived.defenses.*` post-hoc | Needs a Phase 2 pass to confirm whether vehicles ever carry a *stored* defenses object distinct from the derived one, or whether `buildVehicleDerived` computes from `system.hull`/size/class inputs only. Flagged UNCLEAR rather than guessed. |

### BAB
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.derived.bab`, `system.derived.babAdjustment` | DERIVED | `DerivedCalculator.computeAll` via `BABCalculator.calculate()`, `derived-calculator.js:236, 316-319` | sheets, attack rolls |

### Skills
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.skills.<key>.{trained,focused,misc,...}` | SOURCE | chargen/level-up | `DerivedCalculator.computeAll` | Player-set inputs. |
| `system.derived.skills` | DERIVED | `DerivedCalculator.computeAll`, `derived-calculator.js:435-778` | sheets, roll engines | Totals + breakdown. |
| `system.derived.skills` (UI list, sorted/humanized) | UI VIEW MODEL | `mirrorSkills()`, `character-actor.js:368+` | character sheet | Builds a `list` of view-model rows (humanized labels) layered on top of the same object — mixes DERIVED and UI VIEW MODEL in one field. Flagged for Phase 2 cleanup (separate `system.derived.skills` mechanical totals from a sheet-only `list` projection). |

### Initiative
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.derived.initiative.{dexModifier,adjustment,total}` | DERIVED | `DerivedCalculator.computeAll`, `derived-calculator.js:283-287` (initial) then `L802-809` (final, modifier-adjusted) | sheets, `SWSEInitiative` |

### Damage Threshold
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.derived.damage.threshold` (character/droid) | DERIVED | `DerivedCalculator.computeAll`, `derived-calculator.js:814-862` | sheets | |
| `system.derived.damageThreshold` (droid statblock override, flat field) | DERIVED (override) | `applyPublishedStatblockDerivedOverrides()`, `droid-actor.js:66-84` | sheets | **Known duplicate representation**: droid statblock mode writes a *different* field name (`system.derived.damageThreshold`, no `.damage.` nesting) than the normal path (`system.derived.damage.threshold`) — the droid file's own comment (L75-77) flags this as deliberate, but it means two different DT field shapes exist depending on droid mode. Documented, not changed this phase. |
| `ThresholdEngine.calculateDamageThreshold(actor)` | DERIVED (alternate authority) | `scripts/engine/combat/threshold-engine.js:171` | combat resolution | A second, JS-callable DT authority used by combat code, distinct from the two derived fields above. Not verified whether it reads `system.derived.damage.threshold` or recomputes independently — **UNCLEAR, Phase 2 follow-up**. |
| `calculateDamageThreshold` (index.js Handlebars helper) | **REMOVED** | — | — | Dead UI math, deleted this phase. See §4. |

### Damage Reduction / Resistances / Immunities
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.derived.damageResistances`, `system.derived.damageImmunities` | DERIVED | `DerivedCalculator.computeAll` via `DamageTypeRules.collectDamageType{Resistances,Immunities}()`, `derived-calculator.js:920-937` | combat resolution, sheets |

### Speed / movement
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.speed.*` / `system.movement.*` | SOURCE | species/chargen | `mirrorX` initial default builder |
| `system.derived.speed.{base,total,walk,adjustment,mode}` | DERIVED | `computeCharacterDerived()`, `character-actor.js:36-45` (defaults) + `ModifierEngine` speed modifiers folded in elsewhere | sheets |

### Condition Track
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.conditionTrack.{current,max,persistent}` | SOURCE (governed) | `ActorEngine.setConditionStep`/`setConditionPersistent` | `SWSEV2BaseActor.getConditionTrackState()` |
| `system.derived.damage.{conditionStep,conditionMax,conditionPersistent,conditionHelpless,conditionPenalty}` | DERIVED | `SWSEV2BaseActor._applyV2ConditionTrackDerived()`, `base-actor.js:323-335` | sheets |

### Force Points / Destiny Points
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.forcePoints.{value,max}` | SOURCE (stored-authoritative) | spend/gain actions; `max` calculated+stored at chargen/level-up/class-change (`scripts/data/force-points.js`) | sheets read directly | **Deliberately not derived** — explicit decision documented at `derived-calculator.js:289-302`: "Force Points and Destiny Points are stored-authoritative, not derived," listing dead fields removed (`derived.forcePoints`, `derived.destinyPoints`, `classBonus`). |
| `system.destinyPoints.{value,max}` | SOURCE (stored-authoritative) | same pattern as Force Points | sheets read directly | Same authority decision as above. |
| `system.forcePointDie` | SOURCE (stored, editable) | player-editable field (`character-sheet.js:876` registers it as a form field) | `PanelContextBuilder.buildResourcesPanel()`, `persistent-header.hbs:192` | **Known duplicate/overlap** (documented, not fixed): this is a *stored string* independent of `ForcePointsService.getScalingDice()/getDieSize()`, which computes dice count/size dynamically from heroic level + feats + ModifierEngine. The template shows both `{{forceRerollDice}}` (level-tier-only helper) and `{{forcePointDie}}` (this stored field) side by side — three different "what die does this actor roll" answers can disagree. Flagged for Phase 2: pick one authority (recommend `ForcePointsService`, precomputed into `system.derived` since it's currently async-only) and retire the other two. |

### XP / progression
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.progression.classLevels`, `.level` | SOURCE | level-up flow, `ActorEngine.applyProgression` (`actor-engine.js:2375`) | `DerivedCalculator._resolveClassLevels()`, BAB/defense calculators |
| `system.derived.heroicLevel`/`nonheroicLevel` | DERIVED | `DerivedCalculator.computeAll` via `getLevelSplit()`, `derived-calculator.js:245-247` | sheets |
| XP derived data | DERIVED | `computeXpDerived()` (`scripts/engine/progression/xp-engine.js`), called from `base-actor.js:102` for non-vehicle types | sheets |

### Attacks
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.derived.attacks.list` | UI VIEW MODEL (mechanically-derived inputs, presentation-shaped output) | `mirrorAttacks()`, `character-actor.js:481-556` | sheets | Builds full display rows (damage formula, range, resources, breakdown strings) from item data + `isAttackItem()`/`isItemEquipped()` classification. This is itself the "sheet reads only derived data" contract working correctly — the concern is where it runs (inside `computeCharacterDerived`, a derived-prep hot path) and how often (once per prepare cycle, unconditionally, even for actor types that don't need it on every field edit). |

### Inventory
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| owned Items (weapon/armor/equipment/consumable/misc/ammo) | SOURCE | item CRUD via `ActorEngine` embedded-doc ops | everything |
| `system.derived.inventory.{weapons,armor,equipment,consumables,misc}` | UI VIEW MODEL | `mirrorInventory()`, `character-actor.js:1118+` | sheets |
| `system.derived.encumbrance.*` | DERIVED | `EncumbranceEngine.calculateEncumbrance()` via `mirrorEncumbrance()`, `character-actor.js:1045-1059` | sheets, skill/speed modifiers |

### Feats / Talents / Force techniques / Force secrets / Starship maneuvers
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| owned Items (feat/talent/maneuver types) | SOURCE | item CRUD | everything |
| `system.derived.{feats,talents,starshipManeuvers}.{list,groups,count}` | UI VIEW MODEL | `mirrorFeats/mirrorTalents/mirrorStarshipManeuvers()`, `character-actor.js` | sheets | As of this phase, these three now read from a shared per-prepare `byType` item index (`scripts/actors/v2/actor-item-index.js`) instead of each independently `.filter()`-ing `actor.items`. See §5. |
| `system.derived.forceTechniques/forceSecrets.{list,count}` | UI VIEW MODEL | `mirrorForceTechniques/mirrorForceSecrets()` via `collectKnownForceTechniques/Secrets()` (`scripts/utils/force-knowledge.js`) | sheets | Delegates its own items/knowledge scan; not folded into the shared index this phase (different collection semantics — "known" техniques/secrets, not raw item-type membership). |

### Droid systems
See §6 for the full field-by-field breakdown of `ensureDroidSystemsDefaults()`. Summary:

| Field | Class | Canonical writer | Notes |
|---|---|---|---|
| `system.droidSystems.*` (degree, size, locomotion, processor, armor, processors[], appendages[], appendageSlots[], sensors[], weapons[], accessories[], credits, buildHistory, stateMode) | SOURCE, **but with no declared schema** | Intended: `DroidBuilderApp`/`StockDroidImporterEngine`/`DroidFactory` at creation. **Actual**: `ensureDroidSystemsDefaults()` (`droid-actor.js:18-46`), called every derived-prep cycle, is the only place that guarantees the full field set exists. | `template.json` has **zero** `droidSystems`/`droidStatus` declarations — confirmed by repo-wide grep. This is a genuine SOURCE-field-established-by-a-DERIVED-phase-function situation; see §6 for why it isn't fixed this phase. |
| `system.droidStatus` | SOURCE | same gap as above | |

### Vehicle crew / weapons / shields / subsystems
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `system.crew` (raw, string or object depending on source) | SOURCE | vehicle statblock/import | `vehicle-context-builder.js:462-467` (`typeof system.crew === 'string' ? ... : JSON.stringify(...)`) | **UNCLEAR/mixed-type field** — the reader itself branches on whether the stored value is a string or an object, suggesting import paths disagree on shape. Flagged for Phase 2. |
| `resolveVehicleCrewStations()` output | DERIVED (presentation) | `vehicle-context-builder.js:696, 790` | crew panel | Computed per sheet-context build, not cached in `system.derived`. |
| `system.weapons` | SOURCE | vehicle statblock/import | `vehicle-context-builder.js:469` (mapped into `weaponMountPanel`) | |
| `system.derived.defenses/damage/hp` (vehicle-overwritten) | DERIVED (vehicle authority) | `buildVehicleDerived()`, `vehicle-derived-builder.js:132-162` | sheets | Overwrites the character-shaped defaults `computeCharacterDerived` already wrote — see Finding F. |
| shields, power, subsystems panel data | DERIVED (presentation, per-render) | `VehicleRulesAdapter.buildAllRuleContexts(actor)` (`character-sheet.js:4454`) feeding `buildVehicleSheetContext()` | vehicle sheet | Built fresh on every `_prepareContext()` call, not cached — see §8. |

### NPC statblock overrides
| Field | Class | Canonical writer | Canonical reader | Notes |
|---|---|---|---|---|
| `npcProfile`/statblock authority fields | UNCLEAR (no single enum found) | various NPC import/statblock paths | `npc-sheet-helpers.js` (live), `NPCPanelContextBuilder.js` (dead — see §7) | The pre-work audit recommended a `calculationMode` enum (`progression`/`statblock`/`follower`/`beast`). No such single enum currently exists; `npc-sheet-helpers.js` instead infers authority contextually (statblock vs. follower vs. derived/canonical/legacy ability sources — confirmed present in the live file per its exported `isNpcStatblockAuthorityPath`/`isQuietNpcSheetPath` helpers). Recommend Phase 2 formalize this into an explicit stored field, matching the droid `droidCalculationMode` precedent that already exists (`droid-mode-adapter.js`). |

### Actor action economy / runtime combat state
| Field | Class | Canonical writer | Canonical reader |
|---|---|---|---|
| `system.derived.actions.{list,map}` | UI VIEW MODEL | `mirrorActions()`, `character-actor.js:693+` | sheets, `useAction()` |
| turn/action-economy state (combat-scoped) | RUNTIME STATE | `ActionEconomyPersistence`/`ActionEngine` (`scripts/engine/combat/action/*`) | combat tracker, sheet |

---

## 3. Derived-data lifecycle (Finding B) — confirmed, not changed

`SWSEV2BaseActor.prepareDerivedData()` (`scripts/actors/v2/base-actor.js`):

1. **Sync phase** (`_performDerivedCalculation`): registers passive abilities, fires the async phase (below) without awaiting it, then synchronously runs `computeCharacterDerived`/`computeNpcDerived`/`computeDroidDerived`/`computeVehicleDerived` (whichever matches `actor.type`) — these build the *entire* `system.derived` tree (defenses defaults, identity, skills list, attacks, feats, talents, actions, inventory, encumbrance) before the authoritative async result can possibly land.
2. **Async phase** (`_computeDerivedAsync`, fire-and-forget from step 1): coalesces via `DerivedCalculator.getActorComputeSignature()` (skips if an identical signature is already in-flight or already applied), awaits `DerivedCalculator.computeAll()`, merges results into `system.derived` **only for fields that actually differ** (`_swseDerivedValuesEqual`, `===` then `JSON.stringify` fallback), and — only if something changed — queues a coalesced/suppressible follow-up render via `queueMicrotask` + `requestSurfaceRender`/`requestShellRender`, gated by a depth-counter/timestamp suppression window (`_swseSuppressAppRefreshDepth`/`_swseSuppressAppRefreshUntil`).

This is a real two-pass lifecycle exactly as the pre-work audit described. It was **not restructured this phase** (that's a Phase 3+ candidate per the instructions). What Phase 1 adds: every stage above is now individually timed (opt-in) and render outcomes are counted — see §9 "How to enable diagnostics" for what each field means and how to read it after a real play session.

---

## 4. UI-side rule math audit (Finding H) — completed, code changed

### Removed (verified zero template call sites, each independently confirmed by grep + two Explore-agent traces)

| Helper | File | Why removed | Authoritative replacement already in use |
|---|---|---|---|
| `calculateDamageThreshold` | `index.js` (Handlebars helper registration) | Zero `{{calculateDamageThreshold ...}}` usages anywhere in `templates/**` | `ThresholdEngine.calculateDamageThreshold()` (`scripts/engine/combat/threshold-engine.js:171`), `scripts/rolls/defenses.js:124` (reads `system.derived.damageThreshold`) |
| `getSkillMod` | `index.js` | Zero usages | `DerivedCalculator` skill totals (`derived-calculator.js:435-778`), `scripts/rolls/skills-reference.js` |
| `conditionPenalty` | `helpers/handlebars/swse-helpers.js` | Zero usages as a *helper call* (`{{derived.damage.conditionPenalty}}` matches found in templates are dotted **data-path** references, not `{{conditionPenalty ...}}` helper invocations) | `scripts/utils/calc-conditions.js`; authoritative value already lives at `system.derived.damage.conditionPenalty` (`base-actor.js:333`) |
| `isHelpless` | `helpers/handlebars/swse-helpers.js` | Zero usages | `system.derived.damage.conditionHelpless` (`base-actor.js:332`) |
| `defenseCalculation` | `helpers/handlebars/swse-helpers.js` | Zero usages; also read a schema path (`actor.system.armor.equipped`/`.reflexBonus`) that doesn't match the canonical armor-resolver contract — likely already stale/broken code | `system.derived.defenses.reflex` |
| `skillTotal` | `helpers/handlebars/swse-helpers.js` | Zero usages | `system.derived.skills` |

All six deletions were verified against the full test suite (`tools/run-rolling-tests.mjs`) and repo-wide syntax check (`tools/run-rolling-syntax-check.mjs`) with zero regressions. A code comment was left at each deletion site pointing to this document.

### Kept, with a documented gap (not fixed this phase)

**`forceRerollDice`** (`helpers/handlebars/swse-helpers.js`) — used once, `templates/partials/actor/persistent-header.hbs:189`. It independently derives the Force Point bonus-dice **count** from level tiers (1d6/2d6/3d6 at levels 1/8/15), while the real authority — `ForcePointsService.getScalingDice()`/`getDieSize()` (`scripts/engine/force/force-points-service.js:198-249`) — also factors in feats and `ModifierEngine` die-size upgrades (e.g. Strong in the Force) and is `async`, so it cannot be called from a synchronous Handlebars helper. No precomputed `system.derived` field for the full Force Point formula exists yet. Per instructions ("do not invent another calculation... document the gap and leave existing behavior intact"), this was left alone. **Recommended Phase 2 fix**: have `DerivedCalculator` mirror `ForcePointsService.getFormulaDisplay()` into `system.derived.forcePointFormula` and repoint the template at that field instead of the helper.

Also newly documented in §2: the `system.forcePointDie` stored field is a *third*, independent answer to "what die does this actor roll," sitting right next to `forceRerollDice`'s output in the same template block (`persistent-header.hbs:187-197`). Not touched this phase; flagged for the same Phase 2 consolidation.

`formatBAB` (`swse-helpers.js`) was reviewed and **kept** even though currently unused — it only formats an already-computed BAB value/array into a display string (no rules math), so it doesn't fall under "UI-side rule math."

---

## 5. Shared ephemeral actor item index (Finding E) — implemented, narrow scope

`computeCharacterDerived()` (`scripts/actors/v2/character-actor.js`) ran 8 independent passes over `actor.items`:

1. `mirrorAttacks` — `(actor.items).filter(isAttackItem)` (custom multi-property classification, not a plain type check)
2. `mirrorFeats` — `.filter(i => i.type === 'feat')`
3. `mirrorTalents` — `.filter(i => i.type === 'talent')`
4. `mirrorForceTechniques` — delegates to `collectKnownForceTechniques(actor)` (different collection semantics — "known" techniques via feat/talent grants, not raw item membership)
5. `mirrorForceSecrets` — delegates to `collectKnownForceSecrets(actor)` (same as above)
6. `mirrorStarshipManeuvers` — `.filter(i => i.type === 'maneuver')`
7. `mirrorActions` — single pass over **all** items checking multiple type/property conditions inline
8. `mirrorInventory` — single pass over **all** items with its own type allowlist

**What changed**: a new dependency-free module, `scripts/actors/v2/actor-item-index.js`, exports `buildActorItemIndex(actor)` — one pass building a `Map<type, Item[]>`. `computeCharacterDerived()` now builds this once per call and passes it into `mirrorFeats`/`mirrorTalents`/`mirrorStarshipManeuvers` (the three call sites whose existing predicate was already an exact `item.type === X` equality check — a behaviorally-identical swap). Each function still falls back to its original `.filter()` call if no index is supplied, so nothing about the function's external contract changed.

**What did NOT change**, per instructions ("do not rewrite weapon classification... if classification semantics differ between callers, preserve their existing logic"):
- `mirrorAttacks` keeps its own `isAttackItem()` scan — not a plain type filter.
- `mirrorActions`/`mirrorInventory` keep their own single-pass-over-everything loops — they already only scan once each, and folding them onto `byType` would require restructuring their internal multi-type branching, which risks changing which items get included.
- `mirrorForceTechniques`/`mirrorForceSecrets` keep their delegated collection calls.

Net effect: 8 passes → 6 passes (2 `.filter()` allocations + 2 array traversals removed per `computeCharacterDerived()` call), with zero behavior change on the three affected fields.

**Tests**: `tests/actor-item-index.test.mjs` — asserts `byType.get(X)` is byte-for-byte equal to `items.filter(i => i.type === X)` for every affected type, handles missing/empty/untyped items, and confirms a type with zero matches returns `undefined` (matching `.filter()`'s empty-array-vs-index-miss semantics via the existing `?? (actor.items).filter(...)` fallback pattern at each call site).

---

## 6. Droid default-mutation audit (Finding G)

`ensureDroidSystemsDefaults(system)` (`scripts/actors/v2/droid-actor.js:18-46`), called as the **first statement** of `computeDroidDerived()` (L92), before `computeCharacterDerived()`:

```
ds.buildHistory ??= []              ds.processor ??= {name,active,slotKey}
ds.degree ??= ''                    ds.armor ??= {name,rating}
ds.size ??= ''                      ds.processors ??= []
ds.stateMode ??= 'NEW'              ds.appendages ??= []
ds.locomotion ??= {name,speed}      ds.appendageSlots ??= [2 default slots]
                                     ds.sensors ??= []
system.droidStatus ??=              ds.weapons ??= []
  {state,source,timestamp,notes}    ds.accessories ??= []
                                     ds.credits ??= {spent,total}
```

**Verified**: `template.json` declares **zero** `droidSystems`/`droidStatus` fields for the `droid` actor type (repo-wide grep, no matches). This is a genuine schema gap, not a redundant safety net — a vanilla Foundry "Create Actor → droid" produces `system.droidSystems === undefined`, and this function is the only thing in the codebase that reliably fills it in.

**Creation-path survey** (why this was NOT migrated this phase):

| Creation path | File | Populates `droidSystems`? | Gaps vs. `ensureDroidSystemsDefaults` |
|---|---|---|---|
| Vanilla Actor.create | `template.json` | No | Everything |
| Droid Builder UI | `scripts/apps/droid-builder-app.js`, `_getInitialDroidSystems` (L49-92) | Partial | Missing `buildHistory` (set later, only in `_onFinalizeDroid`, L719), `processors`, `appendageSlots`, top-level `droidStatus` |
| Stock droid import | `scripts/engine/import/stock-droid-importer-engine.js`, `_buildActorFromStatblock` (L185-237) | Partial, parser-derived | Same gaps as above |
| `DroidFactory` (mutation-plan path) | `scripts/engine/droids/droid-factory.js`, `_buildDroidActorData` (L61-102) | Delegates to the stock importer for stock sources; spreads a bare `actorSystem` for custom sources with **no** `droidSystems` field at all | Everything, for genuinely custom droids |

**Conclusion**: moving these defaults to creation time is not a zero-ambiguity change — it requires touching `template.json` plus at least three separate creation call sites, and none of them currently agree on which fields they're responsible for. Per the instruction to only move defaults "with zero behavior ambiguity and tests prove parity," this was left in place. The `??=` pattern makes it idempotent and non-destructive (never overwrites an existing value), so it is not actively harmful — it's a boundary violation (derived-prep writing primary state) but not a correctness bug today, since prepared-data mutations are in-memory only (`actor.system` during `prepareDerivedData`) and are not themselves persisted to the database unless a caller separately issues an `actor.update()`.

**Recommended Phase 2 fix**: add the full field set to `template.json`'s droid schema (so every droid actor has a complete, self-describing shape from creation), then update all three creation paths to populate the now-complete schema, and only then remove `ensureDroidSystemsDefaults()`'s call from the derived-prep path (keeping it, if desired, as a one-time migration helper instead).

---

## 7. NPC old-code reference audit (Finding J)

| File | Lines | Live import found? | Verdict |
|---|---|---|---|
| `scripts/sheets/v2/npc/NPCPanelContextBuilder.js` | 317 | None (repo-wide, including templates/tests/index.js) | **VERIFIED DEAD** |
| `scripts/sheets/v2/npc/NPCPanelValidators.js` | 284 | None | **VERIFIED DEAD** |
| `scripts/sheets/v2/npc/NPCPanelVisibilityManager.js` | 90 | None | **VERIFIED DEAD** |
| `scripts/sheets/v2/npc/PANEL_REGISTRY.js` | 202 | None (its own header comment self-references only; a **different**, live `PANEL_REGISTRY.js` exists at `scripts/sheets/v2/context/PANEL_REGISTRY.js`, imported by `character-sheet.js:62` — do not confuse the two) | **VERIFIED DEAD** |
| `scripts/sheets/v2/npc/npc-sheet-helpers.js` | 1240 | `character-sheet.js:70` imports `buildNpcConceptAbilities`, `buildNpcConceptSheetContext`, `isNpcSheetWritablePath`, `isNpcStatblockAuthorityPath`, `isQuietNpcSheetPath`; also referenced by `tests/dsp-engine-consolidation.test.mjs` and `tests/dsp-migration-consolidation.test.mjs` | **LIVE** |

Not deleted this phase (instructions: audit and classify, don't remove without explicit follow-up). **Recommendation**: a dedicated Phase 2 (or immediate follow-up) PR can safely delete the four VERIFIED DEAD files — the evidence is a clean repo-wide reference search with no dynamic-registration mechanism found (no string-based dynamic `import()` of these filenames was found either).

---

## 8. Vehicle / Droid / NPC context performance baseline (structural findings)

No live Foundry runtime is available in this environment to capture wall-clock numbers (see §9's honesty note). The structural findings below are exact pass/allocation counts read directly from the code, which is what determines the *shape* of the cost even before real timings are collected.

### Droid — `DroidSheetContextBuilder.build()` (`scripts/sheets/v2/droid-sheet/context-builder.js`)

At least **12 separate scans/filters of `actor.items`** inside one `build()` call (L185, 272, 276, 280, 489-490, 553, 677, 718, 738, 757, 774, 1198), each routed through `asItemArray()` (itself a multi-branch type-sniffing helper). Concretely:
- L185 projects **every** owned item via `projectItem()` (a non-trivial per-item transform — resolves armor data, weapon profiles, equipped/integrated state).
- L272/276/280 then **re-filter and re-project** the equipment/armor/weapon subsets of those same items — meaning armor, weapon, and equipment items each go through `projectItem()` **twice** per sheet render.

This is the concrete evidence behind the audit's "one cached `DroidItemIndex` can serve all of them" recommendation. Not implemented this phase (would touch weapon/equipment/armor classification semantics across 12 call sites — out of the "trivially equivalent only" bar set for §5's item index). Instrumented instead: `SWSE.debug.performance.summary().sheetContext.droid` now reports real wall-clock time for the whole `build()` call per render (see §9), giving before/after evidence once Phase 2 attempts this consolidation.

### Vehicle — `buildVehicleSheetContext()` (`scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js:1198-1300`)

Confirmed: **15 panel builders run unconditionally on every `_prepareContext()` call**, regardless of which tab is active — `headerSummaryPanel`, `defensesPanel`, `hpConditionPanel`, `weaponMountPanel`, `crewSummaryPanel`, `crewAssignmentPanel`, `customStationEditorPanel`, `subsystemDetailPanel`, `shieldManagementPanel`, `powerSummaryPanel`, `cargoSummaryPanel`, `cargoManifestPanel`, `abilitiesPanel`, `pilotManeuverPanel`, `commanderOrderPanel`, `turnPhasePanel` (L1213-1230) — then grouped into 5 tab buckets (`overview`/`weapons`/`crew`/`systems`/`cargo`, L1269-1297) **after** all 15 already ran. A player looking at the Overview tab pays for building the crew-assignment editor, the shield-zone manager, and the full cargo manifest on every render.

Not implemented this phase (explicitly deferred — "Do not implement tab-level lazy context construction yet unless there is already a framework intended for it"; no such framework was found). Instrumented instead: the entire `buildVehicleSheetContext()` call is now timed as one unit (`SWSE.debug.performance.summary().sheetContext.vehicle`).

### NPC — `buildNpcConceptSheetContext()` (`scripts/sheets/v2/npc/npc-sheet-helpers.js`)

Only 2 direct `actor.items` references in this file (far lighter than droid) — it mostly consumes `derived`/`conceptLayout` data that the shared `buildConceptSheetViewModel()` call already built upstream (see §3/Finding I — NPCs share the same universal concept-layout pass as characters and droids). The NPC-specific cost is concentrated in statblock-authority resolution (`isNpcStatblockAuthorityPath`, `isQuietNpcSheetPath`) and skill/combat-action normalization, not repeated item scanning. Instrumented as its own bucket (`SWSE.debug.performance.summary().sheetContext.npc`) so it can be compared against the shared `character`-labeled concept-layout cost it depends on.

**Phase 2 recommendation** (evidence-based, not yet implemented): tab-scoped lazy panel construction is the highest-leverage next step for Vehicle specifically (15 panels → build the always-visible strip + active tab's panels only); for Droid, collapse the 12 scans onto one cached `DroidItemIndex` mirroring `actor-item-index.js`'s pattern but scoped to the droid builder's own classification needs (armor/weapon/equipment projections differ from the character sheet's, so this is a new index, not a reuse of `actor-item-index.js`).

---

## 9. Performance instrumentation

### What was added

A new module, `scripts/utils/actor-perf-diagnostics.js` (`ActorPerfDiagnostics`), reusing the **existing** `SWSEPerf`/`isPerformanceDiagnosticsEnabled()` gate (`scripts/utils/performance-utils.js`, already wired to the `performanceDiagnostics`/`debugMode` client settings — `scripts/core/settings.js:54-61`) and following the same shape as the pre-existing `HookPerformanceMonitor` (`scripts/utils/hook-performance.js`) and the progression-framework render-stats module (`scripts/apps/progression-framework/debug/progression-render-stats.js`). **No new profiler, cache, or telemetry system was introduced** — this is aggregation counters behind the settings gate that already existed.

Instrumented, all opt-in and near-zero-cost when disabled (every `record*` method's first line is the settings-boolean check; nothing else runs when it's off):

| Metric | Where wired | What it measures |
|---|---|---|
| Sync mirror-pass duration | `base-actor.js`, `_performDerivedCalculation` | Time spent building `system.derived` synchronously (identity/skills/attacks/feats/talents/actions/inventory/encumbrance) |
| Async `DerivedCalculator.computeAll()` duration | `base-actor.js`, `_computeDerivedAsync` | Time for the authoritative async pass, per actor |
| DerivedCalculator cache hit/miss/in-flight-join counts | `derived-calculator.js`, `computeAll()` | How often the 120-entry LRU cache actually saves a recompute |
| DerivedCalculator signature-generation cost | `derived-calculator.js`, `getActorComputeSignature` | Cost of the item/effect scan-sort-join that produces the cache key itself |
| ModifierEngine cache hit/miss, split by source/aggregate/breakdown cache | `ModifierEngine.js`, `getAllModifiers`/`aggregateAll`/`buildModifierBreakdown` | Same question for ModifierEngine's three independent caches |
| ModifierEngine signature-generation cost | `ModifierEngine.js`, `_actorModifierSourceSignature` | Cost of its (separate, broader) item/effect scan + `JSON.stringify` |
| Sheet context-build duration, per actor type | `character-sheet.js` — 4 call sites: droid (`DroidSheetContextBuilder.build()`), universal concept layout (`buildConceptSheetViewModel`, labeled by `actor.type`), NPC (`buildNpcConceptSheetContext`), vehicle (`buildVehicleSheetContext`) | Direct evidence for §8 |
| Async-derived follow-up renders: queued / suppressed / skipped-no-change | `base-actor.js`, `_computeDerivedAsync` | Answers "how many renders does one actor mutation actually cause, and how many does the existing suppression window catch" |

### How to enable and use it

1. Client setting **Performance Diagnostics** (`game.settings.get('foundryvtt-swse', 'performanceDiagnostics')`) — already existed, now actually has data behind it for actor/derived/modifier/sheet-context timing (previously only sheet/progression-builder log lines used it).
2. Console commands (registered at `init`, `index.js`):
   - `SWSE.debug.performance.actor(actor)` — per-actor sync/async prepare timing (count/avg/max + last duration).
   - `SWSE.debug.performance.summary()` — global snapshot: DerivedCalculator cache hit ratio + signature cost, ModifierEngine's three caches + signature cost, per-type sheet-context build stats, render queued/suppressed/skipped counts.
   - `SWSE.debug.performance.reset()` — clears all counters.

### Honesty note on measurements

This environment has no live Foundry client/browser — there is no way to actually open a character/NPC/droid/vehicle sheet and capture real wall-clock numbers here. **No before/after performance numbers are claimed in this document that were not either (a) directly read from the code as pass/allocation counts, or (b) explicitly marked as pending real measurement.** The instrumentation above is real, wired into the real hot paths, and ready to use — a maintainer with a running world should enable `performanceDiagnostics`, open each of the four sheet types a few times, exercise a mutation (edit a field, deal damage) and then run `SWSE.debug.performance.summary()` to get the first real baseline. That baseline is what Phase 3's revision-based cache invalidation work should be justified against.

---

## 10. Test results

- `node tools/run-rolling-syntax-check.mjs` — all discovered source files (2221 at time of writing) pass `node --check`, including every file touched this phase.
- `node tools/run-rolling-tests.mjs` — 114 passed, 1 failed, of 115 run (5 pre-existing Force-power-track exclusions unrelated to this work). The 1 failure (`progression-suggestion-and-render-contracts.test.mjs`, `lang/en.json is missing the announced form of Select`) was verified via `git stash` to fail identically on the base branch with none of this phase's changes applied — **confirmed pre-existing, not a regression**.
- New tests added this phase:
  - `tests/actor-item-index.test.mjs` — locks in `buildActorItemIndex()`'s grouping contract, including byte-for-byte parity with the `.filter(i => i.type === X)` calls it replaced.
  - `tests/perf-agg.test.mjs` — locks in the pure aggregation math (`freshAgg`/`recordAgg`/`aggSummary`) behind the new performance instrumentation, and confirms by construction (argument-count assertions) that none of these helpers accept or could mutate an actor/document reference.
- **Coverage caveat**: `scripts/utils/actor-perf-diagnostics.js` itself, and the instrumentation call sites in `base-actor.js`/`derived-calculator.js`/`ModifierEngine.js`/`character-sheet.js`, are **not** exercised by the Node test suite — those files (like most of the actor/sheet/engine stack) use Foundry-only absolute `/systems/foundryvtt-swse/...` imports and cannot be imported under plain Node, the same documented limitation behind this repo's 5 pre-existing Force-power-track test exclusions. They were verified by direct code review, `node --check` syntax validation, and the fact that the full rolling-system test suite (which exercises `character-actor.js`'s callers indirectly through other passing tests) shows zero behavioral regressions.

---

## 11. Dead/transitional code — final classification

**VERIFIED DEAD** (safe to remove in a follow-up PR):
- `scripts/sheets/v2/npc/NPCPanelContextBuilder.js`
- `scripts/sheets/v2/npc/NPCPanelValidators.js`
- `scripts/sheets/v2/npc/NPCPanelVisibilityManager.js`
- `scripts/sheets/v2/npc/PANEL_REGISTRY.js` (not to be confused with the live `scripts/sheets/v2/context/PANEL_REGISTRY.js`)
- `index.js`'s `calculateDamageThreshold`/`getSkillMod` Handlebars helpers — **removed this phase**
- `swse-helpers.js`'s `conditionPenalty`/`isHelpless`/`defenseCalculation`/`skillTotal` — **removed this phase**

**LIKELY DEAD / REQUIRES FOLLOW-UP** (not touched — needs a dedicated look):
- `system.forcePointDie` stored field vs. `forceRerollDice` helper vs. `ForcePointsService` — three overlapping "Force Point die" answers; likely two of the three should be retired once Phase 2 picks one authority.
- Vehicle `system.crew` mixed string/object shape (`vehicle-context-builder.js:462-467`) — the reader's own type-branching suggests at least one import path writes a shape the others don't expect.

**LIVE** (confirmed real usage, do not remove):
- `scripts/sheets/v2/npc/npc-sheet-helpers.js`
- `forceRerollDice`, `formatBAB` (`swse-helpers.js`)
- `NPCPanelContextBuilder.js`'s sibling live file `scripts/sheets/v2/context/PANEL_REGISTRY.js`

---

## 12. Recommended Phase 2 work (evidence-driven)

In priority order, based on what this phase's audit actually found (not a re-statement of the original wishlist):

1. **Delete the 4 VERIFIED DEAD NPC panel files** (§7) — zero-risk, immediate.
2. **Pick one Force Point die authority** (§2, §4) — collapse `forceRerollDice`, `system.forcePointDie`, and `ForcePointsService.getFormulaDisplay()` into one precomputed `system.derived` field.
3. **Droid schema + creation-path consolidation** (§6) — add the full `droidSystems`/`droidStatus` shape to `template.json`, then update the three creation paths (`DroidBuilderApp`, `StockDroidImporterEngine`, `DroidFactory`) to populate it, only then retire `ensureDroidSystemsDefaults()`'s call from the derived-prep hot path.
4. **Vehicle crew field shape** (§2) — resolve the string-vs-object `system.crew` ambiguity found in `vehicle-context-builder.js`.
5. **Collect a real performance baseline** using the instrumentation added this phase (§9), then decide whether revision-counter-based cache invalidation (replacing the item/effect scan-sort-join signatures in DerivedCalculator and ModifierEngine) is actually justified by the numbers — the original audit's Phase 3 proposal, now falsifiable instead of assumed.
6. **Vehicle tab-scoped lazy panel construction** (§8) — the highest-count structural finding (15 unconditional panel builds per render); do this only after step 5's baseline confirms it matters at real interaction latencies.
7. **Droid item-index consolidation** (§8) — a droid-specific `DroidItemIndex` (not a reuse of `actor-item-index.js`, since armor/weapon/equipment projection semantics differ) to collapse the 12 scans in `DroidSheetContextBuilder.build()`.
8. **NPC `calculationMode` enum** (§2) — formalize NPC statblock/progression/follower/beast authority into an explicit stored field, matching the `droidCalculationMode` precedent that already exists and works.
9. Only after 1-8: revisit `system.abilities` retirement, the giant `character-sheet.js` split, and the `computeVehicleDerived()` character-derived-then-overwrite pattern — all three are real, but none of them are blocked on anything in this list, and all three are large enough to deserve their own dedicated, single-purpose PRs per the "surgical changes" principle this phase followed.
