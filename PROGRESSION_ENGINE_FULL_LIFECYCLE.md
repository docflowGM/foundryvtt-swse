# PROGRESSION ENGINE FULL-LIFECYCLE INSTRUMENTATION

**Status:** Specification Ready to Implement  
**Scope:** Complete user journey from first selection through summary generation  
**Purpose:** Make the progression engine incapable of silently drifting across state boundaries

---

## EXECUTIVE SUMMARY

The progression engine has 3 major sources of silent bugs:

1. **Selection → Commit Gap** - User selects, but selection doesn't stick or doesn't reach downstream
2. **Commit → Hydration Gap** - Previous step saved state, but next step reads stale/wrong data
3. **Hydration → Summary Gap** - Individual steps correct, but summary assembles from scattered sources

This instrumentation makes all 3 gaps visible with exact log traces of WHAT was selected, WHERE it was stored, WHAT was read, and WHERE it diverged.

---

## FULL PROGRESSION LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER PROGRESSION JOURNEY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  STEP 1: Species Selection                                       │
│  ├─ [SWSE Selection Debug] User clicks species                  │
│  ├─ [SWSE Selection Debug] Species resolved from registry       │
│  ├─ [SWSE Selection Debug] Shell.focusedItem = species          │
│  ├─ [SWSE Hydration Debug] Details rail rendered with species   │
│  └─ [SWSE Mentor Debug] Mentor speaks about species             │
│                                                                   │
│  ACTION: Click "Next Step" / "Continue"                          │
│  ├─ [SWSE Navigation Debug] Validate step: can we advance?      │
│  ├─ [SWSE Step Debug] onStepExit(species): save state           │
│  ├─ [SWSE SSOT Debug] Commit to committedSelections.species     │
│  └─ [SWSE Navigation Debug] Navigate to next step               │
│                                                                   │
│  STEP 2: Class Selection                                         │
│  ├─ [SWSE Navigation Debug] onStepEnter(class): hydrate from?   │
│  ├─ [SWSE Hydration Debug] Class list rendered                  │
│  ├─ [SWSE Selection Debug] User clicks class                    │
│  ├─ [SWSE Selection Debug] Class resolved from registry          │
│  ├─ [SWSE Hydration Debug] Details rail updated with class info │
│  ├─ [SWSE Hydration Debug] Mentor reacts to class choice        │
│  └─ [SWSE Hydration Debug] Suggestions regenerated              │
│                                                                   │
│  ... (continue through all steps) ...                            │
│                                                                   │
│  FINAL: Summary Step                                             │
│  ├─ [SWSE Summary Debug] Summary generation START               │
│  ├─ [SWSE SSOT Debug] Read species from committedSelections     │
│  ├─ [SWSE SSOT Debug] Read class from committedSelections       │
│  ├─ [SWSE SSOT Debug] Read languages from committedSelections   │
│  ├─ [SWSE Summary Debug] All sections assembled                 │
│  ├─ [SWSE Summary Debug] Summary rendered to DOM                │
│  └─ [SWSE Summary Debug] Summary generation COMPLETE            │
│                                                                   │
│  ACTION: Click "Back" to previous step                           │
│  ├─ [SWSE Navigation Debug] Retreat from summary                │
│  ├─ [SWSE Navigation Debug] onStepEnter(feats): rehydrate from? │
│  ├─ [SWSE Hydration Debug] Feats list rendered                  │
│  ├─ [SWSE Hydration Debug] Previously selected feats highlighted │
│  └─ [SWSE State Drift] Verify committed state matches UI        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## INSTRUMENTATION LAYERS

### LAYER 1: SELECTION TRACKING

**Instruments:** All step plugins' selection handlers

**What to Log:**

```javascript
// In every step's "clicked item" handler (onItemFocused equivalent)

console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] ENTRY`, {
  step_name: currentDescriptor.label,
  action_name: 'species-click' | 'class-click' | 'feat-click', // etc
  clicked_id: event.target.dataset.itemId,
  clicked_name: event.target.textContent,
  previous_value: this.focusedItem?.name ?? 'none',
  new_value: resolvedEntry?.name ?? '(pending)',
});

