# Class Realignment IV — Wave C (Score, Mark)

**Stacked on:** Wave B (`claude/youthful-allen-fi2he7`, PR #1121). Force-class work (PR #1134) untouched.
**Source:** independent printed-page review (`class-realignment-iv-wave-a-print-verification.md`): Score = Scum and Villainy p.32; Mark = Scum and Villainy p.30. OCR for both pages is unreadable, so printed wording is taken from that review only. `SOURCE_VERIFIED` by the review, not re-read by this implementer.

## Score (Charlatan) — IMPLEMENTED, OFFLINE_TESTED
- Reuses the Wave B observation lifecycle (`class-target-observation.js`): full-round action via `ActionEconomyConsumption`, encounter-scoped record on the observer via `ActorEngine`, designated and confirmed target.
- Differences from Familiar Foe / Targeted Suspect: **no "target has acted" gate** (the review's wording has none), **no numeric bonus**; effect is a Deception check against the observed target rolling two d20s and keeping the better (the same `2d20kh1` primitive Master Saboteur uses; no second roll engine).
- Opt-in per check through the same "Observed target" checkbox (GM-adjudicated that the check concerns the observed opponent). Never applied to other skills, other targets, or other encounters.
- Key: `charlatan.score` on the existing level-2 `class_feature`.

## Mark (Assassin) — PARTIALLY IMPLEMENTED
- Implemented: designation of one visible target (confirmed by player/GM; round 1 unless a GM allows later; one mark per encounter), damage bonus = floor(Assassin level / 2) added inside the pre-critical flat damage total (so the critical multiplier doubles it as printed), free-action transfer once the mark is at 0 HP (or a GM states so). Key `assassin.mark` on the existing scaling grants.
- **BLOCKED — swift-action sacrifice** ("make the target flat-footed against your next attack, then lose the mark"): attack resolution has no per-attack flat-footed Reflex seam (`getTargetDefenseValue` reads the standing derived Reflex; flat-footed totals exist only on the actor and in option gating). Applying only the "lose the mark" half would be misleading, so the whole option is withheld.
  - Minimal seam proposed (not built): a `targetContext.flatFooted` flag consumed in `resolveTargetContext`/`getTargetDefense` that selects the target's derived flat-footed Reflex for that one attack, plus a one-shot "next attack" consumption record. This touches the shared attack math and needs owner review.
- No extra "damage vs flat-footed" bonus is printed and none was added.

## Certification
| | Score | Mark |
|---|---|---|
| SOURCE_VERIFIED | by review | by review |
| IMPLEMENTED | yes | designate / damage / transfer; sacrifice BLOCKED |
| OFFLINE_TESTED | yes | yes |
| FOUNDRY_TESTED | NOT_RUN | NOT_RUN |

Not done: no sheet/tracker button (API: `game.swse.classFeatures.observeTarget(actor, 'charlatan.score')`, `.markTarget(actor)` / `.markTarget(actor, {transfer:true})`).
