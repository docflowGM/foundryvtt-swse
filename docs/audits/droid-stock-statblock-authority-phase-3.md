# Droid Stabilization Phase 3 — Stock-Droid Statblock Authority and Playable Conversion

This is the expanded Phase 3 work, landed on the same branch as Phase 2
(`fix/droid-authority-consolidation-phase-2`) and folded into the same PR
(#937). It supersedes the scope of the earlier, lighter-weight
`docs/audits/droid-authority-consolidation-phase-3.md` (kept as-is for
history — its mode-adapter API has since been replaced, see below) with a
fuller calculation-mode contract, an explicit conversion service with
rollback, a progression guard, sheet controls, and a dedicated static
authority guard.

## Baseline at the start of this phase

- Branch: `fix/droid-authority-consolidation-phase-2`.
- PR #937 (draft, targets `main`) already carried Phase 2 (installation
  write authority) plus the earlier, lighter Phase 3 pass (the
  `isDroidStatblockMode`/`buildConvertDroidToPlayableModeUpdate` API
  described in `-phase-3.md`).
- Phase 1/2 policies (canonical part registry, installed-component
  resolver, `DroidCustomizationEngine`/`UpgradeService` installation write
  authority, embedded-Item reconciliation) are unchanged by this phase —
  re-verified, not re-implemented.
- Neither #936 nor #937 was merged, retargeted, or closed during this
  phase. No new branch or PR was created.

## Why the earlier Phase 3 pass needed replacing, not just extending

The earlier pass's `buildConvertDroidToPlayableModeUpdate(actor)` returned
a raw mutation-plan fragment for the caller to apply via
`actor.update(...)` directly (documented in its own audit as reachable
"only via a GM console/macro call"), and its
`computeStatblockDerivedOverrides()` wrote to two wrong field paths that
this phase's re-verification caught by tracing the actual consumer code
rather than trusting the earlier doc's claims:

- `system.derived.bab` is a **plain number**
  (`scripts/actors/derived/derived-calculator.js` does
  `updates['system.derived.bab'] = bab`). The earlier pass wrote to
  `system.derived.attacks.bab`, which no consumer reads.
- `system.derived.damageThreshold` is **flat**, not nested. Confirmed by
  an existing comment in `scripts/sheets/v2/character-sheet.js`: "CRITICAL:
  DerivedCalculator stores at derived.damageThreshold (flat), not
  derived.damage.threshold." The earlier pass wrote to
  `system.derived.damage.threshold`.
- **Initiative was not handled at all.** The sheet reads
  `derived?.initiative?.total ?? derived?.initiative ?? 0` — a statblock
  droid with no override here would silently show Initiative `0`.

Both defects would have made the earlier pass's own preservation claim
false in practice — the sheet would still have shown wrong numbers for
BAB, Damage Threshold, and Initiative even with `isDroidStatblockMode`
correctly stopping the async derived pass. This phase fixes all three and
adds a fourth: a severe double-count in the attack-roll pipeline (below).

## Stock-droid lifecycle, traced end-to-end

1. **Import** — `StockDroidImporterEngine._buildActorFromStatblock()`
   (`scripts/engine/import/stock-droid-importer-engine.js`) builds
   `actor.system` from a normalized statblock record and writes
   `system.droidCalculationMode = 'stock-statblock'` explicitly, plus
   `flags.swse.stockDroidImport` carrying `schemaVersion` (bumped to `2`
   this phase), `originalActorSnapshot` (a full deep-clone of the
   constructed `system` object, for exact rollback), and the pre-existing
   `publishedTotals` (a compact, normalized form several read-only
   consumers already use). Each integrated weapon Item created from the
   statblock's attack list gets `flags.swse.stockDroidAttack =
   {publishedAttackTotal, publishedDamage, mode, sourceStatblock: true}`.
2. **Derived preparation** — `computeDroidDerived()`
   (`scripts/actors/v2/droid-actor.js`) always ensures droid-systems
   defaults and calls `computeCharacterDerived()`, then — only if
   `isDroidStatblockMode(actor)` is true — calls
   `applyPublishedStatblockDerivedOverrides(system)`, which mirrors the
   actor's own stored, published BAB/defenses/Damage
   Threshold/Initiative onto the exact `system.derived.*` paths real
   consumers read. `scripts/utils/hardening.js#shouldSkipDerivedData`
   additionally stops the async `DerivedCalculator.computeAll()` pass from
   running at all for a statblock-mode droid, mirroring the existing NPC
   statblock pattern.
