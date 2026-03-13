# Architectural Invariant: Tier vs Scoring Separation

## The Contract

This document locks an explicit separation of concerns that must never blur.

---

## Two Independent Systems

### **Tier (Rule-Driven)**

**Purpose:** Categorical semantic ranking for UI presentation and gating

**Source of Truth:** SuggestionEngine rule evaluation (first match wins)

**Semantics:**
- Tier 6: PRESTIGE_PREREQ — unlocks prestige class pathway
- Tier 5: META_SYNERGY — proven synergy with existing build
- Tier 4: CHAIN_CONTINUATION — extends established feat/talent chain
- Tier 3: ARCHETYPE_RECOMMENDATION — aligns with character archetype
- Tier 2: ABILITY_PREREQ_MATCH — uses actor's highest ability
- Tier 1: CLASS_SYNERGY — thematic fit with class
- Tier 0: FALLBACK — legal option with no synergy

**Invariants:**
- Tier is always categorical (0-6, integer)
- Tier is deterministic and stable
- Tier never changes based on score synthesis
- Tier encodes semantic meaning (what KIND of suggestion)
- Tier is visible to player (UI tier label)
- Tier is used for ranking candidates
- Tier is used for access gating ("only show tier 4+")

---

### **Scoring (Synthesis-Driven)**

**Purpose:** Weighted analysis for mentor explanation, confidence, and dominance awareness

**Source of Truth:** SuggestionScorer three-horizon computation

**Composition:**
```javascript
scoring: {
  immediate: 0.0-1.0,    // Current state synergy (60% weight)
  shortTerm: 0.0-1.0,    // Proximity + breakpoints (25% weight)
  identity: 0.0-1.0,     // Archetype alignment (15% weight)
  final: 0.0-1.0,        // Weighted synthesis (0.6*immediate + 0.25*shortTerm + 0.15*identity)
  confidence: 0.0-1.0,   // Certainty in recommendation
  dominantHorizon: "immediate" | "shortTerm" | "identity"
}
```

**Invariants:**
- Scoring is continuous (0.0 to 1.0, float)
- Scoring can diverge from tier (tier 6 feat can have score 0.35)
- Scoring is computed from synthesis, not rules
- Scoring encodes magnitude (how strong is this suggestion)
- Scoring is opaque to player (never displayed as number)
- Scoring feeds mentor voice explanation
- Scoring feeds mentor tone modulation
- Scoring determines mentor confidence
- Scoring determines dominantHorizon for tone selection

---

## Why This Separation Matters

### **Blurring Would Break:**

If we tried to derive tier from finalScore:

```javascript
// ❌ WRONG: Blurred separation
if (scorerResult.finalScore >= 0.85) tier = 6;
else if (scorerResult.finalScore >= 0.70) tier = 5;
else if (scorerResult.finalScore >= 0.55) tier = 4;
```

This creates:
- Tier becomes meaningless (no longer semantic)
- Tier becomes unstable (changes with minor score shifts)
- Two feats with identical score get different tiers based on rule evaluation
- Score 0.35 + tier 6 (prestige prereq) becomes tier 3 by score logic
- Player sees inconsistent tier labeling

### **Why Both Systems Exist:**

- **Tier:** Answers "What category of suggestion is this?" (semantic, stable, categorical)
- **Scoring:** Answers "How confident am I in this?" (continuous, synthetic, magnitude)

They answer different questions and serve different purposes.

---

## The Invariant

**LOCKED:**

```
∀ suggestion in suggestions:
  suggestion.tier ∈ {0, 1, 2, 3, 4, 5, 6}   // Derived from rule evaluation
  suggestion.scoring.final ∈ [0.0, 1.0]     // Derived from SuggestionScorer

  These are INDEPENDENT.

  Tier ← SuggestionEngine rules (deterministic order)
  Scoring ← SuggestionScorer synthesis (weighted horizons)

  Tier is never recomputed from Scoring.
  Scoring is never filtered by Tier.

  They flow in parallel, never merge.
```

---

## Enforcement

### **When Someone Asks "Why Is This Tier 6 But Score 0.35?"**

**Answer:**

Tier encodes what KIND of suggestion this is (prestige prerequisite).
Score encodes how CONFIDENT we are in the recommendation (low, but still worth mentioning).

Both are correct. They answer different questions.

Tier: semantic category
Score: magnitude of recommendation

---

### **When Someone Asks "Can We Derive Tier from Score?"**

**Answer:**

No. See ARCHITECTURAL_INVARIANT_TIER_VS_SCORING.md.

Tier is semantic. Score is synthetic. Merging them destroys both.

---

### **When Someone Asks "Should We Reorder by Score Instead of Tier?"**

**Answer:**

No. Tier is the canonical ordering axis because it encodes semantic meaning.

Score feeds mentor voice. But tier determines ranking.

---

## Future: Possible Extensions (Not Violations)

These DO NOT violate the invariant:

- ✅ Filter candidates by tier threshold in UI
- ✅ Use score to determine mentor certainty
- ✅ Use dominantHorizon to select mentor tone (immediate/strategic/affirmational)
- ✅ Use confidence to scale phrasing intensity
- ✅ Log both tier and score for debugging
- ✅ Create UI visualization showing both axes

These DO violate the invariant:

- ❌ Recompute tier from score
- ❌ Use score to override tier
- ❌ Filter candidates by score instead of tier
- ❌ Merge tier and score into single ranking
- ❌ Make scoring rule-driven

---

## Summary

**Tier and Scoring are separate axes.**

**Tier is locked to rule-driven evaluation.**

**Scoring is locked to synthesis-driven computation.**

**They flow in parallel.**

**Never merge them.**

This is the architectural contract.
