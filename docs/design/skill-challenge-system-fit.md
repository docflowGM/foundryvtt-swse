# Skill Challenge System Fit - Phase 3.5A

## Summary

Skill Challenges should be implemented as a GM-authored encounter/progress subsystem, not as passive feat automation or actor static skill math.

The closest existing pattern in this codebase is the encrypted Intel/decryption workflow: the GM defines an objective, the system tracks progress and failure pressure, players contribute checks, and the result reveals or withholds an outcome. Skill Challenges should reuse that design philosophy without coupling to Holonet Intel records.

## What a Skill Challenge is

A Skill Challenge is a structured scene where the party accumulates a target number of successes before reaching a failure limit. It can represent slicing, investigation, negotiations, infiltration, chase pressure, survival, battlefield coordination, social maneuvering, or other complex obstacles.

The Skill Challenge subsystem should own:

- Challenge identity and source reference.
- CL, complexity, success target, and failure limit.
- Primary and secondary skills with DCs.
- Active participants.
- Challenge effects such as Catastrophic Failure or Recovery.
- Roll history.
- GM notes, player brief, success text, and failure text.
- Final status.

The existing skill roller should still own actor skill math.

## Architectural slot

Recommended future locations:

```text
scripts/engine/skill-challenges/SkillChallengeEngine.js
scripts/engine/skill-challenges/SkillChallengeRules.js
scripts/engine/skill-challenges/SkillChallengeState.js
scripts/engine/skill-challenges/SkillChallengeStore.js
scripts/engine/skill-challenges/SkillChallengeEffectResolver.js
scripts/engine/skill-challenges/SkillChallengeRollAdapter.js
scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js
scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js
templates/apps/gm/skill-challenges/skill-challenge-surface.hbs
templates/chat/skill-challenge-card.hbs
data/skill-challenges/*.json
```

Phase 3.5A adds those files as skeletons or metadata only. It does not register the surface, add settings, attach chat listeners, or mutate actor data.

## GM Datapad fit

Skill Challenges should become a GM Datapad surface after the foundation phase.

Recommended UI shape:

- Left: active challenges, templates, completed history.
- Center: selected challenge tracker with successes/failures and primary skill buttons.
- Right: effects, consequences, GM notes, participants, and source reference.

The GM should be able to manually increment/decrement successes and failures before roll automation exists. This mirrors the practical table workflow and avoids over-automation.

## Roll flow

Recommended future flow:

1. GM starts a Skill Challenge.
2. Player rolls a normal skill using the existing skill roller.
3. A chat card offers Apply to Skill Challenge when relevant.
4. GM confirms whether the roll counts.
5. The SkillChallengeEngine updates challenge progress.
6. Chat posts a progress summary.

Do not create a duplicate skill formula inside SkillChallengeEngine.

## Feat policy

The Galaxy of Intrigue Skill Challenge feats remain metadata-only until this subsystem exists.

They should eventually be implemented as challenge reactions/hooks:

- Skill Challenge: Catastrophic Avoidance -> modifies catastrophic failure handling.
- Skill Challenge: Last Resort -> permits a special reroll/recovery moment during a failing challenge.
- Skill Challenge: Recovery -> grants or alters the Recovery challenge effect.

They should not become passive bonuses in actor skill math.

## Phase plan

### Phase 3.5A - Foundation only

- Add metadata model.
- Add sample challenge templates.
- Add effect definitions.
- Add skeleton engine/state/rules/store/adapter files.
- Add skeleton GM surface service/controller/templates.
- Add readiness audit.

### Phase 3.5B - GM manual tracker

- Register a GM Datapad surface.
- Add world setting or scene flag persistence.
- Create/edit/start/complete challenges.
- Manual success/failure adjustment.
- Post summary to chat.

### Phase 3.5C - Roll integration

- Add Apply to Skill Challenge from skill roll chat cards.
- Require GM confirmation by default.
- Record roll history.

### Phase 3.5D - Challenge effects

- Automate safe effects such as Catastrophic Failure, Recovery, Restricted Skills, Timed Challenge, and Second Effort.

### Phase 3.5E - Feat hooks

- Convert Skill Challenge feats from metadata-only to challenge reaction hooks.
