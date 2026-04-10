# Sidebar Icon Instrumentation - Debug Guide

## What This Does

Temporary instrumentation has been added to trace exactly what happens to sidebar icons during startup and after.

**Console Prefix**: Look for all messages starting with `[SWSE Sidebar Debug]`

---

## How to Use

### 1. Open Foundry and DevTools
- Load Foundry Virtual Tabletop with this system
- Open DevTools: **F12 → Console tab**
- Keep the console open during game load

### 2. Watch for Debug Output
All instrumentation messages appear with prefix: `[SWSE Sidebar Debug ###ms]`

The number is milliseconds elapsed since startup.

### 3. Manual Inspection (Optional)
If you want to manually check button state at any time:

```javascript
SWSE_DEBUG.snapshotTabs()      // Full snapshot of all tab buttons
SWSE_DEBUG.checkTabContent()   // Quick check of innerHTML presence
```

Paste these into the console and press Enter.

---

## What to Look For

### Phase 1: Icon Content Status

At each phase (INIT, SETUP, READY, +250ms, +500ms, +1000ms, +2000ms), the instrumentation logs:

```
[SWSE Sidebar Debug 45ms] SETUP - Found 9 tab buttons
  ✓ data-tab="chat" has content (125 chars)
  ✓ data-tab="combat" has content (130 chars)
  ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
  ⚠️ EMPTY CONTENT: data-tab="items" has no innerHTML
  ...
```

**Interpret**:
- ✓ = Button has icon content (good)
- ⚠️ = Button has NO innerHTML (problem)

### Phase 2: When Does Content Disappear?

If buttons have content at SETUP but not at READY:
```
[SWSE Sidebar Debug 50ms] SETUP - Found 9 tab buttons
  ✓ data-tab="actors" has content

[SWSE Sidebar Debug 2000ms] READY +2000ms - Found 9 tab buttons
  ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
```

**Interpretation**: Content was removed/replaced between SETUP and READY.

### Phase 3: Mutation Observer Output

If MutationObserver detects changes:

```
[SWSE Sidebar Debug 1234ms]   → childList change detected
  addedNodes: 9
  removedNodes: 0

[SWSE Sidebar Debug 1245ms]     ❌ REMOVED: BUTTON
  dataTab: "actors"
  outerHTML: <button... data-tab="actors">...

[SWSE Sidebar Debug 1246ms]     ✓ ADDED: BUTTON
  dataTab: "actors"
  innerHTML: <i class="fas fa-users"></i>
```

**Interpret**:
- If you see REMOVED then ADDED → DOM is being rebuilt
- If you see neither → No mutations happening
- Large childList changes → Sidebar being restructured

### Phase 4: The `sentinelSheetGuardrails` Error

Look for:

```
[SWSE Sidebar Debug 1500ms] ❌ ERROR reading sentinelSheetGuardrails
  message: "foundryvtt-swse.sentinelSheetGuardrails is not a registered game setting"
  timeElapsed: 1500
```

**Correlate** this with icon disappearance timing. If the error happens right before icons disappear, it's likely the culprit interrupting initialization.

---

## Key Diagnostic Patterns

### Pattern A: Icons Empty from Start
```
SETUP - ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
READY - ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
+2000ms - ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
```

**Diagnosis**: Icon content was never inserted in the first place.

**Likely cause**: 
- Foundry's sidebar render didn't include icon children
- SWSE's expected button structure doesn't match what Foundry creates
- Old sidebar mutation code removed the icon content

---

### Pattern B: Icons Appear Then Disappear
```
SETUP - ✓ data-tab="actors" has content (125 chars)
READY - ✓ data-tab="actors" has content (125 chars)
+1000ms - ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML

→ childList change detected
  addedNodes: 9
  removedNodes: 9
```

**Diagnosis**: Content exists, then something removes/rebuilds it.

**Likely cause**:
- JS code mutating `#sidebar-tabs` after Foundry renders
- Old combat-action-browser.js or action-palette mutation code still active
- Some hook is rebuilding sidebar tabs post-render

---

### Pattern C: CSS Hiding (Without Content Removal)
```
SETUP - ✓ data-tab="actors" has content (125 chars)
READY - ✓ data-tab="actors" has content (125 chars)
+2000ms - ✓ data-tab="actors" has content (125 chars)

Computed styles:
  display: "none"
  visibility: "hidden"
  opacity: "0"
```

**Diagnosis**: Icons exist but are hidden by CSS.

**Likely cause**:
- CSS rule applying `display: none` or similar
- Class being added that hides icons
- Pseudo-element `::before` or `::after` content being suppressed

---

### Pattern D: Startup Interruption
```
[SWSE Sidebar Debug 800ms] ❌ ERROR reading sentinelSheetGuardrails
  timeElapsed: 800

[SWSE Sidebar Debug 810ms] READY HOOK FIRED

[SWSE Sidebar Debug 1000ms] READY +1000ms
  ⚠️ EMPTY CONTENT: data-tab="actors" has no innerHTML
```

**Diagnosis**: Error happens, then initialization continues but leaves sidebar broken.

**Likely cause**:
- `sentinelSheetGuardrails` error interrupts a critical initialization step
- Error is caught, but sidebar rendering is left incomplete

---

## What to Copy/Paste for Report

When you run the game with this instrumentation, capture:

1. **Full console output** (copy all `[SWSE Sidebar Debug]` messages)
2. **Timeline of icon status** (are they present or empty at each phase?)
3. **Any MutationObserver output** (was DOM being rebuilt?)
4. **Timing of the sentinelSheetGuardrails error** (when did it fire?)
5. **Computed styles** (any CSS hiding them?)

Then identify which **Pattern** (A, B, C, or D) your results match.

---

## Important Notes

- This instrumentation is **temporary** and should be removed after diagnosis
- It adds no functional changes, only logging
- Console output will be verbose — that's intentional for clarity
- If console output is too long, look for the **Phase Summary** lines (SETUP, READY, +1000ms, etc.)

---

## After Diagnosis

Once you identify the pattern, report back with:
1. Which pattern matched
2. Timeline of when icon content changed
3. Whether mutations were detected
4. Whether the sentinelSheetGuardrails error correlated
5. Any other suspicious output

This will pinpoint the exact file and code path causing the issue.

---

**Location**: `/scripts/core/sidebar-icon-instrumentation.js`  
**Activated In**: `/scripts/core/init.js`

To disable instrumentation, comment out or remove the import and call in `init.js`.
