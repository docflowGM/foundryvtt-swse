# Claude/Codex prompt — Phase 6 The Force Unleashed Campaign Guide feat parity

## Non-negotiable behavior

You must follow these principles:

1. Think before coding.
2. Simplicity first.
3. Surgical changes only.
4. Goal-driven execution.

Do not rewrite Force powers. Do not invent a new Destiny Point subsystem. Do not convert contextual Forceful, rage, cover, autofire, grapple, or positioning feats into passive static sheet math.

## Task

Run and satisfy:

```bash
node scripts/dev/audit-force-unleashed-feat-parity.mjs --strict
```

Use the manifest at:

```text
data/feat-source-parity/force-unleashed-feat-parity-manifest.json
```

## Expected result

The feat catalog and pack should contain all The Force Unleashed Campaign Guide feats and preserve their sourcebook attribution. Metadata should clearly classify runtime/contextual feats and keep them out of static sheet math.

## Implementation rules

- Forceful Grip, Forceful Saber Throw, Forceful Slam, Forceful Stun, Forceful Throw, and Forceful Weapon are scoped Use the Force activation bonuses for named powers only.
- Forceful Strike and Forceful Telekinesis are Force Point result riders and should hook into Force power resolution later.
- Forceful Recovery belongs in second-wind / Force suite recovery flow, not passive effects.
- Controlled Rage, Focused Rage, and Powerful Rage belong in rage-state handling.
- Unleashed is capability metadata until a dedicated Unleashed Ability subsystem exists.
- Strafe, Mighty Throw, Improved Bantha Rush, Crossfire, Swarm, Advantageous Cover, and Advantageous Attack require combat context.

## Out of scope

- Full Force power activation/result engine.
- Full Unleashed Ability/Destiny Point subsystem.
- New combat maneuver engine.
- Rage UI rewrite.
- Static global Use the Force, attack, damage, or defense modifiers for contextual feats.
