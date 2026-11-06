# Droid Components - Mechanical Certification Batch 005

**November 2, 2026. Source review of final 22 Core + SGD census identities.**

Result: **20 source PASS / 2 source HOLD**. Conditional combined five-batch results: **122 evaluated, 99 source-mechanically certified, 23 HOLD, zero unreviewed**. Batches 003 and 004 are bundled locally; the historical GitHub ledger was last committed at 44/122. These figures must not be represented as committed until branch readback establishes it. Production/Foundry certification remains zero.

| Component | Decision | Printed price/cost basis | Host classification |
|---|---|---|---|
| Multifunction Apparatus | **PASS** | {'kind': 'SIZE_FACTOR_CREDITS', 'baseCredits': 80, 'factorAuthority': 'published Core Table 11-2 size factor'} | INSTALLED |
| Multispectrum Searchlight | **PASS** | 100 cr | INSTALLED |
| Radiant Heat Element | **PASS** | 200 cr | INSTALLED |
| Remote Viewer | **PASS** | 1000 cr | DETACHABLE_DROID_DEVICE |
| Rental Restraining Bolt | **PASS** | 10 cr | EXTERNAL_DROID_ATTACHMENT |
| Repulsorcam | **PASS** | 1000 cr | DETACHABLE_DROID_DEVICE |
| Scomp Link | **PASS** | 100 cr | INSTALLED |
| Silence-Bubble Generator | **PASS** | 3500 cr | INSTALLED |
| Space-Beacon Launcher | **PASS** | {'kind': 'CONFIGURED_CAPACITY', 'baseCredits': 5000, 'baseCapacity': 12, 'extraCreditsPerAdditionalBeacon': 500, 'maxCapacity': 24, 'formula': '5000 * (1 + .10*(capacity-12)); capacity 12 through 24'} | INSTALLED |
| Survival Kit | **PASS** | 100 cr | CARRIED_OR_INSTALLED_VARIANT |
| Taser | **HOLD** | 250 cr | WEAPON_NOT_GENERIC_DROID_CHASSIS_COMPONENT |
| Video Screen | **HOLD** | {'kind': 'AREA_PRICING', 'creditsPerSquareMm': 1, 'printedSizeRangeMm': [50, 500], 'measurementInterpretation': 'UNSPECIFIED_DIMENSION_NOT_SILENTLY_SQUARED'} | INSTALLED |
| Voice-Print Command Lock | **PASS** | 400 cr | INSTALLED |
| Weapon Detector | **PASS** | 1500 cr | INSTALLED |
| Sensor Booster | **PASS** | 200 cr | INSTALLED |
| Sensor Countermeasure Package | **PASS** | 1000 cr | INSTALLED |
| YV Sensor Package | **PASS** | 1000 cr | INSTALLED |
| Shield Expansion Module | **PASS** | {'kind': 'SHIELD_RATING_FACTOR', 'baseCreditsPerSR': 50, 'formula': '50 * selected installed shield SR * published droid size cost factor'} | INSTALLED |
| Droid Battle Station | **PASS** | {'kind': 'PER_100_DROIDS', 'creditsPer100Droids': 50000} | FACILITY_OR_STARSHIP_STATION |
| Droid Command Station | **PASS** | 10000 cr | FACILITY_OR_STARSHIP_STATION |
| Droid Recharge Station | **PASS** | 4000 cr | FACILITY_OR_STARSHIP_STATION |
| Droid Socket | **PASS** | 10000 cr | VEHICLE_OR_STARSHIP_SOCKET |

## HOLD decisions

- **Taser:** SGD p63 describes ranged nonlethal electrical attack, ion-like effect on droids and use as electroshock probe in melee, but does not provide attack damage dice. Do not invent dice from existing overlay.
- **Video Screen:** SGD pp58,63 gives price 1 cr per square mm and weight 1 kg + .01 kg per square mm, but the described 50-500mm size does not identify width, height, diagonal or an area. Require selected physical dimensions before a deterministic product quote.

## Important certified restrictions

- **Shield Expansion Module:** Price and weight depend on actual selected installed SR. One selected adjacent square, Medium/smaller occupant, standard activation; Small+ host and count limits.
- **Scomp Link:** +2 Use Computer only for Access Information with computer attitude helpful/friendly. Printed 100cr, not default overlay zero.
- **Sensor Countermeasure Package:** Opposed check works against nonvisual sensors only; visible creatures remain visible.
- **Multispectrum Searchlight:** 6-square cone; -5 on hit, -2 on miss, -10 Stealth in cone; requires ranged attacks vs Fortitude, not automatic blind.
- **Survival Kit:** A successful Aid Another on Survival gives +4 total, not +2 plus +4.
- **Remote Viewer and Repulsorcam:** 12-square maximum separation; distinct time/power/recharge and defense resources; detach does not create unlimited free scouting.
- **Space-Beacon Launcher:** 12-beacon base capacity, up to 24, +10% original launcher cost per extra capacity beacon.
- **Station and socket entries:** Droid Battle, Command and Recharge Stations are facility/ship objects; Droid Socket is installed on a vehicle/ship. Never map these into the droid actor postcreation `system.installedSystems` ledger. Battle Station selected prestige talents are tracked **per station**, not per operator. Droid Socket does not grant firing weapons or hyperspace jumps without pilot approval.

## Method and remaining gates

Printed pages 58-64 were visually inspected and PDF text crosschecked to retain columns and mechanics. The JSON stores source pages, prices, weights, availability, physical host, prerequisites, action economy, resources and exceptions, preserving source absence where appropriate. Local Node validator checks distinct identities and PASS/HOLD status, with cross-batch identity duplication checks. None of the application/Foundry checks were run.

**Remaining after initial 122:** 23 source HOLD cases need targeted adjudication; production rules/data and parity/Foundry tests are entirely separate. 122 is the frozen Core+SGD census, not verified completeness across every published SWSE book.
