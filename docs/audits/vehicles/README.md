# SWSE Vehicle Audit — Phase 0–1 local checkpoint

This directory preserves the **pre-implementation, sourcebook-based** vehicle/starship audit artifacts generated on 2026-10-14.

- `data/audits/vehicles/`: rolling census (316 ship publication claims across 14 books), Phase 1 publication/page provenance (316 entries), Phase 0-B draft v0.5 universal vehicle and vehicle-weapon JSON Schemas, validation fixtures, reports, and global-rule modeling.
- `docs/audits/vehicles/`: human-readable census, complete provenance inventory, schema design decisions, and dry-run/stress-test reports.
- `tools/audits/vehicles/`: historical provenance builders and draft certification gate.

**Status / caveats**
- Sourcebook-based *ship entries* only, **not** unique ship identities; reprints and printed variants remain separate.
- Ground vehicles, airspeeders, walkers, installations and droid-vehicles are **not exhaustively enumerated** here.
- Phase 0-B schemas are **draft v0.5**, not final mechanical authority. Test fixtures are not full source certifications.
- The old production compendium/statblocks are **not** canonical sources for these files.
- The historical builder scripts were made during the audit and may contain environment-specific paths; do not run them in production without inspection.
- No Foundry runtime or production pack migration is performed by this commit.

Source text/PDF books are not checked into this directory. Keep source publications outside the repository.

## Current Phase 2C continuation

- The historical 316-source-claim census above remains frozen; Phase 2C D01's append-only overlay brings the reviewed **publication-claim scope to 318**. The Phase 2C CP6 live gate enforces strict stock attack evidence without claiming that all 318 ships are operationally certified.
- Future modification architecture/dependencies: [Phase 2C vehicle and droid modification dependency contract](swse-phase2c-future-vehicle-droid-modification-dependencies.md). **Design note only**; continue current Phase 2C stock binding and combat certification, not customization implementation.
