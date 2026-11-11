# Store V2 — Foundry V13 acceptance checklist

Status of everything below: **RUNTIME_UNVERIFIED** (no Foundry host was available). Offline tests cover pure logic and static architecture only.
Use two clients (Player A owns the buyer actor, GM) and, for cross-client rows, a second player (Player B).

## A. Catalog and browsing (player)
- [ ] Open the Store cold, then warm; record time to first card, time to category switch. (S0 baseline was never measured; record both now.)
- [ ] Console: no `STORE_CATALOG_*`, `STORE_SOURCE_IDENTITY_MISMATCH` or `UNIVERSAL_VEHICLE_*` errors; `metadata.missingPacks` empty; `metadata.unclassified` = 0; `metadata.uncertifiedDroids` = 0.
- [ ] Counts: weapons 203, armor 70, equipment 134 + implants 8 (minus unpriced), stock droids (172 priced of 194), vehicles (those with a published new or used price).
- [ ] Weapons, armor, gear, implants, droids, vehicles each browse; subcategory and vehicle facets (size, CL, role, crew, passengers, cargo, hyperdrive, weapons, shields) narrow results; search and availability filter instantly.
- [ ] Selecting a card shows the description / statblock (loaded on demand from the source record). Selecting does not stall.
- [ ] A product shows the same name, category, price and availability on the card, detail, cart, approval and history.
- [ ] No world Item or world droid Actor appears as stock. (Create a world Item with a price; it must NOT be sold.)

## B. Item purchases
- [ ] Buy a pistol: Item on the actor keeps `flags.swse.canonicalWeapon`, effects, `_stats.compendiumSource`, full `system`; weapon combat resolves.
- [ ] Buy armor and gear: identical fidelity; armor resolves.
- [ ] Insufficient credits: refused, nothing charged, nothing granted.
- [ ] Double-click Checkout: one purchase only.
- [ ] GM changes markup/discount while the cart is open: checkout stops, cart shows the new price, nothing charged; second Checkout charges the new price.
- [ ] Transaction ledger entry (actor flag `transactions`) matches the charge; Store history tab shows it; legacy `purchaseHistory` is not written.

## C. Vehicles (new / used)
- [ ] Vehicle with both prices: card offers New and Used with different prices; add each; cart shows the chosen condition; checkout charges that price; the created Actor is in that condition; ledger audit line records the condition.
- [ ] New-only vehicle: only New offered, no Used price shown. Used-only vehicle (if any): only Used offered.
- [ ] Vehicle with no published price / not for sale: not offered.
- [ ] Add to cart with no condition chosen on a two-price vehicle: warning "Choose New or Used"; nothing added.
- [ ] GM approval of a vehicle line: price re-quoted per condition; approving after a policy price change is refused with a clear message.

## D. Stock droids
- [ ] Buy a stock droid: Actor is in stock-statblock mode, owner is the buyer, factory equipment is not duplicated.
- [ ] A droid with no published price is not offered.
- [ ] Remember: eligibility is source identity + import acceptance, NOT mechanical certification (`mechanicalCertification: NOT_PERFORMED`).

## E. Approvals (GM)
- [ ] Policy "approval required" item: player request -> GM approval re-quotes from the live catalog, delivers the canonical Item, charges once.
- [ ] Price changed between request and approval: approval refused, nothing charged; GM denies; player resubmits.
- [ ] Request authored before this change (only `itemData`): refused cleanly.
- [ ] Requester cannot approve their own request.
- [ ] Pending custom droid (legacy PENDING draft): approval requires the GM confirmation dialog showing the amount; zero/missing cost refused; ledger audit contains `priceAuthority: gm-authorized-declared-cost`; approving twice does not charge twice.
- [ ] Crash/refresh between charge and delivery: transaction recovery reports compensated / indeterminate as before (TI-2 behavior).

