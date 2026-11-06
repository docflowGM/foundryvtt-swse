# Universal Vehicles — Phase 4E P3 Checkpoint (Store)

## Implemented
- `scripts/domain/vehicles/vehicle-store-eligibility.js` (pure): published-price eligibility (`evaluateVehiclePurchase`), listing of the 429 with unique identity and price classes (`buildVehicleCatalogListing`: 271 priced / 142 not-for-sale / 9 ambiguous / 7 absent), and the Store cost record for source-backed vehicles.
- Used price is only ever a **published** used price (238 vehicles); never derived from the new price. Non-priced vehicles are not purchasable; a GM offer is accepted only with `authorizedByGM`, user id, reason and positive price, and carries `authority:'gm-override'` (not wired to any UI yet).
- `cost-registry.js`: source-backed vehicles price from `universalVehicleSource.economics`, ignoring the mirrored `system.cost`; missing new/used stays `null` (was silently 0).
- `store-checkout.js`: `createVehiclePlans` re-evaluates eligibility per condition and offer price before the debit (direct and cart); cart price drift is now exact (was 5%). The legacy "custom starship builder" (`data/stock-ships.json` frames) is retired with a message; `VehicleModificationManager` is marked deprecated (no consumer left).
- `loader.js` / `store-constants.js`: world/owned vehicles are no longer store inventory; the 11-pack index must verify complete (429, no duplicates) or vehicles are hidden with an error; cache key bumped to v6, metadata v7, `swse-store-cache-v5` purged.
- Unchanged and reused: `TransactionEngine` (debit, `prepareCreateActorPlans` ownership/Asset Bay link, rollback), `VehicleFactory` source-faithful copy with its own world `_id`.

## Not done / pending
- Merchant inventory counts, seller policy and GM approval for vehicles use the existing policy layer; no vehicle-specific stock counts were added. A catalog browse UI separating "source catalog" from "merchant offers" is not built; only the data (`buildVehicleCatalogListing`, loader metadata) exists.
- Exact-once debit, refund on Actor-create failure and Asset Bay placement rely on `TransactionEngine`/`StoreEngine` existing behavior; not exercised here (no Foundry). `LIVE_RUNTIME_PENDING`.
- Deletion of `vehicle-modification-manager.js` and `data/stock-ships.json` deferred (surface prune; macro compatibility unconfirmed).

Tests: `tests/vehicle-universal-phase4e-p3-store-eligibility.test.mjs` (9). P0 assertion in `p0-consumers` updated from the inline priced check to the stricter `evaluateVehiclePurchase` gate. P1 regression found and fixed: SR strip label "Unknown" restored for phase 4C test.
