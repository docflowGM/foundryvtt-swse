# Universal Vehicle Phase 2-F — Scum and Villainy

**Checkpoint:** All 13 / 13 independent publication vehicle records have been source-mechanically staged in the existing `swse.vehicle.phase0b.draft-0.5` format. **Strict weapon/mount certification and Foundry runtime application are not complete.**

## Whole-book census

| Published source population | Count |
| --- | ---: |
| Historical PDF-reviewed spacecraft | 11 |
| Approved 318-baseline supplemental starfighter (Hornet) | 1 |
| New StarForge Station source identity | 1 |
| **Total** | **13** |
| Source attack groups retained | 24 (21 inherited + 2 Hornet configurations + 1 station battery row) |
| New certified physical mounts | 0 |
| Production pack or Actor changes | 0 |

Primary reference: *Scum and Villainy*, source SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`.

The 11 inherited spacecraft retain earlier source reviews in `data/canonical/vehicles/ships.json`. The previously approved Hornet is **not** counted as a new discovery: its source-backed facts come from `data/audits/vehicles/swse-phase2c-cp3-318-census-overlay.json` and were rechecked visually on printed p125 (physical PDF p126). The previously discovered StarForge Station is directly transcribed from printed p130 (physical PDF p131). The original Phase 1 ledger remains unchanged.

## Deliverables

- `data/audits/vehicles/swse-universal-phase2f-scum-and-villainy-staged.json`: 13 source-backed draft-v0.5 records.
- `data/audits/vehicles/swse-universal-phase2f-scum-and-villainy-fixtures.json`: primary evidence for Hornet and StarForge, with stable source keys/pages, old-amendment status and printed mechanical facts.
- `tests/vehicle-universal-phase2f-scum-and-villainy.test.mjs`: full-book census, recursive schema and source-data regression tests.
- This report documents the source-to-mechanical staging boundary.

## Key print-source decisions

The **Hornet-class Interceptor** has one source identity and two *alternative* configurations: the published default heavy laser attacks at +6 (+1 autofire), 10d10x2 damage, and a medium-laser alternative at +6 (+1 autofire), 5d10x2 damage. A natural 1 on the default heavy lasers triggers the published 6d10x2 self-damage ignoring shields and destroys the weapons. The alternate configuration removes that hazard. Neither alternative is duplicated as another starfighter or treated as an independently certified physical mount. The printed Hyperdrive field is **silent**, not explicitly "none".

**StarForge Station**, CL 20, has Reflex 16, Fortitude 74, DR 20, SR 200, 3,000 HP, threshold 574, 2×2 starship-scale space and fly 1 square (starship scale). It carries 1,850 crew, 10,000 passengers, 25,000,000 tons cargo, unlimited consumables, 600 starfighters, 60 transports and up to 12 frigate-sized craft. Its hyperdrive is x6. Printed five turbolaser batteries are represented as one published attack-group row at +12, damage 7d10x5, with an explicit -20 penalty against sub-Colossal targets (effective -8). **No exact physical battery mounting arrangement is inferred.** The station's trading and shipyard narrative effects remain pending typed runtime consumers.

The StarForge statblock prints **Init -4** and **Perception +6** in the header, versus **Initiative -5** and **Perception +5** in the Skills block. Both readings are preserved, not corrected. The historical Clutch Ugly also preserves its printed ion cannon attack-line discrepancy (+7 summary versus +5 detailed).

The Y164 Thalassian Slave Transport's printed singular "fly 1 starship-scale square" is correctly retained as starship-scale movement. Used-only listings remain used-only, and explicit lack of a hyperdrive remains distinct from an omitted hyperdrive field.

## Acceptance and next

All 13 staged records pass the unmodified nested draft-v0.5 schema. A source-group attack is not a certified mount, physical weapon count, firing arc, station binding, or executable Foundry attack. No runtime actors, ships, compendiums or V2 vehicle application code have been changed.

**Next book:** Galaxy at War (Phase 2-G), using a complete-book checkpoint.
