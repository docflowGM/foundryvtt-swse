# Product Page Mock: Heavy Battle Armor
## Level 15 Soldier with Armor Mastery

---

## Context (Engine Input)

**Character:**
- Name: Kess Drell
- Class: Soldier
- Level: 15
- Primary Role: Defender
- Talents: Armored Defense, Armor Mastery
- Armor: None (currently evaluating)

**Suggested Item:**
- Name: Heavy Battle Armor
- Soak: +6
- Price: 12,000 credits
- Category: Heavy Armor
- Traits: Reinforced, Environmental Protection

**Engine Output:**
```javascript
{
  armorId: "heavy-battle-armor",
  armorName: "Heavy Battle Armor",
  score: 42,
  tier: "strong-fit",

  explanations: [
    "Armor Mastery lets you move naturally in combat armor",
    "Defender role prioritizes survival over mobility",
    "Scales positively with your level via Improved Armored Defense",
    "Premium cost—significant resource investment"
  ],

  components: {
    baseRelevance: 10,
    roleAlignment: 15,
    axisA: 12,
    axisB: 5,
    priceBias: 0
  },

  system: {
    price: 12000,
    category: "heavy",
    soak: 6
  }
}
```

---

## Visual: Full Product Page

```
╔════════════════════════════════════════════════════════════════════╗
║ SWSE STORE                                               [Close X] ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  HEAVY BATTLE ARMOR                                              ║
║                                                                    ║
║  ┌──────────────┐                                                 ║
║  │              │    Armor Rating: +6 Soak                        ║
║  │   [ARMOR     │    Weight: 14 kg                                 ║
║  │    IMAGE]    │    Category: Heavy Combat Armor                 ║
║  │              │    Availability: In stock (3 units)             ║
║  │              │    Traits: Reinforced, Environmental            ║
║  └──────────────┘                                                 ║
║                                                                    ║
║  ★★★★★ Strong Fit                                               ║
║                                                                    ║
║  ═══════════════════════════════════════════════════════════════  ║
║  WHY THIS ARMOR FITS YOU                                          ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  • Armor Mastery lets you move naturally in combat armor         ║
║  • Defender role prioritizes survival over mobility               ║
║  • Scales positively with your level via Improved Armored Defense ║
║  • Premium cost—significant resource investment                   ║
║                                                                    ║
║  ═══════════════════════════════════════════════════════════════  ║
║  PURCHASE                                                         ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  Quantity:    [−] 1 [+]                                           ║
║  Max available: 3 units                                           ║
║                                                                    ║
║  Unit Price:     12,000 credits                                   ║
║  Quantity:       1                                                ║
║  ─────────────────────────────────────────                        ║
║  Total:          12,000 credits                                   ║
║                                                                    ║
║  [≡ ADD TO CART]  [★ BUY NOW]                                    ║
║                                                                    ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  ╔═════════════════════════════════════════════════════════════╗ ║
║  ║ ⭐ MENTOR'S TAKE                              [DISMISS]     ║ ║
║  ║ Trusted Advisor for your build                             ║ ║
║  ╠═════════════════════════════════════════════════════════════╣ ║
║  ║                                                             ║ ║
║  ║ "You've trained to fight in armor, and at this level     ║ ║
║  ║  that training finally pays off. With your Armor         ║ ║
║  ║  Mastery training, heavy armor scales with you instead   ║ ║
║  ║  of holding you back. It's slower than going without,    ║ ║
║  ║  yes—but you're built to hold the line, not dance        ║ ║
║  ║  around it. Your defensive abilities make this armor     ║ ║
║  ║  the right choice."                                       ║ ║
║  ║                                                             ║ ║
║  ║ This assessment is based on:                              ║ ║
║  ║ • Your Defender role + Armor Mastery talent             ║ ║
║  ║ • Level 15 survivability benefit                         ║ ║
║  ║ • Trades mobility for durability (fits your playstyle)  ║ ║
║  ║                                                             ║ ║
║  ╚═════════════════════════════════════════════════════════════╝ ║
║                                                                    ║
║  ═══════════════════════════════════════════════════════════════  ║
║  MORE DETAILS                                                      ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  [▼ Show Full Compendium Entry]                                   ║
║                                                                    ║
║  ───────────────────────────────────────────────────────────────  ║
║                                                                    ║
║  [← BACK TO STORE]                                                ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Section Breakdown

### 1. Header & Image
```
HEAVY BATTLE ARMOR

