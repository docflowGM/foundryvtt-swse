# SUGGESTION ENGINE OBSERVABILITY INSTRUMENTATION

**Status:** Ready to Implement  
**Purpose:** Detect soft failures: missing inputs, degraded analysis, empty outputs, broken handoffs  
**Risk:** Suggestion engine can fail silently in 3 ways: (1) fail to run, (2) fail to differentiate, (3) fail to handoff  

---

## ARCHITECTURE OVERVIEW

The suggestion engine has multiple layers:

```
SuggestionService.getSuggestions()
  └─> SuggestionEngineCoordinator.suggest<Domain>()
       ├─> BuildIntent.analyze() [intent/theme/archetype analysis]
       ├─> Specific SuggestionEngine (feats, talents, species, etc.)
       ├─> ProgressionAdvisor [attribute-weighted ranking]
       └─> SuggestionConfidence [scoring]
  └─> SuggestionService._enrichSuggestions() [add explanations/reasons]
  └─> SuggestionService._filterReasonsByFocus() [visibility gating]
  └─> [Handed to mentor, UI, or advisory layers]
```

---

## INSTRUMENTATION LAYERS

### LAYER 1: Entry Point Visibility

**File:** `SuggestionService.js`  
**Method:** `getSuggestions(actorOrData, context, options)`  
**Lines:** 152-288

