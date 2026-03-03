# Sentinel Comprehensive Reporting Guide

## Overview

The Sentinel Reporter generates detailed audit reports covering all aspects of the SWSE system's health and integrity. Reports include CSS audits, migration validation, performance metrics, and all detected issues.

## Quick Start

### From Browser Console

Generate and save a report in one command:

```javascript
// Save report with auto-generated timestamp
SWSE.debug.reporting.saveAsLog()

// Save report with custom filename
SWSE.debug.reporting.saveAsLog('my-custom-audit')
```

### Viewing Reports

**Print to console:**
```javascript
SWSE.debug.reporting.printReport()
```

**Get as string (for processing):**
```javascript
const report = SWSE.debug.reporting.getFullReport()
console.log(report)
```

---

## Report Sections

### 1. System Status
- Overall Sentinel status (HEALTHY/DEGRADED/CRITICAL)
- Health classification
- System uptime since boot
- Foundry and SWSE versions

### 2. Health State
- Overall health assessment
- Count of warnings and errors
- Detailed list of all warnings detected
- Detailed list of all errors detected

### 3. Performance Metrics
- Number of render cycles tracked
- Average render time
- Peak (maximum) render time
- Total number of events processed

### 4. CSS Health Audit
- CSS health status (HEALTHY/ISSUES DETECTED)
- Total CSS rules checked
- Issues found with:
  - Issue type (overflow, zero-size, stacking context, etc.)
  - Description of the issue
  - Selector where issue was found

### 5. Migration & Integrity Report
- Migration validity status
- List of any migration errors
- Summary of integrity findings

### 6. Detailed Findings by Layer
Complete list of all issues detected, grouped by:
- **Layer** (enforcement, css, migration, etc.)
- **Severity** (CRITICAL, ERROR, WARNING, INFO)
- Includes context and timestamps for each issue

---

## Alternative API Access

### Through Enforcement API

```javascript
// Get report
_SWSE_Enforcement.report.getFullReport()

// Print to console
_SWSE_Enforcement.report.printReport()

// Save as file
_SWSE_Enforcement.report.saveAsLog('custom-name')
```

---

## Report Output Format

Reports are formatted as plain-text .log files with:
- ISO 8601 timestamps
- Hierarchical section organization
- Box-drawing characters for visual structure
- Summary statistics

Example filename when saved: `swse-sentinel-audit-1709548234567.log`

---

## When to Generate Reports

- **After initial system load** - Verify no boot-time issues
- **After major code changes** - Confirm no regressions introduced
- **When diagnosing issues** - Capture full system state for analysis
- **For documentation** - Create audit trail of system health over time

---

## Troubleshooting

### "Cannot read properties of undefined"
This indicates Sentinel hasn't fully initialized yet. Wait a moment and try again after the game has fully loaded.

### Empty "Detailed Findings" section
This is normal and means no issues were detected! ✓

### Missing sections in report
Some sections may be unavailable depending on system state. The reporter gracefully handles missing data and reports it as "unavailable".

---

## Implementation Details

- **Location**: `/scripts/governance/sentinel/sentinel-reporter.js`
- **Export**: Exposed via `SWSE.debug.reporting` and `_SWSE_Enforcement.report`
- **Error Handling**: All sections wrapped in try-catch to prevent report generation failures
- **Format**: Plain-text UTF-8 .log files

---

## Console Shortcuts

For quick access, you can create aliases:

```javascript
// Save commonly used reports
const saveAudit = () => SWSE.debug.reporting.saveAsLog()
const viewAudit = () => SWSE.debug.reporting.printReport()
const getAudit = () => SWSE.debug.reporting.getFullReport()
```

Then use:
```javascript
saveAudit()    // Save report
viewAudit()    // View in console
getAudit()     // Get as string
```
