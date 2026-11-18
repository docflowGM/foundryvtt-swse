# Class Realignment IV — Phase 6AA: all-or-nothing paid reaction

**Date:** 2026-11-17
**Parent:** Phase 6Z draft PR #1159 (corrective head `662632c641317618807eee1c3077e328e66e6744`).
**Boundary:** Existing ActorEngine Force Point SSOT + reaction payment call only; no new force-power, technique, secret, maneuver or effect executor.
**Certification:** Implementation submitted for independent review. Exact-head offline CI and Foundry V13 live certification are separate.

## Verified cost/receipt defect

`ReactionEngine.resolveReaction` requires `payment.spent === requiredForcePoints`
before invoking its handler (Phase 6Y). But the canonical
`ActorEngine.spendForcePoints(actor, amount)` is **best effort**: if the
actor has 1 total FP and a reaction's registered cost is 2, the service
subtracts 1 and emits a `committed:true` spend receipt for 1, then
ReactionEngine correctly refuses to execute the unpaid reaction. This is
a **partial loss of FP for a rejected action**. It can also trigger a
Sith Lord Temptation consequence despite full action payment failing.

Previously, Phase 6Y identified this as an indeterminate partial payment
requiring GM review; Phase 6AA prevents it on the scoped reaction path
rather than trying to refund mixed bonus and normal pools.

## Implementation

- Add **opt-in** `options.requireFullAmount === true` to the existing
  `ActorEngine.spendForcePoints`, *after* the canonical bonus-first +
  `ForcePointsService.calcSpend` computation but **before** any Actor
  mutation or typed `swse.resourceSpent` hook.
- Strict requests with invalid integral amounts or insufficient eligible
  resources return `spent:0, rejected:true` and an explanatory reason;
  no pool changes and no committed event.
- Both bonus and normal pool allocation and `normalOnly` restrictions
  continue to be evaluated by ActorEngine. Successful strict payments
  still produce exactly one typed committed receipt.
- `ReactionEngine` opts in with `requireFullAmount:true`.
  The existing `payment.spent !== requiredForcePoints` check continues
  to fail closed.
- **No default-behavior change** for other callers: absent the strict
  option, the pre-existing best-effort calculation remains in force.
  This is deliberate to avoid unreviewed effects on the concurrent
  Force Power/Technique/Secret and Ship Maneuver refactor.

## Regression requirements

`tests/class-phase-6aa-all-or-nothing-fp-spend.test.mjs` grafts the **real**
ActorEngine FP method into the existing Foundry shim and verifies:
strict 2-cost vs 1-available refusal without mutation/receipt; valid
bonus-first mixed-pool payment; normalOnly with only bonus points;
unmodified non-strict behavior; reaction's explicit strict option and
fail-before-write/receipt ordering.

## Remaining constraints

1. This opt-in gate is not a cross-client compare-and-swap transaction.
   Concurrency on the same actor across multiple owners/GM sessions still
   requires Foundry live testing and potentially a shared mutation arbiter.
2. Generic reaction action economy, eligibility and Force Reflection's
   placeholder handler are distinct unfinished features. Do not claim
   they are completed by a paid FP receipt.
3. Temptation's `Hooks.callAll('swse.resourceSpent')` event remains
   **client-local**. This does not solve distributed delivery.
4. ActorEngine is a shared contract also used by the parallel Force-content
   refactor. Reconcile this additive option before consolidating branches.
5. All Force Phase 6J–6AA implementation PRs remain **draft and unmerged**
   pending exact-head validation, independent review and actual Foundry
   V13 acceptance. Do not merge stacked PRs out of order.
