# Chargen Shell Fix - Implementation Order

## Phase 1: Hypothesis Test (5 minutes)

### Step 1.1: Enable Feature Flag as Probe
```javascript
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true)
```

### Step 1.2: Reopen Chargen and Observe
Click the "Chargen" button to open a new instance. Watch for:

**Question 1: Does outer structure change?**
- ❌ OLD: Single vertical column, generic Foundry chrome
- ✅ NEW: Header + footer, utility bar, multi-region composition

**Question 2: Do you see header/footer/utility bar?**
- ❌ OLD: No visible regions, just one big content area
- ✅ NEW: Distinct regions for mentor-rail, progress-rail, work-surface, action-footer

**Question 3: Does title still say "NPC Level Up"?**
- ❌ FIXED: Title now says "Character Progression: [Actor Name]"
- ⚠️  STILL WRONG: Title unchanged, suggests metadata override persists

**Question 4: Do steps still progress name → abilities?**
- ✅ WORKING: Steps progress normally
- ❌ BROKEN: Steps stuck or erroring

### Step 1.3: Record Observations
Document your answers. This determines everything that follows.

---

## Phase 2: Interpretation

### Scenario A: New Shell Renders + Metadata Fixed
```
Observations:
  Structure: NEW (header/footer/utility visible)
  Title: "Character Progression: [name]"
  Steps: Progressing normally

Diagnosis: ✅ HYPOTHESIS CONFIRMED
  Feature flag correctly routes to new shell
  New shell is functional
  Problem was shell selection, not corruption

Action: Proceed to Phase 3A (Make Permanent)
```

### Scenario B: New Shell Renders + Metadata Still Wrong
```
Observations:
  Structure: NEW (header/footer/utility visible)
  Title: Still "NPC Level Up" OR "Character Generator"
  Steps: Progressing normally

Diagnosis: ⚠️  PARTIAL HYPOTHESIS
  Shell selection works, but metadata override persists
  Metadata contamination is deeper than expected

Action: Proceed to Phase 3B (Fix Metadata + Shell)
```

### Scenario C: Structure Doesn't Change
```
Observations:
  Structure: Still OLD (single column)
  Title: Still "NPC Level Up"
  Steps: Still progressing OR broken

Diagnosis: ❌ HYPOTHESIS REJECTED
  Feature flag did not switch shells
  Either: flag not connected to this route
         OR wrong class still instantiated
         OR legacy path bypasses new shell router

Action: Proceed to Phase 3C (Deep Investigation)
```

### Scenario D: Steps Break
```
Observations:
  Structure: Any
  Steps: Broken, erroring, or frozen

Diagnosis: ❌ NEW SHELL NOT READY
  New shell has critical bugs
  Should not use yet

Action: Proceed to Phase 3D (Rollback)
```

---

## Phase 3A: Make Permanent (Shell Works + Metadata Fixed)

**Prerequisites**: New shell rendered correctly, title and structure both correct

