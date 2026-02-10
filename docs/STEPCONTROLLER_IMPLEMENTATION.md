# StepController Implementation

**Phase 2 Step 1: Reusable step navigation and validation helper**

This document describes the StepController and how each Phase 2 step will use it.

---

## Overview

StepController is a pure helper (not an application) that handles all common patterns for multi-step builders:

- **Step Lifecycle**: Register, navigate, validate
- **Item Selection**: Radio buttons (single-select) and checkboxes (multi-select)
- **Budget Enforcement**: Track spending, prevent over-budget additions
- **Back-Navigation Invalidation**: Auto-prune downstream selections when prior steps change
- **Validation Plumbing**: Call step-specific validators, distinguish hard vs soft validation

All state lives in `actor.system.droidSystems` (in-memory copy). The actor is mutated **only** on final finalization.

---

## File Location

```
scripts/apps/step-controller.js
```

Export:
```javascript
export class StepController { ... }
```

---

## Integration Pattern (DroidBuilderApp)

### 1. Step Configuration

Define all steps once in DroidBuilderApp:

```javascript
// droid-builder-app.js

export class DroidBuilderApp extends SWSEApplication {

  // Static step metadata
  static STEP_CONFIG = {
    locomotion: {
      label: 'Select Locomotion',
      stepNumber: 1,
      total: 8,
      selectionType: 'single',    // radio button
      required: true,
      mutation: 'locomotion',      // path: droidSystems.locomotion
      validation: 'validateLocomotion'
    },

    manipulators: {
      label: 'Select Manipulators',
      stepNumber: 2,
      total: 8,
      selectionType: 'multiple',   // checkboxes
      required: true,
      mutation: 'appendages',      // path: droidSystems.appendages
      validation: 'validateAppendages'
    },

    sensors: {
      label: 'Select Sensors',
      stepNumber: 3,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'sensors',         // NEW: droidSystems.sensors
      validation: 'validateSensors'
    },

    processor: {
      label: 'Select Processor',
      stepNumber: 4,
      total: 8,
      selectionType: 'single',
      required: true,
      mutation: 'processor',
      validation: 'validateProcessor'
    },

    armor: {
      label: 'Select Armor',
      stepNumber: 5,
      total: 8,
      selectionType: 'single',
      required: true,
      mutation: 'armor',           // NEW: droidSystems.armor
      validation: 'validateArmor'
    },

    weapons: {
      label: 'Select Weapons',
      stepNumber: 6,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'weapons',         // NEW: droidSystems.weapons
      validation: 'validateWeapons'
    },

    accessories: {
      label: 'Select Accessories',
      stepNumber: 7,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'accessories',
      validation: 'validateAccessories'
    }
  };

  static STEP_ORDER = [
    'locomotion', 'manipulators', 'sensors', 'processor', 'armor', 'weapons', 'accessories', 'review'
  ];

  // System catalogs (loaded from compendiums or config)
  static SYSTEM_CATALOG = {
    locomotion: [ /* items */ ],
    manipulators: [ /* items */ ],
    sensors: [ /* items */ ],
    processor: [ /* items */ ],
    armor: [ /* items */ ],
    weapons: [ /* items */ ],
    accessories: [ /* items */ ]
  };
}
```

### 2. Initialize StepController in Constructor

```javascript
export class DroidBuilderApp extends SWSEApplication {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.droidSystems = this._initializeDroidSystems();
    this.currentStep = 'intro';

    // Initialize StepController
    this.stepController = new StepController(
      this.droidSystems,
      this.actor,
      DroidBuilderApp.SYSTEM_CATALOG
    );
  }
}
```

### 3. Event Handler Example (Single-Select Step)

```javascript
// Locomotion selection handler
async _onLocomotionSelected(event) {
  event.preventDefault();

  const itemId = event.target.value;
  const config = DroidBuilderApp.STEP_CONFIG.locomotion;

  // Use StepController to select item
  const result = await this.stepController.selectItem(
    'locomotion',
    itemId,
    config
  );

  if (!result.success) {
    ui.notifications.error(result.error);
    return;
  }

  // Re-render to show budget update
  await this.render(false);
}
```

