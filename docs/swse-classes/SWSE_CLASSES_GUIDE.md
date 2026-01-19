# SWSE Classes Database - Part 1 Guide
## Jedi, Scout, & Scoundrel

### Overview
This document describes the comprehensive Python script (`swse_classes_part1.py`) that contains detailed information about the first 3 base classes in Star Wars Saga Edition for Foundry VTT.

---

## 📋 What's Included in the Script

### 1. **Data Structures** (Object-Oriented Design)

#### `MentorProfile`
- Mentor name, title, description, portrait path
- 20 level-specific greetings (1-20)
- 8 guidance messages for each character creation step:
  - Class guidance
  - Background guidance
  - Ability guidance
  - Skill guidance
  - Talent guidance
  - Language guidance
  - Multiclass guidance
  - HP guidance

#### `ClassCharacteristics`
- Class name and hit die
- BAB progression rate (SLOW/MEDIUM/FAST)
- Force sensitivity flag
- Defense bonuses (Fortitude, Reflex, Will)
- Starting training points
- Starting features (level 1 abilities)
- Available talent trees

#### `ClassSkills`
- Trained skills (priority skills for the class)
- General class skills (secondary skills)
- Helper methods for skill matching

#### `Synergy`
- Represents synergies between class and other aspects
- Includes strength rating (0.0 - 3.0 tier system)
- Reason and description
- Optional icon reference

---

## 🎯 Class Profiles

### **Jedi**
**Mentor:** Miraj - Jedi Master

**Key Characteristics:**
- Hit Die: 1d8
- BAB Progression: Medium (0.75 per level)
- Force Sensitive: ✓ Yes
- Defense Bonuses: Fort +1, Ref +1, Will +2
- Starting Training Points: 6
- Talent Trees: Guardian, Consular, Sentinel

**Primary Ability:** Wisdom (Force Connection)
- Rating: ★★★ (3.0 - Strongest synergy)

**Trained Skills:**
- Lightsaber, Force, Awareness, Perception, Acrobatics

**Mentor Personality:**
- Wise and philosophical
- Emphasizes balance and understanding
- Focuses on Force connection and spiritual growth
- Values reflection and restraint over brute force

**Best Background Synergies:**
1. Force-Sensitive Foundling ★★★
2. Temple Scholar ★★★
3. Warrior Monk ★★☆
4. Peacekeeper ★★☆

---

### **Scout**
**Mentor:** Lead - Argent Squad Commander

**Key Characteristics:**
- Hit Die: 1d8
- BAB Progression: Medium (0.75 per level)
- Force Sensitive: ✗ No
- Defense Bonuses: Fort +1, Ref +2, Will +1
- Starting Training Points: 8
- Talent Trees: Scout, Pathfinder, Ranger

**Primary Ability:** Dexterity (Agility & Reflexes)
- Rating: ★★★ (3.0 - Strongest synergy)

**Secondary Ability:** Wisdom (Perception & Survival)
- Rating: ★★☆ (2.5)

**Trained Skills:**
- Stealth, Survival, Perception, Acrobatics, Knowledge

**Mentor Personality:**
- Gruff but fair military commander
- Emphasizes practical skills and field survival
- Values patience, observation, and reconnaissance
- Direct, no-nonsense communication style

**Best Background Synergies:**
1. Military Tracker ★★★
2. Wilderness Survivor ★★★
3. Spy Network ★★☆
4. Bounty Hunter ★★☆

---

### **Scoundrel**
**Mentor:** Ol' Salty - Space Pirate Captain

**Key Characteristics:**
- Hit Die: 1d8
- BAB Progression: Medium (0.75 per level)
- Force Sensitive: ✗ No
- Defense Bonuses: Fort +0, Ref +2, Will +0
- Starting Training Points: 8
- Talent Trees: Thief, Smuggler, Con Artist

**Primary Ability:** Dexterity (Stealth, Finesse, Reflexes)
- Rating: ★★★ (3.0 - Strongest synergy)

**Secondary Ability:** Charisma (Deception, Persuasion, Charm)
- Rating: ★★☆ (2.5)

**Trained Skills:**
- Deception, Stealth, Sleight of Hand, Perception, Persuasion

**Mentor Personality:**
- Colorful pirate with playful accent
- Uses humor and pirate speak
- Emphasizes cunning, survival, and adventure
- Encourages bold risks and clever thinking

