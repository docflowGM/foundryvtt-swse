# Phase 6P — Prophet GM vision completion

**Published source:** Saga Edition Core Rulebook p.215, Force Disciple / Prophet.
**Parent:** Phase 6O typed immunity ingress. **Status:** bounded GM-adjudicated completion, not Foundry v13 live certified.

At each eligible Force Disciple level-up, Phase 6L prompts the player to retain both Destiny Points or sacrifice the extra point for a GM-delivered prophetic vision. A successful sacrifice grants exactly one point through the existing atomic progression planner and persists `flags.swse.forceDiscipleProphetAwards[N].pendingGmVision`.

Phase 6P adds a separate explicit GM narrative closeout:
- `planProphetVisionReview` refuses missing, non-vision, duplicate and blank entries and proposes one update to the existing award ledger.
- `game.swse.classFeatures.forceDiscipleProphet.review(actor)` presents each pending vision to the GM, records the actual narrative, and writes through `ActorEngine.applyMutationPlan`.
- It closes `pendingGmVision` but does not generate visions, change actor Destiny, grant additional points or infer future Destiny legality. Destiny selection remains a separate GM decision.

Tests: `tests/class-phase-6p-prophet-gm-review.test.mjs`. Live acceptance: level Force Disciple, select extra-point sacrifice, finalize exactly once, open GM vision review, enter narrative, verify no point/actor destiny mutation and no duplicate replay after reload. Cancel leaves pending. Failed ActorEngine mutation leaves the record pending.

This delivers a GM-supported workflow, not full automatic Destiny adjudication.
