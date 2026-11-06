# SWSE Universal Vehicles — Phase 3 source QA gate review

**Decision: HOLD — not yet globally source-accepted.**

The 48/48 backlog of newly enumerated final-seven-book statblocks is primary-PDF field-verified and previously published CI passed. The 429 source-key identities remain preserved across 14 stages. An additional targeted exception pass checked **10 high-risk source cases** without restarting historical ship audits:

| Area | Scope | Source QA interpretation |
|---|---|---|
| Scum and Villainy | StarForge Station | Original Initiative/Perception contradictions preserved; 5 source batteries not proven physical mounts |
| Scum and Villainy | Hornet | Mutually exclusive heavy/alternate laser configurations; overload only on original default |
| KOTOR | Basilisk War Droid | One droid/vehicle publication identity, autonomous brain with conditional passenger override |
| Clone Wars | SPHA | Five exclusive main-gun variants with shared anti-infantry source rows |
| Clone Wars | TX-130T | Optional astromech and later turret; contradictory second Ranged attack retained |
| Force Unleashed | TX-130T | Distinct CL8 publication vs Clone Wars CL7; source +1 summary vs +2 detail preserved |
| Galaxy at War | YU-410 | Source prints two DR values; no invented SR |
| Galaxy at War | WLO-5 | Malformed 115,00 cost preserved, rather than guessed |
| Galaxy at War | GAT Shock and Awe | Conditional Fire Effect, not another weapon or four publication identities |
| Core + SotG | Vulture hybrid | Separate sourcebook claims, one walker/starfighter identity per book; Core page/title discrepancy discovered |

## Critical remaining provenance repair

In the original scanned **Core Rulebook** (SHA256 `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`), the original heading **“Vulture” Droid Starfighter** begins on **printed p181**, physical PDF **p182**. In the frozen Phase 1 census, its Core statblock claims `Vulture-class Droid Starfighter`, printed **p180**, physical **p181**. The Core Phase 2 draft staging inherits that erroneous provenance. Preserve `core-vulture-class-droid-starfighter` as its stable key. Before calling Phase 3 globally complete, make a **controlled, explicitly logged provenance amendment** that reconciles Phase 1 ledger, census and source staging without rewriting source keys or confusing the existing historical 316-ship authority.

The independent SotG Vulture publication on printed p78 is valid; its 3×3 character-scale source geometry omission was fixed in checkpoint `7d2456a` without adding a separate walking-mode Actor.

## Gate definitions

- **PDF-field backlog:** completed 48/48.
- **Named targeted exception reviews:** 10/10 checked and documented; other source anomalies can still be discovered.
- **Global Phase 3 source acceptance:** **HOLD**, pending Core Vulture frozen provenance reconciliation.
- **Strict physical weapons, firing arcs, crew/operator attacks:** NOT certified by source QA. Prior stronger per-ship certificates are not expanded.
- **Phase 4A/4B source SSOT and category projections:** do **not** represent as accepted while source provenance gate holds.
- **Phase 4C imports:** hard blocked independently by CP23-C4C `normalizeVehicleImportData` numeric Initiative and unknown-field default losses.
- **Live Foundry V13 world and release:** not performed; no new actor/pack authorization.
- **No merges to main** without approved controlled release workflow.

`tests/vehicle-universal-phase3-source-acceptance-gate.test.mjs` guards 429 source-key uniqueness, all 48 queue entries, the 10-case exception ledger, the Vulture hold, and absence of new executable weapon mounts.

**Next actionable checkpoint:** explicit Core Vulture provenance amendment, exact-key+source SHA regression, then an independent acceptance decision before Phase 4A. Do not turn this hold into another 429-ship source audit.
