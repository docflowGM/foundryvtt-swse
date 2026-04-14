#!/usr/bin/env python3
"""
Populate Extra Skill Uses Compendium

This script reads extraskilluses.json and populates the packs/extraskilluses.db
NDJSON database with extra-skill-use items.

Every generated entry has an explicit system.skill field for authoritative routing.
The registry uses system.skill first, only falling back to fuzzy matching for
legacy entries that do not have this field.

Usage:
    python3 scripts/build/populate-extra-skill-uses.py
"""

import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

def generate_id():
    """Generate a Foundry-compatible ID (16 characters, hex)"""
    return uuid.uuid4().hex[:16]

def slugify(text):
    """Create a slug from text"""
    if not text:
        return ''
    return text.lower().replace(' ', '-').replace("'", '').replace('"', '')

def extract_skill_key(application_name):
    """
    Extract the skill key from the application name.
    Returns canonical skill key (e.g., 'useTheForce', 'climb', 'perception').
    """
    if not application_name:
        return None

    app_lower = application_name.lower()

    # Use the Force applications - check for UTF indicator
    utf_applications = [
        'force trance',
        'move light object',
        'search your feelings',
        'sense force',
        'sense surroundings',
        'telepathy',
        'breath control',
        'place other in force trance'
    ]

    for utf_app in utf_applications:
        if utf_app in app_lower:
            return 'useTheForce'

    # Map other skill use applications to their skill keys
    skill_map = {
        'climb': 'climb',
        'handholds': 'climb',
        'footholds': 'climb',
        'rope': 'climb',
        'surface': 'climb',
        'rock': 'climb',
        'tree': 'climb',
        'falling': 'climb',
        'feint': 'deception',
        'deceptive': 'deception',
        'alternate story': 'deception',
        'cheat': 'deception',
        'innuendo': 'deception',
        'gather information': 'gatherInformation',
        'analysis': 'gatherInformation',
        'black market': 'gatherInformation',
        'intel': 'gatherInformation',
        'quick intel': 'gatherInformation',
        'knowledge': 'knowledge',
        'identify': 'knowledge',
        'jump': 'jump',
        'disable device': 'mechanics',
        'jury-rig': 'mechanics',
        'recharge shields': 'mechanics',
        'repair': 'mechanics',
        'modify droid': 'mechanics',
        'reprogram': 'mechanics',
        'regulate power': 'mechanics',
        'refit': 'mechanics',
        'improve access': 'mechanics',
        'tampering': 'mechanics',
        'shut down': 'mechanics',
        'persuasion': 'persuasion',
        'haggle': 'persuasion',
        'bribery': 'persuasion',
        'intimidate': 'persuasion',
        'pilot': 'pilot',
        'increase vehicle speed': 'pilot',
        'avoid collision': 'pilot',
        'dogfight': 'pilot',
        'sneak': 'stealth',
        'conceal': 'stealth',
        'hide': 'stealth',
        'pick pocket': 'stealth',
        'snipe': 'stealth',
        'sleight': 'stealth',
        'drop': 'stealth',
        'defensive': 'stealth',
        'survival': 'survival',
        'track': 'survival',
        'first aid': 'treatInjury',
        'revivify': 'treatInjury',
        'heal damage': 'treatInjury',
        'long-term care': 'treatInjury',
        'surgery': 'treatInjury',
        'critical care': 'treatInjury',
        'perform surgery': 'treatInjury',
        'access information': 'useComputer',
        'backtrail': 'useComputer',
        'astrogate': 'useComputer',
        'disable': 'useComputer',
        'erase program': 'useComputer',
        'acrobatics': 'acrobatics',
        'balance': 'acrobatics',
        'tumble': 'acrobatics',
        'escape': 'acrobatics',
        'fall': 'acrobatics',
        'prone': 'acrobatics',
        'catch': 'acrobatics',
        'gravity': 'acrobatics',
        'nimble': 'acrobatics',
        'endurance': 'endurance',
        'forced march': 'endurance',
        'hold breath': 'endurance',
        'ignore hunger': 'endurance',
        'ignore thirst': 'endurance',
        'run': 'endurance',
        'sleep': 'endurance',
        'extreme temperatures': 'endurance',
        'initiative': 'initiative',
        'start battle': 'initiative',
        'perception': 'perception',
        'eavesdrop': 'perception',
        'listen': 'perception',
        'notice': 'perception',
        'search': 'perception',
        'sense deception': 'perception',
        'sense influence': 'perception',
        'avoid surprise': 'perception',
        'spotter': 'perception',
        'ride': 'ride',
        'swim': 'swim',
        'terrain': 'survival'
    }

    # Find matching skill (order matters - longer phrases first)
    for key in sorted(skill_map.keys(), key=len, reverse=True):
        if key in app_lower:
            return skill_map[key]

    return None

def extract_trained_only(application_name, effect_text=""):
    """Check if the skill use requires training"""
    if not application_name:
        return False
    check_text = application_name.lower() + " " + str(effect_text).lower()
    return "(trained)" in check_text or "trained only" in check_text

def extract_requires_force_sensitivity(skill_key):
    """Check if this skill use requires Force Sensitivity"""
    return skill_key == 'useTheForce'

