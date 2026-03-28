# SWSE Progression Engine — UX Verification & Testing Plan

**Date**: 2026-03-28
**Purpose**: Verify UX improvements meet acceptance criteria
**Scope**: All 11 phases of UX audit

---

## VERIFICATION STRUCTURE

Tests organized by phase/capability:
1. **Orientation & Context** (Phase 1)
2. **Micro-Progress Indicators** (Phase 2)
3. **Navigation Blockers** (Phase 3)
4. **Change Feedback** (Phase 4 — defer)
5. **Rail Affordances** (Phase 5)
6. **Prerequisite Messaging** (Phase 6)
7. **Selection Feedback** (Phase 7)
8. **Empty States** (Phase 8)
9. **Summary Control** (Phase 9)
10. **Safety Messaging** (Phase 10)
11. **Live Preview** (Phase 11 — optional)

---

## PHASE 1: ORIENTATION & CONTEXT TESTS

### Test 1.1: Step Counter in Work Surface
```
SETUP:
  - Open chargen for new character
  - Observer is on first step (e.g., Species selection)

VERIFY:
  ✓ Work surface shows "Step 1 of X" context
  ✓ X equals total active steps (not hidden steps)
  ✓ Context remains visible and readable
  ✓ Counter updates when navigating to next step

PASS CONDITION:
  Player always sees their position in active step list.
```

### Test 1.2: First/Last Step Indicators
```
SETUP:
  - On first active step
  - On last active step

VERIFY:
  ✓ First step labeled "Step 1 of N" (or shows "Start")
  ✓ Last step labeled "Step N of N" (or shows "Final Review")
  ✓ Back button disabled on first step
  ✓ Confirm button shows on last step (not Next)

PASS CONDITION:
  Player recognizes journey start and finish.
```

### Test 1.3: Hidden Steps Not Counted
```
SETUP:
  - Chargen with conditional steps
  - Some conditional steps not yet unlocked

OBSERVE:
  - Count shows only active steps

VERIFY:
  ✓ Unlocked conditional step appears in count
  ✓ Hidden conditional step does NOT inflate count
  ✓ When hidden step appears, count increments
  ✓ When hidden step disappears, count decrements

PASS CONDITION:
  Count always matches visible active step list.
```

### Test 1.4: Empty State Guidance
```
SETUP:
  - Navigate to feat step where all feats require unmet prerequisite

VERIFY:
  ✓ Empty state message explains why (not generic "No feats")
  ✓ Message suggests path forward ("Enable Show All")
  ✓ Guidance is contextual, not repetitive
  ✓ Text is readable and concise

PASS CONDITION:
  Player understands why section is empty and how to proceed.
```

---

## PHASE 2: MICRO-PROGRESS INDICATORS TESTS

### Test 2.1: Feat Selection Counter
```
SETUP:
  - Navigate to feat step with 1 available slot
  - No feats selected yet

VERIFY:
  ✓ Step shows "0 of 1 feats selected" or "1 remaining"
  ✓ Counts come from progressionSession.draftSelections
  ✓ After selecting a feat, shows "1 of 1" or "Complete"
  ✓ Complete badge/checkmark appears when done

AFTER EDIT:
  - Go back and deselect the feat

VERIFY:
  ✓ Count updates immediately to "0 of 1"
  ✓ Complete badge disappears

PASS CONDITION:
  Progress counter is always accurate and from authoritative source.
```

### Test 2.2: Talent Selection Counter (Dual Slots)
```
SETUP:
  - Navigate to talent step with 1 general + 1 class slot
  - Select 1 general talent

VERIFY:
  ✓ Shows two subsections: "General: 1 of 1 ✓" / "Class: 0 of 1"
  ✓ OR shows aggregate: "2 of 2 talents (1 remaining)"
  ✓ After selecting class talent, both show complete

PASS CONDITION:
  Dual-slot steps show clear per-slot progress.
```

### Test 2.3: Skills Training Limit
```
SETUP:
  - Navigate to skills step (e.g., 4 trained skills allowed)
  - Train 3 skills

VERIFY:
  ✓ Shows "3 of 4 skills trained" or "1 remaining"
  ✓ Fourth trainable skill is still available
  ✓ When 4th trained, shows "4 of 4 ✓ Complete"
  ✓ Fifth skill cannot be trained (disabled/hidden)

PASS CONDITION:
  Training limits are clearly communicated.
```

