# Starships of the Galaxy — CP19 Tranche 03 (ships 31–45)

**Status:** 15 of 15 publication-specific ships reviewed against rendered original PDF; 40 attack-group rows preserved; two proposed corrections to CP16 audit values identified. No new certifications, no production modifications.

- **Source PDF SHA-256:** `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`. Printed page matches zero-indexed PDF page.
- **Base branch HEAD:** `3fe8f302f8fe1cb2cec2f11c34e8797806c5be11`. Branch `audit/sotg-strict-certification-cp17`. Owner-approved policy: `SOTG-CP18-D01`.
- **Pages visually inspected:** 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 90, 91, 92, 93.

## Per-ship findings

| Queue | Source ship (printed page) | Result |
|---:|---|---|
| 31 | Outbound Flight (p.77) | Six detachable Dreadnaughts encircle a central core, but the printed Outbound Flight profile is one unique Colossal (station) capital ship. Fifteen turbolaser, three laser, and five quad-laser batteries are attack-group counts, not barrel or arc certificates. |
| 32 | Baktoid Armor Workshop Vulture-class Starfighter (p.78) | Vulture has a published walker movement mode in addition to starship flight, no organic crew, and two separate AND attack groups. Droid control/virtual gunners cannot be converted to physical stations or extra gun barrels. |
| 33 | Haor Chall Engineering Scarab-class Starfighter (p.79) | Scarab statblock lists only blaster cannons. No missile payload is published, and nearby Vulture/Tri-Fighter ammunition and droid stats must not be inherited. |
| 34 | Phlac-Arphocc Automata Industries Droid Tri-Fighter (p.79) | The central singular laser cannon and three light laser cannons have explicit distinct hardware counts; missile payload of six is ammunition, not launcher count. Keep crew 0 virtual operating authority separate. |
| 35 | Dynamic-class Freighter (p.80) | The stock Dynamic freighter has one printed double-laser attack family and lacks shields. Deck plan turret access is internal ship layout, not evidence of gun count, turret azimuth or firing arc. |
| 36 | Kuat Systems Engineering Eta-2 Actis Interceptor (p.82) | Stock Eta-2 attacks are laser cannons OR ion cannons; missiles are rare substitution for ions, not extra default stock weapons. Booster-ring x1 and astromech skill/cover adjustments remain conditional. |
| 37 | FreiTek Inc. E-wing Starfighter, Type B (p.83) | Type B prints triple heavy blaster cannons and sixteen torpedoes with fire-link. The printed 'triple' designation and torpedo count do not by themselves prove discrete independent mount counts or arcs. R7 astromech bonus is conditional. |
| 38 | Kuat Systems Engineering Firespray-31 Patrol Craft (p.84) | Narrative independently confirms stock Firespray pair of blaster cannons; tractor-beam count remains unspecified. Three unused emplacement points are modification capacity, not installed guns; Slave I is a distinct named modification. |
| 39 | Slave I (p.85) | PDF weapon table explicitly prints concussion mine damage 8d10x2, but CP16 attack-group row recorded 10d10x2. Preserve the original ledger and stage a correction to 8d10x2. Tracking-beacon torpedoes deal Special effect, not conventional explosive damage. |
| 40 | Territorial Defense Starfighter (p.86) | The Geonosian Nantex's micro-tractor emitters provide +1 on close-range laser attack rolls, not a separate tractor-beam attack or an additional physical mount. Species-tailored avionics and extreme-speed narrative are not stock movement replacements. |
| 41 | Huppla Pasa Tisc Shipwrights Collective Ginivex-class Starfighter (p.87) | Solar sail deploys +15 SR above normal 30, yielding SR45, loses the bonus upon retraction; the sail is not another weapon. One double-laser family with unsupported barrel count and arcs. |
| 42 | Gozanti Cruiser (p.90) | Stock Gozanti has two laser-cannon batteries and two quad-laser-cannon batteries, plus proton torpedoes. Neither battery count nor crew implies barrels. Krayt's Honor is an individually modified vessel, not a baseline replacement. |
| 43 | Krayt's Honor (p.91) | Krayt's Honor has a second proton-torpedo launcher and three added turbolasers explicitly in the printed prose. Captain's trained-pilot +2 is already included, so no double bonus. Modified batteries must not become generic Gozanti stock. |
| 44 | Corellian Gunship (p.92) | Eight double turbolasers individually operated; cannot fire as a battery. Separate point-defense battery and heavy concussion missiles. Four missile attack declarations are not a launcher count, and payload 120 remains ammunition. |
| 45 | Hapan Battle Dragon (p.93) | Ranged line explicitly lists FOUR mass-pulse tubes without attack roll, but CP16 lists physical hardwareCount as source-silent. Propose p93-sourced count 4 only for those tubes. Sixteen mines are payload, with 4-square interdiction radius for 10 minutes; rotating tracks do not provide firing arcs. |

