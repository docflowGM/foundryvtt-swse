#!/usr/bin/env python3
"""
Fix SWSE theme CSS selector scoping to prevent Foundry UI bleed.

This script fixes problematic selectors that style Foundry core classes
and cause sidebar/UI issues.

Run this from your foundryvtt-swse repository root directory.
"""

import os
import re
from pathlib import Path


def find_problematic_rules(content):
    """
    Find CSS rules that directly style Foundry core classes.
    Returns list of (line_num, selector, rule_text) tuples.
    """
    problematic_rules = []
    
    # Foundry core classes that should never be styled directly
    core_classes = [
        'window-app',
        'window-header',
        'window-content',
        'window-title',
        'close',
        'header-button',
    ]
    
    # Find all CSS rules
    position = 0
    while True:
        # Match selector followed by opening brace
        selector_match = re.search(r'([^{}]+)\s*\{', content[position:])
        if not selector_match:
            break
        
        selector_start = position + selector_match.start()
        selector_end = position + selector_match.end()
        selector = selector_match.group(1).strip()
        
        # Find the closing brace
        brace_count = 1
        i = selector_end
        while i < len(content) and brace_count > 0:
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
            i += 1
        
        rule_end = i
        rule_text = content[selector_start:rule_end]
        line_num = content[:selector_start].count('\n') + 1
        
        # Check if selector directly styles Foundry core classes
        for core_class in core_classes:
            # Look for patterns like: .window-app, .window-app {, .window-app .foo
            # This will match when .window-app appears as a direct target
            pattern = rf'\.{re.escape(core_class)}(?:\s|,|\{{)'
            if re.search(pattern, selector):
                problematic_rules.append((line_num, selector, rule_text))
                break
        
        position = rule_end
    
    return problematic_rules


def comment_out_rule(content, rule_text):
    """
    Comment out a problematic CSS rule with an explanatory header.
    """
    # Create explanatory comment
    comment_header = "\n/* " + "=" * 70 + "\n"
    comment_header += " * REMOVED: This rule directly styled Foundry's core UI classes\n"
    comment_header += " * " + "=" * 70 + "\n"
    comment_header += " *\n"
    comment_header += " * These Foundry classes are used by ALL windows (sidebar, settings, etc.)\n"
    comment_header += " * Styling them directly breaks Foundry's UI layout.\n"
    comment_header += " *\n"
    comment_header += " * TO FIX: Apply these styles to .sheet-body or SWSE-specific classes:\n"
    comment_header += " *   .swse.sheet.your-theme .sheet-body { ... }\n"
    comment_header += " *   .swse.sheet.your-theme .section-header { ... }\n"
    comment_header += " * " + "=" * 70 + " */\n\n"
    
    # Comment out the rule
    commented_rule = "/*\n" + rule_text + "\n*/"
    
    # Replace in content
    return content.replace(rule_text, comment_header + commented_rule, 1)


def fix_theme_file(file_path):
    """Fix problematic selectors in a theme CSS file."""
    
    print(f"Processing {file_path.name}...")
    
    # Read file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Find problematic rules
    problematic = find_problematic_rules(content)
    
    if not problematic:
        print("  ✓ No problematic rules found - already properly scoped!")
        return False
    
    print(f"  Found {len(problematic)} problematic rules:")
    for i, (line_num, selector, _) in enumerate(problematic[:5], 1):
        # Show first 70 chars of selector
        selector_preview = selector if len(selector) <= 70 else selector[:67] + "..."
        print(f"    {i}. Line {line_num}: {selector_preview}")
    
    if len(problematic) > 5:
        print(f"    ... and {len(problematic) - 5} more")
    
    # Comment out problematic rules (process in reverse to maintain positions)
    for line_num, selector, rule_text in reversed(problematic):
        content = comment_out_rule(content, rule_text)
    
    # Write back
    print(f"  Writing fixed content to {file_path.name}...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Fixed {len(problematic)} rules!")
    return True