### Test 2.4: Language Slot Counter
```
SETUP:
  - Navigate to languages step
  - Max slots = 2
  - Player has selected 1

VERIFY:
  ✓ Shows "1 of 2 languages" or "1 remaining"
  ✓ Can select second language
  ✓ When second selected, shows "2 of 2 ✓"
  ✓ No option to add third language

PASS CONDITION:
  Slot limits visible and enforced.
```

### Test 2.5: Progress Consistency Across Steps
```
VERIFY:
  ✓ All steps use same naming pattern ("X of Y")
  ✓ All steps use same complete indicator (✓ or "Complete")
  ✓ All steps show remaining count when applicable
  ✓ Format is consistent (no variation between steps)

PASS CONDITION:
  Player learns one pattern and applies it everywhere.
```

---

## PHASE 3: NAVIGATION BLOCKER TESTS

### Test 3.1: Missing Required Selection Blocker
```
SETUP:
  - On species selection step
  - No species selected
  - Try to click Next

VERIFY:
  ✓ Next button disabled
  ✓ Footer shows specific message: "Select a species to continue"
  ✓ Message is actionable (not "Invalid selection")
  ✓ Message appears near footer/nav area

PASS CONDITION:
  Player knows exactly what's needed to proceed.
```

### Test 3.2: Invalid Feat Selection Blocker
```
SETUP:
  - Feat step shows validation error (e.g., feat conflicts with class)
  - Try to click Next

VERIFY:
  ✓ Next button disabled
  ✓ Footer shows: "Resolve feat error: [Specific reason]"
  ✓ Error references the problematic feat (not generic)
  ✓ Player can see which item is invalid

PASS CONDITION:
  Player knows what's wrong and where to fix it.
```

### Test 3.3: Multiple Blockers Prioritized
```
SETUP:
  - Species not selected (blocking)
  - Talents have 2 unresolved errors (blocking)
  - Skills have 1 warning (non-blocking)

VERIFY:
  ✓ Next button disabled
  ✓ Footer shows errors first: "Select species" then "Resolve 2 talent errors"
  ✓ Warning listed separately or not shown
  ✓ If many issues, shows first 2-3 with "and X more"

PASS CONDITION:
  Player sees blocking issues prioritized.
```

### Test 3.4: Blocker Clears When Fixed
```
SETUP:
  - Next blocked by "Select a class"
  - Player selects a class

VERIFY:
  ✓ Footer message disappears
  ✓ Next button becomes enabled
  ✓ Feedback is immediate (no delay)

PASS CONDITION:
  Player sees success immediately upon fixing issue.
```

### Test 3.5: Remaining Choices Display
```
SETUP:
  - Feat step allows 1 feat, none selected
  - Talent step allows 2 talents, 1 selected
  - Try to go to summary

VERIFY:
  ✓ Footer could show: "Select 1 more feat and 1 more talent"
  ✓ OR lists as separate bullets
  ✓ Optional (not blocking) if configured as soft requirement
  ✓ Phrasing is clear ("1 more", not "1 remaining to select")

PASS CONDITION:
  Player aware of optional selections to complete.
```

---

## PHASE 5: RAIL CLICK AFFORDANCE TESTS

### Test 5.1: Cursor Feedback on Clickable Steps
```
SETUP:
  - Navigate to step 3 of 5
  - Hover over step 1 (completed, can go back)
  - Hover over step 4 (not yet reached)

VERIFY:
  ✓ Step 1: cursor changes to pointer, highlights on hover
  ✓ Step 4: cursor stays as default, no hover highlight
  ✓ Visual distinction is clear without guessing

PASS CONDITION:
  Player can see which steps are clickable without trial-and-error.
```

### Test 5.2: Future Step Tooltip
```
SETUP:
  - On step 2 of 5
  - Hover over step 4 (future, not yet accessible)

VERIFY:
  ✓ Tooltip shows: "Available after Step 3"
  ✓ OR for conditional: "Unlocked by: [reason]"
  ✓ Tooltip appears on hover (or always visible)

PASS CONDITION:
  Player understands why step isn't clickable.
```

### Test 5.3: Visual Distinction by Status
```
VERIFY:
  ✓ Current step: bright/highlighted color
  ✓ Complete steps: checkmark, distinct color (green?)
  ✓ Error steps: warning icon, distinct color (red?)
  ✓ Caution steps: ! icon, distinct color (yellow?)
  ✓ Future steps: grayed out or neutral
  ✓ All distinct at a glance

PASS CONDITION:
  Status visible without reading labels.
```

### Test 5.4: Accessibility Attributes
```
VERIFY:
  ✓ Clickable steps: `role="button"`, `tabindex="0"`, `aria-disabled="false"`
  ✓ Non-clickable steps: `aria-disabled="true"`, `tabindex="-1"`
  ✓ Current step: `aria-current="step"`
  ✓ Screen reader reads state correctly

PASS CONDITION:
  Accessibility user can navigate and understand affordances.
```

