# Class Phase 6F-3 — Force Disciple Prophet Destiny Point grant

**Date:** 2026-11-02  
**Base:** merged `main` at `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f3-force-disciple-prophet`  
**Status:** implementation pushed; exact-head CI and live Foundry v13 finalization still require verification.

## Printed rules / user implementation decision

- **SWSE Core Rulebook p. 215 — Prophet:** each Force Disciple level gives **two Destiny Points instead of the usual one**. A player may immediately give up the extra point to receive a GM-determined prophetic vision; the GM also adjudicates associated destiny changes.
- **Core p. 112 — Destiny rules:** only a character with a Destiny gains or spends Destiny Points.
- **Project decision:** automate only the **two-point grant**. If the player wants a prophetic vision, the GM handles the vision and point expenditure with the existing Destiny Point controls. No chooser, vision popup, automatic narrative content, special spend, or destiny edit is introduced.

## Implementation

- `scripts/engine/progression/utils/force-disciple-prophet-destiny.js`: pure source-scoped planner. Only active-Destiny characters receiving one new Force Disciple level qualify. Preserves spent points. Adds +2 current and +2 to displayed maximum, and records the level and previous/current totals. Refuses malformed counters and invalid level jumps. A previously committed same-target-level receipt suppresses replay.
- `scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js`: invokes the pure planner from `buildLevelUpSet`, merging the grant into the existing ActorEngine level-up mutation. No separate actor writes or post-commit grants.
- `tests/class-phase-6f3-force-disciple-prophet.test.mjs`: covers +2 first/continuing levels, spent-point preservation, no-Destiny/fulfilled/other-class exclusions, receipt replay, bad input and no automatic vision spending.

## Scope boundaries / known gaps

- Existing progression economy builder currently does **not** grant the ordinary +1 Destiny Point to other classes. This PR implements Prophet's complete +2 entitlement for Force Disciple without silently changing all other classes' level-up economy. A separate cross-class Destiny lifecycle audit is required.
- This does not retroactively backfill older Force Disciple level-ups. Manual GM adjustment remains possible.
- The class-feature catalog still describes the combined Prophet grant/vision ability as a `STUB` because vision adjudication stays manual. The mechanical **grant** is implemented independently in progression; do not infer that an automatic vision workflow exists.
- No live Foundry v13 finalization or ActorEngine persistence test has been performed. Requires exact-head CI and independent review before merge.

## Acceptance probes

1. Active Destiny, 12th-level character, Force Disciple selected for level 13, 1/5 DP before -> **3/7 DP** after.
2. Active Destiny, 12th-level character, Force Disciple selected, 0/4 DP before -> **2/6 DP** after (no refill).
3. No Destiny, fulfilled Destiny, a non-Force-Disciple level, or chargen -> no Prophet grant.
4. Replaying a committed level-up receipt does not award points again.
5. Choosing a prophetic vision remains a GM action and does not open dialogs or mutate destiny automatically.
