# TI4-C0 / G34 — Progression ledger reconciliation hotfix: GM-only execution and ActorEngine mutation authority

Branch `audit/ti4c0-g34-progression-ledger-sync-authority`, cut from `main` @ `f41edc4c24413164078c921ce0332b7d6aafbade`. Level: **L1 only** (offline, one client). Multi-client behaviour (L2) is not tested or claimed; not live Foundry; not exactly-once. Original authority: TI-4 Phase 0 enforcement gap register, G34 (S1).

## 1. Finding verified on current `main` (`scripts/patches/progression-ledger-reconciliation-hotfix.js`)

Reachable, not dead code: `registerProgressionLedgerReconciliationHotfix()` is called from `scripts/patches/runtime-bugfix-hotfixes-init.js`, which `scripts/talents/squad-actions-init.js` imports (and `index.js` imports that).

`installClassItemLedgerSync()` registered `Hooks.once('ready', syncAllActorsToLedger)` and `Hooks.on('updateActor' | 'createItem' | 'updateItem', …)`. Foundry fires the ready hook and document hooks on **every client**, and nothing checked the user: each client — players included — built the ledger from `system.progression.classLevels` (authoritative when it totals the character level) and, for any owned class Item whose level disagreed, wrote the Item directly with `actor.updateEmbeddedDocuments('Item', updates)`:
1. **No GM-only gate** — every connected client attempted the same reconciliation writes (a player who owns the actor succeeds; a non-owner's attempt is a rejected permission write that is swallowed).
2. **Mutation-authority bypass** — the write went around `ActorEngine.updateEmbeddedDocuments`, the repo's single mutation authority for owned Items (its type-mutation backstop, boundary audit and recalc lifecycle).
3. **Malformed input** — an owned class Item without a usable id produced an update with `_id: undefined`.

## 2. Change (that one file)

- `isAuthorizedReconciliationClient()`: only a GM client reconciles (`game.user.isGM === true`, the repo's convention in sibling hotfixes). When Foundry reports an active GM (`game.users.activeGM`) that is another user, this GM client stands down so a single GM client performs the pass; with no election information the GM gate alone applies. The gate is applied in `syncActorClassItemsToLedger` (the one function every path — ready scan, `updateActor`, `createItem`, `updateItem` — goes through) and in `syncAllActorsToLedger` (so no work is queued on other clients).
- The write is `ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates, { source: 'ProgressionLedgerReconciliationHotfix.syncClassItems', meta: { guardKey: 'progression-ledger-sync' } })`. No fallback to a direct write when the engine rejects: the failure is logged, the in-flight guard is released and a later trigger can retry.
- Items without a usable id are skipped.
- Unchanged: the ledger builder and its authoritative-total rule, the level-fields written (`system.level` / `levels` / `classLevel`, `className`/`classId` preserved when present, the two ledger flags), the "write only when a level disagrees" rule, the per-actor in-flight guard, the hook filters, the report-builder remediation shim, and registration.

## 3. Behaviour changes to note

- Reconciliation no longer happens from a player's client. If no GM is connected, class-item levels that disagree with the ledger stay as they are until a GM client's ready scan or the next relevant hook runs (they used to be corrected by whichever client noticed first).
- With several GMs online only the active GM reconciles.
- The write now goes through ActorEngine's lifecycle, which includes its derived-data recalculation after the Item update (the old direct write did not). Hook re-entrancy during the write is still blocked by the in-flight guard.

## 4. Evidence

`tests/ti4c0-g34-progression-ledger-sync-authority.test.mjs` — 12 checks on the real hook handlers and ledger sync with recorded `Hooks`, a model `ActorEngine.updateEmbeddedDocuments` (applies the updates and fires the item/actor hooks synchronously, as Foundry does during a write) and a plain actor whose own `updateEmbeddedDocuments` counts direct writes. **Fail-before on `f41edc4`:** 4/12 passed — the ready scan and a player's `updateActor` / `createItem` / `updateItem` hooks wrote directly (checks 3, 12), a passive GM wrote (4), writes did not go through ActorEngine (1, 2, 10, 11), and an item without an id produced an update with no `_id` (9); idempotence, hook re-entrancy, concurrent triggers and the non-authoritative-ledger case already behaved and are kept as regressions (5–8). **After:** 12/12. Mutation checks (each reverted): sync-function GM gate removed → 2 failures; both gates removed → 3; active-GM election removed → 2; GM requirement removed / disabled → 2 each; direct actor write instead of ActorEngine → 8; direct-write fallback after an engine failure → 3; in-flight guard removed → 2; item-id guard removed → 2; writes when levels already agree → 3; ledger flag dropped → 2; `updateActor` filter removed → 2. One mutation survived and is **equivalent**: letting a non-authoritative ledger proceed past `if (!ledger.authoritative)` changes nothing, because `buildAuthoritativeLedger` already returns no rows in that case.

Rolling suite `Result: 395 passed, 0 failed (of 395 run; 5 excluded as documented pre-existing failures)`; rolling syntax check; `validate-partials`; `system.json` parse; `git diff --check`; every `node tools/…` guard in `rolling-system-validation.yml` passes locally (the feat-inventory guard rewrites generated reports; reverted, not part of this change).

## 5. Not changed / remaining

- **L2 / multi-client:** the original audit's multi-client scenario (several clients racing) is not validated here. Offline tests cannot exercise Foundry's cross-client hook delivery or `game.users.activeGM` election; the GM gate removes the player-client writers, and two GM clients would compute the same idempotent target, but no cross-client coordination (and no compare-and-swap) was added or tested.
- No new progression, migration or synchronization authority; no refactor of progression finalization. Whether the class-item ↔ ledger sync belongs in the progression finalizer instead of a startup hotfix is a separate architectural question.
- `TransactionEngine`, G21, G22, G24, G26 are untouched. The report-builder remediation shim in the same file is UI-only and unchanged.
- Live Foundry behaviour is not established by the offline model.