---

## PHASE 6: PREREQUISITE MESSAGING TESTS

### Test 6.1: Feat Prerequisite Display
```
SETUP:
  - Feat step with mixed legal/illegal feats
  - Some require Force Sensitivity, some are always available

VERIFY:
  ✓ Each feat shows prerequisite line (if any)
  ✓ Unavailable feats show: "❌ Requires Force Sensitivity"
  ✓ Format is consistent across all unavailable feats
  ✓ Available feats show no restriction line

PASS CONDITION:
  Player sees why each feat is/isn't selectable.
```

### Test 6.2: Talent Graph Node Messaging
```
SETUP:
  - Talent tree browser → select tree → graph view
  - Some nodes available, some locked due to prerequisites

VERIFY:
  ✓ Locked nodes appear grayed/disabled
  ✓ Hovering shows: "❌ Requires [prerequisite]"
  ✓ Available nodes show no restriction message
  ✓ Messages are specific (not "Locked")

PASS CONDITION:
  Player sees why talent nodes are unavailable.
```

### Test 6.3: Language Slot Messaging
```
SETUP:
  - Languages step with max 2 slots
  - Both slots filled
  - Try to add third language

VERIFY:
  ✓ Third language option is disabled/hidden
  ✓ Message shows: "You have filled all language slots"
  ✓ OR shows: "2 of 2 languages (no slots remaining)"

PASS CONDITION:
  Player understands why action isn't available.
```

### Test 6.4: Species Restriction Messaging
```
SETUP:
  - Species with special feat/talent pools
  - Player has not selected appropriate species
  - Feat marked as "Species-restricted: Wookiee only"

VERIFY:
  ✓ Feat shows restriction message
  ✓ Message explains: "Requires Wookiee species"
  ✓ Player can see at a glance why unavailable

PASS CONDITION:
  Restrictions are explicit and understandable.
```

---

## PHASE 8: EMPTY STATE TESTS

### Test 8.1: Empty Feat List (No Legal Options)
```
SETUP:
  - Feat step filtered to show only feats matching criteria
  - No feats match current character state

VERIFY:
  ✓ Empty state message explains: "No feats meet prerequisites"
  ✓ Suggests solution: "Enable Show All to see ineligible feats"
  ✓ Not generic "No items available"

PASS CONDITION:
  Player understands why empty and how to explore.
```

### Test 8.2: Thin Step Helper Text
```
SETUP:
  - Background step with only 2 options
  - Navigate to this step

VERIFY:
  ✓ Step shows helper text explaining background choice
  ✓ E.g., "Your background provides bonus skills and flavor"
  ✓ Text is brief and motivating, not overwhelming

PASS CONDITION:
  Even small steps feel complete and meaningful.
```

### Test 8.3: Slot Limit Reached
```
SETUP:
  - Language step with 2 slots
  - Both selected

VERIFY:
  ✓ Empty state message shows: "All language slots filled"
  ✓ OR shows remaining message: "0 slots remaining"
  ✓ Allows continuing to next step

PASS CONDITION:
  Player knows they're done with this section.
```

---

## PHASE 9: SUMMARY CONTROL CENTER TESTS

### Test 9.1: Issue Grouping in Summary
```
SETUP:
  - Complete partial chargen with some errors/warnings
  - Errors: 1 unselected talent
  - Warnings: Some feat selections flagged as suboptimal

NAVIGATE TO: Summary step

VERIFY:
  ✓ Top section shows "Issues (1)" with error
  ✓ Below shows "Needs Review (1)" with warning
  ✓ Below shows completed sections
  ✓ Each issue has a link to jump back

PASS CONDITION:
  Summary clearly shows what needs attention.
```

### Test 9.2: Jump-Back Links
```
SETUP:
  - Summary showing issues
  - Click on "Go to Feats" link

VERIFY:
  ✓ Navigate back to Feats step
  ✓ Current step context updated
  ✓ Can make edits
  ✓ Editing updates summary when returning

PASS CONDITION:
  Player can efficiently fix issues from summary.
```

### Test 9.3: Finalization Readiness Panel
```
SETUP:
  - All required selections made
  - Character name entered

NAVIGATE TO: Summary

VERIFY:
  ✓ Panel shows: "Ready to Finalize"
  ✓ Instructions clear: "Click Confirm to create character"
  ✓ No blocking issues listed

SETUP 2: Some selections incomplete

VERIFY:
  ✓ Panel shows: "Not Yet Ready"
  ✓ Lists blocker: "Resolve X issues"
  ✓ Can't click Confirm

PASS CONDITION:
  Player knows finalization readiness at a glance.
```

