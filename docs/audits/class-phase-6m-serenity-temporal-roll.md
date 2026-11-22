# Phase 6M — Jedi Master Serenity

**Source:** *Saga Edition Core Rulebook*, Jedi Master, printed p. 220.
**Branch:** `feat/class-force-6m-serenity-temporal-roll`.
**Parent:** Phase 6L Prophet branch; stacked PR for independent review.
**Status:** Implementation and Node tests pushed; live Foundry v13 **not certified**.

## Published lifecycle
- A Jedi Master enters Serenity in a **full-round action**, remains aware, but loses positive Dexterity bonus to Reflex Defense while in trance.
- Emerge as a **swift action**; the *first* attack roll or Use the Force check in the **following round** is treated as a **natural 20**.
- This is a genuine natural result for critical and automatic-success logic, **not** +20 to the check total or an automatic success flag.
- Trance state, emerging state and first-roll entitlement are per-actor, per-encounter, with expiry after the eligible round or combat end.

## Implementation
- Pure `serenity-state.js` determines enter/exit action, trance, encounter and qualifying round/domain.
- `JediMasterSerenityService.act` uses owned Jedi Master class access and the V2 `ActionEconomyConsumption` authority, with ActorEngine state mutation and verified action rollback on error.
- `JediMasterSerenityService.roll` reserves the entitlement, then rolls through RollCore using a genuine Foundry v13 `Roll.evaluate({maximize:true})`, checks evaluated 20, returns the real Roll, restores entitlement on failed die evaluation. Nonqualifying roll types/damage/bonus-dice are never maximized.
- `RollCore.execute` (skills, Force power checks) and `RollCore.executeFormula` (standard attacks through `RollEngine.safeRoll`) share a single consumption entry. The pending entitlement wins over Take-10 for eligible Use the Force checks.
- `DefenseCalculator` removes only the positive *Dexterity*-based Reflex component, never double-subtracts Pin/shield Dex denial, and reports the reduction.
- Player/GM action exposed as `game.swse.classFeatures.jediMasterSerenity.open(actor)`; combat cleanup hooks expire abandoned/old state.

## Acceptance boundaries
Source checks and regression tests do **not** prove live Foundry v13 sheet, synthetic actor, combat turn, card, or chat behavior. Roll.evaluate({maximize:true}) must be exercised in actual Foundry 13, including any future dice-term or reroll transformations.
- Test `tests/class-phase-6m-serenity-temporal-roll.test.mjs`.
- Verify exact-head CI, Foundry action economy and repeated entry/exit/roll on a Jedi Master character.
- Verify natural-20 critical/hit and force-check outcomes, no artificial +20, correctly preserved bonuses, normal noneligible rolls.
- Verify casting attack/rerolls/Force cards/Take10 and resilience to cancel/failed roll, disconnect, reload, round advance, encounter end.
- Explicitly check every alternate attack/Use the Force route still passes through RollCore. Future truly independent dice consumers need separate routing, not a second Serenity authority.
- Cross-client concurrent consumption is serialized only within a client, not a distributed mutex; independently certify cross-client behavior before claiming full runtime completion.
- No sourcebook, talent pack, class identity, or other feature definitions were changed.
