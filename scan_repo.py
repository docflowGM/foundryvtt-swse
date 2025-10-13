#!/usr/bin/env python3
"""
SWSE Repository Scanner & Cleaner
Scans your Foundry VTT SWSE system for issues
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict
import hashlib
import sys

class SWSERepoScanner:
    def __init__(self, repo_path):
        self.repo_path = Path(repo_path).resolve()
        self.issues = []
        self.duplicates = []
        self.unused_files = []
        self.imports = defaultdict(list)
        self.exports = defaultdict(list)
        self.template_refs = defaultdict(set)
        self.js_files = []
        self.hbs_files = []
        
    def scan(self):
        """Run all scans"""
        print("🔍 Scanning SWSE Repository...")
        print(f"📁 Path: {self.repo_path}")
        
        if not self.repo_path.exists():
            print(f"❌ Error: Path does not exist!")
            return
            
        print()
        
        try:
            self.scan_js_files()
            self.scan_templates()
            self.scan_duplicates()
            self.check_system_json()
            self.find_unused_files()
            self.check_naming_conventions()
            
            self.print_report()
            self.generate_cleanup_script()
            self.generate_structure_map()
        except Exception as e:
            print(f"❌ Error during scan: {e}")
            import traceback
            traceback.print_exc()
        
    def scan_js_files(self):
        """Scan JavaScript files for imports/exports"""
        print("📄 Scanning JavaScript files...")
        
        self.js_files = list(self.repo_path.rglob("*.js"))
        self.js_files = [f for f in self.js_files if "node_modules" not in str(f)]
        
        print(f"   Found {len(self.js_files)} JS files")
        
        for js_file in self.js_files:
            try:
                content = js_file.read_text(encoding='utf-8', errors='ignore')
                
                # Find imports
                imports = re.findall(r'import\s+.*?from\s+["\'](.+?)["\']', content)
                for imp in imports:
                    self.imports[str(js_file.relative_to(self.repo_path))].append(imp)
                
                # Find exports
                exports = re.findall(r'export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)', content)
                for exp in exports:
                    self.exports[str(js_file.relative_to(self.repo_path))].append(exp)
            except Exception as e:
                self.issues.append(f"⚠️  Error reading {js_file.name}: {e}")
                
    def scan_templates(self):
        """Scan Handlebars templates"""
        print("📋 Scanning Handlebars templates...")
        
        self.hbs_files = list(self.repo_path.rglob("*.hbs"))
        print(f"   Found {len(self.hbs_files)} template files")
        
        # Initialize all templates as unreferenced
        for hbs_file in self.hbs_files:
            rel_path = str(hbs_file.relative_to(self.repo_path))
            self.template_refs[rel_path] = set()
            
        # Find template references in JS files
        for js_file in self.js_files:
            try:
                content = js_file.read_text(encoding='utf-8', errors='ignore')
                
                # Find template paths
                templates = re.findall(r'template:\s*["\'](.+?\.hbs)["\']', content)
                templates += re.findall(r'renderTemplate\(["\'](.+?\.hbs)["\']', content)
                
                for template in templates:
                    # Normalize template path
                    if template.startswith('systems/swse/'):
                        template = template.replace('systems/swse/', '')
                    self.template_refs[template].add(str(js_file.relative_to(self.repo_path)))
            except Exception as e:
                pass
                
    def scan_duplicates(self):
        """Find duplicate files by content hash"""
        print("🔄 Checking for duplicate files...")
        
        file_hashes = defaultdict(list)
        
        # Only scan relevant file types for duplicates
        extensions = {'.js', '.hbs', '.css', '.json', '.html', '.md', '.txt'}
        
        all_files = []
        for ext in extensions:
            all_files.extend(self.repo_path.rglob(f"*{ext}"))
        
        # Filter out node_modules and other junk
        all_files = [
            f for f in all_files 
            if f.is_file() 
            and "node_modules" not in str(f)
            and ".git" not in str(f)
            and "__pycache__" not in str(f)
        ]
        
        print(f"   Hashing {len(all_files)} relevant files...")
        
        for i, file_path in enumerate(all_files, 1):
            if i % 50 == 0:  # Progress indicator
                print(f"   ... {i}/{len(all_files)}", end='\r')
            
            try:
                # Skip large files
                size = file_path.stat().st_size
                if size > 1_000_000:  # 1MB
                    continue
                if size == 0:  # Skip empty files
                    continue
                    
                content = file_path.read_bytes()
                file_hash = hashlib.md5(content).hexdigest()
                rel_path = str(file_path.relative_to(self.repo_path))
                file_hashes[file_hash].append(rel_path)
            except Exception as e:
                pass
        
        print(f"   Processed {len(all_files)} files" + " "*20)
        
        # Find duplicates
        for file_hash, files in file_hashes.items():
            if len(files) > 1:
                self.duplicates.append(files)
        
        print(f"   Found {len(self.duplicates)} duplicate sets")
                
    def check_system_json(self):
        """Check system.json for issues"""
        print("⚙️  Checking system.json...")
        
        system_json = self.repo_path / "system.json"
        if not system_json.exists():
            self.issues.append("❌ system.json not found!")
            return
            
        try:
            data = json.loads(system_json.read_text())
            
            # Check required fields
            required = ["id", "title", "version", "compatibility"]
            for field in required:
                if field not in data:
                    self.issues.append(f"⚠️  Missing required field in system.json: {field}")
            
            # Check if esmodules files exist
            if "esmodules" in data:
                for module in data["esmodules"]:
                    module_path = self.repo_path / module
                    if not module_path.exists():
                        self.issues.append(f"❌ Missing module in system.json: {module}")
            
            print(f"   System: {data.get('title', 'Unknown')} v{data.get('version', '?')}")
                        
        except json.JSONDecodeError as e:
            self.issues.append(f"❌ system.json is not valid JSON: {e}")
        except Exception as e:
            self.issues.append(f"❌ Error reading system.json: {e}")
            
    def find_unused_files(self):
        """Find potentially unused files"""
        print("🗑️  Looking for unused files...")
        
        # Find templates that are never referenced
        unused_count = 0
        for template, refs in self.template_refs.items():
            if not refs:
                self.unused_files.append(f"📋 Template: {template}")
                unused_count += 1
        
        # Find backup/old files
        for file_path in self.repo_path.rglob("*"):
            if file_path.is_file():
                name = file_path.name.lower()
                if any(x in name for x in ['_old', '_backup', '.bak', '_copy', '_temp', '~']):
                    self.unused_files.append(f"📁 Backup file: {file_path.relative_to(self.repo_path)}")
        
        print(f"   Found {len(self.unused_files)} potentially unused files")
                
    def check_naming_conventions(self):
        """Check for naming convention issues"""
        print("📝 Checking naming conventions...")
        
        # Check for inconsistent naming
        patterns = {
            "swse-": [],
            "SWSE": [],
            "Swse": [],
        }
        
        for js_file in self.js_files:
            filename = js_file.name
            for pattern in patterns:
                if pattern in filename:
                    patterns[pattern].append(str(js_file.relative_to(self.repo_path)))
        
        inconsistent = [p for p in patterns.values() if p]
        if len(inconsistent) > 1:
            self.issues.append("⚠️  Inconsistent naming conventions (SWSE vs swse)")
            
    def print_report(self):
        """Print the scan report"""
        print("\n" + "="*70)
        print("📊 SCAN REPORT")
        print("="*70 + "\n")
        
        if self.issues:
            print(f"❌ ISSUES FOUND ({len(self.issues)}):")
            for issue in self.issues:
                print(f"  {issue}")
            print()
        else:
            print("✅ No major issues found!\n")
        
        if self.duplicates:
            print(f"🔄 DUPLICATE FILES ({len(self.duplicates)} sets):")
            for i, dup_set in enumerate(self.duplicates[:5], 1):
                print(f"\n  Set {i}:")
                for file in dup_set:
                    print(f"    - {file}")
            if len(self.duplicates) > 5:
                print(f"\n  ... and {len(self.duplicates) - 5} more duplicate sets")
            print()
        
        if self.unused_files:
            print(f"🗑️  POTENTIALLY UNUSED FILES ({len(self.unused_files)}):")
            for file in self.unused_files[:15]:
                print(f"  {file}")
            if len(self.unused_files) > 15:
                print(f"  ... and {len(self.unused_files) - 15} more")
            print()
        
        # Import/Export analysis
        broken_imports = []
        for file, imports in self.imports.items():
            for imp in imports:
                # Check if import path exists
                if imp.startswith('./') or imp.startswith('../'):
                    file_path = Path(file).parent / imp
                    if not (self.repo_path / file_path).exists() and not (self.repo_path / f"{file_path}.js").exists():
                        broken_imports.append(f"{file} → {imp}")
        
        if broken_imports:
            print(f"⚠️  POTENTIALLY BROKEN IMPORTS ({len(broken_imports)}):")
            for imp in broken_imports[:10]:
                print(f"  {imp}")
            if len(broken_imports) > 10:
                print(f"  ... and {len(broken_imports) - 10} more")
            print()
        
        # Print summary
        print("📈 SUMMARY:")
        print(f"  JS files: {len(self.js_files)}")
        print(f"  Templates: {len(self.hbs_files)}")
        print(f"  Issues: {len(self.issues)}")
        print(f"  Duplicates: {len(self.duplicates)}")
        print(f"  Unused: {len(self.unused_files)}")
        print(f"  Broken imports: {len(broken_imports)}")
        print()
        
    def generate_cleanup_script(self):
        """Generate a cleanup script"""
        script_path = self.repo_path / "cleanup_review.sh"
        
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write("#!/bin/bash\n")
            f.write("# SWSE Repository Cleanup Script\n")
            f.write("# Generated automatically - REVIEW BEFORE RUNNING!\n")
            f.write("# Uncomment lines to execute them\n\n")
            f.write("echo 'WARNING: This script will delete files!'\n")
            f.write("echo 'Make sure you have a backup!'\n")
            f.write("read -p 'Continue? (y/n) ' -n 1 -r\n")
            f.write("echo\n")
            f.write("if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n")
            f.write("    echo 'Cancelled.'\n")
            f.write("    exit 1\n")
            f.write("fi\n\n")
            
            # Add duplicate removal (keep first, delete rest)
            if self.duplicates:
                f.write("# ========================================\n")
                f.write("# DUPLICATE FILES\n")
                f.write("# ========================================\n\n")
                for i, dup_set in enumerate(self.duplicates, 1):
                    f.write(f"# Set {i} - Keeping: {dup_set[0]}\n")
                    for dup_file in dup_set[1:]:
                        f.write(f"# rm '{dup_file}'\n")
                    f.write("\n")
            
            # Add unused file removal
            if self.unused_files:
                f.write("# ========================================\n")
                f.write("# POTENTIALLY UNUSED FILES\n")
                f.write("# ========================================\n\n")
                for unused in self.unused_files:
                    cleaned = unused.replace("📋 Template: ", "").replace("📁 Backup file: ", "")
                    f.write(f"# rm '{cleaned}'\n")
                f.write("\n")
            
            f.write("echo '✅ Cleanup complete!'\n")
        
        print(f"📝 Generated: cleanup_review.sh")
        print("   Review and uncomment lines before running!")
        print(f"   Run with: bash cleanup_review.sh\n")
        
    def generate_structure_map(self):
        """Generate a visual structure map"""
        print("="*70)
        print("📂 RECOMMENDED FILE STRUCTURE")
        print("="*70)
        print("""
