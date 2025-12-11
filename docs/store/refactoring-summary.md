# Store.js Refactoring Summary

## Overview
Successfully split the large 1,693-line `store.js` file into 6 focused, maintainable modules.

## Files Created

### Module Structure
```
scripts/apps/
├── store.js (6 lines) - Main entry point, re-exports SWSEStore
└── store/
    ├── store-main.js (514 lines) - Main app class and UI orchestration
    ├── store-shared.js (551 lines) - Shared utilities and constants
    ├── store-checkout.js (453 lines) - Purchase/sell logic and credit handling
    ├── store-inventory.js (167 lines) - Inventory management and item filtering
    ├── store-filters.js (160 lines) - Item filtering, search, and categories
    └── store-pricing.js (66 lines) - Price calculations, discounts, multipliers
```

**Total:** 1,917 lines (224 lines added for better structure and documentation)

## Responsibility Division

### 1. **store.js** (6 lines)
- **Purpose:** Main entry point for backward compatibility
- **Exports:** Re-exports `SWSEStore` from `store-main.js`
- **Dependencies:** None (just re-export)

### 2. **store-main.js** (514 lines)
- **Purpose:** Main application class and UI orchestration
- **Contains:**
  - `SWSEStore` class (extends FormApplication)
  - Constructor and initialization
  - `defaultOptions` static getter
  - `getData()` method
  - `activateListeners()` method
  - Event handler methods that delegate to other modules
  - Cart display and management UI
  - GM settings save method
  - Number animation utility
- **Imports From:**
  - `store-shared.js` - getRandomDialogue
  - `store-pricing.js` - getStoreMarkup, getStoreDiscount
  - `store-inventory.js` - loadInventoryData
  - `store-filters.js` - applyAvailabilityFilter, applySearchFilter, switchToPanel
  - `store-checkout.js` - All checkout functions (as namespace)
  - `../../utils/logger.js` - SWSELogger

### 3. **store-shared.js** (551 lines)
- **Purpose:** Shared utilities and constants used across modules
- **Contains:**
  - Rendarr's dialogue system (all dialogue arrays)
  - `getRendarrDialogue()` - Returns full dialogue object
  - `getRandomDialogue(context)` - Gets random dialogue for context
  - `categorizeEquipment(item)` - Categorizes equipment items
  - `sortWeapons(weapons)` - Sorts weapons by type
  - `sortArmor(armors)` - Sorts armor by type
- **Exports:** Pure utility functions with no dependencies
- **Dependencies:** None (foundational module)

### 4. **store-pricing.js** (66 lines)
- **Purpose:** Price calculation logic
- **Contains:**
  - `calculateFinalCost(baseCost)` - Applies markup/discount
  - `addFinalCost(item)` - Adds finalCost to item
  - `addActorFinalCost(actor, includeUsed)` - Adds finalCost to actor/vehicle
  - `getStoreMarkup()` - Gets current markup setting
  - `getStoreDiscount()` - Gets current discount setting
- **Dependencies:** Uses `game.settings` (Foundry API)

### 5. **store-inventory.js** (167 lines)
- **Purpose:** Inventory loading and categorization
- **Contains:**
  - `loadInventoryData(itemsById)` - Loads all items/actors from world and compendiums
  - `getServicesData()` - Returns services data structure
  - Item categorization and sorting logic
- **Imports From:**
  - `store-shared.js` - categorizeEquipment, sortWeapons, sortArmor
  - `store-pricing.js` - addFinalCost, addActorFinalCost
- **Dependencies:** Uses Foundry API (game.items, game.actors, game.packs)

### 6. **store-filters.js** (160 lines)
- **Purpose:** Filtering and search functionality
- **Contains:**
  - `applyAvailabilityFilter(doc, filterValue, itemsById)` - Filters by availability
  - `applySearchFilter(doc, searchTerm)` - Filters by search term
  - `switchToPanel(doc, tabName, itemsById, callback)` - Switches active panel/tab
- **Imports From:**
  - `store-shared.js` - getRandomDialogue
- **Dependencies:** DOM manipulation

