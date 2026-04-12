# PROGRESSION FRAMEWORK INSTRUMENTATION SPECIFICATION

**Status:** Ready to implement  
**Purpose:** Capture errors, state drift, async races, and hydration failures  
**Removability:** All changes marked with `// [DEBUG]` for easy cleanup

---

## GLOBAL SETUP

### File: scripts/apps/progression-framework/shell/progression-shell.js

**Add import at line 44 (after existing imports):**

```javascript
import { ProgressionDebugCapture } from '../debug/progression-debug-capture.js';
```

**Add call in constructor or earliest initialization (around line ~200):**

```javascript
// [DEBUG] Initialize global error capture
if (!window._progressionDebugEnabled) {
  window._progressionDebugEnabled = true;
  ProgressionDebugCapture.init();
}
```

---

## INSTRUMENTATION POINTS

### 1. PROGRESSION SHELL: _onFocusItem()

**File:** `scripts/apps/progression-framework/shell/progression-shell.js`  
**Function:** `_onFocusItem(event, target)`  
**Lines:** 1666-1710

**Add at line 1666 (start of method):**

```javascript
async _onFocusItem(event, target) {
  // [DEBUG] Click sequence tracking
  const clickNum = ProgressionDebugCapture.nextClickSequence();
  const stepId = this.steps[this.currentStepIndex]?.stepId;
  ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] _onFocusItem START`, {
    step: stepId,
    eventTarget: event?.target?.className?.slice(0, 40),
  });
```

**Add at line 1669 (after _resolveInteractionItemId call):**

```javascript
const { element, row, itemId, matchedAttribute } = this._resolveInteractionItemId(target, event);

// [DEBUG] Log resolved itemId
ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] Resolved itemId`, {
  itemId,
  found: !!itemId,
  matchedAttribute,
  rowTag: row?.tagName,
});
```

**Add at line 1707 (after plugin check, before plugin.onItemFocused call):**

```javascript
const plugin = this.stepPlugins.get(stepId);
if (plugin) {
  // [DEBUG] Log before delegating to plugin
  ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] Calling plugin.onItemFocused()`, {
    pluginClass: plugin.constructor.name,
    itemId,
  });
  
  try {
    await plugin.onItemFocused(itemId, this);
    ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] plugin.onItemFocused() completed`, {
      focusedItem_id: this.focusedItem?.id ?? '(null)',
      focusedItem_name: this.focusedItem?.name ?? '(null)',
    });
  } catch (focusErr) {
    ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] plugin.onItemFocused() threw`, {
      error: focusErr.message,
      stack: focusErr.stack?.split('\n').slice(0, 3).join(' | '),
    });
    throw focusErr; // Re-throw after logging
  }
}
```

---

### 2. PROGRESSION SHELL: _prepareContext()

**File:** `scripts/apps/progression-framework/shell/progression-shell.js`  
**Function:** `async _prepareContext(options)`  
**Lines:** 705-927

**Add at line 705 (start of method):**

```javascript
async _prepareContext(options) {
  // [DEBUG] Render cycle tracking
  const renderNum = ProgressionDebugCapture.nextRenderCycle();
  ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] _prepareContext START`, {
    step: this.steps[this.currentStepIndex]?.stepId,
    focusedItem_id: this.focusedItem?.id ?? '(null)',
    focusedItem_name: this.focusedItem?.name ?? '(null)',
  });
  
  ProgressionDebugCapture.updateState(this);
```

**Add at line 719 (after context.focusedItem = this.focusedItem):**

