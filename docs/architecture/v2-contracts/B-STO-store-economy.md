# B-STO — Store, credits and transactions (domain contract + Phase 2 conformance)

**Contract level:** B (with embedded C). **Audited commit:** `f734b4d` (scripts unchanged at HEAD `2beb7cb`). **Sidecar:** `data/audits/architecture-census/contracts/domains/store-economy.json`. **Census:** 32 runtime modules / 10,673 SLOC, all reachable; 21 tests.
**Evidence level:** offline static reading + offline tests (`ti2-commerce-integrity`, `store-v2-purchase-integrity`, `ti4c0-te-credit-adjustment-safety`, `store-v2-s9-resale-authority` all pass locally). Nothing here is `FOUNDRY_TESTED` (A-13).

## 1. Purpose and boundaries

Owns: credit movement and its audit ledger (A-10), store catalog/pricing/policy, cart and checkout orchestration, store acquisitions (items, droid and vehicle actors), resale, GM approval commits, rollback corrections.
Does **not** own: actor/item persistence (ActorEngine, A-02); item mechanics (EQP); upgrade/customization mechanics (CUS — it only *pays* through TE); starting-credit grants during progression (progression domain — classification open, see F-STO-004); game wagers / Holonet credit features (they are TE *callers*).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-STO-01 | Single authority for credit movement (debit, credit, transfer, sale, approval, rollback correction) | `TransactionEngine` | APPROVED (OSI, A-10) · OBSERVED · CONFLICT (F-STO-002..005) | behavior-code-verified | `scripts/engine/store/transaction-engine.js:57`, `:308`, `:557`, `:719`, `:960`, `:1221`, `:1461`, `:1871` |
| R-STO-02 | Canonical credit ledger (per-actor transaction records) | `TransactionEngine` writes `flags.foundryvtt-swse.transactions.<id>` in the same plan as the charge | OBSERVED | behavior-code-verified | `transaction-engine.js:110`, `:416`, `:615` |
| R-STO-03 | Credit arithmetic / funds validation / credit-delta plan building (pure, no writes) | `LedgerService` | OBSERVED — internal primitive of R-STO-01, **not** a parallel ledger | behavior-code-verified | `scripts/engine/store/ledger-service.js:21`, `:69`, `:123`, `:147-151`, `:209-213` |
| R-STO-04 | Atomic store purchase (credits + item/actor grant + audit + stock) | `StoreEngine.purchase` → `TE.executeMutationTransaction` | OBSERVED · CONFLICT (F-STO-001 created-actor rollback) | behavior-code-verified; test-verified (`store-v2-purchase-integrity`, `ti2-commerce-integrity`) | `scripts/engine/store/store-engine.js:281`, `:355`; `transaction-engine.js:444`, `:493` |
| R-STO-05 | Store catalog, pricing, policy | `store-catalog.js`, `pricing.js`, `cost-registry.js`, `policy-service.js` | OBSERVED | source-inspected | `scripts/engine/store/cost-registry.js:46` |
| R-STO-06 | Resale authority | `resale-authority.js` / `ResaleService` → `TE.executeSaleTransaction` | OBSERVED | test-verified (`store-v2-s9-resale-authority`) | `scripts/engine/store/resale-service.js:217` |
| R-STO-07 | Store acquisition provenance / owner linking | `acquisition-service.js`, `acquisition-record.js` | OBSERVED | source-inspected | `transaction-engine.js:508` |
| R-STO-08 | Store UI (window + Holopad surface) | `SWSEStore` (`store-main.js`) + `StoreSurfaceService` | OBSERVED · CONFLICT (A-02/A-04 cart flags, F-STO-006) | source-inspected | `scripts/apps/store/store-main.js:1040`, `:1437`; `scripts/ui/shell/StoreSurfaceService.js:44` |

## 3. Authorities

- **Canonical data:** `actor.system.credits` (balance) — OBSERVED. Ledger: `flags.foundryvtt-swse.transactions` — OBSERVED; legacy `purchaseHistory` is inert (`scripts/apps/gm-datapad.js:799`) — no parallel ledger found.
- **Rules:** purchase price/resale (`LedgerService.calculateResale` 50 %, `ledger-service.js:178`) — OBSERVED; the 50 % figure is existing behavior, not re-adjudicated here.
- **Calculation:** `LedgerService` (pure) — OBSERVED.
- **Mutation/persistence:** TE → `ActorEngine.applyMutationPlan` — OBSERVED. TE never calls `actor.update` directly.

