# SWSE Phase 2B — Core Rulebook — Source Review Closure

- **10/10** Phase1 source entries verified in the primary scanned PDF.
- Source PDF SHA-256: `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`.
- Phase1 provenance Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; preserved without rewrite.
- Initial GitHub branch HEAD: `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- **22** attack-group rows inventoried, **36** discovery-only cases, **2** printed conflicts.
- No strict field/mount certification, no changes to production compendia.
- Page indexing: PDF zero-based page index is printed page number; physical ordinal is printed page +1.
- The source text transcriptions are navigation aids. Rendered printed pages are authoritative when text extraction disagrees.

## Publication-specific source review

| Source key | Ship | Page | CL | Attack rows | Source | Mount cert |
|---|---|---:|---:|---:|---|---|
| `core-arc-170-starfighter` | ARC-170 Starfighter | 180 | 12 | 3 | PDF reviewed | NOT CERTIFIED |
| `core-corellian-yt-1300-transport` | Corellian YT-1300 Transport | 182 | 6 | 1 | PDF reviewed | NOT CERTIFIED |
| `core-droid-tri-fighter` | Droid Tri-Fighter | 181 | 9 | 3 | PDF reviewed | NOT CERTIFIED |
| `core-eta-2-actis-interceptor` | Eta-2 Actis Interceptor | 180 | 11 | 2 | PDF reviewed | NOT CERTIFIED |
| `core-imperial-i-class-star-destroyer` | Imperial I-class Star Destroyer | 183 | 20 | 4 | PDF reviewed | NOT CERTIFIED |
| `core-incom-t-65b-x-wing-starfighter` | Incom T-65B X-wing Starfighter | 178 | 10 | 2 | PDF reviewed | NOT CERTIFIED |
| `core-koensayr-y-wing-starfighter` | Koensayr Y-wing Starfighter | 178 | 10 | 3 | PDF reviewed | NOT CERTIFIED |
| `core-tie-fighter` | TIE Fighter | 179 | 7 | 1 | PDF reviewed | NOT CERTIFIED |
| `core-tie-interceptor` | TIE Interceptor | 179 | 8 | 1 | PDF reviewed | NOT CERTIFIED |
| `core-vulture-class-droid-starfighter` | Vulture-class Droid Starfighter | 180 | 7 | 2 | PDF reviewed | NOT CERTIFIED |

## Source-specific mechanics and variation

### ARC-170 Starfighter (p. 180)

- Statblock starts printed page 180 and continues on 181 for cargo, hyperdrive and weapon rows.
- Ranged and detailed row say heavy laser cannons, but Atk Options says medium laser cannons; preserve terminology rather than retype hardware.
- Astromech skill entries with asterisks are conditional.

### Corellian YT-1300 Transport (p. 182)

- Statblock starts page 182 and continues page 183; no printed shield rating.
- Core stock transport is not the same publication statblock as YT-1250 or YT-1930 from Scum and Villainy.

### Droid Tri-Fighter (p. 181)

- Printed drone has Crew 0 (expert); avoid inventing a pilot station.
- Can fire multiple weapons against the same or different targets, per adjacent narrative.
- Attack Options calls a medium laser cannon where main Ranged and detail say laser cannon (no medium); preserve printed naming.

### Eta-2 Actis Interceptor (p. 180)

- Hyperdrive x1 is available WITH booster ring, not intrinsic; consumables improve with ring.
- No shield rating printed; source narrative says no shields.
- Astromech asterisk modifiers are conditional.

### Imperial I-class Star Destroyer (p. 183)

- -20 attack penalty against ships smaller than Colossal size, except appropriate point-defense entry.
- Summary multiplicities 5/5/10/10 are published attack group counts, NOT verified independent physical mounts or arcs.

### Incom T-65B X-wing Starfighter (p. 178)

- Astromech-droid modifiers starred in source are conditional.
- T-65B is the Core publication identity, not a silent substitution with versions published in Starships of the Galaxy.

### Koensayr Y-wing Starfighter (p. 178)

- Conditional astromech skill modifier +13 in place of +6; do not treat as always active.
- Laser, ion and proton attacks have main-statblock AND/OR alternatives; do not fire all groups in one action without action authority.

### TIE Fighter (p. 179)

- No shields or hyperdrive printed; narrative explicitly describes the TIE as lacking both.
- Narrative states no cockpit gravity; do not equate this with a game-mechanical disadvantage not printed.

### TIE Interceptor (p. 179)

- Narrative describes four fire-linked laser cannons, while a single detailed attack row provides the combined attack; four barrel descriptions are not four separate weapon actions.
- No hyperdrive and no shield rating printed in statblock.

### Vulture-class Droid Starfighter (p. 180)

- Statblock explicitly identifies both starfighter and walker mode; switching between them is a standard action.
- Crew 0 (expert); immune droid traits reference Core p187.
- Six concussion missile payload; not six independent attack groups.

## Unresolved printed discrepancies

- **ARC-170 Starfighter**, p. 181: SOURCE_WEAPON_LABEL_CONFLICT. Preserve `heavy laser cannons` versus `autofire (medium laser cannons, laser cannons)`. UNRESOLVED_KEEP_BOTH_PRINTED_VALUES.
- **Droid Tri-Fighter**, p. 181: SOURCE_WEAPON_LABEL_CONFLICT. Preserve `laser cannon +7` versus `autofire (medium laser cannon, light laser cannons)`. UNRESOLVED_KEEP_BOTH_PRINTED_VALUES.

## Outstanding work

- Strict field-by-field reconciliation against production ship records (not performed).
- Physical mount/arc/battery proof, weapon station mapping, and relevant runtime regressions (not performed).
- Historical Phase1 identity reconciliation candidates (Hornet and Deep-X) are separately inventoried in earlier reports; do not silently add to the fixed 316 census.
- The printed Lambda editorial note is genuinely present in the PDF. Do not use it as proof of hyperdrive configuration until resolved.
- Sourcebook-local mechanics require implementation/schema review prior to changing runtime.

## Source SHA and reproducibility

- PDF sha256: `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`
- Local source PDFs are excluded from Git history. The checker accepts `--pdf-dir` to fingerprint attached originals.
- `tools/audits/vehicles/check_vehicle_phase2b_final17.py` validates counts/roster and checkpoint continuity.

