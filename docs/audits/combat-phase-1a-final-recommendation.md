# SWSE Combat Phase 1A - Final Recommendation

Audit/architecture phase only. No runtime files were changed.

## Answer to the 10,000-foot question

Yes: the first implementation work should be **realignment**, not wholesale correction.

The repo already has many combat authorities. Some are strong. Some are partial. Some are legacy wrappers. The correct next phase is to wire them through one thin workflow registry that becomes the combat workflow SSOT.

## Does a combat SSOT already exist?

Partially.

`CombatEngine.resolveAttack()` is the documented attack/damage orchestration SSOT. But the live system also routes through the character sheet, Roll Configurator V2, `SWSERoll.rollAttack()`, `rollAttack()`, `FullAttackExecutor`, `DamageEngine`, `DamageResolutionEngine`, `DamageSystem`, `AmmoSystem`, `SecondWindRules`, and other helpers.

So the answer is:

- **A declared attack-resolution SSOT exists.**
- **A complete live combat workflow SSOT does not exist yet.**
- **Enough pieces exist that we should aggregate/wire them, not rewrite them.**

## Phase 1B should create the missing layer

Recommended Phase 1B title:

**Combat Workflow Registry and Context Alignment Shim**

The shim should:

- call existing systems;
- preserve context;
- own routing decisions;
- own normalized action/context/result shapes;
- avoid direct rule math;
- avoid direct document mutation;
- support GM-managed/manual actions honestly.

## Why this is better than correcting rules first

If we correct individual rules before alignment, each fix risks becoming another island:

- Burst Fire could be corrected in attack math but lost by damage buttons.
- Evasion could be corrected in damage math but never receive area hit/miss context.
- Fight Defensively could apply the right bonus but spend the wrong action.
- Grapple could apply the right state but from only one UI path.
- Ammo could decrement in the attack dialog but not in combat/gear cards.

The registry/context layer prevents that.

## Recommended immediate implementation sequence

1. Preserve action metadata through `CombatActionsMapper`.
2. Add `CombatWorkflowRegistry` with handler registration.
3. Add `CombatActionNormalizer` to produce a consistent action record.
4. Add `CombatContextBuilder` for a minimal context object.
5. Register existing handlers without rewriting their internals:
   - attack -> current attack roll path
   - fullAttack -> `FullAttackExecutor`
   - manual/reference -> chat card/reminder path
   - skillAction -> current skill roll path
   - actorItem -> `CombatEngine.executeAction`/actor.useAction fallback
6. Route the character sheet combat action row through the registry.
7. Add diagnostics for missing/ambiguous route.
8. Only then start correcting action economy and rule seams.

## Non-negotiable alignment principles

- Use every part of the buffalo.
- Do not create a parallel combat rules engine.
- Do not delete existing authorities that can be registered/adapted.
- Keep specialized systems specialized.
- Make the registry the workflow SSOT, not the math SSOT.
- Preserve context before adding special-case mechanics.
- Keep tabletop/GM adjudication boundaries explicit.
