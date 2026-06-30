# Skill Challenge Manual Tracker Audit

Generated: 2026-06-30T12:16:38.575Z

Result: 25 ok, 0 errors

- OK: exists:scripts/engine/skill-challenges/SkillChallengeConstants.js — scripts/engine/skill-challenges/SkillChallengeConstants.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeState.js — scripts/engine/skill-challenges/SkillChallengeState.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeRules.js — scripts/engine/skill-challenges/SkillChallengeRules.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeEffectResolver.js — scripts/engine/skill-challenges/SkillChallengeEffectResolver.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeEngine.js — scripts/engine/skill-challenges/SkillChallengeEngine.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeStore.js — scripts/engine/skill-challenges/SkillChallengeStore.js
- OK: exists:scripts/engine/skill-challenges/SkillChallengeRollAdapter.js — scripts/engine/skill-challenges/SkillChallengeRollAdapter.js
- OK: exists:scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js — scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js
- OK: exists:scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js — scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js
- OK: exists:templates/apps/gm/skill-challenges/skill-challenge-surface.hbs — templates/apps/gm/skill-challenges/skill-challenge-surface.hbs
- OK: exists:templates/chat/skill-challenge-card.hbs — templates/chat/skill-challenge-card.hbs
- OK: exists:data/skill-challenges/skill-challenge-system-model.json — data/skill-challenges/skill-challenge-system-model.json
- OK: exists:data/skill-challenges/skill-challenge-effects.json — data/skill-challenges/skill-challenge-effects.json
- OK: exists:data/skill-challenges/sample-skill-challenges.json — data/skill-challenges/sample-skill-challenges.json
- OK: surface-registry:skill-challenges-import — GM surface registry exposes the Skill Challenges surface.
- OK: controller-registry:skill-challenges — GM controller registry binds the Skill Challenges controller.
- OK: shell-surface:partial — Shell surface renders the GM Skill Challenges partial.
- OK: gm-datapad:known-route — GM Datapad route list includes skill-challenges.
- OK: gm-datapad:badge-count — GM Datapad loads active Skill Challenge badge count.
- OK: gm-datapad:app-card — GM Datapad app card is present.
- OK: settings:registered — Skill Challenge world setting is registered from core settings.
- OK: store:write-enabled — Store write paths are enabled for GM tracker state.
- OK: store:internal-setting — Skill Challenge state is internal world setting data.
- OK: controller:manual-actions — Controller supports manual tracker actions.
- OK: controller:no-roll-capture — Phase 3.5B does not wire skill-roll chat automation.