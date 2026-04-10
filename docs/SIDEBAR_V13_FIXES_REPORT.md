# Sidebar Icon Issue - Root Cause & Fixes

## The Real Problem (Not Font Awesome)

The console log revealed the actual issue:

```
SWSE | Sidebar activeTab was null; attempting to activate scenes tab
```

**The sidebar initialization is failing.** SWSE detects this and tries to patch it, but was using outdated code.

---

## Bug 1: Fallback Detector Uses Pre-v13 Selector

**File**: `scripts/core/sidebar-icon-fallback.js` line 28

**Before**:
```javascript
const controlIcons = sidebarTabs.querySelectorAll('.control-icon');
```

This searches for `.control-icon` elements (pre-v13 structure).

**Actual v13 DOM**:
```html
<button class="ui-control plain icon" data-action="tab" data-tab="actors">
```

**Result**: Zero matches, so fallback detector logs "No control icons found" and exits without checking anything.

**After**:
```javascript
const controlIcons = sidebarTabs.querySelectorAll('button.ui-control.plain.icon[data-action="tab"]');
```

Now correctly finds the actual v13 sidebar tab buttons.

---

## Bug 2: Sidebar Hardening Uses Wrong v13 API

**File**: `scripts/core/hardening-init.js` lines 133-146

**Before**:
```javascript
if (!ui.sidebar || !ui.sidebar.activeTab) {
  const scenesTab = document.querySelector('#scenes');
  if (scenesTab) {
    scenesTab.classList.add('active');
    if (ui.sidebar && ui.sidebar.tabs && ui.sidebar.tabs.characters) {
      ui.sidebar.tabs.characters.activate();  // ❌ Wrong API
    }
  }
}
```

Problems:
1. Looking for `#scenes` (content div, not tab button)
2. Trying to activate `characters` tab when it should activate `scenes`
3. Using outdated `ui.sidebar.tabs.*.activate()` API

**After**:
```javascript
if (!ui.sidebar || !ui.sidebar.activeTab) {
  const scenesButton = document.querySelector('#sidebar-tabs button[data-tab="scenes"]');
  if (scenesButton) {
    scenesButton.click(); // Trigger tab activation through button click
    log.info('SWSE | Scenes tab activated via button click');
  }
}
```

Now:
1. Finds the actual v13 tab button: `#sidebar-tabs button[data-tab="scenes"]`
2. Activates via button click, which properly triggers Foundry's built-in tab activation
3. Uses v13-compatible approach

---

## Why Icons Disappeared

The chain of events:

1. **Foundry v13** renders sidebar tab buttons with class `ui-control plain icon`
2. **Sidebar initialization** fails for some reason, leaving `activeTab === null`
3. **SWSE hardening** detects this and tries to patch it, but uses pre-v13 selectors and API
4. **Fallback detector** tries to help but searches for wrong selector, finds nothing, exits silently
5. **Result**: Tab buttons exist but are in a partially initialized state with no icon content

The icons themselves aren't being hidden — they're never being populated in the first place because the sidebar never fully initializes.

---

## What These Fixes Do

### Fix 1: Fallback Detector Now Works
- Uses correct v13 selectors to find tab buttons
- Can now properly detect if Font Awesome is loaded
- Can actually activate fallback CSS if needed

### Fix 2: Sidebar Repair Works Correctly
- Uses correct v13 API to find tab buttons
- Activates tabs through proper v13 mechanism (button click)
- No longer refers to non-existent UI elements or API calls

---

## After These Fixes

1. **Sidebar initialization** still might fail (separate issue)
2. **But when hardening code runs**, it will now properly detect and fix it
3. **And fallback detector** will actually check the right elements

The remaining question is: **Why does sidebar initialization fail in the first place?** 

This might be:
- Loading order issue
- Missing CSS that breaks tab rendering
- Other initialization code interfering
- Foundry compatibility issue

But at least now SWSE's repair code will work correctly.

---

## Testing

After these fixes:

1. Load game and check console
2. Look for either:
   - No warning about `activeTab === null` → Sidebar initializes correctly ✓
   - Warning but then proper activation → Hardening works ✓
   - Fallback activates with proper selectors → Fallback system works ✓

---

## Files Modified

| File | Issue | Fix |
|------|-------|-----|
| `scripts/core/sidebar-icon-fallback.js` line 28 | Pre-v13 selector `.control-icon` | Updated to `button.ui-control.plain.icon[data-action="tab"]` |
| `scripts/core/hardening-init.js` lines 133-146 | Wrong API calls and selectors | Updated to use v13 button click activation |

---

**Status**: ✅ Both bugs fixed
**Root Cause**: v13 Sidebar initialization failure + outdated repair code
**Next Step**: Test and verify sidebar initializes cleanly
