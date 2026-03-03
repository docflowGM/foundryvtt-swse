# STEP 3.5: Critical Selector Scope Fix Applied

## Problem Identified
**Root Cause of Sentinel DEGRADED Status**: `appv2-structural-safe.css` lines 66-76 contained broad `.swse` selectors that affected Foundry core UI elements when `.swse` class is applied to `<body>` by the theme manager.

### Problematic Code (BEFORE)
```css
/* ===========================
   MEASUREMENT STABILITY
   =========================== */

.swse,
.swse > *,
.swse button,      ← PROBLEM: Affected ALL buttons when body has .swse class
.swse input,       ← PROBLEM: Affected ALL inputs when body has .swse class
.swse select,      ← PROBLEM: Affected ALL selects when body has .swse class
.swse textarea,    ← PROBLEM: Affected ALL textareas when body has .swse class
.swse .form-group,
.swse .panel,
.swse .list-container {
  box-sizing: border-box;
}
```

### Impact on Foundry
- Box-sizing rule applied to SceneDirectory controls
- Box-sizing rule applied to CombatTracker buttons
- Caused width/height calculations to break
- Resulted in zero-dimension renders (width: 0, height: 0)
- Triggered Sentinel DEGRADED status

## Fix Applied
**File**: `styles/core/appv2-structural-safe.css`
**Lines**: 62-76
**Action**: Scoped all selectors to `.application.swse` and `.swse-app` containers only

### Fixed Code (AFTER)
```css
/* ===========================
   MEASUREMENT STABILITY
   Scoped to SWSE app containers only - prevents affecting Foundry chrome
   =========================== */

.application.swse,
.application.swse > *,
.application.swse button,
.application.swse input,
.application.swse select,
.application.swse textarea,
.application.swse .form-group,
.application.swse .panel,
.application.swse .list-container,
.swse-app,
.swse-app > *,
.swse-app button,
.swse-app input,
.swse-app select,
.swse-app textarea,
.swse-app .form-group,
.swse-app .panel,
.swse-app .list-container {
  box-sizing: border-box;
}
```

## Scope Protection Strategy
The fix uses a two-pronged scoping approach:

1. **`.application.swse`** - Only applies to AppV2 sheet windows opened by SWSE system
   - Prevents affecting Foundry core windows (SceneDirectory, CombatTracker, Chat, etc.)
   - Allows SWSE windows to get proper box-sizing normalization

2. **`.swse-app`** - Allows opt-in scoping for generic SWSE app containers
   - For apps that use custom `.swse-app` root class instead of ApplicationV2
   - Maintains flexibility for non-ApplicationV2 SWSE components

## Global `.swse` Usage Audit Results
Searched entire styles directory for remaining problematic `.swse` selectors:
- ✅ `styles/components/forms.css` - Using `.application.swse` (correct)
- ✅ `styles/components/buttons.css` - Using `.application.swse` (correct)
- ✅ `styles/sheets/vehicle-sheet.css` - Using `.swse.vehicle-sheet` (properly scoped)
- ⚠️ `styles/dialogs/holo-dialogs.css` - Uses `[data-theme=holo] .swse` (theme-scoped, considered safe)
  - Only affects elements within holo-themed SWSE containers
  - Attribute selector prevents global bleeding
  - No action needed

## Verification Steps
After this fix, Sentinel should:
1. Return to HEALTHY status
2. SceneDirectory and CombatTracker should show normal dimensions
3. Window-content should be properly sized for all Foundry core apps
4. Zero-dimension renders should disappear

**Next Action**: Reload Foundry in browser to confirm Sentinel recovery.

---

## Selector Scope Enforcement Rules
These rules now apply system-wide:

- ❌ NEVER use `.swse` alone for element selectors (button, input, select, textarea)
- ✅ ALWAYS use `.application.swse` for AppV2 sheets
- ✅ ALWAYS use `.swse-app` for generic app containers
- ✅ ALWAYS use theme-scoped selectors like `[data-theme=holo] .swse` for dialogs
- ✅ ALWAYS use custom class names like `.ability-card`, `.form-group` inside SWSE containers

**Related Files Enforcing This**:
- `CSS_ARCHITECTURE.md` (to be created in STEP 7)
- All component files (forms.css, buttons.css, tabs.css, etc.)
