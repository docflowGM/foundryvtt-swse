# B-GOV — governance (Sentinel, enforcement gates, integrity, mutation governance, snapshots)

**Level:** B with embedded C. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/governance.json`. **Facts:** 100 files, 86 runtime modules — 26 reachable (22 static, 4 dynamic), **55 unreachable** (34 importers-only, 20 orphans, 1 string-referenced), 15,296 SLOC. (ActorEngine is physically under `scripts/governance/actor-engine/` but is contracted in B-ACT.)

## 1. Purpose and boundaries

governance owns: mutation-context bookkeeping and enforcement level (`MutationInterceptor`), mutation payload normalization and boundary classification services used by ActorEngine, prerequisite integrity checks after recompute, preflight validation for repairs, snapshot capture/restore (`SnapshotService`, used by `applyMutationPlan` transactional mode), and Sentinel runtime diagnostics (`sentinel-core`, mall-cop, compendium forensics, sheet guardrails).

It must **not** own: actor mutation itself (ActorEngine, A-02), rules (A-11), UI. Diagnostics must be opt-in and non-invasive (A-09: no runtime patching).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-GOV-01 | Mutation context + enforcement level | `scripts/governance/mutation/MutationInterceptor.js` · `MutationInterceptor` | OBSERVED · CONFLICT (no consumer of the context) | behavior-code-verified | `scripts/governance/mutation/MutationInterceptor.js:102`, `:156`, `:186`; `index.js:287` |
| R-GOV-02 | Mutation payload normalization | `scripts/governance/mutation/mutation-normalization-service.js` | OBSERVED | dependency-traced | `scripts/governance/actor-engine/actor-engine.js:4375` |
| R-GOV-03 | Semantic boundary classification / guardrails | `scripts/governance/mutation/mutation-boundary-service.js` | OBSERVED | dependency-traced | `scripts/governance/actor-engine/actor-engine.js:4484`, `:4551` |
| R-GOV-04 | Post-recompute prerequisite integrity report | `scripts/governance/integrity/prerequisite-integrity-checker.js` | OBSERVED | behavior-code-verified | `scripts/governance/actor-engine/actor-engine.js:324`, `:417` |
| R-GOV-05 | Preflight validation for repairs | `scripts/governance/enforcement/preflight-validator.js` | OBSERVED | dependency-traced | `scripts/governance/actor-engine/actor-engine.js:4050` |
| R-GOV-06 | Snapshot capture/verified restore (TI4-C0/G06) | `scripts/governance/snapshot/snapshot-service.js` · `SnapshotService` | OBSERVED | test-verified (`tests/snapshot-restoration-plan.test.mjs`, `tests/snapshot-service-restoration.test.mjs`) | `scripts/governance/snapshot/snapshot-service.js:405`, `:419-432` |
| R-GOV-07 | Sentinel diagnostic engine (modes OFF/DEV/STRICT/PRODUCTION) | `scripts/governance/sentinel/sentinel-core.js` · `SentinelEngine` | OBSERVED | behavior-code-verified | `scripts/governance/sentinel/sentinel-core.js:70-84`; `scripts/core/settings.js:205` |
| R-GOV-08 | Sentinel bootstrap + GM API | `scripts/governance/sentinel/sentinel-init.js` | OBSERVED | source-inspected | `scripts/governance/sentinel/sentinel-init.js:13`, `:46` |
| R-GOV-09 | Store/compendium/sheet diagnostics layers | `sentinel-mall-cop.js`, `sentinel-compendium-forensics.js`, `sentinel-sheet-guardrails.js` | OBSERVED | test-verified (`tests/sentinel-compendium-forensics-invariants.test.mjs`) | `scripts/governance/sentinel/sentinel-compendium-forensics.js:551` |

## 3. Authorities

- Mutation **enforcement**: UNIMPLEMENTED at runtime. `setContext` is called 17 times (ActorEngine only) but the context is read only by `hasContext`/`_isAuthorized`, which have no external caller; Foundry writes are not intercepted (prototype wrapping was deliberately removed, `MutationInterceptor.js:99-129`). A-02 is enforced by convention and by the census probe, not at runtime. CONFLICT with ARCHITECTURE §V "Sentinel monitors … unauthorized mutation".
- Snapshot/rollback: SnapshotService is the single restore authority and itself writes through ActorEngine (`snapshot-service.js:405-432`). OBSERVED.
- Diagnostics: SentinelEngine, default OFF (`sentinel-core.js:29`, `:79`). OBSERVED.

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `SentinelEngine` (`report`, `reportSSOTViolation`, `registerLayer`, `bootstrap`) | `scripts/governance/sentinel/sentinel-core.js:113`, `:661`, `:70` | 33 | no-op when OFF |
| `MutationInterceptor.setContext/clearContext/initialize` | `scripts/governance/mutation/MutationInterceptor.js:156`, `:102` | 4 | single global slot, not a stack |
| `SnapshotService` | `scripts/governance/snapshot/snapshot-service.js` | 5 | schema-v2 capture; verified restore |
| `PrerequisiteIntegrityChecker.evaluate` | `scripts/governance/integrity/prerequisite-integrity-checker.js` | 6 | report only |
| `MissingPrereqsTracker` | `scripts/governance/integrity/missing-prereqs-tracker.js` | 10 | imports ActorEngine (cycle, F-ACT-001) |
| `MutationApplicationError` etc. | `scripts/governance/mutation/mutation-errors.js` | 2 | error types |

## 5. Dependencies

Allowed (PROPOSED): infrastructure, actor-core read APIs, ActorEngine (for SnapshotService writes only). Prohibited: governance → UI; diagnostics patching Foundry/DOM prototypes (A-09). Observed: static cycle `MutationInterceptor` ⇄ `governance-diagnostics.js` (probe P-A07 cycle 7); `missing-prereqs-tracker.js:26` → ActorEngine (part of the 18-file SCC).

## 6. Integration points and lifecycle

`init`: `initializeSentinelGovernance()` (index.js composition) registers a `ready` handler (`sentinel-init.js:14`) → `SentinelEngine.bootstrap()` → dynamic `sentinel-mall-cop.js`. `ready`: `MutationInterceptor.initialize()` (`index.js:287`) sets enforcement level from hostname/`dev-strict-enforcement` setting. Every `ActorEngine.recalcAll` runs `_checkIntegrity` (`actor-engine.js:324`).

## 7. Failure behavior and invariants

Diagnostics swallow errors (`sentinel-core.js:685`). Integrity check failures are logged, never thrown (`actor-engine.js:421-424`). `MutationInterceptor.setContext` overwrites rather than nests: a nested ActorEngine call clears the outer context in its `finally` (harmless today only because nothing reads it). A-16: `SentinelSourceMapper.#enrichCache` is time-checked on read but never evicted (unbounded Map while Sentinel is on) — diagnostic data, not a prohibited cache class.

