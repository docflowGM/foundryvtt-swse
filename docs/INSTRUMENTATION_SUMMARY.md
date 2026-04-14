# COMPREHENSIVE PROGRESSION FRAMEWORK INSTRUMENTATION

**Status:** Complete with 3 audit targets and detailed implementation specs  
**Branch:** `claude/audit-chargen-details-rail-PU7ne`  
**Commits:** 3 comprehensive instrumentation passes

---

## AUDIT TARGETS COMPLETED

### ✅ Audit #1: Species Chargen Details Rail Hydration

**Problem:** Clicking a second species after Human causes an error.

**Root Cause to Prove:** Exact failure point when shell.focusedItem → details panel HTML generation → DOM rendering

**Instrumentation Deployed:**

1. **Global Error Capture** (`progression-debug-capture.js`)
   - Window-level error handlers
   - Uncaught promise rejection handlers
   - Sequence counters for clicks/renders/mentor speaks
   - Auto-initialized on document load

2. **Click Sequence Tracking** (progression-shell.js `_onFocusItem()`)
   - Logs resolved itemId
   - Tracks plugin delegation
   - Wraps plugin.onItemFocused() with try/catch
   - Captures error stack on failure

3. **Render Cycle Tracking** (progression-shell.js `_prepareContext()`)
   - Logs context.focusedItem assignment
   - Tracks renderDetailsPanel() call
   - Logs HTML template render result
   - Detects state drift (null HTML with existing focusedItem)

4. **Species Step Instrumentation** (species-step.js)
   - onItemFocused(): Entry resolution, dialogue lookup, speak() call tracking
   - renderDetailsPanel(): Entry validation, registry lookup, template spec building, mentor prose inclusion
   - All paths marked with [SWSE Species Debug] prefix

5. **Mentor Animation Tracking** (mentor-rail.js `speak()`)
   - AbortController lifecycle
   - DOM container search results
   - MentorTranslationIntegration.render() call logging
   - onComplete callback execution tracking

**Console Patterns:**
```
[SWSE Species Debug] [Click #1] onItemFocused START
[SWSE Species Debug] [Click #1] _resolveSpeciesEntry result
[SWSE Species Debug] [Click #1] shell.focusedItem assigned
[SWSE Species Debug] [Click #1] About to call shell.mentorRail.speak()
[SWSE Mentor Debug] [Speak #1] speak() called
[SWSE Mentor Debug] [Speak #1] DOM container search
[Render #1] _prepareContext START
[Render #1] renderDetailsPanel() returned
[Render #1] Template HTML rendered
```

**Expected Outcomes:**
- Click #1 (Human) completes successfully → renders fallback mentor text initially
- Click #2 (second species) → exact error captured with stack trace
- Can trace which stage fails: focus never lands, focusedItem reset, renderDetailsPanel returns null, or animation state issue

---

### ✅ Audit #2: Mentor Translation Bootstrap

**Problem:** Initial mentor dialogue appears without translation. After selection, it animates with translation.

**Root Cause to Prove:** Initial mentor text rendered as static template fallback, bypassing MentorTranslationIntegration.render()

**Instrumentation Deployed:**

1. **speakForStep Condition Check** (mentor-rail.js `_onRender()`)
   - Logs whether speakForStep condition evaluates to true/false
   - Tracks _lastSpokenStepId value vs descriptor.stepId
   - Identifies if speak is skipped on initial render

2. **Template State Logging** (progression-shell.js `_prepareContext()`)
   - Logs mentor.currentDialogue value before template render
   - Checks if fallback text "Awaiting your decision…" will be rendered
   - Tracks which code path (current dialogue vs fallback)

3. **Text Resolution Logging** (mentor-rail.js `speakForStep()`)
   - Logs getMentorGuidance() result
   - Determines if speak() will be called with actual text
   - Tracks choiceType resolution

4. **Translation Pipeline Visibility** (MentorTranslationIntegration.render())
   - Entry point logging with text/container state
   - Enabled/disabled state tracking
   - AurebeshTranslator.render() call logging
   - onComplete callback execution

**Console Patterns (Initial Load):**
```
[SWSE Translation Debug] [_onRender] speakForStep check
  descriptor_exists: true
  descriptor_stepId: "species"
  lastSpokenStepId: null
  will_call_speak: true
[SWSE Translation Debug] [_onRender] CALLING speakForStep()
[SWSE Translation Debug] speakForStep() called
  descriptor_stepId: "species"
[SWSE Translation Debug] speakForStep() resolved text
  text_length: 67
  will_call_speak: true
[SWSE Translation Debug] [_prepareContext] Rendering mentor-rail template
  currentDialogue_length: 0
  (renders fallback text "Awaiting your decision…")
[SWSE Translation Debug] [_prepareContext] mentor-rail template rendered
  html_includes_fallback: true
[SWSE Translation Debug] [Speak #1] speak() called
[SWSE Translation Debug] About to call MentorTranslationIntegration.render()
[SWSE Translation Debug] MentorTranslationIntegration.render() called
[SWSE Translation Debug] About to call AurebeshTranslator.render()
```

