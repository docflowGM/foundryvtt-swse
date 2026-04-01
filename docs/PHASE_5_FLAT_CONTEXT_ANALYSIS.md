# Phase 5 Flat Context Analysis

## Current State (Line 924-974 in character-sheet.js)

### Legacy Flat Context Still Being Provided

The following flat context objects are still being passed to templates (even though panels are now the primary source):

1. **biography** - Should be provided by biographyPanel
2. **derived** - Derived calculations (should be componentized by panels)
3. **inventory** - Should be provided by inventoryPanel
4. **hp** - Should be provided by healthPanel
5. **bonusHp** - Should be provided by healthPanel
6. **conditionSteps** - Should be provided by healthPanel
7. **initiativeTotal, speed, perceptionTotal, bab, grappleBonus** - Action economy
8. **forcePointsValue, forcePointsMax** - Force points
9. **destinyPointsValue, destinyPointsMax** - Destiny points
10. **combat** - Combat context
11. **forcePoints, forceTags, forceSuite** - Force powers
12. **lowHand** - Force suite helper
13. **darkSideMax, darkSideSegments** - Should be provided by darkSidePanel
14. **abilities, headerDefenses** - Should be in appropriate panels
15. **forceSensitive, identityGlowColor, classDisplay** - UI state
16. **buildMode, actionEconomy, xpEnabled, xpPercent, xpLevelReady, xpData** - Sheet state
17. **isLevel0, isGM** - User/actor permissions
18. **fpAvailable, totalWeight** - Inventory/resource state
19. **encumbranceStateCss, encumbranceLabel** - UI styling
20. **inventorySearch, allEquipment, totalEquipmentWeight** - Inventory helpers
21. **equippedArmor** - Should be derived from inventory
22. **combatNotesText** - Should be provided by panel
23. **totalTalentCount** - Should be provided by talentPanel
24. **relationships** - Should be provided by panel
25. **followerSlots, followerTalentBadges, hasAvailableFollowerSlots** - Relationship data
26. **ownedActorMap** - Used for follower mapping

## Assessment

### Can Be Safely Removed (Already Panelized)
- `hp` → healthPanel.hp
- `bonusHp` → healthPanel.bonusHp
- `conditionSteps` → healthPanel.conditionSlots
- `darkSideMax, darkSideSegments` → darkSidePanel properties
- `combatNotesText` → specialCombatActionsPanel (if registered)
- `equippedArmor` → armorSummaryPanel (if registered)
- `totalTalentCount` → talentPanel.stats

### Should Remain (UI/Permissions/State)
- `buildMode` - Sheet view mode
- `isGM, isLevel0` - Permission/state checks
- `actionEconomy, combat` - Complex computed state
- `xpEnabled, xpData` - XP system state
- `ownedActorMap` - For relationship rendering
- `followerSlots, followerTalentBadges` - Complex relationship data
- `encumbranceStateCss, encumbranceLabel` - UI helpers
- `identityGlowColor` - Theming

### Complex/Distributed
- `derived` - Should be componentized into panels
- `inventory` - Should be in inventoryPanel
- `biography` - Should be in biographyPanel
- `abilities, headerDefenses` - Should be in appropriate panels

## Phase 5.2 Strategy

1. **Verify** - Confirm no templates depend on the removable flat context
2. **Migrate** - Ensure all required data is in panel contexts
3. **Remove** - Delete flat context from character-sheet.js
4. **Test** - Verify sheet still renders correctly
5. **Validate** - Run panel assertions and post-render checks

## Migration Checklist

- [ ] Verify all panel contexts are being built correctly
- [ ] Check each flat context variable for remaining template usage
- [ ] Identify any missed panelization opportunities
- [ ] Remove safely removable flat context
- [ ] Keep UI/permission/state variables
- [ ] Document any justified exceptions
