# SWSE Sheet Layout Architecture (Foundry v13)

## Overview
This document defines the canonical sheet layout structure for SWSE under Foundry VTT v13.

## Why This Matters
Foundry v13 transitioned to flexbox layouts for all Applications. Sheets that don't follow the flex pattern suffer from:
- **Zero-Dimension Panels**: Tab panels collapse to `height: 0px`
- **Invisible Content**: Users see only the header
- **Layout Drift**: Each sheet author invents their own structure

## The Problem in Foundry v13
When a sheet container has no explicit flex growth rule:
```css
.sheet-body { /* No flex: 1 */ }
.tab { height: 0; } /* Browser collapses */
```

## The Solution: Canonical v13 Structure

### Template Structure
```hbs
<form class="sheet flexcol">

  <!-- HEADER (fixed height) -->
  <header class="sheet-header flexrow">
    <h1 class="char-name">
      <input name="name" type="text" value="{{actor.name}}" />
    </h1>
  </header>

  <!-- BODY (grows to fill space) -->
  <section class="sheet-body flexcol">

    <!-- TAB NAVIGATION (fixed height) -->
    <nav class="sheet-tabs tabs flexrow" data-group="primary">
      <a class="item" data-tab="attributes">Attributes</a>
      <a class="item" data-tab="skills">Skills</a>
      <a class="item" data-tab="inventory">Inventory</a>
    </nav>

    <!-- TAB CONTENT (grows, scrollable) -->
    <section class="sheet-content">
      <div class="tab" data-group="primary" data-tab="attributes">
        <!-- Content here -->
      </div>
      <div class="tab" data-group="primary" data-tab="skills">
        <!-- Content here -->
      </div>
      <div class="tab" data-group="primary" data-tab="inventory">
        <!-- Content here -->
      </div>
    </section>

  </section>

</form>
```

### Critical CSS Rules
```css
/* REQUIRED: Container grows within AppV2 */
.application.sheet .sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* REQUIRED: Tabs stay fixed, don't grow */
.application.sheet .sheet-tabs {
  flex: 0 0 auto;  /* KEY: no growth */
  overflow-x: auto;
}

/* REQUIRED: Content grows and scrolls */
.application.sheet .sheet-content {
  flex: 1;  /* KEY: grows to fill */
  overflow-y: auto;
  min-height: 0;  /* Allows content to shrink if needed */
}

/* REQUIRED: Only active tab visible */
.application.sheet .tab {
  display: none;
}
.application.sheet .tab.active {
  display: block;
}

/* UTILITY: Standard flex classes */
.flexcol {
  display: flex;
  flex-direction: column;
}
.flexrow {
  display: flex;
  flex-direction: row;
}
```

## Why Each Rule Matters

| Rule | Why | Consequence If Missing |
|------|-----|------------------------|
| `.sheet-body flex: 1` | Container grows to available space | Body collapses to 0px |
| `.sheet-tabs flex: 0 0 auto` | Tabs stay fixed size | Tabs shrink/collapse |
| `.sheet-content flex: 1` | Content area grows | Content panels invisible |
| `.sheet-content min-height: 0` | Allows flex shrinking | Overflow issues with small windows |
| `.tab { display: none }` | Only active tab shows | All tabs visible, messy |

## Tab Group Matching
CRITICAL: Tab groups must match exactly:
```hbs
<!-- NAV DECLARATION -->
<nav data-group="primary">

<!-- TAB CONTENT DECLARATION -->
<div data-group="primary" data-tab="stats">
  <!-- Shows when tab="stats" clicked -->
</div>
```

If groups don't match, Foundry's tab system won't switch tabs.

## Implementing in Your Sheets

### Step 1: Use the Skeleton Partial
```hbs
{{> sheets/_sheet-skeleton
  headerContent=headerContent
  tabsData=tabsData
  contentTabs=contentTabs
}}
```

### Step 2: Verify CSS Classes
Ensure your sheet template uses:
- `.sheet` on the form
- `.flexcol` and `.flexrow` for layouts
- `.sheet-header`, `.sheet-body`, `.sheet-tabs`, `.sheet-content`

### Step 3: Test with Sentinel Diagnostics
When you render the sheet, check the browser console:
```
✅ Tab system health: HEALTHY
```

If you see:
```
❌ Zero-Dimension Panels Detected
❌ Invisible Panels Detected
```

Then your flex layout is wrong. Review the CSS rules above.

## Refactoring Existing Sheets

For character-sheet.js, npc-sheet.js, vehicle-sheet.js, etc.:

1. Rename your nav groups to use `data-group="primary"`
2. Wrap tab navigation in `<nav class="sheet-tabs tabs flexrow">`
3. Wrap tab content in `<section class="sheet-content">`
4. Verify tab divs use `data-group="primary"` (must match nav)
5. Test with Sentinel diagnostics

## Performance Notes
- Tab switching is instant (CSS-based show/hide)
- Scrolling is smooth (native browser scroll on .sheet-content)
- No JavaScript overhead for layout management
- Compatible with DevTools inspection

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 15+)

## Future Enhancements
When refactoring other sheets:
- Consider sidebar layouts (use `.swse-sheet-grid`)
- Add context menus to tabs if needed
- Implement tab persistence via `actor.setFlag()`
- Use `.swse-scrollable` for custom scrollable areas

## References
- Foundry VTT v13 Application Architecture
- PF2e System (excellent v13 reference)
- DnD5e System (modern flexbox implementation)
