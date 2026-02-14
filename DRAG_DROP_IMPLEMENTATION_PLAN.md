# SWSE Drag & Drop Implementation Plan

## Executive Summary

The SWSE character sheet has drag-and-drop UI elements in the Force Powers and Starship Maneuvers tabs, but the JavaScript event handlers are **completely missing**. This causes silent failures when users try to drag items or click action buttons.

**Status:** ~40% implemented (infrastructure exists, handlers missing)
**Effort:** Medium (4-6 hours)
**Complexity:** Low (straightforward event binding pattern)
**Risk:** Low (isolated feature, follows established patterns)

---

## Current State Analysis

### What Works ✅
- **DropHandler** (`scripts/drag-drop/drop-handler.js`): Comprehensive handler for items dropped from compendiums
- **ForceSuiteComponent** (`scripts/components/force-suite.js`): Full drag/drop implementation for Ready ↔ Spent states
- **ActionPalette** (`scripts/ui/action-palette/action-palette.js`): Full drag/drop with visual feedback
- **NonheroicUnitsBrowser** (`scripts/apps/nonheroic-units-browser.js`): Drag templates to NPC sheet

### What's Broken ❌
- **Character Sheet Force Tab** (`force-tab.hbs` + `character-sheet.js`):
  - Template has drag UI (`draggable="true"`, `drop-zone` classes)
  - No JavaScript drag/drop event handlers
  - No click handlers for `addToSuite`, `removeFromSuite`, `usePower` buttons
  - Expected: Drag forces between "Known Powers" ↔ "Active Suite"

- **Character Sheet Starship Maneuvers Tab** (`starship-maneuvers-tab.hbs` + `character-sheet.js`):
  - Template has drag UI (`draggable="true"`, `drop-zone` classes)
  - Completely missing any handlers (drag/drop and button clicks)
  - No click handlers for `addToSuite`, `removeFromSuite`, `useManeuver`, `regainManeuver` buttons
  - Expected: Drag maneuvers between "Known Maneuvers" ↔ "Active Suite"

- **CSS Styling:**
  - Force power cards: No `.dragging` or `.drag-over` visual feedback
  - Maneuver cards: No `.dragging` or `.drag-over` visual feedback
  - Action Palette has it (reference implementation)

---

## Implementation Tasks

### TASK 1: Add Force Tab Drag & Drop Handlers to Character Sheet

**File:** `scripts/sheets/v2/character-sheet.js`

**Location:** In the `_onRender()` method, around line 574-600 (where other tab handlers are)

**What to implement:**

1. **Button Click Handlers** (addToSuite, removeFromSuite, usePower):
   ```javascript
   // Handler for "Add to Suite" button in Known Powers section
   for (const btn of root.querySelectorAll('.force-tab [data-action="addToSuite"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       // Update item's system.inSuite property to true
       await item.update({ 'system.inSuite': true });
     });
   }

   // Handler for "Remove from Suite" button in Active Suite section
   for (const btn of root.querySelectorAll('.force-tab [data-action="removeFromSuite"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       // Update item's system.inSuite property to false
       await item.update({ 'system.inSuite': false });
     });
   }

   // Handler for "Use Power" button (consume Force Points)
   for (const btn of root.querySelectorAll('.force-tab [data-action="usePower"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       const cost = item.system?.cost ?? 1;
       const current = this.document.system.forcePoints?.value ?? 0;

       if (current < cost) {
         ui.notifications.warn(`Insufficient Force Points (need ${cost}, have ${current})`);
         return;
       }

       // Deduct Force Points
       await this.document.update({
         'system.forcePoints.value': Math.max(0, current - cost)
       });
       ui.notifications.info(`Used ${item.name}, spent ${cost} Force Point(s)`);
     });
   }
   ```

