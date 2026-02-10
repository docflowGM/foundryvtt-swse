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

## VIII. Implementation Phases for Phase 3 (READY TO START)

**Design is LOCKED. Proceeding to Phase 3a implementation.**

### Phase 3a: Seraphim Narrator (In DroidBuilderApp) — NEXT

```
Goals:
- Implement Seraphim.generateDialogue(context)
  using locked Analyst-Mentor voice
- Wire into _prepareContext()
- Display in template at each step
- Test across all steps (intro, 7 systems, review)

Success Criteria:
- ✅ Seraphim stays read-only (no mutations)
- ✅ No validation logic in Seraphim
- ✅ Dialogue responds to user choices correctly
- ✅ Tone consistent (advisory, not prescriptive)
- ✅ No hardcoded rules in dialogue

Time estimate: 3-4 hours
Blocker risk: None (doesn't depend on other phases)
```

### Phase 3b: Store Shell (Entry Points Only) — AFTER 3a

```
Goals:
- Create Store UI (browse droid templates from compendium)
- Implement DroidBuilderApp.open(actor, options)
- Wire finalize events
- Handle credit deduction via PlayerEngine
- Respect world setting: store.requireGMApproval

Success Criteria:
- ✅ Can launch builder from Store (NEW mode)
- ✅ Can finalize and save droid
- ✅ Credits deducted on finalize
- ✅ No logic forking (uses builder API only)
- ✅ GM approval flow (if enabled)

Time estimate: 4-5 hours
Blocker risk: Depends on Phase 3a
```

### Phase 3c: Edit Mode (Modify Existing Droids) — AFTER 3b

```
Goals:
- Load existing droid config into builder (EDIT mode)
- Track modifications in buildHistory
- Calculate cost delta (new - old)
- Test auto-prune on edit
- Respect droid.locked flag

Success Criteria:
- ✅ Can modify droid without rebuilding
- ✅ Auto-prune works correctly
- ✅ Cost delta calculated and shown
- ✅ Original config preserved if cancel
- ✅ buildHistory tracks changes
- ✅ Locked droids can't be edited (if GM enables)

Time estimate: 3-4 hours
Blocker risk: Depends on Phase 3b
```

---

## Summary: Phase 3 is Ready to Execute

**Design locked. All ambiguity resolved. Ready for Phase 3a.**

Next step: Implement Seraphim narrator.

---

## IX. Answers to Phase 3 Planning Questions (LOCKED)

### 1️⃣ Seraphim's Voice
**Decision:** Analyst-Mentor hybrid (calm, observant, lightly opinionated)

Rationale: Matches "reactive + explanatory + non-authoritative" requirement.

**Tone Rules:**
- Explains trade-offs, never prescribes
- Uses neutral language: "This configuration favors…"
- ❌ No imperative verbs ("You should", "You must")
- ✅ Always advisory, never enforcement

**Example Dialogue:**
```
Step Introduction: "Let's choose your movement system."
Selection Reaction: "Treads provide stability but reduce speed."
Trade-off: "This decision favors durability over agility."
```

---

### 2️⃣ Store Authority (GM Gate)
**Decision:** GM-configurable, default = NO approval required

Rationale: Respects different table styles without blocking solo play.

**World Setting:** `store.requireGMApproval` (boolean, default false)

**Behavior:**
- If false: Player finalizes droid → immediate save + credit deduction
- If true: Player finalizes droid → PENDING state → GM review → APPROVED/REJECTED
- Builder logic unchanged either way

---

### 3️⃣ Edit Permissions (Player-Owned Droids)
**Decision:** Yes, players may freely modify owned droids

Constraints:
- Edit always opens in **EDIT mode** (loads existing config)
- Cost delta calculated: `(new config cost) - (old config cost)`
- Auto-prune applies (if edit invalidates downstream steps)
- GM can lock droids via world setting or actor-level flag

**Rationale:** Respects player agency while honoring constraints.

---

### 4️⃣ History Tracking / Audit
**Decision:** Lightweight audit only (delta snapshots, GM-visible)

