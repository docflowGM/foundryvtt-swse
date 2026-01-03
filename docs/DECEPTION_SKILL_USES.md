# Deception Skill Complete Reference

## Overview

The Deception skill encompasses many uses: cunning, fast-talking, misdirection, forgery, disguise, and outright lying. This guide covers all 10 uses of the Deception skill from SWSE core and supplemental rulebooks.

## Core Rules

**Special Rules:**
- You can **Take 10** on Deception checks (except Feinting in combat)
- You cannot **Take 20** on Deception checks
- Retry: Generally no (except Feinting, where you may retry freely)

**Difficulty Modifiers:**

| Difficulty | Modifier | Description |
|------------|----------|-------------|
| Simple | +5 | Works in target's favor or matches expectations |
| Moderate | +0 | Believable, doesn't affect target much |
| Difficult | -5 | Hard to believe, puts target at some risk |
| Incredible | -10 | Hard to believe, presents sizable risk |
| Outrageous | -20 | Almost too unlikely, requires materials you lack |

## Deception Uses

### 1. Deceive (Core Rulebook)

**Action:** Minimum Standard Action (longer for elaborate deceptions)

**Opposition:** Target's Will Defense

**Effect:** Target believes something untrue or is temporarily confused

**How it Works:**
1. You make a Deception check
2. Compare result to target's Will Defense
3. If your check ≥ Will Defense, target believes you

**Duration:** Short-term effect, typically until contradictory information is received

**Examples:**
- Convince a dealer to buy stolen droids
- Convince a guard you're not a thief
- Make target believe someone was behind them
- Convince a captain their orders have changed

**GM Discretion:** Distinguish between:
- **Failed due to disbelief**: Target sees through deception
- **Failed due to reluctance**: Deception is believable but target won't act on it
  - Failure by 10 or less = target reluctant despite believing
  - Failure by 11+ = target doesn't believe

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.makeDeceptionCheck(
  actor, target, 'moderate'
);
```

---

### 2. Deceptive Appearance (Core Rulebook)

**Action:** 1 minute (Simple), 10 minutes (Moderate), 1 hour (Difficult), 1 day (Incredible), 2 weeks (Outrageous)

**Opposition:** Target's Perception check

**Effect:** Creates a convincing disguise or forged document

**Examples:**
- Disguise yourself as someone nonspecific
- Create false ID for casual inspection
- Disguise as different species/gender
- Create false ID for visual security
- Forge transponder codes
- Forge official documents for electronic screening

**Rushing:** Can create in less time by treating difficulty one step easier, but take -10 penalty

**Comparison:** Make single Deception check, compare to all Perception checks of characters who encounter it

**When Combined with Deceptive Information:**
- Make single Deception check
- Compare to both target's Perception check AND Will Defense

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.createDeceptiveAppearance(
  actor, 'disguise', 'moderate'
);
```

---

### 3. Deceptive Information (Core Rulebook)

**Action:** Standard Action (Simple), Full-Round Action (Moderate), 1 minute+ (Difficult/Incredible/Outrageous)

**Opposition:** Target's Will Defense

**Effect:** Target believes communicated lie or distorted facts

**How it Works:**
- Verbal lies (requires target to understand you)
- Written/recorded deceptions (compared to all who later view it)
- Gestures, body language, facial expressions

**Rushing:** Can communicate in less time by treating one step easier, but take -10 penalty

**When Combined with Deceptive Appearance:**
- Roll once, compare to both Perception check AND Will Defense

**Examples:**
- Tell lies to mislead target
- Distort facts to lead to false conclusion
- Impersonate an officer to give orders
- Create falsified documents with believable content
- Transmit false official reports

---

### 4. Create a Diversion to Hide (Core Rulebook)

**Action:** Part of Stealth check (uses Stealth after Deception succeeds)

**Opposition:** Target's Will Defense

**Effect:** Create momentary diversion allowing Stealth check while target is aware

**How it Works:**
1. Make Deception check vs target's Will Defense
2. If successful, can immediately attempt Stealth check while target is aware
3. Target's attention is diverted by your deception

**Examples:**
- Point somewhere and have target look that direction
- Create a distraction allowing you to slip away

---

### 5. Create a Diversion to Hide an Item (Force Unleashed Campaign Guide)

