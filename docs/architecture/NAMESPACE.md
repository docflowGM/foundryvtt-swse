# Global Namespace Reference

All SWSE system features are accessible via the `window.SWSE` global namespace. This document provides a complete API reference for developers, macro authors, and module integrators.

## Table of Contents

- [Core Systems](#core-systems)
- [Combat Systems](#combat-systems)
- [Data Access](#data-access)
- [Utility Functions](#utility-functions)
- [Security Utilities](#security-utilities)
- [Hook Monitoring](#hook-monitoring)
- [Debug & Error Handling](#debug--error-handling)
- [Roll Functions (game.swse.rolls)](#roll-functions-gameswserolls)
- [Utility Modules (game.swse.utils)](#utility-modules-gameswseutils)
- [Migrations (game.swse.migrations)](#migrations-gameswsemigrations)
- [Prerequisite API (game.swse.prereq)](#prerequisite-api-gameswseprereq)

---

## Core Systems

### SWSE.ActorEngine

Centralized actor manipulation and recalculation pipeline.

```javascript
// Recalculate all derived stats for an actor
await SWSE.ActorEngine.recalcAll(actor);

// Apply a template of data to an actor
await SWSE.ActorEngine.applyTemplate(actor, templateData);

// Safe atomic update with validation and auto-recalculation
await SWSE.ActorEngine.updateActor(actor, updateData, options);
```

**Methods:**
| Method | Description |
|--------|-------------|
| `recalcAll(actor)` | Recalculates all derived stats for an actor |
| `applyTemplate(actor, templateData)` | Applies predefined data and rebuilds derived values |
| `updateActor(actor, updateData, options)` | Safe wrapper for actor updates with atomic updates |

---

### SWSE.RollEngine

Unified dice rolling system with chat integration.

```javascript
// Safe roll evaluation
const roll = await SWSE.RollEngine.safeRoll("1d20+5", data);

// Send roll to chat
await SWSE.RollEngine.rollToChat(roll, { flavor: "Attack Roll" });

// Roll attack with weapon
await SWSE.RollEngine.rollAttack(actor, weapon, data);

// Enhanced skill check with breakdown
await SWSE.RollEngine.skillCheck(actor, "perception", { dc: 15 });

// Opposed check
await SWSE.RollEngine.rollOpposed(actor, "stealth", opponent, "perception");
```

**Methods:**
| Method | Description |
|--------|-------------|
| `safeRoll(formula, data)` | Evaluates a roll formula safely (async) |
| `rollToChat(roll, chatData)` | Sends an evaluated roll to chat |
| `rollAttack(actor, item, data)` | Rolls an attack and posts to chat |
| `rollSkill(actor, skillKey, data)` | Basic skill roll to chat |
| `skillCheck(actor, skillKey, options)` | Enhanced skill check with DC comparison |
| `compareDC(total, dc)` | Compares roll total vs DC, returns success/margin |
| `createHoloChatCard(options)` | Creates formatted SWSE chat card HTML |
| `rollOpposed(actor, skillKey, opponent, oppSkillKey)` | Contested skill check |

---

### SWSE.FeatSystem

Feat management and action detection.

```javascript
// Build feat actions for UI display
const featActions = SWSE.FeatSystem.buildFeatActions(actor);
```

**Methods:**
| Method | Description |
|--------|-------------|
| `buildFeatActions(actor)` | Analyzes feats and returns categorized action data |

**Returns:**
```javascript
{
  all: [
    {
      _id: "feat-id",
      name: "Power Attack",
      tags: ["melee"],
      benefit: "...",
      type: "combat",      // "combat", "force", "skill", "passive"
      typeLabel: "COMBAT",
      icon: "fa-solid fa-crosshairs",
      uses: { ... },
      actions: { attack: true }
    }
  ]
}
```

---

### SWSE.SkillSystem

Complete skill management with extra uses, combat actions, and roll integration.

```javascript
// Build complete skill action data for an actor
const skillActions = await SWSE.SkillSystem.buildSkillActions(actor);

// Get skill total modifier
const total = SWSE.SkillSystem.getSkillTotal(actor, "perception");

// Build breakdown for tooltips
const breakdown = SWSE.SkillSystem.buildBreakdown(actor, "perception");

// Roll a skill check
await SWSE.SkillSystem.rollSkill(actor, "stealth");

// Roll a specific skill action with DC
await SWSE.SkillSystem.rollSkillAction(actor, "stealth", action);

// Opposed check
await SWSE.SkillSystem.rollOpposed(actor, "deception", target, "perception");

// Toggle favorite status for an action
SWSE.SkillSystem.toggleFavorite("perception", "Sense Force");

// Get GM quick tools
const gmTools = SWSE.SkillSystem.gmToolsFor("perception");
```

**Methods:**
| Method | Description |
|--------|-------------|
| `buildSkillActions(actor)` | Returns complete skill/action map for UI |
| `getSkillTotal(actor, skillKey)` | Returns total skill modifier |
| `buildBreakdown(actor, skillKey)` | Returns modifier breakdown object |
| `rollSkill(actor, skillKey)` | Rolls basic skill check |
| `rollSkillAction(actor, skillKey, action)` | Rolls skill with action metadata |
| `rollOpposed(actor, skillKey, target, targetSkill)` | Contested check |
| `toggleFavorite(skillKey, actionName)` | Toggles action favorite status |
| `buildHoverPreview(action)` | Returns HTML for hover tooltip |
| `gmToolsFor(skillKey)` | Returns available GM quick actions |
| `summarizeSkill(actor, skillKey)` | Returns HTML skill summary |

---

### SWSE.ForcePowerManager

Force power and Force Suite management.

```javascript
// Check if actor has Force Sensitivity
const isForceSensitive = SWSE.ForcePowerManager.hasForceSensitivity(actor);

// Count Force Training feats
const count = SWSE.ForcePowerManager.countForceTrainingFeats(actor);

// Calculate Force Suite size
const suiteSize = SWSE.ForcePowerManager.calculateForceSuiteSize(actor);

// Get available force powers from compendium
const powers = await SWSE.ForcePowerManager.getAvailablePowers();

// Get Force ability modifier (WIS or CHA based on houserule)
const mod = SWSE.ForcePowerManager.getForceAbilityModifier(actor);
```

---

## Combat Systems

### SWSE.DamageSystem

Damage and healing application with dialog support.

```javascript
// Apply damage to selected tokens
await SWSE.DamageSystem.applyToSelected(15, { checkThreshold: true });

// Heal selected tokens
await SWSE.DamageSystem.healSelected(10);

// Show damage dialog for actor
await SWSE.DamageSystem.showDamageDialog(actor);

// Get first selected actor
const actor = SWSE.DamageSystem.getSelectedActor();
```

---

### SWSE.CombatActionsMapper

Maps combat actions to actors based on their capabilities.

```javascript
// Get all combat actions available to an actor
const actions = SWSE.CombatActionsMapper.getActionsFor(actor);
```

---

### SWSE.RulesEngine

Core rules and houserules initialization.

```javascript
// Initialize rules engine (called automatically at ready)
SWSE.RulesEngine.init();
```

---

### SWSE.DDEngine

Drag-and-drop handling for compendium items.

```javascript
// Handle dropping a compendium item onto an actor
await SWSE.DDEngine.handleCompendiumDrop(actor, "foundryvtt-swse.classes", docId);
```

---

## Data Access

### SWSE.DROID_SYSTEMS

Complete droid customization data structure.

```javascript
// Access locomotion types
SWSE.DROID_SYSTEMS.locomotion  // walking, wheeled, tracked, hovering, flying, etc.

// Access processor types
SWSE.DROID_SYSTEMS.processors  // basic, heuristic, remote, backup, etc.

// Access appendage types
SWSE.DROID_SYSTEMS.appendages  // probe, instrument, tool, claw, hand, etc.

// Access accessories
SWSE.DROID_SYSTEMS.accessories.armor       // armor plating options
SWSE.DROID_SYSTEMS.accessories.communications
SWSE.DROID_SYSTEMS.accessories.sensors
SWSE.DROID_SYSTEMS.accessories.shields
SWSE.DROID_SYSTEMS.accessories.translators
SWSE.DROID_SYSTEMS.accessories.misc
```

---

### SWSE.SWSE_RACES

Species/race data with attribute bonuses.

```javascript
// Get all races
Object.keys(SWSE.SWSE_RACES);  // ["aleena", "aqualish", "bothan", "human", ...]

// Get specific race data
SWSE.SWSE_RACES.wookiee
// { label: "Wookiee", bonuses: { str: 4, con: 2, int: -2, cha: -2 } }

// Apply race bonuses (import from races.js)
import { applyRaceBonuses, getRaceFeatures } from './scripts/core/races.js';
const modified = applyRaceBonuses(baseAttributes, "wookiee");
const features = getRaceFeatures("human");  // { bonusFeats: 1, bonusSkills: 1 }
```

---

### SWSE.SWSEData

Cached data accessors for JSON data files.

```javascript
// All methods return Promises
const vehicles = await SWSE.SWSEData.getVehicles();
const feats = await SWSE.SWSEData.getFeats();
const talents = await SWSE.SWSEData.getTalents();
const classes = await SWSE.SWSEData.getClasses();
const skills = await SWSE.SWSEData.getSkills();
const attributes = await SWSE.SWSEData.getAttributes();
const forcePowers = await SWSE.SWSEData.getForcePowers();
const combatActions = await SWSE.SWSEData.getCombatActions();
const conditions = await SWSE.SWSEData.getConditions();
const extraSkillUses = await SWSE.SWSEData.getExtraSkillUses();
```

---

## Utility Functions

### Performance Utilities

```javascript
// Debounce - waits for calls to stop before executing
const debouncedFn = SWSE.debounce(fn, 250, immediate);

// Throttle - executes at most once per interval
const throttledFn = SWSE.throttle(fn, 250);
```

### Actor Update Utilities

```javascript
// Atomic actor update with validation
await SWSE.applyActorUpdateAtomic(actor, updateData, options);

// Batch multiple actor updates
await SWSE.batchActorUpdates(actor, updatesArray);

// Safe actor update wrapper
await SWSE.safeActorUpdate(actor, updateData);

// Prepare and validate update payload
const payload = SWSE.prepareUpdatePayload(actor, data);

// Validate actor fields before update
const isValid = SWSE.validateActorFields(actor, fields);
```

### Caching & Performance

```javascript
// Access cache manager
SWSE.cacheManager.getCache("feats", { ttl: 600000, maxSize: 200 });
SWSE.cacheManager.clear("feats");  // Clear specific cache
SWSE.cacheManager.clear();         // Clear all caches
SWSE.cacheManager.getStats();      // Get cache statistics

// Data preloader
await SWSE.dataPreloader.preload({
  priority: ['classes', 'skills'],
  background: ['feats', 'talents', 'forcePowers'],
  verbose: true
});

// Lazy loader for images
SWSE.lazyLoader.setupLazyImages();

// Performance monitoring
SWSE.perfMonitor.measure("Operation", () => { /* code */ });
await SWSE.perfMonitor.measureAsync("AsyncOp", async () => { /* async code */ });
```

---

## Security Utilities

```javascript
// HTML sanitization
const safe = SWSE.sanitizeHTML(unsafeHtml);
const safeMsg = SWSE.sanitizeChatMessage(message);
const escaped = SWSE.escapeHTML(text);

// Input validation
const isValid = SWSE.validateUserInput(input, schema);

// Permission checks
const canModify = SWSE.canUserModifyActor(user, actor);
const canModifyItem = SWSE.canUserModifyItem(user, item);

// Higher-order permission wrappers
await SWSE.withPermissionCheck(actor, async () => {
  // Code requiring actor permission
});

await SWSE.withGMCheck(async () => {
  // Code requiring GM permission
});
```

---

## Hook Monitoring

```javascript
// Access hook monitor
SWSE.hookMonitor.getStats();  // Performance stats for hooks

// Use monitored hooks in your code
SWSE.hooks.report();  // Print hook performance report
```

---

## Debug & Error Handling

```javascript
// Log errors with context
SWSE.logError(error, context);

// Error command utilities
SWSE.errors.report();  // Show error report
SWSE.errors.clear();   // Clear error log

// Access error handler
SWSE.errorHandler.initialize();
```

---

## Compendium Utilities

```javascript
// Compendium loader
await SWSE.compendiumLoader.loadPack("foundryvtt-swse.feats");

// Compendium commands
SWSE.compendium.listPacks();
SWSE.compendium.search("Force Training");
```

---

## Roll Functions (game.swse.rolls)

Specialized roll modules accessed via `game.swse.rolls`:

```javascript
// Attack rolls
game.swse.rolls.attacks.rollAttack(actor, weapon, options);

// Damage rolls
game.swse.rolls.damage.rollDamage(actor, weapon, options);

// Defense calculations
game.swse.rolls.defenses.calculateDefense(actor, type);

// Generic dice utilities
game.swse.rolls.dice.roll(formula);

// Initiative rolls
game.swse.rolls.initiative.rollInitiative(actor);

// Saving throws
game.swse.rolls.saves.rollSave(actor, type, options);

// Skill rolls
game.swse.rolls.skills.rollSkill(actor, skillKey, options);
```

---

## Utility Modules (game.swse.utils)

Specialized utility modules accessed via `game.swse.utils`:

```javascript
// Math utilities
game.swse.utils.math.clamp(value, min, max);
game.swse.utils.math.roundTo(value, decimals);

// String utilities
game.swse.utils.string.capitalize(str);
game.swse.utils.string.slugify(str);

// Combat utilities
game.swse.utils.combat.calculateAttackBonus(actor);

// Character utilities
game.swse.utils.character.getLevel(actor);
game.swse.utils.character.getHalfLevel(actor);

// Data utilities
game.swse.utils.data.deepMerge(target, source);

// UI utilities
game.swse.utils.ui.showNotification(message, type);

// Validation utilities
game.swse.utils.validation.isValidActor(actor);

// Dice utilities
game.swse.utils.dice.parseDiceFormula(formula);

// Skill use filter
game.swse.utils.SkillUseFilter.filter(uses, criteria);
```

---

## Migrations (game.swse.migrations)

Data migration utilities for GMs:

```javascript
// Fix actor size data
await game.swse.migrations.fixActorSize();

// Fix defense schema
await game.swse.migrations.fixDefenseSchema();

// Fix actor validation issues
await game.swse.migrations.fixActorValidation();

// Fix item validation issues
await game.swse.migrations.fixItemValidation();

// Populate force compendiums
await game.swse.migrations.populateForceCompendiums();
```

---

## Prerequisite API (game.swse.prereq)

Prerequisite checking for feats and talents:

```javascript
// Check feat prerequisites
const result = game.swse.prereq.checkFeatPrereq(featDoc, actor, pendingItems);
// Returns: { met: boolean, reasons: string[] }
```

---

## Apps & Dialogs

### SWSE.ProficiencySelectionDialog

Proficiency selection for level-up and character creation:

```javascript
await SWSE.ProficiencySelectionDialog.show(actor, proficiencies, options);
```

---

## Additional Systems

### SWSE.ThemeLoader

Theme management system:

```javascript
SWSE.ThemeLoader.init();  // Initialize themes
```

### SWSE.Upkeep

Automated upkeep and maintenance:

```javascript
SWSE.Upkeep.init();  // Initialize upkeep automation
```

---

## Usage Examples

### Rolling an Attack with Modifiers

```javascript
const actor = canvas.tokens.controlled[0]?.actor;
const weapon = actor.items.find(i => i.type === "weapon");

const roll = await SWSE.RollEngine.rollAttack(actor, weapon, {
  bonus: 2,
  flavor: "Power Attack"
});
```

### Applying Damage with Threshold Check

```javascript
await SWSE.DamageSystem.applyToSelected(25, {
  checkThreshold: true,
  damageType: "energy"
});
```

### Getting Skill Information

```javascript
const actor = game.actors.getName("Jedi Knight");
const breakdown = SWSE.SkillSystem.buildBreakdown(actor, "use_the_force");

console.log(`UTF Total: ${breakdown.total}`);
console.log(`  Ability: ${breakdown.abilityMod}`);
console.log(`  Trained: ${breakdown.trained}`);
console.log(`  Focus: ${breakdown.focus}`);
```

### Creating a Custom Macro

```javascript
// Macro: Roll Perception for selected token
const actor = canvas.tokens.controlled[0]?.actor;
if (!actor) {
  ui.notifications.warn("Select a token first!");
  return;
}

await SWSE.SkillSystem.rollSkill(actor, "perception");
```

### Checking Force Powers

```javascript
const actor = game.actors.getName("Sith Lord");

if (SWSE.ForcePowerManager.hasForceSensitivity(actor)) {
  const suiteSize = SWSE.ForcePowerManager.calculateForceSuiteSize(actor);
  const currentPowers = actor.items.filter(i => i.type === "forcepower").length;

  console.log(`Force Suite: ${currentPowers}/${suiteSize} powers`);
}
```

---

## Version Compatibility

This namespace reference is for **SWSE System v2.x** running on **Foundry VTT v13+**.

API methods marked with `async` return Promises and should be awaited.
