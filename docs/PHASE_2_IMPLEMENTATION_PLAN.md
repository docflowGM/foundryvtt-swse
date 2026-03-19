# Phase 2 Implementation Plan — Full First-Wave Chargen Flow

**Start Date:** 2026-03-16
**Status:** BEGINNING
**Scope:** Complete first-wave chargen (Name → Attributes → Class → Skills → Feats → Talents → Summary → Confirm)

---

## Phase 1 Recap (Completed)

✅ **Launcher Authority Fixed**
- All 9 chargen entry points route through `CharacterGenerator.open()`
- No legacy branching
- No setting gates at launcher level

✅ **Legacy Chargen Demolished**
- Old monolithic chargen is no longer active
- New ProgressionShell is sole authority
- Special workflows (droid builder, droid edit) disabled pending Phase 2

✅ **Work-Surface Template Injection Fixed**
- NameStep, SkillsStep, SummaryStep return proper template specs
- All other steps already had correct implementations

✅ **Setting Registration Fixed**
- Removed nested init hook structure
- Setting properly registered during 'init' phase
- Defensive error handling added to gate method

---

## Phase 2 Objectives

### Primary Objective
**Get a complete, working first-wave chargen flow in the new ProgressionShell with all steps rendering correctly.**

### Success Criteria
1. **NameStep** renders in work-surface with proper 3-column layout
2. **SpeciesStep** allows character species selection
3. **AttributeStep** renders ability scores with proper layout
4. **ClassStep** allows class selection
5. **SkillsStep** renders in work-surface with skill list
6. **FeatStep** allows feat selection
7. **TalentStep** allows talent selection
8. **SummaryStep** shows all committed selections correctly
9. **Navigation** works (Next/Back buttons)
10. **State persistence** works (data survives navigation)
11. **ConfirmStep** completes chargen and applies to actor
12. **No console errors** during any step

---

## What Already Works

### ✅ Architecture
- ProgressionShell with 6-region layout system
- ProgressionStepPlugin base class with lifecycle hooks
- Step plugin instantiation and plugin chain
- Work-surface template injection mechanism
- Progress rail step sequencing
- Mentor rail state management
- Utility bar configuration per step
- Action footer navigation buttons

### ✅ All First-Wave Step Implementations
```
✅ name-step.js                  (renderWorkSurface returns template)
✅ species-step.js               (renderWorkSurface returns template)
✅ attribute-step.js             (renderWorkSurface returns template)
✅ class-step.js                 (renderWorkSurface returns template)
✅ l1-survey-step.js             (renderWorkSurface returns template)
✅ background-step.js            (renderWorkSurface returns template)
✅ language-step.js              (renderWorkSurface returns template)
✅ feat-step.js                  (renderWorkSurface returns template)
✅ talent-step.js                (renderWorkSurface returns template)
✅ summary-step.js               (renderWorkSurface returns template)
✅ confirm-step.js               (renderWorkSurface returns template)
```

### ✅ All First-Wave Templates
```
✅ name-work-surface.hbs         (3-panel layout)
✅ species-work-surface.hbs      (3-panel layout)
✅ attribute-work-surface.hbs    (3-panel layout)
✅ class-work-surface.hbs        (3-panel layout)
✅ l1-survey-work-surface.hbs    (3-panel layout)
✅ background-work-surface.hbs   (3-panel layout)
✅ language-work-surface.hbs     (3-panel layout)
✅ feat-work-surface.hbs         (3-panel layout)
✅ talent-work-surface.hbs       (3-panel layout)
✅ summary-work-surface.hbs      (3-panel layout)
✅ confirm-work-surface.hbs      (3-panel layout)
```

### ✅ CSS Styling
```
✅ progression-shell.css         (6-region layout)
✅ progression-framework.css     (CSS variables)
✅ holo-theme.css                (Aesthetic)
✅ action-footer.css             (Footer)
✅ mentor-rail.css               (Mentor)
✅ progress-rail.css             (Step indicators)
✅ utility-bar.css               (Control bar)
```

---

## What Needs Testing/Validation

### Validation Tasks (In Order)

**1. NameStep Validation**
- [ ] Click sidebar Chargen button
- [ ] Verify ProgressionShell opens
- [ ] Verify NameStep renders in work-surface
- [ ] Verify 3-column layout visible
- [ ] Verify left/center/right panels show correct content
- [ ] Enter character name
- [ ] Adjust level slider
- [ ] Click "Generate Random Name"
- [ ] Click Next button
- [ ] Verify smooth transition to next step

**2. SpeciesStep Validation**
- [ ] Verify SpeciesStep renders in work-surface
- [ ] Select a species
- [ ] Verify species name appears in Name step left panel
- [ ] Click Next button
- [ ] Verify transition to Attributes

**3. AttributeStep Validation**
- [ ] Verify AttributeStep renders ability score table
- [ ] Verify select ability method (roll/point-buy/standard array)
- [ ] Roll/select ability scores
- [ ] Verify correct modifiers calculated
- [ ] Click Next button
- [ ] Verify transition to Class

