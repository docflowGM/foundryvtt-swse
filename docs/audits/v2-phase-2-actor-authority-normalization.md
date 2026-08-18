# Phase 2 — Actor Data-Model Authority Normalization

**Status:** Complete. Builds on the merged Phase 1 baseline
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
