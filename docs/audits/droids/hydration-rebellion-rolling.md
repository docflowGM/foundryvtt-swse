# Rebellion Era Campaign Guide - Droid Publication Source Review (Book 6/14)

**LOCAL ONLY. Do not push, import, or change production compendiums without explicit authorization.**

| Measure | Rebellion Era | Overall six-book project |
|---|---:|---:|
| Draft publication identities | **15/15 (100%)** | **176/234 (75.2%)** |
| Selected first-page PDF reviews | **15/15 (100%)** | **176/234 (75.2%)** |
| Direct PDF field comparisons | **325** | **2,632** |
| Independently mechanically certified | **0/15** | **0/234** |
| Mechanically complete books | -- | **0/14** |

## Sources and scope

- Owner-provided *Rebellion Era Campaign Guide* PDF and searchable TXT independently SHA-256 fingerprinted in the local evidence.
- All **15 source identities** checked against printed statblock pages, including continuation and eligibility pages. Unique printed pages rendered: 52-57, 110, 127-130, 143-144.
- **15 droid-actor records**: thirteen ordinary model/statblocks plus named individuals **4-LOM** and **IG-88**. No squad- or vehicle-primary claim in this book.
- Verified source eligibility states: **5 allowed, 7 prohibited, 3 not established/named NPC**. Allowed is not a certified PC creation route.
- Each of the 325 selected fields has a printed-page receipt, and the original TXT line window is retained solely for searchable index/provenance, not as mechanical authority.
- All feat/talent grants, component instances, attack-group rights and Foundry runtime effects remain **disabled/unmapped** until independently certified. No claim has mechanical certification.

## Critical source distinctions

1. **FX-7 (printed pp52-53):** statblock has stationary Speed 0, no vocabulator and printed hero prohibition. Interrogation reprogramming is narrative, not a universal unrestricted action.
2. **R4-Series and WED Treadwell (pp53-54):** hero eligibility is explicitly allowed; electroshock probe is an ion attack; swappable specialist arms do not establish unlimited free system changes.
3. **LOM-Series vs BT-16 (p55):** overlapping OCR fields from columns belong to two separate models. Factory LOM-Series can be used as a hero; BT-16 cannot.
4. **B'omarr conversion (p56):** monks place living brains in modified BT-16 bodies with documented changes. That conditional example does not alter factory BT-16 rules globally or create an extra model identity.
5. **RHTC-560 and HT Drone (pp56-57):** controller commands up to 6-12 physically separate drones. The controller cost **5,000 credits excludes drones**, while a drone costs **2,000 credits**; companion ownership and action delegation require their own certification.
6. **LV-38 (p110):** probe/spotter is a character-scale droid source record, separate from the adjacent mobile torpedo-launcher vehicle and its weapon system. No hero permission is inferred.
7. **Imperial Espionage Droid (p127):** printed hero eligibility is allowed; surveillance prose is not generic automatic eavesdropping permission.
8. **Dark Trooper I-III (pp128-129):** three distinct droid statblocks. Phase I wrist shield gives **conditional +2 armor only while not attacking**; Phase II/III have separate wearable armor descriptions that must not become the autonomous droid actor or grant stacked armor/shields. Phase III source SR20 remains source-only evidence.
9. **Imperial City Maintenance Droid (p130):** RC-M and IC-M designation history is a model alias, not two additional statblocks.
10. **4-LOM (p143):** a named bounty hunter using LOM-family chassis; individual nonheroic/noble/scoundrel/scout/bounty hunter progression is not the stock LOM model.
11. **IG-88 (pp143-144):** one named NPC source block; multiple A/B/C/D consciousness copies and station-core transfer are narrative entities, not additional publication statblocks.

## Selected-field per-entry register

| Source ID | Printed name | Printed page | Fields compared | Hero status | Mechanical status |
|---|---|---:|---:|---|---|
| REBELLION-DROID-001 | FX-7 Medical Droid | 53 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-002 | R4-Series Agromech Droid | 53 | 22 | allowed | BLOCKED |
| REBELLION-DROID-003 | WED Treadwell Repair Droid | 54 | 22 | allowed | BLOCKED |
| REBELLION-DROID-004 | LOM-Series Protocol Droid | 55 | 22 | allowed | BLOCKED |
| REBELLION-DROID-005 | BT-16 Perimeter Security Droid | 55 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-006 | RHTC-560 Hunter Trainer | 57 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-007 | HT Drone | 57 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-008 | LV-38 Spotter/Probe Droid | 110 | 20 | not established | BLOCKED |
| REBELLION-DROID-009 | Imperial Espionage Droid | 127 | 22 | allowed | BLOCKED |
| REBELLION-DROID-010 | Dark Trooper Phase I | 128 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-011 | Dark Trooper Phase II | 128 | 22 | prohibited | BLOCKED |
| REBELLION-DROID-012 | Dark Trooper Phase III | 129 | 23 | prohibited | BLOCKED |
| REBELLION-DROID-013 | Imperial City Maintenance Droid | 130 | 22 | allowed | BLOCKED |
| REBELLION-DROID-014 | 4-LOM | 143 | 20 | not established | BLOCKED |
| REBELLION-DROID-015 | IG-88 | 144 | 20 | not established | BLOCKED |

## Unresolved mechanical certification gates

Each source claim has a complete blocker list in `data/audits/droids/rebellion-review-backlog.json`. Initial selected-field PDF review does **not** mean full book source review and is not a completed Foundry feature. The remaining work includes full printed/narrative rule reconciliation, canonical feat/talent records, component/weapon/attack-group authority, chargen source legality, upstream JSON Schema validation and V13 live runtime verification.

The validation and negative tests check the local ledger's conservation of source authority; they do **not** prove the unpublished mechanics are correct. Keep the book status `IN_PROGRESS_NOT_CERTIFIED` and maintain prior books unmodified.
