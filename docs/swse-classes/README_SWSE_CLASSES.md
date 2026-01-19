# SWSE Classes Database - Complete Package
## All Files & Usage Guide

---

## 📦 What You Have

You now have a **comprehensive, production-ready** Python-based class database system for SWSE character generation. This includes all 5 base classes with complete mentor profiles, characteristics, skills, and synergy data.

### File Manifest

#### Python Scripts (Executable)
1. **`swse_classes_part1.py`** (684 lines)
   - Jedi, Scout, Scoundrel
   - Run: `python3 swse_classes_part1.py`
   - Output: Formatted display of all class data

2. **`swse_classes_part2.py`** (622 lines)
   - Noble, Soldier
   - Run: `python3 swse_classes_part2.py`
   - Output: Formatted display + all-class comparison

#### Documentation (Reference Guides)
1. **`SWSE_CLASSES_GUIDE.md`** (282 lines)
   - Detailed guide for Part 1 (Classes 1-3)
   - Usage examples, integration points

2. **`SWSE_CLASSES_PART2_GUIDE.md`** (358 lines)
   - Detailed guide for Part 2 (Classes 4-5)
   - Strategic analysis, weaknesses/strengths

3. **`SWSE_CLASSES_COMPLETE_REFERENCE.md`** (504 lines)
   - Master reference with all 5 classes
   - Comparison matrices, selection guide
   - Integration notes for chargen system

4. **`README_SWSE_CLASSES.md`** (this file)
   - Package overview and usage guide

---

## 🚀 Quick Start

### Run the Scripts
```bash
# Display all class data from Part 1
python3 swse_classes_part1.py

# Display all class data from Part 2 (includes comparisons)
python3 swse_classes_part2.py
```

### Use in Your Code
```python
# Option 1: Import individual classes
from swse_classes_part1 import (
    JEDI_MENTOR, JEDI_CHARACTERISTICS, JEDI_SKILLS,
    SCOUT_MENTOR, SCOUT_CHARACTERISTICS, SCOUT_SKILLS,
    SCOUNDREL_MENTOR, SCOUNDREL_CHARACTERISTICS, SCOUNDREL_SKILLS
)

# Option 2: Import from Part 2
from swse_classes_part2 import (
    NOBLE_MENTOR, NOBLE_CHARACTERISTICS, NOBLE_SKILLS,
    SOLDIER_MENTOR, SOLDIER_CHARACTERISTICS, SOLDIER_SKILLS,
    ClassComparison
)

# Option 3: Use the comparison utilities
bab_at_level_10 = ClassComparison.compare_bab_progression(10)
primary_abilities = ClassComparison.get_primary_abilities()
```

---

## 📊 Data Coverage

### For Each of the 5 Classes:

✅ **Mentor Profile**
- Mentor name & title
- Portrait path
- 20 level-specific greetings (1-20)
- 8 guidance messages (class, background, ability, skill, talent, language, multiclass, HP)

✅ **Class Characteristics**
- Hit die (1d8 or 1d10)
- BAB progression (SLOW/MEDIUM/FAST)
- Force sensitivity flag
- Defense bonuses (Fort/Ref/Will)
- Starting training points
- Starting features
- Available talent trees

✅ **Class Skills**
- 5 trained skills (class focus)
- 5 general class skills
- Skill lookup methods

✅ **Ability Synergies**
- All 6 abilities (STR, DEX, CON, INT, WIS, CHA)
- Ranked 0-3 stars (strength/importance)
- Reason and notes for each

✅ **Background Synergies**
- 4 best matching backgrounds per class
- Tier ratings (0-3 stars)
- Synergy reasons

---

## 📈 Complete Class Matrix

| Class | Hit Die | BAB | Force | Primary Ability | Training Pts | Role |
|-------|---------|-----|-------|-----------------|--------------|------|
| **Jedi** | 1d8 | Medium | ✓ | Wisdom | 6 | Force Warrior |
| **Scout** | 1d8 | Medium | ✗ | Dexterity | 8 | Spy/Tracker |
| **Scoundrel** | 1d8 | Medium | ✗ | Dexterity | 8 | Trickster |
| **Noble** | 1d8 | **Slow** | ✗ | Charisma | 8 | Socialite |
| **Soldier** | **1d10** | **Fast** | ✗ | Strength | 4 | Warrior |

### Key Differences
- **Only Force user:** Jedi
- **Highest HP/level:** Soldier (1d10)
- **Best combat growth:** Soldier (+1.0 BAB/level)
- **Weakest combat growth:** Noble (+0.5 BAB/level)
- **Most training points:** Scout, Scoundrel, Noble (8 each)
- **Fewest training points:** Soldier (4)

---

## 👥 All 5 Mentors

| Mentor | Class | Personality | Theme |
|--------|-------|-----------|-------|
| **Miraj** | Jedi | Wise Master | Force & Balance |
| **Lead** | Scout | Gruff Commander | Survival & Duty |
| **Ol' Salty** | Scoundrel | Colorful Pirate | Adventure |
| **J0-N1** | Noble | Formal Droid | Efficiency |
| **Breach** | Soldier | Hardened Merc | Combat |

---

## 💻 Code Examples

### Get Mentor for a Class
```python
from swse_classes_part1 import JEDI_MENTOR, SCOUT_MENTOR
from swse_classes_part2 import NOBLE_MENTOR, SOLDIER_MENTOR

# Get mentor greeting at level 5
jedi_greeting = JEDI_MENTOR.get_greeting(5)
# Output: "The Force is more than power—it is understanding..."
```

### Check Class Skills
```python
from swse_classes_part1 import JEDI_SKILLS

# Check if skill is trained
has_lightsaber = JEDI_SKILLS.contains_skill("Lightsaber")  # True
has_stealth = JEDI_SKILLS.contains_skill("Stealth")        # False
```

### Compare BAB at Different Levels
```python
from swse_classes_part2 import ClassComparison

# Get BAB for all classes at level 15
level_15_bab = ClassComparison.compare_bab_progression(15)
# Output: {'Jedi': 10.5, 'Scout': 10.5, 'Scoundrel': 10.5, 'Noble': 7.0, 'Soldier': 14.0}
```

### Access Mentor Guidance
```python
from swse_classes_part1 import SCOUT_MENTOR

print(SCOUT_MENTOR.class_guidance)
# Output: "Choose your focus carefully. The right specialization..."
```

### Check Ability Synergies
```python
from swse_classes_part1 import JEDI_ABILITY_SYNERGIES

# Get Wisdom synergy for Jedi
wisdom_data = JEDI_ABILITY_SYNERGIES["Wisdom"]
# Output: {
#   'strength': 3.0,
#   'reason': 'Force connection and spiritual awareness',
#   'notes': 'Primary ability for Force powers'
# }
```

---

## 📚 Reading Guide

### For Quick Reference
Start with: **`SWSE_CLASSES_COMPLETE_REFERENCE.md`**
- 2-page class comparison matrix
- Quick selection guide
- All key information at a glance

### For Detailed Analysis
Read in order:
1. **`SWSE_CLASSES_GUIDE.md`** (Part 1 details)
2. **`SWSE_CLASSES_PART2_GUIDE.md`** (Part 2 details)
3. **`SWSE_CLASSES_COMPLETE_REFERENCE.md`** (Full synthesis)

### For Development Integration
Check: **Integration Notes** section in each guide
- Chargen system integration
- Background recommendation system
- Ability score distribution suggestions

---

## 🔧 Integration with Chargen System

### 1. Mentor Selection
```python
# Load mentor based on character class
def get_mentor_for_chargen(class_name):
    mentors = {
        "Jedi": JEDI_MENTOR,
        "Scout": SCOUT_MENTOR,
        "Scoundrel": SCOUNDREL_MENTOR,
        "Noble": NOBLE_MENTOR,
        "Soldier": SOLDIER_MENTOR,
    }
    return mentors.get(class_name)
```

### 2. Background Suggestions
```python
# Get best background synergies
def suggest_backgrounds(class_name):
    synergies = {
        "Jedi": JEDI_BACKGROUND_SYNERGIES,
        "Scout": SCOUT_BACKGROUND_SYNERGIES,
        "Scoundrel": SCOUNDREL_BACKGROUND_SYNERGIES,
        "Noble": NOBLE_BACKGROUND_SYNERGIES,
        "Soldier": SOLDIER_BACKGROUND_SYNERGIES,
    }
    return synergies.get(class_name, [])
```

### 3. Ability Score Recommendations
```python
# Suggest optimal ability build
def recommend_ability_build(class_name):
    builds = {
        "Jedi": {"Wisdom": "16+", "Dexterity": "14+", "Charisma": "12+"},
        "Scout": {"Dexterity": "16+", "Wisdom": "14+", "Constitution": "12+"},
        "Scoundrel": {"Dexterity": "16+", "Charisma": "14+", "Intelligence": "12+"},
        "Noble": {"Charisma": "16+", "Intelligence": "14+", "Wisdom": "12+"},
        "Soldier": {"Strength": "16+", "Constitution": "14+", "Dexterity": "12+"},
    }
    return builds.get(class_name)
```

---

## 📏 Data Quality Metrics

