# SWSE Mentor System Contract

> This document defines the invariant rules for the mentor/suggestion system.
> Any code change that violates these principles is a regression.

---

## Core Principle

**The mentor is advisory only.**

The mentor helps players understand their options. It never makes decisions for them, never enforces rules, and never blocks progression.

---

## What the Mentor MUST Do

### 1. Be Deterministic
- Same inputs = same suggestions, every time
- No randomization in tier assignment or ranking
- Cache keys must incorporate all relevant state (actor + pendingData)

### 2. Be Explainable
Every suggestion output MUST include:
```javascript
{
  name: string,           // Item name
  tier: number,           // 0-6 (higher = stronger recommendation)
  reasonCode: string,     // Machine-readable: PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc.
  confidence: number,     // 0.0-1.0 for tone modulation
  reason: string,         // Human-readable explanation
  isSuggested: boolean    // tier > 0
}
```

### 3. Provide Meaningful Fallbacks
When no strong suggestions exist, return:
```javascript
{
  hasSuggestions: false,
  reasonCode: "NO_STRONG_FIT",
  mentorMessage: "At this point, any path is open to you..."
}
```
Never return empty/null with no explanation.

### 4. Be Consistent Across Sessions
- Store last advice per step with inputs hash
- If inputs unchanged, return same advice
- Player should never see mentor "flip-flopping"

---

## What the Mentor MUST NOT Do

### Never Apply Rules
- Mentor does not validate prerequisites
- Mentor does not check legality
- Mentor does not modify actor data
- The prerequisite engine is separate from suggestions

### Never Block Progression
- Mentor advice is always skippable
- No "you must take this" enforcement
- Player can always ignore and proceed

### Never Contradict Itself
- If mentor suggested X, it shouldn't suggest Y on re-open (unless inputs changed)
- Survey answers persist and inform all future suggestions
- BuildIntent remains stable unless player's actual choices diverge

### Never Make Decisions
- "Apply Suggestion" button is player-initiated
- No auto-selection of items
- No hidden rule enforcement through suggestions

---

## Tier Hierarchy (Immutable)

| Tier | Code | Meaning |
|------|------|---------|
| 6 | PRESTIGE_PREREQ | Prerequisite for targeted prestige class |
| 5.5 | WISHLIST_PATH | Prerequisite for player's stated goal |
| 5 | META_SYNERGY | Community-proven powerful combination |
| 4.5 | SPECIES_EARLY | Excellent species feat at early levels |
| 4 | CHAIN_CONTINUATION | Builds on existing feat/talent |
| 3.5 | MENTOR_BIAS_MATCH | Aligns with L1 survey answers |
| 3 | SKILL_PREREQ_MATCH | Uses a trained skill |
| 2 | ABILITY_PREREQ_MATCH | Scales with highest ability |
| 1 | CLASS_SYNERGY | Fits character's class |
| 0 | FALLBACK | Legal option, no specific recommendation |

**Do not add tiers.** If a new signal emerges, map it to an existing tier.

---

## Data Flow (Single Source of Truth)

```
Actor State + PendingData + MentorBiases
              ↓
       BuildIntent.analyze()
              ↓
       SuggestionEngine.suggest*()
              ↓
       SuggestionService.getSuggestions()
              ↓
           UI Display
```

- UI never computes suggestions
- UI never stores suggestion logic
- UI only renders what the engine provides

---

## Cache Invalidation Rules

Cache MUST invalidate when:
- Actor is updated (items added/removed/changed)
- PendingData changes (player selects something in current workflow)
- Mentor survey is completed

Cache key MUST include:
- Actor ID
- Actor revision hash (level, abilities, items)
- PendingData hash (selectedClass, selectedFeats, etc.)

---

## Mentor Voice Rules

### Tone Modulation by Confidence
| Confidence | Tone |
|------------|------|
| ≥0.85 | Decisive: "I strongly recommend..." |
| 0.60-0.84 | Confident: "Consider taking..." |
| 0.40-0.59 | Tentative: "One option is..." |
| <0.40 | Open: "Any choice is valid here..." |

### Personality is Presentation Only
- Different mentors may phrase the same suggestion differently
- The underlying tier/reasonCode/confidence is identical
- No mentor-specific logic in suggestion engines

---

## Testing Invariants

Any test suite should verify:

1. **Determinism**: Same actor + pendingData = same suggestions
2. **Completeness**: Every suggestion has tier, reasonCode, confidence, reason
3. **Fallback**: Empty results include meaningful mentorMessage
4. **Consistency**: Re-opening a step returns same top suggestion
5. **Independence**: Mentor output doesn't depend on UI state

---

## What This Contract Protects Against

- v1 patterns leaking back (tight UI-logic coupling)
- "Smart" features that secretly enforce rules
- Randomization that breaks trust
- Mentor logic scattered across UI components
- Features that block new players instead of helping them

---

## When to Update This Contract

Only update if:
- A new invariant is discovered that should be permanent
- An existing rule is found to be wrong (with evidence)

Do NOT update for:
- New features (they should fit within existing rules)
- Edge cases (handle in code, not contract)
- Personal preferences

---

*Last updated: 2026-01-31*
*Applies to: SWSE v2 Suggestion Engine*
