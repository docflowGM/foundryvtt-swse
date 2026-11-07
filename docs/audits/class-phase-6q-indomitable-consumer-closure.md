# Phase 6Q — Close Indomitable bypasses in active talent consumers

**Canonical source:** *Star Wars Saga Edition Core Rulebook*, printed p. 215 (Force Disciple: Indomitable), and Core p. 39 (Adept/Master Negotiator).
**Stacked parent:** Phase 6P Force class sheet controls, #1129.
**Status:** Narrow runtime corrections + tests, not Foundry live certified.

## Why this correction is necessary
Phase 6I/6K established `resolveForceDiscipleIndomitable` and the shared effect-suppression policy. The older `LightSideTalentMechanics.completeAdeptNegotiatorSelection` already checked the immunity, but a separate, active `ConsularTalentActions.resolveAdeptNegotiator` still moved the target's Condition Track, set a persistent talent flag and created an ActiveEffect after a successful roll. Its own metadata identified the action as Mind-Affecting. Similarly, `SentinelTalentActions.promptDampenPresence` explicitly created a Mind-Affecting memory-suppression ActiveEffect without checking Indomitable.

Both consumers thus bypassed a printed **immunity**, even when the successful roll total exceeded Will Defense. This correction does not reinterpret all Persuasion checks as mind-affecting.

## Changes
- `ConsularTalentActions.resolveAdeptNegotiator`: after resolving the check but **before** condition, flag or ActiveEffect mutations, calls `resolveForceDiscipleIndomitable(targetActor,{mindAffecting:true})`. An immune target produces an explanatory chat record and an `{success:false,immune:true}` result with **zero** condition/flag/effect mutations, including the additional Master Negotiator steps and Broken Resolve.
- `SentinelTalentActions.promptDampenPresence`: checks the same explicit immunity after the success check but before creating its persistent memory-suppression effect. Immune targets receive only a clear chat result, no effect.
- Both continue using the existing class-owned identity resolver and the existing mutation authorities; no alternative `Indomitable` ledger, arbitrary string-matching or sheet-only protection.
- Test: `tests/class-phase-6q-indomitable-consumer-gates.test.mjs` checks actual owned Force Disciple class IDs and guard-before-mutation ordering in each live consumer.

## Acceptance and remaining scope
Run exact-head CI and test the two talents against an actual Force Disciple in Foundry v13 at high successful totals; no condition shift, flags or ActiveEffect should appear. A similar non-Disciple should remain affected. These are two verified live code paths, **not** an assertion that every potential mind-affecting source in the system is fully inventoried. Perform a separate typed-effect consumer census before claiming global coverage.
