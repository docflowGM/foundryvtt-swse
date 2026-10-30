# Universal Vehicles — Phase 4E Stabilization Checkpoint

Branch `audit/universal-vehicles-phase1` (PR #1092 stays draft, unmerged). Starting point `b97c40b`.

## What changed

**1. Source and lifecycle authority**
- `classifyVehicleActorSource(doc, data, { mode })`: `creation` (default) still rejects any embedded Item so no stock weapon can be generated; `runtime` (projection, sheet submit, factory modification plan, installation service, customization lane) allows equipment Items. `weapons` rows, identity, printed statistics and non-installable printed groups are enforced in both modes. The projection reports `installed.equipmentItemCount` and `uncertifiedWeaponItems`; Items never certify anything.
- `vehicle-source-identity.js` is the single implementation of the identity/provenance invariants (schema, digest, key, book/page, category/pack owner, model, SOURCE_ONLY trust). The contract, derived data, Initiative, the attack gate and combat provenance all use it. A vehicle that claims publication but fails verification is flagged (`derived.sourceInvalid`), refused Initiative, and denied attacks; it never falls back to a legacy calculation.
- `checkProvenanceUpdate` + `preUpdateActor` hook: published identity, source record, printed statistics (`hp.max`, Initiative, Reflex/Fortitude, SR max, model, category, mirrors) cannot be changed by an ordinary update; re-submitting the current value is a no-op. The digest is tamper evidence, not authenticity.

**2. Store transaction authority**
- `revalidateCart` fails closed (no purchase, diagnostic retained). Previously an unexpected exception returned `valid: true`.
- The charge is verified against the Store's own policy-applied offer (`evaluateVehicleMerchantPurchase`: merchant price must be positive, equal the cart price, and the published price state must allow the condition). One purchase per wallet actor at a time (`purchase-in-progress`).

**3. Shipyard ledger integrity**
- Duplicate installation ids (including ids held by unverified entries) and installing onto a ledger that contains unverified entries are refused. One install/uninstall per vehicle at a time. The wallet actor must be the vehicle's recorded owner (a GM may act). Rollback of both actors on a failed asset write is covered through the real `TransactionEngine`.
- The operator station used in the combat gate comes from the sealed mount, not editable Item fields.

**4. Display**
- Printed armament moved to the always-present Stats tab. Signed bonuses: `-2`, `+0`, `+5`.
- Power panel no longer fabricates values; directional shields suppressed unless SR is published and positive.

**5. Repo checks (previously failing in the rolling suite)**
- `phase-5c-canonical-production-negative`: universal vehicle data registered in the authority classification registry (OTHER_DOMAIN_DATA) and the classification rebuilt. No guardrail was weakened; `verify-canonical-production` passes.
- `talent-membership-and-pack-completion`: failed because `tools/check-system-manifest.mjs` demanded a committed source for `vehicles-ground-armor` and `vehicles-hybrids`. Canonical vehicle packs are generated from the SSOT by `tools/release/build-packs.mjs`; the manifest check now verifies generation (non-empty documents per pack) instead. The stale legacy `packs/vehicles-*.db` files remain as historical evidence for the CP23 reconciliation test and are not the source of the canonical packs.

## Test infrastructure
`tests/helpers/systems-resolver.mjs` (maps `/systems/foundryvtt-swse/…` imports) and `tests/helpers/foundry-stubs.mjs` let the real context builder, `TransactionEngine`, `StoreAcquisitionService`, Asset Bay and `rollAttack` run in Node. New suites: `p5-source-authority`, `p5-store-transaction`, `p5-acquisition-assetbay`, `p5-sheet-integration`, `p5-installation-transaction`, `p5-combat-chain`.

## Status of P0–P4
- **Functional (offline-tested):** source-only creation and runtime contract; sheet display and edit restrictions; derived defenses/DT/DR/HP max; movement by scale; printed Initiative; crew authority; Store listing, pricing and checkout gates; Asset Bay assignment of a purchased vehicle; attack denial for every non-certified path; ledger planner, service, rollback.
- **Implemented but intentionally disabled pending rulings:** any canonical modification (V-P2-01, V-P2-02); modification effects, uninstall refund (V-P2-03); executable installed weapons (V-P2-04); the size modifier on printed Initiative still applies unchanged (V-P4-01).
- **Not done:** separate browse UI for source catalog vs merchant inventory; ledger UI beyond the engine error text; house-rule engines unchanged.
- **Requires live Foundry V13:** all of the above rendering, persistence, permissions and token/arc behavior.

## GM live-test checklist (disposable V13 world)
1. `await SWSE.debug.vehicles.audit()` → 11 packs, 429 identities, no problems.
2. Create a world Actor from the X-wing and Core Vulture entries; confirm source key, book/page, Initiative +7 / unknown SR, `system.weapons=[]`, zero Items. Rename it ("Red Five"): printed model stays, call sign changes.
3. Open the sheet: Stats tab shows Published Statistics and the printed armament (also for a speeder, which has no Operations tab); edit tab shows only HP / shields / notes. Reduce HP, close, reopen: persists; max unchanged.
4. In the console try `actor.update({'system.hp.max': 5})` and `actor.update({'system.model':'X'})`: both denied. Add an equipment Item: sheet still renders.
5. Assign crew to the pilot station; delete that crew Actor: station shows invalid, no fall back to an ownedActors link.
6. Store: browse; a not-for-sale vehicle cannot be added; buy the X-wing new (charged once, one new Actor with its own id, listed in the buyer's Asset Bay, source key preserved); double-click checkout (second click refused); try a used price on a vehicle without a published used price (blocked).
7. Shipyard: open it on the purchased vehicle: install is denied with a visible reason (no certified catalog row / unknown EP); credits unchanged.
8. Combat: add the vehicle and a target to a scene; the pilot attacks: denied before any ammo/action cost (no weapon exists). Roll initiative: printed +7 is the base.
9. Cleanup: delete the test Actors and scratch import (`MANUAL_CLEANUP_REQUIRED` means delete manually).

Status: `LIVE_RUNTIME_PENDING`.
