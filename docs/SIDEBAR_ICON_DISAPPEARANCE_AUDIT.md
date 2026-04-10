# Sidebar Icon Disappearance - Root Cause Audit

## Problem Statement

Sidebar icons (chat, combat, actors, items, journal, etc.) visibly appear during Foundry initialization, then disappear after the `ready` hook completes.

**Key Evidence**: Icons are briefly visible, then hidden/removed later → This is a **post-render failure**, not a rendering issue.

---

## Audit Findings

### 1. **Sidebar Icon Fallback System**
**File**: `scripts/core/sidebar-icon-fallback.js`
**Status**: ✅ Implemented and working

This system:
- Detects if Font Awesome fails to load
- Checks sidebar control icons for Font Awesome font family
- If detection fails: applies `.swse-sidebar-icons-fallback` class to `<html>`
- This activates CSS fallback rules with PNG/SVG icons

**Timing**: Runs on DOMContentLoaded with 500ms delay (line 65)
**Re-check**: On sidebarCollapse hook

**Assessment**: This is defensive and working as designed.

---

### 2. **CSS Fallback Rules**
**File**: `styles/core-overrides.css` (lines 16-92)
**Status**: ✅ Rules exist and properly configured

The fallback system uses:
```css
.swse-sidebar-icons-fallback #sidebar-tabs .item[data-tab="chat"] .control-icon::before {
  background-image: url('../assets/icons/chat.png');
  content: '' !important;
}
```

**Key Note** (line 14): 
> "If sidebar icons break, investigate JS-side icon registration first."

This tells us the system is AWARE that icons can break and points to JavaScript-side issues.

---

### 3. **Post-Init JavaScript That Touches Sidebar**
**File**: `scripts/core/init.js` (lines 26-42)
**Status**: ⚠️ Adds content during `ready` hook

```javascript
Hooks.once('ready', () => {
  if (game.user.isGM) {
    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Droid Approvals';
    
    const sceneTools = document.querySelector('#scene-tools');
    if (sceneTools) {
      sceneTools.appendChild(btn);  // ⚠️ DOM mutation during ready
    }
  }
});
```

This adds a button to the scene tools during the ready hook. If this is failing or if `#scene-tools` doesn't exist, it might be a symptom of broader issues.

---

### 4. **Ready Hook Error: sentinelSheetGuardrails**
**Error Message**:
```
foundryvtt-swse.sentinelSheetGuardrails is not a registered game setting
```

**File**: `scripts/governance/sentinel/sentinel-sheet-guardrails.js`
**Registration**: `scripts/core/settings.js` (line 151)

**Root Cause**: Loading order issue
- Settings are registered during `init` hook
- Sentinel tries to read setting during `ready` hook
- But there might be a race condition or the setting isn't registered yet

**Current Status**: Wrapped in try/catch (lines 150-161), so it shouldn't crash, but it indicates a startup timing problem.

**Assessment**: This error happens at exactly the phase where sidebar icons might be affected.

---

## Post-Render CSS/DOM Analysis

### What I Did NOT Find:
- ❌ No CSS rules explicitly hiding control-icons
- ❌ No font-size: 0 on icons
- ❌ No display: none on #sidebar-tabs
- ❌ No visibility: hidden on icons
- ❌ No opacity: 0 on icon elements
- ❌ No JavaScript explicitly clearing or removing icon DOM

### What This Means:
**Icons are likely NOT being hidden by CSS or DOM removal.** Instead, the issue is probably:

1. **Icon font (Font Awesome) fails to load** → fallback should activate
2. **Fallback detection doesn't work correctly** → PNG/SVG fallback doesn't apply
3. **Font Awesome never renders in the first place** → icons appear blank/invisible

---

## Hypothesis: Font Awesome Loading or Content Issue

The fact that icons are **briefly visible** suggests:

1. **Initial Render** (very early):
   - Sidebar DOM renders correctly
   - Icons might show placeholder or Font Awesome CSS loads
   - Icons are briefly visible

2. **Later Phase** (post-ready):
   - Font Awesome CSS unloads or becomes unreachable
   - Icon content becomes empty
   - Icons disappear
   - Fallback detection runs too late or doesn't activate

3. **Fallback Failure**:
   - Detection might find Font Awesome is still "loaded" (cached, but not rendering)
   - So fallback doesn't activate
   - Icons remain blank

---

