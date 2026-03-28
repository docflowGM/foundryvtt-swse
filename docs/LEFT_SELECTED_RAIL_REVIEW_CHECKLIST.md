# Left Selected Rail Review Checklist — Post-Repair Verification

**Date:** 2026-03-28
**Status:** Repairs applied, ready for QA testing
**Tester:** [To be filled by QA team]

---

## Pre-Testing Verification (Code Review)

### Code Changes Audit

- [x] **projection-engine.js modified correctly**
  - [x] buildProjection marked async
  - [x] Attributes normalized to { score, modifier } format
  - [x] Credits computation added to _projectDerived
  - [x] _projectBeast stub added
  - [x] _projectNonheroic stub added
  - [x] Adapter await properly integrated
  - [x] No unrelated changes introduced

- [x] **selected-rail-context.js modified correctly**
  - [x] buildSnapshot marked async
  - [x] Languages mapping fixed to extract names from objects
  - [x] JSDoc updated to reflect async nature
  - [x] No unrelated changes introduced

- [x] **progression-shell.js modified correctly**
  - [x] buildSnapshot call properly awaited
  - [x] Only one line changed (the await)
  - [x] _prepareContext already async (no changes needed to function signature)
  - [x] No other changes introduced

### Architecture Integrity

- [x] No refactoring of unrelated systems
- [x] Scope lock respected (only selected rail and projection integration)
- [x] Backward compatibility maintained
- [x] No breaking changes to external APIs
- [x] Async flow properly chained through stack

---

## Heroic Chargen Path Testing

### Test 1: Species Selection

**Setup:**
1. Open progression shell with chargen-actor mode
2. Navigate to Species step

**Expected Results:**
- [ ] Left selected rail appears with Identity section
- [ ] "Species: [selected species]" visible with current-step highlight
- [ ] Portrait and name render correctly
- [ ] No console errors

**Verification:**
- [ ] Selected rail updates correctly on species change
- [ ] Multiple species selections update rail immediately after commit
- [ ] Highlight indicates current step

**Notes:** ____________

---

### Test 2: Class Selection

**Setup:**
1. Complete Species step
2. Navigate to Class step

**Expected Results:**
- [ ] Left rail Identity section now shows:
  - [ ] Species: [from previous step]
  - [ ] Class: [selected class] (highlighted as current)
- [ ] Skills section appears below Identity
- [ ] Feats section appears with counts (General x | Class y)
- [ ] No "[object Object]" errors
- [ ] No console errors

**Verification:**
- [ ] Class changes update rail immediately after commit
- [ ] Previous species selection persists
- [ ] Current-step highlight correct

**Notes:** ____________

---

### Test 3: Attributes (Critical Test)

**Setup:**
1. Complete Species and Class steps
2. Navigate to Attributes step
3. Select attribute values (point buy or rolls)

**Expected Results:**
- [ ] Attributes section appears in 2-column grid layout
- [ ] Each attribute shows:
  - [ ] Label (STR, DEX, CON, INT, WIS, CHA)
  - [ ] Score (14, 12, 13, 10, 15, 11, etc.)
  - [ ] Modifier in parentheses (+2, +1, +1, +0, +2, +0, etc.)
- [ ] Positive modifiers show in green
- [ ] Negative modifiers show in red
- [ ] Zero modifiers show in gray
- [ ] NO "[object Object]" errors
- [ ] Current-step highlight on Attributes section
- [ ] No console errors

**Verification:**
- [ ] All 6 attributes rendered
- [ ] Modifiers computed correctly: (score - 10) / 2
  - 14 → +2 ✓
  - 12 → +1 ✓
  - 10 → +0 ✓
  - 8 → -1 ✓
  - 6 → -2 ✓
- [ ] Attribute changes update immediately after commit

**Critical for Repair:** This test validates Repair #3 (attributes structure with modifiers)

**Notes:** ____________

---

### Test 4: Skills Selection

