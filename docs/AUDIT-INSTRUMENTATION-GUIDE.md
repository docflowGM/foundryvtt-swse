# CHARGEN LAUNCH AUDIT — INSTRUMENTATION GUIDE

## Quick Start

This repository now contains **TEMP AUDIT instrumentation** that traces the complete launch chain from button click to app initialization for Chargen and Level-Up buttons.

### What Was Done

**Total instrumentation added:** 29 console.log statements across 4 critical files
- Character sheet click listeners: 6 logs
- Hook registration & firing: 9 logs
- launchProgression entry: 5 logs
- ProgressionShell initialization: 9 logs

All logs are prefixed with `[TEMP AUDIT]` for easy filtering.

### How to Run the Audit

1. **Start Foundry VTT** with this system
2. **Open a character sheet** (level 0 to see Chargen button, level > 0 to see Level-Up button)
3. **Open browser DevTools** (F12 or Right-Click → Inspect)
4. **Go to Console tab** and ensure you can see logs
5. **Click the "Chargen" or "Level Up" button** on the character sheet
6. **Watch the logs** as the click propagates through the system
7. **Note where logs STOP** — this is the failure point

### Expected Audit Log Flow

When clicking "Chargen" button, you should see logs in this order:

```
[TEMP AUDIT] Found chargen buttons in sheet HTML: 1
[TEMP AUDIT] Binding chargen button click listener
[TEMP AUDIT] Chargen button clicked via sheet listener
[TEMP AUDIT] launchProgression called with actor: {name}, character
[TEMP AUDIT] Importing ChargenShell...
[TEMP AUDIT] ChargenShell imported successfully: ChargenShell
[TEMP AUDIT] Calling ChargenShell.open()
[TEMP AUDIT] ProgressionShell.open called: { actor: {name}, mode: 'chargen', this: 'ChargenShell' }
[TEMP AUDIT] Creating app instance of class: ChargenShell
[TEMP AUDIT] App instance created: ChargenShell
[TEMP AUDIT] Calling _initializeSteps...
[TEMP AUDIT] Steps initialized, count: 13
[TEMP AUDIT] Calling _initializeFirstStep...
[TEMP AUDIT] First step initialized
[TEMP AUDIT] Calling app.render()...
[TEMP AUDIT] Render called on app
```

### Failure Point Analysis

**Check where logs stop and use this table:**

| Last Log Appearing | Likely Problem | Check |
|-------------------|-----------------|-------|
| (no logs at all) | Button not found in DOM or click listener not attached | Is `[data-action="cmd-chargen"]` button visible in DevTools Inspector? Is `isLevel0` context correct? |
| "Found chargen buttons: 0" | Template button not rendering | Check template context: is `isLevel0 === true`? |
| "Chargen button clicked via sheet listener" doesn't appear | Click event not firing listener | Verify button exists in DOM and listener is attached |
| "launchProgression called..." doesn't appear | Handler not executing or promise rejected silently | Check for JavaScript errors in console |
| "ChargenShell imported successfully..." doesn't appear | Module import failed | Check module syntax, circular dependencies |
| "Steps initialized, count: 0" | Step descriptors empty | Check ChargenShell._getCanonicalDescriptors() |
| "First step initialized" doesn't appear | Step plugin initialization failed | Check step plugin error handling |
| No logs appear at all during progression | Exception swallowed; check browser errors tab | Look for red errors in console |

### Two Button Systems in Code

**Important:** The code has TWO separate button implementations:

1. **Hardcoded Template Buttons** (`[data-action="cmd-chargen"]` / `[data-action="cmd-levelup"]`)
   - Located in: `/templates/actors/character/v2/character-sheet.hbs` lines 23-27
   - Listeners attached in: `/scripts/sheets/v2/character-sheet.js` lines 1046-1058
   - **This is the primary path being tested**

2. **Header Control Hook Buttons** (`swse-chargen` / `swse-levelup`)
   - Created by: `getHeaderControlsApplicationV2` hook callbacks
   - Located in: `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` and `levelup-sheet-hooks.js`
   - **These may not render if hook doesn't fire**

The audit focuses on the **template button path** (1) since that's the primary implementation in the sheet.

### Instrumentation Files Modified

These files have been modified to add TEMP AUDIT logs:

1. **`/scripts/sheets/v2/character-sheet.js`**
   - Lines 1044-1065: Added logs for button finding and click listener binding
   - Added listener execution logs

2. **`/scripts/infrastructure/hooks/chargen-sheet-hooks.js`**
   - Lines 59-92: Added logs for hook firing, controls mutation, handler execution
   - Lines 12-30: Added logs in onClickChargen() for entry and launchProgression call

3. **`/scripts/infrastructure/hooks/levelup-sheet-hooks.js`**
   - Lines 97-130: Added logs for hook firing and button injection
   - Lines 53-95: Added logs in onClickLevelUp() for entry and launchProgression call

4. **`/scripts/apps/progression-framework/progression-entry.js`**
   - Lines 31-92: Added logs for entry, ChargenShell import, and exception handling

5. **`/scripts/apps/progression-framework/chargen-shell.js`**
   - Lines 35-41: Added logs for shell.open() entry

6. **`/scripts/apps/progression-framework/shell/progression-shell.js`**
   - Lines 127-171: Added logs for app creation, step initialization, rendering

### Cleanup

All TEMP AUDIT instrumentation can be removed by searching for and deleting lines containing:

```javascript
console.log('[TEMP AUDIT]
```

Example cleanup command (DO NOT RUN YET):
```bash
find /systems/foundryvtt-swse/scripts -name "*.js" -exec sed -i "/\[TEMP AUDIT\]/d" {} \;
```

### Output Files

The audit report has been generated and saved to:

- **`/CHARGEN-LAUNCH-AUDIT.md`** — Comprehensive audit report with:
  - Complete launch chain map
  - Button inventory table
  - Runtime evidence checklist
  - Failure pattern analysis
  - Root cause rankings
  - Minimal fix plan

---

## Next Steps

1. **Run Foundry** with instrumentation active
2. **Click Chargen/Level-Up button** and observe console logs
3. **Identify where logs stop** (failure point)
4. **Review `/CHARGEN-LAUNCH-AUDIT.md`** for analysis of that failure point
5. **Provide feedback** on:
   - Whether logs appear in expected order
   - Where logs stop (if they do)
   - Any error messages in browser console
   - Whether chargen/progression app actually opens or not

This will allow us to narrow down the exact cause and implement a minimal, targeted fix.

