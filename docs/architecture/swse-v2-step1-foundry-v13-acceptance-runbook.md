# SWSE V2 Step 1 - Foundry V13 Acceptance Runbook

**Status: NOT EXECUTED.** Everything verified so far is Node/shim testing plus GitHub CI. None of it is Foundry v13 acceptance. This runbook is the checklist for the person running a Foundry v13 world. Nothing below has been observed to pass.

Build under test: PR #1118 `feature/v2-vehicle-upgrade-writer-closure` at the exact SHA recorded in the Results table (CI-verified heads: `8778d44` code, `70bd3b1` docs). Use a throw-away world; do not test in a live campaign.

## How to record every test
For each step record: (a) the Actor/Item state **before** and **after** (credits; `system.installedSystems`; `system.droidSystems`; `flags.swse.vehicleInstallations`; relevant embedded Items; owner fields), (b) any console error or warning, (c) the transaction record (`flags.foundryvtt-swse.transactions` on the payer), (d) whether the outcome was **verified in the persisted data** or only displayed as success in the UI. A UI toast is not evidence.

A failed test gets a **targeted repair commit and a fresh exact-head check**, not an architecture rewrite.

## Preconditions
Load the world with the branch checked out. Create: a GM user; two player users each with a character (`Owner A`, `Owner B`) holding generous credits; one PC `droid`; one NPC-type droid follower of Owner A; one published native Vehicle (certified source) owned by Owner A; one unclaimed/homebrew vehicle; one stock-statblock droid.

## Scenarios

| # | Scenario | Do | Expected (from the code under test) | Record / check |
|---|---|---|---|---|
| 1 | **System startup** | Load the world; open the sheet shell, Holopad, Garage (droid), Shipyard (vehicle), Upgrade surface, Store, Asset Bay. | No console error about a missing module/hook. The deleted files (`droid-builder-app`, `stock-droid-conversion-dialog`, `vehicle-modification-manager`, `assets-hooks`, `mutation-gateway/router`, `UpdatePipeline`, `ActorCommands`, `ProgressionStatePersistence`, `store-transaction-engine`, `vehicle-transaction-service`, shell `mutation-coordinator/plan`, `follower-droid-garage-hotfix`) must produce no 404/import error. | Console log from world load; every opened surface renders. Any import error = failure. |
| 2 | **Droid follower Garage** | Open the Garage for the NPC-type follower as Owner A; buy a certified part; confirm; then remove it. | Owner A is charged; the follower's ledger (`system.installedSystems`) gains/loses the part with the same instance ids as the mirror; resale credits go to **Owner A**, not the follower; displayed modifiers change only for confirmed ledger hardware; a mirror-only or Item-only part is **not** sellable. | Credits of Owner A and the follower before/after; ledger + mirror; transaction audit shows `payerAuthorization.basis = RECORDED_OWNER`. Try also: a different player as payer (must be refused), GM as payer (allowed, audit `GM_OVERRIDE`). |
| 3 | **Ownership and grants** | (a) primary owner; (b) GM **shared** grant to Owner B; (c) **access-only** user; (d) the original purchaser after a transfer; (e) GM override; (f) an actual transfer vs a shared grant. | Primary owner and explicit shared co-owners may fund/receive resale. The original purchaser, a former primary owner, an unshared `ownerActorIds` residue and access-only users may **not** (refused with a clear reason). Contradictory ownership records refuse everyone, including self-funding and the GM gate. | For each: spending result **and the Foundry document permissions** of the asset (`asset.ownership`) and the owner-side `system.ownedActors`/`system.relationships`. **Known open question:** `AssetGrantService` is additive for `accessActorIds` and document ownership and does not remove the previous owner's Foundry permissions or links - decide separately whether a *transfer* should; this runbook only records what happens. |
| 4 | **Vehicle Shipyard** | On the published vehicle's sheet use the Shipyard: start a job, log work days (GM), roll the check, install; then uninstall. Try an unsupported/uncertified item. | Only `flags.swse.vehicleInstallations` / jobs change; EP and costs follow the published procedure; uncertified or unknown values fail closed with a reason; weapon Items sync where the certified data permits; a failed sync reports `partial`, never a silent success. | Vehicle flags + owner credits before/after; transaction audit; weapon Items present/absent. |
| 5 | **Vehicle Upgrade Workshop** | Open the Upgrade surface for the vehicle and for a droid and for an ordinary weapon. | The vehicle is **not offered**; calling the old install/remove (macro/console `CommandBus.execute('APPLY_ITEM_UPGRADE', ...)` with a `vehicle-actor-` id) throws the refusal and changes nothing. Droid upgrades still route through the Garage engine (owner-funded for followers); ordinary item upgrades unchanged. | Vehicle `system.installedSystems` unchanged; credits unchanged; droid/item upgrade works. |
| 6 | **Ammunition and logistics** | Buy stock and aftermarket ammunition, fuel and supplies; try insufficient credits; try as a non-owner. | Credits and the persisted ledger change together; refusals leave both untouched. Postconditions here are **only structurally verified offline** - this live run is their first behavioral proof. | Ammo ledger/logistics flag + credits before/after; inject a failure if you can (e.g. temporarily make the item update fail) and confirm both actors are restored. |
| 7 | **Tech Specialist** | Apply a modification to an Actor subject and to an Item subject; try a failed check. | Correct target changes; credits deducted once; derived stats update; failed check reports the loss; a write that does not persist rolls back. | Flags on the target, credits, derived values. |
| 8 | **Store and asset acquisition** | Buy a supported stock droid and a native vehicle; try a source-HOLD/uncertified record; try an insufficient-credit purchase. | Owned Actor created with owner links and `storeAcquisition` provenance; stock droid is in stock-statblock mode with an empty ledger and no double-counted bonuses; HOLD/uncertified records stay blocked; failure creates no Actor and no debit. **Whole-asset acquisition has NO postcondition verification in code** - check for orphan Actors/duplicate credit rows by hand. | World actor list before/after; owner credits; Asset Bay link; transaction record. |

## Results (fill in during the run)

| # | Scenario | SHA tested | Tester | Date | Result (PASS / FAIL / BLOCKED) | Evidence link / notes |
|---|---|---|---|---|---|---|
| 1 | System startup | | | | | |
| 2 | Droid follower Garage | | | | | |
| 3 | Ownership and grants | | | | | |
| 4 | Vehicle Shipyard | | | | | |
| 5 | Vehicle Upgrade Workshop | | | | | |
| 6 | Ammunition and logistics | | | | | |
| 7 | Tech Specialist | | | | | |
| 8 | Store and asset acquisition | | | | | |

Live acceptance progress: **0 / 8**.
