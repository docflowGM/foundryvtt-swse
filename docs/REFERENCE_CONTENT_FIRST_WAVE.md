# Datapad Reference Content: First Wave

**Phase 11 - Core Concept References**

This document provides the authoritative content for all first-wave reference entries (11 core concepts). These entries are designed to be created as JournalEntry documents in Foundry and linked via the Datapad Reference system.

---

## Creating Reference Entries in Foundry

### Setup Steps

1. **Create Journal Folder** (in Foundry sidebar)
   - Right-click Journal Entries
   - New Journal Folder → Name: "Datapad References"

2. **Create Each Entry** (use exact IDs below)
   - New Journal Entry
   - In entry details panel, set ID to exact `referenceId` (e.g., `swse-ref-hit-points`)
   - Paste content from this document into the entry
   - Mark as public/searchable if desired

3. **Add to Pack** (after all entries created)
   - Compendium menu → Create Pack
   - Pack name: `datapads-references`
   - Type: JournalEntry
   - Import all reference entries

### Content Format

Each reference includes:
- **Overview:** 1-2 sentence summary
- **Core Mechanic:** How it works in game terms
- **Calculation & Components:** Detailed breakdown
- **Examples:** Practical application
- **Related Concepts:** Cross-references (if applicable)

---

## Reference Entries

### 1. Hit Points (HitPoints)

**Reference ID:** `swse-ref-hit-points`
**Glossary Key:** HitPoints

```
# Hit Points Explained

## Overview
Hit Points (HP) represent how much damage your character can sustain before being defeated. Your maximum HP is calculated at character creation and increases as you gain levels.

## Core Mechanic
Hit Points are a pool of "health" that depletes when you take damage. When your HP reaches 0, you fall unconscious and begin dying. They represent both physical resilience and the character's ability to shake off injury and exhaustion.

## Calculation & Components

Your maximum Hit Points are calculated as:

**10 + (Constitution Modifier × Level) + (Class Hit Points per Level) + Misc Modifiers**

- **10:** Base HP every character has
- **Constitution Modifier × Level:** Increases with Con modifier and level
- **Class Hit Points per Level:** Each class grants bonus HP per level:
  - Soldier: 6 per level
  - Gunslinger: 5 per level
  - Scoundrel: 5 per level
  - Force Adept: 4 per level
  - Tech Specialist: 4 per level
  - Jedi: 5 per level (varies by variant)
- **Misc Modifiers:** Feats, talents, or equipment that modify max HP

Example: A 5th-level Soldier with +2 Constitution modifier and no misc modifiers:
- 10 + (2 × 5) + (6 × 5) + 0 = 10 + 10 + 30 = **50 HP**

## Examples

**Scenario 1: Taking Damage**
A bounty hunter with 45 HP takes a 12-point blaster hit. They now have 33 HP remaining. They're still standing and can act normally.

**Scenario 2: Reaching 0 HP**
The same bounty hunter takes another 33-point hit. With only 33 HP left, they're now at 0 HP and fall unconscious.

**Scenario 3: Leveling Up**
Upon reaching 6th level, the bounty hunter gains additional HP:
- They roll for class hit points (Soldier rolls 1d6, gets a 4)
- Constitution modifier adds +2 more
- New max HP: 45 + 4 + 2 = 51 HP

## Related Concepts

- **Damage Threshold:** Reduces damage you take each round
- **Condition Track:** Tracks your injury status; at 0 HP, you begin dying
- **Dying:** What happens when your HP reaches 0
```

---

### 2. Damage Threshold (DamageThreshold)

**Reference ID:** `swse-ref-damage-threshold`
**Glossary Key:** DamageThreshold