def get_skill_label(skill_key):
    """Get human-readable label for a skill key"""
    labels = {
        'acrobatics': 'Acrobatics',
        'climb': 'Climb',
        'deception': 'Deception',
        'endurance': 'Endurance',
        'gatherInformation': 'Gather Information',
        'initiative': 'Initiative',
        'jump': 'Jump',
        'knowledge': 'Knowledge',
        'knowledgeGalacticLore': 'Knowledge (Galactic Lore)',
        'knowledgeLifeSciences': 'Knowledge (Life Sciences)',
        'knowledgePhysicalSciences': 'Knowledge (Physical Sciences)',
        'knowledgeSocialSciences': 'Knowledge (Social Sciences)',
        'knowledgeTactics': 'Knowledge (Tactics)',
        'knowledgeTechnology': 'Knowledge (Technology)',
        'mechanics': 'Mechanics',
        'perception': 'Perception',
        'persuasion': 'Persuasion',
        'pilot': 'Pilot',
        'ride': 'Ride',
        'stealth': 'Stealth',
        'survival': 'Survival',
        'swim': 'Swim',
        'treatInjury': 'Treat Injury',
        'useComputer': 'Use Computer',
        'useTheForce': 'Use the Force'
    }
    return labels.get(skill_key, skill_key)

def populate_extra_skill_uses():
    """Main function to populate the compendium"""
    script_dir = Path(__file__).parent.parent.parent

    # Data path
    json_path = script_dir / 'data' / 'extraskilluses.json'

    # DB path
    db_path = script_dir / 'packs' / 'extraskilluses.db'

    # Load JSON data
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Loaded {len(data)} extra skill uses from JSON")
    except FileNotFoundError:
        print(f"Error: Could not find {json_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {json_path}: {e}")
        sys.exit(1)

    # Process entries
    print(f"\n=== Populating {db_path.name} (extra skill uses) ===")

    imported = 0
    errors = 0
    missing_skill = 0
    entries = []

    for index, use_data in enumerate(data):
        try:
            # Generate ID
            item_id = generate_id()

            # Extract skill key (authoritative routing field)
            skill_key = extract_skill_key(use_data.get('application', ''))
            if not skill_key:
                print(f"  Warning: Could not determine skill for \"{use_data.get('application', 'UNKNOWN')}\"")
                missing_skill += 1
                continue

            # Build system object with explicit skill field
            system = {
                # Routing - AUTHORITATIVE
                'skill': skill_key,
                'skillLabel': get_skill_label(skill_key),
                'application': use_data.get('application', ''),

                # Access constraints
                'trainedOnly': extract_trained_only(use_data.get('application', ''), use_data.get('effect', '')),
                'requiresForceSensitivity': extract_requires_force_sensitivity(skill_key),

                # Action economy
                'actionType': 'standard',  # Default action type
                'actionTypeRaw': use_data.get('time', 'standard').lower(),

                # Rules mechanics
                'dc': use_data.get('DC') or use_data.get('dc') or use_data.get('DC') or None,
                'target': use_data.get('target', ''),
                'effect': use_data.get('effect', ''),
                'description': use_data.get('description', use_data.get('effect', '')),
                'special': use_data.get('special', ''),

                # Metadata
                'category': 'skill-use',
                'tags': [skill_key],
                'sourcebook': use_data.get('sourcebook', 'Saga Edition'),
                'page': use_data.get('page') or None
            }

            # Normalize DC value (handle string/number variants)
            if isinstance(system['dc'], str):
                # Try to extract numeric value if present
                import re
                match = re.search(r'\d+', system['dc'])
                if match:
                    try:
                        system['dc'] = int(match.group(0))
                    except (ValueError, AttributeError):
                        system['dc'] = None
                else:
                    system['dc'] = None

            # Build document
            now = datetime.utcnow().isoformat() + 'Z'
            stats = {
                'created': now,
                'modified': now,
                'lastModifiedBy': None
            }

            ownership = {'default': 0}

            # Build complete document shape
            doc = {
                '_id': item_id,
                'name': use_data.get('application', f'Extra Skill Use {index}'),
                'type': 'extra-skill-use',
                'img': 'icons/svg/skill.svg',
                'system': system,
                'effects': [],
                'folder': None,
                'sort': index,
                'ownership': ownership,
                'flags': {},
                '_stats': stats
            }

            entries.append(doc)
            imported += 1

            if imported % 10 == 0:
                print(f"  Progress: {imported} imported")

        except Exception as e:
            print(f"  Error importing \"{use_data.get('application', 'UNKNOWN')}\": {e}")
            errors += 1

    # Write NDJSON to file
    try:
        with open(db_path, 'w', encoding='utf-8') as f:
            for entry in entries:
                f.write(json.dumps(entry) + '\n')
        print(f"\n  Imported: {imported}")
        print(f"  Warnings (missing skill): {missing_skill}")
        print(f"  Errors: {errors}")
        print(f"  Database: {db_path}")
    except Exception as e:
        print(f"Error: Could not write to database {db_path}: {e}")
        sys.exit(1)

    print(f"\n=== Import Complete ===")

if __name__ == '__main__':
    populate_extra_skill_uses()
