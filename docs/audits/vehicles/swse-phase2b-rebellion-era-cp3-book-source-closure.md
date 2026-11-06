# Rebellion Era Campaign Guide — Phase 2B Checkpoint 3: Book Source Review Complete

**Status: 35/35 PDF source close reads complete; strict full-field and physical-mount mechanical certification 0/35.**

## Provenance, scope and safety
- Source: `Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf` (scanned visual pages checked, PDF index equals printed page); SHA256 `60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8`.
- Immutable baseline: Phase 1 provenance GitHub blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4` on branch `audit/vehicle-phase-0-1-canonical-foundation`.
- CP1 ten and CP2 ten reviewed entries and CP2 36 schema-discovery cases preserved byte-for-byte at the semantic JSON object level.
- No production data, compendia, runtimes, hydration, phase0b fixes, or certification overrides.
- One publication-specific record per Phase 1 key; not an exhaustive census of every narrative-only ship.

## Final results
| Audit | Value |
|---|---:|
| Publication identities | 35 / 35 retained |
| Source-verified close reads | 35 / 35 |
| Remaining source-review entries | 0 |
| Attack-group rows | 72 |
| Strict mechanical certificates | 0 / 35 |
| Separate schema-discovery cases | 71 |
| Preserved source-conflict rows | 4 |

## Final tranche: ships 21–35 (printed source pages)
| Printed source | Ship | Key note |
|---|---|---|
| 136 | TIE Experimental M3 | Remote-controlled CL9, 2 missile launchers, 8 missile ammunition. |
| 136 | TIE Oppressor | CL11, SR30, pilot laser/missile attack alternatives. |
| 137 | TIE Phantom | Cloak grants total concealment while engaged; two distinct weapon stations; x6 hyperdrive. |
| 138 | TIE Scout | Cloaked-target detector +5 and separate Lone Scout-A capacity configuration. |
| 138 | TIE Shuttle | Bomber-derived space transport; passengers 2, no printed hyperdrive. |
| 139 | VT-49 Decimator | Alternate paired attack modes; Ranged/weapon row attack bonuses disagree twice. |
| 139 | YE-4 Gunship | Three blaster guns in ranged line; 2 gunners in detailed row; crew 8. |
| 146 | AEG-77 Vigo Gunship | Six actual turrets: four upper, two lower; unarmed transporter stat alternative. |
| 146 | Kihraxz Light Fighter | Independent CL9 source identity; light missile 4-square splash. |
| 147 | Supa Fighter | Laser/ion/missile alternatives, fire-link missiles and ion damage. |
| 147 | Vaksai | Independent enhanced Kihraxz variant CL11; medium missile splash. |
| 148 | Rihkxyrk Assault Fighter | Laser +5 and printed missile +5 vs missile detail +7: conflict preserved. |
| 154 | Keldabe-class Battleship | Five-round area shield drain and recharge, damage buffs, mass-driver SR bypass and tractor grapple +65. |
| 156–157 | IRD-A Starfighter | CL10 atmosphere capable, explicitly no hyperdrive; Grp +33 and two weapon rows continue onto p157. |
| 156 | IRD Starfighter | CL9 nonatmospheric predecessor, no hyperdrive; do not merge with IRD-A. |

## Published ambiguities, conflicts and preservation policy
- Original CP1 **Krayt** passenger narrative/statblock discrepancy retained unchanged.
- **VT-49 Decimator**, printed p139: Ranged says lasers +6 and missiles +8, while detailed pilot lasers are +8, gunner lasers +6, and missile launchers +6. Two separate line-vs-row conflicts preserved.
- **Rihkxyrk**, p148: Ranged missile +5 vs detailed missile attack +7. Preserve both as explicit published conflict.
- **IRD-A**, pp156–157: printable statblock continues onto p157, which explicitly reads Grp +33; the searchable text truncates this to +3. Original scanned PDF controls, so no anomaly or conflict is recorded. Both weapon detail rows also appear on p157.
- Where ships lack a hyperdrive line (e.g. TIE Shuttle) the source is silent. Exception: IRD series narrative explicitly says **both lack hyperdrives**.
- Battlestation/manpower counts, battery attacks, firing arcs, launcher count and weapon mount topology must not be invented. Keldabe attack group labels do not certify total turret objects.
- This is **source-review complete**, not full mechanical certification or authorization for Foundry V2 production changes.

## Unresolved mechanical certification requirements
1. Verify every required field and every physical weapon location, independent mount, crew access, firing arc and full battery architecture against canon sources or explicit source silence exceptions.
2. Resolve four source conflict rows with a documented policy or external errata; preserve original publications in all cases.
3. Implement/test special combat behaviors only in a separate, explicitly authorized runtime and schema-certification phase.
4. Re-run full repository Phase 0B/Phase 2 audits; historical 12 invalid fixtures and 2,112 blank/unclassified positions were not implicitly resolved by this pass.

## Validation
Run `python tools/audits/vehicles/check_rebellion_era_phase2b_cp3.py --repo-root . --source-pdf <path> --cp2-root <cp2 checkout> --phase1 <phase1 JSON>`.
The checkpoint itself validates historical identity snapshot, complete close-read coverage, CP2 object continuity, source PDF fingerprint, weapons counts, source conflicts, and no mechanical-certification or hydration flags. It is not a substitute for manual proof of all source transcriptions or repository-wide tests.
