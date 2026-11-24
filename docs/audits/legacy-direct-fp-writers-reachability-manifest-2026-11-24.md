# Legacy direct Force Point writers — reachability and consumer manifest (2026-11-24)

Read-only evidence for the owner's A/B/C decision (retire / certify / leave). **Nothing was deleted or rerouted.** All findings are static; dynamic and external callers are marked as such. Classification labels: `UNREACHABLE_SHIPPED`, `EXTERNAL_MACRO_UNVERIFIED`, `ACTIVE`.

## Method
1. A broad scan (five patterns, `scripts/**/*.js`) finds every file that writes a Force Point balance; the set is pinned with a per-file class in `tests/class-force-v2-direct-fp-writer-classification.test.mjs` (a new writer fails the test until classified). No single grep is treated as proof of completeness.
2. A static import graph is walked from the only loaded entry point (`system.json` `esmodules` = `["index.js"]`), following static `import`, dynamic `import()` and `export … from`.
3. Name search (`grep -w`) for each planner / entry symbol across `scripts/`, `index.js`, `templates/`, `packs/`, `data/`; the packs directory has no macro compendium.

## Findings
| Surface | In import graph from `index.js`? | Who calls it | Label |
| --- | --- | --- | --- |
| `scripts/engine/talent/talent-effect-engine.js` (15 FP-debiting `build*Plan` planners) | module **is** loaded (via `combat/rolls/damage.js`) | the FP planners are called only from `light-side-talent-mechanics.js`, `DarkSidePowers.js`, `dark-side-devotee-mechanics.js` — **none of which is in the graph**; no self-calls inside the engine; `buildDarkSideTalismanPlan` has no caller | `UNREACHABLE_SHIPPED` (the debiting code is loaded but never invoked) |
| `scripts/engine/talent/light-side-talent-mechanics.js` | no | `light-side-talent-macros.js`, `light-side-init.js` (both not in graph) | `UNREACHABLE_SHIPPED` |
| `scripts/talents/DarkSidePowers.js` (6 direct deductions) | no | `dark-side-powers-init.js` (not in graph); `validate-mutation-sovereignty.js` (tooling) | `UNREACHABLE_SHIPPED` |
| `scripts/engine/talent/dark-side-devotee-mechanics.js` | no | `dark-side-devotee-macros.js` ← `dark-side-devotee-init.js` (not in graph) | `UNREACHABLE_SHIPPED` |
| `window.SWSE.macros.*` / `window.SWSE.talents.darkSidePowers` globals | n/a | installed only by the four unimported `*-init.js` files; in a running world these globals do not exist, so a world Macro calling them already fails | `EXTERNAL_MACRO_UNVERIFIED` (a world Macro document could be written to call them; repo cannot show it, but the globals are never installed) |
| Published Talent Items for these talents | n/a | canonical records live in `packs/talents.db` and are untouched by any retirement | `ACTIVE` as data; **must not be deleted** |

No `ACTIVE` Force Point payment path was found among these. Active talent actions that do spend (e.g. `sith-talent-actions.js`, `force-adept-talent-actions.js`, `lightsaber-talent-actions.js`) already use `ActorEngine.spendForcePoints`.

## Classification of the other writers (pinned by the test)
V2 internals (`actor-engine.js`); regain / reset / GM refill; manual sheet +/- adjustment (not a spend); chargen/level-up Force Point grants; **Drain Force** (the *target* loses a point as the talent's printed effect — not an actor spend); **WatchCircle Initiate** (printed "does not count as spending a Force Point" — exempt by source, with an exact-reconciliation transfer, see below).

## Recommended disposition (reviewer-proposed; not owner-ratified; nothing applied)
Retire the four unimported legacy execution surfaces (the plan callers, their macro files and initializers) from the production tree with a deletion guard, keeping provenance in git, **only after the owner confirms the macro-compatibility policy**; keep Talent Items and canonical features; do not build ~20 contracts for code that cannot run. If the owner instead wants any of these abilities live, each is source-certified individually and cut over to `spendForcePoints` first. The classification test currently **fails if any of these files becomes reachable**, which is the safety net while the decision is pending.

## WatchCircle Initiate transfer (engineering defects fixed in this pass)
`_transferWatchCircleForcePoint` now treats subtract + grant as one event: ally write fails before applying ⇒ exact return of the actor's point; ally write applies but the acknowledgement throws ⇒ the transfer stands (no duplicated point); no normal point ⇒ nothing moves. Farseeing is consumed only after the roll dialog is confirmed (cancelling no longer burns it). Tested with injected failures (`class-force-v2-watchcircle-exemption`, 8 checks, mutation-checked). **Not covered:** a concurrent unrelated gain on the ally during the same instant is indistinguishable from the transfer landing (left for GM adjudication); there is no separate durable transfer receipt (a typed non-spend transfer receipt would be new infrastructure and is not built without owner direction); double activation is limited by the one-ready-Farseeing requirement.

## WatchCircle follow-up (2026-11-24, second review comment)
Two further defects in my transfer were fixed and tested (10 checks): (1) the SOURCE debit can apply and then throw — the transfer now re-reads the actor's total: unchanged ⇒ nothing happened (rethrown); reduced ⇒ the debit stands and the ally is credited exactly once; (2) with no resolvable ally actor the old code debited the actor and told the GM to apply the gain by hand with no durable pending grant — it now refuses before Farseeing is consumed, before the roll, and before any debit (the same early refusal covers having no normal Force Point). Still not claimed: a globally atomic or durably receipted transfer.

## Retirement status
**EXECUTED** on the owner's direct chat authorization (2026-11-24): see `legacy-fp-retirement-deletion-ledger-2026-11-24.md`. The findings above are the pre-deletion evidence.
