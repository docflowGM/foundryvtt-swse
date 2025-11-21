# FoundryVTT SWSE Hook Registration Analysis

## Executive Summary
The SWSE system currently has **48+ hook registrations** spread across **25+ files**. Hooks are registered in multiple ways (module-level, in init functions, and in class methods), creating initialization order dependencies and making system overview difficult.

## Detailed Hook Inventory

### Core System Initialization Hooks (index.js)

#### Module-Level Hooks (Execute on Load)
1. **Hooks.once("init")** - Main system initialization
   - Location: `/index.js:160-436`
   - Pattern: Large async function
   - Responsibilities: CONFIG setup, sheet registration, data models, handlebars helpers
   - Dependencies: None (fires first)

2. **Hooks.once("ready")** - System ready/world loaded
   - Location: `/index.js:442-634`
   - Pattern: Large async function
   - Responsibilities: Data preloading, app initialization, canvas UI setup
   - Dependencies: Depends on init() completing

3. **Hooks.on('renderApplication')** - Reposition SWSE windows
   - Location: `/index.js:545-562`
   - Pattern: Inline in ready hook
   - Scope: SWSE apps only (filtered by class)

#### Function-Based Hooks (In setupCombatAutomation/setupConditionRecovery)
4. **Hooks.on('createCombat')**
   - Location: `/index.js:875`
   - Registered in: `setupCombatAutomation()` function
   - Called from: ready hook line 524

5. **Hooks.on('combatRound')**
   - Location: `/index.js:880`
   - Registered in: `setupCombatAutomation()`
   - Called from: ready hook

6. **Hooks.on('combatTurn')**
   - Location: `/index.js:885`
   - Registered in: `setupCombatAutomation()`
   - Note: DUPLICATE - also in setupConditionRecovery() at line 897
   - Called from: ready hook (conditional on autoConditionRecovery setting)

