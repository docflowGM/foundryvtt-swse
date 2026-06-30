# Skill Challenge Effects - Phase 3.5D

Phase 3.5D adds the first safe Skill Challenge effect layer on top of the manual tracker and GM-confirmed roll review flow.

## Scope

Implemented as tracker/preview effects:

- `catastrophicFailure`
- `restrictedSkills`
- `recovery`
- `secondEffort`
- `timedChallenge`

Still intentionally excluded:

- Skill Challenge feat hooks
- automatic rerolls
- automatic resource spending
- player-triggered challenge reactions
- changing-objective automation
- combat or initiative coupling

## Design principle

Skill Challenge effects are scene-state rules. They are not static actor math and they are not passive feat bonuses.

The skill roller remains the source of truth for actor skill totals. The Skill Challenge engine consumes a completed roll result and applies challenge progress only after GM confirmation.

## Implemented effects

### Catastrophic Failure

When a failed roll misses the DC by the configured threshold, the previewed outcome adds extra failures before the GM accepts the suggested result.

Default parameters:

```json
{
  "threshold": 10,
  "extraFailures": 1
}
```

### Restricted Skills

If the challenge has listed skills and an unlisted skill reaches the engine, the outcome is downgraded to GM review and does not count automatically.

The roll adapter already filters normal review cards to listed skills, but this resolver-level guard keeps the rule safe if a future UI permits creative approaches.

Default parameters:

```json
{
  "mode": "listedOnly"
}
```

### Recovery

Recovery is a GM action on the tracker. It removes one accumulated failure when the GM decides the challenge rules allow it.

It does not infer qualification automatically.

### Second Effort

Second Effort is a GM history action. It records that the challenge allowed an additional attempt or retry opportunity.

It does not reroll dice, spend resources, or mutate actor data.

### Timed Challenge

Timed Challenge is a GM-adjusted countdown. The GM can decrement or restore time from the tracker.

Default parameters:

```json
{
  "limit": 6,
  "remaining": 6,
  "unit": "step",
  "autoFailAtZero": false
}
```

If `autoFailAtZero` is `true`, the engine may mark the challenge failed when remaining reaches 0.

## Effect line format

The GM tracker accepts effect lines in this format:

```text
<type>:<label>:<notes>:<json parameters>
```

Examples:

```text
catastrophicFailure:Catastrophic Failure::{"threshold":10,"extraFailures":1}
restrictedSkills:Restricted Skills
recovery:Recovery
secondEffort:Second Effort
timedChallenge:Timed Challenge::{"limit":6,"remaining":6,"unit":"round"}
```

The JSON parameters section is optional. Invalid JSON falls back to safe defaults.

## Future phase

Phase 3.5E should add Skill Challenge feat hooks. Those hooks should register as challenge reactions or GM prompts, not static skill modifiers.
