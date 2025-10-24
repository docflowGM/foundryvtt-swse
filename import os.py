#!/usr/bin/env python3
"""
SWSE Character Sheet - Auto-Add JavaScript Handler
Automatically adds the handler import and activation to your character sheet class
"""

import os
import re
from pathlib import Path

# Base path to your repo
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

def find_character_sheet_js():
    """Find the character sheet JavaScript file"""
    
    possible_paths = [
        REPO_PATH / "module" / "sheets" / "character-sheet.js",
        REPO_PATH / "module" / "sheets" / "actor-sheet.js",
        REPO_PATH / "module" / "sheets" / "SWSEActorSheet.js",
        REPO_PATH / "module" / "sheets" / "swse-actor-sheet.js",
        REPO_PATH / "scripts" / "sheets" / "character-sheet.js",
        REPO_PATH / "scripts" / "actor-sheet.js",
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    # Search for any file with "sheet" in the name
    print("🔍 Searching for character sheet files...")
    for root, dirs, files in os.walk(REPO_PATH / "module"):
        for file in files:
            if "sheet" in file.lower() and file.endswith(".js"):
                full_path = Path(root) / file
                print(f"   Found: {full_path}")
                response = input(f"   Is this your character sheet file? (y/n): ")
                if response.lower() == 'y':
                    return full_path
    
    return None


def backup_file(file_path):
    """Create a backup of the file"""
    backup_path = file_path.with_suffix('.js.backup')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"   ✓ Backup created: {backup_path.name}")
    return backup_path


def add_import_statement(content):
    """Add the import statement at the top of the file"""
    
    import_line = "import { SWSECharacterSheetHandlers } from './character-sheet-handlers.js';"
    
    # Check if already imported
    if 'SWSECharacterSheetHandlers' in content:
        print("   ✓ Import already exists")
        return content, False
    
    # Find the best place to add the import
    # Look for other imports first
    import_pattern = r'^import\s+.*?;'
    imports = re.findall(import_pattern, content, re.MULTILINE)
    
    if imports:
        # Add after the last import
        last_import = imports[-1]
        content = content.replace(last_import, last_import + '\n' + import_line)
        print("   ✓ Added import after existing imports")
    else:
        # Add at the very top
        content = import_line + '\n\n' + content
        print("   ✓ Added import at the top of file")
    
    return content, True


def add_handler_activation(content):
    """Add the handler activation inside activateListeners method"""
    
    activation_code = """        // Activate condition buttons and auto-calculations
        SWSECharacterSheetHandlers.activate(html, this.actor);"""
    
    # Check if already added
    if 'SWSECharacterSheetHandlers.activate' in content:
        print("   ✓ Handler activation already exists")
        return content, False
    
    # Pattern to find activateListeners method
    patterns = [
        # Pattern 1: activateListeners(html) {
        (r'(activateListeners\s*\(\s*html\s*\)\s*\{)', 
         r'\1\n' + activation_code),
        
        # Pattern 2: activateListeners: function(html) {
        (r'(activateListeners\s*:\s*function\s*\(\s*html\s*\)\s*\{)',
         r'\1\n' + activation_code),
        
        # Pattern 3: async activateListeners(html) {
        (r'(async\s+activateListeners\s*\(\s*html\s*\)\s*\{)',
         r'\1\n' + activation_code),
    ]
    
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            # Check if super.activateListeners exists
            if 'super.activateListeners' in content:
                # Add after super call
                super_pattern = r'(super\.activateListeners\s*\([^)]*\)\s*;)'
                if re.search(super_pattern, content):
                    content = re.sub(super_pattern, r'\1\n' + activation_code, content, count=1)
                    print("   ✓ Added handler activation after super.activateListeners()")
                    return content, True
            
            # Otherwise add right after the opening brace
            content = re.sub(pattern, replacement, content, count=1)
            print("   ✓ Added handler activation at start of activateListeners()")
            return content, True
    
    print("   ⚠️  Could not find activateListeners method")
    print("   You'll need to add this manually:")
    print("   " + activation_code.strip())
    return content, False


def show_manual_instructions():
    """Show manual instructions if automatic addition fails"""
    
    print("\n" + "="*60)
    print("MANUAL SETUP REQUIRED")
    print("="*60)
    print("\nPlease add the following to your character sheet file:\n")
    
    print("1. At the TOP of the file, add:")
    print("   " + "="*50)
    print("   import { SWSECharacterSheetHandlers } from './character-sheet-handlers.js';")
    print("   " + "="*50)
    
    print("\n2. Inside your activateListeners(html) method, add:")
    print("   " + "="*50)
    print("   activateListeners(html) {")
    print("       super.activateListeners(html);")
    print("       ")
    print("       // Add this line:")
    print("       SWSECharacterSheetHandlers.activate(html, this.actor);")
    print("       ")
    print("       // ... rest of your code")
    print("   }")
    print("   " + "="*50)


def main():
    print("=" * 60)
    print("SWSE CHARACTER SHEET - AUTO-ADD JAVASCRIPT HANDLER")
    print("=" * 60)
    print()
    
    if not REPO_PATH.exists():
        print(f"❌ Repository path not found: {REPO_PATH}")
        print("Please update REPO_PATH in the script")
        return
    
    print(f"📂 Working directory: {REPO_PATH}")
    print()
    
    # Find the character sheet file
    sheet_file = find_character_sheet_js()
    
    if not sheet_file:
        print("❌ Could not find character sheet JavaScript file")
        print("\nPlease manually specify the path in the script or")
        print("add the handler manually using the instructions below:")
        show_manual_instructions()
        return
    
    print(f"📄 Found character sheet: {sheet_file.name}")
    print()
    
    # Create backup
    backup_file(sheet_file)
    
    # Read the file
    print("📖 Reading file...")
    with open(sheet_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import statement
    print("📝 Adding import statement...")
    content, import_added = add_import_statement(content)
    
    # Add handler activation
    print("📝 Adding handler activation...")
    content, activation_added = add_handler_activation(content)
    
    # Write back to file
    if import_added or activation_added:
        print("💾 Writing changes...")
        with open(sheet_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print()
        print("=" * 60)
        print("✅ SUCCESS!")
        print("=" * 60)
        print("\nChanges made:")
        if import_added:
            print("  ✓ Added import statement")
        else:
            print("  • Import statement already existed")
        
        if activation_added:
            print("  ✓ Added handler activation in activateListeners()")
        else:
            print("  • Handler activation already existed")
        
        print("\nNext steps:")
        print("1. Refresh Foundry VTT (F5 or Ctrl+F5)")
        print("2. Open a character sheet")
        print("3. Test the condition buttons!")
        print("4. Check that defense dropdowns work!")
    else:
        print()
        print("=" * 60)
        print("ℹ️  NO CHANGES NEEDED")
        print("=" * 60)
        print("\nThe handler is already set up in your file!")
    
    print()
    print("=" * 60)
    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()