┌──────────────┐
│   [ARMOR     │   Armor Rating: +6 Soak
│    IMAGE]    │   Weight: 14 kg
│              │   Category: Heavy Combat Armor
└──────────────┘   Availability: In stock (3 units)
                   Traits: Reinforced, Environmental
```

**Design notes:**
- Image: 160px width, centered, square aspect
- Right column: key mechanical info (no prose, just facts)
- Availability: shows stock count (helps with decision)
- Traits: links to detailed tooltip on hover

---

### 2. Tier Badge + Quick Summary
```
★★★★★ Strong Fit
```

**Design notes:**
- Large, prominent
- Uses 5-star visual (familiar)
- Text label supplements stars
- Color coding: green/blue/yellow/gray by tier

---

### 3. Card Explanation (Compact)
```
WHY THIS ARMOR FITS YOU

• Armor Mastery lets you move naturally in combat armor
• Defender role prioritizes survival over mobility
• Scales positively with your level via Improved Armored Defense
• Premium cost—significant resource investment
```

**Design notes:**
- 4 bullets (from engine, unmodified)
- Mechanical language (bullets, not prose)
- Scannable (one fact per line)
- No interpretation here (that's the mentor's job)

---

### 4. Purchase Section
```
Quantity:    [−] 1 [+]
Max available: 3 units

Unit Price:     12,000 credits
Quantity:       1
─────────────────────────────────────────
Total:          12,000 credits

[≡ ADD TO CART]  [★ BUY NOW]
```

**Design notes:**
- Quantity selector: `-` / `+` buttons or direct input
- Show max available (respects inventory)
- Math updates live as quantity changes
- Two purchase paths (cart vs immediate)
- Mentor commentary does NOT change with quantity

---

### 5. Mentor Review (Highlighted Section)
```
╔═════════════════════════════════════════════════════════════╗
║ ⭐ MENTOR'S TAKE                              [DISMISS]     ║
║ Trusted Advisor for your build                             ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║ "You've trained to fight in armor, and at this level     ║
║  that training finally pays off. With your Armor         ║
║  Mastery training, heavy armor scales with you instead   ║
║  of holding you back. It's slower than going without,    ║
║  yes—but you're built to hold the line, not dance        ║
║  around it. Your defensive abilities make this armor     ║
║  the right choice."                                       ║
║                                                             ║
║ This assessment is based on:                              ║
║ • Your Defender role + Armor Mastery talent             ║
║ • Level 15 survivability benefit                         ║
║ • Trades mobility for durability (fits your playstyle)  ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

**How it was generated:**

Engine bullets:
1. "Armor Mastery lets you move naturally in combat armor"
2. "Defender role prioritizes survival over mobility"
3. "Scales positively with your level via Improved Armored Defense"
4. "Premium cost—significant resource investment"

↓ (transform to prose)

Mentor review:
"You've trained to fight in armor, and at this level that training finally pays off. With your Armor Mastery training, heavy armor scales with you instead of holding you back. It's slower than going without, yes—but you're built to hold the line, not dance around it."

**Basis explanation:**
- Your Defender role + Armor Mastery talent
- Level 15 survivability benefit
- Trades mobility for durability (fits your playstyle)

**Design notes:**
- Distinct visual: gold/light background, different icon
- Label: "⭐ MENTOR'S TAKE" (icon + text)
- Subtitle: "Trusted Advisor for your build"
- [DISMISS] button: respects player preference
- Basis explanation below prose (context for the interpretation)
- Does NOT change with quantity
- Scroll to see (not forced)