```
# Damage Threshold Explained

## Overview
Damage Threshold (DT) is a defensive value that reduces the damage you take from each attack. It represents your character's armor, toughness, or defensive positioning. Higher Damage Threshold means you take less damage overall.

## Core Mechanic
Whenever you take damage, subtract your Damage Threshold from the damage amount first. This happens before the damage is applied to your HP. DT does not reduce damage to 0; it simply reduces the amount taken.

Example: You have 12 DT and take a 20-point hit.
- Damage taken: 20 - 12 = 8 damage to HP

## Calculation & Components

**Damage Threshold = Armor DT + Shield DT + Misc Modifiers**

- **Armor DT:** Based on your equipped armor (light, medium, heavy)
  - Light Armor: 2 DT
  - Medium Armor: 4 DT
  - Heavy Armor: 6 DT
  - No Armor: 0 DT
- **Shield DT:** If you're using a shield
  - Light Shield: 1 DT
  - Heavy Shield: 2 DT
- **Misc Modifiers:** Talents, feats, or effects that adjust DT

Example: A soldier in heavy armor (+6 DT) with a heavy shield (+2 DT) and a talent that grants +1 DT:
- 6 + 2 + 1 = **9 DT**

## Examples

**Scenario 1: Armor Reduction**
A soldier with 9 DT takes a 15-point blaster hit.
- Damage reduced: 15 - 9 = 6 damage
- The soldier's HP is reduced by 6, not 15

**Scenario 2: Heavy Armor Benefit**
The same soldier without armor (0 DT) would take the full 15 damage. By wearing armor, they reduce each hit by 9 points over the course of a battle.

**Scenario 3: Unarmored Vulnerability**
A Force Adept in no armor (0 DT) takes a 12-point hit.
- No reduction: 12 - 0 = 12 damage
- They take the full damage, making armor crucial if attacked

## Related Concepts

- **Hit Points:** Your total health pool; DT reduces incoming damage
- **Armor:** Provides the base Damage Threshold value
- **Shields:** Additional Damage Threshold from defensive equipment
```

---

### 3. Force Points (ForcePoints)

**Reference ID:** `swse-ref-force-points`
**Glossary Key:** ForcePoints

```
# Force Points Explained

## Overview
Force Points are a resource available to all characters, allowing them to modify dice rolls, enhance Force power use, or power special abilities. They represent your character's moment-to-moment luck, connection to destiny, or sheer determination.

## Core Mechanic
You can spend Force Points during a round to:
- **Modify a roll:** Add 1d6 to a d20 roll after seeing the result
- **Use Force abilities:** Some Force powers consume Force Points
- **Activate talents:** Some talents require Force Point expenditure
- **Power special maneuvers:** Class features may consume Force Points

Force Points refresh at the start of each encounter or as specified by talents.

## Calculation & Components

**Maximum Force Points Per Encounter:**

- **Base:** Determined by class and level
  - Most classes: 1 + (½ level, rounded down)
  - Jedi: 1 + (½ level, rounded down) + Force powers
  - Some talents grant bonus Force Points
- **Talents:** Special talents grant additional uses
- **Charisma Modifier:** Some abilities add Cha mod to Force Point uses
- **Equipment:** Rare items may grant bonus Force Points

Example: A 5th-level Gunslinger with no Force abilities:
- 1 + ⌊5/2⌋ = 1 + 2 = **3 Force Points per encounter**

Example: A 5th-level Jedi with 2 Force powers trained:
- 1 + ⌊5/2⌋ + 2 = **5 Force Points per encounter**

## Examples

**Scenario 1: Reroll After Bad Result**
A scoundrel has 2 Force Points remaining. They roll a Stealth check and get a 6.
- They spend 1 Force Point to add 1d6, rolling a 4
- New roll: 6 + 4 = 10 (much better!)
- They have 1 Force Point remaining

**Scenario 2: Powering a Force Ability**
A Jedi wants to use Move Object to push a droid away. The ability costs 2 Force Points.
- They spend 2 Force Points
- The ability succeeds
- They have 1 Force Point remaining until the next encounter

**Scenario 3: Talent Requirement**
A soldier has a talent that lets them take an extra attack in a round, but costs 2 Force Points.
- They're in combat with 3 Force Points
- They activate the talent (costs 2)
- They take an extra attack
- They have 1 Force Point left

## Related Concepts

- **Force Powers:** Many abilities consume Force Points
- **Talents:** Some talents grant bonus Force Points or use them
- **Charisma:** Affects how many uses of Force Point abilities you get
```

---

### 4. Condition Track (ConditionTrack)

**Reference ID:** `swse-ref-condition-track`
**Glossary Key:** ConditionTrack

