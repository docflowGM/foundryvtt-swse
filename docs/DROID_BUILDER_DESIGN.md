# Droid Builder Rewrite Design (AppV2-Compliant)

**Status:** Design Phase (No code written yet)
**Template:** Vehicle Builder (Marl) — proven AppV2 pattern
**Critical Fix:** Droid systems → `actor.system.droidSystems` (not flags)

---

## 1. DATA SCHEMA: `actor.system.droidSystems`

Droid systems must be **first-class document data**, not flags.

### Schema Definition

```javascript
// In character-data-model.js, add to defineSchema():

droidSystems: new fields.SchemaField({
  // Core droid identity
  degree: new fields.StringField({
    required: true,
    initial: '',
    choices: ['Third-Degree', 'Second-Degree', 'First-Degree']
  }),
  size: new fields.StringField({
    required: true,
    initial: 'Medium',
    choices: ['Tiny', 'Small', 'Medium', 'Large', 'Huge']
  }),

  // Primary systems (exactly one of each required)
  locomotion: new fields.SchemaField({
    id: new fields.StringField({ required: true, initial: '' }),
    name: new fields.StringField({ required: true, initial: '' }),
    cost: new fields.NumberField({ required: true, initial: 0 }),
    speed: new fields.NumberField({ required: true, initial: 0 })
  }),

  processor: new fields.SchemaField({
    id: new fields.StringField({ required: true, initial: '' }),
    name: new fields.StringField({ required: true, initial: '' }),
    cost: new fields.NumberField({ required: true, initial: 0 }),
    bonus: new fields.NumberField({ required: true, initial: 0 }) // Skill point bonus
  }),

  // Array systems
  appendages: new fields.ArrayField(
    new fields.SchemaField({
      id: new fields.StringField({ required: true, initial: '' }),
      name: new fields.StringField({ required: true, initial: '' }),
      type: new fields.StringField({ required: true, initial: '' }), // 'arm', 'leg', 'sensor'
      cost: new fields.NumberField({ required: true, initial: 0 })
    }),
    { required: true, initial: [] }
  ),

  accessories: new fields.ArrayField(
    new fields.SchemaField({
      id: new fields.StringField({ required: true, initial: '' }),
      name: new fields.StringField({ required: true, initial: '' }),
      cost: new fields.NumberField({ required: true, initial: 0 })
    }),
    { required: true, initial: [] }
  ),

  // Enhancements (optional upgrades to primary systems)
  locomotionEnhancements: new fields.ArrayField(
    new fields.SchemaField({
      id: new fields.StringField({ required: true, initial: '' }),
      name: new fields.StringField({ required: true, initial: '' }),
      cost: new fields.NumberField({ required: true, initial: 0 })
    }),
    { required: true, initial: [] }
  ),

  appendageEnhancements: new fields.ArrayField(
    new fields.SchemaField({
      id: new fields.StringField({ required: true, initial: '' }),
      name: new fields.StringField({ required: true, initial: '' }),
      cost: new fields.NumberField({ required: true, initial: 0 })
    }),
    { required: true, initial: [] }
  ),

  // Budget tracking
  credits: new fields.SchemaField({
    total: new fields.NumberField({ required: true, initial: 0 }),
    spent: new fields.NumberField({ required: true, initial: 0 }),
    remaining: new fields.NumberField({ required: true, initial: 0 })
  }),

  skillPoints: new fields.SchemaField({
    total: new fields.NumberField({ required: true, initial: 0 }),
    spent: new fields.NumberField({ required: true, initial: 0 }),
    remaining: new fields.NumberField({ required: true, initial: 0 })
  })
}),
```

---

## 2. VALIDATION LAYER (Pure Functions)

These must be **reusable outside the builder** (actor sheets, programmatic creation, etc.).

### `scripts/engine/droid-validation-engine.js` (NEW FILE)

