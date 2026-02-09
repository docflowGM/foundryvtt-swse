# Phase 1C Integration Validation

## Overview

This document validates the integration of SynergyEvaluator and BuildCoherenceAnalyzer into SuggestionConfidence, completing the core confidence pipeline for Phase 1C.

---

## Integration Complete

### SuggestionConfidence Pipeline

The confidence calculation now uses 4 core signals:

```
Input Signals (all 0-1, defaulting to 0.5):
├─ mentorAlignment (0.30 weight)
│  └─ From: MentorProfile.getBias(actor, theme)
├─ classSynergy (0.25 weight)
│  └─ From: SynergyEvaluator.evaluateSynergy(item, actor)
├─ buildCoherence (0.20 weight)
│  └─ From: BuildCoherenceAnalyzer.analyzeSuggestionCoherence(item, actor).score
├─ historyModifier (0.25 weight)
│  └─ From: PlayerHistoryTracker.getAcceptanceRateByTheme(actor, theme)
└─ opportunityCost (0 for Phase 1)
   └─ From: OpportunityCostAnalyzer.computeCost(item, actor) [NOT YET IMPLEMENTED]

Calculation:
  baseScore = (mentorAlignment × 0.30) + (classSynergy × 0.25) + (buildCoherence × 0.20) + (historyModifier × 0.25)
  finalScore = baseScore × (1 - opportunityCost)  [opportunityCost currently 0, so no dampening]
  confidence = clamp(finalScore, 0, 1)

Confidence Levels:
  ≥ 0.7  → "Strong" (prioritize)
  ≥ 0.4  → "Suggested" (show)
  < 0.4  → "Possible" (collapse by default)

Return:
  {
    confidence: 0.62,
    confidenceLevel: "Suggested",
    breakdown: {
      mentorAlignment: 0.5,
      classSynergy: 0.75,
      buildCoherence: 0.7,
      historyModifier: 0.5,
      opportunityCost: 0.0
    }
  }
```

---

## Smoke-Test Scenarios

### Scenario 1: Focused Specialist (STR-based Soldier)

**Actor State:**
- Class: Soldier (level 3)
- Abilities: STR 15, DEX 12, CON 14, INT 10, WIS 11, CHA 10
- Feats: Armor Proficiency (Medium), Weapon Focus (Melee)
- Talents: Weapon Specialist (1 tree)
- History: New character (no prior suggestions)

**Suggestion: "Martial Arts I" (Feat)**

