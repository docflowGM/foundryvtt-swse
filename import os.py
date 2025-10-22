#!/usr/bin/env python3
"""
Fix forcepowers.json - Convert to array AND fix type names
"""

import json
from pathlib import Path
from datetime import datetime

# Base path
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
FORCEPOWERS_FILE = BASE_PATH / "data" / "forcepowers.json"

def fix_forcepowers_json():
    """
    Fix forcepowers.json:
    1. Convert from line-delimited JSON to proper array
    2. Change "force-power" to "forcepower"
    """
    print("\n" + "="*60)
    print("🔧 FORCEPOWERS.JSON COMPREHENSIVE FIX")
    print("="*60)
    
    if not FORCEPOWERS_FILE.exists():
        print(f"\n❌ ERROR: File not found: {FORCEPOWERS_FILE}")
        return False
    
    print(f"\n📄 Reading: {FORCEPOWERS_FILE}")
    
    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = FORCEPOWERS_FILE.with_suffix(f".json.backup_{timestamp}")
    
    try:
        # Read original file
        with open(FORCEPOWERS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"✓ Original file size: {len(content)} characters")
        
        # Backup original
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Backup created: {backup_file.name}")
        
        # Parse each line as separate JSON object
        forcepowers = []
        lines = content.strip().split('\n')
        
        print(f"\n🔧 Processing {len(lines)} lines...")
        
        type_changes = 0
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                power = json.loads(line)
                
                # Fix the type if needed
                if power.get('type') == 'force-power':
                    power['type'] = 'forcepower'
                    type_changes += 1
                
                forcepowers.append(power)
                
                name = power.get('name', 'Unknown')
                power_type = power.get('type', 'no-type')
                print(f"   ✓ Line {i}: {name} (type: {power_type})")
                
            except json.JSONDecodeError as e:
                print(f"   ⚠️  Line {i}: Failed to parse - {e}")
                continue
        
        print(f"\n✓ Successfully parsed {len(forcepowers)} force powers")
        print(f"✓ Changed {type_changes} types from 'force-power' to 'forcepower'")
        
        # Create proper JSON array with nice formatting
        fixed_json = json.dumps(forcepowers, indent=2, ensure_ascii=False)
        
        # Write fixed version
        with open(FORCEPOWERS_FILE, 'w', encoding='utf-8') as f:
            f.write(fixed_json)
        
        print(f"✓ Fixed file written: {len(fixed_json)} characters")
        
        # Verify it's valid
        print(f"\n🔍 Verifying fixed file...")
        with open(FORCEPOWERS_FILE, 'r', encoding='utf-8') as f:
            verification = json.load(f)
        
        print(f"✅ SUCCESS! File is now valid JSON!")
        print(f"   Type: {type(verification).__name__}")
        print(f"   Force Powers: {len(verification)}")
        
        # Check types
        forcepower_count = sum(1 for p in verification if p.get('type') == 'forcepower')
        bad_count = sum(1 for p in verification if p.get('type') == 'force-power')
        
        print(f"\n📊 Type Check:")
        print(f"   ✓ Correct type 'forcepower': {forcepower_count}")
        if bad_count > 0:
            print(f"   ⚠️  Still has 'force-power': {bad_count}")
        else:
            print(f"   ✓ No 'force-power' types remaining!")
        
        print(f"\n📋 Sample Force Powers:")
        for power in verification[:5]:
            print(f"   - {power.get('name', 'Unknown')} (type: {power.get('type', 'none')})")
        
        print(f"\n✅ COMPLETE!")
        print(f"   Original: {backup_file.name}")
        print(f"   Fixed: {FORCEPOWERS_FILE.name}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print(f"\n🔄 Restoring from backup...")
        
        # Restore backup if it exists
        if backup_file.exists():
            with open(backup_file, 'r', encoding='utf-8') as f:
                content = f.read()
            with open(FORCEPOWERS_FILE, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Restored original file")
        
        return False

def main():
    """
    Main function
    """
    success = fix_forcepowers_json()
    
    if success:
        print("\n" + "="*60)
        print("🎉 Your forcepowers.json is now fixed!")
        print("="*60)
        print("\n💡 Next steps:")
        print("   1. Reload Foundry VTT")
        print("   2. Check console - validation errors should be gone!")
        print("   3. Test: game.swse and CONFIG.SWSE should exist")
        print("   4. Test: Force powers should load correctly")
    else:
        print("\n" + "="*60)
        print("❌ Fix failed - check error messages above")
        print("="*60)
    
    print("\n")
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()