# Detail Rail Flow Review & Adjustments (Option C)

**Date:** 2026-03-28
**Phase:** Option C — Live Flow Testing & Adjustments
**Status:** TESTING PLAN CREATED — AWAITING MANUAL FLOW TESTING

---

## Overview

This document outlines the flow testing approach for verifying that all updated detail panel templates work correctly in real progression flows. After template updates (Option A), we now validate the normalized data contract and template rendering end-to-end.

---

## Testing Strategy

### Test Scope

We test each implemented item type through its native progression flow to verify:

1. **Detail Panel Updates Correctly** — Switching focus/selection updates detail panel
2. **Fallback Rendering Works** — Missing data shows explicit fallback text
3. **No Stale Data** — Old data doesn't persist when changing selections
4. **Section Ordering Is Stable** — Headers, descriptions, prerequisites, mentor prose appear in order
5. **Ask Mentor Still Works** — Mentor integration preserved where expected
6. **Honest Display** — Prerequisites shown as text-only (no misleading validation)
7. **Visual Consistency** — Spacing, alignment, no orphaned sections

### Test Flow Categories

#### Primary Flows (Core Character Creation)
1. **Species Selection Flow** — Test species details panel
2. **Class Selection Flow** — Test class details panel
3. **Background Selection Flow** — Test background details panel
4. **Attribute Assignment Flow** — Test attribute details panel
5. **Language Selection Flow** — Test language details panel

#### Feature Flows (Advanced Selection)
6. **Feat Selection Flow** — Test feat details panel
7. **Talent Selection Flow** — Test talent details panel
8. **Force Selection Flows** — Test force power/technique/secret panels
9. **Starship Maneuver Flow** — Test starship details panel

#### Deferred (Phase 3)
10. **Droid Systems** — Not yet implemented
11. **Skills as Standalone** — Not yet implemented

---

## Detailed Test Plans

### TEST 1: Species Selection Flow

**Flow:** Enter chargen → Navigate to Species step → Browse and select species

