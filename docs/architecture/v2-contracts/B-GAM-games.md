# B-GAM — Holopad games and credit wagers (domain contract)

**Contract level:** B with embedded C. **Audited commit:** `f734b4d`. **Census domain:** `games` (32 runtime modules, 8.2k SLOC; all reachable). Sidecar: `data/audits/architecture-census/contracts/domains/games.json`. Level A IDs: [`A-global-invariants.md`](A-global-invariants.md).

## 1. Purpose and boundaries

The domain covers in-world Holopad minigames: Pazaak, Sabacc, Hintaro and Dejarik. It includes their engines, AI opponents and view models, a session store, notifications, an invite materializer, and optional credit wagers (escrow, settlement, refunds, GM economy policy).

These are in-universe minigames. They are not SWSE published mechanics, so no SWSE rules register applies. Rules fidelity for the minigames is tracked in `docs/Holopad-Games-Phase-10-QA-Rules-Fidelity-Audit.md`.

**Must not own:** actor credit fields or a credit ledger (TransactionEngine, A-10); actor mutation (A-02); Holonet thread/message storage (B-HOL).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-GAM-01 | Game session persistence (world setting `gamesSessions`) | `scripts/games/game-session-store.js` · `GameSessionStore` (16 consumers) | OBSERVED | behavior-code-verified | `scripts/games/game-session-store.js:10`, `:90`, `:103` |
| R-GAM-02 | Game rules engines | `PazaakEngine`, `SabaccEngine`, `HintaroEngine`, `DejarikEngine` | OBSERVED | source-inspected | `scripts/games/games/pazaak/pazaak-engine.js:535`, `scripts/games/games/sabacc/sabacc-engine.js:894`, `scripts/games/games/hintaro/hintaro-engine.js:539`, `scripts/games/games/dejarik/dejarik-engine.js:247` |
| R-GAM-03 | Credit escrow, settlement, refund, rollback | `scripts/games/wagers/game-credit-escrow-service.js` · `GameCreditEscrowService` | OBSERVED · APPROVED (A-10 routing) | test-verified (`tests/ti4c0-g22-wager-refund-replay.test.mjs`, 83/83 offline) | `scripts/games/wagers/game-credit-escrow-service.js:713`, `:844`, `:916`, `:1138` |
| R-GAM-04 | GM economy policy (caps, house edge, GM approval) | `scripts/games/wagers/game-economy-policy-service.js` · `GameEconomyPolicyService` | OBSERVED | source-inspected | `scripts/games/wagers/game-economy-policy-service.js:111` |
| R-GAM-05 | Game settings | `scripts/games/game-settings.js` · `registerGameSettings` | OBSERVED | source-inspected | `scripts/games/game-settings.js:311`; `scripts/core/settings.js:679` |
| R-GAM-06 | Accepted-invite materialization | `scripts/games/game-session-materializer.js` · `GameSessionMaterializer` | OBSERVED | source-inspected | `scripts/games/game-session-materializer.js:1` |
| R-GAM-07 | Multiplayer invite session creation | **Holonet** `HolonetMessengerService._gmCreateGameInvite` (writes `GameSessionStore`) | OBSERVED · CONFLICT (second session creator, F-GAM-001) | behavior-code-verified | `scripts/holonet/subsystems/holonet-messenger-service.js:2505`, `:2543` |
| R-GAM-08 | GM approval of pending settlements | `scripts/ui/shell/gm/GMApprovalOperationsService.js` → `approvePendingSettlement` | OBSERVED | source-inspected | `scripts/ui/shell/gm/GMApprovalOperationsService.js:479`; `scripts/games/wagers/game-credit-escrow-service.js:1046` |

## 3. Authorities

- **Canonical data:** game sessions → one world setting (GM-written). The escrow record lives inside the session (`escrow.credits`).
- **Rules:** minigame rules live in the engines. They are not SWSE mechanics, so A-11 does not apply. Remaining runtime checks are listed in `docs/Holopad-Games-Phase-10-QA-Rules-Fidelity-Audit.md:77`.
- **Calculation:** pot = Σ buy-ins + house stake. Payout policy is set by `GameEconomyPolicyService` (GM settings). PvP payouts are `automatic` with no cap enforced at the escrow boundary (F-GAM-003).
- **Mutation/persistence:** **A-10 check: every debit, payout and refund goes through `TransactionEngine.executeCreditAdjustment`** (`scripts/games/wagers/game-credit-escrow-service.js:119`, `:390`, `:432`, `:560`, `:767`, `:867`, `:996`, `:1073`). There is no parallel credit ledger; the escrow record is metadata. Multi-seat atomicity is a compensating saga (per-seat debits, with refunds of applied debits on failure at `:100`; rollback of applied payouts at `:379`). It is not a single transaction (F-GAM-002).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `GameSessionStore.upsertSession` | `scripts/games/game-session-store.js:103` | 16 (module) | whole-array world-setting write + `swseGamesUpdated` |
| `GameCreditEscrowService.prepareEscrow` | `scripts/games/wagers/game-credit-escrow-service.js:713` | Pazaak/Sabacc/Hintaro solo paths | debit buy-ins; on failure, refund applied debits |
| `GameCreditEscrowService.settleSession` | `scripts/games/wagers/game-credit-escrow-service.js:844` | Pazaak | winner payout; idempotent on persisted `settled` status |
| `GameCreditEscrowService.settleTableCreditBalances` | `scripts/games/wagers/game-credit-escrow-service.js:916` | Sabacc, Hintaro | per-seat cashout; on failure, roll back applied payouts |
| `GameCreditEscrowService.approvePendingSettlement` | `scripts/games/wagers/game-credit-escrow-service.js:1046` | GM approvals | GM-adjusted payout |
| `GameCreditEscrowService.refundSession` | `scripts/games/wagers/game-credit-escrow-service.js:1138` | cancel paths | refund escrowed buy-ins |
| `GameEconomyPolicyService.evaluateCreditSettlement` | `scripts/games/wagers/game-economy-policy-service.js:111` | escrow | policy decision |
| `registerGameSettings` | `scripts/games/game-settings.js:311` | `scripts/core/settings.js:679` | settings |

