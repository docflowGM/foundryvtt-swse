# P0 Fix: Template Single-Root Element Violation

## The Problem

```
Failed to render Application "chargen": Template part "content" must render a single HTML element
```

This occurs because Foundry's ApplicationV2 requires each template part to render exactly one root HTML element. The chargen.hbs template is producing either:
- Multiple sibling root elements, OR
- Empty/no content in some render path

## Root Cause Location

The problem is likely in one of these areas in `/templates/apps/chargen.hbs`:

1. **Lines 2-146**: Header and chevron setup with complex droid/non-droid conditionals
2. **Lines 146-2315**: Main content area with step-specific conditionals
3. **Lines 2315-2316**: Closing tags

The template HAS a single root wrapper `<div class="swse-chargen-window flexcol">`, but a conditional branch inside might be rendering invalid HTML.

## Most Likely Culprits

### Possibility A: Droid vs Non-Droid Conditional Issue
Lines 75-145 have:
```hbs
{{#if characterData.isDroid}}
  {{#if characterData.isDroid}}
    <div class="chevron-step droid-degree">...</div>
    <div class="chevron-step droid-size">...</div>
    ...
  {{else}}
    <div class="chevron-step species">...</div>
  {{/if}}
```

If `characterData.isDroid` is undefined/null initially, this might produce unexpected output.

### Possibility B: Initial Step Rendering
If the initial `currentStep` value doesn't match any of the `{{#if (eq currentStep "...")}}` blocks, all steps might render as empty, leaving the main element with no content.

### Possibility C: Content Order Issue
If there's a closing `</div>` or `</section>` tag OUTSIDE a conditional while the opening is INSIDE a conditional, it creates unmatched pairs.

## Recommended Fix

### Quick Diagnostic First

In `/scripts/apps/chargen/chargen-main.js`, add logging to `_prepareContext()` to see what values are being passed to the template:

```javascript
async _prepareContext() {
  // Add this logging RIGHT BEFORE returning context
  SWSELogger.log('[CharacterGenerator._prepareContext] TEMPLATE CONTEXT:', {
    currentStep: this.currentStep,
    isDroid: this.characterData.isDroid,
    hasCharacterData: !!this.characterData,
    characterDataKeys: Object.keys(this.characterData || {}).slice(0, 10)
  });

  // ... rest of method
  return context;  // at the end
}
```

This will show us what data is being passed to the template when it tries to render.

### Then Check Template

Look for:
1. Any `{{#if ...}}` blocks at the top level (inside root div, before main)
2. Any conditional that might produce NO content (all branches undefined)
3. Any closing tags before their corresponding opening tags
4. Any stray HTML after `</main>` but before `</div>`

### Nuclear Option (Safe Fallback)

If you can't find the exact issue, wrap the ENTIRE content section:

**In `/templates/apps/chargen.hbs`, after line 146 (`<main class="chargen-body flexcol">`), make sure ALL step sections are wrapped:**

```hbs
<main class="chargen-body flexcol">
  <div class="chargen-steps-container">
    {{#if (eq currentStep "name")}}
      <section class="step-name">...</section>
    {{/if}}

    {{#if (eq currentStep "type")}}
      <section class="step-type">...</section>
    {{/if}}

    ... (all other steps inside this container)
  </div>
</main>
```

This ensures the main element always has one child (the container div), and all step content is properly nested.

## Action Items

1. **Add the diagnostic logging** to `_prepareContext()` above
2. **Reload and try chargen again**
3. **Check console for the context logging** — does `currentStep` have a value? Is `isDroid` defined?
4. **If values look good**, inspect the rendered HTML in DevTools to see what structure is actually being produced
5. **If you find the multi-root issue**, fix it by ensuring all conditional branches produce valid nesting

## Expected Success

Once fixed:
- chargen will open and render the "Name" step
- Steps will progress normally (name → type → species → etc.)
- No "single root element" errors
- App identity will correctly show as "chargen"

