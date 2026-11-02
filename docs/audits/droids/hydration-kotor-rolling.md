# Knights of the Old Republic - Droid Publication Hydration (Local checkpoint 7)

**Scope:** 24 book-specific publication claims. **Local only**, no GitHub writes or Foundry imports. Selected statblock first-page PDF verification is not full mechanical certification.

| Measure | KOTOR | Overall (4 books) |
|---|---:|---:|
| Draft source records | 24/24 | 139/234 (59.4%) |
| Selected-first-page PDF review | 24/24 | 139/234 (59.4%) |
| Selected exact-page visual field comparisons | 369 | 2,022 |
| Mechanically certified | 0/24 | 0/234 |
| Mechanically complete books | -- | 0/14 |

**Source:** Knights of the Old Republic Campaign Guide, printed pp81-89, 165, 203, 212-213, 216, 222-223. PDF source SHA-256: `fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419`. Text is an indexing layer, not the final authority.

**Actor formats:** 23 character-scale droid records (including three named individuals and one independent HK heroic template) plus one **Basilisk vehicle-primary**. **Hero eligibility source overlay:** 6 allowed; 12 prohibited; 1 conditional; 5 not established / named character not a PC template. These labels are not authorization to instantiate a starting PC without a legal route.

## Important source decisions and unresolved items

- **HK source identities (printed pp84-85, 213):** HK-24 and HK-50 assassin factories are explicitly not playable as droid heroes. The Independent HK-Series heroic baseline is a separate GM-conditional template. HK-47 is a named NPC with an independent career history and is **not** established as derived from the heroic template. No accidental transfer of levels, weapons, or talents.
- **GO-TO and T3-M4 (printed pp82, 212, 216):** Both named characters have separate publication claims and retain a census-backed reference to their factory/series model. This relationship does not enable automatic mechanic duplication.
- **Basilisk (printed p203):** Huge air vehicle (droid), not a regular droid actor. Printed 70 hp, DR 5, passenger, droid-brain crew, velocity, attack group, weapon ammunition and value belong to **vehicle-only source evidence**. Passenger substitution/control rule is source-only, not executable.
- **K-X12 (printed p86):** Self-destruct and drone/deployment context are pending standalone action/equipment authority.
- **Mark I versus Mark IV Assault Droid (printed p165):** Different printed attack modes, durability and loadouts; source weapons are not certified mounts.
- **Krath War Droid (printed p222):** Basic is understood but not spoken; preserve separate capabilities.
- **Rakatan Guardian (printed p223):** Printed integrated weaponry is a possessions statement, not a certified weapon instance list.
- **Cross-page eligibility:** GO-TO factory prohibition appears in narrative on printed p81; HK-50 factory prohibition is printed on p84. Their visual source receipts are separate from the main statblock-page numeric comparison counts.
- **Labels:** The existing census sometimes drops manufacturer prefixes from complete printed statblock headings. Census IDs/names are retained for identity parity; do not claim the normalized title is a verbatim full heading.

## Mechanical certification backlog

All 24 records remain blocked by at least these gates: full rule/narrative reading, canonical feats/talents and source citations, installed component provenance, weapon-mount and attack-group authority, creation-route legality, full upstream schema validation, and Foundry V13 runtime execution. See `data/audits/droids/kotor-review-backlog.json`.

## Per-entry selected PDF review

| ID | Publication claim | Printed page | Authority | Selected fields | Mechanical gate |
|---|---|---:|---|---:|---|
| KOTOR-DROID-001 | ET-74 Communications Droid | 81 | factory/stock entry | 15 | BLOCKED |
| KOTOR-DROID-002 | GO-TO Infrastructure-Planning Droid | 82 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-003 | T3-Series Utility Droid | 82 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-004 | GE3-Series Protocol Droid | 83 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-005 | GG-Series Hospitality Droid | 84 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-006 | HK-24 Series Assassin Droid | 84 | factory/stock entry | 17 | BLOCKED |
| KOTOR-DROID-007 | Independent HK-Series Droid | 85 | independent heroic template | 15 | BLOCKED |
| KOTOR-DROID-008 | HK-50 Series Assassin Droid | 85 | factory/stock entry | 17 | BLOCKED |
| KOTOR-DROID-009 | Juggernaut War Droid | 86 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-010 | K-X12 Probe Droid | 86 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-011 | Municipal Patrol Droid Mark I | 87 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-012 | Devastator War Droid | 87 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-013 | Sentinel Droid | 88 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-014 | S6-Series Security/Maintenance Droid | 88 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-015 | T1 Bulk Loader Droid | 88 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-016 | R-8009 Utility Droid | 89 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-017 | Mark I Assault Droid | 165 | factory/stock entry | 17 | BLOCKED |
| KOTOR-DROID-018 | Mark IV Assault Droid | 165 | factory/stock entry | 17 | BLOCKED |
| KOTOR-DROID-019 | Basilisk War Droid | 203 | vehicle | 5 | BLOCKED |
| KOTOR-DROID-020 | GO-TO (Dark Wars) | 212 | named NPC | 15 | BLOCKED |
| KOTOR-DROID-021 | HK-47 (Jedi Civil War) | 213 | named NPC | 15 | BLOCKED |
| KOTOR-DROID-022 | T3-M4 (Jedi Civil War) | 216 | named NPC | 14 | BLOCKED |
| KOTOR-DROID-023 | Krath War Droid | 222 | factory/stock entry | 16 | BLOCKED |
| KOTOR-DROID-024 | Rakatan Guardian Droid | 223 | factory/stock entry | 14 | BLOCKED |

## Verification boundaries

- KOTOR local typed/source-field validator and independent negative-mutation suite must pass.
- Printed PDF images are preserved in the local `work/` folder, but omitted from the distributable ZIP because original copyrighted books are not redistributed.
- Full upstream canonical JSON Schema 2020-12 validation **has not run**. V13 live runtime verification **has not run**.
- No production compendiums, actor data, schema authority, GitHub branch, commit or PR have been modified.
