# Phase 6O — Rollback-sensitive attack FP spend receipt

**Source:** Core Rulebook p.224 (Sith Lord Temptation), and the existing V2 FP transaction contract.
**Parent PR:** #1125 (Sith Lord Temptation). This is a narrowly scoped stacked correction.

## Defect
The attack workflow `SWSERoll.beginForcePointUse` creates `createForcePointTransaction`. Its `commit()` pays through `ActorEngine.spendForcePoints` **before** all potential attack/roll errors have completed. The Sith Lord Temptation event introduced in Phase 6N was fired immediately from `ActorEngine.spendForcePoints`. An attack that then aborted and called `tx.rollback()` would have correctly restored its Force Point but **already have triggered the target's Temptation consequence**. This invents a permanent effect from a refunded spend.

## Correction
- `createForcePointTransaction._commit` pays using `ActorEngine.spendForcePoints(actor,1,{deferResourceEvent:true})`. The pool still commits; only the Temptation notification is deferred.
- `finalize()` and `announce()` are the existing methods after which this FP use can no longer be refunded. Each calls the same synchronous, once-only `publishFinalResourceSpend(tx)` using a stable receipt ID.
- `rollback()` never fires a resource event. A failed/pending/partial transaction cannot produce a receipt. A failed chat presentation cannot revoke a completed point use; its resource receipt is still delivered once.
- This uses the *existing* custom `swse.resourceSpent` hook introduced in #1125, not a second consumer or guessed pool-difference observer.

## Scope/remaining acceptance
- The separate RollCore bonus-die path is already deferred to actual roll success in #1125. This correction covers the independent legacy attack transaction.
- Test: `tests/class-phase-6o-attack-fp-final-receipt.test.mjs` exercises a live factory with an authoritative ActorEngine stub and guards against wrong dispatch ordering.
- Exact-head CI and actual Foundry V13 combat integration still required. Cross-client event propagation remains unverified. Avoid declaring every alternate FP spend pathway certified until audited.
