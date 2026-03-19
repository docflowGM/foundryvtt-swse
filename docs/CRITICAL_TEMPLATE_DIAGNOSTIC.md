# Critical Template Diagnostic - Actual Rendering Issue

## Status Update

✅ **P1 FIX CONFIRMED WORKING**
- App now shows ID: "chargen" (not "mentor-chat-dialog")
- Wrapper position fix for comments was applied
- But template rendering STILL FAILS

## Problem: HTML Comments Fix Didn't Work

**My Hypothesis Was Wrong**: Moving HTML comments inside the wrapper did NOT fix the "single root element" error.

This means the issue is NOT about comments being separate nodes.

## Real Problem: Unknown - Needs Investigation

Since the wrapper structure looks correct, the problem must be one of these:

### Possibility 1: Template Cache Not Actually Cleared
Foundry might be using a cached version of the template from BEFORE the changes.

**Test**: Run in browser console:
```javascript
// Force template cache clear
game.templates.clear();
console.log('Template cache cleared');
```

Then try opening chargen again.

### Possibility 2: Handlebars Syntax Error in Template
If there's a malformed conditional, unclosed tag, or syntax error, the template won't compile.

**Test**: Run in console:
```javascript
// Try to compile chargen template directly
try {
  const template = game.templates.get('systems/foundryvtt-swse/templates/apps/chargen.hbs');
  console.log('✅ Template compiles successfully');

  // Try to render it with empty data
  const html = template({});
  console.log('✅ Template renders');
  console.log('First 100 chars:', html.substring(0, 100));
} catch(e) {
  console.log('❌ Template compilation/render failed:');
  console.log(e.message);
  console.log(e.stack);
}
```

### Possibility 3: currentStep Context Missing or Invalid
If `currentStep` is not being passed to the template context, or is undefined, all conditionals fail, main might render empty or incorrectly.

**Test**: In console, add logging to the render process:
```javascript
// Modify CharacterGenerator to log context
const ChargenClass = [...foundry.applications.instances.values()]
  .find(a => a.id === 'chargen')?.constructor;

if (ChargenClass) {
  const original = ChargenClass.prototype._prepareContext;
  ChargenClass.prototype._prepareContext = function(options) {
    const context = original.call(this, options);
    console.log('Template context currentStep:', context.currentStep);
    console.log('Context keys:', Object.keys(context));
    return context;
  };
}
```

Then try to open chargen and check console output.

### Possibility 4: Multiple Root Elements Inside main
Even though main is a single element, if the CONTENT of main is malformed, it might cause issues.

For example, if a conditional renders multiple siblings at the same level inside main, that might break validation.

### Possibility 5: Server-Side Template Compilation Issue
If the template file has Windows line endings (CRLF) and Handlebars is strict about it, compilation might fail.

**Test**: Check file line endings:
```bash
file /path/to/chargen.hbs
```

Or in Foundry console:
```javascript
game.templates.loadTemplates(['systems/foundryvtt-swse/templates/apps/chargen.hbs']).then(
  () => console.log('✅ Template loaded'),
  (e) => console.log('❌ Load failed:', e)
);
```

## Immediate Actions to Try (In Order)

### Step 1: Clear Template Cache
```javascript
game.templates.clear();
console.log('Cache cleared - try chargen again');
```

### Step 2: Verify Template Compiles
```javascript
const template = game.templates.get('systems/foundryvtt-swse/templates/apps/chargen.hbs');
console.log('Template exists:', !!template);
```

### Step 3: Manually Test Render with Minimal Data
```javascript
// Get the chargen app
const app = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');

// Try to manually render with test context
if (app) {
  try {
    const context = await app._prepareContext();
    const html = app._renderTemplate(context);
    html.then(result => {
      console.log('HTML render result (first 200 chars):');
      console.log(result.substring(0, 200));
      console.log('Total length:', result.length);
      console.log('Starts with <div>:', result.trim().startsWith('<div'));
      console.log('Root element:', result.match(/<\w+[^>]*>/)?.[0]);
    });
  } catch(e) {
    console.log('Render failed:', e.message);
  }
}
```

### Step 4: Check for Template Syntax Errors
```javascript
// Look for common issues in the rendered HTML
const app = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');
if (app?.element) {
  const inner = app.element.innerHTML;
  console.log('Element has content:', inner.length > 0);
  console.log('First 100 chars:', inner.substring(0, 100));
} else {
  console.log('Chargen element not found or not rendered');
}
```

## What Would Help Debug This

I need you to run these console diagnostics and provide:

1. **Does cache clear help?** (Step 1)
2. **What is the template compile error, if any?** (Step 2-3)
3. **What is the first 200 characters of the rendered HTML?** (Step 3)
4. **What is the exact root element?** (Step 3)
5. **Are there any JavaScript errors in the console?** (Check F12 console before trying chargen)

## Most Likely Culprit

Given that:
- Wrapper structure is correct in the file
- Comments were inside the wrapper
- App ID is now correct
- But rendering still fails

I suspect **the template isn't actually being reloaded by the server**. The .hbs file was changed, but Handlebars might have cached the compiled version.

**Try**: Full Foundry restart + browser cache clear + `game.templates.clear()`

## Last Resort

If nothing above works:

1. **Backup chargen.hbs**
2. **Delete all content and replace with minimal template**:
```hbs
<div class="swse-chargen-content-root">
  <div class="swse-chargen-window flexcol">
    <h2>Testing Template Rendering</h2>
    <p>If this appears, template rendering works.</p>
  </div>
</div>
```
3. **Restart Foundry and test**
4. If minimal template works, the problem is in the existing template structure, not the wrapper
5. If even minimal fails, the problem is deeper (app, class, or context issue)

---

## Next Steps

1. Run the console diagnostics above
2. Share the results
3. We can then identify the actual problem instead of guessing

The fact that P1 worked but P0 didn't suggests the issue is specifically with the .hbs template structure or compilation, not the app infrastructure.
