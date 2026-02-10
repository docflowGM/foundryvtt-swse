# Integration Tests Guide

**Purpose:** Validate the complete SWSE Suggestion Engine implementation

**Location:** `/scripts/suggestion-engine/tests/integration-tests.js`

---

## Test Coverage

### Core Engine Tests
- ✅ ArmorScoringEngine produces valid scores
- ✅ Armor talents modify scores correctly
- ✅ WeaponScoringEngine produces valid scores
- ✅ Scoring pipeline produces bounded 0-100 scores

### Suggestion Coordinator Tests
- ✅ ArmorSuggestions generates ranked lists
- ✅ WeaponSuggestions generates ranked lists
- ✅ "No Armor" is always present as virtual option
- ✅ "No Armor" penalized when talents present

### Engine↔Store Contract Tests
- ✅ Response objects have required fields
- ✅ Store can consume output as-is
- ✅ Engine provides complete component breakdown
- ✅ Explanations are character-specific

### Explainability Tests
- ✅ 2-4 explanations generated per item
- ✅ Explanations are character-contextual
- ✅ All explanations are non-empty strings

### Mentor Prose Generation Tests
- ✅ Prose generated from engine explanations
- ✅ "No Armor" case handled specially
- ✅ Basis note generated with role/talents
- ✅ Diegetic language (not mechanical)

### Tier System Tests
- ✅ Consistent tier assignments
- ✅ Multiple viable options in top tier
- ✅ Clustering (top options close together)

### Edge Case Tests
- ✅ Missing metadata handled gracefully
- ✅ Low-level characters with talents
- ✅ High-level characters without talents

---

## Running Tests

### Node.js (Standalone)

```bash
cd /home/user/foundryvtt-swse

# Run tests
node scripts/suggestion-engine/tests/integration-tests.js
```

Expected output:
```
✓ ArmorScoringEngine: Scores armor correctly
✓ ArmorScoringEngine: Talent modifier applies
✓ ArmorSuggestions: Generates suggestions
✓ ArmorSuggestions: "No Armor" is virtual option
...

============================================================
Integration Test Summary
============================================================
Passed: XX/YY (ZZ%)
Failed: 0/YY
============================================================
```

### In Foundry VTT (via Module)

If integrated into the module:

```javascript
import { runIntegrationTests } from './scripts/suggestion-engine/tests/integration-tests.js';

// Run tests
const result = runIntegrationTests();

// Check result
if (result.allPassed) {
  console.log('All tests passed!');
} else {
  console.log(`${result.failed} tests failed`);
}
```

---

## Test Cases

### Test 1: Basic Armor Scoring
```javascript
Character: Level 15 Defender with Armored Defense
Armor: Heavy Battle Armor (+6 soak)

Expected:
- Score: 40+ (strong fit)
- Tier: "strong-fit"
- Explanations: 2-4 bullets
```

### Test 2: Talent Impact
```javascript
Character A: Level 15 Defender with Armored Defense + Armor Mastery
Character B: Level 15 Defender with no armor talents
Armor: Same heavy armor

Expected:
- Score A > Score B (talents provide bonus)
- Difference: 8-12 points
```

### Test 3: "No Armor" Virtual Option
```javascript
Character: Level 15 Defender with Armor Mastery
Armor Options: [Heavy, Medium, Light]

Expected:
- "No Armor" evaluated: YES
- "No Armor" in results: YES
- "No Armor" score: <25 (penalized due to unused talents)
- "No Armor" tier: "outperformed"
```

### Test 4: Engine↔Store Contract
```javascript
Character: Level 15 Striker
Result: ArmorScoringEngine.scoreArmor(armor, char)

Expected response shape:
{
  armorId: "...",
  armorName: "...",
  combined: {
    finalScore: 0-100,
    tier: "strong-fit" | "viable" | "situational" | "outperformed"
  },
  explanations: ["...", "...", "..."],
  components: {
    baseRelevance: number,
    roleAlignment: number,
    axisA: number,
    axisB: number,
    priceBias: number
  }
}
```

### Test 5: Mentor Prose Generation
```javascript
Input:
- Engine suggestion object (from armor scoring)
- Character context (role, talents)

Process:
- MentorProseGenerator.generateMentorReview(suggestion, charContext)

Expected output:
- Non-null prose (2-3 sentences)
- Diegetic language ("You've trained..." not "Role alignment +15")
- Mentions relevant talents/role
- No mechanical language
```

---

## Sanity Checks

These tests validate the design philosophy:

1. **High-accuracy weapon NOT always beats high-impact weapon**
   - ✅ Weighted harmonic mean prevents dominance
   - ✅ Different characters prefer different tradeoffs

2. **Cheap weapon NOT always beats expensive**
   - ✅ Price bias capped at ±6 points (never dominant)
   - ✅ Quality matters more than cost

3. **Autofire NOT always floats to top**
   - ✅ Accuracy traits weighted moderately
   - ✅ Balanced against reliability

4. **Heavy armor NOT always beats light universally**
   - ✅ Axis B penalty for mobile characters
   - ✅ Tier clustering allows situational preference

5. **Suggestions differ by character build**
   - ✅ Talents modify scores
   - ✅ Attributes adjust weights
   - ✅ Roles change emphasis

---

## Extending Tests

To add a new test:

```javascript
suite.test('Description of test', () => {
  // Setup
  const char = createMockCharacter({...});
  const item = createMockArmor({...});

  // Execute
  const result = ArmorScoringEngine.scoreArmor(item, char);

  // Assert
  suite.assert(result.combined.finalScore > 0, 'Score is positive');
});
```

---

## Debugging Test Failures

If a test fails:

1. **Check mock data** - Are overrides correct?
   ```javascript
   // Verify mock has expected properties
   console.log(JSON.stringify(mockCharacter, null, 2));
   ```

2. **Add console output** - Log intermediate values
   ```javascript
   const result = ArmorScoringEngine.scoreArmor(armor, char);
   console.log('Final score:', result.combined.finalScore);
   console.log('Tier:', result.combined.tier);
   ```

3. **Check boundary conditions** - Is score clamped to 0-100?
   ```javascript
   suite.assert(result.combined.finalScore >= 0, 'Score >= 0');
   suite.assert(result.combined.finalScore <= 100, 'Score <= 100');
   ```

4. **Verify engine integration** - Are all engines being called?
   ```javascript
   console.log('Components:', JSON.stringify(result.components, null, 2));
   ```

---

## Expected Results

### Test Success Criteria

All tests should pass with:
- **Passed:** 28+
- **Failed:** 0
- **Pass rate:** 100%

If any tests fail, the engine has a bug that needs fixing before deployment.

---

## Next Steps After Tests Pass

1. **Real Compendium Data**
   - Load real SWSE compendium items
   - Score all weapons, armor, gear
   - Verify sanity checks with real data

2. **Store UI Integration**
   - Wire suggestion engine to store cards
   - Test mentor prose generation
   - Validate mentor triggers

3. **Telemetry**
   - Log suggestion scores
   - Track mentor appearance rates
   - Measure player purchase patterns

4. **Field Testing**
   - Deploy to test group
   - Collect feedback
   - Iterate on weights if needed

---

**Test Suite Ready:** All integration tests designed and implemented.
**Next Phase:** Real compendium data validation + Store UI integration.