**Best Background Synergies:**
1. Criminal Underworld ★★★
2. Street Orphan ★★★
3. Merchant Trader ★★☆
4. Escaped Slave ★★☆

---

## 📊 Comparison Tables

### Base Attack Bonus Progression
```
Level    Jedi      Scout     Scoundrel
1        +0.0      +0.0      +0.0
5        +3.0      +3.0      +3.0
10       +6.8      +6.8      +6.8
15       +10.5     +10.5     +10.5
20       +14.2     +14.2     +14.2
```
*All classes have identical BAB progression*

### Defense Bonuses Comparison
```
Class        Fortitude  Reflex  Will
Jedi         +1         +1      +2    (Balanced, strong will)
Scout        +1         +2      +1    (Strong reflex for evasion)
Scoundrel    +0         +2      +0    (Speed-focused, vulnerable will)
```

### Ability Priority Matrix
```
Ability      Jedi                Scout               Scoundrel
Wisdom       ★★★ (Force)         ★★☆ (Perception)    ★☆☆ (Insight)
Dexterity    ★★☆ (Lightsaber)    ★★★ (Combat)        ★★★ (Stealth)
Charisma     ★★☆ (Leadership)    ★☆☆ (Interaction)   ★★☆ (Deception)
Intelligence ★☆☆ (Knowledge)     ★☆☆ (Tactics)       ★★☆ (Planning)
Constitution ★☆☆ (Resilience)    ★★☆ (Endurance)     ★☆☆ (HP)
Strength     ★☆☆ (Damage)        ★☆☆ (Athletics)     ★☆☆ (Weak)
```

---

## 🔍 Using the Script

### Running the Script
```bash
python3 swse_classes_part1.py
```

### Output Sections
1. **Mentor Profiles** - Full mentor information and guidance
2. **Class Characteristics** - Hit dice, progression, bonuses
3. **Class Skills** - Trained and general skills
4. **Ability Synergies** - Ranked with visual ratings
5. **BAB Progression** - Attack bonus growth table
6. **Background Synergies** - Best background matches
7. **Quick Reference** - Summary comparison tables

---

## 🎮 Practical Applications

### For Character Creation
- Use to determine primary/secondary abilities
- Identify synergistic backgrounds
- Understand mentor personality for roleplay
- Plan skill training strategy

### For Game Masters
- Quick reference for NPC class templates
- Background synergy matching for better stories
- Mentor guidance for character advice in-game

### For Balance Analysis
- Compare class progression rates
- Analyze defense strengths/weaknesses
- Evaluate ability dependencies

---

## 📝 Class Selection Framework

### Choose Jedi If You Want:
- Force powers and mystical abilities
- Strong defensive saves
- Wisdom-based problem solving
- Wise mentor figure

### Choose Scout If You Want:
- Stealth and reconnaissance
- Quick reflexes and agility
- Practical field expertise
- Gruff military mentor

### Choose Scoundrel If You Want:
- Social manipulation and deception
- Quick getaways and tricks
- Roguish charisma
- Colorful pirate mentor

---

## 🔄 Integration Points

This script can be integrated with:
- **Character Generator** - Pull background synergies
- **Suggestion Engine** - Recommend builds based on class
- **Mentor System** - Load mentor profiles dynamically
- **Skill Training** - Validate class-appropriate selections

---

## 📚 Upcoming Parts

- **Part 2:** Noble & Soldier classes
- **Part 3:** Prestige classes (Imperial Knight, Medic, Jedi Knight, etc.)
- **Part 4:** Advanced tools and analysis

---

## 💡 Key Insights

1. **All base classes have identical BAB progression** - Differentiation comes from other areas
2. **Defense bonuses reflect class philosophy** - Jedi get balanced defenses, Scouts get reflexes
3. **Ability synergies are specific, not generic** - Dexterity is crucial for both Scout and Scoundrel but for different reasons
4. **Mentors have personality** - Each mentor reflects the class philosophy and playstyle
5. **Background synergies are thematic, not just mechanical** - Connections tell stories

---

## 📞 Questions to Consider

1. Should prestige classes modify their mentor?
2. How should multiclassing interact with mentor system?
3. Should mentor guidance evolve based on character choices?
4. Can background change mentor recommendations?

---

**Version:** 1.0
**Last Updated:** 2026-01-19
**Status:** Complete for Classes 1-3