## 4. Public interfaces

| Symbol | Path:line | Consumers | Contract |
|---|---|---|---|
| `TransactionEngine` | `scripts/engine/store/transaction-engine.js:57` | 36 | `execute*` methods return `{success, transactionId, error, rolledBack?, rollbackFailed?, indeterminate?}`; refuse without verifiable recovery snapshot |
| `TransactionEngine.executeMutationTransaction` | `transaction-engine.js:308` | store-engine, workbench, UpgradeService, tech-specialist, modification-install-service | contexts allow-listed at `:63` |
| `TransactionEngine.executeCreditAdjustment` | `transaction-engine.js:557` | GM tools, Holonet, wagers | contexts at `:73` |
| `TransactionEngine.execute` (legacy cart API) | `transaction-engine.js:2066` | 0 (no caller in scripts/tests/packs) | see F-STO-007 |
| `LedgerService` | `scripts/engine/store/ledger-service.js:21` | 23 | pure: read balance, validate, build `{set:{'system.credits'}}` plan |
| `StoreEngine.purchase` | `scripts/engine/store/store-engine.js:281` | 7 (module) | delegates commit to TE |
| `SWSEStore.open` / `game.swse.openStore` | `index.js:297` | 9 | UI entry |

## 5. Dependencies

Allowed: ActorEngine, SnapshotManager (recovery), credit-normalization, acquisition/droid/vehicle factories (plan builders). Prohibited: engine → UI imports (A-07); any credit write that bypasses TE (A-10).
Observed violations: credit-charging code outside TE in CUS (`lightsaber-construction-engine.js:617`), Force (`force-alchemy-mechanics-service.js:441`), progression and sheets (F-STO-003..005). TE imports a progression utility (`SnapshotManager`, `transaction-engine.js:265`) — acceptable dependency, noted only.

## 6. Integration points and lifecycle

Hooks emitted after commit: `swseStoreTransactionComplete` (`store-engine.js` post-commit, presentation only; failures never undo — `transaction-engine.js:196`). Entry points: sheet buttons, sidebar control (`scripts/infrastructure/hooks/actor-sidebar-controls.js:72`), chargen summary/confirm steps, Holopad Store surface (`StoreSurfaceService` caches `SWSEStore` instances per actor; `invalidate` at `:597`).

## 7. Failure behavior and invariants

A-10 (credits), A-02 (writes via ActorEngine), A-08, A-13. Observed TE guarantees (TI-2/TI4-C0): process-local lock per actor+context; refusal when recovery snapshot cannot be established (`:263`); verified restore (`:282`); post-write balance verification; caller `verify` callback with targeted compensation (`:217`). Known INTENTIONAL_LIMITATIONs (L2 cross-client races, no CAS, absolute credit writes) are documented in `docs/audits/transaction-integrity/ti4-c0-closure-report.md` §3 and are not re-raised.

## 8. Level C subsystem contracts

- **C-STO-1 LedgerService ⇄ TransactionEngine.** LedgerService is a pure calculator; its plans are applied only inside a TE method. Status: PROPOSED as a rule (today 4 live/dormant non-TE consumers apply its plans: F-STO-002).
- **C-STO-2 Store UI ⇄ StoreEngine.** UI builds cart + plan callbacks; StoreEngine validates prices and stock and calls TE. Status: OBSERVED.

## 9. Tests and certification

`tests/ti2-commerce-integrity.test.mjs`, `tests/store-v2-purchase-integrity.test.mjs`, `tests/store-v2-s2-commerce-closure.test.mjs`, `tests/store-v2-s9-resale-authority.test.mjs`, `tests/ti4c0-te-credit-adjustment-safety.test.mjs`, `tests/ti4c0-g20-rollback-replay.test.mjs`, `tests/ti4c0-g24-pending-sale-identity.test.mjs`, `tests/ti4a-authority-inventory.test.mjs`. **Gap:** no test injects a failure after a CREATE-bucket actor in a store purchase (F-STO-001). Foundry acceptance: FOUNDRY_ACCEPTANCE_REQUIRED for checkout, approvals, resale, cross-client races.

