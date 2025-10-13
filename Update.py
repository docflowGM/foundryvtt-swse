#!/usr/bin/env python3
"""
Auto-fix SWSE JSON files by adding missing 'name' and 'type' fields
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "json_autofix_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

# Map filename to item/actor type
TYPE_MAP = {
    # Items
    'weapons': 'weapon',
    'armor': 'armor',
    'equipment': 'equipment',
    'feats': 'feat',
    'talents': 'talent',
    'forcepowers': 'forcePower',
    'force-powers': 'forcePower',
    'classes': 'class',
    'classes-db': 'class',
    
    # Actors
    'vehicles': 'vehicle',
    'npc': 'npc',
    'droids': 'droid',
    'Droids': 'droid',
    
    # Special/System
    'attributes': 'attribute',
    'skills': 'skill',
    'combat-actions': 'combatAction',
    'conditions': 'condition',
    'special-combat-condition': 'combatCondition',
    'extraskilluses': 'skillUse'
}

class JSONAutoFixer:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.fixed_files = []
        self.stats = {
            'files_processed': 0,
            'files_fixed': 0,
            'entries_fixed': 0,
            'names_added': 0,
            'types_added': 0
        }
    
    def create_backup(self):
        """Backup data directory"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        data_dir = self.repo_path / "data"
        if data_dir.exists():
            backup_data = self.backup_dir / "data"
            shutil.copytree(data_dir, backup_data, dirs_exist_ok=True)
            print(f"  ✓ Backed up: data/ → {self.backup_dir}")
        
        print()
    
    def fix_json_file(self, json_file):
        """Fix a single JSON file"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                print(f"  ⚠ {json_file.name}: Not a list, skipping")
                return False
            
            # Determine default type from filename
            file_stem = json_file.stem
            default_type = TYPE_MAP.get(file_stem)
            
            if not default_type:
                print(f"  ⚠ {json_file.name}: Unknown file type, skipping")
                return False
            
            # Track changes
            entries_fixed = 0
            names_added = 0
            types_added = 0
            
            for i, entry in enumerate(data):
                if not isinstance(entry, dict):
                    continue
                
                modified = False
                
                # Fix missing or empty name
                if 'name' not in entry or not entry.get('name', '').strip():
                    # Try to generate a reasonable name
                    if 'id' in entry:
                        entry['name'] = f"{default_type.title()} {entry['id']}"
                    else:
                        entry['name'] = f"Unnamed {default_type.title()} {i+1}"
                    names_added += 1
                    modified = True
                
                # Fix missing or empty type
                if 'type' not in entry or not entry.get('type', '').strip():
                    entry['type'] = default_type
                    types_added += 1
                    modified = True
                
                if modified:
                    entries_fixed += 1
            
            # Only write if we made changes
            if entries_fixed > 0:
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"  ✓ {json_file.name}: Fixed {entries_fixed}/{len(data)} entries")
                if names_added > 0:
                    print(f"    - Added {names_added} names")
                if types_added > 0:
                    print(f"    - Added {types_added} types")
                
                self.stats['entries_fixed'] += entries_fixed
                self.stats['names_added'] += names_added
                self.stats['types_added'] += types_added
                self.fixed_files.append(json_file.name)
                return True
            else:
                print(f"  ✓ {json_file.name}: Already valid")
                return False
                
        except json.JSONDecodeError as e:
            print(f"  ❌ {json_file.name}: Invalid JSON - {e}")
            return False
        except Exception as e:
            print(f"  ❌ {json_file.name}: Error - {e}")
            return False
    
    def fix_all_files(self):
        """Fix all JSON files in data directory"""
        print("Fixing JSON files...")
        print()
        
        data_dir = self.repo_path / "data"
        if not data_dir.exists():
            print(f"❌ Data directory not found: {data_dir}")
            return False
        
        json_files = sorted(data_dir.glob("*.json"))
        
        for json_file in json_files:
            self.stats['files_processed'] += 1
            if self.fix_json_file(json_file):
                self.stats['files_fixed'] += 1
        
        print()
        return True
    
    def verify_fixes(self):
        """Verify that fixes worked"""
        print("Verifying fixes...")
        print()
        
        data_dir = self.repo_path / "data"
        json_files = sorted(data_dir.glob("*.json"))
        
        total_issues = 0
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if not isinstance(data, list):
                    continue
                
                issues = 0
                for entry in data:
                    if not isinstance(entry, dict):
                        continue
                    
                    if 'name' not in entry or not entry.get('name', '').strip():
                        issues += 1
                    if 'type' not in entry or not entry.get('type', '').strip():
                        issues += 1
                
                if issues > 0:
                    print(f"  ⚠ {json_file.name}: Still has {issues} issues")
                    total_issues += issues
                else:
                    print(f"  ✓ {json_file.name}: All entries valid")
            
            except Exception as e:
                print(f"  ❌ {json_file.name}: Error - {e}")
        
        print()
        
        if total_issues == 0:
            print("✓ All files verified successfully!")
        else:
            print(f"⚠ {total_issues} issues remain")
        
        return total_issues == 0
    
    def run(self):
        """Execute the auto-fix"""
        print("="*70)
        print("Auto-Fix SWSE JSON Files")
        print("="*70)
        print()
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        try:
            # Create backup
            self.create_backup()
            
            # Fix all files
            if not self.fix_all_files():
                return False
            
            # Verify fixes
            all_valid = self.verify_fixes()
            
            # Print summary
            print("="*70)
            print("✓ Auto-Fix Complete")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print()
            print("📊 Statistics:")
            print(f"  Files processed: {self.stats['files_processed']}")
            print(f"  Files modified: {self.stats['files_fixed']}")
            print(f"  Entries fixed: {self.stats['entries_fixed']}")
            print(f"  Names added: {self.stats['names_added']}")
            print(f"  Types added: {self.stats['types_added']}")
            print()
            
            if self.fixed_files:
                print("Modified files:")
                for filename in self.fixed_files:
                    print(f"  • {filename}")
                print()
            
            if all_valid:
                print("✓ ALL JSON FILES ARE NOW VALID!")
                print()
                print("NEXT STEPS:")
                print("1. Restart Foundry VTT")
                print("2. Open console (F12) and run:")
                print("   WorldDataLoader.loadAll()")
                print("3. Check console for 'Loaded X items' messages")
                print("4. Verify data imported correctly")
            else:
                print("⚠ Some issues remain - check output above")
                print(f"  Restore from backup if needed: {self.backup_dir}")
            
            return all_valid
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print(f"Restore from: {self.backup_dir}")
            import traceback
            traceback.print_exc()
            return False


def main():
    print("\n⚠️  WARNING: This will modify your JSON files!")
    print(f"Backup will be created at: {BACKUP_DIR}")
    print()
    
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("Aborted.")
        return 1
    
    print()
    
    fixer = JSONAutoFixer()
    success = fixer.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())