#!/usr/bin/env python3
"""
SWSE Character Sheet - Automated Installation Script
Installs all fixes to your local Foundry VTT SWSE repository

Usage: python install_sheet_fixes.py
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path

# Configuration
REPO_PATH = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"
BACKUP_FOLDER = "backups_before_fix"

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

def verify_repo_path():
    """Verify the repository path exists"""
    if not os.path.exists(REPO_PATH):
        print_error(f"Repository not found at: {REPO_PATH}")
        print_info("Please update REPO_PATH in the script to point to your SWSE repository")
        return False
    print_success(f"Repository found at: {REPO_PATH}")
    return True

def create_backup():
    """Create backup of existing files"""
    print_header("Creating Backups")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(REPO_PATH, BACKUP_FOLDER, timestamp)
    os.makedirs(backup_path, exist_ok=True)
    
    files_to_backup = [
        "styles/character-sheet.css",
        "styles/character-sheet-fixes.css",
        "module/sheets/character-sheet-handlers.js",
        "module/sheets/character-sheet.js",
        "system.json"
    ]
    
    backed_up = []
    for file_path in files_to_backup:
        full_path = os.path.join(REPO_PATH, file_path)
        if os.path.exists(full_path):
            backup_file = os.path.join(backup_path, file_path)
            os.makedirs(os.path.dirname(backup_file), exist_ok=True)
            shutil.copy2(full_path, backup_file)
            backed_up.append(file_path)
            print_success(f"Backed up: {file_path}")
    
    if backed_up:
        print_success(f"\nBackup created at: {backup_path}")
        print_info(f"Backed up {len(backed_up)} files")
    else:
        print_warning("No existing files found to backup")
    
    return backup_path

def copy_css_file():
    """Copy the new CSS file"""
    print_header("Installing CSS Files")
    
    source_css = "character-sheet-complete-fix.css"
    dest_path = os.path.join(REPO_PATH, "styles", "character-sheet-complete-fix.css")
    
    if not os.path.exists(source_css):
        print_error(f"Source CSS file not found: {source_css}")
        print_info("Make sure this script is in the same folder as the CSS file")
        return False
    
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copy2(source_css, dest_path)
    print_success(f"Installed CSS: styles/character-sheet-complete-fix.css")
    
    return True

def copy_js_files():
    """Copy the JavaScript files"""
    print_header("Installing JavaScript Files")
    
    js_files = [
        ("sheet-positioning.js", "module/sheets/sheet-positioning.js"),
        ("character-sheet-handlers-updated.js", "module/sheets/character-sheet-handlers.js")
    ]
    
    success = True
    for source, dest_rel in js_files:
        if not os.path.exists(source):
            print_error(f"Source file not found: {source}")
            success = False
            continue
        
        dest_path = os.path.join(REPO_PATH, dest_rel)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(source, dest_path)
        print_success(f"Installed: {dest_rel}")
    
    return success

def update_character_sheet_class():
    """Update the main character sheet class"""
    print_header("Updating Character Sheet Class")
    
    sheet_path = os.path.join(REPO_PATH, "module/sheets/character-sheet.js")
    
    if not os.path.exists(sheet_path):
        print_warning("Character sheet class not found, creating template")
        create_character_sheet_template(sheet_path)
        return True
    
    # Read existing file
    with open(sheet_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already updated
    if 'initializeSheetBehavior' in content:
        print_info("Character sheet class already updated")
        return True
    
    # Add imports at the top if not present
    import_lines = [
        "import { SWSECharacterSheetHandlers } from './character-sheet-handlers.js';",
        "import { initializeSheetBehavior } from './sheet-positioning.js';"
    ]
    
    # Find where to insert imports
    if 'import' in content:
        # Add after last import
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        if last_import_idx >= 0:
            for imp in reversed(import_lines):
                if imp.split()[1] not in content:
                    lines.insert(last_import_idx + 1, imp)
            content = '\n'.join(lines)
    else:
        # Add at the very top
        content = '\n'.join(import_lines) + '\n\n' + content
    
    # Add activateListeners calls if method exists
    if 'activateListeners(html)' in content:
        # Find the method and add calls
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'activateListeners(html)' in line and '{' in line:
                # Add our calls after the opening brace
                indent = len(line) - len(line.lstrip())
                calls = [
                    f"{' ' * (indent + 4)}// Initialize positioning and scrolling",
                    f"{' ' * (indent + 4)}initializeSheetBehavior(this, html);",
                    f"{' ' * (indent + 4)}",
                    f"{' ' * (indent + 4)}// Activate all handlers",
                    f"{' ' * (indent + 4)}SWSECharacterSheetHandlers.activateListeners(this, html, this.actor);",
                    f"{' ' * (indent + 4)}"
                ]
                # Insert after the super call if it exists
                for j in range(i + 1, min(i + 10, len(lines))):
                    if 'super.activateListeners' in lines[j]:
                        lines = lines[:j+1] + calls + lines[j+1:]
                        break
                else:
                    # No super call, add after opening brace
                    lines = lines[:i+1] + calls + lines[i+1:]
                break
        content = '\n'.join(lines)
    
    # Update defaultOptions if present
    if 'defaultOptions()' in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'left:' not in content and 'width:' in line:
                # Add left and top positioning
                indent = len(line) - len(line.lstrip())
                lines.insert(i + 1, f"{' ' * indent}left: 20,")
                lines.insert(i + 2, f"{' ' * indent}top: 80,")
                break
        content = '\n'.join(lines)
    
    # Write updated content
    with open(sheet_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print_success("Updated character sheet class with new imports and calls")
    return True

def create_character_sheet_template(sheet_path):
    """Create a template character sheet class"""
    template = '''import { SWSECharacterSheetHandlers } from './character-sheet-handlers.js';
import { initializeSheetBehavior } from './sheet-positioning.js';

/**
 * SWSE Character Sheet
 * Enhanced with scrolling fixes and left-side positioning
 */
export default class SWSECharacterSheet extends ActorSheet {
    
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["swse", "sheet", "actor", "swse-datapad-sheet"],
            template: "systems/swse/templates/actors/character-sheet.hbs",
            width: 900,
            height: 800,
            left: 20,
            top: 80,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            scrollY: [".datapad-main-grid", ".skills-grid-compact", ".bottom-tabs-content"]
        });
    }
    
    /** @override */
    getData() {
        const context = super.getData();
        
        // Add any additional data processing here
        context.system = this.actor.system;
        context.halfLevel = Math.floor((this.actor.system.level || 1) / 2);
        
        return context;
    }
    
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        
        // Initialize positioning and scrolling
        initializeSheetBehavior(this, html);
        
        // Activate all handlers
        SWSECharacterSheetHandlers.activateListeners(this, html, this.actor);
        
        // Any additional listeners can go here
    }
}
'''
    
    os.makedirs(os.path.dirname(sheet_path), exist_ok=True)
    with open(sheet_path, 'w', encoding='utf-8') as f:
        f.write(template)
    
    print_success("Created character sheet template")

def update_system_json():
    """Update system.json to include new CSS"""
    print_header("Updating system.json")
    
    system_json_path = os.path.join(REPO_PATH, "system.json")
    
    if not os.path.exists(system_json_path):
        print_error("system.json not found")
        return False
    
    with open(system_json_path, 'r', encoding='utf-8') as f:
        system_data = json.load(f)
    
    # Add CSS to styles array
    if 'styles' not in system_data:
        system_data['styles'] = []
    
    new_css = "styles/character-sheet-complete-fix.css"
    if new_css not in system_data['styles']:
        system_data['styles'].insert(0, new_css)
        print_success(f"Added {new_css} to system.json")
    else:
        print_info("CSS already in system.json")
    
    # Write updated system.json
    with open(system_json_path, 'w', encoding='utf-8') as f:
        json.dump(system_data, f, indent=2)
    
    print_success("Updated system.json")
    return True

def create_documentation():
    """Copy documentation files to repo"""
    print_header("Installing Documentation")
    
    docs = [
        ("README.md", "SHEET_FIX_README.md"),
        ("INSTALLATION_GUIDE.md", "INSTALLATION_GUIDE.md"),
        ("QUICK_REFERENCE.md", "QUICK_REFERENCE.md"),
        ("VISUAL_COMPARISON.md", "VISUAL_COMPARISON.md")
    ]
    
    docs_path = os.path.join(REPO_PATH, "docs", "character-sheet-fix")
    os.makedirs(docs_path, exist_ok=True)
    
    for source, dest in docs:
        if os.path.exists(source):
            dest_path = os.path.join(docs_path, dest)
            shutil.copy2(source, dest_path)
            print_success(f"Installed: docs/character-sheet-fix/{dest}")
        else:
            print_warning(f"Documentation not found: {source}")
    
    return True

def verify_installation():
    """Verify all files were installed correctly"""
    print_header("Verifying Installation")
    
    required_files = [
        ("styles/character-sheet-complete-fix.css", "CSS file"),
        ("module/sheets/sheet-positioning.js", "Positioning module"),
        ("module/sheets/character-sheet-handlers.js", "Handlers module")
    ]
    
    all_good = True
    for file_path, description in required_files:
        full_path = os.path.join(REPO_PATH, file_path)
        if os.path.exists(full_path):
            print_success(f"{description} installed")
        else:
            print_error(f"{description} missing: {file_path}")
            all_good = False
    
    return all_good

def print_next_steps():
    """Print instructions for what to do next"""
    print_header("Installation Complete!")
    
    print(f"{Colors.OKGREEN}{'='*60}{Colors.ENDC}")
    print(f"{Colors.OKGREEN}All fixes have been installed successfully!{Colors.ENDC}")
    print(f"{Colors.OKGREEN}{'='*60}{Colors.ENDC}\n")
    
    print(f"{Colors.BOLD}Next Steps:{Colors.ENDC}\n")
    
    steps = [
        "1. Open Foundry VTT",
        "2. Go to your SWSE world",
        "3. Open a character sheet",
        "4. Verify the sheet appears on the LEFT side",
        "5. Test scrolling in all sections",
        "6. Check that all buttons work",
        "7. Enjoy your improved character sheet! 🎉"
    ]
    
    for step in steps:
        print(f"   {Colors.OKCYAN}{step}{Colors.ENDC}")
    
    print(f"\n{Colors.BOLD}If something doesn't work:{Colors.ENDC}\n")
    print(f"   • Clear browser cache (Ctrl+Shift+R)")
    print(f"   • Check browser console for errors (F12)")
    print(f"   • Review: docs/character-sheet-fix/INSTALLATION_GUIDE.md")
    
    print(f"\n{Colors.BOLD}Your backups are saved in:{Colors.ENDC}")
    print(f"   {REPO_PATH}\\{BACKUP_FOLDER}")
    
    print(f"\n{Colors.BOLD}Documentation installed in:{Colors.ENDC}")
    print(f"   {REPO_PATH}\\docs\\character-sheet-fix\\")
    
    print(f"\n{Colors.OKGREEN}{'='*60}{Colors.ENDC}\n")

def main():
    """Main installation routine"""
    print_header("SWSE Character Sheet - Automated Installation")
    print(f"{Colors.BOLD}This script will install all character sheet fixes{Colors.ENDC}")
    print(f"{Colors.BOLD}to your local SWSE repository{Colors.ENDC}\n")
    
    # Verify repo exists
    if not verify_repo_path():
        return 1
    
    # Confirm with user
    print_info(f"Repository: {REPO_PATH}")
    response = input(f"\n{Colors.WARNING}Proceed with installation? (y/n): {Colors.ENDC}").lower()
    if response not in ['y', 'yes']:
        print_warning("Installation cancelled")
        return 0
    
    try:
        # Create backups
        backup_path = create_backup()
        
        # Install files
        if not copy_css_file():
            print_error("Failed to install CSS")
            return 1
        
        if not copy_js_files():
            print_error("Failed to install JavaScript files")
            return 1
        
        # Update files
        if not update_character_sheet_class():
            print_error("Failed to update character sheet class")
            return 1
        
        if not update_system_json():
            print_error("Failed to update system.json")
            return 1
        
        # Install docs
        create_documentation()
        
        # Verify
        if not verify_installation():
            print_warning("Some files may not have installed correctly")
            print_info("Check the messages above for details")
        
        # Success!
        print_next_steps()
        return 0
        
    except Exception as e:
        print_error(f"Installation failed: {str(e)}")
        print_info(f"Your backups are safe in: {BACKUP_FOLDER}")
        return 1

if __name__ == "__main__":
    exit(main())