## F. Builders and gated lanes
- [ ] Build a Droid (Store): SUPERSEDED — this was the pre-S5 placeholder behaviour. Build a Droid is now an implemented lifecycle (Store -> Builder -> quote -> GM approval -> debit -> finalized Droid -> ownership); see section I (RUNTIME_UNVERIFIED).
- [ ] Build a Ship (Store): opens the existing Ship Designer; submit -> GM approve/fund -> project lifecycle works as before.
- [ ] Customize a Store item: staging is refused with the notice; an old cart containing a customized line is cleaned at checkout with a message and no charge.
- [ ] No modification is purchasable (registry `selectable: 0`).

## G. Multi-client
- [ ] Player A and Player B purchase simultaneously from different actors: both succeed, independent ledgers.
- [ ] GM edits Store policy while Player A browses: next render shows new prices; a stale cart is caught at checkout.
- [ ] GM approves while the player's sheet is open: player sees the delivered asset without reload.

## H. Performance (record, do not assert)
- [ ] Cold open, warm open, category switch, search keystroke, detail select, add to cart: record ms each. Compare with the pre-cutover build (`c19e0a4`) on the same world.
- [ ] Note suggestion generation cost on open (all weapons/armor/gear are scored on first load; not changed in this pass).

## I. Store-originated custom droid (new lifecycle; all RUNTIME_UNVERIFIED)
- [ ] Store > Droids > Build a Droid opens the existing builder in single-step mode (no console ReferenceError; the builder previously called an un-imported quote function).
- [ ] Choose paid components (non-default locomotion, extra hand, an accessory) and confirm: notification states the quoted total; nothing is charged; no actor is created; a pending request appears in the GM approvals list showing the total and per-component lines (granted baseline lines show 0).
- [ ] A build made only of baseline components (default locomotion, heuristic processor, two hands) is refused as having nothing to purchase.
- [ ] Confirm twice / reopen: the second confirm is refused (launch authorization is one-shot).
- [ ] GM approves: confirmation dialog shows the re-quoted amount; owner is debited exactly that amount; droid Actor appears owned by the buyer with the chosen systems; second approve attempt is refused with no second charge.
- [ ] Insufficient credits: approval refused, nothing charged, request stays pending.
- [ ] Edit the request total inline as GM, or change DROID_SYSTEMS data between request and approval: approval is refused (quote changed).
- [ ] Interrupt during approval (refresh): either fully paid + delivered or fully unchanged; no free droid, no paid-but-missing droid.
- [ ] Non-Store progression: droid chargen (full flow), level-up and follower droid building behave as before; the builder's running totals match the quoted total for the same components.
- [ ] Inspect the delivered droid sheet: confirm chassis-only data is acceptable or file follow-up (stats/class levels are not part of a Store construction).

## J. Resale (S9; all RUNTIME_UNVERIFIED)
- [ ] Drag a pistol from the compendium onto your own sheet: selling it offers NO automatic value (request GM appraisal); duplicate a purchased pistol (copy/paste or drag from another actor): neither copy sells automatically; delete one copy and the remaining one still does not until the other claim is gone.
- [ ] Buy a pistol with a GM discount (e.g. 20%): the Item's flags show `acquisition` with `unitPaid` below `publishedUnitCost`; the ledger line shows the same figures.
- [ ] Sell it back from every sheet (character, droid, equipment workspace): one dialog, exact offer = policy % of the paid price; with `resaleBasis` = published the offer changes accordingly.
- [ ] Edit the Item's `system.cost`/`system.price` and the acquisition flag by hand: the offer does not change; a forged `unitPaid` falls back to published (labelled).
- [ ] Stack of consumables: sell 2 of 5: 3 remain, payout for exactly 2; sell all: item removed. Try 0, -1, 1.5, 6: refused.
- [ ] Customized item / item with no compendium source: "no automatic value", request goes to GM; GM approves with amount + reason; ledger shows `gm-appraisal`.
- [ ] SUPERSEDED by K1: automatic (player-executed) credit creation is closed. With `autoAcceptItemSales` on or off, selling an Item always produces a GM request; the dialog says the offer goes to the GM.
- [ ] Change the sale percentage between the offer dialog and confirming: "offer changed", renewed confirmation.
- [ ] Player forces `resolvePendingSaleRequest` from the console: refused (GM required). Double-click approve / approve twice: one payment.
- [ ] Droid and Vehicle: Asset Bay "Request Sale" -> GM sees verified paid/published/condition/construction evidence + policy reference; approve with amount + reason: seller paid once, asset leaves the player's Asset Bay, stays in the world GM-only with `flags.foundryvtt-swse.resale`; vehicle with assigned crew is refused.
- [ ] Interrupt (refresh) during an asset sale: the report is `success`, a verified-unpaid failure (asset restored, permissions identical to before), or `indeterminate` (asset stays GM-held `sale-pending`; the seller is NEVER told they were unpaid unless verified). See section L for the reconcile procedure.

