# Class Realignment IV — Phase 6AC: serialize target-owned Temptation marks

**Date:** 2026-11-17  
**Parent:** Phase 6AB draft PR #1161 at `878fb3af04f3990e4bb7fb2901a8235bdc8dc5f2`.  
**Scope:** Sith Lord Temptation activation/target ledger writes. No Force Power, Force Technique, Force Secret or Ship Maneuver executors.

## Confirmed concurrency defect

The original `SithLordTemptationService.activate()` held `locked(sith)`
through an `ActorEngine.applyMutationPlan(target, {set:plan.updates})`.
This serializes activations by a **single caster**, not writes to the
**target-owned** `TEMPTATION_PATH` array. Two Sith Lords can concurrently
pass their own action checks, each snapshot the target's prior marks,
and persist replacement arrays that omit the other's valid mark.

Simply wrapping that write in a target lock **inside** the caster lock
would risk deadlock if two Sith Lords target each other concurrently:
client 1 holds A, waits for B; client 2 holds B, waits for A.

## Two-stage correction

1. Under the existing **caster** queue, verify GM, owned Sith Lord access,
   active turn, GM line-of-sight confirmation and Will target; commit the
   standard action; execute the Persuasion check.
2. A failed check returns with `applied:false`; the spent standard action
   remains spent. Any post-roll rejection requires GM review. An
   incomplete roll continues to use the existing action rollback path.
3. For a successful check, stage only immutable numeric
   `checkTotal`/`willDefense` data and **release** the caster queue.
4. Acquire the **target** queue, verify combat identity/current turn and
   class feature access again, then **recompute**
   `planTemptationMark` from the latest persisted target ledger.
5. Commit the mark via existing transactional ActorEngine mutation. If
   the source changes before this write or persistence fails, do not
   refund the already-completed roll; report a post-roll GM review.
6. Reject caster==target before consuming any action.

This is an in-process serialization correction, NOT a distributed
transaction or a new mechanical authority. Existing action, roll,
ActorEngine, eligibility and consequence services remain unchanged.

## Regression tests

`tests/class-phase-6ac-temptation-target-mark-serialization.test.mjs`:
- Two distinct Sith Lords writing marks against one target retain both.
- Reciprocal actor operations acquire actor queues in separate stages
  and do not nest two locks.
- Production source checks that caster stage ends before target queue,
  target re-plan is inside that queue and still invokes ActorEngine.
- Encounter/turn and class-feature access are rechecked before the mark.

## Remaining constraints

- Separate Foundry clients have separate in-memory actor serializers.
  Two independently authorized writers can still race across clients:
  Foundry's standard actor update API provides no demonstrated CAS.
- The current Sith Lord action requires GM confirmation. Actual
  multi-GM, multi-tab, remote-owner and synthetic-token behavior must
  be tested in Foundry V13 before claiming correctness.
- Pending consequence receipt delivery remains client-local. Do not
  use an unverified socket packet as authorization to inflict a penalty.
- Exact-head CI and Foundry live acceptance remain required.
- Keep this PR draft and stacked, do not merge out of order.
