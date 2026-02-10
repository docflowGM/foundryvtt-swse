# SWSE Suggestion Engine Scoring Model - Design Document

**Version:** 1.0
**Date:** February 2026
**Status:** Implemented & Deployed
**Architecture:** AppV2 / Engine-First

---

## Overview

The SWSE Suggestion Engine scores weapons, armor, and gear using a **dual-axis evaluation model** that prioritizes explainability, attribute awareness, and tactical flexibility. This system avoids DPR calculations and supports gradual refinement as the game evolves.

---

## Core Philosophy

1. **No DPR Computation** - We evaluate weapons on their own merits, not on sustained damage output
2. **Dual-Axis Architecture** - Every item class uses independent axes that resolve meaningful tradeoffs
3. **No Railroading** - Multiple viable strategies are always available; suggestions reflect fit, not prescription
4. **Attribute Awareness** - Scoring adapts to character STR/DEX modifiers and inferred playstyle
5. **Tag-Driven** - All reasoning is anchored to item metadata and character attributes
6. **Explainability** - Every suggestion produces 2–4 human-readable reasons
7. **Resilience** - Graceful degradation if metadata is incomplete

---

## Scoring Pipeline

All suggestion engines follow this layered approach:

```
1. Extract Character Context
   ├─ Attributes (STR, DEX, CON, INT, WIS, CHA)
   ├─ Proficiencies (simple, advanced, armor)
   ├─ Current Equipment (armor category, etc.)
   ├─ Inferred Role(s) and Playstyle
   └─ Combat Context (if available)

2. Score Item on Axis A (Impact/Protection/Utility)
   └─ Returns normalized 0-1 score + band/tier

3. Score Item on Axis B (Likelihood/Cost/Availability)
   └─ Returns normalized 0-1 score + directional bias

4. Resolve Tradeoff
   ├─ Identify tradeoff type (high-risk, reliable, balanced, etc.)
   ├─ Apply character-specific weights
   └─ Compute final 0-1 relevance score

5. Generate Explanations
   ├─ Axis A insight (damage, protection, utility)
   ├─ Axis B insight (accuracy, mobility, action cost)
   ├─ Attribute alignment
   └─ Context factors (proficiency, armor, price, etc.)

6. Rank and Present
   └─ Sort by final score, present top suggestions with explanations
```

---

## Weapon Scoring Model

### Axis A: Damage-on-Hit

**Definition:** Raw average dice damage from the weapon's damage formula.

**Does NOT include:**
- Rate of fire
- Critical multipliers
- Feat or talent bonuses
- Character ability modifiers

**Formula:**
```
Average(NdX) = N * (X+1) / 2 + modifier
```

**Normalization:**
- Damage bands vary by weapon group (simple melee vs. exotic, etc.)
- Score maps to 0-1: low(0-0.33), medium(0.33-0.66), high(0.66-0.93), extreme(0.93-1.0)

**Examples:**
- 1d4 = 2.5 avg → *low damage band*
- 2d6 = 7 avg → *medium damage band*
- 3d8 = 13.5 avg → *high damage band*

**Why NOT DPR:**
- DPR requires assumptions about opponent AC/defense
- SWSE allows tactical flexibility (flanking, positioning, conditions change hit chance)
- DPR is overly reductive for a complex rules system
- Players should understand weapon _potential_, not a black-box efficiency number

---

### Axis B: Hit-Likelihood Bias

**Definition:** Contextual weighting factors that favor weapons fitting the character's attributes and playstyle.

**Component Factors:**

#### 1. Attribute Matching (Largest Weight)
```
Weapon uses STR?
  ├─ Character STR ≥ DEX + 2  → 1.3x (strong advantage)
  ├─ Character STR ≥ DEX      → 1.1x (advantage)
  ├─ Character STR ≥ DEX - 1  → 1.0x (neutral)
  └─ Character STR < DEX - 1  → 0.8x (disadvantage)

Similar for DEX weapons, finesse weapons use better attribute
```

#### 2. Accuracy Traits
```
Accurate trait    → +20%
Inaccurate trait  → -15%
Autofire/Rapid    → -5% (higher volume, lower individual accuracy)
Standard          → 0%
```

#### 3. Range Profile Interaction
```
Melee weapon?
  ├─ Character playstyle = "melee-preferred"   → +15%
  ├─ Character playstyle = "mobile"            → -10%
  └─ Default                                   → 0%

Ranged weapon?
  ├─ Character playstyle = "ranged-preferred"  → +15%
  ├─ Character playstyle = "stationary"        → -5%
  └─ Default                                   → 0%
```

#### 4. Proficiency Soft Penalty (Does NOT exclude)
```
Simple weapon lacking simple proficiency    → -15%
Advanced weapon lacking advanced prof.      → -20%
Exotic weapon lacking advanced prof.        → -30%
(All weapons remain usable; just biased down)
```