```javascript
context.focusedItem = this.focusedItem;

// [DEBUG] Log context state
ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Context focusedItem set`, {
  focusedItem_id: context.focusedItem?.id ?? '(null)',
  focusedItem_keys: context.focusedItem ? Object.keys(context.focusedItem).slice(0, 6) : [],
});
```

**Add at line 809 (before renderDetailsPanel call):**

```javascript
// Details panel
ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Calling renderDetailsPanel()`, {
  plugin: currentPlugin?.constructor?.name ?? '(null)',
  focusedItem_id: this.focusedItem?.id ?? '(null)',
});

const detailsPanelSpec = currentPlugin?.renderDetailsPanel(this.focusedItem)
  ?? { template: null, data: {} };

// [DEBUG] Log template spec
ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] renderDetailsPanel() returned`, {
  has_template: !!detailsPanelSpec?.template,
  template_path: detailsPanelSpec?.template?.split('/').pop() ?? '(null)',
  data_keys: detailsPanelSpec?.data ? Object.keys(detailsPanelSpec.data).slice(0, 8) : [],
});
```

**Add at line 812 (after template render):**

```javascript
const detailsPanelHtml = detailsPanelSpec?.template
  ? await foundry.applications.handlebars.renderTemplate(detailsPanelSpec.template, detailsPanelSpec.data)
  : null;

// [DEBUG] Log HTML result
ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Template HTML rendered`, {
  html_length: detailsPanelHtml?.length ?? 0,
  has_species_details: detailsPanelHtml?.includes?.('prog-species-details') ?? false,
  has_empty_state: detailsPanelHtml?.includes?.('prog-details-empty') ?? false,
  focusedItem_name_in_html: this.focusedItem?.name ? detailsPanelHtml?.includes?.(this.focusedItem.name) : 'N/A',
});

// [DEBUG] State drift check
ProgressionDebugCapture.detectStateDrift(
  !detailsPanelHtml && this.focusedItem,
  'Details panel HTML is null/empty but focusedItem exists',
  { focusedItem: this.focusedItem?.name }
);
```

**Add at end of method (before return context):**

```javascript
ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] _prepareContext COMPLETE`);

