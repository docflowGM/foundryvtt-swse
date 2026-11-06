# SotG CP21 — Owner-approved adjudications of 15 exceptional source records

**Status:** owner approved and committed as an audit-only, read-only effective-rule projection. The printed book and CP16–CP20 historical ledgers/certificates are never rewritten.

- Approval: user explicitly approved all 15 implementation recommendations, October 20, 2026.
- Pre-change certified CP20 source-fidelity HEAD: `9df36a630df24ff7315e218220158343de79816e`.
- Owner-approved policy retained: `SOTG-CP18-D01`.
- Source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- New physical mount certificates, live attack rights, production hydration, v0.6 schema freeze: **zero**.
- Effective overrides are *approved* but the runtime cannot automatically ingest them until the separate mechanical trust, Pure/Modified integration, and Foundry in-app gates pass.
- Official errata correction for Immobilizer p100 is from **Starships of the Galaxy Errata 1.0** (Jan 29, 2008). The cited text replaces 4×4 with 3×3 for this entry. Reference: https://www.theberserker.net/berserker/sw/rule_books/SW_Saga_Starships_of_the_Galaxy.pdf

## Decisions in CP17 queue order

| # | Printed record | Approved effective overrides in read-only projection | Mechanically scoped policy |
|---:|---|---|---|
| 1 | Advanced V-19 Torrent Starfighter (p. 59) | `/skills/initiative = 12` | `ADVANCED_TEMPLATE_GENERATOR` |
| 2 | Recusant-class Light Destroyer (p. 72) | Interpretation only | `DETAILED_WEAPON_ROW_AUTHORITY` |
| 3 | Kuat Drive Yards Pellaeon-class Star Destroyer (p. 99) | `/defenses/flatFootedReflex = 14` | `VEHICLE_DEFENSE_FORMULA` |
| 4 | Immobilizer 418 Interdictor-class Heavy Cruiser (p. 100) | `/specialDefensesOrRules/gravityWell/statblockAreaSquares = "3x3"`; `attackRow[1].areaPrintedWeaponRow = "3x3 starship squares"` | `OFFICIAL_ERRATA_GRAVITY_WELL` |
| 5 | Junker TYE-wing (p. 104) | `/skills/initiative = 2` | `JUNKER_TEMPLATE_INITIATIVE` |
| 6 | Koensayr Manufacturing BTL-58 K-wing (p. 105) | `/initiative = 6` | `K_WING_SHIELDBUSTER_ALIAS` |
| 7 | Sienar Technologies Marauder Corvette (p. 110) | Interpretation only | `MARAUDER_TRACTOR_OPERATOR_MODEL` |
| 8 | Mon Calamari Star Defender (p. 116) | Interpretation only | `VISCOUNT_SIZE_ROLE_SPLIT` |
| 9 | Eclipse (p. 139) | Interpretation only | `ECLIPSE_AXIAL_SUPERLASER_ATTACK` |
| 10 | Theta-class Shuttle (p. 141) | `/sensesPerception = 6` | `THETA_PERCEPTION_STOCK_CREW` |
| 11 | Sienar Fleet Systems TIE Bomber (p. 143) | `/initiative = 4` | `TIE_BOMBER_ARMAMENT_VARIANTS` |
| 12 | Incom T-65XJ3 X-wing Starfighter (p. 152) | `/payload = "12 heavy proton torpedoes"`; `attackRow[1].weaponLabel = "heavy proton torpedoes"` | `XJ3_HEAVY_PROTON_TORPEDO_LOADOUT` |
| 13 | Incom/Subpro ARC-170 Starfighter (p. 61) | Interpretation only | `ARC170_LEGACY_PROVENANCE` |
| 14 | Alliance A-wing Starfighter (p. 63) | Interpretation only | `A_WING_VARIANTS_AND_JAMMER` |
| 15 | Baudo-class Star Yacht (p. 65) | `attackRow[0].hardwareCount = 1` | `BAUDO_SINGLE_CANNON_OPERATOR_SCOPE` |

## Per-record resolutions and restrictions

### 1. Advanced V-19 Torrent Starfighter (p. 59)

**Approved:** Use header Initiative +12 for the stock advanced V-19; leave sample Dex 33 printed, but apply +8 Dex when generating from the base V-19.

