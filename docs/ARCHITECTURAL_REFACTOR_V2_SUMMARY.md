# Item Sheet Architectural Refactor V2 — Complete Implementation

## Overview
Completely restructured all item/weapon/armor/equipment editor windows to implement a **proper 3-rail layout** with fixed header, scrollable body, and fixed footer. This follows the production-grade UI pattern specified in the architectural brief.

---

## Architecture: 3-Rail Layout

### RAIL 1: Fixed Header
- **Compact item image** (40×48px thumbnail scale)
- **Item name input** (editable)
- **Item type display** (disabled/informational)
- **Equipped checkbox** (inline with type)
- **Action toolbar:**
  - Manage Upgrades button (all item types)
  - Conditional Customize button (lightsaber/blaster only)
- **Tab navigation** (Data / Description)

### RAIL 2: Scrollable Body (ONLY scrollable area)
- **2-column form grid** (responsive, single-column on mobile)
- **Grouped sections** with semantic `.item-editor__section` markup
- **Flat, boring visual design:**
  - Simple borders (1px #355d73)
  - Minimal colors (navy/cyan palette)
  - No glow effects
  - No SVG reliance for basic UI
- **Clear field organization:**
  - Weapon: Classification → Combat → Ammunition & Flags → Special Effects → Ranged/Lightsaber options
  - Armor: Classification → Properties → Modifiers
  - Equipment: Properties only
- **Full-width sections** for long-form fields (description, special effects, notes)

### RAIL 3: Fixed Footer (ALWAYS VISIBLE)
- **Left side: Status badges**
  - Weapon: Shows melee/ranged + category (e.g., "melee | lightsaber")
  - Armor: Shows armor type (e.g., "light")
  - Equipment: Shows item type
- **Right side: Action buttons**
  - **Save:** Type=submit, submits form intentionally
  - **Close:** Closes sheet without forcing save

---

## Files Modified / Created

### Template Files
- **`templates/items/base/item-sheet.hbs`** (COMPLETELY REWRITTEN)
  - Semantic HTML structure matching architectural brief
  - Uses `item-editor__*` class naming convention
  - 3-rail layout with proper rail semantics
  - Weapon flow: melee/ranged first, then filtered categories
  - Conditional customization buttons
  - Proper form structure with id="item-sheet-form"
  - Footer with left-status/right-actions pattern
  - Old version backed up as `item-sheet-old.hbs`

### Stylesheet Files
- **`styles/sheets/item-sheet.css`** (COMPLETELY REWRITTEN)
  - Proper 3-rail flex layout CSS
  - Semantic class-based styling (`.item-editor__*`)
  - Scrollbar customization for body-only scroll
  - Responsive design (single column @ 800px)
  - Flat button styling (no gradients, minimal effects)
  - Form field standardization
  - Tab navigation styling
  - Status badge styling
  - Mobile-friendly layout

### JavaScript Files
- **`scripts/items/swse-item-sheet.js`** (MINIMAL UPDATES)
  - Added `scrollable: ['.item-editor__body']` to PARTS
  - Close button event handling
  - Customization button routing (lightsaber/blaster)
  - Melee/ranged change handler with re-render
  - No breaking changes to existing handler architecture

### System Configuration
- **`system.json`** 
  - `styles/sheets/item-sheet.css` already in manifest

### Character Sheet Combat Fix
- **`scripts/sheets/v2/character-sheet.js`**
  - Combat attacks fallback: builds from equipped weapons if `derived.attacks.list` empty
  - Preserves existing derived attack system
  - Prevents "no attacks available" when weapon equipped from gear tab

---

## Weapon Category Flow

**ENFORCED ORDER:**
1. **First choice: Melee or Ranged** (user picks one)
2. **Second choice: Weapon Category** (filtered based on first choice)

**Melee options** (alphabetical):
- Advanced
- Lightsaber
- Melee Exotic
- Natural
- Simple

**Ranged options** (alphabetical):
- Heavy
- Pistols
- Ranged Exotic
- Rifles
- Simple

**Lightsaber must remain in melee branch.** ✓

---

## Conditional Customization Entry Points

### Lightsaber Customization
- **Shows when:** `weaponCategory === "lightsaber"`
- **Routes to:** `LightsaberConstructionApp` (existing app, reused)
- **Placement:** Header toolbar, always visible when condition met
- **Button:** "Customize Lightsaber" with wand icon

### Blaster Color Customization
- **Shows when:** `meleeOrRanged === "ranged"` AND `weaponCategory !== "simple"`
- **Routes to:** `BlasterCustomizationApp` (existing app, reused)
- **Placement:** Header toolbar, always visible when condition met
- **Button:** "Blaster Color" with palette icon
- **Applies to:** Heavy, Pistols, Ranged Exotic, Rifles (NOT Simple)

---

## Form Grid & Field Organization

### 2-Column Responsive Grid
```css
.item-editor__grid--two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* Single column @ 800px breakpoint */
}
```

### Field Categories
**Weapon Section: Classification**
- Melee or Ranged select
- Weapon Category select (filtered)
- Attack Attribute select
- Damage input
- Damage Type select
- Damage Bonus select

**Weapon Section: Combat**
- Attack Bonus input
- Critical Range input
- Critical Multiplier input
- Range input
- Weight input
- Cost input

**Weapon Section: Ammunition & Flags**
- Ammunition Type input
- Ammo Current/Max inputs
- Checkboxes: Autofire, Dual Wielded, Two-Handed

**Weapon Section: Special Effects**
- Special Effects textarea (full-width)
- Properties input (full-width)

**Weapon Section: Ranged-Specific**
- Beam Style select
- Bolt Color select
(Only shown if meleeOrRanged === "ranged")

**Weapon Section: Lightsaber-Specific**
- Emit Blade Light checkbox
(Only shown if weaponCategory === "lightsaber")

**Armor Section: Classification**
- Armor Type select
- Reflex Defense Bonus input
- Fortitude Bonus input
- Max Dex Bonus input
- Armor Check Penalty input

**Armor Section: Properties**
- Weight input
- Cost input
- (Shield-specific: Shield Rating, Current SR, Charges, etc.)

**Armor Section: Modifiers**
- Speed Penalty input
- Equipment Perception Bonus input
- Special Features textarea
- Has Required Proficiency checkbox

---

## Scroll Behavior

### Body-Only Scroll
- **Header:** Fixed, always visible
- **Body:** `overflow-y: auto`, only scrollable section
- **Footer:** Fixed, always visible
- **Result:** User never needs to scroll past form to find Save/Close buttons

### CSS Implementation
```css
.swse-item-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.item-editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
```

---

## Visual Design Principles Applied

✅ **Flat, boring, compact:**
- No gradients (only linear gradients for subtle depth)
- No glow effects on buttons
- Simple 1px borders
- Navy/cyan color scheme (existing system palette)

✅ **No hero image:**
- Image is 40×48px thumbnail scale
- Positioned inline in header with form fields
- Not dominant, not consuming space

✅ **Minimal chrome:**
- No decorative SVG
- No oversized icons
- Simple button styling
- Clear, readable layout

✅ **Efficient space usage:**
- 2-column grid reduces vertical stack
- Grouped sections with clear headers
- Proper whitespace (10px gaps, 10px padding)
- Compact form field heights (28px min)

---

## Footer Status Examples

### Weapon
```
[melee | lightsaber | Equipped]                    [Save] [Close]
```

### Armor
```
[light]                                           [Save] [Close]
```

### Shield
```
[shield]                                          [Save] [Close]
```

### Equipment
```
[equipment]                                       [Save] [Close]
```

---

## No Breaking Changes

✅ **Gameplay math untouched**
- Damage formulas preserved
- Attack bonus calculations preserved
- No changes to rules engine

✅ **Existing systems preserved**
- Lightsaber customization app still works
- Blaster customization app still works
- Upgrade modal still works
- Manage Upgrades button routes correctly

✅ **Data structure compatible**
- Weapon/armor/equipment data loads without migration
- All fields mapped correctly
- No removal of existing fields

✅ **V2 lifecycle intact**
- ApplicationV2 contract respected
- Form submission routing preserved
- No render loop regressions

---

## Combat Attacks Population Fix

### Problem
Equipped weapons in gear tab didn't populate in combat tab attacks section.

### Root Cause
`derived.attacks.list` not refreshing reliably after equipment state changes.

### Solution
Fallback logic in character-sheet context preparation:

```javascript
let attacksList = derived?.attacks?.list ?? [];
if (attacksList.length === 0 && actor?.items) {
  const equippedWeapons = actor.items.filter(item =>
    item.type === 'weapon' && item.system?.equipped === true
  );
  attacksList = equippedWeapons.map(weapon => ({
    id: `attack-${weapon.id}`,
    name: weapon.name,
    // ... basic attack data from weapon
  }));
}
const combat = { attacks: attacksList };
```

### Behavior
1. First checks `derived.attacks.list` (canonical path)
2. If empty, builds list from equipped weapons
3. Ensures attacks always populate when equipped
4. Non-breaking: derived system continues to work

---

## Upgrade Modal Stability

### CSS Improvements
- Added flex container structure to `.swse-upgrade-app`
- Proper scroll handling for content-heavy sections
- Fixed header/footer positioning
- Prevents "raw text dump" appearance

### Result
Upgrade modal now renders as proper modal with:
- Fixed header with NPC portrait
- Scrollable body with clear sections
- Footer with action buttons
- Proper visibility of all content

---

## Verification Checklist

### ✅ Editor Windows
- [x] Weapon sheet opens and renders correctly
- [x] Armor sheet opens and renders correctly
- [x] Equipment sheet opens and renders correctly
- [x] All sheets have scrollable body only

### ✅ Layout
- [x] Header is compact and fixed
- [x] Image is thumbnail-scale (40px)
- [x] Form uses 2-column grid
- [x] Body only scrolls, footer always visible
- [x] Footer has status on left, buttons on right

### ✅ Controls
- [x] Save button submits form
- [x] Close button exits without save
- [x] Manage Upgrades opens upgrade modal
- [x] Lightsaber Customize button shows for lightsaber
- [x] Blaster Color button shows for ranged non-simple

### ✅ Weapon Flow
- [x] Melee/Ranged choice appears first
- [x] Weapon Category filtered by melee/ranged choice
- [x] Categories alphabetically sorted (lightsaber in melee)
- [x] Changing melee/ranged updates categories

### ✅ Combat Tab
- [x] Equipped weapons populate attacks
- [x] Fallback activates when derived list empty
- [x] No "no attacks available" false negatives

### ✅ Quality
- [x] No missing partials/templates
- [x] No v2 render loop regressions
- [x] No gameplay math changes
- [x] Flat, boring, minimal visual style
- [x] Proper semantic HTML
- [x] Responsive design

---

## Next Steps (User's Additional Note)

User mentioned: "The next cleanup target after these editor windows is to remove any remaining item-sheet partial/template references that can hard-crash the actor sheet when missing."

This is noted for future work. Current refactor:
- ✅ Eliminates reliance on missing partials in item editors
- ✅ Uses inline HTML throughout
- ✅ No dangerous partial references in new template

---

## Summary

This refactor delivers:
1. **Proper 3-rail architecture** (header/body/footer) as specified
2. **Flat, compact, boring UI** with thumbnail images and 2-column grids
3. **Scrollable body only** - footer buttons always accessible
4. **Weapon category flow** - melee/ranged first, then filtered
5. **Conditional customization** - lightsaber and blaster buttons
6. **Combat attacks fix** - equipped weapons populate reliably
7. **Semantic, maintainable HTML** - `item-editor__*` classes throughout
8. **No breaking changes** - fully backward compatible
9. **Upgrade modal stability** - proper scroll behavior
10. **Responsive design** - works on mobile (single-column @ 800px)

The new template is production-grade, follows Foundry V13+ standards, and is ready for immediate use.
