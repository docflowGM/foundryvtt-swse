# SWSE Store & Commerce System

**Complete guide to the equipment store, shopping interface, transaction architecture, and purchase workflows.**

---

## Table of Contents

1. [Store System Architecture](#store-system-architecture)
2. [Store UI & UX Patterns](#store-ui--ux-patterns)
3. [Product Suggestions & Mentor System](#product-suggestions--mentor-system)
4. [Transaction Flow](#transaction-flow)
5. [Cart Management](#cart-management)
6. [Integration Guide](#integration-guide)
7. [Examples](#examples)

---

## Store System Architecture

### Core Components

The store system is organized into distinct layers:

```
┌─────────────────────────────────────────┐
│  UI / Store Dialog / Templates          │
│  (store-checkout.js, store-review.js)   │
└──────────────────┬──────────────────────┘
                   │
         Read logic + UI concerns
         (filtering, display, calc)
                   │
       Domain transactions (cross-actor)
                   │
┌──────────────────▼──────────────────────┐
│  StoreTransactionEngine                 │
│  (Coordinates multi-step sequences)     │
│  (purchaseItem, sellItem, transferItem) │
└──────────────────┬──────────────────────┘
                   │
      Each mutation governed individually
                   │
┌──────────────────▼──────────────────────┐
│  ActorEngine                            │
│  (Mutation Authority)                   │
│  (updateActor, createEmbeddedDocuments) │
└─────────────────────────────────────────┘
```

### Cart Storage

- **Location**: Actor flag ('storeCart')
- **Scope**: 'foundryvtt-swse'
- **Structure**: `{ items: [], droids: [], vehicles: [] }`
- **Persistence**: Survives session reload
- **Content**: Pure data only (no compiled state, no partial actors)

### Store Inventory

Store actors contain inventory items with pricing:
- **Cost**: Base price in credits
- **Final Cost**: Calculated from base + discounts
- **Availability**: Stock count and restrictions
- **Item Types**: Equipment, weapons, droid templates, vehicle templates

---

## Store UI & UX Patterns

### Design Pattern: Fake Amazon

The store follows an Amazon-inspired pattern with mentor guidance:

| Amazon Concept | SWSE Equivalent | Purpose |
|---|---|---|
| Product grid | Item cards | Discovery + skimming |
| Filters | Metadata filters | Narrow by type, proficiency, price |
| Sort options | Price / Suggested / Role / Availability | Reorder grid |
| Product page | Expanded item view + compendium | Full details + decisions |
| Reviews section | Mentor review + contextual advice | Interpretation layer |

### Store Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ARMOR FOR YOUR CHARACTER                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filters: [Armor Type ▼] [Proficiency ▼] [Price ▼]        │
│  Sort: [Suggested for You ▼] [Price] [Rarity] [Name]      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Heavy    │  │ Medium   │  │ Light    │  │ No Armor │   │
│  │ Battle   │  │ Combat   │  │ Battle   │  │          │   │
│  │ Armor    │  │ Suit     │  │ Suit     │  │          │   │
│  │ ★★★★★   │  │ ★★★★☆   │  │ ★★★☆☆   │  │ ★★☆☆☆   │   │
│  │ Strong   │  │ Viable   │  │ Situational  │ Outperformed │
│  │ Fit      │  │          │  │          │  │          │   │
│  │ 12,000   │  │ 8,000    │  │ 4,000    │  │ Free     │   │
│  │ [Click▸] │  │ [Click▸] │  │ [Click▸] │  │ [Click▸] │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Card Component

**Collapsed State** (Default):
- Item name (bold)
- Tier label (star rating + text)
- 2 explanation bullets (truncated)
- Price (right-aligned, subtle)
- "Why?" affordance (clickable arrow)

**Expanded State** (On interaction):
- Item name
- Tier label
- All 4 explanations (full bullets)
- Price + Availability
- Action buttons: [View Details] [Compare]

### Tier Label Mapping

| Engine Tier | UI Label | Color | Icon |
|---|---|---|---|
| `strong-fit` | ★★★★★ Strong Fit | Green | ✓ |
| `viable` | ★★★★☆ Viable | Blue | ○ |
| `situational` | ★★★☆☆ Situational | Yellow | ⚠ |
| `outperformed` | ★★☆☆☆ Outperformed | Gray | ✗ |

### Product Page

Opens when clicking a card:

```
┌────────────────────────────────────────────────────┐
│ HEAVY BATTLE ARMOR                      [Close]   │
├────────────────────────────────────────────────────┤
│                                                    │
│  [IMAGE]                  Soak: +6               │
│  (armor mockup)            Weight: 14 kg          │
│                            Availability: In stock │
│                                                    │
│  ★★★★★ Strong Fit                                │
│                                                    │
│  Why this armor:                                  │
│  • Armor Mastery lets you move freely             │
│  • Defender role prioritizes survival             │
│  • Scales positively with your level              │
│  • Premium cost—significant investment            │
│                                                    │
│  Quantity: [1] ─ +  [Max: 3]                     │
│  Unit Price: 12,000 credits                      │
│  Total: 12,000 credits                           │
│                                                    │
│  [ADD TO CART]  [BUY NOW]                        │
│                                                    │
│  ─────────────────────────────────────────────   │
│  [MENTOR'S TAKE] (highlighted box below)         │
│  ─────────────────────────────────────────────   │
│                                                    │
│  [← BACK TO STORE]                               │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Product Suggestions & Mentor System

### Suggestion Engine

The store engine generates item suggestions based on character context:

**Input (Character Context):**
- Level, class, abilities
- Current equipment
- Talents and feats
- Role alignment

**Output (Suggestion Object):**
```javascript
{
  itemId: "heavy-armor-1",
  itemName: "Heavy Battle Armor",
  score: 42,
  tier: "strong-fit",
  explanations: [
    "Armor Mastery lets you move naturally",
    "Defender role prioritizes survival",
    "Scales positively with your level",
    "Premium cost—significant investment"
  ],
  system: {
    price: 12000,
    category: "heavy",
    soak: 6
  },
  components: {
    baseRelevance: 10,
    roleAlignment: 15,
    axisA: 12,
    axisB: 5,
    priceBias: 0
  }
}
```

### Mentor Review System

The mentor appears only in 4 specific cases:

**1. Strong Recommendation + Clear Gap** (≥15 points over second place)
- Only if label is "Strong Fit"
- Only first time (respect "no mentor" preference)
- Example: Level-15 Soldier with Armored Defense

**2. Counterintuitive Outcome**
- "No Armor" is top suggestion (unexpected)
- Different from player's last known choice
- Example: High-mobility Scout finding unarmored best

**3. Talent Acquisition Changes Rules**
- Character just acquired armor talent
- This flips the viability of armor in meaningful way
- Example: "You've learned to move in armor now"

**4. First-Time Onboarding**
- Player's first visit to store (storeVisits === 0)
- One-time only, never repeats
- Example: "This store tailors gear to your fighting style"

### Mentor Voice

Mentor converts engine bullets to narrative form:

**Engine Bullets:**
- "Armor Mastery lets you move naturally in combat armor"
- "Defender role prioritizes survival over mobility"
- "Scales positively with your level"
- "Premium cost—significant investment"

↓ (Transform to prose)

**Mentor Says:**
> "You've trained to fight in armor, and at this level that training finally pays off. With Armor Mastery, heavy armor scales with you instead of holding you back. It's slower, yes—but you're built to hold the line, not dance around it."

### What the Mentor Should NOT Do

- ❌ List items or enumerate
- ❌ Rank or say "best"
- ❌ Fire every time store opens
- ❌ Override player agency
- ❌ Repeat after dismissal

---

## Transaction Flow

### Checkout Process

**Step 1: Initiation**
- User clicks [CHECKOUT] button
- Store validates current cart contents
- Displays review dialog with total cost

**Step 2: Pre-Validation**
```
├─ Revalidate items (check still in store)
├─ Recalculate prices (catch price changes)
├─ Calculate total
├─ Check player has sufficient credits
└─ Get fresh actor (prevent race conditions)
```

**Step 3: Credit Deduction** [ATOMIC]
```
├─ Single batched actor.update()
├─ Deduct credits
├─ Store updated flags
└─ Verify success
```

**Step 4: Item Grant** [AFTER TRANSACTION]
```
├─ Create regular items (ActorEngine.createEmbeddedDocuments)
├─ Create droid actors (direct actor.create)
└─ Create vehicle actors + templates
```

**Step 5: Completion**
```
├─ Clear cart
├─ Animate credit reconciliation
├─ Log to purchase history
└─ Show success notification
```

### Error Handling

**If Validation Fails:**
- Show notification explaining why
- Keep cart open for user to fix
- No credits deducted

**If Credit Deduction Fails:**
- Insufficient funds detected
- Cart cleared to prevent retry
- Error shown with clear message

**If Item Grant Fails:**
- Credits already deducted (PARTIAL STATE WARNING)
- Error logged for analysis
- User should contact GM if items not received

---

## Cart Management

### Cart Structure

```javascript
cart = {
  items: [
    {
      id: "item-id",
      name: "Item Name",
      img: "path/to/image.png",
      cost: 1000,
      item: itemObject  // Full item reference
    }
  ],
  droids: [
    {
      id: "droid-id",
      name: "Droid Name",
      cost: 5000,
      actor: droidActorObject
    }
  ],
  vehicles: [
    {
      id: "vehicle-id",
      name: "Vehicle Name",
      cost: 25000,
      condition: "new",  // or "used"
      template: vehicleTemplate
    }
  ]
}
```

### Cart Operations

**Add Item**
```javascript
await addItemToCart(store, itemId, updateCallback);
```
- Stores reference and metadata
- Does NOT mutate actor
- Persists to flag immediately

**Remove Item**
```javascript
removeFromCartById(cart, 'items', itemId);
```
- Pure array operation
- No actor mutation
- Updates flag immediately

**Clear Cart**
```javascript
clearCart(cart);
```
- Empties all cart arrays
- Called after successful checkout
- Called on cart reset

**Calculate Total**
```javascript
const total = calculateCartTotal(cart);
```
- Sums all item costs
- Handles discounts if applicable
- Pure calculation (no mutations)

### Cart Persistence

- Saved to actor flag after every mutation
- Survives session reload
- Persists while store dialog open or closed
- Cleared after successful checkout

---

## Integration Guide

### For Store Checkout UI

```javascript
import { StoreTransactionEngine } from '../../engines/store/store-transaction-engine.js';

async function checkout(playerActor, cartItems, sellerActor) {
  try {
    // Execute atomic transaction
    const result = await StoreTransactionEngine.purchaseItem({
      buyer: playerActor,
      seller: sellerActor,
      itemId: item.id,
      price: item.price,
      metadata: {
        context: 'store_purchase',
        timestamp: Date.now()
      }
    });

    // Success - show feedback
    ui.notifications.info(`Purchased ${result.itemName}`);
    refreshStoreDisplay();
    refreshPlayerInventory();

    return result;
  } catch (err) {
    // Failure - StoreTransactionEngine already attempted rollback
    ui.notifications.error(`Purchase failed: ${err.message}`);
    return null;
  }
}
```

### For Item Suggestions

```javascript
import { ArmorSuggestions } from '../../stores/armor-suggestions.js';

const suggestions = await ArmorSuggestions.generateSuggestions(
  character,
  itemCompendium
);

// Render cards with suggestions as-is
// No modification to explanation text
// Use tier labels directly
// Show all 4 bullets on expansion
```

### For Mentor Integration

```javascript
function shouldMentorSpeak(topSuggestion, characterContext, playerPrefs) {
  // Respect player preference
  if (playerPrefs.mentorDismissed) return null;

  // Rule 1: Strong recommendation with clear gap
  if (topSuggestion.scoreGap > 15 &&
      topSuggestion.tier === "strong-fit" &&
      !playerPrefs.hasSeenRecommendationMentor) {
    return { type: "strong-recommendation", trigger: topSuggestion };
  }

  // Rule 2: Counterintuitive outcome
  if (topSuggestion.itemId === "NO_ARMOR" &&
      characterContext.lastItemId !== "NO_ARMOR") {
    return { type: "counterintuitive", trigger: topSuggestion };
  }

  // Rule 3: Talent just acquired
  if (characterContext.talents.armoredDefense &&
      !playerPrefs.previousTalents?.armoredDefense) {
    return { type: "talent-acquired", talent: "armoredDefense" };
  }

  // Rule 4: First visit
  if (characterContext.storeVisits === 0) {
    return { type: "onboarding" };
  }

  return null;  // Mentor stays silent
}
```

---

## Examples

### Example 1: Armor Shopping (Level 15 Soldier)

**Character Context:**
- Name: Kess Drell
- Level: 15, Soldier
- Talents: Armored Defense, Armor Mastery
- Current Armor: None
- Role: Defender

**Engine Generates:**
- Heavy Battle Armor: Score 42 (Strong Fit)
- Medium Combat Suit: Score 35 (Viable)
- Light Battle Suit: Score 28 (Situational)

**Mentor Appears Because:**
- Score gap 42 vs 35 = 7 points (below threshold)
- BUT: Talent "Armor Mastery" recently acquired
- Triggers: "You've learned to move in armor now. That restriction you felt? Gone."

**Player Flow:**
1. Store opens, sees Heavy Armor as top card
2. Clicks card to open product page
3. Reads mentor take (contextual advice)
4. Adjusts quantity (default 1)
5. Clicks [BUY NOW]
6. Armor added to inventory, credits deducted

---

### Example 2: Vehicle Purchase (Droid Building)

**Scenario:**
Player wants to purchase a vehicle for their character.

**Flow:**
1. Browse vehicles in store
2. Select "Custom Starship Builder"
3. Configure components (engines, weapons, shields)
4. View cost summary
5. Click [BUY NOW]
6. Vehicle actor created and added to world
7. Credits deducted from purchaser

---

### Example 3: NPC Equipment Outfitting

**Scenario:**
GM outfitting an NPC with starting gear from store.

**Flow:**
1. Open store actor
2. Select equipment items for NPC
3. Add to NPC's inventory (no cart needed)
4. Adjust NPC credits accordingly
5. NPC ready for play

---

## Key Implementation Files

| Component | File |
|-----------|------|
| Store Main | `scripts/apps/store/store-main.js` |
| Store Checkout | `scripts/apps/store/store-checkout.js` |
| Transaction Engine | `scripts/engines/store/store-transaction-engine.js` |
| Armor Suggestions | `scripts/stores/armor-suggestions.js` |
| Store UI Template | `templates/apps/store/store-main.hbs` |

---

**Ready for**: Equipment shopping, purchasing vehicles/droids, transacting with merchants
