# DevTools Diagnostic Checklist for Sentinel Zero-Dimension Issue

## The Problem
Sentinel reports zero-dimension renders on:
- SceneDirectory
- CombatTracker
- PlaylistDirectory

These are Foundry CORE apps, not SWSE apps. Something in CSS is breaking their layout.

## Diagnostic Steps (60 seconds)

### Step 1: Open DevTools & Inspect SceneDirectory
```
1. Press F12 (or Cmd+Opt+I on Mac)
2. Right-click the SceneDirectory window → Inspect Element
3. Look for HTML like: <div class="window-app application scene-directory">
```

### Step 2: Find the Styles Panel
```
In the Inspector/Elements tab, look at the right panel
Click the "Styles" tab (not "Layout", not "Computed")
You should see CSS rules listed from top to bottom
```

### Step 3: Check for SWSE Rules
```
Look at the first 5-10 CSS rules displayed
Check if ANY of them come from swse-*.css files
Look for:
  - Any rule setting: display:
  - Any rule setting: width:
  - Any rule setting: height:
  - Any rule setting: overflow:
  - Any rule setting: flex:
  - Any rule setting: position:
```

### Step 4: Identify the Culprit
```
For each rule that looks suspicious:
  1. Hover over or click it to see the SOURCE FILE NAME
  2. Copy the file name (e.g., "forms.css" or "appv2-structural-safe.css")
  3. Note what CSS property it's setting (display, width, etc.)
  4. Note what value it's setting (flex, 0, none, etc.)
```

### Step 5: Screenshot or Report
```
Take a screenshot of the Styles panel showing:
  - The element name at the top (should show classes like "window-app application scene-directory")
  - The first 3-5 CSS rules below it
  - The source file for each rule (visible on the right side)

OR copy-paste the text like:

  display: flex
  → some-file.css:123

  width: 0
  → another-file.css:456
```

## Expected vs Broken Output

### ✅ EXPECTED (Normal SceneDirectory)
```
.scene-directory
  display: flex (foundry.min.css:123)
  width: 600px (computed)
  height: 400px (computed)
  overflow: auto (foundry.min.css:456)
  flex-direction: column (foundry.min.css:789)
```

### ❌ BROKEN (Zero-dimension SceneDirectory)
```
.scene-directory
  display: flex (swse-system.css:52)  ← WRONG FILE
  width: 0 (computed)  ← SHOULD NOT BE ZERO
  height: 0 (computed)  ← SHOULD NOT BE ZERO
  flex: 0 0 0 (appv2-structural-safe.css:67)  ← SUSPICIOUS
```

## What to Look For

**Red Flags** (will confirm the issue):
```
❌ Any swse-*.css file listed in the first 5 rules
❌ display: none
❌ width: 0 or height: 0
❌ flex: 0 0 0 (zero flex values)
❌ overflow: hidden on parent that collapses child
❌ position: absolute without width/height
```

**Safe Rules** (expected to see):
```
✅ Rules from foundry.min.css (Foundry's own styles)
✅ display: flex (normal layout)
✅ width/height: auto or pixel values (not zero)
✅ overflow: auto or scroll
```

## Once You Find It

Report back with:
1. **File name** (e.g., "forms.css", "appv2-structural-safe.css")
2. **CSS property** (e.g., "display", "width", "flex")
3. **Value it's setting** (e.g., "flex", "0", "none")
4. **Line number** if visible (e.g., "line 67")

Example report:
```
Found it!
File: appv2-structural-safe.css
Property: flex
Value: 0 0 0
Line: 67
The selector matching is: [copy exact CSS rule text from Styles panel]
```

---

## Why This Matters

The CSS refactor was supposed to scope styles tightly:
- ✅ `.application.swse` (only SWSE apps)
- ✅ `.swse-app` (only SWSE containers)
- ❌ `.application` alone (would match ALL apps including Foundry core)

If SceneDirectory is breaking, it means one of our CSS files is either:
1. Using `.application` without `.swse` suffix
2. Using a descendant selector like `.swse .application`
3. Using a universal selector that affects all elements
4. Setting flex: 0 0 0 globally

Once you identify the file and rule, the fix is surgical: just scope it properly.

---

## Example DevTools Screenshots Location
Once you get the screenshot, you can share it here or paste the text output.
The goal is to see exactly which CSS file and line is breaking the layout.

