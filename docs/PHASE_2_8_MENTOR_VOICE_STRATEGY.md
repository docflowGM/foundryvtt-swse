# Phase 2.8: Mentor Voice & Personality Integration Strategy

## Current State Analysis

### What We Have (Phase 2.7)

All suggestions now include:
```javascript
suggestion.mentorAtoms = ['CommitmentDeclared', 'GoalAdvancement', ...]
suggestion.mentorIntensity = 'very_high'
suggestion.mentorSelectedReasons = ['prestige_path_consistency', ...]
```

### Where It's Used

Current voice generation in MentorSuggestionVoice:

```javascript
static generateVoicedSuggestion(mentorName, suggestion, context) {
  return {
    introduction: this.getRandomIntroduction(mentorName, context),
    explanation: this.getRandomExplanation(mentorName, context),  // ← Currently generic
    mentorName: mentorName,
    suggestionName: suggestion.name || suggestion,
    tier: suggestion.tier || 0,
    icon: suggestion.icon || null
  };
}
```

**Problem:** explanation ignores mentorAtoms and mentorIntensity

---

## Design Options

### Option A: Intensity-Level Voice Variations
```
SUGGESTION_VOICES structure:
{
  'Miraj': {
    feat_selection: {
      very_high: [...5 intense explanations],
      high: [...5 strong explanations],
      medium: [...5 neutral explanations],
      low: [...5 mild explanations]
    }
  }
}
```

**Pros:** Direct mapping, simple selection
**Cons:** Huge data structure, many strings to maintain, non-breaking but requires data update

### Option B: Atom-Based Explanation Generation (Recommended)
```
Create MentorJudgmentEngine that:
1. Takes atoms as input
2. Maps each atom to mentor-specific phrasing
3. Combines atoms into explanation
4. Applies intensity scaling
```

**Example:**
- Input: atoms=['CommitmentDeclared', 'GoalAdvancement'], intensity='very_high'
- Output: "This is a crucial step on your path. Your commitment defines your future."

**Pros:** Flexible, extensible, no hardcoded strings, works with any mentor
**Cons:** More complex logic, needs atom→phrase mapping

### Option C: Intensity Modulation (Hybrid)
```
Keep current SUGGESTION_VOICES structure
Use mentorIntensity to select emphasis level:
- very_high: Use strongest phrasing
- high: Use strong phrasing
- medium: Use neutral phrasing
- low: Use mild phrasing
```

**Pros:** Non-breaking, leverages current system, simple implementation
**Cons:** Still based on random selection, not contextual

---

## Recommended Approach: Option B + C Hybrid

### Layer 1: MentorSuggestionVoice (Keep Existing)
- Keep SUGGESTION_VOICES as is
- generateVoicedSuggestion accepts optional atoms/intensity
- Falls back to current behavior if atoms unavailable

### Layer 2: MentorJudgmentEngine (New - Phase 2.8)
- Maps atoms → mentor-specific phrases
- Combines atoms into coherent explanation
- Applies intensity scaling
- Mentor personality filters atoms

### Layer 3: Integration
```
MentorSuggestionDialog.show()
  └─ MentorSuggestionVoice.generateVoicedSuggestion()
     ├─ If mentorAtoms available:
     │  └─ Call MentorJudgmentEngine.buildExplanation()
     │     └─ Returns atom-aware explanation
     └─ Else (fallback):
        └─ Use current getRandomExplanation()
```

---

## MentorJudgmentEngine Design

### Structure

```javascript
export class MentorJudgmentEngine {
  /**
   * Convert mentor atoms into mentor-voiced explanation
   *
   * @param {string[]} atoms - Mentor atoms from selector
   * @param {string} mentorName - Mentor personality
   * @param {string} context - Decision context (feat_selection, etc.)
   * @param {string} intensity - Intensity level
   * @returns {string} Mentor-specific explanation
   */
  static buildExplanation(atoms, mentorName, context, intensity = 'medium') {
    // 1. Get mentor personality
    // 2. Filter atoms by context relevance
    // 3. Map atoms to mentor phrases
    // 4. Combine into explanation
    // 5. Apply intensity scaling
    // 6. Return final text
  }
}
```

### Atom → Phrase Mapping

Each mentor has phrase templates for each atom type:

```javascript
MENTOR_ATOM_PHRASES = {
  'Miraj': {
    'CommitmentDeclared': {
      very_high: "Your dedication defines your path.",
      high: "Your commitment is evident.",
      medium: "You show commitment.",
      low: "Your choices matter."
    },
    'GoalAdvancement': {
      very_high: "This moves you toward your destiny.",
      high: "This advances your goal.",
      medium: "This supports your aim.",
      low: "This relates to your path."
    },
    'DependencyChain': {
      very_high: "This is essential to your goal.",
      high: "This is important for what comes next.",
      medium: "This builds on previous choices.",
      low: "This connects to earlier selections."
    },
    // ... more atoms
  },
  'Lead': {
    'CommitmentDeclared': {
      very_high: "You're serious about this path.",
      high: "You're committed.",
      medium: "You're pursuing a goal.",
      low: "You're making progress."
    },
    // ... more atoms
  }
}
```

### Intensity Scaling

```
very_high: Emphatic language, absolute statements
           "This is essential..." "You must..."

high:      Strong language, definitive statements
           "This is important..." "You should..."

medium:    Neutral language, suggestive statements
           "This is useful..." "Consider..."

low:       Mild language, tentative statements
           "This might help..." "You could..."

very_low:  Minimal language, optional statements
           "This is an option..." "You could also..."
```

---

## Implementation Steps

### Step 1: Create MentorAtomPhrases
- File: `scripts/engine/mentor/mentor-atom-phrases.js`
- Defines atom → phrase mapping per mentor
- Includes intensity variants
- Simple declarative structure

### Step 2: Create MentorJudgmentEngine
- File: `scripts/engine/mentor/mentor-judgment-engine.js`
- Core logic: atoms → explanation
- Combines multiple atoms intelligently
- Applies intensity scaling
- Handles fallback cases

### Step 3: Update MentorSuggestionVoice
- Accept optional atoms/intensity parameters
- Check if atoms available
- Call MentorJudgmentEngine if atoms present
- Fallback to current behavior
- Keep backwards compatible

### Step 4: Update MentorSuggestionDialog
- Pass suggestion.mentorAtoms to voice generator
- Pass suggestion.mentorIntensity
- No other changes needed

### Step 5: Testing
- Unit tests for MentorJudgmentEngine
- Integration test: full flow with atoms
- Visual test: mentor dialog uses atoms
- Fallback test: works without atoms

---

## Data Flow (Phase 2.8)

```
SuggestionService._enrichSuggestions()
  └─ Returns: suggestion.mentorAtoms, mentorIntensity

LevelupMain.onSuggestFeat()
  └─ Gets topSuggestion with atoms

MentorSuggestionDialog.show()
  └─ Passes suggestion to MentorSuggestionVoice

MentorSuggestionVoice.generateVoicedSuggestion()
  ├─ NEW: Receives atoms and intensity from suggestion
  ├─ NEW: Calls MentorJudgmentEngine.buildExplanation()
  │       (if atoms available)
  │       └─ Returns atom-aware explanation
  ├─ NEW: Stores intensity for UI styling (future)
  └─ Returns: { introduction, explanation, ... }

MentorSuggestionDialog
  └─ Displays voicedSuggestion (now with atom-aware text)
```

---

## Code Changes

### MentorSuggestionVoice (Modified)

```javascript
static generateVoicedSuggestion(mentorName, suggestion, context) {
  let explanation = this.getRandomExplanation(mentorName, context);

  // PHASE 2.8: Use atoms for atom-aware explanation
  if (suggestion?.mentorAtoms && suggestion?.mentorIntensity) {
    try {
      explanation = MentorJudgmentEngine.buildExplanation(
        suggestion.mentorAtoms,
        mentorName,
        context,
        suggestion.mentorIntensity
      );
    } catch (err) {
      // Fallback to generic explanation
      console.warn('MentorJudgmentEngine failed:', err);
    }
  }

  return {
    introduction: this.getRandomIntroduction(mentorName, context),
    explanation,  // ← Now potentially atom-aware
    mentorName,
    suggestionName: suggestion.name || suggestion,
    tier: suggestion.tier || 0,
    icon: suggestion.icon || null,
    intensity: suggestion.mentorIntensity  // ← For UI styling
  };
}
```

---

## Example: Full Flow

### Input
```javascript
suggestion = {
  name: "Force Training",
  mentorAtoms: ['CommitmentDeclared', 'GoalAdvancement', 'DependencyChain'],
  mentorIntensity: 'very_high',
  mentorSelectedReasons: ['prestige_path_consistency', ...]
}
context = 'feat_selection'
mentorName = 'Miraj'
```

