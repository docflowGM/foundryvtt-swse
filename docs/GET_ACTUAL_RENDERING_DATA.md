# Get Actual Rendering Data - Required for P0 Fix

## Summary So Far

✅ **Confirmed**:
- Template path: `systems/foundryvtt-swse/templates/apps/chargen.hbs`
- Top-level wrapper exists and is correct structure
- Conditionals are balanced (248 if/endif pairs)
- No partial includes
- No obvious syntax errors

❌ **Still Broken**:
- "Template part 'content' must render a single HTML element"

## The Problem

I can't find the actual issue by reading the file because the error is in how the template RENDERS, not how it's written.

Foundry's AppV2 parser is evaluating the rendered HTML and rejecting it. Without seeing what the parser receives, I'm guessing.

**I need you to run these exact console commands and report the output.**

## Command 1: Get Raw Template HTML Output

Open F12 Console and paste:

```javascript
// Get CharacterGenerator instance
const chargen = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');

if (!chargen) {
  console.log('❌ Chargen not open yet');
} else {
  // Try to get the rendered HTML
  chargen._renderHTML({}).then(html => {
    console.log('=== RENDERED HTML (first 500 chars) ===');
    console.log(html.substring(0, 500));
    console.log('');
    console.log('=== KEY INFO ===');
    console.log('Total length:', html.length);
    console.log('Starts with:', html.match(/^<[\w]+/)?.[0] || 'NOT AN ELEMENT');
    console.log('Root element:', html.match(/<([\w]+)[^>]*>/)?.[1] || 'UNKNOWN');
    console.log('');

    // Count root elements
    const roots = html.trim().split(/>\s*</g).length;
    console.log('Apparent root elements (naive count):', roots);
  }).catch(e => console.log('❌ Error rendering:', e.message));
}
```

**Expected output**: Shows the first 500 characters of rendered HTML, total length, and root element tag name.

## Command 2: Force Clear Cache and Retry

If you haven't already:

```javascript
game.templates.clear();
console.log('✅ Template cache cleared');
```

Then close and reopen chargen, and run Command 1 again.

## Command 3: Check for Whitespace/Text Nodes Before Root

```javascript
const chargen = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');

chargen._renderHTML({}).then(html => {
  // Check what's before the first element
  const firstElementIndex = html.indexOf('<');
  const beforeFirst = html.substring(0, firstElementIndex);

  console.log('=== CHARACTERS BEFORE FIRST < ===');
  console.log('Count:', beforeFirst.length);
  console.log('Content (escaped):', JSON.stringify(beforeFirst));

  // Check what's after the last element
  const lastElementEnd = html.lastIndexOf('>');
  const afterLast = html.substring(lastElementEnd + 1);

  console.log('');
  console.log('=== CHARACTERS AFTER LAST > ===');
  console.log('Count:', afterLast.length);
  console.log('Content (escaped):', JSON.stringify(afterLast));
}).catch(e => console.log('❌ Error:', e.message));
```

**Expected output**: Shows any whitespace/text before the first `<` and after the last `>`.

## Command 4: Inspect the Actual Root Element

```javascript
const chargen = [...foundry.applications.instances.values()].find(a => a.id === 'chargen');

chargen._renderHTML({}).then(html => {
  // Parse as DOM
  const parser = new DOMParser();
  try {
    const doc = parser.parseFromString(html, 'text/html');
    const root = doc.documentElement;

    console.log('=== PARSED DOM ===');
    console.log('Root tag:', root.tagName);
    console.log('Root class:', root.className);
    console.log('Root ID:', root.id);
    console.log('Direct children count:', root.children.length);
    console.log('First child tag:', root.firstChild?.tagName || root.firstChild?.nodeType);

    // Count all root-level nodes
    let elementCount = 0;
    for (const node of root.childNodes) {
      if (node.nodeType === 1) elementCount++; // Element node
    }
    console.log('Root-level element nodes:', elementCount);
  } catch(e) {
    console.log('❌ Parse error:', e.message);
  }
}).catch(e => console.log('❌ Render error:', e.message));
```

**Expected output**: Shows the parsed DOM structure - root element, children count, and whether there are multiple root-level elements.

## What to Report Back

Run these commands while trying to open chargen, and provide:

1. **Output from Command 1**: First 500 chars of HTML, total length, root element
2. **Output from Command 2**: If you ran cache clear, report if chargen then opens
3. **Output from Command 3**: Any whitespace/text before first `<` or after last `>`
4. **Output from Command 4**: Parsed DOM structure

Once I have this data, I can identify the exact problem and provide a targeted fix.

## Minimum Viable Test

If you can't run all commands, at least run **Command 1** - it will show me what the template is actually outputting, which is the key to solving this.

## Why This Matters

The template SOURCE looks correct, but Foundry's parser is rejecting the OUTPUT. The only way to find the mismatch is to see what the output actually contains.

It could be:
- Extra whitespace
- Malformed HTML that DOMParser rejects
- Multiple root elements (despite our wrapper)
- Handlebars helper issues
- Context missing (undefined variables)
- Or something else entirely

The console output will tell us which.
