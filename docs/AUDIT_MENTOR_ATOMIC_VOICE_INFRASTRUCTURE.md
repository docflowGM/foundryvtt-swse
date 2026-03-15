# ATOMIC VOICE REGISTRY AUDIT
## Compatibility Assessment: Existing Infrastructure vs. SuggestionV2 Contract

**Date**: 2026-03-13
**Scope**: Analysis of existing mentor atom systems against newly locked SuggestionV2 contract and MentorAtom taxonomy
**Status**: ⚠️ CRITICAL INTEGRATION POINT IDENTIFIED

---

## EXECUTIVE SUMMARY

**Good News**: An atomic voice infrastructure already exists and is mostly functional.

**The Problem**: It operates in an older paradigm and is not yet connected to the new SuggestionV2 contract.

**What Must Change**: Minimal. MentorReasonSelector must be updated to consume ReasonSignal[] and map them through the new taxonomy.

**Risk Level**: LOW (existing atoms work; bridge layer is straightforward)

---

## PHASE 1: LOCATED VOICE INFRASTRUCTURE

### Files & Components

| File | Purpose | Status |
|------|---------|--------|
| `mentor-reason-atoms.js` | 27 semantic atoms (REASON_ATOMS) | ✅ Exists, Functional |
| `mentor-judgment-atoms.js` | 19 judgment reaction types (JUDGMENT_ATOMS) | ✅ Exists, Functional |
| `mentor-intensity-atoms.js` | 5 confidence levels (INTENSITY_ATOMS) | ✅ Exists, Functional |
| `mentor-atom-phrases.js` | Mentor-specific phrase mappings | ✅ Exists, Complete |
| `mentor-judgment-engine.js` | Converts atoms → mentor voice | ✅ Exists, Working |
| `mentor-reason-selector.js` | Converts signals → atoms + intensity | ⚠️ Exists, **Outdated** |
| `mentor-suggestion-voice.js` | Entry point for voice generation | ⚠️ Exists, **Static fallback** |

### Architecture Currently Implemented

```
ReasonSignals (old format)
  ↓
MentorReasonSelector.select()
  ↓ (produces atoms + intensity)
MentorJudgmentEngine.buildExplanation()
  ↓ (atoms + intensity → phrases)
MENTOR_ATOM_PHRASES lookup
  ↓
Mentor voice string
```

**Status**: This pipeline EXISTS and WORKS.

---

## PHASE 2: CURRENT INPUT CONTRACT

### MentorReasonSelector Expected Input

**Current interface**:
```javascript
MentorReasonSelector.select(reasonSignals, mentorProfile?)
```

**Current reasonSignals shape**:
```javascript
{
  alignment?: 'prestige' | 'archetype' | 'mentor',
  prestigeSupport?: boolean,
  mechanicalSynergy?: boolean,
  chainContinuation?: boolean,
  deviation?: boolean,
  matchedAttributes?: string[],
  matchedSkills?: string[],
  conviction?: number (0-1)
}
```

**Problem**: This is NOT the SuggestionV2.signals[] array.

### What It Currently Does

```javascript
static select(reasonSignals, mentorProfile = {}) {
  const atoms = [];

  // Boolean checks on reasonSignals fields
  if (reasonSignals.alignment === 'prestige') {
    atoms.push(REASON_ATOMS.CommitmentDeclared);
    atoms.push(REASON_ATOMS.GoalAdvancement);
  }
  // ... more checks

  // Deduplicates atoms
  const uniqueAtoms = [...new Set(atoms)];

  // Determines intensity from signal count + conviction
  const intensity = this._determineIntensity(reasonSignals, uniqueAtoms);

  return {
    atoms: uniqueAtoms,
    intensity,
    selectedReasons: [...]
  };
}
```

**Current capabilities**:
- ✅ Deduplicates atoms
- ✅ Determines intensity
- ✅ Validates atoms
- ❌ Does NOT sort signals by weight
- ❌ Does NOT handle weighted signals
- ❌ Does NOT compute semantic dominance

---

## PHASE 3: VOCABULARY COMPARISON

### Existing REASON_ATOMS (27 items)

Organized in 6 categories:

```
PATTERN (2):
  - PatternAlignment
  - PatternConflict

COMMITMENT (3):
  - RecentChoiceImpact
  - CommitmentDeclared
  - CommitmentIgnored

SYNERGY (4):
  - SynergyPresent
  - SynergyMissing
  - DependencyChain
  - OpportunityCostIncurred

RISK (4):
  - RiskIncreased
  - RiskMitigated
  - ThresholdApproaching
  - ThresholdCrossed

GROWTH (3):
  - ReadinessMet
  - ReadinessLacking
  - GrowthStageShift

INTENT (6):
  - GoalAdvancement
  - GoalDeviation
  - ExplorationSignal
  - IndecisionSignal
  - NewOptionRevealed
  - RareChoice
```