```
# Condition Track Explained

## Overview
The Condition Track represents your cumulative injury and exhaustion as you take damage. Unlike Hit Points, the Condition Track tracks your condition step by step, applying escalating penalties as you become more wounded.

## Core Mechanic
As your HP decreases during a battle, you progress through Condition Track steps. Each step applies a cumulative −1 penalty to all attack rolls and Defense. At step 4 (Critical), the penalty is −10 to everything. These penalties stack on top of each other.

**Condition Track Progression:**
- **Healthy (0):** No penalty (100% to 75% HP)
- **Step 1 (Injured):** −1 to attacks and Defense (75% to 50% HP)
- **Step 2 (Wounded):** −2 cumulative (50% to 25% HP)
- **Step 3 (Critical):** −5 cumulative (25% to 0% HP)
- **Step 4 (Dying):** Unconscious at 0 HP, begin dying

## Calculation & Components

**Condition Track Status** is calculated from your current HP vs. maximum HP:

| HP Range | Step | Penalty |
|----------|------|---------|
| 100% - 76% | Healthy | None |
| 75% - 51% | Injured (Step 1) | −1 |
| 50% - 26% | Wounded (Step 2) | −2 |
| 25% - 1% | Critical (Step 3) | −5 |
| 0% or less | Dying (Step 4) | −10 / Unconscious |

Example: A soldier with 50 max HP:
- 50-38 HP: Healthy (0 penalty)
- 37-25 HP: Step 1 (−1 penalty)
- 24-13 HP: Step 2 (−2 penalty)
- 12-1 HP: Step 3 (−5 penalty)
- 0 HP: Dying (unconscious)

## Examples

**Scenario 1: Early Battle Wound**
A soldier starts at 50 HP. Takes a 15-point hit, now at 35 HP.
- 35/50 = 70%, still Healthy → No penalty yet
- They can attack and defend normally

**Scenario 2: Accumulating Injuries**
Another 10-point hit brings them to 25 HP.
- 25/50 = 50%, exactly at the Wounded threshold → Step 2 (−2 penalty)
- All their attack rolls now have −2
- All Defense values are reduced by 2

**Scenario 3: Critical Condition**
Another 15-point hit brings them to 10 HP.
- 10/50 = 20%, Critical condition → Step 3 (−5 penalty)
- All attack rolls have −5 (very difficult to hit)
- All Defense is reduced by 5 (easier for enemies to hit)

**Scenario 4: Healing Reverses Condition Track**
The soldier is healed for 20 HP, bringing them from 10 to 30 HP.
- 30/50 = 60%, back to Step 1 (−1 penalty)
- The more severe −5 penalty is removed
- They're still wounded but less critically

## Related Concepts

- **Hit Points:** As HP decreases, Condition Track step increases
- **Damage Threshold:** Reduces incoming damage, helping avoid Condition Track progression
- **Dying:** What happens when you reach Step 4
- **Healing:** Medical skills and Force powers improve Condition Track by restoring HP
```

---

### 5. Initiative (Initiative)

**Reference ID:** `swse-ref-initiative`
**Glossary Key:** Initiative

```
# Initiative Explained

## Overview
Initiative determines the order in which characters act during combat. Higher Initiative means you act sooner in each round. It's calculated once at the start of combat and doesn't change during the battle unless a talent or effect specifically modifies it.

## Core Mechanic
At the start of combat, each character rolls Initiative. The GM rolls once for all enemies of the same type. Initiative determines turn order for the entire combat encounter.

**Turn Order:** Highest Initiative acts first, then next highest, and so on. Tied initiative means characters act simultaneously (or, in some rule variants, you can choose who goes first).

## Calculation & Components

**Initiative = Dexterity Modifier + Misc Modifiers**

- **Dexterity Modifier:** Your DEX ability modifier
  - High DEX (14+): +2 or more bonus
  - Low DEX (8-): −1 or worse penalty
- **Misc Modifiers:** Talents, feats, or conditions that modify Initiative
  - Combat training feats: +1 to +2
  - Slow/Stun condition: −2 to −5
  - Haste effect: +2

Initiative does NOT include Condition Track penalties (unlike attacks and Defense).

Example: A scoundrel with +3 DEX modifier and a talent granting +1 Initiative:
- 3 + 1 = **+4 Initiative bonus**

## Examples

**Scenario 1: Quick Gunslinger**
A gunslinger with +4 DEX modifier rolls Initiative:
- Roll: 1d20 + 4 = 12 + 4 = 16 Initiative
- They act third out of five combatants

**Scenario 2: Slow Heavily-Armored Soldier**
A soldier in heavy armor with +1 DEX modifier rolls Initiative:
- Roll: 1d20 + 1 = 7 + 1 = 8 Initiative
- They act fourth out of five combatants
- Heavy armor provides defensive benefits but no Initiative bonus

**Scenario 3: Talent Bonus**
A scoundrel with a talent "Intuitive Reflexes" (+2 Initiative) has +2 DEX:
- Roll: 1d20 + 2 + 2 = 9 + 4 = 13 Initiative
- They act second, before the soldier and gunslinger from other examples

**Scenario 4: Taking it in the Round**
Combat starts: Turn order is Gunslinger (16), Scoundrel (13), Soldier (8).
- Round 1: Gunslinger acts, then Scoundrel, then Soldier
- Round 2: Order repeats (Initiative doesn't change mid-battle)
- Round 3: Order repeats again

## Related Concepts

- **Dexterity:** Base source of Initiative
- **Talents:** Some grant bonus Initiative
- **Condition Track:** Does NOT apply to Initiative (unlike attacks/Defense)
- **Combat Actions:** How many actions you can take during your turn
```

