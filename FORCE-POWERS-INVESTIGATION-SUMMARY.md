# Force Powers Slot Calculation Investigation — Summary

**Date:** 2026-05-18  
**Status:** DIAGNOSTICS DEPLOYED, AWAITING RUNTIME DATA  

---

## What Was Done

### 1. Code Analysis
Traced the Force Powers slot calculation across multiple components:
- **Header display** (force-power-work-surface.hbs): Shows `selectedPowerTraining / totalPowerTraining` and `remainingPicks`
- **Footer display** (getRemainingPicks()): Shows remaining picks based on `this._remainingPicks - totalSelected`
- **Detail rail** (renderDetailsPanel()): Checks `canAddMore = totalSelected < this._remainingPicks`
- **Entitlement calculation** (force-suite-resolution.js): Calculates total slots from class, Force Sensitivity, and Force Training feats

### 2. Root Cause Analysis
Identified three possible causes for the mismatch:

**A. Force Training feats not detected in pending selections**
- FeatGrantEntitlementResolver.resolve() should include pending feats via getPendingFeatEntries()
- But it only works if the shell reference is correct and feat selections are populated

**B. Entitlements calculated before feat selections ready**
- onStepEnter() calls _computeTotalEntitlements() which calls force-suite-resolution
- If feat selections aren't in shell yet, Force Training won't be found

**C. Ability modifier calculation returning 0**
- Force Training grants `1 + WIS/CHA modifier` slots
- If modifier is 0 (low ability score), might only grant 1 slot instead of expected amount

### 3. Diagnostic Instrumentation
Deployed comprehensive logging at 5 critical points:

**Files Modified:**
1. `force-power-step.js` (3 logging points)
   - _computeTotalEntitlements: Shows what entitlements were detected
   - getStepData: Shows how header displays are calculated
   - getRemainingPicks: Shows how footer displays are calculated

2. `force-suite-resolution.js` (2 logging points)
   - All entitlements from resolver
   - Force Training slot aggregation calculation

3. `feat-grant-entitlement-resolver.js` (1 logging point)
   - All feat entries (owned + pending)
   - Force Training/Sensitivity feat detection
   - Final entitlements by grant type

**Syntax Validation:**
```
✓ force-power-step.js
✓ feat-grant-entitlement-resolver.js
✓ force-suite-resolution.js
```

---

## What You Need to Do

### Step 1: Run Runtime Test
Follow the test plan in `FORCE-POWERS-DIAGNOSTIC-PLAN.md`:

1. Open Foundry with DevTools console visible
2. Create character with Jedi class (has Force Sensitivity)
3. Progress to Feats step and select "Force Training" feat
4. Advance to Force Powers step
5. **Capture console logs** — look for messages starting with:
   - `[FeatGrantEntitlementResolver.resolve]`
   - `[ForceSuiteResolution.ForcePower]`
   - `[ForcePowerStep._computeTotalEntitlements]`
   - `[ForcePowerStep.getStepData]`
   - `[ForcePowerStep.getRemainingPicks]`

### Step 2: Compare Against Expected Output
Compare captured logs against the "Good Scenario" template in the diagnostic plan.

**Key things to verify:**
- [ ] Force Training feat appears in allEntries
- [ ] Force Training creates forcePowerSlots entitlements
- [ ] Force Sensitivity grants +1 slot
- [ ] Total slots = Force Sensitivity (1) + Force Training (N)
- [ ] All display components use same _remainingPicks value

### Step 3: Report Findings
Share which diagnostic category matches your logs:
- **Category A:** Force Training feats not detected
- **Category B:** Force Training detected but slots calculated wrong
- **Category C:** All calculations correct but display shows wrong values
- **Category D:** Other (describe what you see)

---

## Targeted Fixes (Ready to Deploy)

Once diagnostic data shows the root cause, these surgical fixes are prepared:

### If Force Training not detected (Category A):
- Check feat selection is in shell.buildIntent.getSelection('feats')
- Verify getPendingFeatEntries() is reading correct shell property
- Ensure feat name normalization matches "Force Training"

### If slots calculated wrong (Category B):
- Verify ability modifier calculation includes draft attributes
- Check Force Training feat instances are counted correctly
- Ensure no double-counting between different resolver paths

### If display shows wrong despite correct calculation (Category C):
- Verify getStepData() returns correct remainingPicks to template
- Check renderDetailsPanel() uses consistent this._remainingPicks
- Ensure all three components read from same state

---

## Architecture Notes

**Current Design:**
- Single source of truth: `this._remainingPicks` (set in _computeTotalEntitlements)
- Header, footer, detail rail all use this._remainingPicks
- Should be consistent UNLESS:
  - Calculation is wrong
  - Pending selections not being counted
  - Shell reference is outdated/incorrect

**Why It Should Work:**
1. onStepEnter() resolves entitlements via force-suite-resolution
2. force-suite-resolution calls FeatGrantEntitlementResolver with shell
3. FeatGrantEntitlementResolver pulls pending feats from shell
4. All components use this._remainingPicks from that calculation
5. Result should be unified across all displays

**Why It Might Not Work:**
- Shell reference is null/undefined
- Pending feats not populated before onStepEnter
- Feat name doesn't match normalization
- Class grant ledger not building correctly

---

## Testing Checklist (After Fix)

Once root cause is fixed:

- [ ] Force Powers header shows correct total slots
- [ ] Remaining picks counter decrements as selections made
- [ ] Cards become unavailable when all slots used
- [ ] Detail rail "Add Power" button disabled at slot limit
- [ ] Footer displays correct remaining count
- [ ] Character progression continues past Force Powers step
- [ ] Committed powers from earlier sessions don't consume new slot budget

---

## Files Involved in Investigation

```
Root Cause (one of these):
├── scripts/engine/progression/utils/force-suite-resolution.js
├── scripts/engine/progression/feats/feat-grant-entitlement-resolver.js
├── scripts/apps/progression-framework/steps/force-power-step.js
└── scripts/engine/progression/utils/class-grant-ledger-builder.js

Display (correct implementation):
├── templates/apps/progression-framework/steps/force-power-work-surface.hbs
├── scripts/apps/progression-framework/steps/force-power-step.js
└── details panel templates
```

---

## Next Action

1. **Deploy these changes** to your local Foundry instance
2. **Run the diagnostic test** with the test plan
3. **Capture console logs** (preferably paste into Discord/email)
4. **Identify root cause category** from diagnostic output
5. **Report back** with findings

Once findings are available, the targeted fix will be surgical and focused on the actual problem point, not just symptom patching.

---

## Related Tasks

- **Task #10:** Class-granted starting feats display (COMPLETED)
- **Task #7:** Force Sensitivity dynamic skill eligibility (PENDING)
- **Task #8:** Summary rail generic labels → actual names (PENDING)
- **Task #9:** Background free languages in budget (PENDING)

