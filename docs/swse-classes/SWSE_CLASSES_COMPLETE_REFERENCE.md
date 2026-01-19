# SWSE Base Classes - Complete Reference Guide
## All 5 Base Classes at a Glance

### Quick Navigation
1. [Class Comparison Matrix](#class-comparison-matrix)
2. [Individual Class Profiles](#individual-class-profiles)
3. [Ability Synergy Chart](#ability-synergy-chart)
4. [Mentor Profiles](#mentor-profiles)
5. [Selection Guide](#selection-guide)
6. [Integration Notes](#integration-notes)

---

## 📊 Class Comparison Matrix

### Core Statistics
| Class | Hit Die | BAB Rate | Force | Training Pts | Primary Ability | Role |
|-------|---------|----------|-------|--------------|-----------------|------|
| **Jedi** | 1d8 | Medium (0.75) | ✓ Yes | 6 | Wisdom ★★★ | Force Warrior |
| **Scout** | 1d8 | Medium (0.75) | ✗ No | 8 | Dexterity ★★★ | Spy/Tracker |
| **Scoundrel** | 1d8 | Medium (0.75) | ✗ No | 8 | Dexterity ★★★ | Trickster |
| **Noble** | 1d8 | Slow (0.5) | ✗ No | 8 | Charisma ★★★ | Socialite |
| **Soldier** | 1d10 | Fast (1.0) | ✗ No | 4 | Strength ★★★ | Warrior |

### Defense Bonuses
| Class | Fortitude | Reflex | Will | Philosophy |
|-------|-----------|--------|------|------------|
| **Jedi** | +1 | +1 | +2 | Balanced warrior |
| **Scout** | +1 | +2 | +1 | Mobile evasion |
| **Scoundrel** | +0 | +2 | +0 | Speed or death |
| **Noble** | +1 | +0 | +2 | Mental fortitude |
| **Soldier** | +2 | +1 | +1 | Physical toughness |

### BAB Progression Over 20 Levels
```
Level     1     5     10    15    20
Jedi      +0   +3.0  +6.8  +10.5 +14.2
Scout     +0   +3.0  +6.8  +10.5 +14.2
Scoundrel +0   +3.0  +6.8  +10.5 +14.2
Noble     +0   +2.0  +4.5  +7.0  +9.5   ← Weak!
Soldier   +0   +4.0  +9.0  +14.0 +19.0  ← Strong!
```

### HP Progression (Average, with +2 CON)
```
Level     1     5     10    15    20
Jedi      10    18    26    34    42
Scout     10    18    26    34    42
Scondrl   10    18    26    34    42
Noble     10    18    26    34    42
Soldier   12    22    32    42    52    ← +10 HP advantage!
```

---

## 🎯 Individual Class Profiles

### JEDI - The Force Warrior
**Mentor:** Miraj (Jedi Master)

**Philosophy:** Balance, wisdom, and Force connection

**Key Strengths:**
- Only Force-sensitive base class
- Balanced defenses (all +1 or better)
- Spiritual guidance from mentor
- Versatile playstyle

**Key Weaknesses:**
- Medium BAB progression
- Fewest training points (6 vs 8)
- Dependent on Force powers for full potential
- Moderate HP

**Ability Priority:**
1. Wisdom ★★★ - Force connection
2. Dexterity ★★☆ - Lightsaber combat
3. Charisma ★★☆ - Leadership

**Trained Skills:** Lightsaber, Force, Awareness, Perception, Acrobatics

**Talent Trees:** Guardian, Consular, Sentinel

**Best Backgrounds:**
- Force-Sensitive Foundling ★★★
- Temple Scholar ★★★

**Mentor Signature Quote:**
*"The Force calls to you, young one. Listen carefully, for it will teach you lessons no words can convey."*

---

### SCOUT - The Reconnaissance Specialist
**Mentor:** Lead (Argent Squad Commander)

**Philosophy:** Information, survival, and precise action

**Key Strengths:**
- Highest Reflex defense (+2)
- Maximum training points (8)
- Excellent stealth and survival
- Solid all-around combat

**Key Weaknesses:**
- No Force sensitivity
- Medium BAB (not exceptional)
- Specialist rather than generalist
- Vulnerable without team

**Ability Priority:**
1. Dexterity ★★★ - Combat and stealth
2. Wisdom ★★☆ - Perception
3. Constitution ★★☆ - Endurance

**Trained Skills:** Stealth, Survival, Perception, Acrobatics, Knowledge

**Talent Trees:** Scout, Pathfinder, Ranger

**Best Backgrounds:**
- Military Tracker ★★★
- Wilderness Survivor ★★★

**Mentor Signature Quote:**
*"You made it through your first mission. Not perfect, but you're learning. Stick with it."*

---

### SCOUNDREL - The Trickster
**Mentor:** Ol' Salty (Space Pirate Captain)

**Philosophy:** Cunning, charm, and adventure

**Key Strengths:**
- Highest Reflex defense (+2) like Scout
- Maximum training points (8)
- Best social manipulation
- Flexible skill set

**Key Weaknesses:**
- No Fortitude defense (+0)
- No Force sensitivity
- Most fragile of all classes
- Vulnerable in direct combat

**Ability Priority:**
1. Dexterity ★★★ - Stealth and finesse
2. Charisma ★★☆ - Deception
3. Intelligence ★★☆ - Planning

**Trained Skills:** Deception, Stealth, Sleight of Hand, Perception, Persuasion

**Talent Trees:** Thief, Smuggler, Con Artist

**Best Backgrounds:**
- Criminal Underworld ★★★
- Street Orphan ★★★

**Mentor Signature Quote:**
*"Arr! Ye survived yer first scrap with the law! Welcome aboard me ship, ye scurvy spacer!"*

---

### NOBLE - The Social Operator
**Mentor:** J0-N1 (Protocol Droid & Butler)

**Philosophy:** Influence, resources, and political power

**Key Strengths:**
- Strong Will defense (+2)
- Maximum training points (8)
- Best resource access
- Excellent social skills

**Key Weaknesses:**
- **Slowest BAB progression (0.5/level)**
- Completely helpless in direct combat
- No Force sensitivity
- Dependent on allies

**Ability Priority:**
1. Charisma ★★★ - Influence
2. Intelligence ★★☆ - Strategy
3. Wisdom ★★☆ - Judgment

**Trained Skills:** Persuasion, Deception, Knowledge, Gather Information, Sense Motive

**Talent Trees:** Leader, Diplomat, Corporate Executive

**Best Backgrounds:**
- Aristocratic Dynasty ★★★
- Court Intrigue Survivor ★★★

**Mentor Signature Quote:**
*"Master, your efficiency and discernment are noteworthy. May I suggest considering further refinement?"*

---

### SOLDIER - The Combat Specialist
**Mentor:** Breach (Mandalorian Mercenary)

**Philosophy:** Survival, effectiveness, and martial excellence

**Key Strengths:**
- **Fastest BAB progression (+1.0/level)**
- **Largest hit die (1d10)**
- Best Fortitude defense (+2)
- Most training combat options
- Strongest late game (level 20)

**Key Weaknesses:**
- Fewest training points (4)
- No Force sensitivity
- No Will defense (+1 is minimal)
- Combat tunnel-vision design

**Ability Priority:**
1. Strength ★★★ - Melee damage
2. Dexterity ★★☆ - Combat reflexes
3. Constitution ★★☆ - HP

**Trained Skills:** Weapons, Armor, Tactics, Climb, Swim

**Talent Trees:** Commando, Weaponmaster, Trooper

**Best Backgrounds:**
- War Veteran ★★★
- Elite Commando ★★★

**Mentor Signature Quote:**
*"Hey kid. Wanna learn how to be a soldier? Okay, I guess I can teach you a thing or two."*

---

## 📈 Ability Synergy Chart

### Wisdom (Force/Perception)
```
Jedi:     ★★★ (Force connection) - PRIMARY
Scout:    ★★☆ (Perception/Survival)
Scondrl:  ★☆☆ (Reading people)
Noble:    ★★☆ (Judgment/Decisions)
Soldier:  ★★☆ (Combat awareness)
```

### Dexterity (Agility/Finesse)
```
Jedi:     ★★☆ (Lightsaber combat)
Scout:    ★★★ (Stealth/Reflexes) - PRIMARY
Scondrl:  ★★★ (Finesse) - PRIMARY
Noble:    ★☆☆ (Grace/Etiquette)
Soldier:  ★★☆ (Ranged combat)
```

### Charisma (Influence/Presence)
```
Jedi:     ★★☆ (Leadership)
Scout:    ★☆☆ (Social interaction)
Scondrl:  ★★☆ (Deception)
Noble:    ★★★ (Influence) - PRIMARY
Soldier:  ★☆☆ (Command/Morale)
```

### Strength (Power/Might)
```
Jedi:     ★☆☆ (Lightsaber damage)
Scout:    ★☆☆ (Climbing)
Scondrl:  ★☆☆ (Weak area)
Noble:    ☆☆☆ (Useless) - AVOID
Soldier:  ★★★ (Melee damage) - PRIMARY
```

### Constitution (Endurance/HP)
```
Jedi:     ★☆☆ (Resilience)
Scout:    ★★☆ (Field endurance)
Scondrl:  ★☆☆ (HP only)
Noble:    ★☆☆ (Formal events)
Soldier:  ★★☆ (Major HP source)
```

### Intelligence (Strategy/Knowledge)
```
Jedi:     ★☆☆ (Knowledge skills)
Scout:    ★☆☆ (Tactical analysis)
Scondrl:  ★★☆ (Planning/Scheming) - Important
Noble:    ★★☆ (Political strategy)
Soldier:  ★☆☆ (Tactical knowledge)
```

---

## 👥 Mentor Profiles

### Comparison of Mentors

| Mentor | Class | Personality | Theme | Tone |
|--------|-------|-----------|-------|------|
| Miraj | Jedi | Wise Master | Force & Balance | Philosophical |
| Lead | Scout | Gruff Commander | Survival & Duty | Practical |
| Ol' Salty | Scoundrel | Colorful Pirate | Adventure & Cunning | Playful |
| J0-N1 | Noble | Formal Droid | Efficiency & Status | Professional |
| Breach | Soldier | Hardened Merc | Combat & Survival | Direct |

### Mentor Guidance Themes

**Miraj (Jedi):**
- Emphasizes Force connection
- Values balance and understanding
- Focuses on growth and wisdom
- Encourages reflection

**Lead (Scout):**
- Emphasizes field survival
- Values information gathering
- Focuses on precision
- Encourages caution

**Ol' Salty (Scoundrel):**
- Emphasizes cunning and boldness
- Values adventure and treasure
- Focuses on cleverness
- Encourages risk-taking

**J0-N1 (Noble):**
- Emphasizes efficiency and protocol
- Values social standing
- Focuses on resource optimization
- Encourages refinement

**Breach (Soldier):**
- Emphasizes survival and effectiveness
- Values practical skill
- Focuses on combat readiness
- Encourages toughness

---

## 🎮 Selection Guide

### For First-Time Players
**Recommendation:** Scout or Soldier
- Scout: Best all-around, easy to understand
- Soldier: Straightforward combat, hard to fail

**Avoid:** Noble (too specialized in weak area)

### For Combat-Focused Players
**Best:** Soldier (highest BAB, most HP)
**Alternative:** Jedi (balanced with Force powers)
**Avoid:** Noble (weakest combat)

### For Roleplay-Focused Players
**Best:** Noble or Jedi
- Noble: Political intrigue
- Jedi: Spiritual journey
**Avoid:** Soldier (combat focused)

### For Social-Focused Players
**Best:** Noble (best social skills)
**Alternative:** Scoundrel (deception focus)
**Avoid:** Soldier (no social defense)

### For Stealth-Focused Players
**Best:** Scout or Scoundrel
- Scout: Reconnaissance
- Scoundrel: Infiltration
**Avoid:** Soldier (too loud)

### For Support/Utility Players
**Best:** Jedi (Force powers, flexibility)
**Alternative:** Noble (resource access)
**Avoid:** Soldier (single-track focus)

---

## 🔄 Integration Notes

### For Chargen Mentor System
```python
# Map class names to mentors
MENTOR_MAP = {
    "Jedi": JEDI_MENTOR,
    "Scout": SCOUT_MENTOR,
    "Scoundrel": SCOUNDREL_MENTOR,
    "Noble": NOBLE_MENTOR,
    "Soldier": SOLDIER_MENTOR,
}

def get_mentor(class_name):
    return MENTOR_MAP.get(class_name)
```

### For Background Recommendation
```python
# Match backgrounds to class synergies
SYNERGY_TIERS = {
    "Jedi": ["Force-Sensitive Foundling", "Temple Scholar"],
    "Scout": ["Military Tracker", "Wilderness Survivor"],
    "Scoundrel": ["Criminal Underworld", "Street Orphan"],
    "Noble": ["Aristocratic Dynasty", "Court Intrigue Survivor"],
    "Soldier": ["War Veteran", "Elite Commando"],
}
```

### For Ability Score Distribution
```python
# Suggested point buy distributions
OPTIMAL_BUILDS = {
    "Jedi": {"Wisdom": 16, "Dexterity": 14, "Charisma": 12},
    "Scout": {"Dexterity": 16, "Wisdom": 14, "Constitution": 12},
    "Scondrl": {"Dexterity": 16, "Charisma": 14, "Intelligence": 12},
    "Noble": {"Charisma": 16, "Intelligence": 14, "Wisdom": 12},
    "Soldier": {"Strength": 16, "Constitution": 14, "Dexterity": 12},
}
```

---

## 💡 Key Strategic Insights

### Early Game (Levels 1-5)
- All classes roughly equal in combat
- Noble slightly weaker
- Jedi has Force powers advantage
- Training points matter more (Scout/Scondrl/Noble best)

### Mid Game (Levels 10-15)
- Soldier's BAB advantage starts showing (+1.5 difference)
- Scoundrel becomes more fragile (0 Fortitude)
- Jedi's versatility increases
- Noble's weaknesses become apparent

### Late Game (Levels 16-20)
- Soldier dominates in combat (+4.8 BAB advantage, +10 HP)
- Noble becomes a support/face only
- Scoundrel must play tactically
- Jedi's balance becomes crucial
- Scout's consistency remains valuable

### Party Dynamics
- **Best Pairs:** Soldier + Noble (combat + support)
- **Best Solo:** Scout or Soldier
- **Best Group:** Jedi (fills many roles)
- **Hardest Solo:** Noble

---

## 📞 Questions for Game Masters

1. Should Noble's BAB be buffed to Medium to make it viable?
2. Should Soldier's training points increase from 4 to 6?
3. How should prestige classes modify these progressions?
4. Should there be balancing bonuses for non-combat classes?
5. How do multiclass progressions interact with these mentors?

---

## 📚 File Structure

```
swse_classes_part1.py          (Classes 1-3: Jedi, Scout, Scoundrel)
swse_classes_part2.py          (Classes 4-5: Noble, Soldier)
SWSE_CLASSES_GUIDE.md          (Part 1 detailed guide)
SWSE_CLASSES_PART2_GUIDE.md    (Part 2 detailed guide)
SWSE_CLASSES_COMPLETE_REFERENCE.md (This file - full reference)
```

### Using the Files
```bash
# Run individual parts
python3 swse_classes_part1.py
python3 swse_classes_part2.py

# Import for use in other scripts
from swse_classes_part1 import *
from swse_classes_part2 import *
```

---

## 🎯 Next Steps

### Part 3: Prestige Classes
Will cover:
- Imperial Knight
- Medic
- Jedi Knight
- Tech Specialist
- Other prestige paths

### Part 4: Advanced Tools
Will provide:
- Build optimization algorithms
- Synergy analysis tools
- Character progression modeling
- Integration utilities

---

**Complete Base Classes Reference**
**Version:** 1.0
**Last Updated:** 2026-01-19
**All 5 Base Classes Covered:** ✓ Complete
**Status:** Ready for Integration
