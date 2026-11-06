# Droid Component Source-Fact Sprint 003 — Missing-ADD completion

Date: 2026-11-02  
Branch: `audit/droid-publication-census-2026-10-29`  
Primary source: *Scavenger's Guide to Droids*, printed pp. 57-64 (PDF pages 58-65); rendered and visually checked table 3-2 and both-column descriptions.

## Result

- Eleven remaining missing ADD identities individually PDF source-fact reviewed.
- **23/23 missing ADD identities** now have source fact records across Sprint 001 (4 missing ADD), Sprint 002 (8), Sprint 003 (11); **0 missing ADD still awaiting first individual source review**.
- **27 distinct source-fact sets** across the three packets, including the four existing-registry components from Sprint 001.
- **0 full mechanical certificates, 0 production registry changes, 0 Garage/chargen/follower/Store parity tests, 0 Foundry runtime certifications**.
- Source-fact review does **not** certify that the baseline 122 Core+SGD identities comprise all published SWSE component identities. Cross-book census extension remains.
- The frozen 35-row migration backlog is **not mutated**; use the new dedicated rollup JSON for current source-review completion.

## Printed table (Table 3-2 pp.58-59)

| Printed title | Description printed pages | Price in credits | Table weight | Availability | Source-derived host category |
|---|---|---|---|---|---|
| Holographic Game System | 57 | 300 | 3 | - | DROID_INSTALLED_CANDIDATE |
| Interference Generator | 60 | 2500 | 1 | Restricted | DROID_INSTALLED_CANDIDATE |
| Remote Viewer | 61 | 1000 | 20 | - | DROID_DETACHABLE_DEVICE_CANDIDATE |
| Rental Restraining Bolt | 61 | 10 | 0.5 | - | EXTERNAL_DROID_CONTROL_ATTACHMENT |
| Space-Beacon Launcher | 63 | 5000 | 10 | - | DROID_INSTALLED_CANDIDATE |
| Video Screen | 63 | 1 credit * screen area in square millimeters | 1 + (0.01 * screen area in square millimeters) | - | DROID_INSTALLED_CANDIDATE |
| Voice-Print Command Lock | 63 | 400 | 1 | - | DROID_INSTALLED_CANDIDATE |
| Droid Battle Station | 63 | 50000 per 100 droids | 5000 | Military | FACILITY_OR_STARSHIP_STATION_NOT_DROID_BODY |
| Droid Command Station | 64 | 10000 | 1000 | Licensed | FACILITY_OR_STARSHIP_STATION_NOT_DROID_BODY |
| Droid Recharge Station | 64 | 4000 | 500 | - | FACILITY_OR_STARSHIP_STATION_NOT_DROID_BODY |
| Droid Socket | 64 | 10000 | 1000 | Military | VEHICLE_OR_STARSHIP_SOCKET_NOT_DROID_BODY |

Full per-record source fields, limitations and printed page citations are in `data/audits/droids/component-source-facts-sprint-003.json`. Source-reviewed status means prices and effects were transcribed from the printed pages, **not verified end-to-end**.

## Key rules and implementation gates

**Game system:** Holoprojector is expressly sold separately; the 300-credit component includes 15 games and allows 10 more via Use Computer DC 15. No automatic holoprojector grant.

**Interference generator:** Basic 2,500-credit Restricted model affects adjacent-square audio listening/recording; DC 30 Perception or Use Computer is needed to recover scattered words. Deluxe version adds video/holo recording interference, but **has no independently verified price**. Do not invent an always-on generic Stealth modifier.

**Remote viewer:** A separate detachable audio/visual sensor: 12-square range, movement 4, Reflex 18, Fortitude 12; 30 minutes of service then 1 hour recharge. No autonomous battle action or no-cost teleportation is established.

**Rental bolt:** 10-credit external restraining bolt with credit reader, subject to standard bolt rules. A credit deposit grants use for a specified rental period; expired period causes deactivation until sufficient credits are deposited again. **No price-per-minute or universal rental rate is published here.**

**Space-beacon launcher:** 5,000 credits and 10 kg. Holds 12 beacons, with extra capacity up to 24 for 10% of launcher price per additional beacon. Locating a beacon with ship sensors requires Use Computer DC 10. Beacon ammunition, launch action and separately bought beacon cost **not proven**.

