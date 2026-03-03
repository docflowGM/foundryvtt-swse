# Sentinel Forensics Guide - Phase 3.5

**Status**: ✅ ACTIVATED
**File**: `scripts/governance/sentinel/enforcement-core.js`
**Date**: March 3, 2026

---

## What's New

Sentinel now includes **mutation forensics** to capture DOM mutations and render calls during boot. This allows us to identify exactly what's causing the sidebar collapse.

---

## How to Use

After Foundry loads and you see the sidebar collapse, run these commands in the **Browser Console**:

### 1. Get Forensics Summary
```js
_SWSE_Enforcement.forensics()
```

Returns:
- Last 20 DOM mutations with timestamps
- Last 10 render calls with stack traces
- Current sidebar state (display value, classes, active status)

### 2. Get Detailed Mutations
```js
_SWSE_Enforcement.mutations()
```

Returns array of all DOM mutations observed during boot:
- Type (attribute change, node removed, etc.)
- Element affected (#sidebar, #scenes, etc.)
- Timestamp (ms since ready hook)
- Details (attributes changed, nodes added/removed)

### 3. Get Render Stack
```js
_SWSE_ENFORCEMENT.renderStack()
```

Returns array of all Application.render() calls:
- App name (CharacterSheet, SWSEChargen, etc.)
- Timestamp (ms since ready hook)
- Whether it was forced or soft render
- Stack trace fragment showing call origin

### 4. Get All Violations
```js
_SWSE_Enforcement.summary()
```

Returns violations grouped by severity and type.

---

## What to Look For

When the sidebar collapses, check the forensics output for:

### 🚨 Red Flags

**Mutation that removed `active` class from `#scenes`:**
```js
{
  type: 'attributes',
  element: 'scenes',
  attributeName: 'class',
  oldValue: 'tab active sidebar-tab ...'  // had 'active'
  // → next mutation removed it
}
```

**Render call during Sentinel detection:**
```js
{
  app: 'SomeSWSEApp',
  timestamp: 3500,  // During engine init
  stack: 'SomeFile.js → render() → ...'
}
```

**Sidebar tab hidden despite being active:**
```js
{
  display: 'none',  // Should NOT be none if active
  classes: '...active...',  // Has active class
  hasActive: true  // Is marked as active
}
```

---

## Reading the Forensics Output

### Example Output Structure

```js
{
  mutations: [
    {
      type: 'childList',
      element: 'sidebar',
      timestamp: 1200,
      details: { addedNodes: 0, removedNodes: 1 }
    },
    {
      type: 'attributes',
      element: 'scenes',
      timestamp: 1350,
      details: { attributeName: 'class', oldValue: 'tab active...' }
    }
  ],
  renders: [
    {
      app: 'SWSEChargen',
      timestamp: 3200,
      args: 'force-render',
      stack: 'chargen-main.js:212 → render() → ...'
    }
  ],
  sidebarState: {
    display: 'none',  // ← PROBLEM: Should be 'block' or 'flex'
    classes: 'tab sidebar-tab directory flexcol scenes-sidebar',  // ← Missing 'active'
    hasActive: false  // ← PROBLEM: Should be true
  }
}
```

---

## Diagnostic Workflow

**When you see the sidebar collapse:**

1. Open DevTools Console
2. Run `_SWSE_Enforcement.forensics()`
3. Look at the last mutation before collapse
4. Check the `sidebarState` - is `display: none` despite having `active` class?
5. Check `renders` - is a render call happening during the collapse?
6. Screenshot or copy the output

---

## What This Tells Us

### Scenario A: Mutation Removed `active` Class
```
→ Something is calling: document.querySelector('#scenes').classList.remove('active')
→ Find the hook/function doing this
→ Add a guard to prevent it
```

### Scenario B: Render Loop During Init
```
→ A render() call is being made while Sentinel checks layout
→ The render cycle is interfering with AppV2 layout contract
→ Delay or suppress the render during initialization
```

### Scenario C: CSS Hiding Active Tab
```
→ #scenes has 'active' class but display:none is computed
→ A CSS rule is hiding .active or .tab
→ We already audited CSS - if this appears, check dynamic styles
```

---

## Example Session

```js
// After sidebar collapses, run:
_SWSE_Enforcement.forensics()

// Output shows:
{
  sidebarState: {
    display: 'none',  // ← The Problem
    classes: '... scenes-sidebar'  // ← No 'active' class!
    hasActive: false
  },
  mutations: [
    // Scroll through to find when 'active' was removed
    { type: 'attributes', element: 'scenes', timestamp: 3421, ... }
  ],
  renders: [
    { app: 'SomeEngine', timestamp: 3400, stack: '...' }  // ← Happened just before
  ]
}

// This tells us:
// 1. At timestamp 3400, a render() call happened
// 2. At timestamp 3421, the 'active' class was removed from #scenes
// 3. Result: #scenes became display:none

// Action:
// - Find what's rendering at 3400
// - Check if it's calling ui.sidebar.render() or manipulating tabs
```

---

## Limitations

- Forensics only track the **first 10 seconds** of boot (DEV mode only)
- Maximum 100 mutations stored (keeps memory reasonable)
- Maximum 10 render calls stored
- Trace stacks are truncated to first 3 lines (readability)

---

## Next Steps

**After you capture forensics:**

1. Run `_SWSE_Enforcement.forensics()`
2. Take a screenshot of the output
3. Look for the smoking gun in mutations or renders
4. Report back with:
   - The exact mutation that removed/hid the sidebar tab
   - OR the render call that happened right before collapse
   - OR the CSS rule that's hiding an active tab

This will pinpoint the exact cause so we can fix it surgically.

---

## Implementation Details

The forensics layer:
- Wraps `Application.prototype.render()` to log all render calls
- Attaches a `MutationObserver` to `#sidebar` after ready hook
- Records mutations with timestamps relative to ready hook
- Stops observing after 10 seconds (prevents memory leaks)
- Exposes forensics through `window._SWSE_Enforcement.forensics()`

**No performance impact** - tracks only during first 10 seconds of boot.
