#!/usr/bin/env python3
"""
Migration script: Convert embedded forcepower items to force-power type.
Processes heroic.db and nonheroic.db to migrate legacy forcepower type to canonical force-power.
"""

import json
import sys

def migrate_pack(pack_path):
    """Migrate forcepower to force-power in a pack file."""
    migrated_count = 0
    documents = []

    with open(pack_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            doc = json.loads(line)

            # Migrate embedded items
            for item in doc.get('items', []):
                if item.get('type') == 'forcepower':
                    item['type'] = 'force-power'
                    migrated_count += 1

            documents.append(doc)

    # Write back
    with open(pack_path, 'w', encoding='utf-8') as f:
        for doc in documents:
            f.write(json.dumps(doc) + '\n')

    return migrated_count

if __name__ == '__main__':
    total = 0

    for pack in ['packs/heroic.db', 'packs/nonheroic.db']:
        print(f"Migrating {pack}...", file=sys.stderr)
        count = migrate_pack(pack)
        total += count
        print(f"  {count} forcepower items migrated to force-power", file=sys.stderr)

    print(f"\nTotal migrations: {total}", file=sys.stderr)
