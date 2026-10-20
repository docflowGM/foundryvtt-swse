# Starships of the Galaxy — CP20 Tranche 05 Source-Fidelity Certification

**Audit-only publication-fidelity certificate. No automated stock attacks, physical mount certification, production pack mutation, or schema freeze.**

- Branch: `audit/sotg-strict-certification-cp17`; verified parent HEAD: `fa6a8e43d418c21c7ea615200c5a33a6343ad649`.
- Owner-approved policy: `SOTG-CP18-D01`.
- Positions: **76–90**, 15 new source-fidelity certificates; 38 original attack groups preserved.
- Cumulative: **75/100** source-fidelity certified; **25 remaining**.
- Strict mechanical backlog still **100**; original four stricter certificates unchanged.
- Primary PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`. Verified independently on the provided scanned book.
- Original CP16/17/18/19 datasets remain immutable. New records are an audit-only projection.

## Certified ship records

| CP17 position | Published identity | Printed page | Weapon attack groups | Distinctive evidence scope |
|---:|---|---:|---:|---|
| 76 | Fondor Shipyards Super Star Destroyer | 136 | 5 | BASELINE_SUPER_STAR_DESTROYER_AND_TACTICAL_AURA |
| 77 | Lusankya | 138 | 6 | LUSANKYA_UNIQUE_CONFIGURATION |
| 78 | IPV-1 System Patrol Craft | 140 | 2 | IPV1_HYPERDRIVELESS_AND_TACTICAL_CRITICAL_RANGE |
| 79 | Sienar Fleet Systems TIE/In Fighter | 142 | 1 | TIE_IN_EXPLICIT_PROSE_ABSENCE_VS_CP16_FIELD_SILENCE |
| 80 | Sienar Fleet Systems TIE Advanced x1 | 144 | 1 | TIE_ADVANCED_X1_DISTINCT_EQUIPMENT |
| 81 | Sienar Fleet Systems TIE Interceptor | 144 | 1 | TIE_INTERCEPTOR_FIRE_LINK_NO_INFERRED_HYPERDRIVE |
| 82 | Sienar Fleet Systems TIE Defender | 145 | 3 | TIE_DEFENDER_EXPLICIT_CANNON_NUMBERS |
| 83 | Hoersch-Kessel Drive Inc. Lucrehulk-class Battleship | 146 | 3 | LUCREHULK_BATTLESHIP_TACTICAL_SCOPE |
| 84 | Hoersch-Kessel Drive Inc. Lucrehulk-class Core Ship | 147 | 3 | LUCREHULK_CORE_DETACHABLE_FIRE_ARC_BLOCK |
| 85 | Hoersch-Kessel Drive Inc. Lucrehulk-class Droid Control Ship | 147 | 1 | LUCREHULK_DROID_CONTROL_SEPARATE_FAMILY |
| 86 | Venator-class Star Destroyer | 148 | 5 | VENATOR_FLIGHT_DECK_TOGGLE_AND_CARRIED_OR |
| 87 | V-19 Torrent Starfighter | 149 | 2 | V19_EARLY_BOOSTER_AND_LATER_HYPERDRIVE |
| 88 | Kuat Systems Engineering Alpha-3 Nimbus V-wing Starfighter | 150 | 1 | NIMBUS_VWING_RING_DEPENDENCE |
| 89 | X-83 TwinTail Starfighter | 151 | 2 | X83_PRINTED_COUNTERINTUITIVE_PERCEPTION |
| 90 | Incom T-65B X-wing Starfighter | 152 | 2 | BASE_T65B_NOT_RECON_OR_XJ3 |

## Special provenance boundaries

1. **TIE/In Fighter, printed p.142 (queue 79):** the printed statblock has no Hyperdrive line, while capability prose states that the TIE/In lacks a hyperdrive. CP16 marks the hyperdrive field `SOURCE_SILENT_CONFIRMED`; retain that original field state. CP19's `PROVENANCE_CLASSIFICATION_CANDIDATE_NOT_APPLIED` is documented as an outstanding evidence-classification proposal, **not** an approved CP20 source correction.
2. **TIE Interceptor, printed p.144 (queue 81):** CP19 also inspected adjacent p.143 for comparative context, while CP16 records p.144 as the sole source review page. Both page scopes are retained separately, with no historical page reconstruction.
3. **Lucrehulk Battleship, Core Ship and Droid Control Ship (positions 83–85):** distinct ship identities, configuration/attachment geometry and attack families. Do not infer concealed firing sectors, combine battery families or transfer a tactical aura across identities.
4. **Venator-class Star Destroyer (86):** alternative fighter contingents and conditional flight-deck state are not simultaneous installations.
5. **V-19 Torrent / V-wing / TIE Advanced (80, 87–88):** booster rings, integral hyperdrives, and published variant equipment remain distinct.
6. **X-83 TwinTail (89):** printed Perception bonus and astromech conditional parenthetical remain literal. **T-65B X-wing (90)** remains separate from Recon and XJ3.
7. **Fondor Super Star Destroyer and Lusankya (76–77):** different printed ship identities despite shared class ancestry; literal station-sized printed type does not independently resolve mount topology.

## Data, schema, verification

- `data/audits/vehicles/swse-sotg-cp20-tranche05-source-fidelity-certificates.json`
- `data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche05.schema.json`
- `tools/audits/vehicles/check_sotg_cp20_tranche05.py`
- `.github/workflows/sotg-strict-certification-cp17.yml`

Validator checks 15 stable CP17 identities, exact CP16 field/fact/attack rows, CP18 observation parity, CP19 provenance and extra context page, approved-correction exclusion, all prior 60 certificate identities, pinned Git blob SHAs, source typed silence, and escalation-denying schema tests.

**Historical limitation:** CP16's old CP15 comparison input is absent; this pass does not claim that old historical continuity test executed.
