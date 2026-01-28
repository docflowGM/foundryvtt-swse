#!/usr/bin/env python3
"""
SWSE Foundry VTT - Apply Uniform Holo Theme
Applies consistent holo datapad styling across all character sheets
"""

import os
import re
from pathlib import Path

# Base path to your repo
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

# Holo theme header addition for templates
HOLO_HEADER_LOGO = '''
    {{!-- Holographic Frame Header --}}
    <div class="holo-frame-top">
        <img class="sw-logo" src="systems/swse/assets/ui/logo.png" alt="Star Wars Saga Edition"/>
    </div>
'''

# CSS for holo frame and logo
HOLO_FRAME_CSS = '''
/* ============================================
   HOLOGRAPHIC FRAME & LOGO
   ============================================ */
.holo-frame-top {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    background: linear-gradient(135deg, rgba(26, 77, 122, 0.8), rgba(44, 95, 141, 0.8));
    border-bottom: 2px solid #0af;
    box-shadow: 0 0 20px rgba(0, 170, 255, 0.3);
}
.sw-logo {
    max-width: 200px;
    height: auto;
    filter: drop-shadow(0 0 10px rgba(0, 217, 255, 0.5));
}
'''

def ensure_holo_class(content):
    """Add holo-theme class to form tag"""
    form_pattern = r'<form([^>]*class=")([^"]*)"'
    def replacer(match):
        classes = match.group(2)
        if 'holo-theme' not in classes:
            classes += ' holo-theme'
        return f'<form{match.group(1)}{classes}"'
    return re.sub(form_pattern, replacer, content, count=1)

def add_holo_header(content):
    """Insert holo header under form"""
    if 'holo-frame-top' in content:
        return content  # already done

    form_match = re.search(r'<form[^>]*>', content)
    if form_match:
        insert_pos = form_match.end()
        return content[:insert_pos] + HOLO_HEADER_LOGO + content[insert_pos:]
    return content

def update_template_file(filepath):
    print(f"Processing template: {filepath}")
    try:
        content = filepath.read_text(encoding='utf-8')
        original = content

        content = ensure_holo_class(content)
        content = add_holo_header(content)

        if content != original:
            filepath.write_text(content, encoding='utf-8')
            print(f"  ✓ Updated")
            return True
        else:
            print("  - No changes needed")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    return False

def update_css_file(filepath):
    print(f"Processing CSS: {filepath}")
    try:
        content = filepath.read_text(encoding='utf-8')
        if 'holo-frame-top' not in content:
            filepath.write_text(content + "\n\n" + HOLO_FRAME_CSS, encoding='utf-8')
            print("  ✓ Holo CSS added")
            return True
        else:
            print("  - Already contains holo CSS")
    except Exception as e:
        print(f"  ✗ CSS Error: {e}")
    return False

def consolidate_holo_theme():
    print("=" * 60)
    print("SWSE Holo Theme Application")
    print("=" * 60)

    css_files = [
        REPO_PATH / "styles" / "character-sheet.css",
        REPO_PATH / "styles" / "unified-sheets.css",
    ]

    print("\n[1/2] Updating CSS Files...")
    for css in css_files:
        if css.exists():
            update_css_file(css)

    print("\n[2/2] Updating Template Files...")
    template_dirs = [
        REPO_PATH / "templates" / "actors",
        REPO_PATH / "templates" / "items",
        REPO_PATH / "templates" / "sheets",
    ]

    for folder in template_dirs:
        for file in folder.rglob("*.hbs"):
            update_template_file(file)

    print("\n✅ Holo Theme Applied Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    consolidate_holo_theme()
