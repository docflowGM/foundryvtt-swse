# Audit docs recovery — provenance (issue #1166 Phase 2)

Docs from four open draft PRs, recovered **byte-identical** (all absent from `main`; none contained runtime code). The PRs are not merged; their branches are untouched. These are source-examination and decision-record documents; their conclusions have not been re-verified against current `main`, and any rules interpretation they contain remains subject to the project owner's rulings.

| PR | Source branch | Source SHA | Files |
| --- | --- | --- | --- |
| #1047 | `audit/master-questions` | `5438a9f3df19066e7ff36b01967ca18553b291f3` | swse-v2-master-questions-and-decisions.md, swse-v2-owner-decisions-2026-10-15.md |
| #1049 | `audit/swse-errata-primary-source-followup` | `051a8760db4f1fa8c8ce181183a4a171407fd11c` | d-008-tech-specialist-device-slot-source-examination.md, modification-phase-1a-armor-capacity-reconciliation-plan.md, swse-errata-source-followup-2026-10-15.md |
| #1050 | `audit/modification-q033-atomicity-design` | `c46bf6c8775c63ab5ab5427dd549ecf2533acfc2` | modification-v2-q033-atomicity-failure-injection-design.md |
| #1053 | `audit/modification-d005-universal-host-source` | `202ea421f61f79245f6f4325a915111309087ab5` | d-005-universal-upgrade-host-source-examination.md |
