# Droid Stabilization Phase 1 — Authority Consolidation

This is an implementation phase, not a static audit. It follows up on
`docs/audits/droid-static-audit.md`, whose headline finding was that droid
construction, installed systems, derived modifiers, and inventory did not
share one authoritative data model. Every claim from that audit was
re-verified against the live code before anything was changed; several
turned out to be more (or, in one case, less) severe than first reported,
and those differences are called out below.

## Scope

**In scope for this phase:**

- Mapping the real (not assumed) authority graph of every droid-part
  schema, registry, and installation representation, and every live
  consumer of each.
- Selecting one canonical droid-part registry and documenting the others'
  status.
- One canonical, dependency-free normalization function for droid-part
  identity (confirmed as an existing export, not newly invented).
- One normalized, canonical-identity-deduplicated installed-component read
  model (`resolveInstalledDroidComponents`) covering
  `system.installedSystems`, `system.droidSystems`, embedded Items, and
  legacy `system.droidSystems.mods`.
- A defined, deterministic source-precedence policy with conflict
  reporting.
- Eliminating cross-source duplicate modifier application in
  `ModifierEngine`.
- Migrating the safest read consumers (`DroidSystemsResolver`,
  `DroidCustomizationEngine.collectInstalledDroidPartIds`) to the shared
  resolver.
- Fixing the classification defects the new resolver/predicates directly
  expose: integrated-lightsaber double classification, processor Items
  disappearing behind a builder record, locomotion Items being ignored,
  weaponized accessories vanishing from both regions, and dedup-by-local-id
  instead of canonical id.
- An opt-in developer diagnostic and a narrow static SSOT guard.
- A focused automated test suite for the new authority seam.

**Explicitly NOT done in this phase** (see "Deferred work"):

- A complete Garage write-model rewrite.
- Automatic embedded-Item creation/deletion on Garage install/remove.
- Stock-droid statblock preservation.
- Droid repair/healing authority consolidation.
- Virtual droid-part attack/chat pipeline unification.
- Resolving the armor-required rule disagreement.
- Retiring the standalone legacy Droid Builder.
- Any world-actor migration.
- Live Foundry v13 runtime verification (this was a Node-only implementation
  pass; see "Runtime test matrix").

## Previous authority graph

Traced by following every import of the four modules named in the task,
not assumed from the prior audit:

| Module | Contains | Live consumers |
|---|---|---|
| `scripts/data/droid-part-schema.js` | `RAW_OVERLAY` (category/slot/cost/modifiers/weaponProfile per part id) over `DROID_SYSTEMS`; `getDroidPartDefinition`, `hydrateDroidPart`, `computeDroidPartCost`, `normalizeDroidPartId`, `isWeaponizedDroidPart`, `getSelfDestructDamage` | `DroidSystemsResolver` (sheet), `DroidCustomizationEngine` (Garage), `character-sheet.js` (self-destruct UI), `runtime-bugfix-hotfixes.js` + `chat-interaction-bridge.js` (virtual droid-part weapons) |
| `scripts/domain/droids/droid-part-schema.js` | `DROID_RULE_OVERLAYS` + `EXTRA_DROID_PARTS` (a **second**, independently-authored overlay with its own alias table `DROID_SYSTEM_ALIAS_OVERLAY` and its own category enum) over the same `DROID_SYSTEMS`; `resolveDroidSystemIdentity`, `actorMeetsDroidSystemRequirement`, `collectActorDroidSystemParts` | `scripts/data/prerequisite-checker.js` (feat/talent prerequisites, e.g. "requires Heuristic Processor"); `droid-system-definitions.js` |
| `scripts/domain/droids/droid-system-definitions.js` | Merges the module above with `LEGACY_DROID_SYSTEM_DEFINITIONS` — a **third**, wholly separate id scheme (`processor_basic`, `locomotion_walker`, snake_case, its own cost/effects shape) | `ModifierEngine._getDroidModModifiers()` (dynamically imported, installedSystems path — **fixed this phase**); `droid-slot-governance.js`; `droid-modification-factory.js` |
| `scripts/data/droid-systems.js` | Raw, schema-free source data (names, costs, availability) that both overlay schemas overlay | `droid-part-schema.js` (both), `droid-appendage-utils.js`, `droid-customization-engine.js`, `droid-suggestion-engine.js`, `unarmed-attack-helper.js`, `stock-droid-converter.js` |

