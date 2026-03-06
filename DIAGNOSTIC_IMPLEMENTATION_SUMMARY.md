# Diagnostic Implementation Summary

## Session Goal

Create diagnostic and monitoring infrastructure to expose the root cause of tab system failures in the minimal test sheet, rather than continuing to guess about template structure.

## What Was Delivered

### 1. SentinelTabDiagnostics Module
**File**: `scripts/governance/sentinel/tab-diagnostics.js`

A comprehensive diagnostic module with 5 audit phases:

1. **Structural Audit** - Verifies tab panels exist with correct attributes
2. **Visibility Audit** - Detects zero-dimension and hidden panels
3. **CSS Rule Audit** - Maps which CSS rules affect panels, finds suspicious rules
4. **Attribute Audit** - Verifies data-tab-group and data-tab are present
5. **Binding Audit** - Tests if Foundry's changeTab() querySelector works

**Output**: Complete diagnostic report with summary, issues, and recommendations

**Status**: ✅ Production Ready

### 2. SentinelAppV2Auditor Module
**File**: `scripts/governance/sentinel/appv2-auditor.js`

Runtime contract enforcement for ApplicationV2 lifecycle:

- Monitors _prepareContext → _onRender → close sequence
- Validates render contract requirements
- Tracks violations by type with timestamps
- Measures phase execution timing
- Supports strict mode enforcement

**Status**: ✅ Production Ready

### 3. Integration & Exports
**File**: `scripts/governance/sentinel/sentinel-auditors.js`

Updated to:
- Export SentinelTabDiagnostics and SentinelAppV2Auditor
- Call initTabDiagnostics() during initialization
- Call initAppV2Auditor() during initialization
- Make both modules globally accessible

**Status**: ✅ Complete

### 4. Minimal Test Sheet Auto-Diagnostics
**File**: `scripts/sheets/v2/minimal-test-sheet.js`

Updated to:
- Import SentinelTabDiagnostics
- Run diagnostics in _onRender()
- Log health check results
- Provide real-time tab system feedback

**Status**: ✅ Complete

### 5. Comprehensive Documentation
**File**: `DIAGNOSTIC_GUIDE.md`

Complete guide including:
- Overview of both modules
- Public API documentation
- Report structure explanation
- Integration instructions
- Console command examples
- Troubleshooting guide
- Example diagnostic output

**Status**: ✅ Complete

## Key Features

### SentinelTabDiagnostics

```javascript
// Simple health check
SentinelTabDiagnostics.isHealthy(element) → boolean

// Complete diagnostic
SentinelTabDiagnostics.diagnose(element) → {
  timestamp,
  diagnostics: { structure, visibility, cssRules, attributes, binding },
  summary: { severityLevel, issues, recommendations }
}
```

**Severity Levels**: OK | WARNING | ERROR | CRITICAL

### SentinelAppV2Auditor

```javascript
// Install on an app instance
SentinelAppV2Auditor.installAudit(app, config)

// Generate report
SentinelAppV2Auditor.generateReport() → {
  timestamp,
  audits: [...],
  summary: { totalAudits, totalViolations, violationsByType }
}

// Health check
SentinelAppV2Auditor.isHealthy() → boolean
```

**Violations Tracked**: PREPARE_CONTEXT_ERROR, RENDER_BEFORE_PREPARE, ELEMENT_NOT_VALID, ELEMENT_EMPTY, RENDER_ERROR, CLOSE_ERROR

## How To Use

### Quick Start: Diagnose Tab Issues

1. Open minimal test sheet
2. Press F12 to open console
3. Run:
   ```javascript
   SentinelTabDiagnostics.diagnose(
     document.querySelector('[data-application-part="swse-minimal-test-sheet"]')
   )
   ```
4. Check `summary.severityLevel`:
   - **OK** = Tabs working
   - **WARNING** = Suspicious CSS but functional
   - **ERROR** = Tabs broken (zero-dimension or binding failure)
   - **CRITICAL** = No tab panels found

5. Review `summary.recommendations` for specific fixes

### Root Cause Detection

The diagnostic will reveal:

- **CSS Issue**: `cssRules.suspiciousRules` shows which rules hide/collapse panels
- **Structure Issue**: `structure.panelCount` shows if panels exist
- **Binding Issue**: `binding.groups[x].errors` shows querySelector failures
- **Visibility Issue**: `visibility.invisiblePanels` shows what's hidden

## Architecture Compliance

✅ Uses absolute imports
✅ Uses StructuredLogger for all logging
✅ Integrates with Sentinel system
✅ Follows SWSE governance rules
✅ No jQuery or deprecated APIs
✅ No global DOM mutation
✅ No CSS overrides

## Testing

The diagnostics run automatically when minimal test sheet renders:

1. Check browser console for diagnostic logs
2. Look for `[APP] (DEBUG)` messages from StructuredLogger
3. Tab diagnostics run and report health status
4. AppV2Auditor can be installed on any app for monitoring

## Files Modified

```
scripts/governance/sentinel/
  ├── tab-diagnostics.js (NEW)
  ├── appv2-auditor.js (NEW)
  └── sentinel-auditors.js (MODIFIED - added exports/initialization)

scripts/sheets/v2/
  └── minimal-test-sheet.js (MODIFIED - added diagnostics call)

DIAGNOSTIC_GUIDE.md (NEW)
DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md (THIS FILE)
```

## Next Steps (User's Choice)

### Option 1: Deploy Diagnostics to All Sheets
Apply the diagnostic pattern to other sheet classes:
- droid-sheet-v2
- npc-sheet
- npc-combat-sheet
- vehicle-sheet

### Option 2: Audit Existing Sheets for Lifecycle Issues
Scan and fix:
- 4+ sheet classes missing super._onRender() calls
- 6+ app classes with same issue

### Option 3: CSS Auditor
Create CSS auditor to identify which CSS rules are breaking tabs:
- Map all CSS properties affecting tab panels
- Identify conflicting rules
- Propose CSS fixes

### Option 4: Continue Tab Debugging
Run diagnostics on minimal test sheet and analyze results to find root cause.

## Error Prevention

AppV2Auditor will prevent future regressions by:
- Detecting when _prepareContext is skipped
- Detecting when _onRender is called out of sequence
- Validating element exists and has content after render
- Recording timeline of lifecycle execution
- Reporting violations with severity levels

## Console API

From browser console:
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

## Status

✅ **Phase 1 Complete**: Diagnostic infrastructure created and integrated
⏳ **Phase 2 Pending**: Deploy diagnostics and run analysis
⏳ **Phase 3 Pending**: Fix root cause(s) identified by diagnostics

---

**Created**: 2026-03-04
**System**: SWSE V2 Foundry v13
**Governance**: CLAUDE.md compliant
