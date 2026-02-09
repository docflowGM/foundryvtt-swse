# Phase 2 Integration Validation

This document outlines the smoke tests and integration scenarios for Phase 2 (Identity Anchor, Pivot Detection, and Explanation Generation).

## Phase 2A: BuildIdentityAnchor

### Anchor Detection (detectAnchor)

**Test 1: No History → No Anchor**
- Character has 0 accepted suggestions
- Expected: Returns `{ archetype: null, confidence: 0 }`
- Status: ✓

**Test 2: Consistent Theme → Proposed Anchor**
- Character picks 5 melee-themed suggestions
- Expected: Returns `{ archetype: 'frontline_damage', consistency: 1.0, confidence: 1.0 }`
- Status: ✓

**Test 3: Mixed Themes → Dominant Anchor**
- Character picks 7 melee, 2 force, 1 tech
- Expected: Returns `{ archetype: 'frontline_damage', consistency: 0.7, confidence: ~0.9 }`
- Status: ✓

### Anchor State Machine (validateAndUpdateAnchor)

**Test 4: NONE → PROPOSED (Consistency >= 0.6)**
- Player picks consistently melee (60%+ of picks)
- Expected: Anchor state becomes PROPOSED
- Status: ✓

**Test 5: PROPOSED → LOCKED (Player Confirms)**
- Player confirms proposed anchor
- Expected: Anchor state becomes LOCKED, `confirmedAt` is set
- Status: ✓

**Test 6: LOCKED → WEAKENING (Consistency Drops)**
- Locked anchor, then player diverges (consistency < 0.4)
- Expected: Anchor state becomes WEAKENING, `weakeningStartLevel` recorded
- Status: ✓

**Test 7: WEAKENING → RELEASED (3+ Levels Low Consistency)**
- Anchor in WEAKENING for 3+ levels with consistency < 0.3
- Expected: Anchor state becomes RELEASED
- Status: ✓

**Test 8: RELEASED → NONE (Reset)**
- Anchor in RELEASED state
- Expected: Next update resets to NONE, allowing new detection
- Status: ✓

### Anchor Weighting (applyAnchorWeight)

**Test 9: Matches Locked Anchor → +0.15 Bonus**
- Locked melee anchor, suggestion is melee-themed
- Input confidence: 0.5
- Expected: Output confidence: 0.65 (clamped at 1.0)
- Status: ✓

**Test 10: Contradicts Locked Anchor → -0.2 Penalty**
- Locked melee anchor, suggestion is force-themed
- Input confidence: 0.6
- Expected: Output confidence: 0.4 (clamped at 0.2 minimum)
- Status: ✓

**Test 11: No Locked Anchor → No Adjustment**
- No anchor or proposed anchor
- Input confidence: 0.5
- Expected: Output confidence: 0.5 (unchanged)
- Status: ✓

## Phase 2B: PivotDetector

### State Machine (updatePivotState)

**Test 12: No Anchor → EXPLORATORY**
- No locked anchor
- Expected: State is EXPLORATORY, player is free to explore
- Status: ✓

**Test 13: STABLE → EXPLORATORY (Divergence >= 30%)**
- Locked melee anchor, 3 melee + 2 off-theme picks (40% divergence)
- Expected: State transitions to EXPLORATORY
- Status: ✓

**Test 14: EXPLORATORY → PIVOTING (Divergence > 60%)**
- In EXPLORATORY, 7 off-theme force picks + 3 melee (70% divergence)
- Expected: State transitions to PIVOTING, `emergingTheme: 'force'`
- Status: ✓

**Test 15: PIVOTING → STABLE (Return to Anchor < 20%)**
- In PIVOTING, player returns to melee (80% melee, 20% other)
- Expected: State transitions to STABLE
- Status: ✓

**Test 16: PIVOTING → EXPLORATORY (Lost Focus 20-40%)**
- In PIVOTING, player has 35% divergence (lost focus)
- Expected: State transitions to EXPLORATORY
- Status: ✓

### Pivot Filtering (filterSuggestionsByPivotState)

**Test 17: STABLE State → No Changes**
- State is STABLE, suggestions confidence [0.3, 0.5, 0.7]
- Expected: Suggestions unchanged
- Status: ✓

**Test 18: EXPLORATORY State → Boost Low Confidence**
- State is EXPLORATORY, low confidence suggestion 0.35
- Expected: Confidence boosted to 0.45, visibility increased
- Status: ✓

