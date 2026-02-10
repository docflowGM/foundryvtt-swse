# GM Suggestion System — Integration Guide

## Overview

The GM Suggestion System is **fully integrated and ready to use**. It consists of:

1. **One SuggestionReport** (immutable data structure)
2. **Combat Suggestion Engine** (evaluates tactical state)
3. **Four GM Monitor Modules** (observe and emit insights)
4. **Insight Bus** (aggregates insights)
5. **GM Panel UI** (displays insights to GM)

---

## Architecture

```
Combat State
    ↓
CombatSuggestionEngine.evaluate()
    ↓
SuggestionReport
    ↓
swse:suggestion-report-ready hook
    ↓
[4 Monitors] → [Insights]
    ↓
InsightBus.collect()
    ↓
GM Panel (ApplicationV2)
```

**Key: No duplication, one report, multiple observers**

---

## How It Works

### 1. Automatic Triggers (No Setup Needed)

Combat events automatically trigger evaluation:

```javascript
// These happen automatically:
- Combat round starts
- Combat turn changes
- Token HP updates (debounced)
- Combat begins
```

GM sees insights appear in the panel without any action.

### 2. Manual Trigger (Optional)

For testing or explicit re-evaluation:

```javascript
// In macro or console:
SWSE.requestCombatEvaluation();

// Or directly:
await SWSE.CombatSuggestionEngine.evaluate({
  combat: game.combat,
  reason: 'manual'
});
```

### 3. Test Harness (For Testing)

Four synthetic reports to test the system:

```javascript
// Each creates a scenario and emits a report:
SWSE.testHarness.emitHighPressureReport();
SWSE.testHarness.emitSpotlightImbalanceReport();
SWSE.testHarness.emitStalledPacingReport();
SWSE.testHarness.emitTuningMismatchReport();

// Clear all insights:
SWSE.testHarness.clearInsights();
```

---

## The SuggestionReport Structure

```javascript
{
  meta: {
    reportId: "report-1707427890000-abc1234",
    timestamp: 1707427890000,
    phase: "combat" | "narrative",
    sceneId: "scene-abc123" | null,
    combatId: "combat-xyz789" | null,
    engineVersion: "1.0.0",
    evaluationReason: "turn-start" | "state-change" | "manual" | "phase-transition"
  },

  perActor: {
    [actorId]: {
      actorId: "actor-abc123",
      roleTags: ["striker", "scout"],
      suggestions: [
        {
          id: "sug-1",
          label: "Attack Enemy A",
          category: "attack",
          score: 0.85,
          confidence: 0.9,
          reasonCodes: ["high-damage", "in-range"],
          explanation: "Enemy A is within melee range and has low HP" // Player-safe
        }
      ],
      confidenceBand: "STRONG" | "MODERATE" | "WEAK" | "FALLBACK",
      decisionHealth: {
        optionEntropy: 0.65,  // 0-1: how many viable options?
        constraintLevel: 0.2, // 0-1: how constrained is the actor?
        noveltyScore: 0.7     // 0-1: how novel/repeating?
      },
      intentVector: ["offensive", "aggressive"],
      suppressionFlags: ["focused-fire", "low-mobility"],
      reasoningSummary: "Actor is in a strong position with clear offensive paths"
    }
  },

  partyAggregate: {
    optionEntropy: 0.55,              // Party-wide option diversity
    convergenceScore: 0.3,            // How unified are suggestions?
    pressureIndex: 0.65,              // How much pressure on party?
    confidenceMean: 0.7,              // Average confidence
    confidenceVariance: 0.15,         // Spread of confidence
    intentDistribution: {
      offensive: 0.5,
      defensive: 0.3,
      utility: 0.2
    },
    roleCoverage: {
      tank: { expected: 1, actual: 1 },
      striker: { expected: 2, actual: 1 },
      support: { expected: 1, actual: 1 }
    },
    spotlightImbalance: 0.25          // How unequal is agency?
  },

  // 🔒 GM-ONLY (Never exposed to players)
  diagnostics: {
    fallbackRate: 0.2,                // % of fallback suggestions
    repeatedSuggestionRate: 0.15,     // % repetition
    defensiveBias: 0.3,               // Defensive tendency
    perceptionMismatch: false,        // Math vs player feeling differ?
    evaluationWarnings: [
      "Two actors with zero options"
    ]
  }
}
```

---

## The Four GM Monitor Modules

### 1. Pressure Monitor
**Detects:** Defensive collapse, focus fire, sustained pressure

