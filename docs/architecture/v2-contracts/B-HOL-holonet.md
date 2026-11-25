# B-HOL — Holonet messaging, notifications, intel, jobs and Holonet trades (domain contract)

**Contract level:** B with embedded C. **Audited commit:** `f734b4d`. **Census domain:** `holonet` (75 runtime modules, 18.7k SLOC; 10 unreachable). Sidecar: `data/audits/architecture-census/contracts/domains/holonet.json`. Level A IDs: [`A-global-invariants.md`](A-global-invariants.md).

## 1. Purpose and boundaries

Holonet is the in-world communication layer. It owns record/thread storage, delivery and audience routing, notification emitters, Holonews, Intel, secret notes, the GM Job board, and player-to-player trade offers. Trades include credit, item and asset transfers, counter-offers, job payouts and the Party Fund. It also hosts the GM combat-recovery service.

**Must not own:** credit arithmetic or the actor credit ledger (TransactionEngine, A-10); actor mutation (ActorEngine, A-02); second-wind, healing or condition rules (combat/actor-core); faction/location canonical records (npc-followers / B-GAL); game rules for Holopad games (B-GAM). It currently **does** own a world-setting Party Fund balance and ledger (§3, CR-HOL-01).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-HOL-01 | Record/thread persistence in world settings (GM-only, serialized write queue) | `scripts/holonet/subsystems/holonet-storage.js` · `HolonetStorage` (28 consumers) | OBSERVED | behavior-code-verified | `scripts/holonet/subsystems/holonet-storage.js:34-60` |
| R-HOL-02 | Publication and exactly-once delivery | `scripts/holonet/holonet-engine.js` · `HolonetEngine.publish` | OBSERVED | test-verified (`tests/gm-holonet-phase8a-exactly-once-publication.test.mjs`, passed offline) | `scripts/holonet/holonet-engine.js:44` |
| R-HOL-03 | Contracts/vocabulary (record, audience, sender, enums) | `scripts/holonet/contracts/*` (enums: 52 consumers) | OBSERVED | source-inspected | `scripts/holonet/contracts/enums.js:1` |
| R-HOL-04 | Notification emitters from system hooks | `scripts/holonet/emitters/*` → `HolonetEmissionService.emit` | OBSERVED · CONFLICT (droid/ship/follower HP detection, F-HOL-004) | behavior-code-verified | `scripts/holonet/subsystems/holonet-emission-service.js:60`, `scripts/holonet/emitters/droid-emitter.js:42` |
| R-HOL-05 | Intel records and per-actor intel locker | `scripts/holonet/subsystems/holonet-intel-service.js` · `HolonetIntelService` | OBSERVED · CONFLICT (A-02 site) | behavior-code-verified | `scripts/holonet/subsystems/holonet-intel-service.js:503`, `:1010` |
| R-HOL-06 | Messenger: threads, presence, personas, secret notes, job board, view models | `scripts/holonet/subsystems/holonet-messenger-service.js` · `HolonetMessengerService` (7,055 SLOC) | OBSERVED · CONFLICT (oversized, F-HOL-001) | source-inspected | `scripts/holonet/subsystems/holonet-messenger-service.js:1450`, `:4421` |
| R-HOL-07 | Holonet credit movement (transfers, requests, job payouts) | messenger → `TransactionEngine.executeCreditAdjustment` / `executeCreditTransfer` | OBSERVED · APPROVED (A-10 routing) | test-verified (`tests/ti4c0-g16-holonet-credit-evidence.test.mjs`) | `scripts/holonet/subsystems/holonet-messenger-service.js:1429`, `:4205`, `:5229` |
| R-HOL-08 | Multi-step trade / payout atomicity (snapshot + compensating restore) | messenger `_executeAtomicTradeSettlement`, `_executeAtomicJobRewardSettlement`, `_restoreTradeSnapshot` | OBSERVED · CONFLICT (parallel atomicity mechanism, F-HOL-002) | behavior-code-verified | `scripts/holonet/subsystems/holonet-messenger-service.js:1562`, `:6227`, `:6421` |
| R-HOL-09 | Party Fund balance + ledger (world settings) | messenger `setPartyFundBalance` / `appendPartyFundLedger`; exported `PartyFundAccess` | OBSERVED · APPROVED (V-P6C-19 workflow) · CONFLICT (OSI no parallel ledger) | behavior-code-verified; test-verified (`tests/ti4c0-g26-party-fund-integrity.test.mjs`) | `scripts/holonet/subsystems/holonet-messenger-service.js:213`, `:219`, `:1445` |
| R-HOL-10 | GM combat recovery (encounter reset, rests, second-wind reset) | `scripts/holonet/subsystems/gm-combat-recovery-service.js` · `GMCombatRecoveryService` | OBSERVED (delegates to `SecondWindEngine` / `ActorEngine.resetSecondWind`) | behavior-code-verified | `scripts/holonet/subsystems/gm-combat-recovery-service.js:888`, `:908` |
| R-HOL-11 | Socket relay with server-side GM authority check | `holonet-socket-service.js`; `HolonetMessengerService._isRequesterGm` | OBSERVED | source-inspected | `scripts/holonet/subsystems/holonet-messenger-service.js:1458` |
| R-HOL-12 | Holonet preferences and player/party state | `scripts/holonet/holonet-preferences.js`, `holonet-state-service.js` | OBSERVED (world/user settings) | source-inspected | `scripts/holonet/holonet-preferences.js:54`, `scripts/holonet/subsystems/holonet-state-service.js:48` |

