# Phase 9F — The Force Unleashed Campaign Guide feat implementation accuracy

This audit covers the 31 feats from **The Force Unleashed Campaign Guide** and evaluates whether each feat is implemented with the **correct rule shape**, not merely whether metadata exists.

## Accuracy standard

A feat only counts as `implemented_correct` when the current runtime shape matches the source-derived behavior.

Wrong-shape metadata is explicitly marked `implemented_incorrect`. For example, **Advantageous Attack** is not a speed-based attack bonus; it is a damage rider against enemies who have not acted yet.

## Results

- Feats audited: 31
- implemented_correct: 2
- implemented_partial: 21
- implemented_incorrect: 1
- not_implemented: 6
- metadata_correct: 1
- Review queue: 28

## Implemented correctly

- Cunning Attack: The metadata is a passive attack-option rule against flat-footed/Dex-denied targets, and the combat option resolver supports contextual feat rules rather than static sheet math. Keep regression tests for target-state predicates.
- Informer: The feat uses skillUseSubstitutions/considered-trained metadata, and the skill feat resolver supports skill-use substitutions. This matches the implementation shape; keep tests for related Gather Information applications.

## Implemented incorrectly

- Advantageous Attack: The catalog metadata describes an attack bonus keyed to target speed, but the source rule is a damage rider against an enemy who has not yet acted. This is the exact kind of wrong-shape implementation that must not count as implemented.

## Metadata-correct only

- Unleashed: Correctly treated as capability metadata until a dedicated Destiny Point and Unleashed Ability activation subsystem exists. Do not fake static automation.

## Not implemented

- Controlled Rage: Requires free-action rage entry/end control. The current metadata does not prove a rage-state runtime flow that changes activation/ending action cost.
- Focused Rage: Requires allowing patience/concentration-type skill usage while raging at the correct contextual penalty. No proven rage skill-permission hook exists.
- Forceful Recovery: Requires a second-wind hook and player/GM choice of one expended Force power to return to the suite. No proven hook exists.
- Forceful Throw: This should be +2 only when activating Move Object, but no matching scoped skill-bonus metadata/hook is proven in the current catalog snapshot.
- Powerful Rage: Requires rage-state damage handling. No proven runtime hook applies only while raging.
- Strafe: Requires a specific autofire attack shape option. No proven action card/template hook exists.

## Partial / needs runtime verification

- Advantageous Cover: Metadata preserves the cover context, but no proven runtime hook reduces or alters area-attack damage using cover state. Correct implementation needs area attack + cover result context, not static defense.
- Angled Throw: Attack-option metadata exists, but the runtime must verify grenade/grenadelike thrown attack, bounce permissibility, Reflex 15 threshold, and cover vs total cover distinction. Current metadata is not enough for fully correct automation.
- Bad Feeling: Action metadata exists, but a real surprise-round action economy hook is not proven. Correct implementation grants/permits a Move Action during surprise rounds without altering ordinary action totals.
- Blaster Barrage: Autofire rider metadata exists, but full correctness requires an autofire result hook and ally participation context. It should not be a passive attack bonus.
- Crossfire: Metadata exists, but full correctness requires detecting a missed ranged attack due to soft cover and identifying the soft-cover provider for the follow-up attack.
- Crush: Metadata/source classification exists, but a correct implementation needs a successful Pin/grapple state and damage rider. It is not a Force feat and should not become static damage.
- Forceful Blast: Metadata identifies a grenade/thermal detonator rider, but full correctness requires a hit-result rider with push/prone/forced-movement handling. It is not a Force feat despite the name.
- Forceful Grip: Skill bonus metadata exists, but full correctness requires Force power activation context that applies +2 only to Force Grip activation checks and never to generic Use the Force.
- Forceful Saber Throw: Skill bonus metadata exists, but full correctness requires activation context for Saber Throw only.
- Forceful Slam: Skill bonus metadata exists, but full correctness requires activation context for Force Slam only.
- Forceful Strike: Rider metadata exists, but full correctness requires a Force Stun result hook, Force Point spend prompt, and condition-track application.
- Forceful Stun: Skill bonus metadata exists, but full correctness requires activation context for Force Stun only.
- Forceful Telekinesis: Rider metadata exists, but full correctness requires a Move Object result hook, Force Point spend prompt, and condition-track application.
- Forceful Vitality: Skill bonus/reroll metadata exists and the skill feat resolver can read those rule families, but full correctness requires once-per-encounter failed Endurance reroll usage tracking.
- Forceful Weapon: Skill bonus metadata exists, but full correctness requires activation context for Battle Strike only.
- Forceful Will: Conditional Will metadata exists, but full correctness requires mind-affecting context and once-per-encounter failed Will reroll handling. It must not become always-on Will Defense.
- Improved Bantha Rush: Metadata exists, but full correctness requires Bantha Rush maneuver resolution and push-distance adjustment. It should not be static attack/damage math.
- Mighty Throw: The combat option resolver supports ATTACK_ABILITY_BONUS for thrown weapons, but full correctness also requires extending range categories by Strength modifier. Do not mark correct until range-band math is proven.
- Rapport: Metadata can describe the support relationship, but correct automation needs Aid Another context, ally range/communication, and target action connection.
- Swarm: Metadata can express positioning context, but full correctness requires target adjacency/ally count checks in attack or damage context.
- Unstoppable Force: Metadata/context summary may exist, but full correctness requires target-effect context for Force powers and should not become always-on defenses.

## Running the audit

```bash
node scripts/dev/audit-force-unleashed-feat-implementation-readiness.mjs --strict
```
