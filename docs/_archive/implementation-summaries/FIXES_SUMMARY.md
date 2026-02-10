# Character Sheet Fixes Summary

## Completed Fixes

### 1. **Critical Bug Fixes**
- ✅ **Fixed line 379 undefined event variable** - Removed unused `event` reference in `_postCombatActionDescription()` method (scripts/actors/character/swse-character-sheet.js:379)

### 2. **Item Editing - Missing Data Attributes**
- ✅ **Added data-action="edit" to inventory tab** - Equipment items can now be edited from inventory tab (templates/actors/character/tabs/inventory-tab.hbs:22)
- ✅ **Added data-action="delete" to inventory tab** - Equipment items can now be deleted from inventory tab (templates/actors/character/tabs/inventory-tab.hbs:25)
- ✅ **Added data-action="edit" to combat tab feats** - Feats can now be edited from combat tab (templates/actors/character/tabs/combat-tab.hbs:159)
- ✅ **Added data-action="delete" to combat tab feats** - Feats can now be deleted from combat tab (templates/actors/character/tabs/combat-tab.hbs:162)

### 3. **Force Suite Handlers**
- ✅ **Implemented _onAddToSuite()** - Adds Force Powers to active suite with capacity checking (scripts/actors/character/swse-character-sheet.js:683-713)
- ✅ **Implemented _onRemoveFromSuite()** - Removes Force Powers from active suite (scripts/actors/character/swse-character-sheet.js:718-737)

### 4. **Talent Tree Handlers**
- ✅ **Implemented _onToggleTree()** - Expands/collapses talent trees (scripts/actors/character/swse-character-sheet.js:742-758)
- ✅ **Implemented _onSelectTalent()** - Selects talents with prerequisite checking and locked state validation (scripts/actors/character/swse-character-sheet.js:763-803)
- ✅ **Implemented _onViewTalent()** - Opens talent sheets for viewing details (scripts/actors/character/swse-character-sheet.js:808-826)

### 5. **House Rules Integration**
- ✅ **Connected talentEveryLevel house rule to getsTalent()** - When enabled, grants talents every level (scripts/apps/levelup/levelup-talents.js:20-26)
  - Setting location: Game Settings → House Rules → Advancement → "Talent Every Level"
  - Also available in "Heroic Campaign" preset

## Findings from Analysis

### What Works Well ✅
1. **Combat Actions** - Properly connected to skills with DCs (12 auto-rollable flat DC actions)
2. **Level Up & Character Generation** - Fully functional with robust 9-type validation system
3. **Most Buttons** - 71% (17/24) working correctly
4. **Items** - Fully editable (with the fixes above)
5. **Droids in Crew** - Can occupy vehicle crew positions

### What's Partially Working ⚠️
1. **Item Editing** - Now fixed with data-action attributes
2. **Talent House Rule** - Now connected to level-up logic
3. **Crew Positions** - Can assign crew but skill rolling needs more work (see below)

### What's Not Implemented ❌
1. **Player Override on Advancement** - No bypass mechanism exists (by design)
2. **Ships/Droids as Items** - They're actors, not inventory items (by design)
3. **Dynamic Crew Positions** - 6 hardcoded positions (enhancement needed)
4. **Crew Position Skill Rolling** - Needs significant refactoring (see below)

## Features Requiring Further Work

### 1. GM Override for Advancement Errors
**Status:** Not Implemented
**Reason:** This requires design decisions about security model
**Options:**
- Add GM-only bypass button in level-up dialog
- Add house rule setting to allow prerequisite overrides
- Add per-check override confirmations

**Implementation Complexity:** Medium (2-4 hours)

### 2. Crew Position Skill Rolling
**Status:** Not Implemented
**Reason:** Requires data model changes and significant refactoring

**Current Implementation:**
- Crew members stored as **names (strings)**, not actor references
- Ship combat actions exist and are mapped to positions
- No skill roll integration

