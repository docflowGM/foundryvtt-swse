# Mentor Integration Schema v2

## Canonical SuggestionEngine Output Structure

```javascript
{
  tier: Number,                    // 0-6
  confidence: Number,              // 0.0-1.0
  reasonCode: String,              // PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc.
  sourceId: String | null,         // prestige:Jedi, chain:Force Training, etc.

  // NEW: Clean semantic signals (facts only, no text/presentation)
  reasonSignals: {
    alignment: null | "archetype" | "mentor" | "prestige" | "none",
    prestigeSupport: Boolean,      // Supports prestige path goal
    mechanicalSynergy: Boolean,    // Has synergy with existing choices
    chainContinuation: Boolean,    // Builds on recent choice
    deviation: Boolean,            // Contradicts detected path
    mentorBiasType: null | String, // melee, ranged, force, stealth, etc.
    conviction: Number,            // 0.0-1.0 (mentor bias strength)
    matchedAttributes: String[],   // ["str", "wis"]
    matchedSkills: String[],       // ["useTheForce", "stealth"]
    matchedTags: String[]          // arbitrary extensible tags
  },

  // KEEP: Reason object (with atoms, no explanation text)
  reason: {
    tierAssignedBy: String,        // Same as reasonCode
    matchingRules: String[],       // Rule IDs that matched
    atoms: String[]                // Mentor reason atoms
    // NO explanation field here - move to judgment layer
  }
}
```

## Design Principles

1. **SuggestionEngine emits facts**, not explanation text
2. **reasonSignals are semantic**, not presentation
3. **No text generation in engine** - that's mentor layer responsibility
4. **Signals are deterministic** - same input always produces same signals
5. **Extensible** - new signals can be added without breaking existing code

## Signal Semantics

| Signal | Meaning | Example |
|--------|---------|---------|
| `alignment` | What structural domain aligned | archetype = matched archetype identity |
| `prestigeSupport` | Moving toward prestige goal | true if feat is prestige prereq |
| `mechanicalSynergy` | Tactical synergy detected | true if builds on existing abilities |
| `chainContinuation` | Direct prerequisite match | true if feat prerequisite is owned |
| `deviation` | Contradicts detected pattern | true if conflicts with prestige path |
| `mentorBiasType` | Category of mentor preference | "melee", "force", "social" |
| `conviction` | Confidence in mentor bias | 0.8 = high confidence |
| `matchedAttributes` | Ability scores aligned | ["str", "dex"] |
| `matchedSkills` | Trained skills aligned | ["stealth", "acrobatics"] |
| `matchedTags` | Item tags matched | ["jedi", "force-user"] |

## Integration Flow

```
SuggestionEngine._evaluateFeat()
  └─ Evaluates tier (PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc.)
     └─ Builds reasonSignals from evaluation context
        └─ Returns suggestion with reasonSignals + atoms

MentorReasonSelector.select(reasonSignals, mentorProfile)
  └─ Converts signals to semantic atoms
     └─ Applies mentor personality weighting
        └─ Returns { atoms: [...], intensity: "high" }

MentorJudgmentEngine.build(atoms, mentorProfile, context)
  └─ Builds final explanation string
     └─ Applies tone/intensity
        └─ Returns explanation text
```

## What Changed From Previous Approach

**Before (WRONG):**
- SuggestionEngine emitted reasonCode
- selectReasonAtoms(reasonCode) → atoms
- Problem: Lost context about WHY the code was assigned

**After (CORRECT):**
- SuggestionEngine emits reasonSignals (rich semantic facts)
- MentorReasonSelector(reasonSignals) → atoms
- Mentor layer can use full signal context for smarter decisions

## Example: PRESTIGE_PREREQ

**SuggestionEngine output:**
```javascript
{
  tier: 6,
  confidence: 0.95,
  reasonCode: 'PRESTIGE_PREREQ',
  sourceId: 'prestige:Jedi',
  reasonSignals: {
    alignment: 'prestige',
    prestigeSupport: true,
    mechanicalSynergy: false,
    chainContinuation: false,
    deviation: false,
    mentorBiasType: null,
    conviction: 0,
    matchedAttributes: [],
    matchedSkills: ['useTheForce'],
    matchedTags: ['jedi', 'prestige']
  },
  reason: {
    tierAssignedBy: 'PRESTIGE_PREREQ',
    matchingRules: ['force_affinity_prestige'],
    atoms: ['DependencyChain', 'CommitmentDeclared', 'GoalAdvancement']
  }
}
```

**MentorReasonSelector output:**
```javascript
{
  atoms: ['DependencyChain', 'CommitmentDeclared', 'GoalAdvancement'],
  intensity: 'very_high',
  selectedReason: 'prestige_prerequisites_met'
}
```

**MentorJudgmentEngine output:**
```javascript
{
  explanation: "You're close to unlocking the Jedi path. This prerequisite is essential.",
  intensity: 'very_high',
  judgment: 'GRAVITY'
}
```

## Next Steps

1. Modify SuggestionEngine to populate reasonSignals
2. Create MentorReasonSelector
3. Remove hardcoded explanation strings from engine
4. Connect to existing mentor judgment system
