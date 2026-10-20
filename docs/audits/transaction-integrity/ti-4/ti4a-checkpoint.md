# TI4-A — Contract Certification and Report-Only Authority Guards — Checkpoint and Evidence Report

**Authorization:** TI4-A, bounded (owner/reviewer directive after TI-4 Phase 0 closure). **Scope:** documentation, a static, **report-only** analyzer, synthetic fixtures and offline tests. **No production mechanical file, compendium record, published rule, authority, or runtime behavior is changed.** D-005 stays dormant; Q-033 stays design-only. Evidence is `SOURCE_VERIFIED` (static analysis at named heads) and `TEST_VERIFIED_L1` (offline). **No L2/L3 or Foundry-runtime claim is made.**

## 1. Git state

| Item | Value |
|---|---|
| Branch | `audit/ti4a-contract-guards` |
| Base (accepted Phase 0 head) | `audit/ti4-transaction-contract` @ `d7b9d84e0d24146b96bce80c96ce266ed2f9c1b2` (PR #1062; **not modified**) |
| Draft PR | targets `audit/ti4-transaction-contract` so TI4-A is reviewed independently of #1062 |
| Commits | two: (1) TI4-A tooling, tests, baselines and specifications; (2) **separate, independently reversible** documentation-only OD-5 mirror in `docs/audits/swse-rules-decisions-pending.md`. SHAs and exact-head CI are recorded in the hand-off message (a document cannot contain its own commit id). |
| Remote heads verified at the start | `main` `4392c90dc`; #1056 `f4555227e`; #1058 `169060a38`; #1059 `abb81d919`; #1060 `903269083`; #1061 `4e51a1565`; #1062 `d7b9d84e0`; Q-033 design branch (#1050) `c46bf6c87` — all unchanged since Phase 0 |
| Production lineages | not merged, rebased, cherry-picked or combined. Lineage A and B were analyzed **in place** from their own clean worktrees at the heads above |

Exact source head used for each architectural claim is stated where the claim is made: lineage A `abb81d9191a1852709c96c8b89be65a7ba9a09b1` (equipment, Force Points, action economy, ammunition, coordinator); lineage B `4e51a15654adddae27da7e8a9ca1dda735771dd4` (`TransactionEngine`, approvals, followers, progression); `main` `4392c90dc324a0474e9ca470c514f4ec1a8fcc37` (the TI4-A branch's `scripts/` is byte-identical to `main`); Q-033 text from `c46bf6c87` read with `git show`.

## 1b. Independent review correction 1 (PR #1063 reviewed at `590a5b362`) — applied

| Item | Correction | Where |
|---|---|---|
| **R1** reconciliation causality | matching before/after values are observations; causal evidence classes defined (E-marker, E-receipt, E-version, E-value); without established causality the target stays `INDETERMINATE` and no completion, compensation or replay is allowed; roll-up table replaced; negative tests N19–N26 added (unrelated operation producing the same value; ABA with and without a marker; missing and untrusted receipts) | `ti4a-gm-reconciliation-design-and-negative-tests.md` §4, §7.2; erratum to the accepted Phase 0 `ti4-replay-and-recovery-design.md` §4 (not edited) |
| **R2** reconciliation concurrency | the claim that the reconcile id serializes was removed; L1 serialization is by a target-receipt-scoped guard that excludes any reconcile id; a different id cannot start a competing write against an unresolved target; the persisted claim is detection only; L2 requires verified cross-client authority; unsupported concurrency fails closed; tests N27–N35 incl. N29b (superseded in part by correction 2, §1c) | same file §3, §7.3; checklist D1–D8 |
| **R3** known-unobserved writers | machine-readable, self-verifying `knownUnobserved` inventory (KU-AE-1, KU-EQ-1/2/3, KU-FP-1) and per-family `coverage` in every artifact; `actionEconomy`, `equipmentState`, `forcePoints` are `KNOWN_GAPS`; no family is ever `inventoryComplete`; an overstated claim is a **malformed** artifact (CI-visible), a reported gap never is; baselines regenerated (record sets identical; only `coverage`/`knownUnobserved` added); 3 new tests | analyzer + config; coverage doc §2b; baseline doc §5b; checklist E7–E8 |
| **R4** OD-1 exception provenance | a caller-supplied `transactionContext` string is explicitly **not** sufficient; eligibility requires engine-verified GM authority and engine-derived operation provenance (dedicated entry point or engine-internal token); all P21 exceptions remain **inactive** until DI-2 is independently accepted and the provenance is defined and tested | risk matrix §3–§4; checklist K2 |

## 1c. Independent review correction 2 (PR #1063 reviewed at `aeaa473c9`) — applied (documentation only)

R3 and R4 were accepted. R1/R2 were improved; two final design clarifications were required:

| Item | Correction | Where |
|---|---|---|
| **R5** per-leg causal verification | causality is evaluated **separately for each mechanical leg**; every leg records intended before/after, trusted causal evidence bound to *that* leg, current observation, and `VERIFIED`/`UNVERIFIED`/`INCONSISTENT`; an acquisition marker proves only the acquisition leg, not the wallet debit; operation-level `COMMITTED` requires every required leg independently verified, otherwise `INDETERMINATE`/`INDETERMINATE (PARTIAL)`; matching expected values never substitute for missing causal evidence; negative tests N36–N43 (marker present/debit absent; marker present/credits equal after-value from an unrelated adjustment; multi-document with one operation-linked receipt; all legs verified; wrong-document evidence; inconsistent leg; verified not-applied; partial compensation scope) | DI-4 §4.2–§4.5, §7.2b |
| **R6** cross-client exclusivity | one active GM **user** no longer qualifies as one active execution context (two tabs are two contexts; process-local locks do not exclude either; a persisted read/write claim without compare-and-swap is detection, not mutual exclusion); the "exactly one GM ⇒ write permitted" fallback is **withdrawn**; without an independently verified exclusive writer reconciliation is **read-only diagnosis only** and write-capable reconciliation fails closed; a template of guarantees and runtime tests is given for any future exclusive-writer proposal; tests N30–N35 | DI-4 §3.4–§3.5, §7.3 |
| **OD-4b** | remains **unresolved**; GM attestation is an audit record only and is never a substitute for per-leg causal evidence or concurrency protection. Reviewer recommendation (not an owner approval): do not let an attestation alone unblock an unresolved transaction; a separately authorized administrative recovery procedure should record the disposition and any new corrective transaction without reclassifying the original as verified | DI-4 §4.5 |

Scope held: documentation only — no analyzer, baseline, receipt-persistence, runtime or production change. Validation for this round: the 22 analyzer tests pass, `git diff --check` is clean, and exact-head CI is recorded in the hand-off message.

## 2. Deliverables (directive §9)

| # | Required | File |
|---|---|---|
| 1 | Contract conformance checklist | `ti4a-contract-conformance-checklist.md` |
| 2 | Report-only authority inventory | `ti4a-report-only-authority-inventory.md` + `baseline/ti4a-inventory-*.{json,md}` |
| 3 | Baseline classification and exceptions | `ti4a-baseline-classification-and-exceptions.md` |
| 4 | Static-analysis coverage and limitations | `ti4a-static-analysis-coverage-and-limitations.md` |
| 5 | Action-economy result compatibility spec (X1) | `ti4a-action-economy-result-compatibility-spec.md` |
| 6 | Q-033 outcome and containment compatibility (X2/X3) | `ti4a-q033-outcome-and-containment-compatibility-spec.md` |
| 7 | OD-1 recovery risk-matrix proposal (DI-2) | `ti4a-od1-recovery-risk-matrix-proposal.md` |
| 8 | Receipt-storage certification spec (DI-3) | `ti4a-receipt-storage-certification-spec.md` |
| 9 | GM reconciliation design and negative-test plan (DI-4) | `ti4a-gm-reconciliation-design-and-negative-tests.md` |
| 10 | Stable operation-ID interface proposal (Q3) | `ti4a-operation-id-interface-proposal.md` |
| 11 | Checkpoint and evidence report | this file |

Tooling and tests added (only these, as corrected): `tools/ti4-authority-inventory.mjs`, `tools/lib/ti4-authority-inventory.mjs`, `tools/lib/ti4-authority-config.mjs`, `tests/ti4a-authority-inventory.test.mjs`, `tests/fixtures/ti4a/scripts/**` (4 synthetic files: authority, documented-exception, unreviewed writer, unreviewed caller). **Plus** (separate commit) one appended section in `docs/audits/swse-rules-decisions-pending.md`.

## 3. Report-only analyzer

Report-only is enforced by construction and by test: the analyzer has no Foundry/runtime hook, never writes files from the library, never throws on a boundary violation, and its CLI exits 0 whenever the analysis completes — a new or unclassified writer does **not** change the exit code. Exit 1 is reserved for a malformed artifact (`--check-artifact`), 2 for an execution error. There is no blocking mode.

- **Protected families (9):** credits; Force Points and bonus pools; ammunition and fire state; action economy; equipment posture/occupancy/state; upgrade and modification state; progression entitlements; ownership, followers and assignments; GM approval state.
- **Mutation forms recognized:** payload key, bracket assignment, property assignment (including compound/`++`), `setFlag`/`unsetFlag`, settings `set`, and delegated authority-API calls. Reads are counted, never classified as writes. Unclassifiable uses are surfaced as `unresolved-use` rather than dropped.
- **Limitations** (16 documented in the coverage document, 11 embedded in every artifact; five material): constants as keys (the real `ActionEconomyPersistence` `setFlag` is invisible, so `actionEconomy` shows 0 direct writers), aliases, computed paths, nested-object payloads, and payload-key lookalikes (type maps). See the coverage document.

## 4. Baseline results (artifacts committed; reproducible; `cmp`-identical on re-run)

| Tree | Source head | Files | Direct writers | Delegated calls | Unresolved uses | UNCLASSIFIED writers |
|---|---|---:|---:|---:|---:|---:|
| `main` | `4392c90` | 2,227 | 157 | 163 | 54 | 22 |
| lineage A | `abb81d9` | 2,244 | **161** | 170 | 69 | **22** |
| lineage B | `4e51a15` | 2,227 | 156 | 164 | 54 | **21** |

**Total classified mutation writers (lineage A, the superset):** 161 recognized direct writers — **139 classified** (43 authority-internal, 7 documented exceptions, 89 named by the Phase 0 census) and **22 unclassified**; plus 170 classified delegated calls to authority APIs.

**Protected resource families:** 9.

**Previously known versus newly discovered (lineage A):**

| | Count |
|---|---:|
| Direct writers named by or classified through Phase 0 | 139 |
| Newly discovered (UNCLASSIFIED) | 22 |
| — genuine direct writers not in Phase 0 | 8 records (minion-creator followerSlots; attribute-step `pendingCustomPurchases` enqueue; follower-orphan-transfer hotfix ×4; follower-repeatable-entitlement hotfix ×1; `follower-droid-garage-hotfix` credits write — **removed by TI-2 on lineage B**) |
| — plan builders (write into a mutation plan applied by a known authority) | 12 |
| — false positive / adapter | 2 |
| Indirect Force Point writers found by investigation (via `SchemaAdapters.setForcePointsUpdate`; **not** recorded by the analyzer) | 4 sites (`consular-talent-actions.js:206,213`, `force-engine.js:33,53`); `force-engine.js` is not in the Phase 0 census |

**Reconciliation with Phase 0** (every difference investigated, nothing forced): the 29 inline Force Point spenders reproduce exactly on lineage A (30 on `main`/B, the extra is the attack-path spend TI-1 later moved into `force-point-transaction.js`); the ~31 absolute Force Point writers reproduce in the same 10 files and counts (`weapons-engine.js` has two paths for one logical write); the 6 bonus-pool writers and 4 direct action-economy persistence callers reproduce. **One Phase 0 statement is corrected** (not in the accepted files; recorded in the baseline doc): `follower-repeatable-entitlement-hotfix.js` writes `followerSlots` with a direct `actor.setFlag` (`:170`), not through `ActorEngine`.

**Analyzer defects found and fixed during calibration (so the baseline can be trusted):** full-path strings classified as embedded fragments; optional-call callee lost; local bindings counted as field writes (30 false positives). Mutation testing: eight injected defects each fail a test.

## 5. Specifications completed

| Item | Result |
|---|---|
| **X1 action economy** | Four result classes S1 verified-persisted, S2 policy no-op (`free`/`passive`/`out-of-combat`), S3 allowed-but-unpersisted (split into `over-spend-permitted`, `economy-modules-unavailable`, `reaction-store-unavailable`), S4 indeterminate. Today's coordinator already accepts exactly S1 and S2; the spec adds the vocabulary. **`over-spend-permitted` finalization is an open owner decision (OD-X1-a); until decided, it remains `INDETERMINATE`.** |
| **X2/X3 Q-033** | Contract's four states cover every Q-033 outcome; the equipment journal provides Q-033's containment **for equipment scope only**; TE-governed scopes have none. Hazard status H1–H9 vs current heads is tabulated; **H7 (`Number(cost) \|\| 0`, `transaction-engine.js:344`) is still open and was not previously registered**; H2 (unchecked restore) is closed in every `TransactionEngine` path and open in `ActorEngine.applyMutationPlan` (G06). 12 gaps (M1–M12) must close before any modification executor can be activated. |
| **DI-2 risk matrix** | Each of the 10 methods/paths (P20–P29) classified by rubric F1–F6. Only candidate for the OD-1 exception: `executeCreditAdjustment` under a closed list of GM-only manual contexts, conditional on five prerequisites (replay guard, post-write verification, explicit `INDETERMINATE` reporting, GM authority in the engine, no second resource). **No row is authorized**; every exception cell reads "No operation qualifies" until independent review. |
| **DI-3 receipt certification** | 28 test rows in six series (restoration, reload, retention, unresolved preservation, loss-of-acknowledgement, replay); predictions: audit flag fails R1/R2, FP receipt fails L1, `storeAcquisition` marker passes R5. Nothing certified. |
| **DI-4 GM reconcile** | GM-in-engine authorization; value equality is an **observation, never proof**; causality is established **per mechanical leg** (a marker proves only the leg it was written with; operation-level `COMMITTED` needs every required leg independently `VERIFIED`; otherwise `INDETERMINATE`/`PARTIAL`); an operation id is an identity, **not a lock**; **one active GM user is not one active execution context** — process-local guards and a persisted read/write claim give detection, not exclusion, so without an independently verified exclusive writer the operation is **read-only diagnosis only** and any write is `REFUSED('coordination-uncertified')`; GM attestation is an audit record only (OD-4b unresolved); 17 refusal conditions; 43 negative tests (N1–N43 with N29b; N12 retired into N23). No implementation, no UI. |
| **Q3 operation id** | Optional `OperationEnvelope` (id minted at intent, server-recomputed fingerprint); duplicate delivery vs genuine second action vs same-id/different-payload decisions defined; receipts stay domain-owned; back-compat by omission; not wired anywhere. |
| **Conformance checklist** | Normative, with evidence levels and an audit procedure; sections O, P, R, K, C, E, X1 and Q (Q-033/modification) plus level-claim gates H1–H3. |

## 6. OD-5 rules-register mirror (separate commit)

A new, independent third register ("Transaction-integrity register (TI4)") with entry **`TI4-OD-5`** was **appended** to `docs/audits/swse-rules-decisions-pending.md`; D-011 and every existing entry are unchanged. The original file text is an exact prefix of the new file (pure insertion, 0 lines deleted).

Parser-safety proof (the register is machine-parsed; the D-015 section runs to end of file, so appended text lands inside it): the entry uses none of the parsed row labels (`Ledger scope`, `Blocker lifted`, `Partial lift`, `Review classification (rev. 2)`) and no `## D-###` heading. Verified with the real parser (`parseRegister`) on the before/after text: **15 D-entries parsed, every parsed entry deep-equal; 9 pinned scope hashes verified; D-011 byte-identical.** `validate-modification-registry`, `build-modification-runtime --check` and `--validate` pass with the same output as before; no file under `data/` changed.

Status recorded: the printed construction sequence and the persistence-failure policy are owner-approved; the **component-expenditure model is `DEFERRED_RULES_REVIEW` (DI-1)** with no option enumerated and no recommended ruling, because the owner provided no source-supported option set. The implementer has not read the cited pages; the entry says so.

## 7. Validation

| Check | Result |
|---|---|
| New analyzer tests (`tests/ti4a-authority-inventory.test.mjs`) | **22 / 22 pass**; mutation-checked (8 injected defects each caught) |
| Fail-before | n/a for tooling (no production defect corrected); the tests were shown to fail against injected analyzer defects |
| Rolling suite (`node tools/run-rolling-tests.mjs`) | **382 passed, 0 failed** (5 documented exclusions); includes the new test |
| Repo guards (the 27 CI commands + partials + `system.json` + syntax sweep) | **26 pass locally**; syntax sweep 2,882 files pass; partials OK; `system.json` valid |
| Guard that crashes **only in this local worktree** | `node tools/migrate-phase-5c-weapon-references.mjs --check` → `ENOTDIR … '/home/user/wt-ti4a/.git/index'` (a git **worktree** has a `.git` *file*, not a directory). **Not reported as locally passing**; it runs in exact-head CI, whose result is recorded in the hand-off message |
| Modification guards | `validate-modification-registry` VALID (pre-existing informational lines unchanged), `build-modification-runtime --check` OK, `--validate` VALID |
| `git diff --check` | clean |
| Production files changed | **none** (`scripts/`, `data/`, `packs/`, `templates/` untouched; only `tools/`, `tests/`, `docs/`) |
| Blocking enforcement introduced | none |
| New authoritative transaction service | none |
| D-005 / Q-033 | dormant / design-only |

## 8. Outstanding design decisions and items for review

| ID | Item | Owner of decision |
|---|---|---|
| DI-1 | Component-ownership/expenditure model for lightsaber construction (rules-preserving design) | rules: owner (`DEFERRED_RULES_REVIEW`) |
| DI-2 | Independent review of the recovery risk matrix (no exception authorized until accepted); reviewer questions 1–4 in that document | reviewer, then owner |
| DI-3 | Per-domain receipt-storage certifications (none run) | future checkpoint |
| DI-4 | Authorization to implement a GM reconcile operation (design only now) | owner |
| Q3 | Authorization to wire the operation-id interface (design only now) | owner |
| OD-X1-a | Whether an equipment draw under a permitted loose-mode over-spend may finalize | owner (gameplay-adjacent) |
| Disposition review | the 22 proposed dispositions of unclassified writers (8 genuine, 12 plan builders, 1 false positive, 1 adapter) and the 4 adapter-indirect Force Point writers | reviewer, then a config change |
| Q-033-H7 | `Number(cost) \|\| 0` coercion in `executeMutationTransaction` (new finding) | bounded-correction candidate (not authorized) |
| Phase 0 correction | `follower-repeatable-entitlement-hotfix.js` direct `setFlag` | recorded; no code change |

## 9. What was not done (by directive)

No G06 correction; no TI4-C0/TI4-B implementation; no production authority enforcement or runtime interception; no new receipt persistence; no GM reconciliation implementation or UI; no lightsaber-construction or Sith Alchemy code change; no D-005 activation; no integration of the TI-1 and TI-3 branches; no merge; no change to PR #1062's accepted checkpoint; no history rewrite; no existing test weakened.

## 10. Stop

Waiting for independent review of TI4-A. The proposed next checkpoint (TI4-C0, G06) is **not** started.
