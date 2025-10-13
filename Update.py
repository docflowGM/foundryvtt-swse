#!/usr/bin/env python3
"""
Fix all SWSE system errors in one go
"""

import shutil
from pathlib import Path
from datetime import datetime

REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
BACKUP_DIR = REPO_PATH / "comprehensive_fix_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

class ComprehensiveFixer:
    def __init__(self):
        self.repo_path = REPO_PATH
        self.backup_dir = BACKUP_DIR
        self.fixes = []
    
    def create_backup(self):
        """Backup files"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        files = [
            "scripts/swse-actor.js",
            "scripts/load-templates.js",
            "scripts/chargen/chargen-init.js"
        ]
        
        for file_path in files:
            src = self.repo_path / file_path
            if src.exists():
                dst = self.backup_dir / file_path
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                print(f"  ✓ Backed up: {file_path}")
        print()
    
    def fix_swse_actor(self):
        """Fix the speed property error in swse-actor.js"""
        print("Fixing swse-actor.js...")
        
        actor_file = self.repo_path / "scripts" / "swse-actor.js"
        
        with open(actor_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the _ensureSystemStructure to ensure speed is an object
        old_speed = 'if (!sys.speed) sys.speed = { base: 6, total: 6 };'
        new_speed = '''if (!sys.speed || typeof sys.speed === 'number') {
      sys.speed = { base: sys.speed || 6, total: sys.speed || 6 };
    } else if (!sys.speed.base) {
      sys.speed.base = 6;
      sys.speed.total = 6;
    }'''
        
        content = content.replace(old_speed, new_speed)
        
        with open(actor_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self.fixes.append("Fixed speed property initialization")
        print("  ✓ Fixed speed property")
        print()
    
    def fix_load_templates(self):
        """Fix load-templates.js to remove non-existent template"""
        print("Fixing load-templates.js...")
        
        templates_file = self.repo_path / "scripts" / "load-templates.js"
        
        if not templates_file.exists():
            print("  ⚠ load-templates.js not found, skipping")
            return
        
        with open(templates_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove the defense-block.hbs reference if it exists
        content = content.replace(
            '"systems/swse/templates/partials/defense-block.hbs",',
            '// "systems/swse/templates/partials/defense-block.hbs", // Removed - doesn\'t exist'
        )
        
        with open(templates_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self.fixes.append("Removed non-existent template reference")
        print("  ✓ Fixed template loading")
        print()
    
    def fix_chargen_init(self):
        """Fix chargen-init.js for v13 compatibility"""
        print("Fixing chargen-init.js...")
        
        chargen_file = self.repo_path / "scripts" / "chargen" / "chargen-init.js"
        
        if not chargen_file.exists():
            print("  ⚠ chargen-init.js not found, skipping")
            return
        
        with open(chargen_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix v13 renderActorDirectory hook - html is now HTMLElement, not jQuery
        # Replace html.find with direct DOM query
        content = content.replace(
            'html.find(',
            '$(html).find('
        )
        
        # Alternative: wrap the html parameter
        if 'Hooks.on("renderActorDirectory"' in content and '$(html)' not in content:
            # Add jQuery wrapper at the start of the hook function
            content = content.replace(
                'Hooks.on("renderActorDirectory", (app, html, data) => {',
                'Hooks.on("renderActorDirectory", (app, html, data) => {\n  html = $(html);'
            )
        
        with open(chargen_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self.fixes.append("Fixed chargen for v13")
        print("  ✓ Fixed chargen-init.js")
        print()
    
    def run(self):
        """Execute all fixes"""
        print("="*70)
        print("Comprehensive SWSE System Fix")
        print("="*70)
        print()
        
        if not self.repo_path.exists():
            print(f"❌ Repository not found: {self.repo_path}")
            return False
        
        try:
            self.create_backup()
            self.fix_swse_actor()
            self.fix_load_templates()
            self.fix_chargen_init()
            
            print("="*70)
            print("✓ All Fixes Applied")
            print("="*70)
            print()
            print(f"Backup: {self.backup_dir}")
            print()
            print("Fixes applied:")
            for fix in self.fixes:
                print(f"  ✓ {fix}")
            print()
            print("NEXT STEPS:")
            print("1. Restart Foundry VTT")
            print("2. Check console - errors should be gone")
            print("3. Open a character sheet - should work now")
            print()
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    fixer = ComprehensiveFixer()
    success = fixer.run()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())