---

### 6. Base Attack Bonus (BaseAttackBonus)

**Reference ID:** `swse-ref-base-attack-bonus`
**Glossary Key:** BaseAttackBonus

```
# Base Attack Bonus Explained

## Overview
Base Attack Bonus (BAB) is your fundamental bonus to all attack rolls with weapons. It increases as you gain levels and represents your growing combat expertise and martial skill.

## Core Mechanic
When you make an attack roll, you roll 1d20 and add your Base Attack Bonus, plus any relevant ability modifiers (Strength for melee, Dexterity for ranged) and other modifiers.

**Attack Roll = 1d20 + Base Attack Bonus + Ability Modifier + Other Modifiers**

Your Defense value is what the enemy is trying to meet or exceed.

## Calculation & Components

**Base Attack Bonus = ½ Character Level + Class Modifier + Misc Modifiers**

- **½ Character Level:** You gain BAB as you level up
  - 1st level: +0
  - 3rd level: +1
  - 5th level: +2
  - 10th level: +5
- **Class Modifier:** Some classes gain bonus BAB
  - Soldier: No bonus (already included in ½ level)
  - Gunslinger: +1 at specific levels
  - Jedi: +1 at specific levels
  - Other classes: No bonus
- **Misc Modifiers:** Talents, feats, or equipment

Example: A 5th-level Soldier:
- ½ × 5 = +2 BAB

Example: A 5th-level Jedi with a +1 class bonus:
- (½ × 5) + 1 = +2 + 1 = **+3 BAB**

## Examples

**Scenario 1: Early Level Attack**
A 3rd-level Gunslinger (BAB +2) with +1 STR modifier attacks with a melee weapon:
- Roll: 1d20 + 2 + 1 = 14 + 3 = 17 total
- They need to meet or beat the target's Defense

**Scenario 2: Ranged Attack at Higher Level**
A 5th-level Gunslinger (BAB +2) with +2 DEX modifier shoots with a blaster:
- Roll: 1d20 + 2 + 2 = 8 + 4 = 12 total
- This time they rolled lower but still add their BAB

**Scenario 3: Full Attack with Multiple Attacks**
Some abilities allow "Full Attack" actions using BAB multiple times:
- A 9th-level character with BAB +4 can make attacks at +4, +4, −1 with special abilities

## Related Concepts

- **Initiative:** Affects turn order; calculated differently (DEX only)
- **Grapple:** Uses BAB + STR modifier instead of weapon modifier
- **Weapon Modifiers:** Some weapons add to your BAB
- **Feats & Talents:** Can grant bonus attacks or increase BAB at specific levels
```

---

### 7. Grapple (Grapple)

**Reference ID:** `swse-ref-grapple`
**Glossary Key:** Grapple

