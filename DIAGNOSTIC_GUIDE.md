# SWSE Tab Diagnostics & AppV2 Auditor Guide

## Overview

This document explains the new diagnostic and monitoring tools created to debug and prevent ApplicationV2 lifecycle regressions in the SWSE system.

## What Was Created

### 1. **SentinelTabDiagnostics** (`tab-diagnostics.js`)

Deep diagnostic module that identifies root causes of tab system failures.

#### Capabilities

- **Structural Audit**: Verifies tab panels exist in DOM with correct attributes
- **Visibility Audit**: Detects hidden/zero-dimension panels
- **CSS Rule Audit**: Identifies which CSS rules affect tab panels and finds suspicious rules
- **Attribute Audit**: Verifies data-tab-group and data-tab attributes are present and correct
- **Binding Audit**: Tests if ApplicationV2's changeTab() can find and access panels
- **Health Check**: Returns true/false for overall tab system health

#### Public API

```javascript
// Get complete diagnostic report
const report = SentinelTabDiagnostics.diagnose(rootElement);

// Quick health check
const isHealthy = SentinelTabDiagnostics.isHealthy(rootElement);
```

#### Report Structure

```javascript
{
  timestamp: "2026-03-04T...",
  rootElement: "className",
  diagnostics: {
    structure: { panelCount, panels, groups },
    visibility: { invisiblePanels, zeroDimensionPanels, details },
    cssRules: { rulesAffectingPanels, stylesheetSources, suspiciousRules },
    attributes: { panelAttributes, buttonAttributes },
    binding: { groups, errors }
  },
  summary: {
    severityLevel: "OK|WARNING|ERROR|CRITICAL",
    issues: [...],
    recommendations: [...]
  }
}
```

#### Severity Levels

- **OK**: Tab system is functional
- **WARNING**: Issues detected but not blocking (e.g., suspicious CSS rules)
- **ERROR**: Tab system is broken (zero-dimension panels, binding failures)
- **CRITICAL**: No tab panels found at all

### 2. **SentinelAppV2Auditor** (`appv2-auditor.js`)

Runtime enforcement of ApplicationV2 contract compliance. Monitors and validates lifecycle execution.

#### Capabilities

- **Lifecycle Tracking**: Monitors _prepareContext → _onRender → close sequence
- **Contract Validation**: Ensures render contract requirements are met
- **Violation Detection**: Records violations with severity and context
- **Performance Metrics**: Measures timing of lifecycle phases
- **Strict Mode**: Can enforce strict contract compliance or warn softly

#### Public API

```javascript
// Install audit on an application instance
const audit = SentinelAppV2Auditor.installAudit(app, {
  strictMode: true,
  trackMutations: true
});

// Get audit record
const audit = SentinelAppV2Auditor.getAudit(app);

// Generate complete report
const report = SentinelAppV2Auditor.generateReport();

// Check if all audited apps are compliant
const isHealthy = SentinelAppV2Auditor.isHealthy();

// Clear all audits
SentinelAppV2Auditor.clear();
```

#### Violations Tracked

| Type | Description |
|------|-------------|
| `PREPARE_CONTEXT_ERROR` | _prepareContext() threw an error |
| `RENDER_BEFORE_PREPARE` | _onRender() called before _prepareContext completed |
| `ELEMENT_NOT_VALID` | this.element is not an HTMLElement after render |
| `ELEMENT_EMPTY` | Element has no innerHTML after render |
| `RENDER_ERROR` | _onRender() threw an error |
| `CLOSE_ERROR` | close() threw an error |

## Integration Points

### Automatic Integration

Both modules are automatically:
1. **Imported** in `sentinel-auditors.js`
2. **Exported** as part of Sentinel API
3. **Initialized** during system boot via `initializeSentinelAuditors()`
4. **Made global** at `globalThis.SentinelTabDiagnostics` and `globalThis.SentinelAppV2Auditor`

### Manual Integration

For sheet classes, add diagnostics to _onRender():

```javascript
async _onRender(context, options) {
  await super._onRender(context, options);

  if (this.element instanceof HTMLElement) {
    // Minimal test sheet includes this automatically
    SentinelTabDiagnostics.diagnose(this.element);
  }
}
```

For app classes, install audit during construction:

```javascript
constructor(options) {
  super(options);
  SentinelAppV2Auditor.installAudit(this);
}
```

## Console Commands

From browser console (F12):

```javascript
// Run tab diagnostics on minimal test sheet
SentinelTabDiagnostics.diagnose(document.querySelector('.swse-sheet'))

// Check tab health
SentinelTabDiagnostics.isHealthy(document.querySelector('.swse-sheet'))

// Get AppV2 audit report
SentinelAppV2Auditor.generateReport()

// Check if all apps are compliant
SentinelAppV2Auditor.isHealthy()
```

