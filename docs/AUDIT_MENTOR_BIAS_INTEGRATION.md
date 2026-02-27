# Mentor Bias Integration Audit
## Wiring MentorBiasEngine into SuggestionEngine Scoring Pipeline

**Date:** 2026-02-27
**Status:** READY FOR IMPLEMENTATION
**Prerequisite:** ✅ Sovereignty clean, ✅ Tiers unified

---

## Executive Summary

MentorBiasEngine exists but is **disconnected from scoring**.

Currently:
```
SuggestionEngine.score(candidate)
  → Produces tier (TIER 5, TIER 4, etc.)
  → Returns to UI

MentorBiasEngine.calculateMentorBias(actor, candidate)
  → Produces bias modifier
  → NOT CALLED from scoring
  → Exists but isolated
```

Goal:
```
SuggestionEngine.score(candidate)
  → Legality check (AbilityEngine)
  → Alignment score (IntentScorer)
  → Mentor bias adjustment (MentorBiasEngine) ← NEW
  → Final score
  → Tier resolution (TierResolver)
  → Return to UI
```

---

## Current State of MentorBiasEngine

**File:** `scripts/engine/suggestion/mentor-suggestion-bias.js`

### Existing Functions
1. `calculateMentorBias(actor, candidate)`
   - Takes actor and candidate item
   - Returns numeric bias modifier

2. `applyMentorBias(baseScore, biasModifier)`
   - Applies bias to existing score
   - Returns adjusted score

### Current Usage
- **Imported by:** No files actively import it
- **Called by:** No active callers
- **Status:** Disconnected intelligence

### Data Sources (Pre-computed)
- `actor.system.buildIntent.mentorBiases`
- `actor.system.buildIntent.archetypes`
- UNIFIED_TIERS (for tier context)

---

## Integration Architecture

### Scoring Pipeline (Correct Order)

```javascript
// In SuggestionEngine._scoreSuggestion() or equivalent

// STEP 1: Legality boundary
const legality = AbilityEngine.evaluateAcquisition(actor, candidate);
if (!legality.legal) return null;  // Mentor bias NEVER overrides legality

// STEP 2: Intent-based scoring
const alignmentScore = IntentScorer.score(actor, candidate);

// STEP 3: Mentor bias adjustment (NEW)
const mentorBias = MentorBiasEngine.calculateMentorBias(actor, candidate);
const mentorAdjustedScore = alignmentScore + mentorBias;

// STEP 4: Tier resolution from final score
const tier = TierResolver.resolve(mentorAdjustedScore);

// STEP 5: Return to suggestion system
return {
  tier,
  score: mentorAdjustedScore,
  mentorInfluence: mentorBias,  // Track mentor contribution
  reasons: [...]
};
```

### MentorBiasEngine Constraints

**What it CAN do:**
- ✅ Add numeric bias to alignment score
- ✅ Nudge tie-breaking (equal scores favor mentor path)
- ✅ Adjust tier thresholds slightly
- ✅ Read pre-computed buildIntent data
- ✅ Provide reasoning for bias ("Mentor path aligned")

**What it CANNOT do:**
- ❌ Override legality
- ❌ Change prerequisite interpretation
- ❌ Inject new candidates
- ❌ Modify slots
- ❌ Access game.packs
- ❌ Import PrerequisiteChecker
- ❌ Mutate actor state

---

## Implementation Strategy

### Phase 1: Audit MentorBiasEngine

**Objective:** Verify it operates within sovereignty boundaries

**Checklist:**
- [ ] No `game.packs` access
- [ ] No `PrerequisiteChecker` import
- [ ] Pure scoring logic (no state mutation)
- [ ] Input: `(actor, candidate)` → Output: `numeric bias`
- [ ] Reads only from `buildIntent.mentorBiases`
- [ ] No side effects

### Phase 2: Identify Integration Points

**SuggestionEngine files to modify:**
1. `SuggestionEngine.js` - Main scoring method
2. `SuggestionService.js` - Coordinator (if it wraps scoring)
3. `SuggestionEngineCoordinator.js` - Orchestration layer

**Question:** Where does the scoring happen?
- Is there a single `score()` method?
- Does it call `IntentScorer`?
- Where does tier assignment happen?

### Phase 3: Wire Mentor Bias

**Pattern:**
```javascript
import { MentorBiasEngine } from './mentor-suggestion-bias.js';

// In scoring method
const alignmentScore = IntentScorer.score(actor, candidate);
const mentorBias = MentorBiasEngine.calculateMentorBias(actor, candidate);
const finalScore = alignmentScore + mentorBias;

// Add explanation
suggestion.mentorInfluence = mentorBias;
if (mentorBias > 0) {
  suggestion.reasons.push(
    `Mentor path: ${mentorBias.toFixed(1)} point bonus`
  );
}
```

### Phase 4: Update UI Layer

**What needs to change:**
- Display mentor influence in suggestion card
- Show "Mentor approved" badge/indicator
- Explain why mentor bias applied
- Show before/after scores if significant bias

**Suggestion output format:**
```javascript
{
  tier: 5,                    // Final tier
  score: 8.5,                 // Final score (with mentor bias)
  alignmentScore: 7.0,        // Original intent score
  mentorBias: +1.5,           // Mentor contribution
  reasons: [
    "Strong archetype match (+2.0)",
    "Mentor path aligned (+1.5)",
    "Prerequisites met"
  ]
}
```

