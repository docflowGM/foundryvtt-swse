# Rebellion Era Campaign Guide — Phase 2B Checkpoint 1: Ten Source Reviews

**Status:** 10 / 35 publication-specific ships PDF close-read; **25** await review. This is source-review completion for this tranche, **not** mechanical certification.

**Book authority:** rendered scanned `Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf` (SHA-256 `60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8`). Printed page `n` equals PDF zero-based page index `n`. TXT was used only to navigate, not as the final mechanical authority.

**Baseline:** repository `docflowGM/foundryvtt-swse`, audit branch `audit/vehicle-phase-0-1-canonical-foundation`, HEAD `1eeeaeb16ac307116ce4be83ea8e67605d324cf1`, Phase 1 provenance blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`. No production packs, actor hydration, V2 runtime, or canonical identities were modified.

## Checkpoint result

| Measure | Count |
| --- | ---: |
| Retained Phase 1 publication identities | 35 / 35 |
| Original PDF close-reads | 10 / 35 |
| Reviews outstanding | 25 |
| Printed weapon attack-detail rows inventoried | 20 |
| Discovery-only schema cases | 17 |
| Preserved source conflicts | 1 |
| Strict field and physical-mount certifications | 0 / 35 |

## Reviewed ship entries

| Source ship | Printed statblock | Attack rows | Notable source findings |
| --- | ---: | ---: | --- |
| G1-M4-C Dunelizard Fighter | 63 | 1 | Dunelizard gains +1 equipment bonus to any Mechanics check to repair it. |
| Ixiyen-class Fast Attack Craft | 64 | 2 | Narrative explicitly states the fighter lacks droid and gunner slots; stock pilot must choose laser fire or missile attacks. |
| M12-L Kimogila Heavy Fighter | 64 | 3 | Narrative specifies four linked lasers; weapon attack row uses heavy laser cannons and fire-link. Keep the narrative hardware description distinct from attack-group count. |
| M22-T Krayt Gunship | 65 | 3 | Dedicated targeting computer grants +1 equipment bonus on gunner turret weapons only, excluding missiles. |
| Pinook Fighter | 66 | 1 | Narrative confirms the Pinook is poorly armed and suited to training, not evidence of any unprinted attack options. |
| Razor-class Fighter | 66 | 3 | Narrative says no copilot, gunner, or droid port, so the single pilot chooses which weapon system to fire. |
| Mobquet Medium Transport | 68 | 2 | Three modular ship nodes: standard crew quarters/storage/defense in front, speeder racks in second, engineering and computers in third. |
| Corellian YV-545 | 69 | 1 | Rotating cockpit can swing 90 degrees; narrative notes under-and-over gun turrets, but only one double-laser attack-group row is printed. |
| YKL-37R Nova Courier | 69 | 2 | Mechanics-trained character gains +5 equipment bonus to Mechanics checks for this ship. |
| Corellian Engineering Corporation YM-2800 Limpet Ship | 114 | 2 | Printed narrative says heavy-duty particle shielding but no ray shields as stock; SR 10 stat line preserved, not overwritten by generic no-shield inference. |

## Publication differences and unresolved interpretation

- **Krayt passenger mismatch (p.65):** the narrative describes room for two passengers/prisoners, while the statblock prints `Passengers none`. Both are retained; no automatic correction.
- **Kimogila (pp.64–65):** narrative says four linked lasers and dual-role proton torpedoes. Its 12-concussion-missile payload does not establish a numeric torpedo capacity. Do not multiply attack groups by guns.
- **Razor (pp.66–67):** `8 medium concussion missiles per tube` is not a total-ammunition figure without the number of physical tubes.
- **Mobquet (pp.67–68):** narrative three-module build, 10 free emplacement points, optional 32-passenger refit; stock statblock remains 24 passengers and a `Colossal (frigate) capital ship`.
- **YKL-37R (pp.68–69):** narrative explicitly gives two twin-laser turrets and three concussion launchers; the statblock has two *attack-detail* rows and a joint copilot/two-gunner station. Physical placement and complete firing arcs still require separate certification.
- **YM-2800 (pp.113–114):** standard action to attach plasma cutter to an adjacent ship without collision; later standard grapple-damage checks bypass SR and accumulate against damage threshold. Firing diverts power so shields and other weapons are offline for that round, returning at the pilot's next turn. The `SR 10` statblock is retained alongside text denying **ray** shields. A hyperdrive field is not printed; do not infer absence.
- **Dunelizard (p.63):** swapping copilot seat for an astromech port is optional. Alternate astromech skills/navicomputer memory and +1 repair-only Mechanics bonus cannot be applied blindly.
- **YV-545 (p.69):** conditional -2 Pilot for **untrained** pilots and three unused emplacement points, not a global pilot modifier.

## Strict-certification blockers

1. Printed weapon attack detail does not universally identify all physical mounts, firing arcs, independent attack groups, batteries or fire-link component counts.
2. Specialized action economy and boarding/tractor semantics must be represented by an explicit schema; no numerical invention or hidden automation.
3. Conditional skill modifiers, ammunition per tube, gunner vs pilot bonus, and refit-only configurations cannot be flattened into a stock statblock.
4. No production or runtime state has been hydrated, and no strict mechanical certificate has been issued.

## Checkpoint integrity and next tranche

The package validator checks 35 identity keys, names/pages, 10 reviewed and 25 pending, primary PDF fingerprint, weapon group inventory, explicit Krayt conflict, crucial narrative rule evidence and schema discovery isolation. The full 35-row roster is tested against live Phase 1 provenance separately from the local package.

**Next ten (Checkpoint 2):** T-Wing, X4 Gunship, Assassin-class Corvette, Assault Gunboat, Imperial Cargo Ship, Imperial II-class Frigate, Missile Boat, Royal Guard Starfighter, TIE Aggressor and TIE Experimental M2 (printed pp.114–136). Preserve TIE Experimental M2/M3 as distinct records.
