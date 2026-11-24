# Force V2 — Seven-book source packages (schema v2.9)

This directory archives the **source-definition and offline-validation stage** of the SWSE Force V2 rebuild, up to and including **Book 7: Legacy Era Campaign Guide**.

These are **review and implementation-design inputs**, not live Foundry VTT data or executable runtime effects. No production code is changed by this archival commit.

## Package status

- **212 / 212** planned definitions in seven bookwise packages (Core 28; Starships 27; KOTOR 20; Force Unleashed 31; Clone Wars 19; Jedi Academy Training Manual 69; Legacy Era 18).
- Legacy Era adds **9 new Force Powers and 9 Force Techniques**. *Force Shield* is treated as a **Force Unleashed reprint**, not a second definition.
- Legacy Era includes **11 fixed-DC tier rows**, **16 cross-domain influence edges** and **166 acceptance scenarios**.
- Cumulative influence graph: **178 edges**.
- Definition schema v2.9: **159 typed mechanical operations**, including **14** added for this book and an explicit `on-attempt` lifecycle stage.
- Prior six books are included as **revalidated v2.9 definition and influence files**, not edited copies of production records.

## Files

- `SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.9.json` — shared typed definition schema.
- `SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.9.json` — shared influence graph schema.
- `SWSE_Force_V2_Legacy_Era_Book_7_*.json` — Legacy definitions, influence graph, acceptance cases, validation ledger.
- `REVALIDATED_*_Definitions_for_v2.9.json` — six previously completed definition packages.
- `REVALIDATED_*_Influences_for_v2.9.json` — six previously completed influence packages.
- `SWSE_Force_V2_Legacy_Era_Book_7_Editorial_Review_v0.1.md` — source/editorial findings.
- `SWSE_Force_V2_Rolling_Source_Audit.md` — rolling source coverage and follow-up audit work.
- `SHA256SUMS` — content verification for the **20 original extracted artifacts**.

Source ZIP: `SWSE_Force_V2_Legacy_Era_Book_7_Source_Package_v0.1(1).zip`

Source ZIP SHA-256: `e223af0325b9b31c3e935ca97f25c963411075635a66ce06d98d2cfe8e4962a8`

All 20 extracted source artifacts were uploaded as Git objects with **exact Git blob SHA matches** to the corresponding files in the supplied ZIP. Run `sha256sum -c SHA256SUMS` in this directory to verify the original source-file bytes.

## Certification boundary

**Structural / offline source validation is not Foundry runtime certification.** All Foundry acceptance scenarios remain unexecuted, and no production Force mechanics have been changed. Cross-book source exhaustiveness, interpretation conflicts and complex executable behavior contracts still require closure before implementation.

The validation ledger identifies blocking automation questions `LEG-001` and `LEG-002`, plus further review issues `LEG-003` through `LEG-010`. Preserve those uncertainties; do not invent mechanics or silently collapse distinct Force Point spending options.

Next stage: cross-book canonical completeness and implementation-semantics certification, before authorizing runtime integration.
