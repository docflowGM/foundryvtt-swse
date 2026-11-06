# SWSE Ships Phase 2B — Scum and Villainy — Book closure

## Scope and authority

- Sourcebook: **Scum and Villainy** (printed source PDF visual review; TXT used only for navigation).
- Canonical PDF SHA-256: `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`.
- Phase 1 canonical roster Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`.
- Branch baseline: `audit/vehicle-phase-0-1-canonical-foundation` @ `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- Phase 1 identities retained: **11**. Reviewed: **11**; pending: **0**.
- PDF indexing: zero-based PDF page index corresponds to printed page number; physical ordinal equals printed page + 1.
- A printed weapon attack group does **not** prove its separate independent physical mounts, arcs or individual barrel locations.
- No production compendia, runtime/hydration code, Phase 1 roster identities or actor fixtures changed.

## Publication-specific source review ledger

| Publication identity / printed statblock | Page(s) | CL | Attack groups | Source review | Strict mount certificate |
|---|---:|---:|---:|---|---|
| C-wing Ugly Fighter | 66 | 8 | 3 | PDF_VERIFIED | NO |
| Clutch Ugly Fighter | 67 | 8 | 2 | PDF_VERIFIED | NO |
| Corellian Engineering Corporation YT-1250 Transport | 64 | 7 | 1 | PDF_VERIFIED | NO |
| Corellian Engineering Corporation YT-1930 Transport | 66 | 8 | 1 | PDF_VERIFIED | NO |
| CorelliaSpace Gymsnor-3 Light Freighter | 62 | 7 | 1 | PDF_VERIFIED | NO |
| Errant Venture | 128 | 19 | 5 | PDF_VERIFIED | NO |
| Kaloth-style Battlecruiser | 126 | 17 | 3 | PDF_VERIFIED | NO |
| Kazellis Corporation Light Freighter | 62 | 8 | 1 | PDF_VERIFIED | NO |
| Surronian Conqueror-class Assault Ship | 64 | 11 | 2 | PDF_VERIFIED | NO |
| X-TIE Ugly Fighter | 67 | 9 | 1 | PDF_VERIFIED | NO |
| Y164 Thalassian Slave Transport | 127 | 13 | 1 | PDF_VERIFIED | NO |

## Source mechanics / rule discoveries

### C-wing Ugly Fighter (p. 66)
- Narrative describes B-wing/YT-series hybrid and two passenger seats; no generic ugly-fighter record merge.
- The torpedo weapon row does not print a splash radius; do not infer it from other torpedoes.

### Clutch Ugly Fighter (p. 67)
- Vehicle Combat is expressly printed in the defenses; source does not provide a separate granted-feat actor implementation.
- Ugly narrative rules include unreliable ship treatment; do not replace the specific statblock with a generic ugly.

### Corellian Engineering Corporation YT-1250 Transport (p. 64)
- Source narrative explicitly identifies six free emplacement points; do not import the usual ten free points from other YT-series hulls.
- The single detailed weapon row and Ranged 2 double lasers must not be treated as automatically specifying two complete mount geometry records.

### Corellian Engineering Corporation YT-1930 Transport (p. 66)
- Printed YT-1930 is a distinct transport from YT-1250 and Core YT-1300.

### CorelliaSpace Gymsnor-3 Light Freighter (p. 62)
- The printed narrative describes a detachable cockpit escape pod; escape-pod operation/capabilities are not separately statted.

### Errant Venture (p. 128)
- Apply -20 on attacks against targets smaller than Colossal size; weapon rows separately give derived -7/-11 values.
- This is the modified named Errant Venture, not the stock Imperial II-class Star Destroyer.
- Narrative specifically describes reduced armament compared with conventional Star Destroyer and changing configurations; use printed statblock as the specific version.

### Kaloth-style Battlecruiser (p. 126)
- Printed generic -20 attack penalty against targets smaller than Colossal; applies to qualifying large guns rather than point-defense batteries.
- Narrative explicitly says Kaloth has no ion weapons; preserves its capture tactics as tractor rather than ion.

### Surronian Conqueror-class Assault Ship (p. 64)
- Narrative says one pilot can operate the two double medium laser cannons, though typically controlled by a gunner.
- Fire-link ion cannons is explicitly printed despite the summary singular light ion cannon; preserve rather than infer barrel or linked topology.

### X-TIE Ugly Fighter (p. 67)
- Astromech droid conditional Use Computer/Mechanics modifiers are not unconditional bonuses.
- No shield rating is printed; cannot certify a numeric SR of zero.
- X-ceptor variant is discussed in narrative (TIE interceptor panels, additional lasers and torpedo launcher) but no separately published full statblock.

### Y164 Thalassian Slave Transport (p. 127)
- Passenger figure explicitly labels enslaved captives; preserve published capacity as data, not a player-facing recommended use.

## Printed-source conflicts, preserved without corrections

- **Clutch Ugly Fighter, p. 67**: `ion cannons +7` vs `ion cannons (pilot) Atk +5`; **unresolved** (both printed values kept).

## Discovery-only identity and variant reconciliation

- **Tenloss Corporation Hornet-class Interceptor, printed p. 125 (CL 12)** has a complete starship statblock but is missing from this book's Phase 1 roster. This is a **new identity candidate**, not an automatically added roster entry. Requires a separate Phase 1 provenance correction/reconciliation decision.
- X-ceptor (p. 67) is a narrative X-TIE variant without a separate full CL statblock, so it is not silently added.
- C-wing, Clutch and X-TIE each retain a separate Phase 1 publication identity.

## Outstanding acceptance work

- The 11 source-reviewed records still require independent physical mount and firing arc certification.
- Confirm attack group/battery count and range through source evidence, not derived assumptions; track where mounted weapon details are absent.
- Reconcile printed-source conflicts independently, recording both original readings and a deliberate resolution authority.
- Reconcile each source entry against the production compendium fields and runtime behavior before strict mechanical certification.
- Full repository regression tests were not run. The included focused validator validates schema, roster, evidence bookkeeping, PDF hashes (when source paths supplied), and archive integrity.

## Focused checks

- Source-reviewed attack groups: **21**.
- Printed conflict records: **1**.
- Discovery-only schema cases: **32**.
- Strict full-field + mount certificates: **0 of 11**.
