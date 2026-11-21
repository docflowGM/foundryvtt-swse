# Class Phase 6A/6B report recovery — provenance (issue #1166 Phase 2, tranche D)

Recovered **byte-identical** from `origin/audit/class-canonicalization-phase-6a` at source SHA `8673f5cae34a74da21e539e2bb5a45b62dbcf032` (4 commits, 2026-10-08):

- `docs/audits/class-phase-6a-read-only-census.md`
- `docs/audits/class-phase-6b-prestige-source-audit.md`

Their machine companions (`data/audits/class-phase-6a-structural-census.json`, `data/audits/class-phase-6b-prestige-source-ledger.json`) were already in `main` byte-identical and are not touched.

## Status
- Read-only source audits; no production class record is changed by this recovery.
- Findings (e.g. Jedi class skills, Noble BAB label, Scoundrel/Scout trained-skill counts, 10 prestige BAB label mismatches) are a **2026-10-08 snapshot** taken against `main@e0717af`. Later class work in `main` (Phase 6C/6D and Class Realignment IV waves) may already have corrected some of them; the reports have **not** been re-checked against current class data and must not be read as a statement of current defects.
- Any finding that depends on printed-source interpretation remains a project-owner rules decision.
