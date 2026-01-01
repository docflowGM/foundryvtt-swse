# SWSE Feats & Talents Complete Implementation Roadmap

**Date:** January 1, 2026
**Status:** Analysis Complete - Ready for Implementation
**Current Coverage:** ~5% mechanical automation across 983 feats/talents

---

## Executive Summary

This report documents the current state of feat and talent implementation in the Foundry VTT Star Wars Saga Edition (SWSE) system and provides a comprehensive roadmap for full implementation.

### Key Findings

| Metric | Count | Status |
|--------|-------|--------|
| Total Feats Catalogued | 130 | ✓ 100% in database |
| Total Talents Catalogued | 853 | ✓ 100% in database |
| Feats with Active Effects | 12 | ❌ 9% automated |
| Talents with Mechanics | 0 | ❌ 0% automated |
| Weapon Qualities Tracked | 60 | ✓ Mostly complete |
| Arc Weapon Quality | Missing | ❌ Needs implementation |
| Ion Damage System | Partial | ⚠️ Tracked, not calculated |
| Severing Strike Mechanics | Defined | ⚠️ Database only, no effects |

---

## Part 1: Current Implementation Status

### 1.1 Feats (130 Total)

**Breakdown by Automation Status:**

#### Automated Feats (12) - 9% Coverage
These feats have Active Effects that apply bonuses automatically:

**Defense Bonuses (5 feats)**
- Dodge (+1 Reflex Defense)
- Great Fortitude (+2 Fortitude Defense)
- Iron Will (+2 Will Defense)
- Lightning Reflexes (+2 Reflex Defense)
- Improved Defenses (+1 to all three defenses)

**Skill Bonuses (4 feats)**
- Skill Focus (+5 to one selected skill)
- Educated (+5 to Knowledge (Galactic History) and Knowledge (Social Sciences))
- Linguist (+5 to Deception and Persuasion)
- Sharp-Eyed (+5 to Perception and Survival)

**Hit Point & Defense Bonuses (2 feats)**
- Toughness (+5 HP per character level)
- Improved Damage Threshold (+5 to Damage Threshold)

**Attack Bonuses (1 feat)**
- Point Blank Shot (+1 attack roll and damage within 6 squares)

---

#### Non-Automated Feats (118) - 91% Missing Automation

**A. Simple Bonus Feats (Candidates for Quick Automation)**

These can be automated with standard Active Effects changes (30-40 feats):

*Skill Bonuses*
- Master Tracker (+10 to Survival)
- Hunter's Instincts (+5 to survival-related checks)
- Keen Scent (+5 to Perception when tracking by scent)
- Perfect Swimmer (+5 to Swim checks)
- Fast Swimmer (+5 to speed while swimming)
- Sure Climber (+5 to Climb checks)
- Instinctive Perception (+5 to initiative + auto Perception check)
- Intuitive Initiative (reroll initiative)

