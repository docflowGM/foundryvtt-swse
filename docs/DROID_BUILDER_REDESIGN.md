# Droid Builder Redesign: Budget-Aware Deferred Construction

## Audit Findings

### Current State

**File Structure:**
- `scripts/apps/progression-framework/steps/droid-builder-step.js` — Main step implementation
- `scripts/data/droid-systems.js` — System definitions with cost formulas
- `scripts/apps/progression-framework/shell/progression-finalizer.js` — Compiles droid data for persistence
- `scripts/apps/progression-framework/steps/summary-step.js` — Final review (does NOT track credits)
- House rules setting: `droidConstructionCredits` (default: 1000, defined in `houserule-settings.js`)

**Current Behavior:**

1. **Budget Definition** (lines 59-71 in droid-builder-step.js)
   - House rule setting defines base droid chargen budget (default 1000 credits)
   - Heuristic processor is free (default, always granted)
   - Cost calculation uses formulas (e.g., locomotion: `10 × costFactor × (speed²)`)
   - Cost factor varies by droid size (tiny=5, medium=1, colossal=20)

2. **State Tracking** (lines 76-86 in droid-builder-step.js)
   ```javascript
   droidState = {
     isDroid: true,
     droidDegree: '1st-degree',
     droidSize: 'medium',
     droidSystems: {
       locomotion: null,
       processor: {id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5},
       appendages: [],
       accessories: [],
       locomotionEnhancements: [],
       appendageEnhancements: [],
       totalCost: 0,
       totalWeight: 0
     },
     droidCredits: {
       base: 1000,
       spent: 0,
       remaining: 1000
     }
   }
   ```

3. **Validation** (lines 202-238 in droid-builder-step.js)
   - Required systems: locomotion, processor (heuristic), appendages (1+)
   - Budget check: `credits.remaining >= 0` (cannot overspend)
   - Blocking issues prevent advancing until all requirements met

4. **Finalizer Integration** (lines 252-258 in progression-finalizer.js)
   - Droid data is compiled into mutation plan if `selections.has('droid-builder')`
   - Patches: `droidSystems`, `droidCredits`, `droidDegree`, `droidSize`
   - Currently treats droid build as complete once step is finished

### Problems with Current Design

**Problem 1: No Deferral Support**
- Player MUST complete droid building on entering the step
- Cannot defer until end of chargen to see remaining credits
- No way to "skip for now" and return later

**Problem 2: No Budget Visibility**
- Summary step does NOT show droid budget status
- Player cannot see how much droid budget remains before finalizing
- No UI for comparing droid budget vs general starting credits

**Problem 3: No "Burn" Incentive**
- Suggestion engine doesn't optimize for efficient budget use
- Player can easily waste dedicated droid budget
- No recommendations for "packages" that efficiently use remaining credits

**Problem 4: No Overflow Management**
- Current code doesn't handle overflow from droid budget into general credits
- No contract defining whether overflow is allowed or forbidden
- General starting credits calculation doesn't account for droid budget

**Problem 5: No Final Pass**
- Once player moves past droid-builder step, they can't return
- No final droid allocation pass before chargen completes
- If player deferred and reaches end with no droid build, chargen cannot complete

---

## Proposed State Model

### Three-State Droid Build System

```javascript
enum DroidBuildState {
  DEFERRED = 'deferred',        // Step skipped, droid build pending
  PROVISIONAL = 'provisional',  // Mid-chargen selections, not final
  FINALIZED = 'finalized'       // End-of-chargen, real remaining credits known
}
```

### Extended Droid State Tracking

```javascript
droidBuildState = {
  // Build state machine
  state: 'deferred' | 'provisional' | 'finalized',  // Current phase

  // Budget tracking (use-it-or-lose-it)
  budget: {
    dedicated: {
      base: 1000,              // House rule setting for droid chargen budget
      spent: 0,                // Amount spent on droid systems
      remaining: 1000,         // base - spent
      willBeLost: false        // Player acknowledged this will be lost if unspent
    },
    general: {
      allocated: 0,            // Amount of general starting credits used for droid overflow
      allowed: true            // Can droid systems overflow into general credits?
    }
  },

  // Systems (unchanged from current)
  systems: {
    locomotion: null,
    processor: {id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5},
    appendages: [],
    accessories: [],
    locomotionEnhancements: [],
    appendageEnhancements: [],
    totalCost: 0,
    totalWeight: 0
  },

  // Metadata for phase-specific behavior
  completeness: {
    hasLocomotion: false,
    hasProcessor: true,        // Always true (heuristic is free)
    hasAppendages: false,
    isLegal: false,            // All required systems present + budget OK
    isOptimal: false           // Budget efficiently used (90%+ of dedicated budget)
  },

  // Suggestion mode hint (for engine)
  suggestionMode: 'preview' | 'final',  // Influences recommendation priority

  // Acknowledgementsfor player agency
  playerChoices: {
    acceptedWastedBudget: false,  // Player OK with losing dedicated budget
    skipForNow: false,             // Player chose to defer to end
    confirmedFinal: false          // Player confirmed this is their final build
  }
}
```