```javascript
/**
 * Droid validation service layer
 * Pure functions that can be called from builder, actor sheets, or anywhere
 */

export class DroidValidationEngine {
  /**
   * Validate complete droid configuration
   * @param {Object} droidSystems - actor.system.droidSystems
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateDroidConfiguration(droidSystems) {
    const errors = [];

    // Required: Degree
    if (!droidSystems.degree) {
      errors.push('Droid must have a degree selected (Third, Second, or First)');
    }

    // Required: Size
    if (!droidSystems.size) {
      errors.push('Droid must have a size selected');
    }

    // Required: Primary systems
    if (!droidSystems.locomotion?.id) {
      errors.push('Droid must have a locomotion system');
    }
    if (!droidSystems.processor?.id) {
      errors.push('Droid must have a processor');
    }

    // Required: At least one appendage
    if (!droidSystems.appendages || droidSystems.appendages.length === 0) {
      errors.push('Droid must have at least one appendage');
    }

    // Budget check
    if (droidSystems.credits.remaining < 0) {
      errors.push(`Droid exceeds credit budget by ${Math.abs(droidSystems.credits.remaining)}`);
    }

    // Degree-specific constraints
    const degreeErrors = this._validateDegreeConstraints(droidSystems);
    errors.push(...degreeErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that appendage count matches degree
   * @param {Object} droidSystems
   * @returns {string[]} Error messages
   */
  static _validateDegreeConstraints(droidSystems) {
    const errors = [];
    const appendageCount = droidSystems.appendages?.length || 0;

    const constraints = {
      'Third-Degree': { min: 2, max: 4 },
      'Second-Degree': { min: 2, max: 6 },
      'First-Degree': { min: 2, max: 8 }
    };

    const constraint = constraints[droidSystems.degree];
    if (constraint) {
      if (appendageCount < constraint.min) {
        errors.push(`${droidSystems.degree} droids need at least ${constraint.min} appendages`);
      }
      if (appendageCount > constraint.max) {
        errors.push(`${droidSystems.degree} droids can have at most ${constraint.max} appendages`);
      }
    }

    return errors;
  }

  /**
   * Check if a system can be added (budget, constraints)
   * @param {Object} system - System to add
   * @param {Object} droidSystems - Current droid configuration
   * @param {String} systemType - 'locomotion', 'processor', 'appendage', etc.
   * @returns {Object} { canAdd: boolean, reason: string }
   */
  static canAddSystem(system, droidSystems, systemType) {
    const cost = system.cost || 0;
    const remaining = droidSystems.credits.remaining;

    if (cost > remaining) {
      return {
        canAdd: false,
        reason: `Insufficient credits. Need ${cost}, have ${remaining} remaining.`
      };
    }

    // Size restrictions
    if (system.sizeRestriction && droidSystems.size !== system.sizeRestriction) {
      return {
        canAdd: false,
        reason: `This system requires size ${system.sizeRestriction}, but droid is ${droidSystems.size}`
      };
    }

    // Degree prerequisites
    if (system.degreePrerequisite) {
      const degreeRank = this._degreeTier(droidSystems.degree);
      const systemRank = this._degreeTier(system.degreePrerequisite);
      if (systemRank > degreeRank) {
        return {
          canAdd: false,
          reason: `This system requires at least ${system.degreePrerequisite} degree`
        };
      }
    }

    return { canAdd: true };
  }

  /**
   * Helper: Convert degree to numeric tier for comparison
   */
  static _degreeTier(degree) {
    const tiers = {
      'Third-Degree': 1,
      'Second-Degree': 2,
      'First-Degree': 3
    };
    return tiers[degree] || 0;
  }

  /**
   * Calculate total cost and credits remaining
   */
  static calculateBudget(droidSystems) {
    let spent = 0;

    if (droidSystems.locomotion?.cost) spent += droidSystems.locomotion.cost;
    if (droidSystems.processor?.cost) spent += droidSystems.processor.cost;

    (droidSystems.appendages || []).forEach(a => {
      spent += a.cost || 0;
    });
    (droidSystems.accessories || []).forEach(a => {
      spent += a.cost || 0;
    });
    (droidSystems.locomotionEnhancements || []).forEach(e => {
      spent += e.cost || 0;
    });
    (droidSystems.appendageEnhancements || []).forEach(e => {
      spent += e.cost || 0;
    });

    const total = droidSystems.credits.total || 0;

    return {
      total,
      spent,
      remaining: total - spent
    };
  }
}
```