**4. ClassStep Validation**
- [ ] Verify ClassStep renders class list
- [ ] Select a class
- [ ] Verify class name propagates to summary
- [ ] Click Next button
- [ ] Verify transition to Skills

**5. SkillsStep Validation**
- [ ] Verify SkillsStep renders in work-surface (fixed in Phase 1)
- [ ] Verify skill list displays
- [ ] Train some skills within limit
- [ ] Try to exceed training limit (should be blocked)
- [ ] Click Next button
- [ ] Verify transition to Feats

**6. FeatStep Validation**
- [ ] Verify FeatStep renders feat list
- [ ] Select feats appropriate to class
- [ ] Verify feat count respects limits
- [ ] Click Next button
- [ ] Verify transition to Talents

**7. TalentStep Validation**
- [ ] Verify TalentStep renders talent tree
- [ ] Select talents from available tree
- [ ] Verify talent selection constraints work
- [ ] Click Next button
- [ ] Verify transition to Summary

**8. SummaryStep Validation**
- [ ] Verify SummaryStep shows all committed selections:
  - [ ] Character name (from NameStep)
  - [ ] Species (from SpeciesStep)
  - [ ] Ability scores (from AttributeStep)
  - [ ] Class (from ClassStep)
  - [ ] Skills (from SkillsStep)
  - [ ] Feats (from FeatStep)
  - [ ] Talents (from TalentStep)
- [ ] Verify summary is read-only (no edit)
- [ ] Click Next button
- [ ] Verify transition to Confirm

**9. ConfirmStep Validation**
- [ ] Verify ConfirmStep shows finalization prompt
- [ ] Click Confirm button
- [ ] Verify character data applied to actor
- [ ] Verify window closes
- [ ] Verify actor sheet shows new values

**10. Full Flow Validation**
- [ ] Complete chargen from start to finish
- [ ] Verify no console errors
- [ ] Verify state persistence across all steps
- [ ] Verify Next/Back navigation works
- [ ] Verify actor receives correct final data

---

## Known Issues to Watch For

### 1. Legacy Chargen Assumptions
Some steps might still have code that assumes:
- Old chargen window structure
- Old step sequencing
- Old button/control naming
- Old template inheritance patterns

**Action:** Identify and fix during validation

### 2. Data Persistence
Steps need to properly:
- Save state when leaving (onStepExit)
- Restore state when returning (onStepEnter)
- Export data for summary/confirm (getStepData)

**Action:** Verify during validation

### 3. Validation/Blocking Issues
Steps should block Next button if:
- Required selection not made
- Data is invalid
- Prerequisites not met

**Action:** Test during validation

### 4. Template Rendering
Templates must properly:
- Render in work-surface region only
- Use correct data from getStepData()
- Integrate with 3-column layout
- Not assume old chargen classes/IDs

**Action:** Verify during validation

---

## Testing Environment Setup

### Enable Debug Mode
```javascript
// In browser console
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true)
// Verify setting is true
game.settings.get('foundryvtt-swse', 'useNewProgressionShell')
```

### Check Browser Console
- Watch for console errors as you progress through steps
- Look for logger messages about step transitions
- Note any undefined data or missing properties

### Take Screenshots
- Screenshot each step when it renders
- Screenshot summary showing all selections
- Screenshot actor sheet after completion
- Provide proof of working flow

---

## Fix Priority (If Issues Found)

### Critical (Block Chargen)
1. renderWorkSurface not returning proper template
2. Step plugin not instantiating
3. Next button not working
4. Data not persisting between steps
5. Console errors blocking navigation

### High (Visible Bugs)
1. Step layout incorrect
2. Data showing as undefined
3. Summary missing committed selections
4. Validation not blocking invalid selections

### Medium (UX Issues)
1. Mentor dialogue not appropriate for step
2. Utility bar not matching step
3. Progress rail not highlighting current step

### Low (Polish)
1. CSS styling needs tweaking
2. Button labels need clarification
3. Helpful text needs adjustment

---

## Expected Deliverable After Phase 2

✅ **Complete first-wave chargen working in new shell**
- All 11 steps (name → summary → confirm)
- All data flowing correctly
- No console errors
- State persistence working
- Full end-to-end validated

✅ **Runtime validation report** with:
- Screenshots of each step
- Proof of data persistence
- Full chargen completion proof
- Console log showing no errors

✅ **Any bugs found and fixed**
- Root causes identified
- Fixes applied
- Re-validation completed

---

## Timeline

**Phase 2: Immediate** (This session)
- Validate all first-wave steps
- Identify and fix breakages
- Generate proof of working flow

**Phase 3: Future** (Separate session)
- Levelup shell implementation
- NPC chargen shell implementation
- Beast chargen shell implementation
- Additional features and refinement

---

## Success Metric

**FINAL ACCEPTANCE:**
User can click Chargen button, progress through all 11 first-wave steps, see correct 3-column layout with proper template injection at each step, complete chargen, and the actor receives correct data — with zero console errors and clear visual evidence that the new shell is the functional, sole chargen authority.

---

*Phase 2 begins now. Let's validate that the new mall works from front door to checkout.*