return context;
```

---

### 3. SPECIES STEP: onItemFocused()

**File:** `scripts/apps/progression-framework/steps/species-step.js`  
**Function:** `async onItemFocused(id, shell)`  
**Lines:** 438-481

**Replace the entire function with instrumented version:**

```javascript
async onItemFocused(id, shell) {
  // [DEBUG] Click sequence tracking
  const clickNum = ProgressionDebugCapture?.nextClickSequence?.() ?? 0;
  console.log(`[SWSE Species Debug] [Click #${clickNum}] onItemFocused START`, { id });
  
  const entry = this._resolveSpeciesEntry(id);
  
  // [DEBUG] Log resolution
  console.log(`[SWSE Species Debug] [Click #${clickNum}] _resolveSpeciesEntry result`, {
    found: !!entry,
    entry_id: entry?.id ?? '(null)',
    entry_name: entry?.name ?? '(null)',
    entry_keys: entry ? Object.keys(entry).slice(0, 8) : [],
    has_abilityScores: !!entry?.abilityScores,
  });
  
  if (!entry) {
    console.error(`[SpeciesStep] ✗ onItemFocused: no registry entry for id "${id}" — focus ignored`);
    console.error(`[SWSE Species Debug] [Click #${clickNum}] Entry resolution FAILED`);
    return;
  }

  console.log('[SpeciesStep] ✓ Species focused:', entry.name);
  console.log('[SpeciesStep]   Species data:', {
    id: entry.id,
    name: entry.name,
    size: entry.size,
    source: entry.source,
    abilityScores: entry.abilityScores,
    abilities: Array.isArray(entry.abilities) ? entry.abilities.length : 0,
    languages: Array.isArray(entry.languages) ? entry.languages.length : 0,
  });

  // CRITICAL: Verify abilityScores are non-zero (parsing worked)
  const hasNonZeroAbilities = Object.values(entry.abilityScores || {}).some(v => v !== 0);
  if (!hasNonZeroAbilities) {
    swseLogger.warn('[SpeciesStep] ⚠ WARNING: Species has no non-zero ability modifiers', {
      abilityScores: entry.abilityScores,
      species: entry.name,
    });
  }

  // [DEBUG] Log before focusedItem assignment
  console.log(`[SWSE Species Debug] [Click #${clickNum}] About to set shell.focusedItem`, {
    previous_id: shell.focusedItem?.id ?? '(null)',
    new_id: entry.id,
  });
  
  shell.focusedItem = entry;
  
  console.log(`[SWSE Species Debug] [Click #${clickNum}] shell.focusedItem assigned`, {
    current_id: shell.focusedItem?.id,
    current_name: shell.focusedItem?.name,
  });

  // Look up Ol' Salty dialogue for species name
  const dialogue = this._getOlSaltyDialogue(entry.name);
  
  // [DEBUG] Log dialogue lookup
  console.log(`[SWSE Species Debug] [Click #${clickNum}] Dialogue lookup for "${entry.name}"`, {
    dialogue_found: !!dialogue,
    dialogue_type: typeof dialogue,
    dialogue_length: typeof dialogue === 'string' ? dialogue.length : null,
    dialogue_first_30: typeof dialogue === 'string' ? dialogue.slice(0, 30) : null,
  });
  
  if (dialogue) {
    console.log('[SpeciesStep] ✓ Found mentor dialogue for', entry.name);
    
    // [DEBUG] Log before speak call
    console.log(`[SWSE Species Debug] [Click #${clickNum}] About to call shell.mentorRail.speak()`, {
      mentor_isAnimating_before: shell.mentor?.isAnimating ?? '(null)',
      mentor_currentDialogue_before: shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
    });
    
    try {
      await shell.mentorRail.speak(dialogue, 'encouraging');
      console.log(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() completed`);
    } catch (speakErr) {
      console.error(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() threw:`, speakErr);
      console.error(`[SWSE Species Debug] [Click #${clickNum}] Speak error details:`, {
        message: speakErr.message,
        stack: speakErr.stack?.split('\n').slice(0, 4).join(' | '),
      });
      // LOG BUT RETHROW - don't swallow the error
      throw speakErr;
    }
  } else {
    console.log('[SpeciesStep] ⚠ No mentor dialogue found for', entry.name);
    console.log(`[SWSE Species Debug] [Click #${clickNum}] No dialogue, skipping speak()`);
  }

  console.log('[SpeciesStep] Triggering shell.render() to update detail panel');
  console.log('[SpeciesStep] shell.focusedItem is now:', shell.focusedItem);
  
  // [DEBUG] Log before render
  console.log(`[SWSE Species Debug] [Click #${clickNum}] About to call shell.render()`, {
    focusedItem_id: shell.focusedItem?.id,
    focusedItem_name: shell.focusedItem?.name,
  });
  
  shell.render();
  
  console.log(`[SWSE Species Debug] [Click #${clickNum}] onItemFocused COMPLETE`);
}
```

---

### 4. SPECIES STEP: renderDetailsPanel()

**File:** `scripts/apps/progression-framework/steps/species-step.js`  
**Function:** `renderDetailsPanel(focusedItem)`  
**Lines:** 311-432

**Add at line 313 (after initial log):**

```javascript
swseLogger.log('[SpeciesStep] ===== HYDRATION START: renderDetailsPanel() =====');

// [DEBUG] Entry logging
console.log('[SWSE Details Debug] renderDetailsPanel() called with:', {
  focusedItem_present: !!focusedItem,
  focusedItem_id: focusedItem?.id ?? '(null)',
  focusedItem_name: focusedItem?.name ?? '(null)',
  focusedItem_keys: focusedItem ? Object.keys(focusedItem).slice(0, 8) : [],
});
```

**Add at line 331 (after species = _resolveSpeciesEntry):**

```javascript
const species = this._resolveSpeciesEntry(focusedItem);

