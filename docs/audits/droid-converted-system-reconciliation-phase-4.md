# Droid Stabilization Phase 4 — Converted-System Reconciliation and Runtime Hardening

## Baseline

- Branch: `fix/droid-authority-consolidation-phase-2` (unchanged — no new branch created). Local `HEAD` was confirmed to match `origin/fix/droid-authority-consolidation-phase-2` before any edit began.
- PR #937 (draft) already carried Phase 2 (installation write authority) and the expanded Phase 3 (stock-statblock calculation-mode authority and playable conversion) work.
- PR #936 (Phase 1) and PR #937 both remained open, draft, and unmerged throughout this phase — re-verified via the GitHub API immediately before and after this phase's changes.
- Phase 1–3 assumptions carried forward unchanged and re-verified against current code (not re-derived from prior audit prose):
  - `scripts/data/droid-part-schema.js` is the canonical droid-part registry (Phase 1).
  - `system.installedSystems` is the canonical, ongoing installation ledger; `system.droidSystems` is a generated compatibility/display projection; embedded Items are nonauthoritative (Phase 2).
  - `DROID_CALCULATION_MODE` (`stock-statblock`/`playable-derived`), resolved by `resolveDroidCalculationMode(actor)`, is the single authority for whether a droid's published totals or normal derived math are authoritative (Phase 3).
  - `DroidStatblockConversionService` is the sole authority permitted to flip a droid's calculation mode (Phase 3).

## Stock-system source analysis (confirmed by reading the code, not assumed)

Traced the full lifecycle: stock import → stock-mode sheet/combat → optional Garage modification before conversion → conversion → converted-mode Garage use → rollback, across `stock-droid-importer-engine.js`, `droid-mode-adapter.js`, `droid-actor.js`, `droid-installed-component-resolver.js`, `droid-installation-reconciler.js`, `droid-customization-engine.js`, `UpgradeService.js`, `droid-statblock-conversion-service.js`, `ModifierEngine.js`, `droid-systems-resolver.js`, `droid-authority-diagnostics.js`, `combat-roll-math.js`, and `progression-framework/*`.

Key findings:

- `StockDroidImporterEngine._buildActorFromStatblock()` (`scripts/engine/import/stock-droid-importer-engine.js`) parses a published statblock's freeform text into `system.droidSystems` records via `StockDroidNormalizer` — e.g. `{ id: 'heuristic-processor', name: 'Heuristic Processor', sourceText: '...' }` — including explicit low-confidence defaults such as `sourceText: 'Default stock droid processor assumption'` when nothing in the source text actually described a system. This blob is written to **both** the live, mutable `system.droidSystems` (for sheet display) **and** an immutable copy at `flags.swse.stockDroidImport.publishedTotals.droidSystems` (the frozen import-time snapshot).
- **Confirmed, not assumed, real double-count bug**: `scripts/domain/droids/droid-installed-component-resolver.js#collectCandidates()` already reads `system.droidSystems`'s single-field slots (processor/locomotion/armor) and array fields (sensors/weapons/accessories/etc.) directly as `SOURCE_KIND.DROID_SYSTEMS_RECORD` candidates — reporting them as "active" components **regardless of whether they were ever written to `system.installedSystems`**, the canonical ledger. `ModifierEngine._getDroidModModifiers()` (called from `ModifierEngine.collectModifiers()`, itself invoked at every attack/damage/check roll via `CombatEngine`/`damage-resolution-engine.js` — **not** as part of derived-data computation) then applied every one of those components' modifiers unconditionally, with **no stock-mode awareness at all**. Since a stock droid's published skill/defense/etc. totals are already preserved as-is (Phase 3), and its raw `droidSystems` entries were simultaneously contributing live roll-time bonuses on top of those same preserved totals, this was a real, live double-count for any roll (a Perception check using a sensor package, a save using armor, etc.) that touches a modifier target the published-total preservation doesn't otherwise fully override. This is distinct from — and confirms a stronger, more general version of — the finding in `docs/audits/droid-converted-system-reconciliation-phase-4.md`'s own section 3 hypothesis about *future* reconciled components; it turned out to already be happening for *unreconciled* stock components too.
- `resolveInstalledDroidComponents()`'s source precedence (`installedLedger > embeddedItem > droidSystemsRecord > legacyMod`, Phase 1) means a component only ever escapes this risk once it has an actual `system.installedSystems` ledger entry.
- `DroidCustomizationEngine.applyDroidCustomization()` (the Garage/Workshop write authority, Phase 2) never backfills `installedSystems` for a stock droid's original published systems — it only ever adds *new* entries the GM explicitly purchases. This is by design (Phase 1/2's "do not automatically backfill" policy) but means a stock droid's original systems remain outside the canonical ledger — not Garage-editable, and (until this phase's fix) contributing uncontrolled roll-time bonuses — until explicitly reconciled.

