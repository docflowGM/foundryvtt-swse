# SWSE universal vehicle Phase 2-C — Clone Wars Campaign Guide

**Status:** Complete source-mechanical staging of all **67 / 67** Clone Wars vehicle publication identities. Strict physical mount, typed exceptional mechanic, and Foundry runtime certification remain separate and outstanding.

## One-book checkpoint

| Measure | Result |
| --- | ---: |
| Inherited spacecraft from previously PDF-reviewed ship SSOT | 41 |
| Newly source-transcribed walkers / speeders / tanks / water / air vehicles | 26 |
| **Total unique publication records** | **67** |
| Printed attack-group records preserved | 124 (79 inherited, 45 new) |
| New strict weapon mount certificates | 0 |
| New production Actor or pack writes | 0 |

**Source authority:** *Clone Wars Campaign Guide*, primary scanned PDF, SHA-256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`. The original printed pages used for the 26 additional entries are 138, 163–170, 198–203 and 219–220. The searchable DJVU text is only a navigation aid; the page scans are authoritative, especially where text extraction interleaves adjacent columns.

**Files:** `data/audits/vehicles/swse-universal-phase2c-clone-wars-staged.json` is the materialized 67-entry dataset; `data/audits/vehicles/swse-universal-phase2c-clone-wars-new-fixtures.json` records the 26 printed-source evidence fixtures with explicit source keys and page locators. The frozen Phase 1 ledger `swse-universal-phase1c-clone-wars.json` remains unchanged. `tests/vehicle-universal-phase2c-clone-wars.test.mjs` verifies identity, source fields, special cases, nested schema and source weapon groups.

## Explicit source handling

- The SPHA vehicle is **one** published CL 16 source entry with five mutually exclusive primary armament choices (SPHA-T/I/V/C/M), not five default installed guns or five cloned vehicles.
- General Grievous's modified Tsmeu-6 and the baseline Tsmeu-6 are different printed source configurations. Each is one identity; the walking fallback of the wheel bike is preserved.
- Manta Droid Subfighter remains a **water** vehicle; its name is not evidence for independent spaceflight.
- DC0052 airspeeder is CL 1 and unarmed; the nearby Azure Angel starfighter is a distinct statblock in the other PDF column, not a valid source for DC0052 cargo, missiles, hyperdrive, or defenses.
- Source scan resolved OCR ambiguities: AT-AP crew 3; AT-RT Fortitude 16 and 60 HP; Medlifter speed 10 squares; Oevvaor maximum velocity 370 km/h; SPHA CL 16.
- Original disagreements between *Ranged* headers and specific attack rows (such as AT-XT, UT-AT, and Gnasp tail-gun) remain recorded rather than silently corrected or recomputed.
- Every physical mount / arc remains uncertified. The 124 source attack rows are **not** executable weapon authorities. Source-specific mechanics and alternate configurations have pending typed-rule consumers.
- The 41 older ships are converted from the historical `data/canonical/vehicles/ships.json` evidence. This checkpoint does **not** claim all 41 historical source pages were newly close-read; original source correction evidence remains authoritative and unchanged.

## Acceptance boundary

The 67 records use the existing draft `swse.vehicle.phase0b.draft-0.5` universal schema; all 23 required top-level groups remain available with sparse evidence-based nested fields. Known printed absence is not treated as unknown, and an unknown capability does not become a default zero or false. No production ship packs, generated Actors, runtime attacks or Foundry V2 UI behavior have been changed.

**Next book:** Knights of the Old Republic Campaign Guide (39 publication claims: 32 inherited ships, 7 additional vehicles), following the same whole-book, single-commit checkpoint workflow.
