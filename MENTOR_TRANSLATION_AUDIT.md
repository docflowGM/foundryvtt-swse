# MENTOR TRANSLATION BOOTSTRAP AUDIT

**Status:** Hypothesis Formation  
**Issue:** Initial mentor dialogue appears without translation/typing behavior. After selection, mentor dialogue animates with translation.

---

## EXECUTIVE SUMMARY

The user observes two distinct states:
1. **First Load:** Mentor text appears static, plain, without Aurebesh translation or typing animation
2. **After Selection:** Mentor text animates with Aurebesh translation and typewriter effect

This audit traces both paths to identify the first divergence.

---

## HYPOTHESIS

**Leading Hypothesis (HIGH CONFIDENCE):**

The initial mentor dialogue is NOT being rendered through `MentorRail.speak()`. Instead:
1. Initial mentor text is rendered as **static fallback text** in the template (`mentor-rail.hbs` line 107: "Awaiting your decision…")
2. This fallback text **bypasses** `MentorTranslationIntegration.render()` entirely
3. Only AFTER user interaction (selection click) does the path go through `speak()` → `MentorTranslationIntegration.render()` → animation

---

## PATH 1: INITIAL MENTOR LOAD

### Timeline (with exact code references)

**Line 250 - Constructor:**
```javascript
this.currentStepIndex = 0;
```
✓ First step index is set to 0

**Line 495 - _initializeMentorState():**
```javascript
currentDialogue: '',  // EMPTY on initialization
```
❌ Initial dialogue is **empty string**

**Line 167 - open() → _initializeSteps():**
Steps are assembled before first render. `currentStepIndex` is still valid.

**Line 172 - open() → _initializeFirstStep():**
Calls `plugin.onStepEnter(shell)` for SpeciesStep.
- SpeciesStep.onStepEnter() loads registry, dialogues, images
- **Does NOT set shell.mentor.currentDialogue**

**Line 179 - open() → app.render():**
Triggers the full render cycle:

### _prepareContext() → mentor-rail template render

**Line 898-904 - _prepareContext():**
```javascript
partsHtml.mentorRail = await foundry.applications.handlebars.renderTemplate(
  'systems/foundryvtt-swse/templates/apps/progression-framework/mentor-rail.hbs',
  {
    mentor: this.mentor,  // this.mentor.currentDialogue = ''
    mentorCollapsed: this.mentorCollapsed,
  }
);
```

**mentor-rail.hbs line 107:**
```handlebars
{{#if mentor.currentDialogue}}{{mentor.currentDialogue}}{{else}}Awaiting your decision…{{/if}}
```

✓ **RESULT:** Template renders with fallback text "Awaiting your decision…"
❌ **CRITICAL:** This text is **plain HTML**, not passed through `MentorTranslationIntegration.render()`

### _onRender() → speakForStep()

**Line 1088-1092 - _onRender():**
```javascript
const descriptor = this.steps[this.currentStepIndex];
if (descriptor && descriptor.stepId !== this._lastSpokenStepId) {
  this._lastSpokenStepId = descriptor.stepId;
  await this.mentorRail.speakForStep(descriptor);  // SHOULD BE CALLED
}
```

On initial render:
- `this.currentStepIndex = 0` (set in constructor, line 250)
- `this._lastSpokenStepId = null` (set in constructor, line 283)
- `descriptor.stepId !== null` → **TRUE**
- ✓ **speakForStep() SHOULD BE CALLED**

**mentor-rail.js line 144-154 - speakForStep():**
```javascript
const mentorObj = this._getMentorObject();
if (!mentorObj) return;

const choiceType = STEP_CHOICE_TYPE[descriptor.stepId];
const text = choiceType
  ? getMentorGuidance(mentorObj, choiceType)
  : `You are at the ${descriptor.label} step.`;

if (text) await this.speak(text);  // DELEGATES TO speak()
```

