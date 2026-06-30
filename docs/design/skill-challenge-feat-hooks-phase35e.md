# Skill Challenge Feat Hooks - Phase 3.5E

Phase 3.5E promotes the three Galaxy of Intrigue Skill Challenge feats from metadata-only references into GM-confirmed Skill Challenge runtime hooks.

## Design boundary

Skill Challenge feats are not static skill bonuses. They operate inside the Skill Challenge subsystem because they depend on challenge state, failure thresholds, catastrophic-failure effects, participants, and once-per-challenge usage.

The hooks therefore live in:

- `scripts/engine/skill-challenges/SkillChallengeFeatHooks.js`
- `scripts/engine/skill-challenges/SkillChallengeEngine.js`
- `scripts/engine/skill-challenges/SkillChallengeRollAdapter.js`
- `scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js`
- `scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js`
- `templates/chat/skill-challenge-card.hbs`
- `templates/apps/gm/skill-challenges/skill-challenge-surface.hbs`

They intentionally do not live in actor skill math, feat static bonus aggregation, CombatEngine, or the normal skill roller.

## Implemented hooks

### Skill Challenge: Catastrophic Avoidance

When a GM-reviewed skill roll would trigger the Catastrophic Failure challenge effect for the acting hero, the GM review card can expose **Apply Catastrophic Avoidance**.

Applying it:

- records once-per-challenge feat usage for that actor;
- changes the catastrophic result to one accumulated failure;
- preserves the normal GM-confirmed review flow.

### Skill Challenge: Last Resort

When a GM-reviewed result would reach the failure limit and normally end the Skill Challenge, the GM review card can expose **Use Last Resort** for eligible participant actors.

Applying it:

- records once-per-challenge feat usage for the actor using the feat;
- does not apply the triggering failure;
- records that a reroll/keep-better-result opportunity was used;
- expects the replacement roll to come through the normal skill roll flow.

The system does not roll on the player's behalf and does not automatically select the better result.

### Skill Challenge: Recovery

When an active challenge has at least one accumulated failure and a participant has the Recovery feat available, the GM tracker can expose **Use Recovery Feat**.

Applying it:

- records once-per-challenge feat usage for that actor;
- removes one accumulated failure;
- leaves narrative eligibility to the GM.

## Once-per-challenge tracking

`SkillChallengeState` now includes a `featUsage` array. Each entry is keyed by rule type and actor id:

```json
{
  "key": "SKILL_CHALLENGE_RECOVERY:actorId",
  "ruleType": "SKILL_CHALLENGE_RECOVERY",
  "actorId": "actorId",
  "actorName": "Hero Name",
  "featName": "Skill Challenge: Recovery",
  "usedAt": "2026-06-30T00:00:00.000Z",
  "note": "Recovery feat removed one accumulated failure with GM approval."
}
```

## Metadata policy

The feat catalog and `packs/feats.db` classify these feats as:

- `mechanicsMode: skill_challenge_hook`
- `applicationScope: skill_challenge_runtime`
- `staticSheetPolicy: exclude`
- `implementationStatus: implemented_skill_challenge_hook`

That prevents future audits from treating them as missing static skill math.
