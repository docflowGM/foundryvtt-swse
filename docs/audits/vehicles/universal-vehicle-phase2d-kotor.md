# Universal vehicle Phase 2-D — Knights of the Old Republic Campaign Guide

**Whole-book source staging complete:** 39 / 39 publication identities in the existing draft v0.5 universal vehicle record. This is **not** a strict mount or executable-rule certification.

## Reconciliation

| Source population | Entries |
|---|---:|
| Previously PDF-reviewed historical spacecraft | 32 |
| Directly reviewed additional source vehicles | 7 |
| **Total distinct publication claims** | **39** |
| Historical attack groups + Basilisk weapon groups | 69 + 4 = 73 |
| Strict weapon mount certifications added | 0 |
| Production pack/Actor mutations | 0 |

Primary publication: *Knights of the Old Republic Campaign Guide*, PDF SHA-256 `fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419`.

The historical spacecraft are converted from the earlier PDF-reviewed `data/canonical/vehicles/ships.json` source authority. The 7 new vehicle statblocks were directly checked on original printed pages 92–95 and 203 (physical PDF pages 93–96 and 204), with DJVU text used only as search navigation.

The source-aligned ledger `data/audits/vehicles/swse-universal-phase1d-knights-of-the-old-republic.json` is unchanged. Full materialized data is in `data/audits/vehicles/swse-universal-phase2d-kotor-staged.json`. Source fixtures for seven non-ship vehicles are in `data/audits/vehicles/swse-universal-phase2d-kotor-new-fixtures.json`. The regression suite is `tests/vehicle-universal-phase2d-kotor.test.mjs`.

## Source-specific protections

- The **Basilisk War Droid** remains one vehicle-droid source identity (not a duplicate creature/droid Actor), with flying 12 squares and 3 starship-scale squares, one passenger, separate claw attack, four printed ranged weapon groups, ammunition, and printed passenger-substitution rule. It is not transformed into an executable weapon/mount record.
- The **Urban Navigator** remains an air vehicle according to its printed type line despite the speeder-bike section. Its sidecar passenger is retained.
- **TT-6** repair rolls receive a printed +2 equipment bonus; this is preserved as a pending special mechanic rather than a fabricated automatic Foundry modifier.
- **Twin-228** retains 60 kg stock cargo and optional cargo-pod capacity of 460 kg, plus its separate 1,000-credit accessory price. This does not create another publication identity.
- **AeroChaser** aftermarket prong customization does not add stock weapons. All six ordinary civilian speeder/airspeeder statblocks have no printed ranged weapon groups.
- Historical source disagreements — including Starscape, Shaadlar, Derriphan, and Ministry attack/initiative inconsistencies — remain in the source ambiguities rather than being guessed away.
- Emplacement-point counts, unusual capital-ship attack restrictions, Ebon Hawk targeting treatment and other specialty published rules remain recorded as source facts with typed consumers pending.
- A statement of "2 starship-scale squares" without physical dimensions is not converted into an invented 2×2-footprint; square text is retained.

## Acceptance boundary

All 39 records satisfy the draft `swse.vehicle.phase0b.draft-0.5` structural schema. Printed weapon attack groups are non-executable evidence with empty mount-key references. Unspecified arcs, hardware counts, and conditional special rules are not assigned runtime values. Compendiums, Foundry v13 Actors, and the V2 runtime are unchanged.

**Next:** Phase 2-E, Force Unleashed Campaign Guide, in one whole-book checkpoint after reviewing its Phase 1 source census.