---

## Proposed Budget Contract

### Priority Rules (Enforced)

1. **Free Systems First**
   - Heuristic processor always free (cost: 0)
   - 2× free hands (if appendage is 'hand', cost: 0)
   - Any other free systems defined in droid-systems.js

2. **Dedicated Droid Budget**
   - Used first for all other systems
   - Must not overflow into general credits unless explicitly allowed
   - Unspent amount is LOST at chargen end (never converted)

3. **General Starting Credits (if allowed)**
   - Only used if droid systems exceed dedicated budget
   - Only if house rules allow `allowDroidOverflow: true`
   - Reduces general starting credits available for equipment/shops

4. **Validation Rule**
   - At finalization: `totalSpent <= dedicatedBudget OR (totalSpent > dedicatedBudget AND allowDroidOverflow)`
   - If violated: block finalization with clear error

---

## Proposed Suggestion Engine Behavior

### Preview Mode (During Chargen, Before Final Credits Known)

**Goal:** Show broad recommendations without committing to exact budget burn

**Recommendations Should:**
- Group systems into "packages" (e.g., "Combat-Optimized: walking + power servos + magnetic hands")
- Show rough cost bands: "100-200 credits", "200-400 credits"
- Mark as "PROVISIONAL" to indicate they may change
- Avoid exact cost calculations (general categories ok)
- Suggest systems that leave meaningful budget for customization

**Tiers:**
- Tier 5: "Excellent fit for [archetype], uses ~70% dedicated budget"
- Tier 4: "Good choice, balanced budget use"
- Tier 3: "Valid option, may leave budget unused"
- Tier 2: "Minimal recommendation"
- Tier 1: "Available but not recommended"

---

### Final Mode (End of Chargen, Real Remaining Credits Known)

**Goal:** Help player efficiently spend remaining dedicated budget before it's lost

**Recommendations Should:**
- Be EXACT cost calculations (real remaining budget known)
- Show "Exactly uses remaining budget" recommendations first
- Show "Closest fit" recommendations (e.g., "150/200 credits left")
- Explicitly list "Waste reduction" recommendations (filler items/bundles)
- Mark "Will be lost if skipped" with visual warning

**Tiers:**
- Tier 5: "Uses remaining budget exactly (200/200 credits)"
- Tier 4: "Efficient use (190-199 credits), minimal waste"
- Tier 3: "Acceptable (175-189 credits), 15-25 waste"
- Tier 2: "Suboptimal (150-174 credits), 25+ waste"
- Tier 1: "Wastes significant budget"

**Special:** Bundle recommendations
- "Value Package: Magnetic Grip + Vocabulator Kit (exactly 200 credits)"
- "Filler Options: Any 1-3 accessories to use up remaining 50 credits"

---

## UI/Flow Implications

### Step 1: Class/Species Selection (Early Chargen)

**Status:** Allow droid players to defer droid building

```
UI: At start of droid-builder-step
┌─────────────────────────────────────┐
│ Droid Configuration                 │
├─────────────────────────────────────┤
│                                     │
│ Budget: 1000 credits (dedicated)    │
│                                     │
│ [✓] Start Building      [Later]     │  ← Two buttons
│                                     │
│ Skip now and configure at the       │
│ end of chargen when you know        │
│ your final remaining credits.       │
│                                     │
└─────────────────────────────────────┘
```

**Behavior if [Later] clicked:**
- Mark `droidBuildState = 'deferred'`
- Don't block progression
- Show visual indicator in progress rail: "⚠️ Droid Build Pending"
- Reserved droid budget is protected (not merged with general credits)

### Step 2: If Building Now (PROVISIONAL Mode)

**Status:** Show grouped recommendations, rough costs

