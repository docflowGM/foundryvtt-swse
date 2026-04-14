#!/usr/bin/env python3
"""
Populate Combat Action Compendiums

This script reads combat-actions.json and ship-combat-actions.json and populates
packs/combat-actions.db and packs/ship-combat-actions.db with combat-action items.

Both character and vehicle actions use the same item type: "combat-action"
They are distinguished by system.domain and system.crewPosition fields.

Usage:
    python3 scripts/build/populate-combat-actions.py
"""

import json
import sqlite3
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

def normalize_action_type(action_dict):
    """Normalize action type and cost from source data"""
    if not isinstance(action_dict, dict):
        return 'standard', '', None

    action_type_raw = action_dict.get('type', 'standard')
    cost = action_dict.get('cost', None)

    # Map to canonical values
    type_lower = action_type_raw.lower()
    if type_lower in ['free']:
        canonical = 'free'
    elif type_lower in ['swift']:
        canonical = 'swift'
    elif type_lower in ['move']:
        canonical = 'move'
    elif type_lower in ['standard']:
        canonical = 'standard'
    elif type_lower in ['full-round', 'full round']:
        canonical = 'full-round'
    elif type_lower in ['reaction']:
        canonical = 'reaction'
    elif type_lower in ['immediate']:
        canonical = 'immediate'
    elif type_lower in ['varies']:
        canonical = 'varies'
        cost = None  # varies can't have fixed cost
    else:
        # For compound/complex action types, mark as compound
        if any(word in type_lower for word in ['+', '/', 'and', 'or']):
            canonical = 'compound'
            cost = None  # compound costs are variable
        else:
            canonical = 'standard'

    return canonical, action_type_raw, cost

def populate_combat_actions():
    """Main function to populate both compendiums"""
    script_dir = Path(__file__).parent.parent.parent

    # Data paths
    ca_json_path = script_dir / 'data' / 'combat-actions.json'
    sca_json_path = script_dir / 'data' / 'ship-combat-actions.json'

    # DB paths
    ca_db_path = script_dir / 'packs' / 'combat-actions.db'
    sca_db_path = script_dir / 'packs' / 'ship-combat-actions.db'

    # Load JSON data
    try:
        with open(ca_json_path, 'r', encoding='utf-8') as f:
            ca_data = json.load(f)
        print(f"Loaded {len(ca_data)} character combat actions")
    except FileNotFoundError:
        print(f"Error: Could not find {ca_json_path}")
        sys.exit(1)

    try:
        with open(sca_json_path, 'r', encoding='utf-8') as f:
            sca_data = json.load(f)
        print(f"Loaded {len(sca_data)} ship combat actions")
    except FileNotFoundError:
        print(f"Error: Could not find {sca_json_path}")
        sys.exit(1)

    # Process both datasets
    datasets = [
        (ca_data, ca_db_path, 'character', None),
        (sca_data, sca_db_path, 'vehicle', 'crewPosition')
    ]

    for data, db_path, domain, crew_field in datasets:
        print(f"\n=== Populating {db_path.name} ({domain} actions) ===")
        populate_dataset(data, db_path, domain, crew_field)

    print(f"\n=== Import Complete ===")

def populate_dataset(data, db_path, domain, crew_field):
    """Populate a single compendium database"""

    # Open/create database
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"Error: Could not open database {db_path}: {e}")
        return

    # Create table
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
        return

    imported = 0
    errors = 0

    for index, action_data in enumerate(data):
        try:
            item_id = generate_id()

            # Normalize action economy
            canonical_type, raw_type, cost = normalize_action_type(action_data.get('action', {}))

            # Build system object
            system = {
                # Identity
                'key': slugify(action_data.get('name', '')),
                # Domain
                'domain': domain,
                'category': 'combat',
                'crewPosition': action_data.get(crew_field) if crew_field else None,
                # Action economy
                'actionType': canonical_type,
                'actionTypeRaw': raw_type,
                'cost': cost,
                # Rule text
                'summary': '',
                'notes': action_data.get('notes', ''),
                'notesAdvanced': None,
                'restriction': None,
                'requirements': [],
                'examples': [],
                # Related skills - preserve structure
                'relatedSkills': action_data.get('relatedSkills', []),
                # Resource usage
                'ammoConsumption': None,
                # Metadata
                'tags': [domain] if domain != 'character' else [],
                'sourcebook': None,
                'page': None,
                # Execution metadata
                'executable': False,
                'trigger': None,
                'toggleable': False
            }

            # Build document
            now = datetime.utcnow().isoformat() + 'Z'
            stats = {
                'created': now,
                'modified': now,
                'lastModifiedBy': None
            }

            ownership = {'default': 0}

            # Insert
            cursor.execute(
                '''INSERT INTO items (_id, name, type, img, system, effects, folder, sort, ownership, flags, _stats)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    item_id,
                    action_data.get('name', f'Action {index}'),
                    'combat-action',
                    'icons/svg/sword.svg',
                    json.dumps(system),
                    json.dumps([]),
                    None,
                    index,
                    json.dumps(ownership),
                    json.dumps({}),
                    json.dumps(stats)
                )
            )

            imported += 1

            if imported % 10 == 0:
                print(f"  Progress: {imported} imported")

        except Exception as e:
            print(f"  Error importing \"{action_data.get('name', 'UNKNOWN')}\": {e}")
            errors += 1

    # Commit and close
    try:
        conn.commit()
        conn.close()
        print(f"  Imported: {imported}, Errors: {errors}")
    except sqlite3.Error as e:
        print(f"Error: Could not finalize database: {e}")

if __name__ == '__main__':
    populate_combat_actions()
