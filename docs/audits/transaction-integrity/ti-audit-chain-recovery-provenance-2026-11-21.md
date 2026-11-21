# Transaction Integrity audit chain recovery — provenance (issue #1166 Phase 2)

Recovered **byte-identical, additive only** from three open draft PRs. Their PRs and branches are untouched.

| PR | Branch | Source SHA | Files recovered |
| --- | --- | --- | --- |
| #1058 | `audit/transaction-integrity-ti0` | `169060a38b38ce80e0403f1e523c0cceebe67b37` | 17 (TI-0 baseline, authority/call-path map, remediation ledger, contract proposal, failure-injection inventory, `repro/`) |
| #1062 | `audit/ti4-transaction-contract` | `d7b9d84e0d24146b96bce80c96ce266ed2f9c1b2` | 10 TI-4 Phase 0 design docs — an exact subset of #1063's files (identical blobs); recovered once, via #1063 |
| #1063 | `audit/ti4a-contract-guards` (stacked on #1062) | `3dc3ac22147faf5a001681f1b12b8c4b193b3d7d` | 36: the 10 TI-4 docs, baseline inventories, a **report-only** authority inventory tool + config, one test, fixtures |

## Status — read before relying on any of it
- **Historical snapshots.** They predate the certified TI2/TI3/TI4-C0…G21 merge already in `main` (#1071, `882643a9d`). Baseline inventories pin old lineage commits (TI-1 `abb81d9`, TI-3 `4e51a15`). Nothing here re-validates current V2 `TransactionEngine`/`ActorEngine` authority, and no statement in these documents supersedes the code or the decisions register.
- **No runtime change.** No file under `scripts/`, `packs/`, `data/` or `system.json` is touched. The inventory tool is report-only (the test asserts it has no runtime hook or enforcement surface).
- **Test:** `tests/ti4a-authority-inventory.test.mjs` passes 22/22 against current `main`. Run on the live tree, the tool reports 26 direct writers UNCLASSIFIED against the Phase 0 census; that is an observation for the TI reconciliation, not a violation.
- **Deliberately NOT recovered:** #1063's copy of `docs/audits/swse-rules-decisions-pending.md`. It is older than `main`'s and would delete ~600 lines of append-only register history. Its one genuine addition, `TI4-OD-5`, is handled separately for owner confirmation.
- Other open items from this lineage (#1057, #1059, #984) are not part of this tranche.