**Preconditions:**
- Species registry is initialized and populated
- At least 3-5 species available (should include Human, Twi'lek, Wookiee, or similar)

**Test Cases:**

#### 1.1 Detail Panel Updates on Focus
1. Click a species to focus (select in browse list)
2. **Verify Detail Panel:**
   - [ ] Panel shows species name in header
   - [ ] Ol' Salty dialogue appears (mentorProse, if available)
   - [ ] Description renders (canonicalDescription) or shows "No description available."
   - [ ] Size and Speed display correctly
   - [ ] Ability modifiers show (+/-values, color-coded)
   - [ ] Special abilities list renders
   - [ ] Languages list renders
   - [ ] Confirm button is active

#### 1.2 Detail Panel Clears on Unfocus
1. Click another species
2. **Verify Detail Panel:**
   - [ ] Species name updates
   - [ ] Ol' Salty dialogue updates (if different mentor prose)
   - [ ] No stale data from previous species

#### 1.3 Description Fallback
1. Find species with no description (if exists) or use near-human
2. **Verify:**
   - [ ] "No description available." message appears
   - [ ] Properly styled and readable
   - [ ] No broken layout

#### 1.4 Near-Human Builder
1. Focus and try to commit Near-Human species
2. **Verify:**
   - [ ] Builder mode activates
   - [ ] Detail panel updates for Near-Human
   - [ ] Ol' Salty dialogue renders (if available)

**Expected Outcome:** Detail panels update correctly, fallbacks render, no stale data.

---

### TEST 2: Class Selection Flow

**Flow:** Continue chargen → Class step → Browse and select class

**Test Cases:**

#### 2.1 Class Description Rendering
1. Focus different classes (Soldier, Scoundrel, Tech Specialist, etc.)
2. **Verify Detail Panel:**
   - [ ] Class name and type (Base/Prestige) display
   - [ ] Description renders (canonicalDescription) if available
   - [ ] Fantasy field displays as fallback if no canonical description
   - [ ] BAB, Hit Die, Defense Bonus show correctly
   - [ ] Starting Abilities list renders
   - [ ] Trained Skills list renders
   - [ ] Class Skills list renders

#### 2.2 Description Fallback (If Any)
1. If a class has no description, verify fallback
2. **Verify:**
   - [ ] "No description available." displays (if implemented)
   - [ ] Layout doesn't break

#### 2.3 Mentor/Guide Section
1. Focus any class
2. **Verify:**
   - [ ] "Your Guide" section displays mentor name correctly
   - [ ] Styling is consistent with other mentor sections

**Expected Outcome:** Class details panel displays completely, mentor reference consistent.

---

### TEST 3: Background Selection Flow

**Flow:** Continue chargen → Background step → Browse and select background

**Test Cases:**

#### 3.1 Background Details Rendering
1. Focus different backgrounds
2. **Verify Detail Panel:**
   - [ ] Background name and category chip display
   - [ ] Description renders (canonicalDescription)
   - [ ] "What This Grants" section shows correctly
   - [ ] Trained skills chips render
   - [ ] Bonus language displays (if applicable)
   - [ ] "No grants" message (if applicable)
   - [ ] Selection status displays
   - [ ] Source attribution displays

#### 3.2 Status Updates on Commit
1. Commit a background
2. **Verify:**
   - [ ] Detail panel updates to show committed status
   - [ ] Button text changes (Confirm → Deselect/Change)
   - [ ] Visual styling updates

**Expected Outcome:** Background panel consistent, status updates correctly.

---

### TEST 4: Attribute Assignment Flow

**Flow:** Continue chargen → Attributes step → Assign base scores

**Test Cases:**

#### 4.1 Attribute Details Rendering
1. Click/focus each attribute (STR, DEX, CON, INT, WIS, CHA)
2. **Verify Detail Panel:**
   - [ ] Attribute name displays (Strength, Dexterity, etc.)
   - [ ] Description renders (canonicalDescription)
   - [ ] Numeric breakdown shows:
     - Base Score
     - Species Modifier (with color coding)
     - Final Score (highlighted)
     - Modifier (+/- value, color-coded)
   - [ ] "What This Affects" section lists relevant abilities
   - [ ] "Why This Matters" section shows mentor prose (mentorProse)

#### 4.2 Mentor Prose Rendering
1. Focus any attribute
2. **Verify:**
   - [ ] "Why This Matters" header displays
   - [ ] Mentor guidance text renders correctly (hardcoded from normalizer)
   - [ ] Guidance is specific to the ability (mentions Strength/Dexterity/etc.)

#### 4.3 Score Updates Propagate
1. Adjust base score in the step (if editable)
2. **Verify:**
   - [ ] Detail panel updates Final Score automatically
   - [ ] Modifier recalculates
   - [ ] Color coding updates

**Expected Outcome:** Attribute panel shows numeric breakdown, mentor guidance renders, scores update dynamically.

---

### TEST 5: Language Selection Flow

**Flow:** Continue chargen → Language step → Select bonus languages

**Test Cases:**

#### 5.1 Language Details Rendering
1. Focus different languages (Common, Bothese, Ewokese, etc.)
2. **Verify Detail Panel:**
   - [ ] Language name displays
   - [ ] Category chip displays (color-coded)
   - [ ] Status badge shows:
     - "Automatically known" (if from species/background)
     - "Selected" (if user selected)
     - "Available to select" (if not yet selected)
   - [ ] Description renders (canonicalDescription)
   - [ ] Selection controls display (Select / Remove buttons)
   - [ ] Remaining picks count displays

#### 5.2 Status Updates on Selection
1. Select a language
2. **Verify:**
   - [ ] Detail panel updates immediately
   - [ ] Status badge changes to "Selected"
   - [ ] Button changes to "Remove Selection"
   - [ ] Remaining picks counter decrements

#### 5.3 Deselection
1. Click Remove on a selected language
2. **Verify:**
   - [ ] Status reverts to "Available to select"
   - [ ] Button changes back to "Select This Language"
   - [ ] Remaining picks increments

**Expected Outcome:** Language panel updates on selection changes, status accurate.

---

### TEST 6: Feat Selection Flow

**Flow:** Level-up or chargen → Feat selection step → Browse and select feats

**Test Cases:**

#### 6.1 Feat Details Rendering
1. Focus different feats
2. **Verify Detail Panel:**
   - [ ] Feat name displays
   - [ ] Suggested badge shows (if applicable)
   - [ ] Repeatable badge shows (if applicable)
   - [ ] Category displays correctly
   - [ ] Description renders (canonicalDescription)
   - [ ] Prerequisites section displays:
     - Text of prerequisites (if present)
     - OR "None" (if no prerequisites)
   - [ ] **NO "Met" checkmarks anywhere** ⚠️ CRITICAL

#### 6.2 Critical: No Validation Checkmarks
1. Focus a feat with text-only prerequisites
2. **Verify:**
   - [ ] Prerequisites render as plain text
   - [ ] NO checkmark icon appears
   - [ ] NO "Met" or "Unmet" text
   - [ ] Prerequisites shown honestly as guidance, not validation

#### 6.3 Selection Controls
1. Focus a feat and try to select it
2. **Verify:**
   - [ ] Select button displays
   - [ ] Ask Mentor button displays
   - [ ] On commit, detail panel updates to show deselect option

#### 6.4 Description Fallback
1. Find a feat with no description
2. **Verify:**
   - [ ] "No description available." displays
   - [ ] Properly styled
   - [ ] Layout stable

**Expected Outcome:** Feat panel shows prerequisites honestly, no validation claims, description fallback works.

---

### TEST 7: Talent Selection Flow

**Flow:** Feat or talent tree selection → Focus talent node → View details

**Test Cases:**

#### 7.1 Talent Details Rendering
1. Focus different talents in talent tree
2. **Verify Detail Panel:**
   - [ ] Talent name displays
   - [ ] Tree name badge displays
   - [ ] Selected badge displays (if selected)
   - [ ] Description renders (canonicalDescription) or "No description available."
   - [ ] Prerequisites section displays:
     - Text (if present)
     - OR "None" (if no prerequisites)
   - [ ] Selection controls (Select / Deselect)
   - [ ] Ask Mentor button

#### 7.2 Tree Navigation
1. Navigate to different talent trees
2. **Verify:**
   - [ ] Tree name badge updates
   - [ ] Detail panel updates for focused node
   - [ ] No stale data from previous tree

#### 7.3 Structured vs Text Prerequisites
1. Focus talents with both structured and text-only prerequisites
2. **Verify:**
   - [ ] Text-only prerequisites display as text (no validation)
   - [ ] Both types shown honestly

**Expected Outcome:** Talent panel updates on focus, prerequisites shown honestly.

---

### TEST 8: Force Power Selection Flow

**Flow:** Force step → Focus force power → View details

**Test Cases:**

#### 8.1 Power Details Rendering
1. Focus different force powers (Move, Sense, etc.)
2. **Verify Detail Panel:**
   - [ ] Power name displays
   - [ ] Selected count badge displays (if selected multiple times)
   - [ ] Description renders (canonicalDescription) or "No description available."
   - [ ] Prerequisites section displays (or "None" if no prerequisites)
   - [ ] Selection controls:
     - Add button (if can add more)
     - Blocked message (if maxed out)
   - [ ] Ask Mentor button
   - [ ] Hint text about multiple selections

#### 8.2 Stacking Model
1. Select a power, then select it again
2. **Verify:**
   - [ ] Selected count badge increments
   - [ ] Detail panel updates
   - [ ] Button changes to "Add Another Use"

#### 8.3 Sparse Data Handling
1. Find a force power with no description
2. **Verify:**
   - [ ] "No description available." displays
   - [ ] Prerequisites section shows "None" (if no prerequisites)
   - [ ] Layout stable despite sparse data

**Expected Outcome:** Power panel handles stacking, sparse data, and updates correctly.

---

### TEST 9: Force Technique & Secret Selection

**Flow:** Force step → Focus technique/secret → View details

**Test Cases:**

#### 9.1 Technique Details
1. Focus different force techniques
2. **Verify:**
   - [ ] Name and selected count display
   - [ ] Description renders or "No description available."
   - [ ] Actions available
   - [ ] No prerequisites section (if not applicable)

#### 9.2 Secret Details
1. Focus different force secrets
2. **Verify:**
   - [ ] Name and selected count display
   - [ ] Description renders or "No description available."
   - [ ] Prerequisites display (if applicable)
   - [ ] Actions available

#### 9.3 Consistency
1. Compare technique, power, secret panels
2. **Verify:**
   - [ ] Section ordering consistent
   - [ ] Fallback messaging consistent
   - [ ] Styling harmonious

**Expected Outcome:** Force type panels consistent despite lower data coverage.

---

### TEST 10: Starship Maneuver Flow

**Flow:** Starship career or skills → Maneuver selection → View details

**Test Cases:**

#### 10.1 Maneuver Details Rendering
1. Focus different maneuvers
2. **Verify Detail Panel:**
   - [ ] Maneuver name displays
   - [ ] Selected count displays (if stacking)
   - [ ] Description renders (canonicalDescription) or "No description available."
   - [ ] Actions available
   - [ ] Hints about stacking

#### 10.2 Sparse Data
1. Find maneuvers with missing descriptions
2. **Verify:**
   - [ ] "No description available." displays
   - [ ] Layout stable

**Expected Outcome:** Maneuver panel consistent with other stackable types.

---

## Visual & UX Consistency Checklist

As you test flows, verify overall consistency:

- [ ] All descriptions render in consistent typography
- [ ] All fallback messages ("No description available.", "None") styled uniformly
- [ ] Section headers ("Description", "Prerequisites", "What This Affects") consistent
- [ ] Prerequisites shown as text, never as validated checklists
- [ ] Color coding consistent (positive/negative values, badges, status indicators)
- [ ] Spacing between sections uniform
- [ ] No orphaned headers without content
- [ ] Buttons and actions consistently positioned
- [ ] Ask Mentor button present where expected (species, attributes, not in feats/talents yet)
- [ ] No layout breaks in narrow panels

---

## Edge Cases to Test

1. **Empty Prerequisite Text** — What renders if prerequisites field is empty string?
2. **Very Long Descriptions** — How do long texts wrap in narrow panels?
3. **Missing Mentor Prose** — Verify sections omit cleanly (not blank, not "N/A")
4. **Zero Values** — Do ability modifiers +0 display correctly?
5. **Special Characters** — Do descriptions with quotes, apostrophes, etc. render?
6. **Rapid Selection Changes** — Does detail panel keep up with quick focus changes?
7. **Multiple Same-Name Items** — If duplicates exist, does detail panel show correct one?

---

## Issues Found Log

**Format for documenting issues:**
```
### Issue [N]: [Title]
**Location:** [Template / Step]
**Symptom:** [What user sees]
**Root Cause:** [What's wrong]
**Fix Applied:** [How it was corrected]
**Status:** [FIXED / PENDING / BLOCKED]
```

### (Issues documented here as they are found during testing)

---

## Adjustments Made Log

**Format for documenting fixes:**
```
### Adjustment [N]: [Component]
**What Changed:** [Description]
**Why:** [Rationale]
**Files Modified:** [List]
**Committed:** [Commit SHA or "Pending"]
```

### (Adjustments documented as they are made)

---

## Testing Sign-Off Checklist

After completing all flow tests, verify:

- [ ] All 10 item types tested in their native flows
- [ ] Detail panels update correctly on selection/focus changes
- [ ] Fallback messages render for missing data
- [ ] Prerequisites shown honestly (no misleading validation)
- [ ] Mentor prose appears only where canonical
- [ ] No stale data persists
- [ ] Visual consistency across all panels
- [ ] Ask Mentor integration works
- [ ] Edge cases handled gracefully
- [ ] All issues documented and resolved

**Final Status:** ⏳ AWAITING MANUAL FLOW TESTING

---

## Notes for Tester

1. **Browser Console:** Watch for JavaScript errors during flow transitions
2. **Performance:** Note any lag when switching between items or updating detail panels
3. **Mentor Integration:** Verify mentor dialogue updates with detail panel changes
4. **Mobile/Narrow:** If testing on narrow screen, verify detail panel wrapping
5. **Data Consistency:** Compare detail panel data with character sheet values where applicable

---

## Related Documents

- DETAIL_RAIL_TEMPLATE_UPDATE_REPORT.md — Template refactoring strategy
- DETAIL_RAIL_TEMPLATE_VERIFICATION.md — Template code verification
- DETAIL_RAIL_IMPLEMENTATION_REPORT.md — Full implementation notes
- detail-rail-normalizer.js — Normalization logic (source of truth)

---

## Success Criteria

✅ **Success:** All detail panels consume normalized data, render fallbacks correctly, and work seamlessly in real flows.

❌ **Failure:** Stale data persists, fallbacks don't render, or templates break in real scenarios.

→ **Resolution Path:** Document any issues found, adjust normalizer or templates as needed, re-test.
