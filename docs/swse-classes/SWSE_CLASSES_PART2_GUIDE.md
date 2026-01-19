# SWSE Classes Database - Part 2 Guide
## Noble & Soldier

### Overview
This document describes the comprehensive Python script (`swse_classes_part2.py`) that contains detailed information about the final 2 base classes in Star Wars Saga Edition for Foundry VTT.

---

## 📋 What's Included in the Script

The script continues from Part 1 with the same data structures and adds two new classes:
- Noble
- Soldier

Each includes all mentor profiles, class characteristics, skills, ability synergies, and background synergies.

---

## 🎯 Class Profiles

### **Noble**
**Mentor:** J0-N1 - Protocol Droid & Personal Butler

**Key Characteristics:**
- Hit Die: 1d8
- BAB Progression: **Slow** (0.5 per level) - Notably weaker combat progression
- Force Sensitive: ✗ No
- Defense Bonuses: Fort +1, Ref +0, Will +2 (Strong willpower)
- Starting Training Points: 8
- Talent Trees: Leader, Diplomat, Corporate Executive

**Primary Ability:** Charisma (Social Influence)
- Rating: ★★★ (3.0 - Strongest synergy)

**Secondary Ability:** Intelligence (Strategy)
- Rating: ★★☆ (2.5)

**Trained Skills:**
- Persuasion, Deception, Knowledge, Gather Information, Sense Motive

**Mentor Personality:**
- Formal and professional protocol droid
- Emphasizes efficiency, statistics, and strategic refinement
- Values breeding, station, and social standing
- Speaks in measured, sophisticated tones
- Provides detailed reports and documentation

**Mentor Signature Traits:**
- Addresses character as "Master"
- References family council, estate, credentials
- Treats advancement as portfolio optimization
- Maintains absolute professionalism

**Best Background Synergies:**
1. Aristocratic Dynasty ★★★
2. Court Intrigue Survivor ★★★
3. Corporate Heir ★★☆
4. Diplomatic Representative ★★☆

**Weaknesses:**
- Lowest BAB progression (slowest attack bonus growth)
- No Fortitude defense at all
- Least physical combat oriented
- Dependent on minions/allies

**Strengths:**
- Best social/mental defenses
- Most training points available
- Strong influence and resources
- Multiple paths to victory (not just combat)

---

### **Soldier**
**Mentor:** Breach - Mandalorian Mercenary

**Key Characteristics:**
- Hit Die: 1d10 - **Largest hit die** (most HP per level)
- BAB Progression: **Fast** (1.0 per level) - Best combat progression
- Force Sensitive: ✗ No
- Defense Bonuses: Fort +2, Ref +1, Will +1 (Balanced, strongest Fortitude)
- Starting Training Points: 4 (fewest)
- Talent Trees: Commando, Weaponmaster, Trooper

**Primary Ability:** Strength (Physical Power)
- Rating: ★★★ (3.0 - Strongest synergy)

**Secondary Ability:** Dexterity (Combat Reflexes) & Constitution (Endurance)
- Rating: ★★☆ (2.5)

**Trained Skills:**
- Weapons, Armor, Tactics, Climb, Swim

**Mentor Personality:**
- Gruff but fair Mandalorian warrior
- Uses sparse, direct communication
- Emphasizes survival over everything
- Shows begrudging respect through words
- Values competence and results

**Mentor Signature Traits:**
- Minimal praise but genuine respect
- Military-focused wisdom
- "If it works, keep doing it" philosophy
- Treats combat as a job, not glory

**Best Background Synergies:**
1. War Veteran ★★★
2. Elite Commando ★★★
3. Mercenary Operative ★★☆
4. Trained Guard ★★☆

