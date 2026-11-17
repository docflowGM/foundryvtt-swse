# Class Force Phase 6X — Live Dark Side talent Force Point receipts

**Date:** 2026-11-17
**Parent:** Draft Class Phase 6W PR #1150, head `f2bdc9168c62ee67723880f28b19ea0f17bfb8ca`.
**Scope:** Published talent **payment/receipt integration** required for the Sith Lord Temptation class feature, not a Force Power/Technique/Secret catalog or engine refactor.
**Status:** Implemented for the named reachable talent macros; exact-head CI and Foundry V13 certification are separate gates.

## Confirmed reachability and defect

`scripts/talents/dark-side-powers-init.js` exposes user-visible macros calling
`DarkSidePowers.triggerChannelAggression`,
`triggerChannelAnger`, `triggerCripplingStrike`,
`createDarkSideTalisman`, `activateSithAlchemicalBonus`,
and Sith crafting actions. These live paths previously deducted normal Force
Points through `ActorEngine.updateActor` using a computed
`system.forcePoints.value = currentFP - 1` value or the `_spendFP` helper.
Those direct updates did not emit the typed post-commit
`swse.resourceSpent` receipt used by Sith Lord Temptation, so a legitimate
spend could miss the target-owned consequence.

An **alternate**, also macro-exposed `DarkSideDevoteeMechanics.createDarkSideTalisman`
path exists through `dark-side-devotee-init.js`. The two macro registration
routes can overwrite the same global macro name depending on registration
order. Both were updated for this narrow receipt problem; this change does
**not** pretend to have reconciled the overlapping talent activation APIs.

## Implementation

- Replace five direct FP deltas in `scripts/talents/DarkSidePowers.js`
  with the local `_spendFP(actor, 1)` helper and fail-closed `ok` checks.
- Change `_spendFP` to delegate to the **existing**
  `ActorEngine.spendForcePoints` authority and require `receipt.spent === amount`.
  Return the actual `receipt.remaining`, not `before-amount` (bonus FP can
  be spent first by canonical policy). This also covers the existing
  four Sith Amulet/Armor/Weapon craft completion/activation consumers.
- Change the independent
  `scripts/engine/talent/dark-side-devotee-mechanics.js`
  talisman creation payment to the same canonical spender.
- The existing `spendFP = false` opt-out in these talent signatures is
  preserved. No new automatic payment is imposed on an explicitly free use.
- No direct mutation path, alternate resource engine, synthetic receipt,
  Force Power catalog or character progression authority was introduced.

## Testing scope

`tests/class-phase-6x-dark-side-talent-spend-ingress.test.mjs`
asserts source-path coverage and guards against the direct FP write returning.

`tests/class-phase-6t-normal-fp-spend-authority.test.mjs` already uses real
ActorEngine FP methods under a Foundry test shim and confirms committed receipts
and bonus-first/normal-only pool behavior; Phase 6X does not replace that
authority. This new static regression is **not proof** that all macro flows
work live, and the V13 resource accounting/reconnect matrix remains necessary.

## Remaining release gates

1. Verify the two macro registrations and their actual boot/load priority.
   Decide which owns each talent surface in a **separate SSOT refactor**;
   do not duplicate class/Force-content functionality here.
2. Validate that actions consume the correct action economy, are committed
   only when successful, and surface recoverable failed post-payment effects.
   This patch deliberately preserves existing payment-before-effect timing.
3. Other direct spend consumers remain under audit: reaction engine,
   vehicle threshold actions, weapon attunement, other talent/ability services.
   Some may have refund or transaction semantics and are not safe to
   mechanically text-substitute.
4. Verify Temptation delivery on **GM + affected player client**,
   specifically when the spender is remote, reconnects, and owns synthetic
   or unloaded actors. Per-client `Hooks.callAll` and a promise serializer
   are not authoritative cross-client transport.
5. The Phase 6J–6X PR stack remains draft/unmerged until independent review,
   exact-head CI, and live Foundry V13 acceptance.
