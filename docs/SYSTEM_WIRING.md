# System Wiring — Phase 8

## Overview

Phase 8 ensures that **every UI action correctly updates actor data and persists**. No more ghost UI, desync bugs, or lost selections.

Three core utilities:
1. **UpdatePipeline** — Central control for all mutations
2. **ProgressionStatePersistence** — Saves progression state to actor flags
3. **HydrationGuarantee** — Ensures UI always reflects actor truth

---

## The Problem We're Solving

**Before Phase 8:**
- ❌ UI updates but actor doesn't → ghost UI
- ❌ Actor updates but UI doesn't → desync
- ❌ Step resets on navigate → lost state
- ❌ Double-click required to register selection
- ❌ Selections lost on page reload

**After Phase 8:**
- ✅ Every click → actor updates
- ✅ Every update → UI re-hydrates
- ✅ State saved in actor flags
- ✅ Single click works
- ✅ Selections survive reloads

---

## UpdatePipeline: The Central Mutation Hub

All actor mutations must flow through UpdatePipeline.

### Single Update

```javascript
import { UpdatePipeline } from './scripts/engine/core/UpdatePipeline.js';

// ❌ OLD (direct mutation)
actor.system.skills.acrobatics.trained = true;

// ✅ NEW (via pipeline)
await UpdatePipeline.apply(actor, "system.skills.acrobatics.trained", true);
```

### Batch Updates

```javascript
// ❌ Multiple separate calls
await UpdatePipeline.apply(actor, "system.class", "Soldier");
await UpdatePipeline.apply(actor, "system.level", 1);

// ✅ Single batch operation
await UpdatePipeline.applyBatch(actor, {
  "system.class": "Soldier",
  "system.level": 1
});
```

### Array Operations

```javascript
// Add feat
await UpdatePipeline.addToArray(actor, "system.feats", "great-fortitude");

// Remove feat
await UpdatePipeline.removeFromArray(actor, "system.feats",
  feat => feat === "great-fortitude"
);

// Toggle boolean
await UpdatePipeline.toggle(actor, "system.forceSensitive");

// Increment value
await UpdatePipeline.increment(actor, "system.level", 1);
```

### Flags (Progression State)

```javascript
// Set flag
await UpdatePipeline.setFlag(actor, "swse", "theme", "neon");

// Get flag
const theme = UpdatePipeline.getFlag(actor, "swse", "theme");
```

---

## ProgressionStatePersistence: Never Lose Progress

Progression state is saved in actor flags, surviving reloads and navigation.

### Save Current Step

```javascript
import { ProgressionStatePersistence } from './scripts/engine/core/ProgressionStatePersistence.js';

// Move to next step
await ProgressionStatePersistence.setCurrentStep(actor, "skills-step");

// Mark step complete
await ProgressionStatePersistence.markStepComplete(actor, "abilities-step");
```

### Save Selections

```javascript
// User selects a species
await ProgressionStatePersistence.saveSelection(actor, "species", "Human");

// User selects a class
await ProgressionStatePersistence.saveSelection(actor, "class", "Soldier");

// Get a selection back
const species = ProgressionStatePersistence.getSelection(actor, "species");

// Get all selections at once
const allSelections = ProgressionStatePersistence.getAllSelections(actor);
```

### Check Progress

```javascript
// Is step complete?
const isDone = ProgressionStatePersistence.isStepComplete(actor, "abilities-step");

// What's current step?
const current = ProgressionStatePersistence.getCurrentStep(actor);

// What steps are done?
const completed = ProgressionStatePersistence.getCompletedSteps(actor);
```

### Reset/Rewind

```javascript
// Start fresh
await ProgressionStatePersistence.clearSelections(actor);

// Go back to a step
await ProgressionStatePersistence.rewindToStep(actor, "abilities-step");
```

---

## HydrationGuarantee: UI Always True to Data

Ensures UI never gets out of sync with actor state.

### Attach Hydration to Sheet

```javascript
import { HydrationGuarantee } from './scripts/engine/core/HydrationGuarantee.js';

class MySheet extends ActorSheet {
  activateListeners(html) {
    super.activateListeners(html);
    
    // Re-render whenever actor changes
    HydrationGuarantee.attachHydrationListener(this, 'actor');
  }
}
```

### Always Get Fresh Data

```javascript
// In getData()
async getData() {
  // Get fresh actor from database
  const actor = HydrationGuarantee.refreshActor(this.actor);
  
  // Build view model from fresh data
  const vm = await HydrationGuarantee.buildFreshViewModel(actor, async (a) => {
    return await this.buildViewModel(a);
  });
  
  return { actor, vm };
}
```

### Detect Desync

```javascript
// Check if UI state differs from actor state
const diffs = HydrationGuarantee.detectDesync(
  this.actor,
  this.uiState,
  ['system.class', 'system.level', 'system.skills']
);

if (diffs.length > 0) {
  console.warn('Desync detected:', diffs);
  HydrationGuarantee.forceRefresh(this);
}
```

### Force Refresh

