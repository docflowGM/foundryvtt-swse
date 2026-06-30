# Skill Challenge Phase 3.5B — GM Manual Tracker

Phase 3.5B turns the Phase 3.5A foundation into a GM-facing manual tracker without touching the existing skill roll pipeline.

## What is now active

- A GM Datapad surface route: `skill-challenges`.
- An internal world setting: `foundryvtt-swse.skillChallengeState`.
- A GM-only surface service/controller pair.
- Manual create/edit/delete tracker operations.
- Manual success/failure increment and decrement controls.
- Manual start/succeed/fail/cancel lifecycle controls.
- Optional participant tracking by selected canvas token.

## What is intentionally not active yet

- No chat-message roll capture.
- No actor sheet skill-row buttons.
- No automatic feat hooks.
- No automatic challenge effect resolution beyond the pure engine helper.
- No player-facing workflow.

Those belong in Phase 3.5C or later. Phase 3.5B is deliberately equivalent to an encrypted-intel progress panel: GM-authored objective, tracked pressure, and outcome state.

## Data format notes

The create/edit forms use compact line formats so the UI can stay small while the subsystem is still young.

Primary and secondary skills:

```text
slug:dc:Label:Notes
mechanics:25:Mechanics:Bypass the security panel
useComputer:25:Use Computer:Decode the signal
```

Effects:

```text
catastrophicFailure:Catastrophic Failure:Failing by 10 or more adds pressure
```

## Future handoff

Phase 3.5C should wire completed skill-roll chat cards into a GM confirmation flow. The skill roller remains the math authority; the Skill Challenge engine only decides whether an already-resolved roll counts toward challenge progress.
