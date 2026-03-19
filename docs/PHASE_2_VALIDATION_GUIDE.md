# Phase 2 Validation Guide — Complete First-Wave Chargen Flow

**Purpose:** Validate that the new ProgressionShell works correctly for the entire first-wave chargen sequence.

**Expected Time:** 15-20 minutes for full validation

---

## Pre-Validation Setup

### 1. Enable New Shell
```javascript
// In browser console:
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true)

// Verify it's enabled:
game.settings.get('foundryvtt-swse', 'useNewProgressionShell')
// Should return: true
```

### 2. Enable Console Logging
```javascript
// Keep browser DevTools console open and visible during entire chargen
// Watch for any errors, warnings, or unexpected messages
```

### 3. Clear Browser Console
- Click console's trash icon to clear previous messages
- Fresh slate for validation

### 4. Create Test Character
- Create a new character actor (or use existing test character)
- This will be your test subject for chargen

---

## Validation Sequence (Step-by-Step)

### STEP 1: LAUNCH CHARGEN

**Action:** Click "Chargen" button (sidebar, sheet header, or directory button)

**What to Verify:**
- [ ] ProgressionShell window opens (new window, not old chargen)
- [ ] Window title shows: "Character Progression: [ActorName]"
- [ ] No console errors appear
- [ ] Layout has distinct regions visible

**What to Look For:**
✓ **Correct:** 6-region layout visible (mentor rail on left, progress rail narrow strip, main content area, footer buttons)
✗ **Wrong:** Old chargen opens (stacked vertical flow, different title, old CSS classes)

**Screenshot:** Take screenshot of ProgressionShell opening

---

### STEP 2: NAME STEP

**Expected:** 3-column layout with name input form

**Action:** Look at NameStep rendering

**What to Verify:**
- [ ] Work-surface region shows 3-column layout
- [ ] Left panel: Character overview (Name, Level, Species, Class)
- [ ] Center panel: Name input field + Level slider + Random Name buttons
- [ ] Right panel: Guidance text about identity/names
- [ ] Mentor rail visible on left side
- [ ] Progress rail shows current step highlighted
- [ ] Footer buttons: Back (disabled), Next (enabled)

**Console Check:**
```javascript
// In console, you should see mentor speech like:
// "[ProgressionShell] Mentor: 'Let's start with the basics...'"
```

**Interactions:**
- [ ] Enter a character name in the name field
- [ ] Adjust level slider (should show 1-20)
- [ ] Click "Generate Random Name" button
- [ ] Verify name field updates with random name

**Screenshot:** Take screenshot of NameStep with 3-column layout visible

---

### STEP 3: SPECIES STEP

**Expected:** Species selection with proper layout

**Action:** Click Next button from NameStep

**What to Verify:**
- [ ] SpeciesStep renders in work-surface
- [ ] Character name from NameStep appears in left panel
- [ ] Species list displays
- [ ] Can select a species
- [ ] Selected species updates left panel display
- [ ] No console errors during transition

**Interactions:**
- [ ] Select a species (Human, Wookiee, Ewok, etc.)
- [ ] Verify left panel updates with your selection

**Screenshot:** Take screenshot of SpeciesStep with selection visible

---

### STEP 4: ATTRIBUTES STEP

**Expected:** Ability score table with modifiers

**Action:** Click Next button from SpeciesStep

**What to Verify:**
- [ ] AttributeStep renders ability score table
- [ ] Left panel shows: character name, species, level
- [ ] Center panel shows ability scores grid with STR/DEX/CON/INT/WIS/CHA
- [ ] Species modifiers applied correctly
- [ ] Final modifiers displayed
- [ ] Method selector visible (Roll/Standard Array/Point Buy)
- [ ] Correct colors for modifiers (green/red/yellow if implemented)

**Interactions:**
- [ ] Change ability method if available
- [ ] Verify scores update
- [ ] Check that modifiers recalculate

**Screenshot:** Take screenshot of AttributeStep with ability scores visible

---

### STEP 5: CLASS STEP

**Expected:** Class selection

**Action:** Click Next button from AttributeStep

**What to Verify:**
- [ ] ClassStep renders in work-surface
- [ ] Class list displays
- [ ] Can select a class
- [ ] Left panel updates with class selection
- [ ] No console errors

**Interactions:**
- [ ] Select a class (Scoundrel, Scout, Soldier, etc.)
- [ ] Verify left panel shows your selection

**Screenshot:** Take screenshot of ClassStep with selection visible

---

### STEP 6: SURVEY STEP (L1-Survey)

**Expected:** First-level survey/configuration

**Action:** Click Next button from ClassStep

**What to Verify:**
- [ ] L1SurveyStep renders
- [ ] Content appropriate for selected class
- [ ] Can proceed to next step
- [ ] No console errors

---

### STEP 7: BACKGROUND STEP

**Expected:** Background selection

**Action:** Click Next button from Survey step

**What to Verify:**
- [ ] BackgroundStep renders
- [ ] Background options display
- [ ] Can select a background
- [ ] No console errors

---

### STEP 8: LANGUAGES STEP

**Expected:** Language selection

**Action:** Click Next button from Background step

**What to Verify:**
- [ ] LanguageStep renders
- [ ] Language list displays
- [ ] Can select languages
- [ ] Language count respects limits
- [ ] No console errors

---

### STEP 9: FEATS STEPS (General + Class)

**Expected:** Feat selection in two steps

**Action:** Click Next button from Languages step

**What to Verify:**
- [ ] GeneralFeatStep renders
- [ ] Can select appropriate feats
- [ ] Feat count respects class limits
- [ ] Transition to ClassFeatStep works
- [ ] ClassFeatStep shows class-specific feats
- [ ] Can select class feats
- [ ] No console errors

