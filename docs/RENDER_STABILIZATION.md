# Render Stabilization Guide

## The Problem

When you call `this.render(false)` during an input handler, Foundry:

1. Destroys current DOM
2. Rebuilds from template
3. Reattaches listeners

But:
- Input field is mid-edit → gets reset
- Your cursor position is lost
- Partial state is not preserved
- Listeners may double-bind

**Result:** "1-character input bug" — user types "a", field resets, type "ab", field resets again.

---

## Root Cause Analysis

**The Anti-Pattern:**

```javascript
// ❌ WRONG (causes render cascade)
input.addEventListener('input', (e) => {
  this.value = e.target.value;
  this.render(false);  // DESTROYS THE INPUT FIELD
});
```

What happens:
1. User types "a"
2. 'input' event fires
3. render(false) destroys entire form
4. Form re-renders with empty input
5. Listener re-attaches
6. User's "a" is in browser input but not in rendered form
7. Next keystroke: field resets again

---

## The Fix: Minimal Render Policy

### Rule 1: Don't Render on Input

```javascript
// ❌ NEVER DO THIS
input.addEventListener('input', (e) => {
  this.render(false);  // Kill the input you're editing!
});

// ✅ DO THIS INSTEAD
input.addEventListener('input', async (e) => {
  const value = e.target.value;
  await UpdatePipeline.apply(this.actor, path, value);
  // NO render() call
});
```

### Rule 2: Only Render for Major State Changes

```javascript
// ❌ These should NOT trigger render
- typing in input
- toggling checkbox
- selecting from dropdown
- scrolling
- hovering
- accordion expand/collapse

// ✅ ONLY render for these
- step/tab change
- loading data
- major structural change
- actor update (via listener)
```

### Rule 3: Use Repaint for Value Updates

```javascript
// Instead of full render:
// ✅ Update just the label
Repaint.updateText('.skill-total', newTotal);

// ✅ Update just the field
Repaint.updateField('#skill-name-input', value);

// ✅ Toggle just a class
Repaint.toggleClass('.panel', 'open', true);
```

---

## Implementation: 4-Step Fix

### Step 1: Stop Full Renders on Input

**File:** Any sheet/app with input handlers

```javascript
// BEFORE
async onSkillChange(event) {
  const skill = event.target.name;
  const value = event.target.value === 'on';
  this.actor.system.skills[skill].trained = value;
  this.render(false);  // ❌ KILL THIS
}

// AFTER
async onSkillChange(event) {
  const skill = event.target.name;
  const value = event.target.value === 'on';
  
  await UpdatePipeline.apply(
    this.actor,
    `system.skills.${skill}.trained`,
    value
  );
  // No render() - actor update listener will handle it
}
```

### Step 2: Attach Hydration Listener

**File:** Sheet's activateListeners() method

```javascript
activateListeners(html) {
  super.activateListeners(html);
  
  // Auto-re-render when actor changes
  HydrationGuarantee.attachHydrationListener(this, 'actor');
}
```

### Step 3: Use RenderLifecycle to Prevent Cascades

**File:** Sheet's activateListeners() method

```javascript
import { RenderLifecycle } from './scripts/ui/utils/RenderLifecycle.js';

class MySheet extends ActorSheet {
  activateListeners(html) {
    super.activateListeners(html);
    
    const lifecycle = new RenderLifecycle(this);
    
    // Clean old listeners first
    lifecycle.cleanListeners(html);
    
    // Attach all listeners through lifecycle
    html.querySelectorAll('[data-action]').forEach(el => {
      lifecycle.attachListener(el, 'click', (e) => {
        const action = el.dataset.action;
        this.handleAction(action, e);
      });
    });
  }
}
```

### Step 4: Preserve Focus During Renders

**File:** Sheet's onUpdateActor() or similar

```javascript
async _onUpdate() {
  // Preserve focus BEFORE render
  const focus = Repaint.preserveFocus(this.element);
  
  // Do your render
  await this.render(false);
  
  // Restore focus AFTER render
  Repaint.restoreFocus(this.element, focus);
}
```

---

## Specific Bug Fixes

### Bug: "1-Character Input"

**Symptom:** Type "hello", field shows "h", then "he", then "h" again

**Root Cause:** render(false) on each keystroke

**Fix:**

```javascript
// ❌ REMOVE
input.addEventListener('input', () => {
  this.render(false);
});

// ✅ REPLACE WITH
input.addEventListener('input', async (e) => {
  await UpdatePipeline.apply(this.actor, path, e.target.value);
  // Let actor listener trigger re-render if needed
});
```

