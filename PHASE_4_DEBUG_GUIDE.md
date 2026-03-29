# Phase 4 Layout Debug Guide

## Overview

Phase 4.4 introduces comprehensive debug tooling for SVG panel layout development. This guide helps developers identify and fix layout issues, safe area violations, and positioning problems.

## Quick Start

### Enable Debug Mode

**Method 1: Via Console**
```javascript
game.swse.toggleLayoutDebug()  // Toggle on/off
game.swse.layoutDebug.enable() // Explicit enable
game.swse.layoutDebug.disable() // Explicit disable
```

**Method 2: Via Chat Command**
```
/swse-debug-layout
```

**Method 3: Via Config**
```javascript
CONFIG.SWSE.debug.layoutDebug = true;
// Then reload the sheet
```

### What You'll See

When debug mode is active, all SVG panels display:
- **10px alignment grid** — helps visualize spacing and alignment
- **Green dashed borders** — content safe area boundaries
- **Orange checkered overlay** — positioned element layer
- **Red dots** — anchor points for positioned elements
- **Dimmed frames** — SVG artwork at 50% opacity

## Visual Guide

### Safe Area Boundaries (Green)

The green dashed box shows the `swse-panel__content` safe area. Content MUST stay within this boundary to avoid overlapping SVG artwork.

**When you see violations:**
- Check the `--panel-*-content-padding` variable
- Verify content is not using `position: absolute`
- Check for negative margins pushing content outside

### Overlay Layer (Orange Checkered)

The orange checkered pattern shows the `swse-panel__overlay` layer where absolutely-positioned controls live.

**Check this for:**
- Condition track slot positions (should be at center of boxes)
- DSP track box alignment (should fit in grid cells)
- Any positioned controls (buttons, indicators)

### Positioned Element Anchors (Red Dots)

Red circles mark the actual `top` and `left` positions of overlay children.

**Verify:**
- Slots align with SVG artwork sockets
- Buttons center correctly on their target positions
- No elements outside the overlay container bounds

## Panel-Specific Debugging

### Condition Track (hp-condition-panel.hbs)

The condition track has 6 slots with calculated positions:

```css
--slot-0-x: 7.22%;   /* Position from left edge */
--slot-0-y: 50%;     /* Position from top edge */
--slot-1-x: 22.5%;
/* ... etc */
```

**Debug steps:**
1. Enable layout debug
2. Scroll to Health & Conditions panel
3. Check if red dots align with numbered boxes in SVG
4. If misaligned, adjust `--slot-N-x` and `--slot-N-y` values

### Dark Side Points (dark-side-panel.hbs)

DSP track uses CSS Grid for box layout:

```css
--panel-dsp-track-grid-cols: repeat(auto-fit, minmax(32px, 1fr));
--panel-dsp-track-gap: 3px;
```

**Debug steps:**
1. Enable layout debug
2. Check if grid boxes align with SVG background
3. Verify gap spacing (3px should match SVG spacing)
4. Check box sizing: `--dsp-box-min-width: 32px` and `--dsp-box-height: 32px`

### Custom Panels

For any new SVG-backed panel:
1. Add geometry variables to `svg-geometry.css`
2. Enable debug mode
3. Verify:
   - Green boundary is appropriate for content
   - Content doesn't overflow boundary
   - Any positioned elements align with intended positions

## Common Issues and Fixes

### Issue: Content overflows green boundary

**Cause:** Content padding too small for actual content size

**Fix:**
```css
/* In svg-geometry.css */
--panel-my-panel-content-padding: 20px 16px; /* Increase padding */
```

### Issue: Positioned elements (red dots) don't align with SVG

**Cause:** Percentage positions don't match SVG dimensions

**Fix:**
1. Measure position in original SVG (px)
2. Calculate percentage: `(px_position / svg_width) * 100`
3. Update CSS variable:
```css
--slot-0-x: 10%; /* was 7.22% */
```

### Issue: Grid cells (DSP track) don't fit SVG boxes

**Cause:** Grid column width or gap mismatch

**Fix:**
```css
--panel-dsp-track-grid-cols: repeat(auto-fit, minmax(40px, 1fr)); /* was 32px */
--panel-dsp-track-gap: 4px; /* was 3px */
```

### Issue: Frame layer too dark/light with debug grid

**Cause:** Default is normal operation

**Note:** Frame becomes 50% opacity in debug mode to show grid overlay. This is intentional for visualization.

## Modifying Debug Visualization

Debug colors and styles can be customized in `styles/debug/svg-layout-debug.css`:

```css
:root.debug-layout {
  --debug-grid-color: rgba(0, 255, 136, 0.15);      /* Grid lines */
  --debug-safe-area-color: rgba(0, 217, 255, 0.2);  /* Content border */
  --debug-overlay-color: rgba(255, 200, 100, 0.1);  /* Overlay pattern */
  --debug-anchor-color: #ff6b6b;                     /* Anchor dots */
}
```

## Batch Debugging Multiple Panels

Use browser DevTools console:

```javascript
// Enable debug mode
game.swse.toggleLayoutDebug();

// Check specific panel geometry
console.table({
  conditionTrack: getComputedStyle(document.querySelector('.condition-track-panel')),
  healthPanel: getComputedStyle(document.querySelector('.swse-panel--health'))
});

// Check all SVG variable values
const style = getComputedStyle(document.documentElement);
const geometryVars = Array.from(style)
  .filter(v => v.includes('panel-') || v.includes('slot-'))
  .reduce((obj, v) => ({...obj, [v]: style.getPropertyValue(v)}), {});
console.table(geometryVars);
```

## Disabling Debug Mode

```javascript
game.swse.toggleLayoutDebug()  // Toggle off
game.swse.layoutDebug.disable() // Explicit disable
```

The debug CSS remains loaded (styles/debug/svg-layout-debug.css) but only applies when `.debug-layout` class is present on `.swse-app`.

## Performance Note

Debug mode adds visual overlays and increases CSS specificity slightly. It has negligible performance impact but is intended for **development only**. Disable before production/gameplay.

## Phase 4 Integration

Debug tooling is part of Phase 4 (SVG/Layout Audit):
- **Phase 4.1** ✅ — Audit SVG patterns
- **Phase 4.2** ✅ — Implement universal structure
- **Phase 4.3** ✅ — Create geometry variables
- **Phase 4.4** ✅ — Create debug tooling (this guide)
- **Phase 4.5** — Update DOM assertions for validation

---

**Created:** Phase 4.4 Implementation
**Location:** `/styles/debug/svg-layout-debug.css`, `/scripts/debug/layout-debug.js`
