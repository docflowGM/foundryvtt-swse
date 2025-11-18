#!/usr/bin/env python3
"""
Fix holo-theme.css selector scoping to prevent Foundry UI bleed.

This script fixes bare `.holo-theme` selectors by adding proper SWSE scoping.
Run this in your local repository at: C:\Users\Owner\Documents\GitHub\foundryvtt-swse
"""

import os
import re
from pathlib import Path


def fix_holo_theme_selectors(file_path):
    """Fix bare .holo-theme selectors to be properly scoped to SWSE sheets."""

    print(f"Reading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Store original for comparison
    original_content = content

    # Define replacement patterns
    # Pattern: Find bare .holo-theme selectors (not already prefixed with .swse)
    # We need to be careful not to replace selectors that are already scoped

    replacements = [
        # Pattern 1: .holo-theme followed by space and another selector
        # Example: .holo-theme .sheet-body::after
        (
            r'(?<!\.swse)(?<!\.swse\.sheet)\.holo-theme ([\.\w\-:]+)',
            r'.swse.sheet.holo-theme \1,\n.swse.holo-theme \1'
        ),

        # Pattern 2: Lines starting with .holo-theme (after whitespace)
        # Example: .holo-theme input:focus
        (
            r'^(\s*)\.holo-theme ([\w\-:]+)',
            r'\1.swse.sheet.holo-theme \2,\n\1.swse.holo-theme \2'
        ),
    ]

    # Manual replacements based on known patterns in the file
    manual_fixes = [
        # Scan line effect
        (
            r'\.swse\.character-sheet \.sheet-body::after,\n\.holo-theme \.sheet-body::after',
            r'.swse.character-sheet .sheet-body::after,\n.swse.sheet.holo-theme .sheet-body::after,\n.swse.holo-theme .sheet-body::after'
        ),

        # Input focus states
        (
            r'\.swse\.character-sheet select:focus,\n\.holo-theme input:focus,\n\.holo-theme textarea:focus,\n\.holo-theme select:focus',
            r'.swse.character-sheet select:focus,\n.swse.sheet.holo-theme input:focus,\n.swse.sheet.holo-theme textarea:focus,\n.swse.sheet.holo-theme select:focus,\n.swse.holo-theme input:focus,\n.swse.holo-theme textarea:focus,\n.swse.holo-theme select:focus'
        ),

        # Ability scores and values
        (
            r'\.swse\.character-sheet \.defense-total-compact,\n\.holo-theme \.ability-score,\n\.holo-theme \.defense-value,\n\.holo-theme \.stat-value,\n\.holo-theme \.attr-total,\n\.holo-theme \.defense-total-compact',
            r'.swse.character-sheet .defense-total-compact,\n.swse.sheet.holo-theme .ability-score,\n.swse.sheet.holo-theme .defense-value,\n.swse.sheet.holo-theme .stat-value,\n.swse.sheet.holo-theme .attr-total,\n.swse.sheet.holo-theme .defense-total-compact,\n.swse.holo-theme .ability-score,\n.swse.holo-theme .defense-value,\n.swse.holo-theme .stat-value,\n.swse.holo-theme .attr-total,\n.swse.holo-theme .defense-total-compact'
        ),

        # Section headers
        (
            r'\.swse\.character-sheet \.section-header-black,\n\.holo-theme \.section-header,\n\.holo-theme \.section-header-black',
            r'.swse.character-sheet .section-header-black,\n.swse.sheet.holo-theme .section-header,\n.swse.sheet.holo-theme .section-header-black,\n.swse.holo-theme .section-header,\n.swse.holo-theme .section-header-black'
        ),

        # Section header ::before
        (
            r'\.swse\.character-sheet \.section-header-black::before,\n\.holo-theme \.section-header::before,\n\.holo-theme \.section-header-black::before',
            r'.swse.character-sheet .section-header-black::before,\n.swse.sheet.holo-theme .section-header::before,\n.swse.sheet.holo-theme .section-header-black::before,\n.swse.holo-theme .section-header::before,\n.swse.holo-theme .section-header-black::before'
        ),

        # Status indicators (base)
        (
            r'\.swse\.character-sheet \.status-indicator,\n\.holo-theme \.status-indicator',
            r'.swse.character-sheet .status-indicator,\n.swse.sheet.holo-theme .status-indicator,\n.swse.holo-theme .status-indicator'
        ),

        # Status indicator active
        (
            r'\.swse\.character-sheet \.status-indicator\.active,\n\.holo-theme \.status-indicator\.active',
            r'.swse.character-sheet .status-indicator.active,\n.swse.sheet.holo-theme .status-indicator.active,\n.swse.holo-theme .status-indicator.active'
        ),

        # Status indicator inactive
        (
            r'\.swse\.character-sheet \.status-indicator\.inactive,\n\.holo-theme \.status-indicator\.inactive',
            r'.swse.character-sheet .status-indicator.inactive,\n.swse.sheet.holo-theme .status-indicator.inactive,\n.swse.holo-theme .status-indicator.inactive'
        ),

        # Status indicator warning
        (
            r'\.swse\.character-sheet \.status-indicator\.warning,\n\.holo-theme \.status-indicator\.warning',
            r'.swse.character-sheet .status-indicator.warning,\n.swse.sheet.holo-theme .status-indicator.warning,\n.swse.holo-theme .status-indicator.warning'
        ),

        # Status indicator danger
        (
            r'\.swse\.character-sheet \.status-indicator\.danger,\n\.holo-theme \.status-indicator\.danger',
            r'.swse.character-sheet .status-indicator.danger,\n.swse.sheet.holo-theme .status-indicator.danger,\n.swse.holo-theme .status-indicator.danger'
        ),

        # Window header
        (
            r'\.swse\.character-sheet \.window-header,\n\.holo-theme \.window-header',
            r'.swse.character-sheet .window-header,\n.swse.sheet.holo-theme .window-header,\n.swse.holo-theme .window-header'
        ),

        # Dragging state
        (
            r'\.swse\.character-sheet\.dragging,\n\.holo-theme\.dragging',
            r'.swse.character-sheet.dragging,\n.swse.sheet.holo-theme.dragging,\n.swse.holo-theme.dragging'
        ),
    ]

    # Apply manual fixes
    for pattern, replacement in manual_fixes:
        if re.search(pattern, content):
            print(f"  Applying fix: {pattern[:50]}...")
            content = re.sub(pattern, replacement, content)

    # Check if anything changed
    if content == original_content:
        print("  No changes needed - file is already properly scoped!")
        return False

    # Write back to file
    print(f"Writing fixed content to {file_path}...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("  Done!")
    return True


def main():
    # Determine the repository root
    script_dir = Path(__file__).parent

    # Path to holo-theme.css
    holo_theme_path = script_dir / 'styles' / 'themes' / 'holo-theme.css'

    print("=" * 70)
    print("Holo Theme CSS Scoping Fix")
    print("=" * 70)
    print()
    print("This script will fix bare .holo-theme selectors that are causing")
    print("Foundry UI elements (sidebar, chat, etc.) to be affected by the theme.")
    print()

    if not holo_theme_path.exists():
        print(f"ERROR: Could not find {holo_theme_path}")
        print("Make sure you're running this script from the repository root:")
        print("  C:\\Users\\Owner\\Documents\\GitHub\\foundryvtt-swse")
        return 1

    # Create backup
    backup_path = holo_theme_path.with_suffix('.css.backup')
    print(f"Creating backup at {backup_path}...")
    with open(holo_theme_path, 'r', encoding='utf-8') as f:
        backup_content = f.read()
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(backup_content)
    print("  Backup created!")
    print()

    # Fix the file
    changed = fix_holo_theme_selectors(holo_theme_path)

    print()
    if changed:
        print("✓ Fixed holo-theme.css successfully!")
        print(f"✓ Backup saved to {backup_path}")
        print()
        print("Next steps:")
        print("  1. Test in FoundryVTT to ensure sidebar/UI is no longer affected")
        print("  2. Verify holo theme still works correctly on SWSE sheets")
        print("  3. If everything works, commit the changes:")
        print("     git add styles/themes/holo-theme.css")
        print('     git commit -m "Fix holo-theme CSS selector scoping"')
    else:
        print("✓ File is already properly scoped!")
        print(f"  Backup created anyway at {backup_path}")

    return 0


if __name__ == '__main__':
    exit(main())
