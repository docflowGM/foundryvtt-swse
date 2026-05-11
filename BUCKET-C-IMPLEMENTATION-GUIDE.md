# Bucket C Implementation Guide
## Second Wind / Condition Track Feats

**Date**: 2026-05-11  
**Audit Status**: COMPLETE AND MAPPED  
**Implementation Readiness**: 4 READY, 12 READY-WITH-BRIDGE, 2 ANALYSIS-PENDING

---

## STEP 1: Bucket C Feat List (19 Total)

### Trigger-Based Benefits (Second Wind Events) — 4 feats
1. **Resurgence** — Gain bonus Move Action when you catch your Second Wind
2. **Recovering Surge** — Move up the Condition Track when you catch a Second Wind
3. **Forceful Recovery** — Regain one Force Power when you catch a Second Wind
4. **Impetuous Move** — Move when you catch a Second Wind

### Condition Track Interaction — 12 feats
5. **Forceful Strike** — Spend Force Point to move target -1 step down CT (via Force Stun)
6. **Galactic Alliance Military Training** — Don't move down CT first time attack exceeds Damage Threshold
7. **Quick Comeback** — Recover quickly after being moved down CT by damage
8. **Shake It Off** — Spend two Swift Actions to move +1 step along CT
9. **Ion Shielding** — Move only -1 step on CT when Ion damage exceeds Damage Threshold
10. **Stay Up** — Move 1 step down CT to reduce damage (active choice)
11. **Forceful Telekinesis** — Spend Force Point to move target -1 step down CT (via Move Object)
12. **Rancor Crush** — Move enemy -1 step down CT when using Crush feat
13. **Sadistic Strike** — Move opponents -1 step on CT when delivering Coup de Grace
14. **Frightful Presence** — Make Persuasion check to intimidate all enemies
15. **Implant Training** — Don't move additional steps down CT due to Implants
16. **Bone Crusher** — Move damaged Grappled opponent -1 step on CT

### Recovery & Special — 2 feats
17. **Extra Second Wind** — Gain an additional Second Wind per day
18. **Unstoppable Combatant** — Catch more than one Second Wind in an encounter
19. **Skill Challenge: Recovery** — Treat Skill Challenge as if it had Recovery effect

---

## STEP 2: Existing System Map

### Core Systems Located

#### A. ConditionTrackComponent
**File**: `scripts/components/condition-track.js`
**Handles**:
- UI rendering for condition track steps (0-5)
- Persistent flag management
- Step buttons (improve/worsen)
- Penalty calculation and display

**Key Methods Found**:
- `ConditionTrackComponent.render(actor, container)` — Render CT UI
- `ConditionTrackComponent.refresh(actor, container)` — Re-render CT
- `ConditionTrackComponent._defineSteps()` — Define 6 steps with penalties

**Hook Point**: Component listens to `data-ct="improve"` and `data-ct="worsen"` buttons

#### B. BaseActor Methods (scripts/actors/v2/base-actor.js)
**Condition Track Methods**:

```javascript
// Move condition track by delta (-1 = improve, +1 = worsen)
async moveConditionTrack(delta, { force = false } = {})

// Shorthand for moving down (worsening)
async worsenConditionTrack()

// Shorthand for moving up (improving)
async improveConditionTrack({ force = false } = {})

// Set persistent condition flag
async setConditionTrackPersistent(flag)

// Set to specific step
async setConditionTrackStep(step, { force })
```

#### C. ActorEngine (scripts/governance/actor-engine/actor-engine.js)
**Second Wind Methods**:

```javascript
// Reset Second Wind uses to maximum
async resetSecondWind(actor)

// Called from SecondWindEngine.resetAllSecondWind()
// Respects houserule recovery timing
```

**Hooks Available**:
- Hook point: `actor.system.secondWind.current` — tracks remaining uses
- Hook point: `actor.system.secondWind.max` — tracks total uses per recovery

#### D. SecondWindEngine (scripts/engine/combat/SecondWindEngine.js)
**Recovery Timing Control**:

```javascript
shouldResetSecondWind(triggerEvent)  // 'encounter' | 'short-rest' | 'extended-rest'
getRecoveryLabel()                   // Human-readable label
resetAllSecondWind(triggerEvent)     // Reset all combatants
```

### System Relationships Diagram

```
Second Wind Trigger Event
  ↓
ActorEngine.resetSecondWind()
  ↓
actor.system.secondWind updated
  ↓
[FEAT HOOKS HERE] ← Bucket C feats attach listeners
  ↓
Effect Applied (move action, force power restore, CT improvement, etc.)
```

