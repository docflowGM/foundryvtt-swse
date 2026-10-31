# Universal Vehicles — Phase 4E P2 Checkpoint (Shipyard installation)

## Implemented
- `scripts/domain/vehicles/vehicle-installation-ledger.js` (pure): sealed per-entry ledger at `flags.swse.vehicleInstallations`, separate from the published base. `planVehicleInstallation` / `planVehicleUninstall` fail closed with visible reason codes: `CATALOG_ENTRY_UNCERTIFIED`, `EP_COST_UNKNOWN`, `EP_BUDGET_UNKNOWN`, `EP_EXCEEDED`, `PRICE_UNKNOWN_OR_UNRESOLVED`, `AVAILABILITY_UNKNOWN`, `SIZE_INELIGIBLE|AMBIGUOUS|UNPARSEABLE`, `WEAPON_MOUNT_UNCERTIFIED`, `INSUFFICIENT_CREDITS`. Explicit zero EP / zero price are values, not unknowns.
- `getVehicleRuntimeProjection().installed` now reads only sealed ledger entries (forged/edited/other-hull entries are ignored and counted in `rejectedLedgerEntries`). Stock mounts stay uncertified; ledger entries are `executable:false`.
- `scripts/engine/vehicles/vehicle-installation-service.js`: one `TransactionEngine.executeAssetCustomizationTransaction` per install/uninstall (credits + ledger write, snapshot rollback of both actors). Denied plans never reach the engine.
- `VehicleCustomizationEngine` (Customization Bay vehicle lane) now returns `VEHICLE_CUSTOMIZATION_CANONICAL_REQUIRES_INSTALLATION_SERVICE` for canonical vehicles at all four entry points; the uncertified `installedSystems` path cannot touch a published hull.
- Owner-ruling seam: `DEFAULT_VEHICLE_INSTALLATION_RULES` (EP budget, uninstall refund). Defaults deny / grant nothing.

## Consequence (important)
**No canonical vehicle can currently be modified**: no catalog row is certified (no book/page) and EP-budget semantics are unruled. Rules gaps are recorded as V-P2-01..04 in `swse-rules-decisions-pending.md`. This is deliberate; the machinery is complete and tested with fixtures, so a ruling plus certified rows enables installs without code changes beyond the rules seam.

## Not done / deferred
- Effect application to effective defenses/speed/shields (V-P2-03). Only EP and cost are tracked.
- Customization Bay UI does not yet render the ledger or denial reasons beyond the engine error text.
- `VehicleModificationManager` still fetches `data/stock-ships.json`; its only consumer is `store-checkout.js` — removal belongs to P3.
- Residual risk: the ledger flag can be written by any permitted `actor.update`; the seal is tamper-evidence, not a signature. A preUpdate guard is a P4-D prerequisite before any entry can enable a weapon.
- `LIVE_RUNTIME_PENDING`.

Tests: `tests/vehicle-universal-phase4e-p2-installation-ledger.test.mjs` (12).