### Step 3A.1: Update Entry Point
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js`

**Location**: Lines 67-68 (inside `if (incompleteReason)` block)

**Before**:
```javascript
const { default: CharacterGenerator } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
new CharacterGenerator(actor).render(true);
```

**After**:
```javascript
const { ChargenShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js');
ChargenShell.open(actor);
```

### Step 3A.2: Update Header Button Hook
**File**: `/scripts/infrastructure/hooks/chargen-sheet-hooks.js`

**Location**: Line 25 (inside `onClickChargen` function)

**Before**:
```javascript
const chargen = new CharacterGenerator(actor);
chargen.render(true);
```

**After**:
```javascript
const { ChargenShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js');
ChargenShell.open(actor);
```

**Note**: Make `onClickChargen` async if it isn't already

### Step 3A.3: Update Sheet Button Handler
**File**: `/scripts/sheets/v2/character-sheet.js`

**Location**: Search for `[data-action="cmd-chargen"]`

**Before**:
```javascript
html.querySelectorAll('[data-action="cmd-chargen"]').forEach(button => {
  button.addEventListener("click", async ev => {
    ev.preventDefault();
    const chargen = new CharacterGenerator(this.actor);
    chargen.render(true);
  }, { signal });
});
```

**After**:
```javascript
html.querySelectorAll('[data-action="cmd-chargen"]').forEach(button => {
  button.addEventListener("click", async ev => {
    ev.preventDefault();
    const { ChargenShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js');
    ChargenShell.open(this.actor);
  }, { signal });
});
```

### Step 3A.4: Clean Up Legacy Imports
**File**: `/scripts/infrastructure/hooks/chargen-sheet-hooks.js`

**Location**: Top of file

**Before**:
```javascript
import CharacterGenerator from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";
```

**After**:
```javascript
// Chargen now routes to ChargenShell via dynamic import
// (see onClickChargen function)
```

### Step 3A.5: Verify Feature Flag Setting
The feature flag should be enabled. Either:

**Option 1**: Set in system settings UI (persistent)
- Game Settings → System Settings → SWSE → Progression Shell
- Enable "Use New Progression Shell"

**Option 2**: Verify code has default enabled
- Edit `/scripts/core/init.js` (lines 26-34)
- Change `default: false` to `default: true`

### Step 3A.6: Test All Entry Points
1. Click "Chargen" header button on character sheet
2. Click "Chargen" in character sheet content buttons
3. Open incomplete character from level-up route
4. Verify all three paths use new shell

### Step 3A.7: Clean Up Old Code (Optional but Recommended)
Consider whether to keep `CharacterGenerator` around:
- If used elsewhere: leave it
- If only legacy: consider deprecation notice or removal

---

## Phase 3B: Fix Metadata + Shell (New Shell Works But Metadata Wrong)

**Prerequisites**: New shell renders correctly but title/id still contaminated

### Step 3B.1: Identify Metadata Override Source
Add logging to ChargenShell to find where metadata is being overridden:

**File**: `/scripts/apps/progression-framework/shell/progression-shell.js`

**Location**: Constructor (line 126-130)

**After line 130, add**:
```javascript
// DIAGNOSTIC: Log metadata assignment
SWSELogger.log('[ProgressionShell] Constructor - metadata:', {
  title: this.title,
  id: this.id,
  titleFromOptions: options.title
});
```

Then in `_onRender`, add:
```javascript
async _onRender(context, options) {
  SWSELogger.log('[ProgressionShell._onRender] Metadata at render:', {
    title: this.title,
    id: this.id,
    constructor: this.constructor.name
  });
  // ... rest of method
}
```

### Step 3B.2: Check for Metadata Override in Inheritance
The problem might be in how ApplicationV2 assigns ID. Test:

```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.constructor.name === 'ChargenShell');

if (app) {
  console.log({
    'app.id': app.id,
    'app.title': app.title,
    'app.DEFAULT_OPTIONS.id': app.constructor.DEFAULT_OPTIONS?.id,
    'app.DEFAULT_OPTIONS.title': app.constructor.DEFAULT_OPTIONS?.title,
    'super.DEFAULT_OPTIONS.id': SWSEApplicationV2.DEFAULT_OPTIONS?.id,
  });
}
```

### Step 3B.3: Fix by Adding Explicit Metadata
**File**: `/scripts/apps/progression-framework/shell/progression-shell.js`

**Location**: Lines 52-85 (DEFAULT_OPTIONS)

**Before**:
```javascript
static DEFAULT_OPTIONS = {
  ...SWSEApplicationV2.DEFAULT_OPTIONS,
  classes: ['swse', 'swse-window', 'progression-shell'],
  // ... rest
};
```

**After**:
```javascript
static DEFAULT_OPTIONS = {
  ...SWSEApplicationV2.DEFAULT_OPTIONS,
  id: 'progression-shell',  // ← ADD THIS
  classes: ['swse', 'swse-window', 'progression-shell'],
  // ... rest
};
```

And in constructor (line 127-130):

**Before**:
```javascript
super({
  title: `Character Progression: ${actor?.name ?? 'Unknown'}`,
  ...options,
});
```

**After**:
```javascript
super({
  id: 'progression-chargen',  // ← ADD THIS for clarity
  title: `Character Progression: ${actor?.name ?? 'Unknown'}`,
  ...options,
});
```

### Step 3B.4: Test Metadata
Reopen chargen and verify:
```javascript
const app = [...foundry.applications.instances.values()][0];
console.log({
  id: app.id,
  title: app.title,
  isCorrect: app.title.includes('Character Progression')
});
```

---

## Phase 3C: Deep Investigation (Shell Didn't Switch)

**Prerequisites**: Feature flag didn't change structure, steps may or may not work

### Step 3C.1: Verify Feature Flag Was Actually Set
```javascript
const flagValue = game.settings.get('foundryvtt-swse', 'useNewProgressionShell');
console.log('Feature flag current value:', flagValue);
```

If it shows `false`, the setting didn't persist. Might need to set it differently.

### Step 3C.2: Check If Flag Is Checked in Entry Points
Search entry points for where the flag is checked:

**File**: `/scripts/apps/chargen/chargen-main.js` (line 85)
```javascript
if (game.settings?.get?.('foundryvtt-swse', 'useNewProgressionShell')) {
  // Routes to ChargenShell
}
```

**Question**: Is this flag check still active?
- If yes, flag should work
- If no, flag check was removed

### Step 3C.3: Check Which Class Is Actually Instantiated
While chargen is open:
```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));
console.log('App class:', app?.constructor.name);
```

**Expected with flag**:
- Should say `ChargenShell`

**If it says CharacterGenerator**:
- Flag check not working
- Flag value not read correctly
- New path not available

### Step 3C.4: If CharacterGenerator Is Still Instantiated
The flag check in chargen-main.js might not be triggering. Options:

**Option A**: Force the new shell path directly (skip old chargen entirely)
- Edit entry points to always use ChargenShell
- Remove flag check, or invert logic
- Test new shell stability first

**Option B**: Debug why flag check is failing
- Check if setting name is correct
- Verify setting is registered in init.js
- Check if setting is being read at render time (might be cached)

### Step 3C.5: If New Shell Class Never Loads
The new shell might not exist or have syntax errors:

```javascript
try {
  const { ChargenShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js');
  console.log('ChargenShell loaded:', ChargenShell);
} catch (err) {
  console.error('Failed to load ChargenShell:', err);
}
```

If this errors, new shell has import/syntax issues.

---

## Phase 3D: Rollback (New Shell Broken)

**Prerequisites**: Feature flag enabled, but steps broke or new shell has critical bugs

### Step 3D.1: Disable Feature Flag
```javascript
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', false)
```

### Step 3D.2: Reopen Chargen
Verify old shell and steps work again.

### Step 3D.3: Report Issues
Document what broke:
- Which step broke
- What error message
- Does it break on load or on transition
- Can you continue if you skip the step

### Step 3D.4: Fix or Skip New Shell
Either:
- Fix the new shell bugs
- Keep using old shell as primary path
- Use old shell with metadata fix (Phase 3A.x but just metadata)

---

## Success Criteria

### After All Fixes
- ✅ Chargen uses correct shell (new or old, consistently)
- ✅ app.id shows correct value ('chargen' or 'progression-chargen')
- ✅ app.title shows correct value ('Character Generator' or 'Character Progression: [name]')
- ✅ Steps progress normally
- ✅ All entry points (sheet button, header button, level-up route) use same shell
- ✅ No legacy wrapper metadata bleeds through
- ✅ New shell CSS applies (if using new shell)

---

## Key Decision Points

1. **Does feature flag work?**
   - YES → Use Phase 3A (make permanent)
   - NO → Use Phase 3C (investigate deeper)

2. **If new shell works, do you keep new shell permanently?**
   - YES → Complete Phase 3A
   - NO → Keep old shell but fix metadata (simpler fix)

3. **If new shell breaks, do you fix it?**
   - YES → Fix bugs, then use Phase 3A
   - NO → Use Phase 3D (rollback to old shell)

---

## Rollback Plan (If Needed)

If any phase fails:
1. Revert changes to entry point files
2. Disable feature flag: `game.settings.set('foundryvtt-swse', 'useNewProgressionShell', false)`
3. Reload Foundry
4. Verify old chargen still works
5. Apply simpler fix (just metadata) if needed

---

## Files Modified Summary

| File | Change | Phase |
|------|--------|-------|
| `levelup-sheet-hooks.js` | Route to ChargenShell | 3A.1 |
| `chargen-sheet-hooks.js` | Route to ChargenShell | 3A.2 |
| `character-sheet.js` | Route to ChargenShell | 3A.3 |
| `progression-shell.js` | Add explicit metadata | 3B.3 |
| `core/init.js` | Ensure flag default | 3A.5 |

---

## Estimated Timeline

- Phase 1 (Test): 5 minutes
- Phase 2 (Interpret): 2 minutes
- Phase 3A (Permanent): 15 minutes (if scenario A)
- Phase 3B (Metadata): 10 minutes (if scenario B)
- Phase 3C (Deep Debug): 20 minutes (if scenario C)
- Phase 3D (Rollback): 5 minutes (if scenario D)

**Total**: 5-45 minutes depending on scenario