### 7. **store-checkout.js** (453 lines)
- **Purpose:** Purchase and checkout logic
- **Contains:**
  - `addItemToCart(store, itemId, callback)` - Adds item to cart
  - `buyService(actor, serviceName, serviceCost, callbacks)` - Immediate purchase
  - `buyDroid(store, actorId)` - Creates droid actor
  - `buyVehicle(store, actorId, condition)` - Creates vehicle actor
  - `createCustomDroid(actor, closeCallback)` - Launches droid builder
  - `createCustomStarship(actor, closeCallback)` - Launches ship builder
  - `removeFromCart(cart, type, index)` - Removes cart item
  - `clearCart(cart)` - Clears entire cart
  - `calculateCartTotal(cart)` - Calculates total cost
  - `checkout(store, animateCallback)` - Completes purchase
- **Imports From:**
  - `../../utils/logger.js` - SWSELogger
  - `../chargen.js` - CharacterGenerator
  - `../vehicle-modification-app.js` - VehicleModificationApp
  - `store-pricing.js` - calculateFinalCost
  - `store-shared.js` - getRandomDialogue
- **Dependencies:** Foundry API (Actor.create, Dialog.confirm, etc.)

## Module Dependency Graph

```
store.js
  └── store-main.js
        ├── store-shared.js (dialogue, utilities)
        ├── store-pricing.js (price calculations)
        │     └── game.settings
        ├── store-inventory.js
        │     ├── store-shared.js (categorization, sorting)
        │     ├── store-pricing.js (add final costs)
        │     └── game.items, game.actors, game.packs
        ├── store-filters.js
        │     └── store-shared.js (dialogue)
        └── store-checkout.js
              ├── store-pricing.js (calculateFinalCost)
              ├── store-shared.js (dialogue)
              ├── chargen.js
              ├── vehicle-modification-app.js
              └── logger.js
```

## Import/Export Strategy

### Clean Module Boundaries
Each module has a clear responsibility and exports only what's needed:

- **store-shared.js**: Pure functions, no side effects
- **store-pricing.js**: Pure calculations based on game settings
- **store-inventory.js**: Async data loading with clear data structures
- **store-filters.js**: DOM manipulation functions
- **store-checkout.js**: Exported functions that operate on passed state
- **store-main.js**: Orchestrates all modules, maintains app state

### Backward Compatibility
The original `store.js` now acts as a thin wrapper:
```javascript
export { SWSEStore } from './store/store-main.js';
```

This means existing imports continue to work:
```javascript
import { SWSEStore } from './scripts/apps/store.js';  // Still works!
```

## Key Design Decisions

### 1. **Functional Approach for Business Logic**
Business logic modules (pricing, filters, checkout) export functions rather than classes:
- Easier to test
- No state management in business logic
- Clear data flow
- Store instance passed as parameter when needed

### 2. **State Centralized in Main Class**
All mutable state remains in `SWSEStore` class:
- `this.cart` - Shopping cart
- `this.cartTotal` - Cart total for animations
- `this.itemsById` - Item lookup map
- `this.actor` - Actor reference

### 3. **Module Independence**
Modules have minimal dependencies:
- `store-shared.js` has ZERO dependencies (pure utilities)
- `store-pricing.js` only depends on game settings
- Other modules import only what they need

### 4. **Clear Separation of Concerns**
- **UI Logic** → store-main.js
- **Data Loading** → store-inventory.js
- **Business Logic** → store-pricing.js, store-checkout.js
- **DOM Manipulation** → store-filters.js, store-main.js
- **Constants/Utilities** → store-shared.js

## Testing Considerations

### Module Testability
Each module can now be tested independently:

```javascript
// Example: Testing pricing module
import { calculateFinalCost } from './store-pricing.js';

// Mock game.settings
game.settings.get = (system, key) => {
  if (key === 'storeMarkup') return 10;
  if (key === 'storeDiscount') return 5;
};

assert.equal(calculateFinalCost(100), 105); // 100 * 1.10 * 0.95 = 104.5 → 105
```

