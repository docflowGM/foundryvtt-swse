# Class Force Phase 6U - Divergent draft closure

**Date:** 2026-11-07
**Base:** Phase 6T at `afcb83c394f4091f71957a3a77cc88fc6842eeea`
**Status:** Implementation convergence for independent review. This is not live Foundry V13 certification.

## Why this changeset exists

The Force prestige-class work forked after Phase 6N into two separate draft lines:

- Phase 6O typed-effect ingress / Phase 6P GM Prophet vision review (#1126, #1127).
- Phase 6O paid-attack receipt finalization through Phase 6T (#1128-#1133).

The later Phase 6R (#1131) already provides typed immunity gating at both ActorEngine effect writers through `class-feature-effect-admission.js`. Re-adding `force-class-effect-ingress.js` from #1126 would create a competing policy. Therefore **do not wholesale merge #1126**.

The useful independent functionality from #1127 is the **GM Prophet vision completion workflow**. The other #1127 fixes to the ForcePointSpendCoordinator, RollCore and Temptation expiry already exist on the later branch. Its condition-track truncation guard was still missing.

## Changes in 6U

1. Port pure `planProphetVisionReview()` and GM-only `openProphetGmVisionReview()` from #1127, preserving the Prophet award ledger and ActorEngine mutation authority. Explicit GM text is recorded; **no automatic destiny selection, refund or additional award**.
2. Expose `game.swse.classFeatures.forceDiscipleProphet.review(actor)` through existing `index.js` API.
3. Add a GM-only actor-sheet V13 header control **only** when a genuine Force Disciple owns a recorded, unresolved Prophet vision choice. Player controls, ordinary feats and completed visions do not qualify.
4. In Sith Lord Temptation resolution, reject condition-track options if `ConditionTrackRules.resolveConditionShift()` reports fewer applied worsening steps than the published consequence requires. Keep the event pending rather than falsely recording success at the condition cap.
5. Carry the separate Prophet unit tests, extend header-control tests, and add a Temptation gate regression.

## Hardening still requiring real runtime evidence

- All client-local `swse.resourceSpent` receipts must be checked on **two actual Foundry clients** (GM and target owner), including unloaded actors, synthetic actors, reconnected users, sequential and concurrent spends. Do not claim this is solved solely by headless tests.
- Foundry ActorEngine writes, permissions, peer state updates and rendered dialogs must be live-tested.
- Verify Serenity's next-round actual natural 20 evaluation, including attack and Use the Force path behavior, and isolate unsupported complex dice formulas.
- Complete a source-mapped audit of untyped effect/condition mutation sites before claiming global Indomitable or Fearless interception.
- Include the GM Prophet vision workflow in the live Force Disciple level-up and reload matrix.
- Test the consolidated result at the exact head and distinguish existing unrelated failed tests from regressions.

## Release policy

The implementation is suitable for **draft review only** until CI and the separate live Foundry V13 acceptance requirements pass. Do not conflate merging code, passing CI and certifying live gameplay. Do not independently merge the abandoned #1126/#1127 branches onto main after 6U has converged their relevant functionality.
