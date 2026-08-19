# Phase 2 — Actor Data-Model Authority Normalization

**Status:** Phase 2 initial pass (§1-12 below) was reviewed and found
incomplete against its own brief — see §13 "Phase 2B — Authority
Normalization Closure" for the closure pass that completes the analysis
this document originally claimed was done. **Read §13 first**; §1-12 are
preserved unmodified below as the historical record of the initial pass and
remain individually accurate, but §13.0's status taxonomy supersedes any
place where §1-12 implied a subtype's field-authority table was complete
when it only covered the fields investigated at the time. §13.12 carries
the current, authoritative completion verdict for Phase 2 as a whole.

Builds on the merged Phase 1 baseline
(`docs/audits/v2-actor-authority-performance-phase-1.md`). No schema
migration to Foundry TypeDataModels, no sheet redesign, no
`SWSEV2CharacterSheet` split, no `DerivedCalculator`/`ModifierEngine`
rewrite, no lazy-tab context, no revision-counter caching — all explicitly
out of scope per the Phase 2 brief.

**Scope discipline note, stated up front because it shaped every decision
below:** the brief's own closing guidance was "the main thing I would
police in this phase is Claude trying to make every actor type look
structurally identical — Character, NPC, Droid, and Vehicle can have
different source schemas; what needs to become uniform is the authority
contract, not necessarily the JSON shape." This phase followed that
literally: several areas that looked at first like they needed a schema
unification (droid `droidSystems`, vehicle `crew`/`hp`/`hull`, NPC
statblock overrides) turned out, on investigation, to already have working
subtype-specific authority — the actual gap was inconsistent *consumption*
of that authority (stale reads, an async pass silently overwriting a
sync-computed value, a numeric parser that only handled one of four live
shapes), not a missing unified schema. Where a real schema gap existed
(droid's six divergent creation-time shapes with genuine field-shape
conflicts), this phase documents it in full rather than forcing a risky
unification without a live client to verify against.

## Implementation map (produced before editing, per the brief)

1. Re-read the Phase 1 audit doc; verify its recommendations still hold on
   the merged baseline.
2. Six parallel research passes: attributes/abilities writers, NPC
   calculation-mode signals, droid creation-path schema gap (re-audit),
   defense/HP/hull/DT/DR authority, movement/speed + vehicle crew shape,
   scattered fallback-chain catalog.
3. Triage findings into SAFE-TO-FIX (proven bug or brief-mandated, narrow
   blast radius, verifiable) vs. DOCUMENT-ONLY (real complexity that would
   need a live Foundry client or a much larger, riskier change to resolve
   safely).
4. Implement only the SAFE-TO-FIX set, each with a focused test proving
   the fix and disproving regression on adjacent actor types.
5. Write this document; re-run the full test suite.

---

## 1. Phase 2 summary — what source-authority ambiguity was removed

| # | Area | What changed |
|---|---|---|
| 1 | NPC calculation authority | Added `resolveNpcCalculationMode(actor)` / `isNpcCalculationMode(actor, mode)` (`scripts/actors/npc/npc-mode-adapter.js`) — one explicit `'progression' \| 'statblock' \| 'follower'` enum, consolidating the existing `kind`/`mode`/`sourceAuthority` inference this file already performed. Explicit-field-wins (checks `system.npcProfile.calculationMode` first), matching the `droidCalculationMode` precedent's priority order. Stamped at import time by `npc-template-importer-engine.js` for newly-imported NPCs. |
| 2 | NPC follower detection duplication | `isFollowerNpcActor()` (`npc-sheet-helpers.js`) now trusts the already-canonical `context.isFollowerNpc` (computed once per sheet-context build by `NpcProfileBuilder.buildContext()`, itself backed by `npc-mode-adapter.js`) when available, instead of always re-deriving from a 6-signal OR-chain. The legacy chain remains as the fallback for callers without that context — no detection capability was removed. |
| 3 | `system.abilities` authority | Corrected a materially inaccurate code comment in `actor-engine.js` claiming `DerivedCalculator` "rebuilds" `system.abilities` on every `prepareDerivedData()` — verified false; the *only* live writer of `system.abilities` values anywhere in the codebase is `_ensureCanonicalAbilityShapes`'s shape-only backfill (no value authority). Documented, not code-migrated further — see §11 for why. |
| 4 | Vehicle HP/hull | `coerceVehicleHp()` (`vehicle-derived-builder.js`) now prefers `system.hp` over `system.hull` — fixes a proven bug where a vehicle's displayed HP silently stopped reflecting combat damage the moment it took any, for every vehicle carrying a legacy `system.hull` mirror (damage only ever writes `system.hp.value`; `system.hull` is a one-time import-time snapshot). |
| 5 | Vehicle damage threshold | `buildVehicleDerived()` now also writes the flat `system.derived.damageThreshold` path (previously only the nested `system.derived.damage.threshold` path), and `DerivedCalculator.computeAll()` now skips its generic character-scale DT formula for vehicle actors entirely. Fixes a proven bug where combat-facing DT readers (`ThresholdEngine`, `rolls/defenses.js`) could read a different, wrong (character-formula) DT than what the vehicle sheet displayed. |
| 6 | Vehicle crew count | `resolveVehicleCrewStations()`'s internal `numberOrNull()` (`crew-resolver.js`) now correctly parses all four live shapes of `system.crew` (Array/String/Number/Object) instead of only Number/Array — fixes a proven bug where `facts.largeCrew`/`facts.multiCrew` silently read as "small crew" for any compendium-imported or import-normalized vehicle (the two most common real-world shapes). |
| 7 | Droid source initialization | Investigated in depth (six creation-time shapes, not the three Phase 1 found, several with real field-shape conflicts). **Not migrated** — see §6 for the full evidence and why moving `ensureDroidSystemsDefaults()` out of derived-prep is not safe to do without a live client this phase. |

---

## 2. Field authority table

Legend: **SOURCE** (persisted input) / **DERIVED** (computed) / **RUNTIME** (session state) / **COMPAT** (legacy mirror, not independently writable) / **UNCLEAR** (real, evidenced ambiguity, not resolved this phase).

### Character

| Field/Concept | Source | Derived | Runtime | Compatibility |
|---|---|---|---|---|
| Attributes | `system.attributes.<key>.{base,racial,enhancement,temp}` | `system.derived.attributes.<key>.{total,mod}` (DerivedCalculator) | — | `system.abilities` (shape-backfilled only, no live value-writer — confirmed this phase) |
| HP | `system.hp.max` (ActorEngine.recomputeHP sole writer), `system.hp.value` (ActorEngine.applyDamage/applyHealing) | `system.derived.hp.*` (mirror-only) | — | — |
| Defenses | — (no character-specific stored input beyond attributes/level/class/feats) | `system.derived.defenses.{fortitude,reflex,will,flatFooted}` (DefenseCalculator, one universal formula, no type branch except a droid-only Fortitude-ability override) | — | — |
| DT | — | `system.derived.damageThreshold` (flat) — DerivedCalculator, Fortitude/Will total + size + feat/modifier adjustments | — | `system.derived.damage.threshold` (nested) exists only as a placeholder default (`character-actor.js`) that is never actually overwritten by DerivedCalculator for character/npc/droid — a real, confirmed-inert duplicate field (see §9) |
| DR | `system.damageReduction` (flat, base template, default 0) | `system.derived.damageReduction.*` — confirmed dead (zero write sites found repo-wide) | — | typed `system.derived.damageResistances`/`damageImmunities` are a separate, real mechanism (DamageTypeRules), not a numeric DR |
| Movement | `system.speed` (base template, default 6) | `system.derived.speed.{base,total,walk,adjustment,mode}` (`computeCharacterDerived`, walk-mode only) | — | `system.speciesMovement` (climb/fly/swim/hover/glide/burrow) is written by species application but **never consumed anywhere** — confirmed dead field, real capability data with no mechanical effect |

### NPC

| Field/Concept | Source | Derived | Runtime | Compatibility |
|---|---|---|---|---|
| Calculation mode | `system.npcProfile.calculationMode` (explicit, Phase 2) | `resolveNpcCalculationMode(actor)` (inferred fallback: kind/mode/sourceAuthority via `npc-mode-adapter.js`) | — | legacy signals (`system.isFollower`, `flags.swse.follower.*`, etc.) still read by `isFollowerNpcActor()`'s fallback chain |
| Defenses/HP/DT | identical to Character — `computeNpcDerived()` is a pure pass-through to `computeCharacterDerived()` | same as Character | — | **No statblock override exists at the derived-computation layer** — unlike droid, an NPC in statblock mode still gets defenses/HP/DT freshly computed every render, not overridden from imported values (see §7) |
| Damage threshold display | `system.npcStatblock.*`, `system.damageThreshold` (imported statblock fields) | same flat/nested split as Character | — | `npc-sheet-helpers.js`'s `preferStatblockAuthority`-gated reader — verified this phase to be correctly wired (not dead code, despite looking suspicious) |
| Follower | `system.npcProfile.kind === 'follower'` / `flags.swse.follower.*` | Followers use `buildFollowerDefenseValues()` — a **materially different defense formula**, computed in the sheet/view-model layer, bypassing `DefenseCalculator` entirely | Owner-heroic-level-derived scaling (`getFollowerSheetLevel`) | — |
| Beast | `flags.swse.beastData` / `system.beastData` | **No distinct derived-computation path.** Beast mechanics (`BeastSubtypeAdapter`) only run during chargen/progression sessions | — | On the sheet, beast is a display/tab-visibility concept only |