2. **Drag Event Handlers** (dragstart, dragover, drop):
   ```javascript
   // Set up drag handlers for power cards in force tab
   const forcePowerZones = root.querySelectorAll('.force-tab .drop-zone');

   // dragstart: When user starts dragging a power card
   for (const card of root.querySelectorAll('.force-tab .power-card[draggable]')) {
     card.addEventListener('dragstart', (evt) => {
       const itemId = evt.currentTarget.dataset.itemId;
       evt.dataTransfer.effectAllowed = 'move';
       evt.dataTransfer.setData('power', itemId);
       evt.currentTarget.classList.add('dragging');
     });

     card.addEventListener('dragend', (evt) => {
       evt.currentTarget.classList.remove('dragging');
     });
   }

   // dragover: Allow drop on zone
   for (const zone of forcePowerZones) {
     zone.addEventListener('dragover', (evt) => {
       evt.preventDefault();
       evt.dataTransfer.dropEffect = 'move';
       zone.classList.add('drag-over');
     });

     zone.addEventListener('dragleave', (evt) => {
       // Only remove if leaving the zone itself, not child elements
       if (evt.target === zone) {
         zone.classList.remove('drag-over');
       }
     });

     // drop: Handle drop on zone
     zone.addEventListener('drop', async (evt) => {
       evt.preventDefault();
       zone.classList.remove('drag-over');

       const itemId = evt.dataTransfer.getData('power');
       const targetZone = evt.currentTarget.dataset.zone; // 'known' or 'suite'

       if (!itemId) return;

       const item = this.document.items.get(itemId);
       if (!item) return;

       // Update item based on target zone
       if (targetZone === 'suite') {
         await item.update({ 'system.inSuite': true });
       } else if (targetZone === 'known') {
         await item.update({ 'system.inSuite': false });
       }
     });
   }
   ```

**Note:** Check the data structure of force power items (system.inSuite vs system.active vs system.spent) and adjust property names accordingly.

---

### TASK 2: Add Starship Maneuvers Tab Drag & Drop Handlers to Character Sheet

**File:** `scripts/sheets/v2/character-sheet.js`

**Location:** Immediately after force tab handlers (around line 625)

**What to implement:**

Same pattern as Task 1, but for maneuvers:

1. **Button Click Handlers** (addToSuite, removeFromSuite, useManeuver, regainManeuver):
   ```javascript
   // "Add to Suite" button
   for (const btn of root.querySelectorAll('.starship-maneuvers-tab [data-action="addToSuite"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       await item.update({ 'system.inSuite': true });
     });
   }

   // "Remove from Suite" button
   for (const btn of root.querySelectorAll('.starship-maneuvers-tab [data-action="removeFromSuite"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       await item.update({ 'system.inSuite': false });
     });
   }

   // "Use Maneuver" button (mark as spent)
   for (const btn of root.querySelectorAll('.starship-maneuvers-tab [data-action="useManeuver"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       await item.update({ 'system.spent': true });
     });
   }

   // "Regain Maneuver" button (mark as available)
   for (const btn of root.querySelectorAll('.starship-maneuvers-tab [data-action="regainManeuver"]')) {
     btn.addEventListener('click', async (evt) => {
       evt.preventDefault();
       const itemId = evt.currentTarget.closest('[data-item-id]').dataset.itemId;
       const item = this.document.items.get(itemId);
       await item.update({ 'system.spent': false });
     });
   }
   ```

2. **Drag Event Handlers** (same pattern as force tab):
   ```javascript
   // Drag handlers for maneuver cards
   const maneuverZones = root.querySelectorAll('.starship-maneuvers-tab .drop-zone');

   for (const card of root.querySelectorAll('.starship-maneuvers-tab .maneuver-card[draggable]')) {
     card.addEventListener('dragstart', (evt) => {
       const itemId = evt.currentTarget.dataset.itemId;
       evt.dataTransfer.effectAllowed = 'move';
       evt.dataTransfer.setData('maneuver', itemId);
       evt.currentTarget.classList.add('dragging');
     });

     card.addEventListener('dragend', (evt) => {
       evt.currentTarget.classList.remove('dragging');
     });
   }

   for (const zone of maneuverZones) {
     zone.addEventListener('dragover', (evt) => {
       evt.preventDefault();
       evt.dataTransfer.dropEffect = 'move';
       zone.classList.add('drag-over');
     });

     zone.addEventListener('dragleave', (evt) => {
       if (evt.target === zone) {
         zone.classList.remove('drag-over');
       }
     });

     zone.addEventListener('drop', async (evt) => {
       evt.preventDefault();
       zone.classList.remove('drag-over');

       const itemId = evt.dataTransfer.getData('maneuver');
       const targetZone = evt.currentTarget.dataset.zone; // 'known' or 'suite'

       if (!itemId) return;

       const item = this.document.items.get(itemId);
       if (!item) return;

       if (targetZone === 'suite') {
         await item.update({ 'system.inSuite': true });
       } else if (targetZone === 'known') {
         await item.update({ 'system.inSuite': false });
       }
     });
   }
   ```

---

### TASK 3: Add CSS Styling for Drag States

