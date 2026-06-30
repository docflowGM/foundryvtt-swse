# Skill Challenge Roll Integration - Phase 3.5C

Phase 3.5C connects normal skill rolls to the Skill Challenge tracker without replacing the skill math pipeline.

## Boundary

The existing `rollSkill()` function remains the single source of truth for actor skill totals, trained-only enforcement, contextual modifiers, rerolls, and holo roll rendering. After the normal skill roll chat card is posted, the Skill Challenge roll adapter may post a separate GM-whispered review card when an active tracker matches the rolled skill.

## Flow

1. A player or GM rolls a normal skill.
2. `rollSkill()` posts the usual holo roll card.
3. `SkillChallengeRollAdapter.postRollReviewCardFromSkillRoll()` looks for active Skill Challenges that list the skill.
4. If one or more match, the adapter posts a GM review card.
5. The GM chooses Accept Suggested, Count Success, Count Failure, Do Not Count, or Review Later.
6. The tracker state updates only after the GM action.

## Intentional exclusions

This phase does not implement Skill Challenge feat hooks. Feats such as Catastrophic Avoidance, Last Resort, and Skill Challenge Recovery remain metadata-only until the challenge engine has enough live usage to support their timing windows safely.

This phase also does not add player-facing challenge buttons to the character sheet. The GM review card is enough for a first live integration pass and avoids adding sheet noise.