---

## Comparison: What NOT to Do

### ❌ Bad: Mentor as Star Rating
```
MENTOR SCORE: ★★★★★ 4.8/5
```
(Implies objective quality, railroads player)

---

### ❌ Bad: Mentor as Popup
```
[Popup blocks product details]
"You should equip this armor!"
```
(Intrusive, breaks flow, breaks immersion)

---

### ❌ Bad: Mentor in Card
```
│ Heavy Battle Armor        │
│ ★★★★★ Strong Fit         │
│                           │
│ "You've trained to fight  │
│  in armor..."             │
│                           │
│ • Armor Mastery...        │
```
(Confuses discovery with interpretation, noise)

---

## Alternative Scenarios

### Scenario A: Medium Armor (Viable)
```
★★★★☆ Viable

• Good protection without heavy penalties
• Supports mobile tactics better than heavy
• Compatible with your attribute profile
• Standard cost

MENTOR'S TAKE:
"Medium armor is the compromise. You get real protection without
the movement hit of heavy. It's not as obvious as the heavy suits,
but for someone with your mobility, it's the smarter choice."
```

---

### Scenario B: "No Armor" Wins (Counterintuitive)
```
★★☆☆☆ Outperformed

• No soak—relies on Heroic Level defense only
• Your armor talents are unused without equipped armor
• Defender role typically benefits from armor

MENTOR'S TAKE:
"Your reflexes alone are already strong at this level. Adding armor
would slow you more than it helps. Trust your speed and training
over raw soak. If you acquire armor talents later, come back to this
store—the equation changes."
```

---

### Scenario C: Light Armor (Scout Character)
```
★★★★★ Strong Fit

• No mobility penalty—scales with your DEX
• Scout role prioritizes speed over survivability
• Lightweight, easy to acquire
• Affordable investment

MENTOR'S TAKE:
"Light armor is your friend. You're built for speed and positioning,
not standing toe-to-toe. This keeps you mobile while giving you
a safety margin. The perfect fit for how you fight."
```

---

## Player Flow Example

```
1. Store opens
   ↓
   [Grid of armor cards with "Suggested for You" sort active]

2. Player scans cards
   ↓
   [Heavy Battle Armor is top card: "★★★★★ Strong Fit"]

3. Player clicks card
   ↓
   [Opens product page, shows all 4 bullets, mentor review at bottom]

4. Player reads mentor review (if they scroll to reviews section)
   ↓
   [Interprets bullets into narrative context]

5. Player decides: "This makes sense for my character"
   ↓
   [Adjusts quantity if needed (default 1), clicks BUY NOW]

6. Item equipped, flow closes
   ↓
   [Mentor review cached in memory until character context changes]

7. Character levels up, acquires new talent
   ↓
   [Next store visit: mentor review regenerated with new context]
```

---

## Handoff to Implementation

**What the Frontend Dev Needs:**

1. **Card component code**
   - Collapsed state (2 bullets, price)
   - Expanded state (4 bullets, action buttons)

2. **Product page layout**
   - Image + stats (right column)
   - 4 bullet list (verbatim from engine)
   - Quantity selector
   - Mentor review box (distinguished styling)
   - Dismiss button with session persistence

3. **Styling guide**
   - Tier colors (green/blue/yellow/gray)
   - Mentor box: distinct but not harsh (gold border? light bg?)
   - Typography: title (24px), bullets (14px), mentor prose (16px)
   - Spacing: breathing room, not cramped

4. **Integration points**
   - Receive suggestion objects from engine (pre-scored, pre-explained)
   - Display as-is (no modification)
   - Pass quantity + item ID to purchase flow

5. **Caching logic**
   - Mentor review = 1 per item per character context
   - Cache until context change (level, talent, etc.)
   - Dismiss = session-level (don't repeat until reload)

---

**This is production-ready. Implement with confidence.**
