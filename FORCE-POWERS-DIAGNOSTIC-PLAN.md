# Force Powers Slot Calculation Mismatch — Diagnostic Test Plan

**Status:** CRITICAL BUG INVESTIGATION  
**Date:** 2026-05-18  
**Objective:** Identify root cause of slot count mismatch between header, footer, and detail rail

---

## Symptom Summary

Force Powers step displays inconsistent remaining slot counts:
- **Header:** Shows "1/1/0 remaining" (1 selected, 1 total, 0 remaining)
- **Footer:** Shows "0 selected remaining"
- **Detail rail:** Shows "No more selections available"
- **Cards:** Locked/unavailable

Expected behavior: All components should show identical remaining slot count derived from single calculation.

---

## Diagnostic Changes Deployed

Added comprehensive logging at three critical points:

1. **ForcePowerStep._computeTotalEntitlements()** (line ~590)
   - Logs entitlement summary, diagnostics, and entitlement reasons
   - Shows what the shell resolved for total/selected/remaining

2. **ForcePowerStep.getStepData()** (line ~178)
   - Logs all slot calculation values including pending selections
   - Shows selectedTrainingDisplay and remainingTrainingDisplay calculations

3. **ForcePowerStep.getRemainingPicks()** (line ~476)
   - Logs footer slot calculation
   - Shows totalSelected vs remainingPicks

4. **FeatGrantEntitlementResolver.resolve()** (line ~243)
   - Logs all feat entries detected (owned and pending)
   - Breaks down Force Training and Force Sensitivity feat detection
   - Shows final entitlements by type

5. **force-suite-resolution.resolveForcePowerEntitlements()** (line ~195)
   - Logs all entitlements from resolver
   - Shows Force Training slot calculation step-by-step

---

## Test Steps

### Setup
1. Open Foundry VTT
2. Open browser DevTools (F12) → Console tab
3. Keep console visible while running test

### Test Case: Class with Force Sensitivity + Force Training

1. **Create/open character in chargen with:**
   - Class: Jedi (or any Force Sensitivity source)
   - In Feats step: Select "Force Training" feat
   
2. **Progress to Force Powers step:**
   - Observe header display: should show total slots available
   - Open browser console and look for logs starting with `[ForcePowerStep]` or `[ForceSuiteResolution.ForcePower]`

3. **Capture Logs (watch for):**
   
   **From FeatGrantEntitlementResolver.resolve():**
   ```
   [FeatGrantEntitlementResolver.resolve] Force suite diagnostics
   - allEntries: [...] (should include "Force Training" feat)
   - forcePowerEntitlements: [...] (should show count calculated)
   - forceTrainingFeats: [...] (should show Force Training feat detected)
   ```

   **From force-suite-resolution:**
   ```
   [ForceSuiteResolution.ForcePower] All entitlements from resolver
   - should show forcePowerSlots entries with counts

   [ForceSuiteResolution.ForcePower] Force Training slot calculation
   - should show forceTrainingEntitlements with non-zero count
   ```

   **From ForcePowerStep._computeTotalEntitlements:**
   ```
   [ForcePowerStep._computeTotalEntitlements] Shell-aware:
   - total: (expected value)
   - selected: (how many already chosen)
   - remaining: (available for this session)
   - reasons: (breakdown of what granted them)
   ```

   **From ForcePowerStep.getStepData:**
   ```
   [ForcePowerStep.getStepData] Slot calculation
   - totalPowerTraining: (from entitlements)
   - selectedPowerTraining: (already committed)
   - remainingPicks: (available)
   - pendingSelectedTotal: (session selections)
   - selectedTrainingDisplay: (what header shows)
   - remainingTrainingDisplay: (what header shows for remaining)
   ```

4. **Try selecting a Force Power:**
   - Click on a power card
   - Check if it commits correctly
   - Verify header/footer/detail rail all update consistently
   - Watch console for getRemainingPicks log

### Test Case: Character with existing Force Powers

5. **Open character who already has Force Powers:**
   - Test that committed counts don't consume the chargen/level-up slot budget
   - Verify "(Committed)" vs "(Pending)" badges show correctly