---

### STEP 10: TALENTS STEPS (General + Class)

**Expected:** Talent selection in two steps

**Action:** Click Next button from Class Feats

**What to Verify:**
- [ ] GeneralTalentStep renders
- [ ] Talent tree or selection interface displays
- [ ] Can select talents
- [ ] Transition to ClassTalentStep works
- [ ] ClassTalentStep shows class talents
- [ ] No console errors

---

### STEP 11: SUMMARY STEP

**Expected:** Read-only review of all selections

**Action:** Click Next button from Class Talents

**What to Verify:**
- [ ] SummaryStep renders in work-surface (was fixed in Phase 1)
- [ ] Left panel shows character card with: Name, Level, Species, Class
- [ ] Center panel shows full summary:
  - [ ] Character name
  - [ ] Level
  - [ ] Species
  - [ ] Ability scores with modifiers
  - [ ] Class
  - [ ] Skills trained
  - [ ] Feats selected
  - [ ] Talents selected
- [ ] Right panel shows completion checklist
- [ ] All previous selections are visible and correct
- [ ] No editable fields (read-only summary)
- [ ] No console errors

**Critical Check:**
```javascript
// In console, check if summary shows committed selections:
// Should show all your previous choices from each step
```

**Screenshot:** Take screenshot of SummaryStep showing all committed selections

---

### STEP 12: CONFIRM STEP

**Expected:** Final confirmation before saving

**Action:** Click Next button from Summary

**What to Verify:**
- [ ] ConfirmStep renders
- [ ] Shows finalization message
- [ ] Confirm button is visible and enabled
- [ ] No console errors

---

### STEP 13: CHARACTER COMPLETE

**Expected:** Chargen closes and character is created/updated

**Action:** Click Confirm button

**What to Verify:**
- [ ] Chargen window closes
- [ ] No console errors during save
- [ ] Actor sheet opens (or updates if existing character)
- [ ] Character data is correct:
  - [ ] Name matches what you entered
  - [ ] Species is correct
  - [ ] Class is correct
  - [ ] Level is correct
  - [ ] Ability scores are correct
  - [ ] Skills, feats, talents are assigned

**Screenshot:** Take screenshot of completed actor sheet showing applied data

---

## Critical Console Checks Throughout

### Watch For These Error Patterns:

❌ **ERRORS TO NOT SEE:**
```
- "is not a registered game setting"
- "renderWorkSurface is not a function"
- "Cannot read property of undefined"
- "Failed to import"
- "TypeError in step plugin"
- "Uncaught promise rejection"
```

✓ **MESSAGES YOU SHOULD SEE:**
```
- [ProgressionShell] Mentor context for step
- [StepName] Step entered
- [StepName] Data ready
- [ProgressionShell] Finalization initiated
- Character progression complete!
```

---

## Navigation Testing

### Test Back Button
**At any step except Name:**
- [ ] Click Back button
- [ ] Verify you return to previous step
- [ ] Verify your previous selections are still there (state persistence)
- [ ] Click Next to move forward again
- [ ] Verify data is unchanged

### Test Multi-Step Navigation
**From Feats or Talents:**
- [ ] Click Back multiple times
- [ ] Return to earlier steps
- [ ] Verify all data is preserved
- [ ] Navigate forward again
- [ ] Verify smooth transitions

---

## Data Persistence Testing

**Critical Test:** State must survive navigation

### Procedure:
1. Enter name on NameStep
2. Click Next, Next, Next to get to ClassStep
3. Click Back multiple times back to NameStep
4. **Verify:** Your name is still there
5. Navigate forward again through all steps
6. **Verify:** All your previous selections are intact

**If data is lost:**
- [ ] Note which step loses data
- [ ] Check console for errors
- [ ] This is a Phase 2 bug to fix

---

## Validation Report Template

### If Everything Works:
```
✅ PHASE 2 VALIDATION PASSED

✓ NameStep renders with 3-column layout
✓ SpeciesStep displays correctly
✓ AttributeStep shows ability scores
✓ ClassStep allows selection
✓ SkillsStep renders in work-surface
✓ FeatStep selections work
✓ TalentStep selections work
✓ SummaryStep shows all committed selections
✓ ConfirmStep completes chargen
✓ Actor receives correct data
✓ Zero console errors
✓ State persistence works
✓ Navigation works (Next/Back)

Ready for Phase 3 (Levelup, NPC Chargen, Beast Chargen)
```

### If Issues Found:
```
❌ PHASE 2 VALIDATION FOUND ISSUES

Issue 1: [Step Name] - [Problem Description]
- Console error: [error message]
- Expected: [what should happen]
- Actual: [what happened]
- Proof: [screenshot/console log]

Issue 2: ...

Blocker: [Is this blocking chargen completion? Yes/No]
```

---

## Proof Requirements

**For Final Acceptance, Provide:**

1. **Screenshots:**
   - NameStep opening (proof of 3-column layout)
   - SummaryStep (proof all selections visible)
   - Final actor sheet (proof data applied)

2. **Console Log:**
   - Screenshot showing NO errors
   - Show SUCCESS messages

3. **Navigation Proof:**
   - Back button works (screenshot)
   - State persists (screenshot showing data unchanged)

4. **Validation Report:**
   - All 13 steps tested
   - Results documented
   - Issues (if any) identified

---

## Next Steps After Validation

### If Phase 2 Passes:
→ Proceed to Phase 3 (Levelup Shell, NPC Chargen, Beast Chargen)

### If Phase 2 Has Issues:
→ Fix identified issues
→ Re-validate affected steps
→ Continue to Phase 3 once all first-wave steps work

---

**Begin validation now. Document as you go. This is the proof that the new mall works from front door to checkout.**
