# Registry/Render Integration Fix — Ready for Diagnostics

## Status: DIAGNOSTIC LOGGING ADDED
All console logging has been added to pinpoint the species step resolution failure.

## What Was Changed

### 1. progression-shell.js (_initializeSteps method)
- **Lines 253-260**: Logs canonical descriptors retrieval
- **Lines 268-271**: Logs conditional descriptors  
- **Lines 279-284**: Detailed merge output with isHidden status
- **Lines 290-293**: Shows final filtered steps
- **Lines 303-334**: Target step lookup with detailed comparison logging

### 2. chargen-shell.js (_getCanonicalDescriptors method)
- **Lines 48-53**: Logs initial CHARGEN_CANONICAL_STEPS state (count and IDs)
- **Lines 58-67**: Process each step with isDroid check logging
- **Lines 69-71**: SpeciesStep plugin assignment logging
- **Lines 81-93**: Error handling wrapper around descriptor creation
- **Lines 95-99**: Final descriptor count and list

## To Diagnose The Problem

1. **Open Foundry VTT in browser**
2. **Open Developer Console** (F12 → Console tab)
3. **Create a new character**
   - Click progression button / chargen entry point
   - Watch the splash screen play out
   - Click "Continue to Species" button
   
4. **Look for this sequence in the console:**
   ```
   [ChargenShell._getCanonicalDescriptors] Initial state
   [ChargenShell._getCanonicalDescriptors] Processing step...
   [ProgressionShell] Canonical descriptors after _getCanonicalDescriptors()
   [ProgressionShell] All descriptors after merge
   [ProgressionShell] Final filtered steps
   BEFORE TARGET STEP LOOKUP
   [ProgressionShell] Comparing step...
   [ProgressionShell] Target step not found: species. Using index 0.
   ```

5. **Copy the relevant console output** and look for:
   - Is 'species' in the canonicalStepIds list?
   - Is 'species' being processed in the map?
   - Is 'species' in the "Final filtered steps"?
   - What step is actually at index 0?

## Critical Success Indicators

**If working correctly, you should see:**
```
stepIds: [..., 'species', 'attribute', ...]
[ProgressionShell] Navigating to target step: species (index 1)
```

**If broken, you'll see:**
```
stepIds: ['intro', 'attribute', ...]  # species missing!
[ProgressionShell] Target step not found: species. Using index 0.
```

## Most Likely Root Cause

Based on code analysis, the most probable issue is:

**Species step is being filtered out as `isHidden: true`**

This would explain:
- Why it's not found in the target lookup
- Why the shell falls back to index 0 (intro)
- Why the error occurs silently during initialization

The filter is at line 290 of progression-shell.js:
```javascript
this.steps = allDescriptors.filter(d => !d.isHidden);
```

## If Species IS Missing From Canonical

Check for these possible causes:
1. `CHARGEN_CANONICAL_STEPS` is empty or undefined
2. Module imports are failing silently
3. The species step configuration in CHARGEN_CANONICAL_STEPS is malformed
4. isDroid detection is wrongly routing non-droid characters to droid-builder

## Quick Fix (If Confirmed)

If species is being hidden, the fix would be:

```javascript
// In createStepDescriptor or in _getCanonicalDescriptors
// Ensure species is NOT marked as isHidden
```

Or remove species from the hidden filter:
```javascript
// Only hide category steps with no choices
this.steps = allDescriptors.filter(d => {
  if (d.stepId === 'species') return true; // Always show species
  return !d.isHidden;
});
```

## Action Items

1. **Run the diagnostic** (steps above)
2. **Take a screenshot** of the console output around the species lookup
3. **Identify which log message is the last one before the error**
4. **Report back** with:
   - Console output screenshot
   - Which step count is wrong (canonical, merged, or filtered?)
   - Whether species appears in any of the step ID lists

With this information, we can implement the targeted fix.

