#!/usr/bin/env python3
"""
SWSE Character Generation - Class Database (Part 2 of 4)
=========================================================

This script contains comprehensive data for the next 2 base classes:
4. Noble
5. Soldier

Each class includes:
- Basic statistics (hit die, BAB progression, defenses)
- Class skills (trained skills and general skills)
- Mentor information and personalized guidance
- Synergy information (ability, background, skill synergies)
- Special abilities and characteristics
- Narrative descriptions

Author: SWSE System
Version: 1.0
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


class BABProgression(Enum):
    """Base Attack Bonus progression rates"""
    SLOW = 0.5       # +0.5 per level
    MEDIUM = 0.75    # +0.75 per level
    FAST = 1.0       # +1.0 per level


class DefenseType(Enum):
    """Defense saving throw types"""
    FORTITUDE = "fortitude"
    REFLEX = "reflex"
    WILL = "will"


@dataclass
class MentorProfile:
    """Complete mentor profile for a class"""
    name: str
    title: str
    description: str
    portrait_path: str

    # Level-based greetings (1-20)
    level_greetings: Dict[int, str]

    # Guidance messages for character creation steps
    class_guidance: str
    background_guidance: str
    ability_guidance: str
    skill_guidance: str
    talent_guidance: str
    language_guidance: str
    multiclass_guidance: str
    hp_guidance: str

    def get_greeting(self, level: int) -> str:
        """Get mentor greeting for a specific level"""
        return self.level_greetings.get(level, "Continue your training.")

    def __repr__(self) -> str:
        return f"<Mentor: {self.name} - {self.title}>"


@dataclass
class ClassSkills:
    """Class skills for a specific class"""
    class_name: str
    trained_skills: List[str]  # Skills class is trained in
    general_class_skills: List[str]  # Any class can use these

    def contains_skill(self, skill: str) -> bool:
        """Check if skill is in trained or general skills"""
        skill_lower = skill.lower()
        return (any(s.lower() == skill_lower for s in self.trained_skills) or
                any(s.lower() == skill_lower for s in self.general_class_skills))

    def __repr__(self) -> str:
        return f"<ClassSkills: {self.class_name} ({len(self.trained_skills)} trained)>"


@dataclass
class Synergy:
    """Represents a synergy between class and another aspect"""
    name: str
    description: str
    strength: float  # 0.0 to 3.0 (tier rating)
    reason: str
    icon: Optional[str] = None


@dataclass
class ClassCharacteristics:
    """Core characteristics of a class"""
    name: str
    hit_die: str  # e.g., "1d8"
    bab_progression: BABProgression
    force_sensitive: bool

    defense_bonuses: Dict[DefenseType, int] = field(default_factory=dict)

    # Training points for this class
    initial_training_points: int = 8

    # Starting features gained at level 1
    starting_features: List[str] = field(default_factory=list)

    # Talent trees available to this class
    talent_trees: List[str] = field(default_factory=list)

    def get_bab_at_level(self, level: int) -> float:
        """Calculate Base Attack Bonus at a specific level"""
        base_bab = 0
        if self.bab_progression == BABProgression.SLOW:
            base_bab = max(0, (level - 1) * 0.5)
        elif self.bab_progression == BABProgression.MEDIUM:
            base_bab = max(0, (level - 1) * 0.75)
        elif self.bab_progression == BABProgression.FAST:
            base_bab = level - 1
        return base_bab

    def __repr__(self) -> str:
        return f"<Class: {self.name} ({self.hit_die} HD, {self.bab_progression.name} BAB)>"


@dataclass
class BackgroundSynergy:
    """Background synergy with a class"""
    background_name: str
    skill_matches: int
    tier: float
    reason: str


# ==============================================================================
# CLASS 4: NOBLE
# ==============================================================================

NOBLE_MENTOR = MentorProfile(
    name="J0-N1",
    title="Protocol Droid & Personal Butler",
    description="A sophisticated servant droid managing the character's accounts and affairs",
    portrait_path="systems/foundryvtt-swse/assets/mentors/j0n1.webp",

    level_greetings={
        1: "Greetings, Master. Your recent accomplishments have been recorded and documented. Exceptional work.",
        2: "Most satisfactory progress, Master. The estate has been notified of your continued development.",
        3: "Splendid. Your diligence ensures that the family legacy flourishes accordingly.",
        4: "Remarkable performance, Master. I have prepared a detailed report summarizing your achievements.",
        5: "Your recent actions exceed all projected expectations, Master. Commendable indeed.",
        6: "Master, your efficiency and discernment are noteworthy. May I suggest considering further refinement through advanced instruction or diplomatic engagement?",
        7: "Additional resources have been allocated to support your ongoing endeavors, Master.",
        8: "Your proficiency and influence continue to expand. Your reputation strengthens across multiple sectors.",
        9: "The family council has expressed satisfaction with your progress, Master. Your efforts reflect well upon your lineage.",
        10: "A significant milestone has been reached, Master. I shall coordinate a suitable celebration in your honor.",
        11: "Your accomplishments are becoming known throughout the sector, Master. Highly prestigious.",
        12: "Credentials and records have been updated with all appropriate guilds and authorities, Master.",
        13: "Statistically, your rapid advancement is extraordinary. Most impressive, Master.",
        14: "Your influence now extends to multiple systems. Your standing is exemplary.",
        15: "You approach the upper echelons of galactic society. Very commendable, Master.",
        16: "Additional assets and resources have been secured to further enhance your portfolio, Master.",
        17: "Few in the galaxy can match your current capabilities. Exceptional execution, Master.",
        18: "The HoloNet reports your achievements regularly. Your renown precedes you.",
        19: "One more notable success and you shall attain the pinnacle of refinement and excellence, Master.",
        20: "Master, your journey reflects years of diligence and sophistication. It has been my honor to serve you throughout this process.",
    },

    class_guidance="Master, select pursuits that enhance both skill and social standing. Strategic refinement ensures maximum efficacy.",
    background_guidance="Your background is the foundation of your station. Select experiences that reflect your breeding and position in galactic society.",
    ability_guidance="Strength, intellect, and dexterity are all measured in accordance with desired outcomes. Balance is paramount.",
    skill_guidance="Comprehensive knowledge and precision in your actions secure your success. Learn thoroughly, Master.",
    talent_guidance="Each talent contributes to your influence and efficiency. Choose wisely to optimize results.",
    language_guidance="A refined individual commands multiple tongues. Language fluency marks the distinction between the cultivated and the common.",
    multiclass_guidance="Diversifying your expertise increases flexibility and influence. Highly recommended.",
    hp_guidance="Maintaining your physical and strategic resilience is essential. Survival is a prerequisite for continued success.",
)

NOBLE_CHARACTERISTICS = ClassCharacteristics(
    name="Noble",
    hit_die="1d8",
    bab_progression=BABProgression.SLOW,
    force_sensitive=False,
    defense_bonuses={
        DefenseType.FORTITUDE: 1,
        DefenseType.REFLEX: 0,
        DefenseType.WILL: 2,
    },
    initial_training_points=8,
    starting_features=[
        "Bonus Feat",
        "Social Authority",
        "Resource Access",
        "Network Influence",
    ],
    talent_trees=[
        "Leader",
        "Diplomat",
        "Corporate Executive",
    ],
)

NOBLE_SKILLS = ClassSkills(
    class_name="Noble",
    trained_skills=[
        "Persuasion",
        "Deception",
        "Knowledge",
        "Gather Information",
        "Sense Motive",
    ],
    general_class_skills=[
        "Profession (any)",
        "Knowledge (nobility)",
        "Knowledge (politics)",
        "Bluff",
        "Intimidate",
    ],
)

NOBLE_ABILITY_SYNERGIES = {
    "Charisma": {
        "strength": 3.0,
        "reason": "Social influence and command presence",
        "notes": "Primary ability for leadership and persuasion",
    },
    "Intelligence": {
        "strength": 2.5,
        "reason": "Strategy and administrative knowledge",
        "notes": "Essential for complex political maneuvering",
    },
    "Wisdom": {
        "strength": 2.0,
        "reason": "Insight into people and situations",
        "notes": "Important for judgment and decision-making",
    },
    "Dexterity": {
        "strength": 1.5,
        "reason": "Grace and refined movement",
        "notes": "Moderate importance for etiquette",
    },
    "Constitution": {
        "strength": 1.0,
        "reason": "Endurance at formal events",
        "notes": "Lower priority",
    },
    "Strength": {
        "strength": 0.5,
        "reason": "Physical prowess (rarely needed)",
        "notes": "Least important for nobles",
    },
}

NOBLE_BACKGROUND_SYNERGIES = [
    BackgroundSynergy("Aristocratic Dynasty", 3, 3.0, "Perfect fit for noble birthright"),
    BackgroundSynergy("Court Intrigue Survivor", 4, 3.0, "Direct experience with political maneuvering"),
    BackgroundSynergy("Corporate Heir", 2, 2.5, "Business acumen complements noble status"),
    BackgroundSynergy("Diplomatic Representative", 3, 2.5, "Natural progression for social class"),
]


# ==============================================================================
# CLASS 5: SOLDIER
# ==============================================================================

SOLDIER_MENTOR = MentorProfile(
    name="Breach",
    title="Mandalorian Mercenary",
    description="A battle-hardened Mandalorian who praises survival",
    portrait_path="systems/foundryvtt-swse/assets/mentors/breach.webp",

    level_greetings={
        1: "Hey kid. Wanna learn how to be a soldier? Okay, I guess I can teach you a thing or two.",
        2: "You're getting sharper. Armor fits better too. Or maybe you just finally learned to move in it.",
        3: "Hey, not bad out there. You looked like you actually knew what you were doing.",
        4: "You're tougher than yesterday. I can tell. You didn't even complain once. Proud of you…kind of.",
        5: "You keep surviving. That's the important part. Pros survive.",
        6: "Okay, I'll admit it—what you pulled off today? That was impressive. Don't make me say it twice. I'm putting your name forward for elite trooper training. You've got what it takes to be one of the best. Keep fighting like this.",
        7: "You're starting to fight like one of us. That's a compliment. Mostly.",
        8: "You handled yourself. I've seen veterans fold under less. You didn't.",
        9: "You fight like one of the old warriors. Fierce. Focused. Little scary.",
        10: "Your record's getting…uh…noticeably not embarrassing. Keep that up.",
        11: "Your enemies don't like you anymore. That means you're doing something right.",
        12: "You walked away from another mess. Good. Mandalorians call that 'doing your job.'",
        13: "Alright, I'll say it: your skill's getting close to dangerous. In a good way.",
        14: "Your aim's better. Your tactics too. You're becoming kind of…reliable.",
        15: "Anyone calling you lucky hasn't actually watched you fight. Trust me.",
        16: "You could lead a squad if you wanted. I'd follow you. Just…don't get smug.",
        17: "People are starting to talk about you. And it's not complaining. That's rare.",
        18: "You're hitting like a walking artillery piece. Keep it up.",
        19: "Every time you come back alive, you prove something. To you. To us. To me.",
        20: "You keep this up, and…well…even I won't pretend I don't respect it.",
    },

    class_guidance="Pick what feels right in your hands. Same rule as weapons. If it fits, use it.",
    background_guidance="Your past made you a soldier. Pick experiences that tested you, forged you, and made you ready for war.",
    ability_guidance="Stronger, faster, smarter—whatever you're getting, it's working. Don't overthink it.",
    skill_guidance="Look, knowing things makes you harder to kill. Treat skills like gear—collect the useful stuff.",
    talent_guidance="Talents keep you alive. Choose the stuff that stops you from dying. Pretty simple.",
    language_guidance="Understanding what others say gives you the edge. Pick languages that help you survive and fight smarter.",
    multiclass_guidance="Trying something new? Good. Adaptation beats stubbornness. Learned that the hard way.",
    hp_guidance="You're harder to put down now. That's good. Try to stay that way.",
)

SOLDIER_CHARACTERISTICS = ClassCharacteristics(
    name="Soldier",
    hit_die="1d10",
    bab_progression=BABProgression.FAST,
    force_sensitive=False,
    defense_bonuses={
        DefenseType.FORTITUDE: 2,
        DefenseType.REFLEX: 1,
        DefenseType.WILL: 1,
    },
    initial_training_points=4,
    starting_features=[
        "Weapon Proficiency",
        "Armor Proficiency",
        "Combat Reflexes",
        "Tactical Training",
    ],
    talent_trees=[
        "Commando",
        "Weaponmaster",
        "Trooper",
    ],
)

SOLDIER_SKILLS = ClassSkills(
    class_name="Soldier",
    trained_skills=[
        "Weapons",
        "Armor",
        "Tactics",
        "Climb",
        "Swim",
    ],
    general_class_skills=[
        "Athletics",
        "Profession (Soldier)",
        "Survival",
        "Intimidate",
        "Perception",
    ],
)

SOLDIER_ABILITY_SYNERGIES = {
    "Strength": {
        "strength": 3.0,
        "reason": "Physical power and weapon damage",
        "notes": "Primary ability for melee combat and carrying",
    },
    "Dexterity": {
        "strength": 2.5,
        "reason": "AC, ranged attacks, and tactical movement",
        "notes": "Essential for combat effectiveness",
    },
    "Constitution": {
        "strength": 2.5,
        "reason": "Hit points and endurance",
        "notes": "Determines survivability in combat",
    },
    "Wisdom": {
        "strength": 2.0,
        "reason": "Awareness and combat awareness",
        "notes": "Important for spotting threats",
    },
    "Intelligence": {
        "strength": 1.5,
        "reason": "Tactical analysis and strategy",
        "notes": "Moderate importance for leadership",
    },
    "Charisma": {
        "strength": 1.0,
        "reason": "Command and morale",
        "notes": "Lower priority",
    },
}

SOLDIER_BACKGROUND_SYNERGIES = [
    BackgroundSynergy("War Veteran", 4, 3.0, "Combat experience directly translates"),
    BackgroundSynergy("Elite Commando", 5, 3.0, "Perfect soldier background"),
    BackgroundSynergy("Mercenary Operative", 3, 2.5, "Professional soldier mindset"),
    BackgroundSynergy("Trained Guard", 2, 2.5, "Disciplined approach to combat"),
]


# ==============================================================================
# COMPARISON UTILITIES
# ==============================================================================

class ClassComparison:
    """Utility class for comparing class characteristics"""

    @staticmethod
    def compare_bab_progression(level: int) -> Dict[str, float]:
        """Compare BAB at a specific level across all classes"""
        return {
            "Jedi": 0 + (level - 1) * 0.75,           # MEDIUM
            "Scout": 0 + (level - 1) * 0.75,          # MEDIUM
            "Scoundrel": 0 + (level - 1) * 0.75,      # MEDIUM
            "Noble": 0 + (level - 1) * 0.5,           # SLOW
            "Soldier": 0 + (level - 1) * 1.0,         # FAST
        }

    @staticmethod
    def get_primary_abilities() -> Dict[str, str]:
        """Get primary ability for each class"""
        return {
            "Jedi": "Wisdom (Force Connection)",
            "Scout": "Dexterity (Agility & Reflexes)",
            "Scoundrel": "Dexterity (Finesse & Agility)",
            "Noble": "Charisma (Social Influence)",
            "Soldier": "Strength (Physical Power)",
        }

    @staticmethod
    def get_defense_summary() -> Dict[str, Dict]:
        """Get defense bonus summary for all classes"""
        return {
            "Jedi": {
                DefenseType.FORTITUDE: 1,
                DefenseType.REFLEX: 1,
                DefenseType.WILL: 2,
            },
            "Scout": {
                DefenseType.FORTITUDE: 1,
                DefenseType.REFLEX: 2,
                DefenseType.WILL: 1,
            },
            "Scoundrel": {
                DefenseType.FORTITUDE: 0,
                DefenseType.REFLEX: 2,
                DefenseType.WILL: 0,
            },
            "Noble": {
                DefenseType.FORTITUDE: 1,
                DefenseType.REFLEX: 0,
                DefenseType.WILL: 2,
            },
            "Soldier": {
                DefenseType.FORTITUDE: 2,
                DefenseType.REFLEX: 1,
                DefenseType.WILL: 1,
            },
        }

    @staticmethod
    def get_hit_dice() -> Dict[str, str]:
        """Get hit die for each class"""
        return {
            "Jedi": "1d8",
            "Scout": "1d8",
            "Scoundrel": "1d8",
            "Noble": "1d8",
            "Soldier": "1d10",
        }


# ==============================================================================
# MENTOR COMPARISON
# ==============================================================================

def print_mentor_profile(mentor: MentorProfile) -> None:
    """Print a formatted mentor profile"""
    print(f"\n{'='*70}")
    print(f"MENTOR: {mentor.name}")
    print(f"{'='*70}")
    print(f"Title: {mentor.title}")
    print(f"Description: {mentor.description}")
    print(f"Portrait: {mentor.portrait_path}")
    print(f"\n{'CLASS GUIDANCE:':<30} {mentor.class_guidance}")
    print(f"{'BACKGROUND GUIDANCE:':<30} {mentor.background_guidance}")
    print(f"{'ABILITY GUIDANCE:':<30} {mentor.ability_guidance}")
    print(f"{'SKILL GUIDANCE:':<30} {mentor.skill_guidance}")
    print(f"{'TALENT GUIDANCE:':<30} {mentor.talent_guidance}")
    print(f"{'LANGUAGE GUIDANCE:':<30} {mentor.language_guidance}")


# ==============================================================================
# MAIN DEMONSTRATION
# ==============================================================================

if __name__ == "__main__":
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*15 + "SWSE CLASS DATABASE - PART 2 OF 4" + " "*20 + "║")
    print("║" + " "*12 + "Comprehensive data for Noble and Soldier" + " "*17 + "║")
    print("╚" + "═"*68 + "╝")

    # Display mentor profiles
    print("\n\n" + "="*70)
    print("MENTOR PROFILES")
    print("="*70)

    print_mentor_profile(NOBLE_MENTOR)
    print_mentor_profile(SOLDIER_MENTOR)

    # Display class characteristics
    print("\n\n" + "="*70)
    print("CLASS CHARACTERISTICS")
    print("="*70)

    for cls in [NOBLE_CHARACTERISTICS, SOLDIER_CHARACTERISTICS]:
        print(f"\n{cls.name.upper()}")
        print(f"  Hit Die: {cls.hit_die}")
        print(f"  BAB Progression: {cls.bab_progression.name}")
        print(f"  Force Sensitive: {cls.force_sensitive}")
        print(f"  Starting Training Points: {cls.initial_training_points}")
        print(f"  Defense Bonuses:")
        for defense_type, bonus in cls.defense_bonuses.items():
            print(f"    {defense_type.value.capitalize()}: +{bonus}")
        print(f"  Talent Trees: {', '.join(cls.talent_trees)}")

    # Display class skills
    print("\n\n" + "="*70)
    print("CLASS SKILLS")
    print("="*70)

    for skills_obj in [NOBLE_SKILLS, SOLDIER_SKILLS]:
        print(f"\n{skills_obj.class_name.upper()}")
        print(f"  Trained Skills: {', '.join(skills_obj.trained_skills)}")
        print(f"  General Skills: {', '.join(skills_obj.general_class_skills)}")

    # Display ability synergies
    print("\n\n" + "="*70)
    print("ABILITY SYNERGIES")
    print("="*70)

    synergies = {
        "Noble": NOBLE_ABILITY_SYNERGIES,
        "Soldier": SOLDIER_ABILITY_SYNERGIES,
    }

    for class_name, abilities in synergies.items():
        print(f"\n{class_name.upper()}")
        sorted_abilities = sorted(abilities.items(), key=lambda x: x[1]['strength'], reverse=True)
        for ability, data in sorted_abilities:
            strength_bar = "★" * int(data['strength']) + "☆" * (3 - int(data['strength']))
            print(f"  {ability:<12} {strength_bar} - {data['reason']}")
            print(f"    └─ {data['notes']}")

    # Display BAB progression for all 5 classes
    print("\n\n" + "="*70)
    print("BASE ATTACK BONUS PROGRESSION - ALL CLASSES")
    print("="*70)

    for level in [1, 5, 10, 15, 20]:
        bab_values = ClassComparison.compare_bab_progression(level)
        print(f"\nLevel {level}:")
        for class_name, bab in bab_values.items():
            print(f"  {class_name:<15} +{bab:.1f}")

    # Display background synergies
    print("\n\n" + "="*70)
    print("BACKGROUND SYNERGIES")
    print("="*70)

    all_synergies = {
        "Noble": NOBLE_BACKGROUND_SYNERGIES,
        "Soldier": SOLDIER_BACKGROUND_SYNERGIES,
    }

    for class_name, bg_synergies in all_synergies.items():
        print(f"\n{class_name.upper()}")
        for synergy in bg_synergies:
            stars = "★" * int(synergy.tier) + "☆" * (3 - int(synergy.tier))
            print(f"  {synergy.background_name:<30} {stars}")
            print(f"    └─ {synergy.reason}")

    # Print comprehensive comparison
    print("\n\n" + "="*70)
    print("QUICK REFERENCE - ALL 5 BASE CLASSES")
    print("="*70)

    print("\nPrimary Abilities by Class:")
    for class_name, ability in ClassComparison.get_primary_abilities().items():
        print(f"  {class_name:<15} {ability}")

    print("\nHit Dice by Class:")
    for class_name, hit_die in ClassComparison.get_hit_dice().items():
        print(f"  {class_name:<15} {hit_die}")

    print("\nDefense Bonuses Summary:")
    defenses = ClassComparison.get_defense_summary()
    print(f"{'Class':<15} {'Fortitude':>12} {'Reflex':>12} {'Will':>12}")
    print("-" * 51)
    for class_name, bonuses in defenses.items():
        fort = bonuses[DefenseType.FORTITUDE]
        ref = bonuses[DefenseType.REFLEX]
        will = bonuses[DefenseType.WILL]
        print(f"{class_name:<15} +{fort:>11} +{ref:>11} +{will:>11}")

    # Print comparison summary
    print("\n\n" + "="*70)
    print("CLASS ROLE SUMMARY")
    print("="*70)

    roles = {
        "Jedi": "Force-Sensitive Warrior - Wisdom-based, balanced defenses",
        "Scout": "Reconnaissance Specialist - Reflex-focused, stealth and survival",
        "Scoundrel": "Trickster - Social manipulation and quick escape",
        "Noble": "Social Operator - Charisma-based, political influence",
        "Soldier": "Combat Specialist - Strength-based, strongest HP and BAB",
    }

    for class_name, role in roles.items():
        print(f"  {class_name:<15} {role}")

    print("\n" + "="*70)
    print("END OF PART 2")
    print("="*70)
    print("\nRemaining classes to be covered:")
    print("  • Part 3: Prestige Classes (Imperial Knight, Medic, Jedi Knight, etc.)")
    print("  • Part 4: Advanced Analysis & Integration Tools")
    print("\nIntegration Note:")
    print("  Parts 1 & 2 can be combined for a complete base class database")
    print("\n")