## 10. Reconciliation with existing contracts

Agreements: `combat-authority-map.md:18,31` (credits → TE); `transaction-integrity/authority-and-call-path-map.md` §1 (TE + LedgerService as one commerce authority); `ti4-c0-closure-report.md` §2 ("LedgerService builds plans; it does not write") — confirmed.
- **CR-STO-01** `authority-and-call-path-map.md` §2.2/§3 and `tx-remediation-ledger.md` TX-10 cite `StoreTransactionEngine`, `DroidTransactionService`, `VehicleTransactionService` as INACTIVE; they no longer exist in the tree (only a comment in `scripts/holonet/emitters/store-emitter.js`). Stale evidence.
- **CR-STO-02** `ti4-c0-closure-report.md` §2 and `tx-remediation-ledger.md` TI-N3 list `scripts/talents/DarkSidePowers.js` credit writers; the file no longer exists. The live successor writing credits outside TE is `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js:441`.
- **CR-STO-03** `tx-remediation-ledger.md` TX-01 (UpgradeService writes item before charging) is now corrected: `scripts/engine/upgrades/UpgradeService.js:685` routes through TE. Ledger still reads as open.
- **CR-STO-04** Probe A-08 (`invariant-probes.json` / A-global table) flags `store-main.js:1437` as a write during render; it is inside a click handler registered in `_onRender`, i.e. **false positive** for A-08 (the A-02/A-04 classification still applies).

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-STO-001 | high | confirmed | Store purchase rollback does not remove CREATE-bucket droid/vehicle actors but reports `rolledBack:true` |
| F-STO-002 | medium | confirmed | LedgerService credit plans applied outside TE (lightsaber construction live; InstallRemove/Structural/ModificationIntentBuilder dormant) |
| F-STO-003 | medium | confirmed | Force Alchemy charges credits via ActorEngine with its own compensation, not TE |
| F-STO-004 | medium | confirmed | Progression credit grants outside TE; GRANT_CREDITS writes credits before its idempotency record (double-grant on partial failure) |
| F-STO-005 | medium | confirmed | Sheet credit add/subtract and raw `system.credits` form fields bypass TE ledger |
| F-STO-006 | low | confirmed | Store cart / saved-for-later persisted with direct `actor.setFlag` from UI (A-02/A-04; A-08 false positive) |
| F-STO-007 | low | confirmed | Legacy `TransactionEngine.execute` + `PlacementRouter` have no callers (class C candidate) |
| F-STO-008 | low | suspected | Store navigation re-renders the whole app for UI-only view state; Holopad caches live app instances |
| F-STO-009 | info | confirmed | Transaction-integrity docs partly stale (CR-STO-01..03) — consolidation candidate |

P-A10 site classification (all 15 probe sites + non-probe charge sites) is in the sidecar `findings[].observed` and summarized: ledger-service ×2 = internal TE primitive (false positive); summary-step:1786, progression-event-processor:409, equipment-engine:68 = progression grants (F-STO-004); character-like-sheet:6087 + form schemas = manual edit (F-STO-005); force-alchemy:462 = F-STO-003; summary-step:740, actor-utils:397, vehicle-modification-rules:121, vehicle-logistics-service:9,120 = labels/comments/pure quotes (false positives); actor-sheet-base:1958 = character reset (non-transaction state reset, legitimate); vehicle-modification-factory:203 = orphan module (vehicles domain).

## 12. Unimplemented, deferred and acceptance-required

- U-STO-01: TE operation identity / exactly-once (TI4-B G17) — UNIMPLEMENTED (tracked in closure report §4).
- U-STO-02: Cross-client lock (L2) — UNIMPLEMENTED / INTENTIONAL_LIMITATION.
- Owner decisions: whether progression starting-credit grants, manual sheet credit edits and Force Alchemy costs are in TE scope (F-STO-003..005); whether the `SWSEStore` window is the "old standalone store app" to retire (OSI) given Holopad currently reuses it as its model.
- No DEFERRED_RULES_REVIEW item in this domain (resale 50 % is existing behavior, not re-adjudicated).
- FOUNDRY_ACCEPTANCE_REQUIRED: store checkout with droid/vehicle, GM approval, resale, credit transfer races.
