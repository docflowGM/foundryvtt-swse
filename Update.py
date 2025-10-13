#!/usr/bin/env python3
"""
Fix editor helper usage in templates for Foundry v13
"""

import re
from pathlib import Path
from datetime import datetime
import shutil

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "editor_fix_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

class EditorFixer:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.fixed_files = []
    
    def create_backup(self):
        """Backup template files"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup all template files
        templates_dir = self.repo_path / "templates"
        if templates_dir.exists():
            backup_templates = self.backup_dir / "templates"
            shutil.copytree(templates_dir, backup_templates, dirs_exist_ok=True)
            print(f"  ✓ Backed up templates/")
        print()
    
    def fix_editor_in_file(self, file_path):
        """Fix editor helper in a single file"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Pattern 1: {{editor content=X target=Y button=true owner=owner editable=editable}}
        # Replace with: {{editor system.biography target="system.biography" button=true owner=owner editable=editable}}
        
        # Fix all editor helpers to use correct v13 syntax
        # v13 syntax: {{editor content target="field" button=true editable=editable}}
        
        patterns = [
            # Pattern: editor with content= parameter
            (
                r'\{\{editor\s+content=([^\s}]+)\s+target="([^"]+)"\s+button=true\s+owner=owner\s+editable=editable\}\}',
                r'{{editor \1 target="\2" editable=editable}}'
            ),
            # Pattern: editor with all old parameters
            (
                r'\{\{editor\s+([^\s}]+)\s+target="([^"]+)"\s+button=true\s+owner=owner\s+editable=editable\}\}',
                r'{{editor \1 target="\2" editable=editable}}'
            ),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    
    def fix_all_templates(self):
        """Fix editor helper in all template files"""
        print("Fixing editor helpers in templates...")
        
        templates_dir = self.repo_path / "templates"
        if not templates_dir.exists():
            print("  ⚠ templates/ directory not found")
            return
        
        # Find all .hbs files
        hbs_files = list(templates_dir.rglob("*.hbs"))
        
        for hbs_file in hbs_files:
            if self.fix_editor_in_file(hbs_file):
                rel_path = hbs_file.relative_to(self.repo_path)
                self.fixed_files.append(str(rel_path))
                print(f"  ✓ Fixed: {rel_path}")
        
        if not self.fixed_files:
            print("  ℹ No editor helpers needed fixing")
        print()
    
    def fix_load_templates(self):
        """Remove non-existent template references"""
        print("Fixing load-templates.js...")
        
        load_templates = self.repo_path / "scripts" / "load-templates.js"
        if not load_templates.exists():
            print("  ⚠ load-templates.js not found")
            return
        
        with open(load_templates, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove references to non-existent templates
        non_existent = [
            '"systems/swse/templates/partials/defense-block.hbs"',
            '"systems/swse/templates/partials/item-entry.hbs"',
        ]
        
        for template_ref in non_existent:
            if template_ref in content:
                content = content.replace(
                    template_ref + ',',
                    f'// {template_ref}, // Removed - does not exist'
                )
                content = content.replace(
                    template_ref,
                    f'// {template_ref} // Removed - does not exist'
                )
        
        with open(load_templates, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("  ✓ Removed non-existent template references")
        print()
    
    def run(self):
        """Execute the fix"""
        print("="*70)
        print("Fix Editor Helper for Foundry v13")
        print("="*70)
        print()
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        try:
            self.create_backup()
            self.fix_all_templates()
            self.fix_load_templates()
            
            print("="*70)
            print("✓ Editor Helper Fix Complete")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print()
            
            if self.fixed_files:
                print(f"Fixed {len(self.fixed_files)} files:")
                for file in self.fixed_files:
                    print(f"  • {file}")
            else:
                print("No editor helpers needed fixing")
            
            print()
            print("NEXT STEPS:")
            print("1. Restart Foundry VTT")
            print("2. Try opening a character sheet")
            print("3. The editor fields should work now")
            print()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    fixer = EditorFixer()
    success = fixer.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())