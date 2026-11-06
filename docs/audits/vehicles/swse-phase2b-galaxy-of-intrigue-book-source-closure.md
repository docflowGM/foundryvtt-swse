# SWSE Phase 2B — Galaxy of Intrigue — Source Review Closure

- **6/6** Phase1 source entries verified in the primary scanned PDF.
- Source PDF SHA-256: `c43531ac33c6e6bd84c18ff8e26a472dc8ef95ebb46948beb3beb29be384da21`.
- Phase1 provenance Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; preserved without rewrite.
- Initial GitHub branch HEAD: `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- **9** attack-group rows inventoried, **23** discovery-only cases, **2** printed conflicts.
- No strict field/mount certification, no changes to production compendia.
- Page indexing: PDF zero-based page index is printed page number; physical ordinal is printed page +1.
- The source text transcriptions are navigation aids. Rendered printed pages are authoritative when text extraction disagrees.

## Publication-specific source review

| Source key | Ship | Page | CL | Attack rows | Source | Mount cert |
|---|---|---:|---:|---:|---|---|
| `goi-modified-incom-a-24-sleuth` | Modified Incom A-24 Sleuth | 69 | 10 | 1 | PDF reviewed | NOT CERTIFIED |
| `goi-modified-sienar-fleet-systems-lambda-class-shuttle` | Modified Sienar Fleet Systems Lambda-class Shuttle | 186 | 13 | 3 | PDF reviewed | NOT CERTIFIED |
| `goi-ptv-2100-incarcerator` | PTV-2100 Incarcerator | 68 | 16 | 2 | PDF reviewed | NOT CERTIFIED |
| `goi-republic-engineering-corporation-ferret-class-reconnaissance-vessel` | Republic Engineering Corporation Ferret-class Reconnaissance Vessel | 69 | 12 | 1 | PDF reviewed | NOT CERTIFIED |
| `goi-republic-engineering-corporation-prowler-class-reconnaissance-vessel` | Republic Engineering Corporation Prowler-class Reconnaissance Vessel | 70 | 12 | 1 | PDF reviewed | NOT CERTIFIED |
| `goi-sabaoth-frigate-spy-ship` | Sabaoth Frigate Spy Ship | 71 | 11 | 1 | PDF reviewed | NOT CERTIFIED |

## Source-specific mechanics and variation

### Modified Incom A-24 Sleuth (p. 69)

- Tight-beam transmitter sends a difficult-to-intercept signal; no numeric communications roll bonus printed.
- Astromech conditional Mechanics and Use Computer values, and separate navicomputer/10-jump memory.

### Modified Sienar Fleet Systems Lambda-class Shuttle (p. 186)

- Printed PDF contains bracketed editorial note challenging inclusion of the hyperdrive line; treat as unresolved editorial ambiguity, not cleaned canonical hardware.
- Unique adventure variant tied to Moff Venram Krax, not the generic Lambda statblock.

### PTV-2100 Incarcerator (p. 68)

- An incarcerator and adjacent allied ships gain one extra damage die against ships moving into their square to dock or board, as described in printed narrative.
- Turbolaser battery explicitly applies -20 penalty against targets smaller than Colossal; point defense does not.
- Shield rating not printed; do not infer it.

### Republic Engineering Corporation Ferret-class Reconnaissance Vessel (p. 69)

- Stealth +5 technology bonus; baffled drive at half speed grants additional +5 technology bonus, for at most one hour.
- Sensor decoys permit a Stealth reroll once per encounter, twice before resupply.
- Ranged line +9 conflicts with detailed missile weapon attack +11.

### Republic Engineering Corporation Prowler-class Reconnaissance Vessel (p. 70)

- Longer-range Prowler includes ion drives, sensor-masking coatings and reconnaissance role.
- Ten missiles are payload, not ten individually certified weapon mounts.

### Sabaoth Frigate Spy Ship (p. 71)

- This spy variant removes the tractor beams and half of a normal Sabaoth frigate’s heavy lasers; do not restore baseline frigate weapons.
- Conditional +13 Perception with sensor package, otherwise +8.
- Two-by-two starship-scale space printed for this specific frigate.

## Unresolved printed discrepancies

- **Modified Sienar Fleet Systems Lambda-class Shuttle**, p. 187: PRINTED_EDITORIAL_HYPERDRIVE_AMBIGUITY. Preserve `[Designer omitted the hyperdrive line... included it below in red. Delete the line if the exclusion was intentional...]` versus `Hyperdrive x1 (backup x10), navicomputer (printed following editorial note)`. UNRESOLVED_PRESERVE_EDITORIAL_NOTE.
- **Republic Engineering Corporation Ferret-class Reconnaissance Vessel**, p. 69: PRINTED_ATTACK_BONUS_CONFLICT. Preserve `Ranged concussion missiles +9 (see below)` versus `Medium concussion missiles (pilot) Atk +11, Dmg 9d10x2`. UNRESOLVED_KEEP_BOTH_PRINTED_VALUES.

## Outstanding work

- Strict field-by-field reconciliation against production ship records (not performed).
- Physical mount/arc/battery proof, weapon station mapping, and relevant runtime regressions (not performed).
- Historical Phase1 identity reconciliation candidates (Hornet and Deep-X) are separately inventoried in earlier reports; do not silently add to the fixed 316 census.
- The printed Lambda editorial note is genuinely present in the PDF. Do not use it as proof of hyperdrive configuration until resolved.
- Sourcebook-local mechanics require implementation/schema review prior to changing runtime.

## Source SHA and reproducibility

- PDF sha256: `c43531ac33c6e6bd84c18ff8e26a472dc8ef95ebb46948beb3beb29be384da21`
- Local source PDFs are excluded from Git history. The checker accepts `--pdf-dir` to fingerprint attached originals.
- `tools/audits/vehicles/check_vehicle_phase2b_final17.py` validates counts/roster and checkpoint continuity.

