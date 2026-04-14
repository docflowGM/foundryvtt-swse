# Stale Focus Race Condition — Audit Report

## Problem Statement

When a user clicks on multiple species (or chargen items) in rapid succession, the UI may display the **previously selected item** instead of the currently selected item. This is a **race condition** where async completion from an earlier focus overwrites a newer focus.

## Example Scenario

```
T0: User clicks Andoze
T1:   shell.focusedItem = Andoze
T2:   await shell.mentorRail.speak(andozeDialogue) — ASYNC START
T3: User clicks Human (before T2 completes)
T4:   shell.focusedItem = Human (overwrites Andoze)
T5:   await shell.mentorRail.speak(humanDialogue) — ASYNC START
T6: Andoze mentor speak() completes (from T2)
T7:   Updates UI with "Andoze" mentor text ← STALE! Should be Human!
T8: Human mentor speak() completes (from T5)
T9:   Updates UI with "Human" mentor text ← Correct, but we saw Andoze text first
```

**Result:** Visible UI flicker or wrong content displayed until the correct async work completes.

---

## Root Causes Identified

### 1. No Focus Versioning
**Code Location:** `species-step.js` lines 523–551

The onItemFocused() method:
- Sets `shell.focusedItem = entry`
- Calls `await shell.mentorRail.speak(dialogue)`
- No version token to guard against focus changes during the await

**Problem:** If the user clicks a new item during the speak() await, there's no way to know that this speak() result is stale.

### 2. Shell focusedItem Not Versioned
**Code Location:** `progression-shell.js`

The shell tracks `focusedItem` directly, but has no way to know if a given async work is still relevant to the current focus.

### 3. Detail Hydration Assumes Current State
**Code Location:** `species-step.js` lines 313–450

The `renderDetailsPanel()` method hydrates based on the current `focusedItem`, but has no guard against:
- A newer focus being set mid-hydration
- Stale async completion updating the wrong detail panel

### 4. No Completion Timestamp Guard
The mentor rail speak() and detail panel render both complete asynchronously, but have no way to verify they're still relevant.

---

## Failure Modes

### Mode A: Stale Mentor Speech Overwrites New Selection
```
1. Click Andoze → speak(andozeDialogue) starts
2. Click Human → speak(humanDialogue) starts
3. Andoze speak() completes AFTER Human selection
4. Mentor rail shows "Andoze" text even though Human is focused
5. Human speak() eventually completes and corrects it (flicker)
```

### Mode B: Stale Detail Hydration Persists
```
1. Click Andoze → renderDetailsPanel(Andoze) starts
2. Click Human → focusedItem changes to Human
3. renderDetailsPanel(Andoze) completes AFTER Human selection
4. Detail rail shows "Andoze" attributes even though Human is focused
5. Rerender triggered by Human hydration eventually corrects it
```

### Mode C: Combination (Most Likely)
Both mentor speech and detail hydration have stale guard issues, compounding the problem.

---

## Audit Results

### SpeciesStep (Primary Focus)
**Vulnerability Level: HIGH**

**Problematic Code:**
```js
async onItemFocused(id, shell) {
  // ...
  shell.focusedItem = entry;  // T1: Set focus to Species A
  // ...
  const dialogue = this._getOlSaltyDialogue(entry.name);
  if (dialogue) {
    await shell.mentorRail.speak(dialogue, 'encouraging');  // T2: ASYNC, no version guard
  }
  // ...
  shell.render();  // T4: Rerender for Species A
}
```

**Missing:** No version token to verify `shell.focusedItem` hasn't changed during the await.

### ClassStep
**Vulnerability Level: HIGH**

**Problematic Code:**
```js
async onItemFocused(id, shell) {
  const entry = this._allClasses.find(c => c.id === id);
  shell.focusedItem = entry;
  const flavorText = entry.fantasy || entry.description || `...`;
  if (flavorText) {
    await shell.mentorRail.speak(flavorText, 'encouraging');  // SAME PATTERN
  }
  shell.render();
}
```

**Missing:** Same issue as SpeciesStep.

### BackgroundStep
**Vulnerability Level: MEDIUM**

**Problematic Code:**
```js
async onItemFocused(id, shell) {
  const background = this._allBackgrounds.find(b => b.id === id);
  this._focusedBackgroundId = id;
  const flavorText = this._getMentorFlavorForBackground(background);
  if (flavorText) {
    await shell.mentorRail.speak(flavorText, 'neutral');  // SAME PATTERN
  }
  shell.render();
}
```

**Missing:** Same issue, but internal state `_focusedBackgroundId` could also be stale.

---

## The Fix: Focus Version Guard Pattern

### Concept

Every time focus changes, increment a version counter:

