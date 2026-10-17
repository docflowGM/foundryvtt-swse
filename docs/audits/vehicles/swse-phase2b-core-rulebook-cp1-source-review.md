# SWSE Ships Phase 2B — Core Rulebook — Checkpoint 1 (6 of 10)

## Scope and authority

- Sourcebook: **Core Rulebook** (printed source PDF visual review; TXT used only for navigation).
- Canonical PDF SHA-256: `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`.
- Phase 1 canonical roster Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`.
- Branch baseline: `audit/vehicle-phase-0-1-canonical-foundation` @ `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- Phase 1 identities retained: **10**. Reviewed: **6**; pending: **4**.
- PDF indexing: zero-based PDF page index corresponds to printed page number; physical ordinal equals printed page + 1.
- A printed weapon attack group does **not** prove its separate independent physical mounts, arcs or individual barrel locations.
- No production compendia, runtime/hydration code, Phase 1 roster identities or actor fixtures changed.

## Publication-specific source review ledger

| Publication identity / printed statblock | Page(s) | CL | Attack groups | Source review | Strict mount certificate |
|---|---:|---:|---:|---|---|
| ARC-170 Starfighter | 180,181 | 12 | 3 | PDF_VERIFIED | NO |
| Corellian YT-1300 Transport | 182,183 | 6 | 1 | PDF_VERIFIED | NO |
| Droid Tri-Fighter | 181 | 9 | 3 | PDF_VERIFIED | NO |
| Eta-2 Actis Interceptor | 180 | 11 | 2 | PDF_VERIFIED | NO |
| Imperial I-class Star Destroyer | 183 | 20 | 4 | PDF_VERIFIED | NO |
| Incom T-65B X-wing Starfighter | 178 | 10 | 2 | PDF_VERIFIED | NO |
| Koensayr Y-wing Starfighter | 178 | — | 0 | NOT_REVIEWED | NO |
| TIE Fighter | 179 | — | 0 | NOT_REVIEWED | NO |
| TIE Interceptor | 179 | — | 0 | NOT_REVIEWED | NO |
| Vulture-class Droid Starfighter | 180 | — | 0 | NOT_REVIEWED | NO |

## Source mechanics / rule discoveries

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

## Printed-source conflicts, preserved without corrections

- **ARC-170 Starfighter, p. 181**: `heavy laser cannons` vs `autofire (medium laser cannons, laser cannons)`; **unresolved** (both printed values kept).
- **Droid Tri-Fighter, p. 181**: `laser cannon +7` vs `autofire (medium laser cannon, light laser cannons)`; **unresolved** (both printed values kept).

## Discovery-only identity and variant reconciliation

No additional identity candidate in the reviewed scope.
- Other ships visible on neighboring pages (Y-wing, TIE Fighter, TIE Interceptor and Vulture droid) remain explicitly **NOT_REVIEWED** here, regardless of incidental proximity in scanned pages.

## Outstanding acceptance work

- The 6 source-reviewed records still require independent physical mount and firing arc certification.
- Confirm attack group/battery count and range through source evidence, not derived assumptions; track where mounted weapon details are absent.
- Reconcile printed-source conflicts independently, recording both original readings and a deliberate resolution authority.
- Reconcile each source entry against the production compendium fields and runtime behavior before strict mechanical certification.
- Full repository regression tests were not run. The included focused validator validates schema, roster, evidence bookkeeping, PDF hashes (when source paths supplied), and archive integrity.

## Focused checks

- Source-reviewed attack groups: **15**.
- Printed conflict records: **2**.
- Discovery-only schema cases: **23**.
- Strict full-field + mount certificates: **0 of 10**.
