#!/usr/bin/env python3
"""
Fix CSS Selector Scoping for FoundryVTT SWSE System
===================================================

This script fixes CSS theme files that have bare theme class selectors
(e.g., `.holo-theme .selector`) which cause styles to bleed into Foundry's
core UI elements (sidebar, chat, hotbar, etc.).

The fix: Scope all theme selectors to SWSE sheets only by prefixing with
.swse.sheet or .swse classes.

Usage:
    python fix_css_scoping.py

Run this from: C:\Users\Owner\Documents\GitHub\foundryvtt-swse
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime


def create_backup(file_path):
    """Create a timestamped backup of the file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = file_path.with_suffix(f'.css.backup_{timestamp}')

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return backup_path


def fix_holo_theme_css(file_path):
    """
    Fix holo-theme.css by replacing bare .holo-theme selectors
    with properly scoped .swse.sheet.holo-theme and .swse.holo-theme selectors.
    """
    print(f"\n{'='*70}")
    print(f"Processing: {file_path.name}")
    print(f"{'='*70}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes_made = []

    # Define the patterns to fix
    # Each tuple: (pattern_to_find, replacement, description)
    fixes = [
        # Scan line effect
        (
            r'(\.swse\.character-sheet \.sheet-body::after,)\n(\.holo-theme \.sheet-body::after)',
            r'\1\n.swse.sheet.holo-theme .sheet-body::after,\n.swse.holo-theme .sheet-body::after',
            'scan line effect'
        ),

        # Input focus states - match all three on separate lines
        (
            r'(\.swse\.character-sheet select:focus,)\n(\.holo-theme input:focus,)\n(\.holo-theme textarea:focus,)\n(\.holo-theme select:focus)',
            r'\1\n.swse.sheet.holo-theme input:focus,\n.swse.sheet.holo-theme textarea:focus,\n.swse.sheet.holo-theme select:focus,\n.swse.holo-theme input:focus,\n.swse.holo-theme textarea:focus,\n.swse.holo-theme select:focus',
            'input/textarea/select focus states'
        ),

        # Ability scores and values (5 properties)
        (
            r'(\.swse\.character-sheet \.defense-total-compact,)\n(\.holo-theme \.ability-score,)\n(\.holo-theme \.defense-value,)\n(\.holo-theme \.stat-value,)\n(\.holo-theme \.attr-total,)\n(\.holo-theme \.defense-total-compact)',
            r'\1\n.swse.sheet.holo-theme .ability-score,\n.swse.sheet.holo-theme .defense-value,\n.swse.sheet.holo-theme .stat-value,\n.swse.sheet.holo-theme .attr-total,\n.swse.sheet.holo-theme .defense-total-compact,\n.swse.holo-theme .ability-score,\n.swse.holo-theme .defense-value,\n.swse.holo-theme .stat-value,\n.swse.holo-theme .attr-total,\n.swse.holo-theme .defense-total-compact',
            'ability scores and stat values'
        ),

        # Section headers (2 classes)
        (
            r'(\.swse\.character-sheet \.section-header-black,)\n(\.holo-theme \.section-header,)\n(\.holo-theme \.section-header-black)',
            r'\1\n.swse.sheet.holo-theme .section-header,\n.swse.sheet.holo-theme .section-header-black,\n.swse.holo-theme .section-header,\n.swse.holo-theme .section-header-black',
            'section headers'
        ),

        # Section header ::before pseudo-elements
        (
            r'(\.swse\.character-sheet \.section-header-black::before,)\n(\.holo-theme \.section-header::before,)\n(\.holo-theme \.section-header-black::before)',
            r'\1\n.swse.sheet.holo-theme .section-header::before,\n.swse.sheet.holo-theme .section-header-black::before,\n.swse.holo-theme .section-header::before,\n.swse.holo-theme .section-header-black::before',
            'section header ::before animations'
        ),

        # Status indicators - base
        (
            r'(\.swse\.character-sheet \.status-indicator,)\n(\.holo-theme \.status-indicator)',
            r'\1\n.swse.sheet.holo-theme .status-indicator,\n.swse.holo-theme .status-indicator',
            'status indicators (base)'
        ),

        # Status indicator - active
        (
            r'(\.swse\.character-sheet \.status-indicator\.active,)\n(\.holo-theme \.status-indicator\.active)',
            r'\1\n.swse.sheet.holo-theme .status-indicator.active,\n.swse.holo-theme .status-indicator.active',
            'status indicator (active)'
        ),

        # Status indicator - inactive
        (
            r'(\.swse\.character-sheet \.status-indicator\.inactive,)\n(\.holo-theme \.status-indicator\.inactive)',
            r'\1\n.swse.sheet.holo-theme .status-indicator.inactive,\n.swse.holo-theme .status-indicator.inactive',
            'status indicator (inactive)'
        ),

        # Status indicator - warning
        (
            r'(\.swse\.character-sheet \.status-indicator\.warning,)\n(\.holo-theme \.status-indicator\.warning)',
            r'\1\n.swse.sheet.holo-theme .status-indicator.warning,\n.swse.holo-theme .status-indicator.warning',
            'status indicator (warning)'
        ),

        # Status indicator - danger
        (
            r'(\.swse\.character-sheet \.status-indicator\.danger,)\n(\.holo-theme \.status-indicator\.danger)',
            r'\1\n.swse.sheet.holo-theme .status-indicator.danger,\n.swse.holo-theme .status-indicator.danger',
            'status indicator (danger)'
        ),

        # Window header
        (
            r'(\.swse\.character-sheet \.window-header,)\n(\.holo-theme \.window-header)',
            r'\1\n.swse.sheet.holo-theme .window-header,\n.swse.holo-theme .window-header',
            'window header'
        ),

        # Dragging state
        (
            r'(\.swse\.character-sheet\.dragging,)\n(\.holo-theme\.dragging)',
            r'\1\n.swse.sheet.holo-theme.dragging,\n.swse.holo-theme.dragging',
            'dragging state'
        ),
    ]

    # Apply each fix
    for pattern, replacement, description in fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes_made.append(description)
            print(f"  ✓ Fixed: {description}")

    # Check if any changes were made
    if content == original_content:
        print(f"  ℹ No changes needed - file already properly scoped!")
        return False, None

    # Write the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n  ✓ Applied {len(changes_made)} fixes")
    return True, changes_made


def main():
    print("\n" + "="*70)
    print("FoundryVTT SWSE - CSS Selector Scoping Fix")
    print("="*70)
    print("\nThis script fixes theme CSS files to prevent styles from bleeding")
    print("into Foundry's core UI (sidebar, chat, hotbar, etc.)")
    print()

    # Determine the repository root
    # The script should be run from the repo root
    script_dir = Path(__file__).parent.resolve()
    repo_root = script_dir

    # Check if we're in the right directory
    themes_dir = repo_root / 'styles' / 'themes'
    if not themes_dir.exists():
        print("❌ ERROR: Cannot find 'styles/themes' directory!")
        print(f"   Current location: {repo_root}")
        print("\n   Please run this script from the repository root:")
        print("   C:\\Users\\Owner\\Documents\\GitHub\\foundryvtt-swse")
        print("\n   Example:")
        print("   > cd C:\\Users\\Owner\\Documents\\GitHub\\foundryvtt-swse")
        print("   > python fix_css_scoping.py")
        return 1

    print(f"Repository root: {repo_root}")
    print(f"Themes directory: {themes_dir}")
    print()

    # Target file
    holo_theme_path = themes_dir / 'holo-theme.css'

    if not holo_theme_path.exists():
        print(f"❌ ERROR: Cannot find {holo_theme_path}")
        return 1

    # Create backup
    print("Creating backup...")
    backup_path = create_backup(holo_theme_path)
    print(f"  ✓ Backup created: {backup_path.name}")

    # Fix the file
    changed, fixes = fix_holo_theme_css(holo_theme_path)

    print("\n" + "="*70)
    if changed:
        print("✅ SUCCESS! Fixed holo-theme.css")
        print("="*70)
        print(f"\nBackup saved to: {backup_path}")
        print(f"\nFixed file: {holo_theme_path}")
        print(f"\nTotal fixes applied: {len(fixes)}")
        print("\nWhat was fixed:")
        for fix in fixes:
            print(f"  • {fix}")

        print("\n" + "-"*70)
        print("NEXT STEPS:")
        print("-"*70)
        print("\n1. Test in FoundryVTT:")
        print("   • Check that Foundry's sidebar/UI looks normal")
        print("   • Verify holo theme still works on SWSE character sheets")
        print("\n2. If everything looks good, commit the changes:")
        print("   > git add styles/themes/holo-theme.css")
        print('   > git commit -m "Fix holo-theme CSS selector scoping"')
        print("   > git push")
        print("\n3. If something breaks, restore from backup:")
        print(f"   > copy {backup_path.name} holo-theme.css")

    else:
        print("ℹ️  No changes needed - file is already properly scoped!")
        print("="*70)
        print(f"\nYour holo-theme.css already has correct scoping.")
        print(f"Backup created anyway at: {backup_path}")

    print("\n" + "="*70)
    print()
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