// [DEBUG] Log resolution result
console.log('[SWSE Details Debug] _resolveSpeciesEntry(focusedItem) result:', {
  species_found: !!species,
  species_id: species?.id ?? '(null)',
  species_name: species?.name ?? '(null)',
  species_keys: species ? Object.keys(species).slice(0, 8) : [],
});
```

**Add in error branch at line 332:**

```javascript
if (!species) {
  console.error('[SWSE Details Debug] FAIL: _resolveSpeciesEntry returned null', {
    focusedItem_id: focusedItem?.id,
    focusedItem_name: focusedItem?.name,
    focusedItem_keys: focusedItem ? Object.keys(focusedItem) : [],
  });
  swseLogger.error('[SpeciesStep] FAIL: Registry lookup failed', {
    attemptedId: focusedItem.id,
    registryEntries: SpeciesRegistry.getAll()?.length ?? 0,
  });
  return this.renderDetailsPanelEmptyState();
}
```

**Add at line 417-419 (when returning template spec):**

```javascript
const templateSpec = {
  template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/species-details.hbs',
  data: detailsData,
};

// [DEBUG] Log final template spec
console.log('[SWSE Details Debug] Template spec built successfully:', {
  template_path: templateSpec.template.split('/').pop(),
  data_keys: Object.keys(templateSpec.data).slice(0, 10),
  has_mentorProse: !!detailsData.mentorProse,
  has_species: !!detailsData.species,
  abilityRows_count: detailsData.abilityRows?.length ?? 0,
  abilities_count: detailsData.abilities?.length ?? 0,
});
```

---

### 5. MENTOR RAIL: speak()

**File:** `scripts/apps/progression-framework/shell/mentor-rail.js`  
**Function:** `async speak(text, mood = null)`  
**Lines:** 38-71

**Add at line 39 (after if (!text) check):**

```javascript
async speak(text, mood = null) {
  if (!text) return;
  
  // [DEBUG] Sequence tracking
  const speakNum = ProgressionDebugCapture?.nextMentorSpeak?.() ?? 0;
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() called`, {
    text_length: text.length,
    text_first_40: text.slice(0, 40),
    mood: mood,
    isAnimating_before: this.shell.mentor?.isAnimating ?? '(null)',
    currentDialogue_before: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
    has_prior_abort: !!this._animationAbort,
  });
```

**Add at line 48-49 (when handling prior animation):**

```javascript
// Abort any in-flight animation
if (this._animationAbort) {
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Aborting prior animation`, {
    prior_signal_aborted: this._animationAbort.signal?.aborted ?? '(unknown)',
  });
  this._animationAbort.abort();
}

this._animationAbort = new AbortController();
const { signal } = this._animationAbort;

console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] New AbortController created`, {
  signal_aborted: signal.aborted,
});
```

**Add at line 53-54 (when finding DOM container):**

```javascript
// Find dialogue container in live DOM
const container = shell.element?.querySelector('[data-mentor-dialogue]');

// [DEBUG] DOM search logging
console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] DOM container search`, {
  shell_element_exists: !!shell.element,
  mentor_dialogue_found: !!container,
  container_tag: container?.tagName ?? '(null)',
});

if (!container || signal.aborted) {
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Early return`, {
    container: !!container,
    signal_aborted: signal.aborted,
  });
  return;
}
```

**Add at line 56-57 (before try block):**

```javascript
try {
  // [DEBUG] Pre-render logging
  const mentorTextNode = container.querySelector('[data-mentor-text]');
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] About to call MentorTranslationIntegration.render()`, {
    mentor_text_element: !!mentorTextNode,
    mentor_text_tag: mentorTextNode?.tagName ?? '(null)',
  });