---

## STEP 3: Feat → System Mapping

### Pattern 1: Second Wind Trigger Benefits (4 feats) — READY_METADATA_ONLY

These feats fire when Second Wind is caught. Hook point: **ActorEngine.resetSecondWind()** or **post-reset event**

#### Resurgence
- **Benefit**: Gain bonus Move Action when you catch your Second Wind
- **System**: ActorEngine (action granting)
- **Metadata**: `{ trigger: "on_second_wind", effect: "grant_move_action" }`
- **Implementation**: On Second Wind reset, detect this flag and grant extra action

#### Forceful Recovery
- **Benefit**: Regain one Force Power when you catch a Second Wind
- **System**: ActorEngine + ForcePointsService
- **Metadata**: `{ trigger: "on_second_wind", effect: "regain_force_power" }`
- **Implementation**: On Second Wind reset, detect this flag and call ForcePointsService

#### Recovering Surge
- **Benefit**: Move up the Condition Track when you catch a Second Wind
- **System**: ConditionTrackComponent + ActorEngine
- **Metadata**: `{ trigger: "on_second_wind", effect: "improve_condition_track", value: 1 }`
- **Implementation**: On Second Wind reset, call `actor.improveConditionTrack()`

#### Impetuous Move
- **Benefit**: Move when you catch a Second Wind
- **System**: ActorEngine (action/movement)
- **Metadata**: `{ trigger: "on_second_wind", effect: "grant_movement" }`
- **Implementation**: On Second Wind reset, grant movement/swift action

---

### Pattern 2: Condition Track Interaction (12 feats) — LOW_RISK_WITH_BRIDGE

These feats modify how the condition track behaves. Most need a **small bridge** to integrate with damage calculation or attack processing.

#### Galactic Alliance Military Training (HIGH PRIORITY)
- **Benefit**: You do not move down the Condition Track the first time an attack exceeds your Damage Threshold
- **System**: Damage calculation system (CombatRules.js or damage-system.js)
- **Metadata**: `{ feat_type: "condition_prevention", condition: "first_damage_threshold_exceeded" }`
- **Bridge Needed**: Damage system must check for this flag before applying CT movement
- **Hook Point**: In damage calculation, before `actor.worsenConditionTrack()`
- **Complexity**: LOW (one conditional check)

#### Shake It Off (HIGH PRIORITY)
- **Benefit**: Spend two Swift Actions to move +1 step along the Condition Track
- **System**: Action economy + ConditionTrackComponent
- **Metadata**: `{ feat_type: "condition_recovery", cost: "two_swift_actions", effect: "improve_ct" }`
- **Bridge Needed**: UI button/macro to spend swift actions and trigger `actor.improveConditionTrack(-1)`
- **Hook Point**: Character sheet condition track component (add button)
- **Complexity**: VERY LOW (existing button, add feat check)

#### Stay Up
- **Benefit**: Move 1 step down Condition Track to reduce damage
- **System**: Damage reduction (active choice)
- **Metadata**: `{ feat_type: "condition_for_damage_reduction", cost: "ct_step", effect: "reduce_damage_X" }`
- **Bridge Needed**: Before finalizing damage, offer choice to spend CT step
- **Hook Point**: Damage reduction dialog
- **Complexity**: MEDIUM (requires prompt/choice)

#### Ion Shielding
- **Benefit**: Move only -1 step on Condition Track when Ion damage exceeds Damage Threshold
- **System**: Damage calculation
- **Metadata**: `{ feat_type: "condition_prevention", damage_type: "ion", reduction: 1 }`
- **Bridge Needed**: Damage calculation checks damage type
- **Hook Point**: Damage step threshold check
- **Complexity**: LOW (type check + conditional)

#### Forceful Strike, Forceful Telekinesis (requires Force Power resolution)
- **Benefit**: Spend Force Point to move target -1 step down CT
- **System**: Force Power activation (already has hooks)
- **Metadata**: `{ trigger: "on_force_power_use", force_powers: ["force_stun", "move_object"], effect: "move_target_ct" }`
- **Bridge Needed**: Force Power execution must check for this feat
- **Hook Point**: ForceTrainingEngine or MetaResourceFeatResolver
- **Complexity**: LOW (reuses existing Force system)

#### Rancor Crush, Bone Crusher, Sadistic Strike (require feat integration)
- **Benefit**: Modify damage/effect of other feats
- **System**: MetaResourceFeatResolver (already handles feat interactions)
- **Metadata**: `{ feat_type: "feat_interaction", trigger_feat: "crush", effect: "move_target_ct" }`
- **Bridge Needed**: Minimal (meta resolver pattern already exists)
- **Hook Point**: MetaResourceFeatResolver.js
- **Complexity**: LOW (follows existing pattern)

