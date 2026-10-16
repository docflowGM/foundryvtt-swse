# Clone Wars Campaign Guide — Phase 2B Checkpoint 5: Primary-Source Review Complete

**Scope: SOURCE CLOSE-READ COMPLETE 41/41; STRICT FIELD/PHYSICAL-MOUNT MECHANICAL CERTIFICATION 0/41.** No production ship compendia, actor data, runtime automation, V2 schema, or migration code was modified. Existing **41 publication-specific source identity keys remain unchanged**. A PDF close read does not mean physical weapon hardware, gunners, firing arcs or battery internals are fully certified.

## Baseline and method

- Original scanned PDF: `SAGA EDITION - Clone Wars Campaign Guide.pdf` SHA256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`. Each of the six remaining printed statblocks and nearby narrative/gray weapon tables were inspected directly on PDF page renderings, not certified from OCR. Earlier 35 source entries are byte-for-byte structurally preserved from Checkpoint 4.
- Previous `data/audits/vehicles/swse-phase1-vehicle-provenance.json` blob SHA `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; stored Phase 1 keys/pages remain the immutable baseline. The sourcebook has **41 identified ship publication records**, not 41 proven distinct classes/unique hull designs.
- **PDF indexing anomaly:** zero-based PDF page index **209** bears printed label **210**; index **210** bears printed label **209**. This causes four stored Phase 1 page discrepancies: `cw-punworcca-116-class-sloop` and `cw-sheathipede-class-shuttle` have stored printed p209 but visual p210, whereas `cw-providence-class-destroyer` and `cw-invisible-hand` have stored printed p210 but visual p209. The record keys and their stored page fields are NOT silently rewritten. A controlled Phase 1 provenance follow-up is required.
- All source-silent information is explicitly `SOURCE_SILENT_CONFIRMED`, not invented zero and not omitted as though unreviewed.

## Completion counts

| Metric | CP4 | This pass | CP5 total |
|---|---:|---:|---:|
| Source reviews | 35 | 6 | **41 / 41** |
| Remaining PDF close reads | 6 | -6 | **0** |
| Strict mechanical certificates | 0 | 0 | **0 / 41** |
| Attack-group weapon rows inventoried | 61 | 18 | **79** |
| Source-silent physical hardware fields in attack groups | 43 | 16 | **59** |
| Source-silent firing arc fields in attack groups | 61 | 18 | **79** |
| Source-silent battery composition fields in attack groups | 53 | 4 | **57** |
| Discovery-only local schema cases | 32 | 12 | **44** |
| Preserved printed attack-bonus discrepancies | 1 | 0 | **1** |

**No new strict certificates** are asserted. Every reviewed entry has incomplete physical-mount requirements or source-silent schema fields. The 44 schema cases are discovery/testing inputs only; previous SotG 155 cases are a separate corpus.

## Six completed source reviews

### Sheathipede-class Shuttle — printed p210 (PDF index 209)

`cw-sheathipede-class-shuttle` — **CL4 Colossal space transport**, Init -3, Perception +5, Ref 8 (flat-footed 6), Fort 27, +6 armor, **SR35**, DR15, HP140, threshold77. Speed 12 character-scale / 4 starship-scale, max 880 km/h. Str45 Dex14 Int19; BAB+0, grapple+37. One normal crewmember, six passengers, 1 ton cargo, one week consumables; Licensed, **not for sale**. No weapons, Ranged attack, or hyperdrive are printed. Narrative says it uses automated flight after passengers/crew give verbal destination coordinates. **Do not interpret noncombat automated flight as a combat gunner, offensive AI or weapon**. Its Phase 1 p209 citation is wrong for this scan, but stored identity/page remains unchanged pending a controlled update.

### Providence-class Destroyer — printed p209 (PDF index 210), narrative printed p208

`cw-providence-class-destroyer` — **CL18 Colossal cruiser capital ship**, Init -3, Per+6, Ref14 (FF13), Fort54, SR180, DR20, HP1800, threshold254. Fly12/4, max 1,050 km/h; Str98 Dex12 Int22, BAB+5, grapple+76. **22,350 skilled crew**, **48,247 passengers**, 29,000 tons cargo, one-year supplies; 8 landing craft/shuttles plus 24 starfighters, 2,800 proton torpedoes; **x1.5 / x10 backup** drive, nav computer. Military, not for sale.

Five weapon families: **quad turbolaser battery +18 (7d10x5; vs smaller-than-Colossal -2)**; **three dual laser cannon batteries +16 (6d10x2)**; **heavy ion cannons +8 (3d10x5 ion; smaller -12)**; **point-defense ion cannon battery +18 (3d10x2 ion)**; **eight proton-torpedo launcher batteries +18 (9d10x2)**. Battery counts are not physical cannon/barrel/launcher totals. Smaller-target -20 applies to capital attacks per the printed note; point defense remains distinct. No physical firing arcs established.

### Invisible Hand — printed p209 (PDF index 210)

`cw-invisible-hand` — independent, named **CL20** General Grievous flagship; Ref14, SR180, DR20, HP1800, threshold254; **350 expert crew**, **125,000 passengers**, 16 landing craft/shuttles and 24 starfighters. **x1 / x10 backup** hyperdrive; 2,800 torpedoes; military not for sale. Its five groups are +21 quad turbolaser, +19 three dual laser batteries, +11 heavy ion, +21 point-defense ion battery, +21 eight proton torpedo batteries, with the same printed damage dice as the general Providence. Conditional attacks vs smaller targets: quad **+1**, heavy ion **-9**. These changes are not upgrades to every Providence-class destroyer. Keep this named statblock distinct.

