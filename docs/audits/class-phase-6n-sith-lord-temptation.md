# Class Phase 6N — Sith Lord Temptation

**Date:** 2026-11-07
**Source:** *Star Wars Saga Edition Core Rulebook*, printed p. 224, Sith Lord — Temptation.
**Branch:** `feat/class-force-6n-sith-lord-temptation` (stacked on Phase 6M).
**Status:** First bounded integration and tests; **NOT Foundry v13 live certified**.

## Printed rules
As a standard action, the Sith Lord rolls Persuasion against one opponent's Will Defense, within line of sight. Success establishes a delayed trigger. **Only** if that opponent actually spends a Force Point before the Sith Lord's **next turn** must the target choose between +1 Dark Side Score or -1 step on its condition track. Spending a Destiny Point instead requires the target's choice between +2 DSP or -2 condition steps. The initial check does **not** grant the attacker a consequence choice or immediately lower condition.

The Sith Lord's ongoing printed `DSP >= Wisdom` class-feature gate (Core p.224) is enforced at activation using the existing Phase 6H class access resolver.

## Architecture
- GM-confirmed opposing target and LOS in `openSithLordTemptation`; no new map LOS engine or inferred allegiance.
- Existing V2 `ActionEconomyConsumption.spend(...,'standard')` pays for the action **before** `rollSkill(sith,'persuasion')`. Failed check still spends action. Failed/aborted rolls perform action rollback when possible.
- Success installs the **target-owned** `flags.swse.classFeatures.sithLord.temptation` active record with actor UUID, source Combatant identity, combat ID and turn. It does not change DSP or condition.
- Existing `ActorEngine.spendForcePoints` and `ActorEngine.spendDestinyPoints` emit typed `swse.resourceSpent` receipts **after successful mutation**, including actual amount spent and an event ID. Existing `ForceEngine.spendForcePoint` and `SWSEActorBase.spendDestinyPoint` are converged onto those authoritative methods, not extra pool writers.
- One committed spend event creates idempotently keyed pending consequence(s) in target's `flags.swse.classFeatures.sithLord.temptationEvents`. This persists even if the UI closes.
- Affected target owner or GM (not Sith Lord) chooses the outcome through `SWSEDialogV2`. DSP calculation uses existing `DSPEngine.getNextValue`; condition movement uses `ConditionTrackRules.resolveConditionShift`; `ActorEngine.applyMutationPlan` commits the chosen stat and resolution ledger together, preserving a pending case if an error occurs.
- Hooks expire the active trigger at the source Sith Lord's next combat turn or encounter end. Unresolved consequence records survive expiration so the GM can adjudicate a genuine previously-spent resource.
- Public API: `game.swse.classFeatures.sithLordTemptation.open(sithActor)` and `reviewConsequences(targetActor)`.

## Architecture and acceptance limits
- Source, data, and isolated Node tests are not a Foundry v13 runtime certification. In particular, `Hooks.callAll('swse.resourceSpent')` is **local to a running client**. This consumer can respond when spending occurs on that client, and pending consequences persist on the affected Actor, but additional GM/client replay or socket receipt distribution is required to prove cross-client/unloaded-actor coverage. Do not claim all spends/clients are wired.
- Do not silently infer a spend from actor resource values. Other direct resource writers that still bypass `ActorEngine.spendForcePoints` / `spendDestinyPoints` are **not certified**. A read-only inventory of these must precede all-path certification.
- A target may choose one consequence for each verified spend during the trigger window; multiple simultaneous Temptation sources are tracked separately. GM may defer an unresolvable choice; no arbitrary default.
- The condition cap, full Dark Side maximum/fulfillment interactions and multiple simultaneous cross-client actor edits require live Foundry checks. A failed roll or action refund/mutation must not claim success.
- Test source: `tests/class-phase-6n-sith-lord-temptation.test.mjs` and rolling CI at exact head.

## Manual Foundry acceptance
1. Sith Lord with class Item and DSP >= Wisdom enters live combat, GM chooses one other token and confirms LOS.
2. Pay standard action, make Persuasion vs Will. On failure, no target mark. On success, target mark until source's next turn.
3. Spend an FP on the target through canonical RollCore/ActorEngine. Confirm a *target-owned* choice between +1 DSP or one worsening CT step, once per confirmed spend.
4. Spend a DP through Actor `spendDestinyPoint` and `ActorEngine.spendDestinyPoints`; verify +2 DSP or two worse CT steps. Cancel leaves pending GM adjudication, not an assumed choice.
5. Reject fake `swse.resourceSpent` payloads, duplicates, zero-point/noncommitted spends and events for another target/encounter.
6. Advance to Sith Lord's next turn and end combat; verify active entries expire, while genuine pending consequences remain for GM resolution.
7. Test source DSP below Wisdom, second actor without Sith Lord levels, non-owner permissions, ineligible LOS, failure paths and charge rollback.
8. Cross-client peer/GM and token-unlinked scene reload tests. Record any unobserved mutation paths as unimplemented; do not silently certify.

**Note:** This is an actionable GM-assisted feature, with a remaining distributed event-delivery audit. It should stay draft until no bypasses or missed cross-client spends remain.