// After resolution
console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] Resolution`, {
  id: resolvedEntry?.id ?? 'FAILED',
  name: resolvedEntry?.name ?? 'FAILED',
  source: 'registry' | 'cached' | 'fallback' | 'FAILED',
  complete: !!resolvedEntry?.id,
  resolution_failed: !resolvedEntry,
});

// After state update
console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] State mutation`, {
  shell_focusedItem_updated: !!shell.focusedItem,
  shell_focusedItem_id: shell.focusedItem?.id ?? 'null',
  details_rail_will_update: true,
  mentor_will_update: true,
  suggestions_will_regenerate: true,
  render_will_trigger: true,
});

console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] EXIT`, {
  success: !!shell.focusedItem?.id,
  committed: false, // hasn't been saved yet
});
```

**Files to Instrument:**
- `species-step.js` → onItemFocused()
- `class-step.js` → onItemFocused()
- `background-step.js` → onItemFocused()
- `feats-step.js` → onItemFocused()
- `talents-step.js` → onItemFocused()
- `languages-step.js` → on selection change
- `l1-skills-step.js` → onItemFocused()
- `summary-step.js` → if interactive

---

### LAYER 2: SELECTION COMMIT

**Instruments:** Step commit paths (onItemCommitted)

```javascript
// In every step's "commit selection" handler

console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] Commit START`, {
  step_name: currentDescriptor.label,
  focused_item_id: this.focusedItem?.id ?? 'MISSING',
  focused_item_name: this.focusedItem?.name ?? 'MISSING',
  commit_target: 'committedSelections.species' | 'committedSelections.class', // etc
});

try {
  // Perform the commit (save to actor or session)
  await shell.commitSelection(stepId, this.focusedItem);
  
  console.log(`[SWSE Selection Debug] [Selection #${selectionNum}] Commit SUCCESS`, {
    persisted_to: 'actor.system.committedSelections' | 'progressionSession',
    can_verify_from_source: !!shell.actor?.system?.committedSelections?.[stepId],
  });
} catch (err) {
  console.error(`[SWSE Selection Debug] [Selection #${selectionNum}] Commit FAILED`, {
    error: err.message,
    stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    step: currentDescriptor.label,
    focusedItem: this.focusedItem?.name ?? 'null',
  });
  throw err;
}
```

---

### LAYER 3: STEP NAVIGATION (NEXT)

**Instruments:** Shell navigation methods

```javascript
// In progression-shell.js navigateToNextStep() or equivalent

const navNum = (window._navigationSequence = (window._navigationSequence ?? 0) + 1);

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Advance START`, {
  from_step: this.steps[this.currentStepIndex]?.label,
  from_stepId: this.steps[this.currentStepIndex]?.stepId,
  to_step: this.steps[this.currentStepIndex + 1]?.label ?? 'END',
  to_stepId: this.steps[this.currentStepIndex + 1]?.stepId ?? 'complete',
});

// Validate step can be exited
const currentPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
if (currentPlugin && currentPlugin.validateCanAdvance) {
  const validation = await currentPlugin.validateCanAdvance(this);
  console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Validation`, {
    can_advance: validation.isValid,
    blockers: validation.errors ?? [],
    warnings: validation.warnings ?? [],
  });
  
  if (!validation.isValid) {
    console.log(`[SWSE Navigation Debug] [Nav #${navNum}] BLOCKED - cannot advance`);
    return false;
  }
}

// Call onStepExit hook
console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Calling onStepExit()`, {
  step: currentPlugin?.descriptor?.label,
});

if (currentPlugin?.onStepExit) {
  await currentPlugin.onStepExit(this);
}

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] onStepExit() complete`);

// Save state before navigation
console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Persisting state before navigation`);
await this.progressionSession.save();

// Actually navigate
this.currentStepIndex++;

// Call onStepEnter hook
const nextPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Calling onStepEnter()`, {
  step: nextPlugin?.descriptor?.label,
});

if (nextPlugin?.onStepEnter) {
  await nextPlugin.onStepEnter(this);
}

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Advance COMPLETE`, {
  now_at_step: this.steps[this.currentStepIndex]?.label,
  now_at_stepId: this.steps[this.currentStepIndex]?.stepId,
});

// Trigger render
this.render();
```

