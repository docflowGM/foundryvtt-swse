import os
from pathlib import Path

# Your repo path
repo_path = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

print("=" * 60)
print("SWSE FoundryVTT Complete Fix Script")
print("=" * 60)

# ============================================
# FIX 1: Rename templates/actor to templates/actors
# ============================================
print("\n[1/2] Fixing template directory...")

old_dir = repo_path / "templates" / "actor"
new_dir = repo_path / "templates" / "actors"

if old_dir.exists():
    if new_dir.exists():
        print(f"⚠ Warning: {new_dir} already exists!")
        print("Skipping directory rename.")
    else:
        print(f"✓ Renaming {old_dir.name} to {new_dir.name}...")
        old_dir.rename(new_dir)
        print(f"✓ Successfully renamed to: {new_dir}")
        
        print(f"\nFiles in {new_dir}:")
        for file in new_dir.iterdir():
            print(f"  - {file.name}")
elif new_dir.exists():
    print(f"✓ Directory already correct: {new_dir}")
else:
    print(f"✗ Error: Neither {old_dir} nor {new_dir} exists!")

# ============================================
# FIX 2: Update import paths in index.js
# ============================================
print("\n[2/2] Fixing import paths in index.js...")

index_file = repo_path / "index.js"

if not index_file.exists():
    print(f"✗ Error: {index_file} not found!")
else:
    # Read the file
    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Track if we made any changes
    original_content = content
    
    # Replace the import paths
    replacements = {
        'import { SWSEActor, SWSEActorSheet } from "./scripts/swse-actor.js";': 
            'import { SWSEActor, SWSEActorSheet } from "./scripts/actors/swse-actor.js";',
        
        'import { SWSEDroidSheet } from "./scripts/swse-droid.js";':
            'import { SWSEDroidSheet } from "./scripts/actors/swse-droid.js";',
        
        'import { SWSEVehicleSheet } from "./scripts/swse-vehicle.js";':
            'import { SWSEVehicleSheet } from "./scripts/actors/swse-vehicle.js";',
        
        'import { SWSENPCSheet } from "./scripts/swse-npc.js";':
            'import { SWSENPCSheet } from "./scripts/actors/swse-npc.js";'
    }
    
    changes_made = []
    for old_import, new_import in replacements.items():
        if old_import in content:
            content = content.replace(old_import, new_import)
            changes_made.append(old_import.split(' from ')[1].strip('";'))
    
    if content != original_content:
        # Write the updated content back
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Updated {len(changes_made)} import path(s) in index.js:")
        for path in changes_made:
            print(f"  - {path} → scripts/actors/...")
    else:
        print("✓ Import paths already correct or not found to replace")

# ============================================
# Summary
# ============================================
print("\n" + "=" * 60)
print("FIXES COMPLETE!")
print("=" * 60)
print("\nNext steps:")
print("1. Restart FoundryVTT")
print("2. Try creating a new character")
print("3. The validation error should be gone!")
print("\nIf you still have issues, check the browser console (F12)")
print("=" * 60)