#### Module-Level Hooks (Inline in index.js)
7. **Hooks.on("dropActorSheetData')**
   - Location: `/index.js:948`
   - Handles: Item drops on actor sheets

8. **Hooks.on('preUpdateActor')**
   - Location: `/index.js:957`
   - Handles: Condition track penalty updates

9. **Hooks.on("renderChatMessageHTML")**
   - Location: `/index.js:976`
   - Handles: Damage application and damage rolling in chat

10. **Hooks.on("hotbarDrop")**
    - Location: `/index.js:1019`
    - Handles: Creating macros from item drops

---

### Combat System Hooks

#### SWSECombatIntegration (combat-integration.js)

Hooks registered in `init()` static method (line 10-23):

1. **Hooks.on("createCombat")**
   - Binds: `_onCombatStart()`
   - Duplicates index.js hook
   - Called from: index.js ready hook

2. **Hooks.on("deleteCombat")**
   - Binds: `_onCombatEnd()`
   - Note: Handles cleanup of effects

3. **Hooks.on("combatRound")**
   - Binds: `_onCombatRound()`
   - Duplicates index.js hook
   - Announces round in chat

4. **Hooks.on("combatTurn")**
   - Binds: `_onCombatTurn()`
   - Note: DUPLICATE - third version of this hook
   - Handles: Action economy reset, condition recovery

5. **Hooks.on("createCombatant")**
   - Binds: `_onCombatantAdd()`
   - Resets resources

6. **Hooks.on("deleteCombatant")**
   - Binds: `_onCombatantRemove()`
   - Cleans up effects

#### SWSECombatAutomation (combat-automation.js)

Hooks registered in `_registerHooks()` method (line 14-46):

1. **Hooks.on('combatTurn')**
   - Pattern: Inline async callback
   - Handles: Condition recovery prompt
   - NOTE: DUPLICATE (3rd registration for this hook)

2. **Hooks.on('combatStart')**
   - Handles: Reset resources if enabled

3. **Hooks.on('combatEnd')**
   - Handles: Cleanup logging

#### SWSEActiveEffectsManager (active-effects-manager.js)

Hooks registered in `init()` method (line 284-292):

1. **Hooks.on('updateActor')**
   - Location: line 284
   - Handles: Active effects updates

2. **Hooks.on('combatTurn')**
   - Location: line 292
   - NOTE: DUPLICATE (4th registration)
   - Handles: Apply turn-based effects

---

### Force Power System Hooks

#### initializeForcePowerHooks() - force-power-hooks.js

Hooks registered within exported function (called from index.js ready hook line 483):

1. **Hooks.on('createItem')**
   - Line 14
   - Detects: Force Sensitivity and Force Training feats
   - Applies: Auto-grants force powers

2. **Hooks.on('preUpdateActor')**
   - Line 54
   - Captures: Old ability scores for comparison
   - NOTE: DUPLICATE (already in houserule-mechanics.js)

3. **Hooks.on('updateActor')**
   - Line 65
   - Detects: Ability modifier increases
   - Applies: Auto-grant new force powers

4. **Hooks.on('deleteCombat')**
   - Line 86
   - Resets: Spent force powers after combat
   - NOTE: DUPLICATE with SWSECombatIntegration

---

### House Rules System Hooks

#### HouseruleMechanics - houserule-mechanics.js

Hooks registered in various setup methods (called from index.js ready hook line 592):

1. **Hooks.on('preRollDamage')**
   - Line 31
   - Applies: Critical hit variants

2. **Hooks.on('preUpdateActor')**
   - Lines 56, 89
   - NOTE: Multiple registrations in same file
   - Applies: Condition track caps and death system rules

3. **Hooks.on('preRollSkill')**
   - Line 231
   - Applies: Feint skill modifications

4. **Hooks.on('preCreateCombatant')**
   - Line 297
   - Applies: Space combat initiative if enabled

5. **Hooks.on('combatTurn')**
   - Line 308
   - NOTE: DUPLICATE (5th registration)
   - Applies: Space combat turn management

---

### Migration System Hooks

#### Actor Validation Migration - actor-validation-migration.js

1. **Hooks.once('init')**
   - Line 280
   - Pattern: Placeholder

2. **Hooks.once('ready')**
   - Line 287
   - Triggers: Migration if needed

#### Item Validation Migration - item-validation-migration.js

1. **Hooks.once('init')**
   - Line 242
   - Pattern: Placeholder

2. **Hooks.once('ready')**
   - Line 249
   - Triggers: Migration if needed

#### Populate Force Compendiums Migration - populate-force-compendiums.js

1. **Hooks.once('init')**
   - Line 332
   - Pattern: Placeholder

2. **Hooks.once('ready')**
   - Line 339
   - Triggers: Migration if needed

---

### UI & Canvas Hooks

#### CanvasUIManager - canvas-ui-manager.js

Hooks registered in `initialize()` method (line 16-23):

1. **Hooks.on('canvasReady')**
   - Renders toolbar

2. **Hooks.on('canvasResize')**
   - Re-renders toolbar

#### ThemeLoader - theme-loader.js

1. **Hooks.once('ready')**
   - Line 126
   - Applies: Initial theme

#### Character Generator - chargen-init.js

1. **Hooks.on('renderActorDirectory')**
   - Line 6
   - Adds: Character generator buttons

---

### Chat & Dialog Hooks

#### Chat Commands - chat-commands.js

1. **Hooks.on("chatMessage")**
   - Line 8
   - Handles: /damage and /heal commands

#### Skills Config - skills.js

1. **Hooks.once('init')**
   - Line 241
   - Registers: Skill configuration

#### Skill Use Filter - skill-use-filter.js

1. **Hooks.once('init')**
   - Line 281
   - Initializes: Skill filtering system

#### Core Init - core/init.js

1. **Hooks.once("init")**
   - Line 6
   - Pattern: Duplicate/placeholder
   - NOTE: Likely conflicts with main index.js init hook

#### Logger - utils/logger.js

1. **Hooks.once('init')**
   - Line 203
   - Initializes: Logger

#### Houserules Config - houserules-config.js

1. **Hooks.once('ready')**
   - Line 118
   - Initializes: Houserules configuration

#### Enhanced Rolls - combat/rolls/enhanced-rolls.js

1. **Hooks.on("renderChatMessageHTML")**
   - Line 676
   - NOTE: DUPLICATE with index.js line 976
   - Handles: Chat message rendering

#### Error Handler - core/error-handler.js

1. **Hooks.on('error')**
   - Line 26
   - Handles: Global error logging

---

### Debug Module - debug-character-sheet.js

1. **Hooks.on('renderActorSheet')**
   - Line 211
   - Pattern: Debug console script

2. **Hooks.on('preRenderActorSheet')**
   - Line 260
   - Pattern: Debug console script

3. **Hooks.on('closeActorSheet')**
   - Line 290
   - Pattern: Debug console script

---

## Critical Issues Identified

### 1. Hook Duplication/Conflicts

| Hook Name | Count | Locations | Risk |
|-----------|-------|-----------|------|
| combatTurn | 5+ | index.js, combat-integration.js, combat-automation.js, active-effects-manager.js, houserule-mechanics.js | HIGH |
| deleteCombat | 2 | index.js, SWSECombatIntegration, force-power-hooks.js | HIGH |
| preUpdateActor | 3+ | index.js, force-power-hooks.js, houserule-mechanics.js (2x) | MEDIUM |
| renderChatMessageHTML | 2 | index.js, enhanced-rolls.js | MEDIUM |
| createCombat | 2 | index.js, SWSECombatIntegration | MEDIUM |
| combatRound | 2 | index.js, SWSECombatIntegration | MEDIUM |
| once('init') | 4+ | index.js, core/init.js, migrations, logger | HIGH |
| once('ready') | 3+ | index.js, migrations, theme-loader, houserules-config | MEDIUM |

**Impact**: Multiple handlers may execute in unpredictable order, causing race conditions or conflicting logic.

### 2. Initialization Order Dependencies

```
Module Load (implicit order of imports)
    ↓
Hooks.once('init') [MULTIPLE]
    - index.js:160 (main) 
    - core/init.js:6 (duplicate?)
    ↓
Hooks.once('ready') [MULTIPLE]
    - index.js:442 (main)
    - Calls: SWSECombatAutomation.init()
    - Calls: SWSECombatIntegration.init()
    - Calls: SWSEActiveEffectsManager.init()
    - Calls: initializeForcePowerHooks()
    - Calls: HouseruleMechanics.initialize()
    - Calls: CanvasUIManager.initialize()
    - Calls: ThemeLoader.initialize()
    - Calls: SWSECombat.init()
    - Calls: SWSEGrappling.init()
    - Calls: SWSEVehicleCombat.init()
```

**Issues**:
- Multiple `Hooks.once('init')` registrations may conflict
- Ready hook orchestrates 8+ system initializations sequentially
- No explicit error handling if any init fails
- Migration hooks run independently of main system readiness

### 3. Scattered Registration Points

Hooks are registered from:
- Module level (index.js)
- Function calls (setupCombatAutomation, setupConditionRecovery)
- Class static methods (SWSECombatIntegration.init, SWSECombatAutomation._registerHooks)
- Exported functions (initializeForcePowerHooks)
- Migration files (run on ready)

**Impact**: Hard to see all hooks without searching; hard to manage dependencies

### 4. Conditional Registration

Some hooks are only registered if settings are enabled:
- `setupCombatAutomation()` - only if enableAutomation setting is true (line 523)
- `setupConditionRecovery()` - only if autoConditionRecovery setting is true (line 584)

**Issue**: Settings-based registration means hooks may or may not be active

---

## Hook Dependencies & Execution Order

### chatMessage Flow
```
User types command
→ Hooks.on('chatMessage') [chat-commands.js]
  - Parses /damage, /heal commands
```

### Combat Flow
```
createCombat
→ Hooks.on('createCombat') [index.js:875 & SWSECombatIntegration:14]
  - Reset resources
  - Send notification
→ combatRound
→ Hooks.on('combatRound') [index.js:880 & SWSECombatIntegration:16]
  - Announce round
→ combatTurn (repeats per combatant)
→ Hooks.on('combatTurn') [5 PLACES]
  - index.js:885 - Logging only
  - index.js:897 - Condition recovery (async dialog)
  - SWSECombatIntegration:17 - Action economy reset
  - SWSECombatAutomation:16 - Condition recovery prompt (DUPLICATE of line 897!)
  - HouseruleMechanics:308 - Space combat turn
  - SWSEActiveEffectsManager:292 - Apply turn effects
→ deleteCombat
→ Hooks.on('deleteCombat') [index.js (none visible), SWSECombatIntegration:15, force-power-hooks:86]
  - Cleanup effects
  - Regain force powers
```

### Actor Update Flow
```
preUpdateActor
→ Hooks.on('preUpdateActor') [Multiple]
  - index.js:957 - Condition track penalty
  - force-power-hooks:54 - Capture old abilities
  - houserule-mechanics:56 - Condition cap
  - houserule-mechanics:89 - Death system
  - (Race condition risk: order unpredictable)
→ updateActor
→ Hooks.on('updateActor') [Multiple]
  - force-power-hooks:65 - Ability increase detection
  - active-effects-manager:284 - Active effects update
  - combat-action-bar:147 - UI update
→ Hooks.on('preRollSkill') [houserule-mechanics:231]
  (Called by rollSkill method)
```

### Item Creation Flow
```
createItem
→ Hooks.on('createItem') [force-power-hooks:14]
  - Detect Force Sensitivity/Training feats
  - Auto-grant related powers
  (Only fires once per item; depends on item.parent being actor)
```

---

## Current Organization Patterns

### Pattern 1: Module-Level Functions in index.js
- `setupCombatAutomation()` - Registers hooks directly
- `setupConditionRecovery()` - Registers hooks directly
- Direct hook registration for drop/update/chat/hotbar

**Pros**: All in one file
**Cons**: 1100+ line file; hard to follow; mixing concerns

### Pattern 2: Class Static Methods
- `SWSECombatIntegration.init()`
- `SWSECombatAutomation._registerHooks()`
- `HouseruleMechanics.initialize()`
- `CanvasUIManager.initialize()`

**Pros**: Logical grouping by feature
**Cons**: Still scattered; order depends on ready hook calling them

### Pattern 3: Exported Initialization Functions
- `initializeForcePowerHooks()`
- `registerHouseruleSettings()`

**Pros**: Clear entry point
**Cons**: Must be called explicitly

### Pattern 4: Migrations (Hooks.once('init') + Hooks.once('ready'))
- Each migration has duplicate init/ready hooks
- All run independently

**Pros**: Self-contained
**Cons**: Pollutes hook namespace; wasted executions

---

## Suggested Centralized Organization Structure

### Proposed File Structure

```
scripts/
├── hooks/
│   ├── hooks-registry.js           (CENTRALIZED - all hook registrations)
│   ├── combat-hooks.js             (Combat-specific hooks grouped)
│   ├── actor-hooks.js              (Actor/item hooks grouped)
│   ├── ui-hooks.js                 (UI/canvas/chat hooks grouped)
│   ├── force-power-hooks.js        (Force power hooks - already exists)
│   ├── houserule-hooks.js          (Houserule hooks grouped)
│   └── migration-hooks.js          (Migration hooks grouped)
├── core/
│   ├── init-manager.js             (NEW - orchestrate initialization order)
│   └── ...rest of core
```

### Core Organization Changes

#### 1. **hooks-registry.js** - Single Source of Truth

```javascript
/**
 * SWSE Hooks Registry
 * Centralized registration of all Foundry hooks
 * 
 * All hooks are documented here with:
 * - Event name
 * - Handler function
 * - When it executes (init/ready)
 * - Dependencies
 */

export class HooksRegistry {
  
  // Track all registered hooks for debugging
  static registeredHooks = new Map();
  
  /**
   * Register all hooks - called from index.js once('init')
   */
  static registerAllHooks() {
    // INIT hooks (execute first)
    this.registerInitHooks();
    
    // READY hooks (execute after world loads)
    this.registerReadyHooks();
    
    // RUNTIME hooks (execute as needed)
    this.registerRuntimeHooks();
  }
  
  static registerInitHooks() {
    // CONFIG, sheets, data models
    HooksRegistry.registerHook('init', 'system-init', 
      () => SystemInitializer.init());
    
    // Skill configuration
    HooksRegistry.registerHook('init', 'skills-init',
      () => SkillsConfig.init());
    
    // Logger initialization
    HooksRegistry.registerHook('init', 'logger-init',
      () => SWSELogger.init());
  }
  
  static registerReadyHooks() {
    // Core readiness orchestration
    HooksRegistry.registerHook('ready', 'system-ready',
      async () => SystemReadyManager.init());
    
    // Theme loading
    HooksRegistry.registerHook('ready', 'theme-ready',
      async () => ThemeLoader.initialize());
    
    // Canvas UI
    HooksRegistry.registerHook('ready', 'canvas-ui-ready',
      async () => CanvasUIManager.initialize());
  }
  
  static registerRuntimeHooks() {
    // Combat lifecycle - grouped
    this.registerCombatHooks();
    
    // Actor updates - grouped
    this.registerActorHooks();
    
    // Force powers - grouped
    this.registerForcePowerHooks();
    
    // Chat/UI - grouped
    this.registerChatUIHooks();
    
    // Houserules - grouped
    this.registerHouseruleHooks();
  }
  
  static registerCombatHooks() {
    // Combat start
    HooksRegistry.registerHook('createCombat', 'combat-start',
      (combat, options, userId) => 
        SWSECombatIntegration.onCombatStart(combat, options, userId),
      { requireGM: true, runOrder: 10 });
    
    // Combat turn - CONSOLIDATED
    HooksRegistry.registerHook('combatTurn', 'combat-turn-automation',
      (combat, updateData, updateOptions) =>
        SWSECombatAutomation.onCombatTurn(combat, updateData, updateOptions),
      { runOrder: 10 });
    
    HooksRegistry.registerHook('combatTurn', 'combat-turn-integration',
      (combat, updateData, updateOptions) =>
        SWSECombatIntegration.onCombatTurn(combat, updateData, updateOptions),
      { runOrder: 20 });
    
    HooksRegistry.registerHook('combatTurn', 'combat-turn-housrules',
      (combat, updateData, updateOptions) =>
        HouseruleMechanics.onCombatTurn(combat, updateData, updateOptions),
      { runOrder: 30 });
    
    // Combat end
    HooksRegistry.registerHook('deleteCombat', 'combat-end',
      (combat, options, userId) =>
        SWSECombatIntegration.onCombatEnd(combat, options, userId),
      { requireGM: true });
    
    // Force powers reset after combat
    HooksRegistry.registerHook('deleteCombat', 'force-power-reset',
      (combat, options, userId) =>
        ForcePowerManager.resetPowersAfterCombat(combat),
      { runOrder: 20 });
  }
  
  static registerActorHooks() {
    // Pre-update hook
    HooksRegistry.registerHook('preUpdateActor', 'actor-pre-condition-track',
      (actor, changes, options, userId) =>
        ActorHooks.preUpdateConditionTrack(actor, changes, options, userId),
      { runOrder: 10 });
    
    HooksRegistry.registerHook('preUpdateActor', 'actor-pre-abilities',
      (actor, changes, options, userId) => {
        // Capture old abilities for comparison
        if (changes.system?.abilities) {
          options.oldAbilities = foundry.utils.duplicate(actor.system.abilities);
        }
      },
      { runOrder: 20 });
    
    // Post-update hooks
    HooksRegistry.registerHook('updateActor', 'actor-update-abilities',
      (actor, changes, options, userId) =>
        ForcePowerManager.onAbilityIncrease(actor, changes, options, userId),
      { runOrder: 10 });
    
    HooksRegistry.registerHook('updateActor', 'actor-update-effects',
      (actor, changes, options, userId) =>
        SWSEActiveEffectsManager.onActorUpdate(actor, changes, options, userId),
      { runOrder: 20 });
  }
  
  /**
   * Register a hook with metadata for debugging
   * @param {string} hookName - Foundry hook name
   * @param {string} handlerName - Unique identifier for this handler
   * @param {Function} handler - The handler function
   * @param {Object} options - Metadata
   */
  static registerHook(hookName, handlerName, handler, options = {}) {
    const key = `${hookName}:${handlerName}`;
    
    // Store metadata
    if (!this.registeredHooks.has(hookName)) {
      this.registeredHooks.set(hookName, []);
    }
    this.registeredHooks.get(hookName).push({
      name: handlerName,
      runOrder: options.runOrder ?? 50,
      requireGM: options.requireGM ?? false,
      ...options
    });
    
    // Register with Foundry
    if (options.requireGM) {
      Hooks.on(hookName, (document, data, options, userId) => {
        if (!game.user.isGM) return;
        return handler(document, data, options, userId);
      });
    } else {
      Hooks.on(hookName, handler);
    }
    
    SWSELogger.log(`Hook registered: ${key}`);
  }
  
  /**
   * Get debug info about registered hooks
   */
  static getDebugInfo() {
    const info = {};
    for (const [hookName, handlers] of this.registeredHooks) {
      info[hookName] = handlers
        .sort((a, b) => (a.runOrder ?? 50) - (b.runOrder ?? 50))
        .map(h => `${h.name} [${h.runOrder}]`);
    }
    return info;
  }
}
```

#### 2. **init-manager.js** - Orchestrate System Readiness

```javascript
/**
 * System Initialization Manager
 * Orchestrates all system initialization in correct order
 * Ensures dependencies are met before proceeding
 */

export class SystemInitManager {
  
  static async initializeSystem() {
    try {
      // Phase 1: Basic initialization (no async)
      console.log("SWSE | Phase 1: Basic initialization");
      await this.phase1BasicInit();
      
      // Phase 2: Configuration and registration
      console.log("SWSE | Phase 2: Configuration");
      await this.phase2Configuration();
      
      // Phase 3: Data loading (async)
      console.log("SWSE | Phase 3: Data loading");
      await this.phase3DataLoading();
      
      // Phase 4: Systems initialization (async)
      console.log("SWSE | Phase 4: Systems initialization");
      await this.phase4SystemsInit();
      
      // Phase 5: Final setup
      console.log("SWSE | Phase 5: Final setup");
      await this.phase5FinalSetup();
      
      console.log("SWSE | System fully initialized");
    } catch (error) {
      console.error("SWSE | Fatal initialization error:", error);
      ui.notifications.error("SWSE System failed to initialize. Check console for details.");
    }
  }
  
  static async phase1BasicInit() {
    // No dependencies - just set up basics
    HooksRegistry.registerAllHooks();
    registerHandlebarsHelpers();
    // etc.
  }
  
  static async phase2Configuration() {
    // Requires: Phase 1
    registerSystemSettings();
    registerHouseruleSettings();
    // etc.
  }
  
  static async phase3DataLoading() {
    // Requires: Phase 2 (settings exist)
    await dataPreloader.preload({
      priority: ['classes', 'skills'],
      background: ['feats', 'talents', 'forcePowers', 'species']
    });
  }
  
  static async phase4SystemsInit() {
    // Requires: Phase 3 (data loaded)
    await SWSECombatAutomation.init();
    await SWSECombatIntegration.init();
    await SWSEActiveEffectsManager.init();
    await SWSECombat.init();
    await SWSEGrappling.init();
    await SWSEVehicleCombat.init();
    // etc.
  }
  
  static async phase5FinalSetup() {
    // Requires: Phases 1-4
    CanvasUIManager.initialize();
    ThemeLoader.initialize();
    HouseruleMechanics.initialize();
    // etc.
  }
}
```

---

## Recommended Refactoring Steps

### Phase 1: Audit & Documentation (WEEK 1)
- [ ] Create hooks-registry.js with HooksRegistry class (template above)
- [ ] Document each hook: name, location, handler, dependencies
- [ ] Create audit document (spreadsheet with all hooks)
- [ ] Identify actual vs. needed duplicate hooks

### Phase 2: Consolidation (WEEK 2)
- [ ] Create combat-hooks.js
  - Move all combatTurn handlers into one place
  - Remove duplicates
  - Add runOrder metadata for execution sequence
- [ ] Create actor-hooks.js
  - Consolidate preUpdateActor and updateActor handlers
- [ ] Create force-power-hooks.js
  - Move deleteCombat handler into main module

### Phase 3: Centralization (WEEK 3)
- [ ] Move all individual Hooks.on() calls to HooksRegistry
- [ ] Replace scattered registrations with single HooksRegistry.registerAllHooks() call
- [ ] Update index.js to call HooksRegistry instead of local functions

### Phase 4: Initialization Order (WEEK 4)
- [ ] Create init-manager.js
- [ ] Replace index.js init/ready hooks with calls to InitManager
- [ ] Implement runOrder system for hook handlers
- [ ] Add error handling at phase boundaries

### Phase 5: Testing & Documentation (WEEK 5)
- [ ] Add HooksRegistry.getDebugInfo() to window.SWSE
- [ ] Create console commands to list all hooks
- [ ] Test hook execution order with performance monitor
- [ ] Document new hook registration pattern for contributors

---

## Which Hooks Should Stay Local vs. Centralize

### CENTRALIZE (Nearly All)
- Combat hooks (very interconnected)
- Actor update hooks (multiple dependencies)
- Force power hooks (related to combat/actors)
- Migration hooks (run predictably)
- Houserule hooks (multiple systems)
- Canvas/UI initialization hooks

### CONSIDER LOCAL IF
- Very simple, single-purpose hooks that won't change
- Hooks tightly coupled to one module's internal logic
- BUT: Even these benefit from registry for discoverability

### VERDICT
**Recommend centralizing 95% of hooks.** The few exceptions should still be documented in the registry even if the actual Hooks.on() call stays in the module.

---

## Benefits of Centralization

1. **Discoverability**: See all hooks in one place
2. **Conflict Detection**: Easy to spot duplicate handlers
3. **Order Management**: Explicit runOrder prevents race conditions
4. **Dependency Tracking**: See which systems depend on which hooks
5. **Testing**: Easy to mock hook execution in tests
6. **Documentation**: Clear comments on each hook's purpose
7. **Debugging**: Registry.getDebugInfo() shows what's active
8. **Onboarding**: New developers understand system flow better

---

## Console Commands (After Refactoring)

```javascript
// In window.SWSE

// List all registered hooks
SWSE.hooks.list()
// Output: {
//   'combatTurn': [
//     'combat-turn-automation [10]',
//     'combat-turn-integration [20]',
//     'combat-turn-houserules [30]'
//   ],
//   ...
// }

// Get detailed info about a hook
SWSE.hooks.info('combatTurn')

// Test hook execution
SWSE.hooks.test('combatTurn', mockCombat)

// Disable/enable hooks
SWSE.hooks.disable('combatTurn')
SWSE.hooks.enable('combatTurn')

// Trace hook execution
SWSE.hooks.trace(true) // Enable
```

---

## Migration Path (Non-Breaking)

1. Create HooksRegistry alongside existing code
2. Add new hooks to HooksRegistry first
3. Gradually move existing hooks over
4. Keep old code working during transition
5. Remove old code once all hooks migrated
6. Use feature flags if needed

This allows safe, incremental refactoring without breaking the system.