---

### LAYER 4: STEP NAVIGATION (PREVIOUS)

**Instruments:** Shell backward navigation

```javascript
// In progression-shell.js navigateToPreviousStep() or equivalent

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Retreat START`, {
  from_step: this.steps[this.currentStepIndex]?.label,
  to_step: this.steps[this.currentStepIndex - 1]?.label,
});

// Move index backward
this.currentStepIndex--;

// Rehydrate from committed state
const prevPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
const previousCommittedSelection = this.actor?.system?.committedSelections?.[this.steps[this.currentStepIndex]?.stepId];

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Rehydrating from committed state`, {
  step: prevPlugin?.descriptor?.label,
  has_committed_selection: !!previousCommittedSelection,
  committed_selection_id: previousCommittedSelection?.id ?? 'null',
  committed_selection_name: previousCommittedSelection?.name ?? 'null',
});

// Load from source and verify
if (previousCommittedSelection?.id) {
  const rehydratedEntry = this._resolveEntryFromRegistry(
    this.steps[this.currentStepIndex]?.stepId,
    previousCommittedSelection.id
  );
  
  console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Rehydration lookup`, {
    lookup_success: !!rehydratedEntry,
    rehydrated_id: rehydratedEntry?.id ?? 'LOOKUP_FAILED',
    rehydrated_name: rehydratedEntry?.name ?? 'LOOKUP_FAILED',
  });
  
  if (rehydratedEntry) {
    this.focusedItem = rehydratedEntry;
  }
}

console.log(`[SWSE Navigation Debug] [Nav #${navNum}] Retreat COMPLETE`);
this.render();
```

---

### LAYER 5: HYDRATION VERIFICATION

**Instruments:** Every step's data preparation (getStepData)

```javascript
// In progression-shell.js _prepareContext() for each step

console.log(`[SWSE Hydration Debug] [Render #${renderNum}] Step hydration START`, {
  step: currentDescriptor.label,
  focusedItem_present: !!this.focusedItem,
  focusedItem_id: this.focusedItem?.id ?? 'null',
  focusedItem_source: 'UNKNOWN', // Can be enriched per step
});

const stepData = await currentPlugin.getStepData(context);

console.log(`[SWSE Hydration Debug] [Render #${renderNum}] Step data prepared`, {
  step: currentDescriptor.label,
  data_keys: Object.keys(stepData).slice(0, 15),
  has_items: !!stepData.items,
  items_count: stepData.items?.length ?? 0,
  has_selectedItem: !!stepData.selectedItem,
  has_focusedItem: !!this.focusedItem,
});

// Render work surface
const workSurfaceHtml = await foundry.applications.handlebars.renderTemplate(
  currentPlugin.getTemplate(),
  stepData
);

console.log(`[SWSE Hydration Debug] [Render #${renderNum}] Work surface rendered`, {
  step: currentDescriptor.label,
  html_length: workSurfaceHtml?.length ?? 0,
  html_empty: !workSurfaceHtml || workSurfaceHtml.length === 0,
  has_item_rows: workSurfaceHtml?.includes?.('data-item-id') ?? false,
});

// Render details rail
const detailsHtml = currentPlugin?.renderDetailsPanel?.(this.focusedItem) ?? null;

console.log(`[SWSE Hydration Debug] [Render #${renderNum}] Details rail rendered`, {
  step: currentDescriptor.label,
  details_present: !!detailsHtml,
  details_empty: !detailsHtml || detailsHtml.length === 0,
  focusedItem_in_html: this.focusedItem ? 
    detailsHtml?.includes?.(this.focusedItem.name) : 'N/A',
});

// State drift checks
if (this.focusedItem && !detailsHtml) {
  console.warn(`[SWSE State Drift] [Render #${renderNum}] Details missing despite focusedItem`, {
    step: currentDescriptor.label,
    focusedItem_id: this.focusedItem.id,
    focusedItem_name: this.focusedItem.name,
  });
}
```

---

### LAYER 6: SSOT (SOURCE-OF-TRUTH) TRACKING

**Instruments:** All data lookups across multiple sources

```javascript
// Generic SSOT lookup wrapper to use across all registries

