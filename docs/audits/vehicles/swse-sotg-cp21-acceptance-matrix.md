# CP21 Acceptance Matrix — 15 owner-approved SotG adjudications

The approval is for **effective gameplay interpretation and an audit-only projection**, not a ship-wide physical mount certificate. CP16–CP20 source-fidelity certificates are still the immutable historical record.

| Approval | Decision | Source proof | Effective consumer treatment | Remaining gate |
|---|---|---|---|---|
| SOTG-CP21-D01 | Advanced V-19 Torrent Starfighter | SotG printed p. 59 + CP19 `DUAL_PRINTED_VALUES_UNRESOLVED` | `ADVANCED_TEMPLATE_GENERATOR` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D02 | Recusant-class Light Destroyer | SotG printed p. 72 + CP19 `DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED` | `DETAILED_WEAPON_ROW_AUTHORITY` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D03 | Kuat Drive Yards Pellaeon-class Star Destroyer | SotG printed p. 99 + CP19 `SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED` | `VEHICLE_DEFENSE_FORMULA` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D04 | Immobilizer 418 Interdictor-class Heavy Cruiser | SotG printed p. 100 + CP19 `WEAPON_ROW_VS_RULE_AREA_UNRESOLVED` | `OFFICIAL_ERRATA_GRAVITY_WELL` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D05 | Junker TYE-wing | SotG printed p. 104 + CP19 `DUAL_PRINTED_VALUES_UNRESOLVED` | `JUNKER_TEMPLATE_INITIATIVE` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D06 | Koensayr Manufacturing BTL-58 K-wing | SotG printed p. 105 + CP19 `INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED` | `K_WING_SHIELDBUSTER_ALIAS` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D07 | Sienar Technologies Marauder Corvette | SotG printed p. 110 + CP19 `TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED` | `MARAUDER_TRACTOR_OPERATOR_MODEL` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D08 | Mon Calamari Star Defender | SotG printed p. 116 + CP19 `CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED` | `VISCOUNT_SIZE_ROLE_SPLIT` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D09 | Eclipse | SotG printed p. 139 + CP19 `DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED` | `ECLIPSE_AXIAL_SUPERLASER_ATTACK` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D10 | Theta-class Shuttle | SotG printed p. 141 + CP19 `DUAL_PERCEPTION_VALUES_UNRESOLVED` | `THETA_PERCEPTION_STOCK_CREW` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D11 | Sienar Fleet Systems TIE Bomber | SotG printed p. 143 + CP19 `DUAL_INITIATIVE_VALUES_UNRESOLVED` | `TIE_BOMBER_ARMAMENT_VARIANTS` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D12 | Incom T-65XJ3 X-wing Starfighter | SotG printed p. 152 + CP19 `TORPEDO_QUALIFIER_UNRESOLVED` | `XJ3_HEAVY_PROTON_TORPEDO_LOADOUT` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D13 | Incom/Subpro ARC-170 Starfighter | SotG printed p. 61 + CP19 `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE` | `ARC170_LEGACY_PROVENANCE` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D14 | Alliance A-wing Starfighter | SotG printed p. 63 + CP19 `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE` | `A_WING_VARIANTS_AND_JAMMER` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |
| SOTG-CP21-D15 | Baudo-class Star Yacht | SotG printed p. 65 + CP19 `NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS` | `BAUDO_SINGLE_CANNON_OPERATOR_SCOPE` | Physical mounts, geometry, operator and Foundry runtime must be independently authorized |

## Repository files

- `data/audits/vehicles/swse-sotg-cp21-owner-approved-adjudications.json`: exact owner-approved decision set.
- `data/audits/vehicles/swse-sotg-cp21-owner-approved-adjudications.schema.json`: audit-only, deny-by-default approval and trust schema.
- `tools/audits/vehicles/sotg_cp21_effective_projection.py`: read-only clone-and-apply rules interpreter.
- `tools/audits/vehicles/check_sotg_cp21_approved_adjudications.py`: fixed-case allowlist and immutable primary-evidence assertions.
- `.github/workflows/sotg-strict-certification-cp17.yml`: exact-pushed-commit regression gate.

**Approval does not resolve canonical printed contradictions in the source book.** The adjudication decides effective use while the original alternatives remain inspectable. A ship cannot enter automated stock combat through this manifest alone.