```
UI: During chargen droid-builder-step
┌──────────────────────────────────────────┐
│ Droid Configuration (Preliminary)        │
├──────────────────────────────────────────┤
│                                          │
│ Dedicated Budget: 1000 credits           │
│ Estimated Spent: ~350-400 credits       │
│ Recommended System Packages:             │
│                                          │
│ ⭐ Combat Specialist                    │
│    Walking + Heavy Servos + Magnetic   │
│    Hands (approx 350-400 cred)          │
│    [✓ Add Package] [Details]            │
│                                          │
│ ⭐ Scout Configuration                  │
│    Wheeled + Light Frame + Sensors     │
│    (approx 250-300 cred)                │
│    [✓ Add Package] [Details]            │
│                                          │
│ Note: These are preliminary. Your final │
│ available budget will be confirmed at   │
│ the end of character generation.        │
│                                          │
│ [Continue] [Build Manually]  [Skip Now] │
└──────────────────────────────────────────┘
```

### Step 3: Summary/Review (Still Showing PROVISIONAL)

**Status:** Summary shows droid build is incomplete

```
UI: In summary-step
┌──────────────────────────────────────────┐
│ Character Summary                        │
├──────────────────────────────────────────┤
│ Name: [input]                            │
│ Class: Soldier                           │
│ Species: Human                           │
│ ...                                      │
│                                          │
│ ⚠️ DROID BUILD PENDING                 │
│    You have not yet configured your    │
│    droid systems. This will be done    │
│    in the final step before creating   │
│    your character.                     │
│                                          │
│ [Review Droid Build]                    │
│                                          │
└──────────────────────────────────────────┘
```

**Behavior:**
- Show warning that droid build is incomplete
- Allow jumping back to droid-builder-step if desired
- But don't block proceeding to finalization

### Step 4: Before Finalization (FINALIZED Mode)

**Status:** Final droid build pass with real remaining credits

```
UI: New "Final Droid Configuration" step (if deferred)
┌──────────────────────────────────────────────┐
│ Final Droid Configuration                    │
├──────────────────────────────────────────────┤
│                                              │
│ 🎯 FINAL BUDGET ALLOCATION                  │
│                                              │
│ Your remaining starting credits: 500 total   │
│ Droid dedicated budget: 1000 total           │
│ Droid budget available: 1000 (unused)        │
│                                              │
│ ⚠️ WARNING: Unspent droid budget (up to     │
│ remaining amount) will be LOST. You can     │
│ only use it for droid systems now.          │
│                                              │
│ Recommended to efficiently use:              │
│ ⭐⭐⭐ Magnetic Grip + Vocabulator Kit       │
│        (exactly 200 credits, leaves 800)    │
│                                              │
│ ⭐⭐⭐ Full Combat Package + Treads         │
│        (exactly 1000 credits, no waste)     │
│                                              │
│ [Select Option] [Build Manually]            │
│                                              │
│ [Confirm & Continue to Character Sheet]     │
│                                              │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Show REAL remaining credits (no longer estimates)
- Highlight "exact fit" and "best fit" recommendations
- Warn about budget loss
- Force player to acknowledge waste before confirming
- Then proceed to final character sheet/creation

---

## Finalizer Implications

### Current Finalization Flow

```
shell.committedSelections.get('droid-builder')
  → ProgressionFinalizer._compileMutationPlan()
  → droidBuild = {droidDegree, droidSize, droidSystems, droidCredits}
  → mutations.patches.droid* = ...
```

### New Finalization Flow

**Case 1: Droid Build NOT Deferred**
```
state = 'provisional' → finalization proceeds as before
  (droid budget fully allocated or acknowledged as waste)
```

**Case 2: Droid Build DEFERRED**
```
state = 'deferred' at summary-step
  → Finalizer detects deferred status
  → Blocks chargen completion
  → Redirects to "Final Droid Configuration" step
  → User must complete droid build in finalized mode
  → droidCredits updated with real general-credit overflow
  → Then finalization proceeds