```
# Grapple Explained

## Overview
Grapple is your bonus to unarmed combat: grappling, hitting with your fists, or tackling. Unlike weapon attacks that use DEX or other ability modifiers, Grapple uses Strength, representing pure physical power.

## Core Mechanic
Grapple is used for:
- **Grappling:** Grabbing and restraining an opponent
- **Unarmed Strikes:** Punching, kicking, or headbutting
- **Opposed Checks:** Against an opponent's Grapple or Defense

The attacker rolls 1d20 + Grapple vs. the defender's Defense or their Grapple check.

## Calculation & Components

**Grapple = Base Attack Bonus + Strength Modifier + Misc Modifiers**

- **Base Attack Bonus:** Same as your weapon BAB (½ level + class bonus)
- **Strength Modifier:** Your STR ability modifier
  - High STR (14+): +2 bonus
  - Low STR (8 or less): −1 or worse penalty
- **Misc Modifiers:** Talents or feats that modify Grapple

Example: A 5th-level Soldier with STR +1 and no misc modifiers:
- BAB: +2
- STR: +1
- Grapple: +2 + 1 = **+3**

Example: A 5th-level Athlete with STR +3 and a talent granting +2 Grapple:
- BAB: +2
- STR: +3
- Talent: +2
- Grapple: +2 + 3 + 2 = **+7**

## Examples

**Scenario 1: Simple Grapple Check**
A soldier with Grapple +3 attempts to grapple an opponent with Defense 13.
- Roll: 1d20 + 3 = 15 + 3 = 18
- 18 ≥ 13, so the grapple succeeds

**Scenario 2: Opposed Grapple Check**
A scoundrel (Grapple +1) is grappled by a mercenary (Grapple +4) and tries to break free.
- Scoundrel rolls: 1d20 + 1 = 11 + 1 = 12
- Mercenary rolls: 1d20 + 4 = 9 + 4 = 13
- 13 > 12, so the scoundrel fails to break free

**Scenario 3: Unarmed Strike Damage**
A Force Adept with Grapple +2 punches an enemy instead of using a weapon:
- Attack roll: 1d20 + 2 = 16 + 2 = 18
- 18 beats the target's Defense, so the punch hits
- Damage: 1d4 + STR modifier (Force Adepts have lower unarmed damage)

**Scenario 4: Power Attack with Grapple**
A Soldier with Grapple +3 and STR +2 uses "Power Attack" feat to increase damage at a −2 penalty:
- Attack roll: 1d20 + 3 − 2 = 12 + 1 = 13
- If it hits, damage is 1d6 + STR (+2) + Power Attack bonus

## Related Concepts

- **Base Attack Bonus:** Component of Grapple calculation
- **Strength:** Primary ability for Grapple
- **Unarmed Damage:** Determined by class and Grapple result
- **Defense:** What unarmed attacks need to meet or exceed
```

---

### 8. Reflex Defense (ReflexDefense)

**Reference ID:** `swse-ref-reflex-defense`
**Glossary Key:** ReflexDefense