- Source identity: `sotg-advanced-v-19-torrent-starfighter`; CP16 ledger index 3; CP19 disposition `DUAL_PRINTED_VALUES_UNRESOLVED`.
- Applied to effective view: /skills/initiative = 12.
- Typed policy: `ADVANCED_TEMPLATE_GENERATOR`; confidence `VERY_HIGH`.
- Original printed alternatives are preserved: p.59 `/initiative/header` (Init +12); p.59 `/skills/initiative` (Initiative +8).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 2. Recusant-class Light Destroyer (p. 72)

**Approved:** Use detailed point-defense battery attacks +14 and +12, not Ranged summary +16 and +14.

- Source identity: `sotg-recusant-class-light-destroyer`; CP16 ledger index 17; CP19 disposition `DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `DETAILED_WEAPON_ROW_AUTHORITY`; confidence `HIGH`.
- Original printed alternatives are preserved: p.72 `/ranged/pointDefenseLightLaserBattery` (5 point-defense light laser cannon batteries +16); p.72 `/weaponTable/pointDefenseLightLaserBattery` (Atk +14); p.72 `/ranged/pointDefenseDoubleLightLaserBattery` (2 point-defense double light laser cannon batteries +14); p.72 `/weaponTable/pointDefenseDoubleLightLaserBattery` (Atk +12).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 3. Kuat Drive Yards Pellaeon-class Star Destroyer (p. 99)

**Approved:** Use effective flat-footed Reflex 14; leave printed 47 in source evidence.

- Source identity: `sotg-kuat-drive-yards-pellaeon-class-star-destroyer`; CP16 ledger index 42; CP19 disposition `SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED`.
- Applied to effective view: /defenses/flatFootedReflex = 14.
- Typed policy: `VEHICLE_DEFENSE_FORMULA`; confidence `VERY_HIGH`.
- Original printed alternatives are preserved: p.99 `/defenses/reflex` (Ref 16); p.99 `/defenses/flatFooted` (flat-footed 47).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 4. Immobilizer 418 Interdictor-class Heavy Cruiser (p. 100)

**Approved:** Apply official SotG Errata 1.0: Immobilizer 418 gravity-well projector area 3x3, as a non-damage special effect against Reflex 10.

- Source identity: `sotg-immobilizer-418-interdictor-class-heavy-cruiser`; CP16 ledger index 43; CP19 disposition `WEAPON_ROW_VS_RULE_AREA_UNRESOLVED`.
- Applied to effective view: /specialDefensesOrRules/gravityWell/statblockAreaSquares = "3x3"; attackRow[1].areaPrintedWeaponRow = "3x3 starship squares".
- Typed policy: `OFFICIAL_ERRATA_GRAVITY_WELL`; confidence `DEFINITIVE_ERRATA`.
- Original printed alternatives are preserved: p.100 `/weaponTable/gravityWellProjector/area` (4x4 square starship-scale area attack); p.101 `/specialRule/gravityWellProjectors/area` (3x3-square starship-scale area).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 5. Junker TYE-wing (p. 104)

**Approved:** Use Junker TYE-wing stock Initiative +2; apply the template's -5 Initiative penalty after Dex adjustment, not twice.

- Source identity: `sotg-junker-tye-wing`; CP16 ledger index 47; CP19 disposition `DUAL_PRINTED_VALUES_UNRESOLVED`.
- Applied to effective view: /skills/initiative = 2.
- Typed policy: `JUNKER_TEMPLATE_INITIATIVE`; confidence `VERY_HIGH`.
- Original printed alternatives are preserved: p.104 `/initiative/header` (Init +2); p.104 `/skills/initiative` (Initiative +8).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 6. Koensayr Manufacturing BTL-58 K-wing (p. 105)

**Approved:** Use K-wing crew Initiative +6 and a ship-specific six-round plasma/shieldbuster torpedo ammo association, with mutually exclusive ordnance choice.

- Source identity: `sotg-koensayr-manufacturing-btl-58-k-wing`; CP16 ledger index 48; CP19 disposition `INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED`.
- Applied to effective view: /initiative = 6.
- Typed policy: `K_WING_SHIELDBUSTER_ALIAS`; confidence `MEDIUM_INIT_HIGH_AMMO`.
- Original printed alternatives are preserved: p.105 `/initiative/header` (Init +10); p.105 `/skills/initiative` (Initiative +6); p.105 `/ranged/alternateOrdnance` (shieldbuster torpedoes +7); p.105 `/weaponTable/alternateOrdnance` (Shieldbuster torpedoes (gunner)); p.105 `/payload/thirdOrdnance` (6 plasma torpedoes).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 7. Sienar Technologies Marauder Corvette (p. 110)

**Approved:** Marauder's tractor beam is one attack group operated by three gunners, not proven to be a battery or three emitters.

- Source identity: `sotg-sienar-technologies-marauder-corvette`; CP16 ledger index 52; CP19 disposition `TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `MARAUDER_TRACTOR_OPERATOR_MODEL`; confidence `MEDIUM_HIGH`.
- Original printed alternatives are preserved: p.110 `/ranged/tractor` (tractor beam battery +8); p.110 `/weaponTable/tractor` (Tractor beam (3 gunners)).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 8. Mon Calamari Star Defender (p. 116)

