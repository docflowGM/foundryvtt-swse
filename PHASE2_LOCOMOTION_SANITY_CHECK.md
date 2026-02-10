# Phase 2 Sanity Check: Locomotion Step Complete Data Flow

**Purpose:** Validate the complete pattern (schema → UI → validation → mutation) for one step before scaling.

---

## 1️⃣ Schema (actor.system.droidSystems.locomotion)

```javascript
// From character-data-model.js

locomotion: new fields.SchemaField({
  id: new fields.StringField({ required: true, initial: '' }),
  name: new fields.StringField({ required: true, initial: '' }),
  cost: new fields.NumberField({ required: true, initial: 0 }),
  speed: new fields.NumberField({ required: true, initial: 0 })
})
```

**Questions to answer:**

1. ✅ Is this the right home for locomotion data?
   - Yes. First-class document data, not flags.

2. ⚠️ Should locomotion have prerequisites / restrictions?
   - Current: No
   - Consider: Tiny droids can't use certain locomotion types?
   - Decision: **For Phase 2, no restrictions.** Add in Phase 3+ if needed.

3. ⚠️ Should we track "chassis" separately?
   - Current: Locomotion = locomotion system only
   - Chassis was degree-based in Phase 1 (now implicit)
   - Decision: **Don't split.** Locomotion is the chassis for Phase 2.

**Schema VERDICT: ✅ Correct as-is**

---

## 2️⃣ Available Items (Catalog)

Where does this data live? **Options:**

### Option A: Hardcoded in builder
```javascript
// droid-builder-app.js
static LOCOMOTION_OPTIONS = [
  { id: "treads", name: "Treads", cost: 200, speed: 20 },
  { id: "wheels", name: "Wheels", cost: 150, speed: 25 },
  // ...
]
```

### Option B: From compendium / config
```javascript
// Load from game.system.config.locomotion
const options = game.system.config.droidLocomotion;
```

### Option C: From actor's system data
```javascript
// Load from this.actor.system.locomotionCatalog
const options = this.actor.system.locomotionCatalog;
```

**RECOMMENDATION: Option A (hardcoded in builder) for Phase 2**

Why:
- Phase 1 proved actor is already created
- Catalog is small and stable (not user-editable)
- Avoids compendium / config loading complexity
- Scalable: if catalog grows, move to Option B in Phase 3+

**Implementation:**

```javascript
// droid-builder-app.js

export class DroidBuilderApp extends SWSEApplication {
  // Static catalog (all system types, reusable across builder)
  static SYSTEM_CATALOG = {
    locomotion: [
      { id: "treads", name: "Treads", cost: 200, speed: 20 },
      { id: "wheels", name: "Wheels", cost: 150, speed: 25 },
      { id: "legs", name: "Legs", cost: 300, speed: 20 },
      { id: "hover", name: "Hover Repulsors", cost: 450, speed: 30 },
      { id: "flight", name: "Flight Servos", cost: 600, speed: 40 }
    ],
    processor: [ /* ... */ ],
    // ... etc
  };

  async _prepareContext(options) {
    const context = super._prepareContext(options);

    // For each step, pass relevant catalog
    if (this.currentStep === 'locomotion') {
      context.availableLocomotion = DroidBuilderApp.SYSTEM_CATALOG.locomotion;
    }

    return context;
  }
}
```

**Catalog VERDICT: ✅ Hardcode for Phase 2**

---

## 3️⃣ UI State (droid-builder.hbs)

For Locomotion step:

```handlebars
{{#if (eq this.currentStep 'locomotion')}}
  <div class="step-locomotion">
    <h2>Step 2/8: Select Locomotion</h2>

    <!-- Step info -->
    <p>Degree: {{this.droidSystems.degree}} | Size: {{this.droidSystems.size}}</p>

    <!-- Budget bar -->
    {{> budget-bar this.budget}}

    <!-- Available items (radio buttons) -->
    <div class="locomotive-selection">
      {{#each this.availableLocomotion}}
        {{#if (gte ../this.budget.remaining this.cost)}}
          <label class="option-item">
            <input type="radio"
                   name="locomotion-select"
                   value="{{this.id}}"
                   {{#if (eq ../this.droidSystems.locomotion.id this.id)}}checked{{/if}}
                   data-cost="{{this.cost}}"
                   data-id="{{this.id}}"
                   data-name="{{this.name}}"
                   data-speed="{{this.speed}}" />
            <span class="item-name">{{this.name}}</span>
            <span class="item-detail">Speed: {{this.speed}}</span>
            <span class="item-cost">[{{this.cost}} credits]</span>
          </label>
        {{else}}
          <label class="option-item disabled">
            <input type="radio" disabled />
            <span class="item-name">{{this.name}}</span>
            <span class="item-detail">Speed: {{this.speed}}</span>
            <span class="item-cost">[{{this.cost}} credits] ✗</span>
            <span class="disabled-reason">Insufficient credits</span>
          </label>
        {{/if}}
      {{/each}}
    </div>

    <!-- Selected item -->
    {{#if this.droidSystems.locomotion.id}}
      <div class="selected-summary">
        <strong>Selected:</strong> {{this.droidSystems.locomotion.name}} ({{this.droidSystems.locomotion.cost}} credits)
      </div>
    {{/if}}

    <!-- Actions -->
    <div class="step-actions">
      <button class="back-step btn btn-secondary" {{#unless this.canGoBack}}disabled{{/unless}}>
        ← Back
      </button>
      <button class="next-step btn btn-primary" {{#unless this.droidSystems.locomotion.id}}disabled{{/unless}}>
        Next →
      </button>
    </div>
  </div>
{{/if}}
```

**UI VERDICT: ✅ Standard radio button pattern, proven in Phase 1**

---

## 4️⃣ Validation Rules (DroidValidationEngine)

### Hard Validation (Blocks progression)

```javascript
// droid-validation-engine.js

static validateLocomotion(locomotion, droidSystems) {
  const errors = [];

  // Required
  if (!locomotion?.id) {
    errors.push('Locomotion system required');
  }

  // Cost check
  const budget = this.calculateBudget(droidSystems);
  if (locomotion.cost > budget.remaining) {
    errors.push(
      `Locomotion cost (${locomotion.cost}) exceeds remaining budget (${budget.remaining})`
    );
  }

  // Validity check
  if (locomotion.id && !this._isValidLocomotion(locomotion.id)) {
    errors.push(`Unknown locomotion ID: ${locomotion.id}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

static _isValidLocomotion(id) {
  return DroidBuilderApp.SYSTEM_CATALOG.locomotion.some(l => l.id === id);
}
```

### Soft Warnings (Informational only)

```javascript
// For future use: "wheels might slow droid down" etc.
// Not implemented in Phase 2.
```

**Validation VERDICT: ✅ Pure function, reusable, hard + soft ready**

---

## 5️⃣ Mutation Flow (droid-builder-app.js)

### User Selection → In-Memory Update

```javascript
export class DroidBuilderApp extends SWSEApplication {

  async _onLocomotionSelected(event) {
    const id = event.target.value;
    const locomotionItem = DroidBuilderApp.SYSTEM_CATALOG.locomotion
      .find(l => l.id === id);

    if (!locomotionItem) {
      ui.notifications.error('Invalid locomotion selection');
      return;
    }

    // Update in-memory state ONLY
    this.droidSystems.locomotion = {
      id: locomotionItem.id,
      name: locomotionItem.name,
      cost: locomotionItem.cost,
      speed: locomotionItem.speed
    };

    // Recalculate budget
    this.droidSystems.credits = DroidValidationEngine.calculateBudget(
      this.droidSystems
    );

    // Re-render to show budget update
    await this.render(false);  // false = don't refresh context, just DOM
  }

  async _onNextStep(event) {
    event.preventDefault();

    if (this.currentStep === 'locomotion') {
      // Validate
      const validation = DroidValidationEngine.validateLocomotion(
        this.droidSystems.locomotion,
        this.droidSystems
      );

      if (!validation.valid) {
        ui.notifications.error(validation.errors.join('; '));
        return;
      }

      // Advance
      this.currentStep = 'manipulators';
      await this.render(true);  // true = refresh context
    }
  }

  async _onBackStep(event) {
    event.preventDefault();

    if (this.currentStep === 'manipulators') {
      this.currentStep = 'intro';  // or 'locomotion' if multi-step intro
      await this.render(true);
    }
  }
}
```

**Mutation VERDICT: ✅ In-memory only until final "Finalize" button**

---

## 6️⃣ Back-Navigation Auto-Prune (Future: Phase 2 Part 2)

### Scenario: User goes back to Locomotion and changes it

Current flow:
1. User at "Manipulators" step
2. Clicks "Back"
3. Returns to "Locomotion"
4. Changes from "Wheels" to "Flight"
5. Clicks "Next"

**Prune logic needed:**

```javascript
// If new Locomotion cost changes budget significantly,
// check if downstream selections still fit

