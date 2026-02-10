#!/usr/bin/env python3
"""
Normalize beasts.db fields to match the nonheroic.db structure.

Beasts won't have classes/equipment/items, but the system fields
should follow the same schema so they can be read the same way.
"""

import json
import re
import sys
import os

INPUT = os.path.join(os.path.dirname(__file__), '..', '..', 'packs', 'beasts.db')
OUTPUT = INPUT  # overwrite in place

DEFAULT_SKILLS = {
    "acrobatics":              {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "dex", "favorite": False},
    "climb":                   {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "str", "favorite": False},
    "deception":               {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "cha", "favorite": False},
    "endurance":               {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "con", "favorite": False},
    "gatherInformation":       {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "cha", "favorite": False},
    "initiative":              {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "dex", "favorite": False},
    "jump":                    {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "str", "favorite": False},
    "knowledgeBureaucracy":    {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgeGalacticLore":   {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgeLifeSciences":   {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgePhysicalSciences":{"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgeSocialSciences": {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgeTactics":        {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "knowledgeTechnology":     {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "mechanics":               {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "perception":              {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "wis", "favorite": False},
    "persuasion":              {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "cha", "favorite": False},
    "pilot":                   {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "dex", "favorite": False},
    "ride":                    {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "dex", "favorite": False},
    "stealth":                 {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "dex", "favorite": False},
    "survival":                {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "wis", "favorite": False},
    "swim":                    {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "str", "favorite": False},
    "treatInjury":             {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "wis", "favorite": False},
    "useComputer":             {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "int", "favorite": False},
    "useTheForce":             {"trained": False, "focused": False, "miscMod": 0, "selectedAbility": "cha", "favorite": False},
}

# Map beastData skill names (lowercase) to system skill keys
SKILL_NAME_MAP = {
    "acrobatics": "acrobatics",
    "climb": "climb",
    "deception": "deception",
    "endurance": "endurance",
    "gather information": "gatherInformation",
    "initiative": "initiative",
    "jump": "jump",
    "knowledge (bureaucracy)": "knowledgeBureaucracy",
    "knowledge (galactic lore)": "knowledgeGalacticLore",
    "knowledge (life sciences)": "knowledgeLifeSciences",
    "knowledge (physical sciences)": "knowledgePhysicalSciences",
    "knowledge (social sciences)": "knowledgeSocialSciences",
    "knowledge (tactics)": "knowledgeTactics",
    "knowledge (technology)": "knowledgeTechnology",
    "mechanics": "mechanics",
    "perception": "perception",
    "persuasion": "persuasion",
    "pilot": "pilot",
    "ride": "ride",
    "stealth": "stealth",
    "survival": "survival",
    "swim": "swim",
    "treat injury": "treatInjury",
    "use computer": "useComputer",
    "use the force": "useTheForce",
}


def parse_speed(speed_str):
    """Extract the first numeric speed value from a beast speed string."""
    if not speed_str:
        return 6
    m = re.search(r'(\d+)', str(speed_str))
    return int(m.group(1)) if m else 6


def parse_skills(skill_list):
    """
    Parse beastData skills list (e.g. ['Perception\xa0+9', 'Stealth\xa0+16'])
    into the normalized skills dict, marking parsed skills as trained.
    """
    import copy
    skills = copy.deepcopy(DEFAULT_SKILLS)

    if not skill_list:
        return skills

    for entry in skill_list:
        # Normalize non-breaking spaces and whitespace
        entry = entry.replace('\xa0', ' ').strip()
        # Split on comma to handle combined entries like "Initiative +10, Perception +7"
        parts = re.split(r',\s*', entry)
        for part in parts:
            part = part.strip()
            # Match "SkillName +N" or "SkillName -N" possibly with extra text
            m = re.match(r'^([A-Za-z ()]+?)\s*([+-]\d+)', part)
            if m:
                name = m.group(1).strip().lower()
                key = SKILL_NAME_MAP.get(name)
                if key and key in skills:
                    skills[key]["trained"] = True

    return skills


def normalize_beast(entry):
    """Normalize a single beast entry to match nonheroic schema."""
    bd = entry.get("flags", {}).get("swse", {}).get("beastData", {})
    sys = entry.get("system", {})

    # Build the normalized defenses to match nonheroic (reflex, not ref)
    old_def = sys.get("defenses", {})
    defenses = {
        "reflex": {
            "total": bd.get("reflexDefense", old_def.get("ref", {}).get("total", 10)),
            "armor": 0,
            "classBonus": 0,
            "misc": {"auto": {}, "user": {}},
            "ability": "dex",
            "source": "level",
            "level": 0,
        },
        "fort": {
            "total": bd.get("fortitudeDefense", old_def.get("fort", {}).get("total", 10)),
            "classBonus": 0,
            "misc": {"auto": {}, "user": {}},
            "ability": "con",
            "level": 0,
        },
        "will": {
            "total": bd.get("willDefense", old_def.get("will", {}).get("total", 10)),
            "classBonus": 0,
            "misc": {"auto": {}, "user": {}},
            "ability": "wis",
            "level": 0,
        },
        "flatFooted": {
            "total": bd.get("flatFootedDefense", old_def.get("flatFooted", {}).get("total", 10)),
        },
    }

    # Parse speed from beastData string
    speed = parse_speed(bd.get("speed"))

    # Level = CL from beastData (or beastLevel if present, else existing)
    level = bd.get("cl", sys.get("level", 1))

    # Damage threshold from beastData
    dt = bd.get("damageThreshold", 0)
    if dt is None:
        dt = 0

    # BAB from beastData
    bab = bd.get("baseAttackBonus", 0)

    # Parse skills
    skills = parse_skills(bd.get("skills"))

    # Build normalized system object matching nonheroic schema
    new_system = {
        "isDroid": False,
        "droidDegree": "",
        "attributes": sys.get("attributes", {}),
        "skills": skills,
        "hp": sys.get("hp", {"value": 0, "max": 0, "temp": 0, "bonus": 0}),
        "conditionTrack": {"current": 0, "persistent": False, "penalty": 0},
        "level": level,
        "size": sys.get("size", bd.get("size", "medium")),
        "speed": speed,
        "defenses": defenses,
        "languages": [],
        "destinyPoints": {"value": 0, "max": 0},
        "forcePoints": {"value": 0, "max": 0, "die": "1d6"},
        "darkSideScore": 0,
        "damageThreshold": dt,
        "bab": bab,
        "race": "",
        "class": "",
        "className": "",
        "biography": sys.get("biography", bd.get("abilityText", "")),
        "derived": {},
    }

    entry["system"] = new_system

    # Ensure top-level keys match nonheroic
    if "items" not in entry:
        entry["items"] = []
    if "effects" not in entry:
        entry["effects"] = []

    # Remove keys that nonheroic doesn't have at top level
    for key in ["folder", "sort", "ownership"]:
        entry.pop(key, None)

    return entry


def main():
    entries = []
    with open(INPUT, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    print(f"Read {len(entries)} beast entries")

    normalized = []
    for e in entries:
        normalized.append(normalize_beast(e))

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        for e in normalized:
            f.write(json.dumps(e, ensure_ascii=False, separators=(',', ':')) + '\n')

    print(f"Wrote {len(normalized)} normalized beast entries to {OUTPUT}")


if __name__ == '__main__':
    main()
