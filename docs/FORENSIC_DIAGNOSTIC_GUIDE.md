# Forensic Sheet Resolution Diagnostic Guide

## Purpose
This diagnostic instruments the actor sheet resolution system to trace **exactly where and why** `actor.sheet` returns null without modifying any actual behavior.

## How It Works

The diagnostic instruments five critical points in the sheet resolution chain:

1. **Actor.sheet Getter** - Logs every access attempt, including what `_getSheetClass()` returns and what the getter ultimately produces
2. **_getSheetClass Method** - Logs the sheet class that gets selected for each actor
3. **_sheet Property Lifecycle** - Logs all attempts to read or write the internal `_sheet` property
4. **Constructor Chain** - Logs actor construction to verify the object is properly initialized
5. **Document Class Validation** - Logs the CONFIG.Actor.documentClass wiring at initialization time

## Running the Diagnostic

### Step 1: Reload the System
After this code is committed, reload the Foundry world:
- Press F12 to open Developer Tools → Console tab
- Type: `location.reload()`
- Wait for the system to fully load

### Step 2: Look for Initialization Logs
You should see a message in the console:

```
=== SHEET DIAGNOSTIC INITIALIZATION ===
[DIAGNOSTIC] Document Class: SWSEV2BaseActor
[DIAGNOSTIC] Document Class Prototype Chain:
  └─ [0] SWSEV2BaseActor
  └─ [1] SWSEActorBase
  └─ [2] Actor
  ...
```

This confirms the diagnostic is installed.

### Step 3: Trigger the Failure
In the UI, **click on an actor in the Actor Directory** to trigger the sheet render.

### Step 4: Examine the Console Output
You will see detailed logs in this order:

#### A. Constructor Call (if available)
```
[CONSTRUCTOR] SWSEV2BaseActor
Arguments: [...]
This: (actor object)
Constructor succeeded for: (Actor Name)
```

#### B. Sheet Getter Call
```
[SHEET GETTER] (Actor Name)
Actor: {
  name: "(Actor Name)",
  id: "(actor-uuid)",
  type: "character"
}
_sheet value: (undefined) | (value type)
_getSheetClass() result: SWSEV2CharacterSheet | ERROR_MESSAGE
Getter result: (Application instance or null)
Getter result type: object | null
Getter result constructor: SWSEV2CharacterSheet | unknown
```

#### C. GetSheetClass Call
```
[_getSheetClass] (Actor Name)
Actor type: character
Result: SWSEV2CharacterSheet | ERROR_MESSAGE
```

#### D. Sheet Property Setters
```
[_sheet SET] (Actor Name): Setting to SWSEV2CharacterSheet | undefined
[_sheet GET] (Actor Name): SWSEV2CharacterSheet | undefined
```

## Analyzing the Results

### Critical Data Points

After clicking an actor, run this in the console to get a summary:

```javascript
window.__SWSE_SHEET_DIAGNOSTIC__.report()
```

This will show:
- Total getter calls made
- Total _getSheetClass calls made
- Total _sheet property writes
- Any errors that occurred
- The last getter call details

### Key Questions to Answer

**1. Is _getSheetClass() returning a valid class?**
   - Look for: `Result: SWSEV2CharacterSheet`
   - If you see an error message instead, something is wrong with class selection

**2. Is _sheet being set to null after the getter runs?**
   - Look for: `[_sheet SET] ... Setting to undefined`
   - If this happens AFTER a successful getter, something is clearing the sheet

**3. Does the getter return a proper Application instance?**
   - Look for: `Getter result: (Object)` and `Getter result constructor: SWSEV2CharacterSheet`
   - If you see `null` here, the getter is failing to instantiate

**4. Is the document class properly wired?**
   - At initialization, you should see:
     ```
     CONFIG.Actor.documentClass: SWSEV2BaseActor
     CONFIG.Actor.documentClass === SWSEV2BaseActor: true
     ```

## Common Failure Patterns

### Pattern 1: _getSheetClass Returns Undefined
```
_getSheetClass() result: undefined
```
**Diagnosis:** The class selection logic is broken or CONFIG.Actor.sheetClasses is not set up properly.

### Pattern 2: Getter Returns Null
```
Getter result: null
Getter result type: null
```
**Diagnosis:** The getter is short-circuiting or the application isn't being instantiated.

### Pattern 3: _sheet Is Being Set to Null
```
[_sheet SET] (Actor Name): Setting to null
```
**Diagnosis:** Something is explicitly clearing the sheet after it's been created.

### Pattern 4: Document Class Not Wired
```
CONFIG.Actor.documentClass === SWSEV2BaseActor: false
```
**Diagnosis:** The document class registration at the top of index.js failed or was overridden.

## Accessing Full Diagnostic Data

The diagnostic stores complete call history in `window.__SWSE_SHEET_DIAGNOSTIC__`.

To inspect all getter calls:
```javascript
window.__SWSE_SHEET_DIAGNOSTIC__.data.getterCalls
```

To inspect all _getSheetClass calls:
```javascript
window.__SWSE_SHEET_DIAGNOSTIC__.data.getSheetClassCalls
```

To inspect all _sheet property changes:
```javascript
window.__SWSE_SHEET_DIAGNOSTIC__.data.sheetSetters
```

To see any reported errors:
```javascript
window.__SWSE_SHEET_DIAGNOSTIC__.data.errors
```

## Expected Behavior (Control)

When everything is working correctly, you should see:

1. **Initialization Phase:**
   ```
   CONFIG.Actor.documentClass: SWSEV2BaseActor
   CONFIG.Actor.sheetClasses.character: {
     "foundryvtt-swse.SWSEV2CharacterSheet": { default: true, ... }
   }
   ```

2. **On Actor Click:**
   ```
   [SHEET GETTER] (Actor Name)
   _getSheetClass() result: SWSEV2CharacterSheet
   Getter result: (Application instance)
   Getter result constructor: SWSEV2CharacterSheet
   ```

3. **Sheet Renders Successfully**
   - The actor sheet opens in the UI
   - Console shows no errors

## Disabling the Diagnostic

To remove the diagnostic overhead:
1. Remove the import of `initializeSheetDiagnostics`
2. Remove the call to `initializeSheetDiagnostics()` from the init hook
3. Delete `/scripts/core/forensic-sheet-diagnostic.js`

The diagnostic has zero impact when not initialized, so leaving it in place is safe.

## Reporting Results

After running this diagnostic and collecting the output, provide:

1. The initialization logs (showing document class configuration)
2. The logs from clicking an actor (the full [SHEET GETTER] block)
3. The output of `window.__SWSE_SHEET_DIAGNOSTIC__.report()`
4. Any error messages shown in the console
5. Whether the actor sheet rendered or threw an error

This will pinpoint the exact failure location.
