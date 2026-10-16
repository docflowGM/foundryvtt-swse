# Legacy Era Campaign Guide — Phase 2B Checkpoint 2 (20/39)

**Scope:** 10 new original-PDF primary-source close reads (publication identities 11–20), cumulative 20/39, 19 remaining, **0/39 strict field/physical-weapon-mount certificates**. Audit-only, no production compendium, pack, V2 runtime or schema freeze changes.

## Source authority and continuity

- Original PDF `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`; SHA-256 `344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d`. All printed statblocks/pages were rendered and visually reviewed, with DJVU TXT used for navigation only.
- New printed pages **91**, **142–147**, plus narrative p141; physical zero-based PDF index equals printed page number.
- Phase 1 branch starts at `e7236c21513e221a36b8b0a87f0932aa908159d0`, provenance Git blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`.
- All 39 published source identities/pages retained. First 10 CP1 reviewed records retained exactly; remaining 19 explicitly `NOT_REVIEWED`.

## Newly source-verified entries

| Printed page | Separate source identity | Weapon attack rows | Key findings |
|---|---|---:|---|
| 91 | YZ-2500 Heavy Transport | 2 | Colossal (frigate), double medium turbolaser battery +8, -20 against sub-Colossal targets -> -12; two gunners do not prove barrel count. |
| 142 | BB-2 Starfire Fighter/Bomber | 5 | Three ranged action alternatives; ion bomb atmosphere only; shields recharge +10 SR. Narrative three-person crew conflicts with printed Crew 2. |
| 143 | CF9 Crossfire Starfighter | 3 | Aft double light laser has limited arc, no numeric angle; distinct pilot torpedo and gunner aft laser groups. |
| 143 | I4 Ionizer Starfighter | 3 | Quad medium ion, disruptor torpedo non-ion-tagged damage, astromech conditional skill overrides; **Init +8 vs Skills Initiative +9**. |
| 144 | Jumpstar HPF Starfighter | 2 | Non-damaging marker missile, pursuit DC15 tagged/DC25 observed untagged, -2 per beyond-short increment, Int bonus and follow-up astrogation. |
| 145 | RC-2 Twilight Scoutship | 2 | Both detect skills -10; attacks against ship do not add attacking vessel Intelligence modifier. |
| 146 | Crix Diplomatic Courier Shuttle | 2 | 30 passengers, 1 blaster battery attack group, 4 gunners; distinct from assault model. |
| 146 | Crix Assault Shuttle | 2 | 50 passengers, **2** named blaster batteries, differing firepower, 10 SR shield recharge, specific carried craft. |
| 147 | MT Dropship | 2 | Narrative confirms **no hyperdrive**; 200 passengers; 24 concussion missiles are ammunition; distinct special carried vehicles. |
| 147 | *Scarlet Star* modified YT-2400 | 1 | Named ship with one gunner laser attack group; printed **Init -1 vs Skills Initiative +3**; missing hyperdrive is source-silent. |

## Cumulative audit inventory

- **20/39 source reviewed**, 19 pending; **36 attack-group rows**, 0 fully mount-certified ships.
- **34** cumulative Legacy Era discovery-only schema cases, including 18 in CP2; SotG 155 and Clone Wars 44 remain separate.
- **Four printed source conflicts in the 20 reviewed**: previous J-1 Ranged +4 versus weapon row +6; BB-2 crew narrative vs statblock; I4 Init vs Skills Initiative; Scarlet Star Init vs Skills Initiative.
- `SOURCE_SILENT_CONFIRMED` means looked at source and field was not stated; it **does not** prove an absent weapon, arc, hyperdrive or mount. Explicit MT narrative no hyperdrive uses `NARRATIVE_CONFIRMED_ABSENT`.
- Published station/gunner counts and ammo quantities are not physical mount or barrel counts. Attack-group alternatives and conditional/area effects cannot be flattened into generic repeated attacks.

## Deliverables and validation

1. Cumulative 39-record review ledger, preserving 20 reviewed + 19 pending.
2. Weapon-mount backlog (ship-by-ship; unresolved physical mounts and arcs).
3. Discovery-only schema cases (34).
4. `check_legacy_era_phase2b_cp2.py` regression gate (PDF SHA, CP1 carry-forward, identity, source conflicts, discovery-only).
5. This report.

**Next tranche CP3:** Legacy Era publication records 21–30, printed pp148–188, ten ships. No GitHub push until source review finishes book.
