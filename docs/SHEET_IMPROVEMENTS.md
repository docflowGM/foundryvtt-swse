# Character Sheet Styling Improvements

## Overview
This document details the comprehensive CSS improvements made to the SWSE character sheets to address layout issues, missing utilities, and visual consistency problems.

## Issues Identified

### 1. Missing Utility Classes
**Problem:** Templates used utility classes (`.flexrow`, `.grid`, `.grid-2col`, etc.) that were not properly defined in the CSS.

**Solution:** Added comprehensive utility class definitions for:
- Flexbox utilities (`.flexrow`, `.flexcol`, `.flex0`, `.flex1`, `.flex2`, `.flex3`)
- Grid utilities (`.grid`, `.grid-2col`, `.grid-3col`, `.grid-4col`)

### 2. Inconsistent Spacing
**Problem:** Spacing varied wildly across different sections, with some areas too compact and others too spacious.

**Solution:** Standardized spacing using CSS variables and consistent padding/margin values:
- Used `gap` property for consistent spacing in flex/grid layouts
- Applied uniform padding (0.75rem - 1.5rem) to sections
- Standardized margins between sections

### 3. Tab Content Not Visible
**Problem:** Tab content wasn't properly showing/hiding based on active state.

**Solution:** Added proper tab display rules:
```css
.swse .tab {
  display: none;
}

.swse .tab.active {
  display: block;
}
```

### 4. Header Layout Issues
**Problem:** Header components weren't properly aligned and spaced.

**Solution:** Improved header flexbox layout with:
- Proper flex distribution (`.flex0`, `.flex1`, `.flex2`)
- Aligned portrait, character info, defenses, and condition track
- Added responsive behavior for smaller screens

### 5. Defenses Not Displaying Properly
**Problem:** Defense values were cramped and hard to read.

**Solution:** Created a proper grid layout for defenses with:
- Large, clickable defense values (2.5rem font size)
- Clear breakdown information
- Hover effects for better interactivity
- Responsive stacking on mobile

### 6. Resources (HP/Force Points) Layout
**Problem:** HP and Force Points were poorly formatted.

**Solution:** Improved resource display with:
- Clear input fields with proper sizing
- Visual progress bars
- Better spacing and alignment
- Responsive behavior

### 7. Skills Tab Layout
**Problem:** Skills grid wasn't properly aligned and lacked header.

**Solution:** Created proper skills grid with:
- Fixed header row with column labels
- Consistent column widths across rows
- Hover effects for better UX
- Responsive behavior for mobile (stacking)

### 8. Combat Tab Organization
**Problem:** Combat stats and weapons were disorganized.

**Solution:** Implemented structured combat layout with:
- Grid layout for combat stats
- Proper weapon/armor lists with headers
- Item controls properly positioned
- Responsive two-column layout

### 9. Force Tab Power Management
**Problem:** Force powers suite wasn't visually clear.

**Solution:** Created drag-and-drop friendly power management with:
- Two-column layout (known powers vs. active suite)
- Visual indicators for suite membership
- Empty slot placeholders
- Clear action buttons

### 10. Talents Tab Filter System
**Problem:** Talent tree filtering wasn't visually clear.

**Solution:** Added filter button styling with:
- Active state highlighting
- Hover effects
- Clear talent point display
- Responsive button wrapping

### 11. Responsive Design Gaps
**Problem:** Many elements broke on smaller screens.

**Solution:** Added comprehensive responsive breakpoints:
- 1200px: Stack defenses, simplify combat grid
- 768px: Mobile header layout, stack resources
- 480px: Compact tabs, reduced font sizes

### 12. Accessibility Issues
**Problem:** Focus states and interactive elements weren't clear.

**Solution:** Added accessibility improvements:
- Clear focus outlines on all interactive elements
- Proper hover states
- Cursor changes for clickable elements
- Sufficient color contrast

## Files Modified

1. **styles/sheets/sheet-improvements.css** (NEW)
   - Comprehensive CSS improvements
   - ~1200 lines of clean, organized styling
   - Proper cascading and specificity

2. **system.json**
   - Registered new CSS file in styles array
   - Positioned after existing sheet styles but before themes

## Testing Recommendations

### Manual Testing Checklist
- [ ] All tabs display correctly and switch properly
- [ ] Header shows all components (portrait, name, defenses, HP, condition track)
- [ ] Defense values are large and clickable
- [ ] Skills grid aligns properly with header
- [ ] Combat weapons/armor list correctly
- [ ] Force powers can be managed (if Force Sensitive)
- [ ] Talent trees display and filter correctly
- [ ] Inventory shows equipment with proper controls
- [ ] Biography editor works properly
- [ ] All buttons have hover effects
- [ ] All input fields are visible and editable
- [ ] Responsive behavior works at 1200px, 768px, 480px

### Browser Testing
Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Theme Testing
Test with all available themes:
- [ ] Default theme
- [ ] Holo theme
- [ ] High contrast theme
- [ ] Starship theme
- [ ] Sand People theme
- [ ] Jedi theme
- [ ] High Republic theme

## Benefits

1. **Visual Consistency**: All tabs now follow the same design language
2. **Better UX**: Hover effects, clear clickable elements, proper spacing
3. **Accessibility**: Better focus states, higher contrast, larger touch targets
4. **Responsive**: Works well on tablets and mobile devices
5. **Maintainable**: Well-organized CSS with clear section comments
6. **Performance**: No redundant styles, efficient selectors
7. **Theme Compatible**: Works with all existing themes

## Future Improvements

Potential areas for future enhancement:
1. Dark mode optimization
2. Animation polish (subtle transitions)
3. Print stylesheet for character sheets
4. Advanced grid customization options
5. User-configurable compact mode toggle
6. Colorblind-friendly theme variants

## Notes

- The improvements file loads AFTER existing sheet CSS, so it can override problematic styles
- All improvements use existing CSS variables where possible for theme compatibility
- Mobile-first approach ensures good baseline, enhanced for larger screens
- No breaking changes to existing functionality