**Correction to the prior static audit:** `droid-slot-governance.js` and
`droid-modification-factory.js` are not merely "not currently reachable
from the main UI" — they are **fully dead code**. Both are imported only by
`scripts/domain/droids/droid-transaction-service.js`, and nothing in the
repository imports that file (`grep -r "droid-transaction-service"` across
`scripts/` returns zero hits outside the file itself). Likewise,
`DroidBuilderApp` (the standalone legacy builder) is instantiated only by
`scripts/apps/stock-droid-conversion-dialog.js`, and `StockDroidConversionDialog`
itself has no importers anywhere in the codebase — so the legacy builder
chain is dead, not merely dormant. This doesn't change the remediation
recommendation (still retire-or-migrate later), but it changes the risk
classification: there is no live code path today that can "accidentally
reactivate" it by itself.

**Correction to the prior static audit (the other direction — this one is
worse than reported):** the static audit did not find a fourth writer to
`system.installedSystems`. It exists: `scripts/engine/upgrades/UpgradeService.js`
(a live "Upgrade Workshop" application, backed by `DroidCustomizationEngine.getAvailableSystems`
for its catalog) writes `installedSystems[upgradeId] = true` directly via
`ActorEngine.applyMutationPlan()` — bypassing `DroidCustomizationEngine.applyDroidCustomization()`
entirely. It never mirrors `system.droidSystems`, never runs the Garage's
cost/credit transaction, and its `removeUpgrade()` deletes by **array
index into `Object.keys(installedSystems)`**, which is not stable if the
ledger is ever iterated in a different insertion order. This is the actual
origin of the "boolean-valued installedSystems entry" scenario the original
audit described hypothetically — it is real, live, and reachable today. It
is also the reason a droid's Systems tab could previously show a component
as entirely missing despite it being mechanically active: the sheet
resolver never read `installedSystems` at all before this phase.

**Correction to the prior static audit (`use-droid-part` click handler):**
the prior audit classified the initial click path as "unproven by static
search." It is proven: `scripts/sheets/v2/character-sheet.js` registers a
delegated `click` listener for `[data-action='use-droid-part']` that calls
`this._useDroidPartFromButton(useButton)`. Only the damage-reconstruction
hotfix dependency (finding retained, see Deferred work) was accurately
unresolved.

## Canonical registry decision

**`scripts/data/droid-part-schema.js` is the canonical droid-part
definition authority** for category, slot, cost, description, modifiers,
weapon profile, features, and restrictions. This was confirmed, not
assumed, from the import graph above: it is the only schema the Garage
(`DroidCustomizationEngine`), the sheet (`DroidSystemsResolver`), the
character sheet's self-destruct UI, and both virtual-weapon reconstruction
call sites (`runtime-bugfix-hotfixes.js`, `chat-interaction-bridge.js`)
already depend on. Both files now carry a header comment stating this
explicitly, with a pointer to this document.