### Droid

| Field/Concept | Source | Derived | Runtime | Compatibility |
|---|---|---|---|---|
| Calculation mode | `system.droidCalculationMode` (explicit) | `resolveDroidCalculationMode()` (`droid-mode-adapter.js`) | — | `flags.swse.stockDroidImport.importMode` (legacy inference) |
| `droidSystems.*` | **Unresolved — six divergent creation-time shapes, see §6** | — | — | `ensureDroidSystemsDefaults()` remains the only universal safety net |
| Defenses/HP/DT | Statblock mode: `flags.swse.stockDroidImport.publishedTotals.*`; playable mode: same as Character (droid gets a Fortitude-uses-STR override in DefenseCalculator) | `applyPublishedStatblockDerivedOverrides()` overrides `system.derived.{defenses,bab,damageThreshold,initiative}` for statblock-mode droids only | — | — |
| Movement | Same base-template `system.speed` as Character (droids share `computeCharacterDerived`) | Same `system.derived.speed` shape | — | — |

### Vehicle

| Field/Concept | Source | Derived | Runtime | Compatibility |
|---|---|---|---|---|
| HP | `system.hp.{value,max}` (canonical — the only field `template.json`'s vehicle schema declares; sole write target of `ActorEngine.applyDamage`) | `system.derived.hp.*` via `coerceVehicleHp()` — **now prefers `system.hp`** (Phase 2 fix) | — | `system.hull` — import-time mirror only, never updated after creation, read as a fallback only when `system.hp` is entirely absent |
| Defenses | `system.reflexDefense`/`fortitudeDefense`/`willDefense`/`flatFooted` (flat, statblock-style stored fields) or `system.defenses.*` | `buildVehicleDerived()` overwrites `system.derived.defenses.*` after `computeCharacterDerived()` runs (Finding F from Phase 1, unchanged this phase) | — | — |
| DT | `system.damageThreshold` / `system.threshold` | `system.derived.damage.threshold` (nested) **and now also** `system.derived.damageThreshold` (flat — Phase 2 fix) | — | — |
| DR | `system.damageReduction` / `system.damageReductionValue` | `system.derived.damage.reduction` | — | — |
| SR (shields) | `system.shields.{value,max}` / legacy `system.shieldRating`/`system.currentSR`/`system.sr` | `resolveVehicleShieldState()` — self-contained fallback chain, **confirmed this phase to be already correct as-is**: `system.derived.shield` is a *character/NPC-only* projection (`derived-calculator.js` explicitly skips it for vehicles — "Vehicles keep their own shield handling and are not projected here"), so there is no missing canonical layer for vehicle SR to defer to | — | — |
| Speed/movement | `system.speed` plus up to 9 other ad-hoc, undeclared properties (`starshipSpeed`, `characterScaleSpeedLabel`, etc.) read by `parseVehicleSpeed()` | Re-parsed from raw source on every sheet render, not cached (Phase 1 finding, unchanged) — **two independent parsers exist** (`parseVehicleSpeed()` in the context builder, `parseVehicleSpeedText()` in `movement-normalizer.js`), not consolidated this phase | — | — |
| Crew | `system.crew` — **four live shapes**: Array (schema default), String (compendium import), Number (shipyard-built), Object (import-normalized) | `resolveVehicleCrewStations()` — **crew-count parsing now shape-independent** (Phase 2 fix); occupancy/assignment already fully normalized via `system.crewPositions` (unrelated to the `system.crew` count field, unaffected) | `system.crewPositions.<station>` (live occupancy, via `VehicleCrewAssignmentService`) | `system.crewQuality` vs `system.crew.quality` — resolved in *opposite* preference order at two different lines of the same file (`vehicle-context-builder.js:743` vs `:464`) — found, not fixed (§11) |

---

## 3. Exact files changed

**Production code:**
- `scripts/actors/npc/npc-mode-adapter.js` — added `resolveNpcCalculationMode()`, `isNpcCalculationMode()`.
- `scripts/sheets/v2/npc/npc-sheet-helpers.js` — `isFollowerNpcActor()` now prefers `context.isFollowerNpc`.
- `scripts/engine/import/npc-template-importer-engine.js` — `buildImportProfile()` now stamps `calculationMode: 'statblock'` at import time.
- `scripts/governance/actor-engine/actor-engine.js` — corrected an inaccurate comment about `system.abilities` authority (no behavior change).
- `scripts/actors/v2/vehicle-derived-builder.js` — `coerceVehicleHp()` priority flip (hp-first); `buildVehicleDerived()` now also writes the flat DT field.
- `scripts/actors/derived/derived-calculator.js` — the generic character-scale DT block now skips vehicle actors.
- `scripts/sheets/v2/vehicle-sheet/crew-resolver.js` — `numberOrNull()` now handles String/Object/Array/Number shapes.

**New tests:**
- `tests/npc-mode-adapter.test.mjs`
- `tests/vehicle-hp-hull-dt-authority.test.mjs`
- `tests/vehicle-crew-count-shape-parity.test.mjs` (runtime-verified via the Foundry-shim harness)
- `tests/derived-calculator-vehicle-dt-skip.test.mjs` (runtime-verified via the Foundry-shim harness)

**New documentation:** this file.

---

## 4. Exact data-model behavior changes

Distinguishing new vs. legacy vs. derived behavior precisely, since the brief asked for this explicitly:

- **New actor behavior**: NPCs imported through `npc-template-importer-engine.js` from this point forward carry an explicit `system.npcProfile.calculationMode: 'statblock'`. Vehicles that take combat damage now display HP that reflects that damage even if they also carry a legacy `system.hull` object (previously: displayed HP could silently freeze at the pre-damage value). Vehicle-specific DT now reaches combat resolution correctly instead of being silently overwritten by a character-formula computation.
- **Legacy/compatibility behavior preserved unchanged**: `system.abilities` read-fallback semantics (multiple tests depend on actors that populate `system.abilities` only, with no `system.attributes` — all still pass, unmodified). `isFollowerNpcActor()`'s full legacy 6-signal chain is untouched and still runs whenever the canonical context value isn't available. Existing droid statblock/playable behavior is completely unmodified. Existing vehicles without a `system.hull` object see zero behavior change (they only ever had `system.hp` to read anyway).
- **Derived-calculation behavior changes**: exactly two, both vehicle-only and both proven-bug fixes: (1) `system.derived.hp.*` now sources from `system.hp` instead of `system.hull` when both are present; (2) `system.derived.damageThreshold` (flat) is no longer computed by the generic character formula for vehicle actors, and instead mirrors `buildVehicleDerived()`'s vehicle-specific value. **No character, NPC, or droid derived-calculation output changed.**

---

## 5. Fallbacks removed or centralized

| Fallback | Where | Outcome |
|---|---|---|
| NPC follower 6-signal OR-chain | `npc-sheet-helpers.js`'s `isFollowerNpcActor()` | Centralized: canonical value checked first, legacy chain kept as complete fallback (not removed — see §2 in the verification notes below for why a *full* removal would have been unsafe) |
| Vehicle crew-count numeric coercion | `crew-resolver.js`'s `numberOrNull()` | Extended to cover all 4 known shapes instead of silently failing on 2 of them |
| Vehicle DT flat vs. nested field split | `derived-calculator.js` + `vehicle-derived-builder.js` | Vehicle's nested (correct) value now also populates the flat field combat code actually reads, instead of the flat field being independently (and wrongly) computed |
| Vehicle HP hull-vs-hp priority | `vehicle-derived-builder.js`'s `coerceVehicleHp()` | Reordered to match the field ActorEngine actually keeps live |

**Found but explicitly NOT touched this phase** (documented, not fixed — see §11 for why each):
- The ~45 scattered `attributes ?? abilities` container-fallback call sites across progression/suggestion/force-rule engines (only the misleading comment describing their authority was corrected).
- 5 byte-identical `abilityMod(actor, key)` helper duplicates across Force-talent-tree action files (Force Adept, Sith, Consular, Jedi Prestige, Sentinel) — real duplication, but touching actual ability-modifier resolution across 5 separate combat-facing talent trees without a live client to verify was judged too high-risk for this pass.
- Speed/movement's 4-5 near-duplicate multi-way fallback chains (`character-actor.js`, `PanelContextBuilder.js`, droid `context-builder.js`) — real duplication, likely safely simplifiable (derived data is guaranteed populated by the time these run), but deferred given the number of files and the value of spending the verification budget on proven bugs (vehicle HP/DT/crew) instead.
- NPC damage-threshold's 6-way/4-way literal-reordering chains — **investigated closely this phase and confirmed NOT broken** (the mode-preference wiring works correctly via `NpcProfileBuilder.buildContext()`); a pure style refactor was judged not worth the risk of subtly changing evaluation order for zero functional gain.
- Defense-total key-naming inconsistency (`ref` vs `reflex`) between droid and vehicle sheet readers — vehicle's version was found to already write both keys defensively (non-issue); droid's version not touched (would require live verification).
- `PanelContextBuilder.js`'s from-scratch defense re-derivation (a genuine second implementation of defense math in the sheet layer, with a comment acknowledging it can diverge from the cached derived total) — a real architectural concern, out of scope for a normalization-only phase; flagged for Phase 3.

---

## 6. Droid initialization result — investigated, not moved

Phase 1 found three droid-creation paths with different partial field coverage and recommended moving `ensureDroidSystemsDefaults()`'s defaults to creation time. **This phase's deeper investigation found six, not three, live creation-time paths, several with genuinely conflicting field shapes for the same field name** — not just missing fields, but incompatible representations:

| Creation path | `locomotion` shape | `processor` shape | `credits` shape |
|---|---|---|---|
| `ensureDroidSystemsDefaults()` (the reference/consumed shape) | `{name, speed}` | `{name, active, slotKey}` | `{spent, total}` |
| `DroidBuilderApp._getInitialDroidSystems()` | `{id, name, cost, speed}` | `{id, name, cost, bonus}` | `{total, spent, remaining}` |
| `StockDroidNormalizer.normalizeDroidSystems()` | not set at all | not set (singular) — only sets `processors` (plural) + adds `integratedSystems`/`locomotionSystems`, fields found nowhere else | `{spent, total}` (matches reference) |
| `DroidFactory` (custom/non-stock fallback) | whatever the source actor happened to carry, or absent entirely | same | same |
| Character-sheet "Relationships" quick-add dialog | **no `system` payload at all** — `Actor.createDocuments([{name, type: 'droid'}])` | — | — |
| `store-checkout.js`'s `buildDraftDroidActorData()` | not set | not set | `{spent}` only, plus a `totalCost` field found nowhere else |

Reconciling six shapes with real, incompatible field-name/structure conflicts into one `template.json` schema, and updating each of six creation call sites to populate it consistently, is a broad migration with genuine regression risk across the Droid Builder, Stock Importer, DroidFactory, a character-sheet quick-add dialog, and the store checkout flow — explicitly the kind of change the Phase 2 brief said to avoid ("Do not blindly move everything into one hook... Different Droid sources may need different initialization paths") without the ability to verify each path against a live client.

**What this phase confirms is safe about the status quo**: `ensureDroidSystemsDefaults()` uses `??=` exclusively (never overwrites an existing value), and its writes happen to the in-memory `system` object during `prepareDerivedData` — not directly persisted unless a caller separately calls `actor.update()`. It is not silently corrupting data; it is filling gaps every one of the six creation paths leaves, including one (the quick-add dialog) that leaves *zero* `droidSystems` fields at all. Removing the call without first giving every creation path a complete, agreed-upon shape would leave the quick-add-created droid with a fully undefined `droidSystems` — an active regression, not a fix.

**Recommended Phase 3 approach** (not started): declare the canonical shape in `template.json` using `ensureDroidSystemsDefaults()`'s field names as the reference (since that's what all downstream derived/sheet code actually consumes), then update each of the six creation paths one at a time — each as its own small, independently-testable, independently-revertable change — reconciling the shape conflicts table above field-by-field, only removing `ensureDroidSystemsDefaults()`'s call from the derived-prep path once every path has been verified to produce a complete, correct shape.