systems/swse/
├── index.js                          ← Main entry point
├── system.json                       ← System manifest
├── config.js                         ← System configuration
│
├── scripts/
│   ├── swse-actor.js                ← Actor & ActorSheet (MAIN CHARACTER SHEET)
│   ├── swse-droid.js                ← Droid sheet
│   ├── swse-vehicle.js              ← Vehicle sheet
│   ├── swse-item.js                 ← Item sheet
│   ├── swse-data.js                 ← Data utilities
│   ├── load-templates.js            ← Template preloader
│   ├── world-data-loader.js         ← World data loader
│   │
│   └── chargen/
│       ├── chargen.js               ← Character generator logic
│       └── chargen-init.js          ← Generator hooks
│
├── templates/
│   ├── actor/
│   │   ├── character-sheet.hbs      ← MAIN CHARACTER SHEET TEMPLATE
│   │   ├── droid-sheet.hbs          ← Droid sheet template
│   │   └── vehicle-sheet.hbs        ← Vehicle sheet template
│   │
│   ├── item/
│   │   └── item-sheet.hbs           ← Item sheet template
│   │
│   └── chargen/
│       └── chargen.html             ← Character generator UI
│
├── helpers/
│   └── handlebars-helpers.js        ← Handlebars helpers
│
├── store/
│   └── store.js                     ← Store system
│
├── data/
│   ├── skills.json                  ← Skills data
│   ├── vehicles.json                ← Vehicle templates
│   └── ...                          ← Other data files
│
├── styles/
│   └── swse.css                     ← System styles
│
└── assets/
    └── icons/                       ← System icons
        """)
        
        print("="*70)
        print("💡 KEY RECOMMENDATIONS")
        print("="*70)
        print("""