## 3. Authorities

- **Canonical data:** Holonet records and threads → world settings via `HolonetStorage` (OBSERVED, GM-only). Intel → `HolonetIntelService` records, plus the actor flag `intelLocker`. Presence → actor flag `holonetPresence`.
- **Rules:** none of its own. Second-wind reset timing is read from `SecondWindEngine.shouldResetSecondWind`. Droid and vehicle actors are excluded from rest recovery (`scripts/holonet/subsystems/gm-combat-recovery-service.js:902`), consistent with A-18 (droids cannot benefit from organic resting).
- **Calculation:** job payout splits (`splitEvenly`, `splitWithPartyCut`, `eachFull`; `scripts/holonet/subsystems/holonet-messenger-service.js:5205-5214`) are GM-chosen distribution arithmetic, not SWSE rules.
- **Mutation/persistence:** actor credits → TransactionEngine (APPROVED · OBSERVED). Actor rollback restore → ActorEngine `updateActor`/`deleteEmbeddedDocuments`/`createEmbeddedDocuments`, called by Holonet's own snapshot machinery (CONFLICT, F-HOL-002). Party Fund → direct `game.settings.set` (CONFLICT · owner decision).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `HolonetEngine.publish` | `scripts/holonet/holonet-engine.js:44` | 19 (module) | publish a record, with socket relay and dedupe |
| `HolonetEmissionService.emit` | `scripts/holonet/subsystems/holonet-emission-service.js:60` | 9 | emitter → record, with preference gating and dedupe key |
| `HolonetStorage` | `scripts/holonet/subsystems/holonet-storage.js:34` | 28 | GM-only queued world-setting writes |
| `HolonetMessengerService` | `scripts/holonet/subsystems/holonet-messenger-service.js:1450` | 19 | ~100 static methods (§11 F-HOL-001) |
| `PartyFundAccess` | `scripts/holonet/subsystems/holonet-messenger-service.js:1445` | `scripts/engine/vehicles/vehicle-ammunition-purchase-service.js` | balance/ledger accessors; writes are world settings (GM client) |
| `HolonetIntelService` | `scripts/holonet/subsystems/holonet-intel-service.js:503` | 25 | intel records and locker |
| `GMCombatRecoveryService` | `scripts/holonet/subsystems/gm-combat-recovery-service.js:888` | 8 | GM recovery actions via ActorEngine |
| `initializeHolonet` | `scripts/holonet/integration/holonet-init.js:280` | `index.js:292` | boot |

## 5. Dependencies