### Test 9.4: Grouped Review Sections
```
VERIFY:
  ✓ Attributes section shows all assigned
  ✓ Skills section shows trained
  ✓ Feats section shows selected (ordered canonically)
  ✓ Talents section shows selected (ordered canonically)
  ✓ Each section clearly labeled with icon

PASS CONDITION:
  Summary is organized and scannable.
```

---

## PHASE 10: REVERSIBILITY & SAFETY TESTS

### Test 10.1: Back Button Always Available
```
SETUP:
  - On any step except first

VERIFY:
  ✓ Back button is enabled
  ✓ Can click Back to go to previous step
  ✓ Previous step content still shows user's prior selections
  ✓ Edits don't finalize (still draft state)

PASS CONDITION:
  Player can safely edit without fear of locking in choices.
```

### Test 10.2: Reassurance Messages
```
VERIFY:
  ✓ Summary step shows: "You can change any earlier selection"
  ✓ Message is brief and accurate
  ✓ Doesn't appear on every render (not spammy)

PASS CONDITION:
  Player feels safe and in control.
```

---

## PHASE 4: CHANGE FEEDBACK TESTS (DEFERRED)

### Test 4.1: Step Unlock Feedback
```
SETUP:
  - Select Force Sensitivity
  - Force Powers step becomes available

VERIFY (when implemented):
  ✓ Toast/feedback appears: "✓ Force Powers unlocked"
  ✓ Message disappears after 3-4 seconds
  ✓ Progress rail updates to show new step

PASS CONDITION:
  Player sees feedback when new steps appear.
```

### Test 4.2: Step Hide Feedback
```
SETUP:
  - Select non-Force-Sensitive species
  - Force Powers step was visible, now hides

VERIFY (when implemented):
  ✓ Feedback shows: "Force Powers no longer available"
  ✓ Rail updates to remove step
  ✓ Current step repairs if needed

PASS CONDITION:
  Player understands step removal.
```

### Test 4.3: Downstream Invalidation Feedback
```
SETUP:
  - Select talents from one tree
  - Change class
  - Some talents become invalid

VERIFY (when implemented):
  ✓ Feedback shows: "⚠️ Talents require review"
  ✓ Summary highlights problem step
  ✓ Player can navigate to fix

PASS CONDITION:
  Player informed of downstream impact.
```

---

## INTEGRATION TESTS

### Test I.1: Full Chargen Journey (Happy Path)
```
SETUP:
  - Start new chargen
  - Complete each step with valid selections
  - Note all UX feedback along the way

VERIFY:
  ✓ Step counter accurate throughout
  ✓ Micro-progress shows selections
  ✓ No blocker messages (all selections valid)
  ✓ Next button always enabled
  ✓ Summary shows all selections correctly
  ✓ Finalization ready

PASS CONDITION:
  Full journey feels smooth and clear.
```

### Test I.2: Backward Navigation with Edits
```
SETUP:
  - Progress to step 5 of 8
  - Go back to step 2
  - Change selection
  - Go forward to step 5

VERIFY:
  ✓ Selection change persists
  ✓ Later steps don't show old selection
  ✓ No console errors
  ✓ State remains consistent

PASS CONDITION:
  Edit-navigate-recheck flow works correctly.
```

### Test I.3: Blocker Resolution Flow
```
SETUP:
  - Try to proceed with incomplete selection
  - See blocker message
  - Fix issue
  - Proceed

VERIFY:
  ✓ Blocker message disappears when fixed
  ✓ Next button re-enables
  ✓ No need to reload or reset

PASS CONDITION:
  Error recovery is smooth.
```

### Test I.4: Summary Review and Finalize
```
SETUP:
  - Reach summary step
  - Review all selections
  - Make one edit by jumping back
  - Return to summary
  - Finalize

VERIFY:
  ✓ Edit captured in summary
  ✓ No state loss
  ✓ Character created with correct selections

PASS CONDITION:
  Summary workflow is robust.
```

---

## EDGE CASE TESTS

### Test E.1: Very Few Steps
```
SETUP:
  - Chargen where only 3 steps are active (e.g., droid-only)

VERIFY:
  ✓ Step counter shows "Step 1 of 3"
  ✓ Layout doesn't look broken with few steps
  ✓ Navigation works correctly

PASS CONDITION:
  UX scales to small step counts.
```

