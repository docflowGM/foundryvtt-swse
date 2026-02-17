# Store Polish & Enhancement Recommendations

This document outlines additional polish improvements and feature enhancements for the SWSE Store system.

---

## ✅ Implemented Polish (Current Build)

### Performance & UX
- ✅ **Search Debouncing** - 300ms delay prevents excessive search execution
- ✅ **Loading Indicator** - Shows "Loading store inventory..." during data load
- ✅ **Memory Leak Fix** - itemsById Map cleared on store close
- ✅ **Availability Filter Normalization** - Case-insensitive, whitespace-tolerant filtering
- ✅ **Empty State Messages** - Shows helpful messages when no items exist

### Code Quality
- ✅ **Constants File** - Centralized configuration in `store-constants.js`
- ✅ **Transaction Rollback** - Credits refunded if purchase fails
- ✅ **Validation Warnings** - Console warnings for invalid weapon subcategories
- ✅ **Improved Error Messages** - Better debugging info in console

---

## 🎨 Recommended Visual Polish

### 1. **Hover Effects for Items**
**Priority:** Low
**Effort:** Small

Add subtle hover animations to product items for better interactivity:

```css
.product-item {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
```

**Benefit:** Makes the store feel more responsive and modern

---

### 2. **Cart Item Count Animation**
**Priority:** Low
**Effort:** Small

Animate the cart badge when items are added:

```javascript
// In _updateCartCount()
cartCountEl.classList.add('bounce');
setTimeout(() => cartCountEl.classList.remove('bounce'), 300);
```

**Benefit:** Visual feedback reinforces the action

---

### 3. **Price Formatting Improvements**
**Priority:** Medium
**Effort:** Small

Add thousand separators and currency symbol consistency:

```javascript
// Already using .toLocaleString() - good!
// Consider adding: const formattedPrice = `₢${cost.toLocaleString('en-US')}`;
```

**Benefit:** Better readability for large credit amounts

---

### 4. **Loading Skeleton Screen**
**Priority:** Low
**Effort:** Medium

Instead of just a notification, show skeleton placeholders for items while loading:

```html
<div class="product-skeleton">
    <div class="skeleton-img"></div>
    <div class="skeleton-text"></div>
</div>
```

**Benefit:** More professional loading experience

---

## 🚀 Recommended Feature Enhancements

### 5. **Favorites/Wishlist System**
**Priority:** Medium
**Effort:** Medium

Allow players to mark items as favorites for later purchase:

```javascript
export function toggleFavorite(itemId, actor) {
    const favorites = actor.getFlag('swse', 'storeFavorites') || [];
    const index = favorites.indexOf(itemId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(itemId);
    }

    actor.setFlag('swse', 'storeFavorites', favorites);
}
```

**Benefit:** Players can plan purchases across sessions

---

### 6. **Sort Options**
**Priority:** Medium
**Effort:** Small

Add dropdown to sort items by:
- Price (Low to High / High to Low)
- Name (A-Z / Z-A)
- Damage (for weapons)
- Availability

**Benefit:** Easier to find items in specific price ranges

---

### 7. **Comparison Mode**
**Priority:** Low
**Effort:** Large

Allow selecting multiple items to compare side-by-side:

```html
<div class="compare-panel">
    <div class="compare-item">
        <h5>Blaster Pistol</h5>
        <p>Damage: 3d6</p>
        <p>Cost: 500₢</p>
    </div>
    <div class="compare-item">
        <h5>Heavy Blaster Pistol</h5>
        <p>Damage: 3d8</p>
        <p>Cost: 750₢</p>
    </div>
</div>
```

**Benefit:** Helps players make informed purchasing decisions

---

### 8. **Purchase History**
**Priority:** Low
**Effort:** Medium

Track what players have purchased in the past:

```javascript
export async function logPurchase(actor, items) {
    const history = actor.getFlag('swse', 'purchaseHistory') || [];
    history.push({
        timestamp: Date.now(),
        items: items.map(i => ({ id: i.id, name: i.name, cost: i.cost })),
        total: items.reduce((sum, i) => sum + i.cost, 0)
    });
    await actor.setFlag('swse', 'purchaseHistory', history);
}
```

**Benefit:** GM can see player spending patterns

---

### 9. **Quantity Selection**
**Priority:** Medium
**Effort:** Medium

Allow purchasing multiple of the same item (especially for consumables):

```html
<input type="number" class="item-quantity" min="1" max="99" value="1" />
```

**Benefit:** Faster bulk purchases of medpacs, grenades, etc.

---

### 10. **Store "Sales" Events**
**Priority:** Low
**Effort:** Medium

Allow GM to set temporary discounts on specific categories:

```javascript
export const SALE_EVENTS = {
    'weapon-sale': { category: 'weapons', discount: 20 },
    'armor-clearance': { category: 'armor', discount: 30 }
};
```

