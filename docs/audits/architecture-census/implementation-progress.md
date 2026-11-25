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
| 3C Transaction integrity | correctness fixes done; remaining items await owner decisions | F-STO-001 `OFFLINE_TESTED` (store rollback removes created actors; `tests/store-purchase-created-actor-rollback.test.mjs`); F-STO-004 `PARTIALLY_COMPLETE_BLOCKED` (GRANT_CREDITS idempotent; `tests/progression-credit-grant-idempotency.test.mjs`; TE-routing is a decision). `OWNER_DECISION_REQUIRED`: F-HOL-002, F-VEH-006, F-FRC-005, F-STO-003, F-UIS-001, F-STO-005, F-ABL-002. Open: F-PRG-003 (chargen credit staging, belongs with 3G), F-STO-002, F-STO-006/-008/-009 |
| 3D–3P | not started | |

## Owner decisions currently blocking work (all in the tracker as `requiredDecision`)
`node -e` helper: `node tools/architecture-census/tracker.mjs summary`; the full text of each question is in `tracker.json` under the finding.
1. AD-008: canonical flag namespace + one-time migration approval (F-INF-005, F-PAT-005).
2. F-FRC-002: Force Point maximum formula / `dailyForcePoints` house rule (rules-sensitive).
3. Credit authority exceptions: Party Fund (F-VEH-006), Force Alchemy (F-FRC-005, F-STO-003), sheet credit edits (F-UIS-001, F-STO-005), Lineage awards (F-STO-004, F-ABL-002).
4. F-HOL-002: Holonet trade/payout settlement approach (needs live Foundry acceptance either way).
5. F-CMB-004: retire vs route the old Combat Action Browser.

## Next executable subphases (no owner decision needed)
- 3D.1/3D.2: reroute direct flag writes to `ActorEngine.updateActorFlags` / `unsetActorFlag`, grouped by owning subsystem (talents: 72 sites in 11 files first), each group its own test + ratchet lowering.
- 3E: damage-threshold discrepancy is a rules question; combat patch folding (F-CMB-007) is not.
- 3F.2: gate and consolidate the 36 feat metadata listeners (F-FEA-001).
- 3O (after reroutes): delete statically confirmed dead modules directory by directory with the deletion checklist (Part XVII).

## Measured effect so far (ratchet, current code vs baseline)
- Direct document writes (runtime, all): 357 -> 356; exact runtime function-clone groups: 33 -> 31; no new violations in any probe; no new cycles.
- Rolling test suite: 797 passed, 0 failed (794 baseline + 3 new: Force Point pool, store created-actor rollback, credit grant idempotency).
- Tracker: 3 findings OFFLINE_TESTED, 1 PARTIALLY_COMPLETE_BLOCKED, 2 IMPLEMENTED, 11 OWNER_DECISION_REQUIRED, 1 VERIFIED_NO_CHANGE_NEEDED, 256 OPEN.
- Nothing is FOUNDRY_TESTED.