## K. Ledger trust and permissions (MUST be run with real clients; all RUNTIME_UNVERIFIED)
Expected outcome is stated for each; a deviation is a BLOCKER. Use disposable Actors; Player A owns Actor A; Player B owns nothing of A.
- [ ] K1. Player A (console) sets `flags.foundryvtt-swse.transactions.forged` on Actor A to a fabricated successful Buy of a pistol (with lot id) and stamps the pistol's `acquisition` flag to match. Then A tries to sell the pistol from the sheet. EXPECT: no credits are created for A (the sale becomes a GM request). Record whether Foundry allowed the flag write (it is expected to: OWNER can write own Actor flags — this is the documented reason automatic credit creation is closed).
- [ ] K2. Player A calls `TransactionEngine.executeSaleTransaction({... authority:'canonical-automatic', transactionContext:'store-sale'})` directly from the console. EXPECT: refused `AUTOMATIC_CREDITS_REQUIRE_GM_AUTHORITY`, balance unchanged.
- [ ] K3. Player A calls `executeSaleTransaction` with `transactionContext:'store-sale-approval'` and `executeAssetSaleTransaction`. EXPECT: refused (`GM_REQUIRED`), balance unchanged.
- [ ] K4. Player A edits `system.credits` directly. RECORD the result: Foundry permits this (OWNER). This is a pre-existing table-trust boundary, not introduced by Store V2; confirm no Store flow relies on it being impossible.
- [ ] K5. Player B tries to read/modify Actor A's ledger: EXPECT denied by Foundry permissions.
- [ ] K6. Reuse a legitimate transaction id / request id on a second sale: EXPECT `REQUEST_ALREADY_COMMITTED`.
- [ ] K7. GM approves a request whose seller ledger was forged: the approval dialog evidence states the ledger is on the seller's Actor; confirm the GM can see lot/transaction ids to compare.

## L. Asset-sale reconcile (GM; all RUNTIME_UNVERIFIED)
- [ ] L1. Sell a disposable Droid, killing the GM client between disposal and payment (devtools: pause after `sale-pending`). EXPECT: asset GM-held, no player permission, `resale.status='sale-pending'`; `TransactionEngine.reconcileAssetSale({ownerActor, assetActorId})` returns `restored`; the Droid's ownership map and `ownedByActorId` equal their pre-sale values EXACTLY (compare `actor.ownership`), the seller's `ownedActors` and relationships are intact, credits unchanged.
- [ ] L2. Kill after payment but before finalization. EXPECT: `completed`; asset `sold`; the former owner has no permission on the asset.
- [ ] L3. Corrupt each of: ledger amount, asset id, owner id, wallet, ownership link, player permission, then run reconcile. EXPECT: `unresolved`, asset stays `sale-pending` with `needsReconciliation` and `reconciliationReasons`; nothing is paid or restored.
- [ ] L4. Run reconcile twice simultaneously from two GM tabs. EXPECT: at most one acts (the lock is per client, so on two GM CLIENTS a second run finds nothing pending after the first resolves; record the observed behaviour).
- [ ] L5. After a completed sale, verify the former owner cannot open the asset sheet (Foundry merges ownership updates: the disposal deletes the old player keys with `-=key`).

## M. Concurrency (real clients)
- [ ] M1. Double-click Checkout on one client: one charge. M2. Same player on two browsers checkout simultaneously with the same cart: RECORD result (client-local locks do not span clients; expected limitation, see merge-readiness doc).
- [ ] M3. Two GM clients approve the same sale request simultaneously: RECORD result; expected at most one payment per request id when the first write propagates; a sub-second race is a documented limitation.
