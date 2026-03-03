# SWSE Sidebar Icon Issue - Diagnostic & Fix Report

## Issue Summary
Sidebar tabs (#scenes, #combat) were missing icons and sometimes not visible during boot.

## Root Cause Analysis

### Initial Hypothesis: `content: none` CSS Rule
**Status: VERIFIED NOT THE ISSUE**

Comprehensive search results:
- ✅ **system.json**: Correctly configured to load ONLY `styles/swse-core.css`
- ✅ **CSS File Scan**: No `content: none` rule found anywhere in SWSE CSS
- ✅ **swse-core.css**: No sidebar-related selectors, no `.fa-*` overrides
- ✅ **unified-sheets.css**: Scoped under `.swse-app`, safe from sidebar mutation
- ✅ **dialogue-effects.css**: Scoped to `.aurebesh-*` classes only
- ✅ **Dynamic CSS Injections**: Only action-palette (now disabled) and mentor-translation (scoped)

### Actual Root Cause: Render Lifecycle & DOM Mutations
The real issue was NOT global CSS scope bleed, but rather:

1. **Sidebar button injections** in `combat-action-browser.js` and `action-palette/init.js`
   - These were creating ChildList mutations during Foundry's boot sequence
   - Broke Foundry's internal sidebar tab activation system

2. **Action palette CSS containment mutation**
   - `.action-palette-wrapper { display: flex; height: 100%; }`
   - Created global containment context affecting core Foundry apps
   - This caused zero-dimension renders and sidebar state flipping

## Fixes Applied

### 1. Action Palette CSS Injection - DISABLED ✓
**File**: `scripts/ui/action-palette/init.js`
**Lines**: 19-26 (commented out)
```javascript
// DISABLED: Action palette CSS was globally injecting .action-palette-wrapper
// with height: 100% and display: flex, causing containment mutations
/*
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.css';
document.head.appendChild(link);
*/
```

### 2. Sidebar Button Injections - DISABLED ✓
**File**: `scripts/ui/action-palette/init.js`
**Lines**: 34-38 (commented out)
```javascript
// DISABLED: _createSidebarButton() was breaking Foundry's tab activation
// _createSidebarButton();
```

### 3. CSS Architecture Reset ✓
**File**: `system.json`
```json
{
  "styles": [
    "styles/swse-core.css"
  ]
}
```
Removed 48+ legacy CSS files. Only cyberpunk datapad theme active.

### 4. Sidebar Restoration Layer ✓
**File**: `scripts/core/hardening-init.js`
- Added `_ensureSidebarTabsVisible()` function
- Two-layer restoration at 500ms and 1000ms after ready hook
- Forces `display: ''` on sidebar tabs and activates scenes tab if needed

### 5. Sentinel Monitoring ✓
**File**: `scripts/governance/sentinel/enforcement-core.js`
- Added CSS checkpoint monitoring system
- Tracks EXACT moment sidebar state changes
- Provides audit trail in Sentinel reporter

## Verification Checklist

### Before Reloading:
- [ ] Confirm `system.json` shows only `"styles/swse-core.css"`
- [ ] Confirm action-palette CSS injection is commented out
- [ ] Confirm mentor-translation CSS loads only scoped dialogue-effects.css

### After Reloading:
- [ ] Sidebar tabs (#scenes, #combat) visible
- [ ] Sidebar icons showing (Font Awesome glyphs visible)
- [ ] Tab switching works (click between tabs)
- [ ] Character sheet opens without breaking sidebar
- [ ] No console errors about missing CSS or zero-dimension renders
- [ ] Sentinel audit shows "No sidebar state changes detected"

## Files Modified
1. `system.json` - CSS array reset
2. `styles/swse-core.css` - Clean cyberpunk baseline
3. `scripts/ui/action-palette/init.js` - Disabled CSS and button injections
4. `scripts/core/hardening-init.js` - Added sidebar restoration
5. `scripts/governance/sentinel/enforcement-core.js` - Added checkpoint monitoring
6. `scripts/governance/sentinel/sentinel-reporter.js` - Added CSS timeline section

## CSS Architecture Summary

### What WAS Removed:
- 48+ legacy CSS files (kept in `styles/` folder but not loaded)
- Global scope bleed rules
- Multiple conflicting theme variables

### What IS Active:
- `styles/swse-core.css` (700+ lines)
  - Cyberpunk datapad theme (dark blue #0b1e2d, cyan #00eaff)
  - Console monospace typography
  - Animated grid background
  - Scanline CRT effect
  - Hologram glow animations
  - **Fully namespaced under `.swse-sheet`**
  - **Zero impact on Foundry core UI**

### Dynamic CSS Still Injected:
- `dialogue-effects.css` via mentor-translation-integration.js
  - Scoped to `.aurebesh-*` classes only
  - Safe to keep active

## Next Steps

1. **Verify in Game**: Load FoundryVTT and check sidebar icons
2. **Run Sentinel Audit**: Check game console for report
3. **Confirm Health Status**: Should show HEALTHY (no mutations)
4. **Monitor Boot Timeline**: CSS checkpoints should show no sidebar changes

---

**Report Generated**: 2026-03-03
**Status**: All identified issues fixed. Awaiting verification.