Do NOT implement full event sourcing.

**Model:**
```javascript
// In actor.system.droidSystems.buildHistory:
[
  {
    timestamp: "2026-02-10T15:30:00Z",
    action: "finalized" | "edited",
    before: { /* full config snapshot */ },
    after: { /* full config snapshot */ },
    costDelta: number  // if edited
  }
]
```

**Rationale:** Enough for trust + debugging, not a maintenance burden.

---

### 5️⃣ Template System (Preconfigured Droids)
**Decision:** Compendium-based, not hardcoded

**Architecture:**
- Create `droid-templates` compendium
- Templates = actors in that compendium
- Store UI: Browse compendium → Select template → Clone actor → Open builder in DRAFT mode

**Rationale:** You already have the abstraction. Enables GM customization. Store UI trivial.

---

### 6️⃣ Credit System Source of Truth
**Decision:** Actor currency (credits) is authoritative

Rules:
- ✅ Store checks affordability BEFORE opening builder
- ❌ Builder does NOT deduct credits
- ✅ Deduction happens on finalize
- ✅ Cost delta logic reused for edits

**Signature:**
```javascript
async onDroidFinalized(actor, config, costDelta) {
  // Store responsibility
  await PlayerEngine.spendCredits(actor, costDelta);
  await actor.update({ 'system.droidSystems.state': 'finalized' });
}
```

---

## Summary: 6 Decisions Locked

| Question | Decision | Override Path |
|----------|----------|---|
| **Seraphim voice** | Analyst-Mentor | No override (core design) |
| **Store gate** | GM-optional, default NO | World setting `store.requireGMApproval` |
| **Edit perms** | Players free, GM can lock | World/actor flag `droid.locked` |
| **Audit trail** | Lightweight snapshots | Optional world setting |
| **Templates** | Compendium-based | Enabled by default |
| **Credits** | Actor currency | No override (core design) |

All decisions are **non-negotiable for Phase 3a**, but GM/world settings allow table customization.

---

## X. Risk Surface (Phase 2 → Phase 3) — Mitigated

### Risk 1: Seraphim Creep ✅
**Problem:** Seraphim starts explaining rules → eventually enforcing them → becomes a validator.

**Mitigation:**
- ✅ Locked voice (Analyst-Mentor, never prescriptive)
- ✅ Code review rule: if Seraphim touches constraint logic, reject
- ✅ Builder remains sole authority on validation

### Risk 2: Store Fork ✅
**Problem:** Store implements its own item selection logic → diverges from builder.

**Mitigation:**
- ✅ Store uses `DroidBuilderApp.open(actor, options)` API
- ✅ Store does NOT reimplement step logic
- ✅ All validation goes through builder

### Risk 3: Persistent State Surprise ✅
**Problem:** Editing a finalized droid causes unexpected auto-prune or validation failure.

**Mitigation:**
- ✅ Locked state modes: DRAFT → FINALIZED → MODIFIED
- ✅ Auto-prune documented and tested
- ✅ Edit mode explicitly loads existing config

### Risk 4: Budget Calculation Divergence ✅
**Problem:** Store calculates cost differently than validation engine.

**Mitigation:**
- ✅ Single function: `DroidValidationEngine.calculateBudget()`
- ✅ Store calls same function for affordability check
- ✅ Cost delta logic reused everywhere

### Risk 5: Approval Flow Ambiguity ✅
**Problem:** Unclear who can approve droids, when approval is required, what states exist.

**Mitigation:**
- ✅ Locked world setting: `store.requireGMApproval` (default false)
- ✅ Explicit approval state model (DRAFT, PENDING, FINALIZED)
- ✅ Store behavior changes, builder does not

### Risk 6: Credit Economy Confusion ✅
**Problem:** Unclear how credits flow, when deduction happens, who owns the truth.

**Mitigation:**
- ✅ Locked authority: `actor.credits` is source of truth
- ✅ Deduction happens on finalize (not in builder)
- ✅ Cost delta logic for edits

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