def create_improved_protection_css(themes_dir):
    """Create an improved foundry-ui-protection.css file."""
    
    protection_content = '''/* ============================================
   FOUNDRY UI PROTECTION - IMPROVED VERSION
   Ensures SWSE themes NEVER affect Foundry's core UI
   
   CRITICAL: This file MUST be loaded LAST in system.json
   ============================================ */

/* Protect all Foundry UI layers - most important fix */
#ui-top,
#ui-left, 
#ui-right,
#ui-bottom,
#sidebar,
#sidebar *,
#controls,
#controls *,
#hotbar,
#hotbar *,
#players,
#players *,
#pause,
#pause *,
#navigation,
#navigation *,
#context-menu,
#context-menu * {
    all: revert !important;
}

/* Additional sidebar protection - critical for the "smooshed sidebar" issue */
#sidebar {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 300px !important;
    height: 100vh !important;
    z-index: 100 !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Ensure non-SWSE windows use Foundry defaults */
.window-app:not(.swse),
.window-app:not(.swse) *,
.app:not(.swse),
.app:not(.swse) * {
    all: revert !important;
}

/* Protect specific Foundry window elements even in SWSE windows */
.swse.sheet .window-resizable-handle,
.swse.sheet .close,
.swse.sheet .header-button,
.swse.sheet .window-control {
    all: revert !important;
}

/* SWSE Theme Containment */
.swse.sheet,
.swse.window-app {
    position: relative !important;
    contain: layout style !important;
}

/* Ensure proper z-index layering */
#sidebar {
    z-index: 100 !important;
}

.swse.sheet,
.swse.window-app {
    z-index: 95 !important;
}

/* Sheet content wrapper protection */
.swse.sheet .sheet-body {
    position: relative !important;
    contain: layout style !important;
}

/* Canvas protection */
#board,
#board *,
canvas {
    all: revert !important;
}
'''
    
    protection_path = themes_dir / "foundry-ui-protection.css"
    
    # Backup old version if it exists
    if protection_path.exists():
        backup_path = themes_dir / "foundry-ui-protection.css.old"
        print(f"  Backing up old protection file to {backup_path.name}...")
        with open(protection_path, 'r', encoding='utf-8') as f:
            old_content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(old_content)
    
    # Write new version
    print(f"  Creating improved {protection_path.name}...")
    with open(protection_path, 'w', encoding='utf-8') as f:
        f.write(protection_content)
    
    print("  ✓ Protection file created!")


def main():
    # Determine the repository root
    script_dir = Path(__file__).parent
    
    # Path to themes directory
    themes_dir = script_dir / 'styles' / 'themes'
    
    print("=" * 70)
    print("SWSE Theme CSS Scoping Fix")
    print("=" * 70)
    print()
    print("This script will fix theme selectors that are causing")
    print("Foundry UI elements (sidebar, chat, etc.) to be affected.")
    print()
    
    if not themes_dir.exists():
        print(f"ERROR: Could not find {themes_dir}")
        print("Make sure you're running this script from the repository root.")
        print(f"Expected: styles/themes/ subdirectory")
        return 1
    
    # Find all theme files
    theme_files = sorted(themes_dir.glob("*-theme.css"))
    
    if not theme_files:
        print(f"ERROR: No theme files found in {themes_dir}")
        return 1
    
    print(f"Found {len(theme_files)} theme files:")
    for theme_file in theme_files:
        print(f"  • {theme_file.name}")
    print()
    
    # Create backups for all theme files first
    print("Creating backups...")
    for theme_file in theme_files:
        backup_path = theme_file.with_suffix('.css.backup')
        with open(theme_file, 'r', encoding='utf-8') as f:
            backup_content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(backup_content)
        print(f"  ✓ Backed up {theme_file.name} to {backup_path.name}")
    print()
    
    # Fix each theme file
    print("Fixing theme files...")
    print("-" * 70)
    
    files_changed = 0
    total_fixes = 0
    
    for theme_file in theme_files:
        changed = fix_theme_file(theme_file)
        if changed:
            files_changed += 1
        print()
    
    print("-" * 70)
    print()
    
    # Create improved protection CSS
    if files_changed > 0:
        print("Creating improved protection CSS...")
        print("-" * 70)
        create_improved_protection_css(themes_dir)
        print()
    
    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print(f"  • Theme files processed: {len(theme_files)}")
    print(f"  • Files with changes: {files_changed}")
    print(f"  • Backup files created in: {themes_dir}")
    print()
    
    if files_changed > 0:
        print("✓ All fixes applied successfully!")
        print()
        print("Next steps:")
        print("  1. Test in Foundry VTT:")
        print("     • Launch Foundry")
        print("     • Open a SWSE character sheet")
        print("     • Switch between themes")
        print("     • Verify sidebar stays in place")
        print()
        print("  2. Check your themes still look correct")
        print()
        print("  3. Review commented-out rules in theme files")
        print("     • Look for '/* REMOVED:' comments")
        print("     • Recreate needed styles targeting .sheet-body")
        print()
        print("  4. If everything works, commit the changes:")
        print("     git add styles/themes/")
        print('     git commit -m "Fix theme CSS selector scoping"')
    else:
        print("✓ All theme files are already properly scoped!")
        print("  Backup files created anyway for safety")
    
    print()
    print("=" * 70)
    
    return 0


if __name__ == '__main__':
    exit(main())