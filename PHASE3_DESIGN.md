# Phase 3: Seraphim Narrator & Store Integration

**Status:** Architecture Planning (Pre-Implementation)

**Build on:** Phase 2 (DroidBuilderApp + StepController + DroidValidationEngine)

**Critical Constraint:** Seraphim is *reactive*, not *authoritative*.

---

## I. Seraphim's Role & Contract

### What Seraphim IS

Seraphim is a **narrative commentary system** that:
- Observes droid configuration state
- Explains choices and trade-offs in story-appropriate language
- Surfaces constraints and opportunities
- Reacts with personality to player decisions

### What Seraphim IS NOT

Seraphim does **not**:
- ❌ Block progression or enforce rules
- ❌ Mutate droid state (read-only)
- ❌ Change validation rules (DroidValidationEngine owns those)
- ❌ Have opinions about what "should" be chosen
- ❌ Implement mechanical constraints
- ❌ Manage budget or cost calculations

### Seraphim's Position in Architecture

```
┌─────────────────────────────────────────┐
│  DroidBuilderApp (Controller)           │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │ DroidValidationEngine (Rules)  │    │ ← AUTHORITY (enforces)
│  │ ✓ Budget calculation           │    │
│  │ ✓ Constraint validation        │    │
│  │ ✓ Progression gating           │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ Seraphim (Narrator)            │    │ ← COMMENTARY (observes)
│  │ • Dialogue generation          │    │
│  │ • Contextual explanation       │    │
│  │ • Personality/tone             │    │
│  │ • Thematic guidance            │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ StepController (Plumbing)      │    │ ← MECHANICS (orchestrates)
│  │ • Item selection               │    │
│  │ • Step navigation              │    │
│  │ • State mutation               │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## II. Seraphim's Dialogue Contract

### Input Signature

```javascript
static generateDialogue(context) {
  // @param {Object} context - Read-only state snapshot
  // @param {string} context.droidDegree - "Third-Degree", etc.
  // @param {string} context.droidSize - "Small", "Medium", etc.
  // @param {string} context.currentStep - "locomotion", "manipulators", etc.
  // @param {Array} context.selectedSystems - Items chosen in this step
  // @param {Object} context.budget - { total, spent, remaining }
  // @param {Object} context.lastAction - { type, itemName, cost }
  // @param {Array} context.warnings - Validation soft warnings
  // @param {Array} context.validation - Hard errors (if any)
  //
  // @returns {Object} Dialogue bundle
  // {
  //   title: string,        // Seraphim's observation
  //   body: string,         // Explanation or reaction
  //   tone: string,         // 'thoughtful', 'urgent', 'encouraging'
  //   icon: string          // Seraphim emoji or ID
  // }
}
```

### Dialogue Types

#### A. Step Introduction
When user enters a new step:
```
Title: "Let's choose your movement system."
Body: "Your droid's locomotion affects speed and terrain handling.
       What works for your combat strategy?"
Tone: "thoughtful"
```

#### B. Selection Reaction
When user selects an item:
```
Title: "Treads — a classic choice."
Body: "Treads provide stability on rough terrain, though they're slower
       than wheels on flat surfaces. Cost: 200 credits."
Tone: "encouraging"
```

#### C. Warning Highlight
When soft validation triggers (optional systems):
```
Title: "No sensors selected yet."
Body: "A droid without sensors will struggle to perceive its surroundings.
       You can proceed, but consider adding optical or thermal systems."
Tone: "cautious"
```

#### D. Budget Alert
When getting close to limit or over:
```
Title: "Budget constraint: 150 credits remaining."
Body: "You have room for smaller enhancements, but not major systems.
       Consider what's essential."
Tone: "urgent"
```

#### E. Configuration Review
When user reaches review step:
```
Title: "Your Third-Degree droid is ready for deployment."
Body: "You've built a balanced unit with [count] appendages and
       [systems]. Ready to finalize?"