`scripts/domain/droids/droid-part-schema.js` was **not** made a thin facade
over the canonical registry in this phase. It solves a materially
different problem — uuid/id/name/alias/trait-based identity resolution for
`prerequisite-checker.js` (`resolveDroidSystemIdentity`,
`actorMeetsDroidSystemRequirement`, `collectActorDroidSystemParts`) — using
its own short-id space (`heuristic`, `walking`, `hand`) that differs from
the canonical registry's ids (`heuristic-processor`, `walking`, `hand` —
they agree for locomotion/appendage ids today but diverge for processors).
Rewriting it to delegate to the canonical registry would have meant
re-deriving every feat/talent prerequisite category mapping
(`processorEnhancement`, `locomotionEnhancement`, etc., which have no
equivalent in the canonical registry's flatter category set) with real risk
of silently changing which droids satisfy which prerequisites — explicitly
out of scope ("do not change unrelated... feat, talent... behavior"). Both
files now carry header comments cross-referencing each other and this
document so a future reader does not have to re-discover which one to
trust for which purpose.

## Compatibility strategy

| Module | Status after Phase 1 |
|---|---|
| `scripts/data/droid-part-schema.js` | **Canonical.** All new modifier/cost/weapon-profile logic goes here. |
| `scripts/domain/droids/droid-part-schema.js` | **Compatibility — prerequisite/identity only.** Left functionally unchanged. Do not add cost/modifier logic here. |
| `scripts/domain/droids/droid-system-definitions.js` | **Compatibility facade, no longer in the modifier path.** Retains its private `LEGACY_DROID_SYSTEM_DEFINITIONS` catalog only because `droid-slot-governance.js`/`droid-modification-factory.js` still import it; both of those are dead code (see above). Header comment now states not to add new consumers. |
| `scripts/domain/droids/droid-slot-governance.js`, `droid-modification-factory.js`, `droid-transaction-service.js` | **Dormant/dead, left untouched.** Not retired in this phase (that is Garage/Builder-retirement work, explicitly deferred); flagged here so a future phase doesn't need to re-discover their reachability from scratch. |
| `scripts/apps/droid-builder-app.js`, `scripts/apps/stock-droid-conversion-dialog.js` | **Dead, left untouched.** Same reasoning. |

No file was deleted. No existing consumer's import path was removed.

## Installed-component resolution contract

New module: `scripts/domain/droids/droid-installed-component-resolver.js`,
exporting `resolveInstalledDroidComponents(actor, { normalizeId, getDefinition })`.

**Design constraint:** the module has zero imports. It does not import the
canonical schema directly — production callers inject
`normalizeDroidPartId`/`getDroidPartDefinition` from
`scripts/data/droid-part-schema.js` as `normalizeId`/`getDefinition`. This
keeps the resolver a pure adapter (no new droid-part catalog, matching the
architecture constraints) and — as a direct, load-bearing consequence — lets
it run under plain Node without a Foundry runtime, which is how this
repository's entire `tests/*.test.mjs` suite works (every test file that
exercises production code picks a zero-import module for exactly this
reason, confirmed by inspecting `modifier-breakdown-builder.js` and
`attack-outcome-resolver.js`, the two existing production modules under
test).

**Canonical identity:** `normalizeDroidPartId` (already existed in the
canonical schema) is the single normalization function. No second
normalizer was introduced. Alias resolution happens once, at the registry
boundary, exactly as the task required.

**Sources read, one candidate list per source:**

1. `system.installedSystems` — values may be `false`/`null` (not
   installed), `true` (legacy boolean writer — `UpgradeService`), or an
   object (`{ installed, enabled, active, category, slot, ... }` — Garage
   writer). All three shapes are respected for active-state purposes.
2. Embedded actor Items — only counted as a candidate when they carry
   credible droid-part metadata (`system.droidPartId`,
   `flags.swse.droidPartId`, `system.droidPart.id`, `system.integrated`,
   `flags.swse.integrated`, or a droid-only item type). A generic Item
   whose name merely resembles a catalog part is never treated as
   installed hardware.
3. `system.droidSystems` structured records — `processor`, `locomotion`,
   `armor`, the `backupProcessor`/`processorSlots.backup` mirror, and the
   array slots (`appendages`, `sensors`, `weapons`, `accessories`,
   `integratedSystems`, `processorEnhancements`, `locomotionSystems`,
   `secondaryLocomotion`).
4. `system.droidSystems.mods` — a mod is folded into its matching canonical
   component only if it actually resolves against `getDefinition()`;
   otherwise it is returned separately as a freeform legacy modification
   (never silently dropped, never guessed into a phantom component).

