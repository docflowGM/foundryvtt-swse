# Suggestion Engine + Build Intent Integration

## Current Architecture Gap

**Problem:** The suggestion engine is disconnected from chargen choices.

### Current Flow (BROKEN)
```
Step Plugin:
  getSuggestedFeats() {
    await SuggestionService.getSuggestions(actor, 'chargen', {
      domain: 'feats',
      available: availableFeats
      // ❌ MISSING: pendingData with committed selections!
    })
  }
```

The step plugin calls `SuggestionService.getSuggestions()` but **does NOT pass the chargen choices made so far**.

### What's Missing
- **pendingData**: Should contain selectedClass, selectedFeats, selectedTalents, selectedSkills
- **Source**: Progression shell has `committedSelections` Map, but doesn't share it with step plugins
- **Impact**: Suggestions are made in a vacuum; suggestion engine doesn't know the build-in-progress

---

## Required Fix

### 1. Enrich Shell Context (progression-shell.js)

The `_prepareContext()` method should include shell state:

```javascript
async _prepareContext(options) {
  const context = await super._prepareContext(options);

  // ✓ Add shell context for step plugins
  context.shell = this;  // Access to committedSelections, actor, mode, etc.
  context.actor = this.actor;
  context.mode = this.mode;  // 'chargen' or 'levelup'

  return context;
}
```

### 2. Extract ChargenData in Step Plugins (feat-step, talent-step, etc.)

```javascript
import { SuggestionContextBuilder } from '...suggestion-context-builder.js';

async _getSuggestedFeats(actor, shell, availableFeats) {
  try {
    // ✓ Build chargenData from shell's committedSelections
    const characterData = this._buildCharacterDataFromShell(shell);

    const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
      domain: 'feats',
      available: availableFeats,
      pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
      engineOptions: { includeFutureAvailability: true },
      persist: true
    });

    return (suggested || []).slice(0, TOP_SUGGESTIONS);
  } catch (err) {
    console.warn('[FeatStep] Suggestion service error:', err);
    return [];
  }
}

_buildCharacterDataFromShell(shell) {
  const committedSelections = shell?.committedSelections || new Map();

  return {
    classes: [committedSelections.get('class')],
    species: committedSelections.get('species'),
    feats: committedSelections.get('feats') || [],
    talents: committedSelections.get('talents') || [],
    skills: committedSelections.get('skills') || {},
    abilities: committedSelections.get('attributes') || {},
    // ... other selections
  };
}
```

### 3. Update Step Plugin getStepData Signature

Steps receive shell context and can pass it along:

```javascript
async getStepData(context) {
  // context now includes: actor, shell, mode
  const shell = context.shell;

  // Build suggestions with full chargen context
  this._suggestedFeats = await this._getSuggestedFeats(
    context.actor,
    shell,
    this._availableFeats
  );

  return {
    feats: this._filteredFeats,
    suggested: this._suggestedFeats,
    // ...
  };
}
```

---

## Benefits

1. **Coherent Suggestions**: Mentor recommendations match actual build choices
2. **Build Intent Awareness**: Suggestion engine understands player's direction
3. **Better Fallbacks**: If no mentors chosen yet, suggestions adapt as choices are made
4. **Mentor Synergy**: Mentor can reference "You chose X class, so here's Y talent"

---

## Implementation Steps

1. [ ] Update ProgressionShell._prepareContext() to expose shell context
2. [ ] Update all step plugins to accept and pass shell context
3. [ ] Update feat-step.js to extract and pass characterData
4. [ ] Update talent-step.js to extract and pass characterData
5. [ ] Update other steps that call SuggestionService (force-power, force-secret, etc.)
6. [ ] Test: Verify suggestions change as choices are made in chargen
7. [ ] Test: Verify build intent is reflected in mentor advice

---

## Files to Modify

- scripts/apps/progression-framework/shell/progression-shell.js
- scripts/apps/progression-framework/steps/feat-step.js
- scripts/apps/progression-framework/steps/talent-step.js
- scripts/apps/progression-framework/steps/force-power-step.js
- scripts/apps/progression-framework/steps/force-secret-step.js
- scripts/apps/progression-framework/steps/force-technique-step.js
- scripts/apps/progression-framework/steps/attribute-step.js (if it calls suggestions)
- scripts/apps/progression-framework/steps/language-step.js (if it calls suggestions)
- scripts/apps/progression-framework/steps/starship-maneuver-step.js
