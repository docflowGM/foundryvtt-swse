# SWSE V13 Phase 3: Behavioral Smoke Test Checklist

**Date**: April 1, 2026  
**Scope**: Verify layout/scroll/rendering fixes work in practice  
**Tester**: [name]  
**Result**: PASS / FAIL  

---

## PRE-TEST SETUP

- [ ] Load Foundry session with SWSE system
- [ ] Have a test character ready (ideally with varied content)
- [ ] Open browser console (F12) to monitor for errors/warnings
- [ ] Enable SWSE debug logging if available

---

## TEST 1: WINDOW POSITIONING & CENTERING

**Goal**: Verify sheet opens centered consistently

### 1.1 First Open
- [ ] Close all sheets
- [ ] Open a character sheet for the first time
- [ ] **Verify**: Sheet appears centered on screen, not off to one side
- [ ] **Verify**: Sheet is not partially off-screen
- [ ] **Verify**: 24px margin from screen edges
- [ ] Note position: `left: ___ top: ___`

### 1.2 Reopen After Close
- [ ] Close the sheet
- [ ] Immediately reopen the same character
- [ ] **Verify**: Sheet re-centers to same position (not drifting)
- [ ] **Verify**: No visible position flicker/animation

### 1.3 Sidebar Offset
- [ ] If sidebar is visible on right, measure left position
- [ ] **Verify**: Sheet centered in work area (not including sidebar)
- [ ] **Verify**: Right edge doesn't overlap sidebar

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 2: TAB SWITCHING & SCROLLING

**Goal**: Verify tabs switch smoothly and scroll independently

### 2.1 Tab Navigation
- [ ] From Overview tab, click "Abilities" tab
- [ ] **Verify**: Tab switches instantly (no lag)
- [ ] **Verify**: Tab content changes (not ghost switching)
- [ ] Repeat for: Skills, Combat, Talents, Gear, Biography, Notes
- [ ] **For Force-Sensitive Character**: Test "Force" tab exists and switches

### 2.2 Tab Scroll Detection
- [ ] Open "Gear" tab (typically has scroll)
- [ ] **Verify**: Scrollbar appears on right if content > viewport
- [ ] Scroll down in the tab
- [ ] **Verify**: Content scrolls smoothly, header/tabs stay fixed
- [ ] Scroll back to top
- [ ] **Verify**: Can reach all content

### 2.3 Long Content Tabs
- [ ] Open "Skills" tab (typically longest list)
- [ ] **Verify**: List shows with scrollbar
- [ ] Scroll to bottom
- [ ] **Verify**: Last skill visible and reachable
- [ ] **Verify**: No content clipped or cut off

### 2.4 Header/Tabs Anchoring
- [ ] From any tab, scroll content down
- [ ] **Verify**: Header (name, portrait, stats) stays fixed at top
- [ ] **Verify**: Action buttons stay fixed
- [ ] **Verify**: Tab navigation bar stays fixed
- [ ] **Verify**: Only tab content scrolls, not the header

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 3: CONDITION TRACK UPDATE

**Goal**: Verify condition track interaction works

### 3.1 Render Condition Track
- [ ] Open Overview tab
- [ ] **Verify**: Health panel renders with condition track (6 slots)
- [ ] **Verify**: Condition slots are clickable (appear as buttons)
- [ ] **Verify**: Current condition is highlighted

### 3.2 Update Condition
- [ ] Click condition slot "2" (Level -1)
- [ ] **Verify**: Selection moves to slot 2
- [ ] **Verify**: Character sheet updates (no lag)
- [ ] Open console, check for errors: __________
- [ ] Click condition slot "0" (Normal) to reset

### 3.3 PostRender Assertions
- [ ] Check browser console for warnings
- [ ] **Verify**: No "[PostRender]" errors for health panel
- [ ] **Verify**: No "condition-track-frame" duplicate warnings

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 4: ITEM EDIT

**Goal**: Verify item editing works without scroll/layout issues

### 4.1 Edit Item
- [ ] Open "Gear" tab
- [ ] Right-click (or double-click) on an equipment item
- [ ] **Verify**: Item edit dialog opens
- [ ] Change one field (e.g., quantity)
- [ ] Click "Save"
- [ ] **Verify**: Dialog closes, sheet updates
- [ ] **Verify**: Item quantity changed in list

### 4.2 Sheet Rerender Behavior
- [ ] After item edit, sheet rerenders
- [ ] **Verify**: Scroll position is preserved (if there was one)
- [ ] **Verify**: Active tab remains the same
- [ ] **Verify**: No unexpected scroll jump

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 5: ITEM QUANTITY CHANGE

**Goal**: Verify quantity field update (inline form submission)

### 5.1 Change Quantity
- [ ] Open "Gear" tab
- [ ] Find an item with quantity field
- [ ] Click quantity input, change number (e.g., 1 → 5)
- [ ] Press Tab or click elsewhere to submit
- [ ] **Verify**: Quantity updates immediately
- [ ] **Verify**: No page flicker or rerender lag
- [ ] **Verify**: List remains visible (no scroll jump)

### 5.2 Weight Calculation
- [ ] Check if total weight updates
- [ ] **Verify**: Weight display changes if item weight shown

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 6: LEVEL/PROGRESSION UI FLOW

**Goal**: Verify progression UI renders and updates correctly