### Phase 5: Validation & Testing

**Verify:**
- [ ] Mentor bias never overrides legality
- [ ] Tier assignment respects final (biased) score
- [ ] Bias can be zero (neutral mentor)
- [ ] Bias values are reasonable (typically -5 to +5)
- [ ] UI clearly shows mentor influence
- [ ] No performance regression

---

## Critical Invariants (NEVER VIOLATE)

### Invariant 1: Legality First
```javascript
if (!legal) return null;  // ALWAYS check before mentor bias
mentorBias = calculateBias(...);  // THEN apply bias
```

### Invariant 2: Scoring is Pure
```javascript
// ✅ Pure: returns same value for same inputs
mentorBias = MentorBiasEngine.calculateMentorBias(actor, candidate);

// ❌ Impure: has side effects
actor.system.mentorBiasApplied = true;  // NEVER mutate
```

### Invariant 3: Single Tier Authority
```javascript
// ✅ Correct: TierResolver makes final decision
const tier = TierResolver.resolve(finalScore);

// ❌ Wrong: Mentor bias creates custom tier
if (mentorBias > 3) tier = 6;  // NO! This breaks consistency
```

### Invariant 4: Transparency
```javascript
// ✅ Correct: Show breakdown
{
  score: 8.5,
  alignmentScore: 7.0,
  mentorBias: +1.5
}

// ❌ Wrong: Hide mentor contribution
{
  score: 8.5
  // User doesn't know mentor adjusted it
}
```

---

## Step-by-Step Integration

### Step 1: Locate SuggestionEngine Scoring Method
- Find where tier assignment happens
- Find where scores are calculated
- Identify if IntentScorer is used

### Step 2: Import MentorBiasEngine
```javascript
import { MentorBiasEngine } from './mentor-suggestion-bias.js';
```

### Step 3: Wire Bias into Scoring
- After legality check
- After alignment scoring
- Before tier resolution

### Step 4: Update Suggestion Output
- Add `mentorBias` field
- Add `alignmentScore` field
- Update `reasons` array with mentor explanation

### Step 5: Verify Tier Consistency
- Run suggestions for test character
- Verify equivalent items get same tier
- Verify mentor influence is reasonable
- Verify no legality violations

### Step 6: Update UI (if needed)
- Display mentor influence badge
- Show score breakdown
- Add mentor explanation

---

## Example Integration (Pseudocode)

```javascript
// In SuggestionEngine.js

static _scoreSuggestion(candidate, actor, options = {}) {
  const reasons = [];

  // BOUNDARY: Legality (non-negotiable)
  const legality = AbilityEngine.evaluateAcquisition(actor, candidate);
  if (!legality.legal) {
    return null;  // Mentor bias NEVER overrides legality
  }
  reasons.push(legality.reason);

  // BASE SCORING: Intent alignment
  const alignmentScore = IntentScorer.score(actor, candidate);
  let finalScore = alignmentScore;

  // MENTOR BIAS: Adjust for mentor personality (NEW)
  const mentorBias = MentorBiasEngine.calculateMentorBias(actor, candidate);
  if (mentorBias !== 0) {
    finalScore = alignmentScore + mentorBias;
    const direction = mentorBias > 0 ? 'boosts' : 'reduces';
    reasons.push(
      `Mentor ${direction} by ${Math.abs(mentorBias).toFixed(1)}`
    );
  }

  // TIER RESOLUTION: Single authority
  const tier = TierResolver.resolve(finalScore);

  return {
    tier,
    score: finalScore,
    alignmentScore,      // Show original for transparency
    mentorBias,          // Show mentor contribution
    reasons
  };
}
```

---

## Success Criteria

After integration:

- [ ] MentorBiasEngine called during scoring
- [ ] Mentor bias never overrides legality
- [ ] Tier assignment uses final (biased) score
- [ ] UI displays mentor influence clearly
- [ ] Equivalent items get same tier across runs
- [ ] Mentor explanation in reasons array
- [ ] No performance regression
- [ ] All Phase 5A goals met

---

## What Happens Next

**With Mentor Bias Wired:**

1. **Miraj can guide subtly** - "This aligns with your path toward Jedi Knight" (+1.5)
2. **Suggestions reflect personality** - Mentor preferences applied consistently
3. **Transparency** - Users see how mentor influenced ranking
4. **No sovereignty violations** - Legality untouched, tier authority maintained
5. **Phase 5A complete** - Advisory layer fully operational

**Example output:**
```
Suggestion: "Force Sensitivity"
Tier: 5 (Prestige Qualified Now)
Base Score: 7.0 (Intent alignment)
Mentor Bonus: +1.5 (Your mentor encourages Force development)
Final Score: 8.5

Reasons:
- Your character shows Force aptitude
- Mentor strongly recommends this path
- Prerequisites met
```

---

## References

- AUDIT_GAME_PACKS_VIOLATIONS.md - Enumeration sovereignty ✅
- AUDIT_TIER_RESOLUTION_UNIFICATION.md - Tier unification ✅
- AUDIT_EXECUTIVE_SUMMARY.md - Phase 5A overview
- Scripts: mentor-suggestion-bias.js (disconnected), SuggestionEngine.js (integration point)