**File:** `styles/sheets/character-sheet.css`

**What to add:**

```css
/* ==================== DRAG & DROP STATES ==================== */

/* Force Tab drag states */
.force-tab .power-card {
  transition: all 0.15s ease;
}

.force-tab .power-card.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  cursor: grabbing;
}

.force-tab .drop-zone {
  transition: all 0.2s ease;
  position: relative;
}

.force-tab .drop-zone.drag-over {
  background-color: rgba(0, 217, 255, 0.1);
  border: 2px dashed var(--swse-accent);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.3) inset;
}

.force-tab .drop-zone.drag-over::after {
  content: 'Drop power here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--swse-accent);
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

/* Starship Maneuvers Tab drag states */
.starship-maneuvers-tab .maneuver-card {
  transition: all 0.15s ease;
}

.starship-maneuvers-tab .maneuver-card.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  cursor: grabbing;
}

.starship-maneuvers-tab .drop-zone {
  transition: all 0.2s ease;
  position: relative;
}

.starship-maneuvers-tab .drop-zone.drag-over {
  background-color: rgba(0, 217, 255, 0.1);
  border: 2px dashed var(--swse-accent);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.3) inset;
}

.starship-maneuvers-tab .drop-zone.drag-over::after {
  content: 'Drop maneuver here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--swse-accent);
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

/* Draggable cursor hint */
.power-card[draggable="true"],
.maneuver-card[draggable="true"] {
  cursor: grab;
}

.power-card[draggable="true"]:active,
.maneuver-card[draggable="true"]:active {
  cursor: grabbing;
}
```

---

## Verification Checklist

### Before Starting
- [ ] Review ForceSuiteComponent (`scripts/components/force-suite.js`) for reference implementation
- [ ] Check ActionPalette CSS for drag state styling reference
- [ ] Verify force-tab.hbs structure and data-zone attributes
- [ ] Verify starship-maneuvers-tab.hbs structure and data-zone attributes
- [ ] Confirm force power item data structure (what property controls "in suite"?)
- [ ] Confirm maneuver item data structure

### During Implementation
- [ ] Add force tab handlers to character-sheet.js _onRender()
- [ ] Test force tab drag/drop in character sheet
- [ ] Test force tab button clicks
- [ ] Add maneuver tab handlers to character-sheet.js _onRender()
- [ ] Test maneuver tab drag/drop
- [ ] Test maneuver tab button clicks
- [ ] Add CSS classes for drag states
- [ ] Test visual feedback while dragging

### After Implementation
- [ ] Test dragging power from "Known Powers" to "Active Suite"
- [ ] Test dragging power from "Active Suite" back to "Known Powers"
- [ ] Test "Add to Suite" button
- [ ] Test "Remove from Suite" button
- [ ] Test "Use Power" button (verify Force Points deduct)
- [ ] Test same workflows for maneuvers
- [ ] Test visual feedback (opacity, highlight, borders)
- [ ] Test with multiple force powers/maneuvers
- [ ] Test on NPC sheet (if applicable)
- [ ] Test on Droid sheet (if applicable)
- [ ] Verify no console errors
- [ ] Verify sheet refresh after item updates

---

## Key Implementation Details

### Data Properties
**Critical:** Verify these property names by checking item templates or a character's force power items:
- Force power "in suite" property: Likely `system.inSuite` or `system.active`
- Maneuver "in suite" property: Likely `system.inSuite` or `system.active`
- Maneuver "spent" property: Likely `system.spent` or `system.used`

If properties differ, update code accordingly.