```
# Reflex Defense Explained

## Overview
Reflex Defense represents how hard you are to hit through agility and quick reactions. It's your primary defense against ranged attacks (blaster fire, thrown weapons) and some area effects. Higher Reflex Defense means enemies have a harder time hitting you with ranged attacks.

## Core Mechanic
When an enemy makes a ranged attack against you, they roll 1d20 + their attack bonus. Your Reflex Defense is the target number they must meet or exceed. If their roll is less than your Reflex Defense, the attack misses.

**Attack Roll vs. Reflex Defense**
- Enemy rolls: 1d20 + Attack Bonus
- Your Reflex Defense: 10 + ½ Level + DEX Mod + Other Bonuses
- If attack roll ≥ Reflex Defense, the attack hits

## Calculation & Components

**Reflex Defense = 10 + ½ Level + Dexterity Modifier + Class Bonus + Misc Modifiers**

- **10:** Base Defense all characters have
- **½ Level:** You become harder to hit as you gain experience
  - 1st level: +0
  - 3rd level: +1
  - 5th level: +2
  - 10th level: +5
- **Dexterity Modifier:** Your DEX ability modifier
  - High DEX (+2 or more): Better Reflex
  - Low DEX (−2 or worse): Worse Reflex
- **Class Bonus:** Some classes grant Reflex Defense bonuses
  - Gunslinger: +1 bonus
  - Scoundrel: +1 to +2 bonuses
- **Misc Modifiers:** Talents, feats, armor penalties, or effects
  - Heavy armor: −2 penalty to Reflex
  - Dodge talents: +1 to +2 bonus
  - Stunned condition: −1 to −5 penalty

Example: A 5th-level Gunslinger with +2 DEX and no misc modifiers:
- 10 + 2 + 2 + 1 = **15 Reflex Defense**

Example: A 5th-level Soldier with +1 DEX and heavy armor (−2):
- 10 + 2 + 1 − 2 = **11 Reflex Defense**

## Examples

**Scenario 1: Avoiding a Blaster Shot**
An enemy shoots at the Gunslinger (Reflex 15):
- Enemy roll: 1d20 + 6 = 12 + 6 = 18
- 18 ≥ 15, the shot hits
- The Gunslinger's Reflex isn't high enough

**Scenario 2: Quick Dodge**
The same Gunslinger (Reflex 15) is shot by a stormtrooper:
- Stormtrooper roll: 1d20 + 4 = 8 + 4 = 12
- 12 < 15, the shot misses
- The Gunslinger's quickness saves them

**Scenario 3: Armor Penalty**
A Soldier with Reflex 11 (reduced by armor) is shot:
- Attacker roll: 1d20 + 5 = 9 + 5 = 14
- 14 ≥ 11, the hit connects (armor made them easier to hit)
- Without armor, they'd have Reflex 13 and might have dodged

**Scenario 4: Multiple Shots**
A Gunslinger with Reflex 15 faces three attackers in a round. Each must roll separately against Reflex 15.

## Related Concepts

- **Dexterity:** Primary ability for Reflex Defense
- **Class Bonus:** Some classes are naturally harder to hit
- **Armor:** Reduces Reflex (heavy armor penalty)
- **Talents:** Some grant Dodge or Reflex bonuses
```

---

### 9. Fortitude Defense (FortitudeDefense)

**Reference ID:** `swse-ref-fortitude-defense`
**Glossary Key:** FortitudeDefense

```
# Fortitude Defense Explained

## Overview
Fortitude Defense represents your physical toughness and resistance to disease, poison, or direct physical harm. It's your primary defense against melee attacks and effects that target physical endurance. Higher Fortitude Defense means enemies have a harder time hurting you with melee attacks.

## Core Mechanic
When an enemy makes a melee attack against you, they roll 1d20 + their melee attack bonus. Your Fortitude Defense is the target number they must meet or exceed. If their roll is less than your Fortitude Defense, the attack misses.

**Melee Attack Roll vs. Fortitude Defense**
- Enemy rolls: 1d20 + Melee Attack Bonus
- Your Fortitude Defense: 10 + ½ Level + STR Mod + Other Bonuses
- If attack roll ≥ Fortitude Defense, the attack hits

## Calculation & Components

**Fortitude Defense = 10 + ½ Level + Strength Modifier + Class Bonus + Misc Modifiers**

- **10:** Base Defense all characters have
- **½ Level:** Improved with experience
  - Same progression as Reflex Defense
  - 1st level: +0
  - 5th level: +2
- **Strength Modifier:** Your STR ability modifier
  - High STR (+2 or more): Better Fortitude
  - Low STR (−2 or worse): Worse Fortitude
- **Class Bonus:** Some classes grant Fortitude bonuses
  - Soldier: +1 bonus (some variants)
  - Tech Specialist: No bonus
- **Misc Modifiers:** Armor (can provide +1 bonus), talents, effects

Example: A 5th-level Soldier with +2 STR and +1 armor bonus:
- 10 + 2 + 2 + 1 + 1 = **16 Fortitude Defense**

Example: A 5th-level Scoundrel with −1 STR and no bonuses:
- 10 + 2 − 1 = **11 Fortitude Defense**

## Examples

**Scenario 1: Melee Sword Attack**
An enemy with a melee attack bonus of +5 attacks the Soldier (Fortitude 16):
- Enemy roll: 1d20 + 5 = 14 + 5 = 19
- 19 ≥ 16, the attack hits

**Scenario 2: Strong Defense**
The same Soldier (Fortitude 16) is attacked by a weaker opponent with +3 melee:
- Opponent roll: 1d20 + 3 = 7 + 3 = 10
- 10 < 16, the attack bounces off
- The Soldier's toughness protected them

**Scenario 3: Unarmored Vulnerability**
A Force Adept with Fortitude 12 is attacked by a melee opponent with +4:
- Opponent roll: 1d20 + 4 = 9 + 4 = 13
- 13 ≥ 12, the attack connects
- Without armor or high strength, they're vulnerable in melee

**Scenario 4: Multiple Melee Attacks**
A Soldier with Fortitude 16 is surrounded by three enemies, each rolling melee attacks separately.

## Related Concepts

- **Strength:** Primary ability for Fortitude Defense
- **Armor:** Can provide bonuses to Fortitude
- **Class Bonus:** Soldiers naturally have higher Fortitude
- **Talents:** Some grant Fortitude bonuses or hardening effects
```