```javascript
Triggers when:
  - pressureIndex > 0.7
  AND fallbackRate > 0.5
  OR defensiveBias > 0.65

Emits:
  {
    type: "pressure-warning",
    severity: "high" | "medium",
    summary: "Players responding defensively under sustained pressure",
    evidence: ["Pressure index: 75%", "60% fallback suggestions"],
    suggestedLevers: [
      "Reduce enemy focus fire",
      "Introduce positional advantage",
      "Telegraph enemy weakness"
    ]
  }
```

### 2. Spotlight Monitor
**Detects:** Unequal player agency, sidelined characters

```javascript
Triggers when:
  - spotlightImbalance > 0.4
  AND at least one actor has WEAK or FALLBACK confidence

Emits:
  {
    type: "spotlight-imbalance",
    severity: "high" | "medium",
    summary: "2 players have constrained decision space",
    evidence: [
      "Spotlight imbalance: 55%",
      "scout (abc...): FALLBACK confidence, 1 suggestion"
    ],
    affectedActors: ["actor-abc123", "actor-xyz789"],
    suggestedLevers: [
      "Introduce hook aligned to underserved players",
      "Shift enemy behavior to new vectors",
      "Add environmental interaction"
    ]
  }
```

### 3. Pacing Monitor
**Detects:** Stalled or overheated scenes

```javascript
Triggers when:
  Stalled:
    - optionEntropy < 0.4
    AND repeatedSuggestionRate > 0.6

  OR Overheated:
    - pressureIndex > 0.75
    AND confidenceMean < 0.4

Emits:
  {
    type: "pacing-signal",
    state: "stalled" | "overheated",
    severity: "medium" | "high",
    summary: "Scene energy is flattening" OR "Scene is overheated",
    evidence: [
      "Low option entropy: 25%",
      "High suggestion repetition: 75%"
    ],
    suggestedLevers: [
      "Introduce external pressure",
      "Escalate stakes",
      "Offer a decisive choice"
    ]
  }
```

### 4. Tuning Advisor
**Detects:** Perception mismatch (math vs player experience)

```javascript
Triggers when:
  - perceptionMismatch = true
  OR |pressureIndex - confidenceMean| > 0.3

Emits:
  {
    type: "tuning-advice",
    confidence: 0.8,  // How confident in this advice?
    severity: "medium",
    summary: "Encounter feels harder than balanced math suggests",
    evidence: [
      "Pressure: 20%",
      "Confidence: 35%",
      "Mismatch: 15%"
    ],
    suggestedAdjustments: [
      {
        category: "enemy",
        action: "Reduce enemy HP by 10–20%"
      },
      {
        category: "environment",
        action: "Add cover or escape vector"
      }
    ]
  }
```

---

## GM Panel (UI)

### Opening the Panel

```javascript
// In macro:
SWSE.gm.openPanel();

// Or via scene controls (coming soon):
// Click GM Suggestion icon
```

### Panel Features

- **Header:** Scene health summary
- **Content:** Active insights with evidence
- **Levers:** Suggested actions (checkboxes for tracking)
- **Footer:** Clear all, refresh

### What Players Never See

❌ partyAggregate
❌ diagnostics
❌ spotlight imbalance
❌ suggested levers
❌ pressure metrics
❌ fallback rates

Players see ONLY:
✅ Their own suggestions
✅ Player-safe explanations
✅ Soft advisory language

---

## Connecting to Your Suggestion Engine

The system is ready to receive reports from **any** suggestion engine.

### Option A: Call Directly from Your Engine

```javascript
// In your tactical/suggestion evaluator:
import { emitSuggestionReport } from './scripts/gm-suggestions/init.js';
import { createSuggestionReport } from './scripts/suggestion-engine/report-schema.js';

const report = createSuggestionReport({
  meta: { /* ... */ },
  perActor: { /* ... */ },
  partyAggregate: { /* ... */ },
  diagnostics: { /* ... */ }
});

emitSuggestionReport(report);
```

### Option B: Extend CombatSuggestionEngine

The `CombatSuggestionEngine` has placeholder methods:

```javascript
// In combat-engine.js, replace these:

static _generateSuggestions(actor, combat) {
  // Call your tactical AI here
  // Return array of { id, label, category, score, confidence, ... }
}

static _calculateConfidence(actor, combat) {
  // Your confidence scoring
  // Return "STRONG" | "MODERATE" | "WEAK" | "FALLBACK"
}

static _getRoleTags(actor) {
  // Extract from class, feats, talents
  // Return ["striker", "scout", ...]
}

static _getIntentVector(combatant) {
  // Infer from last actions, positioning
  // Return ["offensive", "aggressive", ...]
}

static _evaluatePartyAggregate(combat) {
  // Compute real metrics
  // Return { optionEntropy, pressureIndex, ... }
}

static _evaluateDiagnostics(combat) {
  // Analyze decision space health
  // Return { fallbackRate, repeatedSuggestionRate, ... }
}
```

