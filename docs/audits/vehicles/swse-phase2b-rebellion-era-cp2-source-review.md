# Rebellion Era Campaign Guide — Phase 2B, Checkpoint 2 (Ships 11–20)

**Source-review scope:** ten new publication-specific ship entries, printed pp. 114–115, 130–136 (plus surrounding narrative). **20/35 cumulative PDF close reads; 15 awaiting review.** Original scanned PDF SHA-256: `60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8`.

**Certification boundary:** These are primary-source close reads, **not** strict full-field/physical weapon-mount certifications. Exact arcs, mount transforms, and weapon battery physical composition are often not printed. No ship production records, compendia, runtime, scripts for hydration, or canonical Phase 1 identity registry were modified.

## Cumulative counts

| Measure | CP1 | CP2 cumulative |
|---|---:|---:|
| Publication-specific source identities | 35 | 35 |
| Primary PDF ship close reads | 10 | **20** |
| Ship reviews outstanding | 25 | **15** |
| Attack-group rows | 20 | **43** |
| Source conflicts retained | 1 | **1** |
| Discovery-only schema cases | 17 | **36** |
| Strict certified ship records | 0 | **0** |

All 10 prior CP1 record objects remain unchanged, and the original Phase 1 entry identities, names, and printed/PDF page references remain unchanged.

## Ten newly source-reviewed ships

| Printed page | Publication-specific ship | Attack rows | Printed hardware/rules requiring care |
|---:|---|---:|---|
| 114 | Hoersch-Kessel T-Wing Interceptor | 2 | Proton torpedoes have 4-square splash; only two-jump limited navicomputer; Vehicular Combat printed. |
| 115 | Incom X4 Gunship | 2 | Six laser turrets plus pair of forward cannons explicitly described; two attack groups and distinct gunner/pilot stations. |
| 130–131 | Assassin-class Corvette | 2 | Ranged two dual turbolasers vs three gunners in attack row; crew/passenger/cargo maximum vs typical values; -20 target-size penalty. |
| 131 | Assault Gunboat | 3 | Medium laser/ion/missile stock alternatives; other armaments in narrative are optional modifications. |
| 132 | Imperial Cargo Ship | 2 | 2 quad turbolaser battery groups and 4 point-defense light laser groups; advanced navicomputer; point defense has autofire. |
| 132–133 | Imperial II-class Frigate | 4 | Four different battery classes with four groups each; tractor grapple +69; extensive carried-craft listing; **not** Imperial II Star Destroyer. |
| 134 | Missile Boat | 3 | Printed one laser plus two advanced and two standard missile launchers; two twenty-missile magazines; SLAM lacks a numeric speed/duration specification here. |
| 134 | Royal Guard Starfighter | 1 | Stock ace-piloted SR15 laser fighter; missile launcher and boosted shields only on described modifications. |
| 135 | TIE Aggressor | 3 | Two skilled crew; distinct +7 pilot laser and +5 gunner turret; missile alternative; no printed SR/hyperdrive. |
| 136 | TIE Experimental M2 | 1 | **Remote controlled** from Beta-class ETR-3; 2 turbolaser cannons; no printed shields/hyperdrive; M3 remains unreviewed. |

## Mechanical distinctions and source silence

- **Attack rows vs hardware:** Six X4 turrets and two forward guns have direct narrative support; aggregate attack rows alone still do not establish arcs or attack scheduling. The published large-ship battery group counts likewise must not be multiplied into physical turret counts without support.
- **Assassin-class capacity:** Book footnote uses maximum figures (crew 150, passengers 60, cargo 2,100 tons), while a typical given-weapons configuration uses crew 84, passengers 51, cargo 1,500 tons. Preserve both, without silently choosing a stock canonical number.
- **Size penalties:** Capital anti-ship weapons have printed -20 against smaller-than-Colossal targets where stated. Point-defense weapon rows remain distinct and do not inherit that penalty automatically.
- **Imperial II-class Frigate:** Preserve its CL 17 printed source identity. Its 4 tractor batteries have grapple +69 instead of damage. Only 3 starship-scale fly squares are printed; neither ground-scale fly speed nor max velocity is established in this statblock.
- **Missile Boat SLAM:** The narrative specifies a speed burst that sacrifices laser functionality. Without a printed numeric duration or bonus, numeric automation would be invention.
- **Royal Guard, TIE Aggressor, and M2:** Missing hyperdrive and/or SR lines are `SOURCE_SILENT_CONFIRMED`, not an automatically proven absence. M2's `Crew remote controlled` is explicit and should not be converted to a physical onboard pilot.
- **Source conflict continuity:** The prior CP1 Krayt passenger narrative/statblock discrepancy remains recorded. No new direct contradictory printed statements were treated as confirmed conflicts in this tranche; ambiguous staffing vs mount counts are backlogged as unresolved mapping instead.

## Method and validation

- Each statblock and applicable adjacent narrative was visually checked in the original scanned PDF. DJVU TXT was used only as a navigation aid, not as canonical authority.
- The exact 35 record identities and original page metadata remain fixed. The **first 10 reviewed CP1 records** are checked for exact deep equality against the CP1 ledger.
- The CP2 standalone validator checks 35 unique identities; exactly 20 reviewed and 15 not reviewed; 43 weapon rows; 1 retained conflict; 36 discovery-only cases; strict certifications zero; source hash; and high-risk rules/ship distinctions.
- Optional `--phase1` accepts the repository Phase 1 provenance JSON for independent original mapping validation. Optional `--cp1-root` accepts CP1 files to prove no previous reviewed source object drift.
- Prior book packages and their schema-discovery counts remain separate. No prior SotG, Clone Wars, or Legacy Era production artifacts are replaced.

## Next tranche (21–30)

TIE Experimental M3, TIE Oppressor, TIE Phantom, TIE Scout, TIE Shuttle, VT-49 Decimator, YE-4 Gunship, AEG-77 Vigo, Kihraxz Light Fighter, Supa Fighter. The last five publication-specific records remain a separate subsequent tranche.

**GitHub status:** No push at CP2; book-level push follows final Rebellion Era review and final integrated validation.