**Action:** Part of Stealth check to hide item

**Opposition:** Target's Will Defense

**Effect:** Create momentary diversion allowing you to hide item on person while observed

**How it Works:**
1. Make Deception check vs target's Will Defense
2. If successful, immediately attempt Stealth check to hide item on your person
3. Item is concealed while target watches

**Time:** Same as Stealth check

**Examples:**
- Hide a small weapon while guard is watching
- Slip evidence into pocket while interrogator is distracted
- Conceal communication device on your person

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.diversionToHideItem(
  actor, target
);
```

---

### 6. Feint (Combat Mechanic)

**See:** INITIATIVE_MECHANICS.md - Feint section

---

### 7. Alternative Story (Scum and Villainy - Trained Only)

**Requirement:** Must be Trained in Deception

**Trigger:** Immediately after a failed Deception check

**Opposition:** Target's Will Defense (same target)

**Penalty:** -10 on the recovery check

**How it Works:**
1. You fail a Deception check
2. As immediate reaction, attempt Alternative Story
3. Make new Deception check at -10 penalty against same target
4. If successful, avert suspicion

**Use Case:** When your initial lie/disguise fails and you need a quick excuse

**Strategic Value:**
- Recover from failed deceptions
- Only one chance per failed attempt
- Must be creative about alternative explanation

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.alternativeStory(
  actor, target, failureMargin
);
```

---

### 8. Cheat (Scum and Villainy - Trained Only)

**Requirement:** Must be Trained in Deception

**Action:** During gambling/games of chance

**Opposition:**
- Other players: Perception check
- House security: DC 15-35 depending on location

**House DCs:**
| Location Quality | DC |
|------------------|-------|
| Common location | DC 15 |
| Good location | DC 25 |
| Best location | DC 35+ |

**How it Works:**
1. When gambling against other characters, substitute Deception for Wisdom check
2. Opponents roll Perception check to detect cheating
3. If Perception ≥ Deception check, they catch you
4. Against house: beat the location's security DC or get caught

**Consequences:**
- **Caught by other players:** They know you cheated
- **Caught by house:** Respond as appropriate (banned, arrested, physical harm, etc.)

**Examples:**
- Rigging dice
- Card manipulation
- Distraction techniques
- Hidden switches/devices

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.cheat(
  actor, againstHouse = true, 'good'
);
```

---

### 9. Feign Haywire (Force Unleashed - Droids Only)

**Requirement:** Must be a Droid

**Action:** Full-Round Action

**Opposition:** Will Defense of all targets in line of sight

**Effect:** All targets who fail roll are Flat-Footed against you

**How it Works:**
1. Droid pops open access panels
2. Makes erratic movements
3. Produces electronic/mechanical noises
4. Makes Deception check
5. All targets in line of sight must match or beat check with Will Defense
6. Those who fail are Flat-Footed

**Duration:** Lasts until droid takes any Action

**Mechanics:**
- Simulating malfunction to confuse enemies
- Only droid character type can use
- Affects all visible targets
- Single check for all targets

**Strategic Uses:**
- Before attacking to gain flat-footed benefit
- To cause confusion in combat
- To escape while enemies are distracted

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.feignHaywire(actor);
```

---

### 10. Innuendo (Scum and Villainy - Trained Only)

**Requirement:** Both speaker and recipient must be Trained in Deception

**Action:** Simultaneous with conversation

**Opposition:** Perception checks of anyone observing

**Message DCs:**
| Complexity | DC |
|-----------|-----|
| Simple message | DC 10 |
| Moderate message | DC 15 |
| Complex message | DC 20 |
| Very complex message | DC 25 |

**How it Works:**
1. You transmit secret message using:
   - Hand gestures
   - Code words
   - Body language
   - Subtle hints
2. Only trained Deception users understand intent
3. Anyone else who sees/hears can attempt Perception check to decipher

**Perception Opposition:**
- DC = Your Deception check DC
- Environmental modifiers: loud noise (-modifier), dim lighting (-modifier), distance (-modifier)

**Security:**
- Only other Trained Deception users can reliably understand
- Non-trained must beat Perception DC to figure out message
- Untrained opponents likely won't understand intent

