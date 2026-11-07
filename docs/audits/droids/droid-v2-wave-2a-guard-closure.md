# Droid V2 - Wave 2A: strict authority guard closure (2026-11-06)

**Branch:** `feature/v2-unified-wave-2-guards`, stacked on `feature/v2-unified-wave-1` (PR #1112 head `59ab2ab`, exact-head CI green before this wave). **Offline only; no Foundry V13 runtime test.**

## Preflight

PR #1112 head verified unchanged at `59ab2ab5022f8f1dfb4ecce6022508032d9b2e5a`; its exact-head Rolling System Validation and Droid V2 Gate A runs both succeeded (runs 42149296972 and 42149297091). The strict guards were reproduced locally before any change:

| Guard (`--strict`) | Before | Offending location(s) |
|---|---|---|
| `check-droid-authority-ssot` | exit 1 | `scripts/domain/droids/droid-component-source-review.js` (8 identity aliases, 4 more `needs variant` aliases counted as "rule table keys") |
| `check-droid-calculation-mode-authority` | exit 1 | check 3: `scripts/engine/import/vehicle-import-normalizer.js`; check 5: `scripts/sheets/v2/droid-actor-sheet.js` |
| `check-droid-reconciliation-authority` | exit 1 | check 1: `scripts/sheets/v2/droid-actor-sheet.js` |
| `check-droid-installation-write-authority` | exit 0 | none |

After this wave all four exit 0.

## Classification: guard false positives vs defects

All three failures were **guard false positives**, not defects in the code they flagged:

1. **SSOT.** The file's only object-key matches were `'old-id': 'canonical-id'` identity aliases. An alias cannot carry a price, mass, modifier or behavior. Fix: the detector no longer counts a key whose value is a bare identifier string. No file or directory is exempted; object, function, number and prose-valued tables are still counted (tested).
2. **Calculation mode, check 3.** `publishedAttackTotal` in `vehicle-import-normalizer.js` is one string in the vehicle's own `VEHICLE_WEAPON_PRESERVED_FIELDS` list (record normalization), not droid attack math. Fix: a vehicle-domain file naming the field is exempt only while it never mentions the droid flag `stockDroidAttack`.
3. **Calculation mode check 5 and reconciliation check 1.** The guards approved `scripts/sheets/v2/character-sheet.js` as the explicit-action call site, but that file contains no such call. The live registered droid sheet (`index.js`) is `droid-actor-sheet.js`, whose handlers `_convertDroidToPlayable`, `_reconcileDroidSystems` and `_rollbackDroidReconciliation` are reached only through a delegated click on a `data-action` button in `character-like-sheet.js`, each opens a `SWSEDialogV2.confirm` (default No) before the call, and the services enforce GM/owner permission, actor identity, revision freshness and reject plan-shaped intents (all verified, and the last three are pinned by a test). Fix: the stale whole-file allowance is **removed** and replaced by a structural check (`tools/lib/droid-explicit-action-sites.mjs`): a call is approved only inside a named handler method, after a `.confirm(`, and the handler is reachable only from a click-delegated `data-action` test. Calls in prepare/render/context code, an unconfirmed call, an unapproved handler name, or a handler invoked outside the click dispatch all fail. Comments are ignored.

## Confirmed defect removed

`UpgradeService.removeUpgrade` still raw-deleted a droid ledger entry when `DroidCustomizationEngine` rejected the removal (for an unidentified key). The droid fallback is **gone**: a removal the engine cannot validate now throws the engine's reason and leaves the ledger, the display mirror and credits untouched. Vehicle-actor branches are unchanged.

`check-droid-installation-write-authority` was tightened so it cannot be silently reintroduced: `UpgradeService.js` is now a *scoped* exception (every direct write must sit in the `vehicle-actor-` branch); every allowlist entry needs a justification of at least 60 characters, an existing file, and evidence that it still writes (the stock importer writes creation data as `droidSystems,` shorthand, so its evidence pattern is explicit). Stale entries now fail.

## Files

`tools/check-droid-authority-ssot.mjs`, `tools/check-droid-calculation-mode-authority.mjs`, `tools/check-droid-reconciliation-authority.mjs`, `tools/check-droid-installation-write-authority.mjs`, `tools/lib/droid-explicit-action-sites.mjs` (new), `scripts/engine/upgrades/UpgradeService.js`, `tests/droid-strict-authority-guards.test.mjs` (new), `tests/droid-gate-c1-workshop-removal.test.mjs` (extended), `.github/workflows/droid-v2-gate-a.yml`.

## Tests

`droid-strict-authority-guards` (8 groups): the real repository passes all four guards; the SSOT detector flags object / function / number / prose rule tables and passes alias-only maps; mutated copies of the real droid sheet (conversion in `_prepareContext`, reconciliation in `_onRender`, missing confirmation, renamed handler) and of the real dispatch file fail; comments are ignored; the vehicle exemption is narrow; the service-side identity / freshness / plan-rejection checks are pinned; a reintroduced droid fallback is detected. Workshop tests add: unidentified key fails closed with ledger, mirror and credits untouched and zero ActorEngine calls; stale index is a no-op; a valid removal pays resale exactly once. The real guard binaries were also run against temporary violating files (a context-builder reconciliation call, a context-builder conversion call, a competing rule-table file, a new installation writer) and each exited 1; the files were removed. Reintroducing the Workshop fallback fails both the Workshop test and the guard test.

## CI

`.github/workflows/droid-v2-gate-a.yml` now runs the four guards with `--strict` (identical to the local commands) plus the new tests, and its path filter includes the guards, the helper, `UpgradeService.js` and the droid sheets. The new guard test also runs in the rolling suite, so a regression fails the existing required check.

## Remaining authority exceptions (unchanged, documented)

Chargen `default-subtypes.js`, follower creator, stock importer and the Phase 4 reconciliation service remain narrowly allowlisted creation/reconciliation writers; the two dead files (`droid-modification-factory.js`, `droid-builder-app.js`) remain allowlisted until deleted in a later wave.

## Not changed

No Gate C-2 work, no DROID-RD ruling, no certification denominator or source-review disposition, no vehicle code.