---

## Expected Log Output Template

**Good Scenario (working correctly):**
```
[FeatGrantEntitlementResolver.resolve] Force suite diagnostics
  allEntries: [{ name: "Force Sensitivity" }, { name: "Force Training" }]
  forcePowerEntitlements: [
    { sourceName: "Force Sensitivity", sourceType: "pendingClassGrant", count: 1 },
    { sourceName: "Force Training", sourceType: "pendingFeat", count: 2 }  // 1 base + 1 WIS mod
  ]

[ForceSuiteResolution.ForcePower] Force Training slot calculation
  forceTrainingSlots: 2

[ForcePowerStep._computeTotalEntitlements] Shell-aware:
  total: 3  // 1 from Force Sensitivity + 2 from Force Training
  selected: 0
  remaining: 3
  reasons: ["Force Sensitive grants +1 Force Power training", "Force Training entitlement slots: 2"]

[ForcePowerStep.getStepData] Slot calculation
  totalPowerTraining: 3
  selectedPowerTraining: 0
  remainingPicks: 3
  pendingSelectedTotal: 0
  selectedTrainingDisplay: 0
  remainingTrainingDisplay: 3
```

**Bad Scenario (bug manifests):**
```
[FeatGrantEntitlementResolver.resolve] Force suite diagnostics
  allEntries: [{ name: "Force Sensitivity" }]  // ❌ Force Training missing!
  forcePowerEntitlements: []  // ❌ No Force Training detected

[ForceSuiteResolution.ForcePower] Force Training slot calculation
  forceTrainingSlots: 0  // ❌ Zero slots

[ForcePowerStep._computeTotalEntitlements] Shell-aware:
  total: 1  // ❌ Should be 3
  selected: 0
  remaining: 1
  reasons: ["Force Sensitive grants +1 Force Power training"]  // ❌ Missing Force Training
```

---

## Debugging Checklist

**If Force Training is not detected:**
- [ ] Check if feat is actually selected in Feats step
- [ ] Verify feat name matches exactly (case-insensitive after normalization)
- [ ] Check if getPendingFeatEntries() is pulling from correct shell reference
- [ ] Verify shell.buildIntent.getSelection('feats') returns the feat

**If force-suite-resolution gets empty feats list:**
- [ ] Check if shell is being passed correctly to resolveForcePowerEntitlements
- [ ] Verify FeatGrantEntitlementResolver.resolve() is called with { shell, includePending: true }
- [ ] Check class grant ledger building (selectedClassGrantsForceSensitivity should work)

**If entitlements are calculated but slots still show wrong:**
- [ ] Verify this._remainingPicks is set from result.remaining
- [ ] Check if pendingSelectedTotal is calculated correctly
- [ ] Verify template is using correct variable (remainingPicks vs selectionBudget)

---

## Files Instrumented

| File | Diagnostic Points | Purpose |
|------|------------------|---------|
| force-power-step.js | 2 | Entry point; entitlement calculation; getStepData calculation; footer calculation |
| force-suite-resolution.js | 2 | Entitlement resolution; Force Training slot aggregation |
| feat-grant-entitlement-resolver.js | 1 | Feat entry detection; entitlement resolution |

---

## Next Steps After Diagnostics

Once logs are captured:

1. **Identify the actual mismatch point:**
   - Is Force Training feat not detected? → Investigate feat selection integration
   - Is force-suite-resolution getting empty results? → Check shell/feat resolution
   - Is entitlements calculated wrong? → Check ability modifier or class grant logic
   - Is getStepData display wrong despite correct calculation? → Check template

2. **Implement targeted fix** at the root cause (not symptom)

3. **Re-run test** with diagnostics to verify fix works

4. **Remove diagnostic logging** and finalize

---

## Notes

- Console logs use both `swseLogger.debug()` and `console.log()` for visibility
- Logs may appear in different order depending on async/await timing
- Look for the most recent [ForcePowerStep] logs to avoid stale data from previous test runs
- If character is in chargen, Force Sensitivity comes from class grant (Jedi), not feat item