### Integration Points
Key integration points to test:
1. store-main.js ↔ store-inventory.js (data loading)
2. store-main.js ↔ store-checkout.js (cart operations)
3. store-filters.js ↔ DOM (filtering UI)
4. store-checkout.js ↔ Foundry API (actor/item creation)

## Migration Notes

### What Changed
- ✅ File structure split into modules
- ✅ Import/export statements added
- ✅ Functions extracted from class to modules
- ✅ Better documentation and comments

### What Stayed the Same
- ✅ Exact same class interface (`SWSEStore`)
- ✅ All methods still callable the same way
- ✅ Same functionality and behavior
- ✅ Same event handlers
- ✅ Backward compatible imports

### No Breaking Changes
Existing code importing `SWSEStore` works without modification:
- `index.js` - No changes needed
- `swse-character-sheet.js` - No changes needed

## Benefits Achieved

### 1. **Maintainability**
- Each module is focused on a single responsibility
- Easy to find and fix bugs
- Clear boundaries between concerns

### 2. **Readability**
- Smaller files are easier to understand
- Clear module names indicate purpose
- Better code organization

### 3. **Testability**
- Business logic extracted to pure functions
- Modules can be tested independently
- Easy to mock dependencies

### 4. **Reusability**
- Utility functions in store-shared.js can be reused
- Pricing logic can be used elsewhere
- Inventory loading is independent

### 5. **Scalability**
- Easy to add new features to specific modules
- Can split modules further if needed
- Clear patterns for extension

## Challenges Encountered

### 1. **State Management**
**Challenge:** Deciding where to keep mutable state (cart, itemsById, etc.)

**Solution:** Kept all state in the main `SWSEStore` class, passed as parameters to module functions. This maintains single source of truth while allowing modular functions.

### 2. **Circular Dependencies**
**Challenge:** Risk of modules importing each other circularly

**Solution:** Created clear dependency hierarchy with `store-shared.js` at the bottom (no dependencies) and `store-main.js` at the top (orchestrates everything).

### 3. **Event Handler Binding**
**Challenge:** Event handlers need access to `this` (store instance)

**Solution:** Keep event handlers as methods in main class, delegate to module functions with explicit parameter passing:
```javascript
async _onCheckout(event) {
    event.preventDefault();
    await Checkout.checkout(this, this._animateNumber.bind(this));
}
```

### 4. **Preserving Functionality**
**Challenge:** Ensuring ALL functionality works exactly as before

**Solution:**
- Carefully preserved all logic during extraction
- Maintained exact same method signatures
- Used same variable names and structures
- Kept same control flow

### 5. **Module Boundaries**
**Challenge:** Deciding what goes in each module (especially checkout vs main)

**Solution:**
- Business logic → modules (checkout, pricing, inventory)
- UI orchestration → main class
- When in doubt, favor putting logic in modules (more testable)

## Future Improvements

### Potential Next Steps

1. **Add Unit Tests**
   - Test pricing calculations
   - Test inventory categorization
   - Test cart calculations

2. **Extract More Shared Code**
   - Could extract animation helpers to separate module
   - Could create a UI helpers module

3. **Type Safety**
   - Add JSDoc types throughout
   - Consider TypeScript migration

4. **Performance Optimization**
   - Lazy load inventory data
   - Cache categorized items
   - Optimize DOM updates

5. **Further Decomposition**
   - Could split store-checkout.js into:
     - `store-cart.js` (cart management)
     - `store-purchase.js` (purchase operations)
   - Could split store-inventory.js into:
     - `store-loader.js` (data loading)
     - `store-categorizer.js` (categorization)

## Conclusion

The refactoring successfully transformed a monolithic 1,693-line file into 6 focused modules:
- **514 lines** - Main UI orchestration
- **551 lines** - Shared utilities and dialogue
- **453 lines** - Purchase and checkout logic
- **167 lines** - Inventory management
- **160 lines** - Filtering and search
- **66 lines** - Pricing calculations
- **6 lines** - Entry point

All functionality preserved, backward compatibility maintained, and code is now much more maintainable and testable.
