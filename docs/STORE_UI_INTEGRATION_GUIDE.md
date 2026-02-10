# Store UI Integration Guide

**Version:** 1.0
**Purpose:** Prevent UX drift when implementing Store UI for suggestion engine

---

## Architecture: Cards + Mentor

Two distinct surfaces, never collapsed into one.

### Surface 1: Cards (Primary, 90% of interaction)

**Purpose:** Discovery + Comparison

**When visible:**
- Always visible when store opens
- Player controls how much detail to see

**What to show:**
- Item name + image (200px recommended)
- Contextual label (from engine tier)
- 2–4 explanation bullets (from engine)
- Price / availability
- Subtle "Why?" affordance

**Example (collapsed):**
```
┌──────────────────────────────────┐
│  HEAVY BATTLE ARMOR              │
│  ★★★★☆  Strong Fit              │
│                                  │
│  • Armor Mastery lets you move   │
│  • Defender role + survivability │
│  • 12,000 credits                │
│                                  │
│  [Why? ▸]                        │
└──────────────────────────────────┘
```

**Example (expanded on click/hover):**
```
┌──────────────────────────────────┐
│  HEAVY BATTLE ARMOR              │
│  ★★★★☆  Strong Fit              │
│                                  │
│  • Armor Mastery lets you move   │
│  • Defender role + survivability │
│  • Scales positively with level  │
│  • Premium cost—big investment   │
│                                  │
│  [Compare] [Details] [Inspect]   │
└──────────────────────────────────┘
```

**Interactivity:**
- Click "Why?" → Expand card, show all 4 explanations
- Click "Compare" → Side-by-side with another armor
- Click "Details" → Full compendium entry
- Never triggers mentor dialogue

---

### Surface 2: Mentor (Secondary, triggered only in 4 cases)

**Purpose:** Interpretation + Framing (not enumeration)

**When the mentor speaks:**

1. **Strong Recommendation + Clear Gap** (≥15 points over second place)
   - Only if label is "Strong Fit"
   - Only first time (respect "no mentor" preference)
   - Example: Level-15 Soldier with Armored Defense

2. **Counterintuitive Outcome**
   - "No Armor" is top suggestion (unexpected)
   - Different from player's last known choice
   - Example: High-mobility Scout finding unarmored best

3. **Talent Acquisition Changes Rules**
   - Character just acquired armor talent
   - This flips the viability of armor in meaningful way
   - Example: "You've learned to move in armor now"

4. **First-Time Onboarding**
   - Player's first visit to store (storeVisits === 0)
   - One-time only, never repeats
   - Example: "This store tailors gear to your fighting style"

**What the mentor should NOT do:**
- List items or enumerate
- Rank or say "best"
- Fire every time store opens
- Override player agency
- Repeat after dismissal

**What the mentor SHOULD do:**
- Summarize the engine's reasoning in narrative form
- Frame tradeoffs in diegetic language
- Validate or explain counterintuitive outcomes
- Use 1–2 sentences max
- Disappear after speaking

**Example mentor phrases:**

| Situation | Mentor Says |
|---|---|
| STR Defender with armor talents | "You've trained to fight in armor. Skipping it now wastes that discipline." |
| DEX Scout finding No Armor best | "Your reflexes alone are strong. Heavy armor would slow you down." |
| Just acquired Armor Mastery | "You've learned to move naturally in combat armor now. That restriction you felt? Gone." |
| First visit to store | "This store has equipment tailored to fighters like you. Cards show how well each suits your style." |

---

## Implementation Contract

### What the Store UI Receives (from Engine)

```javascript
{
  characterId: "actor-id",
  topSuggestions: [
    {
      armorId: "heavy-armor-1",
      armorName: "Heavy Battle Armor",
      score: 42,
      tier: "strong-fit",  // Used for label
      explanations: [
        "Armor Mastery lets you move freely",
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
    },
    // ... more suggestions
  ],
  summary: {
    recommendation: "Heavy Battle Armor is your best choice",
    topChoice: { ... }
  }
}
```

### What the Store UI Does (NOT)

❌ Do NOT:
- Query engine again (use suggestion object provided)
- Check talent presence
- Calculate role alignment
- Modify explanations
- Rank by price
- Override tier labels

✅ Do:
- Display suggestions in order (engine ranks them)
- Show all 4 explanations (in card expansion)
- Render tier label directly
- Allow purchase/equip
- Respect user dismissals
- Show "No Armor" as option if present

