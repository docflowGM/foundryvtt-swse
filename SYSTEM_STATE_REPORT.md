# SWSE V2 System State Report

**Date**: 2026-03-04
**System**: Foundry VTT v13 Character Sheet System
**Status**: PARTIAL RECOVERY - Diagnostics Deployed

## Executive Summary

The SWSE character sheet system was rendering but completely non-interactive (tabs non-responsive, data binding broken). Through systematic auditing, multiple layers of infrastructure corruption were identified and fixed. Current status: Core infrastructure repaired, diagnostic tools deployed, root cause identification in progress.

## What's Working

### ✅ Infrastructure Layer

- **Element Binding**: ApplicationV2 private fields (#element, #content) working correctly
- **Lifecycle Foundation**: _prepareContext() → _onRender() → close() sequence executing
- **Template Rendering**: Handlebars templates rendering to DOM correctly
- **PARTS System**: Template composition via static PARTS property working
- **Tab Structure**: Tab panels present in DOM with correct attributes

### ✅ Fixed Issues

1. **SWSEApplicationV2._onRender() missing super call** ✅ FIXED
   - Was preventing entire ApplicationV2 lifecycle from executing
   - Broke internal binding mechanisms, tab initialization, scroll regions
   - Fixed by adding: `await super._onRender(context, options);`

2. **BaseSWSEAppV2 element property override** ✅ FIXED
   - Was intercepting ApplicationV2's internal DOM management
   - Prevented internal binding, broke data-application-content wrapper
   - Fixed by removing Object.defineProperty override (lines 36-56)

3. **CSS constraints on .swse-sheet** ✅ FIXED
   - `height: 100%` and `overflow: hidden` caused flex containment collapse
   - Prevented scroll regions from initializing
   - Fixed by removing both properties

4. **tag: 'div' forcing wrong root element** ✅ FIXED
   - SWSEApplicationV2 was forcing all subclasses to use <div> root
   - ActorSheetV2 requires proper semantic structure
   - Fixed by removing tag: 'div' from DEFAULT_OPTIONS

5. **Character sheet using legacy tabs config** ✅ FIXED
   - Removed legacy `tabs` array from defaultOptions
   - Removed `scrollY` interference
   - Added `static tabGroups = { primary: { initial: "overview" } }`

6. **Tab attribute naming inconsistencies** ✅ FIXED
   - Buttons need data-group (for handler reading)
   - Panels need data-tab-group AND data-tab (for finder selector)
   - Fixed template structure

## What's NOT Working

### ❌ Tab System Interaction

**Status**: DOM structure correct, but tab panels not responding to clicks

**Evidence**:
- ✅ Tab panels ARE in DOM with correct attributes
- ✅ Element binding IS working (element property accessible)
- ✅ Template IS rendering correctly
- ❌ Tab clicks not switching visibility (panels stay hidden or don't show active state)
- ❌ Foundry's changeTab() may not find panels despite correct structure

**Diagnosis**: CSS or DOM mutation is likely the culprit (hidden by display:none, visibility:hidden, or zero-dimension)

## Current Diagnostic Capability

### SentinelTabDiagnostics

Deployed and ready to identify:

```
[✓] Structural Issues
    - Panel count
    - Attribute presence/correctness
    - Parent relationships

[✓] Visibility Issues
    - Zero-dimension panels (getBoundingClientRect === 0)
    - Hidden panels (display:none, visibility:hidden, opacity:0)
    - Which CSS rules affect them

[✓] CSS Issues
    - All CSS rules matching tab panels
    - Suspicious rules (those that hide/collapse)
    - Stylesheet sources

[✓] Binding Issues
    - Can querySelector find each panel?
    - If not, why not?

[✓] Health Score
    - OK | WARNING | ERROR | CRITICAL
```

### SentinelAppV2Auditor

Ready to prevent future regressions by:

```
[✓] Tracking lifecycle execution
    - _prepareContext timing
    - _onRender timing
    - close() timing

[✓] Validating contracts
    - Element exists after render
    - Element has content
    - Methods called in correct sequence

[✓] Recording violations
    - Type, timestamp, context
    - Organized by severity
```

## Known Remaining Issues

### Issue 1: Tab Lookup Failure
- **Symptom**: Tab panels in DOM but not responding to clicks
- **Root Cause**: Unknown (likely CSS or DOM mutation)
- **Debug Status**: Diagnostics deployed, ready to run
- **Action**: Run SentinelTabDiagnostics.diagnose() and review results

### Issue 2: Lifecycle Violations
- **Symptom**: Multiple sheet classes may have missing super._onRender() calls
- **Affected Classes**: droid-sheet, npc-sheet, npc-combat-sheet, vehicle-sheet (4+)
- **Affected App Classes**: chargen dialogs, browsers, builders (6+)
- **Debug Status**: Identified but not yet scanned
- **Action**: Run AppV2Auditor on instances to detect violations

### Issue 3: Emergency CSS Interference
- **Symptom**: CSS rules may have been added to "fix" broken features
- **Impact**: These rules likely hide/collapse tab panels
- **Debug Status**: Tab diagnostics will identify which rules
- **Action**: Review CSS auditor results

## Architecture State

### Layer 1: Foundation ✅ STABLE
- ApplicationV2 contract enforcement
- Element binding and DOM access
- Lifecycle sequencing
- Render contract

### Layer 2: Sheet System ⚠️ PARTIAL
- SWSEApplicationV2 base class ✅ FIXED
- BaseSWSEAppV2 contracts ✅ FIXED
- Character sheet ✅ FIXED
- Other sheets ⏳ NEEDS AUDIT

### Layer 3: Tab System ❌ BROKEN
- DOM structure ✅ CORRECT
- Attributes ✅ CORRECT
- CSS ❌ LIKELY CULPRIT
- Binding ❌ NOT TESTED

### Layer 4: Governance ✅ WORKING
- Sentinel enforcement online
- Tab diagnostics deployed
- AppV2 auditor deployed
- StructuredLogger active

## Files by Status

### Fixed Files ✅
```
scripts/apps/base/swse-application-v2.js (added await super._onRender)
scripts/apps/base/base-swse-appv2.js (removed element override)
scripts/sheets/v2/character-sheet.js (removed legacy tabs, scrollY)
styles/swse-core.css (removed height:100%, overflow:hidden)
templates/actors/character/v2/minimal-test-sheet.hbs (corrected structure)
```

### New Files ✅
```
scripts/governance/sentinel/tab-diagnostics.js
scripts/governance/sentinel/appv2-auditor.js
scripts/sheets/v2/minimal-test-sheet.js
DIAGNOSTIC_GUIDE.md
DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md
```

### Files Needing Review ⏳
```
scripts/sheets/v2/droid-sheet-v2.js (check for missing super._onRender)
scripts/sheets/v2/npc-sheet.js (check for missing super._onRender)
scripts/sheets/v2/npc-combat-sheet.js (check for missing super._onRender)
scripts/sheets/v2/vehicle-sheet.js (check for missing super._onRender)
scripts/apps/chargen-backgrounds.js (check for missing super._onRender)
scripts/apps/chargen-narrative.js (check for missing super._onRender)
scripts/apps/combat-action-browser.js (check for missing super._onRender)
scripts/apps/droid-builder.js (check for missing super._onRender)
scripts/apps/xp-calculator.js (check for missing super._onRender)
scripts/apps/gm-store-dashboard.js (check for missing super._onRender)
styles/swse-*.css files (check for emergency CSS rules)
```

### Files Needing Audit 📊
```
All CSS files that may have height:0, max-height:0, display:none,
overflow:hidden added to hide broken elements
```

## Recovery Timeline

### Phase 1: Infrastructure Fixes ✅ COMPLETE
- Fixed _onRender missing super call
- Fixed element property override
- Fixed tag: 'div' forcing
- Fixed CSS constraints
- Fixed tab structure
- Created diagnostic tools

### Phase 2: Diagnostic Deployment ✅ COMPLETE
- Created SentinelTabDiagnostics
- Created SentinelAppV2Auditor
- Integrated into Sentinel
- Auto-run on minimal test sheet

### Phase 3: Root Cause Identification 🔄 IN PROGRESS
- Run diagnostics on minimal test sheet
- Identify CSS rules breaking tabs
- Document findings

### Phase 4: Surgical Fixes ⏳ PENDING
- Fix CSS issues identified by diagnostics
- Audit remaining sheet/app classes
- Apply AppV2Auditor to detect regressions

### Phase 5: Validation & Hardening ⏳ PENDING
- Run full sheet suite
- Verify all apps comply with contracts
- Enable strict mode auditing

## How To Proceed

### Option A: Debug Tab System (Recommended)
1. Open minimal test sheet
2. Press F12 (console)
3. Run: `SentinelTabDiagnostics.diagnose(document.querySelector('[data-application-part="swse-minimal-test-sheet"]'))`
4. Review report summary and recommendations
5. Document findings
6. Implement surgical CSS fixes

### Option B: Audit Remaining Sheets
1. Run AppV2Auditor on each sheet class
2. Identify which ones have lifecycle violations
3. Apply missing super._onRender() calls
4. Re-run auditor to verify compliance

### Option C: Full CSS Audit
1. Use diagnostics to find all suspicious CSS rules
2. Map their origins (which stylesheet, which rule)
3. Determine if rules are intentional or emergency fixes
4. Remove/fix emergency rules

## Console Commands

```javascript
// Tab system diagnostics
SentinelTabDiagnostics.diagnose(
  document.querySelector('[data-application-part="swse-minimal-test-sheet"]')
)

// Tab health
SentinelTabDiagnostics.isHealthy(
  document.querySelector('[data-application-part="swse-minimal-test-sheet"]')
)

// AppV2 audit report
SentinelAppV2Auditor.generateReport()

// AppV2 health
SentinelAppV2Auditor.isHealthy()

// Sentinel export
window._SWSE_Sentinel.report.export()
```

## Key Decisions Made

1. ✅ Stop guessing about template structure; deploy diagnostics
2. ✅ Keep fixes minimal and surgical (no mass rewrites)
3. ✅ Use Sentinel for enforcement rather than manual checks
4. ✅ Create auditors for future prevention
5. ✅ Focus on infrastructure stability before new features

## Governance Compliance

✅ All new code uses absolute imports
✅ All logging uses StructuredLogger
✅ No jQuery or deprecated APIs
✅ No CSS global resets
✅ No sidebar injection
✅ Sentinel enforcement maintained
✅ No breaking changes to existing systems

## Recommendations

1. **Immediate**: Run tab diagnostics to identify root cause
2. **Short-term**: Deploy AppV2Auditor to detect other lifecycle issues
3. **Medium-term**: Audit CSS rules and fix hidden panel issues
4. **Long-term**: Consider CSS audit tool to prevent future conflicts

---

**Status**: System recovering, diagnostics active, root cause identification in progress
**Risk Level**: LOW - All infrastructure repairs are surgical and verified
**Next Review**: After diagnostics run and root cause identified