**Benefit:** Creates urgency and interesting economy dynamics

---

## 🔧 Technical Improvements

### 11. **Lazy Loading for Large Inventories**
**Priority:** Medium
**Effort:** Large

Only load items when their tab is clicked:

```javascript
activateListeners(html) {
    html.find('.shop-category-select').change(async (event) => {
        const category = event.currentTarget.value;
        if (!this.loadedCategories.has(category)) {
            await this.loadCategory(category);
            this.loadedCategories.add(category);
        }
    });
}
```

**Benefit:** Faster initial load time, especially with hundreds of items

---

### 12. **Cache Compiled Item Data**
**Priority:** Low
**Effort:** Medium

Store processed item data in a game setting to avoid reprocessing:

```javascript
const cacheKey = `store-cache-${game.world.id}`;
let cachedData = game.settings.get('swse', cacheKey);

if (!cachedData || cachedData.version !== game.system.version) {
    cachedData = await buildStoreInventory();
    await game.settings.set('swse', cacheKey, cachedData);
}
```

**Benefit:** Significantly faster store loads after first open

---

### 13. **Accessibility Improvements**
**Priority:** Medium
**Effort:** Small

- Add ARIA labels to buttons and inputs
- Ensure keyboard navigation works smoothly
- Add focus indicators for keyboard users

```html
<button aria-label="Add Blaster Pistol to cart" class="buy-item">
    <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to Cart
</button>
```

**Benefit:** Better experience for screen reader users

---

### 14. **Offline Mode / Local Storage Backup**
**Priority:** Low
**Effort:** Medium

Save cart contents to localStorage in case of disconnect:

```javascript
_updateCart() {
    localStorage.setItem(`swse-cart-${this.actor.id}`, JSON.stringify(this.cart));
}

constructor() {
    this.cart = JSON.parse(localStorage.getItem(`swse-cart-${this.actor.id}`)) || {
        items: [],
        droids: [],
        vehicles: []
    };
}
```

**Benefit:** Prevents losing cart contents on connection loss

---

## 📊 Analytics & Tracking

### 15. **Economy Metrics Dashboard (GM Only)**
**Priority:** Low
**Effort:** Large

Show GMs insights about the game economy:

- Total credits in circulation
- Most purchased items
- Average purchase amount per player
- Credit velocity (spending rate)

**Benefit:** Helps GMs balance economy and rewards

---

## 🎭 Immersion Enhancements

### 16. **Dynamic Rendarr Personality**
**Priority:** Low
**Effort:** Small

Rendarr reacts to player's purchase history:

```javascript
function getRendarrGreeting(actor) {
    const history = actor.getFlag('swse', 'purchaseHistory') || [];
    const totalSpent = history.reduce((sum, h) => sum + h.total, 0);

    if (totalSpent > 50000) {
        return "Ah, my most valued customer returns! What rare treasures may I find for you today?";
    } else if (totalSpent > 10000) {
        return "Welcome back, friend! Your credits are always welcome here.";
    } else {
        return "Welcome to my humble establishment. How may I assist you?";
    }
}
```

**Benefit:** Adds personality and rewards loyal customers

---

### 17. **Item Rarity Indicators**
**Priority:** Medium
**Effort:** Small

Visual badges for rare/unique items:

```html
<span class="rarity-badge rarity-rare">RARE</span>
<span class="rarity-badge rarity-unique">UNIQUE</span>
```

**Benefit:** Highlights special items at a glance

---

### 18. **"New Arrivals" Section**
**Priority:** Low
**Effort:** Medium

Show recently added items from compendium updates:

```javascript
function getNewArrivals() {
    const lastVisit = actor.getFlag('swse', 'lastStoreVisit') || 0;
    return items.filter(i => i.timestamp > lastVisit);
}
```

**Benefit:** Highlights new content for returning players

---

## 🎯 Priority Summary

| Priority | Features | Estimated Total Effort |
|----------|----------|------------------------|
| **High** | (All critical bugs already fixed) | - |
| **Medium** | Sort Options, Favorites, Accessibility, Item Rarity, Quantity Selection | ~2 weeks |
| **Low** | Hover Effects, Cart Animation, Skeleton Loading, All others | ~4 weeks |

---

## 🏁 Quick Wins (High Impact, Low Effort)

1. **Hover Effects** - 1 hour of CSS
2. **Cart Count Animation** - 30 minutes
3. **Sort by Price** - 2 hours
4. **Rarity Badges** - 1 hour
5. **Keyboard Navigation** - 2 hours

**Total: ~7 hours for noticeable polish improvements**

---

## Notes

- Most recommendations are optional enhancements beyond core functionality
- The store is fully functional with all critical bugs fixed
- Polish improvements should be prioritized based on player feedback
- Consider adding polish incrementally rather than all at once
