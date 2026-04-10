# Sidebar Icon Comparison Tool - Quick Guide

## The Insight

Instead of speculating about what's wrong, **compare a working icon button with a broken one**.

If scene controls have icons but sidebar doesn't, the answer is in the difference between them.

---

## How to Use

### 1. Open Foundry
Load the game normally.

### 2. Open Console (F12)
Press F12 → Console tab.

### 3. Run the Comparison

**Direct comparison**:
```javascript
SWSE_ICON_COMPARE.compare()
```

This shows:
- Element structure (tags, classes, children)
- Computed styles
- Pseudo-element content
- Data attributes
- Key differences flagged

**Inspect a specific sidebar button**:
```javascript
SWSE_ICON_COMPARE.inspectSidebarButton('chat')
```

(Replace 'chat' with any tab: 'combat', 'actors', 'items', etc.)

**Find all icons in the app**:
```javascript
SWSE_ICON_COMPARE.scanForIcons()
```

Shows how many icon buttons exist in each UI area.

---

## What the Output Shows

### Key Differences Section

The tool will flag things like:

```
--- KEY DIFFERENCES ---
❌ Broken button has empty innerHTML (Working has content)
❌ Child count differs: Working=1, Broken=0
❌ Working button ::before uses Font Awesome, broken does not
```

**These tell you exactly what's wrong.**

---

## Common Patterns

### Pattern 1: Missing Child Element
```
Working button:
  childCount: 1
  children: [i.fas.fa-comments]

Broken button:
  childCount: 0
  children: []
```

**Meaning**: The `<i>` icon element was never inserted.

---

### Pattern 2: Missing Pseudo-Element Content
```
Working button ::before:
  content: "\f086"  (Font Awesome character)
  fontFamily: "Font Awesome 6 Pro"

Broken button ::before:
  content: "none"
  fontFamily: (default)
```

**Meaning**: Icon is supposed to be a pseudo-element but the CSS rule isn't applied.

---

### Pattern 3: Missing Class
```
Working button className:
  "control-tool icon active"

Broken button className:
  "ui-control plain"  (missing "icon" class maybe?)
```

**Meaning**: The button might be missing a required class for icons.

---

### Pattern 4: Different Content Approach
```
Working button innerHTML:
  "<i class='fas fa-comments'></i>"

Broken button innerHTML:
  ""
```

**Meaning**: Working button has explicit `<i>` element; broken one doesn't.

---

## What to Report

After running `SWSE_ICON_COMPARE.compare()`, look for:

1. **What's in the working button that's NOT in the broken button?**
   - Child element?
   - CSS class?
   - Data attribute?
   - Pseudo-element content?

2. **What's the exact difference?**
   - Copy the "KEY DIFFERENCES" section from console

3. **Which specific sidebar button is broken?**
   - Run `SWSE_ICON_COMPARE.inspectSidebarButton('chat')` to confirm

---

## Example Report

```
Working button (scene control):
- Has <i class="fas fa-star"></i> child
- ::before has Font Awesome content
- Has "active" class

Broken button (sidebar chat):
- Has NO children
- ::before is "none"
- No "active" class

KEY DIFFERENCE:
Sidebar tab buttons are missing the <i> icon element entirely.
```

---

## Next Step

Once you identify the difference, that tells us:
- Is the icon markup never being inserted?
- Is a class being stripped?
- Is pseudo-element CSS broken?
- Is the button being emptied after creation?

Each points to a specific part of the code that needs fixing.

---

## Files

- **Tool**: `/scripts/core/sidebar-icon-comparison.js`
- **Active in**: `/scripts/core/init.js`

---

**TL;DR**: Run `SWSE_ICON_COMPARE.compare()` in console and read the "KEY DIFFERENCES" section. That will show you exactly what's different.