### Bug: "Accordion Collapses"

**Symptom:** Open accordion, it closes immediately

**Root Cause:** render(false) on click, accordion state not in actor data

**Fix:**

```javascript
// ❌ REMOVE
accordion.addEventListener('click', () => {
  this.render(false);  // Destroys the open class!
});

// ✅ REPLACE WITH
accordion.addEventListener('click', (e) => {
  e.target.classList.toggle('open');
  // No render needed - it's just a CSS class
});
```

### Bug: "Double-Click Required"

**Symptom:** Click to select feat, nothing happens, click again and it works

**Root Cause:** Listener attached twice, first one doesn't update, second one does

**Fix:**

```javascript
// ✅ In activateListeners()
activateListeners(html) {
  super.activateListeners(html);
  
  // MUST clean listeners first
  const lifecycle = new RenderLifecycle(this);
  lifecycle.cleanListeners(html);
  
  // NOW attach
  html.querySelector('[data-action="select"]')
    .addEventListener('click', (e) => this.handleSelect(e));
}
```

### Bug: "Lost Focus / 1-Character Typing"

**Symptom:** Start typing in field, after one character it loses focus

**Root Cause:** render(false) destroys the focused element

**Fix:**

```javascript
// ✅ Before any render
const focus = Repaint.preserveFocus(html);

// ... do render ...

// ✅ After render
Repaint.restoreFocus(html, focus);
```

---

## Safe Patterns

### Pattern 1: Input That Syncs to Actor

```javascript
// ✅ CORRECT
input.addEventListener('input', async (e) => {
  // Don't render on input
  await UpdatePipeline.apply(this.actor, path, e.target.value);
});

// Listener on actor will trigger refresh if needed
this.actor.on('update', () => this.render(false));
```

### Pattern 2: Accordion (No Actor State)

```javascript
// ✅ CORRECT
accordion.addEventListener('click', (e) => {
  // Just toggle the class, no render
  e.currentTarget.classList.toggle('open');
});
```

### Pattern 3: Button That Changes Actor

```javascript
// ✅ CORRECT
button.addEventListener('click', async (e) => {
  e.preventDefault();
  
  // Update actor (not UI directly)
  await UpdatePipeline.apply(this.actor, path, value);
  
  // Hydration listener will handle re-render
});
```

### Pattern 4: Complex Update

```javascript
// ✅ CORRECT
async handleMultipleChanges() {
  const lifecycle = new RenderLifecycle(this);
  
  await lifecycle.withRenderLock(async () => {
    // All these updates batched
    await UpdatePipeline.apply(...);
    await UpdatePipeline.apply(...);
    await ProgressionStatePersistence.saveSelection(...);
  });
  
  // Single re-render after all updates
  await lifecycle.queueRender();
}
```

---

## Checklist: Stabilize Your Sheet

For every interactive element:

- [ ] Click handler does NOT call this.render()
- [ ] Input handler does NOT call this.render()
- [ ] If you must render, preserve focus first
- [ ] Listeners attached through RenderLifecycle
- [ ] HydrationGuarantee attached in activateListeners()
- [ ] All mutations through UpdatePipeline
- [ ] Accordions use classList.toggle(), not render
- [ ] Fields use Repaint.updateField(), not innerHTML

---

## The Result

After applying this:

✅ **No more input resets**
✅ **No more 1-character bugs**
✅ **Accordions stay open**
✅ **Single-click selection works**
✅ **Typing feels natural**
✅ **Everything feels responsive**

---

## Debugging Checklist

If you still have bugs:

1. **Check for render(false) in listeners:**
   ```bash
   grep -r "\.render(false)" scripts/sheets --include="*.js"
   ```

2. **Check for this.element.innerHTML =**
   ```bash
   grep -r "\.innerHTML =" scripts/sheets --include="*.js"
   ```

3. **Check for manual DOM mutations:**
   ```bash
   grep -r "\.textContent =" scripts/sheets --include="*.js"
   ```

4. **Enable debug logging:**
   ```javascript
   import { SWSELogger } from './scripts/utils/logger.js';
   SWSELogger.setLevel('debug');
   ```

5. **Monitor listener attachment:**
   - Open browser dev console
   - Look for "[RenderLifecycle]" messages
   - Check that listeners are only attached once

---

## Golden Rule

> **Never render during an edit. The input IS the edit.**

If you follow that one rule, 90% of your render bugs disappear.