3. **Combat** — `resolveAttackBonus()`
   (`scripts/engine/combat/combat-roll-math.js`) calls
   `getStockAttackFlatBonus(actor, weapon)` before composing the normal
   BAB+ability+misc formula; a non-null result (only possible for a
   statblock-mode droid attacking with a weapon carrying
   `stockDroidAttack.sourceStatblock === true`) is used as the entire
   attack total, exactly once.
4. **Progression** — `launchProgression()`
   (`scripts/apps/progression-framework/progression-entry.js`) refuses to
   start for a droid actor still in stock-statblock mode, directing the
   user to convert first.
5. **Conversion** — an owner/GM can call
   `DroidStatblockConversionService.inspectConversion()` (read-only
   preview) and `convertToPlayableDerived()` (atomic mode flip +
   stock-attack neutralization, snapshotted for rollback) from new sheet
   buttons; `rollbackConversion()` restores the pre-conversion snapshot.
6. **Diagnostics** — `diagnoseDroidAuthority()`
   (`scripts/debug/droid-authority-diagnostics.js`) reports calculation
   mode, import provenance, published totals, conversion record, and every
   weapon's stock-attack contract for any droid actor, for GM/dev
   inspection.

## `DROID_CALCULATION_MODE` and `resolveDroidCalculationMode()`

`scripts/actors/droid/droid-mode-adapter.js` (zero imports — fully
Node-testable) defines:

```js
DROID_CALCULATION_MODE = { STOCK_STATBLOCK: 'stock-statblock', PLAYABLE_DERIVED: 'playable-derived' }
```

`resolveDroidCalculationMode(actor)` returns
`{mode, explicit, inferred, reason, warnings}` via two-tier resolution,
cheapest/most-authoritative first:

1. **`system.droidCalculationMode`** — explicit, wins whenever present and
   a recognized value. Written only by the stock importer (at creation,
   `'stock-statblock'`) and `DroidStatblockConversionService` (at
   conversion, `'playable-derived'`) — enforced by
   `tools/check-droid-calculation-mode-authority.mjs`. A present-but-
   unrecognized value fails safely to `playable-derived` (never throws)
   and is reported via `reason: 'malformed-explicit-value'` plus a
   warning, rather than silently trusting garbage as either mode.
2. **`flags.swse.stockDroidImport.importMode`** — legacy compatibility
   signal for droids imported before `system.droidCalculationMode`
   existed (schema version 1). Inferred, never mutates the actor;
   `buildRepairLegacyCalculationModeUpdate(actor)` produces the mutation
   fragment to make an inferred mode explicit, without changing what the
   mode actually is (throws if called on an actor whose mode is already
   explicit).
3. **Default: `playable-derived`.** An ordinary hand-built droid, a
   follower, or any droid with neither signal is never classified as
   stock merely for being type `'droid'`.

`isDroidStatblockMode(actor)` is the single boolean predicate built on
this resolver, used by `hardening.js` and `droid-actor.js`.
`isStockImportedDroid(actor)` is a separate, broader predicate (true
regardless of *current* mode) used for sheet provenance display.

## Published-total preservation, by domain (verified against real reads, not assumed)

