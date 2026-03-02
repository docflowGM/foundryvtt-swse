# Phase 2: StepController Helper Pattern

**Goal:** Avoid copy-paste across 7 identical step patterns (Locomotion, Manipulators, Sensors, Processor, Armor, Weapons, Accessories).

**Approach:** Design a reusable step controller that handles:
- Step navigation logic
- Item selection (radio vs checkbox)
- Validation + progression blocking
- Budget updates
- Back-navigation + auto-prune

---

## ❌ What We DON'T Want

```javascript
// BAD: Repeat this 7 times with minor tweaks
async _onLocomotionSelected(event) { /* ... */ }
async _onManipulatorSelected(event) { /* ... */ }
async _onSensorSelected(event) { /* ... */ }
async _onProcessorSelected(event) { /* ... */ }
// ... etc
```

This leads to:
- 7x the code
- 7x the bugs
- 7x the maintenance

---

## ✅ What We DO Want

```javascript
// GOOD: Unified step handling
class StepController {
  async onItemSelected(stepName, itemId) {
    // Handles selection for ANY step type
  }

  async onNextStep(currentStep, nextStep) {
    // Handles progression for ANY step
  }

  async onBackStep(previousStep) {
    // Handles back-nav + auto-prune for ANY step
  }
}

// Usage
this.stepController = new StepController(this.droidSystems, this.actor);
await this.stepController.selectItem('locomotion', 'wheels');
await this.stepController.nextStep('locomotion', 'manipulators');
```

---

## 🏗️ StepController Class Design

### File Location
`scripts/apps/step-controller.js`

### Constructor
```javascript
export class StepController {
  constructor(droidSystems, actor = null, catalog = {}) {
    this.droidSystems = droidSystems;  // Reference to builder state
    this.actor = actor;
    this.catalog = catalog;  // System catalogs (locomotion, processor, etc.)
    this.selectedItems = {};  // Tracks current selections per step
  }
}
```

---

## 📋 Step Configuration

Before using StepController, define step metadata:

```javascript
// droid-builder-app.js

static STEP_CONFIG = {
  locomotion: {
    label: 'Select Locomotion',
    stepNumber: 1,
    total: 8,
    selectionType: 'single',  // radio button
    required: true,
    mutation: 'droidSystems.locomotion',  // where to store selection
    validation: 'validateLocomotion'  // validation method
  },

  manipulators: {
    label: 'Select Manipulators',
    stepNumber: 2,
    total: 8,
    selectionType: 'multiple',  // checkboxes
    required: true,  // must have at least 1
    mutation: 'droidSystems.appendages',  // array
    validation: 'validateAppendages'
  },

  sensors: {
    label: 'Select Sensors',
    stepNumber: 3,
    total: 8,
    selectionType: 'multiple',
    required: false,  // can skip
    mutation: 'droidSystems.accessories',  // using accessories for optional systems
    validation: 'validateSensors'
  },

  processor: {
    label: 'Select Processor',
    stepNumber: 4,
    total: 8,
    selectionType: 'single',
    required: true,
    mutation: 'droidSystems.processor',
    validation: 'validateProcessor'
  },

  armor: {
    label: 'Select Armor',
    stepNumber: 5,
    total: 8,
    selectionType: 'single',
    required: true,
    mutation: 'droidSystems.armor',
    validation: 'validateArmor'
  },

  weapons: {
    label: 'Select Weapons',
    stepNumber: 6,
    total: 8,
    selectionType: 'multiple',
    required: false,
    mutation: 'droidSystems.weapons',
    validation: 'validateWeapons'
  },

  accessories: {
    label: 'Select Accessories',
    stepNumber: 7,
    total: 8,
    selectionType: 'multiple',
    required: false,
    mutation: 'droidSystems.accessories',
    validation: 'validateAccessories'
  }
};

static STEP_ORDER = ['locomotion', 'manipulators', 'sensors', 'processor', 'armor', 'weapons', 'accessories', 'review'];
```

---

## 🎯 Core Methods

### 1. selectItem()
Handle radio/checkbox selection