- **Allowed:** TransactionEngine and ActorEngine (mutations); SecondWindEngine; faction/location registries (read); games (invites; 12 edges).
- **Prohibited:** direct credit field writes; UI imports from subsystems (A-07).
- **Observed:** `HolonetStorage` wraps writes in `scripts/ui/shell/ShellMutationGuard.js` (`scripts/holonet/subsystems/holonet-storage.js:40`), which is an engine→UI edge (A-07, same pattern as F-MEN-007). Inbound: ui-shell → holonet has 88 edges, the 4th heaviest cross-domain edge. That is expected for a surface-backed service. The weight sits mostly on `HolonetMessengerService` and its view-model builders (`:1930-2377`). Those builders are presentation logic living inside the service (F-HOL-001 seam S6).

## 6. Integration points and lifecycle

`index.js:292` → `initializeHolonet()`. `scripts/core/settings.js:9` → `registerHolonetSettings()`. Hooks consumed (census): `updateActor` (droid/follower/ship emitters), `createActor`, `restCompleted`, `swseStoreTransactionComplete`, `swseCustomPurchaseApproved/Denied`, `swseProgressionLevelUp`, `swseApprovalResolved`, `swseGmCombatRecoveryCompleted`, `swseStoreStateChanged/PriceChanged`, `swse:setting-changed` (`scripts/holonet/integration/holonet-init.js:246`), a catch-all bus listener (`scripts/holonet/subsystems/holonet-bus.js:63`) and `closeWorld`. Hook emitted: `swseHolonetUpdated`.

## 7. Failure behavior and domain invariants

- D-HOL-1 (APPROVED, TI4-C0 G16/G26): an indeterminate credit outcome is never auto-compensated or reported as failed. Test-verified.
- D-HOL-2 (OBSERVED): world-setting writes are GM-only and serialized per client (`scripts/holonet/subsystems/holonet-storage.js:34-46`). Cross-GM concurrency is not addressed.
- D-HOL-3 (OBSERVED): trade/payout failure triggers a whole-actor snapshot restore (`scripts/holonet/subsystems/holonet-messenger-service.js:1586`). See F-HOL-002 for the risk.
- A-02, A-05, A-07, A-10, A-16 and A-18 apply.

## 8. Level C subsystem contracts

- **C-HOL-1 Holonet ↔ TransactionEngine.** Every credit delta uses the `holonet-*` contexts whitelisted in `scripts/engine/store/transaction-engine.js:85-94`. Status: APPROVED · OBSERVED.
- **C-HOL-2 Holonet ↔ Party Fund consumers (vehicles).** Interface: `PartyFundAccess`. Status: OBSERVED · CONFLICT (fund is not in TransactionEngine).
- **C-HOL-3 Emitters ↔ storage.** `HolonetEmissionService.emit(...)` with a dedupe key. Status: OBSERVED.

## 9. Tests and certification

Run offline at HEAD, all passing: `tests/ti4c0-g16-holonet-credit-evidence.test.mjs`, `tests/ti4c0-g26-party-fund-integrity.test.mjs`, `tests/gm-holonet-phase8a-exactly-once-publication.test.mjs`. Also present: `tests/gm-holonet-phase8b-intel-bulletin-privacy.test.mjs`, `tests/gm-holonet-phase8c-bulletin-handoffs.test.mjs`. No test covers emitters (F-HOL-004) or snapshot restore identity (F-HOL-002). Foundry acceptance: none recorded. Trade/credit movement and Party Fund flows are FOUNDRY_ACCEPTANCE_REQUIRED (OSI runtime-risk areas).

## 10. Reconciliation with existing contracts

