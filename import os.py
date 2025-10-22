#!/usr/bin/env python3
"""
Replace original equipment/weapons files with sanitized versions
"""

import os
import shutil
from pathlib import Path

# Base paths
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
DATA_PATH = REPO_PATH / "data"
PACKS_PATH = REPO_PATH / "packs"

def replace_files():
    """Replace original files with sanitized versions and clean up"""
    
    print("=" * 60)
    print("Replacing files with sanitized versions")
    print("=" * 60)
    print()
    
    replacements = [
        (DATA_PATH / "equipment_sanitized.json", DATA_PATH / "equipment.json"),
        (DATA_PATH / "weapons_sanitized.json", DATA_PATH / "weapons.json"),
        (PACKS_PATH / "equipment_sanitized.db", PACKS_PATH / "equipment.db"),
        (PACKS_PATH / "weapons_sanitized.db", PACKS_PATH / "weapons.db"),
    ]
    
    for sanitized_file, original_file in replacements:
        if sanitized_file.exists():
            print(f"Replacing: {original_file.name}")
            
            # Remove original if it exists
            if original_file.exists():
                original_file.unlink()
            
            # Rename sanitized to original
            shutil.move(str(sanitized_file), str(original_file))
            print(f"  ✓ {original_file.name} updated")
        else:
            print(f"  ⚠ {sanitized_file.name} not found, skipping")
    
    print()
    print("=" * 60)
    print("Complete!")
    print("=" * 60)
    print("\nAll files have been replaced.")
    print("Backups are still available in data_backup/ if needed.")

if __name__ == "__main__":
    replace_files()