### Event Binding Location
- Add all handlers to `_onRender()` method in character-sheet.js
- Bind to `root` parameter (the rendered sheet's HTML)
- Use `html.querySelectorAll()` pattern consistent with existing handlers

### Selector Patterns
Reference existing selectors in character-sheet.js to match DOM structure:
- Force cards: `.force-tab .power-card[draggable]`
- Force zones: `.force-tab .drop-zone`
- Maneuver cards: `.starship-maneuvers-tab .maneuver-card[draggable]`
- Maneuver zones: `.starship-maneuvers-tab .drop-zone`

### Item Update Pattern
Use `item.update()` which is established pattern:
```javascript
await item.update({ 'system.propertyName': newValue });
```

---

## Expected Results

After implementation:
1. Users can drag force powers between "Known Powers" and "Active Suite"
2. Users can drag maneuvers between "Known Maneuvers" and "Active Suite"
3. Buttons ("Add to Suite", "Remove from Suite", etc.) fully functional
4. Visual feedback (highlighting, opacity) during drag operations
5. No console errors
6. No silent failures when interacting with these tabs

---

## Architecture Notes

### Design Decision Made
Current implementation targets adding handlers directly to character-sheet.js rather than creating separate ForceSuite/ManeuveriusManager components.

**Rationale:**
- Simpler integration with existing sheet structure
- Consistent with how other sheet tabs are handled
- ForceSuiteComponent exists but is rendered separately; reusing it would require refactoring
- Handlers are straightforward and maintainable inline

### Future Optimization (Not In Scope)
- Could extract into separate handler classes/modules if many more features added
- Could consolidate force/maneuver handling into shared utility
- Could refactor to use ForceSuiteComponent pattern for consistency

---

## Files Modified Summary

| File | Changes | Lines |
|------|---------|-------|
| `scripts/sheets/v2/character-sheet.js` | Add force tab handlers | +80 |
| `scripts/sheets/v2/character-sheet.js` | Add maneuver tab handlers | +80 |
| `styles/sheets/character-sheet.css` | Add drag state styling | +60 |
| **Total** | | **~220 lines** |

---

## Testing Strategy

### Manual Testing
1. Load a character with force powers
2. Click "Add to Suite" → should move power to active suite
3. Drag power back to "Known Powers" → should move to known powers
4. Drag power from "Known" to "Suite" → should work
5. Click "Use Power" → should deduct Force Points and show notification
6. Repeat for maneuvers

### Edge Cases to Test
- No force powers/maneuvers available
- Dragging same item between zones
- Dragging while another drag is in progress
- Sheet refresh after drag/drop
- Multiple users (if multiplayer)

---

## Related Files (Reference Only)

Do not modify these, but use as reference:
- `scripts/components/force-suite.js` - Reference for drag/drop pattern
- `scripts/ui/action-palette/action-palette.js` - Reference for CSS styling
- `scripts/drag-drop/drop-handler.js` - Reference for item handling
- `templates/actors/character/tabs/force-tab.hbs` - Template structure
- `templates/actors/character/tabs/starship-maneuvers-tab.hbs` - Template structure

---

## Notes for Implementation

1. **Do not** refactor existing force suite component
2. **Do** follow the exact event binding patterns shown in existing handlers
3. **Do** test thoroughly with both force powers and maneuvers
4. **Do** check browser console for any errors during drag operations
5. **Consider** adding console.log() during testing to verify handlers fire
6. **Remember** to handle edge cases (missing items, invalid data, etc.)

---

## Commit Message Template

```
Implement drag-and-drop for Force Powers and Starship Maneuvers

- Add force tab drag/drop handlers (Known Powers ↔ Active Suite)
- Add maneuver tab drag/drop handlers (Known Maneuvers ↔ Active Suite)
- Implement click handlers for suite management buttons
- Add CSS styling for drag state visual feedback
- Fixes silent failures when users interact with force/maneuver tabs
- Follows established event binding patterns in character-sheet.js

https://claude.ai/code/session_[SESSION_ID]
```

---

## Questions to Resolve Before Implementing

These are questions a fresh version of you should answer by examining the codebase:

1. **Force Power Property Names:**
   - What property controls whether a force power is "in suite"?
   - Is it `system.inSuite`, `system.active`, or something else?
   - Check: Open a character in Foundry and inspect a force power item's data

2. **Maneuver Property Names:**
   - What property controls whether a maneuver is "in suite"?
   - What property controls whether a maneuver is "spent"?
   - Check: Same as above for maneuver items

3. **Sheet Structure Verification:**
   - Does force tab actually use `class="force-tab"` selector?
   - Does maneuver tab use `class="starship-maneuvers-tab"` selector?
   - Check the _onRender() method to see how tabs are structured

4. **Button Data Attributes:**
   - Are buttons using `data-action` attribute?
   - What are exact values ("addToSuite", "removeFromSuite", etc.)?
   - Check template files to confirm selector patterns

5. **Force Points Mechanic:**
   - Where are Force Points stored in actor data?
   - Is it `system.forcePoints.value`?
   - Can they go negative or is there validation?
   - Check template.json

6. **Item IDs:**
   - Are items using `data-item-id` attribute in templates?
   - Are there alternative ID attributes?
   - Check template structure

---

## DONE: Ready for Fresh Implementation

This plan is complete and self-contained. A developer should be able to implement all tasks following this document without additional research.

Last Updated: [Current Date]