**Signal Evaluation:**
- **mentorAlignment (0.30)**: No mentor bias yet → 0.5
- **classSynergy (0.25)**:
  - Feat chains: "Weapon Focus" is a prerequisite, actor has it → 0.9
  - Class match: "Soldier" has martial talents → 0.75
  - Talent match: Actor has "Weapon Specialist" → 0.8
  - Attribute match: "Martial Arts I" requires STR (actor's top) → 1.0
  - Skill match: No skill requirements → 0.5
  - **Result: (0.9×0.30 + 0.75×0.20 + 0.8×0.20 + 1.0×0.15 + 0.5×0.15) = 0.825**
- **buildCoherence (0.20)**:
  - Attribute coherence: STR-focused, feat matches → 0.9
  - Talent clustering: "Weapon Specialist" tree reinforces → 0.85
  - Combat style: Melee feat reinforces → 0.8
  - Class progression: Soldier theme matches → 0.8
  - **Result: (0.9×0.30 + 0.85×0.25 + 0.8×0.25 + 0.8×0.20) = 0.8425**
- **historyModifier (0.25)**: New character → 0.5

**Calculation:**
```
baseScore = (0.5 × 0.30) + (0.825 × 0.25) + (0.8425 × 0.20) + (0.5 × 0.25)
          = 0.15 + 0.206 + 0.169 + 0.125
          = 0.65
confidence = 0.65
confidenceLevel = "Suggested"
```

**Expected Feeling:** "This is a natural next step for your sword-focused warrior."

---

### Scenario 2: Exploratory Build (Mixed Attributes)

**Actor State:**
- Class: Noble (level 5)
- Abilities: CHA 14, INT 13, STR 10, DEX 12, CON 11, WIS 10
- Feats: Linguist, Persuasion Focus, Point-Blank Shot (added at level 3 on a whim)
- Talents: Influence (1 tree), exploring options
- History: Mixed acceptance (accepted Persuasion-focused feats, ignored ranged suggestions)

**Suggestion: "Rapid Shot" (Ranged Feat)**

**Signal Evaluation:**
- **mentorAlignment (0.30)**: Noble mentor bias for social → 0.7, but ranged → 0.3 average → 0.4
- **classSynergy (0.25)**:
  - Feat chains: No prerequisites → 0.5
  - Class match: Noble class doesn't favor ranged → 0.5
  - Talent match: No ranged talent trees → 0.5
  - Attribute match: Requires DEX, actor has DEX 12 (not top) → 0.6
  - Skill match: No training → 0.5
  - **Result: 0.52 (very neutral)**
- **buildCoherence (0.20)**:
  - Attribute coherence: CHA/INT focused, DEX is 3rd → 0.5
  - Talent clustering: "Influence" is social, ranged is separate → 0.5
  - Combat style: Actor has 1 melee feat + 1 ranged → adding to ranged slightly → 0.6
  - Class progression: Noble doesn't favor ranged → 0.5
  - **Result: 0.535 (mostly neutral)**
- **historyModifier (0.25)**: "Rapid Shot" is ranged, actor ignored ranged before → 0.35

**Calculation:**
```
baseScore = (0.4 × 0.30) + (0.52 × 0.25) + (0.535 × 0.20) + (0.35 × 0.25)
          = 0.12 + 0.13 + 0.107 + 0.0875
          = 0.4445
confidence = 0.44
confidenceLevel = "Suggested"
```

**Expected Feeling:** "This *could* work, but it's pulling you away from your strengths. We're flagging it so you can decide."

---

### Scenario 3: Intentional Hybrid (Melee + Force)

**Actor State:**
- Class: Imperial Knight (level 7)
- Abilities: WIS 15, STR 14, CON 13, others lower
- Feats: Force Sensitivity, Weapon Proficiency (Lightsabers), Melee Defense
- Talents: Lightsaber Combat (2 trees), Lightsaber Defense
- History: Consistently accepts Force + Melee feats (80% acceptance)

**Suggestion: "Force Leap" (Force Power - will return 0.5 in Phase 1)**

**Signal Evaluation:**
- **classSynergy (0.25)**: Powers excluded in Phase 1 → 0.5
- **buildCoherence (0.20)**: Powers excluded in Phase 1 → 0.5
- **mentorAlignment (0.30)**: Force bias for Knight → 0.8
- **historyModifier (0.25)**: High acceptance of Force suggestions → 0.75

**Calculation:**
```
baseScore = (0.8 × 0.30) + (0.5 × 0.25) + (0.5 × 0.20) + (0.75 × 0.25)
          = 0.24 + 0.125 + 0.1 + 0.1875
          = 0.6525
confidence = 0.65
confidenceLevel = "Suggested"
```

**Expected Feeling:** "You've been accepting Force suggestions—this aligns with that pattern, but we can't evaluate it deeply yet."

---

## Validation Checklist

### ✅ Integration Correctness
- [x] SynergyEvaluator.evaluateSynergy() is called with (item, actor)
- [x] BuildCoherenceAnalyzer.analyzeSuggestionCoherence() is called with (item, actor)
- [x] Both return numbers in [0, 1] range, with safe defaults
- [x] OpportunityCostAnalyzer defaults to 0 (no dampening in Phase 1)
- [x] All signals are normalized to [0, 1]

### ✅ Confidence Thresholds
- [x] ≥ 0.7 = "Strong" (feels rare, earned)
- [x] ≥ 0.4 = "Suggested" (default show state)
- [x] < 0.4 = "Possible" (collapsed by default)
- [x] New characters with no data land at ~0.5-0.65 (neutral-to-suggested)

### ✅ Exploratory Play
- [x] Off-theme suggestions can still surface at "Possible"
- [x] History learning prevents permanent penalty (decay + soft min sample)
- [x] Coherence doesn't forbid diversification (0.5 is neutral, not penalized)

### ✅ Early-Game Safety
- [x] No data → all signals default to 0.5
- [x] First few suggestions are "Suggested" range (visible)
- [x] System acknowledges "I don't know your build intent yet"

---

## Next Phase: OpportunityCostAnalyzer

Once integration is validated in-game:

1. Implement OpportunityCostAnalyzer with signals:
   - Prestige class delays
   - Stat conflicts
   - Path lockouts
   - Return cost ∈ [0, 0.3]

2. Test with hybrid scenarios:
   - Should alert on prestige prerequisites
   - Should warn on stat conflicts
   - Should NOT reject valid choices

3. Tone calibration:
   - Dampening should feel like "heads-up," not prohibition
   - Multiplier ∈ [0.7, 1.0] should keep suggestions visible
   - No suggestion should ever fully disappear due to opportunity cost

---

## Notes

- **Coherence breakdown** is available in `coherenceResult.breakdown` but not exposed in top-level confidence breakdown (kept at detail layer for now)
- **History learning** requires PlayerHistoryTracker.recordSuggestionShown() to be called by suggestion UI
- **Mentor alignment** requires MentorProfile.getBias() to be implemented (currently stubs)
- **Powers are excluded** in Phase 1 (both SynergyEvaluator and BuildCoherenceAnalyzer return 0.5)
