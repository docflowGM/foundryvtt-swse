# Services Architectural Contract

## Definition

**Services are contextual expenses, not store inventory items.**

Services (Dining, Lodging, Medical Care, Transportation, Upkeep, Vehicle Rental) represent GM-mediated costs that vary by location, circumstance, and time scope.

They are **never** purchasable goods appearing in the Store inventory grid.

## What Services Are NOT

- ❌ Store inventory items
- ❌ Loadable by StoreEngine
- ❌ Normalizable by normalizer.js
- ❌ Categorizable by categorizer.js
- ❌ Subject to affordability checks via StoreEngine.canPurchase()
- ❌ Appearable in item carts
- ❌ Renderable as product cards

## What Services May Be

- ✅ Pure flavor text (via ReviewThreadAssembler, itemType === 'service')
- ✅ Data tables (services-data.json or equivalent)
- ✅ Reference information (guideline costs)
- ✅ GM-facing tools (future: Service Expense Calculator)
- ✅ Downtime/upkeep mechanics (future: separate module)

## Enforcement Points

### Normalizer (normalizer.js)

```javascript
// Services are REJECTED by filterValidStoreItems()
if (item.type === 'service') {return false;}
```

Services never enter the store engine pipeline.

### Categorizer (categorizer.js)

Services are never processed. The Category enum does NOT include 'Services'.

If a service somehow reaches categorizer.js, it's a bug.

### Store App (store-main.js)

No code checks for `view.type === 'service'`.

Dead code paths have been removed.

### ReviewThreadAssembler (review-thread-assembler.js)

Services are accepted as itemType values for **flavor text only**.

Service reviews are always selected from dialogue packs, never generated.

No mechanical data (cost, availability, mechanics) is ever tied to service reviews.

## Future Extensions

When implementing Service Expenses:

1. **Create a separate module:** `scripts/services/services-module.js`
2. **Load from static data:** `data/services/services.json` (immutable guideline costs)
3. **Never couple to Store Engine:** Services are independent
4. **Never auto-suggest:** Services are explicitly requested by players/GMs
5. **Validate against affordability separately:** Use actor.system.credits, not StoreEngine.canPurchase()

## Related Code

- Removal of services from store pipeline: Commit [audit-store-entities]
- Review data: `data/reviews/service-reviews.json`
- Dialogue packs: `scripts/apps/store/review-thread-assembler.js`

## Questions for Clarification

If services need to be purchasable via explicit GM menu:

- Should they be Items in a "Services" compendium pack? (Requires new UI)
- Should they be calculated on-the-fly? (Requires Services module)
- Should they be reference-only? (Current state)

**Decision:** Currently reference-only (flavor text via reviews). No UI for purchasing services.