**Deduplication:** always by canonical part id — never by embedded-Item
document id, array index, or display name alone.

**Precedence** (highest first): installed ledger → embedded Item → droid
systems record → legacy mod → (no name-only fallback authority; a name
match with no supporting marker is not a candidate at all, per point 2
above). The highest-precedence source that mentions a component determines
its effective `installed`/`enabled`/`active` state. Every other source that
mentions the same canonical id is preserved in `sources[]` for diagnostics,
and if a lower-precedence source disagrees on active state, a `conflicts[]`
entry is recorded — nothing is silently overwritten.

**Processor safety net:** SWSE only allows one active processor at a time.
Beyond respecting whatever `active` flag each source already carries (the
Garage already writes `active:false` on backup-processor mirrors), the
resolver runs one defensive pass: if two components whose definition slot
is `processor.primary` both end up `active:true` (a malformed/ambiguous
state, not the normal path), only the first (deterministic, sorted by
canonical id) stays active; the rest are demoted with a recorded conflict.
This is a "fail safely" correction, not the primary mechanism — see the
resolver's own comments.

**Return shape:**

```js
{
  components: [{
    canonicalId, definition, installed, enabled, active,
    category, slot, sources: [{ kind, rawId, itemId, key, field, installed, enabled, active }],
    primarySource: { kind, rawId }, conflicts: [...], legacy
  }],
  legacyModifications: [{ id, name, enabled, modifiers }],
  conflicts: [...],
  warnings: [...]
}
```

No actor mutation, no item mutation, no I/O.

## Modifier behavior

`ModifierEngine._getDroidModModifiers()` previously ran three independent
passes with no shared identity (see the previous-authority-graph table
above). It now:

1. Calls `resolveInstalledDroidComponents()` once.
2. For every **active** component with a resolved `definition`, hydrates it
   through the canonical schema's `hydrateDroidPart()` (preserving existing
   combo-modifier behavior, e.g. Magnetic Feet + Magnetic Hands) and emits
   one modifier per (component, target) pair, with `sourceId =
   "droid-part:<canonicalId>:<target>"` — stable across renders and
   independent of embedded-Item document ids or array order.
3. For components whose `definition` could not be resolved, logs a warning
   and skips them (fails closed) instead of silently emitting nothing or
   throwing.
4. For genuinely freeform `resolution.legacyModifications` (mods with no
   canonical catalog identity), applies their stored `modifiers` array
   directly, same as before.
5. Logs any `resolution.conflicts`/`resolution.warnings` at `warn` level.