### 6.1 XP Display
- [ ] Open Overview or Biography tab
- [ ] **Verify**: XP progress bar visible
- [ ] **Verify**: Current XP / Next Level XP displayed
- [ ] **Verify**: Progress bar shows current progress

### 6.2 Level-Up Button
- [ ] Find "Level Up" button (appears when XP ready)
- [ ] OR find "Chargen" button (if character is level 0)
- [ ] **Verify**: Button renders without layout issues
- [ ] **Verify**: Button is clickable and responsive

### 6.3 Open Progression Dialog
- [ ] Click "Level Up" or "Chargen"
- [ ] **Verify**: Dialog opens without errors
- [ ] **Verify**: Sheet background still visible (modal overlay)
- [ ] Close dialog
- [ ] **Verify**: Returns to sheet without layout shift

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 7: FORCE-SENSITIVE TAB VISIBILITY

**Goal**: Verify force tab appears/hides correctly

### 7.1 Force-Sensitive Character
- [ ] Open sheet for force-sensitive character
- [ ] **Verify**: "Force" tab appears in tab navigation
- [ ] Click "Force" tab
- [ ] **Verify**: Force Powers panel renders
- [ ] **Verify**: Dark Side Points panel visible
- [ ] **Verify**: Force techniques/secrets display

### 7.2 Non-Force Character
- [ ] Open sheet for non-force-sensitive character
- [ ] **Verify**: "Force" tab is NOT visible
- [ ] **Verify**: No "Force" in tab bar
- [ ] Tab count should be 9 (not 10)

### 7.3 Switch Force Sensitivity
- [ ] Edit character system data: `system.forceSensitive = true`
- [ ] Trigger rerender (close/open sheet)
- [ ] **Verify**: "Force" tab now appears
- [ ] Toggle back to false
- [ ] **Verify**: "Force" tab disappears

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 8: FOLLOWER/RELATIONSHIP CONTENT

**Goal**: Verify follower and relationship panels render correctly

### 8.1 Relationships Tab (if followers present)
- [ ] Open "Relationships" tab
- [ ] **Verify**: Relationships panel renders
- [ ] **Verify**: Follower slots display (if any)
- [ ] **Verify**: Content scrolls if > viewport

### 8.2 Follower Badges
- [ ] Check if follower talent badges render
- [ ] **Verify**: Badge counts display (e.g., "2/3" slots filled)
- [ ] **Verify**: Follower names visible if slots filled

### 8.3 Add Follower (if UI available)
- [ ] Try to add/edit a follower slot
- [ ] **Verify**: Dialog/form opens
- [ ] **Verify**: Sheet background remains stable
- [ ] Close dialog
- [ ] **Verify**: Returns to sheet without layout shift

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 9: CONSOLE ERROR CHECK

**Goal**: Verify no critical errors in browser console

### 9.1 Open Console
- [ ] Press F12 to open developer console
- [ ] Clear console
- [ ] Perform all smoke tests above
- [ ] Check console output

### 9.2 Error Scan
- [ ] **Verify**: No RED "Uncaught Error" messages
- [ ] **Verify**: No "[PostRender] ... not found" warnings (critical)
- [ ] **Verify**: No "missing context key" warnings
- [ ] Note any yellow warnings (non-critical):
  - _______________
  - _______________

### 9.3 Specific Assertion Messages
- [ ] Search console for "[PostRender]"
- [ ] **Verify**: All show "✓ [panelName] passed"
- [ ] **Verify**: No "[PostRender] [panelName] root ... not found"
- [ ] Search for "missing context key"
- [ ] **Verify**: No matches (or only for conditional panels)

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## TEST 10: CONTEXT KEY WARNINGS

**Goal**: Verify all required context keys are present

### 10.1 Check Initial Load
- [ ] Open any character sheet
- [ ] Open browser console
- [ ] Look for: "missing context key"
- [ ] **Verify**: No warnings appear during load

### 10.2 Check After Updates
- [ ] Edit a character field (ability score, skill, etc.)
- [ ] Watch for context warnings
- [ ] **Verify**: None appear
- [ ] Switch tabs
- [ ] **Verify**: No warnings on tab switch

### 10.3 Conditional Context Keys
- [ ] If you see warnings, verify they're expected:
  - Force-related keys if non-force-sensitive: OK
  - Vehicle-related keys on character: OK
- [ ] **Verify**: All "missing" keys are actually conditional

**Result**: ✓ PASS / ✗ FAIL  
**Notes**: _______________

---

## FINAL SUMMARY

| Test | Result | Notes |
|------|--------|-------|
| 1. Window Centering | ✓ / ✗ | |
| 2. Tab Switching | ✓ / ✗ | |
| 3. Condition Track | ✓ / ✗ | |
| 4. Item Edit | ✓ / ✗ | |
| 5. Quantity Change | ✓ / ✗ | |
| 6. Progression UI | ✓ / ✗ | |
| 7. Force Tab | ✓ / ✗ | |
| 8. Relationships | ✓ / ✗ | |
| 9. Console Errors | ✓ / ✗ | |
| 10. Context Keys | ✓ / ✗ | |

**Overall Result**: ✓ ALL PASS / ✗ SOME FAILURES  

**Critical Failures** (must fix):
- _______________
- _______________

**Minor Issues** (nice to fix):
- _______________
- _______________

**Tester Signature**: _________________ **Date**: _________

