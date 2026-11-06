# CP20 Tranche 06 — Source Fidelity, Queue 91–100

Owner-approved policy: `SOTG-CP18-D01`. Publication source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.

**Ten records certified, 18 weapon attack rows preserved. Cumulative 85/100, 15 source-fidelity records remain.** Original four strict mechanical certificates and strict mechanical backlog of 100 remain unchanged.

| Queue | Source ship | Source page | Attack rows | CP19 scope |
|---:|---|---:|---:|---|
| 91 | Incom T-65BR X-wing Starfighter | 153 | 1 | T65BR_SENSOR_BONUS_AND_NO_TORPEDO_ROW |
| 92 | Corellian YT-1300 Transport | 154 | 1 | STOCK_YT1300_TEN_UNUSED_EMPLACEMENTS |
| 93 | Corellian YT-2000 | 155 | 1 | YT2000_PRINTED_NEGATIVE_PILOT_AND_TWO_DOUBLE_GUNS |
| 94 | Corellian YT-2400 | 156 | 1 | YT2400_PRINTED_NEGATIVE_PILOT_AND_ESCAPE_POD |
| 95 | Millennium Falcon | 156 | 3 | FALCON_NAMED_MODIFIED_AND_CHARACTER_SCALE_GUN |
| 96 | Koensayr BTL-S3 Y-wing | 158 | 3 | Y_WING_BTL_S3_TWO_ION_GUNNER_AND_PAYLOAD |
| 97 | Koensayr BTL-A4 LP "Longprobe" | 159 | 3 | Y_WING_LONGPROBE_PILOT_WEAPONS_SENSOR_BONUS |
| 98 | Koensayr BTL-S3 "Courier" | 159 | 2 | Y_WING_COURIER_ION_REMOVAL_AND_GUNNER |
| 99 | Incom/Subpro Z-95 Headhunter | 160 | 2 | Z95_STOCK_HYPERDRIVELESS |
| 100 | Rendili Star Drive Light Corvette | 102 | 1 | RENDILI_SIX_FLANK_TURRETS_ONE_BATTERY |

## Certification boundaries

- These certificates report source fidelity only, not physical turret identity, firing arcs, automation, import or installation permissions.
- Stock YT-1300 is separate from Millennium Falcon. YT-2000/2400 preserve negative printed Pilot entries; alternative armament and upgrade states remain scoped.
- The three Y-wing configurations are separate; payload count never substitutes for launcher count, and gunner roles remain source-specific.
- The T-65BR, Z-95, and Rendili Light Corvette retain their separate identities, and six physical flank turrets do not create six attack batteries.

## Evidence and reproducibility

- `data/audits/vehicles/swse-sotg-cp20-tranche06-source-fidelity-certificates.json`
- `data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche06.schema.json`
- `tools/audits/vehicles/check_sotg_cp20_tranche06.py`

The validator verifies pinned authority Git objects, existing 75 non-overlapping certificates, exact original 18 attack rows, field and source-silence observations, and runtime-authority denial. CP15-to-CP16 historical continuity remains separately blocked on the older missing source input.
