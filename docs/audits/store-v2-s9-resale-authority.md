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

**Authoritative evidence = the purchaser's transaction-ledger line** (`audit.items[]`: `listingId`, `sourceUuid`/`sourceEntryKey`, `unitCost`, `publishedUnitCost`, `quantity`, `condition`). The delivered Item/Actor carries only a **reference** (`flags.foundryvtt-swse.acquisition`: `transactionId` + the same figures, stamped by `TransactionEngine` from a plan marker). `verifyAcquisition` re-reads the ledger and requires every figure to match, so editing the flag cannot raise a payout. Loot, GM grants and pre-ledger assets verify as **"acquisition cost unknown"** (never zero, never invented). Disposed units are counted from sale records (`resaleQuote.acquisitionTransactionId`), so one purchase is paid for once; the acquisition record is never deleted when an asset is sold.

Covered purchase paths: catalog Items, stock Droids, published Vehicles (condition recorded), GM-approved purchases, and Store-built custom Droids (`kind: custom-droid-construction`, quote hash). Custom ships keep their sealed construction record; subsequent installations are **not** valued (no double counting, no invented value).

## 4. Valuation rules

**Embedded Item** (automatic, `canonical-automatic`):
1. The Item must carry `_stats.compendiumSource` that resolves, by exact UUID, to a Store-catalog listing with the same name and type, and a published `system.cost`. The embedded copy's own `system.cost`/`price` is never read.
2. No known customization surface may be populated (`system.installedUpgrades`, any `flags.swse.*` key matching upgrade/gearMods/modification/customiz/lightsaberConfig/installed). Customized Items need a GM appraisal; no modification value is invented.
3. Basis policy (house rule `resaleBasis`, default `acquisition`, **a project policy not a published SWSE rule**): units whose purchase is verified in the ledger are valued at the price actually paid; other units fall back to the published cost, labelled. `published` uses published cost for all units.
4. Payout = `floor(unit basis x policy %) x units`, policy % = existing `automaticSalePercentage` (default 50, capped at 100), per segment; bounded (`MAX_RESALE_CREDITS`). A 0 payout, missing price, mismatch or missing source -> **GM appraisal only**.
5. Quantity: integer 1..owned; unique types sell alone; partial stacks decrement `system.quantity`; the whole stack/unique Item is deleted.

**Whole Droids / Vehicles**: never automatic. A player submits a request; the GM sees evidence (verified paid cost, published new/used, purchased condition, custom construction total, stock/custom provenance) and a **policy reference** (e.g. verified paid 90,000 x 50% = 45,000) as a convenience, then states the amount and reason. Published used price is shown as evidence only; it is not turned into a buyback formula.

## 5. Authorities recorded in the ledger

`audit.resaleAuthority` = `canonical-automatic` (payout re-derived; `audit.resaleQuote` kept) or `gm-appraisal` (`audit.appraisal`: amount, reason, GM id/name, canonical reference payout, why automatic valuation was unavailable). `audit.requestId`, `audit.assetEvidence` (assets). A GM appraisal never appears as a published or canonical price.

## 6. Security and integrity gates (trusted boundary = `TransactionEngine`)

| Threat | Gate |
|---|---|
| Inflated client payout / `salePrice` / saved request price | the transaction takes no payout; `ResaleService.verifyForCommit` re-derives it. A shown quote is only compared (`quoteChanged` forces renewed confirmation). |
| Edited item price / acquisition flag | valuation uses the canonical listing; acquisition is verified against the ledger |
| Non-GM decisions | `store-sale-approval` / `store-haggle-sale` / appraisals / asset sales require `game.user.isGM` inside the engine boundary and at `resolvePendingSaleRequest` |
| Another actor's inventory | item must belong to the (permission-checked) actor; assets must be owned in both directions (`system.ownedByActorId` and the owner's `ownedActors`) |
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
| Unmodified canonical weapon/armor/equipment/consumable | automatic (single-owner actor, `autoAcceptItemSales` on) or GM approval of the canonical quote | policy % of verified paid, else published |
| Customized, provenance-less, source-mismatched, unpriced Items | GM appraisal only | GM amount + reason |
| Stock/custom Droids, published/custom Vehicles | GM appraisal only (player requests from Asset Bay) | GM amount + reason, with evidence and policy reference |

## 9. Legacy removed

`scripts/apps/item-selling-system.js` (entire file), the dead `.item-sell` listeners in `inventory-ui.js` and `character-like-sheet.js`, caller-payout parameter of `executeSaleTransaction`, saved-price fallbacks in `GMStoreOperationsService`, sale snapshot "continue anyway". `disallowAutoSellNoPrice` is now moot (a missing price is always appraisal-only); its settings toggle remains in the GM UI and is documented as a follow-up removal.

## 10. Tests

New: `tests/store-v2-s9-resale-authority.test.mjs` (11 checks). Updated for the new contract: `ti4c0-g24-pending-sale-identity` (stub derives payout from shown quote/appraisal; requests carry a canonical quote). See the final report for the full-suite result and baseline failures.

## 11. Runtime-unverified / remaining

- `fromUuid`-free catalog lookup of the Item's source, `InventoryEngine.removalBlocker`, `ActorEngine.updateActor` on the sold Actor (ownership/flag deletion with `-=resale`), snapshot creation on real actors, and the GM approvals tab rendering (`evidenceLines`).
- Players with OWNER on an Actor can edit embedded Items and flags; the design therefore never trusts them, but a hostile **GM-less client writing directly to the ledger flag** is outside what offline tests can prove.
- Condition/damage/modification value of whole assets is not modelled: GM judgement.
- Existing assets purchased before this change have no acquisition record: Items fall back to published cost (labelled); assets are "acquisition cost unknown".
- Trade-ins/ownership transfer between actors are not implemented.
- Policy question for the owner (not a rules ruling): confirm `resaleBasis` default `acquisition` and whether auto-resale should additionally be allowed for unmodified published whole assets (currently GM-approved with a policy reference).
