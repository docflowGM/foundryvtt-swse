#!/usr/bin/env python3
"""
Rename Unnamed Skilluse Items
Uses the 'application' field as the actual name
"""

import json
from pathlib import Path
from datetime import datetime

# Base path
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

def create_backup(file_path):
    """Create timestamped backup"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = file_path.with_suffix(f"{file_path.suffix}.backup_{timestamp}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return backup_path

def rename_json_items():
    """Rename items in data/extraskilluses.json"""
    print("\n" + "="*60)
    print("📝 RENAMING: extraskilluses.json")
    print("="*60)
    
    json_file = BASE_PATH / "data" / "extraskilluses.json"
    
    if not json_file.exists():
        print(f"   ❌ File not found: {json_file}")
        return None
    
    # Backup
    backup = create_backup(json_file)
    print(f"   ✓ Backup: {backup.name}")
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            items = json.load(f)
        
        print(f"   ✓ Loaded {len(items)} items\n")
        
        name_mapping = {}
        renamed = 0
        
        for idx, item in enumerate(items):
            old_name = item.get('name', '')
            
            if old_name.startswith('Unnamed Skilluse'):
                # Get new name from application field
                if item.get('application'):
                    new_name = item['application'].strip()
                    
                    # Limit length
                    if len(new_name) > 60:
                        new_name = new_name[:57] + "..."
                    
                    item['name'] = new_name
                    name_mapping[idx] = new_name
                    renamed += 1
                    
                    print(f"   ✓ {old_name:25s} → {new_name}")
                else:
                    # No application field, use generic name
                    new_name = f"Extra Skill Use {idx + 1}"
                    item['name'] = new_name
                    name_mapping[idx] = new_name
                    renamed += 1
                    
                    print(f"   ⚠️  {old_name:25s} → {new_name} (no application)")
        
        # Write back
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        
        print(f"\n   ✅ Renamed {renamed} items")
        
        return name_mapping
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def rename_db_items(name_mapping):
    """Rename items in packs/extraskilluses.db using the name mapping"""
    print("\n" + "="*60)
    print("📦 RENAMING: extraskilluses.db")
    print("="*60)
    
    if name_mapping is None:
        print("   ⚠️  Skipping - no name mapping available")
        return 0
    
    db_file = BASE_PATH / "packs" / "extraskilluses.db"
    
    if not db_file.exists():
        print(f"   ❌ File not found: {db_file}")
        return 0
    
    # Backup
    backup = create_backup(db_file)
    print(f"   ✓ Backup: {backup.name}")
    
    try:
        with open(db_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        print(f"   ✓ Loaded {len(lines)} items\n")
        
        fixed_lines = []
        renamed = 0
        
        for idx, line in enumerate(lines):
            if not line.strip():
                continue
            
            try:
                item = json.loads(line)
                old_name = item.get('name', '')
                
                # If name is "Unnamed Skilluse" and we have a mapping, rename it
                if old_name.startswith('Unnamed Skilluse') and idx in name_mapping:
                    new_name = name_mapping[idx]
                    item['name'] = new_name
                    renamed += 1
                    
                    print(f"   ✓ Line {idx+1:3d}: {old_name:25s} → {new_name}")
                
                fixed_lines.append(json.dumps(item, ensure_ascii=False))
            
            except json.JSONDecodeError:
                fixed_lines.append(line.strip())
        
        # Write back
        with open(db_file, 'w', encoding='utf-8') as f:
            for line in fixed_lines:
                f.write(line + '\n')
        
        print(f"\n   ✅ Renamed {renamed} items")
        
        return renamed
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return 0

def main():
    """Main function"""
    print("\n" + "="*60)
    print("🔧 EXTRA SKILL USE RENAMER")
    print("="*60)
    print(f"\nTarget: {BASE_PATH}")
    print("\n📝 This will rename all 'Unnamed Skilluse X' items")
    print("   to their actual names from the 'application' field")
    print("\n📦 Backups will be created")
    print("\nPress Ctrl+C to cancel, or")
    input("Press Enter to continue...\n")
    
    # Rename JSON items and get mapping
    name_mapping = rename_json_items()
    
    # Rename DB items using the mapping
    if name_mapping:
        rename_db_items(name_mapping)
    
    # Summary
    print("\n" + "="*60)
    print("📊 RENAMING COMPLETE")
    print("="*60)
    
    if name_mapping:
        print(f"\n✅ Successfully renamed items!")
        print(f"   Items renamed in JSON: {len(name_mapping)}")
        print("\n💡 Sample new names:")
        for idx, name in list(name_mapping.items())[:5]:
            print(f"   - {name}")
        
        if len(name_mapping) > 5:
            print(f"   ... and {len(name_mapping) - 5} more")
        
        print("\n🎉 All items now have descriptive names!")
        print("\n📦 Backups saved with timestamps")
    else:
        print("\n⚠️  Renaming failed - check errors above")
    
    print("\n" + "="*60)
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()