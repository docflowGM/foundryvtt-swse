# SWSE Store UX: Fake Amazon Pattern (FINAL ARCHITECTURE)

**Version:** 1.0
**Status:** LOCKED
**Pattern:** Amazon-inspired with mentor as expert review layer

---

## Core Principle

The store presents facts.
The cards summarize relevance.
The mentor appears only as a "review" that interprets those facts for the player's build.

---

## Mapping: Amazon UX → SWSE Store

| Amazon Concept | SWSE Equivalent | Purpose |
|---|---|---|
| Product grid | Item cards | Discovery + skimming |
| Filters | Metadata filters | Narrow by type, proficiency, price, traits |
| Sort options | Price / Suggested / Role / Availability | Reorder grid |
| Product page | Expanded item view + compendium | Full details + decisions |
| Buy quantity | Quantity selector (ammo, consumables) | Bulk purchasing |
| Reviews section | Mentor review + contextual advice | Interpretation layer |

---

## Store Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ ARMOR FOR YOUR CHARACTER                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filters: [Armor Type ▼] [Proficiency ▼] [Price ▼]         │
│  Sort: [Suggested for You ▼] [Price] [Rarity] [Name]       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Heavy    │  │ Medium   │  │ Light    │  │ No Armor │    │
│  │ Battle   │  │ Combat   │  │ Battle   │  │          │    │
│  │ Armor    │  │ Suit     │  │ Suit     │  │          │    │
│  │ ★★★★★   │  │ ★★★★☆   │  │ ★★★☆☆   │  │ ★★☆☆☆   │    │
│  │ Strong   │  │ Viable   │  │ Situational  │ Outperformed   │
│  │ Fit      │  │          │  │          │  │          │    │
│  │ 12,000   │  │ 8,000    │  │ 4,000    │  │ Free     │    │
│  │ [Click▸] │  │ [Click▸] │  │ [Click▸] │  │ [Click▸] │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Product Page Layer (On Click)

When player clicks card, opens product page:

```
┌────────────────────────────────────────────────────────────┐
│ HEAVY BATTLE ARMOR                          [Close]        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [IMAGE]                  Soak: +6                         │
│  (armor mockup)            Weight: 14 kg                    │
│                            Availability: In stock          │
│                                                             │
│  ★★★★★ Strong Fit                                         │
│                                                             │
│  Why this armor:                                           │
│  • Armor Mastery lets you move freely                      │
│  • Defender role prioritizes survival                      │
│  • Scales positively with your level                       │
│  • Premium cost—significant investment                     │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Quantity: [1] ─ + [Max]                                  │
│  Unit Price: 12,000 credits                               │
│  Total: 12,000 credits                                     │
│                                                             │
│  [BUY NOW]  [ADD TO CART]                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  MENTOR'S TAKE (highlighted, different visual)             │
│                                                             │
│  "You've trained to fight in armor, and at your level     │
│   that training finally pays off. With Armor Mastery,     │
│   heavy armor scales with you instead of holding you      │
│   back. It's slower, yes — but you're built to hold the   │
│   line, not dance around it."                              │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  FULL DETAILS (expandable)                                 │
│                                                             │
│  Category: Heavy Armor                                     │
│  Effects: DEX penalty reduced by Armor Mastery            │
│  Traits: Reinforced, Environmental (heat/cold)           │
│  ...                                                       │
│                                                             │
│  [< Back to Store]                                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Card Layer (Primary, Above the Fold)

### Collapsed Card

```
┌──────────────────────────────────┐
│  [IMG] HEAVY BATTLE ARMOR        │
│        ★★★★★  Strong Fit        │
│                                  │
│  • Armor Mastery lets you move   │
│  • Defender role + survivability │
│  • 12,000 credits                │
│                                  │
│  [Why? ▸]                        │
└──────────────────────────────────┘
```

**Properties:**
- Image (160px x 240px)
- Item name (bold)
- Tier label (star rating + text, from engine)
- 2 explanation bullets (truncated)
- Price (right-aligned, subtle)
- "Why?" affordance (subtle arrow, clickable)

### Expanded Card (Hover or Dedicated View)

```
┌──────────────────────────────────┐
│  [IMG] HEAVY BATTLE ARMOR        │
│        ★★★★★  Strong Fit        │
│                                  │
│  • Armor Mastery lets you move   │
│  • Defender role + survivability │
│  • Scales positively with level  │
│  • Premium cost—big investment   │
│                                  │
│  [View Details] [Compare]        │
└──────────────────────────────────┘
```

**What changed:**
- All 4 bullets now visible
- Action buttons: "View Details", "Compare"

---

## Review Layer (Secondary, Below the Fold)

### Mentor Review (Highlighted)

```
╔════════════════════════════════════════════════════════════╗
║ MENTOR'S TAKE                             [Dismiss]        ║
║ ⭐ Trusted Advisor (icon: different from user reviews)     ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║ "You've trained to fight in armor, and at your level       ║
║  that training finally pays off. With Armor Mastery,      ║
║  heavy armor scales with you instead of holding you        ║
║  back. It's slower, yes — but you're built to hold the    ║
║  line, not dance around it."                               ║
║                                                             ║
║ This advice is based on your defender role and talents     ║
║ (Armor Mastery, Armored Defense).                           ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

