# Store V2 — S9 Resale Authority (clean-break cutover)

Branch/PR: `claude/busy-wright-dudbyz` / #1143 (draft). Status: **CODE_COMPLETE, OFFLINE_TESTED. Everything touching real Foundry documents, permissions and multi-client behaviour is `RUNTIME_UNVERIFIED`.** Nothing here is `FOUNDRY_TESTED`.

## 1. Verified existing behaviour (findings S9-01..S9-08 against the code at `8c380a8`)

| Finding | Verdict | Evidence |
|---|---|---|
| S9-01 obsolete pricing | **Confirmed.** `item-selling-system.js` read `item.system?.price`; the canonical packs publish `system.cost` (all 609 item/droid records carry `cost`; none rely on `price`). | removed file |
| S9-02 caller-supplied payout | **Confirmed.** `executeSaleTransaction({salePrice})` paid the number it was handed; auto mode computed it client-side. | `TransactionEngine` before this phase |
| S9-03 GM authorization | **Confirmed.** `resolvePendingSaleRequest` had no GM check (only the click listener did `_assertGM`). | `GMStoreOperationsService` |
| S9-04 quantity | **Confirmed.** The request recorded `quantity ?? equippedQty` but the engine always deleted the whole Item and paid once. Canonical authority is `system.quantity` (default 1; `InventoryEngine` stackable types `consumable/equipment/misc/ammo`; weapons/armor/shield/lightsaber unique). `equippedQty` is a different concept. | `InventoryEngine.js:24-26,442-470` |
| S9-05 stale approval pricing | **Confirmed.** Approval paid `amount ?? request.requestedPrice ?? suggestedPrice`. | service |
| S9-06 UI wiring | **Partly refuted.** `data-action="sell-item"` IS handled (`character-like-sheet.js` action switch); the `.item-sell` listeners matched no template element and were dead. | grep of templates |
| S9-07 whole-asset resale | **Confirmed absent.** | no consumer |
| S9-08 cross-client | **Confirmed limitation** (see §6). Document updates are not compare-and-swap; locks are per client. | closure report + code |

## 2. Authority matrix

| Concern | Owner | Notes |
|---|---|---|
| Valuation + eligibility rules | `engine/store/resale-authority.js` (pure) | no Foundry globals; unit-tested |
| Acquisition provenance rules | `engine/store/acquisition-record.js` (pure) | marker -> stamped reference; verification against the ledger |
| Evidence gathering + commit-boundary verification | `engine/store/resale-service.js` | catalog listing by exact source UUID; ledger; policy |
| Money, ledger, asset removal, rollback | `TransactionEngine.executeSaleTransaction` / `executeAssetSaleTransaction` | no new engine; payout is re-derived inside, never accepted |
| Inventory removal guard | `InventoryEngine.removalBlocker` (extracted from `removeItem`) | equipment-journal evidence |
| Presentation | `apps/store/resale-ui.js`, GM approvals tab, Asset Bay "Request Sale" | shows the exact verified offer; decides nothing |

## 3. S9-0 Acquisition cost provenance

Every Store purchase now records three separate things:

| Value | Where |
|---|---|
| Published base price | `publishedUnitCost` (listing's published cost; vehicles per purchased condition; never derived) |
| Actual acquisition price | `unitCost` / `unitPaid` = what was charged for that line after GM markup/discount |
| Current resale value | not stored; derived at quote time from policy |

**Authoritative evidence = the purchaser's transaction-ledger line** (`audit.items[]`: `listingId`, `sourceUuid`/`sourceEntryKey`, `unitCost`, `publishedUnitCost`, `quantity`, `condition`). The delivered Item/Actor carries only a **reference** (`flags.foundryvtt-swse.acquisition`: `transactionId` + the same figures, stamped by `TransactionEngine` from a plan marker). `verifyAcquisition` re-reads the ledger and requires every figure to match, so editing the flag cannot raise a payout. Loot, GM grants and pre-ledger assets verify as **"acquisition cost unknown"** (never zero, never invented). Disposed units are counted per **lot** from sale records (`audit.lotDisposal`), never per embedded Item id, so one purchase is paid for once even if the Item is duplicated or re-created; the acquisition record is never deleted when an asset is sold.

Covered purchase paths: catalog Items, stock Droids, published Vehicles (condition recorded), GM-approved purchases, and Store-built custom Droids (`kind: custom-droid-construction`, quote hash). Custom ships keep their sealed construction record; subsequent installations are **not** valued (no double counting, no invented value).

## 4. Valuation rules (revised by the S9 financial-authority closure)

**Decisions (project owner):** `resaleBasis = acquisition` is the default (published is an optional GM policy); whole Droids/Vehicles stay GM-approved (reference offers only) until ownership/disposition is verified in Foundry. Both are project policy, not SWSE RAW.

**Embedded Item, automatic (`canonical-automatic`) — requires a TRUSTED ACQUISITION ENTITLEMENT:**
1. A canonical `_stats.compendiumSource` proves what an Item *is*, not that the holder legitimately obtained it. Evidence from the code (`services/drop-service.js`): a player can drop a compendium Item onto an owned sheet and get an embedded copy with no Store transaction; cross-actor drops move Items with their flags; embedded Items/flags are player-editable. Only the Store purchase transaction stamps `flags.foundryvtt-swse.acquisition` (tested: one writer).
2. Entitlement exists only for units whose purchase is **verified in the holder's own ledger** by exact **lot id** (`<transactionId>:<line index>`, written to the ledger line AND stamped on the delivered doc), with matching listing, source, unit price and condition, **not already paid out** (per lot: every committed sale of an Item claiming the lot, automatic or GM-appraised, records `audit.lotDisposal`), and **not claimed by more than one owned Item** (duplicate / copied reference / split stack -> nobody is entitled).
3. Anything else — loot, GM grants, legacy inventory, dragged-in or duplicated Items, units added to a stack later, forged/copied references — has **no automatic value**. It can be sold through a **GM appraisal**; the GM sees a published-cost *reference* (`reference.payoutAtPublished`) that is never paid on its own. "Acquisition cost unknown" means the system cannot authorize payment, not that the Item is worthless. (An independently authorized grant record is not implemented; GM appraisal is the route.)
4. The basis policy only chooses the price for entitled units: `acquisition` = verified price paid; `published` = canonical published cost (still only for entitled units). The embedded copy's own `system.cost`/`price` is never read.
5. Customized Items (installed upgrades/mods/lightsaber config) are never automatic.
6. Payout = `floor(unit basis x policy %) x units`, % capped at 100, bounded. Selling more units than are entitled is refused for automatic mode (a stack with one verified unit sells that one unit automatically; the rest need appraisal).
7. Quantity: integer 1..owned; unique types sell alone; partial stacks decrement `system.quantity`; the whole stack/unique Item is deleted.

**Whole Droids / Vehicles**: never automatic. A player submits a request; the GM sees evidence (verified paid cost, published new/used, purchased condition, custom construction total, stock/custom provenance) and a **policy reference** (e.g. verified paid 90,000 x 50% = 45,000), then states the amount and reason. Published used price is evidence only.

## 5. Authorities recorded in the ledger

`audit.resaleAuthority` = `canonical-automatic` (payout re-derived; `audit.resaleQuote` kept) or `gm-appraisal` (`audit.appraisal`: amount, reason, GM id/name, canonical reference payout, why automatic valuation was unavailable). `audit.requestId`, `audit.assetEvidence` (assets). A GM appraisal never appears as a published or canonical price.

## 6. Security and integrity gates (trusted boundary = `TransactionEngine`)

| Threat | Gate |
|---|---|
| Inflated client payout / `salePrice` / saved request price | the transaction takes no payout; `ResaleService.verifyForCommit` re-derives it. A shown quote is only compared (`quoteChanged` forces renewed confirmation). |
| Edited item price / acquisition flag | valuation uses the canonical listing; acquisition is verified against the ledger |
| Non-GM decisions | `store-sale-approval` / `store-haggle-sale` / appraisals / asset sales require `game.user.isGM` inside the engine boundary and at `resolvePendingSaleRequest` |
| Another actor's inventory | item must belong to the (permission-checked) actor; assets must be owned in both directions (`system.ownedByActorId` and the owner's `ownedActors`) |
| Duplicate / copied / dragged-in Items | no ledger-verified unspent unambiguous lot -> no automatic payout (GM appraisal only) |
| Replay / double approval | `requestId` already in the actor's ledger is refused; same-client lock; item/asset gone or flagged `resale.status` |
| Partial/stale state | quantity, ownership, source, policy re-read at commit; any change -> refusal |
| No rollback snapshot | **sale refused** (credit creation requires a verified snapshot, like credit adjustments) |
| Asset sale failure ordering | asset disposed first, then ONE owner plan (credit + unlink + ledger); credit failure reverts the disposition; revert failure is reported `rollbackFailed/indeterminate`, asset stays GM-held with prior state in `flags.foundryvtt-swse.resale`, seller **unpaid** (never paid-and-still-owning) |
| Currency edge cases | integers only, positive, bounded, `normalizeCredits` |
| Automatic mode with several player-owners | **restricted**: automatic resale is disabled for actors with more than one non-GM owner (no cross-client CAS); they sell through GM approval |

