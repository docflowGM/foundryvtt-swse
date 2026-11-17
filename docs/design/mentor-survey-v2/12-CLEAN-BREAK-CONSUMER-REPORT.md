# Clean-Break Consumer Report

Scope: remaining readers of the retired `system.swse.mentorBuildIntentBiases` field and uses of the overloaded legacy `survey` key. No migration, alias, shim or fallback scorer was added; deletions only. Enforced by `tests/mentor-survey-clean-break.test.mjs`.

## Removed in this milestone

| File | What was read | Disposition |
|---|---|---|
| `engine/progression/suggestion/suggestion-context-builder.js` | `actor.system.swse.mentorBuildIntentBiases` merged into mentor biases | read removed (caller-supplied `characterData.mentorBiases` only) |
| `engine/suggestion/ClassSuggestionEngine.js` | field as prestige target fallback | removed; `pendingData.prestigeClassTarget` kept |
| `engine/suggestion/SuggestionEngine.js` (2 sites) | field used to build a fallback `buildIntent` | fallback is now `null` |
| `engine/suggestion/force-choice-context.js` | field and `pendingData.survey.prestigeClassTarget` | both removed |
| `engine/suggestion/attribute-planner.js`, `BackgroundSuggestionEngine.js` | field as fallback for `pendingData.mentorBiases` | removed |
| `engine/suggestion/Level1SkillSuggestionEngine.js` | field, `pendingData.survey.intentTags`, `surveyBias.intentTags`, `mentorBiases.intentTags` | removed |
| `engine/suggestion/ClassDomainReasonEngine.js` | field as prestige target fallback | removed |
| `engine/suggestion/ForceOptionSuggestionEngine.js` | field driving a "prestige alignment from L1 survey" tier branch | branch and its now-unreferenced hard-coded helper `_getPrestigeClassPowerSuggestions` deleted |
| `engine/progression/forecast/build-signals-normalizer.js` | `actor.system.swse.surveyResponses` (legacy store, no writer) | removed |
| `engine/progression/forecast/suggestion-context-adapter.js` | `surveyResponses`, `survey.intentTags` / `mergedBias` | removed |

Result: `grep mentorBuildIntentBiases scripts` returns nothing (the Phase 5A governance markdown still describes the old field historically and is not code).

## The overloaded `survey` key: classification

`progression-session.draftSelections.survey` is **not** the mentor survey. After the cutover it has two active meanings only:

| Writer | Meaning | Status |
|---|---|---|
| `steps/galactic-profile-step.js` | `characterName` (and, via the summary step, `startingLevel`) | active, keep |
| `engine/progression/template/template-adapter.js` | template advisory choices (`mentorChoice`, `archetypeChoice`, `roleChoice`, `source: 'template'`) read by `build-signals-normalizer` | active, keep |

The mentor survey lives under the separate `mentorSurvey` key. The `mentor-rail` / `mentor-step-integration` `'l1-survey': 'survey'` entries map step ids to Mentor rail slots, not data.

## Remaining, classified and not removed

A producer-less `mentorBiases` input channel (`characterData.mentorBiases`, `pendingData.mentorBiases`, `buildIntent.mentorBiases`): consumers `attribute-planner`, `BackgroundSuggestionEngine`, `Level1SkillSuggestionEngine`, `AttributeIncreaseScorer`, `tag-signal-engine.getBiasTagsFromMentor` (1.1 multiplier), `prestige-path-signals`, `SuggestionEngine`, the context builder and a schema in `content-contracts.js`. Nothing writes it any more, so it is always empty and cannot affect ranking. Category D/F in the project taxonomy (removal edits scoring code): left for a focused, separately tested suggestion-engine change.

## Verification

- `node --test tests/mentor-survey-clean-break.test.mjs` (4 tests): no `mentorBuildIntentBiases`, no `swse.surveyResponses`, no legacy intent-tag shapes anywhere under `scripts/`; the `survey` key keeps only its two writers.
- Full-suite result: see `13-SOURCE-RECOVERY-COMPLETION-REPORT.md`.
- Not verified: runtime Suggestion Engine behavior in Foundry.