function _logSSotLookup(stepId, lookupId, source, result) {
  const ssotNum = (window._ssotLookupSequence = (window._ssotLookupSequence ?? 0) + 1);
  
  console.log(`[SWSE SSOT Debug] [Lookup #${ssotNum}] ${source} lookup`, {
    step: stepId,
    lookup_id: lookupId,
    source_type: source, // 'registry' | 'committedSelections' | 'sessionState' | 'fallback'
    result_found: !!result,
    result_id: result?.id ?? 'NULL',
    result_name: result?.name ?? 'NULL',
    result_complete: !!result?.id && !!result?.name,
  });
  
  if (!result) {
    console.error(`[SWSE SSOT Debug] [Lookup #${ssotNum}] MISS`, {
      step: stepId,
      lookup_id: lookupId,
      source_type: source,
    });
  }
  
  return result;
}

// Usage in species-step.js
const species = _logSSotLookup(
  'species',
  focusedItem.id,
  'registry',
  SpeciesRegistry.getById(focusedItem.id)
);

// Usage in commit path
const committedSpecies = _logSSotLookup(
  'species',
  committedSelections.species?.id,
  'committedSelections',
  actor.system.committedSelections?.species
);

// Usage in summary
const speciesFromActor = _logSSotLookup(
  'species',
  actor.system.committedSelections?.species?.id,
  'actor.system.committedSelections',
  SpeciesRegistry.getById(actor.system.committedSelections?.species?.id)
);
```

---

### LAYER 7: L1 SURVEY INSTRUMENTATION

**Instruments:** L1 skills step specifically

```javascript
// In l1-skills-step.js or equivalent

async onStepEnter(shell) {
  console.log(`[SWSE Step Debug] L1 Survey onStepEnter START`);
  
  // Load existing answers from session
  const previousAnswers = shell.progressionSession?.l1SurveyAnswers ?? {};
  console.log(`[SWSE Hydration Debug] L1 Survey previous answers`, {
    questions_answered: Object.keys(previousAnswers).length,
    answer_ids: Object.keys(previousAnswers).slice(0, 10),
  });
  
  this.surveyAnswers = previousAnswers;
  console.log(`[SWSE Hydration Debug] L1 Survey hydrated from session`);
}

async onAnswerSelected(questionId, answerId, shell) {
  const selNum = (window._l1SurveySequence = (window._l1SurveySequence ?? 0) + 1);
  
  console.log(`[SWSE Selection Debug] [L1 #${selNum}] Question answered`, {
    question_id: questionId,
    answer_id: answerId,
    previous_answer: this.surveyAnswers?.[questionId] ?? 'none',
  });
  
  this.surveyAnswers[questionId] = answerId;
  
  // Trigger downstream effects
  console.log(`[SWSE Selection Debug] [L1 #${selNum}] Triggering downstream effects`, {
    mentor_update: true,
    suggestion_regen: true,
    render: true,
  });
  
  // Maybe mentor speaks about answer
  if (this._getMentorQuip(questionId, answerId)) {
    await shell.mentorRail.speak(this._getMentorQuip(questionId, answerId));
  }
  
  shell.render();
}

async onStepExit(shell) {
  console.log(`[SWSE Step Debug] L1 Survey onStepExit START`);
  
  // Persist answers
  console.log(`[SWSE SSOT Debug] Persisting L1 Survey answers`, {
    questions_count: Object.keys(this.surveyAnswers).length,
  });
  
  shell.progressionSession.l1SurveyAnswers = this.surveyAnswers;
  
  console.log(`[SWSE Step Debug] L1 Survey onStepExit COMPLETE`);
}
```

---

### LAYER 8: LANGUAGES INSTRUMENTATION

```javascript
// In languages-step.js or equivalent

