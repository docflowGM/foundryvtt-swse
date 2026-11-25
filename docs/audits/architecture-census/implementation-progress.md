# Implementation progress ledger — V2 architectural realignment (Phases 3A–3P)

**Resume here.** Read this file, then `data/audits/architecture-census/implementation/tracker.json` (authoritative per-finding status; `node tools/architecture-census/tracker.mjs summary`). Never re-run a subphase marked `done`; never mark `done` without the evidence listed.

- Implementation branch: `refactor/v2-architectural-realignment` (stacked on `audit/v2-systemwide-architecture-census`, PR [#1185](https://github.com/docflowGM/foundryvtt-swse/pull/1185); neither is merged).
- Immutable baseline: audited commit `f734b4d33f0e7603856b262f06dd705cc02ab5b8` (census outputs under `data/audits/architecture-census/`; regenerate only with the pinned baseline mode).
- Current-code comparison: `node tools/architecture-census/check-architecture.mjs` (ratchet) / `build-census.mjs --current --out <dir>`.
- Decisions: `docs/architecture/v2-contracts/DECISIONS.md`. Acceptance procedures: `docs/architecture/v2-contracts/ACCEPTANCE.md`.
- Foundry V13 is not available in the implementation environment: nothing here is `FOUNDRY_TESTED`.

## Corrections to audit figures
- E-1: A-02 direct writes are 295 in reachable modules (97 files), not 331 (331 includes 36 sites in unreachable modules). See Phase 2 report errata.

## Subphase status

| Subphase | State | Evidence / notes |
|---|---|---|
| 3A.1 audit integration | done | #1185 and #1184 unmerged; `main` unchanged at `f734b4d`; implementation stacked on the audit branch |
| 3A.2 tracker | done | `implementation/tracker.json` (274 findings, validator `tracker.mjs check`) |
| 3A.3 authority reconciliation | done | `DECISIONS.md` AD-001…AD-010; `docs/governance/owner-standing-instructions.md` |
| 3A.4 regression guards | done (CI run pending) | `check-architecture.mjs`, `ratchet-baseline.json`, CI step added |
| 3A.5 acceptance framework | done | `ACCEPTANCE.md` |
| 3B Force Point integrity | core done; 6 non-integrity findings still open | F-TAL-007, F-FRC-003 `OFFLINE_TESTED` (commit 15ea0c7cc, `tests/force-point-bonus-pool-single-authority.test.mjs`); F-FRC-002, F-INF-005, F-PAT-005 `OWNER_DECISION_REQUIRED`; F-FRC-001 verified. Open (planned 3B, not integrity): F-FRC-004, -006, -007, -008, -011, -012 |
| 3C Transaction integrity | not started | |
| 3D–3P | not started | |

## Next executable subphase
3C.1 — store purchase rollback (F-STO-001): reproduce with a failing test, then fix. (Remaining 3B-tagged findings F-FRC-004/-006/-007/-008/-011/-012 are structural/cleanup and continue after the correctness phases.)

## Measured effect so far (ratchet, current code vs baseline)
- Direct document writes (runtime, all): 357 -> 356; exact runtime function-clone groups: 33 -> 31; no new violations in any probe; no new cycles.
- Rolling test suite: 795 passed, 0 failed (794 baseline + 1 new).