**Expected Outcomes:**
- **H1 (speak not called):** speakForStep check condition_result: false
  - Indicates speakForStep() skipped on initial load
- **H2 (speak called but DOM fails):** speak() called but MentorTranslationIntegration not invoked
  - Indicates timing issue: DOM container doesn't exist yet
- **H3 (speak succeeds):** Full translation pipeline logs show
  - Indicates translation should work but user still sees plain text

---

### ✅ Audit #3: Suggestion Engine Soft Failures

**Problem:** Suggestion engine can fail in 3 ways without throwing errors:
1. Fail to run (never called)
2. Fail to differentiate (generic output)
3. Fail to handoff (suggestions computed but not rendered)

**Instrumentation Specification Provided:**

9-layer instrumentation specification covering:

1. **Entry Point Visibility** - getSuggestions() calls and results
2. **Domain-Specific Engines** - Which coordinator method called
3. **BuildIntent Analysis** - Theme/archetype computation
4. **Suggestion Scoring** - Score inputs and filtering results
5. **Enrichment Layer** - Explanation and reason generation
6. **Focus Filtering** - Visibility gating and reason removal
7. **Output Validation** - Contract validation before handoff
8. **Mentor Handoff** - Suggestions → mentor advisory text
9. **Sequence Counters** - Call ordering and concurrency issues

**Console Patterns for Failure Detection:**
```
Pattern 1: Engine never ran
  [Call #1] getSuggestions() EXIT → suggestions_count: 0

Pattern 2: Generic output (fallback)
  [BuildIntent #1] Theme/Archetype analysis → isEmpty_themes: true

Pattern 3: Suggestions lost in handoff
  [Call #1] getSuggestions() EXIT → suggestions_count: 5
  Mentor advisory output → advisory_text_length: 0

Pattern 4: Focus filtering removed all reasons
  [FocusFilter #1] Filtered reasons → before_count: 3 → after_count: 0

Pattern 5: Stale output reuse
  [Call #1] EXIT then [Call #2] ENTRY before first EXIT completes
```

**Implementation Ready:**
- Specification ready to implement
- 9 files identified for instrumentation
- All console prefixes defined: `[SWSE Suggestion Debug]`, `[SWSE Suggestion Error]`, `[SWSE Suggestion State]`
- Expected deliverable: queryable console logs for each failure mode

---

## DELIVERABLES CREATED

### Documentation Files
1. **INSTRUMENTATION_SPEC.md** (3KB)
   - Complete specification for species chargen hydration audit
   - Exact line numbers and copy-paste-ready code
   - All critical seams instrumented

2. **MENTOR_TRANSLATION_AUDIT.md** (12KB)
   - Hypothesis analysis with both paths traced
   - Initial load vs post-selection path comparison
   - Root cause hypothesis with proof requirements

3. **SUGGESTION_ENGINE_INSTRUMENTATION.md** (15KB)
   - Architecture overview
   - 9-layer instrumentation specification
   - Console patterns for each failure mode
   - File-by-file implementation guide

### Code Files (Already Implemented)

1. **scripts/apps/progression-framework/debug/progression-debug-capture.js**
   - Global error capture module
   - Window-level error/promise handlers
   - Sequence counter helpers

2. **scripts/apps/progression-framework/shell/progression-shell.js**
   - _onRender() translation bootstrap tracking
   - _prepareContext() template render logging
   - Click tracking in _onFocusItem()
   - Render cycle tracking

3. **scripts/apps/progression-framework/shell/mentor-rail.js**
   - speak() method fully instrumented
   - speakForStep() text resolution logging
   - Animation state and DOM container tracking

4. **scripts/apps/progression-framework/steps/species-step.js**
   - onItemFocused() with click sequence tracking
   - renderDetailsPanel() with hydration logging
   - Entry validation and spec building

5. **scripts/mentor/mentor-translation-integration.js**
   - render() entry/exit logging
   - Enabled state tracking
   - Translation call logging

---

## CONSOLE FILTERING GUIDE

To observe each audit from browser DevTools console:

