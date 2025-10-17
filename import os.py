#!/usr/bin/env python3
"""
SWSE Foundry System Auto-Fixer
Automatically fixes all detected issues in your SWSE system
"""

import re
import os
import shutil
from pathlib import Path
from typing import List, Dict, Set, Tuple
import json
from datetime import datetime

# DEFAULT SYSTEM DIRECTORY
DEFAULT_SYSTEM_DIR = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"

class AutoFixer:
    """Automatically fix SWSE system issues"""
    
    def __init__(self, system_dir: Path, dry_run: bool = False):
        self.system_dir = system_dir
        self.dry_run = dry_run
        self.changes = []
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def backup_file(self, filepath: Path) -> Path:
        """Create timestamped backup of a file"""
        backup_path = filepath.parent / f"{filepath.stem}.{self.timestamp}.backup{filepath.suffix}"
        if not self.dry_run:
            shutil.copy2(filepath, backup_path)
            print(f"  ✓ Backed up to: {backup_path.name}")
        return backup_path
    
    def fix_all(self):
        """Run all automated fixes"""
        print("\n🔧 SWSE AUTO-FIXER")
        print("=" * 60)
        
        if self.dry_run:
            print("🔍 DRY RUN MODE - No files will be modified")
            print("=" * 60 + "\n")
        
        # 1. Fix template.json
        self.fix_template_json()
        
        # 2. Fix Handlebars helpers
        self.fix_handlebars_helpers()
        
        # 3. Sync config.js
        self.fix_config_js()
        
        # 4. Clean up duplicate templates
        self.cleanup_duplicate_templates()
        
        # 5. Register missing templates
        self.register_missing_templates()
        
        # 6. Add data-dtype to templates
        self.fix_template_data_types()
        
        # 7. Add missing event handlers
        self.add_missing_handlers()
        
        self.print_summary()
    
    def fix_template_json(self):
        """Generate improved template.json"""
        print("\n1️⃣ Fixing template.json...")
        print("-" * 60)
        
        template_path = self.system_dir / "template.json"
        if not template_path.exists():
            print("  ⚠️  template.json not found, skipping")
            return
        
        self.backup_file(template_path)
        
        with open(template_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Fix Actor base template
        actor_data = data['Actor']
        if 'templates' not in actor_data:
            actor_data['templates'] = {}
        if 'base' not in actor_data['templates']:
            actor_data['templates']['base'] = {}
        
        base = actor_data['templates']['base']
        
        # Add all missing fields
        improvements = {
            'bab': 0,
            'level': 1,
            'race': 'custom',
            'size': 'medium',
            'conditionTrack': 'normal',
            'speed': {'base': 6, 'total': 6},
            'forcePoints': {'value': 5, 'max': 5, 'die': '1d6'},
            'destinyPoints': {'value': 1, 'max': 1},
            'freeForcePowers': {'current': 0, 'max': 0},
            'secondWind': {'uses': 1, 'max': 1, 'misc': 0, 'healing': 0},
            'initiative': {'misc': 0, 'total': 0},
            'damageThreshold': 10,
            'damageThresholdMisc': 0,
            'skills': {},
            'weapons': [],
            'feats': [],
            'talents': [],
            'customSkills': [],
            'classes': [],
            'credits': 0,
            'experience': 0
        }
        
        added = []
        for field, default_value in improvements.items():
            if field not in base:
                base[field] = default_value
                added.append(field)
        
        # Fix defense structures
        if 'defenses' in base:
            ability_map = {'fortitude': 'con', 'reflex': 'dex', 'will': 'wis'}
            for defense, ability in ability_map.items():
                if defense in base['defenses']:
                    def_data = base['defenses'][defense]
                    
                    if 'ability' not in def_data:
                        def_data['ability'] = ability
                    
                    if 'class' not in def_data:
                        def_data['class'] = def_data.pop('classBonus', 0)
                    elif 'classBonus' in def_data:
                        def_data.pop('classBonus')
                    
                    if 'armor' not in def_data and defense == 'reflex':
                        def_data['armor'] = 0
                    
                    if 'armorMastery' not in def_data:
                        def_data['armorMastery'] = 0
                    
                    if 'modifier' not in def_data:
                        def_data['modifier'] = 0
        
        # Add missing item types
        item_data = data['Item']
        if 'attribute' not in item_data:
            item_data['attribute'] = {'templates': ['base']}
            added.append('Item.attribute')
        
        if 'extra-skill-use' not in item_data:
            item_data['extra-skill-use'] = {'templates': ['base']}
            added.append('Item.extra-skill-use')
        
        if not self.dry_run:
            with open(template_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        print(f"  ✓ Added {len(added)} missing fields:")
        for field in added[:10]:
            print(f"    - {field}")
        if len(added) > 10:
            print(f"    ... and {len(added) - 10} more")
        
        self.changes.append(f"template.json: Added {len(added)} fields")
    
    def fix_handlebars_helpers(self):
        """Add missing Handlebars helpers"""
        print("\n2️⃣ Fixing Handlebars helpers...")
        print("-" * 60)
        
        helpers_path = self.system_dir / "helpers" / "handlebars-helpers.js"
        if not helpers_path.exists():
            print("  ⚠️  handlebars-helpers.js not found, skipping")
            return
        
        self.backup_file(helpers_path)
        
        with open(helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check which helpers are missing
        missing_helpers = []
        
        if 'registerHelper("editor"' not in content and "registerHelper('editor'" not in content:
            missing_helpers.append('editor')
        
        if 'registerHelper("numberFormat"' not in content and "registerHelper('numberFormat'" not in content:
            missing_helpers.append('numberFormat')
        
        if not missing_helpers:
            print("  ✓ All helpers already registered")
            return
        
        # Add missing helpers at the end, before the closing brace/export
        new_helpers = []
        
        if 'editor' in missing_helpers:
            new_helpers.append('''
  // Editor helper for rich text fields
  Handlebars.registerHelper('editor', function(content, options) {
    // Foundry provides this in v10+, but we include a fallback
    return new Handlebars.SafeString(content || '');
  });''')
        
        if 'numberFormat' in missing_helpers:
            new_helpers.append('''
  // Number formatting helper
  Handlebars.registerHelper('numberFormat', function(value, options) {
    const num = parseFloat(value) || 0;
    const decimals = options.hash.decimals || 0;
    const sign = options.hash.sign || false;
    
    let result = num.toFixed(decimals);
    if (sign && num >= 0) result = '+' + result;
    return result;
  });''')
        
        # Find the best place to insert (before last closing brace or at end)
        insertion_point = content.rfind('}')
        if insertion_point == -1:
            insertion_point = len(content)
        
        new_content = content[:insertion_point] + '\n'.join(new_helpers) + '\n' + content[insertion_point:]
        
        if not self.dry_run:
            with open(helpers_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
        
        print(f"  ✓ Added {len(missing_helpers)} helpers: {', '.join(missing_helpers)}")
        self.changes.append(f"handlebars-helpers.js: Added {len(missing_helpers)} helpers")
    
    def fix_config_js(self):
        """Sync config.js with template.json"""
        print("\n3️⃣ Syncing config.js...")
        print("-" * 60)
        
        config_path = self.system_dir / "config.js"
        template_path = self.system_dir / "template.json"
        
        if not config_path.exists() or not template_path.exists():
            print("  ⚠️  config.js or template.json not found, skipping")
            return
        
        self.backup_file(config_path)
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_data = json.load(f)
        
        template_item_types = set(template_data.get('Item', {}).get('types', []))
        
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract current item types
        match = re.search(r'itemTypes\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if not match:
            print("  ⚠️  Could not find itemTypes in config.js")
            return
        
        current_types_str = match.group(1)
        current_types = set(re.findall(r'"([^"]+)"', current_types_str))
        
        # Merge both sets (keep all types from both sources)
        all_types = sorted(current_types | template_item_types)
        
        # Create new item types array
        new_types_str = ', '.join(f'"{t}"' for t in all_types)
        new_content = content[:match.start(1)] + new_types_str + content[match.end(1):]
        
        if not self.dry_run:
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
        
        added = (current_types | template_item_types) - current_types
        if added:
            print(f"  ✓ Added {len(added)} item types: {', '.join(added)}")
            self.changes.append(f"config.js: Added {len(added)} item types")
        else:
            print("  ✓ Item types already in sync")
    
    def cleanup_duplicate_templates(self):
        """Remove duplicate template folders"""
        print("\n4️⃣ Cleaning up duplicate templates...")
        print("-" * 60)
        
        # Check for both actor/ and actors/ folders
        actor_dir = self.system_dir / "templates" / "actor"
        actors_dir = self.system_dir / "templates" / "actors"
        
        if not actors_dir.exists():
            print("  ✓ No duplicate 'actors/' folder found")
            return
        
        if not actor_dir.exists():
            print("  ℹ️  'actor/' folder doesn't exist, keeping 'actors/'")
            return
        
        # Compare files
        actor_files = set(f.name for f in actor_dir.glob("*.hbs"))
        actors_files = set(f.name for f in actors_dir.glob("*.hbs"))
        
        duplicates = actor_files & actors_files
        
        if duplicates:
            print(f"  ⚠️  Found {len(duplicates)} duplicate files in actors/:")
            for dup in sorted(duplicates):
                print(f"    - {dup}")
            
            if not self.dry_run:
                # Move to a backup folder instead of deleting
                backup_dir = self.system_dir / "templates" / f"actors.backup.{self.timestamp}"
                shutil.move(actors_dir, backup_dir)
                print(f"  ✓ Moved actors/ to {backup_dir.name}")
                self.changes.append(f"Moved duplicate templates/actors/ folder")
            else:
                print(f"  Would move actors/ to actors.backup.{self.timestamp}/")
        else:
            print("  ℹ️  No duplicate files found")
    
    def register_missing_templates(self):
        """Add missing templates to load-templates.js"""
        print("\n5️⃣ Registering missing templates...")
        print("-" * 60)
        
        load_path = self.system_dir / "scripts" / "load-templates.js"
        if not load_path.exists():
            load_path = self.system_dir / "scripts" / "core" / "load-templates.js"
        
        if not load_path.exists():
            print("  ⚠️  load-templates.js not found, skipping")
            return
        
        self.backup_file(load_path)
        
        with open(load_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the templatePaths array
        match = re.search(r'templatePaths\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if not match:
            print("  ⚠️  Could not find templatePaths array")
            return
        
        paths_str = match.group(1)
        current_paths = set(re.findall(r'"([^"]+)"', paths_str))
        
        # Templates that should be registered
        needed_templates = [
            "systems/swse/templates/apps/narrative-chargen.hbs",
            "systems/swse/templates/apps/store.hbs",
            "systems/swse/templates/items/item-sheet.hbs",
        ]
        
        missing = [t for t in needed_templates if t not in current_paths]
        
        if not missing:
            print("  ✓ All templates already registered")
            return
        
        # Add missing templates
        new_paths = sorted(current_paths | set(missing))
        new_paths_str = ',\n    '.join(f'"{p}"' for p in new_paths)
        
        new_content = content[:match.start(1)] + '\n    ' + new_paths_str + '\n  ' + content[match.end(1):]
        
        if not self.dry_run:
            with open(load_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
        
        print(f"  ✓ Registered {len(missing)} templates")
        self.changes.append(f"load-templates.js: Added {len(missing)} templates")
    
    def fix_template_data_types(self):
        """Add data-dtype to number inputs in templates"""
        print("\n6️⃣ Adding data-dtype to templates...")
        print("-" * 60)
        
        templates_dir = self.system_dir / "templates"
        if not templates_dir.exists():
            print("  ⚠️  templates/ directory not found")
            return
        
        fixed_count = 0
        file_count = 0
        
        for hbs_file in templates_dir.rglob("*.hbs"):
            if '.backup' in str(hbs_file):
                continue
            
            with open(hbs_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find number inputs without data-dtype
            def add_dtype(match):
                input_tag = match.group(0)
                if 'data-dtype' not in input_tag:
                    return input_tag[:-1] + ' data-dtype="Number">'
                return input_tag
            
            new_content = re.sub(
                r'<input[^>]*type=["\']number["\'][^>]*>',
                add_dtype,
                content
            )
            
            if new_content != content:
                changes = len(re.findall(r'data-dtype="Number">', new_content)) - len(re.findall(r'data-dtype="Number">', content))
                if changes > 0:
                    file_count += 1
                    fixed_count += changes
                    
                    if not self.dry_run:
                        self.backup_file(hbs_file)
                        with open(hbs_file, 'w', encoding='utf-8') as f:
                            f.write(new_content)
        
        if fixed_count > 0:
            print(f"  ✓ Added data-dtype to {fixed_count} inputs across {file_count} files")
            self.changes.append(f"Templates: Added data-dtype to {fixed_count} inputs")
        else:
            print("  ✓ All number inputs already have data-dtype")
    
    def add_missing_handlers(self):
        """Add missing event handlers to sheet classes"""
        print("\n7️⃣ Adding missing event handlers...")
        print("-" * 60)
        
        actor_sheet = self.system_dir / "scripts" / "swse-actor.js"
        if not actor_sheet.exists():
            print("  ⚠️  swse-actor.js not found, skipping")
            return
        
        self.backup_file(actor_sheet)
        
        with open(actor_sheet, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Define missing handlers
        missing_handlers = {
            '_onAddArmor': '''
  async _onAddArmor(event) {
    event.preventDefault();
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Armor",
      type: "armor",
      system: { defenseBonus: 0, maxDex: 999 }
    }]);
  }''',
            '_onAddEquipment': '''
  async _onAddEquipment(event) {
    event.preventDefault();
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Equipment",
      type: "equipment",
      system: { weight: 0, cost: 0 }
    }]);
  }'''
        }
        
        added = []
        for handler_name, handler_code in missing_handlers.items():
            if handler_name not in content:
                # Find the last method in activateListeners or before the closing brace
                insertion_point = content.rfind('  async _on')
                if insertion_point == -1:
                    insertion_point = content.rfind('  _on')
                
                if insertion_point != -1:
                    # Find the end of that method
                    end_of_method = content.find('\n  }\n', insertion_point)
                    if end_of_method != -1:
                        insertion_point = end_of_method + 5
                        content = content[:insertion_point] + '\n' + handler_code + '\n' + content[insertion_point:]
                        added.append(handler_name)
        
        if added:
            if not self.dry_run:
                with open(actor_sheet, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            print(f"  ✓ Added {len(added)} handlers: {', '.join(added)}")
            self.changes.append(f"swse-actor.js: Added {len(added)} handlers")
        else:
            print("  ✓ All required handlers already exist")
    
    def print_summary(self):
        """Print summary of all changes"""
        print("\n" + "=" * 60)
        print("📊 AUTO-FIX SUMMARY")
        print("=" * 60)
        
        if not self.changes:
            print("✅ No changes needed - system already optimal!")
            return
        
        print(f"\n{'Would make' if self.dry_run else 'Made'} {len(self.changes)} changes:\n")
        
        for i, change in enumerate(self.changes, 1):
            print(f"  {i}. {change}")
        
        if self.dry_run:
            print("\n💡 Run without --dry-run to apply these changes")
        else:
            print(f"\n✅ All changes applied! Backups saved with timestamp: {self.timestamp}")
            print("   If something breaks, restore from .backup files")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Auto-fix SWSE Foundry system issues'
    )
    parser.add_argument(
        'system_dir',
        nargs='?',
        default=DEFAULT_SYSTEM_DIR,
        help=f'Path to system directory (default: {DEFAULT_SYSTEM_DIR})'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without making changes'
    )
    
    args = parser.parse_args()
    
    system_dir = Path(args.system_dir)
    
    if not system_dir.exists():
        print(f"❌ Error: System directory not found: {system_dir}")
        return
    
    fixer = AutoFixer(system_dir, dry_run=args.dry_run)
    fixer.fix_all()

if __name__ == '__main__':
    main()