```javascript
// After critical update, force fresh render
await UpdatePipeline.apply(actor, "system.level", 1);
HydrationGuarantee.forceRefresh(this);
```

---

## Integration Pattern

The correct flow for any UI action:

```
1. User clicks button
   ↓
2. Button handler fires
   ↓
3. Validate action
   ↓
4. UpdatePipeline.apply() → actor updates
   ↓
5. (For progression) ProgressionStatePersistence.saveSelection()
   ↓
6. HydrationGuarantee.forceRefresh() or wait for actor update event
   ↓
7. UI re-renders from fresh actor data
   ↓
8. User sees result immediately
```

---

## Example: Feat Selection

### Before Phase 8

```javascript
// ❌ Direct mutation, no persistence
async selectFeat(featId) {
  const feats = this.actor.system.feats || [];
  feats.push(featId);
  this.actor.system.feats = feats;  // Mutates, doesn't persist
  this.render(false);
}
```

### After Phase 8

```javascript
// ✅ Via pipeline, with persistence
async selectFeat(featId) {
  try {
    // Update actor
    await UpdatePipeline.addToArray(this.actor, "system.feats", featId);
    
    // Save to progression state
    await ProgressionStatePersistence.saveSelection(
      this.actor,
      "selectedFeat",
      featId
    );
    
    // Re-hydrate UI
    HydrationGuarantee.forceRefresh(this);
    
  } catch (err) {
    console.error('Failed to select feat:', err);
  }
}
```

---

## Common Fixes

### Fix 1: Double-Click Required

**Problem:** Selection only registers on second click

**Solution:** Ensure UpdatePipeline is used and re-render happens:

```javascript
// ✅ Correct
element.addEventListener('click', async (e) => {
  e.preventDefault();
  await UpdatePipeline.apply(this.actor, path, value);
  HydrationGuarantee.forceRefresh(this);
});
```

### Fix 2: Step Resets

**Problem:** Going back to previous step loses selections

**Solution:** Use ProgressionStatePersistence:

```javascript
// ✅ Correct
async goToStep(stepId) {
  await ProgressionStatePersistence.setCurrentStep(this.actor, stepId);
  HydrationGuarantee.forceRefresh(this);
}
```

### Fix 3: Lost Selections on Reload

**Problem:** Selections disappear after page reload

**Solution:** Save to actor flags via ProgressionStatePersistence:

```javascript
// ✅ Correct
const saved = ProgressionStatePersistence.getSelection(this.actor, "species");
// Persists across reloads
```

### Fix 4: UI Not Updating

**Problem:** Actor changes but UI doesn't reflect it

**Solution:** Attach hydration listener:

```javascript
// ✅ Correct
HydrationGuarantee.attachHydrationListener(this, 'actor');
// Now UI auto-re-renders on any actor update
```

### Fix 5: Desync After Rapid Clicks

**Problem:** Multiple rapid clicks cause UI/actor mismatch

**Solution:** Use batch updates and hydration debounce:

```javascript
// ✅ Correct
const updateFn = HydrationGuarantee.debounceHydration(
  () => HydrationGuarantee.forceRefresh(this),
  100
);

element.addEventListener('click', async (e) => {
  e.preventDefault();
  await UpdatePipeline.apply(this.actor, path, value);
  updateFn();  // Debounced refresh
});
```

---

## Checklist for Phase 8 Integration

For each interactive surface (sheet, step, dialog):

- [ ] All actor updates go through `UpdatePipeline.apply()`
- [ ] All progression state uses `ProgressionStatePersistence`
- [ ] Hydration listener attached in `activateListeners()`
- [ ] `getData()` uses `HydrationGuarantee.buildFreshViewModel()`
- [ ] No direct `actor.system` mutations
- [ ] No `@click` handlers that skip pipeline
- [ ] Button handlers `await` the pipeline call
- [ ] Re-render or refresh called after updates
- [ ] Selections persist in actor flags
- [ ] Steps don't reset on navigation

---

## Debugging

### Detect Missing Pipeline

```javascript
// If you see this pattern in code, it needs fixing:
actor.system.foo = bar;  // ❌ Missing pipeline

// Should be:
await UpdatePipeline.apply(actor, "system.foo", bar);  // ✅
```

### Detect Desync

```javascript
// If UI doesn't reflect actor changes:
HydrationGuarantee.detectDesync(actor, uiState, [
  'system.class',
  'system.level',
  'system.feats'
]);

// Will log which fields differ
```

### Enable Debug Logging

```javascript
import { SWSELogger } from './scripts/utils/logger.js';

SWSELogger.setLevel('debug');
// Now all pipeline operations log their actions
```

---

## Success Criteria

After Phase 8:

✅ **No Ghost UI** — Everything the UI shows is backed by actor data
✅ **No Desync** — UI always reflects current actor state
✅ **Single Click Works** — No need for double-click confirmation
✅ **State Persists** — Reload doesn't lose progress
✅ **Navigation Stable** — Steps don't reset
✅ **Immediate Feedback** — Users see results instantly
✅ **System Cohesive** — Everything feels connected

The system is now **fully wired** and ready for content expansion.
