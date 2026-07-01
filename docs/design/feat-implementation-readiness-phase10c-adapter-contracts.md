# Feat Implementation Readiness Phase 10C: Adapter Contracts

Phase 10C turns the Phase 10B engine-fit matrix into implementation contracts.

This is still intentionally surgical. The goal is not to implement every feat yet. The goal is to define adapter boundaries so the next coding pass can consume Phase 9 metadata without inventing parallel systems.

## Non-negotiable implementation rules

- **Think Before Coding:** every adapter must name the existing runtime it extends.
- **Simplicity First:** adapters map metadata to existing engines; they do not become broad new subsystems unless runtime is truly absent.
- **Surgical Changes:** implement one adapter family at a time.
- **Goal-Driven Execution:** every adapter must list the Phase 9 feats it unlocks and the proof needed to mark them correct.

## P0 adapters

### `reaction-registry-feat-adapter`

Use this for reaction metadata and feat reaction entries.

Must reuse:

- `ReactionEngine`
- `ReactionRegistry`
- `ActivationLimitEngine`
- `AbilityExecutionRouter`
- `ActorEngine`

This adapter exists because the reaction engine is real. Phase 10 should add metadata-backed registry/adapters, not another reaction framework.

Unlocks examples:

- Conditioning
- Republic Military Training
- Sith Military Training
- Acrobatic Dodge
- Grab Back
- Mounted Defense
- Stay Up
- Dive for Cover
- Duck and Cover
- Opportunistic Retreat
- Tactical Advantage

First slice:

1. Add registry-backed metadata loader for simple `reactionRules`.
2. Implement one non-mutating reaction prompt.
3. Implement one ActorEngine-routed mutation reaction.

### `combat-target-effect-adapter`

Use this for effects already collected by `CombatOptionResolver` but not yet applied.

Must reuse:

- `CombatOptionResolver`
- `ActorEngine`
- `ConditionTrackRules`
- existing attack roll result context

Unlocks examples:

- Wounding Strike
- Staggering Attack
- Triple Crit Specialist
- Bantha Herder
- Bantha Rush
- Deceptive Drop
- Halt
- Heavy Hitter
- Mechanical Martial Arts
- Tool Frenzy

First slice:

1. Consume `targetEffectsOnHit` from `CombatOptionResolver.collectAttackModifiers()` output.
2. Support one safe effect type first: condition-track shift after confirmed hit.
3. Surface unsupported effect types visibly in chat instead of silently dropping them.

### `damage-timing-rider-adapter`

Use this for successful-hit damage riders and damage threshold timing feats.

Must reuse:

- `ActorEngine.applyDamage`
- `DamageResolutionEngine`
- `ThresholdEngine`
- `MetaResourceFeatResolver`

Unlocks examples:

- Advantageous Attack
- Forceful Strike
- Forceful Telekinesis
- Crush
- Stay Up
- Delay Damage
- Damage Conversion
- Never Surrender

First slice:

1. Fix Advantageous Attack by replacing wrong-shape attack bonus behavior with a post-hit damage rider predicate.
2. Expose `targetHasActedThisEncounter` in attack/damage context.
3. Add an audit guard that damage riders cannot be encoded as attack bonuses.

## P1 adapters

### `skill-use-rule-adapter`

Use this for feats that change what a skill use can do, not passive skill totals.

Must reuse:

- `SkillFeatResolver`
- `SkillCalculator`
- `ActivationLimitEngine`
- `ActorEngine`

Unlocks examples:

- Gearhead
- Quick Skill
- Combat Trickery
- Intimidator
- Improved Sleight of Hand
- Wilderness First Aid
- Hyperblazer
- Fast Talk
- Experienced Medic

First slice:

1. Add read-only skill-use option collector.
2. Wire one non-mutating rule such as Take 10/Take 20 permission.
3. Add mutation/result workflows only after the collector is stable.

### `aid-another-support-adapter`

Use this for teamwork and Aid Another rules.

Must reuse:

- `ActivationLimitEngine`
- `ActorEngine`
- existing chat/action card patterns

Unlocks examples:

- Coordinated Attack
- Coordinated Barrage
- Logic Upgrade: Tactician
- Suppression Fire
- Mission Specialist

First slice:

1. Define Aid Another result context without mutating actors.
2. Support one simple ally attack bonus or target penalty case.
3. Leave complex positioning/fear riders manual until cover/movement context exists.

## P2 adapters

### `force-power-context-adapter`

Use this for scoped Force power feats.

Must reuse:

- `ForceEngine`
- `AbilityExecutionRouter`
- `ActorEngine`
- `ForcePointsService`

Unlocks examples:

- Forceful Grip
- Forceful Slam
- Forceful Stun
- Forceful Throw
- Forceful Weapon
- Forceful Saber Throw
- Force Regimen Mastery

First slice:

1. Expose normalized `forcePowerContext` from `AbilityExecutionRouter` to `ForceEngine`.
2. Support scoped activation bonuses by named power matching only.
3. Defer post-result condition/rider effects until `combat-target-effect-adapter` exists.

### `area-autofire-context-adapter`

Use this for area, autofire, cover, and soft-cover feats.

Must reuse:

- `CombatOptionResolver`
- `DamageResolutionEngine`
- `ActorEngine`

Unlocks examples:

- Artillery Shot
- Spray Shot
- Friendly Fire Avoidance
- Targeted Area
- Advantageous Cover
- Angled Throw
- Blaster Barrage
- Crossfire
- Forceful Blast
- Strafe

First slice:

1. Build read-only normalized area/autofire context from an attack result.
2. Surface unsupported template edits as chat/manual prompts.
3. Add per-target damage modification only after context is stable.

## What this phase deliberately does not do

Phase 10C does not implement poison/disease, movement-control, or rage-state runtime. Those were marked missing in Phase 10B and need separate authorities later.

Phase 10C also does not create a new reaction system. The reaction engine already exists; this phase routes future reaction work into it.
