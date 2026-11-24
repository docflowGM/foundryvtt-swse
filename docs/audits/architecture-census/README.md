# SWSE V2 Architectural Consolidation and Simplification Program — Audit Index

Audit-only program. **No production code, schema, gameplay data, pack, test, or existing document is modified by Phases 0–2.**

| Phase | Purpose | Human-readable | Machine-readable |
|---|---|---|---|
| 0 — Repository census | What exists, who owns it, what reaches it | [phase-0-census-report.md](phase-0-census-report.md) | `data/audits/architecture-census/*.json` |
| 1 — Ownership contracts | One documented owner per mechanical responsibility | [`docs/architecture/v2-contracts/`](../../architecture/v2-contracts/README.md) | `data/audits/architecture-census/contracts/*.json` |
| 2 — Reconciliation and simplification | Where code violates ownership; what can be removed or merged | [phase-2-reconciliation-report.md](phase-2-reconciliation-report.md) | `data/audits/architecture-census/findings/*.json` |

## Audited snapshot

- Repository: `docflowGM/foundryvtt-swse`
- Audited commit: `f734b4d33f0e7603856b262f06dd705cc02ab5b8` (`main`, 2026-11-24)
- Branch: `audit/v2-systemwide-architecture-census`
- PR [docflowGM/foundryvtt-swse#1184](https://github.com/docflowGM/foundryvtt-swse/pull/1184) (docs cleanup, six deletions) was **open and unmerged** at audit time and is not included in this snapshot.

## Regenerating and checking the census

```bash
node tools/architecture-census/build-census.mjs
```

```bash
node tools/architecture-census/build-census.mjs --check
```

The generator reads `git ls-files` at `HEAD` and writes only to `data/audits/architecture-census/`. It needs `acorn` and `acorn-walk`; it looks in the repository, then `/opt/node-tools`, then `$NODE_TOOLS`. The census excludes its own outputs (`tools/architecture-census/`, `data/audits/architecture-census/`, `docs/audits/architecture-census/`, `docs/architecture/v2-contracts/`) so the snapshot is identical before and after they are committed.

## Verification vocabulary

Every claim in this program carries one of these levels:

| Level | Meaning |
|---|---|
| `source-inspected` | A person (or this audit) read the code. |
| `dependency-traced` | Imports, exports and consumers were resolved from an AST. |
| `behavior-code-verified` | The specific behavior was confirmed by reading the code path end to end. |
| `test-verified` | An existing test asserts the behavior (named). |
| `live-foundry-verified` | Observed in a running Foundry V13 world. **No claim in Phases 0–2 has this level.** |
| `inferred` | Derived from naming, location or partial evidence. |
| `unverified` | Not enough evidence. |

Contract status labels (Phase 1): `OBSERVED`, `APPROVED`, `PROPOSED`, `CONFLICT`, `UNVERIFIED`, `UNIMPLEMENTED`, `DEFERRED_RULES_REVIEW`, `FOUNDRY_ACCEPTANCE_REQUIRED`. Nothing proposed here is approved until the project owner says so.