```

**Add in onComplete callback (line 61-66):**

```javascript
        onComplete: () => {
          // [DEBUG] Callback execution logging
          console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] onComplete callback fired`, {
            signal_aborted: signal.aborted,
            isAnimating_before_cleanup: this.shell.mentor?.isAnimating ?? '(null)',
          });
          
          if (!signal.aborted) {
            console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal NOT aborted, executing cleanup`);
            this.shell.mentor.animationState = 'complete';
            this.shell.mentor.isAnimating = false;
          } else {
            console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal WAS aborted, skipping cleanup`);
          }
        },
```

**Add after try/catch closes (around line 70):**

```javascript
} catch (e) {
  console.error(`[SWSE Mentor Debug] [Speak #${speakNum}] MentorTranslationIntegration.render() threw:`, {
    error_message: e.message,
    error_type: e.constructor.name,
    stack_first_5_lines: e.stack?.split('\n').slice(0, 5).join(' | '),
    signal_aborted: signal.aborted,
  });
  if (!signal.aborted) console.warn('[MentorRail] speak error', e);
}

// [DEBUG] Final state logging
console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() completed`, {
  final_isAnimating: this.shell.mentor?.isAnimating ?? '(null)',
  final_currentDialogue: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
  signal_aborted: signal.aborted,
});
```

---

## REPRO STEPS TO RUN

After instrumentation is complete:

1. **Open browser console** (F12 / DevTools)
2. **Open Foundry → Start Character Creation**
3. **Navigate to Species step**
4. **Click on "Human"**
   - Look for `[SWSE Species Debug] [Click #1]` logs
   - Verify Salty speaks
   - Verify details render
5. **Immediately click on another species** (e.g., Bothan, Rodian)
   - Look for `[SWSE Species Debug] [Click #2]` logs
   - Look for `[SWSE Mentor Debug]` logs showing animation state
   - Look for any `[SWSE Error]` or thrown errors
6. **Copy console output** and provide it

---

## CONSOLE LOG PATTERNS TO WATCH FOR

### Successful first click:
```
[SWSE Species Debug] [Click #1] onItemFocused START
[SWSE Species Debug] [Click #1] _resolveSpeciesEntry result { found: true, entry_name: "Human" }
[SWSE Species Debug] [Click #1] Dialogue lookup { dialogue_found: true }
[SWSE Mentor Debug] [Speak #1] speak() called
[SWSE Mentor Debug] [Speak #1] onComplete callback fired { signal_aborted: false }
[SWSE Details Debug] renderDetailsPanel() called with { focusedItem_id: "human" }
[SWSE Details Debug] Template spec built successfully
```

### Race condition indicator:
```
[SWSE Species Debug] [Click #1] onItemFocused START
[SWSE Mentor Debug] [Speak #1] speak() called { isAnimating_before: false }
[SWSE Species Debug] [Click #2] onItemFocused START  ← Before Click #1 completes
[SWSE Mentor Debug] [Speak #2] speak() called { isAnimating_before: true }  ← Still animating!
[SWSE Mentor Debug] [Speak #2] Aborting prior animation
[SWSE Mentor Debug] [Speak #1] onComplete callback fired { signal_aborted: true }
```

### Missing dialogue:
```
[SWSE Species Debug] [Click #2] Dialogue lookup { dialogue_found: false, dialogue_type: "object" }
[SWSE Species Debug] [Click #2] No dialogue, skipping speak()
[SWSE Species Debug] [Click #2] About to call shell.render()
[SWSE Details Debug] renderDetailsPanel() called
```

### Thrown error:
```
[SWSE Error] Uncaught error { message: "Cannot read property 'querySelector' of null" }
[SWSE Error] thrown from: mentor-rail.js:59
```

---

## CLEANUP

To remove all instrumentation:
1. Search for `// [DEBUG]` in all modified files
2. Delete those blocks
3. Delete `scripts/apps/progression-framework/debug/progression-debug-capture.js`
4. Delete this file (`INSTRUMENTATION_SPEC.md`)
5. Remove import from `progression-shell.js`

All changes are reversible with zero logic impact.