## 5. Dependencies

- **Allowed:** TransactionEngine, LedgerService (fund validation), Holonet notifications, settings.
- **Prohibited:** direct credit writes; Holonet internals.
- **Observed:** games → holonet has 8 edges and holonet → games has 12 (a mutual dependency). Holonet creates invite sessions and calls the materializer; games call Holonet notification services. ui-shell → games has 22 edges (`scripts/ui/shell/GamesSurfaceController.js`, `scripts/ui/shell/GamesSurfaceService.js`).

## 6. Integration points and lifecycle

Settings are registered at `scripts/core/settings.js:679`. Solo AI games are created by each engine and wagered via `prepareEscrow`. Multiplayer games are invited through the Holonet messenger, accepted via `GameSessionMaterializer.materializeAcceptedInvite`, and played through the GM/socket relay. Wagered sessions use `authorityMode: 'gm'` (`scripts/games/games/sabacc/sabacc-engine.js:928`). Hook emitted: `swseGamesUpdated` (`scripts/games/game-session-store.js:93`).

## 7. Failure behavior and domain invariants

- D-GAM-1 (APPROVED, TI4-C0 G22): refunds and rollbacks are replay-safe and record which payout they reverse. Test-verified.
- D-GAM-2 (OBSERVED): escrow failure refunds every applied debit. If a refund fails, the session is stored as `refund-failed` with evidence (`scripts/games/wagers/game-credit-escrow-service.js:777-805`).
- D-GAM-3 (PROPOSED): conservation. In a player-pool session, Σ payouts ≤ escrowed pot, enforced at the escrow boundary (UNIMPLEMENTED, F-GAM-003).
- A-02, A-10 and A-16 apply. No caches were observed.

## 8. Level C subsystem contracts

- **C-GAM-1 Games ↔ TransactionEngine.** Contexts `game-credit-escrow`, `game-credit-payout`, `game-credit-refund`, with `escrowId` and seat in the audit record. Status: APPROVED · OBSERVED.
- **C-GAM-2 Holonet invite ↔ Games session.** The invite writes a session with `wagerProfile`, and the materializer builds game state. Status: OBSERVED · CONFLICT (wager vocabulary mismatch, F-GAM-001).

## 9. Tests and certification

`tests/ti4c0-g22-wager-refund-replay.test.mjs` passes offline (83/83). It is the only domain test. There are no engine rule tests in the census list for this domain. Foundry acceptance: `docs/Holopad-Games-Phase-10-QA-Rules-Fidelity-Audit.md:77` "Remaining runtime checks" have not been run. Wager flows are FOUNDRY_ACCEPTANCE_REQUIRED (credit movement).

## 10. Reconciliation with existing contracts

Agreements: `scripts/games/wagers/game-credit-escrow-service.js:1-8` states that every credit change goes through TransactionEngine, and the code confirms it. This matches A-10 and `docs/audits/transaction-integrity/ti4-c0-closure-report.md:33`.

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-GAM-01 | OSI A-10 "a trade is atomic — any failure fails the whole trade" | atomic multi-party credit movement | per-seat sequential adjustments plus compensating refunds. Failure is handled, but a crash or reload mid-sequence leaves partial debits recorded only in the TransactionEngine ledger (in-memory guards, see `docs/audits/transaction-integrity/ti4-c0-closure-report.md:50`) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-GAM-001 | medium | confirmed | Holonet multiplayer invites write `wagerProfile.mode: 'credit-buy-in'`, which escrow does not recognize, so PvP wagers are never escrowed or paid |
| F-GAM-002 | medium | confirmed | Wager atomicity is a compensating saga, not one transaction; escrow state is persisted only after all debits |
| F-GAM-003 | medium | suspected | No conservation check (Σ payouts ≤ pot) at the escrow boundary for player-pool cashouts |
| F-GAM-004 | low | suspected | Settlement idempotency relies on the caller's session snapshot; payout completes before `settled` is persisted |
| F-GAM-005 | low | confirmed | Mutual games↔holonet dependency; Holonet is a second creator of game sessions |
| F-GAM-006 | low | suspected | `gamesSessions` is one whole-array world setting rewritten on every move |

No invariant probe hits in this domain (census). No multi-domain mechanical leads.

## 12. Unimplemented, deferred and acceptance-required

- U-GAM-01 UNIMPLEMENTED: PvP credit wagers through Holonet invites (F-GAM-001).
- U-GAM-02 UNIMPLEMENTED: durable recovery for interrupted escrow/settlement (TI4-C0 L3).
- DEFERRED_RULES_REVIEW: none. Minigame rules are not SWSE mechanics. House stake and AI payout caps are GM economy settings.
- FOUNDRY_ACCEPTANCE_REQUIRED: one wagered game per engine (escrow → settle and escrow → cancel → refund), the GM pending-settlement approval, and the runtime checks in `docs/Holopad-Games-Phase-10-QA-Rules-Fidelity-Audit.md:77`.