#### Implant Training
- **Benefit**: Don't move additional steps down CT due to Implants
- **System**: Item system (implants) + damage calculation
- **Metadata**: `{ feat_type: "implant_immunity", effect: "ignore_implant_penalties" }`
- **Bridge Needed**: Damage calculation checks implants list
- **Hook Point**: Implant damage modifier calculation
- **Complexity**: LOW (implant check)

#### Quick Comeback
- **Benefit**: Recover quickly after being moved down CT by damage
- **System**: Needs clarification (exact rule unclear from text)
- **Status**: NEEDS_ANALYSIS
- **Metadata**: `{ feat_type: "recovery", trigger: "after_ct_damage_move" }`

#### Frightful Presence
- **Benefit**: As standard action, Persuasion check to intimidate all enemies
- **System**: Action/skill system (not directly condition track)
- **Status**: NEEDS_ANALYSIS (possible mislabeling as Bucket C)
- **Note**: May belong in Bucket F (active combat)

---

### Pattern 3: Extra Uses (2 feats) — READY_METADATA_ONLY

These feats increase how many times Second Wind can be used.

#### Extra Second Wind
- **Benefit**: Gain an additional Second Wind per day
- **System**: ActorEngine.secondWind tracking
- **Metadata**: `{ feat_type: "second_wind_boost", max_boost: 1 }`
- **Implementation**: In `resetSecondWind()`, detect this flag and add to max
- **Complexity**: VERY LOW

#### Unstoppable Combatant
- **Benefit**: Catch more than one Second Wind in an encounter
- **System**: SecondWindEngine recovery rules + per-encounter tracking
- **Metadata**: `{ feat_type: "second_wind_multiple", encounters_per_day: 2 }`
- **Implementation**: SecondWindEngine must track per-encounter usage
- **Complexity**: LOW (tracking addition)

---

## STEP 4: Implementation Patterns Identified

### Pattern A: Event Listeners (On Second Wind Caught)
**Feats**: Resurgence, Recovering Surge, Forceful Recovery, Impetuous Move

**Implementation**:
1. Hook into `ActorEngine.resetSecondWind()` post-execution
2. Query actor items for feats with `trigger: "on_second_wind"`
3. For each matching feat, apply its effect metadata
4. NO hardcoded feat names

**Code Location for Hook**: `scripts/governance/actor-engine/actor-engine.js` line ~1972

### Pattern B: Damage Calculation Bridges (Prevent CT Movement)
**Feats**: Galactic Alliance Military Training, Ion Shielding, Implant Training

**Implementation**:
1. Before `worsenConditionTrack()` is called
2. Check actor items for feats with `feat_type: "condition_prevention"`
3. Check predicate (damage type, first time, etc.)
4. If predicate matches, skip CT movement or reduce by value

**Code Location for Hook**: `scripts/combat/damage-system.js` or CombatRules.js

### Pattern C: Condition Track UI Buttons
**Feats**: Shake It Off (spend swift actions to improve)

**Implementation**:
1. In ConditionTrackComponent, add "Swift Action Recovery" button
2. Button checks for Shake It Off feat
3. On click, spend 2 swift actions, call `actor.improveConditionTrack(-1)`

**Code Location for Hook**: `scripts/components/condition-track.js` UI activation

### Pattern D: Force Power Integration
**Feats**: Forceful Strike, Forceful Telekinesis

**Implementation**:
1. When Force Power activates, check for feats with `trigger: "on_force_power_use"`
2. Match force power name to feat's force_powers list
3. Apply effect (move target CT, etc.)

**Code Location for Hook**: `scripts/engine/force/ForceTrainingEngine.js` or MetaResourceFeatResolver

### Pattern E: Feat-to-Feat Interactions
**Feats**: Rancor Crush, Bone Crusher, Sadistic Strike

**Implementation**:
1. Query feat interactions via MetaResourceFeatResolver pattern
2. When trigger feat executes (Crush, Coup de Grace, Grapple), check for enhancing feats
3. Apply effects (move target CT by value)

**Code Location for Hook**: `scripts/engine/feats/meta-resource-feat-resolver.js`

---

## STEP 5: Implementation Readiness by Pattern

### TIER 1 — READY_METADATA_ONLY (6 feats, zero risk)
✅ **Immediate implementation** — No architecture changes, pure metadata