---

### 10. Will Defense (WillDefense)

**Reference ID:** `swse-ref-will-defense`
**Glossary Key:** WillDefense

```
# Will Defense Explained

## Overview
Will Defense represents your mental fortitude, magical resistance, and ability to resist mind-affecting effects. It's your primary defense against Force powers, mental manipulation, fear effects, and other effects that target the mind. Higher Will Defense means you're resistant to mental attacks.

## Core Mechanic
When someone uses a Force power or mental ability against you that requires a check, they often make an attack against your Will Defense. If their result is less than your Will Defense, the effect fails or doesn't affect you.

**Mental Effect vs. Will Defense**
- Attacker rolls: 1d20 + Force Power DC or Attack Bonus
- Your Will Defense: 10 + ½ Level + WIS Mod + Other Bonuses
- If attack roll ≥ Will Defense, the effect hits

## Calculation & Components

**Will Defense = 10 + ½ Level + Wisdom Modifier + Class Bonus + Misc Modifiers**

- **10:** Base Defense all characters have
- **½ Level:** Mental fortitude improves with experience
  - Same progression as other defenses
  - 1st level: +0
  - 5th level: +2
- **Wisdom Modifier:** Your WIS ability modifier
  - High WIS (+2 or more): Better Will
  - Low WIS (−2 or worse): Worse Will
- **Class Bonus:** Some classes grant Will bonuses
  - Jedi: +1 to +2 bonus (Force connection)
  - Force Adept: +1 bonus
- **Misc Modifiers:** Talents that improve mental resistance, effects that impair focus

Example: A 5th-level Jedi with +3 WIS and +1 class bonus:
- 10 + 2 + 3 + 1 = **16 Will Defense**

Example: A 5th-level Scoundrel with −1 WIS and no bonuses:
- 10 + 2 − 1 = **11 Will Defense**

## Examples

**Scenario 1: Force Mind Trick**
A Jedi uses Mind Trick (Force power DC 15) against a Scoundrel with Will 11:
- Force power attack: 1d20 + 4 = 12 + 4 = 16
- 16 ≥ 11, the mind trick affects the Scoundrel

**Scenario 2: Resisting Manipulation**
The same Jedi (Will 16) is targeted by the same mind trick:
- Force attack: 1d20 + 4 = 10 + 4 = 14
- 14 < 16, the Jedi's strong will resists the effect

**Scenario 3: Fear Effect**
An enemy uses a fear ability (DC 12) on a Soldier with Will 13:
- Fear attack: 1d20 + 2 = 9 + 2 = 11
- 11 < 13, the Soldier overcomes their fear

**Scenario 4: Multiple Mental Effects**
In a single round, multiple Force-users might attack a character's Will Defense.

## Related Concepts

- **Wisdom:** Primary ability for Will Defense
- **Force Powers:** Many target Will Defense
- **Jedi Class:** Naturally have bonuses to Will
- **Talents:** Some grant mental resistance or Will bonuses
- **Fear & Mind-Affecting Effects:** Will Defense is your defense against these
```

---

### 11. Flat-Footed Defense (FlatFooted)

**Reference ID:** `swse-ref-flat-footed`
**Glossary Key:** FlatFooted

