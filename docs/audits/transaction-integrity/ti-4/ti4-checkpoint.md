# TI-4 Phase 0 — Checkpoint (Architectural Certification Preparation)

**Status:** design checkpoint for independent review. **Read-only investigation: no production code, tests, compendium/canonical data, D-005 artifacts, or published mechanics changed.** TI4-A is not started. Nothing is merged. Evidence is source reading and offline L1 only; **no L2/L3 claim is made for any domain.**

## 1. Evidence heads and state (verified at the start of this checkpoint)

See `ti4-authority-inventory.md` §0.1 for the table. Summary: `main` = `4392c90dc324a0474e9ca470c514f4ec1a8fcc37`; #1056 `f4555227e`, #1057 `d191d60d9`, #1058 `169060a38`, #1059 `abb81d919`, #1060 `903269083`, #1061 `4e51a1565`; all open drafts, none merged, each with a green "Rolling system validation" on its exact head. Open sibling PRs not in scope but relevant: #1050 (Q-033 atomicity design), #1053 (D-005 host source reconciliation).

**Branch for this checkpoint:** `audit/ti4-transaction-contract`, based on `main` (docs only). **Dependency graph:** two accepted lineages (A: #1056→#1059; B: #1060→#1061) that overlap in exactly one production file, `scripts/apps/progression-framework/shell/progression-finalizer.js`; #1058 sits in neither. No lineage was merged, rebased or combined to build this branch.

## 2. Deliverables

| File | Content |
|---|---|
| `ti4-authority-inventory.md` | 63 mapped paths with the 14 required attributes; evidence heads; dependency graph; governance reality; direct-write census |
| `ti4-contract-v1-proposal.md` | SWSE Mechanical Transaction Contract v1 (concepts, 4 outcomes + qualifiers, replay policy, compensation rules, level obligations, owner decisions) |
| `ti4-transaction-compliance-matrix.md` | 14 domains × pillars/levels; outcome-vocabulary compliance; authority-pair compatibility |
| `ti4-enforcement-gap-register.md` | 41 gaps, each with evidence, severity, smallest correction, package |
| `ti4-replay-and-recovery-design.md` | unresolved taxonomy, evidence retention, who reconciles, field-wise classification, no automatic retry |
| `ti4-cross-domain-test-plan.md` | 47 deterministic cases (14 atomicity, 15 idempotency, 12 concurrency, 6 boundary) with the offline/runtime/multi-client split |
| `ti4-l2-l3-feasibility.md` | what the repo can already do, honest answers to the 9 directive questions, runtime experiments required |
| `ti4-implementation-roadmap.md` | packages TI4-A, C0, B, C, D, E; base selection; enforcement limits |

## 3. Report items required by the directive (§14)

| Item | Value |
|---|---|
| Branch / draft PR | `audit/ti4-transaction-contract` / see PR link in the hand-off message |
| Commit SHA | recorded in the hand-off message (a document cannot contain its own commit id) |
| Exact-head CI | recorded in the hand-off message after verification |
| Transaction domains inventoried | **14** |
| Authoritative mutation paths mapped | **63** (58 ACTIVE or reachable; 5 DORMANT/INACTIVE/CERTIFIED-UNWIRED: `TransactionEngine.execute` P27, `StoreTransactionEngine` P28, `InstallRemoveEngine` P40, D-005 evaluator P41, legacy progression engines P52) |
| Enforcement/integrity gaps registered | **41** — severity S1 ×16, S2 ×16, S3 ×8, gate ×1. 39 are `SOURCE_VERIFIED`; G10 (orphan actors) and G36's trigger default are `RUNTIME_UNVERIFIED`. G39/G40/G41 are recorded for coverage/gating, not as proposed fixes. |
| Reachable defects proposed as bounded first corrections (`C0`) | 10 gaps (G06, G11, G16, G20, G21, G22, G24, G26, G34, G35) |

## 4. L1/L2/L3 coverage by domain (from the compliance matrix)

| Domain | L1 | L2 | L3 |
|---|---|---|---|
| 1 Equipment state | partial (strongest design) | none | partial (durable journal, no reconcile) |
| 2 Action economy | partial | none | none |
| 3 Fire state & ammunition | partial | none | none |
| 4 Force Points | partial (attack/RollCore only) | none | none |
| 5 Attack/damage commit | none | none | none |
| 6 Commerce core | partial (P20/P23 strong) | none | partial (marker, snapshot ring) |
| 7 Store purchase & stock | partial | none | none |
| 8 Credit transfer/escrow/holonet | partial (transfer only) | none | none |
| 9 Customization/modification boundary | partial | none | none |
| 10 GM approvals & dashboard | partial | none | partial (marker) |
| 11 Progression | partial | none | none |
| 12 Followers/allies/slots | partial | none | partial (reservations, snapshot) |
| 13 ActorEngine/snapshots/governance | partial; governance enforces nothing | none | partial (snapshot ring) |
| 14 D-005 host requirements | certified-unwired, offline | n/a | n/a |

**L2: none in any domain. L3: no domain has a deterministic reconcile operation, so none is certified.**

## 5. Headline findings (most consequential first)

1. **The governance layer enforces nothing.** `MutationInterceptor` authorization is unread (`hasContext`, `_isAuthorized` have no callers); the Sentinel violation pipeline is dead (G01, G02). Every "protected" field (credits, FP, ammo, equipment, action economy) can be written directly in all modes, and 29 inline FP spenders plus ~31 absolute FP writers plus six bonus-pool writers already do. Boundary enforcement must be a CI call-path ratchet plus authority-local guards; prototype wrapping was removed once and is unsafe.
2. **No commerce operation id exists** (G17): every `TransactionEngine` call mints a random id, so a repeated request is a second charge. The only durable replay guard is the `storeAcquisition` marker for droid/vehicle approvals.
3. **`applyMutationPlan(transactional:true)` ignores its own rollback result** and logs "rolled back" on failure (G06). Progression finalization and lightsaber construction rely on it. The TI-3 finalizer comment overclaims.
4. **TI-2's recovery-required rule covers only two of six `TransactionEngine` methods**; adjustment, approval, sale and rollback-correction still proceed without recovery and without post-write verification (G07–G09). Extending it needs owner decision OD-1.
5. **Reachable replay defects:** wager `refundSession` double-refunds from `refund-failed`† (G22); `executeRollbackCorrection` can be applied twice† (G20); the legacy dashboard reverse never marks its source (G21); store-item approvals can charge twice if queue cleanup fails (G23); `rejectDroid` throws after committing (G35)†.
6. **Absolute-value compensation overwrites concurrent changes** in ally assignment, follower link, ammo rollback and force-alchemy (G12).
7. **Equipment readiness can be withheld indefinitely** after a loose-mode action over-spend or an unfinalized journal entry; no reconcile operation exists (G36).
8. **Outcome vocabularies differ** between the TI work (`refused/committed/compensated/rollbackFailed/indeterminate`), equipment journal phases, and Q-033 (`PRECONDITION_SNAPSHOT_UNAVAILABLE`, `RECOVERY_INCOMPLETE`); the contract proposal maps them to four states plus qualifiers.

`†` = re-verified line by line by the coordinator.

## 6. Architectural conflicts to resolve (equipment vs modification vs commerce)

| # | Conflict | Detail | Resolution path |
|---|---|---|---|
| X1 | Action-economy "no-op" vocabulary | the equipment coordinator accepts a spend only with `committed:true` or `noOp` for `out-of-combat/free/passive`; loose-mode over-spend returns `{allowed:true, committed:false}` with no `noOp` and becomes INDETERMINATE (G36) | decide in TI4-A which result shape denotes "allowed without persistence" |
| X2 | Q-033 requires cross-context locking and post-write re-read; TE has per-method keys and verifies only P20/P23 | modification executor cannot meet Q-033 §2.4/§2.8 on the current TE | G28/G08 before any modification executor; modification remains gated |
| X3 | Q-033 `RECOVERY_INCOMPLETE` + quarantine vs TI `INDETERMINATE` + "withhold readiness" | different words and different containment (quarantine per transaction/item vs per weapon) | contract §4.2 maps them; the *containment* mechanism for TE-governed assets does not exist yet |
| X4 | Flag namespaces: equipment journal and fireState use `flags.swse.*`; TE audit and markers use `flags.foundryvtt-swse.*` | two namespaces for transaction evidence; harmless but inconsistent for a single reconcile tool | TI4-A inventory of namespaces (no migration proposed) |
| X5 | Receipt erased by restore | TE audit flag lives inside the actor that a whole-actor restore rewrites (G17 note, recovery §3) | OD-3 |
| X6 | Equipment coordinator ↔ upgrade writers | **no shared fields** (coordinator: posture/occupancy/fireState/ready-ignite; upgrades: `installedUpgrades`, `flags.*.customization`); only the actor-level lock key is shared in concern | compatible |

## 7. Open owner decisions

| ID | Decision | Status |
|---|---|---|
| OD-1 | Extend D1 (refuse without verifiable recovery) to credit adjustments, sales, rollback corrections (and relation to earlier Q1 risk-matrix question) | `OWNER_DECISION_REQUIRED` |
| OD-2 | Approve the 4-state outcome vocabulary as the reporting standard | `OWNER_DECISION_REQUIRED` |
| OD-3 | Receipt location policy for durable replay (and Q3 operation-id design checkpoint) | `OWNER_DECISION_REQUIRED` |
| OD-4 | Is a GM reconcile *operation* (no UI) in scope for TI4-C? | `OWNER_DECISION_REQUIRED` |
| OD-5 | Lightsaber construction roll-before-write ordering (G15) | `OWNER_DECISION_REQUIRED` (rules-adjacent; not decided here) |
| Q2 | Sith Alchemy routing (earlier question; DarkSidePowers/force-alchemy credit debits appear in the inventory) | still pending from earlier checkpoints |

No published SWSE mechanic is decided, changed or implied by this package. `docs/audits/swse-rules-decisions-pending.md` is untouched.

## 8. What was not done (by directive)

No production enforcement; no L2/L3 work; no reconciliation UI; no equipment WP6–WP9; no D-005 T4d-4; no modification runtime integration; no dead-code cleanup; no branch reconciliation; no merges; no history rewrite; no test rewritten or weakened; D-005 artifacts untouched.

## 9. Verification performed for this checkpoint

- `git diff --name-only origin/main...HEAD` lists only files under `docs/audits/transaction-integrity/ti-4/`.
- `git diff --check` clean.
- Remote head/ancestry/CI verified through the GitHub API and `git merge-base --is-ancestor`; counts in §3 computed from the documents' own tables.
- Existing repository guards for docs run on this branch (results in the hand-off message).
- All code claims were read from `/home/user/wt-ti1` (`abb81d919`) and `/home/user/wt-ti3` (`4e51a1565`); D-005 from `d191d60d9` via `git show`. Claims marked `†` were independently re-read.
- Not run: any Foundry runtime, any new test.

## 10. Stop

Waiting for independent review of the design. TI4-A is not begun.