**Examples:**
- Coded messages to allies
- Hidden instructions in casual conversation
- Secret signals between thieves
- Passing intelligence without being obvious
- Coordinating clandestine operations

**Implementation:**
```javascript
const result = await SWSE.DeceptionUses.innuendo(
  actor, recipient, 'moderate'
);
```

---

## Vehicle Deception Modifications

When you are the Pilot of a Vehicle, you can make Deception checks with the following modification:

**Deception Check Modifier:**
- Add vehicle's **size modifier**
- Add your **DEX modifier**
- Subtract **5 if not Trained in Pilot**

**Applicable Uses:**
- **Create a Diversion to Hide**
- **Create a Diversion to Hide an Item**
- **Feint** (only vehicle's first attack benefits, not gunners)
- **Cheat** (piloting games/skill competitions)

**Example Calculations:**

**Huge Starfighter Pilot (+1 DEX, Trained in Pilot):**
```
Deception check = 1d20 + Deception skill + (-2 for huge) + (+1 DEX) + 0 (trained)
                = 1d20 + Deception skill - 1
```

**Gargantuan Cruiser Pilot (+0 DEX, NOT Trained in Pilot):**
```
Deception check = 1d20 + Deception skill + (-5 for gargantuan) + (0 DEX) + (-5 not trained)
                = 1d20 + Deception skill - 10
```

---

## Implementation Methods

### Basic Deception Check
```javascript
const result = await SWSE.DeceptionUses.makeDeceptionCheck(
  actor,           // Actor making the check
  target,          // Target of deception
  'moderate'       // Difficulty: simple/moderate/difficult/incredible/outrageous
);

if (result.success) {
  console.log(`Success by ${result.margin}!`);
}
```

### Vehicle Feint
```javascript
const result = await SWSE.DeceptionUses.cheat(
  vehicleActor,
  true,           // Against house
  'good'          // Location quality
);
```

### Droid Haywire
```javascript
const result = await SWSE.DeceptionUses.feignHaywire(droidActor);
if (result.success) {
  // All enemies in LOS must beat DC with Will Defense or be flat-footed
}
```

### Secret Message
```javascript
const result = await SWSE.DeceptionUses.innuendo(
  speaker,        // Actor with Deception trained
  recipient,      // Actor with Deception trained
  'complex'       // Message complexity
);
```

---

## GM Guidance

### Using Favorable/Unfavorable Circumstances

**Against Deception:**
- Lie is hard to believe
- Action requested by target goes against their self-interest
- Action conflicts with target's nature, personality, or orders

**For Deception:**
- Deception plays into target's desires
- Deception is simple and straightforward
- Target is predisposed to believe

### When to Allow Retry

- **Feint**: Always (can retry freely in combat)
- **Deceive**: Generally no (unless significant time has passed)
- **Deceptive Appearance**: New deception required (can't retry same disguise)
- **Alternative Story**: Only once per failed check
- **Cheat**: At your discretion (repeated attempts increase detection risk)

### Consequences of Failure

**Deceive/Deceptive Information:**
- Target is too suspicious for further deception in same circumstances
- Target becomes hostile or defensive
- May alert others to deception attempt

**Deceptive Appearance:**
- Disguise is seen through
- Target detects the forgery
- May raise alarm or alert others

**Cheat:**
- Other players know you cheated
- House/security ejects you or takes action
- Reputation damage in community

**Feint Haywire (Droid):**
- Droid has wasted action
- Enemies are alert and not flat-footed
- Combat initiative may be compromised

---

## Skill Synergies

- **Deception + Stealth**: Hide after successful diversion
- **Deception + Perception**: Detect others' deceptions
- **Deception + Persuasion**: Combined social influence
- **Deception + Performance**: Enhance disguises with acting
- **Deception + Mechanics**: Forge complex technical documents
- **Deception + Pilot**: Vehicle-scale deception (feint, diversion)

---

## Reference Books

- **Deceive, Deceptive Appearance, Deceptive Information, Create Diversion to Hide**: Star Wars Saga Edition Core Player's Handbook
- **Alternative Story, Cheat, Innuendo**: Star Wars Saga Edition Scum and Villainy
- **Feign Haywire, Create Diversion to Hide an Item**: Star Wars Saga Edition Force Unleashed Campaign Guide
- **Feint**: Deception skill detailed in Skills chapter
