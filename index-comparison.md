# Index.js Comparison Analysis

## Current Index.js Imports (Complete List)

### Actor System
- `SWSEActorBase` from `./scripts/actors/base/swse-actor-base.js`
- `SWSECharacterSheet` from `./scripts/actors/character/swse-character-sheet.js`
- `SWSEDroidSheet` from `./scripts/actors/droid/swse-droid.js`
- `SWSENPCSheet` from `./scripts/actors/npc/swse-npc.js`
- `SWSEVehicleSheet` from `./scripts/actors/vehicle/swse-vehicle.js`

### Item System
- `SWSEItemBase` from `./scripts/items/base/swse-item-base.js`
- `SWSEItemSheet` from `./scripts/items/swse-item-sheet.js`

### Data Models (CRITICAL for Foundry V11+)
- `SWSECharacterDataModel` from `./scripts/data-models/character-data-model.js`
- `SWSEVehicleDataModel` from `./scripts/data-models/vehicle-data-model.js`
- `WeaponDataModel, ArmorDataModel, FeatDataModel, TalentDataModel, ForcePowerDataModel, ClassDataModel, SpeciesDataModel` from `./scripts/data-models/item-data-models.js`

### Core Systems
- `registerHandlebarsHelpers` from `./helpers/handlebars/index.js`
- `preloadHandlebarsTemplates` from `./scripts/core/load-templates.js`
- `WorldDataLoader` from `./scripts/core/world-data-loader.js`

### Hooks
- `registerInitHooks` from `./scripts/hooks/index.js`

### Utilities
- `SWSENotifications` from `./scripts/utils/notifications.js`
- `SWSELogger` from `./scripts/utils/logger.js`
- `ThemeLoader` from `./scripts/theme-loader.js`
- `./scripts/utils/skill-use-filter.js` (side-effect import)
- `createItemMacro` from `./scripts/macros/item-macro.js`

### Configuration
- `SWSE_SKILLS, getSkillConfig, getSkillsArray` from `./scripts/config/skills.js`

### Components
- `ConditionTrackComponent` from `./scripts/components/condition-track.js`
- `ForceSuiteComponent` from `./scripts/components/force-suite.js`

### Migration Scripts (Side-effect imports)
- `./scripts/migration/fix-defense-schema.js`
- `./scripts/migration/fix-actor-size.js`
- `./scripts/migration/actor-validation-migration.js`
- `./scripts/migration/item-validation-migration.js`
- `./scripts/migration/populate-force-compendiums.js`

### Combat Systems
- `SWSECombatDocument` from `./scripts/combat/swse-combat.js`
- `SWSECombatant` from `./scripts/combat/swse-combatant.js`
- `DamageSystem` from `./scripts/combat/damage-system.js`
- `SWSECombatAutomation` from `./scripts/combat/combat-automation.js`
- `SWSECombatIntegration` from `./scripts/combat/combat-integration.js`
- `SWSEActiveEffectsManager` from `./scripts/combat/active-effects-manager.js`
- `CombatActionsMapper` from `./scripts/combat/utils/combat-actions-mapper.js`
- `SWSECombat` from `./scripts/combat/systems/enhanced-combat-system.js`
- `SWSEGrappling` from `./scripts/combat/systems/grappling-system.js`
- `SWSEVehicleCombat` from `./scripts/combat/systems/vehicle-combat-system.js`

### Force Powers
- `ForcePowerManager` from `./scripts/utils/force-power-manager.js`
- `initializeForcePowerHooks` from `./scripts/hooks/force-power-hooks.js`

### Performance & Optimization
- `cacheManager` from `./scripts/core/cache-manager.js`
- `dataPreloader` from `./scripts/core/data-preloader.js`
- `errorHandler, errorCommands, logError` from `./scripts/core/error-handler.js`
- `lazyLoader` from `./scripts/core/lazy-loader.js`
- `perfMonitor, debounce, throttle` from `./scripts/utils/performance-utils.js`

### Applications
- `./scripts/apps/chargen-init.js` (side-effect import)
- `SWSEStore` from `./scripts/apps/store/store-main.js`
- `SWSELevelUp` from `./scripts/apps/swse-levelup.js`
- `SWSEUpgradeApp` from `./scripts/apps/upgrade-app.js`
- `VehicleModificationManager` from `./scripts/apps/vehicle-modification-manager.js`
- `VehicleModificationApp` from `./scripts/apps/vehicle-modification-app.js`

### Drag & Drop
- `DropHandler` from `./scripts/drag-drop/drop-handler.js`

### Chat
- `./scripts/chat/chat-commands.js` (side-effect import)

### Canvas UI
- `CanvasUIManager` from `./scripts/canvas-ui/canvas-ui-manager.js`

### House Rules & GM Tools
- `registerHouseruleSettings` from `./scripts/houserules/houserule-settings.js`
- `HouseruleMechanics` from `./scripts/houserules/houserule-mechanics.js`
- `HouserulesConfig` from `./scripts/houserules/houserules-config.js`
- `SWSEHomebrewManager` from `./scripts/gm-tools/homebrew-manager.js`

