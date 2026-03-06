# SWSE Diagnostic Quick Reference

## What Just Happened

Created two diagnostic modules to identify why tab system is broken despite correct DOM structure:

1. **SentinelTabDiagnostics** - Audits tab system in 5 phases
2. **SentinelAppV2Auditor** - Enforces ApplicationV2 contract compliance

## Run Diagnostics (Copy & Paste)

### In Browser Console (F12):

```javascript
// Get the minimal test sheet element
const sheet = document.querySelector('.swse-sheet');

// Run complete diagnostics
const report = SentinelTabDiagnostics.diagnose(sheet);

// Check result
console.log(report.summary.severityLevel);
console.log(report.summary.issues);
console.log(report.summary.recommendations);
```

## Interpret Results

| Level | Meaning | Action |
|-------|---------|--------|
| OK | Tabs working | Done! |
| WARNING | Suspicious CSS | Review suspiciousRules |
| ERROR | Tabs broken | Fix CSS identified |
| CRITICAL | No panels | Check template |

## If Severity = ERROR or CRITICAL

### Check CSS Rules:
```javascript
report.diagnostics.cssRules.suspiciousRules
```

This shows **exactly which CSS rules are hiding your tab panels**.

### Check Binding:
```javascript
report.diagnostics.binding.groups
```

This shows if Foundry's querySelector can find panels.

### Check Visibility:
```javascript
report.diagnostics.visibility.zeroDimensionPanels
report.diagnostics.visibility.invisiblePanels
```

This shows panels with zero dimensions or hidden by CSS.

## Files Created

```
scripts/governance/sentinel/tab-diagnostics.js       (NEW)
scripts/governance/sentinel/appv2-auditor.js         (NEW)
scripts/sheets/v2/minimal-test-sheet.js             (MODIFIED)
scripts/governance/sentinel/sentinel-auditors.js     (MODIFIED)

DIAGNOSTIC_GUIDE.md                                  (NEW - Full documentation)
DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md                 (NEW - Overview)
SYSTEM_STATE_REPORT.md                              (NEW - Current status)
QUICK_REFERENCE.md                                  (THIS FILE)
```

## Key APIs

### Tab Diagnostics

```javascript
// Health check
SentinelTabDiagnostics.isHealthy(element)  // → true/false

// Full diagnostic
SentinelTabDiagnostics.diagnose(element)   // → complete report
```

### AppV2 Auditor

```javascript
// Install on app
SentinelAppV2Auditor.installAudit(app)

// Check compliance
SentinelAppV2Auditor.isHealthy()           // → true/false

// Get report
SentinelAppV2Auditor.generateReport()      // → audit report
```

## Report Structure

```javascript
{
  summary: {
    severityLevel: "OK|WARNING|ERROR|CRITICAL",
    issues: [...],                          // What's wrong
    recommendations: [...]                  // How to fix it
  },
  diagnostics: {
    structure: { panelCount, panels, groups },
    visibility: { zeroDimensionPanels, invisiblePanels, details },
    cssRules: { rulesAffectingPanels, suspiciousRules },
    attributes: { panelAttributes, buttonAttributes },
    binding: { groups, errors }
  }
}
```

## What Was Fixed

✅ SWSEApplicationV2._onRender() missing super call
✅ BaseSWSEAppV2 element property override breaking internals
✅ tag: 'div' forcing wrong root element type
✅ CSS constraints (height:100%, overflow:hidden) on .swse-sheet
✅ Tab panel structure and attributes

## What's Still Broken

❌ Tab click handling not working
❌ Tab panels not showing/hiding
❌ Foundry's changeTab() not finding panels (likely CSS culprit)

## Next Steps

1. Run diagnostics (copy/paste command above)
2. Check severity level and recommendations
3. Review suspicious CSS rules
4. Document findings
5. Apply surgical CSS fixes

## Common Issues & Fixes

### Zero-Dimension Panels
```javascript
// Check this
report.diagnostics.visibility.zeroDimensionPanels

// Usually caused by CSS like:
// max-height: 0
// height: 0
// overflow: hidden
```

### Hidden Panels
```javascript
// Check this
report.diagnostics.visibility.invisiblePanels

// Usually caused by CSS like:
// display: none
// visibility: hidden
// opacity: 0
```

### Binding Failures
```javascript
// Check this
report.diagnostics.binding.groups[groupName].errors

// Means querySelector("[data-tab-group='X'][data-tab='Y']") returns null
// Usually caused by CSS hiding the element
```

## Console API

```javascript
// Tab diagnostics
SentinelTabDiagnostics.diagnose(el)
SentinelTabDiagnostics.isHealthy(el)

// AppV2 auditing
SentinelAppV2Auditor.generateReport()
SentinelAppV2Auditor.isHealthy()
SentinelAppV2Auditor.getAudit(app)

// Sentinel reporting
window._SWSE_Sentinel.report.export()
```

## Remember

- **Don't guess** - Run diagnostics
- **Trust the report** - It will identify root cause
- **Review suspicious rules** - CSS is likely culprit
- **Fix surgically** - Only change what diagnostics identify

---

**Tip**: Save the diagnostic report to a file for reference:
```javascript
const report = SentinelTabDiagnostics.diagnose(sheet);
copy(JSON.stringify(report, null, 2));
```

Then paste into text editor and save.

**Help**: For detailed info, see `DIAGNOSTIC_GUIDE.md`