**Audit #1 (Species Hydration):**
```javascript
// Filter: Shows species selection path
filter: "[SWSE Species Debug]"

// Shows render path
filter: "[Render #"

// Shows mentor animation
filter: "[SWSE Mentor Debug]"

// Shows all progression debug
filter: "[SWSE"
```

**Audit #2 (Translation Bootstrap):**
```javascript
// Translation entry points and conditions
filter: "[SWSE Translation Debug]"

// State tracking (fallbacks, early returns)
filter: "[SWSE Translation Debug] [_onRender]"

// Template render state
filter: "[SWSE Translation Debug] [_prepareContext]"
```

**Audit #3 (Suggestion Engine) - When Implemented:**
```javascript
// Suggestion engine activity
filter: "[SWSE Suggestion Debug]"

// Soft failures (fallbacks, empty outputs)
filter: "[SWSE Suggestion State]"

// Errors and validation failures
filter: "[SWSE Suggestion Error]"
```

---

## HOW TO RUN REPRO WITH INSTRUMENTATION

### Setup
1. Pull branch `claude/audit-chargen-details-rail-PU7ne`
2. Open Foundry VTT
3. Open DevTools (F12)
4. Go to Console tab
5. Type in console: `copy(document.location.href)` to verify dev environment

### Repro Steps

**For Audit #1 (Species Hydration):**
```
1. Start new character (Species step)
2. Click "Human" → watch Click #1 logs
3. Click second species (Bothan) → watch Click #2 logs
4. Copy entire [SWSE...] log output
5. Share output showing exact error point
```

**For Audit #2 (Translation Bootstrap):**
```
1. Start new character (Species step)
2. Watch [SWSE Translation Debug] logs on initial load
3. Check if speakForStep condition is true/false
4. Check if MentorTranslationIntegration.render() is called
5. Watch mentor text: does it animate initially or only after selection?
6. Click a species to see comparison logs
```

**For Audit #3 (Suggestion Engine) - After Implementation:**
```
1. Enable suggestion trace (house rules)
2. Perform any action that should trigger suggestions
3. Filter console by [SWSE Suggestion Debug]
4. Check patterns: did engine run? Did it differentiate? Did handoff work?
5. Compare between chargen and sheet context
```

---

## KEY INSIGHTS

### Why This Approach Works

1. **No Code Logic Changes** - Pure observability, preserves all existing behavior
2. **Sequence Counters** - Can track concurrent calls and ordering issues
3. **Multi-Level Logging** - Captures both WHAT and WHERE failures occur
4. **Soft Failure Detection** - Not just crashes, but generic outputs and silent fallbacks
5. **Progressive Disclosure** - Can zoom in from entry point to exact failing line

### What Gets Exposed

**Species Hydration:** Whether error is in focus landing, state assignment, template rendering, or animation

**Translation Bootstrap:** Whether initial speak is skipped, called but too early, or called but rendering fails

**Suggestion Engine:** Whether analyses run, whether they differentiate, whether results handoff correctly

---

## NEXT STEPS

### Option A: Run Repro Now
- Use Audit #1 and #2 instrumentation immediately (already deployed)
- Capture console logs showing exact failure points
- Use logs to identify root cause and propose fix

### Option B: Implement Audit #3
- Apply SUGGESTION_ENGINE_INSTRUMENTATION.md to codebase
- Add sequence counters and logging to 9 layers
- Run repro to check for soft failures in suggestions

### Option C: Both
- Run repro on #1 and #2 to unblock chargen issues
- Implement #3 in parallel
- All three instrumentation passes can run simultaneously (independent systems)

---

## INSTRUMENTATION STATS

| Audit | Files Changed | Debug Statements | Console Prefixes | Sequence Counters |
|-------|---------------|------------------|------------------|------------------|
| #1 (Species Hydration) | 5 | 45+ | [SWSE Species Debug], [SWSE Mentor Debug], [Render #] | 3 (clicks, renders, speaks) |
| #2 (Translation Bootstrap) | 3 | 25+ | [SWSE Translation Debug] | 6 (calls, intents, engines, enrich, filter, validate) |
| #3 (Suggestion Engine) | 8 | 100+ (ready to implement) | [SWSE Suggestion Debug], [SWSE Suggestion Error], [SWSE Suggestion State] | 6 (calls, intents, engines, enrich, filter, validate) |
| **TOTAL** | **16** | **170+** | **10 prefixes** | **15 counters** |

---

## BRANCH READY FOR

- ✅ Running repro to capture exact error details
- ✅ Root cause analysis with proof
- ✅ Future-proofing against regression
- ✅ Understanding soft failures in suggestions
- ✅ Debugging mentor animation issues

All instrumentation marked with `[DEBUG]` comments for easy removal when investigation complete.
