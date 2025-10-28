#!/usr/bin/env python3
"""
Fix droids.json to set type to 'droid' instead of 'equipment'
"""

import json
from pathlib import Path

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
DROIDS_JSON = REPO_PATH / "data" / "droids.json"

def fix_droids_json():
    """Fix the type field in droids.json"""
    print("Fixing droids.json type field...")
    print("=" * 60)
    
    if not DROIDS_JSON.exists():
        print(f"❌ File not found: {DROIDS_JSON}")
        return
    
    # Load the droids
    droids = []
    with open(DROIDS_JSON, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try parsing as JSON array first
    try:
        droids = json.loads(content)
    except json.JSONDecodeError:
        # Try newline-delimited
        for line in content.split('\n'):
            line = line.strip()
            if line:
                try:
                    droids.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    
    if not droids:
        print("❌ No droids found in file")
        return
    
    print(f"Found {len(droids)} droids")
    
    # Fix the type field
    fixed_count = 0
    for droid in droids:
        if droid.get("type") != "droid":
            droid["type"] = "droid"
            fixed_count += 1
    
    print(f"Fixed {fixed_count} droids")
    
    # Save back as newline-delimited JSON
    with open(DROIDS_JSON, 'w', encoding='utf-8') as f:
        for droid in droids:
            f.write(json.dumps(droid, ensure_ascii=False) + '\n')
    
    print(f"✓ Saved {DROIDS_JSON}")
    print("✅ Done!")

if __name__ == "__main__":
    fix_droids_json()