### Newly Locked MentorAtom (25 items)

Organized in 6 categories:

```
REINFORCEMENT (6):
  - PatternAlignment
  - NaturalExtension
  - StrengthReinforced
  - IdentityConfirmed
  - ReadinessMet
  - SynergyPresent

STRATEGIC (5):
  - ThresholdApproaching
  - LongGameSetup
  - StrategicPositioning
  - FutureProofing

TACTICAL (4):
  - ImmediateUtility
  - CombatOptimization
  - EfficiencyGain
  - GapCoverage

WARNING (3):
  - RedundancyDetected
  - OverextensionRisk
  - MisalignmentDetected

PROGRESSION (5):
  - CommitmentDeclared
  - GoalAdvancement
  - GoalDeviation
  - DependencyChain
  - RecentChoiceImpact

INTENSITY (3):
  - StrongSignal
  - ModerateSignal
  - WeakSignal
```

### Semantic Overlap Analysis

| Old REASON_ATOMS | Maps To New MentorAtom | Mapping Quality |
|-----------------|----------------------|-----------------|
| PatternAlignment | PatternAlignment | ✅ Direct (same name) |
| PatternConflict | MisalignmentDetected | ⚠️ Semantic shift (new taxonomy is broader) |
| CommitmentDeclared | CommitmentDeclared | ✅ Direct |
| CommitmentIgnored | GoalDeviation | ⚠️ Close but not identical |
| GoalAdvancement | GoalAdvancement | ✅ Direct |
| GoalDeviation | GoalDeviation | ✅ Direct |
| RecentChoiceImpact | RecentChoiceImpact | ✅ Direct |
| DependencyChain | DependencyChain | ✅ Direct |
| SynergyPresent | SynergyPresent | ✅ Direct |
| SynergyMissing | GapCoverage (partial) | ⚠️ Partial mapping |
| ReadinessMet | ReadinessMet | ✅ Direct |
| ReadinessLacking | OverextensionRisk (partial) | ⚠️ Partial mapping |
| RiskIncreased | GapCoverage / OverextensionRisk | ⚠️ Ambiguous |
| RiskMitigated | GapCoverage | ⚠️ Reinterpretation |
| ThresholdApproaching | ThresholdApproaching | ✅ Direct |
| ThresholdCrossed | OverextensionRisk | ⚠️ Semantic reinterpret |
| NewOptionRevealed | NaturalExtension | ⚠️ Close but different |
| RareChoice | MisalignmentDetected | ⚠️ Different meaning |
| ExplorationSignal | WeakSignal (meta-atom) | ⚠️ Different layer |
| IndecisionSignal | WeakSignal (meta-atom) | ⚠️ Different layer |
| GrowthStageShift | NaturalExtension | ⚠️ Close but different |

**Verdict**:
- ✅ 8 atoms map directly (PatternAlignment, CommitmentDeclared, GoalAdvancement, GoalDeviation, RecentChoiceImpact, DependencyChain, SynergyPresent, ReadinessMet, ThresholdApproaching)
- ⚠️ 19 atoms have semantic drift or partial mapping
- ❌ New taxonomy introduces NEW atoms not in old system (StrengthReinforced, IdentityConfirmed, NaturalExtension, LongGameSetup, StrategicPositioning, FutureProofing, ImmediateUtility, CombatOptimization, EfficiencyGain, GapCoverage, RedundancyDetected, OverextensionRisk, etc.)

---

## PHASE 4: INTEGRATION GAPS IDENTIFIED

### Gap 1: Signal Input Format Mismatch

**Old MentorReasonSelector expects**:
```javascript
{
  alignment: 'prestige' | 'archetype',
  prestigeSupport: boolean,
  mechanicalSynergy: boolean,
  // etc
}
```

**SuggestionV2 provides**:
```javascript
{
  signals: [
    { type: ReasonType, weight: number, horizon: string, metadata: {...} },
    { type: ReasonType, weight: number, horizon: string, metadata: {...} },
    ...
  ]
}
```

**Impact**: MentorReasonSelector cannot directly consume SuggestionV2.signals

---

### Gap 2: Weight-Based Sorting Missing

**Old system**:
- Counts signal presence (boolean flags)
- No weight-based prioritization

**New system requires**:
- Sort signals by weight descending
- Select top N (recommend 3–4)
- Compute intensity from top weight, not signal count

