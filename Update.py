#!/usr/bin/env python3
"""
Fix SWSE JSON files to use valid Foundry item types
Maps custom types to valid Foundry types based on system template
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "type_fix_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

class TypeFixer:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.stats = {
            'files_fixed': 0,
            'entries_fixed': 0,
            'type_mappings': {}
        }
        
        # First, let's scan what types exist and what the system expects
        self.valid_types = self.detect_valid_types()
    
    def detect_valid_types(self):
        """Detect valid item types from template.json"""
        template_path = self.repo_path / "template.json"
        
        if template_path.exists():
            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    template = json.load(f)
                
                # Valid types are defined in Item.types
                if 'Item' in template and 'types' in template['Item']:
                    types = template['Item']['types']
                    print(f"Found valid item types in template.json: {types}")
                    return set(types)
            except Exception as e:
                print(f"Could not read template.json: {e}")
        
        # Default SWSE item types (adjust based on your system)
        default_types = {
            'class', 'feat', 'talent', 'forcePower', 
            'weapon', 'armor', 'equipment', 'item',
            'skill', 'combatAction', 'condition'
        }
        print(f"Using default types: {default_types}")
        return default_types
    
    def create_backup(self):
        """Backup data directory"""
        print("\nCreating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        data_dir = self.repo_path / "data"
        if data_dir.exists():
            backup_data = self.backup_dir / "data"
            shutil.copytree(data_dir, backup_data, dirs_exist_ok=True)
            print(f"  ✓ Backed up to: {self.backup_dir}")
        print()
    
    def map_invalid_type(self, invalid_type, filename):
        """Map invalid type to valid type"""
        # Common mappings based on the errors you showed
        type_mapping = {
            # Weapon types
            'Energy': 'weapon',
            'Projectile': 'weapon',
            'Melee': 'weapon',
            'Thrown': 'weapon',
            'Simple': 'weapon',
            'Heavy': 'weapon',
            'Lightsaber': 'weapon',
            'Exotic': 'weapon',
            
            # Feat types
            'General': 'feat',
            'Force': 'feat',
            'Starship': 'feat',
            
            # Equipment types
            '-': 'equipment',
            'Equipment': 'equipment',
            'Cybernetic': 'equipment',
            'Medical': 'equipment',
            'Tool': 'equipment',
            
            # Armor types
            'Light': 'armor',
            'Medium': 'armor',
            'Heavy Armor': 'armor',
            
            # Force powers
            'Force Power': 'forcePower',
            'Force Technique': 'forcePower',
            
            # Classes
            'Base': 'class',
            'Prestige': 'class',
            'Heroic': 'class',
        }
        
        # Try direct mapping first
        if invalid_type in type_mapping:
            return type_mapping[invalid_type]
        
        # Infer from filename
        file_type_map = {
            'weapons': 'weapon',
            'armor': 'armor',
            'equipment': 'equipment',
            'feats': 'feat',
            'talents': 'talent',
            'forcepowers': 'forcePower',
            'force-powers': 'forcePower',
            'classes': 'class',
            'skills': 'skill',
            'combat-actions': 'combatAction',
            'conditions': 'condition',
        }
        
        file_stem = Path(filename).stem.lower()
        if file_stem in file_type_map:
            return file_type_map[file_stem]
        
        # Default to equipment
        return 'equipment'
    
    def fix_json_file(self, json_file):
        """Fix types in a single JSON file"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return False
            
            entries_fixed = 0
            type_changes = {}
            
            for entry in data:
                if not isinstance(entry, dict):
                    continue
                
                if 'type' not in entry:
                    continue
                
                current_type = entry['type']
                
                # Skip if already valid
                if current_type in self.valid_types:
                    continue
                
                # Map to valid type
                new_type = self.map_invalid_type(current_type, json_file.name)
                entry['type'] = new_type
                
                # Track changes
                type_changes[current_type] = new_type
                entries_fixed += 1
            
            # Save if we made changes
            if entries_fixed > 0:
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"  ✓ {json_file.name}: Fixed {entries_fixed} entries")
                for old_type, new_type in type_changes.items():
                    print(f"    - '{old_type}' → '{new_type}'")
                
                self.stats['entries_fixed'] += entries_fixed
                self.stats['type_mappings'].update(type_changes)
                return True
            else:
                print(f"  ✓ {json_file.name}: All types valid")
                return False
            
        except Exception as e:
            print(f"  ❌ {json_file.name}: Error - {e}")
            return False
    
    def fix_all_files(self):
        """Fix all JSON files"""
        print("Fixing item types...")
        print()
        
        data_dir = self.repo_path / "data"
        if not data_dir.exists():
            print(f"❌ Data directory not found: {data_dir}")
            return False
        
        json_files = sorted(data_dir.glob("*.json"))
        
        for json_file in json_files:
            if self.fix_json_file(json_file):
                self.stats['files_fixed'] += 1
        
        print()
        return True
    
    def create_import_script(self):
        """Create a working import script for Foundry console"""
        script = '''// SWSE Data Import Script
// Paste this into Foundry console (F12)

async function importSWSEData() {
  const files = [
    { file: 'classes.json', type: 'class' },
    { file: 'feats.json', type: 'feat' },
    { file: 'talents.json', type: 'talent' },
    { file: 'forcepowers.json', type: 'forcePower' },
    { file: 'weapons.json', type: 'weapon' },
    { file: 'equipment.json', type: 'equipment' },
    { file: 'skills.json', type: 'skill' },
    { file: 'combat-actions.json', type: 'combatAction' },
    { file: 'conditions.json', type: 'condition' }
  ];
  
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (const {file, type} of files) {
    try {
      const response = await fetch(`systems/swse/data/${file}`);
      if (!response.ok) {
        console.log(`⚠ ${file} not found - skipping`);
        continue;
      }
      
      const items = await response.json();
      let imported = 0;
      let skipped = 0;
      
      for (const itemData of items) {
        // Validate required fields
        if (!itemData.name || !itemData.name.trim()) {
          console.warn(`Skipping item with no name in ${file}`);
          skipped++;
          continue;
        }
        
        // Check if already exists
        const existing = game.items.find(i => 
          i.name === itemData.name && i.type === itemData.type
        );
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create item
        try {
          await Item.create({
            name: itemData.name,
            type: itemData.type,
            system: itemData
          });
          imported++;
        } catch (err) {
          console.error(`Failed to create ${itemData.name}:`, err.message);
          skipped++;
        }
      }
      
      console.log(`✓ ${file}: Imported ${imported}, Skipped ${skipped}`);
      totalImported += imported;
      totalSkipped += skipped;
      
    } catch (error) {
      console.error(`❌ Error loading ${file}:`, error);
    }
  }
  
  console.log(`\\n✓ Import complete!`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total skipped: ${totalSkipped}`);
  console.log(`\\nTotal items in world: ${game.items.size}`);
}

// Run the import
await importSWSEData();
'''
        
        script_path = self.backup_dir / "IMPORT_SCRIPT.js"
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script)
        
        return script_path
    
    def run(self):
        """Execute the fix"""
        print("="*70)
        print("Fix SWSE Item Types for Foundry")
        print("="*70)
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        try:
            self.create_backup()
            self.fix_all_files()
            script_path = self.create_import_script()
            
            print("="*70)
            print("✓ Type Fix Complete")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print(f"Import script: {script_path}")
            print()
            print("📊 Statistics:")
            print(f"  Files fixed: {self.stats['files_fixed']}")
            print(f"  Entries fixed: {self.stats['entries_fixed']}")
            print()
            
            if self.stats['type_mappings']:
                print("Type mappings applied:")
                for old, new in sorted(set(self.stats['type_mappings'].items())):
                    print(f"  '{old}' → '{new}'")
                print()
            
            print("NEXT STEPS:")
            print("1. Review the changes above")
            print("2. Restart Foundry VTT")
            print(f"3. Open {script_path}")
            print("4. Copy the script and paste into Foundry console (F12)")
            print("5. Press Enter to run the import")
            print()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    fixer = TypeFixer()
    success = fixer.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())