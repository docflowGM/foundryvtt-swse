# Species source-audit recovery — provenance (issue #1166 Phase 2, tranche A)

These 13 files were recovered **unchanged (byte-identical)** from `origin/audit/species-book-by-book-canonical` at source SHA `9587384083aa9f3af8300e16a2d0b6bea2ca3891` (44 commits, last 2026-10-13). They were absent from `main`.

## What they are
Read-only, paraphrased source-reconciliation evidence: per-book species census, the 39-identity provenance reconciliation, the Clone Wars official-vs-fan recheck, and the phase-0 health census.

## What they are not
- They do **not** change any production species record, `packs/species.db`, or `SpeciesRegistry`. No species mechanic is implemented or certified by this recovery.
- Their findings (e.g. the "17 marked for removal" status and the 97 CHANGE_REQUIRED / 204 REVIEW_REQUIRED counts) are a **2026-10-13 snapshot**; they have not been re-validated against current `main` species data. `packs/species.db` still holds 161 records (matches the audit's stated production count). Treat every finding as `SOURCE_VERIFIED`-pending, not `DATA_RECONCILED`, until re-checked against the printed source and the current registry.
- Where the audit lists conflicting sources (e.g. Geonosian, Conversion Guide vs. pack), that conflict remains an open rules question for the project owner; nothing here resolves it.

## Files
`data/audits/species-{39-provenance-reconciliation,book-by-book-rolling,final-provenance-census,health-phase-0-census}.json` and `docs/audits/species-{39-provenance-reconciliation,audit-overall-roadmap,book-by-book-rolling,clone-wars-canonical-vs-fan-recheck,final-health-report,health-phase-0,phase-0-removal-markers,phase-1a-core-provenance,starships-of-the-galaxy-source-scope}.md`.