Tone: "supportive"
```

---

## III. Store Integration (High-Level Requirements)

### What Store Must Support

Store is a **shopping interface** for:
- Purchasing droids from Seraphim's catalog
- Upgrading existing droids with new systems
- Modifying droids (add armor, replace locomotion, etc.)
- Using credits/EP to acquire items

### Store's Interaction with DroidBuilderApp

#### Scenario 1: Purchase New Droid
```
Flow:
1. Player clicks "Buy Droid" in Store
2. Store presents pre-configured droid templates
3. Player clicks template → DroidBuilderApp opens (NEW mode)
4. Player customizes using builder
5. Player finalizes → actor.system.droidSystems saved
6. Credits deducted from player
7. Droid added to player's sheet
```

#### Scenario 2: Modify Existing Droid
```
Flow:
1. Player owns droid actor
2. Player clicks "Modify" in Store or character sheet
3. DroidBuilderApp opens (EDIT mode) with loaded configuration
4. Player changes: upgrades armor, adds sensors, etc.
5. Step validation triggers auto-prune if needed
6. Player finalizes → actor.system.droidSystems updated
7. Cost difference (new - old) deducted from credits
8. Changes reflected immediately
```

#### Scenario 3: GM Approves Droid
```
Flow:
1. Player designs droid in builder (DRAFT state)
2. Droid enters PENDING_APPROVAL state
3. GM reviews in droid inspector tool
4. GM approves → droid becomes FINALIZED
5. OR GM rejects with notes → droid returns to DRAFT
```

---

## IV. State Modes & Transitions

### Droid State Lifecycle

```
      [No Droid]
           │
           │ Player opens builder
           ▼
    ┌─────────────┐
    │   DRAFT     │  (In-memory build)
    │  (Unsaved)  │
    └─────────────┘
      │         │
      │ Cancel  │ Finalize (validation passes)
      │         │
      ▼         ▼
  [Discarded]  ┌──────────────┐
               │  FINALIZED   │  (actor.system.droidSystems saved)
               └──────────────┘
                  │    ▲
                  │    │
          Modify  │    │ Save changes
                  ▼    │
               ┌──────────────┐
               │   MODIFIED   │  (Pending save)
               └──────────────┘
```

### State Metadata (actor.system.droidSystems)

Add to schema:

```javascript
droidSystems: new fields.SchemaField({
  // ... existing fields ...

  // State tracking
  state: new fields.StringField({
    choices: ['draft', 'finalized', 'modified'],
    initial: 'draft'
  }),
  lastModified: new fields.StringField({
    initial: ''  // ISO timestamp
  }),
  buildHistory: new fields.ArrayField(
    new fields.SchemaField({
      timestamp: new fields.StringField(),
      action: new fields.StringField(),
      detail: new fields.StringField()
    }),
    { initial: [] }
  )
})
```

---

## V. Seraphim's Knowledge Boundaries

### What Seraphim Knows

Seraphim **CAN** observe and comment on:
- Current step and selected systems
- Budget spent/remaining
- Validation warnings (soft constraints)
- Build history (trend detection)
- Degree/size/configuration balance

### What Seraphim Must NOT Know

Seraphim **CANNOT**:
- ❌ Hardcode validation rules
- ❌ Make go/no-go decisions
- ❌ Access external systems (prices, inventories, shops)
- ❌ Enforce mechanical constraints
- ❌ Decide if a configuration is "valid"

**Why:** If Seraphim encodes rules, it forks truth. DroidValidationEngine is the single source.

---

## VI. Store-Builder Integration Surface

### Interface Contract

Store and DroidBuilderApp communicate through:

#### 1. Launch Signature

```javascript
// From Store
DroidBuilderApp.open(actor, {
  mode: 'new' | 'edit',        // Create vs modify
  template: { /* droid template */ },  // Pre-fill if 'new'
  onFinalize: async (config) => {
    // Called when player finalizes
    // Store deducts credits, adds droid to inventory
  },
  onCancel: () => {
    // Called if player cancels
  }
})
```

#### 2. Builder Emits Events

```javascript
// DroidBuilderApp emits after finalization
app.on('droid:finalized', async (data) => {
  data = {
    actor: Actor,
    config: { /* droidSystems */ },
    cost: number,
    modifyCost: number | null  // If edit mode, the delta
  }
})
```

#### 3. Store Handles Post-Finalize

```javascript
async _onDroidFinalized(data) {
  // Deduct credits
  await PlayerEngine.spendCredits(actor, data.cost);

  // Add droid to inventory OR update existing
  if (data.actor.isNew) {
    await party.addMember(data.actor);
  }

  // Mark as finalized
  await data.actor.update({
    'system.droidSystems.state': 'finalized'
  });

  ui.notifications.info(`Droid saved: ${data.actor.name}`);
}
```

---

## VII. Phase 2 Abstractions That Must Hold

### Requirement 1: StepController Remains Untouched

Phase 3 must NOT require changes to `StepController`.

**Pressure point:** If Store needs custom navigation or step logic, we've failed.

**Mitigation:** Store uses DroidBuilderApp's API, not StepController directly.

### Requirement 2: Validation Engine is the Single Source of Truth

All validation calls go through `DroidValidationEngine`, not reimplemented in Seraphim.

**Pressure point:** If Seraphim has to "explain rules it doesn't enforce," we've failed.

**Mitigation:** Seraphim observes validation output, doesn't compute it.

### Requirement 3: Budget Calculation is Centralized

Budget is always computed by `DroidValidationEngine.calculateBudget()`.

**Pressure point:** If Store computes budget differently, we've failed.

**Mitigation:** Store calls the same function.

---

## VIII. Implementation Phases for Phase 3

### Phase 3a: Seraphim Narrator (In DroidBuilderApp)

```
Goals:
- Implement Seraphim.generateDialogue(context)
- Wire into _prepareContext()
- Display in template
- Test across all steps