**Visual treatment:**
- Different color (e.g., gold border, light background)
- Icon: ⭐ or 🎯 (not a generic star rating)
- Label: "Mentor's Take", "Trusted Advisor", or diegetic equivalent
- Optional dismiss button (respects choice)
- Explains basis: "based on your [role] and talents"

---

## How Mentor Review Is Generated

**Input (from engine):**
```javascript
{
  explanations: [
    "Armor Mastery lets you move freely",
    "Defender role prioritizes survival",
    "Scales positively with your level",
    "Premium cost—significant investment"
  ],
  components: {
    roleAlignment: 15,
    axisA: 12,
    axisB: 5
  },
  tier: "strong-fit",
  scoreGap: 18  // vs second place
}
```

**Transformation (mentor prose):**
```
"You've trained to fight in armor, and at your level that training
finally pays off. With Armor Mastery, heavy armor scales with you
instead of holding you back. It's slower, yes — but you're built to
hold the line, not dance around it."
```

**Same facts, different voice.**
- Bullets → narrative
- Components → prose context
- Tier → confidence level
- scoreGap → implicit in phrasing

---

## Filters (Never Change Score)

Filters **narrow the display only**. They do NOT modify the engine score.

**Valid filters:**
- Armor type (light/medium/heavy)
- Proficiency (proficient / not proficient)
- Price range (slider)
- Special traits (environmental, stealth, etc.)
- Availability (in stock / order only)

**Invalid filters (don't do these):**
- "Best for role" (that's sorting, not filtering)
- "Recommended" (that's sorting, not filtering)

---

## Sorts (One Special: "Suggested for You")

**Available sorts:**

1. **Suggested for You** ← ENGINE-POWERED
   - Uses engine score
   - Pins "No Armor" if relevant (top or bottom)
   - Default sort when store opens
   - Shows engine ranking

2. **Price: Low to High** (normal sort)

3. **Price: High to Low** (normal sort)

4. **Rarity: Rare to Common** (normal sort)

5. **Availability: In Stock First** (normal sort)

**Rule:** Changing sort does NOT recalculate scores. It only reorders.

---

## Quantity Selector (Product Page Only)

```
Quantity: [−] [1] [+]  [Max: 10]

Unit Price: 12,000 credits
Total: 12,000 credits
```

**Rules:**
- Belongs on expanded product page, not cards
- Does NOT affect suggestions or mentor commentary
- For consumables/ammo: "Max" is stock limit
- Mentor review does NOT change if quantity > 1

---

## Mentor Frequency & Caching

### When Mentor Speaks

One mentor review appears:
- **Once per item**
- **Per character context**
- **Generated once, then cached**
- **Until character context changes** (level-up, talent, etc.)

### When Mentor Stays Silent

- If player never scrolls to reviews → mentor never speaks
- If "Dismiss" is clicked → don't show for this item (session)
- If another item in same search → separate review

### Never (Anti-Patterns)

❌ Auto-refresh mentor on scroll
❌ Multiple mentor reviews per item
❌ Popup mentor commentary
❌ Mentor updates when quantity changes
❌ Mentor fires on every store visit

---

## Mentor Voice Guidelines

### Diegetic Language (Narrative)

✅ "You've trained to fight in armor"
❌ "Your role alignment is +15"

✅ "Heavy armor would slow you down"
❌ "Axis B penalty: -5"

✅ "You're built to hold the line"
❌ "This item has high survivability"

### Frame Tradeoffs (Don't Hide)

✅ "It's slower, yes — but you're built to hold the line"
✅ "Your reflexes alone are strong. Armor would constrain that."

❌ "This armor is the best"
❌ "You should definitely equip this"

### Opportunity Cost (Acknowledge)

✅ "Light armor lets you dance; this won't"
✅ "You're losing mobility, but gaining survivability"

❌ "This is objectively superior"

### Validate or Explain Intuition

✅ "Your instinct is right—light armor suits your style"
✅ "This isn't what you'd expect, but here's why it works"

---

## No Mentor Review Case: "No Armor"

If "No Armor" is top suggestion (unexpected for player):

```
╔════════════════════════════════════════════════════════════╗
║ MENTOR'S TAKE                             [Dismiss]        ║
║ ⭐ Trusted Advisor                                         ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║ "Your reflexes alone are already strong at this level.    ║
║  Adding armor would slow you more than it helps. Trust    ║
║  your speed and training over raw soak."                   ║
║                                                             ║
║ This changes if you acquire armor talents later.           ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

---

## Integration: No Store Code Checks Engine

**What the Store NEVER does:**

❌ Check talent presence
❌ Calculate role alignment
❌ Modify explanation text
❌ Query engine twice per context

**What the Store ALWAYS does:**

✅ Display suggestion objects as-is
✅ Render mentor review from engine output
✅ Show all 4 explanations (in expanded card)
✅ Respect user dismissals

---

## Implementation Checklist

- [ ] Card component (collapsed/expanded states)
- [ ] Product page layout (details + quantity + mentor review)
- [ ] Filter UI (never modifies score)
- [ ] Sort UI (one special "Suggested for You" sort)
- [ ] Mentor review styling (highlight, icon, basis text)
- [ ] Dismiss logic (session-level, respect player choice)
- [ ] Quantity selector (product page only)
- [ ] Cache mentor reviews (until context changes)
- [ ] Integration test (render real suggestions with test characters)

---

**This is the right pattern. Ship this.**