**Not claimed:** exactly-once across clients; the credit update + item removal are one `ActorEngine` plan on one actor (atomic as Foundry allows), but there is no compare-and-swap, so a simultaneous second writer can still win inside the write. The asset path spans two actors and is compensating, not atomic.

## 7. Disposition contract (sold Droid/Vehicle)

The Actor is **kept, never deleted**: `ownership` reduced to `{default: 0, GM: owner}`, `system.ownedByActorId/Name` cleared, owner's `ownedActors`/`relationships` link removed, and `flags.foundryvtt-swse.resale = { status:'sold', transactionId, authority, amount, soldAt, soldBy, previousOwnerActorId, previousOwnership, previousOwnedBy... }` recorded for audit and recovery. The canonical compendium source is untouched. Blockers: not finalized droid, vehicle with assigned crew, already disposed, ownership mismatch.

## 8. What can be sold

| Asset | Mode | Valuation |
|---|---|---|
| Unmodified canonical weapon/armor/equipment/consumable | **GM approval of the canonical quote** (automatic player-executed credit creation is closed; see merge-readiness corrections) | policy % of verified paid, else published |
| Customized, provenance-less, source-mismatched, unpriced Items | GM appraisal only | GM amount + reason |
| Stock/custom Droids, published/custom Vehicles | GM appraisal only (player requests from Asset Bay) | GM amount + reason, with evidence and policy reference |

## 9. Legacy removed

`scripts/apps/item-selling-system.js` (entire file), the dead `.item-sell` listeners in `inventory-ui.js` and `character-like-sheet.js`, caller-payout parameter of `executeSaleTransaction`, saved-price fallbacks in `GMStoreOperationsService`, sale snapshot "continue anyway". `disallowAutoSellNoPrice` is now moot (a missing price is always appraisal-only); its settings toggle remains in the GM UI and is documented as a follow-up removal.

## 10. Tests

New: `tests/store-v2-s9-resale-authority.test.mjs` (14 checks, incl. forged / copied / duplicated / consumed / unspecified-lot references, mixed-price same-listing lots, appraisal lot consumption, threat-model evidence). Updated for the new contract: `ti4c0-g24-pending-sale-identity` (stub derives payout from shown quote/appraisal; requests carry a canonical quote). See the final report for the full-suite result and baseline failures.

## 11. Runtime-unverified / remaining

- `fromUuid`-free catalog lookup of the Item's source, `InventoryEngine.removalBlocker`, `ActorEngine.updateActor` on the sold Actor (ownership/flag deletion with `-=resale`), snapshot creation on real actors, and the GM approvals tab rendering (`evidenceLines`).
- Players with OWNER on an Actor can edit embedded Items and flags; the design therefore never trusts them, but a hostile **GM-less client writing directly to the ledger flag** is outside what offline tests can prove.
- Condition/damage/modification value of whole assets is not modelled: GM judgement.
- Existing assets purchased before this change have no acquisition record: Items fall back to published cost (labelled); assets are "acquisition cost unknown".
- Trade-ins/ownership transfer between actors are not implemented.
- RESOLVED by the project owner (S9 decisions): `resaleBasis` default `acquisition` is approved; whole Droid/Vehicle sales remain GM-approved. (Original wording kept for history:) confirm `resaleBasis` default `acquisition` and whether auto-resale should additionally be allowed for unmodified published whole assets (currently GM-approved with a policy reference).

## Final integrity corrections (post-review of 8933b88)

