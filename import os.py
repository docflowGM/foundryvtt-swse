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
print("\n[1/3] Fixing template directory...")

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
print("\n[2/3] Fixing import paths in index.js...")

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
# FIX 3: Fix template paths in all JS files
# ============================================
print("\n[3/3] Fixing template paths in all JavaScript files...")

# Find all .js files that might have template paths
js_files_to_check = [
    repo_path / "scripts" / "core" / "load-templates.js",
    repo_path / "scripts" / "init.js",
    repo_path / "scripts" / "helpers.js",
    repo_path / "helpers" / "handlebars-helpers.js"
]

# Also search for any file in scripts/ that might contain template paths
for js_file in (repo_path / "scripts").rglob("*.js"):
    if js_file not in js_files_to_check:
        js_files_to_check.append(js_file)

fixed_files = []

for js_file in js_files_to_check:
    if not js_file.exists():
        continue
    
    try:
        with open(js_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace all instances of templates/actor/ with templates/actors/
        content = content.replace('templates/actor/', 'templates/actors/')
        content = content.replace('templates\\actor\\', 'templates\\actors\\')
        content = content.replace('"templates/actor', '"templates/actors')
        content = content.replace("'templates/actor", "'templates/actors")
        content = content.replace('`templates/actor', '`templates/actors')
        
        if content != original_content:
            with open(js_file, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed_files.append(js_file.relative_to(repo_path))
    except Exception as e:
        print(f"⚠ Warning: Could not process {js_file.name}: {e}")

if fixed_files:
    print(f"✓ Fixed template paths in {len(fixed_files)} file(s):")
    for file in fixed_files:
        print(f"  - {file}")
else:
    print("✓ No template path fixes needed (already correct)")

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