async _onNextAfterBackEdit(fromStep) {
  // Validate current step
  const validation = DroidValidationEngine.validateLocomotion(...);
  if (!validation.valid) return;

  // Recalculate budget with new locomotion
  this.droidSystems.credits = DroidValidationEngine.calculateBudget(
    this.droidSystems
  );

  // Check if downstream selections still fit
  const pruneable = this._checkDownstreamValidity(fromStep);
  if (pruneable.length > 0) {
    // Auto-prune + notify
    this._autoPruneDownstream(pruneable);
    ui.notifications.info(
      `${pruneable.length} selection(s) removed due to budget change.`
    );
  }

  // Advance
  this.currentStep = 'manipulators';
  await this.render(true);
}

_checkDownstreamValidity(fromStep) {
  // Check all downstream selections against current budget
  const budget = this.droidSystems.credits.remaining;
  const invalid = [];

  // Example: If manipulators now exceed budget
  this.droidSystems.appendages?.forEach(a => {
    if (a.cost > budget) {
      invalid.push(a.id);
    }
  });

  return invalid;
}
```

**Auto-Prune VERDICT: ✅ Design ready, implement after Step 1-2 core logic works**

---

## 7️⃣ Integration Test: Complete Locomotion Flow

```javascript
// Test: User selects Wheels, advances to Manipulators, then goes back and changes to Flight

// 1. Load builder with new droid
const builder = new DroidBuilderApp(droidActor);
builder.render(true);

// 2. Current step should be 'intro'
assert(builder.currentStep === 'intro');
assert(builder.droidSystems.locomotion.id === '');

// 3. Select "Wheels" (cost: 150)
builder.droidSystems.locomotion = {
  id: 'wheels', name: 'Wheels', cost: 150, speed: 25
};
builder.droidSystems.credits.spent += 150;
builder.droidSystems.credits.remaining -= 150;

// 4. Click Next
await builder._onNextStep({ preventDefault: () => {} });
assert(builder.currentStep === 'manipulators');

// 5. Go Back
await builder._onBackStep({ preventDefault: () => {} });
assert(builder.currentStep === 'locomotion');

// 6. Change to "Flight" (cost: 600, delta: +450)
builder.droidSystems.locomotion = {
  id: 'flight', name: 'Flight Servos', cost: 600, speed: 40
};
// Budget recalculates: remaining decreased by +450

// 7. Click Next (triggers auto-prune if needed)
await builder._onNextStep({ preventDefault: () => {} });
// If remaining budget is now insufficient for previously selected manipulators,
// they are pruned + user notified

assert(builder.currentStep === 'manipulators');
```

**Integration Test VERDICT: ✅ Pattern is testable end-to-end**

---

## 🚨 Decision Points for Phase 2 Implementation

Before you code Locomotion, confirm:

| Question | Status | Decision |
|----------|--------|----------|
| Schema is correct | ✅ | Locked: Use as-is |
| Catalog lives in builder | ✅ | Phase 2: Hardcode, move to config in Phase 3+ |
| Radio button UI pattern | ✅ | Locked: Proven in Phase 1 |
| Validation is pure functions | ✅ | Locked: DroidValidationEngine |
| In-memory mutation only | ✅ | Locked: Until final Finalize |
| Budget recalculates per step | ✅ | Phase 2: Implement |
| Back-nav invalidation | ⏳ | Phase 2 Part 2: After core steps work |
| Auto-prune on back-edit | ⏳ | Phase 2 Part 2: After core steps work |

**VERDICT: ✅ Locomotion pattern is sound. Safe to code.**

---

## What Gets Code-Reviewed

When you implement Locomotion:

1. ✅ Event binding in `_onRender()`
2. ✅ `_onLocomotionSelected()` — in-memory update + budget recalc
3. ✅ `_onNextStep()` — validation + progression
4. ✅ Template rendering — radio button state
5. ✅ Integration — selection → validation → Next works

Everything else (Manipulators, Sensors, etc.) follows the same pattern.

**Once Locomotion is proven, you have the template for 6 more steps.**
