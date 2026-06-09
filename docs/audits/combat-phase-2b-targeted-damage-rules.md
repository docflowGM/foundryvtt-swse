# Combat Phase 2B — Targeted Damage Rules

## Scope

Phase 2B extends the Phase 2A damage packet handoff with target-aware packet rules. This is still not a damage-engine rewrite. The packet builder now finalizes damage against the actual target before `ActorEngine.applyDamage()` is called.

## Implemented

- Added a small target-rule helper:
  - `scripts/engine/combat/damage-packet-rules.js`
- Damage packets are finalized per target through:
  - `finalizeDamagePacketForTarget(packet, target)`
- `DamageSystem.applyPacketToActor()` now re-finalizes packets for each target. This matters for selected-token application because each selected target can have different Evasion/Ion eligibility.

## Evasion / Improved Evasion

For area attacks where workflow metadata says Evasion applies:

- Evasion target + missed area attack: damage is negated.
- Improved Evasion target + hit area attack: damage is halved.
- Burst Fire is explicitly excluded because it is single-target metadata, not an area attack.

Detection checks actor system flags first and then owned talent names:

- `system.evasion`
- `system.improvedEvasion`
- owned talent `Evasion`
- owned talent `Improved Evasion`

This lets both future normalized actors and active-effect-granted Evasion work through the same path.

## Ion handling

Ion packets now carry target-gated special handling:

- Droids, vehicles, objects, and devices are ion-eligible.
- Ion-eligible targets keep damage type `ion`.
- Ion-eligible targets pass full packet damage into mitigation/threshold resolution but apply a `hpDamageMultiplier` of `0.5` to final HP loss.
- Ion threshold checks can use the pre-HP-halving damage through `thresholdDamageOverride`.
- Non-eligible targets suppress ion special handling and apply as normal damage instead of waking ion-only CT rules.

## ActorEngine integration

`DamageResolutionEngine.resolveDamage()` now accepts:

- `options.hpDamageMultiplier`
- `options.thresholdDamageOverride`

This keeps `ActorEngine.applyDamage()` as the mutation authority while allowing packet-level damage semantics.

## Validation

Ran `node --check` on changed JS files.

## Still intentionally not done

- Ammo spend/rollback.
- Stun/lethal selector UI.
- Full stun condition semantics beyond packet typing.
- Autofire multi-target adjudication UI.
- Fire/acid recurring hazard packets.
- Mixed damage packets such as sonic bonus damage.