| Domain | At risk? | Mechanism |
|---|---|---|
| BAB | Yes — fixed | `computeStatblockDerivedOverrides()` sets `system.derived.bab` from `system.bab ?? system.baseAttackBonus`. |
| Fortitude/Reflex/Will/Flat-Footed | Yes — fixed | Each defense's `.total` is mirrored from `system.defenses.<key>.total`, preserving any other existing sub-fields on the `system.derived.defenses.<key>` object via spread. |
| Damage Threshold | Yes — fixed | `system.derived.damageThreshold` (flat field, not nested) set from `system.damageThreshold`. |
| Initiative | Yes — fixed (new in this phase) | `system.derived.initiative` was never initialized by `computeCharacterDerived()` for a skipped-async droid; now set to `{dexModifier, adjustment: 0, total: system.initiative}` — `dexModifier` is read from whatever `computeCharacterDerived()` already produced (never invented) so a converted droid's later dex changes still compose correctly if this object is reused. |
| HP | No | `mirrorHp()` copies `system.hp.*` into `system.derived.hp` unconditionally, directly from the stored field, regardless of calculation mode. |
| Skills | No | `mirrorSkills()` falls back to each stored skill's own total when no `system.derived.skills[key].total` exists yet. |
| Attacks (display) | No | `mirrorAttacks()` reads each weapon Item's own `system.attackBonus`, which the importer already sets to the published total directly on the Item. |
| Speed | No | `computeCharacterDerived()`'s baseSpeed fallback chain already reads `system.speed` directly. |
| Damage Reduction | No | Read directly from `system.damageReduction`; nothing recomputes it from progression. |

Runtime state — current HP damage, conditions, temporary HP, active
effects — is untouched by any of this: `applyPublishedStatblockDerivedOverrides()`
only ever overwrites the four at-risk derived fields above, never
`system.hp.value`, the condition track, or effect documents.

## Stock attack contract, and the double-count bug it fixes

Each stock-imported weapon Item carries:

```js
flags.swse.stockDroidAttack = { publishedAttackTotal, publishedDamage, mode, sourceStatblock: true }
```

**Confirmed bug (traced, not assumed):** `getWeaponFlatAttackBonus(weapon)`
(`scripts/engine/combat/combat-stat-rules.js`) reads `weapon.system.attackBonus`
— the *same* field the stock importer sets to the published total — and
treats it as an ordinary flat/enhancement bonus meant to be **added** to
BAB+ability in `resolveAttackBonus()`'s normal composition. Without an
intercept, a stock droid's attack roll would have computed
`BAB + ability + (published total again, as an "enhancement")` —
double-counting the entire published total on top of BAB, a severe,
player-facing overpower bug.

**Fix:** `getStockAttackFlatBonus(actor, weapon)`
(`scripts/actors/droid/droid-mode-adapter.js`) is the single decision
point: returns the published total only when the actor is currently in
stock-statblock mode *and* the specific weapon's
`stockDroidAttack.sourceStatblock === true` with a finite
`publishedAttackTotal`; otherwise returns `null` and the caller falls
through to normal composition. `resolveAttackBonus()` calls this function
and uses a non-null result as the complete attack total — mirroring the
existing NPC statblock-flat-bonus pattern immediately above it in the same
function. The decision logic itself is a pure function in a zero-import
module, so it is directly unit-tested without needing
`combat-roll-math.js`'s much larger Foundry-dependent import graph.

Conversion neutralizes this per-weapon by setting
`sourceStatblock: false` (not deleting the flag, so rollback can restore
it exactly) — `getStockAttackFlatBonus` treats that as "no contract" and
falls through, so a converted droid's attacks compose normally.

## `DroidStatblockConversionService`

`scripts/domain/droids/droid-statblock-conversion-service.js` is the only
authority permitted to change `system.droidCalculationMode` after import
— enforced by the new static guard. Reuses existing, already-approved
primitives rather than inventing a transaction mechanism:

- **`inspectConversion(actor)`** — async, **non-mutating**. Reports current
  calculation mode, import provenance, published totals, canonical
  installed components (via Phase 1's `resolveInstalledDroidComponents`),
  every stock-attack-flagged weapon, and — read-only, via
  `DerivedCalculator.computeAll(actor)` (its return value is never merged
  into the actor) — a discrepancy report comparing published totals
  against what playable-derived math would currently produce. Discrepancies
  are reported for GM review, not treated as blockers: a published
  statblock legitimately diverging from classless-derived math is the
  expected case, not an error.
- **`convertToPlayableDerived(actor, options)`** — requires
  `game.user.isGM || actor.isOwner`. Snapshots the actor via
  `SnapshotManager.createSnapshot()` (the same snapshot store
  chargen/level-up already use), then applies a mutation plan via
  `ActorEngine.applyMutationPlan()` that sets
  `system.droidCalculationMode = 'playable-derived'`, stamps conversion
  metadata (`flags.swse.stockDroidConversion.{convertedAt, snapshotTimestamp,
  sourceName}`), and neutralizes every stock-attack weapon's
  `sourceStatblock` flag in the same plan's `update.items` bucket. On any
  failure, rolls back to the pre-conversion snapshot and reports the
  error rather than leaving a partial mutation. Does **not** invent
  classes, levels, feats, or talents, and does not touch the canonical
  `installedSystems` ledger — Phase 1/2 installation-authority policy is
  unaffected.
- **`rollbackConversion(actor)`** — requires the same owner/GM check.
  Restores the actor via `SnapshotManager.restoreSnapshot()` using the
  timestamp stored at conversion time; fails cleanly with a descriptive
  error if no conversion snapshot exists.

No direct `actor.update()`/`item.update()` call exists in this file —
verified both by reading it and by the static guard's check 6.

## Sheet controls

`templates/actors/droid/v2/partials/droid-build-status-card.hbs` gains a
narrow, permission-gated section driven by
`context-builder.js#buildStockStatblockControlsPanel()` — deliberately
kept separate from the pre-existing, unrelated `droid.garage.canConvert`
CTA (which targets the dead legacy full-Garage-build conversion dialog,
confirmed unreachable in Phase 1/2, and is not reused or conflated here):

- **Stock mode**: "Inspect Conversion" (always, if owner/GM) and "Convert
  to Playable" (same gate) buttons.
- **Converted mode** (playable-derived with a conversion record present):
  "View Original Statblock" and "Roll Back Conversion" (if a snapshot
  timestamp exists) buttons.
- **Non-owner/non-GM**: sees only the mode status badge, no action
  buttons — `canAct` gates every button in the template, and the service
  independently re-checks permission itself (`canActOnConversion`), so a
  crafted client-side action call still fails server-side.

`scripts/sheets/v2/character-sheet.js` wires four `data-action` handlers
(`inspect-droid-conversion`, `convert-droid-to-playable`,
`view-original-droid-statblock`, `rollback-droid-conversion`) into the
existing droid-systems-tab delegated click listener, each a thin wrapper
that dynamically imports the conversion service and formats its result
via `SWSEDialogV2` — no conversion or permission logic lives in the sheet
itself.

## Progression gate

`launchProgression(actor, options)`
(`scripts/apps/progression-framework/progression-entry.js`) checks
`actor.type === 'droid' && resolveDroidCalculationMode(actor).mode ===
DROID_CALCULATION_MODE.STOCK_STATBLOCK` immediately after the existing
owner-synced-minion guard, and returns early with a user-facing warning
notification directing the user to convert first, instead of allowing a
stock droid to enter level-up/chargen progression while frozen.

## Installation-authority interaction (Phase 1/2 unaffected)

Nothing in this phase changes `system.installedSystems`/
`system.droidSystems` write authority. `resolveInstalledDroidComponents()`
is called read-only from `inspectConversion()` for reporting; conversion
itself never touches the ledger. A converted (now playable-derived)
droid's published `droidSystems` blob remains exactly what the importer
wrote — reconciling it into Garage-editable canonical components remains
deferred (see "Recommended Phase 4").

## Diagnostics

`diagnoseDroidAuthority()` now additionally returns a `stockStatblock`
block: `calculationMode` (full resolver output), `importSource`,
`publishedTotals`, `conversionRecord`, and `stockAttackContracts` (one
entry per weapon Item carrying the flag). `summary()` includes the
resolved mode, its explicit/inferred/default provenance, and any mode
warnings alongside the pre-existing component/conflict/drift lines.

## Static guards

`tools/check-droid-calculation-mode-authority.mjs` (report-only by
default, `--strict` exits non-zero) — seven checks:

1/2. `system.droidCalculationMode` is assigned only by the stock importer
   and the conversion service.
3. `stockDroidAttack.publishedAttackTotal` is referenced only by the
   approved read/write sites (`combat-roll-math.js` — via the mode
   adapter's `getStockAttackFlatBonus`, which is also allowlisted since it
   now holds the logic — `stock-droid-importer-engine.js`,
   `droid-statblock-conversion-service.js`, `character-sheet.js`,
   `droid-authority-diagnostics.js`); nowhere else, so a second attack-math
   path can't quietly reappear.
4. `droid-actor.js` still calls both `isDroidStatblockMode()` and
   `computeStatblockDerivedOverrides()` — guards against the preservation
   seam being quietly deleted while the mode adapter stays intact.
5. `convertToPlayableDerived()` is called only from the sheet's explicit
   button handler and the service itself — not from the
   prepare/render/actor-lifecycle pipeline, which would make conversion
   happen automatically.
6. The conversion service contains no direct `actor.update()`/
   `item.update()`.
7. No file outside `droid-mode-adapter.js`/the stock importer/the
   conversion service checks the legacy flag or the explicit field
   against a literal mode string — everything must go through
   `resolveDroidCalculationMode()`/`isDroidStatblockMode()`.

Verified working, not just written: ran clean (0 violations, 1912 files
scanned), then confirmed it actually catches injected violations by
temporarily adding a fake independent mode-writer file (checks 1/2) and a
fake literal-mode-string-check file (check 7), observing nonzero exit and
the correct violation reported for each, then deleting both temp files
and re-confirming a clean pass.

Phase 1/2's `check-droid-authority-ssot.mjs` and
`check-droid-installation-write-authority.mjs` are unchanged and still
pass.

## Test suite

`tests/droid-mode-adapter.test.mjs` (zero-import module, real Node
assertions — no mocking) was rewritten in full for the new API: **25 test
blocks, 62 assertions**, covering:

- Mode resolution — explicit field wins over a contradicting legacy flag;
  malformed explicit value fails safely with a warning, not a throw;
  legacy statblock/playable inference when no explicit field is present;
  default (no signal) resolves playable; non-droid/null/undefined actors
  always resolve playable.
- `isDroidStatblockMode`/`isStockImportedDroid` predicates across all of
  the above actor shapes.
- `buildRepairLegacyCalculationModeUpdate` — correct fragment for both
  legacy statblock and legacy playable inference; throws on an
  already-explicit actor.
- `computeStatblockDerivedOverrides` — full BAB/defenses/Damage
  Threshold/Initiative extraction; `baseAttackBonus` fallback; all-missing
  input omits fields as `null`/`{}` rather than defaulting to `0`; partial
  defenses; Initiative `0` is preserved (not treated as absent); purity
  (does not mutate its input).
- `getStockAttackFlatBonus` — stock mode + properly-flagged weapon returns
  the published total; playable-derived mode never uses it even if the
  weapon still carries the contract; a neutralized
  (`sourceStatblock: false`) contract falls through; no-contract and
  `null`-weapon inputs fall through; non-finite `publishedAttackTotal` is
  rejected; non-droid actors never get the override.

**Honest scope of this test file relative to the wider 58-item
requirement list**: this repository's plain-Node test runner
(`tools/run-rolling-tests.mjs`) can only execute modules with zero
imports (or only relative imports of other zero-import modules) — every
other file touched this phase
(`droid-statblock-conversion-service.js`, `stock-droid-importer-engine.js`,
`progression-entry.js`, `context-builder.js`, `character-sheet.js`,
`droid-actor.js`, `combat-roll-math.js`) imports Foundry-only
absolute-path modules (`SWSELogger`, `ActorEngine`, `SnapshotManager`,
`Actor.create`, `game.user`, `ui.notifications`, etc.) and cannot be
loaded under plain Node at all, mocked or not, without a Foundry runtime.
This is a pre-existing constraint of the codebase, not something
introduced this phase. Given that constraint, the 58 required cases split
three ways:

- **Automated (Node, this file)**: everything above — mode resolution
  (all of the "1-7" category), the preservation-value-selection logic
  (BAB/defenses/DT/Initiative extraction, the "13-23" category's pure
  parts), and the stock-attack-bonus decision (the "24-31" category's
  pure decision logic, specifically the published-total-wins,
  playable-mode-never-uses-it, and neutralized-contract-falls-through
  cases).
- **Verified by static code inspection** (read the actual current source,
  confirmed the described behavior, but not exercised by an automated
  assertion): the stock importer's exact field writes (schemaVersion,
  originalActorSnapshot, publishedTotals, per-weapon stockDroidAttack
  shape — the "8-12" category); `DroidStatblockConversionService`'s
  inspect/convert/rollback control flow, its permission check, its use of
  `ActorEngine`/`SnapshotManager` instead of direct mutation, and its
  weapon-flag neutralization (the "32-46" and "47-50" categories);
  `resolveAttackBonus()`'s actual call site wiring to
  `getStockAttackFlatBonus` (confirmed by reading the current file, shown
  above); the progression-entry guard's placement and condition; the
  sheet's four button handlers and their owner/GM gating in both the
  template and the service. This document's code excerpts above are that
  inspection record, not a substitute for it.
