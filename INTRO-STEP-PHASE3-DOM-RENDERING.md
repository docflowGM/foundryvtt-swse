# Intro Step PHASE 3: DOM Rendering Fix — Translation Container Visibility

## Problem Identified

The translation text animation was not visible during the TRANSLATING phase because the DOM element `[data-role="intro-translation"]` was never rendered into the DOM when `_updateTranslationTextDOM()` tried to update it.

### Root Cause

The template only renders the translation container when the Handlebars condition `{{#if (or isTranslating complete)}}` evaluates to `true`:

```handlebars
{{#if (or isTranslating complete)}}
  <div class="prog-intro-english-translated ...">
    <span class="prog-intro-typewriter" data-role="intro-translation">
      {{#each translatedText}}
        <span class="prog-intro-char ...">{{this}}</span>
      {{/each}}
    </span>
  </div>
{{/if}}
```

Timeline of the animation sequence:

1. **Phases 1-5 (Boot sequence)**:
   - `phase` = 'SYSTEMS CHECK', 'NETWORK SCAN', etc.
   - `complete` = false
   - `isTranslating` = (phase === 'TRANSLATING' && !complete) = **false**
   - Condition evaluates: `(or false false)` = **FALSE**
   - Translation container is **NOT rendered**

2. **Phase 6 (_runTranslation())**:
   - `phase` = 'TRANSLATING'
   - `complete` = false
   - `isTranslating` = true
   - Condition should be TRUE...
   - **BUT shell.render() hasn't been called yet!**
   - Template hasn't been re-evaluated
   - Translation container still doesn't exist in DOM

3. **During _runTranslation()** (character-by-character animation):
   - Calls `_updateTranslationTextDOM()` every 25ms
   - Tries to find `[data-role="intro-translation"]` with querySelector
   - Element doesn't exist → returns early
   - No animation visible

4. **After _runTranslation() completes** (at end of startIntroSequence):
   - Sets `complete = true`
   - Calls `shell.render()` **for the first time**
   - Template finally renders with updated data
   - Translation container now exists, shows final text state
   - But no character-by-character animation was ever visible

## Solution

Added `shell.render()` call right before entering the translation phase to ensure the translation container exists in the DOM for direct DOM mutations.

### Code Change

In `startIntroSequence()`, when entering the TRANSLATING phase:

```javascript
if (phase.label === 'TRANSLATING') {
  // CRITICAL: Render once before translation to ensure [data-role="intro-translation"] element exists in DOM
  // This is necessary because the template's {{#if (or isTranslating complete)}} block doesn't render until we call shell.render()
  console.log('[IntroStep.startIntroSequence] Rendering shell to prepare translation container...');
  try {
    shell.render();
    console.log('[IntroStep.startIntroSequence] Shell rendered, translation container should now be in DOM');
  } catch (error) {
    console.error('[IntroStep.startIntroSequence] ERROR during pre-translation render:', error);
  }

  console.log('[IntroStep.startIntroSequence] About to call _runTranslation...');
  await this._runTranslation(shell);
  console.log('[IntroStep.startIntroSequence] _runTranslation completed');
}
```

### Why This Works

1. When we set `this._phase = 'TRANSLATING'` and immediately call `shell.render()`
2. `getStepData()` is called, which returns `isTranslating = true` and `translatedText = ''` (empty)
3. Template evaluates `{{#if (or isTranslating complete)}}` = `(or true false)` = **TRUE**
4. Translation container is now rendered in the DOM with an empty character list
5. Then `_runTranslation()` finds the element and can update it directly
6. Character-by-character animation is now visible as it happens

### Additional Improvements

Added diagnostic logging to `_updateTranslationTextDOM()`:

- Logs warning if element not found (indicates template not rendered yet)
- Logs confirmation when element is found
- Logs success when DOM is updated with character HTML

This helps diagnose rendering timing issues in the future.

## Performance Impact

Minimal — only adds one additional `shell.render()` call at the start of the translation phase. The alternative would be to not use direct DOM mutations and let the template handle everything, but that would require a full re-render every 25ms (per character), which is much more expensive.

## Testing Checklist

- [ ] Boot animation starts and progresses through phases 1-5 smoothly
- [ ] Phase display updates (Aurabesh text and microlabel)
- [ ] Progress bar animates and updates percentage
- [ ] Progress segments fill in as animation progresses
- [ ] At phase 6 (TRANSLATING), translation text appears and animates character-by-character
- [ ] Character flicker effect is visible during typewriter animation
- [ ] Translation text completes fully (no truncation)
- [ ] "INITIALIZATION SUCCESSFUL..." text is fully visible
- [ ] Continue button appears after animation completes
- [ ] Clicking Continue transitions to Species step correctly
- [ ] Console logs show successful renders and DOM updates
- [ ] No "Translation element not found in DOM" warnings in console

## Commits

- **d910067b**: Fix: Render translation container before animation starts

---

**Status**: DOM rendering sequence fixed. Ready for integration testing.
