# MENTOR INTERACTION ORCHESTRATOR — Integration Guide

## Overview

The `MentorInteractionOrchestrator` is a coordination layer that governs when and how mentor advisory is delivered. It defines three explicit interaction modes, each with distinct purpose and output.

**Key Principle:** The orchestrator **does not modify** either Architecture A or Architecture B. It **coordinates** their use.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MentorInteractionOrchestrator             │
│                   (Coordination Layer)                       │
└──────────┬──────────────────┬──────────────────┬─────────────┘
           │                  │                  │
    ┌──────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  Selection │    │  Reflection │    │   Hybrid    │
    │    Mode    │    │     Mode    │    │    Mode     │
    └──────┬─────┘    └──────┬──────┘    └──────┬──────┘
           │                  │                  │
    ┌──────▼──────────┐    ┌──┴─────────────┐   │
    │ SuggestionEngine│    │BuildAnalysis   │   │
    │ (Architecture A)│    │Engine           │   │
    │                 │    │(Architecture B) │   │
    └──────┬──────────┘    └──┬─────────────┘   │
           │                  │                  │
    ┌──────▼──────────────────▼──────────────────▼──────┐
    │           MentorJudgmentEngine                     │
    │      (Existing Rendering System)                   │
    │    - MentorAtomPhrases                             │
    │    - mentor-judgment-renderer                      │
    │    - Data-driven mentor voices                     │
    └────────────────────────────────────────────────────┘
```

---

## Three Interaction Modes

### 1. Selection Mode

**When to use:** During level-up feature selection, feat/talent choice.

**Input:**
```javascript
{
  mode: "selection",
  actor,
  mentorId,
  suggestion,      // From SuggestionEngine
  item             // The feat/talent being considered
}
```

**Process:**
1. Uses `SuggestionEngine` suggestion object directly
2. Extracts tier, reasonCode, atoms
3. Renders mentor response via `MentorJudgmentEngine`

**Output:**
```javascript
{
  mode: "selection",
  primaryAdvice: "string",
  suggestionTier: number,
  reasonCode: string,
  confidence: number,
  deterministic: true
}
```

**Example Output:**
```
MODE: selection
TIER: 4 (CHAIN_CONTINUATION)
ADVICE: "You've already started down the Sniper path—this feat is the natural next step. Trust your instincts."
CONFIDENCE: 0.75
```

---

### 2. Reflection Mode

**When to use:** Character sheet review, mentor consultation, build analysis.

**Input:**
```javascript
{
  mode: "reflection",
  actor,
  mentorId
}
```

**Process:**
1. Calls `BuildAnalysisEngine.analyze(actor)`
2. Converts conflict/strength signals to advisory atoms
3. Generates mentor response via `MentorJudgmentEngine`
4. Returns structured analysis

**Output:**
```javascript
{
  mode: "reflection",
  primaryAdvice: "string",
  strategicInsight?: "string",
  conflicts: [
    { type: string, severity: string, evidence: array }
  ],
  strengths: [
    { type: string, strength: string, evidence: array }
  ],
  metrics: {
    coherenceRating: number,
    buildBalance: number,
    specialization: number
  },
  deterministic: true
}
```

**Example Output:**
```
MODE: reflection
COHERENCE: 0.68
BUILD BALANCE: 0.55

PRIMARY ADVICE:
"Your build is scattered. You're investing in sniping, melee combat, and
diplomacy simultaneously. Pick one path and master it."

CONFLICTS:
- commitment_ignored (High severity)
- goal_deviation (Medium severity)

STRENGTHS:
- synergy_present (Your Force powers complement your class)