---

## 3. BUILDER LIFECYCLE

### Key Decision: When Does Actor Exist?

**Recommendation:** Create droid actor **immediately** when builder opens (like Vehicle Builder).

**Why:**
- ✅ Can validate against live actor data
- ✅ Can test mutations in isolation
- ✅ Eliminates two-source-of-truth problem
- ✅ Simplifies droid creation flow

### Lifecycle Phases

```
Phase 1: LAUNCH
├─ CharGen (or standalone app) calls DroidBuilderApp.open(actor)
├─ If actor doesn't exist: create empty droid actor
└─ If actor exists: use it (edit mode)

Phase 2: BUILD (IN-MEMORY, DEFERRED MUTATION)
├─ Select degree → update this.droidSystems.degree (UI state)
├─ Select size → update this.droidSystems.size (UI state)
├─ Add locomotion → mutate this.droidSystems.locomotion (UI state)
├─ Add appendages → push to this.droidSystems.appendages[] (UI state)
├─ Add accessories → push to this.droidSystems.accessories[] (UI state)
├─ Validate at every step (pure function, no actor mutation)
└─ Show costs, budgets in UI (computed from this.droidSystems)

Phase 3: FINALIZE (ATOMIC ACTOR UPDATE)
├─ Validate complete configuration (all constraints)
├─ If invalid: block finalization, show errors
├─ If valid:
│  ├─ Build updateData object
│  ├─ Atomic call: ActorEngine.updateActor(actor, { 'system.droidSystems': ... })
│  ├─ On success: close builder, show notification
│  └─ On failure: show error, leave builder open
└─ Cancel: discard in-memory state, close builder (NO MUTATIONS)
```

---

## 4. BUILDER APP ARCHITECTURE (Following Vehicle Pattern)

### File Structure

```
scripts/apps/
├── droid-builder-app.js (NEW - main app class)
├── droid-builder-manager.js (NEW - service layer: load systems, manage state)
└── base/swse-application.js (inherit from)

scripts/engine/
├── droid-validation-engine.js (NEW - pure validation functions)
└── (existing managers)
```

### DroidBuilderApp Class Structure (Pseudo-code)

```javascript
export class DroidBuilderApp extends SWSEApplication {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    // UI state (in-memory, not persisted)
    this.droidSystems = { /* copy of actor.system.droidSystems */ };
    this.currentStep = 'intro'; // intro → degree → size → systems → review
    this.selectedCategory = 'locomotion'; // For system browsing
    this.lastAction = null; // For narration (like Marl)
  }

  async _prepareContext(options) {
    // Compute all context from state
    const context = {};
    context.actor = this.actor;
    context.currentStep = this.currentStep;
    context.seraphimDialogue = this.getSeraphimDialogue();

    // Budget calculations
    context.budget = DroidValidationEngine.calculateBudget(this.droidSystems);

    // Available systems for current category
    context.availableSystems = DroidBuilderManager.getSystemsByCategory(
      this.selectedCategory,
      this.droidSystems
    );

    // Current configuration
    context.droidSystems = this.droidSystems;

    return context;
  }

  async _onRender(context, options) {
    // Event binding ONLY (like Vehicle Builder)
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll('.select-degree').forEach(el => {
      el.addEventListener('click', this._onSelectDegree.bind(this));
    });
    // ... etc
  }

  // Event handlers follow Vehicle pattern:
  // 1. Update this.droidSystems (UI state)
  // 2. Validate using DroidValidationEngine (pure function)
  // 3. Call this.render() if state changed

  async _onSelectDegree(event) {
    const degree = event.currentTarget.dataset.degree;
    this.droidSystems.degree = degree;
    await this.render();
  }

  async _onAddLocomotion(event) {
    const systemId = event.currentTarget.dataset.systemId;
    const system = DroidBuilderManager.getSystem(systemId);

    // Validate
    const check = DroidValidationEngine.canAddSystem(
      system,
      this.droidSystems,
      'locomotion'
    );
    if (!check.canAdd) {
      ui.notifications.warn(check.reason);
      return;
    }

    // Update state (not actor yet)
    this.droidSystems.locomotion = {
      id: system.id,
      name: system.name,
      cost: system.cost,
      speed: system.speed
    };

    // Recalculate budget
    const budget = DroidValidationEngine.calculateBudget(this.droidSystems);
    this.droidSystems.credits = budget;

    await this.render();
  }

  async _onFinalizeDroid(event) {
    // Validate ENTIRE configuration
    const validation = DroidValidationEngine.validateDroidConfiguration(
      this.droidSystems
    );

    if (!validation.valid) {
      ui.notifications.error(
        `Cannot finalize: ${validation.errors.join(', ')}`
      );
      return;
    }

    // Confirm dialog
    const confirmed = await Dialog.confirm({
      title: 'Finalize Droid?',
      content: `...` // Show summary
    });

    if (!confirmed) return;

    // ATOMIC UPDATE (only mutation in entire builder)
    const updateData = {
      'system.droidSystems': this.droidSystems
    };

    await ActorEngine.updateActor(this.actor, updateData);

    ui.notifications.info('Droid configuration saved!');
    this.close();
  }

  async _onResetDroid(event) {
    // Clear UI state only (no actor mutation)
    this.droidSystems = this._getEmptyDroidSystems();
    this.currentStep = 'intro';
    await this.render();
  }
}
```

