# Combat Phase 0H - State Storage Crosswalk

Audit only. No runtime files were changed.

This crosswalk maps combat states to current storage/display/mechanical paths observed in the repo snapshot.

| State | Expected storage | Current storage found | Display found | Mechanical application found | Expiration found | Audit result |
|---|---|---|---|---|---|---|
| Aim | actor combat state with 0/1/2 swift progress and target/context | Roll dialog `situational.aiming`; earlier aim flags may exist outside this pass | Attack dialog checkbox | Adds situational +2 in roll config; resolver context mismatch likely | Not confirmed | Partial; mostly per-roll, not a durable state |
| Brace | short-lived actor combat state tied to autofire-only weapon | Not clearly found as state | Not clearly found | Prior audit found braced option logic, but not full lifecycle | Not confirmed | Missing/incomplete lifecycle |
| Prone | declared combat status or Active Effect | `combatStatus.prone`; status effects library also has Prone | Combat status panel toggle; condition/effects panels | `CombatStatusResolver` applies +5 ranged/-5 melee to Reflex; other paths use different values | Manual/unclear | Fragmented; value mismatch risk |
| Cover | declared combat status | `combatStatus.cover`; cover Active Effects with no updates | Combat status panel buttons; compact strips | `CombatStatusResolver` applies cover bonuses and total-cover block | Manual | Good model, unclear UI handler path |
| Fight Defensively | temporary combat state/effect with cost, penalty, defense bonus | `combatStatus.defensiveMode`; ActiveEffect `fighting-defensively`; roll-dialog flag; action bar effect | Multiple UI paths | ActiveEffect applies -5 attack and +2/+5 Reflex; flag resolver applies +2 only; attack code has direct penalty helper | ActiveEffect rounds=1; flag expiration helper | Fragmented; Acrobatics mismatch |
| Full Defense | temporary combat state/effect with cost, no-attacks lock, defense bonus | `combatStatus.defensiveMode`; ActiveEffect `total-defense` | Multiple UI paths | ActiveEffect applies +5/+10 Reflex; resolver can block attacks; flag resolver gives +5 only | ActiveEffect rounds=1; flag expiration helper | Fragmented; attack/reaction lock uncertain |
| Charge | attack context state for one attack plus defense consequence | Roll dialog `situational.charging`; custom ActiveEffect in legacy bar | Attack dialog checkbox; action card | +2 situational in roll config; legacy bar spends full-round | Custom effect duration rounds=1 in legacy bar | Unsafe; action cost and context mismatch |
| Flat-Footed | combat state, often initiative/surprise controlled | Not clearly found in state authority | Not clearly found | Not confirmed as canonical defense math | Initiative-based expiration not found | Likely manual/missing |
| Helpless | condition track final state and/or status | Condition track current value; ActiveEffect condition icon | Condition/effects panels | Recover blocks helpless in some paths; full defense math not confirmed | Depends on condition shift/manual | Display exists; full action/defense lock not confirmed |
| Grabbed | grappling state with controller/target relation | Grapple system state/effects from 0F, exact live storage unclear | Grapple chat/effects likely | 0F found rule mismatch risk | Grapple-specific, unclear | Needs state machine |
| Grappled | grappling state with last check result | Grapple system state/effects from 0F | Grapple chat/effects likely | 0F found penalties/escape mismatch | Grapple-specific, unclear | Needs state machine |
| Pinned | one-round grapple state with action lock and Dex loss | Grapple effect/state from 0F | Grapple chat/effects likely | 0F found heavy Reflex/CT-like mismatch | Maintain on attacker turn needed | Highest grapple risk |
| Stunned | damage/state outcome | Status effect library; damage type labels | Condition/effects if created | Stun damage semantics incomplete per 0G | Not confirmed | Needs damage packet bridge |
| Unconscious | HP/stun/state outcome | Not clearly canonical in this pass | Not clearly canonical | Action/defense lock not confirmed | Not confirmed | Needs state authority |
| Condition Track penalty | numeric actor system field | `actor.system.conditionTrack.current`; derived damage/condition penalty | Condition track components and aggregator | Attack roller reads CT penalty; other checks need confirmation | Recover/Second Wind/ApplyConditionShift | Good foundation, several UI/action paths |
| Recover progress | actor flag | `flags.foundryvtt-swse.conditionRecoverProgress` | Condition track component | Progress counts to 3; action spend not canonical | same/next round logic | Good skeleton, action spend gap |
| Second Wind | actor system resources and encounter flag | `system.secondWind`, `flags.foundryvtt-swse.secondWindEncounterUsed` | Panels/summary/combat vitals | Strong math in rules/engine; action spend split | reset methods and encounter flag | Strong math, action economy gap |
| Fire/Acid recurring hazard | recurring damage packet/effect | `flags.swse.pendingRecurringDamage` display adapter | Summary/effects aggregator | No clear resolver/creator per 0G | Manual/display only | Future damage-state bridge |

## Storage authority summary

### Best existing candidate for tactical states

`CombatStatusResolver` is the best candidate for declared tactical states because it centralizes cover, prone, defensive mode, cover suppression, and target defense calculation. It intentionally avoids map geometry, which matches the project boundary.

Current blocker: it lacks Acrobatics-aware Fight Defensively/Full Defense bonuses and may not be wired into the current concept combat UI or all attack paths.

### Best existing candidate for visible ongoing effects

`ActorEffectsAggregator` is the best candidate for summary/current effects display because it collects from multiple sources. It should be fixed/validated before the Summary tab becomes the truth display for active combat states.

Current blocker: the Active Effect adapter appears to have a runtime seam, and the aggregator is display-only.

### Best existing candidate for action economy

`ActionEconomyPersistence` plus `ActionEngine` should be the canonical v2 turn-state path.

Current blocker: `ActionEngine` appears to apply action degradation backward and does not consume Swift for Full-Round actions.

### Best existing candidate for Second Wind

`SecondWindRules` plus `ActorEngine.applySecondWind()` is the best candidate for Second Wind math and mutation.

Current blocker: action economy spending must be moved into one canonical call site or caller contract.

### Best existing candidate for Recover

`ActorEngine.recoverConditionStep()` has the best Recover-progress model.

Current blocker: it must be paired with canonical swift action consumption.

## Recommended canonical ownership model

| Concern | Recommended owner |
|---|---|
| Action economy math | `ActionEngine` |
| Per-actor turn state persistence | `ActionEconomyPersistence` |
| Declared tactical state | `CombatStatusResolver` |
| Round-limited visual effects | Active Effects, created by state/action services |
| Summary display | `ActorEffectsAggregator` |
| Condition Track mutation | `ActorEngine.applyConditionShift()` and `ConditionTrackRules` |
| Recover progress | `ActorEngine.recoverConditionStep()` after action spend |
| Second Wind math/mutation | `SecondWindRules` and `ActorEngine.applySecondWind()` after action spend |
| Grapple state machine | Enhanced grapple system after RAW alignment |
| Fire/Acid/Stun/Ion state effects | Future damage packet resolver |

