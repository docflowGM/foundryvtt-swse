# Starships of the Galaxy — CP20 Conflict-Priority Source-Fidelity Closeout

**CP17's 100/100 publication-source work-queue identities now possess individual audit-only source-fidelity certificates.** The four historical stronger strict certificates remain unchanged. This is **not** mechanical completeness: CP17's 100-ship strict mechanical backlog and zero new Foundry combat permissions remain.

- Policy: `SOTG-CP18-D01`, approved 2026-10-18.
- Original source PDF: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0` (SHA-256).
- Positions 1–15: 15 new source-fidelity certificates, 47 source attack rows, 13 retained publication contradictions/tensions, 17 missing historical row-key occurrences.
- All CP16 source fields and row snapshots are unmodified. No published conflict winner was chosen, no key absence was inferred as source silence.

## Publication conflict and missing-key inventory

| Queue | Printed ship | Page | Attack rows | Unresolved CP19 disposition | Missing historic row keys |
|---:|---|---:|---:|---|---:|
| 1 | Advanced V-19 Torrent Starfighter | 59 | 2 | `DUAL_PRINTED_VALUES_UNRESOLVED` | 0 |
| 2 | Recusant-class Light Destroyer | 72 | 5 | `DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED` | 0 |
| 3 | Kuat Drive Yards Pellaeon-class Star Destroyer | 99 | 5 | `SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED` | 0 |
| 4 | Immobilizer 418 Interdictor-class Heavy Cruiser | 100 | 2 | `WEAPON_ROW_VS_RULE_AREA_UNRESOLVED` | 0 |
| 5 | Junker TYE-wing | 104 | 1 | `DUAL_PRINTED_VALUES_UNRESOLVED` | 0 |
| 6 | Koensayr Manufacturing BTL-58 K-wing | 105 | 5 | `INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED` | 0 |
| 7 | Sienar Technologies Marauder Corvette | 110 | 2 | `TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED` | 0 |
| 8 | Mon Calamari Star Defender | 116 | 6 | `CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED` | 0 |
| 9 | Eclipse | 139 | 6 | `DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED` | 0 |
| 10 | Theta-class Shuttle | 141 | 2 | `DUAL_PERCEPTION_VALUES_UNRESOLVED` | 0 |
| 11 | Sienar Fleet Systems TIE Bomber | 143 | 2 | `DUAL_INITIATIVE_VALUES_UNRESOLVED` | 0 |
| 12 | Incom T-65XJ3 X-wing Starfighter | 152 | 2 | `TORPEDO_QUALIFIER_UNRESOLVED` | 0 |
| 13 | Incom/Subpro ARC-170 Starfighter | 61 | 3 | `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE` | 6 |
| 14 | Alliance A-wing Starfighter | 63 | 3 | `LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE` | 8 |
| 15 | Baudo-class Star Yacht | 65 | 1 | `NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS` | 3 |

## Complete printed-alternatives evidence

### 1. Advanced V-19 Torrent Starfighter

**DUAL_PRINTED_VALUES_UNRESOLVED.** The Advanced-template V-19 sample prints +12 in header and +8 in skill list. Retain both; do not reverse-engineer from Dexterity or base V-19.

- p. 59, `/initiative/header`: Init +12
- p. 59, `/skills/initiative`: Initiative +8

### 2. Recusant-class Light Destroyer

**DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED.** Two separate weapon-family rows disagree between Ranged summary and row attacks. No source-authorized winner; retain weapon families and both values.

- p. 72, `/ranged/pointDefenseLightLaserBattery`: 5 point-defense light laser cannon batteries +16
- p. 72, `/weaponTable/pointDefenseLightLaserBattery`: Atk +14
- p. 72, `/ranged/pointDefenseDoubleLightLaserBattery`: 2 point-defense double light laser cannon batteries +14
- p. 72, `/weaponTable/pointDefenseDoubleLightLaserBattery`: Atk +12

### 3. Kuat Drive Yards Pellaeon-class Star Destroyer

**SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED.** Printed flat-footed 47 exceeds printed Reflex 16. Preserve 47 as literal; neither replace it by a plausible 14 nor treat it as an executable repaired value.

- p. 99, `/defenses/reflex`: Ref 16
- p. 99, `/defenses/flatFooted`: flat-footed 47

### 4. Immobilizer 418 Interdictor-class Heavy Cruiser

**WEAPON_ROW_VS_RULE_AREA_UNRESOLVED.** Printed weapon row says 4x4, boxed gravity-well projector rule says 3x3; preserve both with independent page/provenance and block selection of a canonical area.

- p. 100, `/weaponTable/gravityWellProjector/area`: 4x4 square starship-scale area attack
- p. 101, `/specialRule/gravityWellProjectors/area`: 3x3-square starship-scale area

### 5. Junker TYE-wing

**DUAL_PRINTED_VALUES_UNRESOLVED.** Junker-template TYE-wing statblock prints +2 vs +8; sample and template are not separate ship identities.

- p. 104, `/initiative/header`: Init +2
- p. 104, `/skills/initiative`: Initiative +8

### 6. Koensayr Manufacturing BTL-58 K-wing

**INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED.** Initiative discrepancy is explicit. Payload 'plasma' may relate to weapon-table 'shieldbuster' but no equivalence is printed; OR attacks are alternatives, not all simultaneous. First-production unarmed mission configurations cannot be silently merged with the sample.

- p. 105, `/initiative/header`: Init +10
- p. 105, `/skills/initiative`: Initiative +6
- p. 105, `/ranged/alternateOrdnance`: shieldbuster torpedoes +7
- p. 105, `/weaponTable/alternateOrdnance`: Shieldbuster torpedoes (gunner)
- p. 105, `/payload/thirdOrdnance`: 6 plasma torpedoes

### 7. Sienar Technologies Marauder Corvette

**TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED.** Summary calls a battery, detailed row omits battery and gives three gunners. Three gunners do not establish three physical projectors; the row's role/geometry remains unresolved.

- p. 110, `/ranged/tractor`: tractor beam battery +8
- p. 110, `/weaponTable/tractor`: Tractor beam (3 gunners)

### 8. Mon Calamari Star Defender

**CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED.** The printed type says station although narrative and speed describe a mobile warship. Printed medium payload and heavy weapon batteries must not be silently unified; carried craft counts are not installed guns. P117 tactical aura does not repair these conflicts.

- p. 116, `/printedType`: Colossal (station) space station
- p. 116, `/movement`: Speed fly 2 squares
- p. 116, `/prose/shipType`: Viscount-class Star Defender warship
- p. 116, `/payload/missiles`: 6,000 medium concussion missiles
- p. 116, `/weaponTable/missileBattery`: Heavy concussion missile battery

### 9. Eclipse

**DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED.** Distinct printed attack values share the superlaser family; size-dependent penalties and axial alignment are separate rules, not a permitted inferred fix.

- p. 139, `/ranged/superlaser`: superlaser +7**
- p. 139, `/weaponTable/superlaser`: Superlaser Atk +15

### 10. Theta-class Shuttle

**DUAL_PERCEPTION_VALUES_UNRESOLVED.** Header +5 and skills +6 both printed; luxury upgrades are configurable equipment, not a correction to perception.

- p. 141, `/senses/header`: Senses Perception +5
- p. 141, `/skills/perception`: Perception +6

### 11. Sienar Fleet Systems TIE Bomber

**DUAL_INITIATIVE_VALUES_UNRESOLVED.** Initiative values disagree; p142 explicitly states two forward lasers. Sixteen medium concussion missiles are the standard bomb-pod payload, while torpedoes/bombs/mines are mission substitutions, not simultaneous armament.

- p. 143, `/initiative/header`: Init +7
- p. 143, `/skills/initiative`: Initiative +4
- p. 142, `/narrative/laserHardware`: two forward-mounted laser cannons

### 12. Incom T-65XJ3 X-wing Starfighter

**TORPEDO_QUALIFIER_UNRESOLVED.** Three tubes and total quantity twelve agree; heavy-versus-unqualified proton torpedo label does not. Preserve both; no inferential ammunition type correction.

- p. 152, `/narrative/ordnance`: three proton torpedo tubes; four heavy proton torpedoes apiece
- p. 153, `/payload/torpedoes`: 12 proton torpedoes
- p. 153, `/weaponTable/torpedoes`: Proton torpedoes (pilot)

### 13. Incom/Subpro ARC-170 Starfighter

**LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE.** Three published attack families with distinct crew operators, but physical barrel counts, launcher count and firing arcs are not established. The historical group rows lack sourcePage and batteryCount keys; retain key absence rather than source-silent or zero.

- p. 61, `/weaponTable/groups`: Laser cannons (gunner), medium laser cannons (gunner), proton torpedoes (pilot)
- p. 61, `/crew`: 3 plus astromech droid
- p. 61, `/payload`: 6 proton torpedoes

### 14. Alliance A-wing Starfighter

**LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE.** Jammer is a non-damaging system, not a third physical weapon barrel group. The historical rows have missing sourcePage and missing hardware/arc/battery keys. Treat early unarmed-missile and later equipped states separately.

- p. 63, `/weaponTable/groups`: Laser cannons (pilot), medium concussion missiles (pilot), Jammer (pilot)
- p. 63, `/narrative/earlyConfiguration`: earliest A-wings armed only with lasers and jammers
- p. 63, `/narrative/laterConfiguration`: missile launchers later added and standard by New Republic

### 15. Baudo-class Star Yacht

**NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS.** The prose explicitly describes a single laser cannon while the Ranged/table name is plural. Preserve the source's count claim and label independently; do not infer a battery, multiple barrels, or a mount arc. Original sourcePage/batteryCount/firingArc row fields are historically incomplete.

- p. 65, `/narrative/laserCount`: only a single laser cannon
- p. 65, `/weaponTable/laserFamily`: Light laser cannons (gunner)


## Key authority boundaries

For the ARC-170 (13), A-wing (14) and Baudo yacht (15), original CP16 source-row keys were absent. They remain absent in the immutable original rows and separately appear as `KEY_NOT_STORED` in the audit provenance. CP19's verified printed page is **supplemental** provenance, not a backfilled legacy sourcePage field or assumed installed mount count.

- `SOURCE_CONFLICT` retains opposing printed values without choosing one.
- `SOURCE_SILENT_CONFIRMED` is not 0/None, and `KEY_NOT_STORED` is not proof of source silence.
- Published attack battery totals, weapon-payload magazines and gunners do not establish physical mounts, geometry or independently runnable attacks.
- The 100 outstanding strict mechanical records are not closed by source-fidelity completion.
- CP16/CP17/CP18/CP19, previous CP20 batches, and four approved audit-only source corrections remain immutable.

## Evidence contract and verification

- `data/audits/vehicles/swse-sotg-cp20-tranche07-conflict-priority-source-fidelity-certificates.json`
- `data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche07-conflict-priority.schema.json`
- `tools/audits/vehicles/check_sotg_cp20_tranche07.py`
- `.github/workflows/sotg-strict-certification-cp17.yml`

The source-fidelity workstream is closed when CI at the exact committed HEAD confirms these invariants. CP15 historical continuity remains untested because its input is not present on the branch; this is not claimed as a pass.