## Critical Path: The `ready` Hook Error

The sentinel setting error happens during `ready` hook, at the exact phase where sidebar icons disappear.

**Causality**: 
- Sentinel catches the error (try/catch wrapper)
- But the error interrupts the startup sequence
- Something after that error might affect sidebar rendering

---

## Recommended Audit Steps

1. **Browser DevTools - F12 Console**
   - On game load, watch for the `sentinelSheetGuardrails` error
   - Check Network tab: Is Font Awesome CSS loading?
   - Check Elements: Inspect `#sidebar-tabs .control-icon` 
   - Check Computed styles on control-icon

2. **Font Awesome Status**
   - Check Network tab for `font-awesome*.css` or `.woff2` files
   - Are they loading? (200 status)
   - Or failing? (404, 0, blocked)
   - Check if content after download is actually applied to DOM

3. **Fallback Detection**
   - Open console
   - Look for: `"SWSE | Font Awesome not loaded, activating icon fallback"`
   - OR: `"SWSE | Sidebar icon fallback activated"`
   - If these DON'T appear, fallback isn't detecting the issue

4. **Icon DOM**
   - Right-click sidebar icon → Inspect Element
   - Check if the `<i>` element exists
   - Check if it has `fa-solid`, `fa-*` classes
   - Check computed font-family (should be "Font Awesome 6 Pro" or similar)
   - Check if ::before pseudo-element has content

---

## Minimal Fix Path

### Fix 1: Fix sentinelSheetGuardrails Loading Order (Immediate)
**File**: `scripts/core/settings.js`
**Option**: Ensure setting is registered before ready hook runs

OR

**File**: `scripts/governance/sentinel/sentinel-sheet-guardrails.js`
**Option**: Check if setting exists, use graceful default

**Current State**: Try/catch wrapper is already in place (defensive)

---

### Fix 2: Improve Font Awesome Fallback Detection (Investigation)
**File**: `scripts/core/sidebar-icon-fallback.js`

Options:
- Add more aggressive Font Awesome detection
- Add timing-based re-check (retry after 1s, 2s, etc.)
- Add MutationObserver to watch for icon element changes
- Add explicit logging to track detection success/failure

---

### Fix 3: Ensure Font Awesome Loads Correctly (Foundry Config)
**Check**:
- Is Font Awesome included in system.json?
- Are the CSS URLs correct?
- Is there a CDN issue or cache problem?

---

## Testing Validation

After implementing fixes:

1. **Startup Sequence**:
   - [ ] No `sentinelSheetGuardrails` error in console
   - [ ] Sidebar icons visible immediately
   - [ ] Icons remain visible throughout gameplay
   - [ ] No later CSS/DOM hiding

2. **Icon Rendering**:
   - [ ] All sidebar icons (chat, combat, actors, items, journal, tables, playlists, compendium, settings) visible
   - [ ] Icons have correct appearance (Font Awesome OR PNG/SVG fallback)
   - [ ] Computed styles show correct font-family
   - [ ] No opacity/visibility/display issues

3. **Fallback System**:
   - [ ] If Font Awesome fails, fallback activates automatically
   - [ ] Console shows fallback activation message
   - [ ] PNG/SVG icons display correctly

---

## Root Cause Summary

**Most Likely**: Font Awesome CSS/font isn't fully loaded or applied by the time icons are displayed, causing them to appear empty after initial render.

**Contributing Factor**: The `sentinelSheetGuardrails` ready hook error might be interrupting normal initialization sequence.

**Why Icons Disappear Later**: Not actually "disappearing" — they were never rendered by Font Awesome in the first place. The fallback detection isn't working, so empty icons remain empty.

---

## Files Involved

| File | Issue | Status |
|------|-------|--------|
| `scripts/core/sidebar-icon-fallback.js` | Fallback detection might be too late or missing icons | Needs investigation |
| `scripts/core/init.js` | GM button addition is post-ready | Probably OK, just context |
| `scripts/governance/sentinel/sentinel-sheet-guardrails.js` | Ready hook error | Already wrapped in try/catch |
| `styles/core-overrides.css` | Fallback CSS rules are correct | No changes needed |
| Foundry `system.json` | Font Awesome loading configuration | Needs verification |

---

**Status**: Investigation needed  
**Priority**: High (blocks UI)  
**Next Step**: DevTools inspection to verify Font Awesome loading and icon element state