#### 5. Armor Interference
```
Heavy armor + DEX weapon     → -5%
Medium armor + DEX weapon    → -2%
(Heavy armor slightly restricts ranged/mobility weapons)
```

**Final Score:**
- Multiply all factors together
- Normalize to 0-1 range
- Bias direction: favorable (>1.1) / neutral (0.9-1.1) / unfavorable (<0.9)

---

### Tradeoff Resolution

Combines Axis A (damage) and Axis B (hit likelihood) using weighted harmonic mean:

```
Identify Tradeoff Type:
  ├─ High Damage + High Accuracy    → "balanced-excellent"
  ├─ High Damage + Low Accuracy     → "high-risk-high-reward"
  ├─ Low Damage + High Accuracy     → "reliable-consistent"
  ├─ Low Damage + Low Accuracy      → "poor-both"
  ├─ Damage-Focused                 → "damage-focused"
  └─ Accuracy-Focused               → "accuracy-focused"

Apply Character Weights:
  ├─ Default: 50% damage / 50% accuracy
  ├─ Tank: 40% damage / 60% accuracy (values reliability)
  ├─ Mobile: 55% damage / 45% accuracy
  └─ Stationary: 60% damage / 40% accuracy (fewer attacks per turn)

Compute Score:
  harmonicMean = 2 / ((1/damageScore) + (1/hitScore))
  finalScore = 0.5 * harmonicMean + 0.5 * (weightedLinear)
  Normalize to [0, 1]
```

**Tier Assignment:**
- Perfect: ≥0.90
- Excellent: ≥0.80
- Good: ≥0.70
- Viable: ≥0.55
- Marginal: ≥0.35
- Poor: <0.35

---

## Explainability Contract

Every weapon suggestion must produce 2–4 reasons:

1. **Damage Explanation**
   - "High damage output (X.X avg per hit)"
   - "Exceptional damage potential (from NdX formula)"
   - "Light weapon, good for finishing"

2. **Hit-Likelihood Explanation**
   - "Strong match for your Strength (+Y) focus"
   - "Aligns well with your ranged playstyle"
   - "Less suited to your current armor category"