---

### Gap 3: Semantic Dominance Not Computed

**Old system**:
- Intensity derived from signal count
- No semantic category analysis

**New system requires**:
- Classify atoms by category (reinforcement/strategic/tactical/warning/progression)
- Compute which category dominates
- Route tone based on dominance (not just intensity)

---

### Gap 4: ReasonType → MentorAtom Mapping Missing

**Status**: The ReasonTypeToAtomMapping.ts you just created maps ReasonType → new MentorAtom.

**Problem**: MentorReasonSelector doesn't use it yet.

**Solution**: Wire the mapping into MentorReasonSelector.

---

### Gap 5: Dominance Awareness Not Integrated

**Current MentorSuggestionVoice**:
```javascript
static generateVoicedSuggestion(mentorName, suggestion, context) {
  // Falls back to random SUGGESTION_VOICES static quotes
  // Doesn't call MentorReasonSelector at all if atoms unavailable
}
```

**New requirement**:
- Pass SuggestionV2 to dialog
- Call MentorReasonSelector on signals
- Route tone based on dominantHorizon (immediate/shortTerm/identity)
- Modulate voice for archetype + semantic dominance

---

## PHASE 5: ARCHITECTURAL DECISIONS REQUIRED

### Decision 1: Keep REASON_ATOMS or Migrate to MentorAtom?

**Option A (Recommended): Align MentorAtom WITH REASON_ATOMS**
- Keep existing REASON_ATOMS (already integrated deeply)
- Update MentorAtom enum to be an alias/superset of REASON_ATOMS
- Preserves working mentor-atom-phrases infrastructure
- Lower migration risk

**Option B (Clean slate): Replace entirely**
- Remove REASON_ATOMS
- Use only new MentorAtom enum
- Requires rewriting mentor-atom-phrases.js (extensive)
- Requires rewriting all atom references
- Higher risk, lower backwards compatibility

**Recommendation**: **Option A is correct**. The existing atoms work. The new taxonomy should BUILD ON them, not replace.

---

### Decision 2: Should ReasonTypeToAtomMapping live?

**Current**: You created ReasonTypeToAtomMapping.ts mapping ReasonType → MentorAtom

**Issue**: If we keep REASON_ATOMS, we need:
- ReasonType → REASON_ATOMS mapping

**Solution**: Modify ReasonTypeToAtomMapping to map to REASON_ATOMS, not new MentorAtom. Or create a separate bridge.

---

## PHASE 6: REQUIRED CHANGES (Minimal Diff)

### Change 1: Update MentorReasonSelector Input

**File**: `mentor-reason-selector.js`

**From**:
```javascript
static select(reasonSignals, mentorProfile = {})
  // Expects: { alignment, prestigeSupport, mechanicalSynergy, ... }
```

**To**:
```javascript
static select(signals, scoringBreakdown, mentorProfile = {})
  // Expects: signals is ReasonSignal[] from SuggestionV2
  // Expects: scoringBreakdown has finalScore + confidence
```

**Implementation**:
1. Sort signals by weight descending
2. Select top 3–4
3. Map each ReasonType → REASON_ATOMS
4. Deduplicate atoms
5. Compute intensity from top weight + scoring.confidence
6. Return { atoms, intensity, dominantCategory: ... }

---

### Change 2: Add Semantic Dominance Computation

**Add to MentorReasonSelector**:
```javascript
static _computeDominantCategory(atoms) {
  // Count atoms by REASON_CATEGORIES
  // Return the category with most atoms
  // Example: if [PatternAlignment, CommitmentDeclared] → 'commitment' dominates
}
```

---

### Change 3: Wire MentorSuggestionDialog to Flow

**File**: `mentor-suggestion-dialog.js`

**Add**:
```javascript
static async show(mentorName, suggestion: SuggestionV2, actor) {
  // NEW: Call MentorReasonSelector on suggestion.signals
  const { atoms, intensity, dominantCategory } =
    MentorReasonSelector.select(
      suggestion.signals,
      suggestion.scoring
    );

  // NEW: Call MentorJudgmentEngine with atoms
  const voicedText = MentorJudgmentEngine.buildExplanation(
    atoms,
    mentorName,
    context,
    intensity
  );

  // Render with voicedText
}
```

---

### Change 4: Optional - Add Dominance-Aware Tone Modulation

**New component**: `VoiceRegistry.resolve()`

**Uses**:
- suggestion.scoring.dominantHorizon
- dominantCategory from MentorReasonSelector
- intensity
- actor.identity.primaryArchetype

**Output**: Modulated mentor voice string (not just random quote)