- **Requires live Foundry runtime** (cannot be verified any other way):
  actual `Actor.create()` behavior end-to-end, actual snapshot
  create/restore against a real document, actual sheet rendering and
  button click behavior, actual permission enforcement against a
  non-owner/non-GM logged-in user, actual progression app launch being
  blocked in the running UI. See "Runtime test matrix" below — none of
  these have been executed; a live Foundry v13 instance was not launched
  during this phase.

Existing Phase 1/2 droid test files
(`droid-installed-component-resolver.test.mjs`,
`droid-item-classification.test.mjs`,
`droid-installation-reconciler.test.mjs`) were re-run, not modified, and
still pass unchanged — this phase's changes did not touch any of their
subject modules.

## Validation performed (this phase, Node-only — exact counts)

- `node tools/run-rolling-syntax-check.mjs` — **2096 files checked, all
  pass** (2 pre-existing, documented, unrelated exclusions:
  `tools/audit-nonheroic-weapon-damage.mjs`,
  `tools/audit-npc-source-attribution.mjs`).
- `node tools/run-rolling-tests.mjs` — **42 passed, 0 failed** (of 42 run;
  5 pre-existing, documented Force-power-track exclusions), including all
  4 droid test files (`droid-mode-adapter.test.mjs` rewritten this phase;
  the other 3 unchanged and still green).
