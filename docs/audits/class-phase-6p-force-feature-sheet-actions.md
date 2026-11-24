# Phase 6P — Force prestige-class user entry points

**Stacked parent:** Phase 6O rollback-safe FP receipt correction (#1128).
**Sources:** *Core Rulebook* pp. 220 (Jedi Master Serenity), 224 (Sith Lord Temptation).
**Status:** V13 header-control integration + isolated tests; **not live Foundry certified**.

## Problem
The new class runtime actions were exported as `game.swse.classFeatures.jediMasterSerenity.open(actor)` and `game.swse.classFeatures.sithLordTemptation.open(actor)`, but ordinary players and GMs would need to type console commands to trigger them. Temptation's pending target-owned consequence similarly had only an API.

## Integration
- `registerForceClassFeatureSheetHooks` is invoked from the established `registerUIHooks` entry, registered once using the same `getHeaderControlsApplicationV2` hook and `HooksRegistry` API as other Foundry V13 sheet controls.
- **Serenity**: visible to actor owner or GM when a genuine Jedi Master Class Item is owned.
- **Temptation**: GM-only, requires an owned Sith Lord class and active ongoing DSP >= Wisdom class-feature access. GM still confirms target and LOS in the existing dialog; no hidden token-target inference.
- **Temptation — Resolve**: visible to target owner or GM on a sheet with persisted `pending-target-choice` records, even if target does not own a Sith prestige class or the combat expires.
- No duplicate buttons on repeated header-control requests; no second resource writer, roll path, or status-effect implementation. Actions route to the already registered `game.swse.classFeatures` APIs.
- Other actor document types are not decorated. The system's existing chargen and level-up template buttons remain unchanged; there is no duplicate control for those actions.

## Acceptance
`tests/class-phase-6p-force-class-sheet-controls.test.mjs` tests hook registration, visibility, live action handlers against mock system API, Sith suspension, and target-owned choice review.
Run exact-head CI. On Foundry V13, inspect both character and NPC sheets for menu/header appearance, owner/GM permissions, changing DSP, opening the choices after an FP/DP spend, and no duplicated actions after rerender. UI exposure is not a substitute for in-person integration certification.
