# Skill Challenge System Fit

## What a Skill Challenge is

A Skill Challenge is an optional *Galaxy of Intrigue* scene framework for resolving complex, group-facing obstacles through multiple skill checks. Instead of one character making one check, the party accumulates progress through repeated contributions. Published examples use:

- challenge level;
- complexity;
- a target number of successes;
- a failure limit;
- suggested primary skills and DCs;
- challenge effects such as Recovery, Opposed DC, Extreme Success, Containment, Individual Effort, Timed Challenge, and Degrees of Failure;
- explicit success and failure consequences.

In practice, it is closer to a noncombat encounter tracker than a feat bonus.

## How it should be implemented

The correct Foundry shape is a dedicated subsystem:

```text
scripts/engine/skill-challenges/SkillChallengeRules.js
scripts/engine/skill-challenges/SkillChallengeEngine.js
scripts/apps/skill-challenges/skill-challenge-app.js
scripts/chat/skill-challenge-chat.js
templates/apps/skill-challenges/skill-challenge-app.hbs
data/skill-challenges/*.json
```

Optional later expansion:

```text
packs/skill-challenges.db
scripts/apps/gm-datapad integration point
```

## Where it fits in the current architecture

### Engine layer

`SkillChallengeEngine` should own challenge state transitions:

- create challenge state;
- accept a completed skill roll;
- compare total against the challenge's DC rule;
- add successes or failures;
- apply challenge effects;
- detect completion;
- produce a chat/view model.

It should be pure and testable. It should not directly render UI or mutate actors.

### App layer

`skill-challenge-app.js` should be the GM/player surface for a running challenge:

- list participants;
- show success/failure counters;
- show available primary skills and DCs;
- allow GM overrides;
- allow accepting/rejecting proposed checks;
- expose eligible feat actions when a participant has a Skill Challenge feat.

### Chat layer

`skill-challenge-chat.js` should produce progress cards:

- challenge started;
- check submitted;
- check accepted/rejected;
- progress updated;
- challenge succeeded/failed;
- GM manually adjusted state.

### Existing skill roll math

Do **not** duplicate skill math. The subsystem should consume already-finalized skill roll totals from the existing skill roll path. This keeps the Skill Challenge engine from becoming a second skill calculator.

### Combat compatibility

A challenge may run during combat, but CombatEngine should not own the challenge. Combat actions may reference an active challenge id, but success/failure state belongs to the Skill Challenge subsystem.

## How Skill Challenge feats would work later

The current feat data should remain metadata-only until the subsystem exists.

Once the app exists:

- `Skill Challenge: Recovery` should let the running challenge behave as though the Recovery challenge effect is present when the participant is eligible.
- `Skill Challenge: Last Resort` should expose a once-per-challenge or rules-limited reroll affordance when the relevant failure condition is reached.
- `Skill Challenge: Catastrophic Avoidance` should adjust catastrophic failure handling inside the challenge resolution flow.

These are app/encounter effects. They should never appear as always-on actor skill modifiers.

## MVP plan

1. Add JSON model and pure engine tests.
2. Add GM-created challenge cards with manual primary skill/DC entry.
3. Allow skill roll totals to be submitted to the active challenge.
4. Add GM accept/reject/override controls.
5. Add chat progress cards.
6. Add Skill Challenge feat hooks.
7. Add example templates from Galaxy of Intrigue only after the generic engine works.

## Things to avoid

- Do not add static skill bonuses for Skill Challenge feats.
- Do not make the character sheet the source of truth.
- Do not require every Skill Challenge to be pre-authored in compendium form.
- Do not wire this through CombatEngine as if all challenges are combat encounters.
- Do not automate narrative consequences without GM confirmation.
