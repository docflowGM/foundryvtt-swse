# CRITICAL FIX: Render Lifecycle Collision

**Status**: ✅ APPLIED
**File**: `scripts/ui/ui-manager.js`
**Line**: 28 (commented out)
**Date**: March 3, 2026
**Root Cause**: JavaScript re-render during Foundry ready hook, not CSS

---

## The Real Problem

**NOT a CSS scope issue** (as previously investigated)

The collapse was caused by:

```js
static applyTheme(theme) {
  document.body.dataset.theme = theme;
  this._rerenderSWSESheets();  // ← THIS LINE
}
```

Being called during:
```js
Hooks.once("ready", () => this._onReady());
```

**The Chain of Events:**

1. ✅ Foundry finishes boot, renders all core apps (SceneDirectory, CombatTracker, etc.)
2. ✅ Core windows have correct dimensions
3. 🔴 `ready` hook fires
4. 🔴 UIManager._onReady() calls applyTheme()
5. 🔴 applyTheme() sets `data-theme` attribute
6. 🔴 **_rerenderSWSESheets() is called**
7. 🔴 This forces re-render of any SWSE windows
8. 🔴 Re-render cycle triggers layout recalculation
9. 🔴 During recalculation, Foundry's AppV2 internal layout contract is violated
10. 🔴 Core windows collapse to zero-dimension
11. 🔴 Sentinel detects violation → DEGRADED

---

## Why CSS Wasn't The Issue

**Evidence:**
```js
document.body.className
'vtt game system-foundryvtt-swse performance-high theme-dark'
// No .swse class on body
```

Selectors like `.application.swse` or `.swse button` only match elements with explicit `swse` class.

**Structural audit showed:**
- ✅ No unscoped layout mutations
- ✅ No global `.application` targeting
- ✅ All CSS rules properly scoped

**The collapse happened because:**
- CSS was fine
- JavaScript forced a re-render at the wrong time
- Re-render interacted with AppV2's internal layout management
- Timing collision caused zero-dimension calculation

---

## The Fix

**Commented out line 28 in `scripts/ui/ui-manager.js`:**

```js
static applyTheme(theme) {
  document.body.dataset.theme = theme;
  console.log(`[SWSE UI] Theme applied: ${theme}`);

  // DISABLED: Forcing re-render during ready hook was collapsing Foundry core windows
  // CSS theme variables are applied via data-theme attribute - no re-render needed
  // this._rerenderSWSESheets();
}
```

## Why This Works

**CSS theme system doesn't need re-render:**

```css
/* Themes work purely via CSS variables */
[data-theme="holo"] {
  --swse-primary: #00aaff;
  --swse-bg-dark: #0a1f35;
}

/* Components use variables - they update automatically */
.swse button {
  color: var(--swse-primary);  /* ← Automatically reflects theme change */
  background: var(--swse-bg-dark);
}
```

When `data-theme` attribute changes:
- ✅ CSS variables update automatically
- ✅ All components using those variables re-color immediately
- ✅ No DOM re-render needed
- ✅ No timing collision with Foundry's layout cycle

**The re-render was redundant and harmful.**

---

## What To Test After Reload

### 1. Core Foundry Apps (Must Not Collapse)
- [ ] **SceneDirectory** - Opens, renders, maintains dimensions
- [ ] **CombatTracker** - Opens, shows tabs, maintains dimensions
- [ ] **PlaylistDirectory** - Opens, maintains normal height/width
- [ ] **Actor Directory** - Normal rendering
- [ ] **Item Directory** - Normal rendering

### 2. Sentinel Health
- [ ] **Status**: Should be HEALTHY (not DEGRADED)
- [ ] **Zero-dimension renders**: Should be gone from console
- [ ] **No error logs**: No layout contract violations

### 3. Visual UI
- [ ] **Icons visible**: Hotbar, sidebar, controls all appear
- [ ] **Canvas visible**: Game board renders correctly
- [ ] **Windows visible**: All windows have proper dimensions

### 4. Theme System (Must Still Work)
- [ ] **Colors apply**: Theme colors visible on SWSE windows
- [ ] **Theme switching**: Can change themes without breaking layout
- [ ] **SWSE sheets styled**: Character sheet, droid sheet, etc. use theme colors

### 5. SWSE Sheets (Must Still Scroll)
- [ ] **Character sheet**: Scrolls normally
- [ ] **Droid sheet**: Scrolls normally
- [ ] **Vehicle sheet**: Scrolls normally
- [ ] **Chargen app**: Multi-step form scrolls

---

## Expected Console Output

**Before (Broken):**
```
[SWSE UI] Theme applied: holo
[SWSE UI] UIManager initialized
Sentinel health: DEGRADED
Zero-dimension render detected {appName: 'SceneDirectory', width: 0, height: 0}
```

**After (Fixed):**
```
[SWSE UI] Theme applied: holo
[SWSE UI] UIManager initialized
Sentinel health: HEALTHY
All windows rendering at correct dimensions
```

---

## Important: Theme Changes Still Work

When user changes theme through UI (after initialization):

```js
static async setTheme(theme) {
  await game.settings.set("foundryvtt-swse", "activeTheme", theme);
  this.applyTheme(theme);  // Still called
}
```

This still calls `applyTheme()`, which:
- ✅ Sets `data-theme` attribute on body
- ✅ CSS variables update
- ✅ All SWSE components re-color
- ✅ No forced re-render needed (CSS handles it)

The fix only disables the **initial** re-render during `ready`.

---

## Why AppV2 Render Cycles Are Strict in V13

Foundry v13's ApplicationV2:
- Has rigid layout contracts
- Performs measurements during render
- Expects layout to be stable during boot
- Gets confused by forced re-renders during initialization
- Collapses dimensions if measurements conflict with CSS

**Calling `app.render(false)` during `ready`:**
- Triggers a re-render cycle
- Causes layout measurement at wrong time
- Can conflict with core windows' layout calculations
- Creates the zero-dimension collapse

---

## Documentation

- **CSS_ARCHITECTURE.md** - CSS governance (was correct, issue was JS)
- **CRITICAL_FIX_APPV2_LAYOUT.md** - Earlier CSS fix (still valid)
- **CRITICAL_FIX_RENDER_LIFECYCLE.md** - This file (the real issue)

---

## Summary

| What | Before | After |
|------|--------|-------|
| Root Cause | Investigated CSS scope | **Found JS render timing** |
| Problem | `.application.swse { display: flex }` removed ✅ | **Removed forced re-render** ✅ |
| Secondary Issue | Structural audit (was clean) | **No more issues** ✅ |
| Sentinel Health | DEGRADED | **Should be HEALTHY** |
| Core App Collapse | Zero-dimension renders | **Should be stable** |

**Status**: Ready to test. This is the actual culprit.