**Approved:** Keep Colossal (station) size and printed fly-2 speed, classify as mobile warship, and leave 6,000 medium payload rounds vs heavy launcher labels unresolved.

- Source identity: `sotg-mon-calamari-star-defender`; CP16 ledger index 58; CP19 disposition `CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `VISCOUNT_SIZE_ROLE_SPLIT`; confidence `HIGH_MOBILITY_LOW_MISSILE`.
- Original printed alternatives are preserved: p.116 `/printedType` (Colossal (station) space station); p.116 `/movement` (Speed fly 2 squares); p.116 `/prose/shipType` (Viscount-class Star Defender warship); p.116 `/payload/missiles` (6,000 medium concussion missiles); p.116 `/weaponTable/missileBattery` (Heavy concussion missile battery).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 9. Eclipse (p. 139)

**Approved:** Use Eclipse detailed superlaser +15, with -20 size penalty -> -5 vs smaller-than-Colossal-(cruiser) targets. Axial alignment required.

- Source identity: `sotg-eclipse`; CP16 ledger index 78; CP19 disposition `DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `ECLIPSE_AXIAL_SUPERLASER_ATTACK`; confidence `VERY_HIGH`.
- Original printed alternatives are preserved: p.139 `/ranged/superlaser` (superlaser +7**); p.139 `/weaponTable/superlaser` (Superlaser Atk +15).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 10. Theta-class Shuttle (p. 141)

**Approved:** Use stock Theta Skills Perception +6 for checks, not Senses +5; recompute if crew changes.

- Source identity: `sotg-theta-class-shuttle`; CP16 ledger index 80; CP19 disposition `DUAL_PERCEPTION_VALUES_UNRESOLVED`.
- Applied to effective view: /sensesPerception = 6.
- Typed policy: `THETA_PERCEPTION_STOCK_CREW`; confidence `MEDIUM_HIGH`.
- Original printed alternatives are preserved: p.141 `/senses/header` (Senses Perception +5); p.141 `/skills/perception` (Perception +6).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 11. Sienar Fleet Systems TIE Bomber (p. 143)

**Approved:** Use TIE Bomber Skills Initiative +4; retain two forward lasers and 16-missile stock bomb-pod with separate selectable alternatives.

- Source identity: `sotg-sienar-fleet-systems-tie-bomber`; CP16 ledger index 82; CP19 disposition `DUAL_INITIATIVE_VALUES_UNRESOLVED`.
- Applied to effective view: /initiative = 4.
- Typed policy: `TIE_BOMBER_ARMAMENT_VARIANTS`; confidence `MEDIUM_INIT_HIGH_LOADOUT`.
- Original printed alternatives are preserved: p.143 `/initiative/header` (Init +7); p.143 `/skills/initiative` (Initiative +4); p.142 `/narrative/laserHardware` (two forward-mounted laser cannons).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 12. Incom T-65XJ3 X-wing Starfighter (p. 152)

**Approved:** Interpret XJ3's 12 proton torpedoes as 3 tubes x 4 HEAVY proton torpedoes, damage 10d10x2, while retaining original generic labels.

- Source identity: `sotg-incom-t-65xj3-x-wing-starfighter`; CP16 ledger index 94; CP19 disposition `TORPEDO_QUALIFIER_UNRESOLVED`.
- Applied to effective view: /payload = "12 heavy proton torpedoes"; attackRow[1].weaponLabel = "heavy proton torpedoes".
- Typed policy: `XJ3_HEAVY_PROTON_TORPEDO_LOADOUT`; confidence `HIGH`.
- Original printed alternatives are preserved: p.152 `/narrative/ordnance` (three proton torpedo tubes; four heavy proton torpedoes apiece); p.153 `/payload/torpedoes` (12 proton torpedoes); p.153 `/weaponTable/torpedoes` (Proton torpedoes (pilot)).
- Historical missing row fields: 0; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 13. Incom/Subpro ARC-170 Starfighter (p. 61)