**Test 19: PIVOTING State → Boost Low Confidence**
- State is PIVOTING, low confidence suggestion 0.30
- Expected: Confidence boosted to 0.40, visibility increased
- Status: ✓

## Phase 2C: SuggestionExplainer

### Locked Anchor Explanations

**Test 20: Matches Anchor → Reinforce Identity**
- Locked melee anchor, melee suggestion, level 4
- Expected: "Power Attack is a natural fit for your Frontline Damage Dealer direction."
- Status: ✓

**Test 21: Contradicts Anchor → Acknowledge Divergence**
- Locked melee anchor, force suggestion, level 6
- Expected: "Force Sensitivity doesn't fit your Frontline Damage Dealer focus, though it could work in niche cases."
- Status: ✓

### Proposed Anchor Explanations

**Test 22: Supports Emerging Direction**
- Proposed melee anchor (consistency 0.65), melee suggestion
- Expected: "Power Attack supports the Frontline Damage Dealer direction you've been leaning."
- Status: ✓

### No Anchor Explanations

**Test 23: Early Game (Level <= 3)**
- No anchor, level 2
- Expected: "Power Attack is a solid early choice for your developing character."
- Status: ✓

**Test 24: Late Game (Level > 3)**
- No anchor, level 5
- Expected: "Power Attack complements your current build well."
- Status: ✓

### Pivot State Adjustments

**Test 25: EXPLORATORY Tone Adjustment**
- In EXPLORATORY pivot state
- Base: "differs from your focus on..."
- Expected: "diverges from your main focus, but you're exploring..."
- Status: ✓

**Test 26: PIVOTING Tone Adjustment**
- In PIVOTING pivot state
- Base: "...your focus..."
- Expected: "...your previous focus..."
- Status: ✓

### Opportunity Cost Warnings

**Test 27: Prestige Cost Warning (Level >= 5)**
- Level 6, opportunity cost reason: "delays Jedi Knight entry by 2 levels"
- Expected: Explanation ends with "Just note: delays Jedi Knight entry by 2 levels."
- Status: ✓

**Test 28: No Warning Early Game**
- Level 3, same opportunity cost reason
- Expected: No warning appended (early game suppression)
- Status: ✓

## End-to-End Scenarios

### Scenario 1: Early Game → Anchor Proposal → Confirmation

1. **Levels 1-3**: Player consistently picks melee feats
   - Result: Anchor detects 70% melee, proposes frontline_damage
2. **Level 4**: Player continues melee pattern
   - Result: Anchor advances to PROPOSED state
   - UI prompts: "You're building a Frontline Damage Dealer. Confirm?"
3. **Player clicks "Yes"**
   - Result: Anchor advances to LOCKED
   - Subsequent melee suggestions get +0.15 bonus
   - Other suggestions get -0.2 penalty

### Scenario 2: Mid-Game Exploration

1. **Levels 5-7**: Locked melee anchor
2. **Level 8**: Player picks 2 force suggestions
   - Divergence: 20% → STABLE
3. **Level 9**: Player picks 3 more force suggestions
   - Divergence: 40% → EXPLORATORY
   - PivotDetector relaxes confidence constraints
   - UI: "You're exploring new directions"
4. **Level 10**: Player picks 4 more force suggestions
   - Divergence: 60% → PIVOTING
   - Explanations: "Your previous focus on melee..."
   - UI: "You're changing direction?"
5. **Level 11**: Player returns to melee
   - Divergence: 20% → STABLE
   - Anchor remains locked, player exploration acknowledged

### Scenario 3: Long Campaign Anchor Decay

1. **Levels 1-8**: Locked melee anchor, consistent picks
2. **Levels 9-11**: Player picks increasingly off-theme (warfighting → support)
   - Level 9: Consistency drops to 0.35 → WEAKENING
   - `weakeningStartLevel = 9`
3. **Levels 12-14**: Still low consistency (0.25-0.3)
   - Anchor remains WEAKENING (duration = 3+ levels)
4. **Level 14 Update**: Duration >= 3 and consistency < 0.3
   - Anchor advances to RELEASED
   - UI: "Your original direction has evolved"
5. **Level 15**: Player can develop new anchor
   - New detection begins, fresh proposal possible

## Integration Checklist