**Required Changes:**
1. **Data Model** - Change from storing names to storing actor UUIDs
   - Modify: `scripts/data-models/vehicle-data-model.js`
   - Add migration for existing vehicles
2. **Crew Assignment** - Update to store both name and UUID
   - Modify: `scripts/actors/vehicle/swse-vehicle.js` `_onCrewDrop()`
3. **Skill Roll Buttons** - Add roll handlers for crew actions
   - Add new method: `_onRollCrewAction(position, skillKey, dc)`
   - Fetch crew member actor from UUID
   - Use crew member's skill modifier for roll
4. **Template Updates** - Add skill roll buttons to crew actions panel
   - Modify: `templates/actors/vehicle/vehicle-sheet.hbs`
   - Modify: `templates/partials/ship-combat-actions-panel.hbs`

**Skill Mappings Already Defined:**
- **Pilot** → Pilot skill (Evasive Action, Ram, Attack Run)
- **Gunner** → Pilot/attack rolls (weapon systems)
- **Engineer** → Mechanics (Jury-Rig, Repair, Boost Shields)
- **Shields** → Mechanics (Raise/Lower, Redirect)
- **Commander** → Persuasion (Inspire Crew, Coordinate)

**Implementation Complexity:** High (6-10 hours)

**Recommended Approach:**
```javascript
// Example implementation for crew skill rolling
async _onRollCrewAction(event) {
  const position = event.currentTarget.dataset.position;
  const actionName = event.currentTarget.dataset.actionName;
  const skillKey = event.currentTarget.dataset.skillKey;

  // Get crew member UUID
  const crewUuid = this.actor.system.crewPositions[position]?.uuid;
  if (!crewUuid) {
    ui.notifications.warn(`No crew member assigned to ${position}`);
    return;
  }

  // Load crew member actor
  const crewMember = await fromUuid(crewUuid);
  if (!crewMember) {
    ui.notifications.error(`Cannot find crew member`);
    return;
  }

  // Roll using crew member's skill
  await SWSERoll.rollCombatActionCheck(crewMember, skillKey, {
    name: actionName,
    vehicleName: this.actor.name
  });
}
```

### 3. Dynamic Crew Position Management
**Status:** Not Implemented
**Reason:** Hardcoded in data model

**Required Changes:**
1. Change data model from fixed schema to array
2. Add UI for adding/removing positions
3. Update all references to crew positions

**Implementation Complexity:** Medium (4-6 hours)

## Files Modified

1. `scripts/actors/character/swse-character-sheet.js` - Added Force Suite and Talent Tree handlers, fixed bug
2. `templates/actors/character/tabs/inventory-tab.hbs` - Added data-action attributes
3. `templates/actors/character/tabs/combat-tab.hbs` - Added data-action attributes
4. `scripts/apps/levelup/levelup-talents.js` - Connected talentEveryLevel house rule

## Testing Recommendations

1. **Item Editing** - Test editing equipment from inventory tab and feats from combat tab
2. **Force Suite** - Test adding/removing powers with capacity limits
3. **Talent Trees** - Test expanding/collapsing trees and selecting talents
4. **House Rule** - Enable "Talent Every Level" and verify it appears in level-up
5. **Combat Actions** - Verify existing skill rolling still works

## Known Limitations

1. **Talent Selection** - Currently opens talent sheet; may want inline selection in future
2. **Force Suite** - Uses `inSuite` property on power items; ensure data model supports this
3. **Crew Positions** - Still uses name strings; UUID storage would enable skill rolling
4. **Override Mechanism** - Not implemented; validation remains strict for all users

## Recommendations for Future Development

1. **Crew System Overhaul** - Implement full UUID-based crew with skill rolling
2. **Override System** - Add GM bypass options with audit logging
3. **Dynamic Positions** - Allow custom crew positions per vehicle type
4. **Integration Testing** - Create automated tests for all button handlers
5. **Migration System** - Add data migrations for breaking changes to crew positions
