# Live Foundry V13 acceptance checklist: Equipment Workspace, Droid Systems, Vehicle Command Deck

Status of every item below: **PENDING LIVE FOUNDRY V13 ACCEPTANCE** (not failed certification). Nothing in PRs #1137 / #1139 is `FOUNDRY_TESTED`; offline and Chromium-harness results are not live results.
Suggested first pass: one Character, one NPC Follower, one Droid, one Vehicle. Record defects for a dedicated live-testing correction PR.

## Equipment (Character, NPC, Follower, Droid)
- [ ] Gear tab opens on each actor type (NPC/Follower: tab reachable for editors; Follower "Store" header present).
- [ ] Seven tabs: Weapons | Armor | Shields | Gear | Droids | Vehicles | All; All is default; last choice remembered.
- [ ] Search, status filter, sort, direction, Reset, "N of M" behave and agree across tabs.
- [ ] Selecting an item (row, held slot, worn armor, equipped shield, implant, linked actor) opens the Item Inspector (~33%); hidden = zero layout space; X restores full width preserving filters/scroll; Escape and keyboard work; narrow window uses the drawer.
- [ ] Quick actions (equip/unequip, draw/stow, quantity) use the existing handlers and respect permissions; Follower Equip parity.
- [ ] Carried weight (kg): unworn armor counted, quantity 0 honored, "+N unweighed" shown where applicable.
- [ ] Linked Droids/Vehicles show as actor references (no weight/quantity) with "Linked · ownership not established" when ownership is not recorded.
- [ ] Player-to-GM equipment request route remains DISABLED (Gate 1 identity probe still unrun).

## Droids
- [ ] Droid Systems tab: Confirmed / Disabled / Draft / Item-only / Not established labels correct for real data.
- [ ] Multiple appendage instances appear as separate entries with their own instance/location; no invented left/right or default arms.
- [ ] Appendage hold/wield capability shows "Not established" (catalog evidence missing; do not treat as a defect of the UI).
- [ ] Integrated weapons: ledger-installed + enabled can Roll/Use/self-destruct; draft, disabled, item-only, unresolved, stale-instance and stray same-type Items are refused with a reason (and still post the descriptive card).
- [ ] Several identical installations require naming the physical instance.
- [ ] Open Garage from a component carries its identity; NPC-type Droid Follower cannot open the Garage from the sheet (existing behavior).
- [ ] Stock-statblock droid: Combat-tab attacks unchanged; Droid Systems buttons gated (expected).
- [ ] Droid Followers: classification via Droid rules profile; Draw still withheld without hold/wield evidence (expected).

## Vehicles
- [ ] Published and custom vehicles render the Command Deck weapons/installed-systems browser.
- [ ] Certified (stock/installed) vs blocked/unresolved vs printed reference-only weapons; reference-only never becomes an executable mount.
- [ ] Installed systems from the sealed ledger; EP accounting explicit.
- [ ] Shipyard operations/jobs, aftermarket install, crew, cargo, maneuvers.
- [ ] Source-invalid vehicle (legacy `system.weapons`) is reported, not silently fixed.

## Asset Bay
- [ ] Owner / shared co-owner shown "Owned"/"Shared co-owner"; Modify allowed only with document permission.
- [ ] Access-only: shown "Access only (not owned)", never in possessions, Modify refused.
- [ ] Former owner, contradictory records (refused even for GM), name-only records (unresolved) labelled and refused.
- [ ] Same-name characters and one Foundry user with several characters never share ownership.

## Still-deferred (unchanged)
EQ-001, EQ-002, EQ-003, EQ-W-001; droid species-evidence decision for Draw; droid appendage hold/wield capability evidence; 36 unreferenced `templates/actors/droid/**` files pending a runtime-validated prune.