Agreements: credit movement routes through TransactionEngine (`docs/audits/transaction-integrity/ti4-c0-closure-report.md:33`). The indeterminate-outcome policy is implemented (G16/G26).

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-HOL-01 | OSI / A-10 "no parallel ledgers" vs. `docs/audits/swse-rules-decisions-pending.md:2099` (V-P6C-19, owner-approved Party Fund workflow) | TransactionEngine is the single credit ledger; the Party Fund is debited "+ ledger entry" | Party Fund balance and 100-entry ledger live in world settings written by the messenger (`scripts/holonet/subsystems/holonet-messenger-service.js:213-223`). Two approved sources point different ways; not resolved here |
| CR-HOL-02 | `docs/audits/transaction-integrity/ti-4/ti4-authority-inventory.md:113` (P31) | messenger has its own `_trade*` snapshot mechanism; `_restoreTradeSnapshots` returns true without an exactness check | still true at HEAD (`scripts/holonet/subsystems/holonet-messenger-service.js:6300-6316`) |
| CR-HOL-03 | `docs/repo-structure.md:164` | actor mutations through ActorEngine or annotated | `intelLocker` and `holonetPresence` actor flags are written directly without annotation |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-HOL-001 | medium | confirmed | `holonet-messenger-service.js` (7,055 SLOC, ~100 methods, a ~500-line action switch) mixes seven responsibilities. Proposed seams below |
| F-HOL-002 | high | confirmed | Trade/payout rollback is a parallel atomicity engine: whole-actor overwrite and item delete-and-recreate without `keepId` |
| F-HOL-003 | medium | confirmed | Party Fund is a credit pool and ledger outside TransactionEngine (owner decision) |
| F-HOL-004 | medium | confirmed | Droid/ship/follower emitters test flattened keys (`changes['system.hp']`) on the expanded diff object and never fire |
| F-HOL-005 | low | confirmed | Two direct actor flag writes without exception comment (`intelLocker`, `holonetPresence`) |
| F-HOL-006 | low | confirmed | `scripts/holonet/scripts/**` is a stale, broken copy of core init / first-run / scene-controls |
| F-HOL-007 | low | confirmed | Unreachable badge service/renderer, delivery-state and index barrels |
| F-HOL-008 | low | suspected | All messages and threads stored as two world-setting arrays, rewritten per message and broadcast to every client |
| F-HOL-009 | low | confirmed | Engine→UI import: `HolonetStorage` → `ShellMutationGuard` |

Multi-domain lead `second-wind` (`scripts/holonet/subsystems/gm-combat-recovery-service.js:888`): it **delegates** to `SecondWindEngine.shouldResetSecondWind` and `ActorEngine.resetSecondWind`, so it is not a duplicate authority.

**Proposed seams for F-HOL-001** (by responsibility, not file count). S1 `MessengerThreadService` (threads, messages, presence, personas, read state; `:1618-1930`, `:3608-3784`, `:7559-7593`). S2 `HolonetJobBoardService` (job posting lifecycle and faction consequences; `:2704-3377`, `:4935-5078`). S3 `HolonetSecretNoteService` (`:3377-3608`, alongside the existing `holonet-decryption-service.js`). S4 `HolonetTradeService` (offers, counter-offers, preflight, settlement; `:3918-4412`, `:5573-7501`). S5 `HolonetRewardSettlementService` (job credit/XP/item/asset payouts; `:5078-5511`). S6 `MessengerViewModelBuilder` (pure presentation; `:1911-2484`). S7 the Party Fund adapter (`:213-225`, `:5777-5958`), whose placement depends on the F-HOL-003 decision. `_gmThreadAction` (`:4421`) becomes a thin dispatcher. The `_isRequesterGm` socket authority stays in one shared guard.

## 12. Unimplemented, deferred and acceptance-required

- U-HOL-01 UNIMPLEMENTED: durable recovery for in-flight trades/payouts. Snapshots and guards are in memory only (`docs/audits/transaction-integrity/ti4-c0-closure-report.md:50`, L3).
- U-HOL-02 UNIMPLEMENTED: GM tool to resolve indeterminate Party Fund requests (U-VEH-02, `docs/architecture/v2-contracts/unresolved-ledger.md:68`).
- DEFERRED_RULES_REVIEW: none new. Rest exclusion for droids/vehicles follows A-18.
- FOUNDRY_ACCEPTANCE_REQUIRED: credit/item/asset trades including a forced rollback, job payouts, Party Fund, emitter notifications, socket relay from a player client.