STRATEGIC INSIGHT:
"If you want to be a Sniper, stop training melee feats. If you want combat
flexibility, specialize differently. Right now, you're good at nothing."
```

---

### 3. Hybrid Mode

**When to use:** Evaluating a choice within overall build context.

**Input:**
```javascript
{
  mode: "hybrid",
  actor,
  mentorId,
  suggestion,        // The specific choice
  item,              // What's being selected
  pendingData        // Any pending selections
}
```

**Process:**
1. Executes **Selection Mode** for the specific item
2. Executes **Reflection Mode** for overall build
3. Merges outputs deterministically:
   - Immediate advice first
   - Strategic context second
   - No duplication

**Output:**
```javascript
{
  mode: "hybrid",
  primaryAdvice: "string",      // From Selection Mode
  suggestedItem: "string",
  suggestionTier: number,
  strategicContext?: {
    advice: "string",           // From Reflection Mode
    conflicts: array,
    strengths: array
  },
  deterministic: true
}
```

**Example Output:**
```
MODE: hybrid
ITEM: "Resilience" (Tier 4 - CHAIN_CONTINUATION)

PRIMARY ADVICE:
"This feat matches what you've already built. Solid choice."

STRATEGIC CONTEXT:
Your overall build is drifting. This choice is good, but you need to commit
to a direction soon. Right now you're spread across too many combat styles.

CONFLICTS:
- goal_deviation (medium)
```

---

## Integration Points

### Selection Mode Integration

Where used: Level-up UI, feature selection flows

```javascript
// In level-up controller
const suggestion = await SuggestionEngine.suggestFeats(feats, actor, pendingData);

// NEW: Get mentor voice
const mentorAdvice = await MentorInteractionOrchestrator.handle({
  mode: "selection",
  actor: actor,
  mentorId: actor.system.selectedMentor,
  suggestion: suggestion[0],
  item: suggestion[0]
});

// Display
ui.showMentorAdvice(mentorAdvice.primaryAdvice);
```

### Reflection Mode Integration

Where used: Character sheet, mentor review panel, analysis view

```javascript
// In character sheet mentor panel
const analysis = await MentorInteractionOrchestrator.handle({
  mode: "reflection",
  actor: actor,
  mentorId: actor.system.selectedMentor
});

// Display
ui.showMentorReflection({
  advice: analysis.primaryAdvice,
  insight: analysis.strategicInsight,
  conflicts: analysis.conflicts,
  metrics: analysis.metrics
});
```

### Hybrid Mode Integration

Where used: Advanced level-up UI, build optimizer

```javascript
// When user hovers over a feat during level-up
const analysis = await MentorInteractionOrchestrator.handle({
  mode: "hybrid",
  actor: actor,
  mentorId: actor.system.selectedMentor,
  suggestion: suggestion,
  item: item,
  pendingData: pendingData
});

// Show both immediate and strategic context
ui.showHybridAdvice({
  immediate: analysis.primaryAdvice,
  strategic: analysis.strategicContext,
  tier: analysis.suggestionTier
});
```

---

## API Reference

### MentorInteractionOrchestrator.handle(context)

**Signature:**
```javascript
static async handle(context: {
  mode: "selection" | "reflection" | "hybrid",
  actor: Actor,
  mentorId: string,
  suggestion?: Object,
  item?: Object,
  pendingData?: Object
}): Promise<Object>
```

**Returns:** Mode-specific output object (see above)

**Throws:** Never. Returns error in result object on failure.

**Determinism:** Yes. Same input always produces same output.

**Mutation:** No. Actor and all inputs remain unchanged.

---

## Signal-to-Atom Mapping

The orchestrator converts `BuildAnalysisEngine` signals to mentor advisory atoms:

| Signal Category | Maps To Atom | Meaning |
|---|---|---|
| `commitment_conflict` | `commitment_ignored` | Build doesn't match stated commitment |
| `goal_conflict` | `goal_deviation` | Choices conflict with build direction |
| `pattern_mismatch` | `pattern_conflict` | Selections break established pattern |
| `readiness_gap` | `readiness_lacking` | Character isn't ready for this choice |
| `vulnerability` | `risk_increased` | Choice increases exposure |
| `exploration` | `exploration_signal` | Unusual but valid choice |
| `synergy` | `synergy_present` | Choices reinforce each other |
| `specialization` | `feat_reinforces_core_strength` | Choice strengthens core identity |

---

## Tier-to-Intensity Mapping

Selection Mode intensity is derived from suggestion tier:

| Tier | Intensity | Meaning |
|---|---|---|
| 5-6 | `very_high` | Prestige path, highest recommendation |
| 4 | `high` | Chain continuation, strong fit |
| 3 | `medium` | Category synergy, solid match |
| 1-2 | `low` | Thematic fit, legal option |
| 0 | `very_low` | Fallback, no specific recommendation |

---

## Example Flow: Level-Up with Mentor Guidance

```javascript
// User levels up Scout (Sniper)
const actor = game.actors.get("actor-001");

