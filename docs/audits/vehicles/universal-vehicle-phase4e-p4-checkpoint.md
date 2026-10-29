# Universal Vehicles — Phase 4E P4 Checkpoint (engines)

## P4-A derived data, damage, defenses
`vehicle-published-derived.js` (digest-verified record, cached per record object) feeds `buildVehicleDerived`: printed Reflex/Fortitude/flat-footed, damage threshold, damage reduction and HP **max** come from the publication record, not mutable `system` mirrors (a tampered `damageThreshold`, `damageReduction`, `reflexDefense`, `hp.max` no longer changes derived values). Current HP stays `system.hp.value`. Unknown DR/flat-footed is flagged (`reductionPublished`, `flatFootedPublished`). Combat damage already writes only `system.hp.value`.

## P4-B movement and Initiative
- `derived.speed` for source-backed vehicles is the structured published movement (all modes, both scales); unknown movement is `null`, replacing the character default speed of 6 that `computeCharacterDerived` seeded.
- `SWSEInitiative` and `swse-combat` use the printed Initiative (negative/zero/positive) as the vehicle Initiative base.
- Open: V-P4-01 — the existing vehicle size modifier still applies on top of the printed value (unchanged; awaiting ruling).

## P4-C crew and stations
Source-backed vehicles: published crew count (not parsed text, no default), quality unknown unless published, and the legacy `ownedActors` station fallback is no longer consulted by either `crew-resolver.js` or `vehicle-crew-actor-authority.js`. Gunner-N stations come only from installed weapons, never from printed attack groups. Invalid/deleted/abstract crew distinctions preserved.

## P4-D physical mounts and attacks
- **Bypass closed:** `classifyInstalledVehicleWeapon` trusted actor-provided `system.modificationData` / `system.shipyard` / `system.weapons` to grant a "shipyard modification" exemption from the stock-source gate. A source-backed vehicle (or any vehicle *claiming* provenance, including one whose record fails its digest) can no longer use it.
- A weapon fires only via `CERTIFIED_INSTALLATION`: a weapon Item owned by the vehicle, linked by `system.vehicleMount.installId` to a sealed ledger entry that is `executable:true`, category Weapon, with mount key/arc/operator role, matching name and operator role; then target, resolved crew station and legal arc are required before any cost (`rollAttack` gate already precedes costs).
- Nothing sets `executable:true` today; the planner always writes `false`. Enabling a weapon is intentionally blocked on V-P2-04 (mount/damage/attack authority).
- Ledger flag writes are guarded by a `preUpdateActor` hook; only `VehicleInstallationService` authorizes its exact ledger for the duration of its transaction. This guards accidental/macro writes, not a hostile console.

## P4-E operational systems
Removed the invented 350/250/600 power defaults and the "WIRE GAP"/"Phase 2" strip placeholders; resource-strip entry relabelled Power (it is not Emplacement Points). Directional shield zones are suppressed for unknown/conditional/conflicting/zero SR. House-rule engines (Enhanced Shields/Engineer/Pilot/Commander, subsystems, turn controller) are unchanged and remain governed by their settings; no new mechanics were added.

## Outstanding
- Rules decisions: V-P2-01..04, V-P4-01 (see `swse-rules-decisions-pending.md`).
- `LIVE_RUNTIME_PENDING` for P1–P4: no Foundry V13 world was available.
- Per owner instruction, CI is to be checked at the end of P4 against the final pushed SHA.
