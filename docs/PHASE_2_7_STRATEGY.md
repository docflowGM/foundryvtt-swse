# Phase 2.7: Integration Strategy

## Current Data Flow Analysis

```
SuggestionEngine.suggestFeats()
  ↓ Returns suggestions with .suggestion: { tier, reasonCode, reasonSignals, reason: {atoms, ...} }

SuggestionEngineCoordinator.suggestFeats()
  ↓ Passes through unchanged

SuggestionService.getSuggestions()
  ↓ Calls coordinator, then _enrichSuggestions()
    ├─ Adds .targetRef (drift-safe resolution)
    ├─ Generates .reasons via SuggestionExplainer
    ├─ Computes .confidence
    ├─ Adds .explanation via SuggestionExplainer
    └─ Adds .tone

LevelupMain onSuggestFeat()
  ↓ Gets topSuggestion from enriched suggestions

MentorSuggestionDialog.show(mentorName, topSuggestion, context)
  ↓ Generates voicedSuggestion via MentorSuggestionVoice

MentorSuggestionVoice.generateVoicedSuggestion()
  ├─ Calls mentor-dialogues.js
  └─ Returns { text, tier, ... }
```

## Integration Points

**Point A: SuggestionService._enrichSuggestions() (Line 481)**
- reasonSignals are now in suggestion.suggestion.reasonSignals
- Can apply MentorReasonSelector here to compute mentor atoms + intensity
- Add new field: suggestion.mentorAtoms, suggestion.mentorIntensity

**Point B: MentorSuggestionDialog/MentorSuggestionVoice**
- Currently generates text generically
- Should use mentorAtoms from suggestion for mentor-specific text generation
- Hook point: Pass atoms to voice generation

**Point C: MentorReasonSelector Usage**
- Called in _enrichSuggestions with (suggestion.suggestion.reasonSignals, mentorProfile)
- Stores result in suggestion.mentorAtoms, suggestion.mentorIntensity

## Phase 2.7 Implementation Steps

### Step 1: Update SuggestionService._enrichSuggestions()
- Import MentorReasonSelector
- After line 506-511 (where reasons are generated), add:
  ```javascript
  // Apply mentor reason selector to determine mentor atoms + intensity
  if (suggestion.suggestion?.reasonSignals && mentorProfile) {
    const mentorSelection = MentorReasonSelector.select(
      suggestion.suggestion.reasonSignals,
      mentorProfile
    );
    suggestion.mentorAtoms = mentorSelection.atoms;
    suggestion.mentorIntensity = mentorSelection.intensity;
    suggestion.mentorSelectedReasons = mentorSelection.selectedReasons;
  }
  ```
- This requires mentorProfile to be available (may need to add to options)

### Step 2: Get Mentor Profile in SuggestionService
- Add parameter: options.mentorProfile or compute from actor
- If not provided, can be computed from actor's mentor settings

### Step 3: Update MentorSuggestionVoice (Optional - Phase 2.8)
- Accept mentorAtoms from suggestion
- Pass to mentor dialogue generation
- Can affect the voicing/personality of explanation

### Step 4: Validate Integration
- Ensure reasonSignals → atoms → explanation chain works
- Verify no duplicates or missing atoms
- Check that intensity is appropriately scaled

## Data Structure After Integration

**Before _enrichSuggestions:**
```javascript
suggestion.suggestion = {
  tier: 6,
  reasonCode: 'PRESTIGE_PREREQ',
  confidence: 0.95,
  reasonSignals: { ... },
  reason: {
    atoms: ['DependencyChain', ...],
    ...
  }
}
```

**After _enrichSuggestions:**
```javascript
suggestion = {
  // ... existing fields ...
  suggestion: { ... },  // unchanged

  // NEW FIELDS:
  mentorAtoms: ['CommitmentDeclared', 'GoalAdvancement', ...],
  mentorIntensity: 'very_high',
  mentorSelectedReasons: ['prestige_path_consistency', ...],

  // Existing fields:
  reasons: [],
  explanation: { ... },
  confidence: 0.95,
  ...
}
```

## Key Design Decisions

### 1. Where to Hook MentorReasonSelector
- **Option A:** In _enrichSuggestions (best - happens early, available downstream)
- **Option B:** In MentorSuggestionDialog (late, less available)
- **Option C:** In both (redundant)
- **Decision:** Option A - in _enrichSuggestions

### 2. Mentor Profile Availability
- Option A: Pass mentorProfile via options
- Option B: Load from actor
- Option C: Make it optional (only apply if available)
- **Decision:** Option C initially, then enhance

### 3. Storage vs Computation
- Store mentorAtoms in suggestion object (persisted if needed)
- Allows UI to use pre-computed atoms without re-selection
- Enables caching of mentor decisions

## Testing Strategy

1. **Unit tests for MentorReasonSelector** (separate from this phase)
2. **Integration test: Full chain**
   - Create suggestion with reasonSignals
   - Enrich with MentorReasonSelector
   - Verify mentorAtoms populated
3. **Visual test: In-game mentor dialog**
   - Check that atoms appear in mentor voicing
   - Verify intensity affects tone/personality

## Blockers & Dependencies

- [ ] Verify MENTORS data structure matches what MentorReasonSelector expects
- [ ] Confirm mentor personality profile is loadable
- [ ] Check if MentorJudgmentEngine expects atoms vs other input

## Backwards Compatibility

- New fields are additive (no breaking changes)
- Old code doesn't use mentorAtoms - ignored safely
- reasonSignals are already in engine output, just not previously used
- No modifications to suggestion tier/confidence logic

## Files to Modify

1. `scripts/engine/suggestion/SuggestionService.js` - Import + hook
2. `scripts/engine/mentor/mentor-reason-selector.js` - Verify complete
3. `scripts/apps/mentor/mentor-suggestion-dialog.js` - FUTURE (Phase 2.8)

## Files to Test

1. Check SuggestionEngine output has reasonSignals ✓ (from Phase 2.6)
2. Check MentorReasonSelector works correctly ✓ (from Phase 2.6)
3. Check enrichment adds mentorAtoms ✓ (Phase 2.7 step 1)
4. Check mentor voice uses atoms (Phase 2.8)

## Success Criteria

- [ ] mentorAtoms populated in enriched suggestions
- [ ] No errors from MentorReasonSelector.select()
- [ ] Atoms are valid (exist in REASON_ATOMS)
- [ ] Intensity computed correctly
- [ ] No performance degradation
- [ ] Mentor dialog still works without atoms (backwards compatible)

## Future Enhancements (Phase 2.8+)

1. Pass atoms to mentor voice generation
2. Apply mentor personality weighting
3. Handle conflict atoms (multiple mentors)
4. Intensity-based explanation variants
5. Per-mentor explanation templates

## Timeline

- Phase 2.7: Hook MentorReasonSelector (1-2 hours)
- Phase 2.8: Integrate with voice/personality (2-3 hours)
- Phase 2.9: Advanced features/variants (3+ hours)
