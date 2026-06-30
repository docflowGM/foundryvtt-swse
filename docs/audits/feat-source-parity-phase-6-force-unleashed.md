# Phase 6 — The Force Unleashed Campaign Guide feat parity

This phase audits The Force Unleashed Campaign Guide feat set against the current feat catalog and pack data.

## Scope

Phase 6 covers the thirty-one feats currently sourced to The Force Unleashed Campaign Guide:

- Advantageous Attack
- Advantageous Cover
- Angled Throw
- Bad Feeling
- Blaster Barrage
- Controlled Rage
- Crossfire
- Crush
- Cunning Attack
- Focused Rage
- Forceful Blast
- Forceful Grip
- Forceful Recovery
- Forceful Saber Throw
- Forceful Slam
- Forceful Strike
- Forceful Stun
- Forceful Telekinesis
- Forceful Throw
- Forceful Vitality
- Forceful Weapon
- Forceful Will
- Improved Bantha Rush
- Informer
- Mighty Throw
- Powerful Rage
- Rapport
- Strafe
- Swarm
- Unleashed
- Unstoppable Force

## Intentional boundary

This phase is not a Force power subsystem rewrite and is not an Unleashed Ability implementation. The audit enforces a simple policy:

- Forceful power feats are scoped to named Force power activation or result context.
- Force Point riders must wait for Force power result hooks and GM/player confirmation.
- Unleashed remains capability metadata until a Destiny Point / Unleashed Ability subsystem exists.
- Rage feats stay in rage-state/context metadata instead of becoming always-on skill or ability bonuses.
- Combat positioning, cover, autofire, soft cover, grapple, and movement feats must not become passive sheet math.

## Running the audit

```bash
node scripts/dev/audit-force-unleashed-feat-parity.mjs --strict
```

The audit writes:

```text
docs/audits/generated/force-unleashed-feat-parity-report.json
docs/audits/generated/force-unleashed-feat-parity-report.md
```

## Recommended follow-up phases

1. Add a Force power activation context bridge for the scoped +2 Forceful power feats.
2. Add a second-wind hook for Forceful Recovery to restore one expended Force power by selection.
3. Add combat option/action-card candidates for Angled Throw, Strafe, Mighty Throw, and Improved Bantha Rush.
4. Keep Unleashed as metadata until a dedicated Unleashed Ability/Destiny Point flow exists.
