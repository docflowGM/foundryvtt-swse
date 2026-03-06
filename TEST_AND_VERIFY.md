# Immediate Test & Verification Guide

**Status**: All fixes applied ✅
**Next Action**: Test the fixes

## What You Need to Do Right Now

### Step 1: Reload Foundry ⟳
```
1. In browser: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. Or restart Foundry server
```

This ensures:
- ✅ New templates loaded
- ✅ No cached old markup
- ✅ All fixes active

### Step 2: Test Minimal Sheet (Quickest Test)
```
1. Create a new test character OR open existing
2. Right-click sheet → Change Sheet Type
3. Select: "SWSE Minimal Test Sheet"
4. Click "Overview" tab → Should show content
5. Click "Tab Two" → Should show different content
6. Click back to "Overview" → Should switch back
```

**Expected**: Tabs switch immediately with no errors

**If it works**: ✅ Tab system fixed!

**If it doesn't work**: ❌ See troubleshooting below

### Step 3: Test Main Character Sheet
```
1. Open any character with main character sheet
2. Click: Overview → Combat → Skills → Talents
3. Click: Gear → Relationships → Notes
4. Click other tabs if Force/Resources enabled
```

**Expected**: All tabs switch without errors

### Step 4: Verify with Diagnostics (Scientific Proof)
```javascript
// Open console (F12)
// Paste this:

const sheet = document.querySelector('.swse-sheet');
const report = SentinelTabDiagnostics.diagnose(sheet);

// Check severity
console.log('🎯 SEVERITY:', report.summary.severityLevel);

// Check panels found
console.log('📊 Panels found:', report.diagnostics.structure.panelCount);

// Show issues if any
if (report.summary.issues.length > 0) {
  console.log('⚠️ ISSUES:', report.summary.issues);
} else {
  console.log('✅ NO ISSUES FOUND');
}
```

**Expected Output**:
```
🎯 SEVERITY: OK
📊 Panels found: 8 (or however many tabs)
✅ NO ISSUES FOUND
```

## Quick Verification Checklist

- [ ] Hard refresh/reload browser
- [ ] Test minimal sheet tabs work
- [ ] Test character sheet tabs work
- [ ] Run diagnostics, see "OK" severity
- [ ] Diagnostics show all panels found

## If Tabs Still Don't Work

### Check 1: Were the files actually updated?
```bash
# In terminal, check the character sheet was fixed:
grep "data-action=" templates/actors/character/v2/character-sheet.hbs | head -3
```

**Expected**: Should show lines with `data-action="tab"`

### Check 2: Is the sheet actually rendering?
```javascript
// In console:
document.querySelector('.swse-sheet') // Should return element
document.querySelector('[data-tab-group="primary"]') // Should return element
```

**Expected**: Both return HTML elements, not null

### Check 3: Are the panels visible?
```javascript
// In console:
document.querySelectorAll('[data-tab-group="primary"][data-tab]').length
```

**Expected**: Should be > 0 (8 for character sheet, 2 for minimal sheet)

### Check 4: Run full diagnostics
```javascript
const sheet = document.querySelector('.swse-sheet');
const full = SentinelTabDiagnostics.diagnose(sheet);
console.log(JSON.stringify(full, null, 2));
```

Review the complete report for:
- Structure issues (panels missing)
- Visibility issues (panels hidden)
- CSS issues (conflicting rules)
- Binding issues (querySelector failures)

## Files That Were Fixed

These files were modified and should now have correct V13 markup:

✅ `templates/actors/character/v2/character-sheet.hbs`
✅ `templates/actors/droid/v2/droid-sheet.hbs`
✅ `templates/actors/npc/v2/npc-sheet.hbs`
✅ `templates/actors/vehicle/v2/vehicle-sheet.hbs`
✅ `templates/actors/character/v2/minimal-test-sheet.hbs`

Changes made:
- Changed `data-group="primary"` → `data-tab-group="primary"` (everywhere)
- Added `data-action="tab"` to all tab buttons
- No other changes

## Success Criteria

| Criteria | Status |
|----------|--------|
| Minimal sheet tabs work | ✅ Should work |
| Character sheet tabs work | ✅ Should work |
| Diagnostics show OK | ✅ Should show OK |
| No console errors on tab click | ✅ Should have none |
| All tab content shows | ✅ Should display |

## Why These Tests Matter

1. **Minimal Sheet Test**: Proves the fix works in its simplest form
2. **Character Sheet Test**: Proves the fix works with 8+ tabs
3. **Diagnostics Test**: Proves the DOM structure is correct
4. **Full Diagnostics**: Reveals any remaining issues precisely

## If All Tests Pass

Congratulations! The tab system is now fixed. Next steps:

1. Test other sheet types (droid, NPC, vehicle)
2. Run full suite diagnostics on all sheets
3. Deploy to production with confidence

## If Some Tests Fail

The diagnostics will show exactly what's wrong:
- Missing panels → check template
- Hidden panels → check CSS
- Binding failures → check attributes

## Support Commands

```javascript
// Quick health
SentinelTabDiagnostics.isHealthy(document.querySelector('.swse-sheet'))

// Full report
SentinelTabDiagnostics.diagnose(document.querySelector('.swse-sheet'))

// Check rendered HTML
document.querySelector('[data-tab-group="primary"][data-tab="overview"]')

// Count all panels
document.querySelectorAll('[data-tab-group="primary"][data-tab]').length

// Save report to file
const report = SentinelTabDiagnostics.diagnose(...);
copy(JSON.stringify(report, null, 2))
```

## Timeline

| Step | Time | Status |
|------|------|--------|
| Reload browser | < 1 min | Do this first |
| Test minimal sheet | 1 min | Should work immediately |
| Test character sheet | 2 min | Should work immediately |
| Run diagnostics | 1 min | Should show OK |
| Total | ~5 min | Quick validation |

## Expected Outcome

✅ All tabs working
✅ No console errors
✅ Diagnostics report "OK"
✅ System stable and ready

---

**You're here**: Fixes applied, time to test
**Next**: Run the tests above
**Then**: Report results

Let's verify this works! 🚀