```javascript
/**
 * Select an item for the current step
 * @param {string} stepName - e.g., 'locomotion', 'manipulators'
 * @param {string|string[]} itemId - Single ID or array of IDs
 * @returns {Object} { success: boolean, error?: string }
 */
async selectItem(stepName, itemId) {
  const config = DroidBuilderApp.STEP_CONFIG[stepName];
  if (!config) {
    throw new Error(`Unknown step: ${stepName}`);
  }

  // For single-select steps (radio)
  if (config.selectionType === 'single') {
    const item = this.catalog[stepName]?.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: `Invalid ${stepName} ID: ${itemId}` };
    }

    // Update in-memory state
    this._setMutation(config.mutation, {
      id: item.id,
      name: item.name,
      cost: item.cost,
      ...(item.speed && { speed: item.speed }),
      ...(item.bonus && { bonus: item.bonus })
      // ... other item-specific fields
    });
  }

  // For multi-select steps (checkboxes)
  if (config.selectionType === 'multiple') {
    const itemIds = Array.isArray(itemId) ? itemId : [itemId];

    const items = itemIds.map(id => {
      const item = this.catalog[stepName]?.find(i => i.id === id);
      if (!item) {
        throw new Error(`Invalid ${stepName} ID: ${id}`);
      }
      return {
        id: item.id,
        name: item.name,
        cost: item.cost,
        ...this._extractItemProperties(item)
      };
    });

    // Update in-memory state
    this._setMutation(config.mutation, items);
  }

  // Recalculate budget
  this.droidSystems.credits = DroidValidationEngine.calculateBudget(
    this.droidSystems
  );

  return { success: true };
}

/**
 * Toggle an item in a multi-select step
 * @param {string} stepName
 * @param {string} itemId
 * @param {boolean} add - true to add, false to remove
 */
async toggleItem(stepName, itemId, add) {
  const config = DroidBuilderApp.STEP_CONFIG[stepName];
  if (config.selectionType !== 'multiple') {
    throw new Error(`Step ${stepName} is not multi-select`);
  }

  const current = this._getMutation(config.mutation) || [];
  let updated;

  if (add) {
    // Find item in catalog
    const item = this.catalog[stepName]?.find(i => i.id === itemId);
    if (!item) throw new Error(`Invalid item: ${itemId}`);

    // Check if already selected
    if (current.some(i => i.id === itemId)) {
      return { success: false, error: 'Already selected' };
    }

    // Add to array
    updated = [
      ...current,
      {
        id: item.id,
        name: item.name,
        cost: item.cost,
        ...this._extractItemProperties(item)
      }
    ];
  } else {
    // Remove from array
    updated = current.filter(i => i.id !== itemId);
  }

  this._setMutation(config.mutation, updated);

  // Recalculate budget
  this.droidSystems.credits = DroidValidationEngine.calculateBudget(
    this.droidSystems
  );

  return { success: true };
}
```

### 2. validateStep()
Block progression if invalid

```javascript
/**
 * Validate current step before allowing progression
 * @param {string} stepName
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
async validateStep(stepName) {
  const config = DroidBuilderApp.STEP_CONFIG[stepName];
  const validationMethod = config.validation;

  if (!DroidValidationEngine[validationMethod]) {
    throw new Error(`Unknown validation method: ${validationMethod}`);
  }

  const result = DroidValidationEngine[validationMethod](
    this._getMutation(config.mutation),
    this.droidSystems
  );

  return result;
}

/**
 * Check if progression is allowed
 */
async canAdvance(stepName) {
  const validation = await this.validateStep(stepName);
  return validation.valid;
}
```

### 3. nextStep()
Progression with validation

```javascript
/**
 * Attempt to advance to the next step
 * @param {string} currentStep
 * @param {string} nextStep
 * @returns {Object} { success: boolean, error?: string }
 */
async nextStep(currentStep, nextStep) {
  // Validate current step
  const validation = await this.validateStep(currentStep);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  // Check budget
  const budget = DroidValidationEngine.calculateBudget(this.droidSystems);
  if (budget.remaining < 0) {
    return {
      success: false,
      errors: ['Over budget']
    };
  }

  // Can proceed
  return { success: true };
}
```

### 4. backStep()
Backward navigation with auto-prune

```javascript
/**
 * Go back to previous step
 * If previous step is edited, auto-prune downstream selections
 */
async backStep(fromStep, toStep) {
  // Just record the back-nav for now
  // When user finishes editing previous step and clicks Next,
  // nextStep() will handle auto-prune

  return { success: true };
}

/**
 * Called when user goes back and edits a previous step, then clicks Next
 * Automatically remove downstream selections that become invalid
 */
async autoPruneDownstream(fromStep, toStep) {
  const fromConfig = DroidBuilderApp.STEP_CONFIG[fromStep];
  const fromMutation = this._getMutation(fromConfig.mutation);

  // Get all steps that come after 'fromStep'
  const stepOrder = DroidBuilderApp.STEP_ORDER;
  const fromIndex = stepOrder.indexOf(fromStep);
  const downstreamSteps = stepOrder.slice(fromIndex + 1);

  const prunedItems = [];

  // Check each downstream step for validity
  for (const step of downstreamSteps) {
    const config = DroidBuilderApp.STEP_CONFIG[step];
    const mutation = this._getMutation(config.mutation);

    // Skip if nothing selected
    if (!mutation || (Array.isArray(mutation) && mutation.length === 0)) {
      continue;
    }

    // Check validity
    const validation = await this.validateStep(step);
    if (!validation.valid) {
      // Auto-prune this step's selections
      this._setMutation(config.mutation,
        Array.isArray(mutation) ? [] : { id: '', name: '', cost: 0 }
      );
      prunedItems.push(step);
    }
  }

  return prunedItems;
}
```

### 5. Helper Methods (Private)