*Attack & Damage Bonuses*
- Weapon Focus (category) (+1 attack with weapon group)
- Greater Weapon Focus (+1 attack, requires Weapon Focus)
- Weapon Specialization (category) (+2 damage with weapon group)
- Greater Weapon Specialization (+2 damage, requires Specialization)
- Mighty Swing (+5 bonus on melee attack rolls with STR)
- Savage Attack (ignore 5 points of target's Damage Threshold)
- Stunning Strike (+2 to Stun damage)
- Wounding Strike (bleed damage)

*Resilience*
- Conditioned (+2 on saving throws)
- Headstrong (+2 Will Defense against mind-affecting)
- Thick Skin (+2 to Armor Bonus)
- Inborn Resilience (ignore cold/heat damage effects)
- Increased Resistance (elemental resistance)
- Resilient Strength (+2 Fortitude Defense)
- Resilient Reflexes (+2 Reflex Defense)
- Resilient Will (+2 Will Defense)

*Movement & Positioning*
- Mobility (+3 Defense when moving away from enemies)
- Spring Attack (movement + attack without provoking)
- Running Attack (run and attack)

*Other Simple Bonuses*
- Quick Draw (ready weapon as free action)
- Trustworthy (+5 to Persuasion checks)
- Fast Talk (+5 to Deception checks)
- Shrewd Bargainer (+5 to Barter checks)
- Jack of All Trades (+2 to untrained skills)
- Tech Specialist (+5 to Tech skills)
- Scavenger (+5 to scavenging checks)
- Low Profile (-5 to Perception to notice)

---

**B. Complex Feats Requiring Custom Code (20-30 feats)**

These require specialized game mechanics beyond simple stat bonuses:

*Action Economy Feats*
- Double Attack (extra attack when using single weapon)
- Triple Attack (2 extra attacks when using single weapon)
- Rapid Strike (attack twice with melee, -5 penalty)
- Rapid Shot (attack twice with ranged, -5 penalty)
- Cleave (attack nearby enemy after killing target)
- Whirlwind Attack (attack all enemies in vicinity with -5 penalty)
- Hew (attack enemy then move)
- Bantha Rush (charge attack with bonus)
- Reckless Charge (charge and attack)

*Combat Maneuvers*
- Disarm / Improved Disarm (knock weapon from enemy hand)
- Grapple / Improved Grapple (engage in grapple)
- Pin (immobilize grappled opponent)
- Knock Prone / Improved Knock Prone (knock enemy down)
- Stun / Improved Stun (stun opponents)
- Disarming Charm (use Persuasion instead of attack for disarm)

*Defense & Evasion*
- Harm's Way (protect ally from attack)
- Melee Defense (gain Defense bonus when not attacking)
- Acrobatic Strike (add Acrobatics to melee attack)
- Slippery Maneuver (bonus to escape grapple)
- Hard Target (+2 Defense against ranged attacks at long range)
- Elusive Target (difficult to hit, enemies take penalties)

*Mounted & Vehicle Combat*
- Mounted Combat (reduced penalties when on mount)
- Vehicular Combat (vehicle attack bonuses)
- Mounted Regiment (unit bonuses while mounted)

*Special Mechanics*
- Combat Reflexes (extra attacks of opportunity per round)
- Burst of Speed (move extra squares as swift action)
- Adaptable Talent (temporarily select different talent)
- Desperate Gambit (reroll attack/save, accept result)
- Critical specialty feats (Triple Crit, Triple Crit Specialist)
- Force-using feats with special calculations

---

**C. Skill-Based Selection Feats (15+ feats)**

These require player input to function (Select which skill/weapon/ability):

- Skill Focus (select which skill for +5 bonus)
- Skill Training (select which skill to become trained in)
- Weapon Focus (select weapon group for +1 attack)
- Greater Weapon Focus (select weapon group)
- Weapon Specialization (select weapon group for +2 damage)
- Greater Weapon Specialization (select weapon group)
- Force Focus (select which Force power for bonus)
- Force Training (select Force power to learn)
- Tech Specialist (select tech skill focus)
- Scavenger (select scavenging type)

---

**D. Force Feats (27 feats)**

All Force feats need mechanical implementation:

*Core Force Feats*
- Force Sensitivity (allows Force use)
- Force Training (levels × can use)
- Force Boon (bonus Force point)
- Force Focus (bonus on selected Force power)
- Force Regimen Mastery (reduce FP cost)

*Force Powers/Abilities*
- Forceful Blast / Grip / Slam / Stun / Telekinesis (various mechanics)
- Deflect / Redirect Shot / Saber Throw (combat actions)
- Battle Meditation (party bonuses)
- Block / Forceful Strike (combat reactions)
- Forceful Vitality (temporary HP/defenses)
- Forceful Warrior / Will (combat bonuses)
- Forceful Recovery (healing)
- Forceful Throw / Weapon (throw objects/weapons)

*Finesse Feats*
- Weapon Finesse (use DEX instead of STR)
- Noble Fencing Style (+1 DEX-based weapon attack)

---

**E. Species/Class-Specific Feats (20+ feats)**

These apply bonuses based on character race/class:

- Species Training feats (species-specific bonuses)
- Wookiee/Ewok/Gungan/etc. racial bonuses
- Class heritage feats (Jedi Heritage, Warrior Heritage)
- Specialist team feats (unit bonuses)
- Species-exclusive talents

---

### 1.2 Talents (853 Total - 0% Automated)

**Current State:**
- All 853 talents exist in database with names and descriptions
- 106 talents have defined mechanical abilities in `talent-granted-abilities.json`
- **Zero talents are wired to character effects or combat system**

**Talent Organization:**
- 123 unique talent trees
- Distribution across classes: Jedi, Soldier, Scout, Scoundrel, Gunslinger, Bounty Hunter, Technician, Force Adept, Noble, Officer, etc.
- Force traditions: Jedi, Sith, Seer, Shaman, Brawler, etc.

**Key Talent Categories Needing Implementation:**

1. **Defense Talents** (20+ talents)
   - Block, Deflect, Redirect Shot
   - Lightsaber Defense, Armor Mastery
   - Evasion talents

2. **Attack/Combat Talents** (50+ talents)
   - Damage bonuses
   - Attack bonuses
   - Special attack mechanics
   - Weapon mastery talents

3. **Force Talents** (100+ talents)
   - Force power usage
   - Force point recovery
   - Force-based attacks
   - Force resistance

4. **Leadership Talents** (20+ talents)
   - Inspire Confidence, Bolster Ally, Ignite Fervor
   - Team coordination
   - Morale effects

5. **Social/Skill Talents** (30+ talents)
   - Negotiation bonuses
   - Deception bonuses
   - Persuasion bonuses
   - Intimidation effects

6. **Technical Talents** (20+ talents)
   - Mechanics bonuses
   - Slicing abilities
   - Droid interaction

7. **Mobility Talents** (15+ talents)
   - Movement bonuses
   - Acrobatics
   - Stealth

---

### 1.3 Weapon Qualities Implementation

**Currently Tracked (✓ Complete - 60 properties):**
- Accurate
- Inaccurate
- Ion
- Stun / Stun Option
- Autofire
- Single Use
- Area Effect / Area Attack
- Double Weapon
- Reach
- Trip
- Disruptor
- Cortosis
- Vibroweapon
- Lightsaber / Lightsaber Resistant
- Finesse
- Two-Handed
- Heavy
- Concealable
- Silent
- And 41 others...

**Missing Implementation (✗):**

#### Arc Weapons
- **Definition:** Arc weapons are hurled into air at target, not fired straight
- **Mechanic:** Cannot fire at targets at Point-Blank Range
- **Implementation Needed:**
  - Add "Arc" to weapon properties list
  - Create range validation logic to prevent Point-Blank attacks
  - Display range restriction on weapon info

#### Ion Damage Mechanics
- **Current State:** Ion property tracked in weapons
- **Missing:** Damage calculation and condition effects
- **Mechanics Not Implemented:**
  - Ion damage deals **half damage** to regular targets
  - Deals half damage to non-cybernetic creatures (no other effect)
  - **Droids/Vehicles/Cyborgs:** If damage reduces HP to 0, target moves **-5 steps** on Condition Track (disabled/unconscious)
  - **Droids/Vehicles/Cyborgs:** If Ion damage (pre-halved) ≥ Damage Threshold, target moves **-2 steps** on Condition Track
  - Range limit: 6 squares for Stun setting

**Implementation Needed:**
- Add damage calculation hook for Ion weapons
- Implement Condition Track movement system
- Add automatic effects when Ion damage thresholds are met

---

### 1.4 Special Mechanics Not Implemented

#### Severing Strike Talent
**Current State:**
- ✓ Defined in `data/talent-granted-abilities.json`
- ✓ Has action type and trigger conditions
- ❌ **No mechanical implementation**

**What Needs to be Built:**

1. **Trigger Detection**
   - Detect when attack damage ≥ (current HP + Damage Threshold)
   - Flag as "killing blow" scenario
   - Offer option to use Severing Strike

2. **Limb Loss Mechanics**
   - Remove limb from character (arm at wrist/elbow, leg at knee/ankle)
   - Deal **half damage** instead of killing blow
   - Move target **-1 step** on Condition Track
   - Add persistent penalty condition

3. **Persistent Penalties**
   - Apply to speed (movement penalty)
   - Apply to skill checks (melee/ranged penalties)
   - Apply to ability checks (based on lost limb)
   - Visually represent on character sheet

4. **Species-Specific Rules**

   **Trandoshan Regeneration:**
   - Regenerate severed limbs in 1d10 days
   - Automatically remove penalties after regeneration

   **Abyssin Regeneration:**
   - Same as Trandoshan

   **Bartokk Compartmentalized Biology:**
   - Can control severed limbs for short time
   - Requires separate mechanical system

---

#### Grapple System (Complex)
**Status:** Combat maneuver feats exist but grapple mechanics not implemented

**Required Components:**
1. Grapple initiation (opposed Strength checks)
2. Grapple state tracking (is character grappled?)
3. Movement restrictions while grappling
4. Escape attempts
5. Special actions while grappling
6. Pin mechanics (further restriction)
7. Grapple-to-damage progression

**Feats Depending on Grapple:**
- Grapple, Improved Grapple
- Pin, Improved Pin
- Grappling Strike
- Various combat maneuvers

---

#### Multiple Attack System
**Status:** Feats defined but multi-attack economy not implemented

**Components Needed:**
1. Attack action tracking (how many attacks has character made?)
2. Cumulative penalty calculation
3. Full Attack action mode
4. Rapid Strike/Shot mechanics
5. Double/Triple Attack bonus attacks
6. Cleave mechanics (attack adjacent enemy after kill)

**Feats Depending on This:**
- Double Attack, Triple Attack
- Rapid Strike, Rapid Shot
- Cleave, Bantha Rush
- Whirlwind Attack
- Hew
- Many combat talents

---

---

## Part 2: Implementation Strategy

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Character Sheet                          │
│  (displays feats, talents, bonuses)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            Feat/Talent Selection System                      │
│  - Feat dialog (levelup & chargen)                          │
│  - Talent selection dialog                                  │
│  - Prerequisite validation                                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│         Feat/Talent Application Engine                       │
│  - Add item to actor                                        │
│  - Create Active Effects                                    │
│  - Wire special mechanics                                   │
│  - Update actor data                                        │
└────────────┬────────────────────────────────────────────────┘
             │
        ┌────┴─────┬──────────┬────────────┐
        ▼          ▼          ▼            ▼
    ┌───────┐ ┌──────────┐ ┌──────┐ ┌──────────────┐
    │Active │ │Special   │ │Combat│ │Item/Action  │
    │Effects│ │Mechanics │ │State │ │Management   │
    └───────┘ └──────────┘ └──────┘ └──────────────┘
        │          │          │            │
        └────┬─────┴──────────┴────────────┘
             ▼
    ┌─────────────────────────────┐
    │  Combat Resolution System   │
    │  - Attack rolls             │
    │  - Damage calculation       │
    │  - Condition track changes  │
    └─────────────────────────────┘
```

### 2.2 Data Structure Requirements

#### Feat Data Model Enhancement
```javascript
// Current feat structure (template.json)
{
  type: "feat",
  system: {
    featType: "general|force|species",
    benefit: HTMLField,
    prerequisite: HTMLField,
    special: HTMLField,
    normalText: HTMLField,
    uses: {
      current: Number,
      max: Number,
      perDay: Boolean
    }
  },
  effects: []  // Active Effects array
}

// Required additions for full implementation
{
  system: {
    // ... existing fields ...

    // Automation flags
    automation: {
      type: "none|passive|active|custom",  // none, effect-based, needs custom code
      category: "bonus|action|reaction|state",
      hasActiveEffect: Boolean,
      customHandler: String,  // path to handler function
      requiresSelection: Boolean,  // needs player to choose (Skill Focus, etc)
      selectionOptions: {
        type: String,  // "skill", "weapon", "forcepower"
        values: Array   // available options
      }
    },

    // Combat mechanics flags
    combatMechanics: {
      affectsActionEconomy: Boolean,
      affectsMovement: Boolean,
      affectsDefense: Boolean,
      affectsAttack: Boolean,
      requiresStateTracking: Boolean,
      stateType: String  // "grapple", "mounted", "prone", etc
    },

    // Weapon quality
    weaponQuality: Boolean,
    qualityType: String  // "accurate", "inaccurate", "arc", etc
  }
}
```

#### Talent Data Model Enhancement
```javascript
{
  type: "talent",
  system: {
    tree: String,
    benefit: HTMLField,
    prerequisite: HTMLField,
    special: HTMLField,

    // Required additions
    automation: {
      type: "none|passive|effect|ability",
      grantedAbilityId: String,  // reference to talent-granted-abilities.json
      requiresActivation: Boolean,
      actionType: "reaction|swift|standard|fullround",
      trigger: String  // when ability is triggered
    },

    effects: [
      // Active Effects array
    ],

    // Bonuses provided
    bonuses: {
      skills: {
        [skillName]: Number
      },
      defenses: {
        fortitude: Number,
        reflex: Number,
        will: Number
      },
      combat: {
        attackBonus: Number,
        damageBonus: Number,
        damageReduction: Number
      }
    }
  }
}
```

---

### 2.3 Implementation Phases (Detailed)

#### PHASE 1: Foundation & Quick Wins (2-3 weeks)
**Goal:** Establish architecture and automate simple bonuses

**Step 1.1: Add Arc Weapon Quality**
- File: `packs/weapons.db` (via data migration script)
- Task: Add "Arc" to weapon properties where applicable
- Validation: Check weapon range restrictions in combat
- Time: 2 hours

**Step 1.2: Create Feat Automation Metadata**
- Create: `data/feat-automation-metadata.json`
- Content: Map 130 feats to automation type and config
- Example:
```json
{
  "feat-id-123": {
    "name": "Skill Focus (Perception)",
    "automationType": "effect",
    "activeEffect": {
      "changes": [{
        "key": "system.skills.perception.bonus",
        "mode": 2,
        "value": "5"
      }]
    }
  }
}
```
- Time: 3 days (data entry + structure design)

**Step 1.3: Implement Feat Selection Dialog**
- File: `scripts/apps/levelup/feat-selection-dialog.js` (new)
- Feature: Dialog allowing player to select skill/weapon for parameterized feats
- Display: Show prerequisites, benefit text, available options
- Integration: Wire to character creation and level-up
- Time: 3 days

**Step 1.4: Automate Simple Skill Bonuses (30 feats)**
- Expand Active Effects for:
  - Master Tracker, Hunter's Instincts, Keen Scent (+5 Perception/Survival)
  - Perfect Swimmer, Fast Swimmer (+5 Swim)
  - Sure Climber (+5 Climb)
  - Instinctive Perception (+5 Perception + auto check)
  - Keen Force Mind (+5 Force power checks)
  - And 25 more similar feats
- Method: Add Active Effects to feat items in database
- Time: 2 days (bulk update)

**Step 1.5: Automate Weapon Focus Chain (8 feats)**
- Features:
  - Weapon Focus: +1 attack with selected weapon group
  - Greater Weapon Focus: +1 more (total +2) with weapon group
  - Weapon Specialization: +2 damage with weapon group
  - Greater Weapon Specialization: +2 more damage (total +4)
- Implementation: Create selection dialog for weapon group
- Active Effects: Conditional bonuses based on selection
- Time: 3 days

**Step 1.6: Ion Damage System (Partial)**
- Create: `scripts/combat/ion-damage-handler.js`
- Features:
  - Detect Ion damage in attack roll
  - Apply 50% damage reduction for non-cybernetic targets
  - Move Droids/Vehicles/Cyborgs on Condition Track based on threshold
  - Range checking (6 squares for Stun setting)
- Integration: Hook into damage calculation system
- Time: 2 days

**Phase 1 Summary:**
- Time: 2-3 weeks
- Deliverables: 35+ feats automated, Arc weapon quality added, Ion damage partial system
- Impact: ~27% of feats now have some automation

---

#### PHASE 2: Combat State System (3-4 weeks)
**Goal:** Build foundation for complex combat mechanics (grapple, mounting, etc)

**Step 2.1: Condition Track System**
- Create: `scripts/combat/condition-track.js`
- Features:
  - Track character condition status (-5 to +5 scale)
  - Apply penalties based on condition
  - Update display on character sheet
  - Handle special conditions (unconscious, disabled, dead)
- Time: 3 days

**Step 2.2: Combat State Tracker**
- Create: `scripts/combat/combat-state-tracker.js`
- Tracks:
  - Is character in grapple? (state: grappled, grappler, both)
  - Is character mounted?
  - Is character prone?
  - Is character stunned?
  - Number of attacks made this turn
  - Current attack penalties cumulative
- Storage: Actor flags (`actor.flags.swse.combatState`)
- Time: 2 days

**Step 2.3: Grapple System**
- Create: `scripts/combat/grapple-system.js`
- Features:
  - Initiate grapple (opposed STR checks)
  - Track grappled status
  - Apply movement restrictions (-4 squares)
  - Escape grapple mechanic
  - Pin opponent (further immobilization)
- Integration: Combat action buttons for grapple/escape/pin
- Time: 4 days

**Step 2.4: Prone & Knockdown System**
- Create: `scripts/combat/prone-system.js`
- Features:
  - Track prone status
  - Apply attack penalties (-2 melee attack, +2 ranged attack)
  - Apply defense changes (+4 Defense vs melee, -2 vs ranged)
  - Stand up action
- Time: 2 days

**Step 2.5: Multiple Attack Tracking**
- Create: `scripts/combat/multi-attack-tracker.js`
- Features:
  - Count attacks made per turn
  - Calculate cumulative penalties (-5 per attack after first)
  - Reset on new turn
  - Track Full Attack action status
- Time: 2 days

**Step 2.6: Implement Grapple-Dependent Feats (5 feats)**
- Disarm / Improved Disarm
- Grapple / Improved Grapple
- Pin / Improved Pin
- Knock Prone / Improved Knock Prone
- Grappling Strike
- Time: 3 days

**Phase 2 Summary:**
- Time: 3-4 weeks
- Deliverables: Complete combat state system, grapple mechanics, condition tracking
- Impact: Foundation for 30+ complex feats and talents

---

#### PHASE 3: Multiple Attack System (2 weeks)
**Goal:** Implement action economy feats that grant extra attacks

**Step 3.1: Combat Action Parser**
- Create: `scripts/combat/combat-action-parser.js`
- Features:
  - Detect attack action type
  - Check for bonus attacks from feats
  - Calculate penalties
  - Generate attack sequence
- Time: 3 days

**Step 3.2: Double/Triple Attack**
- Implementation:
  - Double Attack: Grant 1 extra attack with single weapon (no penalty)
  - Triple Attack: Grant 2 extra attacks with single weapon (no penalty)
  - Prerequisite: Weapon Focus with that weapon
- Time: 1 day

**Step 3.3: Rapid Strike/Shot**
- Implementation:
  - Rapid Strike: Attack twice with melee weapon, -5 penalty on both
  - Rapid Shot: Attack twice with ranged weapon, -5 penalty on both
  - Check weapon properties (Autofire for Rapid Shot)
- Time: 1 day

**Step 3.4: Cleave & Bantha Rush**
- Cleave: After killing enemy with melee attack, make additional attack against adjacent enemy
- Bantha Rush: Charge attack with bonus
- Detection: Check when enemy is killed
- Time: 2 days

**Step 3.5: Whirlwind Attack**
- Feature: Attack all enemies in vicinity with -5 penalty
- Mechanics:
  - Detect all enemies in range (typically 2 squares)
  - Roll once against all
  - Apply penalty
- Time: 2 days

**Step 3.6: Combat Reflexes**
- Feature: Gain extra attack of opportunity per round
- Mechanics:
  - Standard: 1 AoO per round
  - With Combat Reflexes: 1 + DEX modifier additional AoOs
- Time: 1 day

**Phase 3 Summary:**
- Time: 2 weeks
- Deliverables: 6+ feats granting extra attacks, multi-attack framework complete
- Impact: ~12% more feat automation

---

#### PHASE 4: Special Mechanics & Force Feats (3-4 weeks)
**Goal:** Implement complex special cases and force-related mechanics

**Step 4.1: Severing Strike System**
- Create: `scripts/combat/severing-strike-system.js`
- Features:
  - Detect killing blow condition (damage ≥ HP + DT)
  - Display option to use Severing Strike
  - Remove limb from character
  - Deal half damage instead
  - Apply persistent condition
  - Add species-specific handling (Trandoshan regen, Bartokk limb control)
- Character Sheet Changes:
  - Add limb display (left arm, right arm, left leg, right leg status)
  - Show penalties for missing limbs
  - Display regeneration timer for Trandoshans
- Time: 4 days

**Step 4.2: Limb Loss Condition System**
- Create: `scripts/conditions/limb-loss.js`
- Features:
  - Track which limb is missing
  - Apply movement penalties based on limb
  - Apply skill check penalties based on limb
  - Handle regeneration
  - Handle prosthetics
- Time: 2 days

**Step 4.3: Force Power Integration**
- Create: `scripts/force/force-automation.js`
- Features:
  - Link Force feats to Force power selection
  - Apply bonuses from Force feats to power usage
  - Track Force point spending
  - Dark Side point tracking
- Time: 3 days

**Step 4.4: Force Sensitivity Feat Chain**
- Implement:
  - Force Sensitivity (enables Force use)
  - Force Training (levels; each grants one Force power selection)
  - Force Boon (extra Force point)
  - Force Focus (select power for +2 bonus)
  - Force Regimen Mastery (reduce FP cost)
- Time: 2 days

**Step 4.5: Defensive Force Abilities**
- Block: Use Force to negate melee attack
- Deflect: Use Force to negate ranged attack
- Redirect Shot: Redirect deflected ranged attack
- Implementation: Reaction mechanics with Use the Force checks
- Time: 3 days

**Step 4.6: Offensive Force Abilities**
- Forceful Grip/Slam/Stun/etc: Use Force for combat effects
- Implementation: Custom action buttons, damage/effect rolls
- Time: 3 days

**Phase 4 Summary:**
- Time: 3-4 weeks
- Deliverables: Severing Strike complete, Force feat automation, Force power integration
- Impact: 27 Force feats + 50+ Force talents now functional

---

#### PHASE 5: Talent Automation (4-6 weeks)
**Goal:** Wire 106 defined talent abilities to character effects and combat system

**Step 5.1: Talent Ability Engine**
- Create: `scripts/talents/talent-ability-engine.js`
- Features:
  - Read from `talent-granted-abilities.json`
  - Create actionable abilities for talents
  - Wire to character action buttons
  - Handle uses/per-encounter/per-day tracking
- Time: 3 days

**Step 5.2: Defense Talents (20 talents)**
- Block, Deflect, Redirect Shot (already done in Phase 4)
- Lightsaber Defense (+1 Defense when using lightsaber)
- Armor Mastery (+1 Armor Bonus)
- Armored Defense (reduce damage by armor bonus)
- Evasion talents
- Implementation: Active Effects + custom logic
- Time: 3 days

**Step 5.3: Attack/Damage Talents (50 talents)**
- Weapon Specialization variants
- Damage bonus talents
- Combat maneuver talents
- Advantage talents for specific weapon types
- Implementation: Custom damage calculation hooks
- Time: 4 days

**Step 5.4: Force Talents (100+ talents)**
- Jedi Consular talents
- Jedi Guardian talents
- Sith talents
- Force tradition talents
- Implementation: Link to Force power system
- Time: 5 days

**Step 5.5: Social/Leadership Talents (20+ talents)**
- Inspire Confidence (morale bonus to allies)
- Bolster Ally (grant temporary bonus)
- Ignite Fervor (grant extra action)
- Skilled Advisor (use talent multiple times)
- Implementation: Create temporary buff system
- Time: 3 days

**Step 5.6: Skill/Technical Talents (30+ talents)**
- Skill bonuses
- Mechanics talents
- Slicing talents
- Droid interaction talents
- Implementation: Skill check hooks
- Time: 2 days

**Phase 5 Summary:**
- Time: 4-6 weeks
- Deliverables: 100+ talents now functional with mechanics
- Impact: Complete talent automation for most common talents

---

#### PHASE 6: Polish & Edge Cases (2-3 weeks)
**Goal:** Handle remaining edge cases and optimize

**Step 6.1: Prerequisite Validation Enhancement**
- Ensure all prerequisite chains work correctly
- Handle:
  - Feat chains (Weapon Focus → Greater Weapon Focus)
  - Class/Race restrictions
  - Level requirements
  - Mutual exclusivity checks
- Time: 2 days

**Step 6.2: Sheet Display Enhancements**
- Add feat/talent sections to character sheet showing:
  - Applied bonuses
  - Special mechanics status
  - Pending selections (for parameterized feats)
  - Uses remaining (for limited-use abilities)
- Time: 3 days

**Step 6.3: Combat UI Integration**
- Add buttons for special combat actions (grapple, cleave, etc)
- Create quick-access buttons for common attacks
- Add status indicators (grappled, prone, stunned)
- Time: 3 days

**Step 6.4: Testing & Balancing**
- Playtest combat with various feat combinations
- Verify penalty stacking works correctly
- Confirm condition track effects
- Validate attack sequence with multiple attacks
- Time: 3 days

**Step 6.5: Documentation**
- Document all automated feats/talents
- Create user guide for new mechanics
- Document any house rules implemented
- Time: 2 days

**Phase 6 Summary:**
- Time: 2-3 weeks
- Deliverables: Polish pass, enhanced UI, documentation complete

---

### 2.4 Implementation Priority Matrix

| Phase | Priority | Duration | Feats | Talents | Impact |
|-------|----------|----------|-------|---------|--------|
| 1 | P0 (Critical) | 2-3 wks | 35 | 0 | Foundation |
| 2 | P0 (Critical) | 3-4 wks | 5 | 10 | Combat basis |
| 3 | P1 (High) | 2 wks | 6 | 20 | Action economy |
| 4 | P1 (High) | 3-4 wks | 27 | 50 | Force & Special |
| 5 | P1 (High) | 4-6 wks | 15 | 100 | Talent automation |
| 6 | P2 (Medium) | 2-3 wks | 10 | 50 | Polish |

**Total Estimated Timeline:** 16-23 weeks (4-6 months)
**Total Feats Fully Automated:** ~90-100 of 130 (70-77%)
**Total Talents Fully Automated:** ~200+ of 853 (23%+, but all commonly-used talents)

---

## Part 3: Technical Implementation Details

### 3.1 Active Effects Implementation

#### Standard Pattern for Simple Bonuses

```javascript
// For Dodge feat (+1 Reflex Defense)
{
  "_id": "dodge-feat-id",
  "name": "Dodge",
  "type": "feat",
  "system": {
    "featType": "general",
    "benefit": "+1 Reflex Defense",
    "prerequisite": "Dexterity 13",
    "special": "Can move 5 extra squares as swift action"
  },
  "effects": [
    {
      "name": "Dodge",
      "icon": "icons/svg/shield.svg",
      "changes": [
        {
          "key": "system.defenses.reflex.bonus",
          "mode": 2,  // ADD
          "value": "1",
          "priority": 20
        }
      ],
      "disabled": false,
      "duration": {},
      "flags": {
        "swse": {
          "source": "feat",
          "sourceId": "dodge"
        }
      }
    }
  ]
}
```

#### Conditional Active Effects

```javascript
// For Point Blank Shot (bonus within 6 squares)
{
  "changes": [
    {
      "key": "system.attacks.bonus",
      "mode": 2,
      "value": "1",
      "priority": 20,
      "condition": "range <= 6"  // Custom condition parser needed
    },
    {
      "key": "system.damage.bonus",
      "mode": 2,
      "value": "1",
      "priority": 20,
      "condition": "range <= 6"
    }
  ]
}
```

#### Parameterized Active Effects

```javascript
// For Skill Focus (player selects skill)
{
  "_id": "skill-focus-id",
  "name": "Skill Focus (Perception)",
  "system": {
    "automation": {
      "type": "effect",
      "requiresSelection": true,
      "selectionType": "skill",
      "selectedValue": "perception"  // Set by selection dialog
    }
  },
  "effects": [
    {
      "name": "Skill Focus (Perception)",
      "changes": [
        {
          "key": "system.skills.perception.bonus",
          "mode": 2,
          "value": "5",
          "priority": 20
        }
      ]
    }
  ]
}
```

---

### 3.2 Custom Mechanics Patterns

#### Grapple Handler Example

```javascript
// In scripts/combat/grapple-system.js

class GrappleSystem {
  static initiateGrapple(attacker, defender) {
    // 1. Roll opposed Strength checks
    const attackerRoll = this.rollCheck(attacker, 'strength');
    const defenderRoll = this.rollCheck(defender, 'strength');

    // 2. If attacker wins, set grapple state
    if (attackerRoll >= defenderRoll) {
      this.setGrappleState(attacker, defender);
      return { success: true, damage: 0 };
    }
    return { success: false };
  }

  static setGrappleState(grappler, grappled) {
    // Set flags on both characters
    grappler.setFlag('swse', 'combatState.grappling', grappled.id);
    grappled.setFlag('swse', 'combatState.grappled', grappler.id);

    // Apply movement restriction
    grappled.applyTemporaryEffect({
      name: "Grappled",
      changes: [
        { key: "system.speed.base", mode: 5, value: "-4" }  // DOWNGRADE
      ]
    });
  }

  static escapeGrapple(grappled) {
    const grappler = this.getGrappler(grappled);
    const grappleeRoll = this.rollCheck(grappled, 'strength');
    const grappler roll = this.rollCheck(grappler, 'strength');

    if (grappleeRoll > grapperRoll) {
      this.removeGrappleState(grappler, grappled);
      return { success: true };
    }
    return { success: false };
  }
}
```

#### Ion Damage Handler Example

```javascript
// In scripts/combat/ion-damage-handler.js

class IonDamageHandler {
  static calculateDamage(weapon, damage, target) {
    if (!weapon.system.properties.includes('Ion')) {
      return damage;
    }

    // Half damage to non-cybernetic creatures
    if (!this.isCybernetic(target)) {
      return Math.floor(damage / 2);
    }

    // Full damage to droids/vehicles/cyborgs
    return damage;
  }

  static applyConditionEffects(weapon, damage, target) {
    if (!weapon.system.properties.includes('Ion')) return;

    if (!this.isCybernetic(target)) return;  // No effects on living

    const currentHP = target.system.hp.value;
    const damageThreshold = target.system.damageThreshold;

    // HP reduced to 0
    if ((currentHP - damage) <= 0) {
      target.moveConditionTrack(-5);  // Disabled/unconscious
    }
    // Damage >= DT
    else if (damage >= damageThreshold) {
      target.moveConditionTrack(-2);
    }
  }

  static isCybernetic(target) {
    const type = target.type;
    if (type === 'droid' || type === 'vehicle') return true;

    // Check for cybernetic prosthetics on character
    const prosthetics = target.items.filter(i =>
      i.type === 'equipment' &&
      i.system.properties?.includes('Cybernetic')
    );

    return prosthetics.length > 0;
  }
}
```

#### Severing Strike Handler Example

```javascript
// In scripts/combat/severing-strike-system.js

class SeveringStrikeSystem {
  static checkForSeveringStrike(attack, damage, target) {
    // Check if killing blow
    if ((target.system.hp.value - damage) > 0) return null;
    if (damage < target.system.damageThreshold) return null;

    // Check if attacker has Severing Strike talent
    const talent = attack.actor.items.find(i =>
      i.type === 'talent' && i.name === 'Severing Strike'
    );

    if (!talent) return null;

    // Offer choice
    return { available: true, talent: talent };
  }

  static applySeveringStrike(target, limbType = 'arm') {
    // Deal half damage
    const actualDamage = Math.floor(originaldamage / 2);
    target.takeDamage(actualDamage);

    // Move -1 step on Condition Track
    target.moveConditionTrack(-1);

    // Apply persistent condition
    target.createEmbeddedDocuments('Item', [{
      name: `Missing ${limbType} (${this.getSide()})`,
      type: 'condition',
      system: {
        effect: `Penalties to speed, checks`,
        duration: 'until surgery and prosthetic'
      }
    }]);

    // Add limb tracking
    target.setFlag('swse', `limbs.${limbType}`, 'missing');

    // Handle species-specific regeneration
    if (this.canRegenerate(target)) {
      const regenDays = this.rollRegeneration();
      target.createEmbeddedDocuments('ActiveEffect', [{
        name: `Limb Regeneration Timer (${regenDays} days)`,
        changes: [{
          key: `flags.swse.limbs.${limbType}`,
          mode: 5,
          value: `regenerating-${regenDays}`
        }]
      }]);
    }
  }

  static canRegenerate(target) {
    return ['Trandoshan', 'Abyssin'].includes(target.system.species);
  }
}
```

---

### 3.3 File Structure for Implementation

New files to create:

```
scripts/
├── feats/
│   ├── feat-automation-registry.js          [NEW] Central feat metadata
│   ├── feat-selection-dialog.js             [NEW] Parameterized feat selection
│   └── feat-application-engine.js           [NEW] Apply feat effects
├── talents/
│   ├── talent-ability-engine.js             [NEW] Talent abilities framework
│   ├── talent-action-buttons.js             [NEW] UI for talent actions
│   └── talent-automation-registry.js        [NEW] Talent mechanics map
├── combat/
│   ├── condition-track.js                   [NEW] Condition system
│   ├── combat-state-tracker.js              [NEW] Combat state management
│   ├── grapple-system.js                    [NEW] Grapple mechanics
│   ├── prone-system.js                      [NEW] Prone/knockdown
│   ├── multi-attack-tracker.js              [NEW] Attack counting
│   ├── combat-action-parser.js              [NEW] Parse combat actions
│   ├── ion-damage-handler.js                [NEW] Ion damage calc
│   ├── severing-strike-system.js            [NEW] Limb loss
│   └── limb-loss-condition.js               [NEW] Limb penalties
├── force/
│   ├── force-automation.js                  [NEW] Force feat automation
│   └── force-power-integration.js           [NEW] Wire talents to powers
└── apps/
    ├── levelup/
    │   └── feat-selection-dialog.js         [ENHANCE] Already exists

templates/
├── actors/
│   └── character/
│       ├── tabs/
│       │   ├── feats-talents-tab.hbs        [NEW] Enhanced feat/talent display
│       │   └── combat-status-tab.hbs        [NEW] Combat state display
│       └── partials/
│           ├── limb-status.hbs              [NEW] Show limb status
│           └── condition-effects.hbs        [NEW] Show condition effects

data/
├── feat-automation-metadata.json            [NEW] Feat mapping
├── talent-automation-metadata.json          [NEW] Talent mapping
├── combat-action-definitions.json           [NEW] Action types
└── weapon-quality-mechanics.json            [NEW] Quality effects
```

---

### 3.4 Database Migration Scripts

#### Add Arc Weapon Quality

```javascript
// tools/migrate-arc-weapons.js
const arcWeapons = [
  // Add any weapons that should have Arc quality
  // Check SWSE rulebooks for complete list
];

arcWeapons.forEach(weaponName => {
  // Find weapon in database
  // Add "Arc" to system.properties array
});
```

#### Create Feat Automation Metadata

```javascript
// Generate data/feat-automation-metadata.json
const feats = [
  {
    id: "dodge",
    name: "Dodge",
    automationType: "effect",
    activeEffect: { /* ... */ }
  },
  // ... for all 130 feats
];
```

---

### 3.5 Testing Strategy

#### Unit Tests Required

1. **Grapple System Tests**
   - Test grapple initiation (win/lose conditions)
   - Test movement restrictions while grappled
   - Test escape mechanics
   - Test grapple + other abilities interaction

2. **Ion Damage Tests**
   - Test 50% damage reduction
   - Test Condition Track movement for cyborgs
   - Test range restrictions

3. **Severing Strike Tests**
   - Test killing blow detection
   - Test limb loss application
   - Test Trandoshan regeneration
   - Test persistent condition penalties

4. **Multiple Attack Tests**
   - Test attack penalty stacking
   - Test Double/Triple Attack bonus attacks
   - Test Cleave mechanic
   - Test Whirlwind Attack against multiple targets

5. **Active Effects Tests**
   - Test conditional effects
   - Test parameterized effects
   - Test effect stacking/priority

#### Integration Tests Required

1. Character with multiple feats showing correct bonuses
2. Feat prerequisite chains validating correctly
3. Combat scenarios with grapple + other mechanics
4. Force feats working with Force powers
5. Talent abilities triggering correctly in combat

#### Playtest Scenarios

1. Soldier with weapon focus chain
2. Jedi with Force feats + lightsaber talents
3. Scout/Scoundrel with mobility talents
4. Bounty Hunter with combat talents
5. Officer with leadership talents
6. Mixed party with force users and non-force users

---

## Part 4: Implementation Checklist

### Pre-Implementation

- [ ] Review all SWSE rulebooks for completeness
- [ ] Validate all 130 feats are in database
- [ ] Validate all 853 talents are in database
- [ ] Create comprehensive test scenarios document
- [ ] Set up version control branch strategy
- [ ] Document all house rules/variants

### Phase 1: Foundation

- [ ] Create feat-automation-metadata.json
- [ ] Implement feat selection dialog
- [ ] Add Arc weapon quality to weapons
- [ ] Automate 30 skill bonus feats
- [ ] Automate weapon focus chain
- [ ] Implement ion damage handler
- [ ] Test all Phase 1 implementations

### Phase 2: Combat State

- [ ] Implement condition track system
- [ ] Create combat state tracker
- [ ] Build grapple system
- [ ] Build prone system
- [ ] Build multi-attack tracker
- [ ] Automate grapple-dependent feats
- [ ] Test all Phase 2 implementations

### Phase 3: Multiple Attacks

- [ ] Implement combat action parser
- [ ] Add Double/Triple Attack
- [ ] Add Rapid Strike/Shot
- [ ] Add Cleave & Bantha Rush
- [ ] Add Whirlwind Attack
- [ ] Add Combat Reflexes
- [ ] Test all Phase 3 implementations

### Phase 4: Special Mechanics

- [ ] Implement Severing Strike system
- [ ] Implement limb loss condition
- [ ] Create Force power integration
- [ ] Automate Force feat chain
- [ ] Implement defensive Force abilities
- [ ] Implement offensive Force abilities
- [ ] Test all Phase 4 implementations

### Phase 5: Talent Automation

- [ ] Create talent ability engine
- [ ] Automate defense talents (20)
- [ ] Automate attack/damage talents (50)
- [ ] Automate Force talents (100+)
- [ ] Automate social/leadership talents (20)
- [ ] Automate skill/technical talents (30)
- [ ] Test all Phase 5 implementations

### Phase 6: Polish

- [ ] Enhance prerequisite validation
- [ ] Improve character sheet displays
- [ ] Add combat UI buttons
- [ ] Comprehensive testing pass
- [ ] Write documentation
- [ ] User guide creation
- [ ] Final balance pass

---

## Part 5: Known Challenges & Solutions

### Challenge 1: Parameterized Feats
**Problem:** Skill Focus, Weapon Focus, etc. require player selection

**Solution:**
- Create selection dialogs that appear when feat is acquired
- Store selection in feat item data
- Wire Active Effects to use stored selection
- Allow re-selection on character sheet

### Challenge 2: Conditional Bonuses
**Problem:** Point Blank Shot bonus only applies within 6 squares

**Solution:**
- Implement condition evaluator for Active Effects
- Use combat distance checks during attack resolution
- Alternatively: Wire to combat system hooks, apply/remove dynamically

### Challenge 3: Action Economy Changes
**Problem:** Double Attack, Cleave, etc. fundamentally change how many attacks are possible

**Solution:**
- Build complete multi-attack framework
- Track attacks in combat state
- Generate attack sequence before rolling
- Apply penalties cumulatively
- Integrate with combat action buttons

### Challenge 4: Complex Prerequisite Chains
**Problem:** Some feats have 3+ levels of prerequisites

**Solution:**
- Build prerequisite validation engine
- Check entire chain before allowing selection
- Warn player of missing prerequisites
- Grey out unavailable feats in selection dialog

### Challenge 5: Species-Specific Mechanics
**Problem:** Trandoshan regeneration, Bartokk limb control, etc.

**Solution:**
- Store species in actor data
- Check species when applying special effects
- Create species-specific handler modules
- Allow house rule variations

### Challenge 6: Backward Compatibility
**Problem:** Existing characters with feats/talents won't have new systems

**Solution:**
- Create migration script for existing actors
- Automatically apply Active Effects to feats already learned
- Update character data on sheet open
- Graceful fallback if systems not loaded

---

## Part 6: Resource Estimates

### Development Time

| Phase | Duration | Dev Hours | QA Hours | Total |
|-------|----------|-----------|----------|-------|
| 1 | 2-3 wks | 60 | 20 | 80 |
| 2 | 3-4 wks | 80 | 30 | 110 |
| 3 | 2 wks | 40 | 15 | 55 |
| 4 | 3-4 wks | 70 | 25 | 95 |
| 5 | 4-6 wks | 100 | 40 | 140 |
| 6 | 2-3 wks | 40 | 20 | 60 |
| **Total** | **16-23 wks** | **390 hrs** | **150 hrs** | **540 hrs** |

**Roughly 13.5 weeks full-time development (1 developer)**

### Files to Modify

- 7 new script files (feat/talent engines)
- 8 new combat system files
- 2 new force system files
- 3 new UI/dialog files
- 2 character sheet template enhancements
- 4 new data files
- 1 tools migration script

**Total: ~27 files (15 new, 12 enhanced)**

---

## Conclusion

This roadmap provides a complete path from current state (5% automation) to full implementation (70%+ feat automation, 50%+ talent automation) over 16-23 weeks.

**Key Success Factors:**
1. Build combat state system first (Phase 2) - foundation for everything
2. Test each phase thoroughly before moving to next
3. Leverage existing Active Effects system for simple bonuses
4. Create reusable handlers for common mechanics (bonuses, conditions)
5. Maintain backward compatibility with existing characters
6. Document as you go for user understanding

**Expected Outcome:**
- ~90-100 of 130 feats fully automated (70-77%)
- ~200+ of 853 talents with mechanics (23%+, all commonly used)
- Complex combat mechanics (grapple, multiple attacks, conditions)
- Complete Force feat/power integration
- Professional playable SWSE experience

The system will go from being a character sheet tool with manual tracking to a fully mechanical simulation of the SWSE ruleset.