**Video screen:** Table cost **1 credit times screen area (mm²)** and weight **1 kg plus 0.01 kg times screen area (mm²)**. Prose says sizes range **50mm to 500mm** without specifying both dimensions/shape. **Do not infer area from a single linear dimension**, or silently flatten the printed weight formula.

**Voice-print command lock:** 400 credits, 1 kg; the droid obeys its master's registered voice. Attempting to command with a recorded voice calls for Use Computer against droid Will **+5**. Reassignment and control conflict rules not proven.

### Four station identities are not player-chassis installable systems

**Battle Station:** 50,000 credits per 100 droids, 5,000 kg, Military. Provides Command Station functions and **two** selected Droid Commander prestige talents to station operator. Charges/uses are tracked **per station**, not per character. No free character talent grants.

**Command Station:** 10,000 credits, 1,000 kg, Licensed. Operates droid pool through comlink/integrated comlink/remote processor; requires password/code cylinder, has Intelligence max(14, ship Int) and Will 15. Its functions: issue commands, scoped +10 to Use Computer/Persuasion/Perception against controlled droids, DC 15 Use Computer for improved (+3) automatic aid checks, DC 5 tracking of properly marked droids within operational range, no-check status and Binary translation, and Core p.192 reprogramming under proper checks.

**Recharge Station:** 4,000 credits, 500 kg, no restriction label. External power required; recharge takes typically 1 hour and commercial stations charge 20 credits per service. DC 10 Use Computer diagnostics; can secure shipboard droids for travel. Not equivalent to permanent equipment built into a droid.

**Droid Socket:** 10,000 credits (usually factory-included), 1,000 kg, Military. A **vehicle/ship socket for astromech droids** (retrofit possible), not a purchased part mounted on the astromech. Pilot permissions govern steering, ejection (speed 12), weapons, and hyperdrive authorization. Weapons and unauthorized hyperspace jumps are forbidden by default unless pilot overrides. Scomp interface and limited vehicle skill operations are not blanket roll/attack permission.

**Droid Oil Bath (Sprint 002):** Also external maintenance apparatus and contains a printed cost contradiction. Therefore **five** baseline missing ADD records are strongly classified as physical site/vehicle equipment instead of droid-body-installed upgrades; Rental Restraining Bolt is another *external control attachment*, not a normal chassis upgrade.

## Downstream decisions and boundaries

1. Preserve the 122 Core+SGD published identity census as **identity/presence**, not complete rule certification or whole-SWSE book coverage.
2. Mark all 23 source-reviewed ADD claims, while **not** promoting all 23 to Garage/chargen purchasable installed systems. Their host classes must decide the eventual Store/Vehicle/Facility paths.
3. Source-mechanical completion still requires size/degree restrictions, appendage slots, action triggers, resources, exact source cost variant data, owner permission and sensor/weapon/vehicle authority.
4. The existing `scripts/data/droid-part-schema.js` remains the single candidate authority for eventual droid-part definitions; `scripts/data/droid-systems.js` chargen reads must converge. `system.installedSystems` is the postcreation installed droid ledger, **not a vehicle station registry**.
5. No production changes or user-owned actor alterations were made. Claude's later runtime acceptance remains separate.

## Evidence validation and unexecuted tests

Source-review inputs: direct rendered pages PDF 58-65. Canonical name and slug strings absent from both runtime definition layers as of their stable source blobs `db4f5aea9ed2ef784acbee9a7927056121128d8f` and `fcde3e63eb847397b16cd1606df153dd8bc9c015`. This exact-string search does not eliminate all possible semantic aliases.

Reproduce the committed structural validator after checkout:

```sh
node tools/audits/droids/verify_component_source_facts_sprint_003.mjs
```

The authoring-time packet/count/source reference assertions were executed in preparation for this commit. **Node validator, full test suite, GitHub Actions, Garage/chargen/Store, in-game system behavior, Foundry V13 runtime and cross-book census are NOT claimed executed/certified by this documentation.** No source rule is certified merely because its record passes schema checks.

## Next phase: C2 identity/variant reconciliation

Individually review the seven EDIT families (Remote Processor, Secondary Battery, Translator Unit, Projectile Hand, Laminanium Plating, Communications Countermeasure System, Weapon Detector) against their Core/SGD printed pages, preserving typed variant choices. Then review five repo-only identities and dependency references, especially Miniaturized Self-Destruct, before migration. Continue cross-book source identity coverage separately.