async onItemFocused(languageId, shell) {
  const selNum = (window._languageSelectionSequence = (window._languageSelectionSequence ?? 0) + 1);
  
  console.log(`[SWSE Selection Debug] [Language #${selNum}] Language selected`, {
    language_id: languageId,
    current_selection_count: (shell.focusedLanguages ?? []).length,
    max_allowed: this._calculateMaxLanguages(shell),
  });
  
  // Add to focused languages
  shell.focusedLanguages = shell.focusedLanguages ?? [];
  shell.focusedLanguages.push(languageId);
  
  console.log(`[SWSE Selection Debug] [Language #${selNum}] Language added`, {
    count_now: shell.focusedLanguages.length,
    exceeds_max: shell.focusedLanguages.length > this._calculateMaxLanguages(shell),
  });
  
  shell.render();
}

async onLanguageRemoved(languageId, shell) {
  console.log(`[SWSE Selection Debug] Language removed`, {
    language_id: languageId,
    count_before: shell.focusedLanguages.length,
  });
  
  shell.focusedLanguages = shell.focusedLanguages.filter(id => id !== languageId);
  
  console.log(`[SWSE Selection Debug] Language removed complete`, {
    count_after: shell.focusedLanguages.length,
  });
  
  shell.render();
}

async onStepExit(shell) {
  console.log(`[SWSE Step Debug] Languages onStepExit START`);
  
  // Validate selections
  console.log(`[SWSE Selection Debug] Language selection validation`, {
    languages_selected: shell.focusedLanguages?.length ?? 0,
    max_allowed: this._calculateMaxLanguages(shell),
    exceeds_max: (shell.focusedLanguages?.length ?? 0) > this._calculateMaxLanguages(shell),
  });
  
  // Commit to session
  console.log(`[SWSE SSOT Debug] Persisting languages`, {
    persisting: shell.focusedLanguages ?? [],
  });
  
  shell.progressionSession.committedLanguages = shell.focusedLanguages ?? [];
  
  console.log(`[SWSE Step Debug] Languages onStepExit COMPLETE`);
}
```

---

### LAYER 9: SUMMARY GENERATION

**Instruments:** Summary step assembly

```javascript
// In summary-step.js or SelectedRailContext

static async buildSnapshot(shell, context = null) {
  const summaryNum = (window._summarybuildSequence = (window._summarybuildSequence ?? 0) + 1);
  
  console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Generation START`, {
    context,
    actor_name: shell.actor?.name,
  });
  
  const sections = [];
  
  // Read species
  console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Reading species`, {
    source: 'committedSelections',
  });
  
  const species = _logSSotLookup(
    'species',
    shell.actor?.system?.committedSelections?.species?.id,
    'committedSelections',
    await this._resolveSpecies(shell)
  );
  
  if (species) {
    sections.push({ type: 'species', data: species });
    console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Species section added`);
  } else {
    console.warn(`[SWSE Summary Debug] [Summary #${summaryNum}] Species missing`);
  }
  
  // Read class
  console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Reading class`);
  
  const characterClass = _logSSotLookup(
    'class',
    shell.actor?.system?.committedSelections?.class?.id,
    'committedSelections',
    await this._resolveClass(shell)
  );
  
  if (characterClass) {
    sections.push({ type: 'class', data: characterClass });
    console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Class section added`);
  } else {
    console.warn(`[SWSE Summary Debug] [Summary #${summaryNum}] Class missing`);
  }
  
  // Read languages
  console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Reading languages`);
  
  const languages = shell.actor?.system?.committedSelections?.languages ?? [];
  
  if (languages.length > 0) {
    sections.push({ type: 'languages', data: languages });
    console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Languages section added`, {
      count: languages.length,
    });
  } else {
    console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] No languages selected`);
  }
  
  // ... continue for all sections ...
  
  console.log(`[SWSE Summary Debug] [Summary #${summaryNum}] Generation COMPLETE`, {
    sections_count: sections.length,
    section_types: sections.map(s => s.type),
    complete: sections.length >= 5, // Expect at least 5 sections
  });
  
  return {
    snapshotSections: sections,
    summary: summaryNum,
  };
}
```

---

### LAYER 10: SUMMARY LEFT BODY TAB

```javascript
// In summary step rendering or left-body tab component