## Confirmed fix: modifier double-application

`scripts/actors/droid/droid-mode-adapter.js` gains `shouldSuppressComponentModifiers(actor, component)`, a pure, unit-tested decision extracted the same way Phase 3 extracted `getStockAttackFlatBonus()` (`ModifierEngine.js` itself has a large Foundry-dependent import graph and cannot be loaded under plain Node, but the decision logic needed its own coverage):

```js
export function shouldSuppressComponentModifiers(actor, component) {
  if (component?.mechanicalState?.applyModifiers === false) return true;
  if (!isDroidStatblockMode(actor)) return false;
  const sources = Array.isArray(component?.sources) ? component.sources : [];
  return !sources.some(s => s?.kind === 'installedLedger');
}
```

`ModifierEngine._getDroidModModifiers()` now calls this once per component instead of unconditionally emitting modifiers for every active one. Policy:

- **Stock-statblock mode, component with no `installedLedger` source** (i.e. only ever appeared in the raw `droidSystems` blob or as an embedded Item/legacy mod with no ledger entry): suppressed — its bonus is already baked into the preserved published totals.
- **Stock-statblock mode, component WITH an `installedLedger` source** (a GM explicitly added it via Garage/Workshop to a still-unconverted droid — a legitimate new bonus, not a published one): applies normally.
- **Playable-derived mode**: the broad stock-mode suppression never applies — published totals are no longer authoritative once converted (see "Modifier policy" below); only an explicit `mechanicalState.applyModifiers: false` (a narrow, manual override this phase's reconciliation service can write but does not, by default — see below) suppresses a component's modifiers in this mode.
- Freeform `system.droidSystems.mods` entries (the legacy hand-authored builder field) are deliberately **not** suppressed by this rule even in stock mode — the stock importer never writes `.mods` at all (confirmed by reading `stock-droid-importer-engine.js`), so any content there was added by a GM as a house-rule modifier, not part of the published statblock.

## Reconciliation contract

New `scripts/domain/droids/droid-converted-system-reconciliation-service.js`, backed by a pure, zero-import classifier (`scripts/domain/droids/droid-converted-system-reconciliation-classifier.js`) so match/ambiguity decisions are directly unit-testable:

```js
inspectReconciliation(actor)                      // async, non-mutating, either calculation mode
buildReconciliationPlan(actor, selections, options) // async, non-mutating — builds a plan, does not apply it
applyReconciliation(actor, built, options)         // async, mutating, playable-derived mode only
rollbackReconciliation(actor)                      // async, mutating
```

**Reconciliation source**: `flags.swse.stockDroidImport.publishedTotals.droidSystems` (the frozen import-time snapshot) — **not** the live, Garage-mutable `system.droidSystems` mirror, which may already contain post-import additions merged into the same object by `DroidCustomizationEngine`. Reconciling against the frozen snapshot is what keeps "baked into published totals" and "added after import" reliably distinguishable.

Classification (`RECONCILIATION_CLASSIFICATION`), one candidate per canonical id (or per unmapped source path), deterministic order:

| Classification | Meaning | Auto-applicable? |
|---|---|---|
| `canonical-match` | Source record's `id` field resolves directly to a canonical part definition | Yes |
| `alias-match` | Source record's `name` (no id, or an id that didn't resolve) resolves via the canonical registry's own alias/suffix normalization, or uniquely via narrow fuzzy name matching | Yes |
| `ambiguous-match` | Name-only fuzzy matching found 2+ candidate canonical parts | **No — requires explicit human selection, never auto-applied** |
| `descriptive-only` | No id/name match, but the record carries narrative source text | **No — preserved as descriptive text only, never turned into a mechanical part** |
| `unsupported` | Malformed/empty record with nothing to preserve | **No** |
| `already-canonical` | Canonical id already has an `installedSystems` ledger entry (previously reconciled) | No — nothing to do |
| `post-import-modification` | Canonical id already has a ledger entry whose provenance is a genuine post-import Garage/Workshop addition | No — already applying modifiers correctly |

A weapon-specific pass (`annotateWeaponCandidatesAgainstExistingItems`) additionally marks any candidate whose canonical id matches an existing stock-attack-flagged weapon Item's `droidPartId` as already-represented — so reconciliation never proposes creating a second, redundant ledger entry for a logical weapon that already exists as a real Item (see "Weapon reconciliation" below).

`inspectReconciliation(actor)` is available in either calculation mode (a still-stock droid can preview what reconciliation would eventually offer), but `canApply` is only ever `true` once the droid is in playable-derived mode, and `applyReconciliation()` independently re-checks this and refuses otherwise — reconciliation never mutates a droid still in stock-statblock mode, per the explicit requirement that conversion and reconciliation stay separate, explicit actions (a caller may still choose to call both back-to-back from the sheet, but nothing forces or auto-triggers reconciliation as part of conversion itself).