## 8. Level C subsystem contracts

- **C-GOV-1 Snapshot/rollback** — ActorEngine.applyMutationPlan(`transactional`) ⇄ SnapshotService: capture → restore → `{success, exact}` verification; anything else is `INDETERMINATE`. Status: OBSERVED, test-verified; FOUNDRY_ACCEPTANCE_REQUIRED.
- **C-GOV-2 Mutation services** — ActorEngine delegates normalization/boundary checks to two services via thin methods (`actor-engine.js:4374-4589`). Status: OBSERVED.

## 9. Tests and certification

`tests/snapshot-restoration-plan.test.mjs`, `tests/snapshot-service-restoration.test.mjs`, `tests/sentinel-compendium-forensics-invariants.test.mjs`, `tests/dsp-migration-mutation-pipeline.test.mjs`, `tests/phase2-reroll-outcome-integrity.test.mjs`. No test asserts mutation enforcement (there is none). Foundry acceptance: none.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-GOV-01 | ARCHITECTURE.md §V (= global CR-08) | Sentinel monitors shadow writes, unauthorized mutation, duplicate modifiers, engine cross-calls, render mutation | 10 sentinel modules live; the layers that would monitor these (`layers/*`, `mutation-path-guard`, `sovereignty-enforcement`, `enforcement-core`) are unreachable; mutation context is never checked |
| CR-GOV-02 | `MutationInterceptor.js:123` comment | Guards enforced through "Sentinel/secureActorUpdate()" | `secureActorUpdate` does not exist anywhere in `scripts/` |
| CR-GOV-03 | ENGINE-ARCHITECTURE §2 "All mutations go through ActorEngine and only ActorEngine" | True as convention; no runtime gate (probe P-A02: 331 direct sites) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-GOV-001 | high | confirmed | A-02 has no runtime enforcement: MutationInterceptor context is write-only |
| F-GOV-002 | medium | confirmed | 55 unreachable governance modules — classified in sidecar (diagnostic layers, enforcement gates, UI, adapters) |
| F-GOV-003 | medium | confirmed | Unreachable `enforcement-core.js` patches `Application.prototype.render` and `Element.prototype.*` (dangerous if revived) |
| F-GOV-004 | medium | suspected (hypothesis) | Prerequisite integrity evaluation on every `recalcAll` |
| F-GOV-005 | low | confirmed | `SentinelSourceMapper` cache never evicted; CSS auditor duplicated (`scripts/core/css-auditor.js` vs `scripts/governance/sentinel/css-auditor.js`) |
| F-GOV-006 | low | confirmed | `mutation-adapter.js` orphan wrapper over ActorEngine |
| F-GOV-007 | info | confirmed | Documentation candidates |

## 12. Unimplemented, deferred, acceptance-required

- U-GOV-01: runtime mutation enforcement (OWNER DECISION: implement a `preUpdateActor`/`preUpdateItem` observer that checks `MutationInterceptor.hasContext()` in DEV/STRICT, or retire the context and the "enforcement" language).
- U-GOV-02: Sentinel layers for invariant monitoring (CR-GOV-01).
- No DEFERRED_RULES_REVIEW items.
- FOUNDRY_ACCEPTANCE_REQUIRED: transactional rollback (C-GOV-1).