---

## 5. MIGRATION UTILITY (Flags → System)

### Purpose
Move existing droid configurations from `flags.swse.chargenData.droidSystems` → `actor.system.droidSystems`

### File: `scripts/migration/migrate-droid-systems.js` (NEW)

```javascript
/**
 * Migration: Move droid systems from flags to system fields
 * Run this once after deploying new droid system schema
 */

export class DroidSystemsMigration {
  /**
   * Migrate all droid actors in a world
   */
  static async migrateWorld() {
    const droids = game.actors.filter(a => a.system.isDroid);

    console.log(`Migrating ${droids.length} droid actors...`);

    for (const droid of droids) {
      await this.migrateDroid(droid);
    }

    console.log('Droid migration complete');
  }

  /**
   * Migrate a single droid actor
   */
  static async migrateDroid(droid) {
    // Check if already migrated
    if (droid.system.droidSystems?.degree) {
      console.log(`${droid.name} already migrated, skipping`);
      return;
    }

    // Check if old data exists in flags
    const oldData = droid.getFlag('swse', 'chargenData');
    if (!oldData?.droidSystems) {
      console.warn(`${droid.name} has no droid system data to migrate`);
      return;
    }

    // Map old format to new format
    const droidSystems = {
      degree: oldData.droidDegree || '',
      size: oldData.droidSize || 'Medium',
      locomotion: oldData.droidSystems?.locomotion || {},
      processor: oldData.droidSystems?.processor || {},
      appendages: oldData.droidSystems?.appendages || [],
      accessories: oldData.droidSystems?.accessories || [],
      locomotionEnhancements: oldData.droidSystems?.locomotionEnhancements || [],
      appendageEnhancements: oldData.droidSystems?.appendageEnhancements || [],
      credits: {
        total: oldData.droidCredits?.total || 0,
        spent: oldData.droidCredits?.spent || 0,
        remaining: oldData.droidCredits?.remaining || 0
      },
      skillPoints: {
        total: 0,
        spent: 0,
        remaining: 0
      }
    };

    // Validate
    const validation = DroidValidationEngine.validateDroidConfiguration(droidSystems);
    if (!validation.valid) {
      console.error(
        `${droid.name} migration validation failed: ${validation.errors.join(', ')}`
      );
      return;
    }

    // Update actor
    await droid.update({
      'system.droidSystems': droidSystems
    });

    console.log(`✓ Migrated ${droid.name}`);
  }
}
```

**Usage (in Foundry console):**
```javascript
// One-time: migrate all droids
await DroidSystemsMigration.migrateWorld();
```

---

## 6. TEMPLATE: Copy-Paste Builder Pattern

When rewriting, follow this exact pattern (proven with Vehicle Builder):