---

## PHASE 7: CONFIRMATION: CAN OPTION A PLUG IN IMMEDIATELY?

### Step 1: Create ReasonType → REASON_ATOMS Mapping

Instead of the TypeScript mapping you created (ReasonType → MentorAtom), create:

```javascript
// ReasonTypeToReasonAtomMapping.js
export const REASON_TYPE_MAPPING = {
  [ReasonType.ATTRIBUTE_SYNERGY]: [REASON_ATOMS.ReadinessMet, REASON_ATOMS.SynergyPresent],
  [ReasonType.PRESTIGE_PROXIMITY]: [REASON_ATOMS.ThresholdApproaching, REASON_ATOMS.GoalAdvancement],
  // ... etc
}
```

This maps your new ReasonType enum to existing REASON_ATOMS.

### Step 2: Update MentorReasonSelector to consume ReasonSignal[]

```javascript
static select(signals) {
  // Sort by weight
  const sorted = [...signals].sort((a, b) => b.weight - a.weight);

  // Map each to atoms
  const atoms = [];
  for (const signal of sorted.slice(0, 3)) {
    const mapped = REASON_TYPE_MAPPING[signal.type];
    if (mapped) atoms.push(...mapped);
  }

  // Deduplicate
  const unique = [...new Set(atoms)];

  // Compute intensity
  const topWeight = sorted[0]?.weight || 0;
  const intensity = topWeight > 0.65 ? 'high' : topWeight > 0.35 ? 'medium' : 'low';

  return { atoms: unique, intensity };
}
```

### Step 3: Wire in MentorSuggestionDialog

Call MentorReasonSelector.select(suggestion.signals) before rendering.

---

## PHASE 8: VERDICT

### ✅ Option A Can Plug In Immediately

**Yes, with these caveats**:

1. **Create ReasonType → REASON_ATOMS mapping** (replace the MentorAtom mapping)
2. **Update MentorReasonSelector to accept ReasonSignal[]** (small refactor, ~20 lines)
3. **Wire MentorSuggestionDialog to call it** (straightforward integration)
4. **MentorJudgmentEngine already works** (no changes needed)
5. **MENTOR_ATOM_PHRASES already works** (no changes needed)

**Path forward**:
- Option A (use existing atoms) ✅ RECOMMENDED
- Then optionally add VoiceRegistry.resolve() for tone modulation (non-blocking enhancement)
- Migrate to full MentorAtom enum later if needed (backwards compatible)

---

## PHASE 9: RISK ANALYSIS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Semantic mismatch between ReasonType and REASON_ATOMS | LOW | Create explicit mapping table; review each entry |
| Weight computation changes behavior | MEDIUM | Test intensity derivation with real suggestions; validate < 100ms |
| Existing voice rendering breaks | LOW | MentorJudgmentEngine and phrases untouched; only input changes |
| Dominance awareness not working | LOW | Can defer VoiceRegistry; system works without it |

---

## SUMMARY: INTEGRATION DECISION MATRIX

| Component | Status | Action | Blocker? |
|-----------|--------|--------|----------|
| REASON_ATOMS | ✅ Exists | Keep as-is | NO |
| JUDGMENT_ATOMS | ✅ Exists | Keep as-is | NO |
| INTENSITY_ATOMS | ✅ Exists | Keep as-is | NO |
| MentorJudgmentEngine | ✅ Exists | Keep as-is | NO |
| MENTOR_ATOM_PHRASES | ✅ Exists | Keep as-is | NO |
| MentorReasonSelector | ⚠️ Exists (outdated) | **Update to consume ReasonSignal[]** | YES |
| ReasonType→REASON_ATOMS mapping | ❌ Missing | **Create mapping table** | YES |
| MentorSuggestionDialog wiring | ❌ Missing | **Wire SuggestionV2 flow** | YES |
| VoiceRegistry.resolve() | ❌ Missing | **Optional (non-blocking)** | NO |

---

## DELIVERABLE: READY TO BUILD OPTION A?

**YES, with two prerequisites**:

1. ✅ **ReasonType → REASON_ATOMS mapping table** (simple static map)
2. ✅ **MentorReasonSelector refactor** (update input shape, add weight sorting)

After those two, the bridge is complete.

**MentorReasonSelector becomes a clean translator**:
```
SuggestionV2.signals[]
  → ReasonType → REASON_ATOMS
  → Deduplicate + Sort by Weight
  → Compute Intensity
  → Return atoms + intensity
  → MentorJudgmentEngine (unchanged)
  → Mentor voice (existing infrastructure)
```

**Can Option A plug in immediately after**? YES.

