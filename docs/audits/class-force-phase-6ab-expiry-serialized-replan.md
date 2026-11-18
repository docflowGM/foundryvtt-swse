# Class Realignment IV — Phase 6AB: Temptation expiry serialization

**Date:** 2026-11-17  
**Parent:** Phase 6AA draft PR #1160, head `b543c7eb95ca373bda52d4ec38ee932debdb530c`.  
**Scope:** Sith Lord Temptation encounter-expiry only; no Force Power, Technique, Secret or Ship Maneuver changes.

## Verified race

`SithLordTemptationService.expireCombat()` previously computed
`expireTemptationEntries(target, combat, ...)` **before**
`locked(target, ...)`. A pending same-client `consumeSpendReceipt()` or
target-ledger mutation could therefore be in progress while expiration
waited for the actor queue. Its pre-lock array was a stale snapshot:
eventually writing that snapshot could discard newly installed marks,
resurrect expired entries, or otherwise lose a concurrent ledger update.

The per-actor promise serializer had been introduced in Phase 6W for
sequential receipt handling. Expiry's planning must use that **same**
critical section, not just protect its eventual write.

## Correction

Move the read, pure `expireTemptationEntries` calculation, changed check,
and `ActorEngine.applyMutationPlan` under one `locked(target, async()=>{})`
callback. The callback does no update when the current rows are unchanged.
The actor is read again after previously queued work completes. No
additional state store, hook, socket, policy engine or character schema.

## Regression evidence

`tests/class-phase-6ab-temptation-expiry-serialization.test.mjs` checks:
- stale pre-lock snapshot versus freshly queued plan with a new mark
  installed before expiry acquired the actor queue;
- old mark expires while new current-turn mark survives;
- already recorded pending spend consequences are untouched;
- a failed prior queued operation releases the queue for expiry;
- the real service's expiry method calculates strictly **inside** the lock
  and uses transactional ActorEngine mutation.

The concurrency simulation verifies the **local queue ordering contract**;
it does not emulate Foundry socket delivery or cross-client writes.

## Limitations and remaining blockers

1. The activation path takes the Sith Lord caster lock, then writes a
   *target*-owned mark array. Multiple independent Sith Lords can still
   race on the same target across their separate actor queues; a
   target-transaction design is necessary for full convergence. Avoid
   naïvely nesting caster and target locks, which may deadlock if two
   Sith Lords target each other concurrently.
2. Client-local `Hooks.callAll('swse.resourceSpent')` does not guarantee
   authenticated cross-client delivery. Existing Holonet socket payloads
   are not an authenticated transaction protocol; do not use them to
   manufacture spending consequences from unverified requests.
3. Expiry candidate discovery may omit unlinked actors outside the
   current canvas. GM live tests are required for token/synthetic actors,
   deleted scenes, multiple GMs, and reconnects.
4. Exact-head CI and Foundry V13 live certification are separate gates.
   All stacked Force-class PRs remain draft/unmerged.
