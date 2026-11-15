# Phase 6W — Temptation per-target receipt serialization

**Parent:** Draft Phase 6V PR #1149.
**Scope:** A correctness repair to Sith Lord Temptation (Core Rulebook p. 224).
**Not certified:** Foundry V13 multi-client, cross-user, socket delivery, offline persistence.

## Verified defect

`SithLordTemptationService.consumeSpendReceipt` is reached from an async
`Hooks.on('swse.resourceSpent')` callback. Two legitimately committed FP/DP
spends can arrive while one target's ActorEngine ledger transaction is in
flight. The previous `locks` Set unconditionally threw `Temptation action
already running` for the second callback. Since the hook catches and reports
the exception without persisting the second receipt, this silently loses a
canonical consequence when the second callback cannot be replayed.

## Change

- Keep the existing service and `ActorEngine.applyMutationPlan` authority.
- Replace the throw-on-contention Set with a tiny **client-local**, per-actor
  promise queue (`temptation-actor-serializer.js`).
- Each operation waits for the previous Actor operation before it re-reads
  the pending temptation ledger and applies the next receipt.
- Different actors run independently. A failed operation releases the queue
  without poisoning later committed work.
- No new gameplay store, no speculative source interpretation, no socket
  transport, no resource pool delta watcher.
- Only existing `locked(...)` call sites are affected: activation, spend
  receipt application, consequence resolution, and GM expiry.

## Regression

`tests/class-phase-6w-temptation-serialization.test.mjs` verifies:

1. Two overlapping same-actor receipt handlers execute in arrival order.
2. An unrelated actor's operation proceeds without waiting.
3. Error/rejection on one item does not discard the next.
4. Invalid identity/work fails closed.
5. The live service invokes the queue and no longer uses throw-on-contention.

## Outstanding certification

- Node/headless tests cannot demonstrate distributed GM/owner receipt
  delivery. `Hooks.callAll` remains local to its client. A **separate**
  live Foundry V13 multi-client test is required.
- Race conditions across **different** clients or directly written force
  resource pools are not solved by this in-process queue.
- Independent review, exact-head CI, a real combat-scene acceptance pass,
  and merging the staged 6J–6W PR chain are still pending.