**Confirmed, intentional behavior change:** a `droidSystems.mods` entry
whose id/name *does* resolve against the canonical registry no longer
applies its own stored `modifiers` array — it is folded into that
canonical component and contributes the canonical definition's modifiers
instead (required by, and directly tested by, "a catalog-backed legacy mod
does not double-apply with the canonical component"). Previously every mod
in `droidSystems.mods` applied its stored modifiers unconditionally,
regardless of whether its id happened to match a catalog part. This is the
intended fix for the double-counting risk the static audit flagged, not a
side effect — but it is called out here explicitly because it changes
real, if likely rare, on-actor behavior for any legacy mod that happened to
reuse a canonical id with different bespoke modifier values.

`getDroidSystemDefinition`/`DROID_SYSTEM_DEFINITIONS` (the domain-side
merged registry, including the private `LEGACY_DROID_SYSTEM_DEFINITIONS`
catalog) are no longer imported by `ModifierEngine` at all.

## Confirmed fixes

All of the following were reproduced against the pre-Phase-1 code before
being fixed, and are covered by `tests/droid-installed-component-resolver.test.mjs`
and `tests/droid-item-classification.test.mjs` (40/40 passing, including
the pre-existing 38 non-droid tests, run via `node tools/run-rolling-tests.mjs`):

- **Cross-source modifier double-counting** (installedSystems + droidSystems
  + embedded Item for the same physical part) — fixed by the shared
  resolver + single-emission `ModifierEngine` pass.
- **`installedSystems` entries ignoring `installed`/`enabled`/`active: false`**
  — fixed; a disabled entry (boolean `false` or object with any of those
  flags false) no longer contributes modifiers or shows as active.
- **Legacy `droidSystems.mods` double-applying against a canonical
  component with the same id** — fixed.
- **Integrated lightsaber classified as both weapon and equipment** — fixed
  in `scripts/domain/droids/droid-item-classification.js`
  (`isIntegratedEquipmentItem` now excludes `lightsaber` the same way it
  already excluded `weapon`), consumed by `DroidSystemsResolver`.
- **Embedded processor Item disappearing from the sheet whenever a builder
  processor record exists** — fixed; `_resolveProcessor()` now merges
  builder and Item processors instead of discarding the Items.
- **Actor-owned locomotion Items ignored entirely** — fixed;
  `_resolveLocomotion()` now includes Items matching the same
  `droidSystemType`/`droidPartType`/name-hint convention already used for
  appendages.
- **Weaponized accessories vanishing from both Integrated Equipment and
  Integrated Weapons** — fixed via `partitionWeaponizedParts()`: the
  equipment region now exposes its filtered-out weaponized parts on
  `region.weaponized` instead of discarding them, and the weapons region
  reads that field directly instead of re-filtering the already-filtered
  equipment list.
- **Dedup by local document id instead of canonical identity** — fixed;
  `DroidSystemsResolver._mergeDedupe()` now keys on the canonical `ruleId`
  first, falling back to id/name only when no canonical id was resolved.
- **Components installed only through the Upgrade Workshop being invisible
  on the Droid Systems sheet tab** (a gap beyond the original static audit,
  discovered while re-verifying it — see "Previous authority graph") —
  fixed; `DroidSystemsResolver` now folds in any resolver component whose
  primary source is the installed ledger and that has no matching
  `droidSystems`/Item record, routed into the correct region by canonical
  category.
- **`DroidCustomizationEngine.collectInstalledDroidPartIds()`** (Garage
  "already installed" eligibility check) now sources its id set from the
  shared resolver instead of its own id/name matching, so it agrees with
  the sheet and with `ModifierEngine`.

## Deferred work

Retained for later phases, per the task's own list, unless this phase
necessarily touched them:

- Complete Garage write reconciliation (install/remove atomically
  synchronizing `installedSystems`, `droidSystems`, and embedded Items in
  one transaction). Phase 1 makes the *read* side agree across all three;
  it does not change what Garage installation/removal *writes*, and it does
  not touch `UpgradeService`'s direct `installedSystems` writes.
- Automatic embedded-Item creation/deletion on install/remove.
- Stock-droid statblock preservation (the derived-recalculation-overwrites-
  published-stats risk from the static audit).
- Droid repair/healing authority consolidation.
- Virtual droid-part attack/chat pipeline unification (the
  `runtime-bugfix-hotfixes.js` reconstruction path is unchanged; it still
  works, since it goes through the same canonical `hydrateDroidPart`/
  `getSelfDestructDamage` this phase confirmed as canonical).
- The armor-required rule disagreement between `DroidValidationEngine`,
  `DroidSystemsResolver` (still `required: false` for armor — unchanged
  this phase), and the progression builder.
- Retirement of the dead standalone Droid Builder / `StockDroidConversionDialog`
  chain (confirmed fully dead, not merely dormant, in this phase — see
  above — but not deleted, since deletion of dead code is not what this
  phase was scoped to do).
- Full world-actor migration.
- Live Foundry v13 runtime verification.

## Runtime test matrix

Static/Node-only checks (syntax, unit tests, guards) were run and are
reported below. The following still need a live Foundry v13 session before
this work can be called runtime-verified:

1. **Existing droid actor, Garage-only history:** open the Droid Systems
   tab; confirm processor/locomotion/appendages/armor/sensors/integrated
   panels render identically to before (no visual regression from the
   `_mergeDedupe`/classification changes).
2. **Droid with an integrated lightsaber:** confirm it now appears only
   under Integrated Weapons, not also under Integrated Equipment.
3. **Droid with a processor installed as both a Garage builder record and
   an embedded Item** (a pre-existing-data scenario, e.g. from an older
   save): confirm the sheet shows one processor entry, not two, and
   `ModifierEngine` applies its bonuses once (inspect via
   `diagnoseDroidAuthority(actor)` from `scripts/debug/droid-authority-diagnostics.js`).
4. **Install a system through the Upgrade Workshop app** (not the Garage):
   confirm it now appears on the Droid Systems sheet tab in the correct
   region and contributes its modifier exactly once; confirm removing it
   through the Workshop's `removeUpgrade()` doesn't leave a stale sheet
   entry.
5. **Disable a component** (set `installedSystems[id].enabled = false` or
   `= false` directly, e.g. via a macro): confirm it no longer contributes
   modifiers and confirm `diagnoseDroidAuthority()` reports it as
   installed-but-inactive.
6. **Backup processor scenario:** install a primary processor, install
   Backup Processor, install a second processor into the reserve slot;
   confirm only the primary grants modifiers and the sheet shows both.
7. **Weaponized accessory** (e.g. Taser or High-Speed Cutting Torch)
   installed via the Garage as an accessory: confirm it appears under
   Integrated Weapons and is rollable, and does not also appear under
   Integrated Equipment.
8. **Locomotion installed as an embedded Item** (not a Garage builder
   record): confirm it appears in the Locomotion region.
9. **Linked and unlinked token droids:** repeat scenario 3 on both, since
   `resolveInstalledDroidComponents` reads `actor.system`/`actor.items`
   generically and has not been runtime-verified against Foundry's token
   actor-data delta behavior.
10. **Existing feat/talent prerequisite checks** referencing droid systems
    (e.g. a feat requiring Heuristic Processor): confirm unchanged, since
    `scripts/domain/droids/droid-part-schema.js` and
    `prerequisite-checker.js` were deliberately left untouched.

## Validation performed (this phase, Node-only)

- `node tools/run-rolling-syntax-check.mjs` — 2089 files, all pass
  `node --check` (2 pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — 40/40 passed (5 pre-existing,
  documented, unrelated Force-power-track exclusions), including the two
  new droid test files.
- `node tools/check-droid-authority-ssot.mjs --strict` — new guard, passes;
  verified it actually detects a violation by temporarily adding a fake
  competing catalog file and confirming a nonzero exit before removing it.
- `node tools/check-combat-math-ssot.mjs --strict`,
  `check-attack-outcome-ssot.mjs --strict`,
  `check-critical-confirmation-guard.mjs --strict`,
  `check-reroll-supersession-guard.mjs --strict`,
  `check-vehicle-attack-routing-guard.mjs --strict`,
  `check-full-attack-reroll-guard.mjs --strict`,
  `check-vehicle-crew-assignment-guard.mjs --strict`,
  `check-vehicle-crew-runtime-ux-guard.mjs --strict` — all still pass
  (unaffected pre-existing guards, run to confirm no regression).
- `bash tools/check-mutation-paths.sh` — passes (this phase added no
  `actor.update()`/`item.update()` calls; the new resolver is pure).
- No existing droid-specific tests existed before this phase (confirmed by
  `docs/audits/droid-static-audit.md`'s own test assessment and by
  searching `tests/` for "droid" — zero pre-existing files), so "existing
  Garage pricing tests remain unchanged" has nothing to regress against;
  the two new test files are the first droid-specific coverage in the
  repository.

No live Foundry v13 instance was launched. Everything above is Node-only
static/unit verification, consistent with how every prior phase in this
repository's CI has been validated (see `.github/workflows/rolling-system-validation.yml`).
