#!/usr/bin/env python3
"""
SWSE File Formatter - Single Line Converter
============================================
This script converts all armor JSON and DB files to single-line format.

- JSON files: Each armor entry becomes one line (array of single-line objects)
- DB files: Each entry is already one line, but we ensure consistent formatting

This is useful for:
1. Better git diffs (see exactly which armor changed)
2. Easier merging of changes
3. More compact file storage
4. Industry standard for .db files

Usage:
    python format_single_line.py

The script will automatically find and format all files in:
    - data/armor/*.json
    - packs/armor-*.db
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any

# Base path - adjust if needed
BASE_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")


class SingleLineFormatter:
    """Converts armor files to single-line format"""
    
    def __init__(self, base_path: Path):
        self.base_path = Path(base_path)
        self.data_armor_path = self.base_path / "data" / "armor"
        self.packs_path = self.base_path / "packs"
        self.files_processed = 0
        self.entries_formatted = 0
        
    def format_json_single_line(self, filepath: Path) -> bool:
        """
        Convert a JSON file to single-line format.
        Each armor entry becomes one line in the array.
        """
        try:
            print(f"Processing {filepath.name}...")
            
            # Read the file
            with open(filepath, 'r', encoding='utf-8') as f:
                armor_list = json.load(f)
            
            if not isinstance(armor_list, list):
                print(f"  Warning: {filepath.name} is not a list, skipping")
                return False
            
            # Write back as array with each entry on one line
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('[\n')
                for i, armor in enumerate(armor_list):
                    # Single line JSON, no extra spaces
                    line = json.dumps(armor, ensure_ascii=False, separators=(',', ': '))
                    
                    # Add comma except for last entry
                    if i < len(armor_list) - 1:
                        f.write(f'  {line},\n')
                    else:
                        f.write(f'  {line}\n')
                    
                    self.entries_formatted += 1
                f.write(']\n')
            
            print(f"  ✓ Formatted {len(armor_list)} entries to single-line format")
            self.files_processed += 1
            return True
            
        except Exception as e:
            print(f"  ✗ Error processing {filepath.name}: {e}")
            return False
    
    def format_db_single_line(self, filepath: Path) -> bool:
        """
        Ensure .db file is in proper single-line format.
        Each line should be a complete JSON object with consistent formatting.
        """
        try:
            print(f"Processing {filepath.name}...")
            
            # Read all lines
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            formatted_lines = []
            for line in lines:
                line = line.strip()
                if not line:
                    continue  # Skip empty lines
                
                try:
                    # Parse and re-format to ensure consistency
                    obj = json.loads(line)
                    # Single line with readable spacing (not too compact)
                    formatted = json.dumps(obj, ensure_ascii=False, separators=(',', ': '))
                    formatted_lines.append(formatted)
                    self.entries_formatted += 1
                    
                except json.JSONDecodeError as e:
                    print(f"  Warning: Skipping invalid JSON line: {e}")
                    continue
            
            # Write back with each entry on its own line
            with open(filepath, 'w', encoding='utf-8') as f:
                for line in formatted_lines:
                    f.write(line + '\n')
            
            print(f"  ✓ Formatted {len(formatted_lines)} entries to single-line format")
            self.files_processed += 1
            return True
            
        except Exception as e:
            print(f"  ✗ Error processing {filepath.name}: {e}")
            return False
    
    def run(self) -> bool:
        """Run the formatting process"""
        print("=" * 60)
        print("SWSE Single-Line Formatter")
        print("=" * 60)
        print("Converting all armor files to single-line format...")
        print()
        
        # Check if paths exist
        if not self.base_path.exists():
            print(f"✗ Base path not found: {self.base_path}")
            print(f"  Please update BASE_PATH in the script")
            return False
        
        success = True
        
        # Format JSON files
        if self.data_armor_path.exists():
            print("Formatting JSON armor files...")
            print("-" * 60)
            for json_file in sorted(self.data_armor_path.glob("*.json")):
                if not self.format_json_single_line(json_file):
                    success = False
            print()
        else:
            print(f"Warning: Armor data path not found: {self.data_armor_path}")
            print()
        
        # Format DB files
        if self.packs_path.exists():
            print("Formatting DB armor files...")
            print("-" * 60)
            for db_file in sorted(self.packs_path.glob("armor-*.db")):
                if not self.format_db_single_line(db_file):
                    success = False
            print()
        else:
            print(f"Warning: Packs path not found: {self.packs_path}")
            print()
        
        # Summary
        print("=" * 60)
        print("Formatting Complete")
        print("=" * 60)
        print(f"Files processed: {self.files_processed}")
        print(f"Entries formatted: {self.entries_formatted}")
        print()
        
        if success:
            print("✓ All files successfully formatted to single-line format!")
            print()
            print("Benefits:")
            print("  • Better git diffs (see exactly what changed)")
            print("  • Easier to merge changes from multiple contributors")
            print("  • Standard format for .db files")
            print("  • Each armor entry is now one line")
            print()
            print("Example JSON format:")
            print('  [')
            print('    {"name": "Armor 1", "type": "Light", ...},')
            print('    {"name": "Armor 2", "type": "Medium", ...},')
            print('    {"name": "Armor 3", "type": "Heavy", ...}')
            print('  ]')
            print()
            print("Example DB format:")
            print('  {"name": "Armor 1", "system": {...}}')
            print('  {"name": "Armor 2", "system": {...}}')
            print('  {"name": "Armor 3", "system": {...}}')
        else:
            print("⚠ Some errors occurred during formatting")
            print("  Please review the output above")
        
        return success


def main():
    """Main entry point"""
    formatter = SingleLineFormatter(BASE_PATH)
    success = formatter.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()