# SWSE Phase 2B — Threats of the Galaxy — Source Review Closure

- **1/1** Phase1 source entries verified in the primary scanned PDF.
- Source PDF SHA-256: `63e62aa5acca70469b22a957c4e72a0a099d57fa99f7023a915ed5f584d1d62f`.
- Phase1 provenance Git blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; preserved without rewrite.
- Initial GitHub branch HEAD: `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- **1** attack-group rows inventoried, **3** discovery-only cases, **0** printed conflicts.
- No strict field/mount certification, no changes to production compendia.
- Page indexing: PDF zero-based page index is printed page number; physical ordinal is printed page +1.
- The source text transcriptions are navigation aids. Rendered printed pages are authoritative when text extraction disagrees.

## Publication-specific source review

| Source key | Ship | Page | CL | Attack rows | Source | Mount cert |
|---|---|---:|---:|---:|---|---|
| `tog-cec-vcx-350-light-freighter` | CEC VCX-350 Light Freighter | 89 | 10 | 1 | PDF reviewed | NOT CERTIFIED |

## Source-specific mechanics and variation

### CEC VCX-350 Light Freighter (p. 89)

- Laser cannons may be controlled by pilot or gunner; preserve selectable station in production data.
- Hyperdrive x1 with x11 backup exactly as printed; do not silently change to common x10.

## Unresolved printed discrepancies

No printed-source conflicts identified in the reviewed entries; this does not certify field concordance.

## Outstanding work

- Strict field-by-field reconciliation against production ship records (not performed).
- Physical mount/arc/battery proof, weapon station mapping, and relevant runtime regressions (not performed).
- Historical Phase1 identity reconciliation candidates (Hornet and Deep-X) are separately inventoried in earlier reports; do not silently add to the fixed 316 census.
- The printed Lambda editorial note is genuinely present in the PDF. Do not use it as proof of hyperdrive configuration until resolved.
- Sourcebook-local mechanics require implementation/schema review prior to changing runtime.

## Source SHA and reproducibility

- PDF sha256: `63e62aa5acca70469b22a957c4e72a0a099d57fa99f7023a915ed5f584d1d62f`
- Local source PDFs are excluded from Git history. The checker accepts `--pdf-dir` to fingerprint attached originals.
- `tools/audits/vehicles/check_vehicle_phase2b_final17.py` validates counts/roster and checkpoint continuity.