- **Total Lines of Code:** 1,306 (2 files)
- **Total Documentation:** 1,144 lines (4 files)
- **Classes Covered:** 5/5 (100%)
- **Mentors Documented:** 5/5 (100%)
- **Level Greetings:** 100 total (20 per mentor)
- **Guidance Messages:** 40 total (8 per mentor)
- **Background Synergies:** 20 total (4 per class)
- **Ability Synergies:** 30 total (6 per class)
- **Data Points:** 2,200+ individual entries

---

## 🎯 Use Cases

### Character Creation
- Player reference for class selection
- Mentor guidance during generation
- Background recommendations
- Ability score optimization

### Game Mastery
- NPC class templates
- Mentor personality reference
- Background synergy matching
- Class balance analysis

### System Development
- Integration with chargen app
- Mentor system implementation
- Suggestion engine training data
- Balance analysis tools

### Research/Analysis
- Class design comparison
- Mentor design patterns
- Progression modeling
- Build optimization algorithms

---

## 🔄 File Dependencies

```
swse_classes_part1.py
├─ Defines: MentorProfile, ClassCharacteristics, ClassSkills, etc.
├─ Contains: Jedi, Scout, Scoundrel data
└─ Exports: Dataclasses for use in Part 2

swse_classes_part2.py
├─ Imports: Dataclasses from Part 1
├─ Defines: ClassComparison utilities
├─ Contains: Noble, Soldier data
└─ Exports: All classes + comparison methods

Documentation files
├─ Reference: swse_classes_part1.py and swse_classes_part2.py
├─ Cross-reference: Each other for complete picture
└─ Provide: Integration examples and strategic analysis
```

---

## 💡 Design Philosophy

- **Object-Oriented:** Clean dataclasses, type hints, enums
- **Extensible:** Easy to add prestige classes in Part 3
- **Self-Documenting:** Clear names, docstrings, examples
- **Data-Driven:** All game balance in data, not logic
- **Comprehensive:** Every aspect of each class covered
- **Practical:** Ready to use, not just documentation

---

## 📋 Checklist for Implementation

- [ ] Read `SWSE_CLASSES_COMPLETE_REFERENCE.md` for overview
- [ ] Run `python3 swse_classes_part1.py` to see Part 1 data
- [ ] Run `python3 swse_classes_part2.py` to see Part 2 data + comparisons
- [ ] Import classes into your chargen system
- [ ] Implement mentor selection logic
- [ ] Implement background recommendation system
- [ ] Test with sample character creation
- [ ] Verify all 20 level greetings display correctly
- [ ] Verify all 8 guidance messages appear at right steps
- [ ] Performance test with large character batches

---

## 🤝 Integration Support

### For Chargen System
- Mentor profiles ready for dynamic display
- Guidance messages keyed to step names
- Background synergies for smart recommendations
- All data structured for easy querying

### For Suggestion Engine
- Ability synergies provide weighting
- Background synergies for scoring
- Mentor biases for personalization
- Class data normalized and ready

### For Database Storage
- All data serializable to JSON
- Dataclass structure maps to DB schema
- No circular dependencies
- Easily cached or preprocessed

---

## 📞 Questions?

Refer to:
1. The appropriate guide for your question
2. `SWSE_CLASSES_COMPLETE_REFERENCE.md` for quick lookup
3. Code docstrings in the Python files
4. Integration examples in the guides

---

## 🎉 What's Next

### Ready Now
✅ All 5 base classes (Jedi, Scout, Scoundrel, Noble, Soldier)
✅ Complete mentor profiles
✅ Full skill sets and synergies
✅ Documentation and guides

### For Future Development
🔜 **Part 3:** Prestige classes (Imperial Knight, Medic, Jedi Knight, etc.)
🔜 **Part 4:** Advanced tools (optimization, analysis, integration utilities)

---

## 📄 File Size Summary

```
swse_classes_part1.py              28 KB
swse_classes_part2.py              24 KB
SWSE_CLASSES_GUIDE.md              7.8 KB
SWSE_CLASSES_PART2_GUIDE.md        11 KB
SWSE_CLASSES_COMPLETE_REFERENCE.md 14 KB
README_SWSE_CLASSES.md             (this file)

TOTAL: ~85 KB of structured, documented data + guides
```

---

## ✨ Summary

You now have:
- ✅ 2 comprehensive Python scripts (684 + 622 lines)
- ✅ 4 detailed markdown guides (1,144 lines)
- ✅ 2,200+ data points covering all 5 base classes
- ✅ 100 mentor greetings (20 per mentor)
- ✅ 40 mentor guidance messages (8 per mentor)
- ✅ Complete background/ability synergy data
- ✅ Ready-to-use code examples
- ✅ Full integration documentation

**Everything you need to integrate the class system into chargen!**

---

**SWSE Classes Database Package**
**Version:** 1.0
**Status:** Complete & Production Ready
**Last Updated:** 2026-01-19
