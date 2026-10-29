# Universal Vehicles Phase 3N - Scavenger's Guide to Droids source-field QA

**Primary source:** Scavenger's Guide to Droids (optimized) original PDF SHA256 `bd72d74278b812dab95a6ee9d0aef730afec4feb9c37daef59bc733842489361`, printed p82 / physical PDF p83, visually inspected.

**1/1** newly enumerated DP-2 Probe Droid vehicle source entry field-verified. This closes the planned **48/48** previously TXT-staged PDF-field QA queue across the final seven books. Phase 2 still has **429/429 staged publication-specific records**; already primary-reviewed ship claims were *not* reaudited.

## DP-2 source-fidelity correction

The source record is a **single hybrid Large starfighter/ground vehicle (speeder)**, and simultaneously an associated Large second-degree droid. It is not duplicated into an extra spacecraft and extra droid Actor. Original printed CL6, Init+6, Perception+7, Ref12, Fort14, HP40, DR5, speed 12 squares (575km/h) plus starship-scale 3, no crew, 15 kg cargo, 2 days consumables, 16 space beacons payload, and 36,500 credits price.

The Phase 2 staging omitted the printed weapon attack subsections. Verified source lines:
- **Melee claw +4**, damage 1d6+4; represented in `combat.meleeAttackLine`, not a ranged source firing group.
- **Ranged blaster cannon +2**, damage 3d12.
- **Ranged space beacon launcher +2**, no damage, source payload 16 beacons.

These are now **two untrusted ranged source attack groups**, plus the separately retained melee attack. No physical mount, binding, firing arc, programmatic projectile damage or actor execution authority was granted. Printed special droid actions remain notes pending approved typed droid/vehicle consumer.

## Gate boundaries

**48/48 primary-PDF field QA queue closed.** This only completes the *newly enumerated 48-record original PDF comparison workload*. Strict physical mount, operational attack, crew station and Foundry v13 V2 runtime/cutover gates remain separate. Existing ship reviewed/strict source status remains unchanged. No production compendium, `ships.json`, foundry runtime, or Actor was changed. Jedi Academy inherited ship check plus documented targeted anomaly reconciliation may still be required before issuing a comprehensive Phase 3 acceptance closeout.
