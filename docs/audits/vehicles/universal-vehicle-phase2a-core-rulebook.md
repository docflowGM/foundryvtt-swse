# Universal Vehicle Phase 2-A — Core Rulebook full 17-record hydration

**Status:** All 17 source publication identities staged for universal schema v0.5; **strict mechanical/weapon-mount certification is not claimed**.

## Scope and source evidence

- The seven ground/air records are the two initial walker records from the earlier checkpoint, plus the X-34 landspeeder, 74-Z speeder bike, AAT-1 assault tank, modified T-47 airspeeder, and LAAT/i gunship.
- Their additional mechanical values are read from the primary supplied Core Rulebook PDF printed pp176-178 (physical PDF pp177-179).
- The ten preexisting spacecraft are adapted from the existing reviewed `data/canonical/vehicles/ships.json`, with direct scan comparison where legacy snapshot fields were sparse (notably Y-wing, TIE variants, Vulture hybrid).
- All names, source entry keys, pages and book hash remain the frozen Phase 1 publication identities.
- Historic source weapon groups retain their printed attack bonus, damage and crew station in non-executable `armament.firingGroups`; we do **not** infer physical weapon mounts, arcs or executable stock attacks from printed attack labels.
- Alternative crew/astromech modifiers, printed OR/AND attack strings, TIE no-hyperdrive condition, Vulture walk transformation, AAT ion vulnerability, LAAT penetration, and T-47 harpoon grapple notes are retained.
- Original source disagreements are copied into `exceptions.ambiguities`, not resolved by guessing. Fields not established by printed source are omitted or explicitly marked unreviewed instead of manufactured.
- **Production pack files, generated Actors and gameplay mechanics are unchanged.**

## Results

| Inventory | Count |
| --- | ---: |
| Previously staged Core walkers retained | 2 |
| Additional ground/air records hydrated | 5 |
| Historical Core spacecraft adapted | 10 |
| **Core source records staged** | **17 / 17** |
| Uncertified strict mount/weapon profiles | **17** |

All records live in `data/audits/vehicles/swse-universal-phase2a-core-rulebook-staged.json`, retaining the 23 required top-level schema groups. The complete-book unit tests live in `tests/vehicle-universal-phase2a-core-staged.test.mjs`.

**Next:** Strict source-to-schema field audit / exceptional mechanics typing and physical mount certification. Then apply the same source-specific mechanical hydration process to the next book. This checkpoint is source-hydration-complete, **not** the Foundry V2 runtime vehicle cutover.