1. **Resurgence** — Trigger: Second Wind → Action grant
2. **Recovering Surge** — Trigger: Second Wind → CT improvement
3. **Forceful Recovery** — Trigger: Second Wind → Force Power restore
4. **Extra Second Wind** — Max boost tracking
5. **Unstoppable Combatant** — Encounter-per-day tracking
6. **Impetuous Move** — Trigger: Second Wind → Movement grant

**Development Effort**: 1-2 days
**Risk Level**: NONE
**Blockers**: None

---

### TIER 2 — LOW_RISK_WITH_SMALL_BRIDGE (10 feats, low risk)
⚠️ **Requires minimal bridges** — Mostly metadata + one conditional check per bridge

1. **Shake It Off** — Add swift-action recovery button to CT UI
2. **Galactic Alliance Military Training** — Damage system checks feat before CT worsening
3. **Ion Shielding** — Damage system checks damage type + feat
4. **Implant Training** — Damage system checks implant + feat
5. **Forceful Strike** — Force Power system checks feat on Force Stun use
6. **Forceful Telekinesis** — Force Power system checks feat on Move Object use
7. **Rancor Crush** — Crush feat triggers checks for this feat
8. **Bone Crusher** — Grapple system checks for this feat
9. **Sadistic Strike** — Coup de Grace triggers check for this feat
10. **Stay Up** — Damage reduction dialog offers CT-for-damage option

**Development Effort**: 3-4 days
**Risk Level**: LOW
**Blockers**: None (all hook points exist)

---

### TIER 3 — NEEDS_ANALYSIS (3 feats, requires clarification)
🟡 **Requires rule clarification** — Rule text ambiguous or needs design review

1. **Quick Comeback** — Rule text unclear ("recover quickly" = what exactly?)
2. **Frightful Presence** — May not belong in Bucket C (action/skill, not condition)
3. **Skill Challenge: Recovery** — Integration with Skill Challenge system unclear

**Status**: Request rule clarification before implementation
**Development Effort**: 1 day per feat (once rules clear)
**Risk Level**: MEDIUM
**Blockers**: Game designer input needed

---

## Summary Table

| Feat | Pattern | Tier | Risk | Effort | Hook Point | Blocker |
|------|---------|------|------|--------|-----------|---------|
| Resurgence | Event | 1 | None | 2h | ActorEngine.resetSecondWind | None |
| Recovering Surge | Event | 1 | None | 2h | ActorEngine.resetSecondWind | None |
| Forceful Recovery | Event | 1 | None | 2h | ActorEngine.resetSecondWind | None |
| Impetuous Move | Event | 1 | None | 2h | ActorEngine.resetSecondWind | None |
| Extra Second Wind | Tracking | 1 | None | 2h | ActorEngine.resetSecondWind | None |
| Unstoppable Combatant | Tracking | 1 | None | 3h | SecondWindEngine recovery | None |
| Shake It Off | UI | 2 | Low | 4h | ConditionTrackComponent | None |
| Galactic Alliance Military Training | Damage | 2 | Low | 3h | Damage system | None |
| Ion Shielding | Damage | 2 | Low | 3h | Damage system | None |
| Implant Training | Damage | 2 | Low | 3h | Damage system | None |
| Forceful Strike | Force | 2 | Low | 3h | ForceTrainingEngine | None |
| Forceful Telekinesis | Force | 2 | Low | 3h | ForceTrainingEngine | None |
| Rancor Crush | Feat Interaction | 2 | Low | 3h | MetaResourceFeatResolver | None |
| Bone Crusher | Feat Interaction | 2 | Low | 3h | MetaResourceFeatResolver | None |
| Sadistic Strike | Feat Interaction | 2 | Low | 3h | MetaResourceFeatResolver | None |
| Stay Up | Damage Dialog | 2 | Low | 4h | Damage reduction UI | None |
| Quick Comeback | Unknown | 3 | Medium | 2d | Unknown | Design review |
| Frightful Presence | Unknown | 3 | Medium | 2d | Unknown | Design review |
| Skill Challenge: Recovery | Unknown | 3 | Medium | 2d | Unknown | Design review |

---

## Recommendation

**Begin with Tier 1 (6 feats)** — Pure metadata, zero risk, enables testing of hook infrastructure.

Then move to **Tier 2 (10 feats)** — Each bridge is minimal and isolated, can be tested independently.

**Defer Tier 3** until rules are clarified.

**Estimated Total Effort**: 12-15 days for Tiers 1-2 (16 feats automated)

---

**Report Generated**: 2026-05-11  
**Status**: Ready for implementation scoping