**Setup:**
1. Complete Species, Class, Attributes steps
2. Navigate to Skills step

**Expected Results:**
- [ ] Skills section shows with format "Skills (n)" where n = count
- [ ] Each trained skill listed with name visible
- [ ] Current-step highlight on Skills section
- [ ] No console errors
- [ ] Skills persist across other selections

**Verification:**
- [ ] Skill count increments as skills selected
- [ ] Multiple skills render without duplication
- [ ] Skill names readable (not "[object Object]")

**Notes:** ____________

---

### Test 5: Languages (Critical Test)

**Setup:**
1. Complete through Skills step
2. Navigate to Languages step

**Expected Results:**
- [ ] Languages section shows with format "Languages (n)"
- [ ] Each language shown as readable name:
  - [ ] "Basic"
  - [ ] "Durese" (if selected)
  - [ ] Other language names as appropriate
- [ ] NO "[object Object]" entries
- [ ] NO raw JSON or object stringification
- [ ] Current-step highlight on Languages section
- [ ] No console errors

**Verification:**
- [ ] All languages render with proper names
- [ ] Languages persist from species/background selections
- [ ] Language count accurate

**Critical for Repair:** This test validates Repair #5 (languages object-to-name mapping)

**Notes:** ____________

---

### Test 6: Feats & Talents

**Setup:**
1. Navigate to Feats step (after all prior steps)

**Expected Results:**
- [ ] Feats section shows "Feats (n)" with breakdown:
  - [ ] "General: m"
  - [ ] "Class: k"
- [ ] Talents section shows "Talents (n)" with count
- [ ] Current-step highlight on Feats section
- [ ] No console errors

**Verification:**
- [ ] Feat counts update as feats selected
- [ ] Category breakdown (general/class) accurate
- [ ] Talent count accurate

**Notes:** ____________

---

### Test 7: Credits (Critical Test)

**Setup:**
1. Complete through Feats/Talents steps
2. Navigate to Equipment/Credits step (if applicable)

**Expected Results:**
- [ ] Credits section appears (if class provides credits)
- [ ] Shows "Credits: Available [amount] cr"
- [ ] Amount is numeric and reasonable (typically 1000-3000)
- [ ] NOT showing credits as 0 or missing
- [ ] Current-step highlight correct
- [ ] No console errors

**Verification:**
- [ ] Credit calculation sensible (class + background)
- [ ] Credits persist across subsequent steps
- [ ] Credits section only appears in chargen paths

**Critical for Repair:** This test validates Repair #4 (credits computation in derived projection)

**Notes:** ____________

---

### Test 8: Attributes Refresh After Previous Step Change

**Setup:**
1. Complete Attributes and Class steps
2. Go back to Class step
3. Change class selection
4. Re-complete Class step
5. Navigate back to Attributes step

**Expected Results:**
- [ ] Attributes section still shows all 6 attributes with correct structure
- [ ] Modifiers still computed correctly
- [ ] Previous attribute selections persist
- [ ] Rail updates cleanly without stale data
- [ ] No duplicate sections

**Verification:**
- [ ] Backward navigation works smoothly
- [ ] Rail updates correctly on upstream changes
- [ ] No orphaned or stale data displayed

**Notes:** ____________

---

## Level-Up Path Testing

### Test 9: Level-Up No Attributes/Credits

**Setup:**
1. Open progression shell with levelup-actor mode
2. Navigate through level-up steps

**Expected Results:**
- [ ] Attributes section NOT shown (correctly filtered for levelup)
- [ ] Credits section NOT shown (correctly filtered for levelup)
- [ ] Skills, Feats, Talents, Languages sections shown
- [ ] Identity persists from previous chargen
- [ ] No console errors

**Verification:**
- [ ] Path-aware composition correct (levelup ≠ chargen)
- [ ] Sections appear/disappear correctly per path type

**Notes:** ____________

---

## Subtype Path Testing (Beast/Nonheroic)

### Test 10: Beast Chargen (if available)