```js
this._focusVersion = 0;  // Initialize in constructor

async onItemFocused(id, shell) {
  const focusVersion = ++this._focusVersion;  // Capture current version
  
  shell.focusedItem = entry;
  
  if (dialogue) {
    await shell.mentorRail.speak(dialogue);
    
    // GUARD: Verify focus hasn't changed
    if (this._focusVersion !== focusVersion) {
      console.debug('Stale focus completion, aborting');
      return;  // Discard stale result
    }
  }
  
  shell.render();
}
```

### Why This Works

1. **Versioning:** Each focus change gets a unique version number
2. **Capture Before Async:** We capture the version BEFORE the await
3. **Guard After Async:** After the await completes, we verify the version is still current
4. **Discard Stale:** If the version changed, a newer focus occurred—discard stale work

### Trade-offs

**Pro:**
- Prevents stale completion from updating wrong item
- Minimal code change
- No external dependencies
- Works across all async patterns

**Con:**
- If a focus is discarded due to staleness, the user won't see mentor text for that focus
- This is acceptable because they immediately clicked away

---

## Implementation Plan

### Step 1: SpeciesStep
Add focus version guard to `onItemFocused()`:

```js
export class SpeciesStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    // ... existing code ...
    
    // Focus version guard for stale async prevention
    this._focusVersion = 0;
  }

  async onItemFocused(id, shell) {
    const focusVersion = ++this._focusVersion;  // Increment and capture
    
    const entry = this._resolveSpeciesEntry(id);
    if (!entry) return;

    shell.focusedItem = entry;
    const dialogue = this._getOlSaltyDialogue(entry.name);

    if (dialogue) {
      try {
        await shell.mentorRail.speak(dialogue, 'encouraging');
        
        // GUARD: Verify this focus is still current
        if (this._focusVersion !== focusVersion) {
          console.debug(`[SpeciesStep] Discarding stale focus completion | was: ${focusVersion}, now: ${this._focusVersion}`);
          return;  // Stale, don't render
        }
      } catch (speakErr) {
        console.error(`[SpeciesStep] mentor speak threw:`, speakErr);
        throw speakErr;
      }
    }

    shell.render();
  }
}
```

### Step 2: ClassStep
Add same focus version guard.

### Step 3: BackgroundStep
Add same focus version guard.

### Step 4: Verification
Test rapid consecutive focus changes:
- Click Andoze → confirm hydration
- Click Human immediately → confirm Human hydrates (not Andoze)
- Verify stale completion doesn't occur

---

## Verification Criteria

After implementing focus version guards:

✅ **Single Focus Change:**
- Click Species A → detail rail hydrates with A's attributes and mentor text

✅ **Rapid Focus Change (AB):**
- Click Species A
- Immediately click Species B (before A's mentor animation completes)
- Expected: Detail rail shows B's attributes, B's mentor text
- NOT expected: Flicker to A's text then B's text

✅ **Three Rapid Clicks (ABC):**
- Click Species A
- Click Species B (before A completes)
- Click Species C (before B completes)
- Expected: Detail rail shows C (no intermediate states visible)

✅ **Slow Clicks (A, pause, B):**
- Click Species A → completes fully
- Wait 1–2 seconds
- Click Species B → completes fully
- Expected: A hydrates, then B hydrates (no overlap, no staleness)

✅ **Console Logs Show:**
- First focus: completes mentor speak
- Rapid second focus: captures new version, old completion discarded
- Third focus: follows same pattern

---

## Risk Assessment

### Low Risk:
- ✓ Version guard is simple integer increment
- ✓ No async library changes
- ✓ No breaking changes to existing APIs
- ✓ Guard only prevents stale work from applying
- ✓ Current focus always wins (correct behavior)

### Test Coverage:
- ✓ Single clicks (existing behavior preserved)
- ✓ Rapid clicks (stale guard prevents wrong state)
- ✓ Mixed timing (graceful handling)

---

## Summary

**Bug:** User clicks Species A, then Species B → Species A mentor text shows instead of Species B  
**Cause:** No version guard on async completion; stale speak() or hydration overwrites new focus  
**Fix:** Increment focus version each time focus changes; guard async completion with version check  
**Impact:** Prevents stale hydration state from persisting after rapid focus changes  
**Risk:** Very low; simple guard pattern with no side effects

This bug exists in SpeciesStep, ClassStep, and BackgroundStep (any step with async mentor speech).

---

## Report

**Files to Modify:**
1. species-step.js — Add `_focusVersion` guard
2. class-step.js — Add `_focusVersion` guard
3. background-step.js — Add `_focusVersion` guard

**Lines Affected:**
- Constructor: Add `this._focusVersion = 0` (1 line per file)
- onItemFocused(): Capture version, guard async completion (3–4 lines per file)

**Total Changes:** ~12 lines across 3 files