---

## 7. NPC authority result

Before this phase, the honest state (verified, not assumed) was: `npc-mode-adapter.js` already implements a sophisticated, correctly-wired mode-resolution system (`kind`/`mode`/`sourceAuthority`/`legalProfile`/`legalState`, all consumed via `NpcProfileBuilder.buildContext()` and merged into the sheet's context object) — considerably more complete than Phase 1's audit assumed when it recommended "introduce one small explicit... field." The actual gap was narrower: no single canonical enum name existed for "which of progression/statblock/follower governs this NPC's mechanics," and the derived-computation layer (`computeNpcDerived`) never consulted any of this — unlike droid, an NPC in statblock mode still gets defenses/HP/DT freshly computed by `DerivedCalculator` on every render, with no override.

This phase added `resolveNpcCalculationMode(actor)` as that one canonical name (explicit-field-first, falling back to the existing inference), and stamped it at NPC-import time. It deliberately **did not** add a statblock-override branch to `computeNpcDerived()` (the droid-equivalent of `applyPublishedStatblockDerivedOverrides`) — doing so would require confirming exactly where an imported NPC's *actual* published statblock values are stored for override purposes, and that wasn't verified with enough confidence this phase to risk actively corrupting displayed values for imported NPCs (see §12, Phase 3 recommendation #1).

## 8. Vehicle authority result

**HP/hull**: `system.hp` is now the confirmed, enforced-in-code authority for current/max HP, matching what `ActorEngine.applyDamage()` already exclusively writes. `system.hull` remains a read fallback for the rare case a vehicle has hull data but no hp object at all (should not occur for any actor created after `template.json`'s schema default, but preserved for defense-in-depth).

**DT**: vehicle-specific DT (from `buildVehicleDerived()`) is now the sole writer of both the nested and flat derived DT fields; the generic character-formula DT computation explicitly excludes vehicles.

**Crew**: the four live `system.crew` shapes (Array/String/Number/Object) are all now correctly parsed for the crew-count facts (`largeCrew`/`multiCrew`). Crew *occupancy* (who is assigned to which station) was already fully normalized via `system.crewPositions` and is unaffected — that was never part of the ambiguity.

**Movement**: investigated, found genuinely too inconsistent to normalize safely in this pass (up to 9 undeclared source properties, two independent parser implementations, re-parsed uncached on every render) — documented in §2's table, not touched, per the brief's explicit permission to defer when normalization can't be done safely.

**Defenses**: unchanged this phase — `buildVehicleDerived()` continues to overwrite `computeCharacterDerived()`'s output post-hoc (Phase 1 Finding F), which remains out of scope per both phases' explicit instructions.

---

## 9. Test results

- `node tools/run-rolling-syntax-check.mjs` — full repository syntax check, including every file touched this phase.
- `node tools/run-rolling-tests.mjs` — full rolling-system suite, including 4 new Phase 2 test files (`npc-mode-adapter.test.mjs`, `vehicle-hp-hull-dt-authority.test.mjs`, `vehicle-crew-count-shape-parity.test.mjs`, `derived-calculator-vehicle-dt-skip.test.mjs`).
- Two of the four new test files exercise **real production code** (not reimplemented logic) via this repo's existing Foundry-shim harness (`tests/helpers/foundry-shim/`, discovered and first used in Phase 1's final verification pass): `vehicle-crew-count-shape-parity.test.mjs` calls the actual `resolveVehicleCrewStations()`, and `derived-calculator-vehicle-dt-skip.test.mjs` calls the actual `DerivedCalculator.computeAll()` and asserts on its real return value — this is the strongest verification available short of a live Foundry client, directly proving the vehicle-DT fix's critical mechanism (the async pass no longer emits a `damageThreshold` key for vehicles) rather than only reasoning about it statically.
- Exact pass/fail counts and the pre-existing unrelated CI failure status are reported in the final summary delivered separately (this document does not duplicate live CI numbers, which change with each push — see the PR itself for the current run).

---

## 10. Performance comparison

Per the brief: "Phase 2 is primarily correctness/normalization work... do not claim improvement without data." No new hot-path instrumentation was needed — none of this phase's changes touch `prepareDerivedData`'s per-actor timing budget in a way the Phase 1 instrumentation wouldn't already capture:

- The NPC/vehicle changes are either read-order reordering (no new work) or a skipped code block (vehicles now do *strictly less* work in `DerivedCalculator.computeAll()`, since the DT block is skipped entirely rather than computed and then discarded).
- `resolveNpcCalculationMode()` and `isNpcCalculationMode()` are new but not called from any hot path added this phase — they exist as an available API for future consumers (starting with the import-time stamp, a one-time write).
- `numberOrNull()`'s extra branches (String/Object handling) run only when `resolveVehicleCrewStations()` is called (already an existing per-render call, not a new one), and only add a few extra type checks — not measurable without a live client, and no claim of improvement is made.

**No before/after wall-clock numbers are claimed** — this environment has no live Foundry client, the same documented limitation as Phase 1. A maintainer with a running world can use `SWSE.debug.performance.summary()` (added in Phase 1) to confirm vehicle sheet-context and `DerivedCalculator` timings are unchanged or slightly improved, never regressed.

---

## 11. Remaining legacy compatibility — what still exists and why

| Field/pattern | Why it still exists |
|---|---|
| `system.abilities` | Read-fallback preserved because multiple live tests construct mock actors with `system.abilities` as the *only* populated ability source, exercising real production code (`AbilityEngine`, `SchemaAdapters.getAbilityMod`, `SuggestionService`, follower mutation planning) against it. No live writer of ability *values* exists (confirmed this phase), so it is already inert as an independent authority — full removal of the read-fallback would break real, passing tests without a corresponding migration of those fixtures, which is outside a normalization-only phase's scope. |
| ~45 scattered `attributes ?? abilities` container-fallback call sites | `SchemaAdapters.getAbilityMod`/`getAbilityScore` already exist as the correct centralization point (documented in their own header as "single source of truth"), but adoption is inconsistent. Migrating call sites in unrelated engines (progression steps, suggestion scoring, force-rule adapters) without live verification risks silently changing mechanical output in systems this phase did not otherwise touch — deferred to a dedicated, narrowly-scoped follow-up. |
| `isFollowerNpcActor()`'s full legacy 6-signal chain | Kept as the complete fallback because `npc-mode-adapter.js`'s `inferKind()` does not cover every signal the legacy chain checks (confirmed: it's missing `system.progression?.isFollower`, `profile.legalProfile === 'follower'`, `context.npcKind`, and the exact `flags.swse.follower.isFollower`/`flags['foundryvtt-swse'].isFollower` keys) — trusting a canonical "false" to skip the chain would have been unsafe. |
| `system.hull` (vehicle) | Kept as a fallback for the theoretical case of a vehicle with hull data but no hp object — should not occur post-schema-default, kept for defense-in-depth rather than proven necessary. |
| `system.crewQuality` vs `system.crew.quality` opposite-order preference (two lines, same file) | Found, not fixed — low risk but also low urgency (a display-only quality label, not a mechanical value); flagged for Phase 3. |
| `system.speciesMovement` (climb/fly/swim/etc.) | Confirmed dead (written, never consumed) — not removed, since a system that stores real character capability data that simply isn't wired to mechanics yet is a Phase 3+ feature-completion question, not a Phase 2 authority-normalization one. |
| Droid's six divergent creation-time shapes | See §6 in full — the core deferred item of this phase. |

---

## 12. Phase 3 recommendations (evidence-based)

In priority order, based on what this phase's investigation actually found:

1. **NPC statblock derived-override mechanism** — confirm exactly where an imported NPC's published statblock values are stored for override purposes (the `system.npcProfile.overrides: {hp,defenses,bab,skills,attacks}` flags describe *which* fields are protected, but this phase did not confirm whether the override *values* are a separate stored snapshot like droid's `publishedTotals`, or simply whatever was written directly into `system.hp`/`system.defenses`/etc. at import time). Once confirmed, add the `computeNpcDerived()` branch this phase deliberately did not add.
2. **Droid creation-path schema reconciliation** — per §6's full evidence table, one creation path at a time, with live verification between each.
3. **Ability-modifier helper de-duplication across the 5 Force-talent-tree action files** — now that this phase has confirmed `system.abilities` has no live independent writer, this is lower-risk than it looked at the start of Phase 2, but still needs a live client to confirm zero mechanical drift across Force Adept/Sith/Consular/Jedi Prestige/Sentinel talent actions.
4. **Speed/movement fallback-chain consolidation** for character/NPC/droid (the 4-5 near-identical chains found in §5) — genuinely low-risk given derived data is guaranteed populated by read time, good next target.
5. **Vehicle movement normalization** — the two independent parsers and 9 undeclared source properties found in §2/§8; the brief's own permission to defer applies here, but it's real complexity worth budgeting real time for.
6. Only after 1-5: revisit the still-standing Phase 1 recommendations (Vehicle tab-scoped lazy panels, Droid item-index consolidation, `character-sheet.js` split) — none of them are blocked on anything in this list.

---

# 13. PHASE 2B — Authority Normalization Closure

**Why this section exists:** after the initial Phase 2 pass (§1-12) was
delivered, a direct gap-analysis review ("What hasn't been accomplished
here?") found several of the phase's own defining goals were unfinished —
NPC authority, Droid initialization, the Droid/Vehicle authority maps,
mutation-path auditing, and the contract test matrix. The standard set for
this closure pass: *a deferred code change is acceptable; a missing
authority analysis is not.* Ten unfinished areas were dispatched as
independent, read-only research passes; this section reports every
finding, states what was and wasn't safe to implement from them, and ends
with one of three explicit recommendations (§13.12).

## 13.0 Status taxonomy

Every claim below is tagged with exactly one of:

- **IMPLEMENTED** — code changed this pass, tested, verified (statically or
  at runtime — noted per item).
- **NORMALIZED** — an existing dual/multi-representation was consolidated
  onto one authority.
- **CENTRALIZED** — duplicate logic replaced with a single shared
  implementation.
- **DOCUMENTED ONLY** — the authority/ambiguity is now fully mapped with
  file:line evidence, but no code changed (either because the evidence
  says a change isn't needed, or because the change is real but too risky
  without live verification).
- **BLOCKED ON LIVE FOUNDRY** — a specific, executable runtime check is
  required before any code change or before further confidence is
  possible; the exact check is specified in §13.11.
- **DEFERRED TO PHASE 3** — a real, evidenced gap or risk that is safe to
  leave as-is for now but should be scheduled deliberately.
- **DEFERRED TO SHEET WORK** — a real gap whose fix belongs to a future
  sheet-controller-split phase, not an authority-normalization phase.

Where §1-12 above described a subtype's field-authority table without
qualification, treat it as covering only the fields it actually
investigated — §13.3/§13.4 below are the first genuinely *complete*
Vehicle/Droid field maps and supersede §2's Vehicle/Droid rows wherever
they add a field §2 didn't cover.

---

## 13.1 NPC authority — complete (Area 1)

**Question this had to answer definitively:** for statblock-imported NPCs,
where do the actual authoritative numbers (not just "which fields are
flagged protected") live?

**Finding — hypothesis (A) confirmed for four fields, hypothesis (B)
false, and a fifth field (skills) is neither:**

| Field | Storage | Status |
|---|---|---|
| HP max | `system.hp.max`/`.value` — written directly by `_buildActorFromStatblock()` (`npc-template-importer-engine.js:301-361`) | **IMPLEMENTED** protection (§13.1.1) |
| BAB | `system.bab` — same writer | DOCUMENTED ONLY (no live threat found) |
| Damage threshold | `system.damageThreshold` — same writer, falls back to HP if absent | DOCUMENTED ONLY |
| Defenses (4) | `system.defenses.{reflex,fort/fortitude,will,flatFooted}.total` — `_mapDefenses()` | DOCUMENTED ONLY |
| Skills | **Nowhere.** Not `system.skills`, not `flags.beastData.skills` (only populated for the separate compendium-clone beast-import path), not any structured field — only the opaque `flags.swse.import.raw` blob | **DOCUMENTED ONLY — genuine gap, no safe fix this pass** |

`system.npcStatblock.*` is **not** a published-totals snapshot (hypothesis
B) — it's a GM-hand-edit override layer with zero import-time writers
(only `templates/actors/npc/v2/partials/npc-statblock-editor-panel.hbs`'s
form fields and `character-sheet.js:4928-4971`'s submit-handler mirror
write to it). `npcProfile.calculationMode`/`overrides` (the Phase 2
"protection" flags) are read by **nothing** outside `npc-mode-adapter.js`
and its own test — they gate no calculator or recompute path. This
confirms the original Phase 2 §7's honest caveat ("this phase deliberately
did not add a statblock-override branch... wasn't verified with enough
confidence") was the right call, but the investigation this pass did
**does** conclusively answer the underlying storage question the original
brief needed answered — it just answers it as "there is no separate
override snapshot to read from; the source fields already are the
authority, most of the time."

### 13.1.1 IMPLEMENTED — the real bug this investigation found

`ActorEngine.recomputeHP()` (`actor-engine.js:3780-3800`) is wired via
`HPRecomputeHooks` to fire automatically on any edit to `system.level` or
`system.attributes.con.*` — both explicitly GM-editable on the NPC sheet.
Its "no class Item found" branch unconditionally collapses `system.hp.max`
to `1`. Statblock-imported NPCs never get a `class`-type Item (`_addItemsToActor`
never creates one), so **the first CON or level edit a GM makes on any
statblock-imported NPC destroys its real, correctly-imported HP max** —
live, not hypothetical, confirmed by tracing the hook registration and the
exact writable-field whitelist.

**Fix implemented** (`scripts/governance/actor-engine/actor-engine.js`):
`recomputeHP()`'s no-class-item branch now checks
`actor.type === 'npc' && isNpcStatblockMode(actor)` first and, if true,
returns the actor's current `system.hp.max` unchanged instead of writing
`1`. `isNpcStatblockMode()` is the same predicate `shouldSkipDerivedData()`
(`scripts/utils/hardening.js`) already uses to gate the async derived pass
for statblock NPCs — this fix brings `recomputeHP` in line with a
precedent that already existed elsewhere in the codebase, rather than
inventing a new one.

**Verification status:** the guard's predicate logic is unit-tested
(`tests/phase-2b-closure-fixes.test.mjs`, Tests 2-3) by direct import of
the real `isNpcStatblockMode()` (`npc-mode-adapter.js` has zero
dependencies, so this is real production code under test) and by an
inline reproduction of the two-line branch added to `actor-engine.js`.
**The full integration — the actual write-skip inside the real
`recomputeHP()`, wired through the real `HPRecomputeHooks` — is NOT
runtime-verified**, because `tests/helpers/foundry-shim/path-loader.mjs`
explicitly redirects `actor-engine.js` to a test fake for every existing
test using this repo's shim harness (its own comment: "whose real
implementation transitively imports most of the engine layer and is far
too heavy for a narrow harness"). Confirmed by direct experiment this
pass: importing the real file via the shim throws `Cannot read properties
of undefined (reading 'api')` from a transitive dependency. This is a
**pre-existing harness limitation, not something this fix introduced** —
no code change in this pass could close it without expanding the shim
(explicitly out of scope per Phase 1's "no new shim infrastructure"
standing instruction). See §13.11, item 1, for the exact live-Foundry
check this still needs.

**Skills gap — DOCUMENTED ONLY, no fix attempted:** since no field
anywhere carries structured statblock skill totals for nonheroic/heroic
imports, `system.derived.skills`'s attribute-mod + half-level + trained
guess is silently used instead, and will diverge from the published total
whenever it includes feats, synergy, or size bonuses the guess doesn't
model. Fixing this requires either (a) a new importer feature to parse the
`Skills` statblock line into structured data (real feature work, not an
authority-normalization fix), or (b) reparsing `flags.swse.import.raw.Skills`
on demand in the sheet layer the way `beastData.skills` is already parsed
by `parseNpcStatblockSkillLines`. Recommended as a Phase 3 candidate,
scoped as its own small pass (§13.12 does not block on this).

---

## 13.2 Droid creation-path matrix — complete, re-verified (Area 2)

Re-verified all six creation paths byte-for-byte against the original
Phase 2 §6 summary — no discrepancies. Per-field classification, now with
an explicit safe-to-move-now verdict per field (this supersedes §6's
"investigated, not moved" blanket verdict with field-level granularity):

| Field | Safe to default at the two zero-payload paths (quick-add dialog, store-checkout partial)? | Why |
|---|---|---|
| `buildHistory`, `degree`, `size`, `stateMode`, `appendages`, `sensors`, `weapons`, `accessories` | **YES** | Every reader is `Array.isArray`-guarded or tolerates an empty string/default enum; no reader requires a specific non-default value |
| `locomotion` | Borderline YES | Key-set varies (`cost`/`sourceText` presence) but no reader requires the missing keys; safe to default with a superset shape `{id:'',name:'',speed:0}` |
| `processor` | **NO** | Builder's `.bonus` vs stock/reference's `.active`/`.slotKey` — `droid-systems-resolver.js:343` reads `.bonus` and silently gets `0` for non-builder droids; needs a canonical-key decision first |
| `armor` | **NO — confirmed conflict, corrected during the §13B compliance re-check (see below)** | Builder writes `.bonus`; stock importer never sets `armor` at all; `ensureDroidSystemsDefaults()` writes `.rating`. **Corrected finding:** `context-builder.js:602`'s `buildArmorPanel()` does correctly read `droidSystems.armor.bonus`, but its output (`droidPanels.armor`) is never referenced by any template — confirmed zero matches for `droidPanels.armor` or `panels.armor` anywhere in `templates/`, so this panel is dead/unwired. The panel that IS wired and rendered, `droid.resolvedSystems.armor` (populated by `droid-systems-resolver.js`'s `_resolveArmor()`), passes `bonus`/`rating` as `extra` into `_fromBuilder()` (`droid-systems-resolver.js:400`), but `_fromBuilder()`'s return object (lines 283-298) is a fixed key list that does **not** include `bonus`, `rating`, or `armorBonus` — those extras are silently dropped. A third template, `droid-armor-panel.hbs:15`, reads yet a fourth key name, `armor.armorBonus`, which is populated by none of the above. **Net effect: no template anywhere ever displays a Garage-built droid's armor bonus correctly** — not a two-reader naming mismatch as originally stated, but a resolver that drops the field entirely plus a wired panel builder whose correct output is never consumed |
| `credits` | **NO** | `.remaining` is a landmine: `droid-modifications.js:219`'s `validateModificationInstall()` reads `credits?.remaining \|\| 0` directly (no recompute fallback) — silently `0` for every path except the Garage builder. Currently dead code (zero callers), so no live break today, but must be resolved before that function is ever wired up |
| `appendageSlots`, `droidStatus` | YES, trivially | Both fields are write-only from `ensureDroidSystemsDefaults()` — **no reader exists anywhere in the codebase** for either one |
| `processors` (plural) | Moot | Its only reader (`collectDroidPartEffectsFromActor`) has zero callers; the canonical mechanical reader (`resolveInstalledDroidComponents()`) deliberately excludes it from `DROID_SYSTEMS_ARRAY_FIELDS` |

**Reconciliation engine finding:** `DroidConvertedSystemReconciliationService`
exists but does **not** solve the shape-conflict problem above — it moves
data from `publishedTotals.droidSystems` into `system.installedSystems` (a
third, separate ledger), never into `droidSystems.processor`/`.locomotion`,
and only runs on explicit, manual, two-step, permission-gated GM/owner
action after a droid has already been converted to `PLAYABLE_DERIVED`
mode. The plural/singular shape divergence between the stock normalizer
and the builder remains permanently unreconciled by any existing
mechanism.

**Verdict: unchanged from §6 — droid `droidSystems.*` migration remains
DEFERRED, but now with field-level granularity instead of a blanket
defer.** The 8 fields marked YES above are genuinely safe to move to
creation time in a future pass without further live verification; the 3
marked NO require a canonical-key decision (armor `bonus` vs `rating`,
processor `bonus` vs `active`/`slotKey`, credits `.remaining` stored vs.
always-recomputed) that this pass declines to make unilaterally, per the
brief's explicit instruction not to force schema unification without
evidence of what the correct unified shape should be.

---

## 13.3 Full Vehicle field authority map (Area 3) — DOCUMENTED, supersedes §2's Vehicle row

Baseline: `template.json`'s vehicle block has no `"templates": ["base"]`
entry, so it does not inherit defenses/abilities the way character/NPC/
droid do — everything below except `hp`/`speed`/`subsystems`/
`enhancedShields`/`powerAllocation`/`crew`/`pilotManeuver`/
`commanderOrder`/`turnState` is schema-undeclared, free-form data.

| Field/Concept | Source | Duplicate authority? | Status |
|---|---|---|---|
| Identity (`category`/`type`/`size`) | `_onSubmitVehicleActorForm` whitelist (character-sheet.js:10684-10692) is the live writer; `swse-vehicle-handler.js:136-137` also writes at template-apply time | `vehicleType` classification is **computed fresh every render** from `category+type+tags` (`buildVehicleTypeFlags()`, own comment: "No schema-level vehicleType enum exists"), never persisted — not a duplicate-authority risk, just a naming gap | DOCUMENTED ONLY |
| `system.domain` | Written only by a **precreate hook registered for `Hooks.on('preCreateItem', ...)` guarded on `document.type !== 'vehicle'`** — but `vehicle` is an Actor type, never an Item type, so this writer appears to never actually fire | Effectively dead/broken writer | DEFERRED TO PHASE 3 (low priority — the field is barely read) |
| SR (Shield Rating) | `system.shields{value,max[,rating]}` **and** `system.shieldRating` (bare number) — both independently writable | **YES — confirmed real duplicate authority.** `vehicle-factory.js` writes both together; `vehicle-import-normalizer.js` writes only `shields`; `effect-resolver.js`/`tech-specialist-modification-service.js` write only `shieldRating`; only `GMApprovalOperationsService.js:711-714` explicitly syncs them. `resolveVehicleShieldState()`'s 8-candidate fallback chain is a **guess**, not an enforced contract. `DerivedCalculator` explicitly excludes vehicles from shield projection (confirmed in original Phase 2 §8) | **DEFERRED TO PHASE 3** — needs a canonical-field decision, not a narrow bug fix |
| Crew stations | `BASE_STATIONS` hardcoded constant + `system.stations` (real, GM-authored custom roster) + `system.crewPositions` (occupancy) | The "explicit gunner override" branch (`system.crewPositions.gunners`) is dead code — **zero writers found anywhere** — not a live conflict, just misleading unreachable code | DOCUMENTED ONLY |
| Weapon mounts | `system.weapons` (array, legacy/statblock shape) **and** embedded weapon Items (structured shape) | **YES — confirmed real duplicate-display bug.** `vehicle-weapon-import-normalizer.js` creates embedded Items from `system.weapons` entries but never clears the source array afterward; `buildVehicleWeaponMountPanel()` renders **both** simultaneously — any vehicle imported through this pipeline shows each weapon twice unless a GM manually empties `system.weapons` | **DEFERRED TO PHASE 3** — the fix (clear `system.weapons` after Item creation) is narrow but touches an import-mutation path; not executed this pass to keep this closure pass's code-change surface reviewable |
| Cargo | `system.cargo` (string) vs `system.payload` (separate concept, string) | Not a duplicate — `payload` and `cargo` are genuinely different concepts. **Real but harmless bug found:** `character-sheet.js:4453` reads `system.cargo.capacity` assuming an object shape that no writer ever produces (always a string); latent because `buildVehicleCargoSummaryPanel()` recomputes its own value from `parseCargoString()` and only falls back to the broken read when unparseable | DEFERRED TO PHASE 3 (cosmetic dead-code cleanup) |
| Subsystems | `system.subsystems.{engines,weapons,shields,sensors,comms,lifeSupport}` | Matches `template.json` exactly; single writer (`subsystem-engine.js`) | **No duplicate authority — clean** |
| Power allocation | `system.powerAllocation.{weapons,shields,engines}` | Matches schema; single writer (`enhanced-engineer.js`) | **No duplicate authority — clean** |
| Turn state | `system.turnState.*` | Matches schema; reset every vehicle turn by `VehicleTurnController.startTurn()`, coupled by design to pilot/commander/shield reset | **Genuine RUNTIME STATE — clean, correctly scoped** |
| Pilot/commander state | `system.pilotManeuver`/`system.commanderOrder` | Matches schema; single writer each, reset to `'none'` every turn | **Genuine RUNTIME STATE — clean** |

---

## 13.4 Full Droid field authority map (Area 4) — DOCUMENTED, supersedes §2's Droid row

| Field/Concept | Finding | Duplicate authority? | Status |
|---|---|---|---|
| Degree | `stock-droid-importer-engine.js:195-197` writes `droidDegree`/`degree`/`droidDegreeKey` (flat, import-time) **and** `droidSystems.degree` (Garage-live) independently | **YES — confirmed real divergence.** `prerequisite-checker.js:1632` and `droid-trait-passive-adapter.js:33,233` read only the flat fields, with **no fallback to `droidSystems.degree`** — a Garage-built-only droid (which never gets the flat fields written) silently reads `0`/`'1st-degree'` default for feat-gating and passive-trait resolution | **DEFERRED TO PHASE 3** |
| Model/manufacturer/chassis | No `template.json` fields exist; zero writers found anywhere for `system.manufacturer`/`droidModel`/`droidType`/`restrictionLevel` | Not a duplicate — permanently dead reads, no writer at all | DOCUMENTED ONLY (dead code, low priority) |
| Integrated vs. handheld weapons | Item-level `integrated` flag (`item.system.integrated`/`flags.swse.integrated`) determines the sheet split | `droidSystems.weapons` is a **second, independent** "installed weapon" representation, reconciled only one-directionally via `integratedParts` (catches droidSystems-only entries with no Item), never merged into `handheld` | **YES — confirmed real duplicate authority** | DEFERRED TO PHASE 3 |
| Modification points / system slots | Two unrelated mechanisms: (a) physical slot capacity, with **two independently-maintained tables** (`droid-slot-governance.js`'s `SLOT_CATEGORIES` vs `droid-modification-factory.js`'s `STACKABLE_DROID_SLOTS`); (b) UI-only "Modification Points" budget | (a) latent duplicate-authority risk (not proven diverged, structurally at risk); (b) inert — its consumption side filters for Item type `"customization"`, which **is not a registered Item type** in `template.json`, so used-points is always `0` | DEFERRED TO PHASE 3 (a); DOCUMENTED ONLY, inert (b) |
| Installed systems | `system.installedSystems` (canonical, per the resolver's own doc comment) vs `system.droidSystems.*` (demoted, but still directly editable) | **YES — acknowledged in-repo.** The resolver's own `conflicts` array exists specifically to surface disagreements between the two, not to prevent them | DOCUMENTED ONLY (already self-aware in the codebase; the conflict-surfacing mechanism is the correct mitigation, not a bug) |
| Programming/protocols | `buildProtocolsPanel()`/`buildProgrammingPanel()` filter for Item types `"protocol"`/`"programming"` — **neither is a registered Item type** | Not a duplicate — permanently dead UI, can never render non-empty data | DOCUMENTED ONLY (unimplemented feature, not an authority bug) |
| Statblock authority (`publishedTotals`) | Confirmed to carry a `droidSystems` sub-object, **frozen at import time**, read-only after conversion (`convertToPlayableDerived()` explicitly does not touch `droidSystems`/`installedSystems`) | Not a true duplicate — by design non-authoritative post-conversion, used only for diff/inspection or explicit opt-in reconciliation | **No duplicate authority — clean, working as designed** |
| Build history | Single writer (`droid-builder-app.js`, `GMApprovalOperationsService.js`), both to `system.droidSystems.buildHistory` | Not a duplicate — but `context-builder.js:796` reads the **wrong path** (`this.system?.buildHistory`, missing `.droidSystems`) — a broken reader, not competing authority | DEFERRED TO PHASE 3 (one-line reader fix, low priority — cosmetic, no mechanical impact) |
| Damaged/disabled system state | `item.system.droidPart.enabled`/`system.disabled` exist as read targets but have **zero writers anywhere** | Not a duplicate — unimplemented feature (no toggle action exists) | DOCUMENTED ONLY |

---

## 13.5 Speed/movement full audit (Area 5) — DOCUMENTED, one cleanup IMPLEMENTED

**`system.speciesMovement` (climb/fly/swim/hover/glide/burrow):** re-confirmed
fully dead, broadened this pass to also check combat/action-economy code
(`action-engine-v2.js`, `droid-combat-action-adapter.js`,
`vehicle-turn-controller.js`, `getDroidMovementRiders()`) — no reader
anywhere, including places that superficially look movement-mode-related
(those actually key off the separate `system.locomotion` droid subsystem,
or are pure descriptive/GM-adjudicated text). **DEFERRED TO PHASE 3**
(not removed — a real capability data field with no mechanical wiring is a
feature-completion question, not this phase's to resolve).

**`parseVehicleSpeed()` vs `parseVehicleSpeedText()`: confirmed correctly
LAYERED, not duplicative — no centralization needed.** `parseVehicleSpeedText()`
(`movement-normalizer.js`) is the real "dirty text → structured data"
parser, called only at import/template-apply/precreate-hook time (one-time,
persists results to `system.*`). `parseVehicleSpeed()`'s only live call
site (`vehicle-context-builder.js:1211`) always passes an object (never a
raw string), so its object branch is a render-time **projection** over
already-normalized fields, not a second parser — merging the two would
force every sheet render to re-parse raw text, a regression. **IMPLEMENTED:**
removed the dead, unreachable string-input branch (25 lines) from
`parseVehicleSpeed()` — confirmed zero production callers ever pass a raw
string via the one production call site, so this is a pure dead-code
prune, not a behavior change (syntax-checked, no dedicated runtime test
written — see §13.9 rationale).

**The 10-11 undeclared-but-genuinely-written vehicle movement properties**
(`characterScaleSpeedLabel`, `starshipScaleSpeedLabel`, `starshipSpeed`,
`characterScaleMovementMode`, `starshipScaleMovementMode`,
`vehicleMovementStatus`, `vehicleMovementRaw`, `characterScaleFightingSpace`,
`starshipScaleFightingSpace`, `vehicleMovementSummary`, `vehicleIsImmobile`):
confirmed each has a real writer (`vehicle-import-normalizer.js` and/or
`swse-vehicle-handler.js`) — not dead defensive code. **IMPLEMENTED:**
declared all 11 in `template.json`'s vehicle block with their natural
defaults (empty string / `false`), a purely additive schema change (Foundry
template-merging only adds missing keys, never removes extras, so this
cannot change behavior for any existing actor).

**Bonus finding, not originally scoped, material to the recommendation:**
`scripts/sheets/v2/vehicle-sheet/context.js` contained a **third**,
independent `buildMovement()` re-implementation of the same 9+ fields,
with yet another ad-hoc output shape. Confirmed **zero importers anywhere
in the repo** (and independently corroborated by a pre-existing, unrelated
audit doc — `docs/audits/vehicle-crew-assignment-phase-6.md` — which
already described this exact file as "the dead `vehicle-sheet/context.js`").
**IMPLEMENTED:** deleted the entire 459-line orphaned file.

---

## 13.6 Fallback inventory — classified, high-confidence fixes executed (Area 6)

Per the brief's explicit conditional instruction ("execute only
high-confidence fixes... if truly byte-identical... if provably
redundant... if a real inconsistency"):

| Cluster | Investigation result | Action |
|---|---|---|
| 5 talent-tree `abilityMod`/`getAbilityMod` helpers (Force Adept, Sith, Consular, Jedi Prestige, Sentinel) | Confirmed **byte-identical function bodies** (only the declared name differs, 3-vs-2 split). Call-site risk profile: mostly chat-text/dialog-label numbers, one attack-bonus fallback (`sith-talent-actions.js`), one live HP write (`consular-talent-actions.js`) | **CENTRALIZED.** New shared `scripts/engine/talent/talent-ability-helpers.js` exports `getTalentAbilityMod()`; all 5 files now import it (aliased to match each file's existing local call-site name, so zero call sites needed renaming). Deliberately **not** routed through `SchemaAdapters.getAbilityMod()` — that helper checks `system.attributes` before `system.abilities`, the reverse priority order, so swapping would be a real behavior change for actors with divergent mirrors, not a safe dedup |
| `PanelContextBuilder.buildDefensePanel()`'s manual defense-total re-sum | Confirmed **provably redundant** for Fortitude/Reflex (every component read from the exact field `DefenseCalculator` already wrote) and **provably wrong** for Will whenever the actor has the Force Adept talent "Psychic Citadel" — the manual sum omits `psychicCitadelBonus` entirely because it's never persisted as its own breakdown field, while the cached `derived.defenses.will.total` DefenseCalculator returns does include it | **IMPLEMENTED (bug fix).** `total` now prefers the authoritative `derivedDefense.total` when finite, falling back to the manual sum only when it's unavailable — fixes the Psychic Citadel undercounting bug and removes redundant computation for the common case, with zero behavior change for every actor without that talent |
| Droid `ref`/`reflex` defense-key naming | **Confirmed NOT a real inconsistency — does not generalize from the vehicle finding.** `DerivedCalculator.computeAll()` (the droid/character/NPC pipeline) writes **only** full-name keys (`reflex`/`fortitude`/`will`) — never `ref`/`fort` — full stop; the abbreviated-key dual-write pattern is a `vehicle-derived-builder.js`-only artifact. Droid `context-builder.js`'s full-name reads are the *only* correct choice, matching the system's own documented "PHASE 8: Canonical defense authority" convention (`PanelContextBuilder.js`'s own header comment) | **No fix needed — false alarm from the prior pass's over-generalization, corrected in this document** |

**Attributes/abilities low-risk consumers** (the fourth item on the
brief's conditional list): no new consolidation target was found beyond
what §11 already documented (`SchemaAdapters.getAbilityMod`/`getAbilityScore`
already exist as the correct centralization point; the ~45 scattered
call-site migration remains DEFERRED TO PHASE 3 — unchanged from the
original Phase 2 assessment, re-confirmed still accurate).

---

## 13.7 Broader mutation-authority audit (Area 7) — complete, headline: system is well-governed

Scope: every sheet-edit mutation path for the seven requested field
families (ability, HP, defenses, droid config, vehicle config, NPC mode,
crew/stations, movement) across `scripts/sheets/v2/`,
`scripts/apps/droid-builder-app.js`, `scripts/apps/store/`,
`scripts/engine/import/`.

**Finding: exactly one confirmed `ActorEngine` bypass across all seven
families, and it's the already-known, already-documented one** —
`ensureDroidSystemsDefaults()`'s in-memory `??=` default-filling during
`computeDroidDerived()`/`prepareDerivedData` (class E: never itself calls
`.update()`, confirmed again this pass to not silently persist unless a
separate caller merges the full in-memory `system` object into an update
payload — no such caller was found). Every other live, user-facing
mutation site for these seven families already routes through
`ActorEngine.updateActor()`/`.apply()`/`.recomputeHP()`/
`.updateEmbeddedDocuments()` (class A). Import/builder/store-checkout
writers to these fields are legitimate creation-time data construction on
plain (not-yet-persisted) objects (class D), not mutation of existing
actors.

**Correction made during the §13B compliance re-check (this claim was
wrong as originally written):** the original text here claimed
`MutationInterceptor` "wraps `Actor.prototype.update` and throws in
strict/dev mode on any call outside an `ActorEngine.setContext()` window."
Direct re-reading of `scripts/governance/mutation/MutationInterceptor.js`
this pass found that claim is **false as currently implemented**. The
file's own header and `initialize()` method state explicitly: *"PERMANENT
FIX: Does NOT patch `Actor.prototype.update` anymore... No more:
`MutationInterceptor._wrapActorUpdate()`"* — prototype wrapping was
deliberately removed, and `initialize()` now runs `_verifyPrototypeClean()`
specifically to **throw if wrapping is ever reintroduced** (the opposite
of what the original claim described). What actually exists today:
`MutationInterceptor.setContext()`/`clearContext()`/`hasContext()` is a
simple in-memory flag `ActorEngine` sets around its own operations;
`sentinel-update-atomicity.js`'s `preUpdateActor` hook is an explicitly
`readOnly: true` burst/loop *monitor*, not a gate; and
`mutation-path-validator.js`'s `validateMutationRouting()` returns a
**self-reported description** of where enforcement is supposed to live
(`enforcement: 'MutationInterceptor.setContext()'`) rather than itself
performing any check. No runtime mechanism was found in this codebase that
throws or blocks a hypothetical direct `actor.update()` call bypassing
`ActorEngine` — governance today is a **strong, consistently-followed
convention verified by direct code search across every live call site**,
not a mechanically enforced runtime gate. This does not change the
factual finding (every found call site for the seven field families does
route through `ActorEngine`, confirmed by direct grep/read, not by trusting
an enforcement claim) — but it means a future violation would not be
caught automatically the way "well-governed... enforced at runtime"
implied, and that risk should be carried into Phase 3 rather than assumed
away.

**One adjacent, out-of-scope finding worth flagging:**
`npc-damage-hydration-hooks.js:152` writes weapon `system.damageFormula`/
`system.damage`/`system.statblockHydrated` via a direct
`actor.updateEmbeddedDocuments()` call, bypassing `ActorEngine` — and it's
not one-time: it also runs a full world-actor scan on every `ready` hook.
This does not touch any of the seven requested field families (it's weapon
damage-formula hydration), so it's **DEFERRED TO PHASE 3** if that scope
is ever broadened, not itemized as a Phase 2B finding.

**Status: DOCUMENTED, no code change needed** — the audit confirms the
existing governance is sound; there was nothing to fix.

---

## 13.8 Schema / template.json re-evaluation (Area 8)

Two purely additive schema declarations were made this pass (see §13.5):
the 11 vehicle movement fields. No other schema change was made — the
droid `droidSystems.*` shape-conflict fields (armor `bonus`/`rating`,
processor `bonus`/`active`, credits `.remaining`) deliberately were **not**
resolved into a schema decision this pass (§13.2) because doing so
requires picking a canonical shape without live-client confirmation that
the choice doesn't break an existing readers, which the brief's standard
explicitly disallows guessing at.

---

## 13.9 Contract test coverage matrix (Area 9)

| Actor type / mode | Existing coverage before Phase 2B | Added this pass |
|---|---|---|
| Character | `derived-calculator-vehicle-dt-skip.test.mjs` (Test 2, real `DerivedCalculator.computeAll()`), plus the pre-existing broad rolling suite | `phase-2b-closure-fixes.test.mjs` (talent ability-mod, Will-defense-total logic) |
| NPC — progression mode | `npc-mode-adapter.test.mjs`, `derived-calculator-vehicle-dt-skip.test.mjs` (Test 3) | `phase-2b-closure-fixes.test.mjs` Test 2 (mode-predicate contrast case) |
| NPC — statblock mode | `npc-mode-adapter.test.mjs` | `phase-2b-closure-fixes.test.mjs` Tests 2-3 (the `recomputeHP` guard's predicate and branch logic) — **NOT** a full integration test through the real `actor-engine.js` (blocked, see §13.1.1/§13.11) |
| NPC — follower | `npc-mode-adapter.test.mjs` (mode-inference only) | None — follower defense math (`buildFollowerDefenseValues()`) remains untested by this pass, unchanged from before |
| Droid | `derived-calculator-vehicle-dt-skip.test.mjs` (Test 3) | None new — the shape-conflict fields (§13.2/§13.4) are documented, not code-changed, so no new test was needed; existing droid tests (`droid-phase4-foundry-shim.test.mjs` and others, pre-existing) are unaffected |
| Vehicle | `vehicle-hp-hull-dt-authority.test.mjs`, `vehicle-crew-count-shape-parity.test.mjs`, `derived-calculator-vehicle-dt-skip.test.mjs` (Test 1) | None new — the `parseVehicleSpeed()` dead-branch removal and the orphaned `context.js` deletion are pure-deletion changes with no behavior surface to test (confirmed via the same call-site grep that justified the deletions) |
| Legacy/compatibility | Existing tests constructing actors with `system.abilities`-only (no `system.attributes`) continue to pass unmodified (re-confirmed via the full rolling suite run this pass) | — |

**Why this pass did not attempt a full N-actor-type × M-mode integration
matrix:** the brief's own standard draws the line at completing the
*analysis*, not at writing exhaustive new integration tests for every
combination this pass touched only at the documentation level. Two of the
four code fixes in this pass (`recomputeHP`'s NPC guard,
`PanelContextBuilder`'s Will-Defense fix) live inside modules with
transitive import chains this repo's Foundry-shim harness cannot currently
load (confirmed by direct experiment, not assumed) — expanding the shim to
cover them is real, separately-scoped infrastructure work, explicitly out
of bounds per Phase 1's "no new shim infrastructure" standing instruction.
Where direct testing was blocked, this pass wrote the closest available
substitute (real-import predicate tests plus inline logic-equivalence
reproductions of the exact added branches) and documented the gap
precisely rather than skipping verification silently.

**Full test-suite result this pass:** `node tools/run-rolling-syntax-check.mjs`
— all 2231 discovered source files pass. `node tools/run-rolling-tests.mjs`
— 122 passed, 1 failed (of 123 run; 5 excluded as documented pre-existing
failures) — the sole failure is `progression-suggestion-and-render-contracts.test.mjs`'s
`lang/en.json is missing the announced form of Select` assertion, the same
pre-existing, unrelated failure confirmed in Phase 1 (via `git stash`
against base commit `b7287a5`) to predate all work in this multi-phase
effort.

---

## 13.10 Exact files changed in Phase 2B

**Production code:**
- `scripts/governance/actor-engine/actor-engine.js` — `recomputeHP()` now skips the collapse-to-1 write for statblock-mode NPCs (§13.1.1).
- `scripts/sheets/v2/context/PanelContextBuilder.js` — `buildDefensePanel()`'s `total` now prefers the authoritative cached `derivedDefense.total` over the manual re-sum (§13.6).
- `scripts/engine/talent/talent-ability-helpers.js` (**new**) — shared `getTalentAbilityMod()`.
- `scripts/engine/talent/force-adept-talent-actions.js`, `sith-talent-actions.js`, `jedi-prestige-talent-actions.js`, `consular-talent-actions.js`, `sentinel-talent-actions.js` — local duplicate helper removed, now import the shared one (§13.6).
- `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js` — `parseVehicleSpeed()`'s dead string-input branch removed (§13.5).
- `scripts/sheets/v2/vehicle-sheet/context.js` (**deleted**) — orphaned, zero-importer duplicate movement/context builder (§13.5).
- `template.json` — 11 vehicle movement fields declared with their existing real defaults (§13.5/§13.8).

**New tests:**
- `tests/phase-2b-closure-fixes.test.mjs` — covers all four code changes above at the level described in §13.9.

**New/updated documentation:** this section (§13) of the existing Phase 2
audit doc, in place rather than as a separate file, to keep the full
Phase 2 authority-normalization narrative in one document.

---

## 13.11 Live-Foundry verification checklist (executable, five-part format)

Per the brief's requirement that every remaining runtime-sensitive unknown
be specified precisely enough to execute, not just gestured at:

**1. NPC `recomputeHP` statblock guard (§13.1.1)**
- *Exact code path:* `ActorEngine.recomputeHP()` (`scripts/governance/actor-engine/actor-engine.js`, the `if (!classItem)` branch), reached via `HPRecomputeHooks._registerActorUpdateHook()` whenever `system.level` or `system.attributes.con.*` changes on an actor.
- *Exact unresolved question:* does the real, full `ActorEngine` (not the test fake) actually skip the HP-collapse write for a statblock-imported NPC when a GM edits its Constitution score on the live NPC sheet?
- *Exact runtime observation needed:* import an NPC via the nonheroic/heroic statblock importer (any NPC with a real HP max, e.g. 45). Confirm `system.hp.max` reads 45 on the sheet. Edit the NPC's Constitution ability score by any amount via the sheet. Reload/re-render the sheet and read `system.hp.max` again.
- *Exact expected possible outcomes:* (a) `system.hp.max` is still 45 (or the CON-recomputed-but-not-applicable value — statblock NPCs shouldn't recompute at all, so it should be unchanged) → fix confirmed working; (b) `system.hp.max` reads `1` → the guard did not fire as expected, likely because `isNpcStatblockMode()` returned false for this actor's actual shape (e.g. a live actor has fields this pass's synthetic test fixtures didn't anticipate) — needs immediate follow-up, not a Phase 3 backlog item, since it's a data-loss bug.
- *What each outcome unlocks:* (a) closes this item permanently, no further action. (b) requires re-reading `getNpcProfileState()`'s inference against the actual live actor's `flags`/`system` shape and either correcting `isNpcStatblockMode()`'s inference or widening the guard's condition.

**2. Vehicle weapon-mount duplicate display (§13.3)**
- *Exact code path:* `buildVehicleWeaponMountPanel()` (`scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js`), merging embedded weapon Items and `system.weapons` array entries.
- *Exact unresolved question:* does a vehicle actually show each imported weapon twice on the live sheet, confirming the static-trace finding?
- *Exact runtime observation needed:* import any vehicle via the weapon-import pipeline (`vehicle-weapon-import-normalizer.js`'s caller) that has at least one weapon in its source data. Open the vehicle sheet's Weapon Mounts panel.
- *Exact expected possible outcomes:* (a) each weapon appears exactly once → the static trace was wrong or something already prevents the duplication in practice (e.g. a caller does clear `system.weapons` that wasn't found); (b) each weapon appears twice → confirms the bug live.
- *What each outcome unlocks:* (a) downgrade this from "confirmed real bug" to "documented risk, no live symptom found" in the next audit pass. (b) authorizes implementing the narrow fix (clear `system.weapons` after Item creation in the import normalizer) with confidence it addresses an observed, not just theoretical, problem.

**3. Droid `armor` bonus/rating key conflict (§13.2/§13.4)**
- *Exact code path:* `context-builder.js:595-606`'s `buildArmorPanel()` (reads `armor.bonus`) vs. `droid-systems-resolver.js:400`'s `_resolveArmor()` (reads `armor.rating`).
- *Exact unresolved question:* for a droid built via the Garage (`DroidBuilderApp`, which writes `armor.bonus`), does the resolved-systems panel (which reads `.rating`) actually display a wrong/zero armor value live, and vice versa for a stock-imported droid?
- *Exact runtime observation needed:* build a droid via the Garage with non-zero armor. Compare the armor value shown in the main sheet armor panel against the "resolved systems" panel (if both are visible in the same sheet, or across the sheet's tabs).
- *Exact expected possible outcomes:* (a) both panels agree → one of them has an undiscovered fallback/normalization step this pass's static trace missed; (b) the panels disagree → confirms the field-shape conflict has a live, user-visible symptom.
- *What each outcome unlocks:* (a) revise §13.2/§13.4's classification from "confirmed breaking conflict" to "latent, mitigated" and re-trace the missing fallback. (b) authorizes a Phase 3 pass to pick one canonical key (`bonus` or `rating`) and update both readers plus backfill the other creation paths — the live symptom removes the "which key is actually load-bearing in practice" ambiguity that's currently blocking that decision.

**4. Statblock NPC skill totals (§13.1)**
- *Exact code path:* `system.derived.skills` computed by `DerivedCalculator`'s generic attribute-mod + half-level + trained-feat guess, for any NPC where `resolveNpcCalculationMode(actor) === 'statblock'`.
- *Exact unresolved question:* how far does the guessed skill total actually diverge from the real published statblock skill total in practice, for a representative sample of imported NPCs?
- *Exact runtime observation needed:* import 3-5 nonheroic/heroic statblock NPCs with published skill lines that include feat/synergy/size bonuses (not just trained-class-skill baseline). Compare each displayed skill total against the statblock's published number.
- *Exact expected possible outcomes:* (a) divergence is small/rare in practice (most published skills happen to match the guess formula) → lower priority, can stay a documented gap indefinitely; (b) divergence is common/large → raises priority for the Phase 3 skill-line-parsing feature work recommended in §13.1.
- *What each outcome unlocks:* determines whether "parse `Skills` into structured data" gets scheduled as a near-term Phase 3 item or stays a long-tail backlog item.

---

## 13.12 Final recommendation

**PHASE 2 COMPLETE WITH DOCUMENTED RUNTIME BLOCKERS.**

Every area the user's closure standard classified as completable without a
live client has been completed at the analysis level: the Vehicle field
map (§13.3), the Droid field map (§13.4), the mutation-authority audit
(§13.7), the fallback inventory with its conditional high-confidence
fixes executed (§13.6), the movement model (§13.5), and test coverage is
documented honestly rather than overstated (§13.9). Four real,
evidence-backed code fixes shipped this pass, three of them closing
confirmed live bugs (the NPC HP-collapse bug, the Will-Defense
Psychic-Citadel undercounting bug, and vehicle movement dead-code/schema
cleanup) and one a safe, byte-identical-confirmed consolidation. The
Droid `droidSystems.*` creation-path migration remains legitimately
blocked exactly where the user's standard said it was allowed to remain
blocked — not because it wasn't analyzed (§13.2 gives it the most granular
field-by-field verdict of the whole closure pass), but because three of
its fields have genuine, evidenced shape conflicts with no textually
determinable "correct" resolution.

What keeps this from being an unqualified "SAFE TO PROCEED": the NPC
`recomputeHP` fix — the single highest-severity finding of this entire
pass, a live data-loss bug — cannot be integration-tested through this
repo's existing tooling, only unit-tested at the predicate/logic level
(§13.1.1). §13.11 gives the exact, executable live-Foundry check needed to
close that gap, plus three more (vehicle weapon-mount duplication, droid
armor key conflict, statblock skill divergence) that would sharpen Phase 3
prioritization but do not block Phase 3 from starting.

**Recommendation for Phase 3 scope, in priority order:** (1) run §13.11's
four live-Foundry checks, starting with the `recomputeHP` one given its
severity; (2) if check #1 comes back clean, no further code change is
needed on that item; (3) schedule the Vehicle SR/shieldRating canonical-field
decision and the weapon-mount duplicate-display fix (§13.3) as
independent, narrowly-scoped changes; (4) schedule the droid
armor/processor/credits canonical-key decisions (§13.2/§13.4) once check
#3 provides a live symptom to design against; (5) everything else in this
document marked DEFERRED TO PHASE 3 is safe to schedule opportunistically,
none of it blocks any of the above.

---

# 14. Phase 2B Final Compliance Audit (review-only pass)

A review-only compliance pass re-verified §13's claims against current
repository state (re-reading files directly, reproducing the CI failure on
`origin/main`, tracing the actual `MutationInterceptor` mechanism) rather
than trusting §13's own summary. Two genuine inaccuracies in §13 were found
and corrected in place (see the inline "Corrected finding"/"Correction made
during the §13B compliance re-check" notes in §13.2/§13.4's armor row and
§13.7): the droid armor `bonus`/`rating` conflict was mischaracterized (the
real defect is that `_fromBuilder()` drops both keys and a correctly-wired
panel builder is never referenced by any template — worse and differently
shaped than originally stated, not a simple two-reader naming mismatch),
and the mutation-audit's enforcement claim was factually wrong
(`MutationInterceptor` explicitly does **not** wrap `Actor.prototype.update`
— that was deliberately removed as a "PERMANENT FIX"; governance is a
verified-by-grep convention, not a runtime-enforced gate). Everything else
independently re-checked this pass — the NPC `recomputeHP` fix's exact code
path, `computeNpcDerived()`'s continued non-mode-awareness, the absence of
any BAB/DT/defense-clobbering mechanism analogous to the HP bug, the
`PanelContextBuilder` fix's correctness (`psychicCitadelBonus` confirmed
absent from `derived-calculator.js`'s persisted Will breakdown fields), the
talent-helper consolidation's exact call-site preservation, the vehicle SR
dual-write, the droid degree dual-write divergence, the `template.json`
defaults' safety (verified against `firstPresent()`'s exact semantics, and
confirmed there are zero other readers of the 11 declared fields anywhere
in the repo), and the CI failure's direct reproduction on `origin/main` —
held up as documented. Full structured compliance matrix, per-fix
verification table, runtime-blocker matrix, and final phase gate delivered
separately as the compliance report; verdict:
**PHASE 2 COMPLETE WITH DOCUMENTED RUNTIME BLOCKERS**, gate
**PHASE 3 MAY BEGIN WITH EXPLICIT RUNTIME EXCLUSIONS**.