## Provenance model

Canonical ledger entries (`system.installedSystems[id]`) gain two new, narrow fields — no existing field (`installed`/`enabled`/`active`) is overloaded to mean something new:

```js
{
  provenance: { origin: 'stock-import' | 'post-import-customization', sourcePath, importedAt, bakedIntoPublishedTotals, reconciledAt },
  mechanicalState: { applyModifiers: boolean }
}
```

- `DroidCustomizationEngine.#buildInstalledPartPayload()` (every ordinary Garage/Workshop install) now stamps `provenance: { origin: 'post-import-customization', bakedIntoPublishedTotals: false }` and `mechanicalState: { applyModifiers: true }` by default — a caller may override via `extra.provenance`/`extra.mechanicalState` (used only by the reconciliation service itself, enforced by the new static guard).
- `droid-installed-component-resolver.js` threads `provenance`/`mechanicalState` from the `installedLedger` source (the only tier this phase writes them to — never invented for embedded-Item/droidSystems/legacy-mod-only components) onto the resolved `component` object, so `ModifierEngine` and diagnostics can read them without re-deriving anything.

## Modifier policy (the actual decision, verified against the Phase 3 conversion implementation before adopting it)

**Recommended and implemented policy**: reconciliation only ever mutates an **already playable-derived** droid (see above) — at that point, the droid's published totals are no longer authoritative (Phase 3's `applyPublishedStatblockDerivedOverrides()` only runs in stock-statblock mode). So a reconciled component becomes an ordinary mechanical component and applies modifiers normally, exactly like an ordinary Garage install: `buildReconciliationPlan()` writes `mechanicalState: { applyModifiers: true }` for every newly-reconciled entry. `provenance.bakedIntoPublishedTotals: true` is kept for audit/history (it genuinely *was* part of the original statblock) but does not, by itself, suppress anything once the droid has converted — only `shouldSuppressComponentModifiers()`'s broader **stock-mode** rule does that, and reconciliation cannot run in stock mode. Any discrepancy between the droid's former published totals and its new playable-derived totals is expected and shown in `inspectReconciliation()`'s report, not treated as an error.

## Weapon reconciliation

Published stock attacks and published `droidSystems.weapons[]` records can describe the same physical weapon. Confirmed: the stock importer already creates a real, integrated weapon Item for every published attack (`buildWeaponItemsFromAttacks()`), so reconciliation's job is narrower than "map an attack to a weapon" — it is "don't also create a redundant ledger entry for a weapon that's already a real Item." `annotateWeaponCandidatesAgainstExistingItems()` does exactly this by canonical-id cross-reference against every `flags.swse.stockDroidAttack`-flagged Item's `droidPartId`. Reconciliation **never creates a new embedded Item** (enforced by static guard check 4) — it only ever writes `system.installedSystems` ledger entries. Stock attack neutralization (turning off the published-flat-total behavior on conversion) remains Phase 3's job (`convertToPlayableDerived()` already sets `sourceStatblock: false` on every stock-attack weapon); reconciliation does not touch weapon Items at all.

## Conversion interaction

Conversion (Phase 3) and reconciliation (this phase) remain two separate, explicit actions — neither calls the other. A GM may convert without ever reconciling (the droid becomes playable-derived with an un-Garage-editable `droidSystems` blob, exactly as Phase 3 left it), or convert and then separately reconcile. `DroidStatblockConversionService` was not modified to call reconciliation, and the reconciliation service's `applyReconciliation()` independently refuses to run on a still-stock droid — there is no code path where reconciliation happens as a side effect of conversion.

## Rollback (audited, one real gap found and fixed)

Audited `SnapshotManager.restoreSnapshot()` → `ActorEngine.restoreFromSnapshot()` → `SnapshotService.restoreFromSnapshot()` (`scripts/governance/snapshot/snapshot-service.js`) by reading the actual implementation, not assuming it. Confirmed: this was **already a genuine full-actor restore**, not a narrow snapshot pointer — it replaces `system` (name/img/prototypeToken too), and fully deletes-then-recreates every `Item` and `ActiveEffect` from the snapshot, all in one mutation sequence. This means conversion rollback (Phase 3) and the new reconciliation rollback both correctly restore calculation mode, the canonical ledger, the `droidSystems` projection, every published field, and every embedded Item (including stock attack contract flags) — no new snapshot mechanism was needed, satisfying "do not create a second snapshot system."

