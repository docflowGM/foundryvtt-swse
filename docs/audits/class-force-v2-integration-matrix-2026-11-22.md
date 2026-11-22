# Class/Force ↔ Force V2 integration — slice status and per-contract matrix

**Branch:** `integration/class-force-v2-20261122` (isolated; base = Force V2 head `046f7389c`, PR #1165, pinned game-night line preserved). **Not for `main`. #1165 untouched, no rebase, no force-push.** Owner direction: PR #1171 comment, 2026-11-21. Nothing here is `FOUNDRY_TESTED`; all results are offline (Node + Foundry shim). No rules were decided.

## 1. Slice status

| Slice | Chain phases (PR tip) | Result | Integration SHA | Conflicts |
| --- | --- | --- | --- | --- |
| 1 | 6J Fallen Jedi gate, 6K Fearless/Indomitable policy, 6L Prophet vision finalization (#1123 tip `46f14a92b`) | **Merged clean** | `eb7aa5379` | 0 |
| 2 | 6M Jedi Master Serenity (#1124 tip `ba1c52256`) | **Merged, 1 file / 2 hunks resolved** | `b890deeda` | `roll-core.js` |
| 3 | 6N Sith Lord Temptation (#1125 tip `4c6803c23`) | **NOT merged — design decision needed (§3)** | — | 6 files, 7 hunks |
| 4+ | 6O…6AE (#1126–#1164) | Not started; all depend on slice 3 | — | 7–9 files each |

Dry-merge conflict counts of each chain tip against the V2 head: 6J/6K/6L = 0, 6M = 1 (`roll-core.js`), 6N = 6, 6O–6X = 4–7, 6Y–6AE = 9 (adds `reaction-engine.js`, `reaction-registry.js`).

## 2. Verification

Focused matrix (force / reaction / receipt / temptation / serenity / prophet / fearless / indomitable / fallen / sith / progression-finalizer / turn / class-phase-6 / roll-expression / actor-engine / roll tests):

| Point | Pass | Fail | Notes |
| --- | ---: | ---: | --- |
| V2 head baseline | 43 | 5 | the 5 are the documented pre-existing Force-power-track failures CI already excludes (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`) |
| After slice 1 | 46 | 5 | +3 new class-phase-6j/6k/6l tests; **0 regressions** |
| After slice 2 | 58 (63 tests incl. broadened `roll-` pattern) | 5 | +`class-phase-6m-serenity-temporal-roll`; **0 new failures** |
| Progression / level-up / chargen / finalizer tests after slice 1 | 52 | 0 | `progression-finalizer.js` auto-merged and verified behaviorally |

## 3. Slice 3 — why it is not a textual merge

| Contract | Force V2 (authoritative; kept) | Class/Force 6N | Required resolution |
| --- | --- | --- | --- |
| Spend authority | `ActorEngine.spendForcePoints(actor, n, context)`: `requestId`, `ForcePointsService.authorizeSpend`, per-actor `withForcePointQueue` | `spendForcePoints(actor, n, options)` with `{deferResourceEvent}` and a post-commit hook | Keep V2 signature/queue/authorization; drop 6N's rewrite of the function body |
| Receipt model | persisted ledger `flags.swse.forcePointLedger.receipts`, states `committed → finalized`; `finalizeForcePointSpend(actor, receipt)` after the paid effect really occurred; finalized receipts count toward round limit and are never refundable | ad-hoc `swse.resourceSpent` hook with a random receipt id (`ActorEngine` and `RollCore` each emit one) | Temptation must be keyed to **V2's receipt id**, not a second receipt |
| Failed paid roll | RollCore finalizes only after the paid check executed; refunds do not apply after application | "Failed paid rolls are refunded and must never trigger Temptation" | Equivalent intent: trigger only on a **finalized** V2 receipt |
| `force-engine.js` | V2 removed the direct spend block | 6N routes it through `ActorEngine.spendForcePoints(actor, 1)` | V2 wins (delete) |
| `spend-coordinator` | passes `spendContext` | passes `{deferResourceEvent:true}` | `deferResourceEvent` obsolete if the trigger moves to finalize |
| take-X guard (slice 2) | "a fixed take-X result cannot silently discard a requested paid bonus" | n/a (Serenity) | **Resolved in slice 2:** V2 guard kept first and unchanged |

**Proposed design (engineering, no rules change):** V2 already pairs every paid spend with `finalizeForcePointSpend` (call sites: `swse-actor-base.js:310`, `force-point-transaction.js:158`, `force-suite.js:332`, `reaction-engine.js:423`, `contracted-force-point.js:53`). Emit the Temptation trigger from the single `committed → finalized` transition in `ActorEngine.finalizeForcePointSpend`, carrying V2's `receiptId`, and delete 6N's two hook emitters and `deferResourceEvent`. This preserves 6N's rule "only an actual positive authoritative spend triggers Temptation, never inferred from pool deltas" and its "failed paid rolls never trigger".

**Open items before slice 3 can be implemented**
1. **Un-finalized spends:** `enhanced-rolls.js:1875` and `meta-resource-feat-resolver.js` (3 sites) call `spendForcePoints` in the lines inspected without an adjacent finalize. Each must be audited: a spend that is never finalized would never trigger Temptation, which would silently weaken 6N's behavior. 6X ("close reachable Dark Side talent Force Point receipt bypasses") and 6Y–6AA (paid reaction receipts) touch exactly these paths and overlap V2's own reaction finalization.
2. **Take-X + Force Point under Serenity:** V2's guard returns its error even for a Serenity-eligible actor. This is the conservative combination; if different behavior is wanted it is an owner decision, not made here.
3. Later phases (6T ordinary-only Watchcircle spend, 6Y–6AA reactions) overlap V2's reaction work and must be re-derived on V2 receipts, not merged.

## 4. Gate before anything leaves this branch
Combined focused tests green after every slice; separate acceptance review; `main` untouched; never marked `FOUNDRY_TESTED` without a live Foundry v13 run.
