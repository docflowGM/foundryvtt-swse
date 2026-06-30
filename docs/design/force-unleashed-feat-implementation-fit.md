# The Force Unleashed Campaign Guide feat implementation fit

The Force Unleashed Campaign Guide feat set is mostly contextual. It contains Force power activation riders, Force Point riders, rage-state rules, combat option rules, and Unleashed ability access.

## Architecture fit

### Feat catalog and progression

The catalog should continue to own:

- sourcebook attribution
- prerequisite text
- capability metadata
- scoped Force power names
- implementation classification
- static-sheet exclusion policy

### Runtime systems

| Group | Feats | Proper home |
| --- | --- | --- |
| Scoped Force power activation +2 | Forceful Grip, Forceful Saber Throw, Forceful Slam, Forceful Stun, Forceful Throw, Forceful Weapon | Force power activation context bridge |
| Force Point / power result riders | Forceful Strike, Forceful Telekinesis | Force power result hook / GM confirmation |
| Recovery | Forceful Recovery | Second Wind / Force suite recovery selection |
| Rage state | Controlled Rage, Focused Rage, Powerful Rage | Rage state engine/contextual skill checks |
| Combat options | Angled Throw, Strafe, Mighty Throw, Improved Bantha Rush, Blaster Barrage | Combat option/action-card layer |
| Attack/result riders | Advantageous Attack, Crossfire, Cunning Attack, Forceful Blast, Swarm | Attack result/context hooks |
| Defense context | Forceful Will, Unstoppable Force | Defense context metadata / prompted reroll hooks |
| Support actions | Rapport, Informer | Aid Another / skill-use substitution metadata |
| Capability unlock | Unleashed | Future Destiny Point / Unleashed Ability subsystem |

## Avoided anti-patterns

Do not implement the Forceful activation feats as a global +2 Use the Force modifier. Their value only applies when activating one named Force power.

Do not implement Unleashed as a generic bonus. It is an access/capability feat that requires Destiny Point spending and GM approval.

Do not implement rage feats as always-on skill bonuses. They require the actor to be in a rage state and, in Focused Rage's case, require the caller to know whether a skill requires patience and concentration.

## Best next implementation slice

The safest next coded slice is a Force power activation context bridge that can ask:

```js
isActorActivatingForcePower(actor, powerSlug)
getScopedForcePowerActivationBonuses(actor, powerSlug)
```

That would unlock the simple +2 Forceful power feats without corrupting global Use the Force totals.
