# SWSE Phase 2B — Galaxy at War — Source Review Closure

- **5/5** Phase1 source entries verified in the primary scanned PDF.
- Source PDF SHA-256: `9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a`.
- Phase1 provenance Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; preserved without rewrite.
- Initial GitHub branch HEAD: `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- **13** attack-group rows inventoried, **18** discovery-only cases, **1** printed conflicts.
- No strict field/mount certification, no changes to production compendia.
- Page indexing: PDF zero-based page index is printed page number; physical ordinal is printed page +1.
- The source text transcriptions are navigation aids. Rendered printed pages are authoritative when text extraction disagrees.

## Publication-specific source review

| Source key | Ship | Page | CL | Attack rows | Source | Mount cert |
|---|---|---:|---:|---:|---|---|
| `gaw-corona-class-armed-transport` | Corona-class Armed Transport | 67 | 17 | 4 | PDF reviewed | NOT CERTIFIED |
| `gaw-imperial-landing-craft` | Imperial Landing Craft | 64 | 13 | 2 | PDF reviewed | NOT CERTIFIED |
| `gaw-koensayr-ilh-kk-citadel-class-cruiser` | Koensayr ILH-KK Citadel-class Cruiser | 192 | 7 | 4 | PDF reviewed | NOT CERTIFIED |
| `gaw-penumbra-class-attack-shuttle` | Penumbra-class Attack Shuttle | 65 | 9 | 2 | PDF reviewed | NOT CERTIFIED |
| `gaw-yu-410-light-freighter` | YU-410 Light Freighter | 65 | 7 | 1 | PDF reviewed | NOT CERTIFIED |

## Source-specific mechanics and variation

### Corona-class Armed Transport (p. 67)

- Narrative and statblock distinguish armaments, carried attack shuttles and carried tanks.
- Starred capital weapon attack lines impose -20 against targets smaller than Colossal; point-defense row not automatically given same penalty.
- Printed weapon battery count is not independent barrel, emplacement or firing arc proof.

### Imperial Landing Craft (p. 64)

- Landed IF-120 craft can act as a command base; conversion details are narrative and not an unconditional active buff.
- Carried complement includes 12 speeder bikes, 2 LAVr QH-7 command speeders, and 1 PX-4 mobile command base.

### Koensayr ILH-KK Citadel-class Cruiser (p. 192)

- Adventure footnote says these are baseline normal-crew statistics and should be adjusted for heroes.
- Adventure describes a damaged hyperdrive on a specific ship, not a globally broken hyperdrive for the statted baseline cruiser.

### Penumbra-class Attack Shuttle (p. 65)

- Attack options explicitly list fire-link (medium laser cannons, medium concussion missiles).
- 12 concussion missiles is payload inventory, not 12 attack groups.
- Hyperdrive is not printed in the statblock; do not infer one.

### YU-410 Light Freighter (p. 65)

- Narrative grants +5 to Stealth checks when concealing items due to extensive cargo storage.
- Statblock durability row literally has DR 15 followed by DR 20; do not silently rewrite second term to SR 20.

## Unresolved printed discrepancies

- **YU-410 Light Freighter**, p. 65: PRINTED_DURABILITY_LABEL_CONFLICT. Preserve `hp 120; DR 15; DR 20; Threshold 76` versus `Shield description appears in narrative; statblock labels both values DR`. UNRESOLVED_KEEP_PRINTED_TERMS.

## Outstanding work

- Strict field-by-field reconciliation against production ship records (not performed).
- Physical mount/arc/battery proof, weapon station mapping, and relevant runtime regressions (not performed).
- Historical Phase1 identity reconciliation candidates (Hornet and Deep-X) are separately inventoried in earlier reports; do not silently add to the fixed 316 census.
- The printed Lambda editorial note is genuinely present in the PDF. Do not use it as proof of hyperdrive configuration until resolved.
- Sourcebook-local mechanics require implementation/schema review prior to changing runtime.

## Source SHA and reproducibility

- PDF sha256: `9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a`
- Local source PDFs are excluded from Git history. The checker accepts `--pdf-dir` to fingerprint attached originals.
- `tools/audits/vehicles/check_vehicle_phase2b_final17.py` validates counts/roster and checkpoint continuity.