- `node tools/check-droid-authority-ssot.mjs --strict` — pass (Phase 1
  guard, unaffected).
- `node tools/check-droid-installation-write-authority.mjs --strict` —
  pass (Phase 2 guard, unaffected).
- `node tools/check-droid-calculation-mode-authority.mjs --strict` —
  **new this phase**, 0 violations across 1912 scanned script files;
  separately verified to correctly detect both an injected fake
  mode-writer violation and an injected fake literal-mode-check violation
  before those temp files were deleted.
- `bash tools/check-mutation-paths.sh` — pass (this phase's only new
  mutation call sites route through `ActorEngine.applyMutationPlan`/
  `SnapshotManager`, already-approved authorities — no new direct
  `actor.update()`/`item.update()`/`ChatMessage.create()` call sites).
- The 8 pre-existing combat/vehicle SSOT guards
  (`check-combat-math-ssot.mjs`, `check-attack-outcome-ssot.mjs`,
  `check-critical-confirmation-guard.mjs`, `check-full-attack-reroll-guard.mjs`,
  `check-reroll-supersession-guard.mjs`, `check-vehicle-attack-routing-guard.mjs`,
  `check-vehicle-crew-assignment-guard.mjs`,
  `check-vehicle-crew-runtime-ux-guard.mjs`) — all still pass, unaffected;
  re-run specifically because this phase touched
  `scripts/engine/combat/combat-roll-math.js`, the file all of these
  guards care most about.