async renderLeftBodyTab(shell) {
  const tabNum = (window._summaryTabSequence = (window._summaryTabSequence ?? 0) + 1);
  
  console.log(`[SWSE Summary Debug] [Tab #${tabNum}] Left body tab render START`, {
    trigger: 'tab-activation' | 'initial-render',
  });
  
  // Determine data source
  const dataSource = shell.progressionSession?.snapshot ?? shell.actor?.system?.committedSelections;
  
  console.log(`[SWSE Summary Debug] [Tab #${tabNum}] Data source`, {
    source: 'session.snapshot' | 'actor.committedSelections',
    snapshot_exists: !!shell.progressionSession?.snapshot,
    actor_selections_exist: !!shell.actor?.system?.committedSelections,
  });
  
  // Render sections
  const sections = await this._assembleTabSections(dataSource);
  
  console.log(`[SWSE Summary Debug] [Tab #${tabNum}] Sections assembled`, {
    sections_count: sections.length,
    section_types: sections.map(s => s.type).join(','),
  });
  
  // Check for staleness
  for (const section of sections) {
    if (section.type === 'species' && !section.data?.id) {
      console.warn(`[SWSE State Drift] [Tab #${tabNum}] Species section empty`, {
        has_id: !!section.data?.id,
        has_name: !!section.data?.name,
      });
    }
  }
  
  const html = await this._renderTabHtml(sections);
  
  console.log(`[SWSE Summary Debug] [Tab #${tabNum}] Left body tab render COMPLETE`, {
    html_length: html?.length ?? 0,
    html_empty: !html || html.length === 0,
  });
  
  return html;
}
```

---

### LAYER 11: ERROR BOUNDARIES

**Instruments:** Critical paths with try/catch

```javascript
// Template the pattern for all major boundaries:

async _criticalStep(stepName, asyncFn) {
  const boundaryId = (window._errorBoundarySequence = (window._errorBoundarySequence ?? 0) + 1);
  
  try {
    console.log(`[SWSE Error] [Boundary #${boundaryId}] ${stepName} START`);
    const result = await asyncFn();
    console.log(`[SWSE Error] [Boundary #${boundaryId}] ${stepName} SUCCESS`);
    return result;
  } catch (err) {
    console.error(`[SWSE Error] [Boundary #${boundaryId}] ${stepName} FAILED`, {
      error_message: err.message,
      error_type: err.constructor.name,
      stack: err.stack?.split('\n').slice(0, 5).join(' | '),
      step: stepName,
      focusedItem_id: this.focusedItem?.id ?? 'null',
      focusedItem_name: this.focusedItem?.name ?? 'null',
      currentStep: this.currentStepIndex,
      menorState: this.mentor?.mood ?? 'unknown',
    });
    
    // Re-throw so caller can decide what to do
    throw err;
  }
}

// Usage:
await this._criticalStep('Step Advance', () => this.navigateToNextStep());
await this._criticalStep('Selection Commit', () => plugin.onItemCommitted(itemId, shell));
await this._criticalStep('Summary Build', () => SelectedRailContext.buildSnapshot(shell));
```

---

### LAYER 12: DIAGNOSTIC COUNTERS

```javascript
// Initialize in progression-shell.js constructor or global setup

window._progressionCounters = {
  // Selection & commit
  selectionSequence: 0,
  commitSequence: 0,
  focusSequence: 0,
  
  // Navigation
  navigationSequence: 0,
  renderCycle: 0,
  hydrationCycle: 0,
  
  // Details & mentor
  detailsRenderSequence: 0,
  mentorSpeakSequence: 0,
  mentorAnimationSequence: 0,
  
  // Summary
  summaryBuildSequence: 0,
  summaryRenderSequence: 0,
  summaryTabSequence: 0,
  
  // SSOT & sources
  ssotLookupSequence: 0,
  registryLookupSequence: 0,
  
  // Errors
  errorBoundarySequence: 0,
};

function getNextCounter(name) {
  window._progressionCounters[name] = (window._progressionCounters[name] ?? 0) + 1;
  return window._progressionCounters[name];
}

