#!/usr/bin/env python3
"""
Fix classes.json - Convert line-separated JSON objects into proper JSON array
"""

import json
from pathlib import Path
from datetime import datetime

# Base path
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
CLASSES_FILE = BASE_PATH / "data" / "classes.json"

def fix_classes_json():
    """
    Fix classes.json by converting newline-delimited JSON to proper JSON array
    """
    print("\n" + "="*60)
    print("CLASSES.JSON FIX TOOL")
    print("="*60)
    
    if not CLASSES_FILE.exists():
        print(f"\n❌ ERROR: File not found: {CLASSES_FILE}")
        return False
    
    print(f"\n📄 Reading: {CLASSES_FILE}")
    
    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = CLASSES_FILE.with_suffix(f".json.backup_{timestamp}")
    
    try:
        # Read original file
        with open(CLASSES_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"✓ Original file size: {len(content)} characters")
        
        # Backup original
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Backup created: {backup_file.name}")
        
        # Parse each line as separate JSON object
        classes = []
        lines = content.strip().split('\n')
        
        print(f"\n🔧 Processing {len(lines)} lines...")
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                class_obj = json.loads(line)
                classes.append(class_obj)
                class_name = class_obj.get('class_name', 'Unknown')
                print(f"   ✓ Line {i}: {class_name}")
            except json.JSONDecodeError as e:
                print(f"   ⚠️  Line {i}: Failed to parse - {e}")
                continue
        
        print(f"\n✓ Successfully parsed {len(classes)} classes")
        
        # Create proper JSON array with nice formatting
        fixed_json = json.dumps(classes, indent=2, ensure_ascii=False)
        
        # Write fixed version
        with open(CLASSES_FILE, 'w', encoding='utf-8') as f:
            f.write(fixed_json)
        
        print(f"✓ Fixed file written: {len(fixed_json)} characters")
        
        # Verify it's valid
        print("\n🔍 Verifying fixed file...")
        with open(CLASSES_FILE, 'r', encoding='utf-8') as f:
            verification = json.load(f)
        
        print(f"✅ SUCCESS! File is now valid JSON!")
        print(f"   Type: {type(verification).__name__}")
        print(f"   Classes: {len(verification)}")
        
        print(f"\n📋 Classes found:")
        for cls in verification:
            print(f"   - {cls.get('class_name', 'Unknown')}")
        
        print(f"\n✅ COMPLETE!")
        print(f"   Original: {backup_file.name}")
        print(f"   Fixed: {CLASSES_FILE.name}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print(f"\n🔄 Restoring from backup...")
        
        # Restore backup if it exists
        if backup_file.exists():
            with open(backup_file, 'r', encoding='utf-8') as f:
                content = f.read()
            with open(CLASSES_FILE, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Restored original file")
        
        return False

def main():
    """
    Main function
    """
    success = fix_classes_json()
    
    if success:
        print("\n" + "="*60)
        print("🎉 Your classes.json is now fixed!")
        print("="*60)
        print("\n💡 Next steps:")
        print("   1. Reload Foundry VTT")
        print("   2. Check console - errors should be gone!")
        print("   3. Test: game.swse and CONFIG.SWSE should exist")
    else:
        print("\n" + "="*60)
        print("❌ Fix failed - check error messages above")
        print("="*60)
    
    print("\n")
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()
    