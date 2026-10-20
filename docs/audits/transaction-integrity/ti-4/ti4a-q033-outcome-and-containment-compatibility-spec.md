# TI4-A — X2/X3: Q-033 Outcome and Containment Compatibility Specification

**Status:** `DESIGN_PROPOSAL` specification. Q-033 (PR #1050, head `c46bf6c8775c63ab5ab5427dd549ecf2533acfc2`) is a **design**; it is not implemented and **no modification executor or D-005 activation is authorized or touched here**. The `TransactionEngine` evidence is lineage B `4e51a1565`; the equipment journal evidence is lineage A `abb81d919`. Q-033's own text was read from its branch (`git show`), not from a checkout of that PR.

## 1. Outcome mapping: Q-033 → Contract v1 (four states)

| Q-033 name / behavior | Contract state | Qualifier | Existing code name today |
|---|---|---|---|
| `PRECONDITION_SNAPSHOT_UNAVAILABLE` (T01–T04: snapshot import/write/retrieve/second-actor fails; no gameplay write) | `REFUSED` | `reason:'recovery-unavailable'` | TI-2: `refused:'recovery-unavailable'` (`executeMutationTransaction`, `executeAssetCustomizationTransaction`) |
| Invalid/absent cost (T06: `undefined`, `NaN`, `Infinity`, non-numeric) | `REFUSED` | `reason:'invalid-cost'` | **partial** — see §3 H7 |
| Insufficient funds / validation (T05) | `REFUSED` | `reason:'insufficient-funds'` etc. | exists |
| Failed write, exact restore verified (T07, T08) | `FAILED_COMPENSATED` | `compensation:'EXACT'` + whole-scope verification (contract §4.1) | `compensated` + `#restoreVerified` |
| `RECOVERY_INCOMPLETE` (T09 `{success:false,exact:false}`; T10 `{success:true,exact:false}`; T11 restore throws; T12 mismatch; T13 recreated under a new id) | `INDETERMINATE` | `compensation:'FAILED'\|'INEXACT'`, preserve diagnostics | `rollbackFailed` |
| Post-commit state mismatch after a resolved write (T19) | `FAILED_COMPENSATED` if exact recovery verified, else `INDETERMINATE` | | `indeterminate` in `executeMutationTransaction` (balance mismatch); **no equivalent for Item/instance state** |
| Repeated approved request / same transaction id (T16) | `COMMITTED` replay (recorded receipt) or `REFUSED(duplicate)` | per contract §5 | **none** on `TransactionEngine` (no operation id) |
| Concurrent install/purchase on the same wallet or Item (T14, T15) | `REFUSED(busy)` or serialized | | per-method process-local keys only (G28) |
| Forged approval / wrong actor / stale item (T17) | `REFUSED` | | partial |
| GM adjudication-only record, mechanics deferred (T18, T20) | `COMMITTED` of an **adjudication record**, never a mechanical commit | `mechanical:false` | n/a (no executor) |

Q-033's invariant ("a failure of exact restoration must surface an explicit inconsistent/manual-recovery-required outcome, never a fabricated success or clean failure") **equals** the contract's `INDETERMINATE` rule. No new state is needed.

## 2. Containment mapping

| Concept | Q-033 | Equipment journal (lineage A) | `TransactionEngine` (lineage B) | Contract v1 |
|---|---|---|---|---|
| Scope blocked after an unresolved result | "quarantine further mutation for that transaction/item until authorized intervention" (§2.10) | unresolved entries (`PREPARED/APPLIED/PARTIAL/INDETERMINATE`) block a new plan **on the same weapon** (`equipment-state-coordinator.js:238`) and withhold readiness (`equipment-state-reader.js:228`); never evicted (`equipment-transaction-journal.js:126-130`) | **none**: an `indeterminate`/`rollbackFailed` result is returned to the caller only; nothing persisted blocks a later purchase/customization on the same actor or asset | an `INDETERMINATE` operation **blocks automatic mutation of its scope** (contract §7 rule 5) |
| Where the block record lives | not specified | actor flag ring `flags.swse.equipmentTxn`, cap 20 | audit flag `flags.foundryvtt-swse.transactions.<id>` (erased by a successful whole-actor restore) | domain-owned, must survive the operation's own restore (OD-3, contract §5.7) |
| Who clears it | "authorized intervention" | nobody today (no reconcile op) | n/a | GM-only reconcile operation (OD-4 design; `ti4a-gm-reconciliation-design-and-negative-tests.md`) |
| Granularity | transaction **or** item | per weapon | n/a | per declared operation scope (wallet, asset, Item instance) |

**Equivalence statement.** The equipment journal's "withhold readiness for the weapon and refuse a new plan on it" **is** a quarantine for the equipment scope. It satisfies Q-033's containment requirement for that scope **only**. There is no equivalent for credit/Item/instance scopes.

## 3. Q-033 hazards H1–H9: status against the current heads

| ID | Q-033 hazard | Status on lineage B (`TransactionEngine`) | Evidence |
|---|---|---|---|
| H1 | snapshot failure ignored, mutation continues | **Closed** for `executeMutationTransaction` and `executeAssetCustomizationTransaction` (TI-2 `#establishRecovery`, refuse if unavailable). **Open** for `executeCreditAdjustment` (snapshot best effort `:620-632`), `executeAssetApprovalTransaction` (`:1321-1331`), `executeSaleTransaction` (`:1507-1518`), `executeRollbackCorrection` | Phase 0 P20–P26; scope of the OD-1 exception: DI-2 |
| H2 | restore result unchecked | **Closed in `TransactionEngine`**: every failure path goes through `#restoreVerified` (`:271-281,474,666,848-849,1133-1134,1383-1384,1554,1734`), which reports done only when `restoreSnapshot` returned true. **Open in `ActorEngine.applyMutationPlan(transactional:true)`** (G06) | read this checkpoint |
| H3 | use `restoreSnapshotExact(...,{requireExact:true})` and check `success`+`exact` | **Partly**: `#restoreVerified` calls `SnapshotManager.restoreSnapshot` (boolean = success **and** exact). The structured `{success, exact}` result is not surfaced for diagnostics | `:274` |
| H4 | multi-actor partial snapshot set | **Closed** for customization (both snapshots required, `refused:'recovery-unavailable'`); **open** for approval (`:1323-1324` best effort) | TI-2 |
| H5 | approval path continues without snapshot; unchecked restore | restore now checked (H2); snapshot still optional | see H1 |
| H6 | cross-context lock gap | **Open** (G28): six method-specific key shapes | `:349,570,982,1155,1444,1610` |
| H7 | `Number(cost) \|\| 0` coerces missing/invalid cost to 0 | **Open**: `executeMutationTransaction` still does `const normalizedCost = Number(cost) \|\| 0` (`:344`); the following finite/non-negative check cannot catch `undefined`/`NaN`/`''` because they are already 0. `executeAssetApprovalTransaction` uses `normalizeCredits(cost)` (`:1205`) — behavior not re-audited here | read this checkpoint (**not in the Phase 0 gap register; added as a TI4-A finding**) |
| H8 | snapshot creation is itself a write; verify retrievability | **Closed** for the two TI-2 methods (`#establishRecovery` verifies retrievable, v2, full-actor, `:249-264`) | |
| H9 | exactness facility reusable; no Foundry-v13 proof | **Unchanged** (`RUNTIME_UNVERIFIED`) | |

New finding recorded: **H7 is still open** and was not previously registered (Phase 0 §3.4 did not flag it). It is a transaction-integrity (reporting/validation) defect, not a rules question; a correction would be a bounded TI4-C0/C item and is **not** made here.

## 4. Gaps that must be closed before any modification executor can be activated

Ordered by dependency. None is implemented by TI4-A. D-005 stays unwired and Q-033 stays design-only.

| # | Required capability (Q-033 / contract) | Current state | Closure item |
|---|---|---|---|
| M1 | host evidence: a host-requirements commit input, `selectable` certification | D-005 evaluator exists offline, `selectable:false`, no `scripts/` importer (G41) | out of TI-4 scope; D-005 workstream |
| M2 | recovery established before the first write on **every** method the executor would use | open for 4 TE methods (H1) | OD-1/DI-2 (risk matrix); executor must use only strict paths |
| M3 | exact restore verdict surfaced and checked | closed in TE (H2); open in `ActorEngine.applyMutationPlan` (G06) | TI4-C0 (G06) |
| M4 | cost source-certified finite, never coerced | open (H7) | bounded correction candidate |
| M5 | one wallet/asset-scoped lock across transaction contexts | open (G28) | TI4-C |
| M6 | operation id + intent fingerprint + replay semantics | none (G17) | TI4-B (after Q3 design, `ti4a-operation-id-interface-proposal.md`) |
| M7 | post-write re-read verification of Item/instance/slot state | none (TE verifies balance only; `UpgradeService` `verify` checks the upgrade key) | executor-specific + contract §4 |
| M8 | quarantine mechanism for TE-governed scopes | none (§2) | DI-3 receipts + DI-4 reconcile + a scope-block record |
| M9 | receipts that survive the operation's own restore | none certified | DI-3 (`ti4a-receipt-storage-certification-spec.md`) |
| M10 | GM reconcile operation | none | DI-4 design → separate authorization |
| M11 | runtime fault injection T01–T20 in Foundry v13 on expendable actors | not run (`RUNTIME_UNVERIFIED`) | TI4-E / Q033-D |
| M12 | dormant `InstallRemoveEngine` defect (Item passed as `options`) corrected or deleted | defect present, dormant (G40) | before any reuse |

## 5. Compatibility conclusions

1. Contract v1's four states **cover** every Q-033 outcome without a fifth state; the names map one-to-one (§1).
2. The equipment journal already provides Q-033's containment **for equipment scope only** (§2); TE-governed credit/Item/instance scopes have no containment.
3. The four open TE methods and `ActorEngine.applyMutationPlan` are the reasons `TransactionEngine` is **not** yet a certified executor for Q-033 (§3, H1/H2/H6/H7).
4. Contract v1 and Q-033 do not conflict on any normative point; Q-033's stricter items (cross-context locking, post-write Item verification, quarantine) are **additional obligations** on the modification executor and are carried into the conformance checklist (`ti4a-contract-conformance-checklist.md`, section Q).