**mentor-rail.js line 40-72 - speak():**
```javascript
async speak(text, mood = null) {
  if (!text) return;
  
  // [DEBUG] Sequence tracking
  const speakNum = ProgressionDebugCapture?.nextMentorSpeak?.() ?? 0;
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() called`, ...);

  const shell = this.shell;
  shell.mentor.currentDialogue = text;  // UPDATE STATE
  shell.mentor.animationState = 'typing';
  shell.mentor.isAnimating = true;

  // Find dialogue container in live DOM
  const container = shell.element?.querySelector('[data-mentor-dialogue]');
  
  // [DEBUG] DOM search logging
  console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] DOM container search`, {
    shell_element_exists: !!shell.element,
    mentor_dialogue_found: !!container,
    container_tag: container?.tagName ?? '(null)',
  });

  if (!container || signal.aborted) return;

  try {
    await MentorTranslationIntegration.render({
      text,
      container: container.querySelector('[data-mentor-text]') ?? container,
      mentor: shell.mentor.mentorId,
      onComplete: () => {
        if (!signal.aborted) {
          shell.mentor.animationState = 'complete';
          shell.mentor.isAnimating = false;
        }
      },
    });  // TRANSLATION CALL
  } catch (e) {
    if (!signal.aborted) console.warn('[MentorRail] speak error', e);
  }
}
```

✓ **EXPECTED FLOW:**
1. speakForStep() gets guidance text
2. Calls speak(text)
3. speak() updates shell.mentor.currentDialogue
4. speak() calls MentorTranslationIntegration.render() on the DOM
5. Translation animates the text in the [data-mentor-text] element

---

## PATH 2: POST-SELECTION MENTOR UPDATE

**When user clicks a species in the work surface:**

**species-step.js line 462-540 - onItemFocused():**
```javascript
async onItemFocused(id, shell) {
  // [DEBUG] Click sequence tracking
  const clickNum = ProgressionDebugCapture?.nextClickSequence?.() ?? 0;
  console.log(`[SWSE Species Debug] [Click #${clickNum}] onItemFocused START`, { id });
  
  const entry = this._resolveSpeciesEntry(id);
  if (!entry) return;

  shell.focusedItem = entry;

  // Look up Ol' Salty dialogue for species name
  const dialogue = this._getOlSaltyDialogue(entry.name);
  
  if (dialogue) {
    console.log('[SpeciesStep] ✓ Found mentor dialogue for', entry.name);
    
    try {
      await shell.mentorRail.speak(dialogue, 'encouraging');  // DELEGATES TO speak()
      console.log(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() completed`);
    } catch (speakErr) {
      console.error(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() threw:`, speakErr);
      throw speakErr;
    }
  }

  shell.render();
}
```

✓ **DIRECT CALL TO speak():** User selection explicitly calls `shell.mentorRail.speak(dialogue, 'encouraging')`
✓ **Translation guaranteed:** speak() runs → MentorTranslationIntegration.render() runs → animation happens

---

## FIRST DIVERGENCE POINT

| Aspect | Initial Load | Post-Selection |
|--------|--------------|-----------------|
| **Mentor text source** | Template fallback "Awaiting your decision…" | species-step.js dialogue lookup |
| **Path to rendering** | Handlebars template (static) | MentorRail.speak() |
| **Translation called?** | ❌ **NO** (template text is plain HTML) | ✓ **YES** (speak() → MentorTranslationIntegration.render()) |
| **Animation triggered?** | ❌ **NO** | ✓ **YES** |
| **Evidence** | Plain text in DOM, no [data-mentor-text] content update via speak() | onItemFocused → speak() → MentorTranslationIntegration.render() |

---

## ROOT CAUSE HYPOTHESIS

**The initial mentor dialogue never goes through speak()** — or if it does, there's a timing or DOM issue.

**Evidence:**
1. ✓ speakForStep() should be called in _onRender() (line 1089 condition should be true)
2. ✓ speak() should update the DOM
3. ❌ **But:** Initial render shows plain "Awaiting your decision…" text
4. ✓ Post-selection shows animated text

**Two Sub-Hypotheses:**

### H1: speakForStep() is NOT called on initial load
- **Condition test:** `descriptor && descriptor.stepId !== this._lastSpokenStepId`
- **Failure point:** descriptor could be null or _lastSpokenStepId could already match stepId
- **Evidence needed:** Log whether condition is true/false on first render

### H2: speakForStep() is called BUT speak() fails to update DOM
- **Failure point:** DOM container doesn't exist when speak() tries to find it
- **Timing issue:** Template renders to HTML string in _prepareContext, but DOM isn't fully mounted yet when speak() executes
- **Evidence needed:** Log whether container search succeeds, whether MentorTranslationIntegration.render() is actually called

---

## INSTRUMENTATION PLAN

Add logging to capture:

### 1. Initial Load Path Logging

**File:** progression-shell.js  
**Method:** _onRender()  
**At line 1088:**
```javascript
const descriptor = this.steps[this.currentStepIndex];
console.log('[SWSE Translation Debug] [Initial Render] speakForStep check', {
  descriptor_exists: !!descriptor,
  descriptor_stepId: descriptor?.stepId ?? '(null)',
  lastSpokenStepId: this._lastSpokenStepId ?? '(null)',
  condition_result: descriptor && descriptor.stepId !== this._lastSpokenStepId,
  will_call_speak: descriptor && descriptor.stepId !== this._lastSpokenStepId,
});