### 4. Event Handler Example (Multi-Select Step)

```javascript
// Manipulator toggle handler
async _onManipulatorToggled(event) {
  event.preventDefault();

  const itemId = event.target.value;
  const add = event.target.checked;
  const config = DroidBuilderApp.STEP_CONFIG.manipulators;

  // Use StepController to toggle item
  const result = await this.stepController.toggleItem(
    'manipulators',
    itemId,
    add,
    config
  );

  if (!result.success) {
    ui.notifications.error(result.error);
    return;
  }

  await this.render(false);
}
```

### 5. Progression Handler (Next Button)

```javascript
async _onNext(event) {
  event.preventDefault();

  // Get current and next step
  const nextStepName = this._getNextStepName(this.currentStep);
  if (!nextStepName) return;

  const currentConfig = DroidBuilderApp.STEP_CONFIG[this.currentStep];
  const validationFn = this._getValidationFunction(this.currentStep);

  // Validate and advance
  const result = await this.stepController.nextStep(
    this.currentStep,
    nextStepName,
    validationFn,
    currentConfig,
    DroidBuilderApp.STEP_ORDER
  );

  if (!result.success) {
    ui.notifications.error(result.errors.join('; '));
    return;
  }

  // Handle auto-pruning if needed
  if (result.prunedSteps?.length > 0) {
    ui.notifications.info(
      `${result.prunedSteps.length} selection(s) removed due to incompatibility.`
    );
  }

  // Advance
  this.currentStep = nextStepName;
  await this.render(true);
}
```

### 6. Back Button Handler

```javascript
async _onBack(event) {
  event.preventDefault();

  const prevStepName = this._getPrevStepName(this.currentStep);
  if (!prevStepName) return;

  // Simple navigation; auto-prune happens on next Next
  await this.stepController.backStep(this.currentStep, prevStepName);

  this.currentStep = prevStepName;
  await this.render(true);
}
```

---

## Validation Function Pattern

Each step defines its own validation function. Called by StepController, returns structured result.

### Signature

```javascript
/**
 * @param {*} selectedValue - The value selected for this step (from droidSystems)
 * @param {Object} droidSystems - Full droid configuration
 * @param {Object} config - Step configuration
 * @returns {Object} { errors: string[], warnings: string[] }
 */
function validateLocomotion(selectedValue, droidSystems, config) {
  const errors = [];
  const warnings = [];

  // Hard validation (blocks progression)
  if (!selectedValue?.id) {
    errors.push('Locomotion is required');
  }

  // Soft validation (warning only)
  if (selectedValue?.cost > 500) {
    warnings.push('High-cost locomotion may limit budget for other systems');
  }

  return { errors, warnings };
}
```

### Add to DroidValidationEngine

```javascript
// droid-validation-engine.js

export class DroidValidationEngine {
  static validateLocomotion(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    if (!selectedValue?.id) {
      errors.push('Locomotion is required');
    }

    return { errors, warnings };
  }

  static validateAppendages(selectedValue, droidSystems, config) {
    const errors = [];
    const warnings = [];

    // selectedValue is an array for multi-select
    if (!Array.isArray(selectedValue) || selectedValue.length === 0) {
      errors.push('At least one manipulator is required');
    }

    // Check degree constraint
    const maxByDegree = {
      'Third-Degree': 4,
      'Second-Degree': 6,
      'First-Degree': 8
    };

    const max = maxByDegree[droidSystems.degree];
    if (selectedValue?.length > max) {
      errors.push(
        `${droidSystems.degree} droids can have at most ${max} manipulators`
      );
    }

    return { errors, warnings };
  }

  // ... Similar pattern for all 7 steps
}
```

---

## Template Data Contract

StepController exposes data for templates via getter methods:

```javascript
// In DroidBuilderApp._prepareContext()

async _prepareContext(options) {
  const context = {
    actor: this.actor,
    currentStep: this.currentStep,
    droidSystems: this.droidSystems
  };

  // Get step-specific data from controller
  const config = DroidBuilderApp.STEP_CONFIG[this.currentStep];
  if (config) {
    context.stepConfig = config;
    context.selectedItems = this.stepController.getSelected(config);
    context.availableItems = this.stepController.getAvailable(this.currentStep);
    context.budget = this.stepController.getBudget();

    // Check each item's affordability
    context.availableItems = context.availableItems.map(item => ({
      ...item,
      canAfford: this.stepController.canAddItem(item)
    }));
  }

  return context;
}
```

### Template Usage (Generic, Data-Driven)

```handlebars
<!-- Single-select step (radio buttons) -->
{{#if (eq config.selectionType "single")}}
  <div class="step-selector-single">
    {{#each availableItems as |item|}}
      <label class="item-row">
        <input
          type="radio"
          name="step-select"
          value="{{item.id}}"
          {{#if (eq selectedItems.id item.id)}}checked{{/if}}
          {{#unless item.canAfford}}disabled{{/unless}}
          data-step="{{currentStep}}"
        />
        <span class="item-name">{{item.name}}</span>
        <span class="item-cost">[{{item.cost}} credits]</span>
        {{#unless item.canAfford}}
          <span class="item-unavailable">✗ Insufficient credits</span>
        {{/unless}}
      </label>
    {{/each}}
  </div>
{{/if}}

<!-- Multi-select step (checkboxes) -->
{{#if (eq config.selectionType "multiple")}}
  <div class="step-selector-multi">
    <div class="selected-summary">
      Selected: {{selectedItems.length}}/{{config.maxAllowed}}
    </div>
    {{#each availableItems as |item|}}
      <label class="item-row">
        <input
          type="checkbox"
          value="{{item.id}}"
          {{#if (find selectedItems "id" item.id)}}checked{{/if}}
          {{#unless item.canAfford}}disabled{{/unless}}
          data-step="{{currentStep}}"
        />
        <span class="item-name">{{item.name}}</span>
        <span class="item-cost">[{{item.cost}} credits]</span>
      </label>
    {{/each}}
  </div>
{{/if}}

<!-- Budget display (same for all steps) -->
<div class="budget-bar">
  <div class="budget-text">
    Credits Spent: {{budget.spent}} / {{budget.total}}
    {{#if (gte budget.remaining 0)}}
      <span class="budget-remaining">Remaining: {{budget.remaining}}</span>
    {{else}}
      <span class="budget-over">OVER BUDGET: {{math budget.remaining "*" -1}} credits</span>
    {{/if}}
  </div>
  <div class="budget-bar-visual">
    <div class="spent-bar" style="width: {{math budget.spent "/" budget.total "*" 100}}%"></div>
  </div>
</div>
```

---

## How Validation Flows

### 1. User Selects Item
```
_onItemSelected(event)
  ↓
stepController.selectItem() / toggleItem()
  ↓
Budget recalculated
  ↓
render(false) → _prepareContext() → template
```

### 2. User Clicks Next
```
_onNext(event)
  ↓
stepController.nextStep(
  currentStep,
  nextStep,
  validationFn,
  config,
  stepOrder
)
  ↓
Calls validationFn(selected, droidSystems, config)
  ↓
If errors → return failure, stay on step
  ↓
Check budget
  ↓
Check downstream validity (for auto-prune)
  ↓
If all ok → return success
  ↓
Advance to nextStep
```

### 3. User Clicks Back
```
_onBack(event)
  ↓
stepController.backStep()
  ↓
Go to previous step, user can re-edit
  ↓
When user clicks Next again:
  ↓
Auto-prune detects downstream invalid selections
  ↓
Clear those selections, notify user
  ↓
Proceed to next step
```

---

## Key Design Decisions

### 1. No Async Validation (Yet)

Validation functions are currently synchronous. This works for SWSE droid rules. If async validation becomes needed (e.g., checking compendium items), add:

```javascript
async validateStep(stepName, validationFn, config) {
  // ... add await before validationFn call
}
```

### 2. Mutation Path as String

Instead of callbacks or complex config, use dot-notation path:

```javascript
config.mutation = 'locomotion'     // → droidSystems.locomotion
config.mutation = 'appendages'     // → droidSystems.appendages
```

This keeps config flat and testable.

### 3. Budget Not Enforced on Selection (Yet)

Currently, StepController allows adding items that exceed budget, then flags them as over-budget on next validation. This lets users explore and then fix it.

If stricter behavior is wanted:
```javascript
async selectItem(stepName, itemId, config) {
  // Add: if (!this.canAddItem(item)) return error
  const item = catalogItems.find(i => i.id === itemId);
  if (!this.canAddItem(item)) {
    return { success: false, error: 'Insufficient credits' };
  }
  // ... continue
}
```

### 4. Auto-Prune Notification

Currently returns list of pruned steps to caller. Caller decides notification:

```javascript
if (result.prunedSteps?.length > 0) {
  ui.notifications.info(`Cleared ${result.prunedSteps.length} incompatible selection(s).`);
}
```

---

## Testing StepController (Pseudo-code)

```javascript
// Initialize
const droidSystems = {
  degree: 'Second-Degree',
  size: 'Medium',
  locomotion: {},
  appendages: [],
  processor: {},
  armor: {},
  weapons: [],
  accessories: [],
  sensors: [],
  credits: { total: 2000, spent: 0, remaining: 2000 }
};

const catalog = {
  locomotion: [
    { id: 'wheels', name: 'Wheels', cost: 150, speed: 25 }
  ],
  manipulators: [
    { id: 'hand', name: 'Hand', cost: 150, dexBonus: 1 }
  ]
  // ... etc
};

const controller = new StepController(droidSystems, null, catalog);

// Test: Select single-item step
const selectResult = await controller.selectItem('locomotion', 'wheels', {
  selectionType: 'single',
  mutation: 'locomotion'
});

console.assert(selectResult.success);
console.assert(droidSystems.locomotion.id === 'wheels');
console.assert(controller.getBudget().spent === 150);

// Test: Toggle multi-select
const toggleResult = await controller.toggleItem('manipulators', 'hand', true, {
  selectionType: 'multiple',
  mutation: 'appendages'
});

console.assert(toggleResult.success);
console.assert(droidSystems.appendages.length === 1);
console.assert(controller.getBudget().spent === 300);

// Test: Validation
const validationResult = await controller.validateStep(
  'locomotion',
  DroidValidationEngine.validateLocomotion,
  { mutation: 'locomotion' }
);

console.assert(validationResult.valid);
```

---

## Next: Locomotion Implementation

Once StepController is approved:

1. **Create Locomotion Catalog** - Add items to SYSTEM_CATALOG
2. **Implement Locomotion Handlers** - `_onLocomotionSelected`, validation
3. **Test Locomotion Flow** - Select, validate, next, back
4. **Repeat for Steps 2-7** - Each step follows same pattern

Each subsequent step will have ~95% less code (just catalog + validation fn + template).

---

## Files to Modify

- ✅ `scripts/apps/step-controller.js` — **NEW** StepController class
- `scripts/apps/droid-builder-app.js` — Add STEP_CONFIG, SYSTEM_CATALOG, handlers
- `scripts/engine/droid-validation-engine.js` — Add validation methods for each step
- `templates/apps/droid-builder.hbs` — Update template for generic step rendering

---

## Success Criteria (Phase 2 Step 1)

After StepController:

- ✅ Reusable across all 7 steps
- ✅ No duplication of navigation logic
- ✅ Supports single + multi-select
- ✅ Budget tracking built-in
- ✅ Back-nav invalidation ready
- ✅ Pure validation plumbing (app provides functions)
- ✅ AppV2-compliant (works with _prepareContext + _onRender)
- ✅ Ready for Locomotion step to plug in immediately

🚀 Ready for Phase 2 Step 2: Locomotion Implementation