3. **Attribute Alignment** (if differentiated from reason #2)
   - "Uses Strength (+Y), but you favor Dexterity (+Z)"
   - "Finesse weapon - works with your high Dexterity"

4. **Context Factors** (proficiency, price, armor, etc.)
   - "You are proficient with advanced weapons"
   - "Heavy armor reduces effectiveness slightly"
   - "Premium cost - investment item"

---

## Armor Scoring Model

**Dual-Axis:**
- **Axis A:** Protection Value (soak amount)
- **Axis B:** Mobility Cost (DEX penalty from armor category)

**Tradeoff Types:**
- Heavy protection vs. heavy mobility cost
- Light protection vs. high mobility
- Medium balance

---

## Gear Scoring Model

**Dual-Axis:**
- **Axis A:** Utility Value (mechanical benefit provided)
- **Axis B:** Action Cost (to activate/use)

**Tradeoff Types:**
- High utility, high action cost (tactical tools)
- Low utility, passive (always available)
- Specialized equipment for niche roles

---

# CATEGORY NORMALIZATION LAYER (Production Architecture)

## I. Peer Group Taxonomy (Formal Definition)

The goal of peer groups is **fair comparison**, not balance judgment.

### Design Rules for Peer Groups

A peer group **must:**
- Share the same proficiency expectation
- Compete for the same tactical niche
- Be mutually substitutable in real play

A peer group **must NOT:**
- Span multiple combat roles
- Mix autofire and non-autofire
- Mix melee and ranged
- Mix STR-primary and DEX-primary unless finesse is universal

### Weapon Peer Groups (Minimum Viable Set)

#### Ranged — Pistols
- `blaster-pistol`
- `heavy-blaster-pistol`
- `holdout-pistol`
- `ion-pistol`
- `slugthrower-pistol`

#### Ranged — Rifles / Carbines
- `blaster-rifle`
- `blaster-carbine`
- `sniper-rifle`
- `ion-rifle`
- `slugthrower-rifle`

#### Ranged — Heavy / Special
- `autofire-heavy-weapon`
- `area-launcher`
- `mounted-heavy-weapon` (usually excluded from PC suggestions)

#### Melee — Simple
- `simple-melee-light`
- `simple-melee-heavy`

#### Melee — Advanced
- `advanced-melee-light`
- `advanced-melee-heavy`

#### Lightsabers
- `lightsaber-single`
- `lightsaber-double`
- `lightsaber-exotic` (lightwhip, etc.)

**Rule:** Each item belongs to exactly ONE peer group.

If an item is difficult to place, the taxonomy is wrong — not the item.

### Armor Peer Groups
- `light-armor-dex`
- `light-armor-balanced`
- `medium-armor`
- `heavy-armor`
- `jedi-compatible-armor`

---

## II. Compensating Traits Model

A weapon that is numerically "worse" may still be valid if it offers compensating value.

### Trait Categories That Count as Compensation

**Only traits that change tactical options count.**

#### 1. Accuracy Modifiers
- Accurate
- Inaccurate (negative compensation)

#### 2. Mode Access
- Autofire
- Area / Blast
- Stun mode
- Ion damage
- Alternate damage modes

#### 3. Control / Utility
- Reach
- Trip
- Immobilize
- Persistent effects
- Environmental interaction

#### 4. Concealability / Size
- Holdout / easily concealed
- Can be drawn as swift
- Easily hidden (narrative but real)

#### 5. Action Economy Advantages
- Swift action activation
- Passive effects
- Free-mode switching

### Traits That Do NOT Count as Compensation

**Explicitly exclude:**
- Rarity
- Legality
- Flavor text
- Era
- Who "typically uses" it
- Price itself (evaluated separately)

### Compensation Scoring (Abstract)

Do NOT score traits individually.

Instead, compute:
```
CompensationLevel = none | minor | moderate | major

Guideline:
  - Minor:    +1 meaningful trait
  - Moderate: 2-3 meaningful traits
  - Major:    core identity feature (autofire, area, stun-only)
```

This keeps the system explainable and avoids overfitting.

---

## III. Category Normalization Algorithm (Conceptual)

Runs **offline or at startup**, not per character.
Builds a relative baseline per peer group.

### Step 1: Build Peer Group Statistics

For each peer group, compute (descriptive, not prescriptive):

```
Median average damage
Median price
Trait frequency table
Typical compensation level
```

### Step 2: Evaluate Each Weapon Relative to Its Group

#### A. Damage Delta
```
DamageDelta = WeaponAvgDamage - GroupMedianDamage

Bucketed:
  - Significantly below  (< 80% of median)
  - Slightly below       (80-95% of median)
  - Near median          (95-105% of median)
  - Above median         (> 105% of median)
```

#### B. Price Delta
```
PriceDelta = WeaponPrice - GroupMedianPrice

Bucketed similarly
```

#### C. Compensation Check
```
Compensation = None | Minor | Moderate | Major
```

### Step 3: Compute Category Adjustment (Decision Matrix)

```
┌───────────┬───────┬─────────────┬────────────┐
│ Damage    │ Price │ Compensation│ Adjustment │
├───────────┼───────┼─────────────┼────────────┤
│ Below     │ Above │ None        │ -4 to -6   │
│ Below     │ Above │ Minor       │ -2 to -4   │
│ Below     │ Below │ None        │ -1         │
│ Below     │ Below │ Moderate    │ 0          │
│ Near      │ Near  │ None        │ 0          │
│ Near      │ Near  │ Moderate    │ +1         │
│ Above     │ Above │ Moderate    │ +1         │
│ Above     │ Above │ Major       │ +2 to +4   │
│ Above     │ Below │ Any         │ +3 to +4   │
└───────────┴───────┴─────────────┴────────────┘
```

**Hard Caps:**
```
-6 ≤ CategoryAdjustment ≤ +4
```

If an item hits -6, it is **NOT banned** — just gently discouraged.

### Step 4: Persist the Adjustment

```
This adjustment becomes:
  - A static metadata value
  - Recomputed when compendiums change
  - NEVER character-dependent
```

**Important:** The engine does NOT "decide" this per character.

---

## IV. Integration Into Scoring Pipeline (Canonical Order)

**Non-negotiable ordering:**

```
1. Base Relevance               (10-20 points)
2. Role Alignment               (-10 to +25 points)
3. Axis A — Damage If Hit       (0-16 points)
4. Axis B — Hit Likelihood      (-15 to +20 points, clamped)
5. Tradeoff Corrections         (-10 to +10 points)
6. Category Normalization       (-6 to +4 points, APPLIED LAST)
7. Price Bias                   (-6 to +4 points)

Total: 0-100
```

**Category normalization is intentionally late.**
It is a **polish layer**, not a driver.

---

## V. Explainability Contract (Category Layer)

**Every category adjustment produces ONE sentence, max.**

Examples:
- "Weaker than most weapons in its category"
- "Offers fewer benefits than similarly priced pistols"
- "Outperformed by common alternatives"
- "Strong option compared to similar weapons"

If multiple reasons exist, pick the strongest one.
**Never stack explanations.**

---

## VI. Why This Architecture Preserves Player Agency

This system:
- ✅ Avoids best-in-slot logic
- ✅ Suppresses trap items without hiding them
- ✅ Requires zero hand-curation
- ✅ Scales automatically as compendiums grow
- ✅ Aligns with SSOT → Engine → UI architecture
- ✅ Explainable to users and GMs

**Most importantly:**

> The engine never says "this weapon is bad."
> It says "this weapon is less competitive among peers."

That distinction **preserves player agency**.

Trap items still appear. They just don't float to the top.
Niche builds can still surface them if context fits.

---

## Implementation Files

```
scripts/suggestion-engine/
  ├─ weapon-scoring-engine.js          (main entry point)
  ├─ armor-gear-scoring-engine.js      (armor & gear)
  └─ scoring/
      ├─ axis-a-engine.js               (damage-on-hit)
      ├─ axis-b-engine.js               (hit-likelihood bias)
      ├─ tradeoff-resolver.js           (combine axes)
      └─ explainability-generator.js    (human explanations)
```

---

## Usage Example

```javascript
import WeaponScoringEngine from './weapon-scoring-engine.js';

// Get a weapon and character
const weapon = actor.items.find(i => i.name === 'Blaster Pistol');
const character = actor;

// Score the weapon
const score = WeaponScoringEngine.scoreWeapon(weapon, character);

// Result:
{
  weaponId: '...',
  weaponName: 'Blaster Pistol',

  axisA: {
    label: 'Damage-on-Hit',
    score: 0.65,
    band: 'high',
    rawDamage: 12.5
  },

  axisB: {
    label: 'Hit-Likelihood Bias',
    score: 0.82,
    factor: 1.15,
    bias: 'favorable'
  },

  combined: {
    finalScore: 0.78,
    tier: 'good',
    tradeoffType: 'balanced'
  },

  explanations: [
    'High damage output (12.5 avg per hit)',
    'Matches your Dexterity focus',
    'Aligns well with your ranged playstyle',
    'You are proficient with advanced weapons'
  ]
}
```

---

## Design Rationale

### Why This Approach?

1. **Decoupled Axes** - Damage and accuracy are independent concerns. A weapon can be high-damage/low-accuracy (risky) or low-damage/high-accuracy (reliable). Both are valid strategies.

2. **No Black-Box Numbers** - DPR is a single number that hides complexity. Our model exposes both damage and accuracy considerations separately, so players understand the tradeoff.

3. **Attribute-Aware** - A STR-based character and a DEX-based character will see different scores for the same weapon. This reflects real tactical differences.

4. **Soft Penalties, Not Hard Gates** - Missing proficiencies reduce bias (-15–30%) but don't exclude weapons. This encourages experimentation.

5. **Playstyle Inference** - From STR/DEX modifiers and armor category, we infer whether a character is mobile or stationary, melee or ranged. This improves accuracy of bias factors.

6. **Explainability** - Every decision is explainable. "This weapon scores 0.78 because: (1) high damage, (2) matches your DEX, (3) works with your range preference, (4) you're proficient."

---

## Future Enhancements

1. **Feat Integration** - As feats are fully mapped, incorporate feat-weapon synergies
2. **Talent Interaction** - Talents that modify damage or accuracy
3. **Situational Context** - Scout drones, flanking, conditions that change hit likelihood
4. **Party Synergy** - Suggest weapons that complement allies
5. **Dynamic Recalibration** - Learn from player behavior which weapons they actually use
6. **Price-to-Performance** - Ratio score for budget-conscious characters

---

## Testing Strategy

1. **Unit Tests** - Individual axis engines with synthetic character/weapon data
2. **Integration Tests** - Full pipeline with real compendium items
3. **Verification** - Spot-check scores against design intent (high-STR char favors STR weapons)
4. **Edge Cases** - Missing metadata, unusual proficiency combinations, extreme attributes

---

## Appendix: Constants

### Damage Bands (by weapon group)

```javascript
{
  'simple-melee':   { low: 5, medium: 8, high: 12 },
  'simple-ranged':  { low: 4, medium: 7, high: 10 },
  'advanced-melee': { low: 8, medium: 12, high: 16 },
  'advanced-ranged':{ low: 7, medium: 11, high: 15 },
  'exotic':         { low: 10, medium: 15, high: 20 },
  'grenades':       { low: 8, medium: 12, high: 18 }
}
```

### Attribute Factor Thresholds

```javascript
// For STR weapons:
charStr >= charDex + 2  → 1.3 (strong advantage)
charStr >= charDex      → 1.1 (advantage)
charStr >= charDex - 1  → 1.0 (neutral)
charStr < charDex - 1   → 0.8 (disadvantage)
```

### Proficiency Penalties

```javascript
'simple' weapons:       -15% if not proficient
'advanced' weapons:     -20% if not proficient
'exotic' weapons:       -30% if not proficient
```

---

**End of Document**