## Source-backed CP16 reconciliation candidates (not yet applied)

1. **Slave I, printed p.85:** Weapon subtable prints **Concussion mines: Atk +18, Dmg 8d10×2**, whereas CP16's source group 1 currently records `damage: "10d10x2"`. Correct physical-page evidence is `8d10x2`; this is a transcription discrepancy, **not** permission to alter weapon class, attack, or firing arc. Retain original CP16 untouched until controlled audit correction.
2. **Hapan Battle Dragon, printed p.93:** Ranged summary explicitly prints **4 mass pulse tubes (no attack roll)**; CP16 source group 5 has `hardwareCount: "SOURCE_SILENT_CONFIRMED"`. Count **4 mass-pulse tubes** is directly printed, while 16 mass-pulse mines are ammunition and the rotating tracks do not define firing arcs. Record proposed count four only for the physical tube group.

Both proposals are machine-recorded with source-row index, current CP16 value, proposed printed value, exact source page and explicit non-applied disposition. Neither constitutes new strict certification. The approved two-layer policy still requires individual source-fidelity validation and independent runtime/mount authorization.

## Preserved boundaries

- Droid fighter **Crew 0** virtual gunners do not become installed gunner stations or additional hardware; Tri-Fighter's one central and three light lasers are already printed source-supported counts.
- *Outbound Flight* is one composite station-like capital ship, with detachable Dreadnaughts; printed batteries do not independently certify its six vessels' detached weapon geometry.
- Firespray stock has a **pair** of blaster cannons and **three unused emplacement points**, not three extra mounted weapons. Slave I is a distinct, heavily modified named ship.
- Ginivex deployed sail SR 45 remains conditional on its SR-30 baseline; Nantex close-range tractor emitter is an equipment attack bonus, not a separate tractor beam weapon.
- Eight Corellian Gunship double turbolasers are **independent guns**, not a battery. Gozanti's batteries and Krayt's Honor's modified launchers/hardware remain distinct.
- The complete 40 source attack-group rows are preserved as snapshots. Source-silent firing arcs or launcher counts remain source-silent, and their source pages remain traceable.

## Continuity and validation

Tranches 01/02/03: **45 of 100** backlog records reviewed; **55 remain**. Previously strict source-field/physical mount certificates remain **4/104**. Source-fidelity certificates newly granted: **0**. Runtime stock attack authorizations newly granted: **0**.

CP16 ledger, CP17 queue, CP18 evidence and prior tranche records are not modified. Production compendia, vehicle combat integration, v0.6 schema freeze and Pure/Modified vehicle and droid refactor remain out of scope.

Validator: `node tools/audits/vehicles/check_sotg_phase2b_cp19_tranche03.mjs`, enforcing Git blob continuity, all fifteen queue keys and PDF evidence page locators, exact original group snapshots, both unapplied correction candidates, no overlap with prior tranches and zero new certifications. The historical CP16 gate still lacks the original CP15 compare input and must not be characterized as passing.
