# Feat Implementation Readiness Phase 10B: Engine Fit Matrix

Phase 10B answers the implementation-routing question from the Phase 9 audits:

> For each recurring feat family, does the current repo already have the runtime wholecloth, does it need adapters, does it need refactor, or is it missing entirely?

This pass is intentionally classification-first. It should guide implementation order without creating parallel systems.

## Classification summary

| Classification | Count | Meaning |
|---|---:|---|
| `exists_wholecloth` | 3 | Runtime home exists and is appropriate. Normalize metadata/tests; do not create a new subsystem. |
| `exists_partial_needs_adapters` | 6 | Runtime home exists, but feats need registry entries, buttons, event bridges, or metadata consumers. |
| `exists_partial_needs_refactor` | 3 | Some runtime exists, but the shape is too shallow for the Phase 9 feat family. Refactor around the existing authority. |
| `missing_runtime` | 3 | No meaningful authority was found; add a small new rules authority routed through existing mutation/chat boundaries. |

## Wholecloth runtime

These should be implementation targets first because the engine already exists.

### Attack-option math

`CombatOptionResolver` already supports feat-provided `ATTACK_OPTION` metadata, including toggles, sliders, passive options, context requirements, attack modifiers, damage modifiers, extra weapon dice, defense modifiers, critical threat changes, and target effects.

Use this for feats such as:

- Flurry
- Sniper Shot
- Power Blast
- Critical Strike
- Improved Rapid Strike
- Power Attack / Rapid Shot / Rapid Strike style options

### Weapon rule modifiers and riders

`CombatOptionResolver` also consumes weapon-bound rule families such as:

- `WEAPON_ATTACK_BONUS`
- `WEAPON_DAMAGE_BONUS`
- `ATTACK_ABILITY_SUBSTITUTION`
- `ATTACK_ABILITY_BONUS`
- `EXTEND_CRITICAL_RANGE`
- `CRITICAL_RIDER`
- `HIT_RIDER`
- unarmed and selected-weapon damage rules

Use this before adding any bespoke weapon feat engine.

### Implant Training

After Phase 10A, `Implant Training` is treated as implemented correct for current repo state. `ImplantRules` handles the KOTOR implant drawbacks and suppression, `DefenseCalculator` consumes Will penalty data, and condition/damage flows consume the extra condition step behavior.

## Partial, needs adapters

### Reactions

The repo has a real reaction framework. Do not build another one.

Use:

- `ReactionEngine`
- `ReactionRegistry`
- `ActivationLimitEngine`

Needed work is feat-specific adapters and event wiring for feats such as Conditioning, Republic Military Training, Sith Military Training, and other incoming-attack/incoming-damage reactions.

### Activation and encounter limits

`ActivationLimitEngine`, `AbilityExecutionRouter`, and encounter-use helpers already exist. The missing work is binding feat buttons/action cards to those authorities consistently.

### Damage resolution and threshold riders

`ActorEngine.applyDamage()` and `DamageResolutionEngine` are the correct home for damage application, mitigation, threshold checks, and condition-track movement. Missing work is attacker/target result hooks for feats that need successful-hit timing, target-has-not-acted timing, Force Point spend riders, or post-threshold side effects.

### Force points and meta resources

Force Point spend/max/die-size support exists through Force/resource services and `MetaResourceFeatResolver`. Missing work is permission/event adapters such as `Force Readiness` out-of-turn spending and some spend-result riders.

### Second wind and recovery rules

`MetaResourceFeatResolver` already reads second-wind rule families. Missing work is mostly choice/pending-state UI for recovered Force powers or movement grants.

### Aid Another / teamwork support

Activation primitives exist, but a real Aid Another support workflow is still needed. Do not turn these into static ally bonuses.

## Partial, needs refactor

### Force power activation context

`ForceEngine` is currently too shallow for scoped Forceful feats. It has DC, Force Point spend, natural 20 recovery, dark side point tracking, descriptor modifiers, and cost checks, but it does not yet expose a rich named-power activation/result context.

Correct direction: refactor named Force power activation so metadata can say, for example, “+2 only to Force Grip activation” or “spend Force Point on Move Object result to move target down the condition track.”

### Skill-use timing / Take 10 / Take 20

Skill totals and progression exist, but Phase 9 feats need a runtime skill-use adapter/modal that owns action cost, rushed checks, Take 10/Take 20 permission, time reduction, and once-per-encounter tracking.

Correct direction: add a skill-use runtime adapter. Do not bake these into derived skill totals.

### Cover, area, autofire, and soft-cover context

Current attack and damage systems know some area/autofire flags, but they do not yet expose a unified multi-target/context result object for cover, soft cover provider identity, template shape, target-specific outcomes, and ally bonuses.

Correct direction: refactor attack result context before automating feats like Advantageous Cover, Angled Throw, Blaster Barrage, Crossfire, Forceful Blast, and Strafe.

## Missing runtime

### Poison/disease/hazards

No dedicated Poison/Disease/Hazard authority was identified. Current metadata can describe poison defense, but there is no proven runtime hook for Fortitude targeting, half damage, delayed saves, or ongoing poison effects.

### Movement/threatened-square control

No general movement/action authority was identified for threatened squares, Withdraw, Tumble DC changes, or forced movement enforcement.

### Rage state

No dedicated rage lifecycle/state authority was identified. Rage feats should remain unimplemented/partial until rage state exists; they must not become always-on Strength, skill, or action modifiers.

## Implementation order recommendation

1. Finish wholecloth runtime families first: attack options, weapon rule modifiers, implant regression tests.
2. Add reaction adapters using `ReactionRegistry` and `ReactionEngine`.
3. Add damage-result hooks for attacker/target timing riders.
4. Add skill-use adapter/modal.
5. Refactor named Force power activation context.
6. Only then add missing authorities for poison/disease, movement control, and rage state.