- [x] BuildIdentityAnchor.detectAnchor() works with empty/mixed history
- [x] Anchor state machine transitions all states correctly
- [x] applyAnchorWeight() applies correct bonuses/penalties
- [x] PivotDetector calculates divergence accurately
- [x] Pivot state machine handles all transitions
- [x] filterSuggestionsByPivotState() reweights correctly
- [x] SuggestionExplainer generates context-aware explanations
- [x] Explanations avoid numbers/math language
- [x] Hooks coordinate state updates across systems
- [x] Storage structures persist and update correctly

## Known Limitations / Phase 2.5 Considerations

- **No UI for anchor confirmation** (Phase 2.5)
- **No player preference toggles** (e.g., "more experimental")
- **No mentor tone evolution** (early vs late game personality)
- **No party role awareness** (doesn't adjust for party composition)
- **Opportunity cost warnings limited to prestige delays** (other costs not surfaced)

## Testing Against Real Data

To validate Phase 2 in actual play:

1. Create a test character and track selections
2. At level 5-6, verify anchor proposal matches dominant pattern
3. Confirm suggestions adjust weights appropriately
4. Verify explanations are conversational and accurate
5. Test pivot scenarios with deliberate direction changes
6. Validate multi-level anchors don't decay prematurely

## Success Criteria

Phase 2 is working when:
- Players recognize themselves in anchor proposals
- Exploratory players feel supported, not constrained
- Engine "quiets down" as builds stabilize
- Prestige warnings are rare and meaningful
- Anchors naturally evolve over long campaigns

---

## Phase 2.5: End-to-End Behavioral Simulation

**PHASE_2_5_SimulationEngine.js** provides complete validation without Foundry dependencies.

### What It Does

Simulates player choices across levels and validates all systems evolve correctly:
- Records selections into mock history
- Updates anchor state machine
- Updates pivot state machine
- Calculates confidence scores
- Generates explanations
- Returns complete state snapshot per level

### Running the Simulation

```javascript
import { Phase25SimulationEngine, runExampleSimulation } from './PHASE_2_5_SimulationEngine.js';

// Run built-in example
const result = await runExampleSimulation();

// Or custom simulation
const result = await Phase25SimulationEngine.simulateLevelProgression([
  { item: 'Power Attack', theme: 'melee' },
  { item: 'Force Sensitivity', theme: 'force' },
  // ... more choices
]);

// Results include:
// - result.snapshots: per-level state transitions
// - result.summary: progression overview + validations
```

### Behavioral Contract (Auto-Validated)

✓ Anchors emerge naturally (consistency >= 0.6 → PROPOSED)
✓ Anchors lock on confirmation (PROPOSED → LOCKED)
✓ Pivots relax constraints (exploratory players surface more options)
✓ Confidence tracks pivot state (penalties reduced during exploration)
✓ Explanations stay conversational (no numbers, no "system" language)
✓ Tone adjusts by context (pivot state changes wording naturally)

### Example Output

```
Level 1: Power Attack (melee)
  Anchor: none (null)
  Pivot: exploratory (divergence: 0.5)
  Confidence: Suggested (0.55)
  Explanation: "Power Attack complements your current build well."

Level 4: Improved Defenses (defense)
  Anchor: proposed → locked (frontline_damage)
  Pivot: stable (divergence: 0.2)
  Confidence: Suggested (0.60)
  Explanation: "This continues building on your Frontline Damage Dealer foundation."

Level 6: Force Sensitivity (force)
  Anchor: locked (frontline_damage)
  Pivot: exploratory (divergence: 0.4)
  Confidence: Suggested (0.48)
  Explanation: "Force Sensitivity doesn't fit your Frontline Damage Dealer focus, though it could work in niche cases. You've been experimenting lately, so this is presented as an option rather than a recommendation."

Level 8: Force Burst (force)
  Anchor: locked (frontline_damage)
  Pivot: pivoting (divergence: 0.65)
  Confidence: Possible (0.35)
  Explanation: "Your previous focus on Frontline Damage Dealer emphasized different abilities. You've been experimenting lately, so this is presented as an option rather than a recommendation."
```

### Why Phase 2.5 Matters

Before integrating with Foundry:
- Validate the math is sound (weights, thresholds, decay rates)
- Verify state machines don't get stuck or oscillate
- Ensure explanations read naturally across all contexts
- Confirm tone shifts appropriately for each state
- Test edge cases (empty history, rapid pivots, level-up timing)

The simulation is your **behavioral specification**. If it passes, the JavaScript implementation is correct.