**Setup:**
1. Open progression shell in chargen-beast mode (if available)
2. Navigate through beast steps

**Expected Results:**
- [ ] Beast Profile section appears
- [ ] Shows "Beast Profile" header
- [ ] Shows "Type: [beast type]" (e.g., "Nexu", "Rancor", "Wolf")
- [ ] Beast Profile highlighted when relevant step active
- [ ] Standard sections (identity, skills, feats, etc.) still appear
- [ ] Attributes shows (chargen path)
- [ ] No console errors

**Verification:**
- [ ] Beast type correctly sourced from projection
- [ ] Beast section properly composed
- [ ] Adapter contributions (if any) included

**Critical for Repairs:** This test validates Repairs #1, #2, #6, #7 (async chain + beast projection)

**Notes:** ____________

---

### Test 11: Nonheroic Chargen (if available)

**Setup:**
1. Open progression shell with nonheroic class
2. Navigate through nonheroic chargen steps

**Expected Results:**
- [ ] Profession section appears
- [ ] Shows "Profession" header
- [ ] Shows "Profession: [profession name]" (e.g., "Moisture Farmer")
- [ ] Standard sections appear (identity, skills, feats, etc.)
- [ ] Attributes section NOT shown (nonheroic handling)
- [ ] Credits section behavior appropriate
- [ ] No console errors

**Verification:**
- [ ] Profession correctly sourced from projection
- [ ] Profession section properly composed
- [ ] Path-aware composition handles nonheroic correctly

**Critical for Repairs:** This test validates Repairs #1, #2, #6, #7 (async chain + nonheroic projection)

**Notes:** ____________

---

## Refresh & Interactivity Testing

### Test 12: Selection Commit Triggers Refresh

**Setup:**
1. Navigate to Skills step
2. Select a skill
3. Commit the selection

**Expected Results:**
- [ ] Left rail updates immediately (within 1 frame)
- [ ] Skill count updates in header
- [ ] New skill name appears in list
- [ ] No flicker or delay
- [ ] No stale data visible

**Verification:**
- [ ] Refresh happens on commit, not on next full render
- [ ] Projection rebuilt before rendering
- [ ] Timeline: commit → _rebuildProjection → render → rail updates

**Notes:** ____________

---

### Test 13: Multiple Commits Don't Accumulate Stale State

**Setup:**
1. Navigate to a section where multiple selections possible
2. Commit 5 different selections one after another

**Expected Results:**
- [ ] Rail shows current state after each commit
- [ ] NO duplicate entries
- [ ] NO stale entries from previous commits
- [ ] NO orphaned data
- [ ] Clean state transitions

**Verification:**
- [ ] State is fresh after each commit
- [ ] Projection correctly reflects all committed selections
- [ ] No memory leaks or stale caches

**Notes:** ____________

---

## Error Handling & Edge Cases

### Test 14: Missing Adapter Graceful Degradation

**Setup:**
1. Run beast/droid/nonheroic path if adapter not fully implemented

**Expected Results:**
- [ ] Rail still renders without console errors
- [ ] Fallback sections appear (from stub projections)
- [ ] No hard crashes
- [ ] Graceful degradation if adapter missing

**Verification:**
- [ ] Error handling works for missing adapter
- [ ] Projection stubs return null safely
- [ ] Sections filter out null values

**Notes:** ____________

---

### Test 15: Empty/Null Values Handled

**Setup:**
1. Scenario: Actor with no portrait
2. Scenario: Class with no skills bonus
3. Scenario: Empty languages selection

**Expected Results:**
- [ ] Portrait shows placeholder icon (not broken image)
- [ ] Missing data doesn't crash rail
- [ ] Sections correctly filter out empty arrays
- [ ] No error messages in console

**Verification:**
- [ ] Fallbacks work correctly
- [ ] Empty state only shown when appropriate
- [ ] No "[object Object]" or undefined values visible

**Notes:** ____________

---

## Console Inspection

### Test 16: No Console Errors or Warnings