- `check-progression-integrity.mjs` and `check-architecture-boundaries.mjs`
  report pre-existing violation counts (44 and 37 respectively) that
  predate this phase and are unrelated to it — neither tool's output
  mentions `progression-entry.js` or any other file this phase touched;
  these are unaffected baselines, not new regressions.

No live Foundry v13 instance was launched. Every result above is a real,
Node-executed pass/fail — nothing here is mocked, skipped silently, or
asserted without having actually run.

## Runtime test matrix (documented, NOT executed)

The following require a live Foundry v13 instance and have not been run:

1. Import a stock droid; open its sheet; confirm BAB, all four
   defenses, Damage Threshold, and Initiative match the published
   statblock, not placeholder/zero values.
2. Reopen the same droid in a fresh session (first `prepareDerivedData`
   after load, not just an already-open sheet).
3. Roll an attack with a stock droid's integrated weapon; confirm the
   total equals `publishedAttackTotal` exactly, not
   `BAB + ability + publishedAttackTotal`.
4. Roll an attack with the same droid using a non-integrated (added)
   weapon with no `stockDroidAttack` flag; confirm normal composition
   applies.
5. Click "Inspect Conversion" as the owner; confirm the dialog shows
   mode, source, discrepancies (if any), and warnings without mutating
   the actor.
6. Click "Inspect Conversion" as a non-owner, non-GM player; confirm the
   button is not rendered at all.
7. Click "Convert to Playable"; confirm the confirmation dialog appears,
   cancelling leaves the actor untouched.
8. Confirm "Convert to Playable"; confirm `system.droidCalculationMode`
   flips to `playable-derived`, a snapshot timestamp is recorded, every
   integrated weapon's `stockDroidAttack.sourceStatblock` becomes `false`,
   and the sheet's derived BAB/defenses/DT/Initiative now reflect normal
   classless-derived math (likely near-zero/base, since no classes exist
   yet).
9. Roll an attack with the same weapon post-conversion; confirm it now
   composes normally (BAB + ability + any remaining weapon bonus) instead
   of using the old published total.
10. Click "Roll Back Conversion" on the now-converted droid; confirm the
    actor is restored to its exact pre-conversion state (mode, derived
    totals, weapon flags).
11. Attempt to call `convertToPlayableDerived`/`rollbackConversion`
    directly (e.g. console) as a non-owner, non-GM user; confirm the
    service itself rejects it even though the UI wouldn't have shown the
    button.
12. Attempt to launch progression/level-up on a droid still in
    stock-statblock mode; confirm it is blocked with the warning
    notification and no progression app opens.
13. Convert the same droid to playable mode, then attempt progression
    again; confirm it now launches normally.
14. A droid actor with a pre-Phase-3 legacy import (schema version 1, no
    `system.droidCalculationMode`, only
    `flags.swse.stockDroidImport.importMode`): confirm
    `resolveDroidCalculationMode` still infers the correct mode and the
    sheet/combat behavior is identical to an explicit-mode droid.
15. Apply `buildRepairLegacyCalculationModeUpdate` to that same legacy
    droid; confirm its effective mode is unchanged but `explicit` becomes
    `true` on subsequent resolution.
