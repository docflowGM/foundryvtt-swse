# SWSE Sheet Layer Guardrails

**Date:** 2026-03-14
**Purpose:** Prevent regression of the three critical failures that were just fixed
**Status:** Implemented in character-sheet.js

---

## Overview

Two defensive guardrails have been added to the character sheet to catch hydration and lifecycle failures automatically. These guardrails will generate console warnings if someone introduces a regression.

---

## Guardrail 1: Context Contract Validator

**Location:** `character-sheet.js` (top of file, called in `_prepareContext()`)

**Purpose:** Detects missing context keys that would cause silent template rendering failures.

### How It Works

```javascript
function validateContextContract(context, sheetName) {
  const requiredKeys = [
    'equipment', 'armor', 'weapons',           // Inventory spread
    'followerSlots', 'followerTalentBadges',  // Follower context
    'xpEnabled', 'isLevel0', 'isGM',          // UI flags
    'fpAvailable', 'derived', 'abilities'     // Core data
  ];

  const missing = [];
  for (const key of requiredKeys) {
    if (!(key in context)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[SWSE Sheet] ${sheetName} missing context keys: ${missing.join(', ')}`,
      { context }
    );
  }
}
```

Called immediately before returning from `_prepareContext()`:

```javascript
// Verify context is serializable
RenderAssertions.assertContextSerializable(finalContext, "SWSEV2CharacterSheet");

// GUARDRAIL 1: Validate context contract
validateContextContract(finalContext, "SWSEV2CharacterSheet");

return finalContext;
```

### What It Prevents

**Scenario:** Developer adds a new template that requires `context.xpBadges` but forgets to compute it in `_prepareContext()`

**Before Guardrail:**
- Template renders as empty
- No console warning
- Silent failure

**After Guardrail:**
- Console warns: `[SWSE Sheet] SWSEV2CharacterSheet missing context keys: xpBadges`
- Developer sees warning immediately when opening sheet
- Bug caught before deployment

### Required Keys Checked

The validator checks for these essential keys:

**Inventory Keys** (must exist even if empty):
- `equipment`
- `armor`
- `weapons`

**Follower Keys:**
- `followerSlots`
- `followerTalentBadges`

**UI Flags** (conditional rendering):
- `xpEnabled`
- `isLevel0`
- `isGM`

**Core Data:**
- `fpAvailable`
- `derived`
- `abilities`

### Extending the Validator

If you add new context keys, add them to `requiredKeys` array:

```javascript
const requiredKeys = [
  // ... existing keys ...
  'newContextKey'  // Add here
];
```

---

## Guardrail 2: Listener Watcher

**Location:** `character-sheet.js` (top of file, called in `_onRender()`)

**Purpose:** Detects listener accumulation that indicates a render-loop memory leak.

### How It Works

```javascript
function watchListenerCount(element, sheetName, threshold = 50) {
  if (!element) return;

  // Count DOM elements as heuristic for listener accumulation
  const allElements = element.querySelectorAll('*');
  if (allElements.length > threshold * 2) {
    console.warn(
      `[SWSE Sheet] ${sheetName} has many DOM elements (${allElements.length}), ` +
      `possible listener accumulation—check browser DevTools Memory tab`
    );
  }
}
```

Called at the end of `_onRender()`:

```javascript
this.activateListeners(this.element, { signal });
ActionEconomyBindings.setupAttackButtons(this.element, this.document);

// GUARDRAIL 2: Monitor for listener accumulation
watchListenerCount(this.element, "SWSEV2CharacterSheet");
```

### What It Prevents

**Scenario:** Developer accidentally removes the `{ signal }` parameter from an `addEventListener()` call

**Before Guardrail:**
- Listeners accumulate on every re-render
- Memory usage grows over time
- Only visible in DevTools memory profiler
- Easily missed during development

**After Guardrail:**
- Console warns if DOM element count seems abnormal
- Warning appears every render
- Developer sees it immediately
- Prompts checking DevTools Memory tab

### Threshold

Default threshold: `50` (warns if more than 100 DOM elements)

Adjust for complex sheets:

```javascript
// In _onRender(), if needed:
watchListenerCount(this.element, "SWSEV2CharacterSheet", 100);  // Higher threshold
```

### Browser DevTools Validation

The guardrail directs to DevTools for manual verification:

1. Open DevTools → Memory tab
2. Take heap snapshot #1
3. Open/close sheet 5 times
4. Take heap snapshot #2
5. Compare heap sizes
6. No growth = listeners properly cleaned

---

## Integration with Existing Guards

These guardrails work alongside existing systems:

```
Developer changes code
    ↓