1. ✅ Keep ONE character sheet implementation:
   - scripts/swse-actor.js (the class)
   - templates/actor/character-sheet.hbs (the template)

2. 🗑️  Remove duplicate/backup files:
   - Delete files with _old, _backup, _copy suffixes
   - Keep only the most recent version

3. 📝 Use consistent naming:
   - Use lowercase 'swse-' prefix for all files
   - Example: swse-actor.js, swse-item.js

4. 🔗 Fix broken imports:
   - Ensure all import paths point to existing files
   - Use relative paths consistently

5. 📦 Consolidate similar functionality:
   - Don't have multiple files doing the same thing
   - Merge redundant utility functions

6. ✨ Clean up:
   - Run cleanup_review.sh after reviewing
   - Test thoroughly after cleanup
   - Commit changes in small batches
        """)


def main():
    """Main function"""
    print("="*70)
    print("🔍 SWSE Repository Scanner & Cleaner")
    print("="*70 + "\n")
    
    # Hardcoded path to your SWSE repository
    repo_path = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse").resolve()
    
    if not repo_path.exists():
        print(f"❌ Error: Path '{repo_path}' does not exist!")
        sys.exit(1)
    
    # Check if it looks like a Foundry system
    if not (repo_path / "system.json").exists():
        print(f"⚠️  Warning: No system.json found in {repo_path}")
        print("   This might not be a Foundry VTT system directory.")
        response = input("   Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    
    scanner = SWSERepoScanner(repo_path)
    scanner.scan()
    
    print("\n" + "="*70)
    print("✅ Scan complete!")
    print("="*70)
    print("\nNext steps:")
    print("  1. Review the report above")
    print("  2. Check cleanup_review.sh")
    print("  3. MAKE A BACKUP before running cleanup!")
    print("  4. Uncomment lines in cleanup_review.sh")
    print("  5. Run: bash cleanup_review.sh")
    print("  6. Test your system\n")


if __name__ == "__main__":
    main()