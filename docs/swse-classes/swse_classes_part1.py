#!/usr/bin/env python3
"""
SWSE Character Generation - Class Database (Part 1 of 4)
=========================================================

This script contains comprehensive data for the first 3 base classes:
1. Jedi
2. Scout
3. Scoundrel

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
# CLASS 1: JEDI
# ==============================================================================

JEDI_MENTOR = MentorProfile(
    name="Miraj",
    title="Jedi Master of the Republic, Protector of the Weak, Enforcer of Justice, and Keeper of the Peace",
    description="A wise Jedi Master who encourages you to continue on your journey",
    portrait_path="systems/foundryvtt-swse/assets/mentors/miraj.webp",

    level_greetings={
        1: "The Force calls to you, young one. Listen carefully, for it will teach you lessons no words can convey.",
        2: "Every step you take shapes your path. Patience and mindfulness are as important as skill and strength.",
        3: "Your connection to the Force deepens. Observe its flow, and let it guide your decisions.",
        4: "A Jedi walks with purpose, but also with humility. Remember, your actions touch more than yourself.",
        5: "The Force is more than power—it is understanding, compassion, and discernment. You are beginning to perceive this truth.",
        6: "Halfway to Knighthood, your dedication honors the Order. Soon, you will be ready to face the trials of a Jedi Knight. Embrace the responsibility that comes with this growth.",
        7: "Your attunement to the Force becomes more natural. Let it sharpen your senses, calm your mind, and steady your spirit.",
        8: "You are learning to harmonize thought, action, and perception. This balance will serve you well in every challenge ahead.",
        9: "The path of the Jedi is not measured in victories, but in understanding and restraint. You are walking this path with care.",
        10: "Your progress is evident. A Jedi's strength lies not only in skill, but in knowing when to act and when to wait.",
        11: "True mastery comes from awareness and compassion. Your connection to the Force grows as you cultivate both.",
        12: "Challenges will test you in ways training cannot. Face them with courage, and the Force will guide your steps.",
        13: "The Force is a teacher as much as I am. Listen, and it will reveal what the eyes cannot see.",
        14: "You are learning the subtle truths of the galaxy. Wisdom and discernment will distinguish you from others.",
        15: "The light of your spirit guides those around you. Remember, a Jedi serves not for glory, but for balance.",
        16: "Skill alone is not enough. Reflection and understanding are as vital as any strike or maneuver.",
        17: "The Force reveals its mysteries to those who remain patient. You are beginning to perceive its deeper patterns.",
        18: "Your insight and judgment are growing. Soon, your decisions will shape the fate of many.",
        19: "You stand on the threshold of mastery. Soon, you may guide others as I have guided you.",
        20: "You have become a True Jedi. Your example will inspire the next generation, and your wisdom will shape the Force itself.",
    },

    class_guidance="Choose the path that aligns with your understanding of the Force. Let it guide your spirit and purpose.",
    background_guidance="Your past shapes your destiny. The experiences you choose will define how the Force flows through you.",
    ability_guidance="Your mind and body grow stronger as your bond with the Force deepens. Let this guide your actions.",
    skill_guidance="Knowledge and skill are tools of a Jedi. Master them as you master the Force itself.",
    talent_guidance="Select talents that enhance awareness, precision, and harmony. Every choice shapes who you become.",
    language_guidance="Language bridges understanding between souls. Choose tongues that expand your connection to diverse peoples and cultures.",
    multiclass_guidance="Diversifying your skills can reveal truths hidden to the narrowly focused. Balance is key.",
    hp_guidance="Your resilience grows. The Force protects those who walk in its light and serve the galaxy with dedication.",
)

JEDI_CHARACTERISTICS = ClassCharacteristics(
    name="Jedi",
    hit_die="1d8",
    bab_progression=BABProgression.MEDIUM,
    force_sensitive=True,
    defense_bonuses={
        DefenseType.FORTITUDE: 1,
        DefenseType.REFLEX: 1,
        DefenseType.WILL: 2,
    },
    initial_training_points=6,
    starting_features=[
        "Force Sensitivity",
        "Lightsaber Training",
        "Force Connection",
        "Jedi Instincts",
    ],
    talent_trees=[
        "Guardian",
        "Consular",
        "Sentinel",
    ],
)

JEDI_SKILLS = ClassSkills(
    class_name="Jedi",
    trained_skills=[
        "Lightsaber",
        "Force",
        "Awareness",
        "Perception",
        "Acrobatics",
    ],
    general_class_skills=[
        "Knowledge (Force Lore)",
        "Knowledge (Jedi History)",
        "Knowledge (Galactic History)",
        "Sense Motive",
        "Survival",
    ],
)

JEDI_ABILITY_SYNERGIES = {
    "Wisdom": {
        "strength": 3.0,
        "reason": "Force connection and spiritual awareness",
        "notes": "Primary ability for Force powers",
    },
    "Dexterity": {
        "strength": 2.5,
        "reason": "Lightsaber combat and movement",
        "notes": "Essential for AC and combat reflexes",
    },
    "Charisma": {
        "strength": 2.0,
        "reason": "Leadership and force of will",
        "notes": "Important for group dynamics",
    },
    "Constitution": {
        "strength": 1.5,
        "reason": "Physical resilience",
        "notes": "Modest importance",
    },
    "Strength": {
        "strength": 1.5,
        "reason": "Lightsaber damage",
        "notes": "Moderate importance",
    },
    "Intelligence": {
        "strength": 1.0,
        "reason": "Knowledge skills",
        "notes": "Lower priority",
    },
}

JEDI_BACKGROUND_SYNERGIES = [
    BackgroundSynergy("Force-Sensitive Foundling", 2, 3.0, "Direct connection to your Force sensitivity"),
    BackgroundSynergy("Temple Scholar", 3, 3.0, "Strong synergy with Jedi training"),
    BackgroundSynergy("Warrior Monk", 2, 2.5, "Martial discipline combines with Force training"),
    BackgroundSynergy("Peacekeeper", 1, 2.5, "Aligns with Jedi philosophy of balance"),
]


# ==============================================================================
# CLASS 2: SCOUT
# ==============================================================================

SCOUT_MENTOR = MentorProfile(
    name="Lead",
    title="Argent Squad Commander",
    description="A hardened mercenary who compliments success but scolds carelessness",
    portrait_path="systems/foundryvtt-swse/assets/mentors/lead.webp",

    level_greetings={
        1: "You made it through your first mission. Not perfect, but you're learning. Stick with it.",
        2: "Good work out there. Keep your eyes open and your footsteps silent. That's how scouts survive.",
        3: "You're starting to move like part of the squad. Subtle, careful, but effective.",
        4: "Solid reconnaissance. Remember, information is just as deadly as a blaster.",
        5: "You handled that extraction well. Quiet, precise, and thorough. Keep this up.",
        6: "You're showing real promise. I'd recommend looking into the Pathfinder specialization. It's a hard path, but it will teach you to think and move like I do.",
        7: "Your stealth is improving. Don't forget: patience and observation win more battles than brute force.",
        8: "That last op went almost unnoticed. You're starting to anticipate threats before they appear. Good instincts.",
        9: "You've been pushing yourself in the field, and it shows. Keep honing your senses, and your team will trust you with any mission.",
        10: "You're performing like a seasoned scout. Take note of what works, and discard what doesn't.",
        11: "I've seen scouts who've been at this for decades. You're in that league now—don't waste the advantage.",
        12: "Flawless recon. Remember, the difference between survival and failure is often a single choice.",
        13: "Your reports are sharp and actionable. Lead Argent Squad depends on scouts who can think ahead like you.",
        14: "I've watched you grow. You're learning to read situations before they happen. That's rare.",
        15: "Field work is dangerous, but you move with confidence now. That confidence is your weapon.",
        16: "You're blending observation and action like a true scout. Take pride, but never get careless.",
        17: "Few scouts can operate this effectively under pressure. You're proving that you belong here.",
        18: "You could mentor new recruits with the experience you've gained. Keep pushing yourself further.",
        19: "Every mission completed adds to your reputation. Use that knowledge wisely—it will save lives.",
        20: "You've become one of the best scouts I've worked with. Keep your humility and your edge sharp, and you'll stay that way.",
    },

    class_guidance="Choose your focus carefully. The right specialization can make the difference between life and death in the field.",
    background_guidance="Every scout's past carries lessons. Choose experiences that honed your abilities and sharpened your instincts.",
    ability_guidance="Your speed, reflexes, and judgment are improving. Keep refining them—they're your greatest tools.",
    skill_guidance="Knowledge of terrain, enemy behavior, and subtle signals is just as important as any weapon. Master them.",
    talent_guidance="Every talent should enhance your awareness and survival. Pick what keeps you ahead of danger.",
    language_guidance="Learn the languages of the peoples you operate among. Intelligence gathering starts with understanding what others say.",
    multiclass_guidance="Awe was I too hard on you? Fine, just don't come crawling back when you miss me.",
    hp_guidance="Stay durable. You can't provide intelligence if you're out of the fight.",
)

SCOUT_CHARACTERISTICS = ClassCharacteristics(
    name="Scout",
    hit_die="1d8",
    bab_progression=BABProgression.MEDIUM,
    force_sensitive=False,
    defense_bonuses={
        DefenseType.FORTITUDE: 1,
        DefenseType.REFLEX: 2,
        DefenseType.WILL: 1,
    },
    initial_training_points=8,
    starting_features=[
        "Evasion",
        "Sneak Attack +1d6",
        "Scout's Expertise",
        "Tactical Assessment",
    ],
    talent_trees=[
        "Scout",
        "Pathfinder",
        "Ranger",
    ],
)

SCOUT_SKILLS = ClassSkills(
    class_name="Scout",
    trained_skills=[
        "Stealth",
        "Survival",
        "Perception",
        "Acrobatics",
        "Knowledge",
    ],
    general_class_skills=[
        "Climb",
        "Swim",
        "Profession (Soldier)",
        "Use Rope",
        "Balance",
    ],
)

SCOUT_ABILITY_SYNERGIES = {
    "Dexterity": {
        "strength": 3.0,
        "reason": "Core ability for stealth and combat",
        "notes": "Primary ability for AC and Reflex saves",
    },
    "Wisdom": {
        "strength": 2.5,
        "reason": "Perception and survival instincts",
        "notes": "Essential for spotting threats",
    },
    "Constitution": {
        "strength": 2.0,
        "reason": "Endurance and toughness",
        "notes": "Important for survivability in field",
    },
    "Intelligence": {
        "strength": 1.5,
        "reason": "Tactical analysis and knowledge",
        "notes": "Moderate importance",
    },
    "Strength": {
        "strength": 1.5,
        "reason": "Climbing and athletic maneuvers",
        "notes": "Moderate importance",
    },
    "Charisma": {
        "strength": 1.0,
        "reason": "Social interaction",
        "notes": "Lower priority",
    },
}

SCOUT_BACKGROUND_SYNERGIES = [
    BackgroundSynergy("Military Tracker", 3, 3.0, "Perfect blend of military and tracking skills"),
    BackgroundSynergy("Wilderness Survivor", 4, 3.0, "Survival expertise is core to scouting"),
    BackgroundSynergy("Spy Network", 2, 2.5, "Espionage skills complement reconnaissance"),
    BackgroundSynergy("Bounty Hunter", 2, 2.5, "Tracking and pursuit expertise"),
]


# ==============================================================================
# CLASS 3: SCOUNDREL
# ==============================================================================

SCOUNDREL_MENTOR = MentorProfile(
    name="Ol' Salty",
    title="Space Pirate Captain",
    description="A colorful space pirate with a flair for adventure",
    portrait_path="systems/foundryvtt-swse/assets/mentors/salty.webp",

    level_greetings={
        1: "Arr! Ye survived yer first scrap with the law! Welcome aboard me ship, ye scurvy spacer!",
        2: "Har har! Look at ye, already gettin' the hang of this. Ye might even live through the next spice run!",
        3: "Shiver me hyperdrives! Not a scratch on ye yet. Impressive for a greenhorn, ye rascal!",
        4: "Blimey! Ye're navigatin' the stars like a proper space-dog now. Don't get cocky, though.",
        5: "Arr! Ye're makin' a name fer yerself, plunderin' and swindlin' like a true scoundrel!",
        6: "By the Twin Suns o' Tatooine! Ye're makin' mischief in half the sector already. Keep yer wits sharp, matey!",
        7: "Har! Ye've likely swindled half a dozen systems by now. I'm almost proud… almost!",
        8: "Pieces o' eight, err… credits! Ye be worth yer weight in loot now, savvy?",
        9: "Arrr! The Imps are whisperin' yer name already. Keep blastin' and lootin' before they catch ye!",
        10: "Blow me to the Outer Rim! Ye've earned the right to call yerself a proper space pirate. Don't let it go to yer head.",
        11: "The galaxy's watchin' now, mate. Keep this up and every cantina will be singin' shanties about ye.",
        12: "Ye're navigatin' chaos like the Millennium Falcon through an asteroid field. Smooth sailin', kid.",
        13: "Thirteen! Lucky for us, unlucky for anyone crossin' yer path. Har har!",
        14: "Could retire rich on some backwater moon, but where's the fun in that? Ye got the stars to terrorize!",
        15: "Everyone from here to Nal Hutta knows yer name. Keep makin' trouble, ye rapscallion!",
        16: "Sweet Spice o' Kessel! Ye're a terror on the spaceways, and I'm not even exaggeratin'!",
        17: "Seventeen systems can't hold ye. Slipperier than a greased Hutt, har har!",
        18: "At this rate, ye'll have yer own fleet before breakfast. Keep it up, captain!",
        19: "Chaos follows ye like a loyal pet. One more push and ye'll be legend.",
        20: "Arr! Ye've done it! The greatest scoundrel in the galaxy, hands down. Now, let's find some Corellian ale to celebrate!",
    },

    class_guidance="Arr! Pick yer path wisely, matey! The right tricks make the difference between a chest o' credits and a long swim in the void.",
    background_guidance="Ev'ry scoundrel's got a tale! Pick the past that made ye cunning, bold, and ready fer adventure on the high spacelanes!",
    ability_guidance="Gotta be strong to haul the loot, quick to dodge the blasters, and clever to stay outta trouble. Balance, savvy?",
    skill_guidance="Skills open every vault and shut every trap. Learn 'em all, ye clever rascal.",
    talent_guidance="Every talent's a tool in yer scoundrel's kit. Pick what helps ye swindle, sneak, and survive—preferably all three.",
    language_guidance="Arr! Speak the tongues of the spacelanes, matey! Helps ye swindle better when ye know what folks be sayin' behind yer back!",
    multiclass_guidance="Expandin' yer horizons, eh? Smart. A pirate wears many hats… and steals most of 'em too.",
    hp_guidance="Tougher than durasteel, ye are. Can't spend yer loot if ye're dead, har har!",
)

SCOUNDREL_CHARACTERISTICS = ClassCharacteristics(
    name="Scoundrel",
    hit_die="1d8",
    bab_progression=BABProgression.MEDIUM,
    force_sensitive=False,
    defense_bonuses={
        DefenseType.FORTITUDE: 0,
        DefenseType.REFLEX: 2,
        DefenseType.WILL: 0,
    },
    initial_training_points=8,
    starting_features=[
        "Sneak Attack +1d6",
        "Cunning Trick",
        "Scoundrel's Luck",
        "Quick Fingers",
    ],
    talent_trees=[
        "Thief",
        "Smuggler",
        "Con Artist",
    ],
)

SCOUNDREL_SKILLS = ClassSkills(
    class_name="Scoundrel",
    trained_skills=[
        "Deception",
        "Stealth",
        "Sleight of Hand",
        "Perception",
        "Persuasion",
    ],
    general_class_skills=[
        "Bluff",
        "Disable Device",
        "Escape Artist",
        "Open Lock",
        "Pickpocket",
    ],
)

SCOUNDREL_ABILITY_SYNERGIES = {
    "Dexterity": {
        "strength": 3.0,
        "reason": "Stealth, finesse, and quick reflexes",
        "notes": "Primary ability for AC and combat",
    },
    "Charisma": {
        "strength": 2.5,
        "reason": "Deception, persuasion, and charm",
        "notes": "Essential for social manipulation",
    },
    "Intelligence": {
        "strength": 2.0,
        "reason": "Problem solving and planning",
        "notes": "Important for scheming",
    },
    "Wisdom": {
        "strength": 1.5,
        "reason": "Reading people and situations",
        "notes": "Moderate importance",
    },
    "Constitution": {
        "strength": 1.5,
        "reason": "Endurance and survivability",
        "notes": "Moderate importance",
    },
    "Strength": {
        "strength": 1.0,
        "reason": "Physical prowess",
        "notes": "Lower priority",
    },
}

SCOUNDREL_BACKGROUND_SYNERGIES = [
    BackgroundSynergy("Criminal Underworld", 4, 3.0, "Perfect fit for scoundrel lifestyle"),
    BackgroundSynergy("Street Orphan", 3, 3.0, "Hard-scrabble background builds cunning"),
    BackgroundSynergy("Merchant Trader", 2, 2.5, "Trading skills complement scoundrel arts"),
    BackgroundSynergy("Escaped Slave", 2, 2.5, "Survival instinct and cunning born from oppression"),
]


# ==============================================================================
# COMPARISON UTILITIES
# ==============================================================================

class ClassComparison:
    """Utility class for comparing class characteristics"""

    @staticmethod
    def compare_bab_progression(level: int) -> Dict[str, float]:
        """Compare BAB at a specific level across classes"""
        return {
            "Jedi": JEDI_CHARACTERISTICS.get_bab_at_level(level),
            "Scout": SCOUT_CHARACTERISTICS.get_bab_at_level(level),
            "Scoundrel": SCOUNDREL_CHARACTERISTICS.get_bab_at_level(level),
        }

    @staticmethod
    def get_primary_abilities() -> Dict[str, str]:
        """Get primary ability for each class"""
        return {
            "Jedi": "Wisdom (Force Connection)",
            "Scout": "Dexterity (Agility & Reflexes)",
            "Scoundrel": "Dexterity (Finesse & Agility)",
        }

    @staticmethod
    def get_defense_summary() -> Dict[str, Dict]:
        """Get defense bonus summary for all classes"""
        return {
            "Jedi": JEDI_CHARACTERISTICS.defense_bonuses,
            "Scout": SCOUT_CHARACTERISTICS.defense_bonuses,
            "Scoundrel": SCOUNDREL_CHARACTERISTICS.defense_bonuses,
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
    print("║" + " "*15 + "SWSE CLASS DATABASE - PART 1 OF 4" + " "*20 + "║")
    print("║" + " "*10 + "Comprehensive data for Jedi, Scout, and Scoundrel" + " "*10 + "║")
    print("╚" + "═"*68 + "╝")

    # Display mentor profiles
    print("\n\n" + "="*70)
    print("MENTOR PROFILES")
    print("="*70)

    print_mentor_profile(JEDI_MENTOR)
    print_mentor_profile(SCOUT_MENTOR)
    print_mentor_profile(SCOUNDREL_MENTOR)

    # Display class characteristics
    print("\n\n" + "="*70)
    print("CLASS CHARACTERISTICS")
    print("="*70)

    for cls in [JEDI_CHARACTERISTICS, SCOUT_CHARACTERISTICS, SCOUNDREL_CHARACTERISTICS]:
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

    for skills_obj in [JEDI_SKILLS, SCOUT_SKILLS, SCOUNDREL_SKILLS]:
        print(f"\n{skills_obj.class_name.upper()}")
        print(f"  Trained Skills: {', '.join(skills_obj.trained_skills)}")
        print(f"  General Skills: {', '.join(skills_obj.general_class_skills)}")

    # Display ability synergies
    print("\n\n" + "="*70)
    print("ABILITY SYNERGIES")
    print("="*70)

    synergies = {
        "Jedi": JEDI_ABILITY_SYNERGIES,
        "Scout": SCOUT_ABILITY_SYNERGIES,
        "Scoundrel": SCOUNDREL_ABILITY_SYNERGIES,
    }

    for class_name, abilities in synergies.items():
        print(f"\n{class_name.upper()}")
        sorted_abilities = sorted(abilities.items(), key=lambda x: x[1]['strength'], reverse=True)
        for ability, data in sorted_abilities:
            strength_bar = "★" * int(data['strength']) + "☆" * (3 - int(data['strength']))
            print(f"  {ability:<12} {strength_bar} - {data['reason']}")
            print(f"    └─ {data['notes']}")

    # Display BAB progression
    print("\n\n" + "="*70)
    print("BASE ATTACK BONUS PROGRESSION")
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
        "Jedi": JEDI_BACKGROUND_SYNERGIES,
        "Scout": SCOUT_BACKGROUND_SYNERGIES,
        "Scoundrel": SCOUNDREL_BACKGROUND_SYNERGIES,
    }

    for class_name, bg_synergies in all_synergies.items():
        print(f"\n{class_name.upper()}")
        for synergy in bg_synergies:
            stars = "★" * int(synergy.tier) + "☆" * (3 - int(synergy.tier))
            print(f"  {synergy.background_name:<30} {stars}")
            print(f"    └─ {synergy.reason}")

    # Print summary
    print("\n\n" + "="*70)
    print("QUICK REFERENCE")
    print("="*70)

    print("\nPrimary Abilities by Class:")
    for class_name, ability in ClassComparison.get_primary_abilities().items():
        print(f"  {class_name:<15} {ability}")

    print("\n" + "="*70)
    print("END OF PART 1")
    print("="*70)
    print("\nRemaining classes to be covered in subsequent scripts:")
    print("  • Part 2: Noble & Soldier")
    print("  • Part 3: Prestige Classes")
    print("  • Part 4: Advanced Analysis & Tools")
    print("\n")
