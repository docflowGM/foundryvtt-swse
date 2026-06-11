#!/usr/bin/env python3
"""
Populate Lightsaber Form Powers Compendium

Foundry v13 uses newline-delimited JSON `.db` packs in this system. This script
reads data/lightsaber-form-powers.json and rewrites
packs/lightsaberformpowers.db as JSONL force-power documents.

Lightsaber form powers are modeled as bonus riders on base force power mechanics.
The bonusTalent field indicates which talent enhances the power, not a prerequisite.
"""

import json
import re
import uuid
from datetime import datetime
from pathlib import Path


def generate_id():
    return uuid.uuid4().hex[:16]


def extract_bonus_talent(form_bonus_text):
    if not form_bonus_text:
        return ''
    match = re.search(r'Lightsaber Form \(([^)]+)\)', str(form_bonus_text))
    return match.group(1) if match else ''


def extract_trigger(form_bonus_text):
    if not form_bonus_text:
        return ''
    match = re.search(r'If you have the [^T]+ Talent and ([^,]+),', str(form_bonus_text))
    if not match:
        return ''
    trigger = match.group(1).strip()
    if trigger.startswith('you '):
        trigger = trigger[4:]
    return trigger[:1].upper() + trigger[1:] if trigger else ''


def read_existing_ids(db_path):
    ids = {}
    if not db_path.exists():
        return ids
    if db_path.read_bytes()[:16].startswith(b'SQLite format'):
        return ids
    for line in db_path.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        try:
            doc = json.loads(line)
        except json.JSONDecodeError:
            continue
        if doc.get('name') and doc.get('_id'):
            ids[doc['name']] = doc['_id']
    return ids


def build_document(power_data, existing_ids, sort):
    full_description = ''
    if power_data.get('description'):
        full_description += power_data['description']
    if power_data.get('effect'):
        if full_description:
            full_description += '\n\n'
        full_description += power_data['effect']

    form_bonus_text = power_data.get('formBonus', '')
    bonus_talent = extract_bonus_talent(form_bonus_text)
    trigger = power_data.get('trigger', '') or extract_trigger(form_bonus_text)
    dc_values = sorted(
        item.get('dc') for item in power_data.get('dcChart', [])
        if isinstance(item.get('dc'), (int, float))
    )
    tags = list(power_data.get('tags') or ['lightsaber-form'])
    if 'lightsaber-form' not in tags:
        tags.append('lightsaber-form')
    now = datetime.utcnow().isoformat() + 'Z'

    return {
        '_id': existing_ids.get(power_data['name']) or generate_id(),
        'name': power_data['name'],
        'type': 'force-power',
        'img': 'icons/magic/light/orb-lightbulb-gray.webp',
        'system': {
            'powerLevel': 1,
            'discipline': power_data.get('discipline', 'telekinetic'),
            'useTheForce': dc_values[0] if dc_values else 15,
            'time': power_data.get('time', 'Standard Action'),
            'range': power_data.get('range', 'Personal'),
            'target': power_data.get('target', 'One target'),
            'duration': power_data.get('duration', 'Instantaneous'),
            'effect': full_description,
            'special': power_data.get('special', ''),
            'descriptor': [],
            'dcChart': [
                {
                    'dc': item.get('dc'),
                    'effect': item.get('effect'),
                    'description': item.get('description', '')
                }
                for item in power_data.get('dcChart', [])
            ],
            'maintainable': False,
            'forcePointEffect': power_data.get('forcePointEffect', ''),
            'forcePointCost': power_data.get('forcePointCost', 0),
            'sourcebook': power_data.get('source', 'Jedi Academy Training Manual'),
            'page': power_data.get('page', None),
            'tags': tags,
            'inSuite': False,
            'spent': False,
            'uses': {'current': 0, 'max': 0},
            'executionModel': 'FORCE_POWER',
            'costNumeric': None,
            'form': power_data.get('form', ''),
            'bonusTalent': bonus_talent,
            'trigger': trigger,
            'formBonus': form_bonus_text,
            'canRebuke': bool(power_data.get('canRebuke', False))
        },
        'effects': [],
        'flags': {},
        'sort': sort,
        '_stats': {
            'created': now,
            'modified': now,
            'lastModifiedBy': None
        }
    }


def populate_lightsaber_form_powers():
    project_root = Path(__file__).resolve().parents[2]
    json_path = project_root / 'data' / 'lightsaber-form-powers.json'
    db_path = project_root / 'packs' / 'lightsaberformpowers.db'
    data = json.loads(json_path.read_text(encoding='utf-8'))
    powers = data.get('powers', [])
    existing_ids = read_existing_ids(db_path)
    docs = [build_document(power, existing_ids, index) for index, power in enumerate(powers)]
    db_path.write_text('\n'.join(json.dumps(doc, ensure_ascii=False) for doc in docs) + '\n', encoding='utf-8')
    print(f'Wrote {len(docs)} lightsaber form powers to {db_path}')
    print('Pack format: Foundry JSONL .db')


if __name__ == '__main__':
    populate_lightsaber_form_powers()
