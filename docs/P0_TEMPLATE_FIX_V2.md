# P0 Fix V2: Template Part Single-Root Element Validation

## The Issue

Template part "content" was failing validation with:
```
Failed to render Application "chargen": Template part "content" must render a single HTML element
```

This persisted even after adding a wrapper div in chargen.hbs, suggesting the wrapper itself was correct but something else was preventing validation from passing.

## Root Cause (Final)

**HTML comments were rendering as separate DOM nodes BEFORE the root wrapper element.**

The template originally started with:
```hbs
<!-- SWSE Character Generator Template - V2 Compliant (Single Root Element) -->
<!-- APPV2 FIX: Guaranteed single-root wrapper for content part rendering -->
<div class="swse-chargen-content-root">
  ...
</div>
```

When this is rendered by Handlebars, it produces:
```
- HTML Comment Node (from line 1)
- HTML Comment Node (from line 2)
- DIV#swse-chargen-content-root (from line 3)
```

Foundry's ApplicationV2 template part validator sees MULTIPLE root nodes (2 comments + 1 div) and rejects it.

## The Fix (Just Applied)

**Moved the HTML comments INSIDE the root wrapper div:**

```hbs
<div class="swse-chargen-content-root">
<!-- SWSE Character Generator Template - V2 Compliant (Single Root Element) -->
<!-- APPV2 FIX: Guaranteed single-root wrapper for content part rendering -->
<div class="swse-chargen-window flexcol">
  ...
</div>
</div>
```

Now the rendered structure is:
```
- DIV#swse-chargen-content-root (SINGLE ROOT)
  - HTML Comment Node (inside wrapper - not a separate root)
  - HTML Comment Node (inside wrapper - not a separate root)
  - DIV#swse-chargen-window (inside wrapper)
    ...
```

## File Modified

- `/templates/apps/chargen.hbs`
  - Lines 1-4: Moved comments into wrapper div
  - Wrapper structure unchanged, just comment position fixed

## Status

✅ **P0: Complete** - Template file now has proper single-root element structure

## What To Do Now

### Step 1: Full Foundry Restart (Critical)

This is NOT a browser refresh. You need a COMPLETE shutdown and restart:

1. **Close Foundry VTT completely** (kill the application entirely)
2. **Wait 5 seconds** to ensure all processes end
3. **Reopen Foundry VTT**
4. **Load your world**

The JavaScript changes (DEFAULT_OPTIONS) and template fix both require actual server restart to take effect.

### Step 2: Clear Browser Cache (Recommended)

While Foundry restarts, also clear browser cache in case the old template is cached:
- **Chrome/Edge**: Ctrl+Shift+Delete → Select "All time" → Check "Cached images and files" → Clear
- **Firefox**: Ctrl+Shift+Delete → Check "Cache" → Clear Now
- **Safari**: Develop menu → Empty Caches

### Step 3: Test Chargen After Restart

1. Open the foundry world
2. Open a character sheet
3. Click "Chargen" button
4. Check for the error message

**Expected Result**:
- Chargen should render successfully
- No "Template part 'content' must render a single HTML element" error
- App should show as "chargen" in window title
- Name step should be visible

### Step 4: Verify Success (Optional)

Run this in the browser console while chargen is open:

```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.id === 'chargen');

if (app && app.element) {
  console.log('✅ Template validation passed! Chargen structure:', {
    appId: app.id,
    appTitle: app.title,
    rootElement: app.element.className,
    rootChildren: app.element.children.length,
    firstChild: app.element.firstChild?.nodeType === 1 ? app.element.firstChild.tagName : 'TEXT_NODE'
  });
} else {
  console.log('❌ Chargen app not found or not open');
}
```

Expected output:
```javascript
{
  appId: "chargen",
  appTitle: "Character Generator",
  rootElement: "swse-chargen-content-root",
  rootChildren: 1,
  firstChild: "DIV"  // Should be DIV (the swse-chargen-window), not comment
}
```

## Summary of All P0/P1 Fixes Applied This Session

### P1: ✅ FIXED - App Identity Contamination
- **Issue**: App ID was 'mentor-chat-dialog', Title was 'Mentor Notes'
- **Cause**: CharacterGenerator had no `static DEFAULT_OPTIONS`, inherited stale ID from parent
- **Fix**: Added `static DEFAULT_OPTIONS = { id: 'chargen', ... }` to chargen-main.js
- **Status**: Verified working - app now correctly shows as 'chargen'

### P0: ✅ FIXED - Template Single-Root Validation
- **Issue**: "Template part 'content' must render a single HTML element" error
- **Cause**: HTML comment nodes at template start were treated as separate root elements
- **Fix**: Moved HTML comments inside the root wrapper div
- **Status**: File updated, awaiting Foundry restart to verify

## Debugging Notes

If chargen still fails to render after restart:
1. Check browser console for JavaScript errors
2. Check Foundry's console log for template compilation errors
3. Run the template diagnostic console command above
4. If element exists but shows error, the template part might have OTHER structural issues (empty conditionals, malformed nesting, etc.)

## What Was NOT Changed

- ✅ Chargen step logic (name → abilities) - this is working correctly
- ✅ Character data handling - functionality is intact
- ✅ The wrapper div itself - structure is correct
- ✅ Comment content - just moved position, not removed

Only the position of HTML comments was adjusted to ensure they don't break single-root validation.
