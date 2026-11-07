# Phase 6T — Ordinary-only FP spends remain visible to Temptation

**Parent:** Phase 6S, #1132. **Canonical behavior:** Sith Lord Temptation (*Core* p.224) reacts to an actual FP expenditure. Watchcircle Initiate's normal FP transfer is a separately governed paid talent use, not an exemption from Temptation.

## Reproduced bypass
`ConsularTalentActions._spendNormalForcePoint` in the Watchcircle Initiate action previously deducted `system.forcePoints.value` with a direct `ActorEngine.updateActor(SchemaAdapters.setForcePointsUpdate(current-1))`. Although this used the governed mutation API, it bypassed the **canonical FP spend transaction** and its typed `swse.resourceSpent` receipt. Sith Lord Temptation would not observe that legitimate FP spend. The direct writer was originally used because Watchcircle Initiate explicitly requires an ordinary, non-temporary FP.

## Implementation
- Add `normalOnly:true` to `ActorEngine.spendForcePoints(actor, amount, options)`. This selects only the persistent Force Point pool; it leaves bonus/temporary entries unchanged, instead of the normal default bonus-first policy. Failure to spend a normal point returns `spent:0` without an event. Other callers retain the default bonus-first selection and original returns.
- `ConsularTalentActions._spendNormalForcePoint` now requests one FP via `ActorEngine.spendForcePoints(actor,1,{normalOnly:true,source})`; only a verified `spent:1,normalSpent:1` counts. Its resulting post-commit receipt enters the **same** Temptation event lane, rather than building a new event producer.
- No change to Watchcircle's grant to an ally, other Consular talents, class feats, or general Force Point recovery.

## Regression/acceptance
`tests/class-phase-6t-normal-fp-spend-authority.test.mjs` exercises real ActorEngine spend methods grafted onto the offline shim, checks permanent FP, unchanged bonus ledger, no event on insufficient normal pool, default bonus-first behavior, and a single typed spend event. Test Watchcircle Initiate against an active Temptation source in Foundry V13 to ensure one consequence is offered after the point is actually spent and the non-temporary restriction is preserved. Exact-head CI and cross-client event delivery still required.