### Subjugator-class Heavy Cruiser — printed p211, sidebar p211, adjacent narrative p210

`cw-subjugator-class-heavy-cruiser` — **CL20 Colossal capital ship**; Init -2, Per+6, Ref15 (FF13), Fort53, **SR130**, DR20, HP1750, threshold253; fly **2 starship-scale squares**, no character-scale or maximum velocity printed. Str97 Dex14 Int20; BAB+2 grapple+65. **550 skilled crew**, **60,000 battle droid passengers**, 13,000 tons, two-year supplies, carries 144 Vulture starfighters and 48 Hyena bombers (plus support craft); **x2 / x12 backup** hyperdrive.

Five Ranged groups, explicitly linked by **AND**: 5 heavy turbolaser batteries +15 (7d10x5), 2 medium turbolaser batteries +15 (5d10x5), 5 point-defense light laser batteries +15 (3d10x2), 2 tractor-beam batteries +11 (grapple +65), and **2 ion pulse cannons +7 (9d10x10 ion)**. Capital attacks may take the printed -20 against smaller vessels; point defense distinguished.

- **Tactical Fire (p210):** standard action affects all squares within 2 starship-scale squares of ship; successful attacks against enemy ships there deal +2 damage dice. Treat as printed tactical rule, not a preauthorized automated VTT area effect.
- **Ion Pulse Cannon (p211):** starship-scale area attack targets each ship within 5 squares, separate attack roll. Hit: full ion damage and **2 steps down condition track**; miss: half damage and **1 step down condition track**.
- After firing, gunner must spend **three consecutive full-round actions recharging**. If the carrying ship receives damage meeting/exceeding its damage threshold during recharge, the ion pulse cannon **overloads and is destroyed**. This is weapon-specific mutable state, not a reusable generic missile rule.

### Sabaoth Destroyer — printed p220

`cw-sabaoth-destroyer` — **CL12 Colossal frigate capital ship**, Init -2, Per+6, Ref14 (FF12), Fort36, SR130, DR15, HP900, threshold136; fly2 starship squares. Str62 Dex14 Int16; BAB+2, grapple+48. 250 skilled crew, 3,000 passengers, 3,000 tons cargo, one-year supplies; carries **12 starfighters**; **x3 / x18 backup** hyperdrive. Military, 3,500,000 credits / 1,500,000 used. Weapons: **3 point-defense heavy laser cannon batteries +9, 6d10x2** (3 gunners); **2 light turbolaser batteries +9, 2d10x5** (3 gunners; **-11 against smaller-than-Colossal vessels**). Battery-to-barrel counts and numeric arcs are unprinted.

### Sabaoth Starfighter — printed p221; narrative starts p220

`cw-sabaoth-starfighter` — **CL7 Huge starfighter**, Init+12, Per+8, Ref17 (FF11), Fort23, DR5, HP75, threshold33; fly16/4, max 1,110 km/h. Str36 Dex22 Int16; BAB+5, grapple+28; one expert pilot, 50kg cargo, one-week supplies. **Four laser cannons +8** in Ranged, with one printed pilot weapon table **+8, 4d10x2**. Four physical cannons are explicit but neither fire-link topology nor arcs are described. **No printed SR or hyperdrive line**. Military, 170,000 / 72,000 used. It is a separate source record from the destroyer that carries twelve starfighters.

## Outstanding certification and controlled corrections

- **All 41** remain outside strict full-field/physical-weapon-mount certification. For each, the source can confirm attack-group, battery and some gunner information without defining individual physical launcher/barrel counts or numeric firing arcs. Existing field-state classification (`SOURCE_SILENT_CONFIRMED`) must remain explicit; source silence is not zero hardware.
- The sole prior **printed mechanical conflict** remains the Seltiss-2 Caravel main hull laser battery **Ranged +2** versus weapon table **+4**. Both source values are preserved; do not silently correct.
- **Four Phase 1 page citations** require documented controlled update: two stored p209 that visually start on printed p210 and two stored p210 that visually start on printed p209; the print labels appear in opposite PDF index order. The Phase1 entries were not modified in this book-level review package.
- The Phase 0B historical failures are **12 schema-invalid fixtures and 2,112 unclassified null/empty fields**. These are not repaired by this source audit. Universal schema remains a draft.
- Phase 3 production hydration, schema freezing, cross-book identity merges, and weapon/runtime changes remain unauthorized.

## Validation and preservation

- The CP5 book validator is `tools/audits/vehicles/check_clone_wars_phase2b_cp5.py`.
- Verified against the original scanned PDF SHA256, current cumulative JSON, and original CP4 ZIP: all prior **35 reviewed entry objects**, their mount backlog rows and all prior **32 discovery cases** were preserved.
- All 41 reviewed entries have no `NOT_REVIEWED` field states and no strict mechanical certification flags. All 79 attack-group records have explicit firearm/arc/battery states.
- The CP4 validator separately passed against its original CP3 ZIP and same original PDF. Full GitHub branch Phase1 JSON and SotG/Phase0B repository-wide regressions require repository integration; do not claim they have passed merely on isolated ZIPs.

**Book-level disposition: PRIMARY-SOURCE CLOSE-READ COMPLETE. NOT A FULL MECHANICAL CERTIFICATION.** Next workstream should reconcile the controlled Phase1 page mismatch and undertake independent strict mechanical certification/source-silence policy before any ship compendium hydration.
