# Phase 6S — Source-typed species effects versus Indomitable

**Rules context:** *SWSE Core Rulebook* p.215: a Force Disciple is immune to Mind-Affecting effects.
**Parent:** Phase 6R typed ActiveEffect admission (#1131).
**Status:** Runtime correction and Node tests, not live Foundry certified.

## Additional live bypasses
`SpeciesActivatedAbilityEngine.useConfusion` (Yarkora) explicitly labels its effect Mind-Affecting, yet would create the Confused status and report a successful outcome even when the target owned Indomitable. `usePacifism` (Caamasi) likewise directly shifted the target's Condition Track **before** creating its Mind-Affecting ActiveEffect. A last-line ActiveEffect admission check cannot undo an earlier direct Condition Track mutation.

## Corrections
- Before applying Confusion, check the **canonical** `resolveForceDiscipleIndomitable(targetActor,{mindAffecting:true})`. A successful check against an immune Force Disciple results in **no effect**, with the chat target entry reporting "immune (Indomitable)" rather than incorrectly "confused."
- Before applying Pacifism, check the same explicit immunity. Suppress **both** the Condition Track shift and Pacified ActiveEffect and report the immunity correctly in the skill result/chat.
- `createStatusEffect` formerly caught ActorEngine ActiveEffect creation errors or nonstandard actor shapes and silently fell back to writing a **legacy** `system.activeEffects` array. This bypassed the Phase 6R typed admission gate. Remove that fallback; the governed `ActorEngine.createActiveEffects` is now mandatory for species effect documents. If the Actor has no supported ActiveEffect document interface, fail closed instead of writing an alternative state.
- Do not claim an inhaled poison (Falleen Pheromones) is Mind-Affecting merely because of its theme. Untyped effects retain their normal existing policy; other creature abilities are unchanged.

## Verification
`tests/class-phase-6s-species-mind-affecting-immunity.test.mjs` verifies pre-mutation placement, no legacy bypass, supported class ID, and unrelated poison scope. Live Foundry V13 test should exercise Yarkora Confusion and Caamasi Pacifism against genuine/synthetic Force Disciple and non-Disciple targets, ensure Condition Track and ActiveEffects are both unchanged on immune targets, and test actor effect creation failure paths. Exact-head CI remains required.