**Approved:** ARC-170: retain three attack families and distinct gunner/gunner/pilot roles; supplement missing row pages only as provenance.

- Source identity: `sotg-incom-subpro-arc-170-starfighter`; CP16 ledger index 5; CP19 disposition `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `ARC170_LEGACY_PROVENANCE`; confidence `HIGH`.
- Original printed alternatives are preserved: p.61 `/weaponTable/groups` (Laser cannons (gunner), medium laser cannons (gunner), proton torpedoes (pilot)); p.61 `/crew` (3 plus astromech droid); p.61 `/payload` (6 proton torpedoes).
- Historical missing row fields: 6; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 14. Alliance A-wing Starfighter (p. 63)

**Approved:** A-wing: early lasers+jammer versus later missile-equipped stock; jammer is electronic warfare, never a third damage gun.

- Source identity: `sotg-alliance-a-wing-starfighter`; CP16 ledger index 7; CP19 disposition `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE`.
- Applied to effective view: no numerical edit; interpretation/policy only.
- Typed policy: `A_WING_VARIANTS_AND_JAMMER`; confidence `HIGH`.
- Original printed alternatives are preserved: p.63 `/weaponTable/groups` (Laser cannons (pilot), medium concussion missiles (pilot), Jammer (pilot)); p.63 `/narrative/earlyConfiguration` (earliest A-wings armed only with lasers and jammers); p.63 `/narrative/laterConfiguration` (missile launchers later added and standard by New Republic).
- Historical missing row fields: 8; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.

### 15. Baudo-class Star Yacht (p. 65)

**Approved:** Baudo: accept one physically installed laser cannon from p65 prose, preserve printed plural attack label; crew 1 does not imply simultaneous pilot and gunner.

- Source identity: `sotg-baudo-class-star-yacht`; CP16 ledger index 9; CP19 disposition `NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS`.
- Applied to effective view: attackRow[0].hardwareCount = 1.
- Typed policy: `BAUDO_SINGLE_CANNON_OPERATOR_SCOPE`; confidence `HIGH_COUNT_UNRESOLVED_OPERATION`.
- Original printed alternatives are preserved: p.65 `/narrative/laserCount` (only a single laser cannon); p.65 `/weaponTable/laserFamily` (Light laser cannons (gunner)).
- Historical missing row fields: 3; original keys remain absent.
- Mechanical trust: BLOCKED; does not grant individual firing arcs, standalone attacks, station actions, or production pack hydration.


## Separation between published evidence and effective gameplay

The read-only projector `tools/audits/vehicles/sotg_cp21_effective_projection.py` accepts the immutable CP16 source record plus the approved manifest entry. It returns both the *unchanged published fields* and a separate **effective** copy with only the named approved updates. It does not alter any actor/pack data or write a Foundry resource.

The validator `tools/audits/vehicles/check_sotg_cp21_approved_adjudications.py` verifies all 15 in the prescribed queue order, exact CP16/CP17/CP19/CP20 source identity and Git blob lineage, original conflicting alternatives, allowed field/weapon overrides, and preservation of 17 legacy missing row fields. Attempts to promote physical mounts, pack hydration or automatic stock attack rights fail the schema and tests.

**Important boundaries:** Recusant detail-row attacks are already +14/+12 in the historical attack rows, so no duplicate numeric edit is performed. The Marauder, Viscount, Eclipse and ARC-170 decisions predominantly clarify rule semantics; they are not authorization to invent missing firing geometry. The Viscount medium/heavy missile conflict stays unresolved and remains blocked for ammunition-driven automated heavy attacks. The A-wing jammer remains a non-damage electronic-warfare effect. The Baudo's one physical cannon is a prose-backed effective observation, not physical mount certification.

## Downstream work after CP21

A separate work item must adapt approved effective-rule projections into the authoritative vehicle model, taking care not to create two competing stat calculators. It must cover character-dependent skill recalculation, template application, station/OR-mode selection, magazine consumption and invalidation after configuration edits, weapon-mount geometry and runtime permission gating. Require independent mechanical certificates and live Foundry verification before any stock attack is trusted.

Do not modify CP16–CP20 source ledgers; do not treat absence as zero; do not infer a 360-degree/forward firing arc solely from a plural weapon label; never import source narrative choices into a production actor without explicit owner-adjudicated view and mechanical gate.
