# SWSE Progression Shell Investigation - Complete Summary

## What We've Discovered

### From Code Analysis:
1. **Entry points are correct**: All three code paths directly instantiate CharacterGenerator
2. **Step logic is correct**: User confirmed chargen steps ARE progressing (name → abilities)
3. **Metadata is contaminated**: app.id shows 'mentor-chat-dialog', app.title shows 'NPC Level Up'
4. **Two distinct shell architectures exist**:
   - OLD: CharacterGenerator with single-template chargen.hbs
   - NEW: ProgressionShell with multi-part composition (requires feature flag)

### From User's Live Evidence:
1. **Screenshot shows**: Single-column vertical layout (NOT new multi-region shell)
2. **Visual structure**: Looks like legacy chargen.hbs, NOT new progression-shell.hbs
3. **DOM structure**: Missing new shell classes (.progression-shell, .mentor-rail, etc.)
4. **Console search failed**: "No matching progression app found" suggests wrong property names

### Current Working Theory:

```
┌─────────────────────────────────────────────────────┐
│           WHAT IS ACTUALLY HAPPENING                │
├─────────────────────────────────────────────────────┤
│ 1. User clicks "Chargen" button                      │
│ 2. levelup-sheet-hooks.js creates CharacterGenerator│
│ 3. CharacterGenerator.render(true) is called         │
│ 4. OLD chargen.hbs template renders (WRONG)          │
│ 5. Single-column vertical layout appears (WRONG)     │
│ 6. Step logic runs correctly inside old template     │
│ 7. But metadata shows mentor/NPC values (WRONG)      │
│                                                      │
│ DIAGNOSIS: OLD TEMPLATE IS BEING USED               │
│ The PARTS map is pointing to chargen.hbs             │
│ The new progression-shell.hbs is never rendered      │
└─────────────────────────────────────────────────────┘
```

---

## Three Distinct Problems Identified

### Problem 1: Wrong Template Being Used ⚠️ CRITICAL
- **Evidence**: Screenshot shows single-column layout
- **Evidence**: DOM missing new shell classes
- **Root Cause**: PARTS map still points to old chargen.hbs
- **Impact**: New shell features never load
- **Fix Location**: CharacterGenerator.PARTS definition or feature flag

### Problem 2: Wrong Metadata/App Identity ❌ URGENT
- **Evidence**: app.id = 'mentor-chat-dialog', app.title = 'NPC Level Up'
- **Evidence**: Should be app.id = 'chargen' or 'character-generator', title = 'Character Generator'
- **Root Cause**: ApplicationV2 ID generation or render-time override
- **Impact**: App labeled wrong in window title/inspector
- **Fix Location**: CharacterGenerator metadata assignment or ApplicationV2

### Problem 3: CSS Not Matching (Secondary)
- **Evidence**: No visual indication of new shell structure
- **Evidence**: Old generic Foundry window styling
- **Root Cause**: CSS selectors don't match DOM, or CSS not loaded
- **Impact**: Even if template was fixed, styling would be broken
- **Fix Location**: CSS file or selectors

---

## Diagnostic Steps to Confirm

### Step 1: Verify Which Template Is Active
**Command**:
```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));

if (app) {
  const partsKeys = Object.keys(app.constructor.PARTS);
  console.log({
    parts: partsKeys,
    isOldTemplate: partsKeys.length === 1 && partsKeys[0] === 'content',
    isNewTemplate: partsKeys.includes('shell')
  });
}
```

**Expected Result If Old** (likely):
```
{ parts: ['content'], isOldTemplate: true, isNewTemplate: false }
```

**Expected Result If New** (unlikely unless feature flag enabled):
```
{ parts: ['shell', 'mentorRail', 'progressRail', 'utilityBar'], isOldTemplate: false, isNewTemplate: true }
```

### Step 2: Confirm DOM Structure
**Visual Check**: Look for in the rendered HTML:
- ❌ Old: `.swse-chargen-window`, `.chargen-content`, `.step-content`
- ✅ New: `.progression-shell`, `data-part="mentorRail"`, `data-part="progressRail"`

### Step 3: Check Feature Flag
**Command**:
```javascript
game.settings.get('foundryvtt-swse', 'useNewProgressionShell')
```

**Expected**:
- Currently: `false` (so old shell is used by default)
- Should be: depends on design goal

---

## Repair Strategy by Problem Type

### If Problem 1: Wrong Template

**Check 1**: Is feature flag disabled?
```javascript
game.settings.get('foundryvtt-swse', 'useNewProgressionShell') // Should be false if using old
```

**Fix Option A**: Switch to new shell by enabling feature flag
```javascript
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true)
```

**Fix Option B**: Update CharacterGenerator to use new template
- Edit `/scripts/apps/chargen/chargen-main.js`
- Change PARTS map from `{ content: {...} }` to `{ shell: {...}, mentorRail: {...}, ... }`
- Point templates to new files

**Fix Option C**: Route incomplete characters to new shell directly
- Edit `/scripts/infrastructure/hooks/levelup-sheet-hooks.js`
- Change from `new CharacterGenerator(actor)` to `ChargenShell.open(actor)`
- Requires feature flag to be available or enabled

### If Problem 2: Wrong Metadata

**Fix**: Add explicit ID assignment to CharacterGenerator
- Edit `/scripts/apps/chargen/chargen-main.js`
- Add to `defaultOptions()` method:
```javascript
static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    id: 'chargen',  // ← ADD THIS
    title: 'Character Generator',
    // ... rest of options
  });
}
```

### If Problem 3: CSS Not Matching