16. A droid actor with a malformed `system.droidCalculationMode` value
    (simulate via console `actor.update`): confirm it fails safely to
    playable-derived and does not throw when the sheet renders.
17. A droid follower created via `follower-creator.js`: confirm it is
    never classified as stock-statblock and derives normally, unaffected
    by this phase.
18. A hand-built droid actor (chargen, no stock import at all): confirm
    it resolves `playable-derived` by default and behaves exactly as
    before this phase.
19. Linked and unlinked token droids: repeat scenarios 1 and 3 on both.
20. A droid with multiple integrated weapons, only some carrying the
    stock-attack contract (e.g. after a partial hand-edit): confirm each
    weapon's attack roll is decided independently by
    `getStockAttackFlatBonus`.
21. GM converts a droid that a different player owns (GM permission path,
    not owner path): confirm it succeeds.
22. A player who owns the droid (not a GM) converts/rolls back: confirm
    both succeed under the owner path.
23. Attempt conversion on a droid actor that has no
    `flags.swse.stockDroidImport` at all (never stock-imported): confirm
    `inspectConversion` reports it as not currently in stock-statblock
    mode and `convertToPlayableDerived` refuses with a clear error rather
    than doing something undefined.
24. Re-run all of Phase 1's and Phase 2's runtime test matrices in full,
    on a droid actor that has also gone through this phase's stock
    import/conversion flow, to confirm no interaction regression between
    installation authority and calculation-mode authority.
25. "View Original Statblock" on a droid that has never been converted
    (still stock mode) and on one that has: confirm the dialog always
    shows the original import snapshot's totals in both cases.

## Remaining risks

- The runtime matrix above is entirely unexecuted; every claim about
  actual in-game behavior (sheet rendering, dialog behavior, real
  permission enforcement, real snapshot restore) rests on static code
  reading, not observed execution.
- `DroidStatblockConversionService` and the stock importer/progression
  guard have no Node-level automated test coverage — only the pure
  decision logic they call into (`droid-mode-adapter.js`) does. A future
  regression in these files' control flow (e.g. a change that calls
  `ActorEngine.applyMutationPlan` with the wrong plan shape) would not be
  caught by `tools/run-rolling-tests.mjs`.
- A converted (playable-derived) droid's `system.droidSystems` remains
  the flat, non-componentized blob the importer wrote — it is not
  reconciled into Garage-editable canonical `installedSystems` entries.
  A converted droid is playable but not yet fully Garage-manageable.
- The Phase 1 finding that `stock-droid-provenance-panel.hbs` is not
  included in any live sheet template was not re-investigated this
  phase; this phase's new controls live in
  `droid-build-status-card.hbs`, which is confirmed included (its
  pre-existing `sourceStatus`/`garage` sections already render), so this
  phase's own controls are not affected by that older, separate defect.
- `check-progression-integrity.mjs`/`check-architecture-boundaries.mjs`
  report pre-existing counts of 44 and 37 respectively; these were not
  investigated or reduced by this phase (out of scope) and should not be
  read as newly introduced by it.

## Recommended Phase 4

- Reconcile a converted stock droid's `droidSystems` blob into canonical
  `installedSystems` entries so it becomes fully Garage-editable, using
  Phase 1's canonical registry and Phase 2's installation-write authority.
- Live Foundry v13 execution of the 25-item runtime matrix above.
- Investigate and reduce the pre-existing `check-progression-integrity.mjs`/
  `check-architecture-boundaries.mjs` violation counts (44/37), which
  predate this entire droid-stabilization effort.
- Consider a lightweight in-repo Foundry-shim test harness (stub `game`,
  `Actor`, `ui.notifications`) so `DroidStatblockConversionService` and
  similar Foundry-dependent domain services can get real automated
  coverage without a full Foundry runtime — a repo-wide gap, not specific
  to droids.
