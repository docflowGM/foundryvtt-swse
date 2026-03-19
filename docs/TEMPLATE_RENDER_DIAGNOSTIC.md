# Template Render Diagnostic - chargen.hbs Validation Failure

## Current Situation

**File Structure**: ✅ VERIFIED
- Wrapper is properly applied in chargen.hbs (lines 3 and 2320)
- Opening: `<div class="swse-chargen-content-root">`
- Closing: `</div>` with comment "END: swse-chargen-content-root"
- No hidden characters or BOM at file start/end
- Windows line endings (CRLF) are normal and not the issue

**Error Status**: ❌ STILL OCCURRING
```
Template part "content" must render a single HTML element
```

**PARTS Definition**: ✅ CORRECT
- File: chargen-main.js lines 377-380
- Template path: `systems/foundryvtt-swse/templates/apps/chargen.hbs`

## Why Wrapper Might Not Be Helping

If the wrapper file structure is correct but the error persists, the issue could be:

### Possibility 1: HTML Comment Nodes
The template starts with two HTML comments (lines 1-2):
```hbs
<!-- SWSE Character Generator Template - V2 Compliant (Single Root Element) -->
<!-- APPV2 FIX: Guaranteed single-root wrapper for content part rendering -->
```

**Issue**: HTML comments CAN render as DOM nodes in some parsing contexts. If Foundry's AppV2 is treating the comments as separate root elements before the wrapper div, validation fails.

**Solution**: Move HTML comments inside the wrapper or remove them.

### Possibility 2: Whitespace Before Wrapper
If there's any whitespace or text nodes between the end of parsing and the opening `<div`, it could create invalid structure.

**Current Structure**:
```
Line 1: <!-- comment -->
Line 2: <!-- comment -->
Line 3: <div class="swse-chargen-content-root">
```

**Test Fix**:
```
Line 1: <div class="swse-chargen-content-root">
Line 2: <!-- comments now inside -->
```

### Possibility 3: Server Cache Not Cleared
Foundry/browser might be caching the old template version.

**Required Actions**:
1. Full Foundry restart (not just world reload)
2. Clear browser cache
3. Check Foundry's /data/templates cache directory (if it exists)

### Possibility 4: Template Compilation Issue
If Handlebars compiled a version of the template before the wrapper was added, the compiled version might be what's being used.

## Recommended Diagnostic Steps

### Step 1: Move/Remove HTML Comments
The safest immediate fix is to remove the HTML comments that precede the wrapper:

```hbs
<div class="swse-chargen-content-root">
  <!-- optional: comments can go here -->
  <div class="swse-chargen-window flexcol">
    ...
  </div>
</div>
```

### Step 2: Verify via Console After Restart

After restart, run this in the browser console while chargen is open:

```javascript
// Check what the template actually rendered
const app = [...foundry.applications.instances.values()]
  .find(a => a.id === 'chargen');

if (app && app.element) {
  console.log('Chargen element structure:', {
    tagName: app.element.tagName,
    className: app.element.className,
    children: app.element.children.length,
    firstChild: {
      tagName: app.element.firstChild?.tagName,
      nodeType: app.element.firstChild?.nodeType,
      textContent: app.element.firstChild?.textContent?.substring(0, 50)
    }
  });
}
```

**Expected output**:
```
{
  tagName: "DIV",
  className: "swse-chargen-content-root",
  children: 1,
  firstChild: {
    tagName: "DIV",
    nodeType: 1,  // ELEMENT_NODE
    textContent: "<!-- SWSE Character Generator..."
  }
}
```

### Step 3: Check Template Caching

Foundry may have cached compiled templates. Check if the template was reloaded:

```javascript
// Force template recompilation
game.templates.clear();  // Clear Handlebars cache
game.templates._classicLoaderCache = {};  // Clear classic loader cache if it exists
console.log('Template cache cleared. Reload world.');
```

Then reload the world and try chargen again.

## Next Actions

1. **FIRST**: Try removing or moving the HTML comments that precede the wrapper div
2. **THEN**: Full Foundry restart + browser cache clear
3. **THEN**: Run the diagnostic console commands to verify what's actually rendering
4. **FINALLY**: If still failing, inspect DevTools Elements tab to see exact DOM structure

## Key Insight

The wrapper addition should have fixed "single root element" errors if it's actually being used. Since it's not helping, either:
- The wrapper isn't being rendered (cache/compilation issue)
- OR there are non-element nodes (comments/whitespace) being treated as separate roots
- OR the wrapper is being rendered but something INSIDE it is malformed

The next step is to confirm what's ACTUALLY in the DOM by inspecting it in DevTools, not just assuming the file structure is correct.