Success Criteria:
- Seraphim stays read-only
- No validation logic in Seraphim
- Dialogue responds to user choices correctly
```

### Phase 3b: Store Shell (Entry Points Only)

```
Goals:
- Create Store UI (browse templates)
- Implement DroidBuilderApp.open(actor, options)
- Wire finalize events
- Handle credit deduction

Success Criteria:
- Can launch builder from Store
- Can finalize and save droid
- Credits deducted correctly
- No logic forking
```

### Phase 3c: Edit Mode (Modify Existing Droids)

```
Goals:
- Load existing droid config into builder
- Track modifications
- Calculate cost delta
- Test auto-prune on edit

Success Criteria:
- Can modify droid without rebuilding
- Auto-prune works correctly
- Cost delta calculated
- Original config preserved if cancel
```

---

## IX. Questions for Phase 3 Planning Review

**Before implementation, answer these:**

1. **Seraphim Personality:** What is Seraphim's voice? (Analytical? Whimsical? Mentor-like?)

2. **Store Authority:** Can Store create droids without player approval? (GM setting?)

3. **Edit Mode:** Can players freely modify owned droids, or does it require cost/approval?

4. **History Tracking:** Do we track all modifications for audit/balance checking?

5. **Template System:** Where do pre-configured droid templates come from? (Hardcoded? Compendium?)

6. **Credit Source:** How do players earn/spend credits for droid purchases?

---

## X. Risk Surface (Phase 2 → Phase 3)

### Risk 1: Seraphim Creep
**Problem:** Seraphim starts explaining rules → eventually enforcing them → becomes a validator.

**Mitigation:** Code review rule: if Seraphim touches constraint logic, reject.

### Risk 2: Store Fork
**Problem:** Store implements its own item selection logic → diverges from builder.

**Mitigation:** Store must call `StepController` methods, not reimplement.

### Risk 3: Persistent State Surprise
**Problem:** Editing a finalized droid causes unexpected auto-prune or validation failure.

**Mitigation:** Document state transitions clearly, test thoroughly.

### Risk 4: Budget Calculation Divergence
**Problem:** Store calculates cost differently than validation engine.

**Mitigation:** Single function, same everywhere.

---

## XI. Success Criteria (Phase 3 Complete)

- ✅ Seraphim generates contextual dialogue without encoding rules
- ✅ Store launches builder and receives finalization events
- ✅ Edit mode works: load, modify, save, cost delta
- ✅ StepController remains untouched
- ✅ All validation goes through DroidValidationEngine
- ✅ Budget calculations are centralized
- ✅ Auto-prune works on edit mode
- ✅ Tests pass (builder, narrator, store)

---

**This design is ready for Phase 3 planning discussion.**

