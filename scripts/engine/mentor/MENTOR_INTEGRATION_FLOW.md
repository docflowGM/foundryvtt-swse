# Mentor Integration Flow - Complete Architecture

## Data Flow Diagram

```
SuggestionEngine._evaluateFeat()
  │
  ├─ Determines tier (PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc.)
  ├─ Builds reasonSignals using ReasonSignalBuilder
  │
  └─→ _buildSuggestion(tier, reasonCode, sourceId, { signalContext })
      │
      ├─ Creates reasonSignals from context
      ├─ Selects atoms via selectReasonAtoms(reasonCode)
      │
      └─→ Returns SUGGESTION with:
          {
            tier,
            reasonCode,
            sourceId,
            confidence,
            reasonSignals,        // ← NEW: Semantic facts
            reason: {
              tierAssignedBy,
              matchingRules,
              atoms                // ← Mentor atoms
            }
          }

         ↓

MentorReasonSelector.select(reasonSignals, mentorProfile)
  │
  ├─ Analyzes semantic signals (alignment, prestigeSupport, etc.)
  ├─ Maps signals to appropriate atoms
  ├─ Determines intensity from conviction
  │
  └─→ Returns:
      {
        atoms: ['CommitmentDeclared', 'GoalAdvancement'],
        intensity: 'high',
        selectedReasons: ['prestige_path_consistency']
      }

         ↓

MentorJudgmentEngine.build(atoms, mentorProfile, context)
  │
  ├─ Receives atoms from selector
  ├─ Builds explanation string (future)
  ├─ Applies mentor personality (future)
  │
  └─→ Returns final explanation
```

## Layer Responsibilities

### 1. SuggestionEngine (Tier Assignment & Semantics)
- ✓ Assigns tier based on game rules
- ✓ Emits reasonSignals (facts, no text)
- ✓ Selects reason atoms
- ✗ Does NOT generate explanation text
- ✗ Does NOT apply mentor personality

### 2. MentorReasonSelector (Signal → Atoms)
- ✓ Converts semantic signals to atoms
- ✓ Applies conviction scaling
- ✓ Determines intensity
- ✗ Does NOT build explanation text
- ✗ Does NOT apply mentor tone

### 3. MentorJudgmentEngine (Judgment & Tone)
- ✓ Takes atoms and builds explanation
- ✓ Applies mentor personality
- ✓ Resolves atom conflicts
- ✓ Applies intensity scaling

### 4. UI Layer (Display)
- ✓ Renders final explanation
- ✓ Applies CSS styling
- ✓ Handles user interactions

## Complete Example: PRESTIGE_PREREQ

### Step 1: SuggestionEngine Evaluation

```javascript
// In _evaluateFeat, tier 6 is assigned for prestige prerequisite
const suggestion = this._buildSuggestionWithArchetype(
  SUGGESTION_TIERS.PRESTIGE_PREREQ,  // tier = 6
  'PRESTIGE_PREREQ',
  `prestige:${prestigeClass}`,
  feat,
  archetype,
  {
    signalContext: {
      matchedSkills: ['useTheForce']
    }
  }
);
```

### Step 2: _buildSuggestion Creates Output

```javascript
// Inside _buildSuggestion
const reasonSignals = ReasonSignalBuilder.build('PRESTIGE_PREREQ', {
  matchedSkills: ['useTheForce']
});

// Result:
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
    matchedTags: ['prestige', 'prerequisite']
  },

  reason: {
    tierAssignedBy: 'PRESTIGE_PREREQ',
    matchingRules: ['force_affinity_prestige'],
    atoms: ['DependencyChain', 'CommitmentDeclared', 'GoalAdvancement']
  }
}
```

### Step 3: MentorReasonSelector Processes Signals

```javascript
const selection = MentorReasonSelector.select(reasonSignals);

// Result:
{
  atoms: [
    'CommitmentDeclared',    // from alignment === 'prestige'
    'GoalAdvancement',       // from alignment === 'prestige'
    'DependencyChain',       // from prestigeSupport === true
    'SynergyPresent'         // from matchedSkills present
  ],
  intensity: 'very_high',
  selectedReasons: [
    'prestige_path_consistency',
    'prestige_prerequisites_met',
    'skill_prerequisite_met'
  ]
}
```

### Step 4: MentorJudgmentEngine Builds Explanation

```javascript
const judgment = MentorJudgmentEngine.build(
  selection.atoms,
  mentorProfile,
  {
    suggestionName: 'Force Training',
    intensity: selection.intensity,
    prestigeClass: 'Jedi'
  }
);

// Result:
{
  explanation: "Force Training is crucial for your Jedi path. You're prepared for this step.",
  intensity: 'very_high',
  judgment: 'GRAVITY'
}
```

## Key Design Principles

1. **No Text in Engine** - SuggestionEngine emits facts, not presentation
2. **Deterministic** - Same reasonSignals always produce same atoms
3. **Layered Responsibility** - Each layer has one job
4. **Extensible** - New signals don't break existing code
5. **Clean Separation** - Mentor personality is optional/configurable

## Signal Examples

### Prestige Signal
```javascript
{
  alignment: 'prestige',
  prestigeSupport: true,
  conviction: 0.8,
  matchedSkills: ['useTheForce']
}
// → atoms: [CommitmentDeclared, GoalAdvancement, DependencyChain]
// → intensity: 'very_high'
```

### Mentor Bias Signal
```javascript
{
  alignment: 'mentor',
  mentorBiasType: 'melee',
  conviction: 0.6,
  matchedAttributes: ['str', 'dex']
}
// → atoms: [PatternAlignment, SynergyPresent, ReadinessMet]
// → intensity: 'medium'
```

### Chain Continuation Signal
```javascript
{
  mechanicalSynergy: true,
  chainContinuation: true,
  conviction: 0,
  matchedSkills: []
}
// → atoms: [SynergyPresent, RecentChoiceImpact]
// → intensity: 'medium'
```

## Integration Checklist

- [x] ReasonSignalBuilder - Converts reasonCode → reasonSignals
- [x] MentorReasonSelector - Converts reasonSignals → atoms + intensity
- [x] SuggestionEngine - Emits reasonSignals in output
- [ ] MentorJudgmentEngine - Build explanation from atoms (existing code to hook)
- [ ] UI Layer - Use reasonSignals + atoms for display
- [ ] Tests - Validate all signal conversions
- [ ] Documentation - This file + inline comments

## Future Enhancements

1. **Mentor Personality** - Apply mentorProfile weighting to atom selection
2. **Conflict Resolution** - Handle contradicting signals (e.g., deviation + prestige)
3. **Intensity Curves** - Non-linear conviction → intensity mapping
4. **Variant Reasons** - Per-mentor explanation templates
5. **Tone Modulation** - Mentor personality affects explanation phrasing