if (descriptor && descriptor.stepId !== this._lastSpokenStepId) {
  console.log('[SWSE Translation Debug] [Initial Render] CALLING speakForStep()');
  this._lastSpokenStepId = descriptor.stepId;
  await this.mentorRail.speakForStep(descriptor);
  console.log('[SWSE Translation Debug] [Initial Render] speakForStep() COMPLETED');
} else {
  console.log('[SWSE Translation Debug] [Initial Render] SKIPPING speakForStep() — condition false or already spoken');
}
```

### 2. Template Render Logging

**File:** progression-shell.js  
**Method:** _prepareContext()  
**At line 898-904:**
```javascript
console.log('[SWSE Translation Debug] [_prepareContext] Rendering mentor-rail template with mentor state:', {
  currentDialogue: this.mentor.currentDialogue ?? '(empty)',
  currentDialogue_length: this.mentor.currentDialogue?.length ?? 0,
  isAnimating: this.mentor.isAnimating,
  animationState: this.mentor.animationState,
});

partsHtml.mentorRail = await foundry.applications.handlebars.renderTemplate(...);

console.log('[SWSE Translation Debug] [_prepareContext] mentor-rail template rendered:', {
  html_includes_fallback: partsHtml.mentorRail?.includes?.('Awaiting your decision') ?? false,
  html_length: partsHtml.mentorRail?.length ?? 0,
});
```

### 3. DOM Container Existence Logging

**File:** mentor-rail.js  
**Method:** speak()  
**After DOM search (line 76):**
Already instrumented with [SWSE Mentor Debug] logging. Verify output shows:
- Whether shell.element exists
- Whether [data-mentor-dialogue] container found
- Whether [data-mentor-text] element found

---

## EXPECTED OUTCOMES

### If H1 is true (speakForStep not called):
Console logs will show:
```
[SWSE Translation Debug] [Initial Render] speakForStep check
  condition_result: false
  will_call_speak: false
[SWSE Translation Debug] [Initial Render] SKIPPING speakForStep()
```

**Fix:** Investigate why condition is false on initial load

### If H2 is true (speak called but DOM fails):
Console logs will show:
```
[SWSE Translation Debug] [Initial Render] CALLING speakForStep()
[SWSE Translation Debug] [Initial Render] speakForStep() COMPLETED
[SWSE Mentor Debug] [Speak #1] speak() called
[SWSE Mentor Debug] [Speak #1] DOM container search
  shell_element_exists: true/false
  mentor_dialogue_found: true/false
```

**Fix:** If container not found, it's a timing issue. If container found but MentorTranslationIntegration doesn't animate, it's a translation layer issue.

---

## NEXT STEP: RUN REPRO WITH BOTH INSTRUMENTATIONS

1. ✓ Species chargen click instrumentation already in place
2. ➕ Add initial render translation logging (above)
3. Run: Click Human → observe console for translation path
4. Run: Click second species → compare console paths
5. Identify exact divergence point with timestamps and state values