**One real gap found**: `restoreFromSnapshot()` never touches `actor.flags` at all. This means `flags.swse.stockDroidConversion`/`flags.swse.stockDroidReconciliation` — the *metadata about* a conversion/reconciliation — kept showing a stale "converted/reconciled at" record even after a successful rollback put the droid's actual mechanical state back to stock. **Confirmed cosmetic, not a mechanical bug**: `resolveDroidCalculationMode()` never reads these flags — only `system.droidCalculationMode`, which *is* correctly restored — so the mode resolution, derived preservation, and attack behavior were never actually wrong after rollback. But it made diagnostics/sheet history misleading. **Fixed**: both `rollbackConversion()` and `rollbackReconciliation()` now stamp a `rolledBackAt` timestamp onto their respective flag record immediately after a successful `SnapshotManager.restoreSnapshot()`, through the same `ActorEngine.applyMutationPlan()` authority — not a new mechanism, just closing a gap in an existing one. `droid-authority-diagnostics.js` surfaces `rolledBackAt` on both records and adds a new `reconciliationRecord` block alongside the existing `conversionRecord`.

Repeated conversion/reconciliation/rollback sequences were exercised directly (see "Tests" below): converting twice is a no-op the second time (mode resolver already reports playable-derived, so `convertToPlayableDerived()`'s own mode check refuses); reconciling twice only offers genuinely new candidates the second time (already-reconciled ones classify as `already-canonical` and are excluded from auto-apply); rolling back twice does not duplicate items (the fake-actor-engine test asserts `actor.items.length` is stable across two consecutive rollback calls).

## Installation-ledger interaction (Phase 1–2 unaffected, one reviewed, documented exception added)

Phase 1's `resolveInstalledDroidComponents()` and Phase 2's `DroidCustomizationEngine`/`UpgradeService` write authority are otherwise unchanged. **One deliberate, reviewed exception was required and added**: `tools/check-droid-installation-write-authority.mjs`'s allowlist now includes `droid-converted-system-reconciliation-service.js`, because reconciliation *does* write `system.installedSystems` directly (via `ActorEngine.applyMutationPlan`, never `actor.update()`) and is **not** a Garage/Workshop purchase — it charges no credits, and routing it through `DroidCustomizationEngine.applyDroidCustomization()` would incorrectly trigger `TransactionEngine`'s credit/audit-trail transaction machinery for something that isn't a transaction at all. This is the same category of exception the guard already grants the stock importer itself ("one-time creation-time writer" — reconciliation is, conceptually, a *deferred second phase* of that same import, finishing what it started once the droid becomes playable). The exception is narrow — enforced as its own single-purpose authority by the new `tools/check-droid-reconciliation-authority.mjs` guard (see below) — and was caught immediately by running the Phase 2 guard in strict mode during this phase's own validation, not discovered later.

## Diagnostics

`diagnoseDroidAuthority()` now also returns `reconciliationRecord` (`reconciledAt`, `snapshotTimestamp`, `reconciledIds`, `rolledBackAt`) alongside the existing `conversionRecord` (which itself gained `rolledBackAt`).

## UI and permissions

`droid-build-status-card.hbs` gains a second, separate card (distinct from Phase 3's calculation-mode card) driven by `context-builder.js#buildReconciliationControlsPanel()`: "Inspect Published Systems" (always, if owner/GM), "Reconcile Systems" (only if playable-derived with unreconciled auto-applicable candidates), "Roll Back Reconciliation" (only if a reconciliation snapshot exists). Non-owner/non-GM users see only the status badge. `character-sheet.js` wires three new `data-action` handlers (`inspect-droid-reconciliation`, `reconcile-droid-systems`, `rollback-droid-reconciliation`) as thin wrappers around the service — no classification or mutation logic lives in the sheet. Permission is enforced independently in the service (`canActOnReconciliation`), not just by button visibility — verified directly (not just by code reading) via the Foundry-shim tests: a non-owner, non-GM actor's direct `applyReconciliation()` call is rejected even when a perfectly valid plan is supplied.

The sheet's "Reconcile Systems" button only ever calls `buildReconciliationPlan(actor, [], { selectDefaults: true })` — i.e. it only ever auto-applies `canonical-match`/`alias-match` candidates; ambiguous and descriptive-only candidates are never offered a one-click apply path from this button (matching "ambiguous candidates require explicit confirmation" — in this phase, that confirmation takes the form of "not applied at all without a future, more granular selection UI," which is the safer of the two compliant options and is called out under "Remaining risks").

## Foundry-shim harness

`tests/helpers/foundry-shim/` is new, reusable test infrastructure:

- **`path-loader.mjs`** — a Node `module.register()` resolve hook that rewrites this repo's `/systems/foundryvtt-swse/...` absolute-path specifiers to the real file in this repo, so real production modules can be imported under plain Node — the root fix for the "most files can't be unit tested under Node" limitation documented in Phases 3 and 4. A small, explicit override map redirects exactly one specifier (`scripts/governance/actor-engine/actor-engine.js`) to a test-only fake instead of the real file — every other absolute-path specifier, including `SnapshotManager`, the droid mode adapter, the installed-component resolver, the droid-part schema, and the conversion/reconciliation services themselves, resolves to its real, unmodified file.
- **`globals.mjs`** — installs/resets narrow stubs for `foundry.utils`, `game.user`/`game.settings`, `ui.notifications`, `Actor`/`Item` (bare type markers only), `CONST`, `Hooks`. `resetFoundryShimGlobals()` fully replaces the shim rather than merging, so no state leaks between tests.
- **`fakes/actor-engine.fake.mjs`** — implements exactly the subset of `ActorEngine`'s public interface these services call (`applyMutationPlan`, `updateActor`, `restoreFromSnapshot`), mutating a plain fake-actor object synchronously; `restoreFromSnapshot` is a faithful reimplementation of the real `SnapshotService.restoreFromSnapshot()` (verified line-by-line against it during this phase's rollback audit), including its confirmed flags-not-restored limitation. `ActorEngine` itself was judged too heavy to load for real (it transitively imports most of the engine layer) — per the task's own explicit allowance, its approved public interface is stubbed rather than bypassed.
- **`fakes/actor-factory.mjs`** — `createFakeDroidActor()`, a minimal object implementing only what these services actually read: `.type`/`.system`/`.flags`/`.items`/`.isOwner`/`.id`/`.name`/`.toObject()`/`.getFlag()`.

**What this harness does NOT support** (documented, not silently glossed over): `scripts/apps/progression-framework/progression-entry.js` — the file containing the stock-mode progression guard — could **not** be loaded through this harness even with the path loader and global stubs in place; its own transitive imports (`ShellRouter`, `ActorAbilityBridge`, etc.) reach for Foundry surface well beyond this shim's narrow scope (`Cannot read properties of undefined (reading 'api')`, confirmed by attempting the import directly). That guard's behavior remains verified by static code inspection only (unchanged from Phase 3), not by an automated test — reported honestly below rather than claimed as covered.

## Integrity/architecture guard classification (exact counts, both tools)

Ran both tools before and after every Phase 4 change:

| Tool | Category | Count | Classification |
|---|---|---|---|
| `check-progression-integrity.mjs` | `progression-registry-bypass` | 21 | Pre-existing, unrelated (progression chargen registry-import bypasses — `ClassesRegistry`/`SpeciesRegistry`/`TalentRegistry` imported directly instead of through a registry-access wrapper) |
| `check-progression-integrity.mjs` | `draft-write-bypass` | 23 | Pre-existing, unrelated (chargen `draftSelections.*` direct writes, including one droid-chargen-subtype field in `template-adapter.js` — a different subsystem than droid installation/calculation-mode authority) |
| `check-architecture-boundaries.mjs` | `direct-actor-mutation` | 6 | Pre-existing, unrelated (build script, `UpdatePipeline.js`, weapon-foundation feat hooks, NPC damage hydration hooks, a progression-ledger hotfix — none in this phase's diff) |
| `check-architecture-boundaries.mjs` | `progression-registry-bypass` | 31 | Pre-existing, unrelated (same registry-import pattern as above, including one droid-chargen-suggestion-engine touch — again the chargen subsystem, not droid installation/calculation-mode authority) |

**Totals: 44 and 37 respectively — identical to the exact counts already documented as the pre-existing baseline in `docs/audits/droid-stock-statblock-authority-phase-3.md`.** This is a direct, verifiable confirmation (not an inference) that Phase 4 introduced **zero** new violations in either tool: every single flagged line was already present, unchanged, before this phase began. No violation in either tool's output references any file this phase created or modified. No fix was made to either tool's flagged lines — per the task's explicit instruction not to fix unrelated violations — and no violation was classified as a false positive or an obsolete rule (both tools' findings look like real, if out-of-scope, architecture debt the guards correctly catch).

## Static guards

New `tools/check-droid-reconciliation-authority.mjs` (report-only by default, `--strict` exits non-zero) — 8 checks:

1. No automatic reconciliation from the Actor prepare/render pipeline — `applyReconciliation()`/`rollbackReconciliation()` callable only from the sheet's explicit handler and the service itself.
2. `flags.swse.stockDroidReconciliation` assignable only by the reconciliation service.
3. `mechanicalState.applyModifiers` referenced only by the approved read/write sites (the reconciliation service, `DroidCustomizationEngine`, the mode adapter's `shouldSuppressComponentModifiers()`, `ModifierEngine.js`, the installed-component resolver).
4. The reconciliation service never calls an embedded-Item creation API — it can never create a duplicate logical weapon because it never creates a weapon Item at all.
5. `buildReconciliationPlan()`'s auto-apply path is verified (by content, not a fragile keyword ban) to gate on `RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH`/`ALIAS_MATCH` specifically.
6. No direct `actor.update()`/`item.update()` in the reconciliation service or its classifier.
7. No file outside the reconciliation service may define `inspectReconciliation`/`buildReconciliationPlan`/`applyReconciliation`/`rollbackReconciliation` — guards against a second, competing implementation.
8. No production (`scripts/`) file imports anything from `tests/helpers/foundry-shim/` — the shim must never become a runtime dependency.

Verified working, not just written: ran clean (0 violations, 1962 files scanned), then confirmed it actually catches injected violations by temporarily adding a fake direct `flags.swse.stockDroidReconciliation` writer (check 2) and a fake production file importing from the shim (check 8), observing exactly those two violations reported with a nonzero exit, then deleting both temp files and re-confirming a clean pass.

Phase 1–3's guards (`check-droid-authority-ssot.mjs`, `check-droid-calculation-mode-authority.mjs`) are unchanged and still pass. `check-droid-installation-write-authority.mjs` (Phase 2) required the one reviewed allowlist addition documented above, and passes after it.

## Files changed

- `scripts/actors/droid/droid-mode-adapter.js` — added `shouldSuppressComponentModifiers()`.
- `scripts/domain/droids/droid-installed-component-resolver.js` — threads `provenance`/`mechanicalState` from the ledger source onto resolved components; exports `DROID_SYSTEMS_SOURCE_FIELDS`.
- `scripts/engine/effects/modifiers/ModifierEngine.js` — calls `shouldSuppressComponentModifiers()` before emitting each droid component's modifiers.
- `scripts/engine/customization/droid-customization-engine.js` — stamps default `provenance`/`mechanicalState` on every new installed-part payload.
- `scripts/domain/droids/droid-statblock-conversion-service.js` — `rollbackConversion()` now stamps `rolledBackAt`.
- `scripts/domain/droids/droid-converted-system-reconciliation-classifier.js` (new) — pure classification logic.
- `scripts/domain/droids/droid-converted-system-reconciliation-service.js` (new) — inspect/build-plan/apply/rollback orchestration.
- `scripts/sheets/v2/droid-sheet/context-builder.js` — `buildReconciliationControlsPanel()`.
- `templates/actors/droid/v2/partials/droid-build-status-card.hbs` — reconciliation controls card.
- `scripts/sheets/v2/character-sheet.js` — three new `data-action` handlers.
- `scripts/debug/droid-authority-diagnostics.js` — `reconciliationRecord`, `rolledBackAt` on `conversionRecord`.
- `tools/check-droid-installation-write-authority.mjs` — one reviewed allowlist addition.
- `tools/check-droid-reconciliation-authority.mjs` (new) — 8-check static guard.
- `tests/droid-mode-adapter.test.mjs` — 5 new test blocks for `shouldSuppressComponentModifiers()`.
- `tests/droid-converted-system-reconciliation-classifier.test.mjs` (new) — 13 test blocks / 35 assertions.
- `tests/droid-phase4-foundry-shim.test.mjs` (new) — 15 test blocks / 50 assertions.
- `tests/helpers/foundry-shim/` (new) — reusable test harness (path loader, global shim, fake ActorEngine, fake-actor factory).

No unrelated file was touched — confirmed by reviewing the full `git status`/diff before committing.

## Tests

- `tests/droid-mode-adapter.test.mjs` — **30 test blocks, 69 assertions** (25/62 from Phase 3, plus 5 new blocks/7 new assertions for `shouldSuppressComponentModifiers()`).
- `tests/droid-converted-system-reconciliation-classifier.test.mjs` (new) — **13 test blocks, 35 assertions** — every classification category (canonical/alias/ambiguous/descriptive-only/unsupported/already-canonical/post-import-modification), dedup-collapse, determinism, purity, the assumed-default warning, and weapon-candidate annotation.
- `tests/droid-phase4-foundry-shim.test.mjs` (new) — **15 test blocks, 50 assertions** — running **real** `droid-statblock-conversion-service.js` and `droid-converted-system-reconciliation-service.js` code (only `ActorEngine` faked) for: conversion without reconciliation, conversion+reconciliation together, ActorEngine mutation-plan shape, rollback (conversion and reconciliation, including the `rolledBackAt` fix and repeated-rollback stability), snapshot-failure-triggers-rollback (for both services), reconciliation idempotency, ambiguous-candidate rejection, and permission enforcement (GM, owner, and rejected non-owner/non-GM direct invocation).

**Honest scope, mapped against the task's required test categories**:

- **Automated (Node, real production code via the shim)**: conversion (24, 25, 32, 33, 44, 45), reconciliation apply/rollback/idempotency/failure-rollback (27, 28, 29, 31), permissions (34, 35, 37, 38), ambiguous-candidate rejection (26).
- **Automated (Node, pure classifier, no shim needed)**: reconciliation inspection classification (1–10 of the classifier-specific list), weapon-candidate annotation (18, 20).
- **Verified by static code inspection, not an automated assertion**: the stock-mode progression guard in `progression-entry.js` (41, 42 — that file could not be loaded even through the shim; see "Foundry-shim harness" above for the exact error and why); the sheet's three new button handlers' exact wiring (already shown verbatim in this document's "UI and permissions" section); multiple published attack profiles remaining preserved through reconciliation (19 — reconciliation never touches weapon Items at all, so nothing to break, confirmed by reading the code rather than exercising it); "observer may inspect but not mutate" (36) — this repo's fake actor models permission as a simple owner/non-owner boolean, not Foundry's full NONE/LIMITED/OBSERVER/OWNER permission-level enum, so an "observer" was approximated as a non-owner, non-GM actor (test 37) rather than tested as a distinct permission tier; `inspectReconciliation()` itself never gates on permission at all (by design — inspection is always read-only), which was confirmed by reading the function rather than by a level-specific test.
- **Requires live Foundry runtime**: everything in the runtime matrix below.

Existing Phase 1–3 droid test files (`droid-installed-component-resolver.test.mjs`, `droid-item-classification.test.mjs`, `droid-installation-reconciler.test.mjs`) were re-run, not modified, and still pass unchanged.

### Validation performed (this phase, Node-only — exact counts)

- `node tools/run-rolling-syntax-check.mjs` — **2106 files checked, all pass** (2 pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — **44 passed, 0 failed** (of 44 run; 5 pre-existing, documented Force-power-track exclusions) — up from 42 before this phase, reflecting the 2 new Phase 4 test files; all pre-existing droid tests still green.
- `node tools/check-droid-authority-ssot.mjs --strict` — pass (Phase 1, unaffected).
- `node tools/check-droid-installation-write-authority.mjs --strict` — pass, **after** the one reviewed allowlist addition documented above (initially failed with exactly the expected, self-explanatory violation before that addition — caught by this phase's own validation, not left unnoticed).
- `node tools/check-droid-calculation-mode-authority.mjs --strict` — pass (Phase 3, unaffected).
- `node tools/check-droid-reconciliation-authority.mjs --strict` — **new this phase**, 0 violations across 1962 scanned files; separately verified to correctly detect two independently-injected fake violations (checks 2 and 8) before those temp files were deleted.
- `bash tools/check-mutation-paths.sh` — pass (no new direct `actor.update()`/`item.update()`/`ChatMessage.create()` call sites; all Phase 4 mutations route through `ActorEngine.applyMutationPlan`).
- `node tools/check-progression-integrity.mjs` / `node tools/check-architecture-boundaries.mjs` — **44 and 37 violations respectively, both counts identical to the pre-existing baseline documented in Phase 3** — see "Integrity/architecture guard classification" above for the full per-category breakdown; zero new violations confirmed.
- All 8 pre-existing combat/vehicle SSOT guards (`check-combat-math-ssot.mjs`, `check-attack-outcome-ssot.mjs`, `check-critical-confirmation-guard.mjs`, `check-full-attack-reroll-guard.mjs`, `check-reroll-supersession-guard.mjs`, `check-vehicle-attack-routing-guard.mjs`, `check-vehicle-crew-assignment-guard.mjs`, `check-vehicle-crew-runtime-ux-guard.mjs`) — all still pass; re-run specifically since this phase touched `ModifierEngine.js`, a file several of these guards care about.

No live Foundry v13 instance was launched. Every result above is a real, Node-executed pass/fail — nothing is mocked away silently, skipped without disclosure, or asserted without having actually run.

## Runtime matrix (documented, NOT executed)

Every row below requires a live Foundry v13 instance and has not been run. Status: **PENDING** for all 35.

**Installation authority**
1. PENDING — Garage install charges credits.
2. PENDING — Workshop install charges the same credits.
3. PENDING — Garage removal grants correct resale.
4. PENDING — Workshop removal grants correct resale.
5. PENDING — Removal clears canonical ledger, projection, and matching embedded Item.
6. PENDING — Insufficient funds rolls back all changes.
7. PENDING — Linked-token modification persists correctly.
8. PENDING — Unlinked-token modification affects only the intended synthetic actor.
9. PENDING — Base world Actor remains unchanged after synthetic-only mutation.

**Stock mode**
10. PENDING — Import stock droid.
11. PENDING — Published BAB remains stable after rerender.
12. PENDING — Defenses remain stable.
13. PENDING — Initiative remains stable.
14. PENDING — Damage Threshold remains stable.
15. PENDING — Current damaged HP is not reset.
16. PENDING — Published attack total is used exactly once.
17. PENDING — Temporary attack bonus applies once.
18. PENDING — Natural 1/20 and critical behavior remain canonical.
19. PENDING — Damage chat button retains weapon context.
20. PENDING — World reload preserves stock mode.

**Conversion and reconciliation**
21. PENDING — Stock-mode progression is blocked (statically verified — see "Tests" above; not runtime-executed).
22. PENDING — Inspect conversion displays discrepancies.
23. PENDING — Convert without reconciliation.
24. PENDING — Confirm no classes, feats, talents, or levels are invented.
25. PENDING — Inspect reconciliation candidates.
26. PENDING — Reconcile one exact canonical match.
27. PENDING — Leave one ambiguous match unresolved.
28. PENDING — Preserve one descriptive-only source system.
29. PENDING — Confirm no duplicate integrated weapon.
30. PENDING — Confirm playable-derived modifiers apply once after reconciliation.
31. PENDING — Roll back reconciliation.
32. PENDING — Roll back conversion.
33. PENDING — Confirm original stock totals return.
34. PENDING — Repeat on an unlinked synthetic token.
35. PENDING — Test GM, owner, observer, and nonowner permissions (partially covered by Node-level fakes above; live Foundry permission-level enforcement itself remains PENDING).

## Merge readiness assessment

**CONDITIONALLY READY.**

Reasons it is not simply READY:
- No live Foundry v13 runtime verification has been performed at any phase of this droid stabilization effort (Phase 1 through 4) — every item in every phase's runtime matrix remains PENDING. The mechanical logic is real, tested where the environment allows, and internally consistent, but has never been observed running inside Foundry.
- The stock-mode progression guard (`progression-entry.js`) has only ever been verified by static code reading, never by an automated test, across all four phases.
- `check-progression-integrity.mjs`/`check-architecture-boundaries.mjs` report 44/37 pre-existing, unrelated violations that remain unfixed (correctly, per this phase's scope) — a future merge decision should not be blocked on these, but they are real, documented technical debt in the wider progression system this PR does not touch.

Reasons it is not NOT READY:
- Every static guard (7 across Phases 1–4) passes in strict mode, each independently verified to actually catch injected violations rather than merely reporting a clean scan by construction.
- Node-level automated coverage is real and substantive: 44/44 rolling tests pass, including 30+13+15 = 58 test blocks across 3 droid-specific Phase 4 test files, a majority of which now exercise **real, unmodified production service code** (not just pure logic in isolation) via the new Foundry-shim harness.
- Zero new violations were introduced in either integrity/architecture tool — confirmed by exact count comparison against the pre-existing baseline, not merely "still passes."
- A real, live, unnoticed bug (unconditional roll-time modifier double-application for unreconciled stock droid components) and a real, if cosmetic, rollback gap (stale conversion/reconciliation flag metadata) were both found and fixed during this phase's own verification work, not left for a future phase.
- No architectural constraint from the task specification was violated: `ActorEngine` remains the sole mutation authority; no direct `actor.update()`/`item.update()` anywhere in new code; no second installation/conversion/reconciliation engine; no automatic reconciliation on render/prepare; no invented classes/feats/talents/levels; Phase 1–2 installation policy is unchanged except for one narrow, reviewed, and now-guarded exception.

Recommendation: merge-ready pending a maintainer's own judgment on whether Node-level verification (across 4 phases, now including real-production-code coverage via the shim) is sufficient to land without live Foundry testing, or whether a live-runtime pass through the accumulated runtime matrices should gate the merge first.

## Remaining risks

- Every runtime-matrix row across all four phases remains unexecuted.
- The stock-mode progression guard has no automated coverage at all (not even via the shim) — a regression there would only surface at runtime.
- Reconciliation's sheet button only ever auto-applies canonical/alias matches; there is no UI yet for a GM to explicitly resolve an ambiguous match or consciously accept a descriptive-only entry as permanently unmapped — those candidates are simply left for a future, more granular selection UI (see Phase 5 below). This is a deliberately narrow, safe default, not a defect, but it means `inspectReconciliation()`'s richer candidate data (reasons, confidence, warnings) is not yet fully surfaced in the UI beyond a labeled list.
- The Foundry-shim harness's fake `ActorEngine` is a faithful but hand-maintained reimplementation of a subset of the real engine's behavior; if the real `ActorEngine`/`SnapshotService` behavior changes, the fake will silently drift out of sync unless someone remembers to update it alongside.
- `check-progression-integrity.mjs`/`check-architecture-boundaries.mjs`'s 44/37 pre-existing violations remain unaddressed (correctly out of scope for this phase).

## Recommended Phase 5

- Live Foundry v13 execution of the accumulated runtime matrices (Phases 1–4), starting with the highest-risk rows: stock-attack double-count (now fixed twice — display in Phase 3, roll-time modifiers in Phase 4), rollback fidelity, and permission enforcement.
- A granular reconciliation-selection UI (per-candidate accept/reject, explicit disambiguation for ambiguous matches) instead of the current "auto-apply canonical/alias matches only" button.
- Extend the Foundry-shim harness (or accept the live-runtime gap) to cover `progression-entry.js`'s stock-mode guard, the one piece of Phase 3/4 behavior with zero automated coverage of any kind.
- Investigate (not fix, unless trivial) the pre-existing `check-progression-integrity.mjs`/`check-architecture-boundaries.mjs` violation counts, which predate this entire droid-stabilization effort and touch the wider progression/chargen system.