## How To Use for Debugging

### Scenario: Tabs not responding

1. **Open the minimal test sheet** (created as part of this fix)
2. **Open browser console** (F12)
3. **Run diagnostics**:
   ```javascript
   const el = document.querySelector('[data-application-part="swse-minimal-test-sheet"]');
   const report = SentinelTabDiagnostics.diagnose(el);
   ```
4. **Check summary.severityLevel** - reveals if issue is structure, visibility, CSS, or binding
5. **Review diagnostics.cssRules.suspiciousRules** - shows which CSS rules are breaking tabs
6. **Review diagnostics.binding** - shows if Foundry's changeTab() can find panels

### Interpreting Results

| Finding | Meaning | Action |
|---------|---------|--------|
| Panel count = 0 | Template has wrong structure | Check template attributes |
| Zero-dimension panels | CSS is collapsing elements | Audit CSS for height: 0, max-height: 0 |
| Invisible panels | CSS hiding elements | Check for display: none, visibility: hidden, opacity: 0 |
| Suspicious CSS rules | CSS possibly breaking tabs | Review rules in suspiciousRules array |
| Binding failures | querySelector can't find panels | Check selector match results in binding.groups |

## Example Report Output

```javascript
{
  summary: {
    severityLevel: "ERROR",
    issues: [
      "2 panels have zero dimensions",
      "Tab group 'primary' has binding failures"
    ],
    recommendations: [
      "Audit CSS for display: none, max-height: 0, or overflow: hidden",
      "Tab 'two': querySelector('[data-tab-group=\"primary\"][data-tab=\"two\"]') fails"
    ]
  },
  diagnostics: {
    structure: {
      panelCount: 2,
      groups: ["primary"]
    },
    visibility: {
      zeroDimensionPanels: [
        {
          key: "primary:overview",
          width: 0,
          height: 0,
          reason: "getBoundingClientRect returns zero size"
        }
      ],
      invisiblePanels: []
    },
    cssRules: {
      suspiciousRules: [
        {
          selector: "[data-tab]",
          stylesheet: "swse-core.css",
          issues: ["max-height: 0 (collapses)"]
        }
      ]
    },
    binding: {
      groups: {
        primary: {
          bindingStatus: "failed",
          errors: [
            {
              tabName: "two",
              selector: "[data-tab-group=\"primary\"][data-tab=\"two\"]",
              reason: "querySelector returned null"
            }
          ]
        }
      }
    }
  }
}
```

## Files Modified/Created

### Created
- `scripts/governance/sentinel/tab-diagnostics.js` - Tab system diagnostics
- `scripts/governance/sentinel/appv2-auditor.js` - AppV2 contract enforcement
- `scripts/sheets/v2/minimal-test-sheet.js` - Minimal test sheet with diagnostics

### Modified
- `scripts/governance/sentinel/sentinel-auditors.js` - Added exports and initialization
- `templates/actors/character/v2/minimal-test-sheet.hbs` - Tab structure template

## Key Insights

### Root Cause Detection

The diagnostic modules can identify:

1. **CSS Culprit**: Which stylesheet and rule is hiding/collapsing tab panels
2. **Attribute Issues**: Missing or incorrect data-tab-group/data-tab attributes
3. **Binding Failures**: When querySelector() can't find panels (indicates CSS hiding them)
4. **Lifecycle Issues**: When _onRender() or _prepareContext() fail to execute properly

### Why This Matters

Previous approach: Guess about template structure, change attributes, test, repeat.

New approach: Run diagnostics once, get exact root cause, fix precisely.

## Roadmap

### Phase 1 (Complete)
- ✅ Create SentinelTabDiagnostics with 5-phase audit
- ✅ Create SentinelAppV2Auditor for lifecycle enforcement
- ✅ Integrate into Sentinel system
- ✅ Auto-run on minimal test sheet

### Phase 2 (Pending)
- Deploy diagnostics across all sheet types
- Audit 4+ sheet classes for missing super._onRender() calls
- Audit 6+ app classes for same issue
- Apply AppV2Auditor to detect and prevent regressions

### Phase 3 (Pending)
- Create CSS fix audit to identify emergency/broken CSS
- Deploy CSS auditor to find conflicting rules
- Surgically fix CSS without breaking Sentinel

## Contact & Debugging Support

If tab diagnostics report issues:

1. **Save the report**: `JSON.stringify(report, null, 2)` → copy to file
2. **Review summary.issues** - states what's broken
3. **Review summary.recommendations** - states what to fix
4. **Check diagnostics.cssRules.suspiciousRules** - shows exact CSS rules causing issues
5. **Verify attributes** in diagnostics.attributes - ensures structure is correct

---

**Last Updated**: 2026-03-04
**Version**: 1.0
**Status**: Production Ready