---

## Proposed Index.js Imports

### Actor System
- `ActorSWSE` from `./actor-swse.js` ❌ (file doesn't exist)

### Item System
- `ItemSWSE` from `./item-swse.js` ❌ (file doesn't exist)

### Sheets
- `ActorSheetSWSE` from `./actor-sheet.js` ❌ (file doesn't exist, needs 4 separate sheets)
- `ItemSheetSWSE` from `./item-sheet.js` ❌ (file doesn't exist)

### Subsystems
- `GrapplingSystem` from `./grappling.js` ❌ (wrong path)
- `VehicleCombatSystem` from `./vehicle-combat.js` ❌ (wrong path)
- `ForcePowers` from `./force-powers.js` ❌ (not a single module)
- `VehicleModifications` from `./vehicle-modifications.js` ❌ (not a single module)
- `HouseRules` from `./house-rules.js` ❌ (not a single module)
- `StoreApp` from `./store-app.js` ❌ (wrong path)
- `UpgradeApp` from `./upgrade-app.js` ❌ (wrong path)
- `LevelUpApp` from `./levelup-app.js` ❌ (wrong path)
- `ConditionTracker` from `./condition-tracker.js` ❌ (wrong path)
- `CanvasUI` from `./canvas-ui.js` ❌ (wrong path)
- `ErrorHandler` from `./error-handler.js` ❌ (wrong path)
- `Performance` from `./performance.js` ❌ (wrong path)

### Helpers
- `swseHelpers` from `./helpers.js` ⚠️ (should be `./helpers/handlebars/index.js`)

---

## CRITICAL MISSING IMPORTS in Proposed Version

### 🚨 CRITICAL - Will Break System
1. **Data Models** - Not imported at all
   - Without these, CONFIG.Actor.dataModels and CONFIG.Item.dataModels won't be configured
   - Foundry V11+ REQUIRES data models

2. **Combat Documents** - Not imported
   - SWSECombatDocument
   - SWSECombatant
   - These are configured as CONFIG.Combat.documentClass and CONFIG.Combatant.documentClass

3. **Multiple Actor Sheets** - Only imports one generic sheet
   - Needs: Character, Droid, NPC, Vehicle sheets (4 separate classes)
   - Each has unique functionality

4. **Damage System** - Missing
   - Critical for combat calculations

5. **Combat Automation** - Missing
   - SWSECombatAutomation
   - SWSECombatIntegration
   - SWSEActiveEffectsManager

### ⚠️ IMPORTANT - Will Reduce Functionality
6. **World Data Loader** - Missing
7. **Theme Loader** - Missing
8. **Migration Scripts** - Missing (will break upgrades)
9. **CharGen System** - Missing
10. **Force Power Manager** - Missing (just imports a generic ForcePowers)
11. **Cache Manager** - Missing
12. **Data Preloader** - Missing
13. **Lazy Loader** - Missing
14. **Logger & Notifications** - Missing
15. **Drop Handler** - Missing
16. **Chat Commands** - Missing
17. **Homebrew Manager** - Missing
18. **Skills Configuration** - Missing
19. **Force Suite Component** - Missing
20. **Combat Actions Mapper** - Missing

### 📋 Configuration Issues
- No CONFIG.Actor.dataModels setup
- No CONFIG.Item.dataModels setup
- No CONFIG.Combat.documentClass setup
- No CONFIG.Combatant.documentClass setup
- No sheet registration for multiple actor types
- No system settings registration
- No Handlebars helpers registration (inline)
- No template preloading

---

## Verdict: ❌ CANNOT REPLACE CURRENT INDEX.JS

**Why Not:**
1. **All file paths are wrong** - None of the imports match actual file locations
2. **Critical systems missing** - Data models, combat documents, damage system
3. **Oversimplified** - Tries to consolidate 10+ modules into single imports that don't exist
4. **No configuration** - Missing all CONFIG setup that Foundry requires
5. **Will break on load** - All imports will fail with 404 errors

**To Use Proposed Structure, You Would Need To:**
1. Create 15+ new wrapper files in the root directory
2. Re-export everything from actual locations
3. Create new classes that don't exist (ForcePowers, HouseRules, etc.)
4. Rewrite initialization logic across the system
5. Risk breaking existing functionality
6. Add back all the missing critical systems

**Estimated Work:** 20-30 hours of refactoring + extensive testing

---

## Recommendation: KEEP CURRENT INDEX.JS

The current index.js is:
- ✅ Functionally complete
- ✅ Well-organized with comments
- ✅ Uses correct file paths
- ✅ Properly configures all Foundry systems
- ✅ Includes all critical imports
- ✅ Battle-tested and working

**Minor Improvements You Could Make:**
1. Add a table of contents at the top
2. Break registerSystemSettings() into a separate file
3. Add more section documentation
4. Extract the large hook handlers to separate files

But the structure is solid and should NOT be replaced with the proposed version.