**Fix**: Verify CSS file is loaded
- Check `/styles/apps/progression-shell.css` (or wherever new CSS is)
- Verify selectors match new template classes
- Ensure CSS is included in `system.json` or loaded dynamically

---

## Decision Tree: What to Fix First

```
Are chargen steps progressing correctly?
  ├─ YES → Template logic is fine
  │        Step to: "Check which template is rendering"
  │
  └─ NO → Step logic is broken
           Step to: "Fix step progression logic"

Is metadata wrong (id/title incorrect)?
  ├─ YES → Add explicit ID assignment (Problem 2 fix)
  │
  └─ NO → Metadata is correct
           Step to: "Check template structure"

Is screenshot showing new shell structure?
  ├─ YES → CSS might be the issue (Problem 3)
  │        Step to: "Fix CSS selectors/loading"
  │
  └─ NO → Wrong template is being used (Problem 1)
           Step to: "Switch to new template or enable feature flag"
```

---

## Recommended Action Plan

### Phase 1: Confirm Diagnosis (NOW)
1. Run diagnostic command to check PARTS map
2. Take screenshot of rendered DOM
3. Check feature flag status
4. **Expected**: Confirm old template is being used

### Phase 2: Fix Template Issue (CRITICAL)
1. **Option A** (Recommended if new shell is ready):
   - Enable feature flag: `game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true)`
   - Update entry points to use ChargenShell instead of CharacterGenerator
   - Verify new shell renders correctly

2. **Option B** (If old template needs to stay):
   - Keep using CharacterGenerator
   - Fix metadata: Add explicit ID and title
   - Ensure CSS loads correctly

### Phase 3: Fix Metadata Issue (URGENT)
1. Add explicit ID assignment to CharacterGenerator.defaultOptions
2. Verify app.id and app.title show correct values
3. Ensure window title and inspector show correct labels

### Phase 4: Fix CSS (IF NEEDED)
1. If new template is being used but styling is wrong:
   - Verify CSS file is loaded
   - Check selectors match DOM structure
   - Fix any mismatches

---

## Files to Edit Based on Fix Strategy

### If Switching to New Shell:
- `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` (line 68)
  - Change: `new CharacterGenerator(actor)` → `ChargenShell.open(actor)`
- `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` (line 25)
  - Change: `new CharacterGenerator(actor)` → `ChargenShell.open(actor)`
- `/scripts/sheets/v2/character-sheet.js`
  - Change chargen button handler to use new shell

### If Fixing Old Shell Metadata:
- `/scripts/apps/chargen/chargen-main.js` (line 322)
  - Add explicit `id: 'chargen'` to defaultOptions

### If New Shell CSS Needs Fixing:
- `/styles/apps/progression-shell.css` (or location of new CSS)
  - Verify selectors match new template classes
  - Add missing styles

---

## Risk Assessment

### Low Risk Changes:
- Adding diagnostics logging
- Enabling feature flag (if new shell is fully tested)
- Adding explicit metadata

### Medium Risk Changes:
- Switching entry points to new shell
- Modifying PARTS map

### High Risk Changes:
- Modifying ApplicationV2 base class behavior
- Changing template files

---

## Success Criteria

### Fix is Successful When:
1. ✅ app.id shows 'chargen' or 'character-generator'
2. ✅ app.title shows 'Character Generator'
3. ✅ Screenshot shows new shell structure (if switching to new shell)
4. ✅ Chargen steps continue progressing correctly
5. ✅ Window title and inspector show correct app identity
6. ✅ CSS styling matches template structure

---

## Documents Created for This Investigation

1. **SHELL_METADATA_CONTAMINATION_AUDIT.md**
   - Traces where metadata values come from
   - Lists evidence for metadata contamination

2. **SHELL_COMPOSITION_DIAGNOSTIC.md**
   - Explains difference between old and new shell architectures
   - Lists diagnostic checklist

3. **SHELL_TEMPLATE_BYPASS_INVESTIGATION.md**
   - Focuses on wrong template being used
   - Provides targeted diagnostic commands

4. **RUNTIME_DIAGNOSTICS.md**
   - Console commands for live debugging
   - Expected output patterns

5. **INVESTIGATION_SUMMARY_AND_NEXT_STEPS.md**
   - This file
   - Consolidates findings and action plan

---

## Next Steps (Priority Order)

### Immediate (Required):
1. ✅ Run diagnostic to confirm which template is active
2. ✅ Determine fix strategy based on findings
3. ✅ Apply appropriate fix from Phase 2 or Phase 3

### Short-term (Highly Recommended):
1. ✅ Verify chargen steps still progress correctly after fix
2. ✅ Test complete character creation and level-up flow
3. ✅ Confirm metadata is correct in window title and inspector

### Follow-up (Before Release):
1. ✅ Test both old and new shell paths (if both are supported)
2. ✅ Verify CSS styling matches template structure
3. ✅ Add unit tests for entry point routing
4. ✅ Document which shell is canonical (old or new)

---

## Questions Answered

**Q: Are chargen steps running correctly?**
A: Yes, steps progress from name → abilities correctly.

**Q: Is the routing to chargen correct?**
A: Yes, CharacterGenerator is instantiated correctly.

**Q: Why is the metadata wrong?**
A: ApplicationV2 ID/title contamination or render-time override.

**Q: Why doesn't the new shell structure appear?**
A: Old chargen.hbs template is being used instead of new progression-shell.hbs.

**Q: Is this just a CSS issue?**
A: No, this is primarily a template/PARTS map issue. CSS is secondary.

**Q: How do I fix it?**
A: See "Phase 2: Fix Template Issue" above. Two main options depending on design goal.