**Setup:**
1. Run through chargen path with browser console open
2. Repeat for levelup path
3. Repeat for subtype path (if available)

**Expected Results:**
- [ ] No error messages in console
- [ ] No "undefined" or "null" reference errors
- [ ] No template rendering errors
- [ ] Async warnings only if unrelated to selected rail
- [ ] Debug logs from swseLogger are expected (informational)

**Verification:**
- [ ] All errors addressed
- [ ] No warnings from selected rail code
- [ ] Async chain working (no "await of non-promise")

**Notes:** ____________

---

### Test 17: Projection Rebuild Logging

**Setup:**
1. Enable debug logging for ProjectionEngine and SelectedRailContext
2. Commit selections and observe console

**Expected Results:**
- [ ] Log shows "Projection built" on each commit
- [ ] Timestamps update on each rebuild
- [ ] No "Error building projection" messages
- [ ] Adapter contribution status logged (if applicable)

**Verification:**
- [ ] Rebuild happens on expected events
- [ ] Projection data logged correctly
- [ ] No silent failures

**Notes:** ____________

---

## Data Flow Verification

### Test 18: Attributes: Projection to Template

**Setup:**
1. Select attributes (STR 14, DEX 12, CON 13, INT 10, WIS 15, CHA 11)
2. Navigate to summary or next view that can be inspected

**Expected Data Flow:**
```
draftSelections.attributes.values { str: 14, dex: 12, ... }
  ↓
ProjectionEngine._projectAttributes
  ↓
projection.attributes { str: { score: 14, modifier: 2 }, dex: { score: 12, modifier: 1 }, ... }
  ↓
SelectedRailContext._buildAttributesSection
  ↓
snapshotSections[].items [{ label: 'STR', value: 14, modifier: 2 }, ...]
  ↓
selected-rail.hbs compact grid render
  ↓
"STR 14 +2" visible in UI
```

**Verification:**
- [ ] Each step in chain has correct data structure
- [ ] No loss of information
- [ ] Modifiers computed correctly at projection step
- [ ] Template renders complete data

**Notes:** ____________

---

### Test 19: Languages: Projection to Template

**Setup:**
1. Complete species/background that grant languages

**Expected Data Flow:**
```
draftSelections.languages [{ id: 'basic', name: 'Basic' }, { id: 'durese', name: 'Durese' }, ...]
  ↓
ProjectionEngine._projectLanguages
  ↓
projection.languages [{ id: 'basic', name: 'Basic' }, { id: 'durese', name: 'Durese' }, ...]
  ↓
SelectedRailContext._buildLanguagesSection
  ↓ (FIXED: extract name from object)
snapshotSections[].items [{ label: 'Basic', ... }, { label: 'Durese', ... }, ...]
  ↓
selected-rail.hbs list render
  ↓
"Basic", "Durese" visible in UI (NOT "[object Object]")
```

**Verification:**
- [ ] Languages are objects with id/name properties at projection
- [ ] Context extracts names correctly
- [ ] Template receives strings for labels
- [ ] UI shows readable language names

**Notes:** ____________

---

### Test 20: Credits: Projection to Template

**Setup:**
1. Complete species/class/background that grant credits

**Expected Data Flow:**
```
draftSelections { class: { credits: 1000 }, background: { credits: 500 }, ... }
  ↓
ProjectionEngine._computeCredits
  ↓
projection.derived.credits 1500
  ↓
SelectedRailContext._buildCreditsSection
  ↓
snapshotSections[].items [{ label: 'Available', value: '1500', ... }]
  ↓
selected-rail.hbs list render
  ↓
"Credits: Available 1500 cr" visible in UI
```

**Verification:**
- [ ] Credits computed from class + background
- [ ] projection.derived includes credits field
- [ ] Section built correctly
- [ ] Template renders amount

**Notes:** ____________

---

## Performance Baseline

### Test 21: Render Performance

**Setup:**
1. Navigate through multiple steps, observing frame rate
2. Commit selections repeatedly, observe refresh delay