### Test E.2: Many Steps
```
SETUP:
  - Chargen where 15+ steps are active

VERIFY:
  ✓ Rail scrolls or handles overflow gracefully
  ✓ Step counter still visible
  ✓ Current step remains highlighted
  ✓ No performance issues

PASS CONDITION:
  UX scales to large step counts.
```

### Test E.3: Empty Chargen (No Options)
```
SETUP:
  - Artificially create scenario with no valid options

VERIFY:
  ✓ Empty state message appears
  ✓ No confusing blank surfaces
  ✓ Player can go back or restart

PASS CONDITION:
  Graceful degradation.
```

### Test E.4: Rapidly Repeated Actions
```
SETUP:
  - Click Next → Back → Next → Back (rapidly)

VERIFY:
  ✓ No UI breaks
  ✓ State remains consistent
  ✓ No duplicate feedback messages
  ✓ No console errors

PASS CONDITION:
  UI is robust to rapid interaction.
```

---

## ACCESSIBILITY TESTS

### Test A.1: Keyboard Navigation
```
SETUP:
  - Use keyboard only (no mouse)
  - Tab to navigate rail steps
  - Tab to select feats/talents
  - Use Enter to confirm

VERIFY:
  ✓ All interactive elements reachable via Tab
  ✓ Current focus visible
  ✓ Enter/Space activates buttons
  ✓ Back button accessible

PASS CONDITION:
  Keyboard user can complete chargen.
```

### Test A.2: Screen Reader Clarity
```
SETUP:
  - Use screen reader (e.g., NVDA)
  - Navigate through progression

VERIFY:
  ✓ Step labels read correctly
  ✓ Step status (complete, error) announced
  ✓ Blocker messages readable
  ✓ Selections announced
  ✓ Aria labels accurate

PASS CONDITION:
  Screen reader user understands UI state.
```

### Test A.3: High Contrast Mode
```
SETUP:
  - Enable high contrast (Windows or browser)

VERIFY:
  ✓ Text readable
  ✓ Buttons distinct
  ✓ Icons have text fallbacks
  ✓ Status indicators clear

PASS CONDITION:
  Low-vision user can navigate.
```

---

## ACCEPTANCE CRITERIA

All of the following must be true:

✓ **Orientation**: Player always knows current step and total active steps
✓ **Micro-progress**: Remaining selections clearly visible in every actionable step
✓ **Blockers**: If Next disabled, specific reason shown near navigation
✓ **Change feedback**: Dynamic state changes surface lightweight feedback (when implemented)
✓ **Rail affordances**: Clickable vs non-clickable steps visually distinct
✓ **Prerequisites**: Why unavailable choices are unavailable is explained inline
✓ **Selection feedback**: Valid choices give confidence feedback (visual or toast)
✓ **Empty states**: Empty sections explain why and suggest next steps
✓ **Summary**: Acts as control center with issue grouping and jump links
✓ **Safety**: Reversibility is clear through back buttons and messaging
✓ **Consistency**: All messaging follows same patterns across steps
✓ **No duplication**: All data comes from authoritative progression sources
✓ **No noise**: Feedback is concise, specific, and timely
✓ **Accessibility**: Keyboard and screen reader users can navigate
✓ **Robustness**: No console errors, handles edge cases gracefully

---

## TESTING ROADMAP

**Week 1**: Orientation & Micro-Progress (Phases 1, 2)
- Implement step context in templates
- Add progress counts to step data
- Verify in templates

**Week 2**: Blockers & Rail (Phases 3, 5)
- Specific blocker messages
- Rail cursor feedback and tooltips
- Test blocker resolution flow

**Week 3**: Prerequisites & Empty States (Phases 6, 8)
- Prerequisite inline messages
- Contextual empty state text
- Test with various character states

**Week 4**: Summary & Integration (Phases 9, 10)
- Summary issue grouping
- Jump-back links
- Full journey testing

**Week 5**: Edge Cases & Polish
- Accessibility testing
- Edge case handling
- Performance checks
- CSS refinement

**Week 6**: Defer (Phase 4: Change Feedback, Phase 7: Selection Feedback, Phase 11: Live Preview)
- Implement when dependency graph ready
- Implement based on feedback
- Implement if performance allows

---

## SUCCESS METRICS

After implementation:

- **Survey**: 85%+ players rate UX as "clear" or "very clear"
- **Telemetry**: Reduced "why can't I proceed?" support questions
- **Error rate**: <5% of sessions end with unsolved blocker
- **Navigation**: Average back/forth navigation reduced
- **Accessibility**: Passes WCAG 2.1 AA standards
- **Performance**: No performance regression from added UI