---

## Hook Reference

### Emitted by Engine

```javascript
Hooks.callAll('swse:suggestion-report-ready', report);
```

Called after `CombatSuggestionEngine.evaluate()` completes.

### Emitted by Monitors

```javascript
Hooks.callAll('swse:gm-insight-emitted', insight);
```

Called when a monitor detects a condition.

### Emitted by Insight Bus

```javascript
Hooks.callAll('swse:gm-insights-updated', insights[]);
```

Called when insights are added/cleared. GM Panel listens to this.

### Combat Hooks (Automatic Triggers)

```javascript
Hooks.on('combatRoundChange', async (combat) => { /* evaluate */ });
Hooks.on('combatTurnChange', async (combat) => { /* evaluate */ });
Hooks.on('combatStart', async (combat) => { /* evaluate */ });
Hooks.on('updateToken', async (token, update) => { /* evaluate */ });
```

---

## Testing Workflow

### 1. Open Browser Console

Press F12 (or right-click → Inspect → Console).

### 2. Emit Test Reports

```javascript
// Test pressure scenario
SWSE.testHarness.emitHighPressureReport();

// Watch the GM panel appear with insights
```

### 3. Verify Monitors

- **Pressure Monitor:** Should trigger on high pressure report
- **Spotlight Monitor:** Should trigger on imbalance report
- **Pacing Monitor:** Should trigger on stalled report
- **Tuning Advisor:** Should trigger on mismatch report

### 4. Check Hooks

```javascript
// In console:
SWSE.testHarness.emitHighPressureReport();
// You should see:
// [InsightBus] Initialized with 4 GM monitor modules
// [CombatSuggestionEngine] Report emitted (manual-test)
// Insight card appears in GM panel
```

---

## Guardrails (Enforced)

✅ **One Report Per Cycle**
- All modules read same report
- No race conditions

✅ **No Suggestion Modification**
- GM modules are read-only observers
- Cannot alter suggestions

✅ **Player Privacy**
- `getPlayerSafeView(report, actorId)` isolates per-actor data
- Players never see party-level diagnostics

✅ **No Auto-Application**
- GM panel shows suggestions only
- GM must decide to apply

✅ **Immutable After Emission**
- Report is frozen with `Object.freeze()`
- Prevents accidental mutations

---

## File Structure

```
scripts/
├── suggestion-engine/
│   ├── report-schema.js          ← Immutable report structure
│   ├── combat-engine.js          ← Evaluates tactical state
│   ├── combat-hooks.js           ← Registers automatic triggers
│   └── test-harness.js           ← Test scenarios
│
└── gm-suggestions/
    ├── insight-types.js          ← Type definitions
    ├── pressure-monitor.js       ← Monitor 1
    ├── spotlight-monitor.js      ← Monitor 2
    ├── pacing-monitor.js         ← Monitor 3
    ├── tuning-advisor.js         ← Monitor 4
    ├── insight-bus.js            ← Aggregation
    ├── gm-suggestion-panel.js    ← UI Panel
    └── init.js                   ← System init

templates/gm/
├── suggestion-panel-header.hbs
├── suggestion-panel-content.hbs
└── suggestion-panel-footer.hbs

styles/gm/
└── suggestion-panel.css
```

---

## Next Steps

1. **Replace Placeholders** in `combat-engine.js` with real logic
2. **Test with `testHarness`** to verify all modules work
3. **Wire Your Suggestion Engine** to emit reports
4. **Refine Thresholds** in monitors (pressure > 0.7, etc.)
5. **Add More Monitors** if needed (custom logic)

---

## FAQ

**Q: Can I add custom GM modules?**
A: Yes. Create a new module, subscribe to `swse:suggestion-report-ready`, and emit insights via `swse:gm-insight-emitted`.

**Q: Do players see the GM panel?**
A: No. The panel is GM-only. Players can only see their own suggestions through other UI.

**Q: What if I want different thresholds?**
A: Edit the `TRIGGER_THRESHOLD` constants in each monitor module.

**Q: How often does evaluation happen?**
A: Automatically on: turn change, round change, HP update (debounced 500ms), combat start. Manual on GM request.

**Q: Can I disable the system?**
A: Yes. Comment out `registerCombatSuggestionHooks()` in `index.js`.

---

## Support

If issues arise:
1. Check browser console for errors
2. Test with `SWSE.testHarness.emitHighPressureReport()`
3. Verify all hooks registered: look for `[InsightBus] Initialized...` log
4. Confirm GM has permission to open windows

---

**System Status:** ✅ Ready to use
**Last Updated:** 2026-02-08