### Step 1: MentorSuggestionVoice.generateVoicedSuggestion()
- Receives atoms and intensity
- Calls MentorJudgmentEngine.buildExplanation()

### Step 2: MentorJudgmentEngine.buildExplanation()
- Inputs: atoms=['CommitmentDeclared', 'GoalAdvancement', 'DependencyChain']
- Intensity: 'very_high'
- Mentor: 'Miraj'

**Process:**
1. Get Miraj's phrases for atoms
2. Filter to 'feat_selection' context (optional)
3. Select 'very_high' intensity variants
4. Combine atoms: "Your dedication defines your path. This moves you toward your destiny. This is essential to your goal."
5. Return combined explanation

### Step 3: MentorSuggestionDialog
```javascript
voicedSuggestion = {
  introduction: "The Force guides this moment. Let me share my counsel.",
  explanation: "Your dedication defines your path. This moves you toward your destiny. This is essential to your goal.",
  mentorName: 'Miraj',
  suggestionName: 'Force Training',
  tier: 6,
  intensity: 'very_high'
}
```

### Step 4: Render
```
┌─────────────────────────────────────┐
│ Miraj's Suggestion                  │
├─────────────────────────────────────┤
│ The Force guides this moment. Let   │
│ me share my counsel.                │
│                                     │
│ Force Training                      │
│                                     │
│ Your dedication defines your path.  │
│ This moves you toward your destiny. │
│ This is essential to your goal.     │
│                                     │
│ [Apply Suggestion] [Dismiss]        │
└─────────────────────────────────────┘
```

---

## Backwards Compatibility

✅ **Zero breaking changes**
- New atoms/intensity parameters are optional
- If not provided, falls back to current behavior
- Existing suggestion flow unaffected
- Safe error handling

---

## Testing Strategy

### Unit Tests: MentorJudgmentEngine
1. Single atom → phrase mapping
2. Multiple atoms → combined explanation
3. Intensity variants applied
4. Unknown atom graceful handling
5. Unknown mentor graceful handling
6. Context filtering (if implemented)

### Integration Tests
1. Full flow: atoms → explanation
2. Different intensity levels produce different text
3. Multiple mentors produce different text
4. Fallback when atoms unavailable
5. Error handling doesn't crash

### Visual Tests
1. In-game mentor dialog uses atom-aware text
2. Intensity affects text tone
3. Different mentors have different personalities
4. Looks natural and reads well

---

## Files to Create

```
scripts/engine/mentor/
  ├─ mentor-atom-phrases.js          (Atom → phrase mapping)
  └─ mentor-judgment-engine.js       (Atoms → explanation)
```

## Files to Modify

```
scripts/mentor/
  └─ mentor-suggestion-voice.js      (Accept atoms, call engine)
```

---

## Success Criteria

- [ ] MentorJudgmentEngine.buildExplanation() works correctly
- [ ] Atoms map to appropriate mentor phrases
- [ ] Intensity scaling applies correctly
- [ ] Integration with MentorSuggestionVoice seamless
- [ ] Backwards compatible (no atoms = fallback)
- [ ] In-game mentor explanations use atoms
- [ ] Different mentors have different tone
- [ ] Text reads naturally
- [ ] No performance degradation

---

## Timeline

- Create atom phrase mapping: 1-2 hours
- Create MentorJudgmentEngine: 1-2 hours
- Update MentorSuggestionVoice: 30 minutes
- Testing: 1-2 hours
- Total: 4-6 hours

---

## Future Enhancements (Phase 3.0+)

1. **Context-aware filtering:** Filter atoms by feat_selection vs talent_selection
2. **Conflict resolution:** Handle contradicting atoms (e.g., deviation + prestige)
3. **Atom weighting:** Some atoms more important than others
4. **Mentor personality:** Apply mentor personality to atom selection
5. **Build coherence:** Reference other aspects of build
6. **Narrative variants:** Different phrasing for same atoms
7. **Multi-atom phrases:** Special handling for atom combinations

---

## Architecture Quality

This approach maintains:
- ✅ Clean separation (voice stays separate from judgment)
- ✅ Extensibility (add mentors without code changes)
- ✅ Determinism (same atoms → same explanation)
- ✅ Safety (graceful fallback)
- ✅ Flexibility (works with any mentor/context)