// Step 1: SuggestionEngine provides options
const feats = await actor.getQualifiedFeats();
const suggestions = await SuggestionEngine.suggestFeats(
  feats,
  actor,
  {},
  { buildIntent: buildIntent }
);

// Step 2: Mentor provides selection guidance
for (const featWithSuggestion of suggestions) {
  if (featWithSuggestion.isSuggested) {
    const mentorGuidance = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "lead",
      suggestion: featWithSuggestion.suggestion,
      item: featWithSuggestion
    });

    console.log(`Lead says about ${featWithSuggestion.name}:`);
    console.log(`  Tier: ${mentorGuidance.suggestionTier}`);
    console.log(`  ${mentorGuidance.primaryAdvice}`);
  }
}

// Step 3: When user hovers, show build context
const selectedFeat = feats[0];
const hybrid = await MentorInteractionOrchestrator.handle({
  mode: "hybrid",
  actor: actor,
  mentorId: "lead",
  suggestion: suggestions[0].suggestion,
  item: selectedFeat
});

console.log(`Immediate: ${hybrid.primaryAdvice}`);
if (hybrid.strategicContext) {
  console.log(`Strategic: ${hybrid.strategicContext.advice}`);
}

// Step 4: Before confirming, mentor review
const review = await MentorInteractionOrchestrator.handle({
  mode: "reflection",
  actor: actor,
  mentorId: "lead"
});

console.log(`Overall assessment:`);
console.log(`  Coherence: ${review.metrics.coherenceRating}`);
console.log(`  ${review.primaryAdvice}`);
```

---

## Testing

Run the test suite:
```bash
node scripts/engine/mentor/mentor-interaction-orchestrator.test.js
```

Tests verify:
- ✅ Selection mode returns consistent format
- ✅ Reflection mode produces valid analysis
- ✅ Hybrid mode merges correctly
- ✅ Determinism (same input = same output)
- ✅ No actor mutation
- ✅ All mentors respond
- ✅ Error handling graceful

---

## Performance Characteristics

| Mode | Cost | Cacheable |
|---|---|---|
| Selection | Very low (uses cached suggestion) | Yes (suggestion already computed) |
| Reflection | High (full BuildAnalysisEngine analysis) | No (actor state changes) |
| Hybrid | High (reflection + selection) | Partial (can cache selection) |

**Optimization:** Cache reflection results for 30 seconds if actor hasn't changed.

---

## Future Work (Phase 3.0-D)

Once mentor JSON files are populated with judgment atoms:

1. Replace `MentorJudgmentEngine` calls with judgment renderer
2. Use MENTOR_REASON_JUDGMENT_RULES directly
3. Architecture becomes fully data-driven
4. No code changes needed to orchestrator—just swap rendering layer

Migration path is clean and non-breaking.

---

## Architectural Guarantees

The orchestrator maintains these contracts:

✅ **No SuggestionEngine modification:** Reads output only.
✅ **No BuildAnalysisEngine modification:** Reads output only.
✅ **No existing mentor system changes:** Works with current systems.
✅ **Deterministic:** Same input always = same output.
✅ **No side effects:** No mutations, no logging side effects.
✅ **Clear separation:** Three distinct modes, no mixing.
✅ **Backward compatible:** Can be added without changing existing code.
✅ **Future-proof:** Designed for judgment-atom migration.

---

## Design Philosophy

> "Orchestration, not refactoring. Coordination, not modification."

The mentor system has two complete architectures (Narrative and Judgment). Rather than merging them, this orchestrator explicitly coordinates when each is used, preserving both while adding intentionality to mentor interactions.