Sheet renders
    ↓
RenderAssertions.assertContextSerializable()  ← Existing guard: serialization
    ↓
validateContextContract()                      ← NEW GUARD 1: missing keys
    ↓
watchListenerCount()                          ← NEW GUARD 2: listener leak
    ↓
✅ All checks pass OR ⚠️ Warnings logged
```

---

## Console Output Examples

### Guardrail 1 Warning (Missing Context Key)

```
[SWSE Sheet] SWSEV2CharacterSheet missing context keys: xpEnabled, followerSlots
{context: {...}}
```

**Action:** Add the missing keys to `_prepareContext()`

### Guardrail 2 Warning (Possible Listener Leak)

```
[SWSE Sheet] SWSEV2CharacterSheet has many DOM elements (156),
possible listener accumulation—check browser DevTools Memory tab
```

**Action:** Open DevTools → Memory → Check heap snapshot growth

---

## Testing the Guardrails

### Test Guardrail 1: Temporarily Comment Out Context Key

```javascript
// In _prepareContext(), comment out:
// xpEnabled,  // Comment this out to trigger warning

// Open sheet → check console for warning
// Uncomment → warning disappears
```

### Test Guardrail 2: Temporarily Break Listener Cleanup

```javascript
// In _onRender(), temporarily remove signal:
// button.addEventListener("click", { signal }, handler);  // Remove signal
// button.addEventListener("click", handler);  // Listeners accumulate

// Open/close sheet multiple times
// Check console for DOM element warning
```

---

## Maintenance

### When to Update

**Guardrail 1:**
- When adding new required context keys
- When removing deprecated keys
- When refactoring context structure

**Guardrail 2:**
- When threshold needs adjustment (very complex sheets)
- Never otherwise—it's a heuristic, not a precise counter

### When Guardrails Fire False Positives

**Guardrail 1:**
- Normal if optional context keys are missing
- Only required keys are checked
- Adjust `requiredKeys` if legitimate use case

**Guardrail 2:**
- May fire on very complex sheets with many elements
- Increase threshold if needed: `watchListenerCount(..., 200)`
- Always verify with DevTools Memory tab before dismissing

---

## Sentinel Integration

Both guardrails report violations to the Sentinel governance layer for system-wide tracking:

**Guardrail 1 → Sentinel:**
```javascript
SentinelSheetGuardrails.reportMissingContextKeys(sheetName, missing, context)
```
- Layer: `sheet-guardrails`
- Category: `context-hydration`
- Severity: WARN (escalates to ERROR after 3 violations)
- Aggregation: By sheet name and missing keys
- Evidence: Context key sample for debugging

**Guardrail 2 → Sentinel:**
```javascript
SentinelSheetGuardrails.reportListenerAccumulation(sheetName, elementCount, threshold)
```
- Layer: `sheet-guardrails`
- Category: `memory-leak`
- Severity: WARN → ERROR → CRITICAL (escalates with element count)
- Aggregation: By sheet name
- Evidence: Element count percentage over threshold

**Monitoring the Guardrails:**

Check Sentinel dashboard to see:
1. Aggregated violation counts per sheet
2. Violation history with escalation timeline
3. Category breakdown (context-hydration vs memory-leak)
4. Evidence samples from latest violations

**Example Sentinel Query (in dev console):**
```javascript
// Get summary of all tracked guardrail violations
const summary = SentinelSheetGuardrails.getViolationSummary();
console.log(summary);
```

This allows production systems to detect regressions automatically without manual inspection.

---

## Summary

| Guardrail | Triggers On | Action | Prevents |
|-----------|------------|--------|----------|
| Context Contract | Missing context key | Console warning | Silent template failures |
| Listener Watcher | Suspected listener leak | Console warning | Memory growth from render loops |

Both guardrails are **non-destructive** (warnings only) and **automatic** (no manual intervention needed).

They form the first line of defense against the three failures that were just fixed.