```

**Validation in Finalizer:**
```javascript
// After _compileMutationPlan(), before ActorEngine:
if (isDroid) {
  const {dedicatedBudget, spent, generalUsed} = droidBuild.droidCredits;

  // Check no overflow without permission
  if (spent > dedicatedBudget && !house.allowDroidOverflow) {
    throw new Error(`Droid cost (${spent}) exceeds dedicated budget (${dedicatedBudget})`);
  }

  // Reduce general starting credits by overflow
  if (generalUsed > 0) {
    mutationPlan.coreData.startingCredits -= generalUsed;
    mutationPlan.patches.droidCredits.general.allocated = generalUsed;
  }
}
```

---

## Suggestion Engine Implications

### Contract Decision: Single Domain with Mode Parameter

**Recommended Approach:**

```javascript
SuggestionService.getSuggestions(actor, 'chargen', {
  domain: 'droid-systems',
  mode: 'preview' | 'final',   // ← NEW parameter
  pendingData: {
    // ... standard pending data ...
    droidBuildState: 'provisional' | 'finalized',
    remainingDedicatedBudget: 650,  // Only in 'final' mode
    remainingGeneralCredits: 400    // For overflow context
  }
})
```

**Why single domain with mode:**
- Cleaner than `droid-systems-preview` and `droid-systems-final`
- Reuses existing domain registry infrastructure
- Easier for steps to request suggestions knowing their phase
- Mode parameter clearly documents the contextual difference

### DroidSuggestionEngine Behavior

**Preview Mode:**
- Returns 3-5 system packages (named bundles)
- Rough cost bands ("100-200 cred", "200-400 cred")
- Marked as `confidence: <tier>`, `mode: 'preview'`
- Reasons emphasize role synergy, not budget

**Final Mode:**
- Returns 5-10 specific recommendations
- EXACT costs (e.g., "Exactly 200 credits")
- Marked as `confidence: <tier>`, `mode: 'final'`
- Reasons emphasize budget efficiency
- Special `recommendation: 'waste-reduction'` flag for filler items
- Warnings about budget loss

---

## Recommended Implementation Order

### Phase A: State Model (Foundation)
1. Extend droid-builder-step._droidState to include full three-state model
2. Add deferred/provisional/finalized state tracking
3. Add player choices tracking (acknowledged waste, skip for now, confirmed final)
4. Update validation to understand state transitions

### Phase B: Deferred Behavior (Deferral Logic)
1. Add "Skip for Now" button to droid-builder-step UI
2. Update progress-rail to show "⚠️ Droid Build Pending" indicator
3. Protect reserved droid budget (don't merge with general credits)
4. Update finalizer to detect deferred state and block completion

### Phase C: Final Pass Infrastructure (End-of-Chargen)
1. Create new ProgressionStep: "FinalDroidConfigurationStep"
2. Insert after summary-step if droid build is deferred
3. Update progression shell step sequencing logic
4. Implement final droid build UI with real credits shown

### Phase D: Suggestion Engine Integration (Recommendations)
1. Create DroidSuggestionEngine.js with preview/final modes
2. Update SuggestionService to route 'droid-systems' domain
3. Update droid-builder-step to use suggestions (preview mode)
4. Update final-droid-configuration-step to use suggestions (final mode)

### Phase E: Polish & Validation (Quality)
1. Add comprehensive error messages for budget violations
2. Update house rules for `allowDroidOverflow` setting
3. Add telemetry/logging for droid build decisions
4. Test all state transitions (normal path, deferred path, deferred+final path)

---

## Existing Code That Helps

✅ **House Rules System Ready**
- `droidConstructionCredits` setting already exists (default 1000)
- Just needs new `allowDroidOverflow` setting

✅ **Cost Calculation Formulas Ready**
- droid-systems.js has all cost/weight formulas
- No changes needed to calculation logic

✅ **Validation Structure Ready**
- droid-builder-step._validateDroidBuild() already checks:
  - Locomotion required
  - Processor (heuristic) required
  - Appendages required
  - Budget check (credits.remaining >= 0)
  - Just needs to understand deferred state

✅ **Finalizer Structure Ready**
- progression-finalizer already compiles droid data
- Just needs state machine awareness

✅ **Progression Shell Ready**
- Already handles arbitrary step sequences
- ConditionalStepResolver can discover "Final Droid Config" step

---

## Summary

**Budget Model:** Dedicated droid chargen budget (use-it-or-lose-it) + optional overflow into general credits

**State Transitions:**
- Deferred (skipped) → Provisional (building now) → Finalized (locked in)

**UI Flow:**
- Early: "Start now" or "Do it later"
- Mid-chargen: Provisional recommendations (packages, rough costs)
- Summary: Warning that droid build pending
- End: Final configuration step with real budgets + final recommendations

**Suggestion Engine:** Single domain with `mode: 'preview'|'final'` parameter

**Key Constraint:** Unspent dedicated budget is LOST, not converted to general credits

**Implementation Order:** State model → Deferred logic → Final pass → Suggestions → Polish

This design preserves player agency (can defer, can choose not to build optimally) while actively helping them make efficient use of the dedicated droid budget that would otherwise be wasted.