**Strengths:**
- **Highest BAB progression** (+19.0 at level 20 vs others' +14.2)
- **Largest hit die** (+10 vs +8 per level)
- Best physical/combat defenses
- Most combat-versatile

**Weaknesses:**
- Fewest training points (skill penalty)
- No Force sensitivity
- Low social defense (Will)
- Combat-tunnel-vision design

---

## 📊 Comparison Tables

### Attack Progression Over 20 Levels
```
Level    Jedi     Scout    Scoundrel  Noble   Soldier
1        +0.0     +0.0     +0.0       +0.0    +0.0
5        +3.0     +3.0     +3.0       +2.0    +4.0
10       +6.8     +6.8     +6.8       +4.5    +9.0
15       +10.5    +10.5    +10.5      +7.0    +14.0
20       +14.2    +14.2    +14.2      +9.5    +19.0
```

**Key Insight:** Soldier gains +4.8 attack over others by level 20!

### Defense Bonuses - All Classes
```
Class        Fortitude  Reflex  Will
Jedi         +1         +1      +2    (Balanced)
Scout        +1         +2      +1    (Mobile)
Scoundrel    +0         +2      +0    (Speed-only)
Noble        +1         +0      +2    (Mental)
Soldier      +2         +1      +1    (Tough)
```

### Hit Dice Impact (HP at Level 20)
```
Class        Hit Die   L1 HP   L20 HP (with +2 CON)
Jedi         1d8       10      +8×19  = +162 total
Scout        1d8       10      +8×19  = +162 total
Scoundrel    1d8       10      +8×19  = +162 total
Noble        1d8       10      +8×19  = +162 total
Soldier      1d10      12      +10×19 = +190 total
```

**Soldier gets +28 HP advantage over time!**

### Ability Priority Matrix - All Classes
```
Ability      Jedi              Scout             Scoundrel         Noble             Soldier
Wisdom       ★★★ (Force)       ★★☆ (Perception)  ★☆☆ (Insight)     ★★☆ (Judgment)    ★★☆ (Awareness)
Dexterity    ★★☆ (Lightsaber)  ★★★ (Combat)      ★★★ (Stealth)     ★☆☆ (Grace)       ★★☆ (Shooting)
Charisma     ★★☆ (Leadership)  ★☆☆ (Social)      ★★☆ (Deception)   ★★★ (Influence)   ★☆☆ (Command)
Intelligence ★☆☆ (Knowledge)   ★☆☆ (Tactics)     ★★☆ (Planning)    ★★☆ (Strategy)    ★☆☆ (Tactics)
Constitution ★☆☆ (Resilience)  ★★☆ (Endurance)   ★☆☆ (HP)          ★☆☆ (Events)      ★★☆ (HP)
Strength     ★☆☆ (Damage)      ★☆☆ (Athletics)   ★☆☆ (Weak)        ☆☆☆ (Useless)     ★★★ (Power)
```

---

## 🎮 Class Roles Summary

### Jedi
**Role:** Force-Sensitive Warrior
- Wisdom-based mystic warrior
- Balanced defenses and capabilities
- Force powers add versatility
- Works well solo or in groups

### Scout
**Role:** Reconnaissance Specialist
- Reflexes and information gathering
- Stealth and evasion focus
- Valuable for scouting and tracking
- Solo specialist

### Scoundrel
**Role:** Social Trickster
- Deception and social engineering
- Quick escape mechanisms
- Best at social encounters
- Needs good allies

### Noble
**Role:** Social Operator
- Political maneuvering and influence
- Resource manipulation
- Weakest in direct combat
- Strong in intrigue and negotiation

### Soldier
**Role:** Combat Specialist
- Pure martial prowess
- Strongest in direct combat
- Largest hit dice and best BAB
- Most survivable in warfare

---

## 📈 Strategic Differences

### Combat Power Progression
```
        Early Game (Lvl 1-5)
                ↓
Soldier: ████████░░ (Leader)
Scout:   ████████░░ (Tied with Scoundrel)
Jedi:    ████████░░ (Tied with Scout)
Scondrl: ████████░░ (Tied with Scout)
Noble:   ██████░░░░ (Weakest)

        Mid Game (Lvl 10-15)
                ↓
Soldier: ███████░░░ (Clear leader by +2.2 BAB)
Jedi:    ████████░░ (Tied with Scout)
Scout:   ████████░░ (Tied with Jedi)
Scondrl: ████████░░ (Tied with Jedi)
Noble:   ██████░░░░ (Falling behind)

        Late Game (Lvl 20)
                ↓
Soldier: ████████░░ (Dominant +4.8 over others)
Jedi:    ███████░░░ (Catching up but still second)
Scout:   ███████░░░ (Tied with Jedi)
Scondrl: ███████░░░ (Tied with Jedi)
Noble:   █████░░░░░ (Struggles in late game)
```

### Survivability Analysis

**Highest HP at Level 20:**
1. Soldier (190 avg with +2 CON)
2. All others at 162 avg with +2 CON

**Best Defenses:**
- Fortitude: Soldier (+2)
- Reflex: Scout, Scoundrel (+2)
- Will: Jedi, Noble (+2)

**Most Well-Rounded:**
- Jedi (all defenses = +1 or better)

---

## 🔍 Class Selection Framework - Complete Edition

### Choose Jedi If:
- You want Force powers and mystical abilities
- You value balance over specialization
- You want strong defensive saves
- You like philosophical roleplay

### Choose Scout If:
- You enjoy stealth and reconnaissance
- You want high reflexes and agility
- You prefer gathering information
- You like specialized solo missions

### Choose Scoundrel If:
- You love social manipulation and tricks
- You want flexibility in and out of combat
- You enjoy roguish playstyle
- You like pirate-themed adventures

### Choose Noble If:
- You enjoy political intrigue
- You want resource-based power
- You prefer social encounters over combat
- You like being "the face" of the party

### Choose Soldier If:
- You want maximum combat power
- You value straightforward effectiveness
- You want to survive any fight
- You like warrior/mercenary fantasy

---

## 💡 Key Insights - Part 2

1. **Noble is the only SLOW BAB class** - This is unusual and risky
2. **Soldier has 1d10 hit die** - Unique among base classes
3. **Defense profiles vary greatly** - Each class has different strengths
4. **Social vs Combat split** - Noble and Soldier are opposites
5. **Training points inverse to combat** - Nobles get 8, Soldiers get 4
6. **Late game divergence** - Differences become more pronounced at higher levels

---

## 🔄 Integration with Part 1

### Using Both Parts Together:

```python
# Import from both scripts
from swse_classes_part1 import (
    JEDI_MENTOR, SCOUT_MENTOR, SCOUNDREL_MENTOR,
    JEDI_CHARACTERISTICS, SCOUT_CHARACTERISTICS, SCOUNDREL_CHARACTERISTICS
)
from swse_classes_part2 import (
    NOBLE_MENTOR, SOLDIER_MENTOR,
    NOBLE_CHARACTERISTICS, SOLDIER_CHARACTERISTICS
)

# Create unified class list
all_base_classes = [
    ("Jedi", JEDI_MENTOR, JEDI_CHARACTERISTICS),
    ("Scout", SCOUT_MENTOR, SCOUT_CHARACTERISTICS),
    ("Scoundrel", SCOUNDREL_MENTOR, SCOUNDREL_CHARACTERISTICS),
    ("Noble", NOBLE_MENTOR, NOBLE_CHARACTERISTICS),
    ("Soldier", SOLDIER_MENTOR, SOLDIER_CHARACTERISTICS),
]

# Use for chargen mentor system
def get_mentor_for_class(class_name):
    for name, mentor, _ in all_base_classes:
        if name.lower() == class_name.lower():
            return mentor
    return None
```

---

## 📞 Integration Questions for Developers

1. Should Soldier's slower skill training be addressed with optional bonus?
2. Should Noble have bonus feats to compensate for weak combat?
3. How should prestige classes modify base class characteristics?
4. Should mentors change dialogue based on class build decisions?
5. Can background selections modify mentor recommendations?

---

## 📚 Upcoming

- **Part 3:** Prestige Classes with their mentors and progressions
- **Part 4:** Advanced analysis tools and integration utilities

---

**Version:** 1.0
**Last Updated:** 2026-01-19
**Status:** Complete for All 5 Base Classes