**Whole-asset sale recovery (`TransactionEngine.executeAssetSaleTransaction`).** Two Actors cannot be written atomically; no multi-Actor atomicity is invented. Order is now:
0. GM / ownership / eligibility / appraisal / replay re-verified, then **owner recovery is established** (verified snapshot). No snapshot → refused before any write.
1. The asset is disposed as `resale.status = 'sale-pending'`, carrying **this transaction's id** and the owner's credit before/after. A failed disposal leaves the owner untouched (verified unpaid; asset state verified by reading it).
2. ONE owner plan (credit + unlink + ledger record) with `transactional: true`.
3. The outcome is **observed on the owner**, never inferred from a resolved/thrown call:
   - paid (credits = after, ledger record present, asset unlinked) — even if the call threw → asset finalized `sold`; post-commit errors are warnings, never failures; the asset is never returned to a paid seller.
   - verified unpaid (ActorEngine reported `FAILED_COMPENSATED` AND the owner reads exactly as before) → asset reverted and the revert verified; if the revert fails → `indeterminate`, owner verified unpaid, asset GM-held `sale-pending`.
   - anything else (`INDETERMINATE`, partial mutation, disagreeing observation) → `indeterminate`/`paymentUnverified`: **asset not restored, owner not refunded**, asset flagged `needsReconciliation` with evidence; the message never claims "unpaid".
4. `TransactionEngine.reconcileAssetSale({ownerActor, assetActorId})` (GM only) resolves a `sale-pending` asset from the ledger: record present → `sold`; no record, asset still linked and balance exactly `ownerCreditsBefore` → restore (verified); anything else → left for manual review.

**Transaction-wide lot allocation.** `executeMutationTransaction` creates one `claimedLots` set per transaction and passes it to every `stampAcquisitions` call; a doc is matched to an unclaimed ledger line of the same listing **and** exact unit price, otherwise it receives no lot (no entitlement). Covered: repeated identical Items, identical Droids/Vehicles, different prices for one listing, mixed types, multiple plans.

**Runtime limitations (unchanged status: OFFLINE_TESTED, not FOUNDRY_TESTED).** ActorEngine's `transactional` rollback and the pending→sold/reconcile flow have only been exercised against stubs; live Foundry acceptance of interrupted asset sales is still required (see the acceptance checklist, section J).


## Merge-readiness corrections (after review of 8fcc5e5)

1. **Automatic credit creation is closed.** Entitlements are verified against the seller's own ledger, which is stored in Actor flags. Foundry has no field-level permission and this system has no server-side hook, so any OWNER can write that ledger directly (and `system.credits`). A client-executed "automatic" sale could therefore mint credits from a forged purchase. `ResaleService.automaticResaleAllowed` now always returns `AUTOMATIC_CREDITS_REQUIRE_GM_AUTHORITY` (constant `AUTOMATIC_CREDIT_CREATION_TRUSTED = false`; deliberately not a setting) and `verifyForCommit` refuses a `store-sale` (player-executed) context. Player item sales always become GM requests; the GM approves the canonical quote or a GM appraisal (GM decision = trust anchor; evidence text says the ledger lives on the seller's Actor). The `autoAcceptItemSales` house rule is now inert. Re-enable only with a GM-controlled executor.
2. **Disposal now really removes the former owner's access.** Foundry MERGES an `ownership` update, so `{default:0, gm:3}` left `player:3` in place. `ownershipReplacement()` adds `-=key` deletions; the undo does the same in reverse.
3. **Restoration is verified against stored state**: pending resale marker gone, owner link, and the exact ownership map (`sameOwnership`). A failed/partial revert re-asserts the `sale-pending` marker so the asset can never become an unmarked GM-held Actor.
4. **`reconcileAssetSale` hardened.** PAID needs: record id = pending id, `Success`, `Sell`, context `store-asset-sale-approval`, owner id, asset id, payout, wallet transition (before/after), consistent wallet (or a later ledger transaction explaining it), seller unlinked (link and relationship), asset has no owner and no player access, no other Actor links it, no other successful sale of it. UNPAID needs: no record, wallet exactly at `ownerCreditsBefore`, seller still links it, relationship presence as recorded (`ownerHadRelationship`), original ownership recorded, no conflicting linker, then verified restoration. Else `unresolved` + `needsReconciliation` + `reconciliationReasons`. Per-asset lock inside a client. Two Actors are still not written atomically.
5. **Price authority**: removed the `system.price` / `item.cost` / `item.price` fallbacks from `store-shared.getCostValue/getCostDisplay` and the purchase audit line.

Not changed: acquisition-lot and ledger replay protections remain (they stop an honest double-submit, not a hostile owner).
