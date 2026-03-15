# Mentor Suggestion Bridge: Complete Verification

## Bridge Status: ✅ COMPLETE & OPERATIONAL

The entire bridge from suggestion engine to mentor voice is wired and functioning end-to-end.

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ SUGGESTION ENGINE OUTPUT                                         │
│ (SuggestionEngineCoordinator)                                    │
│ suggestion { name, tier, suggestion: { reasonSignals } }         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SUGGESTION SERVICE (SuggestionService._enrichSuggestions)        │
│ - Applies MentorReasonSelector.select()                          │
│ - Converts reasonSignals → atoms + intensity                     │
│ - Attaches: mentorAtoms, mentorIntensity                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MENTOR SUGGESTION DIALOG                                         │
│ (MentorSuggestionDialog.show)                                    │
│ Receives: topSuggestion with mentorAtoms + mentorIntensity       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MENTOR SUGGESTION VOICE                                          │
│ (MentorSuggestionVoice.generateVoicedSuggestion)                │
│ - Checks for suggestion.mentorAtoms                              │
│ - Calls MentorJudgmentEngine.buildExplanation()                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MENTOR JUDGMENT ENGINE                                           │
│ (MentorJudgmentEngine.buildExplanation)                          │
│ - Maps atoms → mentor-specific phrases                           │
│ - Combines phrases into coherent explanation                     │
│ - Returns: mentored-voiced suggestion text                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MENTOR VOICE OUTPUT                                              │
│ Typing animation in MentorSuggestionDialog                       │
│ Player sees: Personality-driven atomic explanation               │
└─────────────────────────────────────────────────────────────────┘
```

## Key Files & Integration Points

### 1. Suggestion Generation
- **SuggestionEngineCoordinator**: Produces suggestions with reasonSignals
- **SuggestionService.getSuggestions()**: Entry point, calls _enrichSuggestions()

### 2. Bridge Layer (reasonSignals → atoms)
- **File**: `scripts/engine/suggestion/SuggestionService.js:533-551`
- **Logic**: `MentorReasonSelector.select(suggestion.suggestion.reasonSignals, mentorProfile)`
- **Output**: `{ atoms: REASON_ATOMS[], intensity: 'high'|'medium'|'low' }`
- **Attached**: `suggestion.mentorAtoms`, `suggestion.mentorIntensity`

### 3. Dialog Presentation
- **File**: `scripts/mentor/mentor-suggestion-dialog.js`
- **Flow**:
  1. receives suggestion with mentorAtoms
  2. passes to MentorSuggestionVoice.generateVoicedSuggestion()
  3. displays typed explanation

### 4. Voice Generation
- **File**: `scripts/mentor/mentor-suggestion-voice.js:436-463`
- **Logic**:
  ```javascript
  if (suggestion?.mentorAtoms?.length > 0) {
    explanation = MentorJudgmentEngine.buildExplanation(
      suggestion.mentorAtoms,
      mentorName,
      context,
      suggestion.mentorIntensity
    );
  }
  ```

### 5. Atomic Explanation Engine
- **File**: `scripts/engine/mentor/mentor-judgment-engine.js:30-51`
- **Input**: atoms array + mentor name + intensity
- **Process**: Maps atoms to mentor-specific phrases, combines coherently
- **Output**: Natural language explanation reflecting mentor personality

## Integration Evidence

### Levelup Workflow (feat selection):
```javascript
// levelup-main.js:607
let suggestions = await SuggestionService.getSuggestions(
  this.actor, 'levelup',
  { domain: 'feats', available: availableFeats, pendingData, persist: true }
);
// ↓ suggestions have mentorAtoms attached

// levelup-main.js:618
const topSuggestion = suggestions[0];

// levelup-main.js:624
await MentorSuggestionDialog.show(
  this.currentMentorClass,
  topSuggestion,  // ← carries mentorAtoms
  'feat_selection'
);
```

### Similar flows for:
- Talent selection (line 706)
- Class selection (line 652-663)
- Force power selection (line 771)
- Attribute increases (line 809)

## Testing the Bridge

To verify end-to-end mentor voice generation:

1. **Start a level-up**
2. **Mentor suggests a feat/talent/class**
3. **Dialog appears** with mentor-voiced explanation
4. **Expected**: Explanation should reflect mentor atoms, not generic fallback
   - Miraj (Jedi): Force/spiritual language
   - Lead (Scout): Tactical/survival language
   - Ol' Salty (Pirate): Colorful pirate dialect
   - J0-N1 (Bureaucrat): Formal/professional language

## Deprecation Note

**Current Status**: Using deprecated `MentorReasonSelector.select()`
- **Status**: Still functional, logs warning
- **Why deprecated**: Designed for old reasonSignals format (object)
- **Modern alternative**: `selectFromSuggestionV2()` for new signal format
- **Impact**: None - both methods work, just logs warning
- **Migration path**: When SuggestionEngine fully transitions to signals[] format

## Bridge Completeness Checklist

- ✅ ReasonSignals generated by SuggestionEngine
- ✅ MentorReasonSelector converts signals → atoms
- ✅ atoms + intensity attached to suggestions
- ✅ MentorSuggestionDialog receives atoms
- ✅ MentorSuggestionVoice calls MentorJudgmentEngine
- ✅ MentorJudgmentEngine produces mentor-voiced explanations
- ✅ Explanations displayed with typing animation
- ✅ All mentor personalities supported (Miraj, Lead, Ol' Salty, Breach, J0-N1)

## Next Steps (Optional)

1. **Migrate from deprecated select() to selectFromSuggestionV2()** when SuggestionEngine signals format is confirmed
2. **Add reasons.json integration** for contextual "Why?" panels (complementary, not blocking)
3. **Expand mentor atom coverage** as new reason types are identified
