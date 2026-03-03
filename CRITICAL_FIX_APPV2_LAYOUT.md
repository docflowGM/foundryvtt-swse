# CRITICAL FIX: Removed .application.swse Display Override

**Status**: ✅ APPLIED
**File**: `styles/core/appv2-structural-safe.css`
**Lines Removed**: 57-60 (the entire `.application.swse { display: flex; flex-direction: column; }` block)
**Date**: March 3, 2026

---

## The Problem

The rule was:
```css
.application.swse {
  display: flex;
  flex-direction: column;
}
```

**Why This Was Breaking Everything:**

1. `.swse` class is applied high in the DOM (possibly body or parent container during theme initialization)
2. When `.swse` is present on a parent, the selector `.application.swse` matches:
   - ✅ SWSE sheet windows (intended)
   - ❌ **ALL child `.application` elements, including Foundry CORE apps** (unintended)
3. This forced SceneDirectory, CombatTracker, PlaylistDirectory, and other Foundry apps to:
   - Become flex containers
   - Adopt flex-direction: column
   - Break their internal layout contracts
4. Result: Zero-dimension renders on core apps → Sentinel DEGRADED

---

## The Fix

**Deleted** this rule entirely:
```css
.application.swse {
  display: flex;
  flex-direction: column;
}
```

**Kept** everything else in the file:
```css
/* ✅ These stay - they are safe */
.application.swse,
.application.swse > *,
.application.swse button,
.application.swse input,
.application.swse select,
.application.swse textarea,
.application.swse .form-group,
.application.swse .panel,
.application.swse .list-container {
  box-sizing: border-box;  /* Safe - doesn't affect layout flow */
}

form.swse-app {
  display: flex;  /* Safe - only affects SWSE forms */
  flex-direction: column;
}
```

---

## Why It's Safe To Remove The Display Rule

Foundry V13's `ApplicationV2` already manages its own internal layout:
- ✅ ApplicationV2 uses flex internally
- ✅ SWSE sheets are ApplicationV2 instances
- ✅ They get flex layout from Foundry, not from us
- ❌ We should NEVER reassign `display` on `.application`
- ❌ Even scoped to `.swse`, it breaks containment

---

## What To Test After Reload

### 1. Foundry Core Apps (Must Work)
- [ ] **SceneDirectory** - Opens normally, not collapsed
- [ ] **CombatTracker** - Shows normal dimensions, tabs visible
- [ ] **PlaylistDirectory** - Renders without zero-dimension
- [ ] **Actor Directory** - Not affected by SWSE CSS
- [ ] **Item Directory** - Not affected by SWSE CSS

### 2. SWSE Sheet Apps (Must Still Work)
- [ ] **Character Sheet** - Opens and renders normally
- [ ] **Character Sheet Scroll** - Content scrolls smoothly (not clipped)
- [ ] **Droid Sheet** - Opens and scrolls
- [ ] **Vehicle Sheet** - Opens and scrolls
- [ ] **Chargen App** - Multi-step form scrolls correctly

### 3. Sentinel Health
- [ ] **Sentinel Status**: Should return from DEGRADED to HEALTHY
- [ ] **Zero-dimension Renders**: Should disappear from console
- [ ] **Window Content**: `.window-content` should be present and sized correctly

### 4. Visual Confirmation
- [ ] **Icons visible**: Toolbar icons, sidebar, controls all appear
- [ ] **Hotbar visible**: Bottom action bar shows and functions
- [ ] **Windows visible**: All windows have proper height/width
- [ ] **Canvas visible**: Game board renders correctly

---

## Expected Console Output After Reload

**Before (Broken):**
```
SWSE system initialized
Sentinel health: DEGRADED
Zero-dimension render detected {appName: 'SceneDirectory', width: 0, height: 0}
Missing .window-content on: SceneDirectory, CombatTracker, PlaylistDirectory
```

**After (Fixed):**
```
SWSE system initialized
Sentinel health: HEALTHY
All window dimensions normal
All core Foundry apps rendering
```

---

## Why This Happened

During the CSS refactoring phases, we added defensive normalization rules to fix AppV2 scroll and flex issues inside SWSE sheets:
- min-height: 0 on flex children (prevents collapse)
- box-sizing: border-box (consistent sizing)
- display: flex on form containers (for layout)

These are all necessary.

But then we made a mistake:
- We added a blanket `display: flex` on `.application.swse`
- This was meant to normalize SWSE window root containers
- But it violated Foundry's ApplicationV2 layout contract
- And it matched more than intended due to how `.swse` class propagation works

The fix is surgical: remove only the display override.

---

## Moving Forward

### ✅ appv2-structural-safe.css Now Contains Only Safe Rules

```css
/* Safe normalization rules that don't override display */

/* Box-sizing normalization (prevents layout shift) */
.application.swse,
.application.swse > *,
.application.swse button,
.application.swse input,
.application.swse select,
.application.swse textarea,
.application.swse .form-group,
.application.swse .panel,
.application.swse .list-container {
  box-sizing: border-box;
}

/* Flex child min-height (prevents flex item collapse) */
.application.swse .chargen-body,
.application.swse .step-content,
.application.swse .dashboard-content,
/* ... etc ... */
{
  min-height: 0;
}

/* Form container flex (for form layout) */
form.swse-app,
form.swse-dialog,
form[class*="swse"] {
  display: flex;  /* ✅ Safe - only affects SWSE forms */
  flex-direction: column;
  min-height: 0;
}
```

### Future Consideration

If all tests pass with no scroll/layout regressions on SWSE sheets:
- We could potentially remove the entire `appv2-structural-safe.css` in a future cleanup
- But for now, it serves as a defensive safety layer
- The key is: **we never touch `.application.display` again**

---

## Document References

- **CSS_ARCHITECTURE.md** - Governance rules (updated with new AppV2 lessons learned)
- **REFACTORING_SUMMARY.md** - Complete project status
- **STEP3_5_SELECTOR_SCOPE_FIX.md** - Earlier selector fixes

---

## Sign-Off

| What | Before | After |
|------|--------|-------|
| Sentinel Health | DEGRADED | 🔄 Testing (should be HEALTHY) |
| SceneDirectory Dimensions | 0x0 | 🔄 Testing (should be normal) |
| CombatTracker Dimensions | 0x0 | 🔄 Testing (should be normal) |
| Character Sheet Scroll | Unknown | 🔄 Testing (should still work) |
| Core App Styling | Broken | 🔄 Testing (should be clean) |

**Status**: Awaiting Foundry reload and verification
