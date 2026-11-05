# Deterministic Failure-Injection Test Inventory (TI-0)

Tests are written **per correction package** (fail-before, pass-after) and added to the CI-run suite (`tests/*.test.mjs`) only when they pass. TI-0 adds none to CI; its reproductions live in `repro/` (non-CI evidence). **Harness rule (TI-N1):** offline tests run against a *fake* `ActorEngine`; any test whose subject is `spendForcePoints`, `gainForcePoints`, `applyMutationPlan`, `updateEmbeddedDocuments` or snapshot restore must use the real methods via the file-URL graft in `repro/_boot.mjs` (promote that helper to `tests/helpers/` in TI-1).

## A. Cross-cutting scenario matrix (every package must cover the rows that apply)
| # | Scenario | Injection | Pass condition |
|---|---|---|---|
| A1 | Failed write | authority throws / resolves with no changed document | outcome `failed`; no success claimed; nothing spent |
| A2 | Duplicate request | same operation id + same intent twice (sequential and concurrent in one client) | second call is a recognized duplicate; no second spend/grant |
| A3 | Same id, different intent | id reused with a different digest | explicit conflict; nothing written |
| A4 | Retry after uncertain completion | apply succeeds, post-step throws; caller retries | no duplicate payment/benefit; state reconciles or is `indeterminate` |
| A5 | Two independent operations on one resource | interleave two spends/credits | both recorded; neither overwrites the other |
| A6 | Refund after an intervening operation | A, then B, then refund A | A's resource returns; B untouched; or explicit `superseded` with nothing changed |
| A7 | Repeated refund | rollback twice | second does nothing |
| A8 | Failed compensation | compensation write throws / returns false | outcome `partial`/`failed`; never "rolled back"; player/GM told |
| A9 | Resource changes between validation and commitment | mutate the resource in the awaited gap | stale/refused, or exact delta applied preserving the change |
| A10 | Mutation authority unavailable | module import fails / returns no-op | fail closed or `indeterminate`; never finalize as paid |
| A11 | Concurrent unrelated change during compensation | change a sibling field mid-compensation | sibling field preserved |
| A12 | Interrupted execution | stop after each step boundary | recoverable or `indeterminate`; replay safe |

## B. Package-specific tests
### TI-1 (resources)
| Finding | Test | Status |
|---|---|---|
| TX-03 | `repro-tx03` converted: A,B,rollback(A) → B intact, status `superseded`; strict boolean; idempotent; failed-undo and claimed-undo-without-removal → `failed` | **exists on `961f4bc`** (`equipment-e4c1-wp5-c3-trust-boundaries`); port the `main`-baseline form after C3 is accepted |
| TX-04a | coordinator: refund write fails → `rolledBack:false` and a failure reason; success only when verified | write (real engine graft) |
| TX-04b | coordinator: bonus point refunded as bonus by entry id; normal point as relative gain; concurrent grant preserved; at-maximum case | write (real engine graft; reuse `R:c3-fp` scenarios) |
| TX-04 | FP transaction vs real engine (4 scenarios) | **`R:c3-fp` passes**; promote to a CI test in TI-1 |
| TX-05 | two actors, same request id → no conflict; same actor, same id, different intent → conflict | write |
| TX-06 | in combat with the authority returning each no-op reason: `out-of-combat`/`free`/`passive` finalize `not-required`; `economy-modules-unavailable`/`missing-actor`/unknown → `INDETERMINATE`, readiness withheld, no replay | write |
| A9/A10 | Required-action coordinator: authority unavailable mid-transaction | write |

### TI-2 (commerce, upgrades, inventory)
| Finding | Test | Status |
|---|---|---|
| TX-01 | `UpgradeService`: injected credit failure ⇒ neither Item nor credits changed; success ⇒ both; retry after failure does not double-install | `R:tx01` is the fail-before; write the CI form |
| TX-08a | snapshot creation fails ⇒ no mutation, explicit refusal (pending owner decision, §8 of the contract) | write |
| TX-08b | `restoreSnapshot` returns false ⇒ result carries `rollbackFailed`, no "success" log | write |
| TX-08c | concurrent credit change between read and write ⇒ detected/refused, or exact delta preserved | write (guarantee stated precisely) |
| TI-N3 | each direct credit writer classified; commerce ones routed through the authority | classification test + routed tests |
| executeCreditAdjustment | same defects as TX-08a/b | write |

### TI-3 (progression, followers, approvals)
| Finding | Test | Status |
|---|---|---|
| TX-09 sub-gap | `_syncPostApplyState` throws after a successful plan ⇒ result is not reported as a plain failure that invites double application | reproduce first |
| TX-11 | step returning `{ok:false}` ⇒ failure + compensation; rollback returning `false` ⇒ `rollbackFailed`; ally assign/unassign surface it | `R:tx11` fail-before |
| TX-10 | approval addressed by stable id; second approval of the same id refused | write; two-client behavior is Foundry-runtime only |
| TX-07 | static guard: no "atomic" wording on non-transactional paths | TI-4 |

### TI-4 (contract and guards)
Per-domain property tests for the §3 checklist; static guards: commerce spend only via the commerce authority; no `undoLast` outside the action-economy authority; no new whole-actor restore; no new `transactional:true` caller without a documented guarantee.

## C. Foundry-runtime-only scenarios (cannot be established offline)
Two-client concurrent approval (TX-10); concurrent credit writes (TX-08c); `setFlag` last-write-wins on turn state (TX-13); real `restoreFromSnapshot` fidelity (TX-07b); `economy-modules-unavailable` in a live combat (TX-06); document-update result semantics on real embedded documents (WP5-C3 assumption).