```javascript
export class DroidBuilderApp extends SWSEApplication {
  // 1. Constructor: Store actor, initialize UI state
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.droidSystems = {}; // UI state
    this.currentStep = 'intro';
    // ... other UI state
  }

  // 2. Lifecycle: AppV2 methods
  static defaultOptions = { /* inherited */ }
  async _prepareContext(options) { /* derive all context from state */ }
  async _onRender(context, options) { /* event binding only */ }

  // 3. Event handlers: ALWAYS follow this pattern
  async _onSomeAction(event) {
    event.preventDefault();
    // A. Extract data from event
    // B. Validate using pure functions (not mixed with handler)
    // C. Update this.droidSystems (UI state)
    // D. Call this.render() — let _prepareContext recompute context
  }

  // 4. Finalization: SINGLE atomic mutation
  async _onFinalize(event) {
    // A. Validate complete state
    // B. Confirm with user
    // C. Build updateData
    // D. await ActorEngine.updateActor(this.actor, updateData)
    // E. this.close()
  }

  // 5. Narration: Stateless, derive in _prepareContext
  getSeraphimDialogue() {
    // Return dialogue based on currentStep, droidSystems, etc.
  }
}
```

---

## 7. DIFFERENCES FROM CURRENT (V1) BUILDER

| Aspect | V1 (Current) | V2 (Proposed) |
|--------|--------------|---------------|
| **Actor existence** | Created at CharGen finalize | Created immediately when builder opens |
| **Droid systems location** | `flags.swse.chargenData` | `actor.system.droidSystems` |
| **Validation** | UI-embedded | Pure functions (`DroidValidationEngine`) |
| **Mutations** | None during build (correct) | Same (correct) |
| **Finalization** | CharGen finalize → `setFlag` | Builder finalize → `updateActor` |
| **Narrator** | Embedded in module | Stateless, derived in context |
| **AppV2 compliance** | 🔴 None | ✅ Full |

---

## 8. INTEGRATION POINTS

### CharGen Integration

**Current flow:**
```
CharGen finalize → Create actor with droid systems in FLAGS
```

**New flow:**
```
CharGen step: droid-builder
├─ Create empty droid actor (or use existing)
├─ Open DroidBuilderApp(actor)
└─ App finalizes → actor.system.droidSystems populated

CharGen finalize → Actor already complete
```

### Character Sheet Integration

**New:** Character sheet can read `system.droidSystems` directly

```javascript
// In character sheet template
{{#if this.actor.system.isDroid}}
  {{log this.actor.system.droidSystems.degree}}
  {{log this.actor.system.droidSystems.locomotion.name}}
{{/if}}
```

### Programmatic Droid Creation

**New:** Can create droids outside CharGen

```javascript
// Service layer for shops, encounters, etc.
const droid = await Actor.create({
  name: 'Battle Droid',
  type: 'character',
  system: {
    isDroid: true,
    droidSystems: {
      degree: 'Second-Degree',
      size: 'Medium',
      locomotion: { /* ... */ },
      processor: { /* ... */ },
      // ... etc
    }
  }
});

// Validation works immediately
const validation = DroidValidationEngine.validateDroidConfiguration(
  droid.system.droidSystems
);
```

---

## SUMMARY: WHAT CHANGES, WHAT STAYS

### Changes ✅
- Droid systems moved from flags → `actor.system.droidSystems`
- Validation extracted to reusable `DroidValidationEngine`
- Builder converted to standalone AppV2 app (like Marl)
- Narrator converted to stateless dialogue derivation
- Schema added to character data model

### Stays the Same ✅
- Seraphim narrator (just refactored, not rewritten)
- All mechanical rules (degree constraints, etc.)
- Cost calculations and budgets
- Appendage, system, and accessory data
- CharGen integration (just cleaner flow)

---

## NEXT STEPS

1. ✅ This design document (DONE)
2. Add `droidSystems` schema to `character-data-model.js`
3. Write `droid-validation-engine.js`
4. Write migration utility
5. Rewrite `chargen-droid.js` as `droid-builder-app.js`
6. Update CharGen to launch `DroidBuilderApp` instead of inline module
7. Test migration on existing droids
8. Deploy

---

**This design is ready for implementation.
All decisions are locked, trade-offs are documented, and the AppV2 pattern is proven (Vehicle Builder).**