**Instrument:**
```javascript
static async getSuggestions(actorOrData, context = 'sheet', options = {}) {
  // [SUGGESTION DEBUG] Entry point
  const entryNum = (window._suggestionCallSequence = (window._suggestionCallSequence ?? 0) + 1);
  console.log(`[SWSE Suggestion Debug] [Call #${entryNum}] getSuggestions() ENTRY`, {
    actor_name: actorOrData?.name ?? 'unknown',
    actor_id: actorOrData?.id ?? 'temp',
    context,
    domain: options.domain ?? 'all',
    has_pendingData: !!options.pendingData,
    pendingData_keys: options.pendingData ? Object.keys(options.pendingData) : [],
    focus: options.focus ?? null,
  });

  const actor = await _ensureActorDoc(actorOrData);
  const pendingData = options.pendingData ?? {};
  const focus = options.focus ?? null;

  // [SUGGESTION STATE] Log actor state at entry
  console.log(`[SWSE Suggestion State] [Call #${entryNum}] Actor state at entry`, {
    actor_level: actor?.system?.level ?? '(null)',
    actor_items: actor?.items?.size ?? actor?.items?.length ?? 0,
    has_committed_selections: !!actor?.system?.committedSelections,
    abilities: actor?.system?.abilities ? Object.keys(actor.system.abilities) : [],
  });

  // ... rest of method
  
  // [SUGGESTION DEBUG] Exit with results
  console.log(`[SWSE Suggestion Debug] [Call #${entryNum}] getSuggestions() EXIT`, {
    suggestions_count: focusFiltered?.length ?? 0,
    suggestions_domains: focusFiltered ? [...new Set(focusFiltered.map(s => s.domain))].slice(0, 10) : [],
    from_cache: cached?.rev === revision,
  });

  return focusFiltered;
}
```

---

### LAYER 2: Domain-Specific Engine Calls

**File:** `SuggestionService.js`  
**Method:** `getSuggestions()` coordinator calls (lines 205-231)

**Instrument each coordinator call:**
```javascript
if (options.domain === 'feats') {
  console.log(`[SWSE Suggestion Debug] [Call #${entryNum}] Calling SuggestionEngineCoordinator.suggestFeats()`, {
    available_count: availableFeats?.length ?? 0,
    domain: 'feats',
  });
  
  suggestions = await SuggestionEngineCoordinator.suggestFeats(
    availableFeats, 
    actor, 
    options.pendingData ?? {}, 
    { ...(options.engineOptions || {}), debug: trace }
  );
  
  console.log(`[SWSE Suggestion Debug] [Call #${entryNum}] suggestFeats() returned`, {
    suggestions_count: suggestions?.length ?? 0,
    suggestions_empty: !suggestions || suggestions.length === 0,
  });
}
```

---

### LAYER 3: BuildIntent Analysis

**File:** `SuggestionEngineCoordinator.js` and `BuildIntent.js`  
**Key Methods:** BuildIntent.analyze(), BuildIntent.computeThemes()

**Instrument:**
```javascript
// In BuildIntent.analyze()
static analyze(actor, pendingData = {}, options = {}) {
  const analyzeNum = (window._buildIntentSequence = (window._buildIntentSequence ?? 0) + 1);
  console.log(`[SWSE Suggestion Debug] [BuildIntent #${analyzeNum}] analyze() ENTRY`, {
    actor_name: actor?.name,
    actor_level: actor?.system?.level,
    has_pendingData: !!Object.keys(pendingData).length,
    pendingData_keys: Object.keys(pendingData),
  });

  // ... analysis logic ...

  const result = {
    primaryTheme: primaryTheme ?? 'unspecified',
    themes: themes ?? [],
    archetype: archetype ?? 'none',
    combatStyle: combatStyle ?? 'unknown',
    affinities: affinities ?? {},
    // ... other fields
  };

  // [SUGGESTION STATE] Log theme/archetype outputs
  console.log(`[SWSE Suggestion State] [BuildIntent #${analyzeNum}] Theme/Archetype analysis`, {
    primaryTheme: result.primaryTheme,
    themes_count: result.themes?.length ?? 0,
    archetype: result.archetype,
    combatStyle: result.combatStyle,
    affinities_count: Object.keys(result.affinities ?? {}).length,
    isEmpty_themes: !result.themes || result.themes.length === 0,
    isEmpty_archetype: !result.archetype || result.archetype === 'none',
  });

  return result;
}
```

---

### LAYER 4: Specific Suggestion Engine Execution

**Files:** `SuggestionEngine.js`, `ClassSuggestionEngine.js`, `SpeciesSuggestionEngine.js`, etc.

**Instrument the scoring/filtering logic:**
```javascript
// In each engine's suggest() method
async suggest(items, actor, pendingData, options = {}) {
  const engineNum = (window._engineSequence = (window._engineSequence ?? 0) + 1);
  const engineName = this.constructor.name;

  console.log(`[SWSE Suggestion Debug] [${engineName} #${engineNum}] suggest() ENTRY`, {
    items_count: items?.length ?? 0,
    actor_name: actor?.name,
    actor_level: actor?.system?.level,
    has_pendingData: !!Object.keys(pendingData).length,
  });

  let scored = [];
  let filtered = [];

  // Scoring phase
  if (items && items.length > 0) {
    scored = items.map(item => ({
      ...item,
      score: this._scoreItem(item, actor, pendingData, options),
    }));

    // [SUGGESTION STATE] Log scoring results
    const scores = scored.map(s => s.score);
    console.log(`[SWSE Suggestion State] [${engineName} #${engineNum}] Scoring complete`, {
      scored_count: scored.length,
      min_score: Math.min(...scores),
      max_score: Math.max(...scores),
      avg_score: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      zero_scored: scores.filter(s => s === 0).length,
    });

    // Filtering phase
    filtered = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    console.log(`[SWSE Suggestion State] [${engineName} #${engineNum}] Filtering complete`, {
      filtered_count: filtered.length,
      filtered_out: scored.length - filtered.length,
      top_3_scores: filtered.slice(0, 3).map(s => s.score),
    });
  } else {
    // [SUGGESTION STATE] Fallback if no items
    console.log(`[SWSE Suggestion State] [${engineName} #${engineNum}] NO ITEMS PROVIDED`, {
      items_null: items === null,
      items_undefined: items === undefined,
      items_empty_array: Array.isArray(items) && items.length === 0,
    });
  }

  const suggestions = filtered.slice(0, 5);

  console.log(`[SWSE Suggestion Debug] [${engineName} #${engineNum}] suggest() EXIT`, {
    suggestions_count: suggestions.length,
    suggestions_empty: suggestions.length === 0,
    top_suggestion: suggestions[0]?.name ?? 'none',
  });

  return suggestions;
}
```

---

### LAYER 5: Enrichment and Explanation

**File:** `SuggestionService.js`  
**Method:** `_enrichSuggestions(actor, suggestions, options)`  
**Lines:** 536-677

**Instrument:**
```javascript
static async _enrichSuggestions(actor, suggestions, options = {}) {
  const enrichNum = (window._enrichSequence = (window._enrichSequence ?? 0) + 1);

  console.log(`[SWSE Suggestion Debug] [Enrich #${enrichNum}] _enrichSuggestions() ENTRY`, {
    input_count: suggestions?.length ?? 0,
    actor_name: actor?.name,
  });

  if (!suggestions || suggestions.length === 0) {
    console.log(`[SWSE Suggestion State] [Enrich #${enrichNum}] EMPTY INPUT - no suggestions to enrich`);
    return [];
  }

  const enriched = [];

  for (const sugg of suggestions) {
    // [SUGGESTION STATE] Log enrichment per suggestion
    console.log(`[SWSE Suggestion State] [Enrich #${enrichNum}] Enriching`, {
      suggestion_name: sugg.name,
      suggestion_domain: sugg.domain,
      has_explanation: !!sugg.explanation,
      has_reasons: !!sugg.reasons,
    });

    const explanation = await SuggestionExplainer.explain(sugg, actor);
    const reasons = ReasonFactory.createReasons(sugg, actor, options);

    const enrichedItem = {
      ...sugg,
      explanation: explanation ?? 'No explanation available',
      reasons: reasons ?? [],
    };

    // [SUGGESTION STATE] Log enrichment result
    console.log(`[SWSE Suggestion State] [Enrich #${enrichNum}] Enriched result`, {
      suggestion_name: enrichedItem.name,
      explanation_length: enrichedItem.explanation?.length ?? 0,
      reasons_count: enrichedItem.reasons?.length ?? 0,
      has_explanation: !!enrichedItem.explanation,
    });

    enriched.push(enrichedItem);
  }

  console.log(`[SWSE Suggestion Debug] [Enrich #${enrichNum}] _enrichSuggestions() EXIT`, {
    output_count: enriched.length,
    all_explained: enriched.every(s => s.explanation),
    all_have_reasons: enriched.every(s => s.reasons && s.reasons.length > 0),
  });

  return enriched;
}
```

---

### LAYER 6: Focus Filtering and Visibility Gating

**File:** `SuggestionService.js`  
**Method:** `_filterReasonsByFocus(suggestions, focus, options)`  
**Lines:** 678-750

**Instrument:**
```javascript
static _filterReasonsByFocus(suggestions, focus = null, { trace = false, reasonLimit = 3 } = {}) {
  const filterNum = (window._focusFilterSequence = (window._focusFilterSequence ?? 0) + 1);

  console.log(`[SWSE Suggestion Debug] [FocusFilter #${filterNum}] _filterReasonsByFocus() ENTRY`, {
    input_count: suggestions?.length ?? 0,
    focus,
    reason_limit: reasonLimit,
  });

  if (!suggestions || suggestions.length === 0) {
    console.log(`[SWSE Suggestion State] [FocusFilter #${filterNum}] EMPTY INPUT - skipping filter`);
    return [];
  }

  const filtered = suggestions.map(sugg => {
    let filtered_reasons = sugg.reasons ?? [];

    if (focus) {
      const allowedDomains = getAllowedReasonDomains(focus);
      filtered_reasons = (sugg.reasons ?? []).filter(r => allowedDomains.includes(r.domain));

      // [SUGGESTION STATE] Log per-suggestion filtering
      console.log(`[SWSE Suggestion State] [FocusFilter #${filterNum}] Filtered reasons for`, {
        suggestion_name: sugg.name,
        focus,
        before_count: sugg.reasons?.length ?? 0,
        after_count: filtered_reasons.length,
        removed: (sugg.reasons?.length ?? 0) - filtered_reasons.length,
      });
    }

    return {
      ...sugg,
      reasons: filtered_reasons.slice(0, reasonLimit),
    };
  });

  console.log(`[SWSE Suggestion Debug] [FocusFilter #${filterNum}] _filterReasonsByFocus() EXIT`, {
    output_count: filtered.length,
    avg_reasons_per_suggestion: (filtered.reduce((sum, s) => sum + (s.reasons?.length ?? 0), 0) / filtered.length).toFixed(2),
  });

  return filtered;
}
```

---

### LAYER 7: Output Validation

**File:** `SuggestionService.js`  
**Method:** `validateSuggestionDTO(suggestions, options)`  
**Lines:** 507-535

**Instrument:**
```javascript
static validateSuggestionDTO(suggestions, { context = null, domain = null } = {}) {
  const validNum = (window._validateSequence = (window._validateSequence ?? 0) + 1);

  console.log(`[SWSE Suggestion Debug] [Validate #${validNum}] validateSuggestionDTO() ENTRY`, {
    suggestions_count: suggestions?.length ?? 0,
    context,
    domain,
  });

  const errors = [];
  const warnings = [];

  if (!Array.isArray(suggestions)) {
    errors.push('suggestions is not an array');
  } else {
    for (let i = 0; i < suggestions.length; i++) {
      const sugg = suggestions[i];

      // Check required fields
      if (!sugg.name) {errors.push(`[${i}] missing name`);}
      if (!sugg.domain) {errors.push(`[${i}] missing domain`);}
      if (!sugg.id && !sugg.targetRef) {errors.push(`[${i}] missing id/targetRef`);}

      // Check expected fields
      if (!sugg.explanation) {warnings.push(`[${i}] missing explanation`);}
      if (!sugg.reasons || sugg.reasons.length === 0) {warnings.push(`[${i}] missing reasons`);}
      if (!sugg.score && sugg.score !== 0) {warnings.push(`[${i}] missing score`);}
    }
  }

  // [SUGGESTION STATE] Log validation result
  console.log(`[SWSE Suggestion State] [Validate #${validNum}] Validation result`, {
    errors_count: errors.length,
    warnings_count: warnings.length,
    all_valid: errors.length === 0,
  });

  if (errors.length > 0) {
    console.error(`[SWSE Suggestion Error] [Validate #${validNum}] Validation FAILED`, {
      errors,
      context,
      domain,
    });
  }

  if (warnings.length > 0 && (window._suggestionDebugVerbose ?? false)) {
    console.warn(`[SWSE Suggestion Error] [Validate #${validNum}] Validation warnings`, warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

### LAYER 8: Mentor Handoff

**File:** `mentor-rail.js` or suggestion-advisory-formatter.js  
**Method:** Where mentor advice is composed from suggestions

**Instrument:**
```javascript
// When suggestions are passed to mentor advisory layer
console.log(`[SWSE Suggestion Debug] Mentor handoff`, {
  suggestions_count: suggestions?.length ?? 0,
  suggestion_domains: suggestions?.map(s => s.domain) ?? [],
  handoff_target: 'mentor-advisory-formatter',
  timestamp: Date.now(),
});

// Log what the mentor actually received
const advisoryText = formatAdvisoryFromSuggestions(suggestions);
console.log(`[SWSE Suggestion State] Mentor advisory output`, {
  advisory_text_length: advisoryText?.length ?? 0,
  is_fallback: !suggestions || suggestions.length === 0,
  is_generic: advisoryText?.includes?.('generic') || advisoryText?.includes?.('default'),
});
```

---

### LAYER 9: Sequence Counters

Add global counters to window object in progression-shell.js or main initialization:

```javascript
// Initialize suggestion debug counters
window._suggestionCallSequence = 0;
window._buildIntentSequence = 0;
window._engineSequence = 0;
window._enrichSequence = 0;
window._focusFilterSequence = 0;
window._validateSequence = 0;
window._suggestionDebugVerbose = false; // Toggle for verbose logging

console.log('[SWSE Suggestion Debug] Initialized suggestion sequence counters');
```

---

## CONSOLE PATTERNS TO LOOK FOR

### Pattern 1: Engine Never Ran
```
[SWSE Suggestion Debug] [Call #1] getSuggestions() ENTRY
[SWSE Suggestion Debug] [Call #1] getSuggestions() EXIT
  suggestions_count: 0
  suggestions_domains: []
```
**Indicates:** Engine ran but produced nothing

### Pattern 2: Generic Output (Fallback Triggered)
```
[SWSE Suggestion State] Fallback triggered
[SWSE Suggestion State] Using default archetype
[SWSE Suggestion Error] [Validate #1] Validation warnings
  [0] missing explanation
  [0] missing reasons
```
**Indicates:** Analysis failed, generic fallback activated

### Pattern 3: Theme/Archetype Empty
```
[SWSE Suggestion State] [BuildIntent #1] Theme/Archetype analysis
  primaryTheme: unspecified
  themes_count: 0
  isEmpty_themes: true
  isEmpty_archetype: true
```
**Indicates:** BuildIntent couldn't differentiate the build

### Pattern 4: Suggestions Generated But Not Handed Off
```
[SWSE Suggestion Debug] [Call #1] getSuggestions() EXIT
  suggestions_count: 5
[SWSE Suggestion State] Mentor advisory output
  advisory_text_length: 0
  is_fallback: true
```
**Indicates:** Suggestions computed but mentor handoff failed

### Pattern 5: Silent Focus Filtering (Reason Loss)
```
[SWSE Suggestion State] [FocusFilter #1] Filtered reasons for
  suggestion_name: "Feat A"
  before_count: 3
  after_count: 0
  removed: 3
[SWSE Suggestion Debug] [FocusFilter #1] _filterReasonsByFocus() EXIT
  avg_reasons_per_suggestion: 0.20
```
**Indicates:** Focus filtering removed all reasons from some suggestions

### Pattern 6: Stale Suggestions (Call Sequencing Issue)
```
[SWSE Suggestion Debug] [Call #1] getSuggestions() ENTRY
  domain: feats
[SWSE Suggestion Debug] [Call #2] getSuggestions() ENTRY
  domain: talents
[SWSE Suggestion Debug] [Call #1] getSuggestions() EXIT
  suggestions_count: 5
[SWSE Suggestion Debug] [Call #2] getSuggestions() EXIT
  suggestions_count: 3
```
**Indicates:** Multiple concurrent calls. If results reused, may be stale.

---

## FILES TO INSTRUMENT

1. **SuggestionService.js**
   - `getSuggestions()` entry/exit
   - Each domain-specific coordinator call
   - `_enrichSuggestions()`
   - `_filterReasonsByFocus()`
   - `validateSuggestionDTO()`

2. **SuggestionEngineCoordinator.js**
   - `suggestFeats()`, `suggestTalents()`, `suggestClasses()`, etc.
   - BuildIntent integration points

3. **BuildIntent.js**
   - `analyze()` entry/exit
   - Theme computation
   - Archetype assignment
   - Empty theme detection

4. **SuggestionEngine.js** (and variants)
   - `suggest()` entry/exit
   - Scoring phase
   - Filtering phase
   - Output generation

5. **SuggestionExplainer.js**
   - Explanation generation
   - Missing explanation detection

6. **ReasonFactory.js**
   - Reason creation
   - Empty reason array detection

7. **SuggestionConfidence.js**
   - Confidence scoring
   - Score validation

8. **Mentor handoff points**
   - Where suggestions → mentor advisory text
   - Where suggestions → recommendation UI

---

## EXPECTED DELIVERABLE AFTER IMPLEMENTATION

When complete, the system will be queryable via console for:

1. **Did the suggestion engine run?**
   - Look for `[Call #N] getSuggestions() ENTRY` and `EXIT` logs

2. **Did it differentiate?**
   - Check `[BuildIntent #N] Theme/Archetype analysis` for non-empty values

3. **Did it generate suggestions?**
   - Check `suggestions_count > 0` in EXIT logs

4. **Did it explain them?**
   - Check `all_explained: true/false` in enrichment logs

5. **Did it hand off correctly?**
   - Check mentor advisory text length > 0

6. **Did anything fall back?**
   - Search for `[SWSE Suggestion State] Fallback triggered`

7. **What was filtered/hidden?**
   - Check focus filter logs for removed reasons count

---

## IMPLEMENTATION PRIORITY

1. **Must Do First:** Layers 1-3 (entry, engines, intent)
2. **Must Do Second:** Layers 4-6 (scoring, enrichment, filtering)
3. **Nice to Have:** Layers 7-9 (validation, mentor handoff, timings)

Start with SuggestionService.getSuggestions() and BuildIntent.analyze(), then fan out to specific engines.