```javascript
/**
 * Get a value from droidSystems via dot notation
 * _getMutation('droidSystems.locomotion') → droidSystems.locomotion
 */
_getMutation(path) {
  const keys = path.split('.');
  let value = this.droidSystems;

  for (const key of keys) {
    if (key === 'droidSystems') continue;
    value = value?.[key];
  }

  return value;
}

/**
 * Set a value in droidSystems via dot notation
 */
_setMutation(path, value) {
  const keys = path.split('.');
  let target = this.droidSystems;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key === 'droidSystems') continue;
    if (!(key in target)) {
      target[key] = {};
    }
    target = target[key];
  }

  const lastKey = keys[keys.length - 1];
  target[lastKey] = value;
}

/**
 * Extract item properties common to most systems
 */
_extractItemProperties(item) {
  const props = {};
  if (item.speed !== undefined) props.speed = item.speed;
  if (item.bonus !== undefined) props.bonus = item.bonus;
  if (item.damage !== undefined) props.damage = item.damage;
  return props;
}
```

---

## 🔗 Usage in DroidBuilderApp

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

  async _onRender(context, options) {
    const root = this.element;

    // Single item selection handler for all steps
    root.querySelectorAll('input[name^="system-select"]').forEach(el => {
      el.addEventListener('change', this._onItemSelected.bind(this));
    });

    // Next/Back buttons
    root.querySelector('.next-step')?.addEventListener('click', this._onNext.bind(this));
    root.querySelector('.back-step')?.addEventListener('click', this._onBack.bind(this));
  }

  // Single handler for all item selections
  async _onItemSelected(event) {
    const { step } = event.target.dataset;
    const itemId = event.target.value;

    const result = await this.stepController.selectItem(step, itemId);
    if (!result.success) {
      ui.notifications.error(result.error);
      return;
    }

    // Re-render to show budget update
    await this.render(false);
  }

  // Single handler for all "Next" clicks
  async _onNext(event) {
    event.preventDefault();

    const nextStepName = this._getNextStepName(this.currentStep);
    if (!nextStepName) return;

    // If coming from a back-edit, auto-prune downstream
    if (this.comeFromBack) {
      const prunedSteps = await this.stepController.autoPruneDownstream(
        this.currentStep,
        nextStepName
      );
      if (prunedSteps.length > 0) {
        ui.notifications.info(
          `${prunedSteps.length} step(s) cleared due to incompatibility.`
        );
      }
      this.comeFromBack = false;
    }

    // Validate and advance
    const canAdvance = await this.stepController.canAdvance(this.currentStep);
    if (!canAdvance) {
      const validation = await this.stepController.validateStep(this.currentStep);
      ui.notifications.error(validation.errors.join('; '));
      return;
    }

    // Advance
    this.currentStep = nextStepName;
    await this.render(true);
  }

  // Single handler for all "Back" clicks
  async _onBack(event) {
    event.preventDefault();

    const prevStepName = this._getPrevStepName(this.currentStep);
    if (!prevStepName) return;

    this.currentStep = prevStepName;
    this.comeFromBack = true;  // Flag to trigger auto-prune on next Next
    await this.render(true);
  }

  _getNextStepName(current) {
    const order = DroidBuilderApp.STEP_ORDER;
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  }

  _getPrevStepName(current) {
    const order = DroidBuilderApp.STEP_ORDER;
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  }
}
```

---

## 🎨 Template Simplification

Instead of 7 step templates, use one shared template with data-driven rendering:

```handlebars
{{#if (eq this.currentStep 'locomotion')}}
  {{> step-selector
    stepName='locomotion'
    stepConfig=this.stepConfig.locomotion
    availableItems=this.availableLocomotion
    selectedItem=this.droidSystems.locomotion
    budget=this.budget
    selectionType='single'
  }}
{{/if}}

{{#if (eq this.currentStep 'manipulators')}}
  {{> step-selector-multi
    stepName='manipulators'
    stepConfig=this.stepConfig.manipulators
    availableItems=this.availableManipulators
    selectedItems=this.droidSystems.appendages
    budget=this.budget
  }}
{{/if}}

<!-- Repeat for each step -->
```

Or even better, use a single template:

```handlebars
{{> step-selector
  currentStep=this.currentStep
  config=this.getStepConfig
  availableItems=this.getAvailableItems
  selectedItems=this.getSelectedItems
  budget=this.budget
}}
```

---

## ✅ Benefits of StepController

| Benefit | How |
|---------|-----|
| **No duplication** | One implementation for all 7 steps |
| **Consistent behavior** | All steps follow same rules |
| **Easy to test** | StepController can be tested independently |
| **Easy to debug** | Centralized validation/mutation logic |
| **Easy to extend** | Add new system type = add to STEP_CONFIG |
| **Reduced bugs** | Less code = fewer bugs |

---

## 📝 Implementation Order

1. **Phase 2 Step 1:** Code StepController
2. **Phase 2 Step 2:** Implement Locomotion using StepController
3. **Phase 2 Steps 3-7:** Implement remaining steps (nearly identical)
4. **Phase 2 Step 8:** Review + Finalize

This guarantees:
- Step 2+ have 80% less code than Step 1
- All steps behave identically
- Pattern is proven on first step before scaling

---

## Notes

- StepController is **not** an application—it's a helper.
- It operates on in-memory droidSystems only.
- Actor mutation happens only in final `_onFinalizeDroid()`.
- StepController can be extracted to its own file if it grows large.
- Catalog can move to config file later without changing StepController.
