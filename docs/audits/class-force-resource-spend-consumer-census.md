# Force-class Temptation: FP/DP Spend Consumer Census (read-only)

**Date:** 2026-11-07. **Branch:** Phase 6T stacked on #1132. **Classification:** Verified source references, not proof of live reachability. This is a triage list; do not substitute regex matches for an execution-path audit.

The Sith Lord Temptation trigger in Phase 6N operates on **actual committed FP/DP spends**, not arbitrary pool values. Core p.224. The code now emits typed `swse.resourceSpent` receipts from `ActorEngine.spendForcePoints` and `ActorEngine.spendDestinyPoints`. Any live direct pool deduction that bypasses those methods represents a potentially missed Temptation trigger.

## Confirmed conversions in the stack

| Caller | Behavior | Status |
| --- | --- | --- |
| `scripts/actors/base/swse-actor-base.js` | Actor destiny spending | Phase 6N: delegates to `ActorEngine.spendDestinyPoints` |
| `scripts/engine/force/force-engine.js` | Generic direct FP spending | Phase 6N: delegates to `ActorEngine.spendForcePoints` |
| `scripts/engine/roll/roll-core.js` via `ForcePointSpendCoordinator` | FP bonus die spent before main roll, refunded on failure | Phase 6N: deferred receipt after successful main roll |
| `scripts/combat/rolls/force-point-transaction.js` | Attack FP commit with later rollback | Phase 6O: deferred receipt on final/announced transaction |
| `scripts/engine/talent/consular-talent-actions.js` `_spendNormalForcePoint` | Watchcircle Initiate must pay ordinary FP (not bonus points) | Phase 6T: `ActorEngine.spendForcePoints(...,{normalOnly:true})` |

## Identified direct FP deductions requiring reachability and transaction review

| Consumer/source | Source pattern | Risk/next action |
| --- | --- | --- |
| `scripts/talents/DarkSidePowers.js` | Several direct `ActorEngine.updateActor({'system.forcePoints.value': currentFP - 1})` paths, including Channel Aggression, Channel Anger, Crippling Strike, Dark Side Talisman, Sith Alchemical Weapon; helper `_spendFP` | Determine whether these older action handlers are reachable in V2. If active, replace with existing spender at the correct commit point; if dead, remove via a separately verified legacy cleanup. Do not blindly duplicate their newer dedicated talent service. |
| `scripts/engine/talent/dark-side-devotee-mechanics.js` | Direct FP deduction for Dark Side Talisman | Inventory active caller and overlap with `DarkSidePowers.js` before replacing. |
| `scripts/engine/combat/threshold-engine.js` | Direct FP deductions for Last Grasp and Emergency Patch | Vehicle system integration may be in-flight on separate draft PRs. Confirm reachability and transaction order, then migrate to spent receipts. |
| `scripts/engine/combat/reactions/reaction-engine.js` | Deducts `forcePointCost` **after** reaction handler via direct update/clamp | May allow an effect without adequate payment and miss Temptation receipt. Requires a reaction transactional redesign or compensation, not a simple text substitution. |

Other `ActorEngine.updateActor` calls writing `system.forcePoints.value` may be legitimate **grants, initialization, forced resets, or reconciliation**. They must not emit a spend event without independent execution evidence.

## Existing canonical spend consumers observed

`force-executor.js`, `force-suite.js`, `jedi-prestige-talent-actions.js`, `sith-talent-actions.js`, `force-adept-talent-actions.js`, `guardian-spirit-actions.js`, `sentinel-talent-actions.js`, `lightsaber-talent-actions.js`, `lightsaber-form-engine.js`, `meta-resource-feat-resolver.js`, `force-power-final-integration.js` and others already have `ActorEngine.spendForcePoints(...)` calls. These are **candidate covered** callers; each still needs a rollback/commit and actual reachability check.

## Release criteria

1. Trace all *active* FP and DP spend paths, including vehicle/reaction and data/compatibility consumers, through one verified, nonrefundable receipt source. Never trigger a Temptation effect for a refunded spend.
2. Cross-client target-owner and GM tests with actual Foundry V13 `Hooks`/document synchronization. Client-local hook delivery alone cannot establish distributed coverage.
3. Ensure receipt IDs and target-consequence ledger are idempotent, protected from duplicate event delivery and replay; ensure pending GM decisions remain visible after scene reload.
4. Do **not** encode a blanket `updateActor(system.forcePoints.value)` delta-watcher: manual edits, nonspend effects, and rollback could generate false Temptation consequences.
5. This read-only census intentionally defers unresolved legacy/vehicle/reaction code. Do not claim full end-to-end Temptation certification on this evidence alone.
