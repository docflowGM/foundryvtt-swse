# TI-4 Phase 0 — Implementation Roadmap (proposal)

**Status:** `DESIGN_PROPOSAL`. These are *proposed* bounded packages. **None is authorized.** Each requires independent review of this design first, and each opens its own branch/PR with its own review gate. No package begins automatically.

## 1. Ordering principle

Strengthen the existing single-client implementation first (L1), then enforce at the boundary, then prove across domains, and only then design multi-client coordination. L2/L3 is not attempted before the L1 baseline is consistent (directive §11, closing note).

Proposed order: **A → C0 → B → C → D → E**. `C0` is the set of bounded defect corrections from the gap register that need no new contract machinery; it is listed first because those defects are reachable today (see §3).

## 2. Base selection (integration dependency graph)

Per `ti4-authority-inventory.md` §0.2 there are two accepted lineages that overlap in exactly one production file. **No package combines them.**

| Package scope | Base | Reason |
|---|---|---|
| Commerce, approvals, followers, progression, ActorEngine plan contract | tip of lineage B (`audit/ti3-progression-followers-approvals`, #1061) | owns `transaction-engine.js`, `GMApprovalOperationsService.js`, `follower-*`, `progression-finalizer.js` TI-3 changes |
| Equipment, FP, action economy, ammo, attack path | tip of lineage A (`audit/ti1-resource-integrity`, #1059) | owns the coordinator, journal, receipt, `force-point-*`, `action-economy-*`, `ammo-system.js` |
| Contract text, matrix, guards that read both | `main` (docs and `tools/` only) | no production overlap |
| Anything touching `progression-finalizer.js` from lineage A | **blocked on owner-authorized integration** | the single overlap file |

Child PRs are based on the lineage tip branch (as #1059/#1061 were), never on a merged combination. Branch integration remains unauthorized.

## 3. Packages

### TI4-A — Contract certification (docs + one static guard)
- **Dependencies:** this design accepted and certified; owner decisions OD-1..OD-5 and Q2 are `OWNER_APPROVED` (`ti4-decision-register.md`); **explicit bounded TI4-A authorization still required**.
- **Scope:** finalize the vocabulary and the compliance matrix; add `tools/` guard scaffolding for the baseline ratchet (G01/G03) in **report-only** mode; reconcile Q-033 vocabulary (`PRECONDITION_SNAPSHOT_UNAVAILABLE`, `RECOVERY_INCOMPLETE`) with the TI vocabulary; resolve the `noOp` vs `committed:false` action-economy vocabulary conflict (compliance matrix §4).
- **Files:** `docs/audits/transaction-integrity/ti-4/*`, `tools/` guard (new file), baseline JSON.
- **Tests:** guard self-test (`B01–B06` in report-only mode).
- **Rollback:** revert the PR; no runtime change.
- **Level:** n/a (documentation and static analysis). **Acceptance:** contract certified by independent review and TI4-A authorized by the owner; baseline recorded with counts equal to this audit.

### TI4-C0 — Bounded defect corrections inside existing authorities
- **Candidates (each independent, each with fail-before):** G06 (check restore result in `applyMutationPlan`), G11, G16, G20 (+G21), G22, G24, G26, G34, G35.
- **Dependencies:** lineage B base for G06/G11/G16/G20/G21/G24/G26/G34/G35; lineage A for none (G22 is in `games/wagers`, base `main`-derived; confirm which lineage touches it — none, so base lineage B or `main`).
- **Tests:** `A04, A11, A13, A14, I12, I13, I14, C12` (OFFLINE). **Rollback:** per-gap commit; independent revert.
- **Level:** L1. **Acceptance:** each fail-before reproduced on the base head; no existing test weakened; exact-head CI green.
- **Owner policy needed:** none for G06/G11/G16/G20/G21/G22/G24/G26/G34/G35 (they correct reporting/replay defects without changing rules). G06 changes how a failed transactional rollback is reported to callers.

### TI4-B — Identity and replay enforcement (selected high-risk domains)
- **Dependencies:** TI4-A accepted; OD-3 approved (domain-owned receipts, per-store certification before replay enforcement); owner Q3 design checkpoint (stable client-minted ids).
- **Scope (staged, smallest first):** (1) equipment: mint `requestId` at intent (G18, lineage A); (2) approvals: store-item acquired marker (G23, lineage B); (3) progression: session `operationId` recorded in the plan (G19, lineage B); (4) `TransactionEngine`: optional `operationId`+fingerprint intake with replay-of-receipt (G17, lineage B); (5) lockbox (G25).
- **Tests:** `I01, I04, I06, I07, I09, I10, I11, I15` (OFFLINE). **Rollback:** each stage behind an opt-in parameter so callers that do not pass an id behave as today.
- **Level:** L1. **Acceptance:** replay/conflict/new-operation semantics proven per contract §5; no new ledger.

### TI4-C — Mutation-boundary enforcement
- **Dependencies:** TI4-A baseline; OD-1 approved (risk-based) — the risk matrix DI-2 must be reviewed before G07/G08/G09 changes.
- **Scope:** switch the guard from report-only to ratchet-enforced in CI (G01/G03); move the weapon-state guard into `ActorEngine.updateOwnedItems` (G04); shared wallet-scoped lock key across TE methods (G28, G33); recovery precondition + post-write verification for adjustment/approval/sale/rollback (G07–G09) **scoped by approved OD-1 (risk-based; matrix DI-2)**; action-economy per-actor serialization and fresh-state `after` (G30); attack aggregate receipt (G38); damage re-read after dialog (G31).
- **Tests:** `A08, A12, B01–B06, C01, C02, C05, C06, C10, C11`. **Rollback:** per sub-item.
- **Level:** L1. **Acceptance:** ratchet baseline cannot grow; every closed gap has fail-before; existing tests unweakened.
- **Bases:** commerce/approvals on lineage B; equipment/FP/AE/attack on lineage A.

### TI4-D — Cross-domain transaction tests
- **Dependencies:** C0/B/C items they exercise. **Scope:** the `A/I/C/B` test IDs not already created above, plus the compatibility pairs in the matrix §4 (equipment↔action economy; TE↔Q-033 requirements). **Files:** `tests/` only (new).
- **Level:** L1 (same-process interleaving; **explicitly not L2**). **Acceptance:** every test passes on the new head and fails on the base head where a defect existed.

### TI4-E — L2/L3 architecture and runtime certification plan
- **Dependencies:** TI4-C complete for the chosen resource family; owner authorization (it introduces new infrastructure).
- **Scope:** execute the runtime experiments in `ti4-l2-l3-feasibility.md` §5; choose among the §3 targets; produce a runtime certification protocol (multi-client, GM failover, lost-ack). **No implementation of L2/L3 before the experiments are reviewed.**
- **Level target:** evidence-gated.

## 4. Enforcement strategy and its honest limits

| Mechanism | Detects | Prevents | Limits |
|---|---|---|---|
| CI call-path ratchet (TI4-A/C) | new unlisted writers of protected field families | at merge time only | misses dynamic writes (`actor.update(variablePath)`), macros, other modules |
| Authority-local guards (keys, markers, digests, receipts) | same-client duplicates, stale plans | same-client | L1 only |
| `ActorEngine` owned-item guard (G04) | weapon-state key writes outside coordinator context | runtime, for callers that use `ActorEngine` | direct `item.update` still unobserved |
| Prototype wrapping / Sentinel revival | — | — | **rejected**: it was removed once (`MutationInterceptor.initialize`), is process-global and unsafe with async |
| Application version counters (E) | cross-client staleness | no (detect/refuse) | read→write window |

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hardening shared `TransactionEngine` changes purchase/droid/vehicle behavior (Q-033 §4 Q033-B warning) | each TE change opt-in or behind its own fail-before and an explicit scope review; no silent behavior change |
| Over-claiming levels | every package states the level it can claim and the evidence; "same-client" appears in every user-facing and doc statement |
| Lineage conflict in `progression-finalizer.js` | packages never touch it from both lineages; integration needs owner authorization |
| Receipt location chosen badly (erased by restore) | OD-3 approved; each store must pass restore/reload/retention certification before B enforces replay; recovery design §3 |
| Lightsaber construction (G15) touched before a rules-preserving design | OD-5 approved as policy only; blocked on DI-1 (component ownership modelling); no package touches `lightsaber-construction-engine.js` mechanically |
| Scope creep into rules | none of the packages change published mechanics; any rule question → `docs/audits/swse-rules-decisions-pending.md` |

## 6. Not in this roadmap

Equipment WP6–WP9, D-005 T4d-4, modification runtime integration, dead-code cleanup, branch reconciliation, any reconciliation UI. Each remains unauthorized.
