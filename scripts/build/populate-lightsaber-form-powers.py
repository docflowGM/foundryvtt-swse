#!/usr/bin/env python3
"""
Populate Lightsaber Form Powers Compendium

This script reads lightsaber-form-powers.json and populates the
packs/lightsaberformpowers.db SQLite database with forcepower items.

Lightsaber form powers are modeled as bonus riders on base forcepower mechanics.
The bonusTalent field indicates which talent enhances the power (bonus metadata, NOT prerequisite).

Usage:
    python3 scripts/build/populate-lightsaber-form-powers.py
"""

import json
import sqlite3
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

def generate_id():
    """Generate a Foundry-compatible ID (16 characters, hex)"""
    return uuid.uuid4().hex[:16]

def extract_bonus_talent(form_bonus_text):
    """Extract talent name from formBonus text like 'Lightsaber Form (Juyo): ...'"""
    if not form_bonus_text:
        return ''
    # Look for pattern: Lightsaber Form (TalentName):
    import re
    match = re.search(r'Lightsaber Form \(([^)]+)\)', form_bonus_text)
    if match:
        return match.group(1)
    return ''

def extract_trigger(form_bonus_text):
    """
    Extract trigger condition if present and cleanly separable.

    Examples:
    - "If you have X Talent and miss with both attack rolls, ..." -> "Miss with both attack rolls"
    - "If you have X Talent, " -> "" (no cleanly separable trigger)
    """
    if not form_bonus_text:
        return ''

    import re
    # Look for pattern: "If you have the X Talent and [trigger condition], [effect]"
    match = re.search(r'If you have the [^T]+ Talent and ([^,]+),', form_bonus_text)
    if match:
        trigger = match.group(1).strip()
        # Clean up common patterns
        if trigger.startswith('you '):
            trigger = trigger[4:]  # Remove leading "you "
        # Capitalize first letter
        trigger = trigger[0].upper() + trigger[1:] if trigger else ''
        return trigger

    # Don't extract trigger if there's no clear "and" separator
    return ''

def populate_lightsaber_form_powers():
    """Main function to populate the compendium"""
    script_dir = Path(__file__).parent.parent.parent
    json_path = script_dir / 'data' / 'lightsaber-form-powers.json'
    db_path = script_dir / 'packs' / 'lightsaberformpowers.db'

    # Read JSON data
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            powers = data['powers']
        print(f"Loaded {len(powers)} lightsaber form powers from JSON")
    except FileNotFoundError:
        print(f"Error: Could not find {json_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {json_path}: {e}")
        sys.exit(1)

    # Open database
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"Error: Could not open database {db_path}: {e}")
        sys.exit(1)

    # Create table if it doesn't exist
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                _id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                img TEXT,
                system TEXT,
                effects TEXT,
                folder TEXT,
                sort INTEGER DEFAULT 0,
                ownership TEXT,
                flags TEXT,
                _stats TEXT
            )
        ''')
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error: Could not create table: {e}")
        conn.close()
        sys.exit(1)

    imported = 0
    skipped = 0
    errors = 0

    for power_data in powers:
        try:
            # Check if already exists
            cursor.execute('SELECT _id FROM items WHERE name = ?', (power_data['name'],))
            existing = cursor.fetchone()
            if existing:
                print(f"Skipping \"{power_data['name']}\" - already exists")
                skipped += 1
                continue

            # Generate ID
            item_id = generate_id()

            # Build description - preserve both description and effect if both exist
            full_description = ''
            if power_data.get('description'):
                full_description += power_data['description']
            if power_data.get('effect'):
                if full_description:
                    full_description += '\n\n'
                full_description += power_data['effect']

            # Preserve discipline exactly as in source (e.g., "Form VII: Juyo")
            discipline = power_data.get('discipline', 'telekinetic')

            # Determine useTheForce DC from lowest DC in chart
            use_the_force = 15
            if power_data.get('dcChart'):
                dcs = sorted([item['dc'] for item in power_data['dcChart']])
                if dcs:
                    use_the_force = dcs[0]

            # Extract bonus talent and trigger from formBonus text
            form_bonus_text = power_data.get('formBonus', '')
            bonus_talent = extract_bonus_talent(form_bonus_text)
            extracted_trigger = extract_trigger(form_bonus_text)

            # Use source trigger if available, otherwise use extracted trigger
            trigger = power_data.get('trigger', '') or extracted_trigger

            # Build system object - match the exact schema
            system = {
                # Existing forcepower core
                'powerLevel': 1,
                'discipline': discipline,
                'useTheForce': use_the_force,
                'time': power_data.get('time', 'Standard Action'),
                'range': power_data.get('range', 'Personal'),
                'target': power_data.get('target', 'One target'),
                'duration': power_data.get('duration', 'Instantaneous'),
                'effect': full_description,
                'special': power_data.get('special', ''),
                'descriptor': [],
                'dcChart': [
                    {
                        'dc': item['dc'],
                        'effect': item['effect'],
                        'description': item.get('description', '')
                    }
                    for item in power_data.get('dcChart', [])
                ],
                'maintainable': False,
                'forcePointEffect': power_data.get('forcePointEffect', ''),
                'forcePointCost': power_data.get('forcePointCost', 0),
                'sourcebook': power_data.get('source', 'Jedi Academy Training Manual'),
                'page': power_data.get('page', None),
                'tags': power_data.get('tags', ['lightsaber-form']),
                'inSuite': False,
                'spent': False,
                'uses': {
                    'current': 0,
                    'max': 0
                },
                # Live forcepower document conventions
                'executionModel': 'FORCE_POWER',
                'costNumeric': None,
                # Lightsaber form power extensions (bonus rider relationship, NOT prerequisites)
                'form': power_data.get('form', ''),
                'bonusTalent': bonus_talent,
                'trigger': trigger,
                'formBonus': form_bonus_text,
                'canRebuke': power_data.get('canRebuke', False)
            }

            # Build document shape
            now = datetime.utcnow().isoformat() + 'Z'
            stats = {
                'created': now,
                'modified': now,
                'lastModifiedBy': None
            }

            ownership = {'default': 0}

            # Insert into database
            cursor.execute(
                '''INSERT INTO items (_id, name, type, img, system, effects, folder, sort, ownership, flags, _stats)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    item_id,
                    power_data['name'],
                    'forcepower',
                    'icons/magic/light/orb-lightbulb-gray.webp',
                    json.dumps(system),
                    json.dumps([]),
                    None,
                    imported + skipped,
                    json.dumps(ownership),
                    json.dumps({}),
                    json.dumps(stats)
                )
            )

            imported += 1

            if imported % 10 == 0:
                print(f"Progress: {imported} imported, {skipped} skipped")

        except KeyError as e:
            print(f"Error: Missing required field {e} in power \"{power_data.get('name', 'UNKNOWN')}\"")
            errors += 1
        except Exception as e:
            print(f"Error importing \"{power_data.get('name', 'UNKNOWN')}\": {e}")
            errors += 1

    # Commit and close
    try:
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"Error: Could not finalize database: {e}")
        sys.exit(1)

    print(f"\n=== Import Complete ===")
    print(f"Imported: {imported}")
    print(f"Skipped: {skipped}")
    print(f"Errors: {errors}")
    print(f"Database: {db_path}")

if __name__ == '__main__':
    populate_lightsaber_form_powers()