// Usage:
const selNum = getNextCounter('selectionSequence');
const navNum = getNextCounter('navigationSequence');
const summaryNum = getNextCounter('summaryBuildSequence');
```

---

## CONSOLE PATTERNS FOR DEBUGGING

### Pattern 1: Selection Never Commits
```
[SWSE Selection Debug] [Selection #1] ENTRY
[SWSE Selection Debug] [Selection #1] Resolution
[SWSE Selection Debug] [Selection #1] State mutation
[SWSE Selection Debug] [Selection #1] EXIT
  success: true

[SWSE Selection Debug] [Selection #1] Commit START
[SWSE Selection Debug] [Selection #1] Commit FAILED
  error: "Cannot commit: focusedItem missing"
```
**Diagnosis:** Selection landed but commit failed

### Pattern 2: Next Step Doesn't Hydrate Correctly
```
[SWSE Navigation Debug] [Nav #1] Advance START
  from_step: "Species"
  to_step: "Class"

[SWSE Navigation Debug] [Nav #1] Calling onStepEnter()
[SWSE Navigation Debug] [Nav #1] Advance COMPLETE

[SWSE Hydration Debug] [Render #2] Step hydration START
  step: "Class"
  focusedItem_present: false ← PROBLEM
  focusedItem_id: null
```
**Diagnosis:** onStepEnter didn't rehydrate from committed state

### Pattern 3: SSOT Mismatch
```
[SWSE SSOT Debug] [Lookup #1] registry lookup
  lookup_id: "species-001"
  source_type: "registry"
  result_found: true
  result_id: "species-001"

[SWSE SSOT Debug] [Lookup #2] committedSelections lookup
  lookup_id: "species-001"
  source_type: "committedSelections"
  result_found: false ← MISMATCH
  result_id: null

[SWSE State Drift] committedSelections missing species despite UI selection
```
**Diagnosis:** Species selected and visible, but not persisted

### Pattern 4: Summary Stale
```
[SWSE Summary Debug] [Summary #1] Generation START

[SWSE SSOT Debug] [Lookup #5] actor.system.committedSelections lookup
  lookup_id: "species-001"
  result_found: true

[SWSE SSOT Debug] [Lookup #6] actor.system.committedSelections lookup
  lookup_id: "class-001"
  result_found: false ← MISSING

[SWSE Summary Debug] [Summary #1] Generation COMPLETE
  sections_count: 1 ← TOO FEW
  complete: false
```
**Diagnosis:** Summary incomplete because class never committed

### Pattern 5: Details Rail Not Updating
```
[SWSE Selection Debug] [Selection #1] ENTRY
  step_name: "Species"
  details_rail_will_update: true

[SWSE Hydration Debug] [Render #2] Details rail rendered
  step: "Species"
  details_present: false ← PROBLEM
  focusedItem_in_html: false
```
**Diagnosis:** Details rail skipped or failed to render

### Pattern 6: Stale Data on Navigate Back
```
[SWSE Navigation Debug] [Nav #3] Retreat START
  from_step: "Summary"
  to_step: "Languages"

[SWSE Navigation Debug] [Nav #3] Rehydrating from committed state
  has_committed_selection: true
  committed_selection_id: "language-001"

[SWSE Hydration Debug] [Render #5] Step hydration START
  focusedItem_id: "language-001"

[SWSE Hydration Debug] [Render #5] Work surface rendered
  has_item_rows: true

[SWSE State Drift] Previously selected item not highlighted
  committed_id: "language-001"
  highlighted_id: null
```
**Diagnosis:** Item was reloaded but UI not updated

---

## FULL REPRO FLOWS

### Flow 1: Select → Advance (Happy Path)
```
1. Click species → [SWSE Selection Debug] [Selection #1]
2. Observe: resolution, state mutation, exit success
3. Mentor speaks about selection → [SWSE Mentor Debug]
4. Click "Next Step" → [SWSE Navigation Debug] [Nav #1]
5. New step enters → [SWSE Navigation Debug] onStepEnter
6. Check: [SWSE Hydration Debug] focusedItem_present for next step
7. Verify: No [SWSE State Drift] warnings
```

### Flow 2: Select, Advance, Go Back (Rehydration Test)
```
1. Species step: select species → commit
2. Class step: select class → commit
3. Go back to Species step
4. Check: [SWSE Navigation Debug] Rehydration lookup succeeds
5. Verify: [SWSE Hydration Debug] focusedItem matches committed state
6. Click same species again → verify no duplicate selections
7. Check: No [SWSE State Drift] warnings for stale data
```

### Flow 3: Multiple Selections in One Step
```
1. Languages step: add language 1 → [SWSE Selection Debug] [Language #1]
2. Add language 2 → [SWSE Selection Debug] [Language #2]
3. Add language 3 → [SWSE Selection Debug] [Language #3]
4. Check: count increments, no duplicates
5. Advance to next step
6. Go back to Languages
7. Verify: all 3 languages rehydrated and highlighted
```

### Flow 4: Summary Generation
```
1. Navigate to Summary step
2. Watch: [SWSE Summary Debug] [Summary #1] Generation START
3. For each section:
   - Observe [SWSE SSOT Debug] lookup for species, class, languages, etc
   - Verify result_found: true for all expected sections
4. Check: all sections_count >= 5
5. Verify: No [SWSE State Drift] for missing/incomplete sections
6. Render summary → check html_length > 0
```

### Flow 5: Summary Left Body Tab
```
1. Summary step: render left body tab
2. Watch: [SWSE Summary Debug] [Tab #1] data source
3. For each section in tab:
   - Verify has_id and has_name present
   - Check no [SWSE State Drift] warnings
4. Switch back and forth between tabs
5. Verify: tab switching doesn't lose data (no stale warnings)
6. Go back to previous step and return to summary
7. Verify: left body tab rehydrated correctly
```

---

## FILES TO INSTRUMENT (PRIORITY ORDER)

### Tier 1 (Critical Path)
- `progression-shell.js` - Navigation, render, state
- `species-step.js`, `class-step.js`, `background-step.js` - Main selections
- `summary-step.js` / `SelectedRailContext.js` - Summary generation

### Tier 2 (Content Domains)
- `feats-step.js`, `talents-step.js` - Complex selections
- `languages-step.js`, `l1-skills-step.js` - Multi-select domains
- `background-step.js` - Effect resolution

### Tier 3 (Subsystems)
- `mentor-rail.js` - Mentor reactions
- `progression-session.js` - Session state
- All step base classes - onStepEnter/Exit contracts

### Tier 4 (Infrastructure)
- Registry lookup wrappers
- SSOT validation helpers
- Template render wrappers

---

## EXPECTED DELIVERABLE

After instrumentation, you can:

1. **Trace any selection** from click to commit:
   ```
   Console: filter "[SWSE Selection Debug] [Selection #1]"
   See: id resolved, state updated, commit status
   ```

2. **Verify navigation** between steps:
   ```
   Console: filter "[SWSE Navigation Debug] [Nav #1]"
   See: validation, onStepExit, onStepEnter, hydration
   ```

3. **Detect rehydration failures**:
   ```
   Console: filter "[SWSE Hydration Debug]" + "[State Drift]"
   See: if UI matches committed state
   ```

4. **Identify SSOT mismatches**:
   ```
   Console: filter "[SWSE SSOT Debug]"
   See: which lookups fail and where drift starts
   ```

5. **Audit summary completeness**:
   ```
   Console: filter "[SWSE Summary Debug]"
   See: which sections assembled, which missed
   ```

6. **Correlate sequences**:
   ```
   Copy counters: window._progressionCounters
   See: total selections, navigations, summary builds, errors
   ```

---

## IMPLEMENTATION GUIDANCE

### Start with
1. Progression-shell.js navigation (next/previous)
2. Selection instrumentation in top 3 steps
3. SSOT lookup wrapper function

### Then expand to
4. All remaining step selections
5. Hydration verification on render
6. Summary generation instrumentation

### Finally add
7. Error boundaries
8. Left body tab tracking
9. Diagnostic counters

### Testing after each phase
- Run repro flow #1 (select → advance)
- Verify logs appear in expected order
- Check for [SWSE State Drift] warnings
- Trace a full journey from species → summary → back

---

## KEY INSIGHT

This instrumentation is designed to make state drift **impossible to hide**.

Every selection, every navigation, every lookup, and every render is logged with before/after state. A bug anywhere in the chain will produce a clear log trail showing:
- What was selected
- Where it was stored
- What the next step read
- Where they diverged

No guessing. No speculation. Pure traceable evidence.
