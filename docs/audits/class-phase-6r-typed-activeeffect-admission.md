# Phase 6R — Typed ActiveEffect admission for Force-class immunities

**Canonical rules:** *Saga Edition Core Rulebook* p.215 (Indomitable: mind-affecting immunity), pp.220 and 224 (Jedi Master/Sith Lord Fearless).
**Parent:** Phase 6Q active talent consumer guards (#1130).
**Status:** Typed ActiveEffect admission implemented with Node regression tests. Exact-head CI and live Foundry validation pending.

## Why both effect creation APIs need the gate
SWSE has two governed ActiveEffect creation methods:
1. `ActorEngine.createActiveEffects(actor,...)` — used by the Force-power effects engine.
2. `ActorEngine.createEmbeddedDocuments(actor,'ActiveEffect',...)` — used by `createEffectOnActor` and other effects.

Without this admission check, a caller with explicit Mind-Affecting or fear flags can bypass a class immunity even if the Force-power or talent-specific consumer normally checks before applying. This is a **defense-in-depth last line**, not a replacement for consumer-level checks that must also prevent condition-track, flags, and other non-ActiveEffect mutations.

## Behavior
- `typedActiveEffectDescriptors` reads explicit boolean `mindAffecting` / `isMindAffecting`, `fear` / `fearEffect` / `isFear`, and exact descriptor tokens (including `Mind-Affecting` and `Fear`) in structured `flags.swse`, `flags['foundryvtt-swse']` or `system` metadata.
- Does **not** infer from an effect name, description, an arbitrary string containing fear, the source actor, or a Power name.
- `admitClassImmuneActiveEffects(actor,effects)` uses the existing canonical `resolveForceDiscipleIndomitable` and `resolveApexFearImmunity` class-owned policies.
- Each governed ActorEngine creation method filters only explicitly-typed immune effects **before** embedded document creation. Other effects in a mixed batch remain permitted. A fully suppressed batch returns an empty list and does not recalculate or mutate.
- The class-specific reason and effect name are logged. Nonimmune actors see unchanged behavior; suspended Sith Lords lose Fearless exactly as their class feature access rules require.
- The base `createEffectOnActor` facade remains unchanged because it already delegates to the governed embedded creation API.

## Acceptance
`tests/class-phase-6r-typed-activeeffect-admission.test.mjs` covers exact descriptors, mixed batches, class identity spoof resistance, Sith suspension, harmless effects and both writer boundaries.
Run exact-head CI and Foundry V13 integration with direct calls through both creation methods. Verify suppression, no leaked ActiveEffects or recalculations, and that untyped harmful effects still require caller-level rules review. This is not a claim that every possible Mind-Affecting gameplay consequence is an ActiveEffect: direct Condition Track and flag writers need individual source-mapped guards (Phase 6Q covers two such paths).