**Baseline Expectations:**
- [ ] Projection rebuild: <10ms
- [ ] Context build: <5ms
- [ ] Template render: <20ms
- [ ] Full shell re-render: <100ms
- [ ] Selection commit to visual update: <150ms

**Verification:**
- [ ] No noticeable lag
- [ ] Animations smooth
- [ ] No dropped frames

**Notes:** ____________

---

## Integration Testing

### Test 22: Selected Rail ↔ Detail Rail Consistency

**Setup:**
1. Focus on an item in detail rail
2. Check that selected rail shows same item in appropriate section
3. Verify counts match

**Expected Results:**
- [ ] Item visible in both rails
- [ ] Detail rail shows deep info
- [ ] Selected rail shows count/summary
- [ ] No duplication in left rail
- [ ] Distinct responsibilities maintained

**Verification:**
- [ ] Roles remain clear and separate
- [ ] No excessive overlap
- [ ] Each rail has specific purpose

**Notes:** ____________

---

### Test 23: Selected Rail ↔ Summary Rail Consistency

**Setup:**
1. Navigate to summary step
2. Compare data shown in selected rail vs summary panel
3. Verify all selections present in summary

**Expected Results:**
- [ ] Summary shows all items (not just counts)
- [ ] Selected rail shows compact snapshot (counts/names)
- [ ] No duplication of detail level
- [ ] Summary is complete and final
- [ ] Selected rail is in-progress snapshot

**Verification:**
- [ ] Summary panel has full item details
- [ ] Selected rail has compact indicators
- [ ] Non-duplication verified

**Notes:** ____________

---

## Regression Testing

### Test 24: Step Navigation Still Works

**Setup:**
1. Navigate forward through all steps
2. Navigate backward through all steps
3. Jump back to earlier steps (if allowed)

**Expected Results:**
- [ ] Forward navigation works
- [ ] Backward navigation works
- [ ] Jump navigation works
- [ ] Selected rail updates correctly on each navigation
- [ ] Current-step highlight updates
- [ ] No console errors

**Verification:**
- [ ] Navigation unchanged by repairs
- [ ] Rail responds correctly to step changes

**Notes:** ____________

---

### Test 25: Existing Step Plugins Still Function

**Setup:**
1. Open step that has custom renderDetailsPanel
2. Focus on items
3. Commit items
4. Verify step-specific behavior

**Expected Results:**
- [ ] Steps still work as before
- [ ] Step plugins unaffected by changes
- [ ] Commit handlers fire correctly
- [ ] Detail rail still renders

**Verification:**
- [ ] No regressions in step functionality
- [ ] Only selected rail behavior changed
- [ ] All other subsystems unaffected

**Notes:** ____________

---

## Final Sign-Off

### Tester Certification

- [ ] All test cases reviewed and executed
- [ ] All critical tests (marked "CRITICAL FOR REPAIR") passed
- [ ] No regressions found
- [ ] No new errors introduced
- [ ] Performance acceptable
- [ ] Ready for production

### Issues Found During Testing

| Issue | Severity | Affected Component | Resolution |
|-------|----------|-------------------|-----------|
| | | | |
| | | | |

### Approval

- **Tester Name:** _________________
- **Date:** _________________
- **Status:** ☐ PASS  ☐ FAIL  ☐ CONDITIONAL

**Comments:**

_____________________________________________________________________

_____________________________________________________________________

_____________________________________________________________________

---

## Notes for Developers

- Repairs focused on data contract mismatches between projection and context/template
- All async/await issues resolved with buildProjection async marking
- No architecture changes; repairs are surgical and minimal
- Future work: Complete adapter implementations for beast/droid/nonheroic subtype data
- Future work: Link credits computation to actual item definitions

---

## Conclusion

This checklist provides comprehensive verification that the selected rail repairs have resolved all identified defects without introducing regressions. Complete this checklist thoroughly before merging repairs to production.
