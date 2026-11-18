# Class Realignment IV — Phase 6Z reaction execution admission

**Date:** 2026-11-17
**Parent:** Phase 6Y draft PR #1156 at `c6b23feb29eb245fe6b1c107bef9ea485bcfbf94`.
**Status:** Implementation submitted for independent review. Offline CI and Foundry V13 acceptance are distinct.
**Out of scope:** The concurrent Force Powers, Force Techniques, Force Secrets and Ship Maneuvers refactor, and the seven reserved Force class content records.

## Verified execution-path defects

The normal attack-roll path computes reaction eligibility through
`ReactionEngine.getAvailableReactions(defender, attackContext)`. However,
`scripts/ui/chat/chat-interaction-bridge.js` calls
`ReactionEngine.resolveReaction()` using button attributes.

Previously the resolver loaded a reaction **by global registry key alone**.
It did not verify that the defender owned or was granted that reaction,
that the attack trigger matched, or that the attack met the registered
reaction restrictions. A stale or crafted reaction click could therefore
run a handler, including the paid Force Reflection placeholder, without
the same eligibility as the offered reaction. This is a runtime correctness
problem even without malicious users.

A second information-loss seam existed: attack-roll reaction context knew
the weapon attack type, damage descriptors, sonic exception, and attack
negation exclusions, but the holo-roll and full-attack chat reaction
buttons did not carry these facts back into `resolveReaction`.

## Corrected authoritative path

1. `ReactionEngine.resolveReaction` reuses existing
   `collectActorReactionKeys(defender)` ownership/derived-key authority
   and denies global-only registry membership or disabled Item grants.
2. Non-GM users are blocked when `defender.isOwner === false`. The
   Foundry owning-client permissions must also be validated live.
3. Before spending, repeat `reactionDef.trigger`, canonical
   `_evaluateConditions`, and `cannotBeNegatedBy` rejection.
4. Carry original source information through the existing attack
   reactionContext -> roll card presenter -> button attributes -> chat
   bridge -> `resolveReaction` for both single and full-attack cards:
   attackType, damageType(s), originalDamageTypes,
   sonicCannotBeDeflected, and cannotBeNegatedBy.
5. No secondary reaction engine or resource ledger was created.
   Invalid reactions fail before calling `ActorEngine.spendForcePoints`
   and cannot emit false Sith Lord Temptation receipts.

## Tests

`tests/class-phase-6z-reaction-execution-admission.test.mjs` exercises
unowned registry reaction, owned/disabled Item, wrong trigger, wrong
attack type/damage type, attack negation, correct paid receipt, and
non-owner denial. Static assertions cover both chat card renderers and
the click-bridge handoff. The earlier Phase 6Y paid-reaction fixtures
now explicitly grant the tested key rather than relying on global
registry presence.

## Certification boundaries and known issues

- Chat button metadata is a round-trip of authoritative source-derived
  attack context, **not** a cryptographically authenticated immutable
  event. A further chat-event ownership/provenance gate should be reviewed
  before claiming security against arbitrary client-side metadata edits.
- Legacy callers not supplying typed attack context may now fail closed
  on context-dependent reactions. The UI should explain a missing
  source context instead of reconstructing it heuristically.
- Existing `requiresNotFlatFooted` and other situational qualifiers
  still depend on an actual authoritative event/GM decision. Do not
  infer eligibility from name or omit situational checks in the future.
- Registry `forceReflection` is still a placeholder handler and must
  not be represented as mechanically complete. Its printed FP cost
  and full executable resolution need separate source verification.
- The adapter currently keys the global registry by reaction name;
  similarly named actor-owned metadata rule definitions could replace
  one another. Isolate identity and provenance in a dedicated future
  correction rather than a shadow registry.
- Sith Lord Temptation's client-local `swse.resourceSpent` transport is
  still not a certified GM/owner distributed notification.
- Live Foundry V13 tests must prove reaction ownership permissions,
  actual single/full-attack button context, disabled Items, wrong damage
  descriptors, pending combat state, multiple clients and reloads.
