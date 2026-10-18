# Starships of the Galaxy — CP19 Tranche 02 (queue 16–30)

**Status:** 15 / 15 ship source close-reads reviewed against original scanned PDF, one source-supported hardware-count correction candidate; no newly granted certification or runtime weapon authority.

**PDF SHA-256:** `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0` (exactly matches CP16). **Branch:** `audit/sotg-strict-certification-cp17`.

## Results

| Queue | Ship | Printed page(s) | Finding |
|---:|---|---|---|
| 16 | Rothana Heavy Engineering Acclamator-class Transgalactic Military Assault Ship | 56, 57 | The three attack families and target-size modifier agree with printed source. Cargo and carried ground equipment are not ship-mounted guns; arcs and per-battery hardware remain unprinted. |
| 17 | Rothana Heavy Engineering Acclamator II-class Transgalactic Military Assault Ship | 57 | Important CP16 evidence underclassification: printed prose explicitly establishes two heavy proton torpedo tubes despite the corresponding source ledger row having SOURCE_SILENT_CONFIRMED hardwareCount. Promote only via audited correction, and do not infer arc, magazine-to-launcher equivalence, or physical counts for turbolaser batteries. |
| 18 | Delta-7 Aethersprite Light Interceptor | 60 | The plural laser-cannon family supplies no physical barrel count or arc. The original historical row is missing its own sourcePage key; do not fabricate it from the verified ship-level p60 locator. |
| 19 | Archaic Heavy Cruiser | 62 | The Archaic Heavy Cruiser is the published template-applied Dreadnaught example, not the ordinary source identity. Preserve printed battery counts but never derive number of barrels or arcs from five-gunner stations. |
| 20 | Banking Clan Munificent-class Frigate | 64 | Prose identifies prow heavy turbolasers, not reliable full firing arcs or barrel counts for all five groups. Jamming is narrative and cannot be imported as an unsourced activation modifier. |
| 21 | Slayn & Korpil B-wing Starfighter | 66, 67 | Four listed attack options are exclusive published Ranged alternatives, not simultaneous hardware activations. Weapon quantities and arcs remain silent. E2 and Shuttle must not inherit standard fighter loadout as stock. |
| 22 | Slayn & Korpil B-wing Shuttle | 67 | Shuttle does not inherit the standard B-wing's published proton torpedo attack or SR30. No torpedo row is not itself permission to assert physical absence of every optional torpedo system. Adjacent B-wing family handling-rule applicability remains unsettled. |
| 23 | Slayn & Korpil B-wing/E2 Starfighter | 66, 67 | Repeated pilot laser label denotes one weapon family used in two allowed combinations, not duplicate laser hardware. Pilot/gunner fire profiles must remain distinct; no physical hardware/barrel count or arc inferred. |
| 24 | Damorian Manufacturing's Carrack-class Light Cruiser | 68 | Three published battery group counts are not weapons-per-battery. External TIE racks are carried-craft evidence, not weapon mounts or extra Carrack guns. |
| 25 | Chiss Nssis-class Clawcraft | 69 | Printed statblock does not choose early or late navigation fit. Preserve x1.5 and conditional computer/beacon variations without pretending both are simultaneously stock. |
| 26 | Koensayr ILH-KK Citadel-Class Cruiser | 70 | The ion physical count 2 is already present in CP16 and must remain. Gunnery stations differ: gunner operates laser/ion, pilot missiles/tractor. Other barrel/launcher counts and arcs still source silent. |
| 27 | CloakShape Fighter | 71 | Do not materialize aftermarket upgrades into stock. No hyperdrive line in stock statblock does not, by itself, prove an explicit printed 'None' value, despite aftermarket sled context. |
| 28 | Coralskipper | 73 | Treat dovin basal as multifunction organic equipment, not conventional shield generator, generic launcher, or simultaneous swift-action stacking. Physical organ count and firing arc unknown. |
| 29 | Corellian Engineering Corporation CR90 Corvette | 74, 75 | Two published batteries cannot become an inferred two turbolaser physical barrels. CR70 upgrade is optional historical conversion and cannot silently mutate the separately certified unarmed CR70 source entry. |
| 30 | Rendili StarDrive Dreadnaught-class Heavy Cruiser | 76, 77 | Printed two individual light turbolasers remain distinct from two batteries in other families. P77 continuation is part of the tactical-fire rule; do not substitute ordinary +Reflex or damage bonus. |

## Specific source-supported correction candidate

**Acclamator II, p.57:** adjacent descriptive paragraph expressly identifies **two heavy proton torpedo tubes**. CP16's second attack group currently records `hardwareCount: "SOURCE_SILENT_CONFIRMED"`. This is a **source-backed audit correction candidate** for a count of two torpedo launching tubes, **not** a claim that torpedo ammunition count equals launcher count, nor a claim about firing arc. CP16 is not modified in this tranche, and this observation does not authorize automated stock attacks. Retain its original source state until a controlled ledger reconciliation applies the exact page-supported evidence.

## Field and authority boundaries

- The 39 attack-group rows in these 15 ships remain published firing groups, **not** 39 independent physical weapon mounts.
- Citadel-class has two printed ion cannons, and the Dreadnaught has two printed light turbolasers. Both counts were already present in CP16 and are unchanged.
- B-wing Standard, Shuttle, and E2 remain distinct ship configurations. The printed E2 combines a pilot laser attack with one gunner attack; this is not duplicated laser hardware.
- Missing per-row `sourcePage` in Delta-7 remains missing historically and is not back-filled, despite printed page 60 being known from the ship record.
- Functional shields, dovin basal defenses, electronic jamming, carried craft, optional hyperdrives, and conditional navigation do not imply unsourced installations.
- Published source silence is permitted under the CP18 source-fidelity policy, but a ship only receives that certificate after separate lossless mapping and per-ship gate verification; these records are close-reads, not certificates.
- No original CP16 ledger, CP17 queue, vehicle combat integration, production pack, schema v0.6 freeze, or Pure/Modified refactor is modified.

**Totals:** 30/100 queue entries have been reviewed across CP19 tranches 1–2; 70 entries remain. Existing strict source-field/mount certificates remain 4/104, and no additional operational stock attack groups are authorized. CP16's historical continuity replay remains blocked by the absent CP15 comparison ledger on the source branch.

## Independent validation

`node tools/audits/vehicles/check_sotg_phase2b_cp19_tranche02.mjs` reconstructs all 15 queue identities, their 39 attack groups and source-silent values from committed CP16/CP17 ledgers, checks non-overlap with tranche 1, and asserts that the Acclamator II correction remains **unapplied**, with no certification or runtime authority changes.
