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
- [ ] Build a Droid (Store): shows "unavailable" notice, builder does not open, nothing is created or charged. (Re-enable only after a re-quotable design snapshot exists.)
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
