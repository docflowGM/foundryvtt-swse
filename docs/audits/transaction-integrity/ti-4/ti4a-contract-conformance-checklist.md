# TI4-A — Mechanical Transaction Contract v1: Normative Conformance Checklist

**Status:** normative checklist for **future implementation checkpoints to execute or audit**. It does not change any domain implementation, and nothing in it is itself an enforcement mechanism. The contract text is `ti4-contract-v1-proposal.md` (accepted at PR #1062 `d7b9d84e0d24146b96bce80c96ce266ed2f9c1b2`), with owner decisions OD-1…OD-5 and Q2 recorded `OWNER_APPROVED` in `ti4-decision-register.md`.

**Keywords:** MUST / MUST NOT / SHOULD as in RFC 2119. **Evidence levels** a check can reach: `STATIC` (analyzer/grep, repository-wide), `OFFLINE` (deterministic offline test), `RUNTIME` (Foundry v13), `MULTI` (≥2 clients), `REVIEW` (human audit of a document or diff).

**How to use.** For each domain touched by a checkpoint, copy the rows that apply (column *Applies*), record `PASS` / `FAIL` / `N/A` (with reason) and the evidence (file, test, run). A claim of "L1 conformant" requires every applicable `OFFLINE`/`STATIC`/`REVIEW` row to pass; `RUNTIME`/`MULTI` rows left `NOT_RUN` cap the claim at L1; no domain may claim L2/L3 without the rows in §H.

Applies codes: **A** every authoritative mechanical transaction (AMT), **C** commerce, **E** equipment, **F** Force Points, **P** progression, **W** followers, **G** GM approvals, **M** future modification executor.

## 1. Scope and architecture (contract §1–§2, §6)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| A1 | The operation is performed by the domain's **existing authority** (contract §6 table); no new universal transaction engine or orchestrator is introduced | review the diff: no new class that wraps multiple domains' mutations | REVIEW | A |
| A2 | No new authoritative resource ledger; receipts are the domain's own record (OD-3) | review: any new persisted record is a receipt of that domain's operations, not a balance/inventory store | REVIEW | A |
| A3 | A single-document resource write (credits, FP value/pool, ammo, action economy, equipment state) is treated as an AMT, not "low risk" | analyzer lists it (`node tools/ti4-authority-inventory.mjs`); each recognized direct writer is dispositioned | STATIC | A |
| A4 | Read-only operations carry no transaction machinery | review | REVIEW | A |
| A5 | No change to published mechanics; any rules question goes to the rules register | review; `docs/audits/swse-rules-decisions-pending.md` | REVIEW | A |

## 2. Outcomes (contract §4; OD-2)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| O1 | Every operation result maps to exactly one of `REFUSED`, `COMMITTED`, `FAILED_COMPENSATED`, `INDETERMINATE` | table of the domain's result shapes → states, reviewed | REVIEW | A |
| O2 | `REFUSED` is returned only when **no** mechanical write was made | fault-injection: refuse at each pre-write gate, assert unchanged state | OFFLINE | A |
| O3 | `COMMITTED` is returned only after the committed state was **verified** at the declared level | test: write returns without throwing but the value differs ⇒ not `COMMITTED` | OFFLINE | A |
| O4 | A thrown write after which the observed state changed is `INDETERMINATE`, never success and never a clean failure | test: write-then-throw | OFFLINE | A |
| O5 | `FAILED_COMPENSATED` requires **verified restoration of the entire affected mechanical scope** (credits, Items, ownership, markers, resources); partial restoration is `INDETERMINATE (compensation:'PARTIAL')` | test: refund succeeds, Item left changed ⇒ `INDETERMINATE` | OFFLINE | A |
| O6 | A failed or inexact compensation is `INDETERMINATE` and **blocks** automatic mutation of its scope | test: second attempt on the scope is refused with the evidence | OFFLINE | A |
| O7 | No path retries an `INDETERMINATE` transaction automatically | static + test: no retry loop reachable from a handler; a second call with the same id is `REFUSED('unresolved')` | OFFLINE | A |
| O8 | Existing vocabulary maps per contract §4.2 (`rollbackFailed` → `INDETERMINATE` + qualifier; `presentationError` → `postCommit.warnings`) | review | REVIEW | A |

## 3. Post-commit (contract §4.3)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| P1 | Presentation/bookkeeping failures (hooks, chat, notification, log, repaint, history mirror, queue cleanup) never change the outcome and are isolated from the mechanical failure handler | test: throw in each after commit ⇒ outcome stays `COMMITTED`, warning recorded, nothing refunded/replayed (pattern: TI-3 §3.9) | OFFLINE | A |
| P2 | A mechanically required post-apply step that fails leaves `COMMITTED` with a **machine-readable `postApplyIncomplete` entry** `{kind, scope, reason, repair}` | test: failing post-apply step ⇒ entry present, primary not rolled back | OFFLINE | P, A |
| P3 | `repair` names an **idempotent** repair operation (own id/receipt; repeatable; never replays the primary) | test: run repair twice ⇒ same state; primary effects not re-applied | OFFLINE | P, A |
| P4 | A domain with a mechanically required post-apply step but no repair path is non-conformant | review | REVIEW | A |

## 4. Identity and replay (contract §5; Q3; OD-3)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| R1 | `operationId` is minted once per user intent, before any call, and reused across retries of that intent | review the call site; test: double invocation of the handler yields one operation | OFFLINE | A |
| R2 | The authority recomputes the intent fingerprint from the validated payload (never accepts a client-supplied one) | review + test | OFFLINE | A |
| R3 | same id + same fingerprint + recorded `COMMITTED` ⇒ recorded receipt returned, **no write** | test | OFFLINE | A |
| R4 | same id + different fingerprint ⇒ `REFUSED('request-id-conflict')`, state unchanged | test | OFFLINE | A |
| R5 | same id + unresolved/`INDETERMINATE` ⇒ `REFUSED('unresolved')` with evidence | test | OFFLINE | A |
| R6 | different ids with an identical payload execute as separate operations | test | OFFLINE | A |
| R7 | A receipt is accepted as replay evidence only after its store passed receipt-storage certification (`ti4a-receipt-storage-certification-spec.md` R/L/T/U/A/P series) | certification table attached | REVIEW | A |
| R8 | The operation id is never used as an authorization token | review | REVIEW | A |

## 5. Compensation and recovery prerequisite (contract §7; OD-1)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| K1 | **High-risk / multi-resource / unsafe-to-repeat** operations establish adequate, retrievable recovery **before the first authoritative write** or return `REFUSED('recovery-unavailable')` | fault-injection: snapshot import/write/retrieve/second-actor failure ⇒ no gameplay write (Q-033 T01–T04) | OFFLINE | A except K2 |
| K2 | The simple-GM-credit-adjustment exception applies **only** to contexts accepted by the reviewed DI-2 matrix, and only when verification, replay guard, GM authority and `INDETERMINATE` reporting are all present. **Until DI-2 is accepted, no operation qualifies.** | review: the context is on the accepted list; tests for each prerequisite | REVIEW + OFFLINE | C |
| K3 | The restore verdict is exactly "`success` and `exact`" (`restoreSnapshot` true or `restoreSnapshotExact({requireExact:true})`), plus an independent post-restore check of the resource; a truthy return/non-throw is **not** a verdict | test: restore returns `{success:false}` / `{success:true,exact:false}` / throws ⇒ `INDETERMINATE` | OFFLINE | A |
| K4 | Compensation is field-scoped and conditional where possible; a whole-actor restore is a documented last resort that states what it reverts | review | REVIEW | A |
| K5 | Resource compensation uses a relative/conditional write; an absolute restore is `INTENTIONAL_LIMITATION`-labelled and single-flight | review | REVIEW | A |
| K6 | The cost/amount input is validated explicitly; `undefined`, `NaN`, non-numeric, `Infinity` are refused, never coerced to 0 (Q-033-H7) | test: each invalid cost ⇒ `REFUSED('invalid-cost')`, no write | OFFLINE | C, M |

## 6. Concurrency (contract §8)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| C1 | One guard key per resource family (wallet, asset, weapon, FP pool), shared by **every** method that mutates it | test: two different methods on one wallet interleave ⇒ serialized or one refused | OFFLINE (L1) | C, E, F |
| C2 | No check-then-act across an `await` without re-reading under the guard | review + interleaving test | OFFLINE | A |
| C3 | Absolute writes of a resource are single-flight and re-read immediately before the write; the level is declared | review | REVIEW | A |
| C4 | Simulated same-process interleaving is **never** reported as L2 | review of the claim wording | REVIEW | A |

## 7. Boundary and enforcement tooling (contract §9; TI4-A)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| E1 | The analyzer produces a well-formed, deterministic artifact for the checkpoint's source head | `node tools/ti4-authority-inventory.mjs --root <dir> --source-ref <sha> --out-json f && node tools/ti4-authority-inventory.mjs --check-artifact f` ⇒ exit 0; two runs byte-identical | STATIC | A |
| E2 | No new `UNCLASSIFIED` direct writer appears relative to the recorded baseline without a disposition | diff `unclassifiedWriters` against `baseline/*.json` for the matching lineage | STATIC | A |
| E3 | Newly introduced writers of a protected family are routed through the family's authority, or recorded as a documented exception with a reason | review of the diff + E2 | REVIEW | A |
| E4 | The analyzer remains **report-only** (no blocking exit code for a reported writer) until an independently authorized ratchet checkpoint | `tests/ti4a-authority-inventory.test.mjs` | OFFLINE | tooling |
| E5 | No runtime interception, prototype patching, or revival of dormant Sentinel enforcement | review | REVIEW | A |
| E6 | The limitations (`ti4a-static-analysis-coverage-and-limitations.md`) are cited whenever "no other writer exists" would be claimed — it must not be | review | REVIEW | A |

## 8. Equipment / action economy (X1)

| ID | Requirement | Check | Evid. | Applies |
|---|---|---|---|---|
| X1-1 | Every `ActionEconomyConsumption.spend` result shape maps to one class S1–S4/refusal | table review; unrecognized shape ⇒ `INDETERMINATE` | OFFLINE | E |
| X1-2 | S1 is accepted only with a readable receipt marker | test | OFFLINE | E |
| X1-3 | S2 reasons are the closed set `free`/`passive`/`out-of-combat` | test | OFFLINE | E |
| X1-4 | S3 members carry distinct machine-readable reasons; readiness finalizes only for S1/S2 until the owner decides `over-spend-permitted` | test + owner decision OD-X1-a | OFFLINE | E |

## 9. Q-033 / future modification executor (section Q)

| ID | Requirement | Source | Check | Evid. |
|---|---|---|---|---|
| Q1 | Recovery established for **all** affected actors before any gameplay/economy write, or `REFUSED('recovery-unavailable')` | Q-033 §2.5, T01–T04 | fault injection | OFFLINE |
| Q2 | One lock over all affected actor/item identities **across transaction contexts** | Q-033 §2.4, T14, T15 | interleaving test | OFFLINE (L1); MULTI for L2 |
| Q3 | Post-write re-read verifies credits, instance identity, slot result and projected effects; a resolved promise is not success | Q-033 §2.8, T19 | test | OFFLINE |
| Q4 | Exact restoration verified; `RECOVERY_INCOMPLETE` ⇒ `INDETERMINATE`, diagnostics preserved, scope quarantined, no automatic retry | Q-033 §2.9–2.10, T09–T13 | test | OFFLINE |
| Q5 | No success hook/record before commit verification | Q-033 §2.11 | test | OFFLINE |
| Q6 | Cost is source-certified finite non-negative (or GM-adjudicated), never defaulted to 0 | Q-033 H7, T06 | test | OFFLINE |
| Q7 | Idempotency by operation id | Q-033 T16 | test | OFFLINE |
| Q8 | Host evidence (D-005) is presented and certified before any install commit | D-005 | review | REVIEW |
| Q9 | T01–T20 run in Foundry v13 on expendable test actors | Q-033 Q033-D | runtime | RUNTIME |

The modification executor is **not** to be activated until every Q row passes and §10's gating rows are satisfied (see `ti4a-q033-outcome-and-containment-compatibility-spec.md` §4).

## 10. Level claims (contract §8; `ti4-cross-domain-test-plan.md` §6)

| ID | Claim | Required evidence | Evid. |
|---|---|---|---|
| H1 | **L1** for a domain | rows O1–O8, P1–P4, R1–R8 (or `N/A` with reason), K1–K6, C1–C4, E1–E6 pass at `OFFLINE`/`STATIC`/`REVIEW`; fail-before proof for each new test | OFFLINE |
| H2 | **L2** for a domain | a verified coordination mechanism **and** two-client Foundry tests (e.g. two GMs approving one asset) passing; documented failover | MULTI |
| H3 | **L3** for a domain | receipt store certified (all applicable R/L/T/U/A/P rows incl. `RUNTIME`) **and** a deterministic reconcile operation exercised in Foundry after an injected crash | RUNTIME |

**No domain currently meets H2 or H3.** Domain-level status is in `ti4-transaction-compliance-matrix.md`.

## 11. Audit procedure (per checkpoint)

1. Record the exact source head(s) audited (`git rev-parse HEAD` of each tree).
2. Run E1; attach the artifact and its `--check-artifact` result.
3. Run E2; list any new `UNCLASSIFIED` direct writer and its proposed disposition.
4. Fill the applicable rows above; every `FAIL` or `NOT_RUN` is stated, not omitted.
5. State the **maximum claimable level** per domain and the evidence for it; never state a higher one.
6. Confirm: no production mechanic changed outside the checkpoint's authorized scope; no D-005 activation; no merge.