```
# Flat-Footed Defense Explained

## Overview
Flat-Footed Defense is a special defense value used when you are caught by surprise or unaware. Unlike your normal Reflex Defense, Flat-Footed Defense does NOT include your Dexterity modifier. You use it only in specific situations where you haven't acted yet or can't react.

## Core Mechanic
You are flat-footed if:
- **You're surprised:** Enemies attack before your first turn in combat
- **You can't see an attacker:** You're blind or darkness prevents vision
- **You're helpless:** Restrained, paralyzed, or unable to act
- **You haven't acted yet in combat:** Your first round before you've taken a turn

While flat-footed, enemies use your Flat-Footed Defense instead of your normal Reflex Defense. You gain no Dexterity bonus in this state.

## Calculation & Components

**Flat-Footed Defense = 10 + ½ Level + (Class Bonus) − (Armor Penalty)**

Note: Unlike normal Reflex Defense, Flat-Footed Defense:
- **EXCLUDES Dexterity modifier**
- **EXCLUDES most talents and misc bonuses**
- **INCLUDES armor Class bonus if applicable** (usually +0)
- **MAY INCLUDE certain class bonuses** (varies by class)

Example: A 5th-level Gunslinger normally with Reflex 15 (+2 DEX):
- Normal Reflex: 10 + 2 + 2 + 1 = 15
- Flat-Footed: 10 + 2 + 1 − 0 = **13** (no DEX bonus)
- When surprised, the Gunslinger loses 2 to Defense

Example: A 5th-level Soldier with Fortitude 16 (+2 STR, heavy armor):
- Fortitude: 10 + 2 + 2 + 0 + 1 (armor) = 15
- Flat-Footed: 10 + 2 + 0 = **12** (no special bonuses)

## Examples

**Scenario 1: Surprise Attack**
A scoundrel is ambushed. The attacker rolls Initiative before the scoundrel can react.
- Attacker makes an attack using scoundrel's Flat-Footed Defense
- Scoundrel's normal Reflex Defense: 14
- Scoundrel's Flat-Footed Defense: 12 (2 points worse due to no DEX)
- Attack roll: 1d20 + 5 = 13 + 5 = 18 vs. Flat-Footed 12
- 18 ≥ 12, the surprise attack hits!

**Scenario 2: Combat Round Before Action**
Round 1 of combat: A Soldier hasn't acted yet. An enemy gets to act before them (higher Initiative).
- Enemy attacks the Soldier's Flat-Footed Defense (not normal Reflex)
- After the Soldier's turn, they're no longer flat-footed for that round

**Scenario 3: Darkness Penalty**
A Gunslinger is fighting in darkness and is considered flat-footed:
- Normal Reflex in light: 15
- Flat-Footed in darkness: 12
- Enemies get a 3-point boost against them

**Scenario 4: Sneaking into Combat**
A rogue uses Stealth to get close to an enemy. When combat starts:
- Rogue attacks enemy using Flat-Footed Defense
- Then enemy gets their first turn
- Enemy is no longer flat-footed after taking a full turn

## Related Concepts

- **Reflex Defense:** Your normal defense, includes DEX bonus
- **Initiative:** Determines when you act; if you haven't acted, you're flat-footed
- **Surprise:** Attacks before combat begins use Flat-Footed Defense
- **Darkness & Blindness:** May force you to use Flat-Footed Defense
- **Stealth:** Often paired with attacking a flat-footed opponent
```

---

## Implementation Notes

### Creating Entries in Foundry

1. Open the Journal directory in Foundry
2. Create new folder "Datapad References"
3. For each concept above:
   - Create new Journal Entry
   - Set the ID to the exact `referenceId` (e.g., `swse-ref-hit-points`)
   - Set the name to the concept label
   - Copy the content from this document into the entry
   - Save

4. Create compendium pack:
   - From Compendium menu, create new pack
   - Name: `datapads-references`
   - Type: JournalEntry
   - Import all created journal entries

### Validation

After creating entries, run audit in console:

```javascript
ReferenceService.auditReferences()
ReferenceService.printAudit()
```

All 11 entries should appear in the "Found" list. Any in "Missing" list need to be created.

### Future Expansion (Phase 12+)

When adding new references in future phases:
1. Create journal entry with content following this format
2. Add to glossary with `hasReference: true` and `referenceId`
3. Verify via audit
4. Document in updated REFERENCE_CONTENT file

---

## Content Guidelines

All reference content follows these principles:

1. **Accessible:** Written for new players, no assumed knowledge
2. **Practical:** Shows how to use the concept, not just theory
3. **Complete:** Explains the whole concept in one entry
4. **Rules-Based:** D20 SRD Saga Edition rules only
5. **Neutral:** No house rules, no speculation
6. **Bounded:** 300-800 words per concept