---

## Mentor Trigger Logic (Pseudocode)

```javascript
function shouldMentorSpeak(topSuggestion, characterContext, playerPrefs) {
  // Respect player preference
  if (playerPrefs.mentorDismissed) return null;

  // Rule 1: Strong recommendation with clear gap
  if (topSuggestion.scoreGap > 15 &&
      topSuggestion.tier === "strong-fit" &&
      !playerPrefs.hasSeenRecommendationMentor) {
    return {
      type: "strong-recommendation",
      trigger: topSuggestion
    };
  }

  // Rule 2: Counterintuitive outcome (No Armor wins)
  if (topSuggestion.armorId === "NO_ARMOR" &&
      characterContext.lastArmorId !== "NO_ARMOR") {
    return {
      type: "counterintuitive",
      trigger: topSuggestion
    };
  }

  // Rule 3: Talent just acquired
  if (characterContext.talents.armoredDefense &&
      !playerPrefs.previousTalents?.armoredDefense) {
    return {
      type: "talent-acquired",
      talent: "armoredDefense"
    };
  }

  // Rule 4: First visit (storeVisits === 0)
  if (characterContext.storeVisits === 0) {
    return {
      type: "onboarding"
    };
  }

  return null;  // Mentor stays silent
}
```

---

## Card Anatomy Reference

### Collapsed Card (Default)
- **Title:** Item name (20px, bold)
- **Label:** Tier name (14px, colored badge)
- **Explanation 1:** Primary reason (14px, regular)
- **Explanation 2:** Secondary reason (14px, regular)
- **Price:** Right-aligned (12px, subtle)
- **Affordance:** "Why? ▸" or "►" (clickable)

### Expanded Card (On interaction)
- **Title:** Item name
- **Label:** Tier name
- **All 4 explanations:** Full bullets
- **Price + Availability:** Full details
- **Action buttons:** [Compare] [Details] [Inspect]

---

## Tier Label Mapping

Engine tier → UI Label

| Engine Tier | UI Label | Color | Icon |
|---|---|---|---|
| `strong-fit` | ★★★★★ Strong Fit | Green | ✓ |
| `viable` | ★★★★☆ Viable | Blue | ○ |
| `situational` | ★★★☆☆ Situational | Yellow | ⚠ |
| `outperformed` | ★★☆☆☆ Outperformed | Gray | ✗ |

---

## When Mentor Speaks: Context

The mentor's interpretation should reference:
- Character's **role** (from context)
- Character's **recent choices** (implicit)
- Character's **talents** (explicit)
- Tradeoffs present in top suggestion

Never reference:
- Math or weights
- "Score gaps" or "tiers" (diegetic language only)
- Other players' choices
- "Best" or absolutes

---

## Example Flow: Level-Up + Talent Acquired

```
1. Character levels to 10, acquires Armor Mastery
2. Store UI queries: ArmorSuggestions.generateSuggestions(char, compendium)
3. Engine returns: Heavy Armor now score 42 (was 28)
4. Store UI renders card with "Strong Fit" label
5. shouldMentorSpeak() returns { type: "talent-acquired" }
6. Mentor appears: "You've learned to move in armor now.
                    That restriction you felt? Gone."
7. Player clicks "Why?" → card expands, shows all 4 reasons
8. Player clicks "Equip" → armor equipped
9. Next visit: mentor silent (rule already triggered)
```

---

## Preventing UX Drift (Enforcement Rules)

**Lock these to prevent future mistakes:**

1. **Mentor never lists items**
   - If you're tempted to show a list in mentor dialogue, put it on cards instead

2. **Mentor never ranks**
   - If mentor says "better", that's a bug

3. **Mentor respects dismissal**
   - Once player dismisses mentor, respect it (at least for session)

4. **Cards show engine output as-is**
   - Never modify explanation text
   - Never reorder explanations
   - Never hide explanations based on UI space

5. **No double-queries**
   - Store UI gets one suggestion object per character context
   - If UI feels confused, that means explanations are unclear (fix engine, not UI)

---

## Next Steps

1. **Sketch card component** with exact measurements
2. **Design mentor voice** (character, tone, examples)
3. **Build mentor trigger system** with playerPrefs persistence
4. **Create integration test** with example characters
5. **Test with first-time and returning players**

---

**End of Document**
