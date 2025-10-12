#!/usr/bin/env python3
"""
SWSE System Consolidation Script
Merges the two parallel systems into one coherent structure
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "consolidation_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

class SystemConsolidator:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.actions = []
        self.warnings = []
        
    def create_backup(self):
        """Comprehensive backup before consolidation"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup critical files
        critical = ["index.js", "swse.js", "system.json", "template.json", "config.js"]
        for file in critical:
            src = self.repo_path / file
            if src.exists():
                shutil.copy2(src, self.backup_dir / file)
                print(f"  ✓ Backed up: {file}")
        
        # Backup directories
        for dir_name in ["scripts", "module", "templates"]:
            src = self.repo_path / dir_name
            if src.exists():
                dst = self.backup_dir / dir_name
                shutil.copytree(src, dst, dirs_exist_ok=True)
                print(f"  ✓ Backed up: {dir_name}/")
        
        print("✓ Backup complete\n")
    
    def analyze_structure(self):
        """Analyze current structure and identify conflicts"""
        print("Analyzing system structure...\n")
        
        analysis = {
            "index_js_imports": [],
            "swse_js_imports": [],
            "script_classes": [],
            "module_classes": [],
            "template_locations": []
        }
        
        # Check index.js imports
        index_js = self.repo_path / "index.js"
        if index_js.exists():
            with open(index_js, 'r', encoding='utf-8') as f:
                content = f.read()
                if "scripts/swse-actor.js" in content:
                    analysis["index_js_imports"].append("scripts/swse-actor.js")
                if "scripts/swse-item.js" in content:
                    analysis["index_js_imports"].append("scripts/swse-item.js")
        
        # Check swse.js imports
        swse_js = self.repo_path / "swse.js"
        if swse_js.exists():
            with open(swse_js, 'r', encoding='utf-8') as f:
                content = f.read()
                if "module/sheets/SWSEActorSheet.js" in content:
                    analysis["swse_js_imports"].append("module/sheets/SWSEActorSheet.js")
                if "module/chargen" in content:
                    analysis["swse_js_imports"].append("module/chargen/chargen-init.js")
        
        # Check what exists
        scripts_dir = self.repo_path / "scripts"
        if scripts_dir.exists():
            analysis["script_classes"] = [f.name for f in scripts_dir.glob("*.js")]
        
        module_sheets = self.repo_path / "module" / "sheets"
        if module_sheets.exists():
            analysis["module_classes"] = [f.name for f in module_sheets.glob("*.js")]
        
        # Check templates
        for template_dir in ["templates/actor", "templates/actors"]:
            template_path = self.repo_path / template_dir
            if template_path.exists():
                hbs_files = list(template_path.glob("*.hbs"))
                html_files = list(template_path.glob("*.html"))
                all_files = hbs_files + html_files
                files = [f.name for f in all_files]
                if files:
                    analysis["template_locations"].append({
                        "location": template_dir,
                        "files": files
                    })
        
        # Report findings
        print("STRUCTURE ANALYSIS:")
        print("="*70)
        print(f"\nindex.js (ACTIVE) imports:")
        for imp in analysis["index_js_imports"]:
            print(f"  - {imp}")
        
        print(f"\nswse.js (DORMANT) imports:")
        for imp in analysis["swse_js_imports"]:
            print(f"  - {imp}")
        
        print(f"\nscripts/ directory contains:")
        for cls in analysis["script_classes"]:
            print(f"  - {cls}")
        
        print(f"\nmodule/sheets/ directory contains:")
        for cls in analysis["module_classes"]:
            print(f"  - {cls}")
        
        print(f"\nTemplate locations:")
        for loc in analysis["template_locations"]:
            print(f"  {loc['location']}:")
            for f in loc["files"]:
                print(f"    - {f}")
        
        print("\n" + "="*70 + "\n")
        
        return analysis
    
    def remove_backup_files(self):
        """Remove all .backup files"""
        print("Removing backup files...")
        
        backup_files = list(self.repo_path.rglob("*.backup"))
        
        for backup_file in backup_files:
            rel_path = backup_file.relative_to(self.repo_path)
            backup_file.unlink()
            self.actions.append(f"Removed: {rel_path}")
            print(f"  ✓ Removed: {rel_path}")
        
        print(f"Removed {len(backup_files)} backup files\n")
    
    def consolidate_to_scripts(self):
        """
        Recommended: Keep scripts/ as primary, integrate module/ features
        This keeps the ACTIVE system (index.js) and adds missing features
        """
        print("Consolidating to scripts/ directory...\n")
        
        # 1. Move character generator to scripts/
        chargen_src = self.repo_path / "module" / "chargen"
        chargen_dst = self.repo_path / "scripts" / "chargen"
        
        if chargen_src.exists():
            if chargen_dst.exists():
                shutil.rmtree(chargen_dst)
            shutil.copytree(chargen_src, chargen_dst)
            self.actions.append(f"Moved: module/chargen/ → scripts/chargen/")
            print("  ✓ Moved character generator to scripts/chargen/")
        
        # 2. Move helpers if needed
        helpers_src = self.repo_path / "module" / "scripts" / "helpers.js"
        if helpers_src.exists():
            helpers_dst = self.repo_path / "scripts" / "helpers.js"
            if not helpers_dst.exists():
                shutil.copy2(helpers_src, helpers_dst)
                self.actions.append(f"Copied: module/scripts/helpers.js → scripts/helpers.js")
                print("  ✓ Copied helpers.js to scripts/")
        
        # 3. Update index.js to import chargen
        self.update_index_js_with_chargen()
        
        # 4. Consolidate templates to templates/actor/
        self.consolidate_templates()
        
        print()
    
    def update_index_js_with_chargen(self):
        """Add chargen import to index.js"""
        print("Updating index.js to include character generator...")
        
        index_js = self.repo_path / "index.js"
        
        if not index_js.exists():
            self.warnings.append("index.js not found!")
            return
        
        with open(index_js, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already imported
        if "chargen" in content.lower():
            print("  ℹ Character generator already imported")
            return
        
        # Add import at top
        import_line = 'import "./scripts/chargen/chargen-init.js";\n'
        
        # Find where to insert (after other imports)
        lines = content.split('\n')
        insert_index = 0
        
        for i, line in enumerate(lines):
            if line.strip().startswith('import'):
                insert_index = i + 1
        
        lines.insert(insert_index, import_line)
        new_content = '\n'.join(lines)
        
        with open(index_js, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        self.actions.append("Updated index.js to import character generator")
        print("  ✓ Added chargen import to index.js")
    
    def consolidate_templates(self):
        """Consolidate templates to templates/actor/"""
        print("Consolidating templates...")
        
        primary_dir = self.repo_path / "templates" / "actor"
        deprecated_dir = self.repo_path / "templates" / "actors"
        
        if not primary_dir.exists():
            primary_dir.mkdir(parents=True)
        
        # Move any unique files from actors/ to actor/
        if deprecated_dir.exists():
            for file in deprecated_dir.glob("*"):
                if file.is_file() and file.suffix in ['.hbs', '.html']:
                    # Convert .html to .hbs
                    target_name = file.stem + '.hbs'
                    target_path = primary_dir / target_name
                    
                    if not target_path.exists():
                        shutil.copy2(file, target_path)
                        self.actions.append(f"Moved: {file.name} → templates/actor/{target_name}")
                        print(f"  ✓ Moved: {file.name}")
            
            # Remove deprecated directory
            shutil.rmtree(deprecated_dir)
            self.actions.append("Removed: templates/actors/")
            print("  ✓ Removed templates/actors/")
        
        print()
    
    def cleanup_module_directory(self):
        """Option: Remove module/ directory after consolidation"""
        print("Cleaning up module/ directory...")
        
        module_dir = self.repo_path / "module"
        
        if not module_dir.exists():
            print("  ℹ module/ already removed")
            return
        
        # List what's in module/
        contents = list(module_dir.rglob("*"))
        files = [f for f in contents if f.is_file()]
        
        print(f"\n  module/ contains {len(files)} files:")
        for f in files[:10]:  # Show first 10
            print(f"    - {f.relative_to(module_dir)}")
        if len(files) > 10:
            print(f"    ... and {len(files) - 10} more")
        
        # Ask for confirmation (simulated - you'll do this manually)
        self.warnings.append(
            "MANUAL ACTION REQUIRED: Review module/ directory\n"
            "  After verifying everything works, you can safely remove it:\n"
            "  rm -rf module/"
        )
        
        print("\n  ⚠ Keeping module/ for now - review before deleting")
        print()
    
    def remove_swse_js(self):
        """Remove the dormant swse.js entry point"""
        print("Removing dormant swse.js...")
        
        swse_js = self.repo_path / "swse.js"
        
        if swse_js.exists():
            swse_js.unlink()
            self.actions.append("Removed: swse.js (dormant entry point)")
            print("  ✓ Removed swse.js")
        else:
            print("  ℹ swse.js already removed")
        
        print()
    
    def create_migration_guide(self):
        """Create a guide for the migration"""
        guide = f"""# SWSE System Consolidation Guide

## What Was Done

This script consolidated your two parallel systems into one:

**BEFORE:**
```
index.js (ACTIVE) → scripts/ → templates/actor/
swse.js (DORMANT) → module/ → templates/actors/
```

**AFTER:**
```
index.js (ACTIVE) → scripts/ (includes chargen) → templates/actor/
```

## Changes Made

"""
        for action in self.actions:
            guide += f"- {action}\n"
        
        guide += f"""

## Warnings

"""
        for warning in self.warnings:
            guide += f"⚠ {warning}\n\n"
        
        guide += """

## What You Need to Do

### 1. Update Template Path in Module Sheets (if any remain)

If you kept any files from `module/sheets/`, update their template paths:

```javascript
// OLD
template: "systems/swse/templates/actors/character-sheet.html"

// NEW
template: "systems/swse/templates/actor/character-sheet.hbs"
```

### 2. Test Character Generator

The character generator should now work because it's imported in index.js:

```javascript
import "./scripts/chargen/chargen-init.js";
```

Test by:
1. Click "Create Actor" button in Foundry
2. You should see "Use Character Generator" dialog
3. Create a test character

### 3. Review Module Directory

After confirming everything works:

```bash
# List what's left in module/
ls -la module/

# If it's all redundant, remove it
git rm -rf module/
```

### 4. Clean Git History

```bash
# Review changes
git status
git diff

# Stage consolidation
git add .
git commit -m "Consolidate parallel systems: integrate chargen into main system"

# Remove backup files from git (if tracked)
git rm --cached **/*.backup
git commit -m "Remove backup files from version control"
```

### 5. Update .gitignore

Add to `.gitignore`:
```
*.backup
consolidation_backup/
optimization_backups/
```

## Testing Checklist

- [ ] Character sheet loads
- [ ] Character generator works
- [ ] All tabs functional (Skills, Feats, Talents, Powers, Equipment)
- [ ] Items can be added/removed
- [ ] Ability scores calculate correctly
- [ ] No console errors
- [ ] Templates render correctly

## File Structure (Recommended Final State)

```
foundryvtt-swse/
├── index.js                 # SOLE entry point
├── config.js                # System configuration
├── system.json              # Foundry manifest
├── template.json            # Data model
├── scripts/
│   ├── swse-actor.js       # Actor class & sheet
│   ├── swse-item.js        # Item class & sheet  
│   ├── swse-droid.js       # Droid sheet
│   ├── swse-vehicle.js     # Vehicle sheet
│   ├── load-templates.js   # Template loader
│   ├── helpers.js          # Handlebars helpers
│   └── chargen/            # Character generator
│       ├── chargen-init.js
│       └── chargen.js
├── templates/
│   ├── actor/              # All actor templates here
│   │   ├── character-sheet.hbs
│   │   ├── npc-sheet.hbs
│   │   ├── droid-sheet.hbs
│   │   └── vehicle-sheet.hbs
│   ├── item/
│   │   └── item-sheet.hbs
│   ├── apps/
│   │   └── chargen.hbs
│   └── partials/
│       └── ...
└── styles/
    └── ...
```

## Rollback Instructions

If something breaks, restore from backup:

```bash
# Your backup is at: {self.backup_dir}

# Restore a specific file
cp {self.backup_dir}/index.js ./index.js

# Restore entire directory
cp -r {self.backup_dir}/scripts ./scripts
```

## Questions?

Common issues:

**Q: Character generator button doesn't appear**
A: Check browser console for import errors. Verify chargen-init.js path is correct.

**Q: Templates not rendering**
A: Check template paths in sheet classes match actual file locations.

**Q: Sheet looks broken**
A: Verify CSS files are loaded in system.json styles array.

"""
        
        guide_file = self.backup_dir / "CONSOLIDATION_GUIDE.md"
        with open(guide_file, 'w', encoding='utf-8') as f:
            f.write(guide)
        
        return guide, guide_file
    
    def run(self):
        """Execute consolidation"""
        print("="*70)
        print("SWSE System Consolidation")
        print("="*70)
        print()
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        # Step 1: Backup
        self.create_backup()
        
        # Step 2: Analyze
        analysis = self.analyze_structure()
        
        # Step 3: Confirm
        print("CONSOLIDATION PLAN:")
        print("="*70)
        print("1. Remove all .backup files")
        print("2. Move module/chargen/ → scripts/chargen/")
        print("3. Add chargen import to index.js")
        print("4. Consolidate templates to templates/actor/")
        print("5. Remove swse.js (dormant entry point)")
        print("6. Keep module/ for manual review")
        print("="*70)
        print()
        
        input("Press ENTER to continue or Ctrl+C to abort...")
        print()
        
        # Step 4: Execute
        try:
            self.remove_backup_files()
            self.consolidate_to_scripts()
            self.remove_swse_js()
            self.cleanup_module_directory()
            
            # Step 5: Generate guide
            guide, guide_file = self.create_migration_guide()
            
            # Final report
            print("="*70)
            print("✓ Consolidation Complete")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print(f"Guide: {guide_file}")
            print()
            print(f"Actions performed: {len(self.actions)}")
            print(f"Warnings: {len(self.warnings)}")
            print()
            
            if self.warnings:
                print("WARNINGS:")
                for warning in self.warnings:
                    print(f"  ⚠ {warning}")
                print()
            
            print("NEXT STEPS:")
            print("1. Test system in Foundry VTT")
            print("2. Verify character generator works")
            print("3. Review module/ directory")
            print(f"4. Read full guide: {guide_file}")
            print("5. Commit changes when satisfied")
            print()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error during consolidation: {e}")
            print(f"Restore from backup: {self.backup_dir}")
            raise


def main():
    consolidator = SystemConsolidator()
    success